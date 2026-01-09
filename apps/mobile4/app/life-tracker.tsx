import React, { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Text } from '@/components/Themed'
import { useTheme } from '@/src/state/theme'
import { listInboxCaptures } from '@/src/storage/inbox'
import { listTrackerLogs, type TrackerLogEntry } from '@/src/storage/trackers'
import { listWorkouts, type WorkoutEntry } from '@/src/storage/workouts'
import { TrackerHeatMap } from '@/src/components/TrackerHeatMap'
import { TrackerPieChart } from '@/src/components/TrackerPieChart'
import { InsightIcon } from '@/src/components/InsightIcon'

function averageTrackerValue(logs: TrackerLogEntry[], key: string) {
  const values = logs
    .filter((log) => log.trackerKey === key && typeof log.valueNumber === 'number')
    .map((log) => log.valueNumber as number)
  if (!values.length) return null
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length
  return Math.round(avg * 10) / 10
}

export default function LifeTrackerScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { palette } = useTheme()

  const [logs, setLogs] = useState<TrackerLogEntry[]>([])
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([])
  const [captureCount, setCaptureCount] = useState(0)

  useEffect(() => {
    let mounted = true
    Promise.all([listTrackerLogs({ limit: 120 }), listWorkouts(), listInboxCaptures()]).then(
      ([logRows, workoutRows, captureRows]) => {
        if (!mounted) return
        setLogs(logRows)
        setWorkouts(workoutRows)
        setCaptureCount(captureRows.length)
      },
    )
    return () => {
      mounted = false
    }
  }, [])

  const moodAvg = useMemo(() => averageTrackerValue(logs, 'mood'), [logs])
  const energyAvg = useMemo(() => averageTrackerValue(logs, 'energy'), [logs])

  const workoutCount = useMemo(() => workouts.length, [workouts])

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <InsightIcon name="chevronLeft" size={20} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Life Tracker</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.summaryCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View>
            <Text style={[styles.summaryLabel, { color: palette.textSecondary }]}>Captures</Text>
            <Text style={[styles.summaryValue, { color: palette.text }]}>{captureCount}</Text>
          </View>
          <View>
            <Text style={[styles.summaryLabel, { color: palette.textSecondary }]}>Workouts</Text>
            <Text style={[styles.summaryValue, { color: palette.text }]}>{workoutCount}</Text>
          </View>
          <View>
            <Text style={[styles.summaryLabel, { color: palette.textSecondary }]}>Mood Avg</Text>
            <Text style={[styles.summaryValue, { color: palette.text }]}>{moodAvg ?? '—'}</Text>
          </View>
          <View>
            <Text style={[styles.summaryLabel, { color: palette.textSecondary }]}>Energy Avg</Text>
            <Text style={[styles.summaryValue, { color: palette.text }]}>{energyAvg ?? '—'}</Text>
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Tracker Heatmap</Text>
          <TrackerHeatMap logs={logs} days={14} />
        </View>

        <View style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Tracker Mix</Text>
          <TrackerPieChart logs={logs} size={140} />
        </View>

        <TouchableOpacity
          style={[styles.captureButton, { backgroundColor: palette.tint }]}
          onPress={() => router.push('/capture')}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Capture a log</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  headerTitle: { fontSize: 22, fontWeight: '900', fontFamily: 'Figtree' },
  backButton: { padding: 8 },
  content: { padding: 16, gap: 12 },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  summaryValue: { fontSize: 20, fontWeight: '800' },
  sectionCard: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  captureButton: { height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
})
