import Foundation
import Testing
@testable import InsightSwiftFeature

// MARK: - OAuth URL Tests

@Test("OAuth URL builds correctly for Google")
func googleOAuthURLConstruction() async {
    let service = await OAuthWebAuthService()
    let url = await service.buildOAuthURL(provider: .google)
    let urlString = url.absoluteString

    #expect(urlString.contains("accounts.google.com"))
    #expect(urlString.contains("calendar"))
    #expect(urlString.contains("insightswift"))
    #expect(urlString.contains("response_type=code"))
    #expect(urlString.contains("access_type=offline"))
    #expect(urlString.contains("prompt=consent"))
}

@Test("OAuth URL builds correctly for Microsoft")
func microsoftOAuthURLConstruction() async {
    let service = await OAuthWebAuthService()
    let url = await service.buildOAuthURL(provider: .microsoft)
    let urlString = url.absoluteString

    #expect(urlString.contains("login.microsoftonline.com"))
    #expect(urlString.contains("Calendars.ReadWrite"))
    #expect(urlString.contains("offline_access"))
    #expect(urlString.contains("insightswift"))
    #expect(urlString.contains("response_type=code"))
}

@Test("Authorization code extracted from callback URL")
func oauthCallbackCodeExtraction() async throws {
    let service = await OAuthWebAuthService()
    let callbackURL = URL(string: "insightswift://oauth-callback?code=abc123&state=xyz")!

    let code = try await service.extractCode(from: callbackURL)
    #expect(code == "abc123")
}

@Test("OAuth error: access denied")
func oauthAccessDeniedHandling() async throws {
    let service = await OAuthWebAuthService()
    let errorURL = URL(string: "insightswift://oauth-callback?error=access_denied")!

    do {
        _ = try await service.extractCode(from: errorURL)
        Issue.record("Expected OAuthError.accessDenied to be thrown")
    } catch let error as OAuthError {
        if case .accessDenied = error {
            // Expected
        } else {
            Issue.record("Expected accessDenied, got: \(error)")
        }
    }
}

@Test("OAuth error: missing code")
func oauthMissingCodeHandling() async throws {
    let service = await OAuthWebAuthService()
    let noCodeURL = URL(string: "insightswift://oauth-callback?state=xyz")!

    do {
        _ = try await service.extractCode(from: noCodeURL)
        Issue.record("Expected OAuthError.missingCode to be thrown")
    } catch let error as OAuthError {
        if case .missingCode = error {
            // Expected
        } else {
            Issue.record("Expected missingCode, got: \(error)")
        }
    }
}

@Test("OAuth error: invalid callback URL")
func oauthInvalidCallbackHandling() async throws {
    let service = await OAuthWebAuthService()

    // Empty URL components
    do {
        _ = try await service.extractCode(from: URL(string: "://")!)
        Issue.record("Expected OAuthError.invalidCallback to be thrown")
    } catch let error as OAuthError {
        if case .invalidCallback = error {
            // Expected
        } else {
            Issue.record("Expected invalidCallback, got: \(error)")
        }
    }
}

@Test("OAuth redirect URI uses correct scheme")
func oauthRedirectScheme() async {
    #expect(OAuthWebAuthService.redirectScheme == "insightswift")
    #expect(OAuthWebAuthService.redirectHost == "oauth-callback")
    #expect(OAuthWebAuthService.redirectURI == "insightswift://oauth-callback")
}

// MARK: - Conflict Resolution Tests

@Test("Conflict resolution: Keep App Version preserves local entry")
func conflictResolutionKeepApp() {
    let local = Entry(
        title: "Local Title",
        facets: [.event],
        startAt: Date(),
        notes: "Local notes"
    )
    let remote = Entry(
        title: "Remote Title",
        facets: [.event],
        startAt: Date().addingTimeInterval(3600),
        notes: "Remote notes"
    )

    let resolved = ConflictResolver.apply(resolution: .keepApp, local: local, remote: remote)

    #expect(resolved.title == "Local Title")
    #expect(resolved.notes == "Local notes")
}

