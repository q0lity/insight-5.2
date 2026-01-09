import Foundation
import Testing
@testable import InsightSwiftFeature

struct ScheduleServiceTests {
    @Test("ScheduleService returns scheduled items")
    func scheduledItemsHappyPath() {
        let calendar = Calendar.current
        let start = calendar.date(from: DateComponents(year: 2026, month: 1, day: 8, hour: 9, minute: 0))!
        let end = calendar.date(byAdding: .minute, value: 45, to: start)!
        let entry = Entry(title: "Planning", facets: [.event], startAt: start, endAt: end)
        let task = TodoTask(title: "Call mom", scheduledAt: calendar.date(byAdding: .hour, value: 2, to: start), estimateMinutes: 30)
        var habit = HabitDefinition(title: "Stretch", importance: 5, difficulty: 2)
        habit.scheduledAt = calendar.date(byAdding: .hour, value: 1, to: start)
        habit.durationMinutes = 20

        let items = ScheduleService.items(for: start, entries: [entry], tasks: [task], habits: [habit])
        #expect(items.count == 3)
        #expect(items.contains(where: { $0.kind == .event && $0.title == "Planning" }))
        #expect(items.contains(where: { $0.kind == .task && $0.title == "Call mom" }))
        #expect(items.contains(where: { $0.kind == .habit && $0.title == "Stretch" }))
    }

    @Test("ScheduleService drops unscheduled tasks")
    func unscheduledTaskFailurePath() {
        let calendar = Calendar.current
        let start = calendar.date(from: DateComponents(year: 2026, month: 1, day: 9, hour: 9, minute: 0))!
        let entry = Entry(title: "Standup", facets: [.event], startAt: start, endAt: calendar.date(byAdding: .minute, value: 15, to: start))
        let task = TodoTask(title: "Unscheduled")

        let items = ScheduleService.items(for: start, entries: [entry], tasks: [task], habits: [])
        #expect(items.count == 1)
        #expect(items.first?.kind == .event)
    }

    @Test("ScheduleService expands weekly recurrence in range")
    func weeklyRecurrenceEdgeCase() {
        let calendar = Calendar.current
        let start = calendar.date(from: DateComponents(year: 2026, month: 1, day: 5, hour: 10, minute: 0))!
        let end = calendar.date(byAdding: .minute, value: 60, to: start)!
        let rule = RecurrenceRule(frequency: .weekly)
        let entry = Entry(title: "Weekly review", facets: [.event], startAt: start, endAt: end, recurrenceRule: rule)

        let rangeStart = start
        let rangeEnd = calendar.date(byAdding: .day, value: 14, to: start)!
        let range = DateInterval(start: rangeStart, end: rangeEnd)

        let items = ScheduleService.items(for: range, entries: [entry], tasks: [], habits: [])
        let matching = items.filter { $0.title == "Weekly review" }
        #expect(matching.count == 2)
        #expect(matching.allSatisfy { $0.isRecurring })
    }

    @Test("ScheduleService keeps recurring series but overrides a single occurrence")
    func singleOccurrenceReschedule() {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0) ?? .current
        let start = calendar.date(from: DateComponents(year: 2026, month: 1, day: 10, hour: 9, minute: 0))!
        let end = calendar.date(byAdding: .minute, value: 30, to: start)!
        let rule = RecurrenceRule(frequency: .daily)
        let originalSecond = calendar.date(byAdding: .day, value: 1, to: start)!
        let movedStart = calendar.date(byAdding: .hour, value: 2, to: originalSecond)!
        let movedEnd = calendar.date(byAdding: .minute, value: 45, to: movedStart)!
        let exception = RecurrenceException(
            originalStartAt: originalSecond,
            startAt: movedStart,
            endAt: movedEnd,
            allDay: nil,
            isCancelled: false
        )
        let entry = Entry(
            title: "Daily Standup",
            facets: [.event],
            startAt: start,
            endAt: end,
            recurrenceRule: rule,
            recurrenceExceptions: [exception]
        )
        let rangeEnd = calendar.date(byAdding: .day, value: 3, to: start)!
        let items = ScheduleService.items(for: DateInterval(start: start, end: rangeEnd), entries: [entry], tasks: [], habits: [])

