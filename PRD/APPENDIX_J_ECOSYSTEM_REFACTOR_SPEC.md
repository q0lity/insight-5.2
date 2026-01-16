# Appendix J — Ecosystem Refactor Spec (Parsing + UI + Planning)

This appendix formalizes the refactor for parsing, categorization, and the UI surfaces that depend on them. It is the implementation contract for the "ecosystem" behavior.

## J0) Scope
- Fix duplicate events/tables and incorrect classification (event vs task vs habit vs tracker).
- Improve category/project/goal inference from history (e.g., "Coding Insight" => Professional/Insight).
- Add adjustable task columns, start buttons, and subtasks in Tasks.
- Rebuild Goals Plan: outline + Gantt in a split panel, sortable + movable.
- Improve habits/trackers consistency and eliminate low-signal noise (e.g., "Ep-4").
- Add purchase vs consume distinction and cost tracking.

## J1) Core Behavior Changes (High Priority)
1) Categorization engine must prefer ecosystem memory over generic defaults.
2) One spoken capture should never create duplicate blocks or duplicate table renders.
3) "Buy" is not "consume" (purchase vs intake are separate signals).
4) "Start now" verbs create events; habits are auto-checked when completed or implied by event.
5) Magic button uses last-known context to prefill categories, projects, habits, and trackers.

## J2) Parsing + Categorization Engine v2
### Pipeline (deterministic order)
1) Normalize text (clean fillers, unify tense).
2) Segment into blocks (time range, dividers, topic shifts).
3) Classify each block (event vs task vs note vs habit/trackers).
4) Resolve ecosystem links (goal/project/habit/skill/category/context).
5) Deduplicate/merge (same title + overlapping time + same category => merge).
6) Enrich (duration estimate, importance/difficulty, chips to minimum 5).

### Ecosystem Memory
- Use three signals, in order:
  1) Explicit tokens: `#tag`, `+context`, `@person`, `#tracker(...)`.
  2) Past matches: last 10 similar titles + top category path.
  3) Active context: active goal/project, time-of-day routine.
- Confidence thresholds:
  - >= 0.65: apply silently
  - 0.4–0.64: apply but show review chip
  - < 0.4: direct prompt to choose a category (default suggestion preselected; user can deselect)

### Category Resolution (hierarchical)
- Return `categoryPath[]` (ex: ["Professional", "Insight", "Coding"]).
- Use a synonym map (Insight => Professional/Insight).
- Prevent drift: if a known title has a stable categoryPath, prefer it.
- Auto-create tasks from extraction; review cards default to selected so users can deselect.

### Purchase vs Consume
- Purchase verbs: buy, bought, purchased, picked up, grabbed, got.
- Consume verbs: ate, drank, had, finished, consumed.
- Example: "Wawa, two monsters and a Gatorade 0; drank one monster"
  - Event: Personal/Errands/Wawa run (purchase items list)
  - Consumption log: Food/Drink/Monster (qty 1)

### Tracker/Context Guardrails
- Only create trackers if:
  - Matches a known tracker key, OR
  - In approved patterns (mood/energy/pain/etc.)
- Block trackers for episodic tokens (e.g., "Ep-4", "Episode 5") unless explicitly prefixed with `#tracker(...)`.
- Context normalization:
  - canonical keys: `bed` instead of `lying-in-bed`, `watch` instead of `watching-together`.
  - Use alias mapping to merge duplicates.

## J3) Magic Button Autofill
When pressed, prefill based on:
- Last active event signature (categoryPath, project, goal, habits, trackers).
- Time-of-day routines (morning/night routines).
- Calendar focus (current calendar block if within +/- 10 min).

Prefill must be editable and show confidence chips.

## J4) UI Wireframes (Additions)
### Notes Header (Expand button placement)
```
NOTES                               [Expand]
[Edit] [Outline] [Table] [Transcribe]
------------------------------------------------
```

