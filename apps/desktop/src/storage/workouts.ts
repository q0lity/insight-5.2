import { db } from '../db/insight-db'
import type { WeightUnit, DistanceUnit } from '../db/insight-db'
import { deleteWorkoutFromSupabase, syncWorkoutToSupabase } from '../supabase/sync'

export type WorkoutType = 'strength' | 'cardio' | 'mobility' | 'recovery' | 'mixed'

export type ExerciseSet = {
  reps?: number
  weight?: number
  weightUnit?: WeightUnit   // lbs or kg
  duration?: number         // in seconds
  distance?: number
  distanceUnit?: DistanceUnit
  rpe?: number              // Rate of Perceived Exertion (1-10)
  restSeconds?: number
}

// Smart context tracking for set additions
type WorkoutContext = {
  workout: Workout | null
  lastExercise: Exercise | null
  lastSetDefaults: Partial<ExerciseSet>
  timestamp: number
}

const CONTEXT_EXPIRY_MS = 30 * 60 * 1000 // 30 minutes

let workoutContext: WorkoutContext = {
  workout: null,
  lastExercise: null,
  lastSetDefaults: {},
  timestamp: 0,
}

// Get the current workout context (if still valid)
export function getWorkoutContext(): WorkoutContext | null {
  if (Date.now() - workoutContext.timestamp > CONTEXT_EXPIRY_MS) {
    clearWorkoutContext()
    return null
  }
  return workoutContext.workout ? workoutContext : null
}

// Update workout context after logging a workout or exercise
export function updateWorkoutContext(workout: Workout, exercise?: Exercise, set?: ExerciseSet) {
  workoutContext = {
    workout,
    lastExercise: exercise ?? workout.exercises[workout.exercises.length - 1] ?? null,
    lastSetDefaults: set ? { reps: set.reps, weight: set.weight, weightUnit: set.weightUnit } : {},
    timestamp: Date.now(),
  }
}

// Clear the workout context
export function clearWorkoutContext() {
  workoutContext = {
    workout: null,
    lastExercise: null,
    lastSetDefaults: {},
    timestamp: 0,
  }
}

// Append a set to the most recent exercise in context
export async function appendSetToRecentExercise(set: ExerciseSet): Promise<boolean> {
  const ctx = getWorkoutContext()
  if (!ctx?.workout || !ctx.lastExercise) return false

  // Find the exercise in the workout
  const workout = await getWorkout(ctx.workout.id)
  if (!workout) return false

  const exerciseIndex = workout.exercises.findIndex(ex => ex.id === ctx.lastExercise?.id)
  if (exerciseIndex === -1) return false

  // Merge set with defaults from last set
  const mergedSet: ExerciseSet = {
    reps: set.reps ?? ctx.lastSetDefaults.reps,
    weight: set.weight ?? ctx.lastSetDefaults.weight,
    weightUnit: set.weightUnit ?? ctx.lastSetDefaults.weightUnit,
    duration: set.duration,
    distance: set.distance,
    rpe: set.rpe,
    restSeconds: set.restSeconds,
  }

  // Add the set
  workout.exercises[exerciseIndex].sets.push(mergedSet)
  await saveWorkout(workout)

  // Update context with new set
  updateWorkoutContext(workout, workout.exercises[exerciseIndex], mergedSet)

  return true
}

// Append a set to a specific exercise by name
export async function appendSetToExerciseByName(exerciseName: string, set: ExerciseSet): Promise<boolean> {
  const ctx = getWorkoutContext()
  if (!ctx?.workout) return false

  const workout = await getWorkout(ctx.workout.id)
  if (!workout) return false

  // Find exercise by name (case-insensitive)
  const normalizedName = exerciseName.toLowerCase().trim()
  const exerciseIndex = workout.exercises.findIndex(
    ex => ex.name.toLowerCase().trim() === normalizedName
  )
  if (exerciseIndex === -1) return false

  // Add the set
  workout.exercises[exerciseIndex].sets.push(set)
  await saveWorkout(workout)

  // Update context
  updateWorkoutContext(workout, workout.exercises[exerciseIndex], set)

  return true
}

