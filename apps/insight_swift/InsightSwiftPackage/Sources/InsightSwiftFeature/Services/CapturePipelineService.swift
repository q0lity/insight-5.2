import Foundation
import Observation

@MainActor
@Observable
public final class CapturePipelineService {
    public enum Phase: String, Codable, CaseIterable {
        case idle
        case recording
        case transcribing
        case parsing
        case review
        case offlinePending
        case error

        public var displayName: String {
            switch self {
            case .idle:
                return "Idle"
            case .recording:
                return "Recording"
            case .transcribing:
                return "Transcribing"
            case .parsing:
                return "Parsing"
            case .review:
                return "Review"
            case .offlinePending:
                return "Offline Pending"
            case .error:
                return "Error"
            }
        }
    }

    public private(set) var phase: Phase = .idle {
        didSet { log("phase \(oldValue.rawValue) -> \(phase.rawValue)") }
    }
    public var rawText: String = ""
    public var reviewItems: [CaptureReviewItem] = []
    public private(set) var pendingCaptures: [PendingCapture] = []
    public private(set) var statusMessage: String? {
        didSet {
            guard statusMessage != oldValue else { return }
            log("status \(statusMessage ?? "nil")")
        }
    }

    private let parserService: CaptureParsing
    private let recordingCoordinator: RecordingCoordinator
    private let pendingStore: CapturePendingStore
    private let commitHandler: CaptureReviewCommitter
    private let transcriber: CaptureTranscribing?
    private let isOnline: () -> Bool
    private let audioPlaceholder = PendingCapture.audioPlaceholder
    private let transcribeTimeoutSeconds: TimeInterval
    private let parseTimeoutSeconds: TimeInterval

    public init(
        parserService: CaptureParsing,
        recordingCoordinator: RecordingCoordinator,
        pendingStore: CapturePendingStore = CapturePendingStore(),
        commitHandler: CaptureReviewCommitter = CaptureReviewCommitter(),
        transcriber: CaptureTranscribing? = nil,
        isOnline: @escaping () -> Bool,
        transcribeTimeoutSeconds: TimeInterval = 20,
        parseTimeoutSeconds: TimeInterval = 4
    ) {
        self.parserService = parserService
        self.recordingCoordinator = recordingCoordinator
        self.pendingStore = pendingStore
        self.commitHandler = commitHandler
        self.transcriber = transcriber
        self.isOnline = isOnline
        self.transcribeTimeoutSeconds = transcribeTimeoutSeconds
        self.parseTimeoutSeconds = parseTimeoutSeconds
        self.pendingCaptures = pendingStore.load()
        if !pendingCaptures.isEmpty {
            phase = .offlinePending
        }
    }

    public func startRecording() {
        phase = .recording
        statusMessage = "Recording"
        recordingCoordinator.startRecording(reason: "Capture")
    }

    public func stopRecording() {
        recordingCoordinator.stopRecording()
        phase = .transcribing
        statusMessage = "Transcribing audio..."
        Swift.Task { await handleRecordingCapture() }
    }

    public func submitCaptureText(_ text: String) async {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        rawText = trimmed
        phase = .transcribing
        statusMessage = "Transcribing..."
        await Swift.Task.yield()
        let captureId = UUID().uuidString
        guard isOnline() else {
            enqueuePending(trimmed, source: .text, reason: "offline", captureId: captureId, audioFilePath: nil)
            reviewItems = []
            phase = .offlinePending
            statusMessage = "Offline. Saved for later."
            return
        }
        do {
            let transcript = try await transcribeText(trimmed, captureId: captureId)
            rawText = transcript
            _ = await parseCaptureText(transcript, source: .text, captureId: captureId, audioFilePath: nil)
        } catch {
            let reason = captureFailureReason(for: error, fallback: "transcribe_failed")
            enqueuePending(trimmed, source: .text, reason: reason, captureId: captureId, audioFilePath: nil)
            reviewItems = []
            phase = .offlinePending
            statusMessage = reason == "timeout"
                ? "Transcription timed out. Saved for retry."
                : "Transcription failed. Saved for retry."
        }
    }

    public func parseCaptureText(_ text: String) async {
        _ = await parseCaptureText(text, source: .text, captureId: nil, audioFilePath: nil)
    }

    public func acceptAll() {
        reviewItems = reviewItems.map { item in
            var updated = item
            updated.decision = .accepted
            return updated
        }
    }

    public func rejectAll() {
        reviewItems = reviewItems.map { item in
            var updated = item
            updated.decision = .rejected
            return updated
        }
    }

