import SwiftUI

struct GoalsView: View {
    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme
    @Environment(SupabaseSyncService.self) private var syncService
    @State private var goalTitle = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: "Goals", subtitle: "North stars and outcomes")

                InsightCard {
                    VStack(alignment: .leading, spacing: 10) {
                        TextField("New goal", text: $goalTitle)
                            .textFieldStyle(.roundedBorder)
                        Button("Add Goal") {
                            let trimmed = goalTitle.trimmingCharacters(in: .whitespacesAndNewlines)
                            guard !trimmed.isEmpty else { return }
                            if syncService.isEnabled {
                                syncService.createGoal(title: trimmed)
                            } else {
                                appStore.addGoal(title: trimmed)
                            }
                            goalTitle = ""
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(theme.palette.tint)
                    }
                }

                InsightCard {
                    VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                        Text("Active goals")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)
                        ForEach(appStore.goals, id: \.id) { goal in
                            InsightRow {
                                Text(goal.title)
                                    .font(AppFont.body(theme.metrics.bodyText))
                                    .foregroundStyle(theme.palette.text)
                            } trailing: {
                                Text("Priority \(goal.importance)")
                                    .font(AppFont.body(theme.metrics.smallText))
                                    .foregroundStyle(theme.palette.textSecondary)
                            }
                        }
                    }
                }
            }
            .padding(theme.metrics.spacing)
        }
        .background(theme.palette.background)
        .navigationTitle("Goals")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
    }
}

struct ProjectsView: View {
    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme
    @Environment(SupabaseSyncService.self) private var syncService
    @State private var projectTitle = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: "Projects", subtitle: "Organize the big work")

                InsightCard {
                    VStack(alignment: .leading, spacing: 10) {
                        TextField("New project", text: $projectTitle)
                            .textFieldStyle(.roundedBorder)
                        Button("Add Project") {
                            let trimmed = projectTitle.trimmingCharacters(in: .whitespacesAndNewlines)
                            guard !trimmed.isEmpty else { return }
                            if syncService.isEnabled {
                                syncService.createProject(title: trimmed)
                            } else {
                                appStore.addProject(title: trimmed)
                            }
                            projectTitle = ""
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(theme.palette.tint)
                    }
                }

                InsightCard {
                    VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                        Text("Active projects")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)
                        ForEach(appStore.projects, id: \.id) { project in
                            InsightRow {
                                Text(project.title)
                                    .font(AppFont.body(theme.metrics.bodyText))
                                    .foregroundStyle(theme.palette.text)
                            } trailing: {
                                Text(project.status.capitalized)
                                    .font(AppFont.body(theme.metrics.smallText))
                                    .foregroundStyle(theme.palette.textSecondary)
                            }
                        }
                    }
                }
            }
            .padding(theme.metrics.spacing)
        }
        .background(theme.palette.background)
        .navigationTitle("Projects")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
    }
}

struct RewardsView: View {
    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme
    @State private var rewardTitle = ""
    @State private var rewardCost = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: "Rewards", subtitle: "Spend points on real wins")

                InsightCard {
                    VStack(alignment: .leading, spacing: 10) {
                        TextField("Reward title", text: $rewardTitle)
                            .textFieldStyle(.roundedBorder)
                        TextField("Points cost", text: $rewardCost)
                            .keyboardType(.numberPad)
                            .textFieldStyle(.roundedBorder)
                        Button("Add Reward") {
                            let trimmed = rewardTitle.trimmingCharacters(in: .whitespacesAndNewlines)
                            guard !trimmed.isEmpty else { return }
                            let cost = Int(rewardCost) ?? 0
                            appStore.addReward(title: trimmed, pointsCost: max(cost, 0))
                            rewardTitle = ""
                            rewardCost = ""
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(theme.palette.tint)
                    }
                }

                InsightCard {
                    VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                        Text("Reward shelf")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)
                        ForEach(appStore.rewards, id: \.id) { reward in
                            InsightRow {
                                Text(reward.title)
                                    .font(AppFont.body(theme.metrics.bodyText))
                                    .foregroundStyle(theme.palette.text)
                            } trailing: {
                                Button(reward.redeemedAt == nil ? "Redeem" : "Undo") {
                                    appStore.toggleReward(reward)
                                }
                                .buttonStyle(.bordered)
                                .tint(theme.palette.warning)
                            }
                        }
                    }
                }
            }
            .padding(theme.metrics.spacing)
        }
        .background(theme.palette.background)
        .navigationTitle("Rewards")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
    }
}

