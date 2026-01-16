import { parseCaptureNatural, parseCaptureWithBlocks } from '../nlp/natural'
import { appendSectionLines, ensureSystemFrontmatter, parseNoteDoc, serializeNoteDoc, upsertSection, type NoteDoc } from './doc-model'

type TranscriptEntry = {
  time: string
  headline: string
  body: string[]
  raw: string
}

type BuildNotesInput = {
  existingMarkdown?: string | null
  transcript: string
  anchorMs: number
  title?: string | null
  systemType?: string
  sourceId?: string | null
}

function formatTimeLabel(ms: number) {
  const safeMs = Number.isFinite(ms) ? ms : Date.now()
  const d = new Date(safeMs)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function normalizeTimeToken(raw: string | null | undefined) {
  if (!raw) return null
  const cleaned = raw.replace(/[^0-9]/g, '')
  if (cleaned.length === 4) {
    const hh = cleaned.slice(0, 2)
    const mm = cleaned.slice(2)
    if (Number(mm) < 60 && Number(hh) < 24) return `${hh}:${mm}`
  }
  if (cleaned.length === 3) {
    const hh = `0${cleaned.slice(0, 1)}`
    const mm = cleaned.slice(1)
    if (Number(mm) < 60) return `${hh}:${mm}`
  }
  return raw.includes(':') ? raw : null
}

function summarizeHeadline(text: string) {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return 'Note'
  const sentence = cleaned.split(/[.!?]/)[0] ?? cleaned
  const words = sentence.split(/\s+/).filter(Boolean)
  return words.slice(0, 10).join(' ')
}

function expandInlineTimestampLines(rawText: string) {
  const baseLines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const atPattern = /\bAt\s+(\d{1,2}:\d{2}|\d{3,4}|\d{1,2}[,]\d{2})(?:\s*[ap]m)?\b/gi
  const lines: string[] = []

  for (const rawLine of rawText.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    const matches = [...line.matchAll(atPattern)]
    if (matches.length > 1) {
      for (let i = 0; i < matches.length; i += 1) {
        const match = matches[i]!
        const time = normalizeTimeToken(match[1]) ?? (match[1] ?? '')
        const start = (match.index ?? 0) + match[0].length
        const end = i + 1 < matches.length ? matches[i + 1]!.index ?? line.length : line.length
        const segment = line.slice(start, end).trim().replace(/^[\s,.;:-]+/, '').trim()
        if (!segment) continue
        lines.push(`[${time}] ${segment}`)
      }
      continue
    }
    if (matches.length === 1) {
      const match = matches[0]!
      if ((match.index ?? 0) <= 1) {
        const time = normalizeTimeToken(match[1]) ?? (match[1] ?? '')
        const start = (match.index ?? 0) + match[0].length
        const segment = line.slice(start).trim().replace(/^[\s,.;:-]+/, '').trim()
        if (segment) {
          lines.push(`[${time}] ${segment}`)
          continue
        }
      }
    }
    lines.push(line)
  }
  return lines.length ? lines : baseLines
}

function parseTranscriptEntries(rawText: string | null | undefined, anchorMs: number) {
  if (!rawText) return []
  const lines = expandInlineTimestampLines(rawText)
  const entries: TranscriptEntry[] = []
  let current: TranscriptEntry | null = null
  const timePattern = /^(?:⏱\s*)?(?:at\s+)?(\d{1,2}:\d{2}|\d{3,4}|\d{1,2}[,]\d{2})(?:\s*[ap]m)?\s*(?:[-–—:]|\s+)\s*(.+)$/i
  const bracketPattern = /^\[(\d{1,2}:\d{2}|\d{3,4}|\d{1,2}[,]\d{2})\]\s*(.+)$/
  const defaultTime = formatTimeLabel(anchorMs)

  for (const rawLine of lines) {
    const trimmed = rawLine.trim()
    if (!trimmed) continue
    const cleaned = trimmed.replace(/^#+\s*/, '')
    const match = cleaned.match(timePattern) ?? cleaned.match(bracketPattern)
    if (match) {
      const normalized = normalizeTimeToken(match[1]) ?? match[1]
      if (current) entries.push(current)
      current = {
        time: normalized ?? '',
        headline: (match[2] ?? '').trim(),
        body: [],
        raw: trimmed,
      }
      continue
    }
    if (!current) {
      current = { time: defaultTime, headline: summarizeHeadline(trimmed), body: [], raw: trimmed }
      continue
    }
    current.body.push(trimmed)
  }
  if (current) entries.push(current)
  return entries
}

function normalizeTokenValue(raw: string) {
  return raw.trim().replace(/^\s+|\s+$/g, '')
}

function extractTrackerTokensFromText(rawText: string) {
  const tokens = new Map<string, string>()
  const bracket = /#([a-zA-Z][\w/-]*)\s*\[([^\]]+)\]/g
  for (const match of rawText.matchAll(bracket)) {
    const key = match[1] ?? ''
    const value = match[2] ?? ''
    if (!key || !value) continue
    const token = `#${key}[${value}]`
    tokens.set(token.toLowerCase(), token)
  }
  return Array.from(tokens.values())
}

function extractTrackerTokensFromBlocks(doc: NoteDoc, tokens: string[]) {
  const existing = new Set<string>()
  for (const section of doc.sections) {
    for (const line of section.lines) {
      for (const token of extractTrackerTokensFromText(line)) {
        existing.add(token.toLowerCase())
      }
    }
  }
  return tokens.filter((token) => !existing.has(token.toLowerCase()))
}

function buildEntryKey(entry: TranscriptEntry) {
  return `${entry.time}|${entry.headline}`.toLowerCase()
}

function extractExistingEntryKeys(lines: string[]) {
  const keys = new Set<string>()
  const re = /^###\s*(?:⏱\s*)?(\d{1,2}:\d{2})\s*(?:[-–—:]|\s+)\s*(.+)$/i
  for (const line of lines) {
    const match = line.match(re)
    if (!match) continue
    const time = match[1] ?? ''
    const headline = match[2] ?? ''
    keys.add(`${time}|${headline}`.toLowerCase())
  }
  return keys
}

function findEntrySegments(lines: string[]) {
  const segments: Array<{ key: string; start: number; end: number }> = []
  let current: { key: string; start: number } | null = null
  const re = /^###\s*(?:⏱\s*)?(\d{1,2}:\d{2}|—)\s*(?:[-–—:]|\s+)\s*(.+)$/i
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? ''
    const match = line.match(re)
    if (match) {
      if (current) {
        segments.push({ key: current.key, start: current.start, end: i })
      }
      const time = match[1] ?? ''
      const headline = match[2] ?? ''
      current = { key: `${time}|${headline}`.toLowerCase(), start: i }
    }
  }
  if (current) {
    segments.push({ key: current.key, start: current.start, end: lines.length })
  }
  return segments
}

function upsertEntryLines(lines: string[], entryKey: string, entryLines: string[], replaceExisting: boolean) {
  const segments = findEntrySegments(lines)
  const match = segments.find((segment) => segment.key === entryKey)
  if (match) {
    if (!replaceExisting) return { lines, changed: false }
    const currentSlice = lines.slice(match.start, match.end)
    const same =
      currentSlice.length === entryLines.length &&
      currentSlice.every((line, index) => line === entryLines[index])
    if (same) return { lines, changed: false }
    const next = [...lines.slice(0, match.start), ...entryLines, ...lines.slice(match.end)]
    return { lines: next, changed: true }
  }
  const trimmed = lines.slice()
  if (trimmed.length && trimmed[trimmed.length - 1]?.trim() !== '') trimmed.push('')
  trimmed.push(...entryLines)
  return { lines: trimmed, changed: true }
}

function buildEntryLines(entry: TranscriptEntry, anchorMs: number) {
  const lines: string[] = []
  const heading = `### ⏱ ${entry.time} — ${entry.headline}`.trim()
  lines.push(heading)
  const inferredTags = inferEntryTags(entry.raw)
  if (inferredTags.length) {
    lines.push(inferredTags.join(' '))
  }
  if (entry.body.length) {
    lines.push('- 📝 Notes')
    entry.body.forEach((line) => lines.push(`  - ${line}`))
  }
  const parsed = parseCaptureNatural(entry.raw, anchorMs)
  if (parsed.tasks.length) {
    lines.push('- ✅ Next actions')
    parsed.tasks.forEach((task) => {
      const tags = (task.tags ?? []).map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ')
      const timerMeta = task.estimateMinutes ? `{${task.estimateMinutes}m}` : ''
      const timerPrefix = task.estimateMinutes ? '▶ ' : ''
      const line = `  - [ ] ${timerPrefix}${task.title} ${timerMeta} ${tags}`.replace(/\s+/g, ' ').trim()
      lines.push(line)
    })
  }
  const workingItems = extractWorkingOnItems(entry.raw)
  if (workingItems.length) {
    lines.push('- 🧩 Working on')
    workingItems.forEach((item) => {
      const tags = tagifyWorkingItem(item)
      const line = `  - [ ] ▶ ${item}${tags ? ` ${tags}` : ''}`.trim()
      lines.push(line)
    })
  }
  return lines
}

function inferEntryTags(text: string) {
  const tags = new Set<string>()
  const t = text.toLowerCase()
  if (/\bcall\b/.test(t) || /\bphone\b/.test(t)) tags.add('#call')
  if (/\btext\b/.test(t) || /\bsms\b/.test(t)) tags.add('#text')
  if (/\bemail\b/.test(t) || /\bmail\b/.test(t)) tags.add('#email')
  if (/\bmeeting\b/.test(t) || /\bmeet\b/.test(t)) tags.add('#meeting')
  if (/\bfinance|financial|budget|payoff|estimation\b/.test(t)) tags.add('#finances')
  if (/\btutor|tutoring\b/.test(t)) tags.add('#tutoring')
  if (/\bwork\b/.test(t)) tags.add('#work')
  if ((tags.has('#finances') || tags.has('#tutoring')) && !tags.has('#work')) tags.add('#work')
  return Array.from(tags)
}

function extractWorkingOnItems(text: string) {
  const lower = text.toLowerCase()
  if (!lower.includes('working on')) return []
  const items: string[] = []
  const re = /\bworking on\s+(?:the\s+)?([^.,;]+)/gi
  for (const match of text.matchAll(re)) {
    let raw = (match[1] ?? '').trim()
    raw = raw.replace(/\b(right now|currently|just|basically|really)\b/gi, '').trim()
    if (!raw) continue
    raw
      .split(/\s+(?:and|also)\s+/i)
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => items.push(part))
  }
  const subtaskRe = /\b(?:subtasks?|tasks?)\b[^.]*?\bare\s+([^.]*)/gi
  for (const match of text.matchAll(subtaskRe)) {
    let raw = (match[1] ?? '').trim()
    raw = raw.replace(/\b(right now|currently|just|basically|really)\b/gi, '').trim()
    if (!raw) continue
    raw
      .split(/\s*(?:,|and)\s+/i)
      .map((part) => part.replace(/^\bthe\b\s+/i, '').trim())
      .filter(Boolean)
      .forEach((part) => items.push(part))
  }
  return Array.from(new Set(items)).slice(0, 8)
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
  ])
  const tokens = item
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token && (token === 'ui' || token.length > 2) && (!stop.has(token) || token === 'ui'))
  const unique = Array.from(new Set(tokens)).slice(0, 3)
  return unique.map((token) => `#${token}`).join(' ')
}

