/**
 * Markdown Schema + Parser for InSight Mobile
 *
 * Token Map:
 * - #tag → category/label
 * - @person → people (supports quotes: @"Dr. Smith")
 * - +context or *context → context (car, office, etc.)
 * - !place → location
 * - #tracker(value) → mood(7), stress(5), etc.
 *
 * Segment Structure:
 * - Divider: --- / *** / ___ splits segments
 * - Header: ::type [category/subcategory] "Title" #tag @person +context !place [key=value]
 * - Body: normal markdown; tokens inside the body are merged into the segment tokens
 */

export type MarkdownTokenType = 'tag' | 'person' | 'context' | 'place' | 'tracker'

export type MarkdownToken = {
  type: MarkdownTokenType
  raw: string
  value: string
  trackerValue?: number | string
  index: number
}

export type MarkdownTokenCollections = {
  tags: string[]
  people: string[]
  contexts: string[]
  places: string[]
  trackers: Array<{ key: string; value: number | string }>
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

export type ParsedCapture = {
  segments: MarkdownSegment[]
  tokens: MarkdownTokenCollections
  activeEvent: {
    type: string
    title: string
    category: string | null
    subcategory: string | null
    contexts: string[]
  } | null
  futureEvents: Array<{
    type: string
    title: string
    scheduledTime: string | null
    category: string | null
    subcategory: string | null
  }>
  tasks: Array<{
    title: string
    completed: boolean
    estimate: string | null
    parentSegment: number
  }>
  trackerLogs: Array<{
    key: string
    value: number | string
    timestamp: number
  }>
}

// Regex patterns
const DIVIDER_RE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/
const HEADER_RE = /^::([a-zA-Z][\w-]*)(?:\s+(.*))?$/
const BRACKET_RE = /\[([^\]]+)\]/g
const TRACKER_RE = /#([a-zA-Z][\w-]*)\(([^)]+)\)/g
const TRACKER_BRACKET_RE = /#([a-zA-Z][\w-]*)\[([^\]]+)\]/g
const TASK_RE = /^(\s*)-\s*\[([ xX])\]\s*(.+)$/gm

function uniq<T>(values: T[]): T[] {
  return Array.from(new Set(values.filter(Boolean)))
}

function stripFrontmatter(raw: string): { frontmatter: string | null; body: string } {
  const lines = raw.split(/\r?\n/)
  if ((lines[0] ?? '').trim() !== '---') return { frontmatter: null, body: raw }
  const endIdx = lines.slice(1).findIndex((l) => l.trim() === '---')
  if (endIdx === -1) return { frontmatter: null, body: raw }
  const fm = lines.slice(1, endIdx + 1).join('\n')
  const body = lines.slice(endIdx + 2).join('\n')
  return { frontmatter: fm, body }
}

