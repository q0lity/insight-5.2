import { useEffect, useMemo, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Icon } from '../../ui/icons'
import { HabitHeatmap, buildHabitHeatmap, parseHabitTrackerKey } from '../../ui/habit-heatmap'
import type { CalendarEvent } from '../../storage/calendar'
import { createEvent } from '../../storage/calendar'
import { basePoints, pointsForMinutes } from '../../scoring/points'
import { syncHabitToSupabase, syncAllHabitsToSupabase, pullHabitsFromSupabase, deleteHabitFromSupabase } from '../../supabase/sync'

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
  contexts: string[]
  people: string[]
  location?: string | null
  goal?: string | null
  project?: string | null
  estimateMinutes?: number | null
  polarity?: 'positive' | 'negative' | 'both'
  schedule?: string | null
  targetPerWeek?: number | null
  color?: string | null
  icon?: string | null
  isTimed?: boolean
}

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`
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

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function normalizeTag(raw: string) {
  const t = raw.trim()
  if (!t) return ''
  return t.startsWith('#') ? t : `#${t}`
}

function parseTagInput(raw: string) {
  const tags = raw
    .split(/[, ]+/)
    .map((t) => normalizeTag(t))
    .filter(Boolean)
  return Array.from(new Set(tags)).slice(0, 12)
}

function parseCommaInput(raw: string) {
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12)
}

function calcStreak(values: number[]) {
  let streak = 0
  for (let i = values.length - 1; i >= 0; i -= 1) {
    if ((values[i] ?? 0) > 0) streak += 1
    else break
  }
  return streak
}


