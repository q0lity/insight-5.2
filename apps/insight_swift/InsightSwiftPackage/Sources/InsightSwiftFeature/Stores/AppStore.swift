import Foundation
import Observation

@MainActor
@Observable
public final class AppStore {
    @ObservationIgnored private var persistence: LocalPersistenceService?
    @ObservationIgnored private var liveActivityManager: LiveActivityManager?
    @ObservationIgnored private var notificationService: NotificationService?
    @ObservationIgnored private(set) var syncService: SupabaseSyncService?

    public var entries: [Entry]
    public var tasks: [TodoTask]
    public var notes: [Note]
    public var goals: [Goal]
    public var projects: [Project]
    public var habits: [HabitDefinition]
    public var habitLogs: [HabitLog]
    public var trackers: [TrackerDefinition]
    public var trackerLogs: [TrackerLog]
    public var workoutSessions: [WorkoutSession]
    public var workoutRows: [WorkoutRow]
    public var nutritionLogs: [NutritionLog]
    public var people: [Person]
    public var places: [Place]
    public var tags: [TagItem]
    public var rewards: [Reward]
    public var reports: [ReportCard]
    public var reflections: [Reflection]
    public var focusSessions: [FocusSession]
    public var activeFocusSession: FocusSession?
    public var assistantMessages: [AssistantMessage]
    public var planOutline: String
    public var savedViews: [SavedView]

    public init(
        entries: [Entry] = [],
        tasks: [TodoTask] = [],
        notes: [Note] = [],
        goals: [Goal] = [],
        projects: [Project] = [],
        habits: [HabitDefinition] = [],
        habitLogs: [HabitLog] = [],
        trackers: [TrackerDefinition] = [],
        trackerLogs: [TrackerLog] = [],
        workoutSessions: [WorkoutSession] = [],
        workoutRows: [WorkoutRow] = [],
        nutritionLogs: [NutritionLog] = [],
        people: [Person] = [],
        places: [Place] = [],
        tags: [TagItem] = [],
        rewards: [Reward] = [],
        reports: [ReportCard] = [],
        reflections: [Reflection] = [],
        focusSessions: [FocusSession] = [],
        activeFocusSession: FocusSession? = nil,
        assistantMessages: [AssistantMessage] = [],
        planOutline: String = "",
        savedViews: [SavedView] = []
    ) {
        self.entries = entries
        self.tasks = tasks
        self.notes = notes
        self.goals = goals
        self.projects = projects
        self.habits = habits
        self.habitLogs = habitLogs
        self.trackers = trackers
        self.trackerLogs = trackerLogs
        self.workoutSessions = workoutSessions
        self.workoutRows = workoutRows
        self.nutritionLogs = nutritionLogs
        self.people = people
        self.places = places
        self.tags = tags
        self.rewards = rewards
        self.reports = reports
        self.reflections = reflections
        self.focusSessions = focusSessions
        self.activeFocusSession = activeFocusSession
        self.assistantMessages = assistantMessages
        self.planOutline = planOutline
        self.savedViews = savedViews
    }

    public func attachPersistence(_ persistence: LocalPersistenceService) {
        self.persistence = persistence
    }

    public func attachLiveActivityManager(_ manager: LiveActivityManager) {
        self.liveActivityManager = manager
    }

    public func attachNotificationService(_ service: NotificationService) {
        self.notificationService = service
    }

    public func attachSyncService(_ service: SupabaseSyncService) {
        self.syncService = service
    }

    private func persist() {
        persistence?.save(from: self)
    }

