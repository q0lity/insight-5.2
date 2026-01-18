import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay
} from 'react-native-reanimated';

import { useTheme } from '@/src/state/theme';
import type { TrackerLogEntry } from '@/src/storage/trackers';

// Tracker categories for emotional/health tracking
const TRACKER_CATEGORIES: Record<string, string[]> = {
  mood: ['mood', 'happy', 'sad', 'anxious', 'anxiety', 'depressed', 'joy', 'calm'],
  energy: ['energy', 'tired', 'fatigue', 'sleep', 'exhausted', 'alert', 'awake'],
  pain: ['pain', 'headache', 'backpain', 'soreness', 'ache', 'cramp', 'migraine'],
  stress: ['stress', 'overwhelmed', 'pressure', 'tense', 'worried', 'nervous'],
};

const CATEGORY_COLORS: Record<string, string> = {
  mood: '#A78BFA',     // Brighter Lavender/Purple
  energy: '#4ADE80',   // Brighter Sage/Green
  pain: '#F87171',     // Brighter Rose/Red
  stress: '#FBBF24',   // Brighter Amber
  other: '#60A5FA',    // Brighter Blue
};

const CATEGORY_LABELS: Record<string, string> = {
  mood: 'Mood',
  energy: 'Energy',
  pain: 'Pain',
  stress: 'Stress',
  other: 'Other',
};

