# Migration Plan (v1)

1. Create extensions + utility triggers (`pgcrypto`, `set_updated_at`).
2. Create core tables: `profiles`, `goals`, `projects`, `entries`.
3. Create linking tables: `entry_goals`, `entry_projects`.
4. Create content tables: `entry_segments`, `tracker_definitions`, `tracker_logs`.
5. Create fitness/nutrition: `workout_sessions`, `workout_rows`, `nutrition_logs`.
6. Create supporting tables: `attachments`, `saved_views`, `timers`, `external_event_links`.
7. Add RLS policies + grants (Supabase dashboard or SQL migration).

Next (v2): add optional E2EE fields, automation rules, richer calendar account management, and background sync jobs.
