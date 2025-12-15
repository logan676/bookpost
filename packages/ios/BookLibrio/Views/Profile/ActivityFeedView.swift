import SwiftUI

/// Activity feed showing updates from followed users
struct ActivityFeedView: View {
    @State private var activities: [ActivityItem] = []
    @State private var isLoading = false
    @State private var hasMore = false
    @State private var offset = 0
    @State private var selectedType: FeedType = .all
    @State private var likedActivities: Set<Int> = []

    enum FeedType: String, CaseIterable {
        case all
        case global

        var displayName: String {
            switch self {
            case .all: return L10n.Activity.following
            case .global: return L10n.Activity.global
            }
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Type selector
            Picker(L10n.Activity.title, selection: $selectedType) {
                ForEach(FeedType.allCases, id: \.self) { type in
                    Text(type.displayName).tag(type)
                }
            }
            .pickerStyle(.segmented)
            .padding()

            // Content
            if activities.isEmpty && isLoading {
                LoadingView()
            } else if activities.isEmpty {
                emptyView
            } else {
                activityList
            }
        }
        .navigationTitle(L10n.Activity.title)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadActivities()
        }
        .onChange(of: selectedType) { _, _ in
            activities = []
            offset = 0
            Task { await loadActivities() }
        }
        .refreshable {
            await loadActivities()
        }
    }

    // MARK: - Empty View

    @ViewBuilder
    private var emptyView: some View {
        ContentUnavailableView {
            Label(L10n.Activity.empty, systemImage: "bubble.left.and.bubble.right")
        } description: {
            Text(selectedType == .all ? L10n.Activity.followUsers : L10n.Activity.noActivity)
        }
    }

    // MARK: - Activity List

    @ViewBuilder
    private var activityList: some View {
        List {
            ForEach(activities) { activity in
                ActivityItemView(
                    activity: activity,
                    isLiked: isLiked(activity),
                    onLike: { await likeActivity(activity) },
                    onUserTap: { userId in
                        // Navigate to user profile
                    }
                )
                .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                .listRowSeparator(.hidden)
            }

            if hasMore {
                Button(L10n.Activity.loadMore) {
                    Task { await loadMore() }
                }
                .frame(maxWidth: .infinity)
                .disabled(isLoading)
            }
        }
        .listStyle(.plain)
    }

    // MARK: - Helper Methods

    private func isLiked(_ activity: ActivityItem) -> Bool {
        activity.isLiked || likedActivities.contains(activity.id)
    }

    private func loadActivities() async {
        isLoading = true
        offset = 0

        do {
            let response = try await APIClient.shared.getActivityFeed(
                type: selectedType.rawValue,
                limit: 20,
                offset: 0
            )
            activities = response.data
            hasMore = response.hasMore
            offset = activities.count
            // Initialize liked set
            likedActivities = Set(response.data.filter { $0.isLiked }.map { $0.id })
        } catch {
            Log.e("Failed to load activity feed", error: error)
        }

        isLoading = false
    }

    private func loadMore() async {
        guard !isLoading else { return }
        isLoading = true

        do {
            let response = try await APIClient.shared.getActivityFeed(
                type: selectedType.rawValue,
                limit: 20,
                offset: offset
            )
            activities.append(contentsOf: response.data)
            hasMore = response.hasMore
            offset = activities.count
        } catch {
            Log.e("Failed to load more activities", error: error)
        }

        isLoading = false
    }

    private func likeActivity(_ activity: ActivityItem) async {
        do {
            let response = try await APIClient.shared.likeActivity(activityId: activity.id)
            if response.data.liked {
                likedActivities.insert(activity.id)
            } else {
                likedActivities.remove(activity.id)
            }
        } catch {
            Log.e("Failed to like activity", error: error)
        }
    }
}

// MARK: - Activity Item View

struct ActivityItemView: View {
    let activity: ActivityItem
    let isLiked: Bool
    let onLike: () async -> Void
    let onUserTap: (Int) -> Void

    @State private var likesCount: Int

