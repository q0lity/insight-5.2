import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Task, TaskStatus } from '../../storage/tasks'
import { pointsForTask } from '../../scoring/points'
import { Icon } from '../../ui/icons'
import { KanbanView } from './kanban'

type TaskFilterKey = 'inbox' | 'today' | 'next7' | 'all' | 'done'
type TaskColumnKey =
  | 'check'
  | 'title'
  | 'start'
  | 'tags'
  | 'priority'
  | 'due'
  | 'estimate'
  | 'goal'
  | 'project'
  | 'category'
  | 'points'
  | 'importance'
  | 'difficulty'
type TaskSortKey =
  | 'title'
  | 'priority'
  | 'due'
  | 'estimate'
  | 'goal'
  | 'project'
  | 'category'
  | 'points'
  | 'importance'
  | 'difficulty'
type TaskStyleVars = CSSProperties & {
  '--progress'?: string
  '--task-grid'?: string
}

const TASK_COLUMN_STORAGE_KEY = 'insight.taskColumns.v1'
const TASK_COLUMN_ORDER: TaskColumnKey[] = [
  'check',
  'title',
  'start',
  'tags',
  'priority',
  'due',
  'estimate',
  'goal',
  'project',
  'category',
  'points',
  'importance',
  'difficulty',
]
const TASK_COLUMN_DEFAULTS: TaskColumnKey[] = [
  'tags',
  'priority',
  'due',
  'estimate',
  'goal',
  'project',
  'category',
  'points',
  'importance',
  'difficulty',
]
const TASK_COLUMN_LOCKED = new Set<TaskColumnKey>(['check', 'title', 'start'])
const TASK_COLUMN_LABELS: Record<TaskColumnKey, string> = {
  check: '',
  title: 'Title',
  start: 'Start',
  tags: 'Tags',
  priority: 'Priority',
  due: 'Due',
  estimate: 'Estimate',
  goal: 'Goal',
  project: 'Project',
  category: 'Category',
  points: 'Points',
  importance: 'Importance',
  difficulty: 'Difficulty',
}
const TASK_COLUMN_WIDTHS: Record<TaskColumnKey, string> = {
  check: '48px',
  title: 'minmax(220px, 2fr)',
  start: '90px',
  tags: 'minmax(140px, 1fr)',
  priority: '110px',
  due: '110px',
  estimate: '110px',
  goal: '140px',
  project: '140px',
  category: 'minmax(160px, 1fr)',
  points: '90px',
  importance: '110px',
  difficulty: '110px',
}

