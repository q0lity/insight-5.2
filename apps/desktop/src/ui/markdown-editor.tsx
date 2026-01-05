import { useMemo, useState } from 'react'
import { MarkdownView } from './markdown'

export function MarkdownEditor(props: {
  value: string
  onChange: (next: string) => void
  onToggleChecklist?: (lineIndex: number) => void
  onStartTask?: (task: { tokenId: string; title: string; estimateMinutes?: number | null; dueAt?: number | null }) => void
  placeholder?: string
  ariaLabel?: string
}) {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const trimmed = props.value?.trim() ?? ''
  const preview = useMemo(() => (trimmed ? trimmed : ''), [trimmed])

  return (
    <div className="mdEditor">
      <div className="mdEditorTop">
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
            className={mode === 'preview' ? 'mdTab active' : 'mdTab'}
            onClick={() => setMode('preview')}
            role="tab"
            aria-selected={mode === 'preview'}>
            Preview
          </button>
        </div>
      </div>

      {mode === 'preview' ? (
        <div className="mdPreviewPane" aria-label="Markdown preview">
          {preview ? (
            <MarkdownView markdown={preview} onToggleChecklist={props.onToggleChecklist} onStartTask={props.onStartTask} />
          ) : (
            <div className="mdEmpty">Nothing to preview yet.</div>
          )}
        </div>
      ) : (
        <textarea
          className="mdTextarea"
          value={props.value ?? ''}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder ?? 'Write markdown notes…'}
          aria-label={props.ariaLabel ?? 'Notes (markdown)'}
        />
      )}
    </div>
  )
}
