import Foundation
import Observation

public enum CaptureEngine: String, CaseIterable, Identifiable {
    case swift
    case javascript

    public var id: String { rawValue }
}

@MainActor
public protocol CaptureParsing {
    func parse(_ rawText: String) -> ParsedCapture?
}

@MainActor
@Observable
public final class CaptureParserService {
    public var engine: CaptureEngine
    private let jsParser = JavaScriptCaptureParser()

    public init(engine: CaptureEngine = .swift) {
        self.engine = engine
    }

    public func parse(_ rawText: String) -> ParsedCapture? {
        switch engine {
        case .swift:
            return MarkdownCaptureParser.parseCapture(rawText)
        case .javascript:
            return jsParser.parse(rawText)
        }
    }
}

extension CaptureParserService: CaptureParsing {}
