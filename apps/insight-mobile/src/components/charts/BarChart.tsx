import React, { useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { BarChart as GiftedBarChart } from 'react-native-gifted-charts/dist/BarChart';

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

  const chartWidth = screenWidth - 64;
  const defaultColor = color ?? palette.tint;

  const gridColor = isDark ? 'rgba(148,163,184,0.15)' : 'rgba(0,0,0,0.08)';

  const chartData = useMemo(() => {
    return data.map((item, index) => {
      const value = typeof item === 'number' ? item : item.value;
      const label = typeof item === 'number' ? undefined : item.label;
      const barColor = typeof item === 'number' ? defaultColor : (item.color ?? defaultColor);

      return {
        value,
        label: showLabels ? (label ?? (index + 1).toString()) : undefined,
        frontColor: barColor,
        topLabelComponent: showValues && value > 0
          ? () => (
              <Text style={[styles.valueLabel, { color: palette.textSecondary }]}>
                {value}
              </Text>
            )
          : undefined,
      };
    });
  }, [data, defaultColor, showLabels, showValues, palette.textSecondary]);

  const maxValue = useMemo(() => {
    return Math.max(1, ...chartData.map((d) => d.value));
  }, [chartData]);

  if (chartData.length === 0) {
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

  // Calculate bar width based on data count
  const barCount = chartData.length;
  const barWidth = Math.max(12, Math.min(40, (chartWidth - 40) / barCount - 8));
  const spacing = Math.max(4, (chartWidth - barWidth * barCount) / (barCount + 1));

  return (
    <View style={styles.container}>
      <GiftedBarChart
        data={chartData}
        width={chartWidth}
        height={height - 40}
        barWidth={barWidth}
        spacing={spacing}
        barBorderRadius={6}
        showGradient={false}
        isAnimated
        animationDuration={600}
        maxValue={maxValue * 1.1}
        noOfSections={showGrid ? 3 : 0}
        rulesColor={gridColor}
        rulesType="solid"
        rulesThickness={1}
        hideRules={!showGrid}
        xAxisColor="transparent"
        yAxisColor="transparent"
        yAxisTextStyle={{ color: 'transparent', fontSize: 0 }}
        xAxisLabelTextStyle={[
          styles.label,
          { color: palette.textSecondary },
        ]}
        hideYAxisText
        disablePress
        disableScroll
        initialSpacing={spacing}
        endSpacing={spacing}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  valueLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
});