struct ReportsView: View {
    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: "Reports", subtitle: "Trends and growth")

                ForEach(appStore.reports, id: \.id) { report in
                    InsightCard {
                        VStack(alignment: .leading, spacing: 10) {
                            Text(report.title)
                                .font(AppFont.title(theme.metrics.sectionTitle))
                                .foregroundStyle(theme.palette.text)
                            Text(report.subtitle)
                                .font(AppFont.body(theme.metrics.smallText))
                                .foregroundStyle(theme.palette.textSecondary)
                            InsightRow {
                                Text(report.value)
                                    .font(AppFont.display(theme.metrics.headerTitle))
                                    .foregroundStyle(theme.palette.text)
                            } trailing: {
                                Text(report.delta)
                                    .font(AppFont.body(theme.metrics.smallText))
                                    .foregroundStyle(theme.palette.success)
                            }
                        }
                    }
                }
            }
            .padding(theme.metrics.spacing)
        }
        .background(theme.palette.background)
        .navigationTitle("Reports")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
    }
}

struct TrackersView: View {
    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme
    @Environment(SupabaseSyncService.self) private var syncService
    @State private var trackerKey = ""
    @State private var trackerUnit = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: "Trackers", subtitle: "Log metrics that matter")

                InsightCard {
                    VStack(alignment: .leading, spacing: 10) {
                        TextField("Tracker key", text: $trackerKey)
                            .textFieldStyle(.roundedBorder)
                        TextField("Unit (optional)", text: $trackerUnit)
                            .textFieldStyle(.roundedBorder)
                        Button("Add Tracker") {
                            let trimmed = trackerKey.trimmingCharacters(in: .whitespacesAndNewlines)
                            guard !trimmed.isEmpty else { return }
                            if syncService.isEnabled {
                                syncService.createTracker(key: trimmed, unit: trackerUnit.isEmpty ? nil : trackerUnit)
                            } else {
                                appStore.addTracker(key: trimmed, unit: trackerUnit.isEmpty ? nil : trackerUnit)
                            }
                            trackerKey = ""
                            trackerUnit = ""
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(theme.palette.tint)
                    }
                }

                InsightCard {
                    VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                        Text("Daily trackers")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)

                        ForEach(appStore.trackers, id: \.id) { tracker in
                            InsightRow {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(tracker.key.capitalized)
                                        .font(AppFont.body(theme.metrics.bodyText))
                                        .foregroundStyle(theme.palette.text)
                                    if let unit = tracker.unit {
                                        Text(unit)
                                            .font(AppFont.body(theme.metrics.smallText))
                                            .foregroundStyle(theme.palette.textSecondary)
                                    }
                                }
                            } trailing: {
                                Button("Log") {
                                    if syncService.isEnabled {
                                        syncService.logTracker(tracker, value: 1)
                                    } else {
                                        appStore.logTracker(tracker, value: 1)
                                    }
                                }
                                .buttonStyle(.bordered)
                                .tint(theme.palette.warning)
                            }
                        }
                    }
                }
            }
            .padding(theme.metrics.spacing)
        }
        .background(theme.palette.background)
        .navigationTitle("Trackers")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
    }
}

struct PeopleView: View {
    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme
    @Environment(SupabaseSyncService.self) private var syncService
    @State private var personName = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: "People", subtitle: "Contacts and relationships")

                InsightCard {
                    VStack(alignment: .leading, spacing: 10) {
                        TextField("Add person", text: $personName)
                            .textFieldStyle(.roundedBorder)
                        Button("Save") {
                            let trimmed = personName.trimmingCharacters(in: .whitespacesAndNewlines)
                            guard !trimmed.isEmpty else { return }
                            if syncService.isEnabled {
                                syncService.createEntity(type: "person", name: trimmed)
                            } else {
                                appStore.addPerson(name: trimmed)
                            }
                            personName = ""
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(theme.palette.tint)
                    }
                }

                InsightCard {
                    VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                        Text("People list")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)
                        ForEach(appStore.people, id: \.id) { person in
                            InsightRow {
                                Text(person.name)
                                    .font(AppFont.body(theme.metrics.bodyText))
                                    .foregroundStyle(theme.palette.text)
                            } trailing: {
                                Text(person.lastSeenAt?.formatted(date: .abbreviated, time: .shortened) ?? "New")
                                    .font(AppFont.body(theme.metrics.smallText))
                                    .foregroundStyle(theme.palette.textSecondary)
                            }
                        }
                    }
                }
            }
            .padding(theme.metrics.spacing)
        }
        .background(theme.palette.background)
        .navigationTitle("People")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
    }
}

