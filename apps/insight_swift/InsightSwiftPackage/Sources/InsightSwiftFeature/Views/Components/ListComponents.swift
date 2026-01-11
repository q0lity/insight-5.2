import SwiftUI

// MARK: - Shimmer Effect

struct ShimmerModifier: ViewModifier {
    @State private var phase: CGFloat = 0
    let duration: Double
    let delay: Double

    init(duration: Double = 1.5, delay: Double = 0) {
        self.duration = duration
        self.delay = delay
    }

    func body(content: Content) -> some View {
        content
            .overlay(
                GeometryReader { geometry in
                    LinearGradient(
                        gradient: Gradient(colors: [
                            .clear,
                            .white.opacity(0.4),
                            .clear
                        ]),
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    .frame(width: geometry.size.width * 2)
                    .offset(x: -geometry.size.width + (phase * geometry.size.width * 3))
                    .mask(content)
                }
            )
            .onAppear {
                withAnimation(
                    .linear(duration: duration)
                    .repeatForever(autoreverses: false)
                    .delay(delay)
                ) {
                    phase = 1
                }
            }
    }
}

extension View {
    func shimmer(duration: Double = 1.5, delay: Double = 0) -> some View {
        modifier(ShimmerModifier(duration: duration, delay: delay))
    }
}

// MARK: - Loading Skeleton

struct SkeletonView: View {
    @Environment(ThemeStore.self) private var theme
    let height: CGFloat
    let cornerRadius: CGFloat

    init(height: CGFloat = 16, cornerRadius: CGFloat? = nil) {
        self.height = height
        self.cornerRadius = cornerRadius ?? 8
    }

    var body: some View {
        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
            .fill(theme.palette.border.opacity(0.3))
            .frame(height: height)
            .shimmer()
    }
}

struct SkeletonRow: View {
    @Environment(ThemeStore.self) private var theme

    var body: some View {
        HStack(spacing: theme.metrics.spacingSmall) {
            Circle()
                .fill(theme.palette.border.opacity(0.3))
                .frame(width: 44, height: 44)
                .shimmer(delay: 0)

            VStack(alignment: .leading, spacing: 8) {
                SkeletonView(height: 14)
                    .frame(width: 160)
                    .shimmer(delay: 0.1)

                SkeletonView(height: 12)
                    .frame(width: 100)
                    .shimmer(delay: 0.2)
            }

            Spacer()

            SkeletonView(height: 12)
                .frame(width: 50)
                .shimmer(delay: 0.3)
        }
        .padding(theme.metrics.cardPadding)
        .background(theme.palette.surface)
        .clipShape(RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous))
    }
}

struct SkeletonCard: View {
    @Environment(ThemeStore.self) private var theme

    var body: some View {
        VStack(alignment: .leading, spacing: theme.metrics.spacingSmall) {
            RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous)
                .fill(theme.palette.border.opacity(0.3))
                .aspectRatio(1.5, contentMode: .fit)
                .shimmer()

            SkeletonView(height: 16)
                .shimmer(delay: 0.1)

            VStack(spacing: 6) {
                SkeletonView(height: 12)
                    .shimmer(delay: 0.2)
                SkeletonView(height: 12)
                    .frame(width: 120)
                    .shimmer(delay: 0.3)
            }
        }
        .padding(theme.metrics.cardPadding)
        .background(theme.palette.surface)
        .clipShape(RoundedRectangle(cornerRadius: theme.metrics.radius, style: .continuous))
    }
}

// MARK: - Staggered Animation

struct StaggeredAnimationModifier: ViewModifier {
    let index: Int
    let baseDelay: Double
    @State private var appeared = false

    func body(content: Content) -> some View {
        content
            .opacity(appeared ? 1 : 0)
            .offset(y: appeared ? 0 : 20)
            .onAppear {
                withAnimation(
                    .spring(response: 0.5, dampingFraction: 0.8)
                    .delay(Double(index) * baseDelay)
                ) {
                    appeared = true
                }
            }
    }
}

extension View {
    func staggeredAppear(index: Int, baseDelay: Double = 0.05) -> some View {
        modifier(StaggeredAnimationModifier(index: index, baseDelay: baseDelay))
    }
}

// MARK: - Empty State

enum EmptyStateIllustration: String {
    case noData = "tray"
    case noSearch = "magnifyingglass"
    case noConnection = "wifi.slash"
    case noItems = "square.stack.3d.up.slash"
    case noFavorites = "heart.slash"
    case noNotifications = "bell.slash"
    case error = "exclamationmark.triangle"

    var symbolName: String { rawValue }
}

struct EmptyStateView: View {
    @Environment(ThemeStore.self) private var theme

    let illustration: EmptyStateIllustration
    let title: String
    let message: String
    let actionTitle: String?
    let action: (() -> Void)?

    init(
        illustration: EmptyStateIllustration = .noData,
        title: String,
        message: String,
        actionTitle: String? = nil,
        action: (() -> Void)? = nil
    ) {
        self.illustration = illustration
        self.title = title
        self.message = message
        self.actionTitle = actionTitle
        self.action = action
    }

