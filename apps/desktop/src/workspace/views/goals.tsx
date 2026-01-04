import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { CalendarEvent } from '../../storage/calendar'
import type { Task } from '../../storage/tasks'
import { pointsForEvent, pointsForTask } from '../../scoring/points'
import { callOpenAiText } from '../../openai'
import { Icon } from '../../ui/icons'
import { HabitHeatmap, parseHabitTrackerKey } from '../../ui/habit-heatmap'
import { createEvent, deleteEvent, findActiveByTrackerKey, upsertEvent } from '../../storage/calendar'
import { createTask } from '../../storage/tasks'
import { loadSettings } from '../../assistant/storage'

function minutesBetween(a: number, b: number) {
  return Math.max(0, Math.round((b - a) / (60 * 1000)))
}

function pointsForEventSafe(e: CalendarEvent) {
  if (e.kind === 'log') return 0
  return pointsForEvent(e)
}

type GoalHabit = {
  key: string
  label: string
}

type HabitDef = {
  id: string
  name: string
  category?: string | null
  subcategory?: string | null
  difficulty?: number | null
  importance?: number | null
  character?: Array<'STR' | 'INT' | 'CON' | 'PER'>
  skills?: string[]
  tags?: string[]
  estimateMinutes?: number | null
}

type GoalDef = {
  id: string
  name: string
  createdAt: number
}

