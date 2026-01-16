# Plan Options (A/B/C)

Goal: Deliver the 5.3 ecosystem refactor (parsing + planning UI + calendar rules) with launch-ready behavior.

Inputs:
- Research: not run yet
- Project conventions: `openspec/project.md`

## Option A — Minimal scope
Scope:
- Parser/linker v2 (category memory, direct prompt, purchase/consume, guardrails, dedupe).
- Review UX defaults (auto-selected tasks with opt-out).
- Calendar read-only events + all-day lane behavior.

Verification:
- Manual parser spot-checks with utterance library.
- Calendar UI sanity checks.

## Option B — Balanced (recommended)
Scope:
- Option A plus Tasks table (columns, start button, subtasks timeline, all-day unscheduled tasks).
- Goals plan split panel (outline + Gantt sync) and countdown badges.

Verification:
- Targeted UI verification for Tasks/Goals/Calendar.
- Add parser/linker tests for purchase/consume and dedupe.

## Option C — Max scope
Scope:
- Option B plus Habits/trackers consistency graphs and routine auto-check rules.
- Calendar onboarding defaults + additional countdown surfaces.

Verification:
- Expanded manual QA across Habits/Trackers, Tasks, Goals, Calendar.
- Additional parser/linker test coverage where applicable.
