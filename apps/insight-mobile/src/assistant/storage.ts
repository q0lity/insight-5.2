import AsyncStorage from '@react-native-async-storage/async-storage'
import type { DistanceUnit, WeightUnit } from '@/src/storage/preferences'
import { loadPreferences, savePreferences } from '@/src/storage/preferences'

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
  nutritionModel?: string
  preferredWeightUnit?: WeightUnit
  preferredDistanceUnit?: DistanceUnit
}

const CHAT_KEY = 'insight5.assistant.chat.v1'

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export async function loadChat(): Promise<ChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(CHAT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ChatMessage[]
    return Array.isArray(parsed) ? parsed.sort((a, b) => a.createdAt - b.createdAt) : []
  } catch {
    return []
  }
}

export async function saveChat(messages: ChatMessage[]) {
  await AsyncStorage.setItem(CHAT_KEY, JSON.stringify(messages))
}

export async function appendChatMessage(
  messages: ChatMessage[],
  message: Omit<ChatMessage, 'id' | 'createdAt'> & Partial<Pick<ChatMessage, 'id' | 'createdAt'>>,
) {
  const next: ChatMessage = {
    id: message.id ?? makeId(),
    createdAt: message.createdAt ?? Date.now(),
    role: message.role,
    content: message.content,
  }
  const updated = [...messages, next]
  await saveChat(updated)
  return updated
}

export async function loadSettings(): Promise<AssistantSettings> {
  const prefs = await loadPreferences()
  const mode =
    prefs.assistantMode === 'local' || prefs.assistantMode === 'llm' || prefs.assistantMode === 'hybrid'
      ? prefs.assistantMode
      : prefs.llmEnabled
        ? 'hybrid'
        : 'local'
  return {
    mode,
    openAiKey: prefs.openAiApiKey,
    chatModel: prefs.assistantModel,
    parseModel: prefs.assistantModel,
    nutritionModel: prefs.nutritionModel,
    preferredWeightUnit: prefs.preferredWeightUnit,
    preferredDistanceUnit: prefs.preferredDistanceUnit,
  }
}

export async function saveSettings(settings: Partial<AssistantSettings>) {
  const prefsUpdate: Partial<Parameters<typeof savePreferences>[0]> = {}
  if (settings.mode) {
    prefsUpdate.assistantMode = settings.mode
    prefsUpdate.llmEnabled = settings.mode !== 'local'
  }
  if (typeof settings.openAiKey === 'string') prefsUpdate.openAiApiKey = settings.openAiKey
  if (typeof settings.chatModel === 'string') prefsUpdate.assistantModel = settings.chatModel
  if (typeof settings.nutritionModel === 'string') prefsUpdate.nutritionModel = settings.nutritionModel
  if (settings.preferredWeightUnit) prefsUpdate.preferredWeightUnit = settings.preferredWeightUnit
  if (settings.preferredDistanceUnit) prefsUpdate.preferredDistanceUnit = settings.preferredDistanceUnit
  await savePreferences(prefsUpdate)
}
