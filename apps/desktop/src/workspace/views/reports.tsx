import { useMemo, useState } from 'react'
import type { CalendarEvent } from '../../storage/calendar'
import type { Task } from '../../storage/tasks'
import { basePoints, multiplierFor, pointsForMinutes } from '../../scoring/points'
import { Icon } from '../../ui/icons'

type ReportRow = {
  key: string
  label: string
  minutes: number
  points: number
  count: number
}

type ReportMap = Map<string, ReportRow>

function formatMinutes(minutes: number) {
  const total = Math.max(0, Math.round(minutes))
  if (total < 60) return `${total}m`
  const h = Math.floor(total / 60)
  const m = total % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

function formatPoints(points: number) {
  return `${points.toFixed(1)} pts`
}

function addRow(map: ReportMap, key: string, label: string, minutes: number, points: number) {
  if (!key) return
  const existing = map.get(key)
  if (existing) {
    existing.minutes += minutes
    existing.points += points
    existing.count += 1
    return
  }
  map.set(key, { key, label, minutes, points, count: 1 })
}

function toRows(map: ReportMap) {
  return Array.from(map.values()).sort((a, b) => b.points - a.points || b.minutes - a.minutes).slice(0, 20)
}

function eventMinutes(e: CalendarEvent) {
  const raw = Math.round((e.endAt - e.startAt) / (60 * 1000))
  if (Number.isFinite(raw) && raw > 0) return raw
  if (Number.isFinite(e.estimateMinutes ?? NaN)) return Math.max(1, e.estimateMinutes ?? 0)
  return 5
}

function eventPoints(e: CalendarEvent, minutes: number) {
  const base = basePoints(e.importance, e.difficulty)
  const mult = multiplierFor(e.goal ?? null, e.project ?? null)
  return pointsForMinutes(base, minutes, mult)
}

function taskMinutes(t: Task) {
  if (Number.isFinite(t.estimateMinutes ?? NaN)) return Math.max(1, t.estimateMinutes ?? 0)
  return 30
}

function taskPoints(t: Task, minutes: number) {
  const base = basePoints(t.importance, t.difficulty)
  const mult = multiplierFor(t.goal ?? null, t.project ?? null)
  return pointsForMinutes(base, minutes, mult)
}

function ReportCard(props: { title: string; rows: ReportRow[]; icon: any }) {
  return (
    <div className="glassCard space-y-6">
      <div className="flex items-center gap-3">
        <Icon name={props.icon} size={16} className="text-[var(--accent)]" />
        <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted)]">{props.title}</h3>
      </div>
      {props.rows.length === 0 ? (
        <div className="py-10 text-center opacity-30 text-[10px] font-bold uppercase tracking-widest">No data</div>
      ) : (
        <div className="space-y-3">
          {props.rows.map((row) => (
            <div key={row.key} className="flex items-center justify-between p-4 bg-[var(--panel)]/50 rounded-2xl transition-all hover:bg-[var(--panel)] hover:shadow-md group">
              <div className="space-y-1">
                <div className="text-sm font-bold text-[var(--text)]">{row.label}</div>
                <div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-tighter opacity-60">{row.count} entries</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-black text-[var(--text)]">{formatMinutes(row.minutes)}</div>
                <div className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest">{formatPoints(row.points)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ReportsView(props: { events: CalendarEvent[]; tasks: Task[] }) {
  const [range, setRange] = useState<'7d' | '30d' | '90d' | '365d' | 'all'>('30d')
  const [includeLogs, setIncludeLogs] = useState(true)
  const [includeTasks, setIncludeTasks] = useState(true)

  const rangeStart = useMemo(() => {
    const now = Date.now()
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : range === '365d' ? 365 : null
    return days ? now - days * 24 * 60 * 60 * 1000 : null
  }, [range])
  const metrics = useMemo(() => {
    const byTag: ReportMap = new Map()
    const byPerson: ReportMap = new Map()
    const byContext: ReportMap = new Map()
    const byCategory: ReportMap = new Map()
    const bySubcategory: ReportMap = new Map()
    const byGoal: ReportMap = new Map()
    const byProject: ReportMap = new Map()

    const startAt = rangeStart

    let totalMinutes = 0
    let totalPoints = 0
    let entryCount = 0

    for (const e of props.events) {
      if (e.kind === 'episode') continue
      if (!includeLogs && e.kind === 'log') continue
      if (startAt != null && e.startAt < startAt) continue
      const minutes = eventMinutes(e)
      const points = eventPoints(e, minutes)
      totalMinutes += minutes
      totalPoints += points
      entryCount += 1

      for (const tag of e.tags ?? []) addRow(byTag, tag, tag, minutes, points)
      for (const ctx of e.contexts ?? []) addRow(byContext, ctx, `+${ctx}`, minutes, points)
      for (const person of e.people ?? []) addRow(byPerson, person, person, minutes, points)
      if (e.category) addRow(byCategory, e.category, e.category, minutes, points)
      if (e.subcategory) addRow(bySubcategory, e.subcategory, e.subcategory, minutes, points)
      if (e.goal) addRow(byGoal, e.goal, e.goal, minutes, points)
      if (e.project) addRow(byProject, e.project, e.project, minutes, points)
    }

    if (includeTasks) {
      for (const t of props.tasks) {
        const ref = t.completedAt ?? t.updatedAt ?? t.createdAt
        if (startAt != null && ref < startAt) continue
        const minutes = taskMinutes(t)
        const points = taskPoints(t, minutes)
        totalMinutes += minutes
        totalPoints += points
        entryCount += 1

        for (const tag of t.tags ?? []) addRow(byTag, tag, tag, minutes, points)
        for (const ctx of t.contexts ?? []) addRow(byContext, ctx, `+${ctx}`, minutes, points)
        if (t.category) addRow(byCategory, t.category, t.category, minutes, points)
        if (t.subcategory) addRow(bySubcategory, t.subcategory, t.subcategory, minutes, points)
        if (t.goal) addRow(byGoal, t.goal, t.goal, minutes, points)
        if (t.project) addRow(byProject, t.project, t.project, minutes, points)
      }
    }

    return {
      totalMinutes,
      totalPoints,
      entryCount,
      byTag: toRows(byTag),
      byPerson: toRows(byPerson),
      byContext: toRows(byContext),
      byCategory: toRows(byCategory),
      bySubcategory: toRows(bySubcategory),
      byGoal: toRows(byGoal),
      byProject: toRows(byProject),
    }
  }, [includeLogs, includeTasks, props.events, props.tasks, rangeStart])

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] text-[var(--text)] font-['Figtree'] overflow-hidden">
      <div className="px-10 pt-10 pb-6 bg-[var(--bg)]/80 backdrop-blur-xl sticky top-0 z-10 space-y-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-gradient">Reports</h1>
            <p className="text-sm text-[var(--muted)] font-semibold uppercase tracking-widest">Deep dive into your data.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex p-1 bg-white/50 backdrop-blur border border-white/20 rounded-2xl shadow-sm">
              {(['7d', '30d', '90d', '365d', 'all'] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setRange(k)}
                  className={`px-6 py-2 text-xs font-bold rounded-xl transition-all ${
                    range === k ? 'bg-white shadow-md text-[var(--text)]' : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <span className="uppercase">{k}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
            <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded-lg border-2 border-[#E5E5EA] checked:bg-[#D95D39] checked:border-[#D95D39] transition-all appearance-none"
                        checked={includeLogs} 
                        onChange={(e) => setIncludeLogs(e.target.checked)} 
                    />
                    <span className="text-xs font-bold text-[var(--muted)] group-hover:text-[var(--text)] transition-colors uppercase tracking-widest">Logs</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded-lg border-2 border-[#E5E5EA] checked:bg-[#D95D39] checked:border-[#D95D39] transition-all appearance-none"
                        checked={includeTasks} 
                        onChange={(e) => setIncludeTasks(e.target.checked)} 
                    />
                    <span className="text-xs font-bold text-[var(--muted)] group-hover:text-[var(--text)] transition-colors uppercase tracking-widest">Tasks</span>
                </label>
            </div>
            
            <div className="h-8 w-px bg-black/5" />

            <div className="flex items-center gap-10">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Total Time</span>
                    <span className="text-lg font-black text-[var(--text)]">{formatMinutes(metrics.totalMinutes)}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Total Impact</span>
                    <span className="text-lg font-black text-[var(--accent)]">{formatPoints(metrics.totalPoints)}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Entries</span>
                    <span className="text-lg font-black text-[var(--accent)]">{metrics.entryCount}</span>
                </div>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-10 pb-32 max-w-7xl mx-auto w-full">
        <div className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              <ReportCard title="Tags" rows={metrics.byTag} icon="tag" />
              <ReportCard title="People" rows={metrics.byPerson} icon="users" />
              <ReportCard title="Contexts" rows={metrics.byContext} icon="bolt" />
              <ReportCard title="Categories" rows={metrics.byCategory} icon="folder" />
              <ReportCard title="Subcategories" rows={metrics.bySubcategory} icon="folder" />
              <ReportCard title="Goals" rows={metrics.byGoal} icon="target" />
              <ReportCard title="Projects" rows={metrics.byProject} icon="briefcase" />
          </div>
        </div>
      </div>
    </div>
  )
}
