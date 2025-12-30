import type { Entity, EntityType } from '../db/insight-db'
import { db, makeEntityId, normalizeEntityKey } from '../db/insight-db'
import { migrateFromLocalStorageIfEmpty } from '../db/migrate-localstorage'
import { getSupabaseClient } from '../supabase/client'

let migrated = false
async function ensureMigrated() {
  if (migrated) return
  migrated = true
  await migrateFromLocalStorageIfEmpty()
}

async function syncEntitiesFromSupabase(type?: EntityType) {
  const supabase = getSupabaseClient()
  if (!supabase) return
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return

  let query = supabase
    .from('entities')
    .select('type, key, display_name, created_at, updated_at')
    .eq('user_id', auth.user.id)

  if (type) query = query.eq('type', type)

  const { data } = await query
  if (!data?.length) return

  await db.transaction('rw', db.entities, async () => {
    for (const row of data) {
      const key = normalizeEntityKey(row.key ?? '')
      const existing = await db.entities.where('[type+key]').equals([row.type as EntityType, key]).first()
      if (existing) {
        await db.entities.update(existing.id, {
          displayName: row.display_name ?? existing.displayName,
          updatedAt: Date.parse(row.updated_at) || existing.updatedAt,
        })
      } else {
        const now = Date.now()
        const createdAt = Date.parse(row.created_at) || now
        const updatedAt = Date.parse(row.updated_at) || now
        await db.entities.put({
          id: makeEntityId(),
          type: row.type as EntityType,
          key,
          displayName: row.display_name ?? row.key ?? key,
          createdAt,
          updatedAt,
        })
      }
    }
  })
}

export async function ensureEntity(type: EntityType, rawKey: string, displayName?: string): Promise<Entity> {
  await ensureMigrated()
  const key = normalizeEntityKey(rawKey)
  const existing = await db.entities.where('[type+key]').equals([type, key]).first()
  if (existing) return existing
  const now = Date.now()
  const next: Entity = {
    id: makeEntityId(),
    type,
    key,
    displayName: displayName ?? rawKey.trim(),
    createdAt: now,
    updatedAt: now,
  }
  await db.entities.put(next)
  return next
}

export async function listEntities(type?: EntityType): Promise<Entity[]> {
  await ensureMigrated()
  await syncEntitiesFromSupabase(type)
  if (!type) return db.entities.orderBy('updatedAt').reverse().toArray()
  return db.entities.where('type').equals(type).toArray()
}
