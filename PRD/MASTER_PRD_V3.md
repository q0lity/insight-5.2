# Master PRD v3 — Insight 5 (Voice-First Life OS)

> This is the implementation-ready PRD. It consolidates: `Reference/` requirements, Flutter behavioral prototypes, TaskNotes “language + views”, Nomie token capture, Life Tracker visualizations, Habitica gamification metaphors, and Task Genius time parsing/date inheritance patterns.

## Document Control
- Product: Insight 5
- Platforms: iOS, Android, Desktop (Electron)
- Backend: Supabase Postgres + Storage + Edge Functions
- Status: Draft v3 (ready for engineering breakdown)
- Change Log: `Insight 5/PRD/MASTER_PRD_CHANGELOG.md`
- Key references:
  - Requirements: `Reference/`
  - Voice/orchestration prototype: `flutter_app/`
  - Markdown/YAML language + saved views: `tasknotes-main-2/`
  - Tokens: `nomie6-oss-master/`
  - Dashboards/visualizations: `obsidian-life-tracker-base-view-main/`
  - Gamification patterns: `habitica-develop-2/`
  - Time parsing/date inheritance: `Obsidian-Task-Genius-master-2/`

## Appendices
- `Insight 5/PRD/APPENDICES.md`
- `Insight 5/PRD/APPENDIX_A_LANGUAGE_SPEC.md`
- `Insight 5/PRD/APPENDIX_B_SAVED_VIEWS_QUERY.md`
- `Insight 5/PRD/APPENDIX_C_UI_SPEC.md`
- `Insight 5/PRD/APPENDIX_D_BACKEND_AND_APIS.md`
- `Insight 5/PRD/APPENDIX_E_IMPLEMENTATION_PLAN.md`
- `Insight 5/PRD/APPENDIX_F_DATA_DICTIONARY.md`
- `Insight 5/PRD/APPENDIX_G_UTTERANCE_LIBRARY.md`
- `Insight 5/PRD/WEB_TO_MOBILE_PARITY_MATRIX.md`
- `Insight 5/PRD/CAPTURE_PIPELINE_SPEC.md`
- `Insight 5/PRD/IMPLEMENTATION_PLAN_MOBILE_CAPTURE.md`
- `Insight 5/PRD/MOBILE_IMPLEMENTATION_CHECKLIST.md`

## Table of Contents
0. One-Sentence Value Prop
1. Goals, Non-Goals, Success Metrics
2. Personas & JTBD
3. Core Concepts & Data Model (Product Level)
4. Scoring & Gamification
5. Language: Markdown + YAML + Tokens
6. Voice + MCP-Style Command Interface
7. Screens & Navigation (UI/UX)
8. Time Management & Timers
9. Analytics & Visualizations
10. Markwhen / Gantt / Project Timelines
11. Offline Strategy
12. Backend, APIs, and Key Management
13. Security & Privacy
14. Desktop App (Electron)
15. Settings & Onboarding (Intake)
16. Detailed User Flows (End-to-End)
17. Data Sync & Conflict Rules
18. Observability & Analytics (Engineering)
19. QA / Testing Strategy
20. Engineering Acceptance Criteria (MVP)
21. Roadmap (Phases)

## 0) One-Sentence Value Prop
The easiest journal to use (voice-first) with the most powerful analytics (structured, queryable life database).

## 1) Goals, Non-Goals, Success Metrics
### 1.1 Goals (MVP)
- Log life events, tasks, habits, trackers, and notes primarily via voice.
- Make captured data instantly useful through dashboards, views, and calendar/timeline.
- Enable “ultimate organization”: everything can link to goals/projects and be filtered by tags/context/people.
- Provide a motivating gamification layer without punitive mechanics.
- Make capture reliable: offline capture works; online parsing and sync complete the loop.

### 1.2 Non-Goals (MVP)
- Medical claims/compliance (e.g., HIPAA) beyond “privacy-forward” controls.
- Full nutrition accuracy or branded food database integration (POC only).
- Full offline LLM parsing (capture offline, parse later).
- Multi-user collaboration and sharing (single-user accounts only).

### 1.3 Success Metrics
- Capture latency (online): time from “stop recording” → review cards shown ≤ 5s p50, ≤ 12s p95.
- Offline reliability: 100% of offline captures persist locally and reach “ready to review” once online.
- Data usefulness: users can answer “what did I do yesterday / this week / around mood dips” using views without manual cleanup.
- Engagement: daily capture streaks, time tracked, and active goal-linked entries.

