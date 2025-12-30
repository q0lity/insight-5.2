# Flutter → React Native UI Translation (Implementation Spec)

This document translates the **actual Flutter UI implementation** in `flutter_app/lib/presentation/**` into an implementation-ready React Native plan: screens, components, states, interactions, and the RN-equivalent libraries/patterns.

## 1) What Was Reviewed (Flutter Sources)

**Primary screens**
- Dashboard: `flutter_app/lib/presentation/pages/dashboard_page.dart`
- Calendar: `flutter_app/lib/presentation/pages/calendar_page.dart`
- Voice capture: `flutter_app/lib/presentation/pages/voice_capture_page.dart`
- Nomie-style trackers: `flutter_app/lib/presentation/pages/habits_trackers_nomie_style.dart`

**Core widgets/components**
- Tiimo calendar grid: `flutter_app/lib/presentation/widgets/tiimo_calendar_proper.dart`
- Voice dialog (web): `flutter_app/lib/presentation/widgets/voice_recording_dialog.dart`
- Tracker grid (tap-to-log): `flutter_app/lib/presentation/widgets/tracker_grid.dart`
- Analytics cards/charts: `flutter_app/lib/presentation/widgets/analytics_dashboard.dart`
- Gamified timer + floating XP: `flutter_app/lib/presentation/widgets/gamified_timer_widget.dart`
- Glassmorphism container: `flutter_app/lib/presentation/widgets/glass_morphism_container.dart`
- Right-side details panel: `flutter_app/lib/presentation/widgets/enhanced_event_details_panel.dart`
- Gantt: `flutter_app/lib/presentation/widgets/gantt_chart_view.dart`

## 2) Translation Principles (RN)
- Preserve **information architecture**: Dashboard → Calendar → Trackers/Habits → Timeline/Views → Detail.
- Preserve **interactions**: swipe review cards, drag calendar blocks, tap-to-log trackers, floating timer with XP.
- Preserve **visual tone**: gradients + glass panels + rounded cards + subtle motion.
- Use **shared design tokens** across mobile + desktop (Electron).

Recommended RN implementation primitives:
- Navigation: React Navigation (tabs + stacks)
- Gestures/animations: `react-native-gesture-handler` + `react-native-reanimated`
- Blur/glass: `expo-blur` (Expo) + gradients (`expo-linear-gradient`)
- Charts/heatmaps: `react-native-svg` + chart lib (Victory Native or custom); heatmap grid custom
- Lists: FlashList for performance

## 3) Screen-by-Screen Mapping

### 3.1 Dashboard (Flutter `DashboardPage`)
**Flutter behavior**
- Gradient background, padded scroll column.
- Header: greeting (“Good morning”), subtitle, streak pill.
- Tapable avatar/status card (navigates to character page).
- Quick Track grid (compact).
- Analytics dashboard (bar chart + stat cards).
- Recent activity section.
- Rewards section.

**RN equivalent**
- Screen: `DashboardScreen`
- Layout:
  - `LinearGradient` background
  - `ScrollView` with `contentContainerStyle` padding 16
  - Sections as reusable “GlassCard” components
- Components:
  - `DashboardHeader` (greeting + streak pill)
  - `AvatarStatusCard` (tap → Character/Progress screen)
  - `QuickTrackGrid` (6 trackers)
  - `TodayProgressCard` (weekly bars + 3 stat cards)
  - `RecentTimelinePreview`
  - `RewardsPreview`

**State**
- Pull from Supabase via React Query; show skeleton placeholders.
- “Pending reviews” badge in header (ties to offline pending captures + unreviewed proposals).

**Visual translation**
- Keep gradient palette from Flutter example; apply glass panels with blur + translucent white borders.

### 3.2 Calendar (Flutter `CalendarPage`)
**Flutter behavior**
- Glass header with date navigation (prev/next), date picker, view switch (day/week/month/timeline/gantt).
- Filter bar toggling facets: events, tasks, habits, trackers, notes.
- Layout includes:
  - collapsible left sidebar (desktop mode)
  - main calendar area
  - right-side details panel (slide in/out)
- Keyboard delete removes selected activity (desktop).
- Floating action button opens create dialog.

**RN equivalent**
- Screen: `CalendarScreen`
- Sub-views:
  - `DayTimelineView` (Tiimo-like)
  - `WeekView`, `MonthView`
  - `TimelineView` (continuous list)
  - `GanttView`
- Header:
  - `GlassHeader` with date nav + date picker + segmented control for view
- Filters:
  - `FacetFilterChips` (`event|task|habit|tracker|note`)
- Details:
  - `EntryDetailsDrawer` (right side on tablet/desktop; bottom sheet on phone)

**Key interaction translation**
- **Desktop**: show left nav + right details panel simultaneously (Electron layout).
- **Phone**: details as bottom sheet (`@gorhom/bottom-sheet`) with snap points.

**Drag/drop & resizing**
- Implement in Day view using gesture handler:
  - drag to move block (updates start time)
  - drag bottom handle to resize (updates duration)
  - long-press empty slot to create new event (start time = slot)
  - optional drag-range create (press+drag to define start/end)

### 3.3 Tiimo Day View (Flutter `TiimoCalendarProper`)
**Flutter behavior**
- 3-column layout:
  1) fixed time column (00:00–23:00)
  2) calendar grid with stacked events
  3) tracker timeline column
- Scroll sync between all three columns with loop prevention.
- Auto-scroll to “current hour - 1”.
- Category colors map (work/exercise/learning/etc).
- Supports drag state and resize state.

**RN equivalent**
- Component: `TiimoDayTimeline`
- Layout:
  - `View` row: `TimeColumn | EventGrid | TrackerTimeline`
  - 3 synchronized `ScrollView`s
  - One “master” scroll with shared animated value; other columns derive offset (avoid feedback loops).

