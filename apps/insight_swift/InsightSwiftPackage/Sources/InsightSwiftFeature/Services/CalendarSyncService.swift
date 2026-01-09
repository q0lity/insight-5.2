import EventKit
import Foundation
import Observation

public enum CalendarAuthorizationStatus: String {
    case notDetermined
    case denied
    case restricted
    case fullAccess
    case writeOnly
}

extension CalendarAuthorizationStatus {
    var label: String {
        switch self {
        case .notDetermined:
            return "Not requested"
        case .denied:
            return "Denied"
        case .restricted:
            return "Restricted"
        case .fullAccess:
            return "Full access"
        case .writeOnly:
            return "Write only"
        }
    }

    var isAuthorized: Bool {
        switch self {
        case .fullAccess, .writeOnly:
            return true
        case .notDetermined, .denied, .restricted:
            return false
        }
    }
}

@MainActor
@Observable
public final class CalendarSyncService {
    public var isEnabled: Bool {
        didSet {
            defaults.set(isEnabled, forKey: Self.enabledKey)
            handleEnabledChange()
        }
    }
    public private(set) var authorizationStatus: CalendarAuthorizationStatus = .notDetermined
    public private(set) var lastError: String?
    public private(set) var lastSyncAt: Date?
    public private(set) var isSyncing: Bool = false
    public private(set) var lastSyncStats: CalendarSyncStats?
    public private(set) var conflicts: [CalendarConflict] = []

    private let eventStore: EKEventStore
    private let defaults: UserDefaults
    private weak var externalSyncService: ExternalCalendarSyncService?
    private weak var appStore: AppStore?

    private static let enabledKey = "integration.calendar.enabled"

    public init(
        eventStore: EKEventStore = EKEventStore(),
        defaults: UserDefaults = .standard,
        externalSyncService: ExternalCalendarSyncService? = nil,
        appStore: AppStore? = nil
    ) {
        self.eventStore = eventStore
        self.defaults = defaults
        self.externalSyncService = externalSyncService
        self.appStore = appStore
        self.isEnabled = defaults.object(forKey: Self.enabledKey) as? Bool ?? false
        refreshAuthorizationStatus()
        seedConflictsForUITestingIfNeeded()
    }

    private func seedConflictsForUITestingIfNeeded() {
        guard ProcessInfo.processInfo.arguments.contains("ui-test-conflicts") else { return }
        let now = Date()
        conflicts = [
            CalendarConflict(
                entryId: UUID(),
                provider: .device,
                localUpdatedAt: now,
                remoteUpdatedAt: now.addingTimeInterval(-30),
                note: "UI test conflict"
            )
        ]
    }

    /// Configure dependencies after initialization.
    public func configure(externalSyncService: ExternalCalendarSyncService, appStore: AppStore) {
        self.externalSyncService = externalSyncService
        self.appStore = appStore
    }

    public func refreshAuthorizationStatus() {
        let status = EKEventStore.authorizationStatus(for: .event)
        switch status {
        case .notDetermined:
            authorizationStatus = .notDetermined
        case .denied:
            authorizationStatus = .denied
        case .restricted:
            authorizationStatus = .restricted
        case .authorized:
            authorizationStatus = .fullAccess
        case .fullAccess:
            authorizationStatus = .fullAccess
        case .writeOnly:
            authorizationStatus = .writeOnly
        @unknown default:
            authorizationStatus = .notDetermined
        }
    }

    public func requestAccessIfNeeded() async {
        refreshAuthorizationStatus()
        lastError = nil

        switch authorizationStatus {
        case .notDetermined:
            let result = await requestFullAccess()
            if let error = result.error {
                lastError = error.localizedDescription
            } else if !result.granted {
                lastError = "Calendar access not granted."
            }
            refreshAuthorizationStatus()
        case .denied, .restricted:
            lastError = "Enable Calendar access in Settings to sync events."
        case .fullAccess, .writeOnly:
            break
        }
    }

    private func handleEnabledChange() {
        lastError = nil
        guard isEnabled else { return }
        Task { [weak self] in
            await self?.requestAccessIfNeeded()
        }
    }

    private func requestFullAccess() async -> (granted: Bool, error: Error?) {
        await withCheckedContinuation { continuation in
            eventStore.requestFullAccessToEvents { granted, error in
                continuation.resume(returning: (granted, error))
            }
        }
    }

