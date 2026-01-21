import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

import { useTheme } from '@/src/state/theme';

type CardSkeletonVariant = 'note' | 'event' | 'task' | 'tracker' | 'compact';

type CardSkeletonProps = {
  variant?: CardSkeletonVariant;
};

export function CardSkeleton({ variant = 'note' }: CardSkeletonProps) {
  const { palette, sizes, isDark } = useTheme();

  // Shimmer animation
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1200 }),
      -1,
      false
    );
  }, [shimmer]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0.3, 0.6, 0.3]),
  }));

  const skeletonBg = isDark ? palette.borderLight : palette.border;

  const renderCompactSkeleton = () => (
    <View
      style={[
        styles.compactContainer,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          borderRadius: sizes.borderRadius,
          padding: sizes.cardPadding,
        },
      ]}
    >
      {/* Icon placeholder */}
      <Animated.View
        style={[
          styles.iconSkeleton,
          {
            backgroundColor: skeletonBg,
            width: sizes.buttonHeight,
            height: sizes.buttonHeight,
            borderRadius: sizes.buttonHeight / 2,
          },
          shimmerStyle,
        ]}
      />

      {/* Content */}
      <View style={styles.compactContent}>
        <Animated.View
          style={[
            styles.titleSkeleton,
            {
              backgroundColor: skeletonBg,
              height: sizes.bodyText,
              width: '70%',
              borderRadius: sizes.borderRadiusSmall,
            },
            shimmerStyle,
          ]}
        />
        <Animated.View
          style={[
            styles.metaSkeleton,
            {
              backgroundColor: skeletonBg,
              height: sizes.tinyText,
              width: '40%',
              borderRadius: sizes.borderRadiusSmall,
            },
            shimmerStyle,
          ]}
        />
      </View>

      {/* Action placeholder */}
      <Animated.View
        style={[
          styles.actionSkeleton,
          {
            backgroundColor: skeletonBg,
            width: sizes.iconSize + 8,
            height: sizes.iconSize + 8,
            borderRadius: (sizes.iconSize + 8) / 2,
          },
          shimmerStyle,
        ]}
      />
    </View>
  );

  const renderFullSkeleton = () => (
    <View
      style={[
        styles.container,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          borderRadius: sizes.borderRadius,
          padding: sizes.cardPadding,
        },
      ]}
    >
      {/* Accent bar */}
      <Animated.View
        style={[
          styles.accentBar,
          { backgroundColor: skeletonBg },
          shimmerStyle,
        ]}
      />

      {/* Header row */}
      <View style={styles.headerRow}>
        {variant === 'event' || variant === 'tracker' ? (
          <Animated.View
            style={[
              styles.iconSkeleton,
              {
                backgroundColor: skeletonBg,
                width: sizes.buttonHeight,
                height: sizes.buttonHeight,
                borderRadius: sizes.buttonHeight / 2,
              },
              shimmerStyle,
            ]}
          />
        ) : null}
        <View style={styles.headerContent}>
          <Animated.View
            style={[
              styles.titleSkeleton,
              {
                backgroundColor: skeletonBg,
                height: sizes.sectionTitle,
                width: '80%',
                borderRadius: sizes.borderRadiusSmall,
              },
              shimmerStyle,
            ]}
          />
          {variant === 'note' && (
            <Animated.View
              style={[
                styles.bodySkeleton,
                {
                  backgroundColor: skeletonBg,
                  height: sizes.bodyText * 2,
                  width: '100%',
                  borderRadius: sizes.borderRadiusSmall,
                  marginTop: 8,
                },
                shimmerStyle,
              ]}
            />
          )}
        </View>
        {(variant === 'task' || variant === 'event') && (
          <Animated.View
            style={[
              styles.actionSkeleton,
              {
                backgroundColor: skeletonBg,
                width: sizes.buttonHeightSmall,
                height: sizes.buttonHeightSmall,
                borderRadius: sizes.borderRadiusSmall,
              },
              shimmerStyle,
            ]}
          />
        )}
      </View>

      {/* Badges row */}
      <View style={styles.badgesRow}>
        {[1, 2, 3].map((i) => (
          <Animated.View
            key={i}
            style={[
              styles.badgeSkeleton,
              {
                backgroundColor: skeletonBg,
                height: sizes.chipHeight,
                width: 60 + i * 10,
                borderRadius: sizes.borderRadiusSmall,
              },
              shimmerStyle,
            ]}
          />
        ))}
      </View>

      {/* Sparkline placeholder for tracker */}
      {variant === 'tracker' && (
        <Animated.View
          style={[
            styles.sparklineSkeleton,
            {
              backgroundColor: skeletonBg,
              height: 40,
              width: '100%',
              borderRadius: sizes.borderRadiusSmall,
            },
            shimmerStyle,
          ]}
        />
      )}

      {/* Footer */}
      <View style={styles.footerRow}>
        <Animated.View
          style={[
            styles.metaSkeleton,
            {
              backgroundColor: skeletonBg,
              height: sizes.tinyText,
              width: '30%',
              borderRadius: sizes.borderRadiusSmall,
            },
            shimmerStyle,
          ]}
        />
        <Animated.View
          style={[
            styles.metaSkeleton,
            {
              backgroundColor: skeletonBg,
              height: sizes.tinyText,
              width: '20%',
              borderRadius: sizes.borderRadiusSmall,
            },
            shimmerStyle,
          ]}
        />
      </View>
    </View>
  );

  if (variant === 'compact') {
    return renderCompactSkeleton();
  }

  return renderFullSkeleton();
}

// List of skeletons for loading states
export function CardSkeletonList({
  count = 3,
  variant = 'note',
}: {
  count?: number;
  variant?: CardSkeletonVariant;
}) {
  const { sizes } = useTheme();

  return (
    <View style={[styles.list, { gap: sizes.cardGap }]}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} variant={variant} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    overflow: 'hidden',
    gap: 12,
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingLeft: 8,
  },
  headerContent: {
    flex: 1,
    gap: 4,
  },
  iconSkeleton: {},
  titleSkeleton: {},
  bodySkeleton: {},
  actionSkeleton: {},
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingLeft: 8,
  },
  badgeSkeleton: {},
  sparklineSkeleton: {
    marginLeft: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 8,
  },
  metaSkeleton: {},
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
  },
  compactContent: {
    flex: 1,
    gap: 6,
  },
  // List styles
  list: {
    gap: 12,
  },
});