    public static func seeded() -> AppStore {
        let now = Date()
        let calendar = Calendar.current
        let dayStart = calendar.startOfDay(for: now)
        func timeToday(hour: Int, minute: Int) -> Date {
            calendar.date(bySettingHour: hour, minute: minute, second: 0, of: now) ?? now
        }
        var entries = [
            Entry(title: "Morning focus block", facets: [.event], startAt: timeToday(hour: 9, minute: 0), endAt: timeToday(hour: 10, minute: 30), tags: ["work"], contexts: ["deep-work"]),
            Entry(title: "Team sync", facets: [.event], startAt: timeToday(hour: 14, minute: 0), endAt: timeToday(hour: 14, minute: 45), tags: ["work"], people: ["Alex"]),
            Entry(title: "Weekly review", facets: [.event], startAt: timeToday(hour: 16, minute: 0), endAt: timeToday(hour: 16, minute: 45), tags: ["planning"], recurrenceRule: RecurrenceRule(frequency: .weekly)),
            Entry(title: "Dad birthday", facets: [.event], startAt: dayStart, endAt: calendar.date(byAdding: .day, value: 1, to: dayStart), allDay: true, tags: ["family"])
        ]
        let tasks = [
            TodoTask(title: "Outline weekly plan", dueAt: now.addingTimeInterval(24 * 3600), scheduledAt: timeToday(hour: 11, minute: 0), estimateMinutes: 45, tags: ["planning"]),
            TodoTask(title: "Call mom", status: .inProgress, dueAt: now.addingTimeInterval(2 * 3600), scheduledAt: timeToday(hour: 18, minute: 0), estimateMinutes: 20, tags: ["family"], recurrenceRule: RecurrenceRule(frequency: .weekly)),
            TodoTask(title: "Inbox cleanup", dueAt: now.addingTimeInterval(24 * 3600), tags: ["admin"])
        ]
        let notes = [
            Note(title: "Daily reflection", body: "Energy was high after the workout."),
            Note(title: "Ideas", body: "Add habit heatmap to dashboard.")
        ]
        let goals = [
            Goal(title: "Get shredded", importance: 8),
            Goal(title: "Ship Insight", importance: 9)
        ]
        let projects = [
            Project(title: "Strength cycle"),
            Project(title: "Insight Swift build")
        ]
        var liftWeights = HabitDefinition(title: "Lift weights", importance: 8, difficulty: 7)
        liftWeights.isTimed = true
        liftWeights.scheduledAt = timeToday(hour: 7, minute: 0)
        liftWeights.durationMinutes = 60
        liftWeights.recurrenceRule = RecurrenceRule(frequency: .weekly)

        var morningSunlight = HabitDefinition(title: "Morning sunlight", importance: 6, difficulty: 2)
        morningSunlight.isTimed = true
        morningSunlight.scheduledAt = timeToday(hour: 7, minute: 45)
        morningSunlight.durationMinutes = 20
        morningSunlight.recurrenceRule = RecurrenceRule(frequency: .daily)

        let habits = [
            liftWeights,
            morningSunlight
        ]
        let trackers = [
            TrackerDefinition(key: "mood", unit: "1-10"),
            TrackerDefinition(key: "energy", unit: "1-10")
        ]
        // Create workout entries and sessions
        let workoutEntry1 = Entry(
            title: "Push day",
            facets: [.event],
            startAt: timeToday(hour: 7, minute: 0),
            endAt: timeToday(hour: 7, minute: 55),
            tags: ["fitness"],
            contexts: ["gym"]
        )
        let workoutEntry2 = Entry(
            title: "Zone 2 run",
            facets: [.event],
            startAt: calendar.date(byAdding: .day, value: -1, to: timeToday(hour: 6, minute: 30))!,
            endAt: calendar.date(byAdding: .day, value: -1, to: timeToday(hour: 7, minute: 5))!,
            tags: ["fitness"],
            contexts: ["outdoor"]
        )
        let workoutSessions = [
            WorkoutSession(entryId: workoutEntry1.id, template: .strength),
            WorkoutSession(entryId: workoutEntry2.id, template: .cardio)
        ]
        let workoutRows = [
            WorkoutRow(sessionId: workoutSessions[0].id, exercise: "Push day", durationSeconds: 55 * 60, calories: 320),
            WorkoutRow(sessionId: workoutSessions[1].id, exercise: "Zone 2 run", durationSeconds: 35 * 60, distance: 5200, distanceUnit: "m", calories: 280)
        ]
        // Create nutrition entries and logs
        let nutritionEntry1 = Entry(
            title: "Breakfast",
            facets: [.event],
            startAt: timeToday(hour: 8, minute: 0),
            endAt: timeToday(hour: 8, minute: 20),
            tags: ["nutrition"]
        )
        let nutritionEntry2 = Entry(
            title: "Lunch",
            facets: [.event],
            startAt: timeToday(hour: 12, minute: 30),
            endAt: timeToday(hour: 13, minute: 0),
            tags: ["nutrition"]
        )
        let nutritionLogs = [
            NutritionLog(entryId: nutritionEntry1.id, calories: 420, proteinG: 32, carbsG: 45, fatG: 12, confidence: 0.8, source: .estimate),
            NutritionLog(entryId: nutritionEntry2.id, calories: 680, proteinG: 48, carbsG: 52, fatG: 24, confidence: 0.7, source: .estimate)
        ]
        // Add workout and nutrition entries to entries array
        entries.append(contentsOf: [workoutEntry1, workoutEntry2, nutritionEntry1, nutritionEntry2])
        let people = [
            Person(name: "Alex", lastSeenAt: now.addingTimeInterval(-86_400)),
            Person(name: "Dr. Chen", lastSeenAt: now.addingTimeInterval(-172_800))
        ]
        let places = [
            Place(name: "Home Gym", category: "Fitness"),
            Place(name: "Clinic", category: "Work")
        ]
        let tags = [
            TagItem(name: "deep-work", colorHex: "#5B5F97"),
            TagItem(name: "recovery", colorHex: "#7BAF7B"),
            TagItem(name: "family", colorHex: "#C88B9D")
        ]
        let rewards = [
            Reward(title: "New lifting straps", pointsCost: 120),
            Reward(title: "Spa day", pointsCost: 300)
        ]
        let reports = [
            ReportCard(title: "Focus Hours", subtitle: "Last 7 days", value: "18.4h", delta: "+12%"),
            ReportCard(title: "Habit Streak", subtitle: "Best run", value: "9 days", delta: "+3 days")
        ]
        let reflections = [
            Reflection(prompt: "What energized you today?", response: "Heavy squat session and a short walk."),
            Reflection(prompt: "What needs attention tomorrow?", response: "Triage inbox before clinic.")
        ]
        let focusSessions = [
            FocusSession(title: "Deep work", startedAt: now.addingTimeInterval(-5400), endedAt: now.addingTimeInterval(-3600), notes: "Drafted PRD.", importance: 7, difficulty: 6),
            FocusSession(title: "Stretch & recovery", startedAt: now.addingTimeInterval(-7200), endedAt: now.addingTimeInterval(-6600), notes: "Mobility routine.", importance: 5, difficulty: 3)
        ]
        let assistantMessages = [
            AssistantMessage(role: .assistant, content: "Ask me to summarize, search, or plan your day.")
        ]
        let planOutline = """
# Clinic Admin
- [ ] Submit report (45m)
- [ ] Draft clinic summary (60m)
  - [ ] Order meds (20m)

# Personal
- [ ] Groceries for dinner (30m)
"""
        return AppStore(
            entries: entries,
            tasks: tasks,
            notes: notes,
            goals: goals,
            projects: projects,
            habits: habits,
            trackers: trackers,
            workoutSessions: workoutSessions,
            workoutRows: workoutRows,
            nutritionLogs: nutritionLogs,
            people: people,
            places: places,
            tags: tags,
            rewards: rewards,
            reports: reports,
            reflections: reflections,
            focusSessions: focusSessions,
            activeFocusSession: nil,
            assistantMessages: assistantMessages,
            planOutline: planOutline
        )
    }

