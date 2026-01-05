import { Children, isValidElement, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { parseChecklistMarkdown } from './checklist'
import { parseNoteItemMeta, type NoteItemKind } from '../markdown/note-items'
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

const TOKEN_META_RE = /\{(?:task|note|seg|event|meal|workout|tracker|habit):[^}]+\}/g

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

function stripInlineTokens(raw: string) {
  return raw.replace(/[#@!*^$~][^\s{]+\{[^}]+\}/g, '').replace(TOKEN_META_RE, '')
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
}) {
  const markdown = props.markdown ?? ''
  const checklistItems = useMemo(() => parseChecklistMarkdown(markdown), [markdown])
  let checklistCursor = 0
  const [collapsedById, setCollapsedById] = useState<Record<string, boolean>>({})

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
    const main = childArray.filter((child) => !nested.includes(child as any))
    const mainWithoutCheckbox = main.filter(
      (child) => !(isValidElement(child) && child.type === 'input' && (child.props as any)?.type === 'checkbox'),
    )
    const hasNested = nested.length > 0
    const nodeLineIndex = typeof node?.position?.start?.line === 'number' ? node.position.start.line - 1 : null
    const fallback = isTask ? checklistItems[checklistCursor++] : null
    const lineIndex = nodeLineIndex ?? fallback?.lineIndex ?? null
    const lineId = typeof node?.position?.start?.line === 'number' ? `line:${node.position.start.line}` : rawText.trim()
    const collapsed = Boolean(collapsedById[lineId])
    const running = taskMeta ? props.taskStateByToken?.[taskMeta.tokenId] ?? null : null
    const isRunning = Boolean(running && running.status === 'in_progress' && running.startedAt)
    const elapsedMs = isRunning ? (props.nowMs ?? Date.now()) - (running?.startedAt ?? 0) : 0
    const estimateMs = taskMeta?.estimateMinutes != null ? taskMeta.estimateMinutes * 60 * 1000 : null
    const remainingMs = estimateMs != null ? estimateMs - elapsedMs : null
    const timerLabel = isRunning
      ? estimateMs != null
        ? remainingMs != null && remainingMs >= 0
          ? `Left ${formatElapsed(remainingMs)}`
          : `Over ${formatElapsed(Math.abs(remainingMs ?? 0))}`
        : `Running ${formatElapsed(elapsedMs)}`
      : 'Start'
    const isChecklistItem = isTask || Boolean(inlineKind)
    const isChecked = typeof node?.checked === 'boolean' ? node.checked : /\[[xX]\]/.test(rawText)
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
        : null

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
            <span className="mdLiText">{renderWithChips(mainWithoutCheckbox)}</span>
            {actionMeta && props.onStartTask && (!isChecked || isRunning) ? (
              <button
                className={
                  isRunning && remainingMs != null && remainingMs < 0
                    ? 'mdTaskStart running over'
                    : isRunning
                      ? 'mdTaskStart running'
                      : 'mdTaskStart'
                }
                type="button"
                title={isRunning ? timerLabel : 'Start timer'}
                aria-label={isRunning ? timerLabel : 'Start timer'}
                onClick={() => {
                  if (isRunning) return
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
                <Icon name="play" size={12} />
              </button>
            ) : null}
          </div>
        </div>
        {hasNested && !collapsed ? <div className="mdLiChildren">{nested}</div> : null}
      </li>
    )
  }

  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children, ...rest }) => <p {...rest}>{renderWithChips(children)}</p>,
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
