import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Path, Circle } from 'react-native-svg';

import { useTheme } from '@/src/state/theme';
import { InsightIcon } from './InsightIcon';
import { ANIMATION } from '@/src/constants/design-tokens';
import type { TrackerValueType } from '@/src/storage/trackers';

// Tracker type colors
const TRACKER_TYPE_COLORS: Record<TrackerValueType, string> = {
  number: '#3B82F6',   // Blue
  scale: '#8B5CF6',    // Purple
  boolean: '#22C55E',  // Green
  text: '#F59E0B',     // Yellow
  duration: '#E26B3A', // Orange
};

// Tracker type icons
const TRACKER_TYPE_ICONS: Record<TrackerValueType, string> = {
  number: 'hash',
  scale: 'sliders',
  boolean: 'check-square',
  text: 'type',
  duration: 'clock',
};

export type TrackerDataPoint = {
  date: string;
  value: number;
};

export type TrackerEntry = {
  trackerKey: string;
  trackerLabel: string;
  valueType: TrackerValueType;
  currentValue: number | string | boolean | null;
  unit?: string | null;
  recentData?: TrackerDataPoint[];
  trend?: 'up' | 'down' | 'stable';
  changePercent?: number;
};

type TrackerCardProps = {
  tracker: TrackerEntry;
  onPress?: () => void;
  onLog?: () => void;
  compact?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Mini sparkline component
function MiniSparkline({
  data,
  width,
  height,
  color,
}: {
  data: TrackerDataPoint[];
  width: number;
  height: number;
  color: string;
}) {
  const path = useMemo(() => {
    if (!data || data.length < 2) return '';

    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const padding = 4;
    const plotWidth = width - padding * 2;
    const plotHeight = height - padding * 2;

    const points = data.map((d, i) => {
      const x = padding + (i / (data.length - 1)) * plotWidth;
      const y = padding + plotHeight - ((d.value - min) / range) * plotHeight;
      return { x, y };
    });

    const pathData = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');

    return pathData;
  }, [data, width, height]);

  const lastPoint = useMemo(() => {
    if (!data || data.length < 2) return null;
    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const padding = 4;
    const plotWidth = width - padding * 2;
    const plotHeight = height - padding * 2;

    const lastValue = data[data.length - 1].value;
    const x = padding + plotWidth;
    const y = padding + plotHeight - ((lastValue - min) / range) * plotHeight;
    return { x, y };
  }, [data, width, height]);

  if (!path) return null;

  return (
    <Svg width={width} height={height}>
      <Path
        d={path}
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {lastPoint && (
        <Circle cx={lastPoint.x} cy={lastPoint.y} r={3} fill={color} />
      )}
    </Svg>
  );
}

// Format value based on type
function formatValue(
  value: number | string | boolean | null,
  valueType: TrackerValueType,
  unit?: string | null
) {
  if (value === null || value === undefined) return '--';

  switch (valueType) {
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'text':
      return String(value);
    case 'duration': {
      const mins = typeof value === 'number' ? value : 0;
      if (mins < 60) return `${mins}m`;
      const hours = Math.floor(mins / 60);
      const remaining = mins % 60;
      return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
    }
    case 'scale':
    case 'number':
    default: {
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(num)) return String(value);
      const formatted =
        num % 1 === 0 ? num.toString() : num.toFixed(1);
      return unit ? `${formatted}${unit}` : formatted;
    }
  }
}

