import SwiftUI

/// Manages and displays friend thought bubbles in the reader margin
/// Shows avatars at reading locations where friends have left thoughts/notes
struct FriendThoughtsOverlay: View {
    let thoughts: [FriendThought]
    let currentProgression: Double
    let viewHeight: CGFloat

    @StateObject private var displaySettings = ReaderDisplaySettingsStore.shared
    @State private var selectedThought: FriendThought?
    @State private var expandedGroup: [FriendThought]?

    var onUserTap: ((Int) -> Void)?
    var onNavigateToThought: ((FriendThought) -> Void)?

    var body: some View {
        GeometryReader { geometry in
            if displaySettings.showFriendThoughts {
                ZStack(alignment: .trailing) {
                    // Thought bubbles in the margin
                    marginBubbles(in: geometry)

                    // Expanded thought view (popup)
                    if let thought = selectedThought {
                        expandedThoughtOverlay(thought: thought)
                    }

                    // Grouped thoughts list
                    if let group = expandedGroup, group.count > 1 {
                        groupedThoughtsSheet(thoughts: group)
                    }
                }
            }
        }
    }

    // MARK: - Margin Bubbles

    private func marginBubbles(in geometry: GeometryProxy) -> some View {
        let grouped = ThoughtBubblePosition.groupNearbyThoughts(
            thoughts,
            viewHeight: geometry.size.height
        )

        return ForEach(Array(grouped.enumerated()), id: \.offset) { _, group in
            let position = ThoughtBubblePosition.calculatePosition(
                for: group[0],
                viewHeight: geometry.size.height
            )

            Group {
                if group.count == 1 {
                    singleBubble(thought: group[0])
                } else {
                    stackedBubbles(thoughts: group)
                }
            }
            .position(x: geometry.size.width - 20, y: position.yPosition)
            .transition(.asymmetric(
                insertion: .scale.combined(with: .opacity),
                removal: .opacity
            ))
        }
    }

    private func singleBubble(thought: FriendThought) -> some View {
        FriendThoughtBubble(thought: thought, size: .small) {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                selectedThought = thought
            }
        }
        .contextMenu {
            Button {
                onNavigateToThought?(thought)
            } label: {
                Label(L10n.FriendThoughts.goToLocation, systemImage: "arrow.right.circle")
            }

            Button {
                onUserTap?(thought.userId)
            } label: {
                Label(L10n.FriendThoughts.viewProfile, systemImage: "person.circle")
            }

            Divider()

            Button(role: .destructive) {
                hideThought(thought)
            } label: {
                Label(L10n.FriendThoughts.hide, systemImage: "eye.slash")
            }
        }
    }

    private func stackedBubbles(thoughts: [FriendThought]) -> some View {
        StackedThoughtBubbles(thoughts: thoughts, maxVisible: 3) {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                expandedGroup = thoughts
            }
        }
    }

    // MARK: - Expanded Thought Overlay

    private func expandedThoughtOverlay(thought: FriendThought) -> some View {
        Color.black.opacity(0.3)
            .ignoresSafeArea()
            .onTapGesture {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                    selectedThought = nil
                }
            }
            .overlay(
                FriendThoughtExpandedView(
                    thought: thought,
                    onDismiss: {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                            selectedThought = nil
                        }
                    },
                    onUserTap: { userId in
                        selectedThought = nil
                        onUserTap?(userId)
                    }
                )
                .frame(maxWidth: 320)
                .padding()
                .transition(.scale.combined(with: .opacity))
            )
    }

    // MARK: - Grouped Thoughts Sheet

    private func groupedThoughtsSheet(thoughts: [FriendThought]) -> some View {
        Color.black.opacity(0.3)
            .ignoresSafeArea()
            .onTapGesture {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                    expandedGroup = nil
                }
            }
            .overlay(
                VStack(spacing: 0) {
                    // Header
                    HStack {
                        Text(L10n.FriendThoughts.thoughtsAtLocation(thoughts.count))
                            .font(.headline)

                        Spacer()

                        Button {
                            withAnimation {
                                expandedGroup = nil
                            }
                        } label: {
                            Image(systemName: "xmark")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .frame(width: 28, height: 28)
                                .background(Color(.systemGray6))
                                .clipShape(Circle())
                        }
                    }
                    .padding()

                    Divider()

                    // Thoughts list
                    ScrollView {
                        LazyVStack(spacing: 0) {
                            ForEach(thoughts) { thought in
                                FriendThoughtListItem(thought: thought) {
                                    withAnimation {
                                        expandedGroup = nil
                                        selectedThought = thought
                                    }
                                }
                                .padding(.horizontal)

                                if thought.id != thoughts.last?.id {
                                    Divider()
                                        .padding(.leading, 56)
                                }
                            }
                        }
                    }
                    .frame(maxHeight: 400)
                }
                .background(Color(.systemBackground))
                .cornerRadius(16)
                .shadow(color: .black.opacity(0.2), radius: 16, x: 0, y: 8)
                .frame(maxWidth: 340)
                .padding()
                .transition(.move(edge: .bottom).combined(with: .opacity))
            )
    }

    // MARK: - Actions

    private func hideThought(_ thought: FriendThought) {
        // API call to hide this thought from view
        // This would update the local filter
    }
}

