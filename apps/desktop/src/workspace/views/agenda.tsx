import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import type { CalendarEvent } from '../../storage/calendar'
import { Icon } from '../../ui/icons'
import { eventAccent, formatEventTitle, hexToRgba, type EventTitleMode } from '../../ui/event-visual'

export type AgendaMode = 'day' | '3day' | 'week' | 'month'

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

function startOfWeek(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  const day = x.getDay() // Sun=0
  x.setDate(x.getDate() - day)
  return x
}

function isoDay(d: Date) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function formatDayLabel(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
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
  return `${formatDayLabel(a)}–${formatDayLabel(b)}`
}

function formatHourLabel(h: number) {
  const hour = ((h % 24) + 24) % 24
  const period = hour < 12 ? 'AM' : 'PM'
  const display = hour % 12 === 0 ? 12 : hour % 12
  return `${display} ${period}`
}

function formatTime(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function minuteOfDay(ms: number) {
  const d = new Date(ms)
  return d.getHours() * 60 + d.getMinutes()
}

function quantizeTo(minutes: number, step: number) {
  return Math.round(minutes / step) * step
}

type SlotMinutes = 15 | 30 | 60
const SLOT_OPTIONS: SlotMinutes[] = [15, 30, 60]

function extractSegmentsFromNotes(notes: string | null | undefined, dayStartMs: number) {
  const out: Array<{ atMs: number; label: string }> = []
  if (!notes) return out
  for (const line of notes.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:[-*]\s*)?(?:\*\*(\d{1,2}:\d{2})\*\*|\[(\d{1,2}:\d{2})\]|(\d{1,2}:\d{2}))\s*(?:[-–—]|:)?\s*(.+)\s*$/)
    const time = m?.[1] ?? m?.[2] ?? m?.[3]
    const label = m?.[4]
    if (!time || !label) continue
    const [hh, mm] = time.split(':').map(Number)
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) continue
    const atMs = dayStartMs + (hh * 60 + mm) * 60 * 1000
    out.push({ atMs, label: label.trim() })
  }
  return out.slice(0, 12)
}

function layoutColumns(dayEvents: CalendarEvent[]) {
  const sorted = [...dayEvents].sort((a, b) => a.startAt - b.startAt)
  const cols: CalendarEvent[][] = []
  const colIndexById = new Map<string, number>()
  for (const ev of sorted) {
    let placed = false
    for (let i = 0; i < cols.length; i++) {
      const col = cols[i]!
      const last = col[col.length - 1]
      if (!last || last.endAt <= ev.startAt) {
        col.push(ev)
        colIndexById.set(ev.id, i)
        placed = true
        break
      }
    }
    if (!placed) {
      cols.push([ev])
      colIndexById.set(ev.id, cols.length - 1)
    }
  }
  return { colCount: Math.max(1, cols.length), colIndexById }
}

function layoutLogLanes(logs: CalendarEvent[], minGapMinutes: number) {
  const sorted = [...logs].sort((a, b) => a.startAt - b.startAt)
  const laneEndByLane: number[] = []
  const laneIndexById = new Map<string, number>()
  for (const ev of sorted) {
    const m = minuteOfDay(ev.startAt)
    let placed = false
    for (let i = 0; i < laneEndByLane.length; i++) {
      if (m >= (laneEndByLane[i] ?? 0)) {
        laneIndexById.set(ev.id, i)
        laneEndByLane[i] = m + minGapMinutes
        placed = true
        break
      }
    }
    if (!placed) {
      laneIndexById.set(ev.id, laneEndByLane.length)
      laneEndByLane.push(m + minGapMinutes)
    }
  }
  return { laneCount: Math.max(1, laneEndByLane.length), laneIndexById }
}

function effectiveEndAtForRange(ev: CalendarEvent, rangeEndMs: number) {
  if (ev.kind === 'episode' && ev.active) return rangeEndMs
  return ev.endAt
}

