# Agent 04 — Timers, XP Accrual, Live Activity

## Deliverables
- `Insight 5/ARCH/TIMERS_AND_XP.md` (timebox types + XP update rules)
- `Insight 5/ARCH/NATIVE_SURFACES.md` (iOS App Intents + ActivityKit, Android Tile/notification)

## Must Support (MVP)
- Timers (2-min, pomodoro, countdown, stopwatch)
- XP accrual live (minutes drive XP)
- Live Activity shows: title, remaining/elapsed, XP earned, pause/stop

## Subtask Timers + XP Precision
Plugin evidence reviewed:
- `plugins/tasknotes/manifest.json` (note-based task management with pomodoro + time tracking)
- `plugins/obsidian-tasks-plugin/manifest.json` (task checklists + subtasks)

Rules:
- Subtasks in markdown notes can be started from inline controls and show live elapsed timers.
- Live XP display uses higher precision (3 decimals) while updating at 1s cadence to reduce CPU churn.
- Active session XP uses the same minutes/60 formula as points scoring to avoid inflation.