### Tasks (Inbox) Table + Controls
```
Tasks     [Inbox] [Today] [Next 7] [All] [Done]   [Filter...]
Views: [Table] [Kanban] [Cards]    [Columns] [Sort]
--------------------------------------------------------------
| Start | Title | Tags | Priority | Due | Estimate | Goal | Project | Category | ... |
|  ▶   | Upload ILP | #upload | High | Jan 12 | 25m | -- | Residency | Personal/General |
|  ▾   | Check status of loan | #finance | Medium | -- | 15m | -- | -- | Finance/Budget |
--------------------------------------------------------------
Subtasks (row expand):
  - [ ] open website
  - [ ] upload ILP
```
Rules:
- `Start` button begins timer + marks as in_progress.
- `Columns` opens a checklist of properties (persisted per view).
- `Subtasks` are a collapsible drawer (per task).
- Category/Project are auto-suggested but editable inline.
- Remove the marketing tagline; keep a clean Tasks header + filters.
- Sorting applies to visible columns and persists per view.
- Unscheduled tasks surface in the all-day lane for drag-into-calendar behavior.

### Goals Plan Split Panel (Outline + Gantt)
```
Goal: Launch App                                   [Remove Goal]
--------------------------------------------------------------
Outline (drag to reorder)      |  Gantt (drag to reschedule)
 [ ] ▶ Scope MVP               |  |----|-----|-----|
   [ ] ▶ Parsing refactor      |  Parsing refactor (Jan 12-20)
   [ ] ▶ Tasks table           |  Tasks table (Jan 20-27)
 [ ] ▶ Mobile polish           |  Mobile polish (Jan 28-Feb 3)
--------------------------------------------------------------
```
Rules:
- Outline is the source of truth for ordering.
- Gantt updates when outline items move; dragging Gantt updates dates.
- Remove action requires confirmation modal; button sits bottom-right in Goal card.
- Outline shows goal-linked tasks (not events); project tasks appear as indented children.
- Goal-linked feed remains below the plan (unchanged).

### Habits Consistency (Add trend graph)
```
Consistency heatmap
Mini trend graph: done vs missed (last 30 days)
```

### Inspector (Category Builder)
```
Category: Food
Subcategories: Meal / Restaurant / Level 3
Cost: $__
```

## J5) Data Model Updates (Non-breaking, frontmatter-first)
- `frontmatter.categoryPath`: string[] for 3+ levels.
- `frontmatter.costUsd`: number for purchase events/tasks.
- `frontmatter.purchaseItems`: array of {name, qty, unit?}.
- `frontmatter.consumeItems`: array of {name, qty, unit?}.
- `frontmatter.subtasks`: array of {title, status, estimateMinutes?}.
- `frontmatter.magicPrefill`: {source, confidence, appliedAt}.

## J6) Implementation Plan (Spec-Driven)
1) Spec + test vectors (this doc + Appendix G updates).
2) Parser/linker v2 with dedupe + categoryPath.
3) Tasks table controls + subtasks + start button.
4) Goals split panel (outline + Gantt sync).
5) Habits/trackers cleanup (guardrails + dedupe).
6) Calendar auto-start + external sync alignment.

Defaults:
- Auto-start is enabled by default and configurable in onboarding.

## J7) Edge Cases to Cover
- "Coding Insight again" should re-use Professional/Insight.
- "I'm in bed" should not create "lying-in-bed".
- "Episode 4/5" should not create trackers or contexts.
- "Bought X, drank Y" splits purchase vs consumption.
- "Lunch at Panera, call during lunch" stays embedded, no overlap.
- "Night routine done" auto-checks mapped habits.

## J8) Test Plan (Minimum)
**Unit**
- Categorization: Insight => Professional/Insight
- Purchase vs consume split
- Tracker guardrail false positives
- Dedupe of duplicate blocks/tables

**Integration**
- Magic button prefill consistency with last event
- Goal outline drag updates Gantt and dates
- Task start button starts timer and status

**UI**
- Column selector persists per view
- Subtask drawer CRUD works
- Remove goal confirmation modal

## J9) Workstream Split (Parallelizable)
- Parser/Linker: taxonomy, dedupe, purchase/consume, guardrails.
- Tasks UI: columns, start button, subtasks, sorting.
- Goals Plan: outline + Gantt sync and removal flow.
- Habits/Health: consistency graphs, workout set rows, nutrition views.
- Calendar/Sync: auto-start + provider sync alignment.
