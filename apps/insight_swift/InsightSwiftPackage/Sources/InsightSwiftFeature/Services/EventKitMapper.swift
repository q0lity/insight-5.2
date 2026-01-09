import EventKit
import Foundation

/// Utility to map between EKEvent and Entry with full parity-plus fields.
/// Handles RRULE conversion, all-day events, and parity fields (location, URL, attendees).
public enum EventKitMapper {
    // MARK: - Entry → EKEvent

    /// Convert Entry to EKEvent for device calendar.
    /// Use this when pushing local events to the device calendar.
    public static func entryToEKEvent(
        _ entry: Entry,
        frontmatter: EventFrontmatter?,
        in store: EKEventStore
    ) -> EKEvent {
        let event = EKEvent(eventStore: store)

        event.title = entry.title
        event.notes = entry.notes
        event.isAllDay = entry.allDay || (frontmatter?.allDay ?? false)

        // Set start/end dates
        if let startAt = entry.startAt {
            event.startDate = startAt
            if let endAt = entry.endAt {
                event.endDate = endAt
            } else if event.isAllDay {
                // All-day events need same-day end
                event.endDate = startAt
            } else {
                // Default 30-minute duration
                event.endDate = startAt.addingTimeInterval(30 * 60)
            }
        }

        // Parity-plus fields from frontmatter
        if let location = frontmatter?.location {
            event.location = location
        }
        if let urlString = frontmatter?.url, let url = URL(string: urlString) {
            event.url = url
        }

        // Apply recurrence rule if present
        if let recurrenceInfo = frontmatter?.recurrence {
            if let rules = parseRRULEToRecurrenceRules(recurrenceInfo.rrule) {
                event.recurrenceRules = rules
            }
        } else if let recurrenceRule = entry.recurrenceRule {
            event.recurrenceRules = [mapRecurrenceRuleToEK(recurrenceRule)]
        }

        // Use default calendar
        event.calendar = store.defaultCalendarForNewEvents

        return event
    }

    // MARK: - EKEvent → Entry

    /// Convert EKEvent to Entry for import from device calendar.
    /// Marks imported events with source="calendar" via frontmatter.
    public static func ekEventToEntry(_ event: EKEvent) -> (entry: Entry, frontmatter: EventFrontmatter) {
        let id = UUID()

        var frontmatter = EventFrontmatter(
            allDay: event.isAllDay,
            location: event.location,
            url: event.url?.absoluteString,
            calendarId: event.calendar?.calendarIdentifier,
            externalId: event.eventIdentifier
        )

        // Parse recurrence rules
        if let recurrence = parseRecurrenceRules(event) {
            frontmatter.recurrence = recurrence
        }

        // Extract attendees (read-only from EventKit)
        if let attendees = event.attendees, !attendees.isEmpty {
            frontmatter.attendees = attendees.compactMap { attendee in
                attendee.url?.absoluteString?.replacingOccurrences(of: "mailto:", with: "")
            }
        }

        let entry = Entry(
            id: id,
            title: event.title ?? "Untitled Event",
            facets: [.event],
            startAt: event.startDate,
            endAt: event.endDate,
            allDay: event.isAllDay,
            notes: event.notes ?? "",
            recurrenceRule: parseEKRecurrenceToRule(event),
            recurrenceExceptions: [],
            frontmatter: frontmatter.toJSONValue()
        )

        return (entry, frontmatter)
    }

    // MARK: - Recurrence Parsing

    /// Parse EKEvent recurrence rules to RecurrenceInfo (RRULE format).
    public static func parseRecurrenceRules(_ event: EKEvent) -> RecurrenceInfo? {
        guard let rules = event.recurrenceRules, let firstRule = rules.first else {
            return nil
        }

        let rrule = ekRecurrenceRuleToRRULE(firstRule)
        let timezone = event.timeZone?.identifier ?? TimeZone.current.identifier

        return RecurrenceInfo(rrule: rrule, timezone: timezone, exceptions: nil)
    }

