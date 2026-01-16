import { parseCaptureNatural, parseCaptureWithBlocks } from '@/src/lib/nlp/natural';
import { parseMealFromText, parseWorkoutFromText } from '@/src/lib/health';

type TranscriptEntry = {
  time: string;
  headline: string;
  body: string[];
  raw: string;
};

type TableColumn = { key: string; label: string; align?: 'left' | 'right' };

const TRACKER_KEYS_WITH_SCALE = new Set(['mood', 'energy', 'stress', 'pain', 'focus', 'productivity', 'motivation']);

function stripFrontmatter(rawText: string) {
  const lines = rawText.split(/\r?\n/);
  if ((lines[0] ?? '').trim() !== '---') return rawText;
  const endIdx = lines.slice(1).findIndex((line) => line.trim() === '---');
  if (endIdx === -1) return rawText;
  return lines.slice(endIdx + 2).join('\n');
}

function formatTimeLabel(ms: number) {
  const safeMs = Number.isFinite(ms) ? ms : Date.now();
  const d = new Date(safeMs);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function normalizeTimeToken(raw: string | null | undefined) {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9]/g, '');
  if (cleaned.length === 4) {
    const hh = cleaned.slice(0, 2);
    const mm = cleaned.slice(2);
    if (Number(mm) < 60 && Number(hh) < 24) return `${hh}:${mm}`;
  }
  if (cleaned.length === 3) {
    const mm = cleaned.slice(1);
    if (Number(mm) < 60) {
      const hh = `0${cleaned.slice(0, 1)}`;
      return `${hh}:${mm}`;
    }
    const hhAlt = Number(cleaned.slice(0, 2));
    const mmAlt = cleaned.slice(2);
    if (Number.isFinite(hhAlt) && hhAlt < 24) return `${String(hhAlt).padStart(2, '0')}:${mmAlt.padStart(2, '0')}`;
  }
  return raw.includes(':') ? raw : null;
}

function expandInlineTimestampLines(rawText: string) {
  const baseLines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const atPattern = /\bAt\s+(\d{1,2}:\d{2}|\d{3,4}|\d{1,2}[,]\d{2}|\d{1,2}\s+\d{2})(?:\s*[ap]m)?\b/gi;
  const lines: string[] = [];

  for (const rawLine of rawText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const matches = [...line.matchAll(atPattern)];
    if (matches.length > 1) {
      for (let i = 0; i < matches.length; i += 1) {
        const match = matches[i]!;
        const time = normalizeTimeToken(match[1]) ?? (match[1] ?? '');
        const start = (match.index ?? 0) + match[0].length;
        const end = i + 1 < matches.length ? matches[i + 1]!.index ?? line.length : line.length;
        const segment = line.slice(start, end).trim().replace(/^[\s,.;:-]+/, '').trim();
        if (!segment) continue;
        lines.push(`[${time}] ${segment}`);
      }
      continue;
    }
    if (matches.length === 1) {
      const match = matches[0]!;
      if ((match.index ?? 0) <= 1) {
        const time = normalizeTimeToken(match[1]) ?? (match[1] ?? '');
        const start = (match.index ?? 0) + match[0].length;
        const segment = line.slice(start).trim().replace(/^[\s,.;:-]+/, '').trim();
        if (segment) {
          lines.push(`[${time}] ${segment}`);
          continue;
        }
      }
    }
    lines.push(line);
  }
  return lines.length ? lines : baseLines;
}

