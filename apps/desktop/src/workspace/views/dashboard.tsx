import { useMemo, useState } from 'react'
import { Icon } from '../../ui/icons'
import type { CalendarEvent } from '../../storage/calendar'
import type { Task } from '../../storage/tasks'
import { basePoints, multiplierFor, pointsForMinutes } from '../../scoring/points'
import { LtBarChart, LtHeatmap, LtLineAreaChart, type SeriesPoint } from '../../ui/life-tracker-charts'

type DashView = 'overview' | 'time' | 'points' | 'radar'
type WidgetGroup = 'overview' | 'time' | 'points' | 'radar'
type DashboardLayout = { order: string[]; hidden: string[] }

const DASH_LAYOUT_KEY = 'insight5.dashboard.layout.v1'

function loadDashboardLayout(defaultOrder: string[]): DashboardLayout {
  try {
    const raw = localStorage.getItem(DASH_LAYOUT_KEY)
    if (!raw) return { order: defaultOrder, hidden: [] }
    const parsed = JSON.parse(raw) as DashboardLayout
    const order = Array.isArray(parsed?.order) ? parsed.order.filter((x) => typeof x === 'string') : defaultOrder
    const hidden = Array.isArray(parsed?.hidden) ? parsed.hidden.filter((x) => typeof x === 'string') : []
    return { order: order.length ? order : defaultOrder, hidden }
  } catch {
    return { order: defaultOrder, hidden: [] }
  }
}

function saveDashboardLayout(layout: DashboardLayout) {
  localStorage.setItem(DASH_LAYOUT_KEY, JSON.stringify(layout))
}

function normalizeLayout(layout: DashboardLayout, defaultOrder: string[]) {
  const orderSet = new Set(layout.order)
  const nextOrder = [...layout.order.filter((x) => defaultOrder.includes(x)), ...defaultOrder.filter((x) => !orderSet.has(x))]
  const nextHidden = layout.hidden.filter((x) => defaultOrder.includes(x))
  return { order: nextOrder, hidden: nextHidden }
}

