import React, { useEffect, useCallback, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/src/state/theme';
import { ANIMATION } from '@/src/constants/design-tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type ProgressRingLargeProps = {
  progress: number; // 0 to 1
  size?: number;
  strokeWidth?: number;
  color?: string;
  children?: ReactNode;
};

export function ProgressRingLarge({
  progress,
  size = 200,
  strokeWidth = 12,
  color,
  children,
}: ProgressRingLargeProps) {
  const { palette } = useTheme();

  // Calculate SVG dimensions
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Animation values
  const animatedProgress = useSharedValue(0);
  const ringScale = useSharedValue(1);
  const prevProgress = useSharedValue(0);

  // Trigger haptic on completion
  const triggerCompletionHaptic = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  // Update progress with animation
  useEffect(() => {
    // Check if we're completing (reaching 1)
    const isCompleting = progress >= 1 && prevProgress.value < 1;

    // Animate progress value
    animatedProgress.value = withTiming(progress, {
      duration: ANIMATION.slow,
      easing: Easing.bezierFn(0.4, 0, 0.2, 1),
    });

    // Pulse animation on completion
    if (isCompleting) {
      ringScale.value = withSequence(
        withSpring(1.05, {
          damping: ANIMATION.spring.damping,
          stiffness: ANIMATION.spring.stiffness,
        }),
        withSpring(1, {
          damping: ANIMATION.spring.damping,
          stiffness: ANIMATION.spring.stiffness,
        })
      );
      runOnJS(triggerCompletionHaptic)();
    }

    prevProgress.value = progress;
  }, [progress, animatedProgress, ringScale, prevProgress, triggerCompletionHaptic]);

  // Animated props for progress stroke
  const animatedStrokeProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - animatedProgress.value);
    return {
      strokeDashoffset,
    };
  });

  // Animated style for pulse effect
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
  }));

  // Determine stroke color
  const strokeColor = color || palette.tint;
  return (
    <Animated.View style={[styles.container, { width: size, height: size }, containerAnimatedStyle]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background circle (track) */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={palette.border}
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Progress circle */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeLinecap="round"
          rotation={-90}
          origin={`${center}, ${center}`}
          animatedProps={animatedStrokeProps}
        />
      </Svg>

      {/* Center content slot */}
      <View style={styles.centerContent}>{children}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
    transform: [{ rotateY: '180deg' }], // Flip to make progress go clockwise
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