    var body: some View {
        VStack(spacing: theme.metrics.spacing) {
            ZStack {
                Circle()
                    .fill(theme.palette.tintLight)
                    .frame(width: 100, height: 100)

                Image(systemName: illustration.symbolName)
                    .font(.system(size: 40, weight: .medium))
                    .foregroundStyle(theme.palette.tint)
            }
            .padding(.bottom, theme.metrics.spacingSmall)

            Text(title)
                .font(AppFont.title(theme.metrics.sectionTitle))
                .foregroundStyle(theme.palette.text)
                .multilineTextAlignment(.center)

            Text(message)
                .font(AppFont.body(theme.metrics.bodyText))
                .foregroundStyle(theme.palette.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, theme.metrics.spacing)

            if let actionTitle, let action {
                Button(action: action) {
                    Text(actionTitle)
                        .font(AppFont.body(theme.metrics.bodyText))
                        .foregroundStyle(.white)
                        .padding(.horizontal, theme.metrics.spacing)
                        .frame(height: theme.metrics.buttonHeightSmall)
                        .background(theme.palette.tint)
                        .clipShape(Capsule())
                }
                .padding(.top, theme.metrics.spacingSmall)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(theme.metrics.spacing)
    }
}

// MARK: - Pull to Refresh

struct InsightRefreshControl: View {
    @Environment(ThemeStore.self) private var theme
    @Binding var isRefreshing: Bool
    let threshold: CGFloat
    let onRefresh: () async -> Void

    @State private var pullProgress: CGFloat = 0
    @State private var rotation: Double = 0

    init(
        isRefreshing: Binding<Bool>,
        threshold: CGFloat = 80,
        onRefresh: @escaping () async -> Void
    ) {
        self._isRefreshing = isRefreshing
        self.threshold = threshold
        self.onRefresh = onRefresh
    }

    var body: some View {
        GeometryReader { geometry in
            let offset = geometry.frame(in: .global).minY
            let progress = min(max(offset / threshold, 0), 1)

            ZStack {
                Circle()
                    .stroke(theme.palette.border, lineWidth: 3)
                    .frame(width: 32, height: 32)

                Circle()
                    .trim(from: 0, to: isRefreshing ? 0.8 : progress)
                    .stroke(theme.palette.tint, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                    .frame(width: 32, height: 32)
                    .rotationEffect(.degrees(isRefreshing ? rotation : -90))

                if !isRefreshing {
                    Image(systemName: "arrow.down")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(theme.palette.tint)
                        .rotationEffect(.degrees(progress * 180))
                        .opacity(progress)
                }
            }
            .frame(maxWidth: .infinity)
            .offset(y: offset > 0 ? offset - 50 : -50)
            .opacity(offset > 20 ? 1 : 0)
            .onChange(of: offset) { _, newOffset in
                pullProgress = newOffset
                if newOffset > threshold && !isRefreshing {
                    triggerRefresh()
                }
            }
            .onChange(of: isRefreshing) { _, refreshing in
                if refreshing {
                    withAnimation(.linear(duration: 1).repeatForever(autoreverses: false)) {
                        rotation = 360
                    }
                } else {
                    rotation = 0
                }
            }
        }
        .frame(height: 0)
    }

    private func triggerRefresh() {
        guard !isRefreshing else { return }
        isRefreshing = true
        Task {
            await onRefresh()
            await MainActor.run {
                isRefreshing = false
            }
        }
    }
}

// MARK: - Swipe Actions

struct SwipeAction: Identifiable {
    let id = UUID()
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void
}

struct SwipeActionsModifier<Leading: View, Trailing: View>: ViewModifier {
    @Environment(ThemeStore.self) private var theme

    let leadingActions: [SwipeAction]
    let trailingActions: [SwipeAction]
    let leadingContent: () -> Leading
    let trailingContent: () -> Trailing

    @State private var offset: CGFloat = 0

    private let actionWidth: CGFloat = 80

    init(
        leadingActions: [SwipeAction] = [],
        trailingActions: [SwipeAction] = [],
        @ViewBuilder leadingContent: @escaping () -> Leading = { EmptyView() },
        @ViewBuilder trailingContent: @escaping () -> Trailing = { EmptyView() }
    ) {
        self.leadingActions = leadingActions
        self.trailingActions = trailingActions
        self.leadingContent = leadingContent
        self.trailingContent = trailingContent
    }

    func body(content: Content) -> some View {
        ZStack {
            HStack(spacing: 0) {
                ForEach(leadingActions) { action in
                    Button {
                        withAnimation(.spring(response: 0.3)) {
                            offset = 0
                        }
                        action.action()
                    } label: {
                        VStack(spacing: 4) {
                            Image(systemName: action.icon)
                                .font(.system(size: 20))
                            Text(action.title)
                                .font(AppFont.body(10))
                        }
                        .foregroundStyle(.white)
                        .frame(width: actionWidth)
                        .frame(maxHeight: .infinity)
                        .background(action.color)
                    }
                }
                Spacer()
            }
            .opacity(offset > 0 ? 1 : 0)

            HStack(spacing: 0) {
                Spacer()
                ForEach(trailingActions.reversed()) { action in
                    Button {
                        withAnimation(.spring(response: 0.3)) {
                            offset = 0
                        }
                        action.action()
                    } label: {
                        VStack(spacing: 4) {
                            Image(systemName: action.icon)
                                .font(.system(size: 20))
                            Text(action.title)
                                .font(AppFont.body(10))
                        }
                        .foregroundStyle(.white)
                        .frame(width: actionWidth)
                        .frame(maxHeight: .infinity)
                        .background(action.color)
                    }
                }
            }
            .opacity(offset < 0 ? 1 : 0)

            content
                .offset(x: offset)
                .gesture(
                    DragGesture(minimumDistance: 10)
                        .onChanged { value in
                            let translation = value.translation.width

                            if translation > 0 && leadingActions.isEmpty { return }
                            if translation < 0 && trailingActions.isEmpty { return }

                            let maxOffset = CGFloat(max(leadingActions.count, trailingActions.count)) * actionWidth
                            if abs(translation) > maxOffset {
                                offset = translation > 0
                                    ? maxOffset + (translation - maxOffset) * 0.2
                                    : -maxOffset + (translation + maxOffset) * 0.2
                            } else {
                                offset = translation
                            }
                        }
                        .onEnded { value in
                            let velocity = value.predictedEndTranslation.width - value.translation.width
                            let targetOffset: CGFloat

                            if abs(offset) > actionWidth / 2 || abs(velocity) > 200 {
                                let actionCount = offset > 0 ? leadingActions.count : trailingActions.count
                                targetOffset = offset > 0
                                    ? CGFloat(actionCount) * actionWidth
                                    : -CGFloat(actionCount) * actionWidth
                            } else {
                                targetOffset = 0
                            }

                            withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                offset = targetOffset
                            }
                        }
                )
        }
        .clipShape(RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous))
    }
}

extension View {
    func swipeActions(
        leading: [SwipeAction] = [],
        trailing: [SwipeAction] = []
    ) -> some View {
        modifier(SwipeActionsModifier(
            leadingActions: leading,
            trailingActions: trailing
        ))
    }
}

// MARK: - Insight List

struct InsightList<Data: RandomAccessCollection, Content: View>: View
where Data.Element: Identifiable {
    @Environment(ThemeStore.self) private var theme

    let data: Data
    let spacing: CGFloat?
    let showSkeleton: Bool
    let skeletonCount: Int
    let emptyState: EmptyStateView?
    let loadMore: (() async -> Void)?
    let isLoadingMore: Bool
    let content: (Data.Element, Int) -> Content

    @State private var hasAppeared = false

    init(
        _ data: Data,
        spacing: CGFloat? = nil,
        showSkeleton: Bool = false,
        skeletonCount: Int = 5,
        emptyState: EmptyStateView? = nil,
        isLoadingMore: Bool = false,
        loadMore: (() async -> Void)? = nil,
        @ViewBuilder content: @escaping (Data.Element, Int) -> Content
    ) {
        self.data = data
        self.spacing = spacing
        self.showSkeleton = showSkeleton
        self.skeletonCount = skeletonCount
        self.emptyState = emptyState
        self.isLoadingMore = isLoadingMore
        self.loadMore = loadMore
        self.content = content
    }

    var body: some View {
        Group {
            if showSkeleton {
                LazyVStack(spacing: spacing ?? theme.metrics.rowGap) {
                    ForEach(0..<skeletonCount, id: \.self) { index in
                        SkeletonRow()
                            .staggeredAppear(index: index)
                    }
                }
            } else if data.isEmpty {
                if let emptyState {
                    emptyState
                } else {
                    EmptyStateView(
                        illustration: .noData,
                        title: "No Items",
                        message: "There's nothing here yet."
                    )
                }
            } else {
                LazyVStack(spacing: spacing ?? theme.metrics.rowGap) {
                    ForEach(Array(data.enumerated()), id: \.element.id) { index, item in
                        content(item, index)
                            .staggeredAppear(index: hasAppeared ? 0 : index)
                            .onAppear {
                                if index == data.count - 3 {
                                    Task {
                                        await loadMore?()
                                    }
                                }
                            }
                    }

                    if isLoadingMore {
                        HStack {
                            Spacer()
                            ProgressView()
                                .tint(theme.palette.tint)
                            Spacer()
                        }
                        .padding()
                    }
                }
                .onAppear {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                        hasAppeared = true
                    }
                }
            }
        }
    }
}

