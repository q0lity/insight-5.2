# shadcn/ui Pattern Research → SwiftUI Adaptations

Research document analyzing shadcn/ui component patterns and their SwiftUI equivalents.

---

## 1. Core Philosophy

### shadcn/ui Principles
1. **Open Code** — Components are source code you own, not npm packages
2. **Composition** — Composable interfaces with consistent styling
3. **Headless Architecture** — Logic separate from presentation
4. **Beautiful Defaults** — Minimal, clean aesthetics out of the box
5. **AI-Ready** — Consistent patterns for tooling/generation

### SwiftUI Adaptation
SwiftUI naturally aligns with these principles:
- **Open Code** → Custom ViewModifiers and Views you control
- **Composition** → View protocol and `@ViewBuilder`
- **Headless** → Separate data models from views (MV pattern)
- **Defaults** → System styles with customization points
- **AI-Ready** → Declarative, consistent syntax

---

## 2. Component Composition Patterns

### shadcn/ui: Compound Components
```tsx
// React: Multiple exports working together
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content here</CardContent>
  <CardFooter>Actions</CardFooter>
</Card>
```

### SwiftUI Adaptation: @ViewBuilder + Container Views
```swift
// SwiftUI: Generic container with @ViewBuilder slots
struct Card<Header: View, Content: View, Footer: View>: View {
    let header: Header
    let content: Content
    let footer: Footer

    init(
        @ViewBuilder header: () -> Header,
        @ViewBuilder content: () -> Content,
        @ViewBuilder footer: () -> Footer
    ) {
        self.header = header()
        self.content = content()
        self.footer = footer()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
                .padding()
            content
                .padding(.horizontal)
            footer
                .padding()
        }
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(radius: 2)
    }
}

// Usage mirrors shadcn pattern
Card {
    // Header slot
    VStack(alignment: .leading) {
        Text("Title").font(.headline)
        Text("Description").foregroundStyle(.secondary)
    }
} content: {
    Text("Content here")
} footer: {
    Button("Action") { }
}
```

---

## 3. Radix UI Primitives → SwiftUI Equivalents

### shadcn/ui: Wrapping Radix Primitives
shadcn/ui wraps Radix UI primitives (Dialog, Popover, DropdownMenu, etc.) adding:
- Consistent styling via Tailwind
- Compound component exports
- Accessibility built-in

### SwiftUI Adaptation: Native Primitives
| Radix Primitive | SwiftUI Equivalent |
|-----------------|-------------------|
| `Dialog` | `.sheet()`, `.fullScreenCover()`, `.alert()` |
| `Popover` | `.popover()` |
| `DropdownMenu` | `Menu` |
| `Tooltip` | `.help()`, custom `.popover()` |
| `Tabs` | `TabView`, `Picker` with `.segmented` |
| `Accordion` | `DisclosureGroup` |
| `Switch` | `Toggle` |
| `Checkbox` | `Toggle` with custom style |
| `Slider` | `Slider` |
| `Select` | `Picker` |

SwiftUI provides these as first-class citizens with accessibility built-in.

---

## 4. Tailwind Utility-First → SwiftUI Modifiers

### shadcn/ui: Tailwind Classes
```tsx
<div className="flex items-center justify-between p-4 rounded-lg bg-card text-card-foreground shadow-sm">
```

### SwiftUI Adaptation: Modifier Chains
```swift
HStack {
    // content
}
.padding()
.background(.background)
.foregroundStyle(.primary)
.clipShape(RoundedRectangle(cornerRadius: 12))
.shadow(radius: 2)
```

### Utility Mapping Table
| Tailwind | SwiftUI Modifier |
|----------|------------------|
| `flex` | `HStack`, `VStack` |
| `items-center` | `alignment: .center` |
| `justify-between` | `Spacer()` between items |
| `p-4` | `.padding()` |
| `px-4 py-2` | `.padding(.horizontal).padding(.vertical, 8)` |
| `rounded-lg` | `.clipShape(RoundedRectangle(cornerRadius: 12))` |
| `bg-card` | `.background(.background)` |
| `text-muted-foreground` | `.foregroundStyle(.secondary)` |
| `shadow-sm` | `.shadow(radius: 2)` |
| `gap-2` | `spacing: 8` in Stack |
| `w-full` | `.frame(maxWidth: .infinity)` |
| `hidden` | Conditional rendering |
| `opacity-50` | `.opacity(0.5)` |
| `transition-all` | `.animation(.default, value:)` |

---

## 5. CVA Variant System → SwiftUI Enums

### shadcn/ui: class-variance-authority (cva)
```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

### SwiftUI Adaptation: Enums + ViewModifiers
```swift
// MARK: - Variant Enums
enum ButtonVariant {
    case `default`
    case destructive
    case outline
    case secondary
    case ghost
    case link
}

enum ButtonSize {
    case `default`
    case sm
    case lg
    case icon
}

