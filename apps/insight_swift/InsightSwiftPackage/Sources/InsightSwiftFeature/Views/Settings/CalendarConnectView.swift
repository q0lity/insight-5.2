import SwiftUI

// MARK: - Calendar Connect View

/// View for connecting external calendar accounts (Google, Microsoft, Device).
/// Uses OAuth via ASWebAuthenticationSession for Google/Microsoft.
public struct CalendarConnectView: View {
    @Environment(ExternalCalendarSyncService.self) private var syncService
    @Environment(CalendarSyncService.self) private var deviceSyncService
    @Environment(ThemeStore.self) private var theme
    @State private var authService = OAuthWebAuthService()
    @State private var showError: String?
    @State private var isConnecting: Bool = false

    public init() {}

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(
                    title: "Calendar Accounts",
                    subtitle: "Connect calendars to sync events"
                )

                // Google Calendar Section
                googleSection

                // Microsoft Calendar Section
                microsoftSection

                // Device Calendar Section
                deviceSection

                // Info footer
                infoFooter
            }
            .padding(theme.metrics.spacing)
        }
        .background(theme.palette.background)
        .navigationTitle("Calendars")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
        .alert("Connection Error", isPresented: .constant(showError != nil)) {
            Button("OK") { showError = nil }
        } message: {
            if let error = showError {
                Text(error)
            }
        }
        .task {
            await syncService.checkConnectedAccounts()
        }
    }

    // MARK: - Google Section

    private var googleSection: some View {
        InsightCard {
            VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                HStack {
                    Image(systemName: "g.circle.fill")
                        .font(.title2)
                        .foregroundStyle(.red)
                    Text("Google Calendar")
                        .font(AppFont.title(theme.metrics.sectionTitle))
                        .foregroundStyle(theme.palette.text)
                    Spacer()
                    connectionStatusBadge(connected: syncService.googleConnected)
                }

                if syncService.googleConnected {
                    if let account = syncService.connectedAccounts.first(where: { $0.provider == .google }) {
                        ConnectedAccountRow(
                            email: account.email,
                            isExpired: account.isExpired,
                            onDisconnect: disconnectGoogle
                        )
                    }
                } else {
                    ConnectButton(
                        provider: .google,
                        isLoading: isConnecting && authService.isAuthenticating,
                        onConnect: connectGoogle
                    )
                }
            }
        }
    }

    // MARK: - Microsoft Section

    private var microsoftSection: some View {
        InsightCard {
            VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                HStack {
                    Image(systemName: "building.2.fill")
                        .font(.title2)
                        .foregroundStyle(.blue)
                    Text("Microsoft Calendar")
                        .font(AppFont.title(theme.metrics.sectionTitle))
                        .foregroundStyle(theme.palette.text)
                    Spacer()
                    connectionStatusBadge(connected: syncService.microsoftConnected)
                }

                if syncService.microsoftConnected {
                    if let account = syncService.connectedAccounts.first(where: { $0.provider == .microsoft }) {
                        ConnectedAccountRow(
                            email: account.email,
                            isExpired: account.isExpired,
                            onDisconnect: disconnectMicrosoft
                        )
                    }
                } else {
                    ConnectButton(
                        provider: .microsoft,
                        isLoading: isConnecting && authService.isAuthenticating,
                        onConnect: connectMicrosoft
                    )
                }
            }
        }
    }

    // MARK: - Device Section

    private var deviceSection: some View {
        InsightCard {
            VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                HStack {
                    Image(systemName: "calendar")
                        .font(.title2)
                        .foregroundStyle(theme.palette.tint)
                    Text("Device Calendar")
                        .font(AppFont.title(theme.metrics.sectionTitle))
                        .foregroundStyle(theme.palette.text)
                    Spacer()
                    connectionStatusBadge(connected: deviceSyncService.isAuthorized)
                }

                Text("Sync with iOS Calendar app events")
                    .font(AppFont.body(theme.metrics.smallText))
                    .foregroundStyle(theme.palette.textSecondary)

                if deviceSyncService.isAuthorized {
                    HStack {
                        Text("Connected")
                            .font(AppFont.body(theme.metrics.bodyText))
                            .foregroundStyle(theme.palette.text)
                        Spacer()
                        if let lastSync = deviceSyncService.lastSyncAt {
                            Text("Last sync: \(lastSync, style: .relative)")
                                .font(AppFont.body(theme.metrics.smallText))
                                .foregroundStyle(theme.palette.textSecondary)
                        }
                    }

                    Button("Sync Now") {
                        Task {
                            await syncDeviceCalendar()
                        }
                    }
                    .buttonStyle(.bordered)
                    .tint(theme.palette.tint)
                } else {
                    Button("Request Access") {
                        Task {
                            await deviceSyncService.requestAccess()
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(theme.palette.tint)
                }
            }
        }
    }

    // MARK: - Info Footer

    private var infoFooter: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("About Calendar Sync")
                .font(AppFont.body(theme.metrics.bodyText).bold())
                .foregroundStyle(theme.palette.text)

            Text("Connected calendars sync events bidirectionally. Events created in Insight will appear in your calendar, and external events will be imported to Insight.")
                .font(AppFont.body(theme.metrics.smallText))
                .foregroundStyle(theme.palette.textSecondary)

            Text("OAuth tokens are stored securely on our servers - Insight never has direct access to your calendar credentials.")
                .font(AppFont.body(theme.metrics.smallText))
                .foregroundStyle(theme.palette.textSecondary)
        }
        .padding()
        .background(theme.palette.card.opacity(0.5))
        .cornerRadius(theme.metrics.cornerRadius)
    }

    // MARK: - Helpers

    private func connectionStatusBadge(connected: Bool) -> some View {
        HStack(spacing: 4) {
            Circle()
                .fill(connected ? Color.green : Color.gray)
                .frame(width: 8, height: 8)
            Text(connected ? "Connected" : "Not connected")
                .font(AppFont.body(theme.metrics.smallText))
                .foregroundStyle(connected ? Color.green : theme.palette.textSecondary)
        }
    }

    // MARK: - Actions

    private func connectGoogle() {
        Task {
            isConnecting = true
            defer { isConnecting = false }

            do {
                let code = try await authService.authenticateGoogle()
                try await syncService.connectAccount(
                    provider: .google,
                    code: code,
                    redirectUri: OAuthWebAuthService.redirectURI
                )
            } catch let error as OAuthError {
                if case .userCancelled = error {
                    // User cancelled, no error to show
                    return
                }
                showError = error.localizedDescription
            } catch {
                showError = error.localizedDescription
            }
        }
    }

    private func connectMicrosoft() {
        Task {
            isConnecting = true
            defer { isConnecting = false }

            do {
                let code = try await authService.authenticateMicrosoft()
                try await syncService.connectAccount(
                    provider: .microsoft,
                    code: code,
                    redirectUri: OAuthWebAuthService.redirectURI
                )
            } catch let error as OAuthError {
                if case .userCancelled = error {
                    return
                }
                showError = error.localizedDescription
            } catch {
                showError = error.localizedDescription
            }
        }
    }

    private func disconnectGoogle() {
        Task {
            do {
                try await syncService.disconnectGoogle()
            } catch {
                showError = error.localizedDescription
            }
        }
    }

    private func disconnectMicrosoft() {
        Task {
            do {
                try await syncService.disconnectMicrosoft()
            } catch {
                showError = error.localizedDescription
            }
        }
    }

    private func syncDeviceCalendar() async {
        let now = Date()
        let monthAgo = Calendar.current.date(byAdding: .month, value: -1, to: now)!
        let monthAhead = Calendar.current.date(byAdding: .month, value: 1, to: now)!

        do {
            _ = try await deviceSyncService.syncDeviceCalendar(from: monthAgo, to: monthAhead)
        } catch {
            showError = error.localizedDescription
        }
    }
}

