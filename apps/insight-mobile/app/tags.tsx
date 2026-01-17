import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/src/state/theme';
import { InsightIcon } from '@/src/components/InsightIcon';
import { listEvents, type MobileEvent } from '@/src/storage/events';

type EntityType = 'tags' | 'people' | 'contexts' | 'skills';

type EntityStat = {
  name: string;
  count: number;
  lastUsed: number;
};

const SEGMENTS: { key: EntityType; label: string; icon: string }[] = [
  { key: 'tags', label: 'Tags', icon: '#' },
  { key: 'people', label: 'People', icon: '@' },
  { key: 'contexts', label: 'Contexts', icon: '~' },
  { key: 'skills', label: 'Skills', icon: '★' },
];

function getPrefix(type: EntityType): string {
  switch (type) {
    case 'tags':
      return '#';
    case 'people':
      return '@';
    case 'contexts':
      return '~';
    case 'skills':
      return '';
  }
}

function getColor(type: EntityType, palette: ReturnType<typeof useTheme>['palette']): string {
  switch (type) {
    case 'tags':
      return palette.tint;
    case 'people':
      return '#8B7EC8';
    case 'contexts':
      return '#7BAF7B';
    case 'skills':
      return '#D4A574';
  }
}

function formatRelativeTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

type EntityItemProps = {
  item: EntityStat;
  entityType: EntityType;
  palette: ReturnType<typeof useTheme>['palette'];
};

const EntityItem = React.memo(function EntityItem({
  item,
  entityType,
  palette,
}: EntityItemProps) {
  const color = getColor(entityType, palette);
  const prefix = getPrefix(entityType);
  return (
    <TouchableOpacity
      style={[styles.entityItem, { backgroundColor: palette.surface }]}
      onPress={() => {}}
      activeOpacity={0.7}
    >
      <View style={[styles.entityIcon, { backgroundColor: `${color}15` }]}>
        <Text style={[styles.entityIconText, { color }]}>
          {prefix}
        </Text>
      </View>
      <View style={styles.entityInfo}>
        <Text style={[styles.entityName, { color: palette.text }]}>
          {prefix}{item.name}
        </Text>
        <Text style={[styles.entityMeta, { color: palette.textSecondary }]}>
          {item.count} {item.count === 1 ? 'event' : 'events'} · Last used {formatRelativeTime(item.lastUsed)}
        </Text>
      </View>
      <View style={[styles.countBadge, { backgroundColor: `${color}15` }]}>
        <Text style={[styles.countText, { color }]}>{item.count}</Text>
      </View>
    </TouchableOpacity>
  );
});

