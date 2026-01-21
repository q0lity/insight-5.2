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

function getThreeDays(date: Date) {
  const centerDay = new Date(date);
  centerDay.setHours(0, 0, 0, 0);

  return Array.from({ length: 3 }).map((_, i) => {
    const d = new Date(centerDay);
    d.setDate(centerDay.getDate() + (i - 1)); // yesterday, today, tomorrow
    return d;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

function formatDayLabel(d: Date, today: Date) {
  if (isSameDay(d, today)) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(d, yesterday)) return 'Yesterday';
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (isSameDay(d, tomorrow)) return 'Tomorrow';
  return d.toLocaleDateString(undefined, { weekday: 'short' });
}

type Props = {
  date: Date;
  events: CalendarEvent[];
  onEventPress?: (event: CalendarEvent) => void;
  onDayPress?: (date: Date) => void;
  hourHeight?: number;
};

export function ThreeDayView({ date, events, onEventPress, onDayPress, hourHeight = 55 }: Props) {
  const { palette } = useTheme();
  const threeDays = getThreeDays(date);
  const today = new Date();

  const rangeStart = threeDays[0].getTime();
  const rangeEnd = threeDays[2].getTime() + 24 * 60 * 60 * 1000;
  const rangeEvents = events.filter((e) => e.startAt >= rangeStart && e.startAt < rangeEnd);

  const dayWidth = 95;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <View style={styles.hourLabelCol} />
        {threeDays.map((day, idx) => {
          const isToday = isSameDay(day, today);
          return (
            <TouchableOpacity
              key={idx}
              style={styles.dayHeader}
              onPress={() => onDayPress?.(day)}
            >
              <Text style={[styles.dayLabel, { color: palette.textSecondary }]}>
                {formatDayLabel(day, today)}
              </Text>
              <View
                style={[
                  styles.dayNumber,
                  isToday && { backgroundColor: palette.tint },
                ]}
              >
                <Text
                  style={[
                    styles.dayNumberText,
                    { color: isToday ? '#fff' : palette.text },
                  ]}
                >
                  {day.getDate()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          {HOURS.map((h) => (
            <View key={h} style={[styles.hourRow, { height: hourHeight }]}>
              <View style={styles.hourLabelCol}>
                <Text style={[styles.hourLabel, { color: palette.textSecondary }]}>
                  {h === 0 ? '' : formatHour(h)}
                </Text>
              </View>
              {threeDays.map((_, dayIdx) => (
                <View
                  key={dayIdx}
                  style={[
                    styles.dayCell,
                    { borderTopColor: palette.border },
                    dayIdx < 2 && { borderRightColor: palette.border, borderRightWidth: 1 },
                  ]}
                />
              ))}
            </View>
          ))}

          {rangeEvents.map((ev) => {
            const start = new Date(ev.startAt);
            const dayStart = new Date(start);
            dayStart.setHours(0, 0, 0, 0);

            // Find which day column this event belongs to
            const dayIdx = threeDays.findIndex((d) => isSameDay(d, dayStart));
            if (dayIdx === -1) return null;

            const startMins = start.getHours() * 60 + start.getMinutes();
            const durationMins = Math.max(15, ((ev.endAt ?? ev.startAt + 3600000) - ev.startAt) / 60000);
            const top = (startMins / 60) * hourHeight;
            const height = (durationMins / 60) * hourHeight;
            const left = 50 + dayIdx * dayWidth;

            return (
              <TouchableOpacity
                key={ev.id}
                onPress={() => onEventPress?.(ev)}
                style={[
                  styles.eventBlock,
                  {
                    top,
                    left,
                    width: dayWidth - 6,
                    height: Math.max(height, 24),
                    backgroundColor: ev.active ? palette.tint : `rgba(217, 93, 57, 0.7)`,
                    borderColor: ev.active ? palette.tint : palette.border,
                  },
                ]}
              >
                <View style={[styles.eventStripe, { backgroundColor: ev.active ? '#fff' : palette.tint }]} />
                <Text style={styles.eventTitle} numberOfLines={1}>
                  {ev.title}
                </Text>
                {height > 40 && (
                  <Text style={styles.eventTime}>
                    {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  hourLabelCol: { width: 50, alignItems: 'center' },
  dayHeader: { flex: 1, alignItems: 'center', gap: 4 },
  dayLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  dayNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberText: { fontSize: 12, fontWeight: '700' },
  content: { paddingBottom: 70 },
  grid: { flex: 1 },
  hourRow: { flexDirection: 'row', alignItems: 'flex-start' },
  hourLabel: { fontSize: 9, fontWeight: '600', marginTop: -6 },
  dayCell: { flex: 1, borderTopWidth: 1 },
  eventBlock: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 1,
    padding: 4,
    overflow: 'hidden',
  },
  eventStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  eventTitle: { fontSize: 10, fontWeight: '700', color: '#fff', marginLeft: 6 },
  eventTime: { fontSize: 8, color: 'rgba(255,255,255,0.8)', marginLeft: 6, marginTop: 2 },
});
