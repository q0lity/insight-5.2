import Foundation

// MARK: - Search Result

/// Polymorphic search result for combined search across all data types
public enum SearchResult: Identifiable, @unchecked Sendable {
    case entry(Entry)
    case task(TodoTask)
    case note(Note)
    case trackerLog(TrackerLog, TrackerDefinition?)
    case habitLog(HabitLog, HabitDefinition?)
    case workout(WorkoutSession, Entry?)
    case nutrition(NutritionLog, Entry?)

    public var id: UUID {
        switch self {
        case .entry(let e): return e.id
        case .task(let t): return t.id
        case .note(let n): return n.id
        case .trackerLog(let l, _): return l.id
        case .habitLog(let l, _): return l.id
        case .workout(let w, _): return w.id
        case .nutrition(let n, _): return n.id
        }
    }

    public var title: String {
        switch self {
        case .entry(let e): return e.title
        case .task(let t): return t.title
        case .note(let n): return n.title
        case .trackerLog(_, let d): return d?.key ?? "Tracker"
        case .habitLog(_, let d): return d?.title ?? "Habit"
        case .workout(_, let e): return e?.title ?? "Workout"
        case .nutrition(_, let e): return e?.title ?? "Meal"
        }
    }

    public var subtitle: String? {
        switch self {
        case .entry(let e):
            return e.bodyMarkdown.isEmpty ? e.notes : e.bodyMarkdown
        case .task(let t):
            return t.notes.isEmpty ? nil : t.notes
        case .note(let n):
            return n.body.isEmpty ? nil : String(n.body.prefix(100))
        case .trackerLog(let l, let d):
            if let unit = d?.unit {
                return "\(l.value) \(unit)"
            }
            return "\(l.value)"
        case .habitLog(let l, _):
            let formatter = DateFormatter()
            formatter.dateStyle = .short
            return "Logged: \(formatter.string(from: l.date))"
        case .workout(let w, _):
            return w.template.rawValue.capitalized
        case .nutrition(let n, _):
            if let cal = n.calories {
                return "\(Int(cal)) calories"
            }
            return nil
        }
    }

    public var timestamp: Date {
        switch self {
        case .entry(let e): return e.startAt ?? e.createdAt
        case .task(let t): return t.scheduledAt ?? t.dueAt ?? Date()
        case .note(let n): return n.createdAt
        case .trackerLog(let l, _): return l.createdAt
        case .habitLog(let l, _): return l.date
        case .workout(_, let e): return e?.startAt ?? Date()
        case .nutrition(_, let e): return e?.startAt ?? Date()
        }
    }

    public var resultType: String {
        switch self {
        case .entry: return "Entry"
        case .task: return "Task"
        case .note: return "Note"
        case .trackerLog: return "Tracker"
        case .habitLog: return "Habit"
        case .workout: return "Workout"
        case .nutrition: return "Nutrition"
        }
    }
}

// MARK: - Local Search Service

/// Service for local search across all data types (privacy-first, no external API)
public struct LocalSearchService {

    // MARK: - Individual Type Search

    /// Search entries by title and body
    public static func searchEntries(_ query: String, in entries: [Entry]) -> [Entry] {
        let lowered = query.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        guard !lowered.isEmpty else { return entries }

        return entries.filter { entry in
            entry.title.lowercased().contains(lowered) ||
            entry.notes.lowercased().contains(lowered) ||
            entry.bodyMarkdown.lowercased().contains(lowered) ||
            entry.tags.contains { $0.lowercased().contains(lowered) } ||
            entry.people.contains { $0.lowercased().contains(lowered) } ||
            entry.contexts.contains { $0.lowercased().contains(lowered) }
        }
    }

    /// Search tasks by title and notes
    public static func searchTasks(_ query: String, in tasks: [TodoTask]) -> [TodoTask] {
        let lowered = query.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        guard !lowered.isEmpty else { return tasks }

        return tasks.filter { task in
            task.title.lowercased().contains(lowered) ||
            task.notes.lowercased().contains(lowered) ||
            task.tags.contains { $0.lowercased().contains(lowered) }
        }
    }

