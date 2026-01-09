import Foundation

// MARK: - Saved View Query Service

/// Service for parsing and evaluating SavedView queries
public struct SavedViewQueryService {

    // MARK: - Parse

    /// Parse FilterNode from JSON Data
    public static func parse(json: Data) throws -> FilterNode {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(FilterNode.self, from: json)
    }

    /// Parse SavedViewQuery from JSON Data
    public static func parseQuery(json: Data) throws -> SavedViewQuery {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(SavedViewQuery.self, from: json)
    }

    // MARK: - Evaluate

    /// Evaluate FilterNode against an Entry
    public static func matches(
        entry: Entry,
        node: FilterNode,
        trackerLogs: [TrackerLog],
        trackers: [TrackerDefinition]
    ) -> Bool {
        switch node {
        case .condition(let condition):
            return evaluateCondition(condition, entry: entry, trackerLogs: trackerLogs, trackers: trackers)
        case .group(let group):
            return evaluateGroup(group, entry: entry, trackerLogs: trackerLogs, trackers: trackers)
        }
    }

    /// Apply query to array of entries
    public static func apply(
        query: SavedViewQuery,
        to entries: [Entry],
        trackerLogs: [TrackerLog],
        trackers: [TrackerDefinition]
    ) -> [Entry] {
        var results = entries

        // Apply time range filter first
        if let timeRange = query.timeRange,
           let interval = timeRange.dateInterval() {
            results = results.filter { entry in
                guard let startAt = entry.startAt else {
                    return interval.contains(entry.createdAt)
                }
                return interval.contains(startAt)
            }
        }

        // Apply filter node
        results = results.filter { entry in
            matches(entry: entry, node: query.root, trackerLogs: trackerLogs, trackers: trackers)
        }

        // Apply sort
        if let sort = query.sort {
            results = sortEntries(results, by: sort)
        }

        return results
    }

    // MARK: - Private Evaluation

    private static func evaluateGroup(
        _ group: FilterGroup,
        entry: Entry,
        trackerLogs: [TrackerLog],
        trackers: [TrackerDefinition]
    ) -> Bool {
        // Empty group matches everything
        guard !group.children.isEmpty else { return true }

        switch group.conjunction {
        case .and:
            return group.children.allSatisfy { child in
                matches(entry: entry, node: child, trackerLogs: trackerLogs, trackers: trackers)
            }
        case .or:
            return group.children.contains { child in
                matches(entry: entry, node: child, trackerLogs: trackerLogs, trackers: trackers)
            }
        }
    }

    private static func evaluateCondition(
        _ condition: FilterCondition,
        entry: Entry,
        trackerLogs: [TrackerLog],
        trackers: [TrackerDefinition]
    ) -> Bool {
        let property = condition.property
        let op = condition.operator
        let value = condition.value

        // Handle tracker:<key> properties
        if property.isTracker, let trackerKey = property.trackerKey {
            return evaluateTrackerCondition(
                trackerKey: trackerKey,
                operator: op,
                value: value,
                entry: entry,
                trackerLogs: trackerLogs,
                trackers: trackers
            )
        }

        // Standard property evaluation
        switch property {
        case .title:
            return evaluateString(entry.title, operator: op, value: value)

        case .facets:
            let facetStrings = entry.facets.map { $0.rawValue }
            return evaluateStringArray(facetStrings, operator: op, value: value)

        case .tags:
            return evaluateStringArray(entry.tags, operator: op, value: value)

        case .contexts:
            return evaluateStringArray(entry.contexts, operator: op, value: value)

        case .people:
            return evaluateStringArray(entry.people, operator: op, value: value)

        case .status:
            return evaluateOptionalString(entry.status?.rawValue, operator: op, value: value)

        case .priority:
            return evaluateOptionalString(entry.priority?.rawValue, operator: op, value: value)

        case .startAt:
            return evaluateOptionalDate(entry.startAt, operator: op, value: value)

        case .endAt:
            return evaluateOptionalDate(entry.endAt, operator: op, value: value)

        case .createdAt:
            return evaluateDate(entry.createdAt, operator: op, value: value)

        case .dueAt:
            return evaluateOptionalDate(entry.dueAt, operator: op, value: value)

        case .scheduledAt:
            return evaluateOptionalDate(entry.scheduledAt, operator: op, value: value)

        case .completedAt:
            return evaluateOptionalDate(entry.completedAt, operator: op, value: value)

        case .difficulty:
            return evaluateOptionalInt(entry.difficulty, operator: op, value: value)

        case .importance:
            return evaluateOptionalInt(entry.importance, operator: op, value: value)

        case .durationMinutes:
            return evaluateOptionalInt(entry.durationMinutes, operator: op, value: value)

        case .xp:
            return evaluateOptionalDouble(entry.xp, operator: op, value: value)

        default:
            // Unknown property - skip filter
            return true
        }
    }

