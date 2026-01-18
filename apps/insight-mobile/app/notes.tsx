import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/src/state/theme';
import { Screen } from '@/components/Screen';
import { listInboxCaptures, addInboxCapture } from '@/src/storage/inbox';
import type { InboxCapture, InboxCaptureStatus } from '@/src/storage/inbox';
import {
  firstLine,
  extractTags,
  extractPeople,
  extractPlaces,
  getPreview,
  wordCount,
  formatRelativeDate,
} from '@/src/lib/notes';

type FilterType = 'all' | 'tag' | 'person' | 'place' | 'status';
type SortType = 'recent' | 'oldest' | 'title';

export default function NotesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { palette } = useTheme();

  const [captures, setCaptures] = useState<InboxCapture[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortType>('recent');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const rows = await listInboxCaptures();
      if (!mounted) return;
      setCaptures(rows);
    };
    if (isFocused) {
      void load();
    }
    return () => {
      mounted = false;
    };
  }, [isFocused]);

  const allTags = useMemo(
    () => Array.from(new Set(captures.flatMap((c) => extractTags(c.rawText)))).slice(0, 30),
    [captures],
  );

  const allPeople = useMemo(
    () => Array.from(new Set(captures.flatMap((c) => extractPeople(c.rawText)))).slice(0, 30),
    [captures],
  );

  const allPlaces = useMemo(
    () => Array.from(new Set(captures.flatMap((c) => extractPlaces(c.rawText)))).slice(0, 30),
    [captures],
  );

  const statusOptions: InboxCaptureStatus[] = ['raw', 'processed', 'archived'];

  const currentFilterOptions = useMemo(() => {
    switch (filterType) {
      case 'tag':
        return allTags;
      case 'person':
        return allPeople;
      case 'place':
        return allPlaces;
      case 'status':
        return statusOptions;
      default:
        return [];
    }
  }, [allTags, allPeople, allPlaces, filterType]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    let base = captures;

    if (filterType !== 'all' && selectedFilters.length > 0) {
      base = captures.filter((c) => {
        if (filterType === 'tag') {
          const tags = extractTags(c.rawText);
          return selectedFilters.some((f) => tags.includes(f));
        }
        if (filterType === 'person') {
          const people = extractPeople(c.rawText);
          return selectedFilters.some((f) => people.includes(f));
        }
        if (filterType === 'place') {
          const places = extractPlaces(c.rawText);
          return selectedFilters.some((f) => places.includes(f));
        }
        if (filterType === 'status') {
          return selectedFilters.includes(c.status);
        }
        return true;
      });
    }

    const searched = needle
      ? base.filter((c) => c.rawText.toLowerCase().includes(needle))
      : base;

    const sorted = [...searched].sort((a, b) => {
      if (sort === 'title') return firstLine(a.rawText).localeCompare(firstLine(b.rawText));
      if (sort === 'oldest') return a.createdAt - b.createdAt;
      return b.createdAt - a.createdAt;
    });

    return sorted.slice(0, 100);
  }, [captures, filterType, search, selectedFilters, sort]);

  const handleNewNote = useCallback(async () => {
    const note = await addInboxCapture('');
    router.push(`/note/${note.id}`);
  }, [router]);

  const toggleFilter = (value: string) => {
    setSelectedFilters((prev) =>
      prev.includes(value) ? prev.filter((f) => f !== value) : [...prev, value],
    );
  };

  return (
    <Screen style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Notes</Text>
        <TouchableOpacity onPress={handleNewNote} style={styles.backButton}>
          <Ionicons name="add" size={26} color={palette.tint} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <View style={[styles.searchInput, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Ionicons name="search" size={16} color={palette.textSecondary} />
          <TextInput
            style={[styles.searchText, { color: palette.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search notes..."
            placeholderTextColor={palette.textSecondary}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={palette.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.sortButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
          onPress={() => {
            const options: SortType[] = ['recent', 'oldest', 'title'];
            const idx = options.indexOf(sort);
            setSort(options[(idx + 1) % options.length]);
          }}
        >
          <Ionicons
            name={sort === 'recent' ? 'time-outline' : sort === 'oldest' ? 'hourglass-outline' : 'text-outline'}
            size={18}
            color={palette.text}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterTabs}
        style={styles.filterScroll}
      >
        {(['all', 'tag', 'person', 'place', 'status'] as FilterType[]).map((ft) => (
          <TouchableOpacity
            key={ft}
            style={[
              styles.filterTab,
              {
                backgroundColor: filterType === ft ? palette.tint : palette.surface,
                borderColor: palette.border,
              },
            ]}
            onPress={() => {
              setFilterType(ft);
              setSelectedFilters([]);
            }}
          >
            <Text
              style={[
                styles.filterTabText,
                { color: filterType === ft ? '#FFFFFF' : palette.text },
              ]}
            >
              {ft === 'all' ? 'All' : ft === 'tag' ? 'Tags' : ft === 'person' ? 'People' : ft === 'place' ? 'Places' : 'Status'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filterType !== 'all' && currentFilterOptions.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChips}
          style={styles.filterChipScroll}
        >
          {currentFilterOptions.map((opt) => {
            const isSelected = selectedFilters.includes(opt);
            return (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? palette.tint : palette.surface,
                    borderColor: palette.border,
                  },
                ]}
                onPress={() => toggleFilter(opt)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: isSelected ? '#FFFFFF' : palette.text },
                  ]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Ionicons name="document-text-outline" size={32} color={palette.textSecondary} />
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
              {search ? 'No notes match your search.' : 'No notes yet.'}
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: palette.tint }]}
              onPress={handleNewNote}
            >
              <Text style={styles.emptyButtonText}>Create Note</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filtered.map((capture) => {
            const title = firstLine(capture.rawText);
            const preview = getPreview(capture.rawText);
            const tags = extractTags(capture.rawText);
            const people = extractPeople(capture.rawText);
            const places = extractPlaces(capture.rawText);
            const words = wordCount(capture.rawText);

            return (
              <TouchableOpacity
                key={capture.id}
                style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
                onPress={() => router.push(`/note/${capture.id}`)}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: palette.text }]} numberOfLines={1}>
                    {title}
                  </Text>
                  <Text style={[styles.cardDate, { color: palette.textSecondary }]}>
                    {formatRelativeDate(capture.createdAt)}
                  </Text>
                </View>

                {preview ? (
                  <Text style={[styles.cardPreview, { color: palette.textSecondary }]} numberOfLines={2}>
                    {preview}
                  </Text>
                ) : null}

                <View style={styles.cardMeta}>
                  {places.length > 0 && (
                    <View style={styles.metaItem}>
                      <Ionicons name="location-outline" size={12} color={palette.textSecondary} />
                      <Text style={[styles.metaText, { color: palette.textSecondary }]}>{places[0]}</Text>
                    </View>
                  )}
                  {people.length > 0 && (
                    <View style={styles.metaItem}>
                      <Ionicons name="people-outline" size={12} color={palette.textSecondary} />
                      <Text style={[styles.metaText, { color: palette.textSecondary }]}>
                        {people.slice(0, 2).join(', ')}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.metaText, { color: palette.textSecondary }]}>{words}w</Text>
                  {capture.status !== 'raw' && (
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: capture.status === 'processed' ? palette.tint : palette.border },
                      ]}
                    >
                      <Text style={styles.statusText}>{capture.status}</Text>
                    </View>
                  )}
                </View>

                {tags.length > 0 && (
                  <View style={styles.cardTags}>
                    {tags.slice(0, 3).map((tag) => (
                      <View
                        key={`${capture.id}_${tag}`}
                        style={[styles.tag, { backgroundColor: palette.border }]}
                      >
                        <Text style={[styles.tagText, { color: palette.text }]}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { padding: 4 },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  searchRow: {
    paddingHorizontal: 14,
    flexDirection: 'row',
    gap: 7,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
  },
  searchText: {
    flex: 1,
    fontSize: 10,
  },
  sortButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterScroll: {
    maxHeight: 28,
  },
  filterTabs: {
    paddingHorizontal: 14,
    gap: 6,
  },
  filterTab: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  filterTabText: {
    fontSize: 9,
    fontWeight: '600',
  },
  filterChipScroll: {
    maxHeight: 25,
    marginTop: 7,
  },
  filterChips: {
    paddingHorizontal: 14,
    gap: 4,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  filterChipText: {
    fontSize: 8,
  },
  scroll: {
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 28,
    gap: 8,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 13,
    padding: 22,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 10,
    textAlign: 'center',
  },
  emptyButton: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 6,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 10,
  },
  card: {
    borderWidth: 1,
    borderRadius: 11,
    padding: 10,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 6,
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: '700',
    flex: 1,
  },
  cardDate: {
    fontSize: 8,
  },
  cardPreview: {
    fontSize: 9,
    lineHeight: 13,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 8,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 8,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cardTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tag: {
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 8,
  },
});
