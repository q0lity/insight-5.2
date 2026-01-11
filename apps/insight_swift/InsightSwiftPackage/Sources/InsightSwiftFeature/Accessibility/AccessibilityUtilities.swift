import Observation
import SwiftUI
import UIKit

// MARK: - VoiceOver Optimization

/// Comprehensive accessibility configuration for VoiceOver
public struct A11yConfig: Equatable {
    public let label: String
    public let hint: String?
    public let value: String?
    public let traits: AccessibilityTraits
    public let identifier: String?
    public let sortPriority: Double
    public let isHidden: Bool

    public init(
        label: String,
        hint: String? = nil,
        value: String? = nil,
        traits: AccessibilityTraits = [],
        identifier: String? = nil,
        sortPriority: Double = 0,
        isHidden: Bool = false
    ) {
        self.label = label
        self.hint = hint
        self.value = value
        self.traits = traits
        self.identifier = identifier
        self.sortPriority = sortPriority
        self.isHidden = isHidden
    }
}

/// Common accessibility configurations for standard UI patterns
public enum A11yPresets {
    public static func button(_ label: String, hint: String? = nil) -> A11yConfig {
        A11yConfig(label: label, hint: hint, traits: .isButton)
    }

    public static func link(_ label: String, hint: String? = nil) -> A11yConfig {
        A11yConfig(label: label, hint: hint, traits: .isLink)
    }

    public static func header(_ label: String) -> A11yConfig {
        A11yConfig(label: label, traits: .isHeader)
    }

    public static func image(_ description: String) -> A11yConfig {
        A11yConfig(label: description, traits: .isImage)
    }

    public static func toggle(_ label: String, isOn: Bool) -> A11yConfig {
        A11yConfig(
            label: label,
            value: isOn ? "On" : "Off",
            traits: .isButton
        )
    }

    public static func progress(_ label: String, value: Double, max: Double = 1.0) -> A11yConfig {
        let percentage = Int((value / max) * 100)
        return A11yConfig(
            label: label,
            value: "\(percentage) percent",
            traits: .updatesFrequently
        )
    }

    public static func staticText(_ label: String) -> A11yConfig {
        A11yConfig(label: label, traits: .isStaticText)
    }

    public static func searchField(_ label: String = "Search") -> A11yConfig {
        A11yConfig(label: label, traits: .isSearchField)
    }

    public static func adjustable(_ label: String, value: String, hint: String = "Swipe up or down to adjust") -> A11yConfig {
        A11yConfig(label: label, hint: hint, value: value, traits: [])
    }

    public static func tab(_ label: String, isSelected: Bool, index: Int, total: Int) -> A11yConfig {
        A11yConfig(
            label: label,
            hint: isSelected ? "Selected" : "Double tap to select",
            value: "Tab \(index + 1) of \(total)",
            traits: isSelected ? [.isSelected, .isButton] : .isButton
        )
    }

    public static func listItem(_ label: String, index: Int, total: Int) -> A11yConfig {
        A11yConfig(
            label: label,
            value: "Item \(index + 1) of \(total)"
        )
    }
}

// MARK: - VoiceOver ViewModifier

public struct A11yModifier: ViewModifier {
    let config: A11yConfig

    public func body(content: Content) -> some View {
        content
            .accessibilityLabel(config.label)
            .accessibilityHint(config.hint ?? "")
            .accessibilityValue(config.value ?? "")
            .accessibilityAddTraits(config.traits)
            .accessibilityIdentifier(config.identifier ?? "")
            .accessibilitySortPriority(config.sortPriority)
            .accessibilityHidden(config.isHidden)
    }
}

extension View {
    public func a11y(_ config: A11yConfig) -> some View {
        modifier(A11yModifier(config: config))
    }

