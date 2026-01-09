import SwiftUI

// MARK: - Saved View Builder View

struct SavedViewBuilderView: View {
    @Environment(AppStore.self) private var appStore
    @Environment(ThemeStore.self) private var theme
    @Environment(\.dismiss) private var dismiss

    let existingView: SavedView?

    @State private var name: String = ""
    @State private var viewType: ViewType = .list
    @State private var isPinned: Bool = false
    @State private var filterConditions: [FilterCondition] = []
    @State private var conjunction: Conjunction = .and

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: theme.metrics.spacing) {
                    // Name
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Name")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)
                        TextField("My View", text: $name)
                            .textFieldStyle(.roundedBorder)
                    }

                    // View Type
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Type")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)

                        HStack(spacing: theme.metrics.spacingSmall) {
                            ForEach(ViewType.allCases, id: \.self) { type in
                                Button {
                                    viewType = type
                                } label: {
                                    VStack {
                                        Image(systemName: type.iconName)
                                            .font(.system(size: 24))
                                        Text(type.rawValue.capitalized)
                                            .font(AppFont.body(theme.metrics.smallText))
                                    }
                                    .foregroundStyle(viewType == type ? Color.white : theme.palette.text)
                                    .frame(maxWidth: .infinity)
                                    .padding()
                                    .background(viewType == type ? theme.palette.tint : theme.palette.surface)
                                    .cornerRadius(theme.metrics.cornerRadius)
                                }
                            }
                        }
                    }

                    // Pinned toggle
                    Toggle(isOn: $isPinned) {
                        HStack {
                            Image(systemName: "pin")
                            Text("Pin to top")
                        }
                        .font(AppFont.body(theme.metrics.bodyText))
                    }
                    .tint(theme.palette.tint)

                    Divider()

                    // Filters section
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("Filters")
                                .font(AppFont.title(theme.metrics.sectionTitle))
                                .foregroundStyle(theme.palette.text)
                            Spacer()

                            // Conjunction picker
                            Picker("", selection: $conjunction) {
                                Text("AND").tag(Conjunction.and)
                                Text("OR").tag(Conjunction.or)
                            }
                            .pickerStyle(.segmented)
                            .frame(width: 120)
                        }

                        // Filter conditions
                        ForEach(Array(filterConditions.enumerated()), id: \.element.id) { index, condition in
                            FilterConditionRow(
                                condition: Binding(
                                    get: { condition },
                                    set: { filterConditions[index] = $0 }
                                )
                            ) {
                                filterConditions.remove(at: index)
                            }
                        }

                        // Add filter button
                        Button {
                            filterConditions.append(
                                FilterCondition(
                                    property: .tags,
                                    operator: .contains,
                                    value: .string("")
                                )
                            )
                        } label: {
                            HStack {
                                Image(systemName: "plus.circle")
                                Text("Add Filter")
                            }
                            .font(AppFont.body(theme.metrics.bodyText))
                            .foregroundStyle(theme.palette.tint)
                        }
                    }

                    // Preview section
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Preview")
                            .font(AppFont.title(theme.metrics.sectionTitle))
                            .foregroundStyle(theme.palette.text)

                        let previewResults = previewEntries()
                        if previewResults.isEmpty {
                            Text("No entries match these filters")
                                .font(AppFont.body(theme.metrics.smallText))
                                .foregroundStyle(theme.palette.textSecondary)
                                .padding()
                        } else {
                            Text("\(previewResults.count) entries match")
                                .font(AppFont.body(theme.metrics.smallText))
                                .foregroundStyle(theme.palette.success)

                            ForEach(previewResults.prefix(3), id: \.id) { entry in
                                HStack {
                                    Text(entry.title)
                                        .font(AppFont.body(theme.metrics.smallText))
                                        .foregroundStyle(theme.palette.text)
                                    Spacer()
                                    if let date = entry.startAt {
                                        Text(date, style: .date)
                                            .font(AppFont.body(theme.metrics.smallText))
                                            .foregroundStyle(theme.palette.textSecondary)
                                    }
                                }
                                .padding(8)
                                .background(theme.palette.surface)
                                .cornerRadius(6)
                            }

                            if previewResults.count > 3 {
                                Text("+ \(previewResults.count - 3) more")
                                    .font(AppFont.body(theme.metrics.smallText))
                                    .foregroundStyle(theme.palette.textSecondary)
                            }
                        }
                    }
                }
                .padding(theme.metrics.spacing)
            }
            .background(theme.palette.background)
            .navigationTitle(existingView == nil ? "New View" : "Edit View")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        saveView()
                        dismiss()
                    }
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
            .onAppear {
                if let existing = existingView {
                    name = existing.name
                    viewType = existing.viewType
                    isPinned = existing.options.isPinned
                    // Extract conditions from query
                    if case .group(let group) = existing.query.root {
                        conjunction = group.conjunction
                        filterConditions = group.children.compactMap { node in
                            if case .condition(let c) = node { return c }
                            return nil
                        }
                    }
                }
            }
        }
    }

    private func previewEntries() -> [Entry] {
        let query = buildQuery()
        return SavedViewQueryService.apply(
            query: query,
            to: appStore.entries,
            trackerLogs: appStore.trackerLogs,
            trackers: appStore.trackers
        )
    }

    private func buildQuery() -> SavedViewQuery {
        let children = filterConditions.map { FilterNode.condition($0) }
        let root = FilterNode.group(FilterGroup(conjunction: conjunction, children: children))
        return SavedViewQuery(root: root, sort: nil, timeRange: nil)
    }

    private func saveView() {
        let query = buildQuery()
        let options = SavedViewOptions(isPinned: isPinned)

        if let existing = existingView {
            var updated = existing
            updated.name = name.trimmingCharacters(in: .whitespacesAndNewlines)
            updated.viewType = viewType
            updated.query = query
            updated.options = options
            updated.updatedAt = Date()
            appStore.updateSavedView(updated)
        } else {
            let newView = SavedView(
                name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                viewType: viewType,
                query: query,
                options: options
            )
            appStore.addSavedView(newView)
        }
    }
}