### 1.4 Constraints (Hard)
- Single-user per account (no sharing/collaboration in MVP).
- Supabase is the canonical source of truth (Postgres + Storage).
- Offline parsing is not required; offline capture must never lose data.
- No client-side LLM keys; all model calls are server-side.

## 2) Personas & JTBD
### 2.1 Primary Persona (MVP)
- Individual user who wants a life ledger: time, habits, tasks, health-ish trackers, and reflection—without manual data entry.

### 2.2 Core Jobs-To-Be-Done
- “Log what I’m doing/feeling right now with zero friction.”
- “Turn my raw thoughts into structured items (tasks/events/habits/trackers) automatically.”
- “See patterns: what affects mood/energy/stress; how time maps to goals.”
- “Plan and timebox my day, then review outcomes.”

## 3) Core Concepts & Data Model (Product Level)
### 3.1 Entities (User-Visible)
- Goal: e.g., “Get shredded”
- Project: e.g., “Strength cycle”
- Entry: the atomic record produced by voice/manual input; can have multiple facets:
  - `note`, `task`, `event`, `habit`, `tracker`
- Tracker (definition): e.g., Mood (1–10), Coffee (count), Sleep (hours)
- Tracker log: a timestamped value (often created from tokens)
- Saved View: “Bases-like” saved filter/sort/group configuration

### 3.1.1 Required Fields (MVP)
**Goal**
- title (required)
- importance 1–10 (required; used in XP multiplier)
- tags (optional)

**Project**
- title (required)
- status (active/paused/completed/archived)
- optional goal link

**Entry**
- title (required)
- facets[] (required, can be empty but should not be in practice)
- timestamps: start/end or createdAt
- tags/contexts/people tokens
- difficulty/importance/durationMinutes (optional, but required for XP computation)

**TrackerDefinition**
- key (e.g., `mood`)
- display name
- type + optional scale/unit

**SavedView**
- name
- query JSON (filter/sort/group)
- view type (list/chart/dashboard)

### 3.2 Relationship Rules
- A Goal has an importance (1–10) used for XP scaling across linked work.
- Projects may optionally belong to a Goal.
- An Entry can link to multiple goals/projects.
- A single spoken log can create:
  - a primary Entry (e.g., workout event)
  - additional Entries (e.g., “pick up dry cleaning” task)
  - tracker logs (e.g., `#mood(8)`)

### 3.3 Facet Semantics (MVP)
- `event`: time-bounded (start/end) or timeboxed (timer).
- `task`: has status, due/scheduled, and can be timeboxed.
- `habit`: can be a streakable behavior; an Entry can count toward a HabitDefinition.
- `tracker`: value logs and/or derived stats attached to an Entry.
- `note`: narrative content; can contain timestamped segments and dividers.

### 3.4 Habit Modeling (MVP)
We treat “habits” as:
- A user-defined HabitDefinition (name, goal/project links, default importance/difficulty, schedule/streak rules).
- A HabitInstance as a specific completion/logged occurrence, usually backed by an Entry.

MVP allowance: we can ship with “habit facet + streak inferred” first, but the database supports clean separation.

## 4) Scoring & Gamification
### 4.1 XP Formula (confirmed)
`xp = difficulty × importance × durationMinutes × goalMultiplier`

- difficulty: 1–10
- importance: 1–10
- durationMinutes: integer minutes
- goalMultiplier (confirmed): `goalMultiplier = 1 + goalImportance/10`
  - Goal importance 10 → multiplier 2.0 (+100%)
  - Goal importance 5 → multiplier 1.5 (+50%)
  - If multiple goals: default policy uses max multiplier (configurable later)

### 4.2 How values are set
- difficulty/importance can be:
  - inferred from language (“brutal” → difficulty 9) and/or
  - asked via clarification card and/or
  - defaulted from goal/project settings
- durationMinutes can be:
  - from a timer
  - from explicit utterance (“worked out 45 minutes”)
  - estimated if absent (configurable defaults per activity type)

### 4.3 Gamification Outputs
- Level: derived from cumulative XP
- Streaks: habits (and optionally daily journaling)
- Achievements: milestones (first week streak, 10 workouts, etc.)
- No punitive systems (no HP loss)

