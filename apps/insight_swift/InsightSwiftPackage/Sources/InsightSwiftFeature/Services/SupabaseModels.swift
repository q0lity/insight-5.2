import Foundation

enum SupabaseDate {
    /// Returns an ISO8601 formatter configured for internet date time with fractional seconds.
    private static func makeFormatter() -> ISO8601DateFormatter {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }

    static func string(_ date: Date?) -> String? {
        guard let date else { return nil }
        return makeFormatter().string(from: date)
    }

    static func parse(_ value: String?) -> Date? {
        guard let value, !value.isEmpty else { return nil }
        return makeFormatter().date(from: value)
    }
}

struct SupabaseEntryRow: Codable {
    let id: UUID
    let createdAt: String?
    let updatedAt: String?
    let deletedAt: String?
    let title: String
    let facets: [String]?
    let status: String?
    let priority: String?
    let scheduledAt: String?
    let dueAt: String?
    let completedAt: String?
    let startAt: String?
    let endAt: String?
    let durationMinutes: Int?
    let importance: Int?
    let difficulty: Int?
    let goalMultiplier: Double?
    let xp: Double?
    let tags: [String]?
    let contexts: [String]?
    let people: [String]?
    let frontmatter: FrontmatterPayload?
    let bodyMarkdown: String?
    let source: String?

    enum CodingKeys: String, CodingKey {
        case id
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case deletedAt = "deleted_at"
        case title
        case facets
        case status
        case priority
        case scheduledAt = "scheduled_at"
        case dueAt = "due_at"
        case completedAt = "completed_at"
        case startAt = "start_at"
        case endAt = "end_at"
        case durationMinutes = "duration_minutes"
        case importance
        case difficulty
        case goalMultiplier = "goal_multiplier"
        case xp
        case tags
        case contexts
        case people
        case frontmatter
        case bodyMarkdown = "body_markdown"
        case source
    }
}

typealias FrontmatterPayload = [String: JSONValue]

struct SupabaseEntryInsert: Encodable {
    let userId: UUID
    let title: String
    let facets: [String]
    let status: String?
    let priority: String?
    let scheduledAt: String?
    let dueAt: String?
    let completedAt: String?
    let startAt: String?
    let endAt: String?
    let durationMinutes: Int?
    let importance: Int?
    let difficulty: Int?
    let goalMultiplier: Double?
    let xp: Double?
    let tags: [String]?
    let contexts: [String]?
    let people: [String]?
    let frontmatter: FrontmatterPayload?
    let bodyMarkdown: String?
    let source: String?

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case title
        case facets
        case status
        case priority
        case scheduledAt = "scheduled_at"
        case dueAt = "due_at"
        case completedAt = "completed_at"
        case startAt = "start_at"
        case endAt = "end_at"
        case durationMinutes = "duration_minutes"
        case importance
        case difficulty
        case goalMultiplier = "goal_multiplier"
        case xp
        case tags
        case contexts
        case people
        case frontmatter
        case bodyMarkdown = "body_markdown"
        case source
    }
}

struct SupabaseEntryUpdate: Encodable {
    let title: String?
    let facets: [String]?
    let status: String?
    let priority: String?
    let scheduledAt: String?
    let dueAt: String?
    let completedAt: String?
    let startAt: String?
    let endAt: String?
    let durationMinutes: Int?
    let importance: Int?
    let difficulty: Int?
    let goalMultiplier: Double?
    let xp: Double?
    let tags: [String]?
    let contexts: [String]?
    let people: [String]?
    let frontmatter: FrontmatterPayload?
    let bodyMarkdown: String?
    let source: String?

