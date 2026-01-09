import SwiftUI

struct NotesView: View {
    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme
    @Environment(SupabaseSyncService.self) private var syncService
    @State private var noteTitle = ""
    @State private var noteBody = ""
    @FocusState private var noteTitleFocused: Bool

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: "Notes", subtitle: "Inbox + reflections")

                InsightCard {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("New note")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)
                        TextField("Title", text: $noteTitle)
                            .textFieldStyle(.roundedBorder)
                            .focused($noteTitleFocused)
                        TextField("Body", text: $noteBody, axis: .vertical)
                            .lineLimit(3...6)
                            .textFieldStyle(.roundedBorder)
                        Button("Save") {
                            let trimmedTitle = noteTitle.trimmingCharacters(in: .whitespacesAndNewlines)
                            let trimmedBody = noteBody.trimmingCharacters(in: .whitespacesAndNewlines)
                            guard !trimmedTitle.isEmpty else { return }
                            if syncService.isEnabled {
                                syncService.createEntry(title: trimmedTitle, facets: [.note], notes: trimmedBody)
                            } else {
                                appStore.addNote(title: trimmedTitle, body: trimmedBody)
                            }
                            noteTitle = ""
                            noteBody = ""
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(theme.palette.tint)
                    }
                }

                InsightCard {
                    HStack(spacing: theme.metrics.spacingSmall) {
                        MetricTile(title: "Notes", value: "\(appStore.notes.count)", accent: theme.palette.tint)
                        MetricTile(title: "Recent", value: "\(recentNotes.count)", accent: theme.palette.warning)
                    }
                }

                InsightCard {
                    VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                        Text("Notes")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)

                        ForEach(recentNotes, id: \.id) { note in
                            NavigationLink {
                                NoteDetailView(noteId: note.id)
                            } label: {
                                InsightRow {
                                    VStack(alignment: .leading, spacing: 6) {
                                        Text(note.title)
                                            .font(AppFont.body(theme.metrics.bodyText))
                                            .foregroundStyle(theme.palette.text)
                                        Text(note.body)
                                            .font(AppFont.body(theme.metrics.smallText))
                                            .foregroundStyle(theme.palette.textSecondary)
                                            .lineLimit(2)
                                    }
                                } trailing: {
                                    Image(systemName: "chevron.right")
                                        .foregroundStyle(theme.palette.textSecondary)
                                }
                            }
                            .buttonStyle(.plain)
                        }

                        if recentNotes.isEmpty {
                            Text("No notes yet. Capture your first note.")
                                .font(AppFont.body(theme.metrics.bodyText))
                                .foregroundStyle(theme.palette.textSecondary)
                            Button("Add Note") {
                                noteTitleFocused = true
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(theme.palette.tint)
                        }
                    }
                }
            }
            .padding(theme.metrics.spacing)
        }
        .background(theme.palette.background)
        .navigationTitle("Notes")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
    }

    private var recentNotes: [Note] {
        appStore.notes.sorted { $0.createdAt > $1.createdAt }
    }
}
