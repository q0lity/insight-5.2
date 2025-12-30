type MultipliersState = {
  goals: Record<string, number>
  projects: Record<string, number>
}

const STORAGE_KEY = 'insight5.multipliers.v1'

function normalizeKey(raw: string | null | undefined) {
  return (raw ?? '').trim().toLowerCase()
}

export function loadMultipliers(): MultipliersState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { goals: {}, projects: {} }
    const parsed = JSON.parse(raw) as MultipliersState
    return {
      goals: parsed?.goals ?? {},
      projects: parsed?.projects ?? {},
    }
  } catch {
    return { goals: {}, projects: {} }
  }
}

export function saveMultipliers(next: MultipliersState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore write errors
  }
}

export function getGoalMultiplier(goal: string | null | undefined, state?: MultipliersState) {
  const key = normalizeKey(goal)
  if (!key) return 1
  const source = state ?? loadMultipliers()
  const raw = source.goals[key]
  return Number.isFinite(raw) ? Math.max(0.1, raw) : 1
}

export function getProjectMultiplier(project: string | null | undefined, state?: MultipliersState) {
  const key = normalizeKey(project)
  if (!key) return 1
  const source = state ?? loadMultipliers()
  const raw = source.projects[key]
  return Number.isFinite(raw) ? Math.max(0.1, raw) : 1
}

export function upsertGoalMultiplier(goal: string, value: number) {
  const key = normalizeKey(goal)
  if (!key) return
  const next = loadMultipliers()
  next.goals[key] = value
  saveMultipliers(next)
}

export function upsertProjectMultiplier(project: string, value: number) {
  const key = normalizeKey(project)
  if (!key) return
  const next = loadMultipliers()
  next.projects[key] = value
  saveMultipliers(next)
}
