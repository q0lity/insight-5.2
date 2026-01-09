import Foundation
import Testing
@testable import InsightSwiftFeature

struct SavedViewSyncTests {
    // MARK: - SupabaseSavedViewRow Decoding Tests

    @Test("SupabaseSavedViewRow decodes minimal JSON")
    func decodesMinimalJSON() throws {
        let json = """
        {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "user_id": "660e8400-e29b-41d4-a716-446655440001",
            "name": "My View",
            "view_type": "list",
            "query": "{}",
            "options": "{}"
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        let row = try decoder.decode(SupabaseSavedViewRow.self, from: json)

        #expect(row.id == UUID(uuidString: "550e8400-e29b-41d4-a716-446655440000"))
        #expect(row.userId == UUID(uuidString: "660e8400-e29b-41d4-a716-446655440001"))
        #expect(row.name == "My View")
        #expect(row.viewType == "list")
        #expect(row.query == "{}")
        #expect(row.options == "{}")
    }

    @Test("SupabaseSavedViewRow decodes with timestamps")
    func decodesWithTimestamps() throws {
        let json = """
        {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "user_id": "660e8400-e29b-41d4-a716-446655440001",
            "created_at": "2026-01-07T12:00:00Z",
            "updated_at": "2026-01-07T13:00:00Z",
            "name": "Test View",
            "view_type": "chart",
            "query": "{}",
            "options": "{}"
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        let row = try decoder.decode(SupabaseSavedViewRow.self, from: json)

        #expect(row.createdAt == "2026-01-07T12:00:00Z")
        #expect(row.updatedAt == "2026-01-07T13:00:00Z")
        #expect(row.viewType == "chart")
    }

    // MARK: - SupabaseSavedViewInsert Encoding Tests

    @Test("SupabaseSavedViewInsert encodes correctly")
    func encodesCorrectly() throws {
        let insert = SupabaseSavedViewInsert(
            id: UUID(uuidString: "550e8400-e29b-41d4-a716-446655440000")!,
            userId: UUID(uuidString: "660e8400-e29b-41d4-a716-446655440001")!,
            name: "New View",
            viewType: "dashboard",
            query: "{\"kinds\":[\"entry\"]}",
            options: "{\"color\":\"blue\"}"
        )

        let encoder = JSONEncoder()
        let data = try encoder.encode(insert)
        let dict = try JSONSerialization.jsonObject(with: data) as! [String: Any]

        #expect(dict["name"] as? String == "New View")
        #expect(dict["view_type"] as? String == "dashboard")
        #expect(dict["query"] as? String == "{\"kinds\":[\"entry\"]}")
        #expect(dict["options"] as? String == "{\"color\":\"blue\"}")
        #expect(dict["user_id"] as? String == "660E8400-E29B-41D4-A716-446655440001")
    }

    // MARK: - SupabaseSavedViewUpdate Encoding Tests

    @Test("SupabaseSavedViewUpdate encodes only non-nil fields")
    func encodesOnlyNonNilFields() throws {
        let update = SupabaseSavedViewUpdate(
            name: "Updated Name",
            viewType: nil,
            query: nil,
            options: nil,
            updatedAt: "2026-01-07T14:00:00Z"
        )

        let encoder = JSONEncoder()
        let data = try encoder.encode(update)
        let dict = try JSONSerialization.jsonObject(with: data) as! [String: Any]

        #expect(dict["name"] as? String == "Updated Name")
        #expect(dict["updated_at"] as? String == "2026-01-07T14:00:00Z")
        #expect(dict["view_type"] == nil)
        #expect(dict["query"] == nil)
        #expect(dict["options"] == nil)
    }

    @Test("SupabaseSavedViewUpdate encodes all fields when present")
    func encodesAllFieldsWhenPresent() throws {
        let update = SupabaseSavedViewUpdate(
            name: "Full Update",
            viewType: "list",
            query: "{\"new\":true}",
            options: "{\"opt\":1}",
            updatedAt: "2026-01-07T15:00:00Z"
        )

        let encoder = JSONEncoder()
        let data = try encoder.encode(update)
        let dict = try JSONSerialization.jsonObject(with: data) as! [String: Any]

        #expect(dict["name"] as? String == "Full Update")
        #expect(dict["view_type"] as? String == "list")
        #expect(dict["query"] as? String == "{\"new\":true}")
        #expect(dict["options"] as? String == "{\"opt\":1}")
        #expect(dict["updated_at"] as? String == "2026-01-07T15:00:00Z")
    }

    // MARK: - SyncEntityType Tests

    @Test("SyncEntityType.savedView exists and has correct rawValue")
    func syncEntityTypeSavedView() {
        let entityType = SyncEntityType.savedView
        #expect(entityType.rawValue == "savedView")
    }

    @Test("SyncEntityType.savedView is included in allCases")
    func syncEntityTypeSavedViewInAllCases() {
        #expect(SyncEntityType.allCases.contains(.savedView))
    }

    // MARK: - SavedView Model Tests

    @Test("SavedView initializes with default values")
    func savedViewDefaultInit() {
        let view = SavedView(name: "Test View")

        #expect(view.name == "Test View")
        #expect(view.viewType == .list)
        #expect(view.query.kinds == nil)
        #expect(view.query.tags == nil)
        #expect(view.options.colorHex == "#007AFF")
    }

    @Test("SavedView with custom query")
    func savedViewCustomQuery() {
        let query = SavedViewQuery(
            kinds: [.entry, .task],
            tags: ["work", "urgent"],
            searchText: "meeting"
        )
        let view = SavedView(name: "Work View", viewType: .chart, query: query)

        #expect(view.query.kinds == [.entry, .task])
        #expect(view.query.tags == ["work", "urgent"])
        #expect(view.query.searchText == "meeting")
    }

    // MARK: - SavedViewQuery Tests

    @Test("SavedViewQuery is Codable")
    func savedViewQueryCodable() throws {
        let query = SavedViewQuery(
            kinds: [.entry],
            tags: ["test"],
            people: ["John"],
            contexts: ["work"]
        )

        let encoder = JSONEncoder()
        let data = try encoder.encode(query)

        let decoder = JSONDecoder()
        let decoded = try decoder.decode(SavedViewQuery.self, from: data)

        #expect(decoded.kinds == [.entry])
        #expect(decoded.tags == ["test"])
        #expect(decoded.people == ["John"])
        #expect(decoded.contexts == ["work"])
    }

    @Test("SavedViewQuery with date range")
    func savedViewQueryWithDateRange() {
        let now = Date()
        let yesterday = now.addingTimeInterval(-86400)
        let range = yesterday...now

        let query = SavedViewQuery(dateRange: range)

        #expect(query.dateRange != nil)
        #expect(query.dateRange?.lowerBound == yesterday)
        #expect(query.dateRange?.upperBound == now)
    }

    // MARK: - SavedViewOptions Tests

    @Test("SavedViewOptions initializes with defaults")
    func savedViewOptionsDefaults() {
        let options = SavedViewOptions()

        #expect(options.colorHex == "#007AFF")
        #expect(options.iconName == "star")
        #expect(options.isPinned == false)
        #expect(options.sortOrder == 0)
    }

    @Test("SavedViewOptions is Codable")
    func savedViewOptionsCodable() throws {
        let options = SavedViewOptions(
            colorHex: "#FF0000",
            iconName: "heart",
            isPinned: true,
            sortOrder: 5
        )

        let encoder = JSONEncoder()
        let data = try encoder.encode(options)

        let decoder = JSONDecoder()
        let decoded = try decoder.decode(SavedViewOptions.self, from: data)

        #expect(decoded.colorHex == "#FF0000")
        #expect(decoded.iconName == "heart")
        #expect(decoded.isPinned == true)
        #expect(decoded.sortOrder == 5)
    }
}