        let occurrences = items.filter { $0.title == "Daily Standup" }
        #expect(occurrences.count == 3)

        let rescheduled = occurrences.first(where: { $0.occurrenceStartAt == originalSecond })
        #require(rescheduled != nil)
        #expect(rescheduled?.startAt == movedStart)
        #expect(rescheduled?.endAt == movedEnd)

        let thirdStart = calendar.date(byAdding: .day, value: 2, to: start)!
        let thirdOccurrence = occurrences.first(where: { $0.occurrenceStartAt == thirdStart })
        #require(thirdOccurrence != nil)
        #expect(thirdOccurrence?.startAt == thirdStart)
    }

    @Test("ScheduleService includes exceptions shifted into range")
    func recurrenceExceptionRangeEdgeCase() {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0) ?? .current
        let originalStart = calendar.date(from: DateComponents(year: 2026, month: 1, day: 1, hour: 9, minute: 0))!
        let originalEnd = calendar.date(byAdding: .minute, value: 30, to: originalStart)!
        let movedStart = calendar.date(from: DateComponents(year: 2026, month: 1, day: 5, hour: 14, minute: 0))!
        let movedEnd = calendar.date(byAdding: .minute, value: 30, to: movedStart)!
        let exception = RecurrenceException(
            originalStartAt: originalStart,
            startAt: movedStart,
            endAt: movedEnd,
            allDay: nil,
            isCancelled: false
        )
        let entry = Entry(
            title: "Daily Focus",
            facets: [.event],
            startAt: originalStart,
            endAt: originalEnd,
            recurrenceRule: RecurrenceRule(frequency: .daily),
            recurrenceExceptions: [exception]
        )
        let rangeStart = calendar.date(from: DateComponents(year: 2026, month: 1, day: 4, hour: 0, minute: 0))!
        let rangeEnd = calendar.date(byAdding: .day, value: 2, to: rangeStart)!
        let items = ScheduleService.items(for: DateInterval(start: rangeStart, end: rangeEnd), entries: [entry], tasks: [], habits: [])

        let moved = items.first(where: { $0.startAt == movedStart })
        #require(moved != nil)
        #expect(moved?.occurrenceStartAt == originalStart)
    }

    @Test("ScheduleService preserves all-day flag when rescheduling")
    func allDayReschedulePreservesFlag() {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0) ?? .current
        let dayStart = calendar.date(from: DateComponents(year: 2026, month: 2, day: 1))!
        let nextDay = calendar.date(byAdding: .day, value: 1, to: dayStart)!
        let end = calendar.date(byAdding: .day, value: 1, to: dayStart)!
        let exception = RecurrenceException(
            originalStartAt: dayStart,
            startAt: nextDay,
            endAt: calendar.date(byAdding: .day, value: 1, to: nextDay),
            allDay: nil,
            isCancelled: false
        )
        let entry = Entry(
            title: "All Day Retreat",
            facets: [.event],
            startAt: dayStart,
            endAt: end,
            allDay: true,
            recurrenceRule: RecurrenceRule(frequency: .daily),
            recurrenceExceptions: [exception]
        )
        let range = DateInterval(start: dayStart, end: calendar.date(byAdding: .day, value: 3, to: dayStart)!)
        let items = ScheduleService.items(for: range, entries: [entry], tasks: [], habits: [])

        let rescheduled = items.first(where: { $0.occurrenceStartAt == dayStart })
        #require(rescheduled != nil)
        #expect(rescheduled?.startAt == nextDay)
        #expect(rescheduled?.allDay == true)
    }
}