export default function TagsScreen() {
  const router = useRouter();
  const { palette, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [events, setEvents] = useState<MobileEvent[]>([]);
  const [search, setSearch] = useState('');
  const [activeSegment, setActiveSegment] = useState<EntityType>('tags');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const data = await listEvents();
    setEvents(data);
  }

  // Calculate stats for all entity types
  const entityStats = useMemo(() => {
    const tags = new Map<string, EntityStat>();
    const people = new Map<string, EntityStat>();
    const contexts = new Map<string, EntityStat>();
    const skills = new Map<string, EntityStat>();

    for (const e of events) {
      // Tags
      for (const tag of e.tags ?? []) {
        const t = tag.startsWith('#') ? tag.slice(1) : tag;
        const existing = tags.get(t);
        if (existing) {
          existing.count++;
          existing.lastUsed = Math.max(existing.lastUsed, e.startAt);
        } else {
          tags.set(t, { name: t, count: 1, lastUsed: e.startAt });
        }
      }

      // People
      for (const person of e.people ?? []) {
        const existing = people.get(person);
        if (existing) {
          existing.count++;
          existing.lastUsed = Math.max(existing.lastUsed, e.startAt);
        } else {
          people.set(person, { name: person, count: 1, lastUsed: e.startAt });
        }
      }

      // Contexts
      for (const context of e.contexts ?? []) {
        const existing = contexts.get(context);
        if (existing) {
          existing.count++;
          existing.lastUsed = Math.max(existing.lastUsed, e.startAt);
        } else {
          contexts.set(context, { name: context, count: 1, lastUsed: e.startAt });
        }
      }

      // Skills
      for (const skill of e.skills ?? []) {
        const existing = skills.get(skill);
        if (existing) {
          existing.count++;
          existing.lastUsed = Math.max(existing.lastUsed, e.startAt);
        } else {
          skills.set(skill, { name: skill, count: 1, lastUsed: e.startAt });
        }
      }
    }

    return {
      tags: Array.from(tags.values()).sort((a, b) => b.count - a.count),
      people: Array.from(people.values()).sort((a, b) => b.count - a.count),
      contexts: Array.from(contexts.values()).sort((a, b) => b.count - a.count),
      skills: Array.from(skills.values()).sort((a, b) => b.count - a.count),
    };
  }, [events]);

  const filteredStats = useMemo(() => {
    const stats = entityStats[activeSegment];
    if (!search.trim()) return stats;
    return stats.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
  }, [entityStats, activeSegment, search]);

  const getEmptyMessage = useCallback((type: EntityType): string => {
    switch (type) {
      case 'tags':
        return 'No tags found. Add #tags to your events to see them here.';
      case 'people':
        return 'No people found. Mention @people in your events to track collaborations.';
      case 'contexts':
        return 'No contexts found. Add contexts to your events to organize by situation.';
      case 'skills':
        return 'No skills found. Track skills in your events to monitor growth.';
    }
  }, []);

  const keyExtractor = useCallback((item: EntityStat) => item.name, []);

  const renderItem = useCallback(({ item }: { item: EntityStat }) => (
    <EntityItem
      item={item}
      entityType={activeSegment}
      palette={palette}
    />
  ), [activeSegment, palette]);

  const ListEmptyComponent = useCallback(() => (
    <View style={[styles.emptyCard, { backgroundColor: palette.surface }]}>
      <View style={[styles.emptyIcon, { backgroundColor: palette.borderLight }]}>
        <Text style={[styles.emptyIconText, { color: palette.textSecondary }]}>
          {getPrefix(activeSegment) || '?'}
        </Text>
      </View>
      <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
        {getEmptyMessage(activeSegment)}
      </Text>
    </View>
  ), [palette, activeSegment, getEmptyMessage]);

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <InsightIcon name="chevronLeft" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Entities</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Segment Control */}
      <View style={styles.segmentContainer}>
        <View style={[styles.segmentRow, { backgroundColor: palette.surface }]}>
          {SEGMENTS.map((seg) => {
            const isActive = activeSegment === seg.key;
            const count = entityStats[seg.key].length;
            return (
              <TouchableOpacity
                key={seg.key}
                style={[
                  styles.segmentItem,
                  isActive && { backgroundColor: palette.tint },
                ]}
                onPress={() => setActiveSegment(seg.key)}
              >
                <Text
                  style={[
                    styles.segmentIcon,
                    { color: isActive ? '#FFFFFF' : palette.textSecondary },
                  ]}
                >
                  {seg.icon}
                </Text>
                <Text
                  style={[
                    styles.segmentLabel,
                    { color: isActive ? '#FFFFFF' : palette.text },
                  ]}
                >
                  {seg.label}
                </Text>
                <View
                  style={[
                    styles.segmentBadge,
                    { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : palette.borderLight },
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentCount,
                      { color: isActive ? '#FFFFFF' : palette.textSecondary },
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <InsightIcon name="tag" size={18} color={palette.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: palette.text }]}
            placeholder={`Search ${activeSegment}...`}
            placeholderTextColor={palette.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <InsightIcon name="plus" size={16} color={palette.textSecondary} style={{ transform: [{ rotate: '45deg' }] }} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredStats}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={ListEmptyComponent}
        renderItem={renderItem}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={true}
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
  segmentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  segmentRow: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  segmentIcon: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  segmentLabel: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  segmentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 2,
  },
  segmentCount: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
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
    gap: 10,
  },
  emptyCard: {
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
    alignItems: 'center',
    gap: 16,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconText: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'Figtree',
    paddingHorizontal: 16,
  },
  entityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
    gap: 12,
  },
  entityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entityIconText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  entityInfo: {
    flex: 1,
  },
  entityName: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Figtree',
    marginBottom: 2,
  },
  entityMeta: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Figtree',
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  countText: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
});
