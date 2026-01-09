import SwiftUI

struct TrackerLogDetailView: View {
    let logId: UUID

    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme
    @Environment(SupabaseSyncService.self) private var syncService
    @Environment(\.dismiss) private var dismiss

    @State private var value: Double = 0
    @State private var hasLoaded = false
    @State private var showDeleteConfirm = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: trackerTitle, subtitle: "Tracker log detail")

                if log == nil {
                    InsightCard {
                        Text("Tracker log not found")
                            .font(AppFont.body(theme.metrics.bodyText))
                            .foregroundStyle(theme.palette.textSecondary)
                    }
                } else {
                    // Tracker Info
                    if let tracker = trackerDefinition {
                        InsightCard {
                            VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                                Text("Tracker")
                                    .font(AppFont.title(theme.metrics.sectionTitle))
                                    .foregroundStyle(theme.palette.text)

                                InsightRow {
                                    HStack(spacing: 8) {
                                        Circle()
                                            .fill(Color(hex: tracker.colorHex))
                                            .frame(width: 12, height: 12)
                                        Text(tracker.key.capitalized)
                                            .font(AppFont.body(theme.metrics.bodyText))
                                            .foregroundStyle(theme.palette.text)
                                    }
                                } trailing: {
                                    if let unit = tracker.unit {
                                        Text(unit)
                                            .font(AppFont.body(theme.metrics.smallText))
                                            .foregroundStyle(theme.palette.textSecondary)
                                    }
                                }
                            }
                        }
                    }

                    // Value
                    InsightCard {
                        VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                            Text("Value")
                                .font(AppFont.title(theme.metrics.sectionTitle))
                                .foregroundStyle(theme.palette.text)

                            HStack {
                                Text(String(format: "%.1f", value))
                                    .font(AppFont.display(theme.metrics.headerTitle))
                                    .foregroundStyle(theme.palette.tint)

                                if let unit = trackerDefinition?.unit {
                                    Text(unit)
                                        .font(AppFont.body(theme.metrics.bodyText))
                                        .foregroundStyle(theme.palette.textSecondary)
                                }
                            }

                            HStack(spacing: theme.metrics.spacingSmall) {
                                Button("-1") { value = max(0, value - 1) }
                                    .buttonStyle(.bordered)
                                    .tint(theme.palette.error)
                                Button("-0.1") { value = max(0, value - 0.1) }
                                    .buttonStyle(.bordered)
                                    .tint(theme.palette.error)
                                Button("+0.1") { value += 0.1 }
                                    .buttonStyle(.bordered)
                                    .tint(theme.palette.success)
                                Button("+1") { value += 1 }
                                    .buttonStyle(.bordered)
                                    .tint(theme.palette.success)
                            }
                        }
                    }

                    // Timestamp
                    if let l = log {
                        InsightCard {
                            VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                                Text("Timestamp")
                                    .font(AppFont.title(theme.metrics.sectionTitle))
                                    .foregroundStyle(theme.palette.text)

                                InsightRow {
                                    Text("Logged at")
                                        .font(AppFont.body(theme.metrics.bodyText))
                                        .foregroundStyle(theme.palette.text)
                                } trailing: {
                                    Text(l.createdAt.formatted(date: .abbreviated, time: .shortened))
                                        .font(AppFont.body(theme.metrics.smallText))
                                        .foregroundStyle(theme.palette.textSecondary)
                                }

                                InsightRow {
                                    Text("Relative")
                                        .font(AppFont.body(theme.metrics.bodyText))
                                        .foregroundStyle(theme.palette.text)
                                } trailing: {
                                    Text(l.createdAt, style: .relative)
                                        .font(AppFont.body(theme.metrics.smallText))
                                        .foregroundStyle(theme.palette.textSecondary)
                                }
                            }
                        }
                    }

                    // Actions
                    InsightCard {
                        HStack(spacing: theme.metrics.spacingSmall) {
                            Button("Save") {
                                saveLog()
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(theme.palette.tint)

                            Button("Delete") {
                                showDeleteConfirm = true
                            }
                            .buttonStyle(.bordered)
                            .tint(theme.palette.error)
                        }
                    }
                }
            }
            .padding(theme.metrics.spacing)
        }
        .background(theme.palette.background)
        .navigationTitle("Tracker Log")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
        .confirmationDialog("Delete this log?", isPresented: $showDeleteConfirm) {
            Button("Delete", role: .destructive) {
                deleteLog()
            }
        }
        .onAppear {
            loadLogIfNeeded()
        }
    }

    private var log: TrackerLog? {
        appStore.trackerLogs.first(where: { $0.id == logId })
    }

    private var trackerDefinition: TrackerDefinition? {
        guard let trackerId = log?.trackerId else { return nil }
        return appStore.trackers.first(where: { $0.id == trackerId })
    }

    private var trackerTitle: String {
        trackerDefinition?.key.capitalized ?? "Tracker"
    }

    private func loadLogIfNeeded() {
        guard !hasLoaded, let l = log else { return }
        hasLoaded = true
        value = l.value
    }

    private func saveLog() {
        guard var l = log else { return }
        l.value = value

        // Update in store
        if let idx = appStore.trackerLogs.firstIndex(where: { $0.id == logId }) {
            appStore.trackerLogs[idx] = l
        }
    }

    private func deleteLog() {
        appStore.trackerLogs.removeAll(where: { $0.id == logId })
        dismiss()
    }
}
