import SwiftUI
import UniformTypeIdentifiers

struct CalendarView: View {
    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme
    @Environment(SupabaseSyncService.self) private var syncService
    @Environment(CalendarSyncService.self) private var calendarSync
    @State private var selectedDate = Date()
    @State private var mode: CalendarMode = .day
    @State private var dragState: DragState?
    @State private var dragOffsetMinutes = 0
    @State private var showConflictList = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: "Calendar", subtitle: "Time blocks and commitments")

                if !calendarSync.conflicts.isEmpty {
                    SyncConflictBanner(conflictCount: calendarSync.conflicts.count) {
                        showConflictList = true
                    }
                    .accessibilityIdentifier("calendar.sync.conflict.banner")
                }

                InsightCard {
                    VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                        HStack {
                            Button("Prev") {
                                shiftDate(-1)
                            }
                            .buttonStyle(.bordered)

                            Button("Today") {
                                selectedDate = Date()
                            }
                            .buttonStyle(.bordered)

                            Button("Next") {
                                shiftDate(1)
                            }
                            .buttonStyle(.bordered)

                            Spacer()

                            Picker("Mode", selection: $mode) {
                                ForEach(CalendarMode.allCases, id: \.self) { mode in
                                    Text(mode.label).tag(mode)
                                }
                            }
                            .pickerStyle(.segmented)
                            .frame(maxWidth: 200)
                        }

                        DatePicker("Day", selection: $selectedDate, displayedComponents: .date)
                            .datePickerStyle(.compact)
                            .tint(theme.palette.tint)
                    }
                }

                InsightCard {
                    VStack(alignment: .leading, spacing: theme.metrics.cardGap) {
                        switch mode {
                        case .day:
                            DayScheduleView(
                                date: selectedDate,
                                items: dayItems(for: selectedDate),
                                onMove: handleMove,
                                onDrop: handleDrop,
                                dragState: $dragState,
                                dragOffsetMinutes: $dragOffsetMinutes
                            )
                        case .week:
                            WeekScheduleView(
                                anchorDate: selectedDate,
                                items: weekItems,
                                onMove: handleMove,
                                onDrop: handleDrop,
                                dragState: $dragState,
                                dragOffsetMinutes: $dragOffsetMinutes
                            )
                        case .month:
                            MonthScheduleView(anchorDate: selectedDate, items: scheduleItems)
                        }
                    }
                }

                InsightCard {
                    VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                        Text("Unscheduled")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)

                        if unscheduledTasks.isEmpty && unscheduledHabits.isEmpty {
                            Text("Everything is scheduled.")
                                .font(AppFont.body(theme.metrics.bodyText))
                                .foregroundStyle(theme.palette.textSecondary)
                        }

                        ForEach(unscheduledTasks, id: \.id) { task in
                            DraggableScheduleRow(
                                title: task.title,
                                subtitle: "TodoTask",
                                kind: .task,
                                id: task.id
                            )
                        }

                        ForEach(unscheduledHabits, id: \.id) { habit in
                            DraggableScheduleRow(
                                title: habit.title,
                                subtitle: "Habit",
                                kind: .habit,
                                id: habit.id
                            )
                        }
                    }
                }
            }
            .padding(theme.metrics.spacing)
        }
        .background(theme.palette.background)
        .navigationTitle("Calendar")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
        .sheet(isPresented: $showConflictList) {
            SyncConflictListView(
                conflicts: calendarSync.conflicts,
                entryLookup: { id in
                    appStore.entries.first(where: { $0.id == id })
                },
                onDismiss: { showConflictList = false }
            )
            .accessibilityIdentifier("calendar.sync.conflict.list")
        }
    }

    private var scheduleRange: DateInterval {
        switch mode {
        case .day:
            return ScheduleService.dayRange(for: selectedDate)
        case .week:
            return ScheduleService.weekRange(for: selectedDate)
        case .month:
            return ScheduleService.monthRange(for: selectedDate)
        }
    }

    private var scheduleItems: [ScheduledItem] {
        ScheduleService.items(for: scheduleRange, entries: appStore.entries, tasks: appStore.tasks, habits: appStore.habits)
    }

    private var weekItems: [ScheduledItem] {
        scheduleItems
    }

    private var unscheduledTasks: [TodoTask] {
        appStore.tasks.filter { $0.scheduledAt == nil }
    }

    private var unscheduledHabits: [HabitDefinition] {
        appStore.habits.filter { $0.scheduledAt == nil }
    }

    private func dayItems(for date: Date) -> [ScheduledItem] {
        let range = ScheduleService.dayRange(for: date)
        return scheduleItems.filter { range.intersects(DateInterval(start: $0.startAt, end: $0.endAt)) }
    }

    private func shiftDate(_ delta: Int) {
        let calendar = Calendar.current
        switch mode {
        case .day:
            if let next = calendar.date(byAdding: .day, value: delta, to: selectedDate) {
                selectedDate = next
            }
        case .week:
            if let next = calendar.date(byAdding: .day, value: delta * 7, to: selectedDate) {
                selectedDate = next
            }
        case .month:
            if let next = calendar.date(byAdding: .month, value: delta, to: selectedDate) {
                selectedDate = next
            }
        }
    }

    private func handleDrop(kind: ScheduleItemKind, id: UUID, startAt: Date) {
        switch kind {
        case .task:
            if let task = appStore.tasks.first(where: { $0.id == id }) {
                let minutes = max(5, task.estimateMinutes ?? ScheduleService.defaultTaskMinutes)
                let endAt = startAt.addingTimeInterval(TimeInterval(minutes * 60))
                if syncService.isEnabled {
                    syncService.scheduleTask(id: id, startAt: startAt, endAt: endAt)
                } else {
                    appStore.scheduleTask(id: id, startAt: startAt, endAt: endAt)
                }
            }
        case .habit:
            if let habit = appStore.habits.first(where: { $0.id == id }) {
                let minutes = max(5, habit.durationMinutes)
                if syncService.isEnabled {
                    syncService.scheduleHabit(id: id, startAt: startAt, durationMinutes: minutes)
                } else {
                    appStore.scheduleHabit(id: id, startAt: startAt, durationMinutes: minutes)
                }
            }
        case .event:
            let endAt = startAt.addingTimeInterval(60 * 30)
            if syncService.isEnabled {
                syncService.scheduleEntry(id: id, startAt: startAt, endAt: endAt, allDay: false)
            } else {
                appStore.scheduleEntry(id: id, startAt: startAt, endAt: endAt, allDay: false)
            }
        }
    }

    private func handleMove(item: ScheduledItem, startAt: Date, endAt: Date) {
        if item.allDay {
            return
        }
        if item.isRecurring {
            switch item.kind {
            case .event:
                if syncService.isEnabled {
                    syncService.overrideEntryOccurrence(
                        id: item.sourceId,
                        occurrenceStartAt: item.occurrenceStartAt,
                        startAt: startAt,
                        endAt: endAt,
                        allDay: item.allDay
                    )
                } else {
                    appStore.addEntryRecurrenceException(
                        id: item.sourceId,
                        originalStartAt: item.occurrenceStartAt,
                        startAt: startAt,
                        endAt: endAt,
                        allDay: item.allDay
                    )
                }
            case .task:
                if syncService.isEnabled {
                    syncService.overrideTaskOccurrence(
                        id: item.sourceId,
                        occurrenceStartAt: item.occurrenceStartAt,
                        startAt: startAt,
                        endAt: endAt
                    )
                } else {
                    appStore.addTaskRecurrenceException(
                        id: item.sourceId,
                        originalStartAt: item.occurrenceStartAt,
                        startAt: startAt,
                        endAt: endAt
                    )
                }
            case .habit:
                if syncService.isEnabled {
                    syncService.overrideHabitOccurrence(
                        id: item.sourceId,
                        occurrenceStartAt: item.occurrenceStartAt,
                        startAt: startAt,
                        endAt: endAt
                    )
                } else {
                    appStore.addHabitRecurrenceException(
                        id: item.sourceId,
                        originalStartAt: item.occurrenceStartAt,
                        startAt: startAt,
                        endAt: endAt
                    )
                }
            }
            return
        }
        switch item.kind {
        case .event:
            if syncService.isEnabled {
                syncService.scheduleEntry(id: item.sourceId, startAt: startAt, endAt: endAt, allDay: item.allDay)
            } else {
                appStore.scheduleEntry(id: item.sourceId, startAt: startAt, endAt: endAt, allDay: item.allDay)
            }
        case .task:
            if syncService.isEnabled {
                syncService.scheduleTask(id: item.sourceId, startAt: startAt, endAt: endAt)
            } else {
                appStore.scheduleTask(id: item.sourceId, startAt: startAt, endAt: endAt)
            }
        case .habit:
            if syncService.isEnabled {
                syncService.scheduleHabit(id: item.sourceId, startAt: startAt, durationMinutes: Int(endAt.timeIntervalSince(startAt) / 60))
            } else {
                appStore.scheduleHabit(id: item.sourceId, startAt: startAt, durationMinutes: Int(endAt.timeIntervalSince(startAt) / 60))
            }
        }
    }
}

