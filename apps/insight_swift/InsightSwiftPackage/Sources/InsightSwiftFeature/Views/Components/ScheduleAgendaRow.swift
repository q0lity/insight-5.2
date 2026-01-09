import SwiftUI

struct ScheduleItemRow: View {
    let item: ScheduledItem
    let showKind: Bool

    @Environment(ThemeStore.self) private var theme

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Text(item.title)
                        .font(AppFont.body(theme.metrics.bodyText))
                        .foregroundStyle(theme.palette.text)
                    if showKind {
                        Text(item.kind.rawValue.uppercased())
                            .font(AppFont.body(theme.metrics.tinyText))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(kindColor.opacity(theme.isDark ? 0.2 : 0.12))
                            .foregroundStyle(kindColor)
                            .clipShape(Capsule())
                    }
                }
                if let recurrenceRule = item.recurrenceRule {
                    Text("Repeats \(recurrenceRule.frequency.rawValue)")
                        .font(AppFont.body(theme.metrics.tinyText))
                        .foregroundStyle(theme.palette.textSecondary)
                }
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                Text(timeLabel)
                    .font(AppFont.body(theme.metrics.smallText))
                    .foregroundStyle(theme.palette.textSecondary)
                if item.isRecurring {
                    Text("Series")
                        .font(AppFont.body(theme.metrics.tinyText))
                        .foregroundStyle(theme.palette.textSecondary)
                }
            }
        }
        .padding(.vertical, 4)
    }

    private var timeLabel: String {
        if item.allDay {
            return "All day"
        }
        let start = item.startAt.formatted(date: .omitted, time: .shortened)
        let end = item.endAt.formatted(date: .omitted, time: .shortened)
        return "\(start) - \(end)"
    }

    private var kindColor: Color {
        switch item.kind {
        case .event:
            return theme.palette.tint
        case .task:
            return theme.palette.success
        case .habit:
            return theme.palette.warning
        }
    }
}
