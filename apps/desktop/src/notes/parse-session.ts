import { parseCaptureNatural, parseCaptureWithBlocks } from '../nlp/natural'
import { parseMealFromText } from '../storage/nutrition'
import { parseWorkoutFromText } from '../storage/workouts'
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
    const mm = cleaned.slice(1)
    if (Number(mm) < 60) {
      const hh = `0${cleaned.slice(0, 1)}`
      return `${hh}:${mm}`
    }
    const hhAlt = Number(cleaned.slice(0, 2))
    const mmAlt = cleaned.slice(2)
    if (Number.isFinite(hhAlt) && hhAlt < 24) return `${String(hhAlt).padStart(2, '0')}:${mmAlt.padStart(2, '0')}`
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

type TableColumn = { key: string; label: string; align?: 'left' | 'right' }

function formatTitleCase(raw: string) {
  if (!raw) return ''
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

function formatNumber(value: number | null | undefined, decimals = 0) {
  if (value == null || !Number.isFinite(value)) return ''
  return decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString()
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds)) return ''
  const mins = Math.round(seconds / 60)
  if (mins <= 0) return ''
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  const rem = mins % 60
  return rem ? `${hours}h ${rem}m` : `${hours}h`
}

function formatDistance(miles: number | null | undefined) {
  if (miles == null || !Number.isFinite(miles)) return ''
  if (miles < 0.1) return ''
  const rounded = miles < 10 ? miles.toFixed(1) : Math.round(miles).toString()
  return `${rounded} mi`
}

function formatRange(values: Array<number | null | undefined>, decimals = 0) {
  const cleaned = values.filter((value): value is number => value != null && Number.isFinite(value))
  if (!cleaned.length) return ''
  const min = Math.min(...cleaned)
  const max = Math.max(...cleaned)
  const format = (value: number) => (decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString())
  if (min === max) return format(min)
  return `${format(min)}-${format(max)}`
}

function buildAsciiTable(columns: TableColumn[], rows: Array<Record<string, string>>, footerRows?: Array<Record<string, string>>) {
  if (!rows.length) return []
  const widths = columns.map((col) => col.label.length)
  const allRows = footerRows?.length ? [...rows, ...footerRows] : rows
  allRows.forEach((row) => {
    columns.forEach((col, idx) => {
      const value = row[col.key] ?? ''
      widths[idx] = Math.max(widths[idx], value.length)
    })
  })
  const border = `+${widths.map((w) => '-'.repeat(w + 2)).join('+')}+`
  const formatRow = (row: Record<string, string>) =>
    `|${columns
      .map((col, idx) => {
        const raw = row[col.key] ?? ''
        const pad = widths[idx] - raw.length
        const aligned = col.align === 'right' ? `${' '.repeat(pad)}${raw}` : `${raw}${' '.repeat(pad)}`
        return ` ${aligned} `
      })
      .join('|')}|`
  const lines = [border, formatRow(Object.fromEntries(columns.map((col) => [col.key, col.label]))), border]
  rows.forEach((row) => lines.push(formatRow(row)))
  if (footerRows?.length) {
    lines.push(border)
    footerRows.forEach((row) => lines.push(formatRow(row)))
  }
  lines.push(border)
  return lines
}

