import React, { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Text } from '@/components/Themed'
import { useTheme } from '@/src/state/theme'
import { listReflections, type Reflection } from '@/src/storage/reflections'
import { InsightIcon } from '@/src/components/InsightIcon'

function formatRange(range: { start: number; end: number }) {
  const start = new Date(range.start)
  const end = new Date(range.end)
  return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
}

export default function ReflectionsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { palette } = useTheme()

  const [reflections, setReflections] = useState<Reflection[]>([])

  useEffect(() => {
    listReflections().then(setReflections)
  }, [])

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <InsightIcon name="chevronLeft" size={20} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Reflections</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {reflections.map((reflection) => (
          <View key={reflection.id} style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.cardTitle, { color: palette.text }]}>{reflection.title}</Text>
            <Text style={{ color: palette.textSecondary }}>{formatRange(reflection.dateRange)}</Text>
            <Text style={[styles.cardSummary, { color: palette.textSecondary }]}>{reflection.summary}</Text>
            {reflection.themes.map((theme) => (
              <View key={theme.title} style={styles.themeRow}>
                <Text style={{ color: palette.text }}>{theme.title}</Text>
                <Text style={{ color: palette.textSecondary }}>{theme.content}</Text>
              </View>
            ))}
          </View>
        ))}
        {!reflections.length ? (
          <Text style={{ color: palette.textSecondary }}>No reflections yet.</Text>
        ) : null}
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
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardSummary: { lineHeight: 18 },
  themeRow: { gap: 4 },
})
