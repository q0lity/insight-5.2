import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Icon } from '../../ui/icons'
import { HabitHeatmap, buildHabitHeatmap, parseHabitTrackerKey } from '../../ui/habit-heatmap'
import type { CalendarEvent } from '../../storage/calendar'
import { createEvent } from '../../storage/calendar'
import { basePoints, pointsForMinutes } from '../../scoring/points'

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

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function loadHabits(): HabitDef[] {
  try {
    const raw = localStorage.getItem('insight5.habits.defs.v1')
    if (!raw) return []
    const parsed = JSON.parse(raw) as HabitDef[]
    return Array.isArray(parsed) ? parsed : []
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
  const selectedStreak = (() => {
    let streak = 0
    for (let i = selectedValues.length - 1; i >= 0; i -= 1) {
      if ((selectedValues[i] ?? 0) > 0) streak += 1
      else break
    }
    return streak
  })()

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
      estimateMinutes: 15,
      polarity: 'both',
    }
    setDefs((prev) => [habit, ...prev])
    setSelectedId(id)
  }

  function updateHabit(id: string, patch: Partial<HabitDef>) {
    setDefs((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)))
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
      trackerKey: polarity === 'negative' ? `habit:${def.id}:neg` : `habit:${def.id}`,
      category: def.category,
      subcategory: def.subcategory,
      difficulty: clamp(def.difficulty, 0, 10),
      importance: clamp(def.importance, 0, 10),
      character: def.character,
      skills: def.skills,
      entityIds: [],
    })
    props.onCreatedEvent(ev)
  }

  return (
    <div className="flex flex-col h-full bg-[#F8F7F4] text-[#1C1C1E] font-['Figtree'] overflow-hidden">
      <div className="px-10 pt-10 pb-6 bg-[#F8F7F4]/80 backdrop-blur-xl sticky top-0 z-10 space-y-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight">Habits</h1>
            <p className="text-sm text-[#86868B] font-semibold">Transform consistency into automated progress.</p>
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
                  const name = draft.trim()
                  addHabit(name)
                  setDraft('')
                }}
              />
              <div className="absolute left-3.5 top-3.5 opacity-30">
                  <Icon name="bolt" size={16} />
              </div>
            </div>
            <button 
              onClick={() => {
                const name = draft.trim()
                addHabit(name)
                setDraft('')
              }}
              className="h-11 px-6 bg-[#D95D39] text-white rounded-2xl font-bold shadow-lg shadow-[#D95D39]/20 hover:scale-105 active:scale-95 transition-all"
            >
              Add Habit
            </button>
          </div>
        </div>
      </div>

        <div className="flex-1 overflow-hidden px-10 pb-32 max-w-7xl mx-auto w-full">
        <div className="flex gap-8 h-full">
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {defs.length === 0 && <div className="py-20 text-center opacity-30 font-bold uppercase text-xs tracking-widest col-span-full">No habits defined</div>}
              {defs.map((h) => {
                const isSelected = selectedId === h.id
                return (
                  <motion.div
                    key={h.id}
                    className={`glassCard group flex flex-col gap-5 cursor-pointer transition-shadow ${isSelected ? 'ring-2 ring-[#D95D39]/25' : ''}`}
                    whileHover={{ y: -4 }}
                    onClick={() => setSelectedId(h.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' && e.key !== ' ') return
                      e.preventDefault()
                      setSelectedId(h.id)
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        className="h-12 px-3 rounded-xl bg-[#CF423C]/10 text-[#CF423C] font-bold text-xs hover:bg-[#CF423C] hover:text-white transition-all shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          void logHabit(h, 'negative')
                        }}
                        aria-label={`Mark ${h.name} missed`}
                      >
                        − Miss
                      </button>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-bold text-lg leading-tight">{h.name}</h3>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              props.onOpenReports?.(h.id)
                            }}
                            className="w-9 h-9 rounded-xl bg-[#F2F0ED] flex items-center justify-center text-[#86868B] hover:bg-[#D95D39]/10 hover:text-[#D95D39] transition-all"
                            aria-label={`Open ${h.name} analytics`}
                          >
                            <Icon name="dots" size={16} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-[#86868B] uppercase tracking-tighter">
                          <span>{h.category ?? 'Personal'}</span>
                          {recent.get(h.id) && (
                            <>
                              <span>·</span>
                              <span>Last {new Date(recent.get(h.id)!).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        className="h-12 px-3 rounded-xl bg-[#3D8856]/10 text-[#3D8856] font-bold text-xs hover:bg-[#3D8856] hover:text-white transition-all shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          void logHabit(h, 'positive')
                        }}
                        aria-label={`Mark ${h.name} done`}
                      >
                        + Done
                      </button>
                    </div>

                    <div className="min-h-[84px]">
                      <HabitHeatmap values={heatmapByHabit.get(h.id) ?? []} startDate={heatmapStart} maxAbs={heatmapMax} />
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>

          <div className="w-[340px] xl:w-[380px] shrink-0">
            {selected ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="pageHero p-6 flex flex-col gap-6 sticky top-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">{selected.name}</h2>
                    <p className="text-[10px] font-bold text-[#86868B] uppercase tracking-[0.2em]">
                      {selected.category ?? 'Uncategorized'} {selected.subcategory && `· ${selected.subcategory}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedId(null)}
                    className="w-8 h-8 rounded-full bg-[#F2F0ED] flex items-center justify-center text-[#86868B]"
                    aria-label="Close habit details"
                  >
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[#F2F0ED] rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest">Done</span>
                    <div className="text-lg font-bold text-[#3D8856]">{selectedPositive}</div>
                  </div>
                  <div className="p-3 bg-[#F2F0ED] rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest">Missed</span>
                    <div className="text-lg font-bold text-[#CF423C]">{selectedNegative}</div>
                  </div>
                  <div className="p-3 bg-[#F2F0ED] rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest">Streak</span>
                    <div className="text-lg font-bold text-[#D95D39]">{selectedStreak}</div>
                  </div>
                  <div className="p-3 bg-[#F2F0ED] rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest">Points</span>
                    <div className="text-lg font-bold text-[#5B5F97]">
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
                    className="h-10 px-3 rounded-2xl bg-white/70 text-[#1C1C1E] text-xs font-bold border border-black/5 hover:bg-white transition-all"
                    onClick={() => props.onOpenReports?.(selected.id)}>
                    Analytics
                  </button>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-[0.2em]">Consistency Map</span>
                  <div className="min-h-[140px]">
                    <HabitHeatmap values={selectedValues} startDate={heatmapStart} showLabels maxAbs={heatmapMax} />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest">Category</label>
                  <input
                    className="w-full h-10 bg-white/60 border border-black/5 rounded-2xl px-4 text-sm font-medium"
                    value={selected.category ?? ''}
                    onChange={(e) => updateHabit(selected.id, { category: e.target.value.trim() || null })}
                    placeholder="Personal, Health, Work…"
                  />
                  <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest">Subcategory</label>
                  <input
                    className="w-full h-10 bg-white/60 border border-black/5 rounded-2xl px-4 text-sm font-medium"
                    value={selected.subcategory ?? ''}
                    onChange={(e) => updateHabit(selected.id, { subcategory: e.target.value.trim() || null })}
                    placeholder="Morning routine, Strength…"
                  />
                  <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest">Tags</label>
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
                  <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest">Skills</label>
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
                  <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest">Estimate (min)</label>
                  <input
                    className="w-full h-10 bg-white/60 border border-black/5 rounded-2xl px-4 text-sm font-medium"
                    value={selected.estimateMinutes ?? ''}
                    onChange={(e) => updateHabit(selected.id, { estimateMinutes: numberOrNull(e.target.value) })}
                    placeholder="15"
                  />
                  <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest">Schedule</label>
                  <input
                    className="w-full h-10 bg-white/60 border border-black/5 rounded-2xl px-4 text-sm font-medium"
                    value={selected.schedule ?? ''}
                    onChange={(e) => updateHabit(selected.id, { schedule: e.target.value })}
                    placeholder="Mon/Wed/Fri · 7:00 AM"
                  />
                  <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest">Target per week</label>
                  <input
                    className="w-full h-10 bg-white/60 border border-black/5 rounded-2xl px-4 text-sm font-medium"
                    value={selected.targetPerWeek ?? ''}
                    onChange={(e) => updateHabit(selected.id, { targetPerWeek: numberOrNull(e.target.value) })}
                    placeholder="4"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest">Importance</label>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={selected.importance}
                    onChange={(e) => updateHabit(selected.id, { importance: clamp(Number(e.target.value), 0, 10) })}
                  />
                  <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest">Difficulty / Energy</label>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={selected.difficulty}
                    onChange={(e) => updateHabit(selected.id, { difficulty: clamp(Number(e.target.value), 0, 10) })}
                  />
                  <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest">Character</label>
                  <div className="flex flex-wrap gap-2">
                    {(['STR', 'INT', 'CON', 'PER'] as const).map((c) => {
                      const active = selected.character.includes(c)
                      return (
                        <button
                          key={c}
                          className={active ? 'px-3 py-1 rounded-full bg-[#D95D39]/10 text-[#D95D39] text-[10px] font-bold' : 'px-3 py-1 rounded-full bg-[#F2F0ED] text-[#86868B] text-[10px] font-bold'}
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
                  <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest">Polarity</label>
                  <div className="flex gap-2">
                    {(['positive', 'negative', 'both'] as const).map((p) => (
                      <button
                        key={p}
                        className={selected.polarity === p ? 'px-3 py-1 rounded-full bg-[#1C1C1E] text-white text-[10px] font-bold uppercase' : 'px-3 py-1 rounded-full bg-[#F2F0ED] text-[#86868B] text-[10px] font-bold uppercase'}
                        onClick={() => updateHabit(selected.id, { polarity: p })}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="pageHero p-6 flex items-center justify-center text-center text-xs font-bold uppercase tracking-widest text-[#86868B]">
                Select a habit to edit
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
