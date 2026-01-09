import SwiftUI

struct DashboardView: View {
    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: "Dashboard", subtitle: "Your day at a glance")

                HStack(spacing: theme.metrics.spacingSmall) {
                    MetricTile(title: "Entries", value: "\(appStore.entries.count)", accent: theme.palette.tint)
                    MetricTile(title: "Open Tasks", value: "\(appStore.tasks.filter { $0.status != .done }.count)", accent: theme.palette.success)
                }

                HStack(spacing: theme.metrics.spacingSmall) {
                    MetricTile(title: "Habits", value: "\(appStore.habits.count)", accent: theme.palette.warning)
                    MetricTile(title: "Trackers", value: "\(appStore.trackers.count)", accent: theme.palette.error)
                }

                InsightCard {
                    VStack(alignment: .leading, spacing: 12) {
                        InsightRow {
                            Text("Active Focus")
                                .font(AppFont.title(theme.metrics.sectionTitle))
                                .foregroundStyle(theme.palette.text)
                        } trailing: {
                            NavigationLink("Open") {
                                FocusView()
                            }
                            .font(AppFont.body(theme.metrics.smallText))
                            .foregroundStyle(theme.palette.tint)
                        }

                        if let active = appStore.activeFocusSession {
                            Text(active.title)
                                .font(AppFont.display(theme.metrics.sectionTitle + 4))
                                .foregroundStyle(theme.palette.text)
                            Text(active.startedAt, style: .timer)
                                .font(AppFont.mono(theme.metrics.bodyText))
                                .foregroundStyle(theme.palette.textSecondary)
                        } else {
                            Text("No session running")
                                .font(AppFont.body(theme.metrics.bodyText))
                                .foregroundStyle(theme.palette.textSecondary)
                            Button {
                                appStore.startFocusSession(title: "Deep work sprint")
                            } label: {
                                Label("Start a focus block", systemImage: "bolt.fill")
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(theme.palette.tint)
                        }
                    }
                }

                InsightCard {
                    VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                        Text("Upcoming")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)

                        ForEach(appStore.entries.prefix(3), id: \.id) { entry in
                            VStack(alignment: .leading, spacing: 4) {
                                Text(entry.title)
                                    .font(AppFont.body(theme.metrics.bodyText))
                                    .foregroundStyle(theme.palette.text)
                                if let start = entry.startAt {
                                    Text(start, style: .time)
                                        .font(AppFont.body(theme.metrics.smallText))
                                        .foregroundStyle(theme.palette.textSecondary)
                                }
                            }
                        }
                    }
                }

                InsightCard {
                    VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                        Text("Recent Notes")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)

                        ForEach(appStore.notes.prefix(3), id: \.id) { note in
                            VStack(alignment: .leading, spacing: 6) {
                                Text(note.title)
                                    .font(AppFont.body(theme.metrics.bodyText))
                                    .foregroundStyle(theme.palette.text)
                                Text(note.body)
                                    .font(AppFont.body(theme.metrics.smallText))
                                    .foregroundStyle(theme.palette.textSecondary)
                            }
                        }
                    }
                }
            }
            .padding(theme.metrics.spacing)
        }
        .background(
            LinearGradient(
                colors: [theme.palette.background, theme.palette.background.opacity(theme.isDark ? 0.9 : 0.96)],
                startPoint: .top,
                endPoint: .bottom
            )
        )
        .navigationTitle("Home")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
    }
}
