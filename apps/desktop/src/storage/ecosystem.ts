import type { IconName } from '../ui/icons'

export type CharacterTrait = 'STR' | 'INT' | 'CON' | 'PER'

export type SharedMeta = {
  tags: string[]
  contexts: string[]
  category: string | null
  subcategory: string | null
  importance: number | null
  difficulty: number | null
  estimateMinutes: number | null
  location: string | null
  people: string[]
  skills: string[]
  character: CharacterTrait[]
  goal: string | null
  project: string | null
}

export type GoalDef = {
  id: string
  name: string
  createdAt: number
  meta: SharedMeta
}

export type ProjectDef = {
  id: string
  name: string
  createdAt: number
  meta: SharedMeta
}

export type TrackerUnit = {
  label: string
  min: number | null
  max: number | null
  step: number | null
  presets: number[]
}

export type TrackerDef = {
  id: string
  key: string
  label: string
  createdAt: number
  defaultValue?: number | null
  icon?: IconName | null
  color?: string | null
  unit: TrackerUnit
  meta: SharedMeta
}

const GOALS_KEY_V2 = 'insight5.goals.defs.v2'
const GOALS_KEY_V1 = 'insight5.goals.defs.v1'
const PROJECTS_KEY = 'insight5.projects.defs.v1'
const TRACKERS_KEY = 'insight5.trackers.defs.v1'

function sanitizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item) => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
}

function sanitizeNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'number' ? item : Number(item)))
    .filter((item) => Number.isFinite(item))
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

export function emptySharedMeta(): SharedMeta {
  return {
    tags: [],
    contexts: [],
    category: null,
    subcategory: null,
    importance: null,
    difficulty: null,
    estimateMinutes: null,
    location: null,
    people: [],
    skills: [],
    character: [],
    goal: null,
    project: null,
  }
}

function normalizeSharedMeta(meta: Partial<SharedMeta> | undefined): SharedMeta {
  return {
    ...emptySharedMeta(),
    ...meta,
    tags: sanitizeStringArray(meta?.tags),
    contexts: sanitizeStringArray(meta?.contexts),
    people: sanitizeStringArray(meta?.people),
    skills: sanitizeStringArray(meta?.skills),
    character: sanitizeStringArray(meta?.character) as CharacterTrait[],
    category: normalizeOptionalString(meta?.category),
    subcategory: normalizeOptionalString(meta?.subcategory),
    location: normalizeOptionalString(meta?.location),
    goal: normalizeOptionalString(meta?.goal),
    project: normalizeOptionalString(meta?.project),
    importance: Number.isFinite(meta?.importance as number) ? (meta?.importance as number) : null,
    difficulty: Number.isFinite(meta?.difficulty as number) ? (meta?.difficulty as number) : null,
    estimateMinutes: Number.isFinite(meta?.estimateMinutes as number) ? (meta?.estimateMinutes as number) : null,
  }
}

function normalizeUnit(unit: Partial<TrackerUnit> | undefined): TrackerUnit {
  return {
    label: typeof unit?.label === 'string' && unit.label.trim().length ? unit.label.trim() : 'value',
    min: Number.isFinite(unit?.min as number) ? (unit?.min as number) : null,
    max: Number.isFinite(unit?.max as number) ? (unit?.max as number) : null,
    step: Number.isFinite(unit?.step as number) ? (unit?.step as number) : null,
    presets: sanitizeNumberArray(unit?.presets ?? []),
  }
}

function normalizeGoal(def: GoalDef): GoalDef {
  return { ...def, name: def.name.trim(), meta: normalizeSharedMeta(def.meta) }
}

function normalizeProject(def: ProjectDef): ProjectDef {
  return { ...def, name: def.name.trim(), meta: normalizeSharedMeta(def.meta) }
}

function normalizeTracker(def: TrackerDef): TrackerDef {
  return {
    ...def,
    key: def.key.trim().toLowerCase(),
    label: def.label.trim(),
    unit: normalizeUnit(def.unit),
    meta: normalizeSharedMeta(def.meta),
  }
}

