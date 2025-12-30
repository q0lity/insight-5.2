import type { CalendarEvent as DbEvent, CalendarEventKind } from '../db/insight-db'
import { db, makeEventId } from '../db/insight-db'
import { migrateFromLocalStorageIfEmpty } from '../db/migrate-localstorage'
import { markEntryDeleted, syncEventToSupabase } from '../supabase/sync'

export type CalendarEvent = DbEvent
export type { CalendarEventKind }

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

function hasInvalidStringArray(value: unknown) {
  if (!Array.isArray(value)) return true
  return value.some((item) => typeof item !== 'string' || item.trim().length === 0)
}

function normalizeEvent(ev: CalendarEvent): CalendarEvent {
  const now = Date.now()
  const createdAt = isFiniteNumber(ev.createdAt) ? ev.createdAt : now
  const updatedAt = isFiniteNumber(ev.updatedAt) ? ev.updatedAt : now
  let startAt = isFiniteNumber(ev.startAt) ? ev.startAt : createdAt
  let endAt = isFiniteNumber(ev.endAt) ? ev.endAt : startAt + 30 * 60 * 1000
  if (endAt < startAt) endAt = startAt + 30 * 60 * 1000
  return {
    ...ev,
    createdAt,
    updatedAt,
    startAt,
    endAt,
    entityIds: sanitizeStringArray(ev.entityIds),
    contexts: sanitizeStringArray(ev.contexts),
    tags: sanitizeStringArray(ev.tags),
    people: sanitizeStringArray(ev.people),
    skills: sanitizeStringArray(ev.skills),
    character: sanitizeStringArray(ev.character),
  }
}

function isEventNormalized(ev: CalendarEvent) {
  if (!isFiniteNumber(ev.startAt)) return false
  if (!isFiniteNumber(ev.endAt)) return false
  if (ev.endAt < ev.startAt) return false
  if (!isFiniteNumber(ev.createdAt)) return false
  if (!isFiniteNumber(ev.updatedAt)) return false
  return true
}

export async function listEvents(): Promise<CalendarEvent[]> {
  await ensureMigrated()
  try {
    return db.events.orderBy('startAt').reverse().limit(5000).toArray()
  } catch (err) {
    const raw = await db.events.toArray()
    const normalized = raw.map(normalizeEvent)
    const needsFix = raw.some(
      (ev) =>
        !isEventNormalized(ev) ||
        hasInvalidStringArray(ev.entityIds) ||
        hasInvalidStringArray(ev.contexts) ||
        hasInvalidStringArray(ev.tags) ||
        hasInvalidStringArray(ev.people) ||
        hasInvalidStringArray(ev.skills) ||
        hasInvalidStringArray(ev.character),
    )
    if (needsFix) await db.events.bulkPut(normalized)
    return normalized.sort((a, b) => b.startAt - a.startAt)
  }
}

export async function createEvent(input: {
  title: string
  startAt: number
  endAt: number
  tags?: string[]
  contexts?: string[]
  kind?: CalendarEventKind
  taskId?: string | null
  parentEventId?: string | null
  allDay?: boolean
  active?: boolean
  icon?: string | null
  color?: string | null
  notes?: string | null
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
  entityIds?: string[]
  sourceNoteId?: string | null
  trackerKey?: string | null
}): Promise<CalendarEvent> {
  await ensureMigrated()
  const now = Date.now()
  const startAt = isFiniteNumber(input.startAt) ? input.startAt : now
  const endAtRaw = isFiniteNumber(input.endAt) ? input.endAt : startAt + 5 * 60 * 1000
  const endAt = endAtRaw < startAt ? startAt + 5 * 60 * 1000 : endAtRaw
  const ev: CalendarEvent = {
    id: makeEventId(),
    title: input.title,
    startAt,
    endAt,
    allDay: input.allDay ?? false,
    active: input.active ?? false,
    createdAt: now,
    updatedAt: now,
    kind: input.kind ?? 'event',
    taskId: input.taskId ?? null,
    parentEventId: input.parentEventId ?? null,
    completedAt: null,
    icon: input.icon ?? null,
    color: input.color ?? null,
    notes: input.notes ?? '',
    tags: sanitizeStringArray(input.tags),
    contexts: sanitizeStringArray(input.contexts),
    entityIds: sanitizeStringArray(input.entityIds),
    project: input.project ?? null,
    goal: input.goal ?? null,
    category: input.category ?? null,
    subcategory: input.subcategory ?? null,
    importance: input.importance ?? 5,
    urgency: input.urgency ?? null,
    difficulty: input.difficulty ?? 5,
    estimateMinutes: input.estimateMinutes ?? null,
    location: input.location ?? null,
    people: sanitizeStringArray(input.people),
    skills: sanitizeStringArray(input.skills),
    character: sanitizeStringArray(input.character),
    sourceNoteId: input.sourceNoteId ?? null,
    trackerKey: input.trackerKey ?? null,
  }
  await db.events.put(ev)
  void syncEventToSupabase(ev)
  return ev
}