// MARK: - Insight Grid (Bento Style)

enum BentoSize {
    case small
    case medium
    case large
    case wide

    var columns: Int {
        switch self {
        case .small: return 1
        case .medium: return 2
        case .large: return 2
        case .wide: return 3
        }
    }

    var rows: Int {
        switch self {
        case .small, .medium, .wide: return 1
        case .large: return 2
        }
    }
}

struct BentoItem<Content: View>: View {
    @Environment(ThemeStore.self) private var theme

    let size: BentoSize
    let content: Content

    init(size: BentoSize = .small, @ViewBuilder content: () -> Content) {
        self.size = size
        self.content = content()
    }

    var body: some View {
        content
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(theme.palette.surface)
            .clipShape(RoundedRectangle(cornerRadius: theme.metrics.radius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: theme.metrics.radius, style: .continuous)
                    .stroke(theme.palette.border, lineWidth: 1)
            )
            .shadow(color: theme.palette.borderLight, radius: 8, x: 0, y: 4)
    }
}

struct InsightGrid<Data: RandomAccessCollection, Content: View>: View
where Data.Element: Identifiable {
    @Environment(ThemeStore.self) private var theme

    let data: Data
    let columns: Int
    let spacing: CGFloat?
    let showSkeleton: Bool
    let skeletonCount: Int
    let emptyState: EmptyStateView?
    let content: (Data.Element, Int) -> Content

    init(
        _ data: Data,
        columns: Int = 2,
        spacing: CGFloat? = nil,
        showSkeleton: Bool = false,
        skeletonCount: Int = 6,
        emptyState: EmptyStateView? = nil,
        @ViewBuilder content: @escaping (Data.Element, Int) -> Content
    ) {
        self.data = data
        self.columns = columns
        self.spacing = spacing
        self.showSkeleton = showSkeleton
        self.skeletonCount = skeletonCount
        self.emptyState = emptyState
        self.content = content
    }

    private var gridColumns: [GridItem] {
        Array(repeating: GridItem(.flexible(), spacing: spacing ?? theme.metrics.cardGap), count: columns)
    }

    var body: some View {
        Group {
            if showSkeleton {
                LazyVGrid(columns: gridColumns, spacing: spacing ?? theme.metrics.cardGap) {
                    ForEach(0..<skeletonCount, id: \.self) { index in
                        SkeletonCard()
                            .aspectRatio(1, contentMode: .fill)
                            .staggeredAppear(index: index)
                    }
                }
            } else if data.isEmpty {
                if let emptyState {
                    emptyState
                } else {
                    EmptyStateView(
                        illustration: .noItems,
                        title: "No Items",
                        message: "Nothing to display in the grid."
                    )
                }
            } else {
                LazyVGrid(columns: gridColumns, spacing: spacing ?? theme.metrics.cardGap) {
                    ForEach(Array(data.enumerated()), id: \.element.id) { index, item in
                        content(item, index)
                            .staggeredAppear(index: index)
                    }
                }
            }
        }
    }
}

