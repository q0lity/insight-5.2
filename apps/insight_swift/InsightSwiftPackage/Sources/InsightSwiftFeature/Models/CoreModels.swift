import Foundation

public enum EntryFacet: String, Codable, CaseIterable, Sendable {
    case event
    case task
    case habit
    case tracker
    case note
}

// MARK: - Entry DB Parity Enums

public enum EntryStatus: String, Codable, CaseIterable, Sendable {
    case open
    case inProgress = "in_progress"
    case done
    case canceled
}

public enum EntryPriority: String, Codable, CaseIterable, Sendable {
    case low
    case normal
    case high
    case urgent
}

public enum EntrySource: String, Codable, CaseIterable, Sendable {
    case app
    case `import`
    case calendar
    case migration
}

public enum TaskStatus: String, Codable, CaseIterable {
    case todo
    case inProgress = "in_progress"
    case done
}

public struct Entry: Identifiable, Codable, Hashable {
    public var id: UUID
    public var title: String
    public var facets: [EntryFacet]
    public var startAt: Date?
    public var endAt: Date?
    public var allDay: Bool
    public var tags: [String]
    public var contexts: [String]
    public var people: [String]
    public var notes: String
    public var recurrenceRule: RecurrenceRule?
    public var recurrenceExceptions: [RecurrenceException]
    public var frontmatter: [String: JSONValue]?

    // MARK: - DB Parity Fields (Supabase entries table)

    public var createdAt: Date
    public var updatedAt: Date
    public var status: EntryStatus?
    public var priority: EntryPriority?
    public var scheduledAt: Date?
    public var dueAt: Date?
    public var completedAt: Date?
    public var durationMinutes: Int?
    public var importance: Int?
    public var difficulty: Int?
    public var goalMultiplier: Double?
    public var xp: Double?
    public var bodyMarkdown: String
    public var source: EntrySource
    public var deletedAt: Date?

    public init(
        id: UUID = UUID(),
        title: String,
        facets: [EntryFacet],
        startAt: Date? = nil,
        endAt: Date? = nil,
        allDay: Bool = false,
        tags: [String] = [],
        contexts: [String] = [],
        people: [String] = [],
        notes: String = "",
        recurrenceRule: RecurrenceRule? = nil,
        recurrenceExceptions: [RecurrenceException] = [],
        frontmatter: [String: JSONValue]? = nil,
        createdAt: Date = Date(),
        updatedAt: Date = Date(),
        status: EntryStatus? = nil,
        priority: EntryPriority? = nil,
        scheduledAt: Date? = nil,
        dueAt: Date? = nil,
        completedAt: Date? = nil,
        durationMinutes: Int? = nil,
        importance: Int? = nil,
        difficulty: Int? = nil,
        goalMultiplier: Double? = nil,
        xp: Double? = nil,
        bodyMarkdown: String = "",
        source: EntrySource = .app,
        deletedAt: Date? = nil
    ) {
        self.id = id
        self.title = title
        self.facets = facets
        self.startAt = startAt
        self.endAt = endAt
        self.allDay = allDay
        self.tags = tags
        self.contexts = contexts
        self.people = people
        self.notes = notes
        self.recurrenceRule = recurrenceRule
        self.recurrenceExceptions = recurrenceExceptions
        self.frontmatter = frontmatter
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.status = status
        self.priority = priority
        self.scheduledAt = scheduledAt
        self.dueAt = dueAt
        self.completedAt = completedAt
        self.durationMinutes = durationMinutes
        self.importance = importance
        self.difficulty = difficulty
        self.goalMultiplier = goalMultiplier
        self.xp = xp
        self.bodyMarkdown = bodyMarkdown
        self.source = source
        self.deletedAt = deletedAt
    }
}

