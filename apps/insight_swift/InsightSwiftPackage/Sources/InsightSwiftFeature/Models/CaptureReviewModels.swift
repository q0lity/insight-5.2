import Foundation

public enum CaptureReviewDecision: String, Codable, CaseIterable {
    case pending
    case accepted
    case rejected
}

public enum CaptureReviewItemKind: String, Codable, CaseIterable {
    case event
    case futureEvent
    case task
    case tracker
    case note
}

public struct CaptureReviewItem: Identifiable, Hashable, Codable {
    public var id: UUID
    public var kind: CaptureReviewItemKind
    public var title: String
    public var detail: String?
    public var category: String?
    public var subcategory: String?
    public var scheduledTime: String?
    public var completed: Bool
    public var trackerValue: TrackerValue?
    public var tokens: MarkdownTokenCollections
    public var decision: CaptureReviewDecision

    public init(
        id: UUID = UUID(),
        kind: CaptureReviewItemKind,
        title: String,
        detail: String? = nil,
        category: String? = nil,
        subcategory: String? = nil,
        scheduledTime: String? = nil,
        completed: Bool = false,
        trackerValue: TrackerValue? = nil,
        tokens: MarkdownTokenCollections = MarkdownTokenCollections(tags: [], people: [], contexts: [], places: [], trackers: []),
        decision: CaptureReviewDecision = .pending
    ) {
        self.id = id
        self.kind = kind
        self.title = title
        self.detail = detail
        self.category = category
        self.subcategory = subcategory
        self.scheduledTime = scheduledTime
        self.completed = completed
        self.trackerValue = trackerValue
        self.tokens = tokens
        self.decision = decision
    }
}

public enum CapturePendingSource: String, Codable {
    case text
    case recording
}

public struct PendingCapture: Identifiable, Hashable, Codable {
    public static let audioPlaceholder = "[Audio capture pending transcription]"

    public var id: UUID
    public var rawText: String
    public var createdAt: Date
    public var source: CapturePendingSource
    public var reason: String
    public var audioFilePath: String?

    public init(
        id: UUID = UUID(),
        rawText: String,
        createdAt: Date = Date(),
        source: CapturePendingSource,
        reason: String,
        audioFilePath: String? = nil
    ) {
        self.id = id
        self.rawText = rawText
        self.createdAt = createdAt
        self.source = source
        self.reason = reason
        self.audioFilePath = audioFilePath
    }

    public var displaySummary: String {
        let trimmed = rawText.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty || trimmed == Self.audioPlaceholder {
            if let name = audioFileName {
                return "Audio capture: \(name)"
            }
            return Self.audioPlaceholder
        }
        return rawText
    }

    public var audioFileName: String? {
        guard let audioFilePath else { return nil }
        return URL(fileURLWithPath: audioFilePath).lastPathComponent
    }

    public var reasonDescription: String {
        switch reason {
        case "offline":
            return "Offline"
        case "parse_failed":
            return "Parsing failed"
        case "parse_timeout":
            return "Parsing timed out"
        case "transcribe_failed":
            return "Transcription failed"
        case "timeout":
            return "Transcription timed out"
        case "transcriber_unavailable":
            return "Transcription unavailable"
        default:
            return reason.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }
}