function startOfDayMs(ms: number) {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function normalizeKey(raw: string) {
  return raw.trim().toLowerCase()
}

function normalizeHabitKey(raw: string) {
  return normalizeKey(raw).replace(/\s+/g, '-')
}

function titleFromKey(raw: string) {
  const cleaned = raw.replace(/[-_]+/g, ' ').trim()
  return cleaned.replace(/\b\w/g, (m) => m.toUpperCase())
}

function formatShortDay(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

const FALLBACK_HABITS: GoalHabit[] = [
  { key: 'cardio', label: 'Cardio' },
  { key: 'lift', label: 'Lift' },
  { key: 'keto', label: 'Keto' },
  { key: 'workout', label: 'Workout' },
  { key: 'nutrition', label: 'Nutrition' },
  { key: 'weigh-in', label: 'Weigh-in' },
]

const DAY_MS = 24 * 60 * 60 * 1000

function inferHabitKeyFromText(text: string) {
  const t = text.toLowerCase()
  if (/(cardio|elliptical|run|running|zone 2)/.test(t)) return 'cardio'
  if (/(lift|lifting|weights|strength)/.test(t)) return 'lift'
  if (/\bketo\b/.test(t)) return 'keto'
  if (/(weigh-in|weigh in|weigh|scale|weight)/.test(t)) return 'weigh-in'
  if (/(nutrition|meal|food|calorie|diet|protein)/.test(t)) return 'nutrition'
  if (/(workout|gym|training)/.test(t)) return 'workout'
  return null
}

function loadHabitDefs(): HabitDef[] {
  try {
    const raw = localStorage.getItem('insight5.habits.defs.v1')
    if (!raw) return []
    const parsed = JSON.parse(raw) as HabitDef[]
    return Array.isArray(parsed) ? parsed.filter((h) => h && typeof h.id === 'string' && typeof h.name === 'string') : []
  } catch {
    return []
  }
}

function makeGoalId() {
  return `goal_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function loadGoalDefs(): GoalDef[] {
  try {
    const raw = localStorage.getItem('insight5.goals.defs.v1')
    if (!raw) return []
    const parsed = JSON.parse(raw) as GoalDef[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((g) => g && typeof g.id === 'string' && typeof g.name === 'string' && typeof g.createdAt === 'number')
  } catch {
    return []
  }
}

function saveGoalDefs(defs: GoalDef[]) {
  try {
    localStorage.setItem('insight5.goals.defs.v1', JSON.stringify(defs))
  } catch {
    // ignore
  }
}

function parsePlanDate(raw: string): number | null {
  const match = raw.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(year, month, day)
  if (Number.isNaN(date.getTime())) return null
  return date.getTime()
}

function formatPlanDate(ms: number) {
  const d = new Date(ms)
  const year = d.getFullYear()
  const month = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseLooseDate(raw: string): number | null {
  const direct = parsePlanDate(raw)
  if (direct != null) return direct
  const parsed = Date.parse(raw)
  if (Number.isNaN(parsed)) return null
  const d = new Date(parsed)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function stripPlanCodeFences(raw: string) {
  return raw.replace(/```(?:[a-z0-9]+)?/gi, '').trim()
}

function extractInlineTags(raw: string): string[] {
  const tags: string[] = []
  for (const match of raw.matchAll(/#([a-z0-9-_]+)/gi)) {
    tags.push(`#${match[1]!.toLowerCase()}`)
  }
  return tags
}

function toPlanTag(raw: string): string | null {
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug ? `#${slug}` : null
}

function stripInlineTags(raw: string) {
  return raw.replace(/#([a-z0-9-_]+)/gi, '').trim()
}

function parsePlanLine(raw: string) {
  const line = raw.trim().replace(/^[-*+]\s+/, '')
  const rangeMatch = line.match(/^(\d{4}[-/]\d{2}[-/]\d{2})\s*-\s*(\d{4}[-/]\d{2}[-/]\d{2})\s*:?\s*(.*)$/)
  if (rangeMatch) {
    const startAt = parsePlanDate(rangeMatch[1]!)
    const endAtRaw = parsePlanDate(rangeMatch[2]!)
    const endAt = endAtRaw != null ? endAtRaw + DAY_MS : null
    const title = stripInlineTags(rangeMatch[3] || '') || stripInlineTags(line)
    return { title, startAt, endAt }
  }
  const dateMatch = line.match(/^(\d{4}[-/]\d{2}[-/]\d{2})\s*:?\s*(.*)$/)
  if (dateMatch) {
    const startAt = parsePlanDate(dateMatch[1]!)
    const endAt = startAt != null ? startAt + DAY_MS : null
    const title = stripInlineTags(dateMatch[2] || '') || stripInlineTags(line)
    return { title, startAt, endAt }
  }
  return { title: stripInlineTags(line), startAt: null, endAt: null }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function GoalsView(props: {
  events: CalendarEvent[]
  tasks: Task[]
  onSelectEvent: (id: string) => void
  onSelectTask: (id: string) => void
  onCreatedTask?: (task: Task) => void
  onCreatedEvent?: (ev: CalendarEvent) => void
  onUpdateEvent?: (id: string, patch: Partial<CalendarEvent>) => void
  onDeleteEvent?: (id: string) => void | Promise<void>
  onOpenGoal?: (name: string) => void
  goalName?: string | null
  mode?: 'list' | 'detail'
}) {
  const mode = props.mode ?? 'list'
  const [q, setQ] = useState('')
  const [activeGoal, setActiveGoal] = useState<string | null>(props.goalName ?? null)
  const [menuOpen, setMenuOpen] = useState<null | { day: number; key: string }>(null)
  const [goalDefs, setGoalDefs] = useState<GoalDef[]>(() => loadGoalDefs())
  const [newGoalDraft, setNewGoalDraft] = useState('')
  const maxGoals = 5

  useEffect(() => {
    if (mode !== 'detail') return
    setActiveGoal(props.goalName ?? null)
  }, [mode, props.goalName])

  useEffect(() => {
    saveGoalDefs(goalDefs)
  }, [goalDefs])

  useEffect(() => {
    if (!menuOpen) return
    const handler = () => setMenuOpen(null)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [menuOpen])

  function addGoal(name: string) {
    const next = name.trim()
    if (!next) return
    if (goals.length >= maxGoals) return
    const key = normalizeKey(next)
    const existing = goals.find((g) => normalizeKey(g.goal) === key)
    if (existing) {
      setActiveGoal(existing.goal)
      props.onOpenGoal?.(existing.goal)
      setNewGoalDraft('')
      return
    }
    const def: GoalDef = { id: makeGoalId(), name: next, createdAt: Date.now() }
    setGoalDefs((prev) => [def, ...prev.filter((g) => normalizeKey(g.name) !== key)])
    setActiveGoal(next)
    props.onOpenGoal?.(next)
    setNewGoalDraft('')
  }

  const goals = useMemo(() => {
    const by = new Map<string, { goal: string; points: number; minutes: number; lastAt: number; projects: Set<string> }>()
    for (const e of props.events) {
      if (e.kind === 'log') continue
      const g = (e.goal ?? '').trim()
      if (!g) continue
      const key = g.toLowerCase()
      const row = by.get(key) ?? { goal: g, points: 0, minutes: 0, lastAt: 0, projects: new Set<string>() }
      row.minutes += minutesBetween(e.startAt, e.endAt)
      row.points += pointsForEventSafe(e)
      row.lastAt = Math.max(row.lastAt, e.startAt)
      if (e.project) row.projects.add(e.project)
      by.set(key, row)
    }
    for (const t of props.tasks) {
      const g = (t.goal ?? '').trim()
      if (!g) continue
      const key = g.toLowerCase()
      const row = by.get(key) ?? { goal: g, points: 0, minutes: 0, lastAt: 0, projects: new Set<string>() }
      row.minutes += Math.max(0, t.estimateMinutes ?? 0)
      row.points += pointsForTask(t)
      row.lastAt = Math.max(row.lastAt, t.updatedAt)
      if (t.project) row.projects.add(t.project)
      by.set(key, row)
    }
    for (const def of goalDefs) {
      const key = normalizeKey(def.name)
      if (by.has(key)) continue
      by.set(key, { goal: def.name, points: 0, minutes: 0, lastAt: def.createdAt, projects: new Set<string>() })
    }
    const list = Array.from(by.values()).sort(
      (a, b) => b.points - a.points || b.minutes - a.minutes || b.lastAt - a.lastAt || a.goal.localeCompare(b.goal),
    )
    const needle = q.trim().toLowerCase()
    return needle ? list.filter((g) => g.goal.toLowerCase().includes(needle)) : list
  }, [props.events, props.tasks, q, goalDefs])

  const goalLimitReached = goals.length >= maxGoals
  const goalChips = useMemo(() => {
    const list = goals.map((g) => g.goal)
    if (list.length <= maxGoals) return list
    const base = list.slice(0, maxGoals)
    if (activeGoal && !base.includes(activeGoal)) {
      return [...base.slice(0, maxGoals - 1), activeGoal]
    }
    return base
  }, [activeGoal, goals])

  const habitDefs = useMemo(() => loadHabitDefs(), [])
  const habitNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const h of habitDefs) map.set(h.id, h.name)
    for (const fallback of FALLBACK_HABITS) {
      if (!map.has(fallback.key)) map.set(fallback.key, fallback.label)
    }
    return map
  }, [habitDefs])
  const habitDefByKey = useMemo(() => {
    const map = new Map<string, HabitDef>()
    for (const h of habitDefs) map.set(normalizeHabitKey(h.name), h)
    for (const fallback of FALLBACK_HABITS) {
      const key = normalizeHabitKey(fallback.label)
      if (!map.has(key)) map.set(key, { id: fallback.key, name: fallback.label })
    }
    return map
  }, [habitDefs])

  const activeKey = normalizeKey(activeGoal ?? '')
  const dayMs = DAY_MS
  const [weekOffset, setWeekOffset] = useState(0)
  const heatmapStart = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - 364)
    return d
  }, [])

  const goalEvents = useMemo(() => {
    if (!activeGoal) return [] as CalendarEvent[]
    return props.events
      .filter((e) => normalizeKey(e.goal ?? '') === activeKey)
      .sort((a, b) => a.startAt - b.startAt)
  }, [activeGoal, activeKey, props.events])

  const goalTasks = useMemo(() => {
    if (!activeGoal) return [] as Task[]
    return props.tasks
      .filter((t) => normalizeKey(t.goal ?? '') === activeKey)
      .sort((a, b) => a.updatedAt - b.updatedAt)
  }, [activeGoal, activeKey, props.tasks])

  function goalEventPoints(e: CalendarEvent) {
    if (e.kind === 'log') return 1
    const points = pointsForEvent(e)
    if (points > 0) return points
    const mins = minutesBetween(e.startAt, e.endAt)
    return mins > 0 ? mins / 30 : 0
  }

  function goalTaskPoints(t: Task) {
    const points = pointsForTask(t)
    if (points > 0) return points
    const mins = Math.max(0, t.estimateMinutes ?? 0)
    return mins > 0 ? mins / 30 : 0
  }

  function habitFromEvent(e: CalendarEvent): GoalHabit | null {
    const trackerKey = (e.trackerKey ?? '').trim()
    if (trackerKey) {
      const parsed = parseHabitTrackerKey(trackerKey)
      if (parsed) {
        const name = habitNameById.get(parsed.id)
        if (name) return { key: normalizeHabitKey(name), label: name }
      }
      const key = normalizeHabitKey(trackerKey)
      return { key, label: titleFromKey(key) }
    }
    const tags = (e.tags ?? []).map((t) => t.replace(/^#/, '').trim()).filter(Boolean)
    for (const tag of tags) {
      const key = inferHabitKeyFromText(tag)
      if (key) return { key, label: titleFromKey(key) }
    }
    const titleKey = inferHabitKeyFromText(e.title ?? '')
    if (titleKey) return { key: titleKey, label: titleFromKey(titleKey) }
    return null
  }

  const habitColumns = useMemo(() => {
    const list: GoalHabit[] = []
    const seen = new Set<string>()
    const pushHabit = (habit: GoalHabit) => {
      if (seen.has(habit.key)) return
      seen.add(habit.key)
      list.push(habit)
    }
    for (const def of habitDefs) {
      const key = normalizeHabitKey(def.name)
      pushHabit({ key, label: def.name })
    }
    for (const fallback of FALLBACK_HABITS) {
      const key = normalizeHabitKey(fallback.label)
      pushHabit({ key, label: fallback.label })
    }
    for (const e of goalEvents) {
      const habit = habitFromEvent(e)
      if (habit) pushHabit(habit)
    }
    return list.length ? list : FALLBACK_HABITS
  }, [goalEvents, habitDefs, habitNameById])

  const checklistWeekStart = useMemo(() => {
    const today = startOfDayMs(Date.now())
    const dow = (new Date(today).getDay() + 6) % 7
    return today - dow * dayMs + weekOffset * 7 * dayMs
  }, [dayMs, weekOffset])

  const checklistDays = useMemo(
    () => Array.from({ length: 7 }).map((_, idx) => checklistWeekStart + idx * dayMs),
    [checklistWeekStart, dayMs],
  )
  const checklistRangeLabel = useMemo(() => {
    if (checklistDays.length === 0) return 'This week'
    const start = new Date(checklistDays[0]!)
    const end = new Date(checklistDays[checklistDays.length - 1]!)
    return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })}`
  }, [checklistDays])

  const habitEventsByDay = useMemo(() => {
    const byDay = new Map<number, Map<string, CalendarEvent>>()
    for (const e of goalEvents) {
      const habit = habitFromEvent(e)
      if (!habit) continue
      const day = startOfDayMs(e.startAt)
      const map = byDay.get(day) ?? new Map<string, CalendarEvent>()
      const existing = map.get(habit.key)
      if (!existing || e.startAt > existing.startAt) map.set(habit.key, e)
      byDay.set(day, map)
    }
    return byDay
  }, [goalEvents, habitColumns])

  const adherence = useMemo(() => {
    const total = habitColumns.length * checklistDays.length
    if (!total) return { percent: 0, done: 0, total: 0 }
    let done = 0
    for (const day of checklistDays) {
      const map = habitEventsByDay.get(day)
      if (!map) continue
      for (const habit of habitColumns) {
        if (map.has(habit.key)) done += 1
      }
    }
    return { percent: Math.round((done / total) * 100), done, total }
  }, [checklistDays, habitColumns, habitEventsByDay])

  async function logGoalHabit(day: number, habit: GoalHabit, mode: 'log' | 'start' | 'end') {
    if (!activeGoal) return
    const def = habitDefByKey.get(habit.key) ?? { id: habit.key, name: habit.label }
    const trackerId = def.id || habit.key
    const trackerKey = `habit:${trackerId}`
    const now = Date.now()
    const dayStart = startOfDayMs(day)
    const startAt = dayStart === startOfDayMs(now) ? now : dayStart + 9 * 60 * 60 * 1000
    const minutes = Math.max(5, def.estimateMinutes ?? 30)
    const title = def.name ? `habit: ${def.name}` : habit.label
    const tags = Array.from(new Set(['#habit', ...(def.tags ?? []), `#${habit.key}`]))

    if (mode === 'end') {
      const active = await findActiveByTrackerKey(trackerKey)
      if (!active) return
      const endAt = Math.max(now, active.startAt + 5 * 60 * 1000)
      if (props.onUpdateEvent) {
        props.onUpdateEvent(active.id, { endAt, active: false })
      } else {
        await upsertEvent({ ...active, endAt, active: false })
      }
      props.onSelectEvent(active.id)
      return
    }

    if (mode === 'start') {
      const active = await findActiveByTrackerKey(trackerKey)
      if (active) {
        props.onSelectEvent(active.id)
        return
      }
      const ev = await createEvent({
        title,
        startAt: now,
        endAt: now + minutes * 60 * 1000,
        active: true,
        kind: 'event',
        trackerKey,
        tags,
        goal: activeGoal,
        category: def.category ?? null,
        subcategory: def.subcategory ?? null,
        difficulty: def.difficulty ?? 5,
        importance: def.importance ?? 5,
        character: def.character ?? [],
        skills: def.skills ?? [],
      })
      props.onCreatedEvent?.(ev)
      props.onSelectEvent(ev.id)
      return
    }

    const ev = await createEvent({
      title,
      startAt,
      endAt: startAt + minutes * 60 * 1000,
      kind: 'log',
      trackerKey,
      tags,
      goal: activeGoal,
      category: def.category ?? null,
      subcategory: def.subcategory ?? null,
      difficulty: def.difficulty ?? 5,
      importance: def.importance ?? 5,
      character: def.character ?? [],
      skills: def.skills ?? [],
    })
    props.onCreatedEvent?.(ev)
    props.onSelectEvent(ev.id)
  }

  async function clearGoalHabit(hit: CalendarEvent) {
    const trackerKey = (hit.trackerKey ?? '').trim()
    const canDelete = hit.kind === 'log' || trackerKey.startsWith('habit:')
    if (!canDelete) {
      props.onSelectEvent(hit.id)
      return
    }
    if (props.onDeleteEvent) {
      await props.onDeleteEvent(hit.id)
      return
    }
    await deleteEvent(hit.id)
  }

  const goalHeatmapValues = useMemo(() => {
    const values = Array.from({ length: 365 }).map(() => 0)
    const start = startOfDayMs(heatmapStart.getTime())
    for (const e of goalEvents) {
      const idx = Math.floor((startOfDayMs(e.startAt) - start) / dayMs)
      if (idx < 0 || idx >= values.length) continue
      values[idx] += goalEventPoints(e)
    }
    for (const t of goalTasks) {
      const ref = t.completedAt ?? t.updatedAt ?? t.createdAt
      const idx = Math.floor((startOfDayMs(ref) - start) / dayMs)
      if (idx < 0 || idx >= values.length) continue
      values[idx] += goalTaskPoints(t)
    }
    return values
  }, [goalEvents, goalTasks, heatmapStart, dayMs])

  const goalHeatmapMax = useMemo(
    () => Math.max(1, ...goalHeatmapValues.map((v) => Math.abs(v))),
    [goalHeatmapValues],
  )

  const goalStats = useMemo(() => {
    let minutes = 0
    let points = 0
    for (const e of goalEvents) {
      minutes += minutesBetween(e.startAt, e.endAt)
      points += goalEventPoints(e)
    }
    for (const t of goalTasks) {
      points += goalTaskPoints(t)
    }
    return { minutes, points }
  }, [goalEvents, goalTasks])

  const weekSummary = useMemo(() => {
    const start = checklistWeekStart
    const prevStart = start - 7 * dayMs
    const end = start + 7 * dayMs
    function sumPoints(from: number, to: number) {
      let total = 0
      for (const e of goalEvents) {
        if (e.startAt < from || e.startAt >= to) continue
        total += goalEventPoints(e)
      }
      for (const t of goalTasks) {
        const ref = t.completedAt ?? t.updatedAt ?? t.createdAt
        if (ref < from || ref >= to) continue
        total += goalTaskPoints(t)
      }
      return total
    }
    const current = sumPoints(start, end)
    const previous = sumPoints(prevStart, start)
    const delta = current - previous
    return { current, previous, delta }
  }, [checklistWeekStart, dayMs, goalEvents, goalTasks])

  const activityItems = useMemo(() => {
    const eventItems = goalEvents.map((e) => ({
      type: 'event' as const,
      id: e.id,
      title: e.title || 'Event',
      at: e.startAt,
      notes: e.notes ?? '',
    }))
    const taskItems = goalTasks.map((t) => ({
      type: 'task' as const,
      id: t.id,
      title: t.title,
      at: t.completedAt ?? t.updatedAt ?? t.createdAt,
      notes: t.notes ?? '',
      done: t.status === 'done',
    }))
    return [...eventItems, ...taskItems].sort((a, b) => b.at - a.at).slice(0, 60)
  }, [goalEvents, goalTasks])

  const associatedProjects = useMemo(() => {
    const set = new Set<string>()
    for (const e of goalEvents) {
      if (e.project) set.add(e.project)
    }
    for (const t of goalTasks) {
      if (t.project) set.add(t.project)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [goalEvents, goalTasks])

  const [planDraft, setPlanDraft] = useState('')
  const [planAssistOpen, setPlanAssistOpen] = useState(false)
  const [planAssistGoal, setPlanAssistGoal] = useState('')
  const [planAssistTarget, setPlanAssistTarget] = useState('')
  const [planAssistPrompt, setPlanAssistPrompt] = useState('')
  const [planAssistHabits, setPlanAssistHabits] = useState('')
  const [planAssistOutput, setPlanAssistOutput] = useState('')
  const [planAssistStatus, setPlanAssistStatus] = useState('')
  const [planAssistError, setPlanAssistError] = useState('')
  const [planPreviewMaximized, setPlanPreviewMaximized] = useState(false)
  const [planPreviewDensity, setPlanPreviewDensity] = useState(0)
  const planItems = useMemo(() => {
    if (!planDraft.trim()) return [] as Array<{
      id: string
      level: number
      title: string
      startAt: number | null
      endAt: number | null
      tags: string[]
      parents: string[]
    }>
    const items: Array<{
      id: string
      level: number
      title: string
      startAt: number | null
      endAt: number | null
      tags: string[]
      parents: string[]
    }> = []
    const stack: Array<{ level: number; title: string }> = []
    let index = 0
    for (const line of planDraft.split(/\r?\n/)) {
      if (!line.trim()) continue
      const rawIndent = (line.match(/^\s*/) ?? [''])[0] ?? ''
      const indent = rawIndent.replace(/\t/g, '  ').length
      const level = Math.min(6, Math.floor(indent / 2))
      const stripped = line.trim().replace(/^[-*+]\s+/, '')
      const parsed = parsePlanLine(stripped)
      if (!parsed.title) continue
      while (stack.length && stack[stack.length - 1]!.level >= level) {
        stack.pop()
      }
      const parents = stack.map((item) => item.title)
      const tagSet = new Set<string>()
      for (const tag of extractInlineTags(stripped)) tagSet.add(tag)
      for (const parent of parents) {
        const t = toPlanTag(parent)
        if (t) tagSet.add(t)
      }
      if (activeGoal) {
        const t = toPlanTag(activeGoal)
        if (t) tagSet.add(t)
      }
      tagSet.add('#plan')
      items.push({
        id: `plan_${index++}`,
        level,
        title: parsed.title,
        startAt: parsed.startAt,
        endAt: parsed.endAt,
        tags: Array.from(tagSet),
        parents,
      })
      stack.push({ level, title: parsed.title })
    }
    return items
  }, [activeGoal, planDraft])

  const planOutline = useMemo(() => {
    const parents = new Set<string>()
    const stack: Array<{ level: number; id: string }> = []
    for (const item of planItems) {
      while (stack.length && stack[stack.length - 1]!.level >= item.level) {
        stack.pop()
      }
      const parent = stack[stack.length - 1]
      if (parent) parents.add(parent.id)
      stack.push({ level: item.level, id: item.id })
    }
    return planItems.map((item) => ({
      ...item,
      hasChildren: parents.has(item.id),
      project: item.parents[item.parents.length - 1] ?? null,
    }))
  }, [planItems])

  const planTimeline = useMemo(() => {
    const items = planItems.filter((item) => item.startAt != null && item.endAt != null)
    if (items.length === 0) return { items: [], startAt: 0, endAt: 0 }
    const startAt = Math.min(...items.map((item) => item.startAt as number))
    const endAt = Math.max(...items.map((item) => item.endAt as number))
    return { items, startAt, endAt }
  }, [planItems])

  const planPreviewRange = useMemo(() => {
    const starts: number[] = []
    const ends: number[] = []
    if (planTimeline.items.length) {
      starts.push(planTimeline.startAt)
      ends.push(planTimeline.endAt)
    }
    for (const ev of goalEvents) {
      if (!Number.isFinite(ev.startAt) || !Number.isFinite(ev.endAt)) continue
      starts.push(ev.startAt)
      ends.push(ev.endAt)
    }
    if (!starts.length || !ends.length) {
      return { rangeMs: DAY_MS, grid: 4, startAt: 0, endAt: 0, startLabel: '', endLabel: '' }
    }
    const startAt = Math.min(...starts)
    const endAt = Math.max(...ends)
    const rangeMs = Math.max(DAY_MS, endAt - startAt)
    const days = Math.max(1, Math.round(rangeMs / DAY_MS))
    let grid = 6
    if (days <= 14) grid = days
    else if (days <= 60) grid = Math.round(days / 7)
    else if (days <= 180) grid = Math.round(days / 14)
    else grid = Math.round(days / 30)
    grid = clamp(grid, 4, 18)
    const startLabel = new Date(startAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    const endLabel = new Date(Math.max(startAt, endAt - DAY_MS)).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    return { rangeMs, grid, startAt, endAt, startLabel, endLabel }
  }, [goalEvents, planTimeline])

  const planPreviewScale = useMemo(() => {
    if (!planPreviewRange.startAt || !planPreviewRange.endAt || planPreviewRange.rangeMs <= 0) return []
    const days = Math.max(1, Math.round(planPreviewRange.rangeMs / DAY_MS))
    const showDay = days <= 120
    const showYear = days > 320
    const stepMs = planPreviewRange.rangeMs / planPreviewRange.grid
    return Array.from({ length: planPreviewRange.grid }).map((_, idx) => {
      const at = planPreviewRange.startAt + stepMs * idx
      const label = new Date(at).toLocaleDateString(undefined, {
        month: 'short',
        ...(showDay ? { day: 'numeric' } : {}),
        ...(showYear ? { year: '2-digit' } : {}),
      })
      return { id: `scale_${idx}`, label }
    })
  }, [planPreviewRange])

  type PlanPreviewRow = {
    id: string
    title: string
    level: number
    startAt: number | null
    endAt: number | null
    kind: 'plan' | 'event'
    meta?: string
  }

  const planPreviewRows = useMemo(() => {
    const rows: PlanPreviewRow[] = planOutline.map((item) => ({
      id: item.id,
      title: item.title,
      level: item.level,
      startAt: item.startAt,
      endAt: item.endAt,
      kind: 'plan',
    }))
    const eventRows = [...goalEvents]
      .filter((e) => Number.isFinite(e.startAt) && Number.isFinite(e.endAt))
      .sort((a, b) => a.startAt - b.startAt)
      .map(
        (e): PlanPreviewRow => ({
          id: `event_${e.id}`,
          title: e.title || 'Event',
          level: 0,
          startAt: e.startAt,
          endAt: e.endAt,
          kind: 'event',
          meta: e.kind === 'log' ? 'log' : 'event',
        }),
      )
    if (eventRows.length) rows.push(...eventRows)
    return rows
  }, [goalEvents, planOutline])

  const planPreviewDensityConfig = useMemo(() => {
    const levels = [
      { rowGap: 2, trackHeight: 10, titleSize: 10, dateSize: 8, colGap: 6, labelMin: 160, labelMax: 220, barPad: 1 },
      { rowGap: 4, trackHeight: 12, titleSize: 11, dateSize: 9, colGap: 8, labelMin: 180, labelMax: 260, barPad: 1 },
      { rowGap: 7, trackHeight: 16, titleSize: 12, dateSize: 10, colGap: 10, labelMin: 200, labelMax: 300, barPad: 2 },
    ]
    return levels[clamp(planPreviewDensity, 0, levels.length - 1)]
  }, [planPreviewDensity])

  const planPreviewStyle = useMemo(
    () => ({
      ['--plan-row-gap' as any]: `${planPreviewDensityConfig.rowGap}px`,
      ['--plan-track-h' as any]: `${planPreviewDensityConfig.trackHeight}px`,
      ['--plan-title-size' as any]: `${planPreviewDensityConfig.titleSize}px`,
      ['--plan-date-size' as any]: `${planPreviewDensityConfig.dateSize}px`,
      ['--plan-col-gap' as any]: `${planPreviewDensityConfig.colGap}px`,
      ['--plan-label-min' as any]: `${planPreviewDensityConfig.labelMin}px`,
      ['--plan-label-max' as any]: `${planPreviewDensityConfig.labelMax}px`,
      ['--plan-bar-pad' as any]: `${planPreviewDensityConfig.barPad}px`,
    }),
    [planPreviewDensityConfig],
  )

  useEffect(() => {
    if (planAssistGoal.trim() || !activeGoal) return
    setPlanAssistGoal(activeGoal)
  }, [activeGoal, planAssistGoal])

  function buildPlanAssistOutputLocal() {
    const goal = planAssistGoal.trim()
    const promptLines = planAssistPrompt
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    const habitLines = planAssistHabits
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    const startAt = startOfDayMs(Date.now())
    let targetAt = planAssistTarget ? parsePlanDate(planAssistTarget) : null
    if (!targetAt) {
      for (const line of promptLines) {
        const match = line.match(/(\d{4}[-/]\d{2}[-/]\d{2})/)
        if (match) {
          targetAt = parsePlanDate(match[1]!)
          if (targetAt) break
        }
        const byMatch = line.match(/\bby\s+(.+)$/i)
        if (byMatch) {
          targetAt = parseLooseDate(byMatch[1]!.trim())
          if (targetAt) break
        }
      }
    }
    if (!targetAt && goal) targetAt = startAt + 90 * DAY_MS

    const lines: string[] = []
    if (goal && targetAt) {
      lines.push(`${formatPlanDate(startAt)} - ${formatPlanDate(targetAt)}: ${goal}`)
    } else if (goal) {
      lines.push(goal)
    }

    const baseIndent = goal ? '  ' : ''
    for (const rawLine of promptLines) {
      const cleaned = rawLine.replace(/^[-*+]\s+/, '').trim()
      if (!cleaned) continue
      const lower = cleaned.toLowerCase()
      if (lower.startsWith('daily')) {
        const dailyText = cleaned.replace(/^daily\s*:?\s*/i, '').trim()
        if (dailyText) lines.push(`daily: ${stripInlineTags(dailyText)}`)
        continue
      }
      const dateMatch = cleaned.match(/(\d{4}[-/]\d{2}[-/]\d{2})/)
      if (dateMatch) {
        const date = parsePlanDate(dateMatch[1]!)
        if (date != null) {
          const title = stripInlineTags(cleaned.replace(dateMatch[0], '').replace(/\bby\b/i, '').trim())
          lines.push(`${baseIndent}${formatPlanDate(date)}: ${title || cleaned}`)
          continue
        }
      }
      const byMatch = cleaned.match(/\bby\s+(.+)$/i)
      if (byMatch) {
        const byDate = parseLooseDate(byMatch[1]!.trim())
        if (byDate != null) {
          const title = stripInlineTags(cleaned.replace(byMatch[0], '').trim())
          lines.push(`${baseIndent}${formatPlanDate(byDate)}: ${title || cleaned}`)
          continue
        }
      }
      lines.push(`${baseIndent}- ${stripInlineTags(cleaned)}`)
    }

    for (const habit of habitLines) {
      const text = stripInlineTags(habit)
      if (text) lines.push(`daily: ${text}`)
    }

    return lines.join('\n').trim()
  }

  async function generatePlanAssistOutput(mode: 'local' | 'ai') {
    setPlanAssistError('')
    setPlanAssistStatus(mode === 'ai' ? 'Generating with AI...' : 'Building outline...')
    try {
      if (mode === 'ai') {
        const settings = loadSettings()
        const apiKey = settings.openAiKey?.trim()
        if (!apiKey) {
          setPlanAssistStatus('')
          setPlanAssistError('Add an OpenAI API key in Settings to use AI generation.')
          return
        }
        const model = settings.parseModel?.trim() || settings.chatModel?.trim() || 'gpt-4.1-mini'
        const system = [
          'You are a planning assistant.',
          'Convert the user input into a Markwhen-style outline (Mark 1).',
          'Use YYYY-MM-DD dates. Use ranges like "YYYY-MM-DD - YYYY-MM-DD: Title" when a deadline is given.',
          'Include daily habits as "daily: Habit".',
          'Indent subitems with two spaces. Keep it concise.',
          'Output only the outline text, no code fences or extra commentary.',
        ].join(' ')
        const user = [
          `Goal: ${planAssistGoal || activeGoal || ''}`.trim(),
          planAssistTarget ? `Target date: ${planAssistTarget}` : '',
          planAssistPrompt ? `Notes:\\n${planAssistPrompt}` : '',
          planAssistHabits ? `Daily habits:\\n${planAssistHabits}` : '',
        ]
          .filter(Boolean)
          .join('\n\n')
        const output = await callOpenAiText({
          apiKey,
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          temperature: 0.2,
          maxOutputTokens: 500,
        })
        setPlanAssistOutput(stripPlanCodeFences(output))
        setPlanAssistStatus('')
        return
      }
      const output = buildPlanAssistOutputLocal()
      if (!output) {
        setPlanAssistOutput('')
        setPlanAssistStatus('')
        setPlanAssistError('Add a goal or a few lines to build the outline.')
        return
      }
      setPlanAssistOutput(output)
      setPlanAssistStatus('')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Plan generation failed.'
      setPlanAssistStatus('')
      setPlanAssistError(message)
    }
  }

  function applyPlanAssistOutput(mode: 'append' | 'replace') {
    if (!planAssistOutput.trim()) return
    if (mode === 'replace') {
      setPlanDraft(planAssistOutput.trim())
      return
    }
    setPlanDraft((prev) => {
      const trimmed = prev.trim()
      if (!trimmed) return planAssistOutput.trim()
      return `${trimmed}\n\n${planAssistOutput.trim()}`
    })
  }

  async function commitPlan() {
    if (!activeGoal) return
    const existingKeys = new Set(
      props.tasks.map((t) => `${normalizeKey(t.goal ?? '')}|${normalizeKey(t.project ?? '')}|${normalizeKey(t.title)}`),
    )
    for (const item of planOutline) {
      const isTask = item.startAt != null || !item.hasChildren
      if (!isTask) continue
      const project = item.project
      const key = `${normalizeKey(activeGoal)}|${normalizeKey(project ?? '')}|${normalizeKey(item.title)}`
      if (existingKeys.has(key)) continue
      const tags = Array.from(new Set(['#plan', ...item.tags]))
      const task = await createTask({
        title: item.title,
        goal: activeGoal,
        project,
        tags,
      })
      existingKeys.add(key)
      props.onCreatedTask?.(task)
    }
  }

  useEffect(() => {
    if (!activeKey) return
    try {
      const saved = localStorage.getItem(`insight5.goal.plan.${activeKey}`)
      setPlanDraft(saved ?? '')
    } catch {
      setPlanDraft('')
    }
  }, [activeKey])

  useEffect(() => {
    setWeekOffset(0)
    setMenuOpen(null)
  }, [activeKey])

  useEffect(() => {
    if (mode !== 'detail') setPlanPreviewMaximized(false)
  }, [mode])

  useEffect(() => {
    if (!activeKey) return
    try {
      localStorage.setItem(`insight5.goal.plan.${activeKey}`, planDraft)
    } catch {
      // ignore
    }
  }, [activeKey, planDraft])

  const showList = mode !== 'detail'
  const showDetail = mode === 'detail'
  const title = showDetail && activeGoal ? activeGoal : 'Goals'
  const subtitle = showDetail ? 'Goal dashboard' : 'Your long-term north stars.'
  const headerSpacing = showDetail ? 'pt-6 pb-4 space-y-4' : 'pt-10 pb-6 space-y-8'
  const planPreviewDensityLabel = planPreviewDensity === 0 ? 'Tight' : planPreviewDensity === 1 ? 'Compact' : 'Roomy'
  const planPreviewDensityClass = planPreviewDensity === 0 ? 'density-tight' : planPreviewDensity === 1 ? 'density-compact' : 'density-roomy'

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] text-[var(--text)] font-['Figtree'] overflow-hidden">
      {planPreviewMaximized ? (
        <div className="goalPlanPreviewBackdrop" onClick={() => setPlanPreviewMaximized(false)} aria-hidden="true" />
      ) : null}
      <div className={`px-10 ${headerSpacing} bg-[var(--bg)]/80 backdrop-blur-xl sticky top-0 z-10 max-w-7xl mx-auto w-full`}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
            <p className="text-sm text-[var(--muted)] font-semibold">{subtitle}</p>
          </div>
          {showList ? (
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 bg-white/50 backdrop-blur border border-white/20 rounded-full shadow-sm flex items-center gap-2">
                <Icon name="target" size={14} className="text-[var(--accent)]" />
                <span className="text-xs font-bold">{goals.length} Goals</span>
              </div>
            </div>
          ) : null}
          {showDetail ? (
            <div className="flex items-center gap-2">
              <button
                className="px-4 py-2 text-xs font-bold rounded-2xl bg-white/70 border border-black/5 hover:bg-[var(--panel)] transition-all"
                onClick={() => void commitPlan()}
                disabled={!activeGoal || planOutline.length === 0}
              >
                Commit
              </button>
            </div>
          ) : null}
        </div>

        {showDetail ? (
          <div className="goalChipRow">
            {goalChips.map((goal) => (
              <button
                key={goal}
                className={goal === activeGoal ? 'goalChip active' : 'goalChip'}
                onClick={() => {
                  setActiveGoal(goal)
                  props.onOpenGoal?.(goal)
                }}
              >
                {goal}
              </button>
            ))}
            {goalChips.length ? <div className="goalChipMeta">Up to {maxGoals}</div> : null}
          </div>
        ) : null}

        {showList ? (
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex-1 min-w-[240px] max-w-md relative">
              <input
                className="w-full h-11 bg-white/50 border border-black/5 rounded-2xl px-10 text-sm font-medium focus:bg-white focus:shadow-md transition-all outline-none"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Filter goals..."
              />
              <div className="absolute left-3.5 top-3.5 opacity-30">
                <Icon name="tag" size={16} />
              </div>
            </div>
            <div className="flex items-center gap-2 min-w-[260px] max-w-md w-full">
              <input
                className="flex-1 h-11 bg-white/50 border border-black/5 rounded-2xl px-4 text-sm font-medium focus:bg-white focus:shadow-md transition-all outline-none"
                value={newGoalDraft}
                onChange={(e) => setNewGoalDraft(e.target.value)}
                placeholder="New goal name..."
                disabled={goalLimitReached}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  addGoal(newGoalDraft)
                }}
                aria-label="Create a new goal"
              />
              <button
                className="h-11 px-4 rounded-2xl bg-white/70 border border-black/5 text-xs font-bold hover:bg-[var(--panel)] transition-all"
                onClick={() => addGoal(newGoalDraft)}
                disabled={goalLimitReached || !newGoalDraft.trim()}>
                Add
              </button>
              {goalLimitReached ? <div className="goalLimitNote">Max {maxGoals}</div> : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-hidden px-10 pb-32 max-w-7xl mx-auto w-full">
        <div className="flex gap-8 h-full">
          {showList ? (
            <div className="w-full flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
              {goals.length === 0 && <div className="py-20 text-center opacity-30 font-bold uppercase text-xs tracking-widest">No goals yet</div>}
              <AnimatePresence mode="popLayout">
                {goals.map((g) => (
                  <motion.button
                    key={g.goal}
                    layout
                    onClick={() => {
                      setActiveGoal(g.goal)
                      props.onOpenGoal?.(g.goal)
                    }}
                    className={`goalListItem ${activeGoal === g.goal ? 'active' : ''}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <div className="goalListTitleRow">
                      <h3 className="goalListTitle">{g.goal}</h3>
                      <Icon name="chevronRight" size={16} className="goalListChevron" />
                    </div>
                    <div className="goalListMeta">
                      <span className="goalListDate">{g.lastAt ? new Date(g.lastAt).toLocaleDateString() : 'No activity yet'}</span>
                      <span className="goalListStat">
                        <Icon name="bolt" size={10} className="goalListStatIcon" />
                        {g.points.toFixed(1)}
                      </span>
                      <span className="goalListStat">
                        <Icon name="calendar" size={10} className="goalListStatIcon calendar" />
                        {Math.round(g.minutes)}m
                      </span>
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          ) : null}

          {showDetail ? (
            <div className="flex-1 pageHero overflow-hidden flex flex-col">
              {!activeGoal ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-20 space-y-4">
                  <Icon name="target" size={64} />
                  <p className="font-bold uppercase tracking-[0.2em] text-sm">Select a goal to explore</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto px-10 py-8 space-y-6">
                  <div className="goalSection">
                    <div className="goalSectionHeader">
                      <div>
                        <div className="goalSectionEyebrow">Goal activity</div>
                        <div className="goalSectionTitle">Points heatmap</div>
                      </div>
                      <div className="goalSectionMeta">All months</div>
                    </div>
                    <HabitHeatmap values={goalHeatmapValues} startDate={heatmapStart} showLabels maxAbs={goalHeatmapMax} stretch />
                  </div>

                  <div className="goalKpiGrid">
                    <div className="goalKpiCard">
                      <div className="goalKpiLabel">Time spent</div>
                      <div className="goalKpiValue">{Math.round(goalStats.minutes)}m</div>
                      <div className="goalKpiMeta">Goal-linked events</div>
                    </div>
                    <div className="goalKpiCard">
                      <div className="goalKpiLabel">Points</div>
                      <div className="goalKpiValue">{goalStats.points.toFixed(1)}</div>
                      <div className="goalKpiMeta">Impact score</div>
                    </div>
                    <div className="goalKpiCard">
                      <div className="goalKpiLabel">Adherence</div>
                      <div className="goalKpiValue">{adherence.percent}%</div>
                      <div className="goalKpiMeta">{adherence.done}/{adherence.total} habits</div>
                    </div>
                    <div className="goalKpiCard">
                      <div className="goalKpiLabel">Weekly delta</div>
                      <div className="goalKpiValue">
                        {weekSummary.delta >= 0 ? '+' : ''}
                        {weekSummary.delta.toFixed(1)}
                      </div>
                      <div className="goalKpiMeta">Points vs last week</div>
                    </div>
                  </div>

                  <div className="goalSection">
                    <div className="goalSectionHeader">
                      <div>
                        <div className="goalSectionEyebrow">Daily habits</div>
                        <div className="goalSectionTitle">Checklist</div>
                      </div>
                      <div className="goalChecklistNav">
                        <button
                          className="goalChecklistNavButton"
                          onClick={() => {
                            setMenuOpen(null)
                            setWeekOffset((prev) => prev - 1)
                          }}
                          aria-label="Previous week">
                          <Icon name="chevronRight" size={14} className="rotate-180" />
                        </button>
                        <div className="goalChecklistNavText">
                          <div className="goalChecklistNavLabel">{checklistRangeLabel}</div>
                          <div className="goalChecklistNavMeta">Tap a check to toggle or open the event</div>
                        </div>
                        <button
                          className="goalChecklistNavButton"
                          onClick={() => {
                            setMenuOpen(null)
                            setWeekOffset((prev) => prev + 1)
                          }}
                          aria-label="Next week">
                          <Icon name="chevronRight" size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="goalChecklist" style={{ ['--goal-cols' as any]: habitColumns.length }}>
                      <div className="goalChecklistRow goalChecklistHeader">
                        <div className="goalChecklistDay">Day</div>
                        {habitColumns.map((habit) => (
                          <div key={habit.key} className="goalChecklistCol">
                            {habit.label}
                          </div>
                        ))}
                      </div>
                      {checklistDays.map((day) => {
                        const map = habitEventsByDay.get(day)
                        return (
                          <div key={day} className="goalChecklistRow">
                            <div className="goalChecklistDay">{formatShortDay(day)}</div>
                            {habitColumns.map((habit) => {
                              const hit = map?.get(habit.key)
                              const title = hit ? `${hit.title || habit.label} · ${new Date(hit.startAt).toLocaleTimeString()}` : 'No event logged'
                              return (
                                <div key={`${day}_${habit.key}`} className="goalChecklistCell">
                                  <button
                                    className={hit ? 'goalCheck checked' : 'goalCheck'}
                                    onClick={() => {
                                      setMenuOpen(null)
                                      if (hit) {
                                        void clearGoalHabit(hit)
                                        return
                                      }
                                      void logGoalHabit(day, habit, 'log')
                                    }}
                                    title={title}
                                    aria-label={title}
                                  >
                                    {hit ? <Icon name="check" size={12} /> : null}
                                  </button>
                                  <button
                                    className="goalCheckMenu"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setMenuOpen((prev) =>
                                        prev && prev.day === day && prev.key === habit.key ? null : { day, key: habit.key },
                                      )
                                    }}
                                    aria-label={`More ${habit.label} options`}>
                                    <Icon name="dots" size={14} />
                                  </button>
                                  {menuOpen && menuOpen.day === day && menuOpen.key === habit.key ? (
                                    <div className="goalCheckMenuPopover" onClick={(e) => e.stopPropagation()}>
                                      {hit ? (
                                        <button
                                          className="goalCheckMenuItem"
                                          onClick={() => {
                                            setMenuOpen(null)
                                            props.onSelectEvent(hit.id)
                                          }}>
                                          Open event
                                        </button>
                                      ) : null}
                                      {hit ? (
                                        <button
                                          className="goalCheckMenuItem"
                                          onClick={() => {
                                            setMenuOpen(null)
                                            void clearGoalHabit(hit)
                                          }}>
                                          Uncheck
                                        </button>
                                      ) : null}
                                      <button
                                        className="goalCheckMenuItem"
                                        onClick={() => {
                                          setMenuOpen(null)
                                          void logGoalHabit(day, habit, 'start')
                                        }}>
                                        Start now
                                      </button>
                                      <button
                                        className="goalCheckMenuItem"
                                        onClick={() => {
                                          setMenuOpen(null)
                                          void logGoalHabit(day, habit, 'end')
                                        }}>
                                        End now
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="goalSection goalSectionPlan">
                    <div className="goalSectionHeader">
                      <div>
                        <div className="goalSectionEyebrow">Plan</div>
                        <div className="goalSectionTitleRow">
                          <div className="goalSectionTitle">Editable Gantt (Markwhen)</div>
                          <button
                            className={planAssistOpen ? 'goalPlanAssistToggle active' : 'goalPlanAssistToggle'}
                            onClick={() => {
                              setPlanAssistOpen((prev) => !prev)
                              if (!planAssistGoal.trim() && activeGoal) setPlanAssistGoal(activeGoal)
                            }}
                            aria-label="Open plan assistant"
                          >
                            <Icon name="plus" size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="goalSectionMeta">Edit the timeline to update the plan</div>
                    </div>
                    <div className="goalPlan">
                      <div className="goalPlanLeft">
                        {planAssistOpen ? (
                          <div className="goalPlanAssist">
                            <div className="goalPlanAssistHeader">
                              <div>
                                <div className="goalPlanAssistTitle">Plan assistant</div>
                                <div className="goalPlanAssistSub">Describe the outcome, tasks, and habits. Generates Mark 1 lines.</div>
                              </div>
                              <button className="goalPlanAssistClose" onClick={() => setPlanAssistOpen(false)} aria-label="Close plan assistant">
                                <Icon name="x" size={14} />
                              </button>
                            </div>
                            <div className="goalPlanAssistGrid">
                              <label className="goalPlanAssistField">
                                <span>Goal</span>
                                <input
                                  className="goalPlanAssistInput"
                                  value={planAssistGoal}
                                  onChange={(e) => setPlanAssistGoal(e.target.value)}
                                  placeholder={activeGoal ?? 'Goal name'}
                                />
                              </label>
                              <label className="goalPlanAssistField">
                                <span>Target date</span>
                                <input
                                  className="goalPlanAssistInput"
                                  type="date"
                                  value={planAssistTarget}
                                  onChange={(e) => setPlanAssistTarget(e.target.value)}
                                />
                              </label>
                            </div>
                            <label className="goalPlanAssistField">
                              <span>Outline notes</span>
                              <textarea
                                className="goalPlanAssistTextarea"
                                value={planAssistPrompt}
                                onChange={(e) => setPlanAssistPrompt(e.target.value)}
                                placeholder="List steps, dependencies, or dates (one per line). Example: InBody scan by 2025-01-03"
                              />
                            </label>
                            <label className="goalPlanAssistField">
                              <span>Daily habits (one per line)</span>
                              <textarea
                                className="goalPlanAssistTextarea"
                                value={planAssistHabits}
                                onChange={(e) => setPlanAssistHabits(e.target.value)}
                                placeholder={`Cardio 45m @ 4:00 AM\nEat clean each meal`}
                              />
                            </label>
                            {planAssistStatus ? <div className="goalPlanAssistStatus">{planAssistStatus}</div> : null}
                            {planAssistError ? <div className="goalPlanAssistError">{planAssistError}</div> : null}
                            {planAssistOutput ? (
                              <textarea className="goalPlanAssistOutput" value={planAssistOutput} readOnly />
                            ) : (
                              <div className="goalPlanAssistEmpty">Outline preview appears here.</div>
                            )}
                            <div className="goalPlanAssistActions">
                              <button className="goalPlanAssistBtn" onClick={() => void generatePlanAssistOutput('local')}>
                                Generate outline
                              </button>
                              <button className="goalPlanAssistBtn" onClick={() => void generatePlanAssistOutput('ai')}>
                                Generate with AI
                              </button>
                              <button
                                className="goalPlanAssistBtn primary"
                                onClick={() => applyPlanAssistOutput('append')}
                                disabled={!planAssistOutput.trim()}
                              >
                                Append to editor
                              </button>
                              <button
                                className="goalPlanAssistBtn"
                                onClick={() => applyPlanAssistOutput('replace')}
                                disabled={!planAssistOutput.trim()}
                              >
                                Replace editor
                              </button>
                            </div>
                          </div>
                        ) : null}
                        <textarea
                          className="goalPlanEditor"
                          value={planDraft}
                          onChange={(e) => setPlanDraft(e.target.value)}
                          placeholder="2025-01-01 - 2025-06-30: Cut to 165
  2025-01-03: InBody exam
  - Weekly check-in
    - Adjust calories
daily: Cardio 45m @ 4:00 AM"
                        />
                        <div className="goalPlanOutline">
                          {planOutline.length === 0 ? (
                            <div className="goalPlanOutlineEmpty">Outline preview appears here.</div>
                          ) : (
                            planOutline.map((item) => (
                              <div
                                key={item.id}
                                className="goalPlanOutlineItem"
                                style={{ ['--plan-level' as any]: item.level }}
                              >
                                <div className="goalPlanOutlineTitle">{item.title}</div>
                                {item.tags.length ? (
                                  <div className="goalPlanOutlineTags">
                                    {item.tags.map((tag) => (
                                      <span key={`${item.id}_${tag}`} className="goalPlanTag">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                      <div
                        className={`${planPreviewMaximized ? 'goalPlanPreview goalPlanPreviewMaximized' : 'goalPlanPreview'} ${planPreviewDensityClass}`}
                        style={planPreviewStyle}
                      >
                        <div className="goalPlanPreviewHeader">
                          <div className="goalPlanPreviewHeading">
                            <div className="goalPlanPreviewTitle">Gantt preview</div>
                            {planPreviewRange.startAt ? (
                              <div className="goalPlanPreviewRange">
                                {planPreviewRange.startLabel}
                                {" -> "}
                                {planPreviewRange.endLabel}
                              </div>
                            ) : null}
                          </div>
                          <div className="goalPlanPreviewActions">
                            <div className="goalPlanPreviewDensity">
                              <span>Density</span>
                              <input
                                className="goalPlanPreviewDensityInput"
                                type="range"
                                min={0}
                                max={2}
                                step={1}
                                value={planPreviewDensity}
                                onChange={(e) => setPlanPreviewDensity(Number(e.target.value))}
                                aria-label="Adjust Gantt density"
                              />
                              <span className="goalPlanPreviewDensityValue">{planPreviewDensityLabel}</span>
                            </div>
                            <button
                              className="goalPlanPreviewBtn"
                              onClick={() => setPlanPreviewMaximized((prev) => !prev)}
                              aria-label={planPreviewMaximized ? 'Close expanded preview' : 'Maximize preview'}
                            >
                              <Icon name={planPreviewMaximized ? 'x' : 'maximize'} size={14} />
                            </button>
                          </div>
                        </div>
                        {planPreviewRows.length === 0 ? (
                          <div className="goalPlanPreviewBody">Add lines with dates to render the Gantt.</div>
                        ) : (
                          <div className="goalPlanTimeline" style={{ ['--goal-plan-grid' as any]: planPreviewRange.grid }}>
                            {planPreviewScale.length ? (
                              <div className="goalPlanTimelineScaleRow">
                                <div className="goalPlanTimelineScaleLabel">Date</div>
                                <div className="goalPlanTimelineScale">
                                  {planPreviewScale.map((cell) => (
                                    <div key={cell.id} className="goalPlanTimelineScaleCell">
                                      {cell.label}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                            {planPreviewRows.map((item) => {
                              const rangeMs = planPreviewRange.rangeMs
                              const hasDates = item.startAt != null && item.endAt != null && planPreviewRange.startAt > 0
                              const startAt = (item.startAt ?? planPreviewRange.startAt) as number
                              const endAt = (item.endAt ?? planPreviewRange.startAt) as number
                              const left = hasDates ? clamp(((startAt - planPreviewRange.startAt) / rangeMs) * 100, 0, 100) : 0
                              const width = hasDates ? clamp(((endAt - startAt) / rangeMs) * 100, 1, 100 - left) : 0
                              const startLabel = hasDates ? new Date(startAt).toLocaleDateString() : ''
                              const endLabel = hasDates ? new Date(Math.max(startAt, endAt - DAY_MS)).toLocaleDateString() : ''
                              const indent = Math.min(6, item.level) * 12
                              const rowClass = [
                                'goalPlanTimelineRow',
                                hasDates ? '' : 'empty',
                                item.kind === 'event' ? 'event' : '',
                              ]
                                .filter(Boolean)
                                .join(' ')
                              return (
                                <div key={item.id} className={rowClass}>
                                  <div
                                    className={item.level > 0 ? 'goalPlanTimelineLabel nested' : 'goalPlanTimelineLabel'}
                                    style={{ ['--plan-indent' as any]: `${indent}px` }}
                                  >
                                    {hasDates ? (
                                      <div className="goalPlanTimelineDates">
                                        {startLabel}
                                        {" -> "}
                                        {endLabel}
                                      </div>
                                    ) : null}
                                    <div className="goalPlanTimelineTitle">{item.title}</div>
                                    {item.meta ? <div className="goalPlanTimelineMeta">{item.meta}</div> : null}
                                  </div>
                                  <div className="goalPlanTimelineTrack">
                                    {hasDates ? (
                                      <div className="goalPlanTimelineBar" style={{ left: `${left}%`, width: `${width}%` }} />
                                    ) : (
                                      <div className="goalPlanTimelinePlaceholder" />
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="goalSection">
                    <div className="goalSectionHeader">
                      <div>
                        <div className="goalSectionEyebrow">Weekly check-in</div>
                        <div className="goalSectionTitle">Auto deltas</div>
                      </div>
                      <div className="goalSectionMeta">{checklistRangeLabel}</div>
                    </div>
                    <div className="goalWeeklyGrid">
                      <div className="goalWeeklyCard">
                        <div className="goalWeeklyLabel">Points</div>
                        <div className="goalWeeklyValue">{weekSummary.current.toFixed(1)}</div>
                        <div className="goalWeeklyMeta">
                          {weekSummary.delta >= 0 ? '+' : ''}
                          {weekSummary.delta.toFixed(1)} from last week
                        </div>
                      </div>
                      <div className="goalWeeklyCard">
                        <div className="goalWeeklyLabel">Adherence</div>
                        <div className="goalWeeklyValue">{adherence.percent}%</div>
                        <div className="goalWeeklyMeta">Habits completed</div>
                      </div>
                      <div className="goalWeeklyCard">
                        <div className="goalWeeklyLabel">Notes</div>
                        <div className="goalWeeklyValue">Auto</div>
                        <div className="goalWeeklyMeta">Summaries coming soon</div>
                      </div>
                    </div>
                  </div>

                  <div className="goalSection">
                    <div className="goalSectionHeader">
                      <div>
                        <div className="goalSectionEyebrow">Activity</div>
                        <div className="goalSectionTitle">Goal-linked feed</div>
                      </div>
                      <div className="goalSectionMeta">{activityItems.length} recent</div>
                    </div>
                    {activityItems.length === 0 ? (
                      <div className="goalEmpty">No linked activity yet.</div>
                    ) : (
                      <div className="goalActivityTable">
                        <div className="goalActivityRow goalActivityHeader">
                          <div>Date</div>
                          <div>Time</div>
                          <div>Type</div>
                          <div>Item</div>
                          <div>Notes</div>
                        </div>
                        {activityItems.map((item) => {
                          const date = new Date(item.at)
                          const dateLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                          const timeLabel = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                          const note = (item.notes ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)[0] ?? ''
                          const typeLabel = item.type === 'task' ? (item.done ? 'Task · done' : 'Task') : 'Event'
                          return (
                            <button
                              key={`${item.type}_${item.id}`}
                              className="goalActivityRow"
                              onClick={() => {
                                if (item.type === 'task') props.onSelectTask(item.id)
                                else props.onSelectEvent(item.id)
                              }}
                              type="button"
                            >
                              <div>{dateLabel}</div>
                              <div>{timeLabel}</div>
                              <div>{typeLabel}</div>
                              <div className="goalActivityTitleCell">{item.title}</div>
                              <div className="goalActivityNotes">{note || '—'}</div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="goalSection">
                    <div className="goalSectionHeader">
                      <div>
                        <div className="goalSectionEyebrow">Associated</div>
                        <div className="goalSectionTitle">Linked projects</div>
                      </div>
                      <div className="goalSectionMeta">{associatedProjects.length} total</div>
                    </div>
                    {associatedProjects.length === 0 ? (
                      <div className="goalEmpty">No linked projects yet.</div>
                    ) : (
                      <div className="goalProjects">
                        {associatedProjects.map((project) => (
                          <div key={project} className="goalProjectTag">
                            {project}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  </div>
              </div>
            )}
          </div>
        ) : null}
        </div>
      </div>
    </div>
  )
}
