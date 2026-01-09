import Foundation
import Testing
@testable import InsightSwiftFeature

@Test("Calendar day entries separate all-day and timed")
func calendarDayEntriesHappyPath() {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = TimeZone(secondsFromGMT: 0) ?? .current
    let baseDate = calendar.date(from: DateComponents(year: 2026, month: 1, day: 14, hour: 9))!

    let allDay = Entry(
        title: "Offsite",
        facets: [.event],
        startAt: calendar.startOfDay(for: baseDate),
        allDay: true
    )
    let morning = Entry(
        title: "Breakfast",
        facets: [.event],
        startAt: calendar.date(bySettingHour: 8, minute: 0, second: 0, of: baseDate)
    )
    let standup = Entry(
        title: "Standup",
        facets: [.event],
        startAt: calendar.date(bySettingHour: 9, minute: 0, second: 0, of: baseDate)
    )

    let result = CalendarSupport.dayEntries(for: baseDate, entries: [standup, allDay, morning], calendar: calendar)

    #expect(result.allDay.map(\.title) == ["Offsite"])
    #expect(result.timed.map(\.title) == ["Breakfast", "Standup"])
}

@Test("Calendar day entries require explicit all-day")
func calendarDayEntriesFailurePath() {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = TimeZone(secondsFromGMT: 0) ?? .current
    let baseDate = calendar.date(from: DateComponents(year: 2026, month: 1, day: 14, hour: 9))!

    let startOfDay = calendar.startOfDay(for: baseDate)
    let event = Entry(title: "Start of day", facets: [.event], startAt: startOfDay, allDay: false)

    let result = CalendarSupport.dayEntries(for: baseDate, entries: [event], calendar: calendar)

    #expect(result.allDay.isEmpty)
    #expect(result.timed.map(\.title) == ["Start of day"])
}

@Test("Month grid spans full weeks and includes month start")
func monthGridDatesEdgeCase() {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = TimeZone(secondsFromGMT: 0) ?? .current
    calendar.firstWeekday = 2
    let targetDate = calendar.date(from: DateComponents(year: 2026, month: 2, day: 15))!
    let monthStart = calendar.date(from: DateComponents(year: 2026, month: 2, day: 1))!

    let dates = CalendarSupport.monthGridDates(containing: targetDate, calendar: calendar)

    #expect(!dates.isEmpty)
    #expect(dates.count % 7 == 0)
    #expect(dates.contains { calendar.isDate($0, inSameDayAs: monthStart) })
    #expect(dates.count >= 28)
}

@Test("Task ordering uses due date then status and title for backlog")
func taskOrderingBacklogEdgeCase() {
    let dueDate = Date()
    let tasks = [
        TodoTask(title: "Backlog B", status: .todo),
        TodoTask(title: "Backlog A", status: .done),
        TodoTask(title: "Due first", status: .inProgress, dueAt: dueDate)
    ]

    let sorted = CalendarSupport.sortedTasks(tasks)

    #expect(sorted.first?.title == "Due first")
    #expect(sorted[1].title == "Backlog A")
    #expect(sorted.last?.title == "Backlog B")
}
