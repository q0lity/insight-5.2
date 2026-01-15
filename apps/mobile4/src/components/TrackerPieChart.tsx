import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';

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

type TrackerPieChartProps = {
  logs: TrackerLogEntry[];
  size?: number;
  compact?: boolean;
};

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M', x, y,
    'L', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    'Z',
  ].join(' ');
}

export function TrackerPieChart({ logs, size = 120, compact = false }: TrackerPieChartProps) {
  const { palette, isDark } = useTheme();

  // Count logs by category
  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;

    logs.forEach((log) => {
      const cat = categorizeTracker(log.trackerKey);
      counts[cat] = (counts[cat] ?? 0) + 1;
      total += 1;
    });

    // Convert to array with percentages
    const entries = Object.entries(counts)
      .map(([category, count]) => ({
        category,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
        color: CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other,
        label: CATEGORY_LABELS[category] ?? category,
      }))
      .sort((a, b) => b.count - a.count);

    return { entries, total };
  }, [logs]);

  if (categoryStats.total === 0) {
    return (
      <View style={[styles.container, { width: size }]}>
        <View style={[styles.emptyCircle, { width: size, height: size, borderColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(28,28,30,0.1)' }]}>
          <Text style={[styles.emptyText, { color: palette.textSecondary }]}>No data</Text>
        </View>
      </View>
    );
  }

  // Build pie slices
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 4;

  let currentAngle = 0;
  const slices = categoryStats.entries.map((entry) => {
    const startAngle = currentAngle;
    const sliceAngle = (entry.percentage / 100) * 360;
    currentAngle += sliceAngle;
    return {
      ...entry,
      startAngle,
      endAngle: startAngle + sliceAngle,
      path: describeArc(centerX, centerY, radius, startAngle, startAngle + Math.max(sliceAngle - 1, 0.5)),
    };
  });

  const legendEntries = compact ? categoryStats.entries.slice(0, 3) : categoryStats.entries.slice(0, 4);

  return (
    <View style={styles.container}>
      <View style={[styles.chartRow, compact && { gap: 12 }]}>
        <Svg width={size} height={size}>
          <G>
            {slices.map((slice, idx) => (
              <Path
                key={idx}
                d={slice.path}
                fill={slice.color}
                stroke={isDark ? '#141a2a' : '#FFFFFF'}
                strokeWidth={2}
              />
            ))}
          </G>
        </Svg>

        {/* Legend */}
        <View style={styles.legendContainer}>
          {legendEntries.map((entry) => (
            <View key={entry.category} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: entry.color, width: compact ? 8 : 10, height: compact ? 8 : 10 }]} />
              <View style={styles.legendTextCol}>
                <Text style={[styles.legendLabel, { color: palette.text, fontSize: compact ? 11 : 13 }]} numberOfLines={1}>
                  {entry.label}
                </Text>
                <Text style={[styles.legendValue, { color: palette.textSecondary, fontSize: compact ? 10 : 11 }]}>
                  {entry.count} ({Math.round(entry.percentage)}%)
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Total count */}
      <View style={styles.totalRow}>
        <Text style={[styles.totalLabel, { color: palette.textSecondary, fontSize: compact ? 10 : 12 }]}>Total Logs</Text>
        <Text style={[styles.totalValue, { color: palette.text, fontSize: compact ? 16 : 18 }]}>{categoryStats.total}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  emptyCircle: {
    borderWidth: 3,
    borderRadius: 999,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  legendContainer: {
    flex: 1,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendTextCol: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  legendValue: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.12)',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Figtree',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
});