// MARK: - Button Style
struct InsightButtonStyle: ButtonStyle {
    let variant: ButtonVariant
    let size: ButtonSize

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(fontSize)
            .fontWeight(.medium)
            .padding(padding)
            .frame(minWidth: minWidth, minHeight: minHeight)
            .foregroundStyle(foregroundColor)
            .background(backgroundColor(isPressed: configuration.isPressed))
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
            .overlay(overlayBorder)
            .opacity(configuration.isPressed ? 0.9 : 1.0)
    }

    // MARK: - Variant Styles
    private var foregroundColor: Color {
        switch variant {
        case .default: return .white
        case .destructive: return .white
        case .outline: return .primary
        case .secondary: return .primary
        case .ghost: return .primary
        case .link: return .accentColor
        }
    }

    private func backgroundColor(isPressed: Bool) -> Color {
        let base: Color = switch variant {
        case .default: .accentColor
        case .destructive: .red
        case .outline: .clear
        case .secondary: Color(.secondarySystemBackground)
        case .ghost: .clear
        case .link: .clear
        }
        return isPressed ? base.opacity(0.8) : base
    }

    @ViewBuilder
    private var overlayBorder: some View {
        if variant == .outline {
            RoundedRectangle(cornerRadius: cornerRadius)
                .stroke(Color(.separator), lineWidth: 1)
        }
    }

    // MARK: - Size Styles
    private var fontSize: Font {
        switch size {
        case .default, .icon: return .subheadline
        case .sm: return .caption
        case .lg: return .body
        }
    }

    private var padding: EdgeInsets {
        switch size {
        case .default: return EdgeInsets(top: 10, leading: 16, bottom: 10, trailing: 16)
        case .sm: return EdgeInsets(top: 8, leading: 12, bottom: 8, trailing: 12)
        case .lg: return EdgeInsets(top: 12, leading: 24, bottom: 12, trailing: 24)
        case .icon: return EdgeInsets(top: 10, leading: 10, bottom: 10, trailing: 10)
        }
    }

    private var minHeight: CGFloat {
        switch size {
        case .default, .icon: return 40
        case .sm: return 36
        case .lg: return 44
        }
    }

    private var minWidth: CGFloat? {
        size == .icon ? 40 : nil
    }

    private var cornerRadius: CGFloat {
        switch size {
        case .sm: return 6
        default: return 8
        }
    }
}

// MARK: - View Extension
extension View {
    func insightButtonStyle(
        variant: ButtonVariant = .default,
        size: ButtonSize = .default
    ) -> some View {
        self.buttonStyle(InsightButtonStyle(variant: variant, size: size))
    }
}

// MARK: - Usage
Button("Default") { }
    .insightButtonStyle()

Button("Destructive") { }
    .insightButtonStyle(variant: .destructive)

Button("Small Outline") { }
    .insightButtonStyle(variant: .outline, size: .sm)

Button { } label: {
    Image(systemName: "plus")
}
.insightButtonStyle(variant: .ghost, size: .icon)
```

---

## 6. Slot Pattern → SwiftUI @ViewBuilder

### shadcn/ui: asChild + Slot
```tsx
// Slot merges props onto child element
<Button asChild>
  <Link href="/dashboard">Go to Dashboard</Link>
</Button>
```

### SwiftUI Adaptation: Generic Views + @ViewBuilder
```swift
// Pattern 1: Generic Label Parameter
struct InsightButton<Label: View>: View {
    let action: () -> Void
    let label: Label
    var variant: ButtonVariant = .default

    init(
        variant: ButtonVariant = .default,
        action: @escaping () -> Void,
        @ViewBuilder label: () -> Label
    ) {
        self.variant = variant
        self.action = action
        self.label = label()
    }

    var body: some View {
        Button(action: action) {
            label
        }
        .insightButtonStyle(variant: variant)
    }
}

// Usage: Any view as label (like asChild)
InsightButton(action: { }) {
    NavigationLink(destination: DashboardView()) {
        Text("Go to Dashboard")
    }
}

// Pattern 2: LabeledContent for icon slots
struct IconButton: View {
    let icon: String
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Label(title, systemImage: icon)
        }
    }
}
```

---

## 7. Component Implementations

### 7.1 Card (Compound Component)
```swift
// MARK: - Card Components
struct CardHeader<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            content
        }
        .padding([.horizontal, .top])
    }
}

struct CardTitle: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.headline)
            .fontWeight(.semibold)
    }
}

struct CardDescription: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.subheadline)
            .foregroundStyle(.secondary)
    }
}

struct CardContent<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        content
            .padding(.horizontal)
    }
}

struct CardFooter<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        HStack {
            content
        }
        .padding([.horizontal, .bottom])
    }
}

struct InsightCard<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            content
        }
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }
}

// Usage
InsightCard {
    CardHeader {
        CardTitle(text: "Create project")
        CardDescription(text: "Deploy your new project in one-click.")
    }
    CardContent {
        TextField("Project name", text: $name)
    }
    CardFooter {
        Button("Cancel") { }
            .insightButtonStyle(variant: .outline)
        Spacer()
        Button("Deploy") { }
            .insightButtonStyle()
    }
}
```

### 7.2 Dialog/Sheet Pattern
```swift
// MARK: - Dialog State
@Observable
class DialogState {
    var isPresented = false

    func open() { isPresented = true }
    func close() { isPresented = false }
}

// MARK: - Dialog Content Builder
struct DialogContent<Content: View, Actions: View>: View {
    let title: String
    let description: String?
    let content: Content
    let actions: Actions

    init(
        title: String,
        description: String? = nil,
        @ViewBuilder content: () -> Content,
        @ViewBuilder actions: () -> Actions
    ) {
        self.title = title
        self.description = description
        self.content = content()
        self.actions = actions()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                if let description {
                    Text(description)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }

            // Content
            content

            // Actions
            HStack {
                Spacer()
                actions
            }
        }
        .padding()
    }
}

// MARK: - Usage
struct ExampleView: View {
    @State private var showDialog = false
    @State private var name = ""

    var body: some View {
        Button("Edit Profile") {
            showDialog = true
        }
        .sheet(isPresented: $showDialog) {
            DialogContent(
                title: "Edit profile",
                description: "Make changes to your profile here."
            ) {
                TextField("Name", text: $name)
                    .textFieldStyle(.roundedBorder)
            } actions: {
                Button("Cancel") { showDialog = false }
                    .insightButtonStyle(variant: .outline)
                Button("Save") { showDialog = false }
                    .insightButtonStyle()
            }
            .presentationDetents([.medium])
        }
    }
}
```

### 7.3 Form with Validation
```swift
// MARK: - Form Field
struct FormField<Content: View>: View {
    let label: String
    let description: String?
    let error: String?
    let content: Content

    init(
        _ label: String,
        description: String? = nil,
        error: String? = nil,
        @ViewBuilder content: () -> Content
    ) {
        self.label = label
        self.description = description
        self.error = error
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.subheadline)
                .fontWeight(.medium)

            content

            if let description, error == nil {
                Text(description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if let error {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
            }
        }
    }
}

