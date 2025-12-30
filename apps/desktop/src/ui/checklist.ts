export type ChecklistItem = { lineIndex: number; checked: boolean; text: string }

export function parseChecklistMarkdown(notes: string | null | undefined): ChecklistItem[] {
  const text = (notes ?? '').trim()
  if (!text) return []
  const lines = text.split(/\r?\n/)
  const items: ChecklistItem[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const m = line.match(/^\s*-\s*\[( |x|X)\]\s+(.+)\s*$/)
    if (!m?.[2]) continue
    items.push({ lineIndex: i, checked: (m[1] ?? '').toLowerCase() === 'x', text: m[2].trim() })
  }
  return items
}

export function toggleChecklistLine(notes: string | null | undefined, lineIndex: number) {
  const lines = (notes ?? '').split(/\r?\n/)
  const line = lines[lineIndex]
  if (line == null) return notes ?? ''
  const m = line.match(/^(\s*-\s*\[)( |x|X)(\]\s+)(.+)\s*$/)
  if (!m) return notes ?? ''
  const nextMark = (m[2] ?? '').toLowerCase() === 'x' ? ' ' : 'x'
  lines[lineIndex] = `${m[1]}${nextMark}${m[3]}${m[4] ?? ''}`.trimEnd()
  return lines.join('\n')
}