export function defaultTrackerDefs(): TrackerDef[] {
  const now = Date.now()
  const base: Array<Omit<TrackerDef, 'id' | 'createdAt' | 'meta'>> = [
    {
      key: 'mood',
      label: 'Mood',
      defaultValue: 7,
      icon: 'smile',
      unit: { label: 'score', min: 1, max: 10, step: 1, presets: [1, 5, 7, 10] },
    },
    {
      key: 'energy',
      label: 'Energy',
      defaultValue: 7,
      icon: 'bolt',
      unit: { label: 'score', min: 1, max: 10, step: 1, presets: [1, 5, 7, 10] },
    },
    {
      key: 'stress',
      label: 'Stress',
      defaultValue: 5,
      icon: 'frown',
      unit: { label: 'score', min: 1, max: 10, step: 1, presets: [1, 5, 7, 10] },
    },
    {
      key: 'pain',
      label: 'Pain',
      defaultValue: 3,
      icon: 'heart',
      unit: { label: 'score', min: 1, max: 10, step: 1, presets: [1, 3, 5, 7, 10] },
    },
    {
      key: 'water',
      label: 'Water',
      icon: 'droplet',
      unit: { label: 'oz', min: 0, max: 200, step: 1, presets: [8, 16, 24, 32, 64] },
    },
  ]
  return base.map((def) => ({
    ...def,
    id: `trk_${def.key}`,
    createdAt: now,
    meta: emptySharedMeta(),
  }))
}

export function loadGoalDefs(): GoalDef[] {
  try {
    const raw = localStorage.getItem(GOALS_KEY_V2)
    if (raw) {
      const parsed = JSON.parse(raw) as GoalDef[]
      return Array.isArray(parsed) ? parsed.map(normalizeGoal) : []
    }
    const legacy = localStorage.getItem(GOALS_KEY_V1)
    if (!legacy) return []
    const parsed = JSON.parse(legacy) as Array<{ id: string; name: string; createdAt: number }>
    if (!Array.isArray(parsed)) return []
    return parsed.map((g) => ({
      id: g.id,
      name: g.name,
      createdAt: g.createdAt,
      meta: emptySharedMeta(),
    }))
  } catch {
    return []
  }
}

export function saveGoalDefs(defs: GoalDef[]) {
  try {
    localStorage.setItem(GOALS_KEY_V2, JSON.stringify(defs.map(normalizeGoal)))
  } catch {
    // ignore
  }
}

export function loadProjectDefs(): ProjectDef[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ProjectDef[]
    return Array.isArray(parsed) ? parsed.map(normalizeProject) : []
  } catch {
    return []
  }
}

export function saveProjectDefs(defs: ProjectDef[]) {
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(defs.map(normalizeProject)))
  } catch {
    // ignore
  }
}

export function loadTrackerDefs(): TrackerDef[] {
  try {
    const raw = localStorage.getItem(TRACKERS_KEY)
    if (!raw) return defaultTrackerDefs()
    const parsed = JSON.parse(raw) as TrackerDef[]
    const normalized = Array.isArray(parsed) ? parsed.map(normalizeTracker) : []
    return normalized.length ? normalized : defaultTrackerDefs()
  } catch {
    return defaultTrackerDefs()
  }
}

export function saveTrackerDefs(defs: TrackerDef[]) {
  try {
    localStorage.setItem(TRACKERS_KEY, JSON.stringify(defs.map(normalizeTracker)))
  } catch {
    // ignore
  }
}

export function upsertTrackerDef(def: TrackerDef) {
  const next = loadTrackerDefs()
  const idx = next.findIndex((t) => t.key === def.key)
  const normalized = normalizeTracker(def)
  if (idx >= 0) next[idx] = normalized
  else next.unshift(normalized)
  saveTrackerDefs(next)
}
