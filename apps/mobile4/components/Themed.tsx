/**
 * Learn more about Light and Dark modes:
 * https://docs.expo.io/guides/color-schemes/
 */

import {
  Text as DefaultText,
  type TextProps as RNTextProps,
  StyleSheet,
  View as DefaultView,
  type ViewProps as RNViewProps,
} from 'react-native';

import { useTheme, type ThemePalette } from '@/src/state/theme';

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type TextProps = ThemeProps & RNTextProps;
export type ViewProps = ThemeProps & RNViewProps;

const FIGTREE_FONT_MAP: Record<string, string> = {
  '100': 'Figtree_100Thin',
  '200': 'Figtree_200ExtraLight',
  '300': 'Figtree_300Light',
  '400': 'Figtree_400Regular',
  '500': 'Figtree_500Medium',
  '600': 'Figtree_600SemiBold',
  '700': 'Figtree_700Bold',
  '800': 'Figtree_800ExtraBold',
  '900': 'Figtree_900Black',
  normal: 'Figtree_400Regular',
  bold: 'Figtree_700Bold',
};

function resolveFontFamily(style?: RNTextProps['style']) {
  const flattened = StyleSheet.flatten(style) || {};
  const customFamily = flattened.fontFamily;
  const weight = flattened.fontWeight ? String(flattened.fontWeight) : '400';
  return customFamily ?? FIGTREE_FONT_MAP[weight] ?? FIGTREE_FONT_MAP['400'];
}

/**
 * Returns the appropriate color from the theme palette.
 * If lightColor/darkColor props are provided, those take precedence.
 * Otherwise falls back to the theme palette color.
 */
export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof ThemePalette
) {
  const { palette, isDark } = useTheme();
  const colorFromProps = isDark ? props.dark : props.light;

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return palette[colorName];
  }
}

export function Text(props: TextProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const fontFamily = resolveFontFamily(style);

  return <DefaultText style={[{ color }, style, { fontFamily }]} {...otherProps} />;
}

export function View(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  return <DefaultView style={[{ backgroundColor }, style]} {...otherProps} />;
}
