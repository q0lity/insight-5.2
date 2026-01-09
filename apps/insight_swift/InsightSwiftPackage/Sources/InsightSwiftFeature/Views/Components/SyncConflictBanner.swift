import SwiftUI

/// A banner displayed when calendar sync detects conflicts.
/// Tapping the banner navigates to conflict details.
public struct SyncConflictBanner: View {
    @Environment(ThemeStore.self) private var theme

    public let conflictCount: Int
    public let onTap: () -> Void

    public init(conflictCount: Int, onTap: @escaping () -> Void) {
        self.conflictCount = conflictCount
        self.onTap = onTap
    }

    public var body: some View {
        Button(action: onTap) {
            HStack(spacing: theme.metrics.spacingSmall) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: theme.metrics.iconSize))
                    .foregroundStyle(theme.palette.warning)

                VStack(alignment: .leading, spacing: 2) {
                    Text(conflictCount == 1 ? "1 Sync Conflict" : "\(conflictCount) Sync Conflicts")
                        .font(AppFont.title(theme.metrics.bodyText))
                        .foregroundStyle(theme.palette.text)

                    Text("Tap to review concurrent edits")
                        .font(AppFont.body(theme.metrics.smallText))
                        .foregroundStyle(theme.palette.textSecondary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: theme.metrics.iconSizeSmall, weight: .semibold))
                    .foregroundStyle(theme.palette.textSecondary)
            }
            .padding(theme.metrics.cardPadding)
            .background(
                RoundedRectangle(cornerRadius: theme.metrics.radiusSmall)
                    .fill(theme.palette.warning.opacity(0.12))
                    .overlay(
                        RoundedRectangle(cornerRadius: theme.metrics.radiusSmall)
                            .stroke(theme.palette.warning.opacity(0.3), lineWidth: 1)
                    )
            )
        }
        .buttonStyle(.plain)
    }
}

/// A row showing details for a single sync conflict.
public struct SyncConflictRow: View {
    @Environment(ThemeStore.self) private var theme

    public let conflict: CalendarConflict
    public let entryTitle: String?
    public let onResolve: (() -> Void)?

    public init(
        conflict: CalendarConflict,
        entryTitle: String? = nil,
        onResolve: (() -> Void)? = nil
    ) {
        self.conflict = conflict
        self.entryTitle = entryTitle
        self.onResolve = onResolve
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: theme.metrics.spacingSmall) {
            HStack {
                Image(systemName: providerIcon)
                    .font(.system(size: theme.metrics.iconSizeSmall))
                    .foregroundStyle(theme.palette.tint)

                Text(entryTitle ?? "Unknown Entry")
                    .font(AppFont.title(theme.metrics.bodyText))
                    .foregroundStyle(theme.palette.text)
                    .lineLimit(1)

                Spacer()

                if let onResolve {
                    Button("Resolve") {
                        onResolve()
                    }
                    .font(AppFont.body(theme.metrics.smallText))
                    .foregroundStyle(theme.palette.tint)
                }
            }

            HStack(spacing: theme.metrics.spacingSmall) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Local")
                        .font(AppFont.body(theme.metrics.tinyText))
                        .foregroundStyle(theme.palette.textSecondary)
                    Text(formatDate(conflict.localUpdatedAt))
                        .font(AppFont.mono(theme.metrics.smallText))
                        .foregroundStyle(theme.palette.text)
                }

                Spacer()

                Image(systemName: "arrow.left.arrow.right")
                    .font(.system(size: theme.metrics.iconSizeSmall))
                    .foregroundStyle(theme.palette.warning)

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text("Remote")
                        .font(AppFont.body(theme.metrics.tinyText))
                        .foregroundStyle(theme.palette.textSecondary)
                    Text(formatDate(conflict.remoteUpdatedAt))
                        .font(AppFont.mono(theme.metrics.smallText))
                        .foregroundStyle(theme.palette.text)
                }
            }

            Text(conflict.note)
                .font(AppFont.body(theme.metrics.smallText))
                .foregroundStyle(theme.palette.textSecondary)
        }
        .padding(theme.metrics.cardPadding)
        .background(
            RoundedRectangle(cornerRadius: theme.metrics.radiusSmall)
                .fill(theme.palette.surface)
                .shadow(
                    color: theme.isDark ? .clear : .black.opacity(0.05),
                    radius: 4,
                    y: 2
                )
        )
    }

    private var providerIcon: String {
        switch conflict.provider {
        case .google:
            return "g.circle.fill"
        case .microsoft:
            return "m.circle.fill"
        case .device, .apple:
            return "calendar"
        }
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .medium
        return formatter.string(from: date)
    }
}

/// A view showing all sync conflicts with resolution options.
public struct SyncConflictListView: View {
    @Environment(ThemeStore.self) private var theme
    @Environment(CalendarSyncService.self) private var calendarSync

    public let conflicts: [CalendarConflict]
    public let entryLookup: (UUID) -> Entry?
    public let onDismiss: () -> Void

    public init(
        conflicts: [CalendarConflict],
        entryLookup: @escaping (UUID) -> Entry?,
        onDismiss: @escaping () -> Void
    ) {
        self.conflicts = conflicts
        self.entryLookup = entryLookup
        self.onDismiss = onDismiss
    }

    public var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: theme.metrics.cardGap) {
                    if conflicts.isEmpty {
                        emptyState
                    } else {
                        ForEach(conflicts) { conflict in
                            SyncConflictRow(
                                conflict: conflict,
                                entryTitle: entryLookup(conflict.entryId)?.title
                            )
                        }
                    }
                }
                .padding(theme.metrics.spacing)
            }
            .background(theme.palette.background)
            .navigationTitle("Sync Conflicts")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        onDismiss()
                    }
                    .foregroundStyle(theme.palette.tint)
                }

                if !conflicts.isEmpty {
                    ToolbarItem(placement: .topBarLeading) {
                        Button("Clear All") {
                            calendarSync.clearConflicts()
                            onDismiss()
                        }
                        .foregroundStyle(theme.palette.textSecondary)
                    }
                }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: theme.metrics.spacing) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 48))
                .foregroundStyle(theme.palette.success)

            Text("No Conflicts")
                .font(AppFont.title(theme.metrics.sectionTitle))
                .foregroundStyle(theme.palette.text)

            Text("All calendar events are in sync")
                .font(AppFont.body(theme.metrics.bodyText))
                .foregroundStyle(theme.palette.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 60)
    }
}

// MARK: - Preview Helpers

#if DEBUG
#Preview("Sync Conflict Banner") {
    VStack(spacing: 20) {
        SyncConflictBanner(conflictCount: 1) {
            print("Tapped banner")
        }

        SyncConflictBanner(conflictCount: 5) {
            print("Tapped banner")
        }
    }
    .padding()
    .background(Color.gray.opacity(0.1))
    .environment(ThemeStore())
}

#Preview("Sync Conflict Row") {
    VStack(spacing: 16) {
        SyncConflictRow(
            conflict: CalendarConflict(
                entryId: UUID(),
                provider: .google,
                localUpdatedAt: Date(),
                remoteUpdatedAt: Date().addingTimeInterval(30)
            ),
            entryTitle: "Team Standup Meeting"
        )

        SyncConflictRow(
            conflict: CalendarConflict(
                entryId: UUID(),
                provider: .device,
                localUpdatedAt: Date().addingTimeInterval(-45),
                remoteUpdatedAt: Date()
            ),
            entryTitle: "Doctor Appointment",
            onResolve: { print("Resolve tapped") }
        )
    }
    .padding()
    .background(Color.gray.opacity(0.1))
    .environment(ThemeStore())
}
#endif
