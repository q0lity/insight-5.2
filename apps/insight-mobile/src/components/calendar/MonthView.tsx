import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from '@/components/Themed';
import { useTheme } from '@/src/state/theme';
import type { CalendarEvent } from '@/src/storage/events';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getMonthDays(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - firstDay.getDay());

  const endDate = new Date(lastDay);
  endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()));

  const days: Date[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return { days, month };
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

type Props = {
  date: Date;
  events: CalendarEvent[];
  onDayPress?: (date: Date) => void;
  onEventPress?: (event: CalendarEvent) => void;
};

export function MonthView({ date, events, onDayPress, onEventPress }: Props) {
  const { palette, isDark } = useTheme();
  const today = new Date();
  const { days: monthDays, month: currentMonth } = getMonthDays(date);

  const eventsByDay = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      const dateKey = new Date(ev.startAt).toDateString();
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(ev);
    }
    return grouped;
  }, [events]);

  const pointsByDay = useMemo(() => {
    const points: Record<string, number> = {};
    for (const ev of events) {
      const dateKey = new Date(ev.startAt).toDateString();
      points[dateKey] = (points[dateKey] ?? 0) + (ev.points ?? 0);
    }
    return points;
  }, [events]);

  const getPointsColor = (points: number) => {
    const intensity = Math.min(1, Math.max(0.15, points / 100));
    return `rgba(217, 93, 57, ${intensity})`;
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        {DAY_LABELS.map((label) => (
          <View key={label} style={styles.dayLabelCell}>
            <Text style={[styles.dayLabel, { color: palette.textSecondary }]}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {Array.from({ length: Math.ceil(monthDays.length / 7) }).map((_, weekIdx) => (
          <View key={weekIdx} style={styles.weekRow}>
            {monthDays.slice(weekIdx * 7, weekIdx * 7 + 7).map((day, dayIdx) => {
              const dateKey = day.toDateString();
              const isToday = isSameDay(day, today);
              const isCurrentMonth = day.getMonth() === currentMonth;
              const dayEvents = eventsByDay[dateKey] ?? [];
              const dayPoints = pointsByDay[dateKey] ?? 0;
              const hasEvents = dayEvents.length > 0;
              const hasActiveEvent = dayEvents.some((ev) => ev.active);

              return (
                <TouchableOpacity
                  key={dayIdx}
                  style={[
                    styles.dayCell,
                    {
                      backgroundColor: hasEvents ? getPointsColor(dayPoints) : 'transparent',
                      borderColor: hasActiveEvent ? palette.tint : palette.border,
                      borderWidth: hasActiveEvent ? 2 : 1,
                    },
                  ]}
                  onPress={() => {
                    if (dayEvents.length === 1) {
                      onEventPress?.(dayEvents[0]);
                    } else {
                      onDayPress?.(day);
                    }
                  }}
                >
                  <View
                    style={[
                      styles.dayNumber,
                      isToday && { backgroundColor: palette.tint },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayNumberText,
                        {
                          color: isToday ? '#fff' : isCurrentMonth ? palette.text : palette.textSecondary,
                          opacity: isCurrentMonth ? 1 : 0.4,
                        },
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                  </View>
                  {hasEvents && (
                    <View style={styles.dayContent}>
                      <Text style={[styles.eventCount, { color: isDark ? '#fff' : palette.text }]}>
                        {dayEvents.length}
                      </Text>
                      {dayPoints > 0 && (
                        <Text style={[styles.pointsText, { color: isDark ? 'rgba(255,255,255,0.7)' : palette.textSecondary }]}>
                          {dayPoints.toFixed(0)}p
                        </Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 8 },
  header: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  dayLabelCell: { flex: 1, alignItems: 'center' },
  dayLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  grid: { flex: 1 },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
    borderRadius: 10,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  dayNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  dayNumberText: { fontSize: 12, fontWeight: '700' },
  dayContent: { alignItems: 'center', gap: 1 },
  eventCount: { fontSize: 13, fontWeight: '800' },
  pointsText: { fontSize: 9, fontWeight: '600' },
});
