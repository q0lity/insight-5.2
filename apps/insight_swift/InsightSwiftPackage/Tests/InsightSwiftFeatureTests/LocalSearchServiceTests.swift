import Foundation
import Testing
@testable import InsightSwiftFeature

// MARK: - LocalSearchService Tests

@Test("searchEntries finds matching titles")
func searchEntriesMatchesTitles() {
    let entries = [
        Entry(title: "Morning workout", facets: [.event], startAt: Date()),
        Entry(title: "Team meeting", facets: [.event], startAt: Date()),
        Entry(title: "Evening walk", facets: [.event], startAt: Date())
    ]

    let results = LocalSearchService.searchEntries("meeting", in: entries)

    #expect(results.count == 1)
    #expect(results[0].title == "Team meeting")
}

@Test("searchEntries finds matching tags")
func searchEntriesMatchesTags() {
    let entries = [
        Entry(title: "Entry 1", facets: [.event], startAt: Date(), tags: ["work", "urgent"]),
        Entry(title: "Entry 2", facets: [.event], startAt: Date(), tags: ["personal"]),
        Entry(title: "Entry 3", facets: [.event], startAt: Date(), tags: ["work"])
    ]

    let results = LocalSearchService.searchEntries("work", in: entries)

    #expect(results.count == 2)
}

@Test("searchEntries is case insensitive")
func searchEntriesCaseInsensitive() {
    let entries = [
        Entry(title: "IMPORTANT Meeting", facets: [.event], startAt: Date()),
        Entry(title: "Another task", facets: [.event], startAt: Date())
    ]

    let results = LocalSearchService.searchEntries("important", in: entries)

    #expect(results.count == 1)
}

@Test("searchTasks finds matching titles")
func searchTasksMatchesTitles() {
    let tasks = [
        TodoTask(title: "Buy groceries"),
        TodoTask(title: "Call mom"),
        TodoTask(title: "Finish report")
    ]

    let results = LocalSearchService.searchTasks("groceries", in: tasks)

    #expect(results.count == 1)
    #expect(results[0].title == "Buy groceries")
}

@Test("searchTasks finds matching notes")
func searchTasksMatchesNotes() {
    var task1 = TodoTask(title: "Task 1")
    task1.notes = "Need to review the budget"
    var task2 = TodoTask(title: "Task 2")
    task2.notes = "Follow up with team"

    let results = LocalSearchService.searchTasks("budget", in: [task1, task2])

    #expect(results.count == 1)
    #expect(results[0].title == "Task 1")
}

@Test("searchNotes finds matching body text")
func searchNotesMatchesBody() {
    let notes = [
        Note(title: "Meeting Notes", body: "Discussed project timeline and deliverables"),
        Note(title: "Ideas", body: "New feature suggestions for the app"),
        Note(title: "Todo", body: "Items to complete this week")
    ]

    let results = LocalSearchService.searchNotes("timeline", in: notes)

    #expect(results.count == 1)
    #expect(results[0].title == "Meeting Notes")
}

@Test("searchNotes finds matching title")
func searchNotesMatchesTitle() {
    let notes = [
        Note(title: "Project Ideas", body: "Various concepts"),
        Note(title: "Meeting Summary", body: "Key points from today")
    ]

    let results = LocalSearchService.searchNotes("ideas", in: notes)

    #expect(results.count == 1)
    #expect(results[0].title == "Project Ideas")
}

@Test("searchTrackerLogs matches tracker key")
func searchTrackerLogsMatchesKey() {
    let trackers = [
        TrackerDefinition(key: "mood", unit: "1-10"),
        TrackerDefinition(key: "energy", unit: "1-10"),
        TrackerDefinition(key: "sleep_quality", unit: "1-10")
    ]

    let logs = [
        TrackerLog(trackerId: trackers[0].id, value: 7),
        TrackerLog(trackerId: trackers[1].id, value: 8),
        TrackerLog(trackerId: trackers[2].id, value: 6)
    ]

    let results = LocalSearchService.searchTrackerLogs("mood", logs: logs, definitions: trackers)

    #expect(results.count == 1)
    #expect(results[0].1?.key == "mood")
}