function buildMealTableLines(meal: NonNullable<ReturnType<typeof parseMealFromText>>) {
  const items = meal.items ?? []
  const columns: TableColumn[] = [
    { key: 'item', label: 'Item' },
    { key: 'notes', label: 'Notes' },
    { key: 'calories', label: 'Calories', align: 'right' },
    { key: 'protein', label: 'Protein g', align: 'right' },
    { key: 'carbs', label: 'Carbs g', align: 'right' },
    { key: 'fat', label: 'Fat g', align: 'right' },
    { key: 'fiber', label: 'Fiber g', align: 'right' },
    { key: 'sodium', label: 'Sodium mg', align: 'right' },
  ]
  const rows = items.map((item) => {
    const qty = item.quantity != null ? formatNumber(item.quantity, item.quantity % 1 === 0 ? 0 : 1) : ''
    const unit = item.unit ?? ''
    const notes = [qty && unit ? `${qty} ${unit}` : qty || unit, item.notes].filter(Boolean).join(', ')
    return {
      item: item.name ?? 'Item',
      notes,
      calories: formatNumber(item.calories),
      protein: formatNumber(item.protein),
      carbs: formatNumber(item.carbs),
      fat: formatNumber(item.fat),
      fiber: formatNumber(item.fiber),
      sodium: formatNumber(item.sodium),
    }
  })
  const sumField = (key: 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'sodium') => {
    let total = 0
    let has = false
    items.forEach((item) => {
      const value = item[key]
      if (typeof value === 'number' && Number.isFinite(value)) {
        total += value
        has = true
      }
    })
    return has ? total : null
  }
  const totalCalories = meal.totalCalories ?? sumField('calories')
  const totalMacros = meal.macros ?? {
    protein: sumField('protein') ?? 0,
    carbs: sumField('carbs') ?? 0,
    fat: sumField('fat') ?? 0,
    fiber: sumField('fiber') ?? undefined,
    sodium: sumField('sodium') ?? undefined,
  }
  const totalRow = {
    item: 'TOTAL',
    notes: '',
    calories: formatNumber(totalCalories ?? undefined),
    protein: formatNumber(totalMacros.protein ?? undefined),
    carbs: formatNumber(totalMacros.carbs ?? undefined),
    fat: formatNumber(totalMacros.fat ?? undefined),
    fiber: formatNumber(totalMacros.fiber ?? undefined),
    sodium: formatNumber(totalMacros.sodium ?? undefined),
  }
  return buildAsciiTable(columns, rows, [totalRow])
}

function buildWorkoutTableLines(workout: NonNullable<ReturnType<typeof parseWorkoutFromText>>) {
  const exercises = workout.exercises ?? []
  const columns: TableColumn[] = [
    { key: 'exercise', label: 'Exercise' },
    { key: 'sets', label: 'Sets', align: 'right' },
    { key: 'reps', label: 'Reps', align: 'right' },
    { key: 'weight', label: 'Weight', align: 'right' },
    { key: 'distance', label: 'Distance', align: 'right' },
    { key: 'duration', label: 'Duration', align: 'right' },
    { key: 'rpe', label: 'RPE', align: 'right' },
  ]
  const rows = exercises.map((exercise) => {
    const sets = exercise.sets ?? []
    const repsValues = sets.map((set) => set.reps)
    const weightValues = sets.map((set) => set.weight)
    const distanceTotal = sets.reduce((sum, set) => sum + (set.distance ?? 0), 0)
    const durationTotal = sets.reduce((sum, set) => sum + (set.duration ?? 0), 0)
    const rpeValues = sets.map((set) => set.rpe)
    const rpeValue = rpeValues.filter((value): value is number => value != null && Number.isFinite(value))
    const rpe =
      rpeValue.length > 0
        ? Math.round(rpeValue.reduce((sum, value) => sum + value, 0) / rpeValue.length).toString()
        : workout.overallRpe != null
          ? Math.round(workout.overallRpe).toString()
          : ''
    return {
      exercise: exercise.name ?? 'Exercise',
      sets: sets.length ? `${sets.length}` : '',
      reps: formatRange(repsValues),
      weight: formatRange(weightValues),
      distance: formatDistance(distanceTotal),
      duration: formatDuration(durationTotal),
      rpe,
    }
  })
  return buildAsciiTable(columns, rows)
}

