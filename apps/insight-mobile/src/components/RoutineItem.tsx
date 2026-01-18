import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/src/state/theme';
import { ANIMATION, SPACING } from '@/src/constants/design-tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type RoutineItemProps = {
  icon: string;
  iconColor?: string;
  time?: string;
  title: string;
  duration?: string;
  completed: boolean;
  onToggle: () => void;
  onPress?: () => void;
};

export function RoutineItem({
  icon,
  iconColor,
  time,
  title,
  duration,
  completed,
  onToggle,
  onPress,
}: RoutineItemProps) {
  const { palette, sizes } = useTheme();

  // Animation values
  const checkScale = useSharedValue(1);
  const checkProgress = useSharedValue(completed ? 1 : 0);
  const rowScale = useSharedValue(1);

  // Trigger haptic feedback
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'success' = 'light') => {
    switch (type) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
    }
  }, []);

  // Handle toggle with animation
  const handleToggle = useCallback(() => {
    const newCompleted = !completed;

    // Animate checkmark scale: 1 -> 1.2 -> 1
    checkScale.value = withSequence(
      withSpring(1.2, { damping: ANIMATION.spring.damping, stiffness: ANIMATION.spring.stiffness }),
      withSpring(1, { damping: ANIMATION.spring.damping, stiffness: ANIMATION.spring.stiffness })
    );

    // Animate check progress for color transition
    checkProgress.value = withTiming(newCompleted ? 1 : 0, { duration: ANIMATION.normal });

    // Trigger haptic
    triggerHaptic(newCompleted ? 'success' : 'light');

    onToggle();
  }, [completed, checkScale, checkProgress, onToggle, triggerHaptic]);

  // Press feedback animation
  const handlePressIn = useCallback(() => {
    rowScale.value = withTiming(0.98, { duration: ANIMATION.fast });
  }, [rowScale]);

  const handlePressOut = useCallback(() => {
    rowScale.value = withTiming(1, { duration: ANIMATION.fast });
  }, [rowScale]);

  // Animated styles
  const rowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: rowScale.value },
    ],
  }));

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    backgroundColor: interpolateColor(
      checkProgress.value,
      [0, 1],
      ['transparent', palette.tint]
    ),
    borderColor: interpolateColor(
      checkProgress.value,
      [0, 1],
      [palette.border, palette.tint]
    ),
  }));

  const checkmarkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: checkProgress.value,
    transform: [{ scale: checkProgress.value }],
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolateColor(
      checkProgress.value,
      [0, 1],
      [1, 0.5]
    ) as unknown as number,
  }));

  // Determine icon background color
  const iconBgColor = iconColor
    ? `${iconColor}20`
    : `${palette.tint}20`;
  const iconTextColor = iconColor || palette.tint;

  // Check if icon is emoji (starts with non-ASCII)
  const isEmoji = /^[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(icon);

  const content = (
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
        rowAnimatedStyle,
      ]}
    >
      {/* Icon Circle */}
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: iconBgColor,
            width: sizes.buttonHeight,
            height: sizes.buttonHeight,
            borderRadius: sizes.buttonHeight / 2,
          },
        ]}
      >
        {isEmoji ? (
          <Text style={[styles.iconEmoji, { fontSize: sizes.iconSize }]}>{icon}</Text>
        ) : (
          <Text style={[styles.iconText, { color: iconTextColor, fontSize: sizes.iconSizeSmall }]}>
            {icon}
          </Text>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Time */}
        {time && (
          <Text
            style={[
              styles.time,
              {
                color: palette.textSecondary,
                fontSize: sizes.smallText,
              },
            ]}
          >
            {time}
          </Text>
        )}

        {/* Title */}
        <Animated.Text
          style={[
            styles.title,
            {
              color: palette.text,
              fontSize: sizes.bodyText,
              textDecorationLine: completed ? 'line-through' : 'none',
            },
            titleAnimatedStyle,
          ]}
          numberOfLines={1}
        >
          {title}
        </Animated.Text>
      </View>

      {/* Duration Badge */}
      {duration && (
        <View
          style={[
            styles.durationBadge,
            {
              backgroundColor: `${palette.tint}15`,
              paddingHorizontal: sizes.chipPadding,
              paddingVertical: SPACING.xs,
              borderRadius: sizes.borderRadiusSmall,
            },
          ]}
        >
          <Text
            style={[
              styles.durationText,
              {
                color: palette.tint,
                fontSize: sizes.smallText,
              },
            ]}
          >
            {duration}
          </Text>
        </View>
      )}

      {/* Checkmark Circle */}
      <Pressable onPress={handleToggle} hitSlop={8}>
        <Animated.View
          style={[
            styles.checkCircle,
            {
              width: sizes.iconSize + 8,
              height: sizes.iconSize + 8,
              borderRadius: (sizes.iconSize + 8) / 2,
              borderWidth: 2,
            },
            checkAnimatedStyle,
          ]}
        >
          <Animated.View style={checkmarkAnimatedStyle}>
            <Text style={[styles.checkmark, { fontSize: sizes.iconSizeSmall }]}>
              {'\u2713'}
            </Text>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </AnimatedPressable>
  );

  return content;
}

const styles = StyleSheet.create({
  container: {
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
  iconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    textAlign: 'center',
  },
  iconText: {
    fontWeight: '700',
    fontFamily: 'Figtree',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  time: {
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  title: {
    fontWeight: '700',
    fontFamily: 'Figtree',
    letterSpacing: -0.3,
  },
  durationBadge: {
    alignSelf: 'center',
  },
  durationText: {
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  checkCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
