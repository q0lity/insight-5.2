import Foundation

enum CalendarDisplayMode: String, CaseIterable, Identifiable {
    case day
    case week
    case month

    var id: String { rawValue }

    var title: String {
        switch self {
        case .day:
            return "Day"
        case .week:
            return "Week"
        case .month:
            return "Month"
        }
    }
}

struct CalendarDayEntries: Equatable {
    let allDay: [Entry]
    let timed: [Entry]
}

enum CalendarSupport {
    static func dayEntries(
        for date: Date,
        entries: [Entry],
        calendar: Calendar = .current
    ) -> CalendarDayEntries {
        let dayEvents = entries
            .filter { entry in
                guard entry.facets.contains(.event), let start = entry.startAt else { return false }
                return calendar.isDate(start, inSameDayAs: date)
            }
        let allDay = dayEvents
            .filter { isAllDayEntry($0) }
            .sorted { ($0.title.lowercased()) < ($1.title.lowercased()) }
        let timed = dayEvents
            .filter { !isAllDayEntry($0) }
            .sorted { ($0.startAt ?? .distantPast) < ($1.startAt ?? .distantPast) }
        return CalendarDayEntries(allDay: allDay, timed: timed)
    }

    static func weekDates(containing date: Date, calendar: Calendar = .current) -> [Date] {
        guard let weekInterval = calendar.dateInterval(of: .weekOfYear, for: date) else {
            return [date]
        }
        return (0..<7).compactMap { offset in
            calendar.date(byAdding: .day, value: offset, to: weekInterval.start)
        }
    }

    static func monthGridDates(containing date: Date, calendar: Calendar = .current) -> [Date] {
        guard let monthInterval = calendar.dateInterval(of: .month, for: date),
              let dayRange = calendar.range(of: .day, in: .month, for: date) else {
            return []
        }

        let firstWeekday = calendar.component(.weekday, from: monthInterval.start)
        let offset = (firstWeekday - calendar.firstWeekday + 7) % 7
        let gridStart = calendar.date(byAdding: .day, value: -offset, to: monthInterval.start) ?? monthInterval.start
        let totalDays = offset + dayRange.count
        let weekCount = Int(ceil(Double(totalDays) / 7.0))
        let gridCount = weekCount * 7

        return (0..<gridCount).compactMap { value in
            calendar.date(byAdding: .day, value: value, to: gridStart)
        }
    }

    static func tasks(on date: Date, tasks: [TodoTask], calendar: Calendar = .current) -> [TodoTask] {
        tasks
            .filter { task in
                guard let dueAt = task.dueAt else { return false }
                return calendar.isDate(dueAt, inSameDayAs: date)
            }
            .sorted(by: TaskOrdering.compare)
    }

    static func sortedTasks(_ tasks: [TodoTask]) -> [TodoTask] {
        tasks.sorted(by: TaskOrdering.compare)
    }

    private static func isAllDayEntry(_ entry: Entry) -> Bool {
        entry.facets.contains(.event) && entry.allDay
    }
}

enum TaskOrdering {
    static func compare(_ lhs: TodoTask, _ rhs: TodoTask) -> Bool {
        switch (lhs.dueAt, rhs.dueAt) {
        case (nil, nil):
            // Undated tasks sort by title for stable backlog ordering.
            return lhs.title.lowercased() < rhs.title.lowercased()
        case (nil, _):
            return false
        case (_, nil):
            return true
        case (let lhsDue?, let rhsDue?):
            if lhsDue != rhsDue { return lhsDue < rhsDue }
            if lhs.status.sortOrder != rhs.status.sortOrder {
                return lhs.status.sortOrder < rhs.status.sortOrder
            }
            return lhs.title.lowercased() < rhs.title.lowercased()
        }
    }
}

private extension TaskStatus {
    var sortOrder: Int {
        switch self {
        case .inProgress:
            return 0
        case .todo:
            return 1
        case .done:
            return 2
        }
    }
}
