import Foundation
import Testing
@testable import InsightSwiftFeature

// MARK: - TimelineOrderingService Tests

@Test("buildTimeline combines all store arrays")
@MainActor
func buildTimelineCombinesAllArrays() {
    let store = AppStore()

    // Add test data
    let entry = Entry(title: "Test Entry", facets: [.event], startAt: Date())
    store.entries.append(entry)

    let task = TodoTask(title: "Test Task", scheduledAt: Date())
    store.tasks.append(task)

    let note = Note(title: "Test Note", body: "Body")
    store.notes.append(note)

    let habit = HabitDefinition(title: "Test Habit", importance: 5, difficulty: 5)
    store.habits.append(habit)
    let habitLog = HabitLog(habitId: habit.id)
    store.habitLogs.append(habitLog)

    let tracker = TrackerDefinition(key: "mood", unit: "1-10")
    store.trackers.append(tracker)
    let trackerLog = TrackerLog(trackerId: tracker.id, value: 7)
    store.trackerLogs.append(trackerLog)

    let timeline = TimelineOrderingService.buildTimeline(from: store)

    #expect(timeline.count >= 5)
    #expect(timeline.contains { $0.kind == .entry })
    #expect(timeline.contains { $0.kind == .task })
    #expect(timeline.contains { $0.kind == .note })
    #expect(timeline.contains { $0.habitLog })
    #expect(timeline.contains { $0.kind == .trackerLog })
}

@Test("sortedByTimestamp returns descending order")
func sortedByTimestampDescending() {
    let now = Date()
    let items = [
        TimelineItem(
            id: UUID(),
            kind: .entry,
            timestamp: now.addingTimeInterval(-3600),
            title: "Older",
            subtitle: nil,
            facets: [],
            tags: [],
            people: [],
            contexts: [],
            sourceId: UUID(),
            sourceType: "Entry"
        ),
        TimelineItem(
            id: UUID(),
            kind: .entry,
            timestamp: now,
            title: "Newer",
            subtitle: nil,
            facets: [],
            tags: [],
            people: [],
            contexts: [],
            sourceId: UUID(),
            sourceType: "Entry"
        )
    ]

    let sorted = TimelineOrderingService.sortedByTimestamp(items)

    #expect(sorted[0].title == "Newer")
    #expect(sorted[1].title == "Older")
}

@Test("filter by kinds returns only matching items")
func filterByKinds() {
    let items = [
        TimelineItem(
            id: UUID(),
            kind: .entry,
            timestamp: Date(),
            title: "Entry",
            subtitle: nil,
            facets: [],
            tags: [],
            people: [],
            contexts: [],
            sourceId: UUID(),
            sourceType: "Entry"
        ),
        TimelineItem(
            id: UUID(),
            kind: .task,
            timestamp: Date(),
            title: "Task",
            subtitle: nil,
            facets: [],
            tags: [],
            people: [],
            contexts: [],
            sourceId: UUID(),
            sourceType: "Task"
        ),
        TimelineItem(
            id: UUID(),
            kind: .note,
            timestamp: Date(),
            title: "Note",
            subtitle: nil,
            facets: [],
            tags: [],
            people: [],
            contexts: [],
            sourceId: UUID(),
            sourceType: "Note"
        )
    ]

    let filtered = TimelineOrderingService.filter(items, kinds: [.entry, .task])

    #expect(filtered.count == 2)
    #expect(filtered.allSatisfy { $0.kind == .entry || $0.kind == .task })
}

@Test("filter handles empty tags gracefully")
func filterEmptyTags() {
    let items = [
        TimelineItem(
            id: UUID(),
            kind: .entry,
            timestamp: Date(),
            title: "Entry",
            subtitle: nil,
            facets: [],
            tags: ["work"],
            people: [],
            contexts: [],
            sourceId: UUID(),
            sourceType: "Entry"
        )
    ]

    let filtered = TimelineOrderingService.filter(items, tags: [])

    #expect(filtered.count == 1)
}

@Test("filter by date range excludes out-of-range")
func filterByDateRange() {
    let now = Date()
    let yesterday = now.addingTimeInterval(-86400)
    let tomorrow = now.addingTimeInterval(86400)

    let items = [
        TimelineItem(
            id: UUID(),
            kind: .entry,
            timestamp: yesterday,
            title: "Yesterday",
            subtitle: nil,
            facets: [],
            tags: [],
            people: [],
            contexts: [],
            sourceId: UUID(),
            sourceType: "Entry"
        ),
        TimelineItem(
            id: UUID(),
            kind: .entry,
            timestamp: now,
            title: "Today",
            subtitle: nil,
            facets: [],
            tags: [],
            people: [],
            contexts: [],
            sourceId: UUID(),
            sourceType: "Entry"
        ),
        TimelineItem(
            id: UUID(),
            kind: .entry,
            timestamp: tomorrow,
            title: "Tomorrow",
            subtitle: nil,
            facets: [],
            tags: [],
            people: [],
            contexts: [],
            sourceId: UUID(),
            sourceType: "Entry"
        )
    ]

    let range = DateInterval(start: now.addingTimeInterval(-3600), end: now.addingTimeInterval(3600))
    let filtered = TimelineOrderingService.filter(items, in: range)

    #expect(filtered.count == 1)
    #expect(filtered[0].title == "Today")
}

@Test("combined filter with multiple criteria")
func combinedFilterMultipleCriteria() {
    let now = Date()

    let items = [
        TimelineItem(
            id: UUID(),
            kind: .entry,
            timestamp: now,
            title: "Work Entry",
            subtitle: nil,
            facets: [],
            tags: ["work"],
            people: ["Alice"],
            contexts: ["office"],
            sourceId: UUID(),
            sourceType: "Entry"
        ),
        TimelineItem(
            id: UUID(),
            kind: .task,
            timestamp: now,
            title: "Work Task",
            subtitle: nil,
            facets: [],
            tags: ["work"],
            people: [],
            contexts: [],
            sourceId: UUID(),
            sourceType: "Task"
        ),
        TimelineItem(
            id: UUID(),
            kind: .entry,
            timestamp: now,
            title: "Personal Entry",
            subtitle: nil,
            facets: [],
            tags: ["personal"],
            people: [],
            contexts: [],
            sourceId: UUID(),
            sourceType: "Entry"
        )
    ]

    // Filter by kind and tags
    var filtered = TimelineOrderingService.filter(items, kinds: [.entry])
    filtered = TimelineOrderingService.filter(filtered, tags: ["work"])

    #expect(filtered.count == 1)
    #expect(filtered[0].title == "Work Entry")
}
