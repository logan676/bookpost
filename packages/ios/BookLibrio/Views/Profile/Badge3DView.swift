/**
 * Badge3DView - 3D Metallic Badge Component
 * Creates realistic 3D medal/badge effects using layered gradients and shadows
 * Supports interactive gestures: drag to rotate, double-tap to flip
 */

import SwiftUI

// MARK: - 3D Badge View
struct Badge3DView: View {
    let iconName: String
    let color: Color
    let isEarned: Bool
    let level: Int
    let size: CGFloat
    let showProgress: Bool
    let progress: Double
    let enableInteraction: Bool

    @State private var isAnimating = false

    init(
        iconName: String,
        color: Color,
        isEarned: Bool = true,
        level: Int = 1,
        size: CGFloat = 60,
        showProgress: Bool = false,
        progress: Double = 0,
        enableInteraction: Bool = false
    ) {
        self.iconName = iconName
        self.color = color
        self.isEarned = isEarned
        self.level = level
        self.size = size
        self.showProgress = showProgress
        self.progress = progress
        self.enableInteraction = enableInteraction
    }

    var body: some View {
        ZStack {
            // Drop shadow for depth
            Circle()
                .fill(Color.black.opacity(0.3))
                .frame(width: size * 0.9, height: size * 0.5)
                .offset(y: size * 0.4)
                .blur(radius: size * 0.1)

            // Outer metallic ring
            outerRing

            // Main badge body
            mainBadgeBody

            // Inner embossed circle
            innerEmboss

            // Icon
            iconView

            // Top highlight shine
            topShine

            // Level indicator
            if level > 1 && isEarned {
                levelIndicator
            }

            // Progress ring
            if showProgress && !isEarned {
                progressRing
            }
        }
        .frame(width: size * 1.2, height: size * 1.2)
        .onAppear {
            if isEarned {
                withAnimation(.easeInOut(duration: 2).repeatForever(autoreverses: true)) {
                    isAnimating = true
                }
            }
        }
    }