function categorizeTracker(key: string): string {
  const lower = key.toLowerCase();
  for (const [cat, keywords] of Object.entries(TRACKER_CATEGORIES)) {
    if (keywords.some((k) => lower.includes(k))) return cat;
  }
  return 'other';
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDaysArray(endDate: Date, count: number): Date[] {
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const days: Date[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}

type TrackerHeatMapProps = {
  logs: TrackerLogEntry[];
  days?: number;
};

export function TrackerHeatMap({ logs, days = 7 }: TrackerHeatMapProps) {
  const { palette, sizes, isDark } = useTheme();

  const daysArray = useMemo(() => getDaysArray(new Date(), days), [days]);

  // Group logs by category and date
  const categoryData = useMemo(() => {
    const byCategory: Record<string, Record<string, { sum: number; count: number }>> = {};

    // Initialize categories
    Object.keys(TRACKER_CATEGORIES).forEach((cat) => {
      byCategory[cat] = {};
    });
    byCategory.other = {};

    logs.forEach((log) => {
      const cat = categorizeTracker(log.trackerKey);
      const dateKey = formatDateKey(new Date(log.occurredAt));

      if (!byCategory[cat][dateKey]) {
        byCategory[cat][dateKey] = { sum: 0, count: 0 };
      }

      // Use numeric value if available, otherwise use 5 as default for boolean true
      const value = log.valueNumber ?? (log.valueBool ? 5 : 0);
      byCategory[cat][dateKey].sum += value;
      byCategory[cat][dateKey].count += 1;
    });

    return byCategory;
  }, [logs]);

  // Find categories with data
  const activeCategories = useMemo(() => {
    return Object.entries(categoryData)
      .filter(([_, dates]) => Object.keys(dates).length > 0)
      .map(([cat]) => cat);
  }, [categoryData]);

  const getColorForValue = (category: string, value: number, maxValue: number) => {
    const baseColor = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other;

    if (value === 0 || !maxValue) {
      return isDark ? 'rgba(148,163,184,0.08)' : 'rgba(28,28,30,0.04)';
    }

    const intensity = Math.min(1, value / maxValue);

    // Parse hex color
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);

    // Return with variable opacity based on intensity
    const minOpacity = isDark ? 0.25 : 0.2;
    const maxOpacity = isDark ? 0.9 : 0.85;
    const opacity = minOpacity + intensity * (maxOpacity - minOpacity);

    return `rgba(${r},${g},${b},${opacity})`;
  };

  // Animated cell component with touch feedback
  const AnimatedCell = ({
    index,
    color,
    value,
    baseColor,
    maxValue,
    dateLabel
  }: {
    index: number;
    color: string;
    value: number;
    baseColor: string;
    maxValue: number;
    dateLabel: string;
  }) => {
    const scale = useSharedValue(1);
    const [showTooltip, setShowTooltip] = useState(false);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
      scale.value = withTiming(1.1, { duration: 100 });
      setShowTooltip(true);
    };

    const handlePressOut = () => {
      scale.value = withTiming(1, { duration: 100 });
      setShowTooltip(false);
    };

    const hasShadow = value > 0;

    return (
      <View style={styles.cellWrapper}>
        <Animated.View
          entering={FadeIn.delay(index * 50).duration(300)}
          style={animatedStyle}
        >
          <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          >
            <View
              style={[
                styles.cell,
                { backgroundColor: color },
                hasShadow && {
                  shadowColor: baseColor,
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 2 },
                }
              ]}
            >
              {value > 0 && (
                <Text style={[styles.cellValue, { color: value > maxValue * 0.5 ? '#FFFFFF' : palette.textSecondary }]}>
                  {Math.round(value)}
                </Text>
              )}
            </View>
          </Pressable>
        </Animated.View>
        {showTooltip && value > 0 && (
          <View style={[styles.tooltip, { backgroundColor: palette.surface }]}>
            <Text style={[styles.tooltipText, { color: palette.text }]}>
              {dateLabel}: {Math.round(value)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (activeCategories.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
          No tracker data to visualize. Try logging #mood(7) or #energy(5).
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Day labels header */}
      <View style={styles.headerRow}>
        <View style={styles.categoryLabelCol} />
        {daysArray.map((date, idx) => (
          <View key={idx} style={styles.dayLabelCell}>
            <Text style={[styles.dayLabel, { color: palette.textSecondary }]}>
              {date.toLocaleDateString([], { weekday: 'narrow' })}
            </Text>
          </View>
        ))}
      </View>

      {/* Heatmap rows by category */}
      {activeCategories.map((category) => {
        const dates = categoryData[category];

        // Calculate max value for this category
        let maxValue = 1;
        Object.values(dates).forEach(({ sum, count }) => {
          const avg = count > 0 ? sum / count : 0;
          if (avg > maxValue) maxValue = avg;
        });

        return (
          <View key={category} style={styles.categoryRow}>
            <View style={styles.categoryLabelCol}>
              <View style={[styles.categoryDot, { backgroundColor: CATEGORY_COLORS[category] }]} />
              <Text style={[styles.categoryLabel, { color: palette.text }]} numberOfLines={1}>
                {CATEGORY_LABELS[category]}
              </Text>
            </View>
            {daysArray.map((date, idx) => {
              const dateKey = formatDateKey(date);
              const data = dates[dateKey];
              const avg = data ? data.sum / data.count : 0;
              const color = getColorForValue(category, avg, maxValue);
              const baseColor = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other;
              const dateLabel = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

              return (
                <AnimatedCell
                  key={idx}
                  index={idx}
                  color={color}
                  value={avg}
                  baseColor={baseColor}
                  maxValue={maxValue}
                  dateLabel={dateLabel}
                />
              );
            })}
          </View>
        );
      })}

      {/* Legend */}
      <View style={styles.legendRow}>
        {activeCategories.map((category) => (
          <View key={category} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: CATEGORY_COLORS[category] }]} />
            <Text style={[styles.legendText, { color: palette.textSecondary }]}>
              {CATEGORY_LABELS[category]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  emptyContainer: {
    padding: 11,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 9,
    fontWeight: '600',
    fontFamily: 'Figtree',
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryLabelCol: {
    width: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dayLabelCell: {
    flex: 1,
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 8,
    fontWeight: '700',
    fontFamily: 'Figtree',
    textTransform: 'uppercase',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryLabel: {
    fontSize: 8,
    fontWeight: '700',
    fontFamily: 'Figtree',
    flex: 1,
  },
  cellWrapper: {
    flex: 1,
    padding: 2,
  },
  cell: {
    aspectRatio: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellValue: {
    fontSize: 8,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 8,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  tooltip: {
    position: 'absolute',
    top: -28,
    left: '50%',
    transform: [{ translateX: -40 }],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    zIndex: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  tooltipText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
});
