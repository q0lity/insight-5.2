import React, { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import FontAwesome from '@expo/vector-icons/FontAwesome'

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

const SUGGESTIONS: { text: string; icon: 'calendar' | 'list-ul' | 'hashtag' }[] = [
  { text: 'What did I work on this week?', icon: 'calendar' },
  { text: 'Summarize my tasks due soon.', icon: 'list-ul' },
  { text: 'Show mentions of #workout.', icon: 'hashtag' },
]

function formatTime(ts: number) {
  const d = new Date(ts)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function buildHitLabel(raw: string, fallback: string) {
  const line = (raw.split(/\r?\n/)[0] ?? '').trim()
  return line.length ? line.slice(0, 80) : fallback
}

export default function AssistantScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { palette, sizes } = useTheme()

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
    if (hit.kind === 'capture') router.push(`/note/${hit.id}`)
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
              <Text style={{ color: active ? '#FFFFFF' : palette.text, fontWeight: '600' }}>{mode.toUpperCase()}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <ScrollView style={styles.chat} contentContainerStyle={{ paddingBottom: 24 }}>
        {chat.length === 0 ? (
          <View style={styles.empty}>
            {/* Animated welcome icon */}
            <View style={[styles.welcomeIcon, { backgroundColor: palette.tint }]}>
              <FontAwesome name="magic" size={32} color="#FFFFFF" />
            </View>
            <Text style={[styles.emptyTitle, { color: palette.text }]}>How can I help you today?</Text>
            <Text style={[styles.emptySubtitle, { color: palette.textSecondary }]}>
              Ask me anything about your week, patterns in your productivity, or insights from your data.
            </Text>
            {/* Suggestion chips with icons */}
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((suggestion) => (
                <TouchableOpacity
                  key={suggestion.text}
                  style={[styles.suggestionChip, { borderColor: palette.border, backgroundColor: palette.surface }]}
                  onPress={() => void onSend(suggestion.text)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.suggestionIconWrap, { backgroundColor: palette.tintLight }]}>
                    <FontAwesome name={suggestion.icon} size={12} color={palette.tint} />
                  </View>
                  <Text style={{ color: palette.text, fontWeight: '500', flex: 1 }}>{suggestion.text}</Text>
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
                { backgroundColor: m.role === 'user' ? palette.tint : palette.surface },
              ]}
            >
              {/* Message header with avatar and timestamp */}
              <View style={[styles.bubbleHeader, m.role === 'user' && styles.bubbleHeaderUser]}>
                <View style={[styles.avatar, { backgroundColor: m.role === 'user' ? 'rgba(255,255,255,0.2)' : palette.tintLight }]}>
                  <FontAwesome name={m.role === 'user' ? 'user' : 'magic'} size={12} color={m.role === 'user' ? '#FFFFFF' : palette.tint} />
                </View>
                <Text style={[styles.bubbleRole, { color: m.role === 'user' ? 'rgba(255,255,255,0.8)' : palette.textSecondary }]}>
                  {m.role === 'user' ? 'You' : 'Insight'}
                </Text>
                <Text style={[styles.bubbleTime, { color: m.role === 'user' ? 'rgba(255,255,255,0.6)' : palette.textSecondary }]}>
                  {formatTime(m.createdAt)}
                </Text>
              </View>
              <Text style={{ color: m.role === 'user' ? '#FFFFFF' : palette.text, lineHeight: 22 }}>{m.content}</Text>
            </View>
          ))
        )}

        {/* Typing indicator */}
        {sending && (
          <View style={[styles.bubble, styles.assistantBubble, { backgroundColor: palette.surface }]}>
            <View style={styles.bubbleHeader}>
              <View style={[styles.avatar, { backgroundColor: palette.tintLight }]}>
                <FontAwesome name="magic" size={12} color={palette.tint} />
              </View>
              <Text style={[styles.bubbleRole, { color: palette.textSecondary }]}>Insight</Text>
              <Text style={[styles.typingLabel, { color: palette.textSecondary }]}>typing...</Text>
            </View>
            <View style={styles.typingDots}>
              <View style={[styles.dot, { backgroundColor: palette.tint }]} />
              <View style={[styles.dot, { backgroundColor: palette.tint, opacity: 0.7 }]} />
              <View style={[styles.dot, { backgroundColor: palette.tint, opacity: 0.4 }]} />
            </View>
          </View>
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
                        style={[styles.hitRow, { borderColor: palette.border, backgroundColor: palette.background }]}
                        onPress={() => handleOpen(hit)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: palette.text, fontWeight: '500' }}>{hit.label}</Text>
                          <Text style={{ color: palette.textSecondary, fontSize: 12 }}>{hit.meta}</Text>
                        </View>
                        <FontAwesome name="chevron-right" size={12} color={palette.tint} />
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
          placeholder="Message Insight..."
          placeholderTextColor={palette.textSecondary}
          style={[styles.input, { color: palette.text, backgroundColor: palette.background }]}
          onSubmitEditing={() => void onSend()}
          returnKeyType="send"
          multiline
        />
        <View style={styles.composerButtons}>
          <Pressable style={[styles.micButton, { backgroundColor: 'transparent' }]}>
            <FontAwesome name="microphone" size={18} color={palette.textSecondary} />
          </Pressable>
          <Pressable
            style={[styles.send, { backgroundColor: palette.tint, opacity: input.trim().length === 0 || sending ? 0.4 : 1 }]}
            onPress={() => void onSend()}
            disabled={input.trim().length === 0 || sending}
          >
            <FontAwesome name="send" size={14} color="#FFFFFF" />
          </Pressable>
        </View>
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
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chat: { flex: 1, paddingHorizontal: 20 },
  empty: { marginTop: 40, gap: 16, alignItems: 'center' },
  welcomeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  emptyTitle: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', paddingHorizontal: 20, lineHeight: 20 },
  suggestions: { flexDirection: 'column', gap: 10, width: '100%', marginTop: 8 },
  suggestionChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  suggestionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    maxWidth: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 6 },
  assistantBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 6 },
  bubbleHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  bubbleHeaderUser: { flexDirection: 'row-reverse' },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleRole: { fontSize: 12, fontWeight: '700' },
  bubbleTime: { fontSize: 10 },
  typingLabel: { fontSize: 10, fontStyle: 'italic' },
  typingDots: { flexDirection: 'row', gap: 4, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  hitsPanel: { borderWidth: 1, borderRadius: 20, padding: 14, marginTop: 12, gap: 12 },
  hitsTitle: { fontSize: 16, fontWeight: '800' },
  hitGroup: { gap: 8 },
  hitGroupLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  hitRow: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  composer: {
    borderTopWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  composerButtons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  micButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
