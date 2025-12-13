import SwiftUI

/// A single row displaying a timeline milestone achievement
struct TimelineMilestoneRow: View {
    let milestone: TimelineMilestone
    var onTap: (() -> Void)?

    private var formattedDate: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: milestone.date, relativeTo: Date())
    }

    var body: some View {
        Button(action: { onTap?() }) {
            HStack(spacing: 12) {
                // Icon with colored background
                ZStack {
                    Circle()
                        .fill(milestone.type.color.opacity(0.15))
                        .frame(width: 44, height: 44)

                    Image(systemName: milestone.type.icon)
                        .font(.system(size: 18))
                        .foregroundColor(milestone.type.color)
                }

                // Content
                VStack(alignment: .leading, spacing: 4) {
                    Text(milestone.title)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                        .lineLimit(1)

                    HStack(spacing: 6) {
                        Text(milestone.subtitle)
                            .font(.caption)
                            .foregroundColor(.secondary)

                        Text("·")
                            .foregroundColor(.secondary)

                        Text(formattedDate)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()

                // Book cover thumbnail (if applicable)
                if milestone.bookCoverUrl != nil {
                    AsyncImage(url: URL(string: milestone.bookCoverUrl ?? "")) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Rectangle()
                            .fill(Color.gray.opacity(0.2))
                    }
                    .frame(width: 32, height: 44)
                    .cornerRadius(4)
                }
            }
            .padding(.vertical, 8)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Timeline Card Style

/// Card-style milestone row with calendar date display
struct TimelineMilestoneCard: View {
    let milestone: TimelineMilestone
    var onTap: (() -> Void)?

    private var dayNumber: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "d"
        return formatter.string(from: milestone.date)
    }

    private var monthAbbr: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "M月"
        return formatter.string(from: milestone.date)
    }

    var body: some View {
        Button(action: { onTap?() }) {
            HStack(spacing: 16) {
                // Calendar date badge
                VStack(spacing: 2) {
                    Text(monthAbbr)
                        .font(.caption2)
                        .fontWeight(.medium)
                        .foregroundColor(.secondary)

                    Text(dayNumber)
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.primary)
                }
                .frame(width: 48)
                .padding(.vertical, 8)
                .background(Color(.tertiarySystemGroupedBackground))
                .cornerRadius(8)

                // Content
                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 6) {
                        Image(systemName: milestone.type.icon)
                            .font(.caption)
                            .foregroundColor(milestone.type.color)

                        Text(milestone.type.displayName)
                            .font(.caption)
                            .foregroundColor(milestone.type.color)
                    }

                    Text(milestone.title)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                        .lineLimit(2)

                    if !milestone.subtitle.isEmpty {
                        Text(milestone.subtitle)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()

                // Book cover
                if let bookTitle = milestone.bookTitle {
                    VStack {
                        if let coverUrl = milestone.bookCoverUrl {
                            AsyncImage(url: URL(string: coverUrl)) { image in
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            } placeholder: {
                                bookCoverPlaceholder(title: bookTitle)
                            }
                            .frame(width: 40, height: 56)
                            .cornerRadius(4)
                        } else {
                            bookCoverPlaceholder(title: bookTitle)
                                .frame(width: 40, height: 56)
                        }
                    }
                }
            }
            .padding(12)
            .background(Color(.secondarySystemGroupedBackground))
            .cornerRadius(12)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private func bookCoverPlaceholder(title: String) -> some View {
        ZStack {
            Rectangle()
                .fill(
                    LinearGradient(
                        colors: [.blue.opacity(0.3), .purple.opacity(0.3)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .cornerRadius(4)

            Text(String(title.prefix(1)))
                .font(.headline)
                .foregroundColor(.white)
        }
    }
}

// MARK: - Compact Timeline Item

/// Compact horizontal item for inline timeline display
struct CompactMilestoneItem: View {
    let milestone: TimelineMilestone

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(milestone.type.color)
                    .frame(width: 40, height: 40)

                Image(systemName: milestone.type.icon)
                    .font(.system(size: 16))
                    .foregroundColor(.white)
            }

            Text(milestone.title)
                .font(.caption2)
                .foregroundColor(.primary)
                .lineLimit(2)
                .multilineTextAlignment(.center)
                .frame(width: 80)
        }
    }
}

// MARK: - Milestone Type Extension

extension TimelineMilestone.MilestoneType {
    var displayName: String {
        switch self {
        case .finishedBook: return L10n.ProfileTimeline.finishedBook
        case .streakDays: return L10n.ProfileTimeline.streakDays
        case .totalHours: return L10n.ProfileTimeline.totalHours
        case .badge: return L10n.ProfileTimeline.badge
        case .firstBook: return L10n.ProfileTimeline.firstBook
        case .anniversary: return L10n.ProfileTimeline.anniversary
        }
    }
}

#Preview("Row Style") {
    VStack(spacing: 0) {
        TimelineMilestoneRow(
            milestone: TimelineMilestone(
                id: 1,
                type: .finishedBook,
                title: "完成《百年孤独》",
                subtitle: "第156本书",
                date: Date().addingTimeInterval(-86400 * 2),
                bookCoverUrl: nil,
                bookTitle: "百年孤独"
            )
        )
        Divider()
        TimelineMilestoneRow(
            milestone: TimelineMilestone(
                id: 2,
                type: .streakDays,
                title: "连续阅读15天",
                subtitle: "保持阅读习惯",
                date: Date().addingTimeInterval(-86400 * 5),
                bookCoverUrl: nil,
                bookTitle: nil
            )
        )
    }
    .padding()
}

#Preview("Card Style") {
    VStack(spacing: 12) {
        TimelineMilestoneCard(
            milestone: TimelineMilestone(
                id: 1,
                type: .finishedBook,
                title: "完成《百年孤独》",
                subtitle: "第156本书",
                date: Date().addingTimeInterval(-86400 * 2),
                bookCoverUrl: nil,
                bookTitle: "百年孤独"
            )
        )
        TimelineMilestoneCard(
            milestone: TimelineMilestone(
                id: 2,
                type: .totalHours,
                title: "累计阅读500小时",
                subtitle: "里程碑成就",
                date: Date().addingTimeInterval(-86400 * 10),
                bookCoverUrl: nil,
                bookTitle: nil
            )
        )
    }
    .padding()
}
