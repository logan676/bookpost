/**
 * BadgeMetallicCard - 3D Metallic Card Component
 * Creates realistic metallic card effects based on badge tier (Gold/Silver/Bronze/Iron)
 */

import SwiftUI

// MARK: - Badge Metallic Card
struct BadgeMetallicCard<Content: View>: View {
    let tier: BadgeTier
    let content: Content

    init(tier: BadgeTier, @ViewBuilder content: () -> Content) {
        self.tier = tier
        self.content = content()
    }

    var body: some View {
        ZStack {
            // Card background with metallic gradient
            cardBackground

            // Content
            content
        }
    }

    private var cardBackground: some View {
        RoundedRectangle(cornerRadius: 16)
            .fill(
                LinearGradient(
                    colors: tier.gradientColors,
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .overlay(
                // Inner highlight for 3D effect
                RoundedRectangle(cornerRadius: 16)
                    .stroke(
                        LinearGradient(
                            colors: [
                                .white.opacity(0.6),
                                .white.opacity(0.2),
                                .clear,
                                .black.opacity(0.1)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 2
                    )
            )
            .overlay(
                // Top shine effect
                RoundedRectangle(cornerRadius: 16)
                    .fill(
                        LinearGradient(
                            colors: [
                                .white.opacity(0.3),
                                .clear
                            ],
                            startPoint: .top,
                            endPoint: .center
                        )
                    )
                    .mask(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(
                                LinearGradient(
                                    colors: [.white, .clear],
                                    startPoint: .top,
                                    endPoint: .bottom
                                )
                            )
                    )
            )
            .shadow(
                color: tier.borderColor.opacity(0.4),
                radius: 8,
                x: 0,
                y: 4
            )
    }
}

// MARK: - Badge Card View (Grid item)
struct BadgeGridCard: View {
    let badge: BadgeItem
    let namespace: Namespace.ID
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            BadgeMetallicCard(tier: badgeTier) {
                VStack(spacing: 8) {
                    // Badge icon floating above card
                    Badge3DView(
                        iconName: iconName,
                        color: categoryColor,
                        isEarned: isEarned,
                        level: level,
                        size: 50,
                        showProgress: !isEarned,
                        progress: progressPercentage
                    )
                    .offset(y: -10)

                    // Badge name
                    Text(name)
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                        .shadow(color: .black.opacity(0.3), radius: 1, x: 0, y: 1)

                    // Progress or date
                    if case .inProgress(let b) = badge {
                        Text("\(b.progress.current)/\(b.progress.target)")
                            .font(.caption2)
                            .fontWeight(.medium)
                            .foregroundColor(.white.opacity(0.9))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(
                                Capsule()
                                    .fill(Color.black.opacity(0.3))
                            )
                    } else if case .earned(let b) = badge {
                        if let xp = b.xpValue {
                            Text("\(xp) XP")
                                .font(.caption2)
                                .fontWeight(.medium)
                                .foregroundColor(.white.opacity(0.9))
                        }
                    }
                }
                .padding(.vertical, 16)
                .padding(.horizontal, 8)
            }
        }
        .buttonStyle(.plain)
        .matchedGeometryEffect(id: badge.id, in: namespace, isSource: !isSelected)
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

    private var iconName: String {
        let category: BadgeCategory
        switch badge {
        case .earned(let b): category = b.badgeCategory
        case .inProgress(let b): category = b.badge.badgeCategory
        }
        return category.icon
    }

    private var categoryColor: Color {
        let category: BadgeCategory
        switch badge {
        case .earned(let b): category = b.badgeCategory
        case .inProgress(let b): category = b.badge.badgeCategory
        }
        return category.color
    }

    private var badgeTier: BadgeTier {
        switch badge {
        case .earned(let b): return b.badgeTier
        case .inProgress(let b): return b.badge.badgeTier
        }
    }

    private var progressPercentage: Double {
        if case .inProgress(let b) = badge {
            return b.progress.percentage
        }
        return 0
    }
}

// MARK: - Rarity Section Header
struct RaritySectionHeader: View {
    let rarity: BadgeRarity
    let count: Int
    let total: Int

    var body: some View {
        HStack(spacing: 8) {
            // Star icon
            Text(rarity.icon)
                .font(.headline)
                .foregroundColor(rarity.color)

            // Rarity name with tier
            Text("\(rarity.displayName)")
                .font(.headline)
                .fontWeight(.bold)
                .foregroundColor(.primary)

            Text("(\(rarity.tier.displayName))")
                .font(.subheadline)
                .foregroundColor(rarity.color)

            Spacer()

            // Count badge
            Text("\(count)/\(total)")
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(.secondary)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(
                    Capsule()
                        .fill(Color(.systemGray6))
                )
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Badge Info Tag
struct BadgeInfoTag: View {
    let title: String
    let value: String
    let color: Color

    init(title: String, value: String, color: Color = .primary) {
        self.title = title
        self.value = value
        self.color = color
    }

    var body: some View {
        VStack(spacing: 4) {
            Text(title)
                .font(.caption2)
                .foregroundColor(.secondary)

            Text(value)
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundColor(color)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }
}

// MARK: - Requirement Row
struct RequirementRow: View {
    let requirement: BadgeRequirement
    let index: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top, spacing: 12) {
                // Status icon
                Image(systemName: requirement.isCompleted ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 20))
                    .foregroundColor(requirement.isCompleted ? .green : .gray)

                VStack(alignment: .leading, spacing: 4) {
                    // Description
                    Text(requirement.description)
                        .font(.subheadline)
                        .foregroundColor(.primary)
                        .strikethrough(requirement.isCompleted, color: .secondary)

                    // Progress bar (only for incomplete requirements)
                    if !requirement.isCompleted {
                        ProgressView(value: Double(requirement.current), total: Double(requirement.target))
                            .tint(.orange)
                            .scaleEffect(y: 1.5)
                    }
                }

                Spacer()

                // Progress/Done label
                if requirement.isCompleted {
                    Text("Done")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.green)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(
                            Capsule()
                                .fill(Color.green.opacity(0.15))
                        )
                } else {
                    Text("\(requirement.current)/\(requirement.target)")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.orange)
                }
            }
        }
        .padding(.vertical, 8)
    }
}

// MARK: - LORE Section
struct LoreSection: View {
    let lore: String

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack(spacing: 8) {
                Image(systemName: "book.closed.fill")
                    .foregroundColor(.purple)
                Text("LORE")
                    .font(.headline)
                    .fontWeight(.bold)
            }