type EntryTask = { title: string; status: 'todo' | 'done' }

function splitTaskSegments(raw: string) {
  return raw
    .split(/\s*(?:,|;|\band\b)\s+/i)
    .map((segment) => segment.trim())
    .filter(Boolean)
}

function normalizeTaskTitle(raw: string) {
  return raw
    .replace(/^(?:to\s+)?/i, '')
    .replace(/\s+/g, ' ')
    .replace(/^[^a-z0-9]+/i, '')
    .trim()
}

function extractActionTasks(text: string) {
  const tasks: EntryTask[] = []
  const needsRe = /\b(?:need to|have to|should|must|gotta)\s+([^.;]+)/gi
  for (const match of text.matchAll(needsRe)) {
    const raw = match[1] ?? ''
    splitTaskSegments(raw).forEach((segment) => {
      const title = normalizeTaskTitle(segment)
      if (title) tasks.push({ title, status: 'todo' })
    })
  }
  const imperativeRe = /^\s*(?:call|text|email|buy|pick up|schedule|book|review|evaluate|finish|start)\b/i
  if (imperativeRe.test(text)) {
    splitTaskSegments(text).forEach((segment) => {
      const title = normalizeTaskTitle(segment)
      if (title) tasks.push({ title, status: 'todo' })
    })
  }
  return tasks
}

