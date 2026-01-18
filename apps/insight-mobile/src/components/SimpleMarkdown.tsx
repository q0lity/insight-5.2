import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/src/state/theme';

type MarkdownProps = {
  children: string;
  baseSize?: number;
};

type Block =
  | { type: 'paragraph'; content: string }
  | { type: 'heading'; level: number; content: string }
  | { type: 'code'; language?: string; content: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'blockquote'; content: string };

function parseBlocks(text: string): Block[] {
  const lines = text.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'code', language: lang || undefined, content: codeLines.join('\n') });
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({ type: 'heading', level: headingMatch[1].length, content: headingMatch[2] });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      blocks.push({ type: 'blockquote', content: quoteLines.join('\n') });
      continue;
    }

    // Unordered list
    if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s/, ''));
        i++;
      }
      blocks.push({ type: 'list', ordered: false, items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      blocks.push({ type: 'list', ordered: true, items });
      continue;
    }

    // Empty line - skip
    if (!line.trim()) {
      i++;
      continue;
    }

    // Paragraph - collect consecutive non-empty lines
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() && !lines[i].startsWith('#') && !lines[i].startsWith('```') && !lines[i].startsWith('> ') && !/^[-*]\s/.test(lines[i]) && !/^\d+\.\s/.test(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length) {
      blocks.push({ type: 'paragraph', content: paraLines.join(' ') });
    }
  }

  return blocks;
}

function InlineText({ content, style, baseSize }: { content: string; style?: any; baseSize: number }) {
  const { palette, isDark } = useTheme();

  // Parse inline elements: **bold**, *italic*, `code`, [link](url)
  const parts: React.ReactNode[] = [];
  let remaining = content;
  let key = 0;

  const patterns = [
    { regex: /\*\*(.+?)\*\*/g, type: 'bold' },
    { regex: /\*(.+?)\*/g, type: 'italic' },
    { regex: /`(.+?)`/g, type: 'code' },
    { regex: /\[([^\]]+)\]\([^)]+\)/g, type: 'link' },
  ];

  // Simple approach: just render with inline styles
  let lastIndex = 0;
  const allMatches: { start: number; end: number; type: string; text: string }[] = [];

  // Bold
  for (const match of content.matchAll(/\*\*(.+?)\*\*/g)) {
    allMatches.push({ start: match.index!, end: match.index! + match[0].length, type: 'bold', text: match[1] });
  }

  // Italic (not inside bold)
  for (const match of content.matchAll(/(?<!\*)\*([^*]+)\*(?!\*)/g)) {
    allMatches.push({ start: match.index!, end: match.index! + match[0].length, type: 'italic', text: match[1] });
  }

  // Code
  for (const match of content.matchAll(/`([^`]+)`/g)) {
    allMatches.push({ start: match.index!, end: match.index! + match[0].length, type: 'code', text: match[1] });
  }

  // Sort by start position
  allMatches.sort((a, b) => a.start - b.start);

  // Remove overlapping matches
  const filtered: typeof allMatches = [];
  for (const m of allMatches) {
    const overlaps = filtered.some((f) => m.start < f.end && m.end > f.start);
    if (!overlaps) filtered.push(m);
  }

  // Build output
  let pos = 0;
  for (const m of filtered) {
    if (m.start > pos) {
      parts.push(<Text key={key++} style={[style, { fontSize: baseSize }]}>{content.slice(pos, m.start)}</Text>);
    }
    if (m.type === 'bold') {
      parts.push(<Text key={key++} style={[style, { fontSize: baseSize, fontWeight: '700' }]}>{m.text}</Text>);
    } else if (m.type === 'italic') {
      parts.push(<Text key={key++} style={[style, { fontSize: baseSize, fontStyle: 'italic' }]}>{m.text}</Text>);
    } else if (m.type === 'code') {
      parts.push(
        <Text
          key={key++}
          style={[
            style,
            {
              fontSize: baseSize - 1,
              fontFamily: 'SpaceMono',
              backgroundColor: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(0,0,0,0.06)',
              paddingHorizontal: 4,
              borderRadius: 6,
            },
          ]}
        >
          {m.text}
        </Text>
      );
    }
    pos = m.end;
  }

  if (pos < content.length) {
    parts.push(<Text key={key++} style={[style, { fontSize: baseSize }]}>{content.slice(pos)}</Text>);
  }

  return <Text style={style}>{parts.length ? parts : content}</Text>;
}

export function SimpleMarkdown({ children, baseSize = 15 }: MarkdownProps) {
  const { palette, isDark } = useTheme();

  const blocks = useMemo(() => parseBlocks(children), [children]);

  return (
    <View style={styles.container}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'heading': {
            const sizes = [24, 20, 18, 16, 15, 14];
            const size = sizes[block.level - 1] ?? 14;
            return (
              <Text key={idx} style={[styles.heading, { color: palette.text, fontSize: size }]}>
                {block.content}
              </Text>
            );
          }

          case 'code':
            return (
              <View
                key={idx}
                style={[
                  styles.codeBlock,
                  { backgroundColor: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(0,0,0,0.04)' },
                ]}
              >
                <Text style={[styles.codeText, { color: palette.text }]}>{block.content}</Text>
              </View>
            );

          case 'blockquote':
            return (
              <View
                key={idx}
                style={[styles.blockquote, { borderLeftColor: palette.tint }]}
              >
                <InlineText
                  content={block.content}
                  style={[styles.paragraph, { color: palette.textSecondary }]}
                  baseSize={baseSize}
                />
              </View>
            );

          case 'list':
            return (
              <View key={idx} style={styles.list}>
                {block.items.map((item, i) => (
                  <View key={i} style={styles.listItem}>
                    <Text style={[styles.bullet, { color: palette.tint }]}>
                      {block.ordered ? `${i + 1}.` : '\u2022'}
                    </Text>
                    <InlineText
                      content={item}
                      style={[styles.paragraph, { color: palette.text, flex: 1 }]}
                      baseSize={baseSize}
                    />
                  </View>
                ))}
              </View>
            );

          case 'paragraph':
          default:
            return (
              <InlineText
                key={idx}
                content={block.content}
                style={[styles.paragraph, { color: palette.text }]}
                baseSize={baseSize}
              />
            );
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 7,
  },
  heading: {
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 15,
    fontFamily: 'Figtree',
  },
  codeBlock: {
    borderRadius: 7,
    padding: 8,
  },
  codeText: {
    fontFamily: 'SpaceMono',
    fontSize: 9,
    lineHeight: 14,
  },
  blockquote: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    paddingVertical: 4,
  },
  list: {
    gap: 4,
  },
  listItem: {
    flexDirection: 'row',
    gap: 6,
  },
  bullet: {
    fontWeight: '700',
    width: 12,
  },
});
