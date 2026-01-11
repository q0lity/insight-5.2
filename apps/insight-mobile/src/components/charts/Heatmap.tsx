import React, { useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { useTheme } from '@/src/state/theme';

export type HeatmapProps = {
  /** Array of values, one per day (most recent last) */
  values: number[];
  /** Start date for the heatmap */
  startDate?: Date;
  /** Number of days to display (defaults to values.length) */
  days?: number;
  /** Show day/month labels */
  showLabels?: boolean;
  /** Maximum value for color scaling (auto-calculated if not provided) */
  maxValue?: number;
  /** Positive color (green tones) */
  positiveColor?: string;
  /** Negative color (red tones) for negative values */
  negativeColor?: string;
  /** Label for the heatmap */
  label?: string;
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function Heatmap({
  values,
  startDate,
  days,
  showLabels = false,
  maxValue,
  positiveColor = '#34D399',
  negativeColor = '#F87171',
  label,
}: HeatmapProps) {
  const { palette, isDark } = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  const totalDays = days ?? values.length;
  const start = startDate ? startOfDay(startDate) : (() => {
    const d = new Date();
    d.setDate(d.getDate() - (totalDays - 1));
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  const startDow = (start.getDay() + 6) % 7; // Monday = 0
  const weeks = Math.ceil((startDow + totalDays) / 7);

  const maxAbs = maxValue ?? Math.max(1, ...values.map((v) => Math.abs(v)));

  // Calculate cell size based on available width
  const labelWidth = showLabels ? 32 : 0;
  const padding = 32;
  const availableWidth = screenWidth - padding - labelWidth;
  const gap = 3;
  const cellSize = Math.max(6, Math.min(14, Math.floor((availableWidth - (weeks - 1) * gap) / weeks)));

  const svgWidth = weeks * cellSize + (weeks - 1) * gap;
  const svgHeight = 7 * cellSize + 6 * gap;

  const colorFor = (value: number): string => {
    if (value === 0) return isDark ? 'rgba(148,163,184,0.15)' : '#F2F0ED';

    const t = Math.max(0, Math.min(1, Math.abs(value) / maxAbs));
    const base = value > 0 ? positiveColor : negativeColor;

    // Parse hex color for opacity adjustment
    const hex = base.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);

    const opacity = t < 0.3 ? 0.3 : t < 0.7 ? 0.6 : 1;
    return `rgba(${r},${g},${b},${opacity})`;
  };

  // Generate month labels
  const monthLabels = useMemo(() => {
    const labels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    const dayMs = 24 * 60 * 60 * 1000;

    for (let w = 0; w < weeks; w++) {
      const idx = w * 7 - startDow;
      if (idx < 0 || idx >= totalDays) continue;

      const d = new Date(start.getTime() + idx * dayMs);
      const m = d.getMonth();
      if (m !== lastMonth) {
        labels.push({ label: MONTH_LABELS[m], weekIndex: w });
        lastMonth = m;
      }
    }
    return labels;
  }, [start, startDow, totalDays, weeks]);

  // Build cells
  const cells = useMemo(() => {
    const result: { x: number; y: number; color: string; key: string }[] = [];

    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const cellIdx = w * 7 + d;
        const dataIdx = cellIdx - startDow;

        if (dataIdx < 0 || dataIdx >= totalDays) continue;

        const value = values[dataIdx] ?? 0;
        result.push({
          x: w * (cellSize + gap),
          y: d * (cellSize + gap),
          color: colorFor(value),
          key: `${w}-${d}`,
        });
      }
    }
    return result;
  }, [weeks, startDow, totalDays, values, cellSize, gap, colorFor]);

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.headerRow}>
          <Text style={[styles.label, { color: palette.textSecondary }]}>{label}</Text>
          <View style={styles.legendRow}>
            {[0.1, 0.5, 1].map((v, i) => (
              <View
                key={i}
                style={[styles.legendCell, { backgroundColor: colorFor(v * maxAbs) }]}
              />
            ))}
          </View>
        </View>
      )}

      {showLabels && monthLabels.length > 0 && (
        <View style={[styles.monthRow, { paddingLeft: labelWidth }]}>
          {monthLabels.map((item, idx) => (
            <Text
              key={idx}
              style={[
                styles.monthLabel,
                { color: palette.textSecondary, left: item.weekIndex * (cellSize + gap) },
              ]}
            >
              {item.label}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.gridRow}>
        {showLabels && (
          <View style={[styles.dayLabels, { width: labelWidth }]}>
            {DAY_LABELS.map((d, i) => (
              <View key={d} style={{ height: cellSize + gap, justifyContent: 'center' }}>
                {(i === 0 || i === 3 || i === 6) && (
                  <Text style={[styles.dayLabel, { color: palette.textSecondary }]}>{d}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        <Svg width={svgWidth} height={svgHeight}>
          {cells.map((cell) => (
            <Rect
              key={cell.key}
              x={cell.x}
              y={cell.y}
              width={cellSize}
              height={cellSize}
              rx={cellSize > 10 ? 3 : 2}
              fill={cell.color}
            />
          ))}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 3,
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  monthRow: {
    position: 'relative',
    height: 14,
  },
  monthLabel: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gridRow: {
    flexDirection: 'row',
  },
  dayLabels: {
    marginRight: 4,
  },
  dayLabel: {
    fontSize: 9,
    fontWeight: '600',
  },
});
