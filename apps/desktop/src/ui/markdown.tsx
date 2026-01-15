import { Children, isValidElement, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import rehypeHighlight from 'rehype-highlight'
import { parseChecklistMarkdown } from './checklist'
import { parseNoteItemMeta, type NoteItemKind, type NoteItemMeta } from '../markdown/note-items'
import { extractInlineTokens as extractSchemaTokens } from '../markdown/schema'
import { Icon } from './icons'

type NoteItemAction = {
  tokenId: string
  title: string
  estimateMinutes?: number | null
  dueAt?: number | null
  kind: NoteItemKind
  rawText: string
  lineIndex?: number | null
}

type NoteTaskState = {
  status: string
  startedAt?: number | null
}

type OutlineVariant = 'default' | 'structured'

const TOKEN_META_RE = /\{(?:task|note|seg|event|meal|workout|tracker|habit):[^}]+\}/g
const TRACKER_PAREN_RE = /#([a-zA-Z][\w/-]*)\s*\(\s*([-+]?\d*\.?\d+)\s*\)/g
const TRACKER_COLON_RE = /#([a-zA-Z][\w/-]*)\s*:\s*([-+]?\d*\.?\d+)/g
const TRACKER_BRACKET_RE = /#([a-zA-Z][\w/-]*)\s*\[([^\]]+)\]/g
const TIMER_META_RE = /\{(\d+(?:\.\d+)?)(m|h)\}|\[timer[:=]([^\]]+)\]/gi

function extractTrackerTokens(text: string) {
  const tokens: string[] = []
  for (const match of text.matchAll(TRACKER_BRACKET_RE)) {
    const value = (match[2] ?? '').trim()
    tokens.push(`#${match[1]}[${value}]`)
  }
  for (const match of text.matchAll(TRACKER_PAREN_RE)) {
    tokens.push(`#${match[1]}(${match[2]})`)
  }
  for (const match of text.matchAll(TRACKER_COLON_RE)) {
    tokens.push(`#${match[1]}:${match[2]}`)
  }
  return tokens
}

function buildOutlineTokens(raw: string) {
  const cleaned = raw.replace(TOKEN_META_RE, '')
  const tokens = new Map<string, string>()
  for (const token of extractSchemaTokens(cleaned)) {
    const label = token.raw.trim()
    if (!label) continue
    tokens.set(label.toLowerCase(), label)
  }
  for (const token of extractTrackerTokens(cleaned)) {
    tokens.set(token.toLowerCase(), token)
  }
  return Array.from(tokens.values()).filter((token) => {
    const normalized = token.toLowerCase()
    return normalized !== '#task' && normalized !== '#habit' && normalized !== '#event' && normalized !== '#tracker'
  })
}

function detectLineKind(raw: string, taskMeta: NoteItemMeta | null, trackerTokens: string[]) {
  if (taskMeta?.kind === 'habit') return 'habit'
  if (taskMeta?.kind === 'task') return 'task'
  if (trackerTokens.length > 0 || /\{tracker:[^}]+\}/i.test(raw)) return 'tracker'
  if (/\{event:[^}]+\}/i.test(raw) || /\[event\]/i.test(raw) || /\b#event\b/i.test(raw)) return 'event'
  return 'note'
}

function extractPlainText(node: any): string {
  if (!node) return ''
  if (typeof node.value === 'string') return node.value
  if (Array.isArray(node.children)) return node.children.map(extractPlainText).join(' ')
  return ''
}

function detectInlineItemKind(raw: string): NoteItemKind | null {
  if (/\{habit:[^}]+\}/i.test(raw) || /#habit\b/i.test(raw)) return 'habit'
  if (/\{task:[^}]+\}/i.test(raw) || /#task\b/i.test(raw)) return 'task'
  return null
}

