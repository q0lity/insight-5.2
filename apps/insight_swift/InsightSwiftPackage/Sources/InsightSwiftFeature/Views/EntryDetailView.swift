import SwiftUI

struct EntryDetailView: View {
    let entryId: UUID

    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme
    @Environment(SupabaseSyncService.self) private var syncService
    @Environment(\.dismiss) private var dismiss

    @State private var title = ""
    @State private var status: EntryStatus = .draft
    @State private var priority: EntryPriority = .medium
    @State private var bodyMarkdown = ""
    @State private var notes = ""
    @State private var importance: Int = 5
    @State private var difficulty: Int = 5
    @State private var durationMinutes: Int = 30
    @State private var xp: Double = 0
    @State private var hasLoaded = false
    @State private var showDeleteConfirm = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: headerTitle, subtitle: "Entry detail")

                if entry == nil {
                    InsightCard {
                        Text("Entry not found")
                            .font(AppFont.body(theme.metrics.bodyText))
                            .foregroundStyle(theme.palette.textSecondary)
                    }
                } else {
                    // Basic Info
                    InsightCard {
                        VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                            Text("Details")
                                .font(AppFont.title(theme.metrics.sectionTitle))
                                .foregroundStyle(theme.palette.text)

                            TextField("Entry title", text: $title)
                                .textFieldStyle(.roundedBorder)

                            HStack {
                                Text("Status")
                                    .font(AppFont.body(theme.metrics.bodyText))
                                    .foregroundStyle(theme.palette.text)
                                Spacer()
                                Picker("Status", selection: $status) {
                                    ForEach(EntryStatus.allCases, id: \.self) { s in
                                        Text(s.rawValue.capitalized).tag(s)
                                    }
                                }
                                .pickerStyle(.menu)
                            }

                            HStack {
                                Text("Priority")
                                    .font(AppFont.body(theme.metrics.bodyText))
                                    .foregroundStyle(theme.palette.text)
                                Spacer()
                                Picker("Priority", selection: $priority) {
                                    ForEach(EntryPriority.allCases, id: \.self) { p in
                                        Text(p.rawValue.capitalized).tag(p)
                                    }
                                }
                                .pickerStyle(.menu)
                            }
                        }
                    }

                    // Facets
                    if let e = entry, !e.facets.isEmpty {
                        InsightCard {
                            VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                                Text("Facets")
                                    .font(AppFont.title(theme.metrics.sectionTitle))
                                    .foregroundStyle(theme.palette.text)

                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 8) {
                                        ForEach(e.facets, id: \.self) { facet in
                                            InsightChip(label: facet.rawValue.capitalized, color: theme.palette.tint)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Timing
                    if let e = entry {
                        InsightCard {
                            VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                                Text("Timing")
                                    .font(AppFont.title(theme.metrics.sectionTitle))
                                    .foregroundStyle(theme.palette.text)

                                if let startAt = e.startAt {
                                    InsightRow {
                                        Text("Start")
                                            .font(AppFont.body(theme.metrics.bodyText))
                                            .foregroundStyle(theme.palette.text)
                                    } trailing: {
                                        Text(startAt.formatted(date: .abbreviated, time: .shortened))
                                            .font(AppFont.body(theme.metrics.smallText))
                                            .foregroundStyle(theme.palette.textSecondary)
                                    }
                                }

                                if let endAt = e.endAt {
                                    InsightRow {
                                        Text("End")
                                            .font(AppFont.body(theme.metrics.bodyText))
                                            .foregroundStyle(theme.palette.text)
                                    } trailing: {
                                        Text(endAt.formatted(date: .abbreviated, time: .shortened))
                                            .font(AppFont.body(theme.metrics.smallText))
                                            .foregroundStyle(theme.palette.textSecondary)
                                    }
                                }

                                if let scheduledAt = e.scheduledAt {
                                    InsightRow {
                                        Text("Scheduled")
                                            .font(AppFont.body(theme.metrics.bodyText))
                                            .foregroundStyle(theme.palette.text)
                                    } trailing: {
                                        Text(scheduledAt.formatted(date: .abbreviated, time: .shortened))
                                            .font(AppFont.body(theme.metrics.smallText))
                                            .foregroundStyle(theme.palette.textSecondary)
                                    }
                                }

                                if let dueAt = e.dueAt {
                                    InsightRow {
                                        Text("Due")
                                            .font(AppFont.body(theme.metrics.bodyText))
                                            .foregroundStyle(theme.palette.text)
                                    } trailing: {
                                        Text(dueAt.formatted(date: .abbreviated, time: .shortened))
                                            .font(AppFont.body(theme.metrics.smallText))
                                            .foregroundStyle(theme.palette.textSecondary)
                                    }
                                }

                                if let completedAt = e.completedAt {
                                    InsightRow {
                                        Text("Completed")
                                            .font(AppFont.body(theme.metrics.bodyText))
                                            .foregroundStyle(theme.palette.text)
                                    } trailing: {
                                        Text(completedAt.formatted(date: .abbreviated, time: .shortened))
                                            .font(AppFont.body(theme.metrics.smallText))
                                            .foregroundStyle(theme.palette.textSecondary)
                                    }
                                }

                                Stepper("Duration: \(durationMinutes) min", value: $durationMinutes, in: 5...480, step: 5)
                            }
                        }
                    }

                    // Gamification
                    InsightCard {
                        VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                            Text("Gamification")
                                .font(AppFont.title(theme.metrics.sectionTitle))
                                .foregroundStyle(theme.palette.text)

                            Stepper("Importance: \(importance)", value: $importance, in: 1...10)
                            Stepper("Difficulty: \(difficulty)", value: $difficulty, in: 1...10)

                            InsightRow {
                                Text("XP")
                                    .font(AppFont.body(theme.metrics.bodyText))
                                    .foregroundStyle(theme.palette.text)
                            } trailing: {
                                Text(String(format: "%.0f", xp))
                                    .font(AppFont.title(theme.metrics.sectionTitle))
                                    .foregroundStyle(theme.palette.success)
                            }

                            if let multiplier = entry?.goalMultiplier, multiplier > 0 {
                                InsightRow {
                                    Text("Goal Multiplier")
                                        .font(AppFont.body(theme.metrics.bodyText))
                                        .foregroundStyle(theme.palette.text)
                                } trailing: {
                                    Text(String(format: "%.1fx", multiplier))
                                        .font(AppFont.body(theme.metrics.smallText))
                                        .foregroundStyle(theme.palette.warning)
                                }
                            }
                        }
                    }

                    // Notes & Body
                    InsightCard {
                        VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                            Text("Notes")
                                .font(AppFont.title(theme.metrics.sectionTitle))
                                .foregroundStyle(theme.palette.text)

                            TextEditor(text: $notes)
                                .frame(minHeight: 120)
                                .padding(8)
                                .background(theme.palette.surfaceAlt)
                                .clipShape(RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous))
                        }
                    }

                    if !bodyMarkdown.isEmpty {
                        InsightCard {
                            VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                                Text("Body")
                                    .font(AppFont.title(theme.metrics.sectionTitle))
                                    .foregroundStyle(theme.palette.text)

                                Text(bodyMarkdown)
                                    .font(AppFont.body(theme.metrics.bodyText))
                                    .foregroundStyle(theme.palette.text)
                            }
                        }
                    }

                    // Metadata
                    if let e = entry {
                        InsightCard {
                            VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                                Text("Metadata")
                                    .font(AppFont.title(theme.metrics.sectionTitle))
                                    .foregroundStyle(theme.palette.text)

                                MetadataRow(title: "Tags", items: e.tags, accent: theme.palette.tint)
                                MetadataRow(title: "People", items: e.people, accent: theme.palette.success)
                                MetadataRow(title: "Contexts", items: e.contexts, accent: theme.palette.warning)

                                InsightRow {
                                    Text("Source")
                                        .font(AppFont.body(theme.metrics.bodyText))
                                        .foregroundStyle(theme.palette.text)
                                } trailing: {
                                    Text(e.source.rawValue)
                                        .font(AppFont.body(theme.metrics.smallText))
                                        .foregroundStyle(theme.palette.textSecondary)
                                }

                                InsightRow {
                                    Text("Created")
                                        .font(AppFont.body(theme.metrics.bodyText))
                                        .foregroundStyle(theme.palette.text)
                                } trailing: {
                                    Text(e.createdAt.formatted(date: .abbreviated, time: .shortened))
                                        .font(AppFont.body(theme.metrics.smallText))
                                        .foregroundStyle(theme.palette.textSecondary)
                                }

                                InsightRow {
                                    Text("Updated")
                                        .font(AppFont.body(theme.metrics.bodyText))
                                        .foregroundStyle(theme.palette.text)
                                } trailing: {
                                    Text(e.updatedAt.formatted(date: .abbreviated, time: .shortened))
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
                                saveEntry()
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(theme.palette.tint)
                            .disabled(title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

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
        .navigationTitle("Entry")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
        .confirmationDialog("Delete this entry?", isPresented: $showDeleteConfirm) {
            Button("Delete", role: .destructive) {
                deleteEntry()
            }
        }
        .onAppear {
            loadEntryIfNeeded()
        }
    }

    private var entry: Entry? {
        appStore.entries.first(where: { $0.id == entryId })
    }

    private var headerTitle: String {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? "Entry" : trimmed
    }

    private func loadEntryIfNeeded() {
        guard !hasLoaded, let e = entry else { return }
        hasLoaded = true
        title = e.title
        status = e.status ?? .draft
        priority = e.priority ?? .medium
        bodyMarkdown = e.bodyMarkdown
        notes = e.notes
        importance = e.importance ?? 5
        difficulty = e.difficulty ?? 5
        durationMinutes = e.durationMinutes ?? 30
        xp = e.xp ?? 0
    }

    private func saveEntry() {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        appStore.updateEntry(
            id: entryId,
            title: trimmed,
            status: status,
            priority: priority,
            notes: notes,
            importance: importance,
            difficulty: difficulty,
            durationMinutes: durationMinutes
        )
    }

    private func deleteEntry() {
        appStore.deleteEntry(id: entryId)
        dismiss()
    }
}

private struct MetadataRow: View {
    let title: String
    let items: [String]
    let accent: Color

    @Environment(ThemeStore.self) private var theme

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(AppFont.body(theme.metrics.smallText))
                .foregroundStyle(theme.palette.textSecondary)

            if items.isEmpty {
                Text("None")
                    .font(AppFont.body(theme.metrics.smallText))
                    .foregroundStyle(theme.palette.textSecondary)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(items, id: \.self) { item in
                            InsightChip(label: item, color: accent)
                        }
                    }
                }
            }
        }
    }
}