function expandInlineTimestampLines(rawText: string) {
  const baseLines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const atPattern = /\bAt\s+(\d{1,2}:\d{2}|\d{3,4}|\d{1,2}[,]\d{2}|\d{1,2}\s+\d{2})(?:\s*[ap]m)?\b/gi
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
  const timePattern = /^(?:⏱\s*)?(?:at\s+)?(\d{1,2}:\d{2}|\d{3,4}|\d{1,2}[,]\d{2}|\d{1,2}\s+\d{2})(?:\s*[ap]m)?\s*(?:[-–—:]|\s+)\s*(.+)$/i
  const bracketPattern = /^\[(\d{1,2}:\d{2}|\d{3,4}|\d{1,2}[,]\d{2}|\d{1,2}\s+\d{2})\]\s*(.+)$/
  const defaultTime = formatTimeLabel(anchorMs)

  for (const rawLine of lines) {
    const trimmed = rawLine.trim()
    if (!trimmed || /^[-*_]{3,}$/.test(trimmed)) continue
    if (
      /^title\s*:/i.test(trimmed) ||
      /^date\s*:/i.test(trimmed) ||
      /^created\s*:/i.test(trimmed) ||
      /^type\s*:/i.test(trimmed) ||
      /^source\s*:/i.test(trimmed) ||
      /^updated\s*:/i.test(trimmed)
    ) {
      continue
    }
    if (/^entry\s*\(/i.test(trimmed)) continue
    if (!current && /^#+\s*\S+/.test(trimmed)) continue
    const cleaned = trimmed.replace(/^#+\s*/, '')
    const timeHeading = cleaned.match(/^time\s*:\s*([0-9:.,]+(?:\s+\d{2})?)(?:\s+(.*))?$/i)
    if (timeHeading) {
      const normalized = normalizeTimeToken(timeHeading[1])
      if (normalized) {
        if (current) entries.push(current)
        current = {
          time: normalized,
          headline: (timeHeading[2] ?? '').trim(),
          body: [],
          raw: trimmed,
        }
        continue
      }
    }
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

function isSectionHeading(line: string) {
  const trimmed = line.trim()
  if (!trimmed) return false
  if (/^###\s+/.test(trimmed)) return true
  if (/^entry\b/i.test(trimmed)) return true
  if (/^time\s*:/i.test(trimmed)) return true
  if (/^title\s*:/i.test(trimmed)) return true
  if (/^date\s*:/i.test(trimmed)) return true
  if (/^created\s*:/i.test(trimmed)) return true
  if (/^(notes|next actions|completed|trackers|working on|meal|workout)\b/i.test(trimmed)) return true
  return false
}

function isTableLine(line: string) {
  const trimmed = line.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('|')) return true
  if (trimmed.startsWith('+') && /-+/.test(trimmed)) return true
  return false
}

function findPreferredTokenLine(lines: string[]) {
  const headings = [
    '### Notes',
    '### Next actions',
    '### Completed',
    '### Trackers',
    'Notes',
    'Next actions',
    'Completed',
    'Trackers',
    'Working On',
    'Meal',
    'Workout',
  ]
  for (const heading of headings) {
    const idx = lines.findIndex((line) => line.trim().toLowerCase() === heading.toLowerCase())
    if (idx === -1) continue
    for (let i = idx + 1; i < lines.length; i += 1) {
      const line = lines[i] ?? ''
      if (!line.trim()) continue
      if (isSectionHeading(line) || /^\s*---\s*$/.test(line) || isTableLine(line)) break
      return i
    }
  }
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? ''
    if (!line.trim()) continue
    if (isSectionHeading(line) || /^\s*---\s*$/.test(line) || isTableLine(line)) continue
    return i
  }
  return -1
}

function appendInlineTokens(lines: string[], tokens: string[]) {
  if (!tokens.length) return
  const targetIdx = findPreferredTokenLine(lines)
  if (targetIdx === -1) {
    lines.push(tokens.join(' '))
    return
  }
  const existing = lines[targetIdx] ?? ''
  const missing = tokens.filter((token) => !existing.includes(token))
  if (!missing.length) return
  lines[targetIdx] = `${existing} ${missing.join(' ')}`.replace(/\s+/g, ' ').trim()
}

function appendTokensToLine(line: string, tokens: string[]) {
  if (!tokens.length) return line
  const missing = tokens.filter((token) => !line.includes(token))
  if (!missing.length) return line
  return `${line} ${missing.join(' ')}`.replace(/\s+/g, ' ').trim()
}

function isTemplateHeaderLine(line: string) {
  const trimmed = line.trim()
  if (!trimmed) return false
  if (/^title\s*:/i.test(trimmed)) return true
  if (/^date\s*:/i.test(trimmed)) return true
  if (/^created\s*:/i.test(trimmed)) return true
  if (/^type\s*:/i.test(trimmed)) return true
  if (/^source\s*:/i.test(trimmed)) return true
  if (/^updated\s*:/i.test(trimmed)) return true
  if (/^entry\s*\(outline style; chips woven into the lines\)/i.test(trimmed)) return true
  return false
}

function stripTemplateHeaderLines(lines: string[]) {
  return lines.filter((line) => !isTemplateHeaderLine(line))
}

function normalizeComparableText(raw: string) {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isLowSignalText(raw: string) {
  const cleaned = normalizeComparableText(raw)
  if (!cleaned) return true
  if (cleaned.length < 3) return true
  const words = cleaned.split(' ').filter(Boolean)
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
  ])
  const meaningful = words.filter((w) => !stop.has(w))
  if (meaningful.length === 0) return true
  if (meaningful.length === 1 && words.length >= 4) return true
  if (words.every((w) => stop.has(w))) return true
  if (words.length <= 2 && words.every((w) => stop.has(w))) return true
  if (cleaned === 'you know' || cleaned === 'i mean' || cleaned === 'like that') return true
  return false
}

function extractTimeFromEntryLine(line: string) {
  const match = line.match(/^time\s*:\s*(\d{1,2}:\d{2}|\d{3,4}|\d{1,2}[,]\d{2}|\d{1,2}\s+\d{2})/i)
  return normalizeTimeToken(match?.[1] ?? null)
}

function findEntryBlocks(lines: string[]) {
  const blocks: Array<{ time: string; start: number; end: number }> = []
  let current: { time: string; start: number } | null = null
  for (let i = 0; i < lines.length; i += 1) {
    const time = extractTimeFromEntryLine(lines[i] ?? '')
    if (!time) continue
    if (current) {
      blocks.push({ time: current.time, start: current.start, end: i })
    }
    current = { time, start: i }
  }
  if (current) {
    blocks.push({ time: current.time, start: current.start, end: lines.length })
  }
  return blocks
}

function mergeEntryBlock(lines: string[], block: { start: number; end: number }, entryLines: string[]) {
  const currentSlice = lines.slice(block.start, block.end)
  const existing = new Set(currentSlice.map((line) => line.trim()).filter(Boolean))
  const toAdd = entryLines.filter((line) => line.trim() && !existing.has(line.trim()))
  if (!toAdd.length) return { lines, changed: false }
  let insertAt = block.end
  for (let i = block.end - 1; i >= block.start; i -= 1) {
    const trimmed = (lines[i] ?? '').trim()
    if (!trimmed) continue
    if (trimmed === '---') {
      insertAt = i
    }
    break
  }
  const next = [...lines.slice(0, insertAt), ...toAdd, ...lines.slice(insertAt)]
  return { lines: next, changed: true }
}

function insertEntryBlock(lines: string[], entryLines: string[]) {
  if (!entryLines.length) return { lines, changed: false }
  const next = [...lines]
  const lastNonEmptyIdx = (() => {
    for (let i = next.length - 1; i >= 0; i -= 1) {
      if ((next[i] ?? '').trim() !== '') return i
    }
    return -1
  })()
  if (lastNonEmptyIdx >= 0) {
    const lastLine = next[lastNonEmptyIdx]!.trim()
    if (lastLine !== '---') {
      if (next.length && next[next.length - 1]?.trim() !== '') next.push('')
      next.push('---', '')
    } else if (next.length && next[next.length - 1]?.trim() !== '') {
      next.push('')
    }
  }
  next.push(...entryLines)
  return { lines: next, changed: true }
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
    raw = stripInlineTokens(raw)
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
    raw = stripInlineTokens(raw)
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

function stripInlineTokens(raw: string) {
  return raw.replace(/(^|[\s(])[#@+!][\w/-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function normalizeTaskTitle(raw: string) {
  return stripInlineTokens(raw)
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
      if (title && !isLowSignalText(title)) tasks.push({ title, status: 'todo' })
    })
  }
  const imperativeRe = /^\s*(?:call|text|email|buy|pick up|schedule|book|review|evaluate|finish|start)\b/i
  if (imperativeRe.test(text)) {
    splitTaskSegments(text).forEach((segment) => {
      const title = normalizeTaskTitle(segment)
      if (title && !isLowSignalText(title)) tasks.push({ title, status: 'todo' })
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
      if (title && !isLowSignalText(title)) tasks.push({ title, status: 'done' })
    })
  }
  return tasks
}

function extractNoteLines(text: string) {
  const notes: string[] = []
  const workedRe = /\bworked on\s+([^.;]+)/gi
  for (const match of text.matchAll(workedRe)) {
    const raw = (match[1] ?? '').trim()
    if (raw && !isLowSignalText(raw)) notes.push(`Worked on ${raw}`)
  }
  if (notes.length) return notes.filter((line) => !isLowSignalText(line))

  const narrative = extractNarrativeSentences(text)
  if (narrative.length) return narrative
  return notes
}

function extractNarrativeSentences(text: string) {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return []
  const sentences = cleaned.split(/(?<=[.!?])\s+/)
  const lines: string[] = []
  for (const sentenceRaw of sentences) {
    let sentence = sentenceRaw.replace(/[.!?]+$/, '').trim()
    if (!sentence) continue
    if (/^pending notes\b/i.test(sentence)) continue
    sentence = sentence.replace(/^i said[:,]?\s*/i, '').trim()
    if (!sentence) continue
    if (/^make this\b/i.test(sentence)) continue
    if (!isLowSignalText(sentence)) {
      lines.push(sentence)
    }
    if (lines.length >= 6) break
  }
  return lines
}

function extractMediaActivity(text: string) {
  const lower = text.toLowerCase()
  const watchMatch = text.match(/\bwatch(?:ing|ed)?\s+([^.;]+)/i)
  if (watchMatch?.[1]) {
    let title = watchMatch[1]
    title = title.replace(/\b(right now|currently|just|at the moment)\b.*$/i, '').trim()
    title = title.replace(/\b(episode|ep|season)\b.*$/i, '').trim()
    title = title.replace(/\s{2,}/g, ' ').trim()
    if (title) return { label: `Watching ${title}`.trim(), kind: 'watch', title }
  }
  const listenMatch = text.match(/\blisten(?:ing)?\s+to\s+([^.;]+)/i)
  if (listenMatch?.[1]) {
    const title = listenMatch[1].replace(/\b(right now|currently|just)\b.*$/i, '').trim()
    if (title) return { label: `Listening to ${title}`.trim(), kind: 'listen', title }
  }
  const readMatch = text.match(/\bread(?:ing)?\s+([^.;]+)/i)
  if (readMatch?.[1]) {
    const title = readMatch[1].replace(/\b(right now|currently|just)\b.*$/i, '').trim()
    if (title) return { label: `Reading ${title}`.trim(), kind: 'read', title }
  }
  if (/\bwatch\b/.test(lower)) return { label: 'Watching', kind: 'watch', title: null }
  return null
}

function extractEpisodeDetail(text: string) {
  const rangeMatch = text.match(/\bepisodes?\s+(\d+)\s*(?:and|&|to|-)\s*(\d+)\b/i)
  if (rangeMatch?.[1] && rangeMatch?.[2]) return `Episodes ${rangeMatch[1]}-${rangeMatch[2]}`
  const listMatch = text.match(/\bepisodes?\s+(\d+(?:\s*,\s*\d+)+)\b/i)
  if (listMatch?.[1]) return `Episodes ${listMatch[1].replace(/\s+/g, '')}`
  const match = text.match(/\bepisode\s+(\d+)\b/i) ?? text.match(/\bep\s*(\d+)\b/i)
  return match?.[1] ? `Episode ${match[1]}` : null
}

function extractImplicitPeople(text: string) {
  const out: string[] = []
  for (const m of text.matchAll(/\bwith\s+(?:(?:dr|doctor|mr|ms|mrs|prof|professor)\.?\s+)?([A-Z][\w'’.-]*(?:\s+[A-Z][\w'’.-]*){0,2})\b/gim)) {
    const name = (m[1] ?? '').trim()
    if (!name) continue
    out.push(name)
  }
  for (const m of text.matchAll(/\b([A-Z][\w'’.-]*(?:\s+[A-Z][\w'’.-]*){0,2})\s+(?:says?|said|thinks?|thought|mentioned|told|texted|called)\b/gim)) {
    const name = (m[1] ?? '').trim()
    if (!name) continue
    out.push(name)
  }
  return Array.from(new Set(out)).slice(0, 8)
}

function extractImplicitLocations(text: string) {
  const lower = text.toLowerCase()
  const out = new Set<string>()
  if (/\b(in bed|lying in bed|on the bed)\b/i.test(lower)) out.add('bed')
  if (/\b(on the couch|on the sofa|couch|sofa)\b/i.test(lower)) out.add('couch')
  if (/\b(at home|home)\b/i.test(lower)) out.add('home')
  return Array.from(out).slice(0, 8)
}

function slugifyTag(raw: string) {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim()
}

function inferNarrativeTags(text: string, activityTitle?: string | null) {
  const tags = new Set<string>()
  const lower = text.toLowerCase()
  if (/\bwatch(?:ing|ed)?\b/.test(lower)) {
    tags.add('watch')
    tags.add('tv')
  }
  if (/\b(relaxed|chill|resting|lying in bed)\b/.test(lower)) tags.add('rest')
  if (activityTitle) {
    const slug = slugifyTag(activityTitle)
    if (slug && slug.length > 2) tags.add(slug)
  }
  return Array.from(tags)
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
  const blockTags = new Set<string>()
  const blockPeople = new Set<string>()
  const blockContexts = new Set<string>()
  const blockLocations = new Set<string>()
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
    block.tags.forEach((tag) => blockTags.add(tag))
    block.people.forEach((person) => blockPeople.add(person))
    block.contexts.forEach((context) => blockContexts.add(context))
    block.locations.forEach((location) => blockLocations.add(location))
  })
  const activity = extractMediaActivity(entryText)
  const implicitPeople = extractImplicitPeople(entryText)
  const implicitLocations = extractImplicitLocations(entryText)
  const narrativeTags = inferNarrativeTags(entryText, activity?.title)
  const tagTokens = new Set<string>()
  inferredTags.forEach((tag) => tagTokens.add(tag.replace(/^#/, '')))
  workingTags.forEach((tag) => tagTokens.add(tag.replace(/^#/, '')))
  blockTags.forEach((tag) => tagTokens.add(tag.replace(/^#/, '')))
  narrativeTags.forEach((tag) => tagTokens.add(tag.replace(/^#/, '')))
  const parsedMeal = parseMealFromText(entryText, { nowMs: anchorMs })
  const parsedWorkout = parseWorkoutFromText(entryText)
  const mealTokens = (parsedMeal?.tags ?? [])
    .map((tag) => slugifyTag(tag.replace(/^#/, '')))
    .filter(Boolean)
    .map((tag) => `#${tag}`)
  const workoutTokens = (parsedWorkout?.tags ?? [])
    .map((tag) => slugifyTag(tag.replace(/^#/, '')))
    .filter(Boolean)
    .map((tag) => `#${tag}`)
  const skipTagTokens = new Set([...mealTokens, ...workoutTokens].map((token) => token.toLowerCase()))
  const peopleTokens = Array.from(new Set([...blockPeople, ...implicitPeople]))
  const contextTokens = Array.from(blockContexts)
  const locationTokens = Array.from(new Set([...blockLocations, ...implicitLocations]))
  const label = activity?.label ?? deriveEntryLabel(entry, tags, workingItems)
  const lines: string[] = [`Time: ${entry.time}`]

  const chipTokens: string[] = []
  Array.from(tagTokens)
    .map((tag) => slugifyTag(tag))
    .filter(Boolean)
    .forEach((tag) => {
      const token = `#${tag}`
      if (skipTagTokens.has(token.toLowerCase())) return
      chipTokens.push(token)
    })
  peopleTokens
    .map((person) => person.replace(/^@+/, '').trim())
    .filter(Boolean)
    .forEach((person) => chipTokens.push(`@${person}`))
  contextTokens
    .map((context) => slugifyTag(context))
    .filter(Boolean)
    .forEach((context) => chipTokens.push(`+${context}`))
  locationTokens
    .map((location) => slugifyTag(location))
    .filter(Boolean)
    .forEach((location) => chipTokens.push(`!${location}`))
  if (trackerTokens.size) {
    lines.push('Trackers')
    trackerLines.forEach((line) => lines.push(line.replace(/^-+\s*/, '')))
  }

  const mealLines: string[] = []
  if (parsedMeal?.items?.length) {
    const mealTitle = formatTitleCase(parsedMeal.type ?? 'meal')
    const itemList = parsedMeal.items
      .map((item) => item.name)
      .filter(Boolean)
      .slice(0, 6)
      .join(', ')
    const summary = itemList ? `${mealTitle}: ${itemList}` : `${mealTitle} logged`
    mealLines.push('Meal')
    mealLines.push(appendTokensToLine(summary, mealTokens))
    mealLines.push('Meal breakdown + macros (estimated)')
    mealLines.push(...buildMealTableLines(parsedMeal))
  }

  const workoutLines: string[] = []
  if (parsedWorkout?.exercises?.length) {
    const typeLabel = formatTitleCase(parsedWorkout.type ?? 'workout')
    const totalSets = parsedWorkout.exercises.reduce((sum, ex) => sum + (ex.sets?.length ?? 0), 0)
    const totalDuration = parsedWorkout.exercises.reduce(
      (sum, ex) => sum + (ex.sets ?? []).reduce((inner, set) => inner + (set.duration ?? 0), 0),
      0,
    )
    const totalDistance = parsedWorkout.exercises.reduce(
      (sum, ex) => sum + (ex.sets ?? []).reduce((inner, set) => inner + (set.distance ?? 0), 0),
      0,
    )
    const details = [
      parsedWorkout.exercises.length ? `${parsedWorkout.exercises.length} exercise${parsedWorkout.exercises.length === 1 ? '' : 's'}` : '',
      totalSets ? `${totalSets} sets` : '',
      formatDistance(totalDistance),
      formatDuration(totalDuration),
      parsedWorkout.overallRpe != null ? `RPE ${Math.round(parsedWorkout.overallRpe)}` : '',
    ].filter(Boolean)
    const summary = details.length ? `${typeLabel} workout: ${details.join(', ')}` : `${typeLabel} workout`
    workoutLines.push('Workout')
    workoutLines.push(appendTokensToLine(summary, workoutTokens))
    workoutLines.push(...buildWorkoutTableLines(parsedWorkout))
  }

  if (workingItems.length) {
    if (mealLines.length) lines.push(...mealLines)
    if (workoutLines.length) lines.push(...workoutLines)
    lines.push('Working On')
    workingItems.forEach((item) => {
      lines.push(`- ▶ ${item}`)
    })
    appendInlineTokens(lines, chipTokens)
    return { timeLabel: entry.time, label, lines }
  }

  const parsed = parseCaptureNatural(entryText, anchorMs)
  const parsedTasks: EntryTask[] = parsed.tasks.map((task) => ({
    title: task.title,
    status: task.status === 'done' ? 'done' : 'todo',
  }))
  const extractedTasks = extractActionTasks(entryText)
  const completedTasks = extractCompletedTasks(entryText)
  const headline = normalizeComparableText(entry.headline)
  const notes = (entry.body.length ? entry.body : extractNoteLines(entryText))
    .map((note) => note.trim())
    .filter((note) => note && !isLowSignalText(note))
    .filter((note) => normalizeComparableText(note) !== headline)

  const todos = mergeEntryTasks(
    parsedTasks.filter((t) => t.status !== 'done' && !isLowSignalText(t.title)),
    extractedTasks,
  )
  const done = mergeEntryTasks(
    parsedTasks.filter((t) => t.status === 'done' && !isLowSignalText(t.title)),
    completedTasks,
  )

  if (notes.length) {
    lines.push('Notes')
    notes.forEach((note) => {
      const trimmed = note.trim()
      if (!trimmed) return
      lines.push(trimmed.startsWith('- ') ? trimmed : `- ${trimmed}`)
    })
  }

  if (mealLines.length) lines.push(...mealLines)
  if (workoutLines.length) lines.push(...workoutLines)

  if (todos.length) {
    lines.push('Next actions')
    todos.forEach((task) => {
      lines.push(`- [ ] ▶ ${task.title}`)
    })
  }

  if (!todos.length && done.length) {
    lines.push('Completed')
    done.forEach((task) => lines.push(`- [x] ${task.title}`))
  } else if (done.length) {
    lines.push('Completed')
    done.forEach((task) => lines.push(`- [x] ${task.title}`))
  }

  if (lines.length === 1 && label) {
    lines.push(label)
  }

  appendInlineTokens(lines, chipTokens)
  return { timeLabel: entry.time, label, lines }
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
  const match = line.match(/^\s*\[?(\d{1,2}:\d{2}|\d{3,4}|\d{1,2}[,]\d{2}|\d{1,2}\s+\d{2})\]?\s*(?:-|—)?\s*/i)
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

  let preamble = base.sections.find((section) => !section.title)
  if (!preamble) {
    preamble = {
      id: `preamble-${base.sections.length}`,
      title: null,
      level: 0,
      lines: [],
      dividerBefore: false,
    }
    base.sections.unshift(preamble)
    didChange = true
  }

  let lines = stripTemplateHeaderLines(preamble.lines)
  while (lines.length && !lines[0]?.trim()) lines.shift()

  const structuredSections = parseStructuredOutline(opts.transcript, safeAnchorMs)
  const entryBlocks: string[][] = []

  if (structuredSections.length) {
    structuredSections.forEach((section) => {
      const block: string[] = []
      block.push(`Time: ${section.timeLabel}`)
      if (section.title) block.push(section.title)
      if (section.dateLabel) block.push(`Date: ${section.dateLabel}`)
      if (section.lines.length) {
        section.lines
          .map((line) => line.replace(/^###\s+/, '').trim())
          .filter(Boolean)
          .forEach((line) => block.push(line))
      }
      appendInlineTokens(block, section.tags)
      entryBlocks.push(block)
    })
  } else {
    const entries = parseTranscriptEntries(opts.transcript, safeAnchorMs)
    entries.forEach((entry) => {
      const section = entrySectionLines(entry, safeAnchorMs)
      entryBlocks.push(section.lines)
    })
  }

  if (entryBlocks.length) {
    entryBlocks.forEach((block) => {
      const time = extractTimeFromEntryLine(block[0] ?? '')
      if (time) {
        const existingBlocks = findEntryBlocks(lines)
        const existing = existingBlocks.find((b) => b.time === time)
        if (existing) {
          const merged = mergeEntryBlock(lines, existing, block)
          lines = merged.lines
          if (merged.changed) didChange = true
          return
        }
      }
      const inserted = insertEntryBlock(lines, block)
      lines = inserted.lines
      if (inserted.changed) didChange = true
    })
  }

  if (lines.join('\n') !== preamble.lines.join('\n')) {
    preamble.lines = lines
    didChange = true
  }

  if (didChange) {
    base.frontmatter = {
      ...base.frontmatter,
      updated: nowIso,
    }
  }

  return serializeNoteDoc(base)
}