public struct TodoTask: Identifiable, Codable, Hashable {
    public var id: UUID
    public var title: String
    public var status: TaskStatus
    public var dueAt: Date?
    public var scheduledAt: Date?
    public var estimateMinutes: Int?
    public var tags: [String]
    public var people: [String]
    public var contexts: [String]
    public var notes: String
    public var recurrenceRule: RecurrenceRule?
    public var recurrenceExceptions: [RecurrenceException]
    public var frontmatter: [String: JSONValue]?

    public init(
        id: UUID = UUID(),
        title: String,
        status: TaskStatus = .todo,
        dueAt: Date? = nil,
        scheduledAt: Date? = nil,
        estimateMinutes: Int? = nil,
        tags: [String] = [],
        people: [String] = [],
        contexts: [String] = [],
        notes: String = "",
        recurrenceRule: RecurrenceRule? = nil,
        recurrenceExceptions: [RecurrenceException] = [],
        frontmatter: [String: JSONValue]? = nil
    ) {
        self.id = id
        self.title = title
        self.status = status
        self.dueAt = dueAt
        self.scheduledAt = scheduledAt
        self.estimateMinutes = estimateMinutes
        self.tags = tags
        self.people = people
        self.contexts = contexts
        self.notes = notes
        self.recurrenceRule = recurrenceRule
        self.recurrenceExceptions = recurrenceExceptions
        self.frontmatter = frontmatter
    }
}

public struct Note: Identifiable, Codable, Hashable {
    public var id: UUID
    public var title: String
    public var body: String
    public var createdAt: Date

    public init(
        id: UUID = UUID(),
        title: String,
        body: String,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.title = title
        self.body = body
        self.createdAt = createdAt
    }
}

public struct Goal: Identifiable, Codable, Hashable {
    public var id: UUID
    public var title: String
    public var importance: Int

    public init(id: UUID = UUID(), title: String, importance: Int = 5) {
        self.id = id
        self.title = title
        self.importance = importance
    }
}

public struct Project: Identifiable, Codable, Hashable {
    public var id: UUID
    public var title: String
    public var status: String

    public init(id: UUID = UUID(), title: String, status: String = "active") {
        self.id = id
        self.title = title
        self.status = status
    }
}

public struct HabitDefinition: Identifiable, Codable, Hashable {
    public var id: UUID
    public var title: String
    public var importance: Int
    public var difficulty: Int
    public var colorHex: String
    public var tags: [String]
    public var people: [String]
    public var contexts: [String]
    public var targetPerWeek: Int?
    public var isTimed: Bool
    public var scheduledAt: Date?
    public var durationMinutes: Int
    public var recurrenceRule: RecurrenceRule?
    public var recurrenceExceptions: [RecurrenceException]

    public init(id: UUID = UUID(), title: String, importance: Int = 5, difficulty: Int = 5) {
        self.id = id
        self.title = title
        self.importance = importance
        self.difficulty = difficulty
        self.colorHex = "#D95D39"
        self.tags = []
        self.people = []
        self.contexts = []
        self.targetPerWeek = nil
        self.isTimed = false
        self.scheduledAt = nil
        self.durationMinutes = 20
        self.recurrenceRule = nil
        self.recurrenceExceptions = []
    }
}

public struct HabitLog: Identifiable, Codable, Hashable {
    public var id: UUID
    public var habitId: UUID
    public var date: Date

    public init(id: UUID = UUID(), habitId: UUID, date: Date = Date()) {
        self.id = id
        self.habitId = habitId
        self.date = date
    }
}

public struct TrackerDefinition: Identifiable, Codable, Hashable {
    public var id: UUID
    public var key: String
    public var unit: String?
    public var colorHex: String

    public init(id: UUID = UUID(), key: String, unit: String? = nil) {
        self.id = id
        self.key = key
        self.unit = unit
        self.colorHex = "#F97316"
    }
}

public struct TrackerLog: Identifiable, Codable, Hashable {
    public var id: UUID
    public var trackerId: UUID
    public var value: Double
    public var createdAt: Date

