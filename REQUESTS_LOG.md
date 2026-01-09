# Insight 5 Requests Log

## 2026-01-08
- Enabled editable metadata (tags/people/contexts) for tasks, habits, and notes with persistence updates.
- Added recurrence-safe editing for tasks/habits (apply-to-series toggle plus single-occurrence exceptions).
- Added empty-state CTAs for Tasks/Habits/Notes lists and guarded all-day items from time edits.
- Updated task ordering rules (due date then status; backlog sorted by title) with tests.

## 2025-12-23
- Set up Whisper transcription via secure proxy; recording pipeline should enrich event + journal with raw, timestamped, and structured notes.
- Install Playwright MCP for UI validation.
- Maintain running change log of every code update and a running list of requested features/plan changes.
- Task sidebar: allow creating new goals/projects/categories/subcategories from inputs and infer them when missing.
- Tracker sidebar: make tracker/shortcut sections draggable/reorderable (with handle).
- Daily view: enlarge right sidebar only for daily mode (keep week width as-is).
- Week view: Enter key should create new event; avoid random size changes on events.
- Magic button: context-aware recording + auto-fill parameters for the current event/session.
- Tags: multi-select chips (not dropdown); tag presses add/remove.
- Trackers: remove sleep/workout from default trackers; keep mood/energy/stress/pain; support multi-day trackers and all-day tracker events.
- All-day events: draggable across top row, including tracker-style all-day logs.
- Improve activity icons (current ones look janky).
- Bug hunt the long narrative capture use case (example provided) so parsing works end-to-end.

### Confirmed parsing rules (2025-12-23)
- Every event must have category + subcategory; event title follows category/subcategory format.
- Third-level details (e.g., Bosphorus) live in `location` and also appear in title; settings should toggle title detail level.
- Sub-activities within a larger span (e.g., YouTube during drive) become segments inside the parent event, not standalone events.
- Work block: sub-segments inherit category=Work unless explicitly overridden.
- Log multiple tracker entries when multiple moods are mentioned.
- Birthday is always an all-day event.
- Infer Work when activities are clinical/meeting-like even if not explicitly stated.
- Segment labels should be normalized (not verbatim).
- Tags and categories should build iteratively from the index (self-expanding taxonomy).
- Show parent events and segments together in the daily timeline.

## 2026-01-07 (Agent H - Timeline + Views + Assistant)
- Implemented unified timeline feed showing all data types: entries, tasks, notes, habits, trackers, workouts, nutrition
- Added `TimelineItem` model with factory methods and `TimelineOrderingService` for building/filtering/sorting
- Created `TimelineView` with filter chips (by type) and `TimelineFilterSheet` for tags/people/contexts/date filtering
- Added Timeline as 6th tab in app navigation
- Implemented Saved Views with FilterNode tree structure (supports `tracker:<key>` property syntax)
- Created `SavedViewQueryService` for JSON parsing and query evaluation
- Built `SavedViewsListView` and `SavedViewBuilderView` with live query preview
- Extended AssistantView with Local/LLM mode toggle (Local is default, privacy-first)
- Created `LocalSearchService` for on-device search with polymorphic `SearchResult` enum
- Extended Entry model with full DB parity fields: status, priority, scheduledAt, dueAt, importance, difficulty, xp, etc.
- Added savedViews to AppStore with CRUD methods and LocalPersistenceService snapshot
- Added 30 Swift Testing tests for TimelineOrderingService, SavedViewQueryService, LocalSearchService