    // MARK: - Device Calendar Sync

    /// Fetch all device calendar events within a date range.
    public func fetchDeviceEvents(from: Date, to: Date) throws -> [EKEvent] {
        guard authorizationStatus.isAuthorized else {
            throw CalendarSyncError.notAuthorized
        }

        let calendars = eventStore.calendars(for: .event)
        let predicate = eventStore.predicateForEvents(
            withStart: from,
            end: to,
            calendars: calendars
        )

        return eventStore.events(matching: predicate)
    }

    /// Create a new device calendar event from an Entry.
    /// Returns the event identifier for linking.
    public func createDeviceEvent(from entry: Entry, frontmatter: EventFrontmatter? = nil) throws -> String {
        guard authorizationStatus.isAuthorized else {
            throw CalendarSyncError.notAuthorized
        }

        let fm = frontmatter ?? EventFrontmatter.from(entry.frontmatter)
        let event = EventKitMapper.entryToEKEvent(entry, frontmatter: fm, in: eventStore)

        try eventStore.save(event, span: .thisEvent)

        guard let eventId = event.eventIdentifier else {
            throw CalendarSyncError.syncFailed("Failed to get event identifier after save")
        }

        return eventId
    }

    /// Update an existing device calendar event.
    public func updateDeviceEvent(eventIdentifier: String, from entry: Entry, frontmatter: EventFrontmatter? = nil) throws {
        guard authorizationStatus.isAuthorized else {
            throw CalendarSyncError.notAuthorized
        }

        guard let event = eventStore.event(withIdentifier: eventIdentifier) else {
            throw CalendarSyncError.syncFailed("Event not found: \(eventIdentifier)")
        }

        let fm = frontmatter ?? EventFrontmatter.from(entry.frontmatter)
        EventKitMapper.updateEKEvent(event, from: entry, frontmatter: fm)

        try eventStore.save(event, span: .thisEvent)
    }

    /// Delete a device calendar event.
    public func deleteDeviceEvent(eventIdentifier: String) throws {
        guard authorizationStatus.isAuthorized else {
            throw CalendarSyncError.notAuthorized
        }

        guard let event = eventStore.event(withIdentifier: eventIdentifier) else {
            // Already deleted, consider success
            return
        }

        try eventStore.remove(event, span: .thisEvent)
    }

