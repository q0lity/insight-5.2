import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from '@/components/Themed';
import { useTheme } from '@/src/state/theme';
import type { CalendarEvent } from '@/src/storage/events';

const HOURS = Array.from({ length: 24 }).map((_, i) => i);
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatHour(h: number) {
  const hour = h % 12 === 0 ? 12 : h % 12;
  const period = h < 12 ? 'AM' : 'PM';
  return `${hour} ${period}`;
}

function getWeekDays(date: Date) {
  const startOfWeek = new Date(date);
  const day = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - day);
  startOfWeek.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

type Props = {
  date: Date;
  events: CalendarEvent[];
  onEventPress?: (event: CalendarEvent) => void;
  onDayPress?: (date: Date) => void;
  hourHeight?: number;
};

export function WeekView({ date, events, onEventPress, onDayPress, hourHeight = 50 }: Props) {
  const { palette } = useTheme();
  const weekDays = getWeekDays(date);
  const today = new Date();

  const weekStart = weekDays[0].getTime();
  const weekEnd = weekDays[6].getTime() + 24 * 60 * 60 * 1000;
  const weekEvents = events.filter((e) => e.startAt >= weekStart && e.startAt < weekEnd);

  const dayWidth = 44;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <View style={styles.hourLabelCol} />
        {weekDays.map((day, idx) => {
          const isToday = isSameDay(day, today);
          return (
            <TouchableOpacity
              key={idx}
              style={styles.dayHeader}
              onPress={() => onDayPress?.(day)}
            >
              <Text style={[styles.dayLabel, { color: palette.textSecondary }]}>
                {DAY_LABELS[idx]}
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
              {weekDays.map((_, dayIdx) => (
                <View
                  key={dayIdx}
                  style={[
                    styles.dayCell,
                    { borderTopColor: palette.border },
                    dayIdx < 6 && { borderRightColor: palette.border, borderRightWidth: 1 },
                  ]}
                />
              ))}
            </View>
          ))}

          {weekEvents.map((ev) => {
            const start = new Date(ev.startAt);
            const dayIdx = start.getDay();
            const startMins = start.getHours() * 60 + start.getMinutes();
            const durationMins = Math.max(15, (ev.endAt - ev.startAt) / 60000);
            const top = (startMins / 60) * hourHeight;
            const height = (durationMins / 60) * hourHeight;
            const left = 60 + dayIdx * dayWidth;

            return (
              <TouchableOpacity
                key={ev.id}
                onPress={() => onEventPress?.(ev)}
                style={[
                  styles.eventBlock,
                  {
                    top,
                    left,
                    width: dayWidth - 4,
                    height: Math.max(height, 16),
                    backgroundColor: ev.active ? palette.tint : `rgba(217, 93, 57, 0.6)`,
                  },
                ]}
              >
                {height > 24 && (
                  <Text style={styles.eventTitle} numberOfLines={1}>
                    {ev.title.substring(0, 6)}
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
  hourLabelCol: { width: 60, alignItems: 'center' },
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
  content: { paddingBottom: 100 },
  grid: { flex: 1 },
  hourRow: { flexDirection: 'row', alignItems: 'flex-start' },
  hourLabel: { fontSize: 10, fontWeight: '600', marginTop: -6 },
  dayCell: { flex: 1, borderTopWidth: 1 },
  eventBlock: {
    position: 'absolute',
    borderRadius: 4,
    padding: 2,
    overflow: 'hidden',
  },
  eventTitle: { fontSize: 8, fontWeight: '700', color: '#fff' },
});
