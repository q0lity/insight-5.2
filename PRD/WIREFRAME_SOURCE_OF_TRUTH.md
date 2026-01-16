# Wireframe Source of Truth (Capture + Outline + Entry Detail)

This document is the canonical UI and parsing contract for capture, live outline, and entry detail. It is the reference for wireframes and parser behavior and must stay in sync with `PRD/MASTER_PRD_V3.md`, `PRD/APPENDIX_A_LANGUAGE_SPEC.md`, and `PRD/CAPTURE_PIPELINE_SPEC.md`.

## 1) Non-Negotiables
- Maximum linkers: every block must attempt to attach goals, projects, habits, skills, tags, contexts, people, and trackers.
- Bullet-journal blocks are the canonical capture output.
- Live outline mirrors final structure in real time.
- Notes, tasks, and sections are optional and only render if they exist.
- Titles are never duplicated or shown as placeholder "New" once a real title exists.
- Meals and workouts always populate their specialized tables (nutrition or fitness).
- Spoken "right now / I'm going to do X now" creates an **event** (not a task) and can start active tracking.
- Spoken intent that implies immediate start ("I'm gonna run", "about to start") starts the event + habit flow.
- Tasks and events use the same pane and layout; tasks are only different in that they are checkable.
- No overlapping calendar events by default; in-event actions become embedded blocks/segments that are searchable but not rendered as separate time blocks.
- Emotion tracking uses a 1–10 scale with qualitative labels; mood words map to mood, other emotions map to separate trackers.
- Each block should reach **at least 5 tags/chips** by expanding from the ecosystem (category, subcategory, goal, habit, skill, context).
- Duration estimates are derived from personal history (recent entries) and show a delta vs baseline.
- Importance/difficulty default from linked goals/projects and display the bonus multiplier logic.
- Tracker logs and habit completions render on the Calendar as small markers anchored to time (clickable to drill into details).
- Habit completions must be visible as a log line in notes/timeline, not just streak counters.
- Table views never render twice for the same entry (single table per facet).
- Points/Running tiles are not shown in entry detail; they live in analytics only.

## 2) Canonical Block Format (Bullet Journal)
Each capture is segmented into blocks separated by horizontal dividers. A block is the atomic unit that becomes an Entry. Blocks can be events, tasks, notes, or hybrids.

**Block header (UI)**
- Time badge (clock icon in UI)
- Title
- Chips row (tags, goals, habits, skills, projects, contexts, people, trackers)

**Sections (UI)**
- Notes (collapsible, only if notes exist)
- Tasks (collapsible, only if tasks exist)
- Tables (for workouts or meals)

**Divider**
- `---` between blocks.

**Live outline update rules**
- Stream into the current block until a divider or a new time range is detected.
- Update chips row as linkers are inferred; do not show a "properties" label.
- If tasks are spoken inside a note, keep them in notes and also extract into the Tasks section.
- Activity statements that imply immediate action should create event blocks, not tasks.

**Embedded blocks (inside events)**
- Used when an action happens during a parent event (e.g., call during lunch).
- Render as their own block with a divider and time badge, but inherit the parent event time range.
- Searchable and editable like any block, but do not create a separate calendar event.

### 2.1 Block UI Example (Live Outline)
```
[09:12] Call John Wilson about missed opportunities
chips: #calls @johnwilson +phone goal:Get Connected habit:Outreach skill:Sales
notes:
- text him if I can't call
tasks:
- [ ] > Call John Wilson about missed opportunities
- [ ] > Text John Wilson with well wishes (if not calling)
---
[10:05] Financial tutoring planning
chips: #tutoring project:Financial Tutoring
notes:
- worked on tutoring planning
tasks:
- [ ] > Evaluate tutoring as long-term strategy
```

Notes:
- The UI renders chips as tokens; the textual line above is a display aid for the wireframe.
- Use a simple caret/chevron icon for collapsible sections (no decorative iconography).

