# Insight 5 UI Implementation Guide

> Comprehensive design system and implementation guide synthesizing research on motion design, SwiftUI patterns, design tokens, premium app analysis, and Apple Design Award winning patterns.

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Design Tokens](#2-design-tokens)
3. [Typography System](#3-typography-system)
4. [Color System](#4-color-system)
5. [Spacing & Layout](#5-spacing--layout)
6. [Motion & Animation](#6-motion--animation)
7. [Component Architecture](#7-component-architecture)
8. [SwiftUI Patterns](#8-swiftui-patterns)
9. [Accessibility Requirements](#9-accessibility-requirements)
10. [Premium App Patterns](#10-premium-app-patterns)
11. [Recommended Libraries](#11-recommended-libraries)
12. [Implementation Checklist](#12-implementation-checklist)

---

## 1. Design Philosophy

### Core Principles (from Apple Design Award Winners)

| Principle | Implementation |
|-----------|---------------|
| **Flat Design** | 46% of winners use flat UI (Apple's preferred style since iOS 7) |
| **Clean Minimalism** | White/black backgrounds with strategic accent colors |
| **Purposeful Animation** | Delightful micro-interactions, smooth transitions |
| **Native Gestures** | Intuitive swipe, tap, drag that feel natural to iOS |
| **Information Hierarchy** | Clear visual hierarchy, scannable content |
| **Haptic Feedback** | Strategic use of haptics for feedback and delight |

### Insight 5 Design Goals

1. **Voice-First Excellence** - Prioritize voice capture UI/UX
2. **Reduced Cognitive Load** - Simple, intuitive interfaces
3. **Emotional Resonance** - Warm, encouraging design that promotes wellbeing
4. **Native iOS Feel** - Platform-appropriate patterns and controls
5. **Accessibility from Day 1** - VoiceOver, Dynamic Type, Reduce Motion

---

## 2. Design Tokens

### Token Architecture (Three-Tier Hierarchy)

```
+-------------------------------------------------------------+
|  COMPONENT TOKENS (where)                                   |
|  button.background, card.border, input.placeholder          |
+-------------------------------------------------------------+
|  SEMANTIC TOKENS (how)                                      |
|  surface.primary, text.muted, border.subtle                 |
+-------------------------------------------------------------+
|  PRIMITIVE TOKENS (what)                                    |
|  gray.900, blue.500, 16px, 400ms                            |
+-------------------------------------------------------------+
```

### SwiftUI Token Implementation

```swift
// MARK: - Design Tokens
enum InsightTokens {
    // MARK: - Colors (Semantic)
    static let background = Color(.systemBackground)
    static let secondaryBackground = Color(.secondarySystemBackground)
    static let tertiaryBackground = Color(.tertiarySystemBackground)

    static let textPrimary = Color(.label)
    static let textSecondary = Color(.secondaryLabel)
    static let textTertiary = Color(.tertiaryLabel)

    static let accent = Color.accentColor
    static let destructive = Color.red
    static let success = Color.green
    static let warning = Color.orange

    static let border = Color(.separator)
    static let borderSubtle = Color(.separator).opacity(0.5)

    // MARK: - Spacing (4px base unit)
    static let spacingXs: CGFloat = 4
    static let spacingSm: CGFloat = 8
    static let spacingMd: CGFloat = 16
    static let spacingLg: CGFloat = 24
    static let spacingXl: CGFloat = 32
    static let spacing2xl: CGFloat = 48

    // MARK: - Radius
    static let radiusSm: CGFloat = 4
    static let radiusMd: CGFloat = 8
    static let radiusLg: CGFloat = 12
    static let radiusXl: CGFloat = 16
    static let radiusFull: CGFloat = 9999

    // MARK: - Duration
    static let durationFast: Double = 0.1
    static let durationNormal: Double = 0.2
    static let durationSlow: Double = 0.3
    static let durationSlower: Double = 0.4
}
```

---

## 3. Typography System

### Type Scale (Material Design 3 Pattern)

| Role | Size | Weight | Use Case |
|------|------|--------|----------|
| Display Large | 40pt | Regular | Hero text, onboarding |
| Display Medium | 34pt | Regular | Section headers |
| Headline Large | 24pt | Semibold | Screen titles |
| Headline Medium | 20pt | Semibold | Card titles |
| Title Large | 17pt | Medium | List headers |
| Title Medium | 15pt | Medium | Subheadings |
| Body Large | 17pt | Regular | Primary content |
| Body Medium | 15pt | Regular | Standard text |
| Label Large | 15pt | Medium | Button text |
| Label Small | 11pt | Medium | Badges, tags |
| Caption | 13pt | Regular | Supporting text |

### SwiftUI Typography Implementation

```swift
extension Font {
    static let insightDisplayLarge = Font.system(size: 40, weight: .regular)
    static let insightHeadlineLarge = Font.system(size: 24, weight: .semibold)
    static let insightHeadlineMedium = Font.system(size: 20, weight: .semibold)
    static let insightTitleLarge = Font.system(size: 17, weight: .medium)
    static let insightBodyLarge = Font.system(size: 17, weight: .regular)
    static let insightBodyMedium = Font.system(size: 15, weight: .regular)
    static let insightLabelLarge = Font.system(size: 15, weight: .medium)
    static let insightLabelSmall = Font.system(size: 11, weight: .medium)
    static let insightCaption = Font.system(size: 13, weight: .regular)
}
```

---

## 4. Color System

### Semantic Color Palette

```swift
// Light Mode
let backgroundPrimary = Color(hex: "#FFFFFF")
let backgroundSecondary = Color(hex: "#F8FAFC")
let textPrimary = Color(hex: "#1E293B")
let textSecondary = Color(hex: "#64748B")
let accentPrimary = Color(hex: "#2563EB")  // Blue-600
let success = Color(hex: "#22C55E")         // Green-500
let warning = Color(hex: "#F59E0B")         // Amber-500
let error = Color(hex: "#EF4444")           // Red-500

// Dark Mode (automatic via system semantic colors)
let backgroundPrimary = Color(hex: "#0F172A")
let backgroundSecondary = Color(hex: "#1E293B")
let textPrimary = Color(hex: "#F1F5F9")
let textSecondary = Color(hex: "#94A3B8")
```

### Status Colors (from Premium Apps)

| State | Light Mode | Dark Mode | Use Case |
|-------|------------|-----------|----------|
| Success | Green-600 | Green-400 | Completed tasks, positive feedback |
| Warning | Amber-600 | Amber-400 | Pending, needs attention |
| Error | Red-600 | Red-400 | Errors, destructive actions |
| Info | Blue-600 | Blue-400 | Information, links |

---

## 5. Spacing & Layout

### 8pt Grid System

```swift
// Base spacing scale (4px increments for fine control)
let spacing = [
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
    20: 80,
    24: 96
]
```

### Layout Guidelines

| Element | Spacing | Notes |
|---------|---------|-------|
| Page Margins | 16-24pt | Compact: 16pt, Regular: 24pt |
| Section Gap | 48pt | Between major content sections |
| Card Padding | 16pt | Internal card spacing |
| List Item Gap | 8-12pt | Between list items |
| Touch Targets | 44pt minimum | Apple HIG requirement |
| Icon Size | 20-24pt | Standard SF Symbols |

### Safe Areas & Keyboard

```swift
// Keyboard-aware layout
.safeAreaInset(edge: .bottom) {
    // Bottom toolbar content
}
.ignoresSafeArea(.keyboard, edges: .bottom)
```

---

## 6. Motion & Animation

### Spring Animation Presets

```swift
extension Animation {
    // Standard spring (most interactions)
    static let insightSpring = Animation.spring(
        response: 0.55,
        dampingFraction: 0.825
    )

    // Quick micro-interaction
    static let insightSnappy = Animation.spring(
        response: 0.2,
        dampingFraction: 0.7
    )

    // Bouncy feedback
    static let insightBouncy = Animation.spring(
        response: 0.6,
        dampingFraction: 0.5
    )

    // Sheet presentation
    static let insightSheet = Animation.spring(
        response: 0.5,
        dampingFraction: 1.0
    )

    // iOS 17+ simplified
    static let insightDefault = Animation.spring(duration: 0.5, bounce: 0.2)
}
```

### Animation Timing Standards

| Type | Duration | Damping | Use Case |
|------|----------|---------|----------|
| Micro-interaction | 0.15-0.2s | 0.85-0.9 | Button taps, toggles |
| Page Transition | 0.25-0.35s | 0.8-0.85 | Navigation |
| Spring Bounce | 0.4-0.6s | 0.6-0.7 | Drag completion |
| Modal Present | 0.3s | 0.85 | Sheet presentation |

### Gesture-Driven Animations

```swift
struct DraggableCard: View {
    @State private var offset: CGSize = .zero

    var body: some View {
        RoundedRectangle(cornerRadius: 16)
            .offset(offset)
            .gesture(
                DragGesture()
                    .onChanged { value in
                        offset = value.translation
                    }
                    .onEnded { value in
                        withAnimation(.spring(duration: 0.4, bounce: 0.2)) {
                            offset = .zero
                        }
                    }
            )
    }
}
```

### PhaseAnimator (iOS 17+)

```swift
enum BouncePhase: CaseIterable {
    case initial, compress, stretch, settle

    var scale: CGSize {
        switch self {
        case .initial: return CGSize(width: 1.0, height: 1.0)
        case .compress: return CGSize(width: 1.2, height: 0.8)
        case .stretch: return CGSize(width: 0.9, height: 1.1)
        case .settle: return CGSize(width: 1.0, height: 1.0)
        }
    }
}

PhaseAnimator(BouncePhase.allCases) { phase in
    Circle()
        .scaleEffect(phase.scale)
} animation: { phase in
    switch phase {
    case .initial: .spring(duration: 0.2, bounce: 0)
    case .compress: .easeOut(duration: 0.1)
    case .stretch: .spring(duration: 0.3, bounce: 0.5)
    case .settle: .spring(duration: 0.4, bounce: 0.2)
    }
}
```

---

## 7. Component Architecture

### Button Variants (shadcn/ui Pattern)

```swift
enum ButtonVariant {
    case `default`
    case destructive
    case outline
    case secondary
    case ghost
    case link
}

enum ButtonSize {
    case sm, md, lg, icon
}

struct InsightButtonStyle: ButtonStyle {
    let variant: ButtonVariant
    let size: ButtonSize

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(fontSize)
            .fontWeight(.medium)
            .padding(padding)
            .foregroundStyle(foregroundColor)
            .background(backgroundColor(isPressed: configuration.isPressed))
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
            .opacity(configuration.isPressed ? 0.9 : 1.0)
    }

    private var fontSize: Font {
        switch size {
        case .sm: return .caption
        case .md, .icon: return .subheadline
        case .lg: return .body
        }
    }

    private var padding: EdgeInsets {
        switch size {
        case .sm: return EdgeInsets(top: 8, leading: 12, bottom: 8, trailing: 12)
        case .md: return EdgeInsets(top: 10, leading: 16, bottom: 10, trailing: 16)
        case .lg: return EdgeInsets(top: 12, leading: 24, bottom: 12, trailing: 24)
        case .icon: return EdgeInsets(top: 10, leading: 10, bottom: 10, trailing: 10)
        }
    }

    private var foregroundColor: Color {
        switch variant {
        case .default, .destructive: return .white
        case .outline, .secondary, .ghost: return .primary
        case .link: return .accentColor
        }
    }

    private func backgroundColor(isPressed: Bool) -> Color {
        let base: Color = switch variant {
        case .default: .accentColor
        case .destructive: .red
        case .outline, .ghost, .link: .clear
        case .secondary: Color(.secondarySystemBackground)
        }
        return isPressed ? base.opacity(0.8) : base
    }

    private var cornerRadius: CGFloat {
        size == .sm ? 6 : 8
    }
}
```

### Card Component

```swift
struct InsightCard<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: InsightTokens.spacingMd) {
            content
        }
        .padding(InsightTokens.spacingMd)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: InsightTokens.radiusLg))
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }
}
```

### Toast/Alert System

```swift
enum ToastType {
    case success, error, warning, info

    var icon: String {
        switch self {
        case .success: return "checkmark.circle.fill"
        case .error: return "xmark.circle.fill"
        case .warning: return "exclamationmark.triangle.fill"
        case .info: return "info.circle.fill"
        }
    }

    var color: Color {
        switch self {
        case .success: return .green
        case .error: return .red
        case .warning: return .orange
        case .info: return .blue
        }
    }
}

@Observable
class ToastManager {
    static let shared = ToastManager()
    var toasts: [ToastItem] = []

    func show(_ title: String, type: ToastType = .info) {
        let toast = ToastItem(type: type, title: title)
        withAnimation(.spring(duration: 0.3)) {
            toasts.append(toast)
        }
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
```

---

## 8. SwiftUI Patterns

### Environment-Based Theming

```swift
// Theme Protocol
protocol AppTheme {
    var primaryColor: Color { get }
    var backgroundColor: Color { get }
    var textPrimary: Color { get }
    var cornerRadius: CGFloat { get }
}

// Theme Manager
@Observable
class ThemeManager {
    enum ThemeType: String, CaseIterable {
        case light, dark, system
    }

    var selectedTheme: ThemeType = .system

    var colorScheme: ColorScheme? {
        switch selectedTheme {
        case .light: return .light
        case .dark: return .dark
        case .system: return nil
        }
    }
}

// View Extension
extension View {
    func withThemeSupport() -> some View {
        self.preferredColorScheme(ThemeManager.shared.colorScheme)
    }
}
```

### Conditional Modifiers

```swift
extension View {
    @ViewBuilder
    func `if`<Transform: View>(
        _ condition: Bool,
        transform: (Self) -> Transform
    ) -> some View {
        if condition {
            transform(self)
        } else {
            self
        }
    }
}

// Usage
Text("Hello")
    .if(isHighlighted) { $0.foregroundStyle(.yellow) }
```

### PreferenceKey for Layout

```swift
struct HeightPreferenceKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = max(value, nextValue())
    }
}

extension View {
    func readHeight(_ height: Binding<CGFloat>) -> some View {
        self.background(
            GeometryReader { geo in
                Color.clear.preference(
                    key: HeightPreferenceKey.self,
                    value: geo.size.height
                )
            }
        )
        .onPreferenceChange(HeightPreferenceKey.self) { height.wrappedValue = $0 }
    }
}
```

### Custom Transitions

```swift
extension AnyTransition {
    static var slideAndFade: AnyTransition {
        .asymmetric(
            insertion: .move(edge: .bottom).combined(with: .opacity),
            removal: .scale.combined(with: .opacity)
        )
    }
}
```

---

## 9. Accessibility Requirements

### Must-Have Accessibility Features

1. **VoiceOver Support** (mandatory)
   - All interactive elements have accessibility labels
   - Custom actions for complex gestures
   - Proper trait assignments

2. **Dynamic Type** (mandatory)
   - All text scales with system settings
   - Layout adapts to larger sizes
   - No truncation at accessibility sizes

3. **Reduce Motion** (mandatory)
   - Alternative animations for motion-sensitive users
   - Respect `UIAccessibility.isReduceMotionEnabled`

4. **High Contrast** (recommended)
   - Support Increase Contrast setting
   - Ensure 4.5:1 contrast ratio minimum

### Implementation

```swift
struct AccessibleButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
        }
        .accessibilityLabel(title)
        .accessibilityHint("Double tap to activate")
        .accessibilityAddTraits(.isButton)
    }
}

// Reduce Motion Support
@Environment(\.accessibilityReduceMotion) var reduceMotion

withAnimation(reduceMotion ? .none : .spring()) {
    // Animation
}
```

---

## 10. Premium App Patterns

### Things 3 Patterns (Gold Standard)

- **Magic Plus Button**: Liquid, deformable button responding to movement
- **8pt Grid**: Apple-aligned spacing system
- **Local-First**: Instant launch, no network blocking
- **Celebratory Empty States**: "All Clear" with cheerful messaging
- **Spring Physics**: Natural bounce on drag-drop (damping ~0.8)

### Linear Patterns (Technical Excellence)

- **Dark Mode First**: Designed primarily for dark interfaces
- **Optimistic Updates**: UI updates before server confirmation
- **Keyboard-First**: Extensive shortcuts for power users
- **Skeleton UI**: Content structure placeholders

### Fantastical Patterns (Calendar Excellence)

- **Natural Language Input**: Parse "Meeting tomorrow at 3pm"
- **DayTicker View**: Unique horizontal date scroller
- **Color-Coded Events**: Visual calendar hierarchy
- **Widget Library**: 16+ home screen widgets

### Bear Patterns (Writing Excellence)

- **Minimal Chrome**: Editor maximizes content space
- **28 Themes**: Curated color palette collection
- **Focus Mode**: Sentence/paragraph highlighting
- **Instant Access**: Local-first, no loading delays

---

## 11. Recommended Libraries

### Essential Libraries

| Library | Use Case | Platform |
|---------|----------|----------|
| **PopupView** | Toasts, popups, modals | iOS 13+ |
| **SwiftUI-Introspect** | UIKit/AppKit access | iOS 13+ |
| **Lottie** | Vector animations | iOS 13+ |
| **SDWebImageSwiftUI** | Async image loading | iOS 14+ |
| **ConfettiSwiftUI** | Celebration animations | iOS 14+ |
| **AlertToast** | Apple-style notifications | iOS 13+ |
| **BottomSheet** | Maps-style draggable sheets | iOS 15+ |
| **SwiftUI-Shimmer** | Skeleton loading effects | iOS 13+ |

### When to Use Native vs Library

| Need | Recommendation |
|------|----------------|
| Basic sheets | Native `.sheet()` |
| Custom bottom sheets | BottomSheet library |
| Simple toasts | Custom implementation |
| Complex toasts | AlertToast or PopupView |
| Animations | Native SwiftUI (prefer) |
| Complex animations | Lottie |
| Image loading | Native `AsyncImage` or SDWebImage |

---

## 12. Implementation Checklist

### Phase 1: Foundation
- [ ] Define design tokens in code
- [ ] Set up color assets (light/dark)
- [ ] Create typography scale
- [ ] Implement spacing constants
- [ ] Set up animation presets

### Phase 2: Core Components
- [ ] Button variants (default, outline, ghost, etc.)
- [ ] Card component
- [ ] Input fields with validation states
- [ ] Toast/notification system
- [ ] Loading states (skeleton, shimmer)

### Phase 3: Patterns
- [ ] Navigation structure
- [ ] Sheet/modal presentations
- [ ] List patterns with swipe actions
- [ ] Empty states
- [ ] Error states

### Phase 4: Accessibility
- [ ] VoiceOver labels on all elements
- [ ] Dynamic Type support
- [ ] Reduce Motion alternatives
- [ ] High contrast testing

### Phase 5: Polish
- [ ] Haptic feedback integration
- [ ] Micro-interactions
- [ ] Gesture refinement
- [ ] Performance optimization

---

## Sources

### Apple Resources
- [WWDC 2023: Animate with Springs](https://developer.apple.com/videos/play/wwdc2023/10158/)
- [WWDC 2018: Designing Fluid Interfaces](https://developer.apple.com/videos/play/wwdc2018/803/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Apple Design Awards](https://developer.apple.com/design/awards/)

### Design Systems
- [Material Design 3 Tokens](https://m3.material.io/foundations/design-tokens)
- [W3C Design Tokens Specification](https://www.designtokens.org/tr/drafts/format/)
- [shadcn/ui Documentation](https://ui.shadcn.com/docs)

### Premium App References
- [Things 3](https://culturedcode.com/things/)
- [Linear](https://linear.app)
- [Fantastical](https://flexibits.com/fantastical)
- [Bear](https://bear.app)
- [Craft](https://craft.do)

### Animation Resources
- [SwiftUI Spring Animations Guide](https://github.com/GetStream/swiftui-spring-animations)
- [60fps.design](https://60fps.design)
- [Fluid Interfaces Implementation](https://github.com/nathangitter/fluid-interfaces)

### Libraries
- [PopupView](https://github.com/exyte/PopupView)
- [SwiftUI-Introspect](https://github.com/siteline/SwiftUI-Introspect)
- [Lottie iOS](https://github.com/airbnb/lottie-ios)
- [ConfettiSwiftUI](https://github.com/simibac/ConfettiSwiftUI)
- [SwiftUI-Shimmer](https://github.com/markiv/SwiftUI-Shimmer)