private enum CalendarMode: String, CaseIterable {
    case day
    case week
    case month

    var label: String {
        switch self {
        case .day: return "Day"
        case .week: return "Week"
        case .month: return "Month"
        }
    }
}

private struct DragState: Equatable {
    let itemId: String
    let sourceId: UUID
    let kind: ScheduleItemKind
    let startAt: Date
    let endAt: Date
    let dayStart: Date
}

private struct DraggableScheduleRow: View {
    let title: String
    let subtitle: String
    let kind: ScheduleItemKind
    let id: UUID

    @Environment(ThemeStore.self) private var theme

    var body: some View {
        InsightRow {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(AppFont.body(theme.metrics.bodyText))
                    .foregroundStyle(theme.palette.text)
                Text(subtitle)
                    .font(AppFont.body(theme.metrics.smallText))
                    .foregroundStyle(theme.palette.textSecondary)
            }
        } trailing: {
            Image(systemName: "arrow.up.left.and.arrow.down.right")
                .foregroundStyle(theme.palette.textSecondary)
        }
        .padding(.vertical, 4)
        .onDrag {
            let payload = ScheduleDragPayload.encode(kind: kind, id: id)
            return NSItemProvider(object: payload as NSString)
        }
    }
}

private struct DayScheduleView: View {
    let date: Date
    let items: [ScheduledItem]
    let onMove: (ScheduledItem, Date, Date) -> Void
    let onDrop: (ScheduleItemKind, UUID, Date) -> Void
    @Binding var dragState: DragState?
    @Binding var dragOffsetMinutes: Int