@Test("searchHabitLogs matches habit title")
func searchHabitLogsMatchesTitle() {
    let habits = [
        HabitDefinition(title: "Morning meditation", importance: 7, difficulty: 5),
        HabitDefinition(title: "Exercise", importance: 8, difficulty: 7),
        HabitDefinition(title: "Read for 30 minutes", importance: 6, difficulty: 4)
    ]

    let logs = [
        HabitLog(habitId: habits[0].id),
        HabitLog(habitId: habits[1].id),
        HabitLog(habitId: habits[2].id)
    ]

    let results = LocalSearchService.searchHabitLogs("meditation", logs: logs, definitions: habits)

    #expect(results.count == 1)
    #expect(results[0].1?.title == "Morning meditation")
}

@Test("combined search returns mixed results")
@MainActor
func combinedSearchMixedResults() {
    let store = AppStore()

    // Add diverse data
    store.entries.append(Entry(title: "Team sync meeting", facets: [.event], startAt: Date()))
    store.tasks.append(TodoTask(title: "Prepare meeting agenda"))
    store.notes.append(Note(title: "Meeting notes", body: "Key discussion points"))

    let results = LocalSearchService.search(query: "meeting", store: store)

    #expect(results.count == 3)
    #expect(results.contains { $0.resultType == "Entry" })
    #expect(results.contains { $0.resultType == "Task" })
    #expect(results.contains { $0.resultType == "Note" })
}

@Test("search results sorted by timestamp")
@MainActor
func searchResultsSortedByTimestamp() {
    let store = AppStore()
    let now = Date()

    store.entries.append(Entry(title: "Meeting 1", facets: [.event], startAt: now.addingTimeInterval(-3600)))
    store.entries.append(Entry(title: "Meeting 2", facets: [.event], startAt: now))
    store.entries.append(Entry(title: "Meeting 3", facets: [.event], startAt: now.addingTimeInterval(-7200)))

    let results = LocalSearchService.search(query: "meeting", store: store)

    #expect(results.count == 3)
    #expect(results[0].title == "Meeting 2") // Most recent first
}

@Test("empty query returns all items")
func emptyQueryReturnsAll() {
    let entries = [
        Entry(title: "Entry 1", facets: [.event], startAt: Date()),
        Entry(title: "Entry 2", facets: [.event], startAt: Date())
    ]

    let results = LocalSearchService.searchEntries("", in: entries)

    #expect(results.count == 2)
}

@Test("search respects limit parameter")
@MainActor
func searchRespectsLimit() {
    let store = AppStore()

    for i in 1...100 {
        store.entries.append(Entry(title: "Test entry \(i)", facets: [.event], startAt: Date()))
    }

    let results = LocalSearchService.search(query: "test", store: store, limit: 10)

    #expect(results.count == 10)
}

@Test("todayItems returns only today's items")
@MainActor
func todayItemsReturnsToday() {
    let store = AppStore()
    let now = Date()
    let yesterday = Calendar.current.date(byAdding: .day, value: -1, to: now)!

    store.entries.append(Entry(title: "Today Entry", facets: [.event], startAt: now))
    store.entries.append(Entry(title: "Yesterday Entry", facets: [.event], startAt: yesterday))

    let results = LocalSearchService.todayItems(store: store)

    #expect(results.contains { $0.title == "Today Entry" })
    #expect(!results.contains { $0.title == "Yesterday Entry" })
}

@Test("recentItems returns items within specified days")
@MainActor
func recentItemsReturnsDays() {
    let store = AppStore()
    let now = Date()
    let twoDaysAgo = Calendar.current.date(byAdding: .day, value: -2, to: now)!
    let tenDaysAgo = Calendar.current.date(byAdding: .day, value: -10, to: now)!

    store.entries.append(Entry(title: "Recent Entry", facets: [.event], startAt: twoDaysAgo))
    store.entries.append(Entry(title: "Old Entry", facets: [.event], startAt: tenDaysAgo))

    let results = LocalSearchService.recentItems(store: store, days: 7)

    #expect(results.contains { $0.title == "Recent Entry" })
    #expect(!results.contains { $0.title == "Old Entry" })
}

@Test("SearchResult provides correct metadata")
@MainActor
func searchResultMetadata() {
    let store = AppStore()

    let entry = Entry(title: "Test Entry", facets: [.event], startAt: Date(), notes: "Entry notes")
    store.entries.append(entry)

    let results = LocalSearchService.search(query: "test", store: store)

    #expect(results.count == 1)
    let result = results[0]
    #expect(result.title == "Test Entry")
    #expect(result.resultType == "Entry")
    #expect(result.id == entry.id)
}
