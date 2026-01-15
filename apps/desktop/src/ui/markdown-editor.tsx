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
  onToggleChecklist?: (lineIndex: number) => void
  onStartTask?: (task: {
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
  const hasPreview = Boolean(preview.trim())
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
        <NotesTablePreview text={preview} filter={props.tableFilter ?? 'all'} habitNames={props.habitNames} />
      ) : (
        <div className="mdPreviewPane" aria-label="Markdown preview">
          {hasPreview ? (
            <MarkdownView
              markdown={preview}
              onToggleChecklist={props.onToggleChecklist}
              onStartTask={props.onStartTask}
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
  cleaned = cleaned.replace(/^[-*+]\s*(?:\[[ xX]\]\s*)?/, '')
  cleaned = cleaned.replace(/^\[event\]\s*/i, '')
  cleaned = cleaned.replace(/^(event|task|note|habit|tracker)\s*[-:]\s*/i, '')
  cleaned = cleaned.replace(/^\*{0,2}\s*\d{1,2}:\d{2}(?:\s*[ap]m)?\s*\*{0,2}[\s-:]*/i, '')
  return cleaned.trim()
}

function stripTokensForPreview(raw: string) {
  return raw
    .replace(/\{(?:task|note|seg|event|meal|workout|tracker|habit|tag|person|ctx|loc|goal|project|skill):[^}]+\}/g, ' ')
    .replace(/#([a-zA-Z][\w/-]*)\(([^)]+)\)/g, ' ')
    .replace(/(^|[\s(])[#@+!*^$~][A-Za-z][\w'’./-]*(?:\s+[A-Za-z][\w'’./-]*){0,3}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripTokensForTable(raw: string) {
  const tokenPattern = /\{(?:task|note|seg|event|meal|workout|tracker|habit|tag|person|ctx|loc|goal|project|skill):[^}]+\}/g
  const inlineTokenPattern = /#([a-zA-Z][\w/-]*)\(([^)]+)\)/g
  const inlineTokenWithMetaPattern = /[#@!*^$~][A-Za-z][\w'’./-]*(?:[ \t]+[A-Za-z][\w'’./-]*){0,3}\{[a-z]+:[^}]+\}/g
  const prefixTokenPattern = /(^|[ \t(])[#@+!^$~][A-Za-z][\w'’./-]*(?:[ \t]+[A-Za-z][\w'’./-]*){0,3}/g

  return raw
    .split('\n')
    .map((line) => {
      const match = line.match(/^\s*/u)
      const indent = match ? match[0] : ''
      const content = line.slice(indent.length)
      const cleaned = content
        .replace(inlineTokenWithMetaPattern, ' ')
        .replace(tokenPattern, ' ')
        .replace(inlineTokenPattern, ' ')
        .replace(prefixTokenPattern, ' ')
        .replace(/[ \t]+/g, ' ')
        .trimEnd()
      return cleaned ? `${indent}${cleaned}` : ''
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function extractTimeLabel(block: ReturnType<typeof parseCaptureWithBlocks>['blocks'][number]) {
  const explicit = block.events.find((ev) => ev.explicitTime)
  if (explicit) {
    return new Date(explicit.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
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

  for (const match of raw.matchAll(inlineTokenRegex)) {
    tokens.push(`${match[1]}${match[2]}`)
  }
  for (const match of raw.matchAll(bareTagTokenRegex)) {
    const label = match[2].trim()
    if (label) tokens.push(`#${label}`)
  }

  return tokens
}

function buildRowTokens(block: ReturnType<typeof parseCaptureWithBlocks>['blocks'][number], habitNames?: string[]) {
  const tokens = new Map<string, string>()
  const addToken = (token: string) => {
    const key = token.toLowerCase()
    if (!tokens.has(key)) tokens.set(key, token)
  }

  block.tags.forEach((t) => addToken(`#${t}`))
  block.people.forEach((p) => addToken(`@${p}`))
  block.contexts.forEach((c) => addToken(`+${c}`))
  block.locations.forEach((l) => addToken(`!${l}`))
  block.trackers.forEach((t) => addToken(`#${t.key}(${t.value})`))
  detectHabits(block.rawText, habitNames).forEach((h) => addToken(`#habit:${h}`))
  extractInlineTokens(block.rawText).forEach((token) => addToken(token))

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
    const note = stripTokensForTable(block.rawText)
    rows.push({
      timeLabel: extractTimeLabel(block),
      title: deriveBlockTitle(block),
      note,
      tokens: buildRowTokens(block, habitNames),
      kind: primaryKindForBlock(block, habitNames),
    })
  }

  return rows
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
      <div className="notesTable">
        <div className="notesTableHeader">
          <span>Time</span>
          <span>Title</span>
          <span>Note</span>
          <span>Tags</span>
        </div>
        <div className="notesTableBody">
          {rows.map((row, idx) => (
            <div key={`${row.timeLabel}_${idx}`} className="notesTableRow">
              <div className="notesTableCell time">{row.timeLabel}</div>
              <div className="notesTableCell title">{row.title}</div>
              <div className="notesTableCell preview">{row.note || '—'}</div>
              <div className="notesTableCell tags">
                <span className={`notesTableTag kind kind-${row.kind}`}>{row.kind.charAt(0).toUpperCase() + row.kind.slice(1)}</span>
                {row.tokens.length ? row.tokens.map((token) => (
                  <span key={`${token}_${idx}`} className="notesTableTag">
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
