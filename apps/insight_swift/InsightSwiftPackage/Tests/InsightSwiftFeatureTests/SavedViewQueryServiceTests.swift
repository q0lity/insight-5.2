import Foundation
import Testing
@testable import InsightSwiftFeature

// MARK: - SavedViewQueryService Tests

@Test("parse valid JSON with type discriminator returns FilterNode")
func parseValidJSON() throws {
    let json = """
    {
        "type": "condition",
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "property": "tags",
        "operator": "contains",
        "value": "work"
    }
    """.data(using: .utf8)!

    let node = try SavedViewQueryService.parse(json: json)

    if case .condition(let condition) = node {
        #expect(condition.property == .tags)
        #expect(condition.operator == .contains)
        if case .string(let value) = condition.value {
            #expect(value == "work")
        } else {
            #expect(false, "Expected string value")
        }
    } else {
        #expect(false, "Expected condition node")
    }
}

@Test("parse invalid JSON throws error")
func parseInvalidJSON() {
    let json = """
    { "invalid": "data" }
    """.data(using: .utf8)!

    #expect(throws: Error.self) {
        _ = try SavedViewQueryService.parse(json: json)
    }
}

@Test("parse handles nested groups")
func parseNestedGroups() throws {
    let json = """
    {
        "type": "group",
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "conjunction": "and",
        "children": [
            {
                "type": "condition",
                "id": "550e8400-e29b-41d4-a716-446655440001",
                "property": "tags",
                "operator": "contains",
                "value": "work"
            },
            {
                "type": "condition",
                "id": "550e8400-e29b-41d4-a716-446655440002",
                "property": "status",
                "operator": "is",
                "value": "done"
            }
        ]
    }
    """.data(using: .utf8)!

    let node = try SavedViewQueryService.parse(json: json)

    if case .group(let group) = node {
        #expect(group.conjunction == .and)
        #expect(group.children.count == 2)
    } else {
        #expect(false, "Expected group node")
    }
}

@Test("matches evaluates 'contains' operator correctly")
func matchesContainsOperator() {
    let entry = Entry(
        title: "Test Entry",
        facets: [.event],
        startAt: Date(),
        tags: ["work", "urgent"]
    )

    let matchingCondition = FilterCondition(
        property: .tags,
        operator: .contains,
        value: .string("work")
    )
    let matchingNode = FilterNode.condition(matchingCondition)

    let nonMatchingCondition = FilterCondition(
        property: .tags,
        operator: .contains,
        value: .string("personal")
    )
    let nonMatchingNode = FilterNode.condition(nonMatchingCondition)

    #expect(SavedViewQueryService.matches(entry: entry, node: matchingNode, trackerLogs: [], trackers: []))
    #expect(!SavedViewQueryService.matches(entry: entry, node: nonMatchingNode, trackerLogs: [], trackers: []))
}

@Test("matches evaluates status filter")
func matchesStatusFilter() {
    let doneEntry = Entry(
        title: "Done Entry",
        facets: [.event],
        startAt: Date(),
        status: .done
    )

    let openEntry = Entry(
        title: "Open Entry",
        facets: [.event],
        startAt: Date(),
        status: .open
    )

    let condition = FilterCondition(
        property: .status,
        operator: .is,
        value: .string("done")
    )
    let node = FilterNode.condition(condition)

    #expect(SavedViewQueryService.matches(entry: doneEntry, node: node, trackerLogs: [], trackers: []))
    #expect(!SavedViewQueryService.matches(entry: openEntry, node: node, trackerLogs: [], trackers: []))
}

@Test("matches evaluates dueAt filter")
func matchesDueAtFilter() {
    let now = Date()
    let tomorrow = now.addingTimeInterval(86400)

    let entry = Entry(
        title: "Due Tomorrow",
        facets: [.event],
        startAt: now,
        dueAt: tomorrow
    )

    let beforeCondition = FilterCondition(
        property: .dueAt,
        operator: .before,
        value: .number(now.addingTimeInterval(172800).timeIntervalSince1970)
    )
    let beforeNode = FilterNode.condition(beforeCondition)

    let afterCondition = FilterCondition(
        property: .dueAt,
        operator: .after,
        value: .number(now.addingTimeInterval(172800).timeIntervalSince1970)
    )
    let afterNode = FilterNode.condition(afterCondition)

    #expect(SavedViewQueryService.matches(entry: entry, node: beforeNode, trackerLogs: [], trackers: []))
    #expect(!SavedViewQueryService.matches(entry: entry, node: afterNode, trackerLogs: [], trackers: []))
}

