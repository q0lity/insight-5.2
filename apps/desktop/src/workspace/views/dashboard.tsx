import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../../ui/icons'
import type { CalendarEvent } from '../../storage/calendar'
import type { Task } from '../../storage/tasks'
import { basePoints, multiplierFor, pointsForMinutes } from '../../scoring/points'
import { LtBarChart, LtHeatmap, LtLineAreaChart, type SeriesPoint } from '../../ui/life-tracker-charts'
import { loadTrackerDefs, type TrackerDef } from '../../storage/ecosystem'

type DashView = 'overview' | 'time' | 'points' | 'radar'
type WidgetGroup = 'overview' | 'time' | 'points' | 'radar'
type DashboardLayout = { order: string[]; hidden: string[] }
type ViewMode = 'dense' | 'masonry' | 'spacious'
type HeatmapPeriod = 'week' | 'month' | 'quarter' | 'year'

const VIEW_MODE_KEY = 'insight5.dashboard.viewMode.v1'
const COLLAPSED_KEY = 'insight5.dashboard.collapsed.v1'
const HEATMAP_PERIOD_KEY = 'insight5.dashboard.heatmapPeriod.v1'

function loadViewMode(): ViewMode {
  try {
    const raw = localStorage.getItem(VIEW_MODE_KEY)
    if (raw === 'dense' || raw === 'masonry' || raw === 'spacious') return raw
    return 'spacious'
  } catch {
    return 'spacious'
  }
}

function saveViewMode(mode: ViewMode) {
  try {
    localStorage.setItem(VIEW_MODE_KEY, mode)
  } catch {}
}

function loadCollapsed(): Set<string> {
  try {
    const raw = localStorage.getItem(COLLAPSED_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? new Set(arr.filter((x: unknown) => typeof x === 'string')) : new Set()
  } catch {
    return new Set()
  }
}

function saveCollapsed(collapsed: Set<string>) {
  try {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...collapsed]))
  } catch {}
}

function periodToDays(period: HeatmapPeriod): number {
  switch (period) {
    case 'week': return 7
    case 'month': return 30
    case 'quarter': return 91
    case 'year': return 365
  }
}

function loadHeatmapPeriods(): { consistency: HeatmapPeriod; impact: HeatmapPeriod } {
  try {
    const raw = localStorage.getItem(HEATMAP_PERIOD_KEY)
    if (!raw) return { consistency: 'year', impact: 'year' }
    const parsed = JSON.parse(raw)
    const validPeriods: HeatmapPeriod[] = ['week', 'month', 'quarter', 'year']
    return {
      consistency: validPeriods.includes(parsed?.consistency) ? parsed.consistency : 'year',
      impact: validPeriods.includes(parsed?.impact) ? parsed.impact : 'year',
    }
  } catch {
    return { consistency: 'year', impact: 'year' }
  }
}

function saveHeatmapPeriods(periods: { consistency: HeatmapPeriod; impact: HeatmapPeriod }) {
  try {
    localStorage.setItem(HEATMAP_PERIOD_KEY, JSON.stringify(periods))
  } catch {}
}

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

function PieChart(props: { slices: Array<{ label: string; value: number }>; size?: number; compact?: boolean }) {
  const size = props.compact ? 140 : (props.size ?? 200)
  const r = size / 2
  const cx = r
  const cy = r
  const total = props.slices.reduce((a, s) => a + s.value, 0)
  const colors = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
    'var(--accent)',
    'var(--muted2)',
    'var(--border2)',
  ]

  if (total <= 0) return <div className="text-center py-10 font-bold text-xs" style={{ color: 'var(--muted)' }}>No data yet</div>

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
        <circle cx={cx} cy={cy} r={r - 40} fill="var(--glass)" style={{ backdropFilter: 'blur(10px)' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{Math.round(total)}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>min</span>
      </div>
    </div>
  )
}

function RadarChart(props: { axes: string[]; values: number[]; compact?: boolean }) {
  // Radar charts need at least 3 axes to render properly
  if (props.axes.length < 3) {
    return <div className="text-center py-6 opacity-40 text-xs font-bold uppercase" style={{ color: 'var(--muted)' }}>No data yet</div>
  }

  const size = props.compact ? 160 : 240
  const cx = size / 2
  const cy = size / 2
  const r = props.compact ? 50 : 80
  const labelOffset = props.compact ? 18 : 24
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
    <div className="flex justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
        <path d={ring(1)} fill="none" stroke="var(--border)" strokeWidth="1" />
        <path d={ring(0.66)} fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
        <path d={ring(0.33)} fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
        {axes.map((_, i) => {
          const p = polar(cx, cy, r, i * step)
          return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--border)" strokeWidth="1" />
        })}
        <path d={poly} fill="var(--accentSoft)" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" />
        {axes.map((a, i) => {
          const p = polar(cx, cy, r + labelOffset, i * step)
          return (
            <text key={a} x={p.x} y={p.y} textAnchor="middle" className={`${props.compact ? 'text-[8px]' : 'text-[10px]'} font-bold uppercase tracking-tighter`} style={{ fill: 'var(--text)' }}>
              {a}
            </text>
          )
        })}
      </svg>
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

function normalizeKey(raw: string | null | undefined) {
  return (raw ?? '').trim().toLowerCase()
}

