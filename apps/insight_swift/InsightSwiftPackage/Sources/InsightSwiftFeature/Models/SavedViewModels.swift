import Foundation

// MARK: - View Type

/// Types of saved views (matches DB schema)
public enum ViewType: String, Codable, CaseIterable, Sendable {
    case list
    case chart
    case dashboard
}

// MARK: - Saved View

/// User-created saved view with query and display options (matches saved_views table)
public struct SavedView: Identifiable, Codable, Hashable, Sendable {
    public var id: UUID
    public var name: String
    public var viewType: ViewType
    public var query: SavedViewQuery
    public var options: SavedViewOptions
    public var createdAt: Date
    public var updatedAt: Date

    public init(
        id: UUID = UUID(),
        name: String,
        viewType: ViewType = .list,
        query: SavedViewQuery = SavedViewQuery(),
        options: SavedViewOptions = SavedViewOptions(),
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.name = name
        self.viewType = viewType
        self.query = query
        self.options = options
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    public static func == (lhs: SavedView, rhs: SavedView) -> Bool {
        lhs.id == rhs.id
    }

    public func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

// MARK: - Saved View Options

public struct SavedViewOptions: Codable, Sendable {
    public var isPinned: Bool
    public var layout: String?

    public init(isPinned: Bool = false, layout: String? = nil) {
        self.isPinned = isPinned
        self.layout = layout
    }
}

// MARK: - Filter Operator

/// Operators for filter conditions (matches APPENDIX_B spec)
public enum FilterOperator: String, Codable, CaseIterable, Sendable {
    case `is`
    case isNot = "is_not"
    case contains
    case notContains = "not_contains"
    case before
    case after
    case onOrBefore = "on_or_before"
    case onOrAfter = "on_or_after"
    case empty
    case notEmpty = "not_empty"
    case gt
    case gte
    case lt
    case lte
}

// MARK: - Filter Property

/// String-backed property key (supports standard fields + tracker:<key>)
public struct FilterProperty: RawRepresentable, Codable, Hashable, Sendable {
    public let rawValue: String

    public init(rawValue: String) {
        self.rawValue = rawValue
    }

    // Standard properties
    public static let title = FilterProperty(rawValue: "title")
    public static let facets = FilterProperty(rawValue: "facets")
    public static let tags = FilterProperty(rawValue: "tags")
    public static let contexts = FilterProperty(rawValue: "contexts")
    public static let people = FilterProperty(rawValue: "people")
    public static let goals = FilterProperty(rawValue: "goals")
    public static let projects = FilterProperty(rawValue: "projects")
    public static let startAt = FilterProperty(rawValue: "startAt")
    public static let endAt = FilterProperty(rawValue: "endAt")
    public static let createdAt = FilterProperty(rawValue: "createdAt")
    public static let status = FilterProperty(rawValue: "status")
    public static let priority = FilterProperty(rawValue: "priority")
    public static let dueAt = FilterProperty(rawValue: "dueAt")
    public static let scheduledAt = FilterProperty(rawValue: "scheduledAt")
    public static let completedAt = FilterProperty(rawValue: "completedAt")
    public static let difficulty = FilterProperty(rawValue: "difficulty")
    public static let importance = FilterProperty(rawValue: "importance")
    public static let durationMinutes = FilterProperty(rawValue: "durationMinutes")
    public static let xp = FilterProperty(rawValue: "xp")

    /// Helper for tracker:<key>
    public static func tracker(_ key: String) -> FilterProperty {
        FilterProperty(rawValue: "tracker:\(key)")
    }

    public var isTracker: Bool {
        rawValue.hasPrefix("tracker:")
    }

    public var trackerKey: String? {
        isTracker ? String(rawValue.dropFirst("tracker:".count)) : nil
    }
}

// MARK: - Conjunction

public enum Conjunction: String, Codable, CaseIterable, Sendable {
    case and
    case or
}

// MARK: - Filter Condition

public struct FilterCondition: Codable, Identifiable, Hashable, Sendable {
    public var id: UUID
    public var property: FilterProperty
    public var `operator`: FilterOperator
    public var value: JSONValue

    public init(
        id: UUID = UUID(),
        property: FilterProperty,
        operator: FilterOperator,
        value: JSONValue
    ) {
        self.id = id
        self.property = property
        self.operator = `operator`
        self.value = value
    }
}

// MARK: - Filter Group

public struct FilterGroup: Codable, Identifiable, Hashable, Sendable {
    public var id: UUID
    public var conjunction: Conjunction
    public var children: [FilterNode]

    public init(
        id: UUID = UUID(),
        conjunction: Conjunction = .and,
        children: [FilterNode] = []
    ) {
        self.id = id
        self.conjunction = conjunction
        self.children = children
    }
}

// MARK: - Filter Node

/// FilterNode with `type` discriminator for JSON decoding
public enum FilterNode: Codable, Identifiable, Hashable, Sendable {
    case condition(FilterCondition)
    case group(FilterGroup)

    public var id: UUID {
        switch self {
        case .condition(let c): return c.id
        case .group(let g): return g.id
        }
    }

    // Custom coding with "type" discriminator
    private enum CodingKeys: String, CodingKey {
        case type
        case id
        case property
        case `operator`
        case value
        case conjunction
        case children
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)

        switch type {
        case "condition":
            let id = try container.decode(UUID.self, forKey: .id)
            let property = try container.decode(FilterProperty.self, forKey: .property)
            let op = try container.decode(FilterOperator.self, forKey: .operator)
            let value = try container.decode(JSONValue.self, forKey: .value)
            self = .condition(FilterCondition(id: id, property: property, operator: op, value: value))

        case "group":
            let id = try container.decode(UUID.self, forKey: .id)
            let conjunction = try container.decode(Conjunction.self, forKey: .conjunction)
            let children = try container.decode([FilterNode].self, forKey: .children)
            self = .group(FilterGroup(id: id, conjunction: conjunction, children: children))

        default:
            throw DecodingError.dataCorruptedError(
                forKey: .type,
                in: container,
                debugDescription: "Unknown filter node type: \(type)"
            )
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)

        switch self {
        case .condition(let c):
            try container.encode("condition", forKey: .type)
            try container.encode(c.id, forKey: .id)
            try container.encode(c.property, forKey: .property)
            try container.encode(c.operator, forKey: .operator)
            try container.encode(c.value, forKey: .value)

        case .group(let g):
            try container.encode("group", forKey: .type)
            try container.encode(g.id, forKey: .id)
            try container.encode(g.conjunction, forKey: .conjunction)
            try container.encode(g.children, forKey: .children)
        }
    }
}

// MARK: - Sort Spec

public struct SortSpec: Codable, Hashable, Sendable {
    public var key: FilterProperty
    public var direction: SortDirection

