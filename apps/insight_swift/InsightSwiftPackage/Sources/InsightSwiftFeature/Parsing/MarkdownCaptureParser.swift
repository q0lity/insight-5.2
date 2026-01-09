import Foundation

public enum MarkdownTokenType: String, Codable, CaseIterable {
    case tag
    case person
    case context
    case place
    case tracker
}

public enum TrackerValue: Hashable, Codable {
    case number(Double)
    case string(String)

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let number = try? container.decode(Double.self) {
            self = .number(number)
            return
        }
        let value = try container.decode(String.self)
        self = .string(value)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .number(let value):
            try container.encode(value)
        case .string(let value):
            try container.encode(value)
        }
    }
}

public struct MarkdownToken: Identifiable, Hashable, Codable {
    public let id = UUID()
    public let type: MarkdownTokenType
    public let raw: String
    public let value: String
    public let trackerValue: TrackerValue?
    public let index: Int
}

public struct TrackerToken: Hashable, Codable {
    public let key: String
    public let value: TrackerValue
}

public struct MarkdownTokenCollections: Hashable, Codable {
    public var tags: [String]
    public var people: [String]
    public var contexts: [String]
    public var places: [String]
    public var trackers: [TrackerToken]
}

public enum PropValue: Hashable, Codable {
    case string(String)
    case number(Double)
    case bool(Bool)

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let boolValue = try? container.decode(Bool.self) {
            self = .bool(boolValue)
            return
        }
        if let numberValue = try? container.decode(Double.self) {
            self = .number(numberValue)
            return
        }
        let value = try container.decode(String.self)
        self = .string(value)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let value):
            try container.encode(value)
        case .number(let value):
            try container.encode(value)
        case .bool(let value):
            try container.encode(value)
        }
    }
}

public struct MarkdownSegmentHeader: Hashable, Codable {
    public let type: String
    public let title: String?
    public let category: String?
    public let subcategory: String?
    public let props: [String: PropValue]
    public let tokens: MarkdownTokenCollections
    public let raw: String
}

public struct MarkdownSegment: Hashable, Codable {
    public let header: MarkdownSegmentHeader?
    public let body: String
    public let raw: String
    public let startLine: Int
    public let endLine: Int
    public let tokens: MarkdownTokenCollections
}

public struct ParsedActiveEvent: Hashable, Codable {
    public let type: String
    public let title: String
    public let category: String?
    public let subcategory: String?
    public let contexts: [String]
}

public struct ParsedFutureEvent: Hashable, Codable {
    public let type: String
    public let title: String
    public let scheduledTime: String?
    public let category: String?
    public let subcategory: String?
}

public struct ParsedTask: Hashable, Codable {
    public let title: String
    public let completed: Bool
    public let estimate: String?
    public let parentSegment: Int
}

public struct ParsedTrackerLog: Hashable, Codable {
    public let key: String
    public let value: TrackerValue
    public let timestamp: Double
}

public struct ParsedCapture: Hashable, Codable {
    public let segments: [MarkdownSegment]
    public let tokens: MarkdownTokenCollections
    public let activeEvent: ParsedActiveEvent?
    public let futureEvents: [ParsedFutureEvent]
    public let tasks: [ParsedTask]
    public let trackerLogs: [ParsedTrackerLog]
}

public enum CaptureIntentType: String, Codable {
    case startEvent = "start_event"
    case stopEvent = "stop_event"
    case addNote = "add_note"
    case logTracker = "log_tracker"
    case createTask = "create_task"
    case scheduleEvent = "schedule_event"
    case unknown
}

public struct CaptureIntent: Hashable, Codable {
    public let type: CaptureIntentType
    public let confidence: Double
    public let metadata: [String: PropValue]
}

