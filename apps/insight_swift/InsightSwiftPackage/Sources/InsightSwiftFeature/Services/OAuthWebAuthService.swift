import AuthenticationServices
import Foundation
import Observation

// MARK: - OAuth Errors

/// Errors specific to OAuth web authentication flow
public enum OAuthError: Error, LocalizedError {
    case userCancelled
    case accessDenied
    case invalidCallback(String)
    case missingCode
    case networkError(String)
    case presentationError
    case unknown(String)

    public var errorDescription: String? {
        switch self {
        case .userCancelled:
            return "Authentication was cancelled"
        case .accessDenied:
            return "Access was denied"
        case .invalidCallback(let message):
            return "Invalid callback URL: \(message)"
        case .missingCode:
            return "No authorization code received"
        case .networkError(let message):
            return "Network error: \(message)"
        case .presentationError:
            return "Unable to present authentication window"
        case .unknown(let message):
            return "Authentication error: \(message)"
        }
    }
}

// MARK: - OAuth Web Auth Service

/// Service to handle OAuth web authentication flow using ASWebAuthenticationSession.
/// This service launches the system browser for OAuth consent and captures the callback.
@MainActor
@Observable
public final class OAuthWebAuthService: NSObject {
    // MARK: - Public State

    public private(set) var isAuthenticating: Bool = false
    public private(set) var lastError: String?

    // MARK: - OAuth Configuration

    // Google OAuth
    private static let googleAuthURL = "https://accounts.google.com/o/oauth2/v2/auth"
    private static let googleScope = "https://www.googleapis.com/auth/calendar"
    // Note: Client ID should come from environment/config, not hardcoded
    private static let googleClientId = "YOUR_GOOGLE_CLIENT_ID" // Set via environment

    // Microsoft OAuth
    private static let microsoftAuthURL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
    private static let microsoftScope = "Calendars.ReadWrite offline_access"
    private static let microsoftClientId = "YOUR_MICROSOFT_CLIENT_ID" // Set via environment

    // URL scheme for redirect (must match Info.plist CFBundleURLSchemes)
    public static let redirectScheme = "insightswift"
    public static let redirectHost = "oauth-callback"
    public static let redirectURI = "\(redirectScheme)://\(redirectHost)"

    // MARK: - Private State

    private var currentSession: ASWebAuthenticationSession?
    private var presentationAnchorWindow: ASPresentationAnchor?

    // MARK: - Init

    public override init() {
        super.init()
    }

    // MARK: - Public Methods

    /// Start Google OAuth flow and return the authorization code.
    /// The code should be exchanged for tokens via the server-side edge function.
    ///
    /// - Returns: The OAuth authorization code
    /// - Throws: OAuthError if authentication fails
    public func authenticateGoogle() async throws -> String {
        try await authenticate(provider: .google)
    }

    /// Start Microsoft OAuth flow and return the authorization code.
    /// The code should be exchanged for tokens via the server-side edge function.
    ///
    /// - Returns: The OAuth authorization code
    /// - Throws: OAuthError if authentication fails
    public func authenticateMicrosoft() async throws -> String {
        try await authenticate(provider: .microsoft)
    }

    /// Set the window to use for presenting the authentication session.
    /// Call this from a SwiftUI view using UIApplication.shared window.
    public func setPresentationAnchor(_ window: ASPresentationAnchor?) {
        self.presentationAnchorWindow = window
    }

    // MARK: - Private Methods

    private func authenticate(provider: CalendarProvider) async throws -> String {
        guard !isAuthenticating else {
            throw OAuthError.unknown("Authentication already in progress")
        }

        isAuthenticating = true
        lastError = nil
        defer { isAuthenticating = false }

        let authURL = buildOAuthURL(provider: provider)

        return try await withCheckedThrowingContinuation { continuation in
            let session = ASWebAuthenticationSession(
                url: authURL,
                callbackURLScheme: Self.redirectScheme
            ) { [weak self] callbackURL, error in
                if let error = error {
                    let nsError = error as NSError
                    if nsError.domain == ASWebAuthenticationSessionErrorDomain,
                       nsError.code == ASWebAuthenticationSessionError.canceledLogin.rawValue {
                        self?.lastError = OAuthError.userCancelled.localizedDescription
                        continuation.resume(throwing: OAuthError.userCancelled)
                    } else {
                        self?.lastError = error.localizedDescription
                        continuation.resume(throwing: OAuthError.networkError(error.localizedDescription))
                    }
                    return
                }

                guard let callbackURL = callbackURL else {
                    self?.lastError = OAuthError.invalidCallback("No callback URL").localizedDescription
                    continuation.resume(throwing: OAuthError.invalidCallback("No callback URL"))
                    return
                }

                do {
                    let code = try self?.extractCode(from: callbackURL) ?? ""
                    continuation.resume(returning: code)
                } catch {
                    self?.lastError = error.localizedDescription
                    continuation.resume(throwing: error)
                }
            }

            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = false // Allow cookies for better UX

            self.currentSession = session

            if !session.start() {
                lastError = OAuthError.presentationError.localizedDescription
                continuation.resume(throwing: OAuthError.presentationError)
            }
        }
    }