    // MARK: - Tracker Evaluation

    private static func evaluateTrackerCondition(
        trackerKey: String,
        operator op: FilterOperator,
        value: JSONValue,
        entry: Entry,
        trackerLogs: [TrackerLog],
        trackers: [TrackerDefinition]
    ) -> Bool {
        // Find tracker definition by key
        guard let tracker = trackers.first(where: { $0.key.lowercased() == trackerKey.lowercased() }) else {
            return op == .empty // If tracker doesn't exist, it's "empty"
        }

        // Find logs for this tracker on the same day as entry
        let entryDate = entry.startAt ?? entry.createdAt
        let calendar = Calendar.current
        let logsForTracker = trackerLogs.filter { log in
            log.trackerId == tracker.id &&
            calendar.isDate(log.createdAt, inSameDayAs: entryDate)
        }

        if logsForTracker.isEmpty {
            return op == .empty
        }

        // Use the most recent log value
        guard let latestLog = logsForTracker.max(by: { $0.createdAt < $1.createdAt }) else {
            return op == .empty
        }

        return evaluateDouble(latestLog.value, operator: op, value: value)
    }

    // MARK: - Type-Specific Evaluation

    private static func evaluateString(_ actual: String, operator op: FilterOperator, value: JSONValue) -> Bool {
        switch op {
        case .is:
            guard case .string(let expected) = value else { return false }
            return actual.lowercased() == expected.lowercased()
        case .isNot:
            guard case .string(let expected) = value else { return false }
            return actual.lowercased() != expected.lowercased()
        case .contains:
            guard case .string(let expected) = value else { return false }
            return actual.lowercased().contains(expected.lowercased())
        case .notContains:
            guard case .string(let expected) = value else { return false }
            return !actual.lowercased().contains(expected.lowercased())
        case .empty:
            return actual.isEmpty
        case .notEmpty:
            return !actual.isEmpty
        default:
            return true
        }
    }

    private static func evaluateOptionalString(_ actual: String?, operator op: FilterOperator, value: JSONValue) -> Bool {
        switch op {
        case .empty:
            return actual == nil || actual?.isEmpty == true
        case .notEmpty:
            return actual != nil && !actual!.isEmpty
        default:
            guard let actual else { return false }
            return evaluateString(actual, operator: op, value: value)
        }
    }

    private static func evaluateStringArray(_ actual: [String], operator op: FilterOperator, value: JSONValue) -> Bool {
        switch op {
        case .contains:
            guard case .string(let expected) = value else { return false }
            return actual.contains { $0.lowercased() == expected.lowercased() }
        case .notContains:
            guard case .string(let expected) = value else { return false }
            return !actual.contains { $0.lowercased() == expected.lowercased() }
        case .empty:
            return actual.isEmpty
        case .notEmpty:
            return !actual.isEmpty
        case .is:
            // "is" for arrays means "contains exactly"
            guard case .string(let expected) = value else { return false }
            return actual.contains { $0.lowercased() == expected.lowercased() }
        case .isNot:
            guard case .string(let expected) = value else { return false }
            return !actual.contains { $0.lowercased() == expected.lowercased() }
        default:
            return true
        }
    }

    private static func evaluateDate(_ actual: Date, operator op: FilterOperator, value: JSONValue) -> Bool {
        guard let expected = dateFromValue(value) else { return false }

        switch op {
        case .is:
            return Calendar.current.isDate(actual, inSameDayAs: expected)
        case .isNot:
            return !Calendar.current.isDate(actual, inSameDayAs: expected)
        case .before:
            return actual < expected
        case .after:
            return actual > expected
        case .onOrBefore:
            return actual <= expected
        case .onOrAfter:
            return actual >= expected
        default:
            return true
        }
    }

