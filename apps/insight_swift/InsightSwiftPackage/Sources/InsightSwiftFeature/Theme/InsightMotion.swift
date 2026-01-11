import SwiftUI

// MARK: - Spring Animation Presets

/// Curated spring animations optimized for different interaction patterns.
/// Based on Apple HIG motion principles: responsive, continuous, natural.
public enum InsightSpring {
    /// Snappy response for taps and quick actions (response: 0.3, damping: 0.7)
    public static let snappy = Animation.spring(response: 0.3, dampingFraction: 0.7)

    /// Smooth transitions for state changes (response: 0.4, damping: 0.8)
    public static let smooth = Animation.spring(response: 0.4, dampingFraction: 0.8)

    /// Bouncy feedback for playful interactions (response: 0.5, damping: 0.6)
    public static let bouncy = Animation.spring(response: 0.5, dampingFraction: 0.6)

    /// Gentle easing for subtle movements (response: 0.6, damping: 0.9)
    public static let gentle = Animation.spring(response: 0.6, dampingFraction: 0.9)

    /// Quick micro-interactions (response: 0.2, damping: 0.8)
    public static let micro = Animation.spring(response: 0.2, dampingFraction: 0.8)

    /// Heavy/weighty feel for dragging large elements (response: 0.5, damping: 0.85)
    public static let heavy = Animation.spring(response: 0.5, dampingFraction: 0.85)

    /// Card swipe spring - optimized for swipe-to-dismiss gestures
    public static let swipe = Animation.spring(response: 0.25, dampingFraction: 0.8)

    /// Modal presentation spring
    public static let modal = Animation.spring(response: 0.35, dampingFraction: 0.85)
}

// MARK: - Gesture Physics

/// Physics-based gesture calculations for natural-feeling interactions.
public struct GesturePhysics {
    /// Velocity threshold for triggering swipe actions (points per second)
    public static let swipeVelocityThreshold: CGFloat = 300

    /// Drag distance threshold for triggering actions
    public static let dragThreshold: CGFloat = 80

    /// Rubber band resistance factor (0-1, lower = more resistance)
    public static let rubberBandFactor: CGFloat = 0.55

    /// Maximum rubber band stretch distance
    public static let maxRubberBandDistance: CGFloat = 100

    /// Calculate rubber band offset for over-scroll effects
    /// - Parameters:
    ///   - offset: Current drag offset
    ///   - limit: Maximum allowed offset before rubber banding
    /// - Returns: Rubber-banded offset value
    public static func rubberBand(offset: CGFloat, limit: CGFloat) -> CGFloat {
        let sign: CGFloat = offset < 0 ? -1 : 1
        let absOffset = abs(offset)

        guard absOffset > limit else { return offset }

        let excess = absOffset - limit
        let dampedExcess = limit * (1 - exp(-excess / limit * rubberBandFactor))
        return sign * (limit + min(dampedExcess, maxRubberBandDistance))
    }

    /// Calculate deceleration distance based on velocity
    /// - Parameters:
    ///   - velocity: Current velocity in points per second
    ///   - deceleration: Deceleration rate (default iOS deceleration)
    /// - Returns: Distance the element will travel before stopping
    public static func decelerationDistance(
        velocity: CGFloat,
        deceleration: CGFloat = 0.998
    ) -> CGFloat {
        let coefficient = 1000 * log(deceleration)
        return -velocity / coefficient
    }

    /// Determine if a swipe gesture should complete based on velocity and distance
    /// - Parameters:
    ///   - translation: Total distance dragged
    ///   - velocity: Current velocity
    ///   - threshold: Distance threshold for completion
    /// - Returns: True if the gesture should complete the action
    public static func shouldComplete(
        translation: CGFloat,
        velocity: CGFloat,
        threshold: CGFloat = dragThreshold
    ) -> Bool {
        let projectedPosition = translation + decelerationDistance(velocity: velocity) * 0.1
        return abs(projectedPosition) > threshold || abs(velocity) > swipeVelocityThreshold
    }