struct PlacesView: View {
    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme
    @Environment(SupabaseSyncService.self) private var syncService
    @State private var placeName = ""
    @State private var placeCategory = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: "Places", subtitle: "Locations and contexts")

                InsightCard {
                    VStack(alignment: .leading, spacing: 10) {
                        TextField("Place name", text: $placeName)
                            .textFieldStyle(.roundedBorder)
                        TextField("Category", text: $placeCategory)
                            .textFieldStyle(.roundedBorder)
                        Button("Save") {
                            let trimmed = placeName.trimmingCharacters(in: .whitespacesAndNewlines)
                            guard !trimmed.isEmpty else { return }
                            let category = placeCategory.isEmpty ? "General" : placeCategory
                            if syncService.isEnabled {
                                syncService.createEntity(type: "place", name: trimmed)
                            } else {
                                appStore.addPlace(name: trimmed, category: category)
                            }
                            placeName = ""
                            placeCategory = ""
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(theme.palette.tint)
                    }
                }

                InsightCard {
                    VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                        Text("Saved places")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)
                        ForEach(appStore.places, id: \.id) { place in
                            InsightRow {
                                Text(place.name)
                                    .font(AppFont.body(theme.metrics.bodyText))
                                    .foregroundStyle(theme.palette.text)
                            } trailing: {
                                Text(place.category)
                                    .font(AppFont.body(theme.metrics.smallText))
                                    .foregroundStyle(theme.palette.textSecondary)
                            }
                        }
                    }
                }
            }
            .padding(theme.metrics.spacing)
        }
        .background(theme.palette.background)
        .navigationTitle("Places")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
    }
}

struct TagsView: View {
    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme
    @Environment(SupabaseSyncService.self) private var syncService
    @State private var tagName = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: "Tags", subtitle: "Labels for filtering")

                InsightCard {
                    VStack(alignment: .leading, spacing: 10) {
                        TextField("New tag", text: $tagName)
                            .textFieldStyle(.roundedBorder)
                        Button("Add Tag") {
                            let trimmed = tagName.trimmingCharacters(in: .whitespacesAndNewlines)
                            guard !trimmed.isEmpty else { return }
                            if syncService.isEnabled {
                                syncService.createEntity(type: "tag", name: trimmed)
                            } else {
                                appStore.addTag(name: trimmed)
                            }
                            tagName = ""
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(theme.palette.tint)
                    }
                }

                InsightCard {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 80), spacing: 8)], spacing: 8) {
                        ForEach(appStore.tags, id: \.id) { tag in
                            InsightChip(label: tag.name, color: Color(hex: tag.colorHex))
                        }
                    }
                }
            }
            .padding(theme.metrics.spacing)
        }
        .background(theme.palette.background)
        .navigationTitle("Tags")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
    }
}

struct TimelineView: View {
    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: "Timeline", subtitle: "Events, tasks, and logs")

                InsightCard {
                    VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                        ForEach(timelineItems, id: \.id) { item in
                            VStack(alignment: .leading, spacing: 4) {
                                Text(item.title)
                                    .font(AppFont.body(theme.metrics.bodyText))
                                    .foregroundStyle(theme.palette.text)
                                Text(item.detail)
                                    .font(AppFont.body(theme.metrics.smallText))
                                    .foregroundStyle(theme.palette.textSecondary)
                            }
                        }
                    }
                }
            }
            .padding(theme.metrics.spacing)
        }
        .background(theme.palette.background)
        .navigationTitle("Timeline")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
    }

    private var timelineItems: [TimelineItem] {
        var items: [TimelineItem] = []
        items += appStore.entries.map {
            TimelineItem(
                title: $0.title,
                detail: $0.startAt?.formatted(date: .abbreviated, time: .shortened) ?? "Entry",
                createdAt: $0.startAt ?? Date()
            )
        }
        items += appStore.tasks.map {
            TimelineItem(
                title: $0.title,
                detail: "TodoTask - \($0.status.rawValue)",
                createdAt: $0.dueAt ?? Date()
            )
        }
        items += appStore.habitLogs.map {
            TimelineItem(
                title: "Habit log",
                detail: $0.date.formatted(date: .abbreviated, time: .shortened),
                createdAt: $0.date
            )
        }
        return items.sorted { $0.createdAt > $1.createdAt }
    }
}

struct ReflectionsView: View {
    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme
    @State private var prompt = ""
    @State private var response = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: "Reflections", subtitle: "Daily review prompts")

                InsightCard {
                    VStack(alignment: .leading, spacing: 10) {
                        TextField("Prompt", text: $prompt)
                            .textFieldStyle(.roundedBorder)
                        TextField("Response", text: $response, axis: .vertical)
                            .lineLimit(2...6)
                            .textFieldStyle(.roundedBorder)
                        Button("Save Reflection") {
                            let trimmedPrompt = prompt.trimmingCharacters(in: .whitespacesAndNewlines)
                            let trimmedResponse = response.trimmingCharacters(in: .whitespacesAndNewlines)
                            guard !trimmedPrompt.isEmpty else { return }
                            appStore.addReflection(prompt: trimmedPrompt, response: trimmedResponse)
                            prompt = ""
                            response = ""
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(theme.palette.tint)
                    }
                }

                InsightCard {
                    VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                        ForEach(appStore.reflections, id: \.id) { reflection in
                            VStack(alignment: .leading, spacing: 4) {
                                Text(reflection.prompt)
                                    .font(AppFont.body(theme.metrics.bodyText))
                                    .foregroundStyle(theme.palette.text)
                                Text(reflection.response)
                                    .font(AppFont.body(theme.metrics.smallText))
                                    .foregroundStyle(theme.palette.textSecondary)
                            }
                        }
                    }
                }
            }
            .padding(theme.metrics.spacing)
        }
        .background(theme.palette.background)
        .navigationTitle("Reflections")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
    }
}