@Test("matches evaluates tracker:<key> filter")
func matchesTrackerFilter() {
    let now = Date()
    let entry = Entry(
        title: "Test Entry",
        facets: [.event],
        startAt: now
    )

    let tracker = TrackerDefinition(key: "mood", unit: "1-10")
    let trackerLog = TrackerLog(trackerId: tracker.id, value: 8, createdAt: now)

    let condition = FilterCondition(
        property: .tracker("mood"),
        operator: .gte,
        value: .number(7)
    )
    let node = FilterNode.condition(condition)

    #expect(SavedViewQueryService.matches(entry: entry, node: node, trackerLogs: [trackerLog], trackers: [tracker]))
}

@Test("apply query filters and sorts entries")
func applyQueryFiltersAndSorts() {
    let now = Date()
    let entries = [
        Entry(title: "A Entry", facets: [.event], startAt: now, tags: ["work"]),
        Entry(title: "B Entry", facets: [.event], startAt: now, tags: ["personal"]),
        Entry(title: "C Entry", facets: [.event], startAt: now, tags: ["work"])
    ]

    let condition = FilterCondition(
        property: .tags,
        operator: .contains,
        value: .string("work")
    )
    let query = SavedViewQuery(
        root: .group(FilterGroup(conjunction: .and, children: [.condition(condition)])),
        sort: SortSpec(key: .title, direction: .asc)
    )

    let results = SavedViewQueryService.apply(query: query, to: entries, trackerLogs: [], trackers: [])

    #expect(results.count == 2)
    #expect(results[0].title == "A Entry")
    #expect(results[1].title == "C Entry")
}

@Test("apply query with complex AND/OR logic")
func applyQueryComplexLogic() {
    let now = Date()
    let entries = [
        Entry(title: "Work High", facets: [.event], startAt: now, tags: ["work"], priority: .high),
        Entry(title: "Work Low", facets: [.event], startAt: now, tags: ["work"], priority: .low),
        Entry(title: "Personal High", facets: [.event], startAt: now, tags: ["personal"], priority: .high),
        Entry(title: "Personal Low", facets: [.event], startAt: now, tags: ["personal"], priority: .low)
    ]

    // (tags contains "work") AND (priority is "high")
    let tagCondition = FilterCondition(property: .tags, operator: .contains, value: .string("work"))
    let priorityCondition = FilterCondition(property: .priority, operator: .is, value: .string("high"))

    let query = SavedViewQuery(
        root: .group(FilterGroup(conjunction: .and, children: [
            .condition(tagCondition),
            .condition(priorityCondition)
        ]))
    )

    let results = SavedViewQueryService.apply(query: query, to: entries, trackerLogs: [], trackers: [])

    #expect(results.count == 1)
    #expect(results[0].title == "Work High")
}

@Test("empty group matches everything")
func emptyGroupMatchesAll() {
    let entries = [
        Entry(title: "Entry 1", facets: [.event], startAt: Date()),
        Entry(title: "Entry 2", facets: [.event], startAt: Date())
    ]

    let query = SavedViewQuery(root: .group(FilterGroup()))

    let results = SavedViewQueryService.apply(query: query, to: entries, trackerLogs: [], trackers: [])

    #expect(results.count == 2)
}

@Test("time range filter works correctly")
func timeRangeFilter() {
    let now = Date()
    let yesterday = now.addingTimeInterval(-86400)
    let twoDaysAgo = now.addingTimeInterval(-172800)

    let entries = [
        Entry(title: "Today", facets: [.event], startAt: now),
        Entry(title: "Yesterday", facets: [.event], startAt: yesterday),
        Entry(title: "Two Days Ago", facets: [.event], startAt: twoDaysAgo)
    ]

    let query = SavedViewQuery(
        root: .group(FilterGroup()),
        timeRange: TimeRangeSpec(preset: .today)
    )

    let results = SavedViewQueryService.apply(query: query, to: entries, trackerLogs: [], trackers: [])

    #expect(results.count == 1)
    #expect(results[0].title == "Today")
}
