# MOBILE FEATURES PRD (Living)

Source of truth for mobile-first scope, workflows, and screen vision.
Focus screen stays as-is per request.

## Inputs Reviewed
- `Mobile Screenshots/` (Dashboard, Habits, Explore, More, Calendar, Tasks, Focus)
- Existing mobile app structure in `Insight 5/apps/mobile`

## Product Principles
- Mobile-first capture and action: one tap to start/stop and annotate live activity.
- Events are the spine; tasks, trackers, and notes attach to the active event.
- Voice-first, but every action has a simple tap fallback.
- Local-first with sync; privacy as default.

## Navigation (Mobile)
Bottom nav stays: `Dashboard | Habits | Capture (FAB) | Calendar | Tasks | More`.
Explore search lives under `More` or as a swipe-up on Dashboard.
Focus screen remains unchanged (existing design).

## Core Entities + Language Tokens (Proposal)
These map to the “language of the program.”
- Category/Subcategory/Event: title triple (e.g., `Transport / Driving / Commute to work`)
- #tag: tag
- @person: person
- +context: context (car, at desk, at clinic)
- #tracker(value): tracker entry (e.g., `#mood(7)`)
- [ ] task: task
- Note blocks: markdown with `---` separators

Open question: use `+context` (current desktop/mobile code) or switch to `*context` as you suggested.

## Global UI Patterns
- Active Event Ribbon: pinned at top of Dashboard/Calendar/Tasks. Tap to open event.
- Capture Sheet (FAB): voice, quick text, photo, video, location, tracker.
- Live Activity: iOS Dynamic Island + Lock Screen for active event/task.
- Chips everywhere: tags/people/contexts/trackers as tappable chips.
- Dual transcript: Raw timestamped transcript + formatted segmented view.

## Screens (Vision + Wireframes)

### 1) Dashboard (Today / Active)
Purpose: start/stop, see current activity, quick insights, quick capture.
```
[Active Event Ribbon: "Driving to work" 06:15- ]
[Focus Card: Start/Stop, XP, timer]
[Today's Timeline: cards w/ chips]
[Quick Actions: Log tracker | Add task | Add note]
```
Features:
- “Are you leaving?” nudge when a calendar event is near + location suggests delay.
- Timeline cards show triple title + chips + quick edit.

### 2) Capture (FAB modal)
Purpose: fastest intake with auto-structure.
```
[Mic Button] [Stop]
[Text Area]
[Chips: #tags @people +context #tracker]
[Attachments: photo/video/audio]
```
Features:
- Segment detection -> auto `---` separators in notes.
- “Start event now” or “Log as note/task/tracker.”

### 3) Calendar
Purpose: schedule + imported calendar events + annotations.
```
[Day/Week Toggle]
[Timeline blocks]
[Imported event badge]
[Tap event -> detail + annotate]
```
Features:
- Auto-start suggestions when calendar + location + time align.
- Event annotations feed directly into event notes.

### 4) Tasks
Purpose: tasks list with start button + inline timer.
```
[Plan Outline (markdown)]
[Category Section]
[Task Card: checkbox + title + duration + Start Focus]
```
Features:
- Start task timer from list (keeps parent event context).
- Task completion yields XP bonus if on-time.
- Task can be linked as a subtask within active event.

### 5) Focus (Locked)
Keep current Focus screen layout and interaction.
Additions are behavior-only:
- Focus ties to active event.
- Notes can insert timestamps and `---` segments.
- Background timer updates live activity.

### 6) Habits
Purpose: streaks + XP + quick check-in.
```
[Habit list + streaks]
[Quick log tracker]
[Weekly mini chart]
```
Features:
- Habit completion can attach to an event.
- Habit streak + XP summary.

### 7) Explore / Search
Purpose: ChatGPT-style search across events, notes, trackers.
```
[Ask box]
[Smart filters: #tags @people +context #tracker]
[Answer + sources]
```
Features:
- Natural language query (“What did I log about driving?”).
- Source highlights + jump to note block.

### 8) Health & Nutrition (in More)
Purpose: workouts + meals + recovery, sync to Apple Health.
```
[Workout Log: strength/cardio/mobility]
[Meal Log: food list + macros]
[Recovery/Wellness trackers]
```
Features:
- Meal parsing with estimated macros (food database).
- Workout templates + quick logging.
- Sync: Apple Health (iOS) / Google Fit (Android).

### 9) People / Places / Tags
Purpose: organize context + quick filters.
```
[List + usage counts]
[Tap -> related events/tasks]
```

### 10) Settings
Purpose: permissions, sync, privacy, integrations.
```
[Auth + Sync]
[Calendar Import]
[Location + Health permissions]
[Security + Encryption]
```

## Key Workflows (Mobile)

### A) Driving to Work (Auto-Event + Live Activity)
1) Tap action button or speak: “I’m driving to work.”
2) App creates event: `Transport / Driving / Commute`.
3) Context `+car`, location tracked.
4) Live Activity starts. Prompt: “Did you leave at 06:15?”
5) User confirms; event start time updates.

### B) Event with Subtasks
1) Event “Work / Clinic / Patient Rounds.”
2) Add subtasks in notes or voice: `[ ] sign notes`, `[ ] admin tasks`.
3) Start a task; timer runs while event remains active.
4) Task completes → XP bonus if on-time.

### C) Segmenting Notes (Blocks)
1) Raw transcript stored with timestamps.
2) App detects topic shift → inserts `---`.
3) Each block becomes a segment: transport, lunch, admin, etc.
4) Segments can be re-labeled and extracted to tasks/events.

### D) Lunch / Nutrition
1) “I had a salad with…” → create meal segment.
2) If no time, use default duration (15–30m).
3) Estimate macros + sync to health data.

## ML / Pattern Learning (Progressive)
Goal: learn your routines and reduce manual input over time.
- Phase 1 (Rules + Heuristics): time-of-day + location + calendar.
- Phase 2 (Embeddings + Personal Model): predict likely event type, duration, tags.
- Phase 3 (Behavioral prompts): proactive “Are you leaving?” or “Start focus?”

Privacy approach:
- Store features on-device; opt-in for cloud learning.
- Only send summaries/embeddings, not raw audio, unless user opts in.

## Integrations
- Calendar import: iOS EventKit, Google Calendar (via OAuth).
- Location: geofences for home/work, “arrived/left” triggers.
- Apple Watch: action button to start/stop event, quick voice note.
- Live Activity: ActivityKit for iOS, persistent notification on Android.

## Security Protocol (Draft)
- Local-first storage encrypted on-device.
- Supabase with RLS per-user.
- Key management: device key + optional passcode/biometric.
- Minimal PII logging; redact audio after transcript (configurable).

## What Works on Mobile vs What Won’t (Yet)

Works well on mobile (v1):
- Voice capture + event creation + task start/stop
- Calendar annotations
- Notes with chips + markdown
- Focus timer + XP
- Basic tracker logging

Requires native build (not Expo Go, not web):
- Live Activities (Dynamic Island)
- Apple Watch integration
- Background location tracking
- HealthKit writes

Platform-specific:
- Apple Health on iOS only
- Google Fit on Android only

Not in MVP (proposed later):
- Full automatic calorie/macros without food DB
- Real-time, always-on “auto-start event” without battery tradeoffs
- Multi-user/shared workspaces

## Open Questions
- Confirm token language: keep `+context` or switch to `*context`?
- What are the exact top-level categories we lock in?
- Default duration for time-less events: 15m, 20m, or 30m?
- Use Apple Health only, or also Google Fit from day 1?
- Which calendar sources are priority (Apple, Google, Outlook)?
