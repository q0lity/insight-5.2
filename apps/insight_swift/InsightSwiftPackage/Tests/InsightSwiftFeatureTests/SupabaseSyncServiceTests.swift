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

@Test("Supabase sync logs conflicts when pending operations exist")
@MainActor
func supabaseSyncConflictLogging() throws {
    let container = try makeInMemoryContainer()
    let persistence = LocalPersistenceService(container: container)
    let appStore = AppStore()
    let entryId = UUID()
    let start = Date()
    let entry = Entry(id: entryId, title: "Local", facets: [.event], startAt: start, endAt: start.addingTimeInterval(1800))
    appStore.entries = [entry]

    let pending = SyncOperation(entityId: entryId, entityType: .entry, action: .update, payload: Data())
    persistence.enqueue(pending)

    let supabase = SupabaseService(url: URL(string: "https://example.supabase.co")!, anonKey: "test")
    let authStore = SupabaseAuthStore(supabase: supabase)
    let syncService = SupabaseSyncService(supabase: supabase, authStore: authStore, appStore: appStore, persistence: persistence)

    let row = SupabaseEntryRow(
        id: entryId,
        createdAt: nil,
        updatedAt: nil,
        deletedAt: nil,
        title: "Remote",
        facets: ["event"],
        status: nil,
        scheduledAt: nil,
        dueAt: nil,
        completedAt: nil,
        startAt: SupabaseDate.string(entry.startAt),
        endAt: SupabaseDate.string(entry.endAt),
        durationMinutes: 30,
        tags: nil,
        contexts: nil,
        people: nil,
        frontmatter: nil,
        bodyMarkdown: nil
    )

    syncService.applyEntryRowForTesting(row)

    let conflicts = persistence.conflicts()
    #expect(conflicts.count == 1)
    #expect(conflicts.first?.entityId == entryId)
    #expect(conflicts.first?.localPayload != nil)
    #expect(conflicts.first?.remotePayload != nil)
}

@Test("Supabase sync flushes update/delete operations")
@MainActor
func supabaseSyncFlushesUpdateDelete() async throws {
    let container = try makeInMemoryContainer()
    let persistence = LocalPersistenceService(container: container)
    let appStore = AppStore()
    let supabase = SupabaseService(url: URL(string: "https://example.supabase.co")!, anonKey: "test")
    let authStore = SupabaseAuthStore(supabase: supabase)
    let syncService = SupabaseSyncService(supabase: supabase, authStore: authStore, appStore: appStore, persistence: persistence)
    syncService.isEnabled = true

    let update = SyncOperation(entityId: UUID(), entityType: .entry, action: .update, payload: Data("{\"title\":\"Update\"}".utf8))
    let delete = SyncOperation(entityId: UUID(), entityType: .goal, action: .delete, payload: nil)
    persistence.enqueue(update)
    persistence.enqueue(delete)

    await syncService.flushPendingOperations(using: { _ in true }, requireAuth: false)

    #expect(persistence.pendingOperations().isEmpty)
}

@Test("Supabase sync stops on failure and records attempts")
@MainActor
func supabaseSyncFlushStopsOnFailure() async throws {
    let container = try makeInMemoryContainer()
    let persistence = LocalPersistenceService(container: container)
    let appStore = AppStore()
    let supabase = SupabaseService(url: URL(string: "https://example.supabase.co")!, anonKey: "test")
    let authStore = SupabaseAuthStore(supabase: supabase)
    let syncService = SupabaseSyncService(supabase: supabase, authStore: authStore, appStore: appStore, persistence: persistence)
    syncService.isEnabled = true

    let first = SyncOperation(entityId: UUID(), entityType: .entry, action: .update, payload: Data("{\"title\":\"Update\"}".utf8))
    let second = SyncOperation(entityId: UUID(), entityType: .goal, action: .delete, payload: nil)
    persistence.enqueue(first)
    persistence.enqueue(second)

    await syncService.flushPendingOperations(using: { operation in
        operation.id != first.id
    }, requireAuth: false)

    let pending = persistence.pendingOperations()
    #expect(pending.count == 2)
    let refreshedFirst = pending.first(where: { $0.id == first.id })
    #expect(refreshedFirst?.attemptCount == 1)
    #expect(refreshedFirst?.lastAttemptAt != nil)
}