// MARK: - Validated Input Style
struct ValidatedTextFieldStyle: TextFieldStyle {
    let isValid: Bool

    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding(12)
            .background(Color(.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(isValid ? Color.clear : Color.red, lineWidth: 1)
            )
    }
}

// MARK: - Usage
struct SignupForm: View {
    @State private var username = ""
    @State private var usernameError: String?

    var body: some View {
        Form {
            FormField(
                "Username",
                description: "This is your public display name.",
                error: usernameError
            ) {
                TextField("shadcn", text: $username)
                    .textFieldStyle(ValidatedTextFieldStyle(isValid: usernameError == nil))
                    .onChange(of: username) { _, newValue in
                        validateUsername(newValue)
                    }
            }

            Button("Submit") { }
                .insightButtonStyle()
        }
    }

    private func validateUsername(_ value: String) {
        if value.count < 2 {
            usernameError = "Username must be at least 2 characters."
        } else {
            usernameError = nil
        }
    }
}
```

### 7.4 Toast/Alert System (Sonner-style)
```swift
// MARK: - Toast Types
enum ToastType {
    case `default`
    case success
    case info
    case warning
    case error

    var icon: String {
        switch self {
        case .default: return "bell"
        case .success: return "checkmark.circle.fill"
        case .info: return "info.circle.fill"
        case .warning: return "exclamationmark.triangle.fill"
        case .error: return "xmark.circle.fill"
        }
    }

    var color: Color {
        switch self {
        case .default: return .primary
        case .success: return .green
        case .info: return .blue
        case .warning: return .orange
        case .error: return .red
        }
    }
}

// MARK: - Toast Model
struct ToastItem: Identifiable {
    let id = UUID()
    let type: ToastType
    let title: String
    let description: String?
    let action: ToastAction?

    struct ToastAction {
        let label: String
        let action: () -> Void
    }
}

// MARK: - Toast Manager
@Observable
class ToastManager {
    static let shared = ToastManager()

    var toasts: [ToastItem] = []

    func toast(_ title: String, description: String? = nil) {
        show(.init(type: .default, title: title, description: description, action: nil))
    }

    func success(_ title: String, description: String? = nil) {
        show(.init(type: .success, title: title, description: description, action: nil))
    }

    func error(_ title: String, description: String? = nil) {
        show(.init(type: .error, title: title, description: description, action: nil))
    }

    func info(_ title: String, description: String? = nil) {
        show(.init(type: .info, title: title, description: description, action: nil))
    }

    func warning(_ title: String, description: String? = nil) {
        show(.init(type: .warning, title: title, description: description, action: nil))
    }

    private func show(_ toast: ToastItem) {
        withAnimation(.spring(duration: 0.3)) {
            toasts.append(toast)
        }

        // Auto-dismiss after 4 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 4) { [weak self] in
            self?.dismiss(toast.id)
        }
    }

    func dismiss(_ id: UUID) {
        withAnimation(.spring(duration: 0.3)) {
            toasts.removeAll { $0.id == id }
        }
    }
}

// MARK: - Toast View
struct ToastView: View {
    let toast: ToastItem
    let onDismiss: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: toast.type.icon)
                .foregroundStyle(toast.type.color)

            VStack(alignment: .leading, spacing: 2) {
                Text(toast.title)
                    .font(.subheadline)
                    .fontWeight(.medium)

                if let description = toast.description {
                    Text(description)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            if let action = toast.action {
                Button(action.label, action: action.action)
                    .font(.caption)
                    .fontWeight(.medium)
            }

            Button(action: onDismiss) {
                Image(systemName: "xmark")
                    .font(.caption)
            }
            .foregroundStyle(.secondary)
        }
        .padding()
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(radius: 8)
    }
}

// MARK: - Toaster Container
struct Toaster: View {
    @Bindable var manager = ToastManager.shared

    var body: some View {
        VStack(spacing: 8) {
            ForEach(manager.toasts) { toast in
                ToastView(toast: toast) {
                    manager.dismiss(toast.id)
                }
                .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }
}

// MARK: - Usage
// In App root:
// ZStack { ContentView(); Toaster() }

// Anywhere:
// ToastManager.shared.success("Event created", description: "Sunday at 9:00 AM")
```

### 7.5 Dropdown Menu
```swift
// SwiftUI Menu is the native equivalent
struct DropdownExample: View {
    var body: some View {
        Menu {
            Section {
                Button(action: {}) {
                    Label("Profile", systemImage: "person")
                }
                Button(action: {}) {
                    Label("Billing", systemImage: "creditcard")
                }
                Button(action: {}) {
                    Label("Settings", systemImage: "gear")
                }
            }

            Divider()

            Section {
                Button(action: {}) {
                    Label("Team", systemImage: "person.2")
                }
                Button(action: {}) {
                    Label("Invite users", systemImage: "person.badge.plus")
                }
            }

            Divider()

            Button(role: .destructive, action: {}) {
                Label("Log out", systemImage: "rectangle.portrait.and.arrow.right")
            }
        } label: {
            HStack {
                Text("My Account")
                Image(systemName: "chevron.down")
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color(.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }
}
```

### 7.6 Command Palette (⌘K)
```swift
// MARK: - Command Item
struct CommandItem: Identifiable {
    let id = UUID()
    let icon: String
    let title: String
    let shortcut: String?
    let action: () -> Void
}

// MARK: - Command Group
struct CommandGroup: Identifiable {
    let id = UUID()
    let title: String
    let items: [CommandItem]
}

// MARK: - Command Palette View
struct CommandPalette: View {
    @Binding var isPresented: Bool
    @State private var searchText = ""
    @FocusState private var isSearchFocused: Bool

    let groups: [CommandGroup]

    private var filteredGroups: [CommandGroup] {
        guard !searchText.isEmpty else { return groups }
        return groups.compactMap { group in
            let filtered = group.items.filter {
                $0.title.localizedCaseInsensitiveContains(searchText)
            }
            return filtered.isEmpty ? nil : CommandGroup(title: group.title, items: filtered)
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Search Input
            HStack(spacing: 12) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(.secondary)

                TextField("Type a command or search...", text: $searchText)
                    .textFieldStyle(.plain)
                    .focused($isSearchFocused)
            }
            .padding()
            .background(Color(.secondarySystemBackground))

            Divider()

            // Results List
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 4) {
                    if filteredGroups.isEmpty {
                        Text("No results found.")
                            .foregroundStyle(.secondary)
                            .padding()
                    } else {
                        ForEach(filteredGroups) { group in
                            Section {
                                ForEach(group.items) { item in
                                    CommandItemRow(item: item) {
                                        item.action()
                                        isPresented = false
                                    }
                                }
                            } header: {
                                Text(group.title)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                    .padding(.horizontal)
                                    .padding(.top, 8)
                            }
                        }
                    }
                }
                .padding(.vertical, 8)
            }
            .frame(maxHeight: 300)
        }
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(radius: 20)
        .frame(width: 500)
        .onAppear { isSearchFocused = true }
    }
}

struct CommandItemRow: View {
    let item: CommandItem
    let action: () -> Void

    @State private var isHovered = false

    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: item.icon)
                    .frame(width: 20)

                Text(item.title)

                Spacer()

                if let shortcut = item.shortcut {
                    Text(shortcut)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color(.tertiarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
            .background(isHovered ? Color(.secondarySystemBackground) : .clear)
            .clipShape(RoundedRectangle(cornerRadius: 6))
        }
        .buttonStyle(.plain)
        .onHover { isHovered = $0 }
    }
}

// MARK: - Command Palette Modifier
struct CommandPaletteModifier: ViewModifier {
    @Binding var isPresented: Bool
    let groups: [CommandGroup]

