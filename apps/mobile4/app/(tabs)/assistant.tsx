import React, { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Text } from '@/components/Themed'
import { useTheme } from '@/src/state/theme'
import { listInboxCaptures, type InboxCapture } from '@/src/storage/inbox'
import { listEvents, type MobileEvent } from '@/src/storage/events'
import { listTasks, type MobileTask } from '@/src/storage/tasks'
import {
  loadChat,
  appendChatMessage,
  loadSettings,
  saveSettings,
  type AssistantMode,
  type ChatMessage,
} from '@/src/assistant/storage'
import { answerWithLlm } from '@/src/lib/llm/search'
import {
  localAnswer,
  localSearchCaptures,
  localSearchEvents,
  localSearchTasks,
} from '@insight/shared'

type Hit = { id: string; label: string; meta: string; kind: 'capture' | 'event' | 'task' }

const SUGGESTIONS = [
  'What did I work on this week?',
  'Summarize my tasks due soon.',
  'Show mentions of #workout.',
]

function buildHitLabel(raw: string, fallback: string) {
  const line = (raw.split(/\r?\n/)[0] ?? '').trim()
  return line.length ? line.slice(0, 80) : fallback
}

export default function AssistantScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { palette, sizes, isDark } = useTheme()

  const [chat, setChat] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  const [assistantMode, setAssistantMode] = useState<AssistantMode>('local')
  const [assistantModel, setAssistantModel] = useState('gpt-4o-mini')
  const [apiKey, setApiKey] = useState('')

  const [captureHits, setCaptureHits] = useState<Hit[]>([])
  const [eventHits, setEventHits] = useState<Hit[]>([])
  const [taskHits, setTaskHits] = useState<Hit[]>([])

  const [captures, setCaptures] = useState<InboxCapture[]>([])
  const [events, setEvents] = useState<MobileEvent[]>([])
  const [tasks, setTasks] = useState<MobileTask[]>([])

  useEffect(() => {
    let mounted = true
    Promise.all([loadChat(), loadSettings(), listInboxCaptures(), listEvents(), listTasks()]).then(
      ([storedChat, settings, inboxRows, eventRows, taskRows]) => {
        if (!mounted) return
        setChat(storedChat)
        setAssistantMode(settings.mode ?? 'local')
        setAssistantModel(settings.chatModel ?? 'gpt-4o-mini')
        setApiKey(settings.openAiKey ?? '')
        setCaptures(inboxRows)
        setEvents(eventRows)
        setTasks(taskRows)
      },
    )
    return () => {
      mounted = false
    }
  }, [])

  const hitSummary = useMemo(() => {
    if (!captureHits.length && !eventHits.length && !taskHits.length) return null
    return { captureHits, eventHits, taskHits }
  }, [captureHits, eventHits, taskHits])

  const updateMode = async (next: AssistantMode) => {
    setAssistantMode(next)
    await saveSettings({ mode: next })
  }

  async function onSend(text?: string) {
    const query = (text ?? input).trim()
    if (!query || sending) return
    setInput('')
    setSending(true)

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: query,
      createdAt: Date.now(),
    }
    const withUser = await appendChatMessage(chat, userMsg)
    setChat(withUser)

    const captureResults = localSearchCaptures(query, captures, 6)
    const eventResults = localSearchEvents(query, events, 6)
    const taskResults = localSearchTasks(query, tasks, 6)

    setCaptureHits(
      captureResults.map((hit) => ({
        id: hit.id,
        label: buildHitLabel(
          captures.find((c) => c.id === hit.id)?.rawText ?? '',
          'Inbox capture',
        ),
        meta: new Date(hit.createdAt).toLocaleString(),
        kind: 'capture',
      })),
    )
    setEventHits(
      eventResults.map((hit) => ({
        id: hit.id,
        label: hit.title || 'Calendar event',
        meta: new Date(hit.startAt).toLocaleString(),
        kind: 'event',
      })),
    )
    setTaskHits(
      taskResults.map((hit) => ({
        id: hit.id,
        label: hit.title || 'Task',
        meta: `Status: ${hit.status}`,
        kind: 'task',
      })),
    )

    const wantsLlm = assistantMode === 'llm' || assistantMode === 'hybrid'
    const hasKey = apiKey.trim().length > 0

    let answer = ''
    if (wantsLlm && hasKey) {
      try {
        answer = await answerWithLlm({
          query,
          captures,
          events,
          tasks,
          apiKey: apiKey.trim(),
          model: assistantModel || 'gpt-4o-mini',
        })
      } catch (err) {
        answer = 'LLM failed. Falling back to local search.'
      }
    }

    if (!answer) {
      if (assistantMode === 'llm' && !hasKey) {
        answer = 'LLM mode is enabled, but no API key is set. Add a key in Settings.'
      } else {
        answer = localAnswer(query, { captures, events, tasks })
      }
    }

    const assistantMsg: ChatMessage = {
      id: `a_${Date.now()}`,
      role: 'assistant',
      content: answer,
      createdAt: Date.now(),
    }
    const nextChat = await appendChatMessage(withUser, assistantMsg)
    setChat(nextChat)
    setSending(false)
  }

  const handleOpen = (hit: Hit) => {
    if (hit.kind === 'capture') router.push({ pathname: '/note/[id]', params: { id: hit.id } })
    if (hit.kind === 'event') router.push(`/event/${hit.id}`)
    if (hit.kind === 'task') router.push(`/task/${hit.id}`)
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top + sizes.spacing }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: palette.text }]}>Assistant</Text>
          <Text style={[styles.subtitle, { color: palette.textSecondary }]}>Search your inbox, calendar, and tasks.</Text>
        </View>
      </View>

      <View style={styles.modeRow}>
        {(['local', 'hybrid', 'llm'] as AssistantMode[]).map((mode) => {
          const active = assistantMode === mode
          return (
            <TouchableOpacity
              key={mode}
              onPress={() => void updateMode(mode)}
              style={[
                styles.modeChip,
                {
                  backgroundColor: active ? palette.tint : palette.surface,
                  borderColor: active ? palette.tint : palette.border,
                },
              ]}
            >
              <Text style={{ color: active ? '#FFFFFF' : palette.text }}>{mode.toUpperCase()}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <ScrollView style={styles.chat} contentContainerStyle={{ paddingBottom: 24 }}>
        {chat.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: palette.text }]}>How can I help you today?</Text>
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.suggestionChip, { borderColor: palette.border }]}
                  onPress={() => void onSend(s)}
                >
                  <Text style={{ color: palette.text }}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          chat.map((m) => (
            <View
              key={m.id}
              style={[
                styles.bubble,
                m.role === 'user' ? styles.userBubble : styles.assistantBubble,
                { borderColor: palette.border, backgroundColor: m.role === 'user' ? palette.tintLight : palette.surface },
              ]}
            >
              <Text style={[styles.bubbleRole, { color: palette.textSecondary }]}>
                {m.role === 'user' ? 'You' : 'Insight'}
              </Text>
              <Text style={{ color: palette.text }}>{m.content}</Text>
            </View>
          ))
        )}

        {hitSummary ? (
          <View style={[styles.hitsPanel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.hitsTitle, { color: palette.text }]}>Relevant</Text>
            {[{ label: 'Inbox', rows: captureHits }, { label: 'Calendar', rows: eventHits }, { label: 'Tasks', rows: taskHits }].map(
              (section) =>
                section.rows.length ? (
                  <View key={section.label} style={styles.hitGroup}>
                    <Text style={[styles.hitGroupLabel, { color: palette.textSecondary }]}>{section.label}</Text>
                    {section.rows.map((hit) => (
                      <TouchableOpacity
                        key={hit.id}
                        style={[styles.hitRow, { borderColor: palette.border }]}
                        onPress={() => handleOpen(hit)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: palette.text }}>{hit.label}</Text>
                          <Text style={{ color: palette.textSecondary, fontSize: 12 }}>{hit.meta}</Text>
                        </View>
                        <Text style={{ color: palette.tint }}>Open</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null,
            )}
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.composer, { borderColor: palette.border, backgroundColor: palette.surface }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask about your week, tasks, or notes..."
          placeholderTextColor={palette.textSecondary}
          style={[styles.input, { color: palette.text }]}
          onSubmitEditing={() => void onSend()}
          returnKeyType="send"
        />
        <Pressable style={[styles.send, { backgroundColor: palette.tint }]} onPress={() => void onSend()}>
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{sending ? '...' : 'Send'}</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', fontFamily: 'Figtree' },
  subtitle: { fontSize: 14, fontWeight: '600' },
  modeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 10 },
  modeChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chat: { flex: 1, paddingHorizontal: 20 },
  empty: { marginTop: 24, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestionChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bubble: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  userBubble: { alignSelf: 'flex-end' },
  assistantBubble: { alignSelf: 'flex-start' },
  bubbleRole: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  hitsPanel: { borderWidth: 1, borderRadius: 16, padding: 12, marginTop: 12, gap: 10 },
  hitsTitle: { fontSize: 16, fontWeight: '700' },
  hitGroup: { gap: 6 },
  hitGroupLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  hitRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  composer: {
    borderTopWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: { flex: 1, height: 44 },
  send: { height: 44, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
})
