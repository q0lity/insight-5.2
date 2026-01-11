# Magic UI Components Research - SwiftUI Implementations

> Research on Magic UI and similar animated component libraries with SwiftUI implementations

## Overview

[Magic UI](https://magicui.design/) is a React/Next.js library with 150+ animated components built with Tailwind CSS and Framer Motion. This document provides SwiftUI implementations for equivalent effects.

---

## 1. Marquee Text Effects

Continuously scrolling text that loops infinitely, commonly used for announcements or visual interest.

### Basic Implementation

```swift
import SwiftUI

struct MarqueeText: View {
    let text: String
    let font: Font
    let speed: Double // points per second

    @State private var offset: CGFloat = 0
    @State private var textWidth: CGFloat = 0
    @State private var containerWidth: CGFloat = 0

    var body: some View {
        GeometryReader { geometry in
            let totalWidth = textWidth + containerWidth

            HStack(spacing: 0) {
                Text(text)
                    .font(font)
                    .fixedSize()
                    .background(GeometryReader { textGeo in
                        Color.clear.onAppear {
                            textWidth = textGeo.size.width
                        }
                    })

                Text(text)
                    .font(font)
                    .fixedSize()
            }
            .offset(x: -offset)
            .onAppear {
                containerWidth = geometry.size.width
                startAnimation(totalWidth: totalWidth)
            }
        }
        .clipped()
    }

    private func startAnimation(totalWidth: CGFloat) {
        let duration = totalWidth / speed
        withAnimation(.linear(duration: duration).repeatForever(autoreverses: false)) {
            offset = textWidth
        }
    }
}

// Usage
MarqueeText(text: "Breaking News: SwiftUI is amazing! ", font: .headline, speed: 50)
    .frame(height: 30)
```

### Smart Marquee (Only Scrolls if Text Overflows)

```swift
struct SmartMarquee: View {
    let text: String

    @State private var needsScroll = false
    @State private var offset: CGFloat = 0

    var body: some View {
        GeometryReader { geo in
            Text(text)
                .fixedSize()
                .background(GeometryReader { textGeo in
                    Color.clear.onAppear {
                        needsScroll = textGeo.size.width > geo.size.width
                        if needsScroll {
                            withAnimation(.linear(duration: 5).repeatForever(autoreverses: true)) {
                                offset = textGeo.size.width - geo.size.width
                            }
                        }
                    }
                })
                .offset(x: needsScroll ? -offset : 0)
        }
        .clipped()
    }
}
```

**Libraries:** [MarqueeText](https://github.com/joekndy/MarqueeText), [SwiftUIKit/Marquee](https://github.com/SwiftUIKit/Marquee)

---

## 2. Terminal/Typewriter Animations

Text that appears character by character, simulating typing.

### Using Timer

```swift
struct TypewriterText: View {
    let fullText: String
    let typingSpeed: Double // seconds per character

    @State private var displayedText = ""
    @State private var currentIndex = 0

    var body: some View {
        Text(displayedText)
            .onAppear { startTyping() }
    }

    private func startTyping() {
        Timer.scheduledTimer(withTimeInterval: typingSpeed, repeats: true) { timer in
            if currentIndex < fullText.count {
                let index = fullText.index(fullText.startIndex, offsetBy: currentIndex)
                displayedText += String(fullText[index])
                currentIndex += 1
            } else {
                timer.invalidate()
            }
        }
    }
}

// Usage
TypewriterText(fullText: "Hello, World!", typingSpeed: 0.1)
```

### Using Animatable Protocol (Modern Approach)

```swift
struct AnimatableTypewriter: View, Animatable {
    var text: String
    var progress: CGFloat

    var animatableData: CGFloat {
        get { progress }
        set { progress = newValue }
    }

    var body: some View {
        let characterCount = Int(CGFloat(text.count) * progress)
        let displayText = String(text.prefix(characterCount))

        Text(displayText)
            .font(.system(.body, design: .monospaced))
    }
}

struct TypewriterDemo: View {
    @State private var progress: CGFloat = 0
    let text = "Welcome to the terminal..."

    var body: some View {
        AnimatableTypewriter(text: text, progress: progress)
            .onAppear {
                withAnimation(.easeOut(duration: Double(text.count) * 0.05)) {
                    progress = 1
                }
            }
    }
}
```

### Terminal Style with Cursor

```swift
struct TerminalText: View {
    let lines: [String]

    @State private var visibleLines: [String] = []
    @State private var currentLine = 0
    @State private var showCursor = true

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            ForEach(visibleLines, id: \.self) { line in
                HStack(spacing: 0) {
                    Text("$ ").foregroundColor(.green)
                    Text(line)
                }
            }

            if showCursor {
                HStack(spacing: 0) {
                    Text("$ ").foregroundColor(.green)
                    Rectangle()
                        .fill(.green)
                        .frame(width: 10, height: 18)
                        .opacity(showCursor ? 1 : 0)
                }
            }
        }
        .font(.system(.body, design: .monospaced))
        .foregroundColor(.white)
        .padding()
        .background(Color.black)
        .onAppear {
            startTyping()
            startCursorBlink()
        }
    }

    private func startTyping() {
        guard currentLine < lines.count else { return }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            visibleLines.append(lines[currentLine])
            currentLine += 1
            startTyping()
        }
    }

    private func startCursorBlink() {
        Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { _ in
            showCursor.toggle()
        }
    }
}
```

**Libraries:** [AnimateText](https://github.com/jasudev/AnimateText), [TypingAnimationSwiftUI](https://github.com/sndwvv/TypingAnimationSwiftUI)

---

## 3. Hero Video Dialogs

Modal presentations with hero animations that expand from a source view.

```swift
struct HeroVideoDialog: View {
    @Namespace private var animation
    @State private var isExpanded = false
    @State private var selectedVideo: Video?

    struct Video: Identifiable {
        let id = UUID()
        let thumbnail: String
        let title: String
    }

    let videos = [
        Video(thumbnail: "video1", title: "Introduction"),
        Video(thumbnail: "video2", title: "Features")
    ]

    var body: some View {
        ZStack {
            // Grid of thumbnails
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 150))]) {
                ForEach(videos) { video in
                    if selectedVideo?.id != video.id {
                        VideoThumbnail(video: video)
                            .matchedGeometryEffect(id: video.id, in: animation)
                            .onTapGesture {
                                withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
                                    selectedVideo = video
                                    isExpanded = true
                                }
                            }
                    }
                }
            }

            // Expanded overlay
            if isExpanded, let video = selectedVideo {
                Color.black.opacity(0.5)
                    .ignoresSafeArea()
                    .onTapGesture {
                        withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
                            isExpanded = false
                            selectedVideo = nil
                        }
                    }

                ExpandedVideoView(video: video)
                    .matchedGeometryEffect(id: video.id, in: animation)
                    .frame(maxWidth: 600, maxHeight: 400)
            }
        }
    }
}

struct VideoThumbnail: View {
    let video: HeroVideoDialog.Video

    var body: some View {
        RoundedRectangle(cornerRadius: 12)
            .fill(.gray.opacity(0.3))
            .aspectRatio(16/9, contentMode: .fit)
            .overlay {
                Image(systemName: "play.circle.fill")
                    .font(.largeTitle)
                    .foregroundColor(.white)
            }
    }
}

struct ExpandedVideoView: View {
    let video: HeroVideoDialog.Video

    var body: some View {
        RoundedRectangle(cornerRadius: 16)
            .fill(.black)
            .overlay {
                VStack {
                    // Video player placeholder
                    Rectangle()
                        .fill(.gray.opacity(0.5))
                        .aspectRatio(16/9, contentMode: .fit)

                    Text(video.title)
                        .font(.headline)
                        .foregroundColor(.white)
                        .padding()
                }
            }
    }
}
```

**Key Technique:** Use `matchedGeometryEffect` for seamless transitions, or `matchedTransitionSource` (iOS 18+) for navigation stack transitions.

---

## 4. Bento Grid with Animations

Apple-style feature grid with varied cell sizes and entrance animations.

```swift
struct BentoGrid: View {
    @State private var isVisible = false

    var body: some View {
        ScrollView {
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 16) {
                // Large featured cell
                BentoCell(title: "Featured", icon: "star.fill", size: .large)
                    .gridCellColumns(2)
                    .opacity(isVisible ? 1 : 0)
                    .offset(y: isVisible ? 0 : 30)
                    .animation(.spring(response: 0.6).delay(0.1), value: isVisible)

                // Standard cells
                ForEach(0..<4) { index in
                    BentoCell(title: "Feature \(index + 1)", icon: "square.fill", size: .standard)
                        .opacity(isVisible ? 1 : 0)
                        .offset(y: isVisible ? 0 : 30)
                        .animation(.spring(response: 0.6).delay(0.2 + Double(index) * 0.1), value: isVisible)
                }
            }
            .padding()
        }
        .onAppear { isVisible = true }
    }
}

struct BentoCell: View {
    let title: String
    let icon: String
    let size: BentoCellSize

    enum BentoCellSize {
        case standard, large

        var height: CGFloat {
            switch self {
            case .standard: return 150
            case .large: return 200
            }
        }
    }

    @State private var isHovered = false

    var body: some View {
        RoundedRectangle(cornerRadius: 20)
            .fill(.ultraThinMaterial)
            .frame(height: size.height)
            .overlay {
                VStack {
                    Image(systemName: icon)
                        .font(.system(size: 40))
                        .symbolEffect(.bounce, value: isHovered)
                    Text(title)
                        .font(.headline)
                }
            }
            .scaleEffect(isHovered ? 1.02 : 1)
            .shadow(radius: isHovered ? 10 : 5)
            .onHover { hovering in
                withAnimation(.spring(response: 0.3)) {
                    isHovered = hovering
                }
            }
    }
}
```

**Key Techniques:** LazyVGrid with `gridCellColumns`, staggered entrance animations with `.delay()`.

---

## 5. Animated Lists (Stagger, Fade)

List items that enter with staggered animations.

```swift
struct StaggeredList<Item: Identifiable, Content: View>: View {
    let items: [Item]
    let staggerDelay: Double
    @ViewBuilder let content: (Item) -> Content

    @State private var isVisible = false

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                    content(item)
                        .opacity(isVisible ? 1 : 0)
                        .offset(x: isVisible ? 0 : -50)
                        .animation(
                            .spring(response: 0.5, dampingFraction: 0.8)
                            .delay(Double(index) * staggerDelay),
                            value: isVisible
                        )
                }
            }
            .padding()
        }
        .onAppear { isVisible = true }
    }
}

// Usage
struct ListItem: Identifiable {
    let id = UUID()
    let title: String
}

StaggeredList(items: (1...10).map { ListItem(title: "Item \($0)") }, staggerDelay: 0.05) { item in
    Text(item.title)
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.ultraThinMaterial)
        .cornerRadius(10)
}
```

### Phase Animator (iOS 17+)

```swift
struct AnimatedListItem: View {
    let text: String
    let delay: Double

    var body: some View {
        Text(text)
            .padding()
            .background(.ultraThinMaterial)
            .cornerRadius(10)
            .phaseAnimator([false, true], trigger: true) { content, phase in
                content
                    .opacity(phase ? 1 : 0)
                    .offset(y: phase ? 0 : 20)
            } animation: { _ in
                .spring(response: 0.5).delay(delay)
            }
    }
}
```

---

## 6. Dock-Style Navigation

macOS dock magnification effect for navigation items.

```swift
struct DockNavigation: View {
    let items = ["house.fill", "gear", "person.fill", "bell.fill", "envelope.fill"]

    @State private var hoveredIndex: Int? = nil
    @State private var mouseLocation: CGFloat = 0

    var body: some View {
        HStack(spacing: 8) {
            ForEach(Array(items.enumerated()), id: \.offset) { index, icon in
                DockItem(
                    icon: icon,
                    scale: scaleFor(index: index),
                    isHovered: hoveredIndex == index
                )
                .onHover { hovering in
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                        hoveredIndex = hovering ? index : nil
                    }
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(.ultraThinMaterial)
        .clipShape(Capsule())
    }

    private func scaleFor(index: Int) -> CGFloat {
        guard let hovered = hoveredIndex else { return 1.0 }
        let distance = abs(index - hovered)
        switch distance {
        case 0: return 1.5
        case 1: return 1.25
        case 2: return 1.1
        default: return 1.0
        }
    }
}

struct DockItem: View {
    let icon: String
    let scale: CGFloat
    let isHovered: Bool

    var body: some View {
        Image(systemName: icon)
            .font(.system(size: 24))
            .frame(width: 40, height: 40)
            .background(isHovered ? Color.accentColor.opacity(0.2) : Color.clear)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .scaleEffect(scale)
            .offset(y: (1 - scale) * -20)
    }
}
```

**Library:** [swiftui-macos-dock-animation](https://github.com/HuangRunHua/swiftui-macos-dock-animation)

---

## 7. Globe Visualizations

Interactive 3D globe using SceneKit.

```swift
import SwiftUI
import SceneKit

struct GlobeView: UIViewRepresentable {
    func makeUIView(context: Context) -> SCNView {
        let sceneView = SCNView()
        sceneView.scene = createScene()
        sceneView.backgroundColor = .clear
        sceneView.allowsCameraControl = true
        sceneView.autoenablesDefaultLighting = true
        return sceneView
    }

    func updateUIView(_ uiView: SCNView, context: Context) {}

    private func createScene() -> SCNScene {
        let scene = SCNScene()

        // Earth sphere
        let sphere = SCNSphere(radius: 1.0)
        let material = SCNMaterial()
        material.diffuse.contents = UIImage(named: "earth_texture") // Add texture
        material.specular.contents = UIColor.white
        sphere.materials = [material]

        let earthNode = SCNNode(geometry: sphere)
        scene.rootNode.addChildNode(earthNode)

        // Rotation animation
        let rotation = SCNAction.rotateBy(x: 0, y: .pi * 2, z: 0, duration: 30)
        earthNode.runAction(.repeatForever(rotation))

        // Camera
        let cameraNode = SCNNode()
        cameraNode.camera = SCNCamera()
        cameraNode.position = SCNVector3(x: 0, y: 0, z: 3)
        scene.rootNode.addChildNode(cameraNode)

        return scene
    }
}

// Dotted Globe Style
struct DottedGlobe: View {
    @State private var rotation: Double = 0

    var body: some View {
        TimelineView(.animation) { timeline in
            Canvas { context, size in
                let center = CGPoint(x: size.width/2, y: size.height/2)
                let radius = min(size.width, size.height) / 2 - 20

                // Draw dots on sphere surface
                for lat in stride(from: -80.0, through: 80.0, by: 10) {
                    for lon in stride(from: 0.0, through: 360.0, by: 10) {
                        let adjustedLon = lon + rotation
                        let point = projectToSphere(lat: lat, lon: adjustedLon, radius: radius, center: center)

                        if point.z > 0 { // Only draw visible side
                            let opacity = Double(point.z) / radius
                            context.fill(
                                Circle().path(in: CGRect(x: point.x - 2, y: point.y - 2, width: 4, height: 4)),
                                with: .color(.blue.opacity(opacity))
                            )
                        }
                    }
                }
            }
        }
        .onAppear {
            withAnimation(.linear(duration: 20).repeatForever(autoreverses: false)) {
                rotation = 360
            }
        }
    }

    private func projectToSphere(lat: Double, lon: Double, radius: CGFloat, center: CGPoint) -> (x: CGFloat, y: CGFloat, z: CGFloat) {
        let latRad = lat * .pi / 180
        let lonRad = lon * .pi / 180

        let x = center.x + radius * CGFloat(cos(latRad) * sin(lonRad))
        let y = center.y - radius * CGFloat(sin(latRad))
        let z = radius * CGFloat(cos(latRad) * cos(lonRad))

        return (x, y, z)
    }
}
```

**Libraries:** [SwiftGlobe](https://github.com/dmojdehi/SwiftGlobe), [dot-globe](https://github.com/inventhq/dot-globe)

---

## 8. Orbiting Circles

Elements that rotate around a central point.

```swift
struct OrbitingCircles: View {
    let orbitCount: Int
    let iconSize: CGFloat

    var body: some View {
        GeometryReader { geo in
            let center = CGPoint(x: geo.size.width/2, y: geo.size.height/2)
            let maxRadius = min(geo.size.width, geo.size.height) / 2 - iconSize

            ZStack {
                // Center element
                Circle()
                    .fill(.blue)
                    .frame(width: 60, height: 60)
                    .position(center)

                // Orbiting elements
                ForEach(0..<orbitCount, id: \.self) { index in
                    let radius = maxRadius * CGFloat(index + 1) / CGFloat(orbitCount)
                    let duration = 3.0 + Double(index) * 2 // Outer orbits slower

                    OrbitingElement(
                        radius: radius,
                        duration: duration,
                        center: center,
                        icon: systemIcons[index % systemIcons.count]
                    )

                    // Orbit path
                    Circle()
                        .stroke(.gray.opacity(0.2), lineWidth: 1)
                        .frame(width: radius * 2, height: radius * 2)
                        .position(center)
                }
            }
        }
    }

    private var systemIcons: [String] {
        ["star.fill", "heart.fill", "bolt.fill", "moon.fill", "sun.max.fill"]
    }
}

struct OrbitingElement: View {
    let radius: CGFloat
    let duration: Double
    let center: CGPoint
    let icon: String

    @State private var angle: Double = 0

    var body: some View {
        let x = center.x + radius * CGFloat(cos(angle * .pi / 180))
        let y = center.y + radius * CGFloat(sin(angle * .pi / 180))

        Image(systemName: icon)
            .font(.title2)
            .foregroundColor(.blue)
            .position(x: x, y: y)
            .onAppear {
                withAnimation(.linear(duration: duration).repeatForever(autoreverses: false)) {
                    angle = 360
                }
            }
    }
}
```

---

## 9. Avatar Stacks

Overlapping avatar images with expand/collapse animation.

```swift
struct AvatarStack: View {
    let avatars: [String] // Image names or URLs
    let maxVisible: Int
    let overlapOffset: CGFloat

    @State private var isExpanded = false

    var body: some View {
        HStack(spacing: isExpanded ? 8 : -overlapOffset) {
            ForEach(Array(avatars.prefix(maxVisible).enumerated()), id: \.offset) { index, avatar in
                AvatarView(imageName: avatar)
                    .zIndex(Double(avatars.count - index))
                    .transition(.scale.combined(with: .opacity))
            }

            if avatars.count > maxVisible {
                CountBadge(count: avatars.count - maxVisible)
            }
        }
        .onTapGesture {
            withAnimation(.spring(response: 0.4, dampingFraction: 0.7)) {
                isExpanded.toggle()
            }
        }
    }
}

struct AvatarView: View {
    let imageName: String

    var body: some View {
        Circle()
            .fill(
                LinearGradient(
                    colors: [.blue, .purple],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .frame(width: 44, height: 44)
            .overlay {
                Text(String(imageName.prefix(1)).uppercased())
                    .font(.headline)
                    .foregroundColor(.white)
            }
            .overlay {
                Circle()
                    .stroke(.white, lineWidth: 2)
            }
    }
}

struct CountBadge: View {
    let count: Int

    var body: some View {
        Circle()
            .fill(.gray.opacity(0.8))
            .frame(width: 44, height: 44)
            .overlay {
                Text("+\(count)")
                    .font(.caption.bold())
                    .foregroundColor(.white)
            }
    }
}

// Usage
AvatarStack(avatars: ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank"], maxVisible: 4, overlapOffset: 16)
```

---

## 10. Icon Clouds / Tag Clouds

Flowing layout of icons or tags with animations.

```swift
struct IconCloud: View {
    let icons: [String]

    @State private var selectedIcon: String?

    var body: some View {
        FlowLayout(spacing: 12) {
            ForEach(icons, id: \.self) { icon in
                IconChip(
                    icon: icon,
                    isSelected: selectedIcon == icon
                )
                .onTapGesture {
                    withAnimation(.spring(response: 0.3)) {
                        selectedIcon = selectedIcon == icon ? nil : icon
                    }
                }
            }
        }
    }
}

struct IconChip: View {
    let icon: String
    let isSelected: Bool

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .symbolEffect(.bounce, value: isSelected)

            if isSelected {
                Text(icon)
                    .font(.caption)
                    .transition(.scale.combined(with: .opacity))
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(isSelected ? Color.blue : Color.gray.opacity(0.2))
        .foregroundColor(isSelected ? .white : .primary)
        .clipShape(Capsule())
    }
}

// Simple FlowLayout implementation
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = arrange(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(proposal: proposal, subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y), proposal: .unspecified)
        }
    }

    private func arrange(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, positions: [CGPoint]) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var currentX: CGFloat = 0
        var currentY: CGFloat = 0
        var lineHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)

            if currentX + size.width > maxWidth && currentX > 0 {
                currentX = 0
                currentY += lineHeight + spacing
                lineHeight = 0
            }

            positions.append(CGPoint(x: currentX, y: currentY))
            currentX += size.width + spacing
            lineHeight = max(lineHeight, size.height)
        }

        return (CGSize(width: maxWidth, height: currentY + lineHeight), positions)
    }
}
```

**Libraries:** [TagCloud](https://github.com/yarosl4v/TagCloud), [swiftui-flow-layout](https://github.com/globulus/swiftui-flow-layout)

---

## 11. Animated Progress Indicators

Various progress visualization styles.

### Circular Progress

```swift
struct CircularProgress: View {
    let progress: Double // 0.0 to 1.0
    let lineWidth: CGFloat
    let gradient: LinearGradient

    var body: some View {
        ZStack {
            // Background track
            Circle()
                .stroke(.gray.opacity(0.2), lineWidth: lineWidth)

            // Progress arc
            Circle()
                .trim(from: 0, to: progress)
                .stroke(gradient, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.spring(response: 0.6), value: progress)

            // Percentage text
            Text("\(Int(progress * 100))%")
                .font(.title2.bold())
                .contentTransition(.numericText())
        }
    }
}

// Usage
@State private var progress = 0.0

CircularProgress(
    progress: progress,
    lineWidth: 12,
    gradient: LinearGradient(colors: [.blue, .purple], startPoint: .leading, endPoint: .trailing)
)
.frame(width: 120, height: 120)
.onAppear {
    withAnimation(.easeInOut(duration: 2)) {
        progress = 0.75
    }
}
```

### Animated Loading Spinner

```swift
struct LoadingSpinner: View {
    @State private var rotation: Double = 0
    @State private var trimEnd: CGFloat = 0.3

    var body: some View {
        Circle()
            .trim(from: 0, to: trimEnd)
            .stroke(
                AngularGradient(
                    colors: [.blue.opacity(0), .blue],
                    center: .center
                ),
                style: StrokeStyle(lineWidth: 4, lineCap: .round)
            )
            .frame(width: 40, height: 40)
            .rotationEffect(.degrees(rotation))
            .onAppear {
                withAnimation(.linear(duration: 1).repeatForever(autoreverses: false)) {
                    rotation = 360
                }
                withAnimation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true)) {
                    trimEnd = 0.8
                }
            }
    }
}
```

### Step Progress

```swift
struct StepProgress: View {
    let steps: Int
    let currentStep: Int

    var body: some View {
        HStack(spacing: 0) {
            ForEach(0..<steps, id: \.self) { step in
                // Circle
                Circle()
                    .fill(step <= currentStep ? Color.blue : Color.gray.opacity(0.3))
                    .frame(width: 30, height: 30)
                    .overlay {
                        if step < currentStep {
                            Image(systemName: "checkmark")
                                .font(.caption.bold())
                                .foregroundColor(.white)
                        } else {
                            Text("\(step + 1)")
                                .font(.caption.bold())
                                .foregroundColor(step == currentStep ? .white : .gray)
                        }
                    }
                    .scaleEffect(step == currentStep ? 1.1 : 1.0)
                    .animation(.spring(response: 0.3), value: currentStep)

                // Connector line
                if step < steps - 1 {
                    Rectangle()
                        .fill(step < currentStep ? Color.blue : Color.gray.opacity(0.3))
                        .frame(height: 3)
                        .animation(.easeInOut(duration: 0.3), value: currentStep)
                }
            }
        }
    }
}
```

---

## 12. File Trees with Animations

Hierarchical file browser with expand/collapse.

```swift
struct FileItem: Identifiable {
    let id = UUID()
    let name: String
    let icon: String
    var children: [FileItem]?

    var isFolder: Bool { children != nil }
}

struct FileTreeView: View {
    let root: FileItem

    var body: some View {
        List {
            FileRow(item: root, depth: 0)
        }
        .listStyle(.sidebar)
    }
}

struct FileRow: View {
    let item: FileItem
    let depth: Int

    @State private var isExpanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                if item.isFolder {
                    Image(systemName: isExpanded ? "chevron.down" : "chevron.right")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .frame(width: 16)
                        .contentTransition(.symbolEffect(.replace))
                }

                Image(systemName: item.icon)
                    .foregroundColor(item.isFolder ? .blue : .secondary)

                Text(item.name)
                    .font(.body)
            }
            .padding(.leading, CGFloat(depth) * 16)
            .padding(.vertical, 4)
            .contentShape(Rectangle())
            .onTapGesture {
                if item.isFolder {
                    withAnimation(.spring(response: 0.3)) {
                        isExpanded.toggle()
                    }
                }
            }

            if isExpanded, let children = item.children {
                ForEach(children) { child in
                    FileRow(item: child, depth: depth + 1)
                        .transition(.move(edge: .top).combined(with: .opacity))
                }
            }
        }
    }
}

// Usage
let sampleTree = FileItem(name: "Project", icon: "folder.fill", children: [
    FileItem(name: "Sources", icon: "folder.fill", children: [
        FileItem(name: "App.swift", icon: "swift", children: nil),
        FileItem(name: "ContentView.swift", icon: "swift", children: nil)
    ]),
    FileItem(name: "README.md", icon: "doc.text", children: nil)
])
```

**Alternative:** Use SwiftUI's built-in `OutlineGroup` for automatic hierarchical list rendering.

---

## 13. Code Comparison Views

Side-by-side or inline diff view for code.

```swift
struct CodeDiffView: View {
    let oldLines: [String]
    let newLines: [String]

    var body: some View {
        HStack(spacing: 0) {
            // Old code
            VStack(alignment: .leading, spacing: 0) {
                ForEach(Array(oldLines.enumerated()), id: \.offset) { index, line in
                    CodeLine(
                        lineNumber: index + 1,
                        text: line,
                        type: diffType(for: line, in: newLines)
                    )
                }
            }

            Divider()

            // New code
            VStack(alignment: .leading, spacing: 0) {
                ForEach(Array(newLines.enumerated()), id: \.offset) { index, line in
                    CodeLine(
                        lineNumber: index + 1,
                        text: line,
                        type: diffType(for: line, in: oldLines, isNew: true)
                    )
                }
            }
        }
        .font(.system(.body, design: .monospaced))
    }

    enum DiffType {
        case unchanged, added, removed

        var backgroundColor: Color {
            switch self {
            case .unchanged: return .clear
            case .added: return .green.opacity(0.2)
            case .removed: return .red.opacity(0.2)
            }
        }
    }

    private func diffType(for line: String, in otherLines: [String], isNew: Bool = false) -> DiffType {
        if otherLines.contains(line) {
            return .unchanged
        }
        return isNew ? .added : .removed
    }
}

struct CodeLine: View {
    let lineNumber: Int
    let text: String
    let type: CodeDiffView.DiffType

    var body: some View {
        HStack(spacing: 8) {
            Text("\(lineNumber)")
                .foregroundColor(.secondary)
                .frame(width: 30, alignment: .trailing)

            Text(text)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 2)
        .background(type.backgroundColor)
    }
}
```

---

## 14. Scroll Progress Indicators

Progress bar that tracks scroll position.

```swift
struct ScrollProgressView<Content: View>: View {
    @ViewBuilder let content: Content

    @State private var scrollProgress: CGFloat = 0

    var body: some View {
        ZStack(alignment: .top) {
            // Scroll content
            ScrollView {
                content
                    .background(
                        GeometryReader { contentGeo in
                            Color.clear
                                .preference(
                                    key: ScrollOffsetKey.self,
                                    value: contentGeo.frame(in: .named("scroll"))
                                )
                        }
                    )
            }
            .coordinateSpace(name: "scroll")
            .onPreferenceChange(ScrollOffsetKey.self) { frame in
                let totalHeight = frame.height - UIScreen.main.bounds.height
                let offset = -frame.minY
                scrollProgress = min(max(offset / totalHeight, 0), 1)
            }

            // Progress bar
            GeometryReader { geo in
                Rectangle()
                    .fill(Color.blue)
                    .frame(width: geo.size.width * scrollProgress, height: 3)
            }
            .frame(height: 3)
        }
    }
}

struct ScrollOffsetKey: PreferenceKey {
    static var defaultValue: CGRect = .zero
    static func reduce(value: inout CGRect, nextValue: () -> CGRect) {
        value = nextValue()
    }
}

// Circular reading progress
struct ReadingProgress: View {
    let progress: CGFloat

    var body: some View {
        ZStack {
            Circle()
                .stroke(.gray.opacity(0.2), lineWidth: 3)

            Circle()
                .trim(from: 0, to: progress)
                .stroke(.blue, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                .rotationEffect(.degrees(-90))

            Text("\(Int(progress * 100))%")
                .font(.caption2.bold())
        }
        .frame(width: 44, height: 44)
        .animation(.spring(response: 0.3), value: progress)
    }
}
```

---

## 15. Lens/Magnifier Effects

Zoom lens that follows touch or pointer.

```swift
struct MagnifierView: View {
    let image: Image
    let magnification: CGFloat
    let lensSize: CGFloat

    @State private var position: CGPoint = .zero
    @State private var isActive = false

    var body: some View {
        GeometryReader { geo in
            ZStack {
                image
                    .resizable()
                    .aspectRatio(contentMode: .fit)

                if isActive {
                    // Magnified lens
                    Circle()
                        .fill(.clear)
                        .frame(width: lensSize, height: lensSize)
                        .overlay {
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .scaleEffect(magnification)
                                .offset(
                                    x: (geo.size.width/2 - position.x) * magnification,
                                    y: (geo.size.height/2 - position.y) * magnification
                                )
                        }
                        .clipShape(Circle())
                        .overlay(Circle().stroke(.white, lineWidth: 3))
                        .shadow(radius: 10)
                        .position(position)
                }
            }
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { value in
                        isActive = true
                        position = value.location
                    }
                    .onEnded { _ in
                        isActive = false
                    }
            )
        }
    }
}

// Usage
MagnifierView(
    image: Image("sample"),
    magnification: 2.5,
    lensSize: 120
)
```

---

## 16. Pointer Following Effects

Elements that follow cursor/touch position.

```swift
struct PointerFollower: View {
    @State private var position: CGPoint = .zero
    @State private var isHovering = false

    var body: some View {
        GeometryReader { geo in
            ZStack {
                // Content
                RoundedRectangle(cornerRadius: 20)
                    .fill(.ultraThinMaterial)
                    .overlay {
                        // Gradient spotlight following pointer
                        RadialGradient(
                            colors: [.blue.opacity(0.3), .clear],
                            center: UnitPoint(
                                x: position.x / geo.size.width,
                                y: position.y / geo.size.height
                            ),
                            startRadius: 0,
                            endRadius: 200
                        )
                        .opacity(isHovering ? 1 : 0)
                        .animation(.easeOut(duration: 0.3), value: isHovering)
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 20))

                // Following element
                if isHovering {
                    Circle()
                        .fill(.blue)
                        .frame(width: 20, height: 20)
                        .position(position)
                        .transition(.scale)
                }
            }
            .onContinuousHover { phase in
                switch phase {
                case .active(let location):
                    withAnimation(.spring(response: 0.15)) {
                        position = location
                        isHovering = true
                    }
                case .ended:
                    isHovering = false
                }
            }
        }
    }
}
```

---

## 17. Animated Beams/Borders

Animated gradient border effect.

```swift
struct AnimatedBorderView<Content: View>: View {
    let content: Content
    let lineWidth: CGFloat
    let cornerRadius: CGFloat

    @State private var rotation: Double = 0

    init(lineWidth: CGFloat = 3, cornerRadius: CGFloat = 16, @ViewBuilder content: () -> Content) {
        self.content = content()
        self.lineWidth = lineWidth
        self.cornerRadius = cornerRadius
    }

    var body: some View {
        content
            .padding(lineWidth)
            .background {
                RoundedRectangle(cornerRadius: cornerRadius)
                    .stroke(
                        AngularGradient(
                            colors: [.blue, .purple, .pink, .orange, .yellow, .blue],
                            center: .center,
                            startAngle: .degrees(rotation),
                            endAngle: .degrees(rotation + 360)
                        ),
                        lineWidth: lineWidth
                    )
            }
            .onAppear {
                withAnimation(.linear(duration: 3).repeatForever(autoreverses: false)) {
                    rotation = 360
                }
            }
    }
}

// Beam effect (traveling light)
struct BeamBorder: View {
    let cornerRadius: CGFloat

    @State private var progress: CGFloat = 0

    var body: some View {
        RoundedRectangle(cornerRadius: cornerRadius)
            .trim(from: max(0, progress - 0.2), to: progress)
            .stroke(
                LinearGradient(
                    colors: [.clear, .blue, .clear],
                    startPoint: .leading,
                    endPoint: .trailing
                ),
                style: StrokeStyle(lineWidth: 3, lineCap: .round)
            )
            .onAppear {
                withAnimation(.linear(duration: 2).repeatForever(autoreverses: false)) {
                    progress = 1.2
                }
            }
    }
}
```

---

## 18. Shine Effects

Shimmer/shine effect that sweeps across views.

```swift
struct ShineModifier: ViewModifier {
    let duration: Double
    let delay: Double

    @State private var phase: CGFloat = 0

    func body(content: Content) -> some View {
        content
            .overlay {
                GeometryReader { geo in
                    LinearGradient(
                        colors: [
                            .clear,
                            .white.opacity(0.5),
                            .clear
                        ],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    .frame(width: geo.size.width * 0.5)
                    .offset(x: geo.size.width * (phase - 0.5))
                    .blur(radius: 5)
                }
            }
            .mask(content)
            .onAppear {
                withAnimation(.easeInOut(duration: duration).delay(delay).repeatForever(autoreverses: false)) {
                    phase = 1.5
                }
            }
    }
}

extension View {
    func shine(duration: Double = 1.5, delay: Double = 0.5) -> some View {
        modifier(ShineModifier(duration: duration, delay: delay))
    }
}

// Usage
Text("PREMIUM")
    .font(.largeTitle.bold())
    .foregroundColor(.yellow)
    .shine()
```

**Library:** [SwiftUI-Shimmer](https://github.com/markiv/SwiftUI-Shimmer)

---

## 19. Meteor/Particle Effects

Animated particles for visual effects.

```swift
struct MeteorShower: View {
    let count: Int

    var body: some View {
        TimelineView(.animation) { timeline in
            Canvas { context, size in
                let time = timeline.date.timeIntervalSinceReferenceDate

                for i in 0..<count {
                    let seed = Double(i) * 1234.5678
                    let x = (sin(seed) * 0.5 + 0.5) * size.width
                    let progress = (time * 0.5 + seed).truncatingRemainder(dividingBy: 1)
                    let y = progress * size.height * 1.5 - size.height * 0.25

                    let opacity = 1 - progress
                    let length: CGFloat = 50

                    var path = Path()
                    path.move(to: CGPoint(x: x, y: y))
                    path.addLine(to: CGPoint(x: x - length * 0.3, y: y - length))

                    context.stroke(
                        path,
                        with: .linearGradient(
                            Gradient(colors: [.white.opacity(opacity), .clear]),
                            startPoint: CGPoint(x: x, y: y),
                            endPoint: CGPoint(x: x - length * 0.3, y: y - length)
                        ),
                        lineWidth: 2
                    )
                }
            }
        }
    }
}

// Floating particles
struct FloatingParticles: View {
    let count: Int
    let colors: [Color]

    var body: some View {
        TimelineView(.animation) { timeline in
            Canvas { context, size in
                let time = timeline.date.timeIntervalSinceReferenceDate

                for i in 0..<count {
                    let seed = Double(i) * 999.999
                    let baseX = (sin(seed) * 0.5 + 0.5) * size.width
                    let baseY = (cos(seed * 2) * 0.5 + 0.5) * size.height

                    let x = baseX + sin(time + seed) * 20
                    let y = baseY + cos(time * 0.7 + seed) * 20

                    let particleSize = 4 + sin(seed) * 2

                    context.fill(
                        Circle().path(in: CGRect(x: x, y: y, width: particleSize, height: particleSize)),
                        with: .color(colors[i % colors.count].opacity(0.6))
                    )
                }
            }
        }
    }
}
```

**Library:** [Vortex](https://github.com/twostraws/Vortex) - High-performance particle effects including confetti, fire, rain, snow, and more.

---

## 20. Neon Gradients

Glowing text and UI elements with neon effect.

```swift
struct NeonText: View {
    let text: String
    let color: Color
    let glowRadius: CGFloat

    var body: some View {
        ZStack {
            // Outer glow layers
            ForEach(0..<3) { i in
                Text(text)
                    .font(.largeTitle.bold())
                    .foregroundColor(color)
                    .blur(radius: glowRadius * CGFloat(3 - i))
            }

            // Main text
            Text(text)
                .font(.largeTitle.bold())
                .foregroundColor(.white)
        }
    }
}

// Animated pulsing neon
struct PulsingNeon: View {
    let text: String
    let color: Color

    @State private var glowIntensity: CGFloat = 0.5

    var body: some View {
        ZStack {
            Text(text)
                .font(.largeTitle.bold())
                .foregroundColor(color)
                .blur(radius: 20 * glowIntensity)

            Text(text)
                .font(.largeTitle.bold())
                .foregroundColor(color)
                .blur(radius: 10 * glowIntensity)

            Text(text)
                .font(.largeTitle.bold())
                .foregroundColor(.white)
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) {
                glowIntensity = 1.0
            }
        }
    }
}

// Neon border
struct NeonBorder: View {
    let cornerRadius: CGFloat
    let color: Color

    var body: some View {
        RoundedRectangle(cornerRadius: cornerRadius)
            .stroke(color, lineWidth: 2)
            .shadow(color: color, radius: 5)
            .shadow(color: color, radius: 10)
            .shadow(color: color, radius: 15)
    }
}
```

**Library:** [AppleIntelligenceGlowEffect](https://github.com/jacobamobin/AppleIntelligenceGlowEffect)

---

## 21. Confetti Celebrations

Particle explosions for celebrations.

```swift
struct ConfettiView: View {
    @State private var particles: [ConfettiParticle] = []
    @State private var trigger = false

    let colors: [Color] = [.red, .blue, .green, .yellow, .purple, .orange, .pink]

    var body: some View {
        ZStack {
            // Particles
            ForEach(particles) { particle in
                particle.shape
                    .fill(particle.color)
                    .frame(width: particle.size, height: particle.size)
                    .rotationEffect(.degrees(particle.rotation))
                    .position(particle.position)
                    .opacity(particle.opacity)
            }
        }
        .onChange(of: trigger) { _ in
            explode()
        }
    }

    struct ConfettiParticle: Identifiable {
        let id = UUID()
        var position: CGPoint
        var color: Color
        var size: CGFloat
        var rotation: Double
        var opacity: Double
        var shape: AnyShape
    }

    private func explode() {
        let center = CGPoint(x: UIScreen.main.bounds.width / 2, y: UIScreen.main.bounds.height / 2)

        for _ in 0..<50 {
            let particle = ConfettiParticle(
                position: center,
                color: colors.randomElement()!,
                size: CGFloat.random(in: 8...16),
                rotation: 0,
                opacity: 1,
                shape: AnyShape([Circle(), Rectangle(), Capsule()].randomElement()!)
            )
            particles.append(particle)
        }

        // Animate particles
        withAnimation(.easeOut(duration: 2)) {
            for i in particles.indices {
                let angle = Double.random(in: 0...360)
                let distance = CGFloat.random(in: 100...300)

                particles[i].position = CGPoint(
                    x: center.x + cos(angle * .pi / 180) * distance,
                    y: center.y + sin(angle * .pi / 180) * distance + 200 // gravity
                )
                particles[i].rotation = Double.random(in: 0...720)
                particles[i].opacity = 0
            }
        }

        // Cleanup
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            particles.removeAll()
        }
    }

    func fire() {
        trigger.toggle()
    }
}
```

**Libraries:**
- [ConfettiSwiftUI](https://github.com/simibac/ConfettiSwiftUI)
- [SPConfetti](https://github.com/ivanvorobei/SPConfetti)
- [Vortex](https://github.com/twostraws/Vortex) (includes confetti preset)

---

## 22. Scratch-to-Reveal

Scratch card effect using gesture and mask.

```swift
struct ScratchCard<Revealed: View, Cover: View>: View {
    @ViewBuilder let revealed: Revealed
    @ViewBuilder let cover: Cover
    let lineWidth: CGFloat

    @State private var points: [CGPoint] = []

    var body: some View {
        ZStack {
            revealed

            cover
                .mask {
                    Canvas { context, size in
                        // Start with full coverage
                        context.fill(
                            Rectangle().path(in: CGRect(origin: .zero, size: size)),
                            with: .color(.white)
                        )

                        // Erase scratched areas
                        if points.count > 1 {
                            var path = Path()
                            path.move(to: points[0])
                            for point in points.dropFirst() {
                                path.addLine(to: point)
                            }

                            context.blendMode = .destinationOut
                            context.stroke(
                                path,
                                with: .color(.white),
                                style: StrokeStyle(lineWidth: lineWidth, lineCap: .round, lineJoin: .round)
                            )
                        }
                    }
                }
        }
        .gesture(
            DragGesture(minimumDistance: 0)
                .onChanged { value in
                    points.append(value.location)
                }
        )
    }
}

// Usage
ScratchCard(lineWidth: 50) {
    // Revealed content
    VStack {
        Text("YOU WON!")
            .font(.largeTitle.bold())
        Text("$1,000,000")
            .font(.title)
            .foregroundColor(.green)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(Color.yellow)
} cover: {
    // Cover content
    ZStack {
        Color.gray
        Text("SCRATCH HERE")
            .font(.headline)
            .foregroundColor(.white)
    }
}
.frame(width: 300, height: 200)
.clipShape(RoundedRectangle(cornerRadius: 20))
```

**Library:** [ios-scratch-card-view](https://github.com/anupdsouza/ios-scratch-card-view) - Includes shine effect, haptic feedback, and motion tilt.

---

## Summary

This research covers SwiftUI implementations for Magic UI-style animated components. Key patterns used:

1. **Animation Modifiers:** `.animation()`, `.withAnimation()`, `.transition()`
2. **Geometry Effects:** `matchedGeometryEffect`, `GeometryReader`
3. **Canvas & TimelineView:** For complex particle and drawing animations
4. **Gestures:** `DragGesture`, `MagnifyGesture`, `onHover`
5. **SceneKit Integration:** For 3D globe visualizations
6. **Custom ViewModifiers:** For reusable effects like shimmer, glow
7. **Layout Protocol:** For custom layouts like FlowLayout

### Recommended Libraries

| Component | Library | Link |
|-----------|---------|------|
| Marquee | SwiftUIKit/Marquee | [GitHub](https://github.com/SwiftUIKit/Marquee) |
| Particles | Vortex | [GitHub](https://github.com/twostraws/Vortex) |
| Confetti | ConfettiSwiftUI | [GitHub](https://github.com/simibac/ConfettiSwiftUI) |
| Shimmer | SwiftUI-Shimmer | [GitHub](https://github.com/markiv/SwiftUI-Shimmer) |
| Globe | dot-globe | [GitHub](https://github.com/inventhq/dot-globe) |
| Tag Cloud | TagCloud | [GitHub](https://github.com/yarosl4v/TagCloud) |
| Glow Effect | AppleIntelligenceGlowEffect | [GitHub](https://github.com/jacobamobin/AppleIntelligenceGlowEffect) |

---

## 23. Glassmorphism Effects

Frosted glass UI with translucent blur, subtle borders, and depth.

### Basic Glass Card

```swift
struct GlassCard<Content: View>: View {
    @ViewBuilder let content: Content
    let cornerRadius: CGFloat

    init(cornerRadius: CGFloat = 20, @ViewBuilder content: () -> Content) {
        self.cornerRadius = cornerRadius
        self.content = content()
    }

    var body: some View {
        content
            .padding(20)
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(
                        LinearGradient(
                            colors: [.white.opacity(0.5), .white.opacity(0.1)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1
                    )
            }
            .shadow(color: .black.opacity(0.15), radius: 20, y: 10)
    }
}

// Usage
GlassCard {
    VStack(alignment: .leading, spacing: 12) {
        Image(systemName: "cloud.fill")
            .font(.largeTitle)
        Text("Weather")
            .font(.headline)
        Text("Partly cloudy, 72°F")
            .font(.subheadline)
            .foregroundColor(.secondary)
    }
}
```

### Material Types Comparison

```swift
struct MaterialShowcase: View {
    var body: some View {
        ZStack {
            // Colorful background for effect visibility
            LinearGradient(
                colors: [.purple, .blue, .cyan, .green],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 20) {
                materialCard(.ultraThinMaterial, label: "Ultra Thin")
                materialCard(.thinMaterial, label: "Thin")
                materialCard(.regularMaterial, label: "Regular")
                materialCard(.thickMaterial, label: "Thick")
                materialCard(.ultraThickMaterial, label: "Ultra Thick")
            }
            .padding()
        }
    }

    private func materialCard(_ material: Material, label: String) -> some View {
        Text(label)
            .padding()
            .frame(maxWidth: .infinity)
            .background(material)
            .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
```

### Animated Glass with Gradient Border

```swift
struct AnimatedGlassCard: View {
    @State private var gradientRotation: Double = 0

    var body: some View {
        VStack {
            Text("Premium Feature")
                .font(.headline)
            Text("Unlock advanced capabilities")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(24)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(
                    AngularGradient(
                        colors: [.blue, .purple, .pink, .blue],
                        center: .center,
                        startAngle: .degrees(gradientRotation),
                        endAngle: .degrees(gradientRotation + 360)
                    ),
                    lineWidth: 2
                )
                .blur(radius: 2)
        }
        .onAppear {
            withAnimation(.linear(duration: 4).repeatForever(autoreverses: false)) {
                gradientRotation = 360
            }
        }
    }
}
```

### iOS 26 Glass Effect (When Available)

```swift
// iOS 26+ native glass effect
struct ModernGlassCard: View {
    var body: some View {
        VStack {
            Text("Glass Content")
        }
        .padding()
        #if swift(>=6.0)
        .glassEffect() // iOS 26+ native modifier
        #else
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        #endif
    }
}
```

### Vibrancy Effect (Using UIKit Bridge)

```swift
import SwiftUI

struct VibrancyView: UIViewRepresentable {
    var style: UIBlurEffect.Style = .systemUltraThinMaterial
    var vibrancyStyle: UIVibrancyEffectStyle = .label

    func makeUIView(context: Context) -> UIVisualEffectView {
        let blurEffect = UIBlurEffect(style: style)
        let blurView = UIVisualEffectView(effect: blurEffect)

        let vibrancyEffect = UIVibrancyEffect(blurEffect: blurEffect, style: vibrancyStyle)
        let vibrancyView = UIVisualEffectView(effect: vibrancyEffect)
        vibrancyView.translatesAutoresizingMaskIntoConstraints = false

        blurView.contentView.addSubview(vibrancyView)
        NSLayoutConstraint.activate([
            vibrancyView.leadingAnchor.constraint(equalTo: blurView.contentView.leadingAnchor),
            vibrancyView.trailingAnchor.constraint(equalTo: blurView.contentView.trailingAnchor),
            vibrancyView.topAnchor.constraint(equalTo: blurView.contentView.topAnchor),
            vibrancyView.bottomAnchor.constraint(equalTo: blurView.contentView.bottomAnchor)
        ])

        return blurView
    }

    func updateUIView(_ uiView: UIVisualEffectView, context: Context) {}
}
```

**Libraries:** [VisualEffects](https://github.com/twostraws/VisualEffects), [swiftui-visual-effects](https://github.com/lucasbrown/swiftui-visual-effects)

---

## 24. Parallax Effects

Motion-based depth effects responding to device tilt or scroll.

### Device Motion Parallax (CoreMotion)

```swift
import SwiftUI
import CoreMotion

class MotionManager: ObservableObject {
    private let motionManager = CMMotionManager()

    @Published var roll: Double = 0
    @Published var pitch: Double = 0

    init() {
        startMotionUpdates()
    }

    func startMotionUpdates() {
        guard motionManager.isDeviceMotionAvailable else { return }

        motionManager.deviceMotionUpdateInterval = 1/60
        motionManager.startDeviceMotionUpdates(to: .main) { [weak self] motion, error in
            guard let motion = motion else { return }
            self?.roll = motion.attitude.roll
            self?.pitch = motion.attitude.pitch
        }
    }

    deinit {
        motionManager.stopDeviceMotionUpdates()
    }
}

struct ParallaxCard: View {
    @StateObject private var motion = MotionManager()
    let intensity: CGFloat

    var body: some View {
        ZStack {
            // Background layer (moves less)
            Image(systemName: "circle.fill")
                .font(.system(size: 200))
                .foregroundColor(.blue.opacity(0.3))
                .offset(
                    x: motion.roll * 20 * intensity,
                    y: motion.pitch * 20 * intensity
                )

            // Middle layer
            RoundedRectangle(cornerRadius: 20)
                .fill(.ultraThinMaterial)
                .frame(width: 250, height: 350)
                .offset(
                    x: motion.roll * 40 * intensity,
                    y: motion.pitch * 40 * intensity
                )

            // Foreground layer (moves most)
            VStack {
                Image(systemName: "star.fill")
                    .font(.largeTitle)
                Text("Parallax")
                    .font(.title.bold())
            }
            .offset(
                x: motion.roll * 60 * intensity,
                y: motion.pitch * 60 * intensity
            )
        }
        .animation(.spring(response: 0.3), value: motion.roll)
        .animation(.spring(response: 0.3), value: motion.pitch)
    }
}
```

### Drag Gesture 3D Parallax

```swift
struct Drag3DCard: View {
    @State private var dragOffset: CGSize = .zero

    var body: some View {
        RoundedRectangle(cornerRadius: 20)
            .fill(
                LinearGradient(
                    colors: [.blue, .purple],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .frame(width: 280, height: 180)
            .overlay {
                VStack {
                    Image(systemName: "creditcard.fill")
                        .font(.largeTitle)
                    Text("3D Card")
                        .font(.headline)
                }
                .foregroundColor(.white)
            }
            .rotation3DEffect(
                .degrees(dragOffset.width / 10),
                axis: (x: 0, y: 1, z: 0)
            )
            .rotation3DEffect(
                .degrees(-dragOffset.height / 10),
                axis: (x: 1, y: 0, z: 0)
            )
            .gesture(
                DragGesture()
                    .onChanged { value in
                        dragOffset = value.translation
                    }
                    .onEnded { _ in
                        withAnimation(.spring(response: 0.5, dampingFraction: 0.6)) {
                            dragOffset = .zero
                        }
                    }
            )
    }
}
```

### Scroll-Based Parallax Header

```swift
struct ParallaxHeader<Content: View, Header: View>: View {
    let headerHeight: CGFloat
    @ViewBuilder let header: Header
    @ViewBuilder let content: Content

    @State private var scrollOffset: CGFloat = 0

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                GeometryReader { geo in
                    let offset = geo.frame(in: .named("scroll")).minY

                    header
                        .frame(width: geo.size.width, height: headerHeight + max(0, offset))
                        .clipped()
                        .offset(y: -max(0, offset))
                        .scaleEffect(1 + max(0, offset) / 500)
                        .preference(key: ScrollOffsetPreferenceKey.self, value: offset)
                }
                .frame(height: headerHeight)

                content
            }
        }
        .coordinateSpace(name: "scroll")
        .onPreferenceChange(ScrollOffsetPreferenceKey.self) { value in
            scrollOffset = value
        }
    }
}

struct ScrollOffsetPreferenceKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = nextValue()
    }
}

// Usage
ParallaxHeader(headerHeight: 300) {
    Image("hero")
        .resizable()
        .aspectRatio(contentMode: .fill)
} content: {
    VStack(spacing: 20) {
        ForEach(0..<20) { i in
            Text("Item \(i)")
                .frame(maxWidth: .infinity)
                .padding()
                .background(.ultraThinMaterial)
        }
    }
    .padding()
}
```

---

## 25. Morphing Shapes

Smooth transitions between different shapes using animatable paths.

### Basic Shape Morphing

```swift
struct MorphingShape: Shape {
    var morphProgress: CGFloat // 0 = circle, 1 = square

    var animatableData: CGFloat {
        get { morphProgress }
        set { morphProgress = newValue }
    }

    func path(in rect: CGRect) -> Path {
        let cornerRadius = rect.width / 2 * (1 - morphProgress)
        return RoundedRectangle(cornerRadius: cornerRadius).path(in: rect)
    }
}

struct MorphingDemo: View {
    @State private var isSquare = false

    var body: some View {
        MorphingShape(morphProgress: isSquare ? 1 : 0)
            .fill(
                LinearGradient(
                    colors: [.blue, .purple],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .frame(width: 150, height: 150)
            .onTapGesture {
                withAnimation(.spring(response: 0.6, dampingFraction: 0.7)) {
                    isSquare.toggle()
                }
            }
    }
}
```

### Blob Morphing Animation

```swift
struct BlobShape: Shape {
    var time: Double
    var pointCount: Int = 6
    var amplitude: CGFloat = 0.15

    var animatableData: Double {
        get { time }
        set { time = newValue }
    }

    func path(in rect: CGRect) -> Path {
        let center = CGPoint(x: rect.midX, y: rect.midY)
        let radius = min(rect.width, rect.height) / 2 * 0.8

        var path = Path()
        let angleStep = .pi * 2 / Double(pointCount)

        for i in 0..<pointCount {
            let angle = Double(i) * angleStep
            let offset = sin(time + Double(i) * 0.5) * amplitude
            let r = radius * (1 + offset)

            let point = CGPoint(
                x: center.x + r * cos(angle),
                y: center.y + r * sin(angle)
            )

            if i == 0 {
                path.move(to: point)
            } else {
                // Smooth curves between points
                let prevAngle = Double(i - 1) * angleStep
                let prevOffset = sin(time + Double(i - 1) * 0.5) * amplitude
                let prevR = radius * (1 + prevOffset)
                let controlR = (r + prevR) / 2 * 1.1

                let control = CGPoint(
                    x: center.x + controlR * cos((angle + prevAngle) / 2),
                    y: center.y + controlR * sin((angle + prevAngle) / 2)
                )
                path.addQuadCurve(to: point, control: control)
            }
        }
        path.closeSubpath()
        return path
    }
}

struct AnimatedBlob: View {
    @State private var time: Double = 0

    var body: some View {
        BlobShape(time: time)
            .fill(
                LinearGradient(
                    colors: [.pink, .purple, .blue],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .frame(width: 200, height: 200)
            .onAppear {
                withAnimation(.linear(duration: 4).repeatForever(autoreverses: false)) {
                    time = .pi * 2
                }
            }
    }
}
```

**Libraries:** [MorphingShapes](https://github.com/alexdremov/MorphingShapes), [SwiftUI-PathAnimations](https://github.com/adellibovi/SwiftUI-PathAnimations), [BlobMaker](https://github.com/alldritt/BlobMaker)

---

## 26. Mesh Gradients (iOS 18+)

Complex multi-point gradients with organic color blending.

### Basic Mesh Gradient

```swift
@available(iOS 18.0, *)
struct BasicMeshGradient: View {
    var body: some View {
        MeshGradient(
            width: 3,
            height: 3,
            points: [
                [0.0, 0.0], [0.5, 0.0], [1.0, 0.0],
                [0.0, 0.5], [0.5, 0.5], [1.0, 0.5],
                [0.0, 1.0], [0.5, 1.0], [1.0, 1.0]
            ],
            colors: [
                .red, .orange, .yellow,
                .purple, .pink, .orange,
                .blue, .indigo, .purple
            ]
        )
        .ignoresSafeArea()
    }
}
```

### Animated Mesh Gradient

```swift
@available(iOS 18.0, *)
struct AnimatedMeshGradient: View {
    @State private var animate = false

    let basePoints: [SIMD2<Float>] = [
        [0.0, 0.0], [0.5, 0.0], [1.0, 0.0],
        [0.0, 0.5], [0.5, 0.5], [1.0, 0.5],
        [0.0, 1.0], [0.5, 1.0], [1.0, 1.0]
    ]

    var animatedPoints: [SIMD2<Float>] {
        var points = basePoints
        if animate {
            // Animate center point
            points[4] = [0.6, 0.4]
            // Animate edge points
            points[1] = [0.4, 0.1]
            points[7] = [0.6, 0.9]
        }
        return points
    }

    var body: some View {
        MeshGradient(
            width: 3,
            height: 3,
            points: animatedPoints,
            colors: [
                .blue, .cyan, .teal,
                .purple, .pink, .orange,
                .indigo, .purple, .blue
            ]
        )
        .ignoresSafeArea()
        .onAppear {
            withAnimation(.easeInOut(duration: 3).repeatForever(autoreverses: true)) {
                animate = true
            }
        }
    }
}
```

### Mesh Gradient with Glassmorphism Overlay

```swift
@available(iOS 18.0, *)
struct GlassOverMesh: View {
    var body: some View {
        ZStack {
            MeshGradient(
                width: 3,
                height: 3,
                points: [
                    [0.0, 0.0], [0.5, 0.0], [1.0, 0.0],
                    [0.0, 0.5], [0.5, 0.5], [1.0, 0.5],
                    [0.0, 1.0], [0.5, 1.0], [1.0, 1.0]
                ],
                colors: [
                    .purple, .blue, .cyan,
                    .pink, .indigo, .teal,
                    .orange, .purple, .blue
                ]
            )
            .ignoresSafeArea()

            VStack {
                Text("Welcome")
                    .font(.largeTitle.bold())
                Text("Beautiful backgrounds")
                    .font(.subheadline)
            }
            .padding(40)
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 20))
        }
    }
}
```

---

## 27. Ripple Effects

Touch-triggered wave animations spreading from contact point.

### Simple Ripple Animation

```swift
struct RippleEffect: View {
    @State private var ripples: [Ripple] = []

    struct Ripple: Identifiable {
        let id = UUID()
        var position: CGPoint
        var scale: CGFloat = 0
        var opacity: Double = 1
    }

    var body: some View {
        GeometryReader { geo in
            ZStack {
                Color.blue.opacity(0.1)

                ForEach(ripples) { ripple in
                    Circle()
                        .stroke(.blue, lineWidth: 2)
                        .frame(width: 50, height: 50)
                        .scaleEffect(ripple.scale)
                        .opacity(ripple.opacity)
                        .position(ripple.position)
                }
            }
            .contentShape(Rectangle())
            .onTapGesture { location in
                addRipple(at: location)
            }
        }
    }

    private func addRipple(at location: CGPoint) {
        let ripple = Ripple(position: location)
        ripples.append(ripple)

        let index = ripples.count - 1

        withAnimation(.easeOut(duration: 0.8)) {
            ripples[index].scale = 6
            ripples[index].opacity = 0
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            ripples.removeAll { $0.id == ripple.id }
        }
    }
}
```

### Metal Shader Ripple (iOS 17+)

```swift
// Requires Metal shader file
struct MetalRippleView: View {
    @State private var counter: Int = 0
    @State private var origin: CGPoint = .zero

    var body: some View {
        Image("photo")
            .resizable()
            .aspectRatio(contentMode: .fit)
            .modifier(RippleModifier(counter: counter, origin: origin))
            .onTapGesture { location in
                origin = location
                counter += 1
            }
    }
}

struct RippleModifier: ViewModifier {
    var counter: Int
    var origin: CGPoint

    func body(content: Content) -> some View {
        content
            .keyframeAnimator(
                initialValue: 0.0,
                trigger: counter
            ) { view, elapsedTime in
                view.visualEffect { content, proxy in
                    content
                        .distortionEffect(
                            ShaderLibrary.ripple(
                                .float2(origin),
                                .float(elapsedTime),
                                .float(12), // amplitude
                                .float(15), // frequency
                                .float(0.7), // decay
                                .float(400) // speed
                            ),
                            maxSampleOffset: .zero
                        )
                }
            } keyframes: { _ in
                MoveKeyframe(0)
                LinearKeyframe(1.5, duration: 1.5)
            }
    }
}
```

**Libraries:** [SwiftUIRippleEffect](https://github.com/Jnis/SwiftUIRippleEffect), [Inferno](https://github.com/twostraws/Inferno)

---

## 28. Spring Animations

Physics-based bouncy animations.

### Spring Parameters

```swift
struct SpringShowcase: View {
    @State private var animate = false

    var body: some View {
        VStack(spacing: 40) {
            // Default spring
            springCircle("Default", animation: .spring())

            // Bouncy spring
            springCircle("Bouncy", animation: .spring(response: 0.5, dampingFraction: 0.5))

            // Snappy spring
            springCircle("Snappy", animation: .spring(response: 0.3, dampingFraction: 0.8))

            // Smooth spring (no bounce)
            springCircle("Smooth", animation: .spring(response: 0.5, dampingFraction: 1.0))

            // iOS 17+ bouncy preset
            springCircle("Bouncy Preset", animation: .bouncy(duration: 0.5, extraBounce: 0.2))
        }
        .onTapGesture {
            animate.toggle()
        }
    }

    private func springCircle(_ label: String, animation: Animation) -> some View {
        HStack {
            Text(label)
                .frame(width: 120, alignment: .leading)

            Circle()
                .fill(.blue)
                .frame(width: 40, height: 40)
                .offset(x: animate ? 100 : 0)
                .animation(animation, value: animate)
        }
    }
}
```

### Interactive Spring Drag

```swift
struct SpringDrag: View {
    @State private var offset: CGSize = .zero
    @State private var isDragging = false

    var body: some View {
        Circle()
            .fill(.blue)
            .frame(width: 80, height: 80)
            .scaleEffect(isDragging ? 1.2 : 1.0)
            .offset(offset)
            .gesture(
                DragGesture()
                    .onChanged { value in
                        isDragging = true
                        offset = value.translation
                    }
                    .onEnded { _ in
                        isDragging = false
                        withAnimation(.spring(response: 0.4, dampingFraction: 0.6)) {
                            offset = .zero
                        }
                    }
            )
            .animation(.spring(response: 0.3), value: isDragging)
    }
}
```

---

## 29. Progressive Blur / Edge Fade

Gradual blur and fade effects at view edges.

### Bottom Fade with Blur

```swift
struct BottomFadeBlur: View {
    var body: some View {
        ZStack(alignment: .bottom) {
            ScrollView {
                VStack(spacing: 16) {
                    ForEach(0..<20) { i in
                        Text("Item \(i)")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(.gray.opacity(0.1))
                            .cornerRadius(10)
                    }
                }
                .padding()
                .padding(.bottom, 80) // Space for fade
            }

            // Fade overlay
            VStack(spacing: 0) {
                Rectangle()
                    .fill(.ultraThinMaterial)
                    .mask {
                        LinearGradient(
                            colors: [.clear, .white],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    }
                    .frame(height: 80)
            }
        }
    }
}
```

### Variable Blur (Metal-Powered)

```swift
// Conceptual implementation - requires Variablur library
struct VariableBlurExample: View {
    var body: some View {
        Image("photo")
            .resizable()
            .aspectRatio(contentMode: .fill)
            .variableBlur(radius: 20) { context, size in
                // Gradient mask for variable blur
                context.fill(
                    Rectangle().path(in: CGRect(origin: .zero, size: size)),
                    with: .linearGradient(
                        Gradient(colors: [.white, .clear]),
                        startPoint: .init(x: size.width/2, y: 0),
                        endPoint: .init(x: size.width/2, y: size.height)
                    )
                )
            }
    }
}
```

### Edge Vignette

```swift
struct VignetteOverlay: View {
    var body: some View {
        RadialGradient(
            colors: [.clear, .black.opacity(0.5)],
            center: .center,
            startRadius: 100,
            endRadius: 400
        )
        .allowsHitTesting(false)
    }
}

struct VignetteImage: View {
    var body: some View {
        Image("photo")
            .resizable()
            .aspectRatio(contentMode: .fill)
            .overlay(VignetteOverlay())
    }
}
```

**Library:** [Variablur](https://github.com/daprice/Variablur)

---

## 30. Metal Shader Effects

High-performance GPU-accelerated visual effects.

### Layer Effects (iOS 17+)

```swift
struct ShaderEffects: View {
    @State private var intensity: Float = 0.5

    var body: some View {
        VStack(spacing: 30) {
            // Color effect
            Image("photo")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .colorEffect(ShaderLibrary.colorInvert())

            // Distortion effect
            Image("photo")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .distortionEffect(
                    ShaderLibrary.wave(.float(intensity)),
                    maxSampleOffset: CGSize(width: 20, height: 20)
                )

            Slider(value: $intensity, in: 0...1)
                .padding()
        }
    }
}
```

### Inferno Library Effects

```swift
// Using Inferno library
struct InfernoEffects: View {
    @State private var time: Double = 0

    var body: some View {
        TimelineView(.animation) { timeline in
            let elapsed = timeline.date.timeIntervalSinceReferenceDate

            Image("photo")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .colorEffect(
                    ShaderLibrary.emboss(.float(elapsed))
                )
        }
    }
}
```

### Drawing Group for Performance

```swift
struct HighPerformanceParticles: View {
    var body: some View {
        ZStack {
            ForEach(0..<100) { i in
                Circle()
                    .fill(.blue.opacity(0.5))
                    .frame(width: 20, height: 20)
                    .offset(
                        x: CGFloat.random(in: -150...150),
                        y: CGFloat.random(in: -150...150)
                    )
                    .blur(radius: 5)
            }
        }
        .drawingGroup() // Render to Metal texture
    }
}
```

**Library:** [Inferno](https://github.com/twostraws/Inferno)

---

## Additional Special Effects Summary

| Effect | Key Technique | Best For |
|--------|---------------|----------|
| Glassmorphism | `.ultraThinMaterial` + stroke + shadow | Cards, overlays, modals |
| Parallax | CoreMotion + layered offsets | Hero sections, cards |
| Morphing | `Animatable` protocol + Path | Shape transitions, loaders |
| Mesh Gradients | `MeshGradient` (iOS 18+) | Backgrounds, hero areas |
| Ripple | KeyframeAnimator + Metal shaders | Touch feedback, buttons |
| Spring | `.spring()` with tuned parameters | All interactive elements |
| Progressive Blur | Material + gradient mask | Scroll fades, overlays |
| Metal Shaders | `.colorEffect()`, `.distortionEffect()` | Complex visual effects |

### Performance Tips

1. **Use `drawingGroup()`** for complex layered views with blur/shadows
2. **Limit material layers** - each adds GPU overhead
3. **Prefer native materials** over UIKit bridges when possible
4. **Use `Canvas`** for many simple shapes instead of individual views
5. **Metal shaders** are highly optimized - prefer over CPU-based effects