    func body(content: Content) -> some View {
        content
            .overlay {
                if isPresented {
                    ZStack {
                        Color.black.opacity(0.3)
                            .ignoresSafeArea()
                            .onTapGesture { isPresented = false }

                        CommandPalette(isPresented: $isPresented, groups: groups)
                    }
                }
            }
            .keyboardShortcut("k", modifiers: .command)
    }
}

extension View {
    func commandPalette(isPresented: Binding<Bool>, groups: [CommandGroup]) -> some View {
        modifier(CommandPaletteModifier(isPresented: isPresented, groups: groups))
    }
}
```

### 7.7 Data Table Pattern
```swift
// MARK: - Column Definition (like TanStack)
struct TableColumn<Item, Content: View>: Identifiable {
    let id: String
    let header: String
    let sortable: Bool
    let content: (Item) -> Content

    init(
        _ id: String,
        header: String,
        sortable: Bool = false,
        @ViewBuilder content: @escaping (Item) -> Content
    ) {
        self.id = id
        self.header = header
        self.sortable = sortable
        self.content = content
    }
}

// MARK: - Sort State
enum SortDirection {
    case ascending, descending

    mutating func toggle() {
        self = self == .ascending ? .descending : .ascending
    }
}

struct SortState: Equatable {
    var column: String?
    var direction: SortDirection = .ascending
}

// MARK: - Data Table View
struct DataTable<Item: Identifiable>: View {
    let items: [Item]
    let columns: [TableColumn<Item, AnyView>]

    @State private var sortState = SortState()
    @State private var selectedItems: Set<Item.ID> = []
    @State private var currentPage = 0
    let pageSize = 10

    private var paginatedItems: [Item] {
        let start = currentPage * pageSize
        let end = min(start + pageSize, items.count)
        return Array(items[start..<end])
    }

    private var totalPages: Int {
        (items.count + pageSize - 1) / pageSize
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack(spacing: 0) {
                // Selection checkbox
                Toggle("", isOn: .constant(false))
                    .toggleStyle(.checkbox)
                    .frame(width: 40)

                ForEach(columns) { column in
                    headerCell(column)
                }
            }
            .padding(.vertical, 12)
            .background(Color(.secondarySystemBackground))

            Divider()

            // Rows
            ForEach(paginatedItems) { item in
                HStack(spacing: 0) {
                    Toggle("", isOn: Binding(
                        get: { selectedItems.contains(item.id) },
                        set: { isSelected in
                            if isSelected {
                                selectedItems.insert(item.id)
                            } else {
                                selectedItems.remove(item.id)
                            }
                        }
                    ))
                    .toggleStyle(.checkbox)
                    .frame(width: 40)

                    ForEach(columns) { column in
                        column.content(item)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 12)
                    }
                }
                .padding(.vertical, 12)

                Divider()
            }

            // Pagination
            HStack {
                Text("\(selectedItems.count) of \(items.count) row(s) selected.")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Spacer()

                HStack(spacing: 8) {
                    Button("Previous") {
                        currentPage = max(0, currentPage - 1)
                    }
                    .disabled(currentPage == 0)
                    .insightButtonStyle(variant: .outline, size: .sm)

                    Text("Page \(currentPage + 1) of \(totalPages)")
                        .font(.caption)

                    Button("Next") {
                        currentPage = min(totalPages - 1, currentPage + 1)
                    }
                    .disabled(currentPage >= totalPages - 1)
                    .insightButtonStyle(variant: .outline, size: .sm)
                }
            }
            .padding()
        }
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    @ViewBuilder
    private func headerCell(_ column: TableColumn<Item, AnyView>) -> some View {
        Button {
            if sortState.column == column.id {
                sortState.direction.toggle()
            } else {
                sortState.column = column.id
                sortState.direction = .ascending
            }
        } label: {
            HStack {
                Text(column.header)
                    .fontWeight(.medium)

                if column.sortable {
                    Image(systemName: sortIcon(for: column.id))
                        .font(.caption)
                }
            }
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 12)
        .disabled(!column.sortable)
    }