## 3) Bullet Types and Signifiers (BuJo)
Use the bullet journal task types as defined by `plugins/bujo-bullets`:
- `[ ]` incomplete
- `[x]` complete
- `[-]` canceled
- `[>]` migrated
- `[<]` scheduled
- `[o]` event

Signifiers add meaning to tasks and are rendered as small badges. Default signifiers are `!` (priority) and `?` (follow-up). We also support an action signifier token (ASCII) that renders as a triangle icon in the UI.

Example:
```
- [ ] > Call John Wilson about missed opportunities
- [ ] ! Priority follow-up for billing
- [ ] ? Ask about referral timeline
```

## 4) Entry Classification (Event vs Task vs Note)
**Event**
- Immediate or time-bounded action: "I'm going running right now", "work 9–12", "meeting at 2".
- Creates an event block; may start active tracking if "now" or "start" is present.
- Habit/intention phrasing for physical actions ("I'm gonna run", "going to the gym") defaults to event + habit, not a task.

**Task**
- Intent/imperative or later action: "remind me to call", "I need to email", "text John later".
- Creates a task facet; task is checkable but still appears in the same entries list as events.

**Note**
- Pure narrative with no action or time: "Thinking about strategy for tutoring".

If unclear, default to event when the user describes a physical/active verb and uses "now" or a concrete duration.

## 5) Task Scope: Inline vs Global
We must distinguish tasks meant to be done during an event (inline tasks) vs tasks meant for later (global tasks).

**Definitions**
- Inline task: belongs to the current event and stays in the event detail pane.
- Global task: appears in the global Tasks pane and on timelines.

**Default rules**
- If user is in Active Event Mode: create inline tasks unless the phrase signals later (e.g., "later", "tomorrow", explicit due time) -> global task.
- If not in Active Event Mode: default to global task.
- If unclear, ask one clarification question (scope inside event vs later).

**Display rules**
- Inline tasks are listed inside the event block (Tasks section).
- Global tasks appear as their own entries in the unified list and can still be linked to the originating event.
- Contact intents ("call", "text", "email") must be captured as task channel metadata and rendered as chips (call/text) in the task row.

## 6) Multi-Event Segmentation (Single Capture)
The parser must split or merge activities deterministically.

**Rules**
- Multiple distinct time ranges -> separate events by default.
- A continuous block with a short break -> one parent event with segments (e.g., "work 8-4, lunch 12-1" becomes a parent event with a lunch segment).
- If the user explicitly says "separate events", create separate events regardless of continuity.
- Divider markers in live outline always start a new block.
- When an action occurs during another event window ("call during lunch"), create an embedded block instead of an overlapping event.

## 7) Linker Resolution (Maximum Linkers)
All blocks and tasks must link to the ecosystem:
- goals, projects, habits, skills, tags, contexts, people, trackers

**Priority**
1) Explicit tokens (#tags, @people, +contexts, tracker tokens)
2) Explicit mentions ("working out", "coding", "meal")
3) Ecosystem memory (known habits/goals/skills)
4) Recent active context (last selected goal/project)

If confidence is below threshold, raise a review card instead of silently skipping linkers.

**Tag/chip minimum**
- Auto-suggest chips to reach at least 5 for each block (category, subcategory, goal, habit, skill, context).

**Location inference**
- Use the most recent or most frequent location for the linked activity; surface as a chip for quick correction.

## 8) Emotion and Feeling Trackers (Qual + Quant)
Emotion statements must create tracker logs that are not limited to mood.

**Behavior**
- "I am scared/sad/happy/anxious/in pain" creates an emotion or pain tracker log.
- Each log includes a qualitative label and a quantitative intensity estimate.

**Required fields**
- label: the emotion or state (e.g., "scared", "sad", "pain")
- intensity: 1-10 estimate (derived from language; ask if unclear)
- optional: valence ("positive" or "negative") if inferred