function extractCompletedTasks(text: string) {
  const tasks: EntryTask[] = []
  const doneRe = /\b(?:finished|completed|done|wrapped up|closed out)\s+(?:the\s+)?([^.;]+)/gi
  for (const match of text.matchAll(doneRe)) {
    const raw = match[1] ?? ''
    splitTaskSegments(raw).forEach((segment) => {
      const title = normalizeTaskTitle(segment)
      if (title) tasks.push({ title, status: 'done' })
    })
  }
  return tasks
}

function extractNoteLines(text: string) {
  const notes: string[] = []
  const workedRe = /\bworked on\s+([^.;]+)/gi
  for (const match of text.matchAll(workedRe)) {
    const raw = (match[1] ?? '').trim()
    if (raw) notes.push(`Worked on ${raw}`)
  }
  return notes
}

function extractMediaActivity(text: string) {
  const lower = text.toLowerCase()
  const watchMatch = text.match(/\bwatch(?:ing|ed)?\s+([^.;]+)/i)
  if (watchMatch?.[1]) {
    let title = watchMatch[1]
    title = title.replace(/\b(right now|currently|just|at the moment)\b.*$/i, '').trim()
    title = title.replace(/\b(episode|ep|season)\b.*$/i, '').trim()
    title = title.replace(/\s{2,}/g, ' ').trim()
    if (title) return { label: `Watching ${title}`.trim(), kind: 'watch' }
  }
  const listenMatch = text.match(/\blisten(?:ing)?\s+to\s+([^.;]+)/i)
  if (listenMatch?.[1]) {
    const title = listenMatch[1].replace(/\b(right now|currently|just)\b.*$/i, '').trim()
    if (title) return { label: `Listening to ${title}`.trim(), kind: 'listen' }
  }
  const readMatch = text.match(/\bread(?:ing)?\s+([^.;]+)/i)
  if (readMatch?.[1]) {
    const title = readMatch[1].replace(/\b(right now|currently|just)\b.*$/i, '').trim()
    if (title) return { label: `Reading ${title}`.trim(), kind: 'read' }
  }
  if (/\bwatch\b/.test(lower)) return { label: 'Watching', kind: 'watch' }
  return null
}

