import Observation
import SwiftUI

public enum ThemeMode: String, CaseIterable, Identifiable {
    case dark
    case light
    case warm
    case olive
    case oliveOrange
    case roseGold

    public var id: String { rawValue }
}

public enum DisplayMode: String, CaseIterable, Identifiable {
    case big
    case compact

    public var id: String { rawValue }
}

public struct ThemePalette: Hashable {
    // MARK: - Background/Surface Hierarchy (3 levels)
    /// Primary background - deepest layer (e.g., app background)
    public let background: Color
    /// Surface - elevated elements (e.g., cards, sheets)
    public let surface: Color
    /// Surface alternate - highest elevation or overlays
    public let surfaceAlt: Color

    // MARK: - Text Contrast Levels
    /// Primary text - highest contrast, main content
    public let text: Color
    /// Secondary text - medium contrast, supporting content
    public let textSecondary: Color
    /// Tertiary text - lowest contrast, disabled/placeholder
    public let textTertiary: Color

    // MARK: - Accent/Tint Variants
    /// Primary tint - default accent color
    public let tint: Color
    /// Tint light - subtle backgrounds using accent
    public let tintLight: Color
    /// Tint hover - slightly lighter/brighter for hover states
    public let tintHover: Color
    /// Tint pressed - darker for pressed/active states
    public let tintPressed: Color

    // MARK: - Border Colors
    /// Primary border - visible dividers
    public let border: Color
    /// Light border - subtle dividers
    public let borderLight: Color

    // MARK: - Semantic Status Colors
    public let success: Color
    public let warning: Color
    public let error: Color

    // MARK: - Glassmorphism Support Colors
    /// Glass background - translucent base for glass effects
    public let glassBackground: Color
    /// Glass stroke - subtle border for glass elements
    public let glassStroke: Color
    /// Glass highlight - top highlight for glass elements
    public let glassHighlight: Color
}

// MARK: - Gradient Definitions
public struct ThemeGradients: Hashable {
    /// Primary accent gradient - uses tint colors
    public let accent: [Color]
    /// Surface gradient - subtle depth on surfaces
    public let surface: [Color]
    /// Glass gradient - for glassmorphism effects
    public let glass: [Color]
    /// Warm highlight gradient
    public let warmHighlight: [Color]
    /// Cool shadow gradient
    public let coolShadow: [Color]
}

public struct DisplayMetrics: Hashable {
    public let headerTitle: CGFloat
    public let sectionTitle: CGFloat
    public let bodyText: CGFloat
    public let smallText: CGFloat
    public let tinyText: CGFloat
    public let spacing: CGFloat
    public let spacingSmall: CGFloat
    public let cardPadding: CGFloat
    public let cardGap: CGFloat
    public let rowGap: CGFloat
    public let radius: CGFloat
    public let radiusSmall: CGFloat
    public let buttonHeight: CGFloat
    public let buttonHeightSmall: CGFloat
    public let iconSize: CGFloat
    public let iconSizeSmall: CGFloat
    public let iconSizeTiny: CGFloat
    public let metricValue: CGFloat
    public let metricLabel: CGFloat
    public let chipPadding: CGFloat
    public let chipHeight: CGFloat
    public let heatmapCell: CGFloat
    public let heatmapGap: CGFloat
    public let underbarHeight: CGFloat
    public let panelWidth: CGFloat
}

@MainActor
@Observable
public final class ThemeStore {
    public var mode: ThemeMode
    public var display: DisplayMode

    public init(mode: ThemeMode = .warm, display: DisplayMode = .big) {
        self.mode = mode
        self.display = display
    }

