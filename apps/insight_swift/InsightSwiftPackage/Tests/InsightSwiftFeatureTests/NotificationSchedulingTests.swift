import Foundation
import Testing
import UserNotifications
@testable import InsightSwiftFeature

// MARK: - Mock Notification Center

final class MockNotificationCenter: NotificationCenterClient, @unchecked Sendable {
    var authorizationStatus: UNAuthorizationStatus = .authorized
    var scheduledRequests: [UNNotificationRequest] = []
    var removedIdentifiers: [String] = []
    var categories: Set<UNNotificationCategory> = []
    var shouldThrowOnAdd = false

    func notificationSettings() async -> UNNotificationSettings {
        // Create a mock settings object using the status
        MockNotificationSettings(authorizationStatus: authorizationStatus)
    }

    func requestAuthorization(options: UNAuthorizationOptions) async throws -> Bool {
        authorizationStatus == .authorized
    }

    func add(_ request: UNNotificationRequest) async throws {
        if shouldThrowOnAdd {
            throw NSError(domain: "MockError", code: 1, userInfo: [NSLocalizedDescriptionKey: "Mock add error"])
        }
        scheduledRequests.append(request)
    }

    func setNotificationCategories(_ categories: Set<UNNotificationCategory>) {
        self.categories = categories
    }

    func removePendingNotificationRequests(withIdentifiers identifiers: [String]) {
        removedIdentifiers.append(contentsOf: identifiers)
        scheduledRequests.removeAll { identifiers.contains($0.identifier) }
    }

    func removeAllPendingNotificationRequests() {
        scheduledRequests.removeAll()
    }

    func pendingNotificationRequests() async -> [UNNotificationRequest] {
        scheduledRequests
    }
}

// MARK: - Mock Notification Settings

final class MockNotificationSettings: UNNotificationSettings {
    private let mockAuthorizationStatus: UNAuthorizationStatus