    private func sortIcon(for columnId: String) -> String {
        guard sortState.column == columnId else {
            return "chevron.up.chevron.down"
        }
        return sortState.direction == .ascending ? "chevron.up" : "chevron.down"
    }
}
```

---

## 8. Design Tokens: Tailwind → SwiftUI

### shadcn/ui CSS Variables
```css
--background: 0 0% 100%;
--foreground: 222.2 84% 4.9%;
--card: 0 0% 100%;
--card-foreground: 222.2 84% 4.9%;
--primary: 222.2 47.4% 11.2%;
--primary-foreground: 210 40% 98%;
--secondary: 210 40% 96.1%;
--muted: 210 40% 96.1%;
--muted-foreground: 215.4 16.3% 46.9%;
--destructive: 0 84.2% 60.2%;
--border: 214.3 31.8% 91.4%;
--ring: 222.2 84% 4.9%;
--radius: 0.5rem;
```

### SwiftUI Semantic Colors
```swift
// MARK: - Design Tokens
enum InsightTokens {
    // Colors (leverage system semantic colors)
    static let background = Color(.systemBackground)
    static let foreground = Color.primary
    static let card = Color(.secondarySystemBackground)
    static let cardForeground = Color.primary
    static let primaryColor = Color.accentColor
    static let primaryForeground = Color.white
    static let secondary = Color(.secondarySystemBackground)
    static let secondaryForeground = Color.primary
    static let muted = Color(.tertiarySystemBackground)
    static let mutedForeground = Color.secondary
    static let destructive = Color.red
    static let destructiveForeground = Color.white
    static let border = Color(.separator)

    // Spacing
    static let spacingXs: CGFloat = 4
    static let spacingSm: CGFloat = 8
    static let spacingMd: CGFloat = 16
    static let spacingLg: CGFloat = 24
    static let spacingXl: CGFloat = 32

    // Border Radius
    static let radiusSm: CGFloat = 4
    static let radiusMd: CGFloat = 8
    static let radiusLg: CGFloat = 12
    static let radiusFull: CGFloat = 9999

    // Typography
    static let fontSizeXs: Font = .caption2
    static let fontSizeSm: Font = .caption
    static let fontSizeBase: Font = .body
    static let fontSizeLg: Font = .title3
    static let fontSizeXl: Font = .title2
}

// MARK: - Convenience Modifiers
extension View {
    func cardStyle() -> some View {
        self
            .background(InsightTokens.card)
            .clipShape(RoundedRectangle(cornerRadius: InsightTokens.radiusLg))
            .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }

    func mutedText() -> some View {
        self.foregroundStyle(InsightTokens.mutedForeground)
    }
}
```

---

## 9. Pattern Summary Table

| shadcn/ui Pattern | SwiftUI Equivalent |
|-------------------|-------------------|
| `cva()` variants | Enums + `ButtonStyle`/`ViewModifier` |
| Compound components | Generic Views + `@ViewBuilder` slots |
| `asChild` / Slot | Generic `<Label: View>` parameter |
| Radix primitives | Native `.sheet()`, `Menu`, `Toggle`, etc. |
| `cn()` class merge | Conditional modifiers |
| Tailwind utilities | SwiftUI modifier chains |
| CSS variables | `InsightTokens` enum |
| Context providers | `@Environment` + `@Observable` |
| react-hook-form | `@State` + custom validation |
| cmdk | Custom `CommandPalette` view |
| TanStack Table | Custom `DataTable` with sort/filter state |

---

## 10. Implementation Recommendations

1. **Start with Design Tokens** — Define `InsightTokens` first for consistent spacing, colors, radii
2. **Build ButtonStyle First** — Most components need buttons; nail the variant system
3. **Use Compound Components** — Mirror shadcn's export structure for familiarity
4. **Leverage Native Primitives** — Don't rebuild what SwiftUI provides (Menu, Toggle, etc.)
5. **Keep Components Stateless** — Let parent views manage state via `@Binding`
6. **Document Variants** — Use Swift DocC or inline comments for variant options
7. **Test on All Platforms** — iOS, macOS, visionOS have different defaults

---

## 11. Component Architecture Deep Dive

### 11.1 Two-Layered Architecture

shadcn/ui components follow a strict two-layer separation:

**Layer 1: Structure & Behavior (Headless)**
- Structural composition via Radix UI primitives
- Core behaviors (open/close, focus, selection)
- Keyboard navigation (arrow keys, Escape, Enter, typeahead)
- WAI-ARIA compliance (roles, aria attributes)

**Layer 2: Styling (CVA)**
- Variant definitions via class-variance-authority
- Design tokens via CSS variables
- Composable class merging via `cn()`

```tsx
// Layer 1: Radix primitive provides behavior
import * as DialogPrimitive from "@radix-ui/react-dialog"

// Layer 2: CVA/Tailwind provides styling
const DialogContent = React.forwardRef<...>(({ className, ...props }, ref) => (
  <DialogPrimitive.Content
    ref={ref}
    className={cn(
      "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg...",
      className
    )}
    {...props}
  />
))
```

### SwiftUI Adaptation: Protocol + Style Separation
```swift
// Layer 1: Protocol defines behavior contract
protocol DialogBehavior {
    var isPresented: Binding<Bool> { get }
    func dismiss()
}

// Layer 2: Style protocol defines appearance
protocol DialogStyle {
    associatedtype Body: View
    func makeBody(content: DialogContent) -> Body
}

// Combine both
struct InsightDialog<Content: View>: View {
    @Binding var isPresented: Bool
    let style: any DialogStyle
    let content: Content

    var body: some View {
        // Behavior: SwiftUI's .sheet handles focus, dismissal, accessibility
        // Style: Applied via the style parameter
    }
}
```

### 11.2 File Structure Convention

**shadcn/ui Registry Pattern:**
```
components/
└── ui/
    ├── button.tsx        # Single file, exports Button + buttonVariants
    ├── card.tsx          # Compound: Card, CardHeader, CardTitle, etc.
    ├── dialog.tsx        # Wraps Radix + styles
    └── form.tsx          # Context-based compound component