    public var palette: ThemePalette {
        switch mode {
        case .dark:
            return ThemePalette(
                // Background/Surface Hierarchy
                background: Color(hex: "#0B1020"),
                surface: Color(hex: "#141A2A"),
                surfaceAlt: Color(hex: "#1C2438"),
                // Text Contrast Levels
                text: Color(hex: "#E5E7EB"),
                textSecondary: Color(hex: "#94A3B8"),
                textTertiary: Color(hex: "#64748B"),
                // Accent/Tint Variants
                tint: Color(hex: "#D95D39"),
                tintLight: Color(hex: "#D95D39", alpha: 0.15),
                tintHover: Color(hex: "#E5704F"),
                tintPressed: Color(hex: "#C04A2A"),
                // Borders
                border: Color(hex: "#94A3B8", alpha: 0.16),
                borderLight: Color(hex: "#94A3B8", alpha: 0.08),
                // Status
                success: Color(hex: "#22C55E"),
                warning: Color(hex: "#F97316"),
                error: Color(hex: "#EF4444"),
                // Glassmorphism
                glassBackground: Color(hex: "#FFFFFF", alpha: 0.05),
                glassStroke: Color(hex: "#FFFFFF", alpha: 0.1),
                glassHighlight: Color(hex: "#FFFFFF", alpha: 0.15)
            )
        case .light:
            return ThemePalette(
                // Background/Surface Hierarchy
                background: Color(hex: "#FFFFFF"),
                surface: Color(hex: "#F8F9FA"),
                surfaceAlt: Color(hex: "#F0F1F3"),
                // Text Contrast Levels
                text: Color(hex: "#1C1C1E"),
                textSecondary: Color(hex: "#6B7280"),
                textTertiary: Color(hex: "#9CA3AF"),
                // Accent/Tint Variants
                tint: Color(hex: "#D95D39"),
                tintLight: Color(hex: "#D95D39", alpha: 0.1),
                tintHover: Color(hex: "#E5704F"),
                tintPressed: Color(hex: "#C04A2A"),
                // Borders
                border: Color(hex: "#1C1C1E", alpha: 0.1),
                borderLight: Color(hex: "#1C1C1E", alpha: 0.05),
                // Status
                success: Color(hex: "#22C55E"),
                warning: Color(hex: "#F97316"),
                error: Color(hex: "#EF4444"),
                // Glassmorphism
                glassBackground: Color(hex: "#FFFFFF", alpha: 0.7),
                glassStroke: Color(hex: "#000000", alpha: 0.08),
                glassHighlight: Color(hex: "#FFFFFF", alpha: 0.9)
            )
        case .warm:
            return ThemePalette(
                // Background/Surface Hierarchy
                background: Color(hex: "#F2F0ED"),
                surface: Color(hex: "#FFFFFF"),
                surfaceAlt: Color(hex: "#FAF9F7"),
                // Text Contrast Levels
                text: Color(hex: "#1C1C1E"),
                textSecondary: Color(hex: "#6B6560"),
                textTertiary: Color(hex: "#9C9690"),
                // Accent/Tint Variants
                tint: Color(hex: "#D95D39"),
                tintLight: Color(hex: "#D95D39", alpha: 0.1),
                tintHover: Color(hex: "#E5704F"),
                tintPressed: Color(hex: "#C04A2A"),
                // Borders
                border: Color(hex: "#1C1C1E", alpha: 0.08),
                borderLight: Color(hex: "#1C1C1E", alpha: 0.04),
                // Status
                success: Color(hex: "#22C55E"),
                warning: Color(hex: "#F97316"),
                error: Color(hex: "#EF4444"),
                // Glassmorphism
                glassBackground: Color(hex: "#FFFFFF", alpha: 0.75),
                glassStroke: Color(hex: "#8B8580", alpha: 0.12),
                glassHighlight: Color(hex: "#FFFFFF", alpha: 0.95)
            )
        case .olive:
            return ThemePalette(
                // Background/Surface Hierarchy
                background: Color(hex: "#1A1F16"),
                surface: Color(hex: "#252B20"),
                surfaceAlt: Color(hex: "#303828"),
                // Text Contrast Levels
                text: Color(hex: "#E5E8E0"),
                textSecondary: Color(hex: "#B4BEA0"),
                textTertiary: Color(hex: "#7A8568"),
                // Accent/Tint Variants
                tint: Color(hex: "#8B9A6D"),
                tintLight: Color(hex: "#8B9A6D", alpha: 0.15),
                tintHover: Color(hex: "#9EAD80"),
                tintPressed: Color(hex: "#78875A"),
                // Borders
                border: Color(hex: "#8CA078", alpha: 0.16),
                borderLight: Color(hex: "#8CA078", alpha: 0.08),
                // Status
                success: Color(hex: "#7BAF7B"),
                warning: Color(hex: "#D4A574"),
                error: Color(hex: "#C97B7B"),
                // Glassmorphism
                glassBackground: Color(hex: "#FFFFFF", alpha: 0.06),
                glassStroke: Color(hex: "#B4BEA0", alpha: 0.12),
                glassHighlight: Color(hex: "#E5E8E0", alpha: 0.1)
            )
        case .oliveOrange:
            return ThemePalette(
                // Background/Surface Hierarchy
                background: Color(hex: "#2B2A24"),
                surface: Color(hex: "#383630"),
                surfaceAlt: Color(hex: "#45433C"),
                // Text Contrast Levels
                text: Color(hex: "#EDE9E0"),
                textSecondary: Color(hex: "#C8BEAA"),
                textTertiary: Color(hex: "#8A8274"),
                // Accent/Tint Variants
                tint: Color(hex: "#D95D39"),
                tintLight: Color(hex: "#D95D39", alpha: 0.18),
                tintHover: Color(hex: "#E5704F"),
                tintPressed: Color(hex: "#C04A2A"),
                // Borders
                border: Color(hex: "#B4AA96", alpha: 0.18),
                borderLight: Color(hex: "#B4AA96", alpha: 0.08),
                // Status
                success: Color(hex: "#9CA77A"),
                warning: Color(hex: "#D4A574"),
                error: Color(hex: "#C97B7B"),
                // Glassmorphism
                glassBackground: Color(hex: "#FFFFFF", alpha: 0.06),
                glassStroke: Color(hex: "#C8BEAA", alpha: 0.12),
                glassHighlight: Color(hex: "#EDE9E0", alpha: 0.1)
            )
        case .roseGold:
            return ThemePalette(
                // Background/Surface Hierarchy
                background: Color(hex: "#2D2226"),
                surface: Color(hex: "#3A2D32"),
                surfaceAlt: Color(hex: "#48373D"),
                // Text Contrast Levels
                text: Color(hex: "#F2E4E0"),
                textSecondary: Color(hex: "#DCC8C3"),
                textTertiary: Color(hex: "#9A8A86"),
                // Accent/Tint Variants
                tint: Color(hex: "#E8AB96"),
                tintLight: Color(hex: "#E8AB96", alpha: 0.18),
                tintHover: Color(hex: "#F0BDA9"),
                tintPressed: Color(hex: "#D99983"),
                // Borders
                border: Color(hex: "#E8AB96", alpha: 0.18),
                borderLight: Color(hex: "#E8AB96", alpha: 0.08),
                // Status
                success: Color(hex: "#B8D4A0"),
                warning: Color(hex: "#E8C49A"),
                error: Color(hex: "#D98B8B"),
                // Glassmorphism
                glassBackground: Color(hex: "#FFFFFF", alpha: 0.06),
                glassStroke: Color(hex: "#DCC8C3", alpha: 0.12),
                glassHighlight: Color(hex: "#F2E4E0", alpha: 0.1)
            )
        }
    }

