import Foundation
import HealthKit
import Observation

public enum HealthKitAuthorizationStatus: String, Sendable {
    case notDetermined
    case denied
    case authorized
    case unavailable
}

extension HealthKitAuthorizationStatus {
    public var label: String {
        switch self {
        case .notDetermined:
            return "Not requested"
        case .denied:
            return "Denied"
        case .authorized:
            return "Authorized"
        case .unavailable:
            return "Unavailable"
        }
    }

    public var isAuthorized: Bool {
        switch self {
        case .authorized:
            return true
        case .notDetermined, .denied, .unavailable:
            return false
        }
    }
}

@MainActor
@Observable
public final class HealthKitService {
    public let isAvailable: Bool
    public var isEnabled: Bool {
        didSet {
            defaults.set(isEnabled, forKey: Self.enabledKey)
            handleEnabledChange()
        }
    }
    public private(set) var authorizationStatus: HealthKitAuthorizationStatus = .notDetermined
    public private(set) var lastError: String?
    public private(set) var lastSyncAt: Date?
    public private(set) var lastWorkoutSyncAt: Date?
    public private(set) var lastNutritionSyncAt: Date?
    public private(set) var isSyncing: Bool = false

    private let healthStore: HKHealthStore
    private let defaults: UserDefaults

    // Observer queries for background sync
    private var workoutObserverQuery: HKObserverQuery?
    private var nutritionObserverQueries: [HKObserverQuery] = []

    // Weak reference to AppStore for background sync callbacks
    private weak var backgroundSyncAppStore: AppStore?
    public private(set) var isBackgroundSyncEnabled: Bool = false

    private static let enabledKey = "integration.healthkit.enabled"
    private static let lastWorkoutSyncKey = "integration.healthkit.lastWorkoutSyncAt"
    private static let lastNutritionSyncKey = "integration.healthkit.lastNutritionSyncAt"

    public init(healthStore: HKHealthStore = HKHealthStore(), defaults: UserDefaults = .standard) {
        self.healthStore = healthStore
        self.defaults = defaults
        self.isAvailable = HKHealthStore.isHealthDataAvailable()
        self.isEnabled = defaults.object(forKey: Self.enabledKey) as? Bool ?? false
        self.lastWorkoutSyncAt = defaults.object(forKey: Self.lastWorkoutSyncKey) as? Date
        self.lastNutritionSyncAt = defaults.object(forKey: Self.lastNutritionSyncKey) as? Date
        refreshAuthorizationStatus()
    }

    public func refreshAuthorizationStatus() {
        guard isAvailable else {
            authorizationStatus = .unavailable
            return
        }
        let status = healthStore.authorizationStatus(for: HKObjectType.workoutType())
        switch status {
        case .notDetermined:
            authorizationStatus = .notDetermined
        case .sharingDenied:
            authorizationStatus = .denied
        case .sharingAuthorized:
            authorizationStatus = .authorized
        @unknown default:
            authorizationStatus = .notDetermined
        }
    }

    public func requestAuthorizationIfNeeded() async {
        guard isAvailable else {
            authorizationStatus = .unavailable
            lastError = "HealthKit is unavailable on this device."
            return
        }
        refreshAuthorizationStatus()
        lastError = nil

        switch authorizationStatus {
        case .notDetermined:
            let result = await requestAuthorization()
            if let error = result.error {
                lastError = error.localizedDescription
            } else if !result.granted {
                lastError = "Health access not granted."
            }
            refreshAuthorizationStatus()
        case .denied:
            lastError = "Enable Health access in Settings to sync workouts and nutrition."
        case .authorized, .unavailable:
            break
        }
    }

    // MARK: - Workout Fetching