public enum MarkdownCaptureParser {
    private static let dividerPattern = "^\\s*(?:-{3,}|\\*{3,}|_{3,})\\s*$"
    private static let headerPattern = "^::([a-zA-Z][\\w-]*)(?:\\s+(.*))?$"
    private static let bracketPattern = "\\[([^\\]]+)\\]"
    private static let trackerTokenPattern = "#([a-zA-Z][\\w-]*)\\s*(?:\\(([^)]+)\\)|:\\s*([0-9]+(?:\\.[0-9]+)?))"
    private static let trackerIntentPattern = "#(mood|energy|stress|pain|anxiety|focus|motivation)\\s*(?:\\((\\d+)\\)|:\\s*(\\d+))"
    private static let trackerClampKeys: Set<String> = ["mood", "energy", "stress", "pain", "anxiety", "focus", "motivation"]

    public static func parseCapture(_ rawText: String, nowMs: Double? = nil) -> ParsedCapture {
        let segments = parseMarkdownSegments(rawText)
        let tokens = collectMarkdownTokens(rawText)
        let timestamp = nowMs ?? Date().timeIntervalSince1970 * 1000

        var activeEvent: ParsedActiveEvent?
        var futureEvents: [ParsedFutureEvent] = []
        var tasks: [ParsedTask] = []
        var trackerLogs: [ParsedTrackerLog] = []

        for (idx, segment) in segments.enumerated() {
            if let header = segment.header, header.type == "event" {
                let intent = detectIntent(segment.body.isEmpty ? (header.title ?? "") : segment.body)
                if intent.type == .startEvent || intent.metadata["immediate"] != nil {
                    activeEvent = ParsedActiveEvent(
                        type: header.type,
                        title: header.title ?? "Untitled Event",
                        category: header.category,
                        subcategory: header.subcategory,
                        contexts: segment.tokens.contexts
                    )
                } else if intent.type == .scheduleEvent {
                    let startProp = header.props["start"]
                    let scheduledTime: String?
                    if case .string(let value) = startProp {
                        scheduledTime = value
                    } else {
                        scheduledTime = nil
                    }
                    futureEvents.append(
                        ParsedFutureEvent(
                            type: header.type,
                            title: header.title ?? "Untitled Event",
                            scheduledTime: scheduledTime,
                            category: header.category,
                            subcategory: header.subcategory
                        )
                    )
                }
            }

            let segmentTasks = extractTasks(segment.body)
            for task in segmentTasks {
                tasks.append(
                    ParsedTask(
                        title: task.title,
                        completed: task.completed,
                        estimate: nil,
                        parentSegment: idx
                    )
                )
            }

            for tracker in segment.tokens.trackers {
                trackerLogs.append(
                    ParsedTrackerLog(
                        key: tracker.key,
                        value: tracker.value,
                        timestamp: timestamp
                    )
                )
            }
        }

        if activeEvent == nil {
            let intent = detectIntent(rawText)
            if intent.type == .startEvent {
                let category = autoCategorize(rawText)
                activeEvent = ParsedActiveEvent(
                    type: "event",
                    title: "Auto-detected Event",
                    category: category.category,
                    subcategory: category.subcategory,
                    contexts: tokens.contexts
                )
            }
        }

        return ParsedCapture(
            segments: segments,
            tokens: tokens,
            activeEvent: activeEvent,
            futureEvents: futureEvents,
            tasks: tasks,
            trackerLogs: trackerLogs
        )
    }