    public var gradients: ThemeGradients {
        switch mode {
        case .dark:
            return ThemeGradients(
                accent: [Color(hex: "#D95D39"), Color(hex: "#E57A5A")],
                surface: [Color(hex: "#141A2A"), Color(hex: "#1C2438")],
                glass: [Color(hex: "#FFFFFF", alpha: 0.1), Color(hex: "#FFFFFF", alpha: 0.02)],
                warmHighlight: [Color(hex: "#D95D39", alpha: 0.3), Color(hex: "#D95D39", alpha: 0.0)],
                coolShadow: [Color(hex: "#0B1020", alpha: 0.0), Color(hex: "#0B1020", alpha: 0.8)]
            )
        case .light:
            return ThemeGradients(
                accent: [Color(hex: "#D95D39"), Color(hex: "#E57A5A")],
                surface: [Color(hex: "#FFFFFF"), Color(hex: "#F8F9FA")],
                glass: [Color(hex: "#FFFFFF", alpha: 0.9), Color(hex: "#FFFFFF", alpha: 0.6)],
                warmHighlight: [Color(hex: "#D95D39", alpha: 0.15), Color(hex: "#D95D39", alpha: 0.0)],
                coolShadow: [Color(hex: "#000000", alpha: 0.0), Color(hex: "#000000", alpha: 0.08)]
            )
        case .warm:
            return ThemeGradients(
                accent: [Color(hex: "#D95D39"), Color(hex: "#E57A5A")],
                surface: [Color(hex: "#FFFFFF"), Color(hex: "#FAF9F7")],
                glass: [Color(hex: "#FFFFFF", alpha: 0.85), Color(hex: "#FFFFFF", alpha: 0.65)],
                warmHighlight: [Color(hex: "#D95D39", alpha: 0.12), Color(hex: "#D95D39", alpha: 0.0)],
                coolShadow: [Color(hex: "#8B8580", alpha: 0.0), Color(hex: "#8B8580", alpha: 0.1)]
            )
        case .olive:
            return ThemeGradients(
                accent: [Color(hex: "#8B9A6D"), Color(hex: "#9EAD80")],
                surface: [Color(hex: "#252B20"), Color(hex: "#303828")],
                glass: [Color(hex: "#E5E8E0", alpha: 0.08), Color(hex: "#E5E8E0", alpha: 0.02)],
                warmHighlight: [Color(hex: "#8B9A6D", alpha: 0.25), Color(hex: "#8B9A6D", alpha: 0.0)],
                coolShadow: [Color(hex: "#1A1F16", alpha: 0.0), Color(hex: "#1A1F16", alpha: 0.7)]
            )
        case .oliveOrange:
            return ThemeGradients(
                accent: [Color(hex: "#D95D39"), Color(hex: "#E57A5A")],
                surface: [Color(hex: "#383630"), Color(hex: "#45433C")],
                glass: [Color(hex: "#EDE9E0", alpha: 0.08), Color(hex: "#EDE9E0", alpha: 0.02)],
                warmHighlight: [Color(hex: "#D95D39", alpha: 0.25), Color(hex: "#D95D39", alpha: 0.0)],
                coolShadow: [Color(hex: "#2B2A24", alpha: 0.0), Color(hex: "#2B2A24", alpha: 0.7)]
            )
        case .roseGold:
            return ThemeGradients(
                accent: [Color(hex: "#E8AB96"), Color(hex: "#F0BDA9")],
                surface: [Color(hex: "#3A2D32"), Color(hex: "#48373D")],
                glass: [Color(hex: "#F2E4E0", alpha: 0.08), Color(hex: "#F2E4E0", alpha: 0.02)],
                warmHighlight: [Color(hex: "#E8AB96", alpha: 0.25), Color(hex: "#E8AB96", alpha: 0.0)],
                coolShadow: [Color(hex: "#2D2226", alpha: 0.0), Color(hex: "#2D2226", alpha: 0.7)]
            )
        }
    }

