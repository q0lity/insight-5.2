export type AssistantMode = 'local' | 'llm' | 'hybrid'

export type ChatMessageRole = 'user' | 'assistant'

export type ChatMessage = {
  id: string
  role: ChatMessageRole
  content: string
  createdAt: number
}

export type WeightUnit = 'lbs' | 'kg'
export type DistanceUnit = 'mi' | 'km'

// Available AI models for nutrition/workout estimation
export const AI_MODELS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast, cheaper' },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'More accurate' },
  { id: 'gpt-4.1', name: 'GPT-4.1', description: 'Latest' },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', description: 'Fast, balanced' },
] as const

export type AssistantSettings = {
  mode: AssistantMode
  openAiKey?: string
  chatModel?: string
  parseModel?: string
  // Nutrition/workout estimation model (can be different from parseModel)
  nutritionModel?: string
  // User preferences for health tracking
  preferredWeightUnit?: WeightUnit
  preferredDistanceUnit?: DistanceUnit
}

const CHAT_KEY = 'insight5.assistant.chat.v1'
const SETTINGS_KEY = 'insight5.assistant.settings.v1'
export const ASSISTANT_SETTINGS_CHANGED_EVENT = 'insight5.assistant.settings.changed'

const DEFAULT_CHAT_MODEL = 'gpt-4o-mini'
const DEFAULT_PARSE_MODEL = 'gpt-4o-mini'
const DEFAULT_NUTRITION_MODEL = 'gpt-4o-mini'
const DEFAULT_WEIGHT_UNIT: WeightUnit = 'lbs'
const DEFAULT_DISTANCE_UNIT: DistanceUnit = 'mi'
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

const DEFAULT_SETTINGS: AssistantSettings = {
  mode: DEFAULT_MODE,
  chatModel: DEFAULT_CHAT_MODEL,
  parseModel: DEFAULT_PARSE_MODEL,
  nutritionModel: DEFAULT_NUTRITION_MODEL,
  preferredWeightUnit: DEFAULT_WEIGHT_UNIT,
  preferredDistanceUnit: DEFAULT_DISTANCE_UNIT,
}

export function loadSettings(): AssistantSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as AssistantSettings
    if (!parsed?.mode) return { ...DEFAULT_SETTINGS }
    const normalizedMode = parsed.mode
    const mode: AssistantMode =
      normalizedMode === 'local' || normalizedMode === 'hybrid' || normalizedMode === 'llm'
        ? normalizedMode
        : DEFAULT_MODE
    return {
      mode,
      openAiKey: parsed.openAiKey,
      chatModel: parsed.chatModel ?? DEFAULT_CHAT_MODEL,
      parseModel: parsed.parseModel ?? parsed.chatModel ?? DEFAULT_PARSE_MODEL,
      nutritionModel: parsed.nutritionModel ?? DEFAULT_NUTRITION_MODEL,
      preferredWeightUnit: parsed.preferredWeightUnit ?? DEFAULT_WEIGHT_UNIT,
      preferredDistanceUnit: parsed.preferredDistanceUnit ?? DEFAULT_DISTANCE_UNIT,
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
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
