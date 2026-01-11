import SwiftUI

// MARK: - Typography Semantic Levels

/// All 12 Apple Dynamic Type text styles mapped to semantic levels.
/// Each level has optimized sizing, weight, and line height for its purpose.
public enum TypographyLevel: String, CaseIterable, Sendable {
    // Display - Large marketing/hero text
    case largeTitle      // 34pt - Hero headers, splash screens
    case title1          // 28pt - Primary screen titles
    case title2          // 22pt - Section headers
    case title3          // 20pt - Subsection headers

    // Body - Standard readable content
    case headline        // 17pt semibold - List row titles, emphasis
    case body            // 17pt - Primary content, paragraphs
    case callout         // 16pt - Secondary content, descriptions
    case subheadline     // 15pt - Supporting text, metadata

    // Caption - Small supplementary text
    case footnote        // 13pt - Tertiary info, timestamps
    case caption1        // 12pt - Labels, small details
    case caption2        // 11pt - Fine print, badges

    // Utility
    case extraSmall      // 10pt - Minimal UI elements (custom)

    /// The corresponding SwiftUI Font.TextStyle
    public var textStyle: Font.TextStyle {
        switch self {
        case .largeTitle: return .largeTitle
        case .title1: return .title
        case .title2: return .title2
        case .title3: return .title3
        case .headline: return .headline
        case .body: return .body
        case .callout: return .callout
        case .subheadline: return .subheadline
        case .footnote: return .footnote
        case .caption1: return .caption
        case .caption2: return .caption2
        case .extraSmall: return .caption2
        }
    }

    /// Base point size (before Dynamic Type scaling)
    public var baseSize: CGFloat {
        switch self {
        case .largeTitle: return 34
        case .title1: return 28
        case .title2: return 22
        case .title3: return 20
        case .headline: return 17
        case .body: return 17
        case .callout: return 16
        case .subheadline: return 15
        case .footnote: return 13
        case .caption1: return 12
        case .caption2: return 11
        case .extraSmall: return 10
        }
    }

    /// Default font weight for this level
    public var defaultWeight: InsightFontWeight {
        switch self {
        case .largeTitle, .title1: return .bold
        case .title2, .title3, .headline: return .semibold
        case .body, .callout, .subheadline: return .regular
        case .footnote, .caption1, .caption2, .extraSmall: return .regular
        }
    }

    /// Line height multiplier (relative to font size)
    public var lineHeightRatio: CGFloat {
        switch self {
        case .largeTitle, .title1: return 1.2      // Tight for display
        case .title2, .title3: return 1.25
        case .headline, .body: return 1.4          // Comfortable reading
        case .callout, .subheadline: return 1.35
        case .footnote, .caption1, .caption2, .extraSmall: return 1.3
        }
    }

    /// Letter spacing (tracking) in points
    public var tracking: CGFloat {
        switch self {
        case .largeTitle: return -0.5              // Slightly tighter for large text
        case .title1, .title2: return -0.3
        case .title3, .headline: return 0
        case .body, .callout, .subheadline: return 0
        case .footnote, .caption1: return 0.2      // Slightly looser for small text
        case .caption2, .extraSmall: return 0.3
        }
    }

    /// Paragraph spacing multiplier (relative to line height)
    public var paragraphSpacingRatio: CGFloat {
        switch self {
        case .largeTitle, .title1, .title2, .title3: return 0.5
        case .headline, .body, .callout: return 0.75
        case .subheadline, .footnote, .caption1, .caption2, .extraSmall: return 0.5
        }
    }
}

// MARK: - Font Weight Hierarchy

/// Semantic font weights mapped to system values.
/// Use these for consistent weight application across the app.
public enum InsightFontWeight: String, CaseIterable, Sendable {
    case ultraLight
    case thin
    case light
    case regular
    case medium
    case semibold
    case bold
    case heavy
    case black

