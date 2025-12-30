import type { Task, TaskStatus } from '../../storage/tasks'

const COLUMNS: Array<{ key: TaskStatus; title: string }> = [
  { key: 'done', title: 'done' },
  { key: 'in_progress', title: 'in-progress' },
  { key: 'todo', title: 'open' },
]

export function KanbanView(props: {
  tasks: Task[]
  onCreateTask: (title: string) => void
  onMoveTask: (taskId: string, status: TaskStatus) => void
  onSelectTask: (taskId: string) => void
}) {
  const total = props.tasks.length
  return (
    <div className="kbRoot">
      <div className="kbHeader">
        <div className="kbLeft">
          <div className="kbTitleRow">
            <div className="kbTitle">Kanban Board</div>
            <div className="kbResults">{total.toLocaleString()} results</div>
          </div>
        </div>
        <div className="kbRight">
          <button className="kbToolBtn" type="button">
            Sort
          </button>
          <button className="kbToolBtn" type="button">
            Filter
          </button>
          <button className="kbToolBtn" type="button">
            Properties
          </button>
          <button
            className="kbNew"
            onClick={() => {
              const title = window.prompt('New task')
              if (!title) return
              props.onCreateTask(title)
            }}>
            + New
          </button>
        </div>
      </div>

      <div className="kbGrid">
        {COLUMNS.map((col) => (
          <div
            key={col.key}
            className="kbCol"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const taskId = e.dataTransfer.getData('text/taskId')
              if (!taskId) return
              props.onMoveTask(taskId, col.key)
            }}>
            <div className="kbColHeader">
              <div className="kbColTitle">{col.title}</div>
              <div className="kbCount">{props.tasks.filter((t) => t.status === col.key).length}</div>
            </div>
            <div className="kbColBody">
              {props.tasks
                .filter((t) => t.status === col.key)
                .map((t) => (
                  <div
                    key={t.id}
                    className="kbCard"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/taskId', t.id)
                      e.dataTransfer.setData('text/taskTitle', t.title)
                    }}
                    onClick={() => props.onSelectTask(t.id)}>
                    <div className="kbCardTitle">{t.title}</div>
                    <div className="kbCardMeta">
                      {t.tags?.length ? <span className="kbTag">{t.tags[0]}</span> : <span className="kbTag muted">task</span>}
                      <span className="kbDot">·</span>
                      <span className="kbMetaText">{new Date(t.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