    public func addEntry(title: String) {
        let entry = Entry(title: title, facets: [.note], startAt: Date())
        entries.insert(entry, at: 0)
        notes.insert(Note(id: entry.id, title: title, body: "", createdAt: entry.startAt ?? Date()), at: 0)
        persist()
    }

    public func createEvent(title: String, startAt: Date, endAt: Date, allDay: Bool = false) {
        let entry = Entry(title: title, facets: [.event], startAt: startAt, endAt: endAt, allDay: allDay)
        entries.insert(entry, at: 0)
        persist()
    }

    public func scheduleEntry(id: UUID, startAt: Date, endAt: Date, allDay: Bool = false) {
        guard let idx = entries.firstIndex(where: { $0.id == id }) else { return }
        entries[idx].startAt = startAt
        entries[idx].endAt = endAt
        entries[idx].allDay = allDay
        persist()
    }

    public func addEntryRecurrenceException(id: UUID, originalStartAt: Date, startAt: Date, endAt: Date, allDay: Bool) {
        guard let idx = entries.firstIndex(where: { $0.id == id }) else { return }
        let exception = RecurrenceException(
            originalStartAt: originalStartAt,
            startAt: startAt,
            endAt: endAt,
            allDay: allDay,
            isCancelled: false
        )
        entries[idx].recurrenceExceptions = mergeException(exception, into: entries[idx].recurrenceExceptions)
        persist()
    }

    public func addTask(title: String) {
        tasks.insert(TodoTask(title: title), at: 0)
        persist()
    }

    public func scheduleTask(id: UUID, startAt: Date, endAt: Date? = nil) {
        guard let idx = tasks.firstIndex(where: { $0.id == id }) else { return }
        tasks[idx].scheduledAt = startAt
        if let endAt {
            let minutes = max(5, Int(endAt.timeIntervalSince(startAt) / 60))
            tasks[idx].estimateMinutes = minutes
        } else if tasks[idx].estimateMinutes == nil {
            tasks[idx].estimateMinutes = 60
        }
        persist()
    }

    public func addTaskRecurrenceException(id: UUID, originalStartAt: Date, startAt: Date, endAt: Date) {
        guard let idx = tasks.firstIndex(where: { $0.id == id }) else { return }
        let exception = RecurrenceException(
            originalStartAt: originalStartAt,
            startAt: startAt,
            endAt: endAt,
            allDay: nil,
            isCancelled: false
        )
        tasks[idx].recurrenceExceptions = mergeException(exception, into: tasks[idx].recurrenceExceptions)
        persist()
    }

