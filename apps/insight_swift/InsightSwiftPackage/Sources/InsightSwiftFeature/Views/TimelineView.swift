import SwiftUI

// MARK: - Timeline View

struct TimelineView: View {
    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme

    @State private var filterState = TimelineFilterState()
    @State private var showFilterSheet = false
    @State private var displayedItemCount: Int = 50

    private static let pageSize = 50

    private var allTimelineItems: [TimelineItem] {
        TimelineOrderingService.timelineItems(
            from: appStore,
            kindFilter: filterState.selectedKinds.isEmpty ? nil : filterState.selectedKinds,
            tagFilter: filterState.selectedTags.isEmpty ? nil : filterState.selectedTags,
            peopleFilter: filterState.selectedPeople.isEmpty ? nil : filterState.selectedPeople,
            contextFilter: filterState.selectedContexts.isEmpty ? nil : filterState.selectedContexts,
            dateRange: filterState.dateRange,
            searchQuery: filterState.searchQuery.isEmpty ? nil : filterState.searchQuery
        )
    }

    private var timelineItems: [TimelineItem] {
        Array(allTimelineItems.prefix(displayedItemCount))
    }

    private var hasMoreItems: Bool {
        displayedItemCount < allTimelineItems.count
    }

    /// Count of items per kind (for filter chip counts)
    private var kindCounts: [TimelineItemKind: Int] {
        let allUnfiltered = TimelineOrderingService.timelineItems(from: appStore)
        var counts: [TimelineItemKind: Int] = [:]
        for kind in TimelineItemKind.allCases {
            counts[kind] = allUnfiltered.filter { $0.kind == kind }.count
        }
        return counts
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                // Header with filter button
                HStack {
                    InsightHeader(title: "Timeline", subtitle: "All your activity")
                    Spacer()
                    Button {
                        showFilterSheet = true
                    } label: {
                        Image(systemName: filterState.hasActiveFilters ? "line.3.horizontal.decrease.circle.fill" : "line.3.horizontal.decrease.circle")
                            .font(.title2)
                            .foregroundStyle(filterState.hasActiveFilters ? theme.palette.tint : theme.palette.textSecondary)
                    }
                }

                // Search bar
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(theme.palette.textSecondary)
                    TextField("Search...", text: $filterState.searchQuery)
                        .font(AppFont.body(theme.metrics.bodyText))
                }
                .padding(theme.metrics.spacingSmall)
                .background(theme.palette.surface)
                .cornerRadius(theme.metrics.cornerRadius)

                // Quick filter chips with counts
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: theme.metrics.spacingSmall) {
                        ForEach(TimelineItemKind.allCases, id: \.self) { kind in
                            let count = kindCounts[kind] ?? 0
                            FilterChip(
                                label: "\(kind.displayName) (\(count))",
                                isSelected: filterState.selectedKinds.contains(kind),
                                color: kind.color(theme: theme)
                            ) {
                                withAnimation(.easeInOut(duration: 0.2)) {
                                    if filterState.selectedKinds.contains(kind) {
                                        filterState.selectedKinds.remove(kind)
                                    } else {
                                        filterState.selectedKinds.insert(kind)
                                    }
                                    // Reset pagination when filters change
                                    displayedItemCount = Self.pageSize
                                }
                            }
                        }
                    }
                }

                // Active filters summary
                if filterState.hasActiveFilters {
                    HStack {
                        Text("\(allTimelineItems.count) results")
                            .font(AppFont.body(theme.metrics.smallText))
                            .foregroundStyle(theme.palette.textSecondary)
                        if timelineItems.count < allTimelineItems.count {
                            Text("(showing \(timelineItems.count))")
                                .font(AppFont.body(theme.metrics.smallText))
                                .foregroundStyle(theme.palette.textSecondary)
                        }
                        Spacer()
                        Button("Clear") {
                            filterState.clear()
                            displayedItemCount = Self.pageSize
                        }
                        .font(AppFont.body(theme.metrics.smallText))
                        .foregroundStyle(theme.palette.tint)
                    }
                }

                // Timeline items
                LazyVStack(spacing: theme.metrics.rowGap) {
                    ForEach(timelineItems) { item in
                        TimelineItemRow(item: item)
                    }
                }

                // Load More button for pagination
                if hasMoreItems {
                    Button {
                        withAnimation(.easeInOut(duration: 0.3)) {
                            displayedItemCount += Self.pageSize
                        }
                    } label: {
                        HStack {
                            Image(systemName: "arrow.down.circle")
                            Text("Load More (\(allTimelineItems.count - timelineItems.count) remaining)")
                        }
                        .font(AppFont.body(theme.metrics.bodyText))
                        .foregroundStyle(theme.palette.tint)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(theme.palette.surface)
                        .cornerRadius(theme.metrics.cornerRadius)
                    }
                }

                // Empty state
                if timelineItems.isEmpty {
                    VStack(spacing: theme.metrics.spacing) {
                        Image(systemName: filterState.hasActiveFilters ? "line.3.horizontal.decrease.circle" : "tray")
                            .font(.system(size: 48))
                            .foregroundStyle(theme.palette.textSecondary.opacity(0.5))
                        Text(filterState.hasActiveFilters ? "No items match your filters" : "No activity yet")
                            .font(AppFont.body(theme.metrics.bodyText))
                            .foregroundStyle(theme.palette.textSecondary)
                        if filterState.hasActiveFilters {
                            Button("Clear Filters") {
                                filterState.clear()
                                displayedItemCount = Self.pageSize
                            }
                            .font(AppFont.body(theme.metrics.bodyText))
                            .foregroundStyle(theme.palette.tint)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, theme.metrics.spacing * 2)
                }
            }
            .padding(theme.metrics.spacing)
        }
        .background(
            LinearGradient(
                colors: [theme.palette.background, theme.palette.background.opacity(theme.isDark ? 0.9 : 0.96)],
                startPoint: .top,
                endPoint: .bottom
            )
        )
        .navigationTitle("Timeline")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
        .sheet(isPresented: $showFilterSheet) {
            TimelineFilterSheet(filterState: $filterState)
        }
        .onChange(of: filterState.searchQuery) { _, _ in
            // Reset pagination when search query changes
            displayedItemCount = Self.pageSize
        }
        .onChange(of: filterState.selectedTags) { _, _ in
            displayedItemCount = Self.pageSize
        }
        .onChange(of: filterState.selectedPeople) { _, _ in
            displayedItemCount = Self.pageSize
        }
        .onChange(of: filterState.selectedContexts) { _, _ in
            displayedItemCount = Self.pageSize
        }
        .onChange(of: filterState.dateRange) { _, _ in
            displayedItemCount = Self.pageSize
        }
    }
}

