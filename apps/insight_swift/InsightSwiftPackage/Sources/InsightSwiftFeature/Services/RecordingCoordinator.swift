import AVFoundation
import Foundation
import Observation
import SwiftUI

@MainActor
@Observable
public final class RecordingCoordinator {
    public private(set) var isRecording = false
    public private(set) var startedAt: Date?
    public private(set) var lastRecordingURL: URL?
    public private(set) var statusMessage: String?
    public var allowsBackgroundRecording: Bool {
        didSet {
            defaults.set(allowsBackgroundRecording, forKey: Self.backgroundKey)
        }
    }

    private let liveActivityManager: LiveActivityManager
    @ObservationIgnored private var recorder: AVAudioRecorder?
    @ObservationIgnored private var startTask: Task<Void, Never>?
    @ObservationIgnored private var sessionObservers: [NSObjectProtocol] = []
    private var activeTitle: String?
    private let defaults: UserDefaults

    private static let backgroundKey = "recording.background.enabled"

    public init(liveActivityManager: LiveActivityManager, defaults: UserDefaults = .standard) {
        self.liveActivityManager = liveActivityManager
        self.defaults = defaults
        self.allowsBackgroundRecording = defaults.object(forKey: Self.backgroundKey) as? Bool ?? false
        registerSessionObservers()
    }

    deinit {
        let center = NotificationCenter.default
        sessionObservers.forEach { center.removeObserver($0) }
    }

    public func handleScenePhase(_ phase: ScenePhase) {
        guard phase == .background else { return }
        guard !allowsBackgroundRecording else { return }
        guard isRecording else { return }
        stopRecording(reason: .backgroundDisabled)
    }

    public func startRecording(reason: String = "Recording") {
        guard !isRecording else { return }
        guard startTask == nil else { return }

        statusMessage = "Starting recording..."
        startTask = Task { [weak self] in
            await self?.startRecordingAsync(reason: reason)
        }
    }

    public func stopRecording() {
        stopRecording(reason: .user)
    }

    public func consumeLastRecordingURL() -> URL? {
        defer { lastRecordingURL = nil }
        return lastRecordingURL
    }

    public func consumeLiveActivityTriggerIfNeeded() {
        if RecordingTriggerStore.consumePendingStop() {
            stopRecording()
        } else if RecordingTriggerStore.consumePendingStart() {
            startRecording(reason: "Live Activity")
        }
    }

    private enum StopReason {
        case user
        case interruption
        case backgroundDisabled
        case audioServicesReset
        case audioSessionFailure(String)

        var message: String {
            switch self {
            case .user:
                return "Recording stopped"
            case .interruption:
                return "Recording interrupted"
            case .backgroundDisabled:
                return "Recording stopped (background disabled)"
            case .audioServicesReset:
                return "Recording stopped (audio reset)"
            case .audioSessionFailure(let detail):
                return "Recording stopped: \(detail)"
            }
        }
    }

    private func stopRecording(reason: StopReason) {
        startTask?.cancel()
        startTask = nil
        RecordingTriggerStore.setRecordingState(false)

        guard isRecording else {
            if case .user = reason {
                return
            }
            statusMessage = reason.message
            return
        }

        let finalTitle = activeTitle
        let finalStartedAt = startedAt

        recorder?.stop()
        recorder = nil
        isRecording = false
        startedAt = nil
        activeTitle = nil
        statusMessage = reason.message

        deactivateSession()

        Task {
            await liveActivityManager.stop(finalTitle: finalTitle, startedAt: finalStartedAt)
        }
    }