Mood rules:
- "good/okay/bad/low mood" and simple valence words (happy/sad) create `mood` only.
- Non-mood emotions (fear, anxiety, pain, cramps) create their own trackers.

## 9) Habits and Instant Logs (Micro-Habits)
Micro-habits (e.g., brushing teeth, flossing) should log as instant habit completions.

**Rules**
- Past-tense habit statements ("I just brushed my teeth") create a completed habit log, not a task.
- Use the habit’s default duration from the ecosystem (e.g., brushing = 2 min) unless the user specifies otherwise.
- If multiple habits are spoken together ("brushed and flossed"), create one completion per habit.
- Habit completions update streaks immediately; missing logs show gaps in the habits view.
- Habit logs appear as small calendar markers rather than full time blocks (toggleable on calendar).
- Each completion also writes a note line to the daily log or active event notes for later search.
- Each completion creates a tiny habit block entry that appears in the unified entries list.
- When a habit happens during another event, render it as a small inline block inside the parent calendar block (not a divider).

## 10) Meals and Workouts (Specialized Blocks)
**Meals**
- Create a Meal block with nutrition estimation (calories/macros + confidence).
- Chips must include meal tags (breakfast/lunch/dinner/snack) when inferred.

**Workouts**
- Create a Workout block with exercise table rows.
- Link to habits, goals, and skills by default (e.g., "calisthenics").
- Distance-based workouts (running, cycling) create distance/time rows and estimate duration from history.

## 11) Capture Menu (Front Action Button)
The action button opens a small menu:
- Quick Log (voice)
- Active Event Mode (append to current event)
- Meal
- Workout
- Task
- Note

Menu selection should shape parsing templates (meal -> nutrition; workout -> fitness).

## 12) Wireframes

### 12.1 Capture (Listening + Live Outline)
```
--------------------------------------------------------------------
Capture        [Extend]   [LISTENING]                         [X]
--------------------------------------------------------------------
LIVE TRANSCRIPT
| So for example it's going to come up with this little menu...    |
--------------------------------------------------------------------
LIVE OUTLINE                       [1 segment] [1 note] [2 events]
[09:12] Call John Wilson about missed opportunities
chips: #calls @johnwilson +phone goal:Get Connected habit:Outreach
notes:
- text him if I can't call
tasks:
- [ ] > Call John Wilson about missed opportunities
- [ ] > Text John Wilson with well wishes (if not calling)
---
[10:05] Financial tutoring planning
chips: #tutoring project:Financial Tutoring
notes:
- worked on tutoring planning
tasks:
- [ ] > Evaluate tutoring as long-term strategy
--------------------------------------------------------------------
[Listening...]                                              [Save]
--------------------------------------------------------------------
```

### 12.2 Action Button Menu
```
-------------------------
Quick Log
Active Event Mode
Meal
Workout
Task
Note
-------------------------
```

### 12.3 Entry Detail (Outline as Source of Truth)
```
--------------------------------------------------------------------
Title: Workout - Chest                     [Edit]
chips: #fitness #strength goal:Get Jacked habit:Workout skill:Calisthenics
--------------------------------------------------------------------
Tabs: [Edit] [Outline] [Table] [Transcribe]                      [Expand]

OUTLINE
notes:
- Felt strong today
tasks:
- [ ] > Stretch post-workout

TABLE (Workout)
Exercise | Sets | Reps | Weight | RPE
--------------------------------------------------------------------
```

### 12.4 Entries Pane (Unified)
```
--------------------------------------------------------------------
ENTRIES (Events + Tasks)
[ ] Call John Wilson about missed opportunities     chips: #call +phone
[▶] Run 10 miles right now                           chips: #running #health
[ ] Evaluate tutoring as long-term strategy          chips: #tutoring
--------------------------------------------------------------------
```