    public var swiftUIWeight: Font.Weight {
        switch self {
        case .ultraLight: return .ultraLight
        case .thin: return .thin
        case .light: return .light
        case .regular: return .regular
        case .medium: return .medium
        case .semibold: return .semibold
        case .bold: return .bold
        case .heavy: return .heavy
        case .black: return .black
        }
    }

    public var uiFontWeight: UIFont.Weight {
        switch self {
        case .ultraLight: return .ultraLight
        case .thin: return .thin
        case .light: return .light
        case .regular: return .regular
        case .medium: return .medium
        case .semibold: return .semibold
        case .bold: return .bold
        case .heavy: return .heavy
        case .black: return .black
        }
    }

    /// Font name suffix for custom fonts
    public var fontSuffix: String {
        switch self {
        case .ultraLight: return "ExtraLight"
        case .thin: return "Thin"
        case .light: return "Light"
        case .regular: return "Regular"
        case .medium: return "Medium"
        case .semibold: return "SemiBold"
        case .bold: return "Bold"
        case .heavy: return "ExtraBold"
        case .black: return "Black"
        }
    }
}

// MARK: - Custom Font Families

/// Supported custom font families.
/// Each family maps to specific font file names.
public enum InsightFontFamily: String, CaseIterable, Sendable {
    case system     // SF Pro (system default)
    case figtree    // Figtree - Modern geometric sans
    case inter      // Inter - Highly legible UI font
    case sfPro      // SF Pro - Apple's system font (explicit)

    /// Font family name for UIFont
    public var familyName: String {
        switch self {
        case .system, .sfPro: return ".AppleSystemUIFont"
        case .figtree: return "Figtree"
        case .inter: return "Inter"
        }
    }

    /// Gets the full font name for a given weight
    public func fontName(weight: InsightFontWeight) -> String? {
        switch self {
        case .system, .sfPro:
            return nil // Use system font APIs
        case .figtree:
            return "Figtree-\(weight.fontSuffix)"
        case .inter:
            return "Inter-\(weight.fontSuffix)"
        }
    }

    /// Available font weights for this family
    public var availableWeights: [InsightFontWeight] {
        switch self {
        case .system, .sfPro:
            return InsightFontWeight.allCases
        case .figtree, .inter:
            // Most variable fonts support these weights
            return [.light, .regular, .medium, .semibold, .bold, .heavy, .black]
        }
    }
}

// MARK: - Typography Configuration

/// Main typography configuration for the app.
/// Provides consistent font creation with Dynamic Type support.
public struct InsightTypography: Sendable {
    public let family: InsightFontFamily
    public let monoFamily: InsightFontFamily

    public init(
        family: InsightFontFamily = .system,
        monoFamily: InsightFontFamily = .system
    ) {
        self.family = family
        self.monoFamily = monoFamily
    }

    /// Creates a font for the given typography level with Dynamic Type scaling.
    public func font(
        _ level: TypographyLevel,
        weight: InsightFontWeight? = nil,
        design: Font.Design = .default
    ) -> Font {
        let actualWeight = weight ?? level.defaultWeight

        if family == .system || family == .sfPro {
            return Font.system(level.textStyle, design: design, weight: actualWeight.swiftUIWeight)
        }

        // Custom font with relative scaling
        if let fontName = family.fontName(weight: actualWeight) {
            return Font.custom(fontName, size: level.baseSize, relativeTo: level.textStyle)
        }

        // Fallback to system
        return Font.system(level.textStyle, design: design, weight: actualWeight.swiftUIWeight)
    }

    /// Creates a fixed-size font (no Dynamic Type scaling).
    /// Use sparingly - prefer scaled fonts for accessibility.
    public func fixedFont(
        size: CGFloat,
        weight: InsightFontWeight = .regular,
        design: Font.Design = .default
    ) -> Font {
        if family == .system || family == .sfPro {
            return Font.system(size: size, weight: weight.swiftUIWeight, design: design)
        }

        if let fontName = family.fontName(weight: weight) {
            return Font.custom(fontName, fixedSize: size)
        }

        return Font.system(size: size, weight: weight.swiftUIWeight, design: design)
    }

