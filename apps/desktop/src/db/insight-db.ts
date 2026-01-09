import Dexie, { type Table } from 'dexie'
import type { CalendarEvent, Entity, Meal, Note, Pattern, Task, Workout } from '@insight/shared'

export type {
  CalendarEventKind,
  DistanceUnit,
  Entity,
  EntityType,
  Exercise,
  ExerciseSet,
  ExtendedMacros,
  FoodItem,
  Meal,
  MealType,
  Note,
  NoteStatus,
  Pattern,
  PatternSourceType,
  PatternTargetType,
  PatternType,
  Task,
  TaskStatus,
  WeightUnit,
  Workout,
  WorkoutType,
} from '@insight/shared'
export {
  makeEntityId,
  makeEventId,
  makeExerciseId,
  makeFoodItemId,
  makeMealId,
  makeNoteId,
  makePatternId,
  makeTaskId,
  makeWorkoutId,
  normalizeEntityKey,
  normalizePatternKey,
} from '@insight/shared'

export class InsightDb extends Dexie {
  entities!: Table<Entity, string>
  notes!: Table<Note, string>
  tasks!: Table<Task, string>
  events!: Table<CalendarEvent, string>
  workouts!: Table<Workout, string>
  meals!: Table<Meal, string>
  patterns!: Table<Pattern, string>

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
    // Version 5: Add patterns table for adaptive learning system
    this.version(5).stores({
      entities: 'id, [type+key], type, key, updatedAt',
      notes: 'id, createdAt, status, *entityIds',
      tasks: 'id, updatedAt, status, dueAt, scheduledAt, *entityIds, *contexts, sourceNoteId',
      events: 'id, startAt, endAt, allDay, active, kind, trackerKey, parentEventId, *entityIds, *contexts, sourceNoteId',
      workouts: 'id, eventId, type, startAt, goalId, *tags, createdAt, updatedAt',
      meals: 'id, eventId, type, eatenAt, goalId, *tags, createdAt, updatedAt',
      patterns: 'id, type, [type+sourceKey], [sourceType+sourceKey], confidence, updatedAt',
    })
    // Version 6: Index parentEventId on tasks for note-linked task queries
    this.version(6).stores({
      entities: 'id, [type+key], type, key, updatedAt',
      notes: 'id, createdAt, status, *entityIds',
      tasks: 'id, updatedAt, status, dueAt, scheduledAt, parentEventId, *entityIds, *contexts, sourceNoteId',
      events: 'id, startAt, endAt, allDay, active, kind, trackerKey, parentEventId, *entityIds, *contexts, sourceNoteId',
      workouts: 'id, eventId, type, startAt, goalId, *tags, createdAt, updatedAt',
      meals: 'id, eventId, type, eatenAt, goalId, *tags, createdAt, updatedAt',
      patterns: 'id, type, [type+sourceKey], [sourceType+sourceKey], confidence, updatedAt',
    })
  }
}

export const db = new InsightDb()