    /// Search notes by title and body
    public static func searchNotes(_ query: String, in notes: [Note]) -> [Note] {
        let lowered = query.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        guard !lowered.isEmpty else { return notes }

        return notes.filter { note in
            note.title.lowercased().contains(lowered) ||
            note.body.lowercased().contains(lowered)
        }
    }

    /// Search tracker logs by tracker key
    public static func searchTrackerLogs(
        _ query: String,
        logs: [TrackerLog],
        definitions: [TrackerDefinition]
    ) -> [(TrackerLog, TrackerDefinition?)] {
        let lowered = query.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        guard !lowered.isEmpty else {
            return logs.map { log in
                let definition = definitions.first { d in d.id == log.trackerId }
                return (log, definition)
            }
        }

        return logs.compactMap { log in
            let definition = definitions.first { $0.id == log.trackerId }
            let key = definition?.key.lowercased() ?? ""
            if key.contains(lowered) {
                return (log, definition)
            }
            return nil
        }
    }

    /// Search habit logs by habit title
    public static func searchHabitLogs(
        _ query: String,
        logs: [HabitLog],
        definitions: [HabitDefinition]
    ) -> [(HabitLog, HabitDefinition?)] {
        let lowered = query.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        guard !lowered.isEmpty else {
            return logs.map { log in
                let definition = definitions.first { d in d.id == log.habitId }
                return (log, definition)
            }
        }

        return logs.compactMap { log in
            let definition = definitions.first { $0.id == log.habitId }
            let title = definition?.title.lowercased() ?? ""
            if title.contains(lowered) {
                return (log, definition)
            }
            return nil
        }
    }

    /// Search workouts by entry title or template
    public static func searchWorkouts(
        _ query: String,
        sessions: [WorkoutSession],
        entries: [Entry]
    ) -> [(WorkoutSession, Entry?)] {
        let lowered = query.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        guard !lowered.isEmpty else {
            return sessions.map { session in
                let entry = entries.first { e in e.id == session.entryId }
                return (session, entry)
            }
        }

        return sessions.compactMap { session in
            let entry = entries.first { $0.id == session.entryId }
            let title = entry?.title.lowercased() ?? ""
            let template = session.template.rawValue.lowercased()

            if title.contains(lowered) || template.contains(lowered) {
                return (session, entry)
            }
            return nil
        }
    }

    /// Search nutrition logs by entry title
    public static func searchNutrition(
        _ query: String,
        logs: [NutritionLog],
        entries: [Entry]
    ) -> [(NutritionLog, Entry?)] {
        let lowered = query.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        guard !lowered.isEmpty else {
            return logs.map { log in
                let entry = entries.first { e in e.id == log.entryId }
                return (log, entry)
            }
        }

        return logs.compactMap { log in
            let entry = entries.first { $0.id == log.entryId }
            let title = entry?.title.lowercased() ?? ""

            if title.contains(lowered) || "nutrition".contains(lowered) || "meal".contains(lowered) {
                return (log, entry)
            }
            return nil
        }
    }

    // MARK: - Combined Search

