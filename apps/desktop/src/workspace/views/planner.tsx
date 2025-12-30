import { useEffect, useMemo, useState } from 'react'
import type { CalendarEvent } from '../../storage/calendar'
import type { InboxCapture } from '../../storage/inbox'
import type { Task } from '../../storage/tasks'
import { TiimoDayView } from './tiimo-day'
import { AgendaView, type AgendaMode } from './agenda'
import { TimelineView } from './timeline'
import type { EventTitleDetail } from '../../ui/display-settings'
import type { EventTitleMode } from '../../ui/event-visual'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

type PlannerMode = 'day' | 'week' | 'month' | 'timeline' | 'gantt'

type GanttRange = 'week' | 'month' | 'quarter'
type GanttMode = 'all' | 'tasks' | 'events'

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

function formatRangeLabel(a: Date, b: Date) {
  const sameYear = a.getFullYear() === b.getFullYear()
  const sameMonth = sameYear && a.getMonth() === b.getMonth()
  if (sameMonth) {
    const month = a.toLocaleDateString(undefined, { month: 'short' })
    return `${month} ${a.getDate()}–${b.getDate()}, ${a.getFullYear()}`
  }
  if (sameYear) {
    const left = a.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    const right = b.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    return `${left}–${right}, ${a.getFullYear()}`
  }
  return `${a.toLocaleDateString()}–${b.toLocaleDateString()}`
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function toTagSet(tags: string[] | null | undefined) {
  return (tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean)
}

export function PlannerView(props: {
  date: Date
  onDateChange: (next: Date) => void
  onRefresh: () => void
  tasks: Task[]
  captures: InboxCapture[]
  events: CalendarEvent[]
  selection: { kind: 'none' } | { kind: 'task'; id: string } | { kind: 'event'; id: string } | { kind: 'capture'; id: string }
  setSelection: (s: { kind: 'none' } | { kind: 'task'; id: string } | { kind: 'event'; id: string } | { kind: 'capture'; id: string }) => void
  onCreateTask: (input: { title: string; tags?: string[] }) => void
  onToggleTaskComplete: (taskId: string) => void
  onRequestCreateEvent: (seed: { startAt: number; endAt: number; kind?: CalendarEvent['kind']; taskId?: string | null }) => void
  onCreateEvent: (input: {
    title: string
    startAt: number
    endAt: number
    kind?: CalendarEvent['kind']
    taskId?: string | null
    tags?: string[]
    trackerKey?: string | null
    category?: string | null
    subcategory?: string | null
    estimateMinutes?: number | null
  }) => void
  onMoveEvent: (eventId: string, startAt: number, endAt: number) => void
  onToggleEventComplete: (eventId: string) => void
  onUpdateEvent: (eventId: string, patch: Partial<CalendarEvent>) => void
  onToggleTaskChecklistItem?: (taskId: string, lineIndex: number) => void
  eventTitleDetail: EventTitleDetail
}) {
  const [mode, setMode] = useState<PlannerMode>('day')
  const [agendaMode, setAgendaMode] = useState<AgendaMode>('week')
  const [ganttRange, setGanttRange] = useState<GanttRange>('month')
  const [ganttMode, setGanttMode] = useState<GanttMode>('all')
  const [ganttQuery, setGanttQuery] = useState('')
  const [ganttTagFilter, setGanttTagFilter] = useState<string | null>(null)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.calendarMode = mode
    return () => {
      if (root.dataset.calendarMode === mode) delete root.dataset.calendarMode
    }
  }, [mode])

  function resolveTitleMode(detail: EventTitleDetail, currentMode: PlannerMode): EventTitleMode {
    if (detail === 'full') return 'detailed'
    if (detail === 'focus') return 'focus'
    return currentMode === 'day' ? 'detailed' : 'compact'
  }

  const titleMode = resolveTitleMode(props.eventTitleDetail, mode)

  const rangeLabel = useMemo(() => {
    if (mode === 'month') return props.date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    if (mode === 'week') {
      const start = addDays(props.date, -props.date.getDay())
      const end = addDays(start, 6)
      return formatRangeLabel(start, end)
    }
    return props.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  }, [mode, props.date])

  function jump(delta: number) {
    if (mode === 'month') return props.onDateChange(addDays(props.date, 30 * delta))
    if (mode === 'week') return props.onDateChange(addDays(props.date, 7 * delta))
    return props.onDateChange(addDays(props.date, delta))
  }

  const ganttDays = ganttRange === 'week' ? 7 : ganttRange === 'quarter' ? 90 : 30
  const ganttStart = startOfDayMs(props.date)
  const ganttEnd = ganttStart + ganttDays * 24 * 60 * 60 * 1000
  const ganttQueryLower = ganttQuery.trim().toLowerCase()

  const ganttItems = useMemo(() => {
    const items: Array<{
      id: string
      title: string
      kind: 'task' | 'event'
      startAt: number
      endAt: number
      tags: string[]
    }> = []

    if (ganttMode === 'all' || ganttMode === 'tasks') {
      for (const t of props.tasks) {
        const startAt = t.scheduledAt ?? t.dueAt ?? null
        if (!startAt) continue
        const minutes = t.estimateMinutes ?? 60
        const endAt = t.scheduledAt ? t.scheduledAt + Math.max(15, minutes) * 60 * 1000 : startAt + Math.max(15, minutes) * 60 * 1000
        if (endAt < ganttStart || startAt > ganttEnd) continue
        items.push({
          id: t.id,
          title: t.title,
          kind: 'task',
          startAt,
          endAt,
          tags: t.tags ?? [],
        })
      }
    }

    if (ganttMode === 'all' || ganttMode === 'events') {
      for (const e of props.events) {
        if (e.kind === 'log' || e.kind === 'episode') continue
        if (e.endAt < ganttStart || e.startAt > ganttEnd) continue
        items.push({
          id: e.id,
          title: e.title,
          kind: 'event',
          startAt: e.startAt,
          endAt: e.endAt,
          tags: e.tags ?? [],
        })
      }
    }

    const filtered = items.filter((it) => {
      if (!ganttQueryLower && !ganttTagFilter) return true
      if (ganttQueryLower && !it.title.toLowerCase().includes(ganttQueryLower)) {
        const matchTag = toTagSet(it.tags).some((t) => t.includes(ganttQueryLower))
        if (!matchTag) return false
      }
      if (ganttTagFilter) {
        const set = toTagSet(it.tags)
        if (!set.includes(ganttTagFilter.toLowerCase())) return false
      }
      return true
    })

    return filtered.sort((a, b) => a.startAt - b.startAt)
  }, [ganttEnd, ganttMode, ganttQueryLower, ganttStart, ganttTagFilter, props.events, props.tasks])

  const ganttTags = useMemo(() => {
    const all = new Set<string>()
    for (const t of props.tasks) for (const tag of t.tags ?? []) all.add(tag)
    for (const e of props.events) for (const tag of e.tags ?? []) all.add(tag)
    return Array.from(all.values())
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 12)
  }, [props.events, props.tasks])

  return (
    <div className="plRight">
      <div className="plHeader">
        <div className="plHeaderLeft">
          <Button variant="outline" size="sm" className="plNavBtn" onClick={() => jump(-1)} aria-label="Previous">
            ‹
          </Button>
          <Button variant="outline" size="sm" className="plNavBtn" onClick={() => props.onDateChange(new Date())}>
            today
          </Button>
          <Button variant="outline" size="sm" className="plNavBtn" onClick={() => jump(1)} aria-label="Next">
            ›
          </Button>
          <Button variant="outline" size="sm" className="plNavBtn" onClick={props.onRefresh} title="Refresh">
            refresh
          </Button>
          <div className="plRange">{rangeLabel}</div>
        </div>
        <div className="plHeaderRight">
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(next) => {
              if (!next) return
              const nextMode = next as PlannerMode
              setMode(nextMode)
              if (nextMode === 'week') setAgendaMode('week')
              if (nextMode === 'month') setAgendaMode('month')
            }}
            className="plModes"
            aria-label="Calendar mode"
          >
            <ToggleGroupItem value="day" className="plModeToggle">
              Day
            </ToggleGroupItem>
            <ToggleGroupItem value="week" className="plModeToggle">
              Week
            </ToggleGroupItem>
            <ToggleGroupItem value="month" className="plModeToggle">
              Month
            </ToggleGroupItem>
            <ToggleGroupItem value="timeline" className="plModeToggle">
              Timeline
            </ToggleGroupItem>
            <ToggleGroupItem value="gantt" className="plModeToggle">
              Gantt
            </ToggleGroupItem>
          </ToggleGroup>
          <Button
            className="plNew"
            onClick={() => {
              const now = Date.now()
              const startAt = startOfDayMs(props.date) + 9 * 60 * 60 * 1000
              const s = mode === 'day' ? now : startAt
              props.onRequestCreateEvent({ startAt: s, endAt: s + 60 * 60 * 1000, kind: 'event' })
            }}
          >
            + New
          </Button>
        </div>
      </div>

      <div className="plBody">
        <div className="plHero pageHero">
          {mode === 'day' ? (
            <TiimoDayView
              hideHeader
              date={props.date}
              onDateChange={props.onDateChange}
              onRefresh={props.onRefresh}
              events={props.events}
              onRequestCreateEvent={props.onRequestCreateEvent}
              onCreateEvent={props.onCreateEvent}
              onMoveEvent={props.onMoveEvent}
              onToggleComplete={props.onToggleEventComplete}
              onSelectEvent={(id) => props.setSelection({ kind: 'event', id })}
              onUpdateEvent={props.onUpdateEvent}
              onToggleTaskChecklistItem={props.onToggleTaskChecklistItem}
              activeTagFilters={[]}
              titleMode={titleMode}
            />
          ) : mode === 'week' || mode === 'month' ? (
            <AgendaView
              date={props.date}
              onDateChange={props.onDateChange}
              mode={agendaMode}
              onModeChange={(m) => {
                setAgendaMode(m)
                setMode(m === 'month' ? 'month' : m === 'week' ? 'week' : 'day')
              }}
              onRefresh={props.onRefresh}
              events={props.events}
              onRequestCreateEvent={props.onRequestCreateEvent}
              onCreateEvent={props.onCreateEvent}
              onMoveEvent={props.onMoveEvent}
              onToggleComplete={props.onToggleEventComplete}
              onSelectEvent={(id) => props.setSelection({ kind: 'event', id })}
              activeTagFilters={[]}
              onToggleTag={() => {}}
              hideHeader
              titleMode={titleMode}
            />
          ) : mode === 'timeline' ? (
            <TimelineView
              events={props.events}
              captures={props.captures}
              activeTagFilters={[]}
              onToggleTag={() => {}}
              onSelectEvent={(id) => props.setSelection({ kind: 'event', id })}
              onSelectCapture={(id) => props.setSelection({ kind: 'capture', id })}
              hideHeader
            />
          ) : (
            <div className="plGantt">
              <div className="plGanttTitleRow">
                <div>
                  <div className="plGanttTitle">Gantt</div>
                  <div className="plGanttSub">Filter by tags, tasks, or events. Drag onto the calendar for scheduling.</div>
                </div>
              </div>
              <div className="plGanttToolbar">
                <input
                  className="plGanttSearch"
                  value={ganttQuery}
                  onChange={(e) => setGanttQuery(e.target.value)}
                  placeholder="Search title or tag…"
                />
                <div className="plGanttToggle">
                  {(['all', 'tasks', 'events'] as const).map((k) => (
                    <button key={k} className={ganttMode === k ? 'plGanttToggleBtn active' : 'plGanttToggleBtn'} onClick={() => setGanttMode(k)}>
                      {k}
                    </button>
                  ))}
                </div>
                <div className="plGanttToggle">
                  {(['week', 'month', 'quarter'] as const).map((k) => (
                    <button key={k} className={ganttRange === k ? 'plGanttToggleBtn active' : 'plGanttToggleBtn'} onClick={() => setGanttRange(k)}>
                      {k}
                    </button>
                  ))}
                </div>
              </div>
              <div className="plGanttTags">
                <button className={!ganttTagFilter ? 'plGanttTag active' : 'plGanttTag'} onClick={() => setGanttTagFilter(null)}>
                  All tags
                </button>
                {ganttTags.map((t) => (
                  <button
                    key={t}
                    className={ganttTagFilter === t ? 'plGanttTag active' : 'plGanttTag'}
                    onClick={() => setGanttTagFilter(ganttTagFilter === t ? null : t)}>
                    {t}
                  </button>
                ))}
              </div>
              <div className="plGanttScaleWrapper">
                {(() => {
                  const days = Array.from({ length: ganttDays }).map((_, i) => new Date(ganttStart + i * 24 * 60 * 60 * 1000))
                  const months: { month: string; count: number }[] = []
                  let currentMonth = ''
                  for (const d of days) {
                    const m = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
                    if (m !== currentMonth) {
                      months.push({ month: m, count: 1 })
                      currentMonth = m
                    } else {
                      months[months.length - 1].count++
                    }
                  }
                  return (
                    <>
                      <div className="plGanttMonthRow" style={{ ['--pl-gantt-cols' as any]: ganttDays }}>
                        {months.map((m, idx) => (
                          <div
                            key={idx}
                            className="plGanttMonthCell"
                            style={{ gridColumn: `span ${m.count}` }}
                          >
                            {m.month}
                          </div>
                        ))}
                      </div>
                      <div className="plGanttScale" style={{ ['--pl-gantt-cols' as any]: ganttDays }}>
                        {days.map((d, i) => (
                          <div key={i} className="plGanttScaleCell">
                            {d.getDate()}
                          </div>
                        ))}
                      </div>
                    </>
                  )
                })()}
              </div>
              <div className="plGanttRows">
                {ganttItems.length === 0 ? (
                  <div className="plGanttEmpty">No items in range.</div>
                ) : (
                  ganttItems.map((item) => {
                    const rangeMs = ganttDays * 24 * 60 * 60 * 1000
                    const leftPct = clamp(((item.startAt - ganttStart) / rangeMs) * 100, 0, 100)
                    const endPct = clamp(((item.endAt - ganttStart) / rangeMs) * 100, 0, 100)
                    const widthPct = Math.max(1, endPct - leftPct)
                    const kind = item.kind
                      return (
                        <div
                          key={item.id}
                          className="plGanttRow"
                          draggable
                          onDragStart={(e) => {
                            if (item.kind === 'task') {
                              e.dataTransfer.setData('text/taskId', item.id)
                              e.dataTransfer.setData('text/taskTitle', item.title)
                              e.dataTransfer.setData('text/plain', item.title)
                              return
                            }
                            e.dataTransfer.setData('text/eventId', item.id)
                            e.dataTransfer.setData('text/eventStartAt', String(item.startAt))
                            e.dataTransfer.setData('text/eventEndAt', String(item.endAt))
                            e.dataTransfer.setData('text/plain', item.title)
                          }}
                          onClick={() => props.setSelection({ kind, id: item.id })}>
                        <div className="plGanttRowTitle">
                          <span className="plGanttRowName">{item.title}</span>
                          <span className="plGanttRowMeta">{item.kind}</span>
                        </div>
                        <div className="plGanttRowTrack">
                          <div
                            className={item.kind === 'task' ? 'plGanttBar task' : 'plGanttBar'}
                            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