// MARK: - Assistant Mode

enum AssistantMode: String, CaseIterable {
    case local
    case llm

    var label: String {
        switch self {
        case .local: return "Local"
        case .llm: return "AI"
        }
    }

    var icon: String {
        switch self {
        case .local: return "magnifyingglass"
        case .llm: return "sparkles"
        }
    }
}

struct AssistantView: View {
    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme
    @Environment(SupabaseSyncService.self) private var syncService
    @Environment(SupabaseAuthStore.self) private var authStore
    @State private var message = ""
    @State private var assistantMode: AssistantMode = .local
    @State private var searchResults: [SearchResult] = []
    @State private var isSearching = false
    @State private var pendingConfirmation: ConfirmationCard? = nil

    var body: some View {
        VStack(spacing: 0) {
            // Mode toggle header
            HStack {
                ForEach(AssistantMode.allCases, id: \.self) { mode in
                    Button {
                        assistantMode = mode
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: mode.icon)
                            Text(mode.label)
                        }
                        .font(AppFont.body(theme.metrics.smallText))
                        .foregroundStyle(assistantMode == mode ? Color.white : theme.palette.text)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(assistantMode == mode ? theme.palette.tint : theme.palette.surface)
                        .cornerRadius(16)
                    }
                }
                Spacer()

                // Privacy indicator
                if assistantMode == .local {
                    HStack(spacing: 4) {
                        Image(systemName: "lock.shield")
                        Text("Private")
                    }
                    .font(AppFont.body(theme.metrics.smallText))
                    .foregroundStyle(theme.palette.success)
                }
            }
            .padding(.horizontal, theme.metrics.spacing)
            .padding(.vertical, 8)
            .background(theme.palette.surface)

            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    InsightHeader(
                        title: "Assistant",
                        subtitle: assistantMode == .local ? "Search your data privately" : "AI-powered insights"
                    )

                    // Messages
                    ForEach(appStore.assistantMessages, id: \.id) { msg in
                        HStack {
                            if msg.role == .assistant {
                                Bubble(text: msg.content, isUser: false)
                                Spacer()
                            } else {
                                Spacer()
                                Bubble(text: msg.content, isUser: true)
                            }
                        }
                    }

                    // Search results as source cards (Local mode)
                    if !searchResults.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Found \(searchResults.count) results")
                                .font(AppFont.body(theme.metrics.smallText))
                                .foregroundStyle(theme.palette.textSecondary)

                            ForEach(searchResults.prefix(10)) { result in
                                SearchResultCard(result: result)
                            }

                            if searchResults.count > 10 {
                                Text("+ \(searchResults.count - 10) more results")
                                    .font(AppFont.body(theme.metrics.smallText))
                                    .foregroundStyle(theme.palette.textSecondary)
                            }
                        }
                    }

                    // Confirmation card (for mutations)
                    if let confirmation = pendingConfirmation {
                        ConfirmationCardView(card: confirmation) {
                            // Execute action
                            pendingConfirmation = nil
                        } onCancel: {
                            pendingConfirmation = nil
                        }
                    }

                    // Loading indicator
                    if isSearching {
                        HStack {
                            ProgressView()
                                .tint(theme.palette.tint)
                            Text("Searching...")
                                .font(AppFont.body(theme.metrics.smallText))
                                .foregroundStyle(theme.palette.textSecondary)
                        }
                    }
                }
                .padding(theme.metrics.spacing)
            }

            Divider()

            HStack(spacing: 12) {
                TextField("Ask Insight...", text: $message)
                    .textFieldStyle(.roundedBorder)
                    .onSubmit {
                        sendMessage()
                    }
                Button("Send") {
                    sendMessage()
                }
                .buttonStyle(.borderedProminent)
                .tint(theme.palette.tint)
                .disabled(message.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
            .padding()
            .background(theme.palette.surface)
        }
        .background(theme.palette.background)
        .navigationTitle("Assistant")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
    }

    private func sendMessage() {
        let trimmed = message.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        appStore.appendAssistantMessage(role: .user, content: trimmed)
        message = ""

        switch assistantMode {
        case .local:
            performLocalSearch(query: trimmed)
        case .llm:
            performLLMQuery(query: trimmed)
        }
    }

    private func performLocalSearch(query: String) {
        isSearching = true
        searchResults = []

        // Perform search asynchronously
        Task { @MainActor in
            let results = LocalSearchService.search(query: query, store: appStore)
            searchResults = results

            if results.isEmpty {
                appStore.appendAssistantMessage(role: .assistant, content: "No results found for \"\(query)\". Try different keywords.")
            } else {
                appStore.appendAssistantMessage(role: .assistant, content: "Found \(results.count) items matching your search.")
            }
            isSearching = false
        }
    }

    private func performLLMQuery(query: String) {
        // Check auth - require sign in for LLM mode
        guard authStore.isAuthenticated else {
            appStore.appendAssistantMessage(
                role: .assistant,
                content: "Sign in to use AI mode. Go to Settings to authenticate with your account."
            )
            assistantMode = .local
            return
        }

        isSearching = true
        searchResults = []

        // First do local search for context
        let localResults = LocalSearchService.search(query: query, store: appStore, limit: 5)
        searchResults = localResults

        // Call Supabase edge function with context
        Task { @MainActor in
            do {
                let reply = try await syncService.queryAssistant(prompt: query, context: localResults)
                appStore.appendAssistantMessage(role: .assistant, content: reply)
            } catch {
                appStore.appendAssistantMessage(
                    role: .assistant,
                    content: "AI is temporarily unavailable. Found \(localResults.count) relevant items via local search."
                )
            }
            isSearching = false
        }
    }
}

