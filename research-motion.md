# Motion Design Research for iOS/SwiftUI

## Overview

This document covers cutting-edge motion design patterns, timing curves, and implementation techniques for building fluid, responsive iOS applications with SwiftUI.

---

## 1. Spring Physics Fundamentals

### Traditional Physics Parameters

Springs are defined by three core properties:

| Parameter | Description | Effect |
|-----------|-------------|--------|
| **Mass** | Weight/inertia of the animating object | Higher mass = more overshooting, slower to start/stop |
| **Stiffness** | Tensile strength of the spring | Higher stiffness = snappier, faster animations |
| **Damping** | Friction/braking force | Higher damping = less oscillation, faster settling |

### Recommended Starting Values (Traditional)

```swift
// Good baseline for bouncy animations
.interpolatingSpring(mass: 1.0, stiffness: 170, damping: 15)

// More bouncy (lower damping)
.interpolatingSpring(mass: 1.0, stiffness: 170, damping: 5)

// Snappy, minimal bounce
.interpolatingSpring(mass: 1.0, stiffness: 300, damping: 20)
```

### Modern Spring API (iOS 17+)

Apple simplified springs to just two intuitive parameters:

| Parameter | Range | Description |
|-----------|-------|-------------|
| **Duration** | 0.1 - 1.0+ | Perceived animation length in seconds |
| **Bounce** | -1.0 to 1.0 | Overshoot amount (0 = no bounce, >0 = bouncy, <0 = flatter) |

```swift
// Smooth, no bounce (critically damped)
.spring(duration: 0.5, bounce: 0)

// Playful bounce (underdamped)
.spring(duration: 0.5, bounce: 0.3)

// Extra smooth deceleration (overdamped)
.spring(duration: 0.5, bounce: -0.2)
```

### Spring Presets

```swift
// Built-in presets
.smooth                          // No bounce, general purpose
.smooth(duration: 1.0)           // Slower smooth
.snappy                          // Quick, minimal bounce
.bouncy                          // Noticeable springiness
.bouncy(duration: 0.5, extraBounce: 0.2)  // Custom bouncy
```

### Spring Type Classification

| Bounce Value | Physics Term | Use Case |
|--------------|--------------|----------|
| `> 0` | Underdamped | Playful interactions, emphasis |
| `= 0` | Critically damped | Sheet presentations, navigation |
| `< 0` | Overdamped | Subtle, professional feel |

### Conversion Formula (Duration/Bounce to Physics)

```
mass = 1
stiffness = (2π ÷ perceptualDuration)²
damping = ((1 - bounce) × 4π) ÷ perceptualDuration  // for bounce ≥ 0
```

---

## 1b. Advanced Spring Physics (Deep Dive)

### The Mathematics of Springs

**Hooke's Law** defines the spring force:
```
F = -k × x
```
Where `k` is stiffness and `x` is displacement from equilibrium.

**Newton's Second Law** combined with Hooke's Law:
```
a = -k × x / m
```
Where `m` is mass and `a` is acceleration.

**Damping Force** dissipates energy:
```
F_damping = -d × v
```
Where `d` is the damping coefficient and `v` is velocity.

**Combined Acceleration:**
```
a = (F_spring + F_damping) / mass
```

### Natural Frequency and Damping Ratio

**Natural Angular Frequency (ω₀):**
```swift
let omega_n = sqrt(stiffness / mass)  // radians per second
```

**Damping Ratio (ζ):**
```swift
let zeta = damping / (2 * sqrt(stiffness * mass))
```

| ζ Value | Classification | Behavior |
|---------|----------------|----------|
| ζ < 1 | Underdamped | Oscillates, overshoots target |
| ζ = 1 | Critically damped | Fastest settling without overshoot |
| ζ > 1 | Overdamped | Slow approach, no overshoot |

**Damped Frequency (for underdamped systems):**
```swift
let omega_d = omega_n * sqrt(1 - zeta * zeta)
```

### Spring Simulation Loop

```swift
/// Physics-based spring simulation at 60fps
func simulateSpring(
    stiffness: Double,
    damping: Double,
    mass: Double = 1.0,
    initialPosition: Double = 1.0,
    targetPosition: Double = 0.0
) -> [Double] {
    var position = initialPosition
    var velocity: Double = 0
    let frameRate: Double = 1.0 / 60.0
    var positions: [Double] = []

    // Simulate until settled (600 frames max = 10 seconds)
    while positions.count < 600 {
        let displacement = position - targetPosition
        let springForce = -stiffness * displacement
        let dampingForce = -damping * velocity
        let acceleration = (springForce + dampingForce) / mass

        velocity += acceleration * frameRate
        position += velocity * frameRate
        positions.append(position)

        // Check if settled
        if abs(velocity) < 0.001 && abs(displacement) < 0.001 {
            break
        }
    }
    return positions
}
```

### Response Parameter Deep Dive

The `response` parameter controls animation speed:

| Response | Feel | Use Case |
|----------|------|----------|
| `0.15` | Very snappy | Micro-interactions, haptic feedback |
| `0.3` | Quick | Button presses, small UI elements |
| `0.55` | Default | General purpose animations |
| `0.7` | Moderate | Card expansions, modal presentations |
| `1.0+` | Slow | Dramatic transitions, onboarding |

