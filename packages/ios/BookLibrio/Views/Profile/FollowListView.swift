import SwiftUI

/// View for displaying followers or following list
struct FollowListView: View {
    let userId: Int
    let type: FollowListType

    enum FollowListType {
        case followers
        case following

        var title: String {
            switch self {
            case .followers: return L10n.Follow.followers
            case .following: return L10n.Follow.following
            }
        }
    }

    @State private var users: [FollowUser] = []
    @State private var isLoading = false
    @State private var hasMore = false
    @State private var offset = 0
    @State private var followingUpdates: [Int: Bool] = [:]
    @EnvironmentObject private var authManager: AuthManager

    var body: some View {
        Group {
            if users.isEmpty && isLoading {
                LoadingView()
            } else if users.isEmpty {
                emptyView
            } else {
                usersList
            }
        }
        .navigationTitle(type.title)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadUsers()
        }
        .refreshable {
            await loadUsers()
        }
    }

    // MARK: - Empty View

    @ViewBuilder
    private var emptyView: some View {
        ContentUnavailableView {
            Label(
                type == .followers ? L10n.Follow.noFollowers : L10n.Follow.noFollowing,
                systemImage: "person.2"
            )
        } description: {
            Text(type == .followers ? L10n.Follow.noFollowers : L10n.Follow.noFollowing)
        }
    }

    // MARK: - Users List

    @ViewBuilder
    private var usersList: some View {
        List {
            ForEach(users) { user in
                userRow(user)
            }

            if hasMore {
                Button(L10n.Follow.loadMore) {
                    Task { await loadMore() }
                }
                .frame(maxWidth: .infinity)
                .disabled(isLoading)
            }
        }
        .listStyle(.plain)
    }

    @ViewBuilder
    private func userRow(_ user: FollowUser) -> some View {
        HStack(spacing: 12) {
            NavigationLink(destination: UserProfileView(userId: user.id)) {
                HStack(spacing: 12) {
                    // Avatar
                    Circle()
                        .fill(Color.accentColor.opacity(0.2))
                        .frame(width: 44, height: 44)
                        .overlay(
                            Text(String(user.username.prefix(1)).uppercased())
                                .font(.headline)
                                .foregroundColor(.accentColor)
                        )

                    // User info
                    VStack(alignment: .leading, spacing: 2) {
                        Text(user.username)
                            .font(.subheadline)
                            .fontWeight(.medium)

                        if let date = user.followedDate {
                            Text(date, style: .relative)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }
            .buttonStyle(.plain)

            Spacer()

            // Follow button (if not self)
            if user.id != authManager.currentUser?.id {
                Button {
                    Task { await toggleFollow(user) }
                } label: {
                    Text(isFollowing(user) ? L10n.UserProfile.following : L10n.UserProfile.follow)
                        .font(.caption)
                        .fontWeight(.medium)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(isFollowing(user) ? Color(.systemGray6) : Color.accentColor)
                        .foregroundColor(isFollowing(user) ? .primary : .white)
                        .cornerRadius(16)
                }
            }
        }
        .padding(.vertical, 4)
    }

    // MARK: - Helper Methods

    private func isFollowing(_ user: FollowUser) -> Bool {
        if let updated = followingUpdates[user.id] {
            return updated
        }
        return user.isFollowing
    }

    private func loadUsers() async {
        isLoading = true
        offset = 0

        do {
            let response: FollowListResponse
            if type == .followers {
                response = try await APIClient.shared.getFollowers(userId: userId, limit: 20, offset: 0)
            } else {
                response = try await APIClient.shared.getFollowing(userId: userId, limit: 20, offset: 0)
            }
            users = response.data
            hasMore = response.hasMore
            offset = users.count
        } catch {
            Log.e("Failed to load \(type.title)", error: error)
        }

        isLoading = false
    }

    private func loadMore() async {
        guard !isLoading else { return }
        isLoading = true

        do {
            let response: FollowListResponse
            if type == .followers {
                response = try await APIClient.shared.getFollowers(userId: userId, limit: 20, offset: offset)
            } else {
                response = try await APIClient.shared.getFollowing(userId: userId, limit: 20, offset: offset)
            }
            users.append(contentsOf: response.data)
            hasMore = response.hasMore
            offset = users.count
        } catch {
            Log.e("Failed to load more \(type.title)", error: error)
        }

        isLoading = false
    }

    private func toggleFollow(_ user: FollowUser) async {
        let currentlyFollowing = isFollowing(user)

        do {
            if currentlyFollowing {
                _ = try await APIClient.shared.unfollowUser(userId: user.id)
                followingUpdates[user.id] = false
            } else {
                _ = try await APIClient.shared.followUser(userId: user.id)
                followingUpdates[user.id] = true
            }
        } catch {
            Log.e("Failed to toggle follow", error: error)
        }
    }
}

#Preview {
    NavigationStack {
        FollowListView(userId: 1, type: .followers)
    }
}