// MARK: - Search Result Card

private struct SearchResultCard: View {
    @Environment(ThemeStore.self) private var theme
    let result: SearchResult

    var body: some View {
        NavigationLink {
            destinationView(for: result)
        } label: {
            HStack(alignment: .top, spacing: 12) {
                // Type icon
                Image(systemName: iconName)
                    .font(.system(size: 16))
                    .foregroundStyle(iconColor)
                    .frame(width: 24, height: 24)
                    .background(iconColor.opacity(0.15))
                    .cornerRadius(6)

                VStack(alignment: .leading, spacing: 4) {
                    Text(result.title)
                        .font(AppFont.body(theme.metrics.bodyText))
                        .foregroundStyle(theme.palette.text)
                        .lineLimit(1)

                    if let subtitle = result.subtitle {
                        Text(subtitle)
                            .font(AppFont.body(theme.metrics.smallText))
                            .foregroundStyle(theme.palette.textSecondary)
                            .lineLimit(2)
                    }

                    HStack {
                        Text(result.resultType)
                            .font(AppFont.mono(theme.metrics.smallText - 2))
                            .foregroundStyle(theme.palette.textSecondary)

                        Text(result.timestamp, style: .relative)
                            .font(AppFont.body(theme.metrics.smallText))
                            .foregroundStyle(theme.palette.textSecondary)
                    }
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 12))
                    .foregroundStyle(theme.palette.textSecondary)
            }
            .padding(12)
            .background(theme.palette.surface)
            .cornerRadius(theme.metrics.cornerRadius)
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private func destinationView(for result: SearchResult) -> some View {
        switch result {
        case .entry(let e):
            EntryDetailView(entryId: e.id)
        case .task(let t):
            TaskDetailView(taskId: t.id)
        case .note(let n):
            NoteDetailView(noteId: n.id)
        case .trackerLog(let l, _):
            TrackerLogDetailView(logId: l.id)
        case .habitLog(let l, _):
            HabitLogDetailView(logId: l.id)
        case .workout(let w, _):
            WorkoutDetailView(sessionId: w.id)
        case .nutrition(let n, _):
            NutritionDetailView(logId: n.id)
        }
    }

    private var iconName: String {
        switch result {
        case .entry: return "calendar"
        case .task: return "checkmark.circle"
        case .note: return "note.text"
        case .trackerLog: return "chart.bar"
        case .habitLog: return "flame"
        case .workout: return "figure.run"
        case .nutrition: return "fork.knife"
        }
    }

    private var iconColor: Color {
        switch result {
        case .entry: return theme.palette.tint
        case .task: return theme.palette.success
        case .note: return theme.palette.warning
        case .trackerLog: return theme.palette.error
        case .habitLog: return Color.orange
        case .workout: return Color.green
        case .nutrition: return Color.purple
        }
    }
}

// MARK: - Confirmation Card

struct ConfirmationCard {
    let title: String
    let message: String
    let confirmLabel: String
    let action: () -> Void
}

private struct ConfirmationCardView: View {
    @Environment(ThemeStore.self) private var theme
    let card: ConfirmationCard
    let onConfirm: () -> Void
    let onCancel: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "exclamationmark.triangle")
                    .foregroundStyle(theme.palette.warning)
                Text(card.title)
                    .font(AppFont.title(theme.metrics.sectionTitle))
                    .foregroundStyle(theme.palette.text)
            }

            Text(card.message)
                .font(AppFont.body(theme.metrics.bodyText))
                .foregroundStyle(theme.palette.textSecondary)

            HStack {
                Button("Cancel") {
                    onCancel()
                }
                .buttonStyle(.bordered)
                .tint(theme.palette.textSecondary)

                Button(card.confirmLabel) {
                    card.action()
                    onConfirm()
                }
                .buttonStyle(.borderedProminent)
                .tint(theme.palette.tint)
            }
        }
        .padding()
        .background(theme.palette.surface)
        .cornerRadius(theme.metrics.cornerRadius)
        .overlay(
            RoundedRectangle(cornerRadius: theme.metrics.cornerRadius)
                .stroke(theme.palette.warning.opacity(0.5), lineWidth: 1)
        )
    }
}