    init(activity: ActivityItem, isLiked: Bool, onLike: @escaping () async -> Void, onUserTap: @escaping (Int) -> Void) {
        self.activity = activity
        self.isLiked = isLiked
        self.onLike = onLike
        self.onUserTap = onUserTap
        _likesCount = State(initialValue: activity.likesCount)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // User header
            HStack(spacing: 10) {
                // Avatar
                NavigationLink(destination: UserProfileView(userId: activity.user.id)) {
                    Circle()
                        .fill(Color.accentColor.opacity(0.2))
                        .frame(width: 40, height: 40)
                        .overlay(
                            Text(String(activity.user.username.prefix(1)).uppercased())
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(.accentColor)
                        )
                }

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

                // Activity type icon
                Image(systemName: activity.activityIcon)
                    .foregroundColor(activityColor)
            }

            // Activity content
            HStack(spacing: 8) {
                Image(systemName: activity.activityIcon)
                    .font(.caption)
                    .foregroundColor(activityColor)

                Text(activity.activityDescription)
                    .font(.body)
            }

            // Book link (if applicable)
            if let bookId = activity.bookId, let bookType = activity.bookType {
                NavigationLink(destination: BookDetailView(
                    bookType: bookType == "ebook" ? .ebook : .magazine,
                    bookId: bookId
                )) {
                    HStack {
                        Image(systemName: "book.fill")
                            .font(.caption)
                        Text(activity.bookTitle ?? "查看书籍")
                            .font(.caption)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color(.systemGray6))
                    .cornerRadius(8)
                }
                .buttonStyle(.plain)
            }

            // Footer with likes
            HStack {
                Button {
                    Task {
                        await onLike()
                        // Update local count
                        if !isLiked {
                            likesCount += 1
                        }
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: isLiked ? "heart.fill" : "heart")
                            .foregroundColor(isLiked ? .red : .secondary)
                        Text("\(likesCount)")
                            .foregroundColor(.secondary)
                    }
                    .font(.caption)
                }
                .buttonStyle(.plain)

                Spacer()
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private var activityColor: Color {
        switch activity.activityType {
        case "started_reading": return .blue
        case "finished_book": return .green
        case "earned_badge": return .orange
        case "wrote_review": return .purple
        case "reached_milestone": return .yellow
        default: return .gray
        }
    }
}

// MARK: - User Activities View

struct UserActivitiesView: View {
    let userId: Int

    @State private var activities: [ActivityItem] = []
    @State private var isLoading = false
    @State private var hasMore = false
    @State private var offset = 0
    @State private var likedActivities: Set<Int> = []

    var body: some View {
        Group {
            if activities.isEmpty && isLoading {
                LoadingView()
            } else if activities.isEmpty {
                ContentUnavailableView {
                    Label(L10n.Activity.empty, systemImage: "bubble.left.and.bubble.right")
                } description: {
                    Text(L10n.Activity.noActivity)
                }
            } else {
                List {
                    ForEach(activities) { activity in
                        ActivityItemView(
                            activity: activity,
                            isLiked: activity.isLiked || likedActivities.contains(activity.id),
                            onLike: { await likeActivity(activity) },
                            onUserTap: { _ in }
                        )
                        .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                        .listRowSeparator(.hidden)
                    }

                    if hasMore {
                        Button(L10n.Activity.loadMore) {
                            Task { await loadMore() }
                        }
                        .frame(maxWidth: .infinity)
                        .disabled(isLoading)
                    }
                }
                .listStyle(.plain)
            }
        }
        .navigationTitle(L10n.Activity.title)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadActivities()
        }
        .refreshable {
            await loadActivities()
        }
    }

    private func loadActivities() async {
        isLoading = true
        offset = 0

        do {
            let response = try await APIClient.shared.getUserActivities(
                userId: userId,
                limit: 20,
                offset: 0
            )
            activities = response.data
            hasMore = response.hasMore
            offset = activities.count
        } catch {
            Log.e("Failed to load user activities", error: error)
        }

        isLoading = false
    }

    private func loadMore() async {
        guard !isLoading else { return }
        isLoading = true

        do {
            let response = try await APIClient.shared.getUserActivities(
                userId: userId,
                limit: 20,
                offset: offset
            )
            activities.append(contentsOf: response.data)
            hasMore = response.hasMore
            offset = activities.count
        } catch {
            Log.e("Failed to load more activities", error: error)
        }

        isLoading = false
    }

    private func likeActivity(_ activity: ActivityItem) async {
        do {
            let response = try await APIClient.shared.likeActivity(activityId: activity.id)
            if response.data.liked {
                likedActivities.insert(activity.id)
            } else {
                likedActivities.remove(activity.id)
            }
        } catch {
            Log.e("Failed to like activity", error: error)
        }
    }
}

#Preview {
    NavigationStack {
        ActivityFeedView()
    }
}