    public static func parseMarkdownSegments(_ rawText: String) -> [MarkdownSegment] {
        let body = stripFrontmatter(rawText).body
        let lines = splitLinesPreservingEmpty(body)
        var segments: [(startLine: Int, lines: [String])] = []
        var current: (startLine: Int, lines: [String])? = (0, [])

        for (idx, line) in lines.enumerated() {
            if regexMatch(dividerPattern, in: line, options: [.anchorsMatchLines]) {
                if let currentSegment = current {
                    segments.append(currentSegment)
                }
                current = (idx + 1, [])
                continue
            }
            current?.lines.append(line)
        }

        if let currentSegment = current {
            segments.append(currentSegment)
        }

        return segments.map { segment in
            let raw = trimTrailingWhitespaceAndNewlines(segment.lines.joined(separator: "\n"))
            let firstContentIdx = segment.lines.firstIndex { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
            var header: MarkdownSegmentHeader?
            var bodyLines = segment.lines
            if let firstContentIdx {
                let headerCandidate = segment.lines[firstContentIdx]
                if let parsedHeader = parseSegmentHeader(headerCandidate) {
                    header = parsedHeader
                    bodyLines = Array(segment.lines.dropFirst(firstContentIdx + 1))
                }
            }
            let bodyStr = trimTrailingWhitespaceAndNewlines(bodyLines.joined(separator: "\n"))
            let bodyTokens = extractInlineTokens(bodyStr)
            let headerTokens = header?.tokens ?? MarkdownTokenCollections(tags: [], people: [], contexts: [], places: [], trackers: [])
            let tokens = MarkdownTokenCollections(
                tags: uniq(headerTokens.tags + bodyTokens.filter { $0.type == .tag }.map(\.value)),
                people: uniq(headerTokens.people + bodyTokens.filter { $0.type == .person }.map(\.value)),
                contexts: uniq(headerTokens.contexts + bodyTokens.filter { $0.type == .context }.map(\.value)),
                places: uniq(headerTokens.places + bodyTokens.filter { $0.type == .place }.map(\.value)),
                trackers: headerTokens.trackers + bodyTokens.compactMap { token in
                    guard token.type == .tracker, let trackerValue = token.trackerValue else { return nil }
                    return TrackerToken(key: token.value, value: trackerValue)
                }
            )
            let startLine = segment.startLine + 1
            let endLine = segment.startLine + segment.lines.count
            return MarkdownSegment(header: header, body: bodyStr, raw: raw, startLine: startLine, endLine: endLine, tokens: tokens)
        }
    }

    public static func collectMarkdownTokens(_ rawText: String) -> MarkdownTokenCollections {
        let segments = parseMarkdownSegments(rawText)
        var tags: [String] = []
        var people: [String] = []
        var contexts: [String] = []
        var places: [String] = []
        var trackers: [TrackerToken] = []

        for segment in segments {
            tags.append(contentsOf: segment.tokens.tags)
            people.append(contentsOf: segment.tokens.people)
            contexts.append(contentsOf: segment.tokens.contexts)
            places.append(contentsOf: segment.tokens.places)
            trackers.append(contentsOf: segment.tokens.trackers)
        }

        return MarkdownTokenCollections(
            tags: uniq(tags),
            people: uniq(people),
            contexts: uniq(contexts),
            places: uniq(places),
            trackers: trackers
        )
    }

    public static func extractTasks(_ rawText: String) -> [(title: String, completed: Bool, line: Int)] {
        var tasks: [(title: String, completed: Bool, line: Int)] = []
        let lines = splitLinesPreservingEmpty(rawText)
        for (idx, line) in lines.enumerated() {
            let matches = regexMatches("^[-*]\\s*\\[([ xX])\\]\\s*(.+)$", in: line)
            guard let match = matches.first else { continue }
            let completed = (match.group(1)?.lowercased() == "x")
            let title = match.group(2)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            tasks.append((title: title, completed: completed, line: idx + 1))
        }
        return tasks
    }

    public static func detectIntent(_ text: String) -> CaptureIntent {
        let lower = text.lowercased()

        if regexMatch("(i'm |im |i am |currently |right now|starting|began|begin)", in: lower) &&
            regexMatch("(doing|working|driving|at|going to|eating|exercising|starting)", in: lower) {
            return CaptureIntent(type: .startEvent, confidence: 0.85, metadata: ["immediate": .bool(true)])
        }

        if regexMatch("(finished|done|stopped|ended|completed|wrapping up|just finished)", in: lower) {
            return CaptureIntent(type: .stopEvent, confidence: 0.85, metadata: [:])
        }

        if regexMatch("(later|tomorrow|tonight|next|at \\d|from \\d|gonna|going to|will be|plan to)", in: lower) &&
            !regexMatch("(right now|currently)", in: lower) {
            return CaptureIntent(type: .scheduleEvent, confidence: 0.7, metadata: [:])
        }

        if regexMatch("(feeling|mood|energy|pain|stress|anxious|tired|motivated)", in: lower) ||
            regexMatch(trackerIntentPattern, in: text, options: [.caseInsensitive]) {
            return CaptureIntent(type: .logTracker, confidence: 0.8, metadata: [:])
        }

        if regexMatch("(need to|have to|should|must|remember to|don't forget|todo|task)", in: lower) {
            return CaptureIntent(type: .createTask, confidence: 0.75, metadata: [:])
        }

        return CaptureIntent(type: .unknown, confidence: 0.3, metadata: [:])
    }

    public static func autoCategorize(_ text: String) -> (category: String?, subcategory: String?) {
        let lower = text.lowercased()

        if regexMatch("(driving|car|commute|traffic|road|highway|uber|lyft)", in: lower) {
            return ("Transport", "Driving")
        }
        if regexMatch("(walking|walk|stroll|hike)", in: lower) {
            return ("Transport", "Walking")
        }
        if regexMatch("(bike|cycling|bicycle)", in: lower) {
            return ("Transport", "Cycling")
        }

        if regexMatch("(work|office|meeting|email|call|presentation|client)", in: lower) {
            if regexMatch("(meeting|call|zoom|teams)", in: lower) {
                return ("Work", "Meeting")
            }
            if regexMatch("(email|inbox|reply)", in: lower) {
                return ("Work", "Email")
            }
            return ("Work", nil)
        }

        if regexMatch("(gym|workout|exercise|lift|run|cardio|yoga|stretch)", in: lower) {
            if regexMatch("(cardio|run|treadmill|elliptical)", in: lower) {
                return ("Health", "Cardio")
            }
            if regexMatch("(lift|strength|weights|bench|squat)", in: lower) {
                return ("Health", "Strength")
            }
            if regexMatch("(yoga|stretch|mobility)", in: lower) {
                return ("Health", "Mobility")
            }
            return ("Health", "Workout")
        }

        if regexMatch("(eating|breakfast|lunch|dinner|snack|meal|food|restaurant)", in: lower) {
            if regexMatch("(breakfast|morning)", in: lower) {
                return ("Food", "Breakfast")
            }
            if regexMatch("(lunch|noon)", in: lower) {
                return ("Food", "Lunch")
            }
            if regexMatch("(dinner|evening)", in: lower) {
                return ("Food", "Dinner")
            }
            return ("Food", nil)
        }

        if regexMatch("(study|learn|read|course|class|lecture|tutorial)", in: lower) {
            return ("Learning", nil)
        }

        if regexMatch("(relax|rest|sleep|nap|tv|movie|game|hobby)", in: lower) {
            return ("Personal", nil)
        }

        if regexMatch("(friends|family|party|hangout|date|dinner with)", in: lower) {
            return ("Social", nil)
        }

        return (nil, nil)
    }

    public static func parseSegmentHeader(_ line: String) -> MarkdownSegmentHeader? {
        let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let match = regexMatches(headerPattern, in: trimmed).first else { return nil }
        let type = (match.group(1) ?? "").lowercased()
        let rest = match.group(2) ?? ""
        let props = parseBracketProps(rest)
        let withoutProps = stripBracketProps(rest)
        let tokens = extractInlineTokens(withoutProps)
        let withoutTokens = stripTokens(withoutProps)
        let titleCategory = parseHeaderTitleAndCategory(withoutTokens)
        return MarkdownSegmentHeader(
            type: type,
            title: titleCategory.title,
            category: titleCategory.category,
            subcategory: titleCategory.subcategory,
            props: props,
            tokens: toTokenCollections(tokens),
            raw: line
        )
    }

    public static func extractInlineTokens(_ text: String) -> [MarkdownToken] {
        var tokens: [MarkdownToken] = []

        func add(_ type: MarkdownTokenType, raw: String, value: String, index: Int, trackerValue: TrackerValue? = nil) {
            guard !value.isEmpty else { return }
            tokens.append(MarkdownToken(type: type, raw: raw, value: value, trackerValue: trackerValue, index: index))
        }

        for match in regexMatches(trackerTokenPattern, in: text, options: [.caseInsensitive]) {
            let keyRaw = match.group(1) ?? ""
            let rawValue = match.group(2) ?? match.group(3) ?? ""
            guard !keyRaw.isEmpty, !rawValue.isEmpty else { continue }
            let key = keyRaw.lowercased()
            if let number = Double(rawValue) {
                let value = trackerClampKeys.contains(key) ? min(10, max(1, number)) : number
                add(.tracker, raw: match.matchedString(in: text), value: key, index: match.range.location, trackerValue: .number(value))
            } else {
                add(.tracker, raw: match.matchedString(in: text), value: key, index: match.range.location, trackerValue: .string(rawValue))
            }
        }

        for match in regexMatches("(^|[\\s(])#([a-zA-Z][\\w/-]*)", in: text) {
            let value = match.group(2) ?? ""
            add(.tag, raw: "#\(value)", value: value, index: match.range.location)
        }

        for match in regexMatches("(^|[\\s(])!([a-zA-Z][\\w/-]*)", in: text) {
            let value = match.group(2) ?? ""
            add(.place, raw: "!\(value)", value: value, index: match.range.location)
        }

        for match in regexMatches("(^|[\\s(])\\+([a-zA-Z][\\w/-]*)", in: text) {
            let value = match.group(2) ?? ""
            add(.context, raw: "+\(value)", value: value, index: match.range.location)
        }
        for match in regexMatches("(^|[\\s(])\\*([a-zA-Z][\\w/-]*)(?!\\*)", in: text) {
            let value = match.group(2) ?? ""
            add(.context, raw: "*\(value)", value: value, index: match.range.location)
        }

        for match in regexMatches("(^|[\\s(])@(?:\"([^\"]+)\"|'([^']+)'|([A-Za-z][\\w'\\u2019-]*(?:\\s+[A-Za-z][\\w'\\u2019-]*){0,3}))", in: text) {
            let raw = match.group(2) ?? match.group(3) ?? match.group(4) ?? ""
            let cleaned = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !cleaned.isEmpty else { continue }
            add(.person, raw: "@\(cleaned)", value: cleaned, index: match.range.location)
        }

        return tokens
    }

    public static func toTokenCollections(_ tokens: [MarkdownToken]) -> MarkdownTokenCollections {
        MarkdownTokenCollections(
            tags: uniq(tokens.filter { $0.type == .tag }.map(\.value)),
            people: uniq(tokens.filter { $0.type == .person }.map(\.value)),
            contexts: uniq(tokens.filter { $0.type == .context }.map(\.value)),
            places: uniq(tokens.filter { $0.type == .place }.map(\.value)),
            trackers: tokens.compactMap { token in
                guard token.type == .tracker, let trackerValue = token.trackerValue else { return nil }
                return TrackerToken(key: token.value, value: trackerValue)
            }
        )
    }

    private static func stripTokens(_ raw: String) -> String {
        let stripped = replaceMatches("(^|[\\s(])[#@!*+][a-zA-Z][\\w/'\\u2019-]*(?:\\s+[A-Za-z][\\w'\\u2019-]*){0,3}", in: raw, with: " ")
        return stripped.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression).trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private static func parseHeaderTitleAndCategory(_ raw: String) -> (title: String?, category: String?, subcategory: String?) {
        var working = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        var title: String?
        var category: String?
        var subcategory: String?

        if let quoted = regexMatches("\"([^\"]+)\"|'([^']+)'", in: working).first {
            let val = quoted.group(1) ?? quoted.group(2) ?? ""
            title = val.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : val.trimmingCharacters(in: .whitespacesAndNewlines)
            working = working.replacingOccurrences(of: quoted.matchedString(in: working), with: " ").trimmingCharacters(in: .whitespacesAndNewlines)
        }

        if let catMatch = regexMatches("^([a-zA-Z][\\w-]*)(?:/([a-zA-Z][\\w-]*))?(?:\\s+|$)(.*)$", in: working).first {
            category = catMatch.group(1)
            subcategory = catMatch.group(2)
            working = (catMatch.group(3) ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        }

        if title == nil {
            title = working.isEmpty ? nil : working
        }

        return (title, category, subcategory)
    }

    private static func stripFrontmatter(_ raw: String) -> (frontmatter: String?, body: String) {
        let lines = splitLinesPreservingEmpty(raw)
        guard lines.first?.trimmingCharacters(in: .whitespacesAndNewlines) == "---" else {
            return (nil, raw)
        }
        guard let endIdx = lines.dropFirst().firstIndex(where: { $0.trimmingCharacters(in: .whitespacesAndNewlines) == "---" }) else {
            return (nil, raw)
        }
        let fmLines = lines[1..<endIdx].joined(separator: "\n")
        let body = lines[(endIdx + 1)...].joined(separator: "\n")
        return (fmLines, body)
    }

    private static func parseBracketProps(_ raw: String) -> [String: PropValue] {
        var props: [String: PropValue] = [:]
        for match in regexMatches(bracketPattern, in: raw) {
            let content = match.group(1)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            if content.isEmpty { continue }
            let parts = content.split { $0 == ";" || $0 == "," }.map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
            for part in parts {
                if let eqIdx = part.firstIndex(of: "=") {
                    let key = String(part[..<eqIdx]).trimmingCharacters(in: .whitespacesAndNewlines)
                    var value = String(part[part.index(after: eqIdx)...]).trimmingCharacters(in: .whitespacesAndNewlines)
                    guard !key.isEmpty else { continue }
                    if (value.hasPrefix("\"") && value.hasSuffix("\"")) || (value.hasPrefix("'") && value.hasSuffix("'")) {
                        value = String(value.dropFirst().dropLast())
                    }
                    if value.lowercased() == "true" || value.lowercased() == "false" {
                        props[key] = .bool(value.lowercased() == "true")
                    } else if let num = Double(value) {
                        props[key] = .number(num)
                    } else {
                        props[key] = .string(value)
                    }
                } else {
                    props[String(part)] = .bool(true)
                }
            }
        }
        return props
    }

    private static func stripBracketProps(_ raw: String) -> String {
        let removed = replaceMatches(bracketPattern, in: raw, with: " ")
        return removed.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression).trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private static func uniq(_ values: [String]) -> [String] {
        var seen = Set<String>()
        var result: [String] = []
        for value in values where !value.isEmpty {
            if seen.insert(value).inserted {
                result.append(value)
            }
        }
        return result
    }

    private static func regexMatch(_ pattern: String, in text: String, options: NSRegularExpression.Options = []) -> Bool {
        guard let regex = try? NSRegularExpression(pattern: pattern, options: options) else { return false }
        return regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)) != nil
    }

