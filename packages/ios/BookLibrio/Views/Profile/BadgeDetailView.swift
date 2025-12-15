import SwiftUI

/// Badge detail modal showing achievement info, progress, and sharing options
/// Works with both EarnedBadge (unlocked) and BadgeWithProgress (in-progress)
struct BadgeDetailView: View {
    let content: BadgeDetailContent
    let onShare: () -> Void
    @Environment(\.dismiss) var dismiss

    var body: some View {
        VStack(spacing: 24) {
            // Badge icon with animated glow
            badgeIcon

            // Badge info
            badgeInfo

            // Progress section (if not unlocked)
            if case .inProgress(let item) = content {
                progressSection(item.progress)
            }

            // Unlock date (if unlocked)
            if case .earned(let badge) = content, let date = badge.earnedDate {
                unlockDateSection(date: date)
            }

            // Action buttons
            actionButtons
        }
        .padding(24)
        .background(
            RoundedRectangle(cornerRadius: 24)
                .fill(.ultraThinMaterial)
        )
        .padding(.horizontal, 32)
    }

    // MARK: - Badge Icon

    private var badgeIcon: some View {
        ZStack {
            // Glow effect for unlocked badges
            if content.isUnlocked {
                Circle()
                    .fill(content.color.opacity(0.3))
                    .frame(width: 140, height: 140)
                    .blur(radius: 20)
            }

            // Badge circle
            Circle()
                .fill(
                    content.isUnlocked
                        ? LinearGradient(
                            colors: [content.color, content.color.opacity(0.7)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                        : LinearGradient(
                            colors: [Color.gray.opacity(0.3), Color.gray.opacity(0.2)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                )
                .frame(width: 100, height: 100)
                .overlay(
                    Image(systemName: content.iconName)
                        .font(.system(size: 40))
                        .foregroundColor(content.isUnlocked ? .white : .gray)
                )
                .shadow(color: content.isUnlocked ? content.color.opacity(0.5) : .clear, radius: 10)

            // Level indicator
            if content.isUnlocked {
                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        Text("Lv.\(content.level)")
                            .font(.caption2)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(content.levelColor)
                            .cornerRadius(8)
                    }
                }
                .frame(width: 100, height: 100)
            }
        }
    }

    // MARK: - Badge Info

    private var badgeInfo: some View {
        VStack(spacing: 8) {
            Text(content.name)
                .font(.title2)
                .fontWeight(.bold)

            if let description = content.description {
                Text(description)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .lineLimit(3)
            }

            // Stats
            if content.isUnlocked {
                HStack(spacing: 24) {
                    statItem(value: "\(content.earnedCount)", label: "人获得")
                }
                .padding(.top, 8)
            }
        }
    }

    private func statItem(value: String, label: String) -> some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.headline)
                .fontWeight(.semibold)

            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }

    // MARK: - Progress Section

    private func progressSection(_ progress: BadgeProgress) -> some View {
        VStack(spacing: 12) {
            HStack {
                Text("解锁进度")
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                Spacer()

                Text("\(progress.current)/\(progress.target)")
                    .font(.subheadline)
                    .fontWeight(.medium)
            }

            // Progress bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color(.systemGray5))
                        .frame(height: 8)

                    RoundedRectangle(cornerRadius: 4)
                        .fill(content.color)
                        .frame(width: geometry.size.width * CGFloat(progress.percentage / 100), height: 8)
                }
            }
            .frame(height: 8)

            // Remaining text
            Text(progress.remaining)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    // MARK: - Unlock Date Section

    private func unlockDateSection(date: Date) -> some View {
        HStack {
            Image(systemName: "calendar")
                .foregroundColor(.secondary)

            Text("获得于 \(date, style: .date)")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(Color(.systemGray6))
        .cornerRadius(20)
    }

    // MARK: - Action Buttons

    private var actionButtons: some View {
        HStack(spacing: 16) {
            // Close button
            Button {
                dismiss()
            } label: {
                Text("关闭")
                    .font(.headline)
                    .foregroundColor(.primary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color(.systemGray5))
                    .cornerRadius(12)
            }

            // Share button (only for unlocked badges)
            if content.isUnlocked {
                Button {
                    onShare()
                } label: {
                    HStack {
                        Image(systemName: "square.and.arrow.up")
                        Text("分享")
                    }
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(content.color)
                    .cornerRadius(12)
                }
            }
        }
    }
}

// MARK: - Badge Detail Content

enum BadgeDetailContent {
    case earned(EarnedBadge)
    case inProgress(BadgeWithProgress)

