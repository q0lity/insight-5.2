import React, { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Text } from '@/components/Themed'
import { useTheme } from '@/src/state/theme'
import { listEvents, type MobileEvent } from '@/src/storage/events'
import { InsightIcon } from '@/src/components/InsightIcon'

type RangeKey = 'week' | 'month' | 'all'

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function groupEvents(events: MobileEvent[]) {
  const out = new Map<string, MobileEvent[]>()
  events.forEach((event) => {
    const key = new Date(event.startAt).toDateString()
    const existing = out.get(key) ?? []
    existing.push(event)
    out.set(key, existing)
  })
  return Array.from(out.entries()).map(([date, items]) => ({
    date,
    items: items.sort((a, b) => b.startAt - a.startAt),
  }))
}

export default function TimelineScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { palette } = useTheme()

  const [events, setEvents] = useState<MobileEvent[]>([])
  const [range, setRange] = useState<RangeKey>('month')

  useEffect(() => {
    let mounted = true
    listEvents().then((rows) => {
      if (!mounted) return
      setEvents(rows)
    })
    return () => {
      mounted = false
    }
  }, [])

  const filtered = useMemo(() => {
    if (range === 'all') return events
    const now = Date.now()
    const days = range === 'week' ? 7 : 30
    const start = now - days * 24 * 60 * 60 * 1000
    return events.filter((e) => e.startAt >= start)
  }, [events, range])

  const grouped = useMemo(() => groupEvents(filtered), [filtered])

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <InsightIcon name="chevronLeft" size={20} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Timeline</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.rangeRow}>
        {(['week', 'month', 'all'] as RangeKey[]).map((key) => (
          <TouchableOpacity
            key={key}
            onPress={() => setRange(key)}
            style={[
              styles.rangeChip,
              { backgroundColor: range === key ? palette.tint : palette.surface, borderColor: palette.border },
            ]}
          >
            <Text style={{ color: range === key ? '#FFFFFF' : palette.text }}>{key.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {grouped.map((section) => (
          <View key={section.date} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>{section.date}</Text>
            {section.items.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
                onPress={() => router.push(`/event/${event.id}`)}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: palette.text }]}>{event.title}</Text>
                  <Text style={{ color: palette.textSecondary }}>{formatTime(event.startAt)}</Text>
                </View>
                <Text style={{ color: palette.textSecondary }}>
                  {(event.category || event.subcategory) ? `${event.category ?? ''} ${event.subcategory ?? ''}`.trim() : 'No category'}
                </Text>
              </TouchableOpacity>
            ))}
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
  rangeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  rangeChip: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  list: { padding: 16, gap: 12 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  card: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontWeight: '700', flex: 1 },
})
