import SwiftUI

struct NutritionDetailView: View {
    let logId: UUID

    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme
    @Environment(SupabaseSyncService.self) private var syncService
    @Environment(\.dismiss) private var dismiss

    @State private var hasLoaded = false
    @State private var title = ""
    @State private var date = Date()
    @State private var calories: Double = 0
    @State private var proteinG: Double = 0
    @State private var carbsG: Double = 0
    @State private var fatG: Double = 0
    @State private var confidence: Double = 0.5
    @State private var source: NutritionSource = .estimate
    @State private var showOnCalendar = true
    @State private var showDeleteConfirm = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: headerTitle, subtitle: "Meal detail")

                if log == nil {
                    InsightCard {
                        Text("Meal not found")
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

                            TextField("Meal title", text: $title)
                                .textFieldStyle(.roundedBorder)

                            DatePicker("Date & Time", selection: $date, displayedComponents: [.date, .hourAndMinute])
                                .datePickerStyle(.compact)
                                .tint(theme.palette.tint)

                            Toggle("Show on Calendar", isOn: $showOnCalendar)
                                .tint(theme.palette.accent)

                            HStack {
                                Text("Source")
                                    .font(AppFont.body(theme.metrics.bodyText))
                                    .foregroundStyle(theme.palette.textSecondary)
                                Spacer()
                                Picker("Source", selection: $source) {
                                    ForEach(NutritionSource.allCases, id: \.self) { s in
                                        Text(sourceLabel(s)).tag(s)
                                    }
                                }
                                .pickerStyle(.menu)
                            }
                        }
                    }

                    // Macros Card
                    InsightCard {
                        VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                            Text("Macros")
                                .font(AppFont.title(theme.metrics.sectionTitle))
                                .foregroundStyle(theme.palette.text)

                            MacroRow(label: "Calories", value: $calories, unit: "cal", color: .orange)
                            MacroRow(label: "Protein", value: $proteinG, unit: "g", color: .red)
                            MacroRow(label: "Carbs", value: $carbsG, unit: "g", color: .blue)
                            MacroRow(label: "Fat", value: $fatG, unit: "g", color: .yellow)

                            // Macro breakdown bar
                            if totalMacros > 0 {
                                MacroBar(protein: proteinG, carbs: carbsG, fat: fatG)
                            }
                        }
                    }

                    // Confidence Card
                    InsightCard {
                        VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                            Text("Confidence")
                                .font(AppFont.title(theme.metrics.sectionTitle))
                                .foregroundStyle(theme.palette.text)

                            VStack(alignment: .leading, spacing: 4) {
                                HStack {
                                    Text("Data confidence")
                                        .font(AppFont.body(theme.metrics.bodyText))
                                        .foregroundStyle(theme.palette.textSecondary)
                                    Spacer()
                                    Text("\(Int(confidence * 100))%")
                                        .font(AppFont.body(theme.metrics.bodyText))
                                        .foregroundStyle(theme.palette.text)
                                }

                                Slider(value: $confidence, in: 0...1, step: 0.05)
                                    .tint(confidenceColor)

                                Text(confidenceLabel)
                                    .font(AppFont.body(theme.metrics.smallText))
                                    .foregroundStyle(theme.palette.textSecondary)
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
                                saveNutrition()
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
        .navigationTitle("Nutrition")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
        .confirmationDialog("Delete this meal?", isPresented: $showDeleteConfirm) {
            Button("Delete", role: .destructive) {
                deleteNutrition()
            }
        }
        .onAppear {
            loadNutritionIfNeeded()
        }
    }

    // MARK: - Computed Properties

    private var log: NutritionLog? {
        appStore.nutritionLogs.first { $0.id == logId }
    }

    private var entry: Entry? {
        guard let log else { return nil }
        return appStore.entry(for: log)
    }

    private var headerTitle: String {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? "Meal" : trimmed
    }

    private var totalMacros: Double {
        proteinG + carbsG + fatG
    }

    private var confidenceColor: Color {
        if confidence < 0.3 { return .red }
        if confidence < 0.7 { return .orange }
        return .green
    }

    private var confidenceLabel: String {
        if confidence < 0.3 { return "Low confidence - consider manual entry" }
        if confidence < 0.7 { return "Moderate confidence" }
        return "High confidence"
    }

    private func sourceLabel(_ source: NutritionSource) -> String {
        switch source {
        case .estimate: return "Estimate"
        case .manual: return "Manual Entry"
        case .import: return "Imported"
        }
    }

    // MARK: - Actions

    private func loadNutritionIfNeeded() {
        guard !hasLoaded, let log, let entry else { return }
        hasLoaded = true
        title = entry.title
        date = entry.startAt ?? Date()
        calories = log.calories ?? 0
        proteinG = log.proteinG ?? 0
        carbsG = log.carbsG ?? 0
        fatG = log.fatG ?? 0
        confidence = log.confidence ?? 0.5
        source = log.source
        showOnCalendar = log.showOnCalendar
    }

    private func saveNutrition() {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        if syncService.isEnabled {
            syncService.updateNutritionLog(
                id: logId,
                title: trimmed,
                date: date,
                calories: calories,
                proteinG: proteinG,
                carbsG: carbsG,
                fatG: fatG,
                confidence: confidence,
                source: source,
                showOnCalendar: showOnCalendar
            )
        } else {
            appStore.updateNutritionLog(
                id: logId,
                title: trimmed,
                date: date,
                calories: calories,
                proteinG: proteinG,
                carbsG: carbsG,
                fatG: fatG,
                confidence: confidence,
                source: source,
                showOnCalendar: showOnCalendar
            )
        }
    }

    private func deleteNutrition() {
        if syncService.isEnabled {
            syncService.deleteNutritionLog(id: logId)
        } else {
            appStore.deleteNutritionLog(id: logId)
        }
        dismiss()
    }
}

