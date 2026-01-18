# Data Model, Sync Protocol, and Storage Design Spec

**Author:** Agent (Valkyrie)
**Date:** 2026-01-18
**Status:** DRAFT
**References:** `DB/SUPABASE_SCHEMA_V1.sql`, `packages/shared/src/models.ts`, `ARCH/OFFLINE_CAPTURE.md`

---

## 1. Executive Summary

This document specifies the data model architecture, offline-first strategy, sync protocol, and pgvector embedding approach for Insight 5 across desktop (Electron + Dexie) and mobile (React Native + SQLite) platforms.

**Key Principles:**
- Supabase is the canonical source of truth
- Local stores (IndexedDB/SQLite) are caches + outboxes, never divergent masters
- Offline capture must never lose data
- Sync is timestamp-based with last-write-wins conflict resolution
- Embeddings are computed server-side to avoid client API key exposure

---

## 2. Data Model Analysis

### 2.1 Server Schema (Supabase Postgres)

The canonical schema (`SUPABASE_SCHEMA_V1.sql`) defines these core table groups:

| Group | Tables | Purpose |
|-------|--------|---------|
| **User** | `profiles` | App settings, timezone, display name |
| **Vocabulary** | `entities` | Tags, people, places (normalized lookup) |
| **Objectives** | `goals`, `projects` | Hierarchical goal/project structure |
| **Core Content** | `entries`, `entry_segments` | Atomic records + timestamped segments |
| **Relationships** | `entry_goals`, `entry_projects` | M:N links |
| **Health** | `workout_sessions`, `workout_rows`, `nutrition_logs` | Fitness + nutrition tracking |
| **Habits** | `habit_definitions`, `habit_instances` | Recurring behaviors |
| **Trackers** | `tracker_definitions`, `tracker_logs` | Configurable measurements |
| **Calendar** | `external_event_links`, `external_accounts`, `timers` | External integrations |
| **Storage** | `attachments` | Media files (Supabase Storage pointers) |
| **UI** | `saved_views` | Saved queries and dashboard configs |

### 2.2 Local Schema (Desktop Dexie / Mobile SQLite)

Current local tables mirror a subset of the server schema:

```
entities    → id, type, key, displayName, updatedAt
notes       → id, createdAt, rawText, status, entityIds
tasks       → id, title, status, timestamps, metadata, entityIds
events      → id, title, timestamps, kind, metadata, entityIds
workouts    → id, eventId, type, exercises[], timestamps
meals       → id, eventId, type, items[], macros, timestamps
patterns    → id, type, sourceKey, targetKey, confidence (adaptive learning)
```

### 2.3 Entry Facets Model

The `entries` table uses a flexible **facet system** where a single entry can carry multiple facets:

```sql
facets text[] -- ['event'], ['task'], ['note'], ['habit_def'], etc.
```

This allows a single record to represent hybrid items (e.g., a task scheduled as an event).

### 2.4 Legacy ID Mapping

Desktop sync currently uses `frontmatter.legacyId` and `frontmatter.legacyType` to map local IDs to server entries:

```typescript
frontmatter: {
  legacyId: string,      // local client ID
  legacyType: 'task' | 'event' | 'note' | 'habit_def',
  sourceApp: 'desktop' | 'mobile',
  // ... domain-specific fields
}
```

---

## 3. Offline-First Strategy

### 3.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT (Mobile/Desktop)              │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────┐ │
│  │   UI Layer    │  │  Local Store  │  │   Outbox    │ │
│  │               │◄─│  (IndexedDB/  │  │   Queue     │ │
│  │               │  │   SQLite)     │  │             │ │
│  └───────────────┘  └───────┬───────┘  └──────┬──────┘ │
│                             │                  │        │
│                             ▼                  ▼        │
│                      ┌──────────────────────────┐       │
│                      │      Sync Engine         │       │
│                      │   (Push/Pull/Conflict)   │       │
│                      └────────────┬─────────────┘       │
└───────────────────────────────────┼─────────────────────┘
                                    │
                                    ▼ HTTPS