    public func a11y(
        label: String,
        hint: String? = nil,
        value: String? = nil,
        traits: AccessibilityTraits = [],
        identifier: String? = nil
    ) -> some View {
        a11y(A11yConfig(
            label: label,
            hint: hint,
            value: value,
            traits: traits,
            identifier: identifier
        ))
    }
}

// MARK: - Dynamic Type Testing

public enum DynamicTypeSize: String, CaseIterable, Identifiable {
    case extraSmall = "Extra Small"
    case small = "Small"
    case medium = "Medium"
    case large = "Large (Default)"
    case extraLarge = "Extra Large"
    case extraExtraLarge = "XX Large"
    case extraExtraExtraLarge = "XXX Large"
    case accessibilityMedium = "Accessibility Medium"
    case accessibilityLarge = "Accessibility Large"
    case accessibilityExtraLarge = "Accessibility XL"
    case accessibilityExtraExtraLarge = "Accessibility XXL"
    case accessibilityExtraExtraExtraLarge = "Accessibility XXXL"

    public var id: String { rawValue }

    public var contentSize: ContentSizeCategory {
        switch self {
        case .extraSmall: return .extraSmall
        case .small: return .small
        case .medium: return .medium
        case .large: return .large
        case .extraLarge: return .extraLarge
        case .extraExtraLarge: return .extraExtraLarge
        case .extraExtraExtraLarge: return .extraExtraExtraLarge
        case .accessibilityMedium: return .accessibilityMedium
        case .accessibilityLarge: return .accessibilityLarge
        case .accessibilityExtraLarge: return .accessibilityExtraLarge
        case .accessibilityExtraExtraLarge: return .accessibilityExtraExtraLarge
        case .accessibilityExtraExtraExtraLarge: return .accessibilityExtraExtraExtraLarge
        }
    }

    public var swiftUISize: SwiftUI.DynamicTypeSize {
        switch self {
        case .extraSmall: return .xSmall
        case .small: return .small
        case .medium: return .medium
        case .large: return .large
        case .extraLarge: return .xLarge
        case .extraExtraLarge: return .xxLarge
        case .extraExtraExtraLarge: return .xxxLarge
        case .accessibilityMedium: return .accessibility1
        case .accessibilityLarge: return .accessibility2
        case .accessibilityExtraLarge: return .accessibility3
        case .accessibilityExtraExtraLarge: return .accessibility4
        case .accessibilityExtraExtraExtraLarge: return .accessibility5
        }
    }

    public var isAccessibilitySize: Bool {
        switch self {
        case .accessibilityMedium, .accessibilityLarge, .accessibilityExtraLarge,
             .accessibilityExtraExtraLarge, .accessibilityExtraExtraExtraLarge:
            return true
        default:
            return false
        }
    }
}

/// View modifier for testing different Dynamic Type sizes
public struct DynamicTypeTester: ViewModifier {
    @State private var selectedSize: DynamicTypeSize = .large
    @State private var showPicker = false

    public func body(content: Content) -> some View {
        content
            .dynamicTypeSize(selectedSize.swiftUISize)
            .safeAreaInset(edge: .bottom) {
                dynamicTypeControls
            }
    }

    @ViewBuilder
    private var dynamicTypeControls: some View {
        VStack(spacing: 8) {
            Button {
                showPicker.toggle()
            } label: {
                HStack {
                    Image(systemName: "textformat.size")
                    Text(selectedSize.rawValue)
                    Image(systemName: showPicker ? "chevron.up" : "chevron.down")
                }
                .font(.caption)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(.ultraThinMaterial)
                .clipShape(Capsule())
            }

            if showPicker {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 4) {
                        ForEach(DynamicTypeSize.allCases) { size in
                            Button {
                                selectedSize = size
                            } label: {
                                Text(size.rawValue)
                                    .font(.caption2)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(selectedSize == size ? Color.accentColor : Color.secondary.opacity(0.2))
                                    .foregroundStyle(selectedSize == size ? .white : .primary)
                                    .clipShape(Capsule())
                            }
                        }
                    }
                    .padding(.horizontal)
                }
                .frame(height: 32)
                .background(.ultraThinMaterial)
            }
        }
        .padding(.bottom, 8)
    }
}

