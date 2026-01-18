import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from '@/components/Themed';
import { useTheme } from '@/src/state/theme';
import type { CalendarEvent } from '@/src/storage/events';

const HOURS = Array.from({ length: 24 }).map((_, i) => i);

function formatHour(h: number) {
  const hour = h % 12 === 0 ? 12 : h % 12;
  const period = h < 12 ? 'AM' : 'PM';
  return `${hour} ${period}`;
}

function formatTime(ms: number) {
  const d = new Date(ms);
  const h = d.getHours();
  const m = d.getMinutes();
  const hour = h % 12 === 0 ? 12 : h % 12;
  const period = h < 12 ? 'AM' : 'PM';
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

type Props = {
  date: Date;
  events: CalendarEvent[];
  onEventPress?: (event: CalendarEvent) => void;
  hourHeight?: number;
};

export function DayView({ date, events, onEventPress, hourHeight = 60 }: Props) {
  const { palette } = useTheme();

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000;

  const dayEvents = events.filter((e) => e.startAt >= dayStartMs && e.startAt < dayEndMs);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.grid}>
        {HOURS.map((h) => (
          <View key={h} style={[styles.hourRow, { height: hourHeight }]}>
            <View style={styles.hourLabelCol}>
              <Text style={[styles.hourLabel, { color: palette.textSecondary }]}>
                {h === 0 ? '' : formatHour(h)}
              </Text>
            </View>
            <View style={[styles.hourLine, { borderTopColor: palette.border }]} />
          </View>
        ))}

        {dayEvents.map((ev) => {
          const start = new Date(ev.startAt);
          const end = new Date(ev.endAt);
          const startMins = start.getHours() * 60 + start.getMinutes();
          const durationMins = Math.max(15, (end.getTime() - start.getTime()) / 60000);
          const top = (startMins / 60) * hourHeight;
          const height = (durationMins / 60) * hourHeight;

          return (
            <TouchableOpacity
              key={ev.id}
              onPress={() => onEventPress?.(ev)}
              style={[
                styles.eventBlock,
                {
                  top,
                  height: Math.max(height, 30),
                  backgroundColor: ev.active ? palette.tintLight : `rgba(217, 93, 57, 0.15)`,
                  borderColor: ev.active ? palette.tint : palette.border,
                },
              ]}
            >
              <View style={[styles.eventStripe, { backgroundColor: palette.tint }]} />
              <Text style={[styles.eventTitle, { color: palette.text }]} numberOfLines={1}>
                {ev.title}
              </Text>
              <Text style={[styles.eventTime, { color: palette.textSecondary }]}>
                {formatTime(ev.startAt)} - {formatTime(ev.endAt)}
              </Text>
              {ev.tags && ev.tags.length > 0 && (
                <Text style={[styles.eventTags, { color: palette.tint }]} numberOfLines={1}>
                  {ev.tags.slice(0, 2).map((t) => `#${t}`).join(' ')}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 70 },
  grid: { flex: 1, paddingRight: 11 },
  hourRow: { flexDirection: 'row', alignItems: 'flex-start' },
  hourLabelCol: { width: 42, alignItems: 'center', marginTop: -8 },
  hourLabel: { fontSize: 8, fontWeight: '600' },
  hourLine: { flex: 1, borderTopWidth: 1, marginTop: 6 },
  eventBlock: {
    position: 'absolute',
    left: 60,
    right: 0,
    borderRadius: 8,
    borderWidth: 1,
    padding: 6,
    overflow: 'hidden',
  },
  eventStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 12,
  },
  eventTitle: { fontSize: 10, fontWeight: '700', marginLeft: 4 },
  eventTime: { fontSize: 8, marginLeft: 4, marginTop: 2 },
  eventTags: { fontSize: 8, marginLeft: 4, marginTop: 2 },
});
