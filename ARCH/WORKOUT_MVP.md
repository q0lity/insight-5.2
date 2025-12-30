# Insight 5 — Workouts (MVP Proposals)

Goal: when you capture “I worked out” (or a workout token), Insight creates a workout **Event** (timeboxed) + optional **tracker logs** (mood/energy/etc), and the event always has a readable **Markdown view**.

## Shared Concepts (all MVPs)

- **Data**
  - `category`: `Health`
  - `subcategory`: `Workout`
  - `kind`: `event` (timeboxed)
  - Optional linked `tasks` (e.g., “Buy protein” extracted from the workout note)
- **Scoring (Habitica-aligned, simple)**
  - `points = difficulty (1–10) * importance (1–10) * duration (hours)`
  - Optional multipliers later: `goalMultiplier`, `streakMultiplier`, `durationMultiplier`
- **Markdown (always available)**
  - Toggle: `Pretty` (structured UI) ⇄ `Markdown`
  - The Markdown is the canonical “portable” representation and can be exported to Obsidian.

## MVP 1 — “Quick Workout” (1–2 days)

### Capture → Create
- Detect workout intent (“worked out”, “gym”, “run”, “lifted”, “yoga”, “cardio”, “stretched”).
- Create a workout event with inferred `startAt/endAt`:
  - If user says “right now / starting”: start now, end = start + 45m (editable).
  - If user says a duration (“for 30 minutes”): end = start + duration.

### Workout fields (right sidebar)
- Type: Strength | Cardio | Mobility | Sport | Other
- Duration (min)
- Difficulty (1–10 slider)
- Importance (1–10 slider)
- Notes (freeform)

### Markdown template (auto-generated)
Use a small, stable table that is readable in Obsidian:

- `## Workout`
- `| Field | Value |`
- `| --- | --- |`
- `| Type | Strength |`
- `| Duration | 45m |`
- `| Difficulty | 7/10 |`
- `| Importance | 8/10 |`
- `| Points | 56 |`
- `| Notes | ... |`

## MVP 2 — “Structured Sessions” (3–7 days)

### Structured blocks (within the workout)
Split the workout into 3 optional sections:
- **Cardio** (time/distance/intensity)
- **Strength** (exercise + sets/reps/weight/RPE)
- **Mobility/Stretch** (duration + focus areas)

### Token grammar (fast entry)
Examples (not final, but workable):
- `+workout(strength)` / `+workout(cardio)`
- `#strength bench 3x5 @135 rpe8`
- `#cardio run 30m zone2`
- `#mobility hips 10m`

### Export
- Markdown includes a summary table + per-section subtables.

## MVP 3 — “Analytics + Habitica Loop” (1–2 weeks)

### XP + stats
- Convert `points` into:
  - `XP` (global)
  - Habitica stats deltas (INT/STR/CON/PER) based on workout type
- Add streak bonuses (weekly consistency) + “missed workout” decay (optional).

### Dashboards
- Modules:
  - Time spent by workout type (week/30d)
  - Strength volume (sets/reps/tonnage)
  - Cardio minutes + zones
  - Recovery overlay (sleep/energy/mood correlation)

## Open Choices (need your pick)

- Do you want **default duration** for “starting workout now” to be `30m`, `45m`, or `60m`?
- For Strength, do you prefer **RPE** or **difficulty** as the primary intensity driver (or both)?
- Should workouts always award XP, or only when you mark them “complete”?