    /// Creates a monospace font for code/data display.
    public func monoFont(
        _ level: TypographyLevel,
        weight: InsightFontWeight? = nil
    ) -> Font {
        let actualWeight = weight ?? level.defaultWeight
        return Font.system(level.textStyle, design: .monospaced, weight: actualWeight.swiftUIWeight)
    }
}

// MARK: - Typography Environment

/// Environment key for typography configuration
private struct TypographyKey: EnvironmentKey {
    static let defaultValue = InsightTypography()
}

public extension EnvironmentValues {
    var typography: InsightTypography {
        get { self[TypographyKey.self] }
        set { self[TypographyKey.self] = newValue }
    }
}

// MARK: - Font Extension for Easy Access

public extension Font {
    /// Creates a font using Insight typography levels with Dynamic Type support.
    static func insight(
        _ level: TypographyLevel,
        weight: InsightFontWeight? = nil,
        family: InsightFontFamily = .system
    ) -> Font {
        let typography = InsightTypography(family: family)
        return typography.font(level, weight: weight)
    }

    /// Creates a display font (large titles, hero text).
    static func insightDisplay(_ size: TypographyLevel = .largeTitle, weight: InsightFontWeight = .bold) -> Font {
        .insight(size, weight: weight)
    }

    /// Creates a title font (section headers).
    static func insightTitle(_ size: TypographyLevel = .title2, weight: InsightFontWeight = .semibold) -> Font {
        .insight(size, weight: weight)
    }

    /// Creates a body font (readable content).
    static func insightBody(_ size: TypographyLevel = .body, weight: InsightFontWeight = .regular) -> Font {
        .insight(size, weight: weight)
    }

    /// Creates a caption font (small labels).
    static func insightCaption(_ size: TypographyLevel = .caption1, weight: InsightFontWeight = .regular) -> Font {
        .insight(size, weight: weight)
    }

    /// Creates a monospace font for code/data.
    static func insightMono(_ level: TypographyLevel = .body) -> Font {
        .system(level.textStyle, design: .monospaced)
    }
}

// MARK: - Scaled Metrics

/// Provides @ScaledMetric-compatible values for typography-aware sizing.
public struct TypographyMetrics {
    @ScaledMetric(relativeTo: .body) public var bodyLineHeight: CGFloat = 24
    @ScaledMetric(relativeTo: .caption) public var captionLineHeight: CGFloat = 16
    @ScaledMetric(relativeTo: .title) public var titleLineHeight: CGFloat = 34
    @ScaledMetric(relativeTo: .largeTitle) public var largeTitleLineHeight: CGFloat = 41

    @ScaledMetric(relativeTo: .body) public var paragraphSpacing: CGFloat = 16
    @ScaledMetric(relativeTo: .body) public var listItemSpacing: CGFloat = 8
    @ScaledMetric(relativeTo: .caption) public var captionSpacing: CGFloat = 4

    public init() {}

    /// Gets the line height for a typography level
    public func lineHeight(for level: TypographyLevel) -> CGFloat {
        level.baseSize * level.lineHeightRatio
    }
}

// MARK: - Truncation Patterns

/// Text truncation modes with semantic naming.
public enum TruncationPattern: Sendable {
    case singleLine          // One line, tail truncation
    case twoLines           // Max 2 lines, tail truncation
    case threeLines         // Max 3 lines, tail truncation
    case paragraph          // Max 5 lines, for previews
    case unlimited          // No limit

    public var lineLimit: Int? {
        switch self {
        case .singleLine: return 1
        case .twoLines: return 2
        case .threeLines: return 3
        case .paragraph: return 5
        case .unlimited: return nil
        }
    }
}

