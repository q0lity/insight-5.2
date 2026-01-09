import SwiftUI

struct HabitsView: View {
    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme
    @State private var showingForm = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightRow {
                    InsightHeader(title: "Habits", subtitle: "Daily reps that compound")
                } trailing: {
                    Button {
                        showingForm = true
                    } label: {
                        Image(systemName: "plus")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundStyle(Color.white)
                            .frame(width: theme.metrics.buttonHeightSmall, height: theme.metrics.buttonHeightSmall)
                            .background(theme.palette.tint)
                            .clipShape(Circle())
                    }
                }

                InsightCard {
                    HStack(spacing: theme.metrics.spacingSmall) {
                        MetricTile(title: "Habits", value: "\(appStore.habits.count)", accent: theme.palette.tint)
                        MetricTile(title: "Logs", value: "\(appStore.habitLogs.count)", accent: theme.palette.success)
                    }
                }

                InsightCard {
                    VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                        Text("Today")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)
                        Text("\(todayLogs.count) logged")
                            .font(AppFont.body(theme.metrics.bodyText))
                            .foregroundStyle(theme.palette.textSecondary)

                        if upcomingHabits.isEmpty {
                            Text("No habits queued")
                                .font(AppFont.body(theme.metrics.smallText))
                                .foregroundStyle(theme.palette.textSecondary)
                        } else {
                            HStack(spacing: 8) {
                                ForEach(upcomingHabits.prefix(3), id: \.id) { habit in
                                    InsightChip(label: habit.title, color: theme.palette.tint)
                                }
                            }
                        }
                    }
                }

                InsightCard {
                    VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                        Text("Your habits")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)

                        if appStore.habits.isEmpty {
                            Text("No habits yet. Add your first habit.")
                                .font(AppFont.body(theme.metrics.bodyText))
                                .foregroundStyle(theme.palette.textSecondary)
                            Button("Add Habit") {
                                showingForm = true
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(theme.palette.tint)
                        } else {
                            ForEach(appStore.habits, id: \.id) { habit in
                                NavigationLink {
                                    HabitDetailView(habitId: habit.id)
                                } label: {
                                    HabitRow(habit: habit)
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
        .navigationTitle("Habits")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
        .sheet(isPresented: $showingForm) {
            NavigationStack {
                HabitFormView()
            }
        }
    }

    private var todayLogs: [HabitLog] {
        let today = Date()
        return appStore.habitLogs.filter { Calendar.current.isDate($0.date, inSameDayAs: today) }
    }

    private var upcomingHabits: [HabitDefinition] {
        let today = Date()
        let loggedHabits = Set(todayLogs.map(\.habitId))
        let remaining = appStore.habits.filter { !loggedHabits.contains($0.id) }
        if remaining.isEmpty {
            return appStore.habits
        }
        let weekday = Calendar.current.component(.weekday, from: today)
        if weekday == 1 || weekday == 7 {
            return remaining.shuffled()
        }
        return remaining
    }
}

private struct HabitRow: View {
    let habit: HabitDefinition
    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme
    @Environment(SupabaseSyncService.self) private var syncService

    var body: some View {
        InsightRow {
            VStack(alignment: .leading, spacing: 4) {
                Text(habit.title)
                    .font(AppFont.body(theme.metrics.bodyText))
                    .foregroundStyle(theme.palette.text)
                Text("Importance \(habit.importance) - Difficulty \(habit.difficulty)")
                    .font(AppFont.body(theme.metrics.smallText))
                    .foregroundStyle(theme.palette.textSecondary)
            }
        } trailing: {
            Button("Log") {
                if syncService.isEnabled {
                    syncService.logHabit(habit)
                } else {
                    appStore.logHabit(habit)
                }
            }
            .buttonStyle(.bordered)
            .tint(theme.palette.tint)
        }
    }
}