    private static func regexMatches(_ pattern: String, in text: String, options: NSRegularExpression.Options = []) -> [RegexMatch] {
        guard let regex = try? NSRegularExpression(pattern: pattern, options: options) else { return [] }
        let range = NSRange(text.startIndex..., in: text)
        let matches = regex.matches(in: text, range: range)
        return matches.map { RegexMatch(match: $0, in: text) }
    }

    private static func replaceMatches(_ pattern: String, in text: String, with replacement: String) -> String {
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return text }
        let range = NSRange(text.startIndex..., in: text)
        return regex.stringByReplacingMatches(in: text, range: range, withTemplate: replacement)
    }

    private static func splitLinesPreservingEmpty(_ raw: String) -> [String] {
        let lines = raw.components(separatedBy: "\n")
        return lines.map { line in
            if line.hasSuffix("\r") {
                return String(line.dropLast())
            }
            return line
        }
    }

    private static func trimTrailingWhitespaceAndNewlines(_ raw: String) -> String {
        var end = raw.endIndex
        while end > raw.startIndex {
            let before = raw.index(before: end)
            let scalars = raw[before].unicodeScalars
            if scalars.allSatisfy({ CharacterSet.whitespacesAndNewlines.contains($0) }) {
                end = before
            } else {
                break
            }
        }
        return String(raw[..<end])
    }

    private struct RegexMatch {
        let match: NSTextCheckingResult
        let text: String

        var range: NSRange { match.range }

        func group(_ idx: Int) -> String? {
            guard let range = Range(match.range(at: idx), in: text) else { return nil }
            return String(text[range])
        }

        func matchedString(in text: String) -> String {
            guard let range = Range(match.range, in: text) else { return "" }
            return String(text[range])
        }

        init(match: NSTextCheckingResult, in text: String) {
            self.match = match
            self.text = text
        }
    }
}
