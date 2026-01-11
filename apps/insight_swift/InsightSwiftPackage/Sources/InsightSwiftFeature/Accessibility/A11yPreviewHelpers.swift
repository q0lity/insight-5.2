import SwiftUI

// MARK: - A11y Preview Environment Modifiers

/// Preview wrapper for testing accessibility configurations
public struct A11yPreviewContainer<Content: View>: View {
    @State private var showA11yOverlay = false
    @State private var selectedDynamicType: DynamicTypeSize = .large
    @State private var reduceMotion = false
    @State private var reduceTransparency = false
    @State private var differentiateWithoutColor = false
    @State private var increaseContrast = false
    @State private var invertColors = false
    @State private var boldText = false

    let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        content
            .dynamicTypeSize(selectedDynamicType.swiftUISize)
            .environment(\.accessibilityReduceMotion, reduceMotion)
            .environment(\.accessibilityReduceTransparency, reduceTransparency)
            .environment(\.accessibilityDifferentiateWithoutColor, differentiateWithoutColor)
            .environment(\.accessibilityInvertColors, invertColors)
            .environment(\.legibilityWeight, boldText ? .bold : .regular)
            .overlay(alignment: .topTrailing) {
                a11yControlsButton
            }
            .sheet(isPresented: $showA11yOverlay) {
                a11yControlsSheet
            }
    }

    @ViewBuilder
    private var a11yControlsButton: some View {
        Button {
            showA11yOverlay = true
        } label: {
            Image(systemName: "accessibility")
                .font(.title2)
                .padding(8)
                .background(.ultraThinMaterial)
                .clipShape(Circle())
        }
        .padding()
    }

    @ViewBuilder
    private var a11yControlsSheet: some View {
        NavigationStack {
            Form {
                Section("Dynamic Type") {
                    Picker("Text Size", selection: $selectedDynamicType) {
                        ForEach(DynamicTypeSize.allCases) { size in
                            Text(size.rawValue).tag(size)
                        }
                    }
                }

                Section("Motion & Transparency") {
                    Toggle("Reduce Motion", isOn: $reduceMotion)
                    Toggle("Reduce Transparency", isOn: $reduceTransparency)
                }

                Section("Color & Contrast") {
                    Toggle("Differentiate Without Color", isOn: $differentiateWithoutColor)
                    Toggle("Increase Contrast", isOn: $increaseContrast)
                    Toggle("Invert Colors", isOn: $invertColors)
                }

                Section("Text") {
                    Toggle("Bold Text", isOn: $boldText)
                }
            }
            .navigationTitle("A11y Testing")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        showA11yOverlay = false
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}

// MARK: - Preview Trait Collections

public struct A11yPreviewTrait: PreviewModifier {
    public enum TraitType {
        case dynamicType(DynamicTypeSize)
        case reduceMotion
        case reduceTransparency
        case differentiateWithoutColor
        case invertColors
        case boldText
        case darkMode
        case lightMode
        case largestAccessibilitySize

        var displayName: String {
            switch self {
            case .dynamicType(let size): return size.rawValue
            case .reduceMotion: return "Reduce Motion"
            case .reduceTransparency: return "Reduce Transparency"
            case .differentiateWithoutColor: return "No Color Differentiation"
            case .invertColors: return "Inverted Colors"
            case .boldText: return "Bold Text"
            case .darkMode: return "Dark Mode"
            case .lightMode: return "Light Mode"
            case .largestAccessibilitySize: return "XXXL Accessibility"
            }
        }
    }

    let trait: TraitType

    public init(_ trait: TraitType) {
        self.trait = trait
    }

    public static func makeSharedContext() async throws -> Void {}

    public func body(content: Content, context: Void) -> some View {
        switch trait {
        case .dynamicType(let size):
            content.dynamicTypeSize(size.swiftUISize)
        case .reduceMotion:
            content.environment(\.accessibilityReduceMotion, true)
        case .reduceTransparency:
            content.environment(\.accessibilityReduceTransparency, true)
        case .differentiateWithoutColor:
            content.environment(\.accessibilityDifferentiateWithoutColor, true)
        case .invertColors:
            content.environment(\.accessibilityInvertColors, true)
        case .boldText:
            content.environment(\.legibilityWeight, .bold)
        case .darkMode:
            content.preferredColorScheme(.dark)
        case .lightMode:
            content.preferredColorScheme(.light)
        case .largestAccessibilitySize:
            content.dynamicTypeSize(.accessibility5)
        }
    }
}

extension PreviewTrait where T == Preview.ViewTraits {
    public static var a11yReduceMotion: PreviewTrait<Preview.ViewTraits> {
        .modifier(A11yPreviewTrait(.reduceMotion))
    }

    public static var a11yReduceTransparency: PreviewTrait<Preview.ViewTraits> {
        .modifier(A11yPreviewTrait(.reduceTransparency))
    }

    public static var a11yDifferentiateWithoutColor: PreviewTrait<Preview.ViewTraits> {
        .modifier(A11yPreviewTrait(.differentiateWithoutColor))
    }

    public static var a11yInvertColors: PreviewTrait<Preview.ViewTraits> {
        .modifier(A11yPreviewTrait(.invertColors))
    }

    public static var a11yBoldText: PreviewTrait<Preview.ViewTraits> {
        .modifier(A11yPreviewTrait(.boldText))
    }

    public static var a11yLargestText: PreviewTrait<Preview.ViewTraits> {
        .modifier(A11yPreviewTrait(.largestAccessibilitySize))
    }

    public static func a11yDynamicType(_ size: DynamicTypeSize) -> PreviewTrait<Preview.ViewTraits> {
        .modifier(A11yPreviewTrait(.dynamicType(size)))
    }
}

// MARK: - Grid Preview for Multiple Configurations

public struct A11yPreviewGrid<Content: View>: View {
    let configurations: [A11yPreviewTrait.TraitType]
    let content: Content

    public init(
        configurations: [A11yPreviewTrait.TraitType] = [
            .lightMode,
            .darkMode,
            .dynamicType(.extraSmall),
            .dynamicType(.accessibilityExtraExtraExtraLarge),
            .reduceMotion,
            .boldText
        ],
        @ViewBuilder content: () -> Content
    ) {
        self.configurations = configurations
        self.content = content()
    }

    public var body: some View {
        ScrollView {
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                ForEach(Array(configurations.enumerated()), id: \.offset) { index, config in
                    VStack(spacing: 8) {
                        Text(config.displayName)
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        applyTrait(config, to: content)
                            .frame(height: 200)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .overlay {
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.secondary.opacity(0.3), lineWidth: 1)
                            }
                    }
                }
            }
            .padding()
        }
    }

    @ViewBuilder
    private func applyTrait(_ trait: A11yPreviewTrait.TraitType, to view: Content) -> some View {
        switch trait {
        case .dynamicType(let size):
            view.dynamicTypeSize(size.swiftUISize)
        case .reduceMotion:
            view.environment(\.accessibilityReduceMotion, true)
        case .reduceTransparency:
            view.environment(\.accessibilityReduceTransparency, true)
        case .differentiateWithoutColor:
            view.environment(\.accessibilityDifferentiateWithoutColor, true)
        case .invertColors:
            view.environment(\.accessibilityInvertColors, true)
        case .boldText:
            view.environment(\.legibilityWeight, .bold)
        case .darkMode:
            view.preferredColorScheme(.dark)
        case .lightMode:
            view.preferredColorScheme(.light)
        case .largestAccessibilitySize:
            view.dynamicTypeSize(.accessibility5)
        }
    }
}