function extractEpisodeDetail(text: string) {
  const match = text.match(/\bepisode\s+(\d+)\b/i) ?? text.match(/\bep\s*(\d+)\b/i)
  return match?.[1] ? `Episode ${match[1]}` : null
}

function deriveEntryLabel(entry: TranscriptEntry, tags: string[], workingItems: string[]) {
  const lower = entry.raw.toLowerCase()
  if (workingItems.length || /\bworking on\b/i.test(entry.raw)) return 'Working On'
  if (tags.includes('#call') || tags.includes('#text') || tags.includes('#email')) return 'Calls & Texts'
  if (tags.includes('#finances') || tags.includes('#tutoring') || tags.includes('#work')) return 'Financial / Work-Related Tasks'
  if (/\bcall\b/.test(lower) || /\btext\b/.test(lower)) return 'Calls & Texts'
  if (/\bfinance|financial|tutor|tutoring|payoff|estimation\b/.test(lower)) return 'Financial / Work-Related Tasks'
  return summarizeHeadline(entry.headline)
}

function mergeEntryTasks(primary: EntryTask[], secondary: EntryTask[]) {
  const seen = new Set<string>()
  const merged: EntryTask[] = []
  const add = (task: EntryTask) => {
    const key = task.title.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    merged.push(task)
  }
  primary.forEach(add)
  secondary.forEach(add)
  return merged
}

