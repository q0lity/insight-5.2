import { useEffect, useMemo, useRef, useState } from 'react'
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
  const modeLabel = assistantMode === 'hybrid' ? 'Hybrid enabled' : assistantMode === 'local' ? 'Local only' : 'LLM enabled'

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

  const embedded = Boolean(props.embedded)

  return (
    <div className="flex flex-col h-full bg-[#F8F7F4] text-[#1C1C1E] font-['Figtree'] overflow-hidden">
      {!embedded && (
        <div className="px-10 pt-10 pb-6 bg-[#F8F7F4]/80 backdrop-blur-xl sticky top-0 z-10 space-y-8 max-w-7xl mx-auto w-full">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-extrabold tracking-tight">Insight Chat</h1>
              <p className="text-sm text-[#86868B] font-semibold">Conversational access to your digital life.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 text-xs font-bold rounded-2xl bg-white/50 backdrop-blur border border-white/20 text-[#86868B]">
                {modeLabel}
              </div>
              <button 
                onClick={() => setChat([])}
                className="w-10 h-10 rounded-full bg-white border border-black/5 flex items-center justify-center text-[#86868B] hover:text-[#D95D39] transition-colors shadow-sm"
              >
                <Icon name="x" size={18} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-md relative">
              <input 
                type="password"
                className="w-full h-11 bg-white/50 border border-black/5 rounded-2xl px-10 text-sm font-medium focus:bg-white focus:shadow-md transition-all outline-none"
                value={openAiKey}
                onChange={(e) => {
                  const next = e.target.value
                  setOpenAiKey(next)
                  persist({ mode: assistantMode, openAiKey: next, chatModel })
                }}
                placeholder="OpenAI API Key (Optional)..."
              />
              <div className="absolute left-3.5 top-3.5 opacity-30">
                  <Icon name="gear" size={16} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`flex-1 flex gap-10 px-10 pb-32 max-w-7xl mx-auto w-full overflow-hidden ${embedded ? 'pt-4' : ''}`}>
      <div className="flex-1 flex flex-col pageHero overflow-hidden relative">
          <div className="flex-1 overflow-y-auto px-10 py-10 space-y-8" ref={listRef}>
            {chat.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6 opacity-40">
                <div className="w-20 h-20 bg-[#F2F0ED] rounded-full flex items-center justify-center">
                    <Icon name="mic" size={32} className="text-[#D95D39]" />
                </div>
                <p className="text-sm font-bold leading-relaxed">
                  Ask me anything about your week, mentions of specific tags, or patterns in your productivity.
                </p>
              </div>
            ) : (
              chat.map((m) => (
                <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} space-y-2`}>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#86868B] px-4">
                    {m.role === 'user' ? 'You' : 'Insight'}
                  </span>
                  <div className={`max-w-[80%] px-6 py-4 rounded-[28px] text-lg font-medium leading-relaxed ${m.role === 'user' ? 'bg-[#D95D39] text-white shadow-lg' : 'bg-[#F2F0ED] text-[#1C1C1E]'}`}>
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {sending && (
                <div className="flex flex-col items-start space-y-2 animate-pulse">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#86868B] px-4">Insight</span>
                    <div className="bg-[#F2F0ED] rounded-[28px] px-6 py-4 text-xs font-bold text-[#86868B] tracking-widest uppercase">
                        Synthesizing...
                    </div>
                </div>
            )}
          </div>

          <div className="p-6 bg-white/80 backdrop-blur-md border-t border-black/5">
            <div className="relative">
              <textarea
                className="w-full bg-[#F2F0ED] border-none rounded-[32px] pl-8 pr-20 py-5 text-lg font-medium outline-none focus:ring-4 focus:ring-[#D95D39]/5 transition-all resize-none min-h-[72px] max-h-[200px]"
                value={assistantInput}
                onChange={(e) => {
                    setAssistantInput(e.target.value)
                    e.target.style.height = 'auto'
                    e.target.style.height = e.target.scrollHeight + 'px'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void send(assistantInput)
                  }
                }}
                placeholder="How can I help you today?"
                rows={1}
              />
              <button 
                onClick={() => void send(assistantInput)}
                disabled={assistantInput.trim().length === 0 || sending}
                className="absolute right-3 top-3 w-12 h-12 bg-[#D95D39] text-white rounded-full flex items-center justify-center shadow-lg shadow-[#D95D39]/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100"
              >
                <Icon name="sparkle" size={20} className={sending ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>

        {!embedded && (
          <aside className="w-80 space-y-8 overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#86868B]">Related Context</h3>
              
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-[#D95D39] tracking-widest uppercase">Inbox</span>
                {lastCaptureHits.length === 0 ? (
                  <div className="text-xs font-bold opacity-30 italic">No context matched yet</div>
                ) : (
                  lastCaptureHits.map((h) => (
                    <button key={h.id} className="w-full text-left p-4 bg-white rounded-2xl border border-black/5 shadow-sm hover:shadow-md transition-all group" onClick={() => props.onSelectCapture(h.id)}>
                      <div className="text-[10px] font-bold text-[#86868B] mb-1">{new Date(h.createdAt).toLocaleDateString()}</div>
                      <div className="text-xs font-semibold text-[#1C1C1E] line-clamp-2 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">{h.snippet}</div>
                    </button>
                  ))
                )}
              </div>

              <div className="space-y-4">
                <span className="text-[10px] font-bold text-[#5B5F97] tracking-widest uppercase">Calendar</span>
                {lastEventHits.length === 0 ? (
                  <div className="text-xs font-bold opacity-30 italic">No context matched yet</div>
                ) : (
                  lastEventHits.map((h) => (
                    <button key={h.id} className="w-full text-left p-4 bg-white rounded-2xl border border-black/5 shadow-sm hover:shadow-md transition-all group" onClick={() => props.onSelectEvent(h.id)}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-[#5B5F97] uppercase tracking-tighter">{h.kind ?? 'event'}</span>
                        <span className="text-[10px] font-bold text-[#86868B]">{new Date(h.startAt).toLocaleDateString()}</span>
                      </div>
                      <div className="text-xs font-semibold text-[#1C1C1E] line-clamp-2 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">{h.snippet}</div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
