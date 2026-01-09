import Foundation

public enum AppConfig {
    public static var supabaseURL: URL {
        let raw = infoPlistValue("SUPABASE_URL")
        guard let url = URL(string: raw) else {
            fatalError("Invalid SUPABASE_URL in Info.plist.")
        }
        return url
    }

    public static var supabaseAnonKey: String {
        infoPlistValue("SUPABASE_ANON_KEY")
    }

    private static func infoPlistValue(_ key: String) -> String {
        guard let value = Bundle.main.object(forInfoDictionaryKey: key) as? String, !value.isEmpty else {
            fatalError("Missing \(key) in Info.plist.")
        }
        return value
    }
}
