import Foundation
import Observation
import Supabase

/// Service to manage Google/Microsoft calendar sync via Supabase edge functions.
/// OAuth tokens are stored server-side — the app never handles tokens directly.
@MainActor
@Observable
public final class ExternalCalendarSyncService {
    // MARK: - Public State

    public private(set) var googleConnected: Bool = false
    public private(set) var microsoftConnected: Bool = false
    public private(set) var isSyncing: Bool = false
    public private(set) var lastSyncAt: Date?
    public private(set) var lastError: String?
    public private(set) var lastSyncStats: CalendarSyncStats?
    public private(set) var connectedAccounts: [ConnectedCalendarAccount] = []

    // Phase 2: Calendar selection state
    public private(set) var googleCalendars: [CalendarSelection] = []
    public private(set) var microsoftCalendars: [CalendarSelection] = []

    // Phase 2: Computed email properties
    public var googleEmail: String? {
        connectedAccounts.first(where: { $0.provider == .google })?.email
    }
    public var microsoftEmail: String? {
        connectedAccounts.first(where: { $0.provider == .microsoft })?.email
    }

    // Phase 2: Conflict tracking
    public private(set) var unresolvedConflicts: [CalendarConflict] = []

    // Phase 2: Background sync enabled state
    public private(set) var backgroundSyncEnabled: Bool = false

    // MARK: - Dependencies

    private let supabase: SupabaseService
    private let authStore: SupabaseAuthStore

    // MARK: - Init

    public init(supabase: SupabaseService, authStore: SupabaseAuthStore) {
        self.supabase = supabase
        self.authStore = authStore
    }

    // MARK: - Public Methods

    /// Check which external calendar accounts are connected for the current user.
    public func checkConnectedAccounts() async {
        guard let userId = authStore.userId else {
            googleConnected = false
            microsoftConnected = false
            connectedAccounts = []
            return
        }

        do {
            let rows: [SupabaseExternalAccountRow] = try await supabase.client
                .from("external_accounts")
                .select()
                .eq("user_id", value: userId.uuidString)
                .execute()
                .value

            connectedAccounts = rows.map { ConnectedCalendarAccount(from: $0) }
            googleConnected = rows.contains { $0.provider == "google" }
            microsoftConnected = rows.contains { $0.provider == "microsoft" }
            lastError = nil
        } catch {
            lastError = error.localizedDescription
            googleConnected = false
            microsoftConnected = false
            connectedAccounts = []
        }
    }

    /// Sync Google Calendar events via the `google_calendar_sync` edge function.
    /// The edge function handles token refresh, event pull/push, and conflict detection.
    ///
    /// - Parameters:
    ///   - calendarId: Google Calendar ID (default: "primary")
    ///   - scopeStart: Start of the sync window
    ///   - scopeEnd: End of the sync window
    /// - Returns: Sync statistics from the edge function
    public func syncGoogle(
        calendarId: String = "primary",
        scopeStart: Date,
        scopeEnd: Date
    ) async throws -> CalendarSyncStats {
        guard googleConnected else {
            throw CalendarSyncError.providerNotConnected(.google)
        }

        isSyncing = true
        lastError = nil
        defer { isSyncing = false }

        let request = GoogleCalendarSyncRequest(
            calendarId: calendarId,
            scopeStartMs: Int(scopeStart.timeIntervalSince1970 * 1000),
            scopeEndMs: Int(scopeEnd.timeIntervalSince1970 * 1000)
        )

        do {
            let response: CalendarSyncResponse = try await supabase.client.functions
                .invoke(
                    "google_calendar_sync",
                    options: FunctionInvokeOptions(body: request)
                )

            let stats = CalendarSyncStats(from: response)
            lastSyncStats = stats
            lastSyncAt = stats.syncedAt

            if response.conflicts > 0 {
                throw CalendarSyncError.conflictDetected(response.conflicts)
            }

            return stats
        } catch let error as CalendarSyncError {
            lastError = error.localizedDescription
            throw error
        } catch {
            let syncError = mapEdgeFunctionError(error)
            lastError = syncError.localizedDescription
            throw syncError
        }
    }

