import SwiftUI

// MARK: - Timeline Filter Sheet

struct TimelineFilterSheet: View {
    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme
    @Environment(\.dismiss) private var dismiss

    @Binding var filterState: TimelineFilterState

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: theme.metrics.spacing) {

                    // Tags section
                    FilterSection(title: "Tags") {
                        FlowLayout(spacing: theme.metrics.spacingSmall) {
                            ForEach(appStore.tags, id: \.id) { tag in
                                FilterChip(
                                    label: tag.name,
                                    isSelected: filterState.selectedTags.contains(tag.name),
                                    color: Color(hex: tag.colorHex) ?? theme.palette.tint
                                ) {
                                    if filterState.selectedTags.contains(tag.name) {
                                        filterState.selectedTags.remove(tag.name)
                                    } else {
                                        filterState.selectedTags.insert(tag.name)
                                    }
                                }
                            }
                        }
                    }

                    // People section
                    FilterSection(title: "People") {
                        FlowLayout(spacing: theme.metrics.spacingSmall) {
                            ForEach(appStore.people, id: \.id) { person in
                                FilterChip(
                                    label: person.name,
                                    isSelected: filterState.selectedPeople.contains(person.name),
                                    color: theme.palette.success
                                ) {
                                    if filterState.selectedPeople.contains(person.name) {
                                        filterState.selectedPeople.remove(person.name)
                                    } else {
                                        filterState.selectedPeople.insert(person.name)
                                    }
                                }
                            }
                        }
                    }

                    // Contexts section
                    FilterSection(title: "Contexts") {
                        let allContexts = Set(appStore.entries.flatMap { $0.contexts })
                        FlowLayout(spacing: theme.metrics.spacingSmall) {
                            ForEach(Array(allContexts).sorted(), id: \.self) { context in
                                FilterChip(
                                    label: context,
                                    isSelected: filterState.selectedContexts.contains(context),
                                    color: theme.palette.warning
                                ) {
                                    if filterState.selectedContexts.contains(context) {
                                        filterState.selectedContexts.remove(context)
                                    } else {
                                        filterState.selectedContexts.insert(context)
                                    }
                                }
                            }
                        }
                    }

                    // Date range section
                    FilterSection(title: "Date Range") {
                        VStack(alignment: .leading, spacing: theme.metrics.spacingSmall) {
                            HStack {
                                Text("From:")
                                    .font(AppFont.body(theme.metrics.bodyText))
                                    .foregroundStyle(theme.palette.textSecondary)
                                Spacer()
                                if let start = filterState.startDate {
                                    DatePicker("", selection: Binding(
                                        get: { start },
                                        set: { filterState.startDate = $0 }
                                    ), displayedComponents: .date)
                                    .labelsHidden()

                                    Button {
                                        filterState.startDate = nil
                                    } label: {
                                        Image(systemName: "xmark.circle.fill")
                                            .foregroundStyle(theme.palette.textSecondary)
                                    }
                                } else {
                                    Button("Set date") {
                                        filterState.startDate = Calendar.current.date(byAdding: .day, value: -7, to: Date())
                                    }
                                    .font(AppFont.body(theme.metrics.bodyText))
                                    .foregroundStyle(theme.palette.tint)
                                }
                            }

                            HStack {
                                Text("To:")
                                    .font(AppFont.body(theme.metrics.bodyText))
                                    .foregroundStyle(theme.palette.textSecondary)
                                Spacer()
                                if let end = filterState.endDate {
                                    DatePicker("", selection: Binding(
                                        get: { end },
                                        set: { filterState.endDate = $0 }
                                    ), displayedComponents: .date)
                                    .labelsHidden()

                                    Button {
                                        filterState.endDate = nil
                                    } label: {
                                        Image(systemName: "xmark.circle.fill")
                                            .foregroundStyle(theme.palette.textSecondary)
                                    }
                                } else {
                                    Button("Set date") {
                                        filterState.endDate = Date()
                                    }
                                    .font(AppFont.body(theme.metrics.bodyText))
                                    .foregroundStyle(theme.palette.tint)
                                }
                            }

                            // Quick presets
                            HStack(spacing: theme.metrics.spacingSmall) {
                                QuickDateButton(label: "Today") {
                                    let today = Calendar.current.startOfDay(for: Date())
                                    filterState.startDate = today
                                    filterState.endDate = Calendar.current.date(byAdding: .day, value: 1, to: today)
                                }
                                QuickDateButton(label: "7 days") {
                                    filterState.startDate = Calendar.current.date(byAdding: .day, value: -7, to: Date())
                                    filterState.endDate = Date()
                                }
                                QuickDateButton(label: "30 days") {
                                    filterState.startDate = Calendar.current.date(byAdding: .day, value: -30, to: Date())
                                    filterState.endDate = Date()
                                }
                            }
                        }
                    }
                }
                .padding(theme.metrics.spacing)
            }
            .background(theme.palette.background)
            .navigationTitle("Filters")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Clear") {
                        filterState.clear()
                    }
                    .foregroundStyle(theme.palette.error)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundStyle(theme.palette.tint)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}

// MARK: - Filter Section

struct FilterSection<Content: View>: View {
    @Environment(ThemeStore.self) private var theme
    let title: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: theme.metrics.spacingSmall) {
            Text(title)
                .font(AppFont.title(theme.metrics.sectionTitle))
                .foregroundStyle(theme.palette.text)
            content
        }
        .padding(theme.metrics.spacingSmall)
        .background(theme.palette.surface)
        .cornerRadius(theme.metrics.cornerRadius)
    }
}

// MARK: - Quick Date Button

struct QuickDateButton: View {
    @Environment(ThemeStore.self) private var theme
    let label: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(AppFont.body(theme.metrics.smallText))
                .foregroundStyle(theme.palette.text)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(theme.palette.background)
                .cornerRadius(8)
        }
    }
}

// MARK: - Flow Layout

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = computeLayout(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = computeLayout(proposal: proposal, subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y), proposal: .unspecified)
        }
    }

    private func computeLayout(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, positions: [CGPoint]) {
        var positions: [CGPoint] = []
        var currentX: CGFloat = 0
        var currentY: CGFloat = 0
        var lineHeight: CGFloat = 0
        let maxWidth = proposal.width ?? .infinity

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)

            if currentX + size.width > maxWidth && currentX > 0 {
                currentX = 0
                currentY += lineHeight + spacing
                lineHeight = 0
            }

            positions.append(CGPoint(x: currentX, y: currentY))
            currentX += size.width + spacing
            lineHeight = max(lineHeight, size.height)
        }

        return (CGSize(width: maxWidth, height: currentY + lineHeight), positions)
    }
}

// MARK: - Color Extension

extension Color {
    init?(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")

        var rgb: UInt64 = 0
        guard Scanner(string: hexSanitized).scanHexInt64(&rgb) else { return nil }

        let r = Double((rgb & 0xFF0000) >> 16) / 255.0
        let g = Double((rgb & 0x00FF00) >> 8) / 255.0
        let b = Double(rgb & 0x0000FF) / 255.0

        self.init(red: r, green: g, blue: b)
    }
}