function parseTranscriptEntries(rawText: string, anchorMs: number) {
  if (!rawText) return [] as TranscriptEntry[];
  const lines = expandInlineTimestampLines(rawText);
  const entries: TranscriptEntry[] = [];
  let current: TranscriptEntry | null = null;
  const timePattern = /^(?:⏱\s*)?(?:at\s+)?(\d{1,2}:\d{2}|\d{3,4}|\d{1,2}[,]\d{2}|\d{1,2}\s+\d{2})(?:\s*[ap]m)?\s*(?:[-–—:]|\s+)\s*(.+)$/i;
  const bracketPattern = /^\[(\d{1,2}:\d{2}|\d{3,4}|\d{1,2}[,]\d{2}|\d{1,2}\s+\d{2})\]\s*(.+)$/;
  const defaultTime = formatTimeLabel(anchorMs);

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || /^[-*_]{3,}$/.test(trimmed)) continue;
    if (
      /^title\s*:/i.test(trimmed) ||
      /^date\s*:/i.test(trimmed) ||
      /^created\s*:/i.test(trimmed) ||
      /^type\s*:/i.test(trimmed) ||
      /^source\s*:/i.test(trimmed) ||
      /^updated\s*:/i.test(trimmed)
    ) {
      continue;
    }
    if (/^entry\s*\(/i.test(trimmed)) continue;
    if (!current && /^#+\s*\S+/.test(trimmed)) continue;
    const cleaned = trimmed.replace(/^#+\s*/, '');
    const timeHeading = cleaned.match(/^time\s*:\s*([0-9:.,]+(?:\s+\d{2})?)(?:\s+(.*))?$/i);
    if (timeHeading) {
      const normalized = normalizeTimeToken(timeHeading[1]);
      if (normalized) {
        if (current) entries.push(current);
        current = {
          time: normalized,
          headline: (timeHeading[2] ?? '').trim(),
          body: [],
          raw: trimmed,
        };
        continue;
      }
    }
    const match = cleaned.match(timePattern) ?? cleaned.match(bracketPattern);
    if (match) {
      const normalized = normalizeTimeToken(match[1]) ?? match[1];
      if (current) entries.push(current);
      current = {
        time: normalized ?? '',
        headline: (match[2] ?? '').trim(),
        body: [],
        raw: trimmed,
      };
      continue;
    }
    if (!current) {
      current = { time: defaultTime, headline: summarizeHeadline(trimmed), body: [], raw: trimmed };
      continue;
    }
    current.body.push(trimmed);
  }
  if (current) entries.push(current);
  return entries;
}

function summarizeHeadline(text: string) {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Note';
  const sentence = cleaned.split(/[.!?]/)[0] ?? cleaned;
  const words = sentence.split(/\s+/).filter(Boolean);
  return words.slice(0, 10).join(' ');
}

function normalizeComparableText(raw: string) {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLowSignalText(raw: string) {
  const cleaned = normalizeComparableText(raw);
  if (!cleaned) return true;
  if (cleaned.length < 3) return true;
  const words = cleaned.split(' ').filter(Boolean);
  const stop = new Set([
    'a',
    'an',
    'and',
    'are',
    'as',
    'at',
    'basically',
    'but',
    'do',
    'does',
    'done',
    'for',
    'from',
    'get',
    'go',
    'going',
    'gonna',
    'gotta',
    'have',
    'i',
    'im',
    "i'm",
    'is',
    'it',
    'just',
    'kind',
    'kinda',
    'like',
    'me',
    'my',
    'need',
    'of',
    'ok',
    'okay',
    'on',
    'or',
    'so',
    'that',
    'the',
    'then',
    'there',
    'this',
    'to',
    'uh',
    'um',
    'u',
    'wanna',
    'we',
    'with',
    'you',
    'your',
    'know',
  ]);
  const meaningful = words.filter((w) => !stop.has(w));
  if (meaningful.length === 0) return true;
  if (meaningful.length === 1 && words.length >= 4) return true;
  if (words.every((w) => stop.has(w))) return true;
  if (words.length <= 2 && words.every((w) => stop.has(w))) return true;
  if (cleaned === 'you know' || cleaned === 'i mean' || cleaned === 'like that') return true;
  return false;
}

function findPreferredTokenLine(lines: string[]) {
  const headings = ['Notes', 'Trackers', 'Working On', 'Meal', 'Workout', 'Next actions', 'Completed'];
  for (const heading of headings) {
    const idx = lines.findIndex((line) => line.trim().toLowerCase() === heading.toLowerCase());
    if (idx === -1) continue;
    for (let i = idx + 1; i < lines.length; i += 1) {
      const line = lines[i] ?? '';
      if (!line.trim()) continue;
      if (/^[-*_]{3,}$/.test(line.trim())) break;
      return i;
    }
  }
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    if (!line.trim()) continue;
    if (/^[-*_]{3,}$/.test(line.trim())) continue;
    return i;
  }
  return -1;
}

function appendInlineTokens(lines: string[], tokens: string[]) {
  if (!tokens.length) return;
  const targetIdx = findPreferredTokenLine(lines);
  if (targetIdx === -1) {
    lines.push(tokens.join(' '));
    return;
  }
  const existing = lines[targetIdx] ?? '';
  const missing = tokens.filter((token) => !existing.includes(token));
  if (!missing.length) return;
  lines[targetIdx] = `${existing} ${missing.join(' ')}`.replace(/\s+/g, ' ').trim();
}

function appendTokensToLine(line: string, tokens: string[]) {
  if (!tokens.length) return line;
  const missing = tokens.filter((token) => !line.includes(token));
  if (!missing.length) return line;
  return `${line} ${missing.join(' ')}`.replace(/\s+/g, ' ').trim();
}

function formatTitleCase(raw: string) {
  if (!raw) return '';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function formatNumber(value: number | null | undefined, decimals = 0) {
  if (value == null || !Number.isFinite(value)) return '';
  return decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds)) return '';
  const mins = Math.round(seconds / 60);
  if (mins <= 0) return '';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hours}h ${rem}m` : `${hours}h`;
}

function formatDistance(value: number | null | undefined, unit?: string | null) {
  if (value == null || !Number.isFinite(value)) return '';
  if (value < 0.1) return '';
  const rounded = value < 10 ? value.toFixed(1) : Math.round(value).toString();
  const suffix = unit ?? 'mi';
  return `${rounded} ${suffix}`;
}

function formatRange(values: Array<number | null | undefined>, decimals = 0) {
  const cleaned = values.filter((value): value is number => value != null && Number.isFinite(value));
  if (!cleaned.length) return '';
  const min = Math.min(...cleaned);
  const max = Math.max(...cleaned);
  const format = (value: number) => (decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString());
  if (min === max) return format(min);
  return `${format(min)}-${format(max)}`;
}

function buildAsciiTable(columns: TableColumn[], rows: Array<Record<string, string>>, footerRows?: Array<Record<string, string>>) {
  if (!rows.length) return [];
  const widths = columns.map((col) => col.label.length);
  const allRows = footerRows?.length ? [...rows, ...footerRows] : rows;
  allRows.forEach((row) => {
    columns.forEach((col, idx) => {
      const value = row[col.key] ?? '';
      widths[idx] = Math.max(widths[idx], value.length);
    });
  });
  const border = `+${widths.map((w) => '-'.repeat(w + 2)).join('+')}+`;
  const formatRow = (row: Record<string, string>) =>
    `|${columns
      .map((col, idx) => {
        const raw = row[col.key] ?? '';
        const pad = widths[idx] - raw.length;
        const aligned = col.align === 'right' ? `${' '.repeat(pad)}${raw}` : `${raw}${' '.repeat(pad)}`;
        return ` ${aligned} `;
      })
      .join('|')}|`;
  const lines = [border, formatRow(Object.fromEntries(columns.map((col) => [col.key, col.label]))), border];
  rows.forEach((row) => lines.push(formatRow(row)));
  if (footerRows?.length) {
    lines.push(border);
    footerRows.forEach((row) => lines.push(formatRow(row)));
  }
  lines.push(border);
  return lines;
}

function buildMealTableLines(meal: NonNullable<ReturnType<typeof parseMealFromText>>) {
  const items = meal.items ?? [];
  const columns: TableColumn[] = [
    { key: 'item', label: 'Item' },
    { key: 'notes', label: 'Notes' },
    { key: 'calories', label: 'Calories', align: 'right' },
    { key: 'protein', label: 'Protein g', align: 'right' },
    { key: 'carbs', label: 'Carbs g', align: 'right' },
    { key: 'fat', label: 'Fat g', align: 'right' },
    { key: 'fiber', label: 'Fiber g', align: 'right' },
    { key: 'sodium', label: 'Sodium mg', align: 'right' },
  ];
  const rows = items.map((item) => {
    const qty = item.quantity != null ? formatNumber(item.quantity, item.quantity % 1 === 0 ? 0 : 1) : '';
    const unit = item.unit ?? '';
    const notes = [qty && unit ? `${qty} ${unit}` : qty || unit, item.notes].filter(Boolean).join(', ');
    return {
      item: item.name ?? 'Item',
      notes,
      calories: formatNumber(item.calories),
      protein: formatNumber(item.protein),
      carbs: formatNumber(item.carbs),
      fat: formatNumber(item.fat),
      fiber: formatNumber(item.fiber),
      sodium: formatNumber(item.sodium),
    };
  });
  const totalRow = {
    item: 'TOTAL',
    notes: '',
    calories: formatNumber(meal.totalCalories ?? undefined),
    protein: formatNumber(meal.macros?.protein ?? undefined),
    carbs: formatNumber(meal.macros?.carbs ?? undefined),
    fat: formatNumber(meal.macros?.fat ?? undefined),
    fiber: formatNumber(meal.macros?.fiber ?? undefined),
    sodium: formatNumber(meal.macros?.sodium ?? undefined),
  };
  return buildAsciiTable(columns, rows, [totalRow]);
}

function buildWorkoutTableLines(workout: NonNullable<ReturnType<typeof parseWorkoutFromText>>) {
  const exercises = workout.exercises ?? [];
  const columns: TableColumn[] = [
    { key: 'exercise', label: 'Exercise' },
    { key: 'sets', label: 'Sets', align: 'right' },
    { key: 'reps', label: 'Reps', align: 'right' },
    { key: 'weight', label: 'Weight', align: 'right' },
    { key: 'distance', label: 'Distance', align: 'right' },
    { key: 'duration', label: 'Duration', align: 'right' },
    { key: 'rpe', label: 'RPE', align: 'right' },
  ];
  const rows = exercises.map((exercise) => {
    const sets = exercise.sets ?? [];
    const repsValues = sets.map((set) => set.reps);
    const weightValues = sets.map((set) => set.weight);
    const distanceTotal = sets.reduce((sum, set) => sum + (set.distance ?? 0), 0);
    const durationTotal = sets.reduce((sum, set) => sum + (set.duration ?? 0), 0);
    const rpeValues = sets.map((set) => set.rpe).filter((value): value is number => value != null && Number.isFinite(value));
    const rpe =
      rpeValues.length > 0
        ? Math.round(rpeValues.reduce((sum, value) => sum + value, 0) / rpeValues.length).toString()
        : workout.overallRpe != null
          ? Math.round(workout.overallRpe).toString()
          : '';
    const weightUnit = sets.find((set) => set.weightUnit)?.weightUnit ?? 'lb';
    return {
      exercise: exercise.name ?? 'Exercise',
      sets: sets.length ? `${sets.length}` : '',
      reps: formatRange(repsValues),
      weight: formatRange(weightValues) ? `${formatRange(weightValues)} ${weightUnit}` : '',
      distance: formatDistance(distanceTotal, sets.find((set) => set.distanceUnit)?.distanceUnit ?? 'mi'),
      duration: formatDuration(durationTotal),
      rpe,
    };
  });
  return buildAsciiTable(columns, rows);
}

function splitTaskSegments(raw: string) {
  return raw
    .split(/\s*(?:,|;|\band\b)\s+/i)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function stripInlineTokens(raw: string) {
  return raw.replace(/(^|[\s(])[#@+!][\w/-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeTaskTitle(raw: string) {
  return stripInlineTokens(raw)
    .replace(/^(?:to\s+)?/i, '')
    .replace(/\s+/g, ' ')
    .replace(/^[^a-z0-9]+/i, '')
    .trim();
}

function extractActionTasks(text: string) {
  const tasks: Array<{ title: string; status: 'todo' | 'done' }> = [];
  const needsRe = /\b(?:need to|have to|should|must|gotta)\s+([^.;]+)/gi;
  for (const match of text.matchAll(needsRe)) {
    const raw = match[1] ?? '';
    splitTaskSegments(raw).forEach((segment) => {
      const title = normalizeTaskTitle(segment);
      if (title && !isLowSignalText(title)) tasks.push({ title, status: 'todo' });
    });
  }
  const imperativeRe = /^\s*(?:call|text|email|buy|pick up|schedule|book|review|evaluate|finish|start|fix|ship|send)\b/i;
  if (imperativeRe.test(text)) {
    splitTaskSegments(text).forEach((segment) => {
      const title = normalizeTaskTitle(segment);
      if (title && !isLowSignalText(title)) tasks.push({ title, status: 'todo' });
    });
  }
  return tasks;
}

function extractCompletedTasks(text: string) {
  const tasks: Array<{ title: string; status: 'todo' | 'done' }> = [];
  const doneRe = /\b(?:finished|completed|done|wrapped up|closed out)\s+(?:the\s+)?([^.;]+)/gi;
  for (const match of text.matchAll(doneRe)) {
    const raw = match[1] ?? '';
    splitTaskSegments(raw).forEach((segment) => {
      const title = normalizeTaskTitle(segment);
      if (title && !isLowSignalText(title)) tasks.push({ title, status: 'done' });
    });
  }
  return tasks;
}

function extractNoteLines(text: string) {
  const notes: string[] = [];
  const workedRe = /\bworked on\s+([^.;]+)/gi;
  for (const match of text.matchAll(workedRe)) {
    const raw = (match[1] ?? '').trim();
    if (raw && !isLowSignalText(raw)) notes.push(`Worked on ${raw}`);
  }
  if (notes.length) return notes.filter((line) => !isLowSignalText(line));

  const narrative = extractNarrativeSentences(text);
  if (narrative.length) return narrative;
  return notes;
}

function extractNarrativeSentences(text: string) {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  const sentences = cleaned.split(/(?<=[.!?])\s+/);
  const lines: string[] = [];
  for (const sentenceRaw of sentences) {
    let sentence = sentenceRaw.replace(/[.!?]+$/, '').trim();
    if (!sentence) continue;
    if (/^pending notes\b/i.test(sentence)) continue;
    sentence = sentence.replace(/^i said[:,]?\s*/i, '').trim();
    if (!sentence) continue;
    if (/^make this\b/i.test(sentence)) continue;
    if (!isLowSignalText(sentence)) {
      lines.push(sentence);
    }
    if (lines.length >= 6) break;
  }
  return lines;
}

function extractWorkingOnItems(text: string) {
  const lower = text.toLowerCase();
  if (!lower.includes('working on')) return [];
  const items: string[] = [];
  const re = /\bworking on\s+(?:the\s+)?([^.,;]+)/gi;
  for (const match of text.matchAll(re)) {
    let raw = (match[1] ?? '').trim();
    raw = raw.replace(/\b(right now|currently|just|basically|really)\b/gi, '').trim();
    raw = stripInlineTokens(raw);
    if (!raw) continue;
    raw
      .split(/\s+(?:and|also)\s+/i)
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => items.push(part));
  }
  const subtaskRe = /\b(?:subtasks?|tasks?)\b[^.]*?\bare\s+([^.]*)/gi;
  for (const match of text.matchAll(subtaskRe)) {
    let raw = (match[1] ?? '').trim();
    raw = raw.replace(/\b(right now|currently|just|basically|really)\b/gi, '').trim();
    raw = stripInlineTokens(raw);
    if (!raw) continue;
    raw
      .split(/\s*(?:,|and)\s+/i)
      .map((part) => part.replace(/^\bthe\b\s+/i, '').trim())
      .filter(Boolean)
      .forEach((part) => items.push(part));
  }
  return Array.from(new Set(items)).slice(0, 8);
}

function tagifyWorkingItem(item: string) {
  const stop = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'of',
    'on',
    'for',
    'to',
    'fix',
    'fixes',
    'working',
    'work',
    'right',
    'now',
    'are',
    'currently',
    'just',
    'basically',
    'really',
    'stuff',
    'bunch',
    'app',
  ]);
  const tokens = item
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token && (token === 'ui' || token.length > 2) && (!stop.has(token) || token === 'ui'));
  const unique = Array.from(new Set(tokens)).slice(0, 3);
  return unique.map((token) => `#${token}`).join(' ');
}

