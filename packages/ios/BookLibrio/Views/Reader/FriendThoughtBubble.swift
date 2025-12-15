import SwiftUI

/// Model representing a friend's thought/note at a specific location
struct FriendThought: Identifiable, Codable {
    let id: Int
    let userId: Int
    let userName: String
    let userAvatar: String?
    let content: String
    let highlightedText: String?
    let chapterIndex: Int?
    let chapterTitle: String?
    let cfiRange: String?
    let progression: Double
    let createdAt: Date
    let likeCount: Int
    let isLiked: Bool

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case userName = "user_name"
        case userAvatar = "user_avatar"
        case content
        case highlightedText = "highlighted_text"
        case chapterIndex = "chapter_index"
        case chapterTitle = "chapter_title"
        case cfiRange = "cfi_range"
        case progression
        case createdAt = "created_at"
        case likeCount = "like_count"
        case isLiked = "is_liked"
    }
}

/// A small avatar bubble showing a friend's presence at a reading location
/// Tapping expands to show their thought/note
struct FriendThoughtBubble: View {
    let thought: FriendThought
    let size: BubbleSize
    var onTap: (() -> Void)?

    enum BubbleSize {
        case small  // 24pt - for margin display
        case medium // 32pt - for list display
        case large  // 44pt - for expanded view

        var diameter: CGFloat {
            switch self {
            case .small: return 24
            case .medium: return 32
            case .large: return 44
            }
        }

        var fontSize: CGFloat {
            switch self {
            case .small: return 10
            case .medium: return 12
            case .large: return 16
            }
        }
    }

    var body: some View {
        Button {
            onTap?()
        } label: {
            ZStack {
                // Avatar circle
                if let avatarUrl = thought.userAvatar, !avatarUrl.isEmpty {
                    AsyncImage(url: URL(string: avatarUrl)) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        case .failure, .empty:
                            avatarPlaceholder
                        @unknown default:
                            avatarPlaceholder
                        }
                    }
                    .frame(width: size.diameter, height: size.diameter)
                    .clipShape(Circle())
                } else {
                    avatarPlaceholder
                }

                // Thought indicator
                if size != .large {
                    Circle()
                        .fill(Color.cyan)
                        .frame(width: 8, height: 8)
                        .offset(x: size.diameter / 2 - 4, y: -size.diameter / 2 + 4)
                }
            }
        }
        .buttonStyle(.plain)
    }

    private var avatarPlaceholder: some View {
        Circle()
            .fill(LinearGradient(
                colors: [.cyan.opacity(0.7), .blue.opacity(0.7)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ))
            .frame(width: size.diameter, height: size.diameter)
            .overlay(
                Text(String(thought.userName.prefix(1)).uppercased())
                    .font(.system(size: size.fontSize, weight: .medium))
                    .foregroundColor(.white)
            )
    }
}

// MARK: - Expanded Thought View

/// Expanded view showing the full thought content
struct FriendThoughtExpandedView: View {
    let thought: FriendThought
    @State private var isLiked: Bool
    @State private var likeCount: Int
    var onDismiss: (() -> Void)?
    var onUserTap: ((Int) -> Void)?

