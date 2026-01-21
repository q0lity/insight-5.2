import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Text } from './Themed';
import { useTheme } from '@/src/state/theme';

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'default' | 'lg';
  label?: string;
  description?: string;
  style?: ViewStyle;
}

const sizeConfig = {
  sm: {
    trackWidth: 36,
    trackHeight: 20,
    thumbSize: 16,
    translateX: 16,
    iconSize: 10,
  },
  default: {
    trackWidth: 44,
    trackHeight: 24,
    thumbSize: 20,
    translateX: 20,
    iconSize: 12,
  },
  lg: {
    trackWidth: 56,
    trackHeight: 28,
    thumbSize: 24,
    translateX: 28,
    iconSize: 14,
  },
};

export function Switch({
  value,
  onValueChange,
  disabled = false,
  size = 'default',
  label,
  description,
  style,
}: SwitchProps) {
  const { palette } = useTheme();
  const config = sizeConfig[size];

  const progress = useSharedValue(value ? 1 : 0);
  const scale = useSharedValue(1);

  // Animate on value change
  React.useEffect(() => {
    progress.value = withSpring(value ? 1 : 0, {
      damping: 15,
      stiffness: 300,
    });
  }, [value, progress]);

  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handlePress = useCallback(() => {
    if (disabled) return;
    runOnJS(triggerHaptic)();
    onValueChange(!value);
  }, [disabled, onValueChange, value, triggerHaptic]);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, [scale]);

  const trackAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      [palette.border, palette.tint]
    );
    return {
      backgroundColor,
      transform: [{ scale: scale.value }],
    };
  }, [palette]);

  const thumbAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: progress.value * config.translateX },
        { scale: 0.9 + progress.value * 0.1 },
      ],
    };
  }, [config.translateX]);

  const checkAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,
      transform: [{ scale: progress.value }],
    };
  });

  const switchElement = (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Animated.View
        style={[
          styles.track,
          {
            width: config.trackWidth,
            height: config.trackHeight,
            borderRadius: config.trackHeight / 2,
            opacity: disabled ? 0.5 : 1,
          },
          trackAnimatedStyle,
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            {
              width: config.thumbSize,
              height: config.thumbSize,
              borderRadius: config.thumbSize / 2,
              shadowColor: palette.text,
            },
            thumbAnimatedStyle,
          ]}
        >
          {/* Check icon */}
          <Animated.View style={[styles.checkContainer, checkAnimatedStyle]}>
            <Text
              style={[
                styles.checkIcon,
                { color: palette.tint, fontSize: config.iconSize },
              ]}
            >
              ✓
            </Text>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );

  if (label || description) {
    return (
      <View style={[styles.container, style]}>
        <Pressable
          onPress={handlePress}
          disabled={disabled}
          style={styles.labelContainer}
        >
          {label && (
            <Text
              style={[
                styles.label,
                { color: disabled ? palette.textSecondary : palette.text },
              ]}
            >
              {label}
            </Text>
          )}
          {description && (
            <Text style={[styles.description, { color: palette.textSecondary }]}>
              {description}
            </Text>
          )}
        </Pressable>
        {switchElement}
      </View>
    );
  }

  return switchElement;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  labelContainer: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  description: {
    fontSize: 12,
    fontFamily: 'Figtree',
  },
  track: {
    padding: 2,
    justifyContent: 'center',
  },
  thumb: {
    backgroundColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    fontWeight: '700',
  },
});
