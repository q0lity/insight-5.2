# Web to Mobile Parity Matrix

## Principles
- Web UI is the source of truth for layout and feature scope.
- Desktop/web layouts remain stable; mobile adapts to match web features.
- Mobile capture UX is the highest priority surface.
- Supabase is the canonical source of truth for both web and mobile; local stores are cache/outbox only.

## Legend
- Parity: already specified for mobile in PRD or mobile spec.
- Partial: some mobile definition exists but needs alignment to web behavior.
- Gap: defined for web, not yet defined for mobile in detail.

## Parity Matrix (Spec-Level)
| Area | Web behavior (source) | Mobile parity status | Required work |
| --- | --- | --- | --- |
| Capture entry points | Quick Log mic, Action Button (iOS), Quick Tile (Android), desktop hotkey (phase 1.5). | Partial | Ensure mobile supports Action Button + Quick Tile + in-app mic with consistent routing. |
| Voice log states | Idle, Recording, Transcribing, Parsing, Review, Offline Pending. | Parity | Match state machine and UI affordances on mobile. |
| Live markdown preview | Best-effort markdown during capture; offline uses timestamp markers; final formatting server-side. | Partial | Add live preview pane + marker insertion rules. |
| Review cards | Swipe accept/reject, edit, apply all. | Parity | Match card UI/behavior on mobile; ensure <30s for 5-10 cards. |
| Dashboard | Today schedule, Active timer, XP ring, streaks, top trackers, pending badge. | Partial | Preserve mobile focus view; align dashboard data and actions to web. |
| Calendar | Day/week timeline, drag/reschedule, timeboxing, conflict cards. | Partial | Align mobile calendar editing, conflict cards, and timeboxing gestures. |
| Timeline | Filtered chronological feed. | Gap | Define mobile Timeline UI and filters parity. |
| Views | Saved view builder and pinned views. | Gap | Define mobile Views UI (compact builder + pinned list). |
| Habits | Streaks, quick log, heatmap. | Parity | Align habit logging + streak visuals with web. |
| Fitness | Workout sessions + rows table + charts. | Partial | Implement mobile session detail + quick add row + voice-to-row. |
| Nutrition (POC) | Photo + voice, editable estimate. | Partial | Implement mobile meal capture with edit fields. |
| Entry detail | Markdown-first + structured fields + attachments + backlinks. | Partial | Ensure mobile editor supports markdown + structured fields + attachments. |
| Assistant | Chat-style search/summarize + deep links. | Gap | Define mobile assistant UI with source links. |
| Offline capture | Pending capture queue, parse on reconnect. | Parity | Ensure mobile stores pending captures and shows badges. |
| Sync + storage | Supabase Postgres + Storage + Edge Functions. | Parity | Wire mobile to same API contracts and RLS rules. |
| Timers + Live Activity | Timer types + XP accrual; iOS Live Activity / Android notification. | Partial | Implement Live Activity surfaces and XP preview on mobile. |
| Settings | Auth, privacy, calendar, permissions, AI settings. | Partial | Align mobile settings to web features and permissions. |

## Notes
- This matrix is based on PRD v3 and mobile features spec; it is not a code audit.
- Any changes to web UI structure should be avoided; mobile adapts for parity.