    public func toggleTask(_ task: TodoTask) {
        guard let idx = tasks.firstIndex(where: { $0.id == task.id }) else { return }
        switch tasks[idx].status {
        case .todo:
            tasks[idx].status = .inProgress
        case .inProgress:
            tasks[idx].status = .done
        case .done:
            tasks[idx].status = .todo
        }
        persist()
    }

    public func updateTask(
        id: UUID,
        title: String,
        status: TaskStatus,
        dueAt: Date?,
        scheduledAt: Date?,
        estimateMinutes: Int?,
        tags: [String],
        people: [String],
        contexts: [String],
        notes: String,
        recurrenceRule: RecurrenceRule? = nil,
        recurrenceExceptions: [RecurrenceException] = [],
        updateRecurrence: Bool = false
    ) {
        guard let idx = tasks.firstIndex(where: { $0.id == id }) else { return }
        tasks[idx].title = title
        tasks[idx].status = status
        tasks[idx].dueAt = dueAt
        tasks[idx].scheduledAt = scheduledAt
        tasks[idx].estimateMinutes = estimateMinutes
        tasks[idx].tags = tags
        tasks[idx].people = people
        tasks[idx].contexts = contexts
        tasks[idx].notes = notes
        if updateRecurrence {
            tasks[idx].recurrenceRule = recurrenceRule
            tasks[idx].recurrenceExceptions = recurrenceExceptions
        }
        persist()
    }

    public func deleteTask(id: UUID) {
        tasks.removeAll { $0.id == id }
        persist()
    }

    public func addNote(title: String, body: String) {
        let note = Note(title: title, body: body)
        notes.insert(note, at: 0)
        if !entries.contains(where: { $0.id == note.id }) {
            let entry = Entry(
                id: note.id,
                title: note.title,
                facets: [.note],
                startAt: note.createdAt,
                tags: [],
                contexts: [],
                people: [],
                notes: note.body
            )
            entries.insert(entry, at: 0)
        }
        persist()
    }

    public func updateNote(
        id: UUID,
        title: String,
        body: String,
        tags: [String],
        people: [String],
        contexts: [String]
    ) {
        if let idx = notes.firstIndex(where: { $0.id == id }) {
            notes[idx].title = title
            notes[idx].body = body
        }
        if let entryIdx = entries.firstIndex(where: { $0.id == id }) {
            entries[entryIdx].title = title
            entries[entryIdx].notes = body
            entries[entryIdx].tags = tags
            entries[entryIdx].people = people
            entries[entryIdx].contexts = contexts
        } else {
            let entry = Entry(
                id: id,
                title: title,
                facets: [.note],
                startAt: notes.first(where: { $0.id == id })?.createdAt,
                tags: tags,
                contexts: contexts,
                people: people,
                notes: body
            )
            entries.insert(entry, at: 0)
        }
        persist()
    }

    public func deleteNote(id: UUID) {
        notes.removeAll { $0.id == id }
        entries.removeAll { $0.id == id }
        persist()
    }

    public func addGoal(title: String) {
        goals.insert(Goal(title: title, importance: 6), at: 0)
        persist()
    }

    public func addProject(title: String) {
        projects.insert(Project(title: title), at: 0)
        persist()
    }

    public func addHabit(title: String, importance: Int = 5, difficulty: Int = 5, targetPerWeek: Int? = nil) {
        var habit = HabitDefinition(title: title, importance: importance, difficulty: difficulty)
        habit.targetPerWeek = targetPerWeek
        habits.insert(habit, at: 0)
        persist()
        Task { await syncHabitReminders() }
    }

    public func updateHabit(
        id: UUID,
        title: String,
        importance: Int,
        difficulty: Int,
        tags: [String],
        people: [String],
        contexts: [String],
        targetPerWeek: Int?,
        scheduledAt: Date?,
        durationMinutes: Int?,
        recurrenceRule: RecurrenceRule? = nil,
        recurrenceExceptions: [RecurrenceException] = [],
        updateRecurrence: Bool = false
    ) {
        guard let idx = habits.firstIndex(where: { $0.id == id }) else { return }
        habits[idx].title = title
        habits[idx].importance = importance
        habits[idx].difficulty = difficulty
        habits[idx].tags = tags
        habits[idx].people = people
        habits[idx].contexts = contexts
        habits[idx].targetPerWeek = targetPerWeek
        habits[idx].scheduledAt = scheduledAt
        if let durationMinutes {
            habits[idx].durationMinutes = max(5, durationMinutes)
        }
        habits[idx].isTimed = scheduledAt != nil
        if updateRecurrence {
            habits[idx].recurrenceRule = recurrenceRule
            habits[idx].recurrenceExceptions = recurrenceExceptions
        }
        persist()
        Task { await syncHabitReminders() }
    }

