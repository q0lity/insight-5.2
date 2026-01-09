import Foundation
import Observation
import Supabase

@MainActor
@Observable
public final class SupabaseSyncService {
    public var isEnabled = false
    public private(set) var isSyncing = false
    public private(set) var lastSyncAt: Date?
    public private(set) var errorMessage: String?

    private let supabase: SupabaseService
    private let authStore: SupabaseAuthStore
    private unowned let appStore: AppStore
    private let persistence: LocalPersistenceService?
    private var realtimeTasks: [Task<Void, Never>] = []
    private var persistenceTask: Task<Void, Never>?
    private var isFlushingQueue = false
    private let payloadEncoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }()
    private let payloadDecoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }()

    public init(
        supabase: SupabaseService,
        authStore: SupabaseAuthStore,
        appStore: AppStore,
        persistence: LocalPersistenceService? = nil
    ) {
        self.supabase = supabase
        self.authStore = authStore
        self.appStore = appStore
        self.persistence = persistence
    }

    func applyEntryRowForTesting(_ row: SupabaseEntryRow) {
        upsertEntry(from: row)
    }

    public func loadAll() async {
        guard isEnabled else { return }
        guard let userId = authStore.userId else {
            errorMessage = "Sign in to sync."
            return
        }

        isSyncing = true
        errorMessage = nil
        defer {
            isSyncing = false
            lastSyncAt = Date()
        }

        do {
            let entries: [SupabaseEntryRow] = try await supabase.client
                .from("entries")
                .select()
                .eq("user_id", value: userId.uuidString)
                .execute()
                .value

            let goals: [SupabaseGoalRow] = try await supabase.client
                .from("goals")
                .select()
                .eq("user_id", value: userId.uuidString)
                .execute()
                .value

            let projects: [SupabaseProjectRow] = try await supabase.client
                .from("projects")
                .select()
                .eq("user_id", value: userId.uuidString)
                .execute()
                .value

            let habits: [SupabaseHabitRow] = try await supabase.client
                .from("habit_definitions")
                .select()
                .eq("user_id", value: userId.uuidString)
                .execute()
                .value

            let habitLogs: [SupabaseHabitInstanceRow] = try await supabase.client
                .from("habit_instances")
                .select()
                .eq("user_id", value: userId.uuidString)
                .execute()
                .value

            let trackerDefinitions: [SupabaseTrackerDefinitionRow] = try await supabase.client
                .from("tracker_definitions")
                .select()
                .eq("user_id", value: userId.uuidString)
                .execute()
                .value

            let trackerLogs: [SupabaseTrackerLogRow] = try await supabase.client
                .from("tracker_logs")
                .select()
                .eq("user_id", value: userId.uuidString)
                .execute()
                .value

            let entities: [SupabaseEntityRow] = try await supabase.client
                .from("entities")
                .select()
                .eq("user_id", value: userId.uuidString)
                .execute()
                .value

            let workoutSessions: [SupabaseWorkoutSessionRow] = try await supabase.client
                .from("workout_sessions")
                .select()
                .eq("user_id", value: userId.uuidString)
                .execute()
                .value

            let workoutRows: [SupabaseWorkoutRowRow] = try await supabase.client
                .from("workout_rows")
                .select()
                .eq("user_id", value: userId.uuidString)
                .execute()
                .value

            let nutritionLogs: [SupabaseNutritionLogRow] = try await supabase.client
                .from("nutrition_logs")
                .select()
                .eq("user_id", value: userId.uuidString)
                .execute()
                .value

            let savedViews: [SupabaseSavedViewRow] = try await supabase.client
                .from("saved_views")
                .select()
                .eq("user_id", value: userId.uuidString)
                .execute()
                .value

            applyEntries(entries)
            applyGoals(goals)
            applyProjects(projects)
            applyHabits(habits)
            applyHabitLogs(habitLogs)
            applyTrackerDefinitions(trackerDefinitions)
            applyTrackerLogs(trackerLogs)
            applyEntities(entities)
            applyWorkoutSessions(workoutSessions)
            applyWorkoutRows(workoutRows)
            applyNutritionLogs(nutritionLogs)
            applySavedViews(savedViews)
            schedulePersistence()
            await flushPendingOperations()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    public func startRealtime() async {
        guard isEnabled else { return }
        guard authStore.userId != nil else { return }
        guard realtimeTasks.isEmpty else { return }

        let channel = await supabase.client.realtimeV2.channel("public:insight")
        await channel.subscribe()

        func listenInsert<T: Decodable>(
            table: String,
            type: T.Type,
            apply: @escaping (T) -> Void
        ) -> Task<Void, Never> {
            Task { [weak self] in
                for await insertion in channel.postgresChange(InsertAction.self, table: table) {
                    if Task.isCancelled { break }
                    do {
                        let row = try insertion.decodeRecord(as: type)
                        apply(row)
                        self?.schedulePersistence()
                    } catch {
                        continue
                    }
                }
            }
        }

        func listenUpdate<T: Decodable>(
            table: String,
            type: T.Type,
            apply: @escaping (T) -> Void
        ) -> Task<Void, Never> {
            Task { [weak self] in
                for await update in channel.postgresChange(UpdateAction.self, table: table) {
                    if Task.isCancelled { break }
                    do {
                        let row = try update.decodeRecord(as: type)
                        apply(row)
                        self?.schedulePersistence()
                    } catch {
                        continue
                    }
                }
            }
        }

        func listenDelete(
            table: String,
            apply: @escaping (UUID) -> Void
        ) -> Task<Void, Never> {
            Task { [weak self] in
                for await deletion in channel.postgresChange(DeleteAction.self, table: table) {
                    if Task.isCancelled { break }
                    do {
                        let payload = try deletion.decodeOldRecord(as: DeletedRow.self)
                        apply(payload.id)
                        self?.schedulePersistence()
                    } catch {
                        continue
                    }
                }
            }
        }

        realtimeTasks = [
            listenInsert(table: "entries", type: SupabaseEntryRow.self) { row in
                self.upsertEntry(from: row)
            },
            listenUpdate(table: "entries", type: SupabaseEntryRow.self) { row in
                self.upsertEntry(from: row)
            },
            listenDelete(table: "entries") { id in
                self.removeEntry(id: id)
            },
            listenInsert(table: "goals", type: SupabaseGoalRow.self) { row in
                self.upsertGoal(from: row)
            },
            listenUpdate(table: "goals", type: SupabaseGoalRow.self) { row in
                self.upsertGoal(from: row)
            },
            listenDelete(table: "goals") { id in
                self.removeGoal(id: id)
            },
            listenInsert(table: "projects", type: SupabaseProjectRow.self) { row in
                self.upsertProject(from: row)
            },
            listenUpdate(table: "projects", type: SupabaseProjectRow.self) { row in
                self.upsertProject(from: row)
            },
            listenDelete(table: "projects") { id in
                self.removeProject(id: id)
            },
            listenInsert(table: "habit_definitions", type: SupabaseHabitRow.self) { row in
                self.upsertHabitDefinition(from: row)
            },
            listenUpdate(table: "habit_definitions", type: SupabaseHabitRow.self) { row in
                self.upsertHabitDefinition(from: row)
            },
            listenDelete(table: "habit_definitions") { id in
                self.removeHabitDefinition(id: id)
            },
            listenInsert(table: "habit_instances", type: SupabaseHabitInstanceRow.self) { row in
                self.upsertHabitInstance(from: row)
            },
            listenUpdate(table: "habit_instances", type: SupabaseHabitInstanceRow.self) { row in
                self.upsertHabitInstance(from: row)
            },
            listenDelete(table: "habit_instances") { id in
                self.removeHabitInstance(id: id)
            },
            listenInsert(table: "tracker_definitions", type: SupabaseTrackerDefinitionRow.self) { row in
                self.upsertTrackerDefinition(from: row)
            },
            listenUpdate(table: "tracker_definitions", type: SupabaseTrackerDefinitionRow.self) { row in
                self.upsertTrackerDefinition(from: row)
            },
            listenDelete(table: "tracker_definitions") { id in
                self.removeTrackerDefinition(id: id)
            },
            listenInsert(table: "tracker_logs", type: SupabaseTrackerLogRow.self) { row in
                self.upsertTrackerLog(from: row)
            },
            listenUpdate(table: "tracker_logs", type: SupabaseTrackerLogRow.self) { row in
                self.upsertTrackerLog(from: row)
            },
            listenDelete(table: "tracker_logs") { id in
                self.removeTrackerLog(id: id)
            },
            listenInsert(table: "entities", type: SupabaseEntityRow.self) { row in
                self.upsertEntity(from: row)
            },
            listenUpdate(table: "entities", type: SupabaseEntityRow.self) { row in
                self.upsertEntity(from: row)
            },
            listenDelete(table: "entities") { id in
                self.removeEntity(id: id)
            },
            listenInsert(table: "workout_sessions", type: SupabaseWorkoutSessionRow.self) { row in
                self.upsertWorkoutSession(from: row)
            },
            listenUpdate(table: "workout_sessions", type: SupabaseWorkoutSessionRow.self) { row in
                self.upsertWorkoutSession(from: row)
            },
            listenDelete(table: "workout_sessions") { id in
                self.removeWorkoutSession(id: id)
            },
            listenInsert(table: "workout_rows", type: SupabaseWorkoutRowRow.self) { row in
                self.upsertWorkoutRow(from: row)
            },
            listenUpdate(table: "workout_rows", type: SupabaseWorkoutRowRow.self) { row in
                self.upsertWorkoutRow(from: row)
            },
            listenDelete(table: "workout_rows") { id in
                self.removeWorkoutRow(id: id)
            },
            listenInsert(table: "nutrition_logs", type: SupabaseNutritionLogRow.self) { row in
                self.upsertNutritionLog(from: row)
            },
            listenUpdate(table: "nutrition_logs", type: SupabaseNutritionLogRow.self) { row in
                self.upsertNutritionLog(from: row)
            },
            listenDelete(table: "nutrition_logs") { id in
                self.removeNutritionLog(id: id)
            },
            listenInsert(table: "saved_views", type: SupabaseSavedViewRow.self) { row in
                self.upsertSavedView(from: row)
            },
            listenUpdate(table: "saved_views", type: SupabaseSavedViewRow.self) { row in
                self.upsertSavedView(from: row)
            },
            listenDelete(table: "saved_views") { id in
                self.removeSavedView(id: id)
            }
        ]
    }

    public func stopRealtime() {
        realtimeTasks.forEach { $0.cancel() }
        realtimeTasks = []
    }

    public func flushPendingOperations() async {
        await flushPendingOperations(using: apply, requireAuth: true)
    }

    func flushPendingOperations(
        using handler: @Sendable (SyncOperation) async -> Bool,
        requireAuth: Bool = true
    ) async {
        guard isEnabled else { return }
        if requireAuth {
            guard authStore.userId != nil else { return }
        }
        guard let persistence else { return }
        guard !isFlushingQueue else { return }

        isFlushingQueue = true
        defer { isFlushingQueue = false }

        let operations = persistence.pendingOperations()
        guard !operations.isEmpty else { return }

        for operation in operations {
            if Task.isCancelled { break }
            let success = await handler(operation)
            if success {
                persistence.removeOperation(id: operation.id)
            } else {
                persistence.markOperationAttempt(id: operation.id)
                break
            }
        }
    }

    private func apply(_ operation: SyncOperation) async -> Bool {
        switch operation.entityType {
        case .entry:
            return await applyEntryOperation(operation)
        case .goal:
            return await applyGoalOperation(operation)
        case .project:
            return await applyProjectOperation(operation)
        case .habitDefinition:
            return await applyHabitDefinitionOperation(operation)
        case .habitLog:
            return await applyHabitLogOperation(operation)
        case .trackerDefinition:
            return await applyTrackerDefinitionOperation(operation)
        case .trackerLog:
            return await applyTrackerLogOperation(operation)
        case .entity:
            return await applyEntityOperation(operation)
        case .workoutSession:
            return await applyWorkoutSessionOperation(operation)
        case .workoutRow:
            return await applyWorkoutRowOperation(operation)
        case .nutritionLog:
            return await applyNutritionLogOperation(operation)
        case .savedView:
            return await applySavedViewOperation(operation)
        }
    }

    private func schedulePersistence() {
        guard let persistence else { return }
        persistenceTask?.cancel()
        persistenceTask = Task { @MainActor [weak self] in
            try? await TodoTask.sleep(for: .milliseconds(250))
            guard let self else { return }
            persistence.save(from: self.appStore)
        }
    }

    private func enqueueOperation<T: Encodable>(
        entityId: UUID?,
        entityType: SyncEntityType,
        action: SyncAction,
        payload: T
    ) {
        guard let persistence else { return }
        guard let data = encodePayload(payload) else { return }
        let operation = SyncOperation(entityId: entityId, entityType: entityType, action: action, payload: data)
        persistence.enqueue(operation)
    }

    private func encodePayload<T: Encodable>(_ payload: T) -> Data? {
        try? payloadEncoder.encode(payload)
    }

    private func decodePayload<T: Decodable>(_ type: T.Type, data: Data?) -> T? {
        guard let data else { return nil }
        return try? payloadDecoder.decode(type, from: data)
    }

    private func shouldIgnoreDuplicate(_ error: Error) -> Bool {
        error.localizedDescription.lowercased().contains("duplicate")
    }

    private func recordConflictIfNeeded<T: Encodable>(
        entityId: UUID,
        entityType: SyncEntityType,
        remote: T,
        note: String
    ) {
        guard let persistence else { return }
        guard persistence.hasPendingOperation(entityId: entityId, entityType: entityType) else { return }
        let localData = localPayloadData(entityId: entityId, entityType: entityType)
        let remoteData = encodePayload(remote)
        let conflict = SyncConflict(
            entityId: entityId,
            entityType: entityType,
            localPayload: localData,
            remotePayload: remoteData,
            note: note
        )
        persistence.logConflict(conflict)
    }

    private func localPayloadData(entityId: UUID, entityType: SyncEntityType) -> Data? {
        switch entityType {
        case .entry:
            if let task = appStore.tasks.first(where: { $0.id == entityId }) {
                return encodePayload(task)
            }
            if let entry = appStore.entries.first(where: { $0.id == entityId }) {
                return encodePayload(entry)
            }
            if let note = appStore.notes.first(where: { $0.id == entityId }) {
                return encodePayload(note)
            }
        case .goal:
            return appStore.goals.first(where: { $0.id == entityId }).flatMap(encodePayload)
        case .project:
            return appStore.projects.first(where: { $0.id == entityId }).flatMap(encodePayload)
        case .habitDefinition:
            return appStore.habits.first(where: { $0.id == entityId }).flatMap(encodePayload)
        case .habitLog:
            return appStore.habitLogs.first(where: { $0.id == entityId }).flatMap(encodePayload)
        case .trackerDefinition:
            return appStore.trackers.first(where: { $0.id == entityId }).flatMap(encodePayload)
        case .trackerLog:
            return appStore.trackerLogs.first(where: { $0.id == entityId }).flatMap(encodePayload)
        case .entity:
            if let tag = appStore.tags.first(where: { $0.id == entityId }) {
                return encodePayload(tag)
            }
            if let person = appStore.people.first(where: { $0.id == entityId }) {
                return encodePayload(person)
            }
            if let place = appStore.places.first(where: { $0.id == entityId }) {
                return encodePayload(place)
            }
        case .workoutSession:
            return appStore.workoutSessions.first(where: { $0.id == entityId }).flatMap(encodePayload)
        case .workoutRow:
            return appStore.workoutRows.first(where: { $0.id == entityId }).flatMap(encodePayload)
        case .nutritionLog:
            return appStore.nutritionLogs.first(where: { $0.id == entityId }).flatMap(encodePayload)
        }
        return nil
    }

    private func applyEntryOperation(_ operation: SyncOperation) async -> Bool {
        switch operation.action {
        case .insert:
            guard let payload = decodePayload(SupabaseEntryInsert.self, data: operation.payload) else { return false }
            do {
                let row: SupabaseEntryRow = try await supabase.client
                    .from("entries")
                    .insert(payload)
                    .select()
                    .single()
                    .execute()
                    .value
                if let localId = operation.entityId {
                    if (row.facets ?? []).contains("task") {
                        replaceLocalTask(localTaskId: localId, row: row)
                    } else {
                        replaceLocalEntry(localEntryId: localId, row: row)
                    }
                    persistence?.replaceOperationEntityId(from: localId, to: row.id)
                }
                schedulePersistence()
                return true
            } catch {
                errorMessage = error.localizedDescription
                return false
            }
        case .update:
            guard let payload = decodePayload(SupabaseEntryUpdate.self, data: operation.payload),
                  let entityId = operation.entityId else { return false }
            do {
                _ = try await supabase.client
                    .from("entries")
                    .update(payload)
                    .eq("id", value: entityId.uuidString)
                    .execute()
                schedulePersistence()
                return true
            } catch {
                errorMessage = error.localizedDescription
                return false
            }
        case .delete:
            guard let entityId = operation.entityId else { return false }
            do {
                _ = try await supabase.client
                    .from("entries")
                    .delete()
                    .eq("id", value: entityId.uuidString)
                    .execute()
                removeEntry(id: entityId)
                schedulePersistence()
                return true
            } catch {
                errorMessage = error.localizedDescription
                return false
            }
        }
    }

    private func applyGoalOperation(_ operation: SyncOperation) async -> Bool {
        switch operation.action {
        case .insert:
            guard let payload = decodePayload(SupabaseGoalInsert.self, data: operation.payload) else { return false }
            do {
                let row: SupabaseGoalRow = try await supabase.client
                    .from("goals")
                    .insert(payload)
                    .select()
                    .single()
                    .execute()
                    .value
                if let localId = operation.entityId {
                    replaceLocalGoal(localId: localId, row: row)
                    persistence?.replaceOperationEntityId(from: localId, to: row.id)
                }
                schedulePersistence()
                return true
            } catch {
                errorMessage = error.localizedDescription
                return false
            }
        case .update:
            guard let payload = decodePayload(SupabaseGoalUpdate.self, data: operation.payload),
                  let entityId = operation.entityId else { return false }
            do {
                _ = try await supabase.client
                    .from("goals")
                    .update(payload)
                    .eq("id", value: entityId.uuidString)
                    .execute()
                schedulePersistence()
                return true
            } catch {
                errorMessage = error.localizedDescription
                return false
            }
        case .delete:
            guard let entityId = operation.entityId else { return false }
            do {
                _ = try await supabase.client
                    .from("goals")
                    .delete()
                    .eq("id", value: entityId.uuidString)
                    .execute()
                removeGoal(id: entityId)
                schedulePersistence()
                return true
            } catch {
                errorMessage = error.localizedDescription
                return false
            }
        }
    }

    private func applyProjectOperation(_ operation: SyncOperation) async -> Bool {
        switch operation.action {
        case .insert:
            guard let payload = decodePayload(SupabaseProjectInsert.self, data: operation.payload) else { return false }
            do {
                let row: SupabaseProjectRow = try await supabase.client
                    .from("projects")
                    .insert(payload)
                    .select()
                    .single()
                    .execute()
                    .value
                if let localId = operation.entityId {
                    replaceLocalProject(localId: localId, row: row)
                    persistence?.replaceOperationEntityId(from: localId, to: row.id)
                }
                schedulePersistence()
                return true
            } catch {
                errorMessage = error.localizedDescription
                return false
            }
        case .update:
            guard let payload = decodePayload(SupabaseProjectUpdate.self, data: operation.payload),
                  let entityId = operation.entityId else { return false }
            do {
                _ = try await supabase.client
                    .from("projects")
                    .update(payload)
                    .eq("id", value: entityId.uuidString)
                    .execute()
                schedulePersistence()
                return true
            } catch {
                errorMessage = error.localizedDescription
                return false
            }
        case .delete:
            guard let entityId = operation.entityId else { return false }
            do {
                _ = try await supabase.client
                    .from("projects")
                    .delete()
                    .eq("id", value: entityId.uuidString)
                    .execute()
                removeProject(id: entityId)
                schedulePersistence()
                return true
            } catch {
                errorMessage = error.localizedDescription
                return false
            }
        }
    }

    private func applyHabitDefinitionOperation(_ operation: SyncOperation) async -> Bool {
        switch operation.action {
        case .insert:
            guard let payload = decodePayload(SupabaseHabitInsert.self, data: operation.payload) else { return false }
            do {
                let row: SupabaseHabitRow = try await supabase.client
                    .from("habit_definitions")
                    .insert(payload)
                    .select()
                    .single()
                    .execute()
                    .value
                if let localId = operation.entityId {
                    replaceLocalHabit(localId: localId, row: row)
                    persistence?.replaceOperationEntityId(from: localId, to: row.id)
                }
                schedulePersistence()
                return true
            } catch {
                errorMessage = error.localizedDescription
                return false
            }
        case .update:
            guard let payload = decodePayload(SupabaseHabitUpdate.self, data: operation.payload),
                  let entityId = operation.entityId else { return false }
            do {
                _ = try await supabase.client
                    .from("habit_definitions")
                    .update(payload)
                    .eq("id", value: entityId.uuidString)
                    .execute()
                schedulePersistence()
                return true
            } catch {
                errorMessage = error.localizedDescription
                return false
            }
        case .delete:
            guard let entityId = operation.entityId else { return false }
            do {
                _ = try await supabase.client
                    .from("habit_definitions")
                    .delete()
                    .eq("id", value: entityId.uuidString)
                    .execute()
                removeHabitDefinition(id: entityId)
                schedulePersistence()
                return true
            } catch {
                errorMessage = error.localizedDescription
                return false
            }
        }
    }

    private func applyHabitLogOperation(_ operation: SyncOperation) async -> Bool {
        switch operation.action {
        case .insert:
            guard let payload = decodePayload(SupabaseHabitInstanceInsert.self, data: operation.payload) else { return false }
            do {
                let row: SupabaseHabitInstanceRow = try await supabase.client
                    .from("habit_instances")
                    .insert(payload)
                    .select()
                    .single()
                    .execute()
                    .value
                if let localId = operation.entityId {
                    replaceLocalHabitLog(localId: localId, row: row)
                    persistence?.replaceOperationEntityId(from: localId, to: row.id)
                }
                schedulePersistence()
                return true
            } catch {
                errorMessage = error.localizedDescription
                return false
            }
        case .update:
            return true
        case .delete:
            guard let entityId = operation.entityId else { return false }
            do {
                _ = try await supabase.client
                    .from("habit_instances")
                    .delete()
                    .eq("id", value: entityId.uuidString)
                    .execute()
                removeHabitInstance(id: entityId)
                schedulePersistence()
                return true
            } catch {
                errorMessage = error.localizedDescription
                return false
            }
        }
    }

    private func applyTrackerDefinitionOperation(_ operation: SyncOperation) async -> Bool {
        switch operation.action {
        case .insert:
            guard let payload = decodePayload(SupabaseTrackerDefinitionInsert.self, data: operation.payload) else { return false }
            do {
                let row: SupabaseTrackerDefinitionRow = try await supabase.client
                    .from("tracker_definitions")
                    .insert(payload)
                    .select()
                    .single()
                    .execute()
                    .value
                if let localId = operation.entityId {
                    replaceLocalTracker(localId: localId, row: row)
                    persistence?.replaceOperationEntityId(from: localId, to: row.id)
                }
                schedulePersistence()
                return true
            } catch {
                errorMessage = error.localizedDescription
                return false
            }
        case .update:
            guard let payload = decodePayload(SupabaseTrackerDefinitionUpdate.self, data: operation.payload),
                  let entityId = operation.entityId else { return false }
            do {
                _ = try await supabase.client
                    .from("tracker_definitions")
                    .update(payload)
                    .eq("id", value: entityId.uuidString)
                    .execute()
                schedulePersistence()
                return true
            } catch {
                errorMessage = error.localizedDescription
                return false
            }
        case .delete:
            guard let entityId = operation.entityId else { return false }
            do {
                _ = try await supabase.client
                    .from("tracker_definitions")
                    .delete()
                    .eq("id", value: entityId.uuidString)
                    .execute()
                removeTrackerDefinition(id: entityId)
                schedulePersistence()
                return true
            } catch {
                errorMessage = error.localizedDescription
                return false
            }
        }
    }

    private func applyTrackerLogOperation(_ operation: SyncOperation) async -> Bool {
        switch operation.action {
        case .insert:
            guard let payload = decodePayload(SupabaseTrackerLogInsert.self, data: operation.payload) else { return false }
            do {
                let row: SupabaseTrackerLogRow = try await supabase.client
                    .from("tracker_logs")
                    .insert(payload)
                    .select()
                    .single()
                    .execute()
                    .value
                if let localId = operation.entityId {
                    replaceLocalTrackerLog(localId: localId, row: row)
                    persistence?.replaceOperationEntityId(from: localId, to: row.id)
                }
                schedulePersistence()
                return true
            } catch {
                errorMessage = error.localizedDescription
                return false
            }
        case .update:
            return true
        case .delete:
            guard let entityId = operation.entityId else { return false }
            do {
                _ = try await supabase.client
                    .from("tracker_logs")
                    .delete()
                    .eq("id", value: entityId.uuidString)
                    .execute()
                removeTrackerLog(id: entityId)
                schedulePersistence()
                return true
            } catch {
                errorMessage = error.localizedDescription
                return false
            }
        }
    }

    private func applyEntityOperation(_ operation: SyncOperation) async -> Bool {
        switch operation.action {
        case .insert:
            guard let payload = decodePayload(SupabaseEntityInsert.self, data: operation.payload) else { return false }
            do {
                let row: SupabaseEntityRow = try await supabase.client
                    .from("entities")
                    .insert(payload)
                    .select()
                    .single()
                    .execute()
                    .value
                if let localId = operation.entityId {
                    replaceLocalEntity(localId: localId, row: row)
                    persistence?.replaceOperationEntityId(from: localId, to: row.id)
                }
                schedulePersistence()
                return true
            } catch {
                if shouldIgnoreDuplicate(error) {
                    return true
                }
                errorMessage = error.localizedDescription
                return false
            }
        case .update:
            guard let payload = decodePayload(SupabaseEntityUpdate.self, data: operation.payload),
                  let entityId = operation.entityId else { return false }
            do {
                _ = try await supabase.client
                    .from("entities")
                    .update(payload)
                    .eq("id", value: entityId.uuidString)
                    .execute()
                schedulePersistence()
                return true
            } catch {
                errorMessage = error.localizedDescription
                return false
            }
        case .delete:
            guard let entityId = operation.entityId else { return false }
            do {
                _ = try await supabase.client
                    .from("entities")
                    .delete()
                    .eq("id", value: entityId.uuidString)
                    .execute()
                removeEntity(id: entityId)
                schedulePersistence()
                return true
            } catch {
                errorMessage = error.localizedDescription
                return false
            }
        }
    }

    private func applyWorkoutSessionOperation(_ operation: SyncOperation) async -> Bool {
        switch operation.action {
        case .insert:
            guard let payload = decodePayload(SupabaseWorkoutSessionInsert.self, data: operation.payload) else { return false }
            do {
                let row: SupabaseWorkoutSessionRow = try await supabase.client
                    .from("workout_sessions")
                    .insert(payload)
                    .select()
                    .single()
                    .execute()
                    .value
                if let localId = operation.entityId {
                    replaceLocalWorkoutSession(localId: localId, row: row)
                    persistence?.replaceOperationEntityId(from: localId, to: row.id)
                }
                schedulePersistence()
                return true
            } catch {
                errorMessage = error.localizedDescription
                return false
            }
        case .update:
            guard let payload = decodePayload(SupabaseWorkoutSessionUpdate.self, data: operation.payload),
                  let entityId = operation.entityId else { return false }
            do {
                _ = try await supabase.client
                    .from("workout_sessions")
                    .update(payload)
                    .eq("id", value: entityId.uuidString)
                    .execute()
                schedulePersistence()
                return true
            } catch {
                errorMessage = error.localizedDescription
                return false
            }
        case .delete:
            guard let entityId = operation.entityId else { return false }
            do {
                _ = try await supabase.client
                    .from("workout_sessions")
                    .delete()
                    .eq("id", value: entityId.uuidString)
                    .execute()
                removeWorkoutSession(id: entityId)
                schedulePersistence()
                return true
            } catch {
                errorMessage = error.localizedDescription
                return false
            }
        }
    }

    private func applyWorkoutRowOperation(_ operation: SyncOperation) async -> Bool {
        switch operation.action {
        case .insert:
            guard let payload = decodePayload(SupabaseWorkoutRowInsert.self, data: operation.payload) else { return false }
            do {
                let row: SupabaseWorkoutRowRow = try await supabase.client
                    .from("workout_rows")
                    .insert(payload)
                    .select()
                    .single()
                    .execute()
                    .value
                if let localId = operation.entityId {
                    replaceLocalWorkoutRow(localId: localId, row: row)
                    persistence?.replaceOperationEntityId(from: localId, to: row.id)
                }
                schedulePersistence()
                return true
            } catch {
                errorMessage = error.localizedDescription
                return false
            }
        case .update:
            guard let payload = decodePayload(SupabaseWorkoutRowUpdate.self, data: operation.payload),
                  let entityId = operation.entityId else { return false }
            do {
                _ = try await supabase.client
                    .from("workout_rows")
                    .update(payload)
                    .eq("id", value: entityId.uuidString)
                    .execute()
                schedulePersistence()
                return true
            } catch {
                errorMessage = error.localizedDescription
                return false
            }
        case .delete:
            guard let entityId = operation.entityId else { return false }
            do {
                _ = try await supabase.client
                    .from("workout_rows")
                    .delete()
                    .eq("id", value: entityId.uuidString)
                    .execute()
                removeWorkoutRow(id: entityId)
                schedulePersistence()
                return true
            } catch {
                errorMessage = error.localizedDescription
                return false
            }
        }
    }

    private func applyNutritionLogOperation(_ operation: SyncOperation) async -> Bool {
        switch operation.action {
        case .insert:
            guard let payload = decodePayload(SupabaseNutritionLogInsert.self, data: operation.payload) else { return false }
            do {
                let row: SupabaseNutritionLogRow = try await supabase.client
                    .from("nutrition_logs")
                    .insert(payload)
                    .select()
                    .single()
                    .execute()
                    .value
                if let localId = operation.entityId {
                    replaceLocalNutritionLog(localId: localId, row: row)
                    persistence?.replaceOperationEntityId(from: localId, to: row.id)
                }
                schedulePersistence()
                return true
            } catch {
                errorMessage = error.localizedDescription
                return false
            }
        case .update:
            guard let payload = decodePayload(SupabaseNutritionLogUpdate.self, data: operation.payload),
                  let entityId = operation.entityId else { return false }
            do {
                _ = try await supabase.client
                    .from("nutrition_logs")
                    .update(payload)
                    .eq("id", value: entityId.uuidString)
                    .execute()
                schedulePersistence()
                return true
            } catch {
                errorMessage = error.localizedDescription
                return false
            }
        case .delete:
            guard let entityId = operation.entityId else { return false }
            do {
                _ = try await supabase.client
                    .from("nutrition_logs")
                    .delete()
                    .eq("id", value: entityId.uuidString)
                    .execute()
                removeNutritionLog(id: entityId)
                schedulePersistence()
                return true
            } catch {
                errorMessage = error.localizedDescription
                return false
            }
        }
    }

    public func createTask(title: String, dueAt: Date? = nil, scheduledAt: Date? = nil, estimateMinutes: Int? = nil) {
        let localTask = TodoTask(title: title, dueAt: dueAt, scheduledAt: scheduledAt, estimateMinutes: estimateMinutes)
        appStore.tasks.insert(localTask, at: 0)
        schedulePersistence()
        guard isEnabled, let userId = authStore.userId else { return }

        Task { @MainActor in
            let frontmatter = FrontmatterCodec.merge(
                existing: localTask.frontmatter,
                allDay: nil,
                recurrenceRule: localTask.recurrenceRule,
                recurrenceExceptions: localTask.recurrenceExceptions
            )
            let payload = SupabaseEntryInsert(
                userId: userId,
                title: title,
                facets: ["task"],
                status: "open",
                scheduledAt: SupabaseDate.string(scheduledAt),
                dueAt: SupabaseDate.string(dueAt),
                completedAt: nil,
                startAt: nil,
                endAt: nil,
                durationMinutes: estimateMinutes,
                tags: localTask.tags,
                contexts: localTask.contexts,
                people: localTask.people,
                frontmatter: frontmatter,
                bodyMarkdown: ""
            )
            do {
                let row: SupabaseEntryRow = try await supabase.client
                    .from("entries")
                    .insert(payload)
                    .select()
                    .single()
                    .execute()
                    .value
                replaceLocalTask(localTaskId: localTask.id, row: row)
                schedulePersistence()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: localTask.id, entityType: .entry, action: .insert, payload: payload)
            }
        }
    }

    public func toggleTask(_ task: TodoTask) {
        appStore.toggleTask(task)
        guard isEnabled, let _ = authStore.userId else { return }

        let status = mapStatus(appStore.tasks.first(where: { $0.id == task.id })?.status ?? task.status)
        let completedAt = status == "done" ? SupabaseDate.string(Date()) : nil
        let scheduledAt = appStore.tasks.first(where: { $0.id == task.id })?.scheduledAt ?? task.scheduledAt
        let estimateMinutes = appStore.tasks.first(where: { $0.id == task.id })?.estimateMinutes ?? task.estimateMinutes
        let update = SupabaseEntryUpdate(
            title: nil,
            facets: nil,
            status: status,
            scheduledAt: SupabaseDate.string(scheduledAt),
            dueAt: SupabaseDate.string(task.dueAt),
            completedAt: completedAt,
            startAt: nil,
            endAt: nil,
            durationMinutes: estimateMinutes,
            tags: nil,
            contexts: nil,
            people: nil,
            frontmatter: nil,
            bodyMarkdown: nil
        )
        Task { @MainActor in
            do {
                _ = try await supabase.client
                    .from("entries")
                    .update(update)
                    .eq("id", value: task.id.uuidString)
                    .execute()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: task.id, entityType: .entry, action: .update, payload: update)
            }
        }
    }

    public func scheduleTask(id: UUID, startAt: Date, endAt: Date? = nil) {
        appStore.scheduleTask(id: id, startAt: startAt, endAt: endAt)
        schedulePersistence()
        guard isEnabled else { return }
        guard let task = appStore.tasks.first(where: { $0.id == id }) else { return }

        let frontmatter = FrontmatterCodec.merge(
            existing: task.frontmatter,
            allDay: nil,
            recurrenceRule: task.recurrenceRule,
            recurrenceExceptions: task.recurrenceExceptions
        )
        let update = SupabaseEntryUpdate(
            title: nil,
            facets: nil,
            status: nil,
            scheduledAt: SupabaseDate.string(task.scheduledAt),
            dueAt: SupabaseDate.string(task.dueAt),
            completedAt: nil,
            startAt: nil,
            endAt: nil,
            durationMinutes: task.estimateMinutes,
            tags: nil,
            contexts: nil,
            people: nil,
            frontmatter: frontmatter,
            bodyMarkdown: nil
        )

        Task { @MainActor in
            do {
                _ = try await supabase.client
                    .from("entries")
                    .update(update)
                    .eq("id", value: task.id.uuidString)
                    .execute()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: task.id, entityType: .entry, action: .update, payload: update)
            }
        }
    }

    public func updateTask(
        id: UUID,
        title: String,
        status: TaskStatus,
        dueAt: Date?,
        scheduledAt: Date?,
        estimateMinutes: Int?,
        tags: [String],
        people: [String],
        contexts: [String],
        notes: String,
        recurrenceRule: RecurrenceRule? = nil,
        recurrenceExceptions: [RecurrenceException] = [],
        updateRecurrence: Bool = false
    ) {
        appStore.updateTask(
            id: id,
            title: title,
            status: status,
            dueAt: dueAt,
            scheduledAt: scheduledAt,
            estimateMinutes: estimateMinutes,
            tags: tags,
            people: people,
            contexts: contexts,
            notes: notes,
            recurrenceRule: recurrenceRule,
            recurrenceExceptions: recurrenceExceptions,
            updateRecurrence: updateRecurrence
        )
        schedulePersistence()
        guard isEnabled else { return }
        guard let task = appStore.tasks.first(where: { $0.id == id }) else { return }

        let frontmatter = FrontmatterCodec.merge(
            existing: task.frontmatter,
            allDay: nil,
            recurrenceRule: task.recurrenceRule,
            recurrenceExceptions: task.recurrenceExceptions
        )
        let update = SupabaseEntryUpdate(
            title: title,
            facets: nil,
            status: mapStatus(status),
            scheduledAt: SupabaseDate.string(task.scheduledAt),
            dueAt: SupabaseDate.string(task.dueAt),
            completedAt: status == .done ? SupabaseDate.string(Date()) : nil,
            startAt: nil,
            endAt: nil,
            durationMinutes: task.estimateMinutes,
            tags: task.tags,
            contexts: task.contexts,
            people: task.people,
            frontmatter: frontmatter,
            bodyMarkdown: notes
        )

        Task { @MainActor in
            do {
                _ = try await supabase.client
                    .from("entries")
                    .update(update)
                    .eq("id", value: id.uuidString)
                    .execute()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: id, entityType: .entry, action: .update, payload: update)
            }
        }
    }

    public func deleteTask(id: UUID) {
        appStore.deleteTask(id: id)
        schedulePersistence()
        guard isEnabled else { return }

        Task { @MainActor in
            do {
                _ = try await supabase.client
                    .from("entries")
                    .delete()
                    .eq("id", value: id.uuidString)
                    .execute()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: id, entityType: .entry, action: .delete, payload: nil)
            }
        }
    }

    public func overrideTaskOccurrence(id: UUID, occurrenceStartAt: Date, startAt: Date, endAt: Date?) {
        let minutes = appStore.tasks.first(where: { $0.id == id })?.estimateMinutes ?? ScheduleService.defaultTaskMinutes
        let finalEnd = endAt ?? startAt.addingTimeInterval(TimeInterval(minutes * 60))
        appStore.addTaskRecurrenceException(
            id: id,
            originalStartAt: occurrenceStartAt,
            startAt: startAt,
            endAt: finalEnd
        )
        schedulePersistence()
        guard isEnabled else { return }
        guard let task = appStore.tasks.first(where: { $0.id == id }) else { return }

        let frontmatter = FrontmatterCodec.merge(
            existing: task.frontmatter,
            allDay: nil,
            recurrenceRule: task.recurrenceRule,
            recurrenceExceptions: task.recurrenceExceptions
        )
        let update = SupabaseEntryUpdate(
            title: nil,
            facets: nil,
            status: nil,
            scheduledAt: nil,
            dueAt: nil,
            completedAt: nil,
            startAt: nil,
            endAt: nil,
            durationMinutes: nil,
            tags: nil,
            contexts: nil,
            people: nil,
            frontmatter: frontmatter,
            bodyMarkdown: nil
        )

        Task { @MainActor in
            do {
                _ = try await supabase.client
                    .from("entries")
                    .update(update)
                    .eq("id", value: id.uuidString)
                    .execute()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: id, entityType: .entry, action: .update, payload: update)
            }
        }
    }

    public func createEvent(title: String, startAt: Date, endAt: Date, allDay: Bool = false) {
        let durationMinutes = max(5, Int(endAt.timeIntervalSince(startAt) / 60))
        createEntry(title: title, facets: [.event], notes: "", startAt: startAt, endAt: endAt, allDay: allDay, durationMinutes: durationMinutes)
    }

    public func scheduleEntry(id: UUID, startAt: Date, endAt: Date, allDay: Bool = false) {
        appStore.scheduleEntry(id: id, startAt: startAt, endAt: endAt, allDay: allDay)
        schedulePersistence()
        guard isEnabled else { return }
        guard let entry = appStore.entries.first(where: { $0.id == id }) else { return }

        let durationMinutes = max(5, Int(endAt.timeIntervalSince(startAt) / 60))
        let frontmatter = FrontmatterCodec.merge(
            existing: entry.frontmatter,
            allDay: entry.allDay,
            recurrenceRule: entry.recurrenceRule,
            recurrenceExceptions: entry.recurrenceExceptions
        )
        let update = SupabaseEntryUpdate(
            title: nil,
            facets: nil,
            status: nil,
            scheduledAt: nil,
            dueAt: nil,
            completedAt: nil,
            startAt: SupabaseDate.string(entry.startAt),
            endAt: SupabaseDate.string(entry.endAt),
            durationMinutes: durationMinutes,
            tags: nil,
            contexts: nil,
            people: nil,
            frontmatter: frontmatter,
            bodyMarkdown: nil
        )

        Task { @MainActor in
            do {
                _ = try await supabase.client
                    .from("entries")
                    .update(update)
                    .eq("id", value: entry.id.uuidString)
                    .execute()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: entry.id, entityType: .entry, action: .update, payload: update)
            }
        }
    }

    public func overrideEntryOccurrence(id: UUID, occurrenceStartAt: Date, startAt: Date, endAt: Date, allDay: Bool) {
        appStore.addEntryRecurrenceException(
            id: id,
            originalStartAt: occurrenceStartAt,
            startAt: startAt,
            endAt: endAt,
            allDay: allDay
        )
        schedulePersistence()
        guard isEnabled else { return }
        guard let entry = appStore.entries.first(where: { $0.id == id }) else { return }

        let frontmatter = FrontmatterCodec.merge(
            existing: entry.frontmatter,
            allDay: entry.allDay,
            recurrenceRule: entry.recurrenceRule,
            recurrenceExceptions: entry.recurrenceExceptions
        )
        let update = SupabaseEntryUpdate(
            title: nil,
            facets: nil,
            status: nil,
            scheduledAt: nil,
            dueAt: nil,
            completedAt: nil,
            startAt: nil,
            endAt: nil,
            durationMinutes: nil,
            tags: nil,
            contexts: nil,
            people: nil,
            frontmatter: frontmatter,
            bodyMarkdown: nil
        )

        Task { @MainActor in
            do {
                _ = try await supabase.client
                    .from("entries")
                    .update(update)
                    .eq("id", value: id.uuidString)
                    .execute()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: id, entityType: .entry, action: .update, payload: update)
            }
        }
    }

    public func deleteEntry(id: UUID) {
        removeEntry(id: id)
        schedulePersistence()
        guard isEnabled else { return }

        Task { @MainActor in
            do {
                _ = try await supabase.client
                    .from("entries")
                    .delete()
                    .eq("id", value: id.uuidString)
                    .execute()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(
                    entityId: id,
                    entityType: .entry,
                    action: .delete,
                    payload: SupabaseEntryUpdate(
                        title: nil,
                        facets: nil,
                        status: nil,
                        scheduledAt: nil,
                        dueAt: nil,
                        completedAt: nil,
                        startAt: nil,
                        endAt: nil,
                        durationMinutes: nil,
                        tags: nil,
                        contexts: nil,
                        people: nil,
                        frontmatter: nil,
                        bodyMarkdown: nil
                    )
                )
            }
        }
    }

    public func createEntry(title: String, facets: [EntryFacet], notes: String, startAt: Date? = nil, endAt: Date? = nil, allDay: Bool = false, durationMinutes: Int? = nil) {
        let entry = Entry(title: title, facets: facets, startAt: startAt ?? Date(), endAt: endAt, allDay: allDay, tags: [], contexts: [], people: [], notes: notes)
        appStore.entries.insert(entry, at: 0)
        if facets.contains(.note) {
            appStore.notes.insert(Note(id: entry.id, title: title, body: notes, createdAt: entry.startAt ?? Date()), at: 0)
        }
        schedulePersistence()
        guard isEnabled, let userId = authStore.userId else { return }

        Task { @MainActor in
            let frontmatter = FrontmatterCodec.merge(
                existing: entry.frontmatter,
                allDay: entry.allDay,
                recurrenceRule: entry.recurrenceRule,
                recurrenceExceptions: entry.recurrenceExceptions
            )
            let payload = SupabaseEntryInsert(
                userId: userId,
                title: title,
                facets: facets.map(\.rawValue),
                status: nil,
                scheduledAt: nil,
                dueAt: nil,
                completedAt: nil,
                startAt: SupabaseDate.string(entry.startAt),
                endAt: SupabaseDate.string(entry.endAt),
                durationMinutes: durationMinutes,
                tags: entry.tags,
                contexts: entry.contexts,
                people: entry.people,
                frontmatter: frontmatter,
                bodyMarkdown: notes
            )
            do {
                let row: SupabaseEntryRow = try await supabase.client
                    .from("entries")
                    .insert(payload)
                    .select()
                    .single()
                    .execute()
                    .value
                replaceLocalEntry(localEntryId: entry.id, row: row)
                schedulePersistence()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: entry.id, entityType: .entry, action: .insert, payload: payload)
            }
        }
    }

    public func updateNote(id: UUID, title: String, body: String, tags: [String], people: [String], contexts: [String]) {
        appStore.updateNote(id: id, title: title, body: body, tags: tags, people: people, contexts: contexts)
        schedulePersistence()
        guard isEnabled else { return }

        let update = SupabaseEntryUpdate(
            title: title,
            facets: nil,
            status: nil,
            scheduledAt: nil,
            dueAt: nil,
            completedAt: nil,
            startAt: nil,
            endAt: nil,
            durationMinutes: nil,
            tags: tags,
            contexts: contexts,
            people: people,
            frontmatter: nil,
            bodyMarkdown: body
        )

        Task { @MainActor in
            do {
                _ = try await supabase.client
                    .from("entries")
                    .update(update)
                    .eq("id", value: id.uuidString)
                    .execute()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: id, entityType: .entry, action: .update, payload: update)
            }
        }
    }

    public func deleteNote(id: UUID) {
        appStore.deleteNote(id: id)
        schedulePersistence()
        guard isEnabled else { return }

        Task { @MainActor in
            do {
                _ = try await supabase.client
                    .from("entries")
                    .delete()
                    .eq("id", value: id.uuidString)
                    .execute()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: id, entityType: .entry, action: .delete, payload: nil)
            }
        }
    }

    public func createGoal(title: String, importance: Int = 6) {
        let goal = Goal(title: title, importance: importance)
        appStore.goals.insert(goal, at: 0)
        schedulePersistence()
        guard isEnabled, let userId = authStore.userId else { return }

        Task { @MainActor in
            let payload = SupabaseGoalInsert(userId: userId, title: title, importance: importance)
            do {
                let row: SupabaseGoalRow = try await supabase.client
                    .from("goals")
                    .insert(payload)
                    .select()
                    .single()
                    .execute()
                    .value
                replaceLocalGoal(localId: goal.id, row: row)
                schedulePersistence()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: goal.id, entityType: .goal, action: .insert, payload: payload)
            }
        }
    }

    public func updateGoal(id: UUID, title: String, importance: Int, archived: Bool? = nil) {
        guard let idx = appStore.goals.firstIndex(where: { $0.id == id }) else { return }
        appStore.goals[idx].title = title
        appStore.goals[idx].importance = importance
        schedulePersistence()
        guard isEnabled else { return }

        let update = SupabaseGoalUpdate(title: title, importance: importance, archived: archived)
        Task { @MainActor in
            do {
                _ = try await supabase.client
                    .from("goals")
                    .update(update)
                    .eq("id", value: id.uuidString)
                    .execute()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: id, entityType: .goal, action: .update, payload: update)
            }
        }
    }

    public func deleteGoal(id: UUID) {
        removeGoal(id: id)
        schedulePersistence()
        guard isEnabled else { return }

        Task { @MainActor in
            do {
                _ = try await supabase.client
                    .from("goals")
                    .delete()
                    .eq("id", value: id.uuidString)
                    .execute()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: id, entityType: .goal, action: .delete, payload: SupabaseGoalUpdate(title: nil, importance: nil, archived: nil))
            }
        }
    }

    public func createProject(title: String, status: String = "active", importance: Int = 5) {
        let project = Project(title: title, status: status)
        appStore.projects.insert(project, at: 0)
        schedulePersistence()
        guard isEnabled, let userId = authStore.userId else { return }

        Task { @MainActor in
            let payload = SupabaseProjectInsert(userId: userId, title: title, status: status, importance: importance)
            do {
                let row: SupabaseProjectRow = try await supabase.client
                    .from("projects")
                    .insert(payload)
                    .select()
                    .single()
                    .execute()
                    .value
                replaceLocalProject(localId: project.id, row: row)
                schedulePersistence()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: project.id, entityType: .project, action: .insert, payload: payload)
            }
        }
    }

    public func updateProject(id: UUID, title: String, status: String, importance: Int? = nil) {
        guard let idx = appStore.projects.firstIndex(where: { $0.id == id }) else { return }
        appStore.projects[idx].title = title
        appStore.projects[idx].status = status
        schedulePersistence()
        guard isEnabled else { return }

        let update = SupabaseProjectUpdate(title: title, status: status, importance: importance)
        Task { @MainActor in
            do {
                _ = try await supabase.client
                    .from("projects")
                    .update(update)
                    .eq("id", value: id.uuidString)
                    .execute()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: id, entityType: .project, action: .update, payload: update)
            }
        }
    }

    public func deleteProject(id: UUID) {
        removeProject(id: id)
        schedulePersistence()
        guard isEnabled else { return }

        Task { @MainActor in
            do {
                _ = try await supabase.client
                    .from("projects")
                    .delete()
                    .eq("id", value: id.uuidString)
                    .execute()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: id, entityType: .project, action: .delete, payload: SupabaseProjectUpdate(title: nil, status: nil, importance: nil))
            }
        }
    }

    public func createHabit(title: String, importance: Int = 5, difficulty: Int = 5, scheduledAt: Date? = nil, durationMinutes: Int? = nil, recurrenceRule: RecurrenceRule? = nil) {
        var habit = HabitDefinition(title: title, importance: importance, difficulty: difficulty)
        habit.scheduledAt = scheduledAt
        if let durationMinutes {
            habit.durationMinutes = max(5, durationMinutes)
        }
        habit.recurrenceRule = recurrenceRule
        let localId = habit.id
        appStore.habits.insert(habit, at: 0)
        schedulePersistence()
        guard isEnabled, let userId = authStore.userId else { return }

        Task { @MainActor in
            let payload = SupabaseHabitInsert(
                userId: userId,
                title: title,
                importance: importance,
                difficulty: difficulty,
                schedule: HabitScheduleCodec.schedule(from: habit),
                metadata: HabitScheduleCodec.metadata(from: habit)
            )
            do {
                let row: SupabaseHabitRow = try await supabase.client
                    .from("habit_definitions")
                    .insert(payload)
                    .select()
                    .single()
                    .execute()
                    .value
                replaceLocalHabit(localId: localId, row: row)
                schedulePersistence()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: localId, entityType: .habitDefinition, action: .insert, payload: payload)
            }
        }
    }

    public func updateHabit(
        id: UUID,
        title: String,
        importance: Int,
        difficulty: Int,
        tags: [String],
        people: [String],
        contexts: [String],
        targetPerWeek: Int?,
        scheduledAt: Date?,
        durationMinutes: Int?,
        recurrenceRule: RecurrenceRule? = nil,
        recurrenceExceptions: [RecurrenceException] = [],
        updateRecurrence: Bool = false
    ) {
        appStore.updateHabit(
            id: id,
            title: title,
            importance: importance,
            difficulty: difficulty,
            tags: tags,
            people: people,
            contexts: contexts,
            targetPerWeek: targetPerWeek,
            scheduledAt: scheduledAt,
            durationMinutes: durationMinutes,
            recurrenceRule: recurrenceRule,
            recurrenceExceptions: recurrenceExceptions,
            updateRecurrence: updateRecurrence
        )
        schedulePersistence()
        guard isEnabled else { return }

        let schedule = appStore.habits.first(where: { $0.id == id }).flatMap { HabitScheduleCodec.schedule(from: $0) }
        let metadata = appStore.habits.first(where: { $0.id == id }).flatMap { HabitScheduleCodec.metadata(from: $0) }
        let update = SupabaseHabitUpdate(
            title: title,
            importance: importance,
            difficulty: difficulty,
            archived: nil,
            schedule: schedule,
            metadata: metadata
        )

        Task { @MainActor in
            do {
                _ = try await supabase.client
                    .from("habit_definitions")
                    .update(update)
                    .eq("id", value: id.uuidString)
                    .execute()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: id, entityType: .habitDefinition, action: .update, payload: update)
            }
        }
    }

    public func scheduleHabit(id: UUID, startAt: Date, durationMinutes: Int? = nil, recurrenceRule: RecurrenceRule? = nil) {
        appStore.scheduleHabit(id: id, startAt: startAt, durationMinutes: durationMinutes)
        if let recurrenceRule, let idx = appStore.habits.firstIndex(where: { $0.id == id }) {
            appStore.habits[idx].recurrenceRule = recurrenceRule
        }
        schedulePersistence()
        guard isEnabled else { return }
        guard let habit = appStore.habits.first(where: { $0.id == id }) else { return }

        let update = SupabaseHabitUpdate(
            title: nil,
            importance: nil,
            difficulty: nil,
            archived: nil,
            schedule: HabitScheduleCodec.schedule(from: habit),
            metadata: HabitScheduleCodec.metadata(from: habit)
        )

        Task { @MainActor in
            do {
                _ = try await supabase.client
                    .from("habit_definitions")
                    .update(update)
                    .eq("id", value: id.uuidString)
                    .execute()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: id, entityType: .habitDefinition, action: .update, payload: update)
            }
        }
    }

    public func deleteHabit(id: UUID) {
        appStore.deleteHabit(id: id)
        schedulePersistence()
        guard isEnabled else { return }

        Task { @MainActor in
            do {
                _ = try await supabase.client
                    .from("habit_definitions")
                    .delete()
                    .eq("id", value: id.uuidString)
                    .execute()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: id, entityType: .habitDefinition, action: .delete, payload: nil)
            }
        }
    }

    public func overrideHabitOccurrence(id: UUID, occurrenceStartAt: Date, startAt: Date, endAt: Date) {
        appStore.addHabitRecurrenceException(
            id: id,
            originalStartAt: occurrenceStartAt,
            startAt: startAt,
            endAt: endAt
        )
        schedulePersistence()
        guard isEnabled else { return }
        guard let habit = appStore.habits.first(where: { $0.id == id }) else { return }

        let update = SupabaseHabitUpdate(
            title: nil,
            importance: nil,
            difficulty: nil,
            archived: nil,
            schedule: nil,
            metadata: HabitScheduleCodec.metadata(from: habit)
        )

        Task { @MainActor in
            do {
                _ = try await supabase.client
                    .from("habit_definitions")
                    .update(update)
                    .eq("id", value: id.uuidString)
                    .execute()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: id, entityType: .habitDefinition, action: .update, payload: update)
            }
        }
    }

    public func logHabit(_ habit: HabitDefinition) {
        let log = HabitLog(habitId: habit.id)
        appStore.habitLogs.insert(log, at: 0)
        schedulePersistence()
        guard isEnabled, let userId = authStore.userId else { return }

        Task { @MainActor in
            let payload = SupabaseHabitInstanceInsert(userId: userId, habitId: habit.id, occurredAt: SupabaseDate.string(log.date))
            do {
                let row: SupabaseHabitInstanceRow = try await supabase.client
                    .from("habit_instances")
                    .insert(payload)
                    .select()
                    .single()
                    .execute()
                    .value
                replaceLocalHabitLog(localId: log.id, row: row)
                schedulePersistence()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: log.id, entityType: .habitLog, action: .insert, payload: payload)
            }
        }
    }

    public func createTracker(key: String, unit: String?) {
        let tracker = TrackerDefinition(key: key, unit: unit)
        appStore.trackers.insert(tracker, at: 0)
        schedulePersistence()
        guard isEnabled, let userId = authStore.userId else { return }

        Task { @MainActor in
            let payload = SupabaseTrackerDefinitionInsert(userId: userId, key: key, displayName: key.capitalized, unit: unit)
            do {
                let row: SupabaseTrackerDefinitionRow = try await supabase.client
                    .from("tracker_definitions")
                    .insert(payload)
                    .select()
                    .single()
                    .execute()
                    .value
                replaceLocalTracker(localId: tracker.id, row: row)
                schedulePersistence()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: tracker.id, entityType: .trackerDefinition, action: .insert, payload: payload)
            }
        }
    }

    public func updateTrackerDefinition(id: UUID, key: String, unit: String?) {
        guard let idx = appStore.trackers.firstIndex(where: { $0.id == id }) else { return }
        appStore.trackers[idx].key = key
        appStore.trackers[idx].unit = unit
        schedulePersistence()
        guard isEnabled else { return }

        let update = SupabaseTrackerDefinitionUpdate(key: key, displayName: key.capitalized, unit: unit)
        Task { @MainActor in
            do {
                _ = try await supabase.client
                    .from("tracker_definitions")
                    .update(update)
                    .eq("id", value: id.uuidString)
                    .execute()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: id, entityType: .trackerDefinition, action: .update, payload: update)
            }
        }
    }

    public func deleteTrackerDefinition(id: UUID) {
        removeTrackerDefinition(id: id)
        schedulePersistence()
        guard isEnabled else { return }

        Task { @MainActor in
            do {
                _ = try await supabase.client
                    .from("tracker_definitions")
                    .delete()
                    .eq("id", value: id.uuidString)
                    .execute()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: id, entityType: .trackerDefinition, action: .delete, payload: SupabaseTrackerDefinitionUpdate(key: nil, displayName: nil, unit: nil))
            }
        }
    }

    public func logTracker(_ tracker: TrackerDefinition, value: Double) {
        let log = TrackerLog(trackerId: tracker.id, value: value, createdAt: Date())
        appStore.trackerLogs.insert(log, at: 0)
        schedulePersistence()
        guard isEnabled, let userId = authStore.userId else { return }

        Task { @MainActor in
            let payload = SupabaseTrackerLogInsert(
                userId: userId,
                trackerId: tracker.id,
                occurredAt: SupabaseDate.string(log.createdAt),
                valueNumeric: value,
                rawToken: "#\(tracker.key)(\(value))"
            )
            do {
                let row: SupabaseTrackerLogRow = try await supabase.client
                    .from("tracker_logs")
                    .insert(payload)
                    .select()
                    .single()
                    .execute()
                    .value
                replaceLocalTrackerLog(localId: log.id, row: row)
                schedulePersistence()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: log.id, entityType: .trackerLog, action: .insert, payload: payload)
            }
        }
    }

    // MARK: - Workout Session CRUD

    public func createWorkoutSession(title: String, template: WorkoutTemplate, startAt: Date, endAt: Date, healthKitUUID: UUID? = nil) {
        let session = appStore.addWorkoutSession(title: title, template: template, startAt: startAt, endAt: endAt, healthKitUUID: healthKitUUID)
        schedulePersistence()
        guard isEnabled, let userId = authStore.userId, let entryId = session.entryId else { return }

        Task { @MainActor in
            let payload = SupabaseWorkoutSessionInsert(userId: userId, entryId: entryId, template: template.rawValue)
            do {
                let row: SupabaseWorkoutSessionRow = try await supabase.client
                    .from("workout_sessions")
                    .insert(payload)
                    .select()
                    .single()
                    .execute()
                    .value
                replaceLocalWorkoutSession(localId: session.id, row: row)
                schedulePersistence()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: session.id, entityType: .workoutSession, action: .insert, payload: payload)
            }
        }
    }

    public func updateWorkoutSession(id: UUID, title: String, template: WorkoutTemplate, startAt: Date, endAt: Date) {
        appStore.updateWorkoutSession(id: id, title: title, template: template, startAt: startAt, endAt: endAt)
        schedulePersistence()
        guard isEnabled else { return }

        let update = SupabaseWorkoutSessionUpdate(template: template.rawValue)
        Task { @MainActor in
            do {
                _ = try await supabase.client
                    .from("workout_sessions")
                    .update(update)
                    .eq("id", value: id.uuidString)
                    .execute()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: id, entityType: .workoutSession, action: .update, payload: update)
            }
        }
    }

    public func deleteWorkoutSession(id: UUID) {
        removeWorkoutSession(id: id)
        schedulePersistence()
        guard isEnabled else { return }

        Task { @MainActor in
            do {
                _ = try await supabase.client
                    .from("workout_sessions")
                    .delete()
                    .eq("id", value: id.uuidString)
                    .execute()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: id, entityType: .workoutSession, action: .delete, payload: nil)
            }
        }
    }

    // MARK: - Workout Row CRUD

    public func createWorkoutRow(sessionId: UUID, exercise: String, durationSeconds: Int?, distance: Double? = nil, calories: Double? = nil) {
        let row = appStore.addWorkoutRow(sessionId: sessionId, exercise: exercise, durationSeconds: durationSeconds, distance: distance, calories: calories)
        schedulePersistence()
        guard isEnabled, let userId = authStore.userId else { return }

        Task { @MainActor in
            let payload = SupabaseWorkoutRowInsert(
                userId: userId,
                sessionId: sessionId,
                exercise: exercise,
                setIndex: nil,
                reps: nil,
                weight: nil,
                weightUnit: nil,
                rpe: nil,
                durationSeconds: durationSeconds,
                distance: distance,
                distanceUnit: distance != nil ? "km" : nil,
                calories: calories,
                notes: nil
            )
            do {
                let rowResult: SupabaseWorkoutRowRow = try await supabase.client
                    .from("workout_rows")
                    .insert(payload)
                    .select()
                    .single()
                    .execute()
                    .value
                replaceLocalWorkoutRow(localId: row.id, row: rowResult)
                schedulePersistence()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: row.id, entityType: .workoutRow, action: .insert, payload: payload)
            }
        }
    }

    public func deleteWorkoutRow(id: UUID) {
        removeWorkoutRow(id: id)
        schedulePersistence()
        guard isEnabled else { return }

        Task { @MainActor in
            do {
                _ = try await supabase.client
                    .from("workout_rows")
                    .delete()
                    .eq("id", value: id.uuidString)
                    .execute()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: id, entityType: .workoutRow, action: .delete, payload: nil)
            }
        }
    }

    // MARK: - Nutrition Log CRUD

    public func createNutritionLog(title: String, date: Date, calories: Double?, proteinG: Double?, carbsG: Double?, fatG: Double?, confidence: Double?, source: NutritionSource, showOnCalendar: Bool = true, healthKitUUID: UUID? = nil) {
        let log = appStore.addNutritionLog(
            title: title,
            date: date,
            calories: calories,
            proteinG: proteinG,
            carbsG: carbsG,
            fatG: fatG,
            confidence: confidence,
            source: source,
            showOnCalendar: showOnCalendar,
            healthKitUUID: healthKitUUID
        )
        schedulePersistence()
        guard isEnabled, let userId = authStore.userId, let entryId = log.entryId else { return }

        Task { @MainActor in
            let payload = SupabaseNutritionLogInsert(
                userId: userId,
                entryId: entryId,
                calories: calories,
                proteinG: proteinG,
                carbsG: carbsG,
                fatG: fatG,
                confidence: confidence,
                source: source.rawValue,
                showOnCalendar: showOnCalendar
            )
            do {
                let row: SupabaseNutritionLogRow = try await supabase.client
                    .from("nutrition_logs")
                    .insert(payload)
                    .select()
                    .single()
                    .execute()
                    .value
                replaceLocalNutritionLog(localId: log.id, row: row)
                schedulePersistence()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: log.id, entityType: .nutritionLog, action: .insert, payload: payload)
            }
        }
    }

    public func updateNutritionLog(id: UUID, title: String, date: Date, calories: Double?, proteinG: Double?, carbsG: Double?, fatG: Double?, confidence: Double?, source: NutritionSource, showOnCalendar: Bool) {
        appStore.updateNutritionLog(
            id: id,
            title: title,
            date: date,
            calories: calories,
            proteinG: proteinG,
            carbsG: carbsG,
            fatG: fatG,
            confidence: confidence,
            source: source,
            showOnCalendar: showOnCalendar
        )
        schedulePersistence()
        guard isEnabled else { return }

        let update = SupabaseNutritionLogUpdate(
            calories: calories,
            proteinG: proteinG,
            carbsG: carbsG,
            fatG: fatG,
            confidence: confidence,
            source: source.rawValue,
            showOnCalendar: showOnCalendar
        )
        Task { @MainActor in
            do {
                _ = try await supabase.client
                    .from("nutrition_logs")
                    .update(update)
                    .eq("id", value: id.uuidString)
                    .execute()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: id, entityType: .nutritionLog, action: .update, payload: update)
            }
        }
    }

    public func deleteNutritionLog(id: UUID) {
        removeNutritionLog(id: id)
        schedulePersistence()
        guard isEnabled else { return }

        Task { @MainActor in
            do {
                _ = try await supabase.client
                    .from("nutrition_logs")
                    .delete()
                    .eq("id", value: id.uuidString)
                    .execute()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: id, entityType: .nutritionLog, action: .delete, payload: nil)
            }
        }
    }

    public func createEntity(type: String, name: String) {
        let localId = UUID()
        switch type {
        case "tag":
            appStore.tags.insert(TagItem(id: localId, name: name), at: 0)
        case "person":
            appStore.people.insert(Person(id: localId, name: name), at: 0)
        case "place":
            appStore.places.insert(Place(id: localId, name: name, category: "Captured"), at: 0)
        default:
            break
        }
        schedulePersistence()

        guard isEnabled, let userId = authStore.userId else { return }
        Task { @MainActor in
            let payload = SupabaseEntityInsert(userId: userId, type: type, key: name.lowercased(), displayName: name)
            do {
                let row: SupabaseEntityRow = try await supabase.client
                    .from("entities")
                    .insert(payload)
                    .select()
                    .single()
                    .execute()
                    .value
                replaceLocalEntity(localId: localId, row: row)
                persistence?.replaceOperationEntityId(from: localId, to: row.id)
                schedulePersistence()
            } catch {
                if shouldIgnoreDuplicate(error) {
                    return
                }
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: localId, entityType: .entity, action: .insert, payload: payload)
            }
        }
    }

    public func updateEntity(id: UUID, type: String, name: String) {
        switch type {
        case "tag":
            if let idx = appStore.tags.firstIndex(where: { $0.id == id }) {
                appStore.tags[idx].name = name
            }
        case "person":
            if let idx = appStore.people.firstIndex(where: { $0.id == id }) {
                appStore.people[idx].name = name
            }
        case "place":
            if let idx = appStore.places.firstIndex(where: { $0.id == id }) {
                appStore.places[idx].name = name
            }
        default:
            break
        }
        schedulePersistence()
        guard isEnabled else { return }

        let update = SupabaseEntityUpdate(key: name.lowercased(), displayName: name)
        Task { @MainActor in
            do {
                _ = try await supabase.client
                    .from("entities")
                    .update(update)
                    .eq("id", value: id.uuidString)
                    .execute()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: id, entityType: .entity, action: .update, payload: update)
            }
        }
    }

    public func deleteEntity(id: UUID) {
        removeEntity(id: id)
        schedulePersistence()
        guard isEnabled else { return }

        Task { @MainActor in
            do {
                _ = try await supabase.client
                    .from("entities")
                    .delete()
                    .eq("id", value: id.uuidString)
                    .execute()
            } catch {
                errorMessage = error.localizedDescription
                enqueueOperation(entityId: id, entityType: .entity, action: .delete, payload: SupabaseEntityUpdate(key: nil, displayName: nil))
            }
        }
    }


    public func ingestCapture(_ parsed: ParsedCapture, sourceText: String, createNoteWhenNoEvent: Bool = true) {
        if let active = parsed.activeEvent {
            createEntry(title: active.title, facets: [.event], notes: sourceText)
        } else if createNoteWhenNoEvent {
            createEntry(title: sourceText, facets: [.note], notes: sourceText)
        }

        for task in parsed.tasks {
            createTask(title: task.title)
        }

        for tracker in parsed.trackerLogs {
            guard case .number(let value) = tracker.value else { continue }
            let existing = appStore.trackers.first(where: { $0.key.lowercased() == tracker.key.lowercased() })
            if let existing {
                logTracker(existing, value: value)
            } else {
                createTracker(key: tracker.key, unit: nil)
                if let created = appStore.trackers.first(where: { $0.key.lowercased() == tracker.key.lowercased() }) {
                    logTracker(created, value: value)
                }
            }
        }

        for tag in parsed.tokens.tags {
            createEntity(type: "tag", name: tag)
        }
        for person in parsed.tokens.people {
            createEntity(type: "person", name: person)
        }
        for place in parsed.tokens.places {
            createEntity(type: "place", name: place)
        }
    }

    private func applyEntries(_ rows: [SupabaseEntryRow]) {
        var entries: [Entry] = []
        var tasks: [TodoTask] = []
        var notes: [Note] = []

        for row in rows {
            if row.deletedAt != nil {
                continue
            }
            let facets = (row.facets ?? []).compactMap { EntryFacet(rawValue: $0) }
            if (row.facets ?? []).contains("task") {
                let status = mapTaskStatus(row.status)
                let task = TodoTask(
                    id: row.id,
                    title: row.title,
                    status: status,
                    dueAt: SupabaseDate.parse(row.dueAt),
                    scheduledAt: SupabaseDate.parse(row.scheduledAt),
                    estimateMinutes: row.durationMinutes,
                    tags: row.tags ?? [],
                    people: row.people ?? [],
                    contexts: row.contexts ?? [],
                    notes: row.bodyMarkdown ?? "",
                    recurrenceRule: FrontmatterCodec.recurrenceRule(from: row.frontmatter),
                    recurrenceExceptions: FrontmatterCodec.recurrenceExceptions(from: row.frontmatter),
                    frontmatter: row.frontmatter
                )
                tasks.append(task)
            } else {
                let entry = Entry(
                    id: row.id,
                    title: row.title,
                    facets: facets.isEmpty ? [.note] : facets,
                    startAt: SupabaseDate.parse(row.startAt),
                    endAt: SupabaseDate.parse(row.endAt),
                    allDay: FrontmatterCodec.allDay(from: row.frontmatter) ?? false,
                    tags: row.tags ?? [],
                    contexts: row.contexts ?? [],
                    people: row.people ?? [],
                    notes: row.bodyMarkdown ?? "",
                    recurrenceRule: FrontmatterCodec.recurrenceRule(from: row.frontmatter),
                    recurrenceExceptions: FrontmatterCodec.recurrenceExceptions(from: row.frontmatter),
                    frontmatter: row.frontmatter
                )
                entries.append(entry)
                if entry.facets.contains(.note) {
                    notes.append(Note(id: entry.id, title: entry.title, body: entry.notes, createdAt: entry.startAt ?? Date()))
                }
            }
        }

        appStore.entries = entries.sorted { ($0.startAt ?? .distantPast) > ($1.startAt ?? .distantPast) }
        appStore.tasks = tasks.sorted { ($0.dueAt ?? .distantPast) > ($1.dueAt ?? .distantPast) }
        appStore.notes = notes
    }

    private func applyGoals(_ rows: [SupabaseGoalRow]) {
        appStore.goals = rows.map { Goal(id: $0.id, title: $0.title, importance: $0.importance ?? 5) }
    }

    private func applyProjects(_ rows: [SupabaseProjectRow]) {
        appStore.projects = rows.map { Project(id: $0.id, title: $0.title, status: $0.status ?? "active") }
    }

    private func applyHabits(_ rows: [SupabaseHabitRow]) {
        appStore.habits = rows.map { row in
            var habit = HabitDefinition(id: row.id, title: row.title, importance: row.importance ?? 5, difficulty: row.difficulty ?? 5)
            habit.isTimed = false
            HabitScheduleCodec.apply(schedule: row.schedule, to: &habit)
            HabitScheduleCodec.applyMetadata(row.metadata, to: &habit)
            return habit
        }
    }

    private func applyHabitLogs(_ rows: [SupabaseHabitInstanceRow]) {
        appStore.habitLogs = rows.map { row in
            HabitLog(id: row.id, habitId: row.habitId, date: SupabaseDate.parse(row.occurredAt) ?? Date())
        }
    }

    private func applyTrackerDefinitions(_ rows: [SupabaseTrackerDefinitionRow]) {
        appStore.trackers = rows.map { TrackerDefinition(id: $0.id, key: $0.key, unit: $0.unit) }
    }

    private func applyTrackerLogs(_ rows: [SupabaseTrackerLogRow]) {
        appStore.trackerLogs = rows.map { row in
            TrackerLog(
                id: row.id,
                trackerId: row.trackerId,
                value: row.valueNumeric ?? 0,
                createdAt: SupabaseDate.parse(row.occurredAt) ?? Date()
            )
        }
    }

    private func applyEntities(_ rows: [SupabaseEntityRow]) {
        var tags: [TagItem] = []
        var people: [Person] = []
        var places: [Place] = []

        for row in rows {
            switch row.type {
            case "tag":
                tags.append(TagItem(id: row.id, name: row.displayName))
            case "person":
                people.append(Person(id: row.id, name: row.displayName))
            case "place":
                places.append(Place(id: row.id, name: row.displayName, category: "Saved"))
            default:
                break
            }
        }

        appStore.tags = tags
        appStore.people = people
        appStore.places = places
    }

    private func applyWorkoutSessions(_ rows: [SupabaseWorkoutSessionRow]) {
        appStore.workoutSessions = rows.map { row in
            let template = WorkoutTemplate(rawValue: row.template) ?? .cardio
            return WorkoutSession(id: row.id, entryId: row.entryId, template: template)
        }
    }

    private func applyWorkoutRows(_ rows: [SupabaseWorkoutRowRow]) {
        appStore.workoutRows = rows.map { row in
            WorkoutRow(
                id: row.id,
                sessionId: row.sessionId,
                exercise: row.exercise,
                setIndex: row.setIndex,
                reps: row.reps,
                weight: row.weight,
                weightUnit: row.weightUnit,
                rpe: row.rpe,
                durationSeconds: row.durationSeconds,
                distance: row.distance,
                distanceUnit: row.distanceUnit,
                calories: row.calories,
                notes: row.notes
            )
        }
    }

    private func applyNutritionLogs(_ rows: [SupabaseNutritionLogRow]) {
        appStore.nutritionLogs = rows.map { row in
            let source = NutritionSource(rawValue: row.source) ?? .estimate
            return NutritionLog(
                id: row.id,
                entryId: row.entryId,
                calories: row.calories,
                proteinG: row.proteinG,
                carbsG: row.carbsG,
                fatG: row.fatG,
                confidence: row.confidence,
                source: source,
                showOnCalendar: row.showOnCalendar ?? true
            )
        }
    }

    private func upsertEntry(from row: SupabaseEntryRow) {
        recordConflictIfNeeded(
            entityId: row.id,
            entityType: .entry,
            remote: row,
            note: "Remote entry update while local changes pending."
        )
        let facets = row.facets ?? []
        if facets.contains("task") {
            removeEntry(id: row.id)
            let task = TodoTask(
                id: row.id,
                title: row.title,
                status: mapTaskStatus(row.status),
                dueAt: SupabaseDate.parse(row.dueAt),
                scheduledAt: SupabaseDate.parse(row.scheduledAt),
                estimateMinutes: row.durationMinutes,
                tags: row.tags ?? [],
                people: row.people ?? [],
                contexts: row.contexts ?? [],
                notes: row.bodyMarkdown ?? "",
                recurrenceRule: FrontmatterCodec.recurrenceRule(from: row.frontmatter),
                recurrenceExceptions: FrontmatterCodec.recurrenceExceptions(from: row.frontmatter),
                frontmatter: row.frontmatter
            )
            upsert(&appStore.tasks, task)
            return
        }

        let entryFacets = facets.compactMap { EntryFacet(rawValue: $0) }
        let entry = Entry(
            id: row.id,
            title: row.title,
            facets: entryFacets.isEmpty ? [.note] : entryFacets,
            startAt: SupabaseDate.parse(row.startAt),
            endAt: SupabaseDate.parse(row.endAt),
            allDay: FrontmatterCodec.allDay(from: row.frontmatter) ?? false,
            tags: row.tags ?? [],
            contexts: row.contexts ?? [],
            people: row.people ?? [],
            notes: row.bodyMarkdown ?? "",
            recurrenceRule: FrontmatterCodec.recurrenceRule(from: row.frontmatter),
            recurrenceExceptions: FrontmatterCodec.recurrenceExceptions(from: row.frontmatter),
            frontmatter: row.frontmatter
        )
        upsert(&appStore.entries, entry)

        if entry.facets.contains(.note) {
            let note = Note(id: entry.id, title: entry.title, body: entry.notes, createdAt: entry.startAt ?? Date())
            upsert(&appStore.notes, note)
        }
    }

    private func removeEntry(id: UUID) {
        appStore.entries.removeAll { $0.id == id }
        appStore.tasks.removeAll { $0.id == id }
        appStore.notes.removeAll { $0.id == id }
    }

    private func upsertGoal(from row: SupabaseGoalRow) {
        recordConflictIfNeeded(
            entityId: row.id,
            entityType: .goal,
            remote: row,
            note: "Remote goal update while local changes pending."
        )
        let goal = Goal(id: row.id, title: row.title, importance: row.importance ?? 5)
        upsert(&appStore.goals, goal)
    }

    private func removeGoal(id: UUID) {
        appStore.goals.removeAll { $0.id == id }
    }

    private func upsertProject(from row: SupabaseProjectRow) {
        recordConflictIfNeeded(
            entityId: row.id,
            entityType: .project,
            remote: row,
            note: "Remote project update while local changes pending."
        )
        let project = Project(id: row.id, title: row.title, status: row.status ?? "active")
        upsert(&appStore.projects, project)
    }

    private func removeProject(id: UUID) {
        appStore.projects.removeAll { $0.id == id }
    }

    private func upsertHabitDefinition(from row: SupabaseHabitRow) {
        recordConflictIfNeeded(
            entityId: row.id,
            entityType: .habitDefinition,
            remote: row,
            note: "Remote habit update while local changes pending."
        )
        var habit = HabitDefinition(id: row.id, title: row.title, importance: row.importance ?? 5, difficulty: row.difficulty ?? 5)
        HabitScheduleCodec.apply(schedule: row.schedule, to: &habit)
        HabitScheduleCodec.applyMetadata(row.metadata, to: &habit)
        upsert(&appStore.habits, habit)
    }

    private func removeHabitDefinition(id: UUID) {
        appStore.habits.removeAll { $0.id == id }
    }

    private func upsertHabitInstance(from row: SupabaseHabitInstanceRow) {
        recordConflictIfNeeded(
            entityId: row.id,
            entityType: .habitLog,
            remote: row,
            note: "Remote habit log update while local changes pending."
        )
        let log = HabitLog(id: row.id, habitId: row.habitId, date: SupabaseDate.parse(row.occurredAt) ?? Date())
        upsert(&appStore.habitLogs, log)
    }

    private func removeHabitInstance(id: UUID) {
        appStore.habitLogs.removeAll { $0.id == id }
    }

    private func upsertTrackerDefinition(from row: SupabaseTrackerDefinitionRow) {
        recordConflictIfNeeded(
            entityId: row.id,
            entityType: .trackerDefinition,
            remote: row,
            note: "Remote tracker definition update while local changes pending."
        )
        let tracker = TrackerDefinition(id: row.id, key: row.key, unit: row.unit)
        upsert(&appStore.trackers, tracker)
    }

    private func removeTrackerDefinition(id: UUID) {
        appStore.trackers.removeAll { $0.id == id }
    }

    private func upsertTrackerLog(from row: SupabaseTrackerLogRow) {
        recordConflictIfNeeded(
            entityId: row.id,
            entityType: .trackerLog,
            remote: row,
            note: "Remote tracker log update while local changes pending."
        )
        let log = TrackerLog(
            id: row.id,
            trackerId: row.trackerId,
            value: row.valueNumeric ?? 0,
            createdAt: SupabaseDate.parse(row.occurredAt) ?? Date()
        )
        upsert(&appStore.trackerLogs, log)
    }

    private func removeTrackerLog(id: UUID) {
        appStore.trackerLogs.removeAll { $0.id == id }
    }

    private func upsertEntity(from row: SupabaseEntityRow) {
        recordConflictIfNeeded(
            entityId: row.id,
            entityType: .entity,
            remote: row,
            note: "Remote entity update while local changes pending."
        )
        switch row.type {
        case "tag":
            upsert(&appStore.tags, TagItem(id: row.id, name: row.displayName))
        case "person":
            upsert(&appStore.people, Person(id: row.id, name: row.displayName))
        case "place":
            upsert(&appStore.places, Place(id: row.id, name: row.displayName, category: "Saved"))
        default:
            break
        }
    }

    private func removeEntity(id: UUID) {
        appStore.tags.removeAll { $0.id == id }
        appStore.people.removeAll { $0.id == id }
        appStore.places.removeAll { $0.id == id }
    }

    private func upsertWorkoutSession(from row: SupabaseWorkoutSessionRow) {
        recordConflictIfNeeded(
            entityId: row.id,
            entityType: .workoutSession,
            remote: row,
            note: "Remote workout session update while local changes pending."
        )
        let template = WorkoutTemplate(rawValue: row.template) ?? .cardio
        let session = WorkoutSession(id: row.id, entryId: row.entryId, template: template)
        upsert(&appStore.workoutSessions, session)
    }

    private func upsertWorkoutRow(from row: SupabaseWorkoutRowRow) {
        recordConflictIfNeeded(
            entityId: row.id,
            entityType: .workoutRow,
            remote: row,
            note: "Remote workout row update while local changes pending."
        )
        let workoutRow = WorkoutRow(
            id: row.id,
            sessionId: row.sessionId,
            exercise: row.exercise,
            setIndex: row.setIndex,
            reps: row.reps,
            weight: row.weight,
            weightUnit: row.weightUnit,
            rpe: row.rpe,
            durationSeconds: row.durationSeconds,
            distance: row.distance,
            distanceUnit: row.distanceUnit,
            calories: row.calories,
            notes: row.notes
        )
        upsert(&appStore.workoutRows, workoutRow)
    }

    private func upsertNutritionLog(from row: SupabaseNutritionLogRow) {
        recordConflictIfNeeded(
            entityId: row.id,
            entityType: .nutritionLog,
            remote: row,
            note: "Remote nutrition log update while local changes pending."
        )
        let source = NutritionSource(rawValue: row.source) ?? .estimate
        let log = NutritionLog(
            id: row.id,
            entryId: row.entryId,
            calories: row.calories,
            proteinG: row.proteinG,
            carbsG: row.carbsG,
            fatG: row.fatG,
            confidence: row.confidence,
            source: source,
            showOnCalendar: row.showOnCalendar ?? true
        )
        upsert(&appStore.nutritionLogs, log)
    }

    private func mapTaskStatus(_ status: String?) -> TaskStatus {
        switch status?.lowercased() {
        case "in_progress":
            return .inProgress
        case "done", "completed":
            return .done
        default:
            return .todo
        }
    }

    private func mapStatus(_ status: TaskStatus) -> String {
        switch status {
        case .todo:
            return "open"
        case .inProgress:
            return "in_progress"
        case .done:
            return "done"
        }
    }

    private func replaceLocalTask(localTaskId: UUID, row: SupabaseEntryRow) {
        guard let idx = appStore.tasks.firstIndex(where: { $0.id == localTaskId }) else { return }
        let task = TodoTask(
            id: row.id,
            title: row.title,
            status: mapTaskStatus(row.status),
            dueAt: SupabaseDate.parse(row.dueAt),
            scheduledAt: SupabaseDate.parse(row.scheduledAt),
            estimateMinutes: row.durationMinutes,
            tags: row.tags ?? [],
            people: row.people ?? [],
            contexts: row.contexts ?? [],
            notes: row.bodyMarkdown ?? "",
            recurrenceRule: FrontmatterCodec.recurrenceRule(from: row.frontmatter),
            recurrenceExceptions: FrontmatterCodec.recurrenceExceptions(from: row.frontmatter),
            frontmatter: row.frontmatter
        )
        appStore.tasks[idx] = task
    }

    private func replaceLocalEntry(localEntryId: UUID, row: SupabaseEntryRow) {
        guard let idx = appStore.entries.firstIndex(where: { $0.id == localEntryId }) else { return }
        let facets = (row.facets ?? []).compactMap { EntryFacet(rawValue: $0) }
        let entry = Entry(
            id: row.id,
            title: row.title,
            facets: facets.isEmpty ? [.note] : facets,
            startAt: SupabaseDate.parse(row.startAt),
            endAt: SupabaseDate.parse(row.endAt),
            allDay: FrontmatterCodec.allDay(from: row.frontmatter) ?? false,
            tags: row.tags ?? [],
            contexts: row.contexts ?? [],
            people: row.people ?? [],
            notes: row.bodyMarkdown ?? "",
            recurrenceRule: FrontmatterCodec.recurrenceRule(from: row.frontmatter),
            recurrenceExceptions: FrontmatterCodec.recurrenceExceptions(from: row.frontmatter),
            frontmatter: row.frontmatter
        )
        appStore.entries[idx] = entry

        if entry.facets.contains(.note) {
            if let noteIdx = appStore.notes.firstIndex(where: { $0.id == localEntryId }) {
                var note = appStore.notes[noteIdx]
                note.id = entry.id
                note.title = entry.title
                note.body = entry.notes
                note.createdAt = entry.startAt ?? note.createdAt
                appStore.notes[noteIdx] = note
            } else {
                let note = Note(id: entry.id, title: entry.title, body: entry.notes, createdAt: entry.startAt ?? Date())
                upsert(&appStore.notes, note)
            }
        }
    }

    private func replaceLocalGoal(localId: UUID, row: SupabaseGoalRow) {
        guard let idx = appStore.goals.firstIndex(where: { $0.id == localId }) else { return }
        appStore.goals[idx] = Goal(id: row.id, title: row.title, importance: row.importance ?? 5)
    }

    private func replaceLocalProject(localId: UUID, row: SupabaseProjectRow) {
        guard let idx = appStore.projects.firstIndex(where: { $0.id == localId }) else { return }
        appStore.projects[idx] = Project(id: row.id, title: row.title, status: row.status ?? "active")
    }

    private func replaceLocalHabit(localId: UUID, row: SupabaseHabitRow) {
        guard let idx = appStore.habits.firstIndex(where: { $0.id == localId }) else { return }
        var habit = HabitDefinition(id: row.id, title: row.title, importance: row.importance ?? 5, difficulty: row.difficulty ?? 5)
        HabitScheduleCodec.apply(schedule: row.schedule, to: &habit)
        HabitScheduleCodec.applyMetadata(row.metadata, to: &habit)
        appStore.habits[idx] = habit
    }

    private func replaceLocalTracker(localId: UUID, row: SupabaseTrackerDefinitionRow) {
        guard let idx = appStore.trackers.firstIndex(where: { $0.id == localId }) else { return }
        appStore.trackers[idx] = TrackerDefinition(id: row.id, key: row.key, unit: row.unit)
    }

    private func replaceLocalHabitLog(localId: UUID, row: SupabaseHabitInstanceRow) {
        guard let idx = appStore.habitLogs.firstIndex(where: { $0.id == localId }) else { return }
        let date = SupabaseDate.parse(row.occurredAt) ?? Date()
        appStore.habitLogs[idx] = HabitLog(id: row.id, habitId: row.habitId, date: date)
    }

    private func replaceLocalTrackerLog(localId: UUID, row: SupabaseTrackerLogRow) {
        guard let idx = appStore.trackerLogs.firstIndex(where: { $0.id == localId }) else { return }
        let createdAt = SupabaseDate.parse(row.occurredAt) ?? Date()
        let value = row.valueNumeric ?? appStore.trackerLogs[idx].value
        appStore.trackerLogs[idx] = TrackerLog(id: row.id, trackerId: row.trackerId, value: value, createdAt: createdAt)
    }

    private func replaceLocalWorkoutSession(localId: UUID, row: SupabaseWorkoutSessionRow) {
        guard let idx = appStore.workoutSessions.firstIndex(where: { $0.id == localId }) else { return }
        let template = WorkoutTemplate(rawValue: row.template) ?? .cardio
        appStore.workoutSessions[idx] = WorkoutSession(id: row.id, entryId: row.entryId, template: template)
    }

    private func replaceLocalWorkoutRow(localId: UUID, row: SupabaseWorkoutRowRow) {
        guard let idx = appStore.workoutRows.firstIndex(where: { $0.id == localId }) else { return }
        appStore.workoutRows[idx] = WorkoutRow(
            id: row.id,
            sessionId: row.sessionId,
            exercise: row.exercise,
            setIndex: row.setIndex,
            reps: row.reps,
            weight: row.weight,
            weightUnit: row.weightUnit,
            rpe: row.rpe,
            durationSeconds: row.durationSeconds,
            distance: row.distance,
            distanceUnit: row.distanceUnit,
            calories: row.calories,
            notes: row.notes
        )
    }

    private func replaceLocalNutritionLog(localId: UUID, row: SupabaseNutritionLogRow) {
        guard let idx = appStore.nutritionLogs.firstIndex(where: { $0.id == localId }) else { return }
        let source = NutritionSource(rawValue: row.source) ?? .estimate
        appStore.nutritionLogs[idx] = NutritionLog(
            id: row.id,
            entryId: row.entryId,
            calories: row.calories,
            proteinG: row.proteinG,
            carbsG: row.carbsG,
            fatG: row.fatG,
            confidence: row.confidence,
            source: source,
            showOnCalendar: row.showOnCalendar ?? true
        )
    }

    private func removeWorkoutSession(id: UUID) {
        appStore.workoutSessions.removeAll { $0.id == id }
        // Also remove associated rows
        appStore.workoutRows.removeAll { $0.sessionId == id }
    }

    private func removeWorkoutRow(id: UUID) {
        appStore.workoutRows.removeAll { $0.id == id }
    }

    private func removeNutritionLog(id: UUID) {
        appStore.nutritionLogs.removeAll { $0.id == id }
    }

    private func replaceLocalEntity(localId: UUID, row: SupabaseEntityRow) {
        switch row.type {
        case "tag":
            if let idx = appStore.tags.firstIndex(where: { $0.id == localId }) {
                appStore.tags[idx] = TagItem(id: row.id, name: row.displayName)
            }
        case "person":
            if let idx = appStore.people.firstIndex(where: { $0.id == localId }) {
                appStore.people[idx] = Person(id: row.id, name: row.displayName)
            }
        case "place":
            if let idx = appStore.places.firstIndex(where: { $0.id == localId }) {
                appStore.places[idx] = Place(id: row.id, name: row.displayName, category: "Saved")
            }
        default:
            break
        }
    }

    private func upsert<T: Identifiable>(_ list: inout [T], _ item: T) {
        if let idx = list.firstIndex(where: { $0.id == item.id }) {
            list[idx] = item
        } else {
            list.insert(item, at: 0)
        }
    }

    private struct DeletedRow: Decodable {
        let id: UUID
    }

    // MARK: - Saved Views

    /// Fetch all saved views from Supabase (merge: cloud wins for matching IDs)
    public func fetchSavedViews() async throws -> [SavedView] {
        guard let userId = authStore.userId else {
            throw NSError(domain: "SupabaseSyncService", code: 401, userInfo: [NSLocalizedDescriptionKey: "Sign in to fetch saved views."])
        }

        let rows: [SupabaseSavedViewRow] = try await supabase.client
            .from("saved_views")
            .select()
            .eq("user_id", value: userId.uuidString)
            .execute()
            .value

        return rows.compactMap { row -> SavedView? in
            guard let query = parseSavedViewQuery(from: row.query),
                  let options = parseSavedViewOptions(from: row.options),
                  let viewType = ViewType(rawValue: row.viewType) else { return nil }
            return SavedView(
                id: row.id,
                name: row.name,
                viewType: viewType,
                query: query,
                options: options,
                createdAt: SupabaseDate.parse(row.createdAt) ?? Date(),
                updatedAt: SupabaseDate.parse(row.updatedAt) ?? Date()
            )
        }
    }

    /// Create a saved view in Supabase (sync on mutation)
    public func createSavedView(_ view: SavedView) async throws {
        guard let userId = authStore.userId else {
            throw NSError(domain: "SupabaseSyncService", code: 401, userInfo: [NSLocalizedDescriptionKey: "Sign in to create saved views."])
        }

        let queryJSON = try payloadEncoder.encode(view.query)
        let optionsJSON = try payloadEncoder.encode(view.options)
        let insert = SupabaseSavedViewInsert(
            id: view.id,
            userId: userId,
            name: view.name,
            viewType: view.viewType.rawValue,
            query: String(data: queryJSON, encoding: .utf8) ?? "{}",
            options: String(data: optionsJSON, encoding: .utf8) ?? "{}"
        )

        try await supabase.client
            .from("saved_views")
            .insert(insert)
            .execute()
    }

    /// Update a saved view in Supabase (sync on mutation)
    public func updateSavedView(_ view: SavedView) async throws {
        guard authStore.userId != nil else {
            throw NSError(domain: "SupabaseSyncService", code: 401, userInfo: [NSLocalizedDescriptionKey: "Sign in to update saved views."])
        }

        let queryJSON = try payloadEncoder.encode(view.query)
        let optionsJSON = try payloadEncoder.encode(view.options)
        let update = SupabaseSavedViewUpdate(
            name: view.name,
            viewType: view.viewType.rawValue,
            query: String(data: queryJSON, encoding: .utf8),
            options: String(data: optionsJSON, encoding: .utf8),
            updatedAt: SupabaseDate.string(Date())
        )

        try await supabase.client
            .from("saved_views")
            .update(update)
            .eq("id", value: view.id.uuidString)
            .execute()
    }

    /// Delete a saved view from Supabase (sync on mutation)
    public func deleteSavedView(id: UUID) async throws {
        guard authStore.userId != nil else {
            throw NSError(domain: "SupabaseSyncService", code: 401, userInfo: [NSLocalizedDescriptionKey: "Sign in to delete saved views."])
        }

        try await supabase.client
            .from("saved_views")
            .delete()
            .eq("id", value: id.uuidString)
            .execute()
    }

    /// Query the Claude assistant edge function
    public func queryAssistant(prompt: String, context: [LocalSearchService.SearchResult]) async throws -> String {
        guard authStore.userId != nil else {
            throw NSError(domain: "SupabaseSyncService", code: 401, userInfo: [NSLocalizedDescriptionKey: "Sign in to use LLM mode."])
        }

        let contextSnippets = context.prefix(10).map { result -> [String: String] in
            [
                "type": result.resultType,
                "title": result.title,
                "timestamp": ISO8601DateFormatter().string(from: result.timestamp),
                "preview": result.subtitle ?? ""
            ]
        }

        let request = AssistantQueryRequest(prompt: prompt, context: Array(contextSnippets))
        let response: AssistantQueryResponse = try await supabase.client.functions
            .invoke(
                "claude_agent",
                options: .init(body: request)
            )
            .value

        return response.reply
    }

    private func applySavedViewOperation(_ operation: SyncOperation) async -> Bool {
        switch operation.action {
        case .insert:
            guard let payload = decodePayload(SupabaseSavedViewInsert.self, data: operation.payload) else { return false }
            do {
                let row: SupabaseSavedViewRow = try await supabase.client
                    .from("saved_views")
                    .insert(payload)
                    .select()
                    .single()
                    .execute()
                    .value
                if let localId = operation.entityId {
                    replaceLocalSavedView(localId: localId, row: row)
                    persistence?.replaceOperationEntityId(from: localId, to: row.id)
                }
                schedulePersistence()
                return true
            } catch {
                errorMessage = error.localizedDescription
                return false
            }
        case .update:
            guard let payload = decodePayload(SupabaseSavedViewUpdate.self, data: operation.payload),
                  let entityId = operation.entityId else { return false }
            do {
                _ = try await supabase.client
                    .from("saved_views")
                    .update(payload)
                    .eq("id", value: entityId.uuidString)
                    .execute()
                schedulePersistence()
                return true
            } catch {
                errorMessage = error.localizedDescription
                return false
            }
        case .delete:
            guard let entityId = operation.entityId else { return false }
            do {
                _ = try await supabase.client
                    .from("saved_views")
                    .delete()
                    .eq("id", value: entityId.uuidString)
                    .execute()
                removeSavedView(id: entityId)
                schedulePersistence()
                return true
            } catch {
                errorMessage = error.localizedDescription
                return false
            }
        }
    }

    private func upsertSavedView(from row: SupabaseSavedViewRow) {
        guard let query = parseSavedViewQuery(from: row.query),
              let options = parseSavedViewOptions(from: row.options),
              let viewType = ViewType(rawValue: row.viewType) else { return }

        let view = SavedView(
            id: row.id,
            name: row.name,
            viewType: viewType,
            query: query,
            options: options,
            createdAt: SupabaseDate.parse(row.createdAt) ?? Date(),
            updatedAt: SupabaseDate.parse(row.updatedAt) ?? Date()
        )
        upsert(&appStore.savedViews, view)
    }

    private func removeSavedView(id: UUID) {
        appStore.savedViews.removeAll { $0.id == id }
    }

    private func replaceLocalSavedView(localId: UUID, row: SupabaseSavedViewRow) {
        guard let idx = appStore.savedViews.firstIndex(where: { $0.id == localId }),
              let query = parseSavedViewQuery(from: row.query),
              let options = parseSavedViewOptions(from: row.options),
              let viewType = ViewType(rawValue: row.viewType) else { return }

        appStore.savedViews[idx] = SavedView(
            id: row.id,
            name: row.name,
            viewType: viewType,
            query: query,
            options: options,
            createdAt: SupabaseDate.parse(row.createdAt) ?? Date(),
            updatedAt: SupabaseDate.parse(row.updatedAt) ?? Date()
        )
    }

    private func applySavedViews(_ rows: [SupabaseSavedViewRow]) {
        for row in rows {
            upsertSavedView(from: row)
        }
    }

    private func parseSavedViewQuery(from jsonString: String) -> SavedViewQuery? {
        guard let data = jsonString.data(using: .utf8) else { return nil }
        return try? payloadDecoder.decode(SavedViewQuery.self, from: data)
    }

    private func parseSavedViewOptions(from jsonString: String) -> SavedViewOptions? {
        guard let data = jsonString.data(using: .utf8) else { return nil }
        return try? payloadDecoder.decode(SavedViewOptions.self, from: data)
    }

    // MARK: - Device Tokens (Push Notifications)

    /// Register a device token for push notifications
    public func registerDeviceToken(_ tokenData: Data) async throws {
        guard let userId = authStore.userId else {
            throw NSError(domain: "SupabaseSyncService", code: 401, userInfo: [NSLocalizedDescriptionKey: "Sign in to register device token."])
        }

        let tokenString = tokenData.map { String(format: "%02.2hhx", $0) }.joined()

        #if os(iOS)
        let deviceName = await UIDevice.current.name
        #else
        let deviceName: String? = nil
        #endif

        let appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String

        let insert = SupabaseDeviceTokenInsert(
            userId: userId,
            token: tokenString,
            platform: "ios",
            deviceName: deviceName,
            appVersion: appVersion
        )

        // Upsert - insert or update on conflict
        _ = try await supabase.client
            .from("device_tokens")
            .upsert(insert, onConflict: "user_id,token")
            .execute()
    }

    /// Remove a device token (on sign out or token refresh)
    public func removeDeviceToken(_ tokenData: Data) async throws {
        guard authStore.userId != nil else { return }

        let tokenString = tokenData.map { String(format: "%02.2hhx", $0) }.joined()

        _ = try await supabase.client
            .from("device_tokens")
            .delete()
            .eq("token", value: tokenString)
            .execute()
    }

    /// Remove all device tokens for the current user (on sign out)
    public func removeAllDeviceTokens() async throws {
        guard let userId = authStore.userId else { return }

        _ = try await supabase.client
            .from("device_tokens")
            .delete()
            .eq("user_id", value: userId.uuidString)
            .execute()
    }

    /// Send a push notification via edge function
    public func sendPushNotification(
        toUserId userId: UUID,
        title: String,
        body: String,
        category: String? = nil,
        data: [String: String]? = nil
    ) async throws -> SendPushNotificationResponse {
        guard authStore.userId != nil else {
            throw NSError(domain: "SupabaseSyncService", code: 401, userInfo: [NSLocalizedDescriptionKey: "Sign in to send push notifications."])
        }

        let request = SendPushNotificationRequest(
            userId: userId,
            title: title,
            body: body,
            category: category,
            data: data
        )

        let response: SendPushNotificationResponse = try await supabase.client.functions
            .invoke(
                "send_push_notification",
                options: .init(body: request)
            )
            .value

        return response
    }
}
