import SwiftUI

// MARK: - Saved Views List View

struct SavedViewsListView: View {
    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme
    @State private var showBuilder = false
    @State private var editingView: SavedView? = nil

    private var pinnedViews: [SavedView] {
        appStore.savedViews.filter { $0.options.isPinned }
    }

    private var unpinnedViews: [SavedView] {
        appStore.savedViews.filter { !$0.options.isPinned }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                InsightHeader(title: "Saved Views", subtitle: "Custom filtered views")

                // Pinned views
                if !pinnedViews.isEmpty {
                    VStack(alignment: .leading, spacing: theme.metrics.spacingSmall) {
                        Text("Pinned")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)

                        ForEach(pinnedViews) { view in
                            SavedViewRow(view: view) {
                                editingView = view
                            } onTogglePin: {
                                appStore.toggleSavedViewPinned(id: view.id)
                            } onDelete: {
                                appStore.deleteSavedView(id: view.id)
                            }
                        }
                    }
                }

                // All views
                VStack(alignment: .leading, spacing: theme.metrics.spacingSmall) {
                    Text("All Views")
                        .font(AppFont.title(theme.metrics.sectionTitle))
                        .foregroundStyle(theme.palette.text)

                    if unpinnedViews.isEmpty && pinnedViews.isEmpty {
                        VStack(spacing: theme.metrics.spacing) {
                            Image(systemName: "square.stack.3d.up")
                                .font(.system(size: 48))
                                .foregroundStyle(theme.palette.textSecondary.opacity(0.5))
                            Text("No saved views yet")
                                .font(AppFont.body(theme.metrics.bodyText))
                                .foregroundStyle(theme.palette.textSecondary)
                            Text("Create custom filtered views to quickly access your data")
                                .font(AppFont.body(theme.metrics.smallText))
                                .foregroundStyle(theme.palette.textSecondary)
                                .multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, theme.metrics.spacing * 2)
                    } else {
                        ForEach(unpinnedViews) { view in
                            SavedViewRow(view: view) {
                                editingView = view
                            } onTogglePin: {
                                appStore.toggleSavedViewPinned(id: view.id)
                            } onDelete: {
                                appStore.deleteSavedView(id: view.id)
                            }
                        }
                    }
                }
            }
            .padding(theme.metrics.spacing)
        }
        .background(theme.palette.background)
        .navigationTitle("Views")
        .toolbarBackground(theme.palette.background, for: .navigationBar)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    showBuilder = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showBuilder) {
            SavedViewBuilderView(existingView: nil)
        }
        .sheet(item: $editingView) { view in
            SavedViewBuilderView(existingView: view)
        }
    }
}

// MARK: - Saved View Row

struct SavedViewRow: View {
    @Environment(ThemeStore.self) private var theme
    let view: SavedView
    let onEdit: () -> Void
    let onTogglePin: () -> Void
    let onDelete: () -> Void

    var body: some View {
        InsightCard {
            HStack(spacing: theme.metrics.spacingSmall) {
                // View type icon
                Image(systemName: view.viewType.iconName)
                    .font(.system(size: 18))
                    .foregroundStyle(theme.palette.tint)
                    .frame(width: 28, height: 28)
                    .background(theme.palette.tint.opacity(0.15))
                    .cornerRadius(6)

                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(view.name)
                            .font(AppFont.body(theme.metrics.bodyText))
                            .foregroundStyle(theme.palette.text)

                        if view.options.isPinned {
                            Image(systemName: "pin.fill")
                                .font(.system(size: 10))
                                .foregroundStyle(theme.palette.warning)
                        }
                    }

                    Text(view.viewType.rawValue.capitalized)
                        .font(AppFont.body(theme.metrics.smallText))
                        .foregroundStyle(theme.palette.textSecondary)
                }

                Spacer()

                // Actions menu
                Menu {
                    Button {
                        onEdit()
                    } label: {
                        Label("Edit", systemImage: "pencil")
                    }

                    Button {
                        onTogglePin()
                    } label: {
                        Label(view.options.isPinned ? "Unpin" : "Pin", systemImage: view.options.isPinned ? "pin.slash" : "pin")
                    }

                    Divider()

                    Button(role: .destructive) {
                        onDelete()
                    } label: {
                        Label("Delete", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis")
                        .font(.system(size: 16))
                        .foregroundStyle(theme.palette.textSecondary)
                        .frame(width: 32, height: 32)
                }
            }
        }
    }
}

// MARK: - View Type Extensions

extension ViewType {
    var iconName: String {
        switch self {
        case .list: return "list.bullet"
        case .chart: return "chart.bar"
        case .dashboard: return "square.grid.2x2"
        }
    }
}
