import BackgroundTasks
import Foundation

// MARK: - Background Sync Scheduler

/// Manages background calendar sync tasks using BGTaskScheduler.
/// Registers and schedules periodic sync operations for connected calendar providers.
public final class BackgroundSyncScheduler: Sendable {
    // MARK: - Singleton

    public static let shared = BackgroundSyncScheduler()

    // MARK: - TodoTask Identifiers

    /// TodoTask identifier for calendar sync (must match Info.plist BGTaskSchedulerPermittedIdentifiers)
    public static let calendarSyncTaskId = "com.insightswift.calendar-sync"

    /// TodoTask identifier for app refresh (lightweight sync check)
    public static let refreshTaskId = "com.insightswift.refresh"

    // MARK: - Configuration

    /// Minimum interval between syncs (15 minutes) - battery friendly
    public static let minimumSyncInterval: TimeInterval = 15 * 60

    /// Default sync window: 1 month back, 1 month forward
    public static let syncWindowMonths: Int = 1

    // MARK: - Private State

    private let syncServiceProvider: @Sendable () async -> ExternalCalendarSyncService?
    private let deviceSyncServiceProvider: @Sendable () async -> CalendarSyncService?

    // MARK: - Init

    private init() {
        // Default providers - in production, these would be injected
        self.syncServiceProvider = {
            // Return nil for default - will be set via configure()
            nil
        }
        self.deviceSyncServiceProvider = {
            nil
        }
    }

    /// Initialize with custom service providers (for testing)
    public init(
        syncServiceProvider: @escaping @Sendable () async -> ExternalCalendarSyncService?,
        deviceSyncServiceProvider: @escaping @Sendable () async -> CalendarSyncService?
    ) {
        self.syncServiceProvider = syncServiceProvider
        self.deviceSyncServiceProvider = deviceSyncServiceProvider
    }

    // MARK: - Registration

    /// Register background tasks with the system.
    /// Call this from `application(_:didFinishLaunchingWithOptions:)` or app init.
    @MainActor
    public func registerTasks() {
        // Register calendar sync processing task
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: Self.calendarSyncTaskId,
            using: nil
        ) { task in
            Task { @MainActor in
                await self.handleCalendarSync(task: task as! BGProcessingTask)
            }
        }

