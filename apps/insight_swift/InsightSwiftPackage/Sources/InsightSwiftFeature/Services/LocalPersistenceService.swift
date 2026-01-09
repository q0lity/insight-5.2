import Foundation
import Observation
import SwiftData

public enum SyncEntityType: String, Codable, CaseIterable {
    case entry
    case goal
    case project
    case habitDefinition
    case habitLog
    case trackerDefinition
    case trackerLog
    case entity
    case workoutSession
    case workoutRow
    case nutritionLog
    case savedView
}

public enum SyncAction: String, Codable, CaseIterable {
    case insert
    case update
    case delete
}

public struct SyncOperation: Identifiable, Codable, Hashable {
    public let id: UUID
    public let entityId: UUID?
    public let entityType: SyncEntityType
    public let action: SyncAction
    public let payload: Data?
    public let createdAt: Date
    public var lastAttemptAt: Date?
    public var attemptCount: Int

    public init(
        id: UUID = UUID(),
        entityId: UUID?,
        entityType: SyncEntityType,
        action: SyncAction,
        payload: Data?,
        createdAt: Date = Date(),
        lastAttemptAt: Date? = nil,
        attemptCount: Int = 0
    ) {
        self.id = id
        self.entityId = entityId
        self.entityType = entityType
        self.action = action
        self.payload = payload
        self.createdAt = createdAt
        self.lastAttemptAt = lastAttemptAt
        self.attemptCount = attemptCount
    }
}

public struct SyncConflict: Identifiable, Codable, Hashable {
    public let id: UUID
    public let entityId: UUID
    public let entityType: SyncEntityType
    public let localPayload: Data?
    public let remotePayload: Data?
    public let note: String
    public let createdAt: Date

    public init(
        id: UUID = UUID(),
        entityId: UUID,
        entityType: SyncEntityType,
        localPayload: Data?,
        remotePayload: Data?,
        note: String,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.entityId = entityId
        self.entityType = entityType
        self.localPayload = localPayload
        self.remotePayload = remotePayload
        self.note = note
        self.createdAt = createdAt
    }
}

public struct AppStoreSnapshot: Codable, Hashable {
    public var entries: [Entry]
    public var tasks: [TodoTask]
    public var notes: [Note]
    public var goals: [Goal]
    public var projects: [Project]
    public var habits: [HabitDefinition]
    public var habitLogs: [HabitLog]
    public var trackers: [TrackerDefinition]
    public var trackerLogs: [TrackerLog]
    public var workoutSessions: [WorkoutSession]
    public var workoutRows: [WorkoutRow]
    public var nutritionLogs: [NutritionLog]
    public var people: [Person]
    public var places: [Place]
    public var tags: [TagItem]
    public var rewards: [Reward]
    public var reports: [ReportCard]
    public var reflections: [Reflection]
    public var focusSessions: [FocusSession]
    public var activeFocusSession: FocusSession?
    public var assistantMessages: [AssistantMessage]
    public var planOutline: String
    public var savedViews: [SavedView]

    public static let empty = AppStoreSnapshot(
        entries: [],
        tasks: [],
        notes: [],
        goals: [],
        projects: [],
        habits: [],
        habitLogs: [],
        trackers: [],
        trackerLogs: [],
        workoutSessions: [],
        workoutRows: [],
        nutritionLogs: [],
        people: [],
        places: [],
        tags: [],
        rewards: [],
        reports: [],
        reflections: [],
        focusSessions: [],
        activeFocusSession: nil,
        assistantMessages: [],
        planOutline: "",
        savedViews: []
    )
}

@Model
final class LocalSnapshotRecord {
    static let primaryKey = "app_snapshot"

    @Attribute(.unique) var key: String
    var payload: Data
    var updatedAt: Date

    init(key: String, payload: Data, updatedAt: Date) {
        self.key = key
        self.payload = payload
        self.updatedAt = updatedAt
    }
}

@Model
final class SyncOperationRecord {
    @Attribute(.unique) var id: UUID
    var entityId: UUID?
    var entityType: String
    var action: String
    var payload: Data?
    var createdAt: Date
    var lastAttemptAt: Date?
    var attemptCount: Int

    init(
        id: UUID,
        entityId: UUID?,
        entityType: String,
        action: String,
        payload: Data?,
        createdAt: Date,
        lastAttemptAt: Date?,
        attemptCount: Int
    ) {
        self.id = id
        self.entityId = entityId
        self.entityType = entityType
        self.action = action
        self.payload = payload
        self.createdAt = createdAt
        self.lastAttemptAt = lastAttemptAt
        self.attemptCount = attemptCount
    }
}

