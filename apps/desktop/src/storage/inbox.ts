import type { Note, NoteStatus } from '../db/insight-db'
import { db, makeNoteId } from '../db/insight-db'
import { migrateFromLocalStorageIfEmpty } from '../db/migrate-localstorage'
import { syncNoteToSupabase } from '../supabase/sync'

export type InboxCaptureStatus = NoteStatus

export type InboxCapture = {
  id: string
  createdAt: number
  rawText: string
  status: InboxCaptureStatus
  entityIds?: string[]
}

let migrated = false
async function ensureMigrated() {
  if (migrated) return
  migrated = true
  await migrateFromLocalStorageIfEmpty()
}

export async function listInboxCaptures(): Promise<InboxCapture[]> {
  await ensureMigrated()
  const notes = await db.notes.orderBy('createdAt').reverse().limit(500).toArray()
  return notes.map((n) => ({ id: n.id, createdAt: n.createdAt, rawText: n.rawText, status: n.status, entityIds: n.entityIds }))
}

export async function addInboxCapture(rawText: string, opts?: { createdAt?: number; entityIds?: string[]; status?: InboxCaptureStatus }): Promise<InboxCapture> {
  await ensureMigrated()
  const createdAt = opts?.createdAt ?? Date.now()
  const id = makeNoteId()
  const note: Note = {
    id,
    createdAt,
    rawText,
    status: opts?.status ?? 'raw',
    entityIds: opts?.entityIds ?? [],
  }
  await db.notes.put(note)
  void syncNoteToSupabase(note)
  return { id, createdAt, rawText, status: note.status, entityIds: note.entityIds }
}

export async function updateCaptureStatus(id: string, status: InboxCaptureStatus) {
  await ensureMigrated()
  await db.notes.update(id, { status })
  const note = await db.notes.get(id)
  if (note) void syncNoteToSupabase(note)
}

export async function updateCaptureEntityIds(id: string, entityIds: string[]) {
  await ensureMigrated()
  await db.notes.update(id, { entityIds })
  const note = await db.notes.get(id)
  if (note) void syncNoteToSupabase(note)
}

export async function updateCaptureText(id: string, rawText: string) {
  await ensureMigrated()
  await db.notes.update(id, { rawText })
  const note = await db.notes.get(id)
  if (note) void syncNoteToSupabase(note)
}