### 12.5 Meal Block Detail (Nutrition)
```
--------------------------------------------------------------------
Title: Lunch at Panera
chips: #lunch #nutrition +restaurant
Estimated: 680 cal | P: 32g C: 78g F: 24g (confidence: 0.72)
notes:
- Chicken sandwich, soup, iced tea
--------------------------------------------------------------------
```

### 12.6 Tasks Table (Inbox)
```
--------------------------------------------------------------------
Tasks     [Inbox] [Today] [Next 7] [All] [Done]      [Filter...]
Views: [Table] [Kanban] [Cards]                      [Columns] [Sort]
--------------------------------------------------------------------
| Start | Title | Tags | Priority | Due | Estimate | Goal | Project | Category |
|  ▶   | Upload ILP | #upload | High | Jan 12 | 25m | -- | Residency | Personal/General |
|  ▾   | Check status of loan | #finance | Medium | -- | 15m | -- | -- | Finance/Budget |
--------------------------------------------------------------------
Subtasks (row expand):
  - [ ] open website
  - [ ] upload ILP
--------------------------------------------------------------------
```

### 12.7 Goal Plan (Outline + Gantt Split)
```
--------------------------------------------------------------------
Goal: Launch App                                         [Remove Goal]
--------------------------------------------------------------------
Outline (drag to reorder)      |  Gantt (drag to reschedule)
 [ ] ▶ Scope MVP               |  |----|-----|-----|
   [ ] ▶ Parsing refactor      |  Parsing refactor (Jan 12-20)
   [ ] ▶ Tasks table           |  Tasks table (Jan 20-27)
 [ ] ▶ Mobile polish           |  Mobile polish (Jan 28-Feb 3)
--------------------------------------------------------------------
```

### 12.8 Habit Detail (Consistency)
```
--------------------------------------------------------------------
Consistency heatmap
Mini trend graph: done vs missed (last 30 days)
--------------------------------------------------------------------
```

## 13) Data Contract Notes (for Engineering)
- Each block has a stable `blockId`.
- `blockId` is hidden by default but available in table view for debugging and linking.
- Block fields persist as structured data; Markdown is a view.
- Inline task scope is stored on the task object.
- Live outline must be reversible into stored entry fields.
- Duration estimates use a rolling personal baseline (last 5–10 matching entries).
- Importance/difficulty defaults must include a breakdown (goal multiplier + task type).
- Calendar markers include trackers and habit completions with time anchors and values.

## 14) Long-Form NLP Scenarios (Expected Output)
**Morning capture (planning + immediate action)**
Spoken: "I'm going running right now, 10 miles. After that I need to call John Wilson about missed opportunities. I feel great."
Expected blocks:
```
[07:10] Run 10 miles
chips: #running #workout #health habit:Running goal:Get Shredded skill:Endurance +outdoors
trackers: mood=8 (good)
table: distance=10 miles, duration=estimated from history
---
[08:30] Call John Wilson about missed opportunities
chips: #call #followup #work @johnwilson goal:Networking project:Outreach +phone
task: [ ] > Call John Wilson
---
```

**Midday capture (multi-event)**
Spoken: "Work 9 to 12. Lunch 12 to 1 at Panera. Notes 1 to 4."
Expected blocks:
```
[09:00] Work block
chips: #work #focus project:Clinic skill:Documentation goal:Professional Growth +hospital
---
[12:00] Lunch at Panera
chips: #lunch #nutrition #food +restaurant goal:Get Shredded
nutrition: calories/macros estimate
---
[13:00] Notes/Charting
chips: #work #admin skill:Documentation goal:Professional Growth +clinic
```

**Afternoon feelings + pain**
Spoken: "I'm anxious and I have cramps, 8 out of 10."
Expected trackers:
```
tracker: anxiety intensity=7
tracker: cramps intensity=8
```

**Active event append**
Spoken while Active Event Mode (Work block): "Talk to Dr. Smith about labs. Also, pick up groceries later."
Expected:
```
inline task: Talk to Dr. Smith about labs
global task: Pick up groceries later
```

