# Web to Mobile Parity Matrix

## Principles
- Web UI is the source of truth for layout and feature scope.
- Desktop/web layouts remain stable; mobile adapts to match web features.
- Mobile capture UX is the highest priority surface.
- Supabase is the canonical source of truth for both web and mobile; local stores are cache/outbox only.

## Legend
- Parity: feature implemented and functionally equivalent
- Partial: basic implementation exists but missing key desktop features
- Gap: not implemented or significantly different from desktop
- ✅ Code exists | ⚠️ Partial | ❌ Missing

## Code Audit Summary (2026-01-11)
This matrix has been updated based on a code-level audit comparing:
- `apps/desktop/src/` (React + TypeScript)
- `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/` (Swift 6 + SwiftUI)

---

## Parity Matrix (Code-Level Audit)

### Core Views Comparison

| Area | Desktop Implementation | iOS Swift Status | Gap Details |
| --- | --- | --- | --- |
| **Dashboard** | Rich analytics: heatmaps, pie/bar/line/radar charts, time/points tracking, filtering, widget layout customization | ⚠️ Partial | iOS has basic metric tiles only. Missing: heatmaps, charts, time range filtering, category/tag filters, customizable widget layout |
| **Habits** | Heatmap per habit, streak tracking, points calculation, category/subcategory, character traits (STR/INT/CON/PER), polarity, schedule, analytics | ⚠️ Partial | iOS has list + basic log. Missing: heatmaps, streaks, points display, full habit editor, character traits, polarity, analytics |
| **Calendar** | Day/week/month views, all-day lane, drag/drop, timeboxing, conflict cards | ⚠️ Partial | iOS has CalendarView + CalendarComponents. Missing: drag/drop editing, conflict cards, timeboxing gestures |
| **Tasks** | Table view + Kanban board | ✅ Parity | iOS has TasksView (list) + KanbanView in ExtraScreens |
| **Timeline** | Filtered chronological feed | ✅ Parity | iOS has TimelineView + TimelineFilterSheet |
| **Notes** | Inbox, markdown viewer, backlinks | ⚠️ Partial | iOS has NotesView + NoteDetailView. Missing: backlinks, rich markdown editing |
| **Focus Timer** | Timer with XP accrual | ✅ Parity | iOS has FocusView with timer and XP tracking |
| **Goals** | Goal CRUD, priority, rollups | ✅ Parity | iOS has GoalsView in MoreScreens |
| **Projects** | Project CRUD, status | ✅ Parity | iOS has ProjectsView in MoreScreens |
| **People** | Entity management, last seen | ✅ Parity | iOS has PeopleView in MoreScreens |
| **Places** | Entity management, category | ✅ Parity | iOS has PlacesView in MoreScreens |
| **Tags** | Tag management, colors | ✅ Parity | iOS has TagsView in MoreScreens |
| **Trackers** | Tracker definitions + logs + heatmaps | ⚠️ Partial | iOS has TrackersView (list) + TrackerLogDetailView. Missing: heatmaps, analytics |
| **Rewards/XP** | Gamification, redeem rewards | ✅ Parity | iOS has RewardsView in MoreScreens |
| **Reports** | Analytics dashboard | ⚠️ Partial | iOS has ReportsView placeholder. Missing: actual charts and analytics |
| **Assistant** | Local search + LLM mode, source cards | ✅ Parity | iOS has AssistantView with local + LLM modes |
| **Settings** | Auth, theme, parser engine, sync, notifications | ✅ Parity | iOS has SettingsView with all features |
| **Ecosystem** | Integration toggles | ✅ Parity | iOS has EcosystemView |
| **Reflections** | Daily prompts and responses | ✅ Parity | iOS has ReflectionsView |
| **Health** | HealthKit integration, workouts, nutrition | ✅ Parity | iOS has HealthView + WorkoutsView + NutritionView |
| **Capture** | Voice/text capture, review cards | ✅ Parity | iOS has CaptureView + CaptureReviewView |

### Parsing Comparison

| Area | Desktop Implementation | iOS Swift Status | Gap Details |
| --- | --- | --- | --- |
| **LLM Parser** | `nlp/llm-parse.ts` (942 LOC) - tasks, events, workouts, nutrition | ⚠️ Partial | Needs Supabase edge function integration verification |
| **Natural Parser** | `nlp/natural.ts` (1078 LOC) - Chrono-based date/time | ❌ Gap | iOS uses MarkdownCaptureParser for tokens only |
| **Markdown Parser** | Token extraction for tags, people, places, trackers | ✅ Parity | iOS has MarkdownCaptureParser.swift |
| **JavaScript Parser** | Embedded via JavaScriptCore | ✅ Parity | iOS has JavaScriptCaptureParser.swift |
| **Parser Test Vectors** | No centralized test vectors found | ❌ Gap | Need to create shared test vectors for parity verification |

### Data Model Comparison