    public var metrics: DisplayMetrics {
        switch display {
        case .big:
            return DisplayMetrics(
                headerTitle: 22,
                sectionTitle: 17,
                bodyText: 16,
                smallText: 13,
                tinyText: 11,
                spacing: 20,
                spacingSmall: 12,
                cardPadding: 20,
                cardGap: 16,
                rowGap: 12,
                radius: 24,
                radiusSmall: 16,
                buttonHeight: 56,
                buttonHeightSmall: 44,
                iconSize: 24,
                iconSizeSmall: 20,
                iconSizeTiny: 16,
                metricValue: 24,
                metricLabel: 10,
                chipPadding: 12,
                chipHeight: 32,
                heatmapCell: 12,
                heatmapGap: 3,
                underbarHeight: 64,
                panelWidth: 320
            )
        case .compact:
            return DisplayMetrics(
                headerTitle: 16,
                sectionTitle: 12,
                bodyText: 12,
                smallText: 10,
                tinyText: 8,
                spacing: 10,
                spacingSmall: 6,
                cardPadding: 10,
                cardGap: 8,
                rowGap: 6,
                radius: 12,
                radiusSmall: 8,
                buttonHeight: 36,
                buttonHeightSmall: 28,
                iconSize: 16,
                iconSizeSmall: 14,
                iconSizeTiny: 12,
                metricValue: 18,
                metricLabel: 8,
                chipPadding: 6,
                chipHeight: 24,
                heatmapCell: 8,
                heatmapGap: 2,
                underbarHeight: 52,
                panelWidth: 280
            )
        }
    }

    public var isDark: Bool {
        mode == .dark || mode == .olive || mode == .oliveOrange || mode == .roseGold
    }
}

public enum AppFont {
    public static func display(_ size: CGFloat) -> Font {
        Font.custom("AvenirNext-DemiBold", size: size)
    }

    public static func title(_ size: CGFloat) -> Font {
        Font.custom("AvenirNext-Bold", size: size)
    }

