import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Task, TaskStatus } from '../../storage/tasks'
import { pointsForTask } from '../../scoring/points'
import { Icon } from '../../ui/icons'
import { KanbanView } from './kanban'

type TaskFilterKey = 'inbox' | 'today' | 'next7' | 'all' | 'done'

function startOfDayMs(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.getTime()
}

function addDays(d: Date, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function formatShortDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function parseQuickTaskInput(raw: string) {
  const tokens = raw.trim().split(/\s+/).filter(Boolean)
  const tags: string[] = []
  const titleParts: string[] = []
  for (const t of tokens) {
    if (t.startsWith('#') && t.length > 1) tags.push(t)
    else titleParts.push(t)
  }
  return { title: titleParts.join(' ').trim(), tags: tags.slice(0, 12) }
}

function toDateInputValue(ms: number | null | undefined) {
  if (!ms) return ''
  const d = new Date(ms)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function fromDateInputValue(value: string) {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00`)
  const ms = parsed.getTime()
  return Number.isNaN(ms) ? null : ms
}

function parseTagInput(value: string) {
  return value
    .split(/\s+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12)
}

function parseCategoryInput(value: string) {
  const normalized = value.replace(/\s*\/\s*/g, ' | ')
  const parts = normalized
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
  return {
    category: parts[0] ?? null,
    subcategory: parts[1] ?? null,
  }
}

function numberOrNull(value: string) {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function taskProgress(task: Task) {
  if (task.status === 'done') return 100
  if (task.status === 'in_progress') return 70
  if (task.estimateMinutes != null) {
    return Math.max(20, Math.min(90, Math.round(task.estimateMinutes / 2)))
  }
  return 25
}

export function TickTickTasksView(props: {
  tasks: Task[]
  selectedTaskId: string | null
  onSelectTask: (taskId: string) => void
  onCreateTask: (input: { title: string; tags?: string[] }) => void
  onToggleComplete: (taskId: string) => void
  onMoveTask: (taskId: string, status: TaskStatus) => void
  onUpdateTask: (task: Task) => void
}) {
  const [filter, setFilter] = useState<TaskFilterKey>('inbox')
  const [q, setQ] = useState('')
  const [draft, setDraft] = useState('')
  const [layout, setLayout] = useState<'table' | 'kanban' | 'cards'>('table')

  const now = Date.now()
  const todayStart = startOfDayMs(new Date(now))
  const tomorrowStart = startOfDayMs(addDays(new Date(now), 1))
  const next7End = startOfDayMs(addDays(new Date(now), 8))

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const base = props.tasks.filter((t) => {
      if (filter === 'all') return true
      if (filter === 'done') return t.status === 'done'
      if (filter === 'inbox') return t.status !== 'done'
      if (filter === 'today') {
        const due = t.dueAt ?? null
        return t.status !== 'done' && due !== null && due >= todayStart && due < tomorrowStart
      }
      if (filter === 'next7') {
        const due = t.dueAt ?? null
        return t.status !== 'done' && due !== null && due >= todayStart && due < next7End
      }
      return true
    })

    const searched = needle
      ? base.filter((t) => {
          if (t.title.toLowerCase().includes(needle)) return true
          return (t.tags ?? []).some((x) => x.toLowerCase().includes(needle))
        })
      : base

    return [...searched].sort((a, b) => (b.dueAt ?? 0) - (a.dueAt ?? 0) || b.updatedAt - a.updatedAt)
  }, [filter, next7End, props.tasks, q, todayStart, tomorrowStart])

  const counts = useMemo(() => {
    const inbox = props.tasks.filter((t) => t.status !== 'done').length
    const done = props.tasks.filter((t) => t.status === 'done').length
    const today = props.tasks.filter((t) => t.status !== 'done' && t.dueAt != null && t.dueAt >= todayStart && t.dueAt < tomorrowStart).length
    const next7 = props.tasks.filter((t) => t.status !== 'done' && t.dueAt != null && t.dueAt >= todayStart && t.dueAt < next7End).length
    return { inbox, done, today, next7, all: props.tasks.length }
  }, [next7End, props.tasks, todayStart, tomorrowStart])

  function priorityLabel(task: Task) {
    const score = task.urgency ?? task.importance ?? 5
    if (score >= 8) return { label: 'High', score }
    if (score >= 5) return { label: 'Medium', score }
    return { label: 'Low', score }
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] text-[var(--text)] font-['Figtree'] overflow-hidden">
      <div className="px-10 pt-10 pb-6 bg-[var(--bg)]/80 backdrop-blur-xl sticky top-0 z-10 max-w-7xl mx-auto w-full">
        <div className="taskToolbar">
          <div className="taskTitleBlock">
            <h1 className="text-3xl font-extrabold tracking-tight">Tasks</h1>
            <p className="text-sm text-[var(--muted)] font-semibold uppercase tracking-widest">Master your flow.</p>
          </div>

          <div className="taskFilterGroup">
            <div className="taskFilterTabs">
              {(['inbox', 'today', 'next7', 'all', 'done'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`taskFilterBtn ${
                    filter === f ? 'active' : ''
                  }`}
                >
                  <span className="capitalize">{f}</span>
                  <span className="taskFilterCount">{counts[f]}</span>
                </button>
              ))}
            </div>

            <div className="taskFilterSearch">
              <Icon name="dots" size={14} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Filter tasks..."
              />
            </div>
          </div>

          <div className="taskActionGroup">
            <div className="taskLayoutToggle">
              <button
                className={layout === 'table' ? 'active' : ''}
                onClick={() => setLayout('table')}
              >
                Table
              </button>
              <button
                className={layout === 'kanban' ? 'active' : ''}
                onClick={() => setLayout('kanban')}
              >
                Kanban
              </button>
              <button
                className={layout === 'cards' ? 'active' : ''}
                onClick={() => setLayout('cards')}
              >
                Cards
              </button>
            </div>

            <div className="taskQuickAdd">
              <Icon name="plus" size={16} />
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Quick add with #tags..."
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  const parsed = parseQuickTaskInput(draft)
                  if (!parsed.title) return
                  props.onCreateTask({ title: parsed.title, tags: parsed.tags })
                  setDraft('')
                }}
              />
            </div>

            <button
              onClick={() => {
                const parsed = parseQuickTaskInput(draft)
                if (!parsed.title) return
                props.onCreateTask({ title: parsed.title, tags: parsed.tags })
                setDraft('')
              }}
              className="taskAddBtn"
            >
              Add Task
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-10 pb-32 max-w-7xl mx-auto w-full">
        {layout === 'kanban' ? (
          <KanbanView
            tasks={filtered}
            onCreateTask={(title) => props.onCreateTask({ title })}
            onMoveTask={props.onMoveTask}
            onSelectTask={props.onSelectTask}
          />
        ) : layout === 'cards' ? (
          <div className="taskCardGrid">
            <AnimatePresence mode="popLayout">
              {filtered.map((t) => {
                const progress = taskProgress(t)
                const activeDots = Math.max(1, Math.round((progress / 100) * 8))
                const statusLabel =
                  t.status === 'done' ? 'Done' : t.status === 'in_progress' ? 'In Progress' : 'Todo'
                return (
                  <motion.div
                    key={t.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    className={`taskCard ${props.selectedTaskId === t.id ? 'active' : ''}`}
                    style={{ ['--progress' as any]: `${progress}%` }}
                    onClick={() => props.onSelectTask(t.id)}
                  >
                    <div className="taskCardHeader">
                      <div className="taskCardTitle">{t.title}</div>
                      <button
                        type="button"
                        className="taskCardMenu"
                        aria-label="Task menu"
                        onClick={(e) => {
                          e.stopPropagation()
                        }}
                      >
                        <Icon name="dots" size={14} />
                      </button>
                    </div>
                    {t.notes ? <p className="taskCardPreview">{t.notes.split(/\r?\n/)[0]}</p> : null}
                    <div className="taskCardBadges">
                      <span className={`taskCardBadge status ${t.status}`}>{statusLabel}</span>
                      {(t.tags ?? []).slice(0, 2).map((tag) => (
                        <span key={`${t.id}_${tag}`} className="taskCardBadge">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="taskCardProgress">
                      <div className="taskCardProgressLabel">Progress</div>
                      <div className="taskCardProgressValue">{progress}%</div>
                      <div className="taskCardProgressBar">
                        <span />
                      </div>
                      <div className="taskCardDots">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <span key={`${t.id}_dot_${i}`} className={i < activeDots ? 'active' : ''} />
                        ))}
                      </div>
                    </div>
                    <div className="taskCardFooter">
                      <div className="taskCardMeta">
                        <Icon name="bolt" size={14} />
                        <span>{t.dueAt ? formatShortDate(t.dueAt) : 'No due date'}</span>
                      </div>
                      <button
                        type="button"
                        className="taskCardAction"
                        onClick={(e) => {
                          e.stopPropagation()
                          props.onSelectTask(t.id)
                        }}
                      >
                        Recover
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="taskTable">
            <div className="taskTableHeader">
              <div className="taskCol check" />
              <div className="taskCol title">Title</div>
              <div className="taskCol tags">Tags</div>
              <div className="taskCol priority">Priority</div>
              <div className="taskCol due">Due</div>
              <div className="taskCol estimate">Estimate</div>
              <div className="taskCol goal">Goal</div>
              <div className="taskCol project">Project</div>
              <div className="taskCol category">Category</div>
              <div className="taskCol points">Points</div>
              <div className="taskCol importance">Importance</div>
              <div className="taskCol difficulty">Difficulty</div>
            </div>
            <div className="taskTableBody">
              {filtered.length === 0 && <div className="taskTableEmpty">Clear focus</div>}
              <AnimatePresence mode="popLayout">
                {filtered.map((t) => {
                  const priority = priorityLabel(t)
                  const points = pointsForTask(t)
                  const category = [t.category, t.subcategory].filter(Boolean).join(' | ') || ''
                  const isEditing = props.selectedTaskId === t.id
                  return (
                    <motion.div
                      key={t.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className={`taskRow ${props.selectedTaskId === t.id ? 'active' : ''}`}
                      onClick={() => props.onSelectTask(t.id)}
                    >
                      <div className="taskCol check">
                        <button
                          className={t.status === 'done' ? 'taskCheck active' : 'taskCheck'}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            props.onToggleComplete(t.id)
                          }}
                        >
                          {t.status === 'done' && <Icon name="check" size={14} className="text-white" />}
                        </button>
                      </div>
                      <div className="taskCol title">
                        <div className="taskTitleRow">
                          {isEditing ? (
                            <input
                              className="taskInput"
                              value={t.title}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => props.onUpdateTask({ ...t, title: e.target.value })}
                            />
                          ) : (
                            <span className={t.status === 'done' ? 'taskTitle done' : 'taskTitle'}>{t.title}</span>
                          )}
                          {t.notes ? <span className="taskSnippet">{t.notes.split(/\r?\n/)[0]}</span> : null}
                        </div>
                      </div>
                      <div className="taskCol tags">
                        {isEditing ? (
                          <input
                            className="taskInput"
                            value={(t.tags ?? []).join(' ')}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => props.onUpdateTask({ ...t, tags: parseTagInput(e.target.value) })}
                            placeholder="#tag"
                          />
                        ) : (t.tags ?? []).length ? (
                          <div className="taskTagRow">
                            {(t.tags ?? []).slice(0, 3).map((tag) => (
                              <span key={`${t.id}_${tag}`} className="taskTag">
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="taskMuted">—</span>
                        )}
                      </div>
                      <div className="taskCol priority">
                        {isEditing ? (
                          <select
                            className="taskSelect"
                            value={priority.label}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const next = e.target.value
                              const importance = next === 'High' ? 9 : next === 'Medium' ? 6 : 3
                              props.onUpdateTask({ ...t, importance, urgency: importance })
                            }}
                          >
                            <option>Low</option>
                            <option>Medium</option>
                            <option>High</option>
                          </select>
                        ) : (
                          <span className={`taskPill ${priority.label.toLowerCase()}`}>{priority.label}</span>
                        )}
                      </div>
                      <div className="taskCol due">
                        {isEditing ? (
                          <input
                            className="taskInput"
                            type="date"
                            value={toDateInputValue(t.dueAt)}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => props.onUpdateTask({ ...t, dueAt: fromDateInputValue(e.target.value) })}
                          />
                        ) : (
                          <span className={t.dueAt ? 'taskDate' : 'taskMuted'}>
                            {t.dueAt ? formatShortDate(t.dueAt) : '—'}
                          </span>
                        )}
                      </div>
                      <div className="taskCol estimate">
                        {isEditing ? (
                          <input
                            className="taskInput"
                            type="number"
                            min={0}
                            value={t.estimateMinutes ?? ''}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => props.onUpdateTask({ ...t, estimateMinutes: numberOrNull(e.target.value) })}
                          />
                        ) : (
                          <span>{t.estimateMinutes ?? '—'}</span>
                        )}
                      </div>
                      <div className="taskCol goal">
                        {isEditing ? (
                          <input
                            className="taskInput"
                            value={t.goal ?? ''}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => props.onUpdateTask({ ...t, goal: e.target.value || null })}
                          />
                        ) : (
                          <span>{t.goal ?? '—'}</span>
                        )}
                      </div>
                      <div className="taskCol project">
                        {isEditing ? (
                          <input
                            className="taskInput"
                            value={t.project ?? ''}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => props.onUpdateTask({ ...t, project: e.target.value || null })}
                          />
                        ) : (
                          <span>{t.project ?? '—'}</span>
                        )}
                      </div>
                      <div className="taskCol category">
                        {isEditing ? (
                          <input
                            className="taskInput"
                            value={category}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const next = parseCategoryInput(e.target.value)
                              props.onUpdateTask({ ...t, ...next })
                            }}
                            placeholder="Category | Sub"
                          />
                        ) : (
                          <span>{category || '—'}</span>
                        )}
                      </div>
                      <div className="taskCol points">
                        <span>{points ? points.toFixed(1) : '0.0'}</span>
                      </div>
                      <div className="taskCol importance">
                        {isEditing ? (
                          <input
                            className="taskInput"
                            type="number"
                            min={1}
                            max={10}
                            value={t.importance ?? ''}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => props.onUpdateTask({ ...t, importance: numberOrNull(e.target.value) })}
                          />
                        ) : (
                          <span>{t.importance ?? '—'}</span>
                        )}
                      </div>
                      <div className="taskCol difficulty">
                        {isEditing ? (
                          <input
                            className="taskInput"
                            type="number"
                            min={1}
                            max={10}
                            value={t.difficulty ?? ''}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => props.onUpdateTask({ ...t, difficulty: numberOrNull(e.target.value) })}
                          />
                        ) : (
                          <span>{t.difficulty ?? '—'}</span>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
