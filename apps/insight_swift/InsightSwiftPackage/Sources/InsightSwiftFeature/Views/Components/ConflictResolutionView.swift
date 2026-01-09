import SwiftUI

// MARK: - Conflict Resolution Options

/// Options for resolving a calendar sync conflict
public enum ConflictResolution: String, CaseIterable, Sendable {
    case keepApp = "Keep App Version"
    case keepProvider = "Keep Provider Version"
    case mergeNotes = "Merge Notes Only"

    var icon: String {
        switch self {
        case .keepApp:
            return "iphone"
        case .keepProvider:
            return "cloud"
        case .mergeNotes:
            return "arrow.triangle.merge"
        }
    }

    var description: String {
        switch self {
        case .keepApp:
            return "Use the version from Insight, overwrite external calendar"
        case .keepProvider:
            return "Use the version from external calendar, overwrite Insight"
        case .mergeNotes:
            return "Keep app times/title, combine notes from both"
        }
    }
}

// MARK: - Conflict Resolution View

/// View for resolving a sync conflict with side-by-side comparison.
/// Shows local (app) and remote (provider) versions with diff highlighting.
public struct ConflictResolutionView: View {
    let conflict: CalendarConflict
    let localEntry: Entry
    let remoteEntry: Entry
    let onResolve: (ConflictResolution) -> Void
    let onDismiss: () -> Void

    @Environment(ThemeStore.self) private var theme
    @State private var selectedResolution: ConflictResolution?

    public init(
        conflict: CalendarConflict,
        localEntry: Entry,
        remoteEntry: Entry,
        onResolve: @escaping (ConflictResolution) -> Void,
        onDismiss: @escaping () -> Void
    ) {
        self.conflict = conflict
        self.localEntry = localEntry
        self.remoteEntry = remoteEntry
        self.onResolve = onResolve
        self.onDismiss = onDismiss
    }