    /// Sync Microsoft Calendar events via the `microsoft_calendar_sync` edge function.
    /// The edge function handles token refresh, event pull/push, and conflict detection.
    ///
    /// - Parameters:
    ///   - scopeStart: Start of the sync window
    ///   - scopeEnd: End of the sync window
    /// - Returns: Sync statistics from the edge function
    public func syncMicrosoft(
        scopeStart: Date,
        scopeEnd: Date
    ) async throws -> CalendarSyncStats {
        guard microsoftConnected else {
            throw CalendarSyncError.providerNotConnected(.microsoft)
        }

        isSyncing = true
        lastError = nil
        defer { isSyncing = false }

        let request = MicrosoftCalendarSyncRequest(
            scopeStartMs: Int(scopeStart.timeIntervalSince1970 * 1000),
            scopeEndMs: Int(scopeEnd.timeIntervalSince1970 * 1000)
        )

        do {
            let response: CalendarSyncResponse = try await supabase.client.functions
                .invoke(
                    "microsoft_calendar_sync",
                    options: FunctionInvokeOptions(body: request)
                )

            let stats = CalendarSyncStats(from: response)
            lastSyncStats = stats
            lastSyncAt = stats.syncedAt

            if response.conflicts > 0 {
                throw CalendarSyncError.conflictDetected(response.conflicts)
            }

            return stats
        } catch let error as CalendarSyncError {
            lastError = error.localizedDescription
            throw error
        } catch {
            let syncError = mapEdgeFunctionError(error)
            lastError = syncError.localizedDescription
            throw syncError
        }
    }

    /// Sync all connected external calendars within the given date range.
    /// Runs Google and Microsoft sync in sequence (not parallel to avoid rate limits).
    ///
    /// - Parameters:
    ///   - scopeStart: Start of the sync window
    ///   - scopeEnd: End of the sync window
    /// - Returns: Combined sync statistics
    public func syncAll(scopeStart: Date, scopeEnd: Date) async throws -> CalendarSyncStats {
        var totalPulled = 0
        var totalPushed = 0
        var totalConflicts = 0

        if googleConnected {
            do {
                let stats = try await syncGoogle(scopeStart: scopeStart, scopeEnd: scopeEnd)
                totalPulled += stats.pulled
                totalPushed += stats.pushed
                totalConflicts += stats.conflicts
            } catch CalendarSyncError.conflictDetected(let count) {
                totalConflicts += count
            }
        }

        if microsoftConnected {
            do {
                let stats = try await syncMicrosoft(scopeStart: scopeStart, scopeEnd: scopeEnd)
                totalPulled += stats.pulled
                totalPushed += stats.pushed
                totalConflicts += stats.conflicts
            } catch CalendarSyncError.conflictDetected(let count) {
                totalConflicts += count
            }
        }

        let combinedStats = CalendarSyncStats(
            pulled: totalPulled,
            pushed: totalPushed,
            conflicts: totalConflicts,
            syncedAt: Date()
        )
        lastSyncStats = combinedStats
        lastSyncAt = combinedStats.syncedAt

        if totalConflicts > 0 {
            throw CalendarSyncError.conflictDetected(totalConflicts)
        }

        return combinedStats
    }

    /// Exchange an OAuth authorization code for tokens via edge function.
    /// Tokens are stored server-side in `external_accounts`.
    ///
    /// - Parameters:
    ///   - provider: The calendar provider (google or microsoft)
    ///   - code: The OAuth authorization code
    ///   - redirectUri: The redirect URI used in the OAuth flow
    public func connectAccount(
        provider: CalendarProvider,
        code: String,
        redirectUri: String?
    ) async throws {
        guard provider == .google || provider == .microsoft else {
            throw CalendarSyncError.syncFailed("Invalid provider for OAuth: \(provider.rawValue)")
        }

        let functionName = provider == .google ? "google_oauth_exchange" : "microsoft_oauth_exchange"

        let request = OAuthExchangeRequest(code: code, redirectUri: redirectUri)

        do {
            let _: OAuthExchangeResponse = try await supabase.client.functions
                .invoke(
                    functionName,
                    options: FunctionInvokeOptions(body: request)
                )

            // Refresh the connected accounts list
            await checkConnectedAccounts()
        } catch {
            throw CalendarSyncError.syncFailed("OAuth exchange failed: \(error.localizedDescription)")
        }
    }