```

**SwiftUI Adaptation:**
```
Sources/InsightUI/
├── Components/
│   ├── Button/
│   │   ├── InsightButton.swift       # Main component
│   │   ├── ButtonVariant.swift       # Enum variants
│   │   └── InsightButtonStyle.swift  # ButtonStyle implementation
│   ├── Card/
│   │   ├── Card.swift                # Container
│   │   ├── CardHeader.swift          # Compound parts
│   │   ├── CardContent.swift
│   │   └── CardFooter.swift
│   └── Dialog/
│       ├── DialogContent.swift
│       └── DialogModifier.swift
├── Tokens/
│   ├── InsightTokens.swift           # Design tokens
│   └── InsightColors.swift           # Color definitions
└── Utilities/
    └── ViewExtensions.swift          # Convenience modifiers
```

### 11.3 The `cn()` Utility Pattern

**shadcn/ui Implementation:**
```tsx
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Usage: Merges classes, resolves Tailwind conflicts
cn("px-2 py-1 bg-red", "p-3 bg-blue") // → "p-3 bg-blue"
cn("text-sm", isLarge && "text-lg")    // Conditional classes
```

**Why Two Libraries?**
- `clsx`: Conditional class construction (handles arrays, objects, falsy values)
- `tailwind-merge`: Conflict resolution (later classes win for same property)

### SwiftUI Adaptation: Conditional Modifiers
```swift
// Pattern 1: Conditional modifier extension
extension View {
    @ViewBuilder
    func `if`<Content: View>(
        _ condition: Bool,
        transform: (Self) -> Content
    ) -> some View {
        if condition {
            transform(self)
        } else {
            self
        }
    }

    @ViewBuilder
    func ifLet<T, Content: View>(
        _ value: T?,
        transform: (Self, T) -> Content
    ) -> some View {
        if let value {
            transform(self, value)
        } else {
            self
        }
    }
}

// Usage (like cn() conditionals)
Text("Hello")
    .if(isLarge) { $0.font(.title) }
    .if(isHighlighted) { $0.foregroundStyle(.accentColor) }

// Pattern 2: Modifier builder for complex cases
struct ConditionalModifier: ViewModifier {
    let isActive: Bool
    let activeModifier: AnyViewModifier
    let inactiveModifier: AnyViewModifier?

    func body(content: Content) -> some View {
        if isActive {
            content.modifier(activeModifier)
        } else if let inactive = inactiveModifier {
            content.modifier(inactive)
        } else {
            content
        }
    }
}
```

### 11.4 Registry Item Schema

shadcn/ui uses a JSON registry for component distribution:

```json
{
  "name": "button",
  "type": "registry:ui",
  "dependencies": ["@radix-ui/react-slot"],
  "devDependencies": [],
  "registryDependencies": [],
  "files": [
    {
      "path": "ui/button.tsx",
      "type": "registry:ui"
    }
  ],
  "tailwind": {
    "config": {}
  },
  "cssVars": {}
}
```

### SwiftUI Adaptation: Swift Package Structure
```swift
// Package.swift
let package = Package(
    name: "InsightUI",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "InsightUI", targets: ["InsightUI"]),
    ],
    dependencies: [],
    targets: [
        .target(
            name: "InsightUI",
            dependencies: [],
            resources: [.process("Resources")]
        ),
    ]
)
```

---

## 12. Theming System Deep Dive

### 12.1 CSS Variables Architecture

**shadcn/ui Theme Structure:**
```css
:root {
  /* Semantic color tokens */
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... dark variants */
}
```

**Key Insight:** Colors use HSL format without `hsl()` wrapper, allowing opacity modifiers like `bg-primary/50`.

### 12.2 Dark Mode Implementation

**shadcn/ui + next-themes:**
```tsx
// 1. ThemeProvider wraps app
<ThemeProvider
  attribute="class"           // Applies "dark" class to <html>
  defaultTheme="system"       // Respects OS preference
  enableSystem                // Enables system detection
  disableTransitionOnChange   // Prevents flash
>
  {children}
</ThemeProvider>

// 2. Toggle component
function ModeToggle() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### SwiftUI Adaptation: Environment-Based Theming
```swift
// MARK: - Theme Definition
enum AppTheme: String, CaseIterable {
    case light
    case dark
    case system

    var colorScheme: ColorScheme? {
        switch self {
        case .light: return .light
        case .dark: return .dark
        case .system: return nil
        }
    }
}

// MARK: - Theme Manager
@Observable
class ThemeManager {
    static let shared = ThemeManager()

    var currentTheme: AppTheme {
        didSet {
            UserDefaults.standard.set(currentTheme.rawValue, forKey: "appTheme")
        }
    }

    init() {
        let saved = UserDefaults.standard.string(forKey: "appTheme") ?? "system"
        self.currentTheme = AppTheme(rawValue: saved) ?? .system
    }
}

// MARK: - Theme Environment Key
struct ThemeEnvironmentKey: EnvironmentKey {
    static let defaultValue = ThemeManager.shared
}

extension EnvironmentValues {
    var themeManager: ThemeManager {
        get { self[ThemeEnvironmentKey.self] }
        set { self[ThemeEnvironmentKey.self] = newValue }
    }
}

// MARK: - Theme Modifier
struct ThemeModifier: ViewModifier {
    @Bindable var manager = ThemeManager.shared

    func body(content: Content) -> some View {
        content
            .preferredColorScheme(manager.currentTheme.colorScheme)
    }
}

extension View {
    func withThemeSupport() -> some View {
        modifier(ThemeModifier())
    }
}

// MARK: - Theme Toggle View
struct ThemeToggle: View {
    @Environment(\.themeManager) var themeManager

    var body: some View {
        Menu {
            ForEach(AppTheme.allCases, id: \.self) { theme in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        themeManager.currentTheme = theme
                    }
                } label: {
                    HStack {
                        Text(theme.rawValue.capitalized)
                        if themeManager.currentTheme == theme {
                            Image(systemName: "checkmark")
                        }
                    }
                }
            }
        } label: {
            Image(systemName: themeIcon)
                .symbolEffect(.bounce, value: themeManager.currentTheme)
        }
    }

    private var themeIcon: String {
        switch themeManager.currentTheme {
        case .light: return "sun.max"
        case .dark: return "moon"
        case .system: return "circle.lefthalf.filled"
        }
    }
}

// MARK: - App Entry Point
@main
struct InsightApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .withThemeSupport()
        }
    }
}
```

