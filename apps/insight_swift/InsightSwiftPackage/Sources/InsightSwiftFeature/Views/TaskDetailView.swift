import SwiftUI

struct TaskDetailView: View {
    let taskId: UUID

    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme
    @Environment(SupabaseSyncService.self) private var syncService
    @Environment(\.dismiss) private var dismiss

    @State private var title = ""
    @State private var status: TaskStatus = .todo
    @State private var dueEnabled = false
    @State private var dueAt = Date()
    @State private var scheduledEnabled = false
    @State private var scheduledAt = Date()
    @State private var estimateEnabled = false
    @State private var estimateMinutes = ScheduleService.defaultTaskMinutes
    @State private var notes = ""
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
    @State private var newExceptionDurationMinutes = ScheduleService.defaultTaskMinutes
    @State private var newExceptionCancelled = false
    @State private var applyToSeries = false
    @State private var hasExistingRecurrence = false
    @State private var originalScheduledAt: Date?
    @State private var originalEstimateMinutes: Int?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: headerTitle, subtitle: "TodoTask detail")

                if task == nil {
                    InsightCard {
                        Text("TodoTask not found")
                            .font(AppFont.body(theme.metrics.bodyText))
                            .foregroundStyle(theme.palette.textSecondary)
                    }
                } else {
                    InsightCard {
                        VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                            Text("Details")
                                .font(AppFont.title(theme.metrics.sectionTitle))
                                .foregroundStyle(theme.palette.text)

                            TextField("TodoTask title", text: $title)
                                .textFieldStyle(.roundedBorder)

                            Picker("Status", selection: $status) {
                                ForEach(TaskStatus.allCases, id: \.self) { status in
                                    Text(statusLabel(status)).tag(status)
                                }
                            }
                            .pickerStyle(.segmented)

                            Toggle("Due date", isOn: $dueEnabled)
                            if dueEnabled {
                                DatePicker("Due", selection: $dueAt, displayedComponents: [.date, .hourAndMinute])
                                    .datePickerStyle(.compact)
                                    .tint(theme.palette.tint)
                            }

                            Toggle("Scheduled time", isOn: $scheduledEnabled)
                            if scheduledEnabled {
                                DatePicker("Scheduled", selection: $scheduledAt, displayedComponents: [.date, .hourAndMinute])
                                    .datePickerStyle(.compact)
                                    .tint(theme.palette.tint)
                            }

                            Toggle("Estimate", isOn: $estimateEnabled)
                            if estimateEnabled {
                                Stepper("Estimate: \(estimateMinutes) min", value: $estimateMinutes, in: 5...480, step: 5)
                            }
                        }
                    }

                    InsightCard {
                        VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                            Text("Notes")
                                .font(AppFont.title(theme.metrics.sectionTitle))
                                .foregroundStyle(theme.palette.text)

                            TextEditor(text: $notes)
                                .frame(minHeight: 160)
                                .padding(8)
                                .background(theme.palette.surfaceAlt)
                                .clipShape(RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous))
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
                                        Stepper("Duration: \(newExceptionDurationMinutes) min", value: $newExceptionDurationMinutes, in: 5...480, step: 5)
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
                        HStack(spacing: theme.metrics.spacingSmall) {
                            Button("Save") {
                                saveTask()
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
        .navigationTitle("TodoTask")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
        .confirmationDialog("Delete this task?", isPresented: $showDeleteConfirm) {
            Button("Delete", role: .destructive) {
                deleteTask()
            }
        }
        .onAppear {
            loadTaskIfNeeded()
        }
    }

    private var task: TodoTask? {
        appStore.tasks.first(where: { $0.id == taskId })
    }

    private var headerTitle: String {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? "TodoTask" : trimmed
    }

    private func loadTaskIfNeeded() {
        guard !hasLoaded, let task else { return }
        hasLoaded = true
        title = task.title
        status = task.status
        if let due = task.dueAt {
            dueEnabled = true
            dueAt = due
        } else {
            dueEnabled = false
            dueAt = Date()
        }
        if let scheduled = task.scheduledAt {
            scheduledEnabled = true
            scheduledAt = scheduled
        } else {
            scheduledEnabled = false
            scheduledAt = Date()
        }
        if let estimate = task.estimateMinutes {
            estimateEnabled = true
            estimateMinutes = estimate
        } else {
            estimateEnabled = false
            estimateMinutes = ScheduleService.defaultTaskMinutes
        }
        notes = task.notes
        tagsText = formatList(task.tags)
        peopleText = formatList(task.people)
        contextsText = formatList(task.contexts)
        if let rule = task.recurrenceRule {
            isRecurring = true
            recurrenceFrequency = rule.frequency
            recurrenceInterval = rule.interval
        } else {
            isRecurring = false
            recurrenceFrequency = .weekly
            recurrenceInterval = 1
        }
        hasExistingRecurrence = task.recurrenceRule != nil
        applyToSeries = false
        recurrenceExceptions = task.recurrenceExceptions
        originalScheduledAt = task.scheduledAt
        originalEstimateMinutes = task.estimateMinutes
        let baseTime = task.scheduledAt ?? Date()
        newExceptionOriginalAt = baseTime
        newExceptionStartAt = baseTime
        newExceptionDurationMinutes = task.estimateMinutes ?? ScheduleService.defaultTaskMinutes
        newExceptionCancelled = false
    }

    private func saveTask() {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let due = dueEnabled ? dueAt : nil
        let scheduled = scheduledEnabled ? scheduledAt : nil
        let estimate = estimateEnabled ? estimateMinutes : nil
        let tags = parseList(tagsText)
        let people = parseList(peopleText)
        let contexts = parseList(contextsText)
        let recurrenceRule = isRecurring ? RecurrenceRule(frequency: recurrenceFrequency, interval: recurrenceInterval) : nil
        let baseScheduled = (hasExistingRecurrence && !applyToSeries) ? (originalScheduledAt ?? scheduled) : scheduled
        let baseEstimate = (hasExistingRecurrence && !applyToSeries) ? (originalEstimateMinutes ?? estimate) : estimate
        var exceptions = isRecurring ? recurrenceExceptions : []
        if let autoException = singleOccurrenceException(scheduledAt: scheduled, estimateMinutes: estimate) {
            exceptions = mergeException(autoException, into: exceptions)
            recurrenceExceptions = exceptions
        }

        if syncService.isEnabled {
            syncService.updateTask(
                id: taskId,
                title: trimmed,
                status: status,
                dueAt: due,
                scheduledAt: baseScheduled,
                estimateMinutes: baseEstimate,
                tags: tags,
                people: people,
                contexts: contexts,
                notes: notes,
                recurrenceRule: recurrenceRule,
                recurrenceExceptions: exceptions,
                updateRecurrence: true
            )
        } else {
            appStore.updateTask(
                id: taskId,
                title: trimmed,
                status: status,
                dueAt: due,
                scheduledAt: baseScheduled,
                estimateMinutes: baseEstimate,
                tags: tags,
                people: people,
                contexts: contexts,
                notes: notes,
                recurrenceRule: recurrenceRule,
                recurrenceExceptions: exceptions,
                updateRecurrence: true
            )
        }
    }

    private func deleteTask() {
        if syncService.isEnabled {
            syncService.deleteTask(id: taskId)
        } else {
            appStore.deleteTask(id: taskId)
        }
        dismiss()
    }

    private func statusLabel(_ status: TaskStatus) -> String {
        status.rawValue.replacingOccurrences(of: "_", with: " ")
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

    private func singleOccurrenceException(scheduledAt: Date?, estimateMinutes: Int?) -> RecurrenceException? {
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
        let duration = max(5, (estimateMinutes ?? originalEstimateMinutes ?? ScheduleService.defaultTaskMinutes))
        let newEnd = newStart.addingTimeInterval(TimeInterval(duration * 60))

        let originalDuration = max(5, originalEstimateMinutes ?? ScheduleService.defaultTaskMinutes)
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
