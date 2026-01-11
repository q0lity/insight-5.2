import SwiftUI

// =============================================================================
// MARK: - 8pt Grid Spacing System
// =============================================================================

/// Design tokens for spacing based on an 8pt grid system.
/// All values are multiples of 4px (half-grid) or 8px (full-grid).
public enum Spacing {
    // MARK: - Primitive Values (8pt grid base)

    /// 0px - No spacing
    public static let zero: CGFloat = 0

    /// 1px - Hairline
    public static let px: CGFloat = 1

    /// 2px - Quarter grid
    public static let xxs: CGFloat = 2

    /// 4px - Half grid (0.5 unit)
    public static let xs: CGFloat = 4

    /// 6px - Three-quarter grid
    public static let xs2: CGFloat = 6

    /// 8px - 1 grid unit
    public static let sm: CGFloat = 8

    /// 10px
    public static let sm2: CGFloat = 10

    /// 12px - 1.5 grid units
    public static let md: CGFloat = 12

    /// 14px
    public static let md2: CGFloat = 14

    /// 16px - 2 grid units
    public static let lg: CGFloat = 16

    /// 20px - 2.5 grid units
    public static let lg2: CGFloat = 20

    /// 24px - 3 grid units
    public static let xl: CGFloat = 24

    /// 28px - 3.5 grid units
    public static let xl2: CGFloat = 28

    /// 32px - 4 grid units
    public static let xxl: CGFloat = 32

    /// 36px - 4.5 grid units
    public static let xxl2: CGFloat = 36

    /// 40px - 5 grid units
    public static let xxxl: CGFloat = 40

    /// 48px - 6 grid units
    public static let huge: CGFloat = 48

    /// 56px - 7 grid units
    public static let huge2: CGFloat = 56

    /// 64px - 8 grid units
    public static let massive: CGFloat = 64

    /// 80px - 10 grid units
    public static let massive2: CGFloat = 80

    /// 96px - 12 grid units
    public static let giant: CGFloat = 96

    // MARK: - Semantic Stack Spacing (vertical gaps)

    public enum Stack {
        /// 4px - Tight vertical spacing
        public static let xs: CGFloat = Spacing.xs

        /// 8px - Small vertical spacing
        public static let sm: CGFloat = Spacing.sm

        /// 16px - Medium vertical spacing
        public static let md: CGFloat = Spacing.lg

        /// 24px - Large vertical spacing
        public static let lg: CGFloat = Spacing.xl

        /// 32px - Extra large vertical spacing
        public static let xl: CGFloat = Spacing.xxl
    }

    // MARK: - Semantic Inline Spacing (horizontal gaps)

    public enum Inline {
        /// 4px - Tight horizontal spacing
        public static let xs: CGFloat = Spacing.xs

        /// 8px - Small horizontal spacing
        public static let sm: CGFloat = Spacing.sm

        /// 12px - Medium horizontal spacing
        public static let md: CGFloat = Spacing.md

        /// 16px - Large horizontal spacing
        public static let lg: CGFloat = Spacing.lg
    }

    // MARK: - Section Spacing

    public enum Section {
        /// 32px - Small section gap
        public static let sm: CGFloat = Spacing.xxl

        /// 48px - Medium section gap
        public static let md: CGFloat = Spacing.huge

        /// 64px - Large section gap
        public static let lg: CGFloat = Spacing.massive
    }
}

// =============================================================================
// MARK: - Size Class (Responsive)
// =============================================================================

/// Size class for responsive layouts
public enum SizeClass: String, CaseIterable {
    /// Mobile / compact screens (< 600px)
    case compact

    /// Tablet / regular screens (600-1079px)
    case regular

    /// Desktop / expanded screens (>= 1080px)
    case expanded
}

// =============================================================================
// MARK: - Responsive Page Margins
// =============================================================================

public enum PageSpacing {
    /// Page margin based on size class
    public static func margin(for sizeClass: SizeClass) -> CGFloat {
        switch sizeClass {
        case .compact:
            return Spacing.lg // 16px
        case .regular:
            return Spacing.xl // 24px
        case .expanded:
            return Spacing.xxl // 32px
        }
    }

    /// Page gutter based on size class
    public static func gutter(for sizeClass: SizeClass) -> CGFloat {
        switch sizeClass {
        case .compact:
            return Spacing.md // 12px
        case .regular:
            return Spacing.lg // 16px
        case .expanded:
            return Spacing.xl // 24px
        }
    }

    /// Default page margin for current device
    public static var defaultMargin: CGFloat {
        #if os(iOS)
        let width = UIScreen.main.bounds.width
        if width < 600 {
            return margin(for: .compact)
        } else if width < 1080 {
            return margin(for: .regular)
        } else {
            return margin(for: .expanded)
        }
        #else
        return margin(for: .expanded)
        #endif
    }
}

