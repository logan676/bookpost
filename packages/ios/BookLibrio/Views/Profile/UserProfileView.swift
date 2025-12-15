import SwiftUI

/// View for displaying another user's profile
struct UserProfileView: View {
    let userId: Int

    @State private var profileData: UserProfileData?
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var isFollowUpdating = false
    @EnvironmentObject private var authManager: AuthManager

    private var isOwnProfile: Bool {
        authManager.currentUser?.id == userId
    }

    var body: some View {
        Group {
            if isLoading && profileData == nil {
                LoadingView()
            } else if let error = errorMessage {
                errorView(error)
            } else if let data = profileData {
                profileContent(data)
            }
        }
        .navigationTitle(profileData?.profile.username ?? L10n.UserProfile.title)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadProfile()
        }
        .refreshable {
            await loadProfile()
        }
    }

    // MARK: - Error View

    @ViewBuilder
    private func errorView(_ error: String) -> some View {
        ContentUnavailableView {
            Label(L10n.UserProfile.loadFailed, systemImage: "exclamationmark.triangle")
        } description: {
            Text(error)
        } actions: {
            Button(L10n.Common.retry) {
                Task { await loadProfile() }
            }
        }
    }

    // MARK: - Profile Content

    @ViewBuilder
    private func profileContent(_ data: UserProfileData) -> some View {
        ScrollView {
            VStack(spacing: 20) {
                // Profile header
                profileHeader(data.profile, stats: data.followStats)

                // Stats cards
                statsCards(data.profile)

                // Actions (if not own profile)
                if !isOwnProfile {
                    actionButtons(data.followStats)
                }

                // Navigation links
                navigationLinks
            }
            .padding()
        }
    }

    // MARK: - Profile Header

    @ViewBuilder
    private func profileHeader(_ profile: UserProfile, stats: FollowStats) -> some View {
        VStack(spacing: 16) {
            // Avatar
            Circle()
                .fill(Color.accentColor.opacity(0.2))
                .frame(width: 80, height: 80)
                .overlay(
                    Text(String(profile.username.prefix(1)).uppercased())
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(.accentColor)
                )

            // Username
            Text(profile.username)
                .font(.title2)
                .fontWeight(.bold)

            // Follow stats
            HStack(spacing: 40) {
                NavigationLink(destination: FollowListView(userId: userId, type: .followers)) {
                    VStack(spacing: 4) {
                        Text("\(stats.followersCount)")
                            .font(.headline)
                        Text(L10n.UserProfile.followers)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .buttonStyle(.plain)

                NavigationLink(destination: FollowListView(userId: userId, type: .following)) {
                    VStack(spacing: 4) {
                        Text("\(stats.followingCount)")
                            .font(.headline)
                        Text(L10n.UserProfile.following)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .buttonStyle(.plain)
            }

            // Mutual follow badge
            if stats.isFollowedBy && !isOwnProfile {
                Label(L10n.UserProfile.mutualFollow, systemImage: "arrow.left.arrow.right")
                    .font(.caption)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.green.opacity(0.1))
                    .foregroundColor(.green)
                    .cornerRadius(12)
            }
        }
    }

    // MARK: - Stats Cards

    @ViewBuilder
    private func statsCards(_ profile: UserProfile) -> some View {
        LazyVGrid(columns: [
            GridItem(.flexible()),
            GridItem(.flexible()),
            GridItem(.flexible())
        ], spacing: 12) {
            statCard(
                value: profile.formattedReadingDuration,
                label: L10n.UserProfile.readingTime,
                icon: "clock.fill",
                color: .blue
            )

            statCard(
                value: "\(profile.booksFinishedCount)",
                label: L10n.UserProfile.booksFinished,
                icon: "book.closed.fill",
                color: .green
            )

            statCard(
                value: "\(profile.currentStreakDays) \(L10n.Stats.days)",
                label: L10n.UserProfile.streak,
                icon: "flame.fill",
                color: .orange
            )
        }
    }

    @ViewBuilder
    private func statCard(value: String, label: String, icon: String, color: Color) -> some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)

            Text(value)
                .font(.headline)

            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    // MARK: - Action Buttons

    @ViewBuilder
    private func actionButtons(_ stats: FollowStats) -> some View {
        Button {
            Task { await toggleFollow() }
        } label: {
            HStack {
                Image(systemName: stats.isFollowing ? "person.badge.minus" : "person.badge.plus")
                Text(stats.isFollowing ? L10n.UserProfile.unfollow : L10n.UserProfile.follow)
            }
            .fontWeight(.semibold)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(stats.isFollowing ? Color(.systemGray6) : Color.accentColor)
            .foregroundColor(stats.isFollowing ? .primary : .white)
            .cornerRadius(10)
        }
        .disabled(isFollowUpdating)
    }

    // MARK: - Navigation Links

    @ViewBuilder
    private var navigationLinks: some View {
        VStack(spacing: 0) {
            NavigationLink(destination: UserActivitiesView(userId: userId)) {
                HStack {
                    Label(L10n.Activity.title, systemImage: "bubble.left.and.bubble.right")
                    Spacer()
                    Image(systemName: "chevron.right")
                        .foregroundColor(.secondary)
                }
                .padding()
            }
            .buttonStyle(.plain)

            Divider()
        }
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    // MARK: - Data Loading

    private func loadProfile() async {
        isLoading = true
        errorMessage = nil

        do {
            let response = try await APIClient.shared.getUserProfile(userId: userId)
            profileData = response.data
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    private func toggleFollow() async {
        guard let stats = profileData?.followStats else { return }
        isFollowUpdating = true

        do {
            if stats.isFollowing {
                _ = try await APIClient.shared.unfollowUser(userId: userId)
            } else {
                _ = try await APIClient.shared.followUser(userId: userId)
            }
            // Refresh profile to update follow stats
            await loadProfile()
        } catch {
            Log.e("Failed to toggle follow", error: error)
        }

        isFollowUpdating = false
    }
}

#Preview {
    NavigationStack {
        UserProfileView(userId: 1)
    }
}
