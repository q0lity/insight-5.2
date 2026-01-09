import Foundation
import Testing
import HealthKit
@testable import InsightSwiftFeature

struct HealthKitDataTests {
    // MARK: - mapActivityType Tests

    @Test("mapActivityType maps running to cardio (happy path)")
    func mapActivityTypeRunning() {
        let result = mapActivityType(.running)
        #expect(result == .cardio)
    }

    @Test("mapActivityType maps strength training to strength")
    func mapActivityTypeStrength() {
        let result = mapActivityType(.traditionalStrengthTraining)
        #expect(result == .strength)
    }

    @Test("mapActivityType maps yoga to mobility")
    func mapActivityTypeMobility() {
        let result = mapActivityType(.yoga)
        #expect(result == .mobility)
    }

    @Test("mapActivityType defaults unknown activity to cardio (edge case)")
    func mapActivityTypeUnknown() {
        let result = mapActivityType(.other)
        #expect(result == .cardio)
    }

    @Test("mapActivityType maps all strength variations correctly")
    func mapActivityTypeAllStrength() {
        #expect(mapActivityType(.traditionalStrengthTraining) == .strength)
        #expect(mapActivityType(.functionalStrengthTraining) == .strength)
        #expect(mapActivityType(.crossTraining) == .strength)
    }

    @Test("mapActivityType maps all mobility variations correctly")
    func mapActivityTypeAllMobility() {
        #expect(mapActivityType(.yoga) == .mobility)
        #expect(mapActivityType(.pilates) == .mobility)
        #expect(mapActivityType(.flexibility) == .mobility)
        #expect(mapActivityType(.mindAndBody) == .mobility)
    }

    // MARK: - MealType Time Window Tests

    @Test("MealType classifies early morning as breakfast")
    func mealTypeBreakfast() {
        #expect(MealType.from(hour: 7) == .breakfast)
        #expect(MealType.from(hour: 5) == .breakfast)
        #expect(MealType.from(hour: 9) == .breakfast)
    }

    @Test("MealType classifies midday as lunch")
    func mealTypeLunch() {
        #expect(MealType.from(hour: 12) == .lunch)
        #expect(MealType.from(hour: 11) == .lunch)
        #expect(MealType.from(hour: 13) == .lunch)
    }

    @Test("MealType classifies evening as dinner")
    func mealTypeDinner() {
        #expect(MealType.from(hour: 18) == .dinner)
        #expect(MealType.from(hour: 17) == .dinner)
        #expect(MealType.from(hour: 20) == .dinner)
    }

    @Test("MealType classifies other times as snack")
    func mealTypeSnack() {
        #expect(MealType.from(hour: 3) == .snack)
        #expect(MealType.from(hour: 15) == .snack)
        #expect(MealType.from(hour: 22) == .snack)
    }

