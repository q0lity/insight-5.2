import Foundation
import Testing
@testable import InsightSwiftFeature

private struct CaptureVector: Decodable {
    let name: String
    let input: String
    let expected: ParsedCapture
}

@MainActor
private struct TestTranscriber: CaptureTranscribing {
    let handler: (CaptureTranscriptionSource) async throws -> String

    func transcribe(
        captureId: String,
        source: CaptureTranscriptionSource
    ) async throws -> CaptureTranscriptionResult {
        let transcript = try await handler(source)
        return CaptureTranscriptionResult(captureId: captureId, transcript: transcript)
    }
}

@MainActor
private struct TestParser: CaptureParsing {
    let result: ParsedCapture?

    func parse(_ rawText: String) -> ParsedCapture? {
        result
    }
}

private func loadCaptureVectors() throws -> [CaptureVector] {
    let baseURL = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
    let fixtureURL = baseURL.appendingPathComponent("Fixtures").appendingPathComponent("capture_vectors.json")
    let data = try Data(contentsOf: fixtureURL)
    return try JSONDecoder().decode([CaptureVector].self, from: data)
}

@Test("Swift and JS parsers match capture vectors")
func captureParserParityVectors() throws {
    let vectors = try loadCaptureVectors()
    let jsParser = JavaScriptCaptureParser()
    let fixedNowMs = 1_700_000_000_000.0

    for vector in vectors {
        let swiftParsed = MarkdownCaptureParser.parseCapture(vector.input, nowMs: fixedNowMs)
        #expect(swiftParsed == vector.expected, "Swift parser mismatch for \(vector.name)")

        let jsParsed = jsParser.parse(vector.input, nowMs: fixedNowMs)
        #require(jsParsed != nil, "JS parser returned nil for \(vector.name)")
        #expect(jsParsed == vector.expected, "JS parser mismatch for \(vector.name)")
    }
}

@Test("Invalid segment headers are rejected")
func parseSegmentHeaderRejectsInvalid() {
    #expect(MarkdownCaptureParser.parseSegmentHeader("not a header") == nil)
    #expect(MarkdownCaptureParser.parseSegmentHeader("::") == nil)
    #expect(MarkdownCaptureParser.parseSegmentHeader("::   ") == nil)
    #expect(MarkdownCaptureParser.parseSegmentHeader(":: 123") == nil)
}

@Test("Tracker string values are preserved in Swift and JS parsers")
func trackerStringValues() {
    let text = "Logged #supplement(omega3) after breakfast."
    let fixedNowMs = 1_700_000_000_000.0

    let swiftParsed = MarkdownCaptureParser.parseCapture(text, nowMs: fixedNowMs)
    #expect(swiftParsed.trackerLogs.count == 1)
    if case .string(let value) = swiftParsed.trackerLogs.first?.value {
        #expect(value == "omega3")
    } else {
        #expect(false, "Expected string tracker value in Swift parser")
    }

    let jsParsed = JavaScriptCaptureParser().parse(text, nowMs: fixedNowMs)
    #require(jsParsed != nil)
    if case .string(let value) = jsParsed?.trackerLogs.first?.value {
        #expect(value == "omega3")
    } else {
        #expect(false, "Expected string tracker value in JS parser")
    }
}

@Test("Tracker clamp bounds for core trackers")
func trackerClampBounds() {
    let text = "#mood(15) #energy: 0 #focus(7)"
    let fixedNowMs = 1_700_000_000_000.0

    let swiftParsed = MarkdownCaptureParser.parseCapture(text, nowMs: fixedNowMs)
    let swiftValues = Dictionary(uniqueKeysWithValues: swiftParsed.trackerLogs.compactMap { log -> (String, Double)? in
        guard case .number(let value) = log.value else { return nil }
        return (log.key, value)
    })
    #expect(swiftValues["mood"] == 10)
    #expect(swiftValues["energy"] == 1)
    #expect(swiftValues["focus"] == 7)

    let jsParsed = JavaScriptCaptureParser().parse(text, nowMs: fixedNowMs)
    #require(jsParsed != nil)
    let jsValues = Dictionary(uniqueKeysWithValues: jsParsed?.trackerLogs.compactMap { log -> (String, Double)? in
        guard case .number(let value) = log.value else { return nil }
        return (log.key, value)
    } ?? [])
    #expect(jsValues["mood"] == 10)
    #expect(jsValues["energy"] == 1)
    #expect(jsValues["focus"] == 7)
}