extension View {
    public func dynamicTypeTester() -> some View {
        modifier(DynamicTypeTester())
    }
}

// MARK: - Reduce Motion Alternatives

@MainActor
@Observable
public final class MotionPreferences: Sendable {
    public static let shared = MotionPreferences()

    public var prefersReducedMotion: Bool {
        UIAccessibility.isReduceMotionEnabled
    }

    public var prefersReducedTransparency: Bool {
        UIAccessibility.isReduceTransparencyEnabled
    }

    public var shouldAutoplayAnimations: Bool {
        !UIAccessibility.isVideoAutoplayEnabled
    }

    private init() {}
}

/// Wrapper for animations that respects Reduce Motion
public struct ReducedMotionAnimation {
    public let standard: Animation
    public let reduced: Animation?

    public init(standard: Animation, reduced: Animation? = nil) {
        self.standard = standard
        self.reduced = reduced
    }

    public var resolved: Animation? {
        if UIAccessibility.isReduceMotionEnabled {
            return reduced
        }
        return standard
    }

    public static let spring = ReducedMotionAnimation(
        standard: .spring(response: 0.35, dampingFraction: 0.7),
        reduced: .easeInOut(duration: 0.15)
    )

    public static let bouncy = ReducedMotionAnimation(
        standard: .bouncy,
        reduced: .easeInOut(duration: 0.1)
    )

    public static let smooth = ReducedMotionAnimation(
        standard: .smooth(duration: 0.3),
        reduced: .linear(duration: 0.1)
    )

    public static func custom(duration: Double) -> ReducedMotionAnimation {
        ReducedMotionAnimation(
            standard: .easeInOut(duration: duration),
            reduced: .linear(duration: min(duration * 0.3, 0.15))
        )
    }

    public static let none = ReducedMotionAnimation(
        standard: .default,
        reduced: nil
    )
}

public struct ReducedMotionModifier: ViewModifier {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let standardView: AnyView
    let reducedView: AnyView?

    public func body(content: Content) -> some View {
        if reduceMotion, let reducedView {
            reducedView
        } else {
            standardView
        }
    }
}

extension View {
    public func withReducedMotion<V: View>(@ViewBuilder reduced: () -> V) -> some View {
        modifier(ReducedMotionModifier(
            standardView: AnyView(self),
            reducedView: AnyView(reduced())
        ))
    }

    public func animation(_ motion: ReducedMotionAnimation, value: some Equatable) -> some View {
        animation(motion.resolved, value: value)
    }

    public func withAnimation(_ motion: ReducedMotionAnimation, _ body: () -> Void) {
        withAnimation(motion.resolved, body)
    }
}

// MARK: - Haptic Feedback Manager

@MainActor
public final class HapticManager {
    public static let shared = HapticManager()

    private let impactLight = UIImpactFeedbackGenerator(style: .light)
    private let impactMedium = UIImpactFeedbackGenerator(style: .medium)
    private let impactHeavy = UIImpactFeedbackGenerator(style: .heavy)
    private let impactSoft = UIImpactFeedbackGenerator(style: .soft)
    private let impactRigid = UIImpactFeedbackGenerator(style: .rigid)
    private let selection = UISelectionFeedbackGenerator()
    private let notification = UINotificationFeedbackGenerator()

    private init() {
        prepareAll()
    }

    public func prepareAll() {
        impactLight.prepare()
        impactMedium.prepare()
        impactHeavy.prepare()
        impactSoft.prepare()
        impactRigid.prepare()
        selection.prepare()
        notification.prepare()
    }

    // MARK: - Impact Patterns

