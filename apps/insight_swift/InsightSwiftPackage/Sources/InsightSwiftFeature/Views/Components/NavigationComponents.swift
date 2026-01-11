import SwiftUI

// MARK: - Haptic Feedback Manager

@MainActor
final class HapticManager {
    static let shared = HapticManager()

    private let impactLight = UIImpactFeedbackGenerator(style: .light)
    private let impactMedium = UIImpactFeedbackGenerator(style: .medium)
    private let impactHeavy = UIImpactFeedbackGenerator(style: .heavy)
    private let selectionGenerator = UISelectionFeedbackGenerator()
    private let notification = UINotificationFeedbackGenerator()

    private init() {
        impactLight.prepare()
        impactMedium.prepare()
        selectionGenerator.prepare()
    }

    func impact(_ style: UIImpactFeedbackGenerator.FeedbackStyle = .medium) {
        switch style {
        case .light:
            impactLight.impactOccurred()
        case .medium:
            impactMedium.impactOccurred()
        case .heavy:
            impactHeavy.impactOccurred()
        default:
            impactMedium.impactOccurred()
        }
    }

    func selection() {
        selectionGenerator.selectionChanged()
    }

    func notification(_ type: UINotificationFeedbackGenerator.FeedbackType) {
        notification.notificationOccurred(type)
    }
}

// MARK: - Spring Animation Constants

enum NavigationAnimation {
    static let springResponse: CGFloat = 0.35
    static let springDamping: CGFloat = 0.75
    static let springBlend: CGFloat = 0.3

    static var spring: Animation {
        .spring(response: springResponse, dampingFraction: springDamping, blendDuration: springBlend)
    }

    static var springBouncy: Animation {
        .spring(response: 0.4, dampingFraction: 0.65, blendDuration: 0.2)
    }

    static var springStiff: Animation {
        .spring(response: 0.25, dampingFraction: 0.85, blendDuration: 0.1)
    }
}

// MARK: - Floating Tab Bar

struct FloatingTabBar<T: Hashable & CaseIterable & Identifiable>: View where T.AllCases: RandomAccessCollection {
    @Binding var selectedTab: T
    let tabs: [T]
    let title: (T) -> String
    let icon: (T) -> String

    @Environment(ThemeStore.self) private var theme
    @Namespace private var tabNamespace
    @State private var pressedTab: T?

    init(
        selectedTab: Binding<T>,
        title: @escaping (T) -> String,
        icon: @escaping (T) -> String
    ) {
        self._selectedTab = selectedTab
        self.tabs = Array(T.allCases)
        self.title = title
        self.icon = icon
    }

    var body: some View {
        HStack(spacing: 0) {
            ForEach(tabs, id: \.id) { tab in
                tabButton(for: tab)
            }
        }
        .padding(.horizontal, theme.metrics.spacingSmall)
        .frame(height: theme.metrics.underbarHeight)
        .background {
            glassmorphicBackground
        }
        .clipShape(Capsule())
        .shadow(color: theme.palette.borderLight.opacity(0.5), radius: 16, x: 0, y: 8)
        .padding(.horizontal, theme.metrics.spacing)
    }

    private func tabButton(for tab: T) -> some View {
        let isSelected = selectedTab == tab
        let isPressed = pressedTab == tab

        return Button {
            guard selectedTab != tab else { return }
            HapticManager.shared.selection()
            withAnimation(NavigationAnimation.spring) {
                selectedTab = tab
            }
        } label: {
            VStack(spacing: 4) {
                ZStack {
                    if isSelected {
                        Capsule()
                            .fill(theme.palette.tint.opacity(theme.isDark ? 0.25 : 0.15))
                            .matchedGeometryEffect(id: "tabIndicator", in: tabNamespace)
                    }

                    Image(systemName: icon(tab))
                        .font(.system(size: theme.metrics.iconSizeSmall, weight: isSelected ? .semibold : .regular))
                        .foregroundStyle(isSelected ? theme.palette.tint : theme.palette.textSecondary)
                        .symbolEffect(.bounce, value: isSelected)
                }
                .frame(height: 32)

                Text(title(tab))
                    .font(AppFont.body(theme.metrics.tinyText))
                    .foregroundStyle(isSelected ? theme.palette.text : theme.palette.textSecondary)
            }
            .frame(maxWidth: .infinity)
            .scaleEffect(isPressed ? 0.92 : 1.0)
        }
        .buttonStyle(.plain)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in
                    if pressedTab != tab {
                        pressedTab = tab
                        HapticManager.shared.impact(.light)
                    }
                }
                .onEnded { _ in
                    pressedTab = nil
                }
        )
        .animation(NavigationAnimation.springStiff, value: isPressed)
        .accessibilityLabel(title(tab))
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    private var glassmorphicBackground: some View {
        ZStack {
            Rectangle()
                .fill(.ultraThinMaterial)

            Rectangle()
                .fill(theme.palette.surface.opacity(theme.isDark ? 0.7 : 0.85))

            Capsule()
                .strokeBorder(theme.palette.border.opacity(0.3), lineWidth: 0.5)
        }
    }
}

// MARK: - Animated Sidebar

struct AnimatedSidebar<Content: View, Header: View>: View {
    @Binding var isExpanded: Bool
    let collapsedWidth: CGFloat
    let expandedWidth: CGFloat
    let header: Header
    let content: Content

    @Environment(ThemeStore.self) private var theme
    @GestureState private var dragOffset: CGFloat = 0

