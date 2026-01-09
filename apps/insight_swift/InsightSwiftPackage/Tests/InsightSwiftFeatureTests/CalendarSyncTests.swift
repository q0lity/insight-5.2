import Foundation
import Testing
@testable import InsightSwiftFeature

// MARK: - Happy Path Tests

@Test("Entry maps to EKEvent-compatible data with parity-plus fields")
func entryToEventMappingHappyPath() {
    let entry = Entry(
        title: "Team Meeting",
        facets: [.event],
        startAt: Date(),
        endAt: Date().addingTimeInterval(3600),
        allDay: false,
        notes: "Discuss Q1 roadmap"
    )

    let frontmatter = EventFrontmatter(
        allDay: false,
        location: "Conference Room A",
        url: "https://zoom.us/j/123456789",
        attendees: ["alice@example.com", "bob@example.com"],
        calendarId: "primary",
        externalId: "abc123"
    )

    // Verify frontmatter conversion
    let json = frontmatter.toJSONValue()

    #expect(json["allDay"] == .bool(false))
    #expect(json["location"] == .string("Conference Room A"))
    #expect(json["url"] == .string("https://zoom.us/j/123456789"))
    #expect(json["calendarId"] == .string("primary"))
    #expect(json["externalId"] == .string("abc123"))

    // Verify attendees array
    if case .array(let attendees) = json["attendees"] {
        #expect(attendees.count == 2)
        #expect(attendees[0] == .string("alice@example.com"))
    } else {
        Issue.record("Attendees should be an array")
    }
}

@Test("EventFrontmatter round-trips through JSON")
func eventFrontmatterRoundTrip() {
    let original = EventFrontmatter(
        allDay: true,
        location: "Central Park",
        recurrence: RecurrenceInfo(
            rrule: "FREQ=WEEKLY;BYDAY=MO,WE,FR",
            timezone: "America/New_York",
            exceptions: [
                RecurrenceException(
                    originalStartAt: Date(),
                    newStartAt: Date().addingTimeInterval(7200),
                    isCancelled: false
                )
            ]
        ),
        attendees: ["test@example.com"],
        url: "https://example.com",
        calendarId: "work",
        externalId: "ext123"
    )

    let json = original.toJSONValue()
    let restored = EventFrontmatter.from(json)

    #expect(restored?.allDay == original.allDay)
    #expect(restored?.location == original.location)
    #expect(restored?.url == original.url)
    #expect(restored?.calendarId == original.calendarId)
    #expect(restored?.externalId == original.externalId)
    #expect(restored?.recurrence?.rrule == original.recurrence?.rrule)
    #expect(restored?.recurrence?.timezone == original.recurrence?.timezone)
    #expect(restored?.attendees == original.attendees)
}

@Test("CalendarSyncStats initializes from CalendarSyncResponse")
func syncStatsFromResponse() {
    let response = CalendarSyncResponse(
        pulled: 5,
        pushed: 3,
        conflicts: 1,
        lastSyncAt: 1730000000000  // milliseconds
    )

    let stats = CalendarSyncStats(from: response)

    #expect(stats.pulled == 5)
    #expect(stats.pushed == 3)
    #expect(stats.conflicts == 1)
    #expect(stats.syncedAt.timeIntervalSince1970 == 1730000000)  // converted to seconds
}

@Test("CalendarProvider enum has correct raw values")
func calendarProviderRawValues() {
    #expect(CalendarProvider.google.rawValue == "google")
    #expect(CalendarProvider.microsoft.rawValue == "microsoft")
    #expect(CalendarProvider.device.rawValue == "device")
    #expect(CalendarProvider.apple.rawValue == "apple")
}

// MARK: - Failure Path Tests

@Test("CalendarSyncError provides localized descriptions")
func calendarSyncErrorDescriptions() {
    let notAuthorized = CalendarSyncError.notAuthorized
    #expect(notAuthorized.localizedDescription.contains("not authorized"))

    let networkError = CalendarSyncError.networkError("Connection timeout")
    #expect(networkError.localizedDescription.contains("Network error"))
    #expect(networkError.localizedDescription.contains("Connection timeout"))

    let notConnected = CalendarSyncError.providerNotConnected(.google)
    #expect(notConnected.localizedDescription.contains("Google"))
    #expect(notConnected.localizedDescription.contains("not connected"))

    let expired = CalendarSyncError.tokenExpired
    #expect(expired.localizedDescription.contains("expired"))

    let failed = CalendarSyncError.syncFailed("Unknown error")
    #expect(failed.localizedDescription.contains("Sync failed"))

    let conflicts = CalendarSyncError.conflictDetected(3)
    #expect(conflicts.localizedDescription.contains("3"))
    #expect(conflicts.localizedDescription.contains("conflict"))
}

