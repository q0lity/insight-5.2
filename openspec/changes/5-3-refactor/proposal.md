# Change Proposal: 5-3-refactor

## Summary
Refactor the ecosystem pipeline (parsing, categorization, and planning UI) to eliminate duplicates, improve category memory, and align Tasks/Goals/Calendar behavior with the approved wireframes.

## Motivation
Current capture and planning flows produce duplicate events/tables, inconsistent categorization, and misaligned task/goal behaviors. This refactor hardens the parsing contract and makes the planning surfaces (Tasks, Goals, Calendar) consistent and predictable for launch-quality UX.

## Scope
### In scope
- Parser/linker v2: category memory, direct category prompt on low confidence, purchase vs consume split, tracker/context guardrails, dedupe rules.
- Review UX: auto-created tasks are preselected with opt-out.
- Tasks: adjustable columns (persist across devices), start button (timer + in_progress + calendar block), subtasks timeline, unscheduled tasks in all-day lane.
- Goals: outline + Gantt split panel, milestones + dependencies, unlink on goal removal.
- Calendar: all-day lane behavior, read-only calendars render locked events, auto-start default in onboarding.
- Countdown badges on any entity with a target date (tasks/events/goals/milestones).

### Out of scope
- Embedding-based categorization (Phase 2).
- Multi-user collaboration and sharing.
- Full analytics redesign beyond the outlined badges/guards.

## Acceptance criteria
- "Coding Insight" resolves to `Professional | Insight | Coding` using category memory.
- "Bought 2 monsters, drank 1" yields purchase items + separate consumption log.
- Low-confidence category triggers a direct picker with a preselected suggestion.
- Read-only calendars render as locked events and do not sync outbound.
- Unscheduled tasks appear in all-day lane and can be dragged into the time grid.
- Countdown badges appear anywhere a target date exists.

## Risks
- Cross-surface refactor may introduce regressions in capture and calendar rendering.
- Parser/linker changes may affect existing saved data and heuristics.
