import { useMemo, useState, type ReactNode } from 'react'
import { MarkdownView } from './markdown'
import type { NoteItemKind } from '../markdown/note-items'
import { parseCaptureWithBlocks } from '../nlp/natural'

type NotesTableFilter = 'all' | 'event' | 'task' | 'note' | 'habit' | 'tracker'
type NotesPreviewMode = 'markdown' | 'table'
type NotesEditorMode = 'edit' | NotesPreviewMode
type NotesOutlineVariant = 'default' | 'structured'

type NotesTableRow = {
  timeLabel: string
  title: string
  note: string
  tokens: string[]
  kind: NotesTableFilter
}

export function MarkdownEditor(props: {
  value: string
  onChange: (next: string) => void
  previewValue?: string
  tableValue?: string
  frontmatter?: Record<string, unknown> | null
  onToggleChecklist?: (lineIndex: number) => void
  onUpdateChecklistMarker?: (lineIndex: number, marker: string) => void
  onStartTask?: (task: {
    tokenId: string
    title: string
    estimateMinutes?: number | null
    dueAt?: number | null
    kind?: NoteItemKind
    rawText?: string
    lineIndex?: number | null
  }) => void
  onStopTask?: (task: {
    tokenId: string
    title: string
    estimateMinutes?: number | null
    dueAt?: number | null
    kind?: NoteItemKind
    rawText?: string
    lineIndex?: number | null
  }) => void
  taskStateByToken?: Record<string, { status: string; startedAt?: number | null }>
  nowMs?: number
  placeholder?: string
  ariaLabel?: string
  previewMode?: NotesPreviewMode
  tableFilter?: NotesTableFilter
  habitNames?: string[]
  headerLabel?: string
  headerLeading?: ReactNode
  headerActions?: ReactNode
  mode?: NotesEditorMode
  onModeChange?: (mode: NotesEditorMode) => void
  hideModeTabs?: boolean
  outlineVariant?: NotesOutlineVariant
  hideOutlineParagraphs?: boolean
}) {
  const [internalMode, setInternalMode] = useState<NotesEditorMode>(props.previewMode ?? 'markdown')
  const mode = props.mode ?? internalMode
  const setMode = props.onModeChange ?? setInternalMode
  const preview = useMemo(() => props.previewValue ?? props.value ?? '', [props.previewValue, props.value])
  const tableText = useMemo(() => props.tableValue ?? preview, [props.tableValue, preview])
  const hasPreview = Boolean(preview.trim())
  const frontmatterEntries = useMemo(() => Object.entries(props.frontmatter ?? {}).filter(([, value]) => value != null), [props.frontmatter])
  const showFrontmatter = mode === 'markdown' && frontmatterEntries.length > 0
  const showTop =
    Boolean(props.headerLeading) ||
    Boolean(props.headerLabel) ||
    Boolean(props.headerActions) ||
    !props.hideModeTabs

  return (
    <div className="mdEditor">
      {showTop ? (
        <div className="mdEditorTop">
          {props.headerLeading ? (
            <div className="mdEditorLeading">{props.headerLeading}</div>
          ) : props.headerLabel ? (
            <div className="mdEditorLabel">{props.headerLabel}</div>
          ) : (
            <div />
          )}
          {!props.hideModeTabs ? (
            <div className="mdEditorTabs" role="tablist" aria-label="Notes mode">
              <button
                type="button"
                className={mode === 'edit' ? 'mdTab active' : 'mdTab'}
                onClick={() => setMode('edit')}
                role="tab"
                aria-selected={mode === 'edit'}>
                Edit
              </button>
              <button
                type="button"
                className={mode === 'markdown' ? 'mdTab active' : 'mdTab'}
                onClick={() => setMode('markdown')}
                role="tab"
                aria-selected={mode === 'markdown'}>
                Outline
              </button>
              <button
                type="button"
                className={mode === 'table' ? 'mdTab active' : 'mdTab'}
                onClick={() => setMode('table')}
                role="tab"
                aria-selected={mode === 'table'}>
                Table
              </button>
            </div>
          ) : (
            <div />
          )}
          {props.headerActions ? <div className="mdEditorActions">{props.headerActions}</div> : <div />}
        </div>
      ) : null}

      {mode === 'edit' ? (
        <textarea
          className="mdTextarea"
          value={props.value ?? ''}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder ?? 'Write markdown notes…'}
          aria-label={props.ariaLabel ?? 'Notes (markdown)'}
        />
      ) : mode === 'table' ? (
        <NotesTablePreview text={tableText} filter={props.tableFilter ?? 'all'} habitNames={props.habitNames} />
      ) : (
        <div className="mdPreviewPane" aria-label="Markdown preview">
          {showFrontmatter ? (
            <details className="mdProps">
              <summary>Properties</summary>
              <div className="mdPropsGrid">
                {frontmatterEntries.map(([key, value]) => (
                  <div key={key} className="mdPropRow">
                    <div className="mdPropKey">{key}</div>
                    <div className="mdPropValue">{renderFrontmatterValue(value)}</div>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
          {hasPreview ? (
            <MarkdownView
              markdown={preview}
              onToggleChecklist={props.onToggleChecklist}
              onUpdateChecklistMarker={props.onUpdateChecklistMarker}
              onStartTask={props.onStartTask}
              onStopTask={props.onStopTask}
              taskStateByToken={props.taskStateByToken}
              nowMs={props.nowMs}
              outlineVariant={props.outlineVariant}
              hideParagraphs={props.hideOutlineParagraphs}
            />
          ) : (
            <div className="mdEmpty">Nothing to preview yet.</div>
          )}
        </div>
      )}
    </div>
  )
}

function renderFrontmatterValue(value: unknown) {
  if (Array.isArray(value)) {
    return (
      <span className="mdPropValueChips">
        {value.map((entry, index) => {
          const label = String(entry)
          const chipClass =
            label.startsWith('@')
              ? 'mdChip mdChip-person'
              : label.startsWith('!') || label.startsWith('@@')
                ? 'mdChip mdChip-loc'
                : label.startsWith('+') || label.startsWith('*')
                  ? 'mdChip mdChip-ctx'
                  : label.startsWith('#')
                    ? 'mdChip mdChip-tag'
                    : 'mdChip'
          return (
            <span key={`${label}-${index}`} className={chipClass}>
              {label}
            </span>
          )
        })}
      </span>
    )
  }
  if (value == null) return null
  const label = String(value)
  if (!label) return null
  return <span className="mdPropValueText">{label}</span>
}

function detectHabits(text: string, habitNames?: string[]) {
  if (!habitNames?.length) return []
  const lower = text.toLowerCase()
  return habitNames.filter((name) => name && lower.includes(name.toLowerCase()))
}

function deriveBlockKinds(block: ReturnType<typeof parseCaptureWithBlocks>['blocks'][number], habitNames?: string[]) {
  const hasEvents = block.events.length > 0
  const hasTasks = block.tasks.length > 0
  const hasTrackers = block.trackers.length > 0
  const hasHabits = /#habit\b/i.test(block.rawText) || detectHabits(block.rawText, habitNames).length > 0
  return { hasEvents, hasTasks, hasTrackers, hasHabits }
}

function primaryKindForBlock(block: ReturnType<typeof parseCaptureWithBlocks>['blocks'][number], habitNames?: string[]): NotesTableFilter {
  const { hasEvents, hasTasks, hasTrackers, hasHabits } = deriveBlockKinds(block, habitNames)
  if (hasEvents) return 'event'
  if (hasTasks) return 'task'
  if (hasHabits) return 'habit'
  if (hasTrackers) return 'tracker'
  return 'note'
}

function normalizeTitle(raw: string) {
  if (!raw) return ''
  let cleaned = stripTokensForPreview(raw)
  cleaned = cleaned.replace(/^#+\s*/, '')
  cleaned = cleaned.replace(/^⏱\s*/u, '')
  cleaned = cleaned.replace(/^title\s*:\s*/i, '')
  cleaned = cleaned.replace(/^date\s*:\s*/i, '')
  cleaned = cleaned.replace(/^created\s*:\s*/i, '')
  cleaned = cleaned.replace(/^time\s*:\s*/i, '')
  cleaned = cleaned.replace(/^\d{1,2}:\d{2}(?:\s*[ap]m)?\s*(?:[-–—]\s*)?/i, '')
  cleaned = cleaned.replace(/^[-*+]\s*(?:\[[ xX]\]\s*)?/, '')
  cleaned = cleaned.replace(/^\[event\]\s*/i, '')
  cleaned = cleaned.replace(/^(event|task|note|habit|tracker)\s*[-:]\s*/i, '')
  cleaned = cleaned.replace(/^\*{0,2}\s*\d{1,2}:\d{2}(?:\s*[ap]m)?\s*\*{0,2}[\s-:]*/i, '')
  return cleaned.trim()
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

function stripTokensForPreview(raw: string) {
  return raw
    .replace(/\{(?:task|note|seg|event|meal|workout|tracker|habit|tag|person|ctx|loc|goal|project|skill):[^}]+\}/g, ' ')
    .replace(/#([a-zA-Z][\w/-]*)\(([^)]+)\)/g, ' ')
    .replace(/#([a-zA-Z][\w/-]*)\s*\[[^\]]+\]/g, ' ')
    .replace(/\^([A-Za-z0-9_-]+)\s*\[[^\]]+\]/g, ' ')
    .replace(/(^|[\s(])[#@+!*^$~][A-Za-z][\w'’./-]*(?:\s+[A-Za-z][\w'’./-]*){0,3}/g, ' ')
    .replace(/(^|[\s(])@@([A-Za-z][\w/-]*)/g, ' ')
    .replace(/\{(\d+(?:\.\d+)?)(m|h)\}/gi, ' ')
    .replace(/\[timer[:=][^\]]+\]/gi, ' ')
    .replace(/▶/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripTokensForTable(raw: string) {
  const tokenPattern = /\{(?:task|note|seg|event|meal|workout|tracker|habit|tag|person|ctx|loc|goal|project|skill):[^}]+\}/g
  const inlineTokenPattern = /#([a-zA-Z][\w/-]*)\(([^)]+)\)/g
  const bracketTokenPattern = /#([a-zA-Z][\w/-]*)\s*\[[^\]]+\]/g
  const blockPropPattern = /\^([A-Za-z0-9_-]+)\s*\[[^\]]+\]/g
  const inlineTokenWithMetaPattern = /[#@!*^$~][A-Za-z][\w'’./-]*(?:[ \t]+[A-Za-z][\w'’./-]*){0,3}\{[a-z]+:[^}]+\}/g
  const prefixTokenPattern = /(^|[ \t(])[#@+!^$~][A-Za-z][\w'’./-]*(?:[ \t]+[A-Za-z][\w'’./-]*){0,3}/g
  const doubleAtPattern = /(^|[ \t(])@@[A-Za-z][\w'’./-]*/g
  const timerMetaPattern = /\{(\d+(?:\.\d+)?)(m|h)\}/gi
  const timerTokenPattern = /\[timer[:=][^\]]+\]/gi

  return raw
    .split('\n')
    .map((line) => {
      const match = line.match(/^\s*/u)
      const indent = match ? match[0] : ''
      const content = line.slice(indent.length)
      const trimmed = content.trim()
      if (/^\|.*\|$/.test(trimmed) || /^\+[-+]+\+$/.test(trimmed)) {
        return line
      }
      const cleaned = content
        .replace(inlineTokenWithMetaPattern, ' ')
        .replace(tokenPattern, ' ')
        .replace(inlineTokenPattern, ' ')
        .replace(bracketTokenPattern, ' ')
        .replace(blockPropPattern, ' ')
        .replace(doubleAtPattern, ' ')
        .replace(prefixTokenPattern, ' ')
        .replace(timerMetaPattern, ' ')
        .replace(timerTokenPattern, ' ')
        .replace(/▶/g, ' ')
        .replace(/[ \t]+/g, ' ')
        .trimEnd()
      return cleaned ? `${indent}${cleaned}` : ''
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function normalizeComparableText(raw: string) {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isMetaLine(line: string) {
  const trimmed = line.trim()
  if (!trimmed) return true
  if (/^[-*_]{3,}$/.test(trimmed)) return true
  if (/^#{1,6}\s+/.test(trimmed)) return true
  if (/^title\s*:/i.test(trimmed)) return true
  if (/^date\s*:/i.test(trimmed)) return true
  if (/^created\s*:/i.test(trimmed)) return true
  if (/^type\s*:/i.test(trimmed)) return true
  if (/^source\s*:/i.test(trimmed)) return true
  if (/^updated\s*:/i.test(trimmed)) return true
  if (/^entry\s*\(/i.test(trimmed)) return true
  if (/^time\s*:/i.test(trimmed)) return true
  if (/^(notes|trackers|next actions|completed|working on|meal|workout)\b/i.test(trimmed)) return true
  return false
}

function buildNoteSnippet(rawText: string, title: string) {
  const cleaned = stripTokensForTable(rawText)
  const normalizedTitle = normalizeComparableText(title)
  const lines = cleaned
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*+]\s+/, '').trim())
    .filter((line) => line && !isMetaLine(line))
    .filter((line) => normalizeComparableText(line) !== normalizedTitle)
  if (!lines.length) return title
  return lines.slice(0, 8).join('\n')
}

function extractTimeLabel(block: ReturnType<typeof parseCaptureWithBlocks>['blocks'][number]) {
  const explicit = block.events.find((ev) => ev.explicitTime)
  if (explicit) {
    return new Date(explicit.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  const headingMatch = block.rawText.match(/^\s*time\s*:\s*([^\s]+)/im)
  const normalizedHeading = normalizeTimeToken(headingMatch?.[1])
  if (normalizedHeading) return normalizedHeading
  const inlineMatch = block.rawText.match(/^\s*\[?(\d{1,2}:\d{2}|\d{3,4}|\d{1,2}\s+\d{2})\]?/m)
  const normalizedInline = normalizeTimeToken(inlineMatch?.[1])
  if (normalizedInline) return normalizedInline
  const match = block.rawText.match(/\b(\d{1,2}:\d{2})\b/)
  return match?.[1] ?? '—'
}

function deriveBlockTitle(block: ReturnType<typeof parseCaptureWithBlocks>['blocks'][number]) {
  const lines = block.rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const firstLine = lines[0] ?? ''
  const candidates = [
    normalizeTitle(firstLine),
    normalizeTitle(block.events[0]?.title ?? ''),
    normalizeTitle(block.tasks[0]?.title ?? ''),
    normalizeTitle(stripTokensForPreview(block.rawText).split(/[.!?\n]/)[0] ?? ''),
  ]
  return candidates.find((value) => value.length > 0) ?? 'Untitled'
}

function extractInlineTokens(raw: string) {
  const tokens: string[] = []
  const inlineTokenRegex = /([#@!*^$~])([A-Za-z][\w'’./-]*(?:\s+[A-Za-z][\w'’./-]*){0,3})\{([a-z]+):([^}]+)\}/g
  const bareTagTokenRegex = /(^|[ \t(])([A-Za-z][\w'’./-]*(?:[ \t]+[A-Za-z][\w'’./-]*){0,3})\s*\{tag:([^}]+)\}/g
  const bracketTrackerRegex = /#([a-zA-Z][\w/-]*)\s*\[([^\]]+)\]/g
  const doubleAtRegex = /(^|[\s(])@@([A-Za-z][\w'’./-]*)/g

  for (const match of raw.matchAll(inlineTokenRegex)) {
    tokens.push(`${match[1]}${match[2]}`)
  }
  for (const match of raw.matchAll(bareTagTokenRegex)) {
    const label = match[2].trim()
    if (label) tokens.push(`#${label}`)
  }
  for (const match of raw.matchAll(bracketTrackerRegex)) {
    const label = match[1]?.trim()
    const value = (match[2] ?? '').trim()
    if (label) tokens.push(`#${label}[${value}]`)
  }
  for (const match of raw.matchAll(doubleAtRegex)) {
    const label = match[2]?.trim()
    if (label) tokens.push(`@@${label}`)
  }

  return tokens
}

function tokenClassForTable(token: string) {
  if (token.startsWith('@@') || token.startsWith('!')) return 'place'
  if (token.startsWith('@')) return 'person'
  if (token.startsWith('+') || token.startsWith('*')) return 'context'
  if (token.startsWith('#') && token.includes('[')) return 'tracker'
  if (token.startsWith('#')) return 'tag'
  return 'tag'
}

function parseBlockProperties(raw: string) {
  let blockId: string | null = null
  const properties: Array<{ key: string; value: string }> = []
  const pattern = /\^([A-Za-z0-9_-]+)\s*\[([^\]]+)\]/g
  for (const match of raw.matchAll(pattern)) {
    if (!blockId) blockId = match[1] ?? null
    const content = (match[2] ?? '').trim()
    if (!content) continue
    const pairs = content.split(',').map((p) => p.trim()).filter(Boolean)
    for (const pair of pairs) {
      const [key, ...rest] = pair.split(':')
      const value = rest.join(':').trim()
      const cleanedKey = (key ?? '').trim()
      if (!cleanedKey || !value) continue
      properties.push({ key: cleanedKey, value })
    }
  }
  return { blockId, properties }
}

function buildRowTokens(block: ReturnType<typeof parseCaptureWithBlocks>['blocks'][number], habitNames?: string[]) {
  const tokens = new Map<string, string>()
  const addToken = (token: string) => {
    const key = token.toLowerCase()
    if (!tokens.has(key)) tokens.set(key, token)
  }

  const inlineTokens = extractInlineTokens(block.rawText)
  const blockProps = parseBlockProperties(block.rawText)
  const inlineTrackerKeys = new Set(
    inlineTokens
      .filter((token) => token.startsWith('#') && token.includes('['))
      .map((token) => token.slice(1, token.indexOf('[')).toLowerCase()),
  )

  block.tags.forEach((t) => addToken(`#${t}`))
  block.people.forEach((p) => addToken(`@${p}`))
  block.contexts.forEach((c) => addToken(`+${c}`))
  block.locations.forEach((l) => addToken(`@@${l}`))
  block.trackers.forEach((t) => {
    if (inlineTrackerKeys.has(t.key.toLowerCase())) return
    addToken(`#${t.key}[${t.value}]`)
  })
  detectHabits(block.rawText, habitNames).forEach((h) => addToken(`#habit:${h}`))
  if (blockProps.blockId) addToken(`^${blockProps.blockId}`)
  blockProps.properties.forEach((prop) => addToken(`${prop.key}:${prop.value}`))
  inlineTokens.forEach((token) => addToken(token))

  return Array.from(tokens.values())
}

function buildTableRows(text: string, filter: NotesTableFilter, habitNames?: string[]): NotesTableRow[] {
  if (!text.trim()) return []
  const rows: NotesTableRow[] = []
  const nowMs = Date.now()
  const parsed = parseCaptureWithBlocks(text, nowMs)

  for (const block of parsed.blocks) {
    const { hasEvents, hasTasks, hasTrackers, hasHabits } = deriveBlockKinds(block, habitNames)
    if (filter !== 'all') {
      if (filter === 'event' && !hasEvents) continue
      if (filter === 'task' && !hasTasks) continue
      if (filter === 'tracker' && !hasTrackers) continue
      if (filter === 'habit' && !hasHabits) continue
      if (filter === 'note' && (hasEvents || hasTasks || hasTrackers || hasHabits)) continue
    }
    const title = deriveBlockTitle(block)
    const note = buildNoteSnippet(block.rawText, title)
    rows.push({
      timeLabel: extractTimeLabel(block),
      title,
      note,
      tokens: buildRowTokens(block, habitNames),
      kind: primaryKindForBlock(block, habitNames),
    })
  }

  return rows
}

function escapeTableCell(value: string) {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim()
}

function pickToken(tokens: string[], predicate: (token: string) => boolean) {
  return tokens.find(predicate) ?? ''
}

function extractPriority(tokens: string[]) {
  const match = tokens.find((token) => /#(?:priority|urgent|high|medium|low|p[0-4])\b/i.test(token))
  return match ? match.replace(/^#/, '') : ''
}

export function buildNotesTableMarkdown(text: string, filter: NotesTableFilter, habitNames?: string[]) {
  const rows = buildTableRows(text, filter, habitNames)
  if (!rows.length) return ''
  const header = '| Area | Task | Assignee | Contact | Scheduled | Due | Priority |'
  const divider = '| --- | --- | --- | --- | --- | --- | --- |'
  const lines = rows.map((row) => {
    const areaToken = pickToken(row.tokens, (token) => token.startsWith('#') && !token.includes('[') && !token.includes(':'))
    const area = areaToken ? areaToken.replace(/^#/, '') : row.kind
    const assigneeToken = pickToken(row.tokens, (token) => token.startsWith('@') && !token.startsWith('@@'))
    const contactToken = pickToken(row.tokens, (token) => token.startsWith('@@') || token.startsWith('!'))
    const scheduled = row.timeLabel !== '—' ? row.timeLabel : ''
    const priority = extractPriority(row.tokens)
    return `| ${escapeTableCell(area)} | ${escapeTableCell(row.title)} | ${escapeTableCell(assigneeToken.replace(/^@/, ''))} | ${escapeTableCell(contactToken.replace(/^@@?/, ''))} | ${escapeTableCell(scheduled)} |  | ${escapeTableCell(priority)} |`
  })
  return [header, divider, ...lines].join('\n')
}

function NotesTablePreview(props: { text: string; filter: NotesTableFilter; habitNames?: string[] }) {
  const rows = useMemo(() => buildTableRows(props.text, props.filter, props.habitNames), [props.text, props.filter, props.habitNames])
  if (!rows.length) {
    return (
      <div className="mdPreviewPane" aria-label="Notes table preview">
        <div className="mdEmpty">Nothing to preview yet.</div>
      </div>
    )
  }

  return (
    <div className="mdPreviewPane mdPreviewPaneTable" aria-label="Notes table preview">
      <div className="notesTable notesTableCompact">
        <div className="notesTableHeader">
          <span>Time</span>
          <span>Note</span>
          <span>Tags</span>
        </div>
        <div className="notesTableBody">
          {rows.map((row, idx) => (
            <div key={`${row.timeLabel}_${idx}`} className="notesTableRow">
              <div className="notesTableCell time">{row.timeLabel}</div>
              <div className="notesTableCell preview">{row.note || '—'}</div>
              <div className="notesTableCell tags">
                <span className={`notesTableTag kind kind-${row.kind}`}>{row.kind.charAt(0).toUpperCase() + row.kind.slice(1)}</span>
                {row.tokens.length ? row.tokens.map((token) => (
                  <span key={`${token}_${idx}`} className={`notesTableTag token-${tokenClassForTable(token)}`}>
                    {token}
                  </span>
                )) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
