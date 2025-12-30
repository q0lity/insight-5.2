import React, { useMemo, useState } from 'react';
import { Image, Pressable, type PressableStateCallbackType, StyleSheet, TextInput } from 'react-native';

import Colors from '@/constants/Colors';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import type { InboxCapture } from '@/src/storage/inbox';
import { listInboxCaptures } from '@/src/storage/inbox';

type Msg = { id: string; role: 'user' | 'assistant'; content: string };

function localSearchAnswer(query: string, captures: InboxCapture[]) {
  const q = query.trim().toLowerCase();
  if (!q) return 'Ask a question or search for a keyword.';
  const hits = captures.filter((c) => c.rawText.toLowerCase().includes(q)).slice(0, 5);
  if (hits.length === 0) return `## No matches\nTry a different keyword or add a new capture.`;
  const lines = hits.map(
    (h) => `- ${new Date(h.createdAt).toLocaleString()} — ${h.rawText.slice(0, 80)}…`
  );
  return [`## Top matches for "${query}"`, ...lines].join('\n');
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={`b-${idx}`} style={styles.bold}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <Text key={`c-${idx}`} style={styles.inlineCode}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    return <Text key={`t-${idx}`}>{part}</Text>;
  });
}

function renderMarkdown(content: string) {
  const lines = content.split(/\r?\n/);
  const nodes: React.ReactNode[] = [];
  let inCode = false;
  let codeBuffer: string[] = [];

  lines.forEach((line, idx) => {
    if (line.trim().startsWith('```')) {
      if (inCode) {
        nodes.push(
          <View key={`code-${idx}`} style={styles.codeBlock}>
            <Text style={styles.codeText}>{codeBuffer.join('\n')}</Text>
          </View>
        );
        codeBuffer = [];
      }
      inCode = !inCode;
      return;
    }

    if (inCode) {
      codeBuffer.push(line);
      return;
    }

    if (!line.trim()) {
      nodes.push(<View key={`spacer-${idx}`} style={styles.spacer} />);
      return;
    }
    const imageMatch = line.match(/^!\[(.*?)\]\((.*?)\)\s*$/);
    if (imageMatch) {
      nodes.push(
        <View key={`img-${idx}`} style={styles.imageBlock}>
          <Image source={{ uri: imageMatch[2] }} style={styles.image} />
          {imageMatch[1] ? <Text style={styles.imageCaption}>{imageMatch[1]}</Text> : null}
        </View>
      );
      return;
    }
    if (line.startsWith('### ')) {
      nodes.push(
        <Text key={`h3-${idx}`} style={styles.h3}>
          {renderInlineMarkdown(line.replace(/^###\s+/, ''))}
        </Text>
      );
      return;
    }
    if (line.startsWith('## ')) {
      nodes.push(
        <Text key={`h2-${idx}`} style={styles.h2}>
          {renderInlineMarkdown(line.replace(/^##\s+/, ''))}
        </Text>
      );
      return;
    }
    if (line.startsWith('# ')) {
      nodes.push(
        <Text key={`h1-${idx}`} style={styles.h1}>
          {renderInlineMarkdown(line.replace(/^#\s+/, ''))}
        </Text>
      );
      return;
    }
    if (line.startsWith('- ')) {
      const body = line.replace(/^-+\s*/, '');
      nodes.push(
        <Text key={`li-${idx}`} style={styles.paragraph}>
          - {renderInlineMarkdown(body)}
        </Text>
      );
      return;
    }
    nodes.push(
      <Text key={`p-${idx}`} style={styles.paragraph}>
        {renderInlineMarkdown(line)}
      </Text>
    );
  });

  return nodes;
}

export default function ExploreScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const captures = useMemo(() => {
    return [] as InboxCapture[];
  }, []);

  async function onSend() {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    try {
      const userMsg: Msg = { id: `${Date.now()}_u`, role: 'user', content: text };
      const answer = localSearchAnswer(text, captures.length ? captures : await listInboxCaptures());
      const assistantMsg: Msg = { id: `${Date.now()}_a`, role: 'assistant', content: answer };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={styles.topRow}>
        <View
          style={[
            styles.nodeBadge,
            { borderColor: colorScheme === 'dark' ? 'rgba(148,163,184,0.24)' : 'rgba(28,28,30,0.1)' },
          ]}>
          <Text style={styles.nodeBadgeText}>1</Text>
        </View>
        <Text style={styles.topMeta}>Explore</Text>
      </View>

      <View style={[styles.chat, { borderColor: colorScheme === 'dark' ? 'rgba(148,163,184,0.18)' : 'rgba(28,28,30,0.08)' }]}>
        {messages.length === 0 ? (
          <Text style={styles.empty}>Ask: “Show #mood entries” or “What did I log about driving?”</Text>
        ) : (
          messages.map((m) => (
            <View
              key={m.id}
              style={[
                styles.bubble,
                m.role === 'user' ? styles.userBubble : styles.assistantBubble,
                {
                  borderColor: m.role === 'user'
                    ? 'rgba(217,93,57,0.45)'
                    : colorScheme === 'dark'
                      ? 'rgba(148,163,184,0.16)'
                      : 'rgba(28,28,30,0.08)',
                },
              ]}>
              <Text style={styles.bubbleRole}>{m.role === 'user' ? 'You' : 'Insight'}</Text>
              {m.role === 'assistant' ? (
                <View style={styles.markdown}>{renderMarkdown(m.content)}</View>
              ) : (
                <Text style={styles.bubbleText}>{m.content}</Text>
              )}
            </View>
          ))
        )}
      </View>

      <View style={styles.metaChips}>
        {['#tags', '@people', '@places', '+context', 'attachments'].map((chip) => (
          <View key={chip} style={styles.chip}>
            <Text style={styles.chipText}>{chip}</Text>
          </View>
        ))}
      </View>

      <View style={styles.composer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder='Ask: "show me mentions of groceries"'
          placeholderTextColor={colorScheme === 'dark' ? 'rgba(148,163,184,0.6)' : 'rgba(28,28,30,0.35)'}
          style={[
            styles.input,
            {
              color: palette.text,
              borderColor: colorScheme === 'dark' ? 'rgba(148,163,184,0.24)' : 'rgba(28,28,30,0.1)',
            },
          ]}
          multiline
        />
        <Pressable
          onPress={onSend}
          disabled={sending || !input.trim()}
          style={({ pressed }: PressableStateCallbackType) => [
            styles.send,
            pressed && { opacity: 0.9 },
            (sending || !input.trim()) && styles.sendDisabled,
          ]}>
          <Text style={styles.sendText}>{sending ? 'Searching…' : 'Send'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nodeBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(217,93,57,0.12)',
  },
  nodeBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#D95D39',
  },
  topMeta: {
    fontWeight: '600',
    opacity: 0.7,
  },
  chat: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  empty: {
    opacity: 0.7,
  },
  bubble: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(217,93,57,0.12)',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  bubbleRole: {
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontWeight: '700',
    opacity: 0.7,
  },
  bubbleText: {
    lineHeight: 20,
  },
  markdown: {
    gap: 6,
  },
  h1: {
    fontSize: 20,
    fontWeight: '800',
  },
  h2: {
    fontSize: 18,
    fontWeight: '700',
  },
  h3: {
    fontSize: 16,
    fontWeight: '700',
  },
  paragraph: {
    lineHeight: 20,
  },
  bold: {
    fontWeight: '800',
  },
  inlineCode: {
    fontFamily: 'SpaceMono',
    backgroundColor: 'rgba(217,93,57,0.12)',
  },
  spacer: {
    height: 6,
  },
  codeBlock: {
    borderRadius: 12,
    padding: 10,
    backgroundColor: 'rgba(28,28,30,0.08)',
  },
  codeText: {
    fontFamily: 'SpaceMono',
    fontSize: 13,
    lineHeight: 18,
  },
  imageBlock: {
    gap: 6,
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: 'rgba(28,28,30,0.08)',
  },
  imageCaption: {
    fontSize: 12,
    opacity: 0.7,
  },
  metaChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(217,93,57,0.12)',
  },
  chipText: {
    fontWeight: '600',
    color: '#D95D39',
  },
  composer: {
    gap: 10,
  },
  input: {
    minHeight: 60,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    textAlignVertical: 'top',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  send: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D95D39',
  },
  sendDisabled: {
    opacity: 0.6,
  },
  sendText: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