    private let slotMinutes = 30
    private let slotHeight: CGFloat = 42
    private let timeAxisWidth: CGFloat = 54

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            ScheduleAllDayLaneView(items: allDayItems)

            ScrollView(.vertical) {
                HStack(alignment: .top, spacing: 12) {
                    TimeAxisView(slotMinutes: slotMinutes, slotHeight: slotHeight)
                        .frame(width: timeAxisWidth)

                    DayColumnView(
                        date: date,
                        items: timedItems,
                        slotMinutes: slotMinutes,
                        slotHeight: slotHeight,
                        onMove: onMove,
                        onDrop: onDrop,
                        dragState: $dragState,
                        dragOffsetMinutes: $dragOffsetMinutes
                    )
                }
            }
            .frame(minHeight: 360)
        }
    }

    private var allDayItems: [ScheduledItem] {
        items.filter { $0.allDay }
    }

    private var timedItems: [ScheduledItem] {
        items.filter { !$0.allDay }
    }
}

private struct WeekScheduleView: View {
    let anchorDate: Date
    let items: [ScheduledItem]
    let onMove: (ScheduledItem, Date, Date) -> Void
    let onDrop: (ScheduleItemKind, UUID, Date) -> Void
    @Binding var dragState: DragState?
    @Binding var dragOffsetMinutes: Int

    private let slotMinutes = 30
    private let slotHeight: CGFloat = 36
    private let timeAxisWidth: CGFloat = 54

    var body: some View {
        let days = weekDays
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                Color.clear
                    .frame(width: timeAxisWidth, height: 1)
                ForEach(days, id: \.self) { day in
                    VStack(alignment: .leading, spacing: 6) {
                        Text(dayLabel(day))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        ScheduleAllDayColumn(items: itemsForDay(day).filter { $0.allDay })
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }

            ScrollView(.vertical) {
                HStack(alignment: .top, spacing: 12) {
                    TimeAxisView(slotMinutes: slotMinutes, slotHeight: slotHeight)
                        .frame(width: timeAxisWidth)

                    ForEach(days, id: \.self) { day in
                        DayColumnView(
                            date: day,
                            items: itemsForDay(day).filter { !$0.allDay },
                            slotMinutes: slotMinutes,
                            slotHeight: slotHeight,
                            onMove: onMove,
                            onDrop: onDrop,
                            dragState: $dragState,
                            dragOffsetMinutes: $dragOffsetMinutes
                        )
                        .frame(minWidth: 120, maxWidth: .infinity)
                    }
                }
            }
            .frame(minHeight: 360)
        }
    }