    /// Convert EKRecurrenceRule to RFC 5545 RRULE string.
    public static func ekRecurrenceRuleToRRULE(_ rule: EKRecurrenceRule) -> String {
        var components: [String] = []

        // FREQ
        switch rule.frequency {
        case .daily:
            components.append("FREQ=DAILY")
        case .weekly:
            components.append("FREQ=WEEKLY")
        case .monthly:
            components.append("FREQ=MONTHLY")
        case .yearly:
            components.append("FREQ=YEARLY")
        @unknown default:
            components.append("FREQ=DAILY")
        }

        // INTERVAL
        if rule.interval > 1 {
            components.append("INTERVAL=\(rule.interval)")
        }

        // BYDAY
        if let daysOfWeek = rule.daysOfTheWeek, !daysOfWeek.isEmpty {
            let dayStrings = daysOfWeek.map { day -> String in
                var prefix = ""
                if day.weekNumber != 0 {
                    prefix = "\(day.weekNumber)"
                }
                let dayCode: String
                switch day.dayOfTheWeek {
                case .sunday: dayCode = "SU"
                case .monday: dayCode = "MO"
                case .tuesday: dayCode = "TU"
                case .wednesday: dayCode = "WE"
                case .thursday: dayCode = "TH"
                case .friday: dayCode = "FR"
                case .saturday: dayCode = "SA"
                @unknown default: dayCode = "MO"
                }
                return prefix + dayCode
            }
            components.append("BYDAY=\(dayStrings.joined(separator: ","))")
        }

        // BYMONTHDAY
        if let daysOfMonth = rule.daysOfTheMonth, !daysOfMonth.isEmpty {
            let dayStrings = daysOfMonth.map { String($0.intValue) }
            components.append("BYMONTHDAY=\(dayStrings.joined(separator: ","))")
        }

        // BYMONTH
        if let monthsOfYear = rule.monthsOfTheYear, !monthsOfYear.isEmpty {
            let monthStrings = monthsOfYear.map { String($0.intValue) }
            components.append("BYMONTH=\(monthStrings.joined(separator: ","))")
        }

        // COUNT or UNTIL
        if let end = rule.recurrenceEnd {
            if let occurrenceCount = end.occurrenceCount as Int?, occurrenceCount > 0 {
                components.append("COUNT=\(occurrenceCount)")
            } else if let endDate = end.endDate {
                let formatter = ISO8601DateFormatter()
                formatter.formatOptions = [.withFullDate]
                components.append("UNTIL=\(formatter.string(from: endDate))")
            }
        }

        return components.joined(separator: ";")
    }

    /// Parse RRULE string to EKRecurrenceRule array.
    public static func parseRRULEToRecurrenceRules(_ rrule: String) -> [EKRecurrenceRule]? {
        var frequency: EKRecurrenceFrequency = .daily
        var interval = 1
        var daysOfWeek: [EKRecurrenceDayOfWeek]?
        var daysOfMonth: [NSNumber]?
        var monthsOfYear: [NSNumber]?
        var end: EKRecurrenceEnd?

        let parts = rrule.split(separator: ";").map { String($0) }
        for part in parts {
            let keyValue = part.split(separator: "=", maxSplits: 1).map { String($0) }
            guard keyValue.count == 2 else { continue }
            let key = keyValue[0].uppercased()
            let value = keyValue[1]

            switch key {
            case "FREQ":
                switch value.uppercased() {
                case "DAILY": frequency = .daily
                case "WEEKLY": frequency = .weekly
                case "MONTHLY": frequency = .monthly
                case "YEARLY": frequency = .yearly
                default: break
                }
            case "INTERVAL":
                interval = Int(value) ?? 1
            case "BYDAY":
                daysOfWeek = parseBYDAY(value)
            case "BYMONTHDAY":
                daysOfMonth = value.split(separator: ",").compactMap { Int($0) }.map { NSNumber(value: $0) }
            case "BYMONTH":
                monthsOfYear = value.split(separator: ",").compactMap { Int($0) }.map { NSNumber(value: $0) }
            case "COUNT":
                if let count = Int(value) {
                    end = EKRecurrenceEnd(occurrenceCount: count)
                }
            case "UNTIL":
                let formatter = ISO8601DateFormatter()
                formatter.formatOptions = [.withFullDate]
                if let date = formatter.date(from: value) {
                    end = EKRecurrenceEnd(end: date)
                }
            default:
                break
            }
        }

        let rule = EKRecurrenceRule(
            recurrenceWith: frequency,
            interval: interval,
            daysOfTheWeek: daysOfWeek,
            daysOfTheMonth: daysOfMonth,
            monthsOfTheYear: monthsOfYear,
            weeksOfTheYear: nil,
            daysOfTheYear: nil,
            setPositions: nil,
            end: end
        )

        return [rule]
    }

    /// Parse BYDAY component (e.g., "MO,WE,FR" or "2MO,-1FR").
    private static func parseBYDAY(_ value: String) -> [EKRecurrenceDayOfWeek] {
        let dayMap: [String: EKWeekday] = [
            "SU": .sunday, "MO": .monday, "TU": .tuesday, "WE": .wednesday,
            "TH": .thursday, "FR": .friday, "SA": .saturday
        ]

        return value.split(separator: ",").compactMap { item in
            let str = String(item)
            // Check for week number prefix (e.g., "2MO" for second Monday)
            var weekNumber = 0
            var dayCode = str

            if str.count > 2 {
                let prefix = str.prefix(str.count - 2)
                if let num = Int(prefix) {
                    weekNumber = num
                    dayCode = String(str.suffix(2))
                }
            }

            guard let weekday = dayMap[dayCode.uppercased()] else { return nil }
            return EKRecurrenceDayOfWeek(dayOfTheWeek: weekday, weekNumber: weekNumber)
        }
    }