// MARK: - Insight Carousel

struct InsightCarousel<Data: RandomAccessCollection, Content: View>: View
where Data.Element: Identifiable {
    @Environment(ThemeStore.self) private var theme

    let data: Data
    let itemWidth: CGFloat?
    let spacing: CGFloat?
    let showSkeleton: Bool
    let skeletonCount: Int
    let showIndicators: Bool
    let content: (Data.Element, Int) -> Content

    @State private var currentIndex: Int = 0

    init(
        _ data: Data,
        itemWidth: CGFloat? = nil,
        spacing: CGFloat? = nil,
        showSkeleton: Bool = false,
        skeletonCount: Int = 3,
        showIndicators: Bool = true,
        @ViewBuilder content: @escaping (Data.Element, Int) -> Content
    ) {
        self.data = data
        self.itemWidth = itemWidth
        self.spacing = spacing
        self.showSkeleton = showSkeleton
        self.skeletonCount = skeletonCount
        self.showIndicators = showIndicators
        self.content = content
    }

    var body: some View {
        VStack(spacing: theme.metrics.spacingSmall) {
            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: spacing ?? theme.metrics.cardGap) {
                    if showSkeleton {
                        ForEach(0..<skeletonCount, id: \.self) { index in
                            SkeletonCard()
                                .frame(width: itemWidth ?? 280)
                                .staggeredAppear(index: index)
                        }
                    } else {
                        ForEach(Array(data.enumerated()), id: \.element.id) { index, item in
                            content(item, index)
                                .frame(width: itemWidth)
                                .staggeredAppear(index: index)
                                .id(index)
                        }
                    }
                }
                .padding(.horizontal, theme.metrics.spacing)
                .scrollTargetLayout()
            }
            .scrollTargetBehavior(.viewAligned)
            .scrollPosition(id: .init(get: { currentIndex }, set: { newValue in
                if let newValue {
                    currentIndex = newValue
                }
            }))

            if showIndicators && !showSkeleton && data.count > 1 {
                HStack(spacing: 6) {
                    ForEach(0..<min(data.count, 10), id: \.self) { index in
                        Circle()
                            .fill(index == currentIndex ? theme.palette.tint : theme.palette.border)
                            .frame(width: 6, height: 6)
                            .scaleEffect(index == currentIndex ? 1.2 : 1)
                            .animation(.spring(response: 0.3), value: currentIndex)
                    }

                    if data.count > 10 {
                        Text("+\(data.count - 10)")
                            .font(AppFont.body(theme.metrics.tinyText))
                            .foregroundStyle(theme.palette.textSecondary)
                    }
                }
                .padding(.top, theme.metrics.spacingSmall)
            }
        }
    }
}