/// View modifier for applying truncation patterns
public struct TruncationModifier: ViewModifier {
    let pattern: TruncationPattern
    let alignment: TextAlignment

    public init(_ pattern: TruncationPattern, alignment: TextAlignment = .leading) {
        self.pattern = pattern
        self.alignment = alignment
    }

    public func body(content: Content) -> some View {
        content
            .lineLimit(pattern.lineLimit)
            .truncationMode(.tail)
            .multilineTextAlignment(alignment)
    }
}

public extension View {
    /// Applies a truncation pattern to text content.
    func truncation(_ pattern: TruncationPattern, alignment: TextAlignment = .leading) -> some View {
        modifier(TruncationModifier(pattern, alignment: alignment))
    }
}

// MARK: - Text Styling Modifiers

/// Applies full typography styling including line spacing and tracking.
public struct TypographyStyleModifier: ViewModifier {
    let level: TypographyLevel
    let weight: InsightFontWeight?
    let color: Color?

    public init(
        _ level: TypographyLevel,
        weight: InsightFontWeight? = nil,
        color: Color? = nil
    ) {
        self.level = level
        self.weight = weight
        self.color = color
    }

    public func body(content: Content) -> some View {
        content
            .font(.insight(level, weight: weight))
            .tracking(level.tracking)
            .lineSpacing(level.baseSize * (level.lineHeightRatio - 1))
            .foregroundStyle(color ?? .primary)
    }
}

public extension View {
    /// Applies complete typography styling for a level.
    func typographyStyle(
        _ level: TypographyLevel,
        weight: InsightFontWeight? = nil,
        color: Color? = nil
    ) -> some View {
        modifier(TypographyStyleModifier(level, weight: weight, color: color))
    }
}

// MARK: - Custom Font Registration

/// Utility for registering custom fonts at app launch.
public enum FontLoader {
    /// Registers all custom fonts from the bundle.
    /// Call this in your App's init or AppDelegate.
    @MainActor
    public static func registerFonts() {
        let fontFamilies: [(InsightFontFamily, [InsightFontWeight])] = [
            (.figtree, [.light, .regular, .medium, .semibold, .bold, .heavy, .black]),
            (.inter, [.light, .regular, .medium, .semibold, .bold, .heavy, .black])
        ]

        for (family, weights) in fontFamilies {
            for weight in weights {
                if let fontName = family.fontName(weight: weight) {
                    registerFont(named: fontName)
                }
            }
        }
    }

    private static func registerFont(named fontName: String) {
        // Try common font file extensions
        let extensions = ["ttf", "otf"]

        for ext in extensions {
            if let url = Bundle.main.url(forResource: fontName, withExtension: ext) {
                var errorRef: Unmanaged<CFError>?
                if !CTFontManagerRegisterFontsForURL(url as CFURL, .process, &errorRef) {
                    if let error = errorRef?.takeRetainedValue() {
                        print("Failed to register font \(fontName): \(error)")
                    }
                }
                return
            }
        }
    }
}

// MARK: - Preview Helpers

#if DEBUG
struct TypographyPreview: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                ForEach(TypographyLevel.allCases, id: \.self) { level in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(level.rawValue.capitalized)
                            .font(.insight(level))
                        Text("\(Int(level.baseSize))pt • \(level.defaultWeight.rawValue)")
                            .font(.insightCaption())
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .padding()
        }
    }
}

#Preview("Typography Levels") {
    TypographyPreview()
}

#Preview("Truncation Patterns") {
    VStack(alignment: .leading, spacing: 16) {
        Text("Single line truncation example with very long text that should be cut off")
            .truncation(.singleLine)

        Text("Two line truncation example with very long text that should wrap to a second line before being cut off at the end")
            .truncation(.twoLines)

        Text("Three line example for slightly longer content that needs more room to breathe but still has limits on how much space it can take up in the layout")
            .truncation(.threeLines)
    }
    .padding()
}
#endif
