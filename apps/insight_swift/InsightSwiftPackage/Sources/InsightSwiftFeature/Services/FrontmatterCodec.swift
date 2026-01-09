import Foundation

struct FrontmatterCodec {
    static func merge(
        existing: FrontmatterPayload?,
        allDay: Bool?,
        recurrenceRule: RecurrenceRule?,
        recurrenceExceptions: [RecurrenceException]
    ) -> FrontmatterPayload? {
        var payload = existing ?? [:]
        var recurrenceObject = payload["recurrence"]?.objectValue ?? [:]

        if let allDay {
            payload["allDay"] = .bool(allDay)
        }

        if let recurrenceRule {
            let rulePayload = recurrencePayload(for: recurrenceRule)
            if case .object(let ruleObject) = rulePayload {
                for (key, value) in ruleObject {
                    recurrenceObject[key] = value
                }
            }
        }

        if !recurrenceExceptions.isEmpty {
            recurrenceObject["exceptions"] = .array(recurrenceExceptions.map(exceptionPayload(for:)))
            payload.removeValue(forKey: "recurrenceExceptions")
        }

        if !recurrenceObject.isEmpty {
            payload["recurrence"] = .object(recurrenceObject)
        }

        return payload.isEmpty ? nil : payload
    }

    static func allDay(from payload: FrontmatterPayload?) -> Bool? {
        payload?["allDay"]?.boolValue
    }

    static func recurrenceRule(from payload: FrontmatterPayload?) -> RecurrenceRule? {
        guard let recurrence = payload?["recurrence"]?.objectValue else { return nil }
        if let rrule = recurrence["rrule"]?.stringValue {
            return recurrenceRule(fromRRule: rrule)
        }
        guard let frequencyValue = recurrence["frequency"]?.stringValue,
              let frequency = RecurrenceFrequency(rawValue: frequencyValue) else { return nil }
        let interval = recurrence["interval"]?.numberValue.map { max(1, Int($0)) } ?? 1
        return RecurrenceRule(frequency: frequency, interval: interval)
    }

    static func recurrenceExceptions(from payload: FrontmatterPayload?) -> [RecurrenceException] {
        if let recurrenceExceptions = payload?["recurrence"]?.objectValue?["exceptions"]?.arrayValue {
            return decodeExceptions(recurrenceExceptions)
        }
        guard let exceptionValues = payload?["recurrenceExceptions"]?.arrayValue else { return [] }
        return decodeExceptions(exceptionValues)
    }

    private static func decodeExceptions(_ values: [JSONValue]) -> [RecurrenceException] {
        var exceptions: [RecurrenceException] = []
        for value in values {
            guard let object = value.objectValue else { continue }
            guard let original = object["originalStartAt"]?.stringValue,
                  let originalDate = SupabaseDate.parse(original) else { continue }
            let startAt = object["startAt"]?.stringValue.flatMap { SupabaseDate.parse($0) }
            let endAt = object["endAt"]?.stringValue.flatMap { SupabaseDate.parse($0) }
            let allDay = object["allDay"]?.boolValue
            let isCancelled = object["isCancelled"]?.boolValue ?? false
            exceptions.append(
                RecurrenceException(
                    originalStartAt: originalDate,
                    startAt: startAt,
                    endAt: endAt,
                    allDay: allDay,
                    isCancelled: isCancelled
                )
            )
        }
        return exceptions
    }

    static func metadataWithExceptions(_ metadata: [String: JSONValue]?, exceptions: [RecurrenceException]) -> [String: JSONValue]? {
        var payload = metadata ?? [:]
        if !exceptions.isEmpty {
            payload["recurrenceExceptions"] = .array(exceptions.map(exceptionPayload(for:)))
        }
        return payload.isEmpty ? nil : payload
    }

    static func exceptionsFromMetadata(_ metadata: [String: JSONValue]?) -> [RecurrenceException] {
        guard let values = metadata?["recurrenceExceptions"]?.arrayValue else { return [] }
        var exceptions: [RecurrenceException] = []
        for value in values {
            guard let object = value.objectValue else { continue }
            guard let original = object["originalStartAt"]?.stringValue,
                  let originalDate = SupabaseDate.parse(original) else { continue }
            let startAt = object["startAt"]?.stringValue.flatMap { SupabaseDate.parse($0) }
            let endAt = object["endAt"]?.stringValue.flatMap { SupabaseDate.parse($0) }
            let allDay = object["allDay"]?.boolValue
            let isCancelled = object["isCancelled"]?.boolValue ?? false
            exceptions.append(
                RecurrenceException(
                    originalStartAt: originalDate,
                    startAt: startAt,
                    endAt: endAt,
                    allDay: allDay,
                    isCancelled: isCancelled
                )
            )
        }
        return exceptions
    }

    private static func recurrencePayload(for rule: RecurrenceRule) -> JSONValue {
        .object([
            "rrule": .string(rruleString(for: rule)),
            "frequency": .string(rule.frequency.rawValue),
            "interval": .number(Double(rule.interval))
        ])
    }

    private static func rruleString(for rule: RecurrenceRule) -> String {
        let frequency = rule.frequency.rawValue.uppercased()
        if rule.interval > 1 {
            return "FREQ=\(frequency);INTERVAL=\(rule.interval)"
        }
        return "FREQ=\(frequency)"
    }

    private static func recurrenceRule(fromRRule rrule: String) -> RecurrenceRule? {
        let parts = rrule.split(separator: ";").map { String($0) }
        var frequency: RecurrenceFrequency?
        var interval = 1
        for part in parts {
            let pair = part.split(separator: "=", maxSplits: 1).map { String($0) }
            guard pair.count == 2 else { continue }
            let key = pair[0].uppercased()
            let value = pair[1].uppercased()
            switch key {
            case "FREQ":
                frequency = RecurrenceFrequency(rawValue: value.lowercased())
            case "INTERVAL":
                if let intValue = Int(value) {
                    interval = max(1, intValue)
                }
            default:
                continue
            }
        }
        guard let frequency else { return nil }
        return RecurrenceRule(frequency: frequency, interval: interval)
    }

    private static func exceptionPayload(for exception: RecurrenceException) -> JSONValue {
        var object: [String: JSONValue] = [
            "originalStartAt": .string(SupabaseDate.string(exception.originalStartAt) ?? "")
        ]
        if let startAt = exception.startAt {
            object["startAt"] = .string(SupabaseDate.string(startAt) ?? "")
        }
        if let endAt = exception.endAt {
            object["endAt"] = .string(SupabaseDate.string(endAt) ?? "")
        }
        if let allDay = exception.allDay {
            object["allDay"] = .bool(allDay)
        }
        if exception.isCancelled {
            object["isCancelled"] = .bool(true)
        }
        return .object(object)
    }
}