// MARK: - Connected Account Row

struct ConnectedAccountRow: View {
    let email: String?
    let isExpired: Bool
    let onDisconnect: () -> Void

    @Environment(ThemeStore.self) private var theme

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let email = email {
                HStack {
                    Image(systemName: "envelope.fill")
                        .foregroundStyle(theme.palette.textSecondary)
                    Text(email)
                        .font(AppFont.body(theme.metrics.bodyText))
                        .foregroundStyle(theme.palette.text)
                }
            }

            if isExpired {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundStyle(.orange)
                    Text("Token expired - reconnect required")
                        .font(AppFont.body(theme.metrics.smallText))
                        .foregroundStyle(.orange)
                }
            }

            Button("Disconnect", role: .destructive) {
                onDisconnect()
            }
            .buttonStyle(.bordered)
        }
    }
}

// MARK: - Connect Button

struct ConnectButton: View {
    let provider: CalendarProvider
    let isLoading: Bool
    let onConnect: () -> Void

    @Environment(ThemeStore.self) private var theme

    var body: some View {
        Button(action: onConnect) {
            HStack {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Image(systemName: "link.badge.plus")
                }
                Text("Connect \(provider.displayName)")
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.borderedProminent)
        .tint(providerColor)
        .disabled(isLoading)
    }

    private var providerColor: Color {
        switch provider {
        case .google:
            return .red.opacity(0.9)
        case .microsoft:
            return .blue
        case .device, .apple:
            return .orange
        }
    }
}

// MARK: - CalendarProvider Extension

extension CalendarProvider {
    var displayName: String {
        switch self {
        case .google:
            return "Google Calendar"
        case .microsoft:
            return "Microsoft Calendar"
        case .device, .apple:
            return "Device Calendar"
        }
    }
}

// MARK: - Preview

#if DEBUG
#Preview {
    NavigationStack {
        CalendarConnectView()
    }
    .environment(ThemeStore())
    .environment(AppStore())
}
#endif