    /// Build the OAuth authorization URL for the given provider.
    public func buildOAuthURL(provider: CalendarProvider) -> URL {
        var components: URLComponents

        switch provider {
        case .google:
            components = URLComponents(string: Self.googleAuthURL)!
            components.queryItems = [
                URLQueryItem(name: "client_id", value: Self.googleClientId),
                URLQueryItem(name: "redirect_uri", value: Self.redirectURI),
                URLQueryItem(name: "response_type", value: "code"),
                URLQueryItem(name: "scope", value: Self.googleScope),
                URLQueryItem(name: "access_type", value: "offline"),
                URLQueryItem(name: "prompt", value: "consent"),
                URLQueryItem(name: "state", value: UUID().uuidString)
            ]

        case .microsoft:
            components = URLComponents(string: Self.microsoftAuthURL)!
            components.queryItems = [
                URLQueryItem(name: "client_id", value: Self.microsoftClientId),
                URLQueryItem(name: "redirect_uri", value: Self.redirectURI),
                URLQueryItem(name: "response_type", value: "code"),
                URLQueryItem(name: "scope", value: Self.microsoftScope),
                URLQueryItem(name: "state", value: UUID().uuidString)
            ]

        case .device, .apple:
            // Device/Apple calendar doesn't use OAuth - this shouldn't be called
            fatalError("OAuth not applicable for device calendar")
        }

        return components.url!
    }

    /// Extract the authorization code from the OAuth callback URL.
    ///
    /// - Parameter url: The callback URL from the OAuth provider
    /// - Returns: The authorization code
    /// - Throws: OAuthError if the code cannot be extracted
    public func extractCode(from url: URL) throws -> String {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            throw OAuthError.invalidCallback("Cannot parse callback URL")
        }

        // Check for error in callback
        if let error = components.queryItems?.first(where: { $0.name == "error" })?.value {
            if error == "access_denied" {
                throw OAuthError.accessDenied
            }
            throw OAuthError.unknown(error)
        }

        // Extract authorization code
        guard let code = components.queryItems?.first(where: { $0.name == "code" })?.value else {
            throw OAuthError.missingCode
        }

        return code
    }

    /// Cancel any in-progress authentication session.
    public func cancelAuthentication() {
        currentSession?.cancel()
        currentSession = nil
        isAuthenticating = false
    }
}

// MARK: - ASWebAuthenticationPresentationContextProviding

extension OAuthWebAuthService: ASWebAuthenticationPresentationContextProviding {
    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        // Return the stored anchor if available, otherwise try to get the key window
        if let anchor = presentationAnchorWindow {
            return anchor
        }

        // Fallback: try to get the first connected scene's key window
        #if os(iOS)
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first(where: { $0.isKeyWindow }) {
            return window
        }
        #endif

        // Last resort: create a new window (shouldn't happen in practice)
        #if os(iOS)
        return UIWindow()
        #else
        return NSWindow()
        #endif
    }
}

// MARK: - OAuth Configuration Extension

extension OAuthWebAuthService {
    /// Configure OAuth client IDs from environment or config.
    /// Call this at app startup with values from secure storage or environment.
    public static func configure(
        googleClientId: String,
        microsoftClientId: String
    ) {
        // Note: In a production app, these would be stored in a mutable config object
        // or retrieved from environment/keychain at runtime.
        // For now, this is a placeholder for the configuration pattern.
        debugPrint("OAuth configured with Google: \(googleClientId.prefix(10))..., Microsoft: \(microsoftClientId.prefix(10))...")
    }
}