private struct Bubble: View {
    let text: String
    let isUser: Bool
    @Environment(ThemeStore.self) private var theme

    var body: some View {
        Text(text)
            .font(AppFont.body(theme.metrics.bodyText))
            .foregroundStyle(isUser ? Color.white : theme.palette.text)
            .padding(12)
            .background(isUser ? theme.palette.tint : theme.palette.surface)
            .clipShape(RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous))
    }
}

struct ExploreView: View {
    @Environment(ThemeStore.self) private var theme

    private let ideas = [
        "Run a 90-minute deep work block",
        "Review last week in 5 bullets",
        "Log mood and energy after lunch",
        "Schedule recovery session",
        "Plan next sprint"
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: "Explore", subtitle: "Suggested rituals and insights")

                ForEach(ideas, id: \.self) { idea in
                    InsightCard {
                        Text(idea)
                            .font(AppFont.body(theme.metrics.bodyText))
                            .foregroundStyle(theme.palette.text)
                    }
                }
            }
            .padding(theme.metrics.spacing)
        }
        .background(theme.palette.background)
        .navigationTitle("Explore")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
    }
}

struct HealthView: View {
    @Environment(AppStore.self) private var appStore
    @Environment(HealthKitService.self) private var healthKit
    @Environment(ThemeStore.self) private var theme

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: "Health", subtitle: "Workouts and nutrition")

                // HealthKit Integration Card
                InsightCard {
                    VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                        @Bindable var hk = healthKit
                        Toggle(isOn: $hk.isEnabled) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Apple Health")
                                    .font(AppFont.body(theme.metrics.bodyText))
                                    .foregroundStyle(theme.palette.text)
                                Text(healthKit.authorizationStatus.label)
                                    .font(AppFont.body(theme.metrics.smallText))
                                    .foregroundStyle(theme.palette.textSecondary)
                            }
                        }
                        .tint(theme.palette.accent)

                        if healthKit.isEnabled && healthKit.authorizationStatus.isAuthorized {
                            Divider()
                            Button {
                                Task {
                                    await syncHealthKitData()
                                }
                            } label: {
                                HStack {
                                    if healthKit.isSyncing {
                                        ProgressView()
                                            .scaleEffect(0.8)
                                    } else {
                                        Image(systemName: "arrow.triangle.2.circlepath")
                                    }
                                    Text(healthKit.isSyncing ? "Syncing..." : "Sync Now")
                                }
                                .font(AppFont.body(theme.metrics.bodyText))
                                .foregroundStyle(theme.palette.accent)
                            }
                            .disabled(healthKit.isSyncing)

                            if let lastSync = healthKit.lastSyncAt {
                                Text("Last sync: \(lastSync.formatted(date: .abbreviated, time: .shortened))")
                                    .font(AppFont.body(theme.metrics.smallText))
                                    .foregroundStyle(theme.palette.textSecondary)
                            }
                        }

                        if let error = healthKit.lastError {
                            Text(error)
                                .font(AppFont.body(theme.metrics.smallText))
                                .foregroundStyle(.red)
                        }
                    }
                }

                InsightCard {
                    NavigationLink("Workouts") {
                        WorkoutsView()
                    }
                    .font(AppFont.body(theme.metrics.bodyText))
                    .foregroundStyle(theme.palette.text)
                }

                InsightCard {
                    NavigationLink("Nutrition") {
                        NutritionView()
                    }
                    .font(AppFont.body(theme.metrics.bodyText))
                    .foregroundStyle(theme.palette.text)
                }
            }
            .padding(theme.metrics.spacing)
        }
        .background(theme.palette.background)
        .navigationTitle("Health")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
    }

    private func syncHealthKitData() async {
        do {
            let workoutResults = try await healthKit.syncWorkouts(entries: appStore.entries)
            appStore.applyWorkoutSyncResults(workoutResults)

            let nutritionResults = try await healthKit.syncNutrition(entries: appStore.entries)
            appStore.applyNutritionSyncResults(nutritionResults)
        } catch {
            // Error is captured in healthKit.lastError
        }
    }
}

