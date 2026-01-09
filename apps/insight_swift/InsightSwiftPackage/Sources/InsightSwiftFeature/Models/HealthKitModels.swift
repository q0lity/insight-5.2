import Foundation
import HealthKit

// MARK: - Workout Template

/// Maps to workout_sessions.template column (strength|cardio|mobility)
public enum WorkoutTemplate: String, Codable, CaseIterable, Sendable {
    case strength
    case cardio
    case mobility
}

// MARK: - Nutrition Source

/// Maps to nutrition_logs.source column (estimate|manual|import)
public enum NutritionSource: String, Codable, CaseIterable, Sendable {
    case estimate
    case manual
    case `import`
}

// MARK: - Meal Type

/// Time-window based meal classification
public enum MealType: String, Codable, CaseIterable, Sendable {
    case breakfast
    case lunch
    case dinner
    case snack

    /// Determine meal type from hour of day
    public static func from(hour: Int) -> MealType {
        switch hour {
        case 5..<10:
            return .breakfast
        case 11..<14:
            return .lunch
        case 17..<21:
            return .dinner
        default:
            return .snack
        }
    }

    /// Determine meal type from date
    public static func from(date: Date) -> MealType {
        let hour = Calendar.current.component(.hour, from: date)
        return from(hour: hour)
    }
}

// MARK: - Workout Session

/// Maps to workout_sessions table (minimal - time data lives on Entry)
public struct WorkoutSession: Identifiable, Codable, Hashable, Sendable {
    public var id: UUID
    public var entryId: UUID              // Required FK to entries
    public var template: WorkoutTemplate  // strength|cardio|mobility

    public init(id: UUID = UUID(), entryId: UUID, template: WorkoutTemplate) {
        self.id = id
        self.entryId = entryId
        self.template = template
    }
}

// MARK: - Workout Row

/// Maps to workout_rows table (summary row per session)
public struct WorkoutRow: Identifiable, Codable, Hashable, Sendable {
    public var id: UUID
    public var sessionId: UUID
    public var exercise: String
    public var durationSeconds: Int?
    public var distance: Double?
    public var distanceUnit: String?
    public var calories: Double?
    public var notes: String?

    public init(
        id: UUID = UUID(),
        sessionId: UUID,
        exercise: String,
        durationSeconds: Int? = nil,
        distance: Double? = nil,
        distanceUnit: String? = nil,
        calories: Double? = nil,
        notes: String? = nil
    ) {
        self.id = id
        self.sessionId = sessionId
        self.exercise = exercise
        self.durationSeconds = durationSeconds
        self.distance = distance
        self.distanceUnit = distanceUnit
        self.calories = calories
        self.notes = notes
    }
}

// MARK: - Nutrition Log

/// Maps to nutrition_logs table
public struct NutritionLog: Identifiable, Codable, Hashable, Sendable {
    public var id: UUID
    public var entryId: UUID              // Required FK to entries
    public var calories: Double?
    public var proteinG: Double?
    public var carbsG: Double?
    public var fatG: Double?
    public var confidence: Double?        // 0.0-1.0
    public var source: NutritionSource
    public var showOnCalendar: Bool       // Controls Entry facet: .event vs .note

    public init(
        id: UUID = UUID(),
        entryId: UUID,
        calories: Double? = nil,
        proteinG: Double? = nil,
        carbsG: Double? = nil,
        fatG: Double? = nil,
        confidence: Double? = nil,
        source: NutritionSource = .estimate,
        showOnCalendar: Bool = true
    ) {
        self.id = id
        self.entryId = entryId
        self.calories = calories
        self.proteinG = proteinG
        self.carbsG = carbsG
        self.fatG = fatG
        self.confidence = confidence
        self.source = source
        self.showOnCalendar = showOnCalendar
    }
}

// MARK: - Activity Type Mapping

/// Pure function to map HKWorkoutActivityType to WorkoutTemplate
public func mapActivityType(_ activityType: HKWorkoutActivityType) -> WorkoutTemplate {
    switch activityType {
    // Strength training
    case .traditionalStrengthTraining,
         .functionalStrengthTraining,
         .crossTraining:
        return .strength

    // Mobility/flexibility
    case .yoga,
         .pilates,
         .flexibility,
         .mindAndBody:
        return .mobility

    // Everything else is cardio (running, cycling, swimming, walking, etc.)
    default:
        return .cardio
    }
}

// MARK: - Nutrition Sample Aggregation

/// Intermediate struct for meal grouping
public struct MealGroup: Sendable {
    public let mealType: MealType
    public let date: Date
    public var calories: Double
    public var proteinG: Double
    public var carbsG: Double
    public var fatG: Double
    public var sampleCount: Int

    public init(mealType: MealType, date: Date) {
        self.mealType = mealType
        self.date = date
        self.calories = 0
        self.proteinG = 0
        self.carbsG = 0
        self.fatG = 0
        self.sampleCount = 0
    }

    /// Calculate confidence based on number of samples (more samples = higher confidence)
    public var confidence: Double {
        min(1.0, Double(sampleCount) / 10.0)
    }
}

/// Group nutrition samples into meals by time window
/// - Parameter samples: Dictionary keyed by nutrient type ("calories", "protein", "carbs", "fat")
/// - Parameter date: The date to group samples for
/// - Returns: Array of meal groups
public func groupNutritionToMeals(
    _ samples: [String: [(date: Date, value: Double)]],
    for date: Date
) -> [MealGroup] {
    // Get start and end of the target date
    let calendar = Calendar.current
    guard let startOfDay = calendar.date(from: calendar.dateComponents([.year, .month, .day], from: date)),
          let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay) else {
        return []
    }

    // Initialize meal groups
    var mealGroups: [MealType: MealGroup] = [:]
    for mealType in MealType.allCases {
        mealGroups[mealType] = MealGroup(mealType: mealType, date: date)
    }

    // Process each nutrient type
    for (nutrientType, nutrientSamples) in samples {
        for sample in nutrientSamples {
            // Filter to samples within the target date
            guard sample.date >= startOfDay && sample.date < endOfDay else { continue }

            let mealType = MealType.from(date: sample.date)
            guard var group = mealGroups[mealType] else { continue }

            switch nutrientType {
            case "calories":
                group.calories += sample.value
                group.sampleCount += 1
            case "protein":
                group.proteinG += sample.value
            case "carbs":
                group.carbsG += sample.value
            case "fat":
                group.fatG += sample.value
            default:
                break
            }

            mealGroups[mealType] = group
        }
    }

    // Return only meals that have data
    return mealGroups.values
        .filter { $0.sampleCount > 0 }
        .sorted { $0.mealType.rawValue < $1.mealType.rawValue }
}

// MARK: - Duplicate Detection

/// Check if an entry with the given HealthKit UUID already exists
/// - Parameter healthKitUUID: The HealthKit sample UUID
/// - Parameter entries: Array of existing entries to check
/// - Returns: true if duplicate exists
public func isDuplicateHealthKitImport(healthKitUUID: UUID, in entries: [Entry]) -> Bool {
    entries.contains { entry in
        guard let frontmatter = entry.frontmatter,
              case .string(let uuidString) = frontmatter["healthKitUUID"],
              let existingUUID = UUID(uuidString: uuidString) else {
            return false
        }
        return existingUUID == healthKitUUID
    }
}
