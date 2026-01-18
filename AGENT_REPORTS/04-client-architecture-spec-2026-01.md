# Insight5 Client Architecture Specification

**Date:** 2026-01-18
**Author:** morsov (polecat)
**Scope:** Mobile (React Native/Expo) + Desktop (Electron/Vite)

---

## Executive Summary

Insight5 uses a **dual-client architecture** with mobile and desktop applications sharing core data models, Supabase backend integration, and visual theming. Both clients follow an **offline-first pattern** with local storage as the primary data layer and Supabase for cloud sync.

| Aspect | Mobile | Desktop |
|--------|--------|---------|
| **Framework** | React Native 0.81.5 + Expo 54 | React 19.2 + Electron 39 |
| **Bundler** | Metro | Vite 7 |
| **Routing** | Expo Router (file-based) | Single-page (workspace views) |
| **Local Storage** | AsyncStorage | IndexedDB (Dexie) |
| **Styling** | NativeWind (Tailwind) | Tailwind CSS 4 |
| **State Management** | React Context | React hooks (monolithic) |

---

## 1. Directory Structure

### 1.1 Mobile (`apps/mobile2/`)

```
mobile2/
├── app/                    # Expo Router pages
│   ├── _layout.tsx        # Root providers (Auth, Theme, Session)
│   ├── (tabs)/            # Tab navigation group
│   │   ├── index.tsx      # Dashboard
│   │   ├── habits.tsx     # Habit tracking
│   │   ├── calendar.tsx   # Calendar view
│   │   ├── plan.tsx       # Task planning
│   │   └── more.tsx       # Settings menu
│   ├── voice.tsx          # Voice recording modal
│   ├── focus.tsx          # Active session tracker
│   └── health/            # Health tracking screens
├── src/
│   ├── components/        # Shared UI components
│   ├── state/             # Context providers (auth, session, theme)
│   ├── storage/           # Data layer (events, habits, tasks, etc.)
│   ├── supabase/          # Supabase client & sync
│   ├── lib/               # Business logic (audio, capture, llm)
│   └── native/            # iOS Live Activities integration
├── app.json               # Expo configuration
├── tailwind.config.js     # NativeWind theme
└── package.json
```

### 1.2 Desktop (`apps/desktop/`)

```
desktop/
├── electron/
│   └── main.cjs           # Electron main process (minimal)
├── src/
│   ├── App.tsx            # Monolithic app (~9600 lines)
│   ├── main.tsx           # React bootstrap
│   ├── components/ui/     # Radix UI primitives
│   ├── db/                # IndexedDB with Dexie
│   ├── storage/           # Data access layer
│   ├── supabase/          # Auth & sync
│   ├── workspace/
│   │   ├── pane.tsx       # Tab interface
│   │   ├── split.tsx      # Resizable panels
│   │   └── views/         # 27 view components
│   ├── nlp/               # Natural language parsing
│   ├── learning/          # Adaptive pattern learning
│   ├── scoring/           # Points & streaks
│   └── ui/                # Theme, icons, utilities
├── vite.config.ts         # Vite configuration
└── package.json
```

### 1.3 Shared Package (`packages/shared/src/`)

```
shared/
├── models.ts      # Core type definitions (Entity, Task, CalendarEvent, etc.)
├── ids.ts         # ID generation utilities
├── normalize.ts   # Text normalization
├── taxonomy.ts    # Category/subcategory rules
├── notes.ts       # Note parsing utilities
├── assistant.ts   # AI assistant types
└── integrations/
    ├── calendar.ts
    └── health.ts
```

---

## 2. Shared Patterns

### 2.1 Data Models (from `@insight/shared`)

Both clients consume the same TypeScript types:

```typescript
// Core entities
type Entity = { id, type, key, displayName, createdAt, updatedAt }
type EntityType = 'tag' | 'person' | 'place'

// Events & Tasks
type CalendarEvent = {
  id, title, startAt, endAt, allDay, active, kind,
  tags?, contexts?, people?, location?, skills?,
  category?, subcategory?, importance?, difficulty?,
  trackerKey?, parentEventId?, ...
}
type CalendarEventKind = 'event' | 'task' | 'log' | 'episode'

type Task = {
  id, title, status, createdAt, updatedAt,
  dueAt?, scheduledAt?, completedAt?,
  tags?, contexts?, people?, location?, ...
}
type TaskStatus = 'todo' | 'in_progress' | 'done'

// Health tracking
type Workout = { id, eventId, type, title, exercises, startAt, ... }
type Meal = { id, eventId, type, title, items, totalCalories, macros, ... }
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'drink'

// Learning system
type Pattern = {
  id, type, sourceType, sourceKey, targetType, targetKey,
  confidence, occurrenceCount, acceptCount, rejectCount, ...
}
```

### 2.2 Supabase Integration

Both clients use identical Supabase table structures:

| Table | Purpose |
|-------|---------|
| `entries` | Unified event/task/note storage with polymorphic `facets` |
| `entities` | Tags, people, places |
| `workout_sessions` | Workout metadata |
| `workout_rows` | Individual exercises |
| `nutrition_logs` | Meal tracking |

**Sync Pattern:**
1. Check authentication state
2. If authenticated: write to Supabase, fallback to local on failure
3. If offline: write to local storage, queue for sync
4. On auth state change: sync all local data to Supabase

### 2.3 Theme System

Both platforms support 6 identical color themes:

| Theme | Background | Accent |
|-------|------------|--------|
| `dark` | `#0B1020` | `#D95D39` (coral) |
| `light` | `#FFFFFF` | `#D95D39` |
| `warm` | `#F2F0ED` | Warm tones |
| `olive` | `#1A1F16` | `#8B9A6D` |
| `oliveOrange` | `#2B2A24` | `#D95D39` |
| `roseGold` | `#2D2226` | `#E8AB96` |

CSS variables/theme objects are mirrored across platforms.

### 2.4 Storage Layer Pattern

Both clients implement parallel storage modules:

| Data Type | Mobile Path | Desktop Path |
|-----------|-------------|--------------|
| Events | `src/storage/events.ts` | `src/storage/calendar.ts` |
| Tasks | `src/storage/tasks.ts` | `src/storage/tasks.ts` |
| Habits | `src/storage/habits.ts` | (via localStorage) |
| Workouts | `src/storage/workouts.ts` | `src/storage/workouts.ts` |
| Nutrition | `src/storage/nutrition.ts` | `src/storage/nutrition.ts` |
| Trackers | `src/storage/trackers.ts` | `src/storage/ecosystem.ts` |

Each module exports:
- `list*()` - Fetch all items
- `get*(id)` - Fetch single item
- `create*(input)` / `start*(input)` - Create new item
- `update*(id, patch)` - Partial update
- `delete*(id)` - Remove item
- `syncLocalToSupabase()` - Batch sync to backend

---

## 3. Mobile Architecture Details

### 3.1 Expo Router Navigation

File-based routing with tab navigation:

```
(tabs)/                    # TabNavigator group
├── _layout.tsx           # Custom InsightTabBar (animated)
├── index.tsx             # Dashboard (default)
├── habits.tsx            # Habit tracking
├── calendar.tsx          # Calendar view
├── plan.tsx              # Task planner
├── capture.tsx           # Event capture (hidden from nav)
└── more.tsx              # Settings & extras
```

**Custom Tab Bar Features:**
- Animated center capture button (rotating on press)
- Node count badge on dashboard
- Haptic feedback via `Vibration` API

### 3.2 State Management (React Context)

Three primary context providers:

```typescript
// src/state/auth.tsx
<AuthProvider>  // Supabase session lifecycle

// src/state/session.tsx
<SessionProvider>  // Active event/task tracking + iOS Live Activities

// src/state/theme.tsx
<ThemeProvider>  // Theme + display size preferences
```

**Session Provider** manages:
- Active session (event/task being tracked)
- Start/stop session operations
- Notes & metrics updates
- iOS Live Activity integration
- Pending actions queue