export function TrackerCard({
  tracker,
  onPress,
  onLog,
  compact = false,
}: TrackerCardProps) {
  const { palette, sizes } = useTheme();

  // Animation values
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.98, {
      damping: ANIMATION.spring.damping,
      stiffness: ANIMATION.spring.stiffness,
    });
    translateY.value = withSpring(-2, {
      damping: ANIMATION.spring.damping,
      stiffness: ANIMATION.spring.stiffness,
    });
  }, [scale, translateY]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, {
      damping: ANIMATION.spring.damping,
      stiffness: ANIMATION.spring.stiffness,
    });
    translateY.value = withSpring(0, {
      damping: ANIMATION.spring.damping,
      stiffness: ANIMATION.spring.stiffness,
    });
  }, [scale, translateY]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  // Get colors and icons based on tracker type
  const accentColor =
    TRACKER_TYPE_COLORS[tracker.valueType] ?? TRACKER_TYPE_COLORS.number;
  const typeIcon =
    TRACKER_TYPE_ICONS[tracker.valueType] ?? TRACKER_TYPE_ICONS.number;

  // Trend indicator
  const trendIcon =
    tracker.trend === 'up'
      ? 'trending-up'
      : tracker.trend === 'down'
        ? 'trending-down'
        : 'minus';
  const trendColor =
    tracker.trend === 'up'
      ? palette.success
      : tracker.trend === 'down'
        ? palette.error
        : palette.textSecondary;

  // Formatted value
  const displayValue = formatValue(
    tracker.currentValue,
    tracker.valueType,
    tracker.unit
  );

  // Sparkline data
  const hasSparkline =
    tracker.recentData && tracker.recentData.length >= 2;

  if (compact) {
    // Compact variant
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.compactContainer,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
            borderRadius: sizes.borderRadius,
            padding: sizes.cardPadding,
          },
          cardAnimatedStyle,
        ]}
      >
        {/* Icon */}
        <View
          style={[
            styles.compactIcon,
            {
              backgroundColor: `${accentColor}20`,
              width: sizes.buttonHeight,
              height: sizes.buttonHeight,
              borderRadius: sizes.buttonHeight / 2,
            },
          ]}
        >
          <InsightIcon
            name={typeIcon}
            size={sizes.iconSizeSmall}
            color={accentColor}
          />
        </View>

        {/* Content */}
        <View style={styles.compactContent}>
          <Text
            style={[
              styles.compactLabel,
              { color: palette.textSecondary, fontSize: sizes.tinyText },
            ]}
            numberOfLines={1}
          >
            {tracker.trackerLabel}
          </Text>
          <Text
            style={[
              styles.compactValue,
              { color: palette.text, fontSize: sizes.sectionTitle },
            ]}
          >
            {displayValue}
          </Text>
        </View>

        {/* Trend */}
        {tracker.trend && (
          <View style={styles.compactTrend}>
            <InsightIcon
              name={trendIcon}
              size={sizes.iconSizeSmall}
              color={trendColor}
            />
            {tracker.changePercent !== undefined && (
              <Text
                style={[
                  styles.compactChangeText,
                  { color: trendColor, fontSize: sizes.tinyText },
                ]}
              >
                {tracker.changePercent > 0 ? '+' : ''}
                {tracker.changePercent.toFixed(0)}%
              </Text>
            )}
          </View>
        )}

        {/* Log button */}
        {onLog && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onLog();
            }}
            style={[
              styles.compactLogButton,
              {
                backgroundColor: accentColor,
                borderRadius: sizes.borderRadiusSmall,
              },
            ]}
          >
            <InsightIcon name="plus" size={sizes.iconSizeSmall} color="#FFFFFF" />
          </Pressable>
        )}
      </AnimatedPressable>
    );
  }

  // Full variant
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.container,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          borderRadius: sizes.borderRadius,
          padding: sizes.cardPadding,
        },
        cardAnimatedStyle,
      ]}
    >
      {/* Left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      {/* Header: Label + Type badge */}
      <View style={styles.header}>
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: `${accentColor}20`,
              width: sizes.buttonHeight,
              height: sizes.buttonHeight,
              borderRadius: sizes.buttonHeight / 2,
            },
          ]}
        >
          <InsightIcon
            name={typeIcon}
            size={sizes.iconSize}
            color={accentColor}
          />
        </View>
        <View style={styles.headerText}>
          <Text
            style={[
              styles.label,
              { color: palette.text, fontSize: sizes.sectionTitle },
            ]}
            numberOfLines={1}
          >
            {tracker.trackerLabel}
          </Text>
          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor: `${accentColor}15`,
                borderRadius: sizes.borderRadiusSmall,
              },
            ]}
          >
            <Text
              style={[
                styles.typeText,
                { color: accentColor, fontSize: sizes.tinyText },
              ]}
            >
              {tracker.valueType.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {/* Value + Trend */}
      <View style={styles.valueRow}>
        <Text
          style={[
            styles.value,
            { color: palette.text, fontSize: sizes.headerTitle * 1.5 },
          ]}
        >
          {displayValue}
        </Text>

        {/* Trend indicator */}
        {tracker.trend && (
          <View
            style={[
              styles.trendBadge,
              {
                backgroundColor:
                  tracker.trend === 'stable'
                    ? `${palette.textSecondary}15`
                    : `${trendColor}15`,
                borderRadius: sizes.borderRadiusSmall,
              },
            ]}
          >
            <InsightIcon
              name={trendIcon}
              size={sizes.iconSizeSmall}
              color={trendColor}
            />
            {tracker.changePercent !== undefined && (
              <Text
                style={[
                  styles.changeText,
                  { color: trendColor, fontSize: sizes.smallText },
                ]}
              >
                {tracker.changePercent > 0 ? '+' : ''}
                {tracker.changePercent.toFixed(0)}%
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Sparkline */}
      {hasSparkline && (
        <View style={styles.sparklineContainer}>
          <MiniSparkline
            data={tracker.recentData!}
            width={200}
            height={40}
            color={accentColor}
          />
          <Text
            style={[
              styles.sparklineLabel,
              { color: palette.textSecondary, fontSize: sizes.tinyText },
            ]}
          >
            Last {tracker.recentData!.length} entries
          </Text>
        </View>
      )}

      {/* Footer: Log button */}
      <View style={styles.footer}>
        {onLog && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onLog();
            }}
            style={[
              styles.logButton,
              {
                backgroundColor: accentColor,
                borderRadius: sizes.borderRadiusSmall,
                paddingHorizontal: sizes.cardPadding,
                paddingVertical: sizes.spacingSmall,
              },
            ]}
          >
            <InsightIcon name="plus" size={sizes.iconSizeSmall} color="#FFFFFF" />
            <Text
              style={[styles.logButtonText, { fontSize: sizes.smallText }]}
            >
              Log Value
            </Text>
          </Pressable>
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    overflow: 'hidden',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 8,
  },
  iconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontWeight: '800',
    fontFamily: 'Figtree',
    letterSpacing: -0.3,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeText: {
    fontWeight: '700',
    fontFamily: 'Figtree',
    letterSpacing: 0.5,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 8,
  },
  value: {
    fontWeight: '900',
    fontFamily: 'Figtree',
    letterSpacing: -1,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  changeText: {
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  sparklineContainer: {
    paddingLeft: 8,
    gap: 4,
  },
  sparklineLabel: {
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingLeft: 8,
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  // Compact variant styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  compactIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContent: {
    flex: 1,
    gap: 2,
  },
  compactLabel: {
    fontWeight: '600',
    fontFamily: 'Figtree',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  compactValue: {
    fontWeight: '800',
    fontFamily: 'Figtree',
    letterSpacing: -0.3,
  },
  compactTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  compactChangeText: {
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  compactLogButton: {
    padding: 8,
  },
});