export type Exercise = {
  id: string
  name: string
  type: WorkoutType
  sets: ExerciseSet[]
  notes?: string
  muscleGroups?: string[]   // e.g., ['chest', 'triceps']
}

export type Workout = {
  id: string
  eventId: string           // Links to parent calendar event
  userId?: string
  type: WorkoutType
  title: string
  exercises: Exercise[]
  startAt: number
  endAt?: number
  totalDuration?: number    // in minutes
  estimatedCalories?: number
  overallRpe?: number       // Overall RPE for the workout
  notes?: string
  goalId?: string           // Links to fitness goal
  tags?: string[]
  location?: string
  createdAt: number
  updatedAt: number
}

// Common exercises database for autocomplete
export const COMMON_EXERCISES: Array<{ name: string; type: WorkoutType; muscleGroups: string[] }> = [
  // Strength - Chest
  { name: 'Bench Press', type: 'strength', muscleGroups: ['chest', 'triceps', 'shoulders'] },
  { name: 'Incline Bench Press', type: 'strength', muscleGroups: ['chest', 'triceps', 'shoulders'] },
  { name: 'Dumbbell Fly', type: 'strength', muscleGroups: ['chest'] },
  { name: 'Push-ups', type: 'strength', muscleGroups: ['chest', 'triceps', 'shoulders'] },
  // Strength - Back
  { name: 'Deadlift', type: 'strength', muscleGroups: ['back', 'glutes', 'hamstrings'] },
  { name: 'Pull-ups', type: 'strength', muscleGroups: ['back', 'biceps'] },
  { name: 'Barbell Row', type: 'strength', muscleGroups: ['back', 'biceps'] },
  { name: 'Lat Pulldown', type: 'strength', muscleGroups: ['back', 'biceps'] },
  // Strength - Legs
  { name: 'Squat', type: 'strength', muscleGroups: ['quads', 'glutes', 'hamstrings'] },
  { name: 'Leg Press', type: 'strength', muscleGroups: ['quads', 'glutes'] },
  { name: 'Lunges', type: 'strength', muscleGroups: ['quads', 'glutes', 'hamstrings'] },
  { name: 'Leg Curl', type: 'strength', muscleGroups: ['hamstrings'] },
  { name: 'Calf Raises', type: 'strength', muscleGroups: ['calves'] },
  // Strength - Shoulders
  { name: 'Overhead Press', type: 'strength', muscleGroups: ['shoulders', 'triceps'] },
  { name: 'Lateral Raises', type: 'strength', muscleGroups: ['shoulders'] },
  { name: 'Face Pulls', type: 'strength', muscleGroups: ['shoulders', 'back'] },
  // Strength - Arms
  { name: 'Bicep Curls', type: 'strength', muscleGroups: ['biceps'] },
  { name: 'Tricep Dips', type: 'strength', muscleGroups: ['triceps'] },
  { name: 'Skull Crushers', type: 'strength', muscleGroups: ['triceps'] },
  // Cardio
  { name: 'Treadmill', type: 'cardio', muscleGroups: ['cardio'] },
  { name: 'Running', type: 'cardio', muscleGroups: ['cardio', 'legs'] },
  { name: 'Cycling', type: 'cardio', muscleGroups: ['cardio', 'legs'] },
  { name: 'Elliptical', type: 'cardio', muscleGroups: ['cardio'] },
  { name: 'Rowing', type: 'cardio', muscleGroups: ['cardio', 'back', 'arms'] },
  { name: 'Jump Rope', type: 'cardio', muscleGroups: ['cardio', 'calves'] },
  { name: 'Swimming', type: 'cardio', muscleGroups: ['cardio', 'full body'] },
  { name: 'HIIT', type: 'cardio', muscleGroups: ['cardio', 'full body'] },
  { name: 'Zone 2', type: 'cardio', muscleGroups: ['cardio'] },
  // Mobility
  { name: 'Stretching', type: 'mobility', muscleGroups: ['flexibility'] },
  { name: 'Yoga', type: 'mobility', muscleGroups: ['flexibility', 'core'] },
  { name: 'Foam Rolling', type: 'mobility', muscleGroups: ['recovery'] },
  { name: 'Vibrating Plate', type: 'mobility', muscleGroups: ['recovery'] },
  // Recovery
  { name: 'Sauna', type: 'recovery', muscleGroups: ['recovery'] },
  { name: 'Cold Plunge', type: 'recovery', muscleGroups: ['recovery'] },
  { name: 'Massage', type: 'recovery', muscleGroups: ['recovery'] },
]