struct WorkoutsView: View {
    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: "Workouts", subtitle: "Training log")

                if appStore.workoutSessions.isEmpty {
                    InsightCard {
                        Text("No workouts recorded yet")
                            .font(AppFont.body(theme.metrics.bodyText))
                            .foregroundStyle(theme.palette.textSecondary)
                    }
                } else {
                    InsightCard {
                        VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                            ForEach(appStore.workoutSessions, id: \.id) { session in
                                let entry = appStore.entry(for: session)
                                let durationMinutes = calculateDuration(entry: entry)
                                NavigationLink(destination: WorkoutDetailView(sessionId: session.id)) {
                                    InsightRow {
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(entry?.title ?? "Workout")
                                                .font(AppFont.body(theme.metrics.bodyText))
                                                .foregroundStyle(theme.palette.text)
                                            Text(session.template.rawValue.capitalized)
                                                .font(AppFont.body(theme.metrics.smallText))
                                                .foregroundStyle(theme.palette.textSecondary)
                                        }
                                    } trailing: {
                                        HStack(spacing: 8) {
                                            VStack(alignment: .trailing, spacing: 2) {
                                                Text("\(durationMinutes)m")
                                                    .font(AppFont.body(theme.metrics.smallText))
                                                    .foregroundStyle(theme.palette.textSecondary)
                                                if let startAt = entry?.startAt {
                                                    Text(startAt.formatted(date: .abbreviated, time: .omitted))
                                                        .font(AppFont.body(theme.metrics.smallText))
                                                        .foregroundStyle(theme.palette.textSecondary)
                                                }
                                            }
                                            Image(systemName: "chevron.right")
                                                .font(.system(size: 12))
                                                .foregroundStyle(theme.palette.textSecondary)
                                        }
                                    }
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
            }
            .padding(theme.metrics.spacing)
        }
        .background(theme.palette.background)
        .navigationTitle("Workouts")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
    }

    private func calculateDuration(entry: Entry?) -> Int {
        guard let entry, let startAt = entry.startAt, let endAt = entry.endAt else { return 0 }
        return Int(endAt.timeIntervalSince(startAt) / 60)
    }
}

struct NutritionView: View {
    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: "Nutrition", subtitle: "Meals and calories")

                if appStore.nutritionLogs.isEmpty {
                    InsightCard {
                        Text("No nutrition data recorded yet")
                            .font(AppFont.body(theme.metrics.bodyText))
                            .foregroundStyle(theme.palette.textSecondary)
                    }
                } else {
                    InsightCard {
                        VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                            ForEach(appStore.nutritionLogs, id: \.id) { log in
                                let entry = appStore.entry(for: log)
                                NavigationLink(destination: NutritionDetailView(logId: log.id)) {
                                    InsightRow {
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(entry?.title ?? "Meal")
                                                .font(AppFont.body(theme.metrics.bodyText))
                                                .foregroundStyle(theme.palette.text)
                                            if let startAt = entry?.startAt {
                                                Text(startAt.formatted(date: .abbreviated, time: .shortened))
                                                    .font(AppFont.body(theme.metrics.smallText))
                                                    .foregroundStyle(theme.palette.textSecondary)
                                            }
                                        }
                                    } trailing: {
                                        HStack(spacing: 8) {
                                            VStack(alignment: .trailing, spacing: 2) {
                                                if let calories = log.calories {
                                                    Text("\(Int(calories)) cal")
                                                        .font(AppFont.body(theme.metrics.smallText))
                                                        .foregroundStyle(theme.palette.textSecondary)
                                                }
                                                macrosLabel(for: log)
                                            }
                                            Image(systemName: "chevron.right")
                                                .font(.system(size: 12))
                                                .foregroundStyle(theme.palette.textSecondary)
                                        }
                                    }
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
            }
            .padding(theme.metrics.spacing)
        }
        .background(theme.palette.background)
        .navigationTitle("Nutrition")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
    }

    @ViewBuilder
    private func macrosLabel(for log: NutritionLog) -> some View {
        let parts: [String] = [
            log.proteinG.map { "P: \(Int($0))g" },
            log.carbsG.map { "C: \(Int($0))g" },
            log.fatG.map { "F: \(Int($0))g" }
        ].compactMap { $0 }

        if !parts.isEmpty {
            Text(parts.joined(separator: " "))
                .font(AppFont.body(theme.metrics.smallText))
                .foregroundStyle(theme.palette.textSecondary)
        }
    }
}

struct EcosystemView: View {
    @Environment(ThemeStore.self) private var theme
    @State private var integrations: [Integration] = [
        Integration(name: "Supabase", isOn: true),
        Integration(name: "Apple Health", isOn: false),
        Integration(name: "Calendar Sync", isOn: true),
        Integration(name: "Live Activities", isOn: true)
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: "Ecosystem", subtitle: "Connected services")

                InsightCard {
                    VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                        ForEach($integrations) { $integration in
                            Toggle(integration.name, isOn: $integration.isOn)
                                .tint(theme.palette.tint)
                        }
                    }
                }
            }
            .padding(theme.metrics.spacing)
        }
        .background(theme.palette.background)
        .navigationTitle("Ecosystem")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
    }
}

