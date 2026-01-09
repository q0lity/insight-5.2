import SwiftUI

// MARK: - Calendar Selection Model

/// Represents a calendar that can be toggled for sync
public struct CalendarSelection: Identifiable, Codable, Hashable, Sendable {
    public let id: String  // calendar ID (e.g., "primary", EKCalendar.calendarIdentifier)
    public let title: String
    public let provider: CalendarProvider
    public let colorHex: String  // hex color for display
    public var isEnabled: Bool

    public init(
        id: String,
        title: String,
        provider: CalendarProvider,
        colorHex: String = "#4285F4",
        isEnabled: Bool = true
    ) {
        self.id = id
        self.title = title
        self.provider = provider
        self.colorHex = colorHex
        self.isEnabled = isEnabled
    }

    /// Parse hex color string to SwiftUI Color
    public var color: Color {
        Color(hex: colorHex) ?? .blue
    }
}

// MARK: - Calendar Selection View

/// View for selecting which calendars to sync.
/// Shows all available calendars from connected providers with toggle switches.
public struct CalendarSelectionView: View {
    @Environment(ExternalCalendarSyncService.self) private var syncService
    @Environment(CalendarSyncService.self) private var deviceSyncService
    @Environment(ThemeStore.self) private var theme

    @State private var calendars: [CalendarSelection] = []
    @State private var isLoading = true
    @State private var showError: String?

    public init() {}

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(
                    title: "Calendars to Sync",
                    subtitle: "Choose which calendars sync with Insight"
                )

                if isLoading {
                    loadingView
                } else if calendars.isEmpty {
                    emptyStateView
                } else {
                    calendarListView
                }