    enum CodingKeys: String, CodingKey {
        case title
        case facets
        case status
        case priority
        case scheduledAt = "scheduled_at"
        case dueAt = "due_at"
        case completedAt = "completed_at"
        case startAt = "start_at"
        case endAt = "end_at"
        case durationMinutes = "duration_minutes"
        case importance
        case difficulty
        case goalMultiplier = "goal_multiplier"
        case xp
        case tags
        case contexts
        case people
        case frontmatter
        case bodyMarkdown = "body_markdown"
        case source
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        if let title { try container.encode(title, forKey: .title) }
        if let facets { try container.encode(facets, forKey: .facets) }
        if let status { try container.encode(status, forKey: .status) }
        if let priority { try container.encode(priority, forKey: .priority) }
        if let scheduledAt { try container.encode(scheduledAt, forKey: .scheduledAt) }
        if let dueAt { try container.encode(dueAt, forKey: .dueAt) }
        if let completedAt { try container.encode(completedAt, forKey: .completedAt) }
        if let startAt { try container.encode(startAt, forKey: .startAt) }
        if let endAt { try container.encode(endAt, forKey: .endAt) }
        if let durationMinutes { try container.encode(durationMinutes, forKey: .durationMinutes) }
        if let importance { try container.encode(importance, forKey: .importance) }
        if let difficulty { try container.encode(difficulty, forKey: .difficulty) }
        if let goalMultiplier { try container.encode(goalMultiplier, forKey: .goalMultiplier) }
        if let xp { try container.encode(xp, forKey: .xp) }
        if let tags { try container.encode(tags, forKey: .tags) }
        if let contexts { try container.encode(contexts, forKey: .contexts) }
        if let people { try container.encode(people, forKey: .people) }
        if let frontmatter { try container.encode(frontmatter, forKey: .frontmatter) }
        if let bodyMarkdown { try container.encode(bodyMarkdown, forKey: .bodyMarkdown) }
        if let source { try container.encode(source, forKey: .source) }
    }
}

struct SupabaseGoalRow: Codable {
    let id: UUID
    let createdAt: String?
    let updatedAt: String?
    let title: String
    let importance: Int?

    enum CodingKeys: String, CodingKey {
        case id
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case title
        case importance
    }
}

struct SupabaseGoalInsert: Encodable {
    let userId: UUID
    let title: String
    let importance: Int?

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case title
        case importance
    }
}

struct SupabaseGoalUpdate: Encodable {
    let title: String?
    let importance: Int?
    let archived: Bool?

    enum CodingKeys: String, CodingKey {
        case title
        case importance
        case archived
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        if let title { try container.encode(title, forKey: .title) }
        if let importance { try container.encode(importance, forKey: .importance) }
        if let archived { try container.encode(archived, forKey: .archived) }
    }
}

struct SupabaseProjectRow: Codable {
    let id: UUID
    let createdAt: String?
    let updatedAt: String?
    let title: String
    let status: String?
    let importance: Int?

    enum CodingKeys: String, CodingKey {
        case id
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case title
        case status
        case importance
    }
}

struct SupabaseProjectInsert: Encodable {
    let userId: UUID
    let title: String
    let status: String?
    let importance: Int?

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case title
        case status
        case importance
    }
}

struct SupabaseProjectUpdate: Encodable {
    let title: String?
    let status: String?
    let importance: Int?

    enum CodingKeys: String, CodingKey {
        case title
        case status
        case importance
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        if let title { try container.encode(title, forKey: .title) }
        if let status { try container.encode(status, forKey: .status) }
        if let importance { try container.encode(importance, forKey: .importance) }
    }
}

struct SupabaseHabitRow: Codable {
    let id: UUID
    let createdAt: String?
    let updatedAt: String?
    let title: String
    let importance: Int?
    let difficulty: Int?
    let schedule: HabitSchedule?
    let metadata: [String: JSONValue]?
    let archived: Bool?

    enum CodingKeys: String, CodingKey {
        case id
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case title
        case importance
        case difficulty
        case schedule
        case metadata
        case archived
    }
}

struct SupabaseHabitInsert: Encodable {
    let userId: UUID
    let title: String
    let importance: Int?
    let difficulty: Int?
    let schedule: HabitSchedule?
    let metadata: [String: JSONValue]?

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case title
        case importance
        case difficulty
        case schedule
        case metadata
    }
}

struct SupabaseHabitUpdate: Encodable {
    let title: String?
    let importance: Int?
    let difficulty: Int?
    let archived: Bool?
    let schedule: HabitSchedule?
    let metadata: [String: JSONValue]?

    enum CodingKeys: String, CodingKey {
        case title
        case importance
        case difficulty
        case archived
        case schedule
        case metadata
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        if let title { try container.encode(title, forKey: .title) }
        if let importance { try container.encode(importance, forKey: .importance) }
        if let difficulty { try container.encode(difficulty, forKey: .difficulty) }
        if let archived { try container.encode(archived, forKey: .archived) }
        if let schedule { try container.encode(schedule, forKey: .schedule) }
        if let metadata { try container.encode(metadata, forKey: .metadata) }
    }
}

struct HabitSchedule: Codable, Hashable {
    let frequency: String?
    let interval: Int?
    let days: [Int]?
    let times: [String]?
}

struct SupabaseHabitInstanceRow: Codable {
    let id: UUID
    let createdAt: String?
    let updatedAt: String?
    let habitId: UUID
    let occurredAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case habitId = "habit_id"
        case occurredAt = "occurred_at"
    }
}