function inferEntryTags(text: string) {
  const tags = new Set<string>();
  const t = text.toLowerCase();
  if (/\bcall\b/.test(t) || /\bphone\b/.test(t)) tags.add('#call');
  if (/\btext\b/.test(t) || /\bsms\b/.test(t)) tags.add('#text');
  if (/\bemail\b/.test(t) || /\bmail\b/.test(t)) tags.add('#email');
  if (/\bmeeting\b/.test(t) || /\bmeet\b/.test(t)) tags.add('#meeting');
  if (/\bfinance|financial|budget|payoff|estimation\b/.test(t)) tags.add('#finances');
  if (/\btutor|tutoring\b/.test(t)) tags.add('#tutoring');
  if (/\bwork\b/.test(t)) tags.add('#work');
  if ((tags.has('#finances') || tags.has('#tutoring')) && !tags.has('#work')) tags.add('#work');
  return Array.from(tags);
}

function mergeEntryTasks(primary: Array<{ title: string; status: 'todo' | 'done' }>, secondary: Array<{ title: string; status: 'todo' | 'done' }>) {
  const seen = new Set<string>();
  const merged: Array<{ title: string; status: 'todo' | 'done' }> = [];
  const add = (task: { title: string; status: 'todo' | 'done' }) => {
    const key = task.title.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(task);
  };
  primary.forEach(add);
  secondary.forEach(add);
  return merged;
}

