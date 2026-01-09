import Foundation
import Network
import Observation

@MainActor
@Observable
public final class NetworkMonitorService {
    public private(set) var isConnected: Bool = true
    public private(set) var statusLabel: String = "Unknown"

    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "insight.network.monitor")
    private var isStarted = false

    public init() {
        start()
    }

    deinit {
        monitor.cancel()
    }

    public func start() {
        guard !isStarted else { return }
        isStarted = true
        monitor.pathUpdateHandler = { [weak self] path in
            Task { @MainActor in
                let connected = path.status == .satisfied
                self?.isConnected = connected
                self?.statusLabel = connected ? "Online" : "Offline"
            }
        }
        monitor.start(queue: queue)
    }

    public func stop() {
        guard isStarted else { return }
        isStarted = false
        monitor.cancel()
    }
}
