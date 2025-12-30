import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { parseChecklistMarkdown } from './checklist'

export function MarkdownView(props: { markdown: string; onToggleChecklist?: (lineIndex: number) => void }) {
  const markdown = props.markdown ?? ''
  const checklistItems = useMemo(() => parseChecklistMarkdown(markdown), [markdown])
  let checklistCursor = 0

  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
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
