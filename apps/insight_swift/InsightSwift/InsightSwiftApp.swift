import SwiftUI
import InsightSwiftFeature

@main
struct InsightSwiftApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @Environment(\.scenePhase) private var scenePhase

    private let supabaseService = SupabaseService()
    private let liveActivityManager = LiveActivityManager()
    private let recordingCoordinator: RecordingCoordinator
    private let persistenceService = LocalPersistenceService()
    private let appStore: AppStore
    private let themeStore = ThemeStore()
    private let captureParserService = CaptureParserService()
    private let networkMonitor: NetworkMonitorService
    private let captureTranscriber: CaptureEdgeFunctionTranscriber
    private let capturePipelineService: CapturePipelineService
    private let notificationService = NotificationService()
    private let healthKitService = HealthKitService()
    private let calendarSyncService = CalendarSyncService()
    private let authStore: SupabaseAuthStore
    private let syncService: SupabaseSyncService

    init() {
        recordingCoordinator = RecordingCoordinator(liveActivityManager: liveActivityManager)
        let appStore = AppStore.seeded()
        appStore.attachPersistence(persistenceService)
        appStore.attachLiveActivityManager(liveActivityManager)
        appStore.attachNotificationService(notificationService)
        self.appStore = appStore
        authStore = SupabaseAuthStore(supabase: supabaseService)
        networkMonitor = NetworkMonitorService()
        syncService = SupabaseSyncService(
            supabase: supabaseService,
            authStore: authStore,
            appStore: appStore,
            persistence: persistenceService
        )
        captureTranscriber = CaptureEdgeFunctionTranscriber(
            supabase: supabaseService,
            authStore: authStore
        )
        capturePipelineService = CapturePipelineService(
            parserService: captureParserService,
            recordingCoordinator: recordingCoordinator,
            transcriber: captureTranscriber,
            isOnline: { networkMonitor.isConnected }
        )

        // Wire services to AppDelegate for notification action handling
        appDelegate.appStore = appStore
        appDelegate.notificationService = notificationService
        appDelegate.syncService = syncService
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(supabaseService)
                .environment(liveActivityManager)
                .environment(recordingCoordinator)
                .environment(appStore)
                .environment(persistenceService)
                .environment(themeStore)
                .environment(captureParserService)
                .environment(networkMonitor)
                .environment(capturePipelineService)
                .environment(notificationService)
                .environment(healthKitService)
                .environment(calendarSyncService)
                .environment(authStore)
                .environment(syncService)
                .onChange(of: scenePhase) { _, phase in
                    recordingCoordinator.handleScenePhase(phase)
                    if phase == .active {
                        recordingCoordinator.consumeLiveActivityTriggerIfNeeded()
                        Task { await notificationService.refreshAuthorizationStatus() }
                        healthKitService.refreshAuthorizationStatus()
                        calendarSyncService.refreshAuthorizationStatus()
                    }
                }
        }
    }
}