struct SupabaseHabitInstanceInsert: Encodable {
    let userId: UUID
    let habitId: UUID
    let occurredAt: String?

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case habitId = "habit_id"
        case occurredAt = "occurred_at"
    }
}

struct SupabaseTrackerDefinitionRow: Codable {
    let id: UUID
    let createdAt: String?
    let updatedAt: String?
    let key: String
    let displayName: String
    let unit: String?

    enum CodingKeys: String, CodingKey {
        case id
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case key
        case displayName = "display_name"
        case unit
    }
}

struct SupabaseTrackerDefinitionInsert: Encodable {
    let userId: UUID
    let key: String
    let displayName: String
    let unit: String?

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case key
        case displayName = "display_name"
        case unit
    }
}

struct SupabaseTrackerDefinitionUpdate: Encodable {
    let key: String?
    let displayName: String?
    let unit: String?

    enum CodingKeys: String, CodingKey {
        case key
        case displayName = "display_name"
        case unit
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        if let key { try container.encode(key, forKey: .key) }
        if let displayName { try container.encode(displayName, forKey: .displayName) }
        if let unit { try container.encode(unit, forKey: .unit) }
    }
}

struct SupabaseTrackerLogRow: Codable {
    let id: UUID
    let createdAt: String?
    let updatedAt: String?
    let trackerId: UUID
    let occurredAt: String?
    let valueNumeric: Double?

    enum CodingKeys: String, CodingKey {
        case id
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case trackerId = "tracker_id"
        case occurredAt = "occurred_at"
        case valueNumeric = "value_numeric"
    }
}

struct SupabaseTrackerLogInsert: Encodable {
    let userId: UUID
    let trackerId: UUID
    let occurredAt: String?
    let valueNumeric: Double?
    let rawToken: String?

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case trackerId = "tracker_id"
        case occurredAt = "occurred_at"
        case valueNumeric = "value_numeric"
        case rawToken = "raw_token"
    }
}

struct SupabaseEntityRow: Codable {
    let id: UUID
    let createdAt: String?
    let updatedAt: String?
    let type: String
    let displayName: String

    enum CodingKeys: String, CodingKey {
        case id
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case type
        case displayName = "display_name"
    }
}

struct SupabaseEntityInsert: Encodable {
    let userId: UUID
    let type: String
    let key: String
    let displayName: String

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case type
        case key
        case displayName = "display_name"
    }
}

struct SupabaseEntityUpdate: Encodable {
    let key: String?
    let displayName: String?

    enum CodingKeys: String, CodingKey {
        case key
        case displayName = "display_name"
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        if let key { try container.encode(key, forKey: .key) }
        if let displayName { try container.encode(displayName, forKey: .displayName) }
    }
}

// MARK: - External Accounts (Calendar OAuth)

struct SupabaseExternalAccountRow: Codable {
    let id: UUID
    let userId: UUID
    let provider: String  // "google" | "microsoft"
    let createdAt: String?
    let updatedAt: String?
    let expiresAt: String?
    let scope: String?
    let externalAccountId: String?
    let externalEmail: String?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case provider
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case expiresAt = "expires_at"
        case scope
        case externalAccountId = "external_account_id"
        case externalEmail = "external_email"
    }
}

// MARK: - External Event Links (Calendar Sync)

struct SupabaseExternalEventLinkRow: Codable {
    let id: UUID
    let userId: UUID
    let entryId: UUID
    let createdAt: String?
    let updatedAt: String?
    let provider: String  // "google" | "microsoft" | "device" | "apple"
    let externalEventId: String
    let externalCalendarId: String?
    let etag: String?
    let lastSyncedAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case entryId = "entry_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case provider
        case externalEventId = "external_event_id"
        case externalCalendarId = "external_calendar_id"
        case etag
        case lastSyncedAt = "last_synced_at"
    }
}

struct SupabaseExternalEventLinkInsert: Encodable {
    let userId: UUID
    let entryId: UUID
    let provider: String
    let externalEventId: String
    let externalCalendarId: String?
    let etag: String?
    let lastSyncedAt: String?

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case entryId = "entry_id"
        case provider
        case externalEventId = "external_event_id"
        case externalCalendarId = "external_calendar_id"
        case etag
        case lastSyncedAt = "last_synced_at"
    }
}

// MARK: - Calendar Sync Edge Function Response

/// Response from google_calendar_sync and microsoft_calendar_sync edge functions
struct CalendarSyncResponse: Codable {
    let pulled: Int
    let pushed: Int
    let conflicts: Int
    let lastSyncAt: Int  // milliseconds timestamp from server
}

