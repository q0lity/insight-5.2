import React from 'react';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { Text } from '@/components/Themed';
import { useTheme } from '@/src/state/theme';

type LuxPillVariant = 'neutral' | 'accent' | 'ghost';

type LuxPillProps = PressableProps & {
  label: string;
  active?: boolean;
  variant?: LuxPillVariant;
};

export function LuxPill({
  label,
  active = false,
  variant = 'neutral',
  style,
  ...props
}: LuxPillProps) {
  const { palette } = useTheme();

  const background =
    variant === 'accent'
      ? palette.tintLight
      : variant === 'ghost'
        ? 'transparent'
        : palette.panelAlpha;
  const borderColor = active ? palette.tintBorder : palette.border;
  const textColor = active ? palette.tint : palette.textSecondary;

  return (
    <Pressable
      style={[
        styles.pill,
        {
          backgroundColor: active ? palette.tintLight : background,
          borderColor: borderColor,
        },
        style,
      ]}
      {...props}
    >
      <Text style={[styles.label, { color: active ? palette.tint : textColor }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  label: {
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
