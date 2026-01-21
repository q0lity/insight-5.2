import React, { useMemo, useCallback } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  FadeIn,
  FadeInDown,
  Layout,
} from 'react-native-reanimated';

import { Text } from '@/components/Themed';
import { useTheme } from '@/src/state/theme';
import type { CalendarEvent } from '@/src/storage/events';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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

type DayCellProps = {
  day: Date;
  isToday: boolean;
  isCurrentMonth: boolean;
  isSelected?: boolean;
  dayEvents: CalendarEvent[];
  dayPoints: number;
  hasActiveEvent: boolean;
  onPress: () => void;
  index: number;
};

function DayCell({
  day,
  isToday,
  isCurrentMonth,
  isSelected,
  dayEvents,
  dayPoints,
  hasActiveEvent,
  onPress,
  index,
}: DayCellProps) {
  const { palette, isDark } = useTheme();
  const scale = useSharedValue(1);
  const hasEvents = dayEvents.length > 0;

  const getPointsColor = (points: number) => {
    const intensity = Math.min(1, Math.max(0.15, points / 100));
    return `rgba(217, 93, 57, ${intensity})`;
  };

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const backgroundColor = hasEvents
    ? getPointsColor(dayPoints)
    : isSelected
    ? `${palette.tint}20`
    : 'transparent';

  const borderColor = hasActiveEvent
    ? palette.tint
    : isSelected
    ? palette.tint
    : palette.border;

  const borderWidth = hasActiveEvent || isSelected ? 2 : 1;

  return (
    <AnimatedPressable
      entering={FadeInDown.delay(index * 15).duration(200).springify()}
      layout={Layout.springify()}
      style={[
        styles.dayCell,
        {
          backgroundColor,
          borderColor,
          borderWidth,
        },
        animatedStyle,
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.dayNumber,
          isToday && { backgroundColor: palette.tint },
          isSelected && !isToday && { backgroundColor: `${palette.tint}30` },
        ]}
      >
        <Text
          style={[
            styles.dayNumberText,
            {
              color: isToday
                ? '#fff'
                : isCurrentMonth
                ? palette.text
                : palette.textSecondary,
              opacity: isCurrentMonth ? 1 : 0.4,
              fontWeight: isToday || isSelected ? '800' : '700',
            },
          ]}
        >
          {day.getDate()}
        </Text>
      </Animated.View>
      {hasEvents && (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={styles.dayContent}
        >
          <Text
            style={[
              styles.eventCount,
              { color: isDark ? '#fff' : palette.text },
            ]}
          >
            {dayEvents.length}
          </Text>
          {dayPoints > 0 && (
            <Text
              style={[
                styles.pointsText,
                {
                  color: isDark ? 'rgba(255,255,255,0.7)' : palette.textSecondary,
                },
              ]}
            >
              {dayPoints.toFixed(0)}p
            </Text>
          )}
        </Animated.View>
      )}
    </AnimatedPressable>
  );
}

type Props = {
  date: Date;
  events: CalendarEvent[];
  selectedDate?: Date;
  onDayPress?: (date: Date) => void;
  onEventPress?: (event: CalendarEvent) => void;
};

export function MonthView({
  date,
  events,
  selectedDate,
  onDayPress,
  onEventPress,
}: Props) {
  const { palette } = useTheme();
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

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        {DAY_LABELS.map((label, idx) => (
          <Animated.View
            key={label}
            style={styles.dayLabelCell}
            entering={FadeIn.delay(idx * 30)}
          >
            <Text style={[styles.dayLabel, { color: palette.textSecondary }]}>
              {label}
            </Text>
          </Animated.View>
        ))}
      </View>

      <View style={styles.grid}>
        {Array.from({ length: Math.ceil(monthDays.length / 7) }).map(
          (_, weekIdx) => (
            <View key={weekIdx} style={styles.weekRow}>
              {monthDays.slice(weekIdx * 7, weekIdx * 7 + 7).map((day, dayIdx) => {
                const dateKey = day.toDateString();
                const isToday = isSameDay(day, today);
                const isCurrentMonth = day.getMonth() === currentMonth;
                const isSelected = selectedDate
                  ? isSameDay(day, selectedDate)
                  : false;
                const dayEvents = eventsByDay[dateKey] ?? [];
                const dayPoints = pointsByDay[dateKey] ?? 0;
                const hasActiveEvent = dayEvents.some((ev) => ev.active);
                const index = weekIdx * 7 + dayIdx;

                return (
                  <DayCell
                    key={dayIdx}
                    day={day}
                    isToday={isToday}
                    isCurrentMonth={isCurrentMonth}
                    isSelected={isSelected}
                    dayEvents={dayEvents}
                    dayPoints={dayPoints}
                    hasActiveEvent={hasActiveEvent}
                    index={index}
                    onPress={() => {
                      if (dayEvents.length === 1) {
                        onEventPress?.(dayEvents[0]);
                      } else {
                        onDayPress?.(day);
                      }
                    }}
                  />
                );
              })}
            </View>
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 6 },
  header: {
    flexDirection: 'row',
    paddingBottom: 6,
    borderBottomWidth: 1,
    marginBottom: 6,
  },
  dayLabelCell: { flex: 1, alignItems: 'center' },
  dayLabel: { fontSize: 8, fontWeight: '700', textTransform: 'uppercase' },
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
    overflow: 'hidden',
  },
  dayNumber: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  dayNumberText: { fontSize: 9, fontWeight: '700' },
  dayContent: { alignItems: 'center', gap: 1 },
  eventCount: { fontSize: 10, fontWeight: '800' },
  pointsText: { fontSize: 8, fontWeight: '600' },
});