function parseBracketProps(raw: string): Record<string, string | number | boolean> {
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

function stripBracketProps(raw: string): string {
  return raw.replace(BRACKET_RE, ' ').replace(/\s+/g, ' ').trim()
}

export function extractInlineTokens(text: string): MarkdownToken[] {
  const tokens: MarkdownToken[] = []
  const add = (type: MarkdownTokenType, raw: string, value: string, index: number, trackerValue?: number | string) => {
    if (!value) return
    tokens.push({ type, raw, value, trackerValue, index })
  }

  // Extract tracker tokens with values: #mood(7), #mood[7], #stress(5)
  for (const m of text.matchAll(TRACKER_RE)) {
    const key = m[1]
    const rawValue = m[2]
    const numValue = Number(rawValue)
    const value = Number.isFinite(numValue) ? numValue : rawValue
    add('tracker', `#${key}(${rawValue})`, key, m.index ?? 0, value)
  }
  for (const m of text.matchAll(TRACKER_BRACKET_RE)) {
    const key = m[1]
    const rawValue = m[2]
    const numValue = Number(rawValue)
    const value = Number.isFinite(numValue) ? numValue : rawValue
    add('tracker', `#${key}[${rawValue}]`, key, m.index ?? 0, value)
  }

  // Extract regular tags (excluding tracker tokens)
  const textWithoutTrackers = text.replace(TRACKER_RE, ' ').replace(TRACKER_BRACKET_RE, ' ')
  for (const m of textWithoutTrackers.matchAll(/(^|[\s(])#([a-zA-Z][\w/-]*)/g)) {
    add('tag', `#${m[2]}`, m[2], m.index ?? 0)
  }

  // Extract places: !place
  for (const m of text.matchAll(/(^|[\s(])!([a-zA-Z][\w/-]*)/g)) {
    add('place', `!${m[2]}`, m[2], m.index ?? 0)
  }

  // Extract contexts: +context or *context
  for (const m of text.matchAll(/(^|[\s(])\+([a-zA-Z][\w/-]*)/g)) {
    add('context', `+${m[2]}`, m[2], m.index ?? 0)
  }
  for (const m of text.matchAll(/(^|[\s(])\*([a-zA-Z][\w/-]*)(?!\*)/g)) {
    add('context', `*${m[2]}`, m[2], m.index ?? 0)
  }

  // Extract people: @person or @"Full Name"
  for (const m of text.matchAll(/(^|[\s(])@(?:"([^"]+)"|'([^']+)'|([A-Za-z][\w''-]*(?:\s+[A-Za-z][\w''-]*){0,3}))/g)) {
    const raw = (m[2] ?? m[3] ?? m[4] ?? '').trim()
    if (!raw) continue
    add('person', `@${raw}`, raw, m.index ?? 0)
  }

  return tokens
}

export function extractInlineTokenStrings(text: string): string[] {
  return uniq(extractInlineTokens(text).map((t) => t.raw))
}

export function toTokenCollections(tokens: MarkdownToken[]): MarkdownTokenCollections {
  return {
    tags: uniq(tokens.filter((t) => t.type === 'tag').map((t) => t.value)),
    people: uniq(tokens.filter((t) => t.type === 'person').map((t) => t.value)),
    contexts: uniq(tokens.filter((t) => t.type === 'context').map((t) => t.value)),
    places: uniq(tokens.filter((t) => t.type === 'place').map((t) => t.value)),
    trackers: tokens
      .filter((t) => t.type === 'tracker' && t.trackerValue !== undefined)
      .map((t) => ({ key: t.value, value: t.trackerValue as number | string })),
  }
}

function stripTokens(raw: string): string {
  return raw
    .replace(TRACKER_RE, ' ')
    .replace(TRACKER_BRACKET_RE, ' ')
    .replace(/(^|[\s(])[#@!*+][a-zA-Z][\w/''-]*(?:\s+[A-Za-z][\w''-]*){0,3}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseHeaderTitleAndCategory(raw: string): { title: string | null; category: string | null; subcategory: string | null } {
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
    const bodyStr = bodyLines.join('\n').trimEnd()
    const bodyTokens = extractInlineTokens(bodyStr)
    const headerTokens = header ? header.tokens : { tags: [], people: [], contexts: [], places: [], trackers: [] }
    const tokens: MarkdownTokenCollections = {
      tags: uniq([...headerTokens.tags, ...bodyTokens.filter((t) => t.type === 'tag').map((t) => t.value)]),
      people: uniq([...headerTokens.people, ...bodyTokens.filter((t) => t.type === 'person').map((t) => t.value)]),
      contexts: uniq([...headerTokens.contexts, ...bodyTokens.filter((t) => t.type === 'context').map((t) => t.value)]),
      places: uniq([...headerTokens.places, ...bodyTokens.filter((t) => t.type === 'place').map((t) => t.value)]),
      trackers: [
        ...headerTokens.trackers,
        ...bodyTokens
          .filter((t) => t.type === 'tracker' && t.trackerValue !== undefined)
          .map((t) => ({ key: t.value, value: t.trackerValue as number | string })),
      ],
    }
    const startLine = segment.startLine + 1
    const endLine = segment.startLine + segment.lines.length
    return { header, body: bodyStr, raw, startLine, endLine, tokens }
  })
}

export function collectMarkdownTokens(rawText: string): MarkdownTokenCollections {
  const segments = parseMarkdownSegments(rawText)
  const tags: string[] = []
  const people: string[] = []
  const contexts: string[] = []
  const places: string[] = []
  const trackers: Array<{ key: string; value: number | string }> = []
  for (const seg of segments) {
    tags.push(...seg.tokens.tags)
    people.push(...seg.tokens.people)
    contexts.push(...seg.tokens.contexts)
    places.push(...seg.tokens.places)
    trackers.push(...seg.tokens.trackers)
  }
  return {
    tags: uniq(tags),
    people: uniq(people),
    contexts: uniq(contexts),
    places: uniq(places),
    trackers,
  }
}

/**
 * Extract tasks from markdown text (checkbox format)
 * - [ ] Task text
 * - [x] Completed task
 */
export function extractTasks(rawText: string): Array<{ title: string; completed: boolean; line: number }> {
  const tasks: Array<{ title: string; completed: boolean; line: number }> = []
  const lines = rawText.split(/\r?\n/)

  lines.forEach((line, idx) => {
    const match = line.match(/^\s*-\s*\[([ xX])\]\s*(.+)$/)
    if (match) {
      tasks.push({
        title: match[2].trim(),
        completed: match[1].toLowerCase() === 'x',
        line: idx + 1,
      })
    }
  })

  return tasks
}

/**
 * Detect intent from natural language text
 */
export function detectIntent(text: string): {
  type: 'start_event' | 'stop_event' | 'add_note' | 'log_tracker' | 'create_task' | 'schedule_event' | 'unknown'
  confidence: number
  metadata: Record<string, string | number | boolean>
} {
  const lower = text.toLowerCase()

  // Start event patterns
  if (/(i'm |im |i am |currently |right now|starting|began|begin)/i.test(lower) &&
      /(doing|working|driving|at|going to|eating|exercising|starting)/i.test(lower)) {
    return {
      type: 'start_event',
      confidence: 0.85,
      metadata: { immediate: true },
    }
  }

  // Stop event patterns
  if (/(finished|done|stopped|ended|completed|wrapping up|just finished)/i.test(lower)) {
    return {
      type: 'stop_event',
      confidence: 0.85,
      metadata: {},
    }
  }

  // Schedule event patterns (future)
  if (/(later|tomorrow|tonight|next|at \d|from \d|gonna|going to|will be|plan to)/i.test(lower) &&
      !(/(right now|currently)/i.test(lower))) {
    return {
      type: 'schedule_event',
      confidence: 0.7,
      metadata: {},
    }
  }

  // Tracker patterns
  if (
    /(feeling|mood|energy|pain|stress|anxious|tired|motivated)/i.test(lower) ||
    TRACKER_RE.test(text) ||
    TRACKER_BRACKET_RE.test(text)
  ) {
    return {
      type: 'log_tracker',
      confidence: 0.8,
      metadata: {},
    }
  }

  // Task patterns
  if (/(need to|have to|should|must|remember to|don't forget|todo|task)/i.test(lower)) {
    return {
      type: 'create_task',
      confidence: 0.75,
      metadata: {},
    }
  }

  return {
    type: 'unknown',
    confidence: 0.3,
    metadata: {},
  }
}

/**
 * Auto-categorize text based on keywords
 */
export function autoCategorize(text: string): { category: string | null; subcategory: string | null } {
  const lower = text.toLowerCase()

  // Transport
  if (/(driving|car|commute|traffic|road|highway|uber|lyft)/i.test(lower)) {
    return { category: 'Transport', subcategory: 'Driving' }
  }
  if (/(walking|walk|stroll|hike)/i.test(lower)) {
    return { category: 'Transport', subcategory: 'Walking' }
  }
  if (/(bike|cycling|bicycle)/i.test(lower)) {
    return { category: 'Transport', subcategory: 'Cycling' }
  }

  // Work
  if (/(work|office|meeting|email|call|presentation|client)/i.test(lower)) {
    if (/(meeting|call|zoom|teams)/i.test(lower)) {
      return { category: 'Work', subcategory: 'Meeting' }
    }
    if (/(email|inbox|reply)/i.test(lower)) {
      return { category: 'Work', subcategory: 'Email' }
    }
    return { category: 'Work', subcategory: null }
  }

  // Health & Fitness
  if (/(gym|workout|exercise|lift|run|cardio|yoga|stretch)/i.test(lower)) {
    if (/(cardio|run|treadmill|elliptical)/i.test(lower)) {
      return { category: 'Health', subcategory: 'Cardio' }
    }
    if (/(lift|strength|weights|bench|squat)/i.test(lower)) {
      return { category: 'Health', subcategory: 'Strength' }
    }
    if (/(yoga|stretch|mobility)/i.test(lower)) {
      return { category: 'Health', subcategory: 'Mobility' }
    }
    return { category: 'Health', subcategory: 'Workout' }
  }

  // Food
  if (/(eating|breakfast|lunch|dinner|snack|meal|food|restaurant)/i.test(lower)) {
    if (/(breakfast|morning)/i.test(lower)) {
      return { category: 'Food', subcategory: 'Breakfast' }
    }
    if (/(lunch|noon)/i.test(lower)) {
      return { category: 'Food', subcategory: 'Lunch' }
    }
    if (/(dinner|evening)/i.test(lower)) {
      return { category: 'Food', subcategory: 'Dinner' }
    }
    return { category: 'Food', subcategory: null }
  }

  // Learning
  if (/(study|learn|read|course|class|lecture|tutorial)/i.test(lower)) {
    return { category: 'Learning', subcategory: null }
  }

  // Personal
  if (/(relax|rest|sleep|nap|tv|movie|game|hobby)/i.test(lower)) {
    return { category: 'Personal', subcategory: null }
  }

  // Social
  if (/(friends|family|party|hangout|date|dinner with)/i.test(lower)) {
    return { category: 'Social', subcategory: null }
  }

  return { category: null, subcategory: null }
}

/**
 * Parse a full capture into structured data
 */
export function parseCapture(rawText: string): ParsedCapture {
  const segments = parseMarkdownSegments(rawText)
  const tokens = collectMarkdownTokens(rawText)

  let activeEvent: ParsedCapture['activeEvent'] = null
  const futureEvents: ParsedCapture['futureEvents'] = []
  const tasks: ParsedCapture['tasks'] = []
  const trackerLogs: ParsedCapture['trackerLogs'] = []

  // Process segments to extract structured data
  segments.forEach((segment, idx) => {
    // Check for active event indicators
    if (segment.header?.type === 'event') {
      const intent = detectIntent(segment.body || segment.header.title || '')
      if (intent.type === 'start_event' || intent.metadata.immediate) {
        activeEvent = {
          type: segment.header.type,
          title: segment.header.title || 'Untitled Event',
          category: segment.header.category,
          subcategory: segment.header.subcategory,
          contexts: segment.tokens.contexts,
        }
      } else if (intent.type === 'schedule_event') {
        futureEvents.push({
          type: segment.header.type,
          title: segment.header.title || 'Untitled Event',
          scheduledTime: segment.header.props.start as string || null,
          category: segment.header.category,
          subcategory: segment.header.subcategory,
        })
      }
    }

    // Extract tasks from segment body
    const segmentTasks = extractTasks(segment.body)
    segmentTasks.forEach((task) => {
      tasks.push({
        title: task.title,
        completed: task.completed,
        estimate: null,
        parentSegment: idx,
      })
    })

    // Log trackers
    segment.tokens.trackers.forEach((tracker) => {
      trackerLogs.push({
        key: tracker.key,
        value: tracker.value,
        timestamp: Date.now(),
      })
    })
  })

  // If no explicit active event, try to detect from raw text
  if (!activeEvent) {
    const intent = detectIntent(rawText)
    if (intent.type === 'start_event') {
      const { category, subcategory } = autoCategorize(rawText)
      activeEvent = {
        type: 'event',
        title: 'Auto-detected Event',
        category,
        subcategory,
        contexts: tokens.contexts,
      }
    }
  }

  return {
    segments,
    tokens,
    activeEvent,
    futureEvents,
    tasks,
    trackerLogs,
  }
}

/**
 * Format segments for display preview
 */
export function formatSegmentsPreview(segments: MarkdownSegment[]): string {
  return segments.map((seg, idx) => {
    const header = seg.header
      ? `[${seg.header.type.toUpperCase()}] ${seg.header.category || ''}${seg.header.subcategory ? '/' + seg.header.subcategory : ''} "${seg.header.title || ''}"`
      : `[SEGMENT ${idx + 1}]`
    const tokens = [
      ...seg.tokens.tags.map((t) => `#${t}`),
      ...seg.tokens.people.map((p) => `@${p}`),
      ...seg.tokens.contexts.map((c) => `+${c}`),
      ...seg.tokens.places.map((p) => `!${p}`),
      ...seg.tokens.trackers.map((t) => `#${t.key}(${t.value})`),
    ].join(' ')
    return `${header}\n${tokens ? `  ${tokens}` : ''}\n${seg.body.slice(0, 100)}${seg.body.length > 100 ? '...' : ''}`
  }).join('\n---\n')
}