### 3.3 Offline-First Data Flow

```
┌─────────────────┐
│ User Action     │
└────────┬────────┘
         ↓
┌─────────────────┐    ┌─────────────────┐
│ Storage Layer   │───→│ AsyncStorage    │  (always written)
└────────┬────────┘    └─────────────────┘
         ↓
┌─────────────────┐    ┌─────────────────┐
│ Supabase Check  │───→│ Supabase Insert │  (if authenticated)
└────────┬────────┘    └─────────────────┘
         ↓
┌─────────────────┐
│ Return to UI    │
└─────────────────┘
```

### 3.4 iOS Live Activities

Native integration for active session tracking:

```typescript
// src/native/liveActivity.ts
startLiveActivity(session)    // Start lock-screen widget
updateLiveActivity(session)   // Update progress
endLiveActivity()             // Dismiss widget
```

Requires iOS 16.1+ and `NSSupportsLiveActivities: true` in Info.plist.

---

## 4. Desktop Architecture Details

### 4.1 Electron Configuration

**Minimal main process** (`electron/main.cjs`):
- Window: 1200x800, dark background
- Context isolation enabled
- No preload script (pure browser environment)
- No IPC communication
- Loads from Vite dev server or built dist

**Implication:** The desktop app is essentially a web app in an Electron container. No native file system access, no menu bar, no tray icon.

### 4.2 State Management (Monolithic)

Single `App.tsx` component (~9600 lines) manages all state:

```typescript
// Data
const [tasks, setTasks] = useState<Task[]>([])
const [events, setEvents] = useState<CalendarEvent[]>([])
const [captures, setCaptures] = useState<Note[]>([])

// Auth
const [authSession, setAuthSession] = useState<Session | null>(null)

// UI
const [themePref, setThemePref] = useState<ThemePreference>('system')
const [leftCollapsed, setLeftCollapsed] = useState(false)
```

Props are drilled through workspace views. No Redux, Zustand, or Context.

### 4.3 IndexedDB Schema (Dexie)

```typescript
// src/db/insight-db.ts
const schema = {
  entities: 'id, [type+key], type, key, updatedAt',
  notes: 'id, createdAt, status, *entityIds',
  tasks: 'id, updatedAt, status, dueAt, scheduledAt, parentEventId, *entityIds, *contexts, sourceNoteId',
  events: 'id, startAt, endAt, allDay, active, kind, trackerKey, parentEventId, *entityIds, *contexts, sourceNoteId',
  workouts: 'id, eventId, type, startAt, goalId, *tags, createdAt, updatedAt',
  meals: 'id, eventId, type, eatenAt, goalId, *tags, createdAt, updatedAt',
  patterns: 'id, type, [type+sourceKey], [sourceType+sourceKey], confidence, updatedAt'
}
```

### 4.4 Workspace Layout

Resizable split-pane interface:

```
┌──────────────────────────────────────────────────────────┐
│                     Active Session Banner                │
├────────────┬─────────────────────────────┬───────────────┤
│            │                             │               │
│  Explorer  │        Main Pane           │   Details/    │
│  (Left)    │     (Tabbed Views)         │   AI Panel    │
│            │                             │               │
│  - Tasks   │  Dashboard | Notes | ...   │   Properties  │
│  - Habits  │                             │   Assistant   │
│  - Goals   │                             │               │
│            │                             │               │
├────────────┴─────────────────────────────┴───────────────┤
│                     Capture Modal (overlay)              │
└──────────────────────────────────────────────────────────┘
```

**27 Workspace Views** including:
- Dashboard, Notes, Tasks, Calendar
- Goals, Habits, Projects
- Health (Workouts, Nutrition)
- Ecosystem (Tracker definitions)
- Assistant (AI chat)
- Reports, Rewards

### 4.5 NLP Pipeline

Natural language parsing for event capture:

```typescript
// src/nlp/natural.ts
parseCaptureNatural(text) → {
  title, category, subcategory,
  duration, importance, difficulty,
  tags, contexts, people, location,
  trackerKey, trackerValue,
  mood, energy, stress
}
```

