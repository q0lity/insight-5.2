import { loadSettings } from '../assistant/storage'
import { db, type CalendarEvent, type Entity, type Note, type Task } from '../db/insight-db'
import { callOpenAiEmbedding } from '../openai'
import { ensureEntity } from '../storage/entities'
import { getSupabaseClient } from './client'

type LegacyKind = 'task' | 'event' | 'note'

type EntryPayload = {
  id?: string
  user_id: string
  created_at?: string
  updated_at?: string
  title: string
  facets: string[]
  status?: string | null
  priority?: string | null
  scheduled_at?: string | null
  due_at?: string | null
  completed_at?: string | null
  start_at?: string | null
  end_at?: string | null
  duration_minutes?: number | null
  difficulty?: number | null
  importance?: number | null
  tags: string[]
  contexts: string[]
  people: string[]
  frontmatter: Record<string, unknown>
  body_markdown: string
  source: string
  deleted_at?: string | null
}

const LEGACY_SOURCE = 'desktop'
const EMBED_MODEL = 'text-embedding-3-small'

function toIso(ms?: number | null) {
  if (!ms || !Number.isFinite(ms)) return null
  return new Date(ms).toISOString()
}

function fromIso(iso?: string | null) {
  if (!iso) return null
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : null
}

function uniqStrings(items: string[]) {
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of items) {
    const next = item.trim()
    if (!next || seen.has(next)) continue
    seen.add(next)
    out.push(next)
  }
  return out
}

function normalizeEntityKey(raw: string) {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ')
}

function entityMapFromList(entities: Entity[]) {
  const map = new Map<string, Entity>()
  for (const entity of entities) {
    map.set(entity.id, entity)
  }
  return map
}

function deriveEntities(entityIds: string[], map: Map<string, Entity>) {
  const tags: string[] = []
  const people: string[] = []
  const places: string[] = []
  for (const id of entityIds) {
    const entity = map.get(id)
    if (!entity) continue
    if (entity.type === 'tag') tags.push(entity.displayName || entity.key)
    if (entity.type === 'person') people.push(entity.displayName || entity.key)
    if (entity.type === 'place') places.push(entity.displayName || entity.key)
  }
  return {
    tags: uniqStrings(tags),
    people: uniqStrings(people),
    places: uniqStrings(places),
  }
}

function frontmatterBase(legacyId: string, legacyType: LegacyKind, extra?: Record<string, unknown>) {
  return {
    legacyId,
    legacyType,
    sourceApp: LEGACY_SOURCE,
    ...extra,
  }
}

function eventEntryFromLocal(event: CalendarEvent, entitiesById: Map<string, Entity>, userId: string, source: string): EntryPayload {
  const entityMeta = deriveEntities(event.entityIds ?? [], entitiesById)
  const tags = uniqStrings([...(event.tags ?? []), ...entityMeta.tags])
  const people = uniqStrings([...(event.people ?? []), ...entityMeta.people])
  const location = event.location ?? entityMeta.places[0] ?? null
  const contexts = uniqStrings([...(event.contexts ?? [])])

  const frontmatter = frontmatterBase(event.id, 'event', {
    kind: event.kind,
    trackerKey: event.trackerKey ?? null,
    parentEventId: event.parentEventId ?? null,
    sourceNoteId: event.sourceNoteId ?? null,
    icon: event.icon ?? null,
    color: event.color ?? null,
    location,
    skills: event.skills ?? [],
    character: event.character ?? [],
    goal: event.goal ?? null,
    project: event.project ?? null,
    category: event.category ?? null,
    subcategory: event.subcategory ?? null,
    allDay: event.allDay ?? false,
    active: event.active ?? false,
    estimateMinutes: event.estimateMinutes ?? null,
  })

  return {
    user_id: userId,
    created_at: toIso(event.createdAt) ?? undefined,
    updated_at: toIso(event.updatedAt) ?? undefined,
    title: event.title,
    facets: ['event'],
    start_at: toIso(event.startAt),
    end_at: toIso(event.endAt),
    duration_minutes: event.estimateMinutes ?? null,
    difficulty: event.difficulty ?? null,
    importance: event.importance ?? null,
    tags,
    contexts,
    people,
    frontmatter,
    body_markdown: event.notes ?? '',
    source,
    deleted_at: null,
  }
}

