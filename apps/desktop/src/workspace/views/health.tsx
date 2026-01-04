import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '../../ui/icons'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { db } from '../../db/insight-db'
import type { Workout, Meal, WorkoutType, MealType } from '../../db/insight-db'
import type { CalendarEvent } from '../../storage/calendar'

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatPace(distanceMiles: number, durationSeconds: number) {
  if (!distanceMiles || !durationSeconds) return null
  const hours = durationSeconds / 3600
  if (hours <= 0) return null
  const mph = distanceMiles / hours
  return `${mph.toFixed(1)} mph`
}

function workoutPace(workout: Workout) {
  for (const ex of workout.exercises) {
    for (const set of ex.sets) {
      if (set.distance && set.duration) {
        const pace = formatPace(set.distance, set.duration)
        if (pace) return pace
      }
    }
  }
  return null
}

function formatDistance(distanceMiles?: number | null) {
  if (!distanceMiles) return null
  const rounded = distanceMiles >= 10 ? distanceMiles.toFixed(1) : distanceMiles.toFixed(2)
  return `${rounded} mi`
}

function exerciseDurationMinutes(exercise: Workout['exercises'][number]) {
  const seconds = exercise.sets.reduce((sum, set) => sum + (set.duration ?? 0), 0)
  return seconds > 0 ? Math.round(seconds / 60) : null
}

function exerciseDistanceMiles(exercise: Workout['exercises'][number]) {
  const distance = exercise.sets.reduce((sum, set) => sum + (set.distance ?? 0), 0)
  return distance > 0 ? distance : null
}

function summarizeExercise(exercise: Workout['exercises'][number]) {
  const sets = exercise.sets.length
  const avgReps = Math.round(exercise.sets.reduce((sum, set) => sum + (set.reps ?? 0), 0) / (sets || 1))
  const avgWeight = Math.round(exercise.sets.reduce((sum, set) => sum + (set.weight ?? 0), 0) / (sets || 1))
  const durationMinutes = exerciseDurationMinutes(exercise)
  const distanceMiles = exerciseDistanceMiles(exercise)

  if (exercise.type === 'strength') {
    const parts = []
    if (sets > 0 && avgReps > 0) parts.push(`${sets}x${avgReps}`)
    if (avgWeight > 0) parts.push(`@ ${avgWeight} lb`)
    return parts.join(' ')
  }

  const parts = []
  if (distanceMiles) parts.push(formatDistance(distanceMiles))
  if (durationMinutes) parts.push(formatDuration(durationMinutes))
  return parts.join(' / ')
}

function workoutTotals(workout: Workout) {
  let durationMinutes = workout.totalDuration ?? 0
  let distanceMiles = 0
  if (!durationMinutes) {
    durationMinutes = workout.exercises.reduce((sum, ex) => sum + (exerciseDurationMinutes(ex) ?? 0), 0)
  }
  distanceMiles = workout.exercises.reduce((sum, ex) => sum + (exerciseDistanceMiles(ex) ?? 0), 0)
  return {
    durationMinutes: durationMinutes || null,
    distanceMiles: distanceMiles || null,
  }
}

