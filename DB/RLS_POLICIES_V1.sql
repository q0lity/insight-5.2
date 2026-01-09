-- Insight 5 — RLS Policies v1 (SQL)
-- Apply after schema creation.

-- Profiles
alter table public.profiles enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Entities
alter table public.entities enable row level security;
create policy "entities_rw_own" on public.entities
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Helper macro: standard tables with user_id
-- Goals
alter table public.goals enable row level security;
create policy "goals_rw_own" on public.goals
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Projects
alter table public.projects enable row level security;
create policy "projects_rw_own" on public.projects
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Entries
alter table public.entries enable row level security;
create policy "entries_rw_own" on public.entries
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Entry segments
alter table public.entry_segments enable row level security;
create policy "entry_segments_rw_own" on public.entry_segments
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Trackers
alter table public.tracker_definitions enable row level security;
create policy "tracker_definitions_rw_own" on public.tracker_definitions
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

alter table public.tracker_logs enable row level security;
create policy "tracker_logs_rw_own" on public.tracker_logs
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Habits
alter table public.habit_definitions enable row level security;
create policy "habit_definitions_rw_own" on public.habit_definitions
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

alter table public.habit_instances enable row level security;
create policy "habit_instances_rw_own" on public.habit_instances
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Fitness / nutrition
alter table public.workout_sessions enable row level security;
create policy "workout_sessions_rw_own" on public.workout_sessions
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

alter table public.workout_rows enable row level security;
create policy "workout_rows_rw_own" on public.workout_rows
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

alter table public.nutrition_logs enable row level security;
create policy "nutrition_logs_rw_own" on public.nutrition_logs
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Attachments
alter table public.attachments enable row level security;
create policy "attachments_rw_own" on public.attachments
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Saved views
alter table public.saved_views enable row level security;
create policy "saved_views_rw_own" on public.saved_views
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Timers
alter table public.timers enable row level security;
create policy "timers_rw_own" on public.timers
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Calendar links
alter table public.external_event_links enable row level security;
create policy "external_event_links_rw_own" on public.external_event_links
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- External accounts (OAuth tokens)
alter table public.external_accounts enable row level security;
create policy "external_accounts_rw_own" on public.external_accounts
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Join tables: validate ownership through entries
alter table public.entry_goals enable row level security;
create policy "entry_goals_rw_via_entry" on public.entry_goals
for all to authenticated
using (
  exists (
    select 1 from public.entries e
    where e.id = entry_goals.entry_id
      and e.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.entries e
    where e.id = entry_goals.entry_id
      and e.user_id = auth.uid()
  )
);

alter table public.entry_projects enable row level security;
create policy "entry_projects_rw_via_entry" on public.entry_projects
for all to authenticated
using (
  exists (
    select 1 from public.entries e
    where e.id = entry_projects.entry_id
      and e.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.entries e
    where e.id = entry_projects.entry_id
      and e.user_id = auth.uid()
  )
);

-- Grants (Supabase usually manages, but explicit is fine)
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.set_updated_at() to authenticated;
