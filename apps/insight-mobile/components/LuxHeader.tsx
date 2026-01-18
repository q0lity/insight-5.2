import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { Text } from '@/components/Themed';
import { useTheme } from '@/src/state/theme';

type LuxHeaderProps = ViewProps & {
  title: string;
  subtitle?: string;
  overline?: string;
  right?: React.ReactNode;
  showDivider?: boolean;
};

export function LuxHeader({
  title,
  subtitle,
  overline,
  right,
  showDivider = false,
  style,
  ...props
}: LuxHeaderProps) {
  const { palette, sizes } = useTheme();

  return (
    <View style={[styles.container, style]} {...props}>
      <View style={styles.titleBlock}>
        {overline ? (
          <View style={styles.overlineRow}>
            <View style={[styles.accent, { backgroundColor: palette.tint }]} />
            <Text style={[styles.overlineText, { color: palette.textSecondary }]}>
              {overline}
            </Text>
          </View>
        ) : null}
        <Text style={[styles.title, { color: palette.text, fontSize: sizes.headerTitle + 8 }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.rightSlot}>{right}</View> : null}
      {showDivider ? (
        <View style={[styles.divider, { backgroundColor: palette.borderLight }]} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  titleBlock: {
    gap: 3,
  },
  overlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accent: {
    width: 18,
    height: 2,
    borderRadius: 1,
  },
  overlineText: {
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '600',
  },
  rightSlot: {
    alignSelf: 'flex-start',
  },
  divider: {
    height: 1,
    borderRadius: 1,
    opacity: 0.6,
  },
});
