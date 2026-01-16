import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { formatRelativeDate } from '@insight/shared'
import type { CalendarEvent } from '../../storage/calendar'
import { Icon } from '../../ui/icons'
import { loadTrackerDefs, type TrackerDef } from '../../storage/ecosystem'

type TrackerHistory = { value: number; at: number }

type TrackerStats = {
  count: number
  lastValue: number | null
  lastAt: number | null
  avg: number | null
  min: number | null
  max: number | null
  recent: TrackerHistory[]
  recentCount: number
  weekAvg: number | null
  prevWeekAvg: number | null
  trendPct: number | null
}

type TrackerRow = TrackerStats & {
  key: string
  label: string
  unitLabel: string
}

const DAY_MS = 24 * 60 * 60 * 1000
const RECENT_LOG_COUNT = 12
const countFormatter = new Intl.NumberFormat('en-US')

function normalizeKey(raw: string | null | undefined) {
  return (raw ?? '').trim().toLowerCase()
}

function parseTrackerValue(title: string) {
  const match = title.match(/(-?\d+(?:\.\d+)?)/)
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) ? value : null
}

function isoDate(ms: number) {
  const d = new Date(ms)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function startOfDayMs(ms: number) {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function formatNumber(value: number | null) {
  if (value == null || !Number.isFinite(value)) return '—'
  const rounded = Math.abs(value) >= 100 ? Math.round(value) : Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

function summarizeHistory(history: TrackerHistory[], now: number): TrackerStats {
  if (history.length === 0) {
    return {
      count: 0,
      lastValue: null,
      lastAt: null,
      avg: null,
      min: null,
      max: null,
      recent: [],
      recentCount: 0,
      weekAvg: null,
      prevWeekAvg: null,
      trendPct: null,
    }
  }

  let sum = 0
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  for (const item of history) {
    sum += item.value
    min = Math.min(min, item.value)
    max = Math.max(max, item.value)
  }

  const count = history.length
  const last = history[count - 1]
  const avg = sum / count
  const weekStart = now - 7 * DAY_MS
  const prevStart = now - 14 * DAY_MS
  const weekValues = history.filter((item) => item.at >= weekStart).map((item) => item.value)
  const prevValues = history.filter((item) => item.at >= prevStart && item.at < weekStart).map((item) => item.value)
  const weekAvg = weekValues.length ? weekValues.reduce((a, b) => a + b, 0) / weekValues.length : null
  const prevWeekAvg = prevValues.length ? prevValues.reduce((a, b) => a + b, 0) / prevValues.length : null
  const trendPct = prevWeekAvg && weekAvg != null ? ((weekAvg - prevWeekAvg) / Math.abs(prevWeekAvg)) * 100 : null

  return {
    count,
    lastValue: last.value,
    lastAt: last.at,
    avg,
    min: Number.isFinite(min) ? min : null,
    max: Number.isFinite(max) ? max : null,
    recent: history.slice(-RECENT_LOG_COUNT),
    recentCount: weekValues.length,
    weekAvg,
    prevWeekAvg,
    trendPct,
  }
}

function buildDailyCounts(history: TrackerHistory[], days: number) {
  const todayStart = startOfDayMs(Date.now())
  const start = todayStart - (days - 1) * DAY_MS
  const counts = Array.from({ length: days }).map(() => 0)

  for (const item of history) {
    if (item.at < start) continue
    const idx = Math.floor((item.at - start) / DAY_MS)
    if (idx >= 0 && idx < days) counts[idx] += 1
  }

  return counts.map((count, idx) => {
    const date = new Date(start + idx * DAY_MS)
    const label = date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)
    return { count, label }
  })
}

function TrackerSparkline(props: { values: number[]; variant?: 'default' | 'hero' }) {
  if (props.values.length === 0) return null
  const max = Math.max(...props.values.map((value) => Math.abs(value)), 1)
  return (
    <div className={`trackerSparkline${props.variant === 'hero' ? ' hero' : ''}`}>
      {props.values.map((value, index) => (
        <span
          key={`${index}-${value}`}
          className="trackerSparklineBar"
          style={{ height: `${Math.max(16, (Math.abs(value) / max) * 100)}%` }}
        />
      ))}
    </div>
  )
}

export function TrackersView(props: {
  events: CalendarEvent[]
  trackerDefs?: TrackerDef[]
  trackerKey?: string | null
  onSelectTracker?: (key: string | null) => void
  onTrackerDefsChange?: (defs: TrackerDef[]) => void
}) {
  const [defs, setDefs] = useState<TrackerDef[]>(() => props.trackerDefs ?? loadTrackerDefs())
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!props.trackerDefs) return
    setDefs(props.trackerDefs)
  }, [props.trackerDefs])

  const trackerHistories = useMemo(() => {
    const byKey = new Map<string, TrackerHistory[]>()
    for (const ev of props.events) {
      if (ev.kind !== 'log') continue
      if (!ev.trackerKey) continue
      if (ev.trackerKey.startsWith('habit:')) continue
      const key = normalizeKey(ev.trackerKey)
      if (!key) continue
      const value = parseTrackerValue(ev.title)
      if (value == null) continue
      const list = byKey.get(key) ?? []
      list.push({ value, at: ev.startAt ?? ev.createdAt ?? Date.now() })
      byKey.set(key, list)
    }
    for (const list of byKey.values()) list.sort((a, b) => a.at - b.at)
    return byKey
  }, [props.events])

  const rows = useMemo(() => {
    const now = Date.now()
    const needle = query.trim().toLowerCase()
    return defs
      .filter((def) => def.label.toLowerCase().includes(needle) || def.key.includes(needle))
      .map((def) => {
        const history = trackerHistories.get(def.key) ?? []
        const stats = summarizeHistory(history, now)
        return {
          key: def.key,
          label: def.label,
          unitLabel: def.unit.label || 'value',
          ...stats,
        }
      })
      .sort((a, b) => (b.lastAt ?? 0) - (a.lastAt ?? 0) || b.count - a.count)
  }, [defs, query, trackerHistories])

  const summary = useMemo(() => {
    const now = Date.now()
    const weekStart = now - 7 * DAY_MS
    const monthStart = now - 30 * DAY_MS
    let totalLogs = 0
    let logsLast7Days = 0
    let logsLast30Days = 0
    let lastActivityAt: number | null = null
    const activeTrackers = new Set<string>()
    const activeDays = new Set<string>()
    for (const [key, history] of trackerHistories.entries()) {
      if (history.length === 0) continue
      totalLogs += history.length
      const last = history[history.length - 1]
      if (!lastActivityAt || last.at > lastActivityAt) lastActivityAt = last.at
      let hasWeek = false
      for (const item of history) {
        if (item.at >= weekStart) {
          logsLast7Days += 1
          hasWeek = true
        }
        if (item.at >= monthStart) {
          logsLast30Days += 1
          activeDays.add(isoDate(item.at))
        }
      }
      if (hasWeek) activeTrackers.add(key)
    }
    return {
      totalLogs,
      logsLast7Days,
      logsLast30Days,
      logsPerDay: logsLast7Days / 7,
      activeTrackers: activeTrackers.size,
      activeDays: activeDays.size,
      lastActivityAt,
    }
  }, [trackerHistories])

  const allHistory = useMemo(() => {
    const merged: TrackerHistory[] = []
    for (const history of trackerHistories.values()) merged.push(...history)
    return merged
  }, [trackerHistories])

  const dailyCounts = useMemo(() => buildDailyCounts(allHistory, 7), [allHistory])

  const topTracker = useMemo(() => {
    let top: TrackerRow | null = null
    for (const row of rows) {
      if (row.count === 0) continue
      if (!top) {
        top = row
        continue
      }
      if (row.recentCount > top.recentCount) {
        top = row
        continue
      }
      if (row.recentCount === top.recentCount && row.count > top.count) {
        top = row
      }
    }
    return top
  }, [rows])

  const activeKey = normalizeKey(props.trackerKey)
  const listVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  }

  const dailyMax = Math.max(...dailyCounts.map((day) => day.count), 1)

  return (
    <div className="trackersDashboardRoot flex flex-col h-full bg-[var(--bg)] text-[var(--text)] font-['Figtree'] overflow-hidden">
      <div className="px-10 pt-10 pb-6 bg-[var(--bg)]/80 backdrop-blur-xl sticky top-0 z-10 max-w-7xl mx-auto w-full">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="trackerHeaderKicker">Insights</div>
            <h1 className="text-3xl font-extrabold tracking-tight">Trackers</h1>
            <p className="text-sm text-[var(--muted)] font-semibold">A living dashboard of your most important signals.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="trackerHeaderPill">{countFormatter.format(defs.length)} trackers</div>
            <div className="trackerHeaderPill">{countFormatter.format(summary.logsLast7Days)} logs this week</div>
            <div className="trackerHeaderPill">{summary.activeTrackers} active</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-6">
          <div className="flex-1 min-w-[240px] max-w-md relative">
            <input
              className="w-full h-11 bg-[var(--glass2)] border border-[var(--border)] rounded-2xl px-10 text-sm font-medium focus:bg-[var(--glass3)] focus:shadow-[0_10px_24px_var(--glowSoft)] transition-all outline-none backdrop-blur"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter trackers..."
            />
            <div className="absolute left-3.5 top-3.5 opacity-30">
              <Icon name="search" size={16} />
            </div>
          </div>
          <div className="trackerHeaderMeta">
            <div className="trackerHeaderMetaLabel">Last activity</div>
            <div className="trackerHeaderMetaValue">{summary.lastActivityAt ? formatRelativeDate(summary.lastActivityAt) : '—'}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-10 pb-32 max-w-7xl mx-auto w-full">
        <div className="trackersDashboardContent">
          <motion.div className="trackersSummaryGrid" variants={listVariants} initial="hidden" animate="show">
            <motion.div className="glassCard trackersSummaryCard" variants={itemVariants}>
              <div className="trackersSummaryLabel">Total logs</div>
              <div className="trackersSummaryValue">{countFormatter.format(summary.totalLogs)}</div>
              <div className="trackersSummarySub">Across {countFormatter.format(defs.length)} trackers</div>
            </motion.div>
            <motion.div className="glassCard trackersSummaryCard" variants={itemVariants}>
              <div className="trackersSummaryLabel">Weekly cadence</div>
              <div className="trackersSummaryValue">{countFormatter.format(summary.logsLast7Days)}</div>
              <div className="trackersSummarySub">{summary.logsPerDay.toFixed(1)} logs per day</div>
            </motion.div>
            <motion.div className="glassCard trackersSummaryCard" variants={itemVariants}>
              <div className="trackersSummaryLabel">Active trackers</div>
              <div className="trackersSummaryValue">{summary.activeTrackers}</div>
              <div className="trackersSummarySub">With logs in the last 7 days</div>
            </motion.div>
            <motion.div className="glassCard trackersSummaryCard" variants={itemVariants}>
              <div className="trackersSummaryLabel">Consistency</div>
              <div className="trackersSummaryValue">{summary.activeDays}/30</div>
              <div className="trackersSummarySub">Days with any tracker activity</div>
            </motion.div>
          </motion.div>

          <div className="trackersFocusRow">
            <div className="glassCard trackerHero">
              {topTracker ? (
                <>
                  <div className="trackerHeroHeader">
                    <div>
                      <div className="trackerBadge">Most active</div>
                      <h3 className="trackerHeroTitle">{topTracker.label}</h3>
                      <div className="trackerHeroMeta">{countFormatter.format(topTracker.count)} total logs</div>
                    </div>
                    <div className="trackerHeroValue">
                      <span>{formatNumber(topTracker.lastValue)}</span>
                      <small>{topTracker.unitLabel}</small>
                    </div>
                  </div>
                  {topTracker.recent.length ? (
                    <TrackerSparkline values={topTracker.recent.map((item) => item.value)} variant="hero" />
                  ) : (
                    <div className="trackerEmptyState">No logs yet.</div>
                  )}
                  <div className="trackerHeroStats">
                    <div>
                      <span>7d avg</span>
                      <strong>{formatNumber(topTracker.weekAvg)}</strong>
                    </div>
                    <div>
                      <span>Min</span>
                      <strong>{formatNumber(topTracker.min)}</strong>
                    </div>
                    <div>
                      <span>Max</span>
                      <strong>{formatNumber(topTracker.max)}</strong>
                    </div>
                  </div>
                </>
              ) : (
                <div className="trackerEmptyState">Start logging tracker values to unlock insights.</div>
              )}
            </div>

            <div className="glassCard trackerRhythm">
              <div className="trackerRhythmHeader">
                <div>
                  <div className="trackerBadge">Pulse</div>
                  <h3>Last 7 days</h3>
                </div>
                <div className="trackerRhythmMeta">{countFormatter.format(summary.logsLast7Days)} logs</div>
              </div>
              <div className="trackerRhythmBars">
                {dailyCounts.map((day) => (
                  <div key={day.label} className="trackerRhythmBar">
                    <div className="trackerRhythmBarFill" style={{ height: `${Math.max(12, (day.count / dailyMax) * 100)}%` }} />
                    <span>{day.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="glassCard trackerEmptyState">No trackers yet. Create one from the ecosystem view.</div>
          ) : (
            <motion.div className="trackersCardGrid" variants={listVariants} initial="hidden" animate="show">
              {rows.map((row) => {
                const trend = row.trendPct
                const trendDirection = trend == null ? 'neutral' : trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral'
                const trendLabel = trend == null ? '—' : `${Math.abs(trend).toFixed(0)}%`
                return (
                  <motion.button
                    key={row.key}
                    className={`glassCard trackerCard${activeKey === row.key ? ' active' : ''}`}
                    variants={itemVariants}
                    type="button"
                    onClick={() => props.onSelectTracker?.(row.key)}
                  >
                    <div className="trackerCardHeader">
                      <div>
                        <div className="trackerCardTitle">{row.label}</div>
                        <div className="trackerCardSub">Unit: {row.unitLabel}</div>
                      </div>
                      <div className={`trackerTrend ${trendDirection}`}>
                        <span>{trendLabel}</span>
                        <small>7d</small>
                      </div>
                    </div>
                    <div className="trackerCardValueRow">
                      <div className="trackerCardValue">{formatNumber(row.lastValue)}</div>
                      <div className="trackerCardMeta">Last {row.lastAt ? formatRelativeDate(row.lastAt) : '—'}</div>
                    </div>
                    {row.recent.length ? (
                      <TrackerSparkline values={row.recent.map((item) => item.value)} />
                    ) : (
                      <div className="trackerSparklineEmpty">No logs yet</div>
                    )}
                    <div className="trackerCardStats">
                      <div>
                        <span>Avg</span>
                        <strong>{formatNumber(row.avg)}</strong>
                      </div>
                      <div>
                        <span>Min</span>
                        <strong>{formatNumber(row.min)}</strong>
                      </div>
                      <div>
                        <span>Max</span>
                        <strong>{formatNumber(row.max)}</strong>
                      </div>
                    </div>
                    <div className="trackerCardFoot">
                      <span>{countFormatter.format(row.count)} logs</span>
                      <span>{countFormatter.format(row.recentCount)} in last 7d</span>
                    </div>
                  </motion.button>
                )
              })}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