// MARK: - Calendar Sync Edge Function Request Payloads

/// Request payload for google_calendar_sync edge function
struct GoogleCalendarSyncRequest: Encodable {
    let calendarId: String  // default: "primary"
    let scopeStartMs: Int
    let scopeEndMs: Int
}

/// Request payload for microsoft_calendar_sync edge function
struct MicrosoftCalendarSyncRequest: Encodable {
    let scopeStartMs: Int
    let scopeEndMs: Int
}

/// Request payload for OAuth exchange functions
struct OAuthExchangeRequest: Encodable {
    let code: String
    let redirectUri: String?
}

// MARK: - Workout Sessions

struct SupabaseWorkoutSessionRow: Codable {
    let id: UUID
    let userId: UUID
    let entryId: UUID
    let createdAt: String?
    let updatedAt: String?
    let template: String

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case entryId = "entry_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case template
    }
}

struct SupabaseWorkoutSessionInsert: Encodable {
    let userId: UUID
    let entryId: UUID
    let template: String

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case entryId = "entry_id"
        case template
    }
}

struct SupabaseWorkoutSessionUpdate: Encodable {
    let template: String?

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        if let template { try container.encode(template, forKey: .template) }
    }

    enum CodingKeys: String, CodingKey {
        case template
    }
}

// MARK: - Workout Rows

struct SupabaseWorkoutRowRow: Codable {
    let id: UUID
    let userId: UUID
    let sessionId: UUID
    let createdAt: String?
    let updatedAt: String?
    let exercise: String
    let setIndex: Int?
    let reps: Int?
    let weight: Double?
    let weightUnit: String?
    let rpe: Double?
    let durationSeconds: Int?
    let distance: Double?
    let distanceUnit: String?
    let calories: Double?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case sessionId = "session_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case exercise
        case setIndex = "set_index"
        case reps
        case weight
        case weightUnit = "weight_unit"
        case rpe
        case durationSeconds = "duration_seconds"
        case distance
        case distanceUnit = "distance_unit"
        case calories
        case notes
    }
}

struct SupabaseWorkoutRowInsert: Encodable {
    let userId: UUID
    let sessionId: UUID
    let exercise: String
    let setIndex: Int?
    let reps: Int?
    let weight: Double?
    let weightUnit: String?
    let rpe: Double?
    let durationSeconds: Int?
    let distance: Double?
    let distanceUnit: String?
    let calories: Double?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case sessionId = "session_id"
        case exercise
        case setIndex = "set_index"
        case reps
        case weight
        case weightUnit = "weight_unit"
        case rpe
        case durationSeconds = "duration_seconds"
        case distance
        case distanceUnit = "distance_unit"
        case calories
        case notes
    }
}

struct SupabaseWorkoutRowUpdate: Encodable {
    let exercise: String?
    let setIndex: Int?
    let reps: Int?
    let weight: Double?
    let weightUnit: String?
    let rpe: Double?
    let durationSeconds: Int?
    let distance: Double?
    let distanceUnit: String?
    let calories: Double?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case exercise
        case setIndex = "set_index"
        case reps
        case weight
        case weightUnit = "weight_unit"
        case rpe
        case durationSeconds = "duration_seconds"
        case distance
        case distanceUnit = "distance_unit"
        case calories
        case notes
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        if let exercise { try container.encode(exercise, forKey: .exercise) }
        if let setIndex { try container.encode(setIndex, forKey: .setIndex) }
        if let reps { try container.encode(reps, forKey: .reps) }
        if let weight { try container.encode(weight, forKey: .weight) }
        if let weightUnit { try container.encode(weightUnit, forKey: .weightUnit) }
        if let rpe { try container.encode(rpe, forKey: .rpe) }
        if let durationSeconds { try container.encode(durationSeconds, forKey: .durationSeconds) }
        if let distance { try container.encode(distance, forKey: .distance) }
        if let distanceUnit { try container.encode(distanceUnit, forKey: .distanceUnit) }
        if let calories { try container.encode(calories, forKey: .calories) }
        if let notes { try container.encode(notes, forKey: .notes) }
    }
}

// MARK: - Nutrition Logs

struct SupabaseNutritionLogRow: Codable {
    let id: UUID
    let userId: UUID
    let entryId: UUID
    let createdAt: String?
    let updatedAt: String?
    let calories: Double?
    let proteinG: Double?
    let carbsG: Double?
    let fatG: Double?
    let confidence: Double?
    let source: String
    let showOnCalendar: Bool?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case entryId = "entry_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case calories
        case proteinG = "protein_g"
        case carbsG = "carbs_g"
        case fatG = "fat_g"
        case confidence
        case source
        case showOnCalendar = "show_on_calendar"
    }
}