### 4.4 Habitica-like Interactions (MVP UX)
- Habits page supports “did it” (positive) taps; optional “missed” taps exist but do not punish—only track.
- Counters and streak visuals are prominent.

### 4.5 Trait/Skill Analytics (Phase 2)
References mention trait/skill “radar charts” and skill progression. For MVP:
- Trackers can represent traits/skills (`#focus(7)`, `#resilience(6)`).
Phase 2:
- Add dedicated “Traits” and “Skills” modules with radar charts and goal-linked progression.

## 5) Language: Markdown + YAML + Tokens
### 5.1 Why
- The “language” is the contract between voice, UI, and database.
- Markdown provides portability; YAML provides structure; tokens enable fast logging.

### 5.2 YAML Frontmatter (examples)
**Workout event + habit + trackers**
```yaml
title: "Workout — Chest"
facets: ["event","habit","tracker","note"]
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
goalMultiplier: 2.0
xp: 6480
trackers:
  - { key: "mood", value: 8 }
  - { key: "energy", value: 7 }
```

**Task extracted from a note**
```yaml
title: "Pick up dry cleaning"
facets: ["task"]
projects: ["Life admin"]
tags: ["errands"]
scheduled: "2025-12-13"
status: "open"
```

### 5.3 Token Conventions (confirmed)
- Trackers: `#mood(7)`, `#coffee(1)`, `#sleep(7h)`
- People: `@john`
- Context: `+gym`
- Tags: hierarchical `health/fitness`, `work/project-x`

### 5.4 Timestamped Dividers in Notes (confirmed behavior)
- Within an Entry, notes are stored as timestamped segments (offset minutes).
- Example output:
  - `+00m — Started studying cardiology`
  - `+12m — Key concept: …`
  - `+20m — Divider: “Tasks mentioned”`
  - `+20m — Task proposal: pick up dry cleaning`

### 5.5 Markdown Formatting Rules (MVP)
- All generated markdown should be stable and human-editable.
- YAML keys use consistent casing (camelCase) and ISO-8601 timestamps.
- Token text (`#mood(7) +gym @john`) is preserved in `frontmatter.tokens[]` and/or in the markdown body, but is also normalized into fields (trackers/contexts/people).
- Live capture shows a best-effort markdown preview in real time; canonical formatting is finalized after server-side parsing.
- Offline capture logs raw text with timestamp markers and defers divider/segment formatting until sync.

## 6) Voice + MCP-Style Command Interface
### 6.1 Capture Entry Points
- In-app “Quick Log” mic button.
- iOS Action Button → Quick Log (App Intents / Shortcuts).
- Android Quick Tile → Quick Log.
- Desktop: keyboard shortcut (phase 1.5).

### 6.2 Operating Modes
1) **Create mode**: new Entry/Entries.
2) **Active event mode**: append notes to the currently running event (explicit press to avoid ambiguity).
3) **Command mode**: “show today”, “start timer 25 minutes”, “schedule workout tomorrow 8am”.

### 6.2.1 Command Surface (MVP)
The app exposes a lightweight “assistant” panel (chat-like) that can:
- create tasks/events
- start/stop timers
- change current goal/project context
- open saved views

All assistant actions must produce a preview card before committing (unless explicitly configured otherwise).
Mobile capture is the highest priority surface for feature parity and reliability.
Command detection for live preview uses lightweight local heuristics; full parsing is server-side.

### 6.3 Deterministic Rulebook (MVP)
Based on `Reference/Natural Language Processing App Rules...`:
- Start-event intent: “I’m walking now”, “start workout”
- End-event intent: “I’m done”, “stop workout”
- Standalone note intent: “note to self…”
- If an active event exists:
  - inferred tracker/log facts (mood/energy/pain/nutrition/workout sets, etc.) **auto-attach** to the active event (no extra confirmation)
  - timestamped **segments/dividers** only append into the active event when the user is in **Active event mode** (explicit press) to avoid ambiguity
  - otherwise treat the utterance as create mode and propose linking to the active event
- Overlap:
  - Time-bounded events may overlap (work + phone call + commute can coexist).
  - Trackers are independent timestamped facts and can overlap any event window.
  - If a tracker is inferred from a capture that also creates an event, the default association is:
    - attach tracker logs to the primary event created by that capture, and
    - also keep them queryable as standalone tracker logs (not nested events).
  - “Active event mode” (explicit press) only controls whether the capture appends segments into an existing event; it does not prevent overlap.
 - Segments (no nested events):
  - “Sub-events” like “clinic then inpatient” are stored as timestamped segments/dividers inside one event (not as child events).
 - Past tense default:
  - Past tense statements create completed entries/tasks by default (e.g., “I bought apples” → completed checklist items).
  - “Forgot X” creates an open task by default.