function entrySectionLines(entry: TranscriptEntry, anchorMs: number) {
  const entryText = [entry.raw, ...entry.body].join(' ').trim();
  const workingItems = extractWorkingOnItems(entryText);
  const workingTags = workingItems
    .flatMap((item) => tagifyWorkingItem(item).split(/\s+/).filter(Boolean))
    .filter(Boolean);
  const inferredTags = inferEntryTags(entryText);
  const tags = Array.from(new Set([...inferredTags, ...workingTags]));
  const trackerTokens = new Set<string>();
  const trackerLines: string[] = [];
  const parsedBlocks = parseCaptureWithBlocks(entryText, anchorMs);
  const blockTags = new Set<string>();
  const blockPeople = new Set<string>();
  const blockContexts = new Set<string>();
  const blockLocations = new Set<string>();
  parsedBlocks.blocks.forEach((block) => {
    block.trackers.forEach((tracker) => {
      const value = Math.round(tracker.value);
      const token = `#${tracker.key}[${value}]`;
      trackerTokens.add(token);
      const numericLabel = TRACKER_KEYS_WITH_SCALE.has(tracker.key)
        ? `${tracker.key}: ${value}/10`
        : `${tracker.key}: ${value}`;
      trackerLines.push(`- ${numericLabel} ${token}`.trim());
    });
    block.tags.forEach((tag) => blockTags.add(tag));
    block.people.forEach((person) => blockPeople.add(person));
    block.contexts.forEach((context) => blockContexts.add(context));
    block.locations.forEach((location) => blockLocations.add(location));
  });

  const tagTokens = new Set<string>();
  inferredTags.forEach((tag) => tagTokens.add(tag.replace(/^#/, '')));
  workingTags.forEach((tag) => tagTokens.add(tag.replace(/^#/, '')));
  blockTags.forEach((tag) => tagTokens.add(tag.replace(/^#/, '')));
  const peopleTokens = Array.from(new Set([...blockPeople]));
  const contextTokens = Array.from(blockContexts);
  const locationTokens = Array.from(new Set([...blockLocations]));

  const lines: string[] = [`Time: ${entry.time}`];

  const chipTokens: string[] = [];
  Array.from(tagTokens)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .forEach((tag) => {
      const token = `#${tag}`;
      chipTokens.push(token);
    });
  peopleTokens
    .map((person) => person.replace(/^@+/, '').trim())
    .filter(Boolean)
    .forEach((person) => chipTokens.push(`@${person}`));
  contextTokens
    .map((context) => context.trim())
    .filter(Boolean)
    .forEach((context) => chipTokens.push(`+${context}`));
  locationTokens
    .map((location) => location.trim())
    .filter(Boolean)
    .forEach((location) => chipTokens.push(`!${location}`));

  if (trackerTokens.size) {
    lines.push('Trackers');
    trackerLines.forEach((line) => lines.push(line.replace(/^-+\s*/, '- ')));
  }

  const mealLines: string[] = [];
  const parsedMeal = parseMealFromText(entryText, { nowMs: anchorMs });
  if (parsedMeal?.items?.length) {
    const mealTitle = formatTitleCase(parsedMeal.type ?? 'meal');
    const itemList = parsedMeal.items
      .map((item) => item.name)
      .filter(Boolean)
      .slice(0, 6)
      .join(', ');
    const summary = itemList ? `${mealTitle}: ${itemList}` : `${mealTitle} logged`;
    const mealTokens = [`#${parsedMeal.type ?? 'meal'}`, '#food'];
    mealLines.push('Meal');
    mealLines.push(appendTokensToLine(summary, mealTokens));
    mealLines.push('Meal breakdown + macros (estimated)');
    mealLines.push(...buildMealTableLines(parsedMeal));
  }

  const workoutLines: string[] = [];
  const parsedWorkout = parseWorkoutFromText(entryText);
  if (parsedWorkout?.exercises?.length) {
    const typeLabel = formatTitleCase(parsedWorkout.type ?? 'workout');
    const totalSets = parsedWorkout.exercises.reduce((sum, ex) => sum + (ex.sets?.length ?? 0), 0);
    const totalDuration = parsedWorkout.exercises.reduce(
      (sum, ex) => sum + (ex.sets ?? []).reduce((inner, set) => inner + (set.duration ?? 0), 0),
      0,
    );
    const totalDistance = parsedWorkout.exercises.reduce(
      (sum, ex) => sum + (ex.sets ?? []).reduce((inner, set) => inner + (set.distance ?? 0), 0),
      0,
    );
    const details = [
      parsedWorkout.exercises.length ? `${parsedWorkout.exercises.length} exercise${parsedWorkout.exercises.length === 1 ? '' : 's'}` : '',
      totalSets ? `${totalSets} sets` : '',
      formatDistance(totalDistance, parsedWorkout.exercises.find((ex) => ex.sets?.some((s) => s.distance))?.sets?.find((s) => s.distanceUnit)?.distanceUnit),
      formatDuration(totalDuration),
      parsedWorkout.overallRpe != null ? `RPE ${Math.round(parsedWorkout.overallRpe)}` : '',
    ].filter(Boolean);
    const summary = details.length ? `${typeLabel} workout: ${details.join(', ')}` : `${typeLabel} workout`;
    workoutLines.push('Workout');
    workoutLines.push(appendTokensToLine(summary, ['#workout']));
    workoutLines.push(...buildWorkoutTableLines(parsedWorkout));
  }

  if (workingItems.length) {
    if (mealLines.length) lines.push(...mealLines);
    if (workoutLines.length) lines.push(...workoutLines);
    lines.push('Working On');
    workingItems.forEach((item) => {
      lines.push(`- ▶ ${item}`);
    });
    appendInlineTokens(lines, chipTokens);
    return { timeLabel: entry.time, lines };
  }

  const parsed = parseCaptureNatural(entryText, anchorMs);
  const parsedTasks = parsed.tasks.map((task) => ({
    title: task.title,
    status: task.status === 'done' ? 'done' : 'todo',
  }));
  const extractedTasks = extractActionTasks(entryText);
  const completedTasks = extractCompletedTasks(entryText);
  const headline = normalizeComparableText(entry.headline);
  const notes = (entry.body.length ? entry.body : extractNoteLines(entryText))
    .map((note) => note.trim())
    .filter((note) => note && !isLowSignalText(note))
    .filter((note) => normalizeComparableText(note) !== headline);

  const todos = mergeEntryTasks(
    parsedTasks.filter((t) => t.status !== 'done' && !isLowSignalText(t.title)),
    extractedTasks,
  );
  const done = mergeEntryTasks(
    parsedTasks.filter((t) => t.status === 'done' && !isLowSignalText(t.title)),
    completedTasks,
  );

  if (notes.length) {
    lines.push('Notes');
    notes.forEach((note) => {
      const trimmed = note.trim();
      if (!trimmed) return;
      lines.push(trimmed.startsWith('- ') ? trimmed : `- ${trimmed}`);
    });
  }

  if (mealLines.length) lines.push(...mealLines);
  if (workoutLines.length) lines.push(...workoutLines);

  if (todos.length) {
    lines.push('Next actions');
    todos.forEach((task) => {
      lines.push(`- [ ] ▶ ${task.title}`);
    });
  }

  if (done.length) {
    lines.push('Completed');
    done.forEach((task) => {
      lines.push(`- [x] ${task.title}`);
    });
  }

  if (lines.length === 1 && entry.headline) {
    lines.push(entry.headline);
  }

  appendInlineTokens(lines, chipTokens);
  return { timeLabel: entry.time, lines };
}

export function buildOutlineFromTranscript(rawText: string, opts?: { anchorMs?: number }) {
  const safeAnchorMs = Number.isFinite(opts?.anchorMs) ? (opts?.anchorMs as number) : Date.now();
  const cleaned = stripFrontmatter(rawText ?? '').trim();
  if (!cleaned) return '';
  const entries = parseTranscriptEntries(cleaned, safeAnchorMs);
  if (!entries.length) return '';
  const blocks = entries.map((entry) => entrySectionLines(entry, safeAnchorMs).lines);
  return blocks
    .map((block) => block.join('\n'))
    .join('\n\n---\n\n')
    .trim();
}
