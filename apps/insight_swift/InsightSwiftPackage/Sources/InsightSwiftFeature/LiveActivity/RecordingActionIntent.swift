import AppIntents

public struct RecordingActionIntent: AppIntent {
    public static let title: LocalizedStringResource = "Start or Stop Recording"
    public static var openAppWhenRun: Bool = true

    @Parameter(title: "Is Recording")
    public var isRecording: Bool

    public init() {
        isRecording = false
    }

    public init(isRecording: Bool) {
        self.isRecording = isRecording
    }

    public func perform() async throws -> some IntentResult {
        if isRecording {
            RecordingTriggerStore.setPendingStop()
        } else {
            RecordingTriggerStore.setPendingStart()
        }
        return .result()
    }
}
