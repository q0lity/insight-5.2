import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/src/state/theme';

export type RadarDataPoint = {
  label: string;
  value: number; // 0-100
  shortLabel?: string;
};

export type RadarChartProps = {
  data: RadarDataPoint[];
  size?: number;
  color?: string;
  showLabels?: boolean;
  showValues?: boolean;
  rings?: number;
};

export function RadarChart({
  data,
  size = 200,
  color,
  showLabels = true,
  showValues = false,
  rings = 4,
}: RadarChartProps) {
  const { palette, isDark } = useTheme();

  const fillColor = color ?? palette.tint;
  const center = size / 2;
  const maxRadius = size / 2 - 30;
  const n = data.length;

  const { points, labelPositions, ringRadii } = useMemo(() => {
    const angleStep = (2 * Math.PI) / n;
    const startAngle = -Math.PI / 2; // Start from top

    const pts = data.map((d, i) => {
      const angle = startAngle + i * angleStep;
      const r = (d.value / 100) * maxRadius;
      return {
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle),
      };
    });

    const labels = data.map((d, i) => {
      const angle = startAngle + i * angleStep;
      const r = maxRadius + 20;
      return {
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle),
        label: d.shortLabel ?? d.label,
        value: d.value,
      };
    });

    const radii = Array.from({ length: rings }, (_, i) => ((i + 1) / rings) * maxRadius);

    return { points: pts, labelPositions: labels, ringRadii: radii };
  }, [data, n, center, maxRadius, rings]);

  const pointsString = points.map((p) => `${p.x},${p.y}`).join(' ');

  const gridColor = isDark ? 'rgba(148,163,184,0.2)' : 'rgba(0,0,0,0.08)';
  const axisColor = isDark ? 'rgba(148,163,184,0.3)' : 'rgba(0,0,0,0.12)';

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Grid rings */}
        {ringRadii.map((r, i) => (
          <Circle
            key={`ring-${i}`}
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke={gridColor}
            strokeWidth={1}
          />
        ))}

        {/* Axis lines */}
        {data.map((_, i) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
          const x2 = center + maxRadius * Math.cos(angle);
          const y2 = center + maxRadius * Math.sin(angle);
          return (
            <Line
              key={`axis-${i}`}
              x1={center}
              y1={center}
              x2={x2}
              y2={y2}
              stroke={axisColor}
              strokeWidth={1}
            />
          );
        })}

        {/* Data polygon */}
        <Polygon
          points={pointsString}
          fill={`${fillColor}30`}
          stroke={fillColor}
          strokeWidth={2.5}
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <Circle key={`point-${i}`} cx={p.x} cy={p.y} r={4} fill={fillColor} />
        ))}

        {/* Labels */}
        {showLabels &&
          labelPositions.map((lp, i) => (
            <SvgText
              key={`label-${i}`}
              x={lp.x}
              y={lp.y}
              fontSize={11}
              fontWeight="700"
              fill={palette.textSecondary}
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {lp.label}
            </SvgText>
          ))}
      </Svg>

      {showValues && (
        <View style={styles.valuesRow}>
          {data.map((d, i) => (
            <View key={i} style={styles.valueItem}>
              <Text style={[styles.valueLabel, { color: palette.textSecondary }]}>
                {d.shortLabel ?? d.label}
              </Text>
              <Text style={[styles.valueNumber, { color: palette.text }]}>{d.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  valuesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
  },
  valueItem: {
    alignItems: 'center',
  },
  valueLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  valueNumber: {
    fontSize: 16,
    fontWeight: '800',
  },
});
