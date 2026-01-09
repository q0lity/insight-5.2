import Foundation

struct ScheduleService {
    static let defaultTaskMinutes = 60
    static let minimumDurationMinutes = 5

    static func items(for date: Date, entries: [Entry], tasks: [TodoTask], habits: [HabitDefinition]) -> [ScheduledItem] {
        let range = dayRange(for: date)
        return items(for: range, entries: entries, tasks: tasks, habits: habits)
    }

    static func items(for range: DateInterval, entries: [Entry], tasks: [TodoTask], habits: [HabitDefinition]) -> [ScheduledItem] {
        var items: [ScheduledItem] = []

        for entry in entries where isSchedulableEntry(entry) {
            guard let startAt = entry.startAt else { continue }
            let endAt = normalizedEnd(startAt: startAt, endAt: entry.endAt, minimumMinutes: minimumDurationMinutes)
            let base = ScheduledItem(
                sourceId: entry.id,
                title: entry.title,
                kind: .event,
                startAt: startAt,
                endAt: endAt,
                occurrenceStartAt: startAt,
                allDay: entry.allDay,
                notes: entry.notes,
                tags: entry.tags,
                recurrenceRule: entry.recurrenceRule
            )
            items.append(contentsOf: expand(item: base, within: range, exceptions: entry.recurrenceExceptions))
        }

        for task in tasks {
            guard let scheduledAt = task.scheduledAt else { continue }
            let durationMinutes = max(minimumDurationMinutes, task.estimateMinutes ?? defaultTaskMinutes)
            let endAt = scheduledAt.addingTimeInterval(TimeInterval(durationMinutes * 60))
            let base = ScheduledItem(
                sourceId: task.id,
                title: task.title,
                kind: .task,
                startAt: scheduledAt,
                endAt: endAt,
                occurrenceStartAt: scheduledAt,
                allDay: false,
                notes: task.notes,
                tags: task.tags,
                recurrenceRule: task.recurrenceRule
            )
            items.append(contentsOf: expand(item: base, within: range, exceptions: task.recurrenceExceptions))
        }

        for habit in habits {
            guard let scheduledAt = habit.scheduledAt else { continue }
            let durationMinutes = max(minimumDurationMinutes, habit.durationMinutes)
            let endAt = scheduledAt.addingTimeInterval(TimeInterval(durationMinutes * 60))
            let base = ScheduledItem(
                sourceId: habit.id,
                title: habit.title,
                kind: .habit,
                startAt: scheduledAt,
                endAt: endAt,
                occurrenceStartAt: scheduledAt,
                allDay: false,
                notes: "",
                tags: habit.tags,
                recurrenceRule: habit.recurrenceRule
            )
            items.append(contentsOf: expand(item: base, within: range, exceptions: habit.recurrenceExceptions))
        }

        return items.sorted { $0.startAt < $1.startAt }
    }

    static func dayRange(for date: Date) -> DateInterval {
        let calendar = Calendar.current
        let start = calendar.startOfDay(for: date)
        let end = calendar.date(byAdding: .day, value: 1, to: start) ?? start
        return DateInterval(start: start, end: end)
    }

    static func weekRange(for date: Date) -> DateInterval {
        let start = startOfWeek(for: date)
        let end = Calendar.current.date(byAdding: .day, value: 7, to: start) ?? start
        return DateInterval(start: start, end: end)
    }