export async function upsertEvent(event: CalendarEvent): Promise<CalendarEvent> {
  await ensureMigrated()
  const next = normalizeEvent({ ...event, updatedAt: Date.now() })
  await db.events.put(next)
  void syncEventToSupabase(next)
  return next
}

export async function findActiveEpisode(trackerKey: string | null | undefined) {
  await ensureMigrated()
  const key = trackerKey?.trim()
  if (!key) return undefined
  return db.events.where('trackerKey').equals(key).and((ev) => ev.active && ev.kind === 'episode').first()
}

export async function findActiveByTrackerKey(trackerKey: string | null | undefined) {
  await ensureMigrated()
  const key = trackerKey?.trim()
  if (!key) return undefined
  return db.events.where('trackerKey').equals(key).and((ev) => ev.active).first()
}

export async function findBestActiveEventAt(atMs: number) {
  await ensureMigrated()
  const candidates = await db.events.filter((ev) => ev.active).toArray()
  const filtered = candidates.filter((e) => e.kind !== 'log' && e.kind !== 'episode' && e.startAt <= atMs)
  filtered.sort((a, b) => (a.startAt - b.startAt) || (a.updatedAt - b.updatedAt))
  return filtered.at(-1) ?? null
}

export async function deleteEvent(eventId: string) {
  await ensureMigrated()
  await db.transaction('rw', db.events, async () => {
    const children = await db.events.where({ parentEventId: eventId as any }).toArray()
    if (children.length) {
      await db.events.bulkDelete(children.map((c) => c.id))
      for (const child of children) {
        void markEntryDeleted(child.id, 'event')
      }
    }
    await db.events.delete(eventId)
    void markEntryDeleted(eventId, 'event')
  })
}

// ========== Sub-Event Support ==========

/**
 * Get all child events for a parent event
 */
export async function getChildEvents(parentEventId: string): Promise<CalendarEvent[]> {
  await ensureMigrated()
  return db.events
    .where('parentEventId')
    .equals(parentEventId)
    .sortBy('startAt')
}

/**
 * Get the parent event for a child event
 */
export async function getParentEvent(event: CalendarEvent): Promise<CalendarEvent | null> {
  if (!event.parentEventId) return null
  await ensureMigrated()
  const parent = await db.events.get(event.parentEventId)
  return parent ?? null
}

/**
 * Get the currently active event (top-level or sub-event).
 * Returns null if no event is active.
 */
export async function getActiveEvent(): Promise<CalendarEvent | null> {
  await ensureMigrated()
  const activeEvents = await db.events
    .filter((ev) => ev.active && ev.kind !== 'log' && ev.kind !== 'episode')
    .toArray()

  if (activeEvents.length === 0) return null

  // Prefer the most recently started active event (likely a sub-event)
  activeEvents.sort((a, b) => b.startAt - a.startAt)
  return activeEvents[0] ?? null
}

/**
 * Get the active parent event (top-level event that may contain sub-events).
 */
export async function getActiveParentEvent(): Promise<CalendarEvent | null> {
  await ensureMigrated()
  const activeEvents = await db.events
    .filter((ev) => ev.active && ev.kind !== 'log' && ev.kind !== 'episode' && !ev.parentEventId)
    .toArray()

  if (activeEvents.length === 0) return null

  // Return the most recently started parent
  activeEvents.sort((a, b) => b.startAt - a.startAt)
  return activeEvents[0] ?? null
}

/**
 * Get the active sub-event (if any) for a parent event.
 */
