import { useEffect, useMemo, useRef, useState } from 'react'
import type { CalendarEvent } from '../../storage/calendar'
import { Icon } from '../../ui/icons'
import { eventAccent, formatEventTitle, hexToRgba, type EventTitleMode } from '../../ui/event-visual'
import { parseChecklistMarkdown, toggleChecklistLine } from '../../ui/checklist'
import { pointsForEvent } from '../../scoring/points'

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

function formatDayLabel(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function minuteOfDay(ms: number) {
  const d = new Date(ms)
  return d.getHours() * 60 + d.getMinutes()
}

function quantizeTo(minutes: number, step: number) {
  return Math.round(minutes / step) * step
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

type CardSizeClass = 'micro' | 'compact' | 'standard' | 'full'

function getCardSizeClass(durationMinutes: number): CardSizeClass {
  if (durationMinutes <= 20) return 'micro'
  if (durationMinutes <= 45) return 'compact'
  if (durationMinutes <= 120) return 'standard'
  return 'full'
}

function formatElapsed(ms: number): string {
  if (ms <= 0) return '0m'
  const totalMins = Math.floor(ms / 60000)
  const hours = Math.floor(totalMins / 60)
  const mins = totalMins % 60
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

function formatPoints(pts: number): string {
  if (pts >= 1000) return `${(pts / 1000).toFixed(1)}k`
  return Math.round(pts).toString()
}

function formatCategoryMeta(ev: CalendarEvent) {
  const category = (ev.category ?? '').trim()
  const subcategory = (ev.subcategory ?? '').trim()
  return [category, subcategory].filter(Boolean).join(' | ')
}

type SlotMinutes = 15 | 30 | 60
const SLOT_OPTIONS: SlotMinutes[] = [15, 30, 60]
const SNAP_INTERVAL = 5 // 5-minute snap for precise dragging
const LOG_COL_STORAGE_KEY = 'insight5.timeline.logColWidth'

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

function formatTime(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function TiimoDayView(props: {
  date: Date
  onDateChange: (next: Date) => void
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
  onUpdateEvent: (eventId: string, patch: Partial<CalendarEvent>) => void
  onToggleTaskChecklistItem?: (taskId: string, lineIndex: number) => void
  activeTagFilters: string[]
  hideHeader?: boolean
  titleMode?: EventTitleMode
}) {
  const titleMode = props.titleMode ?? 'detailed'
  const dayStart = startOfDayMs(props.date)
  const dayEnd = startOfDayMs(addDays(props.date, 1))
  const isHabitLog = (e: CalendarEvent) => e.kind === 'log' && Boolean(e.trackerKey?.startsWith('habit:'))

  const [slotMinutes, setSlotMinutes] = useState<SlotMinutes>(15)
  const startBaseMinutes = 0
  const endBaseMinutes = 24 * 60
  const totalMinutes = endBaseMinutes - startBaseMinutes
  const slotRows = Math.max(1, Math.floor(totalMinutes / slotMinutes))
  const slotHeight = 28

  function effectiveEndAt(e: CalendarEvent) {
    if (e.kind === 'episode' && e.active) return dayEnd
    return e.endAt
  }

  const allDayEvents = useMemo(() => {
    return props.events
      .filter((e) => e.kind !== 'log')
      .filter((e) => e.allDay || e.kind === 'episode')
      .filter((e) => e.startAt < dayEnd && effectiveEndAt(e) > dayStart)
      .filter((e) => {
        if (props.activeTagFilters.length === 0) return true
        const tags = e.tags ?? []
        return props.activeTagFilters.every((t) => tags.includes(t))
      })
      .sort((a, b) => a.startAt - b.startAt)
  }, [dayEnd, dayStart, props.activeTagFilters, props.events])

  const dayEvents = useMemo(() => {
    return props.events
      .filter((e) => e.kind !== 'log' || isHabitLog(e))
      .filter((e) => !e.allDay && e.kind !== 'episode')
      .filter((e) => e.startAt >= dayStart && e.startAt < dayEnd)
      .filter((e) => {
        if (props.activeTagFilters.length === 0) return true
        const tags = e.tags ?? []
        return props.activeTagFilters.every((t) => tags.includes(t))
      })
  }, [dayEnd, dayStart, props.activeTagFilters, props.events])

  const trackerLogs = useMemo(() => {
    return props.events
      .filter((e) => e.startAt >= dayStart && e.startAt < dayEnd)
      .filter((e) => e.kind === 'log' && !isHabitLog(e))
      .sort((a, b) => a.startAt - b.startAt)
  }, [dayEnd, dayStart, props.events])

  const { colCount, colIndexById } = useMemo(() => layoutColumns(dayEvents), [dayEvents])
  const { laneIndexById: logLaneIndexById } = useMemo(() => layoutLogLanes(trackerLogs, 12), [trackerLogs])

  const [draft, setDraft] = useState<null | { startMin: number; endMin: number }>(null)
  const [drag, setDrag] = useState<null | { id: string; mode: 'move' | 'resize'; startAt: number; endAt: number; offsetMin: number }>(null)
  const [contextMenu, setContextMenu] = useState<null | { eventId: string; x: number; y: number }>(null)
  const gridRef = useRef<HTMLDivElement | null>(null)
  const logMenuRef = useRef<HTMLDivElement | null>(null)
  const contextMenuRef = useRef<HTMLDivElement | null>(null)
  const [logMenu, setLogMenu] = useState<null | { id: string; top: string }>(null)
  const resizeRef = useRef<null | { startX: number; startWidth: number }>(null)
  const [logColWidth, setLogColWidth] = useState(() => {
    try {
      const raw = localStorage.getItem(LOG_COL_STORAGE_KEY)
      const value = Number(raw)
      if (Number.isFinite(value)) return clamp(value, 110, 240)
    } catch {
      // ignore
    }
    return 160
  })

  // Current time indicator - updates every minute
  const [nowMinute, setNowMinute] = useState(() => minuteOfDay(Date.now()))
  const isToday = startOfDayMs(new Date()) === dayStart

  // Track elapsed time for active events - updates every second
  const [nowMs, setNowMs] = useState(() => Date.now())
  const hasActiveEvents = useMemo(() => dayEvents.some((e) => e.active), [dayEvents])

  useEffect(() => {
    if (!isToday) return
    const interval = setInterval(() => {
      setNowMinute(minuteOfDay(Date.now()))
    }, 60 * 1000) // Update every minute
    return () => clearInterval(interval)
  }, [isToday])

  useEffect(() => {
    if (!hasActiveEvents) return
    const interval = setInterval(() => {
      setNowMs(Date.now())
    }, 1000) // Update every second for active events
    return () => clearInterval(interval)
  }, [hasActiveEvents])

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!resizeRef.current) return
      const delta = e.clientX - resizeRef.current.startX
      const next = clamp(resizeRef.current.startWidth - delta, 110, 240)
      setLogColWidth(next)
    }

    function onUp() {
      if (!resizeRef.current) return
      resizeRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(LOG_COL_STORAGE_KEY, String(logColWidth))
    } catch {
      // ignore
    }
  }, [logColWidth])

  function trackerValueFromTitle(title: string) {
    const direct = title.match(/(\d{1,2})\s*\/\s*10/)
    if (direct?.[1]) return Math.max(0, Math.min(10, Number(direct[1])))
    const colon = title.match(/:\s*(\d{1,2})\b/)
    if (colon?.[1]) return Math.max(0, Math.min(10, Number(colon[1])))
    return null
  }

  function trackerKeyForEvent(ev: CalendarEvent) {
    const key = (ev.trackerKey ?? '').trim().toLowerCase()
    if (key) return key
    const tags = (ev.tags ?? []).map((t) => t.replace(/^#/, '').toLowerCase())
    for (const t of tags) {
      if (['mood', 'energy', 'stress', 'pain', 'sleep', 'workout', 'period'].includes(t)) return t
    }
    const text = `${ev.title} ${(ev.tags ?? []).join(' ')}`.toLowerCase()
    if (/\bmood\b/.test(text)) return 'mood'
    if (/\benergy\b/.test(text)) return 'energy'
    if (/\bstress\b/.test(text)) return 'stress'
    if (/\bpain\b/.test(text)) return 'pain'
    if (/\bsleep\b/.test(text)) return 'sleep'
    if (/\bworkout\b/.test(text)) return 'workout'
    if (/\bperiod\b/.test(text)) return 'period'
    return 'tracker'
  }

  function trackerLabelForEvent(ev: CalendarEvent) {
    const key = trackerKeyForEvent(ev)
    const value = trackerValueFromTitle(ev.title)
    const label = key.replace(/[_-]+/g, ' ')
    if (key === 'water') return ev.title || label
    if (value != null) return `${label}: ${value}/10`
    return ev.title || label
  }

  useEffect(() => {
    if (!logMenu) return
    function onDown(e: MouseEvent) {
      if (!logMenuRef.current) return
      if (logMenuRef.current.contains(e.target as Node)) return
      setLogMenu(null)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [logMenu])

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return
    function onDown(e: MouseEvent) {
      if (contextMenuRef.current?.contains(e.target as Node)) return
      setContextMenu(null)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('contextmenu', onDown)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('contextmenu', onDown)
    }
  }, [contextMenu])

  // Context menu action handlers
  function handleStartNow(eventId: string) {
    const now = Date.now()
    const ev = props.events.find((e) => e.id === eventId)
    if (!ev) return
    props.onMoveEvent(eventId, now, ev.endAt > now ? ev.endAt : now + 60 * 60 * 1000)
    setContextMenu(null)
  }

  function handleStopNow(eventId: string) {
    const now = Date.now()
    const ev = props.events.find((e) => e.id === eventId)
    if (!ev) return
    if (now > ev.startAt) {
      props.onMoveEvent(eventId, ev.startAt, now)
    }
    setContextMenu(null)
  }

  function handleDuplicate(eventId: string) {
    const ev = props.events.find((e) => e.id === eventId)
    if (!ev) return
    props.onCreateEvent({
      title: ev.title,
      startAt: ev.startAt,
      endAt: ev.endAt,
      kind: ev.kind,
      tags: ev.tags,
      category: ev.category,
      subcategory: ev.subcategory,
    })
    setContextMenu(null)
  }

  function handleDelete(eventId: string) {
    props.onUpdateEvent(eventId, { deleted: true })
    setContextMenu(null)
  }

  function handleMoveTomorrow(eventId: string) {
    const ev = props.events.find((e) => e.id === eventId)
    if (!ev) return
    const duration = ev.endAt - ev.startAt
    const newStart = ev.startAt + 24 * 60 * 60 * 1000
    props.onMoveEvent(eventId, newStart, newStart + duration)
    setContextMenu(null)
  }

  function handleMoveNextWeek(eventId: string) {
    const ev = props.events.find((e) => e.id === eventId)
    if (!ev) return
    const duration = ev.endAt - ev.startAt
    const newStart = ev.startAt + 7 * 24 * 60 * 60 * 1000
    props.onMoveEvent(eventId, newStart, newStart + duration)
    setContextMenu(null)
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const grid = gridRef.current
      if (!grid) return
      const rect = grid.getBoundingClientRect()
      const y = clamp(e.clientY - rect.top, 0, rect.height)
      const minuteOffset = Math.floor((y / rect.height) * totalMinutes)
      // Use 5-minute snap for precise positioning during drag
      const minute = quantizeTo(startBaseMinutes + minuteOffset, SNAP_INTERVAL)

      if (draft) {
        setDraft((d) => (d ? { ...d, endMin: minute } : d))
        return
      }
      if (drag) {
        if (drag.mode === 'move') {
          const durationMin = Math.max(SNAP_INTERVAL, Math.round((drag.endAt - drag.startAt) / (60 * 1000)))
          const startMin = clamp(minute - drag.offsetMin, startBaseMinutes, endBaseMinutes - durationMin)
          const startAt = dayStart + startMin * 60 * 1000
          props.onMoveEvent(drag.id, startAt, startAt + durationMin * 60 * 1000)
          return
        }
        if (drag.mode === 'resize') {
          const startMin = minuteOfDay(drag.startAt)
          const endMin = clamp(minute, startMin + SNAP_INTERVAL, endBaseMinutes)
          const startAt = drag.startAt
          const endAt = dayStart + endMin * 60 * 1000
          props.onMoveEvent(drag.id, startAt, endAt)
        }
      }
    }

    function onUp() {
      if (draft) {
        const startMin = Math.min(draft.startMin, draft.endMin)
        const endMin = Math.max(draft.startMin, draft.endMin)
        const durMin = Math.max(SNAP_INTERVAL, endMin - startMin)
        const startAt = dayStart + startMin * 60 * 1000
        const endAt = startAt + durMin * 60 * 1000
        setDraft(null)
        props.onRequestCreateEvent({ startAt, endAt, kind: 'event' })
        return
      }
      if (drag) {
        setDrag(null)
      }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dayStart, drag, draft, props, startBaseMinutes, endBaseMinutes, totalMinutes, slotMinutes])

  const slots = Array.from({ length: slotRows }).map((_, i) => startBaseMinutes + i * slotMinutes)

  return (
    <div className="tmRoot">
      {props.hideHeader ? null : (
        <div className="tmHeader">
          <div className="tmLeft">
            <button className="tmNavBtn" onClick={() => props.onDateChange(addDays(props.date, -1))} aria-label="Previous day">
              ‹
            </button>
            <button className="tmNavBtn" onClick={() => props.onDateChange(new Date())}>
              today
            </button>
            <button className="tmNavBtn" onClick={() => props.onDateChange(addDays(props.date, 1))} aria-label="Next day">
              ›
            </button>
            <button className="tmNavBtn" onClick={props.onRefresh} title="Refresh">
              refresh
            </button>
            <div className="tmTitleRow">
              <div className="tmTitle">Day</div>
              <div className="tmSubtitle">{formatDayLabel(props.date)}</div>
            </div>
          </div>
          <div className="tmRight">
            <div className="tmZoom">
              <span className="tmZoomLabel">Scale</span>
              {SLOT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={slotMinutes === opt ? 'tmZoomBtn active' : 'tmZoomBtn'}
                  onClick={() => setSlotMinutes(opt)}
                  aria-pressed={slotMinutes === opt}>
                  {opt}m
                </button>
              ))}
            </div>
            <button
              className="tmNew"
              onClick={() => {
                const now = Date.now()
                const startAt = clamp(now, dayStart, dayEnd - 30 * 60 * 1000)
                props.onRequestCreateEvent({ startAt, endAt: startAt + 60 * 60 * 1000, kind: 'event' })
              }}>
              + New
            </button>
          </div>
        </div>
      )}

      {allDayEvents.length ? (
        <div className="tmAllDay" aria-label="All-day">
          {allDayEvents.map((ev) => {
            const accent = eventAccent(ev)
            return (
              <button
                key={ev.id}
                className={ev.active ? 'tmAllDayPill active' : 'tmAllDayPill'}
                onClick={() => props.onSelectEvent(ev.id)}
                title={formatEventTitle(ev, titleMode)}
                style={{ borderColor: hexToRgba(accent.color, 0.38), background: `linear-gradient(180deg, ${hexToRgba(accent.color, 0.16)}, ${hexToRgba(accent.color, 0.10)})` }}>
                <span className="tmAllDayIcon" style={{ borderColor: hexToRgba(accent.color, 0.42) }}>
                  <Icon name={accent.icon} size={14} />
                </span>
                <span className="tmAllDayText">{formatEventTitle(ev, titleMode)}</span>
              </button>
            )
          })}
        </div>
      ) : null}

      <div
        className="tmTimeline"
        style={{
          ['--tm-slot-rows' as any]: slotRows,
          ['--tm-slot-h' as any]: `${slotHeight}px`,
          ['--tm-log-col' as any]: `${logColWidth}px`,
        }}>
        <div className="tmTimelineInner">
          <div className="tmTimeCol">
            {slots.map((minute) => {
              const isHour = minute % 60 === 0
              const label = isHour ? `${String((minute / 60) | 0).padStart(2, '0')}:00` : ''
              return (
                <div key={minute} className={isHour ? 'tmTimeCell hour' : 'tmTimeCell'}>
                  {label}
                </div>
              )
            })}
          </div>

	        <div
	          ref={gridRef}
	          className="tmGrid"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
            const y = clamp(e.clientY - rect.top, 0, rect.height)
            const minuteOffset = Math.floor((y / rect.height) * totalMinutes)
            const minute = quantizeTo(startBaseMinutes + minuteOffset, SNAP_INTERVAL)
            const startAt = dayStart + minute * 60 * 1000

            const taskTitle = e.dataTransfer.getData('text/taskTitle')
            const taskId = e.dataTransfer.getData('text/taskId') || null
            if (taskTitle) {
              props.onCreateEvent({ title: taskTitle, startAt, endAt: startAt + 60 * 60 * 1000, kind: 'task', taskId })
              return
            }

            const habitRaw = e.dataTransfer.getData('application/insight5-habit')
            if (habitRaw) {
              try {
                const habit = JSON.parse(habitRaw) as { id: string; name: string; tags?: string[]; category?: string | null; subcategory?: string | null; estimateMinutes?: number | null }
                const minutes = Math.max(10, habit.estimateMinutes ?? 15)
                props.onCreateEvent({
                  title: habit.name,
                  startAt,
                  endAt: startAt + minutes * 60 * 1000,
                  kind: 'log',
                  trackerKey: `habit:${habit.id}`,
                  tags: [...new Set(['#habit', ...(habit.tags ?? [])])],
                  category: habit.category ?? null,
                  subcategory: habit.subcategory ?? null,
                })
              } catch {
                // ignore malformed payload
              }
              return
            }

            const trackerRaw = e.dataTransfer.getData('application/insight5-tracker')
            if (trackerRaw) {
              try {
                const tracker = JSON.parse(trackerRaw) as { key: string; label?: string; defaultValue?: number | null }
                const key = tracker.key?.trim()
                if (!key) return
                const label = tracker.label?.trim() || key
                const value = typeof tracker.defaultValue === 'number' && Number.isFinite(tracker.defaultValue) ? Math.round(tracker.defaultValue) : null
                const title = value == null ? label : `${key}: ${value}/10`
                props.onCreateEvent({
                  title,
                  startAt,
                  endAt: startAt + 5 * 60 * 1000,
                  kind: 'log',
                  trackerKey: key,
                  tags: [`#${key}`],
                })
              } catch {
                // ignore malformed payload
              }
              return
            }
          }}
	          onMouseDown={(e) => {
	            if (e.button !== 0) return
	            const target = e.target as HTMLElement
	            if (target.closest('.tmCard') || target.closest('.tmLogPill')) return
	            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
	            const y = clamp(e.clientY - rect.top, 0, rect.height)
	            const minuteOffset = Math.floor((y / rect.height) * totalMinutes)
            const minute = quantizeTo(startBaseMinutes + minuteOffset, SNAP_INTERVAL)
            setDraft({ startMin: minute, endMin: minute + SNAP_INTERVAL })
          }}>
          {slots.map((minute) => {
            const isHour = minute % 60 === 0
            return <div key={minute} className={isHour ? 'tmRow hour' : 'tmRow'} />
          })}

          {/* Current time indicator line */}
          {isToday && nowMinute >= startBaseMinutes && nowMinute <= endBaseMinutes && (
            <div
              className="tmNowIndicator"
              style={{ top: `${((nowMinute - startBaseMinutes) / totalMinutes) * 100}%` }}
            >
              <div className="tmNowDot" />
              <div className="tmNowLine" />
            </div>
          )}

          {dayEvents.map((ev) => {
            const accent = eventAccent(ev)
            const baseStartMin = clamp(minuteOfDay(ev.startAt), startBaseMinutes, endBaseMinutes)
            const endMs = effectiveEndAt(ev)
            const baseEndMin = endMs >= dayEnd ? endBaseMinutes : Math.max(baseStartMin + slotMinutes, minuteOfDay(endMs))
            const durationMin = Math.max(slotMinutes, Math.round(baseEndMin - baseStartMin))
            const liveStartMin = Math.floor(minuteOfDay(nowMs) / 5) * 5
            const displayStartMin = ev.active && isToday ? clamp(liveStartMin, startBaseMinutes, endBaseMinutes) : baseStartMin
            const displayEndMin = ev.active && isToday
              ? clamp(displayStartMin + durationMin, displayStartMin + slotMinutes, endBaseMinutes)
              : baseEndMin
            const displayStartAt = dayStart + displayStartMin * 60 * 1000
            const displayEndAt = dayStart + displayEndMin * 60 * 1000
            const topPct = ((displayStartMin - startBaseMinutes) / totalMinutes) * 100
            const heightPct = ((displayEndMin - displayStartMin) / totalMinutes) * 100

            const colIdx = colIndexById.get(ev.id) ?? 0
            const colW = 100 / colCount
            const leftPct = colIdx * colW
            const widthPct = colW

            const segments = extractSegmentsFromNotes(ev.notes, dayStart)
              .filter((s) => s.atMs >= ev.startAt && s.atMs <= ev.endAt)
              .map((s) => ({ ...s, pct: clamp(((s.atMs - ev.startAt) / Math.max(1, ev.endAt - ev.startAt)) * 100, 0, 100) }))

            // Calculate size class based on duration
            const durationMins = Math.round((ev.endAt - ev.startAt) / (60 * 1000))
            const sizeClass = getCardSizeClass(durationMins)

            // Calculate points
            const points = pointsForEvent(ev)

            // Calculate elapsed time for active events
            const elapsedMs = ev.active ? Math.max(0, nowMs - ev.startAt) : 0

            const metaLabel = formatCategoryMeta(ev)
            const rawTitle = (ev.title ?? '').trim()
            const titleText = rawTitle || (!metaLabel ? formatEventTitle(ev, titleMode) : '')

            // Build class name
            const cardClasses = [
              'tmCard',
              sizeClass,
              ev.kind === 'task' ? 'task' : null,
              ev.completedAt ? 'done' : null,
            ].filter(Boolean).join(' ')

            return (
              <div
                key={ev.id}
                className={cardClasses}
                style={{
                  top: `${topPct}%`,
                  height: `${Math.max(1.5, heightPct)}%`,
                  left: `${leftPct}%`,
                  width: `${widthPct}%`,
                  borderColor: hexToRgba(accent.color, 0.42),
                  background: `linear-gradient(180deg, ${hexToRgba(accent.color, 0.20)}, ${hexToRgba(accent.color, 0.10)})`,
                }}
                onMouseDown={(e) => {
                  if (e.button !== 0) return
                  const isResize = Boolean((e.target as HTMLElement).closest('.tmResize'))
                  const startMin = minuteOfDay(ev.startAt)
                  const rect = (gridRef.current ?? e.currentTarget.parentElement)?.getBoundingClientRect()
                  const y = rect ? clamp(e.clientY - rect.top, 0, rect.height) : 0
                  const minuteOffset = Math.floor((y / (rect?.height ?? 1)) * totalMinutes)
                  const minute = quantizeTo(startBaseMinutes + minuteOffset, SNAP_INTERVAL)
                  setDrag({
                    id: ev.id,
                    mode: isResize ? 'resize' : 'move',
                    startAt: ev.startAt,
                    endAt: ev.endAt,
                    offsetMin: clamp(minute - startMin, 0, 12 * 60),
                  })
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setContextMenu({ eventId: ev.id, x: e.clientX, y: e.clientY })
                }}
                onClick={() => props.onSelectEvent(ev.id)}
                onDoubleClick={() => props.onSelectEvent(ev.id)}>
                <div className="tmStripe" style={{ background: hexToRgba(accent.color, 0.9) }} />

                {/* Top row: Icon | Title | Checkbox (for tasks) */}
                <div className="tmCardTop">
                  <div className="tmCardEmoji" style={{ borderColor: hexToRgba(accent.color, 0.40) }}>
                    <Icon name={accent.icon} size={14} />
                  </div>
                  <div className="tmCardTitleGroup">
                    {metaLabel ? <div className="tmCardMeta">{metaLabel}</div> : null}
                    {titleText ? <div className="tmCardTitle">{titleText}</div> : null}
                  </div>
                  <div className="tmCardTopRight">
                    <div className="tmCardTimeInfo">
                      <span className="tmCardTimeRange">
                        {formatTime(displayStartAt)}–{formatTime(displayEndAt)}
                      </span>
                      {ev.active && elapsedMs > 0 ? (
                        <>
                          <span className="tmCardTimeDivider" />
                          <span className="tmCardElapsed">{formatElapsed(elapsedMs)}</span>
                        </>
                      ) : null}
                    </div>
                    {ev.kind === 'task' ? (
                      <button
                        className={ev.completedAt ? 'tmCheckTop checked' : 'tmCheckTop'}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          props.onToggleComplete(ev.id)
                        }}
                        aria-label={ev.completedAt ? 'Mark incomplete' : 'Mark complete'}>
                        <Icon name="check" size={12} />
                      </button>
                    ) : null}
                  </div>
                </div>

                {segments.length && sizeClass !== 'micro' && sizeClass !== 'compact' ? (
                  <div className="tmSegments" aria-label="Segments">
                    {segments.map((s) => (
                      <div key={`${ev.id}_${s.atMs}`} className="tmSeg" style={{ top: `${s.pct}%` }}>
                        <div className="tmSegLine" />
                        <div className="tmSegLabel">{s.label}</div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* Bottom row: Checklist ... Tags | XP | Play */}
                <div className="tmCardBottom">
                  {(() => {
                    const checklist = parseChecklistMarkdown(ev.notes)
                    if (!checklist.length || sizeClass === 'micro' || sizeClass === 'compact') return null
                    return (
                      <div className="tmChecklist" aria-label="Checklist">
                        {checklist.slice(0, 3).map((it) => (
                          <button
                            key={`${ev.id}_${it.lineIndex}`}
                            className={it.checked ? 'tmChkItem checked' : 'tmChkItem'}
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              if (ev.kind === 'task' && ev.taskId) {
                                props.onToggleTaskChecklistItem?.(ev.taskId, it.lineIndex)
                                return
                              }
                              props.onUpdateEvent(ev.id, { notes: toggleChecklistLine(ev.notes, it.lineIndex) })
                            }}
                            aria-label={it.checked ? `Uncheck ${it.text}` : `Check ${it.text}`}>
                            <span className="tmChkBox" aria-hidden="true" />
                          </button>
                        ))}
                      </div>
                    )
                  })()}

                  <span className="tmSpacer" />

                  {sizeClass !== 'micro' && ((ev.tags ?? []).length > 0 || points > 0 || ev.kind !== 'log') ? (
                    <div className="tmCardBottomRight">
                      {(ev.tags ?? []).length > 0 ? (
                        <div className="tmCardTagRow">
                          {(ev.tags ?? []).slice(0, sizeClass === 'compact' ? 2 : 3).map((t) => (
                            <span key={t} className="tmTag compact">
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {points > 0 ? (
                        <span className="tmCardPoints" title={`${Math.round(points)} XP`}>
                          {formatPoints(points)} XP
                        </span>
                      ) : null}
                      {ev.kind !== 'log' ? (
                        <button
                          className={ev.active ? 'tmPlay tmPlayCompact active' : 'tmPlay tmPlayCompact'}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            props.onUpdateEvent(ev.id, { active: !ev.active })
                          }}
                          aria-label={ev.active ? 'Pause timer' : 'Start timer'}>
                          <Icon name={ev.active ? 'pause' : 'play'} size={14} />
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="tmResize" aria-hidden="true" />
              </div>
            )
          })}

          {draft ? (
            <div
              className="tmDraft"
              style={{
                top: `${((Math.min(draft.startMin, draft.endMin) - startBaseMinutes) / totalMinutes) * 100}%`,
                height: `${(Math.max(slotMinutes, Math.abs(draft.endMin - draft.startMin)) / totalMinutes) * 100}%`,
              }}
            />
          ) : null}
	        </div>

        <div className="tmLogCol" aria-label="Trackers">
          <div
            className="tmLogResize"
            role="separator"
            aria-label="Resize tracker log column"
            onMouseDown={(e) => {
              if (e.button !== 0) return
              e.preventDefault()
              e.stopPropagation()
              resizeRef.current = { startX: e.clientX, startWidth: logColWidth }
              document.body.style.cursor = 'col-resize'
              document.body.style.userSelect = 'none'
            }}
          >
            <span className="tmLogResizeGrip" aria-hidden="true" />
          </div>
          {slots.map((minute) => {
            const isHour = minute % 60 === 0
            return <div key={minute} className={isHour ? 'tmRow hour' : 'tmRow'} aria-hidden="true" />
          })}
          <div className="tmLogLaneLine" aria-hidden="true" />
          {trackerLogs.map((ev) => {
            const accent = eventAccent(ev)
            const startMin = minuteOfDay(ev.startAt)
            const clampedMin = clamp(startMin, startBaseMinutes, Math.max(startBaseMinutes, endBaseMinutes - 1))
            const topPct = ((clampedMin - startBaseMinutes) / totalMinutes) * 100
            const lane = logLaneIndexById.get(ev.id) ?? 0
            const bumpPx = lane * 12
            const top = bumpPx ? `calc(${topPct}% + ${bumpPx}px)` : `${topPct}%`
            const label = trackerLabelForEvent(ev)
            return (
              <div key={ev.id} className="tmLogBubble" style={{ top }}>
                <button
                  className="tmLogMark"
                  style={{
                    background: hexToRgba(accent.color, 0.18),
                    borderColor: hexToRgba(accent.color, 0.42),
                  }}
                  onClick={() => {
                    props.onSelectEvent(ev.id)
                    setLogMenu({ id: ev.id, top })
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setLogMenu({ id: ev.id, top })
                  }}
                  title={formatEventTitle(ev, titleMode)}
                  aria-label={formatEventTitle(ev, titleMode)}>
                  <Icon name={accent.icon} size={14} />
                </button>
                <div className="tmLogConnector" style={{ background: hexToRgba(accent.color, 0.35) }} />
                <button
                  className="tmLogPill"
                  style={{
                    borderColor: hexToRgba(accent.color, 0.2),
                    background: hexToRgba(accent.color, 0.12),
                  }}
                  onClick={() => {
                    props.onSelectEvent(ev.id)
                    setLogMenu({ id: ev.id, top })
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setLogMenu({ id: ev.id, top })
                  }}
                  title={label}
                  aria-label={label}>
                  <span className="tmLogIcon" style={{ borderColor: hexToRgba(accent.color, 0.35), background: hexToRgba(accent.color, 0.16) }}>
                    <Icon name={accent.icon} size={12} />
                  </span>
                  <span className="tmLogText">{label}</span>
                </button>
              </div>
            )
          })}
          {logMenu ? (() => {
            const ev = trackerLogs.find((e) => e.id === logMenu.id)
            if (!ev) return null
            const value = trackerValueFromTitle(ev.title) ?? 5
            const key = trackerKeyForEvent(ev)
            const label = key.replace(/[_-]+/g, ' ')
            return (
              <div ref={logMenuRef} className="tmLogMenu" style={{ top: logMenu.top }}>
                <div className="tmLogMenuTitle">{label}</div>
                <div className="tmLogMenuRow">
                  <input
                    className="tmLogMenuSlider"
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    value={value}
                    onChange={(e) => {
                      const nextValue = Number(e.target.value)
                      const nextTitle = `${key}: ${nextValue}/10`
                      props.onUpdateEvent(ev.id, { title: nextTitle, trackerKey: ev.trackerKey ?? key })
                    }}
                    aria-label={`Set ${label} value`}
                  />
                  <div className="tmLogMenuValue">{value}</div>
                </div>
              </div>
            )
          })() : null}
        </div>
      </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="calContextMenu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button onClick={() => handleStartNow(contextMenu.eventId)}>Start Now</button>
          <button onClick={() => handleStopNow(contextMenu.eventId)}>Stop Now</button>
          <div className="calContextMenuDivider" />
          <button onClick={() => { props.onSelectEvent(contextMenu.eventId); setContextMenu(null) }}>Edit</button>
          <button onClick={() => handleDuplicate(contextMenu.eventId)}>Duplicate</button>
          <div className="calContextMenuDivider" />
          <button onClick={() => handleMoveTomorrow(contextMenu.eventId)}>Move to Tomorrow</button>
          <button onClick={() => handleMoveNextWeek(contextMenu.eventId)}>Move to Next Week</button>
          <div className="calContextMenuDivider" />
          <button className="destructive" onClick={() => handleDelete(contextMenu.eventId)}>Delete</button>
        </div>
      )}
    </div>
  )
}
