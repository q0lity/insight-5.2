import ActivityKit
import AppIntents
import InsightSwiftFeature
import SwiftUI
import WidgetKit

@available(iOS 17.0, *)
struct InsightLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: InsightLiveActivityAttributes.self) { context in
            InsightLiveActivityLockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: iconName(for: context.state.activityType))
                        .font(.title3)
                        .foregroundStyle(iconColor(for: context.state.activityType))
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(context.state.title)
                        .font(.headline)
                        .lineLimit(1)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    LiveActivityTimerView(
                        startedAt: context.state.startedAt,
                        targetDuration: context.state.targetDuration,
                        activityType: context.state.activityType
                    )
                    .font(.headline.monospacedDigit())
                }
                DynamicIslandExpandedRegion(.bottom) {
                    if context.state.activityType == .recording {
                        Button(intent: RecordingActionIntent(isRecording: context.state.isRecording)) {
                            Label(
                                context.state.isRecording ? "Stop" : "Record",
                                systemImage: context.state.isRecording ? "stop.circle.fill" : "mic.fill"
                            )
                        }
                        .buttonStyle(.borderedProminent)
                    } else {
                        HStack(spacing: 16) {
                            Label(activityLabel(for: context.state.activityType), systemImage: iconName(for: context.state.activityType))
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            } compactLeading: {
                Image(systemName: iconName(for: context.state.activityType))
                    .foregroundStyle(iconColor(for: context.state.activityType))
            } compactTrailing: {
                LiveActivityTimerView(
                    startedAt: context.state.startedAt,
                    targetDuration: context.state.targetDuration,
                    activityType: context.state.activityType
                )
            } minimal: {
                Image(systemName: iconName(for: context.state.activityType))
                    .foregroundStyle(iconColor(for: context.state.activityType))
            }
        }
    }

    private func iconName(for activityType: InsightLiveActivityAttributes.ContentState.ActivityType) -> String {
        switch activityType {
        case .recording:
            return "mic.fill"
        case .focus:
            return "brain.head.profile"
        case .pomodoro:
            return "timer"
        }
    }

    private func iconColor(for activityType: InsightLiveActivityAttributes.ContentState.ActivityType) -> Color {
        switch activityType {
        case .recording:
            return .red
        case .focus:
            return .purple
        case .pomodoro:
            return .orange
        }
    }

    private func activityLabel(for activityType: InsightLiveActivityAttributes.ContentState.ActivityType) -> String {
        switch activityType {
        case .recording:
            return "Recording"
        case .focus:
            return "Focus Session"
        case .pomodoro:
            return "Pomodoro"
        }
    }
}

@available(iOS 17.0, *)
struct InsightLiveActivityLockScreenView: View {
    let context: ActivityViewContext<InsightLiveActivityAttributes>

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            Image(systemName: iconName(for: context.state.activityType))
                .font(.title2)
                .foregroundStyle(iconColor(for: context.state.activityType))

            VStack(alignment: .leading, spacing: 6) {
                Text(context.state.title)
                    .font(.headline)
                    .lineLimit(1)

                LiveActivityTimerView(
                    startedAt: context.state.startedAt,
                    targetDuration: context.state.targetDuration,
                    activityType: context.state.activityType
                )
                .font(.title2.monospacedDigit())
            }

            Spacer()

            if context.state.activityType == .recording {
                Button(intent: RecordingActionIntent(isRecording: context.state.isRecording)) {
                    Label(
                        context.state.isRecording ? "Stop" : "Record",
                        systemImage: context.state.isRecording ? "stop.circle.fill" : "mic.circle.fill"
                    )
                }
                .buttonStyle(.bordered)
            } else {
                Text(activityLabel(for: context.state.activityType))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(.ultraThinMaterial, in: Capsule())
            }
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
    }

    private func iconName(for activityType: InsightLiveActivityAttributes.ContentState.ActivityType) -> String {
        switch activityType {
        case .recording:
            return "mic.fill"
        case .focus:
            return "brain.head.profile"
        case .pomodoro:
            return "timer"
        }
    }

    private func iconColor(for activityType: InsightLiveActivityAttributes.ContentState.ActivityType) -> Color {
        switch activityType {
        case .recording:
            return .red
        case .focus:
            return .purple
        case .pomodoro:
            return .orange
        }
    }

    private func activityLabel(for activityType: InsightLiveActivityAttributes.ContentState.ActivityType) -> String {
        switch activityType {
        case .recording:
            return "Recording"
        case .focus:
            return "Focus"
        case .pomodoro:
            return "Pomodoro"
        }
    }
}

@available(iOS 17.0, *)
struct LiveActivityTimerView: View {
    let startedAt: Date
    let targetDuration: TimeInterval?
    let activityType: InsightLiveActivityAttributes.ContentState.ActivityType

    init(
        startedAt: Date,
        targetDuration: TimeInterval? = nil,
        activityType: InsightLiveActivityAttributes.ContentState.ActivityType = .recording
    ) {
        self.startedAt = startedAt
        self.targetDuration = targetDuration
        self.activityType = activityType
    }

    var body: some View {
        if let targetDuration {
            // Countdown timer: show time remaining
            let endDate = startedAt.addingTimeInterval(targetDuration)
            Text(endDate, style: .timer)
                .monospacedDigit()
                .foregroundStyle(timerColor)
        } else {
            // Elapsed timer: show time since start
            Text(startedAt, style: .timer)
                .monospacedDigit()
        }
    }

    private var timerColor: Color {
        switch activityType {
        case .recording:
            return .primary
        case .focus:
            return .purple
        case .pomodoro:
            return .orange
        }
    }
}

@available(iOS 17.0, *)
@main
struct InsightLiveActivityWidgetBundle: WidgetBundle {
    var body: some Widget {
        InsightLiveActivityWidget()
    }
}
