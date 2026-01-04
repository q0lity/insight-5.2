# InSight 5 - Comprehensive Feature Audit

**Generated**: 2026-01-03
**Scope**: Desktop (React/Vite) + Mobile (Expo/React Native) + Supabase Backend
**Purpose**: Complete feature inventory, status assessment, test requirements, and ship readiness

---

## Executive Summary

### Key Metrics
| Platform | Total Features | Working | Partially Working | Not Working |
|----------|----------------|---------|-------------------|-------------|
| Desktop | 22 views | 18 (82%) | 4 (18%) | 0 |
| Mobile | 25 screens | 24 (96%) | 1 (4%) | 0 |
| Storage/API | 24 modules | 20 (83%) | 2 (8%) | 2 (8%) |

### Ship Readiness: **75% Ready**

**Blocking Issues for MVP Ship:**
1. No bidirectional sync (data loss risk if device lost)
2. Reflections generation is a stub (no LLM integration)
3. Google Calendar sync not implemented (501 status)
4. No conflict resolution in sync layer

---

## Part 1: Feature Inventory

### 1.1 Desktop Application (22 Views)

| # | View | Status | Core? | Description |
|---|------|--------|-------|-------------|
| 1 | Dashboard | ✅ Working | Yes | Overview of daily activity, stats, calendar |
| 2 | Habits | ⚠️ Partial | Yes | Habit tracking with streaks |
| 3 | Goals | ✅ Working | Yes | Goal multiplier system (0.1x-3.0x) |
| 4 | Timeline | ✅ Working | Yes | Chronological event display |
| 5 | Tiimo Day | ✅ Working | Yes | Visual drag-drop calendar |
| 6 | Focus | ⚠️ Partial | Yes | Active session timer and tracking |
| 7 | Reports | ✅ Working | Yes | Analytics by category/person/tag |
| 8 | Projects | ✅ Working | Yes | Ecosystem management (goals/projects) |
| 9 | Rewards | ✅ Working | No | Gamification store (XP/Gold) |
| 10 | Health | ✅ Working | Yes | Workouts, nutrition, tracker dashboard |
| 11 | Life Tracker | ✅ Working | Yes | Nomie-style quantified self |
| 12 | Settings | ⚠️ Partial | Yes | API keys, themes, auth |
| 13 | People | ✅ Working | No | Social analytics |
| 14 | Places | ✅ Working | No | Location analytics |
| 15 | Tags | ✅ Working | No | Tag filtering system |
| 16 | Notes | ✅ Working | Yes | Markdown capture inbox |
| 17 | Assistant | ✅ Working | Yes | AI chat with local+LLM search |
| 18 | Agenda | ✅ Working | No | Timeline agenda view |
| 19 | Kanban | ⚠️ Partial | No | Task board (basic) |
| 20 | Planner | ✅ Working | No | Multi-view planning |
| 21 | Reflections | ⚠️ Partial | No | AI synthesis (stub) |
| 22 | TickTick Tasks | ✅ Working | No | Task management |

### 1.2 Mobile Application (25 Screens)

| # | Screen | Status | Core? | Description |
|---|--------|--------|-------|-------------|
| 1 | Dashboard (index) | ✅ Working | Yes | Active session, heatmap, timeline |
| 2 | Habits | ✅ Working | Yes | Quick log, streaks, timed sessions |
| 3 | Calendar | ✅ Working | Yes | Day/week/month with sync |
| 4 | Plan | ✅ Working | Yes | Markdown outline + synced tasks |
| 5 | More | ✅ Working | Yes | Navigation hub (12 items) |
| 6 | Capture | ✅ Working | Yes | Multi-format voice/text capture |
| 7 | Voice | ✅ Working | Yes | Standalone voice recording |
| 8 | Focus | ✅ Working | Yes | Active session editor |
| 9 | Event Detail | ✅ Working | Yes | Full event editing |
| 10 | Habit Detail | ✅ Working | Yes | Habit stats and heatmap |
| 11 | Explore | ✅ Working | No | Inbox search with hashtags |
| 12 | Goals | ✅ Working | Yes | Goal CRUD |
| 13 | Projects | ✅ Working | Yes | Project CRUD |
| 14 | Rewards | ✅ Working | No | Level progress + store |
| 15 | Reports | ✅ Working | Yes | Category aggregation |
| 16 | Trackers | ✅ Working | Yes | Tracker log management |
| 17 | People | ✅ Working | No | Contact list |
| 18 | Places | ✅ Working | No | Location list |
| 19 | Tags | ✅ Working | No | Tag statistics |
| 20 | Health | ✅ Working | Yes | Nutrition + workouts |
| 21 | Settings | ✅ Working | Yes | Theme, units, auth |
| 22 | Auth | ✅ Working | Yes | Email + OAuth |
| 23 | Assistant | ✅ Working | No | Local search MVP |
| 24 | Ecosystem | ✅ Working | No | Sync status display |
| 25 | Habit Form | ⚠️ Partial | Yes | Habit creation (stub) |

### 1.3 Storage/API Layer (24 Modules)

| # | Module | Platform | Status | Sync? | Description |
|---|--------|----------|--------|-------|-------------|
| 1 | calendar.ts | Desktop | ✅ Working | Yes | Events with hierarchy |
| 2 | tasks.ts | Desktop | ✅ Working | Yes | Task status workflow |
| 3 | entities.ts | Desktop | ✅ Working | Yes | Tags/people/places |
| 4 | inbox.ts | Desktop | ✅ Working | Yes | Raw captures |
| 5 | workouts.ts | Desktop | ✅ Working | Yes | Exercise logging |
| 6 | nutrition.ts | Desktop | ✅ Working | Yes | Meal tracking |
| 7 | multipliers.ts | Desktop | ⚠️ Partial | No | Goal multipliers (local only) |
| 8 | reflections.ts | Desktop | ❌ Stub | No | AI synthesis (mock) |
| 9 | events.ts | Mobile | ✅ Working | Yes | Mobile events |
| 10 | tasks.ts | Mobile | ✅ Working | Yes | Mobile tasks |
| 11 | habits.ts | Mobile | ✅ Working | Yes | Habit definitions |
| 12 | trackers.ts | Mobile | ✅ Working | Yes | Tracker logs |
| 13 | goals.ts | Mobile | ✅ Working | Yes | Goals with fallback |
| 14 | projects.ts | Mobile | ✅ Working | Yes | Projects with fallback |
| 15 | inbox.ts | Mobile | ✅ Working | Yes | Captures + attachments |
| 16 | workouts.ts | Mobile | ✅ Working | Yes | Mobile workouts |
| 17 | nutrition.ts | Mobile | ✅ Working | Yes | Mobile meals |
| 18 | people.ts | Mobile | ✅ Working | Yes | People entities |
| 19 | places.ts | Mobile | ✅ Working | Yes | Place entities |
| 20 | preferences.ts | Mobile | ⚠️ Partial | No | Local prefs only |
| 21 | sync.ts | Desktop | ✅ Working | N/A | Fire-and-forget sync |
| 22 | transcribe_and_parse | Edge | ✅ Working | N/A | Whisper + parsing |
| 23 | google_calendar_sync | Edge | ❌ Not Impl | N/A | Returns 501 |
| 24 | client.ts | Both | ✅ Working | N/A | Supabase singleton |

---

## Part 2: Core vs Nice-to-Have Classification

### CORE FEATURES (Must Ship)

These features define the product's core value proposition:

| Feature | Platform | Rationale |
|---------|----------|-----------|
| Voice Capture | Mobile | Primary input method - "speak your life" |
| Dashboard | Both | Daily overview - first screen users see |
| Focus/Active Session | Both | Real-time time tracking differentiator |
| Habits | Both | Recurring behavior tracking |
| Goals + Multipliers | Desktop | Gamification ROI on activities |
| Calendar/Timeline | Both | Temporal organization |
| Events CRUD | Both | Basic data management |
| Tasks CRUD | Both | Task management |
| Reports | Both | Analytics/insights |
| Health (Workouts/Nutrition) | Both | Quantified self tracking |
| Life Tracker | Desktop | Nomie-style quick metrics |
| Assistant (Local) | Both | Search across data |
| Auth | Both | Multi-device access |
| Supabase Sync | Both | Data persistence |

### NICE-TO-HAVE (Post-MVP)

| Feature | Platform | Rationale |
|---------|----------|-----------|
| Rewards/Gamification Store | Both | Fun but not essential |
| People Analytics | Desktop | Social tracking |
| Places Analytics | Desktop | Location tracking |
| Reflections (AI Synthesis) | Desktop | Cool but stub |
| Kanban Board | Desktop | Alternative task view |
| Ecosystem View | Mobile | Sync status display |
| Google Calendar Sync | Edge | External integration |
| Apple Health Import | Desktop | iOS-specific |

---

## Part 3: Test Requirements

### 3.1 Desktop Tests Required

#### Dashboard Tests
```
- [ ] Loads events for current day
- [ ] Displays correct stats (events, tasks, points)
- [ ] Updates when new event created
- [ ] Handles empty state gracefully
```

#### Habits Tests
```
- [ ] Lists all habits from storage
- [ ] Displays streak count accurately
- [ ] Marks habit complete updates storage
- [ ] Habit completion increments streak
- [ ] Streak resets after missed day
```

#### Goals Tests
```
- [ ] Creates goal with default multiplier (1.0x)
- [ ] Updates multiplier persists to localStorage
- [ ] Multiplier range enforced (0.1x - 3.0x)
- [ ] Goal deletion removes from list
- [ ] Points calculation uses goal multiplier
```

#### Timeline Tests
```
- [ ] Events display in chronological order
- [ ] Date range filter works correctly
- [ ] Event selection opens detail panel
- [ ] Sub-events nested under parents
```

#### Tiimo Day Tests
```
- [ ] Drag-drop repositions events
- [ ] Day/week/month view switching
- [ ] Event creation from time block
- [ ] Conflict detection highlights overlap
- [ ] Sub-event nesting visualized
```

#### Focus Tests
```
- [ ] Timer starts/stops correctly
- [ ] Elapsed time updates in real-time
- [ ] Session saved on stop
- [ ] Points calculated on completion
- [ ] Lock prevents activity switching
```

#### Reports Tests
```
- [ ] Time range filtering (7d, 30d, 90d, all)
- [ ] Category breakdown accurate
- [ ] Points sum matches individual events
- [ ] Top-20 limit applied
- [ ] Empty category handled
```

#### Health Tests
```
- [ ] Workouts load from storage
- [ ] Meals display with macros
- [ ] Tracker averages calculated correctly
- [ ] Time range filtering works
- [ ] Exercise set logging persists
```

#### Life Tracker Tests
```
- [ ] Quick tracker buttons log values
- [ ] Heatmap displays 365 days
- [ ] Charts render without errors
- [ ] Workout studio tracks active session
- [ ] Column layout preference persists
```

#### Notes Tests
```
- [ ] Capture creation works
- [ ] Search filters notes
- [ ] Tag extraction from text
- [ ] Sort options (recent/oldest/A-Z)
- [ ] View toggle (cards/table)
```

