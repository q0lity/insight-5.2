import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { useTheme } from '@/src/state/theme';

type ScreenProps = ViewProps & {
  glow?: boolean;
};

export function Screen({ children, style, ...props }: ScreenProps) {
  const { palette } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: palette.background }, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
