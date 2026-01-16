import React, { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';

import { useTheme } from '@/src/state/theme';

export type MultiLinePoint = {
  x: number;
  y: number;
};

export type MultiLineSeries = {
  id: string;
  label: string;
  color: string;
  points: MultiLinePoint[];
};

export type MultiLineChartProps = {
  series: MultiLineSeries[];
  height?: number;
  showGrid?: boolean;
  showPoints?: boolean;
};

function buildPath(points: MultiLinePoint[], xScale: (x: number) => number, yScale: (y: number) => number) {
  if (points.length < 2) return '';
  return points
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${xScale(p.x).toFixed(2)} ${yScale(p.y).toFixed(2)}`)
    .join(' ');
}

export function MultiLineChart({
  series,
  height = 180,
  showGrid = true,
  showPoints = true,
}: MultiLineChartProps) {
  const { palette, isDark } = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  const width = screenWidth - 32;
  const padding = 22;

  const { lines, pointsBySeries, hasData } = useMemo(() => {
    const allPoints = series.flatMap((s) => s.points);
    if (allPoints.length < 2) return { lines: [], pointsBySeries: [], hasData: false };

    const xs = allPoints.map((p) => p.x);
    const ys = allPoints.map((p) => p.y);
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

    const lineDefs = series.map((s) => ({
      id: s.id,
      color: s.color,
      path: buildPath(s.points, xScale, yScale),
    }));
    const scaledPoints = series.map((s) => ({
      id: s.id,
      color: s.color,
      points: s.points.map((p) => ({ x: xScale(p.x), y: yScale(p.y) })),
    }));

    return { lines: lineDefs, pointsBySeries: scaledPoints, hasData: true };
  }, [series, width, height, padding]);

  const gridColor = isDark ? 'rgba(148,163,184,0.15)' : 'rgba(0,0,0,0.08)';

  if (!hasData) {
    return <View style={[styles.empty, { height }]} />;
  }

  return (
    <Svg width={width} height={height}>
      {showGrid && (
        <G>
          {[0, 0.5, 1].map((t, idx) => {
            const y = padding + t * (height - padding * 2);
            return (
              <Line
                key={`grid-${idx}`}
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

      {lines.map((line) =>
        line.path ? (
          <Path
            key={line.id}
            d={line.path}
            fill="none"
            stroke={line.color}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null
      )}

      {showPoints &&
        pointsBySeries.map((seriesPoints) =>
          seriesPoints.points.map((p, idx) => (
            <Circle
              key={`${seriesPoints.id}-${idx}`}
              cx={p.x}
              cy={p.y}
              r={4}
              fill={isDark ? '#1C1C1E' : '#FFFFFF'}
              stroke={seriesPoints.color}
              strokeWidth={2}
            />
          ))
        )}
    </Svg>
  );
}

const styles = StyleSheet.create({
  empty: {
    width: '100%',
  },
});
