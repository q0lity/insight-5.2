import React, { useEffect, useMemo, useState } from 'react'
import { FlatList, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Text } from '@/components/Themed'
import { useTheme } from '@/src/state/theme'
import { listInboxCaptures, type InboxCapture } from '@/src/storage/inbox'
import { InsightIcon } from '@/src/components/InsightIcon'
import {
  firstLine,
  extractTags,
  extractPeople,
  extractPlaces,
  extractCategories,
  formatRelativeDate,
  getPreview,
  wordCount,
  uniqueFilters,
  categoriesFromStarter,
} from '@insight/shared'

type FilterType = 'all' | 'category' | 'tag' | 'person' | 'place'

export default function NotesScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { palette } = useTheme()

  const [captures, setCaptures] = useState<InboxCapture[]>([])
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'recent' | 'oldest' | 'title'>('recent')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])

  useEffect(() => {
    let mounted = true
    listInboxCaptures().then((rows) => {
      if (!mounted) return
      setCaptures(rows)
    })
    return () => {
      mounted = false
    }
  }, [])

  const categories = useMemo(() => categoriesFromStarter(), [])

  const allTags = useMemo(
    () => Array.from(new Set(captures.flatMap((c) => extractTags(c.rawText)))).slice(0, 50),
    [captures],
  )
  const allPeople = useMemo(
    () => Array.from(new Set(captures.flatMap((c) => extractPeople(c.rawText)))).slice(0, 50),
    [captures],
  )
  const allPlaces = useMemo(
    () => Array.from(new Set(captures.flatMap((c) => extractPlaces(c.rawText)))).slice(0, 50),
    [captures],
  )

  const allCategories = useMemo(() => {
    const found: string[] = []
    for (const c of captures) {
      found.push(...extractCategories(c.rawText, categories))
    }
    return uniqueFilters(found).sort((a, b) => a.localeCompare(b))
  }, [categories, captures])

  const currentFilterOptions = useMemo(() => {
    switch (filterType) {
      case 'category':
        return allCategories
      case 'tag':
        return allTags
      case 'person':
        return allPeople
      case 'place':
        return allPlaces
      default:
        return []
    }
  }, [allCategories, allPeople, allPlaces, allTags, filterType])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const base = captures.filter((c) => {
      if (filterType === 'all' || selectedFilters.length === 0) return true
      const filters = selectedFilters
      if (filterType === 'tag') {
        const tags = extractTags(c.rawText)
        return filters.some((f) => tags.includes(f))
      }
      if (filterType === 'person') {
        const people = extractPeople(c.rawText)
        return filters.some((f) => people.includes(f))
      }
      if (filterType === 'place') {
        const places = extractPlaces(c.rawText)
        return filters.some((f) => places.includes(f))
      }
      if (filterType === 'category') {
        const cats = extractCategories(c.rawText, categories)
        return filters.some((f) => cats.includes(f))
      }
      return true
    })
    const searched = needle ? base.filter((c) => c.rawText.toLowerCase().includes(needle)) : base
    const sorted = [...searched].sort((a, b) => {
      if (sort === 'title') return firstLine(a.rawText).localeCompare(firstLine(b.rawText))
      if (sort === 'oldest') return a.createdAt - b.createdAt
      return b.createdAt - a.createdAt
    })
    return sorted.slice(0, 250)
  }, [captures, q, sort, filterType, selectedFilters, categories])

  const toggleFilter = (value: string) => {
    setSelectedFilters((prev) => {
      if (prev.includes(value)) return prev.filter((item) => item !== value)
      return [...prev, value]
    })
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <InsightIcon name="chevronLeft" size={20} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Notes</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchRow}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search notes, tags, people..."
          placeholderTextColor={palette.textSecondary}
          style={[styles.searchInput, { backgroundColor: palette.surface, color: palette.text, borderColor: palette.border }]}
        />
      </View>

      <View style={styles.filterRow}>
        {(['all', 'tag', 'person', 'place', 'category'] as FilterType[]).map((type) => {
          const active = filterType === type
          return (
            <TouchableOpacity
              key={type}
              onPress={() => {
                setFilterType(type)
                setSelectedFilters([])
              }}
              style={[
                styles.filterChip,
                { backgroundColor: active ? palette.tint : palette.surface, borderColor: palette.border },
              ]}
            >
              <Text style={{ color: active ? '#FFFFFF' : palette.text }}>{type.toUpperCase()}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {filterType !== 'all' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterOptions}>
          {currentFilterOptions.map((item) => {
            const active = selectedFilters.includes(item)
            return (
              <TouchableOpacity
                key={item}
                onPress={() => toggleFilter(item)}
                style={[
                  styles.optionChip,
                  { backgroundColor: active ? palette.tintLight : palette.surface, borderColor: palette.border },
                ]}
              >
                <Text style={{ color: palette.text }}>{item}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
            onPress={() => router.push(`/note/${item.id}`)}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: palette.text }]}>{firstLine(item.rawText)}</Text>
              <Text style={{ color: palette.textSecondary }}>{formatRelativeDate(item.createdAt)}</Text>
            </View>
            <Text style={[styles.cardPreview, { color: palette.textSecondary }]} numberOfLines={3}>
              {getPreview(item.rawText)}
            </Text>
            <View style={styles.cardFooter}>
              <Text style={{ color: palette.textSecondary }}>{wordCount(item.rawText)} words</Text>
              <Text style={{ color: palette.textSecondary }}>
                {extractTags(item.rawText).slice(0, 3).join(' ')}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: palette.textSecondary }}>No notes match your filters yet.</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  headerTitle: { fontSize: 22, fontWeight: '900', fontFamily: 'Figtree' },
  backButton: { padding: 8 },
  searchRow: { paddingHorizontal: 16, paddingBottom: 8 },
  searchInput: { height: 44, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, fontFamily: 'Figtree' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  filterChip: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  filterOptions: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  optionChip: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  listContent: { padding: 16, gap: 12 },
  card: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontWeight: '700', flex: 1 },
  cardPreview: { fontSize: 13, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  empty: { padding: 24, alignItems: 'center' },
})