function taskEntryFromLocal(task: Task, entitiesById: Map<string, Entity>, userId: string, source: string): EntryPayload {
  const entityMeta = deriveEntities(task.entityIds ?? [], entitiesById)
  const tags = uniqStrings([...(task.tags ?? []), ...entityMeta.tags])
  const people = uniqStrings([...entityMeta.people])
  const contexts = uniqStrings([...(task.contexts ?? [])])

  const frontmatter = frontmatterBase(task.id, 'task', {
    sourceNoteId: task.sourceNoteId ?? null,
    parentEventId: task.parentEventId ?? null,
    goal: task.goal ?? null,
    project: task.project ?? null,
    category: task.category ?? null,
    subcategory: task.subcategory ?? null,
    estimateMinutes: task.estimateMinutes ?? null,
  })

  return {
    user_id: userId,
    created_at: toIso(task.createdAt) ?? undefined,
    updated_at: toIso(task.updatedAt) ?? undefined,
    title: task.title,
    facets: ['task'],
    status: task.status ?? null,
    scheduled_at: toIso(task.scheduledAt),
    due_at: toIso(task.dueAt),
    completed_at: toIso(task.completedAt),
    duration_minutes: task.estimateMinutes ?? null,
    difficulty: task.difficulty ?? null,
    importance: task.importance ?? null,
    tags,
    contexts,
    people,
    frontmatter,
    body_markdown: task.notes ?? '',
    source,
    deleted_at: null,
  }
}

function noteEntryFromLocal(note: Note, entitiesById: Map<string, Entity>, userId: string, source: string): EntryPayload {
  const entityMeta = deriveEntities(note.entityIds ?? [], entitiesById)
  const frontmatter = frontmatterBase(note.id, 'note', {
    status: note.status,
  })

  return {
    user_id: userId,
    created_at: toIso(note.createdAt) ?? undefined,
    updated_at: toIso(note.createdAt) ?? undefined,
    title: note.rawText.split('\n')[0]?.slice(0, 80) || 'Capture',
    facets: ['note'],
    tags: entityMeta.tags,
    contexts: [],
    people: entityMeta.people,
    frontmatter,
    body_markdown: note.rawText ?? '',
    source,
    deleted_at: null,
  }
}

function buildEmbeddingText(entry: Pick<EntryPayload, 'title' | 'body_markdown' | 'tags' | 'contexts' | 'people'>) {
  const parts = [entry.title, entry.body_markdown || '']
  if (entry.tags?.length) parts.push(`Tags: ${entry.tags.join(', ')}`)
  if (entry.contexts?.length) parts.push(`Contexts: ${entry.contexts.join(', ')}`)
  if (entry.people?.length) parts.push(`People: ${entry.people.join(', ')}`)
  const text = parts.join('\n').trim()
  return text.length > 8000 ? text.slice(0, 8000) : text
}

