import { useEffect, useMemo, useState } from 'react'
import type { CalendarEvent } from '../../storage/calendar'
import type { Task } from '../../storage/tasks'
import { Icon } from '../../ui/icons'
import { MetaEditor } from '../../ui/MetaEditor'
import { TrackerUnitEditor } from '../../ui/TrackerUnitEditor'
import { ChipInput, parseCommaList } from '../../ui/ChipInput'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { loadMultipliers, saveMultipliers } from '../../storage/multipliers'
import { loadCustomTaxonomy, upsertCategory } from '../../taxonomy/custom'
import { categoriesFromStarter, subcategoriesFromStarter } from '../../taxonomy/starter'
import {
  emptySharedMeta,
  loadGoalDefs,
  loadProjectDefs,
  loadTrackerDefs,
  saveGoalDefs,
  saveProjectDefs,
  saveTrackerDefs,
  type GoalDef,
  type ProjectDef,
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

function shortList(items: string[], max = 2) {
  if (!items.length) return '—'
  if (items.length <= max) return items.join(', ')
  return `${items.slice(0, max).join(', ')} +${items.length - max}`
}

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function EcosystemView(props: {
  events: CalendarEvent[]
  tasks: Task[]
  trackerDefs?: TrackerDef[]
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
  const [selection, setSelection] = useState<Selection>({ kind: 'none' })

  const [goalDraft, setGoalDraft] = useState('')
  const [projectDraft, setProjectDraft] = useState('')
  const [habitDraft, setHabitDraft] = useState('')
  const [trackerDraft, setTrackerDraft] = useState('')
  const [categoryDraft, setCategoryDraft] = useState('')

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
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [goalDefs, goalNames, multipliers.goals])

  const projectRows = useMemo(() => {
    return Array.from(projectNames.entries())
      .map(([key, name]) => ({
        key,
        name,
        def: projectDefs.find((d) => normalizeKey(d.name) === key) ?? null,
        multiplier: multipliers.projects[key] ?? 1,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [projectDefs, projectNames, multipliers.projects])

  const categories = useMemo(() => {
    const starter = categoriesFromStarter()
    const custom = customTaxonomy.map((c) => c.category)
    const set = new Set([...starter, ...custom])
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [customTaxonomy])

  const tagSuggestions = useMemo(() => {
    const tags: string[] = []
    for (const e of props.events) tags.push(...(e.tags ?? []))
    for (const t of props.tasks) tags.push(...(t.tags ?? []))
    for (const h of habitDefs) tags.push(...(h.tags ?? []))
    for (const g of goalDefs) tags.push(...(g.meta.tags ?? []))
    for (const p of projectDefs) tags.push(...(p.meta.tags ?? []))
    for (const tr of trackerDefs) tags.push(...(tr.meta.tags ?? []))
    return uniqStrings(tags.map((t) => normalizeTag(String(t))).filter(Boolean)).sort()
  }, [goalDefs, habitDefs, projectDefs, props.events, props.tasks, trackerDefs])

  const contextSuggestions = useMemo(() => {
    const contexts: string[] = []
    for (const e of props.events) contexts.push(...(e.contexts ?? []))
    for (const t of props.tasks) contexts.push(...(t.contexts ?? []))
    for (const h of habitDefs) contexts.push(...(h.contexts ?? []))
    for (const g of goalDefs) contexts.push(...(g.meta.contexts ?? []))
    for (const p of projectDefs) contexts.push(...(p.meta.contexts ?? []))
    for (const tr of trackerDefs) contexts.push(...(tr.meta.contexts ?? []))
    return uniqStrings(contexts).sort()
  }, [goalDefs, habitDefs, projectDefs, props.events, props.tasks, trackerDefs])

  const peopleSuggestions = useMemo(() => {
    const people: string[] = []
    for (const e of props.events) people.push(...(e.people ?? []))
    for (const t of props.tasks) people.push(...(t.people ?? []))
    for (const h of habitDefs) people.push(...(h.people ?? []))
    for (const g of goalDefs) people.push(...(g.meta.people ?? []))
    for (const p of projectDefs) people.push(...(p.meta.people ?? []))
    for (const tr of trackerDefs) people.push(...(tr.meta.people ?? []))
    return uniqStrings(people).sort()
  }, [goalDefs, habitDefs, projectDefs, props.events, props.tasks, trackerDefs])

  const locationSuggestions = useMemo(() => {
    const locations: string[] = []
    for (const e of props.events) if (e.location) locations.push(...parseCommaList(e.location))
    for (const t of props.tasks) if (t.location) locations.push(...parseCommaList(t.location))
    for (const h of habitDefs) if (h.location) locations.push(...parseCommaList(h.location))
    for (const g of goalDefs) if (g.meta.location) locations.push(...parseCommaList(g.meta.location))
    for (const p of projectDefs) if (p.meta.location) locations.push(...parseCommaList(p.meta.location))
    for (const tr of trackerDefs) if (tr.meta.location) locations.push(...parseCommaList(tr.meta.location))
    return uniqStrings(locations).sort()
  }, [goalDefs, habitDefs, projectDefs, props.events, props.tasks, trackerDefs])

  const skillSuggestions = useMemo(() => {
    const skills: string[] = []
    for (const e of props.events) skills.push(...(e.skills ?? []))
    for (const t of props.tasks) skills.push(...(t.skills ?? []))
    for (const h of habitDefs) skills.push(...(h.skills ?? []))
    for (const g of goalDefs) skills.push(...(g.meta.skills ?? []))
    for (const p of projectDefs) skills.push(...(p.meta.skills ?? []))
    for (const tr of trackerDefs) skills.push(...(tr.meta.skills ?? []))
    return uniqStrings(skills).sort()
  }, [goalDefs, habitDefs, projectDefs, props.events, props.tasks, trackerDefs])

  const goalSuggestions = useMemo(() => Array.from(goalNames.values()).sort((a, b) => a.localeCompare(b)), [goalNames])
  const projectSuggestions = useMemo(() => Array.from(projectNames.values()).sort((a, b) => a.localeCompare(b)), [projectNames])

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

  function addCustomCategory() {
    const category = categoryDraft.trim()
    if (!category) return
    upsertCategory(category, [])
    setCustomTaxonomy(loadCustomTaxonomy())
    setCategoryDraft('')
    setSelection({ kind: 'category', category })
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
        <div className="h-full overflow-y-auto custom-scrollbar pr-2">
          <div className="space-y-10">
            <section className="space-y-4">
              <div className="flex items-center gap-3 px-2">
                <Icon name="target" size={18} className="text-[var(--accent)]" />
                <h2 className="text-xl font-bold tracking-tight">Goal Multipliers</h2>
              </div>
              <div className="glassCard">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Goal</TableHead>
                      <TableHead>Multiplier</TableHead>
                      <TableHead>Importance</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Tags</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {goalRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-xs uppercase tracking-widest text-[var(--muted)]">
                          No goals yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      goalRows.map((row) => (
                        <TableRow
                          key={row.key}
                          data-state={selection.kind === 'goal' && selection.key === row.key ? 'selected' : undefined}
                          className="cursor-pointer"
                          onClick={() => {
                            const def = ensureGoalDef(row.name)
                            if (def) setSelection({ kind: 'goal', key: normalizeKey(def.name) })
                          }}
                          onDoubleClick={() => props.onOpenGoal?.(row.name)}
                        >
                          <TableCell className="font-semibold">{row.name}</TableCell>
                          <TableCell>
                            <input
                              className="w-16 h-8 bg-[var(--panel)] border border-black/5 rounded-lg px-2 text-xs font-bold text-center outline-none"
                              type="number"
                              min={0.1}
                              max={3}
                              step={0.1}
                              value={row.multiplier}
                              onChange={(e) => updateGoalMultiplier(row.name, Number(e.target.value))}
                            />
                          </TableCell>
                          <TableCell>{row.def?.meta.importance ?? '—'}</TableCell>
                          <TableCell>{row.def?.meta.category ?? '—'}</TableCell>
                          <TableCell>{shortList(row.def?.meta.tags ?? [])}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <div className="flex gap-2 pt-4 border-t border-black/5">
                  <input
                    className="flex-1 h-11 bg-[var(--panel)] border-none rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--accent)]/10 transition-all"
                    value={goalDraft}
                    onChange={(e) => setGoalDraft(e.target.value)}
                    placeholder="Add goal name..."
                  />
                  <button
                    className="h-11 px-6 bg-[var(--accent)] text-white rounded-xl font-bold text-xs shadow-lg hover:opacity-90 transition-all"
                    onClick={() => {
                      const name = goalDraft.trim()
                      if (!name) return
                      const def = ensureGoalDef(name)
                      updateGoalMultiplier(name, 1)
                      setGoalDraft('')
                      if (def) setSelection({ kind: 'goal', key: normalizeKey(def.name) })
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-3 px-2">
                <Icon name="briefcase" size={18} className="text-[var(--accent)]" />
                <h2 className="text-xl font-bold tracking-tight">Project Multipliers</h2>
              </div>
              <div className="glassCard">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Multiplier</TableHead>
                      <TableHead>Importance</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Tags</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-xs uppercase tracking-widest text-[var(--muted)]">
                          No projects yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      projectRows.map((row) => (
                        <TableRow
                          key={row.key}
                          data-state={selection.kind === 'project' && selection.key === row.key ? 'selected' : undefined}
                          className="cursor-pointer"
                          onClick={() => {
                            const def = ensureProjectDef(row.name)
                            if (def) setSelection({ kind: 'project', key: normalizeKey(def.name) })
                          }}
                          onDoubleClick={() => props.onOpenProject?.(row.name)}
                        >
                          <TableCell className="font-semibold">{row.name}</TableCell>
                          <TableCell>
                            <input
                              className="w-16 h-8 bg-[var(--panel)] border border-black/5 rounded-lg px-2 text-xs font-bold text-center outline-none"
                              type="number"
                              min={0.1}
                              max={3}
                              step={0.1}
                              value={row.multiplier}
                              onChange={(e) => updateProjectMultiplier(row.name, Number(e.target.value))}
                            />
                          </TableCell>
                          <TableCell>{row.def?.meta.importance ?? '—'}</TableCell>
                          <TableCell>{row.def?.meta.category ?? '—'}</TableCell>
                          <TableCell>{shortList(row.def?.meta.tags ?? [])}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <div className="flex gap-2 pt-4 border-t border-black/5">
                  <input
                    className="flex-1 h-11 bg-[var(--panel)] border-none rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--accent)]/10 transition-all"
                    value={projectDraft}
                    onChange={(e) => setProjectDraft(e.target.value)}
                    placeholder="Add project name..."
                  />
                  <button
                    className="h-11 px-6 bg-[var(--accent)] text-white rounded-xl font-bold text-xs shadow-lg hover:opacity-90 transition-all"
                    onClick={() => {
                      const name = projectDraft.trim()
                      if (!name) return
                      const def = ensureProjectDef(name)
                      updateProjectMultiplier(name, 1)
                      setProjectDraft('')
                      if (def) setSelection({ kind: 'project', key: normalizeKey(def.name) })
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-3 px-2">
                <Icon name="tag" size={18} className="text-[var(--accent)]" />
                <h2 className="text-xl font-bold tracking-tight">Taxonomy</h2>
              </div>
              <div className="glassCard">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Subcategories</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-xs uppercase tracking-widest text-[var(--muted)]">
                          No categories
                        </TableCell>
                      </TableRow>
                    ) : (
                      categories.map((cat) => {
                        const subs = subcategoriesForCategory(cat)
                        const visible = subs.slice(0, 5)
                        const remaining = subs.length - visible.length
                        return (
                          <TableRow
                            key={cat}
                            data-state={selection.kind === 'category' && selection.category === cat ? 'selected' : undefined}
                            className="cursor-pointer"
                            onClick={() => setSelection({ kind: 'category', category: cat })}
                          >
                            <TableCell className="font-semibold">{cat}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-2">
                                {visible.map((sub) => (
                                  <span key={sub} className="detailChip pointer-events-none">
                                    {sub}
                                  </span>
                                ))}
                                {remaining > 0 ? (
                                  <span className="text-[10px] font-semibold text-[var(--muted)]">+{remaining}</span>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
                <div className="flex gap-2 pt-4 border-t border-black/5">
                  <input
                    className="flex-1 h-11 bg-[var(--panel)] border-none rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--accent)]/10 transition-all"
                    value={categoryDraft}
                    onChange={(e) => setCategoryDraft(e.target.value)}
                    placeholder="New category..."
                  />
                  <button
                    className="h-11 px-6 bg-[var(--accent)] text-white rounded-xl font-bold text-xs shadow-lg hover:opacity-90 transition-all"
                    onClick={addCustomCategory}
                  >
                    Add
                  </button>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-3 px-2">
                <Icon name="smile" size={18} className="text-[var(--accent)]" />
                <h2 className="text-xl font-bold tracking-tight">Habits</h2>
              </div>
              <div className="glassCard">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Habit</TableHead>
                      <TableHead>Importance</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Tags</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {habitDefs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-xs uppercase tracking-widest text-[var(--muted)]">
                          No habits yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      habitDefs.map((habit) => (
                        <TableRow
                          key={habit.id}
                          data-state={selection.kind === 'habit' && selection.id === habit.id ? 'selected' : undefined}
                          className="cursor-pointer"
                          onClick={() => setSelection({ kind: 'habit', id: habit.id })}
                        >
                          <TableCell className="font-semibold">{habit.name}</TableCell>
                          <TableCell>{habit.importance ?? '—'}</TableCell>
                          <TableCell>{habit.difficulty ?? '—'}</TableCell>
                          <TableCell>{habit.category ?? '—'}</TableCell>
                          <TableCell>{shortList(habit.tags ?? [])}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <div className="flex gap-2 pt-4 border-t border-black/5">
                  <input
                    className="flex-1 h-11 bg-[var(--panel)] border-none rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--accent)]/10 transition-all"
                    value={habitDraft}
                    onChange={(e) => setHabitDraft(e.target.value)}
                    placeholder="Add habit name..."
                  />
                  <button
                    className="h-11 px-6 bg-[var(--accent)] text-white rounded-xl font-bold text-xs shadow-lg hover:opacity-90 transition-all"
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
                      setHabitDraft('')
                      setSelection({ kind: 'habit', id: next.id })
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-3 px-2">
                <Icon name="droplet" size={18} className="text-[var(--accent)]" />
                <h2 className="text-xl font-bold tracking-tight">Trackers</h2>
              </div>
              <div className="glassCard">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tracker</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Range</TableHead>
                      <TableHead>Presets</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trackerDefs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-xs uppercase tracking-widest text-[var(--muted)]">
                          No trackers yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      trackerDefs.map((tracker) => (
                        <TableRow
                          key={tracker.key}
                          data-state={selection.kind === 'tracker' && selection.key === tracker.key ? 'selected' : undefined}
                          className="cursor-pointer"
                          onClick={() => setSelection({ kind: 'tracker', key: tracker.key })}
                          onDoubleClick={() => props.onOpenTracker?.(tracker.key)}
                        >
                          <TableCell className="font-semibold">{tracker.label}</TableCell>
                          <TableCell>{tracker.unit.label}</TableCell>
                          <TableCell>
                            {tracker.unit.min ?? '—'} to {tracker.unit.max ?? '—'}
                          </TableCell>
                          <TableCell className="text-xs text-[var(--muted)]">{shortList(tracker.unit.presets.map(String))}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <div className="flex gap-2 pt-4 border-t border-black/5">
                  <input
                    className="flex-1 h-11 bg-[var(--panel)] border-none rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--accent)]/10 transition-all"
                    value={trackerDraft}
                    onChange={(e) => setTrackerDraft(e.target.value)}
                    placeholder="Add tracker name..."
                  />
                  <button
                    className="h-11 px-6 bg-[var(--accent)] text-white rounded-xl font-bold text-xs shadow-lg hover:opacity-90 transition-all"
                    onClick={() => {
                      const name = trackerDraft.trim()
                      if (!name) return
                      const key = slugify(name)
                      if (!key) return
                      const existing = trackerDefs.find((t) => t.key === key)
                      if (existing) {
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
                      setTrackerDraft('')
                      setSelection({ kind: 'tracker', key })
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            </section>
          </div>

          <section className="glassCard p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold">Details</h3>
              <p className="text-xs text-[var(--muted)]">Edit shared properties and advanced defaults.</p>
            </div>

            {selection.kind === 'none' ? (
              <div className="flex flex-col items-center justify-center text-center opacity-30 space-y-3">
                <Icon name="sparkle" size={32} />
                <p className="text-xs font-bold uppercase tracking-widest">Select a row to edit</p>
              </div>
            ) : null}

            {selection.kind === 'goal' && selectedGoal ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Goal</div>
                  <div className="text-lg font-bold">{selectedGoal.name}</div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[var(--muted)]">Multiplier</span>
                    <input
                      className="w-20 h-9 bg-[var(--panel)] border border-black/5 rounded-lg px-2 text-xs font-bold text-center"
                      type="number"
                      min={0.1}
                      max={3}
                      step={0.1}
                      value={multipliers.goals[selection.key] ?? 1}
                      onChange={(e) => updateGoalMultiplier(selectedGoal.name, Number(e.target.value))}
                    />
                    <button
                      className="ml-auto text-xs font-bold text-[var(--accent)]"
                      onClick={() => props.onOpenGoal?.(selectedGoal.name)}
                      type="button"
                    >
                      Open goal
                    </button>
                  </div>
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
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Project</div>
                  <div className="text-lg font-bold">{selectedProject.name}</div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[var(--muted)]">Multiplier</span>
                    <input
                      className="w-20 h-9 bg-[var(--panel)] border border-black/5 rounded-lg px-2 text-xs font-bold text-center"
                      type="number"
                      min={0.1}
                      max={3}
                      step={0.1}
                      value={multipliers.projects[selection.key] ?? 1}
                      onChange={(e) => updateProjectMultiplier(selectedProject.name, Number(e.target.value))}
                    />
                    <button
                      className="ml-auto text-xs font-bold text-[var(--accent)]"
                      onClick={() => props.onOpenProject?.(selectedProject.name)}
                      type="button"
                    >
                      Open project
                    </button>
                  </div>
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
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Habit</div>
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
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Tracker</div>
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
                  <div className="detailGrid">
                    <label>
                      Key
                      <input className="detailSmall" value={selectedTracker.key} readOnly />
                    </label>
                    <label>
                      Default
                      <input
                        className="detailSmall"
                        value={selectedTracker.defaultValue ?? ''}
                        onChange={(e) => {
                          const value = Number(e.target.value)
                          const next = trackerDefs.map((t) =>
                            t.key === selectedTracker.key ? { ...t, defaultValue: Number.isFinite(value) ? value : null } : t
                          )
                          updateTrackers(next)
                        }}
                      />
                    </label>
                  </div>
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
                <button
                  className="text-xs font-bold text-[var(--accent)]"
                  onClick={() => props.onOpenTracker?.(selectedTracker.key)}
                  type="button"
                >
                  Open tracker page
                </button>
              </div>
            ) : null}

            {selection.kind === 'category' && selectedCategory ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Category</div>
                  <div className="text-lg font-bold">{selectedCategory}</div>
                </div>
                <ChipInput
                  label="Subcategories"
                  value={subcategoriesForCategory(selectedCategory)}
                  parse={parseCommaList}
                  onChange={(subs) => updateCategorySubcategories(selectedCategory, subs)}
                  placeholder="Breakfast, Lunch"
                />
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  )
}
