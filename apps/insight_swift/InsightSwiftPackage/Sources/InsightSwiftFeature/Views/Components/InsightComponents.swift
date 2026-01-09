import SwiftUI

struct InsightHeader: View {
    let title: String
    let subtitle: String?

    @Environment(ThemeStore.self) private var theme

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(AppFont.title(theme.metrics.headerTitle + 10))
                .foregroundStyle(theme.palette.text)
            if let subtitle, !subtitle.isEmpty {
                Text(subtitle)
                    .font(AppFont.body(theme.metrics.bodyText))
                    .foregroundStyle(theme.palette.textSecondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct InsightCard<Content: View>: View {
    @Environment(ThemeStore.self) private var theme
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        content
            .padding(theme.metrics.cardPadding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(theme.palette.surface)
            .overlay(
                RoundedRectangle(cornerRadius: theme.metrics.radius, style: .continuous)
                    .stroke(theme.palette.border, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: theme.metrics.radius, style: .continuous))
            .shadow(color: theme.palette.borderLight, radius: 10, x: 0, y: 6)
    }
}

struct MetricTile: View {
    let title: String
    let value: String
    let accent: Color?

    @Environment(ThemeStore.self) private var theme

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title.uppercased())
                .font(AppFont.body(theme.metrics.metricLabel))
                .foregroundStyle(theme.palette.textSecondary)
            Text(value)
                .font(AppFont.display(theme.metrics.metricValue))
                .foregroundStyle(accent ?? theme.palette.text)
        }
        .padding(theme.metrics.cardPadding)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background((accent ?? theme.palette.tint).opacity(theme.isDark ? 0.12 : 0.08))
        .clipShape(RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous)
                .stroke(theme.palette.borderLight, lineWidth: 1)
        )
    }
}

struct InsightChip: View {
    let label: String
    let color: Color

    @Environment(ThemeStore.self) private var theme

    var body: some View {
        Text(label)
            .font(AppFont.body(theme.metrics.smallText))
            .padding(.horizontal, theme.metrics.chipPadding)
            .frame(height: theme.metrics.chipHeight)
            .background(color.opacity(theme.isDark ? 0.2 : 0.12))
            .foregroundStyle(color)
            .clipShape(Capsule())
    }
}

struct InsightRow<Leading: View, Trailing: View>: View {
    let leading: Leading
    let trailing: Trailing

    init(@ViewBuilder leading: () -> Leading, @ViewBuilder trailing: () -> Trailing) {
        self.leading = leading()
        self.trailing = trailing()
    }

    var body: some View {
        HStack {
            leading
            Spacer()
            trailing
        }
    }
}