    private var weekDays: [Date] {
        let calendar = Calendar.current
        let start = ScheduleService.startOfWeek(for: anchorDate)
        return (0..<7).compactMap { calendar.date(byAdding: .day, value: $0, to: start) }
    }

    private func itemsForDay(_ day: Date) -> [ScheduledItem] {
        let range = ScheduleService.dayRange(for: day)
        return items.filter { range.intersects(DateInterval(start: $0.startAt, end: $0.endAt)) }
    }

    private func dayLabel(_ day: Date) -> String {
        day.formatted(.dateTime.weekday(.abbreviated).month(.abbreviated).day())
    }
}

private struct MonthScheduleView: View {
    let anchorDate: Date
    let items: [ScheduledItem]
    @Environment(ThemeStore.self) private var theme

    var body: some View {
        let dates = CalendarSupport.monthGridDates(containing: anchorDate)
        let columns = Array(repeating: GridItem(.flexible(), spacing: 8), count: 7)

        LazyVGrid(columns: columns, spacing: 8) {
            ForEach(dates, id: \.self) { date in
                let dayItems = itemsForDay(date)
                let allDayCount = dayItems.filter(\.allDay).count
                let timedCount = dayItems.count - allDayCount
                MonthCell(
                    date: date,
                    isCurrentMonth: Calendar.current.isDate(date, equalTo: anchorDate, toGranularity: .month),
                    allDayCount: allDayCount,
                    timedCount: timedCount
                )
            }
        }
        .padding(4)
    }

    private func itemsForDay(_ day: Date) -> [ScheduledItem] {
        let range = ScheduleService.dayRange(for: day)
        return items.filter { range.intersects(DateInterval(start: $0.startAt, end: $0.endAt)) }
    }
}

private struct MonthCell: View {
    let date: Date
    let isCurrentMonth: Bool
    let allDayCount: Int
    let timedCount: Int
    @Environment(ThemeStore.self) private var theme

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(date.formatted(.dateTime.day()))
                .font(AppFont.body(theme.metrics.smallText))
                .foregroundStyle(isCurrentMonth ? theme.palette.text : theme.palette.textSecondary)
            if allDayCount + timedCount > 0 {
                Text("\(allDayCount) all-day")
                    .font(AppFont.body(theme.metrics.tinyText))
                    .foregroundStyle(theme.palette.textSecondary)
                Text("\(timedCount) timed")
                    .font(AppFont.body(theme.metrics.tinyText))
                    .foregroundStyle(theme.palette.textSecondary)
            } else {
                Text("No items")
                    .font(AppFont.body(theme.metrics.tinyText))
                    .foregroundStyle(theme.palette.textSecondary)
            }
            Spacer()
        }
        .padding(8)
        .frame(minHeight: 72, alignment: .topLeading)
        .background(theme.palette.surface)
        .overlay(
            RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous)
                .stroke(theme.palette.borderLight, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous))
        .opacity(isCurrentMonth ? 1 : 0.45)
    }
}

private struct ScheduleAllDayLaneView: View {
    let items: [ScheduledItem]
    @Environment(ThemeStore.self) private var theme

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("All day")
                .font(AppFont.body(theme.metrics.smallText))
                .foregroundStyle(theme.palette.textSecondary)

            if items.isEmpty {
                Text("No all-day items")
                    .font(AppFont.body(theme.metrics.smallText))
                    .foregroundStyle(theme.palette.textSecondary)
            } else {
                HStack(spacing: 8) {
                    ForEach(items, id: \.id) { item in
                        ScheduleAllDayChip(title: item.title)
                    }
                }
            }
        }
    }
}

private struct ScheduleAllDayColumn: View {
    let items: [ScheduledItem]
    @Environment(ThemeStore.self) private var theme

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if items.isEmpty {
                Text("--")
                    .font(AppFont.body(theme.metrics.tinyText))
                    .foregroundStyle(theme.palette.textSecondary)
            } else {
                ForEach(items, id: \.id) { item in
                    ScheduleAllDayChip(title: item.title)
                }
            }
        }
    }
}