function parseTrackerValue(title: string) {
  const match = title.match(/(-?\d+(?:\.\d+)?)/)
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) ? value : null
}

type FilterType = 'all' | 'category' | 'tag' | 'person' | 'place'
type WidgetSize = 'default' | 'wide' | 'tall' | 'large'

// Animated counter component
function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [displayed, setDisplayed] = useState(0)
  useEffect(() => {
    const duration = 600
    const steps = 20
    const increment = value / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setDisplayed(value)
        clearInterval(timer)
      } else {
        setDisplayed(Math.round(current))
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [value])
  return <span className="statValue" style={{ color: 'var(--text)' }}>{displayed.toLocaleString()}{suffix}</span>
}

// Sparkline chart component
function Sparkline({ data, color = 'var(--accent)' }: { data: number[]; color?: string }) {
  if (!data.length) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const w = 100
  const h = 32
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1 || 1)) * w,
    y: h - ((v - min) / range) * h * 0.8 - h * 0.1,
  }))
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const area = `${line} L ${w} ${h} L 0 ${h} Z`
  return (
    <div className="sparkline">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <path d={area} fill={`${color}20`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  )
}

// GitHub-style habit heatmap component
function HabitHeatmapWidget({ events }: { events: CalendarEvent[] }) {
  const now = Date.now()
  const days = 91 // Last 3 months
  const weeks = Math.ceil(days / 7)

  // Calculate habit completions per day
  const habitsByDay = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of events) {
      if (e.kind !== 'log' || !e.trackerKey?.startsWith('habit:')) continue
      const day = isoDate(e.startAt)
      map.set(day, (map.get(day) ?? 0) + 1)
    }
    return map
  }, [events])

  // Build grid (7 rows for days of week, ~13 cols for weeks)
  const grid: Array<{ date: string; level: number; count: number }[]> = Array.from({ length: 7 }, () => [])
  const startMs = startOfDayMs(now) - (days - 1) * 24 * 60 * 60 * 1000

  for (let d = 0; d < days; d++) {
    const ms = startMs + d * 24 * 60 * 60 * 1000
    const date = isoDate(ms)
    const dayOfWeek = new Date(ms).getDay()
    const count = habitsByDay.get(date) ?? 0
    const level = count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count <= 4 ? 3 : 4
    grid[dayOfWeek]!.push({ date, level, count })
  }

  return (
    <div className="habitHeatmap">
      {grid.map((row, dayIdx) => (
        <div key={dayIdx} className="habitHeatmapRow">
          {row.map((cell) => (
            <div
              key={cell.date}
              className={`habitHeatmapCell level-${cell.level}`}
              title={`${cell.date}: ${cell.count} habit${cell.count !== 1 ? 's' : ''}`}
            />
          ))}
        </div>
      ))}
      <div className="habitHeatmapLegend">
        <span>Less</span>
        <div className="cells">
          {[0, 1, 2, 3, 4].map((l) => (
            <div key={l} className={`habitHeatmapCell level-${l}`} style={{ cursor: 'default' }} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  )
}

export function DashboardView(props: { events: CalendarEvent[]; tasks: Task[]; trackerDefs?: TrackerDef[]; onNewNote?: () => void; onNewTask?: () => void; onVoiceCapture?: () => void }) {
  const [range, setRange] = useState<'today' | 'week' | 'month' | 'quarter' | 'year'>('week')
  const [view, setView] = useState<DashView>('overview')
  const [edit, setEdit] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>(loadViewMode)
  const [collapsed, setCollapsed] = useState<Set<string>>(loadCollapsed)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [heatmapPeriods, setHeatmapPeriods] = useState(loadHeatmapPeriods)
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [fabOpen, setFabOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const trackerDefs = useMemo(() => props.trackerDefs ?? loadTrackerDefs(), [props.trackerDefs])

  // Update current time every minute for Today widget
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    saveViewMode(viewMode)
  }, [viewMode])

  useEffect(() => {
    saveHeatmapPeriods(heatmapPeriods)
  }, [heatmapPeriods])

  useEffect(() => {
    saveCollapsed(collapsed)
  }, [collapsed])

  const compact = viewMode === 'dense'

  const now = Date.now()
  const consistencyDays = periodToDays(heatmapPeriods.consistency)
  const impactDays = periodToDays(heatmapPeriods.impact)
  const consistencyStart = startOfDayMs(now) - (consistencyDays - 1) * 24 * 60 * 60 * 1000
  const impactStart = startOfDayMs(now) - (impactDays - 1) * 24 * 60 * 60 * 1000
  const rangeStart = useMemo(() => {
    const today = startOfDayMs(now)
    if (range === 'today') return today
    if (range === 'week') return addDaysMs(today, -6)
    if (range === 'month') return addDaysMs(today, -29)
    if (range === 'quarter') return addDaysMs(today, -90)
    return addDaysMs(today, -364) // year
  }, [now, range])
  const rangeEnd = startOfDayMs(now) + 24 * 60 * 60 * 1000
  const dayCount = range === 'today' ? 1 : range === 'week' ? 7 : range === 'month' ? 30 : range === 'quarter' ? 91 : 365

  // Available filter options extracted from all events
  const availableCategories = useMemo(() => {
    const set = new Set<string>()
    for (const e of props.events) {
      const cat = (e.category ?? '').trim()
      if (cat) set.add(cat)
    }
    return Array.from(set).sort()
  }, [props.events])

  const availableTags = useMemo(() => {
    const set = new Set<string>()
    for (const e of props.events) {
      for (const t of e.tags ?? []) {
        const tag = t.trim()
        if (tag) set.add(tag)
      }
    }
    return Array.from(set).sort()
  }, [props.events])

  const trackerSummaryRows = useMemo(() => {
    const valuesByKey = new Map<string, number[]>()
    const lastByKey = new Map<string, { value: number; at: number }>()

    for (const ev of props.events) {
      if (ev.kind !== 'log') continue
      if (!ev.trackerKey) continue
      if (ev.trackerKey.startsWith('habit:')) continue
      const key = normalizeKey(ev.trackerKey)
      if (!key) continue
      const value = parseTrackerValue(ev.title)
      if (value == null) continue
      const list = valuesByKey.get(key) ?? []
      list.push(value)
      valuesByKey.set(key, list)
      const last = lastByKey.get(key)
      if (!last || ev.startAt > last.at) lastByKey.set(key, { value, at: ev.startAt })
    }

    return trackerDefs.map((def) => {
      const values = valuesByKey.get(def.key) ?? []
      const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
      const last = lastByKey.get(def.key) ?? null
      const min = def.unit.min ?? 0
      const max = def.unit.max ?? 10
      const span = max - min || 10
      const pct = avg == null ? 0 : Math.max(0, Math.min(1, (avg - min) / span))
      return {
        key: def.key,
        label: def.label,
        unit: def.unit.label,
        avg,
        last,
        pct,
      }
    })
  }, [props.events, trackerDefs])

  const availablePeople = useMemo(() => {
    const set = new Set<string>()
    for (const e of props.events) {
      for (const p of e.people ?? []) {
        const person = p.trim()
        if (person) set.add(person)
      }
    }
    return Array.from(set).sort()
  }, [props.events])

  const availablePlaces = useMemo(() => {
    const set = new Set<string>()
    for (const e of props.events) {
      const loc = (e.location ?? '').trim()
      if (loc) set.add(loc)
    }
    return Array.from(set).sort()
  }, [props.events])

  const currentFilterOptions = useMemo(() => {
    switch (filterType) {
      case 'category': return availableCategories
      case 'tag': return availableTags
      case 'person': return availablePeople
      case 'place': return availablePlaces
      default: return []
    }
  }, [filterType, availableCategories, availableTags, availablePeople, availablePlaces])

  const inRangeEvents = useMemo(() => {
    let filtered = props.events
      .filter((e) => e.kind !== 'log')
      .filter((e) => e.endAt > rangeStart && e.startAt < rangeEnd)

    // Apply filters if any selected
    if (selectedFilters.length > 0) {
      filtered = filtered.filter((e) => {
        switch (filterType) {
          case 'category':
            return selectedFilters.includes((e.category ?? '').trim())
          case 'tag':
            return (e.tags ?? []).some((t) => selectedFilters.includes(t.trim()))
          case 'person':
            return (e.people ?? []).some((p) => selectedFilters.includes(p.trim()))
          case 'place':
            return selectedFilters.includes((e.location ?? '').trim())
          default:
            return true
        }
      })
    }

    return filtered
  }, [props.events, rangeEnd, rangeStart, filterType, selectedFilters])

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
    const totals = Array.from({ length: consistencyDays }).map(() => 0)
    for (const e of props.events) {
      if (e.kind === 'log') continue
      const start = Math.max(e.startAt, consistencyStart)
      const end = Math.min(e.endAt, consistencyStart + consistencyDays * 24 * 60 * 60 * 1000)
      if (end <= consistencyStart || start >= consistencyStart + consistencyDays * 24 * 60 * 60 * 1000) continue
      const startDay = clamp(Math.floor((startOfDayMs(start) - consistencyStart) / (24 * 60 * 60 * 1000)), 0, consistencyDays - 1)
      const endDay = clamp(Math.floor((startOfDayMs(end) - consistencyStart) / (24 * 60 * 60 * 1000)), 0, consistencyDays - 1)
      for (let di = startDay; di <= endDay; di++) {
        const ds = consistencyStart + di * 24 * 60 * 60 * 1000
        const de = ds + 24 * 60 * 60 * 1000
        const mins = Math.max(0, Math.round((Math.min(end, de) - Math.max(start, ds)) / (60 * 1000)))
        totals[di] = (totals[di] ?? 0) + mins
      }
    }
    return totals
  }, [consistencyDays, consistencyStart, props.events])

  const pointsHeatmapSeries = useMemo(() => {
    const totals = Array.from({ length: impactDays }).map(() => 0)
    for (const e of props.events) {
      if (e.kind === 'log') continue
      const base = basePoints(e.importance, e.difficulty)
      if (base <= 0) continue
      const mult = multiplierFor(e.goal ?? null, e.project ?? null)
      const start = Math.max(e.startAt, impactStart)
      const end = Math.min(e.endAt, impactStart + impactDays * 24 * 60 * 60 * 1000)
      if (end <= impactStart || start >= impactStart + impactDays * 24 * 60 * 60 * 1000) continue
      const startDay = clamp(Math.floor((startOfDayMs(start) - impactStart) / (24 * 60 * 60 * 1000)), 0, impactDays - 1)
      const endDay = clamp(Math.floor((startOfDayMs(end) - impactStart) / (24 * 60 * 60 * 1000)), 0, impactDays - 1)
      for (let di = startDay; di <= endDay; di++) {
        const ds = impactStart + di * 24 * 60 * 60 * 1000
        const de = ds + 24 * 60 * 60 * 1000
        const mins = Math.max(0, Math.round((Math.min(end, de) - Math.max(start, ds)) / (60 * 1000)))
        totals[di] = (totals[di] ?? 0) + pointsForMinutes(base, mins, mult)
      }
    }
    return totals
  }, [impactDays, impactStart, props.events])

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

  // Today widget data
  const todayData = useMemo(() => {
    const todayStart = startOfDayMs(currentTime)
    const todayEnd = todayStart + 24 * 60 * 60 * 1000

    // Get today's events sorted by start time
    const todayEvents = props.events
      .filter((e) => e.kind !== 'log' && e.endAt > todayStart && e.startAt < todayEnd)
      .sort((a, b) => a.startAt - b.startAt)

    // Find current event (ongoing) and next event
    const currentEvent = todayEvents.find((e) => e.startAt <= currentTime && e.endAt > currentTime)
    const nextEvent = todayEvents.find((e) => e.startAt > currentTime)

    // Calculate day progress (0-100%)
    const dayProgress = Math.min(100, Math.max(0, ((currentTime - todayStart) / (todayEnd - todayStart)) * 100))

    // Format current time
    const now = new Date(currentTime)
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

    return { currentEvent, nextEvent, dayProgress, timeString, todayEvents }
  }, [currentTime, props.events])

  // Stats data with trends
  const statsData = useMemo(() => {
    const todayStart = startOfDayMs(currentTime)
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000
    const weekAgoStart = todayStart - 7 * 24 * 60 * 60 * 1000

    // Today's stats
    const todayEvents = props.events.filter((e) => e.kind !== 'log' && e.endAt > todayStart)
    const todayMins = todayEvents.reduce((sum, e) => {
      const start = Math.max(e.startAt, todayStart)
      const end = Math.min(e.endAt, currentTime)
      return sum + Math.max(0, Math.round((end - start) / 60000))
    }, 0)
    const todayPoints = todayEvents.reduce((sum, e) => {
      const start = Math.max(e.startAt, todayStart)
      const end = Math.min(e.endAt, currentTime)
      const mins = Math.max(0, Math.round((end - start) / 60000))
      return sum + pointsForRange(e, mins)
    }, 0)

    // Yesterday's stats for comparison
    const yesterdayEvents = props.events.filter((e) => e.kind !== 'log' && e.endAt > yesterdayStart && e.startAt < todayStart)
    const yesterdayMins = yesterdayEvents.reduce((sum, e) => {
      const start = Math.max(e.startAt, yesterdayStart)
      const end = Math.min(e.endAt, todayStart)
      return sum + Math.max(0, Math.round((end - start) / 60000))
    }, 0)

    // Calculate streak (consecutive days with activity)
    let streak = 0
    let checkDate = todayStart
    while (true) {
      const dayEvents = props.events.filter((e) => e.kind !== 'log' && e.endAt > checkDate && e.startAt < checkDate + 24 * 60 * 60 * 1000)
      if (dayEvents.length === 0 && checkDate !== todayStart) break
      if (dayEvents.length > 0) streak++
      checkDate -= 24 * 60 * 60 * 1000
      if (checkDate < todayStart - 365 * 24 * 60 * 60 * 1000) break
    }

    // Trend calculation
    const timeTrend = yesterdayMins > 0 ? ((todayMins - yesterdayMins) / yesterdayMins) * 100 : 0

    return {
      todayMins,
      todayPoints: Math.round(todayPoints),
      streak,
      timeTrend,
      tasksCompleted: props.tasks.filter((t) => t.completedAt && t.completedAt > todayStart).length,
      tasksPending: props.tasks.filter((t) => !t.completedAt).length,
    }
  }, [currentTime, props.events, props.tasks])

  const widgets = useMemo(
    () => [
      // Today widget - hero position
      {
        id: 'today',
        title: 'Today',
        group: 'overview' as WidgetGroup,
        size: 'wide' as WidgetSize,
        accent: 'todayWidget',
        element: (
          <div>
            <div className="todayTimeDisplay">{todayData.timeString}</div>
            {todayData.currentEvent ? (
              <div className="todayCurrentEvent mt-3">{todayData.currentEvent.title}</div>
            ) : (
              <div className="todayCurrentEvent mt-3 opacity-70">No current event</div>
            )}
            <div className="todayProgressBar">
              <div className="todayProgressFill" style={{ width: `${todayData.dayProgress}%` }} />
            </div>
            {todayData.nextEvent && (
              <div className="todayNextUp">
                <span style={{ opacity: 0.7 }}>Next up:</span>{' '}
                <span style={{ fontWeight: 600 }}>{todayData.nextEvent.title}</span>
                <span style={{ opacity: 0.7, marginLeft: 8 }}>
                  {new Date(todayData.nextEvent.startAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
          </div>
        ),
      },
      // Stats widgets with animated counters
      {
        id: 'statsTime',
        title: 'Time Today',
        group: 'overview' as WidgetGroup,
        element: (
          <div>
            <div className="flex items-baseline gap-3">
              <AnimatedCounter value={statsData.todayMins} />
              <span className="text-sm font-bold" style={{ color: 'var(--muted)' }}>min</span>
              <span className={`statTrend ${statsData.timeTrend > 0 ? 'up' : statsData.timeTrend < 0 ? 'down' : 'neutral'}`}>
                {statsData.timeTrend > 0 ? '↑' : statsData.timeTrend < 0 ? '↓' : '→'}
                {Math.abs(Math.round(statsData.timeTrend))}%
              </span>
            </div>
            <Sparkline data={timeSeries.slice(-7)} color="#D95D39" />
          </div>
        ),
      },
      {
        id: 'statsPoints',
        title: 'Points Today',
        group: 'overview' as WidgetGroup,
        element: (
          <div>
            <div className="flex items-baseline gap-3">
              <AnimatedCounter value={statsData.todayPoints} />
              <span className="text-sm font-bold" style={{ color: 'var(--muted)' }}>pts</span>
            </div>
            <Sparkline data={pointsSeries.slice(-7)} color="var(--indigo)" />
          </div>
        ),
      },
      {
        id: 'statsStreak',
        title: 'Current Streak',
        group: 'overview' as WidgetGroup,
        element: (
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline gap-3">
              <AnimatedCounter value={statsData.streak} />
              <span className="text-sm font-bold" style={{ color: 'var(--muted)' }}>days</span>
            </div>
            {statsData.streak >= 7 && (
              <span className="streakBadge self-start">🔥 On Fire!</span>
            )}
          </div>
        ),
      },
      {
        id: 'statsTasks',
        title: 'Tasks',
        group: 'overview' as WidgetGroup,
        element: (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase" style={{ color: 'var(--muted)' }}>Completed</span>
              <span className="text-lg font-black" style={{ color: '#10B981' }}>{statsData.tasksCompleted}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase" style={{ color: 'var(--muted)' }}>Pending</span>
              <span className="text-lg font-black" style={{ color: 'var(--text)' }}>{statsData.tasksPending}</span>
            </div>
          </div>
        ),
      },
      // GitHub-style habit heatmap
      {
        id: 'habitHeatmap',
        title: 'Habit Streak',
        group: 'overview' as WidgetGroup,
        size: 'wide' as WidgetSize,
        element: <HabitHeatmapWidget events={props.events} />,
      },
      // Heatmaps at top (user requested) - full width
      {
        id: 'timeHeatmap',
        title: 'Consistency',
        group: 'time' as WidgetGroup,
        fullWidth: true,
        element: (
          <div className="space-y-3">
            <div className="flex justify-end">
              <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: 'var(--bg)' }}>
                {(['week', 'month', 'quarter', 'year'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setHeatmapPeriods((prev) => ({ ...prev, consistency: p }))}
                    className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md transition-all"
                    style={{
                      background: heatmapPeriods.consistency === p ? 'var(--accent)' : 'transparent',
                      color: heatmapPeriods.consistency === p ? 'white' : 'var(--muted)',
                      boxShadow: heatmapPeriods.consistency === p ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                    }}
                  >
                    {p[0]}
                  </button>
                ))}
              </div>
            </div>
            <LtHeatmap valuesByDay={toHeatmapValues(timeHeatmapSeries)} maxValue={Math.max(...timeHeatmapSeries, 60)} label="MINUTES" days={consistencyDays} />
          </div>
        ),
      },
      {
        id: 'pointsHeatmap',
        title: 'Impact Map',
        group: 'points' as WidgetGroup,
        fullWidth: true,
        element: (
          <div className="space-y-3">
            <div className="flex justify-end">
              <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: 'var(--bg)' }}>
                {(['week', 'month', 'quarter', 'year'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setHeatmapPeriods((prev) => ({ ...prev, impact: p }))}
                    className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md transition-all"
                    style={{
                      background: heatmapPeriods.impact === p ? 'var(--accent)' : 'transparent',
                      color: heatmapPeriods.impact === p ? 'white' : 'var(--muted)',
                      boxShadow: heatmapPeriods.impact === p ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                    }}
                  >
                    {p[0]}
                  </button>
                ))}
              </div>
            </div>
            <LtHeatmap valuesByDay={toHeatmapValues(pointsHeatmapSeries)} maxValue={Math.max(...pointsHeatmapSeries, 10)} label="POINTS" days={impactDays} />
          </div>
        ),
      },
      {
        id: 'trackerSummary',
        title: 'Trackers',
        group: 'overview' as WidgetGroup,
        element: (
          <div className="space-y-3">
            {trackerSummaryRows.filter((row) => row.avg != null || row.last).length === 0 ? (
              <div className="text-xs text-[var(--muted)]">No tracker logs yet.</div>
            ) : (
              trackerSummaryRows
                .filter((row) => row.avg != null || row.last)
                .slice(0, 6)
                .map((row) => (
                  <div key={row.key} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-[var(--text)]">{row.label}</div>
                      <div className="text-[10px] text-[var(--muted)]">
                        Last: {row.last ? `${row.last.value} ${row.unit}` : '—'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-[var(--panel)] rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--accent)]" style={{ width: `${row.pct * 100}%` }} />
                      </div>
                      <span className="text-xs font-bold text-[var(--muted)]">
                        {row.avg != null ? row.avg.toFixed(1) : '—'} {row.unit}
                      </span>
                    </div>
                  </div>
                ))
            )}
          </div>
        ),
      },
      // Time & Points allocation
      {
        id: 'timePie',
        title: 'Time Allocation',
        group: 'time' as WidgetGroup,
        element: (
          <div className={compact ? 'space-y-3' : 'space-y-8'}>
            <div className={compact ? 'space-y-4' : 'space-y-10'}>
              <div className="chartContainer">
                <PieChart slices={timeByCategory.map((x) => ({ label: x.key, value: x.value }))} compact={compact} />
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {timeByCategory.map((x, i) => {
                  const colors = ['#D95D39', '#5B5F97', '#488B86', '#1C1C1E', '#8E8E93', '#CF423C', '#3D8856', '#FCECE8']
                  return (
                    <div key={x.key} className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: colors[i % colors.length] }} />
                      <span className="text-xs font-bold truncate uppercase tracking-tighter" style={{ color: 'var(--text)' }}>{x.key}</span>
                      <span className="text-xs font-black ml-auto" style={{ color: 'var(--muted)' }}>{Math.round(x.value)}m</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'pointsBar',
        title: 'Impact Distribution',
        group: 'points' as WidgetGroup,
        element: (
          <div className={compact ? 'space-y-3' : 'space-y-6'}>
            <div className={compact ? 'py-1' : 'py-4'}>
              <LtBarChart values={pointsByCategory.map((x) => x.value)} color="var(--accent)" />
            </div>
            <div className={`grid grid-cols-2 ${compact ? 'gap-1' : 'gap-x-6 gap-y-3'}`}>
              {pointsByCategory.map((x) => (
                <div key={x.key} className={`flex items-center justify-between ${compact ? 'p-1' : 'p-2'} rounded-xl`} style={{ background: 'var(--bg)', opacity: 0.7 }}>
                  <span className="text-xs font-bold truncate uppercase tracking-tighter" style={{ color: 'var(--text)' }}>{x.key}</span>
                  <span className="text-xs font-black" style={{ color: 'var(--indigo)' }}>{Math.round(x.value)}</span>
                </div>
              ))}
            </div>
          </div>
        ),
      },
      // Daily trends
      {
        id: 'timeLine',
        title: 'Daily Activity',
        group: 'time' as WidgetGroup,
        element: (
          <div className={compact ? 'space-y-2' : 'space-y-4'}>
            <div className={compact ? 'py-1' : 'py-4'}>
              <LtLineAreaChart points={toSeries(timeSeries)} color="#D95D39" />
            </div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-center opacity-50" style={{ color: 'var(--muted)' }}>
              {isoDate(rangeStart)} — {isoDate(rangeEnd - 1)}
            </p>
          </div>
        ),
      },
      {
        id: 'pointsLine',
        title: 'Daily Impact',
        group: 'points' as WidgetGroup,
        element: (
          <div className={compact ? 'space-y-2' : 'space-y-4'}>
            <div className={compact ? 'py-1' : 'py-4'}>
              <LtLineAreaChart points={toSeries(pointsSeries)} color="var(--accent)" />
            </div>
            {!compact && (
              <p className="text-xs font-bold leading-relaxed italic text-center opacity-60" style={{ color: 'var(--muted)' }}>
                Impact = Weight × Urgency × Intensity
              </p>
            )}
          </div>
        ),
      },
      // Radar charts
      {
        id: 'characterRadar',
        title: 'Attributes',
        group: 'radar' as WidgetGroup,
        element: (
          <div className="chartContainer">
            <RadarChart axes={characterTotals.axes} values={characterTotals.values} compact={compact} />
          </div>
        ),
      },
      {
        id: 'skillsRadar',
        title: 'Top Skills',
        group: 'radar' as WidgetGroup,
        element: (
          <div className="chartContainer">
            <RadarChart axes={skillTotals.axes} values={skillTotals.values} compact={compact} />
          </div>
        ),
      },
      {
        id: 'peopleTime',
        title: 'Top Connections',
        group: 'time' as WidgetGroup,
        element: (
          <div className={compact ? 'space-y-2' : 'space-y-3'}>
            {topPeople.length ? (
              topPeople.map((x) => (
                <div key={x.key} className={`flex items-center justify-between ${compact ? 'p-2' : 'p-3'} rounded-xl`} style={{ background: 'var(--bg)' }}>
                  <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>{x.key}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm" style={{ color: 'var(--accent)', background: 'var(--panel)' }}>
                    {Math.round(x.value)}m
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-6 opacity-40 text-xs font-bold uppercase" style={{ color: 'var(--muted)' }}>No data</div>
            )}
          </div>
        ),
      },
      {
        id: 'placesTime',
        title: 'Top Environments',
        group: 'time' as WidgetGroup,
        element: (
          <div className={compact ? 'space-y-2' : 'space-y-3'}>
            {topPlaces.length ? (
              topPlaces.map((x) => (
                <div key={x.key} className={`flex items-center justify-between ${compact ? 'p-2' : 'p-3'} rounded-xl`} style={{ background: 'var(--bg)' }}>
                  <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>{x.key}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm" style={{ color: 'var(--accent)', background: 'var(--panel)' }}>
                    {Math.round(x.value)}m
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-6 opacity-40 text-xs font-bold uppercase" style={{ color: 'var(--muted)' }}>No data</div>
            )}
          </div>
        ),
      },
      {
        id: 'peoplePoints',
        title: 'Impactful People',
        group: 'points' as WidgetGroup,
        element: (
          <div className={compact ? 'space-y-2' : 'space-y-3'}>
            {pointsByPerson.length ? (
              pointsByPerson.map((x) => (
                <div key={x.key} className={`flex items-center justify-between ${compact ? 'p-2' : 'p-3'} rounded-xl`} style={{ background: 'var(--bg)' }}>
                  <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>{x.key}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm" style={{ color: 'var(--indigo)', background: 'var(--panel)' }}>
                    {x.value.toFixed(1)} pts
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-6 opacity-40 text-xs font-bold uppercase" style={{ color: 'var(--muted)' }}>No data</div>
            )}
          </div>
        ),
      },
      {
        id: 'placesPoints',
        title: 'Productive Places',
        group: 'points' as WidgetGroup,
        element: (
          <div className={compact ? 'space-y-2' : 'space-y-3'}>
            {pointsByPlace.length ? (
              pointsByPlace.map((x) => (
                <div key={x.key} className={`flex items-center justify-between ${compact ? 'p-2' : 'p-3'} rounded-xl`} style={{ background: 'var(--bg)' }}>
                  <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>{x.key}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm" style={{ color: 'var(--indigo)', background: 'var(--panel)' }}>
                    {x.value.toFixed(1)} pts
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-6 opacity-40 text-xs font-bold uppercase" style={{ color: 'var(--muted)' }}>No data</div>
            )}
          </div>
        ),
      },
    ],
    [
      characterTotals.axes,
      characterTotals.values,
      compact,
      consistencyDays,
      heatmapPeriods,
      impactDays,
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
      trackerSummaryRows,
      todayData,
      statsData,
      props.events,
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
    <div className="flex flex-col h-full font-['Figtree'] overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <div className="px-10 pt-12 pb-8 backdrop-blur-xl sticky top-0 z-10 space-y-8" style={{ background: 'var(--bg)', opacity: 0.98 }}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--text)' }}>Strategic Lifecycle Insights</h1>
          <div className="flex gap-3 items-center">
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
              className="viewModeSelect"
            >
              <option value="dense">Dense</option>
              <option value="masonry">Masonry</option>
              <option value="spacious">Spacious</option>
            </select>
            <button
              onClick={() => setEdit((v) => !v)}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm"
              style={{
                background: edit ? 'var(--text)' : 'var(--panel)',
                color: edit ? 'var(--bg)' : 'var(--text)',
                border: edit ? '1px solid transparent' : '1px solid var(--border)',
                boxShadow: edit ? '0 10px 22px rgba(0,0,0,0.12)' : '0 6px 16px rgba(0,0,0,0.06)',
              }}
            >
              {edit ? 'Lock Layout' : 'Customize'}
            </button>
            {edit && (
              <button
                onClick={resetLayout}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all"
                style={{ background: 'var(--accentSoft)', color: 'var(--accent)' }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-8 items-center">
          <div className="flex p-1.5 backdrop-blur rounded-[22px] shadow-sm" style={{ background: 'var(--panelAlpha)', border: '1px solid var(--border)' }}>
            {(['overview', 'time', 'points', 'radar'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setView(k)}
                className="px-8 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] rounded-[16px] transition-all"
                style={{
                  background: view === k ? 'var(--panel)' : 'transparent',
                  color: view === k ? 'var(--text)' : 'var(--muted)',
                  boxShadow: view === k ? '0 8px 20px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {k}
              </button>
            ))}
          </div>

          <div className="flex p-1.5 backdrop-blur rounded-[22px] shadow-sm" style={{ background: 'var(--panelAlpha)', border: '1px solid var(--border)' }}>
            {(['today', 'week', 'month', 'quarter', 'year'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setRange(k)}
                className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] rounded-[16px] transition-all"
                style={{
                  background: range === k ? 'var(--accent)' : 'transparent',
                  color: range === k ? 'white' : 'var(--muted)',
                  boxShadow: range === k ? '0 8px 20px rgba(0,0,0,0.12)' : 'none',
                }}
              >
                {k === 'quarter' ? 'Q' : k === 'year' ? 'Y' : k}
              </button>
            ))}
          </div>
        </div>

        {/* Filter chips row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg)' }}>
            {(['all', 'category', 'tag', 'person', 'place'] as const).map((ft) => (
              <button
                key={ft}
                onClick={() => {
                  setFilterType(ft)
                  setSelectedFilters([])
                }}
                className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] rounded-lg transition-all"
                style={{
                  background: filterType === ft ? 'var(--panel)' : 'transparent',
                  color: filterType === ft ? 'var(--text)' : 'var(--muted)',
                }}
              >
                {ft === 'all' ? 'All' : ft === 'category' ? 'Categories' : ft === 'tag' ? 'Tags' : ft === 'person' ? 'People' : 'Places'}
              </button>
            ))}
          </div>

          {filterType !== 'all' && currentFilterOptions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {currentFilterOptions.slice(0, 12).map((opt) => {
                const isSelected = selectedFilters.includes(opt)
                return (
                  <button
                    key={opt}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedFilters(selectedFilters.filter((f) => f !== opt))
                      } else {
                        setSelectedFilters([...selectedFilters, opt])
                      }
                    }}
                    className="px-3 py-1.5 text-[11px] font-semibold rounded-full transition-all"
                    style={{
                      background: isSelected ? 'var(--accent)' : 'var(--panel)',
                      color: isSelected ? 'white' : 'var(--text)',
                      border: isSelected ? 'none' : '1px solid var(--border)',
                    }}
                  >
                    {opt}
                  </button>
                )
              })}
              {selectedFilters.length > 0 && (
                <button
                  onClick={() => setSelectedFilters([])}
                  className="px-3 py-1.5 text-[11px] font-semibold rounded-full transition-all"
                  style={{ background: 'var(--accentSoft)', color: 'var(--accent)' }}
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto px-10 pb-32 dashboardContainer ${viewMode}`}>
        <div className={`dashboardGrid ${viewMode}`}>
          {visibleWidgets.map((id) => {
            const widget = widgetById.get(id) as { id: string; title: string; group: WidgetGroup; element: React.ReactNode; fullWidth?: boolean; size?: WidgetSize; accent?: string } | undefined
            if (!widget) return null
            if (view !== 'overview' && widget.group !== view) return null
            const isCollapsed = collapsed.has(id)
            const isDragging = dragging === id
            const isDragOver = dragOver === id
            const sizeClass = widget.size ? `size-${widget.size}` : ''
            const accentClass = widget.accent || ''
            return (
              <div
                key={widget.id}
                className={`dashWidget group relative ${isCollapsed ? 'collapsed' : ''} ${widget.fullWidth ? 'fullWidth' : ''} ${sizeClass} ${accentClass} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'dragOver' : ''}`}
                draggable={true}
                onDragStart={(e) => {
                  setDragging(id)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragEnd={() => {
                  setDragging(null)
                  setDragOver(null)
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (dragging !== id) setDragOver(id)
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => {
                  e.preventDefault()
                  if (dragging && dragging !== id) {
                    const order = [...normalizedLayout.order]
                    const fromIdx = order.indexOf(dragging)
                    const toIdx = order.indexOf(id)
                    order.splice(fromIdx, 1)
                    order.splice(toIdx, 0, dragging)
                    updateLayout({ ...normalizedLayout, order })
                  }
                  setDragging(null)
                  setDragOver(null)
                }}
              >
                <div className="dashWidgetGrabHandle">
                  <Icon name="grip" size={14} />
                </div>
                <div
                  className="dashWidgetHeader"
                  onClick={() => {
                    setCollapsed((prev) => {
                      const next = new Set(prev)
                      if (next.has(id)) next.delete(id)
                      else next.add(id)
                      return next
                    })
                  }}
                >
                  <span className="dashWidgetTitle">{widget.title}</span>
                  <button className="dashWidgetCollapse" type="button">
                    <Icon name="chevronDown" size={10} />
                  </button>
                </div>
                <div className="dashWidgetContent">
                  {widget.element}
                </div>
                {edit && (
                  <div className="absolute -top-3 -right-3 z-20 flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleHidden(widget.id) }}
                      className="w-8 h-8 rounded-full shadow-lg flex items-center justify-center font-bold"
                      style={{ background: 'var(--accentSoft)', color: 'var(--accent)' }}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {edit && hiddenWidgets.length > 0 && (
          <div className="mt-12 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Hidden Widgets</h3>
            <div className="flex flex-wrap gap-2">
              {hiddenWidgets.map((id) => {
                const widget = widgetById.get(id)
                if (!widget) return null
                return (
                  <button
                    key={id}
                    onClick={() => toggleHidden(id)}
                    className="px-4 py-2 rounded-full text-xs font-bold transition-all hover:opacity-80"
                    style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--muted)' }}
                  >
                    + {widget.title}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions FAB */}
      <div className="quickActionsFab">
        <button
          className={`quickActionsFabMain ${fabOpen ? 'open' : ''}`}
          onClick={() => setFabOpen(!fabOpen)}
          aria-label="Quick actions"
        >
          +
        </button>
        <div className={`quickActionsMenu ${fabOpen ? 'open' : ''}`}>
          <button
            className="quickActionBtn note"
            onClick={() => {
              setFabOpen(false)
              props.onNewNote?.()
            }}
          >
            <span className="icon">📝</span>
            New Note
          </button>
          <button
            className="quickActionBtn task"
            onClick={() => {
              setFabOpen(false)
              props.onNewTask?.()
            }}
          >
            <span className="icon">✓</span>
            New Task
          </button>
          <button
            className="quickActionBtn voice"
            onClick={() => {
              setFabOpen(false)
              props.onVoiceCapture?.()
            }}
          >
            <span className="icon">🎙️</span>
            Voice Capture
          </button>
        </div>
      </div>
    </div>
  )
}