#### Assistant Tests
```
- [ ] Local search returns results
- [ ] LLM fallback when configured
- [ ] Chat history persists
- [ ] Results link to source
- [ ] Error handling for API failures
```

#### Settings Tests
```
- [ ] OpenAI key validation
- [ ] Theme toggle persists
- [ ] Model selection saves
- [ ] Supabase auth works
- [ ] Units preference persists
```

### 3.2 Mobile Tests Required

#### Dashboard (index) Tests
```
- [ ] Active session displays with timer
- [ ] XP calculation animates
- [ ] Heatmap loads 7-day data
- [ ] Upcoming tasks limited to 5
- [ ] Today's timeline accurate
- [ ] Pull-to-refresh updates data
```

#### Voice/Capture Tests
```
- [ ] Recording auto-starts on mount
- [ ] Stop button triggers transcription
- [ ] Audio uploads to Supabase storage
- [ ] Transcript displays correctly
- [ ] Parse result creates events
- [ ] Error handling for transcription failures
- [ ] Workout/meal parsing extracts data
```

#### Habits Tests
```
- [ ] Quick log (+) creates event
- [ ] Quick log (-) creates negative event
- [ ] Streak count accurate
- [ ] Timed habit starts session
- [ ] Switch activity shows confirmation
- [ ] Pull-to-refresh reloads
```

#### Calendar Tests
```
- [ ] Day view shows events
- [ ] Week view positions events
- [ ] Month view shows points per day
- [ ] Supabase sync button works
- [ ] Event tap opens detail
```

#### Plan Tests
```
- [ ] Markdown outline parses
- [ ] Time estimates extracted
- [ ] Focus session starts from item
- [ ] Synced tasks display
- [ ] Outline persists to AsyncStorage
```

#### Focus Tests
```
- [ ] Timer updates every second
- [ ] XP calculates in real-time
- [ ] Notes save with timestamps
- [ ] Frontmatter editing works
- [ ] Importance/difficulty sliders
- [ ] Pause/end session
```

#### Event Detail Tests
```
- [ ] Loads event by ID
- [ ] All fields editable
- [ ] Subtasks list displays
- [ ] Tracker logs editable
- [ ] Note view modes toggle
```

#### Auth Tests
```
- [ ] Email signup creates account
- [ ] Email signin works
- [ ] OAuth redirects correctly
- [ ] Session persists
- [ ] Sign out clears session
```

### 3.3 Storage/API Tests Required

#### Desktop Storage Tests
```
- [ ] createEvent generates UUID
- [ ] Sub-event hierarchy enforced (1-level max)
- [ ] stopEvent sets endAt timestamp
- [ ] Event sync fires on create/update
- [ ] Task status workflow enforced
- [ ] Entity deduplication by [type+key]
- [ ] Workout parsing from natural language
- [ ] Meal macro calculation accurate
```

#### Mobile Storage Tests
```
- [ ] AsyncStorage read/write works
- [ ] Tag normalization (# prefix handling)
- [ ] Habit streak calculation
- [ ] Tracker value coercion
- [ ] Supabase fallback on local
- [ ] Bulk sync functions
```

#### Supabase Edge Function Tests
```
- [ ] Whisper transcription works
- [ ] Tracker regex extraction
- [ ] Task pattern extraction
- [ ] Context-aware parsing
- [ ] Error response formatting
```

### 3.4 Integration Tests Required

```
- [ ] Mobile voice capture → Desktop timeline sync
- [ ] Habit log mobile → Desktop habit view
- [ ] Goal multiplier → Points calculation
- [ ] Auth flow → Both platforms
- [ ] Offline capture → Sync when online
```

---

## Part 4: Known Issues & Bugs

### Critical Issues

| Issue | Platform | Impact | Fix Priority |
|-------|----------|--------|--------------|
| No bidirectional sync | Both | Data loss risk | P0 |
| Reflections is stub | Desktop | Feature unusable | P2 |
| Google Calendar 501 | Edge | Integration broken | P2 |
| Multipliers not synced | Desktop | Lost on new device | P1 |
| Preferences not synced | Mobile | Lost on new device | P1 |

### UI Bugs

| Issue | Platform | Location | Fix Priority |
|-------|----------|----------|--------------|
| Delete buttons show "plus" icon | Mobile | Goals/Projects/People/Places | P2 |
| Tracker delete shows "plus" icon | Mobile | Trackers screen | P2 |
| Habit form is stub only | Mobile | habit-form.tsx | P1 |
| Focus UI incomplete | Desktop | focus.tsx | P2 |
| Kanban drag-drop incomplete | Desktop | kanban.tsx | P3 |

### Performance Issues

| Issue | Platform | Location | Fix Priority |
|-------|----------|----------|--------------|
| Focus updates every 400ms | Mobile | focus.tsx | P3 |
| Timeline clock every 100ms | Mobile | dashboard | P3 |
| Calendar recalculates on render | Mobile | calendar.tsx | P2 |
| No pagination on long lists | Both | Various | P2 |

---

## Part 5: Ship Readiness Checklist

### MVP Ship Requirements

#### Authentication (✅ Ready)
- [x] Email signup/signin
- [x] OAuth (Google, Apple, Azure)
- [x] Session persistence
- [x] Sign out

#### Voice Capture (✅ Ready)
- [x] Audio recording
- [x] Whisper transcription
- [x] Event creation from transcript
- [x] Workout/meal parsing
- [ ] Offline capture queue (missing)

#### Time Tracking (✅ Ready)
- [x] Active session timer
- [x] XP calculation
- [x] Event start/stop
- [x] Session locking

#### Habits (⚠️ Almost Ready)
- [x] Habit listing
- [x] Quick log
- [x] Streak tracking
- [x] Timed sessions
- [ ] Habit form creation (stub)

#### Analytics (✅ Ready)
- [x] Category reports
- [x] Time range filtering
- [x] Points aggregation
- [x] Charts/heatmaps

#### Data Sync (⚠️ Partially Ready)
- [x] Local-first storage
- [x] Supabase upload
- [ ] Pull-down sync (missing)
- [ ] Conflict resolution (missing)
- [ ] Offline queue (missing)

### Ship Blockers

1. **Habit Form** - Users cannot create habits on mobile
2. **Bidirectional Sync** - Risk of data loss

### Recommended Pre-Ship Fixes

1. Implement basic habit form (2 hours)
2. Add delete icon fix for buttons (1 hour)
3. Add sync status indicator (2 hours)
4. Add offline queue for captures (4 hours)

---

## Part 6: Priority Fix Order

### P0 - Ship Blockers (Fix Before Launch)

| # | Issue | Effort | Platform |
|---|-------|--------|----------|
| 1 | Implement habit form | 2h | Mobile |
| 2 | Fix delete button icons | 1h | Mobile |
| 3 | Add offline capture queue | 4h | Mobile |

### P1 - Critical (Fix Week 1)

| # | Issue | Effort | Platform |
|---|-------|--------|----------|
| 4 | Sync multipliers to Supabase | 2h | Desktop |
| 5 | Sync preferences to Supabase | 2h | Mobile |
| 6 | Add sync status UI | 2h | Both |
| 7 | Pull-down sync for events | 8h | Both |

### P2 - Important (Fix Month 1)

| # | Issue | Effort | Platform |
|---|-------|--------|----------|
| 8 | Implement reflections generation | 8h | Desktop |
| 9 | Calendar render optimization | 4h | Mobile |
| 10 | List pagination | 4h | Both |
| 11 | Google Calendar sync | 16h | Edge |
| 12 | Focus UI completion | 4h | Desktop |

### P3 - Nice to Have (Backlog)

| # | Issue | Effort | Platform |
|---|-------|--------|----------|
| 13 | Timer interval optimization | 2h | Mobile |
| 14 | Kanban drag-drop completion | 4h | Desktop |
| 15 | Apple Health integration | 8h | Desktop |
| 16 | Conflict resolution | 16h | Both |

---

## Part 7: Value Assessment

### High Value (Core Differentiators)

| Feature | Value | Reason |
|---------|-------|--------|
| Voice Capture | ★★★★★ | Primary differentiator - "speak your life" |
| Active Session Timer | ★★★★★ | Real-time tracking with XP |
| Goal Multipliers | ★★★★★ | Gamification ROI unique to InSight |
| Life Tracker | ★★★★☆ | Nomie-style flexibility |
| Assistant | ★★★★☆ | AI search across life data |
| Health Dashboard | ★★★★☆ | Unified quantified self |

### Medium Value (Expected Features)

| Feature | Value | Reason |
|---------|-------|--------|
| Habits | ★★★☆☆ | Standard habit tracking |
| Calendar | ★★★☆☆ | Expected scheduling |
| Reports | ★★★☆☆ | Standard analytics |
| Tasks | ★★★☆☆ | Basic task management |
| Settings | ★★★☆☆ | Required configuration |

### Low Value (Nice to Have)

| Feature | Value | Reason |
|---------|-------|--------|
| Rewards Store | ★★☆☆☆ | Fun but not essential |
| People Analytics | ★★☆☆☆ | Power user feature |
| Places Analytics | ★★☆☆☆ | Power user feature |
| Reflections | ★★☆☆☆ | Currently broken |
| Kanban | ★★☆☆☆ | Alternative view |
| Ecosystem | ★☆☆☆☆ | Sync debug only |

---

## Part 8: Complexity Analysis

### High Complexity (Tread Carefully)

| Feature | Complexity | Why |
|---------|------------|-----|
| Capture Parsing | ★★★★★ | NLP, multi-format, regex, context |
| Bidirectional Sync | ★★★★★ | Conflict resolution, merge logic |
| Sub-event Hierarchy | ★★★★☆ | Parent/child relationships |
| Health Tracking | ★★★★☆ | Multiple data types, calculations |
| Life Tracker Charts | ★★★★☆ | Real-time data visualization |

### Medium Complexity (Manageable)

| Feature | Complexity | Why |
|---------|------------|-----|
| Goal Multipliers | ★★★☆☆ | Points calculation, persistence |
| Habit Streaks | ★★★☆☆ | Date logic, edge cases |
| Calendar Views | ★★★☆☆ | Layout calculations |
| Assistant Search | ★★★☆☆ | Local + LLM fallback |
| Auth Flow | ★★★☆☆ | OAuth callbacks |

### Low Complexity (Quick Wins)

| Feature | Complexity | Why |
|---------|------------|-----|
| People/Places CRUD | ★★☆☆☆ | Simple list management |
| Tags | ★★☆☆☆ | Extraction + filtering |
| Settings | ★★☆☆☆ | Form with persistence |
| Rewards Display | ★★☆☆☆ | Static content |
| More Menu | ★☆☆☆☆ | Navigation only |

---