// MARK: - Filter Condition Row

struct FilterConditionRow: View {
    @Environment(ThemeStore.self) private var theme
    @Binding var condition: FilterCondition
    let onDelete: () -> Void

    private let propertyOptions: [(FilterProperty, String)] = [
        (.tags, "Tags"),
        (.contexts, "Contexts"),
        (.people, "People"),
        (.facets, "Type"),
        (.status, "Status"),
        (.priority, "Priority"),
        (.title, "Title"),
        (.startAt, "Start Date"),
        (.dueAt, "Due Date"),
        (.importance, "Importance"),
        (.difficulty, "Difficulty")
    ]

    private var operatorOptions: [FilterOperator] {
        switch condition.property {
        case .tags, .contexts, .people, .facets:
            return [.contains, .notContains, .empty, .notEmpty]
        case .status, .priority, .title:
            return [.is, .isNot, .contains, .notContains, .empty, .notEmpty]
        case .startAt, .dueAt, .scheduledAt, .createdAt, .completedAt:
            return [.before, .after, .onOrBefore, .onOrAfter, .empty, .notEmpty]
        case .importance, .difficulty, .durationMinutes, .xp:
            return [.is, .gt, .gte, .lt, .lte, .empty, .notEmpty]
        default:
            return [.is, .isNot, .contains, .notContains]
        }
    }

    var body: some View {
        HStack(spacing: 8) {
            // Property picker
            Menu {
                ForEach(propertyOptions, id: \.0.rawValue) { (prop, label) in
                    Button(label) {
                        condition.property = prop
                    }
                }
            } label: {
                HStack {
                    Text(propertyLabel)
                    Image(systemName: "chevron.down")
                }
                .font(AppFont.body(theme.metrics.smallText))
                .foregroundStyle(theme.palette.text)
                .padding(.horizontal, 8)
                .padding(.vertical, 6)
                .background(theme.palette.surface)
                .cornerRadius(6)
            }

            // Operator picker
            Menu {
                ForEach(operatorOptions, id: \.self) { op in
                    Button(op.label) {
                        condition.operator = op
                    }
                }
            } label: {
                HStack {
                    Text(condition.operator.label)
                    Image(systemName: "chevron.down")
                }
                .font(AppFont.body(theme.metrics.smallText))
                .foregroundStyle(theme.palette.text)
                .padding(.horizontal, 8)
                .padding(.vertical, 6)
                .background(theme.palette.surface)
                .cornerRadius(6)
            }

            // Value input (if not empty/notEmpty)
            if condition.operator != .empty && condition.operator != .notEmpty {
                TextField("value", text: valueBinding)
                    .textFieldStyle(.roundedBorder)
                    .frame(maxWidth: 100)
            }

            // Delete button
            Button {
                onDelete()
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .foregroundStyle(theme.palette.textSecondary)
            }
        }
        .padding(8)
        .background(theme.palette.background)
        .cornerRadius(theme.metrics.cornerRadius)
    }

    private var propertyLabel: String {
        propertyOptions.first { $0.0.rawValue == condition.property.rawValue }?.1 ?? condition.property.rawValue
    }

    private var valueBinding: Binding<String> {
        Binding(
            get: {
                if case .string(let s) = condition.value { return s }
                if case .number(let n) = condition.value { return String(n) }
                return ""
            },
            set: { newValue in
                if let num = Double(newValue) {
                    condition.value = .number(num)
                } else {
                    condition.value = .string(newValue)
                }
            }
        )
    }
}

// MARK: - Filter Operator Label

extension FilterOperator {
    var label: String {
        switch self {
        case .is: return "is"
        case .isNot: return "is not"
        case .contains: return "contains"
        case .notContains: return "doesn't contain"
        case .before: return "before"
        case .after: return "after"
        case .onOrBefore: return "on or before"
        case .onOrAfter: return "on or after"
        case .empty: return "is empty"
        case .notEmpty: return "is not empty"
        case .gt: return ">"
        case .gte: return ">="
        case .lt: return "<"
        case .lte: return "<="
        }
    }
}
