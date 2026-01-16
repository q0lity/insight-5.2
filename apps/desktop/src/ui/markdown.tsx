import { Children, isValidElement, useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkMath from 'remark-math'
import remarkEmoji from 'remark-emoji'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import 'katex/dist/katex.min.css'
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
const CHECKLIST_MARKER_RE = /\[[ xX><o\/-]\]/
const TRACKER_PAREN_RE = /#([a-zA-Z][\w/-]*)\s*\(\s*([-+]?\d*\.?\d+)\s*\)/g
const TRACKER_COLON_RE = /#([a-zA-Z][\w/-]*)\s*:\s*([-+]?\d*\.?\d+)/g
const TRACKER_BRACKET_RE = /#([a-zA-Z][\w/-]*)\s*\[([^\]]+)\]/g
const BLOCK_PROP_RE = /\^([A-Za-z0-9_-]+)\s*\[([^\]]+)\]/g
const SIGNIFIER_RE = /(^|[\s(])([!?])(?=\s)/g

const BUJO_STATUSES: Array<{ label: string; marker: string }> = [
  { label: 'Incomplete', marker: ' ' },
  { label: 'Complete', marker: 'x' },
  { label: 'Canceled', marker: '-' },
  { label: 'Migrated', marker: '>' },
  { label: 'Scheduled', marker: '<' },
  { label: 'Event', marker: 'o' },
]

function extractSignifiers(raw: string) {
  const tokens = new Map<string, string>()
  for (const match of raw.matchAll(SIGNIFIER_RE)) {
    const sign = match[2] ?? ''
    if (!sign) continue
    tokens.set(sign, sign)
  }
  return Array.from(tokens.values())
}

function getChecklistMarker(raw: string) {
  const match = raw.match(/^\s*[-*+]\s*\[([^\]])\]/)
  const marker = (match?.[1] ?? '').toString()
  if (!marker) return null
  return [' ', 'x', 'X', '-', '>', '<', 'o', '/'].includes(marker) ? marker : null
}

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

type BlockProperty = { key: string; value: string }

function parseBlockProperties(raw: string): { blockId: string | null; properties: BlockProperty[] } {
  let blockId: string | null = null
  const properties: BlockProperty[] = []
  for (const match of raw.matchAll(BLOCK_PROP_RE)) {
    if (!blockId) blockId = match[1] ?? null
    const content = (match[2] ?? '').trim()
    if (!content) continue
    const pairs = content.split(',').map((pair) => pair.trim()).filter(Boolean)
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
  for (const token of extractSignifiers(cleaned)) {
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
    .replace(BLOCK_PROP_RE, '')
    .replace(/\{(\d+(?:\.\d+)?)(m|h)\}/gi, '')
    .replace(/\[timer[:=][^\]]+\]/gi, '')
    .replace(/▶/g, '')
    .replace(TOKEN_META_RE, '')
}

function deriveLineTitle(raw: string) {
  const cleaned = stripInlineTokens(raw).replace(/\s+/g, ' ').trim()
  return cleaned.replace(/^[-*+]\s*(?:\[[^\]]\]\s*)?/, '').trim()
}