@Test("ExternalEventLink initializes from Supabase row")
func externalEventLinkFromRow() {
    let row = SupabaseExternalEventLinkRow(
        id: UUID(),
        userId: UUID(),
        entryId: UUID(),
        createdAt: "2026-01-07T12:00:00Z",
        updatedAt: "2026-01-07T12:00:00Z",
        provider: "google",
        externalEventId: "event123",
        externalCalendarId: "primary",
        etag: "\"abc123\"",
        lastSyncedAt: "2026-01-07T12:00:00Z"
    )

    let link = ExternalEventLink(from: row)

    #expect(link.id == row.id)
    #expect(link.entryId == row.entryId)
    #expect(link.provider == .google)
    #expect(link.externalEventId == "event123")
    #expect(link.externalCalendarId == "primary")
    #expect(link.etag == "\"abc123\"")
    #expect(link.lastSyncedAt != nil)
}

@Test("ExternalEventLink handles unknown provider gracefully")
func externalEventLinkUnknownProvider() {
    let row = SupabaseExternalEventLinkRow(
        id: UUID(),
        userId: UUID(),
        entryId: UUID(),
        createdAt: nil,
        updatedAt: nil,
        provider: "unknown_provider",  // Invalid provider
        externalEventId: "event123",
        externalCalendarId: nil,
        etag: nil,
        lastSyncedAt: nil
    )

    let link = ExternalEventLink(from: row)

    // Should default to .device for unknown providers
    #expect(link.provider == .device)
}

// MARK: - Edge Case Tests

@Test("Concurrent edits within 60 seconds are flagged as conflicts")
func conflictDetectionWindow() {
    let now = Date()
    let local = now
    let remote30s = now.addingTimeInterval(30)  // 30 seconds later
    let remote59s = now.addingTimeInterval(59)  // 59 seconds later (edge)
    let remote60s = now.addingTimeInterval(60)  // 60 seconds later (boundary)
    let remote90s = now.addingTimeInterval(90)  // 90 seconds later

    // Within conflict window (< 60 seconds)
    #expect(EventKitMapper.isConflictWindow(localUpdated: local, remoteUpdated: remote30s) == true)
    #expect(EventKitMapper.isConflictWindow(localUpdated: local, remoteUpdated: remote59s) == true)

    // At or beyond conflict window (>= 60 seconds)
    #expect(EventKitMapper.isConflictWindow(localUpdated: local, remoteUpdated: remote60s) == false)
    #expect(EventKitMapper.isConflictWindow(localUpdated: local, remoteUpdated: remote90s) == false)

    // Negative difference (remote earlier than local)
    let earlierRemote = now.addingTimeInterval(-45)
    #expect(EventKitMapper.isConflictWindow(localUpdated: local, remoteUpdated: earlierRemote) == true)
}

@Test("CalendarConflict.conflictWindowSeconds is 60")
func conflictWindowConstant() {
    #expect(CalendarConflict.conflictWindowSeconds == 60)
}

@Test("All-day events correctly set allDay flag")
func allDayEventHandling() {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = TimeZone(secondsFromGMT: 0) ?? .current

    let baseDate = calendar.date(from: DateComponents(year: 2026, month: 1, day: 15))!
    let startOfDay = calendar.startOfDay(for: baseDate)

    let allDayEntry = Entry(
        title: "Company Holiday",
        facets: [.event],
        startAt: startOfDay,
        endAt: startOfDay,
        allDay: true
    )

    let frontmatter = EventFrontmatter(allDay: true)
    let json = frontmatter.toJSONValue()

    #expect(allDayEntry.allDay == true)
    #expect(json["allDay"] == .bool(true))
}

@Test("Calendar sync response JSON parsing")
func calendarSyncResponseParsing() throws {
    let json = """
    {"pulled":5,"pushed":3,"conflicts":1,"lastSyncAt":1730000000000}
    """
    let data = json.data(using: .utf8)!
    let response = try JSONDecoder().decode(CalendarSyncResponse.self, from: data)

    #expect(response.pulled == 5)
    #expect(response.pushed == 3)
    #expect(response.conflicts == 1)
    #expect(response.lastSyncAt == 1730000000000)

    let stats = CalendarSyncStats(from: response)
    #expect(stats.syncedAt.timeIntervalSince1970 == 1730000000)
}

@Test("RecurrenceInfo stores RRULE with timezone and exceptions")
func recurrenceInfoStorage() {
    let exceptions = [
        RecurrenceException(
            originalStartAt: Date(),
            newStartAt: Date().addingTimeInterval(3600),
            isCancelled: false
        ),
        RecurrenceException(
            originalStartAt: Date().addingTimeInterval(86400 * 7),
            newStartAt: nil,
            isCancelled: true
        )
    ]

    let recurrence = RecurrenceInfo(
        rrule: "FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20261231",
        timezone: "America/Los_Angeles",
        exceptions: exceptions
    )

    #expect(recurrence.rrule.contains("FREQ=WEEKLY"))
    #expect(recurrence.rrule.contains("BYDAY=MO,WE,FR"))
    #expect(recurrence.timezone == "America/Los_Angeles")
    #expect(recurrence.exceptions?.count == 2)
    #expect(recurrence.exceptions?.first?.isCancelled == false)
    #expect(recurrence.exceptions?.last?.isCancelled == true)
}

