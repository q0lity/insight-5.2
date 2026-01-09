import SwiftUI

struct CaptureReviewSection: View {
    @Binding var items: [CaptureReviewItem]
    let onAcceptAll: () -> Void
    let onRejectAll: () -> Void
    let onApply: () -> Void

    @Environment(ThemeStore.self) private var theme

    var body: some View {
        VStack(alignment: .leading, spacing: theme.metrics.spacingSmall) {
            InsightHeader(title: "Review", subtitle: "Swipe right to accept, left to reject")

            HStack(spacing: 12) {
                Button("Accept All") { onAcceptAll() }
                    .buttonStyle(.bordered)
                    .tint(theme.palette.success)
                Button("Reject All") { onRejectAll() }
                    .buttonStyle(.bordered)
                    .tint(theme.palette.error)
                Spacer()
                Button("Apply Accepted") { onApply() }
                    .buttonStyle(.borderedProminent)
                    .tint(theme.palette.tint)
            }

            ForEach($items) { $item in
                CaptureReviewCard(item: $item)
            }
        }
    }
}

struct CaptureReviewCard: View {
    @Binding var item: CaptureReviewItem

    @Environment(ThemeStore.self) private var theme
    @State private var dragOffset: CGFloat = 0
    @State private var isEditing = false

    private let swipeThreshold: CGFloat = 80

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: theme.metrics.radius, style: .continuous)
                .fill(backgroundColor)

            InsightCard {
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text(item.kindLabel)
                            .font(AppFont.body(theme.metrics.smallText))
                            .foregroundStyle(theme.palette.textSecondary)
                        Spacer()
                        Text(item.decisionLabel)
                            .font(AppFont.body(theme.metrics.smallText))
                            .foregroundStyle(decisionColor)
                    }

                    if isEditing {
                        TextField("Title", text: $item.title)
                            .textFieldStyle(.roundedBorder)
                    } else {
                        Text(item.title)
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)
                    }

                    if let detail = item.detail, !detail.isEmpty {
                        if isEditing {
                            TextField(
                                "Detail",
                                text: Binding(
                                    get: { item.detail ?? "" },
                                    set: { item.detail = $0.isEmpty ? nil : $0 }
                                )
                            )
                            .textFieldStyle(.roundedBorder)
                        } else {
                            Text(detail)
                                .font(AppFont.body(theme.metrics.smallText))
                                .foregroundStyle(theme.palette.textSecondary)
                        }
                    }

                    if item.kind == .futureEvent {
                        if isEditing {
                            TextField("Scheduled", text: Binding(
                                get: { item.scheduledTime ?? "" },
                                set: { item.scheduledTime = $0.isEmpty ? nil : $0 }
                            ))
                            .textFieldStyle(.roundedBorder)
                        } else if let scheduled = item.scheduledTime {
                            Text("Scheduled: \(scheduled)")
                                .font(AppFont.body(theme.metrics.smallText))
                                .foregroundStyle(theme.palette.textSecondary)
                        }
                    }

                    if item.kind == .task {
                        Toggle("Completed", isOn: $item.completed)
                            .toggleStyle(.switch)
                    }

                    if item.kind == .tracker {
                        TextField("Value", text: trackerValueBinding)
                            .textFieldStyle(.roundedBorder)
                    }

                    HStack {
                        Button(isEditing ? "Done" : "Edit") {
                            isEditing.toggle()
                        }
                        .buttonStyle(.bordered)
                        .tint(theme.palette.tint)

                        Spacer()

                        Button("Accept") { item.decision = .accepted }
                            .buttonStyle(.bordered)
                            .tint(theme.palette.success)
                        Button("Reject") { item.decision = .rejected }
                            .buttonStyle(.bordered)
                            .tint(theme.palette.error)
                    }
                }
            }
            .offset(x: dragOffset)
            .animation(.spring(response: 0.25, dampingFraction: 0.8), value: dragOffset)
        }
        .gesture(
            DragGesture()
                .onChanged { gesture in
                    dragOffset = gesture.translation.width
                }
                .onEnded { gesture in
                    if gesture.translation.width > swipeThreshold {
                        item.decision = .accepted
                    } else if gesture.translation.width < -swipeThreshold {
                        item.decision = .rejected
                    }
                    dragOffset = 0
                }
        )
    }

    private var backgroundColor: Color {
        if dragOffset > swipeThreshold / 2 || item.decision == .accepted {
            return theme.palette.success.opacity(theme.isDark ? 0.25 : 0.15)
        }
        if dragOffset < -swipeThreshold / 2 || item.decision == .rejected {
            return theme.palette.error.opacity(theme.isDark ? 0.25 : 0.15)
        }
        return theme.palette.surfaceAlt
    }

    private var decisionColor: Color {
        switch item.decision {
        case .accepted:
            return theme.palette.success
        case .rejected:
            return theme.palette.error
        case .pending:
            return theme.palette.textSecondary
        }
    }

    private var trackerValueBinding: Binding<String> {
        Binding(
            get: {
                switch item.trackerValue {
                case .number(let value):
                    return String(value)
                case .string(let value):
                    return value
                case .none:
                    return ""
                }
            },
            set: { newValue in
                if let number = Double(newValue) {
                    item.trackerValue = .number(number)
                } else if newValue.isEmpty {
                    item.trackerValue = nil
                } else {
                    item.trackerValue = .string(newValue)
                }
            }
        )
    }
}

private extension CaptureReviewItem {
    var kindLabel: String {
        switch kind {
        case .event:
            return "Event"
        case .futureEvent:
            return "Scheduled Event"
        case .task:
            return "TodoTask"
        case .tracker:
            return "Tracker"
        case .note:
            return "Note"
        }
    }

    var decisionLabel: String {
        switch decision {
        case .accepted:
            return "Accepted"
        case .rejected:
            return "Rejected"
        case .pending:
            return "Pending"
        }
    }
}
