import SwiftUI

struct ContextPanelView: View {
    let pendingReviewCount: Int
    let activeGoal: Goal?
    let activeProject: Project?
    let stopFocusAction: () -> Void

    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme

    var body: some View {
        VStack(alignment: .leading, spacing: theme.metrics.spacing) {
            Text("Context")
                .font(AppFont.title(theme.metrics.headerTitle))
                .foregroundStyle(theme.palette.text)

            ContextPanelSection(title: "Focus") {
                if let session = appStore.activeFocusSession {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(session.title)
                            .font(AppFont.body(theme.metrics.bodyText))
                            .foregroundStyle(theme.palette.text)
                        Text(session.startedAt, style: .timer)
                            .font(AppFont.mono(theme.metrics.bodyText))
                            .foregroundStyle(theme.palette.textSecondary)
                        Button("Stop focus") {
                            stopFocusAction()
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(theme.palette.tint)
                        .accessibilityIdentifier("context.stopFocus")
                    }
                } else {
                    Text("No focus session running.")
                        .font(AppFont.body(theme.metrics.smallText))
                        .foregroundStyle(theme.palette.textSecondary)
                }
            }

            ContextPanelSection(title: "Review") {
                let count = pendingReviewCount
                Text(count == 0 ? "No items pending review." : "\(count) items waiting review.")
                    .font(AppFont.body(theme.metrics.bodyText))
                    .foregroundStyle(theme.palette.textSecondary)
            }

            ContextPanelSection(title: "Active") {
                VStack(alignment: .leading, spacing: 6) {
                    Text(activeGoal?.title ?? "No active goal selected.")
                        .font(AppFont.body(theme.metrics.bodyText))
                        .foregroundStyle(theme.palette.text)
                    Text(activeProject?.title ?? "No active project selected.")
                        .font(AppFont.body(theme.metrics.smallText))
                        .foregroundStyle(theme.palette.textSecondary)
                }
            }
        }
        .padding(theme.metrics.cardPadding)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(theme.palette.surface)
        .overlay(
            RoundedRectangle(cornerRadius: theme.metrics.radius, style: .continuous)
                .stroke(theme.palette.borderLight, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: theme.metrics.radius, style: .continuous))
    }
}

private struct ContextPanelSection<Content: View>: View {
    let title: String
    let content: Content

    @Environment(ThemeStore.self) private var theme

    init(title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: theme.metrics.spacingSmall) {
            Text(title)
                .font(AppFont.title(theme.metrics.sectionTitle))
                .foregroundStyle(theme.palette.text)
            content
        }
        .padding(theme.metrics.cardPadding)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(theme.palette.surfaceAlt)
        .clipShape(RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous))
    }
}