@Model
final class SyncConflictRecord {
    @Attribute(.unique) var id: UUID
    var entityId: UUID
    var entityType: String
    var localPayload: Data?
    var remotePayload: Data?
    var note: String
    var createdAt: Date

    init(
        id: UUID,
        entityId: UUID,
        entityType: String,
        localPayload: Data?,
        remotePayload: Data?,
        note: String,
        createdAt: Date
    ) {
        self.id = id
        self.entityId = entityId
        self.entityType = entityType
        self.localPayload = localPayload
        self.remotePayload = remotePayload
        self.note = note
        self.createdAt = createdAt
    }
}

@MainActor
@Observable
public final class LocalPersistenceService {
    public private(set) var isReady = false
    public private(set) var errorMessage: String?

    private let container: ModelContainer?
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    public init(container: ModelContainer? = nil) {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        self.encoder = encoder
        self.decoder = decoder

        if let container {
            self.container = container
            isReady = true
        } else {
            do {
                self.container = try ModelContainer(
                    for: LocalSnapshotRecord.self,
                    SyncOperationRecord.self,
                    SyncConflictRecord.self
                )
                isReady = true
            } catch {
                self.container = nil
                errorMessage = error.localizedDescription
            }
        }
    }

    public func load(into appStore: AppStore) {
        guard let snapshot = loadSnapshot() else { return }
        apply(snapshot, to: appStore)
    }

    public func loadSnapshot() -> AppStoreSnapshot? {
        guard let container else { return nil }
        let context = container.mainContext
        let descriptor = FetchDescriptor<LocalSnapshotRecord>(
            predicate: #Predicate { $0.key == LocalSnapshotRecord.primaryKey },
            sortBy: [SortDescriptor(\.updatedAt, order: .reverse)]
        )
        guard let record = try? context.fetch(descriptor).first else { return nil }
        return try? decoder.decode(AppStoreSnapshot.self, from: record.payload)
    }

    public func save(from appStore: AppStore) {
        saveSnapshot(snapshot(from: appStore))
    }

    public func saveSnapshot(_ snapshot: AppStoreSnapshot) {
        guard let container else { return }
        guard let payload = try? encoder.encode(snapshot) else { return }
        let context = container.mainContext
        let descriptor = FetchDescriptor<LocalSnapshotRecord>(
            predicate: #Predicate { $0.key == LocalSnapshotRecord.primaryKey }
        )
        if let existing = try? context.fetch(descriptor).first {
            existing.payload = payload
            existing.updatedAt = Date()
        } else {
            let record = LocalSnapshotRecord(
                key: LocalSnapshotRecord.primaryKey,
                payload: payload,
                updatedAt: Date()
            )
            context.insert(record)
        }
        try? context.save()
    }

    public func enqueue(_ operation: SyncOperation) {
        guard let container else { return }
        let context = container.mainContext
        let record = SyncOperationRecord(
            id: operation.id,
            entityId: operation.entityId,
            entityType: operation.entityType.rawValue,
            action: operation.action.rawValue,
            payload: operation.payload,
            createdAt: operation.createdAt,
            lastAttemptAt: operation.lastAttemptAt,
            attemptCount: operation.attemptCount
        )
        context.insert(record)
        try? context.save()
    }

    public func markOperationAttempt(id: UUID) {
        guard let container else { return }
        let context = container.mainContext
        let descriptor = FetchDescriptor<SyncOperationRecord>(
            predicate: #Predicate { $0.id == id }
        )
        guard let record = try? context.fetch(descriptor).first else { return }
        record.attemptCount += 1
        record.lastAttemptAt = Date()
        try? context.save()
    }

    public func removeOperation(id: UUID) {
        guard let container else { return }
        let context = container.mainContext
        let descriptor = FetchDescriptor<SyncOperationRecord>(
            predicate: #Predicate { $0.id == id }
        )
        guard let record = try? context.fetch(descriptor).first else { return }
        context.delete(record)
        try? context.save()
    }

    public func replaceOperationEntityId(from oldId: UUID, to newId: UUID) {
        guard let container else { return }
        guard oldId != newId else { return }
        let context = container.mainContext
        let descriptor = FetchDescriptor<SyncOperationRecord>(
            predicate: #Predicate { $0.entityId == oldId }
        )
        guard let records = try? context.fetch(descriptor), !records.isEmpty else { return }
        for record in records {
            record.entityId = newId
        }
        try? context.save()
    }

