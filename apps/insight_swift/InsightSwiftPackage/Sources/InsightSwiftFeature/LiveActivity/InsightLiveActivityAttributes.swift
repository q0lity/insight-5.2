import ActivityKit
import Foundation

public struct InsightLiveActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable, Sendable {
        public enum ActivityType: String, Codable, Sendable {
            case recording
            case focus
            case pomodoro
        }

        public var title: String
        public var startedAt: Date
        public var isRecording: Bool
        public var activityType: ActivityType
        public var targetDuration: TimeInterval?

        public init(
            title: String,
            startedAt: Date,
            isRecording: Bool,
            activityType: ActivityType = .recording,
            targetDuration: TimeInterval? = nil
        ) {
            self.title = title
            self.startedAt = startedAt
            self.isRecording = isRecording
            self.activityType = activityType
            self.targetDuration = targetDuration
        }
    }

    public var sessionId: String

    public init(sessionId: String) {
        self.sessionId = sessionId
    }
}
