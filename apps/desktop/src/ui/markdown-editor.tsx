import { useMemo, useState } from 'react'
import { MarkdownView } from './markdown'
import type { NoteItemKind } from '../markdown/note-items'

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
}) {
  const [mode, setMode] = useState<'edit' | 'preview'>('preview')
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
