import SwiftUI

struct HabitLogDetailView: View {
    let logId: UUID

    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme
    @Environment(SupabaseSyncService.self) private var syncService
    @Environment(\.dismiss) private var dismiss

    @State private var hasLoaded = false
    @State private var showDeleteConfirm = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: habitTitle, subtitle: "Habit log detail")

                if log == nil {
                    InsightCard {
                        Text("Habit log not found")
                            .font(AppFont.body(theme.metrics.bodyText))
                            .foregroundStyle(theme.palette.textSecondary)
                    }
                } else {
                    // Habit Info
                    if let habit = habitDefinition {
                        InsightCard {
                            VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                                Text("Habit")
                                    .font(AppFont.title(theme.metrics.sectionTitle))
                                    .foregroundStyle(theme.palette.text)

                                InsightRow {
                                    HStack(spacing: 8) {
                                        Circle()
                                            .fill(Color(hex: habit.colorHex))
                                            .frame(width: 12, height: 12)
                                        Text(habit.title)
                                            .font(AppFont.body(theme.metrics.bodyText))
                                            .foregroundStyle(theme.palette.text)
                                    }
                                } trailing: {
                                    EmptyView()
                                }

                                if let target = habit.targetPerWeek {
                                    InsightRow {
                                        Text("Target per week")
                                            .font(AppFont.body(theme.metrics.bodyText))
                                            .foregroundStyle(theme.palette.text)
                                    } trailing: {
                                        Text("\(target)x")
                                            .font(AppFont.body(theme.metrics.smallText))
                                            .foregroundStyle(theme.palette.textSecondary)
                                    }
                                }
                            }
                        }
                    }

                    // Stats from Habit Definition
                    if let habit = habitDefinition {
                        InsightCard {
                            VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                                Text("Stats")
                                    .font(AppFont.title(theme.metrics.sectionTitle))
                                    .foregroundStyle(theme.palette.text)

                                InsightRow {
                                    Text("Importance")
                                        .font(AppFont.body(theme.metrics.bodyText))
                                        .foregroundStyle(theme.palette.text)
                                } trailing: {
                                    HStack(spacing: 4) {
                                        ForEach(0..<10, id: \.self) { i in
                                            Circle()
                                                .fill(i < habit.importance ? theme.palette.warning : theme.palette.surfaceAlt)
                                                .frame(width: 8, height: 8)
                                        }
                                    }
                                }

                                InsightRow {
                                    Text("Difficulty")
                                        .font(AppFont.body(theme.metrics.bodyText))
                                        .foregroundStyle(theme.palette.text)
                                } trailing: {
                                    HStack(spacing: 4) {
                                        ForEach(0..<10, id: \.self) { i in
                                            Circle()
                                                .fill(i < habit.difficulty ? theme.palette.error : theme.palette.surfaceAlt)
                                                .frame(width: 8, height: 8)
                                        }
                                    }
                                }

                                let points = calculatePoints(habit: habit)
                                InsightRow {
                                    Text("Points earned")
                                        .font(AppFont.body(theme.metrics.bodyText))
                                        .foregroundStyle(theme.palette.text)
                                } trailing: {
                                    Text("+\(points)")
                                        .font(AppFont.title(theme.metrics.sectionTitle))
                                        .foregroundStyle(theme.palette.success)
                                }
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
                                    Text("Logged on")
                                        .font(AppFont.body(theme.metrics.bodyText))
                                        .foregroundStyle(theme.palette.text)
                                } trailing: {
                                    Text(l.date.formatted(date: .abbreviated, time: .shortened))
                                        .font(AppFont.body(theme.metrics.smallText))
                                        .foregroundStyle(theme.palette.textSecondary)
                                }

                                InsightRow {
                                    Text("Relative")
                                        .font(AppFont.body(theme.metrics.bodyText))
                                        .foregroundStyle(theme.palette.text)
                                } trailing: {
                                    Text(l.date, style: .relative)
                                        .font(AppFont.body(theme.metrics.smallText))
                                        .foregroundStyle(theme.palette.textSecondary)
                                }
                            }
                        }
                    }

                    // Weekly Progress
                    InsightCard {
                        VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                            Text("This Week")
                                .font(AppFont.title(theme.metrics.sectionTitle))
                                .foregroundStyle(theme.palette.text)

                            let logsThisWeek = weeklyLogs
                            let target = habitDefinition?.targetPerWeek ?? 7

                            HStack(spacing: 8) {
                                ForEach(0..<7, id: \.self) { day in
                                    let isCompleted = day < logsThisWeek.count
                                    Circle()
                                        .fill(isCompleted ? theme.palette.success : theme.palette.surfaceAlt)
                                        .frame(width: 20, height: 20)
                                        .overlay {
                                            if isCompleted {
                                                Image(systemName: "checkmark")
                                                    .font(.system(size: 10, weight: .bold))
                                                    .foregroundStyle(.white)
                                            }
                                        }
                                }
                            }

                            Text("\(logsThisWeek.count)/\(target) this week")
                                .font(AppFont.body(theme.metrics.smallText))
                                .foregroundStyle(theme.palette.textSecondary)
                        }
                    }

                    // Actions
                    InsightCard {
                        Button("Delete Log") {
                            showDeleteConfirm = true
                        }
                        .buttonStyle(.bordered)
                        .tint(theme.palette.error)
                    }
                }
            }
            .padding(theme.metrics.spacing)
        }
        .background(theme.palette.background)
        .navigationTitle("Habit Log")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
        .confirmationDialog("Delete this log?", isPresented: $showDeleteConfirm) {
            Button("Delete", role: .destructive) {
                deleteLog()
            }
        }
    }

    private var log: HabitLog? {
        appStore.habitLogs.first(where: { $0.id == logId })
    }

    private var habitDefinition: HabitDefinition? {
        guard let habitId = log?.habitId else { return nil }
        return appStore.habits.first(where: { $0.id == habitId })
    }

    private var habitTitle: String {
        habitDefinition?.title ?? "Habit"
    }

    private var weeklyLogs: [HabitLog] {
        guard let habitId = log?.habitId else { return [] }
        let calendar = Calendar.current
        let startOfWeek = calendar.dateInterval(of: .weekOfYear, for: Date())?.start ?? Date()
        return appStore.habitLogs
            .filter { $0.habitId == habitId && $0.date >= startOfWeek }
            .sorted { $0.date < $1.date }
    }

    private func calculatePoints(habit: HabitDefinition) -> Int {
        habit.importance * habit.difficulty
    }

    private func deleteLog() {
        appStore.habitLogs.removeAll(where: { $0.id == logId })
        dismiss()
    }
}