function entrySectionLines(entry: TranscriptEntry, anchorMs: number) {
  const entryText = [entry.raw, ...entry.body].join(' ').trim()
  const workingItems = extractWorkingOnItems(entryText)
  const workingTags = workingItems
    .flatMap((item) => tagifyWorkingItem(item).split(/\s+/).filter(Boolean))
    .filter(Boolean)
  const inferredTags = inferEntryTags(entryText)
  const tags = Array.from(new Set([...inferredTags, ...workingTags]))
  const trackerTokens = new Set<string>()
  const trackerLines: string[] = []
  const parsedBlocks = parseCaptureWithBlocks(entryText, anchorMs)
  parsedBlocks.blocks.forEach((block) => {
    block.trackers.forEach((tracker) => {
      const value = Math.round(tracker.value)
      const token = `#${tracker.key}[${value}]`
      trackerTokens.add(token)
      const numericLabel = ['mood', 'energy', 'stress', 'pain', 'focus', 'productivity', 'motivation'].includes(tracker.key)
        ? `${tracker.key}: ${value}/10`
        : `${tracker.key}: ${value}`
      trackerLines.push(`- ${numericLabel} ${token}`.trim())
    })
  })
  const activity = extractMediaActivity(entryText)
  const label = activity?.label ?? deriveEntryLabel(entry, tags, workingItems)
  const sectionTitle = `⏱ ${entry.time} — ${label}`.trim()
  const lines: string[] = []

  if (tags.length) lines.push(tags.join(' '))

  if (trackerTokens.size) {
    lines.push('### Trackers')
    trackerLines.forEach((line) => lines.push(line))
  }

  if (activity) {
    const episode = extractEpisodeDetail(entryText)
    if (episode) lines.push(`### ${episode}`)
  }

  if (workingItems.length) {
    workingItems.forEach((item) => {
      lines.push(`- [ ] ▶ ${item}`)
    })
    return { title: sectionTitle, lines }
  }

  const parsed = parseCaptureNatural(entryText, anchorMs)
  const parsedTasks: EntryTask[] = parsed.tasks.map((task) => ({
    title: task.title,
    status: task.status === 'done' ? 'done' : 'todo',
  }))
  const extractedTasks = extractActionTasks(entryText)
  const completedTasks = extractCompletedTasks(entryText)
  const notes = entry.body.length ? entry.body : extractNoteLines(entryText)

  const todos = mergeEntryTasks(parsedTasks.filter((t) => t.status !== 'done'), extractedTasks)
  const done = mergeEntryTasks(parsedTasks.filter((t) => t.status === 'done'), completedTasks)

  if (notes.length) {
    lines.push('### Notes')
    notes.forEach((note) => lines.push(`- ${note}`))
  }

  if (todos.length) {
    lines.push('### Next actions')
    todos.forEach((task) => {
      lines.push(`- [ ] ▶ ${task.title}`)
    })
  }

  if (!todos.length && done.length) {
    lines.push('### Completed')
    done.forEach((task) => lines.push(`- [x] ${task.title}`))
  } else if (done.length) {
    lines.push('### Completed')
    done.forEach((task) => lines.push(`- [x] ${task.title}`))
  }

  return { title: sectionTitle, lines }
}