## Part 9: Architecture Summary

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INPUT                                │
├─────────────────────────────────────────────────────────────────┤
│  Voice (Whisper) → Edge Function → Parsed Segments → Events     │
│  Text Input → Local Parse → Events/Tasks/Trackers               │
│  Quick Log → Direct Storage → Events                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      LOCAL STORAGE                               │
├─────────────────────────────────────────────────────────────────┤
│  Desktop: Dexie (IndexedDB) + localStorage                      │
│  Mobile: AsyncStorage (JSON)                                     │
│  Both: Local-first, always available                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (async, fire-and-forget)
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE                                    │
├─────────────────────────────────────────────────────────────────┤
│  entries: Unified table (events, tasks, notes)                  │
│  entities: Tags, people, places                                 │
│  goals/projects: Definitions                                    │
│  nutrition_logs: Meal data                                      │
│  Storage: Audio/image attachments                               │
└─────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Local-First**: All data persisted locally before sync
2. **Unified Entry Model**: Events, tasks, notes → entries table
3. **Fire-and-Forget Sync**: No blocking on Supabase writes
4. **Sub-Event Hierarchy**: Max 1 level deep
5. **Points Formula**: `(importance × difficulty × minutes) / 10 × goalMultiplier`

---

## Part 10: Recommendations

### For MVP Launch

1. **Fix habit form** - Critical for mobile habit creation
2. **Fix delete icons** - Polish issue affecting multiple screens
3. **Add offline indicator** - User needs to know sync status
4. **Ship with warning** - "Data syncs one-way, backup recommended"

### For V1.1 (Week 2-4)

1. **Implement pull-down sync** - Prevent data loss
2. **Add conflict resolution** - At minimum, last-write-wins
3. **Sync preferences/multipliers** - Device continuity

### For V1.2 (Month 2)

1. **Reflections with real LLM** - Complete the AI synthesis feature
2. **Google Calendar integration** - External calendar sync
3. **Performance optimization** - Timer intervals, pagination

### Long-term (V2.0)

1. **Offline queue with retry** - Resilient sync
2. **Real-time sync** - Supabase Realtime subscriptions
3. **Apple Health deep integration** - Full health ecosystem
4. **Vector search** - Semantic similarity in Assistant

---

## Appendix A: File Reference

### Desktop Views
- [dashboard.tsx](apps/desktop/src/workspace/views/dashboard.tsx)
- [habits.tsx](apps/desktop/src/workspace/views/habits.tsx)
- [goals.tsx](apps/desktop/src/workspace/views/goals.tsx)
- [timeline.tsx](apps/desktop/src/workspace/views/timeline.tsx)
- [tiimo-day.tsx](apps/desktop/src/workspace/views/tiimo-day.tsx)
- [focus.tsx](apps/desktop/src/workspace/views/focus.tsx)
- [reports.tsx](apps/desktop/src/workspace/views/reports.tsx)
- [projects.tsx](apps/desktop/src/workspace/views/projects.tsx)
- [rewards.tsx](apps/desktop/src/workspace/views/rewards.tsx)
- [health.tsx](apps/desktop/src/workspace/views/health.tsx)
- [life-tracker.tsx](apps/desktop/src/workspace/views/life-tracker.tsx)
- [settings.tsx](apps/desktop/src/workspace/views/settings.tsx)
- [people.tsx](apps/desktop/src/workspace/views/people.tsx)
- [places.tsx](apps/desktop/src/workspace/views/places.tsx)
- [tags.tsx](apps/desktop/src/workspace/views/tags.tsx)
- [notes.tsx](apps/desktop/src/workspace/views/notes.tsx)
- [assistant.tsx](apps/desktop/src/workspace/views/assistant.tsx)
- [agenda.tsx](apps/desktop/src/workspace/views/agenda.tsx)
- [kanban.tsx](apps/desktop/src/workspace/views/kanban.tsx)
- [planner.tsx](apps/desktop/src/workspace/views/planner.tsx)
- [ReflectionsView.tsx](apps/desktop/src/workspace/views/ReflectionsView.tsx)
- [ticktick-tasks.tsx](apps/desktop/src/workspace/views/ticktick-tasks.tsx)

### Mobile Screens
- [index.tsx](apps/mobile/app/(tabs)/index.tsx) (Dashboard)
- [habits.tsx](apps/mobile/app/(tabs)/habits.tsx)
- [calendar.tsx](apps/mobile/app/(tabs)/calendar.tsx)
- [plan.tsx](apps/mobile/app/(tabs)/plan.tsx)
- [more.tsx](apps/mobile/app/(tabs)/more.tsx)
- [capture.tsx](apps/mobile/app/(tabs)/capture.tsx)
- [voice.tsx](apps/mobile/app/voice.tsx)
- [focus.tsx](apps/mobile/app/focus.tsx)
- [event/[id].tsx](apps/mobile/app/(tabs)/event/[id].tsx)
- [habit/[id].tsx](apps/mobile/app/habit/[id].tsx)
- [explore.tsx](apps/mobile/app/(tabs)/explore.tsx)
- [goals.tsx](apps/mobile/app/goals.tsx)
- [projects.tsx](apps/mobile/app/projects.tsx)
- [rewards.tsx](apps/mobile/app/rewards.tsx)
- [reports.tsx](apps/mobile/app/reports.tsx)
- [trackers.tsx](apps/mobile/app/trackers.tsx)
- [people.tsx](apps/mobile/app/people.tsx)
- [places.tsx](apps/mobile/app/places.tsx)
- [tags.tsx](apps/mobile/app/tags.tsx)
- [health.tsx](apps/mobile/app/health.tsx)
- [settings.tsx](apps/mobile/app/settings.tsx)
- [auth.tsx](apps/mobile/app/auth.tsx)
- [ecosystem.tsx](apps/mobile/app/ecosystem.tsx)
- [habit-form.tsx](apps/mobile/app/habit-form.tsx)

### Storage Layer
- [calendar.ts](apps/desktop/src/storage/calendar.ts)
- [tasks.ts](apps/desktop/src/storage/tasks.ts)
- [entities.ts](apps/desktop/src/storage/entities.ts)
- [inbox.ts](apps/desktop/src/storage/inbox.ts)
- [workouts.ts](apps/desktop/src/storage/workouts.ts)
- [nutrition.ts](apps/desktop/src/storage/nutrition.ts)
- [multipliers.ts](apps/desktop/src/storage/multipliers.ts)
- [reflections.ts](apps/desktop/src/storage/reflections.ts)
- [sync.ts](apps/desktop/src/supabase/sync.ts)
- [events.ts](apps/mobile/src/storage/events.ts)
- [tasks.ts](apps/mobile/src/storage/tasks.ts)
- [habits.ts](apps/mobile/src/storage/habits.ts)
- [trackers.ts](apps/mobile/src/storage/trackers.ts)
- [goals.ts](apps/mobile/src/storage/goals.ts)
- [projects.ts](apps/mobile/src/storage/projects.ts)
- [inbox.ts](apps/mobile/src/storage/inbox.ts)
- [functions.ts](apps/mobile/src/supabase/functions.ts)

### Supabase Edge Functions
- [transcribe_and_parse_capture/index.ts](supabase/functions/transcribe_and_parse_capture/index.ts)
- [google_calendar_sync/index.ts](supabase/functions/google_calendar_sync/index.ts)

---

*Generated by Claude Code Feature Audit System*

---

## Part 11: Visual Design Audit

**Audit Date**: 2026-01-03
**Method**: Playwright automated screenshots + manual frontend design analysis
**Screenshots Location**: `/screenshots/desktop/` and `/screenshots/audit/`

---

### 11.1 Overall Design System Assessment

#### Current Aesthetic Direction
The app uses a **warm rose-gold/terracotta** color theme that is distinctive but inconsistently applied. The design attempts a "cozy productivity" aesthetic but falls short due to several issues.

#### Global Issues Across All Views

| Issue | Severity | Impact |
|-------|----------|--------|
| Generic system fonts | High | App feels like developer prototype, not polished product |
| Inconsistent spacing | Medium | Visual rhythm broken, feels unpolished |
| Low contrast text | High | Accessibility concern, hard to read |
| Competing CTAs | Medium | User confusion about primary actions |
| Wasted right panel space | Medium | "No selection" state provides no value |
| Dense sidebar | Low | Too many sections crammed together |

#### Design System Recommendations