    init(thought: FriendThought, onDismiss: (() -> Void)? = nil, onUserTap: ((Int) -> Void)? = nil) {
        self.thought = thought
        self._isLiked = State(initialValue: thought.isLiked)
        self._likeCount = State(initialValue: thought.likeCount)
        self.onDismiss = onDismiss
        self.onUserTap = onUserTap
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header with avatar and name
            HStack(spacing: 10) {
                FriendThoughtBubble(thought: thought, size: .medium) {
                    onUserTap?(thought.userId)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(thought.userName)
                        .font(.subheadline)
                        .fontWeight(.medium)

                    Text(thought.createdAt, style: .relative)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Button {
                    onDismiss?()
                } label: {
                    Image(systemName: "xmark")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .frame(width: 24, height: 24)
                        .background(Color(.systemGray6))
                        .clipShape(Circle())
                }
            }

            // Highlighted text (if any)
            if let highlightedText = thought.highlightedText, !highlightedText.isEmpty {
                HStack(spacing: 0) {
                    Rectangle()
                        .fill(Color.yellow.opacity(0.6))
                        .frame(width: 3)

                    Text(highlightedText)
                        .font(.subheadline)
                        .italic()
                        .foregroundColor(.secondary)
                        .padding(.leading, 8)
                        .lineLimit(3)
                }
                .padding(.vertical, 4)
            }

            // Thought content
            Text(thought.content)
                .font(.body)
                .foregroundColor(.primary)
                .fixedSize(horizontal: false, vertical: true)

            // Chapter info
            if let chapterTitle = thought.chapterTitle {
                HStack {
                    Image(systemName: "book")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    Text(chapterTitle)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            Divider()

            // Actions
            HStack(spacing: 24) {
                Button {
                    toggleLike()
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: isLiked ? "heart.fill" : "heart")
                            .font(.subheadline)
                            .foregroundColor(isLiked ? .red : .secondary)

                        if likeCount > 0 {
                            Text("\(likeCount)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }

                Button {
                    // Reply action
                } label: {
                    Image(systemName: "arrowshape.turn.up.left")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Button {
                    // Share action
                } label: {
                    Image(systemName: "square.and.arrow.up")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.15), radius: 12, x: 0, y: 4)
    }

    private func toggleLike() {
        withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
            isLiked.toggle()
            likeCount += isLiked ? 1 : -1
        }

        // API call would go here
        Task {
            // try await APIClient.shared.toggleThoughtLike(thought.id)
        }
    }
}

// MARK: - Stacked Bubbles (for multiple thoughts at same location)

/// Shows stacked avatars when multiple friends have thoughts at the same location
struct StackedThoughtBubbles: View {
    let thoughts: [FriendThought]
    let maxVisible: Int
    var onTap: (() -> Void)?

    init(thoughts: [FriendThought], maxVisible: Int = 3, onTap: (() -> Void)? = nil) {
        self.thoughts = thoughts
        self.maxVisible = maxVisible
        self.onTap = onTap
    }

    var body: some View {
        Button {
            onTap?()
        } label: {
            ZStack {
                ForEach(Array(thoughts.prefix(maxVisible).enumerated()), id: \.element.id) { index, thought in
                    FriendThoughtBubble(thought: thought, size: .small, onTap: nil)
                        .offset(x: CGFloat(index) * 14)
                        .zIndex(Double(maxVisible - index))
                }

                // Count badge if more than maxVisible
                if thoughts.count > maxVisible {
                    Text("+\(thoughts.count - maxVisible)")
                        .font(.system(size: 8, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 4)
                        .padding(.vertical, 2)
                        .background(Color.blue)
                        .clipShape(Capsule())
                        .offset(x: CGFloat(maxVisible) * 14 + 8)
                }
            }
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Thought List Item

/// List row showing a friend's thought with preview
struct FriendThoughtListItem: View {
    let thought: FriendThought
    var onTap: (() -> Void)?

    var body: some View {
        Button {
            onTap?()
        } label: {
            HStack(alignment: .top, spacing: 12) {
                FriendThoughtBubble(thought: thought, size: .medium, onTap: nil)

                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(thought.userName)
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(.primary)

                        Spacer()

                        Text(thought.createdAt, style: .relative)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    if let highlightedText = thought.highlightedText, !highlightedText.isEmpty {
                        Text("\"\(highlightedText)\"")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }

                    Text(thought.content)
                        .font(.subheadline)
                        .foregroundColor(.primary)
                        .lineLimit(2)

                    HStack(spacing: 16) {
                        if let chapterTitle = thought.chapterTitle {
                            Label(chapterTitle, systemImage: "book")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                        }

                        if thought.likeCount > 0 {
                            Label("\(thought.likeCount)", systemImage: "heart.fill")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }
            .padding(.vertical, 8)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Margin Bubble Position Helper

/// Calculates position for thought bubbles in the margin
struct ThoughtBubblePosition {
    let thought: FriendThought
    let yPosition: CGFloat

    /// Calculates Y position based on progression and view height
    static func calculatePosition(
        for thought: FriendThought,
        viewHeight: CGFloat,
        topPadding: CGFloat = 60,
        bottomPadding: CGFloat = 60
    ) -> ThoughtBubblePosition {
        let usableHeight = viewHeight - topPadding - bottomPadding
        let yPosition = topPadding + (usableHeight * thought.progression)
        return ThoughtBubblePosition(thought: thought, yPosition: yPosition)
    }

    /// Groups thoughts that are close together to prevent overlap
    static func groupNearbyThoughts(
        _ thoughts: [FriendThought],
        viewHeight: CGFloat,
        minimumSpacing: CGFloat = 30
    ) -> [[FriendThought]] {
        guard !thoughts.isEmpty else { return [] }

        let positions = thoughts.map { calculatePosition(for: $0, viewHeight: viewHeight) }
        let sorted = positions.sorted { $0.yPosition < $1.yPosition }

        var groups: [[FriendThought]] = []
        var currentGroup: [FriendThought] = [sorted[0].thought]
        var lastY = sorted[0].yPosition

        for position in sorted.dropFirst() {
            if position.yPosition - lastY < minimumSpacing {
                currentGroup.append(position.thought)
            } else {
                groups.append(currentGroup)
                currentGroup = [position.thought]
            }
            lastY = position.yPosition
        }

        if !currentGroup.isEmpty {
            groups.append(currentGroup)
        }

        return groups
    }
}

#Preview("Single Bubble") {
    let thought = FriendThought(
        id: 1,
        userId: 1,
        userName: "Alice",
        userAvatar: nil,
        content: "This passage really resonated with me. The author's perspective on life is so unique!",
        highlightedText: "The universe is not only queerer than we suppose, but queerer than we can suppose.",
        chapterIndex: 3,
        chapterTitle: "Chapter 3: The Universe",
        cfiRange: nil,
        progression: 0.35,
        createdAt: Date().addingTimeInterval(-3600),
        likeCount: 5,
        isLiked: false
    )

    VStack(spacing: 40) {
        FriendThoughtBubble(thought: thought, size: .small)
        FriendThoughtBubble(thought: thought, size: .medium)
        FriendThoughtBubble(thought: thought, size: .large)

        FriendThoughtExpandedView(thought: thought)
            .padding()
    }
}

#Preview("Stacked Bubbles") {
    let thoughts = (1...5).map { i in
        FriendThought(
            id: i,
            userId: i,
            userName: ["Alice", "Bob", "Charlie", "Diana", "Eve"][i - 1],
            userAvatar: nil,
            content: "Thought \(i)",
            highlightedText: nil,
            chapterIndex: 1,
            chapterTitle: "Chapter 1",
            cfiRange: nil,
            progression: 0.3,
            createdAt: Date(),
            likeCount: i,
            isLiked: false
        )
    }

    StackedThoughtBubbles(thoughts: thoughts)
        .padding()
}