### 6.3.1 Backdating / Future Dating Rules (MVP)
- If user says “yesterday” without a time, use a configurable default time anchor (e.g., 12:00).
- If user says “tomorrow 8am–9am”, create a scheduled event block.
- If an utterance creates a time range that crosses midnight, default to “end is next day” unless user chooses otherwise.
- If user speaks in past tense with no explicit time:
  - default to “earlier today” and mark completed
  - set `endAt` to the nearest `:00` or `:30` before now, then set `startAt = endAt - estimatedDuration`
  - if capture occurs shortly after midnight and the content clearly refers to “last night”, default to yesterday (configurable rollover window; default 00:00–03:00).

### 6.4 Voice Output Contract (Engineering)
The LLM returns JSON only:
```json
{
  "proposals": [
    {
      "type": "entry",
      "facets": ["event","habit","tracker","note"],
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
          {"exercise":"Push-ups","sets":1,"reps":100,"weight":0,"weightUnit":"bodyweight","rpe":8}
        ]
      },
      "noteSegments": [
        {"atOffsetMinutes": 0, "type": "note", "text":"Felt strong today."}
      ],
      "confidence": 0.82
    }
  ],
  "questions": [
    {
      "id": "q1",
      "prompt": "Link this to goal “Get shredded”?",
      "type": "single_select",
      "options": ["Yes", "No"],
      "appliesToProposalIndex": 0
    }
  ]
}
```

### 6.5 Clarification Policy
- Maximum clarifications per capture: configurable (default 3).
- If uncertain:
  - Create a “Suggested Task” card rather than auto-creating tasks silently.
- Users can “don’t ask again” per question type (stored in settings).

### 6.6 Voice → Workout Table Templates (MVP)
Templates:
- `strength`: exercise, sets, reps, weight, unit, RPE
- `cardio`: exercise, duration, distance, pace, RPE
- `mobility`: exercise, duration, notes

Examples:
- “I did 100 push-ups” → `{exercise:"Push-ups", sets:1, reps:100, weightUnit:"bodyweight"}`
- “Bench press 4 sets of 12 at 85 pounds” → 4 rows or one row with `sets=4, reps=12, weight=85`
Decision (MVP): default to a single row with `sets=4` unless the user enumerates sets explicitly.

### 6.4.1 Ledger-Style Multi-Format Export (Reference 2)

In addition to the structured JSON contract, Insight 5 supports exporting each capture/entry into a **ledger-style Markdown block** with parallel “formats” (human sections + machine sections), mirroring the working pattern in `Reference 2/`:
- Human: Timeline / Tasks / Notes / Trackers / Money
- Machine: DV EXPORT, TRACKER FIELDS, FULL CALENDAR SYNC, MARKWHEN DATA

This is primarily for **interoperability** (Obsidian-style workflows) and for making “one capture → many views” explicit. Details: `Insight 5/PRD/APPENDIX_H_LEDGER_MULTI_FORMAT_EXPORT.md`.

## 7) Screens & Navigation (UI/UX)
### 7.1 Global Navigation Layout (confirmed direction)
- **Left bar**: primary modules (Dashboard, Calendar, Timeline, Views, Habits, Fitness, Nutrition, Settings).
- **Underbar**: contextual actions (Quick Log, Start Timer, Quick Add, Search).
- **Right bar**: context panel (active goal/project, active timer, pending review cards, quick filters).

Desktop uses the same information architecture but with denser layouts and keyboard shortcuts.
Web UI is the source of truth; desktop and mobile must match web feature coverage.
Do not change fundamental web/desktop layouts; adapt mobile UX to reach parity.

### 7.2 Dashboard
**Purpose**: Today at a glance + quick capture.
Components:
- Today schedule (time blocks + events)
- Active timer card (if running)
- XP ring + level + “where XP came from” mini insight
- Streak summary
- Top trackers (mood/energy/etc.)
- Pending review cards badge

Acceptance criteria:
- One tap to start voice capture.
- One tap to start a timer.
- If offline, shows “pending capture” pill and still records.