// MARK: - Macro Row

private struct MacroRow: View {
    let label: String
    @Binding var value: Double
    let unit: String
    let color: Color

    @Environment(ThemeStore.self) private var theme

    var body: some View {
        HStack {
            Circle()
                .fill(color)
                .frame(width: 12, height: 12)

            Text(label)
                .font(AppFont.body(theme.metrics.bodyText))
                .foregroundStyle(theme.palette.text)

            Spacer()

            HStack(spacing: 4) {
                TextField("0", value: $value, format: .number.precision(.fractionLength(0)))
                    .keyboardType(.decimalPad)
                    .multilineTextAlignment(.trailing)
                    .frame(width: 60)
                    .textFieldStyle(.roundedBorder)

                Text(unit)
                    .font(AppFont.body(theme.metrics.smallText))
                    .foregroundStyle(theme.palette.textSecondary)
                    .frame(width: 30)
            }
        }
    }
}

// MARK: - Macro Bar

private struct MacroBar: View {
    let protein: Double
    let carbs: Double
    let fat: Double

    @Environment(ThemeStore.self) private var theme

    var body: some View {
        let total = protein + carbs + fat
        guard total > 0 else { return AnyView(EmptyView()) }

        let proteinPct = protein / total
        let carbsPct = carbs / total
        let fatPct = fat / total

        return AnyView(
            VStack(alignment: .leading, spacing: 8) {
                GeometryReader { geo in
                    HStack(spacing: 0) {
                        Rectangle()
                            .fill(Color.red)
                            .frame(width: geo.size.width * proteinPct)
                        Rectangle()
                            .fill(Color.blue)
                            .frame(width: geo.size.width * carbsPct)
                        Rectangle()
                            .fill(Color.yellow)
                            .frame(width: geo.size.width * fatPct)
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 4))
                }
                .frame(height: 8)

                HStack(spacing: 16) {
                    Label("\(Int(proteinPct * 100))% P", systemImage: "circle.fill")
                        .font(AppFont.body(theme.metrics.smallText))
                        .foregroundStyle(.red)
                    Label("\(Int(carbsPct * 100))% C", systemImage: "circle.fill")
                        .font(AppFont.body(theme.metrics.smallText))
                        .foregroundStyle(.blue)
                    Label("\(Int(fatPct * 100))% F", systemImage: "circle.fill")
                        .font(AppFont.body(theme.metrics.smallText))
                        .foregroundStyle(.yellow)
                }
            }
        )
    }
}
