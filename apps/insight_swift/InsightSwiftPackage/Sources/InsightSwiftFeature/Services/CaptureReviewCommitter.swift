import Foundation

public struct CaptureReviewCommitter {
    public init() {}

    public func commit(
        items: [CaptureReviewItem],
        rawText: String,
        appStore: AppStore,
        syncService: SupabaseSyncService
    ) {
        let accepted = items.filter { $0.decision == .accepted }
        guard !accepted.isEmpty else { return }

        let tokens = mergeTokens(from: accepted)
        applyEntities(tokens: tokens, appStore: appStore, syncService: syncService)

        let now = Date()
        if let activeEvent = accepted.first(where: { $0.kind == .event }) {
            createEvent(
                title: activeEvent.title,
                startAt: now,
                endAt: Calendar.current.date(byAdding: .hour, value: 1, to: now),
                notes: rawText,
                appStore: appStore,
                syncService: syncService
            )
        } else if accepted.contains(where: { $0.kind == .note }) {
            createNote(title: rawText, notes: rawText, appStore: appStore, syncService: syncService)
        }

        let futureEvents = accepted.filter { $0.kind == .futureEvent }
        for event in futureEvents {
            let scheduledAt = event.scheduledTime.flatMap { parseScheduledDate($0) }
            let notes = scheduledAt == nil && event.scheduledTime != nil
                ? "Scheduled: \(event.scheduledTime ?? "")\n\n\(rawText)"
                : rawText
            createEvent(
                title: event.title,
                startAt: scheduledAt ?? now,
                endAt: scheduledAt.map { Calendar.current.date(byAdding: .hour, value: 1, to: $0) } ?? Calendar.current.date(byAdding: .hour, value: 1, to: now),
                notes: notes,
                appStore: appStore,
                syncService: syncService
            )
        }

        let tasks = accepted.filter { $0.kind == .task }
        for task in tasks {
            createTask(title: task.title, completed: task.completed, appStore: appStore, syncService: syncService)
        }

        let trackers = accepted.filter { $0.kind == .tracker }
        for tracker in trackers {
            guard case .number(let value) = tracker.trackerValue else { continue }
            logTracker(key: tracker.title, value: value, appStore: appStore, syncService: syncService)
        }
    }

    private func mergeTokens(from items: [CaptureReviewItem]) -> MarkdownTokenCollections {
        var tags: [String] = []
        var people: [String] = []
        var contexts: [String] = []
        var places: [String] = []
        var trackers: [TrackerToken] = []

        for item in items {
            tags.append(contentsOf: item.tokens.tags)
            people.append(contentsOf: item.tokens.people)
            contexts.append(contentsOf: item.tokens.contexts)
            places.append(contentsOf: item.tokens.places)
            trackers.append(contentsOf: item.tokens.trackers)
        }

        return MarkdownTokenCollections(
            tags: uniq(tags),
            people: uniq(people),
            contexts: uniq(contexts),
            places: uniq(places),
            trackers: trackers
        )
    }

    private func applyEntities(
        tokens: MarkdownTokenCollections,
        appStore: AppStore,
        syncService: SupabaseSyncService
    ) {
        if syncService.isEnabled {
            for tag in tokens.tags { syncService.createEntity(type: "tag", name: tag) }
            for person in tokens.people { syncService.createEntity(type: "person", name: person) }
            for place in tokens.places { syncService.createEntity(type: "place", name: place) }
        } else {
            for tag in tokens.tags where !appStore.tags.contains(where: { $0.name == tag }) {
                appStore.addTag(name: tag)
            }
            for person in tokens.people where !appStore.people.contains(where: { $0.name == person }) {
                appStore.addPerson(name: person)
            }
            for place in tokens.places where !appStore.places.contains(where: { $0.name == place }) {
                appStore.addPlace(name: place, category: "Captured")
            }
        }
    }

    private func createEvent(
        title: String,
        startAt: Date,
        endAt: Date?,
        notes: String,
        appStore: AppStore,
        syncService: SupabaseSyncService
    ) {
        if syncService.isEnabled {
            syncService.createEntry(title: title, facets: [.event], notes: notes, startAt: startAt, endAt: endAt)
        } else {
            appStore.createEvent(title: title, startAt: startAt, endAt: endAt ?? startAt.addingTimeInterval(3600))
        }
    }

    private func createNote(title: String, notes: String, appStore: AppStore, syncService: SupabaseSyncService) {
        if syncService.isEnabled {
            syncService.createEntry(title: title, facets: [.note], notes: notes)
        } else {
            appStore.addEntry(title: title)
        }
    }

    private func createTask(title: String, completed: Bool, appStore: AppStore, syncService: SupabaseSyncService) {
        if syncService.isEnabled {
            syncService.createTask(title: title)
            if completed, let task = appStore.tasks.first(where: { $0.title == title }) {
                syncService.toggleTask(task)
            }
        } else {
            appStore.addTask(title: title)
            if completed, let task = appStore.tasks.first(where: { $0.title == title }) {
                appStore.toggleTask(task)
            }
        }
    }

    private func logTracker(
        key: String,
        value: Double,
        appStore: AppStore,
        syncService: SupabaseSyncService
    ) {
        if let tracker = appStore.trackers.first(where: { $0.key.lowercased() == key.lowercased() }) {
            syncService.isEnabled ? syncService.logTracker(tracker, value: value) : appStore.logTracker(tracker, value: value)
            return
        }

        if syncService.isEnabled {
            syncService.createTracker(key: key, unit: nil)
        } else {
            appStore.addTracker(key: key)
        }
        if let tracker = appStore.trackers.first(where: { $0.key.lowercased() == key.lowercased() }) {
            syncService.isEnabled ? syncService.logTracker(tracker, value: value) : appStore.logTracker(tracker, value: value)
        }
    }

    private func uniq(_ values: [String]) -> [String] {
        var seen = Set<String>()
        var result: [String] = []
        for value in values where !value.isEmpty {
            if seen.insert(value).inserted {
                result.append(value)
            }
        }
        return result
    }

    private func parseScheduledDate(_ value: String) -> Date? {
        let formats = ["yyyy-MM-dd HH:mm", "yyyy-MM-dd'T'HH:mm", "yyyy-MM-dd"]
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone.current
        for format in formats {
            formatter.dateFormat = format
            if let date = formatter.date(from: value) {
                return date
            }
        }
        return nil
    }
}
