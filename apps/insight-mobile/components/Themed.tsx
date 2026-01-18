import { Text as DefaultText, View as DefaultView, TextProps, ViewProps, StyleSheet } from 'react-native';
import { useTheme } from '@/src/state/theme';

export function Text(props: TextProps) {
  const { palette, sizes } = useTheme();
  const { style, ...otherProps } = props;
  const flattened = StyleSheet.flatten(style) ?? {};
  const rawWeight = flattened?.fontWeight;
  const fontWeight =
    typeof rawWeight === 'number'
      ? rawWeight
      : typeof rawWeight === 'string'
        ? Number.parseInt(rawWeight, 10)
        : 400;
  const fontSize = typeof flattened?.fontSize === 'number' ? flattened.fontSize : sizes.bodyText;
  const wantsDisplay = Number.isFinite(fontWeight) && fontWeight >= 700;
  const baseFamily = flattened?.fontFamily;
  const isFigtreeFamily =
    typeof baseFamily === 'string' && baseFamily.toLowerCase().startsWith('figtree');
  const useDisplay = wantsDisplay && fontSize >= sizes.sectionTitle;
  const resolvedFamily =
    baseFamily && !isFigtreeFamily
      ? baseFamily
      : useDisplay
        ? 'SpaceGrotesk_600SemiBold'
        : 'Figtree';

  return (
    <DefaultText
      style={[
        {
          color: palette.text,
          fontFamily: resolvedFamily,
          fontSize: sizes.bodyText,
          letterSpacing: useDisplay ? -0.2 : 0,
        },
        style,
      ]}
      {...otherProps}
    />
  );
}

export function View(props: ViewProps) {
  const { style, ...otherProps } = props;

  return <DefaultView style={[{ backgroundColor: 'transparent' }, style]} {...otherProps} />;
}