### 7.2.1 Dashboard “Canned Views” (MVP)
Pinned views available out-of-the-box:
- Today (calendar + tasks)
- Inbox (untriaged tasks + pending review cards)
- Health (mood/energy/sleep heatmaps + workout count)
- Fitness (recent sessions + volume chart)
- Nutrition (recent meals + calories estimate trend)

Users can pin/unpin and reorder.

### 7.3 Voice Log Screen
States:
- Idle
- Recording
- Transcribing
- Parsing
- Review queue ready
- Offline pending

Acceptance criteria:
- Transcript preview is visible (when available).
- “End current event” is accessible during active event mode.
- During recording, show a live markdown preview with timestamp markers and segment dividers when detected.
- Simple commands should log a minimal event preview immediately (e.g., “Driving now”).

### 7.4 Review Cards (Tinder-like)
Cards represent proposed creations/edits:
- “Create task: Pick up dry cleaning”
- “Log tracker: Mood 8”
- “Link workout to goal: Get shredded”

Gestures:
- Swipe right: accept
- Swipe left: reject
- Tap: edit details
- “Apply all” button with summary

Acceptance criteria:
- User can complete review in < 30 seconds for 5–10 cards.

### 7.5 Calendar
Features:
- Day/week timeline (Tiimo-like blocks)
- Drag to reschedule
- Quick add by voice or typed NLP
- Timeboxing integration (timer → block)

Sync:
- Google 2-way
- Device calendar mapping (Apple/Android)

Acceptance criteria:
- Creating an event by voice appears on calendar immediately after confirmation.
- Conflicts show a card (choose which to keep).

### 7.5.1 Timeboxing & Editing (Eternity-inspired)
- Touch/drag to adjust event blocks.
- Quick “extend 10 minutes”, “split block”, “merge blocks”.
- Visual editing should be possible without re-running voice parsing.

### 7.6 Timeline
Chronological feed with filters:
- facet filters (task/event/habit/tracker/note)
- tags/contexts/people
- goals/projects
- “show me everything around mood dips”

### 7.7 Views (Bases-like)
Saved views support:
- filter tree (AND/OR groups)
- sort (date, importance, difficulty, tags)
- group/subgroup (tag then project, etc.)
- visualization type (list, heatmap, timeline, chart)

Acceptance criteria:
- User can pin 3–5 “canned views” to Dashboard.

### 7.8 Habits
Features:
- Habit list with streaks and counters
- “did it” button and optional “missed” tracking
- mini heatmap per habit
- habit-to-goal linking and default importance/difficulty

### 7.8.1 Habit Settings (MVP)
- Name
- Default goal(s)/project(s)
- Default importance/difficulty
- Schedule (daily/weekly/custom days)
- Reminder time(s)
- Streak rules (counts once/day vs multiple)

### 7.9 Fitness
Features:
- Workout sessions list
- Session detail with sortable exercise table
- Charts: volume over time, heatmaps, PR tracking (phase 2)
- Voice to row insertion: “100 push-ups” → exercise row

### 7.10 Nutrition (POC)
Features:
- Photo + voice “I had a McFlurry”
- Best-effort estimate (LLM) stored as editable fields
- Links to goal (“Get shredded”) and trackers (calories)

Nutrition acceptance criteria (MVP):
- Voice “I had a McFlurry” + optional photo yields an editable meal log entry.
- If user provides a brand/size (“large McFlurry”), store as text and estimate values with confidence score.

### 7.11 Entry Detail (Markdown-first)

### 7.12 Assistant (ChatGPT-style “Ask Insight”)

Add an always-available Assistant screen that can search and summarize the user’s own data (notes/tasks/events/habits/trackers) and propose actions via review cards.

- Default mode is **Local Search** (privacy-first).
- Optional mode is **LLM Answering** with explicit consent + minimal context.
- Must provide deep links from answers → Entry Detail / Details Panel.

Details: `Insight 5/PRD/APPENDIX_I_ASSISTANT_CHAT_SPEC.md`.
Dual view:
- Structured fields editor
- Markdown editor/preview
Supports:
- attachments
- segments/dividers
- backlinks (show related entries by tag/goal/project)

## 8) Time Management & Timers
### 8.1 Timer Types
- Countdown (e.g., 2-min brush teeth)
- Pomodoro (25/5)
- Stopwatch