export async function getActiveSubEvent(parentEventId: string): Promise<CalendarEvent | null> {
  await ensureMigrated()
  const children = await db.events
    .where('parentEventId')
    .equals(parentEventId)
    .and((ev) => ev.active)
    .toArray()

  if (children.length === 0) return null

  children.sort((a, b) => b.startAt - a.startAt)
  return children[0] ?? null
}

/**
 * Start a sub-event within a parent event.
 * The parent event remains active while the sub-event is running.
 */
export async function startSubEvent(input: {
  parentEventId: string
  title: string
  tags?: string[]
  notes?: string
  category?: string | null
  subcategory?: string | null
  goal?: string | null
  project?: string | null
  importance?: number | null
  difficulty?: number | null
}): Promise<CalendarEvent> {
  await ensureMigrated()

  // Get the parent event
  const parent = await db.events.get(input.parentEventId)
  if (!parent) {
    throw new Error(`Parent event ${input.parentEventId} not found`)
  }

  // Deactivate any existing active sub-events for this parent
  const existingActive = await getActiveSubEvent(input.parentEventId)
  if (existingActive) {
    await stopEvent(existingActive.id)
  }

  const now = Date.now()

  // Inherit properties from parent if not specified
  const subEvent: CalendarEvent = {
    id: makeEventId(),
    title: input.title,
    startAt: now,
    endAt: now + 30 * 60 * 1000, // Default 30 min
    allDay: false,
    active: true,
    createdAt: now,
    updatedAt: now,
    kind: 'event',
    taskId: null,
    parentEventId: input.parentEventId,
    completedAt: null,
    icon: parent.icon,
    color: parent.color,
    notes: input.notes ?? '',
    tags: sanitizeStringArray(input.tags ?? parent.tags),
    contexts: parent.contexts,
    entityIds: [],
    project: input.project ?? parent.project,
    goal: input.goal ?? parent.goal,
    category: input.category ?? parent.category,
    subcategory: input.subcategory ?? parent.subcategory,
    importance: input.importance ?? parent.importance,
    urgency: parent.urgency,
    difficulty: input.difficulty ?? parent.difficulty,
    estimateMinutes: null,
    location: parent.location,
    people: parent.people,
    skills: parent.skills,
    character: parent.character,
    sourceNoteId: null,
    trackerKey: null,
  }

  await db.events.put(subEvent)
  void syncEventToSupabase(subEvent)
  return subEvent
}

/**
 * Stop an event (set active to false and update endAt)
 */
export async function stopEvent(eventId: string): Promise<CalendarEvent | null> {
  await ensureMigrated()
  const event = await db.events.get(eventId)
  if (!event) return null

  const now = Date.now()
  const updated: CalendarEvent = {
    ...event,
    active: false,
    endAt: now,
    updatedAt: now,
  }

  await db.events.put(updated)
  void syncEventToSupabase(updated)
  return updated
}

/**
 * Stop all active events (parent and sub-events)
 */
export async function stopAllActiveEvents(): Promise<void> {
  await ensureMigrated()
  const now = Date.now()

  const activeEvents = await db.events
    .filter((ev) => ev.active)
    .toArray()

  const updates = activeEvents.map((ev) => ({
    ...ev,
    active: false,
    endAt: now,
    updatedAt: now,
  }))

  await db.events.bulkPut(updates)
  for (const ev of updates) {
    void syncEventToSupabase(ev)
  }
}

/**
 * Get event hierarchy: parent with its children
 */
export async function getEventHierarchy(eventId: string): Promise<{
  parent: CalendarEvent
  children: CalendarEvent[]
  activeChild: CalendarEvent | null
} | null> {
  await ensureMigrated()

  const event = await db.events.get(eventId)
  if (!event) return null

  // If this is a child event, get the parent
  if (event.parentEventId) {
    const parent = await db.events.get(event.parentEventId)
    if (!parent) return null
    const children = await getChildEvents(parent.id)
    const activeChild = children.find((c) => c.active) ?? null
    return { parent, children, activeChild }
  }

  // This is a parent event
  const children = await getChildEvents(event.id)
  const activeChild = children.find((c) => c.active) ?? null
  return { parent: event, children, activeChild }
}

/**
 * Calculate duration of an event in minutes
 */
export function getEventDurationMinutes(event: CalendarEvent): number {
  const start = event.startAt
  const end = event.active ? Date.now() : event.endAt
  return Math.round((end - start) / (60 * 1000))
}
