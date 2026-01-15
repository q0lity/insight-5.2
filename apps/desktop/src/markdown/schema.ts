export type MarkdownTokenType = 'tag' | 'person' | 'context' | 'place'

// Block types for structured capture
export type MarkdownBlockType =
  | 'segment'    // Generic segment between dividers
  | 'note'       // Free-form notes
  | 'task'       // Actionable task with checkbox
  | 'tracker'    // Mood/energy/pain tracker
  | 'meal'       // Nutrition log
  | 'workout'    // Exercise log
  | 'event'      // Time-bounded activity

export type MarkdownBlock = {
  id: string
  type: MarkdownBlockType
  startLine: number
  endLine: number
  timestampMs?: number
  header?: MarkdownSegmentHeader
  body: string
  tokens: MarkdownTokenCollections
  rawTranscript?: string        // Original voice transcription
  formattedTranscript?: string  // AI-formatted version
  children?: MarkdownBlock[]    // Nested blocks (e.g., tasks within event)
  // Specialized fields
  trackerKey?: string           // For tracker blocks: mood, energy, pain, etc.
  trackerValue?: number         // Numeric value (1-10)
  workout?: WorkoutData         // For workout blocks
  meal?: MealData               // For meal blocks
}

export type WorkoutData = {
  type: 'strength' | 'cardio' | 'mobility' | 'recovery'
  exercises: Array<{
    name: string
    sets: Array<{
      reps?: number
      weight?: number
      duration?: number
      distance?: number
      rpe?: number
    }>
    notes?: string
  }>
  totalDuration?: number
  estimatedCalories?: number
  rpe?: number
}

export type MealData = {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  items: Array<{
    name: string
    quantity: number
    unit: string
    calories?: number
    protein?: number
    carbs?: number
    fat?: number
  }>
  totalCalories?: number
  macros?: { protein: number; carbs: number; fat: number }
}

export type MarkdownToken = {
  type: MarkdownTokenType
  raw: string
  value: string
  index: number
}

export type MarkdownTokenCollections = {
  tags: string[]
  people: string[]
  contexts: string[]
  places: string[]
}

export type MarkdownSegmentHeader = {
  type: string
  title: string | null
  category: string | null
  subcategory: string | null
  props: Record<string, string | number | boolean>
  tokens: MarkdownTokenCollections
  raw: string
}

export type MarkdownSegment = {
  header: MarkdownSegmentHeader | null
  body: string
  raw: string
  startLine: number
  endLine: number
  tokens: MarkdownTokenCollections
}

// Markdown block schema:
// - Divider: line with --- / *** / ___ to split segments.
// - Header: ::type [category/subcategory] "Title" #tag @person *context !place [key=value]
// - Body: normal markdown; tokens inside the body are merged into the segment tokens.
const DIVIDER_RE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/
const HEADER_RE = /^::([a-zA-Z][\w-]*)(?:\s+(.*))?$/
const BRACKET_RE = /\[([^\]]+)\]/g