## 2026-01-06
- Build a native SwiftUI app (`apps/insight_swift`) with full desktop parity, iOS 17+ and iPadOS 17+ support.
- Use `apps/mobile2` as design reference and assets source.
- Use the same parsing engine behavior: embed the existing TypeScript parser via JavaScriptCore and port to Swift for native parity.
- Integrate Supabase (same project) and all v1 integrations: calendar sync (Google/Microsoft + device), HealthKit, notifications, Live Activities.
- Live Activities must show running time and include an action button that starts recording.
- Create a Swift app PRD and keep logs updated for every change.
- Scaffolded the SwiftUI project at `apps/insight_swift` (InsightSwift workspace).
- Added base SwiftUI tab shell and Supabase client wiring for the Swift app.
- Added Live Activity widget extension with a Record action button and shared app-group trigger wiring.
- Added a full build outline + PRD for the Swift app implementation plan.
- Wired AVAudioSession + AVAudioRecorder into RecordingCoordinator and enabled Live Activity entitlements.
- Fixed Live Activity widget buildable-folder exception to avoid Info.plist being copied as a resource.
- Updated bundle IDs and App Group to remove underscore for provisioning compatibility.
- Removed invalid activity-tracking entitlements to fix signing errors.
- Expanded the Swift app UI to include Habits + Plan tabs, a floating capture action button, and a full More grid of feature screens.
- Added themed SwiftUI components and a multi-palette theme system inspired by mobile2.
- Implemented agenda, kanban, ticktick, focus, assistant, explore, health, timeline, reflections, and settings screens with functional in-app state.
- Ported the TypeScript markdown parser to Swift and embedded the JS parser via JavaScriptCore with a toggleable engine.
- Wired capture flow to parse and apply tasks, trackers, tags, people, places, and entries from captures.
- Added Supabase auth + sync services and wired Settings to sign in, sign up, sign out, and toggle sync.
- Connected core create/log flows (capture, tasks, habits, goals, projects, trackers, entities, notes) to Supabase-backed persistence when sync is enabled.
- Live Activity action button now toggles recording start/stop via AppIntent triggers, and RecordingCoordinator consumes both start/stop requests.
- Live Activity state now carries recording status for button labeling, and recording state is persisted to the shared app-group store.
- Re-added Live Activities entitlement for app + widget targets and aligned test bundle identifier with the app's bundle ID.
- Expanded the Swift app PRD with a full scope, requirements, and milestones to guide implementation.

## 2026-01-07
- Calendar parity: add day/week/month skeletons with all-day lane and date navigation.
- Agenda and Plan lists ordered by time/status for parity wiring.
- Tasks/Habits/Notes views gained overview scaffolds for upcoming parity wiring.
- Added Swift Testing coverage for calendar ordering helpers.

## 2026-01-07
- Aligned the Swift/JS markdown capture parser rules with the desktop schema (line splitting, token regexes, task detection, tracker handling) and added deterministic timestamps for parity checks.
- Added capture parser test vectors (input -> JSON) and Swift tests to validate JS/SWIFT parity, including long-form frontmatter and divider edge cases.
- Added failure-path parser coverage for invalid segment headers.
- Implemented a capture pipeline state machine with review cards, offline pending storage, and a commit path for accepted items.
- Added capture review UI (swipe accept/reject, inline edits, apply all) plus pending recovery controls.
- Added tests for tracker string values, clamp bounds, and offline pending recovery.
- Added edge-function transcription support with network reachability monitoring and pending replay on reconnect.
- Added capture error/retry UI with timeouts, pending reasons, and new QA tests for happy/failure/timeout flows.
- Added SwiftData-backed local persistence, offline queueing for sync operations, and realtime listeners wired to auth/sync state with persistence-aware conflict logging.
- Implemented offline queue update/delete handling, added conflict logging tests, and mirrored Entry allDay into Supabase frontmatter while reading it back into local entries.

## 2026-01-07
- Implemented scheduling data (all-day flag, scheduledAt, duration, recurrence) plus schedule service for day/week ranges.
- Built day/week calendar grid with all-day lane, drag-to-reschedule, and drop scheduling from unscheduled tasks/habits.
- Wired Plan and Agenda lists to scheduled items and added schedule row components.
- Expanded Supabase sync models and updates to carry scheduled and duration fields.
- Added ScheduleService tests for happy, failure, and recurrence edge cases.

## 2026-01-07
- Persisted entry/task all-day + recurrence fields (including exception overrides) into Supabase frontmatter.
- Added habit schedule + metadata sync and wired calendar habit scheduling to Supabase updates.
- Added frontmatter and recurrence exception tests (all-day round-trip, reschedule override, exception-in-range edge case).
- Stored recurrence as RRULE in frontmatter, added conflict logging coverage, and expanded all-day reschedule tests.
- Added calendar conflict banner for UI coverage and XCUITest drag/reschedule + conflict list coverage.
- Moved recurrence exceptions into `frontmatter.recurrence.exceptions` with backward-compatible decoding.

### Calendar Sync Implementation (Agent E)
- Implemented Google/Microsoft calendar sync via existing Supabase edge functions (`google_calendar_sync`, `microsoft_calendar_sync`).
- Added EventKit device calendar mapping with full parity-plus fields (location, URL, attendees, RRULE recurrence).
- Implemented 60-second conflict window detection (matches edge function logic).
- Import ALL device events with `source="calendar"` marker for read-only treatment.
- Store event links in `external_event_links` for tracking synced events across providers.
- Added sync conflict banner UI for user notification when conflicts are detected.
- Test coverage includes happy path (Entry ↔ EKEvent mapping), failure path (authorization denial), and edge cases (conflict detection, all-day events, RRULE parsing).

