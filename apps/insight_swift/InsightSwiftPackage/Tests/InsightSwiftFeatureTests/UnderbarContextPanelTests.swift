import CoreGraphics
import Foundation
import SwiftUI
import Testing
@testable import InsightSwiftFeature

struct UnderbarContextPanelTests {
    @Test("Underbar renders with primary actions")
    @MainActor
    func underbarRenders() {
        let theme = ThemeStore()
        let view = UnderbarView(
            isRecording: false,
            hasActiveFocus: false,
            captureAction: {},
            searchAction: {},
            focusAction: {},
            contextAction: {}
        )
        .environment(theme)

        let image = render(view)
        #expect(image != nil)
    }

    @Test("Context panel renders with active focus")
    @MainActor
    func contextPanelRenders() {
        let theme = ThemeStore()
        let appStore = AppStore()
        appStore.startFocusSession(title: "Deep work")
        let view = ContextPanelView(
            pendingReviewCount: 2,
            activeGoal: Goal(title: "Ship Insight"),
            activeProject: Project(title: "Insight Swift build"),
            stopFocusAction: appStore.stopFocusSession
        )
        .environment(appStore)
        .environment(theme)

        let image = render(view)
        #expect(image != nil)
    }

    @Test("App shell renders iPhone underbar")
    @MainActor
    func shellRendersUnderbarPhone() {
        var tab: Tab = .dashboard
        let view = AppShellView(selectedTab: Binding(get: { tab }, set: { tab = $0 }))
            .environment(AppStore.seeded())
            .environment(ThemeStore())
            .environment(RecordingCoordinator(liveActivityManager: LiveActivityManager()))
            .environment(\.horizontalSizeClass, .compact)
        let image = render(view, size: .init(width: 390, height: 844))
        #expect(image != nil)
    }

    @Test("App shell renders iPad sidebar + underbar")
    @MainActor
    func shellRendersUnderbarPad() {
        var tab: Tab = .dashboard
        let view = AppShellView(selectedTab: Binding(get: { tab }, set: { tab = $0 }))
            .environment(AppStore.seeded())
            .environment(ThemeStore())
            .environment(RecordingCoordinator(liveActivityManager: LiveActivityManager()))
            .environment(\.horizontalSizeClass, .regular)
        let image = render(view, size: .init(width: 1366, height: 1024))
        #expect(image != nil)
    }
}

@MainActor
private func render<V: View>(_ view: V, size: CGSize = .init(width: 390, height: 844)) -> CGImage? {
    let renderer = ImageRenderer(content: view)
    renderer.proposedSize = ProposedViewSize(width: size.width, height: size.height)
    return renderer.cgImage
}
