import Foundation
import Observation
import Supabase

@MainActor
@Observable
public final class SupabaseService {
    public let client: SupabaseClient

    public init(
        url: URL = AppConfig.supabaseURL,
        anonKey: String = AppConfig.supabaseAnonKey
    ) {
        client = SupabaseClient(supabaseURL: url, supabaseKey: anonKey)
    }
}