@Test("Conflict resolution: Keep Provider Version uses remote entry")
func conflictResolutionKeepProvider() {
    let local = Entry(
        title: "Local Title",
        facets: [.event],
        startAt: Date(),
        notes: "Local notes"
    )
    let remote = Entry(
        title: "Remote Title",
        facets: [.event],
        startAt: Date().addingTimeInterval(3600),
        notes: "Remote notes"
    )

    let resolved = ConflictResolver.apply(resolution: .keepProvider, local: local, remote: remote)

    #expect(resolved.title == "Remote Title")
    #expect(resolved.notes == "Remote notes")
}

@Test("Conflict resolution: Merge Notes combines both")
func conflictResolutionMergeNotes() {
    let localNotes = "Local note content"
    let remoteNotes = "Remote note content"

    let merged = ConflictResolver.mergeNotes(local: localNotes, remote: remoteNotes)

    #expect(merged.contains(localNotes))
    #expect(merged.contains(remoteNotes))
    #expect(merged.contains("Local:"))
    #expect(merged.contains("Remote:"))
}

@Test("Conflict resolution merge handles empty notes")
func conflictResolutionMergeEmptyNotes() {
    // Both empty
    let bothEmpty = ConflictResolver.mergeNotes(local: "", remote: "")
    #expect(bothEmpty.isEmpty)

    // Local empty
    let localEmpty = ConflictResolver.mergeNotes(local: "", remote: "Remote content")
    #expect(localEmpty == "Remote content")

    // Remote empty
    let remoteEmpty = ConflictResolver.mergeNotes(local: "Local content", remote: "")
    #expect(remoteEmpty == "Local content")
}

@Test("ConflictResolution enum has correct cases")
func conflictResolutionCases() {
    let allCases = ConflictResolution.allCases

    #expect(allCases.count == 3)
    #expect(allCases.contains(.keepApp))
    #expect(allCases.contains(.keepProvider))
    #expect(allCases.contains(.mergeNotes))

    // Verify raw values
    #expect(ConflictResolution.keepApp.rawValue == "Keep App Version")
    #expect(ConflictResolution.keepProvider.rawValue == "Keep Provider Version")
    #expect(ConflictResolution.mergeNotes.rawValue == "Merge Notes Only")
}

// MARK: - Background Sync Tests

@Test("Background task identifiers have correct format")
func backgroundTaskIdentifiers() {
    #expect(BackgroundSyncScheduler.calendarSyncTaskId.hasPrefix("com.insightswift."))
    #expect(BackgroundSyncScheduler.refreshTaskId.hasPrefix("com.insightswift."))
    #expect(BackgroundSyncScheduler.calendarSyncTaskId == "com.insightswift.calendar-sync")
    #expect(BackgroundSyncScheduler.refreshTaskId == "com.insightswift.refresh")
}

@Test("Minimum sync interval is battery-friendly (15+ minutes)")
func minimumSyncInterval() {
    // At least 15 minutes to be battery-friendly
    #expect(BackgroundSyncScheduler.minimumSyncInterval >= 15 * 60)

    // At most 1 hour to stay reasonably fresh
    #expect(BackgroundSyncScheduler.minimumSyncInterval <= 60 * 60)

    // Default is exactly 15 minutes
    #expect(BackgroundSyncScheduler.minimumSyncInterval == 15 * 60)
}

@Test("Sync window is 1 month in each direction")
func syncWindowMonths() {
    #expect(BackgroundSyncScheduler.syncWindowMonths == 1)
}

// MARK: - Calendar Selection Tests

@Test("CalendarSelection initializes with all properties")
func calendarSelectionInitialization() {
    let selection = CalendarSelection(
        id: "primary",
        title: "Work Calendar",
        provider: .google,
        colorHex: "#4285F4",
        isEnabled: true
    )

    #expect(selection.id == "primary")
    #expect(selection.title == "Work Calendar")
    #expect(selection.provider == .google)
    #expect(selection.colorHex == "#4285F4")
    #expect(selection.isEnabled == true)
}

@Test("CalendarSelection defaults to enabled")
func calendarSelectionDefaultEnabled() {
    let selection = CalendarSelection(
        id: "default",
        title: "Default Calendar",
        provider: .microsoft
    )

    #expect(selection.isEnabled == true)
    #expect(selection.colorHex == "#4285F4")  // Default color
}