function collectTokens(transcript: string, anchorMs: number) {
  const parsed = parseCaptureWithBlocks(transcript, anchorMs)
  const tags = new Set<string>()
  const people = new Set<string>()
  const contexts = new Set<string>()
  const locations = new Set<string>()
  const trackerTokens: string[] = []
  parsed.blocks.forEach((block) => {
    block.tags.forEach((t) => tags.add(normalizeTokenValue(t)))
    block.people.forEach((p) => people.add(normalizeTokenValue(p)))
    block.contexts.forEach((c) => contexts.add(normalizeTokenValue(c)))
    block.locations.forEach((l) => locations.add(normalizeTokenValue(l)))
    block.trackers.forEach((t) => {
      trackerTokens.push(`#${t.key}[${Math.round(t.value)}]`)
    })
  })
  return {
    tags: Array.from(tags).filter(Boolean),
    people: Array.from(people).filter(Boolean),
    contexts: Array.from(contexts).filter(Boolean),
    locations: Array.from(locations).filter(Boolean),
    trackerTokens,
  }
}

function buildContextLines(tokens: ReturnType<typeof collectTokens>) {
  const lines: string[] = []
  if (tokens.tags.length) {
    lines.push(`- Tags: ${tokens.tags.map((t) => `#${t}`).join(' ')}`)
  }
  if (tokens.contexts.length) {
    lines.push(`- Context: ${tokens.contexts.map((c) => `+${c}`).join(' ')}`)
  }
  if (tokens.people.length) {
    lines.push(`- People: ${tokens.people.map((p) => `@${p}`).join(' ')}`)
  }
  if (tokens.locations.length) {
    lines.push(`- Location: ${tokens.locations.map((l) => `@@${l}`).join(' ')}`)
  }
  return lines
}

function appendUniqueLines(section: NoteDoc['sections'][number], lines: string[]) {
  const existing = new Set(section.lines.map((line) => line.trim()))
  const next = lines.filter((line) => line.trim() && !existing.has(line.trim()))
  if (!next.length) return
  appendSectionLines(section, next)
}

type StructuredSection = {
  title: string
  timeLabel: string
  dateLabel: string | null
  tags: string[]
  lines: string[]
}

function extractTimePrefix(line: string) {
  const match = line.match(/^\s*\[?(\d{1,2}:\d{2}|\d{3,4}|\d{1,2}[,]\d{2})\]?\s*(?:-|—)?\s*/i)
  return normalizeTimeToken(match?.[1] ?? null)
}

function normalizeTagList(raw: string) {
  const tags = raw
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.startsWith('#') ? t : `#${t}`))
  return Array.from(new Set(tags))
}

function parseStructuredOutline(rawText: string, anchorMs: number) {
  const lines = rawText.split(/\r?\n/)
  const sections: StructuredSection[] = []
  let current: StructuredSection | null = null
  let inTasks = false

  const pushSection = () => {
    if (!current) return
    if (!current.lines.length) return
    sections.push(current)
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue
    if (/^---+$/.test(line)) {
      pushSection()
      current = null
      inTasks = false
      continue
    }
    const sectionMatch = line.match(/^(?:\d{1,2}:\d{2}\s*[-–—]\s*)?(?:section|topic|subject)\s*:\s*(.+)$/i)
    if (sectionMatch?.[1]) {
      pushSection()
      const timeLabel = extractTimePrefix(line) ?? formatTimeLabel(anchorMs)
      current = {
        title: sectionMatch[1].trim(),
        timeLabel,
        dateLabel: null,
        tags: [],
        lines: [],
      }
      inTasks = false
      continue
    }
    const subsectionMatch = line.match(/^(?:subsection|subtopic|subheading)\s*:\s*(.+)$/i)
    if (subsectionMatch?.[1] && current) {
      current.lines.push(`### 🔹 ${subsectionMatch[1].trim()}`)
      inTasks = false
      continue
    }
    const dateMatch = line.match(/^(?:date|day)\s*:\s*(.+)$/i)
    if (dateMatch?.[1] && current) {
      current.dateLabel = dateMatch[1].trim()
      continue
    }
    const tagsMatch = line.match(/^(?:tags?)\s*:\s*(.+)$/i)
    if (tagsMatch?.[1] && current) {
      current.tags = normalizeTagList(tagsMatch[1])
      continue
    }
    const tasksMatch = line.match(/^(?:tasks?|todos?)\s*:\s*(.*)$/i)
    if (tasksMatch && current) {
      inTasks = true
      const inline = tasksMatch[1]?.trim()
      if (inline) {
        inline
          .split(/\s*(?:,|;|and)\s+/i)
          .map((item) => item.trim())
          .filter(Boolean)
          .forEach((item) => current.lines.push(`- [ ] ${item}`))
      }
      continue
    }
    if (!current) continue
    if (inTasks) {
      const taskLine = line.replace(/^[*-]\s+/, '').trim()
      if (taskLine) current.lines.push(`- [ ] ${taskLine}`)
      continue
    }
    const bullet = line.startsWith('- ') || line.startsWith('* ')
    current.lines.push(bullet ? line.replace(/^\*\s+/, '- ') : `- ${line}`)
  }

  pushSection()
  return sections
}