// MARK: - Search & Filter Integration

struct ListSearchBar: View {
    @Environment(ThemeStore.self) private var theme

    @Binding var searchText: String
    let placeholder: String
    let onSubmit: (() -> Void)?

    @FocusState private var isFocused: Bool

    init(
        text: Binding<String>,
        placeholder: String = "Search...",
        onSubmit: (() -> Void)? = nil
    ) {
        self._searchText = text
        self.placeholder = placeholder
        self.onSubmit = onSubmit
    }

    var body: some View {
        HStack(spacing: theme.metrics.spacingSmall) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: theme.metrics.iconSizeSmall))
                .foregroundStyle(theme.palette.textSecondary)

            TextField(placeholder, text: $searchText)
                .font(AppFont.body(theme.metrics.bodyText))
                .foregroundStyle(theme.palette.text)
                .focused($isFocused)
                .onSubmit {
                    onSubmit?()
                }

            if !searchText.isEmpty {
                Button {
                    searchText = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: theme.metrics.iconSizeSmall))
                        .foregroundStyle(theme.palette.textSecondary)
                }
            }
        }
        .padding(.horizontal, theme.metrics.spacingSmall)
        .frame(height: theme.metrics.buttonHeightSmall)
        .background(theme.palette.surface)
        .clipShape(RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous)
                .stroke(isFocused ? theme.palette.tint : theme.palette.border, lineWidth: 1)
        )
    }
}

struct FilterChip: View {
    @Environment(ThemeStore.self) private var theme

    let label: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Text(label)
                    .font(AppFont.body(theme.metrics.smallText))

                if isSelected {
                    Image(systemName: "checkmark")
                        .font(.system(size: 10, weight: .bold))
                }
            }
            .padding(.horizontal, theme.metrics.chipPadding)
            .frame(height: theme.metrics.chipHeight)
            .background(isSelected ? theme.palette.tint : theme.palette.surface)
            .foregroundStyle(isSelected ? .white : theme.palette.text)
            .clipShape(Capsule())
            .overlay(
                Capsule()
                    .stroke(isSelected ? .clear : theme.palette.border, lineWidth: 1)
            )
        }
    }
}

struct FilterBar<Filter: Hashable>: View {
    @Environment(ThemeStore.self) private var theme

    let filters: [Filter]
    @Binding var selected: Set<Filter>
    let label: (Filter) -> String

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: theme.metrics.spacingSmall) {
                ForEach(Array(filters.enumerated()), id: \.element) { _, filter in
                    FilterChip(
                        label: label(filter),
                        isSelected: selected.contains(filter)
                    ) {
                        withAnimation(.spring(response: 0.3)) {
                            if selected.contains(filter) {
                                selected.remove(filter)
                            } else {
                                selected.insert(filter)
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, theme.metrics.spacing)
        }
    }
}

// MARK: - Refreshable List Container

struct RefreshableListContainer<Content: View>: View {
    @Environment(ThemeStore.self) private var theme

    let content: Content
    let onRefresh: () async -> Void

    @State private var isRefreshing = false

    init(
        onRefresh: @escaping () async -> Void,
        @ViewBuilder content: () -> Content
    ) {
        self.onRefresh = onRefresh
        self.content = content()
    }

    var body: some View {
        ScrollView {
            InsightRefreshControl(
                isRefreshing: $isRefreshing,
                onRefresh: onRefresh
            )

            content
                .padding(.horizontal, theme.metrics.spacing)
        }
        .refreshable {
            await onRefresh()
        }
    }
}

// MARK: - Reusable List Row Styles

/// Standard row with leading icon/avatar, title, subtitle, and optional trailing content
struct StandardRow<Leading: View, Trailing: View>: View {
    @Environment(ThemeStore.self) private var theme

    let title: String
    let subtitle: String?
    let leading: Leading
    let trailing: Trailing
    let action: (() -> Void)?

    init(
        title: String,
        subtitle: String? = nil,
        @ViewBuilder leading: () -> Leading,
        @ViewBuilder trailing: () -> Trailing = { EmptyView() },
        action: (() -> Void)? = nil
    ) {
        self.title = title
        self.subtitle = subtitle
        self.leading = leading()
        self.trailing = trailing()
        self.action = action
    }

    var body: some View {
        Button {
            action?()
        } label: {
            HStack(spacing: theme.metrics.spacingSmall) {
                leading
                    .frame(width: 44, height: 44)

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(AppFont.body(theme.metrics.bodyText))
                        .foregroundStyle(theme.palette.text)
                        .lineLimit(1)

                    if let subtitle, !subtitle.isEmpty {
                        Text(subtitle)
                            .font(AppFont.body(theme.metrics.smallText))
                            .foregroundStyle(theme.palette.textSecondary)
                            .lineLimit(1)
                    }
                }

                Spacer()

                trailing
            }
            .padding(theme.metrics.cardPadding)
            .background(theme.palette.surface)
            .clipShape(RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous)
                    .stroke(theme.palette.borderLight, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .disabled(action == nil)
    }
}

/// Icon-based leading view for StandardRow
struct RowIcon: View {
    @Environment(ThemeStore.self) private var theme

    let systemName: String
    let color: Color?

    init(_ systemName: String, color: Color? = nil) {
        self.systemName = systemName
        self.color = color
    }

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous)
                .fill((color ?? theme.palette.tint).opacity(theme.isDark ? 0.2 : 0.12))

            Image(systemName: systemName)
                .font(.system(size: theme.metrics.iconSizeSmall, weight: .medium))
                .foregroundStyle(color ?? theme.palette.tint)
        }
    }
}

