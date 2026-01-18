import React from 'react';
import { StyleSheet, View, type ViewProps, type ViewStyle, type StyleProp } from 'react-native';
import { MotiPressable } from 'moti/interactions';
import { useTheme } from '@/src/state/theme';

type LuxCardProps = {
  style?: StyleProp<ViewStyle>;
  accent?: string;
  pressable?: boolean;
  onPress?: () => void;
  children?: React.ReactNode;
  testID?: string;
};

export function LuxCard({ style, accent, pressable, onPress, children, testID }: LuxCardProps) {
  const { palette, sizes } = useTheme();
  const edgeColor = accent ?? palette.borderLight;

  const containerStyle = [
    styles.container,
    {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: sizes.borderRadius,
      padding: sizes.cardPadding,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },
    style,
  ];

  const content = (
    <>
      <View pointerEvents="none" style={[styles.edge, { backgroundColor: edgeColor }]} />
      {children}
    </>
  );

  if (pressable) {
    return (
      <MotiPressable
        onPress={onPress}
        animate={({ pressed }) => {
          'worklet';
          return {
            scale: pressed ? 0.98 : 1,
          };
        }}
        transition={{
          type: 'timing',
          duration: 100,
        }}
        testID={testID}
        style={containerStyle}
      >
        {content}
      </MotiPressable>
    );
  }

  return (
    <View style={containerStyle} testID={testID}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  edge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.7,
  },
});
