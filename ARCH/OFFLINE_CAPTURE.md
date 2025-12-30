# Offline Capture Strategy (MVP)

## Goal
Make the MVP “actually work” even without internet by allowing **capture now** and **parse/sync later**.

## Behavior (MVP)
- If offline:
  - The app can still **record audio**, start/stop timers, and create a local “Pending Capture”.
  - No LLM parsing occurs until connectivity returns.
- If online:
  - The app transcribes + parses immediately and shows review cards.

## Local-First Data
Store locally (SQLite) until synced:
- `pending_captures`: id, createdAt, surface (`in_app`, `ios_action_button`, `android_tile`), audioLocalPath, transcript (optional), parseStatus, error, contextSnapshot (current goal/project/event).
- `local_timers`: id, startedAt, endsAt, linkedEntryId (optional), elapsedMinutes, state.
- `outbox`: queued mutations to Supabase (create/update/delete), retry metadata.

## Sync/Parse When Online
1. Upload audio to server (Edge Function) for transcription/parsing.
2. Receive `proposals[] + questions[]`.
3. Show review cards; user confirms/edits.
4. Commit finalized entries to Supabase.
5. Clean up local audio per retention setting (default: delete after successful commit).

## UX Rules
- Pending captures appear in a small “Inbox” strip (badge count) on Dashboard.
- When connectivity returns, the app prompts: “You have 3 pending logs to review.”

## Notes
- This avoids brittle “offline LLM” requirements while keeping the product usable.
- If you later want true offline transcription, we can add an on-device ASR option; parsing can still be deferred.