/// Avatar-based leading view for StandardRow
struct RowAvatar: View {
    @Environment(ThemeStore.self) private var theme

    let name: String
    let imageURL: URL?

    init(name: String, imageURL: URL? = nil) {
        self.name = name
        self.imageURL = imageURL
    }

    private var initials: String {
        let components = name.split(separator: " ")
        let firstInitial = components.first?.prefix(1) ?? ""
        let lastInitial = components.count > 1 ? components.last?.prefix(1) ?? "" : ""
        return "\(firstInitial)\(lastInitial)".uppercased()
    }

    var body: some View {
        ZStack {
            if let imageURL {
                AsyncImage(url: imageURL) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    initialsView
                }
            } else {
                initialsView
            }
        }
        .clipShape(Circle())
    }

    private var initialsView: some View {
        ZStack {
            Circle()
                .fill(theme.palette.tint.opacity(0.2))

            Text(initials)
                .font(AppFont.title(theme.metrics.smallText))
                .foregroundStyle(theme.palette.tint)
        }
    }
}

/// Navigation row with disclosure indicator
struct NavigationRow<Leading: View>: View {
    @Environment(ThemeStore.self) private var theme

    let title: String
    let subtitle: String?
    let leading: Leading
    let badge: String?
    let action: () -> Void

    init(
        title: String,
        subtitle: String? = nil,
        badge: String? = nil,
        @ViewBuilder leading: () -> Leading,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.subtitle = subtitle
        self.badge = badge
        self.leading = leading()
        self.action = action
    }

    var body: some View {
        StandardRow(
            title: title,
            subtitle: subtitle,
            leading: { leading },
            trailing: {
                HStack(spacing: theme.metrics.spacingSmall) {
                    if let badge {
                        Text(badge)
                            .font(AppFont.body(theme.metrics.smallText))
                            .foregroundStyle(theme.palette.textSecondary)
                    }

                    Image(systemName: "chevron.right")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(theme.palette.textSecondary)
                }
            },
            action: action
        )
    }
}

/// Toggle row with switch control
struct ToggleRow<Leading: View>: View {
    @Environment(ThemeStore.self) private var theme

    let title: String
    let subtitle: String?
    let leading: Leading
    @Binding var isOn: Bool

    init(
        title: String,
        subtitle: String? = nil,
        isOn: Binding<Bool>,
        @ViewBuilder leading: () -> Leading
    ) {
        self.title = title
        self.subtitle = subtitle
        self._isOn = isOn
        self.leading = leading()
    }

    var body: some View {
        HStack(spacing: theme.metrics.spacingSmall) {
            leading
                .frame(width: 44, height: 44)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(AppFont.body(theme.metrics.bodyText))
                    .foregroundStyle(theme.palette.text)
                    .lineLimit(1)

                if let subtitle, !subtitle.isEmpty {
                    Text(subtitle)
                        .font(AppFont.body(theme.metrics.smallText))
                        .foregroundStyle(theme.palette.textSecondary)
                        .lineLimit(2)
                }
            }

            Spacer()

            Toggle("", isOn: $isOn)
                .labelsHidden()
                .tint(theme.palette.tint)
        }
        .padding(theme.metrics.cardPadding)
        .background(theme.palette.surface)
        .clipShape(RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous)
                .stroke(theme.palette.borderLight, lineWidth: 1)
        )
    }
}

/// Detail row for displaying key-value pairs
struct DetailRow: View {
    @Environment(ThemeStore.self) private var theme

    let label: String
    let value: String
    let valueColor: Color?
    let action: (() -> Void)?

    init(
        label: String,
        value: String,
        valueColor: Color? = nil,
        action: (() -> Void)? = nil
    ) {
        self.label = label
        self.value = value
        self.valueColor = valueColor
        self.action = action
    }

