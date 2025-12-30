# MOBILE WIREFRAMES V1

Goal: Mobile-first Insight app that matches the current web theme (light sand + dark navy) with Obsidian-like YAML frontmatter, markdown notes, and a live in-event tracker.

## Theme Tokens (match web)
Light:
- BG: #F2F0ED (Spec Sand)
- Text: #1C1C1E
- Muted: #86868B
- Panel: rgba(255,255,255,0.85)
- Border: rgba(28,28,30,0.06)
- Accent (clay): #D95D39
- Indigo: #5B5F97

Dark:
- BG: #0B1020 (Navy)
- Text: #E5E7EB
- Muted: rgba(148,163,184,0.72)
- Panel: rgba(15,19,32,0.92)
- Border: rgba(148,163,184,0.16)
- Accent: #D95D39
- Indigo: #8B93FF

Typography:
- Body: Figtree (400-700)
- Headings: Figtree 900 with -0.05em tracking
- Optional serif callouts: "New York" for long-form notes/quotes
- Monospace: system mono for YAML block

## Navigation Map (updated)
Bottom tab bar (5):
- Today (active event + timeline)
- Capture (main ChatGPT-style log/search)
- Plan (tasks + focus sessions)
- Calendar (day/week/month)
- Explore (search + filters, Insights entry)
Top-left: menu (settings, profile, sync)
Top-right: search in Explore, context actions in other screens

## Wireframes

### 1) Today (Timeline + Active Event)
```
┌──────────────────────────────────────────┐
│ ☰  Today                        🔍       │
│                                          │
│ [Active Event Card]                      │
│ Title: Clinic Block                      │
│ 09:00-17:00   06:12:45 left              │
│ ███████░░  62%   +18 XP                  │
│ [Pause] [Add Note] [Log Mood]            │
│                                          │
│ Timeline                                 │
│ 09:00  Work Block                        │
│ 12:30  Lunch                             │
│ 14:00  Call Bank                         │
│                                          │
│ Quick Log:  + Log  #tag  @person  +ctx    │
└──────────────────────────────────────────┘
```

### 2) Capture (Main ChatGPT-style Log/Search)
```
┌──────────────────────────────────────────┐
│ ←  Capture                       ✨       │
│                                          │
│ You: Worked 8-4, 4h clinic...            │
│ AI: Parsed 2 events, 3 tasks             │
│                                          │
│ Frontmatter preview (rendered)           │
│ tags: #work #clinic  people: @Dr Lee     │
│ location: Clinic  estimateMinutes: 480   │
│                                          │
│ Chips: #work #clinic  @Dr Lee  +focus     │
│ Points slider:  Importance  [----●---]   │
│                 Difficulty  [---●----]   │
│                                          │
│ Attachments: [img] [audio] [loc] [file]  │
│                                          │
│                                          │
│ [mic]  What happened?              [send]│
└──────────────────────────────────────────┘
```

### 3) Event Detail (Obsidian-like, frontmatter first)
```
┌──────────────────────────────────────────┐
│ ←  Event                                  │
│ Clinic Block                 ● Active     │
│ 09:00-17:00   06:12:45 left              │
│ [Stop] [Extend] [Add Log]                │
│                                          │
│ --- (YAML Frontmatter Editor)            │
│ tags: [#work, #clinic]                   │
│ people: [@Dr Lee]                        │
│ location: Clinic                         │
│ estimateMinutes: 480                     │
│ points: 24                               │
│ ---                                      │
│                                          │
│ Chips: #work #clinic  @Dr Lee  +focus     │
│ Points slider: Importance [----●---]     │
│                 Difficulty [---●----]    │
│                                          │
│ ## Plan                                  │
│ - [ ] Round on patients                  │
│ - [ ] Update charts                      │
│ ## Log                                   │
│ - **09:20** - Rounds started             │
│ - **10:45** - Charting                   │
│                                          │
│ Attachments                              │
│ [Image thumb] [Audio waveform] [Map]     │
│ [Annotate] [Transcribe] [Summarize]      │
│                                          │
│ Trackers: Mood 7  Energy 5  Stress 6     │
│ [Lock] [Add Tracker]                     │
└──────────────────────────────────────────┘
```

### 4) Calendar (Day/Week/Month)
```
┌──────────────────────────────────────────┐
│ Calendar                                 │
│ Day  Week  Month                         │
│                                          │
│ [Timeline view for selected day]         │
│ 09:00  Work Block                        │
│ 12:30  Lunch                             │
│ 14:00  Call Bank                         │
│                                          │
│ [Mini month strip]                       │
└──────────────────────────────────────────┘
```

### 5) Plan (Tasks + Focus)
```
┌──────────────────────────────────────────┐
│ Plan                              +       │
│                                          │
│ Task: Submit report          45m          │
│ [Start Focus]  +3 XP                     │
│                                          │
│ Task: Order meds           Tomorrow       │
│                                          │
└──────────────────────────────────────────┘
```

### 6) Focus Task (Full-screen session)
```
┌──────────────────────────────────────────┐
│ ←  Focus                               ⋯  │
│                                          │
│ Task: Submit report                      │
│ 00:12:31 elapsed   00:32:29 left         │
│ ██████░░░  38%     +3 XP                 │
│ [Pause] [Add Note] [End]                 │
│                                          │
│ --- (YAML Frontmatter Editor)            │
│ tags: [#work]                            │
│ people: [@Alex]                          │
│ estimateMinutes: 45                      │
│ points: 9                                │
│ ---                                      │
│                                          │
│ Notes (markdown)                         │
│ - **09:20** - Draft outline              │
│ - **09:40** - Edit section 2             │
└──────────────────────────────────────────┘
```

### 7) Explore (Search + Filters)
```
┌──────────────────────────────────────────┐
│ Explore                                  │
│ [Search bar] clinic notes                │
│ Tags  People  Places  Dates  Types       │
│ Results:                                 │
│ - Event: Clinic Block (yesterday)        │
│ - Note: Clinic summary                   │
│ - Task: Follow up labs                   │
└──────────────────────────────────────────┘
```

### 8) Insights (Streaks + Heatmap)
```
┌──────────────────────────────────────────┐
│ Insights                                 │
│ Streak: 18 days     Points: 1240         │
│ Habit Heatmap (365d)                     │
└──────────────────────────────────────────┘
```

## Key Interactions
- Action Button (iOS): start/stop Active Event (default event or last-used template).
- Live Activity / Dynamic Island: show active event title, remaining time, and quick stop.
- Lock screen: same Live Activity with timer and quick notes.
- Quick notes create timestamped lines in markdown (segment dividers).
- YAML editor is raw, but validated; errors show inline.
- Trackers can be locked (pinned) per user and optionally per event type.
- Media: attach images/audio; audio auto-transcribes; images can be annotated + summarized.
- Frontmatter-first: YAML renders to chips + sliders; edits keep YAML source of truth.
- Transcription modes: on-device Whisper (private) or Supabase (fast). User can choose per session.
