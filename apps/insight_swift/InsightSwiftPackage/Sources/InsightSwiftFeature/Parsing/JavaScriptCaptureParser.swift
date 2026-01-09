import Foundation
import JavaScriptCore

public final class JavaScriptCaptureParser {
    private let context: JSContext
    private let parseFunction: JSValue?

    public init() {
        let context = JSContext()
        self.context = context
        context.exceptionHandler = { _, error in
            if let error = error {
                NSLog("JS parser error: %@", error.toString())
            }
        }

        if let url = Bundle.module.url(forResource: "schema", withExtension: "js"),
           let script = try? String(contentsOf: url) {
            context.evaluateScript(script)
        }

        parseFunction = context.objectForKeyedSubscript("parseCapture")
    }

    public func parse(_ rawText: String, nowMs: Double? = nil) -> ParsedCapture? {
        guard let parseFunction else { return nil }
        let args: [Any] = nowMs.map { [rawText, $0] } ?? [rawText]
        guard let result = parseFunction.call(withArguments: args) else { return nil }
        guard let json = context.objectForKeyedSubscript("JSON")?.invokeMethod("stringify", withArguments: [result])?.toString() else {
            return nil
        }
        guard let data = json.data(using: .utf8) else { return nil }
        let decoder = JSONDecoder()
        return try? decoder.decode(ParsedCapture.self, from: data)
    }
}
