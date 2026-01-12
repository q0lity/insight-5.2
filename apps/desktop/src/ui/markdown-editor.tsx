import { useMemo, useState, type ReactNode } from 'react'
import { MarkdownView } from './markdown'
import type { NoteItemKind } from '../markdown/note-items'
import { parseCaptureWithBlocks } from '../nlp/natural'

type NotesTableFilter = 'all' | 'event' | 'task' | 'note' | 'habit' | 'tracker'
type NotesPreviewMode = 'markdown' | 'table'
type NotesEditorMode = 'edit' | NotesPreviewMode

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
}) {
  const [mode, setMode] = useState<NotesEditorMode>(props.previewMode ?? 'markdown')
  const trimmed = props.value?.trim() ?? ''
  const preview = useMemo(() => (trimmed ? trimmed : ''), [trimmed])

  return (
    <div className="mdEditor">
      <div className="mdEditorTop">
        {props.headerLeading ? (
          <div className="mdEditorLeading">{props.headerLeading}</div>
        ) : props.headerLabel ? (
          <div className="mdEditorLabel">{props.headerLabel}</div>
        ) : (
          <div />
        )}
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
        {props.headerActions ? <div className="mdEditorActions">{props.headerActions}</div> : <div />}
      </div>

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
          {preview ? (
            <MarkdownView
              markdown={preview}
              onToggleChecklist={props.onToggleChecklist}
              onStartTask={props.onStartTask}
              taskStateByToken={props.taskStateByToken}
              nowMs={props.nowMs}
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

function deriveRowTitle(block: ReturnType<typeof parseCaptureWithBlocks>['blocks'][number], habitNames?: string[]) {
  const kind = primaryKindForBlock(block, habitNames)
  const kindLabel = kind.charAt(0).toUpperCase() + kind.slice(1)
  const eventTitle = block.events[0]?.title?.trim()
  const taskTitle = block.tasks[0]?.title?.trim()
  const rawTitle = eventTitle || taskTitle || stripTokensForPreview(block.rawText).split(/[.!?\n]/)[0]?.trim()
  if (!rawTitle) return kindLabel
  return `${kindLabel} · ${rawTitle}`
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
  const parsed = parseCaptureWithBlocks(text)
  return parsed.blocks
    .filter((block) => {
      if (filter === 'all') return true
      const { hasEvents, hasTasks, hasTrackers, hasHabits } = deriveBlockKinds(block, habitNames)
      if (filter === 'event') return hasEvents
      if (filter === 'task') return hasTasks
      if (filter === 'tracker') return hasTrackers
      if (filter === 'habit') return hasHabits
      return !hasEvents && !hasTasks && !hasTrackers && !hasHabits
    })
    .map((block) => {
      const note = stripTokensForTable(block.rawText)
      return {
        timeLabel: extractTimeLabel(block),
        title: deriveRowTitle(block, habitNames),
        note,
        tokens: buildRowTokens(block, habitNames),
        kind: primaryKindForBlock(block, habitNames),
      }
    })
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
