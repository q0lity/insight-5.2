import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { Screen } from '@/components/Screen';
import { LuxCard } from '@/components/LuxCard';
import { LuxHeader } from '@/components/LuxHeader';
import { LuxPill } from '@/components/LuxPill';
import { useTheme } from '@/src/state/theme';
import { listEvents, type CalendarEvent } from '@/src/storage/events';

function formatTime(ms: number) {
  const d = new Date(ms);
  const h = d.getHours();
  const m = d.getMinutes();
  const hour = h % 12 === 0 ? 12 : h % 12;
  const period = h < 12 ? 'AM' : 'PM';
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

function formatDuration(startMs: number, endMs: number) {
  const mins = Math.round((endMs - startMs) / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hours}h ${remainMins}m` : `${hours}h`;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

function formatDayHeader(d: Date, today: Date) {
  if (isSameDay(d, today)) return 'Today';
  if (isSameDay(d, addDays(today, 1))) return 'Tomorrow';
  if (isSameDay(d, addDays(today, -1))) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function AgendaScreen() {
  const router = useRouter();
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const today = new Date();

  useEffect(() => {
    listEvents().then((rows) => setEvents(rows));
  }, []);

  const groupedEvents = useMemo(() => {
    const now = startOfDay(today);
    const rangeStart = addDays(now, -7);
    const rangeEnd = addDays(now, 14);

    const filtered = events.filter(
      (e) => e.startAt >= rangeStart.getTime() && e.startAt < rangeEnd.getTime()
    );

    const groups: Array<{ date: Date; events: CalendarEvent[] }> = [];
    const byDate = new Map<string, CalendarEvent[]>();

    for (const ev of filtered) {
      const key = new Date(ev.startAt).toDateString();
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(ev);
    }

    for (let d = new Date(rangeStart); d < rangeEnd; d = addDays(d, 1)) {
      const key = d.toDateString();
      const dayEvents = byDate.get(key) ?? [];
      if (dayEvents.length > 0 || isSameDay(d, today)) {
        groups.push({
          date: new Date(d),
          events: dayEvents.sort((a, b) => a.startAt - b.startAt),
        });
      }
    }

    return groups;
  }, [events, today]);

  const handleEventPress = (event: CalendarEvent) => {
    router.push(`/event/${event.id}`);
  };

  return (
    <Screen style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={{ color: palette.tint }}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerMain}>
          <LuxHeader
            overline="Agenda"
            title="Upcoming schedule"
            subtitle={`${events.length} events over 2 weeks`}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {groupedEvents.map((group) => {
          const isToday = isSameDay(group.date, today);
          return (
            <View key={group.date.toISOString()} style={styles.dayGroup}>
              <View style={styles.dayHeader}>
                <Text style={[styles.dayHeaderText, { color: isToday ? palette.tint : palette.text }]}>
                  {formatDayHeader(group.date, today)}
                </Text>
                <LuxPill label={`${group.events.length} events`} active={isToday} />
              </View>

              {group.events.length === 0 ? (
                <View style={styles.emptyDay}>
                  <Text style={{ color: palette.textSecondary }}>No events scheduled</Text>
                </View>
              ) : (
                group.events.map((ev) => (
                  <TouchableOpacity
                    key={ev.id}
                    onPress={() => handleEventPress(ev)}
                  >
                    <LuxCard style={styles.eventRow} accent={ev.active ? palette.tint : palette.borderLight}>
                      <View style={[styles.eventStripe, { backgroundColor: palette.tint }]} />
                      <View style={styles.eventTime}>
                        <Text style={[styles.timeText, { color: palette.text }]}>
                          {formatTime(ev.startAt)}
                        </Text>
                        <Text style={[styles.durationText, { color: palette.textSecondary }]}>
                          {formatDuration(ev.startAt, ev.endAt)}
                        </Text>
                      </View>
                      <View style={styles.eventDetails}>
                        <Text style={[styles.eventTitle, { color: palette.text }]} numberOfLines={1}>
                          {ev.title}
                        </Text>
                        {ev.tags && ev.tags.length > 0 && (
                          <Text style={[styles.eventTags, { color: palette.tint }]} numberOfLines={1}>
                            {ev.tags.slice(0, 3).map((t) => `#${t}`).join(' ')}
                          </Text>
                        )}
                        {ev.category && (
                          <Text style={[styles.eventCategory, { color: palette.textSecondary }]}>
                            {ev.category}
                            {ev.subcategory ? ` / ${ev.subcategory}` : ''}
                          </Text>
                        )}
                      </View>
                      {ev.active && (
                        <View style={[styles.activeBadge, { backgroundColor: palette.tint }]}>
                          <Text style={styles.activeBadgeText}>LIVE</Text>
                        </View>
                      )}
                      {ev.completedAt && (
                        <View style={[styles.completedBadge, { backgroundColor: palette.success }]}>
                          <Text style={styles.completedBadgeText}>✓</Text>
                        </View>
                      )}
                    </LuxCard>
                  </TouchableOpacity>
                ))
              )}
            </View>
          );
        })}

        {groupedEvents.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={{ color: palette.textSecondary }}>No events in the next 2 weeks</Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  headerMain: { flex: 1 },
  backButton: { paddingVertical: 4 },
  scrollContent: { paddingBottom: 70 },
  dayGroup: { marginBottom: 6 },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  dayHeaderText: { fontSize: 10, fontWeight: '700' },
  dayCount: { fontSize: 8 },
  emptyDay: {
    paddingVertical: 14,
    paddingHorizontal: 11,
    alignItems: 'center',
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 11,
    marginTop: 6,
    padding: 8,
    overflow: 'hidden',
  },
  eventStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 12,
  },
  eventTime: {
    width: 49,
    marginLeft: 6,
  },
  timeText: { fontSize: 9, fontWeight: '700' },
  durationText: { fontSize: 8, marginTop: 2 },
  eventDetails: { flex: 1, marginLeft: 8 },
  eventTitle: { fontSize: 10, fontWeight: '700' },
  eventTags: { fontSize: 8, marginTop: 2 },
  eventCategory: { fontSize: 8, marginTop: 2 },
  activeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '800',
  },
  completedBadge: {
    width: 17,
    height: 17,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
  },
  emptyState: {
    paddingVertical: 42,
    alignItems: 'center',
  },
});