// =============================================================================
// MARK: - Safe Area Insets
// =============================================================================

public struct SafeAreaInsets {
    public let top: CGFloat
    public let leading: CGFloat
    public let bottom: CGFloat
    public let trailing: CGFloat

    public init(top: CGFloat = 0, leading: CGFloat = 0, bottom: CGFloat = 0, trailing: CGFloat = 0) {
        self.top = top
        self.leading = leading
        self.bottom = bottom
        self.trailing = trailing
    }

    /// Combined top inset with additional spacing
    public func topWithSpacing(_ spacing: CGFloat = Spacing.lg) -> CGFloat {
        top + spacing
    }

    /// Combined bottom inset with additional spacing
    public func bottomWithSpacing(_ spacing: CGFloat = Spacing.lg) -> CGFloat {
        bottom + spacing
    }
}

// =============================================================================
// MARK: - Component Spacing
// =============================================================================

public enum ComponentSpacing {
    // MARK: Button

    public enum Button {
        public static func paddingHorizontal(size: ComponentSize) -> CGFloat {
            switch size {
            case .small:
                return Spacing.md // 12px
            case .medium:
                return Spacing.lg // 16px
            case .large:
                return Spacing.xl // 24px
            }
        }

        public static func paddingVertical(size: ComponentSize) -> CGFloat {
            switch size {
            case .small:
                return Spacing.xs2 // 6px
            case .medium:
                return Spacing.sm // 8px
            case .large:
                return Spacing.md // 12px
            }
        }

        /// Gap between icon and text
        public static let iconGap: CGFloat = Spacing.sm // 8px
    }

    // MARK: Input

    public enum Input {
        public static let paddingHorizontal: CGFloat = Spacing.md // 12px
        public static let paddingVertical: CGFloat = Spacing.sm // 8px
    }

    // MARK: Card

    public enum Card {
        public static func padding(size: ComponentSize) -> CGFloat {
            switch size {
            case .small:
                return Spacing.md // 12px
            case .medium:
                return Spacing.lg // 16px
            case .large:
                return Spacing.xl // 24px
            }
        }

        /// Gap between card content items
        public static let contentGap: CGFloat = Spacing.md // 12px
    }

    // MARK: Modal

    public enum Modal {
        public static let padding: CGFloat = Spacing.xl // 24px
        public static let contentGap: CGFloat = Spacing.lg // 16px
    }

    // MARK: List

    public enum List {
        public static let itemPadding: CGFloat = Spacing.md // 12px
        public static let itemGap: CGFloat = Spacing.xs // 4px
    }

    // MARK: Navigation

    public enum Nav {
        public static let itemPadding: CGFloat = Spacing.md // 12px
        public static let itemGap: CGFloat = Spacing.sm // 8px
        public static let sectionGap: CGFloat = Spacing.lg // 16px
    }
}

// =============================================================================
// MARK: - Component Size
// =============================================================================

public enum ComponentSize {
    case small
    case medium
    case large
}

// =============================================================================
// MARK: - Grid Snap Utility
// =============================================================================

extension CGFloat {
    /// Snaps value to nearest 8pt grid point
    public func snappedToGrid(_ gridSize: CGFloat = 8) -> CGFloat {
        (self / gridSize).rounded() * gridSize
    }
}

extension Double {
    /// Snaps value to nearest 8pt grid point
    public func snappedToGrid(_ gridSize: Double = 8) -> Double {
        (self / gridSize).rounded() * gridSize
    }
}

// =============================================================================
// MARK: - View Extensions
// =============================================================================

extension View {
    /// Apply standard page padding based on size class
    public func pageMargin(_ sizeClass: SizeClass = .compact) -> some View {
        padding(.horizontal, PageSpacing.margin(for: sizeClass))
    }

    /// Apply stack spacing (vertical)
    public func stackSpacing(_ size: StackSpacingSize) -> some View {
        padding(.vertical, size.value)
    }

    /// Apply inline spacing (horizontal)
    public func inlineSpacing(_ size: InlineSpacingSize) -> some View {
        padding(.horizontal, size.value)
    }
}

public enum StackSpacingSize {
    case xs, sm, md, lg, xl

    var value: CGFloat {
        switch self {
        case .xs: return Spacing.Stack.xs
        case .sm: return Spacing.Stack.sm
        case .md: return Spacing.Stack.md
        case .lg: return Spacing.Stack.lg
        case .xl: return Spacing.Stack.xl
        }
    }
}

public enum InlineSpacingSize {
    case xs, sm, md, lg

    var value: CGFloat {
        switch self {
        case .xs: return Spacing.Inline.xs
        case .sm: return Spacing.Inline.sm
        case .md: return Spacing.Inline.md
        case .lg: return Spacing.Inline.lg
        }
    }
}
