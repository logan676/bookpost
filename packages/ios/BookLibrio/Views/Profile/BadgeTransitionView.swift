/**
 * BadgeTransitionView - Badge Detail with Hero Transition
 * Implements smooth scale transition from badge list to detail view
 */

import SwiftUI

// MARK: - Badge Detail Overlay (Full Screen with Transition)
struct BadgeDetailOverlay: View {
    let badge: BadgeItem
    let namespace: Namespace.ID
    let onDismiss: () -> Void

    @State private var isAppeared = false
    @State private var dragOffset: CGSize = .zero
    @State private var isDragging = false

    var body: some View {
        ZStack {
            // Dimmed background
            Color.black
                .opacity(isAppeared ? 0.7 : 0)
                .ignoresSafeArea()
                .onTapGesture {
                    dismissWithAnimation()
                }

            // Content
            VStack(spacing: 0) {
                // Drag indicator
                if isAppeared {
                    dragIndicator
                        .transition(.opacity)
                }

                Spacer()

                // 3D Badge with matched geometry
                badge3DSection
                    .offset(y: dragOffset.height * 0.5)

                Spacer()

                // Badge info panel
                if isAppeared {
                    badgeInfoPanel
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
            .padding()
        }
        .gesture(dismissDragGesture)
        .onAppear {
            withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
                isAppeared = true
            }
        }
    }

    // MARK: - Drag Indicator
    private var dragIndicator: some View {
        Capsule()
            .fill(Color.white.opacity(0.5))
            .frame(width: 40, height: 5)
            .padding(.top, 12)
    }

    // MARK: - 3D Badge Section
    private var badge3DSection: some View {
        Interactive3DBadgeView(
            iconName: iconName,
            color: categoryColor,
            isEarned: isEarned,
            level: level,
            badgeName: name,
            badgeDescription: badgeDescription,
            earnedDate: earnedDate
        )
        .matchedGeometryEffect(id: "badge_\(badge.id)", in: namespace)
        .scaleEffect(isDragging ? 0.95 : 1.0)
    }

    // MARK: - Badge Info Panel
    private var badgeInfoPanel: some View {
        VStack(spacing: 16) {
            // Badge name and level
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(name)
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)

                    if level > 1 {
                        HStack(spacing: 4) {
                            ForEach(0..<level, id: \.self) { _ in
                                Image(systemName: "star.fill")
                                    .font(.caption2)
                                    .foregroundColor(.yellow)
                            }
                        }
                    }
                }

                Spacer()

                // Category tag
                Text(category.displayName)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(categoryColor.opacity(0.8))
                    .cornerRadius(16)
            }