┌───────────────────────────────────────────────────────┐
│                   SUPABASE (Canonical)                 │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐  │
│  │   Postgres  │  │  Edge Funcs │  │    Storage    │  │
│  │  (entries,  │  │  (parsing,  │  │  (audio,      │  │
│  │   etc.)     │  │  embedding) │  │   photos)     │  │
│  └─────────────┘  └─────────────┘  └───────────────┘  │
└───────────────────────────────────────────────────────┘
```

### 3.2 Local Store Schema (Unified)

Standardize local tables across platforms:

```typescript
// Pending Captures (offline audio/text before parsing)
interface PendingCapture {
  id: string
  createdAt: number
  surface: 'in_app' | 'ios_action_button' | 'android_tile' | 'desktop_hotkey'
  audioLocalPath?: string
  rawTranscript?: string
  parseStatus: 'pending' | 'uploading' | 'parsing' | 'ready' | 'error'
  error?: string
  contextSnapshot: {
    activeGoalId?: string
    activeProjectId?: string
    activeEventId?: string
  }
  retryCount: number
  lastAttemptAt?: number
}

// Outbox for queued mutations
interface OutboxItem {
  id: string
  createdAt: number
  operation: 'create' | 'update' | 'delete'
  table: string
  payload: Record<string, unknown>
  legacyId?: string
  legacyType?: string
  retryCount: number
  lastAttemptAt?: number
  error?: string
}

// Sync Metadata
interface SyncMetadata {
  key: string  // 'lastPull', 'lastPush', etc.
  value: string | number
}
```

### 3.3 Offline Behavior Rules

| Scenario | Behavior |
|----------|----------|
| **Capture (offline)** | Store raw audio/text in `pending_captures`, set `parseStatus: 'pending'` |
| **Create entry (offline)** | Generate local UUID, store in local DB, queue in outbox |
| **Update entry (offline)** | Update local DB, queue in outbox with full payload |
| **Delete entry (offline)** | Mark `deleted_at` locally, queue delete in outbox |
| **Timer operations** | Fully local; sync timer state on reconnect |

### 3.4 Connectivity Detection

```typescript
type ConnectivityState = 'online' | 'offline' | 'limited'

// Use NetInfo (mobile) or navigator.onLine (desktop)
// Limited = can reach network but Supabase unreachable
```

---

## 4. Sync Protocol

### 4.1 Sync Triggers

| Trigger | Action |
|---------|--------|
| App foreground | Pull delta from server |
| Connectivity restored | Flush outbox, then pull |
| User creates/updates entry | Immediate push (if online), else queue |
| Manual refresh | Full pull with optional reset |
| Background interval | Pull every 5 min when app active |

### 4.2 Delta Sync Protocol

**Pull (Server → Client):**

```typescript
async function pullDelta(userId: string, since: string | null) {
  // Fetch entries updated since last pull
  const query = supabase
    .from('entries')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: true })

  if (since) {
    query.gte('updated_at', since)
  }

  const { data, error } = await query

  // Process each entry
  for (const entry of data) {
    if (entry.deleted_at) {
      await localDb.deleteByServerId(entry.id)
    } else {
      await localDb.upsertFromServer(entry)
    }
  }

  // Update sync cursor
  await setSyncMetadata('lastPull', new Date().toISOString())
}
```

**Push (Client → Server):**

```typescript
async function pushOutbox(userId: string) {
  const items = await localDb.outbox.orderBy('createdAt').toArray()

  for (const item of items) {
    try {
      switch (item.operation) {
        case 'create':
        case 'update':
          await upsertEntry(userId, item)
          break
        case 'delete':
          await markDeleted(userId, item)
          break
      }
      await localDb.outbox.delete(item.id)
    } catch (err) {
      item.retryCount++
      item.lastAttemptAt = Date.now()
      item.error = err.message
      await localDb.outbox.put(item)

      if (item.retryCount >= 5) {
        // Move to dead letter queue, notify user
      }
    }
  }
}
```

### 4.3 Conflict Resolution Strategy

**Last-Write-Wins (LWW) with server timestamp:**

```typescript
// Server-side: updated_at trigger ensures accurate timestamp
// Client: use server's updated_at for conflict detection

