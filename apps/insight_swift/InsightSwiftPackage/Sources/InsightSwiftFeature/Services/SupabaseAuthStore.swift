import Foundation
import Observation
import Supabase

@MainActor
@Observable
public final class SupabaseAuthStore {
    public private(set) var userId: UUID?
    public private(set) var email: String?
    public private(set) var isLoading = false
    public private(set) var errorMessage: String?

    private let supabase: SupabaseService
    @ObservationIgnored private var authTask: Task<Void, Never>?

    public init(supabase: SupabaseService) {
        self.supabase = supabase
    }

    public var isAuthenticated: Bool {
        userId != nil
    }

    public func startListening() {
        guard authTask == nil else { return }
        authTask = Task { @MainActor [weak self] in
            guard let self else { return }
            for await (_, session) in await supabase.client.auth.authStateChanges {
                self.apply(session: session)
            }
        }
    }

    public func stopListening() {
        authTask?.cancel()
        authTask = nil
    }

    public func loadSession() async {
        if let session = supabase.client.auth.currentSession {
            apply(session: session)
            return
        }
        do {
            let session = try await supabase.client.auth.session
            apply(session: session)
        } catch {
            apply(session: nil)
        }
    }

    public func signIn(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            try await supabase.client.auth.signIn(email: email, password: password)
            let session = try await supabase.client.auth.session
            apply(session: session)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    public func signUp(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            try await supabase.client.auth.signUp(email: email, password: password)
            let session = supabase.client.auth.currentSession
            apply(session: session)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    public func signOut() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            try await supabase.client.auth.signOut()
            apply(session: nil)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func apply(session: Session?) {
        userId = session?.user.id
        email = session?.user.email
    }
}