private struct ScheduleAllDayChip: View {
    let title: String
    @Environment(ThemeStore.self) private var theme

    var body: some View {
        Text(title)
            .font(AppFont.body(theme.metrics.tinyText))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(theme.palette.tintLight)
            .foregroundStyle(theme.palette.text)
            .clipShape(Capsule())
    }
}

private struct TimeAxisView: View {
    let slotMinutes: Int
    let slotHeight: CGFloat

    var body: some View {
        VStack(spacing: 0) {
            ForEach(0..<slots, id: \.self) { index in
                let minutes = index * slotMinutes
                let label = minutes.isMultiple(of: 60) ? hourLabel(minutes / 60) : ""
                Text(label)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .frame(height: slotHeight, alignment: .topTrailing)
                    .frame(maxWidth: .infinity, alignment: .topTrailing)
            }
        }
    }

    private var slots: Int {
        (24 * 60) / slotMinutes
    }

    private func hourLabel(_ hour: Int) -> String {
        let display = hour == 0 ? 12 : (hour > 12 ? hour - 12 : hour)
        let suffix = hour < 12 ? "AM" : "PM"
        return "\(display) \(suffix)"
    }
}

private struct DayColumnView: View {
    let date: Date
    let items: [ScheduledItem]
    let slotMinutes: Int
    let slotHeight: CGFloat
    let onMove: (ScheduledItem, Date, Date) -> Void
    let onDrop: (ScheduleItemKind, UUID, Date) -> Void
    @Binding var dragState: DragState?
    @Binding var dragOffsetMinutes: Int

    @Environment(ThemeStore.self) private var theme

    private let columnGap: CGFloat = 6
    private let snapMinutes = 5

    var body: some View {
        GeometryReader { geo in
            let dayStart = Calendar.current.startOfDay(for: date)
            let layout = DayLayout(items: items)
            ZStack(alignment: .topLeading) {
                VStack(spacing: 0) {
                    ForEach(0..<slots, id: \.self) { slot in
                        DropTargetRow(
                            startAt: dayStart.addingTimeInterval(TimeInterval(slot * slotMinutes * 60)),
                            height: slotHeight,
                            onDrop: onDrop
                        )
                        .overlay(
                            Rectangle()
                                .fill(theme.palette.borderLight)
                                .frame(height: 1),
                            alignment: .bottom
                        )
                    }
                }

                ForEach(items, id: \.id) { item in
                    let durationMinutes = max(5, Int(item.endAt.timeIntervalSince(item.startAt) / 60))
                    let startMinutes = minutesSinceDayStart(item.startAt, dayStart: dayStart)
                    let offset = dragState?.itemId == item.id ? dragOffsetMinutes : 0
                    let displayStart = startMinutes + offset
                    let clampedStart = clamp(displayStart, min: 0, max: (24 * 60) - durationMinutes)
                    let top = CGFloat(clampedStart) * minuteHeight
                    let height = CGFloat(durationMinutes) * minuteHeight
                    let colCount = max(1, layout.columnCount)
                    let colIndex = layout.columnIndex[item.id] ?? 0
                    let availableWidth = max(0, geo.size.width - CGFloat(colCount - 1) * columnGap)
                    let colWidth = availableWidth / CGFloat(colCount)
                    let x = CGFloat(colIndex) * (colWidth + columnGap)

                    ScheduleBlockView(item: item)
                        .frame(width: colWidth, height: max(28, height))
                        .offset(x: x, y: top)
                        .gesture(
                            DragGesture()
                                .onChanged { value in
                                    if dragState?.itemId != item.id {
                                        dragState = DragState(
                                            itemId: item.id,
                                            sourceId: item.sourceId,
                                            kind: item.kind,
                                            startAt: item.startAt,
                                            endAt: item.endAt,
                                            dayStart: dayStart
                                        )
                                    }
                                    let delta = Int(round(value.translation.height / minuteHeight))
                                    dragOffsetMinutes = snap(delta, step: snapMinutes)
                                }
                                .onEnded { _ in
                                    guard let state = dragState, state.itemId == item.id else { return }
                                    let durationMinutes = max(5, Int(state.endAt.timeIntervalSince(state.startAt) / 60))
                                    let baseMinutes = minutesSinceDayStart(state.startAt, dayStart: state.dayStart)
                                    let nextMinutes = clamp(baseMinutes + dragOffsetMinutes, min: 0, max: (24 * 60) - durationMinutes)
                                    let newStart = state.dayStart.addingTimeInterval(TimeInterval(nextMinutes * 60))
                                    let newEnd = newStart.addingTimeInterval(TimeInterval(durationMinutes * 60))
                                    onMove(item, newStart, newEnd)
                                    dragState = nil
                                    dragOffsetMinutes = 0
                                }
                        )
                }
            }
        }
        .frame(minHeight: totalHeight)
    }