**Micro-habit log**
Spoken: "Just brushed my teeth and flossed."
Expected:
```
habit: Brush Teeth (duration 2 min, completed)
habit: Floss (duration 2 min, completed)
calendar: two small habit markers at capture time
```

**Appended notes + charting**
Initial spoken: "Work at the hospital 8 to 12. Lunch 12 to 1 at Panera. Charting 1 to 4."
Expected blocks:
```
[08:00] Hospital work
chips: #work #clinic +hospital project:Clinic goal:Professional Growth
---
[12:00] Lunch at Panera
chips: #lunch #nutrition #food +restaurant goal:Get Shredded
nutrition: calories/macros estimate
---
[13:00] Charting
chips: #work #admin skill:Documentation +clinic
```
Append while in Active Event Mode at 10:05: "Saw three patients, note: follow up with John later."
Expected:
```
notes appended to [08:00] Hospital work:
- [10:05] Saw three patients
global task: Follow up with John later
```

**Feelings + pain + mood**
Spoken: "I feel low mood, 3 out of 10, and my knee hurts 7 out of 10."
Expected trackers:
```
tracker: mood intensity=3
tracker: knee_pain intensity=7
calendar: tracker markers at capture time
```

**Call during lunch (embedded block, not overlapping event)**
Spoken: "Lunch with John. During lunch I had a call with Alex about the referral."
Expected:
```
[12:00] Lunch with John
chips: #lunch #food @john +restaurant
notes:
- [12:25] Call with Alex about the referral
embedded block:
[12:25] Call with Alex
chips: #call @alex #referral +phone
```

**Evening routine with stacked habits + mood**
Spoken: "Getting ready for bed. Brushed my teeth, flossed, and shaved. Feeling calm."
Expected:
```
[20:00] Bedtime routine
chips: #health #routine +home
notes:
- Brushed teeth
- Flossed
- Shaved
habit: Brush Teeth (completed, 2 min)
habit: Floss (completed, 2 min)
habit: Shave (completed, default duration)
tracker: mood intensity=7 (calm)
calendar: habit + tracker markers
```

**Work + app build + feelings**
Spoken: "I'm working on the app right now. I'm happy but nervous. Need to fix parsing."
Expected:
```
[Now] Build app
chips: #work #coding #product skill:Engineering goal:Build Insight +computer
notes:
- Fix parsing
task: [ ] > Fix parsing (if phrased as to-do)
tracker: mood intensity=7 (happy)
tracker: anxiety intensity=5 (nervous)
calendar: tracker markers
```

## 15) Edge Cases (Expected Output)
- "I should run / I'm gonna run" → event + habit, starts active tracking (not a task).
- "I'm running now for 10 miles" → event + habit + workout table row.
- "I ran 10 miles yesterday" → backdated event with duration estimated from history.
- "Brushed and flossed twice today" → two completions per habit or one completion with count=2 (confirm).
- "Forgot to brush my teeth" → missed habit marker (does not extend streak).
- "Lunch with John, then a call with Alex during lunch" → embedded block, no overlapping event.
- "I'm happy but anxious" → mood tracker + anxiety tracker, both 1–10.
- "Work 8–4, lunch 12–1, notes 1–4" → three blocks unless user says "single block".
- "No time given" → estimate duration from personal baseline and show delta vs average.
- "Location inferred wrong" → location chip shown for quick correction.

## 16) Screen-by-Screen Input Handling
This section is the source-of-truth for where every input routes and where it renders.

**Dashboard**
- Inputs: Quick Log, Start Timer, tap pending review, tap tracker chip, tap habit streak.
- Output: opens Capture or Review; tracker taps open filtered Timeline; habit taps open Habit detail.
- Tests: buttons route to capture; pending review count matches stored proposals; tracker marker opens correct filter.

