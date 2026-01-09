# RLS Policies v1 (Intent)

Principle: every row is owned by a user (`user_id` or `id` referencing `auth.users.id`). Users can only read/write their own rows.

## Tables
- `profiles`: `id = auth.uid()`
- `goals`, `projects`, `entries`, `entry_segments`, `tracker_definitions`, `tracker_logs`, `workout_sessions`, `workout_rows`, `nutrition_logs`, `attachments`, `saved_views`, `timers`, `external_event_links`, `external_accounts`:
  - SELECT: `user_id = auth.uid()`
  - INSERT: `user_id = auth.uid()`
  - UPDATE: `user_id = auth.uid()`
  - DELETE: `user_id = auth.uid()`

## Join tables
- `entry_goals`, `entry_projects`:
  - Policy should validate ownership through the referenced `entries.user_id = auth.uid()`.

## Storage (Supabase Storage)
- Use per-user folder prefix (e.g., `user/<uid>/...`) and Storage policies that enforce prefix ownership.

## OAuth tokens
Provider tokens are stored encrypted at rest and only accessed via server-side Edge Functions.