    public init(id: UUID = UUID(), trackerId: UUID, value: Double, createdAt: Date = Date()) {
        self.id = id
        self.trackerId = trackerId
        self.value = value
        self.createdAt = createdAt
    }
}

// Note: Workout and Meal structs removed - replaced by WorkoutSession and NutritionLog in HealthKitModels.swift

public struct Person: Identifiable, Codable, Hashable {
    public var id: UUID
    public var name: String
    public var lastSeenAt: Date?

    public init(id: UUID = UUID(), name: String, lastSeenAt: Date? = nil) {
        self.id = id
        self.name = name
        self.lastSeenAt = lastSeenAt
    }
}

public struct Place: Identifiable, Codable, Hashable {
    public var id: UUID
    public var name: String
    public var category: String

    public init(id: UUID = UUID(), name: String, category: String = "General") {
        self.id = id
        self.name = name
        self.category = category
    }
}

public struct TagItem: Identifiable, Codable, Hashable {
    public var id: UUID
    public var name: String
    public var colorHex: String

    public init(id: UUID = UUID(), name: String, colorHex: String = "#8B5CF6") {
        self.id = id
        self.name = name
        self.colorHex = colorHex
    }
}

public struct Reward: Identifiable, Codable, Hashable {
    public var id: UUID
    public var title: String
    public var pointsCost: Int
    public var redeemedAt: Date?

    public init(id: UUID = UUID(), title: String, pointsCost: Int, redeemedAt: Date? = nil) {
        self.id = id
        self.title = title
        self.pointsCost = pointsCost
        self.redeemedAt = redeemedAt
    }
}

public struct ReportCard: Identifiable, Codable, Hashable {
    public var id: UUID
    public var title: String
    public var subtitle: String
    public var value: String
    public var delta: String

    public init(
        id: UUID = UUID(),
        title: String,
        subtitle: String,
        value: String,
        delta: String
    ) {
        self.id = id
        self.title = title
        self.subtitle = subtitle
        self.value = value
        self.delta = delta
    }
}

public struct Reflection: Identifiable, Codable, Hashable {
    public var id: UUID
    public var prompt: String
    public var response: String
    public var createdAt: Date

    public init(id: UUID = UUID(), prompt: String, response: String, createdAt: Date = Date()) {
        self.id = id
        self.prompt = prompt
        self.response = response
        self.createdAt = createdAt
    }
}

public struct FocusSession: Identifiable, Codable, Hashable {
    public var id: UUID
    public var title: String
    public var startedAt: Date
    public var endedAt: Date?
    public var notes: String
    public var importance: Int
    public var difficulty: Int
    public var tags: [String]
    public var people: [String]
    public var contexts: [String]
    public var goal: String?
    public var project: String?

    public init(
        id: UUID = UUID(),
        title: String,
        startedAt: Date = Date(),
        endedAt: Date? = nil,
        notes: String = "",
        importance: Int = 5,
        difficulty: Int = 5,
        tags: [String] = [],
        people: [String] = [],
        contexts: [String] = [],
        goal: String? = nil,
        project: String? = nil
    ) {
        self.id = id
        self.title = title
        self.startedAt = startedAt
        self.endedAt = endedAt
        self.notes = notes
        self.importance = importance
        self.difficulty = difficulty
        self.tags = tags
        self.people = people
        self.contexts = contexts
        self.goal = goal
        self.project = project
    }
}

public enum AssistantRole: String, Codable, CaseIterable {
    case user
    case assistant
}

public struct AssistantMessage: Identifiable, Codable, Hashable {
    public var id: UUID
    public var role: AssistantRole
    public var content: String
    public var createdAt: Date

    public init(id: UUID = UUID(), role: AssistantRole, content: String, createdAt: Date = Date()) {
        self.id = id
        self.role = role
        self.content = content
        self.createdAt = createdAt
    }
}
