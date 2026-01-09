import SwiftUI

struct FocusView: View {
    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme
    @State private var draftTitle = ""
    @State private var draftNotes = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: "Focus", subtitle: "Run a deep work session")

                if let active = appStore.activeFocusSession {
                    InsightCard {
                        VStack(alignment: .leading, spacing: 12) {
                            Text(active.title)
                                .font(AppFont.title(theme.metrics.headerTitle))
                                .foregroundStyle(theme.palette.text)

                            Text(active.startedAt, style: .timer)
                                .font(AppFont.mono(theme.metrics.headerTitle))
                                .foregroundStyle(theme.palette.textSecondary)

                            Button("Stop Session") {
                                appStore.stopFocusSession()
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(theme.palette.error)
                        }
                    }

                    InsightCard {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Session notes")
                                .font(AppFont.title(theme.metrics.sectionTitle))
                                .foregroundStyle(theme.palette.text)
                            TextEditor(text: $draftNotes)
                                .frame(minHeight: 140)
                                .padding(8)
                                .background(theme.palette.surfaceAlt)
                                .clipShape(RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous))
                                .onChange(of: draftNotes) { _, newValue in
                                    appStore.updateActiveFocusNotes(newValue)
                                }
                        }
                    }
                } else {
                    InsightCard {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("No active session")
                                .font(AppFont.title(theme.metrics.sectionTitle))
                                .foregroundStyle(theme.palette.text)
                            TextField("Focus title", text: $draftTitle)
                                .textFieldStyle(.roundedBorder)
                            Button("Start Session") {
                                let trimmed = draftTitle.trimmingCharacters(in: .whitespacesAndNewlines)
                                guard !trimmed.isEmpty else { return }
                                appStore.startFocusSession(title: trimmed)
                                draftTitle = ""
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
        .navigationTitle("Focus")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
        .onAppear {
            if let active = appStore.activeFocusSession {
                draftNotes = active.notes
            }
        }
    }
}
