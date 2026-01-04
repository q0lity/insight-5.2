import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, TextStyle, View, ViewStyle } from 'react-native';

import { Text } from '@/components/Themed';
import { useAnimatedNumber } from '@/src/utils/useAnimatedNumber';

type RollingNumberProps = {
  value: number | string;
  durationMs?: number;
  textStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  prefix?: string;
  suffix?: string;
};

function normalizeValue(value: number | string) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '0';
  }
  const text = String(value ?? '').trim();
  return text.length ? text : '0';
}

export function RollingNumber({
  value,
  durationMs = 100,
  textStyle,
  containerStyle,
  prefix,
  suffix,
}: RollingNumberProps) {
  const rawValue = useMemo(() => normalizeValue(value), [value]);
  const flattened = StyleSheet.flatten(textStyle) ?? {};
  const textColor = typeof flattened.color === 'string' ? flattened.color : undefined;

  const numericValue = Number(rawValue);
  const decimalCount = useMemo(() => {
    const match = rawValue.match(/\.(\d+)$/);
    return match ? match[1].length : 0;
  }, [rawValue]);
  const animatedValue = useAnimatedNumber(Number.isFinite(numericValue) ? numericValue : 0, { durationMs });
  const displayValue = useMemo(() => {
    if (!Number.isFinite(numericValue)) return rawValue;
    if (decimalCount <= 0) return String(Math.round(animatedValue));
    return animatedValue.toFixed(decimalCount);
  }, [animatedValue, decimalCount, numericValue, rawValue]);

  const blurColor = useMemo(() => {
    if (!textColor) return 'rgba(0,0,0,0.25)';
    if (textColor.startsWith('#')) {
      const raw = textColor.slice(1);
      const value = raw.length === 3 ? raw.split('').map((ch) => ch + ch).join('') : raw;
      if (value.length === 6) {
        const r = parseInt(value.slice(0, 2), 16);
        const g = parseInt(value.slice(2, 4), 16);
        const b = parseInt(value.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, 0.35)`;
      }
    }
    return textColor;
  }, [textColor]);

  const [leading, lastDigit] = useMemo(() => {
    const match = displayValue.match(/^(.*?)(\d)$/);
    if (!match) return [displayValue, ''];
    return [match[1], match[2]];
  }, [displayValue]);
  const blurStyle = useMemo(
    () => ({
      textShadowColor: blurColor,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 10,
    }),
    [blurColor]
  );
  const resolvedTextStyle = useMemo(
    () => [styles.baseText, textStyle, { fontVariant: ['tabular-nums'] }],
    [textStyle]
  );

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={resolvedTextStyle}>
        {prefix ?? ''}
        {leading}
        {lastDigit ? <Text style={[resolvedTextStyle, blurStyle]}>{lastDigit}</Text> : null}
        {suffix ?? ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  baseText: {
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
