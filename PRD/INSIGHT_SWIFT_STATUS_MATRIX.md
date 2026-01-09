# Insight Swift Status Matrix

Last updated: 2026-01-07

## Legend
- Done: implemented with evidence in repo
- In Progress: active changes or report indicates work underway
- Blocked: waiting on dependency or decision
- Not Started: no work started but owned/queued
- Unknown: no agent report or repo evidence yet

## P0 Foundation
| Area | Status | Owner | Evidence | Next step |
| --- | --- | --- | --- | --- |
| Navigation shell (iPhone tabs + iPad split) | Unknown | Agent A | None yet | Confirm layout skeleton + routing |
| Theme tokens + base components | Unknown | Agent A | None yet | Import `apps/mobile2` assets + token setup |
| App-wide environment services | Unknown | Agent A | None yet | Define router/theme services |
| SwiftData baseline models | In Progress | Agent A | `AGENT_REPORTS/insight-swift-agent-a-2026-01-07.md` | Confirm model coverage for Entry/Task/Event/Habit/TrackerLog |
| Supabase client bootstrap | In Progress | Agent A | `AGENT_REPORTS/insight-swift-agent-a-2026-01-07.md` | Harden auth wiring + realtime subscriptions |
| Offline queue scaffolding | Done | Agent A | `AGENT_REPORTS/insight-swift-agent-a-2026-01-07.md` | Add update/delete queue paths + tests |

## P1 Core Parity
| Area | Status | Owner | Evidence | Next step |
| --- | --- | --- | --- | --- |
| Capture parser parity (Swift + JS) | Done | Agent C | `AGENT_REPORTS/insight-swift-agent-c-2026-01-07.md` | Expand parity coverage beyond capture blocks |
| Capture parity test vectors | Done | Agent C | `AGENT_REPORTS/insight-swift-agent-c-2026-01-07.md` | Add tracker string/clamp tests |
| Capture state machine | Not Started | Agent C | None yet | Implement Idle -> Review -> Offline Pending |
| Capture review UI (cards) | Not Started | Agent C | None yet | Build swipe accept/reject flow |
| Scheduling + recurrence helpers | Done | Agent B | `AGENT_REPORTS/insight-swift-agent-b-2026-01-07.md` | Persist all-day + recurrence to Supabase |
| Calendar skeleton (day/week/month + all-day lane) | Done | Agent D | `AGENT_REPORTS/insight-swift-agent-d-2026-01-07.md` | Add explicit all-day flag support |
| Calendar drag/reschedule | Done | Agent B | `AGENT_REPORTS/insight-swift-agent-b-2026-01-07.md` | Add UI tests + conflict handling |
| Plan/Agenda list ordering | Done | Agent D | `AGENT_REPORTS/insight-swift-agent-d-2026-01-07.md` | Decide status-first vs due-date-first |
| Tasks/Habits/Notes scaffolds | Done | Agent D | `AGENT_REPORTS/insight-swift-agent-d-2026-01-07.md` | Expand to CRUD + detail parity |

## P2 Integrations
| Area | Status | Owner | Evidence | Next step |
| --- | --- | --- | --- | --- |
| Calendar sync (Google/Microsoft) | Not Started | Unassigned | None yet | Wire edge functions + sync flow |
| EventKit integration | Not Started | Unassigned | None yet | Device calendar mapping |
| HealthKit ingestion | Not Started | Unassigned | None yet | Define workout/nutrition ingest |
| Notifications + Live Activities | Not Started | Unassigned | None yet | Live Activity + push/local setup |
| Background audio for capture | Not Started | Unassigned | None yet | AVAudioSession background config |

## P3 Final Parity + Polish
| Area | Status | Owner | Evidence | Next step |
| --- | --- | --- | --- | --- |
| Reports/Analytics | Not Started | Unassigned | None yet | Define parity scope + UI |
| Assistant | Not Started | Unassigned | None yet | Define mobile chat UI |
| Rewards/XP | Not Started | Unassigned | None yet | XP model + UI |
| Ecosystem/Reflections | Not Started | Unassigned | None yet | Define cards + linking |
| Performance/Polish | Not Started | Unassigned | None yet | Profiling + polish pass |