    init(authorizationStatus: UNAuthorizationStatus) {
        self.mockAuthorizationStatus = authorizationStatus
        super.init()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override var authorizationStatus: UNAuthorizationStatus {
        mockAuthorizationStatus
    }
}

// MARK: - Tests

@Test("Scheduling reminder creates valid request")
@MainActor
func scheduleReminderHappyPath() async {
    let mock = MockNotificationCenter()
    let defaults = UserDefaults(suiteName: "test.notifications.happy")!
    defaults.removePersistentDomain(forName: "test.notifications.happy")
    defaults.set(true, forKey: "integration.notifications.enabled")

    let service = NotificationService(center: mock, defaults: defaults)
    // Wait for authorization refresh
    try? await Task.sleep(for: .milliseconds(50))

    let fireAt = Date().addingTimeInterval(3600)
    await service.scheduleReminder(title: "Test Reminder", body: "Test Body", fireAt: fireAt)

    #expect(mock.scheduledRequests.count == 1)
    let request = mock.scheduledRequests.first
    #expect(request?.content.title == "Test Reminder")
    #expect(request?.content.body == "Test Body")
    #expect(request?.content.categoryIdentifier == NotificationCategory.general.rawValue)

    // Verify trigger is calendar-based
    let trigger = request?.trigger as? UNCalendarNotificationTrigger
    #expect(trigger != nil)
    #expect(trigger?.repeats == false)
}

@Test("Scheduling fails when not authorized")
@MainActor
func scheduleReminderWhenDenied() async {
    let mock = MockNotificationCenter()
    mock.authorizationStatus = .denied

    let defaults = UserDefaults(suiteName: "test.notifications.denied")!
    defaults.removePersistentDomain(forName: "test.notifications.denied")
    defaults.set(true, forKey: "integration.notifications.enabled")

    let service = NotificationService(center: mock, defaults: defaults)
    // Wait for authorization refresh
    try? await Task.sleep(for: .milliseconds(50))

    await service.scheduleReminder(title: "Test", body: "Body", fireAt: Date().addingTimeInterval(3600))

    #expect(mock.scheduledRequests.isEmpty)
    #expect(service.lastError != nil)
    #expect(service.lastError?.contains("not authorized") == true)
}

@Test("Recurring notification with no weekdays defaults to daily")
@MainActor
func recurringNotificationEdgeCase() async {
    let mock = MockNotificationCenter()
    let defaults = UserDefaults(suiteName: "test.notifications.recurring")!
    defaults.removePersistentDomain(forName: "test.notifications.recurring")
    defaults.set(true, forKey: "integration.notifications.enabled")

    let service = NotificationService(center: mock, defaults: defaults)
    // Wait for authorization refresh
    try? await Task.sleep(for: .milliseconds(50))

    await service.scheduleRecurringReminder(
        id: "habit-1",
        title: "Daily Habit",
        body: "Do it",
        hour: 9,
        minute: 0,
        weekdays: nil
    )

    #expect(mock.scheduledRequests.count == 1)
    let request = mock.scheduledRequests.first
    #expect(request?.identifier == "habit-1")

    // Verify trigger is calendar-based and repeating
    let trigger = request?.trigger as? UNCalendarNotificationTrigger
    #expect(trigger != nil)
    #expect(trigger?.repeats == true)

    // Verify date components (daily = hour + minute only, no weekday)
    let components = trigger?.dateComponents
    #expect(components?.hour == 9)
    #expect(components?.minute == 0)
    #expect(components?.weekday == nil)
}

@Test("Habit reminder uses time-sensitive interruption level")
@MainActor
func habitReminderTimeSensitive() async {
    let mock = MockNotificationCenter()
    let defaults = UserDefaults(suiteName: "test.notifications.habit")!
    defaults.removePersistentDomain(forName: "test.notifications.habit")
    defaults.set(true, forKey: "integration.notifications.enabled")

    let service = NotificationService(center: mock, defaults: defaults)
    try? await Task.sleep(for: .milliseconds(50))

    let habitId = UUID()
    await service.scheduleHabitReminder(
        habitId: habitId,
        title: "Morning Routine",
        body: "Time for your habit",
        hour: 7,
        minute: 30,
        weekdays: nil
    )

    #expect(mock.scheduledRequests.count == 1)
    let request = mock.scheduledRequests.first
    #expect(request?.content.interruptionLevel == .timeSensitive)
    #expect(request?.content.categoryIdentifier == NotificationCategory.habitReminder.rawValue)
}

@Test("Cancel reminder removes exact and weekday variants")
@MainActor
func cancelReminderRemovesVariants() async {
    let mock = MockNotificationCenter()
    let defaults = UserDefaults(suiteName: "test.notifications.cancel")!
    defaults.removePersistentDomain(forName: "test.notifications.cancel")
    defaults.set(true, forKey: "integration.notifications.enabled")

    let service = NotificationService(center: mock, defaults: defaults)

    service.cancelReminder(id: "test-reminder")

    // Should remove the base ID plus all 7 weekday variants
    #expect(mock.removedIdentifiers.count == 8)
    #expect(mock.removedIdentifiers.contains("test-reminder"))
    #expect(mock.removedIdentifiers.contains("test-reminder-1"))
    #expect(mock.removedIdentifiers.contains("test-reminder-7"))
}

@Test("Snooze preference persists and retrieves correctly")
@MainActor
func snoozePreferencePersistence() async {
    let mock = MockNotificationCenter()
    let defaults = UserDefaults(suiteName: "test.notifications.snooze")!
    defaults.removePersistentDomain(forName: "test.notifications.snooze")

    let service = NotificationService(center: mock, defaults: defaults)

    // Default should be 10 minutes
    #expect(service.snoozePreference == .tenMinutes)

    // Change to 30 minutes
    service.snoozePreference = .thirtyMinutes
    #expect(service.snoozePreference == .thirtyMinutes)

    // Create new service with same defaults - should persist
    let service2 = NotificationService(center: mock, defaults: defaults)
    #expect(service2.snoozePreference == .thirtyMinutes)
}

// MARK: - Phase 2 Tests

@Test("SnoozeOption displayName is alias for label")
func snoozeOptionDisplayNameAlias() {
    for option in SnoozeOption.allCases {
        #expect(option.displayName == option.label)
    }
}

@Test("Cancel all habit reminders removes only habit-prefixed identifiers")
@MainActor
func cancelAllHabitReminders() async {
    let mock = MockNotificationCenter()
    let defaults = UserDefaults(suiteName: "test.notifications.cancelAll")!
    defaults.removePersistentDomain(forName: "test.notifications.cancelAll")
    defaults.set(true, forKey: "integration.notifications.enabled")

    let service = NotificationService(center: mock, defaults: defaults)
    try? await Task.sleep(for: .milliseconds(50))

    // Schedule mixed notifications
    let habitId1 = UUID()
    let habitId2 = UUID()
    await service.scheduleHabitReminder(habitId: habitId1, title: "Habit 1", body: "Do it", hour: 9, minute: 0, weekdays: nil)
    await service.scheduleHabitReminder(habitId: habitId2, title: "Habit 2", body: "Do it", hour: 10, minute: 0, weekdays: nil)
    await service.scheduleReminder(title: "General", body: "Not a habit", fireAt: Date().addingTimeInterval(3600))

    #expect(mock.scheduledRequests.count == 3)

    // Cancel all habit reminders
    await service.cancelAllHabitReminders()

    // Only the general reminder should remain
    #expect(mock.scheduledRequests.count == 1)
    #expect(mock.scheduledRequests.first?.content.title == "General")
}

@Test("Snooze notification by identifier re-schedules with same content")
@MainActor
func snoozeNotificationByIdentifier() async {
    let mock = MockNotificationCenter()
    let defaults = UserDefaults(suiteName: "test.notifications.snoozeById")!
    defaults.removePersistentDomain(forName: "test.notifications.snoozeById")
    defaults.set(true, forKey: "integration.notifications.enabled")

    let service = NotificationService(center: mock, defaults: defaults)
    try? await Task.sleep(for: .milliseconds(50))

    // Schedule a habit reminder
    let habitId = UUID()
    await service.scheduleHabitReminder(habitId: habitId, title: "Test Habit", body: "Time to do it", hour: 9, minute: 0, weekdays: nil)

    #expect(mock.scheduledRequests.count == 1)
    let originalId = mock.scheduledRequests.first!.identifier

    // Snooze by identifier
    await service.snoozeNotification(identifier: originalId)

    // Should have original + snoozed notification
    #expect(mock.scheduledRequests.count == 2)

    // Find the snoozed notification
    let snoozedRequest = mock.scheduledRequests.first { $0.identifier.hasPrefix("snooze-") }
    #expect(snoozedRequest != nil)
    #expect(snoozedRequest?.content.title == "Test Habit")
    #expect(snoozedRequest?.content.body == "Time to do it")

    // Verify it's a time interval trigger with snooze preference delay
    let trigger = snoozedRequest?.trigger as? UNTimeIntervalNotificationTrigger
    #expect(trigger != nil)
    #expect(trigger?.timeInterval == service.snoozePreference.timeInterval)
}

@Test("Snooze notification preserves habitId in userInfo")
@MainActor
func snoozeNotificationPreservesUserInfo() async {
    let mock = MockNotificationCenter()
    let defaults = UserDefaults(suiteName: "test.notifications.snoozeUserInfo")!
    defaults.removePersistentDomain(forName: "test.notifications.snoozeUserInfo")
    defaults.set(true, forKey: "integration.notifications.enabled")

    let service = NotificationService(center: mock, defaults: defaults)
    try? await Task.sleep(for: .milliseconds(50))

    // Schedule a habit reminder
    let habitId = UUID()
    await service.scheduleHabitReminder(habitId: habitId, title: "Habit", body: "Do it", hour: 9, minute: 0, weekdays: nil)

    let originalId = mock.scheduledRequests.first!.identifier

    // Snooze by identifier
    await service.snoozeNotification(identifier: originalId)

    // Find the snoozed notification
    let snoozedRequest = mock.scheduledRequests.first { $0.identifier.hasPrefix("snooze-") }
    #expect(snoozedRequest != nil)

    // Verify habitId is preserved
    let snoozedHabitId = snoozedRequest?.content.userInfo["habitId"] as? String
    #expect(snoozedHabitId == habitId.uuidString)
}

// MARK: - Phase 3 Tests (Push Notifications)

@Test("Device token data converts to hex string correctly")
func deviceTokenConversion() {
    let tokenData = Data([0xAB, 0xCD, 0xEF, 0x12, 0x34, 0x56, 0x78, 0x9A])
    let tokenString = tokenData.map { String(format: "%02.2hhx", $0) }.joined()
    #expect(tokenString == "abcdef123456789a")
}

@Test("Device token insert model encodes with correct keys")
func deviceTokenInsertEncoding() throws {
    let userId = UUID()
    let insert = SupabaseDeviceTokenInsert(
        userId: userId,
        token: "abc123",
        platform: "ios",
        deviceName: "iPhone",
        appVersion: "1.0.0"
    )

    let encoder = JSONEncoder()
    let data = try encoder.encode(insert)
    let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]

