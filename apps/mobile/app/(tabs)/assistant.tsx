import React, { useMemo, useState } from 'react';
import { Pressable, type PressableStateCallbackType, StyleSheet, TextInput } from 'react-native';

import { Text, View } from '@/components/Themed';
import type { InboxCapture } from '@/src/storage/inbox';
import { listInboxCaptures } from '@/src/storage/inbox';

type Msg = { id: string; role: 'user' | 'assistant'; content: string };

function localSearchAnswer(query: string, captures: InboxCapture[]) {
  const q = query.trim().toLowerCase();
  if (!q) return 'Ask a question or search for a keyword.';
  const hits = captures.filter((c) => c.rawText.toLowerCase().includes(q)).slice(0, 5);
  if (hits.length === 0) return `No matches for "${query}" in your Inbox yet.`;
  const lines = hits.map((h) => `- ${new Date(h.createdAt).toLocaleString()} — ${h.rawText.slice(0, 80)}…`);
  return [`Top matches for "${query}":`, ...lines].join('\n');
}

export default function AssistantScreen() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');

  const captures = useMemo(() => {
    // Simple MVP: load once; desktop has a richer assistant.
    // Later: integrate Supabase + full RAG and actions.
    return [] as InboxCapture[];
  }, []);

  async function onSend() {
    const text = input.trim();
    if (!text) return;
    setInput('');
    const userMsg: Msg = { id: `${Date.now()}_u`, role: 'user', content: text };
    const answer = localSearchAnswer(text, captures.length ? captures : await listInboxCaptures());
    const assistantMsg: Msg = { id: `${Date.now()}_a`, role: 'assistant', content: answer };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.nodeBadge}>
          <Text style={styles.nodeBadgeText}>1</Text>
        </View>
        <Text style={styles.topMeta}>Assistant</Text>
      </View>
      <Text style={styles.subtitle}>Local search MVP (full spec in PRD Appendix I).</Text>

      <View style={styles.chat}>
        {messages.length === 0 ? (
          <Text style={styles.empty}>Ask: “Find #mood” or “What did I log about workouts?”</Text>
        ) : (
          messages.map((m) => (
            <View key={m.id} style={[styles.bubble, m.role === 'user' ? styles.user : styles.assistant]}>
              <Text style={styles.bubbleRole}>{m.role === 'user' ? 'You' : 'Insight'}</Text>
              <Text style={styles.bubbleText}>{m.content}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.composer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder='Ask: "show me mentions of McDonald’s"'
          placeholderTextColor="rgba(255,255,255,0.45)"
          style={styles.input}
          onSubmitEditing={onSend}
          returnKeyType="send"
        />
        <Pressable
          onPress={onSend}
          style={({ pressed }: PressableStateCallbackType) => [styles.send, pressed && { opacity: 0.9 }]}>
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 10, backgroundColor: '#0B0F1A' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nodeBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(217,93,57,0.2)',
  },
  nodeBadgeText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  topMeta: { fontWeight: '600', opacity: 0.7 },
  subtitle: { opacity: 0.8 },
  chat: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(0,0,0,0.18)',
    padding: 12,
    gap: 10,
  },
  empty: { opacity: 0.8 },
  bubble: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 10,
    gap: 6,
  },
  user: { alignSelf: 'flex-end', backgroundColor: 'rgba(109,94,241,0.18)', borderColor: 'rgba(109,94,241,0.35)' },
  assistant: { alignSelf: 'flex-start' },
  bubbleRole: { fontSize: 12, opacity: 0.75, fontWeight: '700' },
  bubbleText: { lineHeight: 18 },
  composer: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  send: { height: 44, borderRadius: 12, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#6D5EF1' },
  sendText: { fontWeight: '700', color: '#FFFFFF' },
});