## 2026-01-07
- Calendar/Plan now rely on explicit all-day flags and support single-occurrence overrides when moving recurring items.
- Tasks/Habits/Notes now include detail screens with edit/save/delete wiring and list navigation.
- Added AppStore CRUD tests plus Calendar/Plan render tests for view coverage.
- Added iPad split-view navigation alongside iPhone tabs with unified tab metadata and capture overlay.
- Expanded Swift theme tokens to mirror `apps/mobile2` display sizes and applied to base components (metric tiles, chips).
- Hardened offline queue flush testing (update/delete, failure attempt counts, ID remap) and verified conflict payload logging.
- Implemented Appendix-C underbar actions, context panel, and iPad sidebar quick actions with wired Capture/Search/Focus and context toggle.
- Wired context panel to live focus/goal/project data and pending review count; added accessibility identifiers and shell render smoke tests.

### HealthKit Integration (Agent F)
- Implemented HealthKit workout and nutrition ingestion for Insight Swift.
- Added `HealthKitModels.swift` with `WorkoutSession`, `WorkoutRow`, `NutritionLog` structs aligned to Supabase schema.
- Extended `HealthKitService.swift` with workout/nutrition fetch methods, activity type mapping, and meal grouping by time windows.
- Replaced legacy `Workout` and `Meal` models from `CoreModels.swift` with schema-aligned structs.
- Updated `AppStore.swift` with CRUD operations for workouts and nutrition, including HealthKit sync result application.
- Added `workoutSession`, `workoutRow`, `nutritionLog` to `SyncEntityType` (local-only for v1).
- Updated `LocalPersistenceService.swift` snapshot to persist new workout/nutrition arrays.
- Added HealthKit toggle + sync button to HealthView UI with authorization status and last sync display.
- Updated WorkoutsView to display sessions with linked Entry data (title, duration, template).
- Updated NutritionView to display logs with macro breakdown (P/C/F).
- Test coverage includes: activity type mapping (happy/failure/edge), meal time windows, nutrition grouping, duplicate detection via frontmatter.

### Notifications + Live Activities + Background Audio (Agent G)

**Phase 1 - Infrastructure:**
- Enabled `UIBackgroundModes = audio` in Shared.xcconfig for background recording.
- Created `NotificationCenterClient` protocol for testable notification service.
- Enhanced `NotificationService` with categories (habitReminder, taskReminder, general), actions (markComplete, snooze), and snooze presets (5m, 10m, 30m, 1h).
- Added time-sensitive habit reminders via `interruptionLevel = .timeSensitive`.
- Added recurring notification support with weekday filtering.
- Extended `InsightLiveActivityAttributes.ContentState` with `activityType` (recording, focus, pomodoro) and `targetDuration` for countdown display.
- Extended `LiveActivityManager` with `startFocusActivity` and `startPomodoroActivity` methods.
- Wired `AppStore` focus session lifecycle to LiveActivityManager (start/stop focus triggers Live Activity).
- Updated Widget UI to show different icons/colors per activity type and countdown timer when targetDuration is set.
- Test coverage: notification scheduling (happy/failure/edge), Live Activity state mapping (3 tests).
- Fixed pre-existing codebase issues: Package.swift argument order, duplicate RecurrenceException types, missing public/Sendable conformances.

**Phase 2 - Notification Wiring & UX:**
- Created `AppDelegate.swift` with `UNUserNotificationCenterDelegate` conformance for handling notification action responses.
- Wired `@UIApplicationDelegateAdaptor` in InsightSwiftApp.swift with service injection to AppDelegate.
- Implemented Mark Complete action: tapping MARK_COMPLETE on habit reminder creates HabitLog via `appStore.logHabit()`.
- Implemented Snooze action: tapping SNOOZE reschedules notification with user's snooze preference delay.
- Added `snoozeNotification(identifier:)` convenience method that extracts content from pending request.
- Added `cancelAllHabitReminders()` to remove all habit-prefixed notifications.
- Added `displayName` alias to `SnoozeOption` for settings UI.
- Added `attachNotificationService()` and `syncHabitReminders()` to AppStore for habit-notification wiring.
- Wired habit CRUD methods (addHabit, updateHabit, deleteHabit, scheduleHabit) to automatically sync reminders.
- Added Notifications settings section in SettingsView: enable toggle, snooze preference picker, authorization status display.
- Test coverage: 4 new tests (displayName alias, cancelAllHabitReminders, snooze by identifier, snooze preserves userInfo).

