# Insight Swift Agent D Report (2026-01-07)

## Scope Delivered
- Calendar parity scaffolds: day/week/month skeletons with all-day lane + date navigation.
- Plan/Agenda ordering for schedule + tasks using shared helpers.
- Tasks/Habits/Notes overview scaffolds for parity wiring.
- Swift Testing coverage for calendar ordering helpers (happy/failure/edge).

## Changes
- Added calendar data helpers and month range support for ordering and grid generation.
- Expanded Calendar view with day/week/month modes, all-day lane, and month grid cells.
- Ordered Agenda and Plan lists via shared ordering utilities.
- Added overview cards to Tasks/Habits/Notes for parity wiring.
- Added CalendarSupport Swift tests.

## Tests
- Not run (local test execution not requested).

## Code Review Reflection
- Regressions to watch: all-day detection is heuristic; long multi-day events may be misclassified until explicit flags land.
- Concurrency risks: none added; helpers are pure functions and UI updates stay on main.
- Data integrity risks: ordering uses due dates; nil due dates fall to backlog and distant future ordering.
- Security/privacy risks: none (no new data sinks).
- Missing tests: view rendering not exercised; only helper logic is covered.

## Open Questions
- Should all-day be a first-class flag on Entry instead of a heuristic before deeper calendar work?
- For Plan ordering, prefer status-first or due-date-first (current: due date then status)?

## Follow-up Update
- Explicit all-day handling and recurrence overrides for calendar/plan logic.
- Task, habit, and note detail views now support edit/save/delete and list navigation.
- Added AppStore CRUD tests plus Calendar/Plan view render coverage.
- Cleaned Supabase habit scheduling update flow.

## Tests Added
- `AppStoreCrudTests` (task update happy, missing ID failure, habit duration clamp edge).
- `CalendarAgendaViewTests` (CalendarView + PlanView render via ImageRenderer).

## Code Review Reflection (Update)
- Regressions to watch: editing flows depend on environment-provided sync service; missing env injection will crash view rendering.
- Concurrency risks: none added; mutations remain on main actor via AppStore.
- Data integrity risks: habit duration clamping only occurs when duration is provided; unset durations retain prior values.
- Security/privacy risks: none added; no new data sinks.
- Missing tests: no snapshot baselines yet; render tests only assert non-nil images.

## Open Questions (Update)
- Should task/habit detail views surface recurrence rules and exception history in v1?

## Follow-up Update 2
- Added metadata cards (tags/people/contexts) to task, habit, and note detail views.
- Expanded CRUD tests to cover tasks, habits, and notes; added empty-state render tests and all-day calendar render edge case.

## Tests Added (Update 2)
- `AppStoreCrudTests` now covers task/habit/note CRUD.
- `CalendarAgendaViewTests` now covers empty state renders and all-day calendar edge case.

## Code Review Reflection (Update 2)
- Regressions to watch: metadata sections render empty states with no tags/people/contexts; ensure future data wiring populates these arrays.
- Concurrency risks: none added; render tests remain main-actor only.
- Data integrity risks: note metadata relies on matching entry IDs; notes created without entries will show empty metadata.
- Security/privacy risks: none.
- Missing tests: no snapshot baselines, only render non-nil images.

## Open Questions (Update 2)
- Should task and habit models be extended to persist people/contexts to avoid empty metadata panels?

## Follow-up Update 3
- Added recurrence summary sections for tasks, habits, and notes in detail views.

## Code Review Reflection (Update 3)
- Regressions to watch: recurrence summaries show "None" when recurrence data is absent; ensure future recurrence editors update these values.
- Concurrency risks: none added.
- Data integrity risks: note recurrence data depends on a matching entry; notes without entries will always show "None".
- Security/privacy risks: none.

## Open Questions (Update 3)
- Should notes created offline also insert a matching entry to enable recurrence + tag metadata parity?

## Follow-up Update 4
- Added recurrence editors (rule + exceptions) to task and habit detail views.
- Updated AppStore and SupabaseSyncService to persist recurrence updates.
- Updated package platforms to include macOS 14 for SwiftPM tests.

## Tests Run (Update 4)
- `swift test` (failed): macOS build errors due to iOS-only APIs (ActivityKit/BackgroundTasks, navigationBar toolbar), plus unrelated compile issues in existing files.

## Code Review Reflection (Update 4)
- Regressions to watch: recurrence exceptions are edited in-memory until Save; closing without Save discards changes.
- Concurrency risks: none added; recurrence edits remain on main actor.
- Data integrity risks: recurrence exceptions rely on minute-level keys; edits to near-identical times will overwrite.
- Security/privacy risks: none.

## Open Questions (Update 4)
- Do we want to guard iOS-only files with `#if os(iOS)` so SwiftPM tests can run on macOS, or keep tests iOS-only via Xcode?

## Follow-up Update 5
- Attempted iOS simulator tests via xcodebuild; scheme InsightSwiftFeature lacks a test action, and InsightSwift scheme failed with duplicate Info.plist build phase output.

## Tests Run (Update 5)
- `xcodebuild test -workspace InsightSwift.xcworkspace -scheme InsightSwiftFeature` (failed: scheme not configured for tests).
- `xcodebuild test -workspace InsightSwift.xcworkspace -scheme InsightSwift -destination platform=iOS Simulator,id=3E8571FC-E134-4EEC-98CD-5C0434204DD9` (failed: duplicate Info.plist output in target build phases).

## Open Questions (Update 5)
- Is it acceptable to remove `InsightSwift/Info.plist` from the Copy Bundle Resources phase to unblock test runs, or should tests remain Xcode-only for now?