// MARK: - VoiceOver Simulation Overlay

public struct VoiceOverSimulator<Content: View>: View {
    @State private var isEnabled = false
    @State private var currentElement: String?
    @State private var elements: [String] = []
    @State private var currentIndex = 0

    let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        content
            .overlay(alignment: .bottom) {
                if isEnabled {
                    voiceOverPanel
                }
            }
            .safeAreaInset(edge: .bottom) {
                voiceOverToggle
            }
    }

    @ViewBuilder
    private var voiceOverToggle: some View {
        Button {
            isEnabled.toggle()
        } label: {
            HStack {
                Image(systemName: isEnabled ? "speaker.wave.3.fill" : "speaker.slash.fill")
                Text(isEnabled ? "VoiceOver On" : "VoiceOver Off")
            }
            .font(.caption)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(isEnabled ? Color.blue : Color.secondary.opacity(0.3))
            .foregroundStyle(isEnabled ? .white : .primary)
            .clipShape(Capsule())
        }
        .padding(.bottom, 8)
    }

    @ViewBuilder
    private var voiceOverPanel: some View {
        VStack(spacing: 12) {
            if let element = currentElement {
                Text(element)
                    .font(.headline)
                    .multilineTextAlignment(.center)
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(.ultraThinMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }

            HStack(spacing: 24) {
                Button {
                    navigatePrevious()
                } label: {
                    Image(systemName: "chevron.left.circle.fill")
                        .font(.title)
                }

                Button {
                    activateElement()
                } label: {
                    Image(systemName: "hand.tap.fill")
                        .font(.title)
                }

                Button {
                    navigateNext()
                } label: {
                    Image(systemName: "chevron.right.circle.fill")
                        .font(.title)
                }
            }
            .foregroundStyle(.primary)
        }
        .padding()
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .padding()
    }

    private func navigateNext() {
        guard !elements.isEmpty else { return }
        currentIndex = (currentIndex + 1) % elements.count
        currentElement = elements[currentIndex]
        HapticManager.shared.selectionChanged()
    }

    private func navigatePrevious() {
        guard !elements.isEmpty else { return }
        currentIndex = currentIndex > 0 ? currentIndex - 1 : elements.count - 1
        currentElement = elements[currentIndex]
        HapticManager.shared.selectionChanged()
    }

    private func activateElement() {
        HapticManager.shared.medium()
    }
}

