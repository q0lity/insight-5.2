import React, { useMemo, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type NativeSyntheticEvent,
  type TextInputScrollEventData,
  View,
} from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type Props = {
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  minHeight?: number;
};

type Token = {
  text: string;
  style: object;
};

function splitComment(line: string) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    if (ch === '"' && !inSingle) inDouble = !inDouble;
    if (ch === '#' && !inSingle && !inDouble) {
      return { code: line.slice(0, i), comment: line.slice(i) };
    }
  }
  return { code: line, comment: '' };
}

function valueTokens(value: string, styles: Record<string, object>): Token[] {
  if (!value) return [{ text: value, style: styles.plain }];
  const trimmed = value.trimStart();
  const leading = value.slice(0, value.length - trimmed.length);
  const tokens: Token[] = [];
  if (leading) tokens.push({ text: leading, style: styles.plain });
  if (!trimmed) return tokens;

  if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
    tokens.push({ text: trimmed, style: styles.string });
    return tokens;
  }

  const boolMatch = trimmed.match(/^(true|false|null)\b/i);
  if (boolMatch) {
    tokens.push({ text: boolMatch[1], style: styles.bool });
    tokens.push({ text: trimmed.slice(boolMatch[1].length), style: styles.plain });
    return tokens;
  }

  const numberMatch = trimmed.match(/^-?\d+(\.\d+)?\b/);
  if (numberMatch) {
    tokens.push({ text: numberMatch[0], style: styles.number });
    tokens.push({ text: trimmed.slice(numberMatch[0].length), style: styles.plain });
    return tokens;
  }

  tokens.push({ text: trimmed, style: styles.plain });
  return tokens;
}

function highlightLine(line: string, styles: Record<string, object>, key: string) {
  const { code, comment } = splitComment(line);
  const indentMatch = code.match(/^\s*/);
  const indent = indentMatch?.[0] ?? '';
  let rest = code.slice(indent.length);
  const parts: Token[] = [];

  if (indent) parts.push({ text: indent, style: styles.plain });

  if (rest.startsWith('- ')) {
    parts.push({ text: '- ', style: styles.punct });
    rest = rest.slice(2);
  }

  const keyMatch = rest.match(/^([A-Za-z0-9_-]+)(\s*:\s*)(.*)$/);
  if (keyMatch) {
    parts.push({ text: keyMatch[1], style: styles.key });
    parts.push({ text: keyMatch[2], style: styles.punct });
    parts.push(...valueTokens(keyMatch[3], styles));
  } else if (rest) {
    parts.push({ text: rest, style: styles.plain });
  }

  if (comment) {
    parts.push({ text: comment, style: styles.comment });
  }

  return (
    <Text key={key} style={styles.line}>
      {parts.map((part, idx) => (
        <Text key={`${key}-${idx}`} style={part.style}>
          {part.text}
        </Text>
      ))}
    </Text>
  );
}

export default function YamlEditor({ value, onChangeText, placeholder, minHeight = 140 }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const scrollRef = useRef<ScrollView | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          minHeight,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colorScheme === 'dark' ? 'rgba(148,163,184,0.24)' : 'rgba(28,28,30,0.1)',
          backgroundColor: 'rgba(255,255,255,0.04)',
          overflow: 'hidden',
        },
        input: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          padding: 12,
          color: 'transparent',
          textAlignVertical: 'top',
          fontFamily: 'SpaceMono',
          fontSize: 14,
          lineHeight: 20,
          caretColor: palette.text,
        },
        highlight: {
          padding: 12,
        },
        line: {
          fontFamily: 'SpaceMono',
          fontSize: 14,
          lineHeight: 20,
          color: palette.text,
        },
        plain: {
          color: palette.text,
        },
        key: {
          color: colorScheme === 'dark' ? '#F5A37B' : '#D95D39',
          fontWeight: '700',
        },
        punct: {
          color: colorScheme === 'dark' ? 'rgba(148,163,184,0.7)' : 'rgba(28,28,30,0.6)',
        },
        string: {
          color: colorScheme === 'dark' ? '#F5D27B' : '#9C4B2E',
        },
        bool: {
          color: colorScheme === 'dark' ? '#7AB4FF' : '#2F80ED',
        },
        number: {
          color: colorScheme === 'dark' ? '#A7E18B' : '#2F9E44',
        },
        comment: {
          color: colorScheme === 'dark' ? 'rgba(148,163,184,0.55)' : 'rgba(28,28,30,0.4)',
        },
        placeholder: {
          color: colorScheme === 'dark' ? 'rgba(148,163,184,0.6)' : 'rgba(28,28,30,0.35)',
        },
      }),
    [colorScheme, minHeight, palette.text]
  );

  const highlighted = useMemo(() => {
    const lines = value.split(/\r?\n/);
    return lines.map((line, idx) => highlightLine(line, styles as Record<string, object>, `l${idx}`));
  }, [value, styles]);

  const handleScroll = (event: NativeSyntheticEvent<TextInputScrollEventData>) => {
    scrollRef.current?.scrollTo({ y: event.nativeEvent.contentOffset.y, animated: false });
  };

  return (
    <View style={styles.container}>
      <ScrollView ref={scrollRef} scrollEnabled={false}>
        <View style={styles.highlight}>
          {value.length === 0 && placeholder ? (
            <Text style={[styles.line, styles.placeholder]}>{placeholder}</Text>
          ) : (
            highlighted
          )}
        </View>
      </ScrollView>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
        multiline
        onScroll={handleScroll}
        scrollEventThrottle={16}
        autoCorrect={false}
        autoCapitalize="none"
      />
    </View>
  );
}