// MARK: - Timeline Item Row

struct TimelineItemRow: View {
    @Environment(ThemeStore.self) private var theme
    let item: TimelineItem

    var body: some View {
        NavigationLink {
            destinationView(for: item)
        } label: {
            InsightCard {
                HStack(alignment: .top, spacing: theme.metrics.spacingSmall) {
                    // Kind icon
                    Image(systemName: item.kind.iconName)
                        .font(.system(size: 18))
                        .foregroundStyle(item.kind.color(theme: theme))
                        .frame(width: 28, height: 28)
                        .background(item.kind.color(theme: theme).opacity(0.15))
                        .cornerRadius(6)

                    VStack(alignment: .leading, spacing: 4) {
                        // Title
                        Text(item.title)
                            .font(AppFont.body(theme.metrics.bodyText))
                            .foregroundStyle(theme.palette.text)
                            .lineLimit(2)

                        // Subtitle
                        if let subtitle = item.subtitle, !subtitle.isEmpty {
                            Text(subtitle)
                                .font(AppFont.body(theme.metrics.smallText))
                                .foregroundStyle(theme.palette.textSecondary)
                                .lineLimit(2)
                        }

                        // Metadata row
                        HStack(spacing: theme.metrics.spacingSmall) {
                            // Timestamp
                            Text(item.timestamp, style: .relative)
                                .font(AppFont.body(theme.metrics.smallText))
                                .foregroundStyle(theme.palette.textSecondary)

                            // Tags
                            if !item.tags.isEmpty {
                                Text(item.tags.prefix(2).joined(separator: ", "))
                                    .font(AppFont.body(theme.metrics.smallText))
                                    .foregroundStyle(theme.palette.tint)
                                    .lineLimit(1)
                            }
                        }
                    }

                    Spacer()

                    // Facet badges + chevron
                    HStack(spacing: 8) {
                        if !item.facets.isEmpty {
                            VStack(spacing: 2) {
                                ForEach(item.facets.prefix(2), id: \.self) { facet in
                                    Text(facet.rawValue.prefix(1).uppercased())
                                        .font(AppFont.mono(10))
                                        .foregroundStyle(theme.palette.textSecondary)
                                        .padding(4)
                                        .background(theme.palette.surface)
                                        .cornerRadius(4)
                                }
                            }
                        }

                        Image(systemName: "chevron.right")
                            .font(.system(size: 12))
                            .foregroundStyle(theme.palette.textSecondary)
                    }
                }
            }
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private func destinationView(for item: TimelineItem) -> some View {
        switch item.kind {
        case .entry:
            EntryDetailView(entryId: item.sourceId)
        case .task:
            TaskDetailView(taskId: item.sourceId)
        case .note:
            NoteDetailView(noteId: item.sourceId)
        case .habitLog:
            HabitLogDetailView(logId: item.sourceId)
        case .trackerLog:
            TrackerLogDetailView(logId: item.sourceId)
        case .workout:
            WorkoutDetailView(sessionId: item.sourceId)
        case .nutrition:
            NutritionDetailView(logId: item.sourceId)
        }
    }
}

// MARK: - Filter Chip

struct FilterChip: View {
    @Environment(ThemeStore.self) private var theme
    let label: String
    let isSelected: Bool
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(AppFont.body(theme.metrics.smallText))
                .foregroundStyle(isSelected ? .white : theme.palette.text)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isSelected ? color : theme.palette.surface)
                .cornerRadius(16)
        }
    }
}

// MARK: - Timeline Item Kind Extensions

extension TimelineItemKind {
    var displayName: String {
        switch self {
        case .entry: return "Events"
        case .task: return "Tasks"
        case .note: return "Notes"
        case .habitLog: return "Habits"
        case .trackerLog: return "Trackers"
        case .workout: return "Workouts"
        case .nutrition: return "Nutrition"
        }
    }

    var iconName: String {
        switch self {
        case .entry: return "calendar"
        case .task: return "checkmark.circle"
        case .note: return "note.text"
        case .habitLog: return "flame"
        case .trackerLog: return "chart.bar"
        case .workout: return "figure.run"
        case .nutrition: return "fork.knife"
        }
    }

    func color(theme: ThemeStore) -> Color {
        switch self {
        case .entry: return theme.palette.tint
        case .task: return theme.palette.success
        case .note: return theme.palette.warning
        case .habitLog: return Color.orange
        case .trackerLog: return theme.palette.error
        case .workout: return Color.green
        case .nutrition: return Color.purple
        }
    }
}
