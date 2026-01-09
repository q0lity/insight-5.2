import Foundation
import Observation
import UserNotifications

// MARK: - Notification Action Types

public enum NotificationAction: String, Sendable {
    case markComplete = "MARK_COMPLETE"
    case snooze = "SNOOZE"
}

public enum SnoozeOption: Int, CaseIterable, Sendable {
    case fiveMinutes = 5
    case tenMinutes = 10
    case thirtyMinutes = 30
    case oneHour = 60

    public var label: String {
        switch self {
        case .fiveMinutes: return "5 minutes"
        case .tenMinutes: return "10 minutes"
        case .thirtyMinutes: return "30 minutes"
        case .oneHour: return "1 hour"
        }
    }

    /// Alias for settings UI
    public var displayName: String { label }

    public var timeInterval: TimeInterval {
        TimeInterval(rawValue * 60)
    }
}

// MARK: - Notification Category

public enum NotificationCategory: String, Sendable {
    case habitReminder = "HABIT_REMINDER"
    case taskReminder = "TASK_REMINDER"
    case general = "GENERAL"
}

// MARK: - Authorization Status

public enum NotificationAuthorizationStatus: String, Sendable {
    case notDetermined
    case denied
    case authorized
    case provisional
    case ephemeral
}

extension NotificationAuthorizationStatus {
    init(_ status: UNAuthorizationStatus) {
        switch status {
        case .notDetermined:
            self = .notDetermined
        case .denied:
            self = .denied
        case .authorized:
            self = .authorized
        case .provisional:
            self = .provisional
        case .ephemeral:
            self = .ephemeral
        @unknown default:
            self = .notDetermined
        }
    }

    public var label: String {
        switch self {
        case .notDetermined:
            return "Not requested"
        case .denied:
            return "Denied"
        case .authorized:
            return "Authorized"
        case .provisional:
            return "Provisional"
        case .ephemeral:
            return "Ephemeral"
        }
    }

    public var isAuthorized: Bool {
        switch self {
        case .authorized, .provisional, .ephemeral:
            return true
        case .notDetermined, .denied:
            return false
        }
    }
}

// MARK: - NotificationService

@MainActor
@Observable
public final class NotificationService {
    public var isEnabled: Bool {
        didSet {
            defaults.set(isEnabled, forKey: Self.enabledKey)
            handleEnabledChange()
        }
    }

    public var snoozePreference: SnoozeOption {
        get {
            let rawValue = defaults.integer(forKey: Self.snoozeKey)
            return SnoozeOption(rawValue: rawValue) ?? .tenMinutes
        }
        set {
            defaults.set(newValue.rawValue, forKey: Self.snoozeKey)
        }
    }

    public private(set) var authorizationStatus: NotificationAuthorizationStatus = .notDetermined
    public private(set) var lastError: String?

    private let center: NotificationCenterClient
    private let defaults: UserDefaults

    private static let enabledKey = "integration.notifications.enabled"
    private static let snoozeKey = "integration.notifications.snoozeMinutes"

    public init(center: NotificationCenterClient = UNUserNotificationCenter.current(), defaults: UserDefaults = .standard) {
        self.center = center
        self.defaults = defaults
        self.isEnabled = defaults.object(forKey: Self.enabledKey) as? Bool ?? false
        Task { await refreshAuthorizationStatus() }
    }

    // MARK: - Authorization

    public func refreshAuthorizationStatus() async {
        let settings = await center.notificationSettings()
        authorizationStatus = NotificationAuthorizationStatus(settings.authorizationStatus)
    }

    public func requestAuthorizationIfNeeded() async {
        let settings = await center.notificationSettings()
        let status = NotificationAuthorizationStatus(settings.authorizationStatus)
        authorizationStatus = status
        lastError = nil

        switch status {
        case .notDetermined:
            do {
                let granted = try await center.requestAuthorization(options: [.alert, .badge, .sound])
                if !granted {
                    lastError = "Notifications not granted."
                }
            } catch {
                lastError = error.localizedDescription
            }
            await refreshAuthorizationStatus()
        case .denied:
            lastError = "Enable notifications in Settings to receive alerts."
        case .authorized, .provisional, .ephemeral:
            break
        }
    }

