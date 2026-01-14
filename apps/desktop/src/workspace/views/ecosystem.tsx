import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CalendarEvent } from '../../storage/calendar'
import type { Task } from '../../storage/tasks'
import { Icon } from '../../ui/icons'
import { MetaEditor } from '../../ui/MetaEditor'
import { TrackerUnitEditor } from '../../ui/TrackerUnitEditor'
import { parseCommaList } from '../../ui/ChipInput'
import { loadMultipliers, saveMultipliers } from '../../storage/multipliers'
import { loadCustomTaxonomy, removeCategory, upsertCategory } from '../../taxonomy/custom'
import { categoriesFromStarter, subcategoriesFromStarter } from '../../taxonomy/starter'
import {
  emptySharedMeta,
  loadEcosystemHidden,
  loadGoalDefs,
  loadProjectDefs,
  loadTrackerDefs,
  saveEcosystemHidden,
  saveGoalDefs,
  saveProjectDefs,
  saveTrackerDefs,
  type GoalDef,
  type ProjectDef,
  type EcosystemHidden,
  type SharedMeta,
  type TrackerDef,
  type CharacterTrait,
} from '../../storage/ecosystem'

const HABITS_UPDATED_EVENT = 'insight5.habits.updated'

type HabitDef = {
  id: string
  name: string
  category?: string | null
  subcategory?: string | null
  difficulty?: number | null
  importance?: number | null
  character?: CharacterTrait[]
  skills?: string[]
  tags?: string[]
  contexts?: string[]
  people?: string[]
  location?: string | null
  goal?: string | null
  project?: string | null
  estimateMinutes?: number | null
  schedule?: string | null
  targetPerWeek?: number | null
  polarity?: 'positive' | 'negative' | 'both'
  color?: string | null
  icon?: string | null
  isTimed?: boolean
}

type Selection =
  | { kind: 'none' }
  | { kind: 'goal'; key: string }
  | { kind: 'project'; key: string }
  | { kind: 'habit'; id: string }
  | { kind: 'tracker'; key: string }
  | { kind: 'category'; category: string }

function normalizeKey(raw: string | null | undefined) {
  return (raw ?? '').trim().toLowerCase()
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function uniqStrings(items: string[]) {
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of items) {
    const trimmed = item.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    out.push(trimmed)
  }
  return out
}

