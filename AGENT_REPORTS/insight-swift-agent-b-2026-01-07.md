# Insight Swift Agent B Report - 2026-01-07

## Changes
- Added scheduling data fields (all-day, scheduledAt, duration, recurrence) and drag payload helpers.
- Introduced ScheduleService for day/week range expansion and recurrence handling.
- Updated AppStore seed data and added schedule helpers for entries, tasks, and habits.
- Expanded Supabase sync models and update flows for scheduled and duration fields.
- Rebuilt Calendar view with day/week grid, all-day lanes, drag reschedule, and drop scheduling.
- Wired Plan and Agenda lists to scheduled items and added schedule row UI.
- Persisted entry/task all-day + recurrence exceptions into Supabase frontmatter and synced per-occurrence overrides.
- Synced habit schedules + metadata (including exceptions) to Supabase and routed calendar habit scheduling through sync when enabled.
- Added RRULE frontmatter encoding + parsing and conflict logging coverage for sync updates.
- Added frontmatter and recurrence exception tests for all-day round-trip, single-occurrence reschedule, and all-day reschedule edge cases.
- Added calendar conflict banner + UI-test seeding and XCUITest drag/reschedule + conflict list coverage.
- Nested recurrence exceptions under `frontmatter.recurrence` with backward-compatible decoding.

## Tests
- Added `ScheduleServiceTests` with happy, failure, and recurrence edge coverage.
- Added `FrontmatterCodecTests` plus new recurrence override cases in `ScheduleServiceTests`.
- Added `SupabaseSyncServiceTests` for conflict logging on pending operations.
- Added XCUITest coverage for drag/reschedule and conflict list banner navigation.
- Not run (not requested).

## Code Review Reflection
- Regressions to watch: Frontmatter merge only adds recurrence fields; clearing recurrence may leave stale data until explicitly wiped.
- Concurrency risks: Drag/drop override updates can race with realtime sync; ensure exception merges remain idempotent.
- Data integrity risks: RRULE parsing is minimal (freq/interval only); additional RRULE parts are ignored and could be lost on round-trip.
- Security/privacy risks: No new sensitive data flows introduced.
- Missing tests: Offline queue retries for exception updates and Supabase conflict resolution for frontmatter merges.
- Missing tests: UI coverage for all-day chip drag/drop (only timed blocks covered).

## Open Questions
- Should we add explicit clearing semantics for recurrence frontmatter (e.g., nulling `recurrence` / `recurrenceExceptions`)?
- Do we need a canonical time zone for recurrence exception keys to avoid DST drift?
- Should schedule overrides include cancellation markers in the UI and sync model?