    /// Disconnect a calendar provider by removing the external account record.
    public func disconnectGoogle() async throws {
        try await disconnectProvider(.google)
    }

    /// Disconnect Microsoft calendar by removing the external account record.
    public func disconnectMicrosoft() async throws {
        try await disconnectProvider(.microsoft)
    }

    /// Fetch all external event links for a given provider.
    /// Used for device calendar sync to track which entries are linked.
    public func fetchEventLinks(provider: CalendarProvider) async throws -> [ExternalEventLink] {
        guard let userId = authStore.userId else {
            return []
        }

        let rows: [SupabaseExternalEventLinkRow] = try await supabase.client
            .from("external_event_links")
            .select()
            .eq("user_id", value: userId.uuidString)
            .eq("provider", value: provider.rawValue)
            .execute()
            .value

        return rows.map { ExternalEventLink(from: $0) }
    }

    /// Create an external event link (used by device calendar sync).
    public func createEventLink(
        entryId: UUID,
        provider: CalendarProvider,
        externalEventId: String,
        externalCalendarId: String? = nil,
        etag: String? = nil
    ) async throws {
        guard let userId = authStore.userId else {
            throw CalendarSyncError.notAuthorized
        }

        let insert = SupabaseExternalEventLinkInsert(
            userId: userId,
            entryId: entryId,
            provider: provider.rawValue,
            externalEventId: externalEventId,
            externalCalendarId: externalCalendarId,
            etag: etag,
            lastSyncedAt: SupabaseDate.string(Date())
        )

        try await supabase.client
            .from("external_event_links")
            .insert(insert)
            .execute()
    }

    /// Update an external event link's last synced timestamp.
    public func updateEventLinkSyncTime(linkId: UUID) async throws {
        try await supabase.client
            .from("external_event_links")
            .update(["last_synced_at": SupabaseDate.string(Date())])
            .eq("id", value: linkId.uuidString)
            .execute()
    }

    /// Delete an external event link.
    public func deleteEventLink(linkId: UUID) async throws {
        try await supabase.client
            .from("external_event_links")
            .delete()
            .eq("id", value: linkId.uuidString)
            .execute()
    }

    // MARK: - Phase 2: Calendar Selection

    /// Fetch available calendars from a connected provider.
    /// For Google/Microsoft, this would call an edge function to list calendars.
    /// Currently returns default calendars - can be extended with actual API calls.
    public func fetchCalendars(provider: CalendarProvider) async throws -> [CalendarSelection] {
        switch provider {
        case .google:
            guard googleConnected else {
                throw CalendarSyncError.providerNotConnected(.google)
            }
            // TODO: Call edge function to list Google calendars
            // For now, return primary calendar
            return [
                CalendarSelection(
                    id: "primary",
                    title: "Primary Calendar",
                    provider: .google,
                    colorHex: "#DB4437",
                    isEnabled: true
                )
            ]

        case .microsoft:
            guard microsoftConnected else {
                throw CalendarSyncError.providerNotConnected(.microsoft)
            }
            // TODO: Call edge function to list Microsoft calendars
            // For now, return default calendar
            return [
                CalendarSelection(
                    id: "default",
                    title: "Default Calendar",
                    provider: .microsoft,
                    colorHex: "#0078D4",
                    isEnabled: true
                )
            ]

        case .device, .apple:
            // Device calendars are handled by CalendarSyncService (EventKit)
            return []
        }
    }

    /// Update which calendars are enabled for sync.
    /// Stores selection locally and updates the service state.
    public func updateCalendarSelection(_ selection: [CalendarSelection]) {
        let googleCals = selection.filter { $0.provider == .google }
        let microsoftCals = selection.filter { $0.provider == .microsoft }

        googleCalendars = googleCals
        microsoftCalendars = microsoftCals

        // Persist to UserDefaults
        saveCalendarSelection(selection)
    }

    /// Load saved calendar selection from UserDefaults.
    public func loadCalendarSelection() -> [CalendarSelection] {
        guard let data = UserDefaults.standard.data(forKey: calendarSelectionKey),
              let selection = try? JSONDecoder().decode([CalendarSelection].self, from: data) else {
            return []
        }
        return selection
    }