### 8.2 XP Accrual During Timers
- XP accrues in minutes (durationMinutes).
- Live updates:
  - on timer completion, finalize minutes and compute XP
  - if paused/stopped, minutes tracked so far compute XP

### 8.3 Native Surfaces
- iOS:
  - Action Button (Quick Log / Start/Stop event)
  - Dynamic Island Live Activity (timer + XP)
- Android:
  - Quick Tile for capture
  - foreground notification for timer + quick actions

### 8.4 Multiple Timers (Phase 2)
References discuss multi-timer management. MVP ships with a single active timer per user; Phase 2 can add multiple concurrent timers with a switcher UI.

## 9) Analytics & Visualizations (Life Tracker-inspired)
Supported visualization families (MVP target set):
- Heatmap (GitHub-style)
- Timeline (tag-based)
- Line and bar charts
- Tag cloud (optional)
- Correlations (phase 1.5): “mood vs sleep vs workouts”

Visualization presets:
- mood → 1–10 heatmap
- exercise minutes → bar/line
- streaks → calendar heatmap

### 9.1 Correlations (MVP “lite”)
- Provide a “Related” panel for tracker entries:
  - show nearby events/entries within a time window (e.g., ±6 hours)
  - show simple correlations (trend lines) as exploratory—not medical conclusions
Phase 2 can add richer statistics.

## 10) Markwhen / Gantt / Project Timelines
MVP:
- In-app timeline and Gantt-like view for projects and tags.
- “Markwhen export” is optional (phase 2), but the model supports it.

## 11) Offline Strategy (MVP)
See `Insight 5/ARCH/OFFLINE_CAPTURE.md`.
Summary:
- Capture offline (audio + minimal metadata) → queue.
- Parse when online → review cards → commit.

## 12) Backend, APIs, and Key Management
### 12.1 Supabase Components
- Postgres schema: `Insight 5/DB/SUPABASE_SCHEMA_V1.sql`
- RLS: `Insight 5/DB/RLS_POLICIES_V1.sql`
- Storage buckets: `attachments`

### 12.2 Edge Functions (MVP)
- `transcribe_and_parse_capture`: accepts audio or transcript; returns proposals/questions
- `google_oauth_exchange`: handles OAuth token exchange (server-side)
- `google_calendar_sync`: creates/updates external events and writes mappings

### 12.3 Key Handling (privacy-forward)
- No API keys in clients.
- Keys live in Edge Function secrets only.

### 12.4 Supabase MCP (Tooling)
- Optional: Supabase MCP can be used to inspect schema, run migrations, and debug RLS.
- Not required to build; but helpful for faster iteration if configured.

## 13) Security & Privacy
- RLS per-user on every table.
- Default audio retention: delete after successful commit (configurable).
- “Export my data” (phase 1.5): export Entries as Markdown + JSON.
- “Delete my data” (phase 1.5): account wipe.

### 13.1 Data Retention Defaults (MVP)
- Audio: delete after successful parse+commit (default).
- Transcript: stored as segments (optional; can be disabled).
- Attachments: stored only when user explicitly adds photo/video.

## 14) Desktop App (Electron)
MVP goal:
- Same features as mobile for review/edit/calendar/views.
Desktop extras:
- Keyboard-first navigation
- Fast search
- Optional global hotkey (phase 2)

## 15) Settings & Onboarding (Intake)
### 15.1 First-Run Intake (MVP)
Purpose: build the “reference file” (your personal schema defaults) so parsing and scoring feel accurate from day 1.

Intake steps:
1. Choose top goals (create 1–3):
   - title
   - importance (1–10)
2. Choose baseline trackers:
   - mood (1–10), energy (1–10), stress (1–10), sleep (hours), caffeine (count)
3. Choose default contexts and people (optional).
4. Choose default privacy settings:
   - audio retention (default: delete after commit)
   - transcript retention (default: on)
5. Choose calendar settings:
   - connect Google (optional but recommended)
   - enable device calendar access (iOS/Android)

### 15.2 Settings (MVP)
**Scoring**
- default difficulty/importance for activity types (workout, study, meal, etc.)
- goal multiplier rule (fixed formula, already confirmed)

**Voice & AI**
- clarification limit (default 3)
- auto-create vs suggest thresholds
- language/locale

**Data**
- export (phase 1.5)
- delete account/data (phase 1.5)

**Notifications**
- habit reminders
- timer completion notifications

