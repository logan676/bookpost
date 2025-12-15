import SwiftUI

/// Friends tab - Social feed showing friends' reading activities
/// Includes activity feed, trending topics, and option to share thoughts
struct FriendsTabView: View {
    @State private var selectedSegment: FeedSegment = .following
    @State private var showPublishSheet = false

    enum FeedSegment: String, CaseIterable {
        case following = "关注"
        case discover = "发现"
        case trending = "热门"
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Segment picker
                segmentPicker

                // Content based on segment
                TabView(selection: $selectedSegment) {
                    FollowingFeedView()
                        .tag(FeedSegment.following)

                    DiscoverFeedView()
                        .tag(FeedSegment.discover)

                    TrendingTopicsView()
                        .tag(FeedSegment.trending)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
            }
            .navigationTitle("书友")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showPublishSheet = true
                    } label: {
                        Image(systemName: "square.and.pencil")
                    }
                }
            }
            .sheet(isPresented: $showPublishSheet) {
                PublishThoughtSheet()
            }
        }
    }

    private var segmentPicker: some View {
        HStack(spacing: 0) {
            ForEach(FeedSegment.allCases, id: \.self) { segment in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        selectedSegment = segment
                    }
                } label: {
                    VStack(spacing: 8) {
                        Text(segment.rawValue)
                            .font(.subheadline)
                            .fontWeight(selectedSegment == segment ? .semibold : .regular)
                            .foregroundColor(selectedSegment == segment ? .primary : .secondary)

                        Rectangle()
                            .fill(selectedSegment == segment ? Color.blue : Color.clear)
                            .frame(height: 2)
                    }
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding(.horizontal)
        .background(Color(.systemBackground))
    }
}

// MARK: - Following Feed View

struct FollowingFeedView: View {
    @State private var activities: [ActivityItem] = []
    @State private var isLoading = false

    var body: some View {
        Group {
            if isLoading && activities.isEmpty {
                LoadingView()
            } else if activities.isEmpty {
                emptyState
            } else {
                activityList
            }
        }
        .task {
            await loadActivities()
        }
        .refreshable {
            await loadActivities()
        }
    }

    private var emptyState: some View {
        VStack(spacing: 20) {
            Image(systemName: "person.2")
                .font(.system(size: 48))
                .foregroundColor(.secondary)

            Text("关注更多书友")
                .font(.headline)

            Text("关注其他读者，看看他们在读什么书")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)

            NavigationLink {
                LeaderboardView()
            } label: {
                Text("发现书友")
                    .font(.headline)
                    .foregroundColor(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 10)
                    .background(Color.blue)
                    .cornerRadius(20)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }

    private var activityList: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(activities) { activity in
                    FriendActivityCard(activity: activity)
                }
            }
            .padding()
        }
    }

    private func loadActivities() async {
        isLoading = true
        do {
            let response = try await APIClient.shared.getActivityFeed(type: "all", limit: 30, offset: 0)
            activities = response.data
        } catch {
            print("Failed to load activities: \(error)")
        }
        isLoading = false
    }
}

// MARK: - Discover Feed View

struct DiscoverFeedView: View {
    @State private var activities: [ActivityItem] = []
    @State private var isLoading = false

    var body: some View {
        Group {
            if isLoading && activities.isEmpty {
                LoadingView()
            } else if activities.isEmpty {
                VStack(spacing: 16) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 48))
                        .foregroundColor(.secondary)
                    Text("暂无发现内容")
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(activities) { activity in
                            FriendActivityCard(activity: activity)
                        }
                    }
                    .padding()
                }
            }
        }
        .task {
            await loadActivities()
        }
        .refreshable {
            await loadActivities()
        }
    }

    private func loadActivities() async {
        isLoading = true
        do {
            let response = try await APIClient.shared.getActivityFeed(type: "global", limit: 30, offset: 0)
            activities = response.data
        } catch {
            print("Failed to load discover: \(error)")
        }
        isLoading = false
    }
}

// MARK: - Trending Topics View

struct TrendingTopicsView: View {
    @State private var trendingBooks: [StoreItem] = []
    @State private var isLoading = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Hot discussions
                hotDiscussionsSection