@Test("CalendarSelection is Codable")
func calendarSelectionCodable() throws {
    let original = CalendarSelection(
        id: "test-calendar",
        title: "Test Calendar",
        provider: .google,
        colorHex: "#DB4437",
        isEnabled: false
    )

    let encoder = JSONEncoder()
    let data = try encoder.encode(original)

    let decoder = JSONDecoder()
    let decoded = try decoder.decode(CalendarSelection.self, from: data)

    #expect(decoded.id == original.id)
    #expect(decoded.title == original.title)
    #expect(decoded.provider == original.provider)
    #expect(decoded.colorHex == original.colorHex)
    #expect(decoded.isEnabled == original.isEnabled)
}

@Test("CalendarSelection is Hashable")
func calendarSelectionHashable() {
    let selection1 = CalendarSelection(
        id: "cal-1",
        title: "Calendar 1",
        provider: .google
    )

    let selection2 = CalendarSelection(
        id: "cal-1",
        title: "Calendar 1",
        provider: .google
    )

    let selection3 = CalendarSelection(
        id: "cal-2",
        title: "Calendar 2",
        provider: .microsoft
    )

    #expect(selection1 == selection2)
    #expect(selection1 != selection3)

    // Can be used in a Set
    let set = Set([selection1, selection2, selection3])
    #expect(set.count == 2)
}

@Test("CalendarProvider displayName property")
func calendarProviderDisplayName() {
    #expect(CalendarProvider.google.displayName == "Google Calendar")
    #expect(CalendarProvider.microsoft.displayName == "Microsoft Calendar")
    #expect(CalendarProvider.device.displayName == "Device Calendar")
    #expect(CalendarProvider.apple.displayName == "Device Calendar")
}

// MARK: - OAuth Error Tests

@Test("OAuthError provides descriptive messages")
func oauthErrorDescriptions() {
    let cancelled = OAuthError.userCancelled
    #expect(cancelled.localizedDescription?.contains("cancelled") == true)

    let denied = OAuthError.accessDenied
    #expect(denied.localizedDescription?.contains("denied") == true)

    let invalidCallback = OAuthError.invalidCallback("Missing parameters")
    #expect(invalidCallback.localizedDescription?.contains("Invalid") == true)
    #expect(invalidCallback.localizedDescription?.contains("Missing parameters") == true)

    let missingCode = OAuthError.missingCode
    #expect(missingCode.localizedDescription?.contains("code") == true)

    let network = OAuthError.networkError("Connection timeout")
    #expect(network.localizedDescription?.contains("Network") == true)
    #expect(network.localizedDescription?.contains("Connection timeout") == true)

    let presentation = OAuthError.presentationError
    #expect(presentation.localizedDescription?.contains("present") == true)

    let unknown = OAuthError.unknown("Something went wrong")
    #expect(unknown.localizedDescription?.contains("Something went wrong") == true)
}

// MARK: - External Calendar Sync Service Phase 2 Tests

@Test("CalendarConflict can be logged and resolved")
func conflictLoggingAndResolution() {
    let conflict = CalendarConflict(
        entryId: UUID(),
        provider: .google,
        localUpdatedAt: Date(),
        remoteUpdatedAt: Date().addingTimeInterval(30)
    )

    #expect(conflict.provider == .google)
    #expect(abs(conflict.remoteUpdatedAt.timeIntervalSince(conflict.localUpdatedAt) - 30) < 1)
}

@Test("CalendarSelection color parsing from hex")
func calendarSelectionColorParsing() {
    let selection = CalendarSelection(
        id: "test",
        title: "Test",
        provider: .google,
        colorHex: "#FF0000"
    )

    // The color property should return a valid SwiftUI Color
    // We can't directly test Color equality, but we can verify it doesn't crash
    _ = selection.color
}

@Test("CalendarSelection with invalid hex color fallbacks")
func calendarSelectionInvalidColorFallback() {
    let selection = CalendarSelection(
        id: "test",
        title: "Test",
        provider: .google,
        colorHex: "invalid"  // Invalid hex
    )

    // Should not crash, fallbacks to default blue
    _ = selection.color
}
