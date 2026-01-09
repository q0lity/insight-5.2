import Foundation

// MARK: - Timeline Ordering Service

/// Service for building, sorting, and filtering the unified timeline
public struct TimelineOrderingService {

    // MARK: - Build Timeline from AppStore

    /// Build unified timeline from all AppStore arrays
    @MainActor
    public static func buildTimeline(from store: AppStore) -> [TimelineItem] {
        var items: [TimelineItem] = []

        // Entries → TimelineItem
        for entry in store.entries {
            // Skip entries that are linked to workout or nutrition (avoid duplication)
            let hasWorkout = store.workoutSessions.contains { $0.entryId == entry.id }
            let hasNutrition = store.nutritionLogs.contains { $0.entryId == entry.id }
            if !hasWorkout && !hasNutrition {
                items.append(TimelineItem.from(entry: entry))
            }
        }

        // Tasks → TimelineItem
        for task in store.tasks {
            items.append(TimelineItem.from(task: task))
        }

        // Notes → TimelineItem
        for note in store.notes {
            items.append(TimelineItem.from(note: note))
        }

        // HabitLogs → TimelineItem (derive title from habit definition)
        for habitLog in store.habitLogs {
            let habit = store.habits.first { $0.id == habitLog.habitId }
            items.append(TimelineItem.from(habitLog: habitLog, habit: habit))
        }

        // TrackerLogs → TimelineItem (derive title from tracker definition)
        for trackerLog in store.trackerLogs {
            let tracker = store.trackers.first { $0.id == trackerLog.trackerId }
            items.append(TimelineItem.from(trackerLog: trackerLog, tracker: tracker))
        }

        // WorkoutSessions → TimelineItem
        for workout in store.workoutSessions {
            let entry = store.entries.first { $0.id == workout.entryId }
            items.append(TimelineItem.from(workout: workout, entry: entry))
        }

        // NutritionLogs → TimelineItem
        for nutrition in store.nutritionLogs {
            let entry = store.entries.first { $0.id == nutrition.entryId }
            items.append(TimelineItem.from(nutrition: nutrition, entry: entry))
        }

        return items
    }

    // MARK: - Sorting

    /// Sort by timestamp descending (most recent first)
    public static func sortedByTimestamp(_ items: [TimelineItem]) -> [TimelineItem] {
        items.sorted { $0.timestamp > $1.timestamp }
    }

    /// Sort by timestamp ascending (oldest first)
    public static func sortedByTimestampAscending(_ items: [TimelineItem]) -> [TimelineItem] {
        items.sorted { $0.timestamp < $1.timestamp }
    }

    // MARK: - Filtering

    /// Filter by kinds (any match)
    public static func filter(_ items: [TimelineItem], kinds: Set<TimelineItemKind>) -> [TimelineItem] {
        guard !kinds.isEmpty else { return items }
        return items.filter { kinds.contains($0.kind) }
    }

    /// Filter by date range
    public static func filter(_ items: [TimelineItem], in range: DateInterval?) -> [TimelineItem] {
        guard let range else { return items }
        return items.filter { range.contains($0.timestamp) }
    }

    /// Filter by tags (any match)
    public static func filter(_ items: [TimelineItem], tags: Set<String>) -> [TimelineItem] {
        guard !tags.isEmpty else { return items }
        return items.filter { item in
            !item.tags.isEmpty && !tags.isDisjoint(with: Set(item.tags))
        }
    }

    /// Filter by people (any match)
    public static func filter(_ items: [TimelineItem], people: Set<String>) -> [TimelineItem] {
        guard !people.isEmpty else { return items }
        return items.filter { item in
            !item.people.isEmpty && !people.isDisjoint(with: Set(item.people))
        }
    }

    /// Filter by contexts (any match)
    public static func filter(_ items: [TimelineItem], contexts: Set<String>) -> [TimelineItem] {
        guard !contexts.isEmpty else { return items }
        return items.filter { item in
            !item.contexts.isEmpty && !contexts.isDisjoint(with: Set(item.contexts))
        }
    }

    /// Filter by facets (any match)
    public static func filter(_ items: [TimelineItem], facets: Set<EntryFacet>) -> [TimelineItem] {
        guard !facets.isEmpty else { return items }
        return items.filter { item in
            !item.facets.isEmpty && !facets.isDisjoint(with: Set(item.facets))
        }
    }

    /// Text search (title or subtitle contains query, case insensitive)
    public static func search(_ items: [TimelineItem], query: String) -> [TimelineItem] {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !trimmed.isEmpty else { return items }
        return items.filter { item in
            item.title.lowercased().contains(trimmed) ||
            (item.subtitle?.lowercased().contains(trimmed) ?? false)
        }
    }

    // MARK: - Combined Filter + Sort

    /// Combined filter + sort for timeline display
    @MainActor
    public static func timelineItems(
        from store: AppStore,
        kindFilter: Set<TimelineItemKind>? = nil,
        tagFilter: Set<String>? = nil,
        peopleFilter: Set<String>? = nil,
        contextFilter: Set<String>? = nil,
        dateRange: DateInterval? = nil,
        searchQuery: String? = nil
    ) -> [TimelineItem] {
        var items = buildTimeline(from: store)

        // Apply filters
        if let kinds = kindFilter {
            items = filter(items, kinds: kinds)
        }
        if let tags = tagFilter {
            items = filter(items, tags: tags)
        }
        if let people = peopleFilter {
            items = filter(items, people: people)
        }
        if let contexts = contextFilter {
            items = filter(items, contexts: contexts)
        }
        if let range = dateRange {
            items = filter(items, in: range)
        }
        if let query = searchQuery, !query.isEmpty {
            items = search(items, query: query)
        }

        // Sort descending (most recent first)
        return sortedByTimestamp(items)
    }
}

// MARK: - Timeline Filter State

/// State object for managing timeline filter UI
public struct TimelineFilterState: Equatable {
    public var selectedKinds: Set<TimelineItemKind>
    public var selectedTags: Set<String>
    public var selectedPeople: Set<String>
    public var selectedContexts: Set<String>
    public var startDate: Date?
    public var endDate: Date?
    public var searchQuery: String

    public init(
        selectedKinds: Set<TimelineItemKind> = [],
        selectedTags: Set<String> = [],
        selectedPeople: Set<String> = [],
        selectedContexts: Set<String> = [],
        startDate: Date? = nil,
        endDate: Date? = nil,
        searchQuery: String = ""
    ) {
        self.selectedKinds = selectedKinds
        self.selectedTags = selectedTags
        self.selectedPeople = selectedPeople
        self.selectedContexts = selectedContexts
        self.startDate = startDate
        self.endDate = endDate
        self.searchQuery = searchQuery
    }

    public var dateRange: DateInterval? {
        guard let start = startDate, let end = endDate else { return nil }
        return DateInterval(start: start, end: end)
    }

    public var hasActiveFilters: Bool {
        !selectedKinds.isEmpty ||
        !selectedTags.isEmpty ||
        !selectedPeople.isEmpty ||
        !selectedContexts.isEmpty ||
        startDate != nil ||
        endDate != nil ||
        !searchQuery.isEmpty
    }

    public mutating func clear() {
        selectedKinds = []
        selectedTags = []
        selectedPeople = []
        selectedContexts = []
        startDate = nil
        endDate = nil
        searchQuery = ""
    }
}