    @Test("MealType from Date extracts hour correctly")
    func mealTypeFromDate() {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0) ?? .current
        let lunchDate = calendar.date(from: DateComponents(year: 2026, month: 1, day: 7, hour: 12, minute: 30))!
        #expect(MealType.from(date: lunchDate) == .lunch)
    }

    // MARK: - groupNutritionToMeals Tests

    @Test("groupNutritionToMeals returns empty array for empty input (failure path)")
    func groupNutritionEmptyInput() {
        let result = groupNutritionToMeals([:], for: Date())
        #expect(result.isEmpty)
    }

    @Test("groupNutritionToMeals groups samples by meal time window")
    func groupNutritionByTimeWindow() {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0) ?? .current
        let baseDate = calendar.date(from: DateComponents(year: 2026, month: 1, day: 7))!
        let breakfastTime = calendar.date(bySettingHour: 8, minute: 0, second: 0, of: baseDate)!
        let lunchTime = calendar.date(bySettingHour: 12, minute: 30, second: 0, of: baseDate)!

        let samples: [String: [(date: Date, value: Double)]] = [
            "calories": [
                (date: breakfastTime, value: 400),
                (date: lunchTime, value: 600)
            ],
            "protein": [
                (date: breakfastTime, value: 20),
                (date: lunchTime, value: 35)
            ]
        ]

        let result = groupNutritionToMeals(samples, for: baseDate)

        #expect(result.count == 2)

        let breakfast = result.first { $0.mealType == .breakfast }
        let lunch = result.first { $0.mealType == .lunch }

        #expect(breakfast != nil)
        #expect(breakfast?.calories == 400)
        #expect(breakfast?.proteinG == 20)

        #expect(lunch != nil)
        #expect(lunch?.calories == 600)
        #expect(lunch?.proteinG == 35)
    }

    @Test("groupNutritionToMeals aggregates multiple samples in same meal window")
    func groupNutritionAggregation() {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0) ?? .current
        let baseDate = calendar.date(from: DateComponents(year: 2026, month: 1, day: 7))!
        let morning1 = calendar.date(bySettingHour: 7, minute: 0, second: 0, of: baseDate)!
        let morning2 = calendar.date(bySettingHour: 8, minute: 30, second: 0, of: baseDate)!

        let samples: [String: [(date: Date, value: Double)]] = [
            "calories": [
                (date: morning1, value: 200),
                (date: morning2, value: 300)
            ]
        ]

        let result = groupNutritionToMeals(samples, for: baseDate)

        #expect(result.count == 1)
        #expect(result[0].mealType == .breakfast)
        #expect(result[0].calories == 500)
    }

    @Test("groupNutritionToMeals filters samples outside target date")
    func groupNutritionFiltersOtherDays() {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0) ?? .current
        let baseDate = calendar.date(from: DateComponents(year: 2026, month: 1, day: 7))!
        let yesterday = calendar.date(byAdding: .day, value: -1, to: baseDate)!
        let todayMorning = calendar.date(bySettingHour: 8, minute: 0, second: 0, of: baseDate)!

        let samples: [String: [(date: Date, value: Double)]] = [
            "calories": [
                (date: yesterday, value: 1000),
                (date: todayMorning, value: 400)
            ]
        ]

        let result = groupNutritionToMeals(samples, for: baseDate)

        #expect(result.count == 1)
        #expect(result[0].calories == 400)
    }

    // MARK: - MealGroup Confidence Tests

    @Test("MealGroup confidence scales with sample count")
    func mealGroupConfidence() {
        var group = MealGroup(mealType: .breakfast, date: Date())
        #expect(group.confidence == 0.0)

        group.sampleCount = 5
        #expect(group.confidence == 0.5)

        group.sampleCount = 10
        #expect(group.confidence == 1.0)

        group.sampleCount = 20
        #expect(group.confidence == 1.0) // Capped at 1.0
    }

    // MARK: - Duplicate Detection Tests

    @Test("isDuplicateHealthKitImport returns false for empty entries")
    func duplicateDetectionEmptyEntries() {
        let uuid = UUID()
        let result = isDuplicateHealthKitImport(healthKitUUID: uuid, in: [])
        #expect(result == false)
    }

    @Test("isDuplicateHealthKitImport returns false when no match")
    func duplicateDetectionNoMatch() {
        let uuid = UUID()
        let entry = Entry(
            title: "Test Entry",
            facets: [.event],
            frontmatter: ["healthKitUUID": .string(UUID().uuidString)]
        )
        let result = isDuplicateHealthKitImport(healthKitUUID: uuid, in: [entry])
        #expect(result == false)
    }

    @Test("isDuplicateHealthKitImport returns true when UUID matches")
    func duplicateDetectionMatch() {
        let uuid = UUID()
        let entry = Entry(
            title: "Test Entry",
            facets: [.event],
            frontmatter: ["healthKitUUID": .string(uuid.uuidString)]
        )
        let result = isDuplicateHealthKitImport(healthKitUUID: uuid, in: [entry])
        #expect(result == true)
    }

    @Test("isDuplicateHealthKitImport handles entries without frontmatter")
    func duplicateDetectionNoFrontmatter() {
        let uuid = UUID()
        let entry = Entry(
            title: "Test Entry",
            facets: [.event],
            frontmatter: nil
        )
        let result = isDuplicateHealthKitImport(healthKitUUID: uuid, in: [entry])
        #expect(result == false)
    }

    @Test("isDuplicateHealthKitImport handles entries with different frontmatter keys")
    func duplicateDetectionDifferentKeys() {
        let uuid = UUID()
        let entry = Entry(
            title: "Test Entry",
            facets: [.event],
            frontmatter: ["source": .string("manual")]
        )
        let result = isDuplicateHealthKitImport(healthKitUUID: uuid, in: [entry])
        #expect(result == false)
    }
}
