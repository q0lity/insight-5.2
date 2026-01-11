# Accessibility Excellence Research

> Implementation guide for building world-class accessibility in Insight 5 iOS app.

---

## Table of Contents

1. [WCAG 2.2 Compliance](#wcag-22-compliance)
2. [iOS VoiceOver Optimization](#ios-voiceover-optimization)
3. [VoiceOver Deep Dive](#voiceover-deep-dive)
4. [Dynamic Type Support](#dynamic-type-support)
5. [Dynamic Type Deep Dive](#dynamic-type-deep-dive)
6. [Visual Accessibility Modes](#visual-accessibility-modes)
7. [Exemplary Implementations](#exemplary-implementations)
8. [Advanced Patterns](#advanced-patterns)
9. [Testing Workflows](#testing-workflows)
10. [Implementation Checklist](#implementation-checklist)

---

## WCAG 2.2 Compliance

### Overview

WCAG 2.2 is the current accessibility standard (ISO/IEC 40500:2025). Level AA is the legal compliance standard; Level AAA is enhanced (optional, not achievable for all content).

**Key statistic**: Automated tools catch ~30% of issues. Manual testing with assistive technologies catches the remaining 70%.

### Level AA Requirements (86 criteria)

#### Perceivable

| Criterion | Requirement | iOS Implementation |
|-----------|-------------|-------------------|
| **1.1.1 Non-text Content** | All non-text content has text alternative | `.accessibilityLabel()` on images, icons |
| **1.3.1 Info and Relationships** | Structure/relationships conveyed programmatically | Semantic grouping, `.accessibilityAddTraits(.isHeader)` |
| **1.3.4 Orientation** | Content not restricted to single orientation | Support both portrait and landscape |
| **1.4.1 Use of Color** | Color not sole means of conveying info | Use icons, patterns, text alongside color |
| **1.4.3 Contrast (Minimum)** | 4.5:1 for normal text, 3:1 for large text | Use semantic colors, test with Accessibility Inspector |
| **1.4.4 Resize Text** | Text resizable to 200% without loss | Dynamic Type support |
| **1.4.10 Reflow** | Content reflows without horizontal scroll | Adaptive layouts with `ViewThatFits` |
| **1.4.11 Non-text Contrast** | 3:1 for UI components and graphics | Check button borders, icons |
| **1.4.12 Text Spacing** | No loss with increased spacing | Test with iOS text size settings |

#### Operable

| Criterion | Requirement | iOS Implementation |
|-----------|-------------|-------------------|
| **2.1.1 Keyboard** | All functionality keyboard accessible | VoiceOver gestures, Switch Control |
| **2.4.3 Focus Order** | Logical navigation sequence | `.accessibilitySortPriority()` |
| **2.4.6 Headings and Labels** | Descriptive headings and labels | `.accessibilityAddTraits(.isHeader)` |
| **2.4.7 Focus Visible** | Visible focus indicator | System focus rings, custom focus states |
| **2.4.11 Focus Not Obscured** | Focused element not hidden | Check sticky headers, modals |
| **2.5.1 Pointer Gestures** | Single pointer alternative for multipoint gestures | Provide button alternatives |
| **2.5.5 Target Size** | Minimum 44×44pt touch targets | Check all interactive elements |
| **2.5.8 Target Size (Minimum)** | At least 24×24pt with spacing | Verify button spacing |

#### Understandable

| Criterion | Requirement | iOS Implementation |
|-----------|-------------|-------------------|
| **3.2.1 On Focus** | No context change on focus | Avoid auto-submit on focus |
| **3.2.2 On Input** | No unexpected context change | Warn before navigation changes |
| **3.3.1 Error Identification** | Errors described in text | Clear error messages with `.accessibilityValue()` |
| **3.3.2 Labels or Instructions** | Input has labels | Every form field has label |
| **3.3.7 Redundant Entry** | Don't require re-entry of same info | Auto-fill, persistence |

#### Robust

| Criterion | Requirement | iOS Implementation |
|-----------|-------------|-------------------|
| **4.1.2 Name, Role, Value** | Components have accessible name/role | Labels, traits, values set correctly |
| **4.1.3 Status Messages** | Status conveyed without focus | `.accessibilityAnnouncement()` |

### WCAG 2.2 New Success Criteria

Nine new criteria focus on cognitive disabilities, motor impairments, and touch screens:

1. **2.4.11 Focus Not Obscured (Minimum)** - AA
2. **2.4.12 Focus Not Obscured (Enhanced)** - AAA
3. **2.4.13 Focus Appearance** - AAA
4. **2.5.7 Dragging Movements** - AA: Provide non-drag alternatives
5. **2.5.8 Target Size (Minimum)** - AA: 24×24pt minimum
6. **3.2.6 Consistent Help** - A: Help in consistent location
7. **3.3.7 Redundant Entry** - A: Don't require re-entering data
8. **3.3.8 Accessible Authentication (Minimum)** - AA: No cognitive function tests
9. **3.3.9 Accessible Authentication (Enhanced)** - AAA

---

## iOS VoiceOver Optimization

### Essential Modifiers

```swift
// Basic labeling
.accessibilityLabel("Record voice note")    // What the element IS
.accessibilityHint("Double tap to start")   // How to interact
.accessibilityValue("3 of 5")               // Current state

// Traits
.accessibilityAddTraits(.isHeader)          // Navigation landmark
.accessibilityAddTraits(.isButton)          // Interactive element
.accessibilityAddTraits(.isSelected)        // Selection state
.accessibilityRemoveTraits(.isImage)        // Remove automatic traits

// Identification
.accessibilityIdentifier("record_button")   // For UI testing
```

### Reading Order

VoiceOver reads top-to-bottom, left-to-right by default. Adjust with:

```swift
.accessibilitySortPriority(1)  // Higher = read first
```

### Hidden vs Combined Elements

```swift
// Hide decorative elements
.accessibilityHidden(true)

// Combine related elements into one
VStack {
    Text("Temperature")
    Text("72°F")
}
.accessibilityElement(children: .combine)
// VoiceOver reads: "Temperature, 72 degrees F"
```

### Custom Actions

```swift
.accessibilityAction(named: "Delete") {
    deleteItem()
}
.accessibilityAction(named: "Edit") {
    editItem()
}
// User accesses via VoiceOver actions menu (swipe up/down)
```

### Speech Customization

```swift
.speechAlwaysIncludesPunctuation()
.speechSpellsOutCharacters()  // Spell out passwords
.speechAdjustedPitch(1.2)     // Higher pitch for emphasis
```

### Announcements

```swift
// Post announcement for dynamic changes
UIAccessibility.post(
    notification: .announcement,
    argument: "Recording started"
)

// Screen changed notification
UIAccessibility.post(
    notification: .screenChanged,
    argument: nil
)
```

### Testing Protocol

1. Enable VoiceOver: Settings > Accessibility > VoiceOver
2. Practice gestures:
   - Single tap: Select item
   - Double tap: Activate
   - Three-finger swipe: Scroll
   - Two-finger rotation: Rotor
3. Test every screen with VoiceOver
4. Verify logical reading order
5. Confirm all actions are accessible
6. Test with Accessibility Inspector in Xcode

---

## VoiceOver Deep Dive

### Complete Gesture Reference

#### One-Finger Gestures
| Gesture | Action |
|---------|--------|
| Tap | Select item under finger |
| Double tap | Activate selected item |
| Triple tap | Double-tap the item |
| Swipe left/right | Move to previous/next element |
| Swipe up/down | Depends on rotor setting |
| Double tap and hold | Change item's label |

#### Two-Finger Gestures
| Gesture | Action |
|---------|--------|
| Tap | Pause/resume speech |
| Swipe up | Read all from top |
| Swipe down | Read all from current position |
| Double tap | Start/stop current action (play/pause) |
| Scrub (Z shape) | **Escape** - dismiss alert, go back |
| Triple tap | Open Item Chooser |
| Quadruple tap | Open VoiceOver Quick Settings |

#### Three-Finger Gestures
| Gesture | Action |
|---------|--------|
| Tap | Speak additional info (position, selection) |
| Swipe up/down | Scroll one page |
| Swipe left/right | Go to previous/next page |
| Triple tap | Mute/unmute VoiceOver |
| Quadruple tap | Screen curtain on/off |

#### Four-Finger Gestures
| Gesture | Action |
|---------|--------|
| Tap at top | Jump to first item |
| Tap at bottom | Jump to last item |
| Swipe left/right | Switch between apps |

#### Rotor Gesture
Rotate two fingers like turning a dial to cycle through rotor options:
- Characters, Words, Lines
- Headings, Links, Form Controls
- Containers, Landmarks
- Custom rotors you define

### Custom Content for Data-Rich Views

Use `accessibilityCustomContent` to prioritize information:

```swift
struct MovieCard: View {
    let movie: Movie

    var body: some View {
        VStack {
            AsyncImage(url: movie.posterURL)
            Text(movie.title)
            Text(movie.rating)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(movie.title)
        // High importance - read immediately
        .accessibilityCustomContent("Rating", "\(movie.rating) stars", importance: .high)
        // Default importance - accessible via rotor "More Content"
        .accessibilityCustomContent("Runtime", movie.runtime)
        .accessibilityCustomContent("Genre", movie.genres.joined(separator: ", "))
        .accessibilityCustomContent("Director", movie.director)
        .accessibilityCustomContent("Synopsis", movie.synopsis)
    }
}
```

**User experience**: VoiceOver reads "Inception, 4.5 stars". User can swipe up/down in "More Content" rotor to hear runtime, genre, director, synopsis.

### Reusable Custom Content Keys

```swift
extension AccessibilityCustomContentKey {
    static let rating = AccessibilityCustomContentKey("Rating")
    static let duration = AccessibilityCustomContentKey("Duration")
    static let category = AccessibilityCustomContentKey("Category")
}

// Usage
.accessibilityCustomContent(.rating, "\(item.rating) out of 5")
.accessibilityCustomContent(.duration, item.formattedDuration)
```

### Adjustable Controls

For sliders, steppers, and custom value controls:

```swift
struct RatingView: View {
    @Binding var rating: Int  // 1-5

    var body: some View {
        HStack {
            ForEach(1...5, id: \.self) { star in
                Image(systemName: star <= rating ? "star.fill" : "star")
            }
        }
        .accessibilityElement()
        .accessibilityLabel("Rating")
        .accessibilityValue("\(rating) of 5 stars")
        .accessibilityAdjustableAction { direction in
            switch direction {
            case .increment:
                rating = min(5, rating + 1)
            case .decrement:
                rating = max(1, rating - 1)
            @unknown default:
                break
            }
        }
    }
}
```

**User experience**: VoiceOver says "Rating, 3 of 5 stars, adjustable". User swipes up to increment, down to decrement.

### Using accessibilityRepresentation

Replace custom control with standard accessible representation:

```swift
struct CustomSlider: View {
    @Binding var value: Double

    var body: some View {
        // Custom visual implementation
        GeometryReader { geometry in
            // ... custom drawing
        }
        .accessibilityRepresentation {
            Slider(value: $value, in: 0...100)
                .accessibilityLabel("Volume")
        }
    }
}
```

**Caution**: There's a known bug where VoiceOver can skip custom sliders using `.accessibilityRepresentation`. Test thoroughly.

### Voice Control Support

Provide alternative activation phrases for Voice Control users:

```swift
Button(action: sendMessage) {
    Image(systemName: "paperplane.fill")
}
.accessibilityLabel("Send message")
.accessibilityInputLabels(["Send", "Send message", "Submit", "Post"])
```

**Best practices for `accessibilityInputLabels`:**
- Keep labels short (1-2 words ideal)
- Limit to 4 labels maximum
- VoiceOver label can be descriptive; Voice Control labels should be concise
- Only add to interactive elements, not all views

### Accessibility Children and Representation

```swift
// Transform accessibility tree for custom views
.accessibilityChildren {
    // Provide virtual accessibility elements
    ForEach(dataPoints) { point in
        Rectangle()
            .frame(width: 44, height: 44)
            .accessibilityLabel(point.label)
            .accessibilityValue(point.value)
    }
}
```

Use for:
- Custom charts/graphs
- Canvas-drawn interfaces
- Game elements
- Complex visualizations

### Drag and Drop Accessibility

```swift
// Define multiple drop points for VoiceOver
.accessibilityDropPoint(.leading, description: "Add to beginning")
.accessibilityDropPoint(.center, description: "Replace current")
.accessibilityDropPoint(.trailing, description: "Add to end")
```

**Best practice**: Always provide a non-drag alternative via `.accessibilityAction()`.

---

## Dynamic Type Support

### The 12 Text Sizes

Dynamic Type provides 12 sizes across 11 text styles (132 total variations):

| Size Category | Scale |
|--------------|-------|
| `xSmall` | Smallest |
| `small` | |
| `medium` | |
| `large` | Default |
| `xLarge` | |
| `xxLarge` | |
| `xxxLarge` | |
| `accessibility1` | Accessibility sizes |
| `accessibility2` | |
| `accessibility3` | |
| `accessibility4` | |
| `accessibility5` | Largest |

### Text Styles and Default Sizes

| Style | Default Size (pt) |
|-------|-------------------|
| `largeTitle` | 34 |
| `title` | 28 |
| `title2` | 22 |
| `title3` | 20 |
| `headline` | 17 (bold) |
| `body` | 17 |
| `callout` | 16 |
| `subheadline` | 15 |
| `footnote` | 13 |
| `caption` | 12 |
| `caption2` | 11 |

### SwiftUI Implementation

```swift
// System fonts - automatic scaling
Text("Hello")
    .font(.body)  // Automatically scales

// Custom fonts - use scaled modifier
Text("Hello")
    .font(.custom("MyFont", size: 17, relativeTo: .body))

// Or use UIFontMetrics in UIKit
let metrics = UIFontMetrics(forTextStyle: .body)
let scaledFont = metrics.scaledFont(for: customFont)
```

### Adaptive Layouts

```swift
// Detect current size category
@Environment(\.dynamicTypeSize) var dynamicTypeSize

// Adapt layout for accessibility sizes
var body: some View {
    if dynamicTypeSize.isAccessibilitySize {
        VStack { content }  // Stack vertically for large text
    } else {
        HStack { content }  // Side by side for normal sizes
    }
}

// Or use ViewThatFits (iOS 16+)
ViewThatFits {
    HStack { content }
    VStack { content }
}
```

### Limiting Range (Use Sparingly)

```swift
// Only when absolutely necessary for layout constraints
Text("Tab Label")
    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
```

### Testing

1. Settings > Accessibility > Display & Text Size > Larger Text
2. Test all 12 sizes, especially accessibility sizes
3. Verify no text truncation
4. Check layout adaptations
5. Use Xcode previews with `@Environment(\.dynamicTypeSize)`

---

## Dynamic Type Deep Dive

### @ScaledMetric Property Wrapper

Scale non-text values (spacing, icons, images) with Dynamic Type:

```swift
struct CardView: View {
    // Scales relative to .body by default
    @ScaledMetric var iconSize: CGFloat = 24
    @ScaledMetric var padding: CGFloat = 16
    @ScaledMetric var spacing: CGFloat = 8

    // Scale relative to specific text style
    @ScaledMetric(relativeTo: .largeTitle) var headerIconSize: CGFloat = 32

    var body: some View {
        VStack(spacing: spacing) {
            Image(systemName: "star.fill")
                .font(.system(size: iconSize))
            Text("Content")
                .padding(padding)
        }
    }
}
```

**Scaling behavior by text style:**
| Text Style | xSmall | Default | AX5 (largest) |
|------------|--------|---------|---------------|
| `largeTitle` | ~14.7pt | 34pt | ~27.3pt |
| `body` | ~14pt | 17pt | ~53pt |
| `caption` | ~11pt | 12pt | ~40pt |

Title styles scale least (already large). Caption/footnote scale most dramatically.

### Adaptive Images and Symbols

```swift
// SF Symbols automatically scale with font
Image(systemName: "heart.fill")
    .font(.body)  // Scales with Dynamic Type

// Scale custom images
@ScaledMetric var imageHeight: CGFloat = 100

AsyncImage(url: imageURL) { image in
    image.resizable()
         .scaledToFit()
         .frame(height: imageHeight)
} placeholder: {
    ProgressView()
}
```

**Best practice**: Decorative images shouldn't scale (waste screen space). Essential images should scale.

```swift
@Environment(\.dynamicTypeSize) var typeSize

var body: some View {
    if !typeSize.isAccessibilitySize {
        // Show decorative image only at smaller sizes
        Image("decorative-hero")
    }
    // Always show essential content
    Text(article.body)
}
```

### Advanced Adaptive Layouts

#### Using AnyLayout (iOS 16+)

```swift
struct AdaptiveStack<Content: View>: View {
    @Environment(\.dynamicTypeSize) var typeSize
    let content: () -> Content

    var layout: AnyLayout {
        typeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 12))
            : AnyLayout(HStackLayout(spacing: 8))
    }

    var body: some View {
        layout {
            content()
        }
    }
}

// Usage
AdaptiveStack {
    Image(systemName: "person.circle")
    Text("Username")
    Spacer()
    Text("Details")
}
```

#### Using ViewThatFits (iOS 16+)

```swift
// SwiftUI automatically chooses first view that fits
ViewThatFits(in: .horizontal) {
    // Try horizontal first
    HStack {
        icon
        title
        Spacer()
        value
    }
    // Fall back to vertical if horizontal doesn't fit
    VStack(alignment: .leading) {
        HStack {
            icon
            title
        }
        value
    }
}
```

### Handling Text Truncation

```swift
// Allow text to wrap
Text(longString)
    .fixedSize(horizontal: false, vertical: true)
    .lineLimit(nil)

// Minimum scale factor for constrained spaces
Text("Tab Label")
    .minimumScaleFactor(0.7)
    .lineLimit(1)

// Detect truncation programmatically
@State private var isTruncated = false

Text(title)
    .background(
        GeometryReader { geometry in
            Color.clear.onAppear {
                // Compare intrinsic size to actual size
            }
        }
    )
```

### Restricting Dynamic Type Range (Use Sparingly)

```swift
// Restrict maximum size
Text("Tab Label")
    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)

// Restrict minimum size
Text("Legal disclaimer")
    .dynamicTypeSize(DynamicTypeSize.medium...)

// Fixed range
Text("Badge")
    .dynamicTypeSize(DynamicTypeSize.small...DynamicTypeSize.large)
```

**Apple's guidance**: "Please do not use this API to unduly limit text size. These settings serve an extremely important function."

Only restrict when:
- Tab bar labels (system restricts these)
- Navigation bar titles (space-constrained)
- Fixed-size badges or indicators
- Legal requirement for specific size

### Custom Fonts with Dynamic Type

```swift
// Method 1: relativeTo parameter (iOS 14+)
Text("Custom Styled")
    .font(.custom("Avenir-Heavy", size: 17, relativeTo: .body))

// Method 2: UIFontMetrics (UIKit interop)
extension UIFont {
    static func scaledFont(name: String, size: CGFloat, textStyle: UIFont.TextStyle) -> UIFont {
        guard let customFont = UIFont(name: name, size: size) else {
            return UIFont.preferredFont(forTextStyle: textStyle)
        }
        let metrics = UIFontMetrics(forTextStyle: textStyle)
        return metrics.scaledFont(for: customFont)
    }
}

// Method 3: Custom ViewModifier
struct ScaledFont: ViewModifier {
    @Environment(\.dynamicTypeSize) var typeSize
    let name: String
    let baseSize: CGFloat
    let textStyle: Font.TextStyle

    func body(content: Content) -> some View {
        let scaledSize = UIFontMetrics(forTextStyle: textStyle.uiKit)
            .scaledValue(for: baseSize)
        content.font(.custom(name, size: scaledSize))
    }
}
```

### Size Category Thresholds

```swift
@Environment(\.dynamicTypeSize) var typeSize

var body: some View {
    Group {
        if typeSize < .large {
            CompactLayout()
        } else if typeSize < .accessibility1 {
            StandardLayout()
        } else {
            AccessibilityLayout()
        }
    }
}

// Check specific thresholds
extension DynamicTypeSize {
    var isSmall: Bool { self < .large }
    var isLarge: Bool { self >= .xLarge && !isAccessibilitySize }
    // .isAccessibilitySize is built-in
}
```

### Xcode Preview Testing

```swift
struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            ContentView()
                .previewDisplayName("Default")

            ContentView()
                .dynamicTypeSize(.xSmall)
                .previewDisplayName("XSmall")

            ContentView()
                .dynamicTypeSize(.xxxLarge)
                .previewDisplayName("XXXLarge")

            ContentView()
                .dynamicTypeSize(.accessibility5)
                .previewDisplayName("AX5 - Largest")
        }
    }
}
```

---

## Visual Accessibility Modes

### Reduce Motion

```swift
@Environment(\.accessibilityReduceMotion) var reduceMotion

var body: some View {
    content
        .animation(reduceMotion ? nil : .spring(), value: isAnimating)
}

// Alternative: provide subtle animation instead of none
.animation(reduceMotion ? .easeInOut(duration: 0.1) : .spring(), value: state)
```

**Best practices:**
- Replace bouncy/spring animations with fade or simple easing
- Disable parallax effects
- Stop auto-playing videos
- Remove infinite loops
- Reduce or eliminate motion in transitions

### Increase Contrast

```swift
@Environment(\.colorSchemeContrast) var contrast

var body: some View {
    Rectangle()
        .fill(contrast == .increased ? .black : .gray)
}
```

**Best practices:**
- Increase border thickness
- Use solid colors instead of gradients
- Darken text colors
- Add visible dividers between sections

### Reduce Transparency

```swift
@Environment(\.accessibilityReduceTransparency) var reduceTransparency

var body: some View {
    content
        .background(reduceTransparency ? Color.black : Color.black.opacity(0.8))
}

// iOS 26 Liquid Glass
.glassEffect(reduceTransparency ? .identity : .regular)
```

### Smart Invert Compatibility

Mark images and media to exclude from inversion:

```swift
Image("photo")
    .accessibilityIgnoresInvertColors(true)
```

**Exclude:**
- Photos and images
- Video content
- App icons
- Color-critical graphics

### Bold Text

```swift
@Environment(\.legibilityWeight) var legibilityWeight

var body: some View {
    Text("Content")
        .fontWeight(legibilityWeight == .bold ? .bold : .regular)
}
```

### Differentiate Without Color

```swift
@Environment(\.accessibilityDifferentiateWithoutColor) var differentiateWithoutColor

var body: some View {
    if differentiateWithoutColor {
        // Add icons or patterns alongside colors
        HStack {
            Image(systemName: "checkmark.circle.fill")
            Text("Success")
        }
        .foregroundColor(.green)
    } else {
        Text("Success")
            .foregroundColor(.green)
    }
}
```

### Button Shapes

```swift
@Environment(\.accessibilityShowButtonShapes) var showButtonShapes

var body: some View {
    Text("Tap me")
        .padding()
        .background(showButtonShapes ? Color.blue.opacity(0.1) : .clear)
        .overlay(showButtonShapes ? RoundedRectangle(cornerRadius: 8).stroke() : nil)
}
```

**Note:** Standard SwiftUI buttons with `.borderedProminent` or `.bordered` styles automatically respect this setting.

### On/Off Labels

The system automatically shows "I" and "O" on toggles when enabled. For custom toggles, check:

```swift
// UIKit
UIAccessibility.isOnOffSwitchLabelsEnabled

// Ensure custom toggles display state clearly regardless of this setting
```

---

## Exemplary Implementations

### Apple's Native Apps (Best in Class)

**What makes them excellent:**
- Perfect VoiceOver integration with meaningful labels
- Complete Dynamic Type support across all text
- Seamless adaptation to all accessibility settings
- Consistent gestures and navigation patterns
- Haptic feedback for confirmations and errors
- Sound cues paired with visual feedback

**Patterns to emulate:**
- Settings app: Clear section headers, consistent row layouts
- Messages: Rotor support for navigating conversations
- Maps: Audio descriptions, alternative representations
- Health: Data visualization with accessible alternatives

### Seeing AI (Microsoft)

**Key innovations:**
- Self-voicing interface (works without VoiceOver enabled)
- Large, bold text by default
- Customizable voice speed independent of system
- Audio beeps guide barcode scanning (continuous feedback)
- Spoken hints for document capture ("move camera down")
- Real-time text recognition with immediate speech

**Patterns to adopt:**
- Proactive audio feedback during complex tasks
- Multiple modes of output (speech, sound, haptic)
- Guidance through multi-step processes
- Clear affordances for camera-based features

### Be My Eyes

**Design philosophy:**
- High contrast blue/white design
- Simple, minimal interface
- Easy inversion compatibility
- Large touch targets
- Clear call-to-action buttons

**Patterns to adopt:**
- Simplicity over feature density
- Color scheme designed for easy inversion
- Minimal cognitive load
- Single primary action per screen

### Voice Dream Reader

**Excellence in text accessibility:**
- VoiceOver-friendly text selection (no pinch gestures)
- Custom rotor integration for document navigation
- High contrast and large font options built-in
- Adjustable speech rate and voice
- Document structure navigation (headings, paragraphs)
- Two-finger double-tap to play/pause

**Patterns to adopt:**
- Alternative gestures for complex interactions
- Built-in customization beyond system settings
- Keyboard shortcuts for common actions
- Reading position persistence

---

## Advanced Patterns

### Semantic Grouping

```swift
// Combine related elements
HStack {
    Image(systemName: "sun.max")
    Text("Sunny")
    Text("72°")
}
.accessibilityElement(children: .combine)
// Reads as single element: "sun max, Sunny, 72 degrees"

// With custom label for better experience
.accessibilityElement(children: .ignore)
.accessibilityLabel("Weather: Sunny, 72 degrees")
```

### Accessibility Containers

```swift
// Group for navigation
VStack {
    Text("Ingredients")
        .accessibilityAddTraits(.isHeader)

    ForEach(ingredients) { ingredient in
        Text(ingredient.name)
    }
}
.accessibilityElement(children: .contain)
// Creates a container - items accessible individually but grouped
```

**Child behaviors:**
| Behavior | Use Case |
|----------|----------|
| `.ignore` | Custom label replacing children |
| `.combine` | Related info as single element |
| `.contain` | Grouped but individually accessible |

### Custom Rotor Actions

```swift
// Create custom rotor for quick navigation
.accessibilityRotor("Headings") {
    ForEach(sections) { section in
        AccessibilityRotorEntry(section.title, id: section.id)
    }
}

// With text range for document navigation
.accessibilityRotor("Links") {
    ForEach(links) { link in
        AccessibilityRotorEntry(link.text, textRange: link.range)
    }
}
```

**Common rotor categories:**
- Headings
- Links
- Form controls
- Images
- Tables
- Custom landmarks

### Focus Management

```swift
@AccessibilityFocusState private var isFocused: Bool

// Or with enum for multiple fields
enum Field { case title, description, submit }
@AccessibilityFocusState private var focusedField: Field?

var body: some View {
    VStack {
        TextField("Title", text: $title)
            .accessibilityFocused($focusedField, equals: .title)

        Button("Submit") {
            submit()
            focusedField = nil  // Clear focus
        }
    }
    .onAppear {
        focusedField = .title  // Set initial focus
    }
}
```

### Modal Focus Trapping

```swift
// Trap focus inside modal
CustomModal()
    .accessibilityAddTraits(.isModal)
    .accessibilityAction(.escape) {
        dismiss()
    }
```

### Haptic Feedback Patterns

```swift
// Notification feedback
let notificationGenerator = UINotificationFeedbackGenerator()
notificationGenerator.prepare()
notificationGenerator.notificationOccurred(.success)  // .warning, .error

// Impact feedback
let impactGenerator = UIImpactFeedbackGenerator(style: .medium)  // .light, .heavy, .soft, .rigid
impactGenerator.prepare()
impactGenerator.impactOccurred()

// Selection feedback
let selectionGenerator = UISelectionFeedbackGenerator()
selectionGenerator.prepare()
selectionGenerator.selectionChanged()
```

**Semantic usage:**
| Generator | Use For |
|-----------|---------|
| `UINotificationFeedbackGenerator` | Task completion, errors, warnings |
| `UIImpactFeedbackGenerator` | UI collisions, snapping into place |
| `UISelectionFeedbackGenerator` | Scrolling through options, selection changes |

**Best practices:**
- Always match haptic to visual change
- Never surprise users with unexpected haptics
- Use `.prepare()` to reduce latency
- Don't overuse - diminishes significance
- Pair with audio for multi-modal feedback

### Custom Announcements

```swift
// Announce changes without moving focus
func announceProgress(_ progress: Float) {
    let announcement = "Progress: \(Int(progress * 100)) percent"
    UIAccessibility.post(notification: .announcement, argument: announcement)
}

// Page change
func announcePage(_ page: Int) {
    UIAccessibility.post(notification: .pageScrolled, argument: "Page \(page)")
}
```

---

## Testing Workflows

### Xcode Accessibility Inspector

Launch: Xcode > Open Developer Tool > Accessibility Inspector

#### Inspection Mode

1. Select target (Simulator or connected device)
2. Click crosshair icon to enable inspection
3. Hover over or tap UI elements
4. Inspector shows:
   - **Label**: What VoiceOver reads
   - **Value**: Current state
   - **Traits**: Button, header, etc.
   - **Identifier**: For UI testing
   - **Hint**: Usage instructions

#### Built-in VoiceOver Simulation

1. Click speaker icon in Inspector
2. Navigate using Next/Previous buttons
3. Hear what VoiceOver would speak
4. Verify reading order and content

**Limitation**: Doesn't perfectly replicate real VoiceOver. Always test on actual device.

#### Running Automated Audits

1. Click "Audit" button (checkmark icon)
2. Select audit categories:
   - Element Description (missing labels)
   - Contrast (color contrast issues)
   - Hit Region (touch targets < 44pt)
   - Trait (missing traits)
3. Click "Run Audit"
4. Review issues with severity levels

**Important**: Audits catch ~30% of issues. Many results are false positives. Manual verification required.

### Automated UI Test Audits (iOS 17+)

```swift
import XCTest

class AccessibilityTests: XCTestCase {
    func testAccessibilityAudit() throws {
        let app = XCUIApplication()
        app.launch()

        // Navigate to screen
        app.buttons["Profile"].tap()

        // Run accessibility audit - fails test if issues found
        try app.performAccessibilityAudit()
    }

    func testAccessibilityAuditWithOptions() throws {
        let app = XCUIApplication()
        app.launch()

        // Audit specific categories
        try app.performAccessibilityAudit(for: [
            .dynamicType,
            .contrast,
            .hitRegion
        ])
    }

    func testAccessibilityAuditIgnoringKnownIssues() throws {
        let app = XCUIApplication()
        app.launch()

        // Ignore specific issues
        try app.performAccessibilityAudit { issue in
            // Return true to ignore this issue
            if issue.element?.label == "decorativeImage" {
                return true
            }
            return false
        }
    }
}
```

### Manual VoiceOver Testing Protocol

#### Setup
1. Enable VoiceOver: Settings > Accessibility > VoiceOver
2. Enable VoiceOver Practice: VoiceOver settings > VoiceOver Practice
3. Set up accessibility shortcut: Triple-click side button for quick toggle

#### Testing Checklist

For each screen:

1. **Navigation Flow**
   - [ ] Swipe right through all elements
   - [ ] Verify logical order (top-to-bottom, left-to-right)
   - [ ] No elements skipped
   - [ ] No unexpected focus jumps

2. **Element Quality**
   - [ ] Every element has meaningful label
   - [ ] No "button" or "image" without context
   - [ ] Values reflect current state
   - [ ] Hints explain non-obvious interactions

3. **Headings**
   - [ ] Section headers marked as `.isHeader`
   - [ ] Navigate using Headings rotor
   - [ ] Logical heading hierarchy

4. **Interactions**
   - [ ] Double-tap activates all buttons
   - [ ] Custom actions accessible via swipe up/down
   - [ ] Adjustable controls respond to swipes
   - [ ] Escape gesture (Z scrub) dismisses modals

5. **Dynamic Content**
   - [ ] Loading states announced
   - [ ] Errors announced clearly
   - [ ] Success confirmations announced
   - [ ] No silent failures

#### Recording VoiceOver Sessions

Use Screen Recording with microphone to capture VoiceOver audio. Useful for:
- Bug reports
- Documentation
- Team training

### Voice Control Testing

1. Enable: Settings > Accessibility > Voice Control
2. Say "Show names" to see all recognized elements
3. Say "Show numbers" for quick navigation
4. Test commands:
   - "Tap [label]"
   - "Swipe up"
   - "Go back"

Verify custom `accessibilityInputLabels` work with Voice Control.

### Switch Control Testing

1. Enable: Settings > Accessibility > Switch Control
2. Configure switches or use screen as switch
3. Navigate through app using scanning
4. Verify all functionality accessible

### Full Keyboard Access Testing

1. Enable: Settings > Accessibility > Keyboards > Full Keyboard Access
2. Use Tab to navigate
3. Use Space/Enter to activate
4. Verify focus visibility
5. Test keyboard shortcuts

### Dynamic Type Testing Matrix

Test every screen at these sizes (minimum):

| Priority | Size | Why |
|----------|------|-----|
| High | `xSmall` | Smallest regular size |
| High | `large` | Default |
| High | `xxxLarge` | Largest non-accessibility |
| Critical | `accessibility1` | First accessibility size |
| Critical | `accessibility5` | Maximum size |

### Accessibility Settings Matrix

Test combinations that commonly overlap:

| Combination | Test Focus |
|-------------|------------|
| Bold Text + Large Type | Font rendering, layout |
| Reduce Motion + Increase Contrast | Animations, colors |
| Smart Invert + High Contrast | Image handling, colors |
| VoiceOver + Large Type | Reading order, layout |
| Button Shapes + Bold Text | Interactive elements |

### CI/CD Integration

```yaml
# Example GitHub Actions workflow
accessibility-audit:
  runs-on: macos-latest
  steps:
    - uses: actions/checkout@v4
    - name: Build and Test
      run: |
        xcodebuild test \
          -scheme MyApp \
          -destination 'platform=iOS Simulator,name=iPhone 15' \
          -only-testing:MyAppUITests/AccessibilityTests
```

---

## Implementation Checklist

### Per-View Checklist

- [ ] All images have `.accessibilityLabel()` (or `.accessibilityHidden(true)` if decorative)
- [ ] Interactive elements have labels and hints
- [ ] Touch targets are at least 44×44pt
- [ ] Reading order is logical
- [ ] Headings marked with `.isHeader` trait
- [ ] Dynamic Type supported
- [ ] Contrast ratio meets 4.5:1 (text) / 3:1 (UI elements)

### Per-Feature Checklist

- [ ] Respects Reduce Motion
- [ ] Respects Reduce Transparency
- [ ] Respects Increase Contrast
- [ ] Works with Smart Invert (images excluded)
- [ ] Respects Bold Text
- [ ] Supports Button Shapes
- [ ] Color not sole indicator of meaning
- [ ] Haptic feedback is appropriate and consistent

### Per-Screen Checklist

- [ ] Focus moves logically when screen appears
- [ ] Modal dialogs trap focus
- [ ] Escape gesture dismisses modals
- [ ] Status messages announced
- [ ] Errors clearly identified and described
- [ ] All functionality accessible via VoiceOver

### Testing Protocol

1. **Automated**: Run Accessibility Inspector, check warnings
2. **VoiceOver**: Navigate entire app with VoiceOver
3. **Dynamic Type**: Test with all 12 size categories
4. **Settings matrix**: Test combinations:
   - Reduce Motion ON
   - Increase Contrast ON
   - Bold Text ON
   - Button Shapes ON
   - Smart Invert ON
5. **Physical testing**: Test on real device with screen reader users if possible

---

## Resources

### Apple Documentation
- [Human Interface Guidelines - Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [SwiftUI Accessibility Modifiers](https://developer.apple.com/documentation/swiftui/view-accessibility)
- [WWDC21: SwiftUI Accessibility Beyond the Basics](https://developer.apple.com/videos/play/wwdc2021/10119/)
- [WWDC24: Get Started with Dynamic Type](https://developer.apple.com/videos/play/wwdc2024/10074/)

### Open Source References
- [CVS Health iOS SwiftUI Accessibility Techniques](https://github.com/cvs-health/ios-swiftui-accessibility-techniques)
- [Capable - Unified Accessibility API](https://github.com/chrs1885/Capable)

### Community Resources
- [SwiftLee - VoiceOver Navigation Tips](https://www.avanderlee.com/swiftui/voiceover-navigation-improvement-tips/)
- [Swift with Majid - Accessibility Series](https://swiftwithmajid.com/2021/09/14/accessibility-rotors-in-swiftui/)
- [Hacking with Swift - Accessibility](https://www.hackingwithswift.com/books/ios-swiftui/accessibility-in-swiftui)

### Standards
- [WCAG 2.2 Specification](https://www.w3.org/WAI/standards-guidelines/wcag/)
- [WebAIM WCAG Checklist](https://webaim.org/standards/wcag/checklist)

---

*Generated: 2026-01-09 | Insight 5 Accessibility Excellence Research*