    /// Full sync cycle for device calendar.
    /// Imports ALL device events (marks as source="calendar"), pushes local events.
    /// Uses 60-second conflict window for detection.
    public func syncDeviceCalendar(from: Date, to: Date) async throws -> CalendarSyncStats {
        guard authorizationStatus.isAuthorized else {
            throw CalendarSyncError.notAuthorized
        }

        guard let externalSyncService, let appStore else {
            throw CalendarSyncError.syncFailed("CalendarSyncService not configured with dependencies")
        }

        isSyncing = true
        lastError = nil
        defer { isSyncing = false }

        var pulled = 0
        var pushed = 0
        var conflictCount = 0

        do {
            // 1. Fetch existing links for provider = "device"
            let existingLinks = try await externalSyncService.fetchEventLinks(provider: .device)
            let linkByExternalId = Dictionary(uniqueKeysWithValues: existingLinks.map { ($0.externalEventId, $0) })
            let linkByEntryId = Dictionary(uniqueKeysWithValues: existingLinks.map { ($0.entryId, $0) })

            // 2. Fetch ALL device events from EventKit (import everything)
            let deviceEvents = try fetchDeviceEvents(from: from, to: to)

            // 3. Fetch local entries with event facet
            let localEntries = appStore.entries.filter {
                $0.facets.contains(.event) &&
                $0.startAt != nil &&
                $0.startAt! >= from &&
                $0.startAt! <= to
            }
            let entryById = Dictionary(uniqueKeysWithValues: localEntries.map { ($0.id, $0) })

            // 4. Process each device event
            for event in deviceEvents {
                guard let eventId = event.eventIdentifier else { continue }

                if let link = linkByExternalId[eventId] {
                    // Linked: compare timestamps for conflict detection
                    guard let entry = entryById[link.entryId] else { continue }

                    let localUpdated = entry.frontmatter?["updatedAt"]?.stringValue.flatMap { SupabaseDate.parse($0) }
                        ?? entry.startAt
                        ?? Date.distantPast
                    let remoteUpdated = event.lastModifiedDate ?? Date.distantPast

                    // 60-second conflict window (matches edge function logic)
                    if EventKitMapper.isConflictWindow(localUpdated: localUpdated, remoteUpdated: remoteUpdated) {
                        conflictCount += 1
                        logConflict(
                            entryId: entry.id,
                            provider: .device,
                            localUpdated: localUpdated,
                            remoteUpdated: remoteUpdated
                        )
                    }

                    // Last-write-wins
                    if remoteUpdated > localUpdated {
                        // Pull: update local entry from device event
                        var mutableEntry = entry
                        _ = EventKitMapper.updateEntry(&mutableEntry, from: event)
                        updateLocalEntry(mutableEntry)
                        try await externalSyncService.updateEventLinkSyncTime(linkId: link.id)
                        pulled += 1
                    } else if localUpdated > remoteUpdated && EventKitMapper.hasChanges(local: entry, remote: event) {
                        // Push: update device event from local entry
                        let fm = EventFrontmatter.from(entry.frontmatter)
                        try updateDeviceEvent(eventIdentifier: eventId, from: entry, frontmatter: fm)
                        try await externalSyncService.updateEventLinkSyncTime(linkId: link.id)
                        pushed += 1
                    }
                } else {
                    // Not linked: import device event as new entry
                    let (newEntry, frontmatter) = EventKitMapper.ekEventToEntry(event)
                    addImportedEntry(newEntry, source: "calendar")
                    try await externalSyncService.createEventLink(
                        entryId: newEntry.id,
                        provider: .device,
                        externalEventId: eventId,
                        externalCalendarId: event.calendar?.calendarIdentifier
                    )
                    pulled += 1
                }
            }

            // 5. Push local events without links to device
            for entry in localEntries where linkByEntryId[entry.id] == nil {
                // Skip if source is "calendar" (came from external, don't re-push)
                if let source = entry.frontmatter?["source"]?.stringValue, source == "calendar" {
                    continue
                }

                let fm = EventFrontmatter.from(entry.frontmatter)
                let eventId = try createDeviceEvent(from: entry, frontmatter: fm)
                try await externalSyncService.createEventLink(
                    entryId: entry.id,
                    provider: .device,
                    externalEventId: eventId,
                    externalCalendarId: eventStore.defaultCalendarForNewEvents?.calendarIdentifier
                )
                pushed += 1
            }

            let stats = CalendarSyncStats(
                pulled: pulled,
                pushed: pushed,
                conflicts: conflictCount,
                syncedAt: Date()
            )
            lastSyncStats = stats
            lastSyncAt = stats.syncedAt

            if conflictCount > 0 {
                throw CalendarSyncError.conflictDetected(conflictCount)
            }

            return stats

        } catch let error as CalendarSyncError {
            lastError = error.localizedDescription
            throw error
        } catch {
            let syncError = CalendarSyncError.syncFailed(error.localizedDescription)
            lastError = syncError.localizedDescription
            throw syncError
        }
    }

    /// Clear detected conflicts.
    public func clearConflicts() {
        conflicts = []
    }

    // MARK: - Private Helpers

    private func logConflict(entryId: UUID, provider: CalendarProvider, localUpdated: Date, remoteUpdated: Date) {
        let conflict = CalendarConflict(
            id: UUID(),
            entryId: entryId,
            provider: provider,
            localUpdatedAt: localUpdated,
            remoteUpdatedAt: remoteUpdated,
            note: "Concurrent edits within 60 seconds",
            createdAt: Date()
        )
        conflicts.append(conflict)
    }

    private func updateLocalEntry(_ entry: Entry) {
        guard let appStore else { return }
        if let idx = appStore.entries.firstIndex(where: { $0.id == entry.id }) {
            appStore.entries[idx] = entry
        }
    }

    private func addImportedEntry(_ entry: Entry, source: String) {
        guard let appStore else { return }

        // Add source to frontmatter
        var mutableEntry = entry
        var frontmatter = mutableEntry.frontmatter ?? [:]
        frontmatter["source"] = .string(source)
        mutableEntry.frontmatter = frontmatter

        appStore.entries.insert(mutableEntry, at: 0)
    }
}
