import Foundation
import Testing
@testable import InsightSwiftFeature

struct FrontmatterCodecTests {
    @Test("FrontmatterCodec round-trips all-day and recurrence")
    func frontmatterAllDayRoundTrip() {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0) ?? .current
        let originalStart = calendar.date(from: DateComponents(year: 2026, month: 1, day: 12, hour: 9, minute: 0))!
        let movedStart = calendar.date(byAdding: .hour, value: 2, to: originalStart)!
        let movedEnd = calendar.date(byAdding: .minute, value: 45, to: movedStart)!
        let rule = RecurrenceRule(frequency: .weekly, interval: 2)
        let exception = RecurrenceException(
            originalStartAt: originalStart,
            startAt: movedStart,
            endAt: movedEnd,
            allDay: true,
            isCancelled: false
        )
        let payload = FrontmatterCodec.merge(
            existing: ["source": .string("desktop")],
            allDay: true,
            recurrenceRule: rule,
            recurrenceExceptions: [exception]
        )

        #require(payload != nil)
        #expect(payload?["source"]?.stringValue == "desktop")
        #expect(payload?["recurrence"]?.objectValue?["rrule"]?.stringValue == "FREQ=WEEKLY;INTERVAL=2")
        #expect(payload?["recurrence"]?.objectValue?["exceptions"]?.arrayValue?.count == 1)
        #expect(payload?["recurrenceExceptions"] == nil)
        #expect(FrontmatterCodec.allDay(from: payload) == true)
        #expect(FrontmatterCodec.recurrenceRule(from: payload) == rule)

        let decodedExceptions = FrontmatterCodec.recurrenceExceptions(from: payload)
        #expect(decodedExceptions.count == 1)
        #expect(decodedExceptions[0].originalStartAt == originalStart)
        #expect(decodedExceptions[0].startAt == movedStart)
        #expect(decodedExceptions[0].endAt == movedEnd)
        #expect(decodedExceptions[0].allDay == true)
    }

    @Test("FrontmatterCodec ignores invalid recurrence values")
    func frontmatterInvalidRecurrenceFailure() {
        let payload: FrontmatterPayload = [
            "recurrence": .object([
                "frequency": .string("yearly"),
                "interval": .number(2)
            ])
        ]

        #expect(FrontmatterCodec.recurrenceRule(from: payload) == nil)
    }

    @Test("FrontmatterCodec handles missing recurrence gracefully")
    func frontmatterMissingRecurrence() {
        #expect(FrontmatterCodec.recurrenceRule(from: nil) == nil)
        #expect(FrontmatterCodec.recurrenceExceptions(from: nil).isEmpty)
    }
}