**Capture (Voice Log)**
- Inputs: mic start/stop, action menu (Meal/Workout/Task/Note), Active Event toggle, manual chip edits.
- Output: live outline blocks; proposals for review; embedded blocks when actions happen within active event.
- Tests: "I'm gonna run" creates event+habit; emotions create trackers; micro-habits create tiny entry + note line.

**Review Cards**
- Inputs: accept/reject/edit, apply-all.
- Output: commits entries, tasks, trackers, habits; updates calendar markers and unified entries list.
- Tests: accept writes all linked entities; reject removes proposal; edit updates chips and timestamps.

**Calendar**
- Inputs: drag/resize, quick add, toggle tracker/habit markers, click markers.
- Output: updates entry times; markers open entry detail; inline habit blocks render inside parent event.
- Tests: drag reschedules start/end; markers show correct value and time; embedded blocks do not create separate events.

**Unified Entries List**
- Inputs: check-off tasks, open entry, filter by chip.
- Output: task status updates; habit entries visible; notes open in detail.
- Tests: task completion persists; habit entries appear in list; filters match tags/trackers.

**Timeline**
- Inputs: filters (tags, people, trackers), search, jump-to-date.
- Output: shows entries, embedded blocks, and habit logs.
- Tests: tracker filter returns matching entries; embedded blocks show under parent event.

**Views (Saved Queries)**
- Inputs: filter builder, grouping, save/pin.
- Output: renders list/heatmap/chart; pins to dashboard.
- Tests: saved view returns correct entries; pinned view renders on dashboard.

**Habits**
- Inputs: mark done, edit schedule, toggle streak view.
- Output: creates habit log entry; updates streak; calendar markers.
- Tests: completion increments streak; missed day shows gap; habit log is visible in unified entries list.

**Fitness**
- Inputs: add exercise rows, voice add, edit sets/reps.
- Output: workout table updates; time/volume recalculates.
- Tests: row add persists; voice "100 push-ups" creates correct row.

**Nutrition**
- Inputs: add meal (photo + voice), edit macros, confirm estimate.
- Output: nutrition entry with estimates; no tracker markers for macros (food lives in Health/Nutrition).
- Tests: estimate stored with confidence; edits persist; meal chips inferred.

**Entry Detail**
- Inputs: edit chips, time, notes, tasks; attach media; convert facets.
- Output: updates entry, trackers, and calendar markers.
- Tests: edits update both markdown view and structured fields; tasks remain linked.

**Assistant**
- Inputs: query, accept suggestion cards.
- Output: proposals appear as review cards; deep links to entries.
- Tests: suggestions generate proposals; accept creates entries with linkers.

**Settings / Onboarding**
- Inputs: define goals, habits, default trackers, locations.
- Output: ecosystem memory for linker expansion and baseline duration.
- Tests: defaults apply to parsing; baseline durations update estimates.

## 17) Test Strategy (Every Input, Every Screen)
**Unit tests (parser + linker)**
- Classification: event vs task vs note (including "I'm gonna run").
- Segmentation: dividers, time ranges, embedded blocks.
- Linkers: goals/habits/skills/tags minimum 5 chips.
- Trackers: mood vs emotion, 1–10 intensity, pain labels.
- Habits: micro-habit completion logs with default duration.
- Duration estimation: baseline from personal history.
- Purchase vs consume split and cost extraction.
- Category memory reuse (e.g., "Coding Insight").

**Integration tests**
- Capture pipeline: transcript → proposals → review → commit to Supabase.
- Offline queue: pending capture resolves on reconnect.
- Calendar sync: time changes update entry and external mapping.

**UI tests (component/integration)**
- Live outline updates with chips and segments.
- Embedded blocks render inside parent event, not as separate time blocks.
- Habit markers and tracker markers render at correct time.
- Unified entries list shows tasks, events, habit blocks.
- Tasks column selector and subtask drawer persist.
- Goals outline + Gantt remain in sync on reorder.