    public func pendingOperations() -> [SyncOperation] {
        guard let container else { return [] }
        let context = container.mainContext
        let descriptor = FetchDescriptor<SyncOperationRecord>(
            sortBy: [SortDescriptor(\.createdAt, order: .forward)]
        )
        guard let records = try? context.fetch(descriptor) else { return [] }
        return records.compactMap { record in
            guard let entityType = SyncEntityType(rawValue: record.entityType),
                  let action = SyncAction(rawValue: record.action) else {
                return nil
            }
            return SyncOperation(
                id: record.id,
                entityId: record.entityId,
                entityType: entityType,
                action: action,
                payload: record.payload,
                createdAt: record.createdAt,
                lastAttemptAt: record.lastAttemptAt,
                attemptCount: record.attemptCount
            )
        }
    }

    public func hasPendingOperation(entityId: UUID, entityType: SyncEntityType) -> Bool {
        guard let container else { return false }
        let context = container.mainContext
        let descriptor = FetchDescriptor<SyncOperationRecord>(
            predicate: #Predicate { $0.entityId == entityId && $0.entityType == entityType.rawValue }
        )
        guard let records = try? context.fetch(descriptor) else { return false }
        return !records.isEmpty
    }

    public func logConflict(_ conflict: SyncConflict) {
        guard let container else { return }
        let context = container.mainContext
        let record = SyncConflictRecord(
            id: conflict.id,
            entityId: conflict.entityId,
            entityType: conflict.entityType.rawValue,
            localPayload: conflict.localPayload,
            remotePayload: conflict.remotePayload,
            note: conflict.note,
            createdAt: conflict.createdAt
        )
        context.insert(record)
        try? context.save()
    }

    public func conflicts() -> [SyncConflict] {
        guard let container else { return [] }
        let context = container.mainContext
        let descriptor = FetchDescriptor<SyncConflictRecord>(
            sortBy: [SortDescriptor(\.createdAt, order: .reverse)]
        )
        guard let records = try? context.fetch(descriptor) else { return [] }
        return records.compactMap { record in
            guard let entityType = SyncEntityType(rawValue: record.entityType) else { return nil }
            return SyncConflict(
                id: record.id,
                entityId: record.entityId,
                entityType: entityType,
                localPayload: record.localPayload,
                remotePayload: record.remotePayload,
                note: record.note,
                createdAt: record.createdAt
            )
        }
    }

    private func snapshot(from appStore: AppStore) -> AppStoreSnapshot {
        AppStoreSnapshot(
            entries: appStore.entries,
            tasks: appStore.tasks,
            notes: appStore.notes,
            goals: appStore.goals,
            projects: appStore.projects,
            habits: appStore.habits,
            habitLogs: appStore.habitLogs,
            trackers: appStore.trackers,
            trackerLogs: appStore.trackerLogs,
            workoutSessions: appStore.workoutSessions,
            workoutRows: appStore.workoutRows,
            nutritionLogs: appStore.nutritionLogs,
            people: appStore.people,
            places: appStore.places,
            tags: appStore.tags,
            rewards: appStore.rewards,
            reports: appStore.reports,
            reflections: appStore.reflections,
            focusSessions: appStore.focusSessions,
            activeFocusSession: appStore.activeFocusSession,
            assistantMessages: appStore.assistantMessages,
            planOutline: appStore.planOutline,
            savedViews: appStore.savedViews
        )
    }

    private func apply(_ snapshot: AppStoreSnapshot, to appStore: AppStore) {
        appStore.entries = snapshot.entries
        appStore.tasks = snapshot.tasks
        appStore.notes = snapshot.notes
        appStore.goals = snapshot.goals
        appStore.projects = snapshot.projects
        appStore.habits = snapshot.habits
        appStore.habitLogs = snapshot.habitLogs
        appStore.trackers = snapshot.trackers
        appStore.trackerLogs = snapshot.trackerLogs
        appStore.workoutSessions = snapshot.workoutSessions
        appStore.workoutRows = snapshot.workoutRows
        appStore.nutritionLogs = snapshot.nutritionLogs
        appStore.people = snapshot.people
        appStore.places = snapshot.places
        appStore.tags = snapshot.tags
        appStore.rewards = snapshot.rewards
        appStore.reports = snapshot.reports
        appStore.reflections = snapshot.reflections
        appStore.focusSessions = snapshot.focusSessions
        appStore.activeFocusSession = snapshot.activeFocusSession
        appStore.assistantMessages = snapshot.assistantMessages
        appStore.planOutline = snapshot.planOutline
        appStore.savedViews = snapshot.savedViews
    }
}
