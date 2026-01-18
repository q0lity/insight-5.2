import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PieChart as GiftedPieChart } from 'react-native-gifted-charts/dist/PieChart';

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
  /** Show as donut chart */
  donut?: boolean;
  /** Center label for donut chart */
  centerLabel?: string;
};

const DEFAULT_COLORS = [
  '#8B7EC8', // Lavender
  '#7BAF7B', // Sage
  '#D4A574', // Caramel
  '#6B8CAE', // Steel
  '#C97B7B', // Rose
  '#94A3B8', // Slate
];

export function PieChart({
  data,
  size = 120,
  showLegend = true,
  showPercentages = true,
  maxLegendItems = 4,
  colors = DEFAULT_COLORS,
  emptyMessage = 'No data',
  donut = false,
  centerLabel,
}: PieChartProps) {
  const { palette, isDark } = useTheme();

  const { chartData, total, slicesForLegend } = useMemo(() => {
    const total = data.reduce((sum, d) => sum + d.value, 0);

    if (total === 0) {
      return { chartData: [], total: 0, slicesForLegend: [] };
    }

    // Sort by value descending and filter out zero values
    const sortedData = [...data]
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);

    const chartData = sortedData.map((item, index) => {
      const percentage = (item.value / total) * 100;
      const sliceColor = item.color ?? colors[index % colors.length];

      return {
        value: item.value,
        color: sliceColor,
        text: showPercentages ? `${Math.round(percentage)}%` : '',
        // Store original data for legend
        _label: item.label,
        _percentage: percentage,
      };
    });

    return {
      chartData,
      total,
      slicesForLegend: chartData.map((d) => ({
        label: d._label,
        percentage: d._percentage,
        color: d.color,
      })),
    };
  }, [data, colors, showPercentages]);

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

  const innerRadius = donut ? size * 0.35 : 0;
  const strokeColor = isDark ? '#1C1C1E' : '#FFFFFF';

  return (
    <View style={styles.container}>
      <View style={styles.chartRow}>
        <View style={styles.pieWrapper}>
          <GiftedPieChart
            data={chartData}
            radius={size / 2 - 4}
            innerRadius={innerRadius}
            isAnimated
            animationDuration={600}
            showGradient={false}
            sectionAutoFocus={false}
            strokeColor={strokeColor}
            strokeWidth={2}
            innerCircleColor={donut ? palette.background : undefined}
            centerLabelComponent={
              donut && centerLabel
                ? () => (
                    <View style={styles.centerLabel}>
                      <Text
                        style={[
                          styles.centerLabelText,
                          { color: palette.text },
                        ]}
                        numberOfLines={2}
                      >
                        {centerLabel}
                      </Text>
                    </View>
                  )
                : undefined
            }
          />
        </View>

        {showLegend && (
          <View style={styles.legendContainer}>
            {slicesForLegend.slice(0, maxLegendItems).map((slice, idx) => (
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
            {slicesForLegend.length > maxLegendItems && (
              <Text style={[styles.moreText, { color: palette.textSecondary }]}>
                +{slicesForLegend.length - maxLegendItems} more
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
    gap: 8,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  pieWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCircle: {
    borderWidth: 3,
    borderRadius: 999,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 8,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  centerLabel: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  centerLabelText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Figtree',
    textAlign: 'center',
  },
  legendContainer: {
    flex: 1,
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendTextCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendLabel: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'Figtree',
    flex: 1,
  },
  legendValue: {
    fontSize: 8,
    fontWeight: '600',
    fontFamily: 'Figtree',
    marginLeft: 6,
  },
  moreText: {
    fontSize: 8,
    fontWeight: '600',
    fontFamily: 'Figtree',
    fontStyle: 'italic',
  },
});
