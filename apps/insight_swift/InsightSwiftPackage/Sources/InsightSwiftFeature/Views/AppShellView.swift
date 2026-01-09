import SwiftUI

struct AppShellView: View {
    @Binding var selectedTab: Tab
    @Environment(RecordingCoordinator.self) private var recordingCoordinator
    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    private let pendingStore = CapturePendingStore()
    @State private var showCaptureSheet = false
    @State private var showAssistantSheet = false
    @State private var showFocusSheet = false
    @State private var showContextPanel = false
    @State private var splitVisibility: NavigationSplitViewVisibility = .all

    var body: some View {
        Group {
            if isRegularWidth {
                iPadShell
            } else {
                iPhoneShell
            }
        }
        .sheet(isPresented: $showCaptureSheet) {
            NavigationStack {
                CaptureView()
                    .toolbar {
                        ToolbarItem(placement: .topBarTrailing) {
                            Button("Done") {
                                showCaptureSheet = false
                            }
                            .foregroundStyle(theme.palette.tint)
                        }
                    }
            }
        }
        .sheet(isPresented: $showAssistantSheet) {
            NavigationStack {
                AssistantView()
            }
        }
        .sheet(isPresented: $showFocusSheet) {
            NavigationStack {
                FocusView()
            }
        }
        .sheet(isPresented: isRegularWidth ? .constant(false) : $showContextPanel) {
            NavigationStack {
                contextPanelContent
                    .navigationTitle("Context")
            }
            .presentationDetents([.medium, .large])
        }
    }

    private var isRegularWidth: Bool {
        horizontalSizeClass == .regular
    }

    private var iPhoneShell: some View {
        TabView(selection: $selectedTab) {
            ForEach(Tab.allCases) { tab in
                navigationRoot(for: tab)
                    .tabItem { Label(tab.title, systemImage: tab.systemImage) }
                    .tag(tab)
            }
        }
        .tint(theme.palette.tint)
        .safeAreaInset(edge: .bottom) {
            underbar
                .padding(.horizontal, theme.metrics.spacing)
                .padding(.bottom, theme.metrics.spacingSmall)
                .padding(.top, theme.metrics.spacingSmall)
        }
    }

    private var iPadShell: some View {
        NavigationSplitView(columnVisibility: $splitVisibility) {
            sidebar
        } detail: {
            HStack(spacing: 0) {
                ZStack(alignment: .bottomTrailing) {
                    navigationRoot(for: selectedTab)
                    underbar
                        .padding(.trailing, theme.metrics.spacing)
                        .padding(.bottom, theme.metrics.spacing)
                }
                if showContextPanel {
                    contextPanelContent
                        .frame(width: theme.metrics.panelWidth)
                        .transition(.move(edge: .trailing).combined(with: .opacity))
                        .padding(.trailing, theme.metrics.spacingSmall)
                }
            }
            .background(theme.palette.background)
            .animation(.easeInOut(duration: 0.2), value: showContextPanel)
        }
        .navigationSplitViewStyle(.balanced)
        .tint(theme.palette.tint)
    }

    private var sidebar: some View {
        List(selection: sidebarSelection) {
            Section {
                ForEach(Tab.allCases) { tab in
                    Label(tab.title, systemImage: tab.systemImage)
                        .font(AppFont.body(theme.metrics.bodyText))
                        .foregroundStyle(theme.palette.text)
                        .padding(.vertical, 6)
                        .tag(tab)
                }
            } header: {
                SidebarQuickActions(
                    captureAction: toggleCapture,
                    searchAction: openAssistant,
                    focusAction: handleFocus
                )
                .textCase(nil)
            }
        }
        .listStyle(.sidebar)
        .scrollContentBackground(.hidden)
        .background(theme.palette.background)
        .navigationTitle("Insight")
    }

    private var sidebarSelection: Binding<Tab?> {
        Binding(
            get: { selectedTab },
            set: { newValue in
                if let newValue {
                    selectedTab = newValue
                }
            }
        )
    }

    @ViewBuilder
    private func tabRootView(for tab: Tab) -> some View {
        switch tab {
        case .dashboard:
            DashboardView()
        case .habits:
            HabitsView()
        case .calendar:
            CalendarView()
        case .plan:
            PlanView()
        case .more:
            MoreView()
        }
    }

    private func navigationRoot(for tab: Tab) -> some View {
        NavigationStack {
            tabRootView(for: tab)
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Context") {
                            showContextPanel.toggle()
                        }
                        .foregroundStyle(theme.palette.tint)
                        .accessibilityIdentifier("nav.context")
                    }
                }
        }
    }

    private var underbar: some View {
        UnderbarView(
            isRecording: recordingCoordinator.isRecording,
            hasActiveFocus: appStore.activeFocusSession != nil,
            captureAction: toggleCapture,
            searchAction: openAssistant,
            focusAction: handleFocus,
            contextAction: { showContextPanel.toggle() }
        )
    }

    private var contextPanelContent: some View {
        ContextPanelView(
            pendingReviewCount: pendingStore.load().count,
            activeGoal: appStore.goals.first,
            activeProject: appStore.projects.first,
            stopFocusAction: appStore.stopFocusSession
        )
        .environment(appStore)
        .environment(theme)
    }

    private func toggleCapture() {
        if recordingCoordinator.isRecording {
            recordingCoordinator.stopRecording()
        } else {
            recordingCoordinator.startRecording(reason: "Capture")
        }
        showCaptureSheet = true
    }

    private func openAssistant() {
        showAssistantSheet = true
    }

    private func handleFocus() {
        if appStore.activeFocusSession != nil {
            appStore.stopFocusSession()
        } else {
            showFocusSheet = true
        }
    }
}

private struct SidebarQuickActions: View {
    let captureAction: () -> Void
    let searchAction: () -> Void
    let focusAction: () -> Void

    @Environment(ThemeStore.self) private var theme

    var body: some View {
        HStack(spacing: theme.metrics.spacingSmall) {
            sidebarAction("Capture", systemImage: "mic.fill", action: captureAction)
            sidebarAction("Search", systemImage: "sparkle.magnifyingglass", action: searchAction)
            sidebarAction("Focus", systemImage: "bolt.fill", action: focusAction)
        }
        .padding(.vertical, theme.metrics.spacingSmall)
    }

    private func sidebarAction(_ title: String, systemImage: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 6) {
                Image(systemName: systemImage)
                    .font(.system(size: theme.metrics.iconSizeSmall, weight: .semibold))
                Text(title)
                    .font(AppFont.body(theme.metrics.tinyText))
            }
            .foregroundStyle(theme.palette.text)
            .frame(maxWidth: .infinity)
            .frame(height: theme.metrics.buttonHeightSmall)
            .background(theme.palette.surfaceAlt)
            .clipShape(RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}