// MARK: - Thoughts Sidebar View

/// Alternative sidebar view showing all friend thoughts for current chapter
struct FriendThoughtsSidebar: View {
    let thoughts: [FriendThought]
    let currentChapterIndex: Int?
    @Binding var isPresented: Bool

    var onThoughtTap: ((FriendThought) -> Void)?
    var onUserTap: ((Int) -> Void)?

    private var filteredThoughts: [FriendThought] {
        guard let chapterIndex = currentChapterIndex else { return thoughts }
        return thoughts.filter { $0.chapterIndex == chapterIndex }
    }

    var body: some View {
        NavigationStack {
            Group {
                if filteredThoughts.isEmpty {
                    emptyState
                } else {
                    thoughtsList
                }
            }
            .navigationTitle(L10n.FriendThoughts.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(L10n.Common.done) {
                        isPresented = false
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "bubble.left.and.bubble.right")
                .font(.system(size: 48))
                .foregroundColor(.secondary)

            Text(L10n.FriendThoughts.noThoughts)
                .font(.headline)
                .foregroundColor(.secondary)

            Text(L10n.FriendThoughts.noThoughtsDesc)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var thoughtsList: some View {
        List {
            ForEach(filteredThoughts) { thought in
                FriendThoughtListItem(thought: thought) {
                    onThoughtTap?(thought)
                    isPresented = false
                }
            }
        }
        .listStyle(.plain)
    }
}

// MARK: - Mini Indicator

/// Small indicator showing number of friend thoughts on current page/chapter
struct FriendThoughtsIndicator: View {
    let count: Int
    var onTap: (() -> Void)?

    var body: some View {
        if count > 0 {
            Button {
                onTap?()
            } label: {
                HStack(spacing: 4) {
                    Image(systemName: "person.2.wave.2")
                        .font(.caption)

                    Text("\(count)")
                        .font(.caption)
                        .fontWeight(.medium)
                }
                .foregroundColor(.cyan)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.cyan.opacity(0.15))
                .cornerRadius(12)
            }
        }
    }
}

// MARK: - ViewModel for Friend Thoughts

@MainActor
class FriendThoughtsViewModel: ObservableObject {
    @Published var thoughts: [FriendThought] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let apiClient = APIClient.shared

    func loadThoughts(bookType: String, bookId: Int) async {
        isLoading = true
        errorMessage = nil

        // Simulated API call - replace with actual endpoint
        do {
            // let response = try await apiClient.getFriendThoughts(bookType: bookType, bookId: bookId)
            // thoughts = response.data

            // Simulated data for development
            thoughts = generateSampleThoughts()
            isLoading = false
        } catch {
            errorMessage = error.localizedDescription
            isLoading = false
        }
    }

    func loadThoughtsForChapter(bookType: String, bookId: Int, chapterIndex: Int) async {
        // Load thoughts for specific chapter
        await loadThoughts(bookType: bookType, bookId: bookId)
        thoughts = thoughts.filter { $0.chapterIndex == chapterIndex }
    }

    // Sample data for development
    private func generateSampleThoughts() -> [FriendThought] {
        let names = ["Alice", "Bob", "Charlie", "Diana"]
        let contents = [
            "This passage is so beautifully written!",
            "I had the same thought when I read this.",
            "The metaphor here is incredible.",
            "Love this part of the book."
        ]

        var result: [FriendThought] = []
        for i in 0..<4 {
            let thought = FriendThought(
                id: i + 1,
                userId: i + 1,
                userName: names[i],
                userAvatar: nil,
                content: contents[i],
                highlightedText: "Sample highlighted text from the book",
                chapterIndex: (i / 2) + 1,
                chapterTitle: "Chapter \((i / 2) + 1)",
                cfiRange: nil,
                progression: Double(i + 1) * 0.2,
                createdAt: Date().addingTimeInterval(Double(-i * 3600)),
                likeCount: (i * 2) + 3,
                isLiked: i % 2 == 0
            )
            result.append(thought)
        }
        return result
    }
}

#Preview {
    let thoughts = (1...5).map { i in
        FriendThought(
            id: i,
            userId: i,
            userName: ["Alice", "Bob", "Charlie", "Diana", "Eve"][i - 1],
            userAvatar: nil,
            content: "This is thought \(i) about the book content.",
            highlightedText: "Some highlighted text here",
            chapterIndex: 1,
            chapterTitle: "Chapter 1",
            cfiRange: nil,
            progression: Double(i) * 0.15,
            createdAt: Date().addingTimeInterval(Double(-i * 3600)),
            likeCount: i * 2,
            isLiked: i % 2 == 0
        )
    }

    return FriendThoughtsOverlay(
        thoughts: thoughts,
        currentProgression: 0.5,
        viewHeight: 800
    )
    .background(Color(.systemGray6))
}
