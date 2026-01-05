import { Children, isValidElement, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { parseChecklistMarkdown } from './checklist'

type NoteTaskAction = {
  tokenId: string
  title: string
  estimateMinutes?: number | null
  dueAt?: number | null
}

type NoteTaskState = {
  status: string
  startedAt?: number | null
}

const TOKEN_META_RE = /\{(?:task|note|seg|event|meal|workout|tracker|habit):[^}]+\}/g
const TASK_TOKEN_RE = /\{task:([^\s}]+)([^}]*)\}/
const ESTIMATE_RE = /\best\s*:\s*(\d+)\s*m\b/i
const DUE_RE = /\bdue\s*:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\b/i

function extractPlainText(node: any): string {
  if (!node) return ''
  if (typeof node.value === 'string') return node.value
  if (Array.isArray(node.children)) return node.children.map(extractPlainText).join(' ')
  return ''
}

function parseTaskMeta(raw: string) {
  const tokenMatch = raw.match(TASK_TOKEN_RE)
  if (!tokenMatch?.[1]) return null
  const tokenId = tokenMatch[1]
  const meta = tokenMatch[2] ?? ''
  const estimateMinutes = meta.match(ESTIMATE_RE)?.[1] ? Number(meta.match(ESTIMATE_RE)?.[1]) : null
  const dueRaw = meta.match(DUE_RE)?.[1] ?? null
  const dueAt = dueRaw ? new Date(`${dueRaw}T09:00:00`).getTime() : null
  const cleaned = raw.replace(TOKEN_META_RE, '').replace(/\s+/g, ' ').trim()
  const title = cleaned.replace(/^[-*]\s*\[[ xX]\]\s*/u, '').trim()
  return { tokenId, title, estimateMinutes, dueAt }
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
  onStartTask?: (task: NoteTaskAction) => void
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
    const taskMeta = isTask ? parseTaskMeta(rawText) : null
    const childArray = Children.toArray(children)
    const nested = childArray.filter((child) => isValidElement(child) && (child.type === 'ul' || child.type === 'ol'))
    const main = childArray.filter((child) => !nested.includes(child as any))
    const hasNested = nested.length > 0
    const lineId = typeof node?.position?.start?.line === 'number' ? `line:${node.position.start.line}` : rawText.trim()
    const collapsed = Boolean(collapsedById[lineId])
    const running = taskMeta ? props.taskStateByToken?.[taskMeta.tokenId] ?? null : null
    const isRunning = Boolean(running && running.status === 'in_progress' && running.startedAt)
    const elapsedMs = isRunning ? (props.nowMs ?? Date.now()) - (running?.startedAt ?? 0) : 0

    return (
      <li {...rest} className="mdLi">
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
          <div className="mdLiContent">{renderWithChips(main)}</div>
          {isTask && taskMeta && props.onStartTask ? (
            <button
              className={isRunning ? 'mdTaskStart running' : 'mdTaskStart'}
              type="button"
              onClick={() => {
                if (isRunning) return
                props.onStartTask?.(taskMeta)
              }}>
              {isRunning ? `Running ${formatElapsed(elapsedMs)}` : 'Start'}
            </button>
          ) : null}
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
          input: ({ node, type, checked, ...rest }) => {
            if (type !== 'checkbox') return <input {...rest} type={type} />
            const nodeLine = typeof node?.position?.start?.line === 'number' ? node.position.start.line - 1 : null
            const fallback = checklistItems[checklistCursor++]
            const lineIndex = typeof nodeLine === 'number' ? nodeLine : fallback?.lineIndex
            const isInteractive = typeof lineIndex === 'number' && Boolean(props.onToggleChecklist)
            return (
              <input
                {...rest}
                type="checkbox"
                checked={Boolean(checked)}
                onChange={() => {
                  if (!isInteractive) return
                  props.onToggleChecklist?.(lineIndex)
                }}
                disabled={!isInteractive}
              />
            )
          },
        }}>
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