    /// Fetch workouts from HealthKit within a date range
    public func fetchWorkouts(from startDate: Date, to endDate: Date) async throws -> [HKWorkout] {
        guard isAvailable, authorizationStatus.isAuthorized else {
            throw HealthKitError.notAuthorized
        }

        let predicate = HKQuery.predicateForSamples(
            withStart: startDate,
            end: endDate,
            options: .strictStartDate
        )

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: HKObjectType.workoutType(),
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)]
            ) { _, samples, error in
                if let error = error {
                    continuation.resume(throwing: error)
                } else {
                    let workouts = (samples as? [HKWorkout]) ?? []
                    continuation.resume(returning: workouts)
                }
            }
            healthStore.execute(query)
        }
    }

    // MARK: - Nutrition Fetching

    /// Fetch nutrition samples from HealthKit within a date range
    /// Returns dictionary keyed by nutrient type: "calories", "protein", "carbs", "fat"
    public func fetchNutritionSamples(from startDate: Date, to endDate: Date) async throws -> [String: [HKQuantitySample]] {
        guard isAvailable, authorizationStatus.isAuthorized else {
            throw HealthKitError.notAuthorized
        }

        var result: [String: [HKQuantitySample]] = [:]

        // Fetch calories
        if let caloriesType = HKQuantityType.quantityType(forIdentifier: .dietaryEnergyConsumed) {
            result["calories"] = try await fetchQuantitySamples(type: caloriesType, from: startDate, to: endDate)
        }

        // Fetch protein
        if let proteinType = HKQuantityType.quantityType(forIdentifier: .dietaryProtein) {
            result["protein"] = try await fetchQuantitySamples(type: proteinType, from: startDate, to: endDate)
        }

        // Fetch carbs
        if let carbsType = HKQuantityType.quantityType(forIdentifier: .dietaryCarbohydrates) {
            result["carbs"] = try await fetchQuantitySamples(type: carbsType, from: startDate, to: endDate)
        }

        // Fetch fat
        if let fatType = HKQuantityType.quantityType(forIdentifier: .dietaryFatTotal) {
            result["fat"] = try await fetchQuantitySamples(type: fatType, from: startDate, to: endDate)
        }

        return result
    }

    private func fetchQuantitySamples(type: HKQuantityType, from startDate: Date, to endDate: Date) async throws -> [HKQuantitySample] {
        let predicate = HKQuery.predicateForSamples(
            withStart: startDate,
            end: endDate,
            options: .strictStartDate
        )

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: type,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)]
            ) { _, samples, error in
                if let error = error {
                    continuation.resume(throwing: error)
                } else {
                    let quantitySamples = (samples as? [HKQuantitySample]) ?? []
                    continuation.resume(returning: quantitySamples)
                }
            }
            healthStore.execute(query)
        }
    }

    // MARK: - Sync Operations

    /// Sync workouts from HealthKit (last 7 days by default)
    public func syncWorkouts(entries: [Entry]) async throws -> [WorkoutSyncResult] {
        guard isAvailable, authorizationStatus.isAuthorized else {
            throw HealthKitError.notAuthorized
        }

        isSyncing = true
        defer { isSyncing = false }

        let startDate = lastWorkoutSyncAt ?? Calendar.current.date(byAdding: .day, value: -7, to: Date())!
        let endDate = Date()

        let hkWorkouts = try await fetchWorkouts(from: startDate, to: endDate)

        var results: [WorkoutSyncResult] = []

        for workout in hkWorkouts {
            // Check for duplicates using frontmatter
            if isDuplicateHealthKitImport(healthKitUUID: workout.uuid, in: entries) {
                continue
            }

            let template = mapActivityType(workout.workoutActivityType)
            let title = workoutTitle(for: workout.workoutActivityType, template: template)

            // Calculate duration in minutes
            let durationMinutes = Int(workout.duration / 60)

            // Get calories if available
            var calories: Double?
            if let energyStats = workout.statistics(for: HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)!) {
                calories = energyStats.sumQuantity()?.doubleValue(for: .kilocalorie())
            }

            // Get distance if available
            var distance: Double?
            var distanceUnit: String?
            if let distanceStats = workout.statistics(for: HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning)!) {
                distance = distanceStats.sumQuantity()?.doubleValue(for: .meter())
                distanceUnit = "m"
            }

            let result = WorkoutSyncResult(
                healthKitUUID: workout.uuid,
                template: template,
                title: title,
                startAt: workout.startDate,
                endAt: workout.endDate,
                durationMinutes: durationMinutes,
                calories: calories,
                distance: distance,
                distanceUnit: distanceUnit
            )
            results.append(result)
        }

        // Update last sync timestamp
        lastWorkoutSyncAt = endDate
        defaults.set(endDate, forKey: Self.lastWorkoutSyncKey)
        lastSyncAt = endDate

        return results
    }

    /// Sync nutrition from HealthKit (last 7 days by default)
    public func syncNutrition(entries: [Entry], for date: Date = Date()) async throws -> [NutritionSyncResult] {
        guard isAvailable, authorizationStatus.isAuthorized else {
            throw HealthKitError.notAuthorized
        }

        isSyncing = true
        defer { isSyncing = false }

        let calendar = Calendar.current
        let startDate = lastNutritionSyncAt ?? calendar.date(byAdding: .day, value: -7, to: date)!
        let endDate = date

        let samples = try await fetchNutritionSamples(from: startDate, to: endDate)

        // Convert to the format expected by groupNutritionToMeals
        var convertedSamples: [String: [(date: Date, value: Double)]] = [:]

        for (nutrientType, hkSamples) in samples {
            var values: [(date: Date, value: Double)] = []
            for sample in hkSamples {
                let unit: HKUnit
                switch nutrientType {
                case "calories":
                    unit = .kilocalorie()
                case "protein", "carbs", "fat":
                    unit = .gram()
                default:
                    continue
                }
                let value = sample.quantity.doubleValue(for: unit)
                values.append((date: sample.startDate, value: value))
            }
            convertedSamples[nutrientType] = values
        }

        // Group samples into meals
        var results: [NutritionSyncResult] = []
        var currentDate = startDate

        while currentDate <= endDate {
            let mealGroups = groupNutritionToMeals(convertedSamples, for: currentDate)

            for group in mealGroups {
                let title = "\(group.mealType.rawValue.capitalized)"

                let result = NutritionSyncResult(
                    mealType: group.mealType,
                    title: title,
                    date: currentDate,
                    calories: group.calories > 0 ? group.calories : nil,
                    proteinG: group.proteinG > 0 ? group.proteinG : nil,
                    carbsG: group.carbsG > 0 ? group.carbsG : nil,
                    fatG: group.fatG > 0 ? group.fatG : nil,
                    confidence: group.confidence
                )
                results.append(result)
            }

            currentDate = calendar.date(byAdding: .day, value: 1, to: currentDate)!
        }

        // Update last sync timestamp
        lastNutritionSyncAt = endDate
        defaults.set(endDate, forKey: Self.lastNutritionSyncKey)
        lastSyncAt = endDate

        return results
    }

    // MARK: - Background Sync (HKObserverQuery)

    /// Start background sync with HKObserverQuery for workouts and nutrition.
    /// This registers observers that will be called when HealthKit data changes.
    public func startBackgroundSync(appStore: AppStore) {
        guard isAvailable, authorizationStatus.isAuthorized else {
            lastError = "Cannot start background sync: HealthKit not authorized"
            return
        }

        // Store weak reference for callbacks
        backgroundSyncAppStore = appStore
        isBackgroundSyncEnabled = true

        // Start workout observer
        startWorkoutObserver()

        // Start nutrition observers (one per nutrient type)
        startNutritionObservers()
    }

    /// Stop all background sync observers
    public func stopBackgroundSync() {
        // Stop workout observer
        if let query = workoutObserverQuery {
            healthStore.stop(query)
            workoutObserverQuery = nil
        }

        // Stop all nutrition observers
        for query in nutritionObserverQueries {
            healthStore.stop(query)
        }
        nutritionObserverQueries.removeAll()

        backgroundSyncAppStore = nil
        isBackgroundSyncEnabled = false
    }

    private func startWorkoutObserver() {
        // Stop existing observer if any
        if let existing = workoutObserverQuery {
            healthStore.stop(existing)
        }

        let query = HKObserverQuery(
            sampleType: HKObjectType.workoutType(),
            predicate: nil
        ) { [weak self] _, completionHandler, error in
            guard let self else {
                completionHandler()
                return
            }

            if let error {
                Task { @MainActor in
                    self.lastError = "Workout observer error: \(error.localizedDescription)"
                }
                completionHandler()
                return
            }

            // Trigger sync on main actor
            Task { @MainActor [weak self] in
                guard let self, let appStore = self.backgroundSyncAppStore else { return }
                do {
                    let results = try await self.syncWorkouts(entries: appStore.entries)
                    appStore.applyWorkoutSyncResults(results)
                } catch {
                    self.lastError = "Background workout sync failed: \(error.localizedDescription)"
                }
            }
            completionHandler()
        }

        healthStore.execute(query)
        workoutObserverQuery = query

        // Enable background delivery for workouts
        healthStore.enableBackgroundDelivery(
            for: HKObjectType.workoutType(),
            frequency: .immediate
        ) { success, error in
            if let error {
                Task { @MainActor [weak self] in
                    self?.lastError = "Failed to enable background delivery: \(error.localizedDescription)"
                }
            }
        }
    }

    private func startNutritionObservers() {
        // Stop existing observers
        for query in nutritionObserverQueries {
            healthStore.stop(query)
        }
        nutritionObserverQueries.removeAll()

        // Create observers for each nutrition type
        let nutritionTypes: [HKQuantityTypeIdentifier] = [
            .dietaryEnergyConsumed,
            .dietaryProtein,
            .dietaryCarbohydrates,
            .dietaryFatTotal
        ]

        for identifier in nutritionTypes {
            guard let type = HKQuantityType.quantityType(forIdentifier: identifier) else { continue }

            let query = HKObserverQuery(
                sampleType: type,
                predicate: nil
            ) { [weak self] _, completionHandler, error in
                guard let self else {
                    completionHandler()
                    return
                }

                if let error {
                    Task { @MainActor in
                        self.lastError = "Nutrition observer error: \(error.localizedDescription)"
                    }
                    completionHandler()
                    return
                }

                // Trigger sync on main actor
                Task { @MainActor [weak self] in
                    guard let self, let appStore = self.backgroundSyncAppStore else { return }
                    do {
                        let results = try await self.syncNutrition(entries: appStore.entries)
                        appStore.applyNutritionSyncResults(results)
                    } catch {
                        self.lastError = "Background nutrition sync failed: \(error.localizedDescription)"
                    }
                }
                completionHandler()
            }

            healthStore.execute(query)
            nutritionObserverQueries.append(query)

            // Enable background delivery for this nutrition type
            healthStore.enableBackgroundDelivery(
                for: type,
                frequency: .immediate
            ) { success, error in
                if let error {
                    Task { @MainActor [weak self] in
                        self?.lastError = "Failed to enable nutrition background delivery: \(error.localizedDescription)"
                    }
                }
            }
        }
    }

    // MARK: - Private Helpers

    private func handleEnabledChange() {
        lastError = nil
        if !isEnabled {
            // Stop background sync when disabled
            stopBackgroundSync()
            return
        }
        Task { [weak self] in
            await self?.requestAuthorizationIfNeeded()
        }
    }

    private func requestAuthorization() async -> (granted: Bool, error: Error?) {
        await withCheckedContinuation { continuation in
            healthStore.requestAuthorization(toShare: nil, read: readTypes()) { granted, error in
                continuation.resume(returning: (granted, error))
            }
        }
    }

    private func readTypes() -> Set<HKObjectType> {
        var types: Set<HKObjectType> = [HKObjectType.workoutType()]

        // Workout metrics
        if let energy = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) {
            types.insert(energy)
        }
        if let distance = HKObjectType.quantityType(forIdentifier: .distanceWalkingRunning) {
            types.insert(distance)
        }

        // Nutrition
        if let calories = HKObjectType.quantityType(forIdentifier: .dietaryEnergyConsumed) {
            types.insert(calories)
        }
        if let protein = HKObjectType.quantityType(forIdentifier: .dietaryProtein) {
            types.insert(protein)
        }
        if let carbs = HKObjectType.quantityType(forIdentifier: .dietaryCarbohydrates) {
            types.insert(carbs)
        }
        if let fat = HKObjectType.quantityType(forIdentifier: .dietaryFatTotal) {
            types.insert(fat)
        }

        return types
    }

    private func workoutTitle(for activityType: HKWorkoutActivityType, template: WorkoutTemplate) -> String {
        // Return human-readable title based on activity type
        switch activityType {
        case .running:
            return "Running"
        case .cycling:
            return "Cycling"
        case .swimming:
            return "Swimming"
        case .walking:
            return "Walking"
        case .hiking:
            return "Hiking"
        case .yoga:
            return "Yoga"
        case .pilates:
            return "Pilates"
        case .traditionalStrengthTraining:
            return "Strength Training"
        case .functionalStrengthTraining:
            return "Functional Training"
        case .crossTraining:
            return "Cross Training"
        case .highIntensityIntervalTraining:
            return "HIIT"
        default:
            return template.rawValue.capitalized
        }
    }
}

// MARK: - Error Types

public enum HealthKitError: Error, LocalizedError {
    case notAuthorized
    case queryFailed(Error)
    case unavailable

    public var errorDescription: String? {
        switch self {
        case .notAuthorized:
            return "HealthKit access not authorized"
        case .queryFailed(let error):
            return "HealthKit query failed: \(error.localizedDescription)"
        case .unavailable:
            return "HealthKit is not available on this device"
        }
    }
}

// MARK: - Sync Result Types

/// Result of syncing a workout from HealthKit
public struct WorkoutSyncResult: Sendable {
    public let healthKitUUID: UUID
    public let template: WorkoutTemplate
    public let title: String
    public let startAt: Date
    public let endAt: Date
    public let durationMinutes: Int
    public let calories: Double?
    public let distance: Double?
    public let distanceUnit: String?
}

/// Result of syncing nutrition from HealthKit
public struct NutritionSyncResult: Sendable {
    public let mealType: MealType
    public let title: String
    public let date: Date
    public let calories: Double?
    public let proteinG: Double?
    public let carbsG: Double?
    public let fatG: Double?
    public let confidence: Double
}
