import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';

import { useTheme } from '@/src/state/theme';
import { ROUTINE_COLORS } from '@/src/constants/design-tokens';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_WIDTH = SCREEN_WIDTH / 7;
const WEEK_WIDTH = SCREEN_WIDTH;

type CalendarStripProps = {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  activityData?: Record<string, { count: number; colors: string[] }>;
};

type DayItemProps = {
  date: Date;
  isSelected: boolean;
  isToday: boolean;
  activityDots: string[];
  onPress: () => void;
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeekDates(centerDate: Date): Date[] {
  const dates: Date[] = [];
  const center = new Date(centerDate);
  center.setHours(0, 0, 0, 0);

  // Get the start of the week (3 days before center)
  for (let i = -3; i <= 3; i++) {
    const d = new Date(center);
    d.setDate(center.getDate() + i);
    dates.push(d);
  }

  return dates;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

// Animated dot component with staggered fade-in
function ActivityDot({ color, index }: { color: string; index: number }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(index * 50, withTiming(1, { duration: 200 }));
  }, [index, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.activityDot, { backgroundColor: color }, animatedStyle]} />;
}

function DayItem({ date, isSelected, isToday, activityDots, onPress }: DayItemProps) {
  const { palette, sizes } = useTheme();

  const dayName = DAY_NAMES[date.getDay()];
  const dayNumber = date.getDate();

  return (
    <Pressable onPress={onPress} style={styles.dayContainer}>
      {/* Day name */}
      <Text
        style={[
          styles.dayName,
          {
            color: isSelected ? palette.tint : palette.textSecondary,
            fontSize: sizes.tinyText,
          },
        ]}
      >
        {dayName}
      </Text>

      {/* Day number with circle indicators */}
      <View style={styles.dayNumberWrapper}>
        {/* Today ring (outline) */}
        {isToday && !isSelected && (
          <View
            style={[
              styles.todayRing,
              {
                borderColor: palette.tint,
                width: sizes.buttonHeightSmall,
                height: sizes.buttonHeightSmall,
                borderRadius: sizes.buttonHeightSmall / 2,
              },
            ]}
          />
        )}

        {/* Selected background (filled) */}
        {isSelected && (
          <View
            style={[
              styles.selectedBackground,
              {
                backgroundColor: palette.tint,
                width: sizes.buttonHeightSmall,
                height: sizes.buttonHeightSmall,
                borderRadius: sizes.buttonHeightSmall / 2,
              },
            ]}
          />
        )}

        <Text
          style={[
            styles.dayNumber,
            {
              color: isSelected ? '#FFFFFF' : isToday ? palette.tint : palette.text,
              fontSize: sizes.bodyText,
            },
          ]}
        >
          {dayNumber}
        </Text>
      </View>

      {/* Activity dots (up to 4) */}
      <View style={styles.dotsRow}>
        {activityDots.slice(0, 4).map((color, idx) => (
          <ActivityDot key={`${formatDateKey(date)}-dot-${idx}`} color={color} index={idx} />
        ))}
      </View>
    </Pressable>
  );
}

export function CalendarStrip({ selectedDate, onDateSelect, activityData = {} }: CalendarStripProps) {
  const { palette, sizes } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Generate 3 weeks of dates (previous, current, next)
  const allWeeks = useMemo(() => {
    const weeks: Date[][] = [];
    const centerWeek = getWeekDates(selectedDate);

    // Previous week
    const prevWeekCenter = new Date(selectedDate);
    prevWeekCenter.setDate(prevWeekCenter.getDate() - 7);
    weeks.push(getWeekDates(prevWeekCenter));

    // Current week
    weeks.push(centerWeek);

    // Next week
    const nextWeekCenter = new Date(selectedDate);
    nextWeekCenter.setDate(nextWeekCenter.getDate() + 7);
    weeks.push(getWeekDates(nextWeekCenter));

    return weeks;
  }, [selectedDate]);

  // Get activity dots for a date
  const getActivityDots = useCallback(
    (date: Date): string[] => {
      const key = formatDateKey(date);
      const data = activityData[key];
      if (!data) return [];

      // Return colors array, or generate default colors based on count
      if (data.colors && data.colors.length > 0) {
        return data.colors;
      }

      // Default colors based on count
      const defaultColors = Object.values(ROUTINE_COLORS);
      const dots: string[] = [];
      for (let i = 0; i < Math.min(data.count, 4); i++) {
        dots.push(defaultColors[i % defaultColors.length]);
      }
      return dots;
    },
    [activityData]
  );

  // Handle date selection
  const handleDateSelect = useCallback(
    (date: Date) => {
      onDateSelect(date);
    },
    [onDateSelect]
  );

  // Handle swipe to change weeks
  const handleScrollEnd = useCallback(
    (event: any) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const weekIndex = Math.round(offsetX / WEEK_WIDTH);

      if (weekIndex === 0) {
        // Swiped to previous week
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() - 7);
        onDateSelect(newDate);
      } else if (weekIndex === 2) {
        // Swiped to next week
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + 7);
        onDateSelect(newDate);
      }

      // Reset scroll to center
      scrollViewRef.current?.scrollTo({ x: WEEK_WIDTH, animated: false });
    },
    [selectedDate, onDateSelect]
  );

  // Scroll to center on mount
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ x: WEEK_WIDTH, animated: false });
    }, 0);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
      >
        {allWeeks.map((week, weekIdx) => (
          <View key={`week-${weekIdx}`} style={[styles.weekRow, { width: WEEK_WIDTH }]}>
            {week.map((date) => (
              <DayItem
                key={formatDateKey(date)}
                date={date}
                isSelected={isSameDay(date, selectedDate)}
                isToday={isSameDay(date, today)}
                activityDots={getActivityDots(date)}
                onPress={() => handleDateSelect(date)}
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  scrollContent: {
    flexDirection: 'row',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  dayContainer: {
    width: DAY_WIDTH,
    alignItems: 'center',
    paddingVertical: 4,
    gap: 4,
  },
  dayName: {
    fontWeight: '600',
    fontFamily: 'Figtree',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayNumberWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
  },
  todayRing: {
    position: 'absolute',
    borderWidth: 2,
  },
  selectedBackground: {
    position: 'absolute',
  },
  dayNumber: {
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: 8,
    minHeight: 8,
  },
  activityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