async function upsertEntry(userId: string, item: OutboxItem) {
  const payload = {
    ...item.payload,
    user_id: userId,
    updated_at: new Date().toISOString(), // Server will override with trigger
  }

  // Lookup existing by legacy ID
  const existing = await supabase
    .from('entries')
    .select('id, updated_at')
    .eq('frontmatter->>legacyId', item.legacyId)
    .eq('frontmatter->>legacyType', item.legacyType)
    .maybeSingle()

  if (existing?.id) {
    payload.id = existing.id
  }

  const { data, error } = await supabase
    .from('entries')
    .upsert(payload, { onConflict: 'id' })
    .select('id, updated_at')
    .single()

  if (error) throw error
  return data
}
```

**Conflict Scenarios:**

| Scenario | Resolution |
|----------|------------|
| Client A and B edit same entry | Last push wins; earlier push overwritten |
| Client edits offline, server has newer | Server version preserved on next pull |
| Delete vs Update race | `deleted_at` set → treated as deleted |

**Future Enhancement (v2):** Implement operational transform or CRDT for field-level merge.

### 4.4 Entity Sync

Entities (tags, people, places) use unique constraint `(user_id, type, key)`:

```typescript
async function syncEntities(userId: string, entities: Entity[]) {
  const rows = entities.map(e => ({
    user_id: userId,
    type: e.type,
    key: normalizeEntityKey(e.key),
    display_name: e.displayName || e.key,
    metadata: {},
  }))

  await supabase.from('entities').upsert(rows, {
    onConflict: 'user_id,type,key'
  })
}
```

### 4.5 Sync State Machine

```
┌─────────┐
│  IDLE   │◄───────────────────────────────────────┐
└────┬────┘                                        │
     │ trigger                                     │
     ▼                                             │
┌─────────┐    success    ┌─────────┐   success   │
│ PUSHING │──────────────►│ PULLING │─────────────┘
└────┬────┘               └────┬────┘
     │ error                   │ error
     ▼                         ▼
┌─────────┐               ┌─────────┐
│  RETRY  │               │  RETRY  │
└─────────┘               └─────────┘
```

---

## 5. pgvector Embedding Strategy

### 5.1 Current Implementation

- Model: `text-embedding-3-small` (OpenAI, 1536 dimensions)
- Storage: `entries.embedding vector(1536)`
- Trigger: After entry upsert, compute embedding server-side

### 5.2 Embedding Text Construction

```typescript
function buildEmbeddingText(entry: Entry): string {
  const parts = [
    entry.title,
    entry.body_markdown || '',
  ]

  if (entry.tags?.length) {
    parts.push(`Tags: ${entry.tags.join(', ')}`)
  }
  if (entry.contexts?.length) {
    parts.push(`Contexts: ${entry.contexts.join(', ')}`)
  }
  if (entry.people?.length) {
    parts.push(`People: ${entry.people.join(', ')}`)
  }

  const text = parts.join('\n').trim()
  return text.length > 8000 ? text.slice(0, 8000) : text
}
```

### 5.3 Embedding Pipeline

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│  Entry Upsert  │────►│  Edge Function │────►│  OpenAI API    │
│  (Supabase)    │     │  embed_entry   │     │  embedding     │
└────────────────┘     └────────────────┘     └────────┬───────┘
                                                       │
                       ┌────────────────┐              │
                       │ entries.embedding │◄───────────┘
                       │ UPDATE           │
                       └────────────────┘
```

**Recommended Edge Function:**

```typescript
// supabase/functions/embed_entry/index.ts
import { OpenAI } from 'openai'
import { createClient } from '@supabase/supabase-js'

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') })
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  const { entry_id } = await req.json()

  // Fetch entry
  const { data: entry } = await supabase
    .from('entries')
    .select('id, title, body_markdown, tags, contexts, people')
    .eq('id', entry_id)
    .single()

  if (!entry) return new Response('Not found', { status: 404 })

  // Build text
  const text = buildEmbeddingText(entry)

  // Get embedding
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })

  const embedding = response.data[0].embedding

  // Update entry
  await supabase
    .from('entries')
    .update({ embedding })
    .eq('id', entry_id)

  return new Response(JSON.stringify({ success: true }))
})
```

### 5.4 Semantic Search

