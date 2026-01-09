-- Insight 5 — Supabase Schema v1 (MVP)
-- Canonical DB: Supabase Postgres

-- Extensions
create extension if not exists "pgcrypto";

-- Utility: updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Profiles (optional, but useful for app settings and display)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  display_name text,
  timezone text default 'UTC',
  settings jsonb not null default '{}'::jsonb
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Entities (tags/people/places lookup)
create table if not exists public.entities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  type text not null check (type in ('tag','person','place')),
  key text not null,
  display_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  unique (user_id, type, key)
);

create index if not exists entities_user_id_idx on public.entities(user_id);
create index if not exists entities_type_key_idx on public.entities(user_id, type, key);

create trigger entities_set_updated_at
before update on public.entities
for each row execute function public.set_updated_at();

-- Goals
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  description text,
  importance smallint not null default 5 check (importance between 1 and 10),
  archived boolean not null default false,
  tags text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists goals_user_id_idx on public.goals(user_id);
create index if not exists goals_tags_gin on public.goals using gin(tags);

create trigger goals_set_updated_at
before update on public.goals
for each row execute function public.set_updated_at();

-- Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  description text,
  status text not null default 'active' check (status in ('active','paused','completed','archived')),
  importance smallint not null default 5 check (importance between 1 and 10),
  tags text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists projects_user_id_idx on public.projects(user_id);
create index if not exists projects_goal_id_idx on public.projects(goal_id);
create index if not exists projects_tags_gin on public.projects using gin(tags);

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

-- Entries (atomic logs; multi-facet)
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  title text not null,
  facets text[] not null default '{}'::text[],

  -- Task-like fields (when facets includes 'task')
  status text, -- open|in_progress|done|canceled
  priority text, -- low|normal|high|urgent (or user-defined later)
  scheduled_at timestamptz,
  due_at timestamptz,
  completed_at timestamptz,

  start_at timestamptz,
  end_at timestamptz,
  duration_minutes int check (duration_minutes is null or duration_minutes >= 0),

  difficulty smallint check (difficulty is null or difficulty between 1 and 10),
  importance smallint check (importance is null or importance between 1 and 10),

  -- Score outputs (derived; stored for fast UI)
  goal_multiplier numeric,
  xp numeric,

  tags text[] not null default '{}'::text[],
  contexts text[] not null default '{}'::text[],
  people text[] not null default '{}'::text[],

  -- Portable representation
  frontmatter jsonb not null default '{}'::jsonb,
  body_markdown text not null default '',

  -- Soft delete / sync helpers
  deleted_at timestamptz,
  source text not null default 'app', -- app|import|calendar|migration

  -- Vector embedding (OpenAI text-embedding-3-small, 1536 dims)
  embedding vector(1536)
);

create index if not exists entries_user_id_idx on public.entries(user_id);
create index if not exists entries_start_at_idx on public.entries(user_id, start_at desc);
create index if not exists entries_deleted_at_idx on public.entries(user_id, deleted_at);
create index if not exists entries_task_fields_idx on public.entries(user_id, status, due_at, scheduled_at);
create index if not exists entries_tags_gin on public.entries using gin(tags);
create index if not exists entries_contexts_gin on public.entries using gin(contexts);
create index if not exists entries_people_gin on public.entries using gin(people);
create index if not exists entries_frontmatter_gin on public.entries using gin(frontmatter);

create trigger entries_set_updated_at
before update on public.entries
for each row execute function public.set_updated_at();

