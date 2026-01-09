// JavaScript port of the Insight markdown parser (from schema.ts)

const DIVIDER_RE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/
const HEADER_RE = /^::([a-zA-Z][\w-]*)(?:\s+(.*))?$/
const BRACKET_RE = /\[([^\]]+)\]/g
const TRACKER_TOKEN_RE = /#([a-zA-Z][\w-]*)\s*(?:\(([^)]+)\)|:\s*([0-9]+(?:\.[0-9]+)?))/g
const TRACKER_INTENT_RE = /#(mood|energy|stress|pain|anxiety|focus|motivation)\s*(?:\((\d+)\)|:\s*(\d+))/gi
const TRACKER_CLAMP_KEYS = new Set(['mood', 'energy', 'stress', 'pain', 'anxiety', 'focus', 'motivation'])

function uniq(values) {
  return Array.from(new Set(values.filter(Boolean)))
}

function stripFrontmatter(raw) {
  const lines = raw.split(/\r?\n/)
  if ((lines[0] ?? '').trim() !== '---') return { frontmatter: null, body: raw }
  const endIdx = lines.slice(1).findIndex((l) => l.trim() === '---')
  if (endIdx === -1) return { frontmatter: null, body: raw }
  const fm = lines.slice(1, endIdx + 1).join('\n')
  const body = lines.slice(endIdx + 2).join('\n')
  return { frontmatter: fm, body }
}

