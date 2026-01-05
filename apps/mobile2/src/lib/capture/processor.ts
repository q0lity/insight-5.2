import { formatSegmentsPreview, parseCapture } from '@/src/lib/schema';
import { parseCaptureNatural, type ParsedEvent } from '@/src/lib/nlp/natural';
import { startEvent, stopEvent } from '@/src/storage/events';
import { createTask } from '@/src/storage/tasks';
import { createTrackerLog } from '@/src/storage/trackers';
import { updateInboxCapture, type InboxCapture } from '@/src/storage/inbox';
import { uniqStrings } from '@/src/utils/frontmatter';

export type ProcessCaptureResult = {
  primaryEventId: string | null;
  createdTasks: number;
  createdTrackerLogs: number;
  processedText: string;
  tags: string[];
  contexts: string[];
  people: string[];
};

type TaxonomyRule = {
  match: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
};

const STARTER_TAXONOMY: Array<{ category: string; subcategories: string[] }> = [
  { category: 'Work', subcategories: ['Clinic', 'Surgery', 'Didactics', 'Admin', 'Research', 'Call'] },
  { category: 'Health', subcategories: ['Workout', 'Sleep', 'Nutrition', 'Recovery', 'Meditation'] },
  { category: 'Personal', subcategories: ['Errands', 'Groceries', 'Family', 'Friends', 'Home'] },
  { category: 'Learning', subcategories: ['Reading', 'Practice', 'Coursework'] },
  { category: 'Transport', subcategories: ['Driving', 'Flight', 'Transit', 'Commute', 'Parking'] },
  { category: 'Finance', subcategories: ['Banking', 'Budget', 'Bills', 'Expenses', 'Income'] },
];

function categoriesFromStarter() {
  return STARTER_TAXONOMY.map((entry) => entry.category);
}

function subcategoriesFromStarter(category: string | null | undefined) {
  const match = (category ?? '').trim().toLowerCase();
  if (!match) return [];
  const found = STARTER_TAXONOMY.find((entry) => entry.category.toLowerCase() === match);
  return found?.subcategories ?? [];
}

function toTitleCase(input: string) {
  return input
    .trim()
    .split(/\s+/)
    .map((word) => (word ? word[0]!.toUpperCase() + word.slice(1).toLowerCase() : ''))
    .join(' ');
}

function parseInlineList(raw: string) {
  return raw
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .split(',')
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}

