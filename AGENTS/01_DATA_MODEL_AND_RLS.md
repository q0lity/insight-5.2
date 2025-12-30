# Agent 01 — Data Model & RLS (Supabase)

## Deliverables
- `Insight 5/DB/SUPABASE_SCHEMA_V1.sql` (tables + indexes + triggers)
- `Insight 5/DB/RLS_POLICIES_V1.md` (policy intent per table)
- `Insight 5/DB/MIGRATION_PLAN.md` (migrations order)

## Must Support (MVP)
- Goals, projects, entries (multi-facet), tracker definitions/logs, attachments
- Saved views (filter/sort/group config stored as JSON)
- External calendar mappings (Google + device calendar IDs)
- Offline sync metadata (`updated_at`, tombstones, source, versioning)

## Notes
- Use `uuid` primary keys.
- Use `jsonb` for frontmatter-like flexible fields.
- Use GIN indexes for arrays (tags/projects/contexts) and JSON paths we query.
- RLS: per-user row ownership + shared future hooks (optional later).
