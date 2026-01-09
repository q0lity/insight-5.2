import Foundation
import SwiftData
import Testing
@testable import InsightSwiftFeature

private func makeInMemoryContainer() throws -> ModelContainer {
    let schema = Schema([
        LocalSnapshotRecord.self,
        SyncOperationRecord.self,
        SyncConflictRecord.self
    ])
    let config = ModelConfiguration(isStoredInMemoryOnly: true)
    return try ModelContainer(for: schema, configurations: [config])
}

@Test("Local persistence saves and reloads snapshots")
@MainActor
func localPersistenceRoundTrip() throws {
    let container = try makeInMemoryContainer()
    let persistence = LocalPersistenceService(container: container)

    let workoutEntryId = UUID()
    let workoutSession = WorkoutSession(entryId: workoutEntryId, template: .strength)
    let workoutRow = WorkoutRow(sessionId: workoutSession.id, exercise: "Lift", durationSeconds: 1800)
    let nutritionEntryId = UUID()
    let nutritionLog = NutritionLog(entryId: nutritionEntryId, calories: 450, proteinG: 30, carbsG: 45, fatG: 12, confidence: 0.8, source: .manual)

    let snapshot = AppStoreSnapshot(
        entries: [Entry(title: "Test entry", facets: [.note], startAt: Date())],
        tasks: [TodoTask(title: "Test task")],
        notes: [Note(title: "Test note", body: "Body")],
        goals: [Goal(title: "Goal", importance: 7)],
        projects: [Project(title: "Project")],
        habits: [HabitDefinition(title: "Habit", importance: 6, difficulty: 4)],
        habitLogs: [HabitLog(habitId: UUID())],
        trackers: [TrackerDefinition(key: "mood", unit: "1-10")],
        trackerLogs: [TrackerLog(trackerId: UUID(), value: 5)],
        workoutSessions: [workoutSession],
        workoutRows: [workoutRow],
        nutritionLogs: [nutritionLog],
        people: [Person(name: "Alex")],
        places: [Place(name: "Gym", category: "Fitness")],
        tags: [TagItem(name: "deep-work")],
        rewards: [Reward(title: "Coffee", pointsCost: 20)],
        reports: [ReportCard(title: "Focus", subtitle: "Week", value: "5h", delta: "+1")],
        reflections: [Reflection(prompt: "Win?", response: "Shipping")],
        focusSessions: [FocusSession(title: "Deep work")],
        activeFocusSession: nil,
        assistantMessages: [AssistantMessage(role: .assistant, content: "Hello")],
        planOutline: "- Plan"
    )

    persistence.saveSnapshot(snapshot)
    let loaded = persistence.loadSnapshot()
    #require(loaded != nil)
    #expect(loaded == snapshot)
}

@Test("Local persistence returns nil when no snapshot exists")
@MainActor
func localPersistenceEmptySnapshot() throws {
    let container = try makeInMemoryContainer()
    let persistence = LocalPersistenceService(container: container)
    let loaded = persistence.loadSnapshot()
    #expect(loaded == nil)
}

@Test("Local persistence ignores invalid snapshot payloads")
@MainActor
func localPersistenceInvalidSnapshot() throws {
    let container = try makeInMemoryContainer()
    let context = container.mainContext
    let invalidRecord = LocalSnapshotRecord(
        key: LocalSnapshotRecord.primaryKey,
        payload: Data("not-json".utf8),
        updatedAt: Date()
    )
    context.insert(invalidRecord)
    try context.save()

    let persistence = LocalPersistenceService(container: container)
    let loaded = persistence.loadSnapshot()
    #expect(loaded == nil)
}

@Test("Conflict logging stores and returns conflicts")
@MainActor
func conflictLoggingRoundTrip() throws {
    let container = try makeInMemoryContainer()
    let persistence = LocalPersistenceService(container: container)
    let conflict = SyncConflict(
        entityId: UUID(),
        entityType: .entry,
        localPayload: Data("{\"local\":true}".utf8),
        remotePayload: Data("{\"remote\":true}".utf8),
        note: "Test conflict"
    )

    persistence.logConflict(conflict)
    let conflicts = persistence.conflicts()
    #expect(conflicts.count == 1)
    #expect(conflicts.first == conflict)
}

@Test("Conflict logging ignores unknown entity types")
@MainActor
func conflictLoggingInvalidEntityType() throws {
    let container = try makeInMemoryContainer()
    let context = container.mainContext
    let invalid = SyncConflictRecord(
        id: UUID(),
        entityId: UUID(),
        entityType: "unknown",
        localPayload: nil,
        remotePayload: nil,
        note: "Invalid",
        createdAt: Date()
    )
    context.insert(invalid)
    try context.save()

    let persistence = LocalPersistenceService(container: container)
    let conflicts = persistence.conflicts()
    #expect(conflicts.isEmpty)
}

@Test("Conflict logging supports nil payloads")
@MainActor
func conflictLoggingNilPayloads() throws {
    let container = try makeInMemoryContainer()
    let persistence = LocalPersistenceService(container: container)
    let conflict = SyncConflict(
        entityId: UUID(),
        entityType: .project,
        localPayload: nil,
        remotePayload: nil,
        note: "Nil payloads"
    )

    persistence.logConflict(conflict)
    let conflicts = persistence.conflicts()
    #expect(conflicts.first?.localPayload == nil)
    #expect(conflicts.first?.remotePayload == nil)
}

@Test("Pending operations persist update/delete payloads")
@MainActor
func pendingOperationsUpdateDelete() throws {
    let container = try makeInMemoryContainer()
    let persistence = LocalPersistenceService(container: container)
    let updatePayload = Data("{\"title\":\"Updated\"}".utf8)
    let update = SyncOperation(entityId: UUID(), entityType: .entry, action: .update, payload: updatePayload)
    let delete = SyncOperation(entityId: UUID(), entityType: .goal, action: .delete, payload: nil)

    persistence.enqueue(update)
    persistence.enqueue(delete)

    let pending = persistence.pendingOperations()
    #expect(pending.count == 2)
    #expect(pending.first?.action == .update)
    #expect(pending.first?.payload == updatePayload)
    #expect(pending.last?.action == .delete)
    #expect(pending.last?.payload == nil)
}

@Test("Operation ID remap updates related operations")
@MainActor
func pendingOperationIdRemap() throws {
    let container = try makeInMemoryContainer()
    let persistence = LocalPersistenceService(container: container)
    let oldId = UUID()
    let newId = UUID()
    let update = SyncOperation(entityId: oldId, entityType: .entry, action: .update, payload: Data("{\"title\":\"A\"}".utf8))
    let delete = SyncOperation(entityId: oldId, entityType: .entry, action: .delete, payload: nil)
    let unrelated = SyncOperation(entityId: UUID(), entityType: .goal, action: .update, payload: Data())

    persistence.enqueue(update)
    persistence.enqueue(delete)
    persistence.enqueue(unrelated)

    persistence.replaceOperationEntityId(from: oldId, to: newId)

    let pending = persistence.pendingOperations()
    let remapped = pending.filter { $0.entityType == .entry }
    #expect(remapped.count == 2)
    #expect(remapped.allSatisfy { $0.entityId == newId })
    #expect(pending.contains { $0.entityType == .goal && $0.entityId == unrelated.entityId })
}