function parseTimerMinutes(raw: string) {
  let match = raw.match(/\{(\d+(?:\.\d+)?)(m|h)\}/i)
  if (match) {
    const value = Number(match[1])
    if (!Number.isFinite(value)) return null
    return match[2].toLowerCase() === 'h' ? value * 60 : value
  }
  match = raw.match(/\[timer[:=]([^\]]+)\]/i)
  if (match?.[1]) {
    const inner = match[1].trim()
    const numMatch = inner.match(/(\d+(?:\.\d+)?)(m|h)?/i)
    if (!numMatch?.[1]) return null
    const value = Number(numMatch[1])
    if (!Number.isFinite(value)) return null
    return numMatch[2]?.toLowerCase() === 'h' ? value * 60 : value
  }
  return null
}

function stripInlineTokens(raw: string) {
  return raw
    .replace(/[#@!*^$~][^\s{]+\{[^}]+\}/g, '')
    .replace(TRACKER_BRACKET_RE, '')
    .replace(/\{(\d+(?:\.\d+)?)(m|h)\}/gi, '')
    .replace(/\[timer[:=][^\]]+\]/gi, '')
    .replace(/▶/g, '')
    .replace(TOKEN_META_RE, '')
}

function deriveLineTitle(raw: string) {
  const cleaned = stripInlineTokens(raw).replace(/\s+/g, ' ').trim()
  return cleaned.replace(/^[-*+]\s*(?:\[[ xX]\]\s*)?/, '').trim()
}

function renderTextWithChips(raw: string) {
  const text = raw.replace(TOKEN_META_RE, '')
  const parts: Array<string | JSX.Element> = []
  const tokenRegex = /([#@!*^$~])([A-Za-z][\w'’./-]*(?:\s+[A-Za-z][\w'’./-]*){0,3})\{([a-z]+):([^}]+)\}/g
  let lastIndex = 0
  for (const match of text.matchAll(tokenRegex)) {
    const start = match.index ?? 0
    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start))
    }
    const prefix = match[1]
    const label = match[2]
    const kind = match[3]
    const tokenId = match[4]
    parts.push(
      <span key={`${kind}_${tokenId}_${start}`} className={`mdChip mdChip-${kind}`} data-token-id={tokenId}>
        {prefix}{label}
      </span>
    )
    lastIndex = start + match[0].length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts
}

function extractInlineChips(raw: string) {
  const text = raw.replace(TOKEN_META_RE, '')
  const chips: JSX.Element[] = []
  const tokenRegex = /([#@!*^$~])([A-Za-z][\w'’./-]*(?:\s+[A-Za-z][\w'’./-]*){0,3})\{([a-z]+):([^}]+)\}/g
  for (const match of text.matchAll(tokenRegex)) {
    const start = match.index ?? 0
    const prefix = match[1]
    const label = match[2]
    const kind = match[3]
    const tokenId = match[4]
    chips.push(
      <span key={`${kind}_${tokenId}_${start}`} className={`mdChip mdChip-${kind}`} data-token-id={tokenId}>
        {prefix}{label}
      </span>,
    )
  }
  return chips
}

function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const mins = Math.floor((total % 3600) / 60)
  const secs = total % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function MarkdownView(props: {
  markdown: string
  onToggleChecklist?: (lineIndex: number) => void
  onStartTask?: (task: NoteItemAction) => void
  taskStateByToken?: Record<string, NoteTaskState>
  nowMs?: number
  outlineVariant?: OutlineVariant
  hideParagraphs?: boolean
}) {
  const markdown = props.markdown ?? ''
  const checklistItems = useMemo(() => parseChecklistMarkdown(markdown), [markdown])
  let checklistCursor = 0
  const [collapsedById, setCollapsedById] = useState<Record<string, boolean>>({})
  const primaryRunningTokenId = useMemo(() => {
    if (!props.taskStateByToken) return null
    let latestToken: string | null = null
    let latestStart = -Infinity
    for (const [tokenId, state] of Object.entries(props.taskStateByToken)) {
      if (state.status !== 'in_progress' || !state.startedAt) continue
      if (state.startedAt > latestStart) {
        latestStart = state.startedAt
        latestToken = tokenId
      }
    }
    return latestToken
  }, [props.taskStateByToken])
  const outlineVariant = props.outlineVariant ?? 'default'

  function renderWithChips(children: any) {
    return Children.map(children, (child) => {
      if (typeof child === 'string') return renderTextWithChips(child)
      return child
    })
  }

  function ListItem({ node, children, ...rest }: any) {
    const isTask = typeof node?.checked === 'boolean'
    const rawText = extractPlainText(node)
    const taskMeta = parseNoteItemMeta(rawText)
    const inlineKind = taskMeta?.kind ?? detectInlineItemKind(rawText)
    const childArray = Children.toArray(children)
    const nested = childArray.filter((child) => isValidElement(child) && (child.type === 'ul' || child.type === 'ol'))
    const hasNested = nested.length > 0
    const nodeLineIndex = typeof node?.position?.start?.line === 'number' ? node.position.start.line - 1 : null
    const fallback = isTask ? checklistItems[checklistCursor++] : null
    const lineIndex = nodeLineIndex ?? fallback?.lineIndex ?? null
    const lineId = typeof node?.position?.start?.line === 'number' ? `line:${node.position.start.line}` : rawText.trim()
    const collapsed = Boolean(collapsedById[lineId])
    const running = taskMeta ? props.taskStateByToken?.[taskMeta.tokenId] ?? null : null
    const isRunning = Boolean(running && running.status === 'in_progress' && running.startedAt)
    const isPrimaryRunning = isRunning && (!primaryRunningTokenId || primaryRunningTokenId === taskMeta?.tokenId)
    const elapsedMs = isPrimaryRunning ? (props.nowMs ?? Date.now()) - (running?.startedAt ?? 0) : 0
    const estimateMs = taskMeta?.estimateMinutes != null ? taskMeta.estimateMinutes * 60 * 1000 : null
    const remainingMs = estimateMs != null ? estimateMs - elapsedMs : null
    const timerLabel = isPrimaryRunning
      ? estimateMs != null
        ? remainingMs != null && remainingMs >= 0
          ? `Left ${formatElapsed(remainingMs)}`
          : `Over ${formatElapsed(Math.abs(remainingMs ?? 0))}`
        : `Running ${formatElapsed(elapsedMs)}`
      : 'Start'
    const isChecklistItem = isTask || Boolean(inlineKind)
    const isChecked = typeof node?.checked === 'boolean' ? node.checked : /\[[xX]\]/.test(rawText)
    const isInteractive = isChecklistItem && typeof lineIndex === 'number' && Boolean(props.onToggleChecklist)
    const timerMinutes = parseTimerMinutes(rawText)
    const hasTimerToken = /▶/.test(rawText) || timerMinutes != null
    const actionMeta = taskMeta
      ? taskMeta
      : inlineKind
        ? {
            tokenId: '',
            title: deriveLineTitle(rawText),
            estimateMinutes: null,
            dueAt: null,
            kind: inlineKind,
            rawText,
            lineIndex,
          }
        : isChecklistItem && hasTimerToken
          ? {
              tokenId: '',
              title: deriveLineTitle(rawText),
              estimateMinutes: timerMinutes,
              dueAt: null,
              kind: 'task',
              rawText,
              lineIndex,
            }
        : null
    const displayText = deriveLineTitle(rawText)
    const outlineTokens = outlineVariant === 'structured' ? buildOutlineTokens(rawText) : []
    const trackerTokens = outlineVariant === 'structured' ? extractTrackerTokens(rawText) : []
    const lineKind = outlineVariant === 'structured' ? detectLineKind(rawText, taskMeta, trackerTokens) : null
    const inlineChips = outlineVariant === 'structured' ? [] : extractInlineChips(rawText)

    return (
      <li {...rest} className={isChecklistItem ? 'mdLi mdLiChecklist' : 'mdLi'}>
        <div className="mdLiRow">
          {hasNested ? (
            <button
              className="mdLiToggle"
              type="button"
              onClick={() =>
                setCollapsedById((prev) => ({
                  ...prev,
                  [lineId]: !collapsed,
                }))
              }
              aria-label={collapsed ? 'Expand section' : 'Collapse section'}
              aria-expanded={!collapsed}>
              {collapsed ? '+' : '–'}
            </button>
          ) : null}
          {isChecklistItem ? (
            <button
              className={isChecked ? 'mdCheck checked' : 'mdCheck'}
              type="button"
              onClick={() => {
                if (!isInteractive || lineIndex == null) return
                props.onToggleChecklist?.(lineIndex)
              }}
              aria-label={isChecked ? 'Mark incomplete' : 'Mark complete'}
              aria-checked={Boolean(isChecked)}
              role="checkbox"
              disabled={!isInteractive}>
              <span className="mdCheckBox" aria-hidden="true" />
            </button>
          ) : null}
          <div className="mdLiContent">
            <span className="mdLiText">{displayText}</span>
            {actionMeta && props.onStartTask && (!isChecked || isPrimaryRunning) ? (
              <button
                className={
                  isPrimaryRunning && remainingMs != null && remainingMs < 0
                    ? 'mdTaskStart running over'
                    : isPrimaryRunning
                      ? 'mdTaskStart running'
                      : 'mdTaskStart'
                }
                type="button"
                title={isPrimaryRunning ? timerLabel : 'Start timer'}
                aria-label={isPrimaryRunning ? timerLabel : 'Start timer'}
                onClick={() => {
                  if (isPrimaryRunning) return
                  props.onStartTask?.({
                    tokenId: actionMeta.tokenId,
                    title: actionMeta.title,
                    estimateMinutes: actionMeta.estimateMinutes,
                    dueAt: actionMeta.dueAt,
                    kind: actionMeta.kind,
                    rawText: actionMeta.rawText,
                    lineIndex,
                  })
                }}>
                <Icon name="plus" size={12} />
              </button>
            ) : null}
            {outlineVariant !== 'structured' && inlineChips.length > 0 ? (
              <span className="mdLiChips">{inlineChips}</span>
            ) : null}
          </div>
          {outlineVariant === 'structured' ? (
            <div className="mdLiMeta">
              {lineKind ? (
                <span className={`mdChip mdChip-kind mdChip-kind-${lineKind}`}>{lineKind}</span>
              ) : null}
              {outlineTokens.map((token) => {
                const trimmed = token.trim()
                if (!trimmed) return null
                const lower = trimmed.toLowerCase()
                const isTracker = /^#[a-zA-Z][\w/-]*\s*(?:\(|:)/.test(trimmed)
                const className =
                  lower.startsWith('@')
                    ? 'mdChip mdChip-person'
                    : lower.startsWith('!') 
                      ? 'mdChip mdChip-loc'
                      : lower.startsWith('+') || lower.startsWith('*')
                        ? 'mdChip mdChip-ctx'
                        : isTracker
                          ? 'mdChip mdChip-tracker'
                          : 'mdChip mdChip-tag'
                return (
                  <span key={`${trimmed}-${lineId}`} className={className}>
                    {trimmed}
                  </span>
                )
              })}
            </div>
          ) : null}
        </div>
        {hasNested && !collapsed ? <div className="mdLiChildren">{nested}</div> : null}
      </li>
    )
  }

  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[[rehypeHighlight, { ignoreMissing: true }]]}
        components={{
          p: ({ children, ...rest }) => (props.hideParagraphs ? null : <p {...rest}>{renderWithChips(children)}</p>),
          li: ListItem,
          a: ({ href, children, ...rest }) => (
            <a href={href} target="_blank" rel="noreferrer" {...rest}>
              {children}
            </a>
          ),
          input: ({ type }) => {
            if (type !== 'checkbox') return null
            return null
          },
        }}>
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