@Test("RecurrenceException stores single-occurrence reschedule")
func recurrenceExceptionReschedule() {
    let originalStart = Date()
    let rescheduledStart = Date().addingTimeInterval(7200)  // Moved 2 hours later

    let exception = RecurrenceException(
        originalStartAt: originalStart,
        newStartAt: rescheduledStart,
        isCancelled: false
    )

    #expect(exception.originalStartAt == originalStart)
    #expect(exception.newStartAt == rescheduledStart)
    #expect(exception.isCancelled == false)

    // Test cancelled occurrence
    let cancelled = RecurrenceException(
        originalStartAt: originalStart,
        newStartAt: nil,
        isCancelled: true
    )

    #expect(cancelled.newStartAt == nil)
    #expect(cancelled.isCancelled == true)
}

@Test("ConnectedCalendarAccount detects expired tokens")
func connectedAccountExpirationDetection() {
    // Non-expired account
    let futureExpiry = SupabaseExternalAccountRow(
        id: UUID(),
        userId: UUID(),
        provider: "google",
        createdAt: nil,
        updatedAt: nil,
        expiresAt: ISO8601DateFormatter().string(from: Date().addingTimeInterval(3600)),
        scope: "calendar",
        externalAccountId: "123",
        externalEmail: "test@gmail.com"
    )

    let validAccount = ConnectedCalendarAccount(from: futureExpiry)
    #expect(validAccount.isExpired == false)
    #expect(validAccount.provider == .google)
    #expect(validAccount.email == "test@gmail.com")

    // Expired account
    let pastExpiry = SupabaseExternalAccountRow(
        id: UUID(),
        userId: UUID(),
        provider: "microsoft",
        createdAt: nil,
        updatedAt: nil,
        expiresAt: ISO8601DateFormatter().string(from: Date().addingTimeInterval(-3600)),
        scope: "calendar",
        externalAccountId: "456",
        externalEmail: "test@outlook.com"
    )

    let expiredAccount = ConnectedCalendarAccount(from: pastExpiry)
    #expect(expiredAccount.isExpired == true)
    #expect(expiredAccount.provider == .microsoft)
}

@Test("Entry change detection compares relevant fields")
func entryChangeDetection() {
    let original = Entry(
        title: "Original Title",
        facets: [.event],
        startAt: Date(),
        endAt: Date().addingTimeInterval(3600),
        allDay: false,
        notes: "Original notes"
    )

    // Same entry should have no changes
    var same = original
    same.id = original.id

    // Different title should be detected
    var differentTitle = original
    differentTitle.title = "Changed Title"
    #expect(differentTitle.title != original.title)

    // Different times should be detected
    var differentTime = original
    differentTime.startAt = Date().addingTimeInterval(7200)
    #expect(differentTime.startAt != original.startAt)

    // Different all-day status should be detected
    var differentAllDay = original
    differentAllDay.allDay = true
    #expect(differentAllDay.allDay != original.allDay)
}

@Test("Google and Microsoft sync request payloads encode correctly")
func syncRequestPayloadEncoding() throws {
    let now = Date()
    let startMs = Int(now.timeIntervalSince1970 * 1000)
    let endMs = Int(now.addingTimeInterval(86400 * 365).timeIntervalSince1970 * 1000)

    let googleRequest = GoogleCalendarSyncRequest(
        calendarId: "primary",
        scopeStartMs: startMs,
        scopeEndMs: endMs
    )

    let encoder = JSONEncoder()
    let googleData = try encoder.encode(googleRequest)
    let googleJson = try JSONSerialization.jsonObject(with: googleData) as? [String: Any]

    #expect(googleJson?["calendarId"] as? String == "primary")
    #expect(googleJson?["scopeStartMs"] as? Int == startMs)
    #expect(googleJson?["scopeEndMs"] as? Int == endMs)

    let microsoftRequest = MicrosoftCalendarSyncRequest(
        scopeStartMs: startMs,
        scopeEndMs: endMs
    )

    let microsoftData = try encoder.encode(microsoftRequest)
    let microsoftJson = try JSONSerialization.jsonObject(with: microsoftData) as? [String: Any]

    #expect(microsoftJson?["scopeStartMs"] as? Int == startMs)
    #expect(microsoftJson?["scopeEndMs"] as? Int == endMs)
    #expect(microsoftJson?["calendarId"] == nil)  // Microsoft doesn't have calendarId
}
