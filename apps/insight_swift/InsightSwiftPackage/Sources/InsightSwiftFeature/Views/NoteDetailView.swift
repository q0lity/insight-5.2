import SwiftUI

struct NoteDetailView: View {
    let noteId: UUID

    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme
    @Environment(SupabaseSyncService.self) private var syncService
    @Environment(\.dismiss) private var dismiss

    @State private var title = ""
    @State private var bodyText = ""
    @State private var tagsText = ""
    @State private var peopleText = ""
    @State private var contextsText = ""
    @State private var hasLoaded = false
    @State private var showDeleteConfirm = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: headerTitle, subtitle: "Note detail")

                if note == nil {
                    InsightCard {
                        Text("Note not found")
                            .font(AppFont.body(theme.metrics.bodyText))
                            .foregroundStyle(theme.palette.textSecondary)
                    }
                } else {
                    InsightCard {
                        VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                            Text("Title")
                                .font(AppFont.title(theme.metrics.sectionTitle))
                                .foregroundStyle(theme.palette.text)
                            TextField("Note title", text: $title)
                                .textFieldStyle(.roundedBorder)
                        }
                    }

                    InsightCard {
                        VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                            Text("Body")
                                .font(AppFont.title(theme.metrics.sectionTitle))
                                .foregroundStyle(theme.palette.text)
                            TextEditor(text: $bodyText)
                                .frame(minHeight: 200)
                                .padding(8)
                                .background(theme.palette.surfaceAlt)
                                .clipShape(RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous))
                        }
                    }

                    InsightCard {
                        MetadataEditorSection(
                            createdAt: note?.createdAt,
                            tagsText: $tagsText,
                            peopleText: $peopleText,
                            contextsText: $contextsText
                        )
                    }

                    InsightCard {
                        RecurrenceSection(
                            summary: recurrenceSummary,
                            exceptionCount: entry?.recurrenceExceptions.count ?? 0
                        )
                    }

                    InsightCard {
                        HStack(spacing: theme.metrics.spacingSmall) {
                            Button("Save") {
                                saveNote()
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
        .navigationTitle("Note")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
        .confirmationDialog("Delete this note?", isPresented: $showDeleteConfirm) {
            Button("Delete", role: .destructive) {
                deleteNote()
            }
        }
        .onAppear {
            loadNoteIfNeeded()
        }
    }

    private var note: Note? {
        appStore.notes.first(where: { $0.id == noteId })
    }

    private var entry: Entry? {
        appStore.entries.first(where: { $0.id == noteId })
    }

    private var headerTitle: String {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? "Note" : trimmed
    }

    private func loadNoteIfNeeded() {
        guard !hasLoaded, let note else { return }
        hasLoaded = true
        title = note.title
        bodyText = note.body
        tagsText = formatList(entry?.tags ?? [])
        peopleText = formatList(entry?.people ?? [])
        contextsText = formatList(entry?.contexts ?? [])
    }

    private var recurrenceSummary: String {
        guard let rule = entry?.recurrenceRule else { return "None" }
        let unit: String
        switch rule.frequency {
        case .daily:
            unit = "day"
        case .weekly:
            unit = "week"
        case .monthly:
            unit = "month"
        }
        if rule.interval == 1 {
            return "Every \(unit)"
        }
        return "Every \(rule.interval) \(unit)s"
    }

    private func saveNote() {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        if syncService.isEnabled {
            syncService.updateNote(
                id: noteId,
                title: trimmed,
                body: bodyText,
                tags: parseList(tagsText),
                people: parseList(peopleText),
                contexts: parseList(contextsText)
            )
        } else {
            appStore.updateNote(
                id: noteId,
                title: trimmed,
                body: bodyText,
                tags: parseList(tagsText),
                people: parseList(peopleText),
                contexts: parseList(contextsText)
            )
        }
    }

    private func deleteNote() {
        if syncService.isEnabled {
            syncService.deleteNote(id: noteId)
        } else {
            appStore.deleteNote(id: noteId)
        }
        dismiss()
    }

    private func parseList(_ text: String) -> [String] {
        var results: [String] = []
        var seen = Set<String>()
        for part in text.split(separator: ",") {
            let trimmed = part.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty else { continue }
            let key = trimmed.lowercased()
            guard !seen.contains(key) else { continue }
            seen.insert(key)
            results.append(trimmed)
        }
        return results
    }

    private func formatList(_ items: [String]) -> String {
        items.joined(separator: ", ")
    }
}

private struct RecurrenceSection: View {
    let summary: String
    let exceptionCount: Int

    @Environment(ThemeStore.self) private var theme

    var body: some View {
        VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
            Text("Recurrence")
                .font(AppFont.title(theme.metrics.sectionTitle))
                .foregroundStyle(theme.palette.text)

            Text(summary)
                .font(AppFont.body(theme.metrics.bodyText))
                .foregroundStyle(theme.palette.text)

            if exceptionCount > 0 {
                Text("Exceptions: \(exceptionCount)")
                    .font(AppFont.body(theme.metrics.smallText))
                    .foregroundStyle(theme.palette.textSecondary)
            } else {
                Text("No exceptions")
                    .font(AppFont.body(theme.metrics.smallText))
                    .foregroundStyle(theme.palette.textSecondary)
            }
        }
    }
}

private struct MetadataEditorSection: View {
    let createdAt: Date?
    @Binding var tagsText: String
    @Binding var peopleText: String
    @Binding var contextsText: String

    @Environment(ThemeStore.self) private var theme

    var body: some View {
        VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
            Text("Metadata")
                .font(AppFont.title(theme.metrics.sectionTitle))
                .foregroundStyle(theme.palette.text)

            if let createdAt {
                Text("Created \(createdAt.formatted(date: .abbreviated, time: .shortened))")
                    .font(AppFont.body(theme.metrics.smallText))
                    .foregroundStyle(theme.palette.textSecondary)
            }

            TextField("Tags (comma-separated)", text: $tagsText)
                .textFieldStyle(.roundedBorder)
            TextField("People (comma-separated)", text: $peopleText)
                .textFieldStyle(.roundedBorder)
            TextField("Contexts (comma-separated)", text: $contextsText)
                .textFieldStyle(.roundedBorder)
        }
    }
}
