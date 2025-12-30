import { useMemo, useState } from 'react'
import type { CalendarEvent } from '../../storage/calendar'
import type { InboxCapture } from '../../storage/inbox'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon, type IconName } from '../../ui/icons'
import { eventAccent, hexToRgba } from '../../ui/event-visual'

// ============ Utilities ============

function isoDayFromMs(ms: number) {
  const d = new Date(ms)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function formatTime(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function formatDuration(startMs: number, endMs: number) {
  const mins = Math.round((endMs - startMs) / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  const remainMins = mins % 60
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`
}

function extractTags(text: string) {
  const tags = new Set<string>()
  for (const m of text.matchAll(/(^|\s)(#[\w/-]+)/g)) tags.add(m[2]!)
  for (const m of text.matchAll(/(^|\s)(\+[\w/-]+)/g)) tags.add(m[2]!)
  for (const m of text.matchAll(/(^|\s)(@[\w/-]+)/g)) tags.add(m[2]!)
  return Array.from(tags).slice(0, 12)
}

// ============ Types ============

type TimelineItem =
  | {
      kind: 'event'
      id: string
      at: number
      endAt: number
      title: string
      tags: string[]
      color: string
      icon: IconName
      active?: boolean
      category?: string
      subcategory?: string
      location?: string
      people?: string[]
      notes?: string
      isTask?: boolean
    }
  | {
      kind: 'capture'
      id: string
      at: number
      endAt: number
      title: string
      tags: string[]
    }

// ============ Timeline Event Block ============

function TimelineEventBlock(props: {
  item: TimelineItem
  onClick: () => void
  isLast: boolean
  index: number
}) {
  const { item, onClick, isLast, index } = props
  const isEvent = item.kind === 'event'
  const color = isEvent ? item.color : '#D95D39'
  const icon = isEvent ? item.icon : 'mic' as IconName
  const isActive = isEvent && item.active

  // Build description text
  const descParts: string[] = []
  if (isEvent && item.category) {
    descParts.push(item.category + (item.subcategory ? ` · ${item.subcategory}` : ''))
  }
  if (isEvent && item.location) {
    descParts.push(item.location)
  }
  if (item.tags.length > 0) {
    descParts.push(item.tags.slice(0, 3).join(' '))
  }
  const description = descParts.join(' · ')

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: Math.min(index * 0.03, 0.3),
        ease: [0.23, 1, 0.32, 1]
      }}
      className="relative flex items-start min-h-[72px]"
    >
      {/* Vertical line - continuous */}
      <div
        className="absolute w-px bg-[var(--border)]"
        style={{
          left: '72px',
          top: 0,
          bottom: isLast ? '50%' : 0,
        }}
      />

      {/* Time column - fixed width */}
      <div className="w-[72px] flex-shrink-0 pt-3 pr-4 text-right">
        <span className="text-[13px] text-[var(--muted)] tabular-nums">
          {formatTime(item.at)}
        </span>
      </div>

      {/* Node with icon */}
      <div className="relative flex-shrink-0 z-10 pt-1">
        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--panel2)] border-2 transition-all duration-200"
          style={{
            borderColor: isActive ? color : 'var(--border)',
            boxShadow: isActive
              ? `0 0 0 3px ${hexToRgba(color, 0.15)}`
              : '0 1px 3px rgba(0,0,0,0.04)',
            color: isActive ? color : 'var(--muted)',
          }}
        >
          <Icon name={icon} size={16} />

          {/* Active pulse */}
          {isActive && (
            <motion.div
              animate={{
                scale: [1, 1.4, 1.6],
                opacity: [0.3, 0.1, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeOut',
              }}
              className="absolute inset-0 rounded-full"
              style={{ border: `2px solid ${color}` }}
            />
          )}
        </motion.div>
      </div>

      {/* Content - fills remaining space */}
      <motion.button
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.995 }}
        onClick={onClick}
        className="flex-1 ml-4 pt-1 pb-5 text-left focus:outline-none min-w-0"
      >
        {/* Title pill */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200"
          style={{
            backgroundColor: hexToRgba(color, 0.1),
            border: `1px solid ${hexToRgba(color, 0.15)}`,
          }}
        >
          <span
            className="text-[13px] font-semibold leading-snug"
            style={{ color }}
          >
            {item.title}
          </span>
          {isActive && (
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
          )}
        </div>

        {/* Description */}
        {description && (
          <p className="mt-1.5 text-[13px] text-[var(--muted)] leading-relaxed">
            {description}
          </p>
        )}

        {/* Duration */}
        {!isActive && item.endAt > item.at && (
          <p className="mt-1 text-[12px] text-[var(--muted2)]">
            {formatDuration(item.at, item.endAt)}
          </p>
        )}
      </motion.button>
    </motion.div>
  )
}

// ============ Day Section Component ============

function DaySection(props: {
  day: string
  items: TimelineItem[]
  onSelectEvent: (id: string) => void
  onSelectCapture: (id: string) => void
  isFirst: boolean
  sectionIndex: number
}) {
  const { day, items, onSelectEvent, onSelectCapture, isFirst, sectionIndex } = props
  const isToday = isoDayFromMs(Date.now()) === day
  const hasActiveItem = items.some(i => i.kind === 'event' && i.active)

  // Parse day for display
  const [y, m, d] = day.split('-').map(Number)
  const dt = new Date(y!, (m ?? 1) - 1, d ?? 1)
  const dayOfWeek = dt.toLocaleDateString(undefined, { weekday: 'short' })
  const monthDay = dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: 0.3,
        delay: sectionIndex * 0.05,
      }}
      className={`${isFirst ? '' : 'mt-10'}`}
    >
      {/* Day Header */}
      <div className="flex items-center mb-4">
        {/* Date column */}
        <div className="w-[72px] flex-shrink-0 pr-4 text-right">
          <div className={`text-[13px] font-semibold ${isToday ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`}>
            {isToday ? 'Today' : dayOfWeek}
          </div>
          <div className="text-[12px] text-[var(--muted)]">
            {monthDay}
          </div>
        </div>

        {/* Day node */}
        <div className="flex-shrink-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200"
            style={{
              backgroundColor: isToday
                ? 'var(--accent)'
                : hasActiveItem
                  ? 'var(--accentSoft)'
                  : 'var(--border)',
            }}
          >
            <span
              className="text-[13px] font-bold"
              style={{
                color: isToday ? '#fff' : hasActiveItem ? 'var(--accent)' : 'var(--muted)',
              }}
            >
              {items.length}
            </span>
          </div>
        </div>

        {/* Event count label */}
        <div className="ml-4 flex-1">
          <span className={`text-[13px] ${isToday ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}>
            {items.length} {items.length === 1 ? 'moment' : 'moments'}
          </span>
        </div>
      </div>

      {/* Timeline Items */}
      <div className="relative">
        {items.map((item, idx) => (
          <TimelineEventBlock
            key={item.id}
            item={item}
            onClick={() => item.kind === 'event' ? onSelectEvent(item.id) : onSelectCapture(item.id)}
            isLast={idx === items.length - 1}
            index={idx}
          />
        ))}
      </div>
    </motion.div>
  )
}

// ============ Main Timeline View ============

export function TimelineView(props: {
  events: CalendarEvent[]
  captures: InboxCapture[]
  activeTagFilters: string[]
  onToggleTag: (tag: string) => void
  onSelectEvent: (id: string) => void
  onSelectCapture: (id: string) => void
  hideHeader?: boolean
}) {
  const [filterMode, setFilterMode] = useState<'all' | 'events' | 'captures'>('all')

  // Build timeline items
  const items = useMemo(() => {
    const result: TimelineItem[] = []

    for (const ev of props.events) {
      const tags = (ev.tags ?? []).length ? (ev.tags ?? []) : []
      const accent = eventAccent(ev)
      result.push({
        kind: 'event',
        id: ev.id,
        at: ev.startAt,
        endAt: ev.endAt,
        title: ev.title,
        tags,
        color: accent.color,
        icon: accent.icon,
        active: ev.active,
        category: ev.category ?? undefined,
        subcategory: ev.subcategory ?? undefined,
        location: ev.location ?? undefined,
        people: ev.people ?? undefined,
        notes: ev.notes ?? undefined,
        isTask: ev.kind === 'task',
      })
    }

    for (const c of props.captures) {
      const tags = extractTags(c.rawText)
      result.push({
        kind: 'capture',
        id: c.id,
        at: c.createdAt,
        endAt: c.createdAt,
        title: c.rawText.split(/\r?\n/)[0] ?? 'Capture',
        tags,
      })
    }

    return result
  }, [props.events, props.captures])

  // Filter items
  const filtered = useMemo(() => {
    return items
      .filter((i) => {
        if (filterMode === 'events' && i.kind !== 'event') return false
        if (filterMode === 'captures' && i.kind !== 'capture') return false
        if (props.activeTagFilters.length === 0) return true
        return props.activeTagFilters.every((t) => i.tags.includes(t))
      })
      .sort((a, b) => b.at - a.at)
      .slice(0, 500)
  }, [items, filterMode, props.activeTagFilters])

  // Group by day
  const { groups, days, allTags } = useMemo(() => {
    const g = new Map<string, TimelineItem[]>()
    for (const i of filtered) {
      const key = isoDayFromMs(i.at)
      const arr = g.get(key) ?? []
      arr.push(i)
      g.set(key, arr)
    }
    // Sort items within each day by time (latest first)
    for (const arr of g.values()) {
      arr.sort((a, b) => b.at - a.at)
    }
    const d = Array.from(g.keys()).sort().reverse()
    const tags = Array.from(new Set(items.flatMap((i) => i.tags))).slice(0, 20)
    return { groups: g, days: d, allTags: tags }
  }, [filtered, items])

  // Stats
  const stats = useMemo(() => {
    const eventCount = items.filter(i => i.kind === 'event').length
    const captureCount = items.filter(i => i.kind === 'capture').length
    const activeCount = items.filter(i => i.kind === 'event' && (i as any).active).length
    return { eventCount, captureCount, activeCount }
  }, [items])

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[var(--bg)]">
      {/* Header */}
      {!props.hideHeader && (
        <div className="flex-shrink-0 px-6 py-5 border-b border-[var(--border)]">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-[var(--text)] tracking-tight">
                Timeline
              </h1>

              {/* Active indicator */}
              {stats.activeCount > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--accentSoft)]">
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"
                  />
                  <span className="text-[12px] font-semibold text-[var(--accent)]">
                    {stats.activeCount} active
                  </span>
                </div>
              )}
            </div>

            {/* Filter toggle */}
            <div className="flex rounded-lg p-0.5 bg-[var(--border)]">
              {(['all', 'events', 'captures'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  className={`px-3 py-1 text-[12px] font-medium rounded-md transition-all duration-200 ${
                    filterMode === mode
                      ? 'bg-[var(--panel2)] text-[var(--text)] shadow-sm'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Tag filters */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 scrollbar-hide">
              {allTags.slice(0, 10).map((t) => (
                <button
                  key={t}
                  onClick={() => props.onToggleTag(t)}
                  className={`px-2.5 py-1 rounded-md text-[12px] font-medium whitespace-nowrap transition-all duration-200 ${
                    props.activeTagFilters.includes(t)
                      ? 'bg-[var(--text)] text-[var(--bg)]'
                      : 'bg-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Timeline Content - fills remaining space */}
      <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
        <AnimatePresence mode="popLayout">
          {days.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full py-16"
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-[var(--border)]"
                style={{ color: 'var(--muted)' }}
              >
                <Icon name="calendar" size={24} />
              </div>
              <h3 className="text-base font-semibold text-[var(--text)] mb-1">
                Your timeline awaits
              </h3>
              <p className="text-[13px] text-[var(--muted)] text-center max-w-xs">
                {props.activeTagFilters.length > 0
                  ? 'Try removing some filters to see more'
                  : 'Start capturing moments to see them here'
                }
              </p>
            </motion.div>
          ) : (
            <div className="max-w-3xl">
              {days.map((day, idx) => (
                <DaySection
                  key={day}
                  day={day}
                  items={groups.get(day) ?? []}
                  onSelectEvent={props.onSelectEvent}
                  onSelectCapture={props.onSelectCapture}
                  isFirst={idx === 0}
                  sectionIndex={idx}
                />
              ))}

              {/* Bottom padding */}
              <div className="h-16" />
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
