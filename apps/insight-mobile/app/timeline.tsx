import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/src/state/theme';
import { listEvents } from '@/src/storage/events';
import type { CalendarEvent } from '@/src/storage/events';
import { listInboxCaptures } from '@/src/storage/inbox';
import type { InboxCapture } from '@/src/storage/inbox';
import { firstLine, extractTags, formatRelativeDate } from '@/src/lib/notes';

type FilterMode = 'all' | 'events' | 'captures';

type TimelineItem = {
  id: string;
  kind: 'event' | 'capture';
  title: string;
  at: number;
  endAt: number;
  tags: string[];
  category?: string | null;
  isActive?: boolean;
  isTask?: boolean;
};

function formatTime(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDuration(startMs: number, endMs: number) {
  const mins = Math.round((endMs - startMs) / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`;
}

function isoDayFromMs(ms: number) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDayHeader(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(y!, (m ?? 1) - 1, d ?? 1);
  const today = isoDayFromMs(Date.now());
  if (day === today) return 'Today';
  const yesterday = isoDayFromMs(Date.now() - 86400000);
  if (day === yesterday) return 'Yesterday';
  return dt.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function TimelineScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { palette } = useTheme();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [captures, setCaptures] = useState<InboxCapture[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [eventsData, capturesData] = await Promise.all([
        listEvents(),
        listInboxCaptures(),
      ]);
      if (!mounted) return;
      setEvents(eventsData);
      setCaptures(capturesData);
    };
    if (isFocused) {
      void load();
    }
    return () => {
      mounted = false;
    };
  }, [isFocused]);

  const items = useMemo(() => {
    const result: TimelineItem[] = [];

    if (filterMode !== 'captures') {
      for (const ev of events) {
        result.push({
          id: ev.id,
          kind: 'event',
          title: ev.title,
          at: ev.startAt,
          endAt: ev.endAt,
          tags: ev.tags ?? [],
          category: ev.category,
          isActive: ev.active,
          isTask: ev.kind === 'task',
        });
      }
    }

    if (filterMode !== 'events') {
      for (const c of captures) {
        result.push({
          id: c.id,
          kind: 'capture',
          title: firstLine(c.rawText),
          at: c.createdAt,
          endAt: c.createdAt,
          tags: extractTags(c.rawText),
        });
      }
    }

    return result.sort((a, b) => b.at - a.at).slice(0, 200);
  }, [events, captures, filterMode]);

  const groupedByDay = useMemo(() => {
    const groups = new Map<string, TimelineItem[]>();
    for (const item of items) {
      const day = isoDayFromMs(item.at);
      const arr = groups.get(day) ?? [];
      arr.push(item);
      groups.set(day, arr);
    }
    const days = Array.from(groups.keys()).sort().reverse();
    return { groups, days };
  }, [items]);

  const stats = useMemo(() => {
    const eventCount = items.filter((i) => i.kind === 'event').length;
    const captureCount = items.filter((i) => i.kind === 'capture').length;
    const activeCount = items.filter((i) => i.isActive).length;
    return { eventCount, captureCount, activeCount };
  }, [items]);

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Timeline</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.statsRow}>
        {stats.activeCount > 0 && (
          <View style={[styles.activeBadge, { backgroundColor: palette.tint }]}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>{stats.activeCount} active</Text>
          </View>
        )}
      </View>

      <View style={styles.filterRow}>
        {(['all', 'events', 'captures'] as FilterMode[]).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.filterTab,
              {
                backgroundColor: filterMode === mode ? palette.tint : palette.surface,
                borderColor: palette.border,
              },
            ]}
            onPress={() => setFilterMode(mode)}
          >
            <Text
              style={[
                styles.filterTabText,
                { color: filterMode === mode ? '#FFFFFF' : palette.text },
              ]}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {groupedByDay.days.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Ionicons name="time-outline" size={32} color={palette.textSecondary} />
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
              Your timeline awaits. Start capturing moments to see them here.
            </Text>
          </View>
        ) : (
          groupedByDay.days.map((day) => {
            const dayItems = groupedByDay.groups.get(day) ?? [];
            const isToday = day === isoDayFromMs(Date.now());

            return (
              <View key={day} style={styles.daySection}>
                <View style={styles.dayHeader}>
                  <View style={[styles.dayMarker, { backgroundColor: isToday ? palette.tint : palette.border }]}>
                    <Text style={[styles.dayMarkerText, { color: isToday ? '#FFFFFF' : palette.textSecondary }]}>
                      {dayItems.length}
                    </Text>
                  </View>
                  <View style={styles.dayTitleWrap}>
                    <Text style={[styles.dayTitle, { color: isToday ? palette.tint : palette.text }]}>
                      {formatDayHeader(day)}
                    </Text>
                    <Text style={[styles.daySubtitle, { color: palette.textSecondary }]}>
                      {dayItems.length} moment{dayItems.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>

                {dayItems.map((item, idx) => (
                  <View key={item.id} style={styles.itemRow}>
                    <View style={styles.timelineCol}>
                      <Text style={[styles.itemTime, { color: palette.text }]}>
                        {formatTime(item.at)}
                      </Text>
                      {idx < dayItems.length - 1 && (
                        <View style={[styles.timelineLine, { backgroundColor: palette.border }]} />
                      )}
                    </View>

                    <TouchableOpacity
                      style={[styles.itemCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
                      onPress={() => {
                        if (item.kind === 'capture') {
                          router.push(`/note/${item.id}`);
                        }
                      }}
                    >
                      <View style={styles.itemCardHeader}>
                        <View style={[styles.itemIcon, { backgroundColor: item.kind === 'event' ? palette.tint : palette.border }]}>
                          <Ionicons
                            name={item.kind === 'event' ? (item.isTask ? 'checkbox-outline' : 'calendar') : 'document-text'}
                            size={14}
                            color={item.kind === 'event' ? '#FFFFFF' : palette.text}
                          />
                        </View>
                        <View style={styles.itemContent}>
                          <Text style={[styles.itemTitle, { color: palette.text }]} numberOfLines={1}>
                            {item.title}
                            {item.isActive && (
                              <Text style={{ color: palette.tint }}> •</Text>
                            )}
                          </Text>
                          {item.category && (
                            <Text style={[styles.itemCategory, { color: palette.textSecondary }]}>
                              {item.category}
                            </Text>
                          )}
                        </View>
                        {item.kind === 'event' && item.endAt > item.at && (
                          <Text style={[styles.itemDuration, { color: palette.textSecondary }]}>
                            {formatDuration(item.at, item.endAt)}
                          </Text>
                        )}
                      </View>

                      {item.tags.length > 0 && (
                        <View style={styles.itemTags}>
                          {item.tags.slice(0, 3).map((tag) => (
                            <View key={`${item.id}_${tag}`} style={[styles.tag, { backgroundColor: palette.border }]}>
                              <Text style={[styles.tagText, { color: palette.text }]}>{tag}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { padding: 6 },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  statsRow: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  activeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  filterTab: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  daySection: {
    marginBottom: 24,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  dayMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayMarkerText: {
    fontSize: 14,
    fontWeight: '700',
  },
  dayTitleWrap: {
    flex: 1,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  daySubtitle: {
    fontSize: 12,
  },
  itemRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  timelineCol: {
    width: 60,
    alignItems: 'center',
  },
  itemTime: {
    fontSize: 13,
    fontWeight: '600',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 8,
    borderRadius: 1,
  },
  itemCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginLeft: 8,
  },
  itemCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  itemIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemCategory: {
    fontSize: 11,
    marginTop: 2,
  },
  itemDuration: {
    fontSize: 11,
    fontWeight: '600',
  },
  itemTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tag: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 10,
  },
});
