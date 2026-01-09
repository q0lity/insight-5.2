import UIKit
import UserNotifications
import InsightSwiftFeature

class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    weak var appStore: AppStore?
    weak var notificationService: NotificationService?
    weak var syncService: SupabaseSyncService?

    /// Stored device token for re-registration after auth state changes
    private var pendingDeviceToken: Data?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = self

        // Register background tasks for calendar sync
        BackgroundSyncScheduler.shared.registerTasks()

        return true
    }

    // MARK: - Remote Notifications (Push)

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        pendingDeviceToken = deviceToken
        uploadDeviceTokenIfAuthenticated()
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        print("Failed to register for remote notifications: \(error.localizedDescription)")
    }

    /// Call this when auth state changes to upload pending token
    func uploadDeviceTokenIfAuthenticated() {
        guard let token = pendingDeviceToken, let sync = syncService else { return }
        Task {
            do {
                try await sync.registerDeviceToken(token)
            } catch {
                print("Failed to register device token: \(error.localizedDescription)")
            }
        }
    }

    /// Call this on sign out to remove device tokens
    func removeDeviceTokensOnSignOut() {
        guard let sync = syncService else { return }
        Task {
            do {
                try await sync.removeAllDeviceTokens()
            } catch {
                print("Failed to remove device tokens: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Scene Lifecycle for Background Sync

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Schedule background tasks when app enters background
        BackgroundSyncScheduler.shared.applicationDidEnterBackground()
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Trigger sync when app becomes active
        Task { @MainActor in
            await BackgroundSyncScheduler.shared.applicationDidBecomeActive()
        }
    }

    // MARK: - UNUserNotificationCenterDelegate

    /// Handle notification when app is in foreground
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        return [.banner, .sound]
    }

    /// Handle notification action responses (Mark Complete, Snooze, tap)
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        let userInfo = response.notification.request.content.userInfo

        // Extract habitId from notification userInfo
        guard let habitIdString = userInfo["habitId"] as? String,
              let habitId = UUID(uuidString: habitIdString) else {
            return
        }

        switch response.actionIdentifier {
        case NotificationAction.markComplete.rawValue:
            await handleMarkComplete(habitId: habitId)
        case NotificationAction.snooze.rawValue:
            await handleSnooze(originalRequest: response.notification.request)
        case UNNotificationDefaultActionIdentifier:
            // User tapped the notification - no special handling needed
            break
        case UNNotificationDismissActionIdentifier:
            // User dismissed the notification - no special handling needed
            break
        default:
            break
        }
    }

    // MARK: - Action Handlers

    private func handleMarkComplete(habitId: UUID) async {
        guard let store = appStore,
              let habit = store.habits.first(where: { $0.id == habitId }) else {
            return
        }
        await MainActor.run {
            store.logHabit(habit)
        }
    }

    private func handleSnooze(originalRequest: UNNotificationRequest) async {
        guard let service = notificationService else { return }
        await service.snoozeNotification(identifier: originalRequest.identifier)
    }
}