```swift
// Response controls how fast motion happens
.spring(response: 0.3, dampingFraction: 0.7)  // Quick and smooth
.spring(response: 0.9, dampingFraction: 0.7)  // Slow and deliberate
```

### Damping Fraction Explained

```swift
// dampingFraction: 0.0 = endless oscillation
// dampingFraction: 1.0 = critical damping (no overshoot)
// dampingFraction: 0.5 = moderate bounce

.spring(response: 0.5, dampingFraction: 0.5)  // Bouncy
.spring(response: 0.5, dampingFraction: 0.8)  // Slight bounce
.spring(response: 0.5, dampingFraction: 1.0)  // No bounce
```

### Creating Infinitely Stiff Springs

Setting response to zero creates instant snapping:

```swift
// Instant snap (infinitely stiff spring)
.spring(response: 0, dampingFraction: 1)

// Use case: Immediate state changes without animation
```

### Blend Duration

The `blendDuration` parameter smooths transitions between different spring animations:

```swift
// Smooth handoff between animations
.spring(response: 0.5, dampingFraction: 0.7, blendDuration: 0.2)
```

### Practical Spring Recipes

```swift
extension Animation {
    // Snappy micro-interaction
    static let microInteraction = Animation.spring(
        response: 0.2,
        dampingFraction: 0.7
    )

    // Smooth sheet presentation
    static let sheetPresentation = Animation.spring(
        response: 0.5,
        dampingFraction: 1.0
    )

    // Playful bounce
    static let playfulBounce = Animation.spring(
        response: 0.6,
        dampingFraction: 0.5
    )

    // Dramatic hero transition
    static let heroTransition = Animation.spring(
        response: 0.8,
        dampingFraction: 0.75
    )

    // Card flip
    static let cardFlip = Animation.spring(
        response: 0.4,
        dampingFraction: 0.8
    )
}
```

---

## 2. Apple's Fluid Interfaces (WWDC18)

### Core Principles

