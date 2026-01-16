# Appendix D — Backend & APIs (Supabase + Edge Functions)

## D1) Canonical Storage
- Schema: `Insight 5/DB/SUPABASE_SCHEMA_V1.sql`
- RLS: `Insight 5/DB/RLS_POLICIES_V1.sql`

## D2) Auth
- Supabase Auth
- Single user per account
- Providers: Email + Apple + Google (MVP target; can phase)

## D3) Edge Functions (MVP)
### `transcribe_and_parse_capture`
Purpose: server-side transcription + parsing.

Request:
```json
{ "captureId": "uuid", "audioPath": "storage path or null", "transcript": "optional", "context": { "activeGoalIds": [], "activeProjectIds": [], "activeEntryId": null } }
```

Response: proposals + questions (see PRD section 6.4).

### `google_oauth_exchange`
Purpose: exchange auth code for tokens; store encrypted (or keep in provider vault, depending on approach).

### `google_calendar_sync`
Purpose: create/update/delete events in Google Calendar and store mapping in `external_event_links`.

## D4) Calendar Mapping Model (MVP)
- Each calendar-linked Entry has one row in `external_event_links`.
- Use `provider`, `external_event_id`, `external_calendar_id`, `etag`.
- Read-only calendars import entries with `source="calendar"` and a `frontmatter.readOnly=true` flag; no outbound sync.

## D5) Offline Sync Contract (MVP)
Client maintains an outbox with idempotent operations:
- `create_entry`
- `update_entry`
- `delete_entry` (soft delete)
- `create_tracker_log`
- `create_attachment`

Conflict policy is defined in PRD section 17.