                // Actions
                if !calendars.isEmpty {
                    actionsView
                }
            }
            .padding(theme.metrics.spacing)
        }
        .background(theme.palette.background)
        .navigationTitle("Calendar Selection")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
        .alert("Error", isPresented: .constant(showError != nil)) {
            Button("OK") { showError = nil }
        } message: {
            if let error = showError {
                Text(error)
            }
        }
        .task {
            await loadCalendars()
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        InsightCard {
            HStack {
                ProgressView()
                Text("Loading calendars...")
                    .font(AppFont.body(theme.metrics.bodyText))
                    .foregroundStyle(theme.palette.textSecondary)
            }
            .frame(maxWidth: .infinity)
            .padding()
        }
    }

    // MARK: - Empty State

    private var emptyStateView: some View {
        InsightCard {
            VStack(spacing: 12) {
                Image(systemName: "calendar.badge.exclamationmark")
                    .font(.largeTitle)
                    .foregroundStyle(theme.palette.textSecondary)

                Text("No Calendars Found")
                    .font(AppFont.title(theme.metrics.sectionTitle))
                    .foregroundStyle(theme.palette.text)

                Text("Connect a calendar account first to see available calendars.")
                    .font(AppFont.body(theme.metrics.bodyText))
                    .foregroundStyle(theme.palette.textSecondary)
                    .multilineTextAlignment(.center)

                NavigationLink(destination: CalendarConnectView()) {
                    Text("Connect Calendar")
                }
                .buttonStyle(.borderedProminent)
                .tint(theme.palette.tint)
            }
            .frame(maxWidth: .infinity)
            .padding()
        }
    }

    // MARK: - Calendar List

    private var calendarListView: some View {
        VStack(spacing: theme.metrics.rowGap) {
            // Group by provider
            ForEach(CalendarProvider.allCases, id: \.self) { provider in
                let providerCalendars = calendars.filter { $0.provider == provider }

                if !providerCalendars.isEmpty {
                    calendarSection(provider: provider, calendars: providerCalendars)
                }
            }
        }
    }

    private func calendarSection(provider: CalendarProvider, calendars: [CalendarSelection]) -> some View {
        InsightCard {
            VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
                // Section header
                HStack {
                    providerIcon(provider)
                    Text(provider.displayName)
                        .font(AppFont.title(theme.metrics.sectionTitle))
                        .foregroundStyle(theme.palette.text)
                    Spacer()
                    Text("\(calendars.filter(\.isEnabled).count)/\(calendars.count)")
                        .font(AppFont.body(theme.metrics.smallText))
                        .foregroundStyle(theme.palette.textSecondary)
                }

                Divider()

                // Calendar rows
                ForEach(calendars) { calendar in
                    CalendarToggleRow(
                        calendar: calendar,
                        onToggle: { enabled in
                            updateCalendarEnabled(calendar.id, enabled: enabled)
                        }
                    )

                    if calendar.id != calendars.last?.id {
                        Divider()
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func providerIcon(_ provider: CalendarProvider) -> some View {
        switch provider {
        case .google:
            Image(systemName: "g.circle.fill")
                .foregroundStyle(.red)
        case .microsoft:
            Image(systemName: "building.2.fill")
                .foregroundStyle(.blue)
        case .device, .apple:
            Image(systemName: "calendar")
                .foregroundStyle(theme.palette.tint)
        }
    }

    // MARK: - Actions

    private var actionsView: some View {
        HStack(spacing: 12) {
            Button("Enable All") {
                enableAllCalendars()
            }
            .buttonStyle(.bordered)
            .tint(theme.palette.tint)

            Button("Disable All") {
                disableAllCalendars()
            }
            .buttonStyle(.bordered)
            .tint(theme.palette.textSecondary)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Data Operations

    private func loadCalendars() async {
        isLoading = true
        defer { isLoading = false }

        var loadedCalendars: [CalendarSelection] = []

        // Load saved selection from UserDefaults
        let savedSelection = loadSavedSelection()
        let savedById = Dictionary(uniqueKeysWithValues: savedSelection.map { ($0.id, $0) })

        // Load Google calendars (currently just primary - could expand with API)
        if syncService.googleConnected {
            let googleCalendar = CalendarSelection(
                id: "primary",
                title: "Primary Calendar",
                provider: .google,
                colorHex: "#DB4437",
                isEnabled: savedById["google_primary"]?.isEnabled ?? true
            )
            loadedCalendars.append(googleCalendar)
        }

        // Load Microsoft calendars (currently default - could expand with API)
        if syncService.microsoftConnected {
            let microsoftCalendar = CalendarSelection(
                id: "default",
                title: "Default Calendar",
                provider: .microsoft,
                colorHex: "#0078D4",
                isEnabled: savedById["microsoft_default"]?.isEnabled ?? true
            )
            loadedCalendars.append(microsoftCalendar)
        }

        // Load device calendars from EventKit
        if deviceSyncService.isAuthorized {
            let deviceCalendars = await loadDeviceCalendars()
            for cal in deviceCalendars {
                var selection = cal
                if let saved = savedById["device_\(cal.id)"] {
                    selection.isEnabled = saved.isEnabled
                }
                loadedCalendars.append(selection)
            }
        }

        calendars = loadedCalendars
    }

    private func loadDeviceCalendars() async -> [CalendarSelection] {
        // In a real implementation, this would query EKEventStore for calendars
        // For now, return a placeholder that will be populated by CalendarSyncService
        return [
            CalendarSelection(
                id: "device_default",
                title: "iOS Calendar",
                provider: .device,
                colorHex: "#FF9500",
                isEnabled: true
            )
        ]
    }

    private func updateCalendarEnabled(_ id: String, enabled: Bool) {
        if let index = calendars.firstIndex(where: { $0.id == id }) {
            calendars[index].isEnabled = enabled
            saveSelection()
        }
    }

    private func enableAllCalendars() {
        calendars = calendars.map { calendar in
            var updated = calendar
            updated.isEnabled = true
            return updated
        }
        saveSelection()
    }

    private func disableAllCalendars() {
        calendars = calendars.map { calendar in
            var updated = calendar
            updated.isEnabled = false
            return updated
        }
        saveSelection()
    }

    // MARK: - Persistence

    private static let selectionKey = "CalendarSelectionPreferences"

    private func saveSelection() {
        let encoded = calendars.map { calendar in
            [
                "id": "\(calendar.provider.rawValue)_\(calendar.id)",
                "isEnabled": calendar.isEnabled
            ] as [String: Any]
        }
        UserDefaults.standard.set(encoded, forKey: Self.selectionKey)
    }

    private func loadSavedSelection() -> [CalendarSelection] {
        guard let saved = UserDefaults.standard.array(forKey: Self.selectionKey) as? [[String: Any]] else {
            return []
        }

        return saved.compactMap { dict -> CalendarSelection? in
            guard let id = dict["id"] as? String,
                  let isEnabled = dict["isEnabled"] as? Bool else {
                return nil
            }
            return CalendarSelection(
                id: id,
                title: "",
                provider: .device, // Provider not needed for lookup
                isEnabled: isEnabled
            )
        }
    }
}

// MARK: - Calendar Toggle Row

struct CalendarToggleRow: View {
    let calendar: CalendarSelection
    let onToggle: (Bool) -> Void

    @Environment(ThemeStore.self) private var theme

    var body: some View {
        HStack(spacing: 12) {
            // Color indicator
            Circle()
                .fill(calendar.color)
                .frame(width: 12, height: 12)

            // Calendar info
            VStack(alignment: .leading, spacing: 2) {
                Text(calendar.title)
                    .font(AppFont.body(theme.metrics.bodyText))
                    .foregroundStyle(theme.palette.text)

                Text(calendar.provider.displayName)
                    .font(AppFont.body(theme.metrics.smallText))
                    .foregroundStyle(theme.palette.textSecondary)
            }

            Spacer()

            // Toggle
            Toggle("", isOn: Binding(
                get: { calendar.isEnabled },
                set: { onToggle($0) }
            ))
            .labelsHidden()
            .tint(theme.palette.tint)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Color Extension

extension Color {
    init?(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")

        var rgb: UInt64 = 0
        guard Scanner(string: hexSanitized).scanHexInt64(&rgb) else {
            return nil
        }

        let r = Double((rgb & 0xFF0000) >> 16) / 255.0
        let g = Double((rgb & 0x00FF00) >> 8) / 255.0
        let b = Double(rgb & 0x0000FF) / 255.0

        self.init(red: r, green: g, blue: b)
    }
}

// MARK: - Preview

#if DEBUG
#Preview {
    NavigationStack {
        CalendarSelectionView()
    }
    .environment(ThemeStore())
    .environment(AppStore())
}
#endif