### 12.3 Dynamic Color Tokens

**SwiftUI Theme Token System:**
```swift
// MARK: - Color Token Protocol
protocol ColorTokens {
    var background: Color { get }
    var foreground: Color { get }
    var card: Color { get }
    var cardForeground: Color { get }
    var primary: Color { get }
    var primaryForeground: Color { get }
    var secondary: Color { get }
    var secondaryForeground: Color { get }
    var muted: Color { get }
    var mutedForeground: Color { get }
    var accent: Color { get }
    var accentForeground: Color { get }
    var destructive: Color { get }
    var destructiveForeground: Color { get }
    var border: Color { get }
    var input: Color { get }
    var ring: Color { get }
}

// MARK: - Light Theme
struct LightColorTokens: ColorTokens {
    let background = Color(hue: 0, saturation: 0, brightness: 1)
    let foreground = Color(hue: 222.2/360, saturation: 0.84, brightness: 0.049)
    let card = Color(hue: 0, saturation: 0, brightness: 1)
    let cardForeground = Color(hue: 222.2/360, saturation: 0.84, brightness: 0.049)
    let primary = Color(hue: 222.2/360, saturation: 0.474, brightness: 0.112)
    let primaryForeground = Color(hue: 210/360, saturation: 0.4, brightness: 0.98)
    let secondary = Color(hue: 210/360, saturation: 0.4, brightness: 0.961)
    let secondaryForeground = Color(hue: 222.2/360, saturation: 0.474, brightness: 0.112)
    let muted = Color(hue: 210/360, saturation: 0.4, brightness: 0.961)
    let mutedForeground = Color(hue: 215.4/360, saturation: 0.163, brightness: 0.469)
    let accent = Color(hue: 210/360, saturation: 0.4, brightness: 0.961)
    let accentForeground = Color(hue: 222.2/360, saturation: 0.474, brightness: 0.112)
    let destructive = Color(hue: 0, saturation: 0.842, brightness: 0.602)
    let destructiveForeground = Color(hue: 210/360, saturation: 0.4, brightness: 0.98)
    let border = Color(hue: 214.3/360, saturation: 0.318, brightness: 0.914)
    let input = Color(hue: 214.3/360, saturation: 0.318, brightness: 0.914)
    let ring = Color(hue: 222.2/360, saturation: 0.84, brightness: 0.049)
}

// MARK: - Dark Theme
struct DarkColorTokens: ColorTokens {
    let background = Color(hue: 222.2/360, saturation: 0.84, brightness: 0.049)
    let foreground = Color(hue: 210/360, saturation: 0.4, brightness: 0.98)
    // ... dark variants
}

// MARK: - Environment-Based Token Access
struct ColorTokensKey: EnvironmentKey {
    static let defaultValue: any ColorTokens = LightColorTokens()
}

extension EnvironmentValues {
    var colors: any ColorTokens {
        get { self[ColorTokensKey.self] }
        set { self[ColorTokensKey.self] = newValue }
    }
}

// MARK: - Usage in Views
struct ThemedCard: View {
    @Environment(\.colors) var colors

    var body: some View {
        VStack {
            Text("Title")
                .foregroundStyle(colors.cardForeground)
        }
        .background(colors.card)
    }
}
```

### 12.4 Adaptive Semantic Colors (Recommended)

For most SwiftUI apps, leverage system semantic colors that automatically adapt:

```swift
// MARK: - Recommended: System Semantic Colors
enum InsightSemanticColors {
    // These automatically adapt to light/dark mode
    static let background = Color(.systemBackground)
    static let secondaryBackground = Color(.secondarySystemBackground)
    static let tertiaryBackground = Color(.tertiarySystemBackground)

    static let label = Color(.label)
    static let secondaryLabel = Color(.secondaryLabel)
    static let tertiaryLabel = Color(.tertiaryLabel)

    static let separator = Color(.separator)
    static let opaqueSeparator = Color(.opaqueSeparator)

    static let systemFill = Color(.systemFill)
    static let secondarySystemFill = Color(.secondarySystemFill)

    // Brand colors (define in Asset Catalog with light/dark variants)
    static let brand = Color("BrandPrimary")
    static let brandSecondary = Color("BrandSecondary")
}
```

---

## 13. Accessibility Patterns

### 13.1 Radix UI Accessibility Features

Radix primitives include:
- **ARIA roles and attributes** automatically applied
- **Focus management** (focus trapping in modals, return focus on close)
- **Keyboard navigation** (arrow keys, Enter, Escape, Tab, typeahead)
- **Screen reader announcements** for state changes

### SwiftUI Built-in Accessibility

SwiftUI provides many features automatically:
```swift
// MARK: - Automatic Features
Button("Save") { }  // Automatically announces as button
Toggle("Dark Mode", isOn: $isDark)  // Announces state
Slider(value: $volume)  // VoiceOver gestures work

// MARK: - Manual Enhancements
struct AccessibleCard: View {
    let title: String
    let description: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading) {
                Text(title).font(.headline)
                Text(description).font(.caption)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(title). \(description)")
        .accessibilityHint("Double tap to open")
        .accessibilityAddTraits(.isButton)
    }
}

// MARK: - Focus Management
struct FocusedDialog: View {
    @Binding var isPresented: Bool
    @FocusState private var isTitleFocused: Bool

    var body: some View {
        VStack {
            TextField("Title", text: .constant(""))
                .focused($isTitleFocused)
        }
        .onAppear {
            isTitleFocused = true  // Auto-focus like Radix
        }
    }
}

// MARK: - Keyboard Navigation (macOS)
struct KeyboardNavigableList: View {
    @State private var selection: String?
    let items = ["Apple", "Banana", "Cherry"]

    var body: some View {
        List(items, id: \.self, selection: $selection) { item in
            Text(item)
        }
        .focusable()  // Enable keyboard focus
        .onMoveCommand { direction in
            // Handle arrow key navigation
        }
    }
}

// MARK: - Escape to Dismiss
struct DismissibleSheet<Content: View>: View {
    @Binding var isPresented: Bool
    let content: Content

    var body: some View {
        content
            .onExitCommand {  // Escape key (macOS)
                isPresented = false
            }
            .gesture(
                DragGesture()
                    .onEnded { value in
                        if value.translation.height > 100 {
                            isPresented = false  // Swipe down to dismiss
                        }
                    }
            )
    }
}
```

