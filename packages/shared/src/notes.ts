export function firstLine(text: string) {
  return (text.split(/\r?\n/)[0] ?? '').trim().slice(0, 60) || 'Untitled'
}

export function extractTags(text: string): string[] {
  const matches = text.match(/(^|[\s(])#([a-zA-Z][\w/-]*)/g) || []
  return [...new Set(matches.map((m) => m.trim()))]
}

export function extractPeople(text: string): string[] {
  const matches = text.match(/(^|[\s(])@([a-zA-Z][\w/-]*)/g) || []
  return [...new Set(matches.map((m) => m.trim()))]
}

export function extractPlaces(text: string): string[] {
  const matches = text.match(/(^|[\s(])!([a-zA-Z][\w/-]*)/g) || []
  return [...new Set(matches.map((m) => m.trim()))]
}

export function getPreview(text: string) {
  const lines = text.split('\n').slice(1).join(' ').trim()
  if (!lines) return ''
  return lines.slice(0, 80) + (lines.length > 80 ? '...' : '')
}

export function wordCount(text: string) {
  return text.split(/\s+/).filter(Boolean).length
}

export function formatRelativeDate(ts: number) {
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - ts
  if (diff < 86400000 && d.getDate() === now.getDate()) return 'Today'
  if (diff < 172800000) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function normalizeToken(raw: string) {
  return raw.replace(/^[#@!]/, '').trim().toLowerCase()
}

function uniqStrings(items: string[]) {
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of items) {
    const trimmed = item.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    out.push(trimmed)
  }
  return out
}

export function extractCategories(text: string, categories: string[]) {
  if (!categories.length) return []
  const lookup = new Map(categories.map((c) => [c.toLowerCase(), c]))
  const found = new Set<string>()
  const tags = extractTags(text).map(normalizeToken)
  for (const tag of tags) {
    const match = lookup.get(tag)
    if (match) found.add(match)
  }
  const matches = Array.from(text.matchAll(/\bcategory\s*[:=]\s*([^\n\r]+)/gi))
  for (const match of matches) {
    const raw = match[1] ?? ''
    raw
      .split(/[|/]/)
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => {
        const foundCategory = lookup.get(part.toLowerCase())
        if (foundCategory) found.add(foundCategory)
      })
  }
  return Array.from(found)
}

export function uniqueFilters(items: string[]) {
  return uniqStrings(items)
}