    private var slots: Int {
        (24 * 60) / slotMinutes
    }

    private var minuteHeight: CGFloat {
        slotHeight / CGFloat(slotMinutes)
    }

    private var totalHeight: CGFloat {
        CGFloat(slots) * slotHeight
    }

    private func minutesSinceDayStart(_ date: Date, dayStart: Date) -> Int {
        Int(date.timeIntervalSince(dayStart) / 60)
    }

    private func clamp(_ value: Int, min: Int, max: Int) -> Int {
        Swift.max(min, Swift.min(max, value))
    }

    private func snap(_ value: Int, step: Int) -> Int {
        guard step > 0 else { return value }
        return Int(round(Double(value) / Double(step))) * step
    }
}

private struct DropTargetRow: View {
    let startAt: Date
    let height: CGFloat
    let onDrop: (ScheduleItemKind, UUID, Date) -> Void

    @State private var isTargeted = false

    var body: some View {
        Rectangle()
            .fill(isTargeted ? Color.gray.opacity(0.2) : Color.clear)
            .frame(height: height)
            .onDrop(of: [UTType.text], isTargeted: $isTargeted) { providers in
                guard let provider = providers.first else { return false }
                provider.loadItem(forTypeIdentifier: UTType.text.identifier, options: nil) { item, _ in
                    let raw = string(from: item)
                    guard let raw else { return }
                    guard let payload = ScheduleDragPayload.decode(raw) else { return }
                    Task { @MainActor in
                        onDrop(payload.0, payload.1, startAt)
                    }
                }
                return true
            }
    }

    private func string(from item: NSSecureCoding?) -> String? {
        if let data = item as? Data {
            return String(data: data, encoding: .utf8)
        }
        if let text = item as? String {
            return text
        }
        if let text = item as? NSString {
            return text as String
        }
        return nil
    }
}

private struct ScheduleBlockView: View {
    let item: ScheduledItem

    @Environment(ThemeStore.self) private var theme

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(item.title)
                .font(AppFont.body(theme.metrics.smallText))
                .foregroundStyle(theme.palette.text)
                .lineLimit(2)
            if !item.allDay {
                Text(timeLabel)
                    .font(AppFont.body(theme.metrics.tinyText))
                    .foregroundStyle(theme.palette.textSecondary)
            }
        }
        .padding(8)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(kindColor.opacity(theme.isDark ? 0.22 : 0.16))
        .overlay(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .stroke(kindColor.opacity(0.35), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    private var timeLabel: String {
        let start = item.startAt.formatted(date: .omitted, time: .shortened)
        let end = item.endAt.formatted(date: .omitted, time: .shortened)
        return "\(start) - \(end)"
    }

    private var kindColor: Color {
        switch item.kind {
        case .event:
            return theme.palette.tint
        case .task:
            return theme.palette.success
        case .habit:
            return theme.palette.warning
        }
    }
}

private struct DayLayout {
    let columnCount: Int
    let columnIndex: [String: Int]

    init(items: [ScheduledItem]) {
        var columns: [[ScheduledItem]] = []
        var indexById: [String: Int] = [:]
        let sorted = items.sorted { $0.startAt < $1.startAt }

        for item in sorted {
            var placed = false
            for idx in columns.indices {
                if let last = columns[idx].last, last.endAt <= item.startAt {
                    columns[idx].append(item)
                    indexById[item.id] = idx
                    placed = true
                    break
                }
            }
            if !placed {
                columns.append([item])
                indexById[item.id] = columns.count - 1
            }
        }

        columnCount = max(1, columns.count)
        columnIndex = indexById
    }
}
