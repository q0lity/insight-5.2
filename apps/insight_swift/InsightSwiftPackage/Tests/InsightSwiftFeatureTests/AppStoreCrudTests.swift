import Foundation
import Testing
@testable import InsightSwiftFeature

struct AppStoreCrudTests {
    @Test("AppStore task CRUD operations")
    @MainActor
    func taskCrudHappyPath() {
        let appStore = AppStore()
        appStore.addTask(title: "Draft plan")
        #expect(appStore.tasks.count == 1)
        let task = appStore.tasks.first
        #require(task != nil)
        let taskId = task!.id
        let dueAt = Calendar.current.date(byAdding: .day, value: 1, to: Date())
        let scheduledAt = Calendar.current.date(byAdding: .hour, value: 3, to: Date())
        #require(dueAt != nil)
        #require(scheduledAt != nil)

        appStore.updateTask(
            id: taskId,
            title: "Draft weekly plan",
            status: .inProgress,
            dueAt: dueAt,
            scheduledAt: scheduledAt,
            estimateMinutes: 45,
            tags: ["planning", "weekly"],
            people: ["Alex"],
            contexts: ["desk"],
            notes: "Outline top priorities."
        )

        let updated = appStore.tasks.first
        #expect(updated?.title == "Draft weekly plan")
        #expect(updated?.status == .inProgress)
        #expect(updated?.dueAt == dueAt)
        #expect(updated?.scheduledAt == scheduledAt)
        #expect(updated?.estimateMinutes == 45)
        #expect(updated?.tags == ["planning", "weekly"])
        #expect(updated?.people == ["Alex"])
        #expect(updated?.contexts == ["desk"])
        #expect(updated?.notes == "Outline top priorities.")

        appStore.deleteTask(id: task?.id ?? UUID())
        #expect(appStore.tasks.isEmpty)
    }

    @Test("AppStore ignores updates for missing task IDs")
    @MainActor
    func updateTaskFailurePath() {
        let task = TodoTask(title: "Send recap")
        let appStore = AppStore(tasks: [task])

        appStore.updateTask(
            id: UUID(),
            title: "Updated",
            status: .done,
            dueAt: Date(),
            scheduledAt: Date(),
            estimateMinutes: 10,
            tags: [],
            people: [],
            contexts: [],
            notes: "Should not apply"
        )

        #expect(appStore.tasks.first?.title == "Send recap")
        #expect(appStore.tasks.first?.status == .todo)
    }

    @Test("AppStore habit CRUD operations")
    @MainActor
    func habitCrudHappyPath() {
        let appStore = AppStore()
        appStore.addHabit(title: "Mobility", importance: 6, difficulty: 3, targetPerWeek: 4)
        #expect(appStore.habits.count == 1)
        let habit = appStore.habits.first
        #require(habit != nil)
        let habitId = habit!.id
        let scheduledAt = Date()

        appStore.updateHabit(
            id: habitId,
            title: "Mobility",
            importance: 7,
            difficulty: 4,
            tags: ["recovery"],
            people: ["Coach"],
            contexts: ["gym"],
            targetPerWeek: 3,
            scheduledAt: scheduledAt,
            durationMinutes: 25
        )

        let updated = appStore.habits.first
        #expect(updated?.importance == 7)
        #expect(updated?.difficulty == 4)
        #expect(updated?.tags == ["recovery"])
        #expect(updated?.people == ["Coach"])
        #expect(updated?.contexts == ["gym"])
        #expect(updated?.targetPerWeek == 3)
        #expect(updated?.isTimed == true)
        #expect(updated?.durationMinutes == 25)

        appStore.deleteHabit(id: habit?.id ?? UUID())
        #expect(appStore.habits.isEmpty)
    }

    @Test("AppStore note CRUD operations")
    @MainActor
    func noteCrudHappyPath() {
        let appStore = AppStore()
        appStore.addNote(title: "Daily reflection", body: "Energy was high.")
        #expect(appStore.notes.count == 1)
        let note = appStore.notes.first
        #require(note != nil)
        let noteId = note!.id

        appStore.updateNote(
            id: noteId,
            title: "Reflection",
            body: "Energy was steady.",
            tags: ["journal"],
            people: ["Sam"],
            contexts: ["home"]
        )
        let updated = appStore.notes.first
        #expect(updated?.title == "Reflection")
        #expect(updated?.body == "Energy was steady.")
        let entry = appStore.entries.first(where: { $0.id == noteId })
        #expect(entry?.tags == ["journal"])
        #expect(entry?.people == ["Sam"])
        #expect(entry?.contexts == ["home"])

        appStore.deleteNote(id: noteId)
        #expect(appStore.notes.isEmpty)
    }

    @Test("AppStore clamps habit duration when scheduling")
    @MainActor
    func updateHabitEdgeCase() {
        var habit = HabitDefinition(title: "Mobility")
        habit.durationMinutes = 20
        let appStore = AppStore(habits: [habit])
        let scheduledAt = Date()

        appStore.updateHabit(
            id: habit.id,
            title: "Mobility",
            importance: 6,
            difficulty: 3,
            tags: [],
            people: [],
            contexts: [],
            targetPerWeek: 3,
            scheduledAt: scheduledAt,
            durationMinutes: 1
        )

        let updated = appStore.habits.first
        #expect(updated?.isTimed == true)
        #expect(updated?.durationMinutes == 5)
    }

    @Test("Recurring task updates create a single-occurrence exception")
    @MainActor
    func recurringTaskExceptionEdgeCase() {
        let start = Date()
        var task = TodoTask(title: "Daily check-in", status: .todo, dueAt: nil, scheduledAt: start, estimateMinutes: 30)
        task.recurrenceRule = RecurrenceRule(frequency: .daily)
        let appStore = AppStore(tasks: [task])

        let movedStart = Calendar.current.date(byAdding: .hour, value: 2, to: start)!
        appStore.addTaskRecurrenceException(id: task.id, originalStartAt: start, startAt: movedStart, endAt: movedStart.addingTimeInterval(1800))

        let updated = appStore.tasks.first
        #require(updated != nil)
        #expect(updated?.scheduledAt == start)
        #expect(updated?.recurrenceExceptions.count == 1)
        #expect(updated?.recurrenceExceptions.first?.originalStartAt == start)
    }
}
