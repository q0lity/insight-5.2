import SwiftUI

struct WorkoutDetailView: View {
    let sessionId: UUID

    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme
    @Environment(SupabaseSyncService.self) private var syncService
    @Environment(\.dismiss) private var dismiss

    @State private var hasLoaded = false
    @State private var title = ""
    @State private var template: WorkoutTemplate = .cardio
    @State private var startAt = Date()
    @State private var endAt = Date()
    @State private var showDeleteConfirm = false
    @State private var showAddRow = false
    @State private var newExercise = ""
    @State private var newDurationMinutes = 30
    @State private var newDistance: Double = 0
    @State private var newCalories: Double = 0

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: headerTitle, subtitle: "Workout detail")

                if session == nil {
                    InsightCard {
                        Text("Workout not found")
                            .font(AppFont.body(theme.metrics.bodyText))
                            .foregroundStyle(theme.palette.textSecondary)
                    }
                } else {
                    // Details Card
                    InsightCard {
                        VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                            Text("Details")
                                .font(AppFont.title(theme.metrics.sectionTitle))
                                .foregroundStyle(theme.palette.text)

                            TextField("Workout title", text: $title)
                                .textFieldStyle(.roundedBorder)

                            Picker("Template", selection: $template) {
                                ForEach(WorkoutTemplate.allCases, id: \.self) { t in
                                    Text(t.rawValue.capitalized).tag(t)
                                }
                            }
                            .pickerStyle(.segmented)

                            DatePicker("Start", selection: $startAt, displayedComponents: [.date, .hourAndMinute])
                                .datePickerStyle(.compact)
                                .tint(theme.palette.tint)

                            DatePicker("End", selection: $endAt, displayedComponents: [.date, .hourAndMinute])
                                .datePickerStyle(.compact)
                                .tint(theme.palette.tint)

                            HStack {
                                Text("Duration")
                                    .font(AppFont.body(theme.metrics.bodyText))
                                    .foregroundStyle(theme.palette.textSecondary)
                                Spacer()
                                Text("\(durationMinutes) min")
                                    .font(AppFont.body(theme.metrics.bodyText))
                                    .foregroundStyle(theme.palette.text)
                            }
                        }
                    }

                    // Workout Rows Card
                    InsightCard {
                        VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                            HStack {
                                Text("Exercises")
                                    .font(AppFont.title(theme.metrics.sectionTitle))
                                    .foregroundStyle(theme.palette.text)
                                Spacer()
                                Button {
                                    showAddRow = true
                                } label: {
                                    Image(systemName: "plus.circle")
                                        .foregroundStyle(theme.palette.accent)
                                }
                            }

                            if rows.isEmpty {
                                Text("No exercises recorded")
                                    .font(AppFont.body(theme.metrics.smallText))
                                    .foregroundStyle(theme.palette.textSecondary)
                            } else {
                                ForEach(rows, id: \.id) { row in
                                    WorkoutRowCard(row: row)
                                }
                            }
                        }
                    }

                    // Source Info
                    if let entry = entry, entry.source == .import {
                        InsightCard {
                            HStack {
                                Image(systemName: "heart.fill")
                                    .foregroundStyle(.red)
                                Text("Imported from Apple Health")
                                    .font(AppFont.body(theme.metrics.smallText))
                                    .foregroundStyle(theme.palette.textSecondary)
                            }
                        }
                    }

                    // Action Buttons
                    InsightCard {
                        HStack(spacing: theme.metrics.spacingSmall) {
                            Button("Save") {
                                saveWorkout()
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
        .navigationTitle("Workout")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
        .confirmationDialog("Delete this workout?", isPresented: $showDeleteConfirm) {
            Button("Delete", role: .destructive) {
                deleteWorkout()
            }
        }
        .sheet(isPresented: $showAddRow) {
            AddRowSheet(
                exercise: $newExercise,
                durationMinutes: $newDurationMinutes,
                distance: $newDistance,
                calories: $newCalories,
                onSave: addRow,
                onCancel: { showAddRow = false }
            )
            .presentationDetents([.medium])
        }
        .onAppear {
            loadWorkoutIfNeeded()
        }
    }

    // MARK: - Computed Properties

    private var session: WorkoutSession? {
        appStore.workoutSessions.first { $0.id == sessionId }
    }

    private var entry: Entry? {
        guard let session else { return nil }
        return appStore.entry(for: session)
    }

    private var rows: [WorkoutRow] {
        guard let session else { return [] }
        return appStore.rows(for: session)
    }

    private var headerTitle: String {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? "Workout" : trimmed
    }

    private var durationMinutes: Int {
        Int(endAt.timeIntervalSince(startAt) / 60)
    }

    // MARK: - Actions

    private func loadWorkoutIfNeeded() {
        guard !hasLoaded, let session, let entry else { return }
        hasLoaded = true
        title = entry.title
        template = session.template
        startAt = entry.startAt ?? Date()
        endAt = entry.endAt ?? Date()
    }

    private func saveWorkout() {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        if syncService.isEnabled {
            syncService.updateWorkoutSession(
                id: sessionId,
                title: trimmed,
                template: template,
                startAt: startAt,
                endAt: endAt
            )
        } else {
            appStore.updateWorkoutSession(
                id: sessionId,
                title: trimmed,
                template: template,
                startAt: startAt,
                endAt: endAt
            )
        }
    }

    private func deleteWorkout() {
        if syncService.isEnabled {
            syncService.deleteWorkoutSession(id: sessionId)
        } else {
            appStore.deleteWorkoutSession(id: sessionId)
        }
        dismiss()
    }

    private func addRow() {
        let trimmed = newExercise.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        appStore.addWorkoutRow(
            sessionId: sessionId,
            exercise: trimmed,
            durationSeconds: newDurationMinutes * 60,
            distance: newDistance > 0 ? newDistance : nil,
            calories: newCalories > 0 ? newCalories : nil
        )

        // Reset form
        newExercise = ""
        newDurationMinutes = 30
        newDistance = 0
        newCalories = 0
        showAddRow = false
    }
}

// MARK: - Workout Row Card

private struct WorkoutRowCard: View {
    let row: WorkoutRow

    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme
    @State private var showDeleteConfirm = false

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(row.exercise)
                    .font(AppFont.body(theme.metrics.bodyText))
                    .foregroundStyle(theme.palette.text)

                HStack(spacing: 12) {
                    if let duration = row.durationSeconds {
                        Label("\(duration / 60)m", systemImage: "clock")
                            .font(AppFont.body(theme.metrics.smallText))
                            .foregroundStyle(theme.palette.textSecondary)
                    }
                    if let distance = row.distance {
                        Label(String(format: "%.1f %@", distance, row.distanceUnit ?? "km"), systemImage: "figure.run")
                            .font(AppFont.body(theme.metrics.smallText))
                            .foregroundStyle(theme.palette.textSecondary)
                    }
                    if let calories = row.calories {
                        Label("\(Int(calories)) cal", systemImage: "flame")
                            .font(AppFont.body(theme.metrics.smallText))
                            .foregroundStyle(theme.palette.textSecondary)
                    }
                }
            }

            Spacer()

            Button {
                showDeleteConfirm = true
            } label: {
                Image(systemName: "trash")
                    .foregroundStyle(theme.palette.error)
            }
        }
        .padding(.vertical, 8)
        .confirmationDialog("Delete this exercise?", isPresented: $showDeleteConfirm) {
            Button("Delete", role: .destructive) {
                appStore.deleteWorkoutRow(id: row.id)
            }
        }
    }
}

// MARK: - Add Row Sheet

private struct AddRowSheet: View {
    @Binding var exercise: String
    @Binding var durationMinutes: Int
    @Binding var distance: Double
    @Binding var calories: Double

    let onSave: () -> Void
    let onCancel: () -> Void

    @Environment(ThemeStore.self) private var theme

    var body: some View {
        NavigationStack {
            Form {
                Section("Exercise") {
                    TextField("Exercise name", text: $exercise)
                }

                Section("Metrics") {
                    Stepper("Duration: \(durationMinutes) min", value: $durationMinutes, in: 1...480, step: 5)

                    HStack {
                        Text("Distance (km)")
                        Spacer()
                        TextField("0", value: $distance, format: .number)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 80)
                    }

                    HStack {
                        Text("Calories")
                        Spacer()
                        TextField("0", value: $calories, format: .number)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 80)
                    }
                }
            }
            .navigationTitle("Add Exercise")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: onCancel)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add", action: onSave)
                        .disabled(exercise.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }
}