            // Description
            if let desc = badgeDescription {
                Text(desc)
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.8))
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            // Requirement
            if let req = requirement {
                HStack(spacing: 8) {
                    Image(systemName: "target")
                        .foregroundColor(.orange)
                    Text(req)
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.7))
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }

            Divider()
                .background(Color.white.opacity(0.2))

            // Stats row
            HStack(spacing: 24) {
                // Earned count
                VStack(spacing: 2) {
                    Text("\(earnedCount)")
                        .font(.headline)
                        .foregroundColor(.white)
                    Text("人已获得")
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.6))
                }

                // Rarity
                VStack(spacing: 2) {
                    Text(rarity)
                        .font(.headline)
                        .foregroundColor(rarityColor)
                    Text("稀有度")
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.6))
                }

                // Earned date
                if let date = earnedDate {
                    VStack(spacing: 2) {
                        Text(date, style: .date)
                            .font(.headline)
                            .foregroundColor(.white)
                        Text("获得日期")
                            .font(.caption2)
                            .foregroundColor(.white.opacity(0.6))
                    }
                }

                Spacer()
            }

            // Progress section (for in-progress badges)
            if case .inProgress(let b) = badge {
                progressSection(b.progress)
            }

            // Share button (for earned badges)
            if isEarned {
                shareButton
            }

            // Interaction hint
            Text("拖拽旋转 • 双击翻转 • 下滑关闭")
                .font(.caption2)
                .foregroundColor(.white.opacity(0.4))
                .padding(.top, 8)
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 24)
                .fill(.ultraThinMaterial)
                .environment(\.colorScheme, .dark)
        )
        .padding(.horizontal)
        .padding(.bottom, 20)
    }

    // MARK: - Progress Section
    private func progressSection(_ progress: BadgeProgress) -> some View {
        VStack(spacing: 8) {
            HStack {
                Text("解锁进度")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.8))
                Spacer()
                Text("\(progress.current)/\(progress.target)")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.orange)
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Color.white.opacity(0.2))

                    RoundedRectangle(cornerRadius: 6)
                        .fill(
                            LinearGradient(
                                colors: [.orange, .yellow],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: geo.size.width * (progress.percentage / 100))
                }
            }
            .frame(height: 10)

            Text(progress.remaining)
                .font(.caption)
                .foregroundColor(.white.opacity(0.6))
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding()
        .background(Color.white.opacity(0.1))
        .cornerRadius(12)
    }

    // MARK: - Share Button
    private var shareButton: some View {
        Button {
            // Share action
        } label: {
            HStack {
                Image(systemName: "square.and.arrow.up")
                Text("分享成就")
            }
            .font(.headline)
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(
                LinearGradient(
                    colors: [categoryColor, categoryColor.opacity(0.8)],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .cornerRadius(12)
        }
    }

    // MARK: - Dismiss Gesture
    private var dismissDragGesture: some Gesture {
        DragGesture()
            .onChanged { value in
                if value.translation.height > 0 {
                    dragOffset = value.translation
                    isDragging = true
                }
            }
            .onEnded { value in
                isDragging = false
                if value.translation.height > 100 || value.predictedEndTranslation.height > 200 {
                    dismissWithAnimation()
                } else {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                        dragOffset = .zero
                    }
                }
            }
    }

    private func dismissWithAnimation() {
        withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
            isAppeared = false
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                onDismiss()
            }
        }
    }

    // MARK: - Helper Properties
    private var isEarned: Bool {
        if case .earned = badge { return true }
        return false
    }

    private var name: String {
        switch badge {
        case .earned(let b): return b.name
        case .inProgress(let b): return b.badge.name
        }
    }

    private var level: Int {
        switch badge {
        case .earned(let b): return b.level
        case .inProgress(let b): return b.badge.level
        }
    }

    private var category: BadgeCategory {
        switch badge {
        case .earned(let b): return b.badgeCategory
        case .inProgress(let b): return b.badge.badgeCategory
        }
    }

    private var iconName: String {
        category.icon
    }

    private var badgeDescription: String? {
        switch badge {
        case .earned(let b): return b.description
        case .inProgress(let b): return b.badge.description
        }
    }

    private var requirement: String? {
        switch badge {
        case .earned(let b): return b.requirement
        case .inProgress(let b): return b.badge.requirement
        }
    }

    private var earnedDate: Date? {
        if case .earned(let b) = badge {
            return b.earnedDate
        }
        return nil
    }

    private var earnedCount: Int {
        switch badge {
        case .earned(let b): return b.earnedCount
        case .inProgress(let b): return b.badge.earnedCount
        }
    }

    private var categoryColor: Color {
        category.color
    }

    private var rarity: String {
        if earnedCount < 100 { return "传说" }
        if earnedCount < 500 { return "史诗" }
        if earnedCount < 2000 { return "稀有" }
        if earnedCount < 10000 { return "罕见" }
        return "普通"
    }

    private var rarityColor: Color {
        if earnedCount < 100 { return .orange }
        if earnedCount < 500 { return .purple }
        if earnedCount < 2000 { return .blue }
        if earnedCount < 10000 { return .green }
        return .gray
    }
}