@Test("Capture pipeline commits accepted review items")
@MainActor
func capturePipelineHappyPath() async throws {
    let suiteName = "capture.pipeline.happy"
    let defaults = UserDefaults(suiteName: suiteName)!
    defaults.removePersistentDomain(forName: suiteName)
    let pendingStore = CapturePendingStore(defaults: defaults, storageKey: "capture.pipeline.happy.queue")

    let parserService = CaptureParserService(engine: .swift)
    let recordingCoordinator = RecordingCoordinator(liveActivityManager: LiveActivityManager())
    let transcriber = TestTranscriber { source in
        switch source {
        case .text(let text):
            return text
        case .audio:
            return "I'm driving to work.\n- [ ] Submit report\n#mood(7)"
        }
    }

    let pipeline = CapturePipelineService(
        parserService: parserService,
        recordingCoordinator: recordingCoordinator,
        pendingStore: pendingStore,
        transcriber: transcriber,
        isOnline: { true }
    )

    await pipeline.submitCaptureText("I'm driving to work.\n- [ ] Submit report\n#mood(7)")
    #expect(pipeline.phase == .review)

    pipeline.acceptAll()

    let appStore = AppStore()
    let persistence = LocalPersistenceService()
    appStore.attachPersistence(persistence)
    let supabase = SupabaseService()
    let authStore = SupabaseAuthStore(supabase: supabase)
    let syncService = SupabaseSyncService(
        supabase: supabase,
        authStore: authStore,
        appStore: appStore,
        persistence: persistence
    )

    pipeline.applyAcceptedItems(appStore: appStore, syncService: syncService)
    #expect(appStore.entries.count == 1)
    #expect(appStore.tasks.count == 1)
    #expect(appStore.trackerLogs.count == 1)
}

@Test("Capture pipeline stores pending capture on parse failure")
@MainActor
func capturePipelineParseFailure() async throws {
    let suiteName = "capture.pipeline.parsefailure"
    let defaults = UserDefaults(suiteName: suiteName)!
    defaults.removePersistentDomain(forName: suiteName)
    let pendingStore = CapturePendingStore(defaults: defaults, storageKey: "capture.pipeline.parsefailure.queue")

    let parser = TestParser(result: nil)
    let recordingCoordinator = RecordingCoordinator(liveActivityManager: LiveActivityManager())
    let transcriber = TestTranscriber { source in
        switch source {
        case .text(let text):
            return text
        case .audio:
            return PendingCapture.audioPlaceholder
        }
    }

    let pipeline = CapturePipelineService(
        parserService: parser,
        recordingCoordinator: recordingCoordinator,
        pendingStore: pendingStore,
        transcriber: transcriber,
        isOnline: { true }
    )

    await pipeline.submitCaptureText("This should fail parsing.")
    #expect(pipeline.phase == .offlinePending)
    #expect(pipeline.pendingCaptures.count == 1)
    #expect(pipeline.pendingCaptures.first?.reason == "parse_failed")
}

@Test("Capture pipeline queues pending capture on transcription timeout")
@MainActor
func capturePipelineTranscriptionTimeout() async throws {
    let suiteName = "capture.pipeline.timeout"
    let defaults = UserDefaults(suiteName: suiteName)!
    defaults.removePersistentDomain(forName: suiteName)
    let pendingStore = CapturePendingStore(defaults: defaults, storageKey: "capture.pipeline.timeout.queue")

    let parserService = CaptureParserService(engine: .swift)
    let recordingCoordinator = RecordingCoordinator(liveActivityManager: LiveActivityManager())
    let transcriber = TestTranscriber { _ in
        try await Swift.Task.sleep(nanoseconds: 50_000_000)
        return "Delayed transcript"
    }

    let pipeline = CapturePipelineService(
        parserService: parserService,
        recordingCoordinator: recordingCoordinator,
        pendingStore: pendingStore,
        transcriber: transcriber,
        isOnline: { true },
        transcribeTimeoutSeconds: 0.001
    )

    await pipeline.submitCaptureText("Delay me")
    #expect(pipeline.phase == .offlinePending)
    #expect(pipeline.pendingCaptures.first?.reason == "timeout")
}

@Test("Offline pending capture recovers when back online")
@MainActor
func offlinePendingRecovery() async throws {
    let suiteName = "capture.pending.tests"
    let defaults = UserDefaults(suiteName: suiteName)!
    defaults.removePersistentDomain(forName: suiteName)
    let pendingStore = CapturePendingStore(defaults: defaults, storageKey: "capture.pending.tests.queue")

    let parserService = CaptureParserService(engine: .swift)
    let recordingCoordinator = RecordingCoordinator(liveActivityManager: LiveActivityManager())
    var isOnline = false
    let pipeline = CapturePipelineService(
        parserService: parserService,
        recordingCoordinator: recordingCoordinator,
        pendingStore: pendingStore,
        isOnline: { isOnline }
    )

    await pipeline.submitCaptureText("Follow up with #mood(6)")
    #expect(pipeline.phase == .offlinePending)
    #expect(pipeline.pendingCaptures.count == 1)

    isOnline = true
    await pipeline.recoverPendingCaptures()
    #expect(pipeline.phase == .review)
    #expect(pipeline.pendingCaptures.isEmpty)
}
