export type EntityType = 'tag' | 'person' | 'place'

// Adaptive Learning System - Pattern types
export type PatternType =
  | 'activity_skill' // "gym" -> skills: ["Weightlifting"]
  | 'activity_category' // "gym" -> Health/Workout
  | 'goal_category' // Goal "Get Shredded" -> Health/Workout
  | 'person_context' // "@mom" -> Social/Call
  | 'location_fill' // "!LA Fitness" -> Health/Workout

export type PatternSourceType = 'keyword' | 'goal' | 'person' | 'location' | 'tag'
export type PatternTargetType = 'skill' | 'category' | 'subcategory' | 'goal' | 'project'

export type Pattern = {
  id: string
  type: PatternType

  // Source (what triggers the pattern)
  sourceType: PatternSourceType
  sourceKey: string // normalized lowercase

  // Target (what gets suggested)
  targetType: PatternTargetType
  targetKey: string
  targetDisplayName?: string

  // Confidence tracking
  confidence: number // 0.0 - 1.0
  occurrenceCount: number
  acceptCount: number
  rejectCount: number
  lastSeenAt: number

  createdAt: number
  updatedAt: number
}

export type Entity = {
  id: string
  type: EntityType
  key: string
  displayName: string
  createdAt: number
  updatedAt: number
}

export type NoteStatus = 'raw' | 'parsed' | 'needs_clarification'

export type Note = {
  id: string
  createdAt: number
  rawText: string
  status: NoteStatus
  entityIds: string[]
}

export type TaskStatus = 'todo' | 'in_progress' | 'done'

export type Task = {
  id: string
  title: string
  notes?: string
  status: TaskStatus
  createdAt: number
  updatedAt: number
  dueAt?: number | null
  scheduledAt?: number | null
  completedAt?: number | null
  tags?: string[]
  contexts?: string[]
  people?: string[]
  location?: string | null
  skills?: string[]
  character?: string[]
  entityIds: string[]
  parentEventId?: string | null
  project?: string | null
  goal?: string | null
  category?: string | null
  subcategory?: string | null
  importance?: number | null
  urgency?: number | null
  difficulty?: number | null
  estimateMinutes?: number | null
  sourceNoteId?: string | null
}

export type CalendarEventKind = 'event' | 'task' | 'log' | 'episode'

// Workout types
export type WorkoutType = 'strength' | 'cardio' | 'mobility' | 'recovery' | 'mixed'

export type WeightUnit = 'lbs' | 'kg'
export type DistanceUnit = 'mi' | 'km'

export type ExerciseSet = {
  reps?: number
  weight?: number
  weightUnit?: WeightUnit // User's preferred unit (lbs or kg)
  duration?: number // seconds
  distance?: number
  distanceUnit?: DistanceUnit
  rpe?: number
  restSeconds?: number
}

export type Exercise = {
  id: string
  name: string
  type: WorkoutType
  sets: ExerciseSet[]
  notes?: string
  muscleGroups?: string[]
}

export type Workout = {
  id: string
  eventId: string
  userId?: string
  type: WorkoutType
  title: string
  exercises: Exercise[]
  startAt: number
  endAt?: number
  totalDuration?: number
  estimatedCalories?: number
  overallRpe?: number
  notes?: string
  goalId?: string
  tags?: string[]
  location?: string
  createdAt: number
  updatedAt: number
}

// Nutrition types
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'drink'

// Extended macros with full micronutrients
export type ExtendedMacros = {
  protein: number // grams
  carbs: number // grams
  fat: number // grams
  fiber?: number // grams
  saturatedFat?: number // grams
  transFat?: number // grams
  sugar?: number // grams
  sodium?: number // milligrams
  potassium?: number // milligrams
  cholesterol?: number // milligrams
}

export type FoodItem = {
  id: string
  name: string
  quantity: number
  unit: string
  calories?: number
  // Macronutrients (grams)
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
  // Extended micronutrients
  saturatedFat?: number // grams
  transFat?: number // grams
  sugar?: number // grams
  sodium?: number // milligrams
  potassium?: number // milligrams
  cholesterol?: number // milligrams
  // Metadata
  brand?: string
  notes?: string
  confidence?: number // 0-1, how confident the AI estimate is
  source?: 'manual' | 'ai_estimate' | 'database'
}

export type Meal = {
  id: string
  eventId: string
  userId?: string
  type: MealType
  title: string
  items: FoodItem[]
  totalCalories: number
  macros: ExtendedMacros
  location?: string
  photoUri?: string
  notes?: string
  goalId?: string
  tags?: string[]
  eatenAt: number
  createdAt: number
  updatedAt: number
  estimationModel?: string // e.g., "gpt-4o", "gpt-4o-mini"
}

export type CalendarEvent = {
  id: string
  title: string
  startAt: number
  endAt: number
  allDay: boolean
  active: boolean
  createdAt: number
  updatedAt: number
  kind: CalendarEventKind
  taskId?: string | null
  parentEventId?: string | null
  completedAt?: number | null
  icon?: string | null
  color?: string | null
  notes?: string
  tags?: string[]
  contexts?: string[]
  entityIds: string[]
  project?: string | null
  goal?: string | null
  category?: string | null
  subcategory?: string | null
  importance?: number | null
  urgency?: number | null
  difficulty?: number | null
  estimateMinutes?: number | null
  location?: string | null
  people?: string[]
  skills?: string[]
  character?: string[]
  sourceNoteId?: string | null
  trackerKey?: string | null
}