struct SettingsView: View {
    @Environment(ThemeStore.self) private var theme
    @Environment(CaptureParserService.self) private var captureParserService
    @Environment(SupabaseAuthStore.self) private var authStore
    @Environment(SupabaseSyncService.self) private var syncService
    @Environment(NotificationService.self) private var notificationService
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        @Bindable var theme = theme
        @Bindable var captureParserService = captureParserService
        @Bindable var syncService = syncService
        @Bindable var notificationService = notificationService
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: "Settings", subtitle: "Theme and display")

                InsightCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Account")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)

                        if authStore.isAuthenticated {
                            Text(authStore.email ?? "Signed in")
                                .font(AppFont.body(theme.metrics.bodyText))
                                .foregroundStyle(theme.palette.text)
                            Button("Sign Out") {
                                Task { await authStore.signOut() }
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(theme.palette.error)
                        } else {
                            TextField("Email", text: $email)
                                .textFieldStyle(.roundedBorder)
                                .textInputAutocapitalization(.never)
                                .keyboardType(.emailAddress)
                            SecureField("Password", text: $password)
                                .textFieldStyle(.roundedBorder)
                            HStack {
                                Button("Sign In") {
                                    Task { await authStore.signIn(email: email, password: password) }
                                }
                                .buttonStyle(.borderedProminent)
                                .tint(theme.palette.tint)
                                Button("Sign Up") {
                                    Task { await authStore.signUp(email: email, password: password) }
                                }
                                .buttonStyle(.bordered)
                                .tint(theme.palette.tint)
                            }
                        }

                        if let error = authStore.errorMessage {
                            Text(error)
                                .font(AppFont.body(theme.metrics.smallText))
                                .foregroundStyle(theme.palette.error)
                        }
                    }
                }

                InsightCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Theme")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)
                        Picker("Theme", selection: $theme.mode) {
                            ForEach(ThemeMode.allCases) { mode in
                                Text(mode.rawValue.capitalized).tag(mode)
                            }
                        }
                        .pickerStyle(.segmented)
                    }
                }

                InsightCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Display")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)
                        Picker("Display", selection: $theme.display) {
                            ForEach(DisplayMode.allCases) { display in
                                Text(display.rawValue.capitalized).tag(display)
                            }
                        }
                        .pickerStyle(.segmented)
                    }
                }

                InsightCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Parsing Engine")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)
                        Picker("Engine", selection: $captureParserService.engine) {
                            ForEach(CaptureEngine.allCases) { engine in
                                Text(engine.rawValue.capitalized).tag(engine)
                            }
                        }
                        .pickerStyle(.segmented)
                    }
                }

                InsightCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Supabase Sync")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)
                        Toggle("Sync enabled", isOn: $syncService.isEnabled)
                            .tint(theme.palette.tint)
                        HStack {
                            Button("Sync now") {
                                Task { await syncService.loadAll() }
                            }
                            .buttonStyle(.bordered)
                            .tint(theme.palette.tint)

                            if syncService.isSyncing {
                                Text("Syncing...")
                                    .font(AppFont.body(theme.metrics.smallText))
                                    .foregroundStyle(theme.palette.textSecondary)
                            }
                        }
                        if let error = syncService.errorMessage {
                            Text(error)
                                .font(AppFont.body(theme.metrics.smallText))
                                .foregroundStyle(theme.palette.error)
                        }
                    }
                }

                InsightCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Notifications")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)

                        Toggle("Habit Reminders", isOn: $notificationService.isEnabled)
                            .tint(theme.palette.tint)

                        if notificationService.isEnabled {
                            Picker("Default Snooze", selection: $notificationService.snoozePreference) {
                                ForEach(SnoozeOption.allCases, id: \.self) { option in
                                    Text(option.displayName).tag(option)
                                }
                            }
                            .pickerStyle(.menu)

                            HStack {
                                Text("Status")
                                    .font(AppFont.body(theme.metrics.bodyText))
                                    .foregroundStyle(theme.palette.text)
                                Spacer()
                                Text(notificationService.authorizationStatus.label)
                                    .font(AppFont.body(theme.metrics.smallText))
                                    .foregroundStyle(theme.palette.textSecondary)
                            }

                            if !notificationService.authorizationStatus.isAuthorized {
                                Button("Request Permission") {
                                    Task { await notificationService.requestAuthorizationIfNeeded() }
                                }
                                .buttonStyle(.bordered)
                                .tint(theme.palette.tint)
                            }
                        }

                        if let error = notificationService.lastError {
                            Text(error)
                                .font(AppFont.body(theme.metrics.smallText))
                                .foregroundStyle(theme.palette.error)
                        }
                    }
                }
            }
            .padding(theme.metrics.spacing)
        }
        .background(theme.palette.background)
        .navigationTitle("Settings")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
    }
}

private struct TimelineItem: Identifiable {
    let id = UUID()
    let title: String
    let detail: String
    let createdAt: Date
}

private struct Integration: Identifiable {
    let id = UUID()
    let name: String
    var isOn: Bool
}
