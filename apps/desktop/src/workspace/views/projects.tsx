import { useEffect, useMemo, useState } from 'react'
import type { CalendarEvent } from '../../storage/calendar'
import type { Task } from '../../storage/tasks'
import { Icon } from '../../ui/icons'
import { MetaEditor } from '../../ui/MetaEditor'
import { emptySharedMeta, loadProjectDefs, saveProjectDefs, type ProjectDef } from '../../storage/ecosystem'

function normalizeKey(raw: string | null | undefined) {
  return (raw ?? '').trim().toLowerCase()
}

function makeId() {
  return `project_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

type ProjectStats = {
  minutes: number
  eventCount: number
  taskCount: number
  lastAt: number
}

export function ProjectsView(props: {
  events: CalendarEvent[]
  tasks: Task[]
  projectName?: string | null
  onSelectProject?: (name: string | null) => void
}) {
  const [defs, setDefs] = useState<ProjectDef[]>(() => loadProjectDefs())
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [activeKey, setActiveKey] = useState<string | null>(() => {
    const key = normalizeKey(props.projectName)
    return key || null
  })

  useEffect(() => {
    if (!props.projectName) {
      setActiveKey(null)
      return
    }
    const key = normalizeKey(props.projectName)
    if (!key) return
    ensureProjectDef(props.projectName)
    setActiveKey(key)
  }, [props.projectName])

  const projectNames = useMemo(() => {
    const out = new Map<string, string>()
    for (const def of defs) out.set(normalizeKey(def.name), def.name)
    for (const e of props.events) {
      if (!e.project) continue
      const key = normalizeKey(e.project)
      if (!key) continue
      if (!out.has(key)) out.set(key, e.project)
    }
    for (const t of props.tasks) {
      if (!t.project) continue
      const key = normalizeKey(t.project)
      if (!key) continue
      if (!out.has(key)) out.set(key, t.project)
    }
    return out
  }, [defs, props.events, props.tasks])

  const statsByKey = useMemo(() => {
    const byKey = new Map<string, ProjectStats>()
    const ensure = (key: string) => {
      const existing = byKey.get(key)
      if (existing) return existing
      const next = { minutes: 0, eventCount: 0, taskCount: 0, lastAt: 0 }
      byKey.set(key, next)
      return next
    }

    for (const e of props.events) {
      const key = normalizeKey(e.project)
      if (!key) continue
      const row = ensure(key)
      const minutes = Math.max(0, Math.round((e.endAt - e.startAt) / (60 * 1000)))
      row.minutes += minutes
      row.eventCount += 1
      row.lastAt = Math.max(row.lastAt, e.startAt)
    }

    for (const t of props.tasks) {
      const key = normalizeKey(t.project)
      if (!key) continue
      const row = ensure(key)
      row.taskCount += 1
      if (typeof t.estimateMinutes === 'number') row.minutes += t.estimateMinutes
      const taskAt = t.scheduledAt ?? t.dueAt ?? t.createdAt
      if (taskAt) row.lastAt = Math.max(row.lastAt, taskAt)
    }

    return byKey
  }, [props.events, props.tasks])

  const projectRows = useMemo(() => {
    return Array.from(projectNames.entries())
      .map(([key, name]) => {
        const def = defs.find((d) => normalizeKey(d.name) === key) ?? null
        const stats = statsByKey.get(key) ?? { minutes: 0, eventCount: 0, taskCount: 0, lastAt: 0 }
        return { key, name, def, stats }
      })
      .filter((row) => row.name.toLowerCase().includes(query.trim().toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [defs, projectNames, query, statsByKey])

  function updateDefs(next: ProjectDef[]) {
    setDefs(next)
    saveProjectDefs(next)
  }

  function ensureProjectDef(name: string) {
    const key = normalizeKey(name)
    if (!key) return null
    const existing = defs.find((d) => normalizeKey(d.name) === key)
    if (existing) return existing
    const next: ProjectDef = { id: makeId(), name, createdAt: Date.now(), meta: emptySharedMeta() }
    const nextDefs = [next, ...defs]
    updateDefs(nextDefs)
    return next
  }

  const activeProject = activeKey ? defs.find((d) => normalizeKey(d.name) === activeKey) ?? null : null
  const activeStats = activeKey ? statsByKey.get(activeKey) ?? null : null
  const linkedGoals = useMemo(() => {
    if (!activeProject) return []
    const out = new Set<string>()
    for (const e of props.events) {
      if (normalizeKey(e.project) === activeKey && e.goal) out.add(e.goal)
    }
    for (const t of props.tasks) {
      if (normalizeKey(t.project) === activeKey && t.goal) out.add(t.goal)
    }
    return Array.from(out)
  }, [activeKey, activeProject, props.events, props.tasks])

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] text-[var(--text)] font-['Figtree'] overflow-hidden">
      <div className="px-10 pt-10 pb-6 bg-[var(--bg)]/80 backdrop-blur-xl sticky top-0 z-10 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight">Projects</h1>
            <p className="text-sm text-[var(--muted)] font-semibold">Organize goals, tags, and linked habits in one place.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-white/50 backdrop-blur border border-white/20 rounded-full shadow-sm flex items-center gap-2">
              <Icon name="briefcase" size={14} className="text-[var(--accent)]" />
              <span className="text-xs font-bold">{projectRows.length} Projects</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 mt-6">
          <div className="flex-1 min-w-[240px] max-w-md relative">
            <input
              className="w-full h-11 bg-white/50 border border-black/5 rounded-2xl px-10 text-sm font-medium focus:bg-white focus:shadow-md transition-all outline-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter projects..."
            />
            <div className="absolute left-3.5 top-3.5 opacity-30">
              <Icon name="tag" size={16} />
            </div>
          </div>
          <div className="flex items-center gap-2 min-w-[260px] max-w-md w-full">
            <input
              className="flex-1 h-11 bg-white/50 border border-black/5 rounded-2xl px-4 text-sm font-medium focus:bg-white focus:shadow-md transition-all outline-none"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="New project name..."
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                const name = draft.trim()
                if (!name) return
                const def = ensureProjectDef(name)
                if (def) setActiveKey(normalizeKey(def.name))
                props.onSelectProject?.(name)
                setDraft('')
              }}
            />
            <button
              className="h-11 px-4 rounded-2xl bg-white/70 border border-black/5 text-xs font-bold hover:bg-[var(--panel)] transition-all"
              onClick={() => {
                const name = draft.trim()
                if (!name) return
                const def = ensureProjectDef(name)
                if (def) setActiveKey(normalizeKey(def.name))
                props.onSelectProject?.(name)
                setDraft('')
              }}
              disabled={!draft.trim()}
            >
              Add
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-10 pb-32 max-w-7xl mx-auto w-full">
        <div className="flex gap-8 h-full">
          <div className="w-full flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
            {projectRows.length === 0 && <div className="py-20 text-center opacity-30 font-bold uppercase text-xs tracking-widest">No projects yet</div>}
            {projectRows.map((row) => (
              <button
                key={row.key}
                className={`goalListItem ${activeKey === row.key ? 'active' : ''}`}
                onClick={() => {
                  const def = ensureProjectDef(row.name)
                  if (def) {
                    setActiveKey(normalizeKey(def.name))
                    props.onSelectProject?.(def.name)
                  }
                }}
              >
                <div className="goalListTitleRow">
                  <h3 className="goalListTitle">{row.name}</h3>
                  <Icon name="chevronRight" size={16} className="goalListChevron" />
                </div>
                <div className="goalListMeta">
                  <span className="goalListDate">{row.stats.lastAt ? new Date(row.stats.lastAt).toLocaleDateString() : 'No activity yet'}</span>
                  <span className="goalListStat">
                    <Icon name="calendar" size={10} className="goalListStatIcon calendar" />
                    {Math.round(row.stats.minutes)}m
                  </span>
                  <span className="goalListStat">
                    <Icon name="bolt" size={10} className="goalListStatIcon" />
                    {row.stats.eventCount + row.stats.taskCount} items
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="flex-1 pageHero overflow-hidden flex flex-col">
            {!activeProject ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-20 space-y-4">
                <Icon name="briefcase" size={64} />
                <p className="font-bold uppercase tracking-[0.2em] text-sm">Select a project to explore</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto px-10 py-8 space-y-6">
                  <div className="goalKpiGrid">
                    <div className="goalKpiCard">
                      <div className="goalKpiLabel">Time spent</div>
                      <div className="goalKpiValue">{Math.round(activeStats?.minutes ?? 0)}m</div>
                      <div className="goalKpiMeta">Project-linked activity</div>
                    </div>
                    <div className="goalKpiCard">
                      <div className="goalKpiLabel">Events</div>
                      <div className="goalKpiValue">{activeStats?.eventCount ?? 0}</div>
                      <div className="goalKpiMeta">Scheduled sessions</div>
                    </div>
                    <div className="goalKpiCard">
                      <div className="goalKpiLabel">Tasks</div>
                      <div className="goalKpiValue">{activeStats?.taskCount ?? 0}</div>
                      <div className="goalKpiMeta">Linked tasks</div>
                    </div>
                    <div className="goalKpiCard">
                      <div className="goalKpiLabel">Last activity</div>
                      <div className="goalKpiValue">
                        {activeStats?.lastAt ? new Date(activeStats.lastAt).toLocaleDateString() : '—'}
                      </div>
                      <div className="goalKpiMeta">Most recent check-in</div>
                    </div>
                  </div>

                  <div className="glassCard p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Project details</div>
                        <div className="text-lg font-bold">{activeProject.name}</div>
                      </div>
                    </div>
                    <MetaEditor
                      value={activeProject.meta}
                      onChange={(meta) => {
                        const next = defs.map((p) => (p.id === activeProject.id ? { ...p, meta } : p))
                        updateDefs(next)
                      }}
                    />
                  </div>

                  <div className="glassCard p-6 space-y-4">
                    <div className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Linked goals</div>
                    {linkedGoals.length === 0 ? (
                      <div className="text-sm text-[var(--muted)]">No linked goals yet.</div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {linkedGoals.map((goal) => (
                          <span key={goal} className="goalProjectTag">
                            {goal}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
