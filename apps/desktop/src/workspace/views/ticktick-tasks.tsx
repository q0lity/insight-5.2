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

export function TickTickTasksView(props: {
  tasks: Task[]
  selectedTaskId: string | null
  onSelectTask: (taskId: string) => void
  onCreateTask: (input: { title: string; tags?: string[] }) => void
  onToggleComplete: (taskId: string) => void
  onMoveTask: (taskId: string, status: TaskStatus) => void
}) {
  const [filter, setFilter] = useState<TaskFilterKey>('inbox')
  const [q, setQ] = useState('')
  const [draft, setDraft] = useState('')
  const [layout, setLayout] = useState<'table' | 'kanban'>('table')

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
    <div className="flex flex-col h-full bg-[#F8F7F4] text-[#1C1C1E] font-['Figtree'] overflow-hidden">
      <div className="px-10 pt-10 pb-6 bg-[#F8F7F4]/80 backdrop-blur-xl sticky top-0 z-10 space-y-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight">Tasks</h1>
            <p className="text-sm text-[#86868B] font-semibold uppercase tracking-widest">Master your flow.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex p-1 bg-white/50 backdrop-blur border border-white/20 rounded-2xl shadow-sm">
              <button
                className={`px-5 py-2 text-xs font-bold rounded-xl transition-all ${layout === 'table' ? 'bg-white shadow-md text-[#1C1C1E]' : 'text-[#86868B]'}`}
                onClick={() => setLayout('table')}
              >
                Table
              </button>
              <button
                className={`px-5 py-2 text-xs font-bold rounded-xl transition-all ${layout === 'kanban' ? 'bg-white shadow-md text-[#1C1C1E]' : 'text-[#86868B]'}`}
                onClick={() => setLayout('kanban')}
              >
                Kanban
              </button>
            </div>
            <div className="flex-1 max-w-md relative">
              <input 
                className="w-full h-11 bg-white/50 border border-black/5 rounded-2xl px-10 text-sm font-medium focus:bg-white focus:shadow-md transition-all outline-none"
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
              <div className="absolute left-3.5 top-3.5 opacity-30">
                  <Icon name="plus" size={16} />
              </div>
            </div>
            <button 
              onClick={() => {
                const parsed = parseQuickTaskInput(draft)
                if (!parsed.title) return
                props.onCreateTask({ title: parsed.title, tags: parsed.tags })
                setDraft('')
              }}
              className="h-11 px-6 bg-[#D95D39] text-white rounded-2xl font-bold shadow-lg shadow-[#D95D39]/20 hover:scale-105 active:scale-95 transition-all"
            >
              Add Task
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex p-1 bg-white/50 backdrop-blur border border-white/20 rounded-2xl shadow-sm">
            {(['inbox', 'today', 'next7', 'all', 'done'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-6 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                  filter === f ? 'bg-white shadow-md text-[#1C1C1E]' : 'text-[#86868B] hover:text-[#1C1C1E]'
                }`}
              >
                <span className="capitalize">{f}</span>
                <span className="opacity-40 text-[10px]">{counts[f]}</span>
              </button>
            ))}
          </div>

          <div className="h-8 w-px bg-black/5" />

          <div className="flex-1 relative">
            <input 
              className="w-full h-10 bg-transparent border-none px-10 text-sm font-medium focus:bg-white/30 rounded-xl transition-all outline-none"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter tasks..."
            />
            <div className="absolute left-3.5 top-3 opacity-30">
                <Icon name="dots" size={14} />
            </div>
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
                  const category = [t.category, t.subcategory].filter(Boolean).join(' | ') || '—'
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
                          <span className={t.status === 'done' ? 'taskTitle done' : 'taskTitle'}>{t.title}</span>
                          {t.notes ? <span className="taskSnippet">{t.notes.split(/\r?\n/)[0]}</span> : null}
                        </div>
                      </div>
                      <div className="taskCol tags">
                        {(t.tags ?? []).length ? (
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
                        <span className={`taskPill ${priority.label.toLowerCase()}`}>{priority.label}</span>
                      </div>
                      <div className="taskCol due">
                        <span className={t.dueAt ? 'taskDate' : 'taskMuted'}>
                          {t.dueAt ? formatShortDate(t.dueAt) : '—'}
                        </span>
                      </div>
                      <div className="taskCol estimate">
                        <span>{t.estimateMinutes ?? '—'}</span>
                      </div>
                      <div className="taskCol goal">
                        <span>{t.goal ?? '—'}</span>
                      </div>
                      <div className="taskCol project">
                        <span>{t.project ?? '—'}</span>
                      </div>
                      <div className="taskCol category">
                        <span>{category}</span>
                      </div>
                      <div className="taskCol points">
                        <span>{points ? points.toFixed(1) : '0.0'}</span>
                      </div>
                      <div className="taskCol importance">
                        <span>{t.importance ?? '—'}</span>
                      </div>
                      <div className="taskCol difficulty">
                        <span>{t.difficulty ?? '—'}</span>
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