    // MARK: - Outer Ring
    private var outerRing: some View {
        ZStack {
            // Base ring
            Circle()
                .fill(
                    AngularGradient(
                        colors: isEarned ? [
                            color.opacity(0.9),
                            color.opacity(0.6),
                            color.opacity(0.3),
                            color.opacity(0.6),
                            color.opacity(0.9),
                            color.opacity(0.6),
                            color.opacity(0.3),
                            color.opacity(0.6),
                            color.opacity(0.9)
                        ] : [
                            Color.gray.opacity(0.5),
                            Color.gray.opacity(0.3),
                            Color.gray.opacity(0.5)
                        ],
                        center: .center
                    )
                )
                .frame(width: size * 1.1, height: size * 1.1)

            // Outer ring highlight
            Circle()
                .stroke(
                    LinearGradient(
                        colors: [
                            .white.opacity(0.6),
                            .clear,
                            .black.opacity(0.2)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: size * 0.03
                )
                .frame(width: size * 1.08, height: size * 1.08)
        }
    }

    // MARK: - Main Badge Body
    private var mainBadgeBody: some View {
        ZStack {
            // Base color with metallic gradient
            Circle()
                .fill(
                    LinearGradient(
                        colors: isEarned ? [
                            color.lighter(by: 0.3),
                            color,
                            color.darker(by: 0.2),
                            color.darker(by: 0.4)
                        ] : [
                            Color.gray.opacity(0.6),
                            Color.gray.opacity(0.4),
                            Color.gray.opacity(0.3)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: size, height: size)

            // Radial highlight for 3D dome effect
            Circle()
                .fill(
                    RadialGradient(
                        colors: isEarned ? [
                            color.lighter(by: 0.4).opacity(0.8),
                            color.opacity(0.0)
                        ] : [
                            Color.white.opacity(0.2),
                            Color.clear
                        ],
                        center: UnitPoint(x: 0.35, y: 0.35),
                        startRadius: 0,
                        endRadius: size * 0.5
                    )
                )
                .frame(width: size, height: size)

            // Bottom shadow for depth
            Circle()
                .fill(
                    LinearGradient(
                        colors: [
                            .clear,
                            .black.opacity(isEarned ? 0.3 : 0.15)
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .frame(width: size, height: size)
        }
        .shadow(color: isEarned ? color.opacity(0.5) : .clear, radius: size * 0.15, x: 0, y: size * 0.05)
    }

    // MARK: - Inner Emboss
    private var innerEmboss: some View {
        ZStack {
            // Inner circle cutout effect
            Circle()
                .stroke(
                    LinearGradient(
                        colors: [
                            .black.opacity(0.3),
                            .clear,
                            .white.opacity(0.3)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: size * 0.04
                )
                .frame(width: size * 0.7, height: size * 0.7)

            // Inner surface
            Circle()
                .fill(
                    LinearGradient(
                        colors: isEarned ? [
                            color.darker(by: 0.1),
                            color.darker(by: 0.25)
                        ] : [
                            Color.gray.opacity(0.35),
                            Color.gray.opacity(0.25)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: size * 0.65, height: size * 0.65)
        }
    }

    // MARK: - Icon
    private var iconView: some View {
        Image(systemName: iconName)
            .font(.system(size: size * 0.35, weight: .semibold))
            .foregroundStyle(
                LinearGradient(
                    colors: isEarned ? [
                        .white,
                        .white.opacity(0.85)
                    ] : [
                        .white.opacity(0.5),
                        .white.opacity(0.35)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .shadow(color: .black.opacity(0.3), radius: 1, x: 0, y: 1)
    }

    // MARK: - Top Shine
    private var topShine: some View {
        Ellipse()
            .fill(
                LinearGradient(
                    colors: [
                        .white.opacity(isAnimating ? 0.6 : 0.4),
                        .white.opacity(0.1),
                        .clear
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .frame(width: size * 0.5, height: size * 0.25)
            .offset(y: -size * 0.25)
            .blur(radius: 2)
    }

    // MARK: - Level Indicator
    private var levelIndicator: some View {
        VStack {
            Spacer()
            HStack {
                Spacer()
                Text("Lv.\(level)")
                    .font(.system(size: size * 0.15, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, size * 0.08)
                    .padding(.vertical, size * 0.04)
                    .background(
                        Capsule()
                            .fill(
                                LinearGradient(
                                    colors: [levelColor.lighter(by: 0.2), levelColor],
                                    startPoint: .top,
                                    endPoint: .bottom
                                )
                            )
                            .shadow(color: .black.opacity(0.3), radius: 2, x: 0, y: 1)
                    )
            }
        }
        .frame(width: size * 1.1, height: size * 1.1)
    }

    // MARK: - Progress Ring
    private var progressRing: some View {
        Circle()
            .trim(from: 0, to: progress / 100)
            .stroke(
                AngularGradient(
                    colors: [color.lighter(by: 0.2), color, color.darker(by: 0.2)],
                    center: .center
                ),
                style: StrokeStyle(lineWidth: size * 0.06, lineCap: .round)
            )
            .frame(width: size * 1.15, height: size * 1.15)
            .rotationEffect(.degrees(-90))
    }

    private var levelColor: Color {
        switch level {
        case 1: return .gray
        case 2: return .green
        case 3: return .blue
        case 4: return .purple
        case 5: return .orange
        default: return .gray
        }
    }
}

// MARK: - Interactive 3D Badge (for detail views with gestures)
struct Interactive3DBadgeView: View {
    let iconName: String
    let color: Color
    let isEarned: Bool
    let level: Int
    let badgeName: String
    let badgeDescription: String?
    let earnedDate: Date?

    // Rotation state
    @State private var rotationX: Double = 0
    @State private var rotationY: Double = 0
    @State private var lastDragValue: CGSize = .zero

    // Flip state
    @State private var isFlipped = false
    @State private var flipDegrees: Double = 0

    // Scale state
    @State private var scale: CGFloat = 1.0
    @State private var isPressed = false

    // Shimmer
    @State private var shimmerOffset: CGFloat = -200

    // Auto animation
    @State private var autoRotation: Double = 0

    private let badgeSize: CGFloat = 120

    var body: some View {
        ZStack {
            // Ambient glow
            Circle()
                .fill(
                    RadialGradient(
                        colors: isEarned ? [
                            color.opacity(0.4),
                            color.opacity(0.1),
                            .clear
                        ] : [.clear],
                        center: .center,
                        startRadius: 50,
                        endRadius: 140
                    )
                )
                .frame(width: 280, height: 280)
                .blur(radius: 10)

            // Front side (badge)
            frontView
                .opacity(isFlipped ? 0 : 1)

            // Back side (info)
            backView
                .rotation3DEffect(.degrees(180), axis: (x: 0, y: 1, z: 0))
                .opacity(isFlipped ? 1 : 0)
        }
        .rotation3DEffect(
            .degrees(flipDegrees),
            axis: (x: 0, y: 1, z: 0),
            perspective: 0.5
        )
        .rotation3DEffect(
            .degrees(rotationX),
            axis: (x: 1, y: 0, z: 0),
            perspective: 0.5
        )
        .rotation3DEffect(
            .degrees(rotationY + autoRotation),
            axis: (x: 0, y: 1, z: 0),
            perspective: 0.5
        )
        .scaleEffect(scale)
        .gesture(dragGesture)
        .gesture(doubleTapGesture)
        .gesture(longPressGesture)
        .onAppear {
            startAutoAnimation()
        }
    }

    // MARK: - Front View (Badge)
    private var frontView: some View {
        ZStack {
            Badge3DView(
                iconName: iconName,
                color: color,
                isEarned: isEarned,
                level: level,
                size: badgeSize
            )

            // Shimmer effect
            if isEarned && !isFlipped {
                shimmerView
            }
        }
    }

    // MARK: - Back View (Badge Info)
    private var backView: some View {
        ZStack {
            // Base circle
            Circle()
                .fill(
                    LinearGradient(
                        colors: [
                            color.darker(by: 0.3),
                            color.darker(by: 0.5)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: badgeSize * 1.1, height: badgeSize * 1.1)
                .shadow(color: color.opacity(0.5), radius: 20, x: 0, y: 10)

            // Inner circle with info
            Circle()
                .fill(
                    LinearGradient(
                        colors: [
                            color.darker(by: 0.2),
                            color.darker(by: 0.4)
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .frame(width: badgeSize * 0.95, height: badgeSize * 0.95)
                .overlay(
                    Circle()
                        .stroke(
                            LinearGradient(
                                colors: [.white.opacity(0.3), .clear],
                                startPoint: .top,
                                endPoint: .bottom
                            ),
                            lineWidth: 2
                        )
                )

            // Badge info text
            VStack(spacing: 6) {
                Text(badgeName)
                    .font(.system(size: badgeSize * 0.12, weight: .bold))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)

                if level > 1 {
                    Text("Level \(level)")
                        .font(.system(size: badgeSize * 0.09, weight: .semibold))
                        .foregroundColor(.white.opacity(0.8))
                }

                if let date = earnedDate {
                    Divider()
                        .frame(width: badgeSize * 0.5)
                        .background(Color.white.opacity(0.3))

                    Text(date, style: .date)
                        .font(.system(size: badgeSize * 0.08))
                        .foregroundColor(.white.opacity(0.7))
                }
            }
            .frame(width: badgeSize * 0.8)
        }
    }

    // MARK: - Shimmer
    private var shimmerView: some View {
        Rectangle()
            .fill(
                LinearGradient(
                    colors: [
                        .clear,
                        .white.opacity(0.4),
                        .clear
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .frame(width: 50, height: 250)
            .rotationEffect(.degrees(30))
            .offset(x: shimmerOffset)
            .mask(
                Circle()
                    .frame(width: badgeSize * 1.15, height: badgeSize * 1.15)
            )
            .onAppear {
                withAnimation(.easeInOut(duration: 2.5).repeatForever(autoreverses: false).delay(1.5)) {
                    shimmerOffset = 200
                }
            }
    }

    // MARK: - Gestures

    // Drag to rotate
    private var dragGesture: some Gesture {
        DragGesture()
            .onChanged { value in
                // Stop auto animation during drag
                withAnimation(.linear(duration: 0.1)) {
                    autoRotation = 0
                }

                let deltaX = value.translation.width - lastDragValue.width
                let deltaY = value.translation.height - lastDragValue.height

                rotationY += deltaX * 0.5
                rotationX -= deltaY * 0.3

                // Clamp X rotation
                rotationX = min(max(rotationX, -30), 30)

                lastDragValue = value.translation
            }
            .onEnded { _ in
                lastDragValue = .zero

                // Spring back with bounce
                withAnimation(.spring(response: 0.5, dampingFraction: 0.6)) {
                    rotationX = 0
                    rotationY = fmod(rotationY, 360) // Normalize rotation
                }

                // Resume auto animation after delay
                DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                    startAutoAnimation()
                }
            }
    }

    // Double tap to flip
    private var doubleTapGesture: some Gesture {
        TapGesture(count: 2)
            .onEnded {
                withAnimation(.spring(response: 0.6, dampingFraction: 0.7)) {
                    isFlipped.toggle()
                    flipDegrees += 180
                }

                // Haptic feedback
                let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
                impactFeedback.impactOccurred()
            }
    }

    // Long press to scale
    private var longPressGesture: some Gesture {
        LongPressGesture(minimumDuration: 0.3)
            .onChanged { _ in
                withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                    scale = 1.15
                    isPressed = true
                }
            }
            .onEnded { _ in
                withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                    scale = 1.0
                    isPressed = false
                }

                // Haptic feedback
                let impactFeedback = UIImpactFeedbackGenerator(style: .light)
                impactFeedback.impactOccurred()
            }
    }

    // MARK: - Auto Animation
    private func startAutoAnimation() {
        guard isEarned else { return }
        withAnimation(.easeInOut(duration: 4).repeatForever(autoreverses: true)) {
            autoRotation = 8
        }
    }
}

// MARK: - Legacy Large Badge (Simple version)
struct LargeBadge3DView: View {
    let iconName: String
    let color: Color
    let isEarned: Bool
    let level: Int

    var body: some View {
        Interactive3DBadgeView(
            iconName: iconName,
            color: color,
            isEarned: isEarned,
            level: level,
            badgeName: "",
            badgeDescription: nil,
            earnedDate: nil
        )
    }
}

// MARK: - Color Extension for Lighter/Darker
extension Color {
    func lighter(by percentage: CGFloat) -> Color {
        return self.adjust(by: abs(percentage))
    }

    func darker(by percentage: CGFloat) -> Color {
        return self.adjust(by: -abs(percentage))
    }

    private func adjust(by percentage: CGFloat) -> Color {
        var red: CGFloat = 0
        var green: CGFloat = 0
        var blue: CGFloat = 0
        var alpha: CGFloat = 0

        UIColor(self).getRed(&red, green: &green, blue: &blue, alpha: &alpha)

        if percentage > 0 {
            // Lighter
            red = min(red + (1 - red) * percentage, 1.0)
            green = min(green + (1 - green) * percentage, 1.0)
            blue = min(blue + (1 - blue) * percentage, 1.0)
        } else {
            // Darker
            let factor = 1 + percentage
            red = max(red * factor, 0)
            green = max(green * factor, 0)
            blue = max(blue * factor, 0)
        }

        return Color(red: red, green: green, blue: blue, opacity: alpha)
    }
}

// MARK: - Preview
#Preview("3D Badges") {
    ScrollView {
        VStack(spacing: 40) {
            Text("3D Badge Showcase")
                .font(.title.bold())

            // Different categories
            HStack(spacing: 30) {
                Badge3DView(
                    iconName: "flame.fill",
                    color: .orange,
                    isEarned: true,
                    level: 3,
                    size: 70
                )

                Badge3DView(
                    iconName: "book.closed.fill",
                    color: .purple,
                    isEarned: true,
                    level: 2,
                    size: 70
                )

                Badge3DView(
                    iconName: "star.fill",
                    color: .yellow,
                    isEarned: false,
                    level: 1,
                    size: 70,
                    showProgress: true,
                    progress: 65
                )
            }

            // Size comparison
            HStack(spacing: 20) {
                Badge3DView(iconName: "flame.fill", color: .orange, size: 40)
                Badge3DView(iconName: "flame.fill", color: .orange, size: 60)
                Badge3DView(iconName: "flame.fill", color: .orange, size: 80)
            }
        }
        .padding()
    }
    .background(Color(.systemGroupedBackground))
}

#Preview("Interactive 3D Badge") {
    VStack(spacing: 20) {
        Text("Interactive 3D Badge")
            .font(.title.bold())

        Text("Drag to rotate • Double-tap to flip • Long-press to scale")
            .font(.caption)
            .foregroundColor(.secondary)

        Interactive3DBadgeView(
            iconName: "crown.fill",
            color: .orange,
            isEarned: true,
            level: 5,
            badgeName: "阅读达人",
            badgeDescription: "连续阅读30天",
            earnedDate: Date()
        )

        Spacer()
    }
    .padding()
    .background(Color(.systemGroupedBackground))
}