// Calorie estimation formulas (rough estimates)
export function estimateCalories(workout: Workout, bodyWeightKg = 80): number {
  let total = 0
  for (const exercise of workout.exercises) {
    const sets = exercise.sets.length
    const avgReps = exercise.sets.reduce((sum, s) => sum + (s.reps ?? 0), 0) / sets || 10
    const avgWeight = exercise.sets.reduce((sum, s) => sum + (s.weight ?? 0), 0) / sets || 0
    const duration = exercise.sets.reduce((sum, s) => sum + (s.duration ?? 0), 0) / 60 // convert to minutes

    switch (exercise.type) {
      case 'strength':
        // ~0.05 kcal per rep per kg lifted, multiplied by sets
        total += sets * avgReps * (avgWeight * 0.453592) * 0.05
        break
      case 'cardio':
        // Roughly 8-12 kcal per minute depending on intensity
        const intensity = workout.overallRpe ?? 6
        total += duration * (6 + intensity * 0.6)
        break
      case 'mobility':
      case 'recovery':
        // Lower calorie burn: ~3-4 kcal per minute
        total += duration * 3.5
        break
    }
  }
  return Math.round(total)
}

// Parse workout from natural language
export function parseWorkoutFromText(text: string): Partial<Workout> | null {
  const exercises: Exercise[] = []
  const lower = text.toLowerCase()

  // Detect workout type
  let workoutType: WorkoutType = 'mixed'
  const hasCardio = /\b(cardio|run|running|treadmill|elliptical|cycling|zone\s*[2-5])\b/i.test(text)
  const hasStrength = /\b(lift|strength|bench|squat|deadlift|weights?|push[-\s]?ups?|pull[-\s]?ups?|dips?|rows?|squats|lunges)\b/i.test(text)
  const hasMobility = /\b(yoga|stretch|mobility|foam roll)\b/i.test(text)
  const hasRecovery = /\b(sauna|cold plunge|recovery|massage)\b/i.test(text)

  const flags = [hasCardio, hasStrength, hasMobility, hasRecovery].filter(Boolean).length
  if (flags > 1) workoutType = 'mixed'
  else if (hasCardio) workoutType = 'cardio'
  else if (hasStrength) workoutType = 'strength'
  else if (hasMobility) workoutType = 'mobility'
  else if (hasRecovery) workoutType = 'recovery'

  // Parse "3 sets of 10 at 225" or "3x10 at 225" patterns
  const setPatterns = [
    /(\d+)\s*(?:sets?\s+(?:of\s+)?)?(\d+)\s*(?:reps?)?\s*([a-zA-Z][a-zA-Z\s-]{2,40})\s*(?:at|@)\s*(\d+)/gi,
    /(\d+)\s*(?:sets?\s+(?:of\s+)?)?(\d+)\s*(?:reps?)?\s*(?:at|@)\s*(\d+)/gi,
    /(\d+)\s*x\s*(\d+)\s*(?:at|@)\s*(\d+)/gi,
  ]

  for (const pattern of setPatterns) {
    for (const match of text.matchAll(pattern)) {
      const numSets = parseInt(match[1], 10)
      const reps = parseInt(match[2], 10)
      const hasInlineName = match.length > 4
      const weight = parseInt(hasInlineName ? match[4] : match[3], 10)

      // Try to find exercise name before this match
      const beforeMatch = text.slice(0, match.index).trim()
      const inlineName = hasInlineName ? match[3]?.trim() : ''
      const exerciseName = inlineName || beforeMatch.split(/[,.]/).pop()?.trim() || 'Exercise'

      const sets: ExerciseSet[] = Array(numSets).fill(null).map(() => ({ reps, weight }))
      exercises.push({
        id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: exerciseName,
        type: 'strength',
        sets,
      })
    }
  }

  // Parse cardio: "ran 3 miles in 24 minutes" or "30 minutes treadmill"
  const cardioMinutesMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|m)\s*(?:on\s+)?(treadmill|elliptical|running|cycling|bike|rower|rowing|walk|walking)/i)
  const cardioDistanceDeviceMatch = text.match(/(\d+(?:\.\d+)?)\s*(miles?|mi|kilometers?|km)\s*(?:on|in)\s*(?:the\s+)?(treadmill|elliptical|bike|cycling|rower|rowing|walk|walking)/i)
  const cardioDistanceOnItMatch = text.match(/(\d+(?:\.\d+)?)\s*(miles?|mi|kilometers?|km)\s*(?:on|in)\s*it\b/i)
  const cardioDistanceMatch = text.match(/(?:ran|run|walked|jogged|cycled|biked)\s*(\d+(?:\.\d+)?)\s*(miles?|mi|kilometers?|km)\s*(?:in\s*)?(\d+(?:\.\d+)?)?\s*(?:minutes?|mins?|m)?/i)
  const cardioBareDistanceMatch = text.match(/(\d+(?:\.\d+)?)\s*(miles?|mi|kilometers?|km)\s*(?:in\s*)?(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|m)/i)
  const cardioDeviceHintMatch = text.match(/\b(treadmill|elliptical|running|cycling|bike|rower|rowing|walk|walking)\b/i)

  if (cardioMinutesMatch || cardioDistanceDeviceMatch || cardioDistanceOnItMatch || cardioDistanceMatch || cardioBareDistanceMatch) {
    const resolveCardioName = (raw?: string) => {
      const normalized = (raw ?? '').toLowerCase()
      if (normalized.includes('elliptical')) return 'Elliptical'
      if (normalized.includes('treadmill')) return 'Treadmill'
      if (normalized.includes('row')) return 'Rowing'
      if (normalized.includes('bike') || normalized.includes('cycle')) return 'Cycling'
      if (normalized.includes('walk')) return 'Walk'
      if (normalized.includes('run') || normalized.includes('jog')) return 'Run'
      return 'Cardio'
    }

    let durationSeconds: number | undefined
    let distanceMiles: number | undefined
    let name = 'Cardio'

    if (cardioMinutesMatch) {
      const minutes = Number(cardioMinutesMatch[1])
      durationSeconds = Number.isFinite(minutes) ? Math.max(1, minutes) * 60 : undefined
      name = resolveCardioName(cardioMinutesMatch[2])
    }

    const distanceMatch = cardioDistanceDeviceMatch ?? cardioDistanceMatch ?? cardioBareDistanceMatch ?? cardioDistanceOnItMatch
    if (distanceMatch) {
      const distance = Number(distanceMatch[1])
      const unit = distanceMatch[2] ?? 'mi'
      if (Number.isFinite(distance)) {
        distanceMiles = /km|kilometer/.test(unit) ? distance * 0.621371 : distance
      }
      if (distanceMatch === cardioDistanceMatch || distanceMatch === cardioBareDistanceMatch) {
        if (distanceMatch[3]) {
          const minutes = Number(distanceMatch[3])
          durationSeconds = Number.isFinite(minutes) ? Math.max(1, minutes) * 60 : durationSeconds
        }
      }
      if (name === 'Cardio') {
        const hint = cardioDistanceDeviceMatch?.[3] ?? cardioDeviceHintMatch?.[1]
        name = resolveCardioName(hint)
      }
    }

    if (name === 'Cardio') {
      if (/\bwalk/.test(lower)) name = 'Walk'
      if (/\b(run|ran|jog)\b/.test(lower)) name = 'Run'
      if (/\b(cycle|bike)\b/.test(lower)) name = 'Cycling'
    }

    exercises.push({
      id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      type: 'cardio',
      sets: [{ duration: durationSeconds, distance: distanceMiles }],
    })
  }

  for (const match of text.matchAll(/(\d+)\s*(push[-\s]?ups?|pull[-\s]?ups?|sit[-\s]?ups?|burpees|squats|lunges|jumping jacks|dips?|rows?)\b/gi)) {
    const reps = parseInt(match[1], 10)
    const name = match[2].replace(/\s+/g, ' ').trim()
    if (!Number.isFinite(reps)) continue
    exercises.push({
      id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      type: 'strength',
      sets: [{ reps }],
    })
  }

  const recoveryMatch = text.match(/\b(sauna|cold plunge|massage|stretch(?:ing)?|yoga|mobility|equestrian|horseback)\b.*?(\d+(?:\.\d+)?)\s*(minutes?|mins?|m|hours?|hrs?|h)\b/i)
  if (recoveryMatch) {
    const amount = Number(recoveryMatch[2])
    const unit = recoveryMatch[3] ?? 'm'
    const minutes = Number.isFinite(amount)
      ? /h|hr|hour/.test(unit)
        ? amount * 60
        : amount
      : null
    if (minutes && minutes > 0) {
      exercises.push({
        id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: recoveryMatch[1].replace(/\b\w/g, (c) => c.toUpperCase()),
        type: /\b(sauna|cold plunge|massage)\b/i.test(recoveryMatch[1]) ? 'recovery' : 'mobility',
        sets: [{ duration: Math.round(minutes) * 60 }],
      })
    }
  }

  const rpeMatch = text.match(/\b(?:rpe|difficulty|intensity)\s*(?:was|of|:)?\s*(\d{1,2})/i)
  const rpeFromWords =
    /\b(max|all[-\s]?out)\b/.test(lower)
      ? 10
      : /\b(really hard|very hard|brutal)\b/.test(lower)
        ? 9
        : /\bhard\b/.test(lower)
          ? 8
          : /\bmoderate|medium\b/.test(lower)
            ? 6
            : /\beasy|light\b/.test(lower)
              ? 4
              : undefined
  const overallRpe = rpeMatch ? Math.min(10, parseInt(rpeMatch[1], 10)) : rpeFromWords

  if (exercises.length === 0) return null

  return {
    type: workoutType,
    exercises,
    overallRpe,
    tags: ['#workout', `#${workoutType}`],
  }
}

