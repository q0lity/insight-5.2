import AsyncStorage from '@react-native-async-storage/async-storage'

export type MultipliersState = {
  goals: Record<string, number>
  projects: Record<string, number>
}

const STORAGE_KEY = 'insight5.multipliers.v1'
let cachedState: MultipliersState = { goals: {}, projects: {} }

function normalizeKey(raw: string | null | undefined) {
  return (raw ?? '').trim().toLowerCase()
}

export async function loadMultipliers(): Promise<MultipliersState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return { goals: {}, projects: {} }
    const parsed = JSON.parse(raw) as MultipliersState
    const next = {
      goals: parsed?.goals ?? {},
      projects: parsed?.projects ?? {},
    }
    cachedState = next
    return next
  } catch {
    return { goals: {}, projects: {} }
  }
}

export async function saveMultipliers(next: MultipliersState) {
  try {
    cachedState = next
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore write errors
  }
}

export async function getGoalMultiplier(goal: string | null | undefined, state?: MultipliersState) {
  const key = normalizeKey(goal)
  if (!key) return 1
  const source = state ?? (await loadMultipliers())
  const raw = source.goals[key]
  return Number.isFinite(raw) ? Math.max(0.1, raw) : 1
}

export async function getProjectMultiplier(project: string | null | undefined, state?: MultipliersState) {
  const key = normalizeKey(project)
  if (!key) return 1
  const source = state ?? (await loadMultipliers())
  const raw = source.projects[key]
  return Number.isFinite(raw) ? Math.max(0.1, raw) : 1
}

export async function upsertGoalMultiplier(goal: string, value: number) {
  const key = normalizeKey(goal)
  if (!key) return
  const next = await loadMultipliers()
  next.goals[key] = value
  await saveMultipliers(next)
}

export async function upsertProjectMultiplier(project: string, value: number) {
  const key = normalizeKey(project)
  if (!key) return
  const next = await loadMultipliers()
  next.projects[key] = value
  await saveMultipliers(next)
}

export function getGoalMultiplierSync(goal: string | null | undefined, state?: MultipliersState) {
  const key = normalizeKey(goal)
  if (!key) return 1
  const raw = (state ?? cachedState)?.goals?.[key]
  return Number.isFinite(raw) ? Math.max(0.1, raw) : 1
}

export function getProjectMultiplierSync(project: string | null | undefined, state?: MultipliersState) {
  const key = normalizeKey(project)
  if (!key) return 1
  const raw = (state ?? cachedState)?.projects?.[key]
  return Number.isFinite(raw) ? Math.max(0.1, raw) : 1
}

export async function hydrateMultipliers() {
  return loadMultipliers()
}

export function getMultipliersCache() {
  return cachedState
}
