import type { Task as DbTask, TaskStatus } from '../db/insight-db'
import { db, makeTaskId } from '../db/insight-db'
import { migrateFromLocalStorageIfEmpty } from '../db/migrate-localstorage'
import { markEntryDeleted, syncTaskToSupabase } from '../supabase/sync'

export type { TaskStatus }

export type Task = DbTask

let migrated = false
async function ensureMigrated() {
  if (migrated) return
  migrated = true
  await migrateFromLocalStorageIfEmpty()
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function sanitizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item) => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function hasInvalidStringArray(value: unknown) {
  if (!Array.isArray(value)) return true
  return value.some((item) => typeof item !== 'string' || item.trim().length === 0)
}

function normalizeTask(task: Task): Task {
  const now = Date.now()
  const createdAt = isFiniteNumber(task.createdAt) ? task.createdAt : now
  const updatedAt = isFiniteNumber(task.updatedAt) ? task.updatedAt : now
  const dueAt = isFiniteNumber(task.dueAt) ? task.dueAt : null
  const scheduledAt = isFiniteNumber(task.scheduledAt) ? task.scheduledAt : null
  const completedAt = isFiniteNumber(task.completedAt) ? task.completedAt : null
  return {
    ...task,
    createdAt,
    updatedAt,
    dueAt,
    scheduledAt,
    completedAt,
    entityIds: sanitizeStringArray(task.entityIds),
    contexts: sanitizeStringArray(task.contexts),
    tags: sanitizeStringArray(task.tags),
    people: sanitizeStringArray(task.people),
    skills: sanitizeStringArray(task.skills),
    character: sanitizeStringArray(task.character),
    location: normalizeOptionalString(task.location),
  }
}

function isTaskNormalized(task: Task) {
  if (!isFiniteNumber(task.createdAt)) return false
  if (!isFiniteNumber(task.updatedAt)) return false
  if (task.dueAt != null && !isFiniteNumber(task.dueAt)) return false
  if (task.scheduledAt != null && !isFiniteNumber(task.scheduledAt)) return false
  if (task.completedAt != null && !isFiniteNumber(task.completedAt)) return false
  return true
}

export async function listTasks(): Promise<Task[]> {
  await ensureMigrated()
  try {
    return db.tasks.orderBy('updatedAt').reverse().limit(2000).toArray()
  } catch (err) {
    const raw = await db.tasks.toArray()
    const normalized = raw.map(normalizeTask)
    const needsFix = raw.some(
      (task) =>
        !isTaskNormalized(task) ||
        hasInvalidStringArray(task.entityIds) ||
        hasInvalidStringArray(task.contexts) ||
        hasInvalidStringArray(task.tags) ||
        hasInvalidStringArray(task.people) ||
        hasInvalidStringArray(task.skills) ||
        hasInvalidStringArray(task.character),
    )
    if (needsFix) await db.tasks.bulkPut(normalized)
    return normalized.sort((a, b) => b.updatedAt - a.updatedAt)
  }
}

export async function createTask(input: {
  title: string
  status?: TaskStatus
  tags?: string[]
  contexts?: string[]
  people?: string[]
  location?: string | null
  skills?: string[]
  character?: string[]
  entityIds?: string[]
  sourceNoteId?: string | null
  parentEventId?: string | null
  category?: string | null
  subcategory?: string | null
  importance?: number | null
  difficulty?: number | null
  estimateMinutes?: number | null
  dueAt?: number | null
  scheduledAt?: number | null
  goal?: string | null
  project?: string | null
}): Promise<Task> {
  await ensureMigrated()
  const now = Date.now()
  const task: Task = {
    id: makeTaskId(),
    title: input.title,
    status: input.status ?? 'todo',
    createdAt: now,
    updatedAt: now,
    dueAt: isFiniteNumber(input.dueAt) ? input.dueAt : null,
    scheduledAt: isFiniteNumber(input.scheduledAt) ? input.scheduledAt : null,
    completedAt: null,
    tags: sanitizeStringArray(input.tags),
    contexts: sanitizeStringArray(input.contexts),
    people: sanitizeStringArray(input.people),
    location: normalizeOptionalString(input.location),
    skills: sanitizeStringArray(input.skills),
    character: sanitizeStringArray(input.character),
    entityIds: sanitizeStringArray(input.entityIds),
    parentEventId: input.parentEventId ?? null,
    project: input.project ?? null,
    goal: input.goal ?? null,
    category: input.category ?? null,
    subcategory: input.subcategory ?? null,
    importance: input.importance ?? 5,
    urgency: null,
    difficulty: input.difficulty ?? 5,
    estimateMinutes: input.estimateMinutes ?? null,
    sourceNoteId: input.sourceNoteId ?? null,
  }
  await db.tasks.put(task)
  void syncTaskToSupabase(task)
  return task
}