| Area | Desktop Implementation | iOS Swift Status | Gap Details |
| --- | --- | --- | --- |
| **Entry Model** | CalendarEvent with facets, tags, people, character, skills | ✅ Parity | iOS Entry model has equivalent fields |
| **Task Model** | Status, priority, due/scheduled dates | ✅ Parity | iOS TodoTask model matches |
| **Habit Model** | HabitDef with schedule, polarity, character | ⚠️ Partial | iOS HabitDefinition simpler, missing polarity, schedule encoding |
| **Tracker Model** | TrackerDef with unit, min/max | ✅ Parity | iOS TrackerDefinition matches |
| **Workout Model** | WorkoutSession with exercises, rows | ✅ Parity | iOS WorkoutSession + WorkoutRow match |
| **Nutrition Model** | NutritionLog with macros | ✅ Parity | iOS NutritionLog matches |

### Sync & Storage

| Area | Desktop Implementation | iOS Swift Status | Gap Details |
| --- | --- | --- | --- |
| **Supabase Client** | `supabase/client.ts`, `supabase/sync.ts` | ✅ Parity | iOS has SupabaseSyncService |
| **Auth** | Email/password, session persistence | ✅ Parity | iOS has SupabaseAuthStore |
| **Realtime** | Subscribe to inserts/updates/deletes | ⚠️ Partial | iOS sync is pull-based, may need realtime subscription |
| **Conflict Resolution** | Last-write-wins with logging | ⚠️ Partial | iOS has SyncConflictBanner, needs conflict log integration |
| **Offline Queue** | Pending captures with retry | ✅ Parity | iOS has offline capture queue |

---

## Critical Gaps Summary

### P0 - High Priority (Core User Workflows)

1. **Dashboard Analytics** - iOS missing heatmaps, charts, time tracking visualization
2. **Habit Heatmaps** - iOS missing consistency visualization and streak display
3. **Parser Test Vectors** - No shared test suite for parity verification

### P1 - Medium Priority (Feature Parity)

4. **Trackers Analytics** - iOS missing heatmaps and trend visualization
5. **Reports Dashboard** - iOS has placeholder only
6. **Calendar Drag/Drop** - iOS missing interactive editing
7. **Habit Full Editor** - iOS missing character traits, polarity, schedule editor

### P2 - Lower Priority (Polish)

8. **Notes Backlinks** - iOS missing bidirectional links
9. **Realtime Sync** - iOS uses polling, could upgrade to websocket

---

## Parity Matrix (Spec-Level - Original)

| Area | Web behavior (source) | Mobile parity status | Required work |
| --- | --- | --- | --- |
| Capture entry points | Quick Log mic, Action Button (iOS), Quick Tile (Android), desktop hotkey (phase 1.5). | ✅ Parity | Action Button and in-app mic implemented |
| Voice log states | Idle, Recording, Transcribing, Parsing, Review, Offline Pending. | ✅ Parity | RecordingCoordinator handles full state machine |
| Live markdown preview | Best-effort markdown during capture; offline uses timestamp markers; final formatting server-side. | ⚠️ Partial | Add live preview pane + marker insertion rules |
| Review cards | Swipe accept/reject, edit, apply all. | ✅ Parity | CaptureReviewView implemented |
| Dashboard | Today schedule, Active timer, XP ring, streaks, top trackers, pending badge. | ⚠️ Partial | Add heatmaps, charts, filtering, customization |
| Calendar | Day/week timeline, drag/reschedule, timeboxing, conflict cards. | ⚠️ Partial | Add drag/drop, conflict cards, timeboxing gestures |
| Timeline | Filtered chronological feed. | ✅ Parity | TimelineView + TimelineFilterSheet implemented |
| Views | Saved view builder and pinned views. | ✅ Parity | SavedViewBuilderView + SavedViewsListView implemented |
| Habits | Streaks, quick log, heatmap. | ⚠️ Partial | Add heatmap component, streak visualization |
| Fitness | Workout sessions + rows table + charts. | ✅ Parity | WorkoutDetailView with session + rows |
| Nutrition (POC) | Photo + voice, editable estimate. | ✅ Parity | NutritionDetailView implemented |
| Entry detail | Markdown-first + structured fields + attachments + backlinks. | ⚠️ Partial | Add backlinks, attachment support |
| Assistant | Chat-style search/summarize + deep links. | ✅ Parity | AssistantView with local + LLM modes |
| Offline capture | Pending capture queue, parse on reconnect. | ✅ Parity | CapturePipelineService handles offline |
| Sync + storage | Supabase Postgres + Storage + Edge Functions. | ✅ Parity | SupabaseSyncService integrated |
| Timers + Live Activity | Timer types + XP accrual; iOS Live Activity / Android notification. | ✅ Parity | LiveActivity + FocusView implemented |
| Settings | Auth, privacy, calendar, permissions, AI settings. | ✅ Parity | Full SettingsView implemented |

---

## Notes
- This matrix updated 2026-01-11 based on code audit comparing desktop and iOS Swift implementations.
- The audit focused on feature-level comparison, not pixel-perfect UI matching.
- iOS Swift app has significant coverage but lacks advanced analytics/visualization features.
- Parser parity requires shared test vectors (input text → JSON output) for validation.
