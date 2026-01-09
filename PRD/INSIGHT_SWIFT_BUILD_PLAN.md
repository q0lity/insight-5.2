# Insight Swift Build Outline + PRD

## Outline (How We Will Build The Full App)
1. Project foundation
   - SwiftUI app shell with iPhone tab bar + iPad split layout.
   - Swift Package workspace structure (app shell + feature package).
   - App-wide theme, typography, and assets imported from `apps/mobile2/assets`.
2. Shared core + models
   - Mirror `packages/shared/src/models.ts` into Swift models.
   - Maintain JSON snapshot tests to keep parity with desktop outputs.
3. Parser parity
   - Phase 1: JS parser bridge via JavaScriptCore (same outputs as desktop).
   - Phase 2: Swift port with parity tests against JS outputs.
4. Data layer + offline sync
   - Local persistence (Core Data or GRDB).
   - Sync queue + conflict logging.
   - Supabase as source of truth.
5. Auth + user profile
   - Supabase auth (email + Apple + OAuth as required).
   - Profile + preferences (AI parsing, units, calendar settings).
6. Capture + voice
   - AVAudioSession + recorder + file upload.
   - Supabase Edge function: `transcribe_and_parse_capture`.
   - Review cards + save to entries/logs.
7. Calendar + planning
   - Day/Week/Month views, log lane, drag/drop timeboxes.
   - All-day row, segment markers, details panel parity.
8. Core feature views (parity)
   - Dashboard/Life Tracker, Tasks (table + Kanban), Notes, Habits, Goals/Projects, Trackers.
   - Health (Workouts/Nutrition), Reports, Timeline, Assistant, Focus, Reflections, Ecosystem.
9. Integrations
   - Google/Microsoft calendar sync via Supabase functions.
   - iOS Calendar integration (EventKit).
   - HealthKit read/write (as per desktop feature parity).
   - Notifications + Live Activities (recording action button, running timer).
10. QA + release readiness
    - Parser parity tests, UI snapshots, integration tests.
    - Performance checks, sync reliability, crash analytics.

## PRD (Build Plan)

### 1) Product Summary
Insight Swift is the native iOS/iPadOS app for Insight 5. It must match desktop features, parsing behavior, and data semantics while delivering a mobile-first UX and full system integrations.

### 2) Goals
- Full parity with desktop features and flows.
- Same parsing engine behavior and outputs as desktop.
- Voice-first capture with reliable review and save.
- Full integrations for v1: calendar sync (Google/Microsoft + device), HealthKit, notifications, Live Activities.
- Stable offline capture with sync on reconnect.

### 3) Non-Goals
- watchOS/macOS.
- Multi-user collaboration.
- Offline LLM parsing.

### 4) Platforms + Target
- iOS 17+ and iPadOS 17+.
- SwiftUI-first with UIKit where needed (calendar grids, drag/drop, dense lists).
- App location: `apps/insight_swift`.

### 5) Parity Scope (Desktop -> Swift)
Must match these desktop views and flows:
- Dashboard / Life Tracker
- Calendar: day/week/month + all-day row + log lane
- Planner / Agenda
- Timeline
- Notes (inbox + markdown)
- Tasks (table + Kanban + TickTick)
- Habits (definitions + heatmaps)
- Goals + Projects
- Rewards / XP
- People, Places, Tags
- Trackers + logs
- Health: workouts + nutrition
- Reports / Analytics
- Assistant
- Focus
- Capture + Voice
- Settings
- Ecosystem + Reflections

### 6) Parsing Strategy
- JS bridge with JavaScriptCore for full parity first.
- Shared test vectors for text -> JSON outputs.
- Swift port in parallel with automated parity tests.
- Server-side parsing (Supabase Edge) as fallback when needed.

### 7) Data + Sync
- Local store for offline capture + edits.
- Sync queue with retry/backoff.
- Conflict policy: last-write-wins + conflict log for review.
- Supabase Postgres as canonical source of truth.

### 8) Integrations
- Supabase auth + storage.
- Edge functions for transcription + parsing.
- Google/Microsoft calendar sync via existing functions.
- EventKit sync for device calendar.
- HealthKit ingestion + export where applicable.
- Notifications: local + push.
- Live Activities: running timer + action button to start recording.

### 9) Live Activities
- Shows active timebox or recording duration.
- Action button starts recording and opens app.
- App consumes trigger via app group shared state.

### 10) UI/UX
- Reuse assets from `apps/mobile2/assets`.
- Typography + layout parity with mobile2 + desktop patterns.
- iPad split layout mirroring desktop density.

### 11) Architecture
- App shell target loads feature package.
- Feature package contains UI, services, data models.
- Dependency injection via SwiftUI `@Environment` and `@Observable` services.

### 12) Milestones
1. Foundation: navigation, design system, Supabase client, local store.
2. Parity core: Capture + Calendar + Dashboard + Tasks + Notes + Habits.
3. Integrations: HealthKit + calendar sync + notifications + Live Activities.
4. Full parity: Reports + Assistant + Timeline + Reflections + Ecosystem.
5. QA + polish: performance, stability, onboarding, release prep.

### 13) QA / Testing
- Parser parity test suite (JS vs Swift).
- Snapshot tests for calendar, timeline, kanban.
- Integration tests for sync + voice capture pipeline.

### 14) Risks + Mitigations
- Parser drift: enforce parity tests before merges.
- Calendar complexity: reuse desktop logic + staged rollouts.
- Live Activity + AppIntents edge cases: app-group triggers + app open fallback.
- Sync conflicts: explicit conflict logging and review UI.
