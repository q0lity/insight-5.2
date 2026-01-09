import ActivityKit
import Foundation
import Observation

@MainActor
@Observable
public final class LiveActivityManager {
    public var isEnabled: Bool {
        didSet {
            defaults.set(isEnabled, forKey: Self.enabledKey)
            if !isEnabled {
                Task { await stop(finalTitle: currentState?.title, startedAt: currentState?.startedAt) }
            }
        }
    }
    public private(set) var currentActivityId: String?
    public private(set) var currentActivityType: InsightLiveActivityAttributes.ContentState.ActivityType?

    private var activeActivity: Activity<InsightLiveActivityAttributes>?
    private var currentState: InsightLiveActivityAttributes.ContentState?
    private let defaults: UserDefaults

    private static let enabledKey = "integration.liveactivities.enabled"

    public init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        self.isEnabled = defaults.object(forKey: Self.enabledKey) as? Bool ?? true
        restoreExistingActivity()
    }

    // MARK: - Recording Activity

    public func start(title: String, startedAt: Date = Date()) async {
        await startActivity(
            title: title,
            startedAt: startedAt,
            isRecording: true,
            activityType: .recording,
            targetDuration: nil
        )
    }

    // MARK: - Focus Activity

    public func startFocusActivity(title: String, startedAt: Date = Date(), targetDuration: TimeInterval?) async {
        await startActivity(
            title: title,
            startedAt: startedAt,
            isRecording: false,
            activityType: .focus,
            targetDuration: targetDuration
        )
    }

    // MARK: - Pomodoro Activity

    public func startPomodoroActivity(title: String, startedAt: Date = Date(), workDuration: TimeInterval) async {
        await startActivity(
            title: title,
            startedAt: startedAt,
            isRecording: false,
            activityType: .pomodoro,
            targetDuration: workDuration
        )
    }

    // MARK: - Update Activity

    public func update(
        title: String? = nil,
        startedAt: Date? = nil,
        isRecording: Bool? = nil,
        activityType: InsightLiveActivityAttributes.ContentState.ActivityType? = nil,
        targetDuration: TimeInterval? = nil
    ) async {
        guard isEnabled else { return }
        guard let activity = resolveActivity() else { return }

        let current = currentState ?? InsightLiveActivityAttributes.ContentState(
            title: title ?? "Session",
            startedAt: startedAt ?? Date(),
            isRecording: isRecording ?? false,
            activityType: activityType ?? .recording,
            targetDuration: targetDuration
        )

        let nextState = InsightLiveActivityAttributes.ContentState(
            title: title ?? current.title,
            startedAt: startedAt ?? current.startedAt,
            isRecording: isRecording ?? current.isRecording,
            activityType: activityType ?? current.activityType,
            targetDuration: targetDuration ?? current.targetDuration
        )

        currentState = nextState
        currentActivityType = nextState.activityType
        await update(activity: activity, state: nextState)
    }

    // MARK: - Stop Activity

    public func stop(finalTitle: String? = nil, startedAt: Date? = nil) async {
        let activities = Activity<InsightLiveActivityAttributes>.activities
        guard let activity = resolveActivity() ?? activities.first else {
            currentActivityId = nil
            currentState = nil
            currentActivityType = nil
            return
        }

        let finalState = InsightLiveActivityAttributes.ContentState(
            title: finalTitle ?? currentState?.title ?? "Session",
            startedAt: startedAt ?? currentState?.startedAt ?? Date(),
            isRecording: false,
            activityType: currentState?.activityType ?? .recording,
            targetDuration: currentState?.targetDuration
        )

        await activity.end(.init(state: finalState, staleDate: nil), dismissalPolicy: .immediate)

        for extraActivity in activities where extraActivity.id != activity.id {
            await extraActivity.end(nil, dismissalPolicy: .immediate)
        }

        currentActivityId = nil
        currentState = nil
        currentActivityType = nil
        activeActivity = nil
    }

    // MARK: - Private Helpers

    private func startActivity(
        title: String,
        startedAt: Date,
        isRecording: Bool,
        activityType: InsightLiveActivityAttributes.ContentState.ActivityType,
        targetDuration: TimeInterval?
    ) async {
        guard isEnabled else { return }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }

        let content = InsightLiveActivityAttributes.ContentState(
            title: title,
            startedAt: startedAt,
            isRecording: isRecording,
            activityType: activityType,
            targetDuration: targetDuration
        )
        currentState = content
        currentActivityType = activityType

        if let activity = resolveActivity() {
            await update(activity: activity, state: content)
            return
        }

        let attributes = InsightLiveActivityAttributes(sessionId: UUID().uuidString)

        do {
            let activity = try Activity.request(
                attributes: attributes,
                content: .init(state: content, staleDate: nil),
                pushType: nil
            )
            activeActivity = activity
            currentActivityId = activity.id
        } catch {
            currentActivityId = nil
            currentActivityType = nil
        }
    }

    private func resolveActivity() -> Activity<InsightLiveActivityAttributes>? {
        if let activeActivity {
            return activeActivity
        }
        if let existing = Activity<InsightLiveActivityAttributes>.activities.first {
            activeActivity = existing
            currentActivityId = existing.id
            return existing
        }
        return nil
    }

    private func update(activity: Activity<InsightLiveActivityAttributes>, state: InsightLiveActivityAttributes.ContentState) async {
        await activity.update(.init(state: state, staleDate: nil))
    }

    private func restoreExistingActivity() {
        if let existing = Activity<InsightLiveActivityAttributes>.activities.first {
            activeActivity = existing
            currentActivityId = existing.id
        }
    }
}
