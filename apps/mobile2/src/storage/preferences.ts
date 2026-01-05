import AsyncStorage from '@react-native-async-storage/async-storage'

export type WeightUnit = 'lbs' | 'kg'
export type DistanceUnit = 'mi' | 'km'

// Available AI models for nutrition/workout estimation
export const AI_MODELS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast, cheaper' },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'More accurate' },
  { id: 'gpt-4.1', name: 'GPT-4.1', description: 'Latest' },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', description: 'Fast, balanced' },
] as const

export type UserPreferences = {
  // LLM assistant preferences
  llmEnabled: boolean
  openAiApiKey: string
  assistantModel: string
  // AI model for nutrition/workout estimation
  nutritionModel: string
  // User preferences for health tracking
  preferredWeightUnit: WeightUnit
  preferredDistanceUnit: DistanceUnit
}

const PREFERENCES_KEY = 'insight5.mobile.preferences.v1'

const DEFAULT_PREFERENCES: UserPreferences = {
  llmEnabled: false,
  openAiApiKey: '',
  assistantModel: 'gpt-4o-mini',
  nutritionModel: 'gpt-4o-mini',
  preferredWeightUnit: 'lbs',
  preferredDistanceUnit: 'mi',
}

export async function loadPreferences(): Promise<UserPreferences> {
  try {
    const raw = await AsyncStorage.getItem(PREFERENCES_KEY)
    if (!raw) return { ...DEFAULT_PREFERENCES }
    const parsed = JSON.parse(raw) as Partial<UserPreferences>
    return {
      llmEnabled: typeof parsed.llmEnabled === 'boolean' ? parsed.llmEnabled : DEFAULT_PREFERENCES.llmEnabled,
      openAiApiKey: typeof parsed.openAiApiKey === 'string' ? parsed.openAiApiKey : DEFAULT_PREFERENCES.openAiApiKey,
      assistantModel: parsed.assistantModel ?? DEFAULT_PREFERENCES.assistantModel,
      nutritionModel: parsed.nutritionModel ?? DEFAULT_PREFERENCES.nutritionModel,
      preferredWeightUnit: parsed.preferredWeightUnit ?? DEFAULT_PREFERENCES.preferredWeightUnit,
      preferredDistanceUnit: parsed.preferredDistanceUnit ?? DEFAULT_PREFERENCES.preferredDistanceUnit,
    }
  } catch {
    return { ...DEFAULT_PREFERENCES }
  }
}

export async function savePreferences(prefs: Partial<UserPreferences>): Promise<UserPreferences> {
  const current = await loadPreferences()
  const updated: UserPreferences = {
    ...current,
    ...prefs,
  }
  await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated))
  return updated
}

export async function getPreference<K extends keyof UserPreferences>(key: K): Promise<UserPreferences[K]> {
  const prefs = await loadPreferences()
  return prefs[key]
}

export async function setPreference<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]): Promise<void> {
  await savePreferences({ [key]: value } as Partial<UserPreferences>)
}