    public var body: some View {
        ScrollView {
            VStack(spacing: theme.metrics.spacing) {
                // Header
                conflictHeader

                // Side-by-side comparison
                comparisonView

                // Diff highlights
                diffView

                // Resolution options
                resolutionOptionsView

                // Action buttons
                actionButtons
            }
            .padding(theme.metrics.spacing)
        }
        .background(theme.palette.background)
        .navigationTitle("Resolve Conflict")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") {
                    onDismiss()
                }
            }
        }
    }

    // MARK: - Header

    private var conflictHeader: some View {
        InsightCard {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundStyle(theme.palette.warning)
                        .font(.title2)

                    Text("Sync Conflict Detected")
                        .font(AppFont.title(theme.metrics.sectionTitle))
                        .foregroundStyle(theme.palette.text)
                }

                Text("Both the app and \(conflict.provider.displayName) have changes to this event within the last 60 seconds.")
                    .font(AppFont.body(theme.metrics.bodyText))
                    .foregroundStyle(theme.palette.textSecondary)

                HStack(spacing: 16) {
                    VStack(alignment: .leading) {
                        Text("App updated:")
                            .font(AppFont.body(theme.metrics.smallText))
                            .foregroundStyle(theme.palette.textSecondary)
                        Text(conflict.localUpdatedAt, style: .relative)
                            .font(AppFont.body(theme.metrics.bodyText))
                            .foregroundStyle(theme.palette.text)
                    }

                    Divider()
                        .frame(height: 30)

                    VStack(alignment: .leading) {
                        Text("Provider updated:")
                            .font(AppFont.body(theme.metrics.smallText))
                            .foregroundStyle(theme.palette.textSecondary)
                        Text(conflict.remoteUpdatedAt, style: .relative)
                            .font(AppFont.body(theme.metrics.bodyText))
                            .foregroundStyle(theme.palette.text)
                    }
                }
            }
        }
    }

    // MARK: - Comparison View

    private var comparisonView: some View {
        HStack(alignment: .top, spacing: 12) {
            // Local (App) version
            ConflictVersionCard(
                title: "App Version",
                entry: localEntry,
                updatedAt: conflict.localUpdatedAt,
                accentColor: theme.palette.tint,
                theme: theme
            )

            // Remote (Provider) version
            ConflictVersionCard(
                title: "\(conflict.provider.displayName)",
                entry: remoteEntry,
                updatedAt: conflict.remoteUpdatedAt,
                accentColor: providerColor,
                theme: theme
            )
        }
    }

    private var providerColor: Color {
        switch conflict.provider {
        case .google:
            return .red
        case .microsoft:
            return .blue
        case .device, .apple:
            return .orange
        }
    }

    // MARK: - Diff View

    private var diffView: some View {
        InsightCard {
            VStack(alignment: .leading, spacing: 8) {
                Text("Differences")
                    .font(AppFont.title(theme.metrics.sectionTitle))
                    .foregroundStyle(theme.palette.text)

                VStack(alignment: .leading, spacing: 12) {
                    // Title diff
                    if localEntry.title != remoteEntry.title {
                        DiffRow(
                            field: "Title",
                            localValue: localEntry.title,
                            remoteValue: remoteEntry.title,
                            theme: theme
                        )
                    }

                    // Start time diff
                    if localEntry.startAt != remoteEntry.startAt {
                        DiffRow(
                            field: "Start",
                            localValue: formatDate(localEntry.startAt),
                            remoteValue: formatDate(remoteEntry.startAt),
                            theme: theme
                        )
                    }

                    // End time diff
                    if localEntry.endAt != remoteEntry.endAt {
                        DiffRow(
                            field: "End",
                            localValue: formatDate(localEntry.endAt),
                            remoteValue: formatDate(remoteEntry.endAt),
                            theme: theme
                        )
                    }

                    // All-day diff
                    if localEntry.allDay != remoteEntry.allDay {
                        DiffRow(
                            field: "All Day",
                            localValue: localEntry.allDay ? "Yes" : "No",
                            remoteValue: remoteEntry.allDay ? "Yes" : "No",
                            theme: theme
                        )
                    }

                    // Notes diff
                    if localEntry.notes != remoteEntry.notes {
                        DiffRow(
                            field: "Notes",
                            localValue: localEntry.notes.isEmpty ? "(empty)" : truncate(localEntry.notes, to: 50),
                            remoteValue: remoteEntry.notes.isEmpty ? "(empty)" : truncate(remoteEntry.notes, to: 50),
                            theme: theme
                        )
                    }

                    // Tags diff
                    if localEntry.tags != remoteEntry.tags {
                        DiffRow(
                            field: "Tags",
                            localValue: localEntry.tags.isEmpty ? "(none)" : localEntry.tags.joined(separator: ", "),
                            remoteValue: remoteEntry.tags.isEmpty ? "(none)" : remoteEntry.tags.joined(separator: ", "),
                            theme: theme
                        )
                    }

                    // No differences
                    if !hasDifferences {
                        Text("No visible differences (metadata may differ)")
                            .font(AppFont.body(theme.metrics.smallText))
                            .foregroundStyle(theme.palette.textSecondary)
                            .italic()
                    }
                }
            }
        }
    }

    private var hasDifferences: Bool {
        localEntry.title != remoteEntry.title ||
        localEntry.startAt != remoteEntry.startAt ||
        localEntry.endAt != remoteEntry.endAt ||
        localEntry.allDay != remoteEntry.allDay ||
        localEntry.notes != remoteEntry.notes ||
        localEntry.tags != remoteEntry.tags
    }

    // MARK: - Resolution Options

    private var resolutionOptionsView: some View {
        InsightCard {
            VStack(alignment: .leading, spacing: 12) {
                Text("Choose Resolution")
                    .font(AppFont.title(theme.metrics.sectionTitle))
                    .foregroundStyle(theme.palette.text)

                ForEach(ConflictResolution.allCases, id: \.self) { resolution in
                    ResolutionOptionRow(
                        resolution: resolution,
                        isSelected: selectedResolution == resolution,
                        theme: theme
                    ) {
                        selectedResolution = resolution
                    }

                    if resolution != ConflictResolution.allCases.last {
                        Divider()
                    }
                }
            }
        }
    }

    // MARK: - Action Buttons

    private var actionButtons: some View {
        VStack(spacing: 12) {
            Button(action: {
                guard let resolution = selectedResolution else { return }
                onResolve(resolution)
            }) {
                Text("Apply Resolution")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(theme.palette.tint)
            .disabled(selectedResolution == nil)

            Button("Skip for Now", role: .cancel) {
                onDismiss()
            }
            .buttonStyle(.bordered)
            .tint(theme.palette.textSecondary)
        }
    }

    // MARK: - Helpers

    private func formatDate(_ date: Date?) -> String {
        guard let date else { return "(none)" }
        return date.formatted(date: .abbreviated, time: .shortened)
    }

    private func truncate(_ text: String, to length: Int) -> String {
        if text.count <= length { return text }
        return String(text.prefix(length)) + "..."
    }
}

// MARK: - Conflict Version Card

struct ConflictVersionCard: View {
    let title: String
    let entry: Entry
    let updatedAt: Date
    let accentColor: Color
    let theme: ThemeStore

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header
            HStack {
                Text(title)
                    .font(AppFont.body(theme.metrics.bodyText).bold())
                    .foregroundStyle(accentColor)
                Spacer()
            }

            Divider()
                .background(accentColor.opacity(0.3))

            // Title
            Text(entry.title)
                .font(AppFont.body(theme.metrics.bodyText))
                .foregroundStyle(theme.palette.text)
                .lineLimit(2)

            // Time
            if let start = entry.startAt {
                HStack(spacing: 4) {
                    Image(systemName: "clock")
                        .font(.caption)
                    Text(start, style: .date)
                    if !entry.allDay {
                        Text(start, style: .time)
                    }
                }
                .font(AppFont.body(theme.metrics.smallText))
                .foregroundStyle(theme.palette.textSecondary)
            }

