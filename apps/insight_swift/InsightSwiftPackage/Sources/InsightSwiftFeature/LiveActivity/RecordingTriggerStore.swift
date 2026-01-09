import Foundation

enum RecordingTriggerStore {
    static let appGroupId = "group.com.insight.insightswift"
    static let pendingKey = "liveActivityStartRecording"
    static let pendingStopKey = "liveActivityStopRecording"
    static let recordingStateKey = "isRecording"

    static func setPendingStart() {
        guard let defaults = UserDefaults(suiteName: appGroupId) else { return }
        defaults.set(true, forKey: pendingKey)
    }

    static func setPendingStop() {
        guard let defaults = UserDefaults(suiteName: appGroupId) else { return }
        defaults.set(true, forKey: pendingStopKey)
    }

    static func consumePendingStart() -> Bool {
        guard let defaults = UserDefaults(suiteName: appGroupId) else { return false }
        guard defaults.bool(forKey: pendingKey) else { return false }
        defaults.set(false, forKey: pendingKey)
        return true
    }

    static func consumePendingStop() -> Bool {
        guard let defaults = UserDefaults(suiteName: appGroupId) else { return false }
        guard defaults.bool(forKey: pendingStopKey) else { return false }
        defaults.set(false, forKey: pendingStopKey)
        return true
    }

    static func setRecordingState(_ isRecording: Bool) {
        guard let defaults = UserDefaults(suiteName: appGroupId) else { return }
        defaults.set(isRecording, forKey: recordingStateKey)
    }
}
