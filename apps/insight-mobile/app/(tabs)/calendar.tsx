import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { useTheme } from '@/src/state/theme';
import { listEvents, type CalendarEvent } from '@/src/storage/events';
import { DayView } from '@/src/components/calendar/DayView';
import { WeekView } from '@/src/components/calendar/WeekView';
import { MonthView } from '@/src/components/calendar/MonthView';

type ViewMode = 'Day' | 'Week' | 'Month';

const VIEW_MODES: ViewMode[] = ['Day', 'Week', 'Month'];

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
  const { palette } = useTheme();
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

  const navigatePrev = () => {
    if (viewMode === 'Day') {
      setCurrentDate(addDays(currentDate, -1));
    } else if (viewMode === 'Week') {
      setCurrentDate(addDays(currentDate, -7));
    } else {
      setCurrentDate(addMonths(currentDate, -1));
    }
  };

  const navigateNext = () => {
    if (viewMode === 'Day') {
      setCurrentDate(addDays(currentDate, 1));
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
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Calendar</Text>
          <Text style={[styles.headerSubtitle, { color: palette.textSecondary }]}>
            {formatDateLabel(currentDate, viewMode)}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.agendaButton, { backgroundColor: palette.tintLight }]}
            onPress={() => router.push('/agenda')}
          >
            <Text style={{ color: palette.tint, fontSize: 12, fontWeight: '700' }}>Agenda</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.navRow}>
        <View style={styles.navButtons}>
          <TouchableOpacity
            style={[styles.navButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
            onPress={navigatePrev}
          >
            <Text style={{ color: palette.text }}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.todayButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
            onPress={goToToday}
          >
            <Text style={{ color: palette.text, fontSize: 12 }}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
            onPress={navigateNext}
          >
            <Text style={{ color: palette.text }}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.viewModeRow, { paddingHorizontal: 16 }]}>
        <View style={[styles.segmentRow, { backgroundColor: palette.borderLight }]}>
          {VIEW_MODES.map((mode) => (
            <TouchableOpacity
              key={mode}
              onPress={() => setViewMode(mode)}
              style={[
                styles.segment,
                mode === viewMode && { backgroundColor: palette.surface },
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: mode === viewMode ? palette.text : palette.textSecondary },
                ]}
              >
                {mode}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.viewContainer}>
        {viewMode === 'Day' && (
          <DayView date={currentDate} events={events} onEventPress={handleEventPress} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: { gap: 4 },
  headerTitle: { fontSize: 24, fontWeight: '900' },
  headerSubtitle: { fontSize: 13, fontWeight: '600' },
  headerActions: { flexDirection: 'row', gap: 8 },
  agendaButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  navButtons: { flexDirection: 'row', gap: 8 },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayButton: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewModeRow: { marginBottom: 12 },
  segmentRow: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  viewContainer: { flex: 1 },
});