    #expect(json?["user_id"] as? String == userId.uuidString)
    #expect(json?["token"] as? String == "abc123")
    #expect(json?["platform"] as? String == "ios")
    #expect(json?["device_name"] as? String == "iPhone")
    #expect(json?["app_version"] as? String == "1.0.0")
}

@Test("Push notification request encodes with correct keys")
func pushNotificationRequestEncoding() throws {
    let userId = UUID()
    let request = SendPushNotificationRequest(
        userId: userId,
        title: "Test Title",
        body: "Test Body",
        category: "habitReminder",
        data: ["habitId": "123"]
    )

    let encoder = JSONEncoder()
    let data = try encoder.encode(request)
    let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]

    #expect(json?["user_id"] as? String == userId.uuidString)
    #expect(json?["title"] as? String == "Test Title")
    #expect(json?["body"] as? String == "Test Body")
    #expect(json?["category"] as? String == "habitReminder")
    #expect((json?["data"] as? [String: String])?["habitId"] == "123")
}

@Test("Push notification response decodes correctly")
func pushNotificationResponseDecoding() throws {
    let jsonString = #"{"sent": 3, "failed": 1}"#
    let data = jsonString.data(using: .utf8)!
    let decoder = JSONDecoder()

    let response = try decoder.decode(SendPushNotificationResponse.self, from: data)
    #expect(response.sent == 3)
    #expect(response.failed == 1)
}

@Test("Device token row decodes with snake_case keys")
func deviceTokenRowDecoding() throws {
    let id = UUID()
    let userId = UUID()
    let jsonString = """
    {
        "id": "\(id.uuidString)",
        "user_id": "\(userId.uuidString)",
        "token": "abc123def456",
        "platform": "ios",
        "device_name": "iPhone 15 Pro",
        "app_version": "2.1.0",
        "created_at": "2026-01-07T12:00:00Z",
        "updated_at": "2026-01-07T12:30:00Z"
    }
    """
    let data = jsonString.data(using: .utf8)!
    let decoder = JSONDecoder()

    let row = try decoder.decode(SupabaseDeviceTokenRow.self, from: data)
    #expect(row.id == id)
    #expect(row.userId == userId)
    #expect(row.token == "abc123def456")
    #expect(row.platform == "ios")
    #expect(row.deviceName == "iPhone 15 Pro")
    #expect(row.appVersion == "2.1.0")
}