    var body: some View {
        Button {
            action?()
        } label: {
            HStack {
                Text(label)
                    .font(AppFont.body(theme.metrics.bodyText))
                    .foregroundStyle(theme.palette.text)

                Spacer()

                Text(value)
                    .font(AppFont.body(theme.metrics.bodyText))
                    .foregroundStyle(valueColor ?? theme.palette.textSecondary)

                if action != nil {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(theme.palette.textSecondary)
                }
            }
            .padding(theme.metrics.cardPadding)
            .background(theme.palette.surface)
            .clipShape(RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous)
                    .stroke(theme.palette.borderLight, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .disabled(action == nil)
    }
}

/// Checklist row with checkbox
struct ChecklistRow: View {
    @Environment(ThemeStore.self) private var theme

    let title: String
    let subtitle: String?
    @Binding var isChecked: Bool
    let onToggle: (() -> Void)?

    init(
        title: String,
        subtitle: String? = nil,
        isChecked: Binding<Bool>,
        onToggle: (() -> Void)? = nil
    ) {
        self.title = title
        self.subtitle = subtitle
        self._isChecked = isChecked
        self.onToggle = onToggle
    }

    var body: some View {
        Button {
            withAnimation(.spring(response: 0.3)) {
                isChecked.toggle()
            }
            onToggle?()
        } label: {
            HStack(spacing: theme.metrics.spacingSmall) {
                ZStack {
                    RoundedRectangle(cornerRadius: 6, style: .continuous)
                        .stroke(isChecked ? theme.palette.tint : theme.palette.border, lineWidth: 2)
                        .frame(width: 24, height: 24)

                    if isChecked {
                        RoundedRectangle(cornerRadius: 6, style: .continuous)
                            .fill(theme.palette.tint)
                            .frame(width: 24, height: 24)

                        Image(systemName: "checkmark")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(.white)
                    }
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(AppFont.body(theme.metrics.bodyText))
                        .foregroundStyle(isChecked ? theme.palette.textSecondary : theme.palette.text)
                        .strikethrough(isChecked, color: theme.palette.textSecondary)
                        .lineLimit(2)

                    if let subtitle, !subtitle.isEmpty {
                        Text(subtitle)
                            .font(AppFont.body(theme.metrics.smallText))
                            .foregroundStyle(theme.palette.textSecondary)
                            .lineLimit(1)
                    }
                }

                Spacer()
            }
            .padding(theme.metrics.cardPadding)
            .background(theme.palette.surface)
            .clipShape(RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous)
                    .stroke(theme.palette.borderLight, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

/// Media row with thumbnail image
struct MediaRow: View {
    @Environment(ThemeStore.self) private var theme

    let title: String
    let subtitle: String?
    let imageURL: URL?
    let duration: String?
    let action: () -> Void

    init(
        title: String,
        subtitle: String? = nil,
        imageURL: URL? = nil,
        duration: String? = nil,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.subtitle = subtitle
        self.imageURL = imageURL
        self.duration = duration
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: theme.metrics.spacingSmall) {
                // Thumbnail
                ZStack(alignment: .bottomTrailing) {
                    if let imageURL {
                        AsyncImage(url: imageURL) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } placeholder: {
                            Rectangle()
                                .fill(theme.palette.border.opacity(0.3))
                        }
                    } else {
                        Rectangle()
                            .fill(theme.palette.border.opacity(0.3))
                            .overlay(
                                Image(systemName: "photo")
                                    .font(.system(size: 20))
                                    .foregroundStyle(theme.palette.textSecondary)
                            )
                    }

                    if let duration {
                        Text(duration)
                            .font(AppFont.mono(theme.metrics.tinyText))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 4)
                            .padding(.vertical, 2)
                            .background(.black.opacity(0.7))
                            .clipShape(RoundedRectangle(cornerRadius: 4, style: .continuous))
                            .padding(4)
                    }
                }
                .frame(width: 80, height: 60)
                .clipShape(RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous))

                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(AppFont.body(theme.metrics.bodyText))
                        .foregroundStyle(theme.palette.text)
                        .lineLimit(2)

                    if let subtitle {
                        Text(subtitle)
                            .font(AppFont.body(theme.metrics.smallText))
                            .foregroundStyle(theme.palette.textSecondary)
                            .lineLimit(1)
                    }
                }

                Spacer()

                Image(systemName: "play.circle.fill")
                    .font(.system(size: 28))
                    .foregroundStyle(theme.palette.tint)
            }
            .padding(theme.metrics.cardPadding)
            .background(theme.palette.surface)
            .clipShape(RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous)
                    .stroke(theme.palette.borderLight, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

/// Metric row for displaying stats with trend indicator
struct MetricRow: View {
    @Environment(ThemeStore.self) private var theme

    let title: String
    let value: String
    let unit: String?
    let trend: Trend?
    let trendValue: String?
    let icon: String?
    let color: Color?

    enum Trend {
        case up
        case down
        case neutral

        var icon: String {
            switch self {
            case .up: return "arrow.up.right"
            case .down: return "arrow.down.right"
            case .neutral: return "arrow.right"
            }
        }

        func color(palette: ThemePalette) -> Color {
            switch self {
            case .up: return palette.success
            case .down: return palette.error
            case .neutral: return palette.textSecondary
            }
        }
    }

    init(
        title: String,
        value: String,
        unit: String? = nil,
        trend: Trend? = nil,
        trendValue: String? = nil,
        icon: String? = nil,
        color: Color? = nil
    ) {
        self.title = title
        self.value = value
        self.unit = unit
        self.trend = trend
        self.trendValue = trendValue
        self.icon = icon
        self.color = color
    }

    var body: some View {
        HStack(spacing: theme.metrics.spacingSmall) {
            if let icon {
                RowIcon(icon, color: color)
                    .frame(width: 44, height: 44)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(AppFont.body(theme.metrics.smallText))
                    .foregroundStyle(theme.palette.textSecondary)

                HStack(alignment: .lastTextBaseline, spacing: 4) {
                    Text(value)
                        .font(AppFont.display(theme.metrics.metricValue))
                        .foregroundStyle(color ?? theme.palette.text)

                    if let unit {
                        Text(unit)
                            .font(AppFont.body(theme.metrics.smallText))
                            .foregroundStyle(theme.palette.textSecondary)
                    }
                }
            }

            Spacer()

            if let trend, let trendValue {
                HStack(spacing: 4) {
                    Image(systemName: trend.icon)
                        .font(.system(size: 12, weight: .semibold))

                    Text(trendValue)
                        .font(AppFont.body(theme.metrics.smallText))
                }
                .foregroundStyle(trend.color(palette: theme.palette))
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(trend.color(palette: theme.palette).opacity(0.12))
                .clipShape(Capsule())
            }
        }
        .padding(theme.metrics.cardPadding)
        .background(theme.palette.surface)
        .clipShape(RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous)
                .stroke(theme.palette.borderLight, lineWidth: 1)
        )
    }
}

/// Compact row for dense lists
struct CompactRow: View {
    @Environment(ThemeStore.self) private var theme

    let title: String
    let trailing: String?
    let icon: String?
    let action: (() -> Void)?

    init(
        title: String,
        trailing: String? = nil,
        icon: String? = nil,
        action: (() -> Void)? = nil
    ) {
        self.title = title
        self.trailing = trailing
        self.icon = icon
        self.action = action
    }

    var body: some View {
        Button {
            action?()
        } label: {
            HStack(spacing: theme.metrics.spacingSmall) {
                if let icon {
                    Image(systemName: icon)
                        .font(.system(size: theme.metrics.iconSizeSmall))
                        .foregroundStyle(theme.palette.tint)
                        .frame(width: 24)
                }

                Text(title)
                    .font(AppFont.body(theme.metrics.bodyText))
                    .foregroundStyle(theme.palette.text)
                    .lineLimit(1)

                Spacer()

                if let trailing {
                    Text(trailing)
                        .font(AppFont.body(theme.metrics.smallText))
                        .foregroundStyle(theme.palette.textSecondary)
                }

                if action != nil {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(theme.palette.textSecondary)
                }
            }
            .padding(.horizontal, theme.metrics.spacingSmall)
            .padding(.vertical, theme.metrics.spacingSmall)
            .background(theme.palette.surface)
        }
        .buttonStyle(.plain)
        .disabled(action == nil)
    }
}

/// Action row with destructive/primary styling
struct ActionRow: View {
    @Environment(ThemeStore.self) private var theme

    let title: String
    let icon: String?
    let style: ActionStyle
    let action: () -> Void

    enum ActionStyle {
        case primary
        case secondary
        case destructive

        func color(palette: ThemePalette) -> Color {
            switch self {
            case .primary: return palette.tint
            case .secondary: return palette.text
            case .destructive: return palette.error
            }
        }
    }

    init(
        title: String,
        icon: String? = nil,
        style: ActionStyle = .primary,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.icon = icon
        self.style = style
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: theme.metrics.spacingSmall) {
                if let icon {
                    Image(systemName: icon)
                        .font(.system(size: theme.metrics.iconSizeSmall, weight: .medium))
                }

                Text(title)
                    .font(AppFont.body(theme.metrics.bodyText))

                Spacer()
            }
            .foregroundStyle(style.color(palette: theme.palette))
            .padding(theme.metrics.cardPadding)
            .background(theme.palette.surface)
            .clipShape(RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous)
                    .stroke(theme.palette.borderLight, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

/// Section header for grouping rows
struct ListSectionHeader: View {
    @Environment(ThemeStore.self) private var theme

    let title: String
    let action: (() -> Void)?
    let actionTitle: String?

    init(
        _ title: String,
        actionTitle: String? = nil,
        action: (() -> Void)? = nil
    ) {
        self.title = title
        self.actionTitle = actionTitle
        self.action = action
    }

    var body: some View {
        HStack {
            Text(title.uppercased())
                .font(AppFont.body(theme.metrics.smallText))
                .foregroundStyle(theme.palette.textSecondary)
                .tracking(0.5)

            Spacer()

            if let actionTitle, let action {
                Button(action: action) {
                    Text(actionTitle)
                        .font(AppFont.body(theme.metrics.smallText))
                        .foregroundStyle(theme.palette.tint)
                }
            }
        }
        .padding(.horizontal, theme.metrics.spacing)
        .padding(.vertical, theme.metrics.spacingSmall)
    }
}

/// Divider for separating rows
struct ListDivider: View {
    @Environment(ThemeStore.self) private var theme

    let inset: CGFloat

    init(inset: CGFloat = 0) {
        self.inset = inset
    }

    var body: some View {
        Rectangle()
            .fill(theme.palette.borderLight)
            .frame(height: 1)
            .padding(.leading, inset)
    }
}