    var isUnlocked: Bool {
        if case .earned = self { return true }
        return false
    }

    var name: String {
        switch self {
        case .earned(let badge): return badge.name
        case .inProgress(let item): return item.badge.name
        }
    }

    var description: String? {
        switch self {
        case .earned(let badge): return badge.description
        case .inProgress(let item): return item.badge.description
        }
    }

    var level: Int {
        switch self {
        case .earned(let badge): return badge.level
        case .inProgress(let item): return item.badge.level
        }
    }

    var category: BadgeCategory {
        switch self {
        case .earned(let badge): return badge.badgeCategory
        case .inProgress(let item): return item.badge.badgeCategory
        }
    }

    var iconName: String {
        category.icon
    }

    var earnedCount: Int {
        switch self {
        case .earned(let badge): return badge.earnedCount
        case .inProgress(let item): return item.badge.earnedCount
        }
    }

    var color: Color {
        category.color
    }

    var levelColor: Color {
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

// MARK: - Badge Detail Presentation Modifier

struct BadgeDetailModifier: ViewModifier {
    @Binding var selectedBadge: BadgeDetailContent?
    let onShare: (BadgeDetailContent) -> Void

    func body(content: Content) -> some View {
        content
            .overlay {
                if let badge = selectedBadge {
                    Color.black.opacity(0.4)
                        .ignoresSafeArea()
                        .onTapGesture {
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                selectedBadge = nil
                            }
                        }

                    BadgeDetailView(content: badge) {
                        onShare(badge)
                    }
                    .transition(.scale.combined(with: .opacity))
                }
            }
            .animation(.spring(response: 0.3, dampingFraction: 0.8), value: selectedBadge != nil)
    }
}

extension View {
    func badgeDetail(selectedBadge: Binding<BadgeDetailContent?>, onShare: @escaping (BadgeDetailContent) -> Void) -> some View {
        modifier(BadgeDetailModifier(selectedBadge: selectedBadge, onShare: onShare))
    }
}

// MARK: - Badge Card for Grid

struct BadgeCard: View {
    let content: BadgeDetailContent
    let onTap: () -> Void

    var body: some View {
        Button {
            onTap()
        } label: {
            VStack(spacing: 8) {
                // Badge icon
                Circle()
                    .fill(
                        content.isUnlocked
                            ? LinearGradient(
                                colors: [content.color, content.color.opacity(0.7)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                            : LinearGradient(
                                colors: [Color.gray.opacity(0.3), Color.gray.opacity(0.2)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                    )
                    .frame(width: 60, height: 60)
                    .overlay(
                        Image(systemName: content.iconName)
                            .font(.title2)
                            .foregroundColor(content.isUnlocked ? .white : .gray)
                    )
                    .shadow(color: content.isUnlocked ? content.color.opacity(0.3) : .clear, radius: 4)

                // Name
                Text(content.name)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(content.isUnlocked ? .primary : .secondary)
                    .lineLimit(1)

                // Progress indicator (if not unlocked)
                if case .inProgress(let item) = content {
                    ProgressView(value: item.progress.percentage / 100)
                        .frame(width: 50)
                        .tint(content.color)
                }
            }
            .frame(width: 80)
            .padding(.vertical, 12)
            .padding(.horizontal, 8)
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    ZStack {
        Color.gray.opacity(0.3)
            .ignoresSafeArea()

        BadgeDetailView(
            content: .earned(EarnedBadge(
                id: 1,
                category: "reading_streak",
                level: 3,
                name: "阅读达人",
                description: "连续阅读30天，展现了超强的阅读毅力",
                requirement: "连续阅读30天",
                iconUrl: nil,
                backgroundColor: nil,
                earnedAt: ISO8601DateFormatter().string(from: Date()),
                earnedCount: 12345
            )),
            onShare: {}
        )
    }
}
