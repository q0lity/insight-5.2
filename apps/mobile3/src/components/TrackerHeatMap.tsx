import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
  mood: '#8B7EC8',     // Lavender
  energy: '#7BAF7B',   // Sage
  pain: '#C97B7B',     // Rose/Red
  stress: '#D4A574',   // Caramel
  other: '#6B8CAE',    // Steel
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

  if (activeCategories.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: palette.tabIconDefault }]}>
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
            <Text style={[styles.dayLabel, { color: palette.tabIconDefault }]}>
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

              return (
                <View key={idx} style={styles.cellWrapper}>
                  <View style={[styles.cell, { backgroundColor: color }]}>
                    {avg > 0 && (
                      <Text style={[styles.cellValue, { color: avg > maxValue * 0.5 ? '#FFFFFF' : palette.tabIconDefault }]}>
                        {Math.round(avg)}
                      </Text>
                    )}
                  </View>
                </View>
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
            <Text style={[styles.legendText, { color: palette.tabIconDefault }]}>
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
    gap: 8,
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Figtree',
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryLabelCol: {
    width: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dayLabelCell: {
    flex: 1,
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Figtree',
    textTransform: 'uppercase',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryLabel: {
    fontSize: 12,
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
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellValue: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
});
