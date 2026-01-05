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

export function MarkdownView(props: { markdown: string; onToggleChecklist?: (lineIndex: number) => void; onStartTask?: (task: NoteTaskAction) => void }) {
  const markdown = props.markdown ?? ''
  const checklistItems = useMemo(() => parseChecklistMarkdown(markdown), [markdown])
  let checklistCursor = 0

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
    const [collapsed, setCollapsed] = useState(false)

    return (
      <li {...rest} className="mdLi">
        <div className="mdLiRow">
          <div className="mdLiContent">{renderWithChips(main)}</div>
          {isTask && taskMeta && props.onStartTask ? (
            <button
              className="mdTaskStart"
              type="button"
              onClick={() => props.onStartTask?.(taskMeta)}>
              Start
            </button>
          ) : null}
          {hasNested ? (
            <button
              className="mdLiToggle"
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? 'Expand section' : 'Collapse section'}>
              {collapsed ? '+' : '–'}
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
          input: ({ type, checked, ...rest }) => {
            if (type !== 'checkbox') return <input {...rest} type={type} />
            const item = checklistItems[checklistCursor++]
            const lineIndex = item?.lineIndex
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