export async function upsertTask(task: Task): Promise<Task> {
  await ensureMigrated()
  const now = Date.now()
  const completedAt = task.status === 'done' ? (task.completedAt ?? now) : null
  const next = normalizeTask({ ...task, completedAt, updatedAt: now })
  await db.tasks.put(next)
  void syncTaskToSupabase(next)
  return next
}

export async function deleteTask(taskId: string) {
  await ensureMigrated()
  await db.tasks.delete(taskId)
  void markEntryDeleted(taskId, 'task')
}

// ========== Task-within-Event Support ==========

/**
 * Get all tasks for a specific event
 */
export async function getTasksForEvent(eventId: string): Promise<Task[]> {
  await ensureMigrated()
  return db.tasks
    .where('parentEventId')
    .equals(eventId)
    .sortBy('createdAt')
}

/**
 * Get active (in_progress) task for an event
 */
export async function getActiveTaskForEvent(eventId: string): Promise<Task | null> {
  await ensureMigrated()
  const tasks = await db.tasks
    .where('parentEventId')
    .equals(eventId)
    .and((t) => t.status === 'in_progress')
    .toArray()
  return tasks[0] ?? null
}

/**
 * Start a task (set status to in_progress).
 * Also stops any other in_progress task for the same event.
 */
export async function startTask(taskId: string): Promise<Task | null> {
  await ensureMigrated()
  const task = await db.tasks.get(taskId)
  if (!task) return null

  // If this task is part of an event, stop other active tasks for that event
  if (task.parentEventId) {
    const siblings = await db.tasks
      .where('parentEventId')
      .equals(task.parentEventId)
      .and((t) => t.status === 'in_progress' && t.id !== taskId)
      .toArray()

    for (const sibling of siblings) {
      await upsertTask({ ...sibling, status: 'todo' })
    }
  }

  const now = Date.now()
  const updated = normalizeTask({
    ...task,
    status: 'in_progress',
    updatedAt: now,
  })

  await db.tasks.put(updated)
  void syncTaskToSupabase(updated)
  return updated
}

/**
 * Complete a task (set status to done)
 */
export async function completeTask(taskId: string): Promise<Task | null> {
  await ensureMigrated()
  const task = await db.tasks.get(taskId)
  if (!task) return null

  const now = Date.now()
  const updated = normalizeTask({
    ...task,
    status: 'done',
    completedAt: now,
    updatedAt: now,
  })

  await db.tasks.put(updated)
  void syncTaskToSupabase(updated)
  return updated
}

/**
 * Pause a task (set status back to todo)
 */
export async function pauseTask(taskId: string): Promise<Task | null> {
  await ensureMigrated()
  const task = await db.tasks.get(taskId)
  if (!task) return null

  const now = Date.now()
  const updated = normalizeTask({
    ...task,
    status: 'todo',
    updatedAt: now,
  })

  await db.tasks.put(updated)
  void syncTaskToSupabase(updated)
  return updated
}

/**
 * Create a task within an event, inheriting properties from the event
 */
export async function createTaskInEvent(input: {
  eventId: string
  title: string
  notes?: string
  estimateMinutes?: number | null
  importance?: number | null
  difficulty?: number | null
}): Promise<Task> {
  await ensureMigrated()
  // Get the parent event to inherit properties
  const event = await db.events.get(input.eventId)

  const now = Date.now()
  const task: Task = {
    id: makeTaskId(),
    title: input.title,
    notes: input.notes,
    status: 'todo',
    createdAt: now,
    updatedAt: now,
    dueAt: null,
    scheduledAt: null,
    completedAt: null,
    tags: event?.tags ?? [],
    contexts: event?.contexts ?? [],
    people: event?.people ?? [],
    location: event?.location ?? null,
    skills: event?.skills ?? [],
    character: event?.character ?? [],
    entityIds: [],
    parentEventId: input.eventId,
    project: event?.project ?? null,
    goal: event?.goal ?? null,
    category: event?.category ?? null,
    subcategory: event?.subcategory ?? null,
    importance: input.importance ?? event?.importance ?? 5,
    urgency: event?.urgency ?? null,
    difficulty: input.difficulty ?? event?.difficulty ?? 5,
    estimateMinutes: input.estimateMinutes ?? null,
    sourceNoteId: null,
  }

  await db.tasks.put(task)
  void syncTaskToSupabase(task)
  return task
}

/**
 * Get task completion stats for an event
 */
export async function getEventTaskStats(eventId: string): Promise<{
  total: number
  done: number
  inProgress: number
  todo: number
  percentComplete: number
}> {
  await ensureMigrated()
  const tasks = await getTasksForEvent(eventId)

  const total = tasks.length
  const done = tasks.filter((t) => t.status === 'done').length
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length
  const todo = tasks.filter((t) => t.status === 'todo').length
  const percentComplete = total > 0 ? Math.round((done / total) * 100) : 0

  return { total, done, inProgress, todo, percentComplete }
}