**Implementation approach**
- Use Reanimated shared value: `scrollY`.
- Use `Animated.ScrollView` on main grid; time column and tracker column use same `scrollY` via `scrollTo`.
- Event blocks positioned absolutely within grid; `top = minutesFromMidnight * pxPerMinute`.
- Minimum event height rules (`minEventHeight` equivalent).

**Acceptance**
- Smooth scroll sync with no jitter.
- Dragging event shows live time preview (“11:30”).
- Resize handle shows preview duration.

### 3.4 Voice Capture (Flutter `VoiceCaptureePage` + `VoiceRecordingDialog`)
**Flutter behavior**
- Auto-start recording when screen opens.
- Pulsing mic animation while recording.
- Recording duration counter.
- Fallback to text input.
- Pipeline: record → transcribe → parse → orchestrate.

**RN equivalent**
- Screen: `VoiceCaptureScreen`
- State machine:
  - `idle | recording | transcribing | parsing | review | offline_pending | error`
- UI:
  - Big mic button (press to start/stop)
  - Pulse ring animation while recording
  - Timer text (mm:ss)
  - Transcript preview
  - CTA: “Review X cards”
- Offline:
  - Save audio locally + create pending capture record
  - Show “Pending (offline)” banner

**Important translation detail**
- The Flutter web dialog has a lot of MediaRecorder MIME negotiation; in RN we use native recording APIs (Expo Audio or react-native-audio-recorder-player) so we don’t need MIME probing, but we do need:
  - permissions
  - consistent sample rate / encoding for transcription endpoint

### 3.5 Trackers & Habits (Flutter `HabitsTrackersNomieStylePage` + `TrackerGrid`)
**Flutter behavior**
- “Nomie-style” top bar with view toggle (grid/list/board).
- Horizontal date selector (scrollable 30 days) with selected/today styling.
- Trackers have emoji, type (range/counter/timer/tick), target value, last logged.
- `TrackerGrid` supports tap-to-log: opens input by tracker type and creates a unified activity with metadata.

**RN equivalent**
- Screen: `TrackersScreen` with sub-modes:
  - Grid (default)
  - List
  - Board (dashboard-like)
- Components:
  - `TrackerViewToggle` (grid/list/board)
  - `HorizontalDatePicker`
  - `TrackerTile` (emoji + label + quick input)
  - `TrackerQuickInputModal`:
    - range slider for mood/energy
    - counter stepper for coffee/water
    - timer start button for timed trackers
    - tick checkbox for vitamins/meds
- Behavior:
  - Every tracker log creates:
    - tracker log row
    - optional linked Entry (for timeline visibility)

### 3.6 Floating Timer + XP (Flutter `GamifiedTimerWidget`)
**Flutter behavior**
- Global active timer state provider.
- Points per minute computed from difficulty/importance.
- Floating XP “+X XP” animations.
- Confetti and pulse effects.

**RN equivalent**
- Component: `FloatingTimerPill`
- State source: `activeTimer` in shared store + persisted to SQLite.
- XP calculation (Insight 5):
  - XP accrues by minute: `difficulty * importance * durationMinutes * goalMultiplier`
  - Real-time display can show “XP so far” using elapsed minutes and current multiplier.
- Visuals:
  - pulse ring animation
  - incremental XP ticker
  - optional confetti on completion (platform gating)

### 3.7 Entry Details Panel (Flutter `EnhancedEventDetailsPanel`)
**Flutter behavior**
- Slide-in panel with multiple sections:
  - time section, notes section, category section, properties section, points calculator, tracker section
- Inline timer bar when activity is active (elapsed, remaining, points rate).
- Auto-save behavior in notifier.

**RN equivalent**
- Component: `EntryDetailsPanel`
- Phone: bottom sheet; Desktop: right docked panel.
- Sections:
  - `TimeSection` (start/end, duration, time range)
  - `TagsAndLinksSection` (goals/projects/tags/people/contexts)
  - `ScoringSection` (difficulty/importance, xp preview)
  - `NotesSection` (markdown + segments)
  - `TrackersSection` (history + add)
  - `ExportSection` (share/export later)
- Auto-save:
  - Debounced save to local cache then sync to Supabase.

### 3.8 Gantt View (Flutter `GanttChartView`)
**Flutter behavior**
- Toolbar with goal filter dropdown + zoom controls.
- Date range display and “Today” jump.
- Interactive gantt library.

**RN equivalent**
- Screen: `GanttScreen`
- MVP: custom timeline with horizontal scroll + zoom (0.5x–2x) + per-project swimlanes.
- Phase 1.5+: Markwhen export (optional).

## 4) Mapping Flutter State Management → RN
Flutter uses Riverpod providers for:
- repositories (CRUD)
- activity streams
- orchestrators
- timer state

RN plan:
- Server state: React Query (Supabase queries, invalidation, optimistic updates)
- Local state: Zustand (active timer, current context, pending review queue)
- Offline: SQLite + outbox, reconciled by `packages/sync`

## 5) “Beauty” Requirements to Preserve
Directly derived from Flutter UI patterns:
- gradients (Dashboard)
- glassmorphism headers/panels (Calendar)
- rounded cards + subtle borders
- motion: pulsing mic, slide/fade transitions, confetti on reward moments

## 6) Next Implementation Step (UI)
If you approve, the next step is to scaffold the RN component tree and navigation structure in `Insight 5/` following this translation, starting with:
1) `DashboardScreen`
2) `VoiceCaptureScreen`
3) `CalendarScreen` + `TiimoDayTimeline`
4) `ReviewCards` (swipe)