function startOfDayMs(ms: number) {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function addDaysMs(ms: number, days: number) {
  return ms + days * 24 * 60 * 60 * 1000
}

type HealthView = 'overview' | 'workouts' | 'nutrition' | 'trackers'

interface HealthDashboardProps {
  events: CalendarEvent[]
}

export function HealthDashboard({ events }: HealthDashboardProps) {
  const [view, setView] = useState<HealthView>('overview')
  const [range, setRange] = useState<'today' | 'week' | 'month'>('week')
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)

  const now = Date.now()
  const rangeStart = useMemo(() => {
    const today = startOfDayMs(now)
    if (range === 'today') return today
    if (range === 'week') return addDaysMs(today, -6)
    return addDaysMs(today, -29)
  }, [now, range])
  const rangeEnd = startOfDayMs(now) + 24 * 60 * 60 * 1000

  // Load data
  const loadData = useCallback(async () => {
    try {
      const allWorkouts = await db.workouts
        .where('startAt')
        .between(rangeStart, rangeEnd)
        .toArray()
      setWorkouts(allWorkouts)

      const allMeals = await db.meals
        .where('eatenAt')
        .between(rangeStart, rangeEnd)
        .toArray()
      setMeals(allMeals)
    } catch (err) {
      console.error('Failed to load health data:', err)
    } finally {
      setLoading(false)
    }
  }, [rangeStart, rangeEnd])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Calculate workout stats
  const workoutStats = useMemo(() => {
    const totalSessions = workouts.length
    const totalDuration = workouts.reduce((sum, w) => sum + (w.totalDuration ?? 0), 0)
    const totalCalories = workouts.reduce((sum, w) => sum + (w.estimatedCalories ?? 0), 0)
    const avgRpe = workouts.length > 0
      ? workouts.reduce((sum, w) => sum + (w.overallRpe ?? 0), 0) / workouts.length
      : 0

    const byType = new Map<WorkoutType, number>()
    for (const w of workouts) {
      byType.set(w.type, (byType.get(w.type) ?? 0) + 1)
    }

    return { totalSessions, totalDuration, totalCalories, avgRpe, byType }
  }, [workouts])

  // Calculate nutrition stats
  const nutritionStats = useMemo(() => {
    const totalCalories = meals.reduce((sum, m) => sum + m.totalCalories, 0)
    const totalProtein = meals.reduce((sum, m) => sum + m.macros.protein, 0)
    const totalCarbs = meals.reduce((sum, m) => sum + m.macros.carbs, 0)
    const totalFat = meals.reduce((sum, m) => sum + m.macros.fat, 0)

    const avgCaloriesPerDay = range === 'today'
      ? totalCalories
      : Math.round(totalCalories / (range === 'week' ? 7 : 30))

    const byType = new Map<MealType, number>()
    for (const m of meals) {
      byType.set(m.type, (byType.get(m.type) ?? 0) + 1)
    }

    return { totalCalories, totalProtein, totalCarbs, totalFat, avgCaloriesPerDay, byType }
  }, [meals, range])

  // Extract tracker logs from events
  const trackerLogs = useMemo(() => {
    const trackers = new Map<string, Array<{ value: number; at: number }>>()

    for (const ev of events) {
      if (ev.startAt < rangeStart || ev.startAt > rangeEnd) continue
      if (!ev.trackerKey) continue

      const key = ev.trackerKey.toLowerCase()
      const match = ev.title.match(/:?\s*(\d+(?:\.\d+)?)\s*(?:\/10)?/i)
      if (!match) continue

      const value = parseFloat(match[1]!)
      if (!Number.isFinite(value)) continue

      if (!trackers.has(key)) {
        trackers.set(key, [])
      }
      trackers.get(key)!.push({ value, at: ev.startAt })
    }

    return trackers
  }, [events, rangeStart, rangeEnd])

  // Calculate tracker averages
  const trackerAverages = useMemo(() => {
    const avgs = new Map<string, number>()
    for (const [key, logs] of trackerLogs) {
      if (logs.length === 0) continue
      const sum = logs.reduce((a, l) => a + l.value, 0)
      avgs.set(key, sum / logs.length)
    }
    return avgs
  }, [trackerLogs])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[var(--panel)]">
        <div className="text-[#8E8E93] font-bold animate-pulse">Loading health data...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[var(--panel)] font-['Figtree'] overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-[#E5E5EA]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text)] tracking-tight">Health & Fitness</h1>
            <p className="text-sm text-[#8E8E93] mt-1">Track your workouts, nutrition, and well-being</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-4">
          <div className="flex p-1 bg-white rounded-xl shadow-sm">
            {(['overview', 'workouts', 'nutrition', 'trackers'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  view === v
                    ? 'bg-[#1C1C1E] text-white'
                    : 'text-[#8E8E93] hover:text-[var(--text)]'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="flex p-1 bg-white rounded-xl shadow-sm">
            {(['today', 'week', 'month'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  range === r
                    ? 'bg-orange-500 text-white'
                    : 'text-[#8E8E93] hover:text-[var(--text)]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {view === 'overview' && (
          <div className="space-y-6 max-w-6xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Workout Summary Card */}
            <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Icon name="zap" size={20} />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#8E8E93]">Workouts</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-4xl font-bold text-[var(--text)]">{workoutStats.totalSessions}</span>
                  <span className="text-sm font-bold text-[#8E8E93]">sessions</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-[var(--panel)] rounded-xl">
                    <span className="block text-xs font-bold text-[#8E8E93]">Duration</span>
                    <span className="font-bold text-[var(--text)]">{formatDuration(workoutStats.totalDuration)}</span>
                  </div>
                  <div className="p-3 bg-[var(--panel)] rounded-xl">
                    <span className="block text-xs font-bold text-[#8E8E93]">Calories</span>
                    <span className="font-bold text-[var(--text)]">{workoutStats.totalCalories.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Nutrition Summary Card */}
            <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
                  <Icon name="utensils" size={20} />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#8E8E93]">Nutrition</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-4xl font-bold text-[var(--text)]">{nutritionStats.avgCaloriesPerDay.toLocaleString()}</span>
                  <span className="text-sm font-bold text-[#8E8E93]">kcal/day</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="p-2 bg-blue-50 rounded-xl text-center">
                    <span className="block text-[10px] font-bold text-blue-400">Protein</span>
                    <span className="font-bold text-blue-600">{nutritionStats.totalProtein}g</span>
                  </div>
                  <div className="p-2 bg-amber-50 rounded-xl text-center">
                    <span className="block text-[10px] font-bold text-amber-400">Carbs</span>
                    <span className="font-bold text-amber-600">{nutritionStats.totalCarbs}g</span>
                  </div>
                  <div className="p-2 bg-red-50 rounded-xl text-center">
                    <span className="block text-[10px] font-bold text-red-400">Fat</span>
                    <span className="font-bold text-red-600">{nutritionStats.totalFat}g</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trackers Summary Card */}
            <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                  <Icon name="heart" size={20} />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#8E8E93]">Well-being</h3>
              </div>
              <div className="space-y-3">
                {Array.from(trackerAverages.entries()).slice(0, 4).map(([key, avg]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[var(--text)] capitalize">{key}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-[#E5E5EA] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${(avg / 10) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-[#8E8E93] w-8 text-right">
                        {avg.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
                {trackerAverages.size === 0 && (
                  <p className="text-sm text-[#8E8E93] text-center py-4">
                    No tracker data yet
                  </p>
                )}
              </div>
            </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-[#8E8E93]">Apple Health Import</h3>
                  <p className="text-sm text-[#8E8E93] mt-2">
                    Connect on iOS to import workouts, steps, and recovery data into your health dashboard.
                  </p>
                </div>
                <button className="px-4 py-2 rounded-lg bg-[#1C1C1E] text-white text-xs font-bold uppercase tracking-wider">
                  Connect
                </button>
              </div>
              <p className="text-xs text-[#8E8E93] mt-3">
                iOS-only. Requires HealthKit permissions in the mobile dev client.
              </p>
            </div>
          </div>
        )}

        {view === 'workouts' && (
          <div className="space-y-6 max-w-6xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[var(--text)]">Workout Log</h2>
              <span className="text-sm font-bold text-[#8E8E93]">
                {workouts.length} workouts
              </span>
            </div>

            {workouts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-[#E5E5EA]">
                <div className="w-16 h-16 mx-auto rounded-full bg-orange-100 flex items-center justify-center mb-4">
                  <Icon name="zap" className="w-8 h-8 text-orange-400" />
                </div>
                <h3 className="font-bold text-[var(--text)] mb-2">No workouts logged</h3>
                <p className="text-sm text-[#8E8E93]">
                  Log your workouts using voice capture or add them manually
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Workout</TableHead>
                      <TableHead>Exercises</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Distance</TableHead>
                      <TableHead>RPE</TableHead>
                      <TableHead>Calories</TableHead>
                      <TableHead>Pace</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workouts
                      .sort((a, b) => b.startAt - a.startAt)
                      .map((workout) => {
                        const pace = workoutPace(workout)
                        const totals = workoutTotals(workout)
                        return (
                          <TableRow key={workout.id}>
                            <TableCell className="text-xs text-[#8E8E93]">
                              <div className="font-semibold text-[var(--text)]">{formatDate(workout.startAt)}</div>
                              <div>{formatTime(workout.startAt)}</div>
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="font-bold text-[var(--text)]">{workout.title}</div>
                              <div className="text-[#8E8E93] uppercase tracking-wider">{workout.type}</div>
                            </TableCell>
                            <TableCell className="text-xs text-[var(--text)]">
                              <div className="space-y-1">
                                {workout.exercises.map((ex) => {
                                  const summary = summarizeExercise(ex)
                                  return (
                                    <div key={ex.id} className="flex gap-2">
                                      <span className="font-semibold">{ex.name}</span>
                                      {summary ? <span className="text-[#8E8E93]">- {summary}</span> : null}
                                    </div>
                                  )
                                })}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-[var(--text)]">
                              {totals.durationMinutes ? formatDuration(totals.durationMinutes) : '-'}
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-[var(--text)]">
                              {totals.distanceMiles ? formatDistance(totals.distanceMiles) : '-'}
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-[var(--text)]">
                              {workout.overallRpe ? `RPE ${workout.overallRpe}` : '-'}
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-orange-500">
                              {workout.estimatedCalories ? `${workout.estimatedCalories} kcal` : '-'}
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-blue-600">
                              {pace ?? '-'}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {view === 'nutrition' && (
          <div className="space-y-6 max-w-6xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[var(--text)]">Meal Timeline</h2>
              <span className="text-sm font-bold text-[#8E8E93]">
                {meals.length} meals
              </span>
            </div>

            {meals.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-[#E5E5EA]">
                <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <Icon name="utensils" className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="font-bold text-[var(--text)] mb-2">No meals logged</h3>
                <p className="text-sm text-[#8E8E93]">
                  Log your meals using voice capture or add them manually
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Meal</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Calories</TableHead>
                      <TableHead>Protein</TableHead>
                      <TableHead>Carbs</TableHead>
                      <TableHead>Fat</TableHead>
                      <TableHead>Fiber</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {meals
                      .sort((a, b) => a.eatenAt - b.eatenAt)
                      .map((meal) => (
                        <TableRow key={meal.id}>
                          <TableCell className="text-xs text-[#8E8E93]">
                            <div className="font-semibold text-[var(--text)]">{formatDate(meal.eatenAt)}</div>
                            <div>{formatTime(meal.eatenAt)}</div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-bold text-[var(--text)]">{meal.title}</div>
                            <div className="text-[#8E8E93] uppercase tracking-wider">{meal.type}</div>
                          </TableCell>
                          <TableCell className="text-xs text-[var(--text)]">
                            <div className="space-y-1">
                              {meal.items.map((item) => (
                                <div key={item.id} className="flex gap-2">
                                  <span className="font-semibold">
                                    {item.quantity} {item.unit}
                                  </span>
                                  <span>{item.name}</span>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-[var(--text)]">
                            {meal.totalCalories} kcal
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-blue-500">
                            {meal.macros.protein} g
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-amber-500">
                            {meal.macros.carbs} g
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-red-500">
                            {meal.macros.fat} g
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-[var(--text)]">
                            {meal.macros.fiber ? `${meal.macros.fiber} g` : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {view === 'trackers' && (
          <div className="space-y-6 max-w-4xl">
            <h2 className="text-xl font-bold text-[var(--text)]">Tracker Trends</h2>

            {trackerLogs.size === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-[#E5E5EA]">
                <div className="w-16 h-16 mx-auto rounded-full bg-purple-100 flex items-center justify-center mb-4">
                  <Icon name="heart" className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="font-bold text-[var(--text)] mb-2">No tracker data</h3>
                <p className="text-sm text-[#8E8E93]">
                  Log trackers like mood, energy, or pain using voice capture
                </p>
              </div>
            ) : (
              <div className="grid gap-6">
                {Array.from(trackerLogs.entries()).map(([key, logs]) => {
                  const avg = trackerAverages.get(key) ?? 0
                  const sorted = [...logs].sort((a, b) => a.at - b.at)
                  const latest = sorted[sorted.length - 1]

                  return (
                    <div
                      key={key}
                      className="bg-white rounded-xl border border-[#E5E5EA] p-6 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-[var(--text)] capitalize">{key}</h3>
                        <div className="text-right">
                          <span className="block text-2xl font-bold text-purple-600">{avg.toFixed(1)}</span>
                          <span className="text-[10px] font-bold text-[#8E8E93]">avg</span>
                        </div>
                      </div>

                      {/* Simple bar chart of recent values */}
                      <div className="flex items-end gap-1 h-16">
                        {sorted.slice(-14).map((log, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${(log.value / 10) * 100}%` }}
                              className="w-full bg-purple-200 rounded-t"
                              style={{ minHeight: 4 }}
                            />
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between mt-4 text-xs text-[#8E8E93]">
                        <span>{logs.length} entries</span>
                        {latest && (
                          <span>Latest: {latest.value} ({formatTime(latest.at)})</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
