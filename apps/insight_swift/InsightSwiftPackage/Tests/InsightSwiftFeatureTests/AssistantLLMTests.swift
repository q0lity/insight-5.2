import Foundation
import Testing
@testable import InsightSwiftFeature

struct AssistantLLMTests {
    // MARK: - AssistantQueryRequest Tests

    @Test("AssistantQueryRequest encodes correctly")
    func requestEncodes() throws {
        let request = AssistantQueryRequest(
            prompt: "What did I do yesterday?",
            context: [
                ["title": "Meeting", "type": "entry"],
                ["title": "Lunch", "type": "nutrition"]
            ]
        )

        let encoder = JSONEncoder()
        let data = try encoder.encode(request)
        let dict = try JSONSerialization.jsonObject(with: data) as! [String: Any]

        #expect(dict["prompt"] as? String == "What did I do yesterday?")
        let context = dict["context"] as? [[String: String]]
        #expect(context?.count == 2)
        #expect(context?[0]["title"] == "Meeting")
        #expect(context?[1]["type"] == "nutrition")
    }

    @Test("AssistantQueryRequest encodes empty context")
    func requestEncodesEmptyContext() throws {
        let request = AssistantQueryRequest(
            prompt: "Hello",
            context: []
        )

        let encoder = JSONEncoder()
        let data = try encoder.encode(request)
        let dict = try JSONSerialization.jsonObject(with: data) as! [String: Any]

        #expect(dict["prompt"] as? String == "Hello")
        let context = dict["context"] as? [[String: String]]
        #expect(context?.isEmpty == true)
    }

    // MARK: - AssistantQueryResponse Tests

    @Test("AssistantQueryResponse decodes correctly")
    func responseDecodes() throws {
        let json = """
        {
            "reply": "Based on your data, you had a meeting at 10am and lunch at noon."
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        let response = try decoder.decode(AssistantQueryResponse.self, from: json)

        #expect(response.reply == "Based on your data, you had a meeting at 10am and lunch at noon.")
    }

    @Test("AssistantQueryResponse decodes empty reply")
    func responseDecodesEmptyReply() throws {
        let json = """
        {
            "reply": ""
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        let response = try decoder.decode(AssistantQueryResponse.self, from: json)

        #expect(response.reply == "")
    }

    @Test("AssistantQueryResponse decodes multiline reply")
    func responseDecodesMultilineReply() throws {
        let json = """
        {
            "reply": "Line 1\\nLine 2\\nLine 3"
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        let response = try decoder.decode(AssistantQueryResponse.self, from: json)

        #expect(response.reply.contains("Line 1"))
        #expect(response.reply.contains("Line 2"))
    }

    // MARK: - AssistantMode Tests

    @Test("AssistantMode has correct labels")
    func assistantModeLabels() {
        #expect(AssistantMode.local.label == "Local")
        #expect(AssistantMode.llm.label == "AI")
    }

    @Test("AssistantMode has correct icons")
    func assistantModeIcons() {
        #expect(AssistantMode.local.icon == "magnifyingglass")
        #expect(AssistantMode.llm.icon == "sparkles")
    }

    @Test("AssistantMode allCases contains both modes")
    func assistantModeAllCases() {
        #expect(AssistantMode.allCases.count == 2)
        #expect(AssistantMode.allCases.contains(.local))
        #expect(AssistantMode.allCases.contains(.llm))
    }

    // MARK: - AssistantMessage Tests

    @Test("AssistantMessage initializes with user role")
    func assistantMessageUserRole() {
        let message = AssistantMessage(role: .user, content: "Hello")

        #expect(message.role == .user)
        #expect(message.content == "Hello")
        #expect(message.id != UUID())
    }

    @Test("AssistantMessage initializes with assistant role")
    func assistantMessageAssistantRole() {
        let message = AssistantMessage(role: .assistant, content: "Hi there!")

        #expect(message.role == .assistant)
        #expect(message.content == "Hi there!")
    }

    // MARK: - SearchResult Context Building Tests

    @Test("SearchResult provides title for context")
    func searchResultTitle() {
        let entry = Entry(title: "Test Entry", facets: [.event])
        let result = SearchResult.entry(entry)

        #expect(result.title == "Test Entry")
    }

    @Test("SearchResult provides resultType for context")
    func searchResultResultType() {
        let entry = Entry(title: "Test", facets: [.event])
        let task = TodoTask(title: "Test Task")
        let note = Note(title: "Test Note", body: "Body")

        #expect(SearchResult.entry(entry).resultType == "Entry")
        #expect(SearchResult.task(task).resultType == "Task")
        #expect(SearchResult.note(note).resultType == "Note")
    }

    @Test("SearchResult provides timestamp")
    func searchResultTimestamp() {
        let entry = Entry(title: "Test", facets: [.event])
        let result = SearchResult.entry(entry)

        // Timestamp should be a Date
        let timestamp = result.timestamp
        #expect(timestamp <= Date())
    }

    // MARK: - Context Snippet Building Tests

    @Test("SearchResult subtitle provides context snippet")
    func searchResultSubtitle() {
        let entry = Entry(
            title: "Meeting",
            facets: [.event],
            notes: "Discussed project timeline"
        )
        let result = SearchResult.entry(entry)

        #expect(result.subtitle == "Discussed project timeline")
    }

    @Test("SearchResult subtitle handles empty notes")
    func searchResultSubtitleEmpty() {
        let task = TodoTask(title: "Task", notes: "")
        let result = SearchResult.task(task)

        #expect(result.subtitle == nil)
    }

    @Test("SearchResult subtitle truncates long text")
    func searchResultSubtitleTruncates() {
        let longBody = String(repeating: "A", count: 200)
        let note = Note(title: "Note", body: longBody)
        let result = SearchResult.note(note)

        // Subtitle should be truncated to 100 chars
        #expect(result.subtitle?.count == 100)
    }
}
