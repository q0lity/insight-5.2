import SwiftUI

struct CaptureView: View {
    @Environment(RecordingCoordinator.self) private var recordingCoordinator
    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme
    @Environment(CaptureParserService.self) private var captureParserService
    @Environment(CapturePipelineService.self) private var capturePipeline
    @Environment(SupabaseSyncService.self) private var syncService
    @State private var captureText = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: "Capture", subtitle: "Voice, notes, tasks, and trackers")

                InsightCard {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("State: \(capturePipeline.phase.displayName)")
                            .font(AppFont.body(theme.metrics.smallText))
                            .foregroundStyle(theme.palette.textSecondary)
                        if let status = capturePipeline.statusMessage {
                            Text(status)
                                .font(AppFont.body(theme.metrics.smallText))
                                .foregroundStyle(theme.palette.textSecondary)
                        }
                    }
                }

                InsightCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(recordingCoordinator.isRecording ? "Recording in progress" : "Ready to record")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)

                        if let startedAt = recordingCoordinator.startedAt {
                            Text(startedAt, style: .timer)
                                .font(AppFont.mono(theme.metrics.headerTitle))
                                .foregroundStyle(theme.palette.textSecondary)
                        }

                        Button {
                            if recordingCoordinator.isRecording {
                                capturePipeline.stopRecording()
                            } else {
                                capturePipeline.startRecording()
                            }
                        } label: {
                            Label(
                                recordingCoordinator.isRecording ? "Stop Recording" : "Start Recording",
                                systemImage: recordingCoordinator.isRecording ? "stop.circle.fill" : "mic.circle.fill"
                            )
                            .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(theme.palette.tint)
                        .controlSize(.large)

                        if let status = recordingCoordinator.statusMessage {
                            Text(status)
                                .font(AppFont.body(theme.metrics.smallText))
                                .foregroundStyle(theme.palette.textSecondary)
                        }

                        if let lastURL = recordingCoordinator.lastRecordingURL {
                            Text("Saved to \(lastURL.lastPathComponent)")
                                .font(AppFont.body(theme.metrics.smallText))
                                .foregroundStyle(theme.palette.textSecondary)
                        }
                    }
                }

                InsightCard {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Quick entry")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)
                        TextField("Type a quick note or task", text: $captureText, axis: .vertical)
                            .lineLimit(2...4)
                            .textFieldStyle(.roundedBorder)
                        Button("Save entry") {
                            let trimmed = captureText.trimmingCharacters(in: .whitespacesAndNewlines)
                            guard !trimmed.isEmpty else { return }
                            Task { await capturePipeline.submitCaptureText(trimmed) }
                            captureText = ""
                        }
                        .buttonStyle(.bordered)
                        .tint(theme.palette.tint)

                        Text("Parser: \(captureParserService.engine.rawValue.capitalized)")
                            .font(AppFont.body(theme.metrics.smallText))
                            .foregroundStyle(theme.palette.textSecondary)
                    }
                }

                if capturePipeline.phase == .review {
                    CaptureReviewSection(
                        items: Binding(
                            get: { capturePipeline.reviewItems },
                            set: { capturePipeline.reviewItems = $0 }
                        ),
                        onAcceptAll: { capturePipeline.acceptAll() },
                        onRejectAll: { capturePipeline.rejectAll() },
                        onApply: { capturePipeline.applyAcceptedItems(appStore: appStore, syncService: syncService) }
                    )
                }

                if capturePipeline.phase == .offlinePending {
                    InsightCard {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Offline Pending")
                                .font(AppFont.title(theme.metrics.sectionTitle))
                                .foregroundStyle(theme.palette.text)
                            Text("Pending captures: \(capturePipeline.pendingCaptures.count)")
                                .font(AppFont.body(theme.metrics.smallText))
                                .foregroundStyle(theme.palette.textSecondary)
                            if let status = capturePipeline.statusMessage {
                                Text(status)
                                    .font(AppFont.body(theme.metrics.smallText))
                                    .foregroundStyle(theme.palette.warning)
                            }
                            Button("Retry Pending") {
                                Swift.Task { await capturePipeline.recoverPendingCaptures() }
                            }
                            .buttonStyle(.bordered)
                            .tint(theme.palette.warning)

                            ForEach(capturePipeline.pendingCaptures) { capture in
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(capture.displaySummary)
                                        .font(AppFont.body(theme.metrics.smallText))
                                        .foregroundStyle(theme.palette.textSecondary)
                                        .lineLimit(2)
                                    Text(capture.reasonDescription)
                                        .font(AppFont.body(theme.metrics.tinyText))
                                        .foregroundStyle(theme.palette.textSecondary)
                                    Button("Retry") {
                                        Swift.Task { await capturePipeline.retryPendingCapture(capture) }
                                    }
                                    .buttonStyle(.bordered)
                                    .tint(theme.palette.tint)
                                    Text(capture.createdAt, style: .time)
                                        .font(AppFont.body(theme.metrics.tinyText))
                                        .foregroundStyle(theme.palette.textSecondary)
                                }
                                .padding(.vertical, 4)
                            }
                        }
                    }
                }
            }
            .padding(theme.metrics.spacing)
        }
        .background(theme.palette.background)
    }
}
