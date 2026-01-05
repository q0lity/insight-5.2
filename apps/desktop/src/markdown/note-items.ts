export type NoteItemKind = 'task' | 'habit'

export type NoteItemMeta = {
  kind: NoteItemKind
  tokenId: string
  title: string
  estimateMinutes?: number | null
  dueAt?: number | null
  rawText: string
}

const TOKEN_META_RE = /\{(?:task|note|seg|event|meal|workout|tracker|habit):[^}]+\}/g
const NOTE_ITEM_TOKEN_RE = /\{(task|habit):([^\s}]+)([^}]*)\}/
const ESTIMATE_RE = /\best\s*:\s*(\d+)\s*m\b/i
const VALUE_RE = /\bvalue\s*:\s*(\d+)\s*m\b/i
const DUE_RE = /\bdue\s*:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\b/i
const CHECKLIST_RE = /^\s*[-*+]\s*\[[ xX]\]\s+/
const TASK_HINT_RE = /(^|\s)#task\b/i
const HABIT_HINT_RE = /(^|\s)#habit\b/i

function parseEstimateMinutes(meta: string) {
  const estRaw = meta.match(ESTIMATE_RE)?.[1] ?? meta.match(VALUE_RE)?.[1] ?? null
  if (!estRaw) return null
  const value = Number(estRaw)
  return Number.isFinite(value) ? value : null
}

function parseDueAt(meta: string) {
  const dueRaw = meta.match(DUE_RE)?.[1] ?? null
  if (!dueRaw) return null
  return new Date(`${dueRaw}T09:00:00`).getTime()
}

function stripInlineTokens(raw: string) {
  return raw.replace(/[#@!*^$~][^\s{]+\{[^}]+\}/g, '')
}

function slugify(raw: string) {
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'item'
}

function hashString(raw: string) {
  let hash = 0
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0
  }
  return hash.toString(36)
}

function cleanTaskTitle(raw: string) {
  return raw
    .replace(/^[-*+]\s*\[[ xX]\]\s*/i, '')
    .replace(/^[-*+]\s+/, '')
    .replace(/\s+#(?:task|habit)\b/gi, '')
    .trim()
}

export function parseNoteItemMeta(raw: string): NoteItemMeta | null {
  const tokenMatch = raw.match(NOTE_ITEM_TOKEN_RE)
  const cleaned = stripInlineTokens(raw.replace(TOKEN_META_RE, '')).replace(/\s+/g, ' ').trim()
  const title = cleanTaskTitle(cleaned)
  if (tokenMatch?.[1] && tokenMatch[2]) {
    const kind = tokenMatch[1] as NoteItemKind
    const tokenId = tokenMatch[2]
    const meta = tokenMatch[3] ?? ''
    const estimateMinutes = parseEstimateMinutes(meta)
    const dueAt = kind === 'task' ? parseDueAt(meta) : null
    return { kind, tokenId, title, estimateMinutes, dueAt, rawText: raw }
  }

  const isChecklist = CHECKLIST_RE.test(raw)
  const hasTaskHint = TASK_HINT_RE.test(raw)
  const hasHabitHint = HABIT_HINT_RE.test(raw)
  if (!isChecklist && !hasTaskHint && !hasHabitHint) return null

  const kind: NoteItemKind = hasHabitHint ? 'habit' : 'task'
  const tokenId = `${kind}_${slugify(title || 'task')}_${hashString(raw)}`
  return { kind, tokenId, title, estimateMinutes: null, dueAt: null, rawText: raw }
}
