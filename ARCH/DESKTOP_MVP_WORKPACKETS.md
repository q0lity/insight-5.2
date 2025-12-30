# Insight 5 — Desktop MVP Workpackets (“Agents”)

These are scoped, parallelizable work packages that turn the current desktop prototype into the behavior you described.

## Agent 01 — Filters + Query Model

**Goal:** every page (Timeline / Tasks / Habits / Dashboards) can filter by the same primitives, but filter state is **scoped to that page/dashboard** (not global).

- Canonical filter primitives:
  - time range (today / week / month / custom)
  - category + subcategory
  - tags
  - people
  - skills (freeform)
  - character (fixed Habitica stats)
  - project, goal (later)
- Output: a shared selector/query function that each view calls.
- Acceptance:
  - switching dashboard does not mutate filters on other dashboards
  - filters apply consistently to center view + lists + module computations

## Agent 02 — Life Tracker (Day/Week) Polish

**Goal:** make the calendar look “production-clean”.

- Day view:
  - tracker lane is right-anchored; dots sit on lane; stacking is predictable
  - events/tasks align to the hour grid; bottom edges line up
- Week view:
  - show per-day tracker “summary bubbles” (avg for numeric trackers like mood/energy)
  - show time spent by category with category→subcategory visual dividers
- Acceptance:
  - no layout drift on resize
  - multiple trackers within 10 minutes never overlap

## Agent 03 — Right Sidebar: Properties + Markdown Toggle

**Goal:** the selected item always has complete editable properties + markdown.

- Tabs/sections:
  - Properties (fields)
  - Markdown (generated/export view)
  - Linked items (tasks linked to event; logs linked to event)
- Acceptance:
  - edits update immediately
  - markdown reflects changes (or clearly indicates “regenerate”)

## Agent 04 — Tasks Page (TickTick-style MVP)

**Goal:** tasks feel like a real task manager.

- Views:
  - Inbox, Today, Upcoming, Projects (later)
  - Drag to reorder within a list
  - Drag to schedule onto the calendar (creates/updates a timeboxed task event)
- Actions:
  - “Start now” starts an active timed event linked to the task
  - task notes thread (captures/chat later) lives on the task
- Acceptance:
  - task extracted from an event is its own entry linked to the event
  - completing a task updates everywhere (calendar + tasks list)

## Agent 05 — Habits Page (Habitica-inspired MVP)

**Goal:** habits are quick to log and feed leveling.

- Components:
  - habit definitions (daily/weekly, optional target)
  - quick log (+1 / −1 / custom value)
  - streak + consistency indicators
- Scoring:
  - base points = difficulty * importance
  - optional streak multiplier
- Acceptance:
  - habit logs render in tracker lane (as logs) and/or as all-day blocks (configurable)

## Agent 06 — Workouts (see `Insight 5/ARCH/WORKOUT_MVP.md`)

**Goal:** workouts become structured, exportable, and drive dashboards.

## Agent 07 — Dashboards + Modules (Composable)

**Goal:** dashboard is modular and user-configurable.

- Dashboard behavior:
  - each dashboard has its own filters + chosen modules
  - modules can be reordered and removed
- MVP modules (your requested first set):
  - Time pie (category → subcategory drilldown next)
  - Time points chart (daily minutes)
  - Points chart (by category)
  - Points points chart (daily points)
  - Character radar (Habitica stats)
  - Skills radar (top skills)
  - Top People (time)
  - Top Locations (time)
- Acceptance:
  - user can create a “Project dashboard” and see time spent scoped to that project

## Agent 08 — Taxonomy + Canonical Keys

**Goal:** normalize keys like `@Mustafa` and keep character stats fixed.

- People: canonicalize by display name; later add aliasing
- Character: fixed Habitica stats (STR/INT/CON/PER)
- Skills: freeform, later merge/dedupe

## Two key decisions that unblock most work

- What are the **default dashboards** you want on first run (names + modules)?
- Category/subcategory starts with a fixed starter list (see `Insight 5/ARCH/STARTER_TAXONOMY.md`) and becomes bidirectional via learned suggestions.
