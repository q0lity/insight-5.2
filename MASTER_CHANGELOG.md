# Insight 5 Master Change Log

## 2026-01-08 11:41:47
- Added editable metadata inputs (tags/people/contexts) for tasks, habits, and notes (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/TaskDetailView.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/HabitDetailView.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/NoteDetailView.swift`).
- Persisted metadata updates through AppStore and Supabase sync paths (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Stores/AppStore.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/SupabaseSyncService.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/HabitScheduleCodec.swift`).
- Added recurrence-safe editing for tasks/habits with apply-to-series toggle and auto single-occurrence exceptions (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/TaskDetailView.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/HabitDetailView.swift`).
- Added empty-state CTAs for Tasks/Habits/Notes lists and guarded all-day items from timed edits (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/TasksView.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/HabitsView.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/NotesView.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/CalendarView.swift`).
- Updated task ordering rules for backlog sorting and added habit tags to schedule items (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/CalendarSupport.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/ScheduleService.swift`).
- Expanded CRUD and ordering test coverage for metadata and backlog rules (`apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/AppStoreCrudTests.swift`, `apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/CalendarSupportTests.swift`).

## 2026-01-07 (Agent H - Insight Swift)
- **Timeline Feed**: Added unified timeline view combining entries, tasks, notes, habits, trackers, workouts, nutrition
  - New `TimelineItem` model with factory methods for all data types
  - `TimelineOrderingService` for building, filtering, and sorting timeline
  - `TimelineView` with filter chips and grouped items
  - `TimelineFilterSheet` for tags, people, contexts, date range filtering
  - Added Timeline as 6th tab in app navigation
- **Saved Views**: Implemented query builder with FilterNode tree structure
  - `SavedViewModels` with FilterNode, FilterCondition, FilterGroup, FilterProperty
  - String-backed FilterProperty for `tracker:<key>` support
  - `SavedViewQueryService` for parsing JSON and evaluating queries
  - `SavedViewsListView` with pinned section and CRUD actions
  - `SavedViewBuilderView` with live preview
- **Assistant Enhancement**: Extended AssistantView with Local/LLM mode toggle
  - Local mode (default) uses privacy-first on-device search
  - `LocalSearchService` with polymorphic SearchResult enum
  - SearchResultCard and ConfirmationCard components
- **Entry Model**: Extended with full DB parity fields (status, priority, scheduledAt, dueAt, importance, difficulty, xp, etc.)
- **AppStore**: Added savedViews array and CRUD methods
- **Tests**: Added 30 Swift Testing tests for all new services

## 2025-12-23 15:55:55
- Created this master change log (per request).
- Registered MCP servers via `codex mcp add` (runtime config, no repo code change).

## 2025-12-23 15:58:14
- Refined dashboard visuals: card gradients, shadows, hover lifts, and improved controls (`Insight 5/apps/desktop/src/App.css`).
- Polished notes UI: hover/active states, focus rings, and card elevation (`Insight 5/apps/desktop/src/App.css`).

## 2025-12-23 16:01:40
- Added Framer Motion list animations to notes items (`Insight 5/apps/desktop/src/workspace/views/notes.tsx`).
- Added Framer Motion entrance/layout animation to calendar events (`Insight 5/apps/desktop/src/workspace/views/agenda.tsx`).

## 2025-12-23 19:57:33
- Switched global font stack to Aptos-first (`Insight 5/apps/desktop/src/index.css`).
- Added Playwright MCP registration via `codex mcp add playwright` (runtime config).
- Added running feature/request log (`Insight 5/REQUESTS_LOG.md`).

## 2025-12-23 20:29:57
- Logged confirmed parsing rules and edge-case decisions (`Insight 5/REQUESTS_LOG.md`).

## 2025-12-23 20:32:17
- Logged additional parsing rules (Work inference, normalized segments, self-expanding taxonomy, show parent + segments) in `Insight 5/REQUESTS_LOG.md`.

## 2025-12-23 23:43:00
- Installed Tailwind v4 PostCSS bridge `@tailwindcss/postcss` and updated `postcss.config.cjs` to resolve Vite Tailwind plugin error.
- Vite dev server now starts successfully (auto-selected port 5177 on localhost after prior port conflicts).

## 2025-12-24 00:12:40
- Improved local parser timing + segment grouping: added AM/PM sequencing hints, "until" handling, and work-block segment collapse; untimed notes now append as timestamped segments to the last explicit event.
- Added task scheduling intent for timed “make that a task” phrasing and prevented spurious implicit place tag `I`.

## 2025-12-24 01:05:12
- Fixed natural-language phrase splitting regex and raised parser output caps to reduce truncated parsing (`Insight 5/apps/desktop/src/nlp/natural.ts`).
- Prevented time-range equality from rolling forward 12h in parser (`Insight 5/apps/desktop/src/nlp/natural.ts`).
- Added day-mode right panel width toggle via `data-calendar-mode` and CSS variable (`Insight 5/apps/desktop/src/workspace/views/planner.tsx`, `Insight 5/apps/desktop/src/App.css`).
- Ensure calendar view re-opens Details panel and uses CSS variable for right panel width (`Insight 5/apps/desktop/src/App.tsx`).

## 2025-12-24 01:18:42
- Added local-parse result count to capture progress log for debugging (`Insight 5/apps/desktop/src/App.tsx`).
- Added fallback event title handling for long phrases so timed events are not dropped (`Insight 5/apps/desktop/src/nlp/natural.ts`).

## 2025-12-24 01:34:08
- Prevented garbage filtering from dropping timed/imperative phrases and allowed timed phrases to create both events + tasks (`Insight 5/apps/desktop/src/nlp/natural.ts`).
- Added grocery task extraction even inside timed phrases (`Insight 5/apps/desktop/src/nlp/natural.ts`).
- Ensured workout keywords override Work category (gym with coworkers stays Health) and untimed segments anchor to event start (`Insight 5/apps/desktop/src/App.tsx`).

## 2025-12-24 01:51:18
- Added JSON response format option for OpenAI requests so LLM parsing returns structured output (`Insight 5/apps/desktop/src/openai.ts`).
- Relaxed LLM garbage title filtering and increased allowed event/task counts; enforce non-empty output when explicit times exist (`Insight 5/apps/desktop/src/nlp/llm-parse.ts`).

## 2025-12-24 02:07:11
- Removed unsupported `response_format` parameter from Responses API calls to fix OpenAI 400 errors (`Insight 5/apps/desktop/src/openai.ts`).

## 2025-12-24 02:34:52
- Added relative time parsing (“in 20 minutes”) and duration phrases (“for an hour”) for local parser (`Insight 5/apps/desktop/src/nlp/natural.ts`).
- Added creation counters + post-save refresh so parsed events/logs/tasks reliably appear after capture (`Insight 5/apps/desktop/src/App.tsx`).

## 2025-12-24 02:49:31
- Added debug line for first parsed event and auto-navigation to earliest created event so calendar jumps to the correct day (`Insight 5/apps/desktop/src/App.tsx`).

## 2025-12-24 03:08:42
- Disabled local parsing when an OpenAI key is present; LLM empty now surfaces an error instead of falling back (`Insight 5/apps/desktop/src/App.tsx`).
- Tightened LLM prompt to place tracker logs within their time blocks and push notes into timestamped segments (`Insight 5/apps/desktop/src/nlp/llm-parse.ts`).

## 2025-12-24 03:27:16
- Forced JSON-mode parsing to use chat completions (Responses API does not support response_format) (`Insight 5/apps/desktop/src/openai.ts`).
- LLM parse now throws explicit errors when JSON is invalid or empty, with response snippets for debugging (`Insight 5/apps/desktop/src/nlp/llm-parse.ts`).

## 2025-12-24 03:45:11
- Wired assistant mode into capture parsing (LLM-only / hybrid / local) and block save when LLM mode lacks a key (`Insight 5/apps/desktop/src/App.tsx`).

## 2025-12-24 04:06:21
- Added Vite dev proxy for OpenAI requests and routed OpenAI calls through `/openai` to fix browser CORS issues (`Insight 5/apps/desktop/vite.config.ts`, `Insight 5/apps/desktop/src/openai.ts`, `Insight 5/apps/desktop/src/workspace/views/settings.tsx`).

## 2025-12-24 04:22:57
- Fixed capture save crash by moving LLM settings initialization before use (prevents silent no-op on Save) (`Insight 5/apps/desktop/src/App.tsx`).

## 2025-12-25 21:51:48
- Increased LLM parse output budget, tightened prompt to keep outputs compact, and added JSON repair pass when invalid JSON is returned (`Insight 5/apps/desktop/src/nlp/llm-parse.ts`).
- Updated capture progress messaging so LLM failures don’t claim local fallback when disabled (`Insight 5/apps/desktop/src/App.tsx`).

## 2025-12-25 22:03:46
- Auto-run LLM parsing when an OpenAI key is present even if Assistant mode is still Local (prevents silent local-only parsing after port changes) (`Insight 5/apps/desktop/src/App.tsx`).

## 2025-12-25 22:49:19
- Added tracker bubbles + slider context menu on the day log lane, and reduced log lane width to 20% (`Insight 5/apps/desktop/src/workspace/views/tiimo-day.tsx`, `Insight 5/apps/desktop/src/App.css`).
- Added points breakdown + running timer in event details and auto character/importance/difficulty inference from text (`Insight 5/apps/desktop/src/App.tsx`).
- Cleaned people tagging (filters junk fragments) and updated LLM prompt to avoid non-names (`Insight 5/apps/desktop/src/App.tsx`, `Insight 5/apps/desktop/src/nlp/llm-parse.ts`).
- Made Pinned sidebar groups reorderable and Shortcuts collapsible (`Insight 5/apps/desktop/src/App.tsx`, `Insight 5/apps/desktop/src/App.css`).

## 2025-12-25 23:19:45
- Added editable habit metadata (estimate, importance, difficulty) with points preview in Habits view (`Insight 5/apps/desktop/src/workspace/views/habits.tsx`).
- Added bored tracker + habit auto-logging from capture text (`Insight 5/apps/desktop/src/App.tsx`, `Insight 5/apps/desktop/src/ui/event-visual.ts`).
- Added model-safe OpenAI chat request handling for temperature‑unsupported models (`Insight 5/apps/desktop/src/openai.ts`).

## 2025-12-26 00:18:12
- Added trackerKey inference for log events (including token logs) to stabilize tracker icons and log-lane placement (`Insight 5/apps/desktop/src/App.tsx`).
- Clamped log-lane positions so late/early tracker bubbles remain visible within the day view (`Insight 5/apps/desktop/src/workspace/views/tiimo-day.tsx`).
- Avoided JSON response_format and temperature for GPT‑5 models; use Responses API with safe params (`Insight 5/apps/desktop/src/openai.ts`, `Insight 5/apps/desktop/src/nlp/llm-parse.ts`).

## 2025-12-26 00:33:02
- Made day timeline scrollable and increased default zoom for better readability (`Insight 5/apps/desktop/src/workspace/views/tiimo-day.tsx`, `Insight 5/apps/desktop/src/App.css`).
- Increased week/day timeline row heights and widened event cards with multi-line titles/meta in agenda views (`Insight 5/apps/desktop/src/workspace/views/agenda.tsx`, `Insight 5/apps/desktop/src/App.css`).

## 2025-12-26 00:44:18
- Added Magic UI–style magic-card hover glow for day and week event cards without changing behavior (`Insight 5/apps/desktop/src/workspace/views/tiimo-day.tsx`, `Insight 5/apps/desktop/src/workspace/views/agenda.tsx`, `Insight 5/apps/desktop/src/App.css`).

## 2025-12-26 01:32:10
- Added OpenAI chat retry fixes for unsupported params (`temperature`, `response_format`, `max_tokens`) to stabilize GPT‑5 parsing (`Insight 5/apps/desktop/src/openai.ts`).
- Clarified Settings note about Responses API fallback to chat completions (`Insight 5/apps/desktop/src/workspace/views/settings.tsx`).
- Prevented global place leakage into all events/tags by only assigning locations when mentioned in event text (`Insight 5/apps/desktop/src/App.tsx`).
- Coerced LLM tracker-like outputs (mood/energy/stress/pain/etc.) into log entries and added segmented notes fallback for long events (`Insight 5/apps/desktop/src/App.tsx`).
- Added mood/energy/stress log detection from natural language and tightened people cleanup to avoid fragment tags (`Insight 5/apps/desktop/src/App.tsx`).
- Improved importance/difficulty heuristics for workouts, reps, distance, and work keywords (`Insight 5/apps/desktop/src/App.tsx`).

## 2025-12-26 02:03:44
- Magic button now opens capture (attached to the selected event) and a separate Auto-fill action preserves the previous behavior (`Insight 5/apps/desktop/src/App.tsx`).
- Event composer Magic button now starts voice transcription, and the capture voice button uses Magic UI–style pulsing visuals (`Insight 5/apps/desktop/src/App.tsx`, `Insight 5/apps/desktop/src/App.css`).

## 2025-12-26 02:18:22
- Guarded LLM task scheduled/due timestamps against invalid dates to prevent IndexedDB key errors during save (`Insight 5/apps/desktop/src/App.tsx`).

## 2025-12-26 02:38:10
- Sanitized calendar/task records (timestamps + arrays) to prevent IndexedDB key errors and added safe fallback sorting when orderBy fails (`Insight 5/apps/desktop/src/storage/calendar.ts`, `Insight 5/apps/desktop/src/storage/tasks.ts`).

## 2025-12-26 14:10:43
- Added full-height root layout to prevent calendar clipping (`Insight 5/apps/desktop/src/index.css`).
- Unified base control styling with shadcn-like sizing, focus rings, and CTA gradients; refreshed primary/secondary buttons (`Insight 5/apps/desktop/src/App.css`).
- Tightened planner header controls and made planner body layout flex/overflow-friendly for calendar views (`Insight 5/apps/desktop/src/App.css`).
- Increased agenda row heights + event typography for readability and refreshed day timeline columns, log lane styling, and event card padding (`Insight 5/apps/desktop/src/App.css`).

## 2025-12-26 15:03:09
- Added TS/Vite import aliases for shadcn/ui (`Insight 5/apps/desktop/tsconfig.json`, `Insight 5/apps/desktop/tsconfig.app.json`, `Insight 5/apps/desktop/vite.config.ts`).
- Initialized shadcn/ui configuration and CSS variables (`Insight 5/apps/desktop/components.json`, `Insight 5/apps/desktop/src/index.css`).

## 2025-12-26 15:10:31
- Installed `pnpm` globally and initialized shadcn MCP client via `pnpm dlx shadcn@latest mcp init --client codex` (pending Codex config update in `~/.codex/config.toml`).
- Installed shadcn animation dependencies to resolve `tailwindcss-animate` build error (`Insight 5/apps/desktop/package.json`).

## 2025-12-26 15:29:22
- Re-aligned shadcn CSS variables to the existing Insight 5 theme palette and restored Aptos-first font stack (`Insight 5/apps/desktop/src/index.css`, `Insight 5/apps/desktop/tailwind.config.js`).

## 2025-12-26 16:28:44
- Added shadcn/ui components for upcoming UI refactor (button, tabs, toggle-group, separator, scroll-area, table, dropdown-menu, badge) (`Insight 5/apps/desktop/src/components/ui/*`).

## 2025-12-26 16:33:08
- Switched global font stack to Figtree-first (per preference) (`Insight 5/apps/desktop/src/index.css`, `Insight 5/apps/desktop/tailwind.config.js`).

## 2025-12-26 17:59:22
- Rebuilt week/day agenda layout to use the compact `ag*` calendar styles, added all-day row, segment markers, and denser event cards (`Insight 5/apps/desktop/src/workspace/views/agenda.tsx`).
- Increased agenda row heights and narrowed day log lane for better calendar readability (`Insight 5/apps/desktop/src/App.css`).

## 2025-12-26 18:27:30
- Switched planner mode controls to shadcn ToggleGroup + Button for consistent calendar header styling (`Insight 5/apps/desktop/src/workspace/views/planner.tsx`, `Insight 5/apps/desktop/src/App.css`).
- Ensured agenda root fills available height in the calendar layout (`Insight 5/apps/desktop/src/App.css`).

## 2025-12-26 18:29:02
- Added shadcn runtime utilities and dependencies (`Insight 5/apps/desktop/src/lib/utils.ts`, `Insight 5/apps/desktop/package.json`).

## 2025-12-26 18:37:57
- Replaced month view with the unified `ag*` calendar styles and a compact month grid layout (`Insight 5/apps/desktop/src/workspace/views/agenda.tsx`, `Insight 5/apps/desktop/src/App.css`).

## 2025-12-26 19:10:42
- Removed deprecated `@plugin 'tailwindcss-animate'` import to fix Tailwind v4 build errors (`Insight 5/apps/desktop/src/index.css`).
- Forced Vite to resolve a single React/ReactDOM copy from the desktop app to fix Radix invalid hook call (`Insight 5/apps/desktop/vite.config.ts`).
- Hid workspace tab bar and made pane bodies non-scrolling so the calendar grid owns scroll (`Insight 5/apps/desktop/src/App.css`).
- Registered Chrome DevTools MCP server in the workspace MCP config (`.mcp.json`).
## 2025-12-26 20:38:39
- Removed fixed heights from day/week calendar scroll containers so they flex to the pane and align to the bottom without overhang (`Insight 5/apps/desktop/src/App.css`).

## 2025-12-27 11:48:20
- Locked the main app layout to full-height panels with internal scrolling to prevent calendar overhangs (`Insight 5/apps/desktop/src/App.css`).
- Wrapped planner content in a shared hero panel for consistent rounded edges and containment (`Insight 5/apps/desktop/src/workspace/views/planner.tsx`, `Insight 5/apps/desktop/src/App.css`).

## 2025-12-27 16:24:09
- Added notes masonry/list layout styles, tags, and custom scrollbar support (`Insight 5/apps/desktop/src/App.css`).
- Implemented Tasks table view with Kanban toggle and status move handling; wired task status drag in Kanban (`Insight 5/apps/desktop/src/workspace/views/ticktick-tasks.tsx`, `Insight 5/apps/desktop/src/App.tsx`).
- Added Tasks table styling and priority/tag/points visuals (`Insight 5/apps/desktop/src/App.css`).
- Updated event title formatting to use vertical dividers (`Insight 5/apps/desktop/src/ui/event-visual.ts`).
- Increased day view default zoom + range, added play/pause button on event cards, and enabled week view drag-to-move events (`Insight 5/apps/desktop/src/workspace/views/tiimo-day.tsx`, `Insight 5/apps/desktop/src/workspace/views/agenda.tsx`).
- Increased agenda hour heights and narrowed day log lane width (`Insight 5/apps/desktop/src/App.css`).

## 2025-12-27 16:52:11
- Normalized OpenAI model IDs to avoid unsupported parameter errors with gpt-5/response models (`Insight 5/apps/desktop/src/openai.ts`).
- Defaulted assistant settings to LLM-only mode for new/legacy settings (`Insight 5/apps/desktop/src/assistant/storage.ts`).
- Removed local/hybrid mode toggles in Chat UI and clarified LLM-only messaging (`Insight 5/apps/desktop/src/workspace/views/assistant.tsx`).
- Simplified Settings AI section to always save in LLM mode (mode selector removed) (`Insight 5/apps/desktop/src/workspace/views/settings.tsx`).

## 2026-01-06 21:19:31
- Added Swift app PRD for the native iOS/iPad build (`Insight 5/PRD/INSIGHT_SWIFT_PRD.md`).
- Logged Swift app parity and integration requirements (`Insight 5/REQUESTS_LOG.md`).

## 2026-01-06 21:26:42
- Updated Swift app PRD with repo location, iOS 17+ target, and Live Activity action behavior (`Insight 5/PRD/INSIGHT_SWIFT_PRD.md`).
- Refined Swift app request log with platform targets and Live Activity action behavior (`Insight 5/REQUESTS_LOG.md`).

## 2026-01-06 21:34:35
- Scaffolded the SwiftUI app workspace for InsightSwift (`Insight 5/apps/insight_swift`).

## 2026-01-07 20:50:03
- Nested recurrence exceptions under `frontmatter.recurrence` while keeping legacy decoding (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/FrontmatterCodec.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/FrontmatterCodecTests.swift`).

## 2026-01-07 20:44:26
- Seeded calendar conflict banners in UI test mode and surfaced conflicts in Calendar view (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/CalendarSyncService.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/CalendarView.swift`).
- Added UI tests for drag/reschedule and conflict list navigation (`Insight 5/apps/insight_swift/InsightSwiftUITests/InsightSwiftUITests.swift`).

## 2026-01-07 20:35:00
- Stored recurrence as RRULE in frontmatter parsing/encoding and covered missing frontmatter cases (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/FrontmatterCodec.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/FrontmatterCodecTests.swift`).
- Added all-day reschedule and conflict logging tests for reschedule + sync edge cases (`Insight 5/apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/ScheduleServiceTests.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/SupabaseSyncServiceTests.swift`).
- Exposed a lightweight sync test hook for entry updates to validate conflict logging (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/SupabaseSyncService.swift`).

## 2026-01-07 20:15:15
- Persisted entry/task all-day + recurrence exception frontmatter and synced habit schedule/exception updates to Supabase (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/SupabaseSyncService.swift`).
- Routed calendar habit scheduling through Supabase sync when enabled (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/CalendarView.swift`).
- Added frontmatter and recurrence exception coverage for all-day sync and single-occurrence reschedule edge cases (`Insight 5/apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/FrontmatterCodecTests.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/ScheduleServiceTests.swift`).

## 2026-01-07 19:45:00
- Added calendar support helpers, month range support, and new day/week/month calendar skeletons with all-day lane (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/CalendarSupport.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/CalendarView.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/CalendarComponents.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/ScheduleService.swift`).
- Ordered Plan/Agenda task and schedule lists using shared ordering helpers (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/PlanView.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/ExtraScreens.swift`).
- Added parity scaffolds for Tasks/Habits/Notes overview sections (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/TasksView.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/HabitsView.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/NotesView.swift`).
- Added calendar ordering Swift Testing coverage (`Insight 5/apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/CalendarSupportTests.swift`).

## 2026-01-06 21:37:45
- Added Supabase SPM dependency and configuration keys for the Swift app (`Insight 5/apps/insight_swift/InsightSwiftPackage/Package.swift`, `Insight 5/apps/insight_swift/Config/Shared.xcconfig`).
- Added Supabase service wrapper and environment injection in the app shell (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/SupabaseService.swift`, `Insight 5/apps/insight_swift/InsightSwift/InsightSwiftApp.swift`).
- Replaced the placeholder content with a base tab shell (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/ContentView.swift`).
- Aligned Swift app rules doc to iOS 17+ target (`Insight 5/apps/insight_swift/CLAUDE.md`).

## 2026-01-06 21:48:36
- Added Live Activity widget extension scaffold and wiring in the Xcode project (`Insight 5/apps/insight_swift/InsightSwift.xcodeproj/project.pbxproj`).
- Added Live Activity UI with a Record action button plus shared trigger storage (`Insight 5/apps/insight_swift/InsightLiveActivityWidget/InsightLiveActivityWidget.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/LiveActivity/RecordingActionIntent.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/LiveActivity/RecordingTriggerStore.swift`).
- Added Live Activity attributes and manager services, plus recording coordinator wiring (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/LiveActivity/InsightLiveActivityAttributes.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/LiveActivityManager.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/RecordingCoordinator.swift`, `Insight 5/apps/insight_swift/InsightSwift/InsightSwiftApp.swift`).
- Added app-group entitlements for Live Activity triggers and microphone usage description (`Insight 5/apps/insight_swift/Config/InsightSwift.entitlements`, `Insight 5/apps/insight_swift/Config/InsightLiveActivityWidget.entitlements`, `Insight 5/apps/insight_swift/Config/Shared.xcconfig`).

## 2026-01-06 21:51:22
- Added a full build outline + PRD for the Swift app implementation plan (`Insight 5/PRD/INSIGHT_SWIFT_BUILD_PLAN.md`).

## 2026-01-06 21:54:46
- Implemented AVAudioSession + AVAudioRecorder recording with status + saved file feedback (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/RecordingCoordinator.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/CaptureView.swift`).
- Added Live Activities entitlement keys and Info.plist support flag (`Insight 5/apps/insight_swift/Config/InsightSwift.entitlements`, `Insight 5/apps/insight_swift/Config/InsightLiveActivityWidget.entitlements`, `Insight 5/apps/insight_swift/Config/Shared.xcconfig`).

## 2026-01-06 22:01:37
- Excluded the widget Info.plist from buildable resources to fix duplicate Info.plist output (`Insight 5/apps/insight_swift/InsightSwift.xcodeproj/project.pbxproj`).

## 2026-01-06 22:05:16
- Updated bundle identifiers and App Group to remove underscores for valid provisioning (`Insight 5/apps/insight_swift/Config/Shared.xcconfig`, `Insight 5/apps/insight_swift/Config/InsightSwift.entitlements`, `Insight 5/apps/insight_swift/Config/InsightLiveActivityWidget.entitlements`, `Insight 5/apps/insight_swift/InsightSwift.xcodeproj/project.pbxproj`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/LiveActivity/RecordingTriggerStore.swift`).

## 2026-01-06 22:06:36
- Removed invalid activity-tracking entitlement from app and widget to fix signing (`Insight 5/apps/insight_swift/Config/InsightSwift.entitlements`, `Insight 5/apps/insight_swift/Config/InsightLiveActivityWidget.entitlements`).

## 2026-01-06 22:38:51
- Added Insight theme system, typography helpers, and shared UI components for card-based layouts (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Theme/InsightTheme.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/Components/InsightComponents.swift`).
- Reworked the Swift app tab shell to match mobile2 (Dashboard/Habits/Calendar/Plan/More) with a floating capture action (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/AppShellView.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/ContentView.swift`).
- Built out feature screens for habits, plan, focus, agenda, kanban, ticktick, goals, projects, rewards, reports, trackers, people, places, tags, timeline, reflections, explore, assistant, health, ecosystem, voice, and settings (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/HabitsView.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/HabitDetailView.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/HabitFormView.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/PlanView.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/MoreView.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/MoreScreens.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/ExtraScreens.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/FocusView.swift`).
- Updated core views to the new theme and metrics layout (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/DashboardView.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/CalendarView.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/CaptureView.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/TasksView.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/NotesView.swift`).
- Ported the markdown capture parser to Swift and embedded the JavaScript parser with resources + engine toggle (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Parsing/MarkdownCaptureParser.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Parsing/JavaScriptCaptureParser.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Resources/schema.js`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/CaptureParserService.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Package.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/MoreScreens.swift`).
- Applied capture parsing to update entries, tasks, trackers, tags, people, and places (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Stores/AppStore.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/CaptureView.swift`).

## 2026-01-06 23:08:43
- Added Supabase auth state + session management and injected auth/sync services into the app shell (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/SupabaseAuthStore.swift`, `Insight 5/apps/insight_swift/InsightSwift/InsightSwiftApp.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/ContentView.swift`).
- Implemented Supabase sync models and data mapper for entries, goals, projects, habits, trackers, and entities (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/SupabaseModels.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/SupabaseSyncService.swift`).
- Wired Settings account + sync controls and connected core create/log flows to Supabase when enabled (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/MoreScreens.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/CaptureView.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/TasksView.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/HabitsView.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/HabitFormView.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/NotesView.swift`).

## 2026-01-07 06:16:36
- Added Live Activity recording state to the ActivityKit content payload and wired a toggle AppIntent for start/stop actions (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/LiveActivity/InsightLiveActivityAttributes.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/LiveActivity/RecordingActionIntent.swift`, `Insight 5/apps/insight_swift/InsightLiveActivityWidget/InsightLiveActivityWidget.swift`).
- Added pending stop triggers + shared recording state and consumed them in the recording coordinator (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/LiveActivity/RecordingTriggerStore.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/RecordingCoordinator.swift`).
- Re-enabled Live Activities entitlements for app + widget and aligned the test bundle identifier (`Insight 5/apps/insight_swift/Config/InsightSwift.entitlements`, `Insight 5/apps/insight_swift/Config/InsightLiveActivityWidget.entitlements`, `Insight 5/apps/insight_swift/Config/Tests.xcconfig`).

## 2026-01-07 19:10:19
- Expanded the Swift app PRD with full scope, requirements, and milestones (`Insight 5/PRD/INSIGHT_SWIFT_PRD.md`).

## 2026-01-07 19:35:17
- Added SwiftData-backed persistence with snapshot storage, offline sync queue records, and conflict logging helpers (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/LocalPersistenceService.swift`).
- Wired persistence into the app store and app shell lifecycle (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Stores/AppStore.swift`, `Insight 5/apps/insight_swift/InsightSwift/InsightSwiftApp.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/ContentView.swift`).
- Reworked Supabase realtime listeners, added offline queue flush logic, and mapped server IDs back to local logs (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/SupabaseSyncService.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/SupabaseModels.swift`).
- Added Swift Testing coverage for persistence snapshots (round-trip, empty, invalid payload) (`Insight 5/apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/LocalPersistenceServiceTests.swift`).

## 2026-01-07 20:00:00
- Added update/delete handling in the offline sync queue and expanded sync operations for goals, projects, habits, trackers, entities, and entries (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/SupabaseSyncService.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/SupabaseModels.swift`).
- Mirrored Entry `allDay` into Supabase frontmatter and read it back into local entries (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/SupabaseModels.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/SupabaseSyncService.swift`).
- Added conflict logging retrieval + tests (happy/failure/edge) (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/LocalPersistenceService.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/LocalPersistenceServiceTests.swift`).

## 2026-01-07 19:29:10
- Aligned the Swift markdown capture parser with desktop schema rules (line splitting, token regexes, tracker handling, deterministic timestamps) (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Parsing/MarkdownCaptureParser.swift`).
- Updated the embedded JavaScript parser to mirror the desktop-aligned capture rules and support deterministic timestamps (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Resources/schema.js`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Parsing/JavaScriptCaptureParser.swift`).
- Added capture parser test vectors and Swift parity tests for Swift vs JS outputs, including long-form edge cases (`Insight 5/apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/Fixtures/capture_vectors.json`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/InsightSwiftFeatureTests.swift`).
- Added failure-path test coverage for invalid capture headers (`Insight 5/apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/InsightSwiftFeatureTests.swift`).

## 2026-01-07 19:44:55
- Added schedule/recurrence models and drag payload helpers for scheduled items (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Models/CoreModels.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Models/ScheduleModels.swift`).
- Introduced a schedule service for day/week range expansion and recurrence handling (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/ScheduleService.swift`).
- Seeded scheduled tasks/habits/events and added schedule helpers for entries, tasks, and habits in the app store (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Stores/AppStore.swift`).
- Expanded Supabase sync payloads for scheduled and duration fields, plus schedule update helpers (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/SupabaseModels.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/SupabaseSyncService.swift`).
- Rebuilt the calendar view with day/week grid, all-day lanes, drag reschedule, and drop scheduling (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/CalendarView.swift`).
- Wired Plan and Agenda views to scheduled data and added agenda row components (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/PlanView.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/ExtraScreens.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/Components/ScheduleAgendaRow.swift`).
- Added ScheduleService tests for happy, failure, and recurrence edge cases (`Insight 5/apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/ScheduleServiceTests.swift`).

## 2026-01-07 20:08:35
- Added capture review models, pending capture storage, and a capture pipeline state machine with parsing + offline pending transitions (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Models/CaptureReviewModels.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/CapturePendingStore.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/CapturePipelineService.swift`).
- Implemented capture review card UI with swipe accept/reject, inline edits, and apply controls, plus wired CaptureView into the new pipeline (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/CaptureReviewView.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/CaptureView.swift`).
- Added capture commit handling for accepted review items (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/CaptureReviewCommitter.swift`).
- Added parser tests for tracker string values and clamp bounds, plus offline pending recovery coverage (`Insight 5/apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/InsightSwiftFeatureTests.swift`).
- Allowed capture ingestion to skip creating a note entry when needed (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Stores/AppStore.swift`, `Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/SupabaseSyncService.swift`).

## 2026-01-07 21:15:00 (Agent E - Calendar Sync)
- Added Supabase models for external accounts and event links (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/SupabaseModels.swift`).
- Created CalendarSyncModels with CalendarProvider enum, RecurrenceInfo (RRULE format), RecurrenceException, EventFrontmatter, CalendarConflict, CalendarSyncStats, and CalendarSyncError (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Models/CalendarSyncModels.swift`).
- Created ExternalCalendarSyncService for Google/Microsoft calendar sync via Supabase edge functions (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/ExternalCalendarSyncService.swift`).
- Created EventKitMapper for Entry ↔ EKEvent mapping with RRULE parsing, parity-plus fields, and conflict detection (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/EventKitMapper.swift`).
- Extended CalendarSyncService with device sync logic including full two-way sync, 60-second conflict window, and ALL device event import (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/CalendarSyncService.swift`).
- Created SyncConflictBanner UI component with conflict row and list views (`Insight 5/apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/Components/SyncConflictBanner.swift`).
- Added CalendarSyncTests with happy path (mapping), failure path (authorization), and edge case (conflict detection) coverage (`Insight 5/apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/CalendarSyncTests.swift`).

## 2026-01-07 20:18:48
- Added task, habit, and note detail views with CRUD wiring and navigation from list screens (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/TasksView.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/NotesView.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/HabitsView.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/TaskDetailView.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/NoteDetailView.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/HabitDetailView.swift`).
- Added AppStore CRUD tests and Calendar/Plan view render coverage (`apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/AppStoreCrudTests.swift`, `apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/CalendarAgendaViewTests.swift`).
- Fixed habit scheduling update flow in Supabase sync and removed duplicate delete handler (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/SupabaseSyncService.swift`).

## 2026-01-07 22:30:00 (Agent F - HealthKit Integration)
- Created `HealthKitModels.swift` with `WorkoutSession`, `WorkoutRow`, `NutritionLog`, `WorkoutTemplate`, `NutritionSource`, `MealType` enums aligned to Supabase schema (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Models/HealthKitModels.swift`).
- Added `mapActivityType(_:)` pure function to map HKWorkoutActivityType to WorkoutTemplate (strength/cardio/mobility) (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Models/HealthKitModels.swift`).
- Added `groupNutritionToMeals(_:for:)` pure function for time-window meal grouping (breakfast 5-10, lunch 11-14, dinner 17-21) (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Models/HealthKitModels.swift`).
- Added `isDuplicateHealthKitImport(healthKitUUID:in:)` for duplicate detection via Entry.frontmatter (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Models/HealthKitModels.swift`).
- Extended `HealthKitService.swift` with `fetchWorkouts(from:to:)`, `fetchNutritionSamples(from:to:)`, `syncWorkouts(entries:)`, and `syncNutrition(entries:for:)` async methods (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/HealthKitService.swift`).
- Removed legacy `Workout` and `Meal` structs from `CoreModels.swift` (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Models/CoreModels.swift`).
- Updated `AppStore.swift` to use `workoutSessions`, `workoutRows`, `nutritionLogs` with full CRUD operations and sync result application (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Stores/AppStore.swift`).
- Added `workoutSession`, `workoutRow`, `nutritionLog` to `SyncEntityType` in `LocalPersistenceService.swift` (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/LocalPersistenceService.swift`).
- Updated `AppStoreSnapshot` to include workout/nutrition arrays (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/LocalPersistenceService.swift`).
- Added HealthKit sync cases to `SupabaseSyncService.swift` (local-only for v1) (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/SupabaseSyncService.swift`).
- Added HealthKit toggle + sync button to `HealthView` with authorization status display (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/MoreScreens.swift`).
- Updated `WorkoutsView` to display sessions with linked Entry data (title, duration, template) (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/MoreScreens.swift`).
- Updated `NutritionView` to display logs with macro breakdown (P/C/F) (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/MoreScreens.swift`).
- Created `HealthKitDataTests.swift` with 17 pure function tests covering activity mapping, meal time windows, nutrition grouping, and duplicate detection (`apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/HealthKitDataTests.swift`).

## 2026-01-07 23:30:00 (Agent G - Notifications + Live Activities + Background Audio)
- Enabled `UIBackgroundModes = audio` in `Config/Shared.xcconfig` for background audio recording (`apps/insight_swift/Config/Shared.xcconfig`).
- Created `NotificationCenterClient` protocol for testable notification service with UNUserNotificationCenter conformance (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/NotificationCenterClient.swift`).
- Enhanced `NotificationService` with notification categories (habitReminder, taskReminder, general), actions (markComplete, snooze), and snooze presets (5m, 10m, 30m, 1h) stored in UserDefaults (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/NotificationService.swift`).
- Added time-sensitive habit reminders via `interruptionLevel = .timeSensitive` (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/NotificationService.swift`).
- Added recurring notification support with weekday filtering and stable cancel identifiers (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/NotificationService.swift`).
- Extended `InsightLiveActivityAttributes.ContentState` with `ActivityType` enum (recording, focus, pomodoro) and `targetDuration` for countdown display (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/LiveActivity/InsightLiveActivityAttributes.swift`).
- Extended `LiveActivityManager` with `startFocusActivity` and `startPomodoroActivity` methods for focus session Live Activities (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/LiveActivityManager.swift`).
- Added `attachLiveActivityManager` to `AppStore` and wired focus session start/stop to trigger Live Activity updates (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Stores/AppStore.swift`).
- Wired `LiveActivityManager` attachment in app initialization (`apps/insight_swift/InsightSwift/InsightSwiftApp.swift`).
- Updated Widget UI with activity type-specific icons (mic/brain/timer), colors (red/purple/orange), and countdown timer display when `targetDuration` is set (`apps/insight_swift/InsightLiveActivityWidget/InsightLiveActivityWidget.swift`).
- Created `NotificationSchedulingTests.swift` with 6 tests covering happy path, authorization denial, recurring notifications, time-sensitive interruption level, cancellation, and snooze persistence (`apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/NotificationSchedulingTests.swift`).
- Created `LiveActivityStateTests.swift` with 11 tests covering focus session mapping, pomodoro state, recording defaults, Codable serialization, Hashable equality, and activity type differentiation (`apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/LiveActivityStateTests.swift`).
- Fixed pre-existing codebase issues: Package.swift argument order, duplicate RecurrenceException types (renamed to CalendarRecurrenceException), missing public/Sendable conformances on JSONValue, EntryFacet, RecurrenceRule, RecurrenceException (`apps/insight_swift/InsightSwiftPackage/Package.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Models/CalendarSyncModels.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Models/ScheduleModels.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Models/JSONValue.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Models/CoreModels.swift`).
- Fixed keypath syntax error in `LocalPersistenceService.swift` (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/LocalPersistenceService.swift`).

## 2026-01-07 20:40:07
- Added iPad split-view navigation shell with shared tab metadata and capture overlay; iPhone tab bar remains intact (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/AppShellView.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/ContentView.swift`).
- Expanded theme tokens to match `apps/mobile2` display metrics and applied them to base components (metric tiles, chips) (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Theme/InsightTheme.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/Components/InsightComponents.swift`).
- Added queue flush helper for testing and new offline queue tests covering update/delete flush, failure attempts, and ID remaps; refreshed snapshot tests for workout/nutrition models (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/SupabaseSyncService.swift`, `apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/SupabaseSyncServiceTests.swift`, `apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/LocalPersistenceServiceTests.swift`).

## 2026-01-07 20:53:30
- Added Appendix-C underbar actions (Capture/Search/Focus) and context panel wiring, replacing the floating capture button and adding iPad sidebar quick actions (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/AppShellView.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/Components/UnderbarView.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/Components/ContextPanelView.swift`).
- Added theme metrics for underbar height and context panel width to align layout sizing (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Theme/InsightTheme.swift`).
- Added underbar/context panel render tests (`apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/UnderbarContextPanelTests.swift`).

## 2026-01-07 21:05:00
- Wired context panel to real store data (active focus, top goal/project) and pending review count via pending store; added accessibility identifiers on underbar/context controls (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/AppShellView.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/Components/UnderbarView.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/Components/ContextPanelView.swift`).
- Added iPhone/iPad shell render smoke tests for underbar/context (`apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/UnderbarContextPanelTests.swift`).

## 2026-01-07 20:34:24
- Added metadata sections for tags/people/contexts in task, habit, and note detail views (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/TaskDetailView.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/HabitDetailView.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/NoteDetailView.swift`).
- Expanded AppStore CRUD tests to cover tasks, habits, and notes; added empty-state render tests and all-day calendar render edge case (`apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/AppStoreCrudTests.swift`, `apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/CalendarAgendaViewTests.swift`).

## 2026-01-07 20:40:35
- Added recurrence summaries to task, habit, and note detail views (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/TaskDetailView.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/HabitDetailView.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/NoteDetailView.swift`).

## 2026-01-07 (Agent E - Calendar Sync Phase 2: OAuth + UI + Background Sync)
- Created `OAuthWebAuthService` with ASWebAuthenticationSession for Google/Microsoft OAuth web authentication flows (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/OAuthWebAuthService.swift`).
- Created `CalendarConnectView` for connecting/disconnecting external calendar accounts with OAuth buttons and status display (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/Settings/CalendarConnectView.swift`).
- Created `CalendarSelectionView` for choosing which calendars to sync, grouped by provider with toggle switches (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/Settings/CalendarSelectionView.swift`).
- Added `CalendarSelection` model with id, title, provider, colorHex, and isEnabled properties (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/Settings/CalendarSelectionView.swift`).
- Created `ConflictResolutionView` with side-by-side diff comparing local vs provider versions (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/Components/ConflictResolutionView.swift`).
- Added `ConflictResolver` utility with `mergeNotes` and `apply` methods for resolution strategies (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/Components/ConflictResolutionView.swift`).
- Created `BackgroundSyncScheduler` using BGTaskScheduler for background calendar sync with BGProcessingTask and BGAppRefreshTask (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/BackgroundSyncScheduler.swift`).
- Extended `ExternalCalendarSyncService` with Phase 2 methods: `fetchCalendars`, `updateCalendarSelection`, `enableBackgroundSync`, `disableBackgroundSync`, `logConflict`, `resolveConflict`, `clearConflicts` (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/ExternalCalendarSyncService.swift`).
- Created `InsightSwift/Info.plist` with URL schemes (`insightswift://`), BGTaskSchedulerPermittedIdentifiers, and background modes (audio, fetch, processing) (`apps/insight_swift/InsightSwift/Info.plist`).
- Updated `Config/Shared.xcconfig` to use custom Info.plist instead of auto-generated (`apps/insight_swift/Config/Shared.xcconfig`).
- Wired `AppDelegate` to register background tasks at launch and schedule sync on app lifecycle events (`apps/insight_swift/InsightSwift/AppDelegate.swift`).
- Added `CalendarSyncPhase2Tests.swift` with 25+ tests covering OAuth URL construction, code extraction, error handling, conflict resolution, background task identifiers, calendar selection, and CalendarProvider displayName (`apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/CalendarSyncPhase2Tests.swift`).

## 2026-01-07 20:46:02
- Added edge-function transcription client with audio upload support for capture replay (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/CaptureTranscriptionService.swift`).
- Added network reachability monitor and wired reconnect replay for pending captures (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/NetworkMonitorService.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/ContentView.swift`, `apps/insight_swift/InsightSwift/InsightSwiftApp.swift`).
- Updated capture pipeline to transcribe via edge function, persist audio-backed pending captures, and display pending summaries (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/CapturePipelineService.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Models/CaptureReviewModels.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/RecordingCoordinator.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/CaptureView.swift`).
- Added capture pipeline tests for happy path and parse failure, and updated offline pending recovery coverage (`apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/InsightSwiftFeatureTests.swift`).

## 2026-01-07 21:22:19
- Added capture failure reasons, retry UI, and timeout handling for transcribe/parse paths (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Models/CaptureReviewModels.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/CaptureView.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/CapturePipelineService.swift`).
- Added debug state-transition logging and new capture QA tests (happy, parse failure, transcription timeout) (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/CapturePipelineService.swift`, `apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/InsightSwiftFeatureTests.swift`).

## 2026-01-07 20:59:27
- Added recurrence editors for tasks and habits (rule + exceptions) and wired save to persist recurrence updates (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/TaskDetailView.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/HabitDetailView.swift`).
- Extended task/habit update paths to persist recurrence changes (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Stores/AppStore.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/SupabaseSyncService.swift`).
- Updated package platforms to include macOS 14 for SwiftPM test builds (`apps/insight_swift/InsightSwiftPackage/Package.swift`).

## 2026-01-07 (Agent F - HealthKit Phase 2: Detail Views + Sync Polish)
- Created `WorkoutDetailView.swift` with editable workout details (title, template, start/end dates), workout rows table, and add/delete row functionality (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/WorkoutDetailView.swift`).
- Created `NutritionDetailView.swift` with editable macros (calories, protein, carbs, fat), confidence slider, source picker, and showOnCalendar toggle (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/NutritionDetailView.swift`).
- Added NavigationLinks in MoreScreens.swift (WorkoutsView/NutritionView) to new detail views (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/MoreScreens.swift`).
- Added `showOnCalendar` field to NutritionLog model to control Entry facet (.event vs .note) (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Models/HealthKitModels.swift`).
- Updated Entry facets for workouts to `[.event, .habit]` so workouts count toward habit streaks (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Stores/AppStore.swift`).
- Added HKObserverQuery background sync to HealthKitService with `startBackgroundSync(appStore:)` and `stopBackgroundSync()` methods (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/HealthKitService.swift`).
- Added Supabase row models: SupabaseWorkoutSessionRow/Insert/Update, SupabaseWorkoutRowRow/Insert/Update, SupabaseNutritionLogRow/Insert/Update (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/SupabaseModels.swift`).
- Implemented full Supabase sync operations for workout_sessions, workout_rows, nutrition_logs tables (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/SupabaseSyncService.swift`).
- Added realtime listeners for workout/nutrition tables in `startRealtime()` (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/SupabaseSyncService.swift`).
- Added data loading for workout/nutrition in `loadAll()` (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/SupabaseSyncService.swift`).
- Added CRUD methods: createWorkoutSession, updateWorkoutSession, deleteWorkoutSession, createWorkoutRow, deleteWorkoutRow, createNutritionLog, updateNutritionLog, deleteNutritionLog (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/SupabaseSyncService.swift`).
