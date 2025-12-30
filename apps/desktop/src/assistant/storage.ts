export type AssistantMode = 'local' | 'llm' | 'hybrid'

export type ChatMessageRole = 'user' | 'assistant'

export type ChatMessage = {
  id: string
  role: ChatMessageRole
  content: string
  createdAt: number
}

export type AssistantSettings = {
  mode: AssistantMode
  openAiKey?: string
  chatModel?: string
  parseModel?: string
}

const CHAT_KEY = 'insight5.assistant.chat.v1'
const SETTINGS_KEY = 'insight5.assistant.settings.v1'
export const ASSISTANT_SETTINGS_CHANGED_EVENT = 'insight5.assistant.settings.changed'

const DEFAULT_CHAT_MODEL = 'gpt-4.1-mini'
const DEFAULT_PARSE_MODEL = 'gpt-4.1-mini'
const DEFAULT_MODE: AssistantMode = 'hybrid'

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export function loadChat(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ChatMessage[]
    return Array.isArray(parsed) ? parsed.sort((a, b) => a.createdAt - b.createdAt) : []
  } catch {
    return []
  }
}

export function saveChat(messages: ChatMessage[]) {
  localStorage.setItem(CHAT_KEY, JSON.stringify(messages))
}

export function appendChatMessage(messages: ChatMessage[], message: Omit<ChatMessage, 'id' | 'createdAt'> & Partial<Pick<ChatMessage, 'id' | 'createdAt'>>) {
  const next: ChatMessage = {
    id: message.id ?? makeId(),
    createdAt: message.createdAt ?? Date.now(),
    role: message.role,
    content: message.content,
  }
  const updated = [...messages, next]
  saveChat(updated)
  return updated
}

export function loadSettings(): AssistantSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { mode: DEFAULT_MODE, chatModel: DEFAULT_CHAT_MODEL, parseModel: DEFAULT_PARSE_MODEL }
    const parsed = JSON.parse(raw) as AssistantSettings
    if (!parsed?.mode) return { mode: DEFAULT_MODE, chatModel: DEFAULT_CHAT_MODEL, parseModel: DEFAULT_PARSE_MODEL }
    const normalizedMode = parsed.mode === 'llm' ? 'hybrid' : parsed.mode
    const mode: AssistantMode = normalizedMode === 'local' || normalizedMode === 'hybrid' ? normalizedMode : DEFAULT_MODE
    return {
      mode,
      openAiKey: parsed.openAiKey,
      chatModel: parsed.chatModel ?? DEFAULT_CHAT_MODEL,
      parseModel: parsed.parseModel ?? parsed.chatModel ?? DEFAULT_PARSE_MODEL,
    }
  } catch {
    return { mode: DEFAULT_MODE, chatModel: DEFAULT_CHAT_MODEL, parseModel: DEFAULT_PARSE_MODEL }
  }
}

export function saveSettings(settings: AssistantSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  try {
    window.dispatchEvent(new Event(ASSISTANT_SETTINGS_CHANGED_EVENT))
  } catch {
    // ignore
  }
}
