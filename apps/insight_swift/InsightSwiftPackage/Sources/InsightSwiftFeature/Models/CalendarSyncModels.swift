import Foundation

// MARK: - Calendar Provider

/// Provider types for calendar sync (matches Supabase schema)
public enum CalendarProvider: String, Codable, CaseIterable, Sendable {
    case google
    case microsoft
    case device  // EventKit / iOS Calendar
    case apple   // Alias for device
}

// MARK: - Sync Stats

/// Statistics from a calendar sync operation
public struct CalendarSyncStats: Sendable {
    public let pulled: Int
    public let pushed: Int
    public let conflicts: Int
    public let syncedAt: Date

    public init(pulled: Int, pushed: Int, conflicts: Int, syncedAt: Date) {
        self.pulled = pulled
        self.pushed = pushed
        self.conflicts = conflicts
        self.syncedAt = syncedAt
    }

    public init(from response: CalendarSyncResponse) {
        self.pulled = response.pulled
        self.pushed = response.pushed
        self.conflicts = response.conflicts
        self.syncedAt = Date(timeIntervalSince1970: TimeInterval(response.lastSyncAt) / 1000)
    }
}

// MARK: - External Event Link

/// Local representation of external_event_links table row
public struct ExternalEventLink: Identifiable, Codable, Hashable, Sendable {
    public let id: UUID
    public let entryId: UUID
    public let provider: CalendarProvider
    public let externalEventId: String
    public let externalCalendarId: String?
    public let etag: String?
    public let lastSyncedAt: Date?

    public init(
        id: UUID = UUID(),
        entryId: UUID,
        provider: CalendarProvider,
        externalEventId: String,
        externalCalendarId: String? = nil,
        etag: String? = nil,
        lastSyncedAt: Date? = nil
    ) {
        self.id = id
        self.entryId = entryId
        self.provider = provider
        self.externalEventId = externalEventId
        self.externalCalendarId = externalCalendarId
        self.etag = etag
        self.lastSyncedAt = lastSyncedAt
    }

    public init(from row: SupabaseExternalEventLinkRow) {
        self.id = row.id
        self.entryId = row.entryId
        self.provider = CalendarProvider(rawValue: row.provider) ?? .device
        self.externalEventId = row.externalEventId
        self.externalCalendarId = row.externalCalendarId
        self.etag = row.etag
        self.lastSyncedAt = SupabaseDate.parse(row.lastSyncedAt)
    }
}

// MARK: - Calendar Conflict

/// Represents a sync conflict (concurrent edits within 60 seconds)
public struct CalendarConflict: Identifiable, Codable, Sendable {
    public let id: UUID
    public let entryId: UUID
    public let provider: CalendarProvider
    public let localUpdatedAt: Date
    public let remoteUpdatedAt: Date
    public let note: String
    public let createdAt: Date

    /// Edge functions mark conflict when |local - remote| < 60 seconds
    public static let conflictWindowSeconds: TimeInterval = 60

    public init(
        id: UUID = UUID(),
        entryId: UUID,
        provider: CalendarProvider,
        localUpdatedAt: Date,
        remoteUpdatedAt: Date,
        note: String = "Concurrent edits within 60 seconds",
        createdAt: Date = Date()
    ) {
        self.id = id
        self.entryId = entryId
        self.provider = provider
        self.localUpdatedAt = localUpdatedAt
        self.remoteUpdatedAt = remoteUpdatedAt
        self.note = note
        self.createdAt = createdAt
    }

    /// Check if two timestamps fall within the conflict detection window
    public static func isWithinConflictWindow(
        localUpdated: Date,
        remoteUpdated: Date
    ) -> Bool {
        abs(localUpdated.timeIntervalSince(remoteUpdated)) < conflictWindowSeconds
    }
}

// MARK: - Recurrence (RRULE Format)

/// Recurrence rule in RFC 5545 RRULE format (for Google/Microsoft/EventKit parity)
public struct RecurrenceInfo: Codable, Hashable, Sendable {
    /// RFC 5545 RRULE string (e.g., "FREQ=WEEKLY;BYDAY=MO,WE,FR")
    public let rrule: String

    /// Timezone identifier (e.g., "America/Los_Angeles")
    public let timezone: String?

    /// Single-occurrence reschedules stored as exceptions
    public let exceptions: [CalendarRecurrenceException]?

    public init(
        rrule: String,
        timezone: String? = nil,
        exceptions: [CalendarRecurrenceException]? = nil
    ) {
        self.rrule = rrule
        self.timezone = timezone
        self.exceptions = exceptions
    }
}

/// Exception for a single occurrence in a recurring series (calendar-specific)
public struct CalendarRecurrenceException: Codable, Hashable, Sendable {
    /// Original occurrence start time
    public let originalStartAt: Date

    /// Rescheduled start time (for single-occurrence reschedule)
    /// nil if this is a cancellation
    public let newStartAt: Date?

    /// If true, this occurrence is deleted/cancelled
    public let isCancelled: Bool

    public init(
        originalStartAt: Date,
        newStartAt: Date? = nil,
        isCancelled: Bool = false
    ) {
        self.originalStartAt = originalStartAt
        self.newStartAt = newStartAt
        self.isCancelled = isCancelled
    }
}

// MARK: - Parity-Plus Frontmatter

/// Extended frontmatter fields for calendar events (parity with Google/Microsoft)
public struct EventFrontmatter: Codable, Hashable, Sendable {
    // Core fields
    public var allDay: Bool
    public var location: String?

    // Recurrence
    public var recurrence: RecurrenceInfo?

