import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, TextInput, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { InsightIcon } from '@/src/components/InsightIcon';
import { listEvents, type MobileEvent } from '@/src/storage/events';

type TagStat = {
  tag: string;
  count: number;
};

export default function TagsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';

  const [events, setEvents] = useState<MobileEvent[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const data = await listEvents();
    setEvents(data);
  }

  const tagStats = useMemo(() => {
    const map = new Map<string, number>();
    events.forEach(ev => {
      (ev.tags ?? []).forEach(tag => {
        const t = tag.startsWith('#') ? tag.slice(1) : tag;
        map.set(t, (map.get(t) ?? 0) + 1);
      });
    });
    
    const stats: TagStat[] = Array.from(map.entries()).map(([tag, count]) => ({ tag, count }));
    const filtered = stats.sort((a, b) => b.count - a.count);
    
    if (!search.trim()) return filtered;
    return filtered.filter(s => s.tag.toLowerCase().includes(search.toLowerCase()));
  }, [events, search]);

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <InsightIcon name="chevronLeft" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Tags</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: isDark ? '#141a2a' : '#FFFFFF', borderColor: isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(28, 28, 30, 0.06)' }]}>
          <InsightIcon name="tag" size={18} color={palette.tabIconDefault} />
          <TextInput
            style={[styles.searchInput, { color: palette.text }]}
            placeholder="Search tags..."
            placeholderTextColor={palette.tabIconDefault}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <FlatList
        data={tagStats}
        keyExtractor={(item) => item.tag}
        numColumns={2}
        columnWrapperStyle={styles.listRow}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={[styles.card, { backgroundColor: isDark ? '#141a2a' : '#FFFFFF' }]}>
            <Text style={[styles.emptyText, { color: palette.tabIconDefault }]}>
              No tags found. Add tags to your events to see them here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.tagItem, { backgroundColor: isDark ? '#141a2a' : '#FFFFFF' }]}
            onPress={() => {}}
          >
            <Text style={[styles.tagName, { color: palette.text }]}>#{item.tag}</Text>
            <View style={[styles.countBadge, { backgroundColor: palette.tint + '15' }]}>
              <Text style={[styles.countText, { color: palette.tint }]}>{item.count}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'Figtree',
    letterSpacing: -0.5,
  },
  backButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Figtree',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  listRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'Figtree',
  },
  tagItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
  },
  tagName: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Figtree',
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  countText: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
});