## 16) Detailed User Flows (End-to-End)
### 16.1 Quick Log (in-app, online)
1. Tap mic.
2. Record: “I worked out for 45 minutes, brutal, felt great #mood(8) +gym”.
3. Stop recording.
4. App transcribes → parses → shows review cards:
   - Create workout entry (event+habit)
   - Confirm difficulty/importance if missing
   - Create tracker logs for mood
5. Swipe accept → entry is created and appears in:
   - Calendar (time block)
   - Fitness page (session)
   - Dashboard (Today feed)
6. During recording, live markdown preview is updated in place with segments/dividers.

Edge cases:
- If duration not spoken: propose estimate based on template + ask one question.
- If goal not specified: propose linking to the most relevant goal (top goal) as a card.

### 16.2 Quick Log (offline capture → parse later)
1. Tap mic (or Action Button).
2. Record audio; stop.
3. App stores `pending_capture` locally and shows “Pending (offline)” chip.
4. When online returns:
   - upload → parse → show cards → confirm → commit to Supabase.

### 16.3 Active Event Mode (studying example)
1. Start event: “Start studying medicine for 90 minutes.”
2. Timer starts; Live Activity/notification begins.
3. During event, user explicitly taps “Add note” mic:
   - “Key point: beta blockers reduce…” (stored as segment with timestamp)
   - “Also pick up dry cleaning” (becomes suggested task card after event)
4. End event: “I’m done.”
5. Review cards appear for extracted items (tasks, tags, trackers).

### 16.4 Workout table capture (voice → rows)
Example utterances and expected result:
- “Bench press 4 sets of 12 at 85 pounds, RPE 8.”
  - One row: exercise=Bench press, sets=4, reps=12, weight=85, unit=lb, rpe=8
- “100 push-ups.”
  - One row: exercise=Push-ups, sets=1, reps=100, unit=bodyweight

### 16.5 Meal capture (photo + voice, POC)
1. Add meal → take photo → speak “large McFlurry.”
2. App stores attachment + creates nutrition log with estimated values + confidence.
3. Show card: “Is this correct?” → user edits calories/macros.

### 16.6 Task extraction (auto-create vs suggest)
Rule:
- High confidence imperative (“remind me to…”, “don’t forget…”, “I need to…”) → auto-create task.
- Lower confidence (“maybe I should…”, ambiguous noun phrase) → suggested task card.

## 17) Data Sync & Conflict Rules
### 17.1 Source of Truth
- Supabase is canonical for both web and mobile (Postgres + Storage).
- Local stores (IndexedDB/on-device) are cache + outbox only; all writes must sync to Supabase and reconcile on reconnect.

### 17.2 Conflict Policy (MVP)
- Default: last-write-wins for simple fields.
- If both sides changed “time block” fields (start/end) → show conflict resolution card.

### 17.3 Calendar Sync Conflicts
- Google edits vs in-app edits:
  - If event is linked (external ID), detect changes via etag.
  - If conflict, show “Keep Google / Keep App / Merge notes” card.

## 18) Observability & Analytics (Engineering)
MVP telemetry (privacy-forward, minimal):
- capture pipeline timings (record/transcribe/parse)
- error codes (no transcript content)
- sync failures and retry counts

## 19) QA / Testing Strategy
MVP test layers:
- Domain unit tests (scoring, parsing helpers, token parser)
- Integration tests (Supabase RLS, migrations)
- E2E smoke tests (voice pipeline mocked, review cards, create entry, calendar render)

## 20) Engineering Acceptance Criteria (MVP)
### 20.1 Voice Logging
- Works online and offline.
- Produces proposals + cards and persists confirmed entries to Supabase.

### 20.2 Core Pages
- Dashboard, Calendar, Habits, Fitness, Nutrition (POC), Timeline, Views, Entry Detail exist and are navigable.

### 20.3 Sync
- Auth + RLS validated (user cannot read other users).
- Google calendar events map to entries with external IDs.

### 20.4 Beauty
- Design system defined and applied consistently (typography, spacing, motion).
- Cards and charts look polished and intentional.

## 21) Roadmap (Phases)
- Phase 0: Supabase init + monorepo scaffolding
- Phase 1: Voice capture + review cards + entries + dashboard
- Phase 1.5: Views + visualizations + export + improved correlations
- Phase 2: Markwhen export, richer fitness PRs, nutrition DB integration, sensors/imports