**Phase 3 - Push Notification Pipeline:**
- Created `device_tokens` Supabase migration (`003_device_tokens.sql`) with RLS policies and auto-update trigger.
- Added `SupabaseDeviceTokenRow`, `SupabaseDeviceTokenInsert`, `SupabaseDeviceTokenUpdate` models to SupabaseModels.swift.
- Added `SendPushNotificationRequest` and `SendPushNotificationResponse` models for edge function communication.
- Extended `SupabaseSyncService` with `registerDeviceToken()`, `removeDeviceToken()`, `removeAllDeviceTokens()`, and `sendPushNotification()` methods.
- Extended `AppDelegate.swift` with `didRegisterForRemoteNotificationsWithDeviceToken` and `didFailToRegisterForRemoteNotificationsWithError`.
- Added `uploadDeviceTokenIfAuthenticated()` and `removeDeviceTokensOnSignOut()` helper methods to AppDelegate.
- Wired `syncService` to AppDelegate in InsightSwiftApp.swift for token registration.
- Created `send_push_notification` edge function with APNs JWT generation, payload building, and device token cleanup.
- Edge function uses ES256 signing with p8 key, supports time-sensitive interruption level for habit reminders.
- Test coverage: 5 new tests (device token hex conversion, insert encoding, request encoding, response decoding, row decoding).

## 2026-01-07
- Added metadata cards with tags/people/contexts to task, habit, and note detail views.
- Added CRUD tests for tasks, habits, and notes plus empty-state view render coverage and all-day calendar render edge case.

## 2026-01-07
- Added recurrence summary sections to task, habit, and note detail views.

### Calendar Sync Phase 2 (Agent E - OAuth, UI, Background Sync)
- Created `OAuthWebAuthService` with ASWebAuthenticationSession for Google/Microsoft OAuth flows.
- OAuth redirect scheme `insightswift://oauth-callback` registered in Info.plist.
- Created `CalendarConnectView` with OAuth connect buttons for Google, Microsoft, and device calendars.
- Shows connected account email, expiration status, and disconnect option per provider.
- Created `CalendarSelectionView` for choosing which calendars to sync (grouped by provider).
- Calendar selection persisted to UserDefaults with enable all/disable all actions.
- Created `ConflictResolutionView` with side-by-side diff showing local vs provider versions.
- Resolution options: Keep App, Keep Provider, Merge Notes (combines both).
- Created `BackgroundSyncScheduler` using BGTaskScheduler for background calendar sync.
- Registered BGProcessingTask (`com.insightswift.calendar-sync`) and BGAppRefreshTask (`com.insightswift.refresh`).
- 15-minute minimum sync interval, 1-month sync window in each direction.
- Extended `ExternalCalendarSyncService` with Phase 2 methods: `fetchCalendars`, `updateCalendarSelection`, `enableBackgroundSync`, `disableBackgroundSync`, conflict management.
- Updated Info.plist with URL schemes, BGTaskSchedulerPermittedIdentifiers, and background modes (audio, fetch, processing).
- Wired AppDelegate to register background tasks at launch and schedule on app lifecycle events.
- Added CalendarSyncPhase2Tests with 25+ tests covering OAuth URL construction, code extraction, error handling, conflict resolution, background task identifiers, and calendar selection.

## 2026-01-07
- Added recurrence editors (rule + exceptions) for tasks and habits, and wired save to persist recurrence changes.
- Updated Swift package platforms to include macOS 14 for test builds.

### HealthKit Phase 2 (Agent F - Detail Views + Sync Polish)
- Created `WorkoutDetailView.swift` with editable workout details, template picker, and workout rows table.
- Created `NutritionDetailView.swift` with editable macros (P/C/F), confidence slider, source picker, and showOnCalendar toggle.
- Added NavigationLinks in MoreScreens.swift (WorkoutsView/NutritionView) to detail views.
- Added `showOnCalendar` field to NutritionLog model (controls Entry facet: .event vs .note).
- Updated Entry facets for workouts: `[.event, .habit]` so workouts count toward habit streaks.
- Added HKObserverQuery background sync to HealthKitService for automatic workout/nutrition updates.
- Added Supabase row models: SupabaseWorkoutSessionRow/Insert/Update, SupabaseWorkoutRowRow/Insert/Update, SupabaseNutritionLogRow/Insert/Update.
- Implemented full Supabase sync operations for workout_sessions, workout_rows, nutrition_logs tables.
- Added realtime listeners for workout/nutrition tables in SupabaseSyncService.startRealtime().
- Added data loading for workout/nutrition in SupabaseSyncService.loadAll().
- Added CRUD methods: createWorkoutSession, updateWorkoutSession, deleteWorkoutSession, createWorkoutRow, deleteWorkoutRow, createNutritionLog, updateNutritionLog, deleteNutritionLog.
