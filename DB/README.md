# Supabase DB (Insight 5)

## Files
- Schema: `Insight 5/DB/SUPABASE_SCHEMA_V1.sql`
- RLS intent: `Insight 5/DB/RLS_POLICIES_V1.md`
- RLS SQL: `Insight 5/DB/RLS_POLICIES_V1.sql`
- Migration notes: `Insight 5/DB/MIGRATION_PLAN.md`

## Apply To A Supabase Project (typical flow)
1. Create a Supabase project (Dashboard).
2. Apply `Insight 5/DB/SUPABASE_SCHEMA_V1.sql` in the SQL editor (or via migrations).
3. Apply `Insight 5/DB/RLS_POLICIES_V1.sql`.
4. Create Storage buckets (e.g., `attachments`) and add Storage policies for per-user access.

## Notes
- OAuth tokens for Google Calendar should not be stored plaintext; handle via Edge Functions and encrypted storage if needed.
- The schema is MVP-focused; we can expand it once the RN vertical slice is working end-to-end.
- `public.entities` stores tag/person/place vocabulary for cross-device lists.