    private func saveCalendarSelection(_ selection: [CalendarSelection]) {
        if let data = try? JSONEncoder().encode(selection) {
            UserDefaults.standard.set(data, forKey: calendarSelectionKey)
        }
    }

    private let calendarSelectionKey = "ExternalCalendarSelection"

    // MARK: - Phase 2: Background Sync

    /// Enable background sync by registering and scheduling background tasks.
    public func enableBackgroundSync() {
        backgroundSyncEnabled = true
        BackgroundSyncScheduler.shared.enableBackgroundSync()
        UserDefaults.standard.set(true, forKey: backgroundSyncEnabledKey)
    }

    /// Disable background sync by cancelling all scheduled tasks.
    public func disableBackgroundSync() {
        backgroundSyncEnabled = false
        BackgroundSyncScheduler.shared.disableBackgroundSync()
        UserDefaults.standard.set(false, forKey: backgroundSyncEnabledKey)
    }

    /// Check if background sync is enabled (load from UserDefaults).
    public func loadBackgroundSyncEnabled() {
        backgroundSyncEnabled = UserDefaults.standard.bool(forKey: backgroundSyncEnabledKey)
    }

    private let backgroundSyncEnabledKey = "BackgroundSyncEnabled"

    // MARK: - Phase 2: Conflict Management

    /// Log a detected conflict for later resolution.
    public func logConflict(_ conflict: CalendarConflict) {
        if !unresolvedConflicts.contains(where: { $0.entryId == conflict.entryId }) {
            unresolvedConflicts.append(conflict)
        }
    }

    /// Resolve a conflict by applying the chosen resolution.
    /// - Parameters:
    ///   - conflictId: The entry ID of the conflict to resolve
    ///   - resolution: The resolution strategy to apply
    ///   - localEntry: The local app version of the entry
    ///   - remoteEntry: The remote provider version
    /// - Returns: The resolved entry
    public func resolveConflict(
        conflictId: UUID,
        resolution: ConflictResolution,
        localEntry: Entry,
        remoteEntry: Entry
    ) -> Entry {
        // Apply the resolution
        let resolved = ConflictResolver.apply(
            resolution: resolution,
            local: localEntry,
            remote: remoteEntry
        )

        // Remove from unresolved list
        unresolvedConflicts.removeAll { $0.entryId == conflictId }

        return resolved
    }

    /// Clear all unresolved conflicts (e.g., after bulk resolution).
    public func clearConflicts() {
        unresolvedConflicts.removeAll()
    }

    /// Get the count of unresolved conflicts.
    public var conflictCount: Int {
        unresolvedConflicts.count
    }

    // MARK: - Private Helpers

    private func disconnectProvider(_ provider: CalendarProvider) async throws {
        guard let userId = authStore.userId else {
            throw CalendarSyncError.notAuthorized
        }

        do {
            try await supabase.client
                .from("external_accounts")
                .delete()
                .eq("user_id", value: userId.uuidString)
                .eq("provider", value: provider.rawValue)
                .execute()

            // Also delete associated event links
            try await supabase.client
                .from("external_event_links")
                .delete()
                .eq("user_id", value: userId.uuidString)
                .eq("provider", value: provider.rawValue)
                .execute()

            // Refresh connected accounts
            await checkConnectedAccounts()
        } catch {
            throw CalendarSyncError.syncFailed("Failed to disconnect \(provider.rawValue): \(error.localizedDescription)")
        }
    }

    private func mapEdgeFunctionError(_ error: Error) -> CalendarSyncError {
        let message = error.localizedDescription.lowercased()

        if message.contains("unauthorized") || message.contains("401") {
            return .notAuthorized
        }
        if message.contains("token") && (message.contains("expired") || message.contains("invalid")) {
            return .tokenExpired
        }
        if message.contains("not connected") || message.contains("400") {
            return .providerNotConnected(.google) // Default, will be overridden by caller context
        }
        if message.contains("network") || message.contains("timeout") || message.contains("fetch") {
            return .networkError(message)
        }

        return .syncFailed(error.localizedDescription)
    }
}

// MARK: - OAuth Exchange Response

/// Response from OAuth exchange edge functions
private struct OAuthExchangeResponse: Codable {
    let status: String
    let provider: String
    let expiresAt: String?
}