function parseSimpleFrontmatter(lines: string[]) {
  const out: Record<string, unknown> = {};
  let activeKey: string | null = null;
  let listBuffer: string[] = [];

  const flushList = () => {
    if (activeKey) out[activeKey] = [...listBuffer];
    activeKey = null;
    listBuffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, '  ');
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const listMatch = line.match(/^\s*-\s+(.+)$/);
    if (listMatch && activeKey) {
      listBuffer.push(listMatch[1].trim().replace(/^['"]|['"]$/g, ''));
      continue;
    }
    if (activeKey) flushList();
    const match = line.match(/^\s*([A-Za-z][\w-]*)\s*:\s*(.*)$/);
    if (!match?.[1]) continue;
    const key = match[1];
    const value = (match[2] ?? '').trim();
    if (!value) {
      activeKey = key;
      listBuffer = [];
      continue;
    }
    if (value.startsWith('[') && value.endsWith(']')) {
      out[key] = parseInlineList(value);
      continue;
    }
    const unquoted = value.replace(/^['"]|['"]$/g, '');
    if (/^(true|false)$/i.test(unquoted)) {
      out[key] = unquoted.toLowerCase() === 'true';
      continue;
    }
    const num = Number(unquoted);
    out[key] = Number.isFinite(num) && unquoted !== '' ? num : unquoted;
  }
  if (activeKey) flushList();
  return out;
}

function extractFrontmatter(rawText: string) {
  const lines = rawText.split(/\r?\n/);
  if ((lines[0] ?? '').trim() !== '---') return { frontmatter: null as Record<string, unknown> | null, body: rawText };
  const endIdx = lines.slice(1).findIndex((line) => line.trim() === '---');
  if (endIdx === -1) return { frontmatter: null as Record<string, unknown> | null, body: rawText };
  const fmLines = lines.slice(1, endIdx + 1);
  const body = lines.slice(endIdx + 2).join('\n').trim();
  const frontmatter = parseSimpleFrontmatter(fmLines);
  return { frontmatter, body };
}

function normalizeCaptureText(rawText: string) {
  return rawText
    .split('\n')
    .map((line) => line.replace(/^- \\*\\*(\\d{1,2}:\\d{2})\\*\\* -\\s*/, '[$1] '))
    .join('\n')
    .trim();
}

function toStringList(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return parseInlineList(value);
  return [];
}

function extractContextTokens(rawText: string) {
  const out = new Set<string>();
  for (const match of rawText.matchAll(/(^|[\s(])\+([a-zA-Z][\w/-]*)/g)) {
    out.add(match[2].toLowerCase());
  }
  return [...out].slice(0, 24);
}

function extractDurationToken(rawText: string) {
  const match = rawText.match(/\b(\d{1,3})\s*(?:min|mins|minutes|m)\b/i);
  if (!match?.[1]) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function extractImportanceToken(rawText: string) {
  const match = rawText.match(/\bimportance\s*(?:=|:)?\s*(\d{1,2})\b/i);
  if (!match?.[1]) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? Math.max(0, Math.min(10, value)) : null;
}

function extractDifficultyToken(rawText: string) {
  const match = rawText.match(/\b(difficulty|effort)\s*(?:=|:)?\s*(\d{1,2})\b/i);
  if (!match?.[1]) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? Math.max(0, Math.min(10, value)) : null;
}

function hasExplicitTimeRange(rawText: string) {
  const text = rawText.toLowerCase();
  if (/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:-|\s+to\s+)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/.test(text)) return true;
  if (/\b(at|@)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/.test(text)) return true;
  return false;
}

function extractTagTokens(rawText: string) {
  const out = new Set<string>();
  for (const match of rawText.matchAll(/#([a-zA-Z][\w/-]*)(?!\s*(\(|:\s*[-+]?\d))/g)) {
    out.add(match[1].toLowerCase());
  }
  return [...out].slice(0, 24);
}

function extractAtMentions(rawText: string) {
  const out: Array<{ raw: string; before: string }> = [];
  for (const match of rawText.matchAll(
    /(^|[\s(])@(?:"([^"]+)"|'([^']+)'|([A-Za-z][\w'-]*(?:\s+[A-Za-z][\w'-]*){0,3}))/g
  )) {
    const before = (match[1] ?? '').toLowerCase();
    const raw = (match[2] ?? match[3] ?? match[4] ?? '').trim();
    if (!raw) continue;
    out.push({ raw, before });
  }
  return out.slice(0, 16);
}

function extractTrackerTokens(text: string) {
  const out: Array<{ name: string; value: number }> = [];
  for (const match of text.matchAll(/#([a-zA-Z][\w/-]*)\(([-+]?\d*\.?\d+)\)/g)) {
    out.push({ name: match[1], value: Number(match[2]) });
  }
  for (const match of text.matchAll(/#([a-zA-Z][\w/-]*):([-+]?\d*\.?\d+)/g)) {
    out.push({ name: match[1], value: Number(match[2]) });
  }
  return out;
}

function uniqStringsLoose(values: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function extractImplicitPeople(rawText: string) {
  const out: string[] = [];
  for (const match of rawText.matchAll(
    /\bwith\s+(?:(?:dr|doctor|mr|ms|mrs|prof|professor)\.?\s+)?([A-Z][\w'.-]*(?:\s+[A-Z][\w'.-]*){0,2})\b/gim
  )) {
    const name = (match[1] ?? '').trim();
    if (!name) continue;
    out.push(name);
  }
  for (const match of rawText.matchAll(/\b(?:call|text|dm|email)\s+(mom|dad|mother|father|wife|husband|partner)\b/gim)) {
    const raw = (match[1] ?? '').trim();
    if (!raw) continue;
    out.push(raw[0]!.toUpperCase() + raw.slice(1).toLowerCase());
  }
  return uniqStringsLoose(out).slice(0, 8);
}

function normalizePersonName(raw: string) {
  const cleaned = raw
    .replace(/^@+/, '')
    .replace(/^[\s,;:.!]+/, '')
    .replace(/[\s,;:.!]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return null;
  const relationMap: Record<string, string> = {
    mom: 'Mom',
    mother: 'Mother',
    dad: 'Dad',
    father: 'Father',
    wife: 'Wife',
    husband: 'Husband',
    partner: 'Partner',
  };
  const key = cleaned.toLowerCase();
  if (relationMap[key]) return relationMap[key];
  const words = cleaned.split(' ');
  if (words.length > 4) return words.slice(0, 4).join(' ');
  return words
    .map((word) => (word ? word[0]!.toUpperCase() + word.slice(1).toLowerCase() : ''))
    .join(' ');
}

function cleanPeopleList(values: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const cleaned = normalizePersonName(value);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
  }
  return out.slice(0, 12);
}

function extractImplicitPlaces(rawText: string) {
  const out: string[] = [];
  for (const match of rawText.matchAll(/\b(?:at|in|to)\s+([A-Z][A-Za-z0-9'.-]*(?:\s+[A-Z][A-Za-z0-9'.-]*){0,2})\b/g)) {
    const raw = (match[1] ?? '').trim();
    if (!raw) continue;
    if (/\b(I|We|Me)\b/.test(raw)) continue;
    out.push(raw);
  }
  for (const match of rawText.matchAll(/\b(?:costco|walmart|target|trader joe'?s|whole foods|safeway)\b/gi)) {
    const raw = (match[0] ?? '').trim();
    if (!raw) continue;
    out.push(raw);
  }
  return uniqStringsLoose(out).slice(0, 6);
}

function extractMoneyUsd(rawText: string) {
  const match = rawText.match(/\$([0-9]+(?:\.[0-9]{1,2})?)/);
  if (!match?.[1]) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function extractShoppingItems(rawText: string) {
  const lower = rawText.toLowerCase();
  const match = lower.match(/\b(?:buy|get|pick up)\s+([^.!?\n]+)/);
  if (!match?.[1]) return [];
  return match[1]
    .split(/,|and/)
    .map((item) => item.trim())
    .filter((item) => item.length > 2)
    .slice(0, 8);
}

function buildShoppingNotes(items: string[], moneyUsd: number | null) {
  if (!items.length && moneyUsd == null) return '';
  const lines = items.map((item) => `- ${item}`);
  if (moneyUsd != null) lines.push(`Budget: $${moneyUsd.toFixed(2)}`);
  return lines.join('\n');
}

function inferDifficultyFromText(text: string) {
  const lower = text.toLowerCase();
  if (/\b(easy|quick|light)\b/.test(lower)) return 3;
  if (/\b(hard|intense|difficult|heavy)\b/.test(lower)) return 7;
  return null;
}

function inferImportanceFromText(text: string) {
  const lower = text.toLowerCase();
  if (/\b(critical|urgent|asap|important|priority)\b/.test(lower)) return 8;
  if (/\b(optional|later|someday)\b/.test(lower)) return 4;
  return null;
}

function inferCharacterFromText(text: string, tags: string[] = []) {
  const lower = text.toLowerCase();
  const out: string[] = [];
  if (/\b(strength|lift|gym|workout)\b/.test(lower) || tags.some((tag) => tag.includes('workout'))) out.push('STR');
  if (/\b(learn|study|read|course)\b/.test(lower)) out.push('INT');
  if (/\b(run|cardio|endurance|sleep)\b/.test(lower)) out.push('CON');
  if (/\b(plan|organize|focus)\b/.test(lower)) out.push('PER');
  return out;
}

function normalizeTagName(tag: string) {
  return tag.replace(/^#/, '').trim().toLowerCase();
}

function normalizeHashTag(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

function slugifyTag(raw: string) {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toTagTokenFromLabel(raw: string) {
  const slug = slugifyTag(raw);
  return slug ? `#${slug}` : '';
}

function deriveKeywordTag(title: string, category?: string | null, subcategory?: string | null) {
  const stop = new Set(['the', 'a', 'an', 'with', 'and', 'for', 'to', 'from', 'at', 'in', 'on', 'of', 'my']);
  const base = title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter((word) => word.length > 3 && !stop.has(word));
  const avoid = new Set([category ?? '', subcategory ?? ''].map((x) => x.toLowerCase()));
  const picked = base.find((word) => !avoid.has(word));
  return picked ? toTagTokenFromLabel(picked) : '';
}

function buildTagTokens(
  baseTags: string[],
  opts?: { category?: string | null; subcategory?: string | null; title?: string; location?: string | null; includeGlobals?: string[] },
) {
  const normalized = new Set((opts?.includeGlobals ?? []).map(normalizeHashTag).filter(Boolean));
  for (const tag of baseTags) normalized.add(normalizeHashTag(tag));
  const derived: string[] = [];
  if (opts?.category) derived.push(toTagTokenFromLabel(opts.category));
  if (opts?.subcategory) derived.push(toTagTokenFromLabel(opts.subcategory));
  if (opts?.location) derived.push(toTagTokenFromLabel(opts.location.split(/[,|/]/)[0] ?? opts.location));
  if (opts?.title) derived.push(deriveKeywordTag(opts.title, opts?.category ?? null, opts?.subcategory ?? null));
  for (const tag of derived) {
    if (!tag) continue;
    if (normalized.size >= 5) break;
    normalized.add(tag);
  }
  if (normalized.size < 3) normalized.add('#general');
  return Array.from(normalized);
}

function mergeWithGlobalTags(
  tags: string[] | null | undefined,
  opts?: { category?: string | null; subcategory?: string | null; title?: string; location?: string | null; includeGlobals?: boolean; globalTags?: string[] },
) {
  const includeGlobals = opts?.includeGlobals ? opts?.globalTags ?? [] : [];
  return buildTagTokens(tags ?? [], { ...opts, includeGlobals });
}

function inferCategorySubcategory(
  title: string,
  tags: string[],
  baseRules?: Array<{ match: string; category?: string; subcategory?: string; tags?: string[] }>,
) {
  const text = title.toLowerCase();
  const tagSet = new Set(tags.map((tag) => tag.replace(/^#/, '').toLowerCase()));

  let category: string | null = null;
  let subcategory: string | null = null;

  if (baseRules?.length) {
    for (const rule of baseRules) {
      const rx = rule.match?.trim();
      if (!rx) continue;
      try {
        const re = new RegExp(rx, 'i');
        if (!re.test(title)) continue;
        if (rule.category && !category) category = rule.category;
        if (rule.subcategory && !subcategory) subcategory = rule.subcategory;
        if (rule.tags?.length) {
          for (const tag of rule.tags) tagSet.add(tag.replace(/^#/, '').toLowerCase());
        }
        break;
      } catch {
        // ignore malformed rule
      }
    }
  }

  for (const rawTag of tags) {
    const cleaned = rawTag.replace(/^#/, '').trim();
    if (!cleaned || !cleaned.includes('/')) continue;
    const [cat, sub] = cleaned.split('/', 2);
    if (cat) category = toTitleCase(cat);
    if (sub) subcategory = toTitleCase(sub);
    break;
  }

  const workoutMatch = tagSet.has('workout') || /\b(workout|gym|lift|lifting|run|cardio|yoga|training)\b/.test(text);
  if (workoutMatch) {
    category = 'Health';
    subcategory = subcategory ?? 'Workout';
  }

  if (!category && (tagSet.has('work') || /\b(work|shift)\b/.test(text))) category = 'Work';
  if (tagSet.has('clinic') || /\b(clinic|patients|rounds|inpatient)\b/.test(text)) {
    category = category ?? 'Work';
    subcategory = 'Clinic';
  }
  if (tagSet.has('meeting') || /\b(meeting|conference|rounds)\b/.test(text)) {
    category = category ?? 'Work';
    subcategory = subcategory ?? 'Meeting';
  }
  if (tagSet.has('surgery') || /\b(surgery)\b/.test(text)) {
    category = category ?? 'Work';
    subcategory = 'Surgery';
  }
  if (tagSet.has('didactics') || /\b(didactics)\b/.test(text)) {
    category = category ?? 'Work';
    subcategory = subcategory ?? 'Didactics';
  }
  if (tagSet.has('study') || /\b(study|lecture|reading)\b/.test(text)) {
    category = category ?? 'Learning';
    subcategory = subcategory ?? (/\b(read|reading)\b/.test(text) ? 'Reading' : 'Practice');
  }
  if (tagSet.has('sleep') || /\b(sleep|nap)\b/.test(text)) {
    category = category ?? 'Health';
    subcategory = subcategory ?? 'Sleep';
  }
  if (tagSet.has('shopping') || /\b(grocery|shopping|store|errand)\b/.test(text)) {
    category = category ?? 'Personal';
    subcategory = subcategory ?? (/\b(grocery|groceries)\b/.test(text) ? 'Groceries' : 'Errands');
  }
  if (tagSet.has('morning') || /\b(get ready|morning routine|prep|ready for work)\b/.test(text)) {
    category = category ?? 'Personal';
    subcategory = subcategory ?? 'Morning Routine';
  }
  if (tagSet.has('food') || /\b(dinner|lunch|breakfast|meal|restaurant|food)\b/.test(text)) {
    category = category ?? 'Food';
    subcategory = subcategory ?? (/\b(restaurant|dinner out|lunch out|eat out)\b/.test(text) ? 'Restaurant' : 'Meal');
  }
  if (tagSet.has('walk') || /\b(walk|stroll)\b/.test(text)) {
    category = category ?? 'Personal';
    subcategory = subcategory ?? 'Health';
  }
  if (tagSet.has('transport') || /\b(transport|drive|driving|commute|flight|fly|uber|lyft|train|bus|parking)\b/.test(text)) {
    category = category ?? 'Transport';
    if (/\b(flight|fly|airport)\b/.test(text)) subcategory = subcategory ?? 'Flight';
    else if (/\b(train|bus|transit|subway)\b/.test(text)) subcategory = subcategory ?? 'Transit';
    else if (/\b(parking)\b/.test(text)) subcategory = subcategory ?? 'Parking';
    else subcategory = subcategory ?? 'Driving';
  }
  if (tagSet.has('finance') || /\b(bank|finance|mortgage|loan|bill|budget|expense)\b/.test(text)) {
    category = category ?? 'Finance';
    subcategory = subcategory ?? (/\b(bank)\b/.test(text) ? 'Banking' : /\b(bill|bills)\b/.test(text) ? 'Bills' : 'Budget');
  }
  if (/\b(job|application|apply|resume|interview|hiring|career)\b/.test(text)) {
    category = category ?? 'Work';
    subcategory = subcategory ?? 'Job Applications';
  }
  if (/\b(rent|landlord|lease|tenant)\b/.test(text)) {
    category = category ?? 'Finance';
    subcategory = subcategory ?? 'Rent';
  }
  if (/\b(microneedle|skincare|facial|derma|beauty|skin)\b/.test(text)) {
    category = category ?? 'Personal';
    subcategory = subcategory ?? 'Skincare';
  }
  if (/\b(clean|cleaning|chore|chores|tidy|vacuum|laundry|dishes)\b/.test(text)) {
    category = category ?? 'Personal';
    subcategory = subcategory ?? 'Chores';
  }
  if (/\b(costco|walmart|target|trader joe|whole foods|safeway)\b/i.test(text)) {
    category = category ?? 'Personal';
    subcategory = subcategory ?? 'Errands';
  }

  if (category) {
    const categoryLower = category.toLowerCase();
    const canonical = categoriesFromStarter().find((item) => item.toLowerCase() === categoryLower);
    if (canonical) category = canonical;
  }
  if (category && subcategory) {
    const subs = subcategoriesFromStarter(category);
    const subLower = subcategory.toLowerCase();
    const canonicalSub = subs.find((item) => item.toLowerCase() === subLower);
    if (canonicalSub) subcategory = canonicalSub;
  }

  return { category, subcategory };
}

function resolveCategory(
  title: string,
  tags: string[],
  current: { category?: string | null; subcategory?: string | null } | undefined,
  opts: { categoryOverride?: string | null; subcategoryOverride?: string | null; rules?: TaxonomyRule[] },
) {
  const inferred = inferCategorySubcategory(title, tags, opts.rules);
  const fallbackCategory = opts.categoryOverride ?? current?.category ?? inferred.category ?? 'Personal';
  const fallbackSubcategory = opts.subcategoryOverride ?? current?.subcategory ?? inferred.subcategory ?? null;
  return { category: fallbackCategory, subcategory: fallbackSubcategory };
}

function finalizeCategorizedTags(opts: {
  title?: string | null;
  tags?: string[];
  location?: string | null;
  includeGlobals?: boolean;
  globalTags?: string[];
  categoryOverride?: string | null;
  subcategoryOverride?: string | null;
  rules?: TaxonomyRule[];
}) {
  const title = opts.title ?? '';
  const tags = opts.tags ?? [];
  const inferred = resolveCategory(title, tags, undefined, {
    categoryOverride: opts.categoryOverride ?? null,
    subcategoryOverride: opts.subcategoryOverride ?? null,
    rules: opts.rules ?? [],
  });
  const mergedTags = mergeWithGlobalTags(tags, {
    category: inferred.category ?? null,
    subcategory: inferred.subcategory ?? null,
    title,
    location: opts.location ?? null,
    includeGlobals: opts.includeGlobals ?? false,
    globalTags: opts.globalTags ?? [],
  });
  return { mergedTags, inferred };
}

function formatSegmentLine(atMs: number | null, label: string) {
  if (!atMs) return `- ${label}`;
  const time = new Date(atMs);
  const hh = String(time.getHours()).padStart(2, '0');
  const mm = String(time.getMinutes()).padStart(2, '0');
  return `- [${hh}:${mm}] ${label}`;
}

function segmentLabelForEvent(ev: { title?: string; sourceText?: string }) {
  const label = ev.title ?? ev.sourceText ?? 'Event';
  return label.trim();
}

function appendSegment(notes: string | null | undefined, line: string) {
  if (!line) return notes ?? '';
  return notes && notes.trim().length ? `${notes}\n${line}` : line;
}

function isWorkLikeParsedEvent(ev: ParsedEvent) {
  const tagSet = new Set((ev.tags ?? []).map(normalizeTagName));
  const title = `${ev.title ?? ''} ${ev.notes ?? ''}`.toLowerCase();
  return tagSet.has('work') || /\b(work|shift|clinic|surgery|rounds|patients)\b/.test(title);
}

function isStandaloneUntimed(ev: ParsedEvent) {
  const tagSet = new Set((ev.tags ?? []).map(normalizeTagName));
  const title = `${ev.title ?? ''} ${ev.notes ?? ''}`.toLowerCase();
  if (tagSet.has('call') || /\b(call|phone|email|message|text)\b/.test(title)) return true;
  if (tagSet.has('email') || /\b(email|inbox)\b/.test(title)) return true;
  return false;
}

function groupParsedEvents(parsed: ParsedEvent[]) {
  const output: ParsedEvent[] = [];
  const workCandidates = parsed.filter((e) => Boolean(e.explicitTime) && (e.kind ?? 'event') === 'event' && isWorkLikeParsedEvent(e));
  const workBlock =
    workCandidates.length >= 2
      ? ({
          title: 'Work',
          startAt: Math.min(...workCandidates.map((e) => e.startAt)),
          endAt: Math.max(...workCandidates.map((e) => e.endAt)),
          kind: 'event',
          notes: '',
          estimateMinutes: Math.round(
            (Math.max(...workCandidates.map((e) => e.endAt)) - Math.min(...workCandidates.map((e) => e.startAt))) / (60 * 1000),
          ),
          explicitTime: true,
          sourceText: 'work block',
        } as ParsedEvent)
      : null;
  let workBlockInserted = false;
  let currentExplicit: ParsedEvent | null = null;

  for (const ev of parsed) {
    const kind = (ev.kind ?? 'event') as ParsedEvent['kind'];
    const inWorkWindow =
      Boolean(workBlock) &&
      (ev.kind ?? 'event') === 'event' &&
      ev.startAt >= workBlock!.startAt &&
      ev.startAt < workBlock!.endAt;

    if (workBlock && inWorkWindow) {
      if (!workBlockInserted) {
        output.push(workBlock);
        workBlockInserted = true;
      }
      currentExplicit = workBlock;
      const line = formatSegmentLine(ev.startAt ?? null, segmentLabelForEvent(ev));
      workBlock.notes = appendSegment(workBlock.notes ?? '', line);
      continue;
    }

    if (kind === 'log' || kind === 'episode') {
      output.push(ev);
      continue;
    }
    if (ev.explicitTime) {
      output.push(ev);
      currentExplicit = ev;
      continue;
    }
    if (currentExplicit && !isStandaloneUntimed(ev)) {
      const atMs = ev.explicitTime ? ev.startAt : currentExplicit.startAt;
      const line = formatSegmentLine(atMs ?? null, segmentLabelForEvent(ev));
      currentExplicit.notes = appendSegment(currentExplicit.notes ?? '', line);
      continue;
    }
    output.push(ev);
  }
  return output;
}

function maybeSegmentNotes(notes: string | null | undefined, startAt: number, endAt: number) {
  const duration = Math.max(0, endAt - startAt);
  if (!notes?.trim()) return null;
  if (duration < 10 * 60 * 1000) return notes;
  const lines = notes.split('\n').filter((line) => line.trim());
  if (lines.length <= 1) return notes;
  const timeline = lines
    .map((line, idx) => formatSegmentLine(startAt + Math.round((duration / Math.max(1, lines.length - 1)) * idx), line))
    .join('\n');
  return timeline;
}

function applyDurationOverride(
  startAt: number,
  endAt: number,
  kind: ParsedEvent['kind'],
  opts: { durationOverride: number | null; explicitTimeInCapture: boolean },
) {
  if (!opts.durationOverride || opts.explicitTimeInCapture || kind === 'episode' || kind === 'log') return { startAt, endAt };
  const nextEnd = startAt + Math.max(5, opts.durationOverride) * 60 * 1000;
  return { startAt, endAt: Math.max(endAt, nextEnd) };
}

function inferTrackerKeyFromText(title: string, tags?: string[] | null) {
  const t = `${title ?? ''}`.toLowerCase();
  const tagSet = new Set((tags ?? []).map((tag) => normalizeTagName(tag)));
  if (tagSet.has('mood') || /\bmood\b/.test(t)) return 'mood';
  if (tagSet.has('energy') || /\benergy\b/.test(t)) return 'energy';
  if (tagSet.has('sleep') || /\bsleep\b/.test(t)) return 'sleep';
  if (tagSet.has('stress') || /\bstress\b/.test(t)) return 'stress';
  if (tagSet.has('pain') || /\bpain\b/.test(t)) return 'pain';
  return null;
}

export async function processInboxCapture(capture: InboxCapture): Promise<ProcessCaptureResult> {
  const nowMs = capture.createdAt ?? Date.now();
  const { frontmatter, body } = extractFrontmatter(capture.rawText);
  const captureText = body.trim() ? body.trim() : capture.rawText.trim();
  const normalized = normalizeCaptureText(captureText);
  const parsed = parseCapture(normalized);
  const natural = parseCaptureNatural(normalized, nowMs);

  const fm = (frontmatter ?? {}) as Record<string, unknown>;
  const fmTags = toStringList(fm.tags).map((tag) => normalizeTagName(tag)).filter(Boolean);
  const fmPeople = toStringList(fm.people)
    .map((person) => person.replace(/^@/, '').trim())
    .filter(Boolean);
  const fmContexts = toStringList(fm.contexts)
    .map((context) => context.replace(/^\+/, '').trim())
    .filter(Boolean);
  const fmCategory = typeof fm.category === 'string' ? fm.category.trim() : '';
  const fmSubcategory = typeof fm.subcategory === 'string' ? fm.subcategory.trim() : '';
  const fmGoal = typeof fm.goal === 'string' ? fm.goal.trim() : '';
  const fmProject = typeof fm.project === 'string' ? fm.project.trim() : '';
  const fmLocation = typeof fm.location === 'string' ? fm.location.trim() : '';
  const fmImportance = typeof fm.importance === 'number' ? fm.importance : null;
  const fmDifficulty = typeof fm.difficulty === 'number' ? fm.difficulty : null;
  const fmDuration =
    typeof fm.durationMinutes === 'number' ? fm.durationMinutes : typeof fm.duration === 'number' ? fm.duration : null;
  const fmRules = Array.isArray(fm.rules) ? fm.rules : [];
  const taxonomyRules = fmRules
    .map((rule: any) => ({
      match: typeof rule?.match === 'string' ? rule.match : '',
      category: typeof rule?.category === 'string' ? rule.category : undefined,
      subcategory: typeof rule?.subcategory === 'string' ? rule.subcategory : undefined,
      tags: Array.isArray(rule?.tags) ? rule.tags.map((tag: any) => String(tag)).filter(Boolean) : undefined,
    }))
    .filter((rule: TaxonomyRule) => rule.match);
  const activeRules = taxonomyRules;

  const durationOverride = fmDuration ?? extractDurationToken(normalized);
  const importanceOverride = fmImportance ?? extractImportanceToken(normalized);
  const difficultyOverride = fmDifficulty ?? extractDifficultyToken(normalized);
  const categoryOverride = fmCategory ? toTitleCase(fmCategory) : null;
  const subcategoryOverride = fmSubcategory ? toTitleCase(fmSubcategory) : null;
  const goalOverride = fmGoal ? fmGoal : null;
  const projectOverride = fmProject ? fmProject : null;
  const locationOverride = fmLocation ? fmLocation : null;
  const explicitTimeInCapture = hasExplicitTimeRange(normalized);

  const ruleTagsForText = (text: string, rules: TaxonomyRule[]) => {
    const tags: string[] = [];
    for (const rule of rules) {
      const rx = rule.match?.trim();
      if (!rx) continue;
      try {
        const re = new RegExp(rx, 'i');
        if (!re.test(text)) continue;
      } catch {
        continue;
      }
      for (const tag of rule.tags ?? []) {
        const cleaned = normalizeTagName(String(tag));
        if (cleaned) tags.push(cleaned);
      }
    }
    return tags;
  };

  const ruleTagNames = ruleTagsForText(normalized, activeRules);
  const tagNames = new Set<string>(
    [
      ...extractTagTokens(normalized),
      ...fmTags,
      ...ruleTagNames,
      ...parsed.tokens.tags.map((tag) => normalizeTagName(tag)),
    ].filter(Boolean),
  );
  for (const task of natural.tasks) {
    for (const tag of task.tags ?? []) {
      const name = normalizeTagName(tag);
      if (name) tagNames.add(name);
    }
  }
  for (const event of natural.events) {
    for (const tag of event.tags ?? []) {
      const name = normalizeTagName(tag);
      if (name) tagNames.add(name);
    }
  }

  const lowerText = normalized.toLowerCase();
  const periodStartSignal =
    /\b(started|starting|got)\b.*\bperiod\b/.test(lowerText) ||
    /\bon (my )?period\b/.test(lowerText) ||
    /\bmy period\b.*\b(started|began)\b/.test(lowerText);
  const periodEndSignal =
    /\bperiod\b.*\b(ended|over|finished)\b/.test(lowerText) || /\b(period ended|period is over|period is done)\b/.test(lowerText);

  const painRatingMatch = lowerText.match(/(\d{1,2})\s*\/\s*10/);
  const painSignal = /\b(pain|hurts|ache|aches|sore)\b/.test(lowerText) || Boolean(painRatingMatch);
  const painHealedSignal = /\b(healed|pain[-\s]?free|no longer hurts|doesn't hurt anymore|back to normal)\b/.test(lowerText);
  const bodyPartMatch = lowerText.match(/\bmy\s+([a-z][a-z-]{1,20})\s+(hurts|aches|is\s+(sore|aching))\b/);

  const workoutStartSignal = /\b(going to|gonna|start(?:ing)?|begin(?:ning)?|about to)\b.*\b(work\s*out|workout)\b/.test(lowerText);
  const workoutEndSignal = /\b(done|finished|ended|stop(?:ping)?)\b.*\b(work\s*out|workout)\b/.test(lowerText);
  const boredSignal = /\b(bored|boredom|boring)\b/.test(lowerText);
  const moodWordMatch = lowerText.match(/\b(?:i'm|i am|feeling|feel)\s+(?:really\s+)?(happy|great|good|okay|ok|sad|down|depressed|angry|anxious|stressed|meh)\b/);
  const moodWord = moodWordMatch?.[1] ?? null;
  const moodScaleMap: Record<string, number> = {
    happy: 8,
    great: 8,
    good: 7,
    okay: 5,
    ok: 5,
    sad: 3,
    down: 3,
    depressed: 2,
    angry: 3,
    anxious: 4,
    stressed: 4,
    meh: 4,
  };
  const moodValue = moodWord ? moodScaleMap[moodWord] ?? null : null;

  const ratingNear = (keyword: string) => {
    const re = new RegExp(`${keyword}[^\\d]{0,6}(\\d{1,2})\\s*(?:/\\s*10)?`);
    const match = lowerText.match(re);
    if (!match?.[1]) return null;
    const value = Number(match[1]);
    return Number.isFinite(value) ? Math.max(0, Math.min(10, value)) : null;
  };
  const energyValue =
    ratingNear('energy') ??
    (/\b(energized|wired)\b/.test(lowerText) ? 8 : /\b(tired|exhausted|drained)\b/.test(lowerText) ? 3 : null);
  const stressValue =
    ratingNear('stress') ?? (/\b(stressed|overwhelmed|anxious)\b/.test(lowerText) ? 7 : /\b(calm|relaxed)\b/.test(lowerText) ? 2 : null);

  if (periodStartSignal || periodEndSignal) tagNames.add('period');
  if (painSignal || painHealedSignal) tagNames.add('pain');
  if (bodyPartMatch?.[1]) tagNames.add(bodyPartMatch[1]);
  if (workoutStartSignal || workoutEndSignal) tagNames.add('workout');
  if (/\b(work|shift)\b/.test(lowerText)) tagNames.add('work');
  if (/\b(clinic|patients|inpatient|rounds)\b/.test(lowerText)) tagNames.add('clinic');
  if (/\b(call|phone)\b/.test(lowerText)) tagNames.add('call');
  if (/\b(bank|loan|mortgage|finance)\b/.test(lowerText)) tagNames.add('finance');
  if (/\b(gym)\b/.test(lowerText)) tagNames.add('gym');
  if (/\b(run|running|ran)\b/.test(lowerText)) tagNames.add('run');
  if (/\b(ate|eat|eating|meal|breakfast|lunch|dinner|snack|protein)\b/.test(lowerText)) tagNames.add('food');
  if (/\b(drink|drank|water|hydration|hydrate)\b/.test(lowerText)) tagNames.add('hydration');
  if (/\b(sleep|nap)\b/.test(lowerText)) tagNames.add('sleep');
  if (boredSignal) tagNames.add('bored');
  if (moodValue != null) tagNames.add('mood');
  if (energyValue != null) tagNames.add('energy');
  if (stressValue != null) tagNames.add('stress');

  const implicitPeople = extractImplicitPeople(normalized);
  const implicitPlaces = extractImplicitPlaces(normalized);
  const implicitMoneyUsd = extractMoneyUsd(normalized);
  const implicitShoppingItems = extractShoppingItems(normalized);
  if (implicitMoneyUsd != null && Number.isFinite(implicitMoneyUsd)) tagNames.add('money');
  if (implicitShoppingItems.length) tagNames.add('shopping');

  const allTagTokens = [...tagNames].map((tag) => `#${tag}`);
  const mergedTags = uniqStrings([...(capture.tags ?? []), ...[...tagNames]]);

  const contextTokens = extractContextTokens(normalized);
  const allContexts = uniqStrings([...contextTokens, ...fmContexts, ...parsed.tokens.contexts]);
  const mergedContexts = uniqStrings([...(capture.contexts ?? []), ...allContexts]);

  const mentions = extractAtMentions(normalized);
  const personCandidates: string[] = [];
  const placeMentions: string[] = [];
  if (locationOverride) placeMentions.push(locationOverride);
  for (const person of fmPeople) personCandidates.push(person);
  for (const person of parsed.tokens.people) personCandidates.push(person);
  for (const place of parsed.tokens.places) placeMentions.push(place);
  for (const mention of mentions) {
    const lower = mention.raw.toLowerCase();
    const looksPerson = /\b(with|call|text|dm|email)\b/.test(mention.before) || ['mom', 'dad', 'doctor', 'dr', 'alex'].includes(lower);
    if (looksPerson) personCandidates.push(mention.raw);
    else placeMentions.push(mention.raw);
  }
  for (const person of implicitPeople) personCandidates.push(person);
  for (const place of implicitPlaces) placeMentions.push(place);
  const personMentions = cleanPeopleList(personCandidates);
  const placeMentionsUnique = uniqStringsLoose(placeMentions);
  const mergedPeople = uniqStrings([...(capture.people ?? []), ...personMentions]);

  const pickLocationForText = (text: string) => {
    const hay = text.toLowerCase();
    for (const place of placeMentionsUnique) {
      if (!place) continue;
      if (hay.includes(place.toLowerCase())) return place;
    }
    return null;
  };

  let primaryEventId: string | null = null;
  const groupedEvents = groupParsedEvents(natural.events);
  for (const event of groupedEvents) {
    const kind = (event.kind ?? 'event') as ParsedEvent['kind'];
    if (kind === 'log') continue;
    const baseText = `${event.title ?? ''}\n${event.notes ?? ''}\n${(event.tags ?? []).join(' ')}`.trim();
    const autoImportance = event.importance ?? importanceOverride ?? inferImportanceFromText(baseText) ?? capture.importance ?? 5;
    const autoDifficulty = event.difficulty ?? difficultyOverride ?? inferDifficultyFromText(baseText) ?? capture.difficulty ?? 5;
    const autoCharacter = uniqStrings([...inferCharacterFromText(baseText, event.tags ?? []), ...(capture.character ?? [])]);
    const locationHint = event.location ?? pickLocationForText(baseText) ?? capture.location ?? null;
    const { mergedTags: mergedEventTags, inferred } = finalizeCategorizedTags({
      title: event.title,
      tags: event.tags ?? [],
      location: locationHint,
      includeGlobals: true,
      globalTags: allTagTokens,
      categoryOverride,
      subcategoryOverride,
      rules: activeRules,
    });
    const times = applyDurationOverride(event.startAt ?? nowMs, event.endAt ?? nowMs + 5 * 60 * 1000, kind, {
      durationOverride,
      explicitTimeInCapture,
    });
    const nextNotes = maybeSegmentNotes(event.notes ?? '', times.startAt, times.endAt) || event.notes || normalized;
    const created = await startEvent({
      title: event.title || 'Event',
      kind,
      startAt: times.startAt,
      endAt: Math.max(times.endAt, times.startAt + 5 * 60 * 1000),
      notes: nextNotes,
      tags: mergedEventTags.map(normalizeTagName),
      contexts: mergedContexts,
      people: cleanPeopleList(event.people ?? uniqStrings([...personMentions, ...mergedPeople])),
      skills: uniqStrings([...(event.skills ?? []), ...(capture.skills ?? [])]),
      character: autoCharacter,
      location: locationHint,
      category: inferred.category,
      subcategory: inferred.subcategory,
      estimateMinutes: event.estimateMinutes ?? durationOverride ?? Math.round((times.endAt - times.startAt) / (60 * 1000)),
      importance: autoImportance,
      difficulty: autoDifficulty,
      goal: event.goal ?? goalOverride ?? capture.goal ?? null,
      project: event.project ?? projectOverride ?? capture.project ?? null,
    });
    if (!primaryEventId) primaryEventId = created.id;
  }

  if (!primaryEventId && parsed.activeEvent) {
    const startAt = capture.createdAt ?? nowMs;
    const { mergedTags: mergedEventTags, inferred } = finalizeCategorizedTags({
      title: parsed.activeEvent.title || 'Capture Event',
      tags: allTagTokens,
      includeGlobals: true,
      globalTags: allTagTokens,
      categoryOverride: parsed.activeEvent.category ?? categoryOverride,
      subcategoryOverride: parsed.activeEvent.subcategory ?? subcategoryOverride,
      rules: activeRules,
    });
    const event = await startEvent({
      title: parsed.activeEvent.title || 'Capture Event',
      kind: 'event',
      startAt,
      notes: normalized,
      tags: mergedEventTags.map(normalizeTagName),
      contexts: mergedContexts,
      people: mergedPeople,
      location: capture.location ?? null,
      category: inferred.category,
      subcategory: inferred.subcategory,
      estimateMinutes: capture.estimateMinutes ?? null,
      importance: capture.importance ?? null,
      difficulty: capture.difficulty ?? null,
      goal: capture.goal ?? null,
      project: capture.project ?? null,
    });
    primaryEventId = event.id;
    const endAt = capture.estimateMinutes ? startAt + capture.estimateMinutes * 60 * 1000 : startAt;
    await stopEvent(event.id, endAt);
  }

  const normalizedTaskKey = (title: string) => title.trim().toLowerCase();
  const taskCandidates: Array<{
    title: string;
    status?: 'todo' | 'in_progress' | 'done';
    estimateMinutes?: number | null;
    scheduledAt?: number | null;
    dueAt?: number | null;
    notes?: string;
    tags?: string[];
    goal?: string | null;
    project?: string | null;
    importance?: number | null;
    difficulty?: number | null;
  }> = [];
  const seenTasks = new Set<string>();

  const pushTask = (task: typeof taskCandidates[number]) => {
    const key = normalizedTaskKey(task.title);
    if (!key || seenTasks.has(key)) return;
    seenTasks.add(key);
    taskCandidates.push(task);
  };

  for (const task of natural.tasks) {
    pushTask({
      title: task.title,
      status: task.status,
      estimateMinutes: task.estimateMinutes ?? null,
      scheduledAt: task.scheduledAt ?? null,
      dueAt: task.dueAt ?? null,
      notes: task.notes ?? undefined,
      tags: task.tags,
      goal: task.goal ?? null,
      project: task.project ?? null,
      importance: task.importance ?? null,
      difficulty: task.difficulty ?? null,
    });
  }

  for (const task of parsed.tasks) {
    pushTask({
      title: task.title,
      status: task.completed ? 'done' : 'todo',
      estimateMinutes: capture.estimateMinutes ?? null,
    });
  }

  let createdTasks = 0;
  for (const task of taskCandidates) {
    const taskBase = `${task.title ?? ''}\n${task.notes ?? ''}\n${(task.tags ?? []).join(' ')}`.trim();
    const autoImportance = task.importance ?? importanceOverride ?? inferImportanceFromText(taskBase) ?? capture.importance ?? 5;
    const autoDifficulty = task.difficulty ?? difficultyOverride ?? inferDifficultyFromText(taskBase) ?? capture.difficulty ?? 5;
    const { mergedTags: mergedTaskTags, inferred } = finalizeCategorizedTags({
      title: task.title,
      tags: task.tags ?? [],
      includeGlobals: true,
      globalTags: allTagTokens,
      categoryOverride,
      subcategoryOverride,
      rules: activeRules,
    });
    let notes = task.notes ?? '';
    if (!notes && implicitShoppingItems.length && (/\b(shop|shopping|grocery|store|buy)\b/i.test(task.title) || mergedTaskTags.includes('#shopping'))) {
      notes = buildShoppingNotes(implicitShoppingItems, implicitMoneyUsd);
    }
    await createTask({
      title: task.title,
      status: task.status ?? 'todo',
      scheduledAt: task.scheduledAt ?? null,
      dueAt: task.dueAt ?? null,
      notes: notes || undefined,
      estimateMinutes: task.estimateMinutes ?? durationOverride ?? capture.estimateMinutes ?? null,
      tags: mergedTaskTags.map(normalizeTagName),
      contexts: mergedContexts,
      people: mergedPeople,
      goal: task.goal ?? goalOverride ?? capture.goal ?? null,
      project: task.project ?? projectOverride ?? capture.project ?? null,
      category: inferred.category,
      subcategory: inferred.subcategory,
      importance: autoImportance,
      difficulty: autoDifficulty,
      parentEventId: primaryEventId ?? null,
    });
    createdTasks += 1;
  }

  const trackerMap = new Map<string, number | string | boolean>();
  for (const tracker of parsed.trackerLogs) {
    trackerMap.set(tracker.key, tracker.value);
  }
  for (const token of extractTrackerTokens(normalized)) {
    if (!trackerMap.has(token.name)) trackerMap.set(token.name, token.value);
  }
  for (const event of natural.events) {
    if ((event.kind ?? 'event') !== 'log') continue;
    const trackerKey = inferTrackerKeyFromText(event.title ?? '', event.tags ?? []);
    if (!trackerKey || trackerMap.has(trackerKey)) continue;
    const ratingMatch = `${event.title ?? ''}`.match(/(\d{1,2})\s*\/\s*10/);
    const value = ratingMatch?.[1] ? Number(ratingMatch[1]) : null;
    if (value != null && Number.isFinite(value)) trackerMap.set(trackerKey, value);
  }
  if (moodValue != null && !trackerMap.has('mood')) trackerMap.set('mood', moodValue);
  if (energyValue != null && !trackerMap.has('energy')) trackerMap.set('energy', energyValue);
  if (stressValue != null && !trackerMap.has('stress')) trackerMap.set('stress', stressValue);
  if (boredSignal && !trackerMap.has('bored')) trackerMap.set('bored', 7);
  const painValue = painRatingMatch?.[1] ? Number(painRatingMatch[1]) : null;
  if (painValue != null && Number.isFinite(painValue) && !trackerMap.has('pain')) {
    trackerMap.set('pain', painValue);
  }

  let createdTrackerLogs = 0;
  for (const [key, value] of trackerMap.entries()) {
    const tokenValue = typeof value === 'string' ? value : String(value);
    await createTrackerLog({
      trackerKey: key,
      value,
      occurredAt: nowMs,
      entryId: primaryEventId ?? capture.id,
      rawToken: `#${key}(${tokenValue})`,
    });
    createdTrackerLogs += 1;
  }

  const processedText = parsed.segments.length ? formatSegmentsPreview(parsed.segments) : normalized;
  await updateInboxCapture(capture.id, {
    status: 'parsed',
    processedText,
    tags: mergedTags,
    contexts: mergedContexts,
    people: mergedPeople,
  });

  return {
    primaryEventId,
    createdTasks,
    createdTrackerLogs,
    processedText,
    tags: mergedTags,
    contexts: mergedContexts,
    people: mergedPeople,
  };
}