    private func startRecordingAsync(reason: String) async {
        defer { startTask = nil }

        do {
            let granted = await requestRecordPermission()
            guard granted else {
                statusMessage = "Microphone access denied."
                return
            }

            try configureSession()
            let outputURL = try makeRecordingURL()
            let settings = recordingSettings()

            let recorder = try AVAudioRecorder(url: outputURL, settings: settings)
            recorder.prepareToRecord()
            recorder.record()

            let startTime = Date()
            self.recorder = recorder
            isRecording = true
            startedAt = startTime
            lastRecordingURL = outputURL
            activeTitle = reason
            statusMessage = "Recording"
            RecordingTriggerStore.setRecordingState(true)

            await liveActivityManager.start(title: reason, startedAt: startTime)
        } catch {
            statusMessage = "Recording failed: \(error.localizedDescription)"
            deactivateSession()
        }
    }

    private func requestRecordPermission() async -> Bool {
        let session = AVAudioSession.sharedInstance()
        switch session.recordPermission {
        case .granted:
            return true
        case .denied:
            return false
        case .undetermined:
            return await withCheckedContinuation { continuation in
                session.requestRecordPermission { allowed in
                    continuation.resume(returning: allowed)
                }
            }
        @unknown default:
            return false
        }
    }

    private func configureSession() throws {
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.record, mode: .default, options: [.allowBluetooth, .duckOthers])
        try session.setActive(true, options: .notifyOthersOnDeactivation)
    }

    private func deactivateSession() {
        let session = AVAudioSession.sharedInstance()
        try? session.setActive(false, options: .notifyOthersOnDeactivation)
    }

    private func recordingsDirectory() throws -> URL {
        if let container = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: RecordingTriggerStore.appGroupId
        ) {
            let dir = container.appendingPathComponent("Recordings", isDirectory: true)
            try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            return dir
        }

        let base = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let dir = base.appendingPathComponent("Recordings", isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    private func makeRecordingURL() throws -> URL {
        let dir = try recordingsDirectory()
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyyMMdd-HHmmss"
        let name = "capture-\(formatter.string(from: Date())).m4a"
        return dir.appendingPathComponent(name)
    }

    private func recordingSettings() -> [String: Any] {
        [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 44_100,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue,
        ]
    }

    private func registerSessionObservers() {
        let center = NotificationCenter.default
        sessionObservers.append(
            center.addObserver(
                forName: AVAudioSession.interruptionNotification,
                object: nil,
                queue: .main
            ) { [weak self] notification in
                self?.handleInterruption(notification)
            }
        )
        sessionObservers.append(
            center.addObserver(
                forName: AVAudioSession.routeChangeNotification,
                object: nil,
                queue: .main
            ) { [weak self] notification in
                self?.handleRouteChange(notification)
            }
        )
        sessionObservers.append(
            center.addObserver(
                forName: AVAudioSession.mediaServicesWereResetNotification,
                object: nil,
                queue: .main
            ) { [weak self] _ in
                self?.handleMediaServicesReset()
            }
        )
    }

    private func handleInterruption(_ notification: Notification) {
        guard isRecording else { return }
        guard let info = notification.userInfo,
              let typeValue = info[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else {
            return
        }

        switch type {
        case .began:
            stopRecording(reason: .interruption)
        case .ended:
            break
        @unknown default:
            break
        }
    }

    private func handleRouteChange(_ notification: Notification) {
        guard isRecording else { return }
        guard let info = notification.userInfo,
              let reasonValue = info[AVAudioSessionRouteChangeReasonKey] as? UInt,
              let reason = AVAudioSession.RouteChangeReason(rawValue: reasonValue) else {
            return
        }

        switch reason {
        case .newDeviceAvailable,
             .oldDeviceUnavailable,
             .categoryChange,
             .override,
             .routeConfigurationChange,
             .wakeFromSleep,
             .noSuitableRouteForCategory,
             .unknown:
            statusMessage = "Audio route updated"
            do {
                try configureSession()
            } catch {
                stopRecording(reason: .audioSessionFailure(error.localizedDescription))
            }
        @unknown default:
            break
        }
    }

    private func handleMediaServicesReset() {
        guard isRecording else { return }
        stopRecording(reason: .audioServicesReset)
    }
}
