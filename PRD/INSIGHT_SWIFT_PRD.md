# Insight Swift PRD (iOS + iPad)

## Document Control
- Product: Insight Swift (Insight 5 native app)
- Platforms: iOS 17+, iPadOS 17+
- Repo: `apps/insight_swift`
- UI: SwiftUI-first, UIKit only when required
- Backend: Supabase (same project as desktop)
- Status: Draft v0.2
- Source of truth: Desktop app behavior and shared schema
- References:
  - `PRD/MASTER_PRD_V3.md`
  - `PRD/WEB_TO_MOBILE_PARITY_MATRIX.md`
  - `PRD/CAPTURE_PIPELINE_SPEC.md`
  - `apps/desktop` (behavior reference)
  - `apps/mobile2` (design reference)

## Product Summary
Build a full-featured native SwiftUI app that matches desktop behavior and data semantics. Capture is the primary entry point. The mobile app must be reliable offline, sync safely, and integrate with device services (calendar, HealthKit, notifications, Live Activities).

## Goals (v1)
- Full functional parity with the desktop app across core views and flows.
- Parser parity with desktop for capture, tasks, trackers, people, places, and tags.
- Voice-first capture with reliable audio handling and Live Activity timer.
- Robust data persistence and sync (offline-safe with conflict handling).
- Full v1 integrations: calendar sync (Google/Microsoft + device), HealthKit, notifications, Live Activities.
- Visual direction aligned with `apps/mobile2`.

## Non-Goals (v1)
- watchOS or macOS targets.
- Multi-user collaboration and shared workspaces.
- Offline LLM parsing (offline capture only; parse when online or locally).
- Advanced 3rd-party food databases.

## Personas
- Power user: daily planning, heavy capture volume, uses trackers, goals, and habits.
- Busy professional: time-blocking, calendar sync, quick capture, reminders.
- Wellness-focused: workouts, HealthKit import, trackers, reflections.

## Success Metrics
- Parity score >= 85% (weighted by core workflows).
- Capture to saved entity latency < 1s for local parse, < 5s for network parse.
- Audio recording success rate >= 98% (no loss on lock, call, or background).
- Sync reliability: < 1% conflict rate with recoverable resolution.

## Scope (v1)
### Core Screens
1. Dashboard / Life Tracker
2. Calendar (day/week/month, all-day row, log lane)
3. Plan / Agenda (timebox, drag/drop)
4. Timeline view
5. Capture + Voice
6. Tasks (table + kanban)
7. Habits (definitions, streaks, heatmaps)
8. Goals + Projects
9. Notes (inbox, markdown viewer, linking)
10. Trackers (definitions + logs)
11. People / Places / Tags
12. Focus timer
13. Reports / Analytics
14. Assistant (search + chat)
15. Rewards / XP
16. Settings
17. Ecosystem + Reflections

### Core Flows
- Capture -> parse -> review -> persist -> sync
- Timebox planning -> schedule -> update calendar
- Task creation -> status updates -> project/goal rollups
- Habit logging -> streaks -> heatmaps
- Tracker logging -> analytics
- Voice capture -> audio file -> transcription -> parse

## Functional Requirements
### Capture + Parsing
- Capture accepts text, tags, trackers, people, places, intents.
- Parser outputs must match desktop outputs (field names and semantics).
- JS parser embedded via JavaScriptCore is the baseline.
- Swift parser must achieve parity with JS results and tests.
- Maintain test vectors (input text -> JSON output) for parity verification.

### Recording + Voice
- AVAudioSession configured for record with Bluetooth support.
- Recording works from capture screen and Live Activity action button.
- Recordings are stored locally with stable file naming.
- Support background audio mode when enabled and permitted.
- Transcription pipeline: local file -> edge function -> parse -> persist.

### Live Activities
- Live Activity shows running time of active recording or session.
- Action button toggles start/stop and opens the app to capture.
- State reflects recording status.

### Tasks, Habits, Goals, Projects
- CRUD for tasks, habits, goals, projects.
- Status updates, due dates, scheduling, and recurring tasks/habits.
- Project and goal rollups (counts, progress).

### Calendar + Plan + Timeline
- Day/week/month views with all-day lane.
- Drag/drop time blocks and reschedule tasks/habits/events.
- Agenda list with time ordering.
- Recurrence rules for events and time blocks.

### Trackers + Analytics
- Tracker definitions and logs.
- Heatmap views (daily/weekly/monthly).
- Aggregated insights per tracker (trend, averages).

### Notes + Journal
- Notes inbox and markdown viewer.
- Daily logs and backlinks to tasks/events.

### Assistant
- Search across entities.
- Prompted actions (create tasks, schedule, summarize).

### Settings
- Account/auth, sync toggle, parser engine toggle.
- Calendar/Health permissions.
- Notification settings.

## Data and Sync
- Local persistence with SwiftData for all core entities.
- Supabase as canonical source of truth.
- Sync pipeline:
  - Offline queue with retry.
  - `updated_at` and `deleted_at` reconciliation.
  - Conflict logging with last-write-wins default.
  - Optional per-entity merge rules.
- Realtime updates: subscribe to inserts/updates/deletes per table.

## Integrations (v1 required)
- Supabase Auth + Edge Functions.
- Google Calendar sync (2-way) via existing edge functions.
- Microsoft Calendar sync (2-way) via existing edge functions.
- EventKit device calendar integration.
- HealthKit workouts and nutrition capture.
- Local + remote notifications.

## UX + Design
- Visual system based on `apps/mobile2` assets and layout patterns.
- iPhone: tabbed navigation; iPad: split and multi-column navigation.
- Accessibility: Dynamic Type and VoiceOver for all core screens.

## Security + Privacy
- Never log sensitive data.
- Use Keychain for auth tokens.
- Minimal permissions requested.
- Clear disclosure for microphone and HealthKit usage.

## Parity Tracking
- Maintain `PRD/WEB_TO_MOBILE_PARITY_MATRIX.md` with status per feature.
- Each feature has acceptance criteria and parity tests.

## Release Criteria (v1)
- All v1 integrations functional on device.
- Core screens at parity threshold (>= 85% weighted).
- No data loss across offline/online transitions.
- Recording + Live Activity validated on device.

## Risks and Mitigations
- Parser drift vs desktop: maintain test vectors and CI parity checks.
- Sync conflicts: track and surface conflict logs.
- Calendar sync complexity: start with read-only, then 2-way.
- Background audio constraints: require explicit user enablement.

## Milestones
1) Foundation
- App shell, theme, navigation, auth, local persistence
2) Core Parity
- Capture, tasks, habits, notes, calendar, plan, timeline
3) Integrations
- Calendar sync, HealthKit, notifications, Live Activities, background audio
4) Final Parity
- Reports, assistant, analytics, ecosystem, performance, polish

## Definition of Done (per feature)
- UI implemented and functional on iPhone and iPad.
- Data persists locally and syncs with Supabase.
- Parity tests pass (where applicable).
- Logged in `REQUESTS_LOG.md` and `MASTER_CHANGELOG.md`.

## Dependencies
- Supabase project schema + RLS policies.
- Desktop parser and schema definitions.
- Design assets from `apps/mobile2`.

## Open Questions
- Priority order for calendar vs tracker analytics.
- Scope of HealthKit data ingestion for v1.
- Exact merge rules for conflicts beyond last-write-wins.