            // Lore text with quote styling
            Text("\"\(lore)\"")
                .font(.subheadline)
                .italic()
                .foregroundColor(.secondary)
                .multilineTextAlignment(.leading)
                .lineSpacing(4)
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color(.systemGray6))
                )
                .overlay(
                    // Decorative quote mark
                    Text("\u{201C}")
                        .font(.system(size: 40, weight: .bold))
                        .foregroundColor(.purple.opacity(0.2))
                        .offset(x: -5, y: -10),
                    alignment: .topLeading
                )
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(12)
    }
}

// MARK: - Earned Badge Label
struct EarnedBadgeLabel: View {
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "checkmark.circle.fill")
                .font(.caption)
            Text("EARNED")
                .font(.caption)
                .fontWeight(.bold)
        }
        .foregroundColor(.green)
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(
            Capsule()
                .fill(Color.green.opacity(0.15))
        )
    }
}

// MARK: - Preview
#Preview("Metallic Cards") {
    ScrollView {
        VStack(spacing: 20) {
            Text("Metallic Card Showcase")
                .font(.title.bold())

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 16) {
                ForEach(BadgeTier.allCases, id: \.self) { tier in
                    BadgeMetallicCard(tier: tier) {
                        VStack(spacing: 8) {
                            Badge3DView(
                                iconName: "star.fill",
                                color: .yellow,
                                isEarned: true,
                                level: 3,
                                size: 50
                            )
                            .offset(y: -10)

                            Text(tier.displayName)
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundColor(.white)
                        }
                        .padding(.vertical, 16)
                    }
                }
            }
            .padding()

            // Info Tags
            Text("Info Tags")
                .font(.headline)

            HStack(spacing: 12) {
                BadgeInfoTag(title: "Start Date", value: "Oct 24")
                BadgeInfoTag(title: "Category", value: "Legendary", color: .orange)
                BadgeInfoTag(title: "Tier", value: "Gold", color: Color(red: 0.85, green: 0.65, blue: 0.13))
            }
            .padding(.horizontal)

            // Requirements
            Text("Requirements")
                .font(.headline)

            VStack(spacing: 0) {
                RequirementRow(
                    requirement: BadgeRequirement(id: 1, description: "Read 3 History Genre Books", current: 3, target: 3),
                    index: 0
                )
                Divider()
                RequirementRow(
                    requirement: BadgeRequirement(id: 2, description: "Highlight 50 Passages", current: 10, target: 50),
                    index: 1
                )
            }
            .padding()
            .background(Color(.secondarySystemGroupedBackground))
            .cornerRadius(12)
            .padding(.horizontal)

            // Lore
            LoreSection(lore: "Knowledge of the past is the key to the future. By uncovering the secrets of old, you carry the torch of civilization forward.")
                .padding(.horizontal)

            // Earned Label
            EarnedBadgeLabel()
        }
        .padding()
    }
    .background(Color(.systemGroupedBackground))
}