async function entityIdsForEntry(entry: {
  tags?: string[] | null
  people?: string[] | null
  frontmatter?: Record<string, unknown>
}) {
  const ids: string[] = []
  const tagList = Array.isArray(entry.tags) ? entry.tags : []
  const peopleList = Array.isArray(entry.people) ? entry.people : []
  const location = (entry.frontmatter?.location as string | null) ?? null

  for (const tag of tagList) {
    const label = tag.startsWith('#') ? tag : `#${tag}`
    const ent = await ensureEntity('tag', tag.replace(/^#/, ''), label)
    ids.push(ent.id)
  }
  for (const person of peopleList) {
    const ent = await ensureEntity('person', person, person)
    ids.push(ent.id)
  }
  if (location) {
    const ent = await ensureEntity('place', location, location)
    ids.push(ent.id)
  }
  return uniqStrings(ids)
}

function entryToTask(entry: any, entityIds: string[]): Task {
  const fm = (entry.frontmatter ?? {}) as Record<string, any>
  const id = (fm.legacyId as string | undefined) ?? entry.id
  return {
    id,
    title: entry.title ?? 'Task',
    notes: entry.body_markdown ?? '',
    status: entry.status ?? 'todo',
    createdAt: fromIso(entry.created_at) ?? Date.now(),
    updatedAt: fromIso(entry.updated_at) ?? Date.now(),
    dueAt: fromIso(entry.due_at),
    scheduledAt: fromIso(entry.scheduled_at),
    completedAt: fromIso(entry.completed_at),
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    contexts: Array.isArray(entry.contexts) ? entry.contexts : [],
    entityIds,
    parentEventId: (fm.parentEventId as string | null) ?? null,
    project: (fm.project as string | null) ?? null,
    goal: (fm.goal as string | null) ?? null,
    category: (fm.category as string | null) ?? null,
    subcategory: (fm.subcategory as string | null) ?? null,
    importance: typeof entry.importance === 'number' ? entry.importance : fm.importance ?? null,
    urgency: null,
    difficulty: typeof entry.difficulty === 'number' ? entry.difficulty : fm.difficulty ?? null,
    estimateMinutes: typeof fm.estimateMinutes === 'number' ? fm.estimateMinutes : entry.duration_minutes ?? null,
    sourceNoteId: (fm.sourceNoteId as string | null) ?? null,
  }
}

function entryToEvent(entry: any, entityIds: string[]): CalendarEvent {
  const fm = (entry.frontmatter ?? {}) as Record<string, any>
  const id = (fm.legacyId as string | undefined) ?? entry.id
  const startAt = fromIso(entry.start_at) ?? fromIso(entry.created_at) ?? Date.now()
  const endAt = fromIso(entry.end_at) ?? startAt + 30 * 60 * 1000
  return {
    id,
    title: entry.title ?? 'Event',
    startAt,
    endAt,
    allDay: Boolean(fm.allDay ?? false),
    active: Boolean(fm.active ?? false),
    createdAt: fromIso(entry.created_at) ?? Date.now(),
    updatedAt: fromIso(entry.updated_at) ?? Date.now(),
    kind: (fm.kind as CalendarEvent['kind']) ?? 'event',
    taskId: (fm.taskId as string | null) ?? null,
    parentEventId: (fm.parentEventId as string | null) ?? null,
    completedAt: fromIso(entry.completed_at),
    icon: (fm.icon as string | null) ?? null,
    color: (fm.color as string | null) ?? null,
    notes: entry.body_markdown ?? '',
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    contexts: Array.isArray(entry.contexts) ? entry.contexts : [],
    entityIds,
    project: (fm.project as string | null) ?? null,
    goal: (fm.goal as string | null) ?? null,
    category: (fm.category as string | null) ?? null,
    subcategory: (fm.subcategory as string | null) ?? null,
    importance: typeof entry.importance === 'number' ? entry.importance : fm.importance ?? null,
    urgency: null,
    difficulty: typeof entry.difficulty === 'number' ? entry.difficulty : fm.difficulty ?? null,
    estimateMinutes: typeof fm.estimateMinutes === 'number' ? fm.estimateMinutes : entry.duration_minutes ?? null,
    location: (fm.location as string | null) ?? null,
    people: Array.isArray(entry.people) ? entry.people : [],
    skills: Array.isArray(fm.skills) ? fm.skills : [],
    character: Array.isArray(fm.character) ? fm.character : [],
    sourceNoteId: (fm.sourceNoteId as string | null) ?? null,
    trackerKey: (fm.trackerKey as string | null) ?? null,
  }
}

function entryToNote(entry: any, entityIds: string[]): Note {
  const fm = (entry.frontmatter ?? {}) as Record<string, any>
  const id = (fm.legacyId as string | undefined) ?? entry.id
  return {
    id,
    createdAt: fromIso(entry.created_at) ?? Date.now(),
    rawText: entry.body_markdown ?? '',
    status: (fm.status as Note['status']) ?? 'raw',
    entityIds,
  }
}


async function embedEntry(payload: { id: string } & EntryPayload) {
  const settings = loadSettings()
  const apiKey = (settings.openAiKey ?? '').trim()
  if (!apiKey) return
  const supabase = getSupabaseClient()
  if (!supabase) return

  const input = buildEmbeddingText(payload)
  if (!input) return
  const vector = await callOpenAiEmbedding({ apiKey, model: EMBED_MODEL, input })
  if (!vector?.length) return

  await supabase.from('entries').update({ embedding: vector }).eq('id', payload.id)
}

async function upsertEntries(
  userId: string,
  rows: Array<{ legacyId: string; legacyType: LegacyKind; payload: EntryPayload }>,
) {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  const inserted: Array<{ id: string } & EntryPayload> = []

  for (const row of rows) {
    const { legacyId, legacyType, payload } = row
    const lookup = await supabase
      .from('entries')
      .select('id')
      .eq('frontmatter->>legacyId', legacyId)
      .eq('frontmatter->>legacyType', legacyType)
      .maybeSingle()

    if (lookup.error && lookup.error.code !== 'PGRST116') {
      console.warn('Supabase lookup failed', lookup.error)
    }

    const entryPayload: EntryPayload = {
      ...payload,
      user_id: userId,
    }

    if (lookup.data?.id) {
      entryPayload.id = lookup.data.id
    }

    const { data, error } = await supabase
      .from('entries')
      .upsert(entryPayload, { onConflict: 'id' })
      .select('id')
      .single()

    if (error) {
      console.warn('Supabase upsert failed', error)
      continue
    }
    if (data?.id) {
      inserted.push({ ...entryPayload, id: data.id })
    }
  }

  return inserted
}

async function syncEntities(userId: string, entities: Entity[]) {
  const supabase = getSupabaseClient()
  if (!supabase || !entities.length) return

  const rows = entities.map((entity) => ({
    user_id: userId,
    type: entity.type,
    key: normalizeEntityKey(entity.key),
    display_name: entity.displayName || entity.key,
    metadata: {},
  }))

  await supabase.from('entities').upsert(rows, { onConflict: 'user_id,type,key' })
}

async function syncEntityLabels(userId: string, labels: { tags: string[]; people: string[]; places: string[] }) {
  const supabase = getSupabaseClient()
  if (!supabase) return

  const rows = [
    ...labels.tags.map((tag) => ({
      user_id: userId,
      type: 'tag',
      key: normalizeEntityKey(tag.replace(/^#/, '')),
      display_name: tag,
    })),
    ...labels.people.map((person) => ({
      user_id: userId,
      type: 'person',
      key: normalizeEntityKey(person),
      display_name: person,
    })),
    ...labels.places.map((place) => ({
      user_id: userId,
      type: 'place',
      key: normalizeEntityKey(place),
      display_name: place,
    })),
  ].filter((row) => row.key)

  if (!rows.length) return
  await supabase.from('entities').upsert(rows, { onConflict: 'user_id,type,key' })
}

export async function migrateLocalDataToSupabase() {
  const supabase = getSupabaseClient()
  if (!supabase) return

  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) return

  const alreadyMigrated = window.localStorage.getItem('insight5.supabase.migrated.v1')
  if (alreadyMigrated) return

  const [entities, tasks, events, notes] = await Promise.all([
    db.entities.toArray(),
    db.tasks.toArray(),
    db.events.toArray(),
    db.notes.toArray(),
  ])

  const entitiesById = entityMapFromList(entities)
  await syncEntities(authData.user.id, entities)

  const rows: Array<{ legacyId: string; legacyType: LegacyKind; payload: EntryPayload }> = []

  for (const task of tasks) {
    rows.push({
      legacyId: task.id,
      legacyType: 'task',
      payload: taskEntryFromLocal(task, entitiesById, authData.user.id, 'migration'),
    })
  }

  for (const event of events) {
    rows.push({
      legacyId: event.id,
      legacyType: 'event',
      payload: eventEntryFromLocal(event, entitiesById, authData.user.id, 'migration'),
    })
  }

  for (const note of notes) {
    rows.push({
      legacyId: note.id,
      legacyType: 'note',
      payload: noteEntryFromLocal(note, entitiesById, authData.user.id, 'migration'),
    })
  }

  const inserted = await upsertEntries(authData.user.id, rows)
  for (const entry of inserted) {
    try {
      await embedEntry(entry)
    } catch (err) {
      console.warn('Embedding failed', err)
    }
  }

  window.localStorage.setItem('insight5.supabase.migrated.v1', String(Date.now()))
}

async function upsertSingleEntry(
  userId: string,
  legacyId: string,
  legacyType: LegacyKind,
  payload: EntryPayload,
  labels?: { tags: string[]; people: string[]; places: string[] },
) {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const lookup = await supabase
    .from('entries')
    .select('id')
    .eq('frontmatter->>legacyId', legacyId)
    .eq('frontmatter->>legacyType', legacyType)
    .maybeSingle()

  const entryPayload: EntryPayload = {
    ...payload,
    user_id: userId,
  }
  if (lookup.data?.id) entryPayload.id = lookup.data.id

  const { data, error } = await supabase
    .from('entries')
    .upsert(entryPayload, { onConflict: 'id' })
    .select('id')
    .single()

  if (error) {
    console.warn('Supabase entry sync failed', error)
    return null
  }
  if (labels) {
    await syncEntityLabels(userId, labels)
  }
  return data?.id ?? null
}

export async function syncTaskToSupabase(task: Task) {
  const supabase = getSupabaseClient()
  if (!supabase) return
  const { data } = await supabase.auth.getUser()
  if (!data.user) return
  const entities = await db.entities.toArray()
  const entitiesById = entityMapFromList(entities)
  const payload = taskEntryFromLocal(task, entitiesById, data.user.id, 'app')
  const labels = deriveEntities(task.entityIds ?? [], entitiesById)
  labels.tags = uniqStrings([...(labels.tags ?? []), ...(task.tags ?? [])])
  const id = await upsertSingleEntry(data.user.id, task.id, 'task', payload, labels)
  if (id) {
    try {
      await embedEntry({ ...payload, id })
    } catch (err) {
      console.warn('Embedding failed', err)
    }
  }
}

export async function syncEventToSupabase(event: CalendarEvent) {
  const supabase = getSupabaseClient()
  if (!supabase) return
  const { data } = await supabase.auth.getUser()
  if (!data.user) return
  const entities = await db.entities.toArray()
  const entitiesById = entityMapFromList(entities)
  const payload = eventEntryFromLocal(event, entitiesById, data.user.id, 'app')
  const labels = deriveEntities(event.entityIds ?? [], entitiesById)
  labels.tags = uniqStrings([...(labels.tags ?? []), ...(event.tags ?? [])])
  labels.people = uniqStrings([...(labels.people ?? []), ...(event.people ?? [])])
  if (event.location) labels.places = uniqStrings([...(labels.places ?? []), event.location])
  const id = await upsertSingleEntry(data.user.id, event.id, 'event', payload, labels)
  if (id) {
    try {
      await embedEntry({ ...payload, id })
    } catch (err) {
      console.warn('Embedding failed', err)
    }
  }
}

export async function syncNoteToSupabase(note: Note) {
  const supabase = getSupabaseClient()
  if (!supabase) return
  const { data } = await supabase.auth.getUser()
  if (!data.user) return
  const entities = await db.entities.toArray()
  const entitiesById = entityMapFromList(entities)
  const payload = noteEntryFromLocal(note, entitiesById, data.user.id, 'app')
  const labels = deriveEntities(note.entityIds ?? [], entitiesById)
  const id = await upsertSingleEntry(data.user.id, note.id, 'note', payload, labels)
  if (id) {
    try {
      await embedEntry({ ...payload, id })
    } catch (err) {
      console.warn('Embedding failed', err)
    }
  }
}

export async function markEntryDeleted(legacyId: string, legacyType: LegacyKind) {
  const supabase = getSupabaseClient()
  if (!supabase) return
  const { data } = await supabase.auth.getUser()
  if (!data.user) return
  await supabase
    .from('entries')
    .update({ deleted_at: new Date().toISOString() })
    .eq('frontmatter->>legacyId', legacyId)
    .eq('frontmatter->>legacyType', legacyType)
}

export async function pullSupabaseToLocal() {
  const supabase = getSupabaseClient()
  if (!supabase) return
  const { data } = await supabase.auth.getUser()
  if (!data.user) return

  const lastSyncRaw = window.localStorage.getItem('insight5.supabase.lastPull.v1')
  const lastSyncAt = lastSyncRaw ? Number(lastSyncRaw) : null
  const sinceIso = lastSyncAt ? new Date(lastSyncAt).toISOString() : null

  const baseSelect =
    'id, title, created_at, updated_at, start_at, end_at, status, scheduled_at, due_at, completed_at, duration_minutes, tags, people, contexts, importance, difficulty, frontmatter, body_markdown, deleted_at'

  const tasksQuery = supabase
    .from('entries')
    .select(baseSelect)
    .eq('user_id', data.user.id)
    .contains('facets', ['task'])
  const eventsQuery = supabase
    .from('entries')
    .select(baseSelect)
    .eq('user_id', data.user.id)
    .contains('facets', ['event'])
  const notesQuery = supabase
    .from('entries')
    .select(baseSelect)
    .eq('user_id', data.user.id)
    .contains('facets', ['note'])

  if (sinceIso) {
    tasksQuery.gte('updated_at', sinceIso)
    eventsQuery.gte('updated_at', sinceIso)
    notesQuery.gte('updated_at', sinceIso)
  }

  const [tasksRes, eventsRes, notesRes] = await Promise.all([tasksQuery, eventsQuery, notesQuery])
  const tasks: Task[] = []
  const events: CalendarEvent[] = []
  const notes: Note[] = []

  if (tasksRes.data) {
    for (const entry of tasksRes.data) {
      if (entry.deleted_at) continue
      const entityIds = await entityIdsForEntry(entry)
      tasks.push(entryToTask(entry, entityIds))
    }
  }

  if (eventsRes.data) {
    for (const entry of eventsRes.data) {
      if (entry.deleted_at) continue
      const entityIds = await entityIdsForEntry(entry)
      events.push(entryToEvent(entry, entityIds))
    }
  }

  if (notesRes.data) {
    for (const entry of notesRes.data) {
      if (entry.deleted_at) continue
      const entityIds = await entityIdsForEntry(entry)
      notes.push(entryToNote(entry, entityIds))
    }
  }

  if (tasks.length) await db.tasks.bulkPut(tasks)
  if (events.length) await db.events.bulkPut(events)
  if (notes.length) await db.notes.bulkPut(notes)

  window.localStorage.setItem('insight5.supabase.lastPull.v1', String(Date.now()))
}