    // Parity-plus fields (from Google/Microsoft calendars)
    public var attendees: [String]?  // email addresses
    public var url: String?
    public var calendarId: String?
    public var externalId: String?

    public init(
        allDay: Bool = false,
        location: String? = nil,
        recurrence: RecurrenceInfo? = nil,
        attendees: [String]? = nil,
        url: String? = nil,
        calendarId: String? = nil,
        externalId: String? = nil
    ) {
        self.allDay = allDay
        self.location = location
        self.recurrence = recurrence
        self.attendees = attendees
        self.url = url
        self.calendarId = calendarId
        self.externalId = externalId
    }

    /// Convert to JSON dictionary for storage in entries.frontmatter
    public func toJSONValue() -> [String: JSONValue] {
        var result: [String: JSONValue] = [:]
        result["allDay"] = .bool(allDay)
        if let location { result["location"] = .string(location) }
        if let url { result["url"] = .string(url) }
        if let calendarId { result["calendarId"] = .string(calendarId) }
        if let externalId { result["externalId"] = .string(externalId) }
        if let attendees {
            result["attendees"] = .array(attendees.map { .string($0) })
        }
        if let recurrence {
            var rec: [String: JSONValue] = [:]
            rec["rrule"] = .string(recurrence.rrule)
            if let tz = recurrence.timezone { rec["timezone"] = .string(tz) }
            if let exceptions = recurrence.exceptions, !exceptions.isEmpty {
                let excs: [JSONValue] = exceptions.map { exc in
                    var e: [String: JSONValue] = [:]
                    e["originalStartAt"] = .string(SupabaseDate.string(exc.originalStartAt) ?? "")
                    if let newStart = exc.newStartAt {
                        e["newStartAt"] = .string(SupabaseDate.string(newStart) ?? "")
                    }
                    if exc.isCancelled {
                        e["isCancelled"] = .bool(true)
                    }
                    return .object(e)
                }
                rec["exceptions"] = .array(excs)
            }
            result["recurrence"] = .object(rec)
        }
        return result
    }

    /// Parse from JSON dictionary stored in entries.frontmatter
    public static func from(_ json: [String: JSONValue]?) -> EventFrontmatter? {
        guard let json else { return nil }

        var frontmatter = EventFrontmatter()

        if case .bool(let value) = json["allDay"] {
            frontmatter.allDay = value
        }
        if case .string(let value) = json["location"] {
            frontmatter.location = value
        }
        if case .string(let value) = json["url"] {
            frontmatter.url = value
        }
        if case .string(let value) = json["calendarId"] {
            frontmatter.calendarId = value
        }
        if case .string(let value) = json["externalId"] {
            frontmatter.externalId = value
        }
        if case .array(let arr) = json["attendees"] {
            frontmatter.attendees = arr.compactMap { item in
                if case .string(let s) = item { return s }
                return nil
            }
        }
        if case .object(let rec) = json["recurrence"] {
            var rrule: String?
            var timezone: String?
            var exceptions: [CalendarRecurrenceException]?

            if case .string(let value) = rec["rrule"] {
                rrule = value
            }
            if case .string(let value) = rec["timezone"] {
                timezone = value
            }
            if case .array(let excs) = rec["exceptions"] {
                exceptions = excs.compactMap { item -> CalendarRecurrenceException? in
                    guard case .object(let e) = item else { return nil }
                    guard case .string(let origStr) = e["originalStartAt"],
                          let orig = SupabaseDate.parse(origStr) else { return nil }
                    var newStart: Date?
                    if case .string(let newStr) = e["newStartAt"] {
                        newStart = SupabaseDate.parse(newStr)
                    }
                    var cancelled = false
                    if case .bool(let c) = e["isCancelled"] {
                        cancelled = c
                    }
                    return CalendarRecurrenceException(originalStartAt: orig, newStartAt: newStart, isCancelled: cancelled)
                }
            }

            if let rrule {
                frontmatter.recurrence = RecurrenceInfo(rrule: rrule, timezone: timezone, exceptions: exceptions)
            }
        }

        return frontmatter
    }
}

// MARK: - Calendar Sync Error

/// Errors that can occur during calendar sync
public enum CalendarSyncError: Error, LocalizedError {
    case notAuthorized
    case networkError(String)
    case providerNotConnected(CalendarProvider)
    case tokenExpired
    case syncFailed(String)
    case conflictDetected(Int)

    public var errorDescription: String? {
        switch self {
        case .notAuthorized:
            return "Calendar access not authorized"
        case .networkError(let message):
            return "Network error: \(message)"
        case .providerNotConnected(let provider):
            return "\(provider.rawValue.capitalized) calendar not connected"
        case .tokenExpired:
            return "OAuth token expired"
        case .syncFailed(let message):
            return "Sync failed: \(message)"
        case .conflictDetected(let count):
            return "\(count) conflict(s) detected during sync"
        }
    }
}

// MARK: - Connected Account

/// Represents a connected external calendar account
public struct ConnectedCalendarAccount: Identifiable, Sendable {
    public let id: UUID
    public let provider: CalendarProvider
    public let email: String?
    public let expiresAt: Date?
    public let isExpired: Bool

    public init(from row: SupabaseExternalAccountRow) {
        self.id = row.id
        self.provider = CalendarProvider(rawValue: row.provider) ?? .google
        self.email = row.externalEmail
        self.expiresAt = SupabaseDate.parse(row.expiresAt)
        if let expires = self.expiresAt {
            self.isExpired = expires < Date()
        } else {
            self.isExpired = false
        }
    }
}