                // Trending books
                if !trendingBooks.isEmpty {
                    trendingBooksSection
                }
            }
            .padding()
        }
        .task {
            await loadTrending()
        }
    }

    private var hotDiscussionsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "flame.fill")
                    .foregroundColor(.orange)
                Text("热门话题")
                    .font(.headline)
            }

            VStack(spacing: 0) {
                ForEach(sampleTopics.indices, id: \.self) { index in
                    TopicRow(rank: index + 1, topic: sampleTopics[index])

                    if index < sampleTopics.count - 1 {
                        Divider()
                    }
                }
            }
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
        }
    }

    private var trendingBooksSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "chart.line.uptrend.xyaxis")
                    .foregroundColor(.green)
                Text("热议书籍")
                    .font(.headline)
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(trendingBooks) { book in
                        NavigationLink {
                            BookDetailView(
                                bookType: book.type == .ebook ? .ebook : .magazine,
                                bookId: book.itemId
                            )
                        } label: {
                            TrendingBookCard(book: book)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private var sampleTopics: [TrendingTopic] {
        [
            TrendingTopic(title: "2024年度好书推荐", discussionCount: 1234),
            TrendingTopic(title: "科幻小说入门指南", discussionCount: 892),
            TrendingTopic(title: "读书笔记怎么做", discussionCount: 756),
            TrendingTopic(title: "历史类书籍推荐", discussionCount: 634),
            TrendingTopic(title: "心理学经典书单", discussionCount: 521)
        ]
    }

    private func loadTrending() async {
        isLoading = true
        do {
            let ebooks = try await APIClient.shared.getEbooks(limit: 10)
            trendingBooks = ebooks.data.map { StoreItem(from: $0) }
        } catch {
            print("Failed to load trending: \(error)")
        }
        isLoading = false
    }
}

// MARK: - Supporting Views

struct FriendActivityCard: View {
    let activity: ActivityItem

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // User header
            HStack(spacing: 10) {
                Circle()
                    .fill(Color.accentColor.opacity(0.2))
                    .frame(width: 40, height: 40)
                    .overlay(
                        Text(String(activity.user.username.prefix(1)).uppercased())
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.accentColor)
                    )

                VStack(alignment: .leading, spacing: 2) {
                    Text(activity.user.username)
                        .font(.subheadline)
                        .fontWeight(.medium)

                    if let date = activity.createdDate {
                        Text(date, style: .relative)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()

                Image(systemName: activity.activityIcon)
                    .foregroundColor(activityColor)
            }

            // Activity content
            Text(activity.activityDescription)
                .font(.body)

            // Book link if applicable
            if let bookTitle = activity.bookTitle {
                HStack {
                    Image(systemName: "book.fill")
                        .font(.caption)
                    Text(bookTitle)
                        .font(.caption)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color(.systemGray6))
                .cornerRadius(8)
            }

            // Actions
            HStack(spacing: 24) {
                Button {
                    // Like action
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: activity.isLiked ? "heart.fill" : "heart")
                        Text("\(activity.likesCount)")
                    }
                    .font(.caption)
                    .foregroundColor(activity.isLiked ? .red : .secondary)
                }

                Button {
                    // Comment action
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "bubble.right")
                        Text("评论")
                    }
                    .font(.caption)
                    .foregroundColor(.secondary)
                }

                Spacer()
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }

    private var activityColor: Color {
        switch activity.activityType {
        case "started_reading": return .blue
        case "finished_book": return .green
        case "earned_badge": return .orange
        case "wrote_review": return .purple
        default: return .gray
        }
    }
}

struct TopicRow: View {
    let rank: Int
    let topic: TrendingTopic

    var body: some View {
        HStack(spacing: 12) {
            Text("\(rank)")
                .font(.headline)
                .foregroundColor(rank <= 3 ? .orange : .secondary)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text(topic.title)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text("\(topic.discussionCount)人参与讨论")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
    }
}

struct TrendingBookCard: View {
    let book: StoreItem

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            BookCoverView(coverUrl: book.coverUrl, title: book.title)
                .frame(width: 100, height: 140)
                .clipShape(RoundedRectangle(cornerRadius: 6))
                .shadow(radius: 2)

            Text(book.title)
                .font(.caption)
                .fontWeight(.medium)
                .lineLimit(2)

            HStack(spacing: 4) {
                Image(systemName: "bubble.right.fill")
                    .font(.caption2)
                Text("热议中")
                    .font(.caption2)
            }
            .foregroundColor(.orange)
        }
        .frame(width: 100)
    }
}

struct TrendingTopic: Identifiable {
    let id = UUID()
    let title: String
    let discussionCount: Int
}

// MARK: - Publish Thought Sheet

struct PublishThoughtSheet: View {
    @Environment(\.dismiss) var dismiss
    @State private var thoughtText = ""
    @State private var selectedBook: StoreItem?
    @FocusState private var isFocused: Bool

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                // Text input
                TextEditor(text: $thoughtText)
                    .frame(minHeight: 150)
                    .padding(8)
                    .background(Color(.systemGray6))
                    .cornerRadius(8)
                    .focused($isFocused)

                // Attached book
                if let book = selectedBook {
                    HStack {
                        Image(systemName: "book.fill")
                        Text(book.title)
                            .lineLimit(1)
                        Spacer()
                        Button {
                            selectedBook = nil
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(8)
                }

                // Action buttons
                HStack(spacing: 16) {
                    Button {
                        // Add book
                    } label: {
                        Label("关联书籍", systemImage: "book")
                    }

                    Button {
                        // Add image
                    } label: {
                        Label("添加图片", systemImage: "photo")
                    }

                    Spacer()
                }
                .font(.subheadline)

                Spacer()
            }
            .padding()
            .navigationTitle("发布想法")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("取消") { dismiss() }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("发布") {
                        // Publish thought
                        dismiss()
                    }
                    .fontWeight(.semibold)
                    .disabled(thoughtText.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
        .onAppear {
            isFocused = true
        }
    }
}

#Preview {
    FriendsTabView()
}
