# Appendix F — Data Dictionary (MVP)

This maps product concepts to the Supabase schema. Canonical SQL is in `Insight 5/DB/SUPABASE_SCHEMA_V1.sql`.

## `goals`
- `importance` (1–10): used to compute `goalMultiplier = 1 + importance/10`.
- `tags[]`: hierarchical tags allowed.
- `metadata`: flexible JSON.

## `projects`
- `goal_id`: optional link to a goal.
- `status`: `active|paused|completed|archived`.

## `entries`
- `facets[]`: must include one or more of `note|task|event|habit|tracker`.
- `start_at`, `end_at`: timestamps for event-like entries.
- `duration_minutes`: integer minutes for scoring/time tracking.
- `difficulty`, `importance`: 1–10 for scoring.
- `goal_multiplier`, `xp`: stored derived values for fast UI.
- Task fields (when facets contains `task`):
  - `status`, `priority`, `scheduled_at`, `due_at`, `completed_at`
- `frontmatter`: YAML-equivalent JSON.
- `body_markdown`: primary markdown body.
- `source`: `app|import|calendar|migration`.
- `embedding`: vector(1536) for semantic search.

## `entities`
- Cross-device tag/person/place vocabulary.
- `type`: `tag|person|place`.
- `key`: normalized lookup key; unique per user + type.

## `entry_segments`
- `at_offset_minutes`: timestamped dividers/notes within an entry.
- `segment_type`: `note|divider|transcript`.

## `tracker_definitions`
- `key`: canonical token key (e.g., `mood`).
- `value_type`: `number|scale|boolean|text|duration`.
- `min_value/max_value`: optional numeric bounds.

## `tracker_logs`
- `occurred_at`: the time the tracker value applies.
- `value_numeric/value_text/value_bool`: one should be populated based on `value_type`.
- `raw_token`: optional original token string.
- `entry_id`: optional link to the “containing” Entry (e.g., a pain rating logged during a running Workout).

## `habit_definitions` + `habit_instances`
- `habit_definitions`: name, schedule JSON, default importance/difficulty, tags/contexts.
- `habit_instances`: timestamped completion/log, optionally linked to an Entry.

## `workout_sessions` + `workout_rows`
- One session per workout entry.
- Rows store exercise metrics; table is sortable in UI.

## `nutrition_logs`
- POC: editable estimate fields + confidence + source.

## `saved_views`
- `query`: JSON query tree (Appendix B).
- `options`: visualization config, layout settings, pinned state.

## `external_event_links`
- `provider`: `google|device`.
- `external_event_id`: provider’s event ID.
- `etag`: used for conflict detection.

## Local-first IndexedDB mirror (Phase 0 / MVP implementation detail)
The desktop/web prototype stores core data in IndexedDB (Dexie) and treats it as the source of truth until Supabase sync is enabled.

**Tables**
- `entities` (tags/people/places): canonical entity index; referenced by `entity_ids[]`.
- `notes` (inbox captures): raw transcript “note card” created for every capture.
- `tasks`: extracted tasks; always backlink to the source capture via `source_note_id`.
- `events`: calendar items; includes `kind=event|task|log|episode`.

**Key relationships**
- Backlinks: `tasks.source_note_id` and `events.source_note_id` → `notes.id`.
- Entity linking: `tasks.entity_ids[]` / `events.entity_ids[]` → `entities.id`.
- Active-event auto-attachment (logs): `events(kind=log).parent_event_id` → `events.id` (the active/running event at capture time). This is the local analogue of `tracker_logs.entry_id` in the Supabase schema.

**Segments (no nested events)**
- Segments/dividers live inside an entry/event as timestamped lines in the markdown notes body (rendered as internal dividers in the calendar UI). The normalized server form is `entry_segments`.
