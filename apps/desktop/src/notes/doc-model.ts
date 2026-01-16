type FrontmatterValue = string | number | boolean | Array<string | number | boolean>

export type NoteDocSection = {
  id: string
  title: string | null
  level: number
  lines: string[]
  dividerBefore?: boolean
}

export type NoteDoc = {
  title: string | null
  frontmatter: Record<string, FrontmatterValue>
  sections: NoteDocSection[]
}

function slugifyId(raw: string) {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'section'
}

function parseInlineList(raw: string) {
  return raw
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .split(',')
    .map((x) => x.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
}

function parseFrontmatterLines(lines: string[]) {
  const out: Record<string, FrontmatterValue> = {}
  let activeKey: string | null = null
  let listBuffer: Array<string | number | boolean> = []

  const flushList = () => {
    if (activeKey) out[activeKey] = [...listBuffer]
    activeKey = null
    listBuffer = []
  }

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, '  ')
    if (!line.trim() || /^\s*#/.test(line)) continue
    const listMatch = line.match(/^\s*-\s+(.+)$/)
    if (listMatch && activeKey) {
      const cleaned = listMatch[1].trim().replace(/^['"]|['"]$/g, '')
      if (/^(true|false)$/i.test(cleaned)) {
        listBuffer.push(cleaned.toLowerCase() === 'true')
        continue
      }
      const num = Number(cleaned)
      listBuffer.push(Number.isFinite(num) && cleaned !== '' ? num : cleaned)
      continue
    }
    if (activeKey) flushList()
    const m = line.match(/^\s*([A-Za-z][\w-]*)\s*:\s*(.*)$/)
    if (!m?.[1]) continue
    const key = m[1]
    const value = (m[2] ?? '').trim()
    if (!value) {
      activeKey = key
      listBuffer = []
      continue
    }
    if (value.startsWith('[') && value.endsWith(']')) {
      out[key] = parseInlineList(value)
      continue
    }
    const unquoted = value.replace(/^['"]|['"]$/g, '')
    if (/^(true|false)$/i.test(unquoted)) {
      out[key] = unquoted.toLowerCase() === 'true'
      continue
    }
    const num = Number(unquoted)
    out[key] = Number.isFinite(num) && unquoted !== '' ? num : unquoted
  }
  if (activeKey) flushList()
  return out
}

function splitFrontmatter(rawText: string) {
  const lines = rawText.split(/\r?\n/)
  if ((lines[0] ?? '').trim() !== '---') return { frontmatter: {}, body: rawText }
  const endIdx = lines.slice(1).findIndex((line) => line.trim() === '---')
  if (endIdx === -1) return { frontmatter: {}, body: rawText }
  const fmLines = lines.slice(1, endIdx + 1)
  const body = lines.slice(endIdx + 2).join('\n').trim()
  const frontmatter = parseFrontmatterLines(fmLines)
  return { frontmatter, body }
}

function serializeFrontmatter(frontmatter: Record<string, FrontmatterValue>) {
  const lines: string[] = []
  for (const [key, value] of Object.entries(frontmatter)) {
    if (value == null) continue
    if (Array.isArray(value)) {
      lines.push(`${key}:`)
      for (const entry of value) {
        lines.push(`  - ${String(entry)}`)
      }
      continue
    }
    lines.push(`${key}: ${String(value)}`)
  }
  return lines.join('\n')
}

export function parseNoteDoc(markdown: string): NoteDoc {
  const { frontmatter, body } = splitFrontmatter(markdown ?? '')
  const lines = body ? body.split(/\r?\n/) : []
  const sections: NoteDocSection[] = []
  let title: string | null = null
  let current: NoteDocSection | null = null
  let pendingDivider = false

  const pushSection = () => {
    if (!current) return
    sections.push(current)
    current = null
  }

  for (const rawLine of lines) {
    const line = rawLine
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      const level = headingMatch[1]?.length ?? 2
      const headingTitle = (headingMatch[2] ?? '').trim()
      if (level === 1 && !title && (!current || current.lines.length === 0)) {
        title = headingTitle || title
        pendingDivider = false
        continue
      }
      if (level <= 2) {
        pushSection()
        current = {
          id: slugifyId(`${headingTitle}-${sections.length}`),
          title: headingTitle || null,
          level,
          lines: [],
          dividerBefore: pendingDivider,
        }
        pendingDivider = false
        continue
      }
    }
    if (/^\s*---\s*$/.test(line)) {
      if (!current || current.lines.length === 0) {
        pendingDivider = true
        continue
      }
      current.lines.push(line)
      continue
    }
    if (!current) {
      current = {
        id: `preamble-${sections.length}`,
        title: null,
        level: 0,
        lines: [],
        dividerBefore: pendingDivider,
      }
      pendingDivider = false
    }
    current.lines.push(line)
  }
  pushSection()

  return {
    title,
    frontmatter,
    sections,
  }
}

export function serializeNoteDoc(doc: NoteDoc) {
  const lines: string[] = []
  const fm = Object.fromEntries(Object.entries(doc.frontmatter ?? {}).filter(([, value]) => value != null))
  if (Object.keys(fm).length) {
    lines.push('---')
    const fmLines = serializeFrontmatter(fm)
    if (fmLines) lines.push(fmLines)
    lines.push('---', '')
  }
  if (doc.title) {
    lines.push(`# ${doc.title}`, '')
  }

  doc.sections.forEach((section, index) => {
    if (section.dividerBefore && (lines.length || index > 0)) {
      if (lines[lines.length - 1]?.trim() !== '') lines.push('')
      lines.push('---', '')
    }
    if (section.title) {
      const level = Math.min(6, Math.max(1, section.level || 2))
      lines.push(`${'#'.repeat(level)} ${section.title}`)
    }
    lines.push(...section.lines)
    if (index < doc.sections.length - 1) {
      if (lines[lines.length - 1]?.trim() !== '') lines.push('')
    }
  })
  return lines.join('\n').trimEnd()
}

export function findSection(doc: NoteDoc, title: string) {
  const needle = title.trim().toLowerCase()
  return doc.sections.find((section) => (section.title ?? '').trim().toLowerCase() === needle) ?? null
}

export function upsertSection(doc: NoteDoc, title: string, level = 2) {
  const existing = findSection(doc, title)
  if (existing) return existing
  const section: NoteDocSection = {
    id: slugifyId(`${title}-${doc.sections.length}`),
    title,
    level,
    lines: [],
    dividerBefore: doc.sections.length > 0,
  }
  doc.sections.push(section)
  return section
}

export function appendSectionLines(section: NoteDocSection, lines: string[]) {
  if (!lines.length) return
  if (section.lines.length && section.lines[section.lines.length - 1]?.trim() !== '') {
    section.lines.push('')
  }
  section.lines.push(...lines)
}

export function ensureSystemFrontmatter(frontmatter: Record<string, FrontmatterValue>, fields: Record<string, FrontmatterValue>) {
  const next = { ...frontmatter }
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue
    if (next[key] == null || next[key] === '') next[key] = value
  }
  return next
}