    public func applyAcceptedItems(appStore: AppStore, syncService: SupabaseSyncService) {
        let accepted = reviewItems.filter { $0.decision == .accepted }
        guard !accepted.isEmpty else {
            statusMessage = "No accepted items"
            return
        }

        if syncService.isEnabled && !isOnline() {
            enqueuePending(rawText, source: .text, reason: "offline", captureId: UUID().uuidString, audioFilePath: nil)
            reviewItems = []
            phase = .offlinePending
            statusMessage = "Offline. Saved for review."
            return
        }

        commitHandler.commit(items: accepted, rawText: rawText, appStore: appStore, syncService: syncService)
        reviewItems = []
        phase = .idle
        statusMessage = "Capture applied"
    }

    public func clearReview() {
        reviewItems = []
        phase = .idle
    }

    public func refreshPending() {
        pendingCaptures = pendingStore.load()
    }

    public func recoverPendingCaptures() async {
        pendingCaptures = pendingStore.load()
        guard let next = pendingCaptures.first else {
            phase = .idle
            return
        }
        await retryPendingCapture(next)
    }

    public func retryPendingCapture(_ capture: PendingCapture) async {
        guard isOnline() else {
            phase = .offlinePending
            statusMessage = "Offline. Retry when connected."
            return
        }
        pendingStore.remove(capture)
        pendingCaptures = pendingStore.load()
        phase = .transcribing
        statusMessage = "Retrying..."
        do {
            let transcript = try await transcribePending(capture)
            rawText = transcript
            _ = await parseCaptureText(
                transcript,
                source: capture.source,
                captureId: capture.id.uuidString,
                audioFilePath: capture.audioFilePath
            )
        } catch {
            let reason = captureFailureReason(for: error, fallback: "transcribe_failed")
            enqueuePending(
                capture.rawText,
                source: capture.source,
                reason: reason,
                captureId: capture.id.uuidString,
                audioFilePath: capture.audioFilePath
            )
            reviewItems = []
            phase = .offlinePending
            statusMessage = reason == "timeout"
                ? "Retry timed out. Saved for later."
                : "Retry failed. Saved for later."
        }
    }

    public func removePendingCapture(_ capture: PendingCapture) {
        pendingStore.remove(capture)
        pendingCaptures = pendingStore.load()
        if pendingCaptures.isEmpty {
            phase = .idle
        }
    }

    private func handleRecordingCapture() async {
        let captureId = UUID().uuidString
        guard let audioURL = recordingCoordinator.consumeLastRecordingURL() ?? recordingCoordinator.lastRecordingURL else {
            phase = .idle
            statusMessage = "No recording found"
            return
        }
        guard isOnline() else {
            enqueuePending(
                audioPlaceholder,
                source: .recording,
                reason: "offline",
                captureId: captureId,
                audioFilePath: audioURL.path
            )
            reviewItems = []
            phase = .offlinePending
            statusMessage = "Offline. Saved for later."
            return
        }
        guard let transcriber else {
            enqueuePending(
                audioPlaceholder,
                source: .recording,
                reason: "transcriber_unavailable",
                captureId: captureId,
                audioFilePath: audioURL.path
            )
            reviewItems = []
            phase = .offlinePending
            statusMessage = "Transcription unavailable. Saved for retry."
            return
        }
        do {
            let result = try await transcriber.transcribe(captureId: captureId, source: .audio(audioURL))
            rawText = result.transcript
            _ = await parseCaptureText(
                result.transcript,
                source: .recording,
                captureId: captureId,
                audioFilePath: audioURL.path
            )
        } catch {
            let reason = captureFailureReason(for: error, fallback: "transcribe_failed")
            enqueuePending(
                audioPlaceholder,
                source: .recording,
                reason: reason,
                captureId: captureId,
                audioFilePath: audioURL.path
            )
            reviewItems = []
            phase = .offlinePending
            statusMessage = reason == "timeout"
                ? "Transcription timed out. Saved for retry."
                : "Transcription failed. Saved for retry."
        }
    }

    private func transcribeText(_ text: String, captureId: String) async throws -> String {
        guard let transcriber else { return text }
        let startedAt = Date()
        let result = try await transcriber.transcribe(captureId: captureId, source: .text(text))
        if Date().timeIntervalSince(startedAt) > transcribeTimeoutSeconds {
            throw CaptureTranscriptionError.timeout
        }
        return result.transcript
    }

    private func transcribePending(_ capture: PendingCapture) async throws -> String {
        if let audioFilePath = capture.audioFilePath {
            guard let transcriber else { throw CaptureTranscriptionError.transcriberUnavailable }
            let url = URL(fileURLWithPath: audioFilePath)
            let startedAt = Date()
            let result = try await transcriber.transcribe(captureId: capture.id.uuidString, source: .audio(url))
            if Date().timeIntervalSince(startedAt) > transcribeTimeoutSeconds {
                throw CaptureTranscriptionError.timeout
            }
            return result.transcript
        }
        guard let transcriber else { return capture.rawText }
        let startedAt = Date()
        let result = try await transcriber.transcribe(captureId: capture.id.uuidString, source: .text(capture.rawText))
        if Date().timeIntervalSince(startedAt) > transcribeTimeoutSeconds {
            throw CaptureTranscriptionError.timeout
        }
        return result.transcript
    }