    public func deleteHabit(id: UUID) {
        habits.removeAll { $0.id == id }
        habitLogs.removeAll { $0.habitId == id }
        persist()
        Task { await syncHabitReminders() }
    }

    public func scheduleHabit(id: UUID, startAt: Date, durationMinutes: Int? = nil) {
        guard let idx = habits.firstIndex(where: { $0.id == id }) else { return }
        habits[idx].scheduledAt = startAt
        if let durationMinutes {
            habits[idx].durationMinutes = max(5, durationMinutes)
        }
        habits[idx].isTimed = true
        if habits[idx].recurrenceRule == nil {
            habits[idx].recurrenceRule = RecurrenceRule(frequency: .daily)
        }
        persist()
        Task { await syncHabitReminders() }
    }

    public func addHabitRecurrenceException(id: UUID, originalStartAt: Date, startAt: Date, endAt: Date) {
        guard let idx = habits.firstIndex(where: { $0.id == id }) else { return }
        let exception = RecurrenceException(
            originalStartAt: originalStartAt,
            startAt: startAt,
            endAt: endAt,
            allDay: nil,
            isCancelled: false
        )
        habits[idx].recurrenceExceptions = mergeException(exception, into: habits[idx].recurrenceExceptions)
        persist()
    }

    private func mergeException(_ exception: RecurrenceException, into existing: [RecurrenceException]) -> [RecurrenceException] {
        let key = exceptionKey(exception.originalStartAt)
        var filtered = existing.filter { exceptionKey($0.originalStartAt) != key }
        filtered.append(exception)
        return filtered
    }

    private func exceptionKey(_ date: Date) -> Int {
        Int(date.timeIntervalSince1970 / 60)
    }

    public func addTracker(key: String, unit: String? = nil) {
        trackers.insert(TrackerDefinition(key: key, unit: unit), at: 0)
        persist()
    }

    public func logHabit(_ habit: HabitDefinition) {
        habitLogs.insert(HabitLog(habitId: habit.id), at: 0)
        persist()
    }

    // MARK: - Habit Notification Sync

    /// Syncs all habit reminders with the notification service
    public func syncHabitReminders() async {
        guard let service = notificationService else { return }

        // Cancel all existing habit reminders
        await service.cancelAllHabitReminders()

        // Schedule reminders for habits with schedules
        for habit in habits where habit.isTimed {
            guard let scheduledAt = habit.scheduledAt else { continue }
            let calendar = Calendar.current
            let hour = calendar.component(.hour, from: scheduledAt)
            let minute = calendar.component(.minute, from: scheduledAt)

            // Determine weekdays from recurrence rule
            var weekdays: [Int]? = nil
            if let rule = habit.recurrenceRule, rule.frequency == .weekly {
                // Weekly habits - schedule for all weekdays by default
                weekdays = [1, 2, 3, 4, 5, 6, 7]
            }

            await service.scheduleHabitReminder(
                habitId: habit.id,
                title: habit.title,
                body: "Time for your habit",
                hour: hour,
                minute: minute,
                weekdays: weekdays
            )
        }
    }

    public func logTracker(_ tracker: TrackerDefinition, value: Double) {
        trackerLogs.insert(TrackerLog(trackerId: tracker.id, value: value), at: 0)
        persist()
    }

    // MARK: - Workout Sessions

    /// Add a workout session with its associated entry
    public func addWorkoutSession(
        title: String,
        template: WorkoutTemplate,
        startAt: Date,
        endAt: Date,
        healthKitUUID: UUID? = nil
    ) -> WorkoutSession {
        var frontmatter: [String: JSONValue]? = nil
        if let uuid = healthKitUUID {
            frontmatter = ["healthKitUUID": .string(uuid.uuidString)]
        }
        let entry = Entry(
            title: title,
            facets: [.event, .habit],  // Workouts count toward habit streaks
            startAt: startAt,
            endAt: endAt,
            tags: ["fitness"],
            source: healthKitUUID != nil ? .import : .app,
            frontmatter: frontmatter
        )
        entries.insert(entry, at: 0)

        let session = WorkoutSession(entryId: entry.id, template: template)
        workoutSessions.insert(session, at: 0)
        persist()
        return session
    }

    /// Update a workout session and its associated entry
    public func updateWorkoutSession(
        id: UUID,
        title: String? = nil,
        template: WorkoutTemplate? = nil,
        startAt: Date? = nil,
        endAt: Date? = nil
    ) {
        guard let sessionIdx = workoutSessions.firstIndex(where: { $0.id == id }) else { return }
        let session = workoutSessions[sessionIdx]

        // Update template if provided
        if let template {
            workoutSessions[sessionIdx].template = template
        }

        // Update associated entry
        if let entryIdx = entries.firstIndex(where: { $0.id == session.entryId }) {
            if let title { entries[entryIdx].title = title }
            if let startAt { entries[entryIdx].startAt = startAt }
            if let endAt { entries[entryIdx].endAt = endAt }
            entries[entryIdx].updatedAt = Date()
        }

        persist()
    }