**E2E tests (flows)**
- Morning run + mood + call task.
- Work block with embedded call.
- Micro-habit logs in evening routine.
- "Forgot" habit shows missed marker.
- Meal log with macro estimate.

## 18) Input Routing Diagram (Voice -> Surfaces)
This is the canonical routing map from voice input to data objects and UI surfaces.

```
VOICE INPUT
  |
  v
TRANSCRIBE + PARSE
  |
  +--> CLASSIFIER (event vs task vs note)
  |      |
  |      +--> EVENT FACET
  |      |      |-> Entry (event) -> Calendar block
  |      |      |-> Timeline entry
  |      |      |-> Unified Entries list
  |      |      `-> Entry Detail (notes/tasks/tables)
  |      |
  |      +--> TASK FACET
  |      |      |-> Task entry (checkable) -> Unified Entries list
  |      |      `-> Timeline entry
  |      |
  |      `--> NOTE FACET
  |             |-> Note entry -> Timeline/Entries list
  |             `-> Entry Detail (notes)
  |
  +--> HABIT MATCHER
  |      |-> Habit log (completion) -> Habits streak
  |      |-> Calendar habit marker
  |      `-> Unified Entries tiny habit block
  |
  +--> TRACKER PARSER (mood/emotion/pain/etc.)
  |      |-> Tracker log
  |      |-> Calendar tracker marker
  |      `-> Analytics/Views
  |
  +--> LINKERS (goals/projects/skills/tags/people/contexts/locations)
         |-> Chips on entries + notes
         |-> Goal/project progress rollups
         `-> Saved Views filters

REVIEW CARDS (accept/edit/reject)
  |
  v
COMMIT TO SUPABASE
  |
  +--> Calendar blocks + markers
  +--> Unified entries list
  +--> Timeline + Views
  `--> Analytics/Goals/Habits
```

## 19) Sentence Interpretation Rules (Task vs Event vs Note)
**Event**
- Immediate action or time-bounded: "I'm gonna run", "run 10 miles now", "work 9–12".
- Creates an event entry; if habit matches, attaches habit and starts active tracking.

**Task**
- Imperative or deferred: "remind me to call", "I need to email later".
- Creates a task entry (checkable) in the unified list.

**Note**
- Narrative/no action: "Thinking about tutoring strategy."
- Creates a note entry only.

**Embedded blocks (in-event)**
- If "during" or "while" inside another event: "call during lunch" -> embedded block, not a separate calendar event.

## 20) Sentence-to-Surface Examples
**"I'm gonna run 10 miles right now."**
- Event entry + habit link + workout row.
- Surfaces: Calendar block, Entries list, Fitness table, Goal rollup.

**"Just brushed my teeth."**
- Habit completion log (2 min default).
- Surfaces: Habit streak + calendar marker + tiny habit entry + note line.

**"Lunch with John. Call Alex during lunch."**
- Lunch event block + embedded call block.
- Surfaces: Calendar block, embedded block in entry detail, Entries list.

**"I feel low mood, 3 out of 10, and my knee hurts 7."**
- Tracker logs: mood + knee_pain.
- Surfaces: Calendar markers, Analytics/Views.

**"Remind me to text John later."**
- Task entry with `text` chip.
- Surfaces: Entries list, Timeline.

## 21) Additional Use Cases (Expected Output)
- "Recording feelings and tags right now" → create note block with tracker markers + chips.
- "Working on the app right now, feeling nervous" → event + note + anxiety tracker + mood if positive/negative words used.
- "At 8 PM, brushed teeth, flossed, shaved" → habit logs + note line + calendar markers.
- "In bed, couldn't sleep, anxiety 6" → tracker log + optional sleep note.
- "Lunch at Panera, turkey sandwich, large soda" → nutrition entry + estimated macros.

## 22) Open Questions (To Confirm)
- Default segmentation preference: separate events vs parent event with segments?
- Task scope signal: what phrasing should force global tasks while in Active Event Mode?