// Storage functions using Dexie
export async function saveWorkout(workout: Workout): Promise<string> {
  const now = Date.now()
  const toSave = {
    ...workout,
    createdAt: workout.createdAt ?? now,
    updatedAt: now,
  }
  await db.workouts.put(toSave)
  void syncWorkoutToSupabase(toSave)
  return toSave.id
}

export async function getWorkout(id: string): Promise<Workout | undefined> {
  return db.workouts.get(id)
}

export async function getWorkoutsByEvent(eventId: string): Promise<Workout[]> {
  return db.workouts.where('eventId').equals(eventId).toArray()
}

export async function getWorkoutsByDateRange(startMs: number, endMs: number): Promise<Workout[]> {
  return db.workouts
    .where('startAt')
    .between(startMs, endMs)
    .toArray()
}

export async function getRecentWorkouts(limit = 20): Promise<Workout[]> {
  return db.workouts
    .orderBy('startAt')
    .reverse()
    .limit(limit)
    .toArray()
}

export async function deleteWorkout(id: string): Promise<void> {
  const existing = await db.workouts.get(id)
  await db.workouts.delete(id)
  if (existing) {
    void deleteWorkoutFromSupabase(existing)
  }
}

export async function getWorkoutStats(startMs: number, endMs: number): Promise<{
  totalWorkouts: number
  totalDuration: number
  totalCalories: number
  byType: Record<WorkoutType, number>
}> {
  const workouts = await getWorkoutsByDateRange(startMs, endMs)
  const byType: Record<WorkoutType, number> = {
    strength: 0,
    cardio: 0,
    mobility: 0,
    recovery: 0,
    mixed: 0,
  }

  let totalDuration = 0
  let totalCalories = 0

  for (const w of workouts) {
    byType[w.type]++
    totalDuration += w.totalDuration ?? 0
    totalCalories += w.estimatedCalories ?? estimateCalories(w)
  }

  return {
    totalWorkouts: workouts.length,
    totalDuration,
    totalCalories,
    byType,
  }
}
