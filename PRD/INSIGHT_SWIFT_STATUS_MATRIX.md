# Insight Swift Status Matrix

Last updated: 2026-01-08

## Legend
- Done: implemented with evidence in repo
- In Progress: active changes or report indicates work underway
- Blocked: waiting on dependency or decision
- Not Started: no work started but owned/queued
- Unknown: no agent report or repo evidence yet

## P0 Foundation
| Area | Status | Owner | Evidence | Next step |
| --- | --- | --- | --- | --- |
| Navigation shell (iPhone tabs + iPad split) | Done | Agent A/D | `InsightSwiftFeature/Views/AppShellView.swift` | Refine iPad sidebar actions |
| Theme tokens + base components | Done | Agent A | `InsightSwiftFeature/Theme/InsightTheme.swift` | Expand component library as needed |
| App-wide environment services | Done | Agent A | `InsightSwiftApp.swift` | Monitor service lifecycle |
| SwiftData baseline models | Done | Agent A | `InsightSwiftFeature/Models/CoreModels.swift` | Monitor migration needs |
| Supabase client bootstrap | Done | Agent A | `InsightSwiftFeature/Services/SupabaseService.swift` | Monitor auth stability |
| Offline queue scaffolding | Done | Agent A | `InsightSwiftFeature/Services/LocalPersistenceService.swift` | Monitor sync queue reliability |

## P1 Core Parity
| Area | Status | Owner | Evidence | Next step |
| --- | --- | --- | --- | --- |
| Capture parser parity (Swift + JS) | Done | Agent C | `InsightSwiftFeature/Parsing` | Monitor edge cases |
| Capture parity test vectors | Done | Agent C | `InsightSwiftFeatureTests/Fixtures` | Add user-reported cases |
| Capture state machine | Done | Agent C | `InsightSwiftFeature/Services/CapturePipelineService.swift` | Monitor state transitions |
| Capture review UI (cards) | Done | Agent C | `InsightSwiftFeature/Views/CaptureReviewView.swift` | Polish UI interactions |
| Scheduling + recurrence helpers | Done | Agent B | `InsightSwiftFeature/Services/ScheduleService.swift` | Monitor recurrence bugs |
| Calendar skeleton (day/week/month + all-day lane) | Done | Agent D | `InsightSwiftFeature/Views/CalendarView.swift` | Polish drag-and-drop |
| Calendar drag/reschedule | Done | Agent B | `InsightSwiftFeature/Views/CalendarView.swift` | Monitor conflict handling |
| Plan/Agenda list ordering | Done | Agent D | `InsightSwiftFeature/Views/PlanView.swift` | Refine sorting logic if needed |
| Tasks/Habits/Notes scaffolds | Done | Agent D | `InsightSwiftFeature/Views/*View.swift` | Add more specific view features |

## P2 Integrations
| Area | Status | Owner | Evidence | Next step |
| --- | --- | --- | --- | --- |
| Calendar sync (Google/Microsoft) | Done | Agent E | `InsightSwiftFeature/Services/ExternalCalendarSyncService.swift` | Monitor sync reliability |
| EventKit integration | Done | Agent E | `InsightSwiftFeature/Services/EventKitMapper.swift` | Monitor permission issues |
| HealthKit ingestion | Done | Agent F | `InsightSwiftFeature/Services/HealthKitService.swift` | Add more data types if needed |
| Notifications + Live Activities | Done | Agent G | `InsightSwiftFeature/Services/NotificationService.swift` | Polish Live Activity UI |
| Background audio for capture | Done | Agent G | `InsightSwiftFeature/Services/RecordingCoordinator.swift` | Monitor background stability |

## P3 Final Parity + Polish
| Area | Status | Owner | Evidence | Next step |
| --- | --- | --- | --- | --- |
| Reports/Analytics | Not Started | Unassigned | None yet | Define parity scope + UI |
| Assistant | Not Started | Unassigned | None yet | Define mobile chat UI |
| Rewards/XP | Not Started | Unassigned | None yet | XP model + UI |
| Ecosystem/Reflections | Not Started | Unassigned | None yet | Define cards + linking |
| Performance/Polish | Not Started | Unassigned | None yet | Profiling + polish pass |
