import SwiftUI

struct CalendarEntryRow: View {
    let entry: Entry
    var compact: Bool = false
    @Environment(ThemeStore.self) private var theme

    var body: some View {
        InsightRow {
            VStack(alignment: .leading, spacing: 4) {
                Text(entry.title)
                    .font(AppFont.body(compact ? theme.metrics.smallText : theme.metrics.bodyText))
                    .foregroundStyle(theme.palette.text)
                if let start = entry.startAt {
                    Text(start, style: .time)
                        .font(AppFont.body(theme.metrics.smallText))
                        .foregroundStyle(theme.palette.textSecondary)
                }
            }
        } trailing: {
            Image(systemName: "calendar")
                .foregroundStyle(theme.palette.textSecondary)
        }
    }
}

struct AllDayLaneView: View {
    let entries: [Entry]
    var compact: Bool = false
    @Environment(ThemeStore.self) private var theme

    var body: some View {
        VStack(alignment: .leading, spacing: theme.metrics.rowGap) {
            Text("All-day")
                .font(AppFont.title(compact ? theme.metrics.bodyText : theme.metrics.sectionTitle))
                .foregroundStyle(theme.palette.text)

            if entries.isEmpty {
                Text("No all-day events")
                    .font(AppFont.body(theme.metrics.smallText))
                    .foregroundStyle(theme.palette.textSecondary)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(entries, id: \.id) { entry in
                            Text(entry.title)
                                .font(AppFont.body(theme.metrics.smallText))
                                .foregroundStyle(theme.palette.text)
                                .padding(.vertical, 6)
                                .padding(.horizontal, 10)
                                .background(theme.palette.surfaceAlt)
                                .clipShape(RoundedRectangle(cornerRadius: theme.metrics.radiusSmall, style: .continuous))
                        }
                    }
                }
            }
        }
    }
}