    /// Calculate snap point from a set of targets
    /// - Parameters:
    ///   - position: Current position
    ///   - velocity: Current velocity
    ///   - targets: Array of snap target positions
    /// - Returns: The target position to snap to
    public static func snapTarget(
        position: CGFloat,
        velocity: CGFloat,
        targets: [CGFloat]
    ) -> CGFloat {
        let projectedPosition = position + decelerationDistance(velocity: velocity) * 0.15
        return targets.min(by: { abs($0 - projectedPosition) < abs($1 - projectedPosition) }) ?? position
    }
}

// MARK: - Motion View Modifiers

/// Press effect that scales down on touch
public struct PressEffectModifier: ViewModifier {
    @State private var isPressed = false
    let scale: CGFloat

    public init(scale: CGFloat = 0.96) {
        self.scale = scale
    }

    public func body(content: Content) -> some View {
        content
            .scaleEffect(isPressed ? scale : 1.0)
            .animation(InsightSpring.micro, value: isPressed)
            .simultaneousGesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { _ in isPressed = true }
                    .onEnded { _ in isPressed = false }
            )
    }
}

/// Shake effect for error feedback
public struct ShakeModifier: ViewModifier {
    let isShaking: Bool
    @State private var shakeOffset: CGFloat = 0

    public func body(content: Content) -> some View {
        content
            .offset(x: shakeOffset)
            .onChange(of: isShaking) { _, newValue in
                guard newValue else { return }
                withAnimation(Animation.linear(duration: 0.05).repeatCount(5, autoreverses: true)) {
                    shakeOffset = 6
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                    shakeOffset = 0
                }
            }
    }
}

/// Pulse effect for attention
public struct PulseModifier: ViewModifier {
    let isActive: Bool
    @State private var isPulsing = false

    public func body(content: Content) -> some View {
        content
            .scaleEffect(isPulsing ? 1.05 : 1.0)
            .opacity(isPulsing ? 0.8 : 1.0)
            .onChange(of: isActive) { _, newValue in
                if newValue {
                    withAnimation(Animation.easeInOut(duration: 0.6).repeatForever(autoreverses: true)) {
                        isPulsing = true
                    }
                } else {
                    withAnimation(InsightSpring.smooth) {
                        isPulsing = false
                    }
                }
            }
    }
}

/// Floating effect for cards and elevated elements
public struct FloatModifier: ViewModifier {
    let isFloating: Bool

    public func body(content: Content) -> some View {
        content
            .offset(y: isFloating ? -4 : 0)
            .shadow(
                color: .black.opacity(isFloating ? 0.15 : 0.08),
                radius: isFloating ? 12 : 4,
                y: isFloating ? 8 : 2
            )
            .animation(InsightSpring.smooth, value: isFloating)
    }
}

/// Swipe card modifier with spring physics
public struct SwipeCardModifier: ViewModifier {
    @Binding var offset: CGSize
    let onSwipeLeft: () -> Void
    let onSwipeRight: () -> Void

    private let swipeThreshold: CGFloat = 80

    public func body(content: Content) -> some View {
        content
            .offset(x: offset.width, y: offset.height * 0.1)
            .rotationEffect(.degrees(Double(offset.width / 20)))
            .gesture(
                DragGesture()
                    .onChanged { gesture in
                        offset = gesture.translation
                    }
                    .onEnded { gesture in
                        let shouldComplete = GesturePhysics.shouldComplete(
                            translation: gesture.translation.width,
                            velocity: gesture.velocity.width,
                            threshold: swipeThreshold
                        )

                        if shouldComplete {
                            let direction: CGFloat = gesture.translation.width > 0 ? 1 : -1
                            withAnimation(InsightSpring.swipe) {
                                offset = CGSize(width: direction * 500, height: 0)
                            }
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                                if direction > 0 {
                                    onSwipeRight()
                                } else {
                                    onSwipeLeft()
                                }
                            }
                        } else {
                            withAnimation(InsightSpring.swipe) {
                                offset = .zero
                            }
                        }
                    }
            )
    }
}

/// Appear animation modifier
public struct AppearModifier: ViewModifier {
    @State private var hasAppeared = false
    let animation: Animation
    let delay: Double

    public init(animation: Animation = InsightSpring.smooth, delay: Double = 0) {
        self.animation = animation
        self.delay = delay
    }

    public func body(content: Content) -> some View {
        content
            .opacity(hasAppeared ? 1 : 0)
            .offset(y: hasAppeared ? 0 : 20)
            .onAppear {
                DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
                    withAnimation(animation) {
                        hasAppeared = true
                    }
                }
            }
    }
}