From [WWDC 2018 Session 803](https://developer.apple.com/videos/play/wwdc2018/803/):

> "It's not that our interfaces should be fluid, it's that WE'RE fluid, and our interfaces need to respond to that."

An interface is fluid when it behaves according to **how people think**, not how machines think.

### Key Characteristics

1. **Responsive** - Immediate visual feedback
2. **Interruptible** - Can change direction mid-animation
3. **Redirectable** - Smooth transitions between states

### One-to-One Tracking

Content must stay attached to the gesture. When swiping or dragging, maintain direct correlation between finger position and UI element position.

```swift
// Example: Card follows finger exactly
struct DraggableCard: View {
    @State private var offset: CGSize = .zero

    var body: some View {
        RoundedRectangle(cornerRadius: 16)
            .offset(offset)
            .gesture(
                DragGesture()
                    .onChanged { value in
                        offset = value.translation  // 1:1 tracking
                    }
                    .onEnded { _ in
                        withAnimation(.spring(duration: 0.4, bounce: 0.2)) {
                            offset = .zero
                        }
                    }
            )
    }
}
```

### Resources
- [Designing Fluid Interfaces PDF](https://devstreaming-cdn.apple.com/videos/wwdc/2018/803lpnlacvg2jsndx/803/803_designing_fluid_interfaces.pdf)
- [GitHub: fluid-interfaces](https://github.com/nathangitter/fluid-interfaces)

---

## 3. Gesture-Driven Animations

### DragGesture Fundamentals

```swift
struct GestureDrivenView: View {
    @State private var position: CGSize = .zero
    @GestureState private var dragOffset: CGSize = .zero

    var body: some View {
        Circle()
            .frame(width: 100, height: 100)
            .offset(x: position.width + dragOffset.width,
                    y: position.height + dragOffset.height)
            .gesture(
                DragGesture()
                    .updating($dragOffset) { value, state, _ in
                        state = value.translation
                    }
                    .onEnded { value in
                        // Apply velocity for natural continuation
                        withAnimation(.interpolatingSpring(
                            stiffness: 50,
                            damping: 10,
                            initialVelocity: velocityFromGesture(value)
                        )) {
                            position.width += value.translation.width
                            position.height += value.translation.height
                        }
                    }
            )
    }

    private func velocityFromGesture(_ value: DragGesture.Value) -> Double {
        let velocity = value.predictedEndTranslation
        return sqrt(pow(velocity.width, 2) + pow(velocity.height, 2)) / 100
    }
}
```

### Gesture Velocity Library

For precise velocity tracking: [swiftui-gesture-velocity](https://github.com/FluidGroup/swiftui-gesture-velocity)

```swift
// Provides @GestureVelocity property wrapper
@GestureVelocity var velocity: CGVector
```

---

## 3b. Advanced Gesture Transitions (Deep Dive)

### Velocity Preservation and Handoff

SwiftUI automatically preserves velocity when transitioning from gesture to animation:

```swift
struct VelocityPreservingCard: View {
    @State private var offset: CGSize = .zero
    @State private var isDragging = false

    var body: some View {
        RoundedRectangle(cornerRadius: 20)
            .fill(.blue.gradient)
            .frame(width: 300, height: 200)
            .offset(offset)
            .gesture(
                DragGesture()
                    .onChanged { value in
                        isDragging = true
                        // Use interactiveSpring during drag for smooth tracking
                        withAnimation(.interactiveSpring) {
                            offset = value.translation
                        }
                    }
                    .onEnded { value in
                        isDragging = false
                        // Spring inherits velocity from interactiveSpring
                        withAnimation(.spring(duration: 0.5, bounce: 0.3)) {
                            offset = .zero
                        }
                    }
            )
    }
}
```

### Using predictedEndLocation for Momentum

```swift
struct MomentumScrollCard: View {
    @State private var offset: CGFloat = 0
    let cardWidth: CGFloat = 300

    var body: some View {
        HStack(spacing: 20) {
            ForEach(0..<5) { i in
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color(hue: Double(i) / 5, saturation: 0.7, brightness: 0.9))
                    .frame(width: cardWidth, height: 200)
            }
        }
        .offset(x: offset)
        .gesture(
            DragGesture()
                .onChanged { value in
                    offset = value.translation.width
                }
                .onEnded { value in
                    // Use predicted end to determine target snap point
                    let predictedEnd = value.predictedEndTranslation.width
                    let targetIndex = round(-predictedEnd / (cardWidth + 20))
                    let clampedIndex = max(0, min(4, targetIndex))

                    withAnimation(.spring(duration: 0.4, bounce: 0.2)) {
                        offset = -clampedIndex * (cardWidth + 20)
                    }
                }
        )
    }
}
```

### Gesture State Machine Pattern

```swift
enum CardState {
    case idle
    case dragging(translation: CGSize)
    case animatingToPosition(CGSize)
    case dismissed
}

struct StateMachineCard: View {
    @State private var state: CardState = .idle

    private var offset: CGSize {
        switch state {
        case .idle: return .zero
        case .dragging(let translation): return translation
        case .animatingToPosition(let position): return position
        case .dismissed: return CGSize(width: 0, height: 1000)
        }
    }

    private var rotation: Double {
        switch state {
        case .dragging(let translation):
            return Double(translation.width) / 20
        default:
            return 0
        }
    }

    var body: some View {
        RoundedRectangle(cornerRadius: 20)
            .fill(.white)
            .frame(width: 300, height: 400)
            .shadow(radius: 10)
            .offset(offset)
            .rotationEffect(.degrees(rotation))
            .gesture(
                DragGesture()
                    .onChanged { value in
                        state = .dragging(translation: value.translation)
                    }
                    .onEnded { value in
                        let threshold: CGFloat = 150
                        let velocity = value.predictedEndTranslation

                        if abs(velocity.width) > threshold {
                            // Dismiss with momentum
                            withAnimation(.spring(duration: 0.4, bounce: 0)) {
                                state = .dismissed
                            }
                        } else {
                            // Snap back
                            withAnimation(.spring(duration: 0.5, bounce: 0.3)) {
                                state = .idle
                            }
                        }
                    }
            )
    }
}
```

### Bottom Sheet Gesture Pattern

```swift
struct InteractiveBottomSheet<Content: View>: View {
    @Binding var isPresented: Bool
    @State private var dragOffset: CGFloat = 0
    @State private var sheetHeight: CGFloat = 400

    let content: Content
    let snapPoints: [CGFloat] = [0.3, 0.6, 0.9]  // Percentage of screen

    init(isPresented: Binding<Bool>, @ViewBuilder content: () -> Content) {
        self._isPresented = isPresented
        self.content = content()
    }

    var body: some View {
        GeometryReader { geo in
            VStack(spacing: 0) {
                // Drag handle
                Capsule()
                    .fill(.gray.opacity(0.5))
                    .frame(width: 40, height: 5)
                    .padding(.top, 8)

                content
            }
            .frame(maxWidth: .infinity)
            .frame(height: sheetHeight)
            .background(.regularMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .offset(y: geo.size.height - sheetHeight + dragOffset)
            .gesture(
                DragGesture()
                    .onChanged { value in
                        dragOffset = value.translation.height
                    }
                    .onEnded { value in
                        let screenHeight = geo.size.height
                        let currentHeight = sheetHeight - dragOffset
                        let velocity = value.predictedEndTranslation.height

                        // Find nearest snap point considering velocity
                        let predictedHeight = currentHeight - velocity * 0.3
                        let targetPercentage = predictedHeight / screenHeight

                        let nearestSnap = snapPoints.min(by: {
                            abs($0 - targetPercentage) < abs($1 - targetPercentage)
                        }) ?? 0.6

                        withAnimation(.spring(duration: 0.4, bounce: 0.15)) {
                            sheetHeight = screenHeight * nearestSnap
                            dragOffset = 0

                            if nearestSnap < 0.2 {
                                isPresented = false
                            }
                        }
                    }
            )
        }
    }
}
```

### Interruptible Animation Pattern

```swift
struct InterruptibleCard: View {
    @State private var position: CGPoint = CGPoint(x: 150, y: 300)
    @GestureState private var dragState: CGSize = .zero

    var body: some View {
        Circle()
            .fill(.blue)
            .frame(width: 100, height: 100)
            .position(
                x: position.x + dragState.width,
                y: position.y + dragState.height
            )
            .gesture(
                DragGesture()
                    .updating($dragState) { value, state, _ in
                        // Immediate tracking during drag
                        state = value.translation
                    }
                    .onEnded { value in
                        // Animation automatically blends with gesture velocity
                        withAnimation(.interpolatingSpring(
                            stiffness: 100,
                            damping: 15
                        )) {
                            position.x += value.translation.width
                            position.y += value.translation.height
                        }
                    }
            )
            .onTapGesture {
                // Tap can interrupt any running animation
                withAnimation(.spring(duration: 0.6, bounce: 0.4)) {
                    position = CGPoint(
                        x: CGFloat.random(in: 50...300),
                        y: CGFloat.random(in: 100...600)
                    )
                }
            }
    }
}
```

### Swipe-to-Dismiss with Threshold

```swift
struct SwipeToDismissView<Content: View>: View {
    @Binding var isPresented: Bool
    @State private var offset: CGFloat = 0
    @State private var backgroundOpacity: Double = 1

    let content: Content
    let dismissThreshold: CGFloat = 150

    var body: some View {
        ZStack {
            Color.black.opacity(0.4 * backgroundOpacity)
                .ignoresSafeArea()
                .onTapGesture {
                    dismiss()
                }

            content
                .offset(y: offset)
                .gesture(
                    DragGesture()
                        .onChanged { value in
                            // Only allow downward drag
                            if value.translation.height > 0 {
                                offset = value.translation.height
                                // Fade background as we drag
                                backgroundOpacity = 1 - (offset / 400)
                            }
                        }
                        .onEnded { value in
                            let velocity = value.predictedEndTranslation.height

                            // Dismiss if past threshold OR high velocity
                            if offset > dismissThreshold || velocity > 500 {
                                dismiss()
                            } else {
                                // Snap back
                                withAnimation(.spring(duration: 0.3, bounce: 0.2)) {
                                    offset = 0
                                    backgroundOpacity = 1
                                }
                            }
                        }
                )
        }
    }

    private func dismiss() {
        withAnimation(.spring(duration: 0.3, bounce: 0)) {
            offset = 800
            backgroundOpacity = 0
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            isPresented = false
        }
    }
}
```

### Rubber Banding Effect

```swift
struct RubberBandingScroll: View {
    @State private var offset: CGFloat = 0
    let contentHeight: CGFloat = 1000
    let containerHeight: CGFloat = 500

    private var rubberBandedOffset: CGFloat {
        let maxOffset: CGFloat = 0
        let minOffset = -(contentHeight - containerHeight)

        if offset > maxOffset {
            // Rubber band at top
            return rubberBand(offset, limit: maxOffset)
        } else if offset < minOffset {
            // Rubber band at bottom
            let overscroll = minOffset - offset
            return minOffset - rubberBand(overscroll, limit: 0)
        }
        return offset
    }

    private func rubberBand(_ offset: CGFloat, limit: CGFloat) -> CGFloat {
        let resistance: CGFloat = 0.55
        let diff = offset - limit
        return limit + (1 - (1 / (diff * 0.01 / resistance + 1))) * resistance * 100
    }

    var body: some View {
        VStack(spacing: 0) {
            ForEach(0..<20) { i in
                Text("Row \(i)")
                    .frame(height: 50)
                    .frame(maxWidth: .infinity)
                    .background(Color(hue: Double(i) / 20, saturation: 0.3, brightness: 0.95))
            }
        }
        .offset(y: rubberBandedOffset)
        .gesture(
            DragGesture()
                .onChanged { value in
                    offset += value.translation.height
                }
                .onEnded { value in
                    let maxOffset: CGFloat = 0
                    let minOffset = -(contentHeight - containerHeight)

                    withAnimation(.spring(duration: 0.4, bounce: 0.1)) {
                        offset = max(minOffset, min(maxOffset, offset))
                    }
                }
        )
        .frame(height: containerHeight)
        .clipped()
    }
}
```

### Motion Library Integration

For advanced physics-based gestures, consider [b3ll/Motion](https://github.com/b3ll/Motion):

```swift
// Motion provides:
// - SIMD-optimized spring calculations
// - Gesture-to-animation handoff
// - Decay animations for natural momentum
// - Multi-axis spring coordination

import Motion

// Example: Decay animation after flick
let decayAnimation = DecayAnimation(value: position)
decayAnimation.velocity = gestureVelocity
decayAnimation.start()
```

---

## 4. Shared Element Transitions (matchedGeometryEffect)

### Basic Implementation

```swift
struct HeroAnimationExample: View {
    @Namespace private var animation
    @State private var isExpanded = false

    var body: some View {
        VStack {
            if !isExpanded {
                // Thumbnail state
                RoundedRectangle(cornerRadius: 16)
                    .fill(.blue)
                    .matchedGeometryEffect(id: "card", in: animation)
                    .frame(width: 100, height: 100)
                    .onTapGesture {
                        withAnimation(.spring(duration: 0.4, bounce: 0.2)) {
                            isExpanded = true
                        }
                    }
            } else {
                // Expanded state
                RoundedRectangle(cornerRadius: 24)
                    .fill(.blue)
                    .matchedGeometryEffect(id: "card", in: animation)
                    .frame(width: 300, height: 400)
                    .onTapGesture {
                        withAnimation(.spring(duration: 0.4, bounce: 0.2)) {
                            isExpanded = false
                        }
                    }
            }
        }
    }
}
```

### Advanced Pattern: List to Detail

```swift
struct ListToDetail: View {
    @Namespace private var namespace
    @State private var selectedItem: Item?

    var body: some View {
        ZStack {
            // List view
            ScrollView {
                LazyVStack {
                    ForEach(items) { item in
                        ItemRow(item: item, namespace: namespace)
                            .onTapGesture {
                                withAnimation(.spring(duration: 0.5, bounce: 0.25)) {
                                    selectedItem = item
                                }
                            }
                    }
                }
            }
            .opacity(selectedItem == nil ? 1 : 0)

            // Detail view
            if let item = selectedItem {
                ItemDetail(item: item, namespace: namespace) {
                    withAnimation(.spring(duration: 0.5, bounce: 0.25)) {
                        selectedItem = nil
                    }
                }
            }
        }
    }
}
```

---

## 5. Morphing Animations

### Using AnimatableData

```swift
struct MorphingShape: Shape {
    var progress: CGFloat  // 0 = circle, 1 = square

    var animatableData: CGFloat {
        get { progress }
        set { progress = newValue }
    }

    func path(in rect: CGRect) -> Path {
        let cornerRadius = (1 - progress) * min(rect.width, rect.height) / 2
        return Path(roundedRect: rect, cornerRadius: cornerRadius)
    }
}

// Usage
struct MorphingDemo: View {
    @State private var isCircle = true

    var body: some View {
        MorphingShape(progress: isCircle ? 0 : 1)
            .fill(.gradient(colors: [.purple, .blue]))
            .frame(width: 200, height: 200)
            .onTapGesture {
                withAnimation(.spring(duration: 0.6, bounce: 0.3)) {
                    isCircle.toggle()
                }
            }
    }
}
```

### AnimatablePair for Multiple Properties

```swift
struct ComplexMorphingShape: Shape {
    var corners: Double
    var scale: Double

    var animatableData: AnimatablePair<Double, Double> {
        get { AnimatablePair(corners, scale) }
        set {
            corners = newValue.first
            scale = newValue.second
        }
    }

    func path(in rect: CGRect) -> Path {
        // Generate polygon path based on corners and scale
        // ...
    }
}
```

### VectorArithmetic for Complex Animations

For performance with many animatable values, implement `VectorArithmetic` with the Accelerate framework.

---

## 5b. PhaseAnimator and KeyframeAnimator (iOS 17+)

### PhaseAnimator: Multi-Step Animations

PhaseAnimator cycles through discrete animation phases automatically:

```swift
// Define phases as an enum
enum BouncePhase: CaseIterable {
    case initial
    case compress
    case stretch
    case settle

    var scale: CGSize {
        switch self {
        case .initial: return CGSize(width: 1.0, height: 1.0)
        case .compress: return CGSize(width: 1.2, height: 0.8)
        case .stretch: return CGSize(width: 0.9, height: 1.1)
        case .settle: return CGSize(width: 1.0, height: 1.0)
        }
    }

    var offset: CGFloat {
        switch self {
        case .initial: return 0
        case .compress: return 20
        case .stretch: return -10
        case .settle: return 0
        }
    }
}

struct BouncingBall: View {
    var body: some View {
        PhaseAnimator(BouncePhase.allCases) { phase in
            Circle()
                .fill(.orange.gradient)
                .frame(width: 100, height: 100)
                .scaleEffect(phase.scale)
                .offset(y: phase.offset)
        } animation: { phase in
            switch phase {
            case .initial: .spring(duration: 0.2, bounce: 0)
            case .compress: .easeOut(duration: 0.1)
            case .stretch: .spring(duration: 0.3, bounce: 0.5)
            case .settle: .spring(duration: 0.4, bounce: 0.2)
            }
        }
    }
}
```

### Triggered PhaseAnimator

```swift
struct PulsingButton: View {
    @State private var triggerCount = 0

    var body: some View {
        Button("Tap Me") {
            triggerCount += 1
        }
        .padding()
        .background(.blue)
        .foregroundStyle(.white)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .phaseAnimator(
            [false, true, false],
            trigger: triggerCount
        ) { content, phase in
            content
                .scaleEffect(phase ? 1.1 : 1.0)
                .brightness(phase ? 0.1 : 0)
        } animation: { _ in
            .spring(duration: 0.2, bounce: 0.3)
        }
    }
}
```

### KeyframeAnimator: Fine-Grained Control

KeyframeAnimator provides precise timing for complex, multi-property animations:

```swift
struct AnimationValues {
    var scale: Double = 1.0
    var rotation: Double = 0
    var yOffset: Double = 0
    var opacity: Double = 1.0
}

struct EntranceAnimation: View {
    @State private var trigger = false

    var body: some View {
        VStack {
            Image(systemName: "star.fill")
                .font(.system(size: 80))
                .foregroundStyle(.yellow)
                .keyframeAnimator(
                    initialValue: AnimationValues(),
                    trigger: trigger
                ) { content, value in
                    content
                        .scaleEffect(value.scale)
                        .rotationEffect(.degrees(value.rotation))
                        .offset(y: value.yOffset)
                        .opacity(value.opacity)
                } keyframes: { _ in
                    KeyframeTrack(\.scale) {
                        SpringKeyframe(0.5, duration: 0.2)
                        SpringKeyframe(1.2, duration: 0.3, spring: .bouncy)
                        SpringKeyframe(1.0, duration: 0.2)
                    }
                    KeyframeTrack(\.rotation) {
                        LinearKeyframe(0, duration: 0.2)
                        SpringKeyframe(360, duration: 0.5, spring: .bouncy)
                    }
                    KeyframeTrack(\.yOffset) {
                        SpringKeyframe(-50, duration: 0.3)
                        SpringKeyframe(0, duration: 0.4, spring: .bouncy)
                    }
                    KeyframeTrack(\.opacity) {
                        LinearKeyframe(0, duration: 0)
                        LinearKeyframe(1, duration: 0.3)
                    }
                }

            Button("Animate") {
                trigger.toggle()
            }
        }
    }
}
```

### Keyframe Types

| Keyframe Type | Behavior | Use Case |
|---------------|----------|----------|
| `LinearKeyframe` | Constant velocity interpolation | Fades, progress bars |
| `SpringKeyframe` | Physics-based spring motion | Bouncy, natural motion |
| `CubicKeyframe` | Bezier curve interpolation | Custom easing |
| `MoveKeyframe` | Instant jump (no interpolation) | State changes |

### Complex Celebration Animation

```swift
struct CelebrationAnimationValues {
    var scale: Double = 0
    var rotation: Double = 0
    var yOffset: Double = 100
    var opacity: Double = 0
    var blur: Double = 10
}

struct CelebrationView: View {
    @State private var celebrate = false

    var body: some View {
        VStack(spacing: 40) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 120))
                .foregroundStyle(.green)
                .keyframeAnimator(
                    initialValue: CelebrationAnimationValues(),
                    trigger: celebrate
                ) { content, value in
                    content
                        .scaleEffect(value.scale)
                        .rotationEffect(.degrees(value.rotation))
                        .offset(y: value.yOffset)
                        .opacity(value.opacity)
                        .blur(radius: value.blur)
                } keyframes: { _ in
                    // Scale: pop in with overshoot
                    KeyframeTrack(\.scale) {
                        CubicKeyframe(0, duration: 0)
                        CubicKeyframe(1.3, duration: 0.3)
                        SpringKeyframe(1.0, duration: 0.4, spring: .bouncy)
                    }

                    // Rotation: slight wobble
                    KeyframeTrack(\.rotation) {
                        LinearKeyframe(0, duration: 0.3)
                        SpringKeyframe(-10, duration: 0.1)
                        SpringKeyframe(10, duration: 0.1)
                        SpringKeyframe(0, duration: 0.2, spring: .bouncy)
                    }

                    // Y offset: rise up
                    KeyframeTrack(\.yOffset) {
                        SpringKeyframe(100, duration: 0)
                        SpringKeyframe(-20, duration: 0.3)
                        SpringKeyframe(0, duration: 0.3, spring: .snappy)
                    }

                    // Opacity: fade in
                    KeyframeTrack(\.opacity) {
                        LinearKeyframe(0, duration: 0)
                        LinearKeyframe(1, duration: 0.2)
                    }

                    // Blur: sharpen
                    KeyframeTrack(\.blur) {
                        LinearKeyframe(10, duration: 0)
                        LinearKeyframe(0, duration: 0.3)
                    }
                }

            Button("Celebrate!") {
                celebrate.toggle()
            }
            .buttonStyle(.borderedProminent)
        }
    }
}
```

### Repeating Keyframe Animation

```swift
struct PulsatingOrb: View {
    var body: some View {
        Circle()
            .fill(.blue.gradient)
            .frame(width: 100, height: 100)
            .keyframeAnimator(
                initialValue: AnimationValues(),
                repeating: true
            ) { content, value in
                content
                    .scaleEffect(value.scale)
                    .opacity(value.opacity)
            } keyframes: { _ in
                KeyframeTrack(\.scale) {
                    SpringKeyframe(1.0, duration: 0.5)
                    SpringKeyframe(1.2, duration: 0.5)
                    SpringKeyframe(1.0, duration: 0.5)
                }
                KeyframeTrack(\.opacity) {
                    LinearKeyframe(0.7, duration: 0.5)
                    LinearKeyframe(1.0, duration: 0.5)
                    LinearKeyframe(0.7, duration: 0.5)
                }
            }
    }
}
```

### When to Use Each

| Animator | Best For |
|----------|----------|
| `withAnimation` | Simple state transitions |
| `.animation()` | Implicit, view-specific animations |
| `PhaseAnimator` | Multi-step sequences, looping states |
| `KeyframeAnimator` | Complex, precisely-timed multi-property animations |
| `matchedGeometryEffect` | Hero transitions between views |

---

## 6. Staggered List Animations

### Using Delay-Based Approach

```swift
struct StaggeredList: View {
    @State private var items: [Item] = []
    @State private var isVisible = false

    var body: some View {
        VStack(spacing: 12) {
            ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                ItemRow(item: item)
                    .opacity(isVisible ? 1 : 0)
                    .offset(y: isVisible ? 0 : 20)
                    .animation(
                        .spring(duration: 0.5, bounce: 0.2)
                            .delay(Double(index) * 0.05),
                        value: isVisible
                    )
            }
        }
        .onAppear {
            isVisible = true
        }
    }
}
```

### Using Custom Animatable Modifier

```swift
struct StaggerModifier: AnimatableModifier {
    var progress: CGFloat
    var index: Int
    var totalItems: Int

    var animatableData: CGFloat {
        get { progress }
        set { progress = newValue }
    }

    func body(content: Content) -> some View {
        let itemProgress = calculateItemProgress()
        content
            .opacity(itemProgress)
            .scaleEffect(0.8 + (0.2 * itemProgress))
            .offset(y: (1 - itemProgress) * 30)
    }

    private func calculateItemProgress() -> CGFloat {
        let itemDelay = CGFloat(index) / CGFloat(totalItems)
        let adjustedProgress = (progress - itemDelay) / (1 - itemDelay)
        return max(0, min(1, adjustedProgress))
    }
}
```

---

## 7. Skeleton Loading Animations

### Using .redacted() with Custom Shimmer

```swift
struct ShimmerModifier: ViewModifier {
    @State private var phase: CGFloat = 0

    func body(content: Content) -> some View {
        content
            .overlay(
                GeometryReader { geo in
                    LinearGradient(
                        colors: [
                            .clear,
                            .white.opacity(0.4),
                            .clear
                        ],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    .frame(width: geo.size.width * 2)
                    .offset(x: -geo.size.width + (geo.size.width * 2 * phase))
                }
            )
            .mask(content)
            .onAppear {
                withAnimation(.linear(duration: 1.5).repeatForever(autoreverses: false)) {
                    phase = 1
                }
            }
    }
}

extension View {
    func shimmer() -> some View {
        modifier(ShimmerModifier())
    }
}

// Usage
struct LoadingState: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            RoundedRectangle(cornerRadius: 8)
                .fill(.gray.opacity(0.3))
                .frame(height: 200)

            RoundedRectangle(cornerRadius: 4)
                .fill(.gray.opacity(0.3))
                .frame(width: 200, height: 20)

            RoundedRectangle(cornerRadius: 4)
                .fill(.gray.opacity(0.3))
                .frame(width: 150, height: 16)
        }
        .shimmer()
    }
}
```

### Using .redacted()

```swift
struct ContentView: View {
    @State private var isLoading = true

    var body: some View {
        CardView()
            .redacted(reason: isLoading ? .placeholder : [])
            .shimmer()
    }
}
```

### Libraries
- [SwiftUI-Shimmer](https://github.com/markiv/SwiftUI-Shimmer) - Lightweight shimmer modifier
- [SkeletonUI](https://github.com/CSolanaM/SkeletonUI) - Full-featured skeleton loading

---

## 8. Celebration/Success Animations

### Confetti Animation

```swift
// Using ConfettiSwiftUI package
import ConfettiSwiftUI

struct CelebrationView: View {
    @State private var counter = 0

    var body: some View {
        Button("Celebrate!") {
            counter += 1
        }
        .confettiCannon(
            counter: $counter,
            num: 50,
            colors: [.red, .blue, .green, .yellow],
            confettiSize: 10,
            rainHeight: 400,
            fadesOut: true,
            openingAngle: .degrees(60),
            closingAngle: .degrees(120),
            radius: 200
        )
    }
}
```

### Checkmark Success Animation

```swift
struct CheckmarkAnimation: View {
    @State private var isComplete = false

    var body: some View {
        ZStack {
            Circle()
                .fill(.green)
                .frame(width: 80, height: 80)
                .scaleEffect(isComplete ? 1 : 0)

            CheckmarkShape()
                .trim(from: 0, to: isComplete ? 1 : 0)
                .stroke(.white, style: StrokeStyle(lineWidth: 4, lineCap: .round, lineJoin: .round))
                .frame(width: 40, height: 40)
        }
        .onAppear {
            withAnimation(.spring(duration: 0.6, bounce: 0.3)) {
                isComplete = true
            }
        }
    }
}

struct CheckmarkShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.minX, y: rect.midY))
        path.addLine(to: CGPoint(x: rect.width * 0.35, y: rect.maxY * 0.8))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        return path
    }
}
```

### Libraries
- [ConfettiSwiftUI](https://github.com/simibac/ConfettiSwiftUI) - Configurable confetti
- [Swiftetti](https://github.com/fredbenenson/Swiftetti) - Physics-based confetti with metallic effects

---

## 9. Micro-Interactions

### Button Press Feedback

```swift
struct PressableButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .opacity(configuration.isPressed ? 0.9 : 1.0)
            .animation(.spring(duration: 0.2, bounce: 0.3), value: configuration.isPressed)
    }
}

// Usage
Button("Tap Me") { }
    .buttonStyle(PressableButtonStyle())
```

### Toggle Animation

```swift
struct AnimatedToggle: View {
    @Binding var isOn: Bool

    var body: some View {
        Capsule()
            .fill(isOn ? .green : .gray.opacity(0.3))
            .frame(width: 50, height: 30)
            .overlay(alignment: isOn ? .trailing : .leading) {
                Circle()
                    .fill(.white)
                    .padding(2)
                    .shadow(radius: 2)
            }
            .onTapGesture {
                withAnimation(.spring(duration: 0.3, bounce: 0.2)) {
                    isOn.toggle()
                }
            }
    }
}
```

### Swipe Action Feedback

```swift
struct SwipeActionCard: View {
    @State private var offset: CGFloat = 0
    @State private var showAction = false

    var body: some View {
        ZStack(alignment: .trailing) {
            // Background action
            HStack {
                Spacer()
                Image(systemName: "trash")
                    .foregroundStyle(.white)
                    .scaleEffect(showAction ? 1 : 0.5)
                    .opacity(showAction ? 1 : 0)
                    .padding(.trailing, 20)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(.red)

            // Card
            RoundedRectangle(cornerRadius: 12)
                .fill(.white)
                .shadow(radius: 2)
                .offset(x: offset)
                .gesture(
                    DragGesture()
                        .onChanged { value in
                            offset = min(0, value.translation.width)
                            showAction = offset < -60
                        }
                        .onEnded { _ in
                            withAnimation(.spring(duration: 0.4, bounce: 0.2)) {
                                if offset < -100 {
                                    // Delete action
                                    offset = -400
                                } else {
                                    offset = 0
                                    showAction = false
                                }
                            }
                        }
                )
        }
        .frame(height: 80)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
```

---

## 10. Animation Libraries

### Lottie

Vector animations from After Effects exported as JSON.

```swift
import Lottie

struct LottieAnimationView: View {
    var body: some View {
        LottieView(animation: .named("success"))
            .playing(loopMode: .playOnce)
            .frame(width: 200, height: 200)
    }
}
```

**Resources:**
- [lottie-ios](https://github.com/airbnb/lottie-ios) - Official Airbnb library
- [LottieFiles](https://lottiefiles.com) - Animation marketplace
- Use `lottie-spm` for faster Swift Package Manager downloads

### Rive

Interactive, state-machine driven animations.

```swift
import RiveRuntime

struct RiveAnimationView: View {
    @StateObject private var viewModel = RiveViewModel(filename: "animation")

    var body: some View {
        viewModel.view()
            .frame(width: 300, height: 300)
            .onTapGesture {
                viewModel.triggerInput("tap")
            }
    }
}
```

**Key Features:**
- State machines for interactive animations
- Smaller file sizes than Lottie
- Real-time blending between states

**Resources:**
- [rive-ios](https://github.com/rive-app/rive-ios) - Official runtime
- [Rive Editor](https://rive.app) - Design tool

---

## 11. Timing Curves Reference

### Built-in Timing Functions

| Function | Description | Use Case |
|----------|-------------|----------|
| `.linear` | Constant speed | Progress indicators |
| `.easeIn` | Slow start, fast end | Exit animations |
| `.easeOut` | Fast start, slow end | Entry animations |
| `.easeInOut` | Slow start and end | General purpose |

### Custom Bezier Curves

```swift
// Custom cubic bezier
Animation.timingCurve(0.25, 0.1, 0.25, 1.0, duration: 0.5)

// Common curves
let easeOutQuart = Animation.timingCurve(0.165, 0.84, 0.44, 1, duration: 0.5)
let easeInOutQuart = Animation.timingCurve(0.77, 0, 0.175, 1, duration: 0.5)
```

### Recommended Spring Configurations

| Animation Type | Configuration |
|----------------|---------------|
| Navigation push/pop | `.smooth` or `.spring(duration: 0.35, bounce: 0)` |
| Modal presentation | `.spring(duration: 0.5, bounce: 0)` |
| Button press | `.spring(duration: 0.2, bounce: 0.3)` |
| Card expansion | `.spring(duration: 0.5, bounce: 0.25)` |
| Playful bounce | `.spring(duration: 0.6, bounce: 0.4)` |
| Subtle feedback | `.spring(duration: 0.15, bounce: 0.1)` |
| Drag release | `.interpolatingSpring(stiffness: 50, damping: 10, initialVelocity: velocity)` |

---

## 12. Framer Motion to SwiftUI Mapping

| Framer Motion | SwiftUI Equivalent |
|---------------|-------------------|
| `variants` + `animate` | `@State` + `withAnimation` |
| `AnimatePresence` | `if/else` + `.transition()` |
| `layout` animations | `matchedGeometryEffect` |
| `whileHover` | `.onHover` (macOS) |
| `whileTap` | Custom `ButtonStyle` with `isPressed` |
| `drag` | `DragGesture` |
| `useSpring` | `.spring()` |
| `staggerChildren` | Delay-based or custom `AnimatableModifier` |
| `useTransform` | `GeometryReader` + computed values |

---

## Quick Reference Card

### Spring Presets
```swift
.spring()                           // Default smooth
.smooth                             // No bounce
.snappy                             // Quick, minimal bounce
.bouncy                             // Noticeable spring
.spring(duration: 0.5, bounce: 0.3) // Custom
```

### Essential Patterns
```swift
// Implicit animation
.animation(.spring(), value: someState)

// Explicit animation
withAnimation(.spring()) { someState.toggle() }

// Gesture-driven
.gesture(DragGesture().onEnded { ... })

// Shared element
.matchedGeometryEffect(id: "item", in: namespace)
```

---

## Sources

### Apple Resources
- [WWDC 2023: Animate with Springs](https://developer.apple.com/videos/play/wwdc2023/10158/)
- [WWDC 2018: Designing Fluid Interfaces](https://developer.apple.com/videos/play/wwdc2018/803/)
- [SwiftUI Animation Documentation](https://developer.apple.com/documentation/swiftui/animation)

### Community
- [SwiftUI Spring Animations Guide](https://github.com/GetStream/swiftui-spring-animations)
- [Open SwiftUI Animations](https://github.com/amosgyamfi/open-swiftui-animations)
- [Fluid Interfaces Implementation](https://github.com/nathangitter/fluid-interfaces)
- [SwiftUI Lab: matchedGeometryEffect](https://swiftui-lab.com/matchedgeometryeffect-part1/)

### Libraries
- [Lottie iOS](https://github.com/airbnb/lottie-ios)
- [Rive iOS](https://github.com/rive-app/rive-ios)
- [ConfettiSwiftUI](https://github.com/simibac/ConfettiSwiftUI)
- [SwiftUI-Shimmer](https://github.com/markiv/SwiftUI-Shimmer)