    /// Convert Entry's RecurrenceRule to EKRecurrenceRule.
    public static func mapRecurrenceRuleToEK(_ rule: RecurrenceRule) -> EKRecurrenceRule {
        let frequency: EKRecurrenceFrequency
        switch rule.frequency {
        case .daily:
            frequency = .daily
        case .weekly:
            frequency = .weekly
        case .monthly:
            frequency = .monthly
        }

        return EKRecurrenceRule(
            recurrenceWith: frequency,
            interval: rule.interval,
            end: nil
        )
    }

    /// Parse EKEvent recurrence to Entry's RecurrenceRule format.
    private static func parseEKRecurrenceToRule(_ event: EKEvent) -> RecurrenceRule? {
        guard let rules = event.recurrenceRules, let rule = rules.first else {
            return nil
        }

        let frequency: RecurrenceFrequency
        switch rule.frequency {
        case .daily:
            frequency = .daily
        case .weekly:
            frequency = .weekly
        case .monthly, .yearly:
            frequency = .monthly
        @unknown default:
            frequency = .daily
        }

        return RecurrenceRule(frequency: frequency, interval: rule.interval)
    }

    // MARK: - Change Detection

    /// Detect if local Entry and remote EKEvent have meaningful differences.
    public static func hasChanges(local: Entry, remote: EKEvent) -> Bool {
        // Title check
        if local.title != (remote.title ?? "") {
            return true
        }

        // Time check
        if let localStart = local.startAt, localStart != remote.startDate {
            return true
        }
        if let localEnd = local.endAt, localEnd != remote.endDate {
            return true
        }

        // All-day check
        if local.allDay != remote.isAllDay {
            return true
        }

        // Notes check
        if local.notes != (remote.notes ?? "") {
            return true
        }

        // Location check (from frontmatter)
        let localFrontmatter = EventFrontmatter.from(local.frontmatter)
        if localFrontmatter?.location != remote.location {
            return true
        }

        return false
    }

    // MARK: - Conflict Detection

    /// Check if updates are within 60-second conflict window (matches edge function logic).
    public static func isConflictWindow(localUpdated: Date, remoteUpdated: Date) -> Bool {
        abs(localUpdated.timeIntervalSince(remoteUpdated)) < CalendarConflict.conflictWindowSeconds
    }

    // MARK: - Update Helpers

    /// Update an existing EKEvent from Entry changes.
    public static func updateEKEvent(
        _ event: EKEvent,
        from entry: Entry,
        frontmatter: EventFrontmatter?
    ) {
        event.title = entry.title
        event.notes = entry.notes
        event.isAllDay = entry.allDay || (frontmatter?.allDay ?? false)

        if let startAt = entry.startAt {
            event.startDate = startAt
        }
        if let endAt = entry.endAt {
            event.endDate = endAt
        }

        if let location = frontmatter?.location {
            event.location = location
        }
        if let urlString = frontmatter?.url, let url = URL(string: urlString) {
            event.url = url
        }

        // Update recurrence if changed
        if let recurrenceInfo = frontmatter?.recurrence {
            event.recurrenceRules = parseRRULEToRecurrenceRules(recurrenceInfo.rrule)
        } else if let recurrenceRule = entry.recurrenceRule {
            event.recurrenceRules = [mapRecurrenceRuleToEK(recurrenceRule)]
        } else {
            event.recurrenceRules = nil
        }
    }

    /// Update Entry from EKEvent changes (for pull from device calendar).
    public static func updateEntry(
        _ entry: inout Entry,
        from event: EKEvent
    ) -> EventFrontmatter {
        entry.title = event.title ?? entry.title
        entry.notes = event.notes ?? ""
        entry.startAt = event.startDate
        entry.endAt = event.endDate
        entry.allDay = event.isAllDay

        // Parse recurrence
        if let recurrence = parseEKRecurrenceToRule(event) {
            entry.recurrenceRule = recurrence
        }

        // Build updated frontmatter
        var frontmatter = EventFrontmatter(
            allDay: event.isAllDay,
            location: event.location,
            url: event.url?.absoluteString,
            calendarId: event.calendar?.calendarIdentifier,
            externalId: event.eventIdentifier
        )

        if let recurrenceInfo = parseRecurrenceRules(event) {
            frontmatter.recurrence = recurrenceInfo
        }

        if let attendees = event.attendees, !attendees.isEmpty {
            frontmatter.attendees = attendees.compactMap { attendee in
                attendee.url?.absoluteString?.replacingOccurrences(of: "mailto:", with: "")
            }
        }

        entry.frontmatter = frontmatter.toJSONValue()

        return frontmatter
    }
}
