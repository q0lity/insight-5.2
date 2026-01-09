import Foundation
import Supabase

public enum CaptureTranscriptionSource: Sendable, Equatable {
    case text(String)
    case audio(URL)
}

public struct CaptureTranscriptionResult: Sendable, Equatable {
    public let captureId: String
    public let transcript: String
}

public enum CaptureTranscriptionMode: String, Sendable {
    case transcribeOnly = "transcribe_only"
    case transcribeAndParse = "transcribe_and_parse"
}

public enum CaptureTranscriptionError: Error {
    case notAuthenticated
    case missingTranscript
    case missingAudioFile
    case invalidAudioFile
    case transcriberUnavailable
    case timeout
}

@MainActor
public protocol CaptureTranscribing {
    func transcribe(captureId: String, source: CaptureTranscriptionSource) async throws -> CaptureTranscriptionResult
}

@MainActor
public final class CaptureEdgeFunctionTranscriber: CaptureTranscribing {
    private let supabase: SupabaseService
    private let authStore: SupabaseAuthStore
    private let audioBucket: String
    private let mode: CaptureTranscriptionMode

    public init(
        supabase: SupabaseService,
        authStore: SupabaseAuthStore,
        audioBucket: String = "attachments",
        mode: CaptureTranscriptionMode = .transcribeOnly
    ) {
        self.supabase = supabase
        self.authStore = authStore
        self.audioBucket = audioBucket
        self.mode = mode
    }

    public func transcribe(
        captureId: String,
        source: CaptureTranscriptionSource
    ) async throws -> CaptureTranscriptionResult {
        guard authStore.isAuthenticated else {
            throw CaptureTranscriptionError.notAuthenticated
        }

        switch source {
        case .text(let text):
            let response = try await invokeEdgeFunction(
                captureId: captureId,
                audioPath: nil,
                transcript: text
            )
            let transcript = response.transcript?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            guard !transcript.isEmpty else { throw CaptureTranscriptionError.missingTranscript }
            return CaptureTranscriptionResult(captureId: captureId, transcript: transcript)

        case .audio(let url):
            let audioPath = try await uploadAudio(captureId: captureId, fileURL: url)
            let response = try await invokeEdgeFunction(
                captureId: captureId,
                audioPath: audioPath,
                transcript: nil
            )
            let transcript = response.transcript?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            guard !transcript.isEmpty else { throw CaptureTranscriptionError.missingTranscript }
            return CaptureTranscriptionResult(captureId: captureId, transcript: transcript)
        }
    }

    private func uploadAudio(captureId: String, fileURL: URL) async throws -> String {
        guard FileManager.default.fileExists(atPath: fileURL.path) else {
            throw CaptureTranscriptionError.invalidAudioFile
        }
        let fileName = normalizedAudioFileName(fileURL.lastPathComponent)
        let path = "captures/\(captureId)/\(fileName)"
        let options = FileOptions(contentType: audioContentType(fileName: fileName), upsert: true)
        _ = try await supabase.client.storage.from(audioBucket).upload(path, fileURL: fileURL, options: options)
        return path
    }

    private func invokeEdgeFunction(
        captureId: String,
        audioPath: String?,
        transcript: String?
    ) async throws -> CaptureEdgeFunctionResponse {
        let request = CaptureEdgeFunctionRequest(
            captureId: captureId,
            audioBucket: audioPath == nil ? nil : audioBucket,
            audioPath: audioPath,
            transcript: transcript,
            mode: mode.rawValue
        )
        return try await supabase.client.functions.invoke(
            "transcribe_and_parse_capture",
            options: FunctionInvokeOptions(body: request)
        )
    }

    private func normalizedAudioFileName(_ name: String) -> String {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return "capture.m4a" }
        if trimmed.contains(".") { return trimmed }
        return "\(trimmed).m4a"
    }

    private func audioContentType(fileName: String) -> String {
        let ext = (fileName.split(separator: ".").last ?? "").lowercased()
        switch ext {
        case "m4a", "mp4", "mpeg", "mpga":
            return "audio/mp4"
        case "mp3":
            return "audio/mpeg"
        case "wav":
            return "audio/wav"
        case "ogg", "oga":
            return "audio/ogg"
        case "webm":
            return "audio/webm"
        case "flac":
            return "audio/flac"
        default:
            return "application/octet-stream"
        }
    }
}

private struct CaptureEdgeFunctionRequest: Encodable {
    let captureId: String
    let audioBucket: String?
    let audioPath: String?
    let transcript: String?
    let mode: String
}

private struct CaptureEdgeFunctionResponse: Decodable {
    let captureId: String?
    let status: String?
    let transcript: String?
}
