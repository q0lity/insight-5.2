# Master PRD v2 — Insight 5 (Voice-First Life Tracker)

## 1) Product Summary
Insight 5 is a **voice-first life operating system** that turns natural speech into a structured, queryable personal database: **goals → projects → tasks/events/habits/trackers/notes**. The core loop is:

1. Speak (Action Button / in-app mic).
2. App transcribes and proposes structured entries.
3. You confirm/edit via swipe cards.
4. Data persists to Supabase and appears instantly in dashboards, calendar, and analytics.

## 2) Core Principles
- **Voice-first, not voice-only**: voice capture is default; everything remains editable.
- **Deterministic rules + AI assistance**: consistent behavior + clarification cards for uncertainty.
- **Portable language**: every item can be represented as **Markdown + YAML frontmatter**.
- **Privacy-forward**: per-user access controls, minimal retention of sensitive audio by default.
- **Beautiful UX**: calm, modern, high-contrast typography, clear hierarchy, “one-tap” logging.

## 3) Platforms
- **Mobile**: iOS + Android (React Native).
- **Desktop**: macOS/Windows (Electron, shared domain logic).

## 4) Entities & Relationships
### 4.1 Canonical Entities
- **Goal**: high-level objective (e.g., “Get shredded”).
- **Project**: scoped initiative under a goal (e.g., “Cut phase”, “Strength cycle”).
- **Entry**: atomic log item that can have multiple facets:
  - `note`, `task`, `event`, `habit`, `tracker`
  - one utterance can produce multiple Entries
  - one Entry can be both `event` + `habit` (e.g., workout session)
- **TrackerDefinition**: user-defined trackers (mood, energy, calories, etc.) with type + scale.
- **TrackerLog**: a value logged against a tracker at a timestamp (often created from token syntax).
- **Attachment**: photo/video/audio/transcript linked to an Entry.
- **SavedView**: Bases-like saved filter/sort/group configuration for lists/charts.

### 4.2 Relationship Rules (MVP)
- An Entry can link to **0..N Goals** and **0..N Projects**.
- A Goal can have default scoring weights used by linked Entries.
- A “Workout” Entry:
  - facet: `event` (time-bounded)
  - facet: `habit` (counts toward streak)
  - emits TrackerLogs (e.g., `#mood(8)`, `#energy(7)`)
  - can include a structured “workout table” payload.

## 5) Scoring & Gamification
### 5.1 XP formula (confirmed)
`xp = difficulty × importance × durationMinutes × goalMultiplier`

- `difficulty`: 1–10
- `importance`: 1–10
- `durationMinutes`: integer minutes (from timer, explicit spoken duration, or inferred estimate)
- `goalMultiplier` (confirmed):
  - `goalMultiplier = 1 + goalImportance/10`
  - if multiple goals are linked, default is to use the **max** multiplier (policy can be changed later)

### 5.2 No punishment
- No HP loss.
- Streaks and achievements only add motivation (badges, progress visuals, optional rewards).

## 6) Language (Markdown/YAML + Tokens)
### 6.1 YAML frontmatter (example)
```yaml
title: "Workout — Chest"
facets: ["event","habit","tracker"]
goals: ["Get shredded"]
projects: ["Strength cycle"]
tags: ["health/fitness","strength/chest"]
contexts: ["gym"]
people: []
startAt: "2025-12-13T16:00:00-05:00"
endAt: "2025-12-13T16:45:00-05:00"
difficulty: 8
importance: 9
durationMinutes: 45
xp: 1296
```

### 6.2 Token conventions (confirmed)
- Trackers: `#mood(7)`, `#coffee(1)`, `#sleep(7h)`
- People: `@john`
- Contexts: `+gym`
- Hierarchical tags: `health/fitness`, `work/project-x`

## 7) Voice Pipeline (MVP)
### 7.1 Capture surfaces
- **In-app mic** (primary).
- **iOS Action Button** via App Intents/Shortcuts (Quick Log).
- **Dynamic Island / Live Activity** for active timers and XP accrual.
- **Android Quick Tile + foreground notification** for active timers.

### 7.2 Parse contract (LLM output schema)
LLM returns JSON only:
```json
{
  "proposals": [
    {
      "type": "entry",
      "facets": ["event","habit","tracker"],
      "title": "Workout — Chest",
      "startAt": "ISO8601 or null",
      "endAt": "ISO8601 or null",
      "durationMinutes": 45,
      "difficulty": 8,
      "importance": 9,
      "goals": ["Get shredded"],
      "projects": ["Strength cycle"],
      "tags": ["health/fitness","strength/chest"],
      "tokens": ["+gym","#mood(8)","#energy(7)"],
      "workoutTable": {
        "template": "strength",
        "rows": [
          {"exercise":"Push-ups","sets":1,"reps":100,"weight":0,"uom":"bodyweight","rpe":8}
        ]
      },
      "notes": [
        {"atOffsetMinutes": 0, "text":"Felt strong today."}
      ],
      "confidence": 0.78
    }
  ],
  "questions": [
    {
      "id": "q1",
      "prompt": "Was this workout at the gym (+gym)?",
      "type": "single_select",
      "options": ["Yes (+gym)", "No", "Don’t ask again"],
      "appliesToProposalIndex": 0
    }
  ]
}
```

### 7.3 Confirmation UX (cards)
- Create proposals immediately.
- Auto-create tasks when confidence is high.
- If confidence is low, create a **Suggested Task** card instead of committing silently.

## 8) Screens (MVP set)
- **Dashboard**: Today overview, XP/level ring, streaks, top trackers, quick log.
- **Calendar**: day/week timeline, timeboxing, drag/drop, event detail.
- **Habits**: Habitica-like interactions (positive reinforcement), streaks, counters.
- **Fitness**: workout logs, sortable table views, charts and heatmaps.
- **Nutrition (POC)**: photo + voice → best-effort estimate + editable log.
- **Timeline**: filterable feed by tags/projects/facets.
- **Views (Bases)**: saved filters/sorts/groups, with visualization cards.
- **Entry Detail**: Markdown editor/preview + structured fields + attachments.

## 9) Data & Sync Architecture
### 9.1 Cloud
- **Supabase Postgres** for canonical state (RLS).
- **Supabase Storage** for attachments.
- **Supabase Edge Functions** for:
  - server-side LLM calls (keys never on device)
  - Google OAuth token exchange + calendar sync jobs

### 9.2 Local/offline
- **SQLite** cache + offline queue:
  - capture voice/transcripts offline
  - sync later with conflict rules

## 10) Calendar Sync (Day 1)
- **Google Calendar 2-way**: OAuth, external ID mapping, update/delete handling.
- **Apple “sync”**: device calendar integration (EventKit iOS, Calendar Provider Android).

## 11) Privacy & Security
- Default: do not persist raw audio long-term; persist transcripts + structured entries.
- Per-user isolation via RLS; no client-side API keys.

## 12) MVP Build Order
1. Supabase schema + RLS + migrations.
2. RN + Electron monorepo scaffolding (shared domain/types).
3. Voice capture → transcribe → parse → review cards → commit.
4. Timers + XP accrual + Live Activity/notification surfaces.
5. Calendar sync + external ID mapping.
6. Dashboard + saved views + visualizations.