function AgendaMonthView(props: {
  date: Date
  onDateChange: (next: Date) => void
  onModeChange: (next: AgendaMode) => void
  onRefresh: () => void
  events: CalendarEvent[]
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
  hideHeader?: boolean
  titleMode?: EventTitleMode
  mode: AgendaMode
}) {
  const titleMode = props.titleMode ?? 'compact'
  const monthStart = new Date(props.date)
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const gridStart = startOfWeek(monthStart)
  const gridDays = Array.from({ length: 42 }).map((_, i) => addDays(gridStart, i))
  const gridStartMs = startOfDayMs(gridStart)
  const gridEndMs = startOfDayMs(addDays(gridStart, 42))
  const monthLabel = props.date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  const byDay = new Map<string, CalendarEvent[]>()
  for (const ev of props.events) {
    const spanStart = startOfDayMs(new Date(ev.startAt))
    let spanEnd = startOfDayMs(new Date(ev.endAt))
    if (ev.kind === 'episode' && ev.active) spanEnd = gridEndMs
    if (spanEnd <= spanStart) spanEnd = spanStart + 24 * 60 * 60 * 1000

    const clampedStart = Math.max(gridStartMs, spanStart)
    const clampedEnd = Math.min(gridEndMs, spanEnd)
    for (let day = clampedStart; day < clampedEnd; day += 24 * 60 * 60 * 1000) {
      const key = isoDay(new Date(day))
      const existing = byDay.get(key) ?? []
      existing.push(ev)
      byDay.set(key, existing)
    }
  }

  return (
    <div className="agRoot agMonth">
      {props.hideHeader ? null : (
        <div className="agHeader">
          <div className="agLeft">
            <button className="agNavBtn" onClick={() => props.onDateChange(addDays(props.date, -30))} aria-label="Previous month">
              ‹
            </button>
            <button className="agNavBtn" onClick={() => props.onDateChange(new Date())}>
              today
            </button>
            <button className="agNavBtn" onClick={() => props.onDateChange(addDays(props.date, 30))} aria-label="Next month">
              ›
            </button>
            <div className="agTitleRow">
              <div className="agTitle">Month</div>
              <div className="agSubtitle">{monthLabel}</div>
            </div>
          </div>
          <div className="agRight">
            <button
              className="agNew"
              onClick={() => {
                const startAt = new Date().getTime()
                props.onRequestCreateEvent({ startAt, endAt: startAt + 60 * 60 * 1000, kind: 'event' })
              }}
            >
              + New
            </button>
          </div>
        </div>
      )}

      <div className="agMonthWrap">
        <div className="agMonthHeaderRow">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="agMonthDow">
              {d}
            </div>
          ))}
        </div>
        <div className="agMonthGrid">
          {gridDays.map((d) => {
          const key = isoDay(d)
          const items = (byDay.get(key) ?? []).slice(0, 4)
          const isOtherMonth = d.getMonth() !== props.date.getMonth()
          const isToday = isoDay(d) === isoDay(new Date())
          return (
            <div
              key={key}
              className={isOtherMonth ? 'agMonthCell muted' : 'agMonthCell'}
              onDoubleClick={() => {
                props.onDateChange(d)
                props.onModeChange('day')
              }}
            >
              <div className={isToday ? 'agMonthDay today' : 'agMonthDay'}>{d.getDate()}</div>
              <div className="agMonthPills">
                {items.map((ev) => {
                  const accent = eventAccent(ev)
                  return (
                    <button
                      key={ev.id}
                      className="agMonthPill"
                      onClick={() => props.onDateChange(new Date(ev.startAt))}
                      title={formatEventTitle(ev, titleMode)}
                      style={{
                        borderColor: hexToRgba(accent.color, 0.35),
                        background: hexToRgba(accent.color, 0.12),
                        color: accent.color,
                      }}
                    >
                      <span className="agAllDayIcon" style={{ borderColor: hexToRgba(accent.color, 0.4) }}>
                        <Icon name={accent.icon} size={10} />
                      </span>
                      <span className="agAllDayText">{formatEventTitle(ev, titleMode)}</span>
                    </button>
                  )
                })}
                {(byDay.get(key)?.length ?? 0) > items.length ? (
                  <div className="agMonthMore">+{(byDay.get(key)?.length ?? 0) - items.length} more</div>
                ) : null}
              </div>
            </div>
          )
        })}
        </div>
      </div>
    </div>
  )
}

