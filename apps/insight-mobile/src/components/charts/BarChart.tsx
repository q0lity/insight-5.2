import React, { useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { G, Line, Rect } from 'react-native-svg';

import { useTheme } from '@/src/state/theme';

export type BarData = {
  value: number;
  label?: string;
  color?: string;
};

export type BarChartProps = {
  /** Array of bar values or bar data objects */
  data: (number | BarData)[];
  /** Height of the chart */
  height?: number;
  /** Default bar color */
  color?: string;
  /** Show horizontal grid lines */
  showGrid?: boolean;
  /** Show value labels on bars */
  showValues?: boolean;
  /** Show bottom labels */
  showLabels?: boolean;
  /** Label for empty state */
  emptyMessage?: string;
};

export function BarChart({
  data,
  height = 160,
  color,
  showGrid = true,
  showValues = false,
  showLabels = false,
  emptyMessage = 'No data yet',
}: BarChartProps) {
  const { palette, isDark } = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  const width = screenWidth - 32;
  const padding = 24;
  const labelHeight = showLabels ? 20 : 0;
  const chartHeight = height - labelHeight;
  const defaultColor = color ?? palette.tint;

  const normalizedData = useMemo(() => {
    return data.map((item) => {
      if (typeof item === 'number') {
        return { value: item, label: undefined, color: defaultColor };
      }
      return { ...item, color: item.color ?? defaultColor };
    });
  }, [data, defaultColor]);

  const maxValue = useMemo(() => {
    return Math.max(1, ...normalizedData.map((d) => d.value));
  }, [normalizedData]);

  const gridColor = isDark ? 'rgba(148,163,184,0.15)' : 'rgba(0,0,0,0.08)';

  if (normalizedData.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <View style={[styles.emptyCircle, { borderColor: gridColor }]}>
          <Text style={[styles.emptyIcon, { color: palette.textSecondary }]}>?</Text>
        </View>
        <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
          {emptyMessage}
        </Text>
      </View>
    );
  }

  const barWidth = (width - padding * 2) / normalizedData.length;
  const barPadding = barWidth * 0.2;
  const actualBarWidth = barWidth * 0.6;

  return (
    <View>
      <Svg width={width} height={chartHeight}>
        {/* Grid lines */}
        {showGrid && (
          <G>
            {[0, 0.5, 1].map((t, i) => {
              const y = padding + t * (chartHeight - padding * 2);
              return (
                <Line
                  key={i}
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke={gridColor}
                  strokeWidth={1}
                />
              );
            })}
          </G>
        )}

        {/* Bars */}
        {normalizedData.map((bar, i) => {
          const barHeight = ((chartHeight - padding * 2) * bar.value) / maxValue;
          const x = padding + i * barWidth + barPadding;
          const y = chartHeight - padding - barHeight;
          const isMax = bar.value === maxValue;

          return (
            <G key={i}>
              <Rect
                x={x}
                y={y}
                width={actualBarWidth}
                height={barHeight}
                rx={6}
                fill={bar.color}
                opacity={isMax ? 1 : 0.8}
              />
              {showValues && bar.value > 0 && (
                <Text
                  x={x + actualBarWidth / 2}
                  y={y - 6}
                  fontSize={10}
                  fontWeight="700"
                  fill={palette.textSecondary}
                  textAnchor="middle"
                >
                  {bar.value}
                </Text>
              )}
            </G>
          );
        })}
      </Svg>

      {/* Labels */}
      {showLabels && (
        <View style={[styles.labelsRow, { paddingHorizontal: padding }]}>
          {normalizedData.map((bar, i) => (
            <View key={i} style={[styles.labelCell, { width: barWidth }]}>
              <Text
                style={[styles.label, { color: palette.textSecondary }]}
                numberOfLines={1}
              >
                {bar.label ?? (i + 1).toString()}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  labelCell: {
    alignItems: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