        // Register app refresh task
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: Self.refreshTaskId,
            using: nil
        ) { task in
            Task { @MainActor in
                await self.handleRefresh(task: task as! BGAppRefreshTask)
            }
        }

        debugPrint("[BackgroundSyncScheduler] Registered background tasks")
    }

    // MARK: - Scheduling

    /// Schedule the next calendar sync task.
    /// Call this after a successful sync or when enabling background sync.
    public func scheduleCalendarSync() {
        let request = BGProcessingTaskRequest(identifier: Self.calendarSyncTaskId)
        request.requiresNetworkConnectivity = true
        request.requiresExternalPower = false
        request.earliestBeginDate = Date(timeIntervalSinceNow: Self.minimumSyncInterval)

        do {
            try BGTaskScheduler.shared.submit(request)
            debugPrint("[BackgroundSyncScheduler] Scheduled calendar sync for \(Self.minimumSyncInterval / 60) minutes from now")
        } catch BGTaskScheduler.Error.unavailable {
            debugPrint("[BackgroundSyncScheduler] Background tasks unavailable on this device")
        } catch BGTaskScheduler.Error.tooManyPendingTaskRequests {
            debugPrint("[BackgroundSyncScheduler] Too many pending task requests")
        } catch {
            debugPrint("[BackgroundSyncScheduler] Failed to schedule calendar sync: \(error)")
        }
    }

    /// Schedule the next app refresh task (lightweight).
    /// Call this after a refresh completes.
    public func scheduleAppRefresh() {
        let request = BGAppRefreshTaskRequest(identifier: Self.refreshTaskId)
        request.earliestBeginDate = Date(timeIntervalSinceNow: Self.minimumSyncInterval)

        do {
            try BGTaskScheduler.shared.submit(request)
            debugPrint("[BackgroundSyncScheduler] Scheduled app refresh")
        } catch {
            debugPrint("[BackgroundSyncScheduler] Failed to schedule app refresh: \(error)")
        }
    }

    /// Cancel all pending background tasks.
    public func cancelAllTasks() {
        BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: Self.calendarSyncTaskId)
        BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: Self.refreshTaskId)
        debugPrint("[BackgroundSyncScheduler] Cancelled all background tasks")
    }

    // MARK: - TodoTask Handlers

    @MainActor
    private func handleCalendarSync(task: BGProcessingTask) async {
        debugPrint("[BackgroundSyncScheduler] Starting calendar sync task")

        // Schedule next sync immediately (in case this one fails/expires)
        scheduleCalendarSync()

        // Create cancellation handler
        let syncTask = Task { @MainActor in
            await performFullSync()
        }

        task.expirationHandler = {
            debugPrint("[BackgroundSyncScheduler] Calendar sync task expired")
            syncTask.cancel()
        }

        // Wait for sync to complete
        let success = await syncTask.value
        task.setTaskCompleted(success: success)

        debugPrint("[BackgroundSyncScheduler] Calendar sync task completed: \(success)")
    }

    @MainActor
    private func handleRefresh(task: BGAppRefreshTask) async {
        debugPrint("[BackgroundSyncScheduler] Starting refresh task")

        // Schedule next refresh
        scheduleAppRefresh()

        // Lightweight refresh - just check connection status
        let refreshTask = Task { @MainActor in
            await performLightweightRefresh()
        }

        task.expirationHandler = {
            debugPrint("[BackgroundSyncScheduler] Refresh task expired")
            refreshTask.cancel()
        }

        let success = await refreshTask.value
        task.setTaskCompleted(success: success)

        debugPrint("[BackgroundSyncScheduler] Refresh task completed: \(success)")
    }

    // MARK: - Sync Operations

    @MainActor
    private func performFullSync() async -> Bool {
        guard let syncService = await syncServiceProvider() else {
            debugPrint("[BackgroundSyncScheduler] No sync service available")
            return false
        }

        let now = Date()
        let calendar = Calendar.current
        guard let monthAgo = calendar.date(byAdding: .month, value: -Self.syncWindowMonths, to: now),
              let monthAhead = calendar.date(byAdding: .month, value: Self.syncWindowMonths, to: now) else {
            return false
        }

        var anySuccess = false

        // Sync Google Calendar if connected
        if syncService.googleConnected {
            do {
                let stats = try await syncService.syncGoogle(scopeStart: monthAgo, scopeEnd: monthAhead)
                debugPrint("[BackgroundSyncScheduler] Google sync: pulled=\(stats.pulled), pushed=\(stats.pushed)")
                anySuccess = true
            } catch CalendarSyncError.conflictDetected(let count) {
                debugPrint("[BackgroundSyncScheduler] Google sync: \(count) conflicts")
                anySuccess = true // Conflicts are not failures
            } catch {
                debugPrint("[BackgroundSyncScheduler] Google sync failed: \(error)")
            }
        }

        // Sync Microsoft Calendar if connected
        if syncService.microsoftConnected {
            do {
                let stats = try await syncService.syncMicrosoft(scopeStart: monthAgo, scopeEnd: monthAhead)
                debugPrint("[BackgroundSyncScheduler] Microsoft sync: pulled=\(stats.pulled), pushed=\(stats.pushed)")
                anySuccess = true
            } catch CalendarSyncError.conflictDetected(let count) {
                debugPrint("[BackgroundSyncScheduler] Microsoft sync: \(count) conflicts")
                anySuccess = true
            } catch {
                debugPrint("[BackgroundSyncScheduler] Microsoft sync failed: \(error)")
            }
        }

        // Sync device calendar if available
        if let deviceService = await deviceSyncServiceProvider(), deviceService.isAuthorized {
            do {
                let stats = try await deviceService.syncDeviceCalendar(from: monthAgo, to: monthAhead)
                debugPrint("[BackgroundSyncScheduler] Device sync: pulled=\(stats.pulled), pushed=\(stats.pushed)")
                anySuccess = true
            } catch {
                debugPrint("[BackgroundSyncScheduler] Device sync failed: \(error)")
            }
        }

        return anySuccess
    }

    @MainActor
    private func performLightweightRefresh() async -> Bool {
        guard let syncService = await syncServiceProvider() else {
            return false
        }

        // Just check connected accounts status
        await syncService.checkConnectedAccounts()

        debugPrint("[BackgroundSyncScheduler] Lightweight refresh: Google=\(syncService.googleConnected), Microsoft=\(syncService.microsoftConnected)")

        return true
    }
}

// MARK: - App Lifecycle Integration

extension BackgroundSyncScheduler {
    /// Enable background sync by registering and scheduling tasks.
    /// Call this when user enables sync in settings.
    @MainActor
    public func enableBackgroundSync() {
        scheduleCalendarSync()
        scheduleAppRefresh()
        debugPrint("[BackgroundSyncScheduler] Background sync enabled")
    }

    /// Disable background sync by cancelling all tasks.
    /// Call this when user disables sync in settings.
    public func disableBackgroundSync() {
        cancelAllTasks()
        debugPrint("[BackgroundSyncScheduler] Background sync disabled")
    }

    /// Handle app moving to background.
    /// Call this from `sceneDidEnterBackground`.
    public func applicationDidEnterBackground() {
        // Ensure sync is scheduled when app backgrounds
        scheduleCalendarSync()
        scheduleAppRefresh()
    }

    /// Handle app becoming active.
    /// Call this from `sceneDidBecomeActive` to trigger a foreground sync.
    @MainActor
    public func applicationDidBecomeActive() async {
        // Perform a quick sync when app becomes active
        _ = await performFullSync()
    }
}

// MARK: - Debug Helpers

#if DEBUG
extension BackgroundSyncScheduler {
    /// Simulate a background sync task (for testing).
    @MainActor
    public func simulateBackgroundSync() async -> Bool {
        debugPrint("[BackgroundSyncScheduler] Simulating background sync")
        return await performFullSync()
    }

    /// Get pending task requests (for debugging).
    public func getPendingTaskRequests() async -> [BGTaskRequest] {
        await withCheckedContinuation { continuation in
            BGTaskScheduler.shared.getPendingTaskRequests { requests in
                continuation.resume(returning: requests)
            }
        }
    }
}
#endif