    init(
        isExpanded: Binding<Bool>,
        collapsedWidth: CGFloat = 72,
        expandedWidth: CGFloat = 280,
        @ViewBuilder header: () -> Header,
        @ViewBuilder content: () -> Content
    ) {
        self._isExpanded = isExpanded
        self.collapsedWidth = collapsedWidth
        self.expandedWidth = expandedWidth
        self.header = header()
        self.content = content()
    }

    private var currentWidth: CGFloat {
        let base = isExpanded ? expandedWidth : collapsedWidth
        return max(collapsedWidth, min(expandedWidth, base + dragOffset))
    }

    var body: some View {
        VStack(spacing: 0) {
            sidebarHeader

            ScrollView {
                content
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .scrollContentBackground(.hidden)
        }
        .frame(width: currentWidth)
        .background(theme.palette.surface)
        .clipShape(
            UnevenRoundedRectangle(
                topLeadingRadius: 0,
                bottomLeadingRadius: 0,
                bottomTrailingRadius: theme.metrics.radius,
                topTrailingRadius: theme.metrics.radius
            )
        )
        .shadow(color: theme.palette.borderLight, radius: 8, x: 4, y: 0)
        .gesture(dragGesture)
        .animation(NavigationAnimation.spring, value: isExpanded)
        .animation(NavigationAnimation.springStiff, value: dragOffset)
    }

    private var sidebarHeader: some View {
        HStack {
            if isExpanded {
                header
                    .transition(.opacity.combined(with: .move(edge: .leading)))

                Spacer()
            }

            Button {
                HapticManager.shared.impact(.light)
                withAnimation(NavigationAnimation.spring) {
                    isExpanded.toggle()
                }
            } label: {
                Image(systemName: isExpanded ? "sidebar.left" : "sidebar.right")
                    .font(.system(size: theme.metrics.iconSizeSmall, weight: .medium))
                    .foregroundStyle(theme.palette.text)
                    .frame(width: 44, height: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(isExpanded ? "Collapse sidebar" : "Expand sidebar")
        }
        .padding(.horizontal, theme.metrics.spacingSmall)
        .frame(height: 60)
        .background(theme.palette.surfaceAlt)
    }

    private var dragGesture: some Gesture {
        DragGesture()
            .updating($dragOffset) { value, state, _ in
                state = value.translation.width
            }
            .onEnded { value in
                let velocity = value.predictedEndLocation.x - value.location.x
                let threshold: CGFloat = 50

                withAnimation(NavigationAnimation.spring) {
                    if velocity > threshold {
                        isExpanded = true
                    } else if velocity < -threshold {
                        isExpanded = false
                    } else {
                        let midpoint = (expandedWidth + collapsedWidth) / 2
                        isExpanded = currentWidth > midpoint
                    }
                }
                HapticManager.shared.impact(.medium)
            }
    }
}

// MARK: - Sidebar Item

struct SidebarItem: View {
    let title: String
    let systemImage: String
    let isSelected: Bool
    let isExpanded: Bool
    let action: () -> Void

    @Environment(ThemeStore.self) private var theme
    @State private var isHovered = false

    var body: some View {
        Button(action: {
            HapticManager.shared.selection()
            action()
        }) {
            HStack(spacing: theme.metrics.spacingSmall) {
                Image(systemName: systemImage)
                    .font(.system(size: theme.metrics.iconSizeSmall, weight: isSelected ? .semibold : .regular))
                    .foregroundStyle(isSelected ? theme.palette.tint : theme.palette.text)
                    .frame(width: 24)

                if isExpanded {
                    Text(title)
                        .font(AppFont.body(theme.metrics.bodyText))
                        .foregroundStyle(isSelected ? theme.palette.tint : theme.palette.text)
                        .lineLimit(1)
                        .transition(.opacity.combined(with: .move(edge: .leading)))

                    Spacer()
                }
            }
            .padding(.horizontal, theme.metrics.spacingSmall)
            .frame(height: theme.metrics.buttonHeightSmall)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background {
                if isSelected {
                    RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous)
                        .fill(theme.palette.tint.opacity(theme.isDark ? 0.2 : 0.1))
                } else if isHovered {
                    RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous)
                        .fill(theme.palette.surfaceAlt)
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .onHover { isHovered = $0 }
        .animation(NavigationAnimation.springStiff, value: isHovered)
        .accessibilityLabel(title)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

// MARK: - Slide-In Context Panel

struct SlideInContextPanel<Content: View>: View {
    @Binding var isPresented: Bool
    let width: CGFloat
    let edge: HorizontalEdge
    let content: Content

    @Environment(ThemeStore.self) private var theme
    @GestureState private var dragOffset: CGFloat = 0

    init(
        isPresented: Binding<Bool>,
        width: CGFloat = 320,
        edge: HorizontalEdge = .trailing,
        @ViewBuilder content: () -> Content
    ) {
        self._isPresented = isPresented
        self.width = width
        self.edge = edge
        self.content = content()
    }

    private var offset: CGFloat {
        let base = isPresented ? 0 : (edge == .trailing ? width : -width)
        let drag = edge == .trailing ? max(0, dragOffset) : min(0, dragOffset)
        return base + drag
    }

    var body: some View {
        ZStack(alignment: edge == .trailing ? .trailing : .leading) {
            if isPresented {
                Color.black.opacity(0.3)
                    .ignoresSafeArea()
                    .onTapGesture {
                        HapticManager.shared.impact(.light)
                        withAnimation(NavigationAnimation.spring) {
                            isPresented = false
                        }
                    }
                    .transition(.opacity)
            }

            content
                .frame(width: width)
                .frame(maxHeight: .infinity)
                .background(theme.palette.surface)
                .clipShape(
                    UnevenRoundedRectangle(
                        topLeadingRadius: edge == .trailing ? theme.metrics.radius : 0,
                        bottomLeadingRadius: edge == .trailing ? theme.metrics.radius : 0,
                        bottomTrailingRadius: edge == .leading ? theme.metrics.radius : 0,
                        topTrailingRadius: edge == .leading ? theme.metrics.radius : 0
                    )
                )
                .shadow(color: theme.palette.borderLight, radius: 20, x: edge == .trailing ? -8 : 8, y: 0)
                .offset(x: offset)
                .gesture(panelDragGesture)
        }
        .animation(NavigationAnimation.spring, value: isPresented)
    }

    private var panelDragGesture: some Gesture {
        DragGesture()
            .updating($dragOffset) { value, state, _ in
                state = value.translation.width
            }
            .onEnded { value in
                let velocity = value.predictedEndLocation.x - value.location.x
                let threshold: CGFloat = 100

                withAnimation(NavigationAnimation.spring) {
                    if edge == .trailing {
                        isPresented = velocity < threshold
                    } else {
                        isPresented = velocity > -threshold
                    }
                }
                HapticManager.shared.impact(.medium)
            }
    }
}

// MARK: - Bottom Sheet

enum SheetDetent: CGFloat, CaseIterable {
    case small = 0.25
    case medium = 0.5
    case large = 0.85
    case full = 1.0

    var fraction: CGFloat { rawValue }
}

struct BottomSheetView<Content: View>: View {
    @Binding var isPresented: Bool
    @Binding var selectedDetent: SheetDetent
    let detents: [SheetDetent]
    let content: Content

    @Environment(ThemeStore.self) private var theme
    @GestureState private var dragOffset: CGFloat = 0
    @State private var containerHeight: CGFloat = 0

    init(
        isPresented: Binding<Bool>,
        selectedDetent: Binding<SheetDetent>,
        detents: [SheetDetent] = [.medium, .large],
        @ViewBuilder content: () -> Content
    ) {
        self._isPresented = isPresented
        self._selectedDetent = selectedDetent
        self.detents = detents.sorted { $0.fraction < $1.fraction }
        self.content = content()
    }

    private var sheetHeight: CGFloat {
        containerHeight * selectedDetent.fraction
    }

    private var currentOffset: CGFloat {
        isPresented ? max(0, dragOffset) : containerHeight
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .bottom) {
                if isPresented {
                    Color.black.opacity(dimmingOpacity)
                        .ignoresSafeArea()
                        .onTapGesture {
                            HapticManager.shared.impact(.light)
                            withAnimation(NavigationAnimation.spring) {
                                isPresented = false
                            }
                        }
                        .transition(.opacity)
                }

                VStack(spacing: 0) {
                    sheetHandle

                    content
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
                .frame(height: sheetHeight)
                .frame(maxWidth: .infinity)
                .background(theme.palette.surface)
                .clipShape(
                    UnevenRoundedRectangle(
                        topLeadingRadius: theme.metrics.radius,
                        bottomLeadingRadius: 0,
                        bottomTrailingRadius: 0,
                        topTrailingRadius: theme.metrics.radius
                    )
                )
                .shadow(color: theme.palette.borderLight, radius: 20, x: 0, y: -8)
                .offset(y: currentOffset)
                .gesture(sheetDragGesture)
            }
            .onAppear {
                containerHeight = geometry.size.height
            }
            .onChange(of: geometry.size.height) { _, newHeight in
                containerHeight = newHeight
            }
        }
        .animation(NavigationAnimation.spring, value: isPresented)
        .animation(NavigationAnimation.spring, value: selectedDetent)
    }

    private var dimmingOpacity: Double {
        let progress = 1 - (currentOffset / containerHeight)
        return min(0.4, progress * 0.5)
    }

    private var sheetHandle: some View {
        VStack(spacing: 0) {
            Capsule()
                .fill(theme.palette.textSecondary.opacity(0.4))
                .frame(width: 36, height: 5)
                .padding(.vertical, theme.metrics.spacingSmall)
        }
        .frame(maxWidth: .infinity)
        .contentShape(Rectangle())
    }

    private var sheetDragGesture: some Gesture {
        DragGesture()
            .updating($dragOffset) { value, state, _ in
                state = value.translation.y
            }
            .onEnded { value in
                let velocity = value.predictedEndLocation.y - value.location.y
                let currentHeight = sheetHeight - value.translation.y

                var targetDetent = selectedDetent

                if velocity > 500 {
                    if let smallerDetent = detents.last(where: { $0.fraction < selectedDetent.fraction }) {
                        targetDetent = smallerDetent
                    } else {
                        withAnimation(NavigationAnimation.spring) {
                            isPresented = false
                        }
                        HapticManager.shared.impact(.medium)
                        return
                    }
                } else if velocity < -500 {
                    if let largerDetent = detents.first(where: { $0.fraction > selectedDetent.fraction }) {
                        targetDetent = largerDetent
                    }
                } else {
                    let currentFraction = currentHeight / containerHeight
                    targetDetent = detents.min(by: {
                        abs($0.fraction - currentFraction) < abs($1.fraction - currentFraction)
                    }) ?? selectedDetent
                }

                withAnimation(NavigationAnimation.spring) {
                    selectedDetent = targetDetent
                }
                HapticManager.shared.impact(.light)
            }
    }
}

// MARK: - Command Palette

struct CommandPaletteItem: Identifiable, Hashable {
    let id: String
    let title: String
    let subtitle: String?
    let icon: String
    let shortcut: String?
    let action: () -> Void

    init(
        id: String = UUID().uuidString,
        title: String,
        subtitle: String? = nil,
        icon: String,
        shortcut: String? = nil,
        action: @escaping () -> Void
    ) {
        self.id = id
        self.title = title
        self.subtitle = subtitle
        self.icon = icon
        self.shortcut = shortcut
        self.action = action
    }

    static func == (lhs: CommandPaletteItem, rhs: CommandPaletteItem) -> Bool {
        lhs.id == rhs.id
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

struct CommandPalette: View {
    @Binding var isPresented: Bool
    let items: [CommandPaletteItem]

    @Environment(ThemeStore.self) private var theme
    @State private var searchText = ""
    @State private var selectedIndex = 0
    @FocusState private var isSearchFocused: Bool

    private var filteredItems: [CommandPaletteItem] {
        if searchText.isEmpty {
            return items
        }
        return items.filter {
            $0.title.localizedCaseInsensitiveContains(searchText) ||
            ($0.subtitle?.localizedCaseInsensitiveContains(searchText) ?? false)
        }
    }

    var body: some View {
        ZStack {
            Color.black.opacity(0.5)
                .ignoresSafeArea()
                .onTapGesture {
                    dismiss()
                }

            VStack(spacing: 0) {
                searchField

                Divider()
                    .background(theme.palette.border)

                if filteredItems.isEmpty {
                    emptyState
                } else {
                    resultsList
                }
            }
            .frame(maxWidth: 600)
            .frame(maxHeight: 400)
            .background(theme.palette.surface)
            .clipShape(RoundedRectangle(cornerRadius: theme.metrics.radius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: theme.metrics.radius, style: .continuous)
                    .stroke(theme.palette.border, lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.3), radius: 40, x: 0, y: 20)
            .padding(.horizontal, theme.metrics.spacing * 2)
            .padding(.top, 100)
            .frame(maxHeight: .infinity, alignment: .top)
        }
        .onAppear {
            isSearchFocused = true
            selectedIndex = 0
        }
    }

    private var searchField: some View {
        HStack(spacing: theme.metrics.spacingSmall) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: theme.metrics.iconSizeSmall, weight: .medium))
                .foregroundStyle(theme.palette.textSecondary)

            TextField("Search commands...", text: $searchText)
                .font(AppFont.body(theme.metrics.bodyText))
                .foregroundStyle(theme.palette.text)
                .textFieldStyle(.plain)
                .focused($isSearchFocused)
                .onChange(of: searchText) { _, _ in
                    selectedIndex = 0
                }
                .onSubmit {
                    executeSelected()
                }

            Text("esc")
                .font(AppFont.mono(theme.metrics.tinyText))
                .foregroundStyle(theme.palette.textSecondary)
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(theme.palette.surfaceAlt)
                .clipShape(RoundedRectangle(cornerRadius: 4, style: .continuous))
        }
        .padding(.horizontal, theme.metrics.cardPadding)
        .frame(height: 56)
    }

    private var emptyState: some View {
        VStack(spacing: theme.metrics.spacingSmall) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 32, weight: .light))
                .foregroundStyle(theme.palette.textSecondary)

            Text("No results found")
                .font(AppFont.body(theme.metrics.bodyText))
                .foregroundStyle(theme.palette.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(theme.metrics.cardPadding)
    }

    private var resultsList: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 2) {
                    ForEach(Array(filteredItems.enumerated()), id: \.element.id) { index, item in
                        commandRow(item: item, isSelected: index == selectedIndex)
                            .id(index)
                            .onTapGesture {
                                selectedIndex = index
                                executeSelected()
                            }
                    }
                }
                .padding(theme.metrics.spacingSmall)
            }
            .onChange(of: selectedIndex) { _, newIndex in
                withAnimation(.easeOut(duration: 0.15)) {
                    proxy.scrollTo(newIndex, anchor: .center)
                }
            }
        }
    }

    private func commandRow(item: CommandPaletteItem, isSelected: Bool) -> some View {
        HStack(spacing: theme.metrics.spacingSmall) {
            Image(systemName: item.icon)
                .font(.system(size: theme.metrics.iconSizeSmall, weight: .medium))
                .foregroundStyle(isSelected ? theme.palette.tint : theme.palette.text)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text(item.title)
                    .font(AppFont.body(theme.metrics.bodyText))
                    .foregroundStyle(theme.palette.text)

                if let subtitle = item.subtitle {
                    Text(subtitle)
                        .font(AppFont.body(theme.metrics.smallText))
                        .foregroundStyle(theme.palette.textSecondary)
                }
            }

            Spacer()

            if let shortcut = item.shortcut {
                Text(shortcut)
                    .font(AppFont.mono(theme.metrics.tinyText))
                    .foregroundStyle(theme.palette.textSecondary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(theme.palette.surfaceAlt)
                    .clipShape(RoundedRectangle(cornerRadius: 4, style: .continuous))
            }
        }
        .padding(.horizontal, theme.metrics.spacingSmall)
        .frame(height: theme.metrics.buttonHeightSmall)
        .background {
            if isSelected {
                RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous)
                    .fill(theme.palette.tint.opacity(theme.isDark ? 0.2 : 0.1))
            }
        }
        .contentShape(Rectangle())
    }

    private func moveSelection(by offset: Int) {
        let newIndex = selectedIndex + offset
        if newIndex >= 0 && newIndex < filteredItems.count {
            selectedIndex = newIndex
            HapticManager.shared.selection()
        }
    }

    private func executeSelected() {
        guard selectedIndex < filteredItems.count else { return }
        let item = filteredItems[selectedIndex]
        HapticManager.shared.impact(.medium)
        dismiss()
        item.action()
    }

    private func dismiss() {
        HapticManager.shared.impact(.light)
        withAnimation(NavigationAnimation.spring) {
            isPresented = false
        }
    }
}

