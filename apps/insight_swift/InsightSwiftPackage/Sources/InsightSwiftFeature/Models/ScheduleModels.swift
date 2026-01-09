import Foundation

public enum ScheduleItemKind: String, Codable, CaseIterable, Sendable {
    case event
    case task
    case habit
}

public enum RecurrenceFrequency: String, Codable, CaseIterable, Sendable {
    case daily
    case weekly
    case monthly
}

public struct RecurrenceRule: Codable, Hashable, Sendable {
    public var frequency: RecurrenceFrequency
    public var interval: Int

    public init(frequency: RecurrenceFrequency, interval: Int = 1) {
        self.frequency = frequency
        self.interval = max(1, interval)
    }
}

public struct RecurrenceException: Codable, Hashable, Sendable {
    public var originalStartAt: Date
    public var startAt: Date?
    public var endAt: Date?
    public var allDay: Bool?
    public var isCancelled: Bool

    public init(
        originalStartAt: Date,
        startAt: Date? = nil,
        endAt: Date? = nil,
        allDay: Bool? = nil,
        isCancelled: Bool = false
    ) {
        self.originalStartAt = originalStartAt
        self.startAt = startAt
        self.endAt = endAt
        self.allDay = allDay
        self.isCancelled = isCancelled
    }

    public func matches(_ date: Date) -> Bool {
        Self.key(for: date) == Self.key(for: originalStartAt)
    }

    private static func key(for date: Date) -> Int {
        Int(date.timeIntervalSince1970 / 60)
    }
}

struct ScheduledItem: Identifiable, Hashable {
    let id: String
    let sourceId: UUID
    let title: String
    let kind: ScheduleItemKind
    let startAt: Date
    let endAt: Date
    let occurrenceStartAt: Date
    let allDay: Bool
    let notes: String
    let tags: [String]
    let recurrenceRule: RecurrenceRule?
    let isRecurring: Bool

    init(
        sourceId: UUID,
        title: String,
        kind: ScheduleItemKind,
        startAt: Date,
        endAt: Date,
        occurrenceStartAt: Date? = nil,
        allDay: Bool = false,
        notes: String = "",
        tags: [String] = [],
        recurrenceRule: RecurrenceRule? = nil,
        isRecurring: Bool = false
    ) {
        let occurrenceStart = occurrenceStartAt ?? startAt
        if isRecurring {
            self.id = "\(sourceId.uuidString)-\(Int(occurrenceStart.timeIntervalSince1970))"
        } else {
            self.id = sourceId.uuidString
        }
        self.sourceId = sourceId
        self.title = title
        self.kind = kind
        self.startAt = startAt
        self.endAt = endAt
        self.occurrenceStartAt = occurrenceStart
        self.allDay = allDay
        self.notes = notes
        self.tags = tags
        self.recurrenceRule = recurrenceRule
        self.isRecurring = isRecurring
    }
}

struct ScheduleDragPayload {
    private static let separator = "|"

    static func encode(kind: ScheduleItemKind, id: UUID) -> String {
        "\(kind.rawValue)\(separator)\(id.uuidString)"
    }

    static func decode(_ raw: String) -> (ScheduleItemKind, UUID)? {
        let parts = raw.split(separator: "|", maxSplits: 1).map(String.init)
        guard parts.count == 2 else { return nil }
        guard let kind = ScheduleItemKind(rawValue: parts[0]) else { return nil }
        guard let id = UUID(uuidString: parts[1]) else { return nil }
        return (kind, id)
    }
}
