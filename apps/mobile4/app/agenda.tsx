import React, { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Text } from '@/components/Themed'
import { useTheme } from '@/src/state/theme'
import { listEvents, type MobileEvent } from '@/src/storage/events'
import { listTasks, type MobileTask } from '@/src/storage/tasks'
import { InsightIcon } from '@/src/components/InsightIcon'

type DayBucket = {
  label: string
  dateKey: string
  events: MobileEvent[]
  tasks: MobileTask[]
}

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export default function AgendaScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { palette } = useTheme()

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

  const buckets = useMemo(() => {
    const days = Array.from({ length: 7 }).map((_, idx) => {
      const day = startOfDay(new Date())
      day.setDate(day.getDate() + idx)
      const key = day.toDateString()
      return {
        label: day.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
        dateKey: key,
        events: [] as MobileEvent[],
        tasks: [] as MobileTask[],
      }
    })

    const byKey = new Map(days.map((d) => [d.dateKey, d]))
    events.forEach((event) => {
      const key = new Date(event.startAt).toDateString()
      const bucket = byKey.get(key)
      if (bucket) bucket.events.push(event)
    })
    tasks.forEach((task) => {
      const date = task.dueAt ?? task.scheduledAt
      if (!date) return
      const key = new Date(date).toDateString()
      const bucket = byKey.get(key)
      if (bucket) bucket.tasks.push(task)
    })

    return days.map((d) => ({
      ...d,
      events: d.events.sort((a, b) => a.startAt - b.startAt),
      tasks: d.tasks.sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0)),
    }))
  }, [events, tasks])

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <InsightIcon name="chevronLeft" size={20} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Agenda</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {buckets.map((bucket) => (
          <View key={bucket.dateKey} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>{bucket.label}</Text>
            {bucket.events.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
                onPress={() => router.push(`/event/${event.id}`)}
              >
                <Text style={{ color: palette.text }}>{event.title}</Text>
                <Text style={{ color: palette.textSecondary }}>
                  {new Date(event.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
            ))}
            {bucket.tasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
                onPress={() => router.push(`/task/${task.id}`)}
              >
                <Text style={{ color: palette.text }}>{task.title}</Text>
                <Text style={{ color: palette.textSecondary }}>
                  {task.dueAt ? `Due ${new Date(task.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Task'}
                </Text>
              </TouchableOpacity>
            ))}
            {!bucket.events.length && !bucket.tasks.length ? (
              <Text style={{ color: palette.textSecondary, paddingBottom: 6 }}>No items</Text>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  headerTitle: { fontSize: 22, fontWeight: '900', fontFamily: 'Figtree' },
  backButton: { padding: 8 },
  list: { padding: 16, gap: 12 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  card: { borderWidth: 1, borderRadius: 14, padding: 10, gap: 4 },
})
