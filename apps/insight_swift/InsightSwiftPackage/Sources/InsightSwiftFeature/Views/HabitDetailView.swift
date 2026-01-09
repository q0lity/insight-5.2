import SwiftUI

struct HabitDetailView: View {
    let habitId: UUID

    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme
    @Environment(SupabaseSyncService.self) private var syncService
    @Environment(\.dismiss) private var dismiss

    @State private var title = ""
    @State private var importance = 5
    @State private var difficulty = 5
    @State private var targetPerWeek = ""
    @State private var isTimed = false
    @State private var scheduledAt = Date()
    @State private var durationMinutes = 20
    @State private var tagsText = ""
    @State private var peopleText = ""
    @State private var contextsText = ""
    @State private var hasLoaded = false
    @State private var showDeleteConfirm = false
    @State private var isRecurring = false
    @State private var recurrenceFrequency: RecurrenceFrequency = .weekly
    @State private var recurrenceInterval = 1
    @State private var recurrenceExceptions: [RecurrenceException] = []
    @State private var newExceptionOriginalAt = Date()
    @State private var newExceptionStartAt = Date()
    @State private var newExceptionDurationMinutes = 20
    @State private var newExceptionCancelled = false
    @State private var applyToSeries = false
    @State private var hasExistingRecurrence = false
    @State private var originalScheduledAt: Date?
    @State private var originalDurationMinutes: Int?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: headerTitle, subtitle: "Habit detail")

                if habit == nil {
                    InsightCard {
                        Text("Habit not found")
                            .font(AppFont.body(theme.metrics.bodyText))
                            .foregroundStyle(theme.palette.textSecondary)
                    }
                } else {
                    InsightCard {
                        VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                            Text("Details")
                                .font(AppFont.title(theme.metrics.sectionTitle))
                                .foregroundStyle(theme.palette.text)

                            TextField("Habit title", text: $title)
                                .textFieldStyle(.roundedBorder)

                            Stepper("Importance: \(importance)", value: $importance, in: 1...10)
                            Stepper("Difficulty: \(difficulty)", value: $difficulty, in: 1...10)

                            TextField("Target per week", text: $targetPerWeek)
                                .keyboardType(.numberPad)
                                .textFieldStyle(.roundedBorder)
                        }
                    }

                    InsightCard {
                        VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                            Text("Schedule")
                                .font(AppFont.title(theme.metrics.sectionTitle))
                                .foregroundStyle(theme.palette.text)

                            Toggle("Timed schedule", isOn: $isTimed)

                            if isTimed {
                                DatePicker("Start", selection: $scheduledAt, displayedComponents: [.date, .hourAndMinute])
                                    .datePickerStyle(.compact)
                                    .tint(theme.palette.tint)
                                Stepper("Duration: \(durationMinutes) min", value: $durationMinutes, in: 5...240, step: 5)
                            }
                        }
                    }

                    InsightCard {
                        MetadataEditorSection(
                            tagsText: $tagsText,
                            peopleText: $peopleText,
                            contextsText: $contextsText
                        )
                    }

                    InsightCard {
                        VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                            Text("Recurrence")
                                .font(AppFont.title(theme.metrics.sectionTitle))
                                .foregroundStyle(theme.palette.text)

                            if hasExistingRecurrence {
                                Toggle("Apply edits to series", isOn: $applyToSeries)
                                    .tint(theme.palette.tint)
                                Text("Schedule edits default to this occurrence.")
                                    .font(AppFont.body(theme.metrics.smallText))
                                    .foregroundStyle(theme.palette.textSecondary)
                            }

                            Toggle("Recurring", isOn: $isRecurring)
                                .disabled(hasExistingRecurrence && !applyToSeries)

                            if isRecurring {
                                Picker("Frequency", selection: $recurrenceFrequency) {
                                    Text("Daily").tag(RecurrenceFrequency.daily)
                                    Text("Weekly").tag(RecurrenceFrequency.weekly)
                                    Text("Monthly").tag(RecurrenceFrequency.monthly)
                                }
                                .pickerStyle(.segmented)
                                .disabled(hasExistingRecurrence && !applyToSeries)

                                Stepper("Interval: \(recurrenceInterval)", value: $recurrenceInterval, in: 1...30)
                                    .disabled(hasExistingRecurrence && !applyToSeries)

                                if hasExistingRecurrence && !applyToSeries {
                                    Text("Enable apply-to-series to change recurrence settings.")
                                        .font(AppFont.body(theme.metrics.smallText))
                                        .foregroundStyle(theme.palette.textSecondary)
                                }

                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Exceptions")
                                        .font(AppFont.body(theme.metrics.smallText))
                                        .foregroundStyle(theme.palette.textSecondary)

                                    if recurrenceExceptions.isEmpty {
                                        Text("No exceptions")
                                            .font(AppFont.body(theme.metrics.smallText))
                                            .foregroundStyle(theme.palette.textSecondary)
                                    } else {
                                        ForEach(recurrenceExceptions, id: \.originalStartAt) { exception in
                                            InsightRow {
                                                VStack(alignment: .leading, spacing: 2) {
                                                    Text(exceptionTitle(exception))
                                                        .font(AppFont.body(theme.metrics.bodyText))
                                                        .foregroundStyle(theme.palette.text)
                                                    Text(exceptionDetail(exception))
                                                        .font(AppFont.body(theme.metrics.smallText))
                                                        .foregroundStyle(theme.palette.textSecondary)
                                                }
                                            } trailing: {
                                                Button {
                                                    removeException(exception)
                                                } label: {
                                                    Image(systemName: "trash")
                                                        .foregroundStyle(theme.palette.error)
                                                }
                                                .buttonStyle(.bordered)
                                            }
                                        }
                                    }
                                }

                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Add exception")
                                        .font(AppFont.body(theme.metrics.smallText))
                                        .foregroundStyle(theme.palette.textSecondary)

                                    DatePicker("Original", selection: $newExceptionOriginalAt, displayedComponents: [.date, .hourAndMinute])
                                        .datePickerStyle(.compact)
                                        .tint(theme.palette.tint)
                                        .onChange(of: newExceptionOriginalAt) { _, value in
                                            if !newExceptionCancelled {
                                                newExceptionStartAt = value
                                            }
                                        }

                                    Toggle("Cancel occurrence", isOn: $newExceptionCancelled)

                                    if !newExceptionCancelled {
                                        DatePicker("New start", selection: $newExceptionStartAt, displayedComponents: [.date, .hourAndMinute])
                                            .datePickerStyle(.compact)
                                            .tint(theme.palette.tint)
                                        Stepper("Duration: \(newExceptionDurationMinutes) min", value: $newExceptionDurationMinutes, in: 5...240, step: 5)
                                    }

                                    Button("Add exception") {
                                        addException()
                                    }
                                    .buttonStyle(.bordered)
                                    .tint(theme.palette.tint)
                                }
                            } else {
                                Text("None")
                                    .font(AppFont.body(theme.metrics.smallText))
                                    .foregroundStyle(theme.palette.textSecondary)
                            }
                        }
                    }

                    InsightCard {
                        VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                            Text("Recent logs")
                                .font(AppFont.title(theme.metrics.sectionTitle))
                                .foregroundStyle(theme.palette.text)

                            let logs = appStore.habitLogs.filter { $0.habitId == habitId }.prefix(8)
                            if logs.isEmpty {
                                Text("No logs yet. Tap Log to capture a rep.")
                                    .font(AppFont.body(theme.metrics.bodyText))
                                    .foregroundStyle(theme.palette.textSecondary)
                            } else {
                                ForEach(Array(logs), id: \.id) { log in
                                    Text(log.date.formatted(date: .abbreviated, time: .shortened))
                                        .font(AppFont.body(theme.metrics.bodyText))
                                        .foregroundStyle(theme.palette.text)
                                }
                            }
                        }
                    }

                    InsightCard {
                        HStack(spacing: theme.metrics.spacingSmall) {
                            Button("Save") {
                                saveHabit()
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(theme.palette.tint)
                            .disabled(title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

                            Button("Log") {
                                logHabit()
                            }
                            .buttonStyle(.bordered)
                            .tint(theme.palette.tint)

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
        .navigationTitle("Habit")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
        .confirmationDialog("Delete this habit?", isPresented: $showDeleteConfirm) {
            Button("Delete", role: .destructive) {
                deleteHabit()
            }
        }
        .onAppear {
            loadHabitIfNeeded()
        }
    }

    private var habit: HabitDefinition? {
        appStore.habits.first(where: { $0.id == habitId })
    }

    private var headerTitle: String {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? "Habit" : trimmed
    }

    private func loadHabitIfNeeded() {
        guard !hasLoaded, let habit else { return }
        hasLoaded = true
        title = habit.title
        importance = habit.importance
        difficulty = habit.difficulty
        targetPerWeek = habit.targetPerWeek.map(String.init) ?? ""
        if let scheduled = habit.scheduledAt {
            isTimed = true
            scheduledAt = scheduled
        } else {
            isTimed = false
            scheduledAt = Date()
        }
        durationMinutes = habit.durationMinutes
        tagsText = formatList(habit.tags)
        peopleText = formatList(habit.people)
        contextsText = formatList(habit.contexts)
        if let rule = habit.recurrenceRule {
            isRecurring = true
            recurrenceFrequency = rule.frequency
            recurrenceInterval = rule.interval
        } else {
            isRecurring = false
            recurrenceFrequency = .weekly
            recurrenceInterval = 1
        }
        hasExistingRecurrence = habit.recurrenceRule != nil
        applyToSeries = false
        recurrenceExceptions = habit.recurrenceExceptions
        originalScheduledAt = habit.scheduledAt
        originalDurationMinutes = habit.durationMinutes
        let baseTime = habit.scheduledAt ?? Date()
        newExceptionOriginalAt = baseTime
        newExceptionStartAt = baseTime
        newExceptionDurationMinutes = habit.durationMinutes
        newExceptionCancelled = false
    }

    private func saveHabit() {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let target = Int(targetPerWeek.trimmingCharacters(in: .whitespacesAndNewlines))
        let scheduled = isTimed ? scheduledAt : nil
        let duration = isTimed ? durationMinutes : nil
        let tags = parseList(tagsText)
        let people = parseList(peopleText)
        let contexts = parseList(contextsText)
        let recurrenceRule = isRecurring ? RecurrenceRule(frequency: recurrenceFrequency, interval: recurrenceInterval) : nil
        let baseScheduled = (hasExistingRecurrence && !applyToSeries) ? (originalScheduledAt ?? scheduled) : scheduled
        let baseDuration = (hasExistingRecurrence && !applyToSeries) ? (originalDurationMinutes ?? duration) : duration
        var exceptions = isRecurring ? recurrenceExceptions : []
        if let autoException = singleOccurrenceException(scheduledAt: scheduled, durationMinutes: duration) {
            exceptions = mergeException(autoException, into: exceptions)
            recurrenceExceptions = exceptions
        }

        if syncService.isEnabled {
            syncService.updateHabit(
                id: habitId,
                title: trimmed,
                importance: importance,
                difficulty: difficulty,
                tags: tags,
                people: people,
                contexts: contexts,
                targetPerWeek: target,
                scheduledAt: baseScheduled,
                durationMinutes: baseDuration,
                recurrenceRule: recurrenceRule,
                recurrenceExceptions: exceptions,
                updateRecurrence: true
            )
        } else {
            appStore.updateHabit(
                id: habitId,
                title: trimmed,
                importance: importance,
                difficulty: difficulty,
                tags: tags,
                people: people,
                contexts: contexts,
                targetPerWeek: target,
                scheduledAt: baseScheduled,
                durationMinutes: baseDuration,
                recurrenceRule: recurrenceRule,
                recurrenceExceptions: exceptions,
                updateRecurrence: true
            )
        }
    }

    private func deleteHabit() {
        if syncService.isEnabled {
            syncService.deleteHabit(id: habitId)
        } else {
            appStore.deleteHabit(id: habitId)
        }
        dismiss()
    }

    private func logHabit() {
        guard let habit else { return }
        if syncService.isEnabled {
            syncService.logHabit(habit)
        } else {
            appStore.logHabit(habit)
        }
    }

    private func addException() {
        let exception = RecurrenceException(
            originalStartAt: newExceptionOriginalAt,
            startAt: newExceptionCancelled ? nil : newExceptionStartAt,
            endAt: newExceptionCancelled ? nil : newExceptionStartAt.addingTimeInterval(TimeInterval(newExceptionDurationMinutes * 60)),
            allDay: nil,
            isCancelled: newExceptionCancelled
        )
        recurrenceExceptions = mergeException(exception, into: recurrenceExceptions)
    }

    private func removeException(_ exception: RecurrenceException) {
        let key = exceptionKey(exception.originalStartAt)
        recurrenceExceptions = recurrenceExceptions.filter { exceptionKey($0.originalStartAt) != key }
    }

    private func exceptionTitle(_ exception: RecurrenceException) -> String {
        "Original \(exception.originalStartAt.formatted(date: .abbreviated, time: .shortened))"
    }

    private func exceptionDetail(_ exception: RecurrenceException) -> String {
        if exception.isCancelled {
            return "Cancelled"
        }
        if let startAt = exception.startAt {
            return "Moved to \(startAt.formatted(date: .abbreviated, time: .shortened))"
        }
        return "Updated"
    }

    private func mergeException(_ exception: RecurrenceException, into existing: [RecurrenceException]) -> [RecurrenceException] {
        let key = exceptionKey(exception.originalStartAt)
        var filtered = existing.filter { exceptionKey($0.originalStartAt) != key }
        filtered.append(exception)
        return filtered.sorted { $0.originalStartAt < $1.originalStartAt }
    }

    private func exceptionKey(_ date: Date) -> Int {
        Int(date.timeIntervalSince1970 / 60)
    }

    private func singleOccurrenceException(scheduledAt: Date?, durationMinutes: Int?) -> RecurrenceException? {
        guard isRecurring, hasExistingRecurrence, !applyToSeries else { return nil }
        guard let originalScheduledAt else { return nil }

        if scheduledAt == nil {
            return RecurrenceException(
                originalStartAt: originalScheduledAt,
                startAt: nil,
                endAt: nil,
                allDay: nil,
                isCancelled: true
            )
        }

        let newStart = scheduledAt ?? originalScheduledAt
        let duration = max(5, (durationMinutes ?? originalDurationMinutes ?? 20))
        let newEnd = newStart.addingTimeInterval(TimeInterval(duration * 60))

        let originalDuration = max(5, originalDurationMinutes ?? 20)
        let originalEnd = originalScheduledAt.addingTimeInterval(TimeInterval(originalDuration * 60))

        if newStart == originalScheduledAt && newEnd == originalEnd {
            return nil
        }

        return RecurrenceException(
            originalStartAt: originalScheduledAt,
            startAt: newStart,
            endAt: newEnd,
            allDay: nil,
            isCancelled: false
        )
    }

    private func parseList(_ text: String) -> [String] {
        var results: [String] = []
        var seen = Set<String>()
        for part in text.split(separator: ",") {
            let trimmed = part.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty else { continue }
            let key = trimmed.lowercased()
            guard !seen.contains(key) else { continue }
            seen.insert(key)
            results.append(trimmed)
        }
        return results
    }

    private func formatList(_ items: [String]) -> String {
        items.joined(separator: ", ")
    }
}

private struct MetadataEditorSection: View {
    @Binding var tagsText: String
    @Binding var peopleText: String
    @Binding var contextsText: String

    @Environment(ThemeStore.self) private var theme

    var body: some View {
        VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
            Text("Metadata")
                .font(AppFont.title(theme.metrics.sectionTitle))
                .foregroundStyle(theme.palette.text)

            TextField("Tags (comma-separated)", text: $tagsText)
                .textFieldStyle(.roundedBorder)
            TextField("People (comma-separated)", text: $peopleText)
                .textFieldStyle(.roundedBorder)
            TextField("Contexts (comma-separated)", text: $contextsText)
                .textFieldStyle(.roundedBorder)
        }
    }
}