function startOfDayMs(ms: number) {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function addDaysMs(ms: number, days: number) {
  return ms + days * 24 * 60 * 60 * 1000
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function isoDate(ms: number) {
  const d = new Date(ms)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function sumByKey(items: Array<{ key: string; value: number }>) {
  const out = new Map<string, number>()
  for (const it of items) out.set(it.key, (out.get(it.key) ?? 0) + it.value)
  return Array.from(out.entries())
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value)
}

function pointsForRange(e: CalendarEvent, mins: number) {
  if (e.kind === 'log') return 0
  const base = basePoints(e.importance, e.difficulty)
  if (base <= 0) return 0
  const mult = multiplierFor(e.goal ?? null, e.project ?? null)
  return pointsForMinutes(base, mins, mult)
}

function radarNormalize(values: number[]) {
  const max = Math.max(...values, 1)
  return values.map((v) => clamp(v / max, 0, 1))
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

function piePath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polar(cx, cy, r, endDeg)
  const end = polar(cx, cy, r, startDeg)
  const largeArc = endDeg - startDeg <= 180 ? 0 : 1
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`
}

function PieChart(props: { slices: Array<{ label: string; value: number }>; size?: number }) {
  const size = props.size ?? 200
  const r = size / 2
  const cx = r
  const cy = r
  const total = props.slices.reduce((a, s) => a + s.value, 0)
  const colors = ['#D95D39', '#5B5F97', '#488B86', '#1C1C1E', '#8E8E93', '#CF423C', '#3D8856', '#FCECE8']

  if (total <= 0) return <div className="text-center py-10 text-[#8E8E93] font-bold text-xs">No data yet</div>

  let cursor = 0
  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Time pie chart" className="rotate-[-90deg]">
        {props.slices.map((s, i) => {
          const pct = s.value / total
          const startDeg = cursor * 360
          cursor += pct
          const endDeg = cursor * 360
          return <path key={s.label} d={piePath(cx, cy, r - 4, startDeg, endDeg)} fill={colors[i % colors.length]} />
        })}
        <circle cx={cx} cy={cy} r={r - 40} fill="rgba(255,255,255,0.5)" style={{ backdropFilter: 'blur(10px)' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-bold text-[#1C1C1E]">{Math.round(total)}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E8E93]">min</span>
      </div>
    </div>
  )
}

function RadarChart(props: { title: string; axes: string[]; values: number[] }) {
  const size = 240
  const cx = size / 2
  const cy = size / 2
  const r = 80
  const axes = props.axes
  const values = radarNormalize(props.values)
  const step = 360 / Math.max(1, axes.length)

  const ring = (t: number) => {
    const pts = axes.map((_, i) => polar(cx, cy, r * t, i * step))
    return `M ${pts.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' L ')} Z`
  }

  const polyPts = axes.map((_, i) => polar(cx, cy, r * (values[i] ?? 0), i * step))
  const poly = `M ${polyPts.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' L ')} Z`

  return (
    <div className="space-y-6">
      <h3 className="text-xs font-bold uppercase tracking-widest text-[#8E8E93]">{props.title}</h3>
      <div className="flex justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
          <path d={ring(1)} fill="none" stroke="#E5E5EA" strokeWidth="1" />
          <path d={ring(0.66)} fill="none" stroke="#E5E5EA" strokeWidth="1" strokeDasharray="4 4" />
          <path d={ring(0.33)} fill="none" stroke="#E5E5EA" strokeWidth="1" strokeDasharray="4 4" />
          {axes.map((_, i) => {
            const p = polar(cx, cy, r, i * step)
            return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#E5E5EA" strokeWidth="1" />
          })}
          <path d={poly} fill="rgba(91, 95, 151, 0.15)" stroke="#5B5F97" strokeWidth="2.5" strokeLinejoin="round" />
          {axes.map((a, i) => {
            const p = polar(cx, cy, r + 24, i * step)
            return (
              <text key={a} x={p.x} y={p.y} textAnchor="middle" className="text-[10px] font-bold fill-[#1C1C1E] uppercase tracking-tighter">
                {a}
              </text>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

function toSeries(values: number[]): SeriesPoint[] {
  return values.map((v, i) => ({ x: i, y: v }))
}

function toHeatmapValues(values: number[]) {
  return values.map((v, i) => ({ dayIndex: i, value: v }))
}

function normalizeCharacterKey(raw: string) {
  const t = raw.trim().toLowerCase()
  if (!t) return null
  if (t === 'str' || t === 'strength') return 'STR'
  if (t === 'int' || t === 'intelligence') return 'INT'
  if (t === 'con' || t === 'constitution') return 'CON'
  if (t === 'per' || t === 'perception') return 'PER'
  return null
}

export function DashboardView(props: { events: CalendarEvent[]; tasks: Task[] }) {
  const [range, setRange] = useState<'today' | 'week' | 'month'>('week')
  const [view, setView] = useState<DashView>('overview')
  const [edit, setEdit] = useState(false)

  const now = Date.now()
  const heatmapDayCount = 365
  const heatmapStart = startOfDayMs(now) - (heatmapDayCount - 1) * 24 * 60 * 60 * 1000
  const rangeStart = useMemo(() => {
    const today = startOfDayMs(now)
    if (range === 'today') return today
    if (range === 'week') return addDaysMs(today, -6)
    return addDaysMs(today, -29)
  }, [now, range])
  const rangeEnd = startOfDayMs(now) + 24 * 60 * 60 * 1000
  const dayCount = range === 'today' ? 1 : range === 'week' ? 7 : 30

  const inRangeEvents = useMemo(() => {
    return props.events
      .filter((e) => e.kind !== 'log')
      .filter((e) => e.endAt > rangeStart && e.startAt < rangeEnd)
  }, [props.events, rangeEnd, rangeStart])

  const timeByCategory = useMemo(() => {
    const rows: Array<{ key: string; value: number }> = []
    for (const e of inRangeEvents) {
      const start = Math.max(e.startAt, rangeStart)
      const end = Math.min(e.endAt, rangeEnd)
      const mins = Math.max(0, Math.round((end - start) / (60 * 1000)))
      if (mins <= 0) continue
      const key = (e.category ?? 'Uncategorized').trim() || 'Uncategorized'
      rows.push({ key, value: mins })
    }
    return sumByKey(rows).slice(0, 8)
  }, [inRangeEvents, rangeEnd, rangeStart])

  const pointsByCategory = useMemo(() => {
    const rows: Array<{ key: string; value: number }> = []
    for (const e of inRangeEvents) {
      const start = Math.max(e.startAt, rangeStart)
      const end = Math.min(e.endAt, rangeEnd)
      const mins = Math.max(0, Math.round((end - start) / (60 * 1000)))
      const pts = pointsForRange(e, mins)
      if (pts <= 0) continue
      const key = (e.category ?? 'Uncategorized').trim() || 'Uncategorized'
      rows.push({ key, value: pts })
    }
    return sumByKey(rows).slice(0, 8)
  }, [inRangeEvents, rangeEnd, rangeStart])

  const timeSeries = useMemo(() => {
    const totals = Array.from({ length: dayCount }).map(() => 0)
    for (const e of inRangeEvents) {
      const start = Math.max(e.startAt, rangeStart)
      const end = Math.min(e.endAt, rangeEnd)
      const startDay = clamp(Math.floor((startOfDayMs(start) - rangeStart) / (24 * 60 * 60 * 1000)), 0, dayCount - 1)
      const endDay = clamp(Math.floor((startOfDayMs(end) - rangeStart) / (24 * 60 * 60 * 1000)), 0, dayCount - 1)
      for (let di = startDay; di <= endDay; di++) {
        const ds = rangeStart + di * 24 * 60 * 60 * 1000
        const de = ds + 24 * 60 * 60 * 1000
        const mins = Math.max(0, Math.round((Math.min(end, de) - Math.max(start, ds)) / (60 * 1000)))
        totals[di] = (totals[di] ?? 0) + mins
      }
    }
    return totals
  }, [dayCount, inRangeEvents, rangeEnd, rangeStart])

  const pointsSeries = useMemo(() => {
    const totals = Array.from({ length: dayCount }).map(() => 0)
    for (const e of inRangeEvents) {
      const start = Math.max(e.startAt, rangeStart)
      const end = Math.min(e.endAt, rangeEnd)
      const startDay = clamp(Math.floor((startOfDayMs(start) - rangeStart) / (24 * 60 * 60 * 1000)), 0, dayCount - 1)
      const endDay = clamp(Math.floor((startOfDayMs(end) - rangeStart) / (24 * 60 * 60 * 1000)), 0, dayCount - 1)
      for (let di = startDay; di <= endDay; di++) {
        const ds = rangeStart + di * 24 * 60 * 60 * 1000
        const de = ds + 24 * 60 * 60 * 1000
        const mins = Math.max(0, Math.round((Math.min(end, de) - Math.max(start, ds)) / (60 * 1000)))
        totals[di] = (totals[di] ?? 0) + pointsForRange(e, mins)
      }
    }
    return totals
  }, [dayCount, inRangeEvents, rangeStart])

  const timeHeatmapSeries = useMemo(() => {
    const totals = Array.from({ length: heatmapDayCount }).map(() => 0)
    for (const e of props.events) {
      if (e.kind === 'log') continue
      const start = Math.max(e.startAt, heatmapStart)
      const end = Math.min(e.endAt, heatmapStart + heatmapDayCount * 24 * 60 * 60 * 1000)
      if (end <= heatmapStart || start >= heatmapStart + heatmapDayCount * 24 * 60 * 60 * 1000) continue
      const startDay = clamp(Math.floor((startOfDayMs(start) - heatmapStart) / (24 * 60 * 60 * 1000)), 0, heatmapDayCount - 1)
      const endDay = clamp(Math.floor((startOfDayMs(end) - heatmapStart) / (24 * 60 * 60 * 1000)), 0, heatmapDayCount - 1)
      for (let di = startDay; di <= endDay; di++) {
        const ds = heatmapStart + di * 24 * 60 * 60 * 1000
        const de = ds + 24 * 60 * 60 * 1000
        const mins = Math.max(0, Math.round((Math.min(end, de) - Math.max(start, ds)) / (60 * 1000)))
        totals[di] = (totals[di] ?? 0) + mins
      }
    }
    return totals
  }, [heatmapDayCount, heatmapStart, props.events])

  const pointsHeatmapSeries = useMemo(() => {
    const totals = Array.from({ length: heatmapDayCount }).map(() => 0)
    for (const e of props.events) {
      if (e.kind === 'log') continue
      const base = basePoints(e.importance, e.difficulty)
      if (base <= 0) continue
      const mult = multiplierFor(e.goal ?? null, e.project ?? null)
      const start = Math.max(e.startAt, heatmapStart)
      const end = Math.min(e.endAt, heatmapStart + heatmapDayCount * 24 * 60 * 60 * 1000)
      if (end <= heatmapStart || start >= heatmapStart + heatmapDayCount * 24 * 60 * 60 * 1000) continue
      const startDay = clamp(Math.floor((startOfDayMs(start) - heatmapStart) / (24 * 60 * 60 * 1000)), 0, heatmapDayCount - 1)
      const endDay = clamp(Math.floor((startOfDayMs(end) - heatmapStart) / (24 * 60 * 60 * 1000)), 0, heatmapDayCount - 1)
      for (let di = startDay; di <= endDay; di++) {
        const ds = heatmapStart + di * 24 * 60 * 60 * 1000
        const de = ds + 24 * 60 * 60 * 1000
        const mins = Math.max(0, Math.round((Math.min(end, de) - Math.max(start, ds)) / (60 * 1000)))
        totals[di] = (totals[di] ?? 0) + pointsForMinutes(base, mins, mult)
      }
    }
    return totals
  }, [heatmapDayCount, heatmapStart, props.events])

  const characterTotals = useMemo(() => {
    const map = new Map<string, number>([
      ['STR', 0],
      ['INT', 0],
      ['CON', 0],
      ['PER', 0],
    ])
    for (const e of inRangeEvents) {
      const start = Math.max(e.startAt, rangeStart)
      const end = Math.min(e.endAt, rangeEnd)
      const mins = Math.max(0, Math.round((end - start) / (60 * 1000)))
      const pts = pointsForRange(e, mins)
      if (pts <= 0) continue
      for (const raw of e.character ?? []) {
        const k = normalizeCharacterKey(raw)
        if (!k) continue
        map.set(k, (map.get(k) ?? 0) + pts)
      }
    }
    return { axes: ['STR', 'INT', 'CON', 'PER'], values: ['STR', 'INT', 'CON', 'PER'].map((k) => map.get(k) ?? 0) }
  }, [inRangeEvents, rangeEnd, rangeStart])

  const skillTotals = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of inRangeEvents) {
      const start = Math.max(e.startAt, rangeStart)
      const end = Math.min(e.endAt, rangeEnd)
      const mins = Math.max(0, Math.round((end - start) / (60 * 1000)))
      const pts = pointsForRange(e, mins)
      if (pts <= 0) continue
      for (const s of e.skills ?? []) {
        const key = s.trim()
        if (!key) continue
        map.set(key, (map.get(key) ?? 0) + pts)
      }
    }
    const top = Array.from(map.entries())
      .map(([k, v]) => ({ k, v }))
      .sort((a, b) => b.v - a.v)
      .slice(0, 6)
    return { axes: top.map((x) => x.k), values: top.map((x) => x.v) }
  }, [inRangeEvents, rangeEnd, rangeStart])

  const topPeople = useMemo(() => {
    const rows: Array<{ key: string; value: number }> = []
    for (const e of inRangeEvents) {
      const start = Math.max(e.startAt, rangeStart)
      const end = Math.min(e.endAt, rangeEnd)
      const mins = Math.max(0, Math.round((end - start) / (60 * 1000)))
      if (mins <= 0) continue
      for (const p of e.people ?? []) {
        const key = p.trim()
        if (!key) continue
        rows.push({ key, value: mins })
      }
    }
    return sumByKey(rows).slice(0, 6)
  }, [inRangeEvents, rangeEnd, rangeStart])

  const topPlaces = useMemo(() => {
    const rows: Array<{ key: string; value: number }> = []
    for (const e of inRangeEvents) {
      const start = Math.max(e.startAt, rangeStart)
      const end = Math.min(e.endAt, rangeEnd)
      const mins = Math.max(0, Math.round((end - start) / (60 * 1000)))
      if (mins <= 0) continue
      const key = (e.location ?? '').trim()
      if (!key) continue
      rows.push({ key, value: mins })
    }
    return sumByKey(rows).slice(0, 6)
  }, [inRangeEvents, rangeEnd, rangeStart])

  const pointsByPerson = useMemo(() => {
    const rows: Array<{ key: string; value: number }> = []
    for (const e of inRangeEvents) {
      const start = Math.max(e.startAt, rangeStart)
      const end = Math.min(e.endAt, rangeEnd)
      const mins = Math.max(0, Math.round((end - start) / (60 * 1000)))
      const pts = pointsForRange(e, mins)
      if (pts <= 0) continue
      for (const p of e.people ?? []) {
        const key = p.trim()
        if (!key) continue
        rows.push({ key, value: pts })
      }
    }
    return sumByKey(rows).slice(0, 6)
  }, [inRangeEvents, rangeEnd, rangeStart])

  const pointsByPlace = useMemo(() => {
    const rows: Array<{ key: string; value: number }> = []
    for (const e of inRangeEvents) {
      const start = Math.max(e.startAt, rangeStart)
      const end = Math.min(e.endAt, rangeEnd)
      const mins = Math.max(0, Math.round((end - start) / (60 * 1000)))
      const pts = pointsForRange(e, mins)
      if (pts <= 0) continue
      const key = (e.location ?? '').trim()
      if (!key) continue
      rows.push({ key, value: pts })
    }
    return sumByKey(rows).slice(0, 6)
  }, [inRangeEvents, rangeEnd, rangeStart])

  const widgets = useMemo(
    () => [
      {
        id: 'timePie',
        title: 'Time Allocation',
        group: 'time' as WidgetGroup,
        element: (
          <div className="space-y-8">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-clay">Time Allocation</h3>
            <div className="space-y-10">
              <PieChart slices={timeByCategory.map((x) => ({ label: x.key, value: x.value }))} />
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {timeByCategory.map((x, i) => {
                  const colors = ['#D95D39', '#5B5F97', '#488B86', '#1C1C1E', '#8E8E93', '#CF423C', '#3D8856', '#FCECE8']
                  return (
                    <div key={x.key} className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: colors[i % colors.length] }} />
                      <span className="text-xs font-bold text-[#1C1C1E] truncate uppercase tracking-tighter">{x.key}</span>
                      <span className="text-xs font-black text-[#86868B] ml-auto">{Math.round(x.value)}m</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'timeLine',
        title: 'Daily Activity',
        group: 'time' as WidgetGroup,
        element: (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-clay">Daily Activity</h3>
              <span className="text-[10px] font-black text-[#D95D39] bg-[#FCECE8] px-3 py-1 rounded-full uppercase tracking-widest">Time</span>
            </div>
            <div className="py-4">
                <LtLineAreaChart points={toSeries(timeSeries)} color="#D95D39" />
            </div>
            <p className="text-xs font-black text-[#86868B] uppercase tracking-[0.3em] text-center opacity-50">
              {isoDate(rangeStart)} — {isoDate(rangeEnd - 1)}
            </p>
          </div>
        ),
      },
      {
        id: 'pointsBar',
        title: 'Points by Category',
        group: 'points' as WidgetGroup,
        element: (
          <div className="space-y-8">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#5B5F97]">Impact Distribution</h3>
            <div className="py-4">
                <LtBarChart values={pointsByCategory.map((x) => x.value)} color="#5B5F97" />
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-6">
              {pointsByCategory.map((x) => (
                <div key={x.key} className="flex items-center justify-between p-2 bg-[#F2F0ED]/50 rounded-xl">
                  <span className="text-xs font-bold text-[#1C1C1E] truncate uppercase tracking-tighter">{x.key}</span>
                  <span className="text-xs font-black text-[#5B5F97]">{Math.round(x.value)}</span>
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        id: 'pointsLine',
        title: 'Points (Daily)',
        group: 'points' as WidgetGroup,
        element: (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#5B5F97]">Daily Impact</h3>
              <span className="text-[10px] font-black text-[#5B5F97] bg-[#5B5F97]/10 px-3 py-1 rounded-full uppercase tracking-widest">Points</span>
            </div>
            <div className="py-4">
                <LtLineAreaChart points={toSeries(pointsSeries)} color="#5B5F97" />
            </div>
            <p className="text-xs font-bold text-[#86868B] leading-relaxed italic text-center opacity-60">
              Impact = Weight × Urgency × Intensity
            </p>
          </div>
        ),
      },
      {
        id: 'timeHeatmap',
        title: 'Consistency (Time)',
        group: 'time' as WidgetGroup,
        element: (
          <div className="space-y-8">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gradient">Consistency</h3>
            <LtHeatmap valuesByDay={toHeatmapValues(timeHeatmapSeries)} maxValue={Math.max(...timeHeatmapSeries, 60)} label="MINUTES" days={heatmapDayCount} />
          </div>
        ),
      },
      {
        id: 'pointsHeatmap',
        title: 'Consistency (Points)',
        group: 'points' as WidgetGroup,
        element: (
          <div className="space-y-8">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#5B5F97]">Impact Map</h3>
            <LtHeatmap valuesByDay={toHeatmapValues(pointsHeatmapSeries)} maxValue={Math.max(...pointsHeatmapSeries, 10)} label="POINTS" days={heatmapDayCount} />
          </div>
        ),
      },
      {
        id: 'characterRadar',
        title: 'Attributes',
        group: 'radar' as WidgetGroup,
        element: (
          <RadarChart title="Attributes" axes={characterTotals.axes} values={characterTotals.values} />
        ),
      },
      {
        id: 'skillsRadar',
        title: 'Top Skills',
        group: 'radar' as WidgetGroup,
        element: (
          <RadarChart title="Top Skills" axes={skillTotals.axes.length ? skillTotals.axes : ['—']} values={skillTotals.values.length ? skillTotals.values : [0]} />
        ),
      },
      {
        id: 'peopleTime',
        title: 'Top Connections',
        group: 'time' as WidgetGroup,
        element: (
          <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#8E8E93]">Top Connections</h3>
            <div className="space-y-3">
              {topPeople.length ? (
                topPeople.map((x) => (
                  <div key={x.key} className="flex items-center justify-between p-3 bg-[#F2F0ED] rounded-xl">
                    <span className="text-xs font-bold text-[#1C1C1E]">{x.key}</span>
                    <span className="text-[10px] font-bold text-[#D95D39] bg-white px-2 py-0.5 rounded-md shadow-sm">
                      {Math.round(x.value)}m
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 opacity-40 text-xs font-bold uppercase">No data</div>
              )}
            </div>
          </div>
        ),
      },
      {
        id: 'placesTime',
        title: 'Top Environments',
        group: 'time' as WidgetGroup,
        element: (
          <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#8E8E93]">Top Environments</h3>
            <div className="space-y-3">
              {topPlaces.length ? (
                topPlaces.map((x) => (
                  <div key={x.key} className="flex items-center justify-between p-3 bg-[#F2F0ED] rounded-xl">
                    <span className="text-xs font-bold text-[#1C1C1E]">{x.key}</span>
                    <span className="text-[10px] font-bold text-[#D95D39] bg-white px-2 py-0.5 rounded-md shadow-sm">
                      {Math.round(x.value)}m
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 opacity-40 text-xs font-bold uppercase">No data</div>
              )}
            </div>
          </div>
        ),
      },
      {
        id: 'peoplePoints',
        title: 'Impactful People',
        group: 'points' as WidgetGroup,
        element: (
          <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#8E8E93]">Impactful People</h3>
            <div className="space-y-3">
              {pointsByPerson.length ? (
                pointsByPerson.map((x) => (
                  <div key={x.key} className="flex items-center justify-between p-3 bg-[#F2F0ED] rounded-xl">
                    <span className="text-xs font-bold text-[#1C1C1E]">{x.key}</span>
                    <span className="text-[10px] font-bold text-[#5B5F97] bg-white px-2 py-0.5 rounded-md shadow-sm">
                      {x.value.toFixed(1)} pts
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 opacity-40 text-xs font-bold uppercase">No data</div>
              )}
            </div>
          </div>
        ),
      },
      {
        id: 'placesPoints',
        title: 'Productive Places',
        group: 'points' as WidgetGroup,
        element: (
          <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#8E8E93]">Productive Places</h3>
            <div className="space-y-3">
              {pointsByPlace.length ? (
                pointsByPlace.map((x) => (
                  <div key={x.key} className="flex items-center justify-between p-3 bg-[#F2F0ED] rounded-xl">
                    <span className="text-xs font-bold text-[#1C1C1E]">{x.key}</span>
                    <span className="text-[10px] font-bold text-[#5B5F97] bg-white px-2 py-0.5 rounded-md shadow-sm">
                      {x.value.toFixed(1)} pts
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 opacity-40 text-xs font-bold uppercase">No data</div>
              )}
            </div>
          </div>
        ),
      },
    ],
    [
      characterTotals.axes,
      characterTotals.values,
      heatmapDayCount,
      pointsByCategory,
      pointsByPerson,
      pointsByPlace,
      pointsHeatmapSeries,
      pointsSeries,
      rangeEnd,
      rangeStart,
      skillTotals.axes,
      skillTotals.values,
      timeByCategory,
      timeHeatmapSeries,
      timeSeries,
      topPeople,
      topPlaces,
    ],
  )

  const defaultOrder = useMemo(() => widgets.map((w) => w.id), [widgets])
  const [layout, setLayout] = useState<DashboardLayout>(() => loadDashboardLayout(defaultOrder))

  const normalizedLayout = useMemo(() => normalizeLayout(layout, defaultOrder), [defaultOrder, layout])

  const widgetById = useMemo(() => new Map(widgets.map((w) => [w.id, w])), [widgets])
  const visibleWidgets = normalizedLayout.order.filter((id) => !normalizedLayout.hidden.includes(id))
  const hiddenWidgets = normalizedLayout.hidden

  function updateLayout(next: DashboardLayout) {
    const normalized = normalizeLayout(next, defaultOrder)
    setLayout(normalized)
    saveDashboardLayout(normalized)
  }

  function moveWidget(id: string, dir: -1 | 1) {
    const order = [...normalizedLayout.order]
    const idx = order.indexOf(id)
    if (idx < 0) return
    const nextIdx = clamp(idx + dir, 0, order.length - 1)
    if (idx === nextIdx) return
    const temp = order[idx]
    order[idx] = order[nextIdx]
    order[nextIdx] = temp!
    updateLayout({ ...normalizedLayout, order })
  }

  function toggleHidden(id: string) {
    const hidden = normalizedLayout.hidden.includes(id)
      ? normalizedLayout.hidden.filter((x) => x !== id)
      : [...normalizedLayout.hidden, id]
    updateLayout({ ...normalizedLayout, hidden })
  }

  function resetLayout() {
    updateLayout({ order: defaultOrder, hidden: [] })
  }

  return (
    <div className="flex flex-col h-full bg-[#F2F0ED] text-[#1C1C1E] font-['Figtree'] overflow-hidden">
      <div className="px-10 pt-12 pb-8 bg-[#F2F0ED]/80 backdrop-blur-xl sticky top-0 z-10 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-black tracking-tighter text-gradient shiny-text">Dashboard</h1>
            <p className="text-base text-[#86868B] font-semibold mt-2 uppercase tracking-widest opacity-70">Strategic Lifecycle Insights</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setEdit((v) => !v)}
              className={`px-8 py-3 rounded-[20px] text-sm font-black uppercase tracking-widest transition-all ${
                edit ? 'bg-[#1C1C1E] text-white shadow-2xl scale-105 border-beam' : 'bg-white border border-[#E5E5EA] text-[#1C1C1E] shadow-sm hover:shadow-xl hover:-translate-y-1'
              }`}
            >
              {edit ? 'Lock Layout' : 'Customize'}
            </button>
            {edit && (
              <button 
                onClick={resetLayout}
                className="px-8 py-3 bg-[#FCECE8] text-[#D95D39] rounded-[20px] text-sm font-black uppercase tracking-widest shadow-sm hover:shadow-md transition-all"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-8 items-center">
          <div className="flex p-1.5 bg-white/40 backdrop-blur border border-white/20 rounded-[22px] shadow-sm">
            {(['overview', 'time', 'points', 'radar'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setView(k)}
                className={`px-10 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-[18px] transition-all ${
                  view === k ? 'bg-white shadow-xl text-[#1C1C1E] scale-[1.02]' : 'text-[#86868B] hover:text-[#1C1C1E]'
                }`}
              >
                {k}
              </button>
            ))}
          </div>

          <div className="flex p-1.5 bg-white/40 backdrop-blur border border-white/20 rounded-[22px] shadow-sm">
            {(['today', 'week', 'month'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setRange(k)}
                className={`px-10 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-[18px] transition-all ${
                  range === k ? 'bg-white shadow-xl text-[#1C1C1E] scale-[1.02]' : 'text-[#86868B] hover:text-[#1C1C1E]'
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-10 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-[1600px] mx-auto">
          {visibleWidgets.map((id) => {
            const widget = widgetById.get(id)
            if (!widget) return null
            if (view !== 'overview' && widget.group !== view) return null
            return (
              <div key={widget.id} className={`group relative ${edit ? 'animate-pulse' : ''}`}>
                {edit && (
                  <div className="absolute -top-3 -right-3 z-20 flex gap-1">
                    <button 
                      onClick={() => moveWidget(widget.id, -1)}
                      className="w-8 h-8 bg-white border border-[#E5E5EA] rounded-full shadow-lg flex items-center justify-center text-[#1C1C1E] hover:bg-[#F2F0ED]"
                    >
                      ←
                    </button>
                    <button 
                      onClick={() => moveWidget(widget.id, 1)}
                      className="w-8 h-8 bg-white border border-[#E5E5EA] rounded-full shadow-lg flex items-center justify-center text-[#1C1C1E] hover:bg-[#F2F0ED]"
                    >
                      →
                    </button>
                    <button 
                      onClick={() => toggleHidden(widget.id)}
                      className="w-8 h-8 bg-[#FCECE8] text-[#D95D39] rounded-full shadow-lg flex items-center justify-center font-bold"
                    >
                      ×
                    </button>
                  </div>
                )}
                <div className="glassCard h-full">
                  {widget.element}
                </div>
              </div>
            )
          })}
        </div>

        {edit && hiddenWidgets.length > 0 && (
          <div className="mt-12 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#8E8E93]">Hidden Widgets</h3>
            <div className="flex flex-wrap gap-2">
              {hiddenWidgets.map((id) => {
                const widget = widgetById.get(id)
                if (!widget) return null
                return (
                  <button 
                    key={id} 
                    onClick={() => toggleHidden(id)}
                    className="px-4 py-2 bg-white border border-[#E5E5EA] rounded-full text-xs font-bold text-[#8E8E93] hover:text-[#1C1C1E] hover:border-[#1C1C1E] transition-all"
                  >
                    + {widget.title}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