function uniq(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function stripFrontmatter(raw: string) {
  const lines = raw.split(/\r?\n/)
  if ((lines[0] ?? '').trim() !== '---') return { frontmatter: null, body: raw }
  const endIdx = lines.slice(1).findIndex((l) => l.trim() === '---')
  if (endIdx === -1) return { frontmatter: null, body: raw }
  const fm = lines.slice(1, endIdx + 1).join('\n')
  const body = lines.slice(endIdx + 2).join('\n')
  return { frontmatter: fm, body }
}

function parseBracketProps(raw: string) {
  const props: Record<string, string | number | boolean> = {}
  for (const match of raw.matchAll(BRACKET_RE)) {
    const content = match[1]?.trim()
    if (!content) continue
    const parts = content.split(/[;,]/).map((p) => p.trim()).filter(Boolean)
    for (const part of parts) {
      const eqIdx = part.indexOf('=')
      if (eqIdx === -1) {
        props[part] = true
        continue
      }
      const key = part.slice(0, eqIdx).trim()
      let value = part.slice(eqIdx + 1).trim()
      if (!key) continue
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (/^(true|false)$/i.test(value)) {
        props[key] = value.toLowerCase() === 'true'
        continue
      }
      const num = Number(value)
      props[key] = Number.isFinite(num) && value !== '' ? num : value
    }
  }
  return props
}

function stripBracketProps(raw: string) {
  return raw.replace(BRACKET_RE, ' ').replace(/\s+/g, ' ').trim()
}

export function extractInlineTokens(text: string): MarkdownToken[] {
  const tokens: MarkdownToken[] = []
  const add = (type: MarkdownTokenType, raw: string, value: string, index: number) => {
    if (!value) return
    tokens.push({ type, raw, value, index })
  }

  for (const m of text.matchAll(/(^|[\s(])#([a-zA-Z][\w/-]*)/g)) {
    add('tag', `#${m[2]}`, m[2], m.index ?? 0)
  }
  for (const m of text.matchAll(/(^|[\s(])!([a-zA-Z][\w/-]*)/g)) {
    add('place', `!${m[2]}`, m[2], m.index ?? 0)
  }
  for (const m of text.matchAll(/(^|[\s(])@@([a-zA-Z][\w/-]*)/g)) {
    add('place', `@@${m[2]}`, m[2], m.index ?? 0)
  }
  for (const m of text.matchAll(/(^|[\s(])\+([a-zA-Z][\w/-]*)/g)) {
    add('context', `+${m[2]}`, m[2], m.index ?? 0)
  }
  for (const m of text.matchAll(/(^|[\s(])\*([a-zA-Z][\w/-]*)(?!\*)/g)) {
    add('context', `*${m[2]}`, m[2], m.index ?? 0)
  }
  for (const m of text.matchAll(/(^|[\s(])@(?:"([^"]+)"|'([^']+)'|([A-Za-z][\w'’-]*(?:\s+[A-Za-z][\w'’-]*){0,3}))/g)) {
    const raw = (m[2] ?? m[3] ?? m[4] ?? '').trim()
    if (!raw) continue
    add('person', `@${raw}`, raw, m.index ?? 0)
  }

  return tokens
}

export function extractInlineTokenStrings(text: string) {
  return uniq(extractInlineTokens(text).map((t) => t.raw))
}

export function toTokenCollections(tokens: MarkdownToken[]): MarkdownTokenCollections {
  return {
    tags: uniq(tokens.filter((t) => t.type === 'tag').map((t) => t.value)),
    people: uniq(tokens.filter((t) => t.type === 'person').map((t) => t.value)),
    contexts: uniq(tokens.filter((t) => t.type === 'context').map((t) => t.value)),
    places: uniq(tokens.filter((t) => t.type === 'place').map((t) => t.value)),
  }
}

function stripTokens(raw: string) {
  return raw
    .replace(/(^|[\s(])[#@!*+][a-zA-Z][\w/'’-]*(?:\s+[A-Za-z][\w'’-]*){0,3}/g, ' ')
    .replace(/(^|[\s(])@@[a-zA-Z][\w/'’-]*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseHeaderTitleAndCategory(raw: string) {
  let working = raw.trim()
  let title: string | null = null
  let category: string | null = null
  let subcategory: string | null = null

  const quoted = working.match(/"([^"]+)"|'([^']+)'/)
  if (quoted) {
    title = (quoted[1] ?? quoted[2] ?? '').trim() || null
    working = working.replace(quoted[0], ' ').trim()
  }

  const catMatch = working.match(/^([a-zA-Z][\w-]*)(?:\/([a-zA-Z][\w-]*))?(?:\s+|$)(.*)$/)
  if (catMatch) {
    category = catMatch[1] ?? null
    subcategory = catMatch[2] ?? null
    working = (catMatch[3] ?? '').trim()
  }

  if (!title) {
    title = working.trim() || null
  }

  return { title, category, subcategory }
}

export function parseSegmentHeader(line: string): MarkdownSegmentHeader | null {
  const trimmed = line.trim()
  const match = trimmed.match(HEADER_RE)
  if (!match) return null
  const type = match[1].toLowerCase()
  const rest = match[2] ?? ''
  const props = parseBracketProps(rest)
  const withoutProps = stripBracketProps(rest)
  const tokens = extractInlineTokens(withoutProps)
  const withoutTokens = stripTokens(withoutProps)
  const { title, category, subcategory } = parseHeaderTitleAndCategory(withoutTokens)
  return {
    type,
    title,
    category,
    subcategory,
    props,
    tokens: toTokenCollections(tokens),
    raw: line,
  }
}

export function parseMarkdownSegments(rawText: string): MarkdownSegment[] {
  const { body } = stripFrontmatter(rawText)
  const lines = body.split(/\r?\n/)
  const segments: Array<{ startLine: number; lines: string[] }> = []
  let current: { startLine: number; lines: string[] } | null = { startLine: 0, lines: [] }

  lines.forEach((line, idx) => {
    if (DIVIDER_RE.test(line)) {
      if (current) segments.push(current)
      current = { startLine: idx + 1, lines: [] }
      return
    }
    current?.lines.push(line)
  })

  if (current) segments.push(current)

  return segments.map((segment) => {
    const raw = segment.lines.join('\n').trimEnd()
    const firstContentIdx = segment.lines.findIndex((l) => l.trim() !== '')
    let header: MarkdownSegmentHeader | null = null
    let bodyLines = segment.lines
    if (firstContentIdx !== -1) {
      const headerCandidate = segment.lines[firstContentIdx]
      const parsedHeader = parseSegmentHeader(headerCandidate)
      if (parsedHeader) {
        header = parsedHeader
        bodyLines = segment.lines.slice(firstContentIdx + 1)
      }
    }
    const body = bodyLines.join('\n').trimEnd()
    const bodyTokens = extractInlineTokens(body)
    const headerTokens = header ? header.tokens : { tags: [], people: [], contexts: [], places: [] }
    const tokens = {
      tags: uniq([...headerTokens.tags, ...bodyTokens.filter((t) => t.type === 'tag').map((t) => t.value)]),
      people: uniq([...headerTokens.people, ...bodyTokens.filter((t) => t.type === 'person').map((t) => t.value)]),
      contexts: uniq([...headerTokens.contexts, ...bodyTokens.filter((t) => t.type === 'context').map((t) => t.value)]),
      places: uniq([...headerTokens.places, ...bodyTokens.filter((t) => t.type === 'place').map((t) => t.value)]),
    }
    const startLine = segment.startLine + 1
    const endLine = segment.startLine + segment.lines.length
    return { header, body, raw, startLine, endLine, tokens }
  })
}

export function collectMarkdownTokens(rawText: string): MarkdownTokenCollections {
  const segments = parseMarkdownSegments(rawText)
  const tags: string[] = []
  const people: string[] = []
  const contexts: string[] = []
  const places: string[] = []
  for (const seg of segments) {
    tags.push(...seg.tokens.tags)
    people.push(...seg.tokens.people)
    contexts.push(...seg.tokens.contexts)
    places.push(...seg.tokens.places)
  }
  return {
    tags: uniq(tags),
    people: uniq(people),
    contexts: uniq(contexts),
    places: uniq(places),
  }
}

// Block detection patterns
const TRACKER_RE = /#(mood|energy|stress|pain|anxiety|focus|motivation)\s*(?:\((\d+)\)|:\s*(\d+))/gi
const WORKOUT_KEYWORDS = /\b(workout|gym|exercise|lift|cardio|run|running|bench|squat|deadlift|push[-\s]?ups?|pull[-\s]?ups?|sets?|reps?|weight)\b/i
const MEAL_KEYWORDS = /\b(breakfast|lunch|dinner|snack|meal|ate|eating|had|food|calories?|protein|carbs?|fat)\b/i
const TASK_RE = /^[-*]\s*\[([ xX])\]\s*(.+)$/gm

function generateBlockId() {
  return `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function detectBlockType(body: string, header?: MarkdownSegmentHeader): MarkdownBlockType {
  const headerType = header?.type?.toLowerCase()
  if (headerType === 'workout' || headerType === 'exercise') return 'workout'
  if (headerType === 'meal' || headerType === 'food' || headerType === 'nutrition') return 'meal'
  if (headerType === 'tracker' || headerType === 'log') return 'tracker'
  if (headerType === 'task' || headerType === 'todo') return 'task'
  if (headerType === 'event') return 'event'
  if (headerType === 'note') return 'note'

  // Detect from content
  if (TRACKER_RE.test(body)) return 'tracker'
  if (WORKOUT_KEYWORDS.test(body)) return 'workout'
  if (MEAL_KEYWORDS.test(body)) return 'meal'
  if (TASK_RE.test(body)) return 'task'

  return 'segment'
}

function extractTrackerData(body: string): { trackerKey: string; trackerValue: number } | null {
  const match = body.match(/#(mood|energy|stress|pain|anxiety|focus|motivation)\s*(?:\((\d+)\)|:\s*(\d+))/i)
  if (!match) return null
  const value = parseInt(match[2] ?? match[3] ?? '5', 10)
  return { trackerKey: match[1].toLowerCase(), trackerValue: Math.min(10, Math.max(1, value)) }
}

function extractTasksFromBody(body: string): MarkdownBlock[] {
  const tasks: MarkdownBlock[] = []
  const lines = body.split(/\r?\n/)
  let lineNum = 0
  for (const line of lines) {
    const match = line.match(/^[-*]\s*\[([ xX])\]\s*(.+)$/)
    if (match) {
      const done = match[1].toLowerCase() === 'x'
      tasks.push({
        id: generateBlockId(),
        type: 'task',
        startLine: lineNum,
        endLine: lineNum,
        body: match[2],
        tokens: toTokenCollections(extractInlineTokens(match[2])),
        trackerKey: done ? 'completed' : 'pending',
      })
    }
    lineNum++
  }
  return tasks
}

export function parseMarkdownBlocks(rawText: string, nowMs?: number): MarkdownBlock[] {
  const segments = parseMarkdownSegments(rawText)
  const blocks: MarkdownBlock[] = []
  const timestamp = nowMs ?? Date.now()

  for (const segment of segments) {
    const blockType = detectBlockType(segment.body, segment.header ?? undefined)
    const block: MarkdownBlock = {
      id: generateBlockId(),
      type: blockType,
      startLine: segment.startLine,
      endLine: segment.endLine,
      timestampMs: timestamp,
      header: segment.header ?? undefined,
      body: segment.body,
      tokens: segment.tokens,
      rawTranscript: segment.raw,
    }

    // Extract tracker data
    if (blockType === 'tracker') {
      const tracker = extractTrackerData(segment.body)
      if (tracker) {
        block.trackerKey = tracker.trackerKey
        block.trackerValue = tracker.trackerValue
      }
    }

    // Extract child tasks from event/note blocks
    if (blockType === 'event' || blockType === 'note' || blockType === 'segment') {
      const childTasks = extractTasksFromBody(segment.body)
      if (childTasks.length > 0) {
        block.children = childTasks
      }
    }

    blocks.push(block)
  }

  return blocks
}

export function splitTextIntoBlocks(text: string): string[] {
  // Split on horizontal dividers (---, ***, ___)
  return text.split(/\n\s*(?:-{3,}|\*{3,}|_{3,})\s*\n/).map(b => b.trim()).filter(Boolean)
}

export function formatBlocksAsMarkdown(blocks: MarkdownBlock[]): string {
  return blocks.map((block, idx) => {
    let output = ''
    if (block.header) {
      output += `::${block.type}`
      if (block.header.category) {
        output += ` ${block.header.category}`
        if (block.header.subcategory) output += `/${block.header.subcategory}`
      }
      if (block.header.title) output += ` "${block.header.title}"`
      output += '\n'
    }
    output += block.body
    if (idx < blocks.length - 1) output += '\n\n---\n\n'
    return output
  }).join('')
}
