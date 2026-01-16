# Appendix F — Data Dictionary (MVP)

This maps product concepts to the Supabase schema. Canonical SQL is in `Insight 5/DB/SUPABASE_SCHEMA_V1.sql`.

## Canonical Glossary
- **Entry**: The atomic record created from voice or manual input. It carries a title, facets, timestamps, tokens (tags/contexts/people/places), and optional scoring metadata.
- **Event**: An Entry facet representing a time-bounded activity. Events use start/end or duration fields and can map to external calendar items.
- **Segment**: A timestamped divider, note, or transcript fragment inside an Entry, stored as `entry_segments`.
- **Block**: The user-facing markdown chunk between dividers in an Entry. Blocks are the UI representation of one or more Segments.
- **Task**: An Entry facet for actionable work. Tasks include status/priority fields and may be scheduled or due.
- **Tracker**: A measurement system consisting of a tracker definition and timestamped tracker logs. Logs can optionally link to an Entry for context.
- **Habit**: A recurring behavior with a habit definition and timestamped habit instances, optionally linked to an Entry.
- **Goal**: A top-level objective with an importance score used in XP/weighting logic.
- **Project**: A scoped body of work under a Goal. Projects have a status (active/paused/completed/archived).
- **Person**: A normalized entity representing an individual referenced in Entries (tokenized and stored in `entities`).
- **Place**: A normalized entity representing a location referenced in Entries (tokenized and stored in `entities`).
- **Tag**: A normalized label used for categorization and filtering (tokenized and stored in `entities`).
- **Context**: A situational token applied to Entries for grouping and filtering (e.g., "car", "work").
- **Media**: Attachments linked to Entries (audio, photo, video) stored in the `attachments` bucket.
- **Transcript**: Voice-to-text content stored as Segments (type `transcript`) and/or as pending capture text before parsing.

## Triple Title Rule
Use the format `category/subcategory/title` for Entry titles to keep naming consistent and filterable.

If a `categoryPath` has 3+ levels, the title may include the first two levels while the full path lives in `frontmatter.categoryPath`.

Examples:
- `transport/driving/Driving to work`
- `health/fitness/Morning run`

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
- `frontmatter.categoryPath`: optional string[] for 3+ level categories.
- `frontmatter.costUsd`: optional number for purchase/expense logs.
- `frontmatter.purchaseItems`: optional array of {name, qty, unit?}.
- `frontmatter.consumeItems`: optional array of {name, qty, unit?}.
- `frontmatter.subtasks`: optional array of {title, status, estimateMinutes?}.
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
IndexedDB (Dexie) is a cache + outbox for offline capture and fast reads. Supabase is the canonical source of truth for **both web and mobile**; local stores must sync and never diverge as an independent system of record.

**Tables**
- `entities` (tags/people/places): local entity index; referenced by `entity_ids[]`.
- `notes` (inbox captures): raw transcript “note card” created for every capture.
- `tasks`: extracted tasks; always backlink to the source capture via `source_note_id`.
- `events`: calendar items; includes `kind=event|task|log|episode`.

**Key relationships**
- Backlinks: `tasks.source_note_id` and `events.source_note_id` → `notes.id`.
- Entity linking: `tasks.entity_ids[]` / `events.entity_ids[]` → `entities.id`.
- Active-event auto-attachment (logs): `events(kind=log).parent_event_id` → `events.id` (the active/running event at capture time). This is the local analogue of `tracker_logs.entry_id` in the Supabase schema.

**Segments (no nested events)**
- Segments/dividers live inside an entry/event as timestamped lines in the markdown notes body (rendered as internal dividers in the calendar UI). The normalized server form is `entry_segments`.
