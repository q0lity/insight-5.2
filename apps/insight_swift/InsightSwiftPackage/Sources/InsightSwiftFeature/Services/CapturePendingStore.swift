import Foundation

public final class CapturePendingStore {
    private let defaults: UserDefaults
    private let storageKey: String
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    public init(defaults: UserDefaults = .standard, storageKey: String = "capture.pending.queue") {
        self.defaults = defaults
        self.storageKey = storageKey
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        self.encoder = encoder
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        self.decoder = decoder
    }

    public func load() -> [PendingCapture] {
        guard let data = defaults.data(forKey: storageKey) else { return [] }
        return (try? decoder.decode([PendingCapture].self, from: data)) ?? []
    }

    public func save(_ captures: [PendingCapture]) {
        guard let data = try? encoder.encode(captures) else { return }
        defaults.set(data, forKey: storageKey)
    }

    public func enqueue(_ capture: PendingCapture) {
        var current = load()
        current.append(capture)
        save(current)
    }

    public func remove(_ capture: PendingCapture) {
        var current = load()
        current.removeAll { $0.id == capture.id }
        save(current)
    }

    public func clear() {
        defaults.removeObject(forKey: storageKey)
    }
}
