import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { Screen } from '@/components/Screen';
import { LuxHeader } from '@/components/LuxHeader';
import { LuxPill } from '@/components/LuxPill';
import { useTheme } from '@/src/state/theme';
import { listEvents, type CalendarEvent } from '@/src/storage/events';
import { DayView } from '@/src/components/calendar/DayView';
import { ThreeDayView } from '@/src/components/calendar/ThreeDayView';
import { WeekView } from '@/src/components/calendar/WeekView';
import { MonthView } from '@/src/components/calendar/MonthView';
import { CalendarStrip } from '@/src/components/CalendarStrip';

type ViewMode = 'Day' | '3-Day' | 'Week' | 'Month';

function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getCategoryColor(category: string | null | undefined): string {
  if (!category) return '#6B8CAE';
  const text = category.toLowerCase();
  if (/(work|meeting|call)/.test(text)) return '#5B5F97';
  if (/(gym|workout|exercise)/.test(text)) return '#7BAF7B';
  if (/(food|dinner|lunch)/.test(text)) return '#D95D39';
  if (/(social|friend|family)/.test(text)) return '#C88B9D';
  return '#A3B87C';
}

const VIEW_MODES: ViewMode[] = ['Day', '3-Day', 'Week', 'Month'];

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function formatDateLabel(date: Date, mode: ViewMode) {
  if (mode === 'Day') {
    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  }
  if (mode === '3-Day') {
    const prevDay = addDays(date, -1);
    const nextDay = addDays(date, 1);
    const sameMonth = prevDay.getMonth() === nextDay.getMonth();
    if (sameMonth) {
      return `${prevDay.toLocaleDateString(undefined, { month: 'short' })} ${prevDay.getDate()}-${nextDay.getDate()}`;
    }
    return `${prevDay.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${nextDay.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  }
  if (mode === 'Week') {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekEnd = addDays(weekStart, 6);
    const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
    if (sameMonth) {
      return `${weekStart.toLocaleDateString(undefined, { month: 'short' })} ${weekStart.getDate()}-${weekEnd.getDate()}`;
    }
    return `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  }
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export default function CalendarScreen() {
  const router = useRouter();
  const { palette, sizes } = useTheme();
  const insets = useSafeAreaInsets();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('Day');
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    refreshEvents();
  }, []);

  const refreshEvents = () => {
    listEvents().then((rows) => setEvents(rows));
  };

  const activityData = useMemo(() => {
    const data: Record<string, { count: number; colors: string[] }> = {};
    events.forEach(event => {
      const dateKey = formatDateKey(new Date(event.startAt));
      if (!data[dateKey]) {
        data[dateKey] = { count: 0, colors: [] };
      }
      data[dateKey].count++;
      // Add category color (use a default if no category)
      const color = getCategoryColor(event.category);
      if (!data[dateKey].colors.includes(color)) {
        data[dateKey].colors.push(color);
      }
    });
    return data;
  }, [events]);

  const handleCalendarStripDateSelect = (date: Date) => {
    setCurrentDate(date);
    setViewMode('Day');
  };

  const navigatePrev = () => {
    if (viewMode === 'Day') {
      setCurrentDate(addDays(currentDate, -1));
    } else if (viewMode === '3-Day') {
      setCurrentDate(addDays(currentDate, -3));
    } else if (viewMode === 'Week') {
      setCurrentDate(addDays(currentDate, -7));
    } else {
      setCurrentDate(addMonths(currentDate, -1));
    }
  };

  const navigateNext = () => {
    if (viewMode === 'Day') {
      setCurrentDate(addDays(currentDate, 1));
    } else if (viewMode === '3-Day') {
      setCurrentDate(addDays(currentDate, 3));
    } else if (viewMode === 'Week') {
      setCurrentDate(addDays(currentDate, 7));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleEventPress = (event: CalendarEvent) => {
    router.push(`/event/${event.id}`);
  };

  const handleDayPress = (date: Date) => {
    setCurrentDate(date);
    setViewMode('Day');
  };

  return (
    <Screen style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <LuxHeader
        overline="Calendar"
        title={formatDateLabel(currentDate, viewMode)}
        subtitle={viewMode === 'Day' ? 'Daily plan' : viewMode === '3-Day' ? '3-day overview' : viewMode === 'Week' ? 'Weekly blocks' : 'Monthly view'}
        right={
          <LuxPill
            label="Agenda"
            variant="accent"
            onPress={() => router.push('/agenda')}
            accessibilityLabel="Open agenda"
          />
        }
        style={[styles.header, { paddingHorizontal: sizes.spacing * 2 }]}
      />

      <View style={styles.navRow}>
        <View style={styles.navButtons}>
          <TouchableOpacity
            style={[styles.navButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
            onPress={navigatePrev}
          >
            <Text style={{ color: palette.text }}>‹</Text>
          </TouchableOpacity>
          <LuxPill label="Today" variant="ghost" onPress={goToToday} />
          <TouchableOpacity
            style={[styles.navButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
            onPress={navigateNext}
          >
            <Text style={{ color: palette.text }}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.viewModeRow, { paddingHorizontal: sizes.spacing * 2 }]}>
        <View style={styles.segmentRow}>
          {VIEW_MODES.map((mode) => (
            <LuxPill
              key={mode}
              label={mode}
              active={mode === viewMode}
              onPress={() => setViewMode(mode)}
            />
          ))}
        </View>
      </View>

      <View style={[styles.calendarStripContainer, { paddingHorizontal: sizes.spacing * 2 }]}>
        <CalendarStrip
          selectedDate={currentDate}
          onDateSelect={handleCalendarStripDateSelect}
          activityData={activityData}
        />
      </View>

      <View style={styles.viewContainer}>
        {viewMode === 'Day' && (
          <DayView date={currentDate} events={events} onEventPress={handleEventPress} />
        )}
        {viewMode === '3-Day' && (
          <ThreeDayView
            date={currentDate}
            events={events}
            onEventPress={handleEventPress}
            onDayPress={handleDayPress}
          />
        )}
        {viewMode === 'Week' && (
          <WeekView
            date={currentDate}
            events={events}
            onEventPress={handleEventPress}
            onDayPress={handleDayPress}
          />
        )}
        {viewMode === 'Month' && (
          <MonthView
            date={currentDate}
            events={events}
            onDayPress={handleDayPress}
            onEventPress={handleEventPress}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 8,
    paddingBottom: 10,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  navButtons: { flexDirection: 'row', gap: 6 },
  navButton: {
    width: 25,
    height: 25,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewModeRow: { marginBottom: 8 },
  calendarStripContainer: { marginBottom: 12 },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  viewContainer: { flex: 1 },
});