function AgendaTimelineView(props: {
  date: Date
  onDateChange: (next: Date) => void
  mode: Exclude<AgendaMode, 'month'>
  onModeChange: (next: Exclude<AgendaMode, 'month'>) => void
  onRefresh: () => void
  events: CalendarEvent[]
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
  onToggleComplete: (eventId: string) => void
  onSelectEvent: (eventId: string) => void
  activeTagFilters: string[]
  onToggleTag: (tag: string) => void
  hideHeader?: boolean
  titleMode?: EventTitleMode
}) {
  const titleMode = props.titleMode ?? 'compact'
  const dayCount = props.mode === 'week' ? 7 : props.mode === '3day' ? 3 : 1
  const days = Array.from({ length: dayCount }).map((_, i) => addDays(props.date, i))
  const rangeStart = startOfDayMs(days[0]!)
  const rangeEnd = startOfDayMs(addDays(days[days.length - 1]!, 1))
  const timeColWidth = props.mode === 'week' ? 48 : 56
  const [slotMinutes, setSlotMinutes] = useState<SlotMinutes>(15)
  const startBaseMinutes = 0
  const totalMinutes = 24 * 60
  const slotRows = Math.max(1, Math.floor(totalMinutes / slotMinutes))
  const slotHeight = props.mode === 'week' ? 24 : props.mode === '3day' ? 26 : 28
  const slots = Array.from({ length: slotRows }).map((_, i) => startBaseMinutes + i * slotMinutes)
  const todayKey = isoDay(new Date())
  const isHabitLog = (e: CalendarEvent) => e.kind === 'log' && Boolean(e.trackerKey?.startsWith('habit:'))

  const filtered = useMemo(() => {
    return props.events
      .filter((e) => e.startAt < rangeEnd && effectiveEndAtForRange(e, rangeEnd) > rangeStart)
      .filter((e) => {
        if (props.activeTagFilters.length === 0) return true
        const tags = e.tags ?? []
        return props.activeTagFilters.every((t) => tags.includes(t))
      })
  }, [props.events, props.activeTagFilters, rangeEnd, rangeStart])

  const allTags = useMemo(() => Array.from(new Set(props.events.flatMap((e) => e.tags ?? []))).slice(0, 12), [props.events])
  const rangeLabel = formatRangeLabel(days[0]!, days[days.length - 1]!)
  const allDayByDay = useMemo(() => {
    const byDay = new Map<string, CalendarEvent[]>()
    for (const ev of filtered) {
      if (!ev.allDay && ev.kind !== 'episode') continue
      const spanStart = startOfDayMs(new Date(ev.startAt))
      let spanEnd = startOfDayMs(new Date(effectiveEndAtForRange(ev, rangeEnd)))
      if (spanEnd <= spanStart) spanEnd = spanStart + 24 * 60 * 60 * 1000
      const clampedStart = Math.max(rangeStart, spanStart)
      const clampedEnd = Math.min(rangeEnd, spanEnd)
      for (let day = clampedStart; day < clampedEnd; day += 24 * 60 * 60 * 1000) {
        const key = isoDay(new Date(day))
        const existing = byDay.get(key) ?? []
        existing.push(ev)
        byDay.set(key, existing)
      }
    }
    for (const [key, items] of byDay.entries()) {
      byDay.set(
        key,
        items.sort((a, b) => a.startAt - b.startAt)
      )
    }
    return byDay
  }, [filtered, rangeEnd, rangeStart])

  const [draft, setDraft] = useState<null | { dayStart: number; startMin: number; endMin: number }>(null)

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!draft) return
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
      const dayCol = el?.closest('.agDayCol') as HTMLDivElement | null
      if (!dayCol) return
      const dayStartStr = dayCol.dataset.daystart
      if (!dayStartStr) return
      const dayStart = Number(dayStartStr)
      const rect = dayCol.getBoundingClientRect()
      const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top))
      const minuteOffset = Math.floor((y / rect.height) * totalMinutes)
      const minute = quantizeTo(startBaseMinutes + minuteOffset, slotMinutes)
      setDraft((d) => {
        if (!d) return d
        return { dayStart, startMin: d.startMin, endMin: minute }
      })
    }

    function onUp() {
      if (!draft) return
      const startMin = Math.min(draft.startMin, draft.endMin)
      const endMin = Math.max(draft.startMin, draft.endMin)
      const durMin = Math.max(slotMinutes, endMin - startMin)
      const startAt = draft.dayStart + startMin * 60 * 1000
      const endAt = startAt + durMin * 60 * 1000
      setDraft(null)
      props.onRequestCreateEvent({ startAt, endAt, kind: 'event' })
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [draft, props, slotMinutes, startBaseMinutes, totalMinutes])

  const rootClass = props.mode === 'week' ? 'agRoot agWeek' : props.mode === '3day' ? 'agRoot agThreeDay' : 'agRoot'
  const headerCols = `${timeColWidth}px repeat(${dayCount}, 1fr)`

  return (
    <div
      className={rootClass}
      style={{
        ['--ag-slot-h' as any]: `${slotHeight}px`,
        ['--ag-slot-rows' as any]: slotRows,
      }}>
      {props.hideHeader ? null : (
        <div className="agHeader">
          <div className="agLeft">
            <button className="agNavBtn" onClick={() => props.onDateChange(addDays(props.date, -1))} aria-label="Previous">
              ‹
            </button>
            <button className="agNavBtn" onClick={() => props.onDateChange(new Date())}>
              today
            </button>
            <button className="agNavBtn" onClick={() => props.onDateChange(addDays(props.date, 1))} aria-label="Next">
              ›
            </button>
            <button className="agNavBtn" onClick={props.onRefresh}>
              refresh
            </button>
            <div className="agTitleRow">
              <div className="agTitle">{props.mode === 'week' ? 'Week' : props.mode === '3day' ? '3-Day' : 'Day'}</div>
              <div className="agSubtitle">{rangeLabel}</div>
            </div>
          </div>
          <div className="agRight">
            <div className="agMode" role="tablist" aria-label="Calendar mode">
              {(['day', '3day', 'week', 'month'] as const).map((m) => (
                <button
                  key={m}
                  className={props.mode === m ? 'agModeBtn active' : 'agModeBtn'}
                  onClick={() => {
                    if (m === 'month') {
                      ;(props.onModeChange as any)('month')
                      return
                    }
                    props.onModeChange(m as Exclude<AgendaMode, 'month'>)
                  }}
                >
                  {m === '3day' ? '3 Day' : m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
            <div className="agZoom" role="group" aria-label="Time scale">
              <span className="agZoomLabel">Scale</span>
              {SLOT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={slotMinutes === opt ? 'agZoomBtn active' : 'agZoomBtn'}
                  onClick={() => setSlotMinutes(opt)}
                  aria-pressed={slotMinutes === opt}>
                  {opt}m
                </button>
              ))}
            </div>
            <button
              className="agNew"
              onClick={() => {
                const startAt = rangeStart + 9 * 60 * 60 * 1000
                const endAt = startAt + 60 * 60 * 1000
                props.onRequestCreateEvent({ startAt, endAt, kind: 'event' })
              }}
            >
              + New
            </button>
          </div>
        </div>
      )}

      {props.hideHeader ? null : (
        <div className="agFilters">
          {allTags.length === 0 ? (
            <div className="agFiltersEmpty">No tags yet.</div>
          ) : (
            allTags.map((t) => (
              <button key={t} className={props.activeTagFilters.includes(t) ? 'agChip active' : 'agChip'} onClick={() => props.onToggleTag(t)}>
                {t}
              </button>
            ))
          )}
        </div>
      )}

      <div className="agDayHeader" style={{ gridTemplateColumns: headerCols }}>
        <div className="agAllDayLabel">all day</div>
        {days.map((d) => {
          const key = isoDay(d)
          const isToday = key === todayKey
          const pills = (allDayByDay.get(key) ?? []).slice(0, 4)
          return (
            <div key={key} className={isToday ? 'agDayHeaderCell today' : 'agDayHeaderCell'}>
              <div className="agDayHeaderTitle">
                <span className="agDayHeaderDow">{d.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                <span className="agDayHeaderDate">{d.getDate()}</span>
              </div>
              {pills.length ? (
                <div className="agAllDayPills">
                  {pills.map((ev) => {
                    const accent = eventAccent(ev)
                    return (
                      <button
                        key={ev.id}
                        className={ev.active ? 'agAllDayPill active' : 'agAllDayPill'}
                        onClick={() => props.onSelectEvent(ev.id)}
                        style={{
                          borderColor: hexToRgba(accent.color, 0.35),
                          background: hexToRgba(accent.color, 0.12),
                        }}
                        title={formatEventTitle(ev, titleMode)}
                      >
                        <span className="agAllDayIcon" style={{ borderColor: hexToRgba(accent.color, 0.4) }}>
                          <Icon name={accent.icon} size={12} />
                        </span>
                        <span className="agAllDayText">{formatEventTitle(ev, titleMode)}</span>
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="agGrid">
        <div className="agGridInner" style={{ gridTemplateColumns: headerCols }}>
          <div className="agTimeCol">
            {slots.map((minute) => {
              const isHour = minute % 60 === 0
              const label = isHour ? formatHourLabel((minute / 60) | 0) : ''
              return (
                <div key={minute} className={isHour ? 'agTimeCell hour' : 'agTimeCell'}>
                  {label}
                </div>
              )
            })}
          </div>
          {days.map((d) => {
            const dayStart = startOfDayMs(d)
            const dayEnd = dayStart + 24 * 60 * 60 * 1000
            const isToday = isoDay(d) === todayKey
            const dayEvents = filtered
              .filter((e) => !e.allDay && e.kind !== 'episode')
              .filter((e) => e.kind !== 'log' || isHabitLog(e))
              .filter((e) => e.startAt >= dayStart && e.startAt < dayEnd)
            const { colCount, colIndexById } = layoutColumns(dayEvents)
            return (
              <div
                key={d.toISOString()}
                className={isToday ? 'agDayCol today' : 'agDayCol'}
                data-daystart={dayStart}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const eventId = e.dataTransfer.getData('text/eventId')
                  const durMs = Number(e.dataTransfer.getData('text/eventDuration') || 0)
                  if (!eventId || !Number.isFinite(durMs) || durMs <= 0) return
                  const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
                  const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top))
                  const minuteOffset = Math.floor((y / rect.height) * totalMinutes)
                  const minute = quantizeTo(startBaseMinutes + minuteOffset, slotMinutes)
                  const startAt = dayStart + minute * 60 * 1000
                  props.onMoveEvent(eventId, startAt, startAt + durMs)
                }}
                onMouseDown={(e) => {
                  if (e.button !== 0 || (e.target as HTMLElement).closest('.agEvent')) return
                  const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
                  const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top))
                  const minuteOffset = Math.floor((y / rect.height) * totalMinutes)
                  const minute = quantizeTo(startBaseMinutes + minuteOffset, slotMinutes)
                  setDraft({ dayStart, startMin: minute, endMin: minute + slotMinutes })
                }}
              >
                {slots.map((minute) => {
                  const isHour = minute % 60 === 0
                  return <div key={minute} className={isHour ? 'agRow hour' : 'agRow'} />
                })}
                {dayEvents.map((ev) => {
                  const accent = eventAccent(ev)
                  const startMin = minuteOfDay(ev.startAt)
                  const endMin = ev.endAt >= dayEnd ? totalMinutes : Math.max(startMin + slotMinutes, minuteOfDay(ev.endAt))
                  const top = ((startMin - startBaseMinutes) / totalMinutes) * 100
                  const height = ((endMin - startMin) / totalMinutes) * 100
                  const colIndex = colIndexById.get(ev.id) ?? 0
                  const widthPct = 100 / colCount
                  const leftPct = colIndex * widthPct
                  const segments = extractSegmentsFromNotes(ev.notes, dayStart)
                    .filter((s) => s.atMs >= ev.startAt && s.atMs <= ev.endAt)
                    .map((s) => ({ ...s, pct: ((s.atMs - ev.startAt) / Math.max(1, ev.endAt - ev.startAt)) * 100 }))
                  const metaTags = (ev.tags ?? []).slice(0, 2).join(' ')
                  const meta = metaTags ? `${formatTime(ev.startAt)}–${formatTime(ev.endAt)} · ${metaTags}` : `${formatTime(ev.startAt)}–${formatTime(ev.endAt)}`
                  return (
                    <motion.div
                      key={ev.id}
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.01, zIndex: 2 }}
                      className={ev.kind === 'task' ? (ev.completedAt ? 'agEvent done' : 'agEvent') : 'agEvent'}
                      style={{
                        top: `${top}%`,
                        height: `${Math.max(1.5, height)}%`,
                        left: `calc(${leftPct}% + 4px)`,
                        width: `calc(${widthPct}% - 8px)`,
                        borderColor: hexToRgba(accent.color, 0.32),
                        background: hexToRgba(accent.color, 0.16),
                        ['--card-glow' as any]: hexToRgba(accent.color, 0.35),
                      }}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/eventId', ev.id)
                        e.dataTransfer.setData('text/eventDuration', String(ev.endAt - ev.startAt))
                        e.dataTransfer.effectAllowed = 'move'
                      }}
                      onPointerMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        const x = e.clientX - rect.left
                        const y = e.clientY - rect.top
                        e.currentTarget.style.setProperty('--card-x', `${x}px`)
                        e.currentTarget.style.setProperty('--card-y', `${y}px`)
                      }}
                      onPointerLeave={(e) => {
                        e.currentTarget.style.setProperty('--card-x', '50%')
                        e.currentTarget.style.setProperty('--card-y', '50%')
                      }}
                      onClick={() => props.onSelectEvent(ev.id)}
                    >
                      <div className="agStripe" style={{ background: hexToRgba(accent.color, 0.9) }} />
                      <div className="agEventTitleRow">
                        <span className="agEventIcon" style={{ borderColor: hexToRgba(accent.color, 0.35) }}>
                          <Icon name={accent.icon} size={12} />
                        </span>
                        <span className="agEventTitle">{formatEventTitle(ev, titleMode)}</span>
                        {ev.kind === 'task' ? (
                          <button
                            className={ev.completedAt ? 'agCheck checked' : 'agCheck'}
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              props.onToggleComplete(ev.id)
                            }}
                            aria-label={ev.completedAt ? 'Mark incomplete' : 'Mark complete'}
                          >
                            <span className="agCheckBox" />
                          </button>
                        ) : null}
                      </div>
                      <div className="agEventMeta">{meta}</div>
                      {segments.length ? (
                        <div className="agSegments">
                          {segments.map((s) => (
                            <div key={`${ev.id}_${s.atMs}`} className="agSeg" style={{ top: `${s.pct}%` }}>
                              <div className="agSegLine" />
                              <div className="agSegLabel">{s.label}</div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <div className="agResize" aria-hidden="true" />
                    </motion.div>
                  )
                })}
                {draft && draft.dayStart === dayStart ? (
                  <div
                    className="agDraft"
                    style={{
                      top: `${((Math.min(draft.startMin, draft.endMin) - startBaseMinutes) / totalMinutes) * 100}%`,
                      height: `${(Math.max(slotMinutes, Math.abs(draft.endMin - draft.startMin)) / totalMinutes) * 100}%`,
                    }}
                  />
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function AgendaView(props: {
  date: Date
  onDateChange: (next: Date) => void
  mode: AgendaMode
  onModeChange: (next: AgendaMode) => void
  onRefresh: () => void
  events: CalendarEvent[]
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
  onToggleComplete: (eventId: string) => void
  onSelectEvent: (eventId: string) => void
  activeTagFilters: string[]
  onToggleTag: (tag: string) => void
  hideHeader?: boolean
  titleMode?: EventTitleMode
}) {
  if (props.mode === 'month') {
    return (
      <AgendaMonthView
        date={props.date}
        onDateChange={props.onDateChange}
        onModeChange={props.onModeChange}
        onRefresh={props.onRefresh}
        events={props.events}
        onRequestCreateEvent={props.onRequestCreateEvent}
        onCreateEvent={props.onCreateEvent}
        hideHeader={props.hideHeader}
        titleMode={props.titleMode}
        mode={props.mode}
      />
    )
  }

  return (
      <AgendaTimelineView
        date={props.date}
        onDateChange={props.onDateChange}
        mode={props.mode}
        onModeChange={props.onModeChange as any}
        onRefresh={props.onRefresh}
        events={props.events}
        onRequestCreateEvent={props.onRequestCreateEvent}
        onCreateEvent={props.onCreateEvent}
        onMoveEvent={props.onMoveEvent}
        onToggleComplete={props.onToggleComplete}
        onSelectEvent={props.onSelectEvent}
        activeTagFilters={props.activeTagFilters}
        onToggleTag={props.onToggleTag}
        hideHeader={props.hideHeader}
        titleMode={props.titleMode}
      />
  )
}
