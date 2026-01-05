import './App.css'
import { useEffect, useMemo, useState, useRef, type DragEvent, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Session } from '@supabase/supabase-js'
import { Toaster, toast } from 'sonner'

import { addInboxCapture, listInboxCaptures, updateCaptureEntityIds, updateCaptureText, type InboxCapture } from './storage/inbox'
import { createTask, createTaskInEvent, deleteTask, listTasks, startTask, upsertTask, type Task, type TaskStatus } from './storage/tasks'
import { createEvent, deleteEvent, findActiveByTrackerKey, findActiveEpisode, findBestActiveEventAt, listEvents, upsertEvent, type CalendarEvent } from './storage/calendar'
import { ensureEntity } from './storage/entities'
import { estimateCalories, parseWorkoutFromText, saveWorkout } from './storage/workouts'
import { estimateFoodNutrition, parseMealFromText, saveMeal } from './storage/nutrition'
import { parseCaptureNatural, type ParsedEvent } from './nlp/natural'
import { parseCaptureWithBlocksLlm } from './nlp/llm-parse'
import { estimateNutritionWithLlm } from './nlp/nutrition-estimate'
import { loadSettings } from './assistant/storage'
import { makeFoodItemId, type FoodItem } from './db/insight-db'
import { getSupabaseClient } from './supabase/client'
import { migrateLocalDataToSupabase, pullSupabaseToLocal } from './supabase/sync'

import { Icon, type IconName } from './ui/icons'
import { EVENT_COLOR_PRESETS, eventAccent } from './ui/event-visual'
import { DISPLAY_SETTINGS_CHANGED_EVENT, loadDisplaySettings, type EventTitleDetail } from './ui/display-settings'
import { applyTheme, loadThemePreference, resolveTheme, saveThemePreference, THEME_CHANGED_EVENT, type ThemePreference } from './ui/theme'
import { parseChecklistMarkdown, toggleChecklistLine } from './ui/checklist'
import { MarkdownEditor } from './ui/markdown-editor'
import { CaptureModal } from './ui/CaptureModal'
import { ActiveSessionBanner } from './ui/ActiveSessionBanner'
import { Pane, type WorkspaceTab, type WorkspaceViewKey } from './workspace/pane'
import { TickTickTasksView } from './workspace/views/ticktick-tasks'
import { AssistantView } from './workspace/views/assistant'
import { DashboardView } from './workspace/views/dashboard'
import { HealthDashboard } from './workspace/views/health'
import { PlaceholderView } from './workspace/views/placeholder'
import { TimelineView } from './workspace/views/timeline'
import { ReflectionsView } from './workspace/views/ReflectionsView'
import { PlannerView } from './workspace/views/planner'
import { NotesView } from './workspace/views/notes'
import { SettingsView } from './workspace/views/settings'
import { PeopleView } from './workspace/views/people'
import { PlacesView } from './workspace/views/places'
import { TagsView } from './workspace/views/tags'
import { RewardsView } from './workspace/views/rewards'
import { GoalsView } from './workspace/views/goals'
import { ProjectsView } from './workspace/views/projects'
import { HabitsView } from './workspace/views/habits'
import { ReportsView } from './workspace/views/reports'
import { basePoints, multiplierFor, pointsForMinutes } from './scoring/points'
import { loadCustomTaxonomy, saveCustomTaxonomy } from './taxonomy/custom'
import { categoriesFromStarter, subcategoriesFromStarter } from './taxonomy/starter'
import { loadTaxonomyRules, TAXONOMY_RULES_CHANGED_EVENT, type TaxonomyRule } from './taxonomy/rules'
import { collectMarkdownTokens } from './markdown/schema'

type PaneState = {
  tabs: WorkspaceTab[]
  activeTabId: string
}

type CreateEventSeed = {
  startAt: number
  endAt: number
  kind?: CalendarEvent['kind']
  taskId?: string | null
}

type EventComposerDraft = {
  title: string
  startAt: number
  endAt: number
  kind: CalendarEvent['kind']
  allDay: boolean
  active: boolean
  icon: string | null
  color: string | null
  tagsRaw: string
  location: string
  peopleRaw: string
  skillsRaw: string
  character: string[]
  category: string
  subcategory: string
  importance: number | null
  difficulty: number | null
  estimateMinutesRaw: string
  notes: string
  taskId: string | null
  trackerKey: string
}

type HabitDef = {
  id: string
  name: string
  category: string | null
  subcategory: string | null
  difficulty: number
  importance: number
  character: Array<'STR' | 'INT' | 'CON' | 'PER'>
  skills: string[]
  tags: string[]
  estimateMinutes?: number | null
  polarity?: 'positive' | 'negative' | 'both'
  schedule?: string | null
  targetPerWeek?: number | null
}

type TrackerDef = {
  key: string
  label: string
  defaultValue?: number | null
  icon?: IconName
}

type Selection =
  | { kind: 'none' }
  | { kind: 'task'; id: string }
  | { kind: 'event'; id: string }
  | { kind: 'capture'; id: string }

const HABITS_UPDATED_EVENT = 'insight5.habits.updated'
const DND_HABIT = 'application/insight5-habit'
const DND_TRACKER = 'application/insight5-tracker'
const REPORTS_HABIT_ID_KEY = 'insight5.reports.habitId'

function makeTabId(view: WorkspaceViewKey) {
  return `tab_${view}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function defaultTabTitle(view: WorkspaceViewKey) {
  switch (view) {
    case 'notes':
      return 'Notes'
    case 'reflections':
      return 'Thoughts'
    case 'tasks':
      return 'Tasks'
    case 'calendar':
      return 'Day'
    case 'dashboard':
      return 'Life Tracker'
    case 'assistant':
      return 'Chat'
    case 'habits':
      return 'Habits'
    case 'goals':
      return 'Goals'
    case 'goal-detail':
      return 'Goal'
    case 'projects':
      return 'Projects'
    case 'rewards':
      return 'Rewards'
    case 'reports':
      return 'Reports'
    case 'health':
      return 'Health'
    case 'people':
      return 'People'
    case 'places':
      return 'Places'
    case 'tags':
      return 'Tags'
    case 'timeline':
      return 'Timeline'
    case 'settings':
      return 'Settings'
    default:
      return view
  }
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

function numberOrNull(v: string) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function toLocalDateTimeInput(ms: number | null | undefined) {
  if (!ms) return ''
  const d = new Date(ms)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

function fromLocalDateTimeInput(v: string) {
  const ms = new Date(v).getTime()
  return Number.isFinite(ms) ? ms : null
}

function estimateMinutesFromRange(startAt: number, endAt: number) {
  const minutes = Math.round(Math.max(5 * 60 * 1000, endAt - startAt) / (60 * 1000))
  return Number.isFinite(minutes) ? String(minutes) : ''
}

const EVENT_ICON_OPTIONS: Array<{ value: IconName; label: string }> = [
  { value: 'calendar', label: 'Calendar' },
  { value: 'check', label: 'Task' },
  { value: 'phone', label: 'Call' },
  { value: 'food', label: 'Food' },
  { value: 'cart', label: 'Shopping' },
  { value: 'dumbbell', label: 'Workout' },
  { value: 'tooth', label: 'Teeth' },
  { value: 'briefcase', label: 'Work' },
  { value: 'stethoscope', label: 'Clinic' },
  { value: 'book', label: 'Study' },
  { value: 'moonStar', label: 'Sleep' },
  { value: 'pin', label: 'Location' },
  { value: 'users', label: 'People' },
]

function toTitleCase(input: string) {
  return input
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ')
}

function inferCategorySubcategoryLoose(title: string, tags: string[]) {
  const t = title.toLowerCase()
  const tagSet = new Set(tags.map((x) => x.replace(/^#/, '').toLowerCase()))
  let category: string | null = null
  let subcategory: string | null = null

  for (const rawTag of tags) {
    const cleaned = rawTag.replace(/^#/, '').trim()
    if (!cleaned || !cleaned.includes('/')) continue
    const [cat, sub] = cleaned.split('/', 2)
    if (cat) category = toTitleCase(cat)
    if (sub) subcategory = toTitleCase(sub)
    break
  }

  if (!category && (tagSet.has('work') || /\b(work|shift)\b/.test(t))) category = 'Work'
  if (tagSet.has('clinic') || /\b(clinic|patients|rounds|inpatient)\b/.test(t)) {
    category = category ?? 'Work'
    subcategory = subcategory ?? 'Clinic'
  }
  if (tagSet.has('meeting') || /\b(meeting|conference|rounds)\b/.test(t)) {
    category = category ?? 'Work'
    subcategory = subcategory ?? 'Meeting'
  }
  if (tagSet.has('study') || /\b(study|lecture|reading)\b/.test(t)) {
    category = category ?? 'Learning'
    subcategory = subcategory ?? (/\b(read|reading)\b/.test(t) ? 'Reading' : 'Practice')
  }
  if (tagSet.has('workout') || /\b(workout|gym|lift|lifting|run|cardio|yoga|training)\b/.test(t)) {
    category = category ?? 'Health'
    subcategory = subcategory ?? 'Workout'
  }
  if (tagSet.has('sleep') || /\b(sleep|nap)\b/.test(t)) {
    category = category ?? 'Health'
    subcategory = subcategory ?? 'Sleep'
  }
  if (tagSet.has('shopping') || /\b(grocery|shopping|store|errand)\b/.test(t)) {
    category = category ?? 'Personal'
    subcategory = subcategory ?? (/\b(grocery|groceries)\b/.test(t) ? 'Groceries' : 'Errands')
  }
  if (tagSet.has('morning') || /\b(get ready|morning routine|prep|ready for work)\b/.test(t)) {
    category = category ?? 'Personal'
    subcategory = subcategory ?? 'Morning Routine'
  }
  if (tagSet.has('food') || /\b(dinner|lunch|breakfast|meal|restaurant|food)\b/.test(t)) {
    category = category ?? 'Food'
    subcategory = subcategory ?? (/\b(restaurant|dinner out|lunch out|eat out)\b/.test(t) ? 'Restaurant' : 'Meal')
  }
  if (tagSet.has('walk') || /\b(walk|stroll)\b/.test(t)) {
    category = category ?? 'Personal'
    subcategory = subcategory ?? 'Health'
  }
  if (tagSet.has('transport') || /\b(transport|drive|driving|commute|flight|fly|uber|lyft|train|bus|parking)\b/.test(t)) {
    category = category ?? 'Transport'
    if (/\b(flight|fly|airport)\b/.test(t)) subcategory = subcategory ?? 'Flight'
    else if (/\b(train|bus|transit|subway)\b/.test(t)) subcategory = subcategory ?? 'Transit'
    else if (/\b(parking)\b/.test(t)) subcategory = subcategory ?? 'Parking'
    else subcategory = subcategory ?? 'Driving'
  }
  if (tagSet.has('finance') || /\b(bank|finance|mortgage|loan|bill|budget|expense)\b/.test(t)) {
    category = category ?? 'Finance'
    subcategory = subcategory ?? (/\b(bank)\b/.test(t) ? 'Banking' : /\b(bill|bills)\b/.test(t) ? 'Bills' : 'Budget')
  }

  if (category) {
    const canonical = categoriesFromStarter().find((c) => c.toLowerCase() === category!.toLowerCase())
    if (canonical) category = canonical
  }
  if (category && subcategory) {
    const subs = subcategoriesFromStarter(category)
    const canonicalSub = subs.find((s) => s.toLowerCase() === subcategory!.toLowerCase())
    if (canonicalSub) subcategory = canonicalSub
  }

  return { category, subcategory }
}

function normalizeHashTag(raw: string) {
  const t = raw.trim()
  if (!t) return ''
  return t.startsWith('#') ? t : `#${t}`
}

function recordTaxonomyEntry(category: string | null, subcategory: string | null) {
  if (!category) return
  const next = loadCustomTaxonomy()
  const idx = next.findIndex((c) => c.category.toLowerCase() === category.toLowerCase())
  if (idx >= 0) {
    const current = next[idx]!
    const subs = new Set(current.subcategories.map((s) => s.trim()).filter(Boolean))
    if (subcategory) subs.add(subcategory)
    next[idx] = { category: current.category, subcategories: Array.from(subs) }
  } else {
    next.push({ category, subcategories: subcategory ? [subcategory] : [] })
  }
  saveCustomTaxonomy(next)
}