    /// Update a workout row
    public func updateWorkoutRow(
        id: UUID,
        exercise: String? = nil,
        durationSeconds: Int? = nil,
        distance: Double? = nil,
        distanceUnit: String? = nil,
        calories: Double? = nil,
        notes: String? = nil
    ) {
        guard let idx = workoutRows.firstIndex(where: { $0.id == id }) else { return }
        if let exercise { workoutRows[idx].exercise = exercise }
        if let durationSeconds { workoutRows[idx].durationSeconds = durationSeconds }
        if let distance { workoutRows[idx].distance = distance }
        if let distanceUnit { workoutRows[idx].distanceUnit = distanceUnit }
        if let calories { workoutRows[idx].calories = calories }
        if let notes { workoutRows[idx].notes = notes }
        persist()
    }

    /// Delete a workout row
    public func deleteWorkoutRow(id: UUID) {
        workoutRows.removeAll { $0.id == id }
        persist()
    }

    /// Add a workout row to a session
    public func addWorkoutRow(
        sessionId: UUID,
        exercise: String,
        durationSeconds: Int? = nil,
        distance: Double? = nil,
        distanceUnit: String? = nil,
        calories: Double? = nil,
        notes: String? = nil
    ) {
        let row = WorkoutRow(
            sessionId: sessionId,
            exercise: exercise,
            durationSeconds: durationSeconds,
            distance: distance,
            distanceUnit: distanceUnit,
            calories: calories,
            notes: notes
        )
        workoutRows.insert(row, at: 0)
        persist()
    }

    /// Delete a workout session and its associated rows and entry
    public func deleteWorkoutSession(id: UUID) {
        guard let session = workoutSessions.first(where: { $0.id == id }) else { return }
        workoutRows.removeAll { $0.sessionId == id }
        workoutSessions.removeAll { $0.id == id }
        entries.removeAll { $0.id == session.entryId }
        persist()
    }

    /// Apply workout sync results from HealthKit
    public func applyWorkoutSyncResults(_ results: [WorkoutSyncResult]) {
        for result in results {
            let session = addWorkoutSession(
                title: result.title,
                template: result.template,
                startAt: result.startAt,
                endAt: result.endAt,
                healthKitUUID: result.healthKitUUID
            )
            addWorkoutRow(
                sessionId: session.id,
                exercise: result.title,
                durationSeconds: result.durationMinutes * 60,
                distance: result.distance,
                distanceUnit: result.distanceUnit,
                calories: result.calories
            )
        }
    }

    // MARK: - Nutrition Logs

    /// Add a nutrition log with its associated entry
    public func addNutritionLog(
        title: String,
        date: Date,
        calories: Double? = nil,
        proteinG: Double? = nil,
        carbsG: Double? = nil,
        fatG: Double? = nil,
        confidence: Double? = nil,
        source: NutritionSource = .estimate,
        showOnCalendar: Bool = true,
        healthKitUUID: UUID? = nil
    ) -> NutritionLog {
        var frontmatter: [String: JSONValue]? = nil
        if let uuid = healthKitUUID {
            frontmatter = ["healthKitUUID": .string(uuid.uuidString)]
        }
        let entry = Entry(
            title: title,
            facets: showOnCalendar ? [.event] : [.note],  // User choice per meal
            startAt: date,
            endAt: date.addingTimeInterval(30 * 60), // 30 minute default duration
            tags: ["nutrition"],
            source: healthKitUUID != nil ? .import : .app,
            frontmatter: frontmatter
        )
        entries.insert(entry, at: 0)

        let log = NutritionLog(
            entryId: entry.id,
            calories: calories,
            proteinG: proteinG,
            carbsG: carbsG,
            fatG: fatG,
            confidence: confidence,
            source: source,
            showOnCalendar: showOnCalendar
        )
        nutritionLogs.insert(log, at: 0)
        persist()
        return log
    }

