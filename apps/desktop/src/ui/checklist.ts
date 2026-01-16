export type ChecklistItem = { lineIndex: number; checked: boolean; marker: string; text: string }

const CHECKLIST_MARKERS = new Set([' ', 'x', 'X', '-', '>', '<', 'o', '/'])

export function parseChecklistMarkdown(notes: string | null | undefined): ChecklistItem[] {
  const text = (notes ?? '').trim()
  if (!text) return []
  const lines = text.split(/\r?\n/)
  const items: ChecklistItem[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const m = line.match(/^\s*[-*+]\s*\[([^\]])\]\s+(.+)\s*$/)
    const marker = (m?.[1] ?? '').toString()
    if (!m?.[2] || !CHECKLIST_MARKERS.has(marker)) continue
    items.push({
      lineIndex: i,
      checked: marker.toLowerCase() === 'x',
      marker,
      text: m[2].trim(),
    })
  }
  return items
}

export function toggleChecklistLine(notes: string | null | undefined, lineIndex: number) {
  const lines = (notes ?? '').split(/\r?\n/)
  const line = lines[lineIndex]
  if (line == null) return notes ?? ''
  const m = line.match(/^(\s*[-*+]\s*\[)([^\]])(\]\s+)(.+)\s*$/)
  if (!m) {
    const trimmed = line.trimStart()
    if (!/^[-*+]\s+/.test(trimmed)) return notes ?? ''
    if (!/(?:\{task:[^}]+\}|\{habit:[^}]+\}|#task\b|#habit\b)/i.test(line)) return notes ?? ''
    const indent = line.match(/^\s*/)?.[0] ?? ''
    const rest = trimmed.replace(/^[-*+]\s+/, '')
    lines[lineIndex] = `${indent}- [x] ${rest}`.trimEnd()
    return lines.join('\n')
  }
  const currentMarker = (m[2] ?? '').toString()
  const nextMark = currentMarker.toLowerCase() === 'x' ? ' ' : 'x'
  lines[lineIndex] = `${m[1]}${nextMark}${m[3]}${m[4] ?? ''}`.trimEnd()
  return lines.join('\n')
}

export function setChecklistMarker(notes: string | null | undefined, lineIndex: number, marker: string) {
  const lines = (notes ?? '').split(/\r?\n/)
  const line = lines[lineIndex]
  if (line == null) return notes ?? ''
  const nextMarker = CHECKLIST_MARKERS.has(marker) ? marker : ' '
  const m = line.match(/^(\s*[-*+]\s*)\[[^\]]\](\s+.+)\s*$/)
  if (m) {
    lines[lineIndex] = `${m[1]}[${nextMarker}]${m[2]}`.trimEnd()
    return lines.join('\n')
  }
  const trimmed = line.trimStart()
  if (!/^[-*+]\s+/.test(trimmed)) return notes ?? ''
  const indent = line.match(/^\s*/)?.[0] ?? ''
  const rest = trimmed.replace(/^[-*+]\s+/, '')
  lines[lineIndex] = `${indent}- [${nextMarker}] ${rest}`.trimEnd()
  return lines.join('\n')
}

export function getChecklistMarker(line: string | null | undefined) {
  if (!line) return null
  const m = line.match(/^\s*[-*+]\s*\[([^\]])\]\s+/)
  const marker = (m?.[1] ?? '').toString()
  if (!marker) return null
  return CHECKLIST_MARKERS.has(marker) ? marker : null
}
