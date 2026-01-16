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
  showLine: boolean
  index: number
}) {
  const { item, onClick, showLine, index } = props
  const isEvent = item.kind === 'event'
  const color = isEvent ? item.color : 'var(--accent)'
  const icon = isEvent ? item.icon : 'mic' as IconName
  const isActive = isEvent && item.active


  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: Math.min(index * 0.05, 0.5),
        ease: [0.23, 1, 0.32, 1]
      }}
      className="relative"
      style={{ minHeight: '200px' }}
    >
      {/* Row container - centers icon and card vertically */}
      <div className="flex items-center" style={{ minHeight: '200px' }}>
        {/* Left column - Time */}
        <div className="w-[140px] flex-shrink-0 pr-8 text-right">
          <span className="text-[24px] font-bold text-[var(--text)] tracking-tight tabular-nums">
            {formatTime(item.at)}
          </span>
        </div>

        {/* Center column - Node only (line is separate) */}
        <div className="w-[100px] flex-shrink-0 flex items-center justify-center">
          {/* Node */}
          <motion.div
            whileHover={{ scale: 1.02, y: -3 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="relative flex items-center justify-center w-20 rounded-[28px] bg-[var(--panel2)] border-[4px] transition-all duration-200 z-10 py-6"
            style={{
              borderColor: color,
              boxShadow: isActive
                ? `0 0 0 8px ${hexToRgba(color, 0.20)}, 0 6px 24px ${hexToRgba(color, 0.35)}`
                : `0 6px 20px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)`,
              color: color,
            }}
          >
            <Icon name={icon} size={40} />

            {/* Active pulse */}
            {isActive && (
              <motion.div
                animate={{
                  scale: [1, 1.3, 1.5],
                  opacity: [0.35, 0.1, 0],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
                className="absolute inset-0 rounded-[28px]"
                style={{ border: `2px solid ${color}` }}
              />
            )}
          </motion.div>
        </div>

        {/* Right column - Content Card */}
        <div className="flex-1 flex items-center pl-6">
          <motion.button
            whileHover={{ scale: 1.02, y: -3 }}
            whileTap={{ scale: 0.995 }}
            onClick={onClick}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="bg-[var(--panel2)] rounded-2xl border-2 border-[var(--border2)] p-6 text-left transition-all duration-200 hover:border-[var(--accentBorder)] hover:shadow-[0_8px_32px_rgba(216,224,0,0.12)]"
            style={{ minHeight: '200px', width: '420px' }}
          >
          {/* Title */}
          <h3
            className="text-[22px] font-bold leading-tight tracking-tight"
            style={{ color }}
          >
            {item.title}
            {isActive && (
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                className="inline-block w-2.5 h-2.5 rounded-full ml-3 relative -top-0.5"
                style={{ backgroundColor: color }}
              />
            )}
          </h3>

          {/* Category & Subcategory */}
          {isEvent && item.category && (
            <p className="mt-3 text-[16px] text-[var(--muted)] font-medium">
              {item.category}{item.subcategory ? ` · ${item.subcategory}` : ''}
            </p>
          )}

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {item.tags.slice(0, 6).map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 text-[14px] font-bold rounded-lg bg-[var(--border)] text-[var(--muted)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Duration */}
          {!isActive && item.endAt > item.at && (
            <p className="mt-4 text-[14px] text-[var(--muted2)] font-bold tracking-wide uppercase">
              {formatDuration(item.at, item.endAt)}
            </p>
          )}

          {/* Location */}
          {isEvent && item.location && (
            <p className="mt-3 text-[14px] text-[var(--muted2)] flex items-center gap-2">
              <span>📍</span> {item.location}
            </p>
          )}
        </motion.button>
        </div>
      </div>

      {/* Vertical line - positioned absolutely to span full height */}
      {showLine && (
        <div
          className="absolute"
          style={{
            left: '190px',
            top: 0,
            bottom: 0,
            width: '3px',
            background: 'linear-gradient(180deg, var(--border2) 0%, var(--border) 50%, var(--border2) 100%)',
            zIndex: 0
          }}
        />
      )}
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
  isLast: boolean
  sectionIndex: number
}) {
  const { day, items, onSelectEvent, onSelectCapture, isFirst, isLast, sectionIndex } = props
  const isToday = isoDayFromMs(Date.now()) === day

  // Parse day for display
  const [y, m, d] = day.split('-').map(Number)
  const dt = new Date(y!, (m ?? 1) - 1, d ?? 1)
  const dayOfWeek = dt.toLocaleDateString(undefined, { weekday: 'long' })
  const monthDay = dt.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: 0.4,
        delay: sectionIndex * 0.08,
      }}
    >
      {/* Day Header */}
      <div className="relative flex pt-3" style={{ minHeight: '120px' }}>
        {/* Left column - Day info */}
        <div className="w-[140px] flex-shrink-0 pr-8 text-right pt-2">
          <h2 className={`text-[32px] font-black tracking-tight leading-none ${isToday ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`}>
            {isToday ? 'Today' : dayOfWeek}
          </h2>
          <p className={`text-[32px] font-black tracking-tight mt-1 ${isToday ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}>
            {monthDay}
          </p>
        </div>

        {/* Center column - Line & Day marker */}
        <div className="w-[100px] flex-shrink-0 flex flex-col items-center relative">
          {/* Top line - connects from previous section */}
          {!isFirst && (
            <div className="w-[3px] h-6 bg-[var(--border2)]" />
          )}
          {isFirst && <div className="h-6" />}

          {/* Day marker node */}
          <div
            className="w-20 rounded-[28px] py-6 flex items-center justify-center z-10 transition-all duration-200"
            style={{
              backgroundColor: isToday ? 'var(--accent)' : 'var(--border)',
              boxShadow: isToday ? '0 6px 24px var(--glow)' : 'none',
            }}
          >
            <span
              className="text-[28px] font-black"
              style={{ color: isToday ? '#fff' : 'var(--muted)' }}
            >
              {items.length}
            </span>
          </div>

          {/* Bottom line - connects to first item */}
          <div className="w-[3px] flex-1 bg-[var(--border2)]" style={{ minHeight: '32px' }} />
        </div>

        {/* Right column - Moment count */}
        <div className="flex-1 pl-6 pt-4">
          <span className={`text-[18px] font-semibold ${isToday ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}>
            {items.length} {items.length === 1 ? 'moment' : 'moments'}
          </span>
        </div>
      </div>

      {/* Timeline Items */}
      {items.map((item, idx) => (
        <TimelineEventBlock
          key={item.id}
          item={item}
          onClick={() => item.kind === 'event' ? onSelectEvent(item.id) : onSelectCapture(item.id)}
          showLine={!(idx === items.length - 1 && isLast)}
          index={idx}
        />
      ))}
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
        <div className="flex-shrink-0 px-12 py-10 border-b border-[var(--border)] backdrop-blur-xl bg-[var(--panelAlpha)]">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-[36px] font-black text-[var(--text)] tracking-tight">
                Timeline
              </h1>

              {/* Active indicator */}
              {stats.activeCount > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accentSoft)]">
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]"
                  />
                  <span className="text-[15px] font-bold text-[var(--accent)]">
                    {stats.activeCount} active
                  </span>
                </div>
              )}
            </div>

            {/* Filter toggle */}
            <div className="flex rounded-xl p-1 bg-[var(--border)]">
              {(['all', 'events', 'captures'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  className={`px-5 py-2 text-[14px] font-semibold rounded-lg border-2 border-transparent transition-all duration-200 ${
                    filterMode === mode
                      ? 'bg-[var(--panel2)] text-[var(--text)] shadow-lg border-[var(--accent)]'
                      : 'text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border)]'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Tag filters */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-3 mt-6 overflow-x-auto pb-1 scrollbar-hide">
              {allTags.slice(0, 10).map((t) => (
                <button
                  key={t}
                  onClick={() => props.onToggleTag(t)}
                  className={`px-4 py-2 rounded-lg text-[14px] font-semibold whitespace-nowrap transition-all duration-200 ${
                    props.activeTagFilters.includes(t)
                      ? 'bg-[var(--accent)] text-[#0A0A0B] font-bold shadow-md'
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

      {/* Timeline Content */}
      <div className="flex-1 overflow-y-auto px-12 py-10 min-h-0">
        <AnimatePresence mode="popLayout">
          {days.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full py-24"
            >
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center mb-6 bg-[var(--border)]"
                style={{ color: 'var(--muted)' }}
              >
                <Icon name="calendar" size={36} />
              </div>
              <h3 className="text-[22px] font-bold text-[var(--text)] mb-2">
                Your timeline awaits
              </h3>
              <p className="text-[16px] text-[var(--muted)] text-center max-w-sm">
                {props.activeTagFilters.length > 0
                  ? 'Try removing some filters to see more'
                  : 'Start capturing moments to see them here'
                }
              </p>
            </motion.div>
          ) : (
            <div className="max-w-4xl mx-auto">
              {days.map((day, idx) => (
                <DaySection
                  key={day}
                  day={day}
                  items={groups.get(day) ?? []}
                  onSelectEvent={props.onSelectEvent}
                  onSelectCapture={props.onSelectCapture}
                  isFirst={idx === 0}
                  isLast={idx === days.length - 1}
                  sectionIndex={idx}
                />
              ))}

              {/* Bottom breathing room */}
              <div className="h-32" />
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
