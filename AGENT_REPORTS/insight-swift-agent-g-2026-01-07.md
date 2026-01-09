# Agent G Report: Notifications + Live Activities + Background Audio

**Date:** 2026-01-07
**Agent:** G
**Scope:** Local notifications, Live Activity focus session integration, background audio configuration

## Summary

Implemented Phase 1 of the notification and Live Activity system for Insight Swift:
- Background audio for voice recording
- Enhanced notification service with categories, actions, snooze, and time-sensitive support
- Extended Live Activities to support focus/pomodoro sessions with countdown display
- Wired focus session lifecycle to Live Activity updates

Push notifications deferred to Phase 2 (backend not ready - no `device_tokens` table).

## Files Created

| File | Purpose |
|------|---------|
| `Services/NotificationCenterClient.swift` | Protocol for testable notification service |
| `Tests/NotificationSchedulingTests.swift` | 6 notification tests (happy, failure, edge) |
| `Tests/LiveActivityStateTests.swift` | 11 Live Activity state tests |

## Files Modified

| File | Changes |
|------|---------|
| `Config/Shared.xcconfig` | Added `UIBackgroundModes = audio` |
| `Services/NotificationService.swift` | Categories, actions, recurring, snooze, time-sensitive |
| `LiveActivity/InsightLiveActivityAttributes.swift` | Added `ActivityType` enum, `targetDuration` field |
| `Services/LiveActivityManager.swift` | Added focus/pomodoro activity methods |
| `Stores/AppStore.swift` | Wired focus session to Live Activity |
| `InsightSwift/InsightSwiftApp.swift` | Attached LiveActivityManager to AppStore |
| `InsightLiveActivityWidget.swift` | Activity-specific icons, colors, countdown timer |

## Pre-existing Issues Fixed

While implementing, I discovered and fixed several pre-existing build issues:

1. **Package.swift argument order** - `products` must precede `dependencies`
2. **Duplicate RecurrenceException** - Renamed CalendarSyncModels version to `CalendarRecurrenceException`
3. **Missing public/Sendable conformances** - Added to JSONValue, EntryFacet, RecurrenceRule, RecurrenceException
4. **Keypath syntax error** - Fixed `\\.createdAt` to `\.createdAt` in LocalPersistenceService

## Implementation Details

### Notification Service Enhancements

```swift
// New notification categories with actions
public enum NotificationAction: String, Sendable {
    case markComplete = "MARK_COMPLETE"
    case snooze = "SNOOZE"
}

// Snooze presets (stored in UserDefaults)
public enum SnoozeOption: Int, CaseIterable, Sendable {
    case fiveMinutes = 5
    case tenMinutes = 10
    case thirtyMinutes = 30
    case oneHour = 60
}

// Time-sensitive for habit reminders
content.interruptionLevel = .timeSensitive
```

### Live Activity ContentState Extension

```swift
public struct ContentState: Codable, Hashable, Sendable {
    public enum ActivityType: String, Codable, Sendable {
        case recording  // Mic icon, red
        case focus      // Brain icon, purple
        case pomodoro   // Timer icon, orange
    }

    public var title: String
    public var startedAt: Date
    public var isRecording: Bool
    public var activityType: ActivityType
    public var targetDuration: TimeInterval?  // For countdown display
}
```

### Focus Session Wiring

```swift
// AppStore.startFocusSession now triggers Live Activity
public func startFocusSession(title: String, ..., targetDuration: TimeInterval? = nil) {
    let session = FocusSession(...)
    activeFocusSession = session
    Task {
        await liveActivityManager?.startFocusActivity(
            title: title,
            startedAt: session.startedAt,
            targetDuration: targetDuration
        )
    }
}
```

### Widget UI Updates

- Different icons per activity type (mic, brain.head.profile, timer)
- Color coding (red for recording, purple for focus, orange for pomodoro)
- Countdown timer when `targetDuration` is set
- Lock screen view with activity label badge

## Test Coverage

### Notification Tests (6 tests)
1. `scheduleReminderHappyPath` - Verifies request creation
2. `scheduleReminderWhenDenied` - Verifies error when unauthorized
3. `recurringNotificationEdgeCase` - Verifies daily default when no weekdays
4. `habitReminderTimeSensitive` - Verifies interruption level
5. `cancelReminderRemovesVariants` - Verifies weekday variant removal
6. `snoozePreferencePersistence` - Verifies UserDefaults persistence

### Live Activity Tests (11 tests)
1. `focusSessionContentStateMapping` - Focus session → ContentState
2. `pomodoroStateIncludesWorkDuration` - Pomodoro with 25-min duration
3. `recordingStateDefaults` - Recording defaults
4. `contentStateDefaultsToRecording` - Default activity type
5. `focusStateWithoutTargetDuration` - Open-ended focus
6. `contentStateIsCodable` - JSON round-trip
7. `activityTypeRawValuesStable` - Enum stability
8. `contentStateHashable` - Hashable conformance
9. `differentActivityTypesProduceDifferentStates` - Type differentiation
10. `attributesIncludeSessionId` - Attributes session ID
11. `attributesUniquePerSession` - Unique session IDs

## Code Review Reflection

### Concurrency Risks
- NotificationCenterClient protocol methods are async
- LiveActivityManager is @MainActor isolated
- AppStore uses Task{} wrappers for async calls from sync methods

### Security
- No PII in notification content
- Snooze preference is non-sensitive (stored in UserDefaults)
- Habit IDs used as stable identifiers (not user data)

### Data Integrity
- Notification identifiers are stable (habit UUID-based) for reliable cancel/reschedule
- Live Activity reuses existing activity instead of creating duplicates

### Testing Gaps
- Widget UI cannot be unit tested - requires manual device testing
- Live Activity actual rendering not testable (ActivityKit limitation)

### Backwards Compatibility
- ContentState.init uses default parameters (`activityType: .recording`, `targetDuration: nil`)
- Existing recording Live Activity code works unchanged

## Deferred to Phase 2

- **Push Notifications** - Requires:
  - `device_tokens` table in Supabase
  - Edge function to send pushes via APNs
  - App registration + token upload flow

## Remaining Build Issues

The codebase has additional pre-existing build issues unrelated to this work:
- `JavaScriptCaptureParser.swift:10` - JSContext optional unwrapping
- Various other Sendable conformance issues

These should be addressed separately.