    public init(key: FilterProperty, direction: SortDirection = .desc) {
        self.key = key
        self.direction = direction
    }
}

public enum SortDirection: String, Codable, CaseIterable, Sendable {
    case asc
    case desc
}

// MARK: - Time Range Spec

public struct TimeRangeSpec: Codable, Hashable, Sendable {
    public var preset: TimeRangePreset?
    public var start: Date?
    public var end: Date?

    public init(preset: TimeRangePreset? = nil, start: Date? = nil, end: Date? = nil) {
        self.preset = preset
        self.start = start
        self.end = end
    }

    /// Compute actual date range from preset or custom dates
    public func dateInterval(relativeTo now: Date = Date()) -> DateInterval? {
        let calendar = Calendar.current

        if let preset {
            let startOfToday = calendar.startOfDay(for: now)
            switch preset {
            case .today:
                let endOfToday = calendar.date(byAdding: .day, value: 1, to: startOfToday)!
                return DateInterval(start: startOfToday, end: endOfToday)
            case .last7Days:
                let start = calendar.date(byAdding: .day, value: -7, to: startOfToday)!
                return DateInterval(start: start, end: now)
            case .last30Days:
                let start = calendar.date(byAdding: .day, value: -30, to: startOfToday)!
                return DateInterval(start: start, end: now)
            case .custom:
                break
            }
        }

        if let start, let end {
            return DateInterval(start: start, end: end)
        }

        return nil
    }
}

public enum TimeRangePreset: String, Codable, CaseIterable, Sendable {
    case today
    case last7Days = "7d"
    case last30Days = "30d"
    case custom
}

// MARK: - Saved View Query

public struct SavedViewQuery: Codable, Hashable, Sendable {
    public var root: FilterNode
    public var sort: SortSpec?
    public var timeRange: TimeRangeSpec?

    public init(
        root: FilterNode = .group(FilterGroup()),
        sort: SortSpec? = nil,
        timeRange: TimeRangeSpec? = nil
    ) {
        self.root = root
        self.sort = sort
        self.timeRange = timeRange
    }
}