    // MARK: - Categories Registration

    public func registerCategories() {
        let markCompleteAction = UNNotificationAction(
            identifier: NotificationAction.markComplete.rawValue,
            title: "Mark Complete",
            options: [.foreground]
        )

        let snoozeAction = UNNotificationAction(
            identifier: NotificationAction.snooze.rawValue,
            title: "Snooze",
            options: []
        )

        let habitCategory = UNNotificationCategory(
            identifier: NotificationCategory.habitReminder.rawValue,
            actions: [markCompleteAction, snoozeAction],
            intentIdentifiers: [],
            options: []
        )

        let taskCategory = UNNotificationCategory(
            identifier: NotificationCategory.taskReminder.rawValue,
            actions: [markCompleteAction, snoozeAction],
            intentIdentifiers: [],
            options: []
        )

        let generalCategory = UNNotificationCategory(
            identifier: NotificationCategory.general.rawValue,
            actions: [snoozeAction],
            intentIdentifiers: [],
            options: []
        )

        center.setNotificationCategories([habitCategory, taskCategory, generalCategory])
    }

    // MARK: - Scheduling One-Time Reminders

    public func scheduleReminder(title: String, body: String, fireAt: Date) async {
        guard isEnabled else { return }
        guard authorizationStatus.isAuthorized else {
            lastError = "Notifications are not authorized."
            return
        }

        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        content.categoryIdentifier = NotificationCategory.general.rawValue

        let components = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: fireAt)
        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
        let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: trigger)

        do {
            try await center.add(request)
        } catch {
            lastError = error.localizedDescription
        }
    }

    // MARK: - Scheduling Habit Reminders (Time-Sensitive)

    public func scheduleHabitReminder(
        habitId: UUID,
        title: String,
        body: String,
        hour: Int,
        minute: Int,
        weekdays: [Int]?
    ) async {
        guard isEnabled else { return }
        guard authorizationStatus.isAuthorized else {
            lastError = "Notifications are not authorized."
            return
        }

        // Cancel existing reminder for this habit
        cancelReminder(id: habitReminderId(habitId))

        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        content.categoryIdentifier = NotificationCategory.habitReminder.rawValue
        content.interruptionLevel = .timeSensitive
        content.userInfo = ["habitId": habitId.uuidString]

        if let weekdays, !weekdays.isEmpty {
            // Schedule separate notification for each weekday
            for weekday in weekdays {
                var components = DateComponents()
                components.hour = hour
                components.minute = minute
                components.weekday = weekday

                let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: true)
                let identifier = "\(habitReminderId(habitId))-\(weekday)"
                let request = UNNotificationRequest(identifier: identifier, content: content, trigger: trigger)

                do {
                    try await center.add(request)
                } catch {
                    lastError = error.localizedDescription
                }
            }
        } else {
            // Daily reminder (no weekday filter)
            var components = DateComponents()
            components.hour = hour
            components.minute = minute

            let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: true)
            let request = UNNotificationRequest(identifier: habitReminderId(habitId), content: content, trigger: trigger)

            do {
                try await center.add(request)
            } catch {
                lastError = error.localizedDescription
            }
        }
    }

    // MARK: - Scheduling Recurring Reminders

    public func scheduleRecurringReminder(
        id: String,
        title: String,
        body: String,
        hour: Int,
        minute: Int,
        weekdays: [Int]?
    ) async {
        guard isEnabled else { return }
        guard authorizationStatus.isAuthorized else {
            lastError = "Notifications are not authorized."
            return
        }

        // Cancel existing reminder with this id
        cancelReminder(id: id)

        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        content.categoryIdentifier = NotificationCategory.general.rawValue

        if let weekdays, !weekdays.isEmpty {
            for weekday in weekdays {
                var components = DateComponents()
                components.hour = hour
                components.minute = minute
                components.weekday = weekday

                let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: true)
                let identifier = "\(id)-\(weekday)"
                let request = UNNotificationRequest(identifier: identifier, content: content, trigger: trigger)

                do {
                    try await center.add(request)
                } catch {
                    lastError = error.localizedDescription
                }
            }
        } else {
            // Daily (no weekday specified)
            var components = DateComponents()
            components.hour = hour
            components.minute = minute

            let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: true)
            let request = UNNotificationRequest(identifier: id, content: content, trigger: trigger)

            do {
                try await center.add(request)
            } catch {
                lastError = error.localizedDescription
            }
        }
    }

    // MARK: - Snooze Support

    /// Snooze a notification by identifier - re-schedules it with the same content after snoozePreference delay
    public func snoozeNotification(identifier: String) async {
        guard isEnabled else { return }
        guard authorizationStatus.isAuthorized else {
            lastError = "Notifications are not authorized."
            return
        }

        // Find the pending request to extract its content
        let requests = await center.pendingNotificationRequests()
        guard let originalRequest = requests.first(where: { $0.identifier == identifier }) else {
            // If not found in pending, it may have already fired - just schedule with generic content
            await snoozeNotification(originalId: identifier, title: "Reminder", body: "Snoozed reminder")
            return
        }

        let content = originalRequest.content
        let categoryId = content.categoryIdentifier
        let category = NotificationCategory(rawValue: categoryId) ?? .general

        await snoozeNotification(
            originalId: identifier,
            title: content.title,
            body: content.body,
            category: category,
            userInfo: content.userInfo
        )
    }

    public func snoozeNotification(originalId: String, title: String, body: String, category: NotificationCategory = .general, userInfo: [AnyHashable: Any] = [:]) async {
        guard isEnabled else { return }
        guard authorizationStatus.isAuthorized else {
            lastError = "Notifications are not authorized."
            return
        }

        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        content.categoryIdentifier = category.rawValue
        content.userInfo = userInfo

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: snoozePreference.timeInterval, repeats: false)
        let snoozeId = "snooze-\(originalId)-\(UUID().uuidString)"
        let request = UNNotificationRequest(identifier: snoozeId, content: content, trigger: trigger)

        do {
            try await center.add(request)
        } catch {
            lastError = error.localizedDescription
        }
    }

    // MARK: - Cancellation

    public func cancelReminder(id: String) {
        // Remove exact match and any weekday variants
        let weekdayIds = (1...7).map { "\(id)-\($0)" }
        center.removePendingNotificationRequests(withIdentifiers: [id] + weekdayIds)
    }

    public func cancelHabitReminder(habitId: UUID) {
        cancelReminder(id: habitReminderId(habitId))
    }

    public func cancelAllReminders() {
        center.removeAllPendingNotificationRequests()
    }

    /// Cancel all habit-related reminders (identifiers prefixed with "habit-")
    public func cancelAllHabitReminders() async {
        let requests = await center.pendingNotificationRequests()
        let habitIds = requests
            .filter { $0.identifier.hasPrefix("habit-") }
            .map { $0.identifier }
        center.removePendingNotificationRequests(withIdentifiers: habitIds)
    }

    // MARK: - Pending Notifications

    public func pendingNotificationCount() async -> Int {
        let requests = await center.pendingNotificationRequests()
        return requests.count
    }

    // MARK: - Private Helpers

    private func habitReminderId(_ habitId: UUID) -> String {
        "habit-\(habitId.uuidString)"
    }

    private func handleEnabledChange() {
        lastError = nil
        guard isEnabled else { return }
        Task { [weak self] in
            await self?.requestAuthorizationIfNeeded()
            self?.registerCategories()
        }
    }
}