    private static func evaluateOptionalDate(_ actual: Date?, operator op: FilterOperator, value: JSONValue) -> Bool {
        switch op {
        case .empty:
            return actual == nil
        case .notEmpty:
            return actual != nil
        default:
            guard let actual else { return false }
            return evaluateDate(actual, operator: op, value: value)
        }
    }

    private static func evaluateDouble(_ actual: Double, operator op: FilterOperator, value: JSONValue) -> Bool {
        guard case .number(let expected) = value else { return false }

        switch op {
        case .is:
            return abs(actual - expected) < 0.001
        case .isNot:
            return abs(actual - expected) >= 0.001
        case .gt:
            return actual > expected
        case .gte:
            return actual >= expected
        case .lt:
            return actual < expected
        case .lte:
            return actual <= expected
        default:
            return true
        }
    }

    private static func evaluateOptionalDouble(_ actual: Double?, operator op: FilterOperator, value: JSONValue) -> Bool {
        switch op {
        case .empty:
            return actual == nil
        case .notEmpty:
            return actual != nil
        default:
            guard let actual else { return false }
            return evaluateDouble(actual, operator: op, value: value)
        }
    }

    private static func evaluateOptionalInt(_ actual: Int?, operator op: FilterOperator, value: JSONValue) -> Bool {
        switch op {
        case .empty:
            return actual == nil
        case .notEmpty:
            return actual != nil
        default:
            guard let actual else { return false }
            return evaluateDouble(Double(actual), operator: op, value: value)
        }
    }

    // MARK: - Helpers

    private static func dateFromValue(_ value: JSONValue) -> Date? {
        switch value {
        case .string(let str):
            let formatter = ISO8601DateFormatter()
            return formatter.date(from: str)
        case .number(let timestamp):
            // Assume milliseconds if large
            let seconds = timestamp > 1_000_000_000_000 ? timestamp / 1000 : timestamp
            return Date(timeIntervalSince1970: seconds)
        default:
            return nil
        }
    }

    // MARK: - Sorting

    private static func sortEntries(_ entries: [Entry], by sort: SortSpec) -> [Entry] {
        let ascending = sort.direction == .asc

        return entries.sorted { a, b in
            let comparison = compareEntries(a, b, by: sort.key)
            return ascending ? comparison == .orderedAscending : comparison == .orderedDescending
        }
    }

    private static func compareEntries(_ a: Entry, _ b: Entry, by property: FilterProperty) -> ComparisonResult {
        switch property {
        case .title:
            return a.title.localizedCompare(b.title)
        case .startAt:
            return compareOptionalDates(a.startAt, b.startAt)
        case .endAt:
            return compareOptionalDates(a.endAt, b.endAt)
        case .createdAt:
            return a.createdAt.compare(b.createdAt)
        case .dueAt:
            return compareOptionalDates(a.dueAt, b.dueAt)
        case .scheduledAt:
            return compareOptionalDates(a.scheduledAt, b.scheduledAt)
        case .importance:
            return compareOptionalInts(a.importance, b.importance)
        case .difficulty:
            return compareOptionalInts(a.difficulty, b.difficulty)
        case .xp:
            return compareOptionalDoubles(a.xp, b.xp)
        default:
            return .orderedSame
        }
    }

    private static func compareOptionalDates(_ a: Date?, _ b: Date?) -> ComparisonResult {
        switch (a, b) {
        case (nil, nil): return .orderedSame
        case (nil, _): return .orderedAscending
        case (_, nil): return .orderedDescending
        case (let a?, let b?): return a.compare(b)
        }
    }

    private static func compareOptionalInts(_ a: Int?, _ b: Int?) -> ComparisonResult {
        switch (a, b) {
        case (nil, nil): return .orderedSame
        case (nil, _): return .orderedAscending
        case (_, nil): return .orderedDescending
        case (let a?, let b?):
            if a < b { return .orderedAscending }
            if a > b { return .orderedDescending }
            return .orderedSame
        }
    }

    private static func compareOptionalDoubles(_ a: Double?, _ b: Double?) -> ComparisonResult {
        switch (a, b) {
        case (nil, nil): return .orderedSame
        case (nil, _): return .orderedAscending
        case (_, nil): return .orderedDescending
        case (let a?, let b?):
            if a < b { return .orderedAscending }
            if a > b { return .orderedDescending }
            return .orderedSame
        }
    }
}
