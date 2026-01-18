import React, { useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LineChart as GiftedLineChart } from 'react-native-gifted-charts/dist/LineChart';

import { useTheme } from '@/src/state/theme';

export type DataPoint = {
  x: number;
  y: number;
  label?: string;
};

export type LineChartProps = {
  /** Array of data points */
  points: DataPoint[];
  /** Height of the chart */
  height?: number;
  /** Line color */
  color?: string;
  /** Show data points */
  showPoints?: boolean;
  /** Show horizontal grid lines */
  showGrid?: boolean;
  /** Label for empty state */
  emptyMessage?: string;
};

export function LineChart({
  points,
  height = 160,
  color,
  showPoints = true,
  showGrid = true,
  emptyMessage = 'No data yet',
}: LineChartProps) {
  const { palette, isDark } = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  const chartWidth = screenWidth - 64;
  const strokeColor = color ?? palette.tint;

  const gridColor = isDark ? 'rgba(148,163,184,0.15)' : 'rgba(0,0,0,0.08)';

  const chartData = useMemo(() => {
    if (points.length < 2) return [];

    // Sort by x value to ensure proper line drawing
    const sortedPoints = [...points].sort((a, b) => a.x - b.x);

    return sortedPoints.map((point) => ({
      value: point.y,
      label: point.label,
      dataPointText: point.label,
    }));
  }, [points]);

  const { maxValue, minValue } = useMemo(() => {
    if (chartData.length === 0) return { maxValue: 1, minValue: 0 };
    const values = chartData.map((d) => d.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    // Add some padding to the range
    const range = max - min || 1;
    return {
      maxValue: max + range * 0.1,
      minValue: Math.max(0, min - range * 0.1),
    };
  }, [chartData]);

  if (points.length < 2) {
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

  // Calculate spacing based on data points
  const pointCount = chartData.length;
  const spacing = Math.max(20, (chartWidth - 60) / Math.max(1, pointCount - 1));

  return (
    <View style={styles.container}>
      <GiftedLineChart
        data={chartData}
        width={chartWidth}
        height={height - 40}
        spacing={spacing}
        initialSpacing={20}
        endSpacing={20}
        // Line styling
        color={strokeColor}
        thickness={3}
        curved
        curvature={0.2}
        isAnimated
        animationDuration={800}
        areaChart={false}
        // Data points
        hideDataPoints={!showPoints}
        dataPointsColor={isDark ? '#1C1C1E' : '#FFFFFF'}
        dataPointsRadius={5}
        focusedDataPointColor={strokeColor}
        // Point border
        textShiftY={-10}
        textColor={palette.textSecondary}
        textFontSize={10}
        // Grid and axes
        maxValue={maxValue}
        noOfSections={showGrid ? 3 : 0}
        rulesColor={gridColor}
        rulesType="solid"
        rulesThickness={1}
        hideRules={!showGrid}
        xAxisColor="transparent"
        yAxisColor="transparent"
        hideYAxisText
        // Disable interaction
        disableScroll
        // Custom data point rendering for border effect
        customDataPoint={showPoints ? () => (
          <View
            style={[
              styles.dataPoint,
              {
                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                borderColor: strokeColor,
              },
            ]}
          />
        ) : undefined}
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
  dataPoint: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 3,
  },
});
