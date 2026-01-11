import React, { useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop } from 'react-native-svg';

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
  /** Show area fill under the line */
  showArea?: boolean;
  /** Show data points */
  showPoints?: boolean;
  /** Show horizontal grid lines */
  showGrid?: boolean;
  /** Label for empty state */
  emptyMessage?: string;
};

function mapToPath(
  points: DataPoint[],
  width: number,
  height: number,
  padding: number
): string {
  if (points.length === 0) return '';

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const xScale = (x: number) => {
    if (maxX === minX) return padding;
    return padding + ((x - minX) / (maxX - minX)) * (width - padding * 2);
  };

  const yScale = (y: number) => {
    if (maxY === minY) return height - padding;
    const t = (y - minY) / (maxY - minY);
    return height - padding - t * (height - padding * 2);
  };

  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.x).toFixed(2)} ${yScale(p.y).toFixed(2)}`)
    .join(' ');
}

export function LineChart({
  points,
  height = 160,
  color,
  showArea = true,
  showPoints = true,
  showGrid = true,
  emptyMessage = 'No data yet',
}: LineChartProps) {
  const { palette, isDark } = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  const width = screenWidth - 32;
  const padding = 24;
  const strokeColor = color ?? palette.tint;

  const { linePath, areaPath, scaledPoints } = useMemo(() => {
    if (points.length < 2) {
      return { linePath: '', areaPath: '', scaledPoints: [] };
    }

    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const xScale = (x: number) => {
      if (maxX === minX) return padding;
      return padding + ((x - minX) / (maxX - minX)) * (width - padding * 2);
    };

    const yScale = (y: number) => {
      if (maxY === minY) return height - padding;
      const t = (y - minY) / (maxY - minY);
      return height - padding - t * (height - padding * 2);
    };

    const line = mapToPath(points, width, height, padding);
    const area = `${line} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;

    const scaled = points.map((p) => ({
      x: xScale(p.x),
      y: yScale(p.y),
    }));

    return { linePath: line, areaPath: area, scaledPoints: scaled };
  }, [points, width, height, padding]);

  const gridColor = isDark ? 'rgba(148,163,184,0.15)' : 'rgba(0,0,0,0.08)';

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

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
          <Stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
        </LinearGradient>
      </Defs>

      {/* Grid lines */}
      {showGrid && (
        <G>
          {[0, 0.5, 1].map((t, i) => {
            const y = padding + t * (height - padding * 2);
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

      {/* Area fill */}
      {showArea && <Path d={areaPath} fill="url(#areaGradient)" />}

      {/* Line */}
      <Path
        d={linePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Points */}
      {showPoints &&
        scaledPoints.map((p, i) => (
          <G key={i}>
            <Circle
              cx={p.x}
              cy={p.y}
              r={5}
              fill={isDark ? '#1C1C1E' : '#FFFFFF'}
              stroke={strokeColor}
              strokeWidth={3}
            />
          </G>
        ))}
    </Svg>
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
});
