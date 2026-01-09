import Foundation

struct HabitScheduleCodec {
    static func schedule(from habit: HabitDefinition) -> HabitSchedule? {
        guard let scheduledAt = habit.scheduledAt else { return nil }
        let calendar = Calendar.current
        let frequency = habit.recurrenceRule?.frequency.rawValue ?? RecurrenceFrequency.daily.rawValue
        let interval = habit.recurrenceRule?.interval
        let timeString = timeLabel(from: scheduledAt)

        var days: [Int]? = nil
        if habit.recurrenceRule?.frequency == .weekly {
            days = [calendar.component(.weekday, from: scheduledAt)]
        } else if habit.recurrenceRule?.frequency == .monthly {
            days = [calendar.component(.day, from: scheduledAt)]
        }

        return HabitSchedule(
            frequency: frequency,
            interval: interval,
            days: days,
            times: [timeString]
        )
    }

    static func apply(schedule: HabitSchedule?, to habit: inout HabitDefinition, anchor: Date = Date()) {
        guard let schedule else { return }
        let calendar = Calendar.current
        let frequency = schedule.frequency ?? RecurrenceFrequency.daily.rawValue
        if let ruleFrequency = RecurrenceFrequency(rawValue: frequency) {
            habit.recurrenceRule = RecurrenceRule(frequency: ruleFrequency, interval: schedule.interval ?? 1)
        }

        if let time = schedule.times?.first, let scheduledAt = timeDate(for: time, anchor: anchor) {
            habit.scheduledAt = scheduledAt
            habit.isTimed = true
        }

        if let days = schedule.days, let rule = habit.recurrenceRule {
            switch rule.frequency {
            case .weekly:
                if let weekday = days.first {
                    habit.scheduledAt = nextWeekday(weekday, anchor: anchor, time: habit.scheduledAt)
                }
            case .monthly:
                if let day = days.first {
                    habit.scheduledAt = nextMonthDay(day, anchor: anchor, time: habit.scheduledAt)
                }
            case .daily:
                break
            }
        }
    }

    static func metadata(from habit: HabitDefinition, existing: [String: JSONValue]? = nil) -> [String: JSONValue]? {
        var payload = existing ?? [:]
        payload["durationMinutes"] = .number(Double(habit.durationMinutes))
        payload["tags"] = .array(habit.tags.map { .string($0) })
        payload["people"] = .array(habit.people.map { .string($0) })
        payload["contexts"] = .array(habit.contexts.map { .string($0) })
        let exceptions = FrontmatterCodec.metadataWithExceptions(payload, exceptions: habit.recurrenceExceptions)
        return exceptions
    }

    static func applyMetadata(_ metadata: [String: JSONValue]?, to habit: inout HabitDefinition) {
        if let durationValue = metadata?["durationMinutes"]?.numberValue {
            habit.durationMinutes = max(5, Int(durationValue))
        }
        if let tags = stringArray(from: metadata?["tags"]) {
            habit.tags = tags
        }
        if let people = stringArray(from: metadata?["people"]) {
            habit.people = people
        }
        if let contexts = stringArray(from: metadata?["contexts"]) {
            habit.contexts = contexts
        }
        habit.recurrenceExceptions = FrontmatterCodec.exceptionsFromMetadata(metadata)
    }

    private static func timeLabel(from date: Date) -> String {
        let calendar = Calendar.current
        let hour = calendar.component(.hour, from: date)
        let minute = calendar.component(.minute, from: date)
        return String(format: "%02d:%02d", hour, minute)
    }

    private static func timeDate(for time: String, anchor: Date) -> Date? {
        let parts = time.split(separator: ":").map { Int($0) }
        guard parts.count == 2, let hour = parts[0], let minute = parts[1] else { return nil }
        return Calendar.current.date(bySettingHour: hour, minute: minute, second: 0, of: anchor)
    }

    private static func nextWeekday(_ weekday: Int, anchor: Date, time: Date?) -> Date {
        let calendar = Calendar.current
        let anchorStart = calendar.startOfDay(for: anchor)
        let currentWeekday = calendar.component(.weekday, from: anchorStart)
        let delta = (weekday - currentWeekday + 7) % 7
        let baseDay = calendar.date(byAdding: .day, value: delta, to: anchorStart) ?? anchorStart
        if let time {
            let hour = calendar.component(.hour, from: time)
            let minute = calendar.component(.minute, from: time)
            return calendar.date(bySettingHour: hour, minute: minute, second: 0, of: baseDay) ?? baseDay
        }
        return baseDay
    }

    private static func nextMonthDay(_ day: Int, anchor: Date, time: Date?) -> Date {
        let calendar = Calendar.current
        var components = calendar.dateComponents([.year, .month], from: anchor)
        components.day = day
        let base = calendar.date(from: components) ?? anchor
        if let time {
            let hour = calendar.component(.hour, from: time)
            let minute = calendar.component(.minute, from: time)
            return calendar.date(bySettingHour: hour, minute: minute, second: 0, of: base) ?? base
        }
        return base
    }

    private static func stringArray(from value: JSONValue?) -> [String]? {
        guard let array = value?.arrayValue else { return nil }
        return array.compactMap { $0.stringValue }
    }
}
