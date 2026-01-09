import SwiftUI

struct UnderbarView: View {
    let isRecording: Bool
    let hasActiveFocus: Bool
    let captureAction: () -> Void
    let searchAction: () -> Void
    let focusAction: () -> Void
    let contextAction: (() -> Void)?

    @Environment(ThemeStore.self) private var theme

    var body: some View {
        HStack(spacing: theme.metrics.spacingSmall) {
            UnderbarActionButton(
                title: isRecording ? "Stop" : "Capture",
                systemImage: isRecording ? "stop.fill" : "mic.fill",
                tint: theme.palette.error,
                action: captureAction
            )
            UnderbarActionButton(
                title: "Search",
                systemImage: "sparkle.magnifyingglass",
                tint: theme.palette.tint,
                action: searchAction
            )
            UnderbarActionButton(
                title: hasActiveFocus ? "Stop Focus" : "Focus",
                systemImage: hasActiveFocus ? "pause.fill" : "bolt.fill",
                tint: theme.palette.success,
                action: focusAction
            )

            if let contextAction {
                Button(action: contextAction) {
                    Image(systemName: "sidebar.right")
                        .font(.system(size: theme.metrics.iconSizeSmall, weight: .semibold))
                        .foregroundStyle(theme.palette.text)
                        .frame(width: theme.metrics.buttonHeightSmall, height: theme.metrics.buttonHeightSmall)
                        .background(theme.palette.surface)
                        .clipShape(RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous)
                                .stroke(theme.palette.borderLight, lineWidth: 1)
                        )
                }
                .accessibilityLabel("Context")
                .accessibilityIdentifier("underbar.context")
            }
        }
        .padding(.horizontal, theme.metrics.spacingSmall)
        .frame(height: theme.metrics.underbarHeight)
        .background(theme.palette.surfaceAlt)
        .clipShape(RoundedRectangle(cornerRadius: theme.metrics.radius, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: theme.metrics.radius, style: .continuous)
                .stroke(theme.palette.borderLight, lineWidth: 1)
        )
        .shadow(color: theme.palette.borderLight, radius: 12, x: 0, y: 8)
    }
}

private struct UnderbarActionButton: View {
    let title: String
    let systemImage: String
    let tint: Color
    let action: () -> Void

    @Environment(ThemeStore.self) private var theme

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: systemImage)
                    .font(.system(size: theme.metrics.iconSizeSmall, weight: .semibold))
                Text(title)
                    .font(AppFont.body(theme.metrics.smallText))
            }
            .foregroundStyle(theme.palette.text)
            .frame(maxWidth: .infinity)
            .frame(height: theme.metrics.buttonHeightSmall)
            .background(tint.opacity(theme.isDark ? 0.2 : 0.12))
            .clipShape(RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous))
        }
        .accessibilityLabel(title)
        .accessibilityIdentifier("underbar.\(title.lowercased())")
    }
}
