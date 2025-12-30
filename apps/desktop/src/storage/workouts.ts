import { db } from '../db/insight-db'

export type WorkoutType = 'strength' | 'cardio' | 'mobility' | 'recovery' | 'mixed'

export type ExerciseSet = {
  reps?: number
  weight?: number           // in lbs
  duration?: number         // in seconds
  distance?: number         // in meters
  rpe?: number              // Rate of Perceived Exertion (1-10)
  restSeconds?: number
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
  if (/\b(cardio|run|running|treadmill|elliptical|cycling|zone 2)\b/i.test(text)) workoutType = 'cardio'
  else if (/\b(lift|strength|bench|squat|deadlift|weights?)\b/i.test(text)) workoutType = 'strength'
  else if (/\b(yoga|stretch|mobility|foam roll)\b/i.test(text)) workoutType = 'mobility'
  else if (/\b(sauna|cold plunge|recovery|massage)\b/i.test(text)) workoutType = 'recovery'

  // Parse "3 sets of 10 at 225" or "3x10 at 225" patterns
  const setPatterns = [
    /(\d+)\s*(?:sets?\s+(?:of\s+)?)?(\d+)\s*(?:reps?)?\s*(?:at|@)\s*(\d+)/gi,
    /(\d+)\s*x\s*(\d+)\s*(?:at|@)\s*(\d+)/gi,
  ]

  for (const pattern of setPatterns) {
    for (const match of text.matchAll(pattern)) {
      const numSets = parseInt(match[1], 10)
      const reps = parseInt(match[2], 10)
      const weight = parseInt(match[3], 10)

      // Try to find exercise name before this match
      const beforeMatch = text.slice(0, match.index).trim()
      const exerciseName = beforeMatch.split(/[,.]/).pop()?.trim() || 'Exercise'

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
  const cardioMatch = text.match(/(\d+)\s*(?:minutes?|mins?|m)\s*(?:on\s+)?(treadmill|elliptical|running|cycling)/i)
    ?? text.match(/(?:ran|run|walked)\s*(\d+(?:\.\d+)?)\s*miles?\s*(?:in\s*)?(\d+)?\s*(?:minutes?|mins?)?/i)

  if (cardioMatch) {
    const duration = parseInt(cardioMatch[1] ?? cardioMatch[2] ?? '30', 10) * 60 // convert to seconds
    exercises.push({
      id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: cardioMatch[2] ?? 'Cardio',
      type: 'cardio',
      sets: [{ duration }],
    })
  }

  // Parse RPE
  const rpeMatch = text.match(/\b(?:rpe|difficulty|intensity)\s*(?:was|of|:)?\s*(\d{1,2})/i)
  const overallRpe = rpeMatch ? Math.min(10, parseInt(rpeMatch[1], 10)) : undefined

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
  await db.workouts.delete(id)
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