// MARK: - Accessibility Audit Helper

public struct A11yAuditView: View {
    @State private var auditResults: [AuditResult] = []
    @State private var isRunning = false

    public struct AuditResult: Identifiable {
        public let id = UUID()
        public let category: Category
        public let severity: Severity
        public let message: String
        public let suggestion: String

        public enum Category: String {
            case labels = "Labels"
            case hints = "Hints"
            case traits = "Traits"
            case contrast = "Contrast"
            case touchTargets = "Touch Targets"
            case dynamicType = "Dynamic Type"
            case motion = "Motion"
        }

        public enum Severity: String {
            case critical = "Critical"
            case warning = "Warning"
            case suggestion = "Suggestion"

            var color: Color {
                switch self {
                case .critical: return .red
                case .warning: return .orange
                case .suggestion: return .blue
                }
            }

            var icon: String {
                switch self {
                case .critical: return "xmark.octagon.fill"
                case .warning: return "exclamationmark.triangle.fill"
                case .suggestion: return "lightbulb.fill"
                }
            }
        }
    }

    public init() {}

    public var body: some View {
        NavigationStack {
            List {
                Section {
                    Button {
                        runAudit()
                    } label: {
                        HStack {
                            Image(systemName: "checkmark.shield")
                            Text("Run Accessibility Audit")
                        }
                    }
                    .disabled(isRunning)
                }

                if !auditResults.isEmpty {
                    Section("Results (\(auditResults.count))") {
                        ForEach(auditResults) { result in
                            auditResultRow(result)
                        }
                    }
                }
            }
            .navigationTitle("A11y Audit")
            .overlay {
                if isRunning {
                    ProgressView("Scanning...")
                        .padding()
                        .background(.ultraThinMaterial)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
        }
    }

    @ViewBuilder
    private func auditResultRow(_ result: AuditResult) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: result.severity.icon)
                    .foregroundStyle(result.severity.color)
                Text(result.category.rawValue)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
                Text(result.severity.rawValue)
                    .font(.caption2)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(result.severity.color.opacity(0.2))
                    .clipShape(Capsule())
            }

            Text(result.message)
                .font(.subheadline)

            Text(result.suggestion)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }

    private func runAudit() {
        isRunning = true
        auditResults = []

        Task { @MainActor in
            try? await Task.sleep(for: .seconds(1))

            auditResults = [
                AuditResult(
                    category: .labels,
                    severity: .suggestion,
                    message: "Consider adding more descriptive labels to interactive elements",
                    suggestion: "Use .accessibilityLabel() to provide context"
                ),
                AuditResult(
                    category: .touchTargets,
                    severity: .suggestion,
                    message: "Ensure touch targets are at least 44x44 points",
                    suggestion: "Use .frame(minWidth: 44, minHeight: 44)"
                ),
                AuditResult(
                    category: .dynamicType,
                    severity: .suggestion,
                    message: "Test with larger text sizes",
                    suggestion: "Use .dynamicTypeSize() in previews to test"
                )
            ]

            isRunning = false
        }
    }
}

// MARK: - View Extension for Preview Testing

extension View {
    public func a11yPreview() -> some View {
        A11yPreviewContainer { self }
    }

    public func voiceOverSimulator() -> some View {
        VoiceOverSimulator { self }
    }

    public func a11yPreviewGrid(configurations: [A11yPreviewTrait.TraitType] = [
        .lightMode,
        .darkMode,
        .dynamicType(.extraSmall),
        .dynamicType(.accessibilityExtraExtraExtraLarge),
        .reduceMotion,
        .boldText
    ]) -> some View {
        A11yPreviewGrid(configurations: configurations) { self }
    }
}