function deriveStructuredLineTitle(raw: string) {
  const cleaned = stripInlineTokens(raw)
    .replace(/(^|[\s(])[#@+!*^$~][A-Za-z][\w'’./-]*(?:\s+[A-Za-z][\w'’./-]*){0,3}/g, ' ')
    .replace(/(^|[\s(])@@[A-Za-z][\w'’./-]*/g, ' ')
    .replace(/(^|\s)[!?](?=\s)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned.replace(/^[-*+]\s*(?:\[[^\]]\]\s*)?/, '').trim()
}
function renderInlineTokenChips(raw: string) {
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
      </span>,
    )
    lastIndex = start + match[0].length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts
}

function renderTextWithChips(raw: string) {
  const parts: Array<string | JSX.Element> = []
  let cursor = 0
  for (const match of raw.matchAll(BLOCK_PROP_RE)) {
    const start = match.index ?? 0
    if (start > cursor) {
      parts.push(...renderInlineTokenChips(raw.slice(cursor, start)))
    }
    const blockId = match[1] ?? ''
    const props = parseBlockProperties(match[0]).properties
    parts.push(
      <span key={`block-props-${start}`} className="mdBlockProps">
        {blockId ? <span className="mdBlockId">^{blockId}</span> : null}
        {props.map((prop, index) => (
          <span key={`${prop.key}-${index}`} className="mdChip mdChip-prop">
            {prop.key}:{prop.value}
          </span>
        ))}
      </span>,
    )
    cursor = start + match[0].length
  }
  if (cursor < raw.length) parts.push(...renderInlineTokenChips(raw.slice(cursor)))
  return parts
}

function renderTextWithOutlineChips(raw: string) {
  const parts: Array<string | JSX.Element> = []
  const tokenRegex =
    /(^|[\s(])(@@|[#@+!*^$~?])([A-Za-z][\w'’./-]*(?:\s+[A-Za-z][\w'’./-]*){0,3})|(^|[\s(])([!?])(?=\s)/g
  let lastIndex = 0
  for (const match of raw.matchAll(tokenRegex)) {
    const start = match.index ?? 0
    const lead = match[1] ?? match[4] ?? ''
    const prefix = match[2] ?? ''
    const label = match[3] ?? ''
    const signifier = match[5] ?? ''
    const tokenStart = start + lead.length
    if (tokenStart > lastIndex) parts.push(raw.slice(lastIndex, tokenStart))
    const token = signifier ? signifier : `${prefix}${label}`
    const lower = token.toLowerCase()
    const className =
      token === '!' || token === '?'
        ? 'mdChip mdChip-signifier'
        : lower.startsWith('@')
          ? 'mdChip mdChip-person'
          : lower.startsWith('!') || lower.startsWith('@@')
            ? 'mdChip mdChip-loc'
            : lower.startsWith('+') || lower.startsWith('*')
              ? 'mdChip mdChip-ctx'
              : lower.startsWith('#')
                ? 'mdChip mdChip-tag'
                : 'mdChip'
    parts.push(
      <span key={`${token}-${tokenStart}`} className={className}>
        {token}
      </span>,
    )
    lastIndex = tokenStart + token.length
  }
  if (lastIndex < raw.length) parts.push(raw.slice(lastIndex))
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
  onUpdateChecklistMarker?: (lineIndex: number, marker: string) => void
  onStartTask?: (task: NoteItemAction) => void
  onStopTask?: (task: NoteItemAction) => void
  taskStateByToken?: Record<string, NoteTaskState>
  nowMs?: number
  outlineVariant?: OutlineVariant
  hideParagraphs?: boolean
}) {
  const markdown = props.markdown ?? ''
  const checklistItems = useMemo(() => parseChecklistMarkdown(markdown), [markdown])
  let checklistCursor = 0
  const [collapsedById, setCollapsedById] = useState<Record<string, boolean>>({})
  const [contextMenu, setContextMenu] = useState<null | { x: number; y: number; lineIndex: number; marker: string }>(null)
  const canShowContextMenu = Boolean(props.onUpdateChecklistMarker)
  useEffect(() => {
    if (!contextMenu) return
    function handleClose() {
      setContextMenu(null)
    }
    window.addEventListener('click', handleClose)
    window.addEventListener('contextmenu', handleClose)
    return () => {
      window.removeEventListener('click', handleClose)
      window.removeEventListener('contextmenu', handleClose)
    }
  }, [contextMenu])
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
      if (typeof child === 'string') {
        return outlineVariant === 'structured' ? renderTextWithOutlineChips(child) : renderTextWithChips(child)
      }
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
    const timerMinutes = parseTimerMinutes(rawText)
    const hasTimerToken = /▶/.test(rawText) || timerMinutes != null
    const hasCheckboxToken = CHECKLIST_MARKER_RE.test(rawText)
    const isChecklistItem = isTask || Boolean(inlineKind) || hasTimerToken || hasCheckboxToken
    const checklistMarker = getChecklistMarker(rawText)
    const isChecked = typeof node?.checked === 'boolean' ? node.checked : checklistMarker?.toLowerCase() === 'x'
    const isInteractive = isChecklistItem && typeof lineIndex === 'number' && Boolean(props.onToggleChecklist)
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
    const displayText = outlineVariant === 'structured' ? deriveStructuredLineTitle(rawText) : deriveLineTitle(rawText)
    const outlineTokens = outlineVariant === 'structured' ? buildOutlineTokens(rawText) : []
    const trackerTokens = outlineVariant === 'structured' ? extractTrackerTokens(rawText) : []
    let lineKind = outlineVariant === 'structured' ? detectLineKind(rawText, taskMeta, trackerTokens) : null
    if (outlineVariant === 'structured' && isChecklistItem && (!lineKind || lineKind === 'note')) {
      lineKind = 'task'
    }
    const inlineChips = outlineVariant === 'structured' ? [] : extractInlineChips(rawText)
    const blockProps = outlineVariant === 'structured' ? parseBlockProperties(rawText) : { blockId: null, properties: [] }

    return (
      <li {...rest} className={isChecklistItem ? 'mdLi mdLiChecklist' : 'mdLi'}>
        <div
          className="mdLiRow"
          onContextMenu={(e) => {
            if (!canShowContextMenu || !isChecklistItem || lineIndex == null) return
            e.preventDefault()
            setContextMenu({
              x: e.clientX,
              y: e.clientY,
              lineIndex,
              marker: checklistMarker ?? (isChecked ? 'x' : ' '),
            })
          }}>
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
              onContextMenu={(e) => {
                if (!canShowContextMenu || lineIndex == null) return
                e.preventDefault()
                setContextMenu({
                  x: e.clientX,
                  y: e.clientY,
                  lineIndex,
                  marker: checklistMarker ?? (isChecked ? 'x' : ' '),
                })
              }}
              aria-label={isChecked ? 'Mark incomplete' : 'Mark complete'}
              aria-checked={Boolean(isChecked)}
              role="checkbox"
              disabled={!isInteractive}>
              <span className="mdCheckBox" data-task={checklistMarker ?? (isChecked ? 'x' : ' ')} aria-hidden="true" />
            </button>
          ) : null}
          <div className="mdLiContent">
            <span className="mdLiText">{displayText}</span>
            {outlineVariant !== 'structured' && actionMeta && (props.onStartTask || props.onStopTask) && (!isChecked || isPrimaryRunning) ? (
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
                  if (isPrimaryRunning) {
                    props.onStopTask?.({
                      tokenId: actionMeta.tokenId,
                      title: actionMeta.title,
                      estimateMinutes: actionMeta.estimateMinutes,
                      dueAt: actionMeta.dueAt,
                      kind: actionMeta.kind,
                      rawText: actionMeta.rawText,
                      lineIndex,
                    })
                    return
                  }
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
                <Icon name={isPrimaryRunning ? 'pause' : 'play'} size={12} />
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
              {actionMeta && (props.onStartTask || props.onStopTask) && (!isChecked || isPrimaryRunning) ? (
                <button
                  className={
                    isPrimaryRunning && remainingMs != null && remainingMs < 0
                      ? 'mdChip mdChip-play running over'
                      : isPrimaryRunning
                        ? 'mdChip mdChip-play running'
                        : 'mdChip mdChip-play'
                  }
                  type="button"
                  title={isPrimaryRunning ? timerLabel : 'Start timer'}
                  aria-label={isPrimaryRunning ? timerLabel : 'Start timer'}
                  onClick={() => {
                    if (isPrimaryRunning) {
                      props.onStopTask?.({
                        tokenId: actionMeta.tokenId,
                        title: actionMeta.title,
                        estimateMinutes: actionMeta.estimateMinutes,
                        dueAt: actionMeta.dueAt,
                        kind: actionMeta.kind,
                        rawText: actionMeta.rawText,
                        lineIndex,
                      })
                      return
                    }
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
                  <Icon name={isPrimaryRunning ? 'pause' : 'play'} size={12} />
                </button>
              ) : null}
              {blockProps.blockId ? <span className="mdChip mdChip-block">^{blockProps.blockId}</span> : null}
              {blockProps.properties.map((prop, index) => (
                <span key={`${prop.key}-${prop.value}-${index}`} className="mdChip mdChip-prop">
                  {prop.key}:{prop.value}
                </span>
              ))}
              {outlineTokens.map((token) => {
                const trimmed = token.trim()
                if (!trimmed) return null
                const lower = trimmed.toLowerCase()
                const isTracker = /^#[a-zA-Z][\w/-]*\s*(?:\(|:|\[)/.test(trimmed)
                const className =
                  trimmed === '!' || trimmed === '?'
                    ? 'mdChip mdChip-signifier'
                    : lower.startsWith('@')
                      ? 'mdChip mdChip-person'
                      : lower.startsWith('!') || lower.startsWith('@@')
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

  function CodeBlock({ className, children, ...rest }: any) {
    const [copied, setCopied] = useState(false)
    const language = className?.replace('language-', '') || 'text'
    const codeText = String(children).trim()

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(codeText)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy code:', err)
      }
    }

    return (
      <div className="mdCodeBlock">
        <div className="mdCodeHeader">
          <span className="mdCodeLang">{language}</span>
          <button className="mdCodeCopy" onClick={handleCopy} type="button">
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <pre className={className}>
          <code {...rest}>{children}</code>
        </pre>
      </div>
    )
  }

  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks, remarkMath, remarkEmoji]}
        rehypePlugins={[
          [rehypeHighlight, { ignoreMissing: true }],
          rehypeKatex,
          rehypeSlug,
          [
            rehypeAutolinkHeadings,
            {
              behavior: 'prepend',
              properties: { className: ['heading-anchor'] },
              content: { type: 'text', value: '#' },
            },
          ],
        ]}
        components={{
          p: ({ children, ...rest }) => (props.hideParagraphs ? null : <p {...rest}>{renderWithChips(children)}</p>),
          h1: ({ children, ...rest }) => <h1 {...rest}>{renderWithChips(children)}</h1>,
          h2: ({ children, ...rest }) => <h2 {...rest}>{renderWithChips(children)}</h2>,
          h3: ({ children, ...rest }) => <h3 {...rest}>{renderWithChips(children)}</h3>,
          li: ListItem,
          a: ({ href, children, ...rest }) => (
            <a href={href} target="_blank" rel="noreferrer" {...rest}>
              {children}
            </a>
          ),
          td: ({ children, ...rest }) => <td {...rest}>{renderWithChips(children)}</td>,
          th: ({ children, ...rest }) => <th {...rest}>{renderWithChips(children)}</th>,
          code: ({ inline, className, children, ...rest }: any) => {
            // Only use CodeBlock for block-level code (not inline)
            if (inline) {
              return <code className={className} {...rest}>{children}</code>
            }
            return <CodeBlock className={className} {...rest}>{children}</CodeBlock>
          },
          input: ({ type }) => {
            if (type !== 'checkbox') return null
            return null
          },
        }}>
        {markdown}
      </ReactMarkdown>
      {contextMenu ? (
        <div className="mdContextMenu" style={{ top: contextMenu.y, left: contextMenu.x }}>
          {BUJO_STATUSES.map((option) => (
            <button
              key={option.label}
              onClick={() => {
                props.onUpdateChecklistMarker?.(contextMenu.lineIndex, option.marker)
                setContextMenu(null)
              }}>
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