Extracts:
- Duration: `~2h30m`, `~45min`
- Importance: `!8`, `importance=8`
- Difficulty: `^7`
- Trackers: `#mood(8)`, `#sleep:300`
- Contexts: `+work`, `+gym`
- Tags: `#workout`, `#meeting`

### 4.6 Adaptive Learning System

Pattern-based suggestions with confidence scoring:

```typescript
// src/learning/
Patterns stored in IndexedDB:
- activity_skill: "gym" → skills: ["Weightlifting"]
- activity_category: "gym" → Health/Workout
- person_context: "@mom" → Social/Call
- location_fill: "LA Fitness" → Health/Workout
```

Confidence decays over time; patterns above threshold auto-apply.

---

## 5. Key Differences

| Aspect | Mobile | Desktop |
|--------|--------|---------|
| **Navigation** | Tab-based with modal sheets | Workspace with tabbed panes |
| **State** | Context providers | Single component with hooks |
| **Local DB** | AsyncStorage (key-value) | IndexedDB (structured) |
| **Voice** | Native audio recording | N/A |
| **Live Activities** | iOS widget support | N/A |
| **NLP** | Basic parsing | Advanced with learning |
| **Adaptive Learning** | N/A | Pattern-based suggestions |
| **Offline** | Full offline support | Full offline support |

---

## 6. Consolidation Opportunities

### 6.1 Immediate Wins

1. **Shared Storage Logic**: Extract common CRUD patterns into `@insight/shared`
2. **Theme Tokens**: Move theme colors/sizes to shared package
3. **NLP Core**: Extract regex patterns to shared, platform-specific wrappers

### 6.2 Future Considerations

1. **Cross-Platform State**: Consider Zustand or Jotai for both platforms
2. **React Native Web**: Could unify codebase with RNW
3. **Shared Components**: Abstract platform-agnostic UI primitives

---

## 7. File Reference Index

### Mobile Critical Files

| Path | Purpose |
|------|---------|
| `app/_layout.tsx` | Root providers, auth routing |
| `app/(tabs)/_layout.tsx` | Custom animated tab bar |
| `src/state/auth.tsx` | Supabase session management |
| `src/state/session.tsx` | Active event tracking |
| `src/state/theme.tsx` | Theme & display preferences |
| `src/storage/events.ts` | Event CRUD & sync |
| `src/supabase/client.ts` | Supabase initialization |
| `src/components/HabitCard.tsx` | Reusable habit UI |
| `src/components/InsightIcon.tsx` | 26 custom SVG icons |

### Desktop Critical Files

| Path | Purpose |
|------|---------|
| `electron/main.cjs` | Electron main process |
| `src/App.tsx` | Monolithic app component |
| `src/db/insight-db.ts` | Dexie IndexedDB schema |
| `src/supabase/sync.ts` | Bidirectional sync |
| `src/workspace/split.tsx` | Resizable panels |
| `src/workspace/pane.tsx` | Tabbed view container |
| `src/nlp/natural.ts` | Pattern-based extraction |
| `src/learning/*.ts` | Adaptive pattern system |
| `src/ui/theme.ts` | Theme management |

---

## 8. Appendix: Dependency Comparison

### Shared Dependencies

| Package | Mobile Version | Desktop Version |
|---------|----------------|-----------------|
| `@supabase/supabase-js` | ^2.87.1 | ^2.87.1 |
| `chrono-node` | ^2.9.0 | ^2.9.0 |
| `react` | 19.1.0 | ^19.2.0 |

### Mobile-Only

- `expo` ~54.0.29
- `expo-router` ~6.0.19
- `nativewind` ^4.2.1
- `react-native` 0.81.5
- `expo-av`, `expo-location`, etc.

### Desktop-Only

- `electron` ^39.2.7
- `vite` ^7.2.4
- `dexie` ^4.2.1
- `@radix-ui/*` components
- `framer-motion` ^12.23.26
