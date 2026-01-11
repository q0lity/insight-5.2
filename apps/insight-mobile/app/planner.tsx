import React, { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Text } from '@/components/Themed'
import { useTheme } from '@/src/state/theme'
import { listEvents, type MobileEvent } from '@/src/storage/events'
import { listTasks, type MobileTask } from '@/src/storage/tasks'
import { InsightIcon } from '@/src/components/InsightIcon'

const SEGMENTS = ['Day', 'Week', 'Month', 'Timeline', 'Gantt'] as const
type Segment = (typeof SEGMENTS)[number]

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function getWeekDays(date: Date) {
  const startOfWeek = new Date(date)
  const day = startOfWeek.getDay()
  startOfWeek.setDate(startOfWeek.getDate() - day)
  startOfWeek.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    return d
  })
}

function getMonthDays(date: Date) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDate = new Date(firstDay)
  startDate.setDate(firstDay.getDate() - firstDay.getDay())
  const endDate = new Date(lastDay)
  endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()))
  const days: Date[] = []
  const current = new Date(startDate)
  while (current <= endDate) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  return { days, month, year }
}

export default function PlannerScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { palette } = useTheme()

  const [segment, setSegment] = useState<Segment>('Day')
  const [events, setEvents] = useState<MobileEvent[]>([])
  const [tasks, setTasks] = useState<MobileTask[]>([])

  useEffect(() => {
    let mounted = true
    Promise.all([listEvents(), listTasks()]).then(([eventRows, taskRows]) => {
      if (!mounted) return
      setEvents(eventRows)
      setTasks(taskRows)
    })
    return () => {
      mounted = false
    }
  }, [])

  const today = useMemo(() => new Date(), [])
  const todayKey = useMemo(() => today.toDateString(), [today])
  const todayEvents = useMemo(
    () => events.filter((e) => new Date(e.startAt).toDateString() === todayKey).sort((a, b) => a.startAt - b.startAt),
    [events, todayKey],
  )

  const weekDays = useMemo(() => getWeekDays(new Date()), [])
  const weekEvents = useMemo(() => {
    const start = weekDays[0].getTime()
    const end = weekDays[6].getTime() + 24 * 60 * 60 * 1000
    return events.filter((e) => e.startAt >= start && e.startAt < end)
  }, [events, weekDays])

  const { days: monthDays, month: monthIndex } = useMemo(() => getMonthDays(new Date()), [])
  const monthEvents = useMemo(() => {
    const grouped: Record<string, MobileEvent[]> = {}
    for (const ev of events) {
      const key = new Date(ev.startAt).toDateString()
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(ev)
    }
    return grouped
  }, [events])

  const ganttItems = useMemo(() => {
    const rangeDays = 30
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = start.getTime() + rangeDays * 24 * 60 * 60 * 1000
    const items: Array<{ id: string; title: string; startAt: number; endAt: number; kind: 'event' | 'task' }> = []
    events.forEach((e) => {
      const endAt = e.endAt ?? e.startAt + 60 * 60 * 1000
      if (endAt < start.getTime() || e.startAt > end) return
      items.push({ id: e.id, title: e.title, startAt: e.startAt, endAt, kind: 'event' })
    })
    tasks.forEach((t) => {
      const startAt = t.scheduledAt ?? t.dueAt
      if (!startAt) return
      const duration = Math.max(15, t.estimateMinutes ?? 60) * 60 * 1000
      const endAt = startAt + duration
      if (endAt < start.getTime() || startAt > end) return
      items.push({ id: t.id, title: t.title, startAt, endAt, kind: 'task' })
    })
    return { items: items.sort((a, b) => a.startAt - b.startAt), start: start.getTime(), end }
  }, [events, tasks])

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <InsightIcon name="chevronLeft" size={20} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Planner</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.segmentRow}>
        {SEGMENTS.map((item) => (
          <TouchableOpacity
            key={item}
            onPress={() => setSegment(item)}
            style={[
              styles.segmentChip,
              { backgroundColor: segment === item ? palette.tint : palette.surface, borderColor: palette.border },
            ]}
          >
            <Text style={{ color: segment === item ? '#FFFFFF' : palette.text }}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {segment === 'Day' && (
          <View style={styles.section}>
            {todayEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
                onPress={() => router.push(`/event/${event.id}`)}
              >
                <Text style={{ color: palette.text }}>{event.title}</Text>
                <Text style={{ color: palette.textSecondary }}>{formatTime(event.startAt)}</Text>
              </TouchableOpacity>
            ))}
            {!todayEvents.length ? <Text style={{ color: palette.textSecondary }}>No events today.</Text> : null}
          </View>
        )}

        {segment === 'Week' && (
          <View style={styles.section}>
            {weekDays.map((day) => {
              const key = day.toDateString()
              const items = weekEvents.filter((e) => new Date(e.startAt).toDateString() === key)
              return (
                <View key={key} style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>
                    {day.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                  </Text>
                  {items.map((event) => (
                    <TouchableOpacity
                      key={event.id}
                      style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
                      onPress={() => router.push(`/event/${event.id}`)}
                    >
                      <Text style={{ color: palette.text }}>{event.title}</Text>
                      <Text style={{ color: palette.textSecondary }}>{formatTime(event.startAt)}</Text>
                    </TouchableOpacity>
                  ))}
                  {!items.length ? <Text style={{ color: palette.textSecondary }}>No events.</Text> : null}
                </View>
              )
            })}
          </View>
        )}

        {segment === 'Month' && (
          <View style={styles.monthGrid}>
            <View style={styles.monthHeaderRow}>
              {DAY_LABELS.map((label) => (
                <Text key={label} style={[styles.monthHeaderCell, { color: palette.textSecondary }]}>
                  {label}
                </Text>
              ))}
            </View>
            <View style={styles.monthGridBody}>
              {monthDays.map((day) => {
                const key = day.toDateString()
                const isCurrentMonth = day.getMonth() === monthIndex
                const count = monthEvents[key]?.length ?? 0
                return (
                  <View key={key} style={styles.monthCell}>
                    <Text style={{ color: isCurrentMonth ? palette.text : palette.textSecondary }}>
                      {day.getDate()}
                    </Text>
                    {count ? <Text style={{ color: palette.tint, fontSize: 11 }}>{count}</Text> : null}
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {segment === 'Timeline' && (
          <View style={styles.section}>
            {events
              .slice(0, 40)
              .sort((a, b) => b.startAt - a.startAt)
              .map((event) => (
                <TouchableOpacity
                  key={event.id}
                  style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
                  onPress={() => router.push(`/event/${event.id}`)}
                >
                  <Text style={{ color: palette.text }}>{event.title}</Text>
                  <Text style={{ color: palette.textSecondary }}>
                    {new Date(event.startAt).toLocaleDateString()} · {formatTime(event.startAt)}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        )}

        {segment === 'Gantt' && (
          <View style={styles.section}>
            {ganttItems.items.map((item) => {
              const total = ganttItems.end - ganttItems.start
              const startPct = ((item.startAt - ganttItems.start) / total) * 100
              const widthPct = ((item.endAt - item.startAt) / total) * 100
              return (
                <View key={item.id} style={[styles.ganttRow, { borderColor: palette.border }]}>
                  <Text style={{ color: palette.text }}>{item.title}</Text>
                  <View style={[styles.ganttTrack, { backgroundColor: palette.borderLight }]}>
                    <View
                      style={[
                        styles.ganttBar,
                        {
                          left: `${Math.max(0, startPct)}%`,
                          width: `${Math.max(2, widthPct)}%`,
                          backgroundColor: item.kind === 'event' ? palette.tint : palette.textSecondary,
                        },
                      ]}
                    />
                  </View>
                </View>
              )
            })}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  headerTitle: { fontSize: 22, fontWeight: '900', fontFamily: 'Figtree' },
  backButton: { padding: 8 },
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  segmentChip: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  body: { padding: 16, gap: 12 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  card: { borderWidth: 1, borderRadius: 14, padding: 10, gap: 4 },
  monthGrid: { gap: 6 },
  monthHeaderRow: { flexDirection: 'row' },
  monthHeaderCell: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700' },
  monthGridBody: { flexDirection: 'row', flexWrap: 'wrap' },
  monthCell: { width: '14.28%', alignItems: 'center', paddingVertical: 6, gap: 2 },
  ganttRow: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 6 },
  ganttTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  ganttBar: { position: 'absolute', top: 0, bottom: 0, borderRadius: 4 },
})
