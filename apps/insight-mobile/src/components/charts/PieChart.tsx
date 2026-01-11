import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { useTheme } from '@/src/state/theme';

export type PieSlice = {
  value: number;
  label: string;
  color?: string;
};

export type PieChartProps = {
  /** Array of pie slices */
  data: PieSlice[];
  /** Size of the pie chart */
  size?: number;
  /** Show legend */
  showLegend?: boolean;
  /** Show percentages in legend */
  showPercentages?: boolean;
  /** Maximum legend items to show */
  maxLegendItems?: number;
  /** Custom colors (cycles through if not enough) */
  colors?: string[];
  /** Label for empty state */
  emptyMessage?: string;
};

const DEFAULT_COLORS = [
  '#8B7EC8', // Lavender
  '#7BAF7B', // Sage
  '#D4A574', // Caramel
  '#6B8CAE', // Steel
  '#C97B7B', // Rose
  '#94A3B8', // Slate
];

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number
) {
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

export function PieChart({
  data,
  size = 120,
  showLegend = true,
  showPercentages = true,
  maxLegendItems = 4,
  colors = DEFAULT_COLORS,
  emptyMessage = 'No data',
}: PieChartProps) {
  const { palette, isDark } = useTheme();

  const { slices, total } = useMemo(() => {
    const total = data.reduce((sum, d) => sum + d.value, 0);

    if (total === 0) {
      return { slices: [], total: 0 };
    }

    let currentAngle = 0;
    const slices = data
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .map((item, index) => {
        const percentage = (item.value / total) * 100;
        const sliceAngle = (percentage / 100) * 360;
        const startAngle = currentAngle;
        currentAngle += sliceAngle;

        const color = item.color ?? colors[index % colors.length];

        return {
          ...item,
          percentage,
          startAngle,
          endAngle: startAngle + sliceAngle,
          color,
          path: describeArc(
            size / 2,
            size / 2,
            size / 2 - 4,
            startAngle,
            startAngle + Math.max(sliceAngle - 1, 0.5)
          ),
        };
      });

    return { slices, total };
  }, [data, size, colors]);

  if (total === 0) {
    return (
      <View style={styles.container}>
        <View
          style={[
            styles.emptyCircle,
            {
              width: size,
              height: size,
              borderColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(28,28,30,0.1)',
            },
          ]}
        >
          <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
            {emptyMessage}
          </Text>
        </View>
      </View>
    );
  }

  const strokeColor = isDark ? '#1C1C1E' : '#FFFFFF';

  return (
    <View style={styles.container}>
      <View style={styles.chartRow}>
        <Svg width={size} height={size}>
          <G>
            {slices.map((slice, idx) => (
              <Path
                key={idx}
                d={slice.path}
                fill={slice.color}
                stroke={strokeColor}
                strokeWidth={2}
              />
            ))}
          </G>
        </Svg>

        {showLegend && (
          <View style={styles.legendContainer}>
            {slices.slice(0, maxLegendItems).map((slice, idx) => (
              <View key={idx} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
                <View style={styles.legendTextCol}>
                  <Text
                    style={[styles.legendLabel, { color: palette.text }]}
                    numberOfLines={1}
                  >
                    {slice.label}
                  </Text>
                  {showPercentages && (
                    <Text style={[styles.legendValue, { color: palette.textSecondary }]}>
                      {Math.round(slice.percentage)}%
                    </Text>
                  )}
                </View>
              </View>
            ))}
            {slices.length > maxLegendItems && (
              <Text style={[styles.moreText, { color: palette.textSecondary }]}>
                +{slices.length - maxLegendItems} more
              </Text>
            )}
          </View>
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendLabel: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree',
    flex: 1,
  },
  legendValue: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Figtree',
    marginLeft: 8,
  },
  moreText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Figtree',
    fontStyle: 'italic',
  },
});