### 13.2 Accessibility Modifier Library

```swift
// MARK: - Reusable Accessibility Modifiers
extension View {
    func accessibleButton(
        label: String,
        hint: String? = nil
    ) -> some View {
        self
            .accessibilityLabel(label)
            .accessibilityHint(hint ?? "")
            .accessibilityAddTraits(.isButton)
    }

    func accessibleHeading(_ level: AccessibilityHeadingLevel = .h1) -> some View {
        self.accessibilityAddTraits(.isHeader)
    }

    func accessibleLiveRegion() -> some View {
        self.accessibilityAddTraits(.updatesFrequently)
    }

    func accessibleGroup(label: String) -> some View {
        self
            .accessibilityElement(children: .contain)
            .accessibilityLabel(label)
    }
}

// MARK: - Announce Changes (like aria-live)
struct AnnouncementManager {
    static func announce(_ message: String) {
        UIAccessibility.post(
            notification: .announcement,
            argument: message
        )
    }

    static func announceScreenChange() {
        UIAccessibility.post(
            notification: .screenChanged,
            argument: nil
        )
    }
}

// Usage: After saving
AnnouncementManager.announce("Entry saved successfully")
```

---

## 14. State Management Patterns

### 14.1 shadcn/ui: Controlled vs Uncontrolled

```tsx
// Uncontrolled (internal state)
<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>...</DialogContent>
</Dialog>

// Controlled (external state)
const [open, setOpen] = useState(false)
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>...</DialogContent>
</Dialog>
```

### SwiftUI Adaptation: @Binding Pattern
```swift
// MARK: - Controlled Pattern (Recommended)
struct ControlledDialog<Content: View>: View {
    @Binding var isPresented: Bool
    let content: Content

    var body: some View {
        EmptyView()
            .sheet(isPresented: $isPresented) {
                content
            }
    }
}

// Usage
@State private var showDialog = false

ControlledDialog(isPresented: $showDialog) {
    Text("Content")
}

// MARK: - Self-Managed Pattern
struct SelfManagedDialog<Trigger: View, Content: View>: View {
    @State private var isPresented = false
    let trigger: Trigger
    let content: Content

    init(
        @ViewBuilder trigger: () -> Trigger,
        @ViewBuilder content: () -> Content
    ) {
        self.trigger = trigger()
        self.content = content()
    }

    var body: some View {
        trigger
            .onTapGesture { isPresented = true }
            .sheet(isPresented: $isPresented) {
                content
            }
    }
}

// Usage (like uncontrolled)
SelfManagedDialog {
    Text("Open Dialog")
} content: {
    Text("Dialog Content")
}
```

### 14.2 Form State Management

```swift
// MARK: - Form State (like react-hook-form)
@Observable
class FormState<T> {
    var values: T
    var errors: [String: String] = [:]
    var touched: Set<String> = []
    var isSubmitting = false
    var isValid: Bool { errors.isEmpty }

    init(defaultValues: T) {
        self.values = defaultValues
    }

    func setError(_ field: String, message: String) {
        errors[field] = message
    }

    func clearError(_ field: String) {
        errors.removeValue(forKey: field)
    }

    func touch(_ field: String) {
        touched.insert(field)
    }

    func reset(to values: T) {
        self.values = values
        errors.removeAll()
        touched.removeAll()
    }
}

// MARK: - Usage
struct LoginFormData {
    var email = ""
    var password = ""
}

struct LoginForm: View {
    @State private var form = FormState(defaultValues: LoginFormData())

    var body: some View {
        Form {
            FormField(
                "Email",
                error: form.errors["email"]
            ) {
                TextField("email@example.com", text: $form.values.email)
                    .onChange(of: form.values.email) { _, newValue in
                        validateEmail(newValue)
                    }
            }

            FormField(
                "Password",
                error: form.errors["password"]
            ) {
                SecureField("Password", text: $form.values.password)
            }

            Button("Sign In") {
                submit()
            }
            .disabled(!form.isValid || form.isSubmitting)
        }
    }

    private func validateEmail(_ value: String) {
        if !value.contains("@") {
            form.setError("email", message: "Invalid email address")
        } else {
            form.clearError("email")
        }
    }

    private func submit() {
        form.isSubmitting = true
        // API call...
    }
}
```

---

## Sources

- [shadcn/ui Documentation](https://ui.shadcn.com/docs)
- [shadcn/ui Theming](https://ui.shadcn.com/docs/theming)
- [shadcn/ui Dark Mode](https://ui.shadcn.com/docs/dark-mode)
- [shadcn/ui Registry](https://ui.shadcn.com/docs/registry/getting-started)
- [class-variance-authority](https://cva.style/docs)
- [Radix UI Slot](https://www.radix-ui.com/primitives/docs/utilities/slot)
- [Radix UI Composition](https://www.radix-ui.com/primitives/docs/guides/composition)
- [Radix UI Accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility)
- [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/data-table)
- [Anatomy of shadcn/ui](https://manupa.dev/blog/anatomy-of-shadcn-ui)
- [cn() Utility Explained](https://www.webdong.dev/en/post/tailwind-merge-and-clsx-in-shadcn/)
- [DeepWiki: shadcn/ui Architecture](https://deepwiki.com/shadcn-ui/ui/2-architecture)
