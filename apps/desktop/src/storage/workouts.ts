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
  const exercisesByName = new Map<string, Exercise>()
  const lower = text.toLowerCase()

  const normalizeExerciseKey = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() || 'exercise'

  const makeExerciseId = () => `ex_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

  const addExerciseSet = (name: string, type: WorkoutType, set: ExerciseSet) => {
    const cleaned = name.replace(/\s+/g, ' ').trim() || 'Exercise'
    const key = normalizeExerciseKey(cleaned)
    let exercise = exercisesByName.get(key)
    if (!exercise) {
      exercise = {
        id: makeExerciseId(),
        name: cleaned,
        type,
        sets: [],
      }
      exercisesByName.set(key, exercise)
    }
    exercise.sets.push(set)
  }

  const findKnownExerciseName = (segment: string) => {
    const lowerSegment = segment.toLowerCase()
    let best: string | null = null
    let bestIdx = -1
    for (const ex of COMMON_EXERCISES) {
      const nameLower = ex.name.toLowerCase()
      const idx = lowerSegment.lastIndexOf(nameLower)
      if (idx > bestIdx) {
        bestIdx = idx
        best = ex.name
      }
    }
    return best
  }

  const findExerciseNameBefore = (index: number | null) => {
    if (index == null) return null
    const before = text.slice(0, index)
    const known = findKnownExerciseName(before)
    if (known) return known
    const tail = before.split(/[,.]/).pop()?.trim() ?? ''
    if (!tail) return null
    const words = tail.split(/\s+/).filter(Boolean)
    return words.slice(-4).join(' ')
  }

  const parseDurationSeconds = (raw: string) => {
    const hoursMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|hr|h)\b/i)
    const minsMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|min)\b/i)
    const hours = hoursMatch ? Number(hoursMatch[1]) : 0
    const mins = minsMatch ? Number(minsMatch[1]) : 0
    const total = (Number.isFinite(hours) ? hours * 3600 : 0) + (Number.isFinite(mins) ? mins * 60 : 0)
    return total > 0 ? Math.round(total) : undefined
  }

  const parseDistanceMiles = (raw: string) => {
    const milesMatch = raw.match(/(\d+(?:\.\d+)?)\s*(miles?|mi)\b/i)
    if (milesMatch?.[1]) {
      const distance = Number(milesMatch[1])
      return Number.isFinite(distance) ? distance : undefined
    }
    const kmMatch = raw.match(/(\d+(?:\.\d+)?)\s*(kilometers?|kms?|km)\b/i)
    if (kmMatch?.[1]) {
      const distance = Number(kmMatch[1])
      return Number.isFinite(distance) ? distance * 0.621371 : undefined
    }
    const kMatch = raw.match(/\b(\d+(?:\.\d+)?)\s*k\b/i)
    if (kMatch?.[1]) {
      const distance = Number(kMatch[1])
      return Number.isFinite(distance) ? distance * 0.621371 : undefined
    }
    const metersMatch = raw.match(/(\d+(?:\.\d+)?)\s*(meters?|metres?)\b/i)
    if (metersMatch?.[1]) {
      const distance = Number(metersMatch[1])
      return Number.isFinite(distance) ? distance / 1609.34 : undefined
    }
    return undefined
  }

  const parsePaceSecondsPerMile = (raw: string) => {
    const paceMatch = raw.match(/(\d{1,2}:\d{2})\s*(?:\/|per)?\s*(mi|mile|km|k)\b/i)
    if (!paceMatch?.[1]) return undefined
    const [minStr, secStr] = paceMatch[1].split(':')
    const mins = Number(minStr)
    const secs = Number(secStr)
    if (!Number.isFinite(mins) || !Number.isFinite(secs)) return undefined
    const baseSeconds = mins * 60 + secs
    const unit = paceMatch[2]?.toLowerCase() ?? 'mi'
    if (unit.startsWith('k')) {
      return baseSeconds * 1.60934
    }
    return baseSeconds
  }

  const parseSpeedMph = (raw: string) => {
    const mphMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:mph|mi\/h|miles per hour)\b/i)
    if (mphMatch?.[1]) {
      const speed = Number(mphMatch[1])
      return Number.isFinite(speed) ? speed : undefined
    }
    const kphMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:kph|km\/h|kilometers per hour)\b/i)
    if (kphMatch?.[1]) {
      const speed = Number(kphMatch[1])
      return Number.isFinite(speed) ? speed * 0.621371 : undefined
    }
    return undefined
  }

  // Detect workout type
  let workoutType: WorkoutType = 'mixed'
  const hasCardio = /\b(cardio|run|running|treadmill|elliptical|cycling|bike|rower|rowing|walk|walking|swim|swimming|stairmaster|stairs|zone\s*[2-5])\b/i.test(text)
  const hasStrength = /\b(lift|strength|bench|squat|deadlift|weights?|press|push[-\s]?ups?|pull[-\s]?ups?|dips?|rows?|squats|lunges|curls?)\b/i.test(text)
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
    /(\d+)\s*(?:sets?\s+(?:of\s+)?)?(\d+)\s*(?:reps?)?\s*([a-zA-Z][a-zA-Z\s-]{2,40})\s*(?:at|@)\s*(\d+(?:\.\d+)?)(?:\s*(?:lb|lbs|kg|kgs))?/gi,
    /(\d+)\s*(?:sets?\s+(?:of\s+)?)?(\d+)\s*(?:reps?)?\s*(?:at|@)\s*(\d+(?:\.\d+)?)(?:\s*(?:lb|lbs|kg|kgs))?\s*([a-zA-Z][a-zA-Z\s-]{2,40})/gi,
    /([a-zA-Z][a-zA-Z\s-]{2,40})\s*(\d+)\s*x\s*(\d+)\s*(?:at|@)?\s*(\d+(?:\.\d+)?)(?:\s*(?:lb|lbs|kg|kgs))?/gi,
    /(\d+)\s*x\s*(\d+)\s*(?:at|@)?\s*(\d+(?:\.\d+)?)(?:\s*(?:lb|lbs|kg|kgs))?/gi,
    /([a-zA-Z][a-zA-Z\s-]{2,40})\s*(\d+)\s*sets?\s*(?:of\s*)?(\d+)\s*(?:reps?)?/gi,
    /(\d+)\s*x\s*(\d+)\s*([a-zA-Z][a-zA-Z\s-]{2,40})/gi,
    /(\d+(?:\.\d+)?)\s*x\s*(\d+)\s*x\s*(\d+)\s*([a-zA-Z][a-zA-Z\s-]{2,40})?/gi,
  ]

  const seenStrengthMatches = new Set<string>()
  for (const pattern of setPatterns) {
    for (const match of text.matchAll(pattern)) {
      const key = `${match.index ?? 0}:${match[0]}`
      if (seenStrengthMatches.has(key)) continue
      seenStrengthMatches.add(key)

      let numSets: number | null = null
      let reps: number | null = null
      let weight: number | null = null
      let exerciseName: string | null = null

      if (match.length >= 5 && pattern === setPatterns[0]) {
        numSets = Number(match[1])
        reps = Number(match[2])
        exerciseName = match[3]?.trim() ?? null
        weight = Number(match[4])
      } else if (match.length >= 5 && pattern === setPatterns[1]) {
        numSets = Number(match[1])
        reps = Number(match[2])
        weight = Number(match[3])
        exerciseName = match[4]?.trim() ?? null
      } else if (match.length >= 5 && pattern === setPatterns[2]) {
        exerciseName = match[1]?.trim() ?? null
        numSets = Number(match[2])
        reps = Number(match[3])
        weight = Number(match[4])
      } else if (match.length >= 4 && pattern === setPatterns[3]) {
        numSets = Number(match[1])
        reps = Number(match[2])
        weight = Number(match[3])
      } else if (match.length >= 4 && pattern === setPatterns[4]) {
        exerciseName = match[1]?.trim() ?? null
        numSets = Number(match[2])
        reps = Number(match[3])
      } else if (match.length >= 4 && pattern === setPatterns[5]) {
        numSets = Number(match[1])
        reps = Number(match[2])
        exerciseName = match[3]?.trim() ?? null
      } else if (match.length >= 4 && pattern === setPatterns[6]) {
        weight = Number(match[1])
        reps = Number(match[2])
        numSets = Number(match[3])
        exerciseName = match[4]?.trim() ?? null
      }

      if (!Number.isFinite(numSets ?? NaN) || !Number.isFinite(reps ?? NaN)) continue
      if (weight != null && !Number.isFinite(weight)) weight = null
      if (!exerciseName) {
        exerciseName = findExerciseNameBefore(match.index ?? null) ?? 'Exercise'
      }

      const sets: ExerciseSet[] = Array(Math.max(1, numSets ?? 1)).fill(null).map(() => ({
        reps: Math.max(1, reps ?? 0),
        weight: weight != null ? Math.max(0, weight) : undefined,
      }))
      for (const set of sets) {
        addExerciseSet(exerciseName, 'strength', set)
      }
    }
  }

  // Parse cardio: "ran 3 miles in 24 minutes" or "30 minutes treadmill"
  const cardioMinutesMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|m)\s*(?:on\s+)?(treadmill|elliptical|running|cycling|bike|rower|rowing|walk|walking|swim|swimming|stairmaster|stairs|jump rope)/i)
  const cardioDistanceDeviceMatch = text.match(/(\d+(?:\.\d+)?)\s*(miles?|mi|kilometers?|km)\s*(?:on|in)\s*(?:the\s+)?(treadmill|elliptical|bike|cycling|rower|rowing|walk|walking|swim|swimming|stairmaster|stairs|jump rope)/i)
  const cardioDistanceOnItMatch = text.match(/(\d+(?:\.\d+)?)\s*(miles?|mi|kilometers?|km)\s*(?:on|in)\s*it\b/i)
  const cardioDistanceMatch = text.match(/(?:ran|run|walked|jogged|cycled|biked)\s*(\d+(?:\.\d+)?)\s*(miles?|mi|kilometers?|km)\s*(?:in\s*)?(\d+(?:\.\d+)?)?\s*(?:minutes?|mins?|m)?/i)
  const cardioBareDistanceMatch = text.match(/(\d+(?:\.\d+)?)\s*(miles?|mi|kilometers?|km)\s*(?:in\s*)?(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|m)/i)
  const cardioDeviceHintMatch = text.match(/\b(treadmill|elliptical|running|cycling|bike|rower|rowing|walk|walking|swim|swimming|stairmaster|stairs|jump rope)\b/i)

  const durationSecondsHint = parseDurationSeconds(text)
  const distanceMilesHint = parseDistanceMiles(text)
  const paceSecondsPerMile = parsePaceSecondsPerMile(text)
  const speedMph = parseSpeedMph(text)

  const hasCardioMetrics = Boolean(durationSecondsHint || distanceMilesHint || paceSecondsPerMile || speedMph)
  if (cardioMinutesMatch || cardioDistanceDeviceMatch || cardioDistanceOnItMatch || cardioDistanceMatch || cardioBareDistanceMatch || (hasCardio && hasCardioMetrics)) {
    const resolveCardioName = (raw?: string) => {
      const normalized = (raw ?? '').toLowerCase()
      if (normalized.includes('elliptical')) return 'Elliptical'
      if (normalized.includes('treadmill')) return 'Treadmill'
      if (normalized.includes('row')) return 'Rowing'
      if (normalized.includes('bike') || normalized.includes('cycle')) return 'Cycling'
      if (normalized.includes('stair')) return 'Stairmaster'
      if (normalized.includes('swim')) return 'Swimming'
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

    if (durationSeconds == null && durationSecondsHint) durationSeconds = durationSecondsHint
    if (distanceMiles == null && distanceMilesHint) distanceMiles = distanceMilesHint

    if (distanceMiles != null && durationSeconds == null && paceSecondsPerMile) {
      durationSeconds = Math.round(distanceMiles * paceSecondsPerMile)
    }
    if (durationSeconds != null && distanceMiles == null && paceSecondsPerMile) {
      distanceMiles = durationSeconds / paceSecondsPerMile
    }
    if (durationSeconds != null && distanceMiles == null && speedMph) {
      distanceMiles = (durationSeconds / 3600) * speedMph
    }
    if (distanceMiles != null && durationSeconds == null && speedMph) {
      durationSeconds = Math.round((distanceMiles / speedMph) * 3600)
    }

    if (name === 'Cardio') {
      if (/\bwalk/.test(lower)) name = 'Walk'
      if (/\b(run|ran|jog)\b/.test(lower)) name = 'Run'
      if (/\b(cycle|bike)\b/.test(lower)) name = 'Cycling'
    }

    addExerciseSet(name, 'cardio', { duration: durationSeconds, distance: distanceMiles })
  }

  for (const match of text.matchAll(/(\d+)\s*(push[-\s]?ups?|pull[-\s]?ups?|sit[-\s]?ups?|burpees|squats|lunges|jumping jacks|dips?|rows?)\b/gi)) {
    const reps = parseInt(match[1], 10)
    const name = match[2].replace(/\s+/g, ' ').trim()
    if (!Number.isFinite(reps)) continue
    addExerciseSet(name.charAt(0).toUpperCase() + name.slice(1), 'strength', { reps })
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
      addExerciseSet(
        recoveryMatch[1].replace(/\b\w/g, (c) => c.toUpperCase()),
        /\b(sauna|cold plunge|massage)\b/i.test(recoveryMatch[1]) ? 'recovery' : 'mobility',
        { duration: Math.round(minutes) * 60 },
      )
    }
  }

  const rpeMatch = text.match(/\b(?:rpe|difficulty|intensity)\s*(?:was|of|:)?\s*(\d{1,2})(?:\s*(?:-|to)\s*(\d{1,2}))?/i)
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
  const overallRpe = rpeMatch
    ? (() => {
        const first = parseInt(rpeMatch[1], 10)
        const second = rpeMatch[2] ? parseInt(rpeMatch[2], 10) : null
        if (!Number.isFinite(first)) return null
        if (second != null && Number.isFinite(second)) {
          return Math.min(10, Math.max(0, (first + second) / 2))
        }
        return Math.min(10, Math.max(0, first))
      })()
    : rpeFromWords

  const exercises = Array.from(exercisesByName.values())
  if (exercises.length === 0) return null

  if (overallRpe != null) {
    for (const ex of exercises) {
      for (const set of ex.sets) {
        if (set.rpe == null) set.rpe = overallRpe
      }
    }
  }

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