-- Entry ↔ Goals
create table if not exists public.entry_goals (
  entry_id uuid not null references public.entries(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  primary key (entry_id, goal_id)
);

create index if not exists entry_goals_goal_id_idx on public.entry_goals(goal_id);

-- Entry ↔ Projects
create table if not exists public.entry_projects (
  entry_id uuid not null references public.entries(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  primary key (entry_id, project_id)
);

create index if not exists entry_projects_project_id_idx on public.entry_projects(project_id);

-- Entry segments (timestamped dividers/notes within an entry)
create table if not exists public.entry_segments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id uuid not null references public.entries(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  at_offset_minutes int not null default 0 check (at_offset_minutes >= 0),
  segment_type text not null default 'note' check (segment_type in ('note','divider','transcript')),
  content text not null
);

create index if not exists entry_segments_entry_id_idx on public.entry_segments(entry_id, at_offset_minutes);

create trigger entry_segments_set_updated_at
before update on public.entry_segments
for each row execute function public.set_updated_at();

-- Habit definitions (user-defined)
create table if not exists public.habit_definitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  description text,
  importance smallint not null default 5 check (importance between 1 and 10),
  difficulty smallint not null default 5 check (difficulty between 1 and 10),
  schedule jsonb not null default '{}'::jsonb, -- e.g., {frequency:"daily", days:[1,2,3], times:["08:00"]}
  tags text[] not null default '{}'::text[],
  contexts text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  archived boolean not null default false
);

create index if not exists habit_definitions_user_id_idx on public.habit_definitions(user_id);
create index if not exists habit_definitions_tags_gin on public.habit_definitions using gin(tags);

create trigger habit_definitions_set_updated_at
before update on public.habit_definitions
for each row execute function public.set_updated_at();

-- Habit instances (a completion/log, typically backed by an entry)
create table if not exists public.habit_instances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habit_definitions(id) on delete cascade,
  entry_id uuid references public.entries(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  occurred_at timestamptz not null default now(),
  value_numeric numeric,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists habit_instances_user_id_idx on public.habit_instances(user_id, occurred_at desc);
create index if not exists habit_instances_habit_id_idx on public.habit_instances(habit_id, occurred_at desc);

create trigger habit_instances_set_updated_at
before update on public.habit_instances
for each row execute function public.set_updated_at();

-- Tracker definitions (user-configurable)
create table if not exists public.tracker_definitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  key text not null, -- e.g. "mood"
  display_name text not null, -- e.g. "Mood"
  value_type text not null default 'number' check (value_type in ('number','scale','boolean','text','duration')),
  unit text,
  min_value numeric,
  max_value numeric,
  config jsonb not null default '{}'::jsonb,

  unique (user_id, key)
);

create index if not exists tracker_definitions_user_id_idx on public.tracker_definitions(user_id);

create trigger tracker_definitions_set_updated_at
before update on public.tracker_definitions
for each row execute function public.set_updated_at();

-- Tracker logs (often created from token syntax like #mood(7))
create table if not exists public.tracker_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tracker_id uuid not null references public.tracker_definitions(id) on delete cascade,
  entry_id uuid references public.entries(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  occurred_at timestamptz not null default now(),

  value_numeric numeric,
  value_text text,
  value_bool boolean,
  unit text,
  raw_token text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists tracker_logs_user_id_idx on public.tracker_logs(user_id, occurred_at desc);
create index if not exists tracker_logs_tracker_id_idx on public.tracker_logs(tracker_id, occurred_at desc);
create index if not exists tracker_logs_entry_id_idx on public.tracker_logs(entry_id);

create trigger tracker_logs_set_updated_at
before update on public.tracker_logs
for each row execute function public.set_updated_at();

-- Workout sessions (for sortable fitness tables)
create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id uuid not null unique references public.entries(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  template text not null default 'strength' -- strength|cardio|mobility
);

create trigger workout_sessions_set_updated_at
before update on public.workout_sessions
for each row execute function public.set_updated_at();

create table if not exists public.workout_rows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  exercise text not null,
  set_index int,
  reps int,
  weight numeric,
  weight_unit text, -- lb|kg|bodyweight
  rpe numeric,

  duration_seconds int,
  distance numeric,
  distance_unit text,

  notes text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists workout_rows_session_id_idx on public.workout_rows(session_id);
create index if not exists workout_rows_exercise_idx on public.workout_rows(user_id, exercise);

create trigger workout_rows_set_updated_at
before update on public.workout_rows
for each row execute function public.set_updated_at();

-- Nutrition logs (POC; editable estimates)
create table if not exists public.nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id uuid not null unique references public.entries(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  confidence numeric,
  source text not null default 'estimate', -- estimate|manual|import
  metadata jsonb not null default '{}'::jsonb
);

create trigger nutrition_logs_set_updated_at
before update on public.nutrition_logs
for each row execute function public.set_updated_at();

-- Attachments (Supabase Storage pointers)
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id uuid references public.entries(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  bucket text not null,
  path text not null,
  mime_type text,
  byte_size bigint,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists attachments_entry_id_idx on public.attachments(entry_id);

create trigger attachments_set_updated_at
before update on public.attachments
for each row execute function public.set_updated_at();

-- Saved views (Bases-like)
create table if not exists public.saved_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  view_type text not null default 'list' check (view_type in ('list','chart','dashboard')),
  query jsonb not null default '{}'::jsonb,
  options jsonb not null default '{}'::jsonb
);

create index if not exists saved_views_user_id_idx on public.saved_views(user_id);

create trigger saved_views_set_updated_at
before update on public.saved_views
for each row execute function public.set_updated_at();

-- Timers (for Live Activity / Now Running)
create table if not exists public.timers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id uuid references public.entries(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  kind text not null default 'countdown' check (kind in ('countdown','stopwatch','pomodoro')),
  state text not null default 'running' check (state in ('running','paused','stopped','completed')),
  started_at timestamptz not null default now(),
  ends_at timestamptz,
  duration_minutes int,
  accumulated_minutes int not null default 0,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists timers_user_id_idx on public.timers(user_id, started_at desc);

create trigger timers_set_updated_at
before update on public.timers
for each row execute function public.set_updated_at();

-- External calendar mappings (Google + device calendar)
create table if not exists public.external_event_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id uuid not null references public.entries(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  provider text not null check (provider in ('google','microsoft','device','apple')),
  external_event_id text not null,
  external_calendar_id text,
  etag text,
  last_synced_at timestamptz,
  unique (provider, external_event_id)
);

create index if not exists external_event_links_entry_id_idx on public.external_event_links(entry_id);
create index if not exists external_event_links_user_id_idx on public.external_event_links(user_id, last_synced_at desc);

create trigger external_event_links_set_updated_at
before update on public.external_event_links
for each row execute function public.set_updated_at();

-- External calendar accounts (OAuth tokens)
create table if not exists public.external_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google','microsoft')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  external_account_id text,
  external_email text,
  metadata jsonb not null default '{}'::jsonb,
  unique (user_id, provider)
);

create index if not exists external_accounts_user_id_idx on public.external_accounts(user_id);

create trigger external_accounts_set_updated_at
before update on public.external_accounts
for each row execute function public.set_updated_at();