struct SupabaseNutritionLogInsert: Encodable {
    let userId: UUID
    let entryId: UUID
    let calories: Double?
    let proteinG: Double?
    let carbsG: Double?
    let fatG: Double?
    let confidence: Double?
    let source: String
    let showOnCalendar: Bool

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case entryId = "entry_id"
        case calories
        case proteinG = "protein_g"
        case carbsG = "carbs_g"
        case fatG = "fat_g"
        case confidence
        case source
        case showOnCalendar = "show_on_calendar"
    }
}

struct SupabaseNutritionLogUpdate: Encodable {
    let calories: Double?
    let proteinG: Double?
    let carbsG: Double?
    let fatG: Double?
    let confidence: Double?
    let source: String?
    let showOnCalendar: Bool?

    enum CodingKeys: String, CodingKey {
        case calories
        case proteinG = "protein_g"
        case carbsG = "carbs_g"
        case fatG = "fat_g"
        case confidence
        case source
        case showOnCalendar = "show_on_calendar"
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        if let calories { try container.encode(calories, forKey: .calories) }
        if let proteinG { try container.encode(proteinG, forKey: .proteinG) }
        if let carbsG { try container.encode(carbsG, forKey: .carbsG) }
        if let fatG { try container.encode(fatG, forKey: .fatG) }
        if let confidence { try container.encode(confidence, forKey: .confidence) }
        if let source { try container.encode(source, forKey: .source) }
        if let showOnCalendar { try container.encode(showOnCalendar, forKey: .showOnCalendar) }
    }
}

// MARK: - Saved Views

struct SupabaseSavedViewRow: Codable {
    let id: UUID
    let userId: UUID
    let createdAt: String?
    let updatedAt: String?
    let name: String
    let viewType: String
    let query: String  // JSONB stored as string
    let options: String  // JSONB stored as string

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case name
        case viewType = "view_type"
        case query
        case options
    }
}

struct SupabaseSavedViewInsert: Encodable {
    let id: UUID
    let userId: UUID
    let name: String
    let viewType: String
    let query: String  // JSON string
    let options: String  // JSON string

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case name
        case viewType = "view_type"
        case query
        case options
    }
}

struct SupabaseSavedViewUpdate: Encodable {
    let name: String?
    let viewType: String?
    let query: String?
    let options: String?
    let updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case name
        case viewType = "view_type"
        case query
        case options
        case updatedAt = "updated_at"
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        if let name { try container.encode(name, forKey: .name) }
        if let viewType { try container.encode(viewType, forKey: .viewType) }
        if let query { try container.encode(query, forKey: .query) }
        if let options { try container.encode(options, forKey: .options) }
        if let updatedAt { try container.encode(updatedAt, forKey: .updatedAt) }
    }
}

// MARK: - Device Tokens (Push Notifications)

struct SupabaseDeviceTokenRow: Codable {
    let id: UUID
    let userId: UUID
    let token: String
    let platform: String
    let deviceName: String?
    let appVersion: String?
    let createdAt: String?
    let updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case token
        case platform
        case deviceName = "device_name"
        case appVersion = "app_version"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct SupabaseDeviceTokenInsert: Encodable {
    let userId: UUID
    let token: String
    let platform: String
    let deviceName: String?
    let appVersion: String?

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case token
        case platform
        case deviceName = "device_name"
        case appVersion = "app_version"
    }
}

struct SupabaseDeviceTokenUpdate: Encodable {
    let deviceName: String?
    let appVersion: String?

    enum CodingKeys: String, CodingKey {
        case deviceName = "device_name"
        case appVersion = "app_version"
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        if let deviceName { try container.encode(deviceName, forKey: .deviceName) }
        if let appVersion { try container.encode(appVersion, forKey: .appVersion) }
    }
}

// MARK: - Push Notification Edge Function

struct SendPushNotificationRequest: Encodable {
    let userId: UUID
    let title: String
    let body: String
    let category: String?
    let data: [String: String]?

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case title
        case body
        case category
        case data
    }
}

struct SendPushNotificationResponse: Decodable {
    let sent: Int
    let failed: Int
}

// MARK: - Assistant Edge Function

struct AssistantQueryRequest: Encodable {
    let prompt: String
    let context: [[String: String]]
}

struct AssistantQueryResponse: Decodable {
    let reply: String
}