function upsertSectionBefore(doc: NoteDoc, title: string, beforeTitles: string[], level = 2) {
  const normalizedTitle = title.toLowerCase().replace(/^[^\w]+/, '').trim()
  const existing = doc.sections.find((section) => ((section.title ?? '').toLowerCase().replace(/^[^\w]+/, '').trim()) === normalizedTitle)
  if (existing) return existing
  const insertAt = doc.sections.findIndex((section) =>
    beforeTitles.includes((section.title ?? '').toLowerCase().replace(/^[^\w]+/, '').trim()),
  )
  const section = {
    id: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${doc.sections.length}`,
    title,
    level,
    lines: [],
    dividerBefore: insertAt > 0,
  }
  if (insertAt === -1) {
    doc.sections.push(section)
  } else {
    doc.sections.splice(insertAt, 0, section)
  }
  return section
}

export function buildNotesFromTranscript(opts: BuildNotesInput) {
  const safeAnchorMs = Number.isFinite(opts.anchorMs) ? opts.anchorMs : Date.now()
  const base = parseNoteDoc(opts.existingMarkdown ?? '')
  let didChange = false
  if (!base.title && opts.title) {
    base.title = opts.title
    didChange = true
  }

  const nowIso = new Date().toISOString()
  base.frontmatter = ensureSystemFrontmatter(base.frontmatter, {
    title: base.title ?? opts.title ?? undefined,
    created: new Date(safeAnchorMs).toISOString(),
    type: opts.systemType ?? 'transcript',
    source: opts.sourceId ?? undefined,
  })
  // Keep the output as a clean, exportable note (no extra context sections).

  const structuredSections = parseStructuredOutline(opts.transcript, safeAnchorMs)
  if (structuredSections.length) {
    structuredSections.forEach((section) => {
      const title = `⏱ ${section.timeLabel} — ${section.title}`
      const nextSection = upsertSectionBefore(base, title, ['running outline', 'inbox / capture', 'end-of-note recap'], 2)
      const lines: string[] = []
      if (section.dateLabel) {
        lines.push(`📅 [[${section.dateLabel}]]`)
      }
      if (section.tags.length) {
        lines.push(section.tags.join(' '))
      }
      if (section.lines.length) {
        lines.push('', ...section.lines)
      }
      const before = nextSection.lines.join('\n')
      appendUniqueLines(nextSection, lines)
      if (nextSection.lines.join('\n') !== before) didChange = true
    })
  } else {
    const entries = parseTranscriptEntries(opts.transcript, safeAnchorMs)
    if (entries.length) {
      const beforeCount = base.sections.length
      entries.forEach((entry, index) => {
        const section = entrySectionLines(entry, safeAnchorMs)
        const target = upsertSectionBefore(base, section.title, ['running outline', 'inbox / capture', 'end-of-note recap'], 2)
        const before = target.lines.join('\n')
        appendUniqueLines(target, section.lines)
        if (target.lines.join('\n') !== before) didChange = true
        if (!target.dividerBefore && (beforeCount > 0 || index > 0)) {
          target.dividerBefore = true
          didChange = true
        }
      })
    }
  }

  if (didChange) {
    base.frontmatter = {
      ...base.frontmatter,
      updated: nowIso,
    }
  }

  return serializeNoteDoc(base)
}
