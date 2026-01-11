import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { useTheme } from '@/src/state/theme';

export type ProgressRingProps = {
  /** Progress value from 0 to 1 */
  progress: number;
  /** Size of the ring in pixels */
  size?: number;
  /** Stroke width of the ring */
  strokeWidth?: number;
  /** Color of the progress arc */
  color?: string;
  /** Show percentage text in center */
  showPercentage?: boolean;
  /** Custom center content (overrides showPercentage) */
  centerLabel?: string;
  /** Secondary label below center */
  subLabel?: string;
};

export function ProgressRing({
  progress,
  size = 100,
  strokeWidth = 10,
  color,
  showPercentage = true,
  centerLabel,
  subLabel,
}: ProgressRingProps) {
  const { palette, isDark } = useTheme();

  const normalizedProgress = Math.max(0, Math.min(1, progress));
  const ringColor = color ?? palette.tint;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - normalizedProgress);

  const center = size / 2;
  const bgColor = isDark ? 'rgba(148,163,184,0.15)' : 'rgba(0,0,0,0.08)';

  const displayLabel = centerLabel ?? (showPercentage ? `${Math.round(normalizedProgress * 100)}%` : null);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          {/* Background circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={bgColor}
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Progress arc */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={ringColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </G>
      </Svg>

      {(displayLabel || subLabel) && (
        <View style={styles.centerContent}>
          {displayLabel && (
            <Text
              style={[
                styles.centerLabel,
                { color: palette.text, fontSize: size * 0.2 },
              ]}
            >
              {displayLabel}
            </Text>
          )}
          {subLabel && (
            <Text
              style={[
                styles.subLabel,
                { color: palette.textSecondary, fontSize: size * 0.1 },
              ]}
            >
              {subLabel}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  subLabel: {
    fontWeight: '600',
    fontFamily: 'Figtree',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