    /// Update a nutrition log and its associated entry
    public func updateNutritionLog(
        id: UUID,
        title: String? = nil,
        date: Date? = nil,
        calories: Double? = nil,
        proteinG: Double? = nil,
        carbsG: Double? = nil,
        fatG: Double? = nil,
        confidence: Double? = nil,
        source: NutritionSource? = nil,
        showOnCalendar: Bool? = nil
    ) {
        guard let logIdx = nutritionLogs.firstIndex(where: { $0.id == id }) else { return }
        let log = nutritionLogs[logIdx]

        // Update nutrition fields
        if let calories { nutritionLogs[logIdx].calories = calories }
        if let proteinG { nutritionLogs[logIdx].proteinG = proteinG }
        if let carbsG { nutritionLogs[logIdx].carbsG = carbsG }
        if let fatG { nutritionLogs[logIdx].fatG = fatG }
        if let confidence { nutritionLogs[logIdx].confidence = confidence }
        if let source { nutritionLogs[logIdx].source = source }
        if let showOnCalendar { nutritionLogs[logIdx].showOnCalendar = showOnCalendar }

        // Update associated entry
        if let entryIdx = entries.firstIndex(where: { $0.id == log.entryId }) {
            if let title { entries[entryIdx].title = title }
            if let date {
                entries[entryIdx].startAt = date
                entries[entryIdx].endAt = date.addingTimeInterval(30 * 60)
            }
            if let showOnCalendar {
                entries[entryIdx].facets = showOnCalendar ? [.event] : [.note]
            }
            entries[entryIdx].updatedAt = Date()
        }

        persist()
    }

    /// Delete a nutrition log and its associated entry
    public func deleteNutritionLog(id: UUID) {
        guard let log = nutritionLogs.first(where: { $0.id == id }) else { return }
        nutritionLogs.removeAll { $0.id == id }
        entries.removeAll { $0.id == log.entryId }
        persist()
    }

    /// Apply nutrition sync results from HealthKit
    public func applyNutritionSyncResults(_ results: [NutritionSyncResult]) {
        for result in results {
            _ = addNutritionLog(
                title: result.title,
                date: result.date,
                calories: result.calories,
                proteinG: result.proteinG,
                carbsG: result.carbsG,
                fatG: result.fatG,
                confidence: result.confidence,
                source: .import
            )
        }
    }

    // MARK: - Lookup Helpers

    /// Get the entry associated with a workout session
    public func entry(for session: WorkoutSession) -> Entry? {
        entries.first { $0.id == session.entryId }
    }

    /// Get workout rows for a session
    public func rows(for session: WorkoutSession) -> [WorkoutRow] {
        workoutRows.filter { $0.sessionId == session.id }
    }

    /// Get the entry associated with a nutrition log
    public func entry(for log: NutritionLog) -> Entry? {
        entries.first { $0.id == log.entryId }
    }

    public func addPerson(name: String) {
        people.insert(Person(name: name), at: 0)
        persist()
    }

    public func addPlace(name: String, category: String) {
        places.insert(Place(name: name, category: category), at: 0)
        persist()
    }

    public func addTag(name: String, colorHex: String = "#8B5CF6") {
        tags.insert(TagItem(name: name, colorHex: colorHex), at: 0)
        persist()
    }

    public func addReward(title: String, pointsCost: Int) {
        rewards.insert(Reward(title: title, pointsCost: pointsCost), at: 0)
        persist()
    }

    public func toggleReward(_ reward: Reward) {
        guard let idx = rewards.firstIndex(where: { $0.id == reward.id }) else { return }
        rewards[idx].redeemedAt = rewards[idx].redeemedAt == nil ? Date() : nil
        persist()
    }

    public func addReflection(prompt: String, response: String) {
        reflections.insert(Reflection(prompt: prompt, response: response), at: 0)
        persist()
    }

    public func startFocusSession(title: String, importance: Int = 5, difficulty: Int = 5, targetDuration: TimeInterval? = nil) {
        let session = FocusSession(title: title, importance: importance, difficulty: difficulty)
        activeFocusSession = session
        persist()
        Task {
            await liveActivityManager?.startFocusActivity(
                title: title,
                startedAt: session.startedAt,
                targetDuration: targetDuration
            )
        }
    }

    public func stopFocusSession() {
        guard var session = activeFocusSession else { return }
        session.endedAt = Date()
        focusSessions.insert(session, at: 0)
        let finalTitle = session.title
        let startedAt = session.startedAt
        activeFocusSession = nil
        persist()
        Task {
            await liveActivityManager?.stop(finalTitle: finalTitle, startedAt: startedAt)
        }
    }

    public func updateActiveFocusNotes(_ notes: String) {
        guard var session = activeFocusSession else { return }
        session.notes = notes
        activeFocusSession = session
        persist()
    }

    public func appendAssistantMessage(role: AssistantRole, content: String) {
        assistantMessages.append(AssistantMessage(role: role, content: content))
        persist()
    }

