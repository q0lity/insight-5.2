# SwiftUI Libraries & Patterns Research

## Executive Summary

This document covers top SwiftUI libraries and essential patterns for building production-grade iOS applications. The research focuses on architecture (TCA), UI components (PopupView, ChartView), platform access (Introspect), and core SwiftUI patterns.

---

## Part 1: Libraries

### 1. The Composable Architecture (TCA)
**Repository:** [pointfreeco/swift-composable-architecture](https://github.com/pointfreeco/swift-composable-architecture)

A library for building applications with composition, testing, and ergonomics in mind. Works across SwiftUI, UIKit, and all Apple platforms.

#### Core Concepts

| Concept | Purpose |
|---------|---------|
| **State** | Value type describing all data needed for feature logic and UI |
| **Action** | Enum of all possible events (user actions, API responses, etc.) |
| **Reducer** | Pure function transforming state given an action, returns effects |
| **Store** | Runtime that drives the feature, accepts actions, emits state changes |
| **Effect** | Handles async operations and side effects |

#### Basic Feature Structure

```swift
import ComposableArchitecture

@Reducer
struct CounterFeature {
    @ObservableState
    struct State: Equatable {
        var count = 0
        var fact: String?
        var isLoading = false
    }

    enum Action {
        case incrementButtonTapped
        case decrementButtonTapped
        case factButtonTapped
        case factResponse(String)
    }

    @Dependency(\.numberFact) var numberFact

    var body: some ReducerOf<Self> {
        Reduce { state, action in
            switch action {
            case .incrementButtonTapped:
                state.count += 1
                return .none

            case .decrementButtonTapped:
                state.count -= 1
                return .none

            case .factButtonTapped:
                state.isLoading = true
                return .run { [count = state.count] send in
                    let fact = try await self.numberFact(count)
                    await send(.factResponse(fact))
                }

            case let .factResponse(fact):
                state.isLoading = false
                state.fact = fact
                return .none
            }
        }
    }
}
```

#### SwiftUI View Integration

```swift
struct CounterView: View {
    let store: StoreOf<CounterFeature>

    var body: some View {
        VStack(spacing: 16) {
            HStack {
                Button("-") { store.send(.decrementButtonTapped) }
                Text("\(store.count)")
                    .font(.title)
                Button("+") { store.send(.incrementButtonTapped) }
            }

            Button("Get Fact") { store.send(.factButtonTapped) }
                .disabled(store.isLoading)

            if let fact = store.fact {
                Text(fact)
                    .padding()
            }
        }
    }
}
```

#### Dependency Injection

```swift
// Define a dependency
struct NumberFactClient {
    var fetch: @Sendable (Int) async throws -> String
}

extension NumberFactClient: DependencyKey {
    static let liveValue = NumberFactClient { number in
        let (data, _) = try await URLSession.shared.data(
            from: URL(string: "http://numbersapi.com/\(number)")!
        )
        return String(data: data, encoding: .utf8) ?? ""
    }

    static let testValue = NumberFactClient { number in
        "\(number) is a test fact"
    }
}

extension DependencyValues {
    var numberFact: NumberFactClient {
        get { self[NumberFactClient.self] }
        set { self[NumberFactClient.self] = newValue }
    }
}

// Use in reducer
@Dependency(\.numberFact) var numberFact
```

---

### 2. PopupView (exyte)
**Repository:** [exyte/PopupView](https://github.com/exyte/PopupView)

Toasts and popups library with three display modes: overlay, sheet, and window.

#### Basic Usage

```swift
import PopupView

struct ContentView: View {
    @State private var showToast = false
    @State private var showPopup = false

    var body: some View {
        VStack(spacing: 20) {
            Button("Show Toast") { showToast = true }
            Button("Show Popup") { showPopup = true }
        }
        // Toast at top
        .popup(isPresented: $showToast) {
            HStack {
                Image(systemName: "checkmark.circle.fill")
                Text("Action completed!")
            }
            .padding()
            .background(Color.green)
            .foregroundColor(.white)
            .cornerRadius(10)
        } customize: {
            $0
                .type(.floater())
                .position(.top)
                .animation(.spring())
                .autohideIn(2)
        }
        // Center popup
        .popup(isPresented: $showPopup) {
            VStack(spacing: 16) {
                Text("Confirm Action")
                    .font(.headline)
                Text("Are you sure you want to proceed?")
                HStack {
                    Button("Cancel") { showPopup = false }
                    Button("Confirm") { showPopup = false }
                        .buttonStyle(.borderedProminent)
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(16)
            .shadow(radius: 10)
        } customize: {
            $0
                .type(.default)
                .position(.center)
                .closeOnTapOutside(true)
                .backgroundColor(.black.opacity(0.4))
        }
    }
}
```

#### Configuration Options

```swift
.popup(isPresented: $show) { content } customize: { config in
    config
        // Type: .default, .toast, .floater(verticalPadding:), .scroll
        .type(.floater(verticalPadding: 16, horizontalPadding: 16))

        // Position: .topLeading, .top, .topTrailing, .center, .bottom, etc.
        .position(.bottom)

        // Display mode: .overlay, .sheet, .window (default)
        .displayMode(.window)

        // Animation direction
        .appearFrom(.bottomSlide)
        .disappearTo(.bottomSlide)

        // Behavior
        .closeOnTap(true)
        .closeOnTapOutside(true)
        .dragToDismiss(true)
        .autohideIn(3)

        // Callbacks
        .dismissCallback { print("Dismissed") }
}
```

---

### 3. SwiftUI-Introspect
**Repository:** [siteline/SwiftUI-Introspect](https://github.com/siteline/SwiftUI-Introspect)

Access underlying UIKit/AppKit views for customization not exposed by SwiftUI.

#### Basic Usage

```swift
import SwiftUIIntrospect

struct CustomScrollView: View {
    var body: some View {
        ScrollView {
            ForEach(0..<50) { i in
                Text("Row \(i)")
                    .frame(maxWidth: .infinity)
                    .padding()
            }
        }
        .introspect(.scrollView, on: .iOS(.v15, .v16, .v17, .v18)) { scrollView in
            // Disable bounce
            scrollView.bounces = false

            // Custom scroll indicators
            scrollView.showsVerticalScrollIndicator = false

            // Paging behavior
            scrollView.isPagingEnabled = true
        }
    }
}
```

#### Common Introspection Patterns

```swift
// TextField customization
TextField("Email", text: $email)
    .introspect(.textField, on: .iOS(.v15, .v16, .v17, .v18)) { textField in
        textField.clearButtonMode = .whileEditing
        textField.autocorrectionType = .no
        textField.keyboardType = .emailAddress
    }

// List customization
List { /* content */ }
    .introspect(.list, on: .iOS(.v16, .v17, .v18)) { tableView in
        tableView.separatorStyle = .none
        tableView.allowsSelection = false
    }

// NavigationStack customization
NavigationStack { /* content */ }
    .introspect(.navigationStack, on: .iOS(.v16, .v17, .v18)) { navController in
        navController.navigationBar.prefersLargeTitles = true
        let appearance = UINavigationBarAppearance()
        appearance.configureWithTransparentBackground()
        navController.navigationBar.standardAppearance = appearance
    }

// Ancestor scope (introspect parent views)
Text("Content")
    .introspect(.scrollView, on: .iOS(.v15, .v16, .v17, .v18), scope: .ancestor) { scrollView in
        scrollView.scrollsToTop = false
    }
```

---

### 4. SSToastMessage
**Repository:** [SimformSolutionsPvtLtd/SSToastMessage](https://github.com/SimformSolutionsPvtLtd/SSToastMessage)

Lightweight toast message system using ViewModifier pattern.

```swift
import SSToastMessage

struct ContentView: View {
    @State private var showToast = false

    var body: some View {
        ZStack {
            Button("Show Toast") {
                showToast = true
            }
        }
        .present(
            isPresented: $showToast,
            type: .toast,
            position: .top,
            duration: 2,
            closeOnTap: true
        ) {
            HStack {
                Image(systemName: "bell.fill")
                Text("New notification received")
            }
            .padding()
            .background(Color.blue)
            .foregroundColor(.white)
            .cornerRadius(8)
        }
    }
}
```

---

### 5. ChartView (SwiftUICharts)
**Repository:** [AppPear/ChartView](https://github.com/AppPear/ChartView)

Declarative charting library for SwiftUI.

```swift
import SwiftUICharts

struct DashboardView: View {
    let weeklyData: [Double] = [8, 23, 54, 32, 12, 37, 43]
    let salesData = [
        ("Q1", 63150.0),
        ("Q2", 50900.0),
        ("Q3", 77200.0),
        ("Q4", 89100.0)
    ]

    var body: some View {
        VStack(spacing: 24) {
            // Line Chart
            LineChartView(
                data: weeklyData,
                title: "Weekly Activity",
                legend: "Hours",
                style: Styles.lineChartStyleOne,
                form: ChartForm.medium
            )

            // Bar Chart with labeled data
            BarChartView(
                data: ChartData(values: salesData),
                title: "Quarterly Sales",
                legend: "Revenue",
                style: Styles.barChartMidnightGreenDark,
                form: ChartForm.large,
                dropShadow: true,
                valueSpecifier: "$%.0f"
            )

            // Pie Chart
            PieChartView(
                data: [8, 23, 54, 32],
                title: "Distribution",
                legend: "Categories"
            )
        }
        .padding()
    }
}

// Multi-line chart
struct ComparisonChart: View {
    let series1: [Double] = [8, 23, 54, 32, 12]
    let series2: [Double] = [15, 30, 45, 25, 35]

    var body: some View {
        MultiLineChartView(
            data: [
                (series1, GradientColors.green),
                (series2, GradientColors.purple)
            ],
            title: "Comparison",
            legend: "Metrics"
        )
    }
}
```

---

### 6. Animation Library
**Repository:** [amosgyamfi/swiftui-animation-library](https://github.com/amosgyamfi/swiftui-animation-library)

Collection of animation patterns and examples.

#### Key Techniques

```swift
// PhaseAnimator for multi-state animations
struct PulsingDots: View {
    var body: some View {
        PhaseAnimator([false, true]) { phase in
            HStack(spacing: phase ? 20 : 5) {
                ForEach(0..<3) { i in
                    Circle()
                        .fill(.blue)
                        .frame(width: phase ? 15 : 10)
                        .opacity(phase ? 1 : 0.5)
                }
            }
        } animation: { _ in
            .easeInOut(duration: 0.8)
        }
    }
}

// Spring animation with gesture
struct BouncyButton: View {
    @State private var isPressed = false

    var body: some View {
        Text("Tap Me")
            .padding()
            .background(Color.blue)
            .foregroundColor(.white)
            .cornerRadius(10)
            .scaleEffect(isPressed ? 0.9 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.5), value: isPressed)
            .onTapGesture {
                isPressed = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    isPressed = false
                }
            }
    }
}

// ContentTransition for symbol morphing
struct AnimatedIcon: View {
    @State private var isPlaying = false

    var body: some View {
        Image(systemName: isPlaying ? "pause.fill" : "play.fill")
            .font(.largeTitle)
            .contentTransition(.symbolEffect(.replace))
            .onTapGesture {
                withAnimation {
                    isPlaying.toggle()
                }
            }
    }
}
```

---

## Part 2: SwiftUI Patterns

### Pattern 1: Environment-Based Theming

Create a flexible theming system using SwiftUI's environment.

#### Theme Definition

```swift
// MARK: - Theme Protocol
protocol AppTheme {
    var primaryColor: Color { get }
    var secondaryColor: Color { get }
    var backgroundColor: Color { get }
    var surfaceColor: Color { get }
    var textPrimary: Color { get }
    var textSecondary: Color { get }
    var accentColor: Color { get }
    var errorColor: Color { get }
    var successColor: Color { get }

    var cornerRadius: CGFloat { get }
    var spacing: CGFloat { get }
    var shadowRadius: CGFloat { get }
}

// MARK: - Concrete Themes
struct LightTheme: AppTheme {
    let primaryColor = Color(hex: "#2563EB")
    let secondaryColor = Color(hex: "#7C3AED")
    let backgroundColor = Color(hex: "#F8FAFC")
    let surfaceColor = Color.white
    let textPrimary = Color(hex: "#1E293B")
    let textSecondary = Color(hex: "#64748B")
    let accentColor = Color(hex: "#F59E0B")
    let errorColor = Color(hex: "#EF4444")
    let successColor = Color(hex: "#22C55E")

    let cornerRadius: CGFloat = 12
    let spacing: CGFloat = 16
    let shadowRadius: CGFloat = 8
}

struct DarkTheme: AppTheme {
    let primaryColor = Color(hex: "#3B82F6")
    let secondaryColor = Color(hex: "#8B5CF6")
    let backgroundColor = Color(hex: "#0F172A")
    let surfaceColor = Color(hex: "#1E293B")
    let textPrimary = Color(hex: "#F1F5F9")
    let textSecondary = Color(hex: "#94A3B8")
    let accentColor = Color(hex: "#FBBF24")
    let errorColor = Color(hex: "#F87171")
    let successColor = Color(hex: "#4ADE80")

    let cornerRadius: CGFloat = 12
    let spacing: CGFloat = 16
    let shadowRadius: CGFloat = 0
}

struct NeonTheme: AppTheme {
    let primaryColor = Color(hex: "#00F5FF")
    let secondaryColor = Color(hex: "#FF00FF")
    let backgroundColor = Color.black
    let surfaceColor = Color(hex: "#1A1A2E")
    let textPrimary = Color.white
    let textSecondary = Color(hex: "#888888")
    let accentColor = Color(hex: "#39FF14")
    let errorColor = Color(hex: "#FF3131")
    let successColor = Color(hex: "#39FF14")

    let cornerRadius: CGFloat = 8
    let spacing: CGFloat = 20
    let shadowRadius: CGFloat = 12
}
```

#### Environment Key & Manager

```swift
// MARK: - Theme Environment Key
struct ThemeKey: EnvironmentKey {
    static let defaultValue: AppTheme = LightTheme()
}

extension EnvironmentValues {
    var theme: AppTheme {
        get { self[ThemeKey.self] }
        set { self[ThemeKey.self] = newValue }
    }
}

// MARK: - Theme Manager
@Observable
class ThemeManager {
    enum ThemeType: String, CaseIterable {
        case light, dark, neon, system

        var displayName: String {
            rawValue.capitalized
        }
    }

    var selectedTheme: ThemeType {
        didSet {
            UserDefaults.standard.set(selectedTheme.rawValue, forKey: "selectedTheme")
        }
    }

    private var systemColorScheme: ColorScheme = .light

    var currentTheme: AppTheme {
        switch selectedTheme {
        case .light: return LightTheme()
        case .dark: return DarkTheme()
        case .neon: return NeonTheme()
        case .system:
            return systemColorScheme == .dark ? DarkTheme() : LightTheme()
        }
    }

    init() {
        let saved = UserDefaults.standard.string(forKey: "selectedTheme") ?? "system"
        self.selectedTheme = ThemeType(rawValue: saved) ?? .system
    }

    func updateSystemScheme(_ scheme: ColorScheme) {
        systemColorScheme = scheme
    }
}

// MARK: - Color Scheme Tracker
struct ColorSchemeTracker: View {
    @Environment(\.colorScheme) var colorScheme
    let manager: ThemeManager

    var body: some View {
        Color.clear
            .onChange(of: colorScheme, initial: true) { _, newValue in
                manager.updateSystemScheme(newValue)
            }
    }
}
```

#### Usage in Views

```swift
struct ThemedApp: App {
    @State private var themeManager = ThemeManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(\.theme, themeManager.currentTheme)
                .environment(themeManager)
                .background(ColorSchemeTracker(manager: themeManager))
        }
    }
}

struct ThemedCard: View {
    @Environment(\.theme) var theme
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: theme.spacing / 2) {
            Text(title)
                .font(.headline)
                .foregroundStyle(theme.textPrimary)
            Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(theme.textSecondary)
        }
        .padding(theme.spacing)
        .background(theme.surfaceColor)
        .cornerRadius(theme.cornerRadius)
        .shadow(radius: theme.shadowRadius)
    }
}

struct ThemePicker: View {
    @Environment(ThemeManager.self) var manager

    var body: some View {
        Picker("Theme", selection: Bindable(manager).selectedTheme) {
            ForEach(ThemeManager.ThemeType.allCases, id: \.self) { theme in
                Text(theme.displayName).tag(theme)
            }
        }
        .pickerStyle(.segmented)
    }
}
```

---

### Pattern 2: ViewModifier Composition

Build reusable, composable styling with ViewModifiers.

#### Basic ViewModifier

```swift
// MARK: - Card Modifier
struct CardModifier: ViewModifier {
    let cornerRadius: CGFloat
    let shadowRadius: CGFloat
    let padding: CGFloat

    init(cornerRadius: CGFloat = 12, shadowRadius: CGFloat = 4, padding: CGFloat = 16) {
        self.cornerRadius = cornerRadius
        self.shadowRadius = shadowRadius
        self.padding = padding
    }

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(Color(.systemBackground))
            .cornerRadius(cornerRadius)
            .shadow(color: .black.opacity(0.1), radius: shadowRadius, x: 0, y: 2)
    }
}

extension View {
    func card(cornerRadius: CGFloat = 12, shadowRadius: CGFloat = 4, padding: CGFloat = 16) -> some View {
        modifier(CardModifier(cornerRadius: cornerRadius, shadowRadius: shadowRadius, padding: padding))
    }
}
```

#### Conditional Modifier

```swift
extension View {
    @ViewBuilder
    func `if`<Transform: View>(_ condition: Bool, transform: (Self) -> Transform) -> some View {
        if condition {
            transform(self)
        } else {
            self
        }
    }

    @ViewBuilder
    func ifLet<Value, Transform: View>(_ value: Value?, transform: (Self, Value) -> Transform) -> some View {
        if let value = value {
            transform(self, value)
        } else {
            self
        }
    }
}

// Usage
Text("Hello")
    .if(isHighlighted) { view in
        view.foregroundColor(.yellow)
    }

Text("Title")
    .ifLet(subtitle) { view, sub in
        VStack {
            view
            Text(sub).font(.caption)
        }
    }
```

#### Loading State Modifier

```swift
struct LoadingModifier: ViewModifier {
    let isLoading: Bool

    func body(content: Content) -> some View {
        ZStack {
            content
                .opacity(isLoading ? 0.5 : 1)
                .disabled(isLoading)

            if isLoading {
                ProgressView()
                    .scaleEffect(1.5)
            }
        }
    }
}

extension View {
    func loading(_ isLoading: Bool) -> some View {
        modifier(LoadingModifier(isLoading: isLoading))
    }
}
```

#### Shimmer Effect Modifier

```swift
struct ShimmerModifier: ViewModifier {
    @State private var phase: CGFloat = 0

    func body(content: Content) -> some View {
        content
            .overlay(
                LinearGradient(
                    colors: [
                        .clear,
                        .white.opacity(0.5),
                        .clear
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
                .rotationEffect(.degrees(30))
                .offset(x: phase)
            )
            .clipped()
            .onAppear {
                withAnimation(.linear(duration: 1.5).repeatForever(autoreverses: false)) {
                    phase = 400
                }
            }
    }
}

extension View {
    func shimmer() -> some View {
        modifier(ShimmerModifier())
    }
}
```

#### Composing Multiple Modifiers

```swift
struct PrimaryButtonStyle: ViewModifier {
    @Environment(\.isEnabled) var isEnabled

    func body(content: Content) -> some View {
        content
            .font(.headline)
            .foregroundColor(.white)
            .padding(.horizontal, 24)
            .padding(.vertical, 12)
            .background(isEnabled ? Color.blue : Color.gray)
            .cornerRadius(10)
            .shadow(color: isEnabled ? .blue.opacity(0.3) : .clear, radius: 4, y: 2)
    }
}

struct SecondaryButtonStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .font(.headline)
            .foregroundColor(.blue)
            .padding(.horizontal, 24)
            .padding(.vertical, 12)
            .background(Color.blue.opacity(0.1))
            .cornerRadius(10)
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(Color.blue, lineWidth: 1)
            )
    }
}

extension View {
    func primaryButtonStyle() -> some View {
        modifier(PrimaryButtonStyle())
    }

    func secondaryButtonStyle() -> some View {
        modifier(SecondaryButtonStyle())
    }
}

// Usage
Button("Submit") { }
    .primaryButtonStyle()

Button("Cancel") { }
    .secondaryButtonStyle()
```

---

### Pattern 3: PreferenceKey for Layout

Pass data from child views up to parent views.

#### Basic Height Preference

```swift
// MARK: - Height Preference Key
struct HeightPreferenceKey: PreferenceKey {
    static var defaultValue: CGFloat = 0

    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = max(value, nextValue())
    }
}

// MARK: - Height Reader Modifier
struct HeightReader: ViewModifier {
    @Binding var height: CGFloat

    func body(content: Content) -> some View {
        content
            .background(
                GeometryReader { geo in
                    Color.clear
                        .preference(key: HeightPreferenceKey.self, value: geo.size.height)
                }
            )
            .onPreferenceChange(HeightPreferenceKey.self) { newHeight in
                height = newHeight
            }
    }
}

extension View {
    func readHeight(_ height: Binding<CGFloat>) -> some View {
        modifier(HeightReader(height: height))
    }
}

// Usage: Match heights across cards
struct EqualHeightCards: View {
    @State private var maxHeight: CGFloat = 0
    let items = ["Short", "Medium length text", "This is a much longer piece of content"]

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            ForEach(items, id: \.self) { item in
                Text(item)
                    .padding()
                    .frame(minHeight: maxHeight)
                    .background(Color.blue.opacity(0.2))
                    .cornerRadius(8)
                    .background(
                        GeometryReader { geo in
                            Color.clear.preference(
                                key: HeightPreferenceKey.self,
                                value: geo.size.height
                            )
                        }
                    )
            }
        }
        .onPreferenceChange(HeightPreferenceKey.self) { height in
            maxHeight = height
        }
    }
}
```

#### Width Collection for Equal Widths

```swift
// MARK: - Width Collection Key
struct WidthPreferenceKey: PreferenceKey {
    static var defaultValue: [CGFloat] = []

    static func reduce(value: inout [CGFloat], nextValue: () -> [CGFloat]) {
        value.append(contentsOf: nextValue())
    }
}

struct EqualWidthVStack<Content: View>: View {
    @State private var maxWidth: CGFloat?
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        VStack {
            content
        }
        .background(
            GeometryReader { geo in
                Color.clear
            }
        )
        .onPreferenceChange(WidthPreferenceKey.self) { widths in
            maxWidth = widths.max()
        }
        .environment(\.equalWidth, maxWidth)
    }
}

// Environment key for equal width
struct EqualWidthKey: EnvironmentKey {
    static let defaultValue: CGFloat? = nil
}

extension EnvironmentValues {
    var equalWidth: CGFloat? {
        get { self[EqualWidthKey.self] }
        set { self[EqualWidthKey.self] = newValue }
    }
}

struct EqualWidthModifier: ViewModifier {
    @Environment(\.equalWidth) var width

    func body(content: Content) -> some View {
        content
            .background(
                GeometryReader { geo in
                    Color.clear
                        .preference(key: WidthPreferenceKey.self, value: [geo.size.width])
                }
            )
            .frame(width: width)
    }
}
```

#### Scroll Offset Tracking

```swift
// MARK: - Scroll Offset Key
struct ScrollOffsetPreferenceKey: PreferenceKey {
    static var defaultValue: CGFloat = 0

    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = nextValue()
    }
}

struct ScrollOffsetModifier: ViewModifier {
    let coordinateSpace: String
    @Binding var offset: CGFloat

    func body(content: Content) -> some View {
        content
            .background(
                GeometryReader { geo in
                    Color.clear
                        .preference(
                            key: ScrollOffsetPreferenceKey.self,
                            value: geo.frame(in: .named(coordinateSpace)).minY
                        )
                }
            )
            .onPreferenceChange(ScrollOffsetPreferenceKey.self) { value in
                offset = value
            }
    }
}

// Usage: Sticky header with parallax
struct ParallaxHeader: View {
    @State private var scrollOffset: CGFloat = 0

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Parallax image
                Image("header")
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(height: max(200 - scrollOffset, 100))
                    .clipped()
                    .opacity(1 - (scrollOffset / 200))

                // Content
                LazyVStack {
                    ForEach(0..<50) { i in
                        Text("Row \(i)")
                            .frame(maxWidth: .infinity)
                            .padding()
                    }
                }
            }
            .modifier(ScrollOffsetModifier(
                coordinateSpace: "scroll",
                offset: $scrollOffset
            ))
        }
        .coordinateSpace(name: "scroll")
    }
}
```

#### Anchor Preferences for Position Tracking

```swift
// MARK: - Anchor Bounds Key
struct BoundsPreferenceKey: PreferenceKey {
    static var defaultValue: [String: Anchor<CGRect>] = [:]

    static func reduce(value: inout [String: Anchor<CGRect>], nextValue: () -> [String: Anchor<CGRect>]) {
        value.merge(nextValue()) { $1 }
    }
}

// Usage: Underline indicator following selected tab
struct TabBar: View {
    @State private var selectedTab = 0
    let tabs = ["Home", "Search", "Profile"]

    var body: some View {
        HStack {
            ForEach(Array(tabs.enumerated()), id: \.offset) { index, tab in
                Text(tab)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .anchorPreference(
                        key: BoundsPreferenceKey.self,
                        value: .bounds
                    ) { ["\(index)": $0] }
                    .onTapGesture { selectedTab = index }
            }
        }
        .overlayPreferenceValue(BoundsPreferenceKey.self) { prefs in
            GeometryReader { geo in
                if let anchor = prefs["\(selectedTab)"] {
                    let rect = geo[anchor]
                    Rectangle()
                        .fill(Color.blue)
                        .frame(width: rect.width, height: 3)
                        .position(x: rect.midX, y: rect.maxY)
                        .animation(.spring(), value: selectedTab)
                }
            }
        }
    }
}
```

---

### Pattern 4: Custom Transitions

Create smooth, custom view transitions.

#### Basic Custom Transition

```swift
// MARK: - Slide & Fade Transition
struct SlideAndFade: ViewModifier {
    let isActive: Bool
    let edge: Edge

    func body(content: Content) -> some View {
        content
            .opacity(isActive ? 0 : 1)
            .offset(x: isActive ? (edge == .leading ? -50 : 50) : 0)
    }
}

extension AnyTransition {
    static func slideAndFade(edge: Edge = .leading) -> AnyTransition {
        .modifier(
            active: SlideAndFade(isActive: true, edge: edge),
            identity: SlideAndFade(isActive: false, edge: edge)
        )
    }
}

// Usage
struct TransitionDemo: View {
    @State private var showContent = false

    var body: some View {
        VStack {
            Button("Toggle") {
                withAnimation(.spring()) {
                    showContent.toggle()
                }
            }

            if showContent {
                Text("Animated Content")
                    .padding()
                    .background(Color.blue)
                    .transition(.slideAndFade(edge: .trailing))
            }
        }
    }
}
```

#### Scale & Rotate Transition

```swift
struct ScaleRotate: ViewModifier {
    let isActive: Bool

    func body(content: Content) -> some View {
        content
            .scaleEffect(isActive ? 0.1 : 1)
            .rotationEffect(.degrees(isActive ? 360 : 0))
            .opacity(isActive ? 0 : 1)
    }
}

extension AnyTransition {
    static var scaleRotate: AnyTransition {
        .modifier(
            active: ScaleRotate(isActive: true),
            identity: ScaleRotate(isActive: false)
        )
    }
}
```

#### Asymmetric Transitions

```swift
extension AnyTransition {
    static var slideFromBottom: AnyTransition {
        .asymmetric(
            insertion: .move(edge: .bottom).combined(with: .opacity),
            removal: .scale.combined(with: .opacity)
        )
    }

    static var popIn: AnyTransition {
        .asymmetric(
            insertion: .scale(scale: 0.5).combined(with: .opacity),
            removal: .opacity
        )
    }
}
```

#### matchedGeometryEffect Hero Transitions

```swift
struct HeroTransition: View {
    @Namespace private var namespace
    @State private var isExpanded = false
    @State private var selectedItem: String?

    let items = ["Item A", "Item B", "Item C"]

    var body: some View {
        ZStack {
            // Grid view
            if selectedItem == nil {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())]) {
                    ForEach(items, id: \.self) { item in
                        CardView(item: item)
                            .matchedGeometryEffect(id: item, in: namespace)
                            .onTapGesture {
                                withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                                    selectedItem = item
                                }
                            }
                    }
                }
                .padding()
            }

            // Expanded detail view
            if let selected = selectedItem {
                ExpandedCardView(item: selected)
                    .matchedGeometryEffect(id: selected, in: namespace)
                    .onTapGesture {
                        withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                            selectedItem = nil
                        }
                    }
                    .zIndex(1)
            }
        }
    }
}

struct CardView: View {
    let item: String

    var body: some View {
        RoundedRectangle(cornerRadius: 16)
            .fill(Color.blue.gradient)
            .frame(height: 150)
            .overlay(
                Text(item)
                    .font(.headline)
                    .foregroundColor(.white)
            )
    }
}

struct ExpandedCardView: View {
    let item: String

    var body: some View {
        RoundedRectangle(cornerRadius: 24)
            .fill(Color.blue.gradient)
            .ignoresSafeArea()
            .overlay(
                VStack {
                    Text(item)
                        .font(.largeTitle)
                        .foregroundColor(.white)
                    Text("Tap to close")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.7))
                }
            )
    }
}
```

---

### Pattern 5: Gesture Handlers

Build interactive gesture-driven UIs.

#### Drag Gesture with Velocity

```swift
struct DraggableCard: View {
    @State private var offset: CGSize = .zero
    @State private var isDragging = false

    var body: some View {
        RoundedRectangle(cornerRadius: 16)
            .fill(Color.blue)
            .frame(width: 200, height: 300)
            .offset(offset)
            .scaleEffect(isDragging ? 1.05 : 1)
            .shadow(radius: isDragging ? 20 : 5)
            .gesture(
                DragGesture()
                    .onChanged { value in
                        isDragging = true
                        offset = value.translation
                    }
                    .onEnded { value in
                        isDragging = false

                        // Swipe threshold
                        let threshold: CGFloat = 100

                        if abs(value.translation.width) > threshold {
                            // Swipe away
                            withAnimation(.spring()) {
                                offset.width = value.translation.width > 0 ? 500 : -500
                            }
                        } else {
                            // Snap back
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                                offset = .zero
                            }
                        }
                    }
            )
    }
}
```

#### Long Press with Progress

```swift
struct LongPressButton: View {
    @State private var isPressed = false
    @State private var progress: CGFloat = 0
    let duration: Double = 1.5
    let onComplete: () -> Void

    var body: some View {
        Circle()
            .fill(Color.blue.opacity(0.3))
            .frame(width: 80, height: 80)
            .overlay(
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(Color.blue, lineWidth: 4)
                    .rotationEffect(.degrees(-90))
            )
            .overlay(
                Image(systemName: "checkmark")
                    .foregroundColor(.blue)
                    .scaleEffect(isPressed ? 0.8 : 1)
            )
            .scaleEffect(isPressed ? 1.1 : 1)
            .gesture(
                LongPressGesture(minimumDuration: duration)
                    .onChanged { _ in
                        isPressed = true
                        withAnimation(.linear(duration: duration)) {
                            progress = 1
                        }
                    }
                    .onEnded { _ in
                        isPressed = false
                        onComplete()
                        // Reset after completion
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                            withAnimation {
                                progress = 0
                            }
                        }
                    }
            )
            .simultaneousGesture(
                DragGesture(minimumDistance: 0)
                    .onEnded { _ in
                        // Cancelled
                        isPressed = false
                        withAnimation {
                            progress = 0
                        }
                    }
            )
    }
}
```

#### Magnification & Rotation Combined

```swift
struct ZoomableRotatableImage: View {
    @State private var scale: CGFloat = 1
    @State private var lastScale: CGFloat = 1
    @State private var rotation: Angle = .zero
    @State private var lastRotation: Angle = .zero

    var body: some View {
        Image(systemName: "star.fill")
            .font(.system(size: 100))
            .foregroundColor(.yellow)
            .scaleEffect(scale)
            .rotationEffect(rotation)
            .gesture(
                MagnificationGesture()
                    .onChanged { value in
                        scale = lastScale * value
                    }
                    .onEnded { _ in
                        lastScale = scale
                        // Clamp scale
                        if scale < 0.5 {
                            withAnimation { scale = 0.5 }
                            lastScale = 0.5
                        } else if scale > 4 {
                            withAnimation { scale = 4 }
                            lastScale = 4
                        }
                    }
            )
            .simultaneousGesture(
                RotationGesture()
                    .onChanged { value in
                        rotation = lastRotation + value
                    }
                    .onEnded { _ in
                        lastRotation = rotation
                    }
            )
            .gesture(
                TapGesture(count: 2)
                    .onEnded {
                        withAnimation(.spring()) {
                            scale = 1
                            lastScale = 1
                            rotation = .zero
                            lastRotation = .zero
                        }
                    }
            )
    }
}
```

#### Slide to Unlock

```swift
struct SlideToUnlock: View {
    @State private var offset: CGFloat = 0
    @State private var isUnlocked = false

    let trackWidth: CGFloat = 280
    let thumbSize: CGFloat = 60

    var unlockThreshold: CGFloat { trackWidth - thumbSize - 10 }

    var body: some View {
        ZStack(alignment: .leading) {
            // Track
            Capsule()
                .fill(Color.gray.opacity(0.3))
                .frame(width: trackWidth, height: thumbSize + 10)

            // Progress fill
            Capsule()
                .fill(Color.green.opacity(0.5))
                .frame(width: offset + thumbSize, height: thumbSize + 10)

            // Label
            Text(isUnlocked ? "Unlocked!" : "Slide to unlock")
                .font(.headline)
                .foregroundColor(.gray)
                .frame(width: trackWidth)
                .opacity(isUnlocked ? 0 : 1 - (offset / unlockThreshold))

            // Thumb
            Circle()
                .fill(isUnlocked ? Color.green : Color.white)
                .frame(width: thumbSize, height: thumbSize)
                .shadow(radius: 3)
                .overlay(
                    Image(systemName: isUnlocked ? "checkmark" : "chevron.right")
                        .foregroundColor(isUnlocked ? .white : .gray)
                )
                .offset(x: offset + 5)
                .gesture(
                    DragGesture()
                        .onChanged { value in
                            guard !isUnlocked else { return }
                            offset = min(max(0, value.translation.width), unlockThreshold)
                        }
                        .onEnded { _ in
                            if offset >= unlockThreshold {
                                withAnimation(.spring()) {
                                    isUnlocked = true
                                }
                            } else {
                                withAnimation(.spring()) {
                                    offset = 0
                                }
                            }
                        }
                )
        }
    }
}
```

---

## Part 3: Quick Reference

### Library Comparison

| Library | Use Case | Platform Support |
|---------|----------|------------------|
| TCA | State management, architecture | iOS 13+, macOS 10.15+ |
| PopupView | Toasts, popups, modals | iOS 13+ |
| SwiftUI-Introspect | UIKit/AppKit access | iOS 13+, macOS 10.15+ |
| SSToastMessage | Simple toast notifications | iOS 13+ |
| ChartView | Data visualization | iOS 13+ |
| Animation Library | Animation patterns | iOS 15+ (PhaseAnimator) |

### Pattern Decision Matrix

| Need | Pattern |
|------|---------|
| App-wide styling | Environment-based theming |
| Reusable component styling | ViewModifier composition |
| Child-to-parent communication | PreferenceKey |
| Dynamic layouts based on size | GeometryReader + PreferenceKey |
| Smooth view switching | matchedGeometryEffect |
| Enter/exit animations | Custom AnyTransition |
| Interactive drag/swipe | DragGesture |
| Press-and-hold actions | LongPressGesture |
| Zoom/rotate | Magnification + Rotation gestures |

---

## Sources

### Libraries
- [swift-composable-architecture](https://github.com/pointfreeco/swift-composable-architecture)
- [About-SwiftUI](https://github.com/Juanpe/About-SwiftUI)
- [awesome-swiftui](https://github.com/onmyway133/awesome-swiftui)
- [swiftui-animation-library](https://github.com/amosgyamfi/swiftui-animation-library)
- [PopupView](https://github.com/exyte/PopupView)
- [SwiftUI-Introspect](https://github.com/siteline/SwiftUI-Introspect)
- [SSToastMessage](https://github.com/SimformSolutionsPvtLtd/SSToastMessage)
- [ChartView](https://github.com/AppPear/ChartView)

### Pattern References
- [Understanding SwiftUI Preferences](https://peterfriese.dev/blog/2025/swiftui-preferences-swift6/)
- [SwiftUI Preferences](https://shadowfacts.net/2025/swiftui-preferences/)
- [Effortless SwiftUI Theming](https://alexanderweiss.dev/blog/2025-01-19-effortless-swiftui-theming)
- [SwiftUI Styling Guide](https://dev.to/swift_pal/swiftui-styling-guide-custom-fonts-themes-dark-mode-the-order-that-breaks-everything-c8o)
- [Advanced SwiftUI Transitions](https://swiftui-lab.com/advanced-transitions/)
- [matchedGeometryEffect Hero Animations](https://swiftui-lab.com/matchedgeometryeffect-part1/)
- [Custom Transitions with matchedGeometry](https://blog.stackademic.com/swiftui-custom-view-transition-nav-with-matched-geometry-032552356fc5)

---

## Part 4: Component Libraries (Extended)

### 7. SwiftUIX
**Repository:** [SwiftUIX/SwiftUIX](https://github.com/SwiftUIX/SwiftUIX)

Extends SwiftUI with hundreds of missing components, porting UIKit/AppKit functionality.

#### Key Components

| Component | Replaces | Purpose |
|-----------|----------|---------|
| `ActivityIndicator` | UIActivityIndicatorView | Loading spinners |
| `SearchBar` | UISearchBar | Search input with cancel |
| `CollectionView` | UICollectionView | Advanced grid layouts |
| `TextView` | UITextView | Multi-line text editing |
| `LinkPresentationView` | LPLinkView | URL previews |
| `AppActivityView` | UIActivityViewController | Share sheets |
| `PaginationView` | UIPageViewController | Paged content |

#### Usage Examples

```swift
import SwiftUIX

// SearchBar with cancel button
struct SearchableList: View {
    @State private var searchText = ""
    @State private var isEditing = false

    var body: some View {
        VStack {
            SearchBar("Search...", text: $searchText, isEditing: $isEditing)
                .showsCancelButton(isEditing)
                .onCancel { print("Search cancelled") }

            List(filteredItems) { item in
                Text(item.name)
            }
        }
    }
}

// CollectionView for custom layouts
struct GridGallery: View {
    let items: [GalleryItem]

    var body: some View {
        CollectionView(items, id: \.id) { item in
            Image(item.imageName)
                .resizable()
                .aspectRatio(contentMode: .fill)
                .frame(height: 150)
                .clipped()
                .cornerRadius(8)
        }
    }
}

// Pagination with custom indicators
struct OnboardingView: View {
    @State private var currentPage = 0
    let pages = ["Welcome", "Features", "Get Started"]

    var body: some View {
        PaginationView(axis: .horizontal) {
            ForEach(pages, id: \.self) { page in
                Text(page)
                    .font(.largeTitle)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .currentPageIndex($currentPage)
        .pageIndicatorTintColor(.gray)
        .currentPageIndicatorTintColor(.blue)
    }
}

// Link preview
struct LinkPreview: View {
    let url = URL(string: "https://apple.com")!

    var body: some View {
        LinkPresentationView(url: url)
            .frame(height: 192)
            .cornerRadius(12)
    }
}

// Keyboard-aware layout
struct ChatInput: View {
    @State private var message = ""

    var body: some View {
        VStack {
            Spacer()
            TextField("Message", text: $message)
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(20)
        }
        .padding(.bottom, Keyboard.main.height) // Auto-adjusts for keyboard
        .animation(.easeOut(duration: 0.25), value: Keyboard.main.height)
    }
}
```

---

### 8. SDWebImageSwiftUI
**Repository:** [SDWebImage/SDWebImageSwiftUI](https://github.com/SDWebImage/SDWebImageSwiftUI)

Async image loading with caching, placeholders, and animation support.

#### Core Components

| Component | Use Case | Features |
|-----------|----------|----------|
| `WebImage` | Standard images | SwiftUI native, simple API |
| `AnimatedImage` | GIFs, animated WebP | UIKit-backed, full control |

#### Usage Examples

```swift
import SDWebImageSwiftUI

// Basic web image with placeholder
struct AvatarView: View {
    let imageURL: URL?

    var body: some View {
        WebImage(url: imageURL)
            .resizable()
            .placeholder {
                Circle()
                    .fill(Color.gray.opacity(0.3))
                    .overlay(
                        Image(systemName: "person.fill")
                            .foregroundColor(.gray)
                    )
            }
            .indicator(.activity)
            .transition(.fade(duration: 0.3))
            .scaledToFill()
            .frame(width: 60, height: 60)
            .clipShape(Circle())
    }
}

// Image with progress indicator
struct HeroImage: View {
    let url: URL

    var body: some View {
        WebImage(url: url)
            .resizable()
            .indicator(.progress)
            .transition(.fade)
            .scaledToFit()
            .frame(maxHeight: 300)
    }
}

// Animated GIF
struct AnimatedSticker: View {
    let gifURL: URL

    var body: some View {
        AnimatedImage(url: gifURL)
            .resizable()
            .playbackRate(1.0)
            .scaledToFit()
            .frame(width: 120, height: 120)
    }
}

// Custom loading and error handling
struct ProductImage: View {
    let url: URL
    @State private var isLoading = true
    @State private var loadFailed = false

    var body: some View {
        WebImage(url: url)
            .onSuccess { image, data, cacheType in
                isLoading = false
                print("Loaded from: \(cacheType)")
            }
            .onFailure { error in
                isLoading = false
                loadFailed = true
                print("Failed: \(error.localizedDescription)")
            }
            .resizable()
            .placeholder {
                if loadFailed {
                    Image(systemName: "photo")
                        .foregroundColor(.gray)
                } else {
                    ProgressView()
                }
            }
            .scaledToFill()
    }
}

// Cache configuration
struct ImageCacheConfig {
    static func configure() {
        // Memory cache: 100MB
        SDImageCache.shared.config.maxMemoryCost = 100 * 1024 * 1024
        // Disk cache: 500MB
        SDImageCache.shared.config.maxDiskSize = 500 * 1024 * 1024
        // Expire after 7 days
        SDImageCache.shared.config.maxDiskAge = 60 * 60 * 24 * 7
    }
}
```

---

### 9. Lottie
**Repository:** [airbnb/lottie-ios](https://github.com/airbnb/lottie-ios)

Vector-based animations exported from After Effects.

#### SwiftUI Integration

```swift
import Lottie

// Basic Lottie animation
struct LoadingAnimation: View {
    var body: some View {
        LottieView(animation: .named("loading"))
            .looping()
            .frame(width: 200, height: 200)
    }
}

// Controlled playback
struct SuccessAnimation: View {
    @State private var playbackMode: LottiePlaybackMode = .paused

    var body: some View {
        VStack {
            LottieView(animation: .named("success"))
                .playbackMode(playbackMode)
                .frame(width: 150, height: 150)

            Button("Play") {
                playbackMode = .playing(.fromProgress(0, toProgress: 1, loopMode: .playOnce))
            }
        }
    }
}

// Animation with color customization
struct CustomColorAnimation: View {
    var body: some View {
        LottieView(animation: .named("heart"))
            .configure { view in
                // Change specific layer colors at runtime
                view.setValueProvider(
                    ColorValueProvider(LottieColor(r: 1, g: 0, b: 0, a: 1)),
                    keypath: AnimationKeypath(keypath: "**.Fill 1.Color")
                )
            }
            .looping()
            .frame(width: 100, height: 100)
    }
}

// Progress-based animation (scrubbing)
struct ProgressAnimation: View {
    @Binding var progress: CGFloat

    var body: some View {
        LottieView(animation: .named("progress-bar"))
            .currentProgress(progress)
            .frame(height: 50)
    }
}

// Async loading from URL
struct RemoteAnimation: View {
    let animationURL: URL

    var body: some View {
        LottieView {
            try await DotLottieFile.named("animation", bundle: .main)
        } placeholder: {
            ProgressView()
        }
        .looping()
        .frame(width: 200, height: 200)
    }
}
```

---

### 10. ConfettiSwiftUI
**Repository:** [simibac/ConfettiSwiftUI](https://github.com/simibac/ConfettiSwiftUI)

Celebration animations for achievement moments.

```swift
import ConfettiSwiftUI

// Basic confetti burst
struct CelebrationView: View {
    @State private var confettiTrigger = 0

    var body: some View {
        VStack {
            Text("You did it!")
                .font(.largeTitle)

            Button("Celebrate!") {
                confettiTrigger += 1
            }
            .confettiCannon(trigger: $confettiTrigger)
        }
    }
}

// Emoji confetti
struct EmojiCelebration: View {
    @State private var trigger = 0

    var body: some View {
        Button("Hearts!") {
            trigger += 1
        }
        .confettiCannon(
            trigger: $trigger,
            num: 50,
            confettis: [.text("❤️"), .text("💙"), .text("💚"), .text("💛")],
            confettiSize: 20,
            rainHeight: 800,
            radius: 400
        )
    }
}

// Customized burst pattern
struct CustomConfetti: View {
    @State private var trigger = 0

    var body: some View {
        Button("Burst") {
            trigger += 1
        }
        .confettiCannon(
            trigger: $trigger,
            num: 30,
            confettis: [.shape(.circle), .shape(.triangle), .shape(.square)],
            colors: [.red, .blue, .green, .yellow, .purple],
            confettiSize: 12,
            rainHeight: 600,
            openingAngle: .degrees(30),
            closingAngle: .degrees(150),
            radius: 350,
            repetitions: 1,
            repetitionInterval: 0.8
        )
    }
}

// Continuous celebration
struct OngoingCelebration: View {
    @State private var trigger = 0

    var body: some View {
        Text("Winner!")
            .onAppear { trigger += 1 }
            .confettiCannon(
                trigger: $trigger,
                num: 1,
                confettis: [.text("🎉"), .text("⭐️")],
                repetitions: 100,
                repetitionInterval: 0.1
            )
    }
}

// SF Symbol confetti
struct SymbolConfetti: View {
    @State private var trigger = 0

    var body: some View {
        Button("Stars!") {
            trigger += 1
        }
        .confettiCannon(
            trigger: $trigger,
            confettis: [
                .sfSymbol(symbolName: "star.fill"),
                .sfSymbol(symbolName: "heart.fill"),
                .sfSymbol(symbolName: "hands.clap.fill")
            ],
            colors: [.yellow, .red, .orange]
        )
    }
}
```

---

### 11. AlertToast
**Repository:** [elai950/AlertToast](https://github.com/elai950/AlertToast)

Apple-style toast notifications with multiple display modes.

```swift
import AlertToast

// Success toast
struct ActionCompleteView: View {
    @State private var showToast = false

    var body: some View {
        Button("Save") {
            // perform save
            showToast = true
        }
        .toast(isPresenting: $showToast, duration: 2) {
            AlertToast(
                displayMode: .hud,
                type: .complete(.green),
                title: "Saved!"
            )
        }
    }
}

// Error toast
struct ErrorView: View {
    @State private var showError = false

    var body: some View {
        Button("Submit") {
            showError = true
        }
        .toast(isPresenting: $showError) {
            AlertToast(
                displayMode: .banner(.pop),
                type: .error(.red),
                title: "Failed to submit",
                subTitle: "Please check your connection"
            )
        }
    }
}

// Loading toast
struct LoadingView: View {
    @State private var isLoading = false

    var body: some View {
        Button("Load Data") {
            isLoading = true
            // simulate async work
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                isLoading = false
            }
        }
        .toast(isPresenting: $isLoading) {
            AlertToast(
                type: .loading,
                title: "Loading...",
                subTitle: "Please wait"
            )
        }
    }
}

// System image toast
struct CustomIconToast: View {
    @State private var showToast = false

    var body: some View {
        Button("Favorite") {
            showToast = true
        }
        .toast(isPresenting: $showToast) {
            AlertToast(
                displayMode: .hud,
                type: .systemImage("heart.fill", .pink),
                title: "Added to favorites"
            )
        }
    }
}

// Styled toast
struct StyledToast: View {
    @State private var showToast = false

    var body: some View {
        Button("Show") {
            showToast = true
        }
        .toast(isPresenting: $showToast, tapToDismiss: true) {
            AlertToast(
                displayMode: .alert,
                type: .regular,
                title: "Custom Style",
                subTitle: "Tap to dismiss",
                style: .style(
                    backgroundColor: .black.opacity(0.8),
                    titleColor: .white,
                    subTitleColor: .gray,
                    titleFont: .headline,
                    subTitleFont: .caption
                )
            )
        }
    }
}
```

---

### 12. WaterfallGrid
**Repository:** [paololeonardi/WaterfallGrid](https://github.com/paololeonardi/WaterfallGrid)

Pinterest-style masonry grid layouts.

```swift
import WaterfallGrid

// Basic waterfall grid
struct PinterestFeed: View {
    let items: [FeedItem]

    var body: some View {
        ScrollView {
            WaterfallGrid(items, id: \.id) { item in
                AsyncImage(url: item.imageURL) { image in
                    image
                        .resizable()
                        .scaledToFill()
                } placeholder: {
                    Color.gray.opacity(0.3)
                }
                .frame(height: item.height) // Variable heights
                .cornerRadius(8)
            }
            .gridStyle(columns: 2, spacing: 8)
            .padding()
        }
    }
}

// Responsive columns
struct ResponsiveGrid: View {
    let items: [Item]

    var body: some View {
        ScrollView {
            WaterfallGrid(items, id: \.id) { item in
                ItemCard(item: item)
            }
            .gridStyle(
                columnsInPortrait: 2,
                columnsInLandscape: 4,
                spacing: 12,
                animation: .easeInOut(duration: 0.3)
            )
            .padding()
        }
    }
}

// Horizontal waterfall
struct HorizontalMasonry: View {
    let items: [Item]

    var body: some View {
        ScrollView(.horizontal) {
            WaterfallGrid(items, id: \.id) { item in
                ItemCard(item: item)
            }
            .gridStyle(columns: 3, spacing: 8)
            .scrollOptions(direction: .horizontal)
            .frame(height: 400)
        }
    }
}

// With animation on data change
struct AnimatedGrid: View {
    @State private var items: [Item] = []

    var body: some View {
        ScrollView {
            WaterfallGrid(items, id: \.id) { item in
                ItemCard(item: item)
            }
            .gridStyle(
                columns: 2,
                spacing: 10,
                animation: .spring(response: 0.4, dampingFraction: 0.7)
            )
        }
        .onAppear {
            withAnimation {
                items = loadItems()
            }
        }
    }
}
```

---

### 13. BottomSheet
**Repository:** [lucaszischka/BottomSheet](https://github.com/lucaszischka/BottomSheet)

Apple Maps-style draggable bottom sheets.

```swift
import BottomSheet

// Basic bottom sheet with positions
struct MapView: View {
    @State private var sheetPosition: BottomSheetPosition = .relative(0.4)

    var body: some View {
        ZStack {
            Map()
        }
        .bottomSheet(
            bottomSheetPosition: $sheetPosition,
            switchablePositions: [
                .relativeBottom(0.15),  // Collapsed
                .relative(0.4),          // Half
                .relativeTop(0.95)        // Full
            ]
        ) {
            VStack {
                Text("Location Details")
                    .font(.headline)
                // Sheet content
            }
            .padding()
        }
    }
}

// With header and scroll behavior
struct SearchSheet: View {
    @State private var position: BottomSheetPosition = .relative(0.4)
    @State private var searchText = ""

    var body: some View {
        ContentView()
            .bottomSheet(
                bottomSheetPosition: $position,
                switchablePositions: [.relative(0.15), .relative(0.4), .relativeTop(0.9)],
                headerContent: {
                    // Custom header
                    VStack {
                        Capsule()
                            .fill(Color.gray.opacity(0.5))
                            .frame(width: 40, height: 5)
                            .padding(.top, 8)

                        TextField("Search", text: $searchText)
                            .textFieldStyle(.roundedBorder)
                            .padding(.horizontal)
                    }
                }
            ) {
                // Main content with scroll
                ScrollView {
                    LazyVStack {
                        ForEach(searchResults) { result in
                            ResultRow(result: result)
                        }
                    }
                }
            }
            .enableAppleScrollBehavior()
            .enableSwipeToDismiss()
            .enableTapToDismiss()
    }
}

// Customized appearance
struct StyledSheet: View {
    @State private var position: BottomSheetPosition = .absolute(325)

    var body: some View {
        ContentView()
            .bottomSheet(
                bottomSheetPosition: $position,
                switchablePositions: [.absolute(100), .absolute(325), .relativeTop(0.9)]
            ) {
                SheetContent()
            }
            .customBackground(
                Color(.systemBackground)
                    .cornerRadius(20)
                    .shadow(color: .black.opacity(0.15), radius: 10)
            )
            .dragIndicatorColor(.gray)
            .customAnimation(.spring(response: 0.35, dampingFraction: 0.8))
            .enableContentDrag()
            .enableBackgroundBlur()
    }
}

// Dynamic height
struct DynamicSheet: View {
    @State private var position: BottomSheetPosition = .dynamic

    var body: some View {
        ContentView()
            .bottomSheet(bottomSheetPosition: $position) {
                VStack(spacing: 16) {
                    Text("Dynamic Height")
                        .font(.headline)
                    Text("This sheet sizes itself to content")
                    Button("Close") {
                        position = .hidden
                    }
                }
                .padding()
            }
            .enableAccountingForKeyboardHeight()
    }
}
```

---

### 14. Defaults
**Repository:** [sindresorhus/Defaults](https://github.com/sindresorhus/Defaults)

Type-safe UserDefaults with SwiftUI integration.

```swift
import Defaults

// MARK: - Key Definitions
extension Defaults.Keys {
    // Primitives
    static let username = Key<String>("username", default: "")
    static let isOnboarded = Key<Bool>("isOnboarded", default: false)
    static let launchCount = Key<Int>("launchCount", default: 0)
    static let volume = Key<Double>("volume", default: 0.8)

    // Enums (must be Codable)
    static let theme = Key<AppTheme>("theme", default: .system)
    static let sortOrder = Key<SortOrder>("sortOrder", default: .dateDescending)

    // Complex types
    static let lastOpenedProject = Key<Project?>("lastOpenedProject")
    static let recentSearches = Key<[String]>("recentSearches", default: [])
    static let userPreferences = Key<UserPreferences>("userPreferences", default: .init())
}

enum AppTheme: String, Codable, Defaults.Serializable {
    case light, dark, system
}

enum SortOrder: String, Codable, Defaults.Serializable {
    case dateAscending, dateDescending, alphabetical
}

struct UserPreferences: Codable, Defaults.Serializable {
    var notificationsEnabled = true
    var hapticFeedback = true
    var fontSize: CGFloat = 16
}

// MARK: - Usage in SwiftUI
struct SettingsView: View {
    @Default(.theme) var theme
    @Default(.volume) var volume
    @Default(.userPreferences) var preferences

    var body: some View {
        Form {
            Section("Appearance") {
                Picker("Theme", selection: $theme) {
                    Text("Light").tag(AppTheme.light)
                    Text("Dark").tag(AppTheme.dark)
                    Text("System").tag(AppTheme.system)
                }
            }

            Section("Audio") {
                Slider(value: $volume, in: 0...1) {
                    Text("Volume")
                }
            }

            Section("Preferences") {
                Toggle("Notifications", isOn: $preferences.notificationsEnabled)
                Toggle("Haptic Feedback", isOn: $preferences.hapticFeedback)
            }
        }
    }
}

// MARK: - Programmatic Access
struct AppDelegate {
    func incrementLaunchCount() {
        Defaults[.launchCount] += 1
    }

    func addRecentSearch(_ query: String) {
        var searches = Defaults[.recentSearches]
        searches.insert(query, at: 0)
        searches = Array(searches.prefix(10)) // Keep last 10
        Defaults[.recentSearches] = searches
    }

    func resetToDefaults() {
        Defaults.reset(.theme, .volume, .sortOrder)
    }
}

// MARK: - Observation Outside SwiftUI
class SettingsObserver {
    private var cancellable: Defaults.Observation?

    func startObserving() {
        cancellable = Defaults.observe(.theme) { change in
            print("Theme changed from \(change.oldValue) to \(change.newValue)")
            self.applyTheme(change.newValue)
        }
    }

    private func applyTheme(_ theme: AppTheme) {
        // Apply theme changes
    }
}
```

---

### 15. Grid (exyte)
**Repository:** [exyte/Grid](https://github.com/exyte/Grid)

CSS Grid-inspired layout system for SwiftUI.

```swift
import ExyteGrid

// Basic fixed-column grid
struct PhotoGrid: View {
    let photos: [Photo]

    var body: some View {
        Grid(tracks: [.fr(1), .fr(1), .fr(1)]) {
            ForEach(photos) { photo in
                PhotoCell(photo: photo)
            }
        }
        .gridContentMode(.scroll)
        .padding()
    }
}

// Mixed track sizes
struct DashboardLayout: View {
    var body: some View {
        Grid(tracks: [.pt(80), .fr(1), .fr(1)]) {
            // Sidebar (80pt fixed)
            SidebarView()
                .gridSpan(row: 3) // Span 3 rows

            // Main content (flexible)
            MainContentView()
                .gridSpan(column: 2) // Span 2 columns

            // Bottom panels
            StatsPanel()
            ActivityPanel()
        }
        .gridContentMode(.fill)
    }
}

// Spanning cells
struct FeatureGrid: View {
    var body: some View {
        Grid(tracks: [.fr(1), .fr(1), .fr(1)], spacing: 16) {
            // Featured item spans 2x2
            FeaturedCard()
                .gridSpan(column: 2, row: 2)

            // Regular items
            ForEach(0..<4) { i in
                RegularCard(index: i)
            }
        }
        .padding()
    }
}

// Dynamic track sizing
struct AdaptiveGrid: View {
    var body: some View {
        Grid(tracks: [.fit, .fr(2), .fr(1)]) {
            // First column fits content
            Label("Status", systemImage: "circle.fill")

            // Second column gets 2/3 of remaining space
            Text("This is the main content area")

            // Third column gets 1/3 of remaining space
            Text("Actions")
        }
    }
}

// Row and column flow
struct FlowingGrid: View {
    let items: [Item]

    var body: some View {
        Grid(tracks: 3, flow: .rows, packing: .dense) {
            ForEach(items) { item in
                ItemView(item: item)
                    .gridSpan(column: item.isWide ? 2 : 1)
            }
        }
    }
}

// With explicit positioning
struct ExplicitLayout: View {
    var body: some View {
        Grid(tracks: [.fr(1), .fr(1), .fr(1)]) {
            Text("Start")
                .gridStart(column: 0, row: 0)

            Text("Center")
                .gridStart(column: 1, row: 1)

            Text("End")
                .gridStart(column: 2, row: 2)
        }
    }
}
```

---

### 16. SwiftUI-Shimmer
**Repository:** [markiv/SwiftUI-Shimmer](https://github.com/markiv/SwiftUI-Shimmer)

Skeleton loading effects for placeholder content.

```swift
import Shimmer

// Basic shimmer on placeholder
struct LoadingCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Rectangle()
                .fill(Color.gray.opacity(0.3))
                .frame(height: 200)
                .cornerRadius(12)

            Rectangle()
                .fill(Color.gray.opacity(0.3))
                .frame(height: 20)
                .cornerRadius(4)

            Rectangle()
                .fill(Color.gray.opacity(0.3))
                .frame(width: 150, height: 16)
                .cornerRadius(4)
        }
        .shimmering()
    }
}

// Combined with redaction
struct ContentLoadingView: View {
    @State private var isLoading = true
    @State private var content: Content?

    var body: some View {
        VStack(alignment: .leading) {
            Text(content?.title ?? "Placeholder Title Here")
                .font(.headline)

            Text(content?.description ?? "This is placeholder description text that will be replaced")
                .font(.body)
        }
        .redacted(reason: isLoading ? .placeholder : [])
        .shimmering(active: isLoading)
        .task {
            content = await loadContent()
            isLoading = false
        }
    }
}

// Custom shimmer timing
struct CustomShimmer: View {
    var body: some View {
        Text("Loading...")
            .font(.title)
            .shimmering(
                animation: .easeInOut(duration: 1.5)
                    .repeatForever(autoreverses: false),
                bandSize: 0.3
            )
    }
}

// Bounce animation style
struct BounceShimmer: View {
    var body: some View {
        RoundedRectangle(cornerRadius: 12)
            .fill(Color.gray.opacity(0.3))
            .frame(height: 100)
            .shimmering(
                animation: .easeInOut(duration: 1.0),
                bandSize: 0.4,
                bounce: true
            )
    }
}

// Custom gradient shimmer
struct GradientShimmer: View {
    var body: some View {
        Text("Premium Feature")
            .font(.headline)
            .shimmering(
                gradient: Gradient(colors: [
                    .clear,
                    .yellow.opacity(0.5),
                    .orange.opacity(0.8),
                    .yellow.opacity(0.5),
                    .clear
                ]),
                bandSize: 0.4,
                mode: .overlay()
            )
    }
}

// Skeleton list
struct SkeletonList: View {
    let placeholderCount = 5

    var body: some View {
        List {
            ForEach(0..<placeholderCount, id: \.self) { _ in
                HStack(spacing: 12) {
                    Circle()
                        .fill(Color.gray.opacity(0.3))
                        .frame(width: 50, height: 50)

                    VStack(alignment: .leading, spacing: 8) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.gray.opacity(0.3))
                            .frame(height: 16)

                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.gray.opacity(0.3))
                            .frame(width: 120, height: 12)
                    }
                }
                .shimmering()
            }
        }
    }
}
```

---

### 17. SwiftUIPager
**Repository:** [fermoya/SwiftUIPager](https://github.com/fermoya/SwiftUIPager)

Horizontal/vertical paging with transformations.

```swift
import SwiftUIPager

// Basic horizontal pager
struct OnboardingPager: View {
    @StateObject var page = Page.first()
    let pages = ["Welcome", "Features", "Get Started"]

    var body: some View {
        VStack {
            Pager(page: page, data: pages, id: \.self) { title in
                OnboardingPage(title: title)
            }
            .itemSpacing(10)
            .padding(.horizontal, 40)

            // Page indicator
            HStack {
                ForEach(0..<pages.count, id: \.self) { index in
                    Circle()
                        .fill(page.index == index ? Color.blue : Color.gray)
                        .frame(width: 8, height: 8)
                }
            }
        }
    }
}

// Card carousel with scale effect
struct CardCarousel: View {
    @StateObject var page = Page.first()
    let items: [CarouselItem]

    var body: some View {
        Pager(page: page, data: items, id: \.id) { item in
            CardView(item: item)
                .cornerRadius(16)
                .shadow(radius: 5)
        }
        .itemSpacing(16)
        .itemAspectRatio(0.8)
        .interactive(scale: 0.85) // Adjacent cards scale down
        .padding(.horizontal, 40)
    }
}

// Vertical pager
struct VerticalFeed: View {
    @StateObject var page = Page.first()
    let posts: [Post]

    var body: some View {
        Pager(page: page, data: posts, id: \.id) { post in
            PostView(post: post)
        }
        .vertical()
        .sensitivity(.high)
        .pagingPriority(.simultaneous)
    }
}

// Infinite looping pager
struct InfiniteCarousel: View {
    @StateObject var page = Page.first()
    let banners: [Banner]

    var body: some View {
        Pager(page: page, data: banners, id: \.id) { banner in
            BannerView(banner: banner)
        }
        .loopPages()
        .itemSpacing(12)
        .itemAspectRatio(1.5)
        .interactive(rotation: true) // 3D rotation effect
    }
}

// With opacity effect
struct FadingPager: View {
    @StateObject var page = Page.first()
    let items: [Item]

    var body: some View {
        Pager(page: page, data: items, id: \.id) { item in
            ItemView(item: item)
        }
        .interactive(opacity: 0.3) // Non-focused items fade
        .itemSpacing(20)
        .padding(.horizontal, 50)
    }
}

// Programmatic control
struct ControlledPager: View {
    @StateObject var page = Page.withIndex(0)
    let items: [Item]

    var body: some View {
        VStack {
            Pager(page: page, data: items, id: \.id) { item in
                ItemView(item: item)
            }

            HStack {
                Button("Previous") {
                    withAnimation {
                        page.update(.previous)
                    }
                }
                .disabled(page.index == 0)

                Spacer()

                Button("Next") {
                    withAnimation {
                        page.update(.next)
                    }
                }
                .disabled(page.index == items.count - 1)
            }
            .padding()
        }
    }
}
```

---

### 18. Drops
**Repository:** [omaralbeik/Drops](https://github.com/omaralbeik/Drops)

Lightweight system-style notifications.

```swift
import Drops

// Simple notification
struct NotificationDemo: View {
    var body: some View {
        Button("Show Drop") {
            Drops.show("Hello World")
        }
    }
}

// With title and subtitle
struct DetailedDrop: View {
    var body: some View {
        Button("Show Details") {
            let drop = Drop(
                title: "Download Complete",
                subtitle: "file.pdf saved to Downloads"
            )
            Drops.show(drop)
        }
    }
}

// With icon
struct IconDrop: View {
    var body: some View {
        Button("Success") {
            let drop = Drop(
                title: "Saved",
                subtitle: "Your changes have been saved",
                icon: UIImage(systemName: "checkmark.circle.fill")
            )
            Drops.show(drop)
        }
    }
}

// Interactive drop with action
struct ActionDrop: View {
    var body: some View {
        Button("Show Action") {
            let drop = Drop(
                title: "New Message",
                subtitle: "From: John Doe",
                icon: UIImage(systemName: "envelope.fill"),
                action: .init {
                    Drops.hideCurrent()
                    // Navigate to message
                }
            )
            Drops.show(drop)
        }
    }
}

// Bottom position with duration
struct BottomDrop: View {
    var body: some View {
        Button("Bottom Drop") {
            let drop = Drop(
                title: "Undo Available",
                subtitle: "Tap to restore deleted item",
                icon: UIImage(systemName: "arrow.uturn.backward"),
                action: .init { Drops.hideCurrent() },
                position: .bottom,
                duration: 5.0
            )
            Drops.show(drop)
        }
    }
}

// With accessibility
struct AccessibleDrop: View {
    var body: some View {
        Button("Accessible") {
            let drop = Drop(
                title: "Error",
                subtitle: "Connection failed",
                icon: UIImage(systemName: "wifi.slash"),
                position: .top,
                duration: 4.0,
                accessibility: "Alert: Connection failed. Please check your internet connection."
            )
            Drops.show(drop)
        }
    }
}

// Queue multiple drops
struct QueuedDrops: View {
    var body: some View {
        Button("Show Queue") {
            Drops.show("First notification")

            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                Drops.show("Second notification")
            }

            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                Drops.show("Third notification")
            }
        }
    }
}
```

---

### 19. SPIndicator
**Repository:** [ivanvorobei/SPIndicator](https://github.com/ivanvorobei/SPIndicator)

System-style floating indicators.

```swift
import SPIndicator

// Preset indicators
struct IndicatorExamples: View {
    var body: some View {
        VStack(spacing: 20) {
            Button("Done") {
                SPIndicator.present(
                    title: "Saved",
                    preset: .done,
                    haptic: .success
                )
            }

            Button("Error") {
                SPIndicator.present(
                    title: "Failed",
                    message: "Try again",
                    preset: .error,
                    haptic: .error
                )
            }

            Button("Custom Icon") {
                SPIndicator.present(
                    title: "Muted",
                    preset: .custom(UIImage(systemName: "bell.slash.fill")!)
                )
            }
        }
    }
}

// SwiftUI modifier approach
struct SwiftUIIndicator: View {
    @State private var showIndicator = false

    var body: some View {
        Button("Show") {
            showIndicator = true
        }
        .SPIndicator(
            isPresent: $showIndicator,
            title: "Complete",
            message: "Task finished",
            duration: 2,
            presentSide: .top,
            haptic: .success
        )
    }
}

// Custom duration and position
struct CustomIndicator: View {
    var body: some View {
        Button("Bottom Indicator") {
            SPIndicator.present(
                title: "Downloaded",
                message: "File saved",
                preset: .done,
                from: .bottom,
                haptic: .success
            )
        }
    }
}

// Programmatic with completion
struct CompletionIndicator: View {
    var body: some View {
        Button("With Completion") {
            SPIndicator.present(
                title: "Processing",
                preset: .done
            ) {
                print("Indicator dismissed")
            }
        }
    }
}
```

---

### 20. WhatsNewKit
**Repository:** [SvenTiigi/WhatsNewKit](https://github.com/SvenTiigi/WhatsNewKit)

Version-aware What's New screens.

```swift
import WhatsNewKit

// Define What's New content
struct AppWhatsNew {
    static let version2_0 = WhatsNew(
        version: "2.0.0",
        title: "What's New in App",
        features: [
            .init(
                image: .init(systemName: "sparkles"),
                title: "New Design",
                subtitle: "Fresh, modern interface with improved accessibility"
            ),
            .init(
                image: .init(systemName: "bolt.fill"),
                title: "Performance",
                subtitle: "Up to 2x faster load times"
            ),
            .init(
                image: .init(systemName: "lock.shield"),
                title: "Security",
                subtitle: "Enhanced encryption for your data"
            ),
            .init(
                image: .init(systemName: "icloud"),
                title: "Cloud Sync",
                subtitle: "Seamlessly sync across all your devices"
            )
        ],
        primaryAction: .init(
            title: "Continue",
            hapticFeedback: .notification(.success)
        )
    )
}

// Automatic presentation
struct ContentView: View {
    var body: some View {
        MainTabView()
            .whatsNewSheet()
    }
}

// Manual presentation control
struct ManualPresentation: View {
    @State private var showWhatsNew = false

    var body: some View {
        VStack {
            Button("Show What's New") {
                showWhatsNew = true
            }
        }
        .sheet(isPresented: $showWhatsNew) {
            WhatsNewView(whatsNew: AppWhatsNew.version2_0)
        }
    }
}

// Custom layout
struct CustomWhatsNewLayout: View {
    var body: some View {
        WhatsNewView(
            whatsNew: AppWhatsNew.version2_0,
            layout: .init(
                contentSpacing: 20,
                featureListSpacing: 16,
                featureImageSize: 44
            )
        )
    }
}

// Version store (prevents showing again)
struct VersionAwareApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(
                    \.whatsNew,
                    WhatsNewEnvironment(
                        versionStore: UserDefaultsWhatsNewVersionStore(),
                        whatsNewCollection: {
                            AppWhatsNew.version2_0
                        }
                    )
                )
        }
    }
}
```

---

## Part 5: Library Selection Guide

### By Use Case

| Need | Recommended Library | Alternative |
|------|---------------------|-------------|
| **Image Loading** | SDWebImageSwiftUI | Kingfisher |
| **Toasts/Popups** | PopupView | AlertToast, Drops |
| **Bottom Sheets** | BottomSheet | Native .sheet |
| **Grid Layouts** | Grid (exyte) | WaterfallGrid |
| **Masonry/Pinterest** | WaterfallGrid | - |
| **Carousel/Pager** | SwiftUIPager | Native TabView |
| **Celebrations** | ConfettiSwiftUI | - |
| **Animations** | Lottie | swiftui-animation-library |
| **UserDefaults** | Defaults | @AppStorage |
| **UIKit Access** | SwiftUI-Introspect | - |
| **Extended Components** | SwiftUIX | - |
| **State Management** | TCA | - |
| **Loading States** | SwiftUI-Shimmer | Custom |
| **Onboarding** | WhatsNewKit | - |
| **System Indicators** | SPIndicator | Drops |

### Minimum iOS Versions

| Library | Min iOS | Notes |
|---------|---------|-------|
| SwiftUIX | 13.0 | Full compatibility |
| SDWebImageSwiftUI | 14.0 | Async image base |
| Lottie | 13.0 | Wide compatibility |
| ConfettiSwiftUI | 14.0 | - |
| AlertToast | 13.0 | - |
| WaterfallGrid | 13.0 | - |
| BottomSheet | 15.0 | Modern SwiftUI |
| Defaults | 14.0 | - |
| Grid (exyte) | 14.0 | - |
| SwiftUI-Shimmer | 13.0 | - |
| SwiftUIPager | 13.0 | - |
| Drops | 13.0 | - |
| SPIndicator | 12.0 | UIKit-based |
| WhatsNewKit | 15.0 | Modern SwiftUI |

---

## Additional Sources

### Component Libraries
- [SwiftUIX](https://github.com/SwiftUIX/SwiftUIX)
- [SDWebImageSwiftUI](https://github.com/SDWebImage/SDWebImageSwiftUI)
- [Lottie](https://github.com/airbnb/lottie-ios)
- [ConfettiSwiftUI](https://github.com/simibac/ConfettiSwiftUI)
- [AlertToast](https://github.com/elai950/AlertToast)
- [WaterfallGrid](https://github.com/paololeonardi/WaterfallGrid)
- [BottomSheet](https://github.com/lucaszischka/BottomSheet)
- [Defaults](https://github.com/sindresorhus/Defaults)
- [Grid](https://github.com/exyte/Grid)
- [SwiftUI-Shimmer](https://github.com/markiv/SwiftUI-Shimmer)
- [SwiftUIPager](https://github.com/fermoya/SwiftUIPager)
- [Drops](https://github.com/omaralbeik/Drops)
- [SPIndicator](https://github.com/ivanvorobei/SPIndicator)
- [WhatsNewKit](https://github.com/SvenTiigi/WhatsNewKit)

### Developer Tools
- [SwiftFormat](https://github.com/nicklockwood/SwiftFormat) - Code formatting