```sql
-- Find similar entries using cosine distance
CREATE OR REPLACE FUNCTION search_entries(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  id uuid,
  title text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.title,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM entries e
  WHERE e.user_id = p_user_id
    AND e.embedding IS NOT NULL
    AND e.deleted_at IS NULL
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### 5.5 Embedding Index

```sql
-- HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS entries_embedding_idx
ON entries
USING hnsw (embedding vector_cosine_ops)
WHERE embedding IS NOT NULL;
```

### 5.6 Batch Embedding (Migration)

For existing entries without embeddings:

```typescript
async function backfillEmbeddings() {
  const batchSize = 100
  let offset = 0

  while (true) {
    const { data: entries } = await supabase
      .from('entries')
      .select('id')
      .is('embedding', null)
      .is('deleted_at', null)
      .range(offset, offset + batchSize - 1)

    if (!entries?.length) break

    for (const entry of entries) {
      await supabase.functions.invoke('embed_entry', {
        body: { entry_id: entry.id }
      })

      // Rate limit: 500 RPM for text-embedding-3-small
      await sleep(120)
    }

    offset += batchSize
  }
}
```

---

## 6. Platform-Specific Implementation

### 6.1 Desktop (Electron + Dexie)

**Current State:** Implemented in `apps/desktop/src/supabase/sync.ts`

**Improvements Needed:**
1. Add outbox queue for offline mutations
2. Implement background sync interval
3. Add connectivity state management
4. Move embedding to Edge Function (remove client-side OpenAI key)

### 6.2 Mobile (React Native + SQLite)

**Current State:** Basic storage helpers in `apps/mobile4/src/supabase/`

**Implementation Plan:**
1. Use `expo-sqlite` or `react-native-sqlite-storage`
2. Mirror Dexie schema structure
3. Implement same sync engine interface
4. Handle background sync via `react-native-background-fetch`

### 6.3 Shared Sync Engine

Extract sync logic into `packages/shared/src/sync/`:

```typescript
// packages/shared/src/sync/engine.ts
export interface SyncEngine {
  pullDelta(): Promise<SyncResult>
  pushOutbox(): Promise<SyncResult>
  queueMutation(item: OutboxItem): Promise<void>
  getSyncStatus(): SyncStatus
}

// packages/shared/src/sync/types.ts
export interface SyncResult {
  success: boolean
  itemsPulled: number
  itemsPushed: number
  errors: SyncError[]
}

export interface SyncStatus {
  lastPull: Date | null
  lastPush: Date | null
  outboxCount: number
  pendingCapturesCount: number
  state: 'idle' | 'syncing' | 'error'
}
```

---

## 7. Security Considerations

### 7.1 RLS Policies

All tables use Row Level Security with `user_id = auth.uid()` checks:
- Users can only read/write their own data
- Join tables validate ownership through parent entry
- Anonymous auth allowed for non-critical operations only

### 7.2 API Key Management

| Key | Location | Notes |
|-----|----------|-------|
| Supabase Anon Key | Client | Public, RLS protected |
| Supabase Service Key | Edge Functions only | Never client-side |
| OpenAI API Key | Edge Functions only | Never client-side |

### 7.3 Token Storage

- Mobile: Use `expo-secure-store` for auth tokens
- Desktop: Use `keytar` or encrypted localStorage
- Never store refresh tokens in plain text

---

## 8. Migration Path

### 8.1 Phase 1: Outbox Queue (Desktop)
1. Add `outbox` table to Dexie schema
2. Queue mutations instead of immediate sync
3. Process outbox on connectivity
4. Add retry logic with exponential backoff

### 8.2 Phase 2: Shared Sync Engine
1. Extract sync logic to `packages/shared`
2. Create platform adapters for storage layer
3. Implement unified sync state machine

### 8.3 Phase 3: Mobile Sync
1. Implement SQLite storage adapter
2. Integrate shared sync engine
3. Add background sync support

### 8.4 Phase 4: Server-Side Embeddings
1. Deploy `embed_entry` Edge Function
2. Add database trigger or webhook for auto-embedding
3. Remove client-side OpenAI calls
4. Backfill existing entries

---

## 9. Appendix: Table Sync Priority

| Table | Sync Priority | Notes |
|-------|---------------|-------|
| `entries` | High | Core data, sync immediately |
| `entities` | High | Vocabulary, needed for display |
| `goals` | Medium | User-initiated sync |
| `projects` | Medium | User-initiated sync |
| `workout_sessions` | Medium | Health data |
| `nutrition_logs` | Medium | Health data |
| `habit_definitions` | Medium | Definitions rarely change |
| `habit_instances` | High | Track completions |
| `tracker_logs` | High | Track measurements |
| `saved_views` | Low | UI preferences |
| `attachments` | Lazy | Download on demand |

---

## 10. Open Questions

1. **Conflict UI:** Should users see conflicts and resolve manually?
2. **Partial Sync:** Allow syncing specific tables on metered connections?
3. **Compression:** Compress large payloads (markdown, metadata)?
4. **Real-time:** Use Supabase Realtime for live updates between devices?
5. **Retention:** Auto-delete local data older than N days?

---

## 11. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-01-18 | Agent | Initial draft |