    static func monthRange(for date: Date) -> DateInterval {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.year, .month], from: date)
        let start = calendar.date(from: components) ?? calendar.startOfDay(for: date)
        let end = calendar.date(byAdding: .month, value: 1, to: start) ?? start
        return DateInterval(start: start, end: end)
    }

    static func startOfWeek(for date: Date) -> Date {
        let calendar = Calendar.current
        let dayStart = calendar.startOfDay(for: date)
        let weekday = calendar.component(.weekday, from: dayStart)
        let offset = -(weekday - 1)
        return calendar.date(byAdding: .day, value: offset, to: dayStart) ?? dayStart
    }

    private static func isSchedulableEntry(_ entry: Entry) -> Bool {
        entry.facets.contains(.event) || entry.facets.contains(.habit) || entry.facets.contains(.tracker)
    }

    private static func normalizedEnd(startAt: Date, endAt: Date?, minimumMinutes: Int) -> Date {
        let minimum = startAt.addingTimeInterval(TimeInterval(max(minimumMinutes, 1) * 60))
        guard let endAt else { return minimum }
        return max(endAt, minimum)
    }

    private static func expand(item: ScheduledItem, within range: DateInterval, exceptions: [RecurrenceException]) -> [ScheduledItem] {
        guard let rule = item.recurrenceRule else {
            return range.intersects(DateInterval(start: item.startAt, end: item.endAt)) ? [item] : []
        }
        let calendar = Calendar.current
        let duration = item.endAt.timeIntervalSince(item.startAt)
        let interval = max(1, rule.interval)
        let exceptionsByKey = exceptionLookup(exceptions)
        var handledExceptionKeys: Set<Int> = []
        var occurrences: [ScheduledItem] = []
        var start = item.startAt

        while start.addingTimeInterval(duration) < range.start {
            guard let next = advance(start, frequency: rule.frequency, interval: interval, calendar: calendar) else { break }
            if next == start { break }
            start = next
        }

        while start < range.end {
            let key = exceptionKey(start)
            let exception = exceptionsByKey[key]
            if exception != nil {
                handledExceptionKeys.insert(key)
            }
            if exception?.isCancelled == true {
                guard let next = advance(start, frequency: rule.frequency, interval: interval, calendar: calendar) else { break }
                if next == start { break }
                start = next
                continue
            }

            let overrideStart = exception?.startAt ?? start
            let overrideEnd = exception?.endAt ?? overrideStart.addingTimeInterval(duration)
            let overrideAllDay = exception?.allDay ?? item.allDay
            let displayInterval = DateInterval(start: overrideStart, end: overrideEnd)
            if range.intersects(displayInterval) {
                let occurrence = ScheduledItem(
                    sourceId: item.sourceId,
                    title: item.title,
                    kind: item.kind,
                    startAt: overrideStart,
                    endAt: overrideEnd,
                    occurrenceStartAt: start,
                    allDay: overrideAllDay,
                    notes: item.notes,
                    tags: item.tags,
                    recurrenceRule: item.recurrenceRule,
                    isRecurring: true
                )
                occurrences.append(occurrence)
            }
            guard let next = advance(start, frequency: rule.frequency, interval: interval, calendar: calendar) else { break }
            if next == start { break }
            start = next
        }

        if !exceptions.isEmpty {
            for exception in exceptions {
                let key = exceptionKey(exception.originalStartAt)
                guard !handledExceptionKeys.contains(key) else { continue }
                guard !exception.isCancelled else { continue }

                let overrideStart = exception.startAt ?? exception.originalStartAt
                let overrideEnd = exception.endAt ?? overrideStart.addingTimeInterval(duration)
                let overrideAllDay = exception.allDay ?? item.allDay
                let displayInterval = DateInterval(start: overrideStart, end: overrideEnd)
                if range.intersects(displayInterval) {
                    let occurrence = ScheduledItem(
                        sourceId: item.sourceId,
                        title: item.title,
                        kind: item.kind,
                        startAt: overrideStart,
                        endAt: overrideEnd,
                        occurrenceStartAt: exception.originalStartAt,
                        allDay: overrideAllDay,
                        notes: item.notes,
                        tags: item.tags,
                        recurrenceRule: item.recurrenceRule,
                        isRecurring: true
                    )
                    occurrences.append(occurrence)
                }
            }
        }

        return occurrences
    }

    private static func advance(_ date: Date, frequency: RecurrenceFrequency, interval: Int, calendar: Calendar) -> Date? {
        switch frequency {
        case .daily:
            return calendar.date(byAdding: .day, value: interval, to: date)
        case .weekly:
            return calendar.date(byAdding: .weekOfYear, value: interval, to: date)
        case .monthly:
            return calendar.date(byAdding: .month, value: interval, to: date)
        }
    }

    private static func exceptionLookup(_ exceptions: [RecurrenceException]) -> [Int: RecurrenceException] {
        var lookup: [Int: RecurrenceException] = [:]
        for exception in exceptions {
            lookup[exceptionKey(exception.originalStartAt)] = exception
        }
        return lookup
    }

    private static func exceptionKey(_ date: Date) -> Int {
        Int(date.timeIntervalSince1970 / 60)
    }
}
