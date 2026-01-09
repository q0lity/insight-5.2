import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { InboxCapture } from '../../storage/inbox'
import { Icon } from '../../ui/icons'
import { LtBarChart, LtHeatmap, LtLineAreaChart, type SeriesPoint } from '../../ui/life-tracker-charts'
import { basePoints, pointsForMinutes } from '../../scoring/points'

type WorkoutSet = {
  id: string
  reps: number
  weight: number
}

type WorkoutExercise = {
  id: string
  name: string
  sets: WorkoutSet[]
}

type WorkoutSession = {
  id: string
  title: string
  startedAt: number
  endedAt: number | null
  exercises: WorkoutExercise[]
  notes?: string
}

type HealthImport = {
  id: string
  provider: string
  fileName: string
  importedAt: number
  rows: number
  note?: string
}

const WORKOUT_STORAGE_KEY = 'insight5.workouts.v1'
const HEALTH_IMPORT_KEY = 'insight5.health.imports.v1'

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function loadWorkouts(): WorkoutSession[] {
  try {
    const raw = localStorage.getItem(WORKOUT_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as WorkoutSession[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveWorkouts(next: WorkoutSession[]) {
  try {
    localStorage.setItem(WORKOUT_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}

function loadHealthImports(): HealthImport[] {
  try {
    const raw = localStorage.getItem(HEALTH_IMPORT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as HealthImport[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveHealthImports(next: HealthImport[]) {
  try {
    localStorage.setItem(HEALTH_IMPORT_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}

function isoDateFromMs(ms: number) {
  const d = new Date(ms)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function extractNumericTokens(text: string) {
  const out = new Map<string, number[]>()
  const add = (name: string, n: number) => {
    const key = name.toLowerCase()
    const existing = out.get(key) ?? []
    existing.push(n)
    out.set(key, existing)
  }

  for (const m of text.matchAll(/#([a-zA-Z][\w/-]*)\(([-+]?\d*\.?\d+)\)/g)) {
    add(m[1], Number(m[2]))
  }
  for (const m of text.matchAll(/#([a-zA-Z][\w/-]*):([-+]?\d*\.?\d+)/g)) {
    add(m[1], Number(m[2]))
  }
  return out
}

function buildDailySeries(captures: InboxCapture[], key: string, maxDays: number): Array<{ date: string; value: number }> {
  const byDate = new Map<string, number[]>()
  for (const c of captures) {
    const tokens = extractNumericTokens(c.rawText)
    const values = tokens.get(key.toLowerCase())
    if (!values || values.length === 0) continue
    const date = isoDateFromMs(c.createdAt)
    const existing = byDate.get(date) ?? []
    existing.push(...values)
    byDate.set(date, existing)
  }

  const dates = Array.from(byDate.keys()).sort()
  const trimmed = dates.slice(-maxDays)
  return trimmed.map((d) => {
    const vals = byDate.get(d) ?? []
    const value = vals[vals.length - 1] ?? 0
    return { date: d, value }
  })
}

function toSeriesPoints(series: Array<{ date: string; value: number }>): SeriesPoint[] {
  return series.map((s, i) => ({ x: i, y: s.value }))
}

function buildHeatmapValues(series: Array<{ date: string; value: number }>, maxDays: number) {
  const out: Array<{ dayIndex: number; value: number }> = []
  const padded = series.slice(-maxDays)
  const startIndex = Math.max(0, maxDays - padded.length)
  for (let i = 0; i < startIndex; i++) out.push({ dayIndex: i, value: 0 })
  for (let i = 0; i < padded.length; i++) out.push({ dayIndex: startIndex + i, value: padded[i].value })
  return out
}

function buildWorkoutHeatmap(workouts: WorkoutSession[], days: number) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = today.getTime() - (days - 1) * 24 * 60 * 60 * 1000
  const values = Array.from({ length: days }).map(() => 0)
  for (const w of workouts) {
    const day = new Date(w.startedAt)
    day.setHours(0, 0, 0, 0)
    const idx = Math.floor((day.getTime() - start) / (24 * 60 * 60 * 1000))
    if (idx < 0 || idx >= days) continue
    values[idx] = (values[idx] ?? 0) + 1
  }
  return values
}

type TrackerTile = { id: string; label: string; emoji: string; tokenHint: string }

const QUICK_TRACKERS: TrackerTile[] = [
  { id: 'mood', label: 'Mood', emoji: '🙂', tokenHint: '#mood(7)' },
  { id: 'energy', label: 'Energy', emoji: '⚡', tokenHint: '#energy(7)' },
  { id: 'water', label: 'Water', emoji: '💧', tokenHint: '#water(16)' },
  { id: 'stress', label: 'Stress', emoji: '🫥', tokenHint: '#stress(3)' },
  { id: 'workout', label: 'Workout', emoji: '🏋️', tokenHint: '#workout(45) +gym' },
]

export function LifeTrackerDashboard(props: {
  captures: InboxCapture[]
  onRefresh: () => void
  onOpenCapture: () => void
  captureDraft: string
  setCaptureDraft: (t: string) => void
}) {
  const now = new Date()
  const greeting = greetingForHour(now.getHours())

  const [ltColumns, setLtColumns] = useState(2)
  const [ltMaximized, setLtMaximized] = useState<string | null>(null)
  const [workouts, setWorkouts] = useState<WorkoutSession[]>(() => loadWorkouts())
  const [workoutTitle, setWorkoutTitle] = useState('')
  const [exerciseDraft, setExerciseDraft] = useState('')
  const [setDrafts, setSetDrafts] = useState<Record<string, { reps: string; weight: string }>>({})

  const stressSeries = buildDailySeries(props.captures, 'stress', 14)
  const energySeries = buildDailySeries(props.captures, 'energy', 365)
  const activeWorkout = workouts.find((w) => !w.endedAt) ?? null

  function updateActiveWorkout(next: WorkoutSession) {
    setWorkouts((prev) => prev.map((w) => (w.id === next.id ? next : w)))
  }

  function startWorkout() {
    if (activeWorkout) return
    const title = workoutTitle.trim() || `Workout ${new Date().toLocaleDateString()}`
    const next: WorkoutSession = {
      id: makeId(),
      title,
      startedAt: Date.now(),
      endedAt: null,
      exercises: [],
    }
    setWorkouts((prev) => [next, ...prev])
    setWorkoutTitle('')
  }

  function endWorkout() {
    if (!activeWorkout) return
    updateActiveWorkout({ ...activeWorkout, endedAt: Date.now() })
  }

  function addExerciseToWorkout(name: string) {
    if (!activeWorkout || !name.trim()) return
    const next = {
      ...activeWorkout,
      exercises: [...activeWorkout.exercises, { id: makeId(), name: name.trim(), sets: [] }],
    }
    updateActiveWorkout(next)
    setExerciseDraft('')
  }

  function addSetToExercise(exerciseId: string) {
    if (!activeWorkout) return
    const draft = setDrafts[exerciseId]
    const reps = Number(draft?.reps ?? '')
    const weight = Number(draft?.weight ?? '')
    if (!Number.isFinite(reps) || !Number.isFinite(weight)) return
    const next = {
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((ex) =>
        ex.id === exerciseId
          ? { ...ex, sets: [...ex.sets, { id: makeId(), reps: Math.max(0, reps), weight: Math.max(0, weight) }] }
          : ex,
      ),
    }
    updateActiveWorkout(next)
    setSetDrafts((prev) => ({ ...prev, [exerciseId]: { reps: '', weight: '' } }))
  }

  function removeSet(exerciseId: string, setId: string) {
    if (!activeWorkout) return
    const next = {
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((ex) =>
        ex.id === exerciseId ? { ...ex, sets: ex.sets.filter((s) => s.id !== setId) } : ex,
      ),
    }
    updateActiveWorkout(next)
  }

  function removeExercise(exerciseId: string) {
    if (!activeWorkout) return
    updateActiveWorkout({ ...activeWorkout, exercises: activeWorkout.exercises.filter((ex) => ex.id !== exerciseId) })
  }

  useEffect(() => {
    saveWorkouts(workouts)
  }, [workouts])

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] text-[var(--text)] font-['Figtree'] overflow-hidden">
      <div className="px-10 pt-10 pb-6 bg-[var(--bg)]/80 backdrop-blur-xl sticky top-0 z-10 space-y-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-gradient">Life Tracker</h1>
            <p className="text-sm text-[var(--muted)] font-semibold uppercase tracking-widest">{greeting}, track your vitals.</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={props.onRefresh}
              className="w-10 h-10 rounded-full bg-white border border-black/5 flex items-center justify-center text-[var(--muted)] hover:text-[var(--accent)] transition-colors shadow-sm"
            >
              <Icon name="bolt" size={18} />
            </button>
            <button 
              onClick={props.onOpenCapture}
              className="h-12 px-6 bg-[#D95D39] text-white rounded-2xl font-bold shadow-lg shadow-[#D95D39]/20 hover:scale-105 active:scale-95 transition-all"
            >
              + Log Metric
            </button>
          </div>
        </div>

        <div className="flex items-center gap-8">
            <div className="flex items-center gap-4 bg-white/40 backdrop-blur border border-white/20 p-1.5 rounded-2xl">
                <div className="px-3 text-[10px] font-black uppercase text-[var(--muted)]">Columns</div>
                <div className="flex gap-1">
                    {[1, 2, 3, 4].map(n => (
                        <button 
                            key={n}
                            onClick={() => setLtColumns(n)}
                            className={`w-8 h-8 rounded-xl font-bold text-xs transition-all ${ltColumns === n ? 'bg-white shadow-md text-[var(--text)]' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
                        >
                            {n}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-10 pb-32 max-w-7xl mx-auto w-full">
        <div className={`grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-${ltColumns}`}>
          {/* Stress Level */}
          <div className="glassCard space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted)]">Stress Level</h3>
              <div className="flex gap-2">
                <button className="w-8 h-8 rounded-lg bg-[var(--panel)] flex items-center justify-center text-[var(--muted)]" onClick={() => setLtMaximized('stress')}>
                    <Icon name="maximize" size={14} />
                </button>
              </div>
            </div>
            <LtLineAreaChart points={toSeriesPoints(stressSeries)} color="#D95D39" />
          </div>

          {/* Energy Level */}
          <div className="glassCard space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted)]">Energy (365d)</h3>
              <button className="w-8 h-8 rounded-lg bg-[var(--panel)] flex items-center justify-center text-[var(--muted)]" onClick={() => setLtMaximized('energy')}>
                  <Icon name="maximize" size={14} />
              </button>
            </div>
            <LtHeatmap valuesByDay={buildHeatmapValues(energySeries, 365)} maxValue={10} label="ENERGY" days={365} />
          </div>

          {/* Quick Track */}
          <div className="glassCard space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted)]">Quick Actions</h3>
            <div className="grid grid-cols-3 gap-3">
              {QUICK_TRACKERS.map((t) => (
                <button
                  key={t.id}
                  className="flex flex-col items-center gap-2 p-4 bg-[var(--panel)] rounded-2xl hover:bg-[var(--panel)] hover:shadow-xl hover:scale-105 transition-all group"
                  onClick={() => {
                    const next = props.captureDraft.trim().length === 0 ? t.tokenHint : `${props.captureDraft.trim()} ${t.tokenHint}`
                    props.setCaptureDraft(next)
                    props.onOpenCapture()
                  }}>
                  <span className="text-2xl group-hover:scale-110 transition-transform">{t.emoji}</span>
                  <span className="text-[10px] font-bold uppercase tracking-tighter text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Workout Studio */}
          <div className="glassCard space-y-6 md:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted)]">Workout Studio</h3>
              <div className="flex items-center gap-3">
                {activeWorkout && <span className="flex items-center gap-2 px-3 py-1 bg-[#3D8856]/10 text-[#3D8856] text-[10px] font-black rounded-full uppercase animate-pulse">● Active</span>}
                <button className="w-8 h-8 rounded-lg bg-[var(--panel)] flex items-center justify-center text-[var(--muted)]" onClick={() => setLtMaximized('workout')}>
                    <Icon name="maximize" size={14} />
                </button>
              </div>
            </div>

            {!activeWorkout ? (
              <div className="flex gap-3">
                <input
                  className="flex-1 h-12 bg-[var(--panel)] border-none rounded-2xl px-6 text-sm font-medium outline-none focus:ring-4 focus:ring-[#D95D39]/5 transition-all"
                  value={workoutTitle}
                  onChange={(e) => setWorkoutTitle(e.target.value)}
                  placeholder="Push Day, Morning Yoga..."
                />
                <button className="h-12 px-8 bg-[#1C1C1E] text-white rounded-2xl font-bold text-sm shadow-xl hover:scale-105 transition-all" onClick={startWorkout}>
                  Start
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex items-center justify-between p-6 bg-[var(--panel)] rounded-[32px]">
                  <div>
                    <h4 className="text-xl font-bold text-[var(--text)]">{activeWorkout.title}</h4>
                    <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Started {new Date(activeWorkout.startedAt).toLocaleTimeString()}</p>
                  </div>
                  <button className="h-10 px-6 bg-[#D95D39] text-white rounded-xl font-bold text-xs shadow-lg" onClick={endWorkout}>
                    Finish Session
                  </button>
                </div>

                <div className="space-y-4">
                    {activeWorkout.exercises.map((ex) => (
                        <div key={ex.id} className="p-6 bg-white rounded-3xl border border-black/5 shadow-sm space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-[var(--text)]">{ex.name}</span>
                                <button onClick={() => removeExercise(ex.id)} className="text-[var(--muted)] hover:text-[#CF423C]">×</button>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                                {ex.sets.map((s, idx) => (
                                    <div key={s.id} className="p-3 bg-[var(--panel)] rounded-xl flex flex-col items-center relative group">
                                        <span className="text-[8px] font-bold text-[var(--muted)] uppercase">Set {idx + 1}</span>
                                        <span className="text-xs font-black">{s.reps} × {s.weight}lb</span>
                                        <button onClick={() => removeSet(ex.id, s.id)} className="absolute -top-1 -right-1 w-4 h-4 bg-[#CF423C] text-white rounded-full text-[8px] opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                                    </div>
                                ))}
                                <div className="col-span-2 flex gap-2">
                                    <input className="w-1/3 h-10 bg-[var(--panel)] border-none rounded-xl px-3 text-xs font-bold text-center" placeholder="Reps" value={setDrafts[ex.id]?.reps ?? ''} onChange={(e) => setSetDrafts((prev) => ({ ...prev, [ex.id]: { reps: e.target.value, weight: prev[ex.id]?.weight ?? '' } }))} />
                                    <input className="w-1/3 h-10 bg-[var(--panel)] border-none rounded-xl px-3 text-xs font-bold text-center" placeholder="Lb" value={setDrafts[ex.id]?.weight ?? ''} onChange={(e) => setSetDrafts((prev) => ({ ...prev, [ex.id]: { reps: prev[ex.id]?.reps ?? '', weight: e.target.value } }))} />
                                    <button className="flex-1 h-10 bg-[#1C1C1E] text-white rounded-xl font-bold text-[10px]" onClick={() => addSetToExercise(ex.id)}>Add Set</button>
                                </div>
                            </div>
                        </div>
                    ))}
                    <div className="flex gap-2">
                        <input className="flex-1 h-12 bg-[var(--panel)] border-none rounded-2xl px-6 text-sm font-medium" placeholder="Add exercise (e.g. Squat)" value={exerciseDraft} onChange={(e) => setExerciseDraft(e.target.value)} />
                        <button className="h-12 px-6 bg-[var(--panel)] text-[var(--text)] rounded-2xl font-bold text-xs" onClick={() => addExerciseToWorkout(exerciseDraft)}>+ Exercise</button>
                    </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
