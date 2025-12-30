import Dexie, { type Table } from 'dexie'

export type EntityType = 'tag' | 'person' | 'place'

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

export type ExerciseSet = {
  reps?: number
  weight?: number
  duration?: number
  distance?: number
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

export type FoodItem = {
  id: string
  name: string
  quantity: number
  unit: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
  brand?: string
  notes?: string
}

export type Meal = {
  id: string
  eventId: string
  userId?: string
  type: MealType
  title: string
  items: FoodItem[]
  totalCalories: number
  macros: { protein: number; carbs: number; fat: number }
  location?: string
  photoUri?: string
  notes?: string
  goalId?: string
  tags?: string[]
  eatenAt: number
  createdAt: number
  updatedAt: number
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

export class InsightDb extends Dexie {
  entities!: Table<Entity, string>
  notes!: Table<Note, string>
  tasks!: Table<Task, string>
  events!: Table<CalendarEvent, string>
  workouts!: Table<Workout, string>
  meals!: Table<Meal, string>

  constructor() {
    super('insight5.db')
    this.version(1).stores({
      entities: 'id, [type+key], type, key, updatedAt',
      notes: 'id, createdAt, status, *entityIds',
      tasks: 'id, updatedAt, status, dueAt, scheduledAt, *entityIds, sourceNoteId',
      events: 'id, startAt, endAt, allDay, active, kind, trackerKey, *entityIds, sourceNoteId',
    })
    this.version(2).stores({
      entities: 'id, [type+key], type, key, updatedAt',
      notes: 'id, createdAt, status, *entityIds',
      tasks: 'id, updatedAt, status, dueAt, scheduledAt, *entityIds, sourceNoteId',
      events: 'id, startAt, endAt, allDay, active, kind, trackerKey, parentEventId, *entityIds, sourceNoteId',
    })
    this.version(3).stores({
      entities: 'id, [type+key], type, key, updatedAt',
      notes: 'id, createdAt, status, *entityIds',
      tasks: 'id, updatedAt, status, dueAt, scheduledAt, *entityIds, *contexts, sourceNoteId',
      events: 'id, startAt, endAt, allDay, active, kind, trackerKey, parentEventId, *entityIds, *contexts, sourceNoteId',
    })
    // Version 4: Add workouts and meals tables for health tracking
    this.version(4).stores({
      entities: 'id, [type+key], type, key, updatedAt',
      notes: 'id, createdAt, status, *entityIds',
      tasks: 'id, updatedAt, status, dueAt, scheduledAt, *entityIds, *contexts, sourceNoteId',
      events: 'id, startAt, endAt, allDay, active, kind, trackerKey, parentEventId, *entityIds, *contexts, sourceNoteId',
      workouts: 'id, eventId, type, startAt, goalId, *tags, createdAt, updatedAt',
      meals: 'id, eventId, type, eatenAt, goalId, *tags, createdAt, updatedAt',
    })
  }
}

export const db = new InsightDb()

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export function makeEntityId() {
  return makeId('ent')
}

export function makeNoteId() {
  return makeId('note')
}

export function makeTaskId() {
  return makeId('tsk')
}

export function makeEventId() {
  return makeId('evt')
}

export function makeWorkoutId() {
  return makeId('wkt')
}

export function makeMealId() {
  return makeId('meal')
}

export function makeFoodItemId() {
  return makeId('food')
}

export function makeExerciseId() {
  return makeId('exr')
}

export function normalizeEntityKey(raw: string) {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ')
}