// MARK: - iPad Navigation Split View Layout

struct iPadNavigationLayout<Sidebar: View, Detail: View>: View {
    @Binding var columnVisibility: NavigationSplitViewVisibility
    let sidebar: Sidebar
    let detail: Detail

    @Environment(ThemeStore.self) private var theme

    init(
        columnVisibility: Binding<NavigationSplitViewVisibility>,
        @ViewBuilder sidebar: () -> Sidebar,
        @ViewBuilder detail: () -> Detail
    ) {
        self._columnVisibility = columnVisibility
        self.sidebar = sidebar()
        self.detail = detail()
    }

    var body: some View {
        NavigationSplitView(columnVisibility: $columnVisibility) {
            sidebar
                .navigationSplitViewColumnWidth(min: 200, ideal: 280, max: 350)
        } detail: {
            detail
        }
        .navigationSplitViewStyle(.balanced)
        .tint(theme.palette.tint)
    }
}

// MARK: - Compact Tab Bar (Icon Only)

struct CompactTabBar<T: Hashable & CaseIterable & Identifiable>: View where T.AllCases: RandomAccessCollection {
    @Binding var selectedTab: T
    let tabs: [T]
    let icon: (T) -> String
    let badge: ((T) -> Int?)?

    @Environment(ThemeStore.self) private var theme
    @Namespace private var compactNamespace
    @State private var pressedTab: T?