function isTaskColumnKey(value: string): value is TaskColumnKey {
  return TASK_COLUMN_ORDER.includes(value as TaskColumnKey)
}

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
  const [sortKey, setSortKey] = useState<TaskSortKey>('due')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [columnMenuOpen, setColumnMenuOpen] = useState(false)
  const columnMenuRef = useRef<HTMLDivElement | null>(null)
  const [visibleColumns, setVisibleColumns] = useState<TaskColumnKey[]>(() => {
    if (typeof window === 'undefined') return TASK_COLUMN_DEFAULTS
    try {
      const stored = window.localStorage.getItem(TASK_COLUMN_STORAGE_KEY)
      if (!stored) return TASK_COLUMN_DEFAULTS
      const parsed = JSON.parse(stored)
      if (!Array.isArray(parsed)) return TASK_COLUMN_DEFAULTS
      const next = parsed
        .filter((col): col is TaskColumnKey => typeof col === 'string' && isTaskColumnKey(col))
        .filter((col) => !TASK_COLUMN_LOCKED.has(col))
      return next.length ? next : TASK_COLUMN_DEFAULTS
    } catch {
      return TASK_COLUMN_DEFAULTS
    }
  })

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

    const dir = sortDir === 'asc' ? 1 : -1
    const priorityScore = (task: Task) => task.urgency ?? task.importance ?? 0
    const categoryLabel = (task: Task) => [task.category, task.subcategory].filter(Boolean).join(' | ')
    const sortNumber = (aVal: number, bVal: number) => (aVal - bVal) * dir
    const sortString = (aVal: string, bVal: string) => aVal.localeCompare(bVal) * dir

    return [...searched].sort((a, b) => {
      switch (sortKey) {
        case 'title':
          return sortString(a.title, b.title) || b.updatedAt - a.updatedAt
        case 'priority':
          return sortNumber(priorityScore(a), priorityScore(b)) || b.updatedAt - a.updatedAt
        case 'due': {
          const aDue = a.dueAt ?? (sortDir === 'asc' ? Number.POSITIVE_INFINITY : 0)
          const bDue = b.dueAt ?? (sortDir === 'asc' ? Number.POSITIVE_INFINITY : 0)
          return sortNumber(aDue, bDue) || b.updatedAt - a.updatedAt
        }
        case 'estimate':
          return sortNumber(a.estimateMinutes ?? 0, b.estimateMinutes ?? 0) || b.updatedAt - a.updatedAt
        case 'goal':
          return sortString(a.goal ?? '', b.goal ?? '') || b.updatedAt - a.updatedAt
        case 'project':
          return sortString(a.project ?? '', b.project ?? '') || b.updatedAt - a.updatedAt
        case 'category':
          return sortString(categoryLabel(a), categoryLabel(b)) || b.updatedAt - a.updatedAt
        case 'points':
          return sortNumber(pointsForTask(a), pointsForTask(b)) || b.updatedAt - a.updatedAt
        case 'importance':
          return sortNumber(a.importance ?? 0, b.importance ?? 0) || b.updatedAt - a.updatedAt
        case 'difficulty':
          return sortNumber(a.difficulty ?? 0, b.difficulty ?? 0) || b.updatedAt - a.updatedAt
        default:
          return b.updatedAt - a.updatedAt
      }
    })
  }, [filter, next7End, props.tasks, q, sortDir, sortKey, todayStart, tomorrowStart])

  const counts = useMemo(() => {
    const inbox = props.tasks.filter((t) => t.status !== 'done').length
    const done = props.tasks.filter((t) => t.status === 'done').length
    const today = props.tasks.filter((t) => t.status !== 'done' && t.dueAt != null && t.dueAt >= todayStart && t.dueAt < tomorrowStart).length
    const next7 = props.tasks.filter((t) => t.status !== 'done' && t.dueAt != null && t.dueAt >= todayStart && t.dueAt < next7End).length
    return { inbox, done, today, next7, all: props.tasks.length }
  }, [next7End, props.tasks, todayStart, tomorrowStart])

  useEffect(() => {
    if (!columnMenuOpen) return
    const handleClick = (event: MouseEvent) => {
      if (!columnMenuRef.current) return
      if (columnMenuRef.current.contains(event.target as Node)) return
      setColumnMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [columnMenuOpen])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(TASK_COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns))
  }, [visibleColumns])

  const visibleColumnSet = useMemo(() => {
    const set = new Set<TaskColumnKey>(TASK_COLUMN_LOCKED)
    visibleColumns.forEach((col) => set.add(col))
    return set
  }, [visibleColumns])
  const taskGrid = useMemo(
    () => TASK_COLUMN_ORDER.filter((col) => visibleColumnSet.has(col)).map((col) => TASK_COLUMN_WIDTHS[col]).join(' '),
    [visibleColumnSet]
  )
  const columnChoices = useMemo(
    () => TASK_COLUMN_ORDER.filter((col) => !TASK_COLUMN_LOCKED.has(col)),
    []
  )

  function toggleColumn(key: TaskColumnKey) {
    if (TASK_COLUMN_LOCKED.has(key)) return
    setVisibleColumns((prev) => {
      const has = prev.includes(key)
      const next = has ? prev.filter((col) => col !== key) : [...prev, key]
      return TASK_COLUMN_ORDER.filter((col) => next.includes(col) && !TASK_COLUMN_LOCKED.has(col))
    })
  }

  function resetColumns() {
    setVisibleColumns(TASK_COLUMN_DEFAULTS)
  }

  function toggleSort(key: TaskSortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDir(key === 'title' ? 'asc' : 'desc')
  }

  function priorityLabel(task: Task) {
    const score = task.urgency ?? task.importance ?? 5
    if (score >= 8) return { label: 'High', score, dotClass: 'high' }
    if (score >= 5) return { label: 'Medium', score, dotClass: 'medium' }
    return { label: 'Low', score, dotClass: 'low' }
  }

  function getDateClass(dueAt: number | null | undefined) {
    if (!dueAt) return ''
    if (dueAt < todayStart) return 'overdue'
    if (dueAt >= todayStart && dueAt < tomorrowStart) return 'today'
    return ''
  }

  function isColumnVisible(key: TaskColumnKey) {
    return visibleColumnSet.has(key)
  }

  function renderSortHeader(label: string, key: TaskSortKey) {
    const active = sortKey === key
    return (
      <button
        type="button"
        className={`taskColSort ${active ? 'active' : ''}`}
        onClick={(e) => {
          e.stopPropagation()
          toggleSort(key)
        }}
      >
        <span>{label}</span>
        <Icon
          name="chevronDown"
          size={12}
          className={`taskSortIcon ${active ? sortDir : 'idle'}`}
        />
      </button>
    )
  }

  const taskTableStyle: TaskStyleVars = { '--task-grid': taskGrid }

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] text-[var(--text)] font-['Figtree'] overflow-hidden">
      <div className="px-10 pt-10 pb-6 bg-[var(--bg)]/80 backdrop-blur-xl sticky top-0 z-10 max-w-7xl mx-auto w-full">
        <div className="taskToolbar">
          <div className="taskTitleBlock">
            <h1 className="text-3xl font-extrabold tracking-tight">Tasks</h1>
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

            <div className="taskColumnPicker" ref={columnMenuRef}>
              <button
                className="taskColumnBtn"
                type="button"
                onClick={() => setColumnMenuOpen((open) => !open)}
                aria-expanded={columnMenuOpen}
              >
                Columns
                <Icon name="chevronDown" size={12} />
              </button>
              {columnMenuOpen ? (
                <div className="taskColumnMenu">
                  <div className="taskColumnMenuTitle">Columns</div>
                  {columnChoices.map((col) => (
                    <label key={col} className="taskColumnOption">
                      <input
                        type="checkbox"
                        checked={visibleColumnSet.has(col)}
                        onChange={() => toggleColumn(col)}
                      />
                      <span>{TASK_COLUMN_LABELS[col]}</span>
                    </label>
                  ))}
                  <button className="taskColumnReset" type="button" onClick={resetColumns}>
                    Reset
                  </button>
                </div>
              ) : null}
            </div>

            <div className="taskQuickAddWrapper">
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
              {draft.trim() && (() => {
                const parsed = parseQuickTaskInput(draft)
                return (
                  <div className="taskQuickAddPreview">
                    <div className="taskQuickAddPreviewTitle">Preview</div>
                    <div className="taskQuickAddPreviewContent">
                      {parsed.title && (
                        <div className="taskQuickAddPreviewRow">
                          <span className="taskQuickAddPreviewLabel">Title</span>
                          <span>{parsed.title}</span>
                        </div>
                      )}
                      {parsed.tags.length > 0 && (
                        <div className="taskQuickAddPreviewRow">
                          <span className="taskQuickAddPreviewLabel">Tags</span>
                          <div className="taskQuickAddPreviewTags">
                            {parsed.tags.map((tag) => (
                              <span key={tag} className="taskQuickAddPreviewTag">{tag}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="taskQuickAddHint">
                      Press <kbd>Enter</kbd> to create task
                    </div>
                  </div>
                )
              })()}
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
                const actionLabel = t.status === 'done' ? 'Done' : t.status === 'in_progress' ? 'Resume' : 'Start'
                const canStart = t.status !== 'done'
                const progressStyle: TaskStyleVars = { '--progress': `${progress}%` }
                return (
                  <motion.div
                    key={t.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    className={`taskCard ${props.selectedTaskId === t.id ? 'active' : ''}`}
                    style={progressStyle}
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
                        disabled={!canStart}
                        onClick={(e) => {
                          e.stopPropagation()
                          props.onSelectTask(t.id)
                          if (!canStart) return
                          props.onMoveTask(t.id, 'in_progress')
                        }}
                      >
                        {actionLabel}
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="taskTable" style={taskTableStyle}>
            <div className="taskTableHeader">
              {isColumnVisible('check') ? <div className="taskCol check" /> : null}
              {isColumnVisible('title') ? (
                <div className="taskCol title">{renderSortHeader(TASK_COLUMN_LABELS.title, 'title')}</div>
              ) : null}
              {isColumnVisible('start') ? <div className="taskCol start">{TASK_COLUMN_LABELS.start}</div> : null}
              {isColumnVisible('tags') ? <div className="taskCol tags">{TASK_COLUMN_LABELS.tags}</div> : null}
              {isColumnVisible('priority') ? (
                <div className="taskCol priority">{renderSortHeader(TASK_COLUMN_LABELS.priority, 'priority')}</div>
              ) : null}
              {isColumnVisible('due') ? (
                <div className="taskCol due">{renderSortHeader(TASK_COLUMN_LABELS.due, 'due')}</div>
              ) : null}
              {isColumnVisible('estimate') ? (
                <div className="taskCol estimate">{renderSortHeader(TASK_COLUMN_LABELS.estimate, 'estimate')}</div>
              ) : null}
              {isColumnVisible('goal') ? (
                <div className="taskCol goal">{renderSortHeader(TASK_COLUMN_LABELS.goal, 'goal')}</div>
              ) : null}
              {isColumnVisible('project') ? (
                <div className="taskCol project">{renderSortHeader(TASK_COLUMN_LABELS.project, 'project')}</div>
              ) : null}
              {isColumnVisible('category') ? (
                <div className="taskCol category">{renderSortHeader(TASK_COLUMN_LABELS.category, 'category')}</div>
              ) : null}
              {isColumnVisible('points') ? (
                <div className="taskCol points">{renderSortHeader(TASK_COLUMN_LABELS.points, 'points')}</div>
              ) : null}
              {isColumnVisible('importance') ? (
                <div className="taskCol importance">{renderSortHeader(TASK_COLUMN_LABELS.importance, 'importance')}</div>
              ) : null}
              {isColumnVisible('difficulty') ? (
                <div className="taskCol difficulty">{renderSortHeader(TASK_COLUMN_LABELS.difficulty, 'difficulty')}</div>
              ) : null}
            </div>
            <div className="taskTableBody">
              {filtered.length === 0 && <div className="taskTableEmpty">Clear focus</div>}
              <AnimatePresence mode="popLayout">
                {filtered.map((t) => {
                  const priority = priorityLabel(t)
                  const points = pointsForTask(t)
                  const category = [t.category, t.subcategory].filter(Boolean).join(' | ') || ''
                  const isEditing = props.selectedTaskId === t.id
                  const startLabel = t.status === 'done' ? 'Done' : t.status === 'in_progress' ? 'Resume' : 'Start'
                  const canStart = t.status !== 'done'
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
                      {isColumnVisible('check') ? (
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
                      ) : null}
                      {isColumnVisible('title') ? (
                        <div className="taskCol title">
                          <div className="taskTitleRow">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span className={`taskPriorityDot ${priority.dotClass}`} />
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
                            </div>
                            {t.notes ? <span className="taskSnippet">{t.notes.split(/\r?\n/)[0]}</span> : null}
                          </div>
                        </div>
                      ) : null}
                      {isColumnVisible('start') ? (
                        <div className="taskCol start">
                          <button
                            type="button"
                            className={`taskTableAction ${t.status === 'in_progress' ? 'active' : ''}`}
                            disabled={!canStart}
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              props.onSelectTask(t.id)
                              if (!canStart) return
                              props.onMoveTask(t.id, 'in_progress')
                            }}
                          >
                            {startLabel}
                          </button>
                        </div>
                      ) : null}
                      {isColumnVisible('tags') ? (
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
                      ) : null}
                      {isColumnVisible('priority') ? (
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
                      ) : null}
                      {isColumnVisible('due') ? (
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
                            <span className={t.dueAt ? `taskDate ${getDateClass(t.dueAt)}` : 'taskMuted'}>
                              {t.dueAt ? formatShortDate(t.dueAt) : '—'}
                            </span>
                          )}
                        </div>
                      ) : null}
                      {isColumnVisible('estimate') ? (
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
                      ) : null}
                      {isColumnVisible('goal') ? (
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
                      ) : null}
                      {isColumnVisible('project') ? (
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
                      ) : null}
                      {isColumnVisible('category') ? (
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
                      ) : null}
                      {isColumnVisible('points') ? (
                        <div className="taskCol points">
                          <span className="taskPointsBadge">
                            <span className="xp-icon">⚡</span>
                            {points ? points.toFixed(1) : '0.0'}
                          </span>
                        </div>
                      ) : null}
                      {isColumnVisible('importance') ? (
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
                      ) : null}
                      {isColumnVisible('difficulty') ? (
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
                      ) : null}
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