function normalizeTag(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`
}

function loadHabits(): HabitDef[] {
  try {
    const raw = localStorage.getItem('insight5.habits.defs.v1')
    if (!raw) return []
    const parsed = JSON.parse(raw) as HabitDef[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((h) => ({
      ...h,
      tags: Array.isArray(h.tags) ? h.tags.filter(Boolean) : [],
      skills: Array.isArray(h.skills) ? h.skills.filter(Boolean) : [],
      contexts: Array.isArray(h.contexts) ? h.contexts.filter(Boolean) : [],
      people: Array.isArray(h.people) ? h.people.filter(Boolean) : [],
      character: Array.isArray(h.character) ? h.character.filter(Boolean) : [],
      location: typeof h.location === 'string' ? h.location : null,
      goal: typeof h.goal === 'string' ? h.goal : null,
      project: typeof h.project === 'string' ? h.project : null,
      importance: typeof h.importance === 'number' ? h.importance : 3,
      difficulty: typeof h.difficulty === 'number' ? h.difficulty : 3,
      estimateMinutes: typeof h.estimateMinutes === 'number' ? h.estimateMinutes : null,
      polarity: h.polarity ?? 'both',
      schedule: h.schedule ?? null,
      targetPerWeek: typeof h.targetPerWeek === 'number' ? h.targetPerWeek : null,
      color: h.color ?? null,
      icon: h.icon ?? null,
      isTimed: h.isTimed ?? false,
    }))
  } catch {
    return []
  }
}

function saveHabits(defs: HabitDef[]) {
  try {
    localStorage.setItem('insight5.habits.defs.v1', JSON.stringify(defs))
  } catch {
    // ignore
  }
}

function habitMeta(habit: HabitDef): SharedMeta {
  return {
    tags: habit.tags ?? [],
    contexts: habit.contexts ?? [],
    category: habit.category ?? null,
    subcategory: habit.subcategory ?? null,
    importance: habit.importance ?? null,
    difficulty: habit.difficulty ?? null,
    estimateMinutes: habit.estimateMinutes ?? null,
    location: habit.location ?? null,
    people: habit.people ?? [],
    skills: habit.skills ?? [],
    character: habit.character ?? [],
    goal: habit.goal ?? null,
    project: habit.project ?? null,
  }
}

function applyMetaToHabit(habit: HabitDef, meta: SharedMeta): HabitDef {
  return {
    ...habit,
    tags: meta.tags,
    contexts: meta.contexts,
    category: meta.category,
    subcategory: meta.subcategory,
    importance: meta.importance ?? habit.importance ?? 3,
    difficulty: meta.difficulty ?? habit.difficulty ?? 3,
    estimateMinutes: meta.estimateMinutes,
    location: meta.location,
    people: meta.people,
    skills: meta.skills,
    character: meta.character,
    goal: meta.goal,
    project: meta.project,
  }
}

function splitChips(items: string[], max = 3) {
  const visible = items.slice(0, max)
  const remaining = Math.max(0, items.length - visible.length)
  return { visible, remaining }
}

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function numberOrNull(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

export function EcosystemView(props: {
  events: CalendarEvent[]
  tasks: Task[]
  trackerDefs?: TrackerDef[]
  inspectorPortalId?: string
  onOpenGoal?: (name: string) => void
  onOpenProject?: (name: string) => void
  onOpenTracker?: (key: string) => void
  onTrackerDefsChange?: (defs: TrackerDef[]) => void
}) {
  const [multipliers, setMultipliers] = useState(() => loadMultipliers())
  const [goalDefs, setGoalDefs] = useState<GoalDef[]>(() => loadGoalDefs())
  const [projectDefs, setProjectDefs] = useState<ProjectDef[]>(() => loadProjectDefs())
  const [habitDefs, setHabitDefs] = useState<HabitDef[]>(() => loadHabits())
  const [trackerDefs, setTrackerDefs] = useState<TrackerDef[]>(() => props.trackerDefs ?? loadTrackerDefs())
  const [customTaxonomy, setCustomTaxonomy] = useState(() => loadCustomTaxonomy())
  const [hidden, setHidden] = useState<EcosystemHidden>(() => loadEcosystemHidden())
  const [selection, setSelection] = useState<Selection>({ kind: 'none' })

  const [goalDraft, setGoalDraft] = useState('')
  const [projectDraft, setProjectDraft] = useState('')
  const [habitDraft, setHabitDraft] = useState('')
  const [trackerDraft, setTrackerDraft] = useState('')
  const [categoryDraft, setCategoryDraft] = useState('')
  const [subcategoryDrafts, setSubcategoryDrafts] = useState(['', '', ''])

  useEffect(() => {
    if (!props.trackerDefs) return
    setTrackerDefs(props.trackerDefs)
  }, [props.trackerDefs])

  const goalNames = useMemo(() => {
    const out = new Map<string, string>()
    for (const def of goalDefs) out.set(normalizeKey(def.name), def.name)
    for (const e of props.events) {
      if (!e.goal) continue
      const key = normalizeKey(e.goal)
      if (!key) continue
      if (!out.has(key)) out.set(key, e.goal)
    }
    for (const t of props.tasks) {
      if (!t.goal) continue
      const key = normalizeKey(t.goal)
      if (!key) continue
      if (!out.has(key)) out.set(key, t.goal)
    }
    return out
  }, [goalDefs, props.events, props.tasks])

  const projectNames = useMemo(() => {
    const out = new Map<string, string>()
    for (const def of projectDefs) out.set(normalizeKey(def.name), def.name)
    for (const e of props.events) {
      if (!e.project) continue
      const key = normalizeKey(e.project)
      if (!key) continue
      if (!out.has(key)) out.set(key, e.project)
    }
    for (const t of props.tasks) {
      if (!t.project) continue
      const key = normalizeKey(t.project)
      if (!key) continue
      if (!out.has(key)) out.set(key, t.project)
    }
    return out
  }, [projectDefs, props.events, props.tasks])

  const goalRows = useMemo(() => {
    return Array.from(goalNames.entries())
      .map(([key, name]) => ({
        key,
        name,
        def: goalDefs.find((d) => normalizeKey(d.name) === key) ?? null,
        multiplier: multipliers.goals[key] ?? 1,
      }))
      .filter((row) => !hiddenGoals.has(row.key))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [goalDefs, goalNames, multipliers.goals, hiddenGoals])

  const projectRows = useMemo(() => {
    return Array.from(projectNames.entries())
      .map(([key, name]) => ({
        key,
        name,
        def: projectDefs.find((d) => normalizeKey(d.name) === key) ?? null,
        multiplier: multipliers.projects[key] ?? 1,
      }))
      .filter((row) => !hiddenProjects.has(row.key))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [projectDefs, projectNames, multipliers.projects, hiddenProjects])

  const categories = useMemo(() => {
    const starter = categoriesFromStarter()
    const custom = customTaxonomy.map((c) => c.category)
    const set = new Set([...starter, ...custom])
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [customTaxonomy])

  const hiddenGoals = useMemo(() => new Set(hidden.goals.map((g) => normalizeHiddenValue('goals', g)).filter(Boolean)), [hidden.goals])
  const hiddenProjects = useMemo(() => new Set(hidden.projects.map((p) => normalizeHiddenValue('projects', p)).filter(Boolean)), [hidden.projects])
  const hiddenTrackers = useMemo(() => new Set(hidden.trackers.map((t) => normalizeHiddenValue('trackers', t)).filter(Boolean)), [hidden.trackers])
  const hiddenHabits = useMemo(() => new Set(hidden.habits.map((h) => normalizeHiddenValue('habits', h)).filter(Boolean)), [hidden.habits])
  const hiddenTags = useMemo(() => new Set(hidden.tags.map((t) => normalizeHiddenValue('tags', t)).filter(Boolean)), [hidden.tags])
  const hiddenPeople = useMemo(() => new Set(hidden.people.map((p) => normalizeHiddenValue('people', p)).filter(Boolean)), [hidden.people])
  const hiddenContexts = useMemo(() => new Set(hidden.contexts.map((c) => normalizeHiddenValue('contexts', c)).filter(Boolean)), [hidden.contexts])
  const hiddenSkills = useMemo(() => new Set(hidden.skills.map((s) => normalizeHiddenValue('skills', s)).filter(Boolean)), [hidden.skills])
  const hiddenLocations = useMemo(() => new Set(hidden.locations.map((l) => normalizeHiddenValue('locations', l)).filter(Boolean)), [hidden.locations])

  const visibleHabitDefs = useMemo(() => habitDefs.filter((h) => !hiddenHabits.has(h.id)), [habitDefs, hiddenHabits])
  const visibleTrackerDefs = useMemo(() => trackerDefs.filter((t) => !hiddenTrackers.has(t.key)), [trackerDefs, hiddenTrackers])

  const customCategoryLookup = useMemo(() => {
    const lookup = new Set<string>()
    for (const entry of customTaxonomy) {
      const name = entry.category.trim().toLowerCase()
      if (name) lookup.add(name)
    }
    return lookup
  }, [customTaxonomy])

  const tagSuggestions = useMemo(() => {
    const tags: string[] = []
    for (const e of props.events) tags.push(...(e.tags ?? []))
    for (const t of props.tasks) tags.push(...(t.tags ?? []))
    for (const h of habitDefs) tags.push(...(h.tags ?? []))
    for (const g of goalDefs) tags.push(...(g.meta.tags ?? []))
    for (const p of projectDefs) tags.push(...(p.meta.tags ?? []))
    for (const tr of trackerDefs) tags.push(...(tr.meta.tags ?? []))
    return uniqStrings(tags.map((t) => normalizeTag(String(t))).filter(Boolean))
      .filter((tag) => !hiddenTags.has(normalizeHiddenValue('tags', tag)))
      .sort()
  }, [goalDefs, habitDefs, projectDefs, props.events, props.tasks, trackerDefs, hiddenTags])

  const contextSuggestions = useMemo(() => {
    const contexts: string[] = []
    for (const e of props.events) contexts.push(...(e.contexts ?? []))
    for (const t of props.tasks) contexts.push(...(t.contexts ?? []))
    for (const h of habitDefs) contexts.push(...(h.contexts ?? []))
    for (const g of goalDefs) contexts.push(...(g.meta.contexts ?? []))
    for (const p of projectDefs) contexts.push(...(p.meta.contexts ?? []))
    for (const tr of trackerDefs) contexts.push(...(tr.meta.contexts ?? []))
    return uniqStrings(contexts)
      .filter((context) => !hiddenContexts.has(normalizeHiddenValue('contexts', context)))
      .sort()
  }, [goalDefs, habitDefs, projectDefs, props.events, props.tasks, trackerDefs, hiddenContexts])

  const peopleSuggestions = useMemo(() => {
    const people: string[] = []
    for (const e of props.events) people.push(...(e.people ?? []))
    for (const t of props.tasks) people.push(...(t.people ?? []))
    for (const h of habitDefs) people.push(...(h.people ?? []))
    for (const g of goalDefs) people.push(...(g.meta.people ?? []))
    for (const p of projectDefs) people.push(...(p.meta.people ?? []))
    for (const tr of trackerDefs) people.push(...(tr.meta.people ?? []))
    return uniqStrings(people)
      .filter((person) => !hiddenPeople.has(normalizeHiddenValue('people', person)))
      .sort()
  }, [goalDefs, habitDefs, projectDefs, props.events, props.tasks, trackerDefs, hiddenPeople])

  const locationSuggestions = useMemo(() => {
    const locations: string[] = []
    for (const e of props.events) if (e.location) locations.push(...parseCommaList(e.location))
    for (const t of props.tasks) if (t.location) locations.push(...parseCommaList(t.location))
    for (const h of habitDefs) if (h.location) locations.push(...parseCommaList(h.location))
    for (const g of goalDefs) if (g.meta.location) locations.push(...parseCommaList(g.meta.location))
    for (const p of projectDefs) if (p.meta.location) locations.push(...parseCommaList(p.meta.location))
    for (const tr of trackerDefs) if (tr.meta.location) locations.push(...parseCommaList(tr.meta.location))
    return uniqStrings(locations)
      .filter((location) => !hiddenLocations.has(normalizeHiddenValue('locations', location)))
      .sort()
  }, [goalDefs, habitDefs, projectDefs, props.events, props.tasks, trackerDefs, hiddenLocations])

  const skillSuggestions = useMemo(() => {
    const skills: string[] = []
    for (const e of props.events) skills.push(...(e.skills ?? []))
    for (const t of props.tasks) skills.push(...(t.skills ?? []))
    for (const h of habitDefs) skills.push(...(h.skills ?? []))
    for (const g of goalDefs) skills.push(...(g.meta.skills ?? []))
    for (const p of projectDefs) skills.push(...(p.meta.skills ?? []))
    for (const tr of trackerDefs) skills.push(...(tr.meta.skills ?? []))
    return uniqStrings(skills)
      .filter((skill) => !hiddenSkills.has(normalizeHiddenValue('skills', skill)))
      .sort()
  }, [goalDefs, habitDefs, projectDefs, props.events, props.tasks, trackerDefs, hiddenSkills])

  const tagStats = useMemo(() => {
    const map = new Map<string, { tag: string; count: number }>()
    const add = (raw: string) => {
      const tag = normalizeTag(String(raw))
      if (!tag) return
      const key = tag.toLowerCase()
      const row = map.get(key) ?? { tag, count: 0 }
      row.count += 1
      map.set(key, row)
    }
    for (const e of props.events) (e.tags ?? []).forEach(add)
    for (const t of props.tasks) (t.tags ?? []).forEach(add)
    for (const h of habitDefs) (h.tags ?? []).forEach(add)
    for (const g of goalDefs) (g.meta.tags ?? []).forEach(add)
    for (const p of projectDefs) (p.meta.tags ?? []).forEach(add)
    for (const tr of trackerDefs) (tr.meta.tags ?? []).forEach(add)
    return Array.from(map.values())
      .filter((row) => !hiddenTags.has(normalizeHiddenValue('tags', row.tag)))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
  }, [goalDefs, habitDefs, projectDefs, props.events, props.tasks, trackerDefs, hiddenTags])

  const peopleStats = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>()
    const add = (raw: string) => {
      const name = String(raw).trim()
      if (!name) return
      const key = name.toLowerCase()
      const row = map.get(key) ?? { name, count: 0 }
      row.count += 1
      map.set(key, row)
    }
    for (const e of props.events) (e.people ?? []).forEach(add)
    for (const t of props.tasks) (t.people ?? []).forEach(add)
    for (const h of habitDefs) (h.people ?? []).forEach(add)
    for (const g of goalDefs) (g.meta.people ?? []).forEach(add)
    for (const p of projectDefs) (p.meta.people ?? []).forEach(add)
    for (const tr of trackerDefs) (tr.meta.people ?? []).forEach(add)
    return Array.from(map.values())
      .filter((row) => !hiddenPeople.has(normalizeHiddenValue('people', row.name)))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  }, [goalDefs, habitDefs, projectDefs, props.events, props.tasks, trackerDefs, hiddenPeople])

  const contextStats = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>()
    const add = (raw: string) => {
      const name = String(raw).trim()
      if (!name) return
      const key = name.toLowerCase()
      const row = map.get(key) ?? { name, count: 0 }
      row.count += 1
      map.set(key, row)
    }
    for (const e of props.events) (e.contexts ?? []).forEach(add)
    for (const t of props.tasks) (t.contexts ?? []).forEach(add)
    for (const h of habitDefs) (h.contexts ?? []).forEach(add)
    for (const g of goalDefs) (g.meta.contexts ?? []).forEach(add)
    for (const p of projectDefs) (p.meta.contexts ?? []).forEach(add)
    for (const tr of trackerDefs) (tr.meta.contexts ?? []).forEach(add)
    return Array.from(map.values())
      .filter((row) => !hiddenContexts.has(normalizeHiddenValue('contexts', row.name)))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  }, [goalDefs, habitDefs, projectDefs, props.events, props.tasks, trackerDefs, hiddenContexts])

  const skillStats = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>()
    const add = (raw: string) => {
      const name = String(raw).trim()
      if (!name) return
      const key = name.toLowerCase()
      const row = map.get(key) ?? { name, count: 0 }
      row.count += 1
      map.set(key, row)
    }
    for (const e of props.events) (e.skills ?? []).forEach(add)
    for (const t of props.tasks) (t.skills ?? []).forEach(add)
    for (const h of habitDefs) (h.skills ?? []).forEach(add)
    for (const g of goalDefs) (g.meta.skills ?? []).forEach(add)
    for (const p of projectDefs) (p.meta.skills ?? []).forEach(add)
    for (const tr of trackerDefs) (tr.meta.skills ?? []).forEach(add)
    return Array.from(map.values())
      .filter((row) => !hiddenSkills.has(normalizeHiddenValue('skills', row.name)))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  }, [goalDefs, habitDefs, projectDefs, props.events, props.tasks, trackerDefs, hiddenSkills])

  const locationStats = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>()
    const add = (raw: string) => {
      if (!raw) return
      const locations = parseCommaList(String(raw))
      for (const item of locations) {
        const name = item.trim()
        if (!name) continue
        const key = name.toLowerCase()
        const row = map.get(key) ?? { name, count: 0 }
        row.count += 1
        map.set(key, row)
      }
    }
    for (const e of props.events) add(e.location ?? '')
    for (const t of props.tasks) add(t.location ?? '')
    for (const h of habitDefs) add(h.location ?? '')
    for (const g of goalDefs) add(g.meta.location ?? '')
    for (const p of projectDefs) add(p.meta.location ?? '')
    for (const tr of trackerDefs) add(tr.meta.location ?? '')
    return Array.from(map.values())
      .filter((row) => !hiddenLocations.has(normalizeHiddenValue('locations', row.name)))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  }, [goalDefs, habitDefs, projectDefs, props.events, props.tasks, trackerDefs, hiddenLocations])

  const goalSuggestions = useMemo(
    () =>
      Array.from(goalNames.values())
        .filter((name) => !hiddenGoals.has(normalizeKey(name)))
        .sort((a, b) => a.localeCompare(b)),
    [goalNames, hiddenGoals],
  )
  const projectSuggestions = useMemo(
    () =>
      Array.from(projectNames.values())
        .filter((name) => !hiddenProjects.has(normalizeKey(name)))
        .sort((a, b) => a.localeCompare(b)),
    [projectNames, hiddenProjects],
  )

  function updateMultipliers(next: typeof multipliers) {
    setMultipliers(next)
    saveMultipliers(next)
  }

  function ensureGoalDef(name: string) {
    const key = normalizeKey(name)
    if (!key) return null
    const existing = goalDefs.find((d) => normalizeKey(d.name) === key)
    if (existing) return existing
    const next: GoalDef = { id: makeId('goal'), name, createdAt: Date.now(), meta: emptySharedMeta() }
    const nextDefs = [next, ...goalDefs]
    setGoalDefs(nextDefs)
    saveGoalDefs(nextDefs)
    return next
  }

  function ensureProjectDef(name: string) {
    const key = normalizeKey(name)
    if (!key) return null
    const existing = projectDefs.find((d) => normalizeKey(d.name) === key)
    if (existing) return existing
    const next: ProjectDef = { id: makeId('project'), name, createdAt: Date.now(), meta: emptySharedMeta() }
    const nextDefs = [next, ...projectDefs]
    setProjectDefs(nextDefs)
    saveProjectDefs(nextDefs)
    return next
  }

  function updateGoalMultiplier(name: string, value: number) {
    const key = normalizeKey(name)
    if (!key) return
    ensureGoalDef(name)
    updateMultipliers({
      ...multipliers,
      goals: { ...multipliers.goals, [key]: clamp(value, 0.1, 3) },
    })
  }

  function updateProjectMultiplier(name: string, value: number) {
    const key = normalizeKey(name)
    if (!key) return
    ensureProjectDef(name)
    updateMultipliers({
      ...multipliers,
      projects: { ...multipliers.projects, [key]: clamp(value, 0.1, 3) },
    })
  }

  function updateGoalMeta(key: string, meta: SharedMeta) {
    const next = goalDefs.map((g) => (normalizeKey(g.name) === key ? { ...g, meta } : g))
    setGoalDefs(next)
    saveGoalDefs(next)
  }

  function updateProjectMeta(key: string, meta: SharedMeta) {
    const next = projectDefs.map((p) => (normalizeKey(p.name) === key ? { ...p, meta } : p))
    setProjectDefs(next)
    saveProjectDefs(next)
  }

  function updateHabits(next: HabitDef[]) {
    setHabitDefs(next)
    saveHabits(next)
    window.dispatchEvent(new Event(HABITS_UPDATED_EVENT))
  }

  function updateTrackers(next: TrackerDef[]) {
    setTrackerDefs(next)
    saveTrackerDefs(next)
    props.onTrackerDefsChange?.(next)
  }

  type HiddenKind = keyof EcosystemHidden

  function updateHidden(updater: (prev: EcosystemHidden) => EcosystemHidden) {
    setHidden((prev) => {
      const next = updater(prev)
      saveEcosystemHidden(next)
      return next
    })
  }

  function normalizeHiddenValue(kind: HiddenKind, value: string) {
    const trimmed = value.trim()
    if (!trimmed) return ''
    switch (kind) {
      case 'goals':
      case 'projects':
      case 'trackers':
        return normalizeKey(trimmed)
      case 'tags': {
        const tag = normalizeTag(trimmed)
        return tag ? tag.toLowerCase() : ''
      }
      case 'people':
      case 'contexts':
      case 'skills':
      case 'locations':
        return trimmed.toLowerCase()
      case 'habits':
        return trimmed
      default:
        return trimmed.toLowerCase()
    }
  }

  function hideValue(kind: HiddenKind, value: string) {
    const normalized = normalizeHiddenValue(kind, value)
    if (!normalized) return
    updateHidden((prev) => {
      const list = prev[kind]
      if (list.includes(normalized)) return prev
      return { ...prev, [kind]: [...list, normalized] } as EcosystemHidden
    })
  }

  function unhideValue(kind: HiddenKind, value: string) {
    const normalized = normalizeHiddenValue(kind, value)
    if (!normalized) return
    updateHidden((prev) => {
      const list = prev[kind]
      if (!list.includes(normalized)) return prev
      return { ...prev, [kind]: list.filter((item) => item !== normalized) } as EcosystemHidden
    })
  }

  function updateHabitById(id: string, patch: Partial<HabitDef>) {
    const next = habitDefs.map((h) => (h.id === id ? { ...h, ...patch } : h))
    updateHabits(next)
  }

  function updateTrackerByKey(key: string, patch: Partial<TrackerDef>) {
    const next = trackerDefs.map((t) => (t.key === key ? { ...t, ...patch } : t))
    updateTrackers(next)
  }

  function updateTrackerUnit(key: string, patch: Partial<TrackerDef['unit']>) {
    const next = trackerDefs.map((t) => (t.key === key ? { ...t, unit: { ...t.unit, ...patch } } : t))
    updateTrackers(next)
  }

  function removeGoalDef(key: string) {
    hideValue('goals', key)
    const nextDefs = goalDefs.filter((g) => normalizeKey(g.name) !== key)
    if (nextDefs.length !== goalDefs.length) {
      setGoalDefs(nextDefs)
      saveGoalDefs(nextDefs)
    }
    if (multipliers.goals[key] != null) {
      const { [key]: _, ...rest } = multipliers.goals
      updateMultipliers({ ...multipliers, goals: rest })
    }
    if (selection.kind === 'goal' && selection.key === key) setSelection({ kind: 'none' })
  }

  function removeProjectDef(key: string) {
    hideValue('projects', key)
    const nextDefs = projectDefs.filter((p) => normalizeKey(p.name) !== key)
    if (nextDefs.length !== projectDefs.length) {
      setProjectDefs(nextDefs)
      saveProjectDefs(nextDefs)
    }
    if (multipliers.projects[key] != null) {
      const { [key]: _, ...rest } = multipliers.projects
      updateMultipliers({ ...multipliers, projects: rest })
    }
    if (selection.kind === 'project' && selection.key === key) setSelection({ kind: 'none' })
  }

  function removeHabitById(id: string) {
    hideValue('habits', id)
    const nextDefs = habitDefs.filter((h) => h.id !== id)
    if (nextDefs.length !== habitDefs.length) updateHabits(nextDefs)
    if (selection.kind === 'habit' && selection.id === id) setSelection({ kind: 'none' })
  }

  function removeTrackerByKey(key: string) {
    hideValue('trackers', key)
    const nextDefs = trackerDefs.filter((t) => t.key !== key)
    if (nextDefs.length !== trackerDefs.length) updateTrackers(nextDefs)
    if (selection.kind === 'tracker' && selection.key === key) setSelection({ kind: 'none' })
  }

  function addCustomCategory() {
    const category = categoryDraft.trim()
    if (!category) return
    upsertCategory(category, [])
    setCustomTaxonomy(loadCustomTaxonomy())
    setCategoryDraft('')
    setSelection({ kind: 'category', category })
  }

  function isCustomCategory(category: string) {
    return customCategoryLookup.has(category.trim().toLowerCase())
  }

  function removeCategoryEntry(category: string) {
    if (!isCustomCategory(category)) return
    removeCategory(category)
    setCustomTaxonomy(loadCustomTaxonomy())
    if (selection.kind === 'category' && selection.category.toLowerCase() === category.toLowerCase()) {
      setSelection({ kind: 'none' })
    }
  }

  function subcategoriesForCategory(category: string) {
    const base = subcategoriesFromStarter(category)
    const custom = customTaxonomy.find((c) => c.category.toLowerCase() === category.toLowerCase())?.subcategories ?? []
    return Array.from(new Set([...base, ...custom]))
  }

  function updateCategorySubcategories(category: string, subs: string[]) {
    upsertCategory(category, subs)
    setCustomTaxonomy(loadCustomTaxonomy())
  }

  const selectedGoal = selection.kind === 'goal' ? goalDefs.find((g) => normalizeKey(g.name) === selection.key) ?? null : null
  const selectedProject = selection.kind === 'project' ? projectDefs.find((p) => normalizeKey(p.name) === selection.key) ?? null : null
  const selectedHabit = selection.kind === 'habit' ? habitDefs.find((h) => h.id === selection.id) ?? null : null
  const selectedTracker = selection.kind === 'tracker' ? trackerDefs.find((t) => t.key === selection.key) ?? null : null
  const selectedCategory = selection.kind === 'category' ? selection.category : null

  function buildSubcategoryPath(parts: string[]) {
    const cleaned = parts.map((p) => p.trim()).filter(Boolean)
    return cleaned.join(' / ')
  }

  function addSubcategoryPath(category: string) {
    const path = buildSubcategoryPath(subcategoryDrafts)
    if (!path) return
    const subs = subcategoriesForCategory(category)
    updateCategorySubcategories(category, uniqStrings([...subs, path]))
    setSubcategoryDrafts(['', '', ''])
  }

  const inspectorPortalId = props.inspectorPortalId ?? ''
  const shouldPortal = Boolean(inspectorPortalId)
  const inspectorHost = typeof document !== 'undefined' && shouldPortal
    ? document.getElementById(inspectorPortalId)
    : null
  const inspectorCard = (
    <div className={`ecoSidebarCard${shouldPortal ? ' portal' : ''}`}>
      <div className="ecoSidebarHeader">
        <div>
          <h3 className="ecoSidebarTitle">Inspector</h3>
          <p className="ecoSidebarSubtitle">Edit links, chips, and defaults.</p>
        </div>
        {selection.kind !== 'none' ? (
          <button className="ecoActionBtn" type="button" onClick={() => setSelection({ kind: 'none' })}>
            Clear
          </button>
        ) : null}
      </div>

      {selection.kind === 'none' ? (
        <div className="ecoEmptyState">
          <Icon name="sparkle" size={28} />
          <p>Select a card to edit details.</p>
        </div>
      ) : null}

      {selection.kind === 'goal' && selectedGoal ? (
        <div className="space-y-6">
          <div className="ecoDetailHeader">
            <div>
              <div className="ecoDetailEyebrow">Goal</div>
              <div className="ecoDetailTitle">{selectedGoal.name}</div>
            </div>
            <div className="ecoDetailActions">
              <button className="ecoActionBtn" type="button" onClick={() => props.onOpenGoal?.(selectedGoal.name)}>
                Open goal
              </button>
              <button className="ecoActionBtn danger" type="button" onClick={() => removeGoalDef(selection.key)}>
                Remove
              </button>
            </div>
          </div>
          <div className="ecoDetailRow">
            <span className="ecoDetailLabel">Multiplier</span>
            <input
              className="ecoMiniInput"
              type="number"
              min={0.1}
              max={3}
              step={0.1}
              value={multipliers.goals[selection.key] ?? 1}
              onChange={(e) => updateGoalMultiplier(selectedGoal.name, Number(e.target.value))}
            />
          </div>
          <MetaEditor
            value={selectedGoal.meta}
            onChange={(meta) => updateGoalMeta(selection.key, meta)}
            suggestions={{
              tags: tagSuggestions,
              contexts: contextSuggestions,
              people: peopleSuggestions,
              locations: locationSuggestions,
              skills: skillSuggestions,
              categories,
              subcategories: selectedGoal.meta.category ? subcategoriesForCategory(selectedGoal.meta.category) : [],
              goals: goalSuggestions,
              projects: projectSuggestions,
            }}
          />
        </div>
      ) : null}

      {selection.kind === 'project' && selectedProject ? (
        <div className="space-y-6">
          <div className="ecoDetailHeader">
            <div>
              <div className="ecoDetailEyebrow">Project</div>
              <div className="ecoDetailTitle">{selectedProject.name}</div>
            </div>
            <div className="ecoDetailActions">
              <button className="ecoActionBtn" type="button" onClick={() => props.onOpenProject?.(selectedProject.name)}>
                Open project
              </button>
              <button className="ecoActionBtn danger" type="button" onClick={() => removeProjectDef(selection.key)}>
                Remove
              </button>
            </div>
          </div>
          <div className="ecoDetailRow">
            <span className="ecoDetailLabel">Multiplier</span>
            <input
              className="ecoMiniInput"
              type="number"
              min={0.1}
              max={3}
              step={0.1}
              value={multipliers.projects[selection.key] ?? 1}
              onChange={(e) => updateProjectMultiplier(selectedProject.name, Number(e.target.value))}
            />
          </div>
          <MetaEditor
            value={selectedProject.meta}
            onChange={(meta) => updateProjectMeta(selection.key, meta)}
            suggestions={{
              tags: tagSuggestions,
              contexts: contextSuggestions,
              people: peopleSuggestions,
              locations: locationSuggestions,
              skills: skillSuggestions,
              categories,
              subcategories: selectedProject.meta.category ? subcategoriesForCategory(selectedProject.meta.category) : [],
              goals: goalSuggestions,
              projects: projectSuggestions,
            }}
          />
        </div>
      ) : null}

      {selection.kind === 'habit' && selectedHabit ? (
        <div className="space-y-6">
          <div className="ecoDetailHeader">
            <div>
              <div className="ecoDetailEyebrow">Habit</div>
              <input
                className="detailSmall"
                value={selectedHabit.name}
                onChange={(e) => {
                  const name = e.target.value
                  const next = habitDefs.map((h) => (h.id === selectedHabit.id ? { ...h, name } : h))
                  updateHabits(next)
                }}
              />
            </div>
            <div className="ecoDetailActions">
              <button className="ecoActionBtn danger" type="button" onClick={() => removeHabitById(selectedHabit.id)}>
                Remove
              </button>
            </div>
          </div>
          <div className="detailGrid">
            <label>
              Schedule
              <input
                className="detailSmall"
                value={selectedHabit.schedule ?? ''}
                onChange={(e) => updateHabitById(selectedHabit.id, { schedule: e.target.value })}
                placeholder="Mon/Wed/Fri"
              />
            </label>
            <label>
              Target per week
              <input
                className="detailSmall"
                value={selectedHabit.targetPerWeek ?? ''}
                onChange={(e) => updateHabitById(selectedHabit.id, { targetPerWeek: numberOrNull(e.target.value) })}
                placeholder="4"
              />
            </label>
          </div>
          <div className="detailGrid">
            <div>
              <div className="detailLabel">Timed habit</div>
              <button
                className={selectedHabit.isTimed ? 'detailToggle active' : 'detailToggle'}
                type="button"
                onClick={() => updateHabitById(selectedHabit.id, { isTimed: !selectedHabit.isTimed })}
              >
                {selectedHabit.isTimed ? 'Timed' : 'Untimed'}
              </button>
            </div>
            <label>
              Polarity
              <select
                className="detailSmall"
                value={selectedHabit.polarity ?? 'both'}
                onChange={(e) => updateHabitById(selectedHabit.id, { polarity: e.target.value as HabitDef['polarity'] })}
              >
                <option value="positive">positive</option>
                <option value="negative">negative</option>
                <option value="both">both</option>
              </select>
            </label>
          </div>
          <MetaEditor
            value={habitMeta(selectedHabit)}
            onChange={(meta) => {
              const next = habitDefs.map((h) => (h.id === selectedHabit.id ? applyMetaToHabit(h, meta) : h))
              updateHabits(next)
            }}
            suggestions={{
              tags: tagSuggestions,
              contexts: contextSuggestions,
              people: peopleSuggestions,
              locations: locationSuggestions,
              skills: skillSuggestions,
              categories,
              subcategories: selectedHabit.category ? subcategoriesForCategory(selectedHabit.category) : [],
              goals: goalSuggestions,
              projects: projectSuggestions,
            }}
          />
        </div>
      ) : null}

      {selection.kind === 'tracker' && selectedTracker ? (
        <div className="space-y-6">
          <div className="ecoDetailHeader">
            <div>
              <div className="ecoDetailEyebrow">Tracker</div>
              <div className="ecoDetailTitle">{selectedTracker.label}</div>
            </div>
            <div className="ecoDetailActions">
              <button className="ecoActionBtn" type="button" onClick={() => props.onOpenTracker?.(selectedTracker.key)}>
                Open tracker
              </button>
              <button className="ecoActionBtn danger" type="button" onClick={() => removeTrackerByKey(selectedTracker.key)}>
                Remove
              </button>
            </div>
          </div>
          <div className="detailGrid">
            <label>
              Label
              <input
                className="detailSmall"
                value={selectedTracker.label}
                onChange={(e) => {
                  const next = trackerDefs.map((t) => (t.key === selectedTracker.key ? { ...t, label: e.target.value } : t))
                  updateTrackers(next)
                }}
              />
            </label>
            <label>
              Key
              <input className="detailSmall" value={selectedTracker.key} readOnly />
            </label>
          </div>
          <TrackerUnitEditor
            unit={selectedTracker.unit}
            onChange={(unit) => {
              const next = trackerDefs.map((t) => (t.key === selectedTracker.key ? { ...t, unit } : t))
              updateTrackers(next)
            }}
          />
          <MetaEditor
            value={selectedTracker.meta}
            onChange={(meta) => {
              const next = trackerDefs.map((t) => (t.key === selectedTracker.key ? { ...t, meta } : t))
              updateTrackers(next)
            }}
            suggestions={{
              tags: tagSuggestions,
              contexts: contextSuggestions,
              people: peopleSuggestions,
              locations: locationSuggestions,
              skills: skillSuggestions,
              categories,
              subcategories: selectedTracker.meta.category ? subcategoriesForCategory(selectedTracker.meta.category) : [],
              goals: goalSuggestions,
              projects: projectSuggestions,
            }}
          />
        </div>
      ) : null}

      {selection.kind === 'category' && selectedCategory ? (
        <div className="space-y-6">
          <div className="ecoDetailHeader">
            <div>
              <div className="ecoDetailEyebrow">Category</div>
              <div className="ecoDetailTitle">{selectedCategory}</div>
            </div>
            {isCustomCategory(selectedCategory) ? (
              <div className="ecoDetailActions">
                <button
                  className="ecoActionBtn danger"
                  type="button"
                  onClick={() => removeCategoryEntry(selectedCategory)}
                >
                  Remove
                </button>
              </div>
            ) : null}
          </div>
          <div className="detailRow">
            <div className="detailLabel">Subcategories</div>
            <div className="detailChips">
              {subcategoriesForCategory(selectedCategory).map((sub) => (
                <button
                  key={sub}
                  className="detailChip"
                  onClick={() =>
                    updateCategorySubcategories(
                      selectedCategory,
                      subcategoriesForCategory(selectedCategory).filter((x) => x !== sub),
                    )
                  }
                  type="button">
                  {sub}
                  <span className="detailChipRemove">×</span>
                </button>
              ))}
              <div className="taxonomyPathInput">
                <input
                  className="taxonomyPathField"
                  value={subcategoryDrafts[0] ?? ''}
                  onChange={(e) => setSubcategoryDrafts([e.target.value, subcategoryDrafts[1] ?? '', subcategoryDrafts[2] ?? ''])}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return
                    e.preventDefault()
                    addSubcategoryPath(selectedCategory)
                  }}
                  placeholder="Level 1"
                />
                <span className="taxonomyPathDivider">/</span>
                <input
                  className="taxonomyPathField"
                  value={subcategoryDrafts[1] ?? ''}
                  onChange={(e) => setSubcategoryDrafts([subcategoryDrafts[0] ?? '', e.target.value, subcategoryDrafts[2] ?? ''])}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return
                    e.preventDefault()
                    addSubcategoryPath(selectedCategory)
                  }}
                  placeholder="Level 2"
                />
                <span className="taxonomyPathDivider">/</span>
                <input
                  className="taxonomyPathField"
                  value={subcategoryDrafts[2] ?? ''}
                  onChange={(e) => setSubcategoryDrafts([subcategoryDrafts[0] ?? '', subcategoryDrafts[1] ?? '', e.target.value])}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return
                    e.preventDefault()
                    addSubcategoryPath(selectedCategory)
                  }}
                  placeholder="Level 3"
                />
                <button
                  className="taxonomyPathAdd"
                  type="button"
                  onClick={() => addSubcategoryPath(selectedCategory)}
                >
                  Add
                </button>
                <button
                  className="taxonomyPathClear"
                  type="button"
                  onClick={() => setSubcategoryDrafts(['', '', ''])}
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="taxonomyPathHint">Example: Professional / Residency / Coding</div>
          </div>
        </div>
      ) : null}
    </div>
  )

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] text-[var(--text)] font-['Figtree'] overflow-hidden">
      <div className="px-10 pt-10 pb-6 bg-[var(--bg)]/80 backdrop-blur-xl sticky top-0 z-10 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight">Ecosystem</h1>
            <p className="text-sm text-[var(--muted)] font-semibold">Define the structures that organize your digital life.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-10 pb-32 max-w-7xl mx-auto w-full">
        <div className="flex flex-col xl:flex-row gap-8 h-full">
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-10 pb-8">
              <section className="ecoSection">
                <div className="ecoSectionHeader">
                  <div className="ecoSectionTitle">
                    <Icon name="target" size={18} className="text-[var(--accent)]" />
                    <div>
                      <h2 className="ecoSectionTitleText">Goal multipliers</h2>
                      <p className="ecoSectionSubtitle">Weight goal impact and link tags.</p>
                    </div>
                  </div>
                  <div className="ecoSectionMeta">{goalRows.length} goals</div>
                </div>
                <div className="ecoCardGrid">
                  {goalRows.length === 0 ? (
                    <div className="ecoEmpty">No goals yet</div>
                  ) : (
                    goalRows.map((row) => {
                      const tags = row.def?.meta.tags ?? []
                      const { visible, remaining } = splitChips(tags, 3)
                      const active = selection.kind === 'goal' && selection.key === row.key
                      return (
                        <div
                          key={row.key}
                          className={active ? 'ecoCard active' : 'ecoCard'}
                          onClick={() => {
                            const def = ensureGoalDef(row.name)
                            if (def) setSelection({ kind: 'goal', key: normalizeKey(def.name) })
                          }}
                        >
                          <div className="ecoCardTop">
                            <div className="ecoCardTitle">{row.name}</div>
                            <div className="ecoCardActions">
                              <button
                                className="ecoActionBtn"
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  props.onOpenGoal?.(row.name)
                                }}
                              >
                                Open
                              </button>
                              <button
                                className="ecoActionBtn danger"
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeGoalDef(row.key)
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                          <div className="ecoCardMeta">
                            <label className="ecoMetaRow">
                              <span>Multiplier</span>
                              <input
                                className="ecoMiniInput"
                                type="number"
                                min={0.1}
                                max={3}
                                step={0.1}
                                value={row.multiplier}
                                onClick={(e) => e.stopPropagation()}
                                onFocus={(e) => e.stopPropagation()}
                                onChange={(e) => updateGoalMultiplier(row.name, Number(e.target.value))}
                              />
                            </label>
                            <div className="ecoMetaRow">
                              <span>Importance</span>
                              <span>{row.def?.meta.importance ?? '—'}</span>
                            </div>
                            <div className="ecoMetaRow">
                              <span>Category</span>
                              <span>{row.def?.meta.category ?? '—'}</span>
                            </div>
                          </div>
                          <div className="ecoCardChips">
                            {visible.map((tag) => (
                              <span key={tag} className="detailChip pointer-events-none">
                                {tag}
                              </span>
                            ))}
                            {remaining > 0 ? <span className="ecoChipCount">+{remaining}</span> : null}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
                <div className="ecoAddRow">
                  <input
                    className="ecoAddInput"
                    value={goalDraft}
                    onChange={(e) => setGoalDraft(e.target.value)}
                    placeholder="Add goal name..."
                  />
                  <button
                    className="ecoAddButton"
                    onClick={() => {
                      const name = goalDraft.trim()
                      if (!name) return
                      const def = ensureGoalDef(name)
                      updateGoalMultiplier(name, 1)
                      unhideValue('goals', name)
                      setGoalDraft('')
                      if (def) setSelection({ kind: 'goal', key: normalizeKey(def.name) })
                    }}
                  >
                    Add goal
                  </button>
                </div>
              </section>

              <section className="ecoSection">
                <div className="ecoSectionHeader">
                  <div className="ecoSectionTitle">
                    <Icon name="briefcase" size={18} className="text-[var(--accent)]" />
                    <div>
                      <h2 className="ecoSectionTitleText">Project multipliers</h2>
                      <p className="ecoSectionSubtitle">Score projects with the right weight.</p>
                    </div>
                  </div>
                  <div className="ecoSectionMeta">{projectRows.length} projects</div>
                </div>
                <div className="ecoCardGrid">
                  {projectRows.length === 0 ? (
                    <div className="ecoEmpty">No projects yet</div>
                  ) : (
                    projectRows.map((row) => {
                      const tags = row.def?.meta.tags ?? []
                      const { visible, remaining } = splitChips(tags, 3)
                      const active = selection.kind === 'project' && selection.key === row.key
                      return (
                        <div
                          key={row.key}
                          className={active ? 'ecoCard active' : 'ecoCard'}
                          onClick={() => {
                            const def = ensureProjectDef(row.name)
                            if (def) setSelection({ kind: 'project', key: normalizeKey(def.name) })
                          }}
                        >
                          <div className="ecoCardTop">
                            <div className="ecoCardTitle">{row.name}</div>
                            <div className="ecoCardActions">
                              <button
                                className="ecoActionBtn"
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  props.onOpenProject?.(row.name)
                                }}
                              >
                                Open
                              </button>
                              <button
                                className="ecoActionBtn danger"
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeProjectDef(row.key)
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                          <div className="ecoCardMeta">
                            <label className="ecoMetaRow">
                              <span>Multiplier</span>
                              <input
                                className="ecoMiniInput"
                                type="number"
                                min={0.1}
                                max={3}
                                step={0.1}
                                value={row.multiplier}
                                onClick={(e) => e.stopPropagation()}
                                onFocus={(e) => e.stopPropagation()}
                                onChange={(e) => updateProjectMultiplier(row.name, Number(e.target.value))}
                              />
                            </label>
                            <div className="ecoMetaRow">
                              <span>Importance</span>
                              <span>{row.def?.meta.importance ?? '—'}</span>
                            </div>
                            <div className="ecoMetaRow">
                              <span>Category</span>
                              <span>{row.def?.meta.category ?? '—'}</span>
                            </div>
                          </div>
                          <div className="ecoCardChips">
                            {visible.map((tag) => (
                              <span key={tag} className="detailChip pointer-events-none">
                                {tag}
                              </span>
                            ))}
                            {remaining > 0 ? <span className="ecoChipCount">+{remaining}</span> : null}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
                <div className="ecoAddRow">
                  <input
                    className="ecoAddInput"
                    value={projectDraft}
                    onChange={(e) => setProjectDraft(e.target.value)}
                    placeholder="Add project name..."
                  />
                  <button
                    className="ecoAddButton"
                    onClick={() => {
                      const name = projectDraft.trim()
                      if (!name) return
                      const def = ensureProjectDef(name)
                      updateProjectMultiplier(name, 1)
                      unhideValue('projects', name)
                      setProjectDraft('')
                      if (def) setSelection({ kind: 'project', key: normalizeKey(def.name) })
                    }}
                  >
                    Add project
                  </button>
                </div>
              </section>

              <section className="ecoSection">
                <div className="ecoSectionHeader">
                  <div className="ecoSectionTitle">
                    <Icon name="smile" size={18} className="text-[var(--accent)]" />
                    <div>
                      <h2 className="ecoSectionTitleText">Habits</h2>
                      <p className="ecoSectionSubtitle">Default settings for habit tracking.</p>
                    </div>
                  </div>
                  <div className="ecoSectionMeta">{visibleHabitDefs.length} habits</div>
                </div>
                <div className="ecoCardGrid">
                  {visibleHabitDefs.length === 0 ? (
                    <div className="ecoEmpty">No habits yet</div>
                  ) : (
                    visibleHabitDefs.map((habit) => {
                      const tags = habit.tags ?? []
                      const { visible, remaining } = splitChips(tags, 3)
                      const active = selection.kind === 'habit' && selection.id === habit.id
                      return (
                        <div
                          key={habit.id}
                          className={active ? 'ecoCard active' : 'ecoCard'}
                          onClick={() => setSelection({ kind: 'habit', id: habit.id })}
                        >
                          <div className="ecoCardTop">
                            <div className="ecoCardTitle">{habit.name}</div>
                            <div className="ecoCardActions">
                              <button
                                className="ecoActionBtn danger"
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeHabitById(habit.id)
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                          <div className="ecoCardMeta">
                            <div className="ecoMetaRow">
                              <span>Target</span>
                              <span>{habit.targetPerWeek ? `${habit.targetPerWeek}/wk` : '—'}</span>
                            </div>
                            <div className="ecoMetaRow">
                              <span>Importance</span>
                              <span>{habit.importance ?? '—'}</span>
                            </div>
                            <div className="ecoMetaRow">
                              <span>Difficulty</span>
                              <span>{habit.difficulty ?? '—'}</span>
                            </div>
                          </div>
                          <div className="ecoCardChips">
                            {visible.map((tag) => (
                              <span key={tag} className="detailChip pointer-events-none">
                                {tag}
                              </span>
                            ))}
                            {remaining > 0 ? <span className="ecoChipCount">+{remaining}</span> : null}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
                <div className="ecoAddRow">
                  <input
                    className="ecoAddInput"
                    value={habitDraft}
                    onChange={(e) => setHabitDraft(e.target.value)}
                    placeholder="Add habit name..."
                  />
                  <button
                    className="ecoAddButton"
                    onClick={() => {
                      const name = habitDraft.trim()
                      if (!name) return
                      const next: HabitDef = {
                        id: makeId('habit'),
                        name,
                        tags: [],
                        contexts: [],
                        people: [],
                        skills: [],
                        character: [],
                        location: null,
                        goal: null,
                        project: null,
                        category: null,
                        subcategory: null,
                        importance: 3,
                        difficulty: 3,
                        estimateMinutes: null,
                        polarity: 'both',
                        schedule: null,
                        targetPerWeek: null,
                        color: null,
                        icon: null,
                        isTimed: false,
                      }
                      const nextDefs = [next, ...habitDefs]
                      updateHabits(nextDefs)
                      unhideValue('habits', next.id)
                      setHabitDraft('')
                      setSelection({ kind: 'habit', id: next.id })
                    }}
                  >
                    Add habit
                  </button>
                </div>
              </section>

              <section className="ecoSection">
                <div className="ecoSectionHeader">
                  <div className="ecoSectionTitle">
                    <Icon name="droplet" size={18} className="text-[var(--accent)]" />
                    <div>
                      <h2 className="ecoSectionTitleText">Trackers</h2>
                      <p className="ecoSectionSubtitle">Units, ranges, and presets.</p>
                    </div>
                  </div>
                  <div className="ecoSectionMeta">{visibleTrackerDefs.length} trackers</div>
                </div>
                <div className="ecoCardGrid">
                  {visibleTrackerDefs.length === 0 ? (
                    <div className="ecoEmpty">No trackers yet</div>
                  ) : (
                    visibleTrackerDefs.map((tracker) => {
                      const tags = tracker.meta.tags ?? []
                      const { visible, remaining } = splitChips(tags, 3)
                      const active = selection.kind === 'tracker' && selection.key === tracker.key
                      return (
                        <div
                          key={tracker.key}
                          className={active ? 'ecoCard active' : 'ecoCard'}
                          onClick={() => setSelection({ kind: 'tracker', key: tracker.key })}
                        >
                          <div className="ecoCardTop">
                            <div className="ecoCardTitle">{tracker.label}</div>
                            <div className="ecoCardActions">
                              <button
                                className="ecoActionBtn"
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  props.onOpenTracker?.(tracker.key)
                                }}
                              >
                                Open
                              </button>
                              <button
                                className="ecoActionBtn danger"
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeTrackerByKey(tracker.key)
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                          <div className="ecoCardMeta">
                            <div className="ecoMetaRow">
                              <span>Unit</span>
                              <span>{tracker.unit.label}</span>
                            </div>
                            <div className="ecoMetaRow">
                              <span>Range</span>
                              <span>
                                {tracker.unit.min ?? '—'} - {tracker.unit.max ?? '—'}
                              </span>
                            </div>
                            <div className="ecoMetaRow">
                              <span>Presets</span>
                              <span>{tracker.unit.presets.length ? tracker.unit.presets.join(', ') : '—'}</span>
                            </div>
                          </div>
                          <div className="ecoCardChips">
                            {visible.map((tag) => (
                              <span key={tag} className="detailChip pointer-events-none">
                                {tag}
                              </span>
                            ))}
                            {remaining > 0 ? <span className="ecoChipCount">+{remaining}</span> : null}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
                <div className="ecoAddRow">
                  <input
                    className="ecoAddInput"
                    value={trackerDraft}
                    onChange={(e) => setTrackerDraft(e.target.value)}
                    placeholder="Add tracker name..."
                  />
                  <button
                    className="ecoAddButton"
                    onClick={() => {
                      const name = trackerDraft.trim()
                      if (!name) return
                      const key = slugify(name)
                      if (!key) return
                      const existing = trackerDefs.find((t) => t.key === key)
                      if (existing) {
                        unhideValue('trackers', key)
                        setSelection({ kind: 'tracker', key })
                        setTrackerDraft('')
                        return
                      }
                      const next: TrackerDef = {
                        id: makeId('tracker'),
                        key,
                        label: name,
                        createdAt: Date.now(),
                        unit: { label: 'value', min: null, max: null, step: null, presets: [] },
                        meta: emptySharedMeta(),
                      }
                      const nextDefs = [next, ...trackerDefs]
                      updateTrackers(nextDefs)
                      unhideValue('trackers', key)
                      setTrackerDraft('')
                      setSelection({ kind: 'tracker', key })
                    }}
                  >
                    Add tracker
                  </button>
                </div>
              </section>

              <section className="ecoSection">
                <div className="ecoSectionHeader">
                  <div className="ecoSectionTitle">
                    <Icon name="tag" size={18} className="text-[var(--accent)]" />
                    <div>
                      <h2 className="ecoSectionTitleText">Taxonomy</h2>
                      <p className="ecoSectionSubtitle">Categories and subcategories.</p>
                    </div>
                  </div>
                  <div className="ecoSectionMeta">{categories.length} categories</div>
                </div>
                <div className="ecoCardGrid">
                  {categories.length === 0 ? (
                    <div className="ecoEmpty">No categories</div>
                  ) : (
                    categories.map((cat) => {
                      const subs = subcategoriesForCategory(cat)
                      const { visible, remaining } = splitChips(subs, 4)
                      const active = selection.kind === 'category' && selection.category === cat
                      return (
                        <div
                          key={cat}
                          className={active ? 'ecoCard active' : 'ecoCard'}
                          onClick={() => setSelection({ kind: 'category', category: cat })}
                        >
                          <div className="ecoCardTop">
                            <div className="ecoCardTitle">{cat}</div>
                            {isCustomCategory(cat) ? (
                              <div className="ecoCardActions">
                                <button
                                  className="ecoActionBtn danger"
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    removeCategoryEntry(cat)
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            ) : null}
                          </div>
                          <div className="ecoCardChips">
                            {visible.map((sub) => (
                              <span key={sub} className="detailChip pointer-events-none">
                                {sub}
                              </span>
                            ))}
                            {remaining > 0 ? <span className="ecoChipCount">+{remaining}</span> : null}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
                <div className="ecoAddRow">
                  <input
                    className="ecoAddInput"
                    value={categoryDraft}
                    onChange={(e) => setCategoryDraft(e.target.value)}
                    placeholder="New category..."
                  />
                  <button className="ecoAddButton" onClick={addCustomCategory}>
                    Add category
                  </button>
                </div>
              </section>

              <section className="ecoSection">
                <div className="ecoSectionHeader">
                  <div className="ecoSectionTitle">
                    <Icon name="tag" size={18} className="text-[var(--accent)]" />
                    <div>
                      <h2 className="ecoSectionTitleText">Tags</h2>
                      <p className="ecoSectionSubtitle">Labels used across tasks and events.</p>
                    </div>
                  </div>
                  <div className="ecoSectionMeta">{tagStats.length} tags</div>
                </div>
                <div className="ecoCardGrid">
                  {tagStats.length === 0 ? (
                    <div className="ecoEmpty">No tags yet</div>
                  ) : (
                    tagStats.map((row) => (
                      <div key={row.tag} className="ecoCard">
                        <div className="ecoCardTop">
                          <div className="ecoCardTitle">{row.tag}</div>
                          <div className="ecoCardActions">
                            <button
                              className="ecoActionBtn danger"
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                hideValue('tags', row.tag)
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="ecoCardMeta">
                          <div className="ecoMetaRow">
                            <span>Used</span>
                            <span>{row.count}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="ecoSection">
                <div className="ecoSectionHeader">
                  <div className="ecoSectionTitle">
                    <Icon name="users" size={18} className="text-[var(--accent)]" />
                    <div>
                      <h2 className="ecoSectionTitleText">People</h2>
                      <p className="ecoSectionSubtitle">Contacts and collaborators.</p>
                    </div>
                  </div>
                  <div className="ecoSectionMeta">{peopleStats.length} people</div>
                </div>
                <div className="ecoCardGrid">
                  {peopleStats.length === 0 ? (
                    <div className="ecoEmpty">No people yet</div>
                  ) : (
                    peopleStats.map((row) => (
                      <div key={row.name} className="ecoCard">
                        <div className="ecoCardTop">
                          <div className="ecoCardTitle">{row.name}</div>
                          <div className="ecoCardActions">
                            <button
                              className="ecoActionBtn danger"
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                hideValue('people', row.name)
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="ecoCardMeta">
                          <div className="ecoMetaRow">
                            <span>Used</span>
                            <span>{row.count}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="ecoSection">
                <div className="ecoSectionHeader">
                  <div className="ecoSectionTitle">
                    <Icon name="folder" size={18} className="text-[var(--accent)]" />
                    <div>
                      <h2 className="ecoSectionTitleText">Contexts</h2>
                      <p className="ecoSectionSubtitle">Focus lanes and environments.</p>
                    </div>
                  </div>
                  <div className="ecoSectionMeta">{contextStats.length} contexts</div>
                </div>
                <div className="ecoCardGrid">
                  {contextStats.length === 0 ? (
                    <div className="ecoEmpty">No contexts yet</div>
                  ) : (
                    contextStats.map((row) => (
                      <div key={row.name} className="ecoCard">
                        <div className="ecoCardTop">
                          <div className="ecoCardTitle">{row.name}</div>
                          <div className="ecoCardActions">
                            <button
                              className="ecoActionBtn danger"
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                hideValue('contexts', row.name)
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="ecoCardMeta">
                          <div className="ecoMetaRow">
                            <span>Used</span>
                            <span>{row.count}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="ecoSection">
                <div className="ecoSectionHeader">
                  <div className="ecoSectionTitle">
                    <Icon name="book" size={18} className="text-[var(--accent)]" />
                    <div>
                      <h2 className="ecoSectionTitleText">Skills</h2>
                      <p className="ecoSectionSubtitle">Capabilities you are building.</p>
                    </div>
                  </div>
                  <div className="ecoSectionMeta">{skillStats.length} skills</div>
                </div>
                <div className="ecoCardGrid">
                  {skillStats.length === 0 ? (
                    <div className="ecoEmpty">No skills yet</div>
                  ) : (
                    skillStats.map((row) => (
                      <div key={row.name} className="ecoCard">
                        <div className="ecoCardTop">
                          <div className="ecoCardTitle">{row.name}</div>
                          <div className="ecoCardActions">
                            <button
                              className="ecoActionBtn danger"
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                hideValue('skills', row.name)
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="ecoCardMeta">
                          <div className="ecoMetaRow">
                            <span>Used</span>
                            <span>{row.count}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="ecoSection">
                <div className="ecoSectionHeader">
                  <div className="ecoSectionTitle">
                    <Icon name="pin" size={18} className="text-[var(--accent)]" />
                    <div>
                      <h2 className="ecoSectionTitleText">Places</h2>
                      <p className="ecoSectionSubtitle">Locations tied to your work.</p>
                    </div>
                  </div>
                  <div className="ecoSectionMeta">{locationStats.length} places</div>
                </div>
                <div className="ecoCardGrid">
                  {locationStats.length === 0 ? (
                    <div className="ecoEmpty">No places yet</div>
                  ) : (
                    locationStats.map((row) => (
                      <div key={row.name} className="ecoCard">
                        <div className="ecoCardTop">
                          <div className="ecoCardTitle">{row.name}</div>
                          <div className="ecoCardActions">
                            <button
                              className="ecoActionBtn danger"
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                hideValue('locations', row.name)
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="ecoCardMeta">
                          <div className="ecoMetaRow">
                            <span>Used</span>
                            <span>{row.count}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>

          {shouldPortal ? (inspectorHost ? createPortal(inspectorCard, inspectorHost) : null) : (
            <aside className="ecoSidebar">
              {inspectorCard}
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}