    public func applyParsedCapture(_ parsed: ParsedCapture, sourceText: String, createNoteWhenNoEvent: Bool = true) {
        let tokens = parsed.tokens
        for tag in tokens.tags where !tags.contains(where: { $0.name == tag }) {
            tags.append(TagItem(name: tag))
        }
        for person in tokens.people where !people.contains(where: { $0.name == person }) {
            people.append(Person(name: person))
        }
        for place in tokens.places where !places.contains(where: { $0.name == place }) {
            places.append(Place(name: place, category: "Captured"))
        }

        let shouldCreateEntry = parsed.activeEvent != nil || createNoteWhenNoEvent
        if shouldCreateEntry {
            let facets: [EntryFacet] = parsed.activeEvent == nil ? [.note] : [.event]
            let title = parsed.activeEvent?.title ?? sourceText
            let entry = Entry(
                title: title,
                facets: facets,
                startAt: Date(),
                tags: tokens.tags,
                contexts: tokens.contexts,
                people: tokens.people,
                notes: sourceText
            )
            entries.insert(entry, at: 0)
        }

        for task in parsed.tasks {
            let status: TaskStatus = task.completed ? .done : .todo
            tasks.insert(TodoTask(title: task.title, status: status), at: 0)
        }

        for log in parsed.trackerLogs {
            guard case .number(let value) = log.value else { continue }
            let tracker = trackers.first(where: { $0.key.lowercased() == log.key.lowercased() }) ?? {
                let newTracker = TrackerDefinition(key: log.key)
                trackers.insert(newTracker, at: 0)
                return newTracker
            }()
            let createdAt = Date(timeIntervalSince1970: log.timestamp / 1000)
            trackerLogs.insert(TrackerLog(trackerId: tracker.id, value: value, createdAt: createdAt), at: 0)
        }

        persist()
    }

    // MARK: - Saved Views

    /// Add a new saved view (sync on mutation)
    public func addSavedView(_ view: SavedView) {
        savedViews.insert(view, at: 0)
        persist()

        // Sync to Supabase immediately
        Task { @MainActor [weak self] in
            guard let syncService = self?.syncService else { return }
            do {
                try await syncService.createSavedView(view)
            } catch {
                // On failure, leave item in local state (already persisted)
                print("Failed to sync new saved view: \(error.localizedDescription)")
            }
        }
    }

    /// Update an existing saved view (sync on mutation)
    public func updateSavedView(_ view: SavedView) {
        guard let idx = savedViews.firstIndex(where: { $0.id == view.id }) else { return }
        var updated = view
        updated.updatedAt = Date()
        savedViews[idx] = updated
        persist()

        // Sync to Supabase immediately
        Task { @MainActor [weak self] in
            guard let syncService = self?.syncService else { return }
            do {
                try await syncService.updateSavedView(updated)
            } catch {
                // On failure, leave item in local state (already persisted)
                print("Failed to sync updated saved view: \(error.localizedDescription)")
            }
        }
    }

    /// Delete a saved view by ID (sync on mutation)
    public func deleteSavedView(id: UUID) {
        savedViews.removeAll { $0.id == id }
        persist()

        // Sync to Supabase immediately
        Task { @MainActor [weak self] in
            guard let syncService = self?.syncService else { return }
            do {
                try await syncService.deleteSavedView(id: id)
            } catch {
                // On failure, item is removed locally but may remain in cloud
                print("Failed to sync deleted saved view: \(error.localizedDescription)")
            }
        }
    }

    /// Toggle pinned state for a saved view (sync on mutation)
    public func toggleSavedViewPinned(id: UUID) {
        guard let idx = savedViews.firstIndex(where: { $0.id == id }) else { return }
        savedViews[idx].options.isPinned.toggle()
        savedViews[idx].updatedAt = Date()
        let updated = savedViews[idx]
        persist()

        // Sync to Supabase immediately
        Task { @MainActor [weak self] in
            guard let syncService = self?.syncService else { return }
            do {
                try await syncService.updateSavedView(updated)
            } catch {
                print("Failed to sync toggled saved view: \(error.localizedDescription)")
            }
        }
    }

    /// Get pinned saved views
    public var pinnedSavedViews: [SavedView] {
        savedViews.filter { $0.options.isPinned }
    }

    /// Get unpinned saved views
    public var unpinnedSavedViews: [SavedView] {
        savedViews.filter { !$0.options.isPinned }
    }

    /// Fetch saved views from cloud (merge: cloud wins for matching IDs)
    public func fetchSavedViewsFromCloud() async {
        guard let syncService else { return }
        do {
            let cloudViews = try await syncService.fetchSavedViews()
            // Merge: cloud wins for conflicts, keep local-only items
            for cloudView in cloudViews {
                if let idx = savedViews.firstIndex(where: { $0.id == cloudView.id }) {
                    // Cloud wins if updated more recently
                    if cloudView.updatedAt > savedViews[idx].updatedAt {
                        savedViews[idx] = cloudView
                    }
                } else {
                    // New from cloud
                    savedViews.append(cloudView)
                }
            }
            persist()
        } catch {
            print("Failed to fetch saved views from cloud: \(error.localizedDescription)")
        }
    }
}
