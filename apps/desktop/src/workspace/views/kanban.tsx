import type { Task, TaskStatus } from '../../storage/tasks'
import { parseChecklistMarkdown } from '../../ui/checklist'
import { Icon } from '../../ui/icons'

const COLUMNS: Array<{ key: TaskStatus; title: string }> = [
  { key: 'done', title: 'Done' },
  { key: 'in_progress', title: 'In Progress' },
  { key: 'todo', title: 'Open' },
]

function formatShortDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function checklistProgressPercent(checked: number, total: number) {
  if (total <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((checked / total) * 100)))
}

export function KanbanView(props: {
  tasks: Task[]
  onCreateTask: (title: string) => void
  onMoveTask: (taskId: string, status: TaskStatus) => void
  onSelectTask: (taskId: string) => void
}) {
  return (
    <div className="kbRoot">
      <div className="kbGrid">
        {COLUMNS.map((col) => (
          <div
            key={col.key}
            className="kbCol"
            data-status={col.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const taskId = e.dataTransfer.getData('text/taskId')
              if (!taskId) return
              props.onMoveTask(taskId, col.key)
            }}>
            <div className="kbColHeader">
              <div className="kbColTitle">{col.title}</div>
              <div className="kbCount">{props.tasks.filter((t) => t.status === col.key).length}</div>
              <button
                className="kbColAdd"
                type="button"
                onClick={() => {
                  const title = window.prompt('New task')
                  if (!title) return
                  props.onCreateTask(title)
                }}
              >
                +
              </button>
            </div>
            <div className="kbColBody">
              {props.tasks
                .filter((t) => t.status === col.key)
                .map((t) => {
                  const checklist = parseChecklistMarkdown(t.notes)
                  const completed = checklist.filter((item) => item.checked).length
                  const total = checklist.length
                  const progress = total ? checklistProgressPercent(completed, total) : null
                  const actionLabel = t.status === 'done' ? 'Done' : t.status === 'in_progress' ? 'Resume' : 'Start'
                  return (
                    <div
                      key={t.id}
                      className="kbCard"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/taskId', t.id)
                        e.dataTransfer.setData('text/taskTitle', t.title)
                      }}
                      onClick={() => props.onSelectTask(t.id)}>
                      <div className="kbCardHeader">
                        <div className="kbCardTitle">{t.title}</div>
                        <button className="kbCardMenu" type="button" onClick={(e) => e.stopPropagation()}>
                          <Icon name="dots" size={14} />
                        </button>
                      </div>
                      {t.notes ? <p className="kbCardPreview">{t.notes.split(/\r?\n/)[0]}</p> : null}
                      <div className="kbCardTags">
                        {(t.tags ?? []).slice(0, 2).map((tag) => (
                          <span key={`${t.id}_${tag}`} className="kbTag">
                            {tag}
                          </span>
                        ))}
                        {(t.tags ?? []).length === 0 ? <span className="kbTag muted">task</span> : null}
                      </div>
                      {progress != null ? (
                        <div className="kbCardProgress">
                          <div className="kbCardProgressBar">
                            <span style={{ width: `${progress}%` }} />
                          </div>
                          <div className="kbCardProgressMeta">
                            <span>{progress}%</span>
                            <span>{completed}/{total}</span>
                          </div>
                        </div>
                      ) : null}
                      <div className="kbCardMeta">
                        <div className="kbMetaItem">
                          <Icon name="calendar" size={12} />
                          <span>{t.dueAt ? formatShortDate(t.dueAt) : 'No due date'}</span>
                        </div>
                        <button
                          className="kbCardAction"
                          type="button"
                          disabled={t.status === 'done'}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (t.status !== 'done') props.onMoveTask(t.id, 'in_progress')
                          }}
                        >
                          {actionLabel}
                        </button>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
