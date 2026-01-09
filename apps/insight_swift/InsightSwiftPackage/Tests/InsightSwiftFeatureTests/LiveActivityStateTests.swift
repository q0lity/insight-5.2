import Foundation
import Testing
@testable import InsightSwiftFeature

// MARK: - Live Activity State Tests

struct LiveActivityStateTests {
    // MARK: - Happy Path Tests

    @Test("Focus session maps to correct ContentState")
    func focusSessionContentStateMapping() {
        let now = Date()
        let session = FocusSession(title: "Deep work", startedAt: now, importance: 7, difficulty: 6)

        let state = InsightLiveActivityAttributes.ContentState(
            title: session.title,
            startedAt: session.startedAt,
            isRecording: false,
            activityType: .focus,
            targetDuration: 3600
        )

        #expect(state.title == "Deep work")
        #expect(state.startedAt == now)
        #expect(state.isRecording == false)
        #expect(state.activityType == .focus)
        #expect(state.targetDuration == 3600)
    }

    @Test("Pomodoro state includes work duration")
    func pomodoroStateIncludesWorkDuration() {
        let now = Date()
        let workDuration: TimeInterval = 25 * 60 // 25 minutes

        let state = InsightLiveActivityAttributes.ContentState(
            title: "Pomodoro - Work",
            startedAt: now,
            isRecording: false,
            activityType: .pomodoro,
            targetDuration: workDuration
        )

        #expect(state.title.contains("Work"))
        #expect(state.activityType == .pomodoro)
        #expect(state.targetDuration == 1500)
    }

    @Test("Recording state defaults correctly")
    func recordingStateDefaults() {
        let now = Date()

        let state = InsightLiveActivityAttributes.ContentState(
            title: "Voice capture",
            startedAt: now,
            isRecording: true
        )

        #expect(state.activityType == .recording)
        #expect(state.isRecording == true)
        #expect(state.targetDuration == nil)
    }

    // MARK: - Edge Case Tests

    @Test("ContentState defaults to recording type when not specified")
    func contentStateDefaultsToRecording() {
        let state = InsightLiveActivityAttributes.ContentState(
            title: "Test",
            startedAt: Date(),
            isRecording: true
        )

        #expect(state.activityType == .recording)
    }

    @Test("Focus state without target duration shows elapsed time mode")
    func focusStateWithoutTargetDuration() {
        let state = InsightLiveActivityAttributes.ContentState(
            title: "Open-ended focus",
            startedAt: Date(),
            isRecording: false,
            activityType: .focus,
            targetDuration: nil
        )

        #expect(state.activityType == .focus)
        #expect(state.targetDuration == nil)
    }

    @Test("ContentState is Codable for ActivityKit serialization")
    func contentStateIsCodable() throws {
        let original = InsightLiveActivityAttributes.ContentState(
            title: "Test Session",
            startedAt: Date(timeIntervalSince1970: 1704067200), // Fixed date for consistent encoding
            isRecording: false,
            activityType: .focus,
            targetDuration: 3600
        )

        let encoder = JSONEncoder()
        let data = try encoder.encode(original)

        let decoder = JSONDecoder()
        let decoded = try decoder.decode(InsightLiveActivityAttributes.ContentState.self, from: data)

        #expect(decoded.title == original.title)
        #expect(decoded.startedAt == original.startedAt)
        #expect(decoded.isRecording == original.isRecording)
        #expect(decoded.activityType == original.activityType)
        #expect(decoded.targetDuration == original.targetDuration)
    }

    // MARK: - Failure Case Tests

    @Test("Activity type enum raw values are stable for persistence")
    func activityTypeRawValuesStable() {
        #expect(InsightLiveActivityAttributes.ContentState.ActivityType.recording.rawValue == "recording")
        #expect(InsightLiveActivityAttributes.ContentState.ActivityType.focus.rawValue == "focus")
        #expect(InsightLiveActivityAttributes.ContentState.ActivityType.pomodoro.rawValue == "pomodoro")
    }

    @Test("ContentState hashable for use in collections")
    func contentStateHashable() {
        let now = Date()
        let state1 = InsightLiveActivityAttributes.ContentState(
            title: "Test",
            startedAt: now,
            isRecording: true,
            activityType: .recording
        )
        let state2 = InsightLiveActivityAttributes.ContentState(
            title: "Test",
            startedAt: now,
            isRecording: true,
            activityType: .recording
        )

        #expect(state1 == state2)
        #expect(state1.hashValue == state2.hashValue)
    }

    @Test("Different activity types produce different states")
    func differentActivityTypesProduceDifferentStates() {
        let now = Date()

        let recording = InsightLiveActivityAttributes.ContentState(
            title: "Test",
            startedAt: now,
            isRecording: true,
            activityType: .recording
        )
        let focus = InsightLiveActivityAttributes.ContentState(
            title: "Test",
            startedAt: now,
            isRecording: true,
            activityType: .focus
        )
        let pomodoro = InsightLiveActivityAttributes.ContentState(
            title: "Test",
            startedAt: now,
            isRecording: true,
            activityType: .pomodoro
        )

        #expect(recording != focus)
        #expect(focus != pomodoro)
        #expect(recording != pomodoro)
    }
}

// MARK: - InsightLiveActivityAttributes Tests

struct InsightLiveActivityAttributesTests {
    @Test("Attributes include session ID")
    func attributesIncludeSessionId() {
        let sessionId = UUID().uuidString
        let attributes = InsightLiveActivityAttributes(sessionId: sessionId)

        #expect(attributes.sessionId == sessionId)
    }

    @Test("Attributes are unique per session")
    func attributesUniquePerSession() {
        let attrs1 = InsightLiveActivityAttributes(sessionId: UUID().uuidString)
        let attrs2 = InsightLiveActivityAttributes(sessionId: UUID().uuidString)

        #expect(attrs1.sessionId != attrs2.sessionId)
    }
}