    public func impact(_ style: UIImpactFeedbackGenerator.FeedbackStyle, intensity: CGFloat = 1.0) {
        let generator: UIImpactFeedbackGenerator
        switch style {
        case .light:
            generator = impactLight
        case .medium:
            generator = impactMedium
        case .heavy:
            generator = impactHeavy
        case .soft:
            generator = impactSoft
        case .rigid:
            generator = impactRigid
        @unknown default:
            generator = impactMedium
        }
        generator.impactOccurred(intensity: intensity)
    }

    public func light(intensity: CGFloat = 1.0) {
        impactLight.impactOccurred(intensity: intensity)
    }

    public func medium(intensity: CGFloat = 1.0) {
        impactMedium.impactOccurred(intensity: intensity)
    }

    public func heavy(intensity: CGFloat = 1.0) {
        impactHeavy.impactOccurred(intensity: intensity)
    }

    public func soft(intensity: CGFloat = 1.0) {
        impactSoft.impactOccurred(intensity: intensity)
    }

    public func rigid(intensity: CGFloat = 1.0) {
        impactRigid.impactOccurred(intensity: intensity)
    }

    // MARK: - Selection

    public func selectionChanged() {
        selection.selectionChanged()
    }

    // MARK: - Notification

    public func notification(_ type: UINotificationFeedbackGenerator.FeedbackType) {
        notification.notificationOccurred(type)
    }

    public func success() {
        notification.notificationOccurred(.success)
    }

    public func warning() {
        notification.notificationOccurred(.warning)
    }

    public func error() {
        notification.notificationOccurred(.error)
    }

    // MARK: - Compound Patterns

    public func doubleTap() {
        light()
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(50))
            light(intensity: 0.7)
        }
    }

    public func tick() {
        soft(intensity: 0.5)
    }

    public func confirm() {
        medium()
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(100))
            success()
        }
    }

    public func swipeAction() {
        rigid(intensity: 0.8)
    }

    public func toggle(isOn: Bool) {
        if isOn {
            rigid(intensity: 0.6)
        } else {
            soft(intensity: 0.4)
        }
    }

    public func slider(at position: CGFloat) {
        let intensity = max(0.3, min(1.0, position))
        soft(intensity: intensity)
    }

    public func pageChange() {
        medium(intensity: 0.5)
    }

    public func refresh() {
        Task { @MainActor in
            light()
            try? await Task.sleep(for: .milliseconds(80))
            medium(intensity: 0.7)
        }
    }
}

// MARK: - Haptic Feedback ViewModifier

public struct HapticButtonStyle: ButtonStyle {
    let haptic: HapticPattern

    public enum HapticPattern {
        case light
        case medium
        case heavy
        case soft
        case rigid
        case selection
        case success
        case warning
        case error
        case doubleTap
        case custom(() -> Void)
    }

    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
            .onChange(of: configuration.isPressed) { _, isPressed in
                if isPressed {
                    triggerHaptic()
                }
            }
    }

    @MainActor
    private func triggerHaptic() {
        switch haptic {
        case .light: HapticManager.shared.light()
        case .medium: HapticManager.shared.medium()
        case .heavy: HapticManager.shared.heavy()
        case .soft: HapticManager.shared.soft()
        case .rigid: HapticManager.shared.rigid()
        case .selection: HapticManager.shared.selectionChanged()
        case .success: HapticManager.shared.success()
        case .warning: HapticManager.shared.warning()
        case .error: HapticManager.shared.error()
        case .doubleTap: HapticManager.shared.doubleTap()
        case .custom(let action): action()
        }
    }
}

extension View {
    public func hapticFeedback(_ pattern: HapticButtonStyle.HapticPattern = .light) -> some View {
        buttonStyle(HapticButtonStyle(haptic: pattern))
    }
}

// MARK: - Focus Management

@MainActor
@Observable
public final class FocusManager {
    public var currentFocus: String?
    public var focusHistory: [String] = []

    public init() {}

