import { useState, useCallback } from 'react';
import {
  TextInput,
  TextInputProps,
  StyleSheet,
  View,
  Pressable,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Text } from './Themed';
import { useTheme } from '@/src/state/theme';

const AnimatedView = Animated.createAnimatedComponent(View);

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  success?: boolean;
  hint?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  onClear?: () => void;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  success,
  hint,
  prefix,
  suffix,
  onClear,
  containerStyle,
  style,
  onFocus,
  onBlur,
  value,
  ...props
}: InputProps) {
  const { palette, sizes } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  // Animation values
  const focusProgress = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const ringScale = useSharedValue(1);

  // Shake animation for errors
  const triggerShake = useCallback(() => {
    shakeX.value = withSequence(
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(6, { duration: 50 }),
      withTiming(-4, { duration: 50 }),
      withTiming(4, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  }, [shakeX]);

  // Focus animation handler
  const handleFocus = useCallback(
    (e: any) => {
      setIsFocused(true);
      focusProgress.value = withSpring(1, { damping: 15, stiffness: 200 });
      ringScale.value = withSequence(
        withSpring(1.02, { damping: 12, stiffness: 300 }),
        withSpring(1, { damping: 15, stiffness: 200 })
      );
      onFocus?.(e);
    },
    [focusProgress, ringScale, onFocus]
  );

  const handleBlur = useCallback(
    (e: any) => {
      setIsFocused(false);
      focusProgress.value = withSpring(0, { damping: 15, stiffness: 200 });
      onBlur?.(e);
    },
    [focusProgress, onBlur]
  );

  // Animated styles
  const containerAnimatedStyle = useAnimatedStyle(() => {
    const borderColor = error
      ? palette.error
      : success
      ? palette.success || '#22c55e'
      : interpolateColor(
          focusProgress.value,
          [0, 1],
          [palette.border, palette.tint]
        );

    return {
      borderColor,
      transform: [{ translateX: shakeX.value }, { scale: ringScale.value }],
      shadowColor: isFocused ? palette.tint : 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: focusProgress.value * 0.3,
      shadowRadius: focusProgress.value * 8,
    };
  }, [error, success, isFocused, palette]);

  // Trigger shake when error changes
  if (error) {
    triggerShake();
  }

  const showClear = onClear && value && String(value).length > 0;

  return (
    <View style={[styles.container, { gap: sizes.spacingSmall }, containerStyle]}>
      {label && (
        <Text
          style={[
            styles.label,
            {
              color: error ? palette.error : isFocused ? palette.tint : palette.text,
              fontSize: sizes.smallText,
            },
          ]}
        >
          {label}
        </Text>
      )}
      <AnimatedView
        style={[
          styles.inputWrapper,
          {
            backgroundColor: palette.surface,
            height: sizes.buttonHeightSmall,
            borderRadius: sizes.borderRadiusSmall,
          },
          containerAnimatedStyle,
        ]}
      >
        {prefix && <View style={styles.prefixContainer}>{prefix}</View>}
        <TextInput
          placeholderTextColor={palette.textSecondary}
          style={[
            styles.input,
            {
              color: palette.text,
              fontSize: sizes.bodyText,
              paddingLeft: prefix ? 4 : sizes.spacing + 4,
              paddingRight: suffix || showClear ? 4 : sizes.spacing + 4,
            },
            style,
          ]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          value={value}
          {...props}
        />
        {success && !suffix && !showClear && (
          <View style={styles.suffixContainer}>
            <Text style={[styles.successIcon, { color: palette.success || '#22c55e' }]}>✓</Text>
          </View>
        )}
        {showClear && !suffix && (
          <Pressable
            onPress={onClear}
            style={[styles.clearButton, { backgroundColor: palette.borderLight }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.clearIcon, { color: palette.textSecondary }]}>×</Text>
          </Pressable>
        )}
        {suffix && <View style={styles.suffixContainer}>{suffix}</View>}
      </AnimatedView>
      {(error || hint) && (
        <Text
          style={[
            styles.helperText,
            {
              color: error ? palette.error : palette.textSecondary,
              fontSize: sizes.tinyText + 2,
            },
          ]}
        >
          {error || hint}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  label: {
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    overflow: 'hidden',
  },
  prefixContainer: {
    paddingLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suffixContainer: {
    paddingRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontFamily: 'Figtree',
    height: '100%',
  },
  helperText: {
    fontFamily: 'Figtree',
  },
  successIcon: {
    fontSize: 16,
    fontWeight: '700',
  },
  clearButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  clearIcon: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
});
