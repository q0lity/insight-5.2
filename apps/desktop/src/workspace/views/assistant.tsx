import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Icon, type IconName } from '../../ui/icons'
import type { InboxCapture } from '../../storage/inbox'
import type { CalendarEvent } from '../../storage/calendar'
import type { Task } from '../../storage/tasks'
import {
  localAnswer,
  localSearchCaptures,
  localSearchEvents,
  localSearchTasks,
  type LocalEventHit,
  type LocalSearchHit,
  type LocalTaskHit,
} from '../../assistant/local'
import {
  ASSISTANT_SETTINGS_CHANGED_EVENT,
  appendChatMessage,
  loadChat,
  loadSettings,
  saveSettings,
  type AssistantMode,
  type ChatMessage,
} from '../../assistant/storage'
import { callOpenAiText } from '../../openai'

const SUGGESTIONS: { text: string; icon: IconName }[] = [
  { text: 'What did I work on this week?', icon: 'calendar' },
  { text: 'Show my productivity trends', icon: 'trending' },
  { text: 'Summarize my tasks', icon: 'check' },
]

function formatTime(ts: number) {
  const d = new Date(ts)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

async function callOpenAiChat(opts: { apiKey: string; model: string; input: string; context: string }) {
  const content = await callOpenAiText({
    apiKey: opts.apiKey,
    model: opts.model,
    messages: [
      {
        role: 'system',
        content:
          'You are Insight, a private, local-first journaling + calendar assistant. Use the provided context to answer. If context is insufficient, ask a clarifying question.',
      },
      { role: 'system', content: `Context:\n${opts.context}` },
      { role: 'user', content: opts.input },
    ],
    temperature: 0.2,
    maxOutputTokens: 800,
  })
  return content || 'No response.'
}

function formatCaptureContext(hits: LocalSearchHit[]) {
  return hits.map((h) => `- [Inbox ${new Date(h.createdAt).toLocaleString()}] ${h.snippet}`).join('\n')
}

function formatEventContext(hits: LocalEventHit[]) {
  return hits
    .map((h) => `- [${h.kind ?? 'event'} ${new Date(h.startAt).toLocaleString()}] ${h.snippet}`)
    .join('\n')
}

function formatTaskContext(hits: LocalTaskHit[]) {
  return hits.map((h) => `- [task ${h.status}] ${h.snippet}`).join('\n')
}

export function AssistantView(props: {
  embedded?: boolean
  captures: InboxCapture[]
  events: CalendarEvent[]
  tasks: Task[]
  onSelectCapture: (id: string) => void
  onSelectEvent: (id: string) => void
  onSelectTask: (id: string) => void
}) {
  const [chat, setChat] = useState<ChatMessage[]>(() => loadChat())
  const [assistantInput, setAssistantInput] = useState('')
  const initialSettings = useMemo(() => loadSettings(), [])
  const [assistantMode, setAssistantMode] = useState<AssistantMode>(initialSettings.mode ?? 'hybrid')
  const [openAiKey, setOpenAiKey] = useState<string>(initialSettings.openAiKey ?? '')
  const [chatModel, setChatModel] = useState<string>(initialSettings.chatModel ?? 'gpt-4.1-mini')
  const [lastCaptureHits, setLastCaptureHits] = useState<LocalSearchHit[]>([])
  const [lastEventHits, setLastEventHits] = useState<LocalEventHit[]>([])
  const [lastTaskHits, setLastTaskHits] = useState<LocalTaskHit[]>([])
  const [sending, setSending] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!listRef.current) return
    listRef.current.scrollTo({ top: listRef.current.scrollHeight })
  }, [])

  useEffect(() => {
    function onChange() {
      const next = loadSettings()
      setAssistantMode(next.mode ?? 'hybrid')
      setOpenAiKey(next.openAiKey ?? '')
      setChatModel(next.chatModel ?? 'gpt-4.1-mini')
    }
    window.addEventListener(ASSISTANT_SETTINGS_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(ASSISTANT_SETTINGS_CHANGED_EVENT, onChange)
  }, [])

  function persist(partial: Partial<{ mode: AssistantMode; openAiKey: string; chatModel: string }>) {
    const current = loadSettings()
    saveSettings({
      mode: partial.mode ?? current.mode ?? 'hybrid',
      openAiKey: partial.openAiKey ?? (current.openAiKey ?? ''),
      chatModel: partial.chatModel ?? (current.chatModel ?? 'gpt-4.1-mini'),
      parseModel: current.parseModel ?? current.chatModel ?? 'gpt-4.1-mini',
    })
  }

  async function send(text: string) {
    const q = text.trim()
    if (!q || sending) return
    setSending(true)
    try {
      const withUser = appendChatMessage(chat, { role: 'user', content: q })
      setChat(withUser)
      setAssistantInput('')

      const captureHits = localSearchCaptures(q, props.captures, 6)
      const eventHits = localSearchEvents(q, props.events, 6)
      const taskHits = localSearchTasks(q, props.tasks, 6)
      setLastCaptureHits(captureHits)
      setLastEventHits(eventHits)
      setLastTaskHits(taskHits)

      const wantsLlm = assistantMode === 'llm' || assistantMode === 'hybrid'
      const hasKey = openAiKey.trim().length > 0

      if (wantsLlm && hasKey) {
        const context = [
          captureHits.length ? 'Inbox:' : '',
          captureHits.length ? formatCaptureContext(captureHits) : '',
          eventHits.length ? '\nCalendar:' : '',
          eventHits.length ? formatEventContext(eventHits) : '',
          taskHits.length ? '\nTasks:' : '',
          taskHits.length ? formatTaskContext(taskHits) : '',
        ]
          .filter(Boolean)
          .join('\n')
        const answer = await callOpenAiChat({ apiKey: openAiKey.trim(), model: chatModel.trim() || 'gpt-4.1-mini', input: q, context })
        const withAssistant = appendChatMessage(withUser, { role: 'assistant', content: answer })
        setChat(withAssistant)
        return
      }

      if (assistantMode === 'llm' && !hasKey) {
        const withAssistant = appendChatMessage(withUser, {
          role: 'assistant',
          content: 'LLM mode is enabled, but no API key is set. Add a key above in Settings.',
        })
        setChat(withAssistant)
        return
      }

      const answer = localAnswer(q, { captures: props.captures, events: props.events, tasks: props.tasks })
      const withAssistant = appendChatMessage(withUser, { role: 'assistant', content: answer })
      setChat(withAssistant)
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : String(e)
      setChat((prev) => appendChatMessage(prev, { role: 'assistant', content: `Error: ${msg}` }))
    } finally {
      setSending(false)
      window.setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }), 20)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] text-[var(--text)] font-['Figtree'] overflow-hidden">
      {/* Full-screen ChatGPT-style interface */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full overflow-hidden">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-6 py-8" ref={listRef}>
          {chat.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-8">
              {/* Animated welcome icon */}
              <div className="relative">
                <div className="absolute inset-0 bg-[var(--accent)] opacity-20 rounded-full blur-xl animate-pulse" />
                <div className="relative w-28 h-28 bg-gradient-to-br from-[var(--accent)] to-[var(--accentSoft)] rounded-full flex items-center justify-center shadow-xl">
                  <Icon name="wand" size={48} className="text-white" />
                </div>
              </div>

              {/* Welcome text */}
              <div className="space-y-3">
                <h2 className="text-3xl font-extrabold bg-gradient-to-r from-[var(--text)] to-[var(--muted)] bg-clip-text text-transparent">
                  How can I help you today?
                </h2>
                <p className="text-[var(--muted)] text-base max-w-md leading-relaxed">
                  Ask me anything about your week, patterns in your productivity, or insights from your data.
                </p>
              </div>

              {/* Suggestion chips with icons */}
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion.text}
                    onClick={() => {
                      setAssistantInput(suggestion.text)
                      void send(suggestion.text)
                    }}
                    className="group flex items-center gap-2 px-5 py-3 text-sm font-semibold bg-[var(--panel)] hover:bg-[var(--accentSoft)] border border-[var(--border)] hover:border-[var(--accent)] rounded-2xl transition-all duration-200 hover:shadow-md active:scale-[0.98]"
                  >
                    <div className="w-6 h-6 rounded-lg bg-[var(--accentSoft)] group-hover:bg-[var(--accent)] flex items-center justify-center transition-colors">
                      <Icon name={suggestion.icon} size={14} className="text-[var(--accent)] group-hover:text-white transition-colors" />
                    </div>
                    <span>{suggestion.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {chat.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] ${m.role === 'user' ? 'order-2' : 'order-1'}`}>
                    {/* Message header with avatar, name, and timestamp */}
                    <div className={`flex items-center gap-2 mb-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${m.role === 'user' ? 'bg-gradient-to-br from-[var(--accent)] to-[var(--accentSoft)]' : 'bg-[var(--panel)] border border-[var(--border)]'}`}>
                        <Icon name={m.role === 'user' ? 'users' : 'wand'} size={14} className={m.role === 'user' ? 'text-white' : 'text-[var(--accent)]'} />
                      </div>
                      <div className={`flex items-center gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <span className="text-xs font-bold text-[var(--text)]">
                          {m.role === 'user' ? 'You' : 'Insight'}
                        </span>
                        <span className="text-[10px] text-[var(--muted)]">
                          {formatTime(m.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Message bubble */}
                    <div className={`px-5 py-4 rounded-2xl shadow-sm ${m.role === 'user' ? 'bg-gradient-to-br from-[var(--accent)] to-[var(--accentSoft)] text-white rounded-tr-md' : 'bg-[var(--panel)] border border-[var(--border)] rounded-tl-md'}`}>
                      {m.role === 'assistant' ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-bold prose-headings:text-[var(--text)] prose-p:text-[var(--text)] prose-code:bg-[var(--bg)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[var(--accent)] prose-code:font-mono prose-pre:bg-[var(--bg)] prose-pre:border prose-pre:border-[var(--border)] prose-pre:rounded-xl prose-ul:text-[var(--text)] prose-ol:text-[var(--text)] prose-li:text-[var(--text)] prose-strong:text-[var(--text)] prose-a:text-[var(--accent)] prose-a:no-underline prose-a:font-semibold hover:prose-a:underline">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-base leading-relaxed">{m.content}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {sending && (
                <div className="flex justify-start">
                  <div className="max-w-[85%]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--panel)] border border-[var(--border)] shadow-sm">
                        <Icon name="wand" size={14} className="text-[var(--accent)]" />
                      </div>
                      <span className="text-xs font-bold text-[var(--text)]">Insight</span>
                      <span className="text-[10px] text-[var(--muted)] italic">typing...</span>
                    </div>
                    <div className="px-5 py-4 rounded-2xl rounded-tl-md bg-[var(--panel)] border border-[var(--border)] shadow-sm">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 bg-[var(--accent)] opacity-60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2.5 h-2.5 bg-[var(--accent)] opacity-60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2.5 h-2.5 bg-[var(--accent)] opacity-60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input area - fixed at bottom */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-sm">
          <div className="relative max-w-3xl mx-auto">
            <textarea
              className="w-full bg-[var(--panel)] border-2 border-[var(--border)] rounded-2xl pl-5 pr-28 py-4 text-base font-medium outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accentSoft)] transition-all resize-none"
              value={assistantInput}
              onChange={(e) => {
                setAssistantInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send(assistantInput)
                }
              }}
              placeholder="Message Insight..."
              rows={1}
              style={{ minHeight: '56px', maxHeight: '200px' }}
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-2">
              {/* Voice input button */}
              <button
                className="w-10 h-10 text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accentSoft)] rounded-xl flex items-center justify-center transition-all"
                title="Voice input (coming soon)"
              >
                <Icon name="mic" size={18} />
              </button>
              {/* Send button */}
              <button
                onClick={() => void send(assistantInput)}
                disabled={assistantInput.trim().length === 0 || sending}
                className="w-10 h-10 bg-gradient-to-br from-[var(--accent)] to-[var(--accentSoft)] text-white rounded-xl flex items-center justify-center hover:opacity-90 hover:shadow-md active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
              >
                <Icon name="send" size={16} className={sending ? 'animate-pulse' : ''} />
              </button>
            </div>
          </div>
          <div className="text-center mt-3">
            <span className="text-[11px] text-[var(--muted)] font-medium">
              Insight uses local search and optional LLM for answers
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