            // All-day badge
            if entry.allDay {
                Text("All Day")
                    .font(AppFont.body(theme.metrics.smallText))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(accentColor.opacity(0.2))
                    .cornerRadius(4)
            }

            // Notes preview
            if !entry.notes.isEmpty {
                Text(entry.notes)
                    .font(AppFont.body(theme.metrics.smallText))
                    .foregroundStyle(theme.palette.textSecondary)
                    .lineLimit(2)
            }

            Spacer(minLength: 0)

            // Updated timestamp
            Text("Updated \(updatedAt, style: .relative)")
                .font(AppFont.body(theme.metrics.smallText))
                .foregroundStyle(theme.palette.textSecondary)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(accentColor.opacity(0.05))
        .overlay(
            RoundedRectangle(cornerRadius: theme.metrics.cornerRadius)
                .stroke(accentColor.opacity(0.3), lineWidth: 1)
        )
        .cornerRadius(theme.metrics.cornerRadius)
    }
}

// MARK: - Diff Row

struct DiffRow: View {
    let field: String
    let localValue: String
    let remoteValue: String
    let theme: ThemeStore

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(field)
                .font(AppFont.body(theme.metrics.smallText).bold())
                .foregroundStyle(theme.palette.text)

            HStack(alignment: .top, spacing: 8) {
                // Local value
                VStack(alignment: .leading, spacing: 2) {
                    Text("App:")
                        .font(AppFont.body(theme.metrics.smallText))
                        .foregroundStyle(theme.palette.textSecondary)
                    Text(localValue)
                        .font(AppFont.body(theme.metrics.smallText))
                        .foregroundStyle(theme.palette.tint)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                Image(systemName: "arrow.right")
                    .font(.caption)
                    .foregroundStyle(theme.palette.textSecondary)

                // Remote value
                VStack(alignment: .leading, spacing: 2) {
                    Text("Provider:")
                        .font(AppFont.body(theme.metrics.smallText))
                        .foregroundStyle(theme.palette.textSecondary)
                    Text(remoteValue)
                        .font(AppFont.body(theme.metrics.smallText))
                        .foregroundStyle(.orange)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding(8)
        .background(theme.palette.card.opacity(0.5))
        .cornerRadius(8)
    }
}

// MARK: - Resolution Option Row

struct ResolutionOptionRow: View {
    let resolution: ConflictResolution
    let isSelected: Bool
    let theme: ThemeStore
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: 12) {
                // Selection indicator
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(isSelected ? theme.palette.tint : theme.palette.textSecondary)
                    .font(.title3)

                // Icon
                Image(systemName: resolution.icon)
                    .foregroundStyle(theme.palette.text)
                    .frame(width: 24)

                // Text
                VStack(alignment: .leading, spacing: 2) {
                    Text(resolution.rawValue)
                        .font(AppFont.body(theme.metrics.bodyText))
                        .foregroundStyle(theme.palette.text)

                    Text(resolution.description)
                        .font(AppFont.body(theme.metrics.smallText))
                        .foregroundStyle(theme.palette.textSecondary)
                }

                Spacer()
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .padding(.vertical, 4)
    }
}

// MARK: - Conflict Resolver Helper

/// Utility functions for applying conflict resolutions
public enum ConflictResolver {
    /// Merge notes from local and remote entries
    public static func mergeNotes(local: String, remote: String) -> String {
        if local.isEmpty { return remote }
        if remote.isEmpty { return local }
        if local == remote { return local }

        // Combine with separator
        return """
        \(local)

        --- Merged from provider ---
        \(remote)
        """
    }

    /// Apply a resolution to create the final entry
    public static func apply(
        resolution: ConflictResolution,
        local: Entry,
        remote: Entry
    ) -> Entry {
        switch resolution {
        case .keepApp:
            return local

        case .keepProvider:
            var resolved = remote
            resolved.id = local.id // Keep local ID
            return resolved

        case .mergeNotes:
            var resolved = local
            resolved.notes = mergeNotes(local: local.notes, remote: remote.notes)
            return resolved
        }
    }
}

// MARK: - Preview

#if DEBUG
#Preview {
    NavigationStack {
        ConflictResolutionView(
            conflict: CalendarConflict(
                entryId: UUID(),
                provider: .google,
                localUpdatedAt: Date().addingTimeInterval(-30),
                remoteUpdatedAt: Date().addingTimeInterval(-15)
            ),
            localEntry: Entry(
                title: "Team Meeting",
                facets: [.event],
                startAt: Date(),
                endAt: Date().addingTimeInterval(3600),
                notes: "Discuss Q1 goals"
            ),
            remoteEntry: Entry(
                title: "Team Meeting - Updated",
                facets: [.event],
                startAt: Date().addingTimeInterval(1800),
                endAt: Date().addingTimeInterval(5400),
                notes: "Discuss Q1 goals and roadmap"
            ),
            onResolve: { _ in },
            onDismiss: {}
        )
    }
    .environment(ThemeStore())
}
#endif
