# Insight 5 — Agent Workplan (Dashboards + Tasks + Parsing)

This file describes “agents” as focused implementation tracks with clear acceptance criteria.

## Agent: UI/Polish
- Unify spacing/borders so all columns align (Vault / main / Details).
- Tracker lane: icon-only, collision-safe, right-aligned in Day/Week views.
- Replace raw markdown text areas with Edit/Preview markdown editor everywhere notes exist.

## Agent: Capture → Structured Autofill
- Attach-to-active-event notes: “Take note” action appends timestamped lines to event notes.
- Field enrichment rules (only fill empty by default):
  - Tags: from `#tags` + heuristics (work/clinic/workout/etc).
  - People: from `@mentions` and “with Dr/Doctor NAME”.
  - Location: from `@Place` or “at/in/to Place”.
  - Difficulty/Importance: keyword heuristics; allow manual override.
- Multi-add: split captures into multiple phrases and create linked entries (event/task/log) with de-dupe keys.

## Agent: Tasks (TickTick-style MVP)
- Sections: Today / Scheduled / Inbox / Completed; quick-add; drag reorder within section.
- Scheduling: drag task onto calendar to create a scheduled block; “Start now” creates active time block linked to task.
- Task detail: markdown notes + checklist toggles + optional “Ask (Local/Hybrid/LLM)” chat scoped to the task.

## Agent: Search (Local + Vectorized)
- Everything logged is searchable (Inbox + Calendar + Tasks + Logs).
- Local retrieval supports semantic ranking (“vectorized”) as a fallback when exact match fails.
- Hybrid mode: local retrieval → optional LLM answer when a key is configured.

## Agent: Dashboards
- Time charts: time pie + time-by-category/subcategory with dividers.
- Points charts: difficulty × importance × duration (hours) aggregation by day/week/month + goal/project rollups.
- Radar charts: character (STR/INT/CON/PER) + skills radar (top-N skills, time window configurable).

