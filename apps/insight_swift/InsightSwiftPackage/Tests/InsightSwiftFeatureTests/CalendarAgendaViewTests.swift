import CoreGraphics
import Foundation
import SwiftUI
import Testing
@testable import InsightSwiftFeature

struct CalendarAgendaViewTests {
    @Test("CalendarView renders with seeded data")
    @MainActor
    func calendarViewRenders() {
        let env = TestEnvironment()
        let view = CalendarView()
            .environment(env.appStore)
            .environment(env.theme)
            .environment(env.syncService)

        let image = render(view)
        #expect(image != nil)
    }

    @Test("PlanView renders agenda layout")
    @MainActor
    func planViewRenders() {
        let env = TestEnvironment()
        let view = PlanView()
            .environment(env.appStore)
            .environment(env.theme)

        let image = render(view)
        #expect(image != nil)
    }

    @Test("CalendarView renders all-day event edge case")
    @MainActor
    func calendarViewAllDayEdgeCase() {
        let calendar = Calendar.current
        let dayStart = calendar.startOfDay(for: Date())
        let dayEnd = calendar.date(byAdding: .day, value: 1, to: dayStart) ?? dayStart.addingTimeInterval(86_400)
        let entry = Entry(title: "All-day offsite", facets: [.event], startAt: dayStart, endAt: dayEnd, allDay: true)
        let appStore = AppStore(entries: [entry])
        let env = TestEnvironment(appStore: appStore)
        let view = CalendarView()
            .environment(env.appStore)
            .environment(env.theme)
            .environment(env.syncService)

        let image = render(view)
        #expect(image != nil)
    }

    @Test("TasksView renders empty state")
    @MainActor
    func tasksViewEmptyState() {
        let env = TestEnvironment(appStore: AppStore())
        let view = TasksView()
            .environment(env.appStore)
            .environment(env.theme)
            .environment(env.syncService)

        let image = render(view)
        #expect(image != nil)
    }

    @Test("HabitsView renders empty state")
    @MainActor
    func habitsViewEmptyState() {
        let env = TestEnvironment(appStore: AppStore())
        let view = HabitsView()
            .environment(env.appStore)
            .environment(env.theme)
            .environment(env.syncService)

        let image = render(view)
        #expect(image != nil)
    }

    @Test("NotesView renders empty state")
    @MainActor
    func notesViewEmptyState() {
        let env = TestEnvironment(appStore: AppStore())
        let view = NotesView()
            .environment(env.appStore)
            .environment(env.theme)
            .environment(env.syncService)

        let image = render(view)
        #expect(image != nil)
    }
}

@MainActor
private struct TestEnvironment {
    let appStore: AppStore
    let theme: ThemeStore
    let syncService: SupabaseSyncService

    init(appStore: AppStore = AppStore.seeded()) {
        let persistence = LocalPersistenceService()
        appStore.attachPersistence(persistence)
        let supabase = SupabaseService(url: URL(string: "https://example.supabase.co")!, anonKey: "test")
        let authStore = SupabaseAuthStore(supabase: supabase)
        let syncService = SupabaseSyncService(
            supabase: supabase,
            authStore: authStore,
            appStore: appStore,
            persistence: persistence
        )
        syncService.isEnabled = false
        self.appStore = appStore
        self.theme = ThemeStore()
        self.syncService = syncService
    }
}

@MainActor
private func render<V: View>(_ view: V) -> CGImage? {
    let renderer = ImageRenderer(content: view)
    renderer.proposedSize = ProposedViewSize(width: 390, height: 844)
    return renderer.cgImage
}