/// Staggered list animation modifier
public struct StaggeredAppearModifier: ViewModifier {
    let index: Int
    let baseDelay: Double
    @State private var hasAppeared = false

    public init(index: Int, baseDelay: Double = 0.05) {
        self.index = index
        self.baseDelay = baseDelay
    }

    public func body(content: Content) -> some View {
        content
            .opacity(hasAppeared ? 1 : 0)
            .offset(y: hasAppeared ? 0 : 16)
            .scaleEffect(hasAppeared ? 1 : 0.95)
            .onAppear {
                let delay = Double(index) * baseDelay
                DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
                    withAnimation(InsightSpring.smooth) {
                        hasAppeared = true
                    }
                }
            }
    }
}

// MARK: - View Extensions

public extension View {
    /// Apply press effect that scales down on touch
    func pressEffect(scale: CGFloat = 0.96) -> some View {
        modifier(PressEffectModifier(scale: scale))
    }

    /// Apply shake effect for error feedback
    func shake(isShaking: Bool) -> some View {
        modifier(ShakeModifier(isShaking: isShaking))
    }

    /// Apply pulse effect for attention
    func pulse(isActive: Bool) -> some View {
        modifier(PulseModifier(isActive: isActive))
    }

    /// Apply floating effect with shadow
    func floating(isFloating: Bool) -> some View {
        modifier(FloatModifier(isFloating: isFloating))
    }

    /// Apply swipe card gesture with spring physics
    func swipeCard(
        offset: Binding<CGSize>,
        onSwipeLeft: @escaping () -> Void,
        onSwipeRight: @escaping () -> Void
    ) -> some View {
        modifier(SwipeCardModifier(offset: offset, onSwipeLeft: onSwipeLeft, onSwipeRight: onSwipeRight))
    }

    /// Apply appear animation
    func appearAnimation(animation: Animation = InsightSpring.smooth, delay: Double = 0) -> some View {
        modifier(AppearModifier(animation: animation, delay: delay))
    }

    /// Apply staggered appear animation for list items
    func staggeredAppear(index: Int, baseDelay: Double = 0.05) -> some View {
        modifier(StaggeredAppearModifier(index: index, baseDelay: baseDelay))
    }

    /// Apply spring animation with preset
    func springAnimation(_ spring: Animation, value: some Equatable) -> some View {
        animation(spring, value: value)
    }
}

// MARK: - Transition Presets

public extension AnyTransition {
    /// Slide from bottom with fade
    static var slideUp: AnyTransition {
        .asymmetric(
            insertion: .move(edge: .bottom).combined(with: .opacity),
            removal: .move(edge: .bottom).combined(with: .opacity)
        )
    }

    /// Slide from right with fade
    static var slideFromTrailing: AnyTransition {
        .asymmetric(
            insertion: .move(edge: .trailing).combined(with: .opacity),
            removal: .move(edge: .trailing).combined(with: .opacity)
        )
    }

    /// Scale with fade
    static var scaleWithFade: AnyTransition {
        .asymmetric(
            insertion: .scale(scale: 0.9).combined(with: .opacity),
            removal: .scale(scale: 0.9).combined(with: .opacity)
        )
    }

    /// Pop in effect
    static var pop: AnyTransition {
        .asymmetric(
            insertion: .scale(scale: 0.8).combined(with: .opacity),
            removal: .scale(scale: 1.1).combined(with: .opacity)
        )
    }
}

// MARK: - Haptic Feedback

/// Centralized haptic feedback for consistent tactile responses
public enum InsightHaptics {
    /// Light tap feedback
    public static func light() {
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()
    }

    /// Medium impact feedback
    public static func medium() {
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()
    }

    /// Heavy impact feedback
    public static func heavy() {
        let generator = UIImpactFeedbackGenerator(style: .heavy)
        generator.impactOccurred()
    }

    /// Selection changed feedback
    public static func selection() {
        let generator = UISelectionFeedbackGenerator()
        generator.selectionChanged()
    }

    /// Success notification feedback
    public static func success() {
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)
    }

    /// Warning notification feedback
    public static func warning() {
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.warning)
    }

    /// Error notification feedback
    public static func error() {
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.error)
    }
}