    private func parseCaptureText(
        _ text: String,
        source: CapturePendingSource,
        captureId: String?,
        audioFilePath: String?
    ) async -> Bool {
        phase = .parsing
        statusMessage = "Parsing..."
        await Swift.Task.yield()

        let parsed: ParsedCapture?
        let parseStart = Date()
        parsed = parserService.parse(text)
        if Date().timeIntervalSince(parseStart) > parseTimeoutSeconds {
            enqueuePending(
                text,
                source: source,
                reason: "parse_timeout",
                captureId: captureId,
                audioFilePath: audioFilePath
            )
            reviewItems = []
            phase = .offlinePending
            statusMessage = "Parsing timed out. Saved for retry."
            return false
        }

        guard let parsed else {
            enqueuePending(
                text,
                source: source,
                reason: "parse_failed",
                captureId: captureId,
                audioFilePath: audioFilePath
            )
            reviewItems = []
            phase = .offlinePending
            statusMessage = "Parsing failed. Saved for retry."
            return false
        }

        reviewItems = buildReviewItems(from: parsed, rawText: text)
        phase = .review
        statusMessage = "Review ready"
        return true
    }

    private func enqueuePending(
        _ text: String,
        source: CapturePendingSource,
        reason: String,
        captureId: String?,
        audioFilePath: String?
    ) {
        let resolvedId = captureId.flatMap(UUID.init(uuidString:)) ?? UUID()
        let capture = PendingCapture(
            id: resolvedId,
            rawText: text,
            source: source,
            reason: reason,
            audioFilePath: audioFilePath
        )
        pendingStore.enqueue(capture)
        pendingCaptures = pendingStore.load()
    }

    private func buildReviewItems(from parsed: ParsedCapture, rawText: String) -> [CaptureReviewItem] {
        var items: [CaptureReviewItem] = []

        if let active = parsed.activeEvent {
            items.append(
                CaptureReviewItem(
                    kind: .event,
                    title: active.title,
                    detail: formatCategory(active.category, active.subcategory),
                    category: active.category,
                    subcategory: active.subcategory,
                    tokens: parsed.tokens
                )
            )
        }

        for future in parsed.futureEvents {
            items.append(
                CaptureReviewItem(
                    kind: .futureEvent,
                    title: future.title,
                    detail: formatCategory(future.category, future.subcategory),
                    category: future.category,
                    subcategory: future.subcategory,
                    scheduledTime: future.scheduledTime,
                    tokens: parsed.tokens
                )
            )
        }

        for task in parsed.tasks {
            let taskTokens = MarkdownCaptureParser.toTokenCollections(
                MarkdownCaptureParser.extractInlineTokens(task.title)
            )
            items.append(
                CaptureReviewItem(
                    kind: .task,
                    title: task.title,
                    detail: task.completed ? "Completed" : "Open",
                    completed: task.completed,
                    tokens: taskTokens
                )
            )
        }

        for tracker in parsed.trackerLogs {
            items.append(
                CaptureReviewItem(
                    kind: .tracker,
                    title: tracker.key,
                    detail: "Tracker",
                    trackerValue: tracker.value,
                    tokens: MarkdownTokenCollections(
                        tags: [],
                        people: [],
                        contexts: [],
                        places: [],
                        trackers: [TrackerToken(key: tracker.key, value: tracker.value)]
                    )
                )
            )
        }

        if parsed.activeEvent == nil {
            let tokens = MarkdownCaptureParser.collectMarkdownTokens(rawText)
            items.append(
                CaptureReviewItem(
                    kind: .note,
                    title: rawText,
                    detail: "Note",
                    tokens: tokens
                )
            )
        }

        return items
    }

    private func formatCategory(_ category: String?, _ subcategory: String?) -> String? {
        guard let category else { return nil }
        if let subcategory {
            return "\(category)/\(subcategory)"
        }
        return category
    }

    private func captureFailureReason(for error: Error, fallback: String) -> String {
        if let transcribeError = error as? CaptureTranscriptionError {
            switch transcribeError {
            case .timeout:
                return "timeout"
            case .transcriberUnavailable:
                return "transcriber_unavailable"
            default:
                return fallback
            }
        }
        return fallback
    }

    private func log(_ message: String) {
        #if DEBUG
        debugPrint("[CapturePipeline] \(message)")
        #endif
    }
}