    public func setFocus(_ identifier: String) {
        if let current = currentFocus {
            focusHistory.append(current)
        }
        currentFocus = identifier
        UIAccessibility.post(notification: .layoutChanged, argument: nil)
    }

    public func clearFocus() {
        if let current = currentFocus {
            focusHistory.append(current)
        }
        currentFocus = nil
    }

    public func restorePreviousFocus() {
        guard let previous = focusHistory.popLast() else { return }
        currentFocus = previous
    }

    public func announceForVoiceOver(_ message: String, delay: Duration = .zero) {
        if delay > .zero {
            Task { @MainActor in
                try? await Task.sleep(for: delay)
                UIAccessibility.post(notification: .announcement, argument: message)
            }
        } else {
            UIAccessibility.post(notification: .announcement, argument: message)
        }
    }

    public func notifyScreenChanged() {
        UIAccessibility.post(notification: .screenChanged, argument: nil)
    }

    public func notifyLayoutChanged(_ element: Any? = nil) {
        UIAccessibility.post(notification: .layoutChanged, argument: element)
    }
}

/// Environment key for focus management
public struct FocusManagerKey: EnvironmentKey {
    public static let defaultValue = FocusManager()
}

extension EnvironmentValues {
    public var focusManager: FocusManager {
        get { self[FocusManagerKey.self] }
        set { self[FocusManagerKey.self] = newValue }
    }
}

// MARK: - Accessibility Containers

public struct A11yContainer<Content: View>: View {
    let label: String
    let hint: String?
    let content: Content

    public init(
        label: String,
        hint: String? = nil,
        @ViewBuilder content: () -> Content
    ) {
        self.label = label
        self.hint = hint
        self.content = content()
    }

    public var body: some View {
        content
            .accessibilityElement(children: .contain)
            .accessibilityLabel(label)
            .accessibilityHint(hint ?? "")
    }
}

public struct A11yCombinedElement<Content: View>: View {
    let label: String
    let hint: String?
    let traits: AccessibilityTraits
    let content: Content

    public init(
        label: String,
        hint: String? = nil,
        traits: AccessibilityTraits = [],
        @ViewBuilder content: () -> Content
    ) {
        self.label = label
        self.hint = hint
        self.traits = traits
        self.content = content()
    }

    public var body: some View {
        content
            .accessibilityElement(children: .combine)
            .accessibilityLabel(label)
            .accessibilityHint(hint ?? "")
            .accessibilityAddTraits(traits)
    }
}

public struct A11yIgnoredContainer<Content: View>: View {
    let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        content
            .accessibilityElement(children: .ignore)
            .accessibilityHidden(true)
    }
}

// MARK: - Semantic Grouping

public struct SemanticGroup<Content: View>: View {
    let role: SemanticRole
    let label: String
    let content: Content

    public enum SemanticRole {
        case navigation
        case main
        case header
        case footer
        case form
        case list
        case article
        case section
        case complementary
    }

    public init(
        role: SemanticRole,
        label: String,
        @ViewBuilder content: () -> Content
    ) {
        self.role = role
        self.label = label
        self.content = content()
    }

    public var body: some View {
        content
            .accessibilityElement(children: .contain)
            .accessibilityLabel(label)
            .accessibilityAddTraits(role.traits)
    }
}

extension SemanticGroup.SemanticRole {
    var traits: AccessibilityTraits {
        switch self {
        case .navigation: return []
        case .main: return []
        case .header: return .isHeader
        case .footer: return []
        case .form: return []
        case .list: return []
        case .article: return []
        case .section: return []
        case .complementary: return []
        }
    }
}

// MARK: - Custom Rotor Actions

public struct A11yRotorEntry: Identifiable, Hashable {
    public let id: String
    public let label: String
    public let textRange: Range<String.Index>?

    public init(id: String, label: String, textRange: Range<String.Index>? = nil) {
        self.id = id
        self.label = label
        self.textRange = textRange
    }

