export type AssistantCapture = {
  id: string
  createdAt: number
  rawText: string
}

export type AssistantEvent = {
  id: string
  startAt: number
  title: string
  kind?: string | null
  tags?: string[] | null
  notes?: string | null
}

export type AssistantTask = {
  id: string
  updatedAt: number
  title: string
  status?: string | null
  tags?: string[] | null
  notes?: string | null
}

export type LocalSearchHit = {
  id: string
  createdAt: number
  snippet: string
}

export type LocalEventHit = {
  id: string
  startAt: number
  title: string
  snippet: string
  kind: string
}

export type LocalTaskHit = {
  id: string
  updatedAt: number
  title: string
  snippet: string
  status: string
}

const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'but',
  'by',
  'for',
  'from',
  'has',
  'have',
  'i',
  'in',
  'is',
  'it',
  'me',
  'my',
  'of',
  'on',
  'or',
  'that',
  'the',
  'this',
  'to',
  'was',
  'were',
  'with',
  'you',
  'your',
])

function tokenize(text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9#@]+/g)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .filter((t) => !STOPWORDS.has(t))
    .slice(0, 2000)
}

function termFreq(tokens: string[]) {
  const tf = new Map<string, number>()
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1)
  return tf
}

function inverseDocFreq(docs: string[][]) {
  const df = new Map<string, number>()
  for (const tokens of docs) {
    const seen = new Set(tokens)
    for (const t of seen) df.set(t, (df.get(t) ?? 0) + 1)
  }
  const n = Math.max(1, docs.length)
  const idf = new Map<string, number>()
  for (const [t, c] of df.entries()) {
    idf.set(t, Math.log(1 + n / (1 + c)))
  }
  return idf
}

function tfidf(tf: Map<string, number>, idf: Map<string, number>) {
  const out = new Map<string, number>()
  let norm = 0
  for (const [t, f] of tf.entries()) {
    const w = f * (idf.get(t) ?? 0)
    if (!w) continue
    out.set(t, w)
    norm += w * w
  }
  return { vec: out, norm: Math.sqrt(norm) || 1 }
}

function cosine(a: { vec: Map<string, number>; norm: number }, b: { vec: Map<string, number>; norm: number }) {
  let dot = 0
  const [small, big] = a.vec.size <= b.vec.size ? [a.vec, b.vec] : [b.vec, a.vec]
  for (const [t, wa] of small.entries()) {
    const wb = big.get(t)
    if (wb) dot += wa * wb
  }
  return dot / (a.norm * b.norm)
}