    /// Combined search across all data types
    @MainActor
    public static func search(query: String, store: AppStore, limit: Int = 50) -> [SearchResult] {
        var results: [SearchResult] = []

        // Search entries
        let matchedEntries = searchEntries(query, in: store.entries)
        results.append(contentsOf: matchedEntries.map { .entry($0) })

        // Search tasks
        let matchedTasks = searchTasks(query, in: store.tasks)
        results.append(contentsOf: matchedTasks.map { .task($0) })

        // Search notes
        let matchedNotes = searchNotes(query, in: store.notes)
        results.append(contentsOf: matchedNotes.map { .note($0) })

        // Search tracker logs
        let matchedTrackers = searchTrackerLogs(query, logs: store.trackerLogs, definitions: store.trackers)
        results.append(contentsOf: matchedTrackers.map { .trackerLog($0.0, $0.1) })

        // Search habit logs
        let matchedHabits = searchHabitLogs(query, logs: store.habitLogs, definitions: store.habits)
        results.append(contentsOf: matchedHabits.map { .habitLog($0.0, $0.1) })

        // Search workouts
        let matchedWorkouts = searchWorkouts(query, sessions: store.workoutSessions, entries: store.entries)
        results.append(contentsOf: matchedWorkouts.map { .workout($0.0, $0.1) })

        // Search nutrition
        let matchedNutrition = searchNutrition(query, logs: store.nutritionLogs, entries: store.entries)
        results.append(contentsOf: matchedNutrition.map { .nutrition($0.0, $0.1) })

        // Sort by timestamp (most recent first) and limit
        results.sort { $0.timestamp > $1.timestamp }
        return Array(results.prefix(limit))
    }

    // MARK: - Quick Filters

    /// Get items from today
    @MainActor
    public static func todayItems(store: AppStore) -> [SearchResult] {
        let calendar = Calendar.current
        let startOfToday = calendar.startOfDay(for: Date())

        var results: [SearchResult] = []

        // Today's entries
        let todayEntries = store.entries.filter { entry in
            guard let startAt = entry.startAt else {
                return calendar.isDate(entry.createdAt, inSameDayAs: startOfToday)
            }
            return calendar.isDate(startAt, inSameDayAs: startOfToday)
        }
        results.append(contentsOf: todayEntries.map { .entry($0) })

        // Today's tasks
        let todayTasks = store.tasks.filter { task in
            if let scheduled = task.scheduledAt, calendar.isDate(scheduled, inSameDayAs: startOfToday) {
                return true
            }
            if let due = task.dueAt, calendar.isDate(due, inSameDayAs: startOfToday) {
                return true
            }
            return false
        }
        results.append(contentsOf: todayTasks.map { .task($0) })

        // Today's habit logs
        let todayHabits = store.habitLogs.filter { calendar.isDate($0.date, inSameDayAs: startOfToday) }
        results.append(contentsOf: todayHabits.map { log in
            let def = store.habits.first { $0.id == log.habitId }
            return .habitLog(log, def)
        })

        // Today's tracker logs
        let todayTrackers = store.trackerLogs.filter { calendar.isDate($0.createdAt, inSameDayAs: startOfToday) }
        results.append(contentsOf: todayTrackers.map { log in
            let def = store.trackers.first { $0.id == log.trackerId }
            return .trackerLog(log, def)
        })

        results.sort { $0.timestamp > $1.timestamp }
        return results
    }

    /// Get recent items (last 7 days)
    @MainActor
    public static func recentItems(store: AppStore, days: Int = 7, limit: Int = 50) -> [SearchResult] {
        let calendar = Calendar.current
        let cutoff = calendar.date(byAdding: .day, value: -days, to: Date()) ?? Date()

        var results: [SearchResult] = []

        // Recent entries
        let recentEntries = store.entries.filter { entry in
            let date = entry.startAt ?? entry.createdAt
            return date >= cutoff
        }
        results.append(contentsOf: recentEntries.map { .entry($0) })

        // Recent tasks
        let recentTasks = store.tasks.filter { task in
            if let scheduled = task.scheduledAt, scheduled >= cutoff { return true }
            if let due = task.dueAt, due >= cutoff { return true }
            return false
        }
        results.append(contentsOf: recentTasks.map { .task($0) })

        // Recent notes
        let recentNotes = store.notes.filter { $0.createdAt >= cutoff }
        results.append(contentsOf: recentNotes.map { .note($0) })

        results.sort { $0.timestamp > $1.timestamp }
        return Array(results.prefix(limit))
    }
}
