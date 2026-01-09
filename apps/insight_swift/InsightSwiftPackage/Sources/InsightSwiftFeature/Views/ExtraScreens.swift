import SwiftUI

struct AgendaView: View {
    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme
    @State private var selectedDate = Date()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: "Agenda", subtitle: "Day plan + tasks")

                InsightCard {
                    DatePicker("Day", selection: $selectedDate, displayedComponents: .date)
                        .datePickerStyle(.graphical)
                        .tint(theme.palette.tint)
                }

                InsightCard {
                    VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                        Text("Schedule")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)

                        if allDayItems.isEmpty && timelineItems.isEmpty {
                            Text("No scheduled items.")
                                .font(AppFont.body(theme.metrics.bodyText))
                                .foregroundStyle(theme.palette.textSecondary)
                        }

                        if !allDayItems.isEmpty {
                            Text("All day")
                                .font(AppFont.body(theme.metrics.smallText))
                                .foregroundStyle(theme.palette.textSecondary)
                            ForEach(allDayItems, id: \.id) { item in
                                ScheduleItemRow(item: item, showKind: true)
                            }
                        }

                        if !timelineItems.isEmpty {
                            Text("Timeline")
                                .font(AppFont.body(theme.metrics.smallText))
                                .foregroundStyle(theme.palette.textSecondary)
                            ForEach(timelineItems, id: \.id) { item in
                                ScheduleItemRow(item: item, showKind: true)
                            }
                        }
                    }
                }
            }
            .padding(theme.metrics.spacing)
        }
        .background(theme.palette.background)
        .navigationTitle("Agenda")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
    }

    private var scheduleItems: [ScheduledItem] {
        ScheduleService.items(for: selectedDate, entries: appStore.entries, tasks: appStore.tasks, habits: appStore.habits)
    }

    private var allDayItems: [ScheduledItem] {
        scheduleItems.filter { $0.allDay }
    }

    private var timelineItems: [ScheduledItem] {
        scheduleItems.filter { !$0.allDay }
    }
}

struct KanbanView: View {
    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme

    var body: some View {
        ScrollView(.horizontal) {
            HStack(alignment: .top, spacing: theme.metrics.spacingSmall) {
                KanbanColumn(title: "Todo", tasks: tasks(for: .todo))
                KanbanColumn(title: "In Progress", tasks: tasks(for: .inProgress))
                KanbanColumn(title: "Done", tasks: tasks(for: .done))
            }
            .padding(theme.metrics.spacing)
        }
        .background(theme.palette.background)
        .navigationTitle("Kanban")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
    }

    private func tasks(for status: TaskStatus) -> [TodoTask] {
        appStore.tasks.filter { $0.status == status }
    }

    private struct KanbanColumn: View {
        let title: String
        let tasks: [TodoTask]
        @Environment(ThemeStore.self) private var theme

        var body: some View {
            VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                Text(title)
                    .font(AppFont.title(theme.metrics.sectionTitle))
                    .foregroundStyle(theme.palette.text)
                ForEach(tasks, id: \.id) { task in
                    InsightCard {
                        Text(task.title)
                            .font(AppFont.body(theme.metrics.bodyText))
                            .foregroundStyle(theme.palette.text)
                    }
                }
            }
            .frame(width: 260, alignment: .topLeading)
        }
    }
}

struct TickTickView: View {
    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: "TickTick", subtitle: "External task sync")

                InsightCard {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Status")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)
                        Text("Connect TickTick to sync tasks and reminders.")
                            .font(AppFont.body(theme.metrics.bodyText))
                            .foregroundStyle(theme.palette.textSecondary)
                        Button("Sync Tasks") {
                            // Placeholder for TickTick sync
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(theme.palette.tint)
                    }
                }

                InsightCard {
                    VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                        Text("Synced tasks")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)
                        ForEach(appStore.tasks, id: \.id) { task in
                            Text(task.title)
                                .font(AppFont.body(theme.metrics.bodyText))
                                .foregroundStyle(theme.palette.text)
                        }
                    }
                }
            }
            .padding(theme.metrics.spacing)
        }
        .background(theme.palette.background)
        .navigationTitle("TickTick")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
    }
}

struct VoiceView: View {
    @Environment(RecordingCoordinator.self) private var recordingCoordinator
    @Environment(ThemeStore.self) private var theme

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: "Voice", subtitle: "Hands-free capture")

                InsightCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(recordingCoordinator.isRecording ? "Recording..." : "Ready to capture")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)

                        if let startedAt = recordingCoordinator.startedAt {
                            Text(startedAt, style: .timer)
                                .font(AppFont.mono(theme.metrics.headerTitle))
                                .foregroundStyle(theme.palette.textSecondary)
                        }

                        Button {
                            if recordingCoordinator.isRecording {
                                recordingCoordinator.stopRecording()
                            } else {
                                recordingCoordinator.startRecording(reason: "Voice")
                            }
                        } label: {
                            Label(recordingCoordinator.isRecording ? "Stop" : "Start", systemImage: "waveform")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(recordingCoordinator.isRecording ? theme.palette.error : theme.palette.tint)
                    }
                }
            }
            .padding(theme.metrics.spacing)
        }
        .background(theme.palette.background)
        .navigationTitle("Voice")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
    }
}