function semanticRank<T>(
  query: string,
  rows: T[],
  getText: (row: T) => string,
  opts?: { limit?: number; minScore?: number; maxDocs?: number },
) {
  const limit = opts?.limit ?? 5
  const minScore = opts?.minScore ?? 0.12
  const maxDocs = opts?.maxDocs ?? 1500

  const pool = rows.slice(0, maxDocs)
  const docs = pool.map((r) => tokenize(getText(r)))
  const idf = inverseDocFreq(docs)

  const qTokens = tokenize(query)
  if (!qTokens.length) return []
  const qVec = tfidf(termFreq(qTokens), idf)

  const scored: Array<{ row: T; score: number }> = []
  for (let i = 0; i < pool.length; i++) {
    const dVec = tfidf(termFreq(docs[i] ?? []), idf)
    const score = cosine(qVec, dVec)
    if (score >= minScore) scored.push({ row: pool[i]!, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((s) => s.row)
}

function snippetFor(text: string, query: string) {
  const normalizedText = text.toLowerCase()
  const normalizedQuery = query.toLowerCase()
  const idx = normalizedText.indexOf(normalizedQuery)
  if (idx === -1) return text.slice(0, 180)
  const start = Math.max(0, idx - 60)
  const end = Math.min(text.length, idx + normalizedQuery.length + 80)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < text.length ? '…' : ''
  return `${prefix}${text.slice(start, end)}${suffix}`
}

export function localSearchCaptures(query: string, captures: AssistantCapture[], limit = 5): LocalSearchHit[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const exact = captures
    .filter((c) => c.rawText.toLowerCase().includes(q))
    .slice(0, 50)
    .map((c) => ({ id: c.id, createdAt: c.createdAt, snippet: snippetFor(c.rawText, query) }))
  if (exact.length) return exact.slice(0, limit)

  const ranked = semanticRank(query, captures, (c) => c.rawText, { limit })
  return ranked.map((c) => ({ id: c.id, createdAt: c.createdAt, snippet: snippetFor(c.rawText, query) }))
}

export function localSearchEvents(query: string, events: AssistantEvent[], limit = 5): LocalEventHit[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const asText = (e: AssistantEvent) => `${e.title}\n${(e.tags ?? []).join(' ')}\n${e.notes ?? ''}`.trim()
  const exact = events
    .filter((e) => asText(e).toLowerCase().includes(q))
    .slice(0, 80)
    .map((e) => ({
      id: e.id,
      startAt: e.startAt,
      title: e.title,
      kind: e.kind ?? 'event',
      snippet: snippetFor(asText(e), query),
    }))
  if (exact.length) return exact.slice(0, limit)

  const ranked = semanticRank(query, events, asText, { limit })
  return ranked.map((e) => ({
    id: e.id,
    startAt: e.startAt,
    title: e.title,
    kind: e.kind ?? 'event',
    snippet: snippetFor(asText(e), query),
  }))
}

export function localSearchTasks(query: string, tasks: AssistantTask[], limit = 5): LocalTaskHit[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const asText = (t: AssistantTask) => `${t.title}\n${(t.tags ?? []).join(' ')}\n${t.notes ?? ''}`.trim()
  const exact = tasks
    .filter((t) => asText(t).toLowerCase().includes(q))
    .slice(0, 80)
    .map((t) => ({
      id: t.id,
      updatedAt: t.updatedAt,
      title: t.title,
      status: t.status ?? 'todo',
      snippet: snippetFor(asText(t), query),
    }))
  if (exact.length) return exact.slice(0, limit)

  const ranked = semanticRank(query, tasks, asText, { limit })
  return ranked.map((t) => ({
    id: t.id,
    updatedAt: t.updatedAt,
    title: t.title,
    status: t.status ?? 'todo',
    snippet: snippetFor(asText(t), query),
  }))
}

export function localAnswer(query: string, opts: { captures: AssistantCapture[]; events: AssistantEvent[]; tasks: AssistantTask[] }) {
  const captureHits = localSearchCaptures(query, opts.captures, 4)
  const eventHits = localSearchEvents(query, opts.events, 4)
  const taskHits = localSearchTasks(query, opts.tasks, 4)

  if (captureHits.length === 0 && eventHits.length === 0 && taskHits.length === 0) {
    return [
      `I couldn't find anything matching "${query}" in your Inbox, Calendar, or Tasks yet.`,
      'Try searching for a tag/token (e.g. "#mood", "#workout", "@alex") or a keyword from what you wrote.',
    ].join('\n')
  }

  const lines: string[] = []
  if (captureHits.length) {
    lines.push('Inbox:')
    lines.push(...captureHits.map((h) => `- ${new Date(h.createdAt).toLocaleString()} — ${h.snippet}`))
    lines.push('')
  }
  if (eventHits.length) {
    lines.push('Calendar:')
    lines.push(...eventHits.map((h) => `- ${new Date(h.startAt).toLocaleString()} — ${h.snippet}`))
    lines.push('')
  }
  if (taskHits.length) {
    lines.push('Tasks:')
    lines.push(...taskHits.map((h) => `- ${h.status} — ${h.snippet}`))
    lines.push('')
  }

  return [
    `Top matches for "${query}":`,
    '',
    ...lines,
    'Tip: use the Relevant panel to open a match in Details.',
  ].join('\n')
}
