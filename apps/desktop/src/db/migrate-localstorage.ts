import type { CalendarEvent, Note, Task } from './insight-db'
import { db, makeEventId, makeNoteId, makeTaskId } from './insight-db'

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export async function migrateFromLocalStorageIfEmpty() {
  const noteCount = await db.notes.count().catch(() => 0)
  const taskCount = await db.tasks.count().catch(() => 0)
  const eventCount = await db.events.count().catch(() => 0)
  if (noteCount + taskCount + eventCount > 0) return

  const lsNotes = safeParse<any[]>(localStorage.getItem('insight5.inbox.v1')) ?? []
  const lsTasks = safeParse<any[]>(localStorage.getItem('insight5.tasks.v1')) ?? []
  const lsEvents = safeParse<any[]>(localStorage.getItem('insight5.calendar.v1')) ?? []

  const notes: Note[] = lsNotes
    .filter((x) => x && typeof x.rawText === 'string')
    .map((x) => ({
      id: typeof x.id === 'string' ? x.id : makeNoteId(),
      createdAt: typeof x.createdAt === 'number' ? x.createdAt : Date.now(),
      rawText: x.rawText,
      status: (x.status as any) ?? 'raw',
      entityIds: [],
    }))

  const tasks: Task[] = lsTasks
    .filter((x) => x && typeof x.title === 'string')
    .map((x) => ({
      id: typeof x.id === 'string' ? x.id : makeTaskId(),
      title: x.title,
      notes: x.notes ?? '',
      status: (x.status as any) ?? 'todo',
      createdAt: typeof x.createdAt === 'number' ? x.createdAt : Date.now(),
      updatedAt: typeof x.updatedAt === 'number' ? x.updatedAt : Date.now(),
      dueAt: x.dueAt ?? null,
      scheduledAt: x.scheduledAt ?? null,
      completedAt: x.completedAt ?? null,
      tags: Array.isArray(x.tags) ? x.tags : [],
      contexts: Array.isArray(x.contexts) ? x.contexts : [],
      people: Array.isArray(x.people) ? x.people : [],
      location: x.location ?? null,
      skills: Array.isArray(x.skills) ? x.skills : [],
      character: Array.isArray(x.character) ? x.character : [],
      entityIds: [],
      parentEventId: x.parentEventId ?? null,
      project: x.project ?? null,
      goal: x.goal ?? null,
      category: x.category ?? null,
      subcategory: x.subcategory ?? null,
      importance: x.importance ?? null,
      urgency: x.urgency ?? null,
      difficulty: x.difficulty ?? null,
      estimateMinutes: x.estimateMinutes ?? null,
      sourceNoteId: null,
    }))

  const events: CalendarEvent[] = lsEvents
    .filter((x) => x && typeof x.title === 'string' && typeof x.startAt === 'number' && typeof x.endAt === 'number')
    .map((x) => ({
      id: typeof x.id === 'string' ? x.id : makeEventId(),
      title: x.title,
      startAt: x.startAt,
      endAt: x.endAt,
      allDay: Boolean(x.allDay),
      active: Boolean(x.active),
      createdAt: typeof x.createdAt === 'number' ? x.createdAt : Date.now(),
      updatedAt: typeof x.updatedAt === 'number' ? x.updatedAt : Date.now(),
      kind: (x.kind as any) ?? 'event',
      taskId: x.taskId ?? null,
      parentEventId: null,
      completedAt: x.completedAt ?? null,
      icon: x.icon ?? null,
      color: x.color ?? null,
      notes: x.notes ?? '',
      tags: Array.isArray(x.tags) ? x.tags : [],
      entityIds: [],
      project: x.project ?? null,
      goal: x.goal ?? null,
      category: x.category ?? null,
      subcategory: x.subcategory ?? null,
      importance: x.importance ?? null,
      urgency: x.urgency ?? null,
      difficulty: x.difficulty ?? null,
      estimateMinutes: x.estimateMinutes ?? null,
      location: x.location ?? null,
      people: Array.isArray(x.people) ? x.people : [],
      skills: Array.isArray(x.skills) ? x.skills : [],
      character: Array.isArray(x.character) ? x.character : [],
      sourceNoteId: null,
      trackerKey: x.trackerKey ?? null,
    }))

  await db.transaction('rw', db.notes, db.tasks, db.events, async () => {
    if (notes.length) await db.notes.bulkPut(notes)
    if (tasks.length) await db.tasks.bulkPut(tasks)
    if (events.length) await db.events.bulkPut(events)
  })
}