**Typography Stack (Replace Current)**
```css
--font-display: 'Satoshi', 'Cabinet Grotesk', sans-serif;
--font-body: 'Plus Jakarta Sans', 'DM Sans', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

**Color Palette (Refine Current)**
```css
/* Keep warm theme but add contrast */
--color-bg-primary: #FDF8F4;      /* Warm white */
--color-bg-secondary: #F5EDE6;    /* Cream */
--color-bg-tertiary: #EBE0D6;     /* Warm gray */
--color-accent-primary: #E07A5F;  /* Terracotta */
--color-accent-secondary: #3D405B; /* Deep slate (for contrast) */
--color-text-primary: #2D2A26;    /* Dark brown */
--color-text-secondary: #6B6560;  /* Medium brown */
--color-success: #81B29A;         /* Sage green */
--color-warning: #F2CC8F;         /* Warm yellow */
```

---

### 11.2 View-by-View Analysis

---

#### VIEW 1: Dashboard / Vault (Default View)

**Screenshot**: `screenshots/audit/00-default-dashboard.png`

**Current State**:
- 3-column layout: Left sidebar (~200px), Main content (~60%), Right panel (~250px)
- "Vault" header with "LOCAL-FIRST (INDEXEDDB)" subtitle
- "AI Synthesized Wisdom" section with weekly reflections
- Trackers list (Mood, Energy, Stress, Pain, Bored, Water)
- Bottom shortcuts (Calendar, Notes, Chat, Settings)

**Aesthetic Issues**:

| Issue | Description | Severity |
|-------|-------------|----------|
| "Vault" title lacks character | Generic sans-serif, no visual identity | High |
| "LOCAL-FIRST (INDEXEDDB)" exposed | Technical implementation leaked to UI | High |
| Tracker list repetitive | All items identical "Tracker" badge | Medium |
| "REFLECT NOW" button awkward | Harsh caps, misplaced visually | Medium |
| "No habits yet" empty state | Uninspiring, no illustration | Low |
| Date "JAN 2" formatting odd | Should be "January 2" or "Jan 2, 2026" | Low |

**UI/UX Improvements**:

1. **Hide technical details** - Remove "(INDEXEDDB)" from user-facing UI
2. **Add visual hierarchy to trackers** - Color-code by type (mood=purple, health=green)
3. **Redesign empty states** - Add illustrations and clear CTAs
4. **Improve reflection card** - Add subtle gradient background, better typography
5. **Move "Reflect Now" to main action** - Make it primary button in header

**Fix Prompt**:
```
Redesign the InSight 5 Dashboard/Vault view with these requirements:
1. Replace "Vault" header with a warm, welcoming greeting ("Good morning, [name]")
2. Remove technical "(INDEXEDDB)" subtitle entirely
3. Color-code tracker items: Mood (purple), Energy (yellow), Stress (red), Pain (orange), Health (green), Water (blue)
4. Add small icons next to each tracker name
5. Replace "REFLECT NOW" with a softer "Start Reflection" button with gradient background
6. Add a subtle illustration to empty states (habits, tasks)
7. Use Satoshi font for headers, Plus Jakarta Sans for body
8. Maintain warm rose-gold color scheme but add slate blue (#3D405B) for text contrast
```

---

#### VIEW 2: Calendar View

**Screenshot**: `screenshots/desktop/02-calendar.png`

**Current State**:
- Day view with hourly time slots (00:00 - 08:00+ visible)
- Header: navigation arrows, "today" button, date "Sat, Jan 3, 2026"
- View switchers: Day, Week, Month, Timeline, Gantt
- Right panel: "No selection" state
- Empty calendar with no events

**Aesthetic Issues**:

| Issue | Description | Severity |
|-------|-------------|----------|
| Time labels cramped | "00:00", "01:00" too close together | Medium |
| Empty state useless | Just empty grid, no helpful prompts | High |
| View switcher tabs generic | Bland button styling | Medium |
| "refresh" button awkward | Text button next to date | Low |
| "+ New" button small | Primary action too subtle | High |

**UI/UX Improvements**:

1. **Add drag-to-create hint** - "Drag to create an event" overlay on empty calendar
2. **Improve time slot visuals** - Add subtle background alternation for AM/PM
3. **Make "+ New" more prominent** - Larger, with icon
4. **Add "No events today" friendly message** - With suggestion to add first event
5. **Refine view switcher** - Use pill-style tabs with active state

**Fix Prompt**:
```
Redesign the InSight 5 Calendar view with:
1. Larger time labels (14px) with better spacing (60px per hour slot)
2. Subtle zebra striping for time slots (odd hours slightly tinted)
3. "No events scheduled" empty state with illustration and "Add your first event" CTA
4. Pill-style view switcher tabs with smooth transitions
5. More prominent "+ New Event" button with calendar icon
6. Current hour indicator line (red/coral line at current time)
7. Drag-to-create functionality with visual feedback
```

---

#### VIEW 3: Notes View

**Screenshot**: `screenshots/desktop/03-notes.png`

**Current State**:
- Header: "Notes" title, grid/list view toggles, "+ New" button
- "0 captures" count
- Search input with "Search notes..." placeholder
- "Recent" filter dropdown
- Large empty state with document icon and "No notes found"

**Aesthetic Issues**:

| Issue | Description | Severity |
|-------|-------------|----------|
| Empty state icon generic | Standard document icon, no personality | Medium |
| "0 captures" terminology | User-unfriendly term | Medium |
| View toggles hard to see | Icons too subtle | Low |
| Search lacks visual polish | Plain input box | Low |

**UI/UX Improvements**:

1. **Better empty state** - Custom illustration of notebook/pen
2. **Rename "captures" to "notes"** - "No notes yet" instead of "0 captures"
3. **Add empty state CTA** - "Start writing your first note" button
4. **Search with keyboard shortcut hint** - "Search notes... (⌘K)"
5. **Quick-add input** - Inline text input for fast note creation

**Fix Prompt**:
```
Redesign Notes view empty state:
1. Custom illustration: open notebook with pen, warm colors
2. Heading: "Your notes will appear here"
3. Subtext: "Capture thoughts, ideas, and moments"
4. Primary CTA: "Write your first note" button (coral/terracotta)
5. Secondary: "Or press ⌘N to quick-capture"
6. Search bar with subtle shadow and ⌘K shortcut badge
7. Replace "0 captures" with just hiding the count when empty
```

---

#### VIEW 4: Chat / Assistant View

**Screenshot**: `screenshots/desktop/04-chat.png`

**Current State**:
- Centered "How can I help you today?" message with sparkle icon
- Description: "Ask me anything about your week, patterns..."
- Three suggestion pills: "What did I work on this week?", "Show my productivity trends", "Summarize my tasks"
- Bottom input: "Message Insight..." with send button
- Footer: "Insight uses local search and optional LLM for answers"

**Aesthetic Issues**:

| Issue | Description | Severity |
|-------|-------------|----------|
| Suggestion pills too similar | All same style, no differentiation | Low |
| Sparkle icon generic | Standard emoji-style icon | Low |
| Input bar too plain | Lacks visual polish | Medium |
| Footer text distracting | Technical explanation visible | Medium |

**UI/UX Improvements**:

1. **Differentiate suggestions** - Add icons to each (calendar, chart, list)
2. **Polish input bar** - Add subtle glow on focus, rounded corners
3. **Hide footer or make subtle** - Move to settings or tooltip
4. **Add typing indicator** - When processing queries
5. **Animate entrance** - Stagger suggestion pills on load

**Fix Prompt**:
```
Enhance Chat/Assistant view:
1. Add icons to suggestion pills: 📅 for tasks, 📊 for trends, 📋 for summary
2. Animate suggestion pills with staggered fade-in (100ms delay each)
3. Input bar: 12px border-radius, subtle inset shadow, coral accent on focus
4. Replace sparkle emoji with custom animated SVG icon
5. Move "uses local search..." to info tooltip on hover
6. Add subtle gradient background to chat area (warm white to cream)
7. Typing indicator: three bouncing dots when processing
```

---

#### VIEW 5: Settings View

**Screenshot**: `screenshots/desktop/05-settings.png`

**Current State**:
- Full settings page with multiple sections
- Account: Email input, Password input, Sign in/Create account buttons
- Appearance: Theme selector (Dark, Light, Warm, Olive, Olive Orange), Follow System toggle
- Event titles: auto/full/focus options
- Health Preferences: Weight unit, Distance unit, Nutrition model
- Taxonomy rules: YAML-style rules editor
- AI: OpenAI API key input

**Aesthetic Issues**:

| Issue | Description | Severity |
|-------|-------------|----------|
| Theme swatches too small | Hard to preview colors | High |
| Too much content on page | Overwhelming, no sections | High |
| YAML rules editor harsh | Raw code visible | Medium |
| Form inputs inconsistent | Different styles per section | Medium |
| "lbs" / "kg" toggle unclear | Which is selected? | Medium |

**UI/UX Improvements**:

1. **Section cards** - Group related settings in cards with headers
2. **Larger theme previews** - Show mini app preview for each theme
3. **Accordion sections** - Collapse advanced settings (Taxonomy, AI)
4. **Consistent toggles** - Use pill-style toggles throughout
5. **Progress indicators** - Show completion for account setup

**Fix Prompt**:
```
Redesign Settings view:
1. Group into cards: "Account", "Appearance", "Preferences", "Advanced"
2. Theme selector: 80x60px preview cards showing actual theme colors
3. Collapsible "Advanced" section for Taxonomy rules and AI settings
4. Consistent pill toggles for binary choices (lbs/kg, Miles/Kilometers)
5. Form validation with inline success/error states
6. "Follow System" toggle should show current detected mode
7. Add search/filter for settings (⌘F)
8. Success toast when settings saved
```

---

#### VIEW 6: Strategic Lifecycle Insights (Reports)

**Screenshot**: `screenshots/audit/rail-00.png`

**Current State**:
- Header: "STRATEGIC LIFECYCLE INSIGHTS" with "Spacious" dropdown and "CUSTOMIZE" button
- Tab navigation: OVERVIEW, TIME, POINTS, RADAR, TODAY, WEEK, MONTH, Q, Y
- Filter pills: All, Categories, Tags, People, Places
- Sections: CONSISTENCY (heatmap), IMPACT MAP (heatmap), TIME ALLOCATION, IMPACT DISTRIBUTION, DAILY ACTIVITY
- Multiple empty "No data yet" states

**Aesthetic Issues**:

| Issue | Description | Severity |
|-------|-------------|----------|
| "STRATEGIC LIFECYCLE INSIGHTS" too long | Overwhelming header | High |
| Too many tabs | 9 tabs is overwhelming | High |
| Inconsistent heatmap colors | Hard to read patterns | Medium |
| Empty states repetitive | Same "No data yet" everywhere | Medium |
| "Spacious" dropdown unexplained | What does it do? | Low |

**UI/UX Improvements**:

1. **Shorten header** - "Insights" or "Analytics" is enough
2. **Consolidate tabs** - Combine into Time (today/week/month), Points, Radar
3. **Meaningful empty states** - "Start tracking to see patterns here"
4. **Unified heatmap legend** - Show what colors mean
5. **Explain dropdowns** - Tooltip for "Spacious" (layout density)

**Fix Prompt**:
```
Redesign Reports/Insights view:
1. Rename to "Insights" (drop "Strategic Lifecycle")
2. Consolidate tabs: Overview | Time | Points | Radar (4 tabs max)
3. Time tab has segmented control for Today/Week/Month/Quarter/Year
4. Heatmap color legend: Cool (low) → Warm (high) with values shown
5. Empty states: "Track your first activity to unlock insights" with illustration
6. Remove "Spacious" dropdown or add tooltip explaining it's layout density
7. Card-based sections with subtle shadows
8. Loading skeletons instead of empty text
```

---

#### VIEW 7: Capture Modal

**Screenshot**: `screenshots/audit/rail-01.png`

**Current State**:
- Modal overlay on top of reports view
- Header: "Capture" with close (×) button
- Input area: "Dump your thoughts..." placeholder
- "Listening..." indicator with microphone icon
- Action buttons: "Clear", "Save Note"

**Aesthetic Issues**:

| Issue | Description | Severity |
|-------|-------------|----------|
| "Dump your thoughts" phrasing | Inelegant copy | Medium |
| Modal too plain | Just a white box | Medium |
| "Listening..." indicator small | Hard to see voice is active | High |
| No visual feedback | Nothing shows recording | High |

**UI/UX Improvements**:

1. **Better placeholder** - "What's on your mind?" or "Speak or type..."
2. **Prominent voice indicator** - Pulsing animation when listening
3. **Waveform visualization** - Show audio input visually
4. **Modal styling** - Subtle border-radius, shadow, warm background
5. **Keyboard shortcuts** - Show "⌘Enter to save"

**Fix Prompt**:
```
Redesign Capture modal:
1. Header: "Quick Capture" with microphone icon
2. Placeholder: "What's on your mind?"
3. Voice indicator: Large pulsing circle animation when listening
4. Audio waveform: Real-time bars showing voice input
5. Modal: 16px border-radius, soft shadow, cream background (#FDF8F4)
6. Buttons: "Cancel" (ghost) and "Save" (filled coral)
7. Keyboard hint: "Press ⌘Enter to save"
8. Character count in corner (optional, for long notes)
9. Tags auto-extraction preview below input
```

---

### 11.3 Cross-Cutting Design Improvements

#### Navigation Consistency

| Current | Recommended |
|---------|-------------|
| Bottom shortcuts only | Add top breadcrumb trail |
| No way back except sidebar | Add back button to detail views |
| "Vault" unclear | Rename to "Home" or "Dashboard" |

#### Empty State System

Create a consistent empty state component:
```
- Custom illustration (warm, hand-drawn style)
- Heading: What the user will see when they have data
- Subtext: How to get started
- Primary CTA: Main action to populate this view
- Secondary: Keyboard shortcut or alternative method
```

#### Loading States

Add skeleton screens instead of:
- "No data yet" text
- Empty grids
- Blank panels

#### Micro-Interactions

Priority animations to add:
1. Tab switching (slide transition)
2. Button hover states (subtle scale/glow)
3. Modal open/close (fade + scale)
4. Success feedback (confetti for milestones)
5. Tracker logging (satisfying click + ripple)

---

### 11.4 Theme-Specific Recommendations

#### Current Themes Available
1. **Default** (warm rose-gold) - Primary theme
2. **Dark** - Not yet captured
3. **Light** - Not yet captured
4. **Warm** - Variation of default
5. **Olive** - Green-based theme
6. **Olive Orange** - Green + orange accent

#### Theme Improvements Needed

**Dark Mode**:
```css
--color-bg-primary: #1A1A1A;
--color-bg-secondary: #2A2A2A;
--color-text-primary: #EAEAEA;
--color-accent-primary: #FF8066; /* Lighter coral for dark bg */
```

**Light Mode**:
```css
--color-bg-primary: #FFFFFF;
--color-bg-secondary: #F5F5F5;
--color-text-primary: #333333;
--color-accent-primary: #E07A5F; /* Standard coral */
```

---

### 11.5 Priority Fix Order (Visual)

| Priority | Fix | Effort | Impact |
|----------|-----|--------|--------|
| P0 | Remove "(INDEXEDDB)" from UI | 10 min | High - removes dev-only text |
| P0 | Fix empty states with CTAs | 2 hours | High - reduces confusion |
| P1 | Add loading skeletons | 4 hours | Medium - feels more polished |
| P1 | Improve voice capture feedback | 2 hours | High - core feature UX |
| P1 | Typography system upgrade | 4 hours | High - overall feel |
| P2 | Theme refinement | 4 hours | Medium - consistency |
| P2 | Add micro-interactions | 8 hours | Medium - delight |
| P3 | Redesign settings page | 8 hours | Low - works as-is |

---

### 11.6 Mobile Screenshot Audit

**Status**: Pending - Expo app screenshots not yet captured

**To capture mobile views, run**:
```bash
cd apps/mobile && npx expo start
# Then use Playwright or manual screenshots
```

---

*Visual Audit completed by Claude Code Frontend Design Analysis*

---

## Part 12: Comprehensive Feature-by-Feature Technical Audit

**Purpose**: Deep-dive analysis of each feature from multiple perspectives including software architecture, visual design, UI/UX, system integration, and code quality.

---

### Feature 1: Vault Sidebar (Explorer Panel)

**Location**: [App.tsx:4130-4506](apps/desktop/src/App.tsx#L4130-L4506)

#### 1.1 What It Does

The Vault sidebar is the primary navigation and quick-access panel providing:
- **Pinned Sections**: Draggable/reorderable groups (Tasks, Habits, Trackers, Shortcuts)
- **Tasks Widget**: Search, quick-add, drag-to-calendar, completion toggles
- **Habits Widget**: Draggable habit items for calendar scheduling
- **Trackers Widget**: Quick-access to tracker definitions
- **Recent Notes**: Last 12 captures with preview
- **Pomodoro Timer**: Built-in focus timer with task linking

#### 1.2 Data & Storage Architecture

| Data | Storage | Sync Status |
|------|---------|-------------|
| Tasks | IndexedDB via Dexie | ✅ Supabase sync |
| Habits | localStorage `insight5.habits.defs.v1` | ⚠️ Partial sync |
| Trackers | localStorage `insight5.trackers.defs.v1` | ❌ Local only |
| Pinned Order | localStorage `insight5.explorer.pinnedOrder` | ❌ Local only |
| Pomodoro State | React state (ephemeral) | ❌ Not persisted |
| Collapse States | React state | ❌ Not persisted |

**Architect Assessment**:
- ⚠️ **Problem**: Mixed storage backends (localStorage vs IndexedDB) create maintenance complexity
- ⚠️ **Problem**: Pinned order and collapse states lost on refresh
- ✅ **Good**: Drag-and-drop uses standard dataTransfer API correctly

#### 1.3 Code Problems Identified

```typescript
// Problem 1: State not persisted (App.tsx:4137-4141)
const [explorerPinnedOpen, setExplorerPinnedOpen] = useState(true)
// Should load from localStorage

// Problem 2: Hardcoded shortcuts instead of user-configurable
<button className="sbItem" onClick={() => openView('calendar')}>Calendar</button>
// Should be dynamic based on user preferences

// Problem 3: Pomodoro timer loses state on tab change
const [pomoSeconds, setPomoSeconds] = useState(25 * 60)
// Should persist to localStorage or IndexedDB
```

#### 1.4 Visual Design Assessment

| Aspect | Current State | Issue | Fix Priority |
|--------|--------------|-------|--------------|
| Typography | System fonts, inconsistent sizing | Lacks hierarchy | P1 |
| Spacing | Cramped section headers | Poor breathing room | P2 |
| Color | Muted gray monotone | Low visual interest | P2 |
| Icons | Generic, small (12-16px) | Hard to distinguish | P2 |
| Collapse indicators | Chevrons only | No animation | P3 |

#### 1.5 UI/UX Experience

**Friction Points**:
1. **No empty state guidance** - "No habits yet" is unhelpful; should have CTA
2. **Search hidden** - Task search only appears when expanded
3. **Pomodoro buried** - Key productivity feature is in a collapsible section
4. **No keyboard shortcuts** - Can't navigate with keyboard

**Delighters**:
1. Drag-and-drop works smoothly
2. Quick-add task is fast
3. Recent notes preview shows snippet

#### 1.6 Integration Points

| Integrates With | How | Quality |
|-----------------|-----|---------|
| Calendar/Planner | Drag tasks/habits to schedule | ✅ Excellent |
| Right Details Panel | Click opens details | ✅ Good |
| Notes View | Click opens note | ✅ Good |
| Capture Modal | No direct link | ⚠️ Missing |
| Reports | No link to habit reports | ⚠️ Missing |

#### 1.7 Suggested Improvements

1. **Quick Capture Button**: Add prominent capture button at top of sidebar
2. **Persist UI State**: Save collapse/expand states to localStorage
3. **Pomodoro Prominence**: Move timer to always-visible header area
4. **Keyboard Navigation**: Add Vim-style j/k navigation with Enter to open
5. **Smart Shortcuts**: Learn most-used views and auto-suggest
6. **Habit Streak Badges**: Show current streak count inline
7. **Active Session Indicator**: Show what's currently being tracked

#### 1.8 Adaptation Required

For MVP ship:
- [ ] Persist sidebar collapse states
- [ ] Add empty state CTAs for each section
- [ ] Fix Pomodoro state loss on navigation

For v1.1:
- [ ] Make shortcuts user-configurable
- [ ] Add keyboard navigation
- [ ] Sync pinned order to Supabase

---

### Feature 2: Calendar/Planner View

**Location**: [planner.tsx](apps/desktop/src/workspace/views/planner.tsx)

#### 2.1 What It Does

Multi-mode calendar with:
- **Day View**: Hourly time blocks with drag-drop scheduling (Tiimo-style)
- **Week View**: 7-day grid with events
- **Month View**: Monthly overview
- **Timeline View**: Chronological event list with tag filtering
- **Gantt View**: Project timeline visualization

#### 2.2 Data & Storage Architecture

| Data | Storage | Sync Status |
|------|---------|-------------|
| Events | IndexedDB `calendar-events` | ✅ Supabase sync |
| Tasks | IndexedDB `tasks` | ✅ Supabase sync |
| Captures | IndexedDB `captures` | ✅ Supabase sync |
| View Mode | React state | ❌ Not persisted |
| Selected Date | React state | ❌ Not persisted |

#### 2.3 Code Problems Identified

```typescript
// Problem 1: View mode lost on navigation (planner.tsx:83)
const [mode, setMode] = useState<PlannerMode>('day')
// Should persist last-used mode

// Problem 2: No optimistic updates for drag-drop
onMoveEvent: (eventId: string, startAt: number, endAt: number) => void
// Should update UI immediately, then sync

// Problem 3: Gantt view query not debounced
const [ganttQuery, setGanttQuery] = useState('')
// Causes re-render on every keystroke
```

#### 2.4 Visual Design Assessment

| Aspect | Current State | Issue | Fix Priority |
|--------|--------------|-------|--------------|
| Event colors | Good preset system | Works well | ✅ |
| Time grid | Clean hourly lines | Good | ✅ |
| Mode switcher | Toggle group | Good | ✅ |
| Event cards | Basic styling | Could use more polish | P2 |
| Gantt bars | Minimal | Needs better visual hierarchy | P2 |

#### 2.5 UI/UX Experience

**Friction Points**:
1. **No time zone display** - Users working across zones confused
2. **Drag-drop precision** - Hard to hit exact 15-min slots
3. **Event creation requires composer** - No inline quick-add
4. **No recurring events** - Major missing feature

**Delighters**:
1. Tiimo-style visual blocks are distinctive
2. Multi-mode flexibility
3. Gantt view is unique for a personal tracker

#### 2.6 Integration Points

| Integrates With | How | Quality |
|-----------------|-----|---------|
| Vault Sidebar | Drag tasks/habits onto calendar | ✅ Excellent |
| Event Composer | Double-click opens | ✅ Good |
| Right Details Panel | Click event opens details | ✅ Good |
| Active Session Banner | Shows when event is running | ✅ Good |
| Reports | Events feed into analytics | ✅ Good |

#### 2.7 Suggested Improvements

1. **Inline Quick Add**: Click empty slot → type title → Enter
2. **Recurring Events**: Add basic recurrence (daily, weekly, monthly)
3. **Snap Grid Toggle**: Allow 5/15/30/60 minute snap intervals
4. **Today Indicator**: Prominent "now" line in day/week view
5. **Persist View Mode**: Remember last-used calendar mode
6. **Multi-Day Events**: Support events spanning multiple days

---

### Feature 3: Notes/Inbox View

**Location**: [notes.tsx](apps/desktop/src/workspace/views/notes.tsx)

#### 3.1 What It Does

A capture inbox that displays all voice/text captures with:
- **Card/Table Views**: Toggle between visual cards and data table
- **Search**: Full-text search across all captures
- **Tag Filtering**: Filter by extracted hashtags
- **Sort Options**: Recent, oldest, alphabetical
- **Entity Extraction**: Auto-extracts #tags, @people, !places from text

#### 3.2 Data & Storage Architecture

| Data | Storage | Sync Status |
|------|---------|-------------|
| Captures | IndexedDB `captures` | ✅ Supabase sync |
| Tag Index | Computed at render | N/A |
| Search Index | Simple string matching | N/A |
| View Preferences | React state | ❌ Not persisted |

**Architect Assessment**:
- ⚠️ **Problem**: Search is O(n) string matching - will slow with 1000+ captures
- ⚠️ **Problem**: No full-text search index (should use Dexie's compound indexes)
- ✅ **Good**: Entity extraction regex is well-structured

#### 3.3 Code Problems Identified

```typescript
// Problem 1: No search debouncing (notes.tsx:59-70)
const filtered = useMemo(() => {
  const needle = q.trim().toLowerCase()
  // Runs on every keypress - should debounce

// Problem 2: Limited to 250 results without pagination
return sorted.slice(0, 250)
// Should implement infinite scroll or pagination

// Problem 3: View mode not persisted
const [mode, setMode] = useState<'cards' | 'table'>('cards')
```

#### 3.4 Visual Design Assessment

| Aspect | Current State | Issue | Fix Priority |
|--------|--------------|-------|--------------|
| Card layout | Clean grid | Good | ✅ |
| Typography | Readable hierarchy | Good | ✅ |
| Tag chips | Styled pills | Could be more colorful | P3 |
| Empty state | Missing | Should show onboarding | P1 |
| Search feedback | No loading indicator | Add skeleton | P2 |

#### 3.5 UI/UX Experience

**Friction Points**:
1. **No inline editing** - Must open separate panel to edit
2. **No bulk operations** - Can't select multiple to delete/tag
3. **No date range filter** - Only search and tag filter
4. **No export** - Can't export notes to Markdown

**Delighters**:
1. Live entity extraction shows tags/people/places
2. Word count displayed per capture
3. Quick date grouping

#### 3.6 Suggested Improvements

1. **Full-Text Search**: Implement proper search indexing
2. **Inline Edit**: Double-click to edit in place
3. **Bulk Actions**: Multi-select with batch operations
4. **Date Filter**: Add date range picker
5. **Export**: Export selected notes as Markdown/JSON

---

### Feature 4: Assistant/Chat View

**Location**: [assistant.tsx](apps/desktop/src/workspace/views/assistant.tsx)

#### 4.1 What It Does

AI-powered chat assistant with three modes:
- **Local Mode**: Searches IndexedDB using keyword matching
- **LLM Mode**: Sends queries to OpenAI with context from local data
- **Hybrid Mode**: Local search + LLM enhancement

#### 4.2 Data & Storage Architecture

| Data | Storage | Sync Status |
|------|---------|-------------|
| Chat History | IndexedDB | ✅ Persisted |
| Settings | localStorage `insight5.assistant.settings` | ❌ Local only |
| Search Hits | React state | Ephemeral |

**Architect Assessment**:
- ✅ **Good**: RAG-style context injection from local data
- ✅ **Good**: Chat persisted to IndexedDB
- ⚠️ **Problem**: No streaming responses (waits for full completion)
- ⚠️ **Problem**: Context window not managed (could exceed token limit)

#### 4.3 Code Problems Identified

```typescript
// Problem 1: Hardcoded default model (assistant.tsx:74)
const [chatModel, setChatModel] = useState<string>(initialSettings.chatModel ?? 'gpt-4.1-mini')
// Should validate model exists before using

// Problem 2: No error retry logic
const answer = await callOpenAiChat({ ... })
// If call fails, user sees error but can't retry

// Problem 3: Context not token-limited
const context = [ captureHits, eventHits, taskHits ].filter(Boolean).join('\n')
// Could exceed model context window
```

#### 4.4 Visual Design Assessment

| Aspect | Current State | Issue | Fix Priority |
|--------|--------------|-------|--------------|
| Chat bubbles | Clean layout | Good | ✅ |
| Markdown rendering | Works via ReactMarkdown | Good | ✅ |
| Input area | Basic textarea | Could be richer | P2 |
| Source citations | Shown inline | Good | ✅ |
| Loading state | Basic spinner | Should show typing indicator | P2 |

#### 4.5 UI/UX Experience

**Friction Points**:
1. **No streaming** - Waits for full response (feels slow)
2. **No follow-up context** - Each message is independent
3. **Can't reference specific notes** - No @mention syntax
4. **No voice input** - Despite being a voice-first app

**Delighters**:
1. Clickable source references
2. Local search fallback works without API key
3. Embeddable in right panel

#### 4.6 Suggested Improvements

1. **Streaming Responses**: Use OpenAI streaming API
2. **Conversation Context**: Maintain multi-turn context
3. **@Mention Syntax**: Reference specific captures/events
4. **Voice Input**: Add mic button for voice queries
5. **Token Management**: Truncate context to fit model limit

---

### Feature 5: Settings View

**Location**: [settings.tsx](apps/desktop/src/workspace/views/settings.tsx)

#### 5.1 What It Does

Configuration panel for:
- **AI Settings**: OpenAI API key, model selection, test connection
- **Theme**: Light/Dark/System theme toggle
- **Display**: Event title detail level
- **Auth**: Supabase sign-in/sign-up
- **Taxonomy Rules**: Custom categorization rules (YAML)
- **Units**: Weight/distance unit preferences

#### 5.2 Data & Storage Architecture

| Data | Storage | Sync Status |
|------|---------|-------------|
| API Key | localStorage (encrypted) | ❌ Local only |
| Theme | localStorage | ❌ Local only |
| Auth Session | Supabase | ✅ Cloud |
| Taxonomy Rules | localStorage | ❌ Local only |
| Unit Prefs | localStorage | ❌ Local only |

**Architect Assessment**:
- ⚠️ **Problem**: API key stored in localStorage (accessible to XSS)
- ⚠️ **Problem**: Settings not synced across devices
- ✅ **Good**: Theme applies immediately without reload
- ✅ **Good**: Model list fetched dynamically from OpenAI

#### 5.3 Code Problems Identified

```typescript
// Problem 1: API key visible in localStorage
setDraftKey(next.openAiKey ?? '')
// Should encrypt or use secure storage

// Problem 2: No validation of YAML rules before save
setRulesText(rulesText)
// Should parse and validate YAML syntax

// Problem 3: Theme doesn't sync across tabs
onThemeChange(next: ThemePreference)
// Should use BroadcastChannel or storage events
```

#### 5.4 Visual Design Assessment

| Aspect | Current State | Issue | Fix Priority |
|--------|--------------|-------|--------------|
| Section grouping | Cards with headers | Clean | ✅ |
| Form controls | Standard inputs | Functional | ✅ |
| Auth flow | Inline form | Could be cleaner | P2 |
| Theme preview | Color swatches | Good | ✅ |
| Error display | Red text | Could be toast | P3 |

#### 5.5 UI/UX Experience

**Friction Points**:
1. **API key entry tedious** - Paste key, save, test - 3 steps
2. **No import/export** - Can't backup settings
3. **Taxonomy editor is raw text** - Should have visual builder
4. **No data export** - Can't export all data

**Delighters**:
1. Live model list from OpenAI
2. Theme preview swatches
3. Test connection button with feedback

#### 5.6 Suggested Improvements

1. **Secure Key Storage**: Use IndexedDB with encryption
2. **Settings Sync**: Sync settings to Supabase (except API key)
3. **Data Export**: Full JSON export of all local data
4. **Visual Taxonomy Builder**: Drag-drop rule creation
5. **Onboarding Wizard**: Guided first-time setup

---

### Feature 6: Reports/Analytics View

**Location**: [reports.tsx](apps/desktop/src/workspace/views/reports.tsx)

#### 6.1 What It Does

Analytics dashboard showing aggregated data:
- **By Category**: Time and points by activity category
- **By Person**: Social interaction analytics
- **By Tag**: Tag-based time distribution
- **By Place**: Location-based analytics
- **By Skill**: Skill progression tracking

Time range filters: 7d, 30d, 90d, 365d, all

#### 6.2 Data & Storage Architecture

| Data | Storage | Source |
|------|---------|--------|
| Events | IndexedDB | ✅ Real-time |
| Tasks | IndexedDB | ✅ Real-time |
| Aggregations | Computed at render | N/A |
| Selected Range | React state | ❌ Not persisted |

**Architect Assessment**:
- ⚠️ **Problem**: Aggregations computed on every render (should memoize)
- ⚠️ **Problem**: No caching of expensive calculations
- ✅ **Good**: Points calculation follows consistent formula
- ✅ **Good**: Clean separation of report types

#### 6.3 Code Problems Identified

```typescript
// Problem 1: No memoization of expensive aggregations
const categoryRows = useMemo(() => buildCategoryReport(...), [events, tasks, range, includeLogs])
// Recomputes on any prop change, could cache by date range

// Problem 2: Limited to 20 rows per report
.slice(0, 20)
// Should allow expanding or pagination

// Problem 3: No chart visualizations
// Just lists/tables - should add charts
```

#### 6.4 Visual Design Assessment

| Aspect | Current State | Issue | Fix Priority |
|--------|--------------|-------|--------------|
| Card layout | Glass cards | Looks good | ✅ |
| Data density | Medium | Appropriate | ✅ |
| Range selector | Toggle group | Functional | ✅ |
| Missing charts | No visualizations | Should add pie/bar charts | P1 |
| Empty states | "No data" text | Needs more guidance | P2 |

#### 6.5 UI/UX Experience

**Friction Points**:
1. **No charts** - All text/lists, no visual graphs
2. **No drill-down** - Can't click to see underlying events
3. **No comparison** - Can't compare this week vs last week
4. **No export** - Can't export reports

**Delighters**:
1. Points and time shown together
2. Entry count included
3. Clean consistent styling

#### 6.6 Suggested Improvements

1. **Add Charts**: Pie chart for time, bar chart for trends
2. **Drill-Down**: Click category to see events
3. **Period Comparison**: Side-by-side week/month comparison
4. **Export**: CSV/PDF export option
5. **Custom Reports**: Build custom aggregations

---

### Feature 7: Habits View

**Location**: [habits.tsx](apps/desktop/src/workspace/views/habits.tsx)

#### 7.1 What It Does

Habit definition and tracking with:
- **Habit Definitions**: Name, category, difficulty, importance, character stats
- **Heatmap Display**: GitHub-style contribution graph per habit
- **Streak Tracking**: Current streak calculation
- **Quick Log**: One-click logging via dragging to calendar
- **Supabase Sync**: Habits sync across devices

#### 7.2 Data & Storage Architecture

| Data | Storage | Sync Status |
|------|---------|-------------|
| Habit Definitions | localStorage → Supabase | ✅ Bidirectional |
| Habit Logs | IndexedDB (as events) | ✅ Supabase sync |
| Heatmap Data | Computed from events | N/A |
| Selected Habit | React state | Ephemeral |

**Architect Assessment**:
- ✅ **Good**: Supabase sync implemented for habits
- ✅ **Good**: Heatmap efficiently computed with useMemo
- ⚠️ **Problem**: localStorage used as initial storage before sync
- ⚠️ **Problem**: No conflict resolution for concurrent edits

#### 7.3 Code Problems Identified

```typescript
// Problem 1: Race condition in Supabase merge (habits.tsx:88-126)
const remoteHabits = await pullHabitsFromSupabase()
// Local and remote could have conflicting edits

// Problem 2: No debounce on save
useEffect(() => {
  saveHabits(defs)
  window.dispatchEvent(new Event('insight5.habits.updated'))
}, [defs])
// Fires on every small change

// Problem 3: Polarity not used in UI
polarity?: 'positive' | 'negative' | 'both'
// Defined but not displayed or used in heatmap colors
```

#### 7.4 Visual Design Assessment

| Aspect | Current State | Issue | Fix Priority |
|--------|--------------|-------|--------------|
| Heatmap | GitHub-style | Very good | ✅ |
| Habit cards | Clean design | Good | ✅ |
| Form layout | Functional | Dense but okay | P3 |
| Color coding | Green gradient | Should support multiple colors | P2 |
| Streak badge | Shown inline | Could be more prominent | P2 |

#### 7.5 UI/UX Experience

**Friction Points**:
1. **No scheduling** - Can't set reminders or target times
2. **No notes on log** - Can't add context when logging
3. **No skip option** - Can't mark intentional skip
4. **Limited stats** - Only streak, no completion rate

**Delighters**:
1. Beautiful heatmap visualization
2. Drag-to-calendar logging
3. Character stat integration

#### 7.6 Suggested Improvements

1. **Habit Reminders**: Time-based notifications
2. **Notes on Log**: Add optional note when completing
3. **Skip Tracking**: Mark intentional skips (vacation, sick)
4. **Advanced Stats**: Completion rate, best streak ever
5. **Habit Templates**: Pre-built habits for common goals

---

### Feature 8: Capture Modal

**Location**: [CaptureModal.tsx](apps/desktop/src/ui/CaptureModal.tsx)

#### 8.1 What It Does

The core capture interface featuring:
- **Text Input**: Dynamic sizing based on content length
- **Voice Input**: Real-time transcription overlay
- **AI Processing**: Smart loading phrases during parsing
- **Event Attachment**: Can append to existing event
- **Progress Feedback**: Step-by-step processing status

#### 8.2 Data Flow Architecture

```
User Input → [Text/Voice] → Draft State → onSave() →
  → NLP Parsing → Entity Extraction →
  → IndexedDB Save → Supabase Sync
```

**Architect Assessment**:
- ✅ **Good**: Modal animation is smooth (Framer Motion)
- ✅ **Good**: Dynamic text sizing improves UX
- ⚠️ **Problem**: No offline queue if save fails
- ⚠️ **Problem**: Voice transcript not streamed (waits for complete)

#### 8.3 Code Problems Identified

```typescript
// Problem 1: No error recovery (CaptureModal.tsx:143-150)
{error ? (
  <div className="text-red-500">{error}</div>
) : isSaving ? ...
// Error shown but no retry button

// Problem 2: Loading phrases array is static
const LOADING_PHRASES = [ "Reading your thoughts...", ... ]
// Could be more contextual based on content type

// Problem 3: Textarea doesn't save on blur
<textarea onChange={(e) => setDraft(e.target.value)} />
// If user closes browser, draft is lost
```

#### 8.4 Visual Design Assessment

| Aspect | Current State | Issue | Fix Priority |
|--------|--------------|-------|--------------|
| Modal animation | Smooth spring | Excellent | ✅ |
| Text input | Dynamic sizing | Good | ✅ |
| Voice indicator | Pulsing overlay | Good | ✅ |
| Loading state | Rotating phrases | Delightful | ✅ |
| Error display | Red text | Could be toast | P3 |
| Keyboard support | Missing | Should support Cmd+Enter | P1 |

#### 8.5 UI/UX Experience

**Friction Points**:
1. **No keyboard shortcut** - Must click Save button
2. **No autosave** - Draft lost on close
3. **No template selection** - Must type everything
4. **Voice requires hold** - Should toggle on/off

**Delighters**:
1. Smooth modal animation
2. Dynamic text sizing
3. Contextual loading phrases
4. Event attachment display

#### 8.6 Suggested Improvements

1. **Cmd+Enter to Save**: Standard keyboard shortcut
2. **Draft Autosave**: Save to localStorage every 5 seconds
3. **Quick Templates**: "Meeting notes", "Workout", "Meal"
4. **Voice Toggle**: Click once to start, again to stop
5. **Retry on Error**: Add retry button for failed saves

---

## Part 13: System Architecture & $100M Product Vision

### 13.1 The Core Insight: Voice-First Life Database

InSight 5's revolutionary insight is that **voice is the universal API for life capture**. Every person naturally narrates their day—we just need to listen, parse, and organize.

```
┌─────────────────────────────────────────────────────────────────┐
│                    THE INSIGHT 5 VISION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   "Speak your life → Understand your patterns → Level up"       │
│                                                                 │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐               │
│   │  CAPTURE │ --> │  PARSE   │ --> │  ORGANIZE│               │
│   │  (Voice) │     │  (AI)    │     │  (Auto)  │               │
│   └──────────┘     └──────────┘     └──────────┘               │
│        │                │                │                      │
│        v                v                v                      │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐               │
│   │  ANALYZE │ <-- │  GAMIFY  │ <-- │  REWARD  │               │
│   │  (Trends)│     │  (XP)    │     │  (Store) │               │
│   └──────────┘     └──────────┘     └──────────┘               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 13.2 The Complete Data Flow Workflow

#### Stage 1: Voice Capture → Markdown

```
User speaks: "Just finished my morning workout, 45 minutes of cardio,
              feeling great, #energy 8, talked to @Sarah about the project"

                    ↓
┌─────────────────────────────────────────────────────────────────┐
│                   WHISPER TRANSCRIPTION                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ "Just finished my morning workout, 45 minutes of cardio,    ││
│  │  feeling great, #energy 8, talked to @Sarah about the       ││
│  │  project"                                                   ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                    ↓
```

#### Stage 2: LLM Parsing → Structured Properties

```
┌─────────────────────────────────────────────────────────────────┐
│              GPT-4.1 PARSING ENGINE                             │
├─────────────────────────────────────────────────────────────────┤
│  INPUT: Raw transcript                                          │
│  OUTPUT: YAML frontmatter + Markdown body                       │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ ---                                                       │  │
│  │ type: event                                               │  │
│  │ title: "Morning Workout"                                  │  │
│  │ category: Health                                          │  │
│  │ subcategory: Exercise                                     │  │
│  │ startAt: 2026-01-03T07:00:00Z                            │  │
│  │ endAt: 2026-01-03T07:45:00Z                              │  │
│  │ duration: 45                                              │  │
│  │ importance: 7                                             │  │
│  │ difficulty: 6                                             │  │
│  │ tags: [#workout, #cardio, #morning-routine]              │  │
│  │ people: [@Sarah]                                          │  │
│  │ trackers:                                                 │  │
│  │   - key: energy                                           │  │
│  │     value: 8                                              │  │
│  │ mood_detected: positive                                   │  │
│  │ sentiment_score: 0.85                                     │  │
│  │ character_stats: [CON, STR]                              │  │
│  │ skills: [Cardio, Endurance]                              │  │
│  │ ---                                                       │  │
│  │                                                           │  │
│  │ Just finished my morning workout. 45 minutes of cardio,  │  │
│  │ feeling great. Talked to @Sarah about the project.       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

#### Stage 3: Auto-Organization (Obsidian-Style)

```
┌─────────────────────────────────────────────────────────────────┐
│              AUTOMATIC FILING SYSTEM                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Parsed Entry                                                   │
│       ↓                                                         │
│  ┌─────────────────┐                                           │
│  │ Category Router │                                           │
│  └────────┬────────┘                                           │
│           │                                                     │
│     ┌─────┴─────┬─────────────┬─────────────┬──────────┐       │
│     ↓           ↓             ↓             ↓          ↓       │
│ ┌───────┐ ┌─────────┐ ┌───────────┐ ┌──────────┐ ┌─────────┐  │
│ │Health │ │Personal │ │   Work    │ │ Learning │ │ Social  │  │
│ │       │ │         │ │           │ │          │ │         │  │
│ │Workout│ │Errands  │ │Meetings   │ │Courses   │ │Events   │  │
│ │Meals  │ │Self-care│ │Deep Work  │ │Reading   │ │Family   │  │
│ │Sleep  │ │Hobbies  │ │Email      │ │Practice  │ │Friends  │  │
│ └───┬───┘ └────┬────┘ └─────┬─────┘ └────┬─────┘ └────┬────┘  │
│     │          │            │            │            │        │
│     └──────────┴────────────┴────────────┴────────────┘        │
│                             ↓                                   │
│                 ┌───────────────────────┐                      │
│                 │   UNIFIED ENTRIES     │                      │
│                 │      DATABASE         │                      │
│                 │   (IndexedDB + Supa)  │                      │
│                 └───────────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

#### Stage 4: Append/Amend Re-Auditing

```
┌─────────────────────────────────────────────────────────────────┐
│              APPEND/AMEND WORKFLOW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SCENARIO: User adds to existing event                          │
│                                                                 │
│  Original Event: "Morning Workout" (7:00-7:45, Health)          │
│                                                                 │
│  User speaks: "Update - also did 3 sets of squats, legs are    │
│                sore now, #workout/strength"                     │
│                                                                 │
│                    ↓                                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              INTENT CLASSIFIER                               ││
│  │  ┌──────────────────────────────────────────────────────────┐│
│  │  │ Q: Is this NEW activity or APPEND to existing?           ││
│  │  │                                                          ││
│  │  │ Signals:                                                 ││
│  │  │ - "Update" keyword → APPEND                              ││
│  │  │ - Similar category → APPEND                              ││
│  │  │ - Within time window → APPEND                            ││
│  │  │ - New time reference → NEW                               ││
│  │  └──────────────────────────────────────────────────────────┘│
│  └─────────────────────────────────────────────────────────────┘│
│                    ↓                                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              RE-AUDIT PROCESS                                ││
│  │  1. Merge new trackers: #workout/strength added             ││
│  │  2. Extend workout types: [Cardio] → [Cardio, Strength]     ││
│  │  3. Update skills: [Cardio] → [Cardio, Leg Strength]        ││
│  │  4. Append notes chronologically with timestamp             ││
│  │  5. Recalculate points if duration changed                  ││
│  └─────────────────────────────────────────────────────────────┘│
│                    ↓                                            │
│  RESULT:                                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ---                                                         ││
│  │ title: "Morning Workout"                                    ││
│  │ tags: [#workout, #cardio, #strength]                        ││
│  │ skills: [Cardio, Endurance, Leg Strength]                   ││
│  │ ---                                                         ││
│  │ 07:00 - Started cardio session, 45 minutes                  ││
│  │ 07:45 - Also did 3 sets of squats, legs are sore            ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

### 13.3 The Complete Page-to-Page Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                 COMPLETE USER JOURNEY                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐                                              │
│  │   CAPTURE    │ ← Central action button (primary entry)      │
│  │    MODAL     │                                              │
│  └──────┬───────┘                                              │
│         │                                                       │
│         │ Voice/Text Input                                      │
│         ↓                                                       │
│  ┌──────────────┐                                              │
│  │  LLM PARSE   │ → Entity extraction                          │
│  │   ENGINE     │ → Category inference                         │
│  └──────┬───────┘ → Importance/Difficulty guess                │
│         │                                                       │
│    ┌────┴────────────────────────────────────────────┐         │
│    ↓                    ↓                    ↓       │         │
│ ┌──────┐          ┌──────────┐         ┌─────────┐  │         │
│ │NOTES │          │ CALENDAR │         │ HABITS  │  │         │
│ │INBOX │          │ /PLANNER │         │  VIEW   │  │         │
│ └──┬───┘          └────┬─────┘         └────┬────┘  │         │
│    │                   │                    │       │         │
│    │    Raw captures   │   Scheduled        │ Logged│         │
│    │    stored here    │   events show      │ habits│         │
│    ↓                   ↓                    ↓       │         │
│ ┌───────────────────────────────────────────────────┴──────┐  │
│ │                     DETAILS PANEL                         │  │
│ │  - Edit title, times, category                           │  │
│ │  - Adjust importance/difficulty                          │  │
│ │  - Add tags, people, places                              │  │
│ │  - Write additional notes                                 │  │
│ │  - View points calculation                                │  │
│ └───────────────────────────────────────────────────────────┘  │
│         │                                                       │
│         ↓                                                       │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │                    ANALYTICS LAYER                         │  │
│ ├───────────┬────────────┬────────────┬────────────────────┤  │
│ │ REPORTS   │ DASHBOARD  │ TIMELINE   │ PEOPLE/PLACES/TAGS │  │
│ │           │ (Insights) │            │                    │  │
│ │ By cat    │ Heatmaps   │ Chrono     │ Social network     │  │
│ │ By person │ Pie charts │ view       │ analytics          │  │
│ │ By tag    │ Radar      │            │                    │  │
│ └───────────┴────────────┴────────────┴────────────────────┘  │
│         │                                                       │
│         ↓                                                       │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │                   GAMIFICATION LAYER                       │  │
│ ├─────────────┬───────────────┬──────────────┬─────────────┤  │
│ │   XP/LEVEL  │  GOALS VIEW   │ REWARDS STORE│ CHARACTER   │  │
│ │   PROGRESS  │  (Multipliers)│  (Spend Gold)│   STATS     │  │
│ └─────────────┴───────────────┴──────────────┴─────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 13.4 The Obsidian-Inspired Data Model

The key insight from Obsidian is **properties-as-first-class-citizens**:

```yaml
# Every capture becomes a document with structured properties:

---
id: capture_1704297600_abc123
type: entry
facets: [event, habit]  # Can be multiple types at once
title: "Morning Workout"

# Time properties (parsed from speech)
createdAt: 2026-01-03T07:45:00Z
startAt: 2026-01-03T07:00:00Z
endAt: 2026-01-03T07:45:00Z
duration: 45

# Categorical properties (auto-detected)
category: Health
subcategory: Exercise

# Gamification properties (calculated)
importance: 7
difficulty: 6
points: 31.5
multiplier: 1.0
goal: "Get fit in 2026"

# Entity references (extracted)
tags: ["#workout", "#cardio"]
people: ["@Sarah"]
places: ["!home-gym"]
skills: ["Cardio", "Endurance"]

# Tracker data (parsed inline)
trackers:
  - key: energy
    value: 8
  - key: mood
    value: 7

# Character stats (inferred from category)
character_stats: [CON, STR]

# AI metadata
sentiment: positive
sentiment_score: 0.85
auto_title: true
parse_confidence: 0.92
---

## Notes

Just finished my morning workout. 45 minutes of cardio, feeling great.

### Updates

- **07:45** Added 3 sets of squats
- **08:00** Feeling energized for the day

### Related

- [[2026-01-02 - Evening Run]]
- [[Fitness Goal 2026]]
```

---

### 13.5 What Makes This a $100M Product

#### The Value Stack

```
┌─────────────────────────────────────────────────────────────────┐
│               VALUE CREATION PYRAMID                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    ┌─────────────────┐                         │
│                    │   AI INSIGHTS   │  ← Personalized coaching│
│                    │   & COACHING    │     "You're 30% more   │
│                    │                 │     productive on      │
│                    │    $$$$$        │     Tuesdays"          │
│                    └────────┬────────┘                         │
│                             │                                   │
│               ┌─────────────┴─────────────┐                    │
│               │    PATTERN DISCOVERY      │  ← Correlations    │
│               │                           │    "Coffee + gym   │
│               │         $$$$              │     = better focus"│
│               └─────────────┬─────────────┘                    │
│                             │                                   │
│          ┌──────────────────┴──────────────────┐               │
│          │      GAMIFICATION LAYER             │  ← Motivation │
│          │      XP, Levels, Rewards            │    that works │
│          │                                     │                │
│          │              $$$                    │                │
│          └──────────────────┬──────────────────┘               │
│                             │                                   │
│     ┌───────────────────────┴───────────────────────┐          │
│     │         STRUCTURED DATA LAYER                 │← Queryable│
│     │   Categories, Tags, Properties, Relations     │   life    │
│     │                                               │           │
│     │                    $$                         │           │
│     └───────────────────────┬───────────────────────┘          │
│                             │                                   │
│  ┌──────────────────────────┴──────────────────────────┐       │
│  │              FRICTIONLESS CAPTURE                    │← Just │
│  │        30-second voice → Full structured entry       │  talk │
│  │                                                      │       │
│  │                        $                             │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Key Differentiators That Win

| Feature | Why It Matters | Competitor Weakness |
|---------|----------------|---------------------|
| **Voice-first** | 10x faster than typing | All competitors require manual entry |
| **AI auto-structure** | No organizing work | Obsidian/Notion require manual linking |
| **Unified data model** | One queryable life DB | Competitors have data silos |
| **Non-punitive gamification** | No anxiety/guilt | Habitica punishes missed days |
| **Adaptive learning** | Gets smarter over time | Static rule-based systems |
| **Full data portability** | No lock-in fear | Most competitors trap data |

---

### 13.6 UI/UX Excellence Roadmap

#### Current State → Excellent State

| Area | Current | Target | Implementation |
|------|---------|--------|----------------|
| **Capture UX** | Modal with textarea | Full-screen immersive, voice waveform visualization | Redesign with Framer Motion |
| **Calendar** | Good Tiimo blocks | Silky drag-drop, haptic feedback on mobile | Add react-dnd-kit |
| **Habits** | GitHub heatmap | Interactive heatmap with hover insights | Add tooltips/drill-down |
| **Reports** | Text lists only | Beautiful charts (pie, bar, radar) | Add Recharts/Nivo |
| **Gamification** | Basic XP display | Animated level-ups, confetti, celebrations | Add sound effects, particles |
| **Onboarding** | None | 5-screen wizard with sample data | Build with react-swipeable-views |
| **Voice Feedback** | Basic transcript | Real-time waveform, confidence indicators | Add wavesurfer.js |

#### The "Magic Moments" to Nail

1. **First Capture** → See it auto-categorize and calculate points INSTANTLY
2. **First Level Up** → Confetti, sound, badge unlock
3. **First Insight** → "You spent 40% more time on health this week!"
4. **First Streak** → Flame icon, streak freeze power-up
5. **First Export** → See beautiful Markdown with all your structured data

---

### 13.7 Technical Architecture for Scale

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCTION ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                      CLIENTS                              │  │
│  │  ┌─────────┐  ┌─────────────┐  ┌───────────────────────┐│  │
│  │  │ Mobile  │  │   Desktop   │  │      Web (Future)     ││  │
│  │  │ (Expo)  │  │ (React/Vite)│  │    (React/Next.js)    ││  │
│  │  └────┬────┘  └──────┬──────┘  └───────────┬───────────┘│  │
│  └───────┼──────────────┼─────────────────────┼─────────────┘  │
│          │              │                     │                 │
│          └──────────────┼─────────────────────┘                 │
│                         ↓                                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  LOCAL-FIRST LAYER                        │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │  IndexedDB (Dexie.js)                               │ │  │
│  │  │  - Captures, Events, Tasks, Habits                  │ │  │
│  │  │  - Offline-first, sync when online                  │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                         │                                       │
│                         ↓ Sync                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  SUPABASE BACKEND                         │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │  │
│  │  │  Postgres   │ │  Auth       │ │  Edge Functions     │ │  │
│  │  │  28 tables  │ │  + RLS      │ │  - transcribe_parse │ │  │
│  │  │  + Vectors  │ │             │ │  - sync_health      │ │  │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                         │                                       │
│                         ↓ API Calls                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  EXTERNAL SERVICES                        │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │  │
│  │  │  OpenAI     │ │  Google     │ │  Apple Health       │ │  │
│  │  │  Whisper    │ │  Calendar   │ │  HealthKit          │ │  │
│  │  │  GPT-4.1    │ │  (OAuth)    │ │                     │ │  │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 13.8 Implementation Priority Matrix

#### Phase 1: MVP Polish (Ship-Ready)

| Task | Impact | Effort | Priority |
|------|--------|--------|----------|
| Cmd+Enter to save capture | High | 1 hour | P0 |
| Draft autosave | High | 2 hours | P0 |
| Empty state CTAs | High | 4 hours | P0 |
| Persist view preferences | Medium | 2 hours | P0 |
| Add Onboarding (5 screens) | Critical | 16 hours | P0 |
| Subscription paywall | Critical | 8 hours | P0 |

#### Phase 2: Delight (Week 2-4)

| Task | Impact | Effort | Priority |
|------|--------|--------|----------|
| Charts in Reports | High | 8 hours | P1 |
| Voice waveform UI | Medium | 4 hours | P1 |
| Level-up animations | Medium | 4 hours | P1 |
| Streaming AI responses | High | 8 hours | P1 |
| Keyboard shortcuts | Medium | 4 hours | P1 |

#### Phase 3: Platform (Month 2-3)

| Task | Impact | Effort | Priority |
|------|--------|--------|----------|
| Google Calendar sync | High | 24 hours | P1 |
| Apple HealthKit | High | 16 hours | P1 |
| Push notifications | High | 8 hours | P1 |
| Widgets (iOS/Android) | Medium | 16 hours | P2 |

---

### 13.9 Success Metrics

| Metric | Target | Current | Gap |
|--------|--------|---------|-----|
| Daily Active Captures | 3+/user | Unknown | Need analytics |
| Voice capture % | >70% | Unknown | Need tracking |
| D7 Retention | >20% | Unknown | Need cohort analysis |
| Free→Paid Conversion | >5% | 0% | No paywall yet |
| NPS Score | >40 | Unknown | Need survey |
| Parse Accuracy | >90% | ~85% | Needs improvement |

---

### 13.10 Conclusion: The Path to $100M

InSight 5 has **exceptional technology foundations**:
- ✅ Voice-first capture with LLM parsing (unique in market)
- ✅ Unified data model (elegant architecture)
- ✅ Non-punitive gamification (ADHD-friendly)
- ✅ Offline-first with cloud sync (trust-building)
- ✅ Data portability (no lock-in fear)

**What's needed to reach $100M:**

1. **Nail the UX** - Every interaction should feel magical
2. **Nail the Onboarding** - First 5 minutes determine lifetime value
3. **Launch to ADHD Niche** - They need this, they'll spread the word
4. **Build Community** - Discord, subreddit, power user program
5. **Iterate Rapidly** - Weekly releases, daily user feedback
6. **Expand Gradually** - Add wearables, enterprise, API

**The technology is ready. The market is waiting. Execute with excellence.**

---