    public static func body(_ size: CGFloat) -> Font {
        Font.custom("AvenirNext-Regular", size: size)
    }

    public static func mono(_ size: CGFloat) -> Font {
        Font.custom("Menlo-Regular", size: size)
    }
}

extension Color {
    init(hex: String, alpha: Double = 1.0) {
        let cleaned = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        let scanner = Scanner(string: cleaned)
        var value: UInt64 = 0
        scanner.scanHexInt64(&value)
        let r, g, b: UInt64
        switch cleaned.count {
        case 6:
            r = (value >> 16) & 0xFF
            g = (value >> 8) & 0xFF
            b = value & 0xFF
        case 8:
            r = (value >> 24) & 0xFF
            g = (value >> 16) & 0xFF
            b = (value >> 8) & 0xFF
        default:
            r = 0
            g = 0
            b = 0
        }
        self.init(
            .sRGB,
            red: Double(r) / 255.0,
            green: Double(g) / 255.0,
            blue: Double(b) / 255.0,
            opacity: alpha
        )
    }
}

// MARK: - Semantic Color Accessors
extension Color {
    /// Creates a color that adapts to the current color scheme
    public static func semantic(
        light: Color,
        dark: Color,
        scheme: ColorScheme
    ) -> Color {
        scheme == .dark ? dark : light
    }
}

// MARK: - Gradient View Helpers
public struct GlassGradient: View {
    let gradients: ThemeGradients

    public init(gradients: ThemeGradients) {
        self.gradients = gradients
    }

    public var body: some View {
        LinearGradient(
            colors: gradients.glass,
            startPoint: .top,
            endPoint: .bottom
        )
    }
}

public struct AccentGradient: View {
    let gradients: ThemeGradients
    var startPoint: UnitPoint = .leading
    var endPoint: UnitPoint = .trailing

    public init(
        gradients: ThemeGradients,
        startPoint: UnitPoint = .leading,
        endPoint: UnitPoint = .trailing
    ) {
        self.gradients = gradients
        self.startPoint = startPoint
        self.endPoint = endPoint
    }

    public var body: some View {
        LinearGradient(
            colors: gradients.accent,
            startPoint: startPoint,
            endPoint: endPoint
        )
    }
}

public struct SurfaceGradient: View {
    let gradients: ThemeGradients

    public init(gradients: ThemeGradients) {
        self.gradients = gradients
    }

    public var body: some View {
        LinearGradient(
            colors: gradients.surface,
            startPoint: .top,
            endPoint: .bottom
        )
    }
}

// MARK: - Glassmorphism View Modifier
public struct GlassmorphismModifier: ViewModifier {
    let palette: ThemePalette
    let cornerRadius: CGFloat
    let blur: CGFloat

    public init(palette: ThemePalette, cornerRadius: CGFloat = 20, blur: CGFloat = 10) {
        self.palette = palette
        self.cornerRadius = cornerRadius
        self.blur = blur
    }

    public func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .fill(palette.glassBackground)
                    .background(
                        RoundedRectangle(cornerRadius: cornerRadius)
                            .fill(.ultraThinMaterial)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: cornerRadius)
                            .stroke(palette.glassStroke, lineWidth: 1)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: cornerRadius)
                            .stroke(
                                LinearGradient(
                                    colors: [palette.glassHighlight, .clear],
                                    startPoint: .top,
                                    endPoint: .center
                                ),
                                lineWidth: 1
                            )
                    )
            )
    }
}

extension View {
    /// Applies a glassmorphism effect to the view
    public func glassmorphism(
        palette: ThemePalette,
        cornerRadius: CGFloat = 20,
        blur: CGFloat = 10
    ) -> some View {
        modifier(GlassmorphismModifier(
            palette: palette,
            cornerRadius: cornerRadius,
            blur: blur
        ))
    }
}

// MARK: - Interactive State Color Helper
extension ThemePalette {
    /// Returns the appropriate tint color for an interactive state
    public func tintColor(for state: InteractiveState) -> Color {
        switch state {
        case .normal:
            return tint
        case .hover:
            return tintHover
        case .pressed:
            return tintPressed
        case .disabled:
            return textTertiary
        }
    }
}

public enum InteractiveState {
    case normal
    case hover
    case pressed
    case disabled
}