export function HabitsView(props: { events: CalendarEvent[]; onCreatedEvent: (ev: CalendarEvent) => void; onOpenReports?: (habitId: string) => void }) {
  const [defs, setDefs] = useState<HabitDef[]>(() => loadHabits())
  const [draft, setDraft] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const heatmapStart = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - 364)
    return d
  }, [])
  const heatmapByHabit = useMemo(() => buildHabitHeatmap(defs, props.events, 365), [defs, props.events])
  const heatmapMax = useMemo(() => {
    let max = 1
    for (const values of heatmapByHabit.values()) {
      for (const v of values) max = Math.max(max, Math.abs(v))
    }
    return max
  }, [heatmapByHabit])

  // Pull habits from Supabase on mount and merge with local
  useEffect(() => {
    const loadFromSupabase = async () => {
      try {
        const remoteHabits = await pullHabitsFromSupabase()
        if (remoteHabits.length > 0) {
          setDefs((prev) => {
            const seen = new Set<string>()
            const merged: HabitDef[] = []

            // Add all remote habits first
            for (const remote of remoteHabits) {
              merged.push(remote)
              seen.add(remote.id)
            }

            // Add local habits that aren't in remote
            for (const local of prev) {
              if (!seen.has(local.id)) {
                merged.push(local)
                // Sync this local-only habit to Supabase
                void syncHabitToSupabase(local)
              }
            }

            return merged
          })
        } else {
          // No remote habits - sync all local habits to Supabase
          const localHabits = loadHabits()
          if (localHabits.length > 0) {
            void syncAllHabitsToSupabase(localHabits)
          }
        }
      } catch (err) {
        console.warn('Failed to pull habits from Supabase', err)
      }
    }
    void loadFromSupabase()
  }, [])

  useEffect(() => {
    saveHabits(defs)
    window.dispatchEvent(new Event('insight5.habits.updated'))
  }, [defs])

  const recent = useMemo(() => {
    const byId = new Map<string, number>()
    for (const e of props.events) {
      if (e.kind !== 'log') continue
      const parsed = parseHabitTrackerKey(e.trackerKey)
      if (!parsed) continue
      byId.set(parsed.id, Math.max(byId.get(parsed.id) ?? 0, e.startAt))
    }
    return byId
  }, [props.events])

  const selected = defs.find((d) => d.id === selectedId) ?? null
  const selectedValues = selected ? heatmapByHabit.get(selected.id) ?? [] : []
  const selectedPositive = selectedValues.filter((v) => v > 0).length
  const selectedNegative = selectedValues.filter((v) => v < 0).length
  const selectedStreak = calcStreak(selectedValues)

  function addHabit(name: string) {
    const next = name.trim()
    if (!next) return
    const id = makeId()
    const habit: HabitDef = {
      id,
      name: next,
      category: null,
      subcategory: null,
      difficulty: 3,
      importance: 3,
      character: ['CON'],
      skills: [],
      tags: [],
      contexts: [],
      people: [],
      location: null,
      goal: null,
      project: null,
      estimateMinutes: 15,
      polarity: 'both',
      schedule: null,
      targetPerWeek: null,
      color: null,
      icon: null,
      isTimed: false,
    }
    setDefs((prev) => [habit, ...prev])
    setSelectedId(id)
    // Sync new habit to Supabase
    void syncHabitToSupabase(habit)
  }

  function commitHabitDraft() {
    const name = draft.trim()
    if (!name) return
    addHabit(name)
    setDraft('')
  }

  function updateHabit(id: string, patch: Partial<HabitDef>) {
    setDefs((prev) => {
      const updated = prev.map((h) => (h.id === id ? { ...h, ...patch } : h))
      // Sync updated habit to Supabase
      const habit = updated.find((h) => h.id === id)
      if (habit) void syncHabitToSupabase(habit)
      return updated
    })
  }

  function removeHabit(id: string) {
    setDefs((prev) => prev.filter((h) => h.id !== id))
    setSelectedId((prev) => (prev === id ? null : prev))
    void deleteHabitFromSupabase(id)
  }

  function numberOrNull(raw: string) {
    const t = raw.trim()
    if (!t) return null
    const n = Number(t)
    return Number.isFinite(n) ? n : null
  }

  async function logHabit(def: HabitDef, polarity: 'positive' | 'negative') {
    const now = Date.now()
    const minutes = Math.max(5, def.estimateMinutes ?? 15)
    const ev = await createEvent({
      title: `habit: ${def.name}`,
      startAt: now,
      endAt: now + minutes * 60 * 1000,
      kind: 'log',
      tags: [...new Set(['#habit', ...def.tags])],
      contexts: def.contexts ?? [],
      trackerKey: polarity === 'negative' ? `habit:${def.id}:neg` : `habit:${def.id}`,
      category: def.category,
      subcategory: def.subcategory,
      difficulty: clamp(def.difficulty, 0, 10),
      importance: clamp(def.importance, 0, 10),
      location: def.location ?? null,
      people: def.people ?? [],
      character: def.character,
      skills: def.skills,
      goal: def.goal ?? null,
      project: def.project ?? null,
      entityIds: [],
    })
    props.onCreatedEvent(ev)
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] text-[var(--text)] font-['Figtree'] overflow-hidden">
      <div className="px-10 pt-10 pb-6 bg-[var(--bg)]/80 backdrop-blur-xl sticky top-0 z-10 space-y-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight">Habits</h1>
            <p className="text-sm text-[var(--muted)] font-semibold">Transform consistency into automated progress.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-md relative">
              <input 
                className="w-full h-11 bg-white/50 border border-black/5 rounded-2xl px-10 text-sm font-medium focus:bg-white focus:shadow-md transition-all outline-none"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Define a new habit..."
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  commitHabitDraft()
                }}
              />
              <div className="absolute left-3.5 top-3.5 opacity-30">
                  <Icon name="bolt" size={16} />
              </div>
            </div>
            <button 
              onClick={() => {
                commitHabitDraft()
              }}
              className="h-11 px-6 bg-[#D95D39] text-white rounded-2xl font-bold shadow-lg shadow-[#D95D39]/20 hover:scale-105 active:scale-95 transition-all"
            >
              Add Habit
            </button>
          </div>
        </div>
      </div>

        <div className="flex-1 overflow-hidden px-10 pb-32 max-w-7xl mx-auto w-full">
        <div className="flex flex-col xl:flex-row gap-8 h-full">
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="flex flex-col gap-4">
              {defs.length === 0 && <div className="py-20 text-center opacity-30 font-bold uppercase text-xs tracking-widest">No habits defined</div>}
              {defs.map((h) => {
                const isSelected = selectedId === h.id
                const values = heatmapByHabit.get(h.id) ?? []
                const doneCount = values.filter((v) => v > 0).length
                const missedCount = values.filter((v) => v < 0).length
                const streak = calcStreak(values)
                const points = pointsForMinutes(basePoints(h.importance, h.difficulty), h.estimateMinutes ?? 15).toFixed(1)
                const lastAt = recent.get(h.id)
                return (
                  <motion.div
                    key={h.id}
                    className={isSelected ? 'habitRowCard active' : 'habitRowCard'}
                    whileHover={{ y: -2 }}
                    onClick={() => setSelectedId(h.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' && e.key !== ' ') return
                      e.preventDefault()
                      setSelectedId(h.id)
                    }}
                  >
                    <div className="habitRowInfo">
                      <div className="habitRowTitle">{h.name}</div>
                      <div className="habitRowMeta">
                        <span>{h.category ?? 'Uncategorized'}</span>
                        {h.subcategory ? <span>· {h.subcategory}</span> : null}
                        {lastAt ? <span>· Last {new Date(lastAt).toLocaleDateString()}</span> : null}
                      </div>
                      <div className="habitRowParams">
                        <span>Target: {h.targetPerWeek ? `${h.targetPerWeek}/wk` : '—'}</span>
                        <span>Schedule: {h.schedule ?? '—'}</span>
                      </div>
                      {h.tags.length > 0 ? (
                        <div className="habitRowChips">
                          {h.tags.slice(0, 4).map((tag) => (
                            <span key={tag} className="detailChip pointer-events-none">
                              {tag}
                            </span>
                          ))}
                          {h.tags.length > 4 ? <span className="ecoChipCount">+{h.tags.length - 4}</span> : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="habitRowChart">
                      <HabitHeatmap values={values} startDate={heatmapStart} maxAbs={heatmapMax} stretch />
                    </div>

                    <div className="habitRowStats">
                      <div className="habitRowStat">
                        <span>Done</span>
                        <strong>{doneCount}</strong>
                      </div>
                      <div className="habitRowStat">
                        <span>Missed</span>
                        <strong>{missedCount}</strong>
                      </div>
                      <div className="habitRowStat">
                        <span>Streak</span>
                        <strong>{streak}</strong>
                      </div>
                      <div className="habitRowStat">
                        <span>Points</span>
                        <strong>{points}</strong>
                      </div>
                      <div className="habitRowActions">
                        <button
                          className="habitRowBtn miss"
                          onClick={(e) => {
                            e.stopPropagation()
                            void logHabit(h, 'negative')
                          }}
                        >
                          − Miss
                        </button>
                        <button
                          className="habitRowBtn done"
                          onClick={(e) => {
                            e.stopPropagation()
                            void logHabit(h, 'positive')
                          }}
                        >
                          + Done
                        </button>
                        <button
                          className="habitRowBtn"
                          onClick={(e) => {
                            e.stopPropagation()
                            props.onOpenReports?.(h.id)
                          }}
                        >
                          Analytics
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>

          <div className="habitSidebar shrink-0">
            {selected ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="pageHero p-6 flex flex-col gap-6 sticky top-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">{selected.name}</h2>
                    <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-[0.2em]">
                      {selected.category ?? 'Uncategorized'} {selected.subcategory && `· ${selected.subcategory}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedId(null)}
                    className="w-8 h-8 rounded-full bg-[var(--panel)] flex items-center justify-center text-[var(--muted)]"
                    aria-label="Close habit details"
                  >
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[var(--panel)] rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Done</span>
                    <div className="text-lg font-bold text-[#3D8856]">{selectedPositive}</div>
                  </div>
                  <div className="p-3 bg-[var(--panel)] rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Missed</span>
                    <div className="text-lg font-bold text-[#CF423C]">{selectedNegative}</div>
                  </div>
                  <div className="p-3 bg-[var(--panel)] rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Streak</span>
                    <div className="text-lg font-bold text-[var(--accent)]">{selectedStreak}</div>
                  </div>
                  <div className="p-3 bg-[var(--panel)] rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Points</span>
                    <div className="text-lg font-bold text-[var(--accent)]">
                        {pointsForMinutes(basePoints(selected.importance, selected.difficulty), selected.estimateMinutes ?? 15).toFixed(1)}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    className="flex-1 h-10 rounded-2xl bg-[#CF423C]/10 text-[#CF423C] text-xs font-bold hover:bg-[#CF423C] hover:text-white transition-all"
                    onClick={() => void logHabit(selected, 'negative')}>
                    − Miss
                  </button>
                  <button
                    className="flex-1 h-10 rounded-2xl bg-[#3D8856]/10 text-[#3D8856] text-xs font-bold hover:bg-[#3D8856] hover:text-white transition-all"
                    onClick={() => void logHabit(selected, 'positive')}>
                    + Done
                  </button>
                  <button
                    className="h-10 px-3 rounded-2xl bg-white/70 text-[var(--text)] text-xs font-bold border border-black/5 hover:bg-[var(--panel)] transition-all"
                    onClick={() => props.onOpenReports?.(selected.id)}>
                    Analytics
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    className="flex-1 h-10 rounded-2xl bg-[#CF423C]/10 text-[#CF423C] text-xs font-bold hover:bg-[#CF423C] hover:text-white transition-all"
                    onClick={() => removeHabit(selected.id)}
                  >
                    Remove habit
                  </button>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-[0.2em]">Consistency Map</span>
                  <div className="min-h-[140px]">
                    <HabitHeatmap values={selectedValues} startDate={heatmapStart} showLabels maxAbs={heatmapMax} />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Category</label>
                  <input
                    className="w-full h-10 bg-white/60 border border-black/5 rounded-2xl px-4 text-sm font-medium"
                    value={selected.category ?? ''}
                    onChange={(e) => updateHabit(selected.id, { category: e.target.value.trim() || null })}
                    placeholder="Personal, Health, Work…"
                  />
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Subcategory</label>
                  <input
                    className="w-full h-10 bg-white/60 border border-black/5 rounded-2xl px-4 text-sm font-medium"
                    value={selected.subcategory ?? ''}
                    onChange={(e) => updateHabit(selected.id, { subcategory: e.target.value.trim() || null })}
                    placeholder="Morning routine, Strength…"
                  />
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Tags</label>
                  <input
                    className="w-full h-10 bg-white/60 border border-black/5 rounded-2xl px-4 text-sm font-medium"
                    value={selected.tags.join(' ')}
                    onChange={(e) => updateHabit(selected.id, { tags: parseTagInput(e.target.value) })}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' && e.key !== ',' && e.key !== ' ') return
                      e.preventDefault()
                      updateHabit(selected.id, { tags: parseTagInput((e.target as HTMLInputElement).value) })
                    }}
                    placeholder="#health #morning"
                  />
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Context</label>
                  <input
                    className="w-full h-10 bg-white/60 border border-black/5 rounded-2xl px-4 text-sm font-medium"
                    value={selected.contexts.join(', ')}
                    onChange={(e) => updateHabit(selected.id, { contexts: parseCommaInput(e.target.value) })}
                    placeholder="at computer, at gym"
                  />
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">People</label>
                  <input
                    className="w-full h-10 bg-white/60 border border-black/5 rounded-2xl px-4 text-sm font-medium"
                    value={selected.people.join(', ')}
                    onChange={(e) => updateHabit(selected.id, { people: parseCommaInput(e.target.value) })}
                    placeholder="Mom, Alex"
                  />
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Location</label>
                  <input
                    className="w-full h-10 bg-white/60 border border-black/5 rounded-2xl px-4 text-sm font-medium"
                    value={selected.location ?? ''}
                    onChange={(e) => updateHabit(selected.id, { location: e.target.value.trim() || null })}
                    placeholder="Home, Gym"
                  />
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Goal</label>
                  <input
                    className="w-full h-10 bg-white/60 border border-black/5 rounded-2xl px-4 text-sm font-medium"
                    value={selected.goal ?? ''}
                    onChange={(e) => updateHabit(selected.id, { goal: e.target.value.trim() || null })}
                    placeholder="Get shredded"
                  />
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Project</label>
                  <input
                    className="w-full h-10 bg-white/60 border border-black/5 rounded-2xl px-4 text-sm font-medium"
                    value={selected.project ?? ''}
                    onChange={(e) => updateHabit(selected.id, { project: e.target.value.trim() || null })}
                    placeholder="Workout plan"
                  />
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Skills</label>
                  <input
                    className="w-full h-10 bg-white/60 border border-black/5 rounded-2xl px-4 text-sm font-medium"
                    value={selected.skills.join(', ')}
                    onChange={(e) =>
                      updateHabit(selected.id, {
                        skills: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean)
                          .slice(0, 10),
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' && e.key !== ',') return
                      e.preventDefault()
                      updateHabit(selected.id, {
                        skills: (e.target as HTMLInputElement).value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean)
                          .slice(0, 10),
                      })
                    }}
                    placeholder="communication, lifting"
                  />
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Estimate (min)</label>
                  <input
                    className="w-full h-10 bg-white/60 border border-black/5 rounded-2xl px-4 text-sm font-medium"
                    value={selected.estimateMinutes ?? ''}
                    onChange={(e) => updateHabit(selected.id, { estimateMinutes: numberOrNull(e.target.value) })}
                    placeholder="15"
                  />
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Schedule</label>
                  <input
                    className="w-full h-10 bg-white/60 border border-black/5 rounded-2xl px-4 text-sm font-medium"
                    value={selected.schedule ?? ''}
                    onChange={(e) => updateHabit(selected.id, { schedule: e.target.value })}
                    placeholder="Mon/Wed/Fri · 7:00 AM"
                  />
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Target per week</label>
                  <input
                    className="w-full h-10 bg-white/60 border border-black/5 rounded-2xl px-4 text-sm font-medium"
                    value={selected.targetPerWeek ?? ''}
                    onChange={(e) => updateHabit(selected.id, { targetPerWeek: numberOrNull(e.target.value) })}
                    placeholder="4"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Importance</label>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={selected.importance}
                    onChange={(e) => updateHabit(selected.id, { importance: clamp(Number(e.target.value), 0, 10) })}
                  />
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Difficulty / Energy</label>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={selected.difficulty}
                    onChange={(e) => updateHabit(selected.id, { difficulty: clamp(Number(e.target.value), 0, 10) })}
                  />
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Character</label>
                  <div className="flex flex-wrap gap-2">
                    {(['STR', 'INT', 'CON', 'PER'] as const).map((c) => {
                      const active = selected.character.includes(c)
                      return (
                        <button
                          key={c}
                          className={active ? 'px-3 py-1 rounded-full bg-[#D95D39]/10 text-[var(--accent)] text-[10px] font-bold' : 'px-3 py-1 rounded-full bg-[var(--panel)] text-[var(--muted)] text-[10px] font-bold'}
                          onClick={() => {
                            const next = active ? selected.character.filter((x) => x !== c) : [...selected.character, c]
                            updateHabit(selected.id, { character: next })
                          }}
                        >
                          {c}
                        </button>
                      )
                    })}
                  </div>
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Polarity</label>
                  <div className="flex gap-2">
                    {(['positive', 'negative', 'both'] as const).map((p) => (
                      <button
                        key={p}
                        className={selected.polarity === p ? 'px-3 py-1 rounded-full bg-[#1C1C1E] text-white text-[10px] font-bold uppercase' : 'px-3 py-1 rounded-full bg-[var(--panel)] text-[var(--muted)] text-[10px] font-bold uppercase'}
                        onClick={() => updateHabit(selected.id, { polarity: p })}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="pageHero p-6 flex flex-col gap-4 text-center">
                <div className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Create a new habit</div>
                <input
                  className="w-full h-10 bg-white/70 border border-black/5 rounded-2xl px-4 text-sm font-medium"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return
                    commitHabitDraft()
                  }}
                  placeholder="Habit name..."
                />
                <button
                  className="h-10 rounded-2xl bg-[#D95D39] text-white text-xs font-bold"
                  onClick={() => commitHabitDraft()}
                >
                  Add habit
                </button>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Select a habit to edit</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
