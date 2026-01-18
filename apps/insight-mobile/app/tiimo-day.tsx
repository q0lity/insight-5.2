import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
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
import { Screen } from '@/components/Screen';

const HOUR_HEIGHT = 60;
const START_HOUR = 0;
const END_HOUR = 24;
const TOTAL_HOURS = END_HOUR - START_HOUR;

function startOfDayMs(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function formatDayLabel(d: Date) {
  const today = startOfDayMs(new Date());
  const dayStart = startOfDayMs(d);
  if (dayStart === today) return 'Today';
  if (dayStart === today - 86400000) return 'Yesterday';
  if (dayStart === today + 86400000) return 'Tomorrow';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function minuteOfDay(ms: number) {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
}

function formatTime(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export default function TiimoDayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { palette } = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const dayStart = startOfDayMs(date);
  const dayEnd = dayStart + 86400000;
  const isToday = startOfDayMs(new Date()) === dayStart;

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const data = await listEvents(dayStart, dayEnd);
      if (!mounted) return;
      setEvents(data);
    };
    if (isFocused) {
      void load();
    }
    return () => {
      mounted = false;
    };
  }, [isFocused, dayStart, dayEnd]);

  useEffect(() => {
    if (isToday && scrollRef.current) {
      const nowMinute = minuteOfDay(Date.now());
      const scrollY = Math.max(0, ((nowMinute / 60) - 1) * HOUR_HEIGHT);
      const timeoutId = setTimeout(() => {
        scrollRef.current?.scrollTo({ y: scrollY, animated: false });
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isToday, date]);

  const dayEvents = useMemo(() => {
    return events
      .filter((e) => !e.allDay && e.kind !== 'log')
      .filter((e) => e.startAt >= dayStart && e.startAt < dayEnd)
      .sort((a, b) => a.startAt - b.startAt);
  }, [events, dayStart, dayEnd]);

  const layoutEvents = useMemo(() => {
    const sorted = [...dayEvents].sort((a, b) => a.startAt - b.startAt);
    const cols: CalendarEvent[][] = [];
    const colIndexById = new Map<string, number>();

    for (const ev of sorted) {
      let placed = false;
      for (let i = 0; i < cols.length; i++) {
        const col = cols[i]!;
        const last = col[col.length - 1];
        if (!last || last.endAt <= ev.startAt) {
          col.push(ev);
          colIndexById.set(ev.id, i);
          placed = true;
          break;
        }
      }
      if (!placed) {
        cols.push([ev]);
        colIndexById.set(ev.id, cols.length - 1);
      }
    }

    return { colCount: Math.max(1, cols.length), colIndexById };
  }, [dayEvents]);

  const nowMinute = minuteOfDay(Date.now());

  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);
  const screenWidth = Dimensions.get('window').width;
  const timeColWidth = 50;
  const gridWidth = screenWidth - 40 - timeColWidth;

  return (
    <Screen style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Day View</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.navRow}>
        <TouchableOpacity
          style={[styles.navButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
          onPress={() => setDate(addDays(date, -1))}
        >
          <Ionicons name="chevron-back" size={20} color={palette.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.todayButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
          onPress={() => setDate(new Date())}
        >
          <Text style={[styles.todayText, { color: palette.text }]}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
          onPress={() => setDate(addDays(date, 1))}
        >
          <Ionicons name="chevron-forward" size={20} color={palette.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.dateRow}>
        <Text style={[styles.dateLabel, { color: isToday ? palette.tint : palette.text }]}>
          {formatDayLabel(date)}
        </Text>
        <Text style={[styles.eventCount, { color: palette.textSecondary }]}>
          {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { height: TOTAL_HOURS * HOUR_HEIGHT }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.timeCol, { width: timeColWidth }]}>
          {hours.map((hour) => (
            <View key={hour} style={[styles.timeCell, { height: HOUR_HEIGHT }]}>
              <Text style={[styles.timeText, { color: palette.textSecondary }]}>
                {String(hour).padStart(2, '0')}:00
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.gridCol, { width: gridWidth }]}>
          {hours.map((hour) => (
            <View
              key={hour}
              style={[
                styles.gridRow,
                { height: HOUR_HEIGHT, borderBottomColor: palette.border },
              ]}
            />
          ))}

          {isToday && nowMinute >= START_HOUR * 60 && nowMinute < END_HOUR * 60 && (
            <View
              style={[
                styles.nowIndicator,
                { top: ((nowMinute - START_HOUR * 60) / (TOTAL_HOURS * 60)) * (TOTAL_HOURS * HOUR_HEIGHT) },
              ]}
            >
              <View style={[styles.nowDot, { backgroundColor: palette.tint }]} />
              <View style={[styles.nowLine, { backgroundColor: palette.tint }]} />
            </View>
          )}

          {dayEvents.map((ev) => {
            const startMin = clamp(minuteOfDay(ev.startAt), START_HOUR * 60, END_HOUR * 60);
            const endMin = clamp(minuteOfDay(ev.endAt), startMin + 15, END_HOUR * 60);
            const top = ((startMin - START_HOUR * 60) / (TOTAL_HOURS * 60)) * (TOTAL_HOURS * HOUR_HEIGHT);
            const height = Math.max(20, ((endMin - startMin) / (TOTAL_HOURS * 60)) * (TOTAL_HOURS * HOUR_HEIGHT));

            const colIdx = layoutEvents.colIndexById.get(ev.id) ?? 0;
            const colWidth = gridWidth / layoutEvents.colCount;
            const left = colIdx * colWidth;
            const width = colWidth - 4;

            const isActive = ev.active;
            const isTask = ev.kind === 'task';

            return (
              <TouchableOpacity
                key={ev.id}
                style={[
                  styles.eventCard,
                  {
                    top,
                    height,
                    left,
                    width,
                    backgroundColor: isActive ? palette.tint : palette.surface,
                    borderColor: isActive ? palette.tint : palette.border,
                  },
                ]}
                activeOpacity={0.8}
              >
                <View style={styles.eventStripe}>
                  <View
                    style={[
                      styles.stripe,
                      { backgroundColor: isTask ? '#f59e0b' : palette.tint },
                    ]}
                  />
                </View>
                <View style={styles.eventContent}>
                  <Text
                    style={[
                      styles.eventTitle,
                      { color: isActive ? '#FFFFFF' : palette.text },
                    ]}
                    numberOfLines={height > 40 ? 2 : 1}
                  >
                    {ev.title}
                  </Text>
                  {height > 50 && (
                    <Text
                      style={[
                        styles.eventTime,
                        { color: isActive ? 'rgba(255,255,255,0.8)' : palette.textSecondary },
                      ]}
                    >
                      {formatTime(ev.startAt)} - {formatTime(ev.endAt)}
                    </Text>
                  )}
                  {height > 70 && ev.category && (
                    <Text
                      style={[
                        styles.eventCategory,
                        { color: isActive ? 'rgba(255,255,255,0.7)' : palette.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {ev.category}
                    </Text>
                  )}
                </View>
                {isActive && (
                  <View style={styles.activeIndicator}>
                    <View style={[styles.activePulse, { backgroundColor: '#FFFFFF' }]} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
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
  navRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  navButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayButton: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  todayText: {
    fontSize: 10,
    fontWeight: '600',
  },
  dateRow: {
    paddingHorizontal: 14,
    marginBottom: 11,
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  eventCount: {
    fontSize: 8,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexDirection: 'row',
    paddingHorizontal: 14,
  },
  timeCol: {
    paddingRight: 6,
  },
  timeCell: {
    justifyContent: 'flex-start',
  },
  timeText: {
    fontSize: 8,
    fontWeight: '500',
  },
  gridCol: {
    position: 'relative',
  },
  gridRow: {
    borderBottomWidth: 1,
  },
  nowIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  nowDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: -4,
  },
  nowLine: {
    flex: 1,
    height: 2,
  },
  eventCard: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  eventStripe: {
    width: 12,
  },
  stripe: {
    flex: 1,
  },
  eventContent: {
    flex: 1,
    padding: 4,
    justifyContent: 'center',
  },
  eventTitle: {
    fontSize: 8,
    fontWeight: '600',
  },
  eventTime: {
    fontSize: 8,
    marginTop: 2,
  },
  eventCategory: {
    fontSize: 8,
    marginTop: 2,
  },
  activeIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  activePulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});