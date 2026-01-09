import SwiftUI

struct HabitFormView: View {
    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme
    @Environment(SupabaseSyncService.self) private var syncService
    @Environment(\.dismiss) private var dismiss

    @State private var title = ""
    @State private var importance = 6
    @State private var difficulty = 5
    @State private var targetPerWeek = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: "New Habit", subtitle: "Define the next rep")

                InsightCard {
                    VStack(alignment: .leading, spacing: 12) {
                        TextField("Habit title", text: $title)
                            .textFieldStyle(.roundedBorder)

                        Stepper("Importance: \(importance)", value: $importance, in: 1...10)
                        Stepper("Difficulty: \(difficulty)", value: $difficulty, in: 1...10)

                        TextField("Target per week", text: $targetPerWeek)
                            .keyboardType(.numberPad)
                            .textFieldStyle(.roundedBorder)
                    }
                }

                Button("Save Habit") {
                    let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
                    guard !trimmed.isEmpty else { return }
                    let target = Int(targetPerWeek)
                    if syncService.isEnabled {
                        syncService.createHabit(title: trimmed, importance: importance, difficulty: difficulty)
                    } else {
                        appStore.addHabit(title: trimmed, importance: importance, difficulty: difficulty, targetPerWeek: target)
                    }
                    dismiss()
                }
                .buttonStyle(.borderedProminent)
                .tint(theme.palette.tint)
            }
            .padding(theme.metrics.spacing)
        }
        .background(theme.palette.background)
        .navigationTitle("New Habit")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
    }
}
