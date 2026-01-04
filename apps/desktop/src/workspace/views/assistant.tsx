import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Icon } from '../../ui/icons'
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
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-24 h-24 bg-[var(--panel)] rounded-full flex items-center justify-center shadow-lg">
                <Icon name="sparkle" size={40} className="text-[var(--accent)]" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">How can I help you today?</h2>
                <p className="text-[var(--muted)] text-sm max-w-md">
                  Ask me anything about your week, patterns in your productivity, or insights from your data.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {['What did I work on this week?', 'Show my productivity trends', 'Summarize my tasks'].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setAssistantInput(suggestion)
                      void send(suggestion)
                    }}
                    className="px-4 py-2 text-sm font-medium bg-[var(--panel)] hover:bg-[var(--accentSoft)] border border-[var(--border)] rounded-2xl transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {chat.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] ${m.role === 'user' ? 'order-2' : 'order-1'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${m.role === 'user' ? 'bg-[var(--accent)]' : 'bg-[var(--panel)] border border-[var(--border)]'}`}>
                        <Icon name={m.role === 'user' ? 'users' : 'sparkle'} size={14} className={m.role === 'user' ? 'text-white' : 'text-[var(--accent)]'} />
                      </div>
                      <span className="text-xs font-bold text-[var(--muted)]">
                        {m.role === 'user' ? 'You' : 'Insight'}
                      </span>
                    </div>
                    <div className={`px-5 py-4 rounded-2xl ${m.role === 'user' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--panel)] border border-[var(--border)]'}`}>
                      {m.role === 'assistant' ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-bold prose-headings:text-[var(--text)] prose-p:text-[var(--text)] prose-code:bg-[var(--bg)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[var(--accent)] prose-pre:bg-[var(--bg)] prose-pre:border prose-pre:border-[var(--border)] prose-pre:rounded-xl prose-ul:text-[var(--text)] prose-ol:text-[var(--text)] prose-li:text-[var(--text)] prose-strong:text-[var(--text)] prose-a:text-[var(--accent)]">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-base leading-relaxed">{m.content}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="max-w-[85%]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center bg-[var(--panel)] border border-[var(--border)]">
                        <Icon name="sparkle" size={14} className="text-[var(--accent)] animate-spin" />
                      </div>
                      <span className="text-xs font-bold text-[var(--muted)]">Insight</span>
                    </div>
                    <div className="px-5 py-4 rounded-2xl bg-[var(--panel)] border border-[var(--border)]">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-[var(--muted)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-[var(--muted)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-[var(--muted)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input area - fixed at bottom */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--bg)]">
          <div className="relative max-w-3xl mx-auto">
            <textarea
              className="w-full bg-[var(--panel)] border border-[var(--border)] rounded-2xl pl-5 pr-14 py-4 text-base font-medium outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accentSoft)] transition-all resize-none"
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
              style={{ minHeight: '52px', maxHeight: '200px' }}
            />
            <button
              onClick={() => void send(assistantInput)}
              disabled={assistantInput.trim().length === 0 || sending}
              className="absolute right-2 bottom-2 w-10 h-10 bg-[var(--accent)] text-white rounded-xl flex items-center justify-center hover:opacity-90 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Icon name="sparkle" size={18} className={sending ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="text-center mt-2">
            <span className="text-[10px] text-[var(--muted)]">
              Insight uses local search and optional LLM for answers
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
