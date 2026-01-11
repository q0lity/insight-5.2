/**
 * Calendar Screen
 *
 * Multi-view calendar with:
 * - Day/Week/Month views
 * - Event blocks with time positioning
 * - Color intensity based on activity
 * - Active session indicator
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/src/state/theme';
import { InsightIcon } from '@/src/components/InsightIcon';
import { triggerSelection } from '@/src/utils/haptics';

type CalendarView = 'day' | 'week' | 'month';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export default function CalendarScreen() {
  const { palette, sizes } = useTheme();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();

  const handleViewChange = (newView: CalendarView) => {
    triggerSelection();
    setView(newView);
  };

  const handlePrevMonth = () => {
    triggerSelection();
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    triggerSelection();
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Generate calendar grid
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text
          style={[styles.headerTitle, { color: palette.text, fontSize: sizes.headerTitle }]}
          accessibilityRole="header"
        >
          Calendar
        </Text>
      </View>

      {/* View Selector */}
      <View style={[styles.viewSelector, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        {(['day', 'week', 'month'] as CalendarView[]).map((v) => (
          <Pressable
            key={v}
            onPress={() => handleViewChange(v)}
            style={[
              styles.viewButton,
              view === v && { backgroundColor: palette.tintLight },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: view === v }}
            accessibilityLabel={`${v} view`}
          >
            <Text
              style={[
                styles.viewButtonText,
                { color: view === v ? palette.tint : palette.textSecondary, fontSize: sizes.smallText },
              ]}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Month Navigation */}
      <View style={styles.monthNav}>
        <Pressable
          onPress={handlePrevMonth}
          style={styles.navButton}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
        >
          <InsightIcon name="chevronLeft" size={24} color={palette.text} />
        </Pressable>
        <Text
          style={[styles.monthTitle, { color: palette.text, fontSize: sizes.sectionTitle }]}
          accessibilityRole="header"
        >
          {MONTHS[month]} {year}
        </Text>
        <Pressable
          onPress={handleNextMonth}
          style={styles.navButton}
          accessibilityRole="button"
          accessibilityLabel="Next month"
        >
          <InsightIcon name="chevronRight" size={24} color={palette.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Day Headers */}
        <View style={styles.weekRow}>
          {DAYS.map((day) => (
            <View key={day} style={styles.dayHeader}>
              <Text style={[styles.dayHeaderText, { color: palette.textSecondary, fontSize: sizes.tinyText }]}>
                {day}
              </Text>
            </View>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {calendarDays.map((day, index) => {
            const isToday =
              day !== null &&
              day === today.getDate() &&
              month === today.getMonth() &&
              year === today.getFullYear();

            return (
              <Pressable
                key={index}
                style={[
                  styles.dayCell,
                  { borderColor: palette.borderLight },
                  isToday && { borderColor: palette.tint },
                ]}
                accessibilityRole="button"
                accessibilityLabel={day ? `${MONTHS[month]} ${day}${isToday ? ', today' : ''}` : undefined}
                disabled={!day}
              >
                {day && (
                  <Text
                    style={[
                      styles.dayText,
                      { color: palette.text, fontSize: sizes.smallText },
                      isToday && { color: palette.tint, fontWeight: '700' },
                    ]}
                  >
                    {day}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Empty State */}
        <View
          style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
          accessibilityLabel="No events for this period"
        >
          <InsightIcon name="calendar" size={32} color={palette.textSecondary} />
          <Text style={[styles.emptyText, { color: palette.textSecondary, fontSize: sizes.smallText }]}>
            No events for this period
          </Text>
        </View>

        {/* Bottom padding for tab bar */}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  viewSelector: {
    flexDirection: 'row',
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  viewButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  viewButtonText: {
    fontWeight: '600',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  navButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
  },
  dayHeaderText: {
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 4,
  },
  dayText: {
    fontWeight: '500',
  },
  emptyCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    marginTop: 24,
  },
  emptyText: {
    fontWeight: '500',
  },
});