function loadHabitDefsFromStorage(): HabitDef[] {
  try {
    const raw = localStorage.getItem('insight5.habits.defs.v1')
    if (!raw) return []
    const parsed = JSON.parse(raw) as HabitDef[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((h) => h && typeof h.id === 'string' && typeof h.name === 'string')
      .map((h) => ({
        ...h,
        tags: (h.tags ?? []).map((t) => normalizeHashTag(String(t))).filter(Boolean),
        estimateMinutes: typeof h.estimateMinutes === 'number' ? h.estimateMinutes : null,
        polarity: h.polarity ?? 'both',
      }))
  } catch {
    return []
  }
}

const TRACKER_LIBRARY: TrackerDef[] = [
  { key: 'mood', label: 'Mood', defaultValue: 7, icon: 'smile' },
  { key: 'energy', label: 'Energy', defaultValue: 7, icon: 'bolt' },
  { key: 'stress', label: 'Stress', defaultValue: 5, icon: 'frown' },
  { key: 'pain', label: 'Pain', defaultValue: 3, icon: 'heart' },
  { key: 'bored', label: 'Bored', defaultValue: 7, icon: 'frown' },
  { key: 'water', label: 'Water', icon: 'droplet' },
]

/*
function trackerTitleFor(def: TrackerDef) {
  if (def.defaultValue == null || !Number.isFinite(def.defaultValue)) return def.label
  return `${def.key}: ${Math.round(def.defaultValue)}/10`
}
*/

function extractContextTokens(rawText: string) {
  const out = new Set<string>()
  for (const m of rawText.matchAll(/(^|[\s(])\+([a-zA-Z][\w/-]*)/g)) {
    const name = (m[2] ?? '').trim()
    if (name) out.add(name)
  }
  return [...out].slice(0, 16)
}

function extractDurationToken(rawText: string) {
  const t = rawText.toLowerCase()
  const hm = t.match(/~\s*(\d{1,2})\s*h(?:ours?)?\s*(\d{1,2})\s*m(?:in(?:ute)?s?)?\b/)
  if (hm?.[1]) {
    const h = Number(hm[1])
    const m = Number(hm[2] ?? 0)
    if (Number.isFinite(h) && Number.isFinite(m)) return h * 60 + m
  }
  const h = t.match(/~\s*(\d{1,2})(?:\.(\d))?\s*h(?:ours?)?\b/)
  if (h?.[1]) {
    const whole = Number(h[1])
    const tenth = h[2] ? Number(h[2]) / 10 : 0
    if (Number.isFinite(whole)) return Math.max(1, Math.round((whole + tenth) * 60))
  }
  const m = t.match(/~\s*(\d{1,3})\s*(m|min|mins|minute|minutes)\b/)
  if (m?.[1]) {
    const mins = Number(m[1])
    if (Number.isFinite(mins)) return Math.max(1, Math.min(24 * 60, mins))
  }
  return null
}

function extractImportanceToken(rawText: string) {
  const m = rawText.match(/!(\d{1,2})\b/)
  const v = m?.[1] ? Number(m[1]) : null
  const kv = rawText.match(/\bimportance[:=]\s*(\d{1,2})\b/i)?.[1]
  const vv = kv ? Number(kv) : null
  const val = Number.isFinite(v ?? NaN) ? v : Number.isFinite(vv ?? NaN) ? vv : null
  return val != null ? Math.max(1, Math.min(10, val)) : null
}

function extractDifficultyToken(rawText: string) {
  const m = rawText.match(/\^(\d{1,2})\b/)
  const v = m?.[1] ? Number(m[1]) : null
  const kv = rawText.match(/\b(?:difficulty|energy)[:=]\s*(\d{1,2})\b/i)?.[1]
  const ratio = rawText.match(/\b(\d{1,2})\s*\/\s*10\b/)?.[1]
  const vv = kv ? Number(kv) : ratio ? Number(ratio) : null
  const val = Number.isFinite(v ?? NaN) ? v : Number.isFinite(vv ?? NaN) ? vv : null
  return val != null ? Math.max(1, Math.min(10, val)) : null
}

function hasExplicitTimeRange(rawText: string) {
  const t = rawText.toLowerCase()
  if (/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:-|–|—|\s+to\s+)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/.test(t)) return true
  if (/\b(at|@)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/.test(t)) return true
  return false
}

function parseInlineList(raw: string) {
  return raw
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .split(',')
    .map((x) => x.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
}

function parseSimpleFrontmatter(lines: string[]) {
  const out: Record<string, any> = {}
  let activeKey: string | null = null
  let listBuffer: string[] = []

  const flushList = () => {
    if (activeKey) out[activeKey] = [...listBuffer]
    activeKey = null
    listBuffer = []
  }

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, '  ')
    if (!line.trim() || /^\s*#/.test(line)) continue
    const listMatch = line.match(/^\s*-\s+(.+)$/)
    if (listMatch && activeKey) {
      listBuffer.push(listMatch[1].trim().replace(/^['"]|['"]$/g, ''))
      continue
    }
    if (activeKey) flushList()
    const m = line.match(/^\s*([A-Za-z][\w-]*)\s*:\s*(.*)$/)
    if (!m?.[1]) continue
    const key = m[1]
    const value = (m[2] ?? '').trim()
    if (!value) {
      activeKey = key
      listBuffer = []
      continue
    }
    if (value.startsWith('[') && value.endsWith(']')) {
      out[key] = parseInlineList(value)
      continue
    }
    const unquoted = value.replace(/^['"]|['"]$/g, '')
    if (/^(true|false)$/i.test(unquoted)) {
      out[key] = unquoted.toLowerCase() === 'true'
      continue
    }
    const num = Number(unquoted)
    out[key] = Number.isFinite(num) && unquoted !== '' ? num : unquoted
  }
  if (activeKey) flushList()
  return out
}

function extractFrontmatter(rawText: string) {
  const lines = rawText.split(/\r?\n/)
  if ((lines[0] ?? '').trim() !== '---') return { frontmatter: null, body: rawText }
  const endIdx = lines.slice(1).findIndex((l) => l.trim() === '---')
  if (endIdx === -1) return { frontmatter: null, body: rawText }
  const fmLines = lines.slice(1, endIdx + 1)
  const body = lines.slice(endIdx + 2).join('\n').trim()
  const frontmatter = parseSimpleFrontmatter(fmLines)
  return { frontmatter, body }
}

function toStringList(value: unknown) {
  if (Array.isArray(value)) return value.map((x) => String(x)).filter(Boolean)
  if (typeof value === 'string') return value.split(/[,;]+/).map((x) => x.trim()).filter(Boolean)
  return []
}

function extractTrackerTokens(text: string) {
  const out: Array<{ name: string; value: number }> = []
  for (const m of text.matchAll(/#([a-zA-Z][\\w/-]*)\\(([-+]?\\d*\\.?\\d+)\\)/g)) {
    out.push({ name: m[1], value: Number(m[2]) })
  }
  for (const m of text.matchAll(/#([a-zA-Z][\\w/-]*):([-+]?\\d*\\.?\\d+)/g)) {
    out.push({ name: m[1], value: Number(m[2]) })
  }
  return out
}

function extractTaskLines(markdown: string) {
  const titles: string[] = []
  for (const line of markdown.split(/\\r?\\n/)) {
    const m = line.match(/^\\s*[-*]\\s*\\[ \\]\\s*(.+)$/)
    if (m?.[1]) titles.push(m[1].trim())
  }
  return titles.slice(0, 50)
}

function parseCommaList(raw: string) {
  return raw
    .split(/[,\\n]+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 20)
}

function formatCommaList(values: string[] | null | undefined) {
  return (values ?? []).join(', ')
}

const CHARACTER_KEYS = ['STR', 'INT', 'CON', 'PER'] as const

function normalizeCharacterKey(raw: string) {
  const t = raw.trim().toLowerCase()
  if (!t) return null
  if (t === 'str' || t === 'strength') return 'STR'
  if (t === 'int' || t === 'intelligence') return 'INT'
  if (t === 'con' || t === 'constitution') return 'CON'
  if (t === 'per' || t === 'perception') return 'PER'
  return null
}

function normalizeCharacterSelection(values: string[] | null | undefined) {
  const out: string[] = []
  const seen = new Set<string>()
  for (const v of values ?? []) {
    const k = normalizeCharacterKey(v)
    if (!k) continue
    if (seen.has(k)) continue
    seen.add(k)
    out.push(k)
  }
  return out
}

function toggleCharacterSelection(values: string[] | null | undefined, key: (typeof CHARACTER_KEYS)[number]) {
  const current = new Set(normalizeCharacterSelection(values))
  if (current.has(key)) current.delete(key)
  else current.add(key)
  return [...current]
}

function extractTagTokens(rawText: string) {
  const out = new Set<string>()
  for (const m of rawText.matchAll(/#([a-zA-Z][\w/-]*)(?!\s*(\(|:\s*[-+]?\d))/g)) out.add(m[1].toLowerCase())
  return [...out].slice(0, 24)
}

function extractAtMentions(rawText: string) {
  const out: Array<{ raw: string; before: string }> = []
  for (const m of rawText.matchAll(/(^|[\s(])@(?:"([^"]+)"|'([^']+)'|([A-Za-z][\w'’-]*(?:\s+[A-Za-z][\w'’-]*){0,3}))/g)) {
    const before = (m[1] ?? '').toLowerCase()
    const raw = (m[2] ?? m[3] ?? m[4] ?? '').trim()
    if (!raw) continue
    out.push({ raw, before })
  }
  return out.slice(0, 16)
}

function uniqStrings(values: string[]) {
  const out: string[] = []
  const seen = new Set<string>()
  for (const v of values) {
    const s = v.trim()
    if (!s) continue
    const k = s.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(s)
  }
  return out
}

function formatMinutesSpan(totalMinutes: number) {
  const mins = Math.max(0, Math.round(totalMinutes))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

const PINNED_GROUP_ORDER_KEY = 'insight5.explorer.pinnedGroupOrder.v1'
const DEFAULT_PINNED_GROUP_ORDER = ['tasks', 'habits', 'trackers', 'shortcuts'] as const

function loadPinnedGroupOrder() {
  try {
    const raw = localStorage.getItem(PINNED_GROUP_ORDER_KEY)
    if (!raw) return [...DEFAULT_PINNED_GROUP_ORDER]
    const parsed = JSON.parse(raw) as string[]
    if (!Array.isArray(parsed)) return [...DEFAULT_PINNED_GROUP_ORDER]
    const allowed = new Set(DEFAULT_PINNED_GROUP_ORDER)
    const next = parsed.filter((k) => allowed.has(k as any))
    for (const k of DEFAULT_PINNED_GROUP_ORDER) if (!next.includes(k)) next.push(k)
    return next
  } catch {
    return [...DEFAULT_PINNED_GROUP_ORDER]
  }
}

function savePinnedGroupOrder(order: string[]) {
  try {
    localStorage.setItem(PINNED_GROUP_ORDER_KEY, JSON.stringify(order))
  } catch {
    // ignore
  }
}

function nextThemePref(current: ThemePreference): ThemePreference {
  if (current === 'light') return 'dark'
  if (current === 'dark') return 'system'
  return 'light'
}

function extractImplicitPeople(rawText: string) {
  const out: string[] = []
  for (const m of rawText.matchAll(/\bwith\s+(?:(?:dr|doctor|mr|ms|mrs|prof|professor)\.?\s+)?([A-Z][\w'’.-]*(?:\s+[A-Z][\w'’.-]*){0,2})\b/gim)) {
    const name = (m[1] ?? '').trim()
    if (!name) continue
    out.push(name)
  }
  for (const m of rawText.matchAll(/\b(?:call|text|dm|email)\s+(mom|dad|mother|father|wife|husband|partner)\b/gim)) {
    const raw = (m[1] ?? '').trim()
    if (!raw) continue
    out.push(raw[0]!.toUpperCase() + raw.slice(1).toLowerCase())
  }
  return uniqStrings(out).slice(0, 8)
}

function normalizePersonName(raw: string) {
  const cleaned = raw
    .replace(/^@+/, '')
    .replace(/^[\s,;:.!]+/, '')
    .replace(/[\s,;:.!]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return null
  const relationMap: Record<string, string> = {
    mom: 'Mom',
    mother: 'Mother',
    dad: 'Dad',
    father: 'Father',
    wife: 'Wife',
    husband: 'Husband',
    partner: 'Partner',
  }
  const dropWords = new Set([
    'a',
    'an',
    'the',
    'at',
    'in',
    'on',
    'with',
    'for',
    'to',
    'from',
    'and',
    'or',
    'him',
    'her',
    'them',
    'me',
    'my',
    'their',
    'his',
    'hers',
    'i',
    'im',
    "i'm",
    'talked',
    'talking',
    'met',
    'see',
    'saw',
    'baby',
  ])
  const bannedWords = new Set([
    'patient',
    'patients',
    'nurse',
    'nursing',
    'clinic',
    'hospital',
    'staff',
    'team',
    'coworker',
    'coworkers',
    'people',
    'unit',
    'room',
    'chart',
    'charting',
    'shift',
    'rounds',
  ])
  const titleWords = new Set(['dr', 'doctor', 'mr', 'mrs', 'ms', 'prof', 'professor', 'aunt', 'uncle'])
  const parts = cleaned.split(' ').filter(Boolean)
  while (parts.length && titleWords.has(parts[0]!.toLowerCase())) parts.shift()
  const filtered = parts.filter((p) => !dropWords.has(p.toLowerCase()))
  if (filtered.length === 0) return null
  if (filtered.length > 3) return null
  const joined = filtered.join(' ')
  const lowerJoined = joined.toLowerCase()
  if (relationMap[lowerJoined]) return relationMap[lowerJoined]
  if (!/[A-Z]/.test(joined)) return null
  if (filtered.some((p) => bannedWords.has(p.toLowerCase()))) return null
  if (/^(he|she|they|him|her|them|someone|somebody|anyone|anybody|me|my)$/i.test(joined)) return null
  if (!/[a-z]/i.test(joined)) return null
  if (joined.length > 40) return null
  return joined
}

function cleanPeopleList(values: string[]) {
  const out: string[] = []
  for (const raw of values) {
    for (const piece of raw.split(/\s*(?:,|&|and)\s*/i)) {
      const name = normalizePersonName(piece)
      if (!name) continue
      out.push(name)
    }
  }
  return uniqStrings(out).slice(0, 12)
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function detectHabitMentions(text: string, defs: HabitDef[]) {
  const lower = text.toLowerCase()
  return defs.filter((h) => {
    const name = (h.name ?? '').trim().toLowerCase()
    if (!name) return false
    const rx = new RegExp(`\\b${escapeRegExp(name).replace(/\\s+/g, '\\\\s+')}\\b`, 'i')
    return rx.test(lower)
  })
}

function extractImplicitPlaces(rawText: string) {
  const out: string[] = []
  const banned = new Set(['AM', 'PM', 'Today', 'Tomorrow', 'Yesterday', 'I'])
  for (const m of rawText.matchAll(/\b(?:at|in|to)\s+([A-Z][\w'’.-]*(?:\s+[A-Z][\w'’.-]*){0,4})\b/g)) {
    const name = (m[1] ?? '').trim()
    if (!name) continue
    if (banned.has(name)) continue
    out.push(name)
  }
  const commonPlaceMap: Record<string, string> = {
    gym: 'Gym',
    bank: 'Bank',
    clinic: 'Clinic',
    hospital: 'Hospital',
    er: 'ER',
    home: 'Home',
    work: 'Work',
    office: 'Office',
  }
  for (const m of rawText.matchAll(/\b(?:at|in|to)\s+(?:the\s+)?(gym|bank|clinic|hospital|er|home|work|office)\b/gim)) {
    const key = (m[1] ?? '').trim().toLowerCase()
    const mapped = commonPlaceMap[key]
    if (mapped) out.push(mapped)
  }
  return uniqStrings(out).slice(0, 8)
}

function extractMoneyUsd(rawText: string) {
  const t = rawText.toLowerCase()
  const usd = t.match(/\$\s*(\d+(?:\.\d{1,2})?)/)?.[1]
  if (usd) return Number(usd)
  const dollars = t.match(/\b(\d+(?:\.\d{1,2})?)\s*(?:dollars|bucks)\b/)?.[1]
  if (dollars) return Number(dollars)
  const spend = t.match(/\bspend\s*(?:about\s*)?(\d+(?:\.\d{1,2})?)\b/)?.[1]
  if (spend) return Number(spend)
  return null
}

function extractShoppingItems(rawText: string) {
  const m = rawText.match(/\b(?:buy|get|pick up|grab)\b\s+([^.;\n]+)/i)?.[1]
  if (!m) return []
  const cut = m.split(/\b(?:at|in|to|with|for|tomorrow|today|next|on)\b/i)[0] ?? m
  return uniqStrings(
    cut
      .split(/,|\band\b/i)
      .map((x) => x.trim())
      .filter(Boolean),
  ).slice(0, 12)
}

function buildShoppingNotes(items: string[], moneyUsd: number | null) {
  const lines: string[] = []
  if (items.length) {
    lines.push('| Item | Cost |')
    lines.push('| --- | --- |')
    lines.push(...items.map((x) => `| ${x} |  |`))
  }
  if (moneyUsd != null && Number.isFinite(moneyUsd)) lines.push(`Total budget: $${moneyUsd}`)
  return lines.join('\n')
}

type TranscriptLine = { time: string; text: string; line: string }

function parseTimestampedTranscript(rawText: string | null | undefined) {
  if (!rawText) return []
  const out: TranscriptLine[] = []
  for (const line of rawText.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:[-*]\s*)?\[(\d{1,2}:\d{2})\]\s*(.+)\s*$/)
    if (!match) continue
    out.push({ time: match[1], text: match[2], line })
  }
  return out
}

function isTextInputTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName?.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  return Boolean(el.isContentEditable)
}

function App() {
  const [captures, setCaptures] = useState<InboxCapture[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [authSession, setAuthSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [authError, setAuthError] = useState('')
  const [authStatus, setAuthStatus] = useState('')
  const [authWorking, setAuthWorking] = useState(false)
  const [authDismissed, setAuthDismissed] = useState(false)
  const supabaseConfigured = Boolean(getSupabaseClient())
  const taxonomyRulesRef = useRef<TaxonomyRule[]>([])
  const trackerDefs = useMemo(() => {
    const byKey = new Map<string, TrackerDef>()
    for (const base of TRACKER_LIBRARY) byKey.set(base.key, base)

    for (const e of events) {
      if (e.kind !== 'log') continue
      if (e.trackerKey?.startsWith('habit:')) continue
      const key = (e.trackerKey ?? '').trim().toLowerCase()
      if (key && !byKey.has(key)) byKey.set(key, { key, label: toTitleCase(key) })
      for (const tag of e.tags ?? []) {
        const clean = tag.replace(/^#/, '').trim().toLowerCase()
        if (!clean || clean === 'habit') continue
        if (!byKey.has(clean)) byKey.set(clean, { key: clean, label: toTitleCase(clean) })
      }
    }

    return Array.from(byKey.values()).slice(0, 12)
  }, [events])

	  const [captureOpen, setCaptureOpen] = useState(false)
	  const [captureDraft, setCaptureDraft] = useState('')
	  const [captureInterim, setCaptureInterim] = useState('')
	  const [captureAttachEventId, setCaptureAttachEventId] = useState<string | null>(null)
		  const [captureListening, setCaptureListening] = useState(false)
		  const [captureSaving, setCaptureSaving] = useState(false)
		  const [captureAiStatus, setCaptureAiStatus] = useState<string>('')
		  const [captureError, setCaptureError] = useState<string>('')
  const [captureProgress, setCaptureProgress] = useState<string[]>([])
  const [captureAnchorMs, setCaptureAnchorMs] = useState<number>(() => Date.now())

  useEffect(() => {
    const supabase = getSupabaseClient()
    if (!supabase) {
      setAuthReady(true)
      return
    }
    let mounted = true

    async function runInitialSync() {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      setAuthSession(data.session ?? null)
      setAuthReady(true)
      if (!data.session) return
      await migrateLocalDataToSupabase()
      await pullSupabaseToLocal()
    }

    void runInitialSync()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setAuthSession(session ?? null)
      if (!session) return
      void migrateLocalDataToSupabase().then(() => pullSupabaseToLocal())
    })

    const interval = window.setInterval(() => {
      supabase.auth.getSession().then(({ data }) => {
        if (!data.session) return
        void pullSupabaseToLocal()
      })
    }, 120000)

    return () => {
      mounted = false
      listener?.subscription?.unsubscribe()
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (authSession) {
      setAuthDismissed(false)
    }
  }, [authSession])

  const [agendaDate, setAgendaDate] = useState<Date>(() => new Date())
  const [timelineTagFilters, setTimelineTagFilters] = useState<string[]>([])

  const [selection, setSelection] = useState<Selection>({ kind: 'none' })
  const selectedEventId = selection.kind === 'event' ? selection.id : null
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null)

  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [railLabelsOpen, setRailLabelsOpen] = useState(false)
  const [rightMode, setRightMode] = useState<'details' | 'ai'>('details')
  const [propsCollapsed, setPropsCollapsed] = useState(true)
  const [docOpen, setDocOpen] = useState(false)
  const [docTab, setDocTab] = useState<'notes' | 'transcript'>('notes')
  const [docTranscriptFocus, setDocTranscriptFocus] = useState<string | null>(null)
  const [themePref, setThemePref] = useState<ThemePreference>(() => loadThemePreference())
  const [eventTitleDetail, setEventTitleDetail] = useState<EventTitleDetail>(() => loadDisplaySettings().eventTitleDetail)

  const [tagDraft, setTagDraft] = useState('')
  const [peopleDraft, setPeopleDraft] = useState('')
  const [locationDraft, setLocationDraft] = useState('')
  const [contextDraft, setContextDraft] = useState('')
  const [skillDraft, setSkillDraft] = useState('')
  const [composerTagDraft, setComposerTagDraft] = useState('')
  const [composerPeopleDraft, setComposerPeopleDraft] = useState('')
  const [composerLocationDraft, setComposerLocationDraft] = useState('')
  const [composerListening, setComposerListening] = useState(false)
  const [composerInterim, setComposerInterim] = useState('')

  const [eventComposerOpen, setEventComposerOpen] = useState(false)
  const [eventComposer, setEventComposer] = useState<EventComposerDraft>(() => ({
    title: '',
    startAt: Date.now(),
    endAt: Date.now() + 60 * 60 * 1000,
    kind: 'event',
    allDay: false,
    active: false,
    icon: null,
    color: null,
    tagsRaw: '',
    location: '',
    peopleRaw: '',
    skillsRaw: '',
    character: [],
    category: '',
    subcategory: '',
    importance: 5,
    difficulty: 5,
    estimateMinutesRaw: '60',
    notes: '',
    taskId: null,
    trackerKey: '',
  }))

  const [explorerPinnedOpen, setExplorerPinnedOpen] = useState(true)
  const [explorerPinnedTasksOpen, setExplorerPinnedTasksOpen] = useState(true)
  const [explorerPinnedHabitsOpen, setExplorerPinnedHabitsOpen] = useState(true)
  const [explorerPinnedTrackersOpen, setExplorerPinnedTrackersOpen] = useState(true)
  const [explorerPinnedShortcutsOpen, setExplorerPinnedShortcutsOpen] = useState(true)
  const [pinnedGroupOrder, setPinnedGroupOrder] = useState(() => loadPinnedGroupOrder())
  const [dragPinnedKey, setDragPinnedKey] = useState<string | null>(null)

  useEffect(() => {
    savePinnedGroupOrder(pinnedGroupOrder)
  }, [pinnedGroupOrder])
  const [explorerRecentOpen, setExplorerRecentOpen] = useState(true)
  const [explorerPomoOpen, setExplorerPomoOpen] = useState(true)
  const [explorerTaskQuery, setExplorerTaskQuery] = useState('')
  const [explorerTaskDraft, setExplorerTaskDraft] = useState('')
  const [habitDefs, setHabitDefs] = useState<HabitDef[]>(() => loadHabitDefsFromStorage())

  useEffect(() => {
    const resolved = resolveTheme(themePref)
    applyTheme(resolved)
    saveThemePreference(themePref)
    if (themePref !== 'system') return
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) return
    const onChange = () => applyTheme(resolveTheme('system'))
    if (media.addEventListener) media.addEventListener('change', onChange)
    else media.addListener?.(onChange)
    return () => {
      if (media.removeEventListener) media.removeEventListener('change', onChange)
      else media.removeListener?.(onChange)
    }
  }, [themePref])

  useEffect(() => {
    function onThemeChanged() {
      setThemePref(loadThemePreference())
    }
    window.addEventListener(THEME_CHANGED_EVENT, onThemeChanged)
    return () => window.removeEventListener(THEME_CHANGED_EVENT, onThemeChanged)
  }, [])

  useEffect(() => {
    function onDisplayChanged() {
      setEventTitleDetail(loadDisplaySettings().eventTitleDetail)
    }
    window.addEventListener(DISPLAY_SETTINGS_CHANGED_EVENT, onDisplayChanged)
    return () => window.removeEventListener(DISPLAY_SETTINGS_CHANGED_EVENT, onDisplayChanged)
  }, [])

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Open capture modal
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCaptureOpen(true)
        toast.info('Quick capture opened', { duration: 1500 })
      }

      // Escape: Close modals
      if (e.key === 'Escape') {
        if (captureOpen) {
          setCaptureOpen(false)
        }
        if (eventComposerOpen) {
          setEventComposerOpen(false)
        }
        if (selection.kind !== 'none') {
          setSelection({ kind: 'none' })
        }
      }

      // Cmd/Ctrl + Shift + H: Go to habits
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault()
        openView('habits')
        toast.info('Navigated to Habits', { duration: 1500 })
      }

      // Cmd/Ctrl + Shift + D: Go to dashboard
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        openView('dashboard')
        toast.info('Navigated to Dashboard', { duration: 1500 })
      }

      // Cmd/Ctrl + Shift + R: Go to rewards
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault()
        openView('rewards')
        toast.info('Navigated to Rewards', { duration: 1500 })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [captureOpen, eventComposerOpen, selection])

  useEffect(() => {
    function refreshHabits() {
      setHabitDefs(loadHabitDefsFromStorage())
    }
    window.addEventListener(HABITS_UPDATED_EVENT, refreshHabits)
    window.addEventListener('storage', refreshHabits)
    return () => {
      window.removeEventListener(HABITS_UPDATED_EVENT, refreshHabits)
      window.removeEventListener('storage', refreshHabits)
    }
  }, [])

  useEffect(() => {
    setTagDraft('')
    setPeopleDraft('')
    setLocationDraft('')
  }, [selectedEventId])

  useEffect(() => {
    if (!eventComposerOpen) return
    setComposerTagDraft('')
    setComposerPeopleDraft('')
    setComposerLocationDraft('')
    setComposerListening(false)
    setComposerInterim('')
  }, [eventComposerOpen])

  const [workspace, setWorkspace] = useState<PaneState>(() => {
    const dashId = makeTabId('dashboard')
    const refId = makeTabId('reflections')
    const notesId = makeTabId('notes')
    const tasksId = makeTabId('tasks')
    const calendarId = makeTabId('calendar')
    return {
      tabs: [
        { id: dashId, title: defaultTabTitle('dashboard'), view: 'dashboard' },
        { id: refId, title: defaultTabTitle('reflections'), view: 'reflections' },
        { id: notesId, title: defaultTabTitle('notes'), view: 'notes' },
        { id: tasksId, title: defaultTabTitle('tasks'), view: 'tasks' },
        { id: calendarId, title: defaultTabTitle('calendar'), view: 'calendar' },
      ],
      activeTabId: refId,
    }
  })

  async function refreshAll() {
    const [c, t, e] = await Promise.all([listInboxCaptures(), listTasks(), listEvents()])
    setCaptures(c)
    setTasks(t)
    setEvents(e)
  }

  useEffect(() => {
    void refreshAll()
  }, [])

  useEffect(() => {
    const { rules } = loadTaxonomyRules()
    taxonomyRulesRef.current = rules
    function onRulesChanged() {
      taxonomyRulesRef.current = loadTaxonomyRules().rules
    }
    window.addEventListener(TAXONOMY_RULES_CHANGED_EVENT, onRulesChanged)
    return () => window.removeEventListener(TAXONOMY_RULES_CHANGED_EVENT, onRulesChanged)
  }, [])

  function openCapture(opts?: { attachEventId?: string | null }) {
    const nowMs = Date.now()
    const attached = opts?.attachEventId ? events.find((e) => e.id === opts.attachEventId) ?? null : null
    const activeTab = getActiveTab(workspace)
    let anchorMs = nowMs
    if (attached?.startAt) {
      anchorMs = attached.startAt
    } else if (activeTab?.view === 'calendar') {
      const base = new Date(agendaDate)
      const now = new Date(nowMs)
      base.setHours(now.getHours(), now.getMinutes(), 0, 0)
      anchorMs = base.getTime()
    }
    setCaptureAnchorMs(anchorMs)
    setCaptureProgress([])
    setCaptureAttachEventId(opts?.attachEventId ?? null)
    setCaptureOpen(true)
  }

  async function onUpdateCapture(id: string, rawText: string) {
    await updateCaptureText(id, rawText)
    setCaptures((prev) => prev.map((c) => (c.id === id ? { ...c, rawText } : c)))
  }

  function appendTimestampedLine(existing: string | null | undefined, atMs: number, text: string) {
    const trimmed = text.trim()
    if (!trimmed) return existing ?? ''
    const d = new Date(atMs)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    const line = `- [${hh}:${mm}] ${trimmed}`
    const base = (existing ?? '').trimEnd()
    return base ? `${base}\n${line}` : line
  }

  function noteTaskTokenId(notes?: string | null) {
    const match = notes?.match(/\btoken:([A-Za-z0-9_-]+)\b/)
    return match?.[1] ?? null
  }

  function appendMarkdownBlock(existing: string | null | undefined, block: string) {
    const trimmed = block.trim()
    if (!trimmed) return (existing ?? '').trimEnd()
    const base = (existing ?? '').trimEnd()
    return base ? `${base}\n\n---\n\n${trimmed}` : trimmed
  }

  function inferDifficultyFromText(text: string) {
    const t = text.toLowerCase()
    if (/\bmarathon|half[-\s]?marathon\b/.test(t)) return 10
    const miles = t.match(/\b(\d+(?:\.\d+)?)\s*(mi|mile|miles|km|kilometer|kilometers)\b/)
    if (miles?.[1]) {
      const dist = Number(miles[1])
      if (Number.isFinite(dist)) {
        if (dist >= 10) return 9
        if (dist >= 5) return 8
        if (dist >= 3) return 7
      }
    }
    const reps = t.match(/\b(\d{2,})\s*(pushups|situps|burpees|squats)\b/)
    if (reps?.[1]) {
      const count = Number(reps[1])
      if (Number.isFinite(count)) {
        if (count >= 200) return 9
        if (count >= 100) return 8
        if (count >= 50) return 7
      }
    }
    if (/\b(brutal|exhausting|wrecked|destroyed)\b/.test(t)) return 9
    if (/\b(hard|tough|intense|stressful|rough)\b/.test(t)) return 8
    if (/\b(challenging)\b/.test(t)) return 7
    if (/\b(workout|gym|lift|lifting|run|running|cardio|training)\b/.test(t)) return 6
    if (/\b(normal|okay)\b/.test(t)) return 5
    if (/\b(easy|light|chill)\b/.test(t)) return 3
    return null
  }

  function inferImportanceFromText(text: string) {
    const t = text.toLowerCase()
    if (/\b(critical|urgent|life[-\s]?changing)\b/.test(t)) return 10
    if (/\b(deadline|exam|interview|surgery|presentation)\b/.test(t)) return 9
    if (/\b(important|major|big|huge|milestone)\b/.test(t)) return 8
    if (/\b(work|clinic|patients|meeting|rounds|inpatient)\b/.test(t)) return 7
    if (/\b(good|productive)\b/.test(t)) return 6
    if (/\b(minor|small|trivial)\b/.test(t)) return 3
    return null
  }

  function inferCharacterFromText(text: string, tags: string[] = []) {
    const t = `${text} ${tags.join(' ')}`.toLowerCase()
    const out = new Set<(typeof CHARACTER_KEYS)[number]>()
    if (/\b(workout|gym|lift|weights|strength|pushups|squats)\b/.test(t)) out.add('STR')
    if (/\b(run|cardio|walk|stairs|endurance|long)\b/.test(t)) out.add('CON')
    if (/\b(study|read|reading|learn|code|research|write|writing)\b/.test(t)) out.add('INT')
    if (/\b(meet|meeting|call|talk|chat|social|family|friends)\b/.test(t)) out.add('PER')
    return [...out]
  }

  function pointsForEventAt(ev: CalendarEvent, nowMs: number) {
    const base = basePoints(ev.importance, ev.difficulty)
    if (base <= 0) return 0
    const endAt = ev.active ? nowMs : ev.endAt
    const minutes = Math.max(0, Math.round((endAt - ev.startAt) / (60 * 1000)))
    const mult = multiplierFor(ev.goal ?? null, ev.project ?? null)
    return pointsForMinutes(base, minutes, mult)
  }

  function autoFillEventFromText(ev: CalendarEvent) {
    const base = `${ev.title ?? ''}\n${ev.notes ?? ''}`.trim()
    if (!base) return
    const detectedTags = extractTagTokens(base).map((t) => normalizeHashTag(t))
    const mergedTags = uniqStrings([...(ev.tags ?? []), ...detectedTags].map(normalizeHashTag).filter(Boolean))
    const mentions = extractAtMentions(base).map((m) => m.raw)
    const nextPeople = uniqStrings([...(ev.people ?? []), ...mentions])
    const duration = extractDurationToken(base)
    const nextEstimate = ev.estimateMinutes ?? duration ?? null
    const inferred = inferCategorySubcategoryLoose(base, mergedTags)
    const nextImportance = ev.importance ?? inferImportanceFromText(base) ?? 5
    const nextDifficulty = ev.difficulty ?? inferDifficultyFromText(base) ?? 5
    commitEvent({
      ...ev,
      tags: mergedTags,
      people: nextPeople,
      estimateMinutes: nextEstimate,
      category: ev.category ?? inferred.category ?? null,
      subcategory: ev.subcategory ?? inferred.subcategory ?? null,
      importance: nextImportance,
      difficulty: nextDifficulty,
    })
  }

  function autoFillComposerFromText() {
    const base = `${eventComposer.title ?? ''}\n${eventComposer.notes ?? ''}`.trim()
    if (!base) return
    const detectedTags = extractTagTokens(base).map((t) => normalizeHashTag(t))
    const mergedTags = uniqStrings([...composerTagList, ...detectedTags].map(normalizeHashTag).filter(Boolean))
    const mentions = extractAtMentions(base).map((m) => m.raw)
    const nextPeople = uniqStrings([...composerPeopleList, ...mentions])
    const duration = extractDurationToken(base)
    const inferred = inferCategorySubcategoryLoose(base, mergedTags)
    const nextImportance = eventComposer.importance ?? inferImportanceFromText(base) ?? 5
    const nextDifficulty = eventComposer.difficulty ?? inferDifficultyFromText(base) ?? 5
    setEventComposer((prev) => ({
      ...prev,
      tagsRaw: mergedTags.join(' '),
      peopleRaw: nextPeople.join(', '),
      estimateMinutesRaw: prev.estimateMinutesRaw || (duration ? String(duration) : prev.estimateMinutesRaw),
      category: prev.category || inferred.category || '',
      subcategory: prev.subcategory || inferred.subcategory || '',
      importance: nextImportance,
      difficulty: nextDifficulty,
    }))
  }

	  function openEventComposer(seed: CreateEventSeed) {
	    const startAt = seed.startAt
	    const endAt = Math.max(seed.endAt, startAt + 5 * 60 * 1000)
	    setEventComposer({
	      title: '',
	      startAt,
	      endAt,
	      kind: seed.kind ?? 'event',
	      allDay: false,
	      active: false,
	      icon: null,
	      color: null,
	      tagsRaw: '',
	      location: '',
	      peopleRaw: '',
	      skillsRaw: '',
      character: [],
      category: '',
      subcategory: '',
      importance: 5,
      difficulty: 5,
      estimateMinutesRaw: estimateMinutesFromRange(startAt, endAt),
      notes: '',
      taskId: seed.taskId ?? null,
	      trackerKey: '',
	    })
	    setEventComposerOpen(true)
	  }

  function commitTask(next: Task) {
    setTasks((prev) => prev.map((t) => (t.id === next.id ? next : t)))
    void upsertTask(next)
  }

  function commitEvent(next: CalendarEvent) {
    setEvents((prev) => prev.map((e) => (e.id === next.id ? next : e)))
    void upsertEvent(next)
  }

  function onUpdateEvent(eventId: string, patch: Partial<CalendarEvent>) {
    const ev = events.find((e) => e.id === eventId)
    if (!ev) return
    commitEvent({ ...ev, ...patch })
  }

  function openView(view: WorkspaceViewKey) {
    if (view === 'calendar') {
      setRightCollapsed(false)
      setRightMode('details')
    }
    setWorkspace((p) => {
      const existing = p.tabs.find((t) => t.view === view)
      if (existing) return { ...p, activeTabId: existing.id }
      const id = makeTabId(view)
      const nextTab: WorkspaceTab = { id, title: defaultTabTitle(view), view }
      return { tabs: [...p.tabs, nextTab], activeTabId: id }
    })
  }

  function openHabitReports(habitId: string) {
    try {
      localStorage.setItem(REPORTS_HABIT_ID_KEY, habitId)
    } catch {
      // ignore
    }
    openView('reports')
  }

  function openGoalDetail(goalName: string) {
    setSelectedGoal(goalName)
    setWorkspace((p) => {
      const existing = p.tabs.find((t) => t.view === 'goal-detail')
      const title = goalName || defaultTabTitle('goal-detail')
      if (existing) {
        const nextTabs = p.tabs.map((t) => (t.id === existing.id ? { ...t, title } : t))
        return { tabs: nextTabs, activeTabId: existing.id }
      }
      const id = makeTabId('goal-detail')
      const nextTab: WorkspaceTab = { id, title, view: 'goal-detail' }
      return { tabs: [...p.tabs, nextTab], activeTabId: id }
    })
  }

  function closeTab(id: string) {
    setWorkspace((p) => {
      const nextTabs = p.tabs.filter((t) => t.id !== id)
      const nextActive = p.activeTabId === id ? nextTabs[0]?.id ?? '' : p.activeTabId
      return { tabs: nextTabs.length ? nextTabs : p.tabs, activeTabId: nextActive }
    })
  }

  function onPinnedDragStart(key: string, e: DragEvent) {
    setDragPinnedKey(key)
    e.dataTransfer.setData('text/pinned-group', key)
    e.dataTransfer.effectAllowed = 'move'
  }

  function onPinnedDrop(targetKey: string, e: DragEvent) {
    e.preventDefault()
    const dragged = dragPinnedKey ?? e.dataTransfer.getData('text/pinned-group')
    if (!dragged || dragged === targetKey) return
    const from = pinnedGroupOrder.indexOf(dragged)
    const to = pinnedGroupOrder.indexOf(targetKey)
    if (from < 0 || to < 0) return
    const next = [...pinnedGroupOrder]
    next.splice(from, 1)
    next.splice(to, 0, dragged)
    setPinnedGroupOrder(next)
    setDragPinnedKey(null)
  }

  function onPinnedDragOver(e: DragEvent) {
    e.preventDefault()
  }

  function getActiveTab(pane: PaneState) {
    return pane.tabs.find((t) => t.id === pane.activeTabId) ?? pane.tabs[0]!
  }

  function onCreateTaskFromInput(input: { title: string; tags?: string[] }) {
    void (async () => {
      const task = await createTask({ title: input.title, tags: input.tags })
      setTasks((prev) => [task, ...prev])
      setSelection({ kind: 'task', id: task.id })
      setRightCollapsed(false)
      setRightMode('details')
    })()
  }

  function onToggleTaskComplete(taskId: string) {
    const t = tasks.find((x) => x.id === taskId)
    if (!t) return
    const nextStatus: TaskStatus = t.status === 'done' ? 'todo' : 'done'
    commitTask({ ...t, status: nextStatus })
  }

  function onMoveTaskStatus(taskId: string, status: TaskStatus) {
    const t = tasks.find((x) => x.id === taskId)
    if (!t || t.status === status) return
    commitTask({ ...t, status })
  }

  function onToggleTaskChecklistItem(taskId: string, lineIndex: number) {
    const t = tasks.find((x) => x.id === taskId)
    if (!t) return
    const nextNotes = toggleChecklistLine(t.notes ?? '', lineIndex)
    commitTask({ ...t, notes: nextNotes })

    setEvents((prev) => {
      const changed: CalendarEvent[] = []
      const next = prev.map((e) => {
        if (e.taskId !== taskId) return e
        const updated = { ...e, notes: nextNotes }
        changed.push(updated)
        return updated
      })
      for (const ev of changed) void upsertEvent(ev)
      return next
    })
  }

  function onCreateEvent(input: {
    title: string
    startAt: number
    endAt: number
    kind?: CalendarEvent['kind']
    taskId?: string | null
    parentEventId?: string | null
    allDay?: boolean
    active?: boolean
    tags?: string[]
    contexts?: string[]
    notes?: string | null
    icon?: string | null
    color?: string | null
    estimateMinutes?: number | null
    location?: string | null
    people?: string[]
    skills?: string[]
    character?: string[]
    category?: string | null
    subcategory?: string | null
    importance?: number | null
    difficulty?: number | null
    trackerKey?: string | null
  }) {
    void (async () => {
      const ev = await createEvent({
        title: input.title,
        startAt: input.startAt,
        endAt: input.endAt,
        kind: input.kind,
        taskId: input.taskId,
        parentEventId: input.parentEventId,
        allDay: input.allDay,
        active: input.active,
        tags: input.tags,
        contexts: input.contexts,
        notes: input.notes,
        icon: input.icon,
        color: input.color,
        estimateMinutes: input.estimateMinutes,
        location: input.location,
	        people: input.people,
	        skills: input.skills,
	        character: normalizeCharacterSelection(input.character),
	        category: input.category,
	        subcategory: input.subcategory,
	        importance: input.importance,
	        difficulty: input.difficulty,
	        trackerKey: input.trackerKey,
	      })
      setEvents((prev) => [ev, ...prev])
      setSelection({ kind: 'event', id: ev.id })
      setRightCollapsed(false)
      setRightMode('details')
    })()
  }

  function onMoveEvent(eventId: string, startAt: number, endAt: number) {
    const ev = events.find((e) => e.id === eventId)
    if (!ev) return
    commitEvent({ ...ev, startAt, endAt })
  }

  function onToggleEventComplete(eventId: string) {
    const ev = events.find((e) => e.id === eventId)
    if (!ev) return
    const completedAt = ev.completedAt ? null : Date.now()
    commitEvent({ ...ev, completedAt, kind: (ev.kind ?? 'event') as any })
  }

  async function onStartNoteTask(eventId: string, task: { tokenId: string; title: string; estimateMinutes?: number | null; dueAt?: number | null }) {
    const ev = events.find((e) => e.id === eventId)
    if (!ev || !task.title) return
    const existing = tasks.find(
      (t) => t.parentEventId === eventId && noteTaskTokenId(t.notes ?? '') === task.tokenId
    )
    let target = existing ?? null
    if (!target) {
      const created = await createTaskInEvent({
        eventId,
        title: task.title,
        estimateMinutes: task.estimateMinutes ?? null,
        importance: ev.importance ?? 5,
        difficulty: ev.difficulty ?? 5,
      })
      const withToken = await upsertTask({ ...created, notes: `token:${task.tokenId}` })
      setTasks((prev) => [withToken, ...prev])
      target = withToken
    }
    const started = await startTask(target.id)
    if (started) setTasks((prev) => prev.map((t) => (t.id === started.id ? started : t)))
  }

  async function onSaveCapture() {
    if (captureSaving) return
    const text = captureDraft.trim()
    if (!text) return
    const { frontmatter, body } = extractFrontmatter(text)
    const captureText = body.trim() ? body.trim() : text
    const markdownTokens = collectMarkdownTokens(captureText)
    setCaptureSaving(true)
    setCaptureAiStatus('')
    setCaptureError('')
    setCaptureProgress([])
	    try {

    const attachedCaptureEvent = captureAttachEventId ? events.find((e) => e.id === captureAttachEventId) ?? null : null
    const anchorMs = attachedCaptureEvent?.startAt ?? captureAnchorMs ?? Date.now()

    function normalizeTagName(tag: string) {
      return tag.replace(/^#/, '').trim().toLowerCase()
    }

    function slugifyTag(raw: string) {
      return raw
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    }

    function toTagTokenFromLabel(raw: string) {
      const slug = slugifyTag(raw)
      return slug ? `#${slug}` : ''
    }

    const tokenSeed = Date.now().toString(36)
    let tokenCounter = 0
    function makeTokenId(prefix: string, value: string) {
      const slug = slugifyTag(value) || value.replace(/\s+/g, '-').toLowerCase()
      return `${prefix}_${slug}_${tokenSeed}_${tokenCounter++}`
    }

    function toInlineToken(prefix: string, type: string, value: string) {
      const clean = value.trim()
      if (!clean) return ''
      const id = makeTokenId(type, clean)
      return `${prefix}${clean}{${type}:${id}}`
    }

    function inferTrackerKeyFromText(title: string, tags?: string[] | null) {
      const tagSet = new Set((tags ?? []).map((t) => normalizeTagName(t)))
      const text = `${title} ${[...tagSet].join(' ')}`.toLowerCase()
      const candidates = ['mood', 'energy', 'stress', 'pain', 'sleep', 'workout', 'period', 'bored', 'water']
      for (const key of candidates) {
        if (tagSet.has(key)) return key
      }
      if (/\bmood\b/.test(text)) return 'mood'
      if (/\b(happy|sad|angry|anxious|depressed|excited|great|good|okay|ok)\b/.test(text)) return 'mood'
      if (/\benergy\b/.test(text)) return 'energy'
      if (/\b(tired|exhausted|drained|wired|energized)\b/.test(text)) return 'energy'
      if (/\bstress\b/.test(text)) return 'stress'
      if (/\b(stressed|overwhelmed|anxious)\b/.test(text)) return 'stress'
      if (/\bpain\b/.test(text)) return 'pain'
      if (/\bsleep\b/.test(text)) return 'sleep'
      if (/\bworkout\b/.test(text)) return 'workout'
      if (/\bwater\b|\bhydrat(?:e|ion|ing)?\b/.test(text)) return 'water'
      if (/\bperiod\b/.test(text)) return 'period'
      if (/\bbored\b/.test(text)) return 'bored'
      return null
    }

    const LOG_TRACKER_KEYS = new Set(['mood', 'energy', 'stress', 'pain', 'sleep', 'period', 'bored', 'water'])

    function formatSegmentLine(atMs: number | null, label: string) {
      const cleaned = label.trim()
      if (!cleaned) return ''
      if (atMs == null) return `- ${cleaned}`
      const d = new Date(atMs)
      const hh = String(d.getHours()).padStart(2, '0')
      const mm = String(d.getMinutes()).padStart(2, '0')
      return `- **${hh}:${mm}** - ${cleaned}`
    }

    function maybeSegmentNotes(notes: string | null | undefined, startAt: number, endAt: number) {
      const raw = (notes ?? '').trim()
      if (!raw) return notes ?? ''
      if (/\*\*\d{2}:\d{2}\*\*|\-\s*\[\d{2}:\d{2}\]/.test(raw)) return raw
      if (/^\s*[-*]\s+/m.test(raw)) return raw
      const parts = raw
        .split(/[\n;]+/)
        .map((p) => p.trim())
        .filter(Boolean)
      if (parts.length < 2) return raw
      const span = endAt - startAt
      if (!Number.isFinite(span) || span < 60 * 60 * 1000) return raw
      const step = Math.max(5 * 60 * 1000, Math.floor(span / (parts.length + 1)))
      return parts.slice(0, 5).map((p, i) => formatSegmentLine(startAt + step * (i + 1), p)).join('\n')
    }

    function parseIsoMs(raw?: string | null) {
      if (!raw) return null
      const ms = new Date(raw).getTime()
      return Number.isFinite(ms) ? ms : null
    }

    function segmentLabelForEvent(ev: { title?: string; sourceText?: string }) {
      const title = (ev.title ?? '').trim()
      const lowerTitle = title.toLowerCase()
      const preferSource = !title || lowerTitle === 'event' || lowerTitle === 'work' || lowerTitle === 'clinic'
      const raw = (preferSource ? ev.sourceText ?? '' : title).trim()
      if (!raw) return 'Segment'
      return raw
        .replace(/^(?:i\s+)?(?:did|was|went|got|started|finished|worked on)\s+/i, '')
        .replace(/\s+/g, ' ')
        .trim()
    }

	    const fm = frontmatter ?? {}
	    const llmSettings = loadSettings()
	    const llmKey = (llmSettings.openAiKey ?? '').trim()
	    const llmParseModel = (llmSettings.parseModel ?? llmSettings.chatModel ?? 'gpt-4.1-mini').trim() || 'gpt-4.1-mini'
	    const fmTags = toStringList(fm.tags).map((t) => normalizeTagName(t)).filter(Boolean)
	    const fmPeople = toStringList(fm.people)
	      .map((p) => p.replace(/^@/, '').trim())
	      .filter(Boolean)
	    const fmContexts = toStringList(fm.contexts)
	      .map((c) => c.replace(/^\+/, '').trim())
	      .filter(Boolean)
	    const fmCategory = typeof fm.category === 'string' ? fm.category.trim() : ''
	    const fmSubcategory = typeof fm.subcategory === 'string' ? fm.subcategory.trim() : ''
	    const fmGoal = typeof fm.goal === 'string' ? fm.goal.trim() : ''
	    const fmProject = typeof fm.project === 'string' ? fm.project.trim() : ''
	    const fmLocation = typeof fm.location === 'string' ? fm.location.trim() : ''
	    const fmImportance = typeof fm.importance === 'number' ? fm.importance : null
	    const fmDifficulty = typeof fm.difficulty === 'number' ? fm.difficulty : null
	    const fmDuration = typeof fm.durationMinutes === 'number' ? fm.durationMinutes : typeof fm.duration === 'number' ? fm.duration : null
	    const fmStartAt = typeof fm.startAt === 'string' ? new Date(fm.startAt).getTime() : null
	    const fmEndAt = typeof fm.endAt === 'string' ? new Date(fm.endAt).getTime() : null
	    const fmRules = Array.isArray(fm.rules) ? fm.rules : []
	    const taxonomyRules = fmRules
	      .map((r: any) => ({
	        match: typeof r?.match === 'string' ? r.match : '',
	        category: typeof r?.category === 'string' ? r.category : undefined,
	        subcategory: typeof r?.subcategory === 'string' ? r.subcategory : undefined,
	        tags: Array.isArray(r?.tags) ? r.tags.map((t: any) => String(t)).filter(Boolean) : undefined,
	      }))
	      .filter((r: any) => r.match)
	    const activeRules = taxonomyRules.length ? taxonomyRules : taxonomyRulesRef.current

    const durationOverride = fmDuration ?? extractDurationToken(captureText)
    const importanceOverride = fmImportance ?? extractImportanceToken(captureText)
    const difficultyOverride = fmDifficulty ?? extractDifficultyToken(captureText)
    const categoryOverride = fmCategory ? toTitleCase(fmCategory) : null
    const subcategoryOverride = fmSubcategory ? toTitleCase(fmSubcategory) : null
    const goalOverride = fmGoal ? fmGoal : null
    const projectOverride = fmProject ? fmProject : null
	    const explicitTimeInCapture = hasExplicitTimeRange(captureText)
	    const hasNowSignal = /\b(currently|right now|at the moment)\b/i.test(captureText)

    function ruleTagsForText(text: string, rules: TaxonomyRule[]) {
      const tags: string[] = []
      for (const rule of rules) {
        const rx = rule.match?.trim()
        if (!rx) continue
        try {
          const re = new RegExp(rx, 'i')
          if (!re.test(text)) continue
        } catch {
          continue
        }
        for (const t of rule.tags ?? []) {
          const cleaned = normalizeTagName(String(t))
          if (cleaned) tags.push(cleaned)
        }
      }
      return tags
    }

    const storedMode = llmSettings.mode ?? 'local'
    const llmMode = storedMode
    const shouldTryLlm = llmMode !== 'local' && Boolean(llmKey)
    const allowLocalFallback = llmMode === 'local' || llmMode === 'hybrid'
    if (!llmKey && llmMode !== 'local') {
      setCaptureProgress((p) => [...p, 'AI parsing disabled (no OpenAI key); using local parser'].slice(-10))
    }
    const natural = allowLocalFallback ? parseCaptureNatural(captureText, anchorMs) : { tasks: [], events: [] }
    if (!allowLocalFallback) {
      setCaptureProgress((p) => [...p, 'Parser mode: LLM (no local fallback)'].slice(-10))
    }
    if (allowLocalFallback) {
      setCaptureProgress((p) => [...p, `Local parse: ${natural.events.length} event(s), ${natural.tasks.length} task(s)`].slice(-10))
    }
    const ruleTagNames = ruleTagsForText(captureText, activeRules)
    const tagNames = new Set<string>(
      [
        ...extractTagTokens(captureText),
        ...fmTags,
        ...ruleTagNames,
        ...markdownTokens.tags.map((t) => normalizeTagName(t)),
      ].filter(Boolean),
    )
	    for (const t of natural.tasks) {
	      for (const tag of t.tags ?? []) {
	        const name = normalizeTagName(tag)
	        if (name) tagNames.add(name)
	      }
	    }
	    for (const e of natural.events) {
	      for (const tag of e.tags ?? []) {
	        const name = normalizeTagName(tag)
	        if (name) tagNames.add(name)
	      }
	    }

    const lowerText = captureText.toLowerCase()
    const periodStartSignal =
      /\b(started|starting|got)\b.*\bperiod\b/.test(lowerText) || /\bon (my )?period\b/.test(lowerText) || /\bmy period\b.*\b(started|began)\b/.test(lowerText)
    const periodEndSignal =
      /\bperiod\b.*\b(ended|over|finished)\b/.test(lowerText) || /\b(period ended|period is over|period is done)\b/.test(lowerText)

    const painRatingMatch = lowerText.match(/(\d{1,2})\s*\/\s*10/)
    const painSignal = /\b(pain|hurts|ache|aches|sore)\b/.test(lowerText) || Boolean(painRatingMatch)
    const painHealedSignal = /\b(healed|pain[-\s]?free|no longer hurts|doesn['’]?t hurt anymore|back to normal)\b/.test(lowerText)
    const bodyPartMatch = lowerText.match(/\bmy\s+([a-z][a-z-]{1,20})\s+(hurts|aches|is\s+(sore|aching))\b/)

    const workoutStartSignal = /\b(going to|gonna|start(?:ing)?|begin(?:ning)?|about to)\b.*\b(work\s*out|workout)\b/.test(lowerText)
    const workoutEndSignal = /\b(done|finished|ended|stop(?:ping)?)\b.*\b(work\s*out|workout)\b/.test(lowerText)
    const boredSignal = /\b(bored|boredom|boring)\b/.test(lowerText)
    const moodWordMatch = lowerText.match(/\b(?:i'm|i am|feeling|feel)\s+(?:really\s+)?(happy|great|good|okay|ok|sad|down|depressed|angry|anxious|stressed|meh)\b/)
    const moodWord = moodWordMatch?.[1] ?? null
    const moodScaleMap: Record<string, number> = {
      happy: 8,
      great: 8,
      good: 7,
      okay: 5,
      ok: 5,
      sad: 3,
      down: 3,
      depressed: 2,
      angry: 3,
      anxious: 4,
      stressed: 4,
      meh: 4,
    }
    const moodValue = moodWord ? moodScaleMap[moodWord] ?? null : null

    function ratingNear(keyword: string) {
      const re = new RegExp(`${keyword}[^\\d]{0,6}(\\d{1,2})\\s*(?:/\\s*10)?`)
      const m = lowerText.match(re)
      if (!m?.[1]) return null
      const value = Number(m[1])
      return Number.isFinite(value) ? Math.max(0, Math.min(10, value)) : null
    }
    const energyValue = ratingNear('energy') ?? (/\b(energized|wired)\b/.test(lowerText) ? 8 : /\b(tired|exhausted|drained)\b/.test(lowerText) ? 3 : null)
    const stressValue = ratingNear('stress') ?? (/\b(stressed|overwhelmed|anxious)\b/.test(lowerText) ? 7 : /\b(calm|relaxed)\b/.test(lowerText) ? 2 : null)

    if (periodStartSignal || periodEndSignal) tagNames.add('period')
    if (painSignal || painHealedSignal) tagNames.add('pain')
    if (bodyPartMatch?.[1]) tagNames.add(bodyPartMatch[1])
    if (workoutStartSignal || workoutEndSignal) tagNames.add('workout')
    if (/\b(work|shift)\b/.test(lowerText)) tagNames.add('work')
    if (/\b(clinic|patients|inpatient|rounds)\b/.test(lowerText)) tagNames.add('clinic')
    if (/\b(call|phone)\b/.test(lowerText)) tagNames.add('call')
    if (/\b(bank|loan|mortgage|finance)\b/.test(lowerText)) tagNames.add('finance')
    if (/\b(gym)\b/.test(lowerText)) tagNames.add('gym')
    if (/\b(run|running|ran)\b/.test(lowerText)) tagNames.add('run')
    if (/\b(ate|eat|eating|meal|breakfast|lunch|dinner|snack|protein)\b/.test(lowerText)) tagNames.add('food')
    if (/\b(drink|drank|water|hydration|hydrate)\b/.test(lowerText)) tagNames.add('hydration')
    if (/\b(sleep|nap)\b/.test(lowerText)) tagNames.add('sleep')
    if (boredSignal) tagNames.add('bored')
    if (moodValue != null) tagNames.add('mood')
    if (energyValue != null) tagNames.add('energy')
    if (stressValue != null) tagNames.add('stress')

    const implicitPeople = extractImplicitPeople(captureText)
    const implicitPlaces = extractImplicitPlaces(captureText)
    const implicitMoneyUsd = extractMoneyUsd(captureText)
    const implicitShoppingItems = extractShoppingItems(captureText)
    const trackerTokens = extractTrackerTokens(captureText)
    const habitHits = detectHabitMentions(captureText, habitDefs)
    const localWorkout = parseWorkoutFromText(captureText)
    const localMeal = parseMealFromText(captureText)
    if (implicitMoneyUsd != null && Number.isFinite(implicitMoneyUsd)) tagNames.add('money')
    if (implicitShoppingItems.length) tagNames.add('shopping')

    const allTagTokens = [...tagNames].map((t) => `#${t}`)

    const contextTokens = extractContextTokens(captureText)
    const allContexts = uniqStrings([...contextTokens, ...fmContexts, ...markdownTokens.contexts])

    const mentions = extractAtMentions(captureText)
    const personCandidates: string[] = []
    const placeMentions: string[] = []
    const entityIds: string[] = []
    const entityIdSet = new Set<string>()
    if (fmLocation) placeMentions.push(fmLocation)

    for (const tag of tagNames) {
      const ent = await ensureEntity('tag', tag, `#${tag}`)
      if (!entityIdSet.has(ent.id)) {
        entityIdSet.add(ent.id)
        entityIds.push(ent.id)
      }
    }

    for (const p of fmPeople) {
      if (!p) continue
      personCandidates.push(p)
    }

    for (const p of markdownTokens.people) {
      if (!p) continue
      personCandidates.push(p)
    }

    for (const pl of markdownTokens.places) {
      if (!pl) continue
      placeMentions.push(pl)
    }

    for (const m of mentions) {
      const lower = m.raw.toLowerCase()
      const looksPerson = /\b(with|call|text|dm|email)\b/.test(m.before) || ['mom', 'dad', 'doctor', 'dr', 'alex'].includes(lower)
      if (looksPerson) personCandidates.push(m.raw)
      else placeMentions.push(m.raw)
    }

    for (const p of implicitPeople) {
      if (!p) continue
      personCandidates.push(p)
    }

    for (const pl of implicitPlaces) {
      if (!pl) continue
      placeMentions.push(pl)
    }

    function pickLocationForText(text: string) {
      const hay = text.toLowerCase()
      for (const pl of placeMentions) {
        if (!pl) continue
        if (hay.includes(pl.toLowerCase())) return pl
      }
      return null
    }

    function formatDateOnly(ms: number) {
      const d = new Date(ms)
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    }

    function formatTimeOnly(ms: number) {
      const d = new Date(ms)
      const hh = String(d.getHours()).padStart(2, '0')
      const mm = String(d.getMinutes()).padStart(2, '0')
      return `${hh}:${mm}`
    }

    function summarizeCapture(text: string) {
      const cleaned = text.replace(/\s+/g, ' ').trim()
      if (!cleaned) return 'Capture'
      const sentence = cleaned.split(/[.!?]/)[0] ?? cleaned
      const words = sentence.split(/\s+/).filter(Boolean)
      return words.slice(0, 10).join(' ')
    }

    function buildAttachedCaptureMarkdown(
      nowMs: number,
      opts?: { tasks?: Array<any>; events?: Array<any> },
    ) {
      const d = new Date(nowMs)
      const hh = String(d.getHours()).padStart(2, '0')
      const mm = String(d.getMinutes()).padStart(2, '0')
      const summary = summarizeCapture(captureText)
      const segmentToken = `{seg:${makeTokenId('seg', `${hh}${mm}`)}}`
      const noteToken = `{note:${makeTokenId('note', `${hh}${mm}`)}}`
      const typeTag = (label: string) => toInlineToken('#', 'tag', label)

      const tagTokens = Array.from(tagNames).slice(0, 6).map((t) => toInlineToken('#', 'tag', t))
      const peopleTokens = uniqStrings(personMentions).slice(0, 4).map((p) => toInlineToken('@', 'person', p))
      const contextTokens = allContexts.slice(0, 4).map((c) => toInlineToken('*', 'ctx', c))
      const placeTokens = uniqStrings(placeMentions).slice(0, 3).map((p) => toInlineToken('!', 'loc', p))
      const goalToken = goalOverride ? [toInlineToken('^', 'goal', goalOverride)] : []
      const projectToken = projectOverride ? [toInlineToken('$', 'project', projectOverride)] : []

      const headerTokens = [...tagTokens, ...peopleTokens, ...contextTokens, ...placeTokens, ...goalToken, ...projectToken].filter(Boolean)
      const header = `- **${hh}:${mm}** - ${summary}${headerTokens.length ? ` ${headerTokens.join(' ')}` : ''} ${segmentToken}`
      const noteType = typeTag('note')
      const noteLine = `  - [${hh}:${mm}] ${captureText.trim()} ${noteToken}${noteType ? ` ${noteType}` : ''}`

      const lines = [header, noteLine]

      const taskSource = (opts?.tasks ?? []).filter((t) => typeof t?.title === 'string' && t.title.trim())
      const taskCandidates = taskSource.length
        ? taskSource.map((t) => ({
            title: t.title,
            estimateMinutes: t.estimateMinutes ?? durationOverride ?? null,
            dueAt: t.dueAt ?? (t.dueAtIso ? new Date(t.dueAtIso).getTime() : null),
            goal: t.goal ?? null,
            project: t.project ?? null,
          }))
        : implicitShoppingItems.map((item) => ({
            title: `Buy ${item}`,
            estimateMinutes: 5,
            dueAt: nowMs + 24 * 60 * 60 * 1000,
            goal: null,
            project: null,
          }))

      for (const task of taskCandidates.slice(0, 10)) {
        const meta: string[] = []
        if (task.estimateMinutes != null) meta.push(`est:${Math.round(task.estimateMinutes)}m`)
        if (task.dueAt != null) meta.push(`due:${formatDateOnly(task.dueAt)}`)
        const token = `{task:${makeTokenId('task', task.title)}${meta.length ? ` ${meta.join(' ')}` : ''}}`
        const taskType = typeTag('task')
        const chips = [
          task.goal ? toInlineToken('^', 'goal', task.goal) : '',
          task.project ? toInlineToken('$', 'project', task.project) : '',
        ].filter(Boolean).join(' ')
        lines.push(`  - [ ] ${task.title} ${token}${taskType ? ` ${taskType}` : ''}${chips ? ` ${chips}` : ''}`)
      }

      const eventSource = (opts?.events ?? []).filter((e) => typeof e?.title === 'string' && e.title.trim())
      for (const ev of eventSource.slice(0, 6)) {
        const kind = (ev.kind as any) ?? 'event'
        if (kind === 'log') continue
        const startMs = typeof ev.startAt === 'number' ? ev.startAt : (ev.startAtIso ? new Date(ev.startAtIso).getTime() : NaN)
        const endMs = typeof ev.endAt === 'number' ? ev.endAt : (ev.endAtIso ? new Date(ev.endAtIso).getTime() : NaN)
        if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) continue
        const eventMeta = [
          `date:${formatDateOnly(startMs)}`,
          `start:${formatTimeOnly(startMs)}`,
          `end:${formatTimeOnly(endMs)}`,
        ]
        const eventToken = `{event:${makeTokenId('event', ev.title)} ${eventMeta.join(' ')}}`
        const eventType = typeTag('event')
        const eventTags = Array.isArray(ev.tags) ? ev.tags.map((t: string) => toInlineToken('#', 'tag', String(t).replace(/^#/, ''))) : []
        const eventPeople = Array.isArray(ev.people) ? ev.people.map((p: string) => toInlineToken('@', 'person', String(p))) : []
        const eventLoc = ev.location ? [toInlineToken('!', 'loc', String(ev.location))] : []
        const eventGoal = ev.goal ? [toInlineToken('^', 'goal', String(ev.goal))] : []
        const eventProject = ev.project ? [toInlineToken('$', 'project', String(ev.project))] : []
        const eventChips = [eventType, ...eventTags, ...eventPeople, ...eventLoc, ...eventGoal, ...eventProject].filter(Boolean).join(' ')
        lines.push(`  - [event] ${ev.title} ${eventToken}${eventChips ? ` ${eventChips}` : ''}`)
      }

      if (trackerTokens.length) {
        const trackerLine = trackerTokens
          .slice(0, 4)
          .map((t) => `#${t.name}(${Math.round(t.value)}){tracker:${makeTokenId('tracker', t.name)}}`)
          .join(' ')
        const trackerType = typeTag('tracker')
        lines.push(`  - ${trackerLine}${trackerType ? ` ${trackerType}` : ''}`)
      }

      for (const h of habitHits.slice(0, 4)) {
        const minutes = Math.max(5, h.estimateMinutes ?? 15)
        const habitType = typeTag('habit')
        lines.push(`  - [x] ${h.name} {habit:${makeTokenId('habit', h.name)} value:${minutes}m}${habitType ? ` ${habitType}` : ''}`)
      }

      if (localMeal && localMeal.items?.length) {
        const mealTitle = localMeal.items.length === 1 ? localMeal.items[0].name : localMeal.type ?? 'Meal'
        const mealType = typeTag('meal')
        lines.push(`  - [meal] ${mealTitle} {meal:${makeTokenId('meal', mealTitle)}}${mealType ? ` ${mealType}` : ''}`)
        for (const item of localMeal.items.slice(0, 5)) {
          lines.push(`    - item: ${item.name}`)
        }
      }

      if (localWorkout && localWorkout.exercises?.length) {
        const workoutType = typeTag('workout')
        lines.push(`  - [workout] ${localWorkout.title ?? 'Workout'} {workout:${makeTokenId('workout', 'workout')}}${workoutType ? ` ${workoutType}` : ''}`)
        for (const ex of localWorkout.exercises.slice(0, 4)) {
          lines.push(`    - exercise: ${ex.name}`)
        }
      }

      return lines.join('\n').trim()
    }

    const personMentions = cleanPeopleList(personCandidates)
    for (const p of personMentions) {
      const ent = await ensureEntity('person', p, p)
      if (!entityIdSet.has(ent.id)) {
        entityIdSet.add(ent.id)
        entityIds.push(ent.id)
      }
    }
    for (const pl of uniqStrings(placeMentions)) {
      const ent = await ensureEntity('place', pl, pl)
      if (!entityIdSet.has(ent.id)) {
        entityIdSet.add(ent.id)
        entityIds.push(ent.id)
      }
    }

    const detectedTags = allTagTokens.slice(0, 16).join(' ')
    const detectedPeople = uniqStrings(personMentions).slice(0, 10).join(', ')
    const detectedPlaces = uniqStrings(placeMentions).slice(0, 10).join(', ')
    const detectedContexts = allContexts.slice(0, 10).join(', ')
    if (detectedTags) setCaptureProgress((p) => [...p, `Detected tags: ${detectedTags}`].slice(-10))
    if (detectedPeople) setCaptureProgress((p) => [...p, `Detected people: ${detectedPeople}`].slice(-10))
    if (detectedPlaces) setCaptureProgress((p) => [...p, `Detected places: ${detectedPlaces}`].slice(-10))
    if (detectedContexts) setCaptureProgress((p) => [...p, `Detected contexts: ${detectedContexts}`].slice(-10))

	    const nowMs = anchorMs
	    const attachedMode = Boolean(captureAttachEventId)
	    const note = await addInboxCapture(text, { createdAt: anchorMs, entityIds })
	    setCaptures((prev) => [note, ...prev])
	    setCaptureProgress((p) => [...p, 'Saved transcript note'].slice(-10))

	    let activeForLogsId: string | null | undefined = undefined
	    async function getActiveForLogsId() {
	      if (activeForLogsId !== undefined) return activeForLogsId
	      activeForLogsId = (await findBestActiveEventAt(nowMs))?.id ?? null
	      return activeForLogsId
	    }

    const createdTaskKeys = new Set<string>()
    const createdEventKeys = new Set<string>()
    const makeTaskKey = (title: string) => title.trim().toLowerCase()
    const makeEventKey = (title: string, startAt: number, endAt: number) => {
      const q = 5 * 60 * 1000
      const s = Math.round(startAt / q)
      const d = Math.round(Math.max(q, endAt - startAt) / q)
      return `${title.trim().toLowerCase()}@${s}+${d}`
    }

	    let lastCreated: Selection = { kind: 'none' }
	    let navigateToMs: number | null = null
	    let capturePrimaryEventId: string | null = null
	    let captureHasNonLogEvent = false
	    let createdEventCount = 0
	    let createdLogCount = 0
	    let createdTaskCount = 0
    const createdTrackerKeys = new Set<string>()
    const allowEventCreation = !attachedMode
    const allowTaskCreation = !attachedMode
    if (attachedMode && captureAttachEventId) {
      capturePrimaryEventId = captureAttachEventId
    }

    async function createTrackerLog(opts: { key: string; value?: number | null; label?: string; icon?: IconName | null; color?: string | null }) {
      const trackerKey = opts.key.trim().toLowerCase()
      if (createdTrackerKeys.has(trackerKey)) return null
      const value = typeof opts.value === 'number' && Number.isFinite(opts.value) ? Math.max(0, Math.min(10, Math.round(opts.value))) : null
      const title = value != null ? `${trackerKey}: ${value}/10` : opts.label ?? trackerKey
      const startAt = nowMs
      const endAt = nowMs + 5 * 60 * 1000
      const key = makeEventKey(title, startAt, endAt)
      if (createdEventKeys.has(key)) return null
      const { mergedTags, inferred } = finalizeCategorizedTags({ title, tags: [`#${trackerKey}`] })
      const log = await createEvent({
        title,
        startAt,
        endAt,
        kind: 'log',
        parentEventId: await getActiveForLogsId(),
        tags: mergedTags,
        contexts: allContexts,
        entityIds,
        sourceNoteId: note.id,
        trackerKey,
        icon: opts.icon ?? null,
        color: opts.color ?? null,
        goal: goalOverride,
        project: projectOverride,
        importance: importanceOverride ?? 5,
        difficulty: difficultyOverride ?? 5,
        category: inferred.category,
        subcategory: inferred.subcategory,
      })
      setEvents((prev) => [log, ...prev])
      createdEventKeys.add(makeEventKey(log.title, log.startAt, log.endAt))
      createdTrackerKeys.add(trackerKey)
      createdLogCount += 1
      setCaptureProgress((p) => [...p, `+ log: ${log.title}`].slice(-10))
      return log
    }

    function normalizeHashTag(x: string) {
      const t = x.trim()
      if (!t) return ''
      return t.startsWith('#') ? t : `#${t}`
    }

    function deriveKeywordTag(title: string, category?: string | null, subcategory?: string | null) {
      const stop = new Set(['the', 'a', 'an', 'with', 'and', 'for', 'to', 'from', 'at', 'in', 'on', 'of', 'my'])
      const base = title
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean)
        .filter((w) => w.length > 3 && !stop.has(w))
      const avoid = new Set([category ?? '', subcategory ?? ''].map((x) => x.toLowerCase()))
      const picked = base.find((w) => !avoid.has(w))
      return picked ? toTagTokenFromLabel(picked) : ''
    }

    function buildTagTokens(
      baseTags: string[],
      opts?: { category?: string | null; subcategory?: string | null; title?: string; location?: string | null; includeGlobals?: string[] },
    ) {
      const normalized = new Set((opts?.includeGlobals ?? []).map(normalizeHashTag).filter(Boolean))
      for (const t of baseTags) normalized.add(normalizeHashTag(t))
      const derived: string[] = []
      if (opts?.category) derived.push(toTagTokenFromLabel(opts.category))
      if (opts?.subcategory) derived.push(toTagTokenFromLabel(opts.subcategory))
      if (opts?.location) derived.push(toTagTokenFromLabel(opts.location.split(/[,|/]/)[0] ?? opts.location))
      if (opts?.title) derived.push(deriveKeywordTag(opts.title, opts?.category ?? null, opts?.subcategory ?? null))
      for (const tag of derived) {
        if (!tag) continue
        if (normalized.size >= 5) break
        normalized.add(tag)
      }
      if (normalized.size < 3) normalized.add('#general')
      return Array.from(normalized)
    }

    function mergeWithGlobalTags(
      tags: string[] | null | undefined,
      opts?: { category?: string | null; subcategory?: string | null; title?: string; location?: string | null; includeGlobals?: boolean },
    ) {
      const includeGlobals = opts?.includeGlobals ? allTagTokens : []
      return buildTagTokens(tags ?? [], { ...opts, includeGlobals })
    }

    function finalizeCategorizedTags(opts: {
      title: string
      tags?: string[] | null
      current?: { category?: string | null; subcategory?: string | null }
      location?: string | null
      includeGlobals?: boolean
    }) {
      const baseTags = [...(opts.tags ?? [])]
      const inferred = resolveCategory(opts.title, baseTags, opts.current, activeRules.length ? activeRules : undefined)
      const mergedTags = mergeWithGlobalTags(baseTags, {
        category: inferred.category,
        subcategory: inferred.subcategory,
        title: opts.title,
        location: opts.location ?? null,
        includeGlobals: opts.includeGlobals,
      })
      return { mergedTags, inferred }
    }

  function inferCategorySubcategory(title: string, tags: string[], baseRules?: Array<{ match: string; category?: string; subcategory?: string; tags?: string[] }>) {
    const t = title.toLowerCase()
    const tagSet = new Set(tags.map((x) => x.replace(/^#/, '').toLowerCase()))

    let category: string | null = null
    let subcategory: string | null = null

    if (baseRules?.length) {
      for (const rule of baseRules) {
        const rx = rule.match?.trim()
        if (!rx) continue
        try {
          const re = new RegExp(rx, 'i')
          if (!re.test(title)) continue
          if (rule.category && !category) category = rule.category
          if (rule.subcategory && !subcategory) subcategory = rule.subcategory
          if (rule.tags?.length) {
            for (const tag of rule.tags) tagSet.add(tag.replace(/^#/, '').toLowerCase())
          }
          break
        } catch {
          // ignore malformed rule
        }
      }
    }

    for (const rawTag of tags) {
      const cleaned = rawTag.replace(/^#/, '').trim()
      if (!cleaned || !cleaned.includes('/')) continue
      const [cat, sub] = cleaned.split('/', 2)
		        if (cat) category = toTitleCase(cat)
		        if (sub) subcategory = toTitleCase(sub)
		        break
		      }

      const workoutMatch = tagSet.has('workout') || /\b(workout|gym|lift|lifting|run|cardio|yoga|training)\b/.test(t)
      if (workoutMatch) {
        category = 'Health'
        subcategory = subcategory ?? 'Workout'
      }

		      if (!category && (tagSet.has('work') || /\b(work|shift)\b/.test(t))) category = 'Work'
      if (tagSet.has('clinic') || /\b(clinic|patients|rounds|inpatient)\b/.test(t)) {
        category = category ?? 'Work'
        subcategory = 'Clinic'
      }
      if (tagSet.has('meeting') || /\b(meeting|conference|rounds)\b/.test(t)) {
        category = category ?? 'Work'
        subcategory = subcategory ?? 'Meeting'
      }
      if (tagSet.has('surgery') || /\b(surgery)\b/.test(t)) {
        category = category ?? 'Work'
        subcategory = 'Surgery'
      }
		      if (tagSet.has('didactics') || /\b(didactics)\b/.test(t)) {
		        category = category ?? 'Work'
		        subcategory = subcategory ?? 'Didactics'
		      }
		      if (tagSet.has('study') || /\b(study|lecture|reading)\b/.test(t)) {
		        category = category ?? 'Learning'
		        subcategory = subcategory ?? (/\b(read|reading)\b/.test(t) ? 'Reading' : 'Practice')
		      }
		      if (tagSet.has('workout') || /\b(workout|gym|lift|lifting|run|cardio|yoga|training)\b/.test(t)) {
		        category = 'Health'
		        subcategory = subcategory ?? 'Workout'
		      }
		      if (tagSet.has('sleep') || /\b(sleep|nap)\b/.test(t)) {
		        category = category ?? 'Health'
		        subcategory = subcategory ?? 'Sleep'
		      }
      if (tagSet.has('shopping') || /\b(grocery|shopping|store|errand)\b/.test(t)) {
        category = category ?? 'Personal'
        subcategory = subcategory ?? (/\b(grocery|groceries)\b/.test(t) ? 'Groceries' : 'Errands')
      }
      if (tagSet.has('morning') || /\b(get ready|morning routine|prep|ready for work)\b/.test(t)) {
        category = category ?? 'Personal'
        subcategory = subcategory ?? 'Morning Routine'
      }
      if (tagSet.has('food') || /\b(dinner|lunch|breakfast|meal|restaurant|food)\b/.test(t)) {
        category = category ?? 'Food'
        subcategory = subcategory ?? (/\b(restaurant|dinner out|lunch out|eat out)\b/.test(t) ? 'Restaurant' : 'Meal')
      }
      if (tagSet.has('walk') || /\b(walk|stroll)\b/.test(t)) {
        category = category ?? 'Personal'
        subcategory = subcategory ?? 'Health'
      }
		      if (tagSet.has('transport') || /\b(transport|drive|driving|commute|flight|fly|uber|lyft|train|bus|parking)\b/.test(t)) {
		        category = category ?? 'Transport'
		        if (/\b(flight|fly|airport)\b/.test(t)) subcategory = subcategory ?? 'Flight'
		        else if (/\b(train|bus|transit|subway)\b/.test(t)) subcategory = subcategory ?? 'Transit'
		        else if (/\b(parking)\b/.test(t)) subcategory = subcategory ?? 'Parking'
		        else subcategory = subcategory ?? 'Driving'
		      }
		      if (tagSet.has('finance') || /\b(bank|finance|mortgage|loan|bill|budget|expense)\b/.test(t)) {
		        category = category ?? 'Finance'
		        subcategory = subcategory ?? (/\b(bank)\b/.test(t) ? 'Banking' : /\b(bill|bills)\b/.test(t) ? 'Bills' : 'Budget')
		      }
		      // Job applications
		      if (/\b(job|application|apply|resume|interview|hiring|career)\b/.test(t)) {
		        category = category ?? 'Work'
		        subcategory = subcategory ?? 'Job Applications'
		      }
		      // Rent payment
		      if (/\b(rent|landlord|lease|tenant)\b/.test(t)) {
		        category = category ?? 'Finance'
		        subcategory = subcategory ?? 'Rent'
		      }
		      // Skincare/self-care
		      if (/\b(microneedle|skincare|facial|derma|beauty|skin)\b/.test(t)) {
		        category = category ?? 'Personal'
		        subcategory = subcategory ?? 'Skincare'
		      }
		      // House chores/cleaning
		      if (/\b(clean|cleaning|chore|chores|tidy|vacuum|laundry|dishes)\b/.test(t)) {
		        category = category ?? 'Personal'
		        subcategory = subcategory ?? 'Chores'
		      }
		      // Costco/specific stores
		      if (/\b(costco|walmart|target|trader joe|whole foods|safeway)\b/i.test(t)) {
		        category = category ?? 'Personal'
		        subcategory = subcategory ?? 'Errands'
		      }

		      // Fall back to the starter taxonomy (keeps categories consistent).
		      if (category) {
		        const categoryLower = category.toLowerCase()
		        const canonical = categoriesFromStarter().find((c) => c.toLowerCase() === categoryLower)
		        if (canonical) category = canonical
		      }
		      if (category && subcategory) {
		        const subs = subcategoriesFromStarter(category)
		        const subLower = subcategory.toLowerCase()
		        const canonicalSub = subs.find((s) => s.toLowerCase() === subLower)
		        if (canonicalSub) subcategory = canonicalSub
		      }

		      return { category, subcategory }
		    }

    function resolveCategory(
      title: string,
      tags: string[],
      current?: { category?: string | null; subcategory?: string | null },
      rules?: Array<{ match: string; category?: string; subcategory?: string; tags?: string[] }>,
    ) {
      const inferred = inferCategorySubcategory(title, tags, rules)
      const fallbackCategory = categoryOverride ?? current?.category ?? inferred.category ?? 'Personal'
      let fallbackSubcategory = subcategoryOverride ?? current?.subcategory ?? inferred.subcategory ?? null
      if (!fallbackSubcategory) {
        const categoryLower = fallbackCategory.toLowerCase()
        if (/\b(get ready|morning routine|prep|ready for work)\b/.test(title.toLowerCase())) {
          fallbackSubcategory = 'Morning Routine'
        } else if (categoryLower === 'food') {
          fallbackSubcategory = 'Meal'
        } else {
          fallbackSubcategory = 'General'
        }
      }
      recordTaxonomyEntry(fallbackCategory, fallbackSubcategory)
      return { category: fallbackCategory, subcategory: fallbackSubcategory }
    }

    function isWorkLikeParsedEvent(ev: ParsedEvent) {
      const text = `${ev.title ?? ''} ${ev.sourceText ?? ''}`.toLowerCase()
      const tagSet = new Set((ev.tags ?? []).map(normalizeTagName))
      return tagSet.has('work') || tagSet.has('clinic') || /\b(work|clinic|patients|inpatient|rounds|didactics)\b/.test(text)
    }

    function isStandaloneUntimed(ev: ParsedEvent) {
      const text = `${ev.title ?? ''} ${ev.sourceText ?? ''}`.toLowerCase()
      const tagSet = new Set((ev.tags ?? []).map(normalizeTagName))
      if (tagSet.has('food') || /\b(dinner|lunch|breakfast|meal|restaurant)\b/.test(text)) return true
      if (tagSet.has('shopping') || /\b(grocery|shopping|store|errand)\b/.test(text)) return true
      if (tagSet.has('finance') || /\b(bank|finance|bill|budget)\b/.test(text)) return true
      if (tagSet.has('transport') || /\b(transport|drive|driving|commute|flight|uber|lyft|train|bus)\b/.test(text)) return true
      return false
    }

    function appendSegment(notes: string | null | undefined, line: string) {
      if (!line) return notes ?? ''
      return notes && notes.trim().length ? `${notes}\n${line}` : line
    }

    function groupParsedEvents(parsed: ParsedEvent[]) {
      const output: ParsedEvent[] = []
      const workCandidates = parsed.filter((e) => Boolean(e.explicitTime) && (e.kind ?? 'event') === 'event' && isWorkLikeParsedEvent(e))
      const workBlock =
        workCandidates.length >= 2
          ? ({
              title: 'Work',
              startAt: Math.min(...workCandidates.map((e) => e.startAt)),
              endAt: Math.max(...workCandidates.map((e) => e.endAt)),
              kind: 'event',
              notes: '',
              estimateMinutes: Math.round(
                (Math.max(...workCandidates.map((e) => e.endAt)) - Math.min(...workCandidates.map((e) => e.startAt))) / (60 * 1000),
              ),
              explicitTime: true,
              sourceText: 'work block',
            } as ParsedEvent)
          : null
      let workBlockInserted = false
      let currentExplicit: ParsedEvent | null = null

      for (const ev of parsed) {
        const kind = (ev.kind ?? 'event') as CalendarEvent['kind']
        const inWorkWindow =
          Boolean(workBlock) &&
          (ev.kind ?? 'event') === 'event' &&
          ev.startAt >= workBlock!.startAt &&
          ev.startAt < workBlock!.endAt

        if (workBlock && inWorkWindow) {
          if (!workBlockInserted) {
            output.push(workBlock)
            workBlockInserted = true
          }
          currentExplicit = workBlock
          const line = formatSegmentLine(ev.startAt ?? null, segmentLabelForEvent(ev))
          workBlock.notes = appendSegment(workBlock.notes ?? '', line)
          continue
        }

        if (kind === 'log' || kind === 'episode') {
          output.push(ev)
          continue
        }
        if (ev.explicitTime) {
          output.push(ev)
          currentExplicit = ev
          continue
        }
        if (currentExplicit && !isStandaloneUntimed(ev)) {
          const atMs = ev.explicitTime ? ev.startAt : currentExplicit.startAt
          const line = formatSegmentLine(atMs ?? null, segmentLabelForEvent(ev))
          currentExplicit.notes = appendSegment(currentExplicit.notes ?? '', line)
          continue
        }
        output.push(ev)
      }
      return output
    }

	    function applyDurationOverride(startAt: number, endAt: number, kind: CalendarEvent['kind']) {
	      if (!durationOverride || explicitTimeInCapture || kind === 'episode' || kind === 'log') return { startAt, endAt }
	      const nextEnd = startAt + Math.max(5, durationOverride) * 60 * 1000
	      return { startAt, endAt: Math.max(endAt, nextEnd) }
	    }

	    async function maybeCreateTaskCalendarBlock(opts: { task: Task; tags: string[]; location?: string | null; people?: string[]; contexts?: string[]; entityIds: string[] }) {
	      const startAt = opts.task.scheduledAt
	      if (!startAt) return null
	      const estimateMinutes = opts.task.estimateMinutes ?? durationOverride ?? 60
	      const endAt = startAt + Math.max(5, estimateMinutes) * 60 * 1000
	      const key = makeEventKey(opts.task.title, startAt, endAt)
	      if (createdEventKeys.has(key)) return null

	      const ev = await createEvent({
	        title: opts.task.title,
	        startAt,
	        endAt,
	        kind: 'task',
	        taskId: opts.task.id,
	        parentEventId: opts.task.parentEventId ?? null,
	        tags: opts.tags,
	        contexts: opts.contexts ?? opts.task.contexts ?? [],
	        notes: opts.task.notes ?? '',
	        location: opts.location ?? null,
	        people: opts.people ?? [],
	        category: opts.task.category ?? null,
	        subcategory: opts.task.subcategory ?? null,
	        goal: opts.task.goal ?? goalOverride ?? null,
	        project: opts.task.project ?? projectOverride ?? null,
	        entityIds: opts.entityIds,
	        sourceNoteId: opts.task.sourceNoteId ?? null,
	      })
      setEvents((prev) => [ev, ...prev])
      createdEventKeys.add(makeEventKey(ev.title, ev.startAt, ev.endAt))
      setCaptureProgress((p) => [...p, `+ task block: ${ev.title}`].slice(-10))
      return ev
    }

    // Optional: LLM-backed parsing (uses the key + parser model stored in Settings).
    let llmSucceeded = false
    let llmError: string | null = null
    let llm: Awaited<ReturnType<typeof parseCaptureWithBlocksLlm>> | null = null
    if (!llmKey && llmMode === 'llm') {
      setCaptureError('OpenAI key is required for LLM mode. Add it in Settings and click Save.')
      setCaptureSaving(false)
      return
    }
    if (shouldTryLlm) {
      try {
        setCaptureAiStatus(`AI parsing (${llmParseModel})…`)
        llm = await parseCaptureWithBlocksLlm({ apiKey: llmKey, model: llmParseModel, text: captureText, anchorMs })
        setCaptureProgress((p) => [...p, `AI parsed (${llm.tasks.length} task(s), ${llm.events.length} event(s), ${llm.workouts.length} workout(s))`].slice(-10))
        llmSucceeded = (llm.tasks.length + llm.events.length + llm.workouts.length + llm.meals.length) > 0
        if (!llmSucceeded) {
          const emptyMsg = allowLocalFallback ? 'AI returned empty; using local parser' : 'AI returned empty; local parsing is disabled'
          setCaptureProgress((p) => [...p, emptyMsg].slice(-10))
        }

        // Pull any explicit people/places from the LLM result into entities + fallbacks.
        const llmPeople = uniqStrings([
          ...llm.tasks.flatMap((t) => (t.people ?? []).filter(Boolean)),
          ...llm.events.flatMap((e) => (e.people ?? []).filter(Boolean)),
        ]).slice(0, 16)
        const llmPlaces = uniqStrings([
          ...llm.tasks.map((t) => t.location).filter(Boolean) as string[],
          ...llm.events.map((e) => e.location).filter(Boolean) as string[],
        ]).slice(0, 16)
        const cleanedLlmPeople = cleanPeopleList(llmPeople)
        for (const p of cleanedLlmPeople) {
          const ent = await ensureEntity('person', p, p)
          if (!entityIdSet.has(ent.id)) {
            entityIdSet.add(ent.id)
            entityIds.push(ent.id)
          }
          personMentions.push(p)
        }
        for (const pl of llmPlaces) {
          const ent = await ensureEntity('place', pl, pl)
          if (!entityIdSet.has(ent.id)) {
            entityIdSet.add(ent.id)
            entityIds.push(ent.id)
          }
          placeMentions.push(pl)
        }
        if (cleanedLlmPeople.length || llmPlaces.length) {
          await updateCaptureEntityIds(note.id, entityIds)
          setCaptures((prev) => prev.map((c) => (c.id === note.id ? { ...c, entityIds } : c)))
        }

	        const overrideTimes = Number.isFinite(fmStartAt ?? NaN) && Number.isFinite(fmEndAt ?? NaN) && llm.events.length === 1 && llm.tasks.length === 0

	        for (const e of llm.events) {
	          if (!allowEventCreation) continue
	          let startAt = new Date(e.startAtIso).getTime()
	          let endAt = new Date(e.endAtIso).getTime()
          if (!Number.isFinite(startAt) || !Number.isFinite(endAt)) continue
          if (overrideTimes && fmStartAt != null && fmEndAt != null) {
            startAt = fmStartAt
            endAt = fmEndAt
          }
          const shouldForceNow =
            !overrideTimes && hasNowSignal && !explicitTimeInCapture && llm.events.length === 1 && llm.tasks.length === 0 && !e.allDay
          if (shouldForceNow) {
            startAt = anchorMs
            const fallbackMinutes = e.estimateMinutes ?? durationOverride ?? 60
            endAt = startAt + Math.max(5, fallbackMinutes) * 60 * 1000
          }
          const baseText = `${e.title ?? ''}\n${e.notes ?? ''}\n${(e.tags ?? []).join(' ')}`.trim()
          const locationHint = e.location ?? pickLocationForText(baseText)
          const autoImportance = e.importance ?? importanceOverride ?? inferImportanceFromText(baseText) ?? 5
          const autoDifficulty = e.difficulty ?? difficultyOverride ?? inferDifficultyFromText(baseText) ?? 5
          const autoCharacter = normalizeCharacterSelection(e.character ?? inferCharacterFromText(baseText, e.tags ?? []))
          const { mergedTags, inferred } = finalizeCategorizedTags({ title: e.title, tags: e.tags ?? [], location: locationHint })
          const rawKind = (e.kind as any) ?? 'event'
          const inferredTrackerKey = e.trackerKey ?? inferTrackerKeyFromText(e.title, e.tags ?? [])
          const kind = rawKind === 'log' || (inferredTrackerKey && LOG_TRACKER_KEYS.has(inferredTrackerKey)) ? 'log' : rawKind
          const times = applyDurationOverride(startAt, endAt, kind)
            const ev = await createEvent({
            title: e.title,
            startAt: times.startAt,
            endAt: Math.max(times.endAt, times.startAt + 5 * 60 * 1000),
            kind,
            allDay: Boolean(e.allDay),
            active: Boolean(e.active) || shouldForceNow,
            parentEventId: kind === 'log' ? await getActiveForLogsId() : null,
            tags: mergedTags,
            contexts: allContexts,
            entityIds,
            sourceNoteId: note.id,
            icon: (e.icon as any) ?? null,
            color: e.color ?? null,
            category: inferred.category,
            subcategory: inferred.subcategory,
            goal: e.goal ?? goalOverride ?? null,
            project: e.project ?? projectOverride ?? null,
            trackerKey: inferredTrackerKey ?? null,
            importance: autoImportance,
            difficulty: autoDifficulty,
          })
          const costLine = typeof e.costUsd === 'number' && Number.isFinite(e.costUsd) ? `\nBudget: $${e.costUsd}` : ''
          const nextNotes = e.notes ?? ev.notes
          const segmentedNotes = maybeSegmentNotes(nextNotes, times.startAt, times.endAt)
          const next = await upsertEvent({
            ...ev,
            notes: (segmentedNotes ?? ev.notes) + costLine,
            category: inferred.category,
            subcategory: inferred.subcategory,
            estimateMinutes: e.estimateMinutes ?? durationOverride ?? (Boolean(e.allDay) || kind === 'episode' ? null : Math.round((times.endAt - times.startAt) / (60 * 1000))),
            location: locationHint ?? null,
            people: cleanPeopleList(e.people ?? uniqStrings(personMentions)),
            skills: e.skills ?? [],
            character: autoCharacter,
            importance: autoImportance ?? ev.importance ?? 5,
            difficulty: autoDifficulty ?? ev.difficulty ?? 5,
            goal: e.goal ?? ev.goal ?? goalOverride ?? null,
            project: e.project ?? ev.project ?? projectOverride ?? null,
            contexts: uniqStrings([...(ev.contexts ?? []), ...allContexts]),
          })
          setEvents((prev) => [next, ...prev])
          createdEventKeys.add(makeEventKey(next.title, next.startAt, next.endAt))
          if (next.kind === 'log') {
            createdLogCount += 1
            if (next.trackerKey) createdTrackerKeys.add(next.trackerKey)
          }
          else createdEventCount += 1
          if (next.active && next.kind !== 'log' && next.kind !== 'episode') activeForLogsId = next.id
          setCaptureProgress((p) => [...p, `+ ${next.kind}: ${next.title}`].slice(-10))

	          if (next.kind !== 'log') {
	            captureHasNonLogEvent = true
	            if (!capturePrimaryEventId) capturePrimaryEventId = next.id
	            lastCreated = { kind: 'event', id: next.id }
	            navigateToMs = next.startAt
	          }
	        }

        for (const t of llm.tasks) {
          if (!allowTaskCreation) continue
          const { mergedTags, inferred } = finalizeCategorizedTags({ title: t.title, tags: t.tags ?? [] })
          const taskBase = `${t.title ?? ''}\n${t.notes ?? ''}\n${(t.tags ?? []).join(' ')}`.trim()
          const autoImportance = t.importance ?? importanceOverride ?? inferImportanceFromText(taskBase) ?? 5
          const autoDifficulty = t.difficulty ?? difficultyOverride ?? inferDifficultyFromText(taskBase) ?? 5
          let notes = (t.notes ?? '').trim()
          if (!notes && implicitShoppingItems.length && (/\b(shop|shopping|grocery|store|buy)\b/i.test(t.title) || mergedTags.includes('#shopping'))) {
            notes = buildShoppingNotes(implicitShoppingItems, typeof t.costUsd === 'number' ? t.costUsd : implicitMoneyUsd)
          }
          const task = await createTask({
            title: t.title,
            status: (t.status as any) ?? 'todo',
            tags: mergedTags,
            contexts: allContexts,
            entityIds,
            parentEventId: capturePrimaryEventId,
            category: inferred.category,
            subcategory: inferred.subcategory,
            goal: t.goal ?? goalOverride ?? null,
            project: t.project ?? projectOverride ?? null,
            estimateMinutes: t.estimateMinutes ?? durationOverride ?? 25,
            importance: autoImportance,
            difficulty: autoDifficulty,
            sourceNoteId: note.id,
          })
          const next = await upsertTask({
            ...task,
            parentEventId: task.parentEventId ?? capturePrimaryEventId,
            category: inferred.category,
            subcategory: inferred.subcategory,
            notes: notes || task.notes || '',
            estimateMinutes: t.estimateMinutes ?? durationOverride ?? task.estimateMinutes ?? 25,
            status: (t.status as any) ?? task.status,
            dueAt: parseIsoMs(t.dueAtIso) ?? task.dueAt ?? null,
            scheduledAt: parseIsoMs(t.scheduledAtIso) ?? task.scheduledAt ?? null,
            goal: t.goal ?? task.goal ?? goalOverride ?? null,
            project: t.project ?? task.project ?? projectOverride ?? null,
            importance: autoImportance ?? task.importance ?? 5,
            difficulty: autoDifficulty ?? task.difficulty ?? 5,
            contexts: uniqStrings([...(task.contexts ?? []), ...allContexts]),
          })
	          setTasks((prev) => [next, ...prev])
	          createdTaskCount += 1
	          createdTaskKeys.add(makeTaskKey(next.title))
	          setCaptureProgress((p) => [...p, `+ Task: ${next.title}`].slice(-10))

	          if (!captureHasNonLogEvent) {
	            lastCreated = { kind: 'task', id: next.id }
	            if (navigateToMs == null && next.scheduledAt) navigateToMs = next.scheduledAt
	          }

          const block = await maybeCreateTaskCalendarBlock({
            task: next,
            tags: mergedTags,
            location: t.location ?? pickLocationForText(taskBase),
            people: cleanPeopleList(t.people ?? uniqStrings(personMentions)),
            contexts: allContexts,
            entityIds,
          })
	          if (block && !captureHasNonLogEvent) {
	            lastCreated = { kind: 'event', id: block.id }
	            navigateToMs = block.startAt
	          }
	        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        llmError = msg
        setCaptureError(msg)
        const failMsg = allowLocalFallback
          ? `AI parse failed; using local parser (${msg.slice(0, 80)})`
          : `AI parse failed; local parsing is disabled (${msg.slice(0, 80)})`
        setCaptureProgress((p) => [...p, failMsg].slice(-10))
      } finally {
        setCaptureAiStatus('')
      }
    }
    if (!llmKey) setCaptureProgress((p) => [...p, 'AI parsing disabled (no OpenAI key set in Settings)'].slice(-10))

    // Tracker token logs (#mood(7), #energy(8), etc.) are always recorded.
    // If LLM also produced logs, the createdEventKeys de-dupe prevents duplicates.
    for (const tok of trackerTokens.slice(0, 10)) {
      const title = `${tok.name}: ${tok.value}`
      const startAt = nowMs
      const endAt = nowMs + 5 * 60 * 1000
      const key = makeEventKey(title, startAt, endAt)
      if (createdEventKeys.has(key)) continue
      const { mergedTags, inferred } = finalizeCategorizedTags({ title, tags: [`#${tok.name}`] })
      const ev = await createEvent({
        title,
        startAt,
        endAt,
        kind: 'log',
        parentEventId: await getActiveForLogsId(),
        tags: mergedTags,
        contexts: allContexts,
        entityIds,
        sourceNoteId: note.id,
        category: inferred.category,
        subcategory: inferred.subcategory,
        goal: goalOverride,
        project: projectOverride,
        importance: importanceOverride ?? 5,
        difficulty: difficultyOverride ?? 5,
        trackerKey: tok.name,
      })
      setEvents((prev) => [ev, ...prev])
      createdEventKeys.add(makeEventKey(ev.title, ev.startAt, ev.endAt))
      createdTrackerKeys.add(tok.name)
      createdLogCount += 1
      setCaptureProgress((p) => [...p, `+ log: ${ev.title}`].slice(-10))
    }

    const fmTrackersRaw = Array.isArray(fm.trackers) ? fm.trackers : typeof fm.trackers === 'string' ? [fm.trackers] : []
    for (const raw of fmTrackersRaw.slice(0, 10)) {
      const line = String(raw).trim()
      if (!line) continue
      const m = line.match(/^([a-zA-Z][\\w/-]*)\\s*[:=]\\s*([-+]?\\d*\\.?\\d+)/)
      if (!m?.[1] || !m?.[2]) continue
      const name = m[1]
      const value = Number(m[2])
      if (!Number.isFinite(value)) continue
      const title = `${name}: ${value}`
      const startAt = nowMs
      const endAt = nowMs + 5 * 60 * 1000
      const key = makeEventKey(title, startAt, endAt)
      if (createdEventKeys.has(key)) continue
      const { mergedTags, inferred } = finalizeCategorizedTags({ title, tags: [`#${name}`] })
      const ev = await createEvent({
        title,
        startAt,
        endAt,
        kind: 'log',
        parentEventId: await getActiveForLogsId(),
        tags: mergedTags,
        contexts: allContexts,
        entityIds,
        sourceNoteId: note.id,
        category: inferred.category,
        subcategory: inferred.subcategory,
        goal: goalOverride,
        project: projectOverride,
        importance: importanceOverride ?? 5,
        difficulty: difficultyOverride ?? 5,
        trackerKey: name,
      })
      setEvents((prev) => [ev, ...prev])
      createdEventKeys.add(makeEventKey(ev.title, ev.startAt, ev.endAt))
      createdTrackerKeys.add(name)
      createdLogCount += 1
      setCaptureProgress((p) => [...p, `+ log: ${ev.title}`].slice(-10))
    }

    function startOfDayMs(ms: number) {
      const d = new Date(ms)
      d.setHours(0, 0, 0, 0)
      return d.getTime()
    }

    const dayStartMs = startOfDayMs(nowMs)
    const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000

    // Explicit episode/session signals (explicit start + explicit end).
    if (periodStartSignal && !periodEndSignal) {
      const activePeriod = await findActiveEpisode('period')
      if (!activePeriod) {
        const { mergedTags, inferred } = finalizeCategorizedTags({ title: 'Period', tags: ['#period'] })
        const ev = await createEvent({
          title: 'Period',
          startAt: dayStartMs,
          endAt: dayEndMs,
          allDay: true,
          active: true,
          kind: 'episode',
          trackerKey: 'period',
          icon: 'heart',
          color: '#ef4444',
          tags: mergedTags,
          contexts: allContexts,
          entityIds,
          sourceNoteId: note.id,
          goal: goalOverride,
          project: projectOverride,
          importance: importanceOverride ?? 5,
          difficulty: difficultyOverride ?? 5,
          category: inferred.category,
          subcategory: inferred.subcategory,
        })
        setEvents((prev) => [ev, ...prev])
      }
    }
    if (periodEndSignal) {
      const activePeriod = await findActiveEpisode('period')
      if (activePeriod) {
        const next = await upsertEvent({ ...activePeriod, endAt: dayEndMs, active: false })
        commitEvent(next)
      }
    }

    if (painRatingMatch || painHealedSignal) {
      const bodyTag = bodyPartMatch?.[1] ? `#${bodyPartMatch[1]}` : null
      const painTags = [...new Set(['#pain', ...(bodyTag ? [bodyTag] : [])])]

      const rating = painRatingMatch?.[1] ? Math.max(0, Math.min(10, Number(painRatingMatch[1]))) : null
      if (rating != null && Number.isFinite(rating) && !createdTrackerKeys.has('pain')) {
        const { mergedTags, inferred } = finalizeCategorizedTags({ title: `pain: ${rating}/10`, tags: painTags })
        const log = await createEvent({
          title: `pain: ${rating}/10`,
          startAt: nowMs,
          endAt: nowMs + 5 * 60 * 1000,
          kind: 'log',
          parentEventId: await getActiveForLogsId(),
          tags: mergedTags,
          contexts: allContexts,
          icon: 'heart',
          color: '#ef4444',
          entityIds,
          sourceNoteId: note.id,
          goal: goalOverride,
          project: projectOverride,
          importance: importanceOverride ?? 5,
          difficulty: difficultyOverride ?? 5,
          category: inferred.category,
          subcategory: inferred.subcategory,
        })
        setEvents((prev) => [log, ...prev])
        createdTrackerKeys.add('pain')
        createdLogCount += 1
        setCaptureProgress((p) => [...p, `+ log: ${log.title}`].slice(-10))
      }

      if (!painHealedSignal) {
        const activePain = await findActiveEpisode('pain')
        if (!activePain) {
          const painTitle = bodyPartMatch?.[1] ? `Pain: ${bodyPartMatch[1]}` : 'Pain'
          const { mergedTags, inferred } = finalizeCategorizedTags({ title: painTitle, tags: painTags })
          const ep = await createEvent({
            title: painTitle,
            startAt: dayStartMs,
            endAt: dayEndMs,
            allDay: true,
            active: true,
            kind: 'episode',
            trackerKey: 'pain',
            icon: 'heart',
            color: '#ef4444',
            tags: mergedTags,
            contexts: allContexts,
            entityIds,
            sourceNoteId: note.id,
            goal: goalOverride,
            project: projectOverride,
            importance: importanceOverride ?? 5,
            difficulty: difficultyOverride ?? 5,
            category: inferred.category,
            subcategory: inferred.subcategory,
          })
          setEvents((prev) => [ep, ...prev])
        } else {
          const merged = [...new Set([...(activePain.tags ?? []), ...painTags])]
          if (merged.join('|') !== (activePain.tags ?? []).join('|')) {
            const next = await upsertEvent({ ...activePain, tags: merged })
            commitEvent(next)
          }
        }
      } else {
        const activePain = await findActiveEpisode('pain')
        if (activePain) {
          const next = await upsertEvent({ ...activePain, endAt: dayEndMs, active: false })
          commitEvent(next)
        }
      }
    }

    if (moodValue != null) {
      await createTrackerLog({ key: 'mood', value: moodValue, icon: 'smile', color: '#f59e0b' })
    }
    if (energyValue != null) {
      await createTrackerLog({ key: 'energy', value: energyValue, icon: 'bolt', color: '#f59e0b' })
    }
    if (stressValue != null) {
      await createTrackerLog({ key: 'stress', value: stressValue, icon: 'frown', color: '#db2777' })
    }

    if (workoutStartSignal && !workoutEndSignal) {
      const active = await findActiveByTrackerKey('workout')
      if (!active) {
        const { mergedTags, inferred } = finalizeCategorizedTags({ title: 'Workout', tags: ['#workout'] })
        const ev = await createEvent({
          title: 'Workout',
          startAt: nowMs,
          endAt: nowMs + 60 * 60 * 1000,
          active: true,
          kind: 'event',
          trackerKey: 'workout',
          icon: 'dumbbell',
          color: '#22c55e',
          tags: mergedTags,
          contexts: allContexts,
          entityIds,
          sourceNoteId: note.id,
          goal: goalOverride,
          project: projectOverride,
          importance: importanceOverride ?? 5,
          difficulty: difficultyOverride ?? 5,
          category: inferred.category,
          subcategory: inferred.subcategory,
        })
        setEvents((prev) => [ev, ...prev])
        activeForLogsId = ev.id
      }
    }
    if (workoutEndSignal) {
      const active = await findActiveByTrackerKey('workout')
      if (active) {
        const next = await upsertEvent({ ...active, endAt: nowMs, active: false })
        commitEvent(next)
      }
    }

    if (boredSignal && !createdTrackerKeys.has('bored')) {
      const value = 7
      const title = `bored: ${value}/10`
      const startAt = nowMs
      const endAt = nowMs + 5 * 60 * 1000
      const key = makeEventKey(title, startAt, endAt)
      if (!createdEventKeys.has(key)) {
        const { mergedTags, inferred } = finalizeCategorizedTags({ title, tags: ['#bored'] })
        const log = await createEvent({
          title,
          startAt,
          endAt,
          kind: 'log',
          parentEventId: await getActiveForLogsId(),
          tags: mergedTags,
          contexts: allContexts,
          entityIds,
          sourceNoteId: note.id,
          trackerKey: 'bored',
          icon: 'frown',
          color: '#64748b',
          goal: goalOverride,
          project: projectOverride,
          importance: importanceOverride ?? 5,
          difficulty: difficultyOverride ?? 5,
          category: inferred.category,
          subcategory: inferred.subcategory,
        })
        setEvents((prev) => [log, ...prev])
        createdEventKeys.add(makeEventKey(log.title, log.startAt, log.endAt))
        createdTrackerKeys.add('bored')
        createdLogCount += 1
        setCaptureProgress((p) => [...p, `+ log: ${log.title}`].slice(-10))
      }
    }

    for (const h of habitHits) {
      const minutes = Math.max(5, h.estimateMinutes ?? 15)
      const startAt = nowMs
      const endAt = nowMs + minutes * 60 * 1000
      const title = `habit: ${h.name}`
      const key = makeEventKey(title, startAt, endAt)
      if (createdEventKeys.has(key)) continue
      const tags = [...new Set(['#habit', ...(h.tags ?? [])])]
      const { mergedTags, inferred } = finalizeCategorizedTags({ title, tags })
      const ev = await createEvent({
        title,
        startAt,
        endAt,
        kind: 'log',
        parentEventId: await getActiveForLogsId(),
        tags: mergedTags,
        contexts: allContexts,
        entityIds,
        sourceNoteId: note.id,
        trackerKey: `habit:${h.id}`,
        category: h.category ?? inferred.category,
        subcategory: h.subcategory ?? inferred.subcategory,
        importance: Math.max(0, Math.min(10, h.importance)),
        difficulty: Math.max(0, Math.min(10, h.difficulty)),
        character: h.character,
        skills: h.skills,
      })
      setEvents((prev) => [ev, ...prev])
      createdEventKeys.add(makeEventKey(ev.title, ev.startAt, ev.endAt))
      createdLogCount += 1
      setCaptureProgress((p) => [...p, `+ habit: ${h.name}`].slice(-10))
    }

    // Always record local log heuristics (mood, hydration, etc.) even if LLM parsing succeeds,
    // so trackers reliably appear on the right-side log lane.
    for (const e of natural.events) {
      const kind = (e.kind ?? 'event') as CalendarEvent['kind']
      if (kind !== 'log') continue
      const startAt = e.startAt
      const endAt = e.endAt
      const key = makeEventKey(e.title, startAt, endAt)
      if (createdEventKeys.has(key)) continue
      const logBase = `${e.title ?? ''}\n${e.notes ?? ''}`.trim()
      const locationHint = e.location ?? pickLocationForText(logBase)
      const { mergedTags, inferred } = finalizeCategorizedTags({ title: e.title, tags: e.tags ?? [], location: locationHint })
      const inferredTrackerKey = inferTrackerKeyFromText(e.title, e.tags ?? [])
      const ev = await createEvent({
        title: e.title,
        startAt,
        endAt,
        kind,
        parentEventId: await getActiveForLogsId(),
        tags: mergedTags,
        contexts: allContexts,
        entityIds,
        sourceNoteId: note.id,
        icon: e.icon ?? null,
        color: e.color ?? null,
        category: inferred.category,
        subcategory: inferred.subcategory,
        goal: e.goal ?? goalOverride ?? null,
        project: e.project ?? projectOverride ?? null,
        importance: importanceOverride ?? 5,
        difficulty: difficultyOverride ?? 5,
        trackerKey: inferredTrackerKey ?? null,
      })
      const next = await upsertEvent({
        ...ev,
        notes: e.notes ?? ev.notes,
        icon: e.icon ?? null,
        color: e.color ?? null,
        category: inferred.category,
        subcategory: inferred.subcategory,
        estimateMinutes: e.estimateMinutes ?? durationOverride ?? 5,
        location: locationHint ?? null,
        people: cleanPeopleList(e.people ?? uniqStrings(personMentions)),
        skills: e.skills ?? [],
        character: normalizeCharacterSelection(e.character ?? []),
        importance: importanceOverride ?? ev.importance ?? 5,
        difficulty: difficultyOverride ?? ev.difficulty ?? 5,
        goal: e.goal ?? ev.goal ?? goalOverride ?? null,
        project: e.project ?? ev.project ?? projectOverride ?? null,
        contexts: uniqStrings([...(ev.contexts ?? []), ...allContexts]),
      })
      setEvents((prev) => [next, ...prev])
      createdEventKeys.add(makeEventKey(next.title, next.startAt, next.endAt))
      if (next.trackerKey) createdTrackerKeys.add(next.trackerKey)
      createdLogCount += 1
      setCaptureProgress((p) => [...p, `+ log: ${next.title}`].slice(-10))
    }

    const groupedNaturalEvents = allowLocalFallback ? groupParsedEvents(natural.events) : []
    const firstNaturalEvent = allowLocalFallback ? groupedNaturalEvents.find((e) => (e.kind ?? 'event') !== 'log') ?? null : null
    if (firstNaturalEvent) {
      const t = new Date(firstNaturalEvent.startAt)
      const hh = String(t.getHours()).padStart(2, '0')
      const mm = String(t.getMinutes()).padStart(2, '0')
      setCaptureProgress((p) => [...p, `First event: ${firstNaturalEvent.title} @ ${hh}:${mm}`].slice(-10))
    }

		    if (!llmSucceeded && !allowLocalFallback) {
		      setCaptureError('LLM returned empty; local parsing is disabled.')
		      setCaptureProgress((p) => [...p, 'LLM empty; local parsing disabled'].slice(-10))
		    } else if (!llmSucceeded) {
		      for (const e of groupedNaturalEvents) {
		        if (!allowEventCreation) continue
		        const startAt = e.startAt
		        const endAt = e.endAt
		        const key = makeEventKey(e.title, startAt, endAt)
		        if (createdEventKeys.has(key)) continue
		        const kind = (e.kind ?? 'event') as CalendarEvent['kind']
		        if (kind === 'log') continue
        const baseText = `${e.title ?? ''}\n${e.notes ?? ''}\n${(e.tags ?? []).join(' ')}`.trim()
		        const autoImportance = e.importance ?? importanceOverride ?? inferImportanceFromText(baseText) ?? 5
		        const autoDifficulty = e.difficulty ?? difficultyOverride ?? inferDifficultyFromText(baseText) ?? 5
		        const autoCharacter = normalizeCharacterSelection(e.character ?? inferCharacterFromText(baseText, e.tags ?? []))
        const locationHint = e.location ?? pickLocationForText(baseText)
        const { mergedTags, inferred } = finalizeCategorizedTags({ title: e.title, tags: e.tags ?? [], location: locationHint })
		        const times = applyDurationOverride(startAt, endAt, kind)
		        const ev = await createEvent({
		          title: e.title,
		          startAt: times.startAt,
		          endAt: times.endAt,
		          kind,
		                                      parentEventId: null,
		                                      tags: mergedTags,
		                                      contexts: allContexts,
		                                      entityIds,
		                                      sourceNoteId: note.id,
		                                      icon: e.icon ?? null,
		                                      color: e.color ?? null,
		                                      category: inferred.category,
		                                      subcategory: inferred.subcategory,
		                                      goal: e.goal ?? goalOverride ?? null,
		                                      project: e.project ?? projectOverride ?? null,
		                                                                  importance: autoImportance,
		                                                                  difficulty: autoDifficulty,
		                                                                })
		                                                                const next = await upsertEvent({
		          ...ev,
		          notes: e.notes ?? ev.notes,
		          icon: e.icon ?? null,
		          color: e.color ?? null,
		          category: inferred.category,
		          subcategory: inferred.subcategory,
		          estimateMinutes: e.estimateMinutes ?? durationOverride ?? (kind === 'episode' ? null : Math.round((times.endAt - times.startAt) / (60 * 1000))),
          location: locationHint ?? null,
		          people: cleanPeopleList(e.people ?? uniqStrings(personMentions)),
		          skills: e.skills ?? [],
		          character: autoCharacter,
		          importance: autoImportance ?? ev.importance ?? 5,
		          difficulty: autoDifficulty ?? ev.difficulty ?? 5,
		          goal: e.goal ?? ev.goal ?? goalOverride ?? null,
		          project: e.project ?? ev.project ?? projectOverride ?? null,
		          contexts: uniqStrings([...(ev.contexts ?? []), ...allContexts]),
		        })
		        setEvents((prev) => [next, ...prev])
		        createdEventKeys.add(makeEventKey(next.title, next.startAt, next.endAt))
		                                  createdEventCount += 1
		                                  if (navigateToMs == null || next.startAt < navigateToMs) navigateToMs = next.startAt
		                                  captureHasNonLogEvent = true
		                                  if (!capturePrimaryEventId) capturePrimaryEventId = next.id
		                                  lastCreated = { kind: 'event', id: next.id }
		                                  setCaptureProgress((p) => [...p, `+ ${next.kind}: ${next.title}`].slice(-10))		      }

		      for (const t of natural.tasks) {
		        if (!allowTaskCreation) continue
		        const key = makeTaskKey(t.title)
		        if (createdTaskKeys.has(key)) continue
		        const { mergedTags, inferred } = finalizeCategorizedTags({ title: t.title, tags: t.tags ?? [] })
        const taskBase = `${t.title ?? ''}\n${t.notes ?? ''}\n${(t.tags ?? []).join(' ')}`.trim()
		        const autoImportance = t.importance ?? importanceOverride ?? inferImportanceFromText(taskBase) ?? 5
		        const autoDifficulty = t.difficulty ?? difficultyOverride ?? inferDifficultyFromText(taskBase) ?? 5
		        const task = await createTask({
		          title: t.title,
		          status: t.status ?? 'todo',
		          tags: mergedTags,
		          contexts: allContexts,
		          entityIds,
		          parentEventId: capturePrimaryEventId,
		          category: inferred.category,
		          subcategory: inferred.subcategory,
		          goal: t.goal ?? goalOverride ?? null,
		          project: t.project ?? projectOverride ?? null,
		          estimateMinutes: t.estimateMinutes ?? durationOverride ?? 25,
		          importance: autoImportance,
		          difficulty: autoDifficulty,
		          sourceNoteId: note.id,
		        })
		        const next = await upsertTask({
		          ...task,
		          parentEventId: task.parentEventId ?? capturePrimaryEventId,
		          category: inferred.category,
		          subcategory: inferred.subcategory,
		          notes: t.notes ?? '',
		          estimateMinutes: t.estimateMinutes ?? durationOverride ?? task.estimateMinutes ?? 25,
		          status: t.status ?? task.status,
		          scheduledAt: t.scheduledAt ?? task.scheduledAt ?? null,
		          dueAt: t.dueAt ?? task.dueAt ?? null,
		          importance: autoImportance ?? task.importance ?? 5,
		          difficulty: autoDifficulty ?? task.difficulty ?? 5,
		          goal: t.goal ?? task.goal ?? goalOverride ?? null,
		          project: t.project ?? task.project ?? projectOverride ?? null,
		          contexts: uniqStrings([...(task.contexts ?? []), ...allContexts]),
		        })
		        setTasks((prev) => [next, ...prev])
		        createdTaskCount += 1
		        createdTaskKeys.add(makeTaskKey(next.title))
		        setCaptureProgress((p) => [...p, `+ Task: ${next.title}`].slice(-10))

		        if (!captureHasNonLogEvent) {
		          lastCreated = { kind: 'task', id: next.id }
		          if (navigateToMs == null && next.scheduledAt) navigateToMs = next.scheduledAt
		        }

		        const block = await maybeCreateTaskCalendarBlock({
		          task: next,
		          tags: mergedTags,
		          location: pickLocationForText(taskBase),
		          people: cleanPeopleList(uniqStrings(personMentions)),
		          contexts: allContexts,
		          entityIds,
		        })
		        if (block && !captureHasNonLogEvent) {
		          lastCreated = { kind: 'event', id: block.id }
		          navigateToMs = block.startAt
		        }
		      }
		    } else {
		      setCaptureProgress((p) => [...p, 'Skipped local parsing (AI parser succeeded)'].slice(-10))
		    }

    if (attachedMode && captureAttachEventId) {
      const attached = events.find((e) => e.id === captureAttachEventId) ?? null
      if (attached) {
        const noteTasks = (llm?.tasks?.length ?? 0) > 0 ? llm!.tasks : natural.tasks
        const noteEvents = (llm?.events?.length ?? 0) > 0 ? llm!.events : natural.events
        const block = buildAttachedCaptureMarkdown(nowMs, { tasks: noteTasks, events: noteEvents })
        const nextNotes = appendMarkdownBlock(attached.notes, block)
        const nextTags = uniqStrings([...(attached.tags ?? []), ...allTagTokens])
        const nextPeople = uniqStrings([...(attached.people ?? []), ...personMentions])
        const nextContexts = uniqStrings([...(attached.contexts ?? []), ...allContexts])
        const nextLocation = attached.location ?? (placeMentions.length ? uniqStrings(placeMentions).join(', ') : null)
        commitEvent({
          ...attached,
          notes: nextNotes,
          tags: nextTags,
          people: nextPeople,
          contexts: nextContexts,
          location: nextLocation,
        })
        setCaptureProgress((p) => [...p, `Appended transcript to "${attached.title}"`].slice(-10))
      }
    }

    // Use LLM-parsed workouts if available, otherwise fall back to local regex parser
    const llmWorkout = (llm?.workouts?.length ?? 0) > 0 ? llm!.workouts[0] : null
    const normalizeExerciseName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    const hasMeaningfulSets = (sets: Array<{ reps?: number; weight?: number; duration?: number; distance?: number; rpe?: number }>) =>
      sets.some((set) => set.reps || set.weight || set.duration || set.distance || set.rpe)
    const parsedWorkout = llmWorkout
      ? (() => {
          const localExercises = localWorkout?.exercises ?? []
          const localMap = new Map(localExercises.map((ex) => [normalizeExerciseName(ex.name), ex]))

          if (llmWorkout.isSetAddition) {
            const llmExercises = llmWorkout.exercises.map((ex) => ({
              id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              name: ex.name,
              type: ex.type ?? 'strength',
              sets: ex.sets,
              muscleGroups: ex.muscleGroups,
              notes: ex.notes,
            }))
            return {
              type: llmWorkout.type,
              exercises: llmExercises,
              totalDuration: llmWorkout.totalDuration,
              overallRpe: llmWorkout.overallRpe,
              isSetAddition: llmWorkout.isSetAddition,
              targetExerciseName: llmWorkout.targetExerciseName,
            }
          }

          const used = new Set<string>()
          const mergedExercises = llmWorkout.exercises.map((ex) => {
            const key = normalizeExerciseName(ex.name)
            const local = localMap.get(key)
            if (local) used.add(key)
            const nextSets = hasMeaningfulSets(ex.sets) ? ex.sets : (local?.sets ?? ex.sets)
            return {
              id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              name: ex.name,
              type: ex.type ?? local?.type ?? 'strength',
              sets: nextSets,
              muscleGroups: ex.muscleGroups ?? local?.muscleGroups,
              notes: ex.notes ?? local?.notes,
            }
          })
          for (const local of localExercises) {
            const key = normalizeExerciseName(local.name)
            if (!used.has(key)) mergedExercises.push(local)
          }

          return {
            type: llmWorkout.type ?? localWorkout?.type ?? 'mixed',
            exercises: mergedExercises,
            totalDuration: llmWorkout.totalDuration ?? localWorkout?.totalDuration,
            overallRpe: llmWorkout.overallRpe ?? localWorkout?.overallRpe,
            isSetAddition: llmWorkout.isSetAddition,
            targetExerciseName: llmWorkout.targetExerciseName,
          }
        })()
      : localWorkout

    if (parsedWorkout && parsedWorkout.exercises?.length) {
      const durationMinutes =
        parsedWorkout.totalDuration ??
        (Math.round(parsedWorkout.exercises.flatMap((ex) => ex.sets).reduce((sum, set) => sum + (set.duration ?? 0), 0) / 60) || undefined)
      const startAt = anchorMs ?? nowMs
      const endAt = durationMinutes ? startAt + durationMinutes * 60 * 1000 : startAt
      const typeLabel = parsedWorkout.type ?? 'mixed'
      const defaultTitle =
        typeLabel === 'cardio'
          ? 'Cardio'
          : typeLabel === 'strength'
            ? 'Strength'
            : typeLabel === 'mobility'
              ? 'Mobility'
              : typeLabel === 'recovery'
                ? 'Recovery'
                : 'Workout'
      const title =
        parsedWorkout.exercises.length === 1
          ? parsedWorkout.exercises[0].name
          : defaultTitle === 'Workout'
            ? 'Workout'
            : `${defaultTitle} Workout`
      const workoutId = `wrk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      const estimatedCalories = estimateCalories({
        id: workoutId,
        eventId: capturePrimaryEventId ?? note.id,
        type: parsedWorkout.type ?? 'mixed',
        title,
        exercises: parsedWorkout.exercises,
        startAt,
        endAt,
        totalDuration: durationMinutes,
        overallRpe: parsedWorkout.overallRpe,
        tags: ['#workout', `#${typeLabel}`],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })

      await saveWorkout({
        id: workoutId,
        eventId: capturePrimaryEventId ?? note.id,
        type: parsedWorkout.type ?? 'mixed',
        title,
        exercises: parsedWorkout.exercises,
        startAt,
        endAt,
        totalDuration: durationMinutes,
        estimatedCalories,
        overallRpe: parsedWorkout.overallRpe,
        tags: ['#workout', `#${typeLabel}`],
      })
    }

    // Use LLM-parsed meals if available, otherwise fall back to local regex parser
    const llmMeal = (llm?.meals?.length ?? 0) > 0 ? llm!.meals[0] : null
    const parsedMeal = llmMeal
      ? {
          type: llmMeal.type,
          items: llmMeal.items,
          totalCalories: llmMeal.totalCalories,
          macros: llmMeal.macros ?? { protein: 0, carbs: 0, fat: 0 },
          location: llmMeal.location,
          notes: llmMeal.notes,
        }
      : localMeal
    if (parsedMeal && parsedMeal.items?.length) {
      const eatenAt = anchorMs ?? nowMs
      const mealTitle =
        parsedMeal.items.length === 1
          ? parsedMeal.items[0].name
          : parsedMeal.type === 'breakfast'
            ? 'Breakfast'
            : parsedMeal.type === 'lunch'
              ? 'Lunch'
              : parsedMeal.type === 'dinner'
                ? 'Dinner'
                : parsedMeal.type === 'drink'
                  ? 'Drink'
                  : 'Snack'
      const normalizeItem = (item: FoodItem) => ({
        ...item,
        id: item.id ?? makeFoodItemId(),
        name: item.name?.trim() || 'Food',
        quantity: Number.isFinite(item.quantity) ? item.quantity : 1,
        unit: item.unit?.trim() || 'serving',
      })

      const sumMealFromItems = (items: FoodItem[]) => {
        const sumField = (key: keyof FoodItem) => {
          let total = 0
          let has = false
          for (const item of items) {
            const value = item[key]
            if (typeof value === 'number' && Number.isFinite(value)) {
              total += value
              has = true
            }
          }
          return { total, has }
        }

        const calories = sumField('calories')
        const protein = sumField('protein')
        const carbs = sumField('carbs')
        const fat = sumField('fat')
        const fiber = sumField('fiber')
        const saturatedFat = sumField('saturatedFat')
        const transFat = sumField('transFat')
        const sugar = sumField('sugar')
        const sodium = sumField('sodium')
        const potassium = sumField('potassium')
        const cholesterol = sumField('cholesterol')

        return {
          totalCalories: calories.total,
          hasCalories: calories.has,
          macros: {
            protein: protein.total,
            carbs: carbs.total,
            fat: fat.total,
            fiber: fiber.has ? fiber.total : undefined,
            saturatedFat: saturatedFat.has ? saturatedFat.total : undefined,
            transFat: transFat.has ? transFat.total : undefined,
            sugar: sugar.has ? sugar.total : undefined,
            sodium: sodium.has ? sodium.total : undefined,
            potassium: potassium.has ? potassium.total : undefined,
            cholesterol: cholesterol.has ? cholesterol.total : undefined,
          },
          hasMacroData: protein.has || carbs.has || fat.has || fiber.has || saturatedFat.has || transFat.has || sugar.has || sodium.has || potassium.has || cholesterol.has,
        }
      }

      let items = parsedMeal.items.map((item) => normalizeItem(item as FoodItem))
      let estimationModel: string | undefined

      const itemsNeedNutrition = items.some((item) =>
        item.calories == null ||
        item.protein == null ||
        item.carbs == null ||
        item.fat == null ||
        item.fiber == null ||
        item.saturatedFat == null ||
        item.sugar == null ||
        item.sodium == null ||
        item.potassium == null ||
        item.cholesterol == null
      )

      let needsLocalEstimate = itemsNeedNutrition && !shouldTryLlm
      if (itemsNeedNutrition && shouldTryLlm) {
        const description = items
          .map((item) => `${item.quantity} ${item.unit} ${item.name}`.trim())
          .filter(Boolean)
          .join(', ')
        try {
          setCaptureAiStatus('Estimating nutrition…')
          const estimate = await estimateNutritionWithLlm({
            apiKey: llmKey,
            model: (llmSettings.nutritionModel ?? llmSettings.chatModel ?? 'gpt-4.1-mini').trim() || 'gpt-4.1-mini',
            foodDescription: description || captureText,
            mealType: parsedMeal.type,
          })
          items = estimate.items.map((item) => normalizeItem(item))
          estimationModel = estimate.model
          const totals = sumMealFromItems(items)
          parsedMeal.totalCalories = estimate.totalCalories || totals.totalCalories
          parsedMeal.macros = estimate.macros
          setCaptureProgress((p) => [...p, `Nutrition estimated (${estimate.model})`].slice(-10))
        } catch (err) {
          console.warn('Nutrition estimation failed:', err)
          setCaptureProgress((p) => [...p, 'Nutrition estimate failed; used local totals'].slice(-10))
          needsLocalEstimate = true
        }
      }

      if (needsLocalEstimate) {
        items = items.map((item) => {
          if (item.calories != null && item.protein != null && item.carbs != null && item.fat != null) return item
          const estimated = estimateFoodNutrition(item.name, item.quantity, item.unit)
          return {
            ...item,
            calories: item.calories ?? estimated.calories,
            protein: item.protein ?? estimated.protein,
            carbs: item.carbs ?? estimated.carbs,
            fat: item.fat ?? estimated.fat,
            fiber: item.fiber ?? estimated.fiber,
          }
        })
      }

      const totals = sumMealFromItems(items)
      const totalCalories = parsedMeal.totalCalories && parsedMeal.totalCalories > 0
        ? parsedMeal.totalCalories
        : totals.totalCalories
      const macros = {
        protein: parsedMeal.macros?.protein ?? totals.macros.protein ?? 0,
        carbs: parsedMeal.macros?.carbs ?? totals.macros.carbs ?? 0,
        fat: parsedMeal.macros?.fat ?? totals.macros.fat ?? 0,
        fiber: parsedMeal.macros?.fiber ?? totals.macros.fiber,
        saturatedFat: parsedMeal.macros?.saturatedFat ?? totals.macros.saturatedFat,
        transFat: parsedMeal.macros?.transFat ?? totals.macros.transFat,
        sugar: parsedMeal.macros?.sugar ?? totals.macros.sugar,
        sodium: parsedMeal.macros?.sodium ?? totals.macros.sodium,
        potassium: parsedMeal.macros?.potassium ?? totals.macros.potassium,
        cholesterol: parsedMeal.macros?.cholesterol ?? totals.macros.cholesterol,
      }

      const roundOptional = (value?: number) => (typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : undefined)

      await saveMeal({
        id: `meal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        eventId: capturePrimaryEventId ?? note.id,
        type: parsedMeal.type,
        title: mealTitle,
        items,
        totalCalories: Math.round(totalCalories ?? 0),
        macros: {
          protein: Math.round(macros.protein ?? 0),
          carbs: Math.round(macros.carbs ?? 0),
          fat: Math.round(macros.fat ?? 0),
          fiber: roundOptional(macros.fiber),
          saturatedFat: roundOptional(macros.saturatedFat),
          transFat: roundOptional(macros.transFat),
          sugar: roundOptional(macros.sugar),
          sodium: roundOptional(macros.sodium),
          potassium: roundOptional(macros.potassium),
          cholesterol: roundOptional(macros.cholesterol),
        },
        eatenAt,
        tags: ['#food', `#${parsedMeal.type}`],
        estimationModel,
      })
    }

    setCaptureProgress((p) => [...p, `Created: ${createdEventCount} event(s), ${createdLogCount} log(s), ${createdTaskCount} task(s)`].slice(-10))

    if (createdEventCount > 0 || createdLogCount > 0 || createdTaskCount > 0) {
      await refreshAll()
    }

    if (lastCreated.kind !== 'none') {
      setSelection(lastCreated)
      setRightCollapsed(false)
      setRightMode('details')
    } else {
      setSelection({ kind: 'capture', id: note.id })
    }

    if (navigateToMs != null) {
      setAgendaDate(new Date(navigateToMs))
      openView('calendar')
    } else if (lastCreated.kind === 'task') {
      openView('tasks')
    } else {
      openView('notes')
    }

		    if (!llmError) {
		      setCaptureDraft('')
		      setCaptureInterim('')
		      setCaptureAttachEventId(null)
		      setCaptureOpen(false)
		    }
		    } finally {
	      setCaptureSaving(false)
	      setCaptureAiStatus('')
	    }
	  }

  function requestDeleteSelection(opts?: { skipConfirm?: boolean }) {
    void (async () => {
      if (selection.kind === 'task') {
        const t = tasks.find((x) => x.id === selection.id)
        if (!t) return
        const ok = opts?.skipConfirm ? true : window.confirm(`Delete task: "${t.title}"?`)
        if (!ok) return
        await deleteTask(t.id)
        setTasks((prev) => prev.filter((x) => x.id !== t.id))
        setSelection({ kind: 'none' })
        return
      }
      if (selection.kind === 'event') {
        const ev = events.find((x) => x.id === selection.id)
        if (!ev) return
        const ok = opts?.skipConfirm ? true : window.confirm(`Delete ${ev.kind}: "${ev.title}"?`)
        if (!ok) return
        await deleteEvent(ev.id)
        setEvents((prev) => prev.filter((x) => x.id !== ev.id && x.parentEventId !== ev.id))
        setSelection({ kind: 'none' })
      }
    })()
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isTextInputTarget(e.target)) return
      if (e.key !== 'Backspace' && e.key !== 'Delete') return
      if (selection.kind !== 'task' && selection.kind !== 'event') return
      e.preventDefault()
      requestDeleteSelection({ skipConfirm: e.shiftKey })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [events, selection, tasks])

	  function renderView(view: WorkspaceViewKey) {
	    switch (view) {
	      case 'dashboard':
	        return <DashboardView events={events} tasks={tasks} />
	              case 'notes':
	                return (
	                  <NotesView
	                    captures={captures}
	                    selectedCaptureId={selection.kind === 'capture' ? selection.id : null}
	                    onSelectCapture={(id) => setSelection({ kind: 'capture', id })}
	                    onOpenCapture={() => openCapture()}
	                              onUpdateCapture={onUpdateCapture}
	                            />
	                          )
	                        case 'reflections':
	            return <ReflectionsView />
          case 'tasks':
            return (          <TickTickTasksView
            tasks={tasks}
            selectedTaskId={selection.kind === 'task' ? selection.id : null}
            onSelectTask={(id) => setSelection({ kind: 'task', id })}
            onCreateTask={onCreateTaskFromInput}
            onToggleComplete={onToggleTaskComplete}
            onMoveTask={onMoveTaskStatus}
          />
        )
      case 'calendar':
        return (
          <PlannerView
            date={agendaDate}
            onDateChange={setAgendaDate}
            onRefresh={refreshAll}
            tasks={tasks}
            captures={captures}
            events={events}
            selection={selection}
            setSelection={setSelection}
            onCreateTask={onCreateTaskFromInput}
            onToggleTaskComplete={onToggleTaskComplete}
            onToggleTaskChecklistItem={onToggleTaskChecklistItem}
            onRequestCreateEvent={openEventComposer}
            onCreateEvent={onCreateEvent}
            onMoveEvent={onMoveEvent}
            onToggleEventComplete={onToggleEventComplete}
            onUpdateEvent={onUpdateEvent}
            eventTitleDetail={eventTitleDetail}
          />
        )
      case 'assistant':
        return (
          <AssistantView
            captures={captures}
            events={events}
            tasks={tasks}
            onSelectCapture={(id) => setSelection({ kind: 'capture', id })}
            onSelectEvent={(id) => setSelection({ kind: 'event', id })}
            onSelectTask={(id) => setSelection({ kind: 'task', id })}
          />
        )
      case 'settings':
        return <SettingsView />
      case 'timeline':
        return (
          <TimelineView
            events={events}
            captures={captures}
            activeTagFilters={timelineTagFilters}
            onToggleTag={(t) =>
              setTimelineTagFilters((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t].slice(0, 6)))
            }
            onSelectEvent={(id) => setSelection({ kind: 'event', id })}
            onSelectCapture={(id) => setSelection({ kind: 'capture', id })}
          />
        )
      case 'habits':
        return (
          <HabitsView
            events={events}
            onCreatedEvent={(ev) => setEvents((prev) => [ev, ...prev])}
            onOpenReports={(habitId) => openHabitReports(habitId)}
          />
        )
      case 'goals':
        return (
          <GoalsView
            events={events}
            tasks={tasks}
            mode="list"
            onOpenGoal={openGoalDetail}
            onSelectEvent={(id) => setSelection({ kind: 'event', id })}
            onSelectTask={(id) => setSelection({ kind: 'task', id })}
            onCreatedTask={(task) => setTasks((prev) => [task, ...prev])}
            onCreatedEvent={(ev) => setEvents((prev) => [ev, ...prev])}
            onUpdateEvent={onUpdateEvent}
            onDeleteEvent={async (id) => {
              await deleteEvent(id)
              setEvents((prev) => prev.filter((x) => x.id !== id && x.parentEventId !== id))
            }}
          />
        )
      case 'goal-detail':
        return (
          <GoalsView
            events={events}
            tasks={tasks}
            mode="detail"
            goalName={selectedGoal}
            onOpenGoal={openGoalDetail}
            onSelectEvent={(id) => setSelection({ kind: 'event', id })}
            onSelectTask={(id) => setSelection({ kind: 'task', id })}
            onCreatedTask={(task) => setTasks((prev) => [task, ...prev])}
            onCreatedEvent={(ev) => setEvents((prev) => [ev, ...prev])}
            onUpdateEvent={onUpdateEvent}
            onDeleteEvent={async (id) => {
              await deleteEvent(id)
              setEvents((prev) => prev.filter((x) => x.id !== id && x.parentEventId !== id))
            }}
          />
        )
      case 'projects':
        return <ProjectsView events={events} tasks={tasks} />
      case 'rewards':
        return <RewardsView events={events} />
      case 'reports':
        return <ReportsView events={events} tasks={tasks} />
      case 'health':
        return <HealthDashboard events={events} />
      case 'people':
        return (
          <PeopleView
            events={events}
            onSelectEvent={(id) => {
              setSelection({ kind: 'event', id })
              setRightCollapsed(false)
              setRightMode('details')
            }}
          />
        )
      case 'places':
        return (
          <PlacesView
            events={events}
            onSelectEvent={(id) => {
              setSelection({ kind: 'event', id })
              setRightCollapsed(false)
              setRightMode('details')
            }}
          />
        )
      case 'tags':
        return (
          <TagsView
            events={events}
            tasks={tasks}
            onSelectEvent={(id) => {
              setSelection({ kind: 'event', id })
              setRightCollapsed(false)
              setRightMode('details')
            }}
            onSelectTask={(id) => {
              setSelection({ kind: 'task', id })
              setRightCollapsed(false)
              setRightMode('details')
            }}
          />
        )
      default:
        return <PlaceholderView title="View" subtitle="Coming soon." />
    }
  }

	  const active = getActiveTab(workspace)

  const selectedTask = selection.kind === 'task' ? tasks.find((t) => t.id === selection.id) ?? null : null
  const selectedEvent = selection.kind === 'event' ? events.find((e) => e.id === selection.id) ?? null : null
  const selectedCapture = selection.kind === 'capture' ? captures.find((c) => c.id === selection.id) ?? null : null
  const selectionKey = selection.kind === 'none' ? 'none' : `${selection.kind}:${selection.id}`
  const docTranscriptText =
    selection.kind === 'capture'
      ? selectedCapture?.rawText ?? ''
      : selection.kind === 'event'
        ? selectedEvent?.notes ?? ''
        : selection.kind === 'task'
          ? selectedTask?.notes ?? ''
          : ''
  const docTranscriptLines = useMemo(() => parseTimestampedTranscript(docTranscriptText), [docTranscriptText])
  const selectedTaskTags = selectedTask?.tags ?? []
  const selectedTaskContexts = selectedTask?.contexts ?? []
  const selectedEventTags = selectedEvent?.tags ?? []
  const selectedEventContexts = selectedEvent?.contexts ?? []
  const selectedEventPeople = selectedEvent?.people ?? []
  const selectedEventLocations = selectedEvent?.location ? parseCommaList(selectedEvent.location) : []
  const selectedEventSkills = selectedEvent?.skills ?? []
  const [nowTick, setNowTick] = useState(() => Date.now())

  useEffect(() => {
    if (!docOpen) return
    setDocTab(selection.kind === 'capture' ? 'transcript' : 'notes')
    setDocTranscriptFocus(null)
  }, [docOpen, selectionKey])

	  const selectedEventLogs = useMemo(() => {
	    if (!selectedEvent) return []
	    return events
      .filter((e) => e.kind === 'log' && e.parentEventId === selectedEvent.id)
      .sort((a, b) => a.startAt - b.startAt)
      .slice(0, 50)
  }, [events, selectedEvent?.id])

  const selectedEventTasks = useMemo(() => {
    if (!selectedEvent) return []
    return tasks
      .filter((t) => t.parentEventId === selectedEvent.id)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 50)
  }, [selectedEvent?.id, tasks])
  const selectedEventNoteTasks = useMemo(() => {
    if (!selectedEventTasks.length) return {}
    const map: Record<string, { status: string; startedAt?: number | null }> = {}
    for (const t of selectedEventTasks) {
      const tokenId = noteTaskTokenId(t.notes ?? '')
      if (!tokenId) continue
      map[tokenId] = {
        status: t.status,
        startedAt: t.status === 'in_progress' ? t.updatedAt : null,
      }
    }
    return map
  }, [selectedEventTasks])
  const hasRunningNoteTask = useMemo(
    () => Object.values(selectedEventNoteTasks).some((t) => t.status === 'in_progress'),
    [selectedEventNoteTasks],
  )

  useEffect(() => {
    if (!selectedEvent?.active && !hasRunningNoteTask) return
    const id = window.setInterval(() => setNowTick(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [selectedEvent?.active, hasRunningNoteTask])

  const selectedEventMinutes = selectedEvent
    ? Math.max(0, Math.round(((selectedEvent.active ? nowTick : selectedEvent.endAt) - selectedEvent.startAt) / (60 * 1000)))
    : 0
  const selectedEventBase = selectedEvent ? basePoints(selectedEvent.importance, selectedEvent.difficulty) : 0
  const selectedEventMult = selectedEvent ? multiplierFor(selectedEvent.goal ?? null, selectedEvent.project ?? null) : 1
  const selectedEventPoints = selectedEvent ? pointsForEventAt(selectedEvent, nowTick) : 0

  const explorerTasks = useMemo(() => {
    const needle = explorerTaskQuery.trim().toLowerCase()
    const base = tasks.filter((t) => t.status !== 'done')
    const filtered = needle
      ? base.filter((t) => t.title.toLowerCase().includes(needle) || (t.tags ?? []).some((x) => x.toLowerCase().includes(needle)))
      : base
    return [...filtered].sort((a, b) => (b.dueAt ?? 0) - (a.dueAt ?? 0) || b.updatedAt - a.updatedAt).slice(0, 20)
  }, [explorerTaskQuery, tasks])

	  // Pomodoro (MVP)
	  const [pomoRunning, setPomoRunning] = useState(false)
	  const [pomoSeconds, setPomoSeconds] = useState(25 * 60)
		  const [pomoActiveTaskId, setPomoActiveTaskId] = useState<string | null>(() => {
		    try {
		      return localStorage.getItem('insight5.pomo.activeTaskId') || null
		    } catch {
		      return null
		    }
		  })
		  const pomoActiveTask = pomoActiveTaskId ? tasks.find((t) => t.id === pomoActiveTaskId) ?? null : null
		  const pomoMinutes = Math.floor(pomoSeconds / 60)
		  const pomoRemainder = pomoSeconds % 60

	  useEffect(() => {
	    if (!pomoRunning) return
	    const id = window.setInterval(() => setPomoSeconds((s) => Math.max(0, s - 1)), 1000)
	    return () => window.clearInterval(id)
	  }, [pomoRunning])

	  useEffect(() => {
	    try {
	      if (pomoActiveTaskId) localStorage.setItem('insight5.pomo.activeTaskId', pomoActiveTaskId)
	      else localStorage.removeItem('insight5.pomo.activeTaskId')
	    } catch {
	      // ignore
	    }
	  }, [pomoActiveTaskId])

		  const pomoProgress = clamp01(1 - pomoSeconds / (25 * 60))

		  const taxonomyCategories = useMemo(() => {
		    const starter = categoriesFromStarter()
		    const fromData = uniqStrings([
		      ...tasks.map((t) => t.category ?? ''),
		      ...events.map((e) => e.category ?? ''),
		    ])
		    const extra = fromData.filter((c) => c && !starter.some((s) => s.toLowerCase() === c.toLowerCase())).sort((a, b) => a.localeCompare(b))
		    return [...starter, ...extra]
		  }, [events, tasks])

		  const taxonomyActiveCategory = (selectedTask?.category ?? selectedEvent?.category ?? '').trim() || null

		  const taxonomySubcategories = useMemo(() => {
		    const starterSubs = taxonomyActiveCategory ? subcategoriesFromStarter(taxonomyActiveCategory) : []
		    const fromData = uniqStrings([
		      ...tasks
		        .filter((t) => (taxonomyActiveCategory ? (t.category ?? '').toLowerCase() === taxonomyActiveCategory.toLowerCase() : true))
		        .map((t) => t.subcategory ?? ''),
		      ...events
		        .filter((e) => (taxonomyActiveCategory ? (e.category ?? '').toLowerCase() === taxonomyActiveCategory.toLowerCase() : true))
		        .map((e) => e.subcategory ?? ''),
		    ])
		    const extra = fromData
		      .filter((s) => s && !starterSubs.some((x) => x.toLowerCase() === s.toLowerCase()))
		      .sort((a, b) => a.localeCompare(b))
		    return [...starterSubs, ...extra]
		  }, [events, tasks, taxonomyActiveCategory])

		  const composerTagList = useMemo(() => parseTags(eventComposer.tagsRaw), [eventComposer.tagsRaw])
		  const composerPeopleList = useMemo(() => parseCommaList(eventComposer.peopleRaw), [eventComposer.peopleRaw])
		  const composerLocationList = useMemo(() => parseCommaList(eventComposer.location), [eventComposer.location])

  function parseTags(raw: string) {
    return raw
      .split(/[,\\s]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => (t.startsWith('#') ? t : `#${t}`))
      .slice(0, 12)
  }

  function normalizeContextToken(raw: string) {
    const trimmed = raw.trim()
    if (!trimmed) return null
    const withoutPrefix = trimmed.replace(/^[@+]/, '').replace(/^at\\s+/i, '').trim()
    return withoutPrefix || null
  }

  function parseContexts(raw: string) {
    return uniqStrings(parseCommaList(raw).map(normalizeContextToken).filter(Boolean))
  }

  function formatContextLabel(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return ''
    if (/^(@|\\+|at\\s+)/i.test(trimmed)) return trimmed
    return `at ${trimmed}`
  }

  function startVoiceCapture(opts?: { silentIfUnavailable?: boolean }) {
	    const SpeechRecognition =
	      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? (window as any).mozSpeechRecognition
	    if (!SpeechRecognition) {
	      if (!opts?.silentIfUnavailable) alert('Voice capture is not available in this build yet. (Next: Whisper.)')
	      return
	    }
	    const rec = new SpeechRecognition()
	    rec.lang = 'en-US'
	    rec.interimResults = true
	    rec.continuous = false
	    setCaptureListening(true)
	    setCaptureInterim('')
	    rec.onresult = (e: any) => {
	      let finalText = ''
	      let interim = ''
	      const results: SpeechRecognitionResultList | undefined = e.results
	      if (!results) return
	      for (let i = e.resultIndex ?? 0; i < results.length; i++) {
	        const r: any = results[i]
	        const t = r?.[0]?.transcript
	        if (typeof t !== 'string') continue
	        if (r.isFinal) finalText += ` ${t}`
	        else interim += ` ${t}`
	      }
	      const finalTrim = finalText.trim()
	      const interimTrim = interim.trim()
	      setCaptureInterim(interimTrim)
	      if (finalTrim) setCaptureDraft((prev) => (prev.trim() ? `${prev.trim()} ${finalTrim}` : finalTrim))
	    }
	    rec.onerror = () => {
	      setCaptureListening(false)
	      setCaptureInterim('')
	    }
	    rec.onend = () => {
	      setCaptureListening(false)
	      setCaptureInterim('')
	    }
	    rec.start()
	  }

  function startComposerTranscription() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? (window as any).mozSpeechRecognition
    if (!SpeechRecognition) {
      alert('Voice transcription is not available in this build yet. (Next: Whisper.)')
      return
    }
    const rec = new SpeechRecognition()
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.continuous = false
    setComposerListening(true)
    setComposerInterim('')
    rec.onresult = (e: any) => {
      let finalText = ''
      let interim = ''
      const results: SpeechRecognitionResultList | undefined = e.results
      if (!results) return
      for (let i = e.resultIndex ?? 0; i < results.length; i++) {
        const r: any = results[i]
        const t = r?.[0]?.transcript
        if (typeof t !== 'string') continue
        if (r.isFinal) finalText += ` ${t}`
        else interim += ` ${t}`
      }
      const finalTrim = finalText.trim()
      const interimTrim = interim.trim()
      setComposerInterim(interimTrim)
      if (finalTrim) {
        setEventComposer((prev) => {
          const base = prev.notes.trim()
          const nextNotes = base ? `${base}\n${finalTrim}` : finalTrim
          return { ...prev, notes: nextNotes }
        })
      }
    }
    rec.onerror = () => {
      setComposerListening(false)
      setComposerInterim('')
    }
    rec.onend = () => {
      setComposerListening(false)
      setComposerInterim('')
    }
    rec.start()
  }

  useEffect(() => {
    if (!captureOpen) return
    if (captureListening) return
    if (captureDraft.trim().length > 0) return
    startVoiceCapture({ silentIfUnavailable: true })
  }, [captureOpen, captureListening, captureDraft])

  async function handleAuthSubmit() {
    const supabase = getSupabaseClient()
    if (!supabase) {
      setAuthError('Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
      return
    }
    const email = authEmail.trim()
    const password = authPassword.trim()
    if (!email || !password) {
      setAuthError('Email and password are required.')
      return
    }
    setAuthWorking(true)
    setAuthError('')
    setAuthStatus('')
    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        })
        if (error) throw error
        if (data.session) {
          setAuthStatus('Account created and signed in.')
        } else {
          setAuthStatus('Check your email to confirm your account.')
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        setAuthStatus(data.session ? 'Signed in.' : 'Signed in.')
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign in failed.')
    } finally {
      setAuthWorking(false)
    }
  }

      return (

        <div className="uiShell">
          {/* Toast Notifications */}
          <Toaster
            position="top-right"
            expand={false}
            richColors
            closeButton
            toastOptions={{
              style: {
                fontFamily: 'Figtree, sans-serif',
              },
            }}
          />

                  <main

                    className="uiMain"

                    style={{

                      gridTemplateColumns: `72px ${leftCollapsed ? 0 : 260}px 1fr ${rightCollapsed ? '0px' : 'var(--right-panel-width)'}`,

                      gap: '16px',

                      padding: '16px'

                    }}>             <aside
                      className={`rail${railLabelsOpen ? ' showLabels' : ''}`}
                      onMouseLeave={() => setRailLabelsOpen(false)}>

                    <div
                      className="flex flex-col items-center py-4 mb-4"
                      onMouseEnter={() => setRailLabelsOpen(true)}>

                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-black/5">

                          <Icon name="sparkle" className="text-[#D95D39]" />

                      </div>

                    </div>

                    <button 

                className={`railBtn ${getActiveTab(workspace).view === 'dashboard' ? 'active' : ''}`} 

                aria-label="Dashboard" title="Dashboard" onClick={() => openView('dashboard')}

              >

  	            <Icon name="home" />
                <span className="railLabel" aria-hidden="true">Dashboard</span>

  	          </button>

  	          <button

  	            className="railBtn railPrimary group"

  	            aria-label="Capture"

  	            title="Capture"

  	                        onClick={() => {

  	                          openCapture()

  	                          setRightCollapsed(false)

  	                        }}>

  	                        <Icon name="plus" className="group-hover:rotate-90 transition-transform duration-500" />
                          <span className="railLabel" aria-hidden="true">Capture</span>

  	                      </button>

  	          <button 

                className={`railBtn ${getActiveTab(workspace).view === 'calendar' ? 'active' : ''}`} 

                aria-label="Calendar" title="Calendar" onClick={() => openView('calendar')}

              >

                <Icon name="calendar" />
                <span className="railLabel" aria-hidden="true">Calendar</span>

  	          </button>

              <button 

                className={`railBtn ${getActiveTab(workspace).view === 'tasks' ? 'active' : ''}`} 

                aria-label="Tasks" title="Tasks" onClick={() => openView('tasks')}

              >

                <Icon name="check" />
                <span className="railLabel" aria-hidden="true">Tasks</span>

              </button>

            <button 

              className={`railBtn ${getActiveTab(workspace).view === 'notes' ? 'active' : ''}`} 

              aria-label="Notes" title="Notes" onClick={() => openView('notes')}

            >

              <Icon name="file" />
              <span className="railLabel" aria-hidden="true">Notes</span>

            </button>

            <button 

              className={`railBtn ${getActiveTab(workspace).view === 'reflections' ? 'active' : ''}`} 

              aria-label="Reflections" title="Reflections" onClick={() => openView('reflections')}

            >

              <Icon name="sparkle" />
              <span className="railLabel" aria-hidden="true">Reflections</span>

            </button>

            <button 

              className={`railBtn ${getActiveTab(workspace).view === 'assistant' ? 'active' : ''}`} 

              aria-label="Chat" title="Chat" onClick={() => openView('assistant')}

            >

              <Icon name="mic" />
              <span className="railLabel" aria-hidden="true">Chat</span>

            </button>

            <div className="railSep opacity-20" />

            <button 

              className={`railBtn ${getActiveTab(workspace).view === 'habits' ? 'active' : ''}`} 

              aria-label="Habits" title="Habits" onClick={() => openView('habits')}

            >

              <Icon name="smile" />
              <span className="railLabel" aria-hidden="true">Habits</span>

            </button>

            <button 

              className={`railBtn ${getActiveTab(workspace).view === 'goals' || getActiveTab(workspace).view === 'goal-detail' ? 'active' : ''}`} 

              aria-label="Goals" title="Goals" onClick={() => openView('goals')}

            >

              <Icon name="target" />
              <span className="railLabel" aria-hidden="true">Goals</span>

            </button>

            <button 

              className={`railBtn ${getActiveTab(workspace).view === 'projects' ? 'active' : ''}`} 

              aria-label="Projects" title="Projects" onClick={() => openView('projects')}

            >

              <Icon name="briefcase" />
              <span className="railLabel" aria-hidden="true">Projects</span>

            </button>

            <button 

              className={`railBtn ${getActiveTab(workspace).view === 'rewards' ? 'active' : ''}`} 

              aria-label="Rewards" title="Rewards" onClick={() => openView('rewards')}

            >

              <Icon name="trophy" />
              <span className="railLabel" aria-hidden="true">Rewards</span>

            </button>

            <button 

              className={`railBtn ${getActiveTab(workspace).view === 'reports' ? 'active' : ''}`} 

              aria-label="Reports" title="Reports" onClick={() => openView('reports')}

            >

              <Icon name="file" />
              <span className="railLabel" aria-hidden="true">Reports</span>

            </button>

            <button 

              className={`railBtn ${getActiveTab(workspace).view === 'health' ? 'active' : ''}`} 

              aria-label="Workout & Nutrition" title="Workout & Nutrition" onClick={() => openView('health')}

            >

              <Icon name="dumbbell" />
              <span className="railLabel" aria-hidden="true">Workout + Nutrition</span>

            </button>

            <button 

              className={`railBtn ${getActiveTab(workspace).view === 'people' ? 'active' : ''}`} 

              aria-label="People" title="People" onClick={() => openView('people')}

            >

              <Icon name="users" />
              <span className="railLabel" aria-hidden="true">People</span>

            </button>

            <button 

              className={`railBtn ${getActiveTab(workspace).view === 'places' ? 'active' : ''}`} 

              aria-label="Places" title="Places" onClick={() => openView('places')}

            >

              <Icon name="pin" />
              <span className="railLabel" aria-hidden="true">Places</span>

            </button>

            <button 

              className={`railBtn ${getActiveTab(workspace).view === 'tags' ? 'active' : ''}`} 

              aria-label="Tags" title="Tags" onClick={() => openView('tags')}

            >

              <Icon name="tag" />
              <span className="railLabel" aria-hidden="true">Tags</span>

            </button>

            <button 

              className={`railBtn ${getActiveTab(workspace).view === 'timeline' ? 'active' : ''}`} 

              aria-label="Timeline" title="Timeline" onClick={() => openView('timeline')}

            >

              <Icon name="bolt" />
              <span className="railLabel" aria-hidden="true">Timeline</span>

            </button>
          <div className="railGrow" />
          <button className="railBtn" aria-label="Refresh" title="Refresh" onClick={refreshAll}>
            <Icon name="bolt" />
            <span className="railLabel" aria-hidden="true">Refresh</span>
          </button>
          <button
            className="railBtn"
            aria-label="Toggle theme"
            title="Toggle theme"
            onClick={() => setThemePref((p) => nextThemePref(p))}>
            <Icon name={resolveTheme(themePref) === 'dark' ? 'sun' : 'moon'} />
            <span className="railLabel" aria-hidden="true">Theme</span>
          </button>
          <button className="railBtn" aria-label="Toggle explorer" title="Toggle explorer" onClick={() => setLeftCollapsed((v) => !v)}>
            <Icon name="panelLeft" />
            <span className="railLabel" aria-hidden="true">Explorer</span>
          </button>
          <button className="railBtn" aria-label="Settings" title="Settings" onClick={() => openView('settings')}>
            <Icon name="gear" />
            <span className="railLabel" aria-hidden="true">Settings</span>
          </button>
        </aside>

        <aside className={leftCollapsed ? 'sb explorer collapsed' : 'sb explorer'}>
          <div className="sbTop">
            <div className="sbTitle">Vault</div>
            <div className="sbSub">Local-first (IndexedDB)</div>
          </div>
          <div className="sbSection">
            <div className="sbSectionHead">
              <button className="sbSectionToggle" onClick={() => setExplorerPinnedOpen((v) => !v)} aria-label="Toggle pinned">
                <Icon name={explorerPinnedOpen ? 'chevronDown' : 'chevronRight'} size={16} />
              </button>
              <div className="sbSectionTitleInline">Pinned</div>
            </div>
            {explorerPinnedOpen ? (
              <div className="sbPinnedStack">
                {pinnedGroupOrder.map((key) => {
                  if (key === 'tasks') {
                    return (
                      <div
                        key="tasks"
                        className="sbPinnedGroup"
                        draggable
                        onDragStart={(e) => onPinnedDragStart('tasks', e)}
                        onDragOver={onPinnedDragOver}
                        onDrop={(e) => onPinnedDrop('tasks', e)}>
                        <div className="sbPinnedHead">
                          <button className="sbSectionToggle" onClick={() => setExplorerPinnedTasksOpen((v) => !v)} aria-label="Toggle tasks">
                            <Icon name={explorerPinnedTasksOpen ? 'chevronDown' : 'chevronRight'} size={14} />
                          </button>
                          <div className="sbPinnedTitle">Tasks</div>
                          <span className="sbDragHandle" title="Drag to reorder">
                            <Icon name="dots" size={12} />
                          </span>
                        </div>
                        {explorerPinnedTasksOpen ? (
                          <div className="sbTasks">
                            <div className="sbTasksRow">
                              <input className="sbTasksSearch" value={explorerTaskQuery} onChange={(e) => setExplorerTaskQuery(e.target.value)} placeholder="Search tasks…" />
                            </div>
                            <div className="sbTasksRow">
                              <input
                                className="sbTasksQuick"
                                value={explorerTaskDraft}
                                onChange={(e) => setExplorerTaskDraft(e.target.value)}
                                placeholder="Quick add…"
                                onKeyDown={(e) => {
                                  if (e.key !== 'Enter') return
                                  const title = explorerTaskDraft.trim()
                                  if (!title) return
                                  onCreateTaskFromInput({ title })
                                  setExplorerTaskDraft('')
                                }}
                              />
                              <button
                                className="sbTasksAdd"
                                onClick={() => {
                                  const title = explorerTaskDraft.trim()
                                  if (!title) return
                                  onCreateTaskFromInput({ title })
                                  setExplorerTaskDraft('')
                                }}>
                                Add
                              </button>
                            </div>
                            <div className="sbTasksList">
                              {explorerTasks.map((t) => (
                                <div
                                  key={t.id}
                                  className={
                                    t.status === 'done'
                                      ? selection.kind === 'task' && selection.id === t.id
                                        ? 'sbTaskRow done selected'
                                        : 'sbTaskRow done'
                                      : selection.kind === 'task' && selection.id === t.id
                                        ? 'sbTaskRow selected'
                                        : 'sbTaskRow'
                                  }
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData('text/taskId', t.id)
                                    e.dataTransfer.setData('text/taskTitle', t.title)
                                  }}
                                  onClick={() => {
                                    setSelection({ kind: 'task', id: t.id })
                                    setRightCollapsed(false)
                                    setRightMode('details')
                                  }}>
                                  <button
                                    className={t.status === 'done' ? 'sbTaskCheck checked' : 'sbTaskCheck'}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      onToggleTaskComplete(t.id)
                                    }}
                                    aria-label={t.status === 'done' ? 'Mark incomplete' : 'Mark complete'}>
                                    <span className="sbTaskBox" />
                                  </button>
                                  <div className="sbTaskTitle">{t.title}</div>
                                </div>
                              ))}
                              {tasks.filter((t) => t.status !== 'done').length === 0 ? <div className="sbTasksEmpty">No open tasks.</div> : null}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )
                  }
                  if (key === 'habits') {
                    return (
                      <div
                        key="habits"
                        className="sbPinnedGroup"
                        draggable
                        onDragStart={(e) => onPinnedDragStart('habits', e)}
                        onDragOver={onPinnedDragOver}
                        onDrop={(e) => onPinnedDrop('habits', e)}>
                        <div className="sbPinnedHead">
                          <button className="sbSectionToggle" onClick={() => setExplorerPinnedHabitsOpen((v) => !v)} aria-label="Toggle habits">
                            <Icon name={explorerPinnedHabitsOpen ? 'chevronDown' : 'chevronRight'} size={14} />
                          </button>
                          <div className="sbPinnedTitle">Habits</div>
                          <span className="sbDragHandle" title="Drag to reorder">
                            <Icon name="dots" size={12} />
                          </span>
                        </div>
                        {explorerPinnedHabitsOpen ? (
                          <div className="sbQuickList">
                            {habitDefs.length === 0 ? (
                              <div className="sbQuickEmpty">No habits yet. Add one in the Habits tab.</div>
                            ) : (
                              habitDefs.map((h) => (
                                <div
                                  key={h.id}
                                  className="sbQuickRow"
                                  draggable
                                  onDragStart={(e) => {
                                    const payload = {
                                      id: h.id,
                                      name: h.name,
                                      tags: h.tags ?? [],
                                      category: h.category ?? null,
                                      subcategory: h.subcategory ?? null,
                                      estimateMinutes: h.estimateMinutes ?? 15,
                                    }
                                    e.dataTransfer.setData(DND_HABIT, JSON.stringify(payload))
                                    e.dataTransfer.setData('text/plain', h.name)
                                  }}>
                                  <span className="sbQuickIcon">
                                    <Icon name="check" size={12} />
                                  </span>
                                  <div className="sbQuickTitle">{h.name}</div>
                                  <div className="sbQuickMeta">{h.category ?? 'Habit'}</div>
                                </div>
                              ))
                            )}
                          </div>
                        ) : null}
                      </div>
                    )
                  }
                  if (key === 'trackers') {
                    return (
                      <div
                        key="trackers"
                        className="sbPinnedGroup"
                        draggable
                        onDragStart={(e) => onPinnedDragStart('trackers', e)}
                        onDragOver={onPinnedDragOver}
                        onDrop={(e) => onPinnedDrop('trackers', e)}>
                        <div className="sbPinnedHead">
                          <button className="sbSectionToggle" onClick={() => setExplorerPinnedTrackersOpen((v) => !v)} aria-label="Toggle trackers">
                            <Icon name={explorerPinnedTrackersOpen ? 'chevronDown' : 'chevronRight'} size={14} />
                          </button>
                          <div className="sbPinnedTitle">Trackers</div>
                          <span className="sbDragHandle" title="Drag to reorder">
                            <Icon name="dots" size={12} />
                          </span>
                        </div>
                        {explorerPinnedTrackersOpen ? (
                          <div className="sbQuickList">
                            {trackerDefs.length === 0 ? (
                              <div className="sbQuickEmpty">No trackers yet.</div>
                            ) : (
                              trackerDefs.map((t) => (
                                <div
                                  key={t.key}
                                  className="sbQuickRow"
                                  draggable
                                  onDragStart={(e) => {
                                    const payload = { key: t.key, label: t.label, defaultValue: t.defaultValue ?? null }
                                    e.dataTransfer.setData(DND_TRACKER, JSON.stringify(payload))
                                    e.dataTransfer.setData('text/plain', t.label)
                                  }}>
                                  <span className="sbQuickIcon">
                                    <Icon name={t.icon ?? 'sparkle'} size={12} />
                                  </span>
                                  <div className="sbQuickTitle">{t.label}</div>
                                  <div className="sbQuickMeta">Tracker</div>
                                </div>
                              ))
                            )}
                          </div>
                        ) : null}
                      </div>
                    )
                  }
                  if (key === 'shortcuts') {
                    return (
                      <div
                        key="shortcuts"
                        className="sbPinnedGroup"
                        draggable
                        onDragStart={(e) => onPinnedDragStart('shortcuts', e)}
                        onDragOver={onPinnedDragOver}
                        onDrop={(e) => onPinnedDrop('shortcuts', e)}>
                        <div className="sbPinnedHead">
                          <button className="sbSectionToggle" onClick={() => setExplorerPinnedShortcutsOpen((v) => !v)} aria-label="Toggle shortcuts">
                            <Icon name={explorerPinnedShortcutsOpen ? 'chevronDown' : 'chevronRight'} size={14} />
                          </button>
                          <div className="sbPinnedTitle">Shortcuts</div>
                          <span className="sbDragHandle" title="Drag to reorder">
                            <Icon name="dots" size={12} />
                          </span>
                        </div>
                        {explorerPinnedShortcutsOpen ? (
                          <div className="sbQuickList">
                            <button className="sbItem" onClick={() => openView('calendar')}>
                              Calendar
                            </button>
                            <button className="sbItem" onClick={() => openView('notes')}>
                              Notes
                            </button>
                            <button className="sbItem" onClick={() => openView('assistant')}>
                              Chat
                            </button>
                            <button className="sbItem" onClick={() => openView('settings')}>
                              Settings
                            </button>
                          </div>
                        ) : null}
                      </div>
                    )
                  }
                  return null
                })}
              </div>
            ) : null}
          </div>
          <div className="sbSection">
            <div className="sbSectionHead">
              <button className="sbSectionToggle" onClick={() => setExplorerRecentOpen((v) => !v)} aria-label="Toggle recent notes">
                <Icon name={explorerRecentOpen ? 'chevronDown' : 'chevronRight'} size={16} />
              </button>
              <div className="sbSectionTitleInline">Recent Notes</div>
            </div>
            {explorerRecentOpen ? (
              <div className="sbTree">
                {captures.slice(0, 12).map((c) => {
                  const title = (c.rawText.split(/\\r?\\n/)[0] ?? '').trim()
                  const snippet = c.rawText.replace(/\\s+/g, ' ').slice(0, 72)
                  return (
                    <button
                      key={c.id}
                      className={selection.kind === 'capture' && selection.id === c.id ? 'sbTreeBtn active' : 'sbTreeBtn'}
                      onClick={() => {
                        setSelection({ kind: 'capture', id: c.id })
                        setRightCollapsed(false)
                        setRightMode('details')
                        openView('notes')
                      }}
                      title={c.rawText}>
                      <span className="sbTreeTitle">{(title || 'Untitled').slice(0, 40)}</span>
                      <span className="sbTreeMeta">{new Date(c.createdAt).toLocaleDateString()}</span>
                      <span className="sbTreeSnippet">{snippet}</span>
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>
          <div className="sbSection">
            <div className="sbSectionHead">
              <button className="sbSectionToggle" onClick={() => setExplorerPomoOpen((v) => !v)} aria-label="Toggle pomodoro">
                <Icon name={explorerPomoOpen ? 'chevronDown' : 'chevronRight'} size={16} />
              </button>
              <div className="sbSectionTitleInline">Pomodoro</div>
            </div>
	            {explorerPomoOpen ? (
	              <div className="sbPomodoro">
	                <div className="pomoHeader">
	                  <div className="pomoTitle">Ready To Start</div>
	                </div>
                <div className="pomoCircle" style={{ ['--pomo' as any]: pomoProgress }}>
                  <div className="pomoTime">
                    {String(pomoMinutes).padStart(2, '0')}:{String(pomoRemainder).padStart(2, '0')}
                  </div>
                </div>
                <div className="pomoActions">
                  <button className="pomoBtn" onClick={() => setPomoRunning((v) => !v)} aria-label={pomoRunning ? 'Pause' : 'Start'}>
                    {pomoRunning ? 'Pause' : 'Start'}
                  </button>
                  <button
                    className="pomoBtn secondary"
                    onClick={() => {
                      setPomoRunning(false)
                      setPomoSeconds(25 * 60)
                    }}>
                    Reset
                  </button>
                </div>
	                <div className="pomoTask">
	                  <div className="pomoTaskLabel">Active task</div>
	                  <div className="pomoTaskValueRow">
	                    <div className="pomoTaskValue">{pomoActiveTask?.title ?? selectedTask?.title ?? '—'}</div>
	                    <button
	                      className="pomoTaskClear"
	                      onClick={() => setPomoActiveTaskId(null)}
	                      disabled={!pomoActiveTaskId}
	                      aria-label="Clear active task">
	                      ×
	                    </button>
	                  </div>
	                  <div className="pomoPickRow">
	                    <button
	                      className="pomoPickBtn"
	                      onClick={() => {
	                        if (!selectedTask) return
	                        setPomoActiveTaskId(selectedTask.id)
	                      }}
	                      disabled={!selectedTask}
	                      aria-label="Set active task to selected task">
	                      Use selected
	                    </button>
	                    <button
	                      className="pomoPickBtn secondary"
	                      onClick={() => openView('tasks')}
	                      aria-label="Open tasks">
	                      Open tasks
	                    </button>
	                  </div>
	                  <div className="pomoPickList" aria-label="Quick pick tasks">
	                    {explorerTasks.slice(0, 6).map((t) => (
	                      <button
	                        key={t.id}
	                        className={t.id === pomoActiveTaskId ? 'pomoPickItem active' : 'pomoPickItem'}
	                        onClick={() => setPomoActiveTaskId(t.id)}>
	                        {t.title}
	                      </button>
	                    ))}
	                    {explorerTasks.length === 0 ? <div className="pomoPickEmpty">No open tasks.</div> : null}
	                  </div>
	                </div>
	                <div className="pomoNotes">
	                  <div className="pomoNotesLabel">Recent notes</div>
	                  <div className="pomoNotesList" aria-label="Recent notes">
	                    {captures.slice(0, 3).map((c) => {
	                      const title = (c.rawText.split(/\r?\n/)[0] ?? '').trim() || 'Untitled'
	                      return (
	                        <button
	                          key={c.id}
	                          className="pomoNoteItem"
	                          onClick={() => {
	                            setSelection({ kind: 'capture', id: c.id })
	                            setRightCollapsed(false)
	                            setRightMode('details')
	                            openView('notes')
	                          }}
	                          title={c.rawText}>
	                          {title}
	                        </button>
	                      )
	                    })}
	                  </div>
	                </div>
	              </div>
	            ) : null}
	          </div>
	        </aside>

      <div className="ws">
        <Pane
          tabs={workspace.tabs}
          activeTabId={workspace.activeTabId}
          onActivate={(id) => setWorkspace((p) => ({ ...p, activeTabId: id }))}
          onClose={(id) => closeTab(id)}>
          {renderView(active.view)}
        </Pane>
      </div>

	      <AnimatePresence>
	      {rightCollapsed ? null : (
	        <motion.aside
	          className="details"
	          initial={{ x: 16, opacity: 0 }}
	          animate={{ x: 0, opacity: 1 }}
	          exit={{ x: 16, opacity: 0 }}
	          transition={{ duration: 0.16, ease: 'easeOut' }}>
	        <div className="detailsHeader">
	          <div className="detailsHeaderRow">
	            <div>
	              <div className="detailsTitle">{rightMode === 'ai' ? 'AI' : 'Details'}</div>
              <div className="detailsSub">{rightMode === 'ai' ? 'Chat with your notes and calendar.' : 'Edit fields like importance and difficulty/energy plus notes.'}</div>
	            </div>
	            <div className="detailsHeaderActions">
	              <button
	                className={rightMode === 'ai' ? 'detailsIconBtn active' : 'detailsIconBtn'}
	                onClick={() => setRightMode((m) => (m === 'ai' ? 'details' : 'ai'))}
	                aria-label="Toggle AI">
	                <Icon name="sparkle" size={16} />
	              </button>
	              <button
	                className="detailsIconBtn"
	                onClick={() => {
	                  if (rightMode === 'ai') openView('assistant')
	                  else setDocOpen(true)
	                }}
	                aria-label={rightMode === 'ai' ? 'Open full chat' : 'Open page'}>
	                <Icon name="maximize" size={16} />
	              </button>
	              <button className="detailsIconBtn" onClick={() => setRightCollapsed(true)} aria-label="Collapse right panel">
	                <Icon name="panelRight" size={16} />
	              </button>
	            </div>
	          </div>
	        </div>

	        {rightMode === 'ai' ? (
	          <div className="detailsBody">
		            <AssistantView
		              embedded
		              captures={captures}
		              events={events}
		              tasks={tasks}
		              onSelectCapture={(id) => {
		                setSelection({ kind: 'capture', id })
		                setRightMode('details')
		              }}
		              onSelectEvent={(id) => {
		                setSelection({ kind: 'event', id })
		                setRightMode('details')
		              }}
		              onSelectTask={(id) => {
		                setSelection({ kind: 'task', id })
		                setRightMode('details')
		              }}
		            />
	          </div>
	        ) : selection.kind === 'none' ? (
	          <div className="detailsBody">
	            <div className="detailCard">
	              <div className="detailTitle">No selection</div>
	              <div className="detailMeta">Click a task or calendar event to edit.</div>
	            </div>
	          </div>
	        ) : selection.kind === 'task' && selectedTask ? (
	          <div className="detailsBody">
	            <div className="detailCard">
              <div className="detailTitle">Task</div>
              <div className="detailBadgeRow">
                <span className="detailBadge">{selectedTask.status}</span>
                <button
                  className={selectedTask.status === 'done' ? 'detailToggle active' : 'detailToggle'}
                  onClick={() => onToggleTaskComplete(selectedTask.id)}>
                  {selectedTask.status === 'done' ? 'Completed' : 'Mark complete'}
                </button>
                <button className="secondaryButton" onClick={() => requestDeleteSelection()}>
                  Delete
                </button>
              </div>
              <input
                className="detailInput"
                value={selectedTask.title}
                onChange={(e) => commitTask({ ...selectedTask, title: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    ;(e.target as HTMLInputElement).blur()
                    setSelection({ kind: 'none' })
                  }
                }}
                placeholder="Task title..."
              />
              <div className="detailRow">
                <label className="detailLabel">
                  Tags
                  <input
                    className="detailSmall"
                    value={(selectedTask.tags ?? []).join(' ')}
                    onChange={(e) => commitTask({ ...selectedTask, tags: parseTags(e.target.value) })}
                    placeholder="#work #health"
                  />
                </label>
              </div>
              <div className="detailRow">
                <div className="detailLabel">Context</div>
                <div className="detailChips">
                  {selectedTaskContexts.map((ctx) => (
                    <button
                      key={ctx}
                      className="detailChip"
                      onClick={() => commitTask({ ...selectedTask, contexts: selectedTaskContexts.filter((x) => x !== ctx) })}
                      type="button">
                      {formatContextLabel(ctx)}
                      <span className="detailChipRemove">×</span>
                    </button>
                  ))}
                  <input
                    className="detailChipInput"
                    value={contextDraft}
                    onChange={(e) => setContextDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' && e.key !== ',') return
                      e.preventDefault()
                      const next = parseContexts(contextDraft)
                      if (!next.length) return
                      const merged = uniqStrings([...(selectedTask.contexts ?? []), ...next].map((c) => normalizeContextToken(c) ?? '').filter(Boolean))
                      commitTask({ ...selectedTask, contexts: merged })
                      setContextDraft('')
                    }}
                    onBlur={() => {
                      const next = parseContexts(contextDraft)
                      if (!next.length) return
                      const merged = uniqStrings([...(selectedTask.contexts ?? []), ...next].map((c) => normalizeContextToken(c) ?? '').filter(Boolean))
                      commitTask({ ...selectedTask, contexts: merged })
                      setContextDraft('')
                    }}
                    placeholder="at computer, at email"
                  />
                </div>
              </div>
              <div className="detailGrid">
                <label>
                  Due
                  <input
                    className="detailSmall"
                    type="datetime-local"
                    value={toLocalDateTimeInput(selectedTask.dueAt)}
                    onChange={(e) => commitTask({ ...selectedTask, dueAt: fromLocalDateTimeInput(e.target.value) })}
                  />
                </label>
                <label>
                  Scheduled
                  <input
                    className="detailSmall"
                    type="datetime-local"
                    value={toLocalDateTimeInput(selectedTask.scheduledAt)}
                    onChange={(e) => commitTask({ ...selectedTask, scheduledAt: fromLocalDateTimeInput(e.target.value) })}
                  />
                </label>
              </div>
	              <div className="detailGrid">
	                <label>
	                  Goal
	                  <input
	                    className="detailSmall"
	                    value={selectedTask.goal ?? ''}
	                    onChange={(e) => commitTask({ ...selectedTask, goal: e.target.value || null })}
	                    placeholder="get shredded"
	                  />
	                </label>
	                <label>
	                  Project
	                  <input
	                    className="detailSmall"
	                    value={selectedTask.project ?? ''}
	                    onChange={(e) => commitTask({ ...selectedTask, project: e.target.value || null })}
	                    placeholder="workout plan"
	                  />
	                </label>
	              </div>
		              <div className="detailGrid">
		                <label>
		                  Category
		                  <input
		                    className="detailSmall"
		                    list="taxCatList"
		                    value={selectedTask.category ?? ''}
		                    onChange={(e) => commitTask({ ...selectedTask, category: e.target.value || null })}
		                    placeholder="Work / Health / Study"
		                  />
		                </label>
		                <label>
		                  Subcategory
		                  <input
		                    className="detailSmall"
		                    list="taxSubcatList"
		                    value={selectedTask.subcategory ?? ''}
		                    onChange={(e) => commitTask({ ...selectedTask, subcategory: e.target.value || null })}
		                    placeholder="Clinic / Surgery / Gym"
		                  />
		                </label>
		              </div>
	              <div className="detailGrid">
	                <label>
	                  Importance
	                  <div className="detailRangeRow">
	                    <input
	                      className="detailRange"
	                      type="range"
	                      min={0}
	                      max={10}
	                      step={1}
	                      value={selectedTask.importance ?? 5}
	                      onChange={(e) => commitTask({ ...selectedTask, importance: Number(e.target.value) })}
	                      aria-label="Importance"
	                    />
	                    <span className="detailRangeValue">{selectedTask.importance ?? '—'}</span>
	                    <button
	                      className="detailRangeClear"
	                      type="button"
	                      onClick={() => commitTask({ ...selectedTask, importance: null })}
	                      disabled={selectedTask.importance == null}
	                      aria-label="Clear importance">
	                      ×
	                    </button>
	                  </div>
	                </label>
                <label>
                  Difficulty / Energy
                  <div className="detailRangeRow">
                    <input
                      className="detailRange"
                      type="range"
                      min={0}
                      max={10}
                      step={1}
                      value={selectedTask.difficulty ?? 5}
                      onChange={(e) => commitTask({ ...selectedTask, difficulty: Number(e.target.value) })}
                      aria-label="Difficulty / Energy"
                    />
                    <span className="detailRangeValue">{selectedTask.difficulty ?? '—'}</span>
                    <button
                      className="detailRangeClear"
                      type="button"
                      onClick={() => commitTask({ ...selectedTask, difficulty: null })}
                      disabled={selectedTask.difficulty == null}
                      aria-label="Clear difficulty or energy">
                      ×
                    </button>
                  </div>
                </label>
	                <label>
	                  Estimate (min)
	                  <input
	                    className="detailSmall"
                    value={selectedTask.estimateMinutes ?? ''}
                    onChange={(e) => commitTask({ ...selectedTask, estimateMinutes: numberOrNull(e.target.value) })}
                    placeholder="25"
                  />
                </label>
	              </div>
	              {(() => {
	                const items = parseChecklistMarkdown(selectedTask.notes)
	                if (!items.length) return null
	                const remaining = items.filter((x) => !x.checked).length
	                return (
	                  <div className="detailRow" style={{ marginTop: 8 }}>
	                    <div className="detailLabel" style={{ marginBottom: 6 }}>
	                      Checklist <span style={{ color: 'var(--muted)', fontWeight: 800 }}>({remaining}/{items.length})</span>
	                    </div>
	                    <div className="detailChecklist" aria-label="Task checklist">
	                      {items.slice(0, 24).map((it) => (
	                        <button
	                          key={`${selectedTask.id}_${it.lineIndex}`}
	                          className={it.checked ? 'detailCheckItem checked' : 'detailCheckItem'}
	                          onClick={() => commitTask({ ...selectedTask, notes: toggleChecklistLine(selectedTask.notes, it.lineIndex) })}
	                          aria-label={it.checked ? `Uncheck ${it.text}` : `Check ${it.text}`}>
	                          <span className="detailCheckBox" aria-hidden="true" />
	                          <span className="detailCheckText">{it.text}</span>
	                        </button>
	                      ))}
	                    </div>
	                  </div>
	                )
	              })()}
	            </div>
	          </div>
	        ) : selection.kind === 'event' && selectedEvent ? (
          <div className="detailsBody">
            <div className="detailCard">
              {selectedEvent.active ? (
                <div className="detailActiveSession">
                  <ActiveSessionBanner
                    title={selectedEvent.title}
                    category={selectedEvent.category}
                    subcategory={selectedEvent.subcategory}
                    startedAt={selectedEvent.startAt}
                    estimatedMinutes={selectedEvent.estimateMinutes ?? Math.round((selectedEvent.endAt - selectedEvent.startAt) / (60 * 1000))}
                    importance={selectedEvent.importance}
                    difficulty={selectedEvent.difficulty}
                    goal={selectedEvent.goal}
                    project={selectedEvent.project}
                    onStop={() => {
                      const now = Date.now()
                      commitEvent({ ...selectedEvent, endAt: Math.max(now, selectedEvent.startAt + 5 * 60 * 1000), active: false })
                    }}
                  />
                </div>
              ) : null}
              <div className="detailBadgeRow">
                <span className="detailBadge">{selectedEvent.kind ?? 'event'}</span>
                {selectedEvent.kind !== 'log' ? (
                  <button
                    className={selectedEvent.allDay ? 'detailToggle active' : 'detailToggle'}
                    onClick={() => commitEvent({ ...selectedEvent, allDay: !selectedEvent.allDay })}>
                    All-day
                  </button>
                ) : null}
                {selectedEvent.kind === 'task' ? (
                  <button className={selectedEvent.completedAt ? 'detailToggle active' : 'detailToggle'} onClick={() => onToggleEventComplete(selectedEvent.id)}>
                    {selectedEvent.completedAt ? 'Completed' : 'Mark complete'}
                  </button>
                ) : null}
                {selectedEvent.kind !== 'log' ? (
                  <button
                    className={selectedEvent.active ? 'detailToggle active' : 'detailToggle'}
                    onClick={() => {
                      if (selectedEvent.active) {
                        const now = Date.now()
                        commitEvent({ ...selectedEvent, endAt: Math.max(now, selectedEvent.startAt + 5 * 60 * 1000), active: false })
                      } else {
                        commitEvent({ ...selectedEvent, active: true })
                      }
                    }}>
                    {selectedEvent.active ? 'Active' : 'Inactive'}
                  </button>
                ) : null}
                <button
                  className="secondaryButton detailAiBtn"
                  onClick={() => {
                    setCaptureDraft('')
                    setCaptureInterim('')
                    openCapture({ attachEventId: selectedEvent.id })
                  }}>
                  <Icon name="sparkle" size={14} />
                  Magic
                </button>
                <button className="secondaryButton" onClick={() => autoFillEventFromText(selectedEvent)}>
                  Auto-fill
                </button>
                <button className="secondaryButton" onClick={() => requestDeleteSelection()}>
                  Delete
                </button>
              </div>
              {selectedEvent.kind !== 'log' ? (
                <div className="detailActions" style={{ marginTop: 8 }}>
                  <button
                    className="secondaryButton"
                    onClick={() => {
                      const now = Date.now()
                      const dur = Math.max(5 * 60 * 1000, selectedEvent.endAt - selectedEvent.startAt)
                      commitEvent({ ...selectedEvent, startAt: now, endAt: now + dur, active: true })
                    }}>
                    Start now
                  </button>
                  <button
                    className="secondaryButton"
                    onClick={() => {
                      setCaptureDraft('')
                      setCaptureInterim('')
                      openCapture({ attachEventId: selectedEvent.id })
                    }}>
                    Take note
                  </button>
                  <button
                    className="secondaryButton"
                    onClick={() => {
                      const now = Date.now()
                      commitEvent({ ...selectedEvent, endAt: Math.max(now, selectedEvent.startAt + 5 * 60 * 1000), active: false })
                    }}
                    disabled={!selectedEvent.active}>
                    Stop now
                  </button>
                </div>
              ) : null}
              <input
                className="detailInput"
                value={selectedEvent.title}
                onChange={(e) => commitEvent({ ...selectedEvent, title: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    ;(e.target as HTMLInputElement).blur()
                    setSelection({ kind: 'none' })
                  }
                }}
                placeholder="Event title..."
              />
              <div className="detailGrid">
                <label>
                  Start
                  <input
                    className="detailSmall"
                    type="datetime-local"
                    value={toLocalDateTimeInput(selectedEvent.startAt)}
                    onChange={(e) => {
                      const ms = fromLocalDateTimeInput(e.target.value)
                      if (!ms) return
                      const dur = Math.max(5 * 60 * 1000, selectedEvent.endAt - selectedEvent.startAt)
                      commitEvent({ ...selectedEvent, startAt: ms, endAt: ms + dur })
                    }}
                  />
                </label>
                <label>
                  End
                  <input
                    className="detailSmall"
                    type="datetime-local"
                    value={toLocalDateTimeInput(selectedEvent.endAt)}
                    onChange={(e) => {
                      const ms = fromLocalDateTimeInput(e.target.value)
                      if (!ms) return
                      commitEvent({ ...selectedEvent, endAt: Math.max(ms, selectedEvent.startAt + 5 * 60 * 1000) })
                    }}
                  />
                </label>
              </div>
              <div className="detailGrid">
                <label>
                  Icon
                  <div className="detailIconSelect">
                    <select
                      className="detailSmall"
                      value={selectedEvent.icon ?? ''}
                      onChange={(e) => commitEvent({ ...selectedEvent, icon: e.target.value || null })}>
                      <option value="">Auto</option>
                      {EVENT_ICON_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <span className="detailIconPreview">
                      <Icon name={eventAccent(selectedEvent).icon} size={14} />
                    </span>
                  </div>
                </label>
                <label>
                  Color
                  <div className="detailColorRow">
                    <input
                      className="detailColorInput"
                      type="color"
                      value={selectedEvent.color ?? eventAccent(selectedEvent).color}
                      onChange={(e) => commitEvent({ ...selectedEvent, color: e.target.value })}
                    />
                    <button className="detailColorAuto" onClick={() => commitEvent({ ...selectedEvent, color: null })}>
                      Auto
                    </button>
                  </div>
                  <div className="detailSwatches">
                    {EVENT_COLOR_PRESETS.slice(0, 9).map((c) => (
                      <button
                        key={c.hex}
                        className={selectedEvent.color === c.hex ? 'detailSwatch active' : 'detailSwatch'}
                        title={c.name}
                        style={{ background: c.hex }}
                        onClick={() => commitEvent({ ...selectedEvent, color: c.hex })}
                      />
                    ))}
                  </div>
                </label>
              </div>

              {/* Notes Section - moved up from bottom */}
              <div className="detailRow detailNotesSection" style={{ marginTop: 12 }}>
                <div className="detailLabelRow">
                  <div className="detailLabel">Notes</div>
                  <div className="detailLabelActions">
                    <button
                      className="detailInlineBtn"
                      onClick={() => {
                        setCaptureDraft('')
                        setCaptureInterim('')
                        openCapture({ attachEventId: selectedEvent.id })
                      }}
                      type="button">
                      <Icon name="mic" size={12} />
                      Transcribe
                    </button>
                  </div>
                </div>
                <MarkdownEditor
                  value={selectedEvent.notes ?? ''}
                  onChange={(next) => commitEvent({ ...selectedEvent, notes: next })}
                  onToggleChecklist={(lineIndex) => {
                    if (selectedEvent.kind === 'task' && selectedEvent.taskId) {
                      onToggleTaskChecklistItem(selectedEvent.taskId, lineIndex)
                      return
                    }
                    commitEvent({ ...selectedEvent, notes: toggleChecklistLine(selectedEvent.notes, lineIndex) })
                  }}
                  onStartTask={(task) => onStartNoteTask(selectedEvent.id, task)}
                  taskStateByToken={selectedEventNoteTasks}
                  nowMs={nowTick}
                  placeholder="Write notes…"
                  ariaLabel="Event notes"
                />
                <button
                  className="secondaryButton detailSegmentBtn"
                  onClick={() => {
                    const label = window.prompt('Segment label (e.g., Inpatient)')
                    if (!label) return
                    const t = new Date()
                    const hh = String(t.getHours()).padStart(2, '0')
                    const mm = String(t.getMinutes()).padStart(2, '0')
                    const next = `${(selectedEvent.notes ?? '').trim()}\n**${hh}:${mm}** - ${label}\n`
                    commitEvent({ ...selectedEvent, notes: next.trim() })
                  }}>
                  + Segment
                </button>
              </div>

              {/* Collapsible Properties Section */}
              <button
                className="detailPropsHeader"
                onClick={() => setPropsCollapsed(!propsCollapsed)}
                type="button">
                <span className="detailPropsLabel">Properties</span>
                <span className={propsCollapsed ? 'detailPropsChevron' : 'detailPropsChevron open'}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </button>

              {!propsCollapsed && (
                <>
              <div className="detailRow">
                <div className="detailLabel">Tags</div>
                <div className="detailChips">
                  {selectedEventTags.map((t) => (
                    <button
                      key={t}
                      className="detailChip"
                      onClick={() => commitEvent({ ...selectedEvent, tags: selectedEventTags.filter((x) => x !== t) })}
                      type="button">
                      {t}
                      <span className="detailChipRemove">×</span>
                    </button>
                  ))}
                  <input
                    className="detailChipInput"
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' && e.key !== ',' && e.key !== ' ') return
                      e.preventDefault()
                      const next = parseTags(tagDraft)
                      if (!next.length) return
                      const merged = uniqStrings([...selectedEventTags, ...next].map(normalizeHashTag).filter(Boolean))
                      commitEvent({ ...selectedEvent, tags: merged })
                      setTagDraft('')
                    }}
                    onBlur={() => {
                      const next = parseTags(tagDraft)
                      if (!next.length) return
                      const merged = uniqStrings([...selectedEventTags, ...next].map(normalizeHashTag).filter(Boolean))
                      commitEvent({ ...selectedEvent, tags: merged })
                      setTagDraft('')
                    }}
                    placeholder="#work #meeting"
                  />
                </div>
              </div>
              <div className="detailRow">
                <div className="detailLabel">Context</div>
                <div className="detailChips">
                  {selectedEventContexts.map((ctx) => (
                    <button
                      key={ctx}
                      className="detailChip"
                      onClick={() => commitEvent({ ...selectedEvent, contexts: selectedEventContexts.filter((x) => x !== ctx) })}
                      type="button">
                      {formatContextLabel(ctx)}
                      <span className="detailChipRemove">×</span>
                    </button>
                  ))}
                  <input
                    className="detailChipInput"
                    value={contextDraft}
                    onChange={(e) => setContextDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' && e.key !== ',') return
                      e.preventDefault()
                      const next = parseContexts(contextDraft)
                      if (!next.length) return
                      const merged = uniqStrings([...(selectedEvent.contexts ?? []), ...next].map((c) => normalizeContextToken(c) ?? '').filter(Boolean))
                      commitEvent({ ...selectedEvent, contexts: merged })
                      setContextDraft('')
                    }}
                    onBlur={() => {
                      const next = parseContexts(contextDraft)
                      if (!next.length) return
                      const merged = uniqStrings([...(selectedEvent.contexts ?? []), ...next].map((c) => normalizeContextToken(c) ?? '').filter(Boolean))
                      commitEvent({ ...selectedEvent, contexts: merged })
                      setContextDraft('')
                    }}
                    placeholder="at computer, at email"
                  />
                </div>
              </div>
              <div className="detailGrid">
                <label>
                  Estimate (min)
                  <input
                    className="detailSmall"
                    value={selectedEvent.estimateMinutes ?? ''}
                    onChange={(e) => commitEvent({ ...selectedEvent, estimateMinutes: numberOrNull(e.target.value) })}
                    placeholder="30"
                  />
                </label>
                <label>
                  Location
                  <div className="detailChips">
                    {selectedEventLocations.map((loc) => (
                      <button
                        key={loc}
                        className="detailChip"
                        onClick={() => {
                          const next = selectedEventLocations.filter((x) => x !== loc)
                          commitEvent({ ...selectedEvent, location: next.length ? next.join(', ') : null })
                        }}
                        type="button">
                        {loc}
                        <span className="detailChipRemove">×</span>
                      </button>
                    ))}
                    <input
                      className="detailChipInput"
                      value={locationDraft}
                      onChange={(e) => setLocationDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter' && e.key !== ',') return
                        e.preventDefault()
                        const next = parseCommaList(locationDraft)
                        if (!next.length) return
                        const merged = uniqStrings([...selectedEventLocations, ...next])
                        commitEvent({ ...selectedEvent, location: merged.length ? merged.join(', ') : null })
                        setLocationDraft('')
                      }}
                      onBlur={() => {
                        const next = parseCommaList(locationDraft)
                        if (!next.length) return
                        const merged = uniqStrings([...selectedEventLocations, ...next])
                        commitEvent({ ...selectedEvent, location: merged.length ? merged.join(', ') : null })
                        setLocationDraft('')
                      }}
                      placeholder="Home"
                    />
                  </div>
                </label>
              </div>
              <div className="detailGrid">
                <label>
                  Points
                  <div className="detailPoints">
                    <div className="detailPointsValue">{selectedEventPoints.toFixed(1)}</div>
                    <div className="detailPointsMeta">
                      {selectedEventBase} × {formatMinutesSpan(selectedEventMinutes)} ÷ 60 × {selectedEventMult.toFixed(2)}
                    </div>
                  </div>
                </label>
                <label>
                  Running
                  <div className="detailPoints">
                    <div className="detailPointsValue">{selectedEvent.active ? 'Active' : '—'}</div>
                    <div className="detailPointsMeta">
                      {selectedEvent.active ? `${formatMinutesSpan(selectedEventMinutes)} elapsed` : 'Not running'}
                    </div>
                  </div>
                </label>
              </div>
              <div className="detailRow">
                <div className="detailLabel">People</div>
                <div className="detailChips">
                  {selectedEventPeople.map((p) => (
                    <button
                      key={p}
                      className="detailChip"
                      onClick={() => commitEvent({ ...selectedEvent, people: selectedEventPeople.filter((x) => x !== p) })}
                      type="button">
                      {p}
                      <span className="detailChipRemove">×</span>
                    </button>
                  ))}
                  <input
                    className="detailChipInput"
                    value={peopleDraft}
                    onChange={(e) => setPeopleDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' && e.key !== ',') return
                      e.preventDefault()
                      const next = parseCommaList(peopleDraft)
                      if (!next.length) return
                      const merged = uniqStrings([...selectedEventPeople, ...next])
                      commitEvent({ ...selectedEvent, people: merged })
                      setPeopleDraft('')
                    }}
                    onBlur={() => {
                      const next = parseCommaList(peopleDraft)
                      if (!next.length) return
                      const merged = uniqStrings([...selectedEventPeople, ...next])
                      commitEvent({ ...selectedEvent, people: merged })
                      setPeopleDraft('')
                    }}
                    placeholder="Mom, Alex"
                  />
                </div>
              </div>
	              {selectedEventLogs.length ? (
	                <div className="detailRow">
	                  <div className="detailLabel">
	                    Running sheet
	                    <div className="detailLogList">
	                      {selectedEventLogs.map((l) => (
                        <button
                          key={l.id}
                          className="detailLogRow"
                          onClick={() => {
                            setSelection({ kind: 'event', id: l.id })
                            setRightMode('details')
                          }}>
                          <span className="detailLogTime">{new Date(l.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="detailLogTitle">{l.title}</span>
                        </button>
                      ))}
	                    </div>
	                  </div>
	                </div>
	              ) : null}
		              {selectedEventTasks.length ? (
		                <div className="detailRow">
		                  <div className="detailLabel">
		                    Linked tasks
		                    <div className="detailLogList">
		                      {selectedEventTasks.map((t) => {
		                        const checklist = parseChecklistMarkdown(t.notes)
		                        const remaining = checklist.filter((x) => !x.checked).length
		                        const checklistHint = checklist.length ? ` • ${remaining}/${checklist.length}` : ''
		                        return (
		                          <div key={t.id} className="detailTaskRow">
		                            <button
		                              className={t.status === 'done' ? 'detailTaskCheck checked' : 'detailTaskCheck'}
		                              onClick={() => onToggleTaskComplete(t.id)}
		                              aria-label={t.status === 'done' ? 'Mark incomplete' : 'Mark complete'}>
		                              <Icon name="check" size={14} />
		                            </button>
		                            <button
		                              className="detailTaskOpen"
		                              onClick={() => {
		                                setSelection({ kind: 'task', id: t.id })
		                                setRightMode('details')
		                              }}
		                              title={t.title}>
		                              <span className="detailTaskTitle">{t.title}</span>
		                              <span className="detailTaskMeta">{t.status}{checklistHint}</span>
		                            </button>
		                          </div>
		                        )
		                      })}
		                    </div>
		                  </div>
		                </div>
		              ) : null}
              <div className="detailRow">
                <div className="detailLabel">Skills</div>
                <div className="detailChips">
                  {selectedEventSkills.map((skill) => (
                    <button
                      key={skill}
                      className="detailChip"
                      onClick={() => commitEvent({ ...selectedEvent, skills: selectedEventSkills.filter((x) => x !== skill) })}
                      type="button">
                      {skill}
                      <span className="detailChipRemove">×</span>
                    </button>
                  ))}
                  <input
                    className="detailChipInput"
                    value={skillDraft}
                    onChange={(e) => setSkillDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' && e.key !== ',') return
                      e.preventDefault()
                      const next = parseCommaList(skillDraft)
                      if (!next.length) return
                      const merged = uniqStrings([...selectedEventSkills, ...next])
                      commitEvent({ ...selectedEvent, skills: merged })
                      setSkillDraft('')
                    }}
                    onBlur={() => {
                      const next = parseCommaList(skillDraft)
                      if (!next.length) return
                      const merged = uniqStrings([...selectedEventSkills, ...next])
                      commitEvent({ ...selectedEvent, skills: merged })
                      setSkillDraft('')
                    }}
                    placeholder="communication, lifting"
                  />
                </div>
              </div>
	              <div className="detailRow">
	                <label className="detailLabel">
	                  Character
	                  <div className="charGrid" role="group" aria-label="Character stats">
	                    {CHARACTER_KEYS.map((k) => {
	                      const selected = normalizeCharacterSelection(selectedEvent.character).includes(k)
	                      return (
	                        <button
	                          key={k}
	                          className={selected ? 'charChip active' : 'charChip'}
	                          onClick={() => commitEvent({ ...selectedEvent, character: toggleCharacterSelection(selectedEvent.character, k) })}
	                          type="button"
	                          aria-label={selected ? `Remove ${k}` : `Add ${k}`}>
	                          {k}
	                        </button>
	                      )
	                    })}
	                  </div>
	                </label>
	              </div>
	              <div className="detailGrid">
	                <label>
	                  Goal
	                  <input
	                    className="detailSmall"
                    value={selectedEvent.goal ?? ''}
                    onChange={(e) => commitEvent({ ...selectedEvent, goal: e.target.value || null })}
                    placeholder="get shredded"
                  />
	                </label>
	                <label>
	                  Project
	                  <input
	                    className="detailSmall"
                    value={selectedEvent.project ?? ''}
                    onChange={(e) => commitEvent({ ...selectedEvent, project: e.target.value || null })}
                    placeholder="workout plan"
                  />
	                </label>
	              </div>
		              <div className="detailGrid">
		                <label>
		                  Category
		                  <input
		                    className="detailSmall"
		                    list="taxCatList"
		                    value={selectedEvent.category ?? ''}
		                    onChange={(e) => commitEvent({ ...selectedEvent, category: e.target.value || null })}
		                    placeholder="Work / Health / Study"
		                  />
		                </label>
		                <label>
		                  Subcategory
		                  <input
		                    className="detailSmall"
		                    list="taxSubcatList"
		                    value={selectedEvent.subcategory ?? ''}
		                    onChange={(e) => commitEvent({ ...selectedEvent, subcategory: e.target.value || null })}
		                    placeholder="Clinic / Surgery / Gym"
		                  />
		                </label>
		              </div>
		              <div className="detailRow">
		                <div className="detailLabel">Category shortcuts</div>
		                <div className="detailChips">
		                  {taxonomyCategories.slice(0, 12).map((c) => (
		                    <button
		                      key={c}
		                      className={selectedEvent.category?.toLowerCase() === c.toLowerCase() ? 'detailChip active' : 'detailChip'}
		                      onClick={() => commitEvent({ ...selectedEvent, category: c })}
		                      type="button">
		                      {c}
		                    </button>
		                  ))}
		                </div>
		              </div>
		              {taxonomySubcategories.length ? (
		                <div className="detailRow">
		                  <div className="detailLabel">Subcategory shortcuts</div>
		                  <div className="detailChips">
		                    {taxonomySubcategories.slice(0, 12).map((c) => (
		                      <button
		                        key={c}
		                        className={selectedEvent.subcategory?.toLowerCase() === c.toLowerCase() ? 'detailChip active' : 'detailChip'}
		                        onClick={() => commitEvent({ ...selectedEvent, subcategory: c })}
		                        type="button">
		                        {c}
		                      </button>
		                    ))}
		                  </div>
		                </div>
		              ) : null}
	              <div className="detailGrid">
	                <label>
	                  Importance
	                  <div className="detailRangeRow">
	                    <input
	                      className="detailRange"
	                      type="range"
	                      min={0}
	                      max={10}
	                      step={1}
	                      value={selectedEvent.importance ?? 5}
	                      onChange={(e) => commitEvent({ ...selectedEvent, importance: Number(e.target.value) })}
	                      aria-label="Importance"
	                    />
	                    <span className="detailRangeValue">{selectedEvent.importance ?? '—'}</span>
	                    <button
	                      className="detailRangeClear"
	                      type="button"
	                      onClick={() => commitEvent({ ...selectedEvent, importance: null })}
	                      disabled={selectedEvent.importance == null}
	                      aria-label="Clear importance">
	                      ×
	                    </button>
	                  </div>
	                </label>
                <label>
                  Difficulty / Energy
                  <div className="detailRangeRow">
                    <input
                      className="detailRange"
                      type="range"
                      min={0}
                      max={10}
                      step={1}
                      value={selectedEvent.difficulty ?? 5}
                      onChange={(e) => commitEvent({ ...selectedEvent, difficulty: Number(e.target.value) })}
                      aria-label="Difficulty / Energy"
                    />
                    <span className="detailRangeValue">{selectedEvent.difficulty ?? '—'}</span>
                    <button
                      className="detailRangeClear"
                      type="button"
                      onClick={() => commitEvent({ ...selectedEvent, difficulty: null })}
                      disabled={selectedEvent.difficulty == null}
                      aria-label="Clear difficulty or energy">
                      ×
                    </button>
                  </div>
                </label>
              </div>
                </>
              )}
            </div>
          </div>
        ) : selection.kind === 'capture' && selectedCapture ? (
          <div className="detailsBody">
            <div className="detailCard">
              <div className="detailTitle">Capture</div>
              <div className="detailMeta">{new Date(selectedCapture.createdAt).toLocaleString()}</div>
              <div className="detailText">{selectedCapture.rawText}</div>
              <div className="detailActions">
                <button className="secondaryButton" onClick={() => openView('assistant')}>
                  Ask about this
                </button>
                <button
                  className="secondaryButton"
                  onClick={() => {
                    setCaptureDraft(selectedCapture.rawText)
                    openCapture()
                  }}>
                  Restore to editor
                </button>
                <button
                  className="secondaryButton"
                  onClick={() => {
                    const titles = extractTaskLines(selectedCapture.rawText)
                    if (titles.length === 0) {
                      alert('No tasks found. Use lines like: "- [ ] pick up dry cleaning"')
                      return
                    }
                    for (const t of titles) onCreateTaskFromInput({ title: t })
                    alert(`Created ${titles.length} task(s) from this note.`)
                  }}>
                  Extract tasks
                </button>
              </div>
            </div>
          </div>
        ) : null}
	        </motion.aside>
	      )}
	                                      </AnimatePresence>
	                              </main>      <button
        className="captureFab"
        onClick={() => {
          openCapture()
          setRightCollapsed(false)
          setRightMode('details')
        }}
        aria-label="Capture">
        <Icon name="plus" size={18} />
      </button>

      {rightCollapsed ? (
        <button className="rightExpand" onClick={() => setRightCollapsed(false)} aria-label="Show details">
          <Icon name="panelRight" />
        </button>
      ) : null}

      <AnimatePresence>
      {eventComposerOpen ? (
        <motion.div
          className="modalOverlay"
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEventComposerOpen(false)
          }}>
          <motion.div
            className="modalCard"
            initial={{ y: 12, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 12, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}>
            <div className="modalHeader">
              <div>
                <div className="modalTitle">New event</div>
                <div className="modalSub">Title + time + tags + people/places + estimate (MVP).</div>
              </div>
              <div className="modalHeaderActions">
                <button className="secondaryButton modalMagic" onClick={() => startComposerTranscription()}>
                  <Icon name="mic" size={14} />
                  Magic
                </button>
                <button className="secondaryButton" onClick={() => autoFillComposerFromText()}>
                  Auto-fill
                </button>
                <button className="modalClose" onClick={() => setEventComposerOpen(false)} aria-label="Close">
                  <Icon name="x" />
                </button>
              </div>
            </div>
            <div className="eventBody">
              <div className="eventTitleRow">
                <input
                  className="eventTitleInput"
                  value={eventComposer.title}
                  onChange={(e) => setEventComposer((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Dinner with @Mom"
                  autoFocus
                />
              </div>
              <div className="eventGrid">
                <label>
                  Start
                  <input
                    className="detailSmall"
                    type="datetime-local"
                    value={toLocalDateTimeInput(eventComposer.startAt)}
                    onChange={(e) => {
                      const ms = fromLocalDateTimeInput(e.target.value)
                      if (!ms) return
                      setEventComposer((p) => {
                        const dur = Math.max(5 * 60 * 1000, p.endAt - p.startAt)
                        const startAt = ms
                        const endAt = startAt + dur
                        return { ...p, startAt, endAt, estimateMinutesRaw: p.estimateMinutesRaw || estimateMinutesFromRange(startAt, endAt) }
                      })
                    }}
                  />
                </label>
                <label>
                  End
                  <input
                    className="detailSmall"
                    type="datetime-local"
                    value={toLocalDateTimeInput(eventComposer.endAt)}
                    onChange={(e) => {
                      const ms = fromLocalDateTimeInput(e.target.value)
                      if (!ms) return
                      setEventComposer((p) => ({ ...p, endAt: Math.max(ms, p.startAt + 5 * 60 * 1000), estimateMinutesRaw: p.estimateMinutesRaw }))
                    }}
                  />
                </label>
              </div>
              <div className="eventGrid">
                <label>
                  Kind
                  <select
                    className="detailSmall"
                    value={eventComposer.kind}
                    onChange={(e) => setEventComposer((p) => ({ ...p, kind: e.target.value as any }))}>
                    <option value="event">Event</option>
                    <option value="task">Task block</option>
                    <option value="log">Log</option>
                    <option value="episode">Episode (multi-day)</option>
                  </select>
                </label>
                <label>
                  Estimate (min)
                  <input
                    className="detailSmall"
                    value={eventComposer.estimateMinutesRaw}
                    onChange={(e) => setEventComposer((p) => ({ ...p, estimateMinutesRaw: e.target.value }))}
                    placeholder="60"
                  />
                </label>
              </div>
              <div className="eventGrid">
                <label className="eventCheck">
                  <input
                    type="checkbox"
                    checked={eventComposer.allDay || eventComposer.kind === 'episode'}
                    onChange={(e) => setEventComposer((p) => ({ ...p, allDay: e.target.checked }))}
                  />
                  All-day
                </label>
                <label className="eventCheck">
                  <input type="checkbox" checked={eventComposer.active} onChange={(e) => setEventComposer((p) => ({ ...p, active: e.target.checked }))} />
                  Active (running)
                </label>
              </div>
              <div className="eventGrid">
                <label>
                  Icon
                  <div className="detailIconSelect">
                    <select
                      className="detailSmall"
                      value={eventComposer.icon ?? ''}
                      onChange={(e) => setEventComposer((p) => ({ ...p, icon: e.target.value || null }))}>
                      <option value="">Auto</option>
                      {EVENT_ICON_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <span className="detailIconPreview">
                      <Icon name={eventComposer.icon ? (eventComposer.icon as any) : 'calendar'} size={14} />
                    </span>
                  </div>
                </label>
                <label>
                  Color
                  <div className="detailColorRow">
                    <input
                      className="detailColorInput"
                      type="color"
                      value={eventComposer.color ?? '#7c3aed'}
                      onChange={(e) => setEventComposer((p) => ({ ...p, color: e.target.value }))}
                    />
                    <button className="detailColorAuto" onClick={() => setEventComposer((p) => ({ ...p, color: null }))}>
                      Auto
                    </button>
                  </div>
                </label>
              </div>
	              <div className="eventGrid">
	                <label>
	                  Tags
	                  <div className="detailChips">
	                    {composerTagList.map((t) => (
	                      <button
	                        key={t}
	                        className="detailChip"
	                        onClick={() => {
	                          const next = composerTagList.filter((x) => x !== t)
	                          setEventComposer((p) => ({ ...p, tagsRaw: next.join(' ') }))
	                        }}
	                        type="button">
	                        {t}
	                        <span className="detailChipRemove">×</span>
	                      </button>
	                    ))}
	                    <input
	                      className="detailChipInput"
	                      value={composerTagDraft}
	                      onChange={(e) => setComposerTagDraft(e.target.value)}
	                      onKeyDown={(e) => {
	                        if (e.key !== 'Enter' && e.key !== ',' && e.key !== ' ') return
	                        e.preventDefault()
	                        const next = parseTags(composerTagDraft)
	                        if (!next.length) return
	                        const merged = uniqStrings([...composerTagList, ...next].map(normalizeHashTag).filter(Boolean))
	                        setEventComposer((p) => ({ ...p, tagsRaw: merged.join(' ') }))
	                        setComposerTagDraft('')
	                      }}
	                      onBlur={() => {
	                        const next = parseTags(composerTagDraft)
	                        if (!next.length) return
	                        const merged = uniqStrings([...composerTagList, ...next].map(normalizeHashTag).filter(Boolean))
	                        setEventComposer((p) => ({ ...p, tagsRaw: merged.join(' ') }))
	                        setComposerTagDraft('')
	                      }}
	                      placeholder="#work #health"
	                    />
	                  </div>
	                </label>
	                <label>
	                  Location
	                  <div className="detailChips">
	                    {composerLocationList.map((loc) => (
	                      <button
	                        key={loc}
	                        className="detailChip"
	                        onClick={() => {
	                          const next = composerLocationList.filter((x) => x !== loc)
	                          setEventComposer((p) => ({ ...p, location: next.join(', ') }))
	                        }}
	                        type="button">
	                        {loc}
	                        <span className="detailChipRemove">×</span>
	                      </button>
	                    ))}
	                    <input
	                      className="detailChipInput"
	                      value={composerLocationDraft}
	                      onChange={(e) => setComposerLocationDraft(e.target.value)}
	                      onKeyDown={(e) => {
	                        if (e.key !== 'Enter' && e.key !== ',') return
	                        e.preventDefault()
	                        const next = parseCommaList(composerLocationDraft)
	                        if (!next.length) return
	                        const merged = uniqStrings([...composerLocationList, ...next])
	                        setEventComposer((p) => ({ ...p, location: merged.join(', ') }))
	                        setComposerLocationDraft('')
	                      }}
	                      onBlur={() => {
	                        const next = parseCommaList(composerLocationDraft)
	                        if (!next.length) return
	                        const merged = uniqStrings([...composerLocationList, ...next])
	                        setEventComposer((p) => ({ ...p, location: merged.join(', ') }))
	                        setComposerLocationDraft('')
	                      }}
	                      placeholder="Home"
	                    />
	                  </div>
	                </label>
	              </div>
	              <div className="eventGrid">
	                <label>
	                  Category
	                  <input
	                    className="detailSmall"
	                    list="taxCatList"
	                    value={eventComposer.category}
	                    onChange={(e) => setEventComposer((p) => ({ ...p, category: e.target.value }))}
	                    placeholder="Work / Health / Study"
	                  />
	                </label>
                <label>
                  Subcategory
                  <input
                    className="detailSmall"
                    list="taxSubcatList"
                    value={eventComposer.subcategory}
                    onChange={(e) => setEventComposer((p) => ({ ...p, subcategory: e.target.value }))}
                    placeholder="Clinic / Surgery / Gym"
                  />
                </label>
              </div>
              <div className="eventGrid">
                <label>
                  Importance
                  <div className="detailRangeRow">
                    <input
                      className="detailRange"
                      type="range"
                      min={0}
                      max={10}
                      step={1}
                      value={eventComposer.importance ?? 5}
                      onChange={(e) => setEventComposer((p) => ({ ...p, importance: Number(e.target.value) }))}
                      aria-label="Importance"
                    />
                    <span className="detailRangeValue">{eventComposer.importance ?? 5}</span>
                  </div>
                </label>
                <label>
                  Difficulty / Energy
                  <div className="detailRangeRow">
                    <input
                      className="detailRange"
                      type="range"
                      min={0}
                      max={10}
                      step={1}
                      value={eventComposer.difficulty ?? 5}
                      onChange={(e) => setEventComposer((p) => ({ ...p, difficulty: Number(e.target.value) }))}
                      aria-label="Difficulty / Energy"
                    />
                    <span className="detailRangeValue">{eventComposer.difficulty ?? 5}</span>
                  </div>
                </label>
              </div>
              <div className="eventGrid">
                <label>
                  People
                  <div className="detailChips">
                    {composerPeopleList.map((p) => (
                      <button
                        key={p}
                        className="detailChip"
                        onClick={() => {
                          const next = composerPeopleList.filter((x) => x !== p)
                          setEventComposer((prev) => ({ ...prev, peopleRaw: next.join(', ') }))
                        }}
                        type="button">
                        {p}
                        <span className="detailChipRemove">×</span>
                      </button>
                    ))}
                    <input
                      className="detailChipInput"
                      value={composerPeopleDraft}
                      onChange={(e) => setComposerPeopleDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter' && e.key !== ',') return
                        e.preventDefault()
                        const next = parseCommaList(composerPeopleDraft)
                        if (!next.length) return
                        const merged = uniqStrings([...composerPeopleList, ...next])
                        setEventComposer((prev) => ({ ...prev, peopleRaw: merged.join(', ') }))
                        setComposerPeopleDraft('')
                      }}
                      onBlur={() => {
                        const next = parseCommaList(composerPeopleDraft)
                        if (!next.length) return
                        const merged = uniqStrings([...composerPeopleList, ...next])
                        setEventComposer((prev) => ({ ...prev, peopleRaw: merged.join(', ') }))
                        setComposerPeopleDraft('')
                      }}
                      placeholder="Mom, Alex"
                    />
                  </div>
                </label>
                <label>
                  Tracker key (optional)
                  <input
                    className="detailSmall"
                    value={eventComposer.trackerKey}
                    onChange={(e) => setEventComposer((p) => ({ ...p, trackerKey: e.target.value }))}
                    placeholder="sleep / workout / pain"
                  />
                </label>
              </div>
              <div className="eventGrid">
                <label>
                  Skills
                  <input
                    className="detailSmall"
                    value={eventComposer.skillsRaw}
                    onChange={(e) => setEventComposer((p) => ({ ...p, skillsRaw: e.target.value }))}
                    placeholder="communication, lifting"
                  />
                </label>
	              <label>
	                Character
	                <div className="charGrid" role="group" aria-label="Character stats">
	                  {CHARACTER_KEYS.map((k) => {
	                    const selected = normalizeCharacterSelection(eventComposer.character).includes(k)
	                    return (
	                      <button
	                        key={k}
	                        className={selected ? 'charChip active' : 'charChip'}
	                        onClick={() => setEventComposer((p) => ({ ...p, character: toggleCharacterSelection(p.character, k) }))}
	                        type="button"
	                        aria-label={selected ? `Remove ${k}` : `Add ${k}`}>
	                        {k}
	                      </button>
	                    )
	                  })}
	                </div>
	              </label>
	            </div>
              <div className="eventNotes">
                <div className="eventNotesHeader">
                  <span>Notes</span>
                  <button className="detailInlineBtn" onClick={() => startComposerTranscription()} type="button">
                    <Icon name="mic" size={12} />
                    {composerListening ? 'Listening…' : 'Transcribe'}
                  </button>
                </div>
                <textarea
                  className="eventNotesArea"
                  value={eventComposer.notes}
                  onChange={(e) => setEventComposer((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Segments: use **HH:MM** - label (e.g., **13:00** - Clinic)…"
                  aria-label="Event notes"
                />
                {composerInterim ? <div className="capInterim">… {composerInterim}</div> : null}
              </div>
            </div>
            <div className="modalActions">
              <button className="secondaryButton" onClick={() => setEventComposerOpen(false)}>
                Cancel
              </button>
              <div className="modalSpacer" />
              <button
                className="primaryButton"
                disabled={eventComposer.title.trim().length === 0}
                onClick={() => {
                  const title = eventComposer.title.trim()
                  const kind = eventComposer.kind
		                  const tags = parseTags(eventComposer.tagsRaw)
		                  const people = parseCommaList(eventComposer.peopleRaw)
		                  const skills = parseCommaList(eventComposer.skillsRaw)
		                  const character = normalizeCharacterSelection(eventComposer.character)
		                  const estimateMinutesInput = numberOrNull(eventComposer.estimateMinutesRaw)
		                  const category = eventComposer.category.trim() ? eventComposer.category.trim() : null
		                  const subcategory = eventComposer.subcategory.trim() ? eventComposer.subcategory.trim() : null
		                  const importance = eventComposer.importance
		                  const difficulty = eventComposer.difficulty

                  let startAt = eventComposer.startAt
                  let endAt = Math.max(eventComposer.endAt, startAt + 5 * 60 * 1000)

                  const allDay = eventComposer.allDay || kind === 'episode'
                  if (allDay) {
                    const s = new Date(startAt)
                    s.setHours(0, 0, 0, 0)
                    const e = new Date(endAt)
                    e.setHours(0, 0, 0, 0)
                    startAt = s.getTime()
                    endAt = Math.max(e.getTime() + 24 * 60 * 60 * 1000, startAt + 24 * 60 * 60 * 1000)
                  }

                  const estimateMinutes =
                    estimateMinutesInput ?? (allDay ? null : Math.round(Math.max(5 * 60 * 1000, endAt - startAt) / (60 * 1000)))

	                  onCreateEvent({
	                    title,
	                    startAt,
	                    endAt,
	                    kind,
	                    taskId: eventComposer.taskId || null,
	                    allDay,
	                    active: eventComposer.active,
	                    tags,
	                    notes: eventComposer.notes || null,
	                    icon: eventComposer.icon || null,
	                    color: eventComposer.color || null,
	                    estimateMinutes,
	                    location: eventComposer.location.trim() ? eventComposer.location.trim() : null,
	                    people,
	                    skills,
	                    character,
	                    category,
	                    subcategory,
	                    importance,
	                    difficulty,
	                    trackerKey: eventComposer.trackerKey.trim() ? eventComposer.trackerKey.trim() : null,
	                  })
                  setEventComposerOpen(false)
                }}>
                Create
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
      </AnimatePresence>

      <CaptureModal
        isOpen={captureOpen}
        onClose={() => setCaptureOpen(false)}
        draft={captureDraft}
        setDraft={setCaptureDraft}
        isListening={captureListening}
        onToggleListening={() => startVoiceCapture()}
        interimTranscript={captureInterim}
        isSaving={captureSaving}
        onSave={onSaveCapture}
        aiStatus={captureAiStatus}
        error={captureError}
        progress={captureProgress}
        attachEventId={captureAttachEventId}
        onDetachEvent={() => setCaptureAttachEventId(null)}
                attachedEventTitle={captureAttachEventId ? events.find((e) => e.id === captureAttachEventId)?.title ?? 'Event' : null}
              />
        
              <AnimatePresence>
              {docOpen ? (	        <motion.div
	          className="modalOverlay docOverlay"
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDocOpen(false)
          }}>
          <motion.div
            className="docCard"
            initial={{ y: 12, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 12, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}>
            <div className="modalHeader">
              <div>
                <div className="modalTitle">Page</div>
              </div>
              <button className="modalClose" onClick={() => setDocOpen(false)} aria-label="Close">
                <Icon name="x" />
              </button>
            </div>
            <div className="docGrid">
              <div className="docBody">
                {selection.kind === 'task' && selectedTask ? (
                  <>
                    <div className="docTitleRow">
                      <input
                        className="docTitleInput"
                        value={selectedTask.title}
                        onChange={(e) => commitTask({ ...selectedTask, title: e.target.value })}
                      />
                      <button className="docMagicBtn" type="button">
                        <Icon name="sparkle" size={14} />
                        Magic
                      </button>
                    </div>
                    <div className="docTabsRow">
                      <div className="docTabs">
                        <button
                          className={docTab === 'notes' ? 'docTab active' : 'docTab'}
                          type="button"
                          onClick={() => setDocTab('notes')}>
                          Notes
                        </button>
                        <button
                          className={docTab === 'transcript' ? 'docTab active' : 'docTab'}
                          type="button"
                          onClick={() => setDocTab('transcript')}>
                          Transcript
                        </button>
                      </div>
                    </div>
                    {docTab === 'notes' ? (
                      <MarkdownEditor
                        value={selectedTask.notes ?? ''}
                        onChange={(next) => commitTask({ ...selectedTask, notes: next })}
                        onToggleChecklist={(lineIndex) => onToggleTaskChecklistItem(selectedTask.id, lineIndex)}
                        placeholder="Write markdown notes…"
                        ariaLabel="Task notes (markdown)"
                      />
                    ) : (
                      <div className="docTranscriptPanel">
                        <div className="docTranscriptChips">
                          {docTranscriptLines.length ? (
                            docTranscriptLines.map((line, index) => (
                              <button
                                key={`${line.time}-${index}`}
                                className={docTranscriptFocus === line.time ? 'docTranscriptChip active' : 'docTranscriptChip'}
                                type="button"
                                onClick={() => setDocTranscriptFocus(line.time)}
                                title={line.text}>
                                {line.time}
                              </button>
                            ))
                          ) : (
                            <div className="docTranscriptEmpty">No timestamped lines yet.</div>
                          )}
                        </div>
                        <div className="docTranscriptBox">
                          <textarea
                            className="docTranscriptTextarea"
                            value={selectedTask.notes ?? ''}
                            onChange={(e) => commitTask({ ...selectedTask, notes: e.target.value })}
                            placeholder="Paste raw transcript with [HH:MM] timestamps…"
                          />
                        </div>
                      </div>
                    )}
                  </>
                ) : selection.kind === 'event' && selectedEvent ? (
                  <>
                    <div className="docTitleRow">
                      <input
                        className="docTitleInput"
                        value={selectedEvent.title}
                        onChange={(e) => commitEvent({ ...selectedEvent, title: e.target.value })}
                      />
                      <button className="docMagicBtn" type="button">
                        <Icon name="sparkle" size={14} />
                        Magic
                      </button>
                    </div>
                    <div className="docTabsRow">
                      <div className="docTabs">
                        <button
                          className={docTab === 'notes' ? 'docTab active' : 'docTab'}
                          type="button"
                          onClick={() => setDocTab('notes')}>
                          Notes
                        </button>
                        <button
                          className={docTab === 'transcript' ? 'docTab active' : 'docTab'}
                          type="button"
                          onClick={() => setDocTab('transcript')}>
                          Transcript
                        </button>
                      </div>
                    </div>
                    {docTab === 'notes' ? (
                      <MarkdownEditor
                        value={selectedEvent.notes ?? ''}
                        onChange={(next) => commitEvent({ ...selectedEvent, notes: next })}
                        onToggleChecklist={(lineIndex) => {
                          if (selectedEvent.kind === 'task' && selectedEvent.taskId) {
                            onToggleTaskChecklistItem(selectedEvent.taskId, lineIndex)
                            return
                          }
                          commitEvent({ ...selectedEvent, notes: toggleChecklistLine(selectedEvent.notes, lineIndex) })
                        }}
                        onStartTask={(task) => onStartNoteTask(selectedEvent.id, task)}
                        taskStateByToken={selectedEventNoteTasks}
                        nowMs={nowTick}
                        placeholder="Write markdown notes…"
                        ariaLabel="Event notes (markdown)"
                      />
                    ) : (
                      <div className="docTranscriptPanel">
                        <div className="docTranscriptChips">
                          {docTranscriptLines.length ? (
                            docTranscriptLines.map((line, index) => (
                              <button
                                key={`${line.time}-${index}`}
                                className={docTranscriptFocus === line.time ? 'docTranscriptChip active' : 'docTranscriptChip'}
                                type="button"
                                onClick={() => setDocTranscriptFocus(line.time)}
                                title={line.text}>
                                {line.time}
                              </button>
                            ))
                          ) : (
                            <div className="docTranscriptEmpty">No timestamped lines yet.</div>
                          )}
                        </div>
                        <div className="docTranscriptBox">
                          <textarea
                            className="docTranscriptTextarea"
                            value={selectedEvent.notes ?? ''}
                            onChange={(e) => commitEvent({ ...selectedEvent, notes: e.target.value })}
                            placeholder="Paste raw transcript with [HH:MM] timestamps…"
                          />
                        </div>
                      </div>
                    )}
                  </>
                ) : selection.kind === 'capture' && selectedCapture ? (
                  <>
                    <div className="docTitleRow">
                      <input className="docTitleInput" value="Inbox note" readOnly />
                      <button className="docMagicBtn" type="button">
                        <Icon name="sparkle" size={14} />
                        Magic
                      </button>
                    </div>
                    <div className="docTabsRow">
                      <div className="docTabs">
                        <button className="docTab active" type="button">
                          Transcript
                        </button>
                      </div>
                    </div>
                    <div className="docTranscriptPanel">
                      <div className="docTranscriptChips">
                        {docTranscriptLines.length ? (
                          docTranscriptLines.map((line, index) => (
                            <button
                              key={`${line.time}-${index}`}
                              className={docTranscriptFocus === line.time ? 'docTranscriptChip active' : 'docTranscriptChip'}
                              type="button"
                              onClick={() => setDocTranscriptFocus(line.time)}
                              title={line.text}>
                              {line.time}
                            </button>
                          ))
                        ) : (
                          <div className="docTranscriptEmpty">No timestamped lines yet.</div>
                        )}
                      </div>
                      <div className="docTranscriptBox">
                        <textarea
                          className="docTranscriptTextarea"
                          value={selectedCapture.rawText}
                          onChange={(e) => {
                            void onUpdateCapture(selectedCapture.id, e.target.value)
                          }}
                          placeholder="Paste raw transcript with [HH:MM] timestamps…"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="docEmpty">Select a task, event, or capture to open as a page.</div>
                )}
              </div>
              <div className="docProps">
                <div className="docPropsTitle">Properties</div>
                {selection.kind === 'task' && selectedTask ? (
                  <div className="docPropsGrid">
                    <div className="detailRow">
                      <label className="detailLabel">
                        Tags
                        <input
                          className="detailSmall"
                          value={selectedTaskTags.join(' ')}
                          onChange={(e) => commitTask({ ...selectedTask, tags: parseTags(e.target.value) })}
                          placeholder="#work #health"
                        />
                      </label>
                    </div>
                    <div className="detailRow">
                      <div className="detailLabel">Context</div>
                      <div className="detailChips">
                        {selectedTaskContexts.map((ctx) => (
                          <button
                            key={ctx}
                            className="detailChip"
                            onClick={() =>
                              commitTask({ ...selectedTask, contexts: selectedTaskContexts.filter((x) => x !== ctx) })
                            }
                            type="button">
                            {formatContextLabel(ctx)}
                            <span className="detailChipRemove">×</span>
                          </button>
                        ))}
                        <input
                          className="detailChipInput"
                          value={contextDraft}
                          onChange={(e) => setContextDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key !== 'Enter' && e.key !== ',') return
                            e.preventDefault()
                            const next = parseContexts(contextDraft)
                            if (!next.length) return
                            const merged = uniqStrings([...(selectedTask.contexts ?? []), ...next].map((c) => normalizeContextToken(c) ?? '').filter(Boolean))
                            commitTask({ ...selectedTask, contexts: merged })
                            setContextDraft('')
                          }}
                          onBlur={() => {
                            const next = parseContexts(contextDraft)
                            if (!next.length) return
                            const merged = uniqStrings([...(selectedTask.contexts ?? []), ...next].map((c) => normalizeContextToken(c) ?? '').filter(Boolean))
                            commitTask({ ...selectedTask, contexts: merged })
                            setContextDraft('')
                          }}
                          placeholder="at computer, at email"
                        />
                      </div>
                    </div>
                    <div className="detailGrid">
                      <label>
                        Due
                        <input
                          className="detailSmall"
                          type="datetime-local"
                          value={toLocalDateTimeInput(selectedTask.dueAt)}
                          onChange={(e) => commitTask({ ...selectedTask, dueAt: fromLocalDateTimeInput(e.target.value) })}
                        />
                      </label>
                      <label>
                        Scheduled
                        <input
                          className="detailSmall"
                          type="datetime-local"
                          value={toLocalDateTimeInput(selectedTask.scheduledAt)}
                          onChange={(e) => commitTask({ ...selectedTask, scheduledAt: fromLocalDateTimeInput(e.target.value) })}
                        />
                      </label>
                    </div>
                    <div className="detailGrid">
                      <label>
                        Goal
                        <input
                          className="detailSmall"
                          value={selectedTask.goal ?? ''}
                          onChange={(e) => commitTask({ ...selectedTask, goal: e.target.value || null })}
                          placeholder="get shredded"
                        />
                      </label>
                      <label>
                        Project
                        <input
                          className="detailSmall"
                          value={selectedTask.project ?? ''}
                          onChange={(e) => commitTask({ ...selectedTask, project: e.target.value || null })}
                          placeholder="workout plan"
                        />
                      </label>
                    </div>
                    <div className="detailGrid">
                      <label>
                        Category
                        <input
                          className="detailSmall"
                          list="taxCatList"
                          value={selectedTask.category ?? ''}
                          onChange={(e) => commitTask({ ...selectedTask, category: e.target.value || null })}
                          placeholder="Work / Health / Study"
                        />
                      </label>
                      <label>
                        Subcategory
                        <input
                          className="detailSmall"
                          list="taxSubcatList"
                          value={selectedTask.subcategory ?? ''}
                          onChange={(e) => commitTask({ ...selectedTask, subcategory: e.target.value || null })}
                          placeholder="Clinic / Surgery / Gym"
                        />
                      </label>
                    </div>
                    <div className="detailRow">
                      <div className="detailLabel">Category shortcuts</div>
                      <div className="detailChips">
                        {taxonomyCategories.slice(0, 12).map((c) => (
                          <button
                            key={c}
                            className={selectedTask.category?.toLowerCase() === c.toLowerCase() ? 'detailChip active' : 'detailChip'}
                            onClick={() => commitTask({ ...selectedTask, category: c })}
                            type="button">
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                    {taxonomySubcategories.length ? (
                      <div className="detailRow">
                        <div className="detailLabel">Subcategory shortcuts</div>
                        <div className="detailChips">
                          {taxonomySubcategories.slice(0, 12).map((c) => (
                            <button
                              key={c}
                              className={selectedTask.subcategory?.toLowerCase() === c.toLowerCase() ? 'detailChip active' : 'detailChip'}
                              onClick={() => commitTask({ ...selectedTask, subcategory: c })}
                              type="button">
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div className="detailGrid">
                      <label>
                        Importance
                        <div className="detailRangeRow">
                          <input
                            className="detailRange"
                            type="range"
                            min={0}
                            max={10}
                            step={1}
                            value={selectedTask.importance ?? 5}
                            onChange={(e) => commitTask({ ...selectedTask, importance: Number(e.target.value) })}
                            aria-label="Importance"
                          />
                          <span className="detailRangeValue">{selectedTask.importance ?? '—'}</span>
                          <button
                            className="detailRangeClear"
                            type="button"
                            onClick={() => commitTask({ ...selectedTask, importance: null })}
                            disabled={selectedTask.importance == null}
                            aria-label="Clear importance">
                            ×
                          </button>
                        </div>
                      </label>
                      <label>
                        Difficulty / Energy
                        <div className="detailRangeRow">
                          <input
                            className="detailRange"
                            type="range"
                            min={0}
                            max={10}
                            step={1}
                            value={selectedTask.difficulty ?? 5}
                            onChange={(e) => commitTask({ ...selectedTask, difficulty: Number(e.target.value) })}
                            aria-label="Difficulty / Energy"
                          />
                          <span className="detailRangeValue">{selectedTask.difficulty ?? '—'}</span>
                          <button
                            className="detailRangeClear"
                            type="button"
                            onClick={() => commitTask({ ...selectedTask, difficulty: null })}
                            disabled={selectedTask.difficulty == null}
                            aria-label="Clear difficulty or energy">
                            ×
                          </button>
                        </div>
                      </label>
                      <label>
                        Estimate (min)
                        <input
                          className="detailSmall"
                          value={selectedTask.estimateMinutes ?? ''}
                          onChange={(e) => commitTask({ ...selectedTask, estimateMinutes: numberOrNull(e.target.value) })}
                          placeholder="25"
                        />
                      </label>
                    </div>
                  </div>
                ) : selection.kind === 'event' && selectedEvent ? (
                  <div className="docPropsGrid">
                    <div className="detailGrid">
                      <label>
                        Start
                        <input
                          className="detailSmall"
                          type="datetime-local"
                          value={toLocalDateTimeInput(selectedEvent.startAt)}
                          onChange={(e) => {
                            const ms = fromLocalDateTimeInput(e.target.value)
                            if (!ms) return
                            const dur = Math.max(5 * 60 * 1000, selectedEvent.endAt - selectedEvent.startAt)
                            commitEvent({ ...selectedEvent, startAt: ms, endAt: ms + dur })
                          }}
                        />
                      </label>
                      <label>
                        End
                        <input
                          className="detailSmall"
                          type="datetime-local"
                          value={toLocalDateTimeInput(selectedEvent.endAt)}
                          onChange={(e) => {
                            const ms = fromLocalDateTimeInput(e.target.value)
                            if (!ms) return
                            commitEvent({ ...selectedEvent, endAt: Math.max(ms, selectedEvent.startAt + 5 * 60 * 1000) })
                          }}
                        />
                      </label>
                    </div>
                    <div className="detailGrid">
                      <label>
                        Icon
                        <div className="detailIconSelect">
                          <select
                            className="detailSmall"
                            value={selectedEvent.icon ?? ''}
                            onChange={(e) => commitEvent({ ...selectedEvent, icon: e.target.value || null })}>
                            <option value="">Auto</option>
                            {EVENT_ICON_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                          <span className="detailIconPreview">
                            <Icon name={eventAccent(selectedEvent).icon} size={14} />
                          </span>
                        </div>
                      </label>
                      <label>
                        Color
                        <div className="detailColorRow">
                          <input
                            className="detailColorInput"
                            type="color"
                            value={selectedEvent.color ?? eventAccent(selectedEvent).color}
                            onChange={(e) => commitEvent({ ...selectedEvent, color: e.target.value })}
                          />
                          <button className="detailColorAuto" onClick={() => commitEvent({ ...selectedEvent, color: null })}>
                            Auto
                          </button>
                        </div>
                        <div className="detailSwatches">
                          {EVENT_COLOR_PRESETS.slice(0, 9).map((c) => (
                            <button
                              key={c.hex}
                              className={selectedEvent.color === c.hex ? 'detailSwatch active' : 'detailSwatch'}
                              title={c.name}
                              style={{ background: c.hex }}
                              onClick={() => commitEvent({ ...selectedEvent, color: c.hex })}
                            />
                          ))}
                        </div>
                      </label>
                    </div>
                    <div className="detailRow">
                      <div className="detailLabel">Tags</div>
                      <div className="detailChips">
                        {selectedEventTags.map((t) => (
                          <button
                            key={t}
                            className="detailChip"
                            onClick={() => commitEvent({ ...selectedEvent, tags: selectedEventTags.filter((x) => x !== t) })}
                            type="button">
                            {t}
                            <span className="detailChipRemove">×</span>
                          </button>
                        ))}
                        <input
                          className="detailChipInput"
                          value={tagDraft}
                          onChange={(e) => setTagDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key !== 'Enter' && e.key !== ',' && e.key !== ' ') return
                            e.preventDefault()
                            const next = parseTags(tagDraft)
                            if (!next.length) return
                            const merged = uniqStrings([...selectedEventTags, ...next].map(normalizeHashTag).filter(Boolean))
                            commitEvent({ ...selectedEvent, tags: merged })
                            setTagDraft('')
                          }}
                          onBlur={() => {
                            const next = parseTags(tagDraft)
                            if (!next.length) return
                            const merged = uniqStrings([...selectedEventTags, ...next].map(normalizeHashTag).filter(Boolean))
                            commitEvent({ ...selectedEvent, tags: merged })
                            setTagDraft('')
                          }}
                          placeholder="#work #meeting"
                        />
                      </div>
                    </div>
                    <div className="detailRow">
                      <div className="detailLabel">Context</div>
                      <div className="detailChips">
                        {selectedEventContexts.map((ctx) => (
                          <button
                            key={ctx}
                            className="detailChip"
                            onClick={() => commitEvent({ ...selectedEvent, contexts: selectedEventContexts.filter((x) => x !== ctx) })}
                            type="button">
                            {formatContextLabel(ctx)}
                            <span className="detailChipRemove">×</span>
                          </button>
                        ))}
                        <input
                          className="detailChipInput"
                          value={contextDraft}
                          onChange={(e) => setContextDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key !== 'Enter' && e.key !== ',') return
                            e.preventDefault()
                            const next = parseContexts(contextDraft)
                            if (!next.length) return
                            const merged = uniqStrings([...(selectedEvent.contexts ?? []), ...next].map((c) => normalizeContextToken(c) ?? '').filter(Boolean))
                            commitEvent({ ...selectedEvent, contexts: merged })
                            setContextDraft('')
                          }}
                          onBlur={() => {
                            const next = parseContexts(contextDraft)
                            if (!next.length) return
                            const merged = uniqStrings([...(selectedEvent.contexts ?? []), ...next].map((c) => normalizeContextToken(c) ?? '').filter(Boolean))
                            commitEvent({ ...selectedEvent, contexts: merged })
                            setContextDraft('')
                          }}
                          placeholder="at computer, at email"
                        />
                      </div>
                    </div>
                    <div className="detailGrid">
                      <label>
                        Estimate (min)
                        <input
                          className="detailSmall"
                          value={selectedEvent.estimateMinutes ?? ''}
                          onChange={(e) => commitEvent({ ...selectedEvent, estimateMinutes: numberOrNull(e.target.value) })}
                          placeholder="30"
                        />
                      </label>
                      <label>
                        Location
                        <div className="detailChips">
                          {selectedEventLocations.map((loc) => (
                            <button
                              key={loc}
                              className="detailChip"
                              onClick={() => {
                                const next = selectedEventLocations.filter((x) => x !== loc)
                                commitEvent({ ...selectedEvent, location: next.length ? next.join(', ') : null })
                              }}
                              type="button">
                              {loc}
                              <span className="detailChipRemove">×</span>
                            </button>
                          ))}
                          <input
                            className="detailChipInput"
                            value={locationDraft}
                            onChange={(e) => setLocationDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key !== 'Enter' && e.key !== ',') return
                              e.preventDefault()
                              const next = parseCommaList(locationDraft)
                              if (!next.length) return
                              const merged = uniqStrings([...selectedEventLocations, ...next])
                              commitEvent({ ...selectedEvent, location: merged.length ? merged.join(', ') : null })
                              setLocationDraft('')
                            }}
                            onBlur={() => {
                              const next = parseCommaList(locationDraft)
                              if (!next.length) return
                              const merged = uniqStrings([...selectedEventLocations, ...next])
                              commitEvent({ ...selectedEvent, location: merged.length ? merged.join(', ') : null })
                              setLocationDraft('')
                            }}
                            placeholder="Home"
                          />
                        </div>
                      </label>
                    </div>
                    <div className="detailGrid">
                      <label>
                        Points
                        <div className="detailPoints">
                          <div className="detailPointsValue">{selectedEventPoints.toFixed(1)}</div>
                          <div className="detailPointsMeta">
                            {selectedEventBase} × {formatMinutesSpan(selectedEventMinutes)} ÷ 60 × {selectedEventMult.toFixed(2)}
                          </div>
                        </div>
                      </label>
                      <label>
                        Running
                        <div className="detailPoints">
                          <div className="detailPointsValue">{selectedEvent.active ? 'Active' : '—'}</div>
                          <div className="detailPointsMeta">
                            {selectedEvent.active ? `${formatMinutesSpan(selectedEventMinutes)} elapsed` : 'Not running'}
                          </div>
                        </div>
                      </label>
                    </div>
                    <div className="detailRow">
                      <div className="detailLabel">People</div>
                      <div className="detailChips">
                        {selectedEventPeople.map((p) => (
                          <button
                            key={p}
                            className="detailChip"
                            onClick={() => commitEvent({ ...selectedEvent, people: selectedEventPeople.filter((x) => x !== p) })}
                            type="button">
                            {p}
                            <span className="detailChipRemove">×</span>
                          </button>
                        ))}
                        <input
                          className="detailChipInput"
                          value={peopleDraft}
                          onChange={(e) => setPeopleDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key !== 'Enter' && e.key !== ',') return
                            e.preventDefault()
                            const next = parseCommaList(peopleDraft)
                            if (!next.length) return
                            const merged = uniqStrings([...selectedEventPeople, ...next])
                            commitEvent({ ...selectedEvent, people: merged })
                            setPeopleDraft('')
                          }}
                          onBlur={() => {
                            const next = parseCommaList(peopleDraft)
                            if (!next.length) return
                            const merged = uniqStrings([...selectedEventPeople, ...next])
                            commitEvent({ ...selectedEvent, people: merged })
                            setPeopleDraft('')
                          }}
                          placeholder="Mom, Alex"
                        />
                      </div>
                    </div>
                    <div className="detailRow">
                      <div className="detailLabel">Skills</div>
                      <div className="detailChips">
                        {selectedEventSkills.map((skill) => (
                          <button
                            key={skill}
                            className="detailChip"
                            onClick={() => commitEvent({ ...selectedEvent, skills: selectedEventSkills.filter((x) => x !== skill) })}
                            type="button">
                            {skill}
                            <span className="detailChipRemove">×</span>
                          </button>
                        ))}
                        <input
                          className="detailChipInput"
                          value={skillDraft}
                          onChange={(e) => setSkillDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key !== 'Enter' && e.key !== ',') return
                            e.preventDefault()
                            const next = parseCommaList(skillDraft)
                            if (!next.length) return
                            const merged = uniqStrings([...selectedEventSkills, ...next])
                            commitEvent({ ...selectedEvent, skills: merged })
                            setSkillDraft('')
                          }}
                          onBlur={() => {
                            const next = parseCommaList(skillDraft)
                            if (!next.length) return
                            const merged = uniqStrings([...selectedEventSkills, ...next])
                            commitEvent({ ...selectedEvent, skills: merged })
                            setSkillDraft('')
                          }}
                          placeholder="communication, lifting"
                        />
                      </div>
                    </div>
                    <div className="detailRow">
                      <div className="detailLabel">
                        Character
                        <div className="charGrid" role="group" aria-label="Character stats">
                          {CHARACTER_KEYS.map((k) => {
                            const selected = normalizeCharacterSelection(selectedEvent.character).includes(k)
                            return (
                              <button
                                key={k}
                                className={selected ? 'charChip active' : 'charChip'}
                                onClick={() => commitEvent({ ...selectedEvent, character: toggleCharacterSelection(selectedEvent.character, k) })}
                                type="button"
                                aria-label={selected ? `Remove ${k}` : `Add ${k}`}>
                                {k}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="detailGrid">
                      <label>
                        Goal
                        <input
                          className="detailSmall"
                          value={selectedEvent.goal ?? ''}
                          onChange={(e) => commitEvent({ ...selectedEvent, goal: e.target.value || null })}
                          placeholder="get shredded"
                        />
                      </label>
                      <label>
                        Project
                        <input
                          className="detailSmall"
                          value={selectedEvent.project ?? ''}
                          onChange={(e) => commitEvent({ ...selectedEvent, project: e.target.value || null })}
                          placeholder="workout plan"
                        />
                      </label>
                    </div>
                    <div className="detailGrid">
                      <label>
                        Category
                        <input
                          className="detailSmall"
                          list="taxCatList"
                          value={selectedEvent.category ?? ''}
                          onChange={(e) => commitEvent({ ...selectedEvent, category: e.target.value || null })}
                          placeholder="Work / Health / Study"
                        />
                      </label>
                      <label>
                        Subcategory
                        <input
                          className="detailSmall"
                          list="taxSubcatList"
                          value={selectedEvent.subcategory ?? ''}
                          onChange={(e) => commitEvent({ ...selectedEvent, subcategory: e.target.value || null })}
                          placeholder="Clinic / Surgery / Gym"
                        />
                      </label>
                    </div>
                    <div className="detailRow">
                      <div className="detailLabel">Category shortcuts</div>
                      <div className="detailChips">
                        {taxonomyCategories.slice(0, 12).map((c) => (
                          <button
                            key={c}
                            className={selectedEvent.category?.toLowerCase() === c.toLowerCase() ? 'detailChip active' : 'detailChip'}
                            onClick={() => commitEvent({ ...selectedEvent, category: c })}
                            type="button">
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                    {taxonomySubcategories.length ? (
                      <div className="detailRow">
                        <div className="detailLabel">Subcategory shortcuts</div>
                        <div className="detailChips">
                          {taxonomySubcategories.slice(0, 12).map((c) => (
                            <button
                              key={c}
                              className={selectedEvent.subcategory?.toLowerCase() === c.toLowerCase() ? 'detailChip active' : 'detailChip'}
                              onClick={() => commitEvent({ ...selectedEvent, subcategory: c })}
                              type="button">
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div className="detailGrid">
                      <label>
                        Importance
                        <div className="detailRangeRow">
                          <input
                            className="detailRange"
                            type="range"
                            min={0}
                            max={10}
                            step={1}
                            value={selectedEvent.importance ?? 5}
                            onChange={(e) => commitEvent({ ...selectedEvent, importance: Number(e.target.value) })}
                            aria-label="Importance"
                          />
                          <span className="detailRangeValue">{selectedEvent.importance ?? '—'}</span>
                          <button
                            className="detailRangeClear"
                            type="button"
                            onClick={() => commitEvent({ ...selectedEvent, importance: null })}
                            disabled={selectedEvent.importance == null}
                            aria-label="Clear importance">
                            ×
                          </button>
                        </div>
                      </label>
                      <label>
                        Difficulty / Energy
                        <div className="detailRangeRow">
                          <input
                            className="detailRange"
                            type="range"
                            min={0}
                            max={10}
                            step={1}
                            value={selectedEvent.difficulty ?? 5}
                            onChange={(e) => commitEvent({ ...selectedEvent, difficulty: Number(e.target.value) })}
                            aria-label="Difficulty / Energy"
                          />
                          <span className="detailRangeValue">{selectedEvent.difficulty ?? '—'}</span>
                          <button
                            className="detailRangeClear"
                            type="button"
                            onClick={() => commitEvent({ ...selectedEvent, difficulty: null })}
                            disabled={selectedEvent.difficulty == null}
                            aria-label="Clear difficulty or energy">
                            ×
                          </button>
                        </div>
                      </label>
                    </div>
                  </div>
                ) : selection.kind === 'capture' && selectedCapture ? (
                  <div className="docPropsGrid">
                    <div className="detailRow">
                      <div className="detailLabel">Created</div>
                      <div className="docPropValue">{new Date(selectedCapture.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                ) : (
                  <div className="docPropsGrid">
                    <div className="docPropValue">Select something first.</div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
	      ) : null}
	      </AnimatePresence>

	      <datalist id="taxCatList">
	        {taxonomyCategories.map((c) => (
	          <option key={c} value={c} />
	        ))}
	      </datalist>
      <datalist id="taxSubcatList">
        {taxonomySubcategories.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      {authReady && !authSession && !authDismissed ? (
        <div className="authOverlay">
          <div className="authCard">
            <div className="authHeader">
              <div>
                <div className="authTitle">Sign in to sync</div>
                <div className="authSubtitle">Use the same account on web and iPhone.</div>
              </div>
              <button className="authDismiss" type="button" onClick={() => setAuthDismissed(true)}>
                Not now
              </button>
            </div>
            {!supabaseConfigured ? (
              <div className="authError">
                Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
              </div>
            ) : (
              <>
                <div className="authField">
                  <label className="authLabel" htmlFor="authEmail">Email</label>
                  <input
                    id="authEmail"
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="authField">
                  <label className="authLabel" htmlFor="authPassword">Password</label>
                  <input
                    id="authPassword"
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="password"
                  />
                </div>
                {authError ? <div className="authError">{authError}</div> : null}
                {authStatus ? <div className="authStatus">{authStatus}</div> : null}
                <div className="authActions">
                  <button className="primaryButton" type="button" onClick={handleAuthSubmit} disabled={authWorking}>
                    {authWorking ? 'Working...' : authMode === 'signup' ? 'Create account' : 'Sign in'}
                  </button>
                  <button
                    className="secondaryButton"
                    type="button"
                    onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                  >
                    {authMode === 'signin' ? 'Create account' : 'Have an account? Sign in'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
