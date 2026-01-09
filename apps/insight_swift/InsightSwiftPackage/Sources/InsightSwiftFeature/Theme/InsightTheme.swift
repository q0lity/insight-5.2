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
    public let background: Color
    public let surface: Color
    public let surfaceAlt: Color
    public let text: Color
    public let textSecondary: Color
    public let tint: Color
    public let tintLight: Color
    public let border: Color
    public let borderLight: Color
    public let success: Color
    public let warning: Color
    public let error: Color
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
                background: Color(hex: "#0B1020"),
                surface: Color(hex: "#141A2A"),
                surfaceAlt: Color(hex: "#141A2A", alpha: 0.95),
                text: Color(hex: "#E5E7EB"),
                textSecondary: Color(hex: "#94A3B8", alpha: 0.6),
                tint: Color(hex: "#D95D39"),
                tintLight: Color(hex: "#D95D39", alpha: 0.15),
                border: Color(hex: "#94A3B8", alpha: 0.16),
                borderLight: Color(hex: "#94A3B8", alpha: 0.08),
                success: Color(hex: "#22C55E"),
                warning: Color(hex: "#F97316"),
                error: Color(hex: "#EF4444")
            )
        case .light:
            return ThemePalette(
                background: Color(hex: "#FFFFFF"),
                surface: Color(hex: "#F8F9FA"),
                surfaceAlt: Color(hex: "#FFFFFF"),
                text: Color(hex: "#1C1C1E"),
                textSecondary: Color(hex: "#1C1C1E", alpha: 0.5),
                tint: Color(hex: "#D95D39"),
                tintLight: Color(hex: "#D95D39", alpha: 0.1),
                border: Color(hex: "#1C1C1E", alpha: 0.1),
                borderLight: Color(hex: "#1C1C1E", alpha: 0.05),
                success: Color(hex: "#22C55E"),
                warning: Color(hex: "#F97316"),
                error: Color(hex: "#EF4444")
            )
        case .warm:
            return ThemePalette(
                background: Color(hex: "#F2F0ED"),
                surface: Color(hex: "#FFFFFF"),
                surfaceAlt: Color(hex: "#FFFFFF"),
                text: Color(hex: "#1C1C1E"),
                textSecondary: Color(hex: "#1C1C1E", alpha: 0.35),
                tint: Color(hex: "#D95D39"),
                tintLight: Color(hex: "#D95D39", alpha: 0.1),
                border: Color(hex: "#1C1C1E", alpha: 0.08),
                borderLight: Color(hex: "#1C1C1E", alpha: 0.04),
                success: Color(hex: "#22C55E"),
                warning: Color(hex: "#F97316"),
                error: Color(hex: "#EF4444")
            )
        case .olive:
            return ThemePalette(
                background: Color(hex: "#1A1F16"),
                surface: Color(hex: "#252B20"),
                surfaceAlt: Color(hex: "#252B20", alpha: 0.95),
                text: Color(hex: "#E5E8E0"),
                textSecondary: Color(hex: "#B4BEA0", alpha: 0.6),
                tint: Color(hex: "#8B9A6D"),
                tintLight: Color(hex: "#8B9A6D", alpha: 0.15),
                border: Color(hex: "#8CA078", alpha: 0.16),
                borderLight: Color(hex: "#8CA078", alpha: 0.08),
                success: Color(hex: "#7BAF7B"),
                warning: Color(hex: "#D4A574"),
                error: Color(hex: "#C97B7B")
            )
        case .oliveOrange:
            return ThemePalette(
                background: Color(hex: "#2B2A24"),
                surface: Color(hex: "#383630"),
                surfaceAlt: Color(hex: "#383630", alpha: 0.95),
                text: Color(hex: "#EDE9E0"),
                textSecondary: Color(hex: "#C8BEAA", alpha: 0.6),
                tint: Color(hex: "#D95D39"),
                tintLight: Color(hex: "#D95D39", alpha: 0.18),
                border: Color(hex: "#B4AA96", alpha: 0.18),
                borderLight: Color(hex: "#B4AA96", alpha: 0.08),
                success: Color(hex: "#9CA77A"),
                warning: Color(hex: "#D4A574"),
                error: Color(hex: "#C97B7B")
            )
        case .roseGold:
            return ThemePalette(
                background: Color(hex: "#2D2226"),
                surface: Color(hex: "#3A2D32"),
                surfaceAlt: Color(hex: "#3A2D32", alpha: 0.95),
                text: Color(hex: "#F2E4E0"),
                textSecondary: Color(hex: "#DCC8C3", alpha: 0.6),
                tint: Color(hex: "#E8AB96"),
                tintLight: Color(hex: "#E8AB96", alpha: 0.18),
                border: Color(hex: "#E8AB96", alpha: 0.18),
                borderLight: Color(hex: "#E8AB96", alpha: 0.08),
                success: Color(hex: "#B8D4A0"),
                warning: Color(hex: "#E8C49A"),
                error: Color(hex: "#D98B8B")
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
