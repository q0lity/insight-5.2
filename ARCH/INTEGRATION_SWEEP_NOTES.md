# Insight 5 — Integration Sweep Notes

Primary build target: `Insight 5/` (desktop + mobile). Other folders in the parent workspace are reference/prototype inputs.

## What Already Exists (Insight 5 code)

### Desktop (Electron/Vite/React)
- Local-first storage via Dexie (`apps/desktop/src/db/insight-db.ts`): `notes` (raw captures), `tasks`, `events`, `entities`.
- Capture parsing:
  - Local heuristic parser (`apps/desktop/src/nlp/natural.ts`) using chrono-node + rules (past tense, durations, etc).
  - Optional LLM parser (`apps/desktop/src/nlp/llm-parse.ts`) that calls OpenAI directly from the client.
- Token extraction in UI (`apps/desktop/src/App.tsx`): `#key(value)`, `#key:value`, tags `#tag`, people `@name`, etc.

### DB target (PRD-aligned)
- Supabase schema v1 (`DB/SUPABASE_SCHEMA_V1.sql`) already models the desired direction:
  - `entries` as the atomic, multi-facet record.
  - Portable representation: `frontmatter` (jsonb) + `body_markdown` (text).
  - `entry_segments` for timestamped dividers/notes inside an entry.
  - `tracker_definitions` + `tracker_logs` (Nomie-style tokens).

## Reference Inputs (parent workspace)

### `Reference 2/` (Obsidian ledger + dashboards)
- Concrete “single source of truth” ledger format (single markdown file) with:
  - human-readable section blocks,
  - “DV EXPORT” rich objects,
  - “TRACKER FIELDS” simple scalar fields for charting.

### `flutter_app/` (behavioral prototype)
- End-to-end: voice → structured parse → markdown generation/parsing → event/task UI patterns.

### `tasknotes` / `tasknotes-main-2/` (task-note conventions)
- Note-per-task patterns and YAML/frontmatter expectations for task views/calendar/time tracking.

### `obsidian-life-tracker-base-view-main/`
- Visualization and dashboard patterns (Dataview/Tracker-style), useful as a UX reference for Insight 5 dashboards.

## Biggest Congruence Gaps (to resolve in Insight 5)

- PRD says “Supabase is canonical + no client-side LLM keys”, while current desktop LLM parsing calls OpenAI from the client and stores the key locally.
- Desktop storage is split (`tasks` + `events` + `notes`) vs PRD/DB schema centered on `entries` (multi-facet).
- Markdown/YAML language spec exists in PRD (`PRD/APPENDIX_A_LANGUAGE_SPEC.md`) but is not yet implemented as a generator/parser in the apps.
- Obsidian-style export format (ledger / one-note-per-entry) is not implemented yet.

