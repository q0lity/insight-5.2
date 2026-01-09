# Insight Swift Agent C Report (2026-01-07)

Changes
- Aligned Swift/JS capture parsers with desktop schema behavior and deterministic timestamps (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Parsing/MarkdownCaptureParser.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Resources/schema.js`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Parsing/JavaScriptCaptureParser.swift`).
- Added capture pipeline state machine, review models, pending capture storage, and commit handling (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/CapturePipelineService.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Models/CaptureReviewModels.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/CapturePendingStore.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/CaptureReviewCommitter.swift`).
- Built review cards UI with swipe accept/reject + inline edits, wired CaptureView to the new pipeline, and exposed offline pending recovery controls (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/CaptureReviewView.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/CaptureView.swift`, `apps/insight_swift/InsightSwift/InsightSwiftApp.swift`).
- Added/expanded tests for parser parity vectors, tracker string values, clamp bounds, and offline pending recovery (`apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/Fixtures/capture_vectors.json`, `apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/InsightSwiftFeatureTests.swift`).
- Made capture ingestion optionally skip note creation when no event is accepted (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Stores/AppStore.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/SupabaseSyncService.swift`).

Tests
- Not run (not requested).

Code Review Reflection
- Regressions to watch: review commit path uses appStore/sync create methods that do not attach tags/contexts/people to entries yet; risk of losing capture metadata on local-only entries.
- Concurrency risks: CapturePipelineService is main-actor isolated; ensure any future transcription/network steps use async/await and do not block the main actor.
- Data integrity risks: tracker string values are surfaced in review but ignored by tracker logs (numeric-only model); confirm intended behavior or add string-log support.
- Security/privacy: pending capture storage persists raw text in UserDefaults; consider encrypting or moving to SwiftData with app group protections if needed.
- Missing tests: no coverage for future-event date parsing failures or note creation when only tasks are accepted.

Open Questions
- Should we add real network reachability so offline pending reflects connectivity instead of being a stub?
- Do we want a note review card even when an active event is accepted, or should notes be merged into the event body?
- Should tracker string values be stored as notes or a new text-value tracker log type?

## Addendum (2026-01-07 20:46:02)

Changes
- Added edge-function transcription client + network reachability service, and wired capture replay on reconnect (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/CaptureTranscriptionService.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/NetworkMonitorService.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/ContentView.swift`, `apps/insight_swift/InsightSwift/InsightSwiftApp.swift`).
- Extended capture pending model to store audio file paths, and updated pipeline + UI to surface audio-backed pending captures (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Models/CaptureReviewModels.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/CapturePipelineService.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/RecordingCoordinator.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/CaptureView.swift`).
- Added capture pipeline tests for happy-path commit and parse failure, plus adjusted offline pending recovery (`apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/InsightSwiftFeatureTests.swift`).

Tests
- Not run (not requested).

Code Review Reflection
- Regressions to watch: edge transcription requires auth; unauthenticated captures will stay pending unless we add a fallback or UI hint.
- Concurrency risks: network monitor updates run via NWPathMonitor queue; ensure we do not call recover in tight loops when connectivity flaps.
- Data integrity risks: audio pending relies on local file paths; if recordings are cleaned up, replay will fail without a transcript fallback.
- Security/privacy: audio uploads should stay in the attachments bucket; confirm storage policies allow user-only reads and avoid logging sensitive transcript text.

Open Questions
- Should we switch to `transcribe_and_parse` once the edge function returns proposals, or keep `transcribe_only` to avoid server-side writes before review?
- Do we want to purge audio files after successful transcription to save storage?

## Addendum (2026-01-07 21:22:19)

Changes
- Added pending capture failure reasons + retry buttons, and improved timeout messaging for transcribe/parse (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Models/CaptureReviewModels.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/CaptureView.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/CapturePipelineService.swift`).
- Added debug-only logging for capture state transitions and new QA tests for happy path, parse failure, and transcription timeout (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/CapturePipelineService.swift`, `apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/InsightSwiftFeatureTests.swift`).

Tests
- `mcp__XcodeBuildMCP__swift_package_test` (failed: module-wide `Task` type name collision + macOS-only APIs; capture fixes compiled but suite did not complete).

Code Review Reflection
- Regressions to watch: timeout handling currently checks duration after completion, so long-running transcriptions still block until completion; consider future cancellation if needed.
- Concurrency risks: debug logging hooks use didSet observers; ensure no UI update loops.
- Data integrity risks: retry removes pending entry before requeueing; on repeated failures the order changes (moves to end).