function parseBracketProps(raw) {
  const props = {}
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

function stripBracketProps(raw) {
  return raw.replace(BRACKET_RE, ' ').replace(/\s+/g, ' ').trim()
}

function extractInlineTokens(text) {
  const tokens = []
  const add = (type, raw, value, index, trackerValue) => {
    if (!value) return
    tokens.push({ type, raw, value, trackerValue, index })
  }

  for (const m of text.matchAll(TRACKER_TOKEN_RE)) {
    const key = (m[1] ?? '').toLowerCase()
    const rawValue = m[2] ?? m[3] ?? ''
    if (!key || !rawValue) continue
    const numValue = Number(rawValue)
    const value = Number.isFinite(numValue)
      ? TRACKER_CLAMP_KEYS.has(key) ? Math.min(10, Math.max(1, numValue)) : numValue
      : rawValue
    add('tracker', m[0], key, m.index ?? 0, value)
  }

  for (const m of text.matchAll(/(^|[\s(])#([a-zA-Z][\w/-]*)/g)) {
    add('tag', `#${m[2]}`, m[2], m.index ?? 0)
  }

  for (const m of text.matchAll(/(^|[\s(])!([a-zA-Z][\w/-]*)/g)) {
    add('place', `!${m[2]}`, m[2], m.index ?? 0)
  }

  for (const m of text.matchAll(/(^|[\s(])\+([a-zA-Z][\w/-]*)/g)) {
    add('context', `+${m[2]}`, m[2], m.index ?? 0)
  }
  for (const m of text.matchAll(/(^|[\s(])\*([a-zA-Z][\w/-]*)(?!\*)/g)) {
    add('context', `*${m[2]}`, m[2], m.index ?? 0)
  }

  for (const m of text.matchAll(/(^|[\s(])@(?:"([^"]+)"|'([^']+)'|([A-Za-z][\w'\u2019-]*(?:\s+[A-Za-z][\w'\u2019-]*){0,3}))/g)) {
    const raw = (m[2] ?? m[3] ?? m[4] ?? '').trim()
    if (!raw) continue
    add('person', `@${raw}`, raw, m.index ?? 0)
  }

  return tokens
}

function extractInlineTokenStrings(text) {
  return uniq(extractInlineTokens(text).map((t) => t.raw))
}

function toTokenCollections(tokens) {
  return {
    tags: uniq(tokens.filter((t) => t.type === 'tag').map((t) => t.value)),
    people: uniq(tokens.filter((t) => t.type === 'person').map((t) => t.value)),
    contexts: uniq(tokens.filter((t) => t.type === 'context').map((t) => t.value)),
    places: uniq(tokens.filter((t) => t.type === 'place').map((t) => t.value)),
    trackers: tokens
      .filter((t) => t.type === 'tracker' && t.trackerValue !== undefined)
      .map((t) => ({ key: t.value, value: t.trackerValue })),
  }
}

function stripTokens(raw) {
  return raw
    .replace(/(^|[\s(])[#@!*+][a-zA-Z][\w/'\u2019-]*(?:\s+[A-Za-z][\w'\u2019-]*){0,3}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseHeaderTitleAndCategory(raw) {
  let working = raw.trim()
  let title = null
  let category = null
  let subcategory = null

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

function parseSegmentHeader(line) {
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

function parseMarkdownSegments(rawText) {
  const { body } = stripFrontmatter(rawText)
  const lines = body.split(/\r?\n/)
  const segments = []
  let current = { startLine: 0, lines: [] }

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
    let header = null
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
    const tokens = {
      tags: uniq([...headerTokens.tags, ...bodyTokens.filter((t) => t.type === 'tag').map((t) => t.value)]),
      people: uniq([...headerTokens.people, ...bodyTokens.filter((t) => t.type === 'person').map((t) => t.value)]),
      contexts: uniq([...headerTokens.contexts, ...bodyTokens.filter((t) => t.type === 'context').map((t) => t.value)]),
      places: uniq([...headerTokens.places, ...bodyTokens.filter((t) => t.type === 'place').map((t) => t.value)]),
      trackers: [
        ...headerTokens.trackers,
        ...bodyTokens
          .filter((t) => t.type === 'tracker' && t.trackerValue !== undefined)
          .map((t) => ({ key: t.value, value: t.trackerValue })),
      ],
    }
    const startLine = segment.startLine + 1
    const endLine = segment.startLine + segment.lines.length
    return { header, body: bodyStr, raw, startLine, endLine, tokens }
  })
}

function collectMarkdownTokens(rawText) {
  const segments = parseMarkdownSegments(rawText)
  const tags = []
  const people = []
  const contexts = []
  const places = []
  const trackers = []
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

function extractTasks(rawText) {
  const tasks = []
  const lines = rawText.split(/\r?\n/)
  lines.forEach((line, idx) => {
    const match = line.match(/^[-*]\s*\[([ xX])\]\s*(.+)$/)
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

function detectIntent(text) {
  const lower = text.toLowerCase()

  if (/(i'm |im |i am |currently |right now|starting|began|begin)/i.test(lower) &&
      /(doing|working|driving|at|going to|eating|exercising|starting)/i.test(lower)) {
    return {
      type: 'start_event',
      confidence: 0.85,
      metadata: { immediate: true },
    }
  }

  if (/(finished|done|stopped|ended|completed|wrapping up|just finished)/i.test(lower)) {
    return { type: 'stop_event', confidence: 0.85, metadata: {} }
  }

  if (/(later|tomorrow|tonight|next|at \d|from \d|gonna|going to|will be|plan to)/i.test(lower) &&
      !(/(right now|currently)/i.test(lower))) {
    return { type: 'schedule_event', confidence: 0.7, metadata: {} }
  }

  TRACKER_INTENT_RE.lastIndex = 0
  if (/(feeling|mood|energy|pain|stress|anxious|tired|motivated)/i.test(lower) ||
      TRACKER_INTENT_RE.test(text)) {
    return { type: 'log_tracker', confidence: 0.8, metadata: {} }
  }

  if (/(need to|have to|should|must|remember to|don't forget|todo|task)/i.test(lower)) {
    return { type: 'create_task', confidence: 0.75, metadata: {} }
  }

  return { type: 'unknown', confidence: 0.3, metadata: {} }
}

function autoCategorize(text) {
  const lower = text.toLowerCase()

  if (/(driving|car|commute|traffic|road|highway|uber|lyft)/i.test(lower)) {
    return { category: 'Transport', subcategory: 'Driving' }
  }
  if (/(walking|walk|stroll|hike)/i.test(lower)) {
    return { category: 'Transport', subcategory: 'Walking' }
  }
  if (/(bike|cycling|bicycle)/i.test(lower)) {
    return { category: 'Transport', subcategory: 'Cycling' }
  }

  if (/(work|office|meeting|email|call|presentation|client)/i.test(lower)) {
    if (/(meeting|call|zoom|teams)/i.test(lower)) {
      return { category: 'Work', subcategory: 'Meeting' }
    }
    if (/(email|inbox|reply)/i.test(lower)) {
      return { category: 'Work', subcategory: 'Email' }
    }
    return { category: 'Work', subcategory: null }
  }

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

  if (/(study|learn|read|course|class|lecture|tutorial)/i.test(lower)) {
    return { category: 'Learning', subcategory: null }
  }

  if (/(relax|rest|sleep|nap|tv|movie|game|hobby)/i.test(lower)) {
    return { category: 'Personal', subcategory: null }
  }

  if (/(friends|family|party|hangout|date|dinner with)/i.test(lower)) {
    return { category: 'Social', subcategory: null }
  }

  return { category: null, subcategory: null }
}

function parseCapture(rawText, nowMs) {
  const segments = parseMarkdownSegments(rawText)
  const tokens = collectMarkdownTokens(rawText)
  const timestamp = Number.isFinite(nowMs) ? nowMs : Date.now()

  let activeEvent = null
  const futureEvents = []
  const tasks = []
  const trackerLogs = []

  segments.forEach((segment, idx) => {
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
          scheduledTime: segment.header.props.start || null,
          category: segment.header.category,
          subcategory: segment.header.subcategory,
        })
      }
    }

    const segmentTasks = extractTasks(segment.body)
    segmentTasks.forEach((task) => {
      tasks.push({
        title: task.title,
        completed: task.completed,
        estimate: null,
        parentSegment: idx,
      })
    })

    segment.tokens.trackers.forEach((tracker) => {
      trackerLogs.push({
        key: tracker.key,
        value: tracker.value,
        timestamp,
      })
    })
  })

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

function formatSegmentsPreview(segments) {
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