// MARK: - Badge Card with Matched Geometry
struct BadgeCardWithTransition: View {
    let badge: BadgeItem
    let namespace: Namespace.ID
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button {
            let impactFeedback = UIImpactFeedbackGenerator(style: .light)
            impactFeedback.impactOccurred()
            onTap()
        } label: {
            VStack(spacing: 8) {
                // 3D Badge with matched geometry
                if !isSelected {
                    Badge3DView(
                        iconName: iconName,
                        color: backgroundColor,
                        isEarned: isEarned,
                        level: level,
                        size: 60,
                        showProgress: !isEarned,
                        progress: progressPercentage
                    )
                    .matchedGeometryEffect(id: "badge_\(badge.id)", in: namespace)
                } else {
                    // Placeholder when selected
                    Color.clear
                        .frame(width: 72, height: 72)
                }

                // Badge name
                Text(name)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)

                // Progress hint
                if case .inProgress(let b) = badge {
                    progressHint(b.progress)
                } else if case .earned(let b) = badge {
                    if let date = b.earnedDate {
                        Text(date, style: .date)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
        .buttonStyle(.plain)
        .opacity(isEarned ? 1 : 0.85)
    }

    // Progress hint with specific numbers
    private func progressHint(_ progress: BadgeProgress) -> some View {
        VStack(spacing: 2) {
            Text("\(progress.current)/\(progress.target)")
                .font(.caption2)
                .fontWeight(.medium)
                .foregroundColor(.orange)

            Text(progress.remaining)
                .font(.system(size: 9))
                .foregroundColor(.secondary)
        }
    }

    private var isEarned: Bool {
        if case .earned = badge { return true }
        return false
    }

    private var name: String {
        switch badge {
        case .earned(let b): return b.name
        case .inProgress(let b): return b.badge.name
        }
    }

    private var level: Int {
        switch badge {
        case .earned(let b): return b.level
        case .inProgress(let b): return b.badge.level
        }
    }

    private var iconName: String {
        let category: BadgeCategory
        switch badge {
        case .earned(let b): category = b.badgeCategory
        case .inProgress(let b): category = b.badge.badgeCategory
        }
        return category.icon
    }

    private var backgroundColor: Color {
        let category: BadgeCategory
        switch badge {
        case .earned(let b): category = b.badgeCategory
        case .inProgress(let b): category = b.badge.badgeCategory
        }
        return category.color
    }

    private var progressPercentage: Double {
        if case .inProgress(let b) = badge {
            return b.progress.percentage
        }
        return 0
    }
}

// MARK: - Preview
#Preview("Badge Transition") {
    BadgeTransitionPreview()
}

struct BadgeTransitionPreview: View {
    @Namespace private var namespace
    @State private var selectedBadge: BadgeItem?

    private let sampleBadges: [BadgeItem] = [
        .earned(EarnedBadge(
            id: 1,
            category: "reading_streak",
            level: 3,
            name: "阅读达人",
            description: "连续阅读30天，展现了超强的阅读毅力",
            requirement: "连续阅读30天",
            iconUrl: nil,
            backgroundColor: nil,
            earnedAt: ISO8601DateFormatter().string(from: Date()),
            earnedCount: 1234
        )),
        .earned(EarnedBadge(
            id: 2,
            category: "books_finished",
            level: 2,
            name: "书虫",
            description: "完成阅读10本书籍",
            requirement: "阅读10本书",
            iconUrl: nil,
            backgroundColor: nil,
            earnedAt: ISO8601DateFormatter().string(from: Date().addingTimeInterval(-86400 * 7)),
            earnedCount: 5678
        ))
    ]

    var body: some View {
        ZStack {
            // Badge list
            ScrollView {
                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: 16) {
                    ForEach(sampleBadges) { badge in
                        BadgeCardWithTransition(
                            badge: badge,
                            namespace: namespace,
                            isSelected: selectedBadge?.id == badge.id
                        ) {
                            selectedBadge = badge
                        }
                    }
                }
                .padding()
            }

            // Detail overlay
            if let badge = selectedBadge {
                BadgeDetailOverlay(
                    badge: badge,
                    namespace: namespace
                ) {
                    selectedBadge = nil
                }
                .zIndex(1)
            }
        }
    }
}
