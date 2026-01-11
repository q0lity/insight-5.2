/**
 * Themed Components
 *
 * Re-usable themed versions of common React Native components.
 * These automatically use the current theme's colors.
 */
import React from 'react';
import { Text as RNText, View as RNView, TextProps, ViewProps } from 'react-native';
import { useTheme } from '@/src/state/theme';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
};

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function Text(props: ThemedTextProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const { palette, isDark } = useTheme();
  const color = isDark ? darkColor ?? palette.text : lightColor ?? palette.text;

  return <RNText style={[{ color }, style]} {...otherProps} />;
}

export function View(props: ThemedViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const { palette, isDark } = useTheme();
  const backgroundColor = isDark ? darkColor ?? palette.background : lightColor ?? palette.background;

  return <RNView style={[{ backgroundColor }, style]} {...otherProps} />;
}