    init(
        selectedTab: Binding<T>,
        icon: @escaping (T) -> String,
        badge: ((T) -> Int?)? = nil
    ) {
        self._selectedTab = selectedTab
        self.tabs = Array(T.allCases)
        self.icon = icon
        self.badge = badge
    }

    var body: some View {
        HStack(spacing: theme.metrics.spacingSmall) {
            ForEach(tabs, id: \.id) { tab in
                compactTabButton(for: tab)
            }
        }
        .padding(.horizontal, theme.metrics.spacingSmall)
        .padding(.vertical, 8)
        .background {
            Capsule()
                .fill(.ultraThinMaterial)
            Capsule()
                .fill(theme.palette.surface.opacity(theme.isDark ? 0.8 : 0.9))
            Capsule()
                .strokeBorder(theme.palette.border.opacity(0.2), lineWidth: 0.5)
        }
        .shadow(color: theme.palette.borderLight.opacity(0.4), radius: 12, x: 0, y: 6)
    }

    private func compactTabButton(for tab: T) -> some View {
        let isSelected = selectedTab == tab
        let isPressed = pressedTab == tab
        let badgeCount = badge?(tab)

        return Button {
            guard selectedTab != tab else { return }
            HapticManager.shared.selection()
            withAnimation(NavigationAnimation.spring) {
                selectedTab = tab
            }
        } label: {
            ZStack(alignment: .topTrailing) {
                ZStack {
                    if isSelected {
                        Circle()
                            .fill(theme.palette.tint.opacity(theme.isDark ? 0.25 : 0.15))
                            .matchedGeometryEffect(id: "compactIndicator", in: compactNamespace)
                    }

                    Image(systemName: icon(tab))
                        .font(.system(size: theme.metrics.iconSizeSmall, weight: isSelected ? .semibold : .regular))
                        .foregroundStyle(isSelected ? theme.palette.tint : theme.palette.textSecondary)
                        .symbolEffect(.bounce, value: isSelected)
                }
                .frame(width: 44, height: 44)

                if let count = badgeCount, count > 0 {
                    Text(count > 99 ? "99+" : "\(count)")
                        .font(AppFont.body(9))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 5)
                        .padding(.vertical, 2)
                        .background(theme.palette.error)
                        .clipShape(Capsule())
                        .offset(x: 4, y: -4)
                }
            }
            .scaleEffect(isPressed ? 0.9 : 1.0)
        }
        .buttonStyle(.plain)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in
                    if pressedTab != tab {
                        pressedTab = tab
                        HapticManager.shared.impact(.light)
                    }
                }
                .onEnded { _ in
                    pressedTab = nil
                }
        )
        .animation(NavigationAnimation.springStiff, value: isPressed)
        .accessibilityLabel("Tab")
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