    public func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    public static func == (lhs: A11yRotorEntry, rhs: A11yRotorEntry) -> Bool {
        lhs.id == rhs.id
    }
}

public struct A11yRotorModifier<ID: Hashable>: ViewModifier {
    let name: String
    let entries: [A11yRotorEntry]
    let currentID: Binding<ID?>

    public func body(content: Content) -> some View {
        content
            .accessibilityRotor(name) {
                ForEach(entries) { entry in
                    AccessibilityRotorEntry(entry.label, id: entry.id)
                }
            }
    }
}

extension View {
    public func a11yRotor<ID: Hashable>(
        _ name: String,
        entries: [A11yRotorEntry],
        currentID: Binding<ID?>
    ) -> some View {
        modifier(A11yRotorModifier(name: name, entries: entries, currentID: currentID))
    }

    public func a11yRotorHeadings<Data: RandomAccessCollection>(
        _ data: Data,
        id: KeyPath<Data.Element, String>,
        label: KeyPath<Data.Element, String>
    ) -> some View where Data.Element: Identifiable {
        let entries = data.map { element in
            A11yRotorEntry(id: element[keyPath: id], label: element[keyPath: label])
        }
        return accessibilityRotor("Headings") {
            ForEach(entries) { entry in
                AccessibilityRotorEntry(entry.label, id: entry.id)
            }
        }
    }

    public func a11yRotorLinks<Data: RandomAccessCollection>(
        _ data: Data,
        id: KeyPath<Data.Element, String>,
        label: KeyPath<Data.Element, String>
    ) -> some View where Data.Element: Identifiable {
        let entries = data.map { element in
            A11yRotorEntry(id: element[keyPath: id], label: element[keyPath: label])
        }
        return accessibilityRotor("Links") {
            ForEach(entries) { entry in
                AccessibilityRotorEntry(entry.label, id: entry.id)
            }
        }
    }
}

// MARK: - Adjustable Action Support

public struct A11yAdjustableModifier: ViewModifier {
    let value: Binding<Int>
    let range: ClosedRange<Int>
    let step: Int
    let label: (Int) -> String

    public func body(content: Content) -> some View {
        content
            .accessibilityValue(label(value.wrappedValue))
            .accessibilityAdjustableAction { direction in
                switch direction {
                case .increment:
                    let newValue = min(value.wrappedValue + step, range.upperBound)
                    value.wrappedValue = newValue
                case .decrement:
                    let newValue = max(value.wrappedValue - step, range.lowerBound)
                    value.wrappedValue = newValue
                @unknown default:
                    break
                }
            }
    }
}

extension View {
    public func a11yAdjustable(
        value: Binding<Int>,
        range: ClosedRange<Int>,
        step: Int = 1,
        label: @escaping (Int) -> String = { "\($0)" }
    ) -> some View {
        modifier(A11yAdjustableModifier(value: value, range: range, step: step, label: label))
    }
}

// MARK: - Accessibility Actions

public struct A11yActionsModifier: ViewModifier {
    let actions: [(name: String, action: () -> Void)]

    public func body(content: Content) -> some View {
        var view = AnyView(content)
        for (name, action) in actions {
            view = AnyView(view.accessibilityAction(named: name, action))
        }
        return view
    }
}

extension View {
    public func a11yActions(_ actions: [(name: String, action: () -> Void)]) -> some View {
        modifier(A11yActionsModifier(actions: actions))
    }

    public func a11yAction(_ name: String, _ action: @escaping () -> Void) -> some View {
        accessibilityAction(named: name, action)
    }

    public func a11yDeleteAction(_ action: @escaping () -> Void) -> some View {
        accessibilityAction(.delete, action)
    }

    public func a11yEscapeAction(_ action: @escaping () -> Bool) -> some View {
        accessibilityAction(.escape) {
            _ = action()
        }
    }
}
