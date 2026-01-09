import SwiftUI

struct MoreView: View {
    @Environment(ThemeStore.self) private var theme

    private let columns = [GridItem(.flexible()), GridItem(.flexible())]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: "More", subtitle: "Navigate every workspace")

                LazyVGrid(columns: columns, spacing: theme.metrics.spacingSmall) {
                    ForEach(menuItems) { item in
                        NavigationLink {
                            item.destination
                        } label: {
                            MoreCard(item: item)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(theme.metrics.spacing)
        }
        .background(theme.palette.background)
        .navigationTitle("More")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
    }

    private var menuItems: [MoreItem] {
        [
            MoreItem(title: "Explore", icon: "sparkles", color: theme.palette.warning, destination: AnyView(ExploreView())),
            MoreItem(title: "Goals", icon: "target", color: theme.palette.tint, destination: AnyView(GoalsView())),
            MoreItem(title: "Projects", icon: "briefcase", color: theme.palette.tint, destination: AnyView(ProjectsView())),
            MoreItem(title: "Rewards", icon: "gift", color: theme.palette.warning, destination: AnyView(RewardsView())),
            MoreItem(title: "Reports", icon: "chart.bar.xaxis", color: theme.palette.success, destination: AnyView(ReportsView())),
            MoreItem(title: "Health", icon: "heart.text.square", color: theme.palette.success, destination: AnyView(HealthView())),
            MoreItem(title: "Trackers", icon: "gauge.with.dots.needle.67percent", color: theme.palette.warning, destination: AnyView(TrackersView())),
            MoreItem(title: "People", icon: "person.2.fill", color: theme.palette.tint, destination: AnyView(PeopleView())),
            MoreItem(title: "Places", icon: "mappin.and.ellipse", color: theme.palette.error, destination: AnyView(PlacesView())),
            MoreItem(title: "Tags", icon: "tag.fill", color: theme.palette.tint, destination: AnyView(TagsView())),
            MoreItem(title: "Tasks", icon: "checklist", color: theme.palette.tint, destination: AnyView(TasksView())),
            MoreItem(title: "Agenda", icon: "list.bullet.rectangle", color: theme.palette.tint, destination: AnyView(AgendaView())),
            MoreItem(title: "Kanban", icon: "square.grid.3x2", color: theme.palette.warning, destination: AnyView(KanbanView())),
            MoreItem(title: "TickTick", icon: "checkmark.seal", color: theme.palette.success, destination: AnyView(TickTickView())),
            MoreItem(title: "Saved Views", icon: "square.stack.3d.up", color: theme.palette.tint, destination: AnyView(SavedViewsListView())),
            MoreItem(title: "Timeline", icon: "clock.arrow.circlepath", color: theme.palette.warning, destination: AnyView(TimelineView())),
            MoreItem(title: "Reflections", icon: "quote.bubble", color: theme.palette.tint, destination: AnyView(ReflectionsView())),
            MoreItem(title: "Notes", icon: "note.text", color: theme.palette.tint, destination: AnyView(NotesView())),
            MoreItem(title: "Assistant", icon: "sparkle.magnifyingglass", color: theme.palette.success, destination: AnyView(AssistantView())),
            MoreItem(title: "Voice", icon: "waveform", color: theme.palette.warning, destination: AnyView(VoiceView())),
            MoreItem(title: "Ecosystem", icon: "dot.radiowaves.left.and.right", color: theme.palette.warning, destination: AnyView(EcosystemView())),
            MoreItem(title: "Settings", icon: "gearshape.fill", color: theme.palette.textSecondary, destination: AnyView(SettingsView()))
        ]
    }
}

private struct MoreItem: Identifiable {
    let id = UUID()
    let title: String
    let icon: String
    let color: Color
    let destination: AnyView
}

private struct MoreCard: View {
    let item: MoreItem
    @Environment(ThemeStore.self) private var theme

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            ZStack {
                Circle()
                    .fill(item.color.opacity(theme.isDark ? 0.25 : 0.15))
                    .frame(width: 48, height: 48)
                Image(systemName: item.icon)
                    .foregroundStyle(item.color)
                    .font(.system(size: 20, weight: .semibold))
            }

            Text(item.title)
                .font(AppFont.body(theme.metrics.bodyText))
                .foregroundStyle(theme.palette.text)
        }
        .padding(theme.metrics.cardPadding)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(theme.palette.surface)
        .overlay(
            RoundedRectangle(cornerRadius: theme.metrics.radius, style: .continuous)
                .stroke(theme.palette.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: theme.metrics.radius, style: .continuous))
        .shadow(color: theme.palette.borderLight, radius: 8, x: 0, y: 6)
    }
}
