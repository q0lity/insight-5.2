import SwiftUI

struct TasksView: View {
    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme
    @Environment(SupabaseSyncService.self) private var syncService
    @State private var newTaskTitle = ""
    @State private var statusFilter: TaskStatus? = nil
    @FocusState private var newTaskFieldFocused: Bool

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: "Tasks", subtitle: "Plan the next moves")

                InsightCard {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("New task")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)
                        HStack {
                            TextField("Add a task", text: $newTaskTitle)
                                .textFieldStyle(.roundedBorder)
                                .focused($newTaskFieldFocused)
                            Button("Add") {
                                let trimmed = newTaskTitle.trimmingCharacters(in: .whitespacesAndNewlines)
                                guard !trimmed.isEmpty else { return }
                                if syncService.isEnabled {
                                    syncService.createTask(title: trimmed)
                                } else {
                                    appStore.addTask(title: trimmed)
                                }
                                newTaskTitle = ""
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(theme.palette.tint)
                        }
                    }
                }

                InsightCard {
                    HStack(spacing: theme.metrics.spacingSmall) {
                        MetricTile(title: "Today", value: "\(todayTasks.count)", accent: theme.palette.tint)
                        MetricTile(title: "Upcoming", value: "\(upcomingTasks.count)", accent: theme.palette.warning)
                        MetricTile(title: "Backlog", value: "\(backlogTasks.count)", accent: theme.palette.textSecondary)
                    }
                }

                InsightCard {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Filter")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)
                        Picker("Status", selection: $statusFilter) {
                            Text("All").tag(TaskStatus?.none)
                            Text("Todo").tag(TaskStatus?.some(.todo))
                            Text("In Progress").tag(TaskStatus?.some(.inProgress))
                            Text("Done").tag(TaskStatus?.some(.done))
                        }
                        .pickerStyle(.segmented)
                    }
                }

                InsightCard {
                    VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                        Text("Tasks")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)

                        if filteredTasks.isEmpty {
                            Text("No tasks yet. Add your first task.")
                                .font(AppFont.body(theme.metrics.bodyText))
                                .foregroundStyle(theme.palette.textSecondary)
                            Button("Add Task") {
                                newTaskFieldFocused = true
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(theme.palette.tint)
                        } else {
                            ForEach(filteredTasks, id: \.id) { task in
                                NavigationLink {
                                    TaskDetailView(taskId: task.id)
                                } label: {
                                    InsightRow {
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text(task.title)
                                                .font(AppFont.body(theme.metrics.bodyText))
                                                .foregroundStyle(theme.palette.text)
                                            if let due = task.dueAt {
                                                Text("Due \(due.formatted(date: .abbreviated, time: .shortened))")
                                                    .font(AppFont.body(theme.metrics.smallText))
                                                    .foregroundStyle(theme.palette.textSecondary)
                                            }
                                        }
                                    } trailing: {
                                        Button(statusLabel(task)) {
                                            if syncService.isEnabled {
                                                syncService.toggleTask(task)
                                            } else {
                                                appStore.toggleTask(task)
                                            }
                                        }
                                        .buttonStyle(.bordered)
                                        .tint(theme.palette.tint)
                                    }
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
            }
            .padding(theme.metrics.spacing)
        }
        .background(theme.palette.background)
        .navigationTitle("Tasks")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
    }

    private var filteredTasks: [TodoTask] {
        let baseTasks = statusFilter == nil ? appStore.tasks : appStore.tasks.filter { $0.status == statusFilter }
        return CalendarSupport.sortedTasks(baseTasks)
    }

    private var todayTasks: [TodoTask] {
        let today = Date()
        return appStore.tasks.filter { task in
            guard let due = task.dueAt else { return false }
            return Calendar.current.isDate(due, inSameDayAs: today)
        }
    }

    private var upcomingTasks: [TodoTask] {
        let today = Calendar.current.startOfDay(for: Date())
        return appStore.tasks.filter { task in
            guard let due = task.dueAt else { return false }
            return due > today && !Calendar.current.isDate(due, inSameDayAs: today)
        }
    }

    private var backlogTasks: [TodoTask] {
        appStore.tasks.filter { $0.dueAt == nil }
    }

    private func statusLabel(_ task: TodoTask) -> String {
        task.status.rawValue.replacingOccurrences(of: "_", with: " ")
    }
}
