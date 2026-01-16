# Specification: Mobile App UI/UX Improvements and Bug Fixes

## Overview

This task involves comprehensive improvements to the Insight mobile app, including critical bug fixes for the recording engine and stop button functionality, UI compaction and layout improvements across multiple components (timer, tracker, heat map, timeline, today's pulse), implementation of a markdown-based notes editor with Obsidian-like features, and adding drag-and-drop event creation to the calendar. The primary focus is on stabilizing the recording functionality and improving the overall user experience through more compact, visually polished UI elements.

## Workflow Type

**Type**: feature

**Rationale**: This task combines critical bug fixes (recording crash, stop button) with multiple UI enhancements and a significant new feature (markdown editor). While the bugs are high priority, the scope extends to significant feature additions and UI overhauls across multiple screens, making this a comprehensive feature implementation rather than a simple bug fix.

## Task Scope

### Services Involved
- **insight-mobile** (primary) - Expo/React Native mobile application requiring recording engine fixes, UI improvements, and new features

### This Task Will:
- [ ] Fix recording engine crash when pressing front action button during recording
- [ ] Fix stop button functionality to properly stop the timer
- [ ] Reduce timer font size and compact the active session card
- [ ] Compact tracker section boxes and consolidate layout
- [ ] Increase size of capture event buttons (user reported too small)
- [ ] Convert "Today's Pulse" display to single-line layout
- [ ] Fix heatmap box spacing to fit screen width properly across all views
- [ ] Improve timeline spacing and visual appearance
- [ ] Implement markdown notes editor with Obsidian-like experience (using existing SimpleMarkdown component)
- [ ] Add plus button for creating new notes/features
- [ ] Add maximize/transcribe button for full-screen note view
- [ ] Add drag-and-drop event creation to calendar

### Out of Scope:
- Desktop app changes
- Backend/API modifications
- Landing page changes
- Database schema changes
- Authentication system changes

## Service Context

### insight-mobile

**Tech Stack:**
- Language: TypeScript
- Framework: React Native with Expo
- Styling: NativeWind (Tailwind CSS for React Native)
- Audio: expo-av
- Navigation: expo-router
- State Management: React Context (SessionProvider, ThemeProvider)

**Key Directories:**
- `src/` - Source code (components, state, storage, utils)
- `app/` - Expo Router pages and layouts
- `components/` - Shared UI components

**Entry Point:** `app/_layout.tsx`

**How to Run:**
```bash
cd apps/insight-mobile && npm run start
```

**Port:** Expo Dev Server (typically 8081)

**Required Environment Variables:**
- `EXPO_PUBLIC_SUPABASE_URL`: Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `app/voice.tsx` | insight-mobile | Fix recording engine crash - add 300ms minimum duration check, debouncing, proper cleanup on stop |
| `src/state/session.tsx` | insight-mobile | Review stopSession function for potential issues, ensure proper state cleanup |
| `app/(tabs)/index.tsx` | insight-mobile | Reduce timer font size (activeClock), compact activeCard, consolidate tracker section, single-line pulse display, increase capture event button sizes |
| `src/components/MobileHeatmap.tsx` | insight-mobile | Fix box spacing calculation to properly fit screen width in week/month/quarter views |
| `app/timeline.tsx` | insight-mobile | Improve spacing, visual polish, and layout consistency |
| `app/notes.tsx` | insight-mobile | Enhance with better list view, ensure plus button works correctly |
| `app/note/[id].tsx` | insight-mobile | Implement markdown preview mode, add maximize/full-screen view, transcribe button |
| `src/components/calendar/DayView.tsx` | insight-mobile | Add drag-to-create event gesture handling |
| `src/components/calendar/WeekView.tsx` | insight-mobile | Add drag-to-create event gesture handling |
| `src/components/calendar/MonthView.tsx` | insight-mobile | Add drag-to-create event gesture handling |
| `app/(tabs)/calendar.tsx` | insight-mobile | Wire up drag-to-create callbacks, create event from drag gesture |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `app/focus.tsx` | Timer display and session management patterns |
| `src/components/TrackerHeatMap.tsx` | Heatmap grid layout patterns |
| `src/components/SimpleMarkdown.tsx` | **EXISTING markdown renderer** - use this for notes preview, no new package needed |
| `src/storage/events.ts` | Event creation/storage patterns for calendar drag-and-drop |
| `src/native/liveActivity.ts` | Understanding Live Activity interactions for recording fix |
| `app/capture.tsx` | Capture event button layout patterns |

## Patterns to Follow

### Recording Safety Pattern

From `app/voice.tsx`:

```typescript
// Track when recording started for minimum duration enforcement
const recordingStartTimeRef = useRef<number>(0);

// Current pattern - needs enhancement with debouncing
const startRecording = useCallback(async () => {
  if (isStartingRef.current) return;
  isStartingRef.current = true;
  recordingStartTimeRef.current = Date.now(); // Track start time
  // ... recording logic
});

// REQUIRED FIX: Add minimum duration check before stop
const stopRecording = useCallback(async () => {
  if (recordingState !== 'recording') return;
  if (!recordingRef.current) return;

  try {
    // NEW: Check if recording has been active long enough
    const recordingDuration = Date.now() - recordingStartTimeRef.current;
    if (recordingDuration < 300) {
      console.warn('Recording too short, waiting...');
      await new Promise(resolve => setTimeout(resolve, 300 - recordingDuration));
    }

    // Stop and unload the recording
    await recordingRef.current.stopAndUnloadAsync();

    // CRITICAL: Release iOS audio session after stopping
    const Audio = getAudioModule()?.Audio;
    if (Audio?.setAudioModeAsync) {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    }

    // ... rest of stop logic (get URI, process, etc.)
  } catch (error) {
    console.error('Error stopping recording:', error);
    // Handle gracefully - don't crash
  } finally {
    recordingRef.current = null;
    setRecording(null);
    setRecordingState('processing');
  }
}, [recordingState]);
```

**Key Points:**
- expo-av requires ~300ms minimum between stop and new recording
- Only one Recording object can be prepared at a time
- **NOTE**: Recording crash source is not 100% verified - could be iOS Action Button (hardware), Live Activity button, or in-app UI button. Investigation may be needed.
- Must set `allowsRecordingIOS: false` after stopping
- Always wrap recording operations in try/catch

### Theme-Aware Styling Pattern

From `app/(tabs)/index.tsx`:

```typescript
const { palette, sizes, isDark } = useTheme();

// Use theme values consistently
<Text style={[styles.activeClock, { color: active ? palette.tint : palette.textSecondary }]}>
  {formatClock(elapsedMs)}
</Text>
```

**Key Points:**
- Always use `palette` colors from theme context
- Use `sizes` for consistent spacing and typography
- Avoid hardcoded colors and dimensions

### Responsive Heatmap Layout Pattern

From `src/components/MobileHeatmap.tsx`:

```typescript
const { width: screenWidth } = useWindowDimensions();

// Calculate cell size based on available width
const labelWidth = useFullDayNames ? 80 : 20;
const horizontalPadding = 32;
const availableWidth = screenWidth - horizontalPadding - labelWidth;
const rawCellSize = Math.floor((availableWidth - (numWeeks - 1) * cellGap) / numWeeks);
```

**Key Points:**
- Use `useWindowDimensions` for responsive calculations
- Account for label width and padding
- Adjust gap and cell sizes per view type

## Requirements

### Functional Requirements

1. **Recording Engine Stability**
   - Description: Prevent app crash when pressing iOS front action button during recording
   - Acceptance: App does not crash when action button is pressed; recording stops gracefully

2. **Stop Button Functionality**
   - Description: Stop button must actually stop the active session timer
   - Acceptance: Pressing stop button ends active session, timer resets, Live Activity ends

3. **Compact Timer Display**
   - Description: Reduce font size of timer clock, compact overall active session card
   - Acceptance: Timer is visually smaller while remaining readable; card takes up less vertical space

4. **Compact Tracker Section**
   - Description: Consolidate tracker boxes to be more space-efficient
   - Acceptance: Tracker section displays same information in roughly 50% less vertical space

5. **Single-Line Today's Pulse**
   - Description: Convert pulse display from multi-line to single horizontal line
   - Acceptance: Pulse stats (events, tracked time, category) display in one row

6. **Larger Capture Event Buttons**
   - Description: Increase size of capture event buttons (user reported they are too small)
   - Acceptance: Capture event buttons are noticeably larger and easier to tap

7. **Heatmap Spacing Fix**
   - Description: Heatmap boxes must fill available screen width appropriately
   - Acceptance: All week/month/quarter/year views have boxes that fit screen without overflow or excessive gaps

8. **Timeline Visual Polish**
   - Description: Improve timeline spacing and visual appearance
   - Acceptance: Timeline items have consistent spacing, better visual hierarchy

9. **Markdown Notes Editor**
   - Description: Implement Obsidian-like note editing with markdown preview using existing `SimpleMarkdown.tsx` component
   - Acceptance: Notes can be edited with markdown syntax; toggle to preview rendered markdown using SimpleMarkdown; full-screen view available

10. **Calendar Drag-and-Drop**
   - Description: Enable creating events by dragging on calendar views
   - Acceptance: User can press-and-drag on calendar to create new event with start/end time

### Edge Cases

1. **Rapid recording toggles** - Debounce stop/start to prevent crash from too-fast toggling
2. **Empty notes** - Handle gracefully when creating/viewing empty notes
3. **Calendar drag near midnight** - Handle events spanning days correctly
4. **Heatmap with no data** - Show empty state without layout breaking
5. **Very long session titles** - Truncate appropriately in compact views
6. **Capture button tap area** - Ensure larger buttons have adequate tap targets for accessibility

## Implementation Notes

### DO
- Follow the existing `useTheme()` pattern for all styling
- Use existing `useSession()` for session management
- Reuse `InsightIcon` component for icons
- Test recording fix with iOS Action Button specifically
- Add debouncing layer to recording operations
- Use `useWindowDimensions` for responsive layouts
- Match existing border radius and spacing conventions

### DON'T
- Don't create new global state management
- Don't add new npm packages without checking if existing ones suffice
- **Don't install react-native-markdown-display** - use existing `SimpleMarkdown.tsx` component instead
- Don't use hardcoded colors - always use theme palette
- Don't modify desktop or landing apps
- Don't change database schema
- Don't remove existing functionality while improving UI

## Development Environment

### Start Services

```bash
# Install dependencies (from project root)
npm install

# Start mobile app
cd apps/insight-mobile && npm run start

# For iOS simulator
npx expo run:ios

# For Android emulator
npx expo run:android
```

### Service URLs
- Expo Dev Server: exp://localhost:8081
- Metro Bundler: http://localhost:8081

### Required Environment Variables
- `EXPO_PUBLIC_SUPABASE_URL`: https://oaywymdbbhhewppmpihr.supabase.co
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: (from .env.local)

## Success Criteria

The task is complete when:

1. [ ] Recording engine no longer crashes when iOS action button pressed during recording
2. [ ] Stop button reliably stops the timer and ends active session
3. [ ] Timer font is noticeably smaller and active card is more compact
4. [ ] Tracker section boxes are consolidated and take less space
5. [ ] Capture event buttons are larger and easier to tap
6. [ ] Today's Pulse displays in a single horizontal line
7. [ ] Heatmap boxes fit properly within screen width for all time ranges
8. [ ] Timeline has improved spacing and visual polish
9. [ ] Notes support markdown editing with preview toggle (using SimpleMarkdown.tsx)
10. [ ] Calendar supports drag-to-create events
11. [ ] No console errors in development
12. [ ] Existing tests still pass
13. [ ] All changes verified on iOS simulator/device

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Recording debounce | `app/voice.tsx` | Verify 300ms minimum duration enforced |
| Stop session | `src/state/session.tsx` | Verify stopSession clears active state |
| Heatmap sizing | `src/components/MobileHeatmap.tsx` | Verify responsive calculations produce valid sizes |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Session lifecycle | session.tsx ↔ events.ts | Start/stop session updates storage correctly |
| Calendar event create | calendar.tsx ↔ events.ts | Drag gesture creates valid event in storage |
| Recording flow | voice.tsx ↔ inbox.ts | Complete capture saved to inbox |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Recording crash test | 1. Start recording 2. Immediately press iOS action button 3. Observe app | App does not crash; recording stops or continues gracefully |
| Stop button test | 1. Start session 2. Press stop button 3. Verify timer | Timer stops, session ends, UI shows "No active event" |
| Heatmap rendering | 1. Navigate to dashboard 2. Toggle week/month/quarter/year | All views render boxes filling screen width appropriately |
| Note markdown preview | 1. Create note 2. Add markdown 3. Toggle preview | Markdown renders correctly with headers, bold, lists (via SimpleMarkdown) |
| Capture button size | 1. Navigate to capture/dashboard 2. Attempt to tap capture buttons | Buttons are visually larger and easy to tap |
| Calendar drag create | 1. Open calendar 2. Press and drag on time slot 3. Release | Event creation modal appears with correct time range |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Dashboard | `exp://localhost:8081/` | Timer compact, pulse single-line, heat map fills width |
| Notes | `exp://localhost:8081/notes` | Plus button creates note, list displays correctly |
| Note Detail | `exp://localhost:8081/note/[id]` | Markdown preview works, full-screen mode available |
| Calendar | `exp://localhost:8081/calendar` | Drag gesture recognized, event created on release |
| Voice | `exp://localhost:8081/voice` | Recording starts/stops without crash |

### Device-Specific Testing
| Device/Config | Test | Expected |
|---------------|------|----------|
| iOS with Action Button | Trigger action button during recording | No crash, graceful stop |
| iOS with Live Activity | Tap Live Activity during recording | No crash, proper navigation |
| Various screen sizes | Check heat map in week/month views | Boxes fit without overflow |

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass (especially recording crash test)
- [ ] iOS Action Button tested and verified stable
- [ ] Browser/simulator verification complete
- [ ] No regressions in existing functionality
- [ ] Code follows established patterns (useTheme, useSession)
- [ ] No security vulnerabilities introduced
- [ ] Performance acceptable (no noticeable lag on interactions)
