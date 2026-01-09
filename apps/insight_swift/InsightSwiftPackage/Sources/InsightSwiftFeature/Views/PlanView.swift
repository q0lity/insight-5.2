import SwiftUI

struct PlanView: View {
    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme
    @State private var showFocus = false
    @State private var selectedDate = Date()

    var body: some View {
        @Bindable var appStore = appStore
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: "Plan", subtitle: "Outline the day and launch focus blocks")

                InsightCard {
                    DatePicker("Day", selection: $selectedDate, displayedComponents: .date)
                        .datePickerStyle(.graphical)
                        .tint(theme.palette.tint)
                }

                InsightCard {
                    VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                        Text("Agenda")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)

                        if allDayItems.isEmpty && timelineItems.isEmpty {
                            Text("No scheduled items for this day")
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
                                ScheduleItemActionRow(item: item) {
                                    appStore.startFocusSession(title: item.title)
                                    showFocus = true
                                }
                            }
                        }
                    }
                }

                InsightCard {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Outline")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)
                        TextEditor(text: $appStore.planOutline)
                            .frame(minHeight: 180)
                            .padding(8)
                            .background(theme.palette.surfaceAlt)
                            .clipShape(RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous))
                    }
                }

                InsightCard {
                    VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                        Text("Outline tasks")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)

                        ForEach(planRows, id: \.id) { row in
                            if row.isSection {
                                Text(row.title)
                                    .font(AppFont.title(theme.metrics.bodyText))
                                    .foregroundStyle(theme.palette.text)
                                    .padding(.top, 6)
                            } else {
                                InsightRow {
                                    Text(row.title)
                                        .font(AppFont.body(theme.metrics.bodyText))
                                        .foregroundStyle(theme.palette.text)
                                } trailing: {
                                    Button("Focus") {
                                        appStore.startFocusSession(title: row.title)
                                        showFocus = true
                                    }
                                    .buttonStyle(.bordered)
                                    .tint(theme.palette.tint)
                                }
                            }
                        }
                    }
                }

                InsightCard {
                    VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                        Text("Unscheduled tasks")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)

                        if unscheduledTasks.isEmpty {
                            Text("No unscheduled tasks")
                                .font(AppFont.body(theme.metrics.bodyText))
                                .foregroundStyle(theme.palette.textSecondary)
                        }

                        ForEach(unscheduledTasks, id: \.id) { task in
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
                                Text(task.status.rawValue.replacingOccurrences(of: "_", with: " "))
                                    .font(AppFont.body(theme.metrics.smallText))
                                    .foregroundStyle(theme.palette.textSecondary)
                            }
                        }
                    }
                }
            }
            .padding(theme.metrics.spacing)
        }
        .background(theme.palette.background)
        .navigationTitle("Plan")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
        .navigationDestination(isPresented: $showFocus) {
            FocusView()
        }
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

    private var unscheduledTasks: [TodoTask] {
        let tasks = appStore.tasks.filter { $0.scheduledAt == nil }
        return CalendarSupport.sortedTasks(tasks)
    }

    private var planRows: [PlanRow] {
        parseOutline(appStore.planOutline)
    }

    private func parseOutline(_ text: String) -> [PlanRow] {
        var rows: [PlanRow] = []
        var idx = 0
        for line in text.split(separator: "\n") {
            let raw = String(line).trimmingCharacters(in: .whitespaces)
            if raw.isEmpty { continue }
            if raw.hasPrefix("#") || raw.hasSuffix(":") {
                let title = raw.replacingOccurrences(of: "#", with: "").replacingOccurrences(of: ":", with: "").trimmingCharacters(in: .whitespaces)
                rows.append(PlanRow(id: "s\(idx)", title: title, isSection: true))
                idx += 1
                continue
            }
            if raw.hasPrefix("-") || raw.hasPrefix("*") {
                let cleaned = raw
                    .replacingOccurrences(of: "- [ ]", with: "")
                    .replacingOccurrences(of: "- [x]", with: "")
                    .replacingOccurrences(of: "* [ ]", with: "")
                    .replacingOccurrences(of: "* [x]", with: "")
                    .replacingOccurrences(of: "- ", with: "")
                    .replacingOccurrences(of: "* ", with: "")
                    .trimmingCharacters(in: .whitespaces)
                if !cleaned.isEmpty {
                    rows.append(PlanRow(id: "t\(idx)", title: cleaned, isSection: false))
                    idx += 1
                }
            }
        }
        if rows.isEmpty {
            rows.append(PlanRow(id: "t0", title: "Add tasks to your outline", isSection: false))
        }
        return rows
    }
}

private struct ScheduleItemActionRow: View {
    let item: ScheduledItem
    let onFocus: () -> Void

    @Environment(ThemeStore.self) private var theme

    var body: some View {
        InsightRow {
            VStack(alignment: .leading, spacing: 4) {
                Text(item.title)
                    .font(AppFont.body(theme.metrics.bodyText))
                    .foregroundStyle(theme.palette.text)
                Text(timeLabel)
                    .font(AppFont.body(theme.metrics.smallText))
                    .foregroundStyle(theme.palette.textSecondary)
            }
        } trailing: {
            Button("Focus") {
                onFocus()
            }
            .buttonStyle(.bordered)
            .tint(theme.palette.tint)
        }
    }

    private var timeLabel: String {
        let start = item.startAt.formatted(date: .omitted, time: .shortened)
        let end = item.endAt.formatted(date: .omitted, time: .shortened)
        return "\(start) - \(end)"
    }
}

private struct PlanRow: Identifiable {
    let id: String
    let title: String
    let isSection: Bool
}
