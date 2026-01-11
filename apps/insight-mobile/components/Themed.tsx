import { Text as DefaultText, View as DefaultView, TextProps, ViewProps } from 'react-native';
import { useTheme } from '@/src/state/theme';

export function Text(props: TextProps) {
  const { palette } = useTheme();
  const { style, ...otherProps } = props;

  return <DefaultText style={[{ color: palette.text }, style]} {...otherProps} />;
}

export function View(props: ViewProps) {
  const { style, ...otherProps } = props;

  return <DefaultView style={[{ backgroundColor: 'transparent' }, style]} {...otherProps} />;
}
