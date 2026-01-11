import SwiftUI

public struct ContentView: View {
    @State private var selectedTab: Tab = .dashboard
    @Environment(AppStore.self) private var appStore
    @Environment(LocalPersistenceService.self) private var persistenceService
    @Environment(SupabaseAuthStore.self) private var authStore
    @Environment(SupabaseSyncService.self) private var syncService
    @Environment(NetworkMonitorService.self) private var networkMonitor
    @Environment(CapturePipelineService.self) private var capturePipeline

    public var body: some View {
        AppShellView(selectedTab: $selectedTab)
            .task {
                persistenceService.load(into: appStore)
                authStore.startListening()
                await authStore.loadSession()
                if syncService.isEnabled {
                    await syncService.loadAll()
                    await syncService.startRealtime()
                    await syncService.flushPendingOperations()
                }
                if networkMonitor.isConnected {
                    await capturePipeline.recoverPendingCaptures()
                }
            }
            .onChange(of: authStore.userId) { _, newValue in
                if newValue == nil {
                    syncService.stopRealtime()
                    return
                }
                if syncService.isEnabled {
                    Task {
                        await syncService.loadAll()
                        await syncService.startRealtime()
                        await syncService.flushPendingOperations()
                    }
                }
            }
            .onChange(of: syncService.isEnabled) { _, newValue in
                if newValue {
                    Task {
                        await syncService.loadAll()
                        await syncService.startRealtime()
                        await syncService.flushPendingOperations()
                    }
                } else {
                    syncService.stopRealtime()
                }
            }
            .onChange(of: networkMonitor.isConnected) { _, isConnected in
                guard isConnected else { return }
                Swift.Task { await capturePipeline.recoverPendingCaptures() }
            }
    }
    
    public init() {}
}

enum Tab: String, CaseIterable, Identifiable {
    case dashboard
    case habits
    case calendar
    case plan
    case timeline
    case more

    var id: String { rawValue }

    var title: String {
        switch self {
        case .dashboard:
            return "Home"
        case .habits:
            return "Habits"
        case .calendar:
            return "Calendar"
        case .plan:
            return "Plan"
        case .timeline:
            return "Timeline"
        case .more:
            return "More"
        }
    }

    var systemImage: String {
        switch self {
        case .dashboard:
            return "chart.line.uptrend.xyaxis"
        case .habits:
            return "figure.strengthtraining.traditional"
        case .calendar:
            return "calendar"
        case .plan:
            return "checklist"
        case .timeline:
            return "list.bullet.rectangle"
        case .more:
            return "square.grid.2x2"
        }
    }

    var accessibilityLabel: String {
        switch self {
        case .dashboard:
            return "Home dashboard with metrics overview"
        case .habits:
            return "Habits tracking and management"
        case .calendar:
            return "Calendar view for events and scheduling"
        case .plan:
            return "Plan view for tasks and goals"
        case .timeline:
            return "Timeline of all entries and activities"
        case .more:
            return "More options and settings"
        }
    }
}