// MARK: - Scrollable Tab Bar

struct ScrollableTabBar<T: Hashable & Identifiable>: View {
    @Binding var selectedTab: T
    let tabs: [T]
    let title: (T) -> String

    @Environment(ThemeStore.self) private var theme
    @Namespace private var scrollableNamespace

    init(
        selectedTab: Binding<T>,
        tabs: [T],
        title: @escaping (T) -> String
    ) {
        self._selectedTab = selectedTab
        self.tabs = tabs
        self.title = title
    }

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 4) {
                    ForEach(tabs) { tab in
                        scrollableTabButton(for: tab)
                            .id(tab.id)
                    }
                }
                .padding(.horizontal, theme.metrics.spacing)
                .padding(.vertical, theme.metrics.spacingSmall)
            }
            .onChange(of: selectedTab) { _, newTab in
                withAnimation(NavigationAnimation.spring) {
                    proxy.scrollTo(newTab.id, anchor: .center)
                }
            }
        }
        .background(theme.palette.surface)
    }

    private func scrollableTabButton(for tab: T) -> some View {
        let isSelected = selectedTab == tab

        return Button {
            HapticManager.shared.selection()
            withAnimation(NavigationAnimation.spring) {
                selectedTab = tab
            }
        } label: {
            Text(title(tab))
                .font(AppFont.body(theme.metrics.smallText))
                .fontWeight(isSelected ? .semibold : .regular)
                .foregroundStyle(isSelected ? theme.palette.tint : theme.palette.textSecondary)
                .padding(.horizontal, theme.metrics.spacingSmall)
                .padding(.vertical, 8)
                .background {
                    if isSelected {
                        Capsule()
                            .fill(theme.palette.tint.opacity(theme.isDark ? 0.2 : 0.1))
                            .matchedGeometryEffect(id: "scrollableIndicator", in: scrollableNamespace)
                    }
                }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(title(tab))
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

// MARK: - Segmented Tab Control

struct SegmentedTabControl<T: Hashable & CaseIterable & Identifiable>: View where T.AllCases: RandomAccessCollection {
    @Binding var selectedTab: T
    let tabs: [T]
    let title: (T) -> String

    @Environment(ThemeStore.self) private var theme
    @Namespace private var segmentNamespace

    init(
        selectedTab: Binding<T>,
        title: @escaping (T) -> String
    ) {
        self._selectedTab = selectedTab
        self.tabs = Array(T.allCases)
        self.title = title
    }

    var body: some View {
        HStack(spacing: 0) {
            ForEach(tabs, id: \.id) { tab in
                segmentButton(for: tab)
            }
        }
        .padding(4)
        .background(theme.palette.surfaceAlt)
        .clipShape(RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous)
                .stroke(theme.palette.border.opacity(0.3), lineWidth: 0.5)
        )
    }

    private func segmentButton(for tab: T) -> some View {
        let isSelected = selectedTab == tab

        return Button {
            HapticManager.shared.selection()
            withAnimation(NavigationAnimation.spring) {
                selectedTab = tab
            }
        } label: {
            Text(title(tab))
                .font(AppFont.body(theme.metrics.smallText))
                .fontWeight(isSelected ? .semibold : .regular)
                .foregroundStyle(isSelected ? theme.palette.text : theme.palette.textSecondary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background {
                    if isSelected {
                        RoundedRectangle(cornerRadius: theme.metrics.radiusSmall - 2, style: .continuous)
                            .fill(theme.palette.surface)
                            .shadow(color: theme.palette.borderLight, radius: 2, x: 0, y: 1)
                            .matchedGeometryEffect(id: "segmentIndicator", in: segmentNamespace)
                    }
                }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(title(tab))
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

// MARK: - Page Indicator

struct PageIndicator: View {
    let pageCount: Int
    @Binding var currentPage: Int
    let style: PageIndicatorStyle

    @Environment(ThemeStore.self) private var theme

    enum PageIndicatorStyle {
        case dots
        case pills
        case numbers
    }

    init(pageCount: Int, currentPage: Binding<Int>, style: PageIndicatorStyle = .dots) {
        self.pageCount = pageCount
        self._currentPage = currentPage
        self.style = style
    }

    var body: some View {
        switch style {
        case .dots:
            dotsIndicator
        case .pills:
            pillsIndicator
        case .numbers:
            numbersIndicator
        }
    }

    private var dotsIndicator: some View {
        HStack(spacing: 8) {
            ForEach(0..<pageCount, id: \.self) { index in
                Circle()
                    .fill(index == currentPage ? theme.palette.tint : theme.palette.textSecondary.opacity(0.3))
                    .frame(width: index == currentPage ? 10 : 8, height: index == currentPage ? 10 : 8)
                    .scaleEffect(index == currentPage ? 1.0 : 0.8)
                    .animation(NavigationAnimation.springBouncy, value: currentPage)
                    .onTapGesture {
                        HapticManager.shared.selection()
                        withAnimation(NavigationAnimation.spring) {
                            currentPage = index
                        }
                    }
            }
        }
        .padding(.vertical, theme.metrics.spacingSmall)
    }

    private var pillsIndicator: some View {
        HStack(spacing: 4) {
            ForEach(0..<pageCount, id: \.self) { index in
                Capsule()
                    .fill(index == currentPage ? theme.palette.tint : theme.palette.textSecondary.opacity(0.3))
                    .frame(width: index == currentPage ? 24 : 8, height: 8)
                    .animation(NavigationAnimation.spring, value: currentPage)
                    .onTapGesture {
                        HapticManager.shared.selection()
                        withAnimation(NavigationAnimation.spring) {
                            currentPage = index
                        }
                    }
            }
        }
        .padding(.vertical, theme.metrics.spacingSmall)
    }

    private var numbersIndicator: some View {
        HStack(spacing: 4) {
            Text("\(currentPage + 1)")
                .font(AppFont.body(theme.metrics.smallText))
                .fontWeight(.semibold)
                .foregroundStyle(theme.palette.tint)

            Text("/")
                .font(AppFont.body(theme.metrics.smallText))
                .foregroundStyle(theme.palette.textSecondary)

            Text("\(pageCount)")
                .font(AppFont.body(theme.metrics.smallText))
                .foregroundStyle(theme.palette.textSecondary)
        }
        .padding(.horizontal, theme.metrics.spacingSmall)
        .padding(.vertical, 6)
        .background(theme.palette.surfaceAlt)
        .clipShape(Capsule())
    }
}

// MARK: - Navigation Breadcrumbs

struct BreadcrumbItem: Identifiable, Hashable {
    let id: String
    let title: String
    let icon: String?

    init(id: String = UUID().uuidString, title: String, icon: String? = nil) {
        self.id = id
        self.title = title
        self.icon = icon
    }
}

struct NavigationBreadcrumbs: View {
    let items: [BreadcrumbItem]
    let onSelect: (BreadcrumbItem) -> Void

    @Environment(ThemeStore.self) private var theme

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 4) {
                ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                    breadcrumbButton(item: item, isLast: index == items.count - 1)

                    if index < items.count - 1 {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundStyle(theme.palette.textSecondary.opacity(0.5))
                    }
                }
            }
            .padding(.horizontal, theme.metrics.spacing)
            .padding(.vertical, theme.metrics.spacingSmall)
        }
    }

    private func breadcrumbButton(item: BreadcrumbItem, isLast: Bool) -> some View {
        Button {
            HapticManager.shared.selection()
            onSelect(item)
        } label: {
            HStack(spacing: 4) {
                if let icon = item.icon {
                    Image(systemName: icon)
                        .font(.system(size: theme.metrics.iconSizeTiny, weight: .medium))
                }

                Text(item.title)
                    .font(AppFont.body(theme.metrics.smallText))
                    .fontWeight(isLast ? .semibold : .regular)
            }
            .foregroundStyle(isLast ? theme.palette.text : theme.palette.textSecondary)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background {
                if isLast {
                    RoundedRectangle(cornerRadius: 6, style: .continuous)
                        .fill(theme.palette.surfaceAlt)
                }
            }
        }
        .buttonStyle(.plain)
        .disabled(isLast)
        .accessibilityLabel(item.title)
    }
}

// MARK: - Quick Action Menu

struct QuickActionItem: Identifiable {
    let id: String
    let title: String
    let icon: String
    let color: Color?
    let action: () -> Void

    init(
        id: String = UUID().uuidString,
        title: String,
        icon: String,
        color: Color? = nil,
        action: @escaping () -> Void
    ) {
        self.id = id
        self.title = title
        self.icon = icon
        self.color = color
        self.action = action
    }
}

struct QuickActionMenu: View {
    @Binding var isExpanded: Bool
    let items: [QuickActionItem]
    let style: QuickActionStyle

    @Environment(ThemeStore.self) private var theme
    @State private var hoveredItem: String?

    enum QuickActionStyle {
        case radial
        case stack
        case fan
    }

    var body: some View {
        ZStack {
            if isExpanded {
                Color.black.opacity(0.3)
                    .ignoresSafeArea()
                    .onTapGesture {
                        HapticManager.shared.impact(.light)
                        withAnimation(NavigationAnimation.springBouncy) {
                            isExpanded = false
                        }
                    }
                    .transition(.opacity)
            }

            ZStack {
                switch style {
                case .radial:
                    radialLayout
                case .stack:
                    stackLayout
                case .fan:
                    fanLayout
                }

                mainButton
            }
        }
        .animation(NavigationAnimation.springBouncy, value: isExpanded)
    }

    private var mainButton: some View {
        Button {
            HapticManager.shared.impact(.medium)
            withAnimation(NavigationAnimation.springBouncy) {
                isExpanded.toggle()
            }
        } label: {
            Image(systemName: isExpanded ? "xmark" : "plus")
                .font(.system(size: theme.metrics.iconSize, weight: .semibold))
                .foregroundStyle(.white)
                .rotationEffect(.degrees(isExpanded ? 180 : 0))
                .frame(width: 56, height: 56)
                .background(theme.palette.tint)
                .clipShape(Circle())
                .shadow(color: theme.palette.tint.opacity(0.4), radius: 8, x: 0, y: 4)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(isExpanded ? "Close menu" : "Open quick actions")
    }

    private var radialLayout: some View {
        ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
            let angle = angleForIndex(index, total: items.count)
            let radius: CGFloat = 80

            actionButton(item: item)
                .offset(
                    x: isExpanded ? cos(angle) * radius : 0,
                    y: isExpanded ? sin(angle) * radius : 0
                )
                .scaleEffect(isExpanded ? 1 : 0.5)
                .opacity(isExpanded ? 1 : 0)
        }
    }

    private var stackLayout: some View {
        VStack(spacing: theme.metrics.spacingSmall) {
            ForEach(Array(items.enumerated().reversed()), id: \.element.id) { index, item in
                actionButton(item: item)
                    .offset(y: isExpanded ? 0 : CGFloat(index + 1) * 10)
                    .scaleEffect(isExpanded ? 1 : 0.8)
                    .opacity(isExpanded ? 1 : 0)
            }
        }
        .offset(y: isExpanded ? -80 : 0)
    }

    private var fanLayout: some View {
        ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
            let totalAngle: CGFloat = .pi * 0.6
            let startAngle: CGFloat = .pi + ((.pi - totalAngle) / 2)
            let angleStep = items.count > 1 ? totalAngle / CGFloat(items.count - 1) : 0
            let angle = startAngle + angleStep * CGFloat(index)
            let radius: CGFloat = 90

            actionButton(item: item)
                .offset(
                    x: isExpanded ? cos(angle) * radius : 0,
                    y: isExpanded ? sin(angle) * radius : 0
                )
                .scaleEffect(isExpanded ? 1 : 0.5)
                .opacity(isExpanded ? 1 : 0)
        }
    }

    private func actionButton(item: QuickActionItem) -> some View {
        let isHovered = hoveredItem == item.id
        let itemColor = item.color ?? theme.palette.tint

        return Button {
            HapticManager.shared.impact(.medium)
            withAnimation(NavigationAnimation.springBouncy) {
                isExpanded = false
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                item.action()
            }
        } label: {
            VStack(spacing: 4) {
                Image(systemName: item.icon)
                    .font(.system(size: theme.metrics.iconSizeSmall, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 44, height: 44)
                    .background(itemColor)
                    .clipShape(Circle())
                    .shadow(color: itemColor.opacity(0.3), radius: 4, x: 0, y: 2)
                    .scaleEffect(isHovered ? 1.1 : 1.0)

                Text(item.title)
                    .font(AppFont.body(theme.metrics.tinyText))
                    .foregroundStyle(theme.palette.text)
            }
        }
        .buttonStyle(.plain)
        .onHover { hoveredItem = $0 ? item.id : nil }
        .animation(NavigationAnimation.springStiff, value: isHovered)
        .accessibilityLabel(item.title)
    }

    private func angleForIndex(_ index: Int, total: Int) -> CGFloat {
        let startAngle: CGFloat = -.pi / 2
        let totalAngle: CGFloat = .pi * 1.5
        let angleStep = total > 1 ? totalAngle / CGFloat(total) : 0
        return startAngle - angleStep * CGFloat(index)
    }
}

// MARK: - Swipeable Tab Container

struct SwipeableTabContainer<T: Hashable & CaseIterable & Identifiable, Content: View>: View where T.AllCases: RandomAccessCollection {
    @Binding var selectedTab: T
    let tabs: [T]
    let content: (T) -> Content

    @Environment(ThemeStore.self) private var theme
    @GestureState private var dragOffset: CGFloat = 0
    @State private var containerWidth: CGFloat = 0

    init(
        selectedTab: Binding<T>,
        @ViewBuilder content: @escaping (T) -> Content
    ) {
        self._selectedTab = selectedTab
        self.tabs = Array(T.allCases)
        self.content = content
    }

    private var currentIndex: Int {
        tabs.firstIndex(of: selectedTab) ?? 0
    }

    private var offset: CGFloat {
        let baseOffset = -CGFloat(currentIndex) * containerWidth
        return baseOffset + dragOffset
    }

    var body: some View {
        GeometryReader { geometry in
            HStack(spacing: 0) {
                ForEach(tabs, id: \.id) { tab in
                    content(tab)
                        .frame(width: geometry.size.width)
                }
            }
            .offset(x: offset)
            .gesture(swipeGesture)
            .onAppear {
                containerWidth = geometry.size.width
            }
            .onChange(of: geometry.size.width) { _, newWidth in
                containerWidth = newWidth
            }
        }
        .clipped()
        .animation(NavigationAnimation.spring, value: selectedTab)
    }

    private var swipeGesture: some Gesture {
        DragGesture()
            .updating($dragOffset) { value, state, _ in
                state = value.translation.width
            }
            .onEnded { value in
                let threshold: CGFloat = containerWidth * 0.25
                let velocity = value.predictedEndLocation.x - value.location.x
                let translation = value.translation.width

                var newIndex = currentIndex

                if translation < -threshold || velocity < -500 {
                    newIndex = min(currentIndex + 1, tabs.count - 1)
                } else if translation > threshold || velocity > 500 {
                    newIndex = max(currentIndex - 1, 0)
                }

                if newIndex != currentIndex {
                    HapticManager.shared.selection()
                    withAnimation(NavigationAnimation.spring) {
                        selectedTab = tabs[newIndex]
                    }
                }
            }
    }
}

// MARK: - View Extensions

extension View {
    func commandPalette(
        isPresented: Binding<Bool>,
        items: [CommandPaletteItem]
    ) -> some View {
        self.overlay {
            if isPresented.wrappedValue {
                CommandPalette(isPresented: isPresented, items: items)
                    .transition(.opacity.combined(with: .scale(scale: 0.95)))
            }
        }
        .animation(NavigationAnimation.spring, value: isPresented.wrappedValue)
    }

    func bottomSheet<Content: View>(
        isPresented: Binding<Bool>,
        detent: Binding<SheetDetent>,
        detents: [SheetDetent] = [.medium, .large],
        @ViewBuilder content: @escaping () -> Content
    ) -> some View {
        self.overlay {
            BottomSheetView(
                isPresented: isPresented,
                selectedDetent: detent,
                detents: detents,
                content: content
            )
        }
    }

    func slideInPanel<Content: View>(
        isPresented: Binding<Bool>,
        edge: HorizontalEdge = .trailing,
        width: CGFloat = 320,
        @ViewBuilder content: @escaping () -> Content
    ) -> some View {
        self.overlay {
            SlideInContextPanel(
                isPresented: isPresented,
                width: width,
                edge: edge,
                content: content
            )
        }
    }
}
