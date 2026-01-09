import Foundation

// MARK: - Timeline Item Kind

/// All data types that can appear in the unified timeline
public enum TimelineItemKind: String, CaseIterable, Sendable {
    case entry
    case task
    case note
    case habitLog
    case trackerLog
    case workout
    case nutrition
}

// MARK: - Timeline Item

/// Unified type-erased wrapper for all timeline data types
/// Enables a single reverse-chronological feed of all user activity
public struct TimelineItem: Identifiable, Sendable {
    public let id: UUID
    public let kind: TimelineItemKind
    public let timestamp: Date
    public let title: String
    public let subtitle: String?
    public let facets: [EntryFacet]
    public let tags: [String]
    public let people: [String]
    public let contexts: [String]

    /// Source object ID for navigation
    public let sourceId: UUID
    /// Source type name for runtime type dispatch
    public let sourceType: String

    public init(
        id: UUID = UUID(),
        kind: TimelineItemKind,
        timestamp: Date,
        title: String,
        subtitle: String? = nil,
        facets: [EntryFacet] = [],
        tags: [String] = [],
        people: [String] = [],
        contexts: [String] = [],
        sourceId: UUID,
        sourceType: String
    ) {
        self.id = id
        self.kind = kind
        self.timestamp = timestamp
        self.title = title
        self.subtitle = subtitle
        self.facets = facets
        self.tags = tags
        self.people = people
        self.contexts = contexts
        self.sourceId = sourceId
        self.sourceType = sourceType
    }
}

// MARK: - Factory Methods

extension TimelineItem {
    /// Create TimelineItem from Entry
    public static func from(entry: Entry) -> TimelineItem {
        TimelineItem(
            id: entry.id,
            kind: .entry,
            timestamp: entry.startAt ?? entry.createdAt,
            title: entry.title,
            subtitle: entry.bodyMarkdown.isEmpty ? entry.notes : entry.bodyMarkdown,
            facets: entry.facets,
            tags: entry.tags,
            people: entry.people,
            contexts: entry.contexts,
            sourceId: entry.id,
            sourceType: "Entry"
        )
    }

    /// Create TimelineItem from TodoTask
    public static func from(task: TodoTask) -> TimelineItem {
        let timestamp = task.scheduledAt ?? task.dueAt ?? Date()
        let subtitle: String?
        if let dueAt = task.dueAt {
            let formatter = DateFormatter()
            formatter.dateStyle = .short
            formatter.timeStyle = .short
            subtitle = "Due: \(formatter.string(from: dueAt))"
        } else {
            subtitle = task.notes.isEmpty ? nil : task.notes
        }

        return TimelineItem(
            id: task.id,
            kind: .task,
            timestamp: timestamp,
            title: task.title,
            subtitle: subtitle,
            facets: [.task],
            tags: task.tags,
            people: [],
            contexts: [],
            sourceId: task.id,
            sourceType: "TodoTask"
        )
    }

    /// Create TimelineItem from Note
    public static func from(note: Note) -> TimelineItem {
        TimelineItem(
            id: note.id,
            kind: .note,
            timestamp: note.createdAt,
            title: note.title,
            subtitle: note.body.isEmpty ? nil : String(note.body.prefix(100)),
            facets: [.note],
            tags: [],
            people: [],
            contexts: [],
            sourceId: note.id,
            sourceType: "Note"
        )
    }

    /// Create TimelineItem from HabitLog
    public static func from(habitLog: HabitLog, habit: HabitDefinition?) -> TimelineItem {
        TimelineItem(
            id: habitLog.id,
            kind: .habitLog,
            timestamp: habitLog.date,
            title: habit?.title ?? "Habit",
            subtitle: habit.map { "Logged: \($0.title)" },
            facets: [.habit],
            tags: [],
            people: [],
            contexts: [],
            sourceId: habitLog.id,
            sourceType: "HabitLog"
        )
    }

    /// Create TimelineItem from TrackerLog
    public static func from(trackerLog: TrackerLog, tracker: TrackerDefinition?) -> TimelineItem {
        let valueString: String
        if let unit = tracker?.unit {
            valueString = "\(trackerLog.value) \(unit)"
        } else {
            valueString = "\(trackerLog.value)"
        }

        return TimelineItem(
            id: trackerLog.id,
            kind: .trackerLog,
            timestamp: trackerLog.createdAt,
            title: tracker?.key ?? "Tracker",
            subtitle: valueString,
            facets: [.tracker],
            tags: [],
            people: [],
            contexts: [],
            sourceId: trackerLog.id,
            sourceType: "TrackerLog"
        )
    }

    /// Create TimelineItem from WorkoutSession
    public static func from(workout: WorkoutSession, entry: Entry?) -> TimelineItem {
        let timestamp = entry?.startAt ?? Date()
        let subtitle: String
        switch workout.template {
        case .strength:
            subtitle = "Strength training"
        case .cardio:
            subtitle = "Cardio workout"
        case .mobility:
            subtitle = "Mobility session"
        }

        return TimelineItem(
            id: workout.id,
            kind: .workout,
            timestamp: timestamp,
            title: entry?.title ?? "Workout",
            subtitle: subtitle,
            facets: [.event],
            tags: entry?.tags ?? ["fitness"],
            people: entry?.people ?? [],
            contexts: entry?.contexts ?? [],
            sourceId: workout.id,
            sourceType: "WorkoutSession"
        )
    }

    /// Create TimelineItem from NutritionLog
    public static func from(nutrition: NutritionLog, entry: Entry?) -> TimelineItem {
        let timestamp = entry?.startAt ?? Date()
        var parts: [String] = []
        if let cal = nutrition.calories { parts.append("\(Int(cal)) cal") }
        if let protein = nutrition.proteinG { parts.append("\(Int(protein))g protein") }
        let subtitle = parts.isEmpty ? nil : parts.joined(separator: " | ")

        return TimelineItem(
            id: nutrition.id,
            kind: .nutrition,
            timestamp: timestamp,
            title: entry?.title ?? "Meal",
            subtitle: subtitle,
            facets: [.event],
            tags: entry?.tags ?? ["nutrition"],
            people: entry?.people ?? [],
            contexts: entry?.contexts ?? [],
            sourceId: nutrition.id,
            sourceType: "NutritionLog"
        )
    }
}
