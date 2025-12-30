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

import Colors from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';

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

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
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
