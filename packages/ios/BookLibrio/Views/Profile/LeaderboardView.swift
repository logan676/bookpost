import SwiftUI

/// Weekly reading leaderboard showing top readers
struct LeaderboardView: View {
    @State private var leaderboardData: LeaderboardData?
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var selectedType: LeaderboardType = .friends
    @State private var likedUsers: Set<Int> = []

    enum LeaderboardType: String, CaseIterable {
        case friends
        case all

        var displayName: String {
            switch self {
            case .friends: return L10n.Leaderboard.friends
            case .all: return L10n.Leaderboard.global
            }
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Type selector
            Picker(L10n.Leaderboard.title, selection: $selectedType) {
                ForEach(LeaderboardType.allCases, id: \.self) { type in
                    Text(type.displayName).tag(type)
                }
            }
            .pickerStyle(.segmented)
            .padding()

            // Content
            if isLoading && leaderboardData == nil {
                LoadingView()
            } else if let error = errorMessage {
                errorView(error)
            } else if let data = leaderboardData {
                leaderboardContent(data)
            }
        }
        .navigationTitle(L10n.Leaderboard.title)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadLeaderboard()
        }
        .onChange(of: selectedType) { _, _ in
            Task { await loadLeaderboard() }
        }
        .refreshable {
            await loadLeaderboard()
        }
    }

    // MARK: - Error View

    @ViewBuilder
    private func errorView(_ error: String) -> some View {
        ContentUnavailableView {
            Label(L10n.Leaderboard.loadFailed, systemImage: "exclamationmark.triangle")
        } description: {
            Text(error)
        } actions: {
            Button(L10n.Common.retry) {
                Task { await loadLeaderboard() }
            }
        }
    }

    // MARK: - Leaderboard Content

    @ViewBuilder
    private func leaderboardContent(_ data: LeaderboardData) -> some View {
        ScrollView {
            VStack(spacing: 16) {
                // Week info header
                weekInfoCard(data.weekRange)

                // My ranking card
                if let myRanking = data.myRanking {
                    myRankingCard(myRanking, totalParticipants: data.totalParticipants)
                }

                // Top 3 podium
                if data.entries.count >= 3 {
                    podiumView(Array(data.entries.prefix(3)))
                }

                // Leaderboard list
                leaderboardList(data.entries)
            }
            .padding()
        }
    }

    // MARK: - Week Info Card

    @ViewBuilder
    private func weekInfoCard(_ weekRange: WeekRange) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(L10n.Leaderboard.weeklyRanking)
                    .font(.headline)
                Text("\(formatDate(weekRange.start)) - \(formatDate(weekRange.end))")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Text(L10n.Leaderboard.settlementTime)
                    .font(.caption)
                    .foregroundColor(.secondary)
                Text(formatSettlementTime(weekRange.settlementTime))
                    .font(.caption)
                    .foregroundColor(.orange)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    // MARK: - My Ranking Card

    @ViewBuilder
    private func myRankingCard(_ ranking: MyRanking, totalParticipants: Int) -> some View {
        VStack(spacing: 12) {
            HStack {
                Text(L10n.Leaderboard.myRanking)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                Spacer()
            }

            HStack(spacing: 20) {
                // Rank
                VStack(spacing: 4) {
                    Text("#\(ranking.rank)")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(.accentColor)
                    Text("/ \(totalParticipants) \(L10n.Leaderboard.participants)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Divider().frame(height: 40)

                // Duration
                VStack(spacing: 4) {
                    Text(ranking.formattedDuration)
                        .font(.title3)
                        .fontWeight(.semibold)
                    Text(L10n.Leaderboard.readingTime)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Divider().frame(height: 40)

                // Reading days
                VStack(spacing: 4) {
                    Text("\(ranking.readingDays) \(L10n.Stats.days)")
                        .font(.title3)
                        .fontWeight(.semibold)
                    Text(L10n.Leaderboard.readingDays)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Divider().frame(height: 40)

                // Rank change
                VStack(spacing: 4) {
                    Text(ranking.rankChangeText)
                        .font(.title3)
                        .fontWeight(.semibold)
                        .foregroundColor(ranking.rankChange > 0 ? .green : (ranking.rankChange < 0 ? .red : .gray))
                    Text(L10n.Leaderboard.rankChange)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .background(Color.accentColor.opacity(0.1))
        .cornerRadius(12)
    }

    // MARK: - Podium View

    @ViewBuilder
    private func podiumView(_ topThree: [LeaderboardEntry]) -> some View {
        HStack(alignment: .bottom, spacing: 8) {
            // 2nd place
            if topThree.count > 1 {
                podiumEntry(topThree[1], position: 2, height: 80)
            }

            // 1st place
            if topThree.count > 0 {
                podiumEntry(topThree[0], position: 1, height: 100)
            }

            // 3rd place
            if topThree.count > 2 {
                podiumEntry(topThree[2], position: 3, height: 60)
            }
        }
        .padding(.vertical)
    }

    @ViewBuilder
    private func podiumEntry(_ entry: LeaderboardEntry, position: Int, height: CGFloat) -> some View {
        VStack(spacing: 8) {
            // Avatar
            ZStack {
                Circle()
                    .fill(podiumColor(position).opacity(0.2))
                    .frame(width: 50, height: 50)

                Text(String(entry.user.username.prefix(1)).uppercased())
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(podiumColor(position))
            }
            .overlay(
                // Crown for 1st place
                position == 1 ?
                    Image(systemName: "crown.fill")
                        .foregroundColor(.yellow)
                        .offset(y: -30)
                : nil
            )

            // Username
            Text(entry.user.username)
                .font(.caption)
                .fontWeight(.medium)
                .lineLimit(1)

            // Duration
            Text(entry.formattedDuration)
                .font(.caption2)
                .foregroundColor(.secondary)

            // Podium base
            RoundedRectangle(cornerRadius: 8)
                .fill(podiumColor(position))
                .frame(height: height)
                .overlay(
                    Text("\(position)")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                )
        }
        .frame(maxWidth: .infinity)
    }

    private func podiumColor(_ position: Int) -> Color {
        switch position {
        case 1: return .yellow
        case 2: return .gray
        case 3: return .orange
        default: return .gray
        }
    }

    // MARK: - Leaderboard List

    @ViewBuilder
    private func leaderboardList(_ entries: [LeaderboardEntry]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(L10n.Leaderboard.fullRanking)
                .font(.headline)

            ForEach(Array(entries.enumerated()), id: \.element.id) { index, entry in
                leaderboardRow(entry, index: index)
            }
        }
    }

    @ViewBuilder
    private func leaderboardRow(_ entry: LeaderboardEntry, index: Int) -> some View {
        HStack(spacing: 12) {
            // Rank
            Text("#\(entry.rank ?? (index + 1))")
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundColor(index < 3 ? podiumColor(index + 1) : .secondary)
                .frame(width: 36)

            // Avatar
            Circle()
                .fill(Color.accentColor.opacity(0.2))
                .frame(width: 40, height: 40)
                .overlay(
                    Text(String(entry.user.username.prefix(1)).uppercased())
                        .font(.subheadline)
                        .fontWeight(.semibold)
                )

            // User info
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.user.username)
                    .font(.subheadline)
                    .fontWeight(.medium)
                HStack(spacing: 8) {
                    Text(entry.formattedDuration)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("\(entry.readingDays) \(L10n.Stats.days)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            Spacer()

            // Rank change
            Text(entry.rankChangeText)
                .font(.caption)
                .foregroundColor(entry.rankChange > 0 ? .green : (entry.rankChange < 0 ? .red : .gray))

            // Like button
            Button {
                Task { await likeUser(entry) }
            } label: {
                HStack(spacing: 2) {
                    Image(systemName: isLiked(entry) ? "heart.fill" : "heart")
                        .foregroundColor(isLiked(entry) ? .red : .gray)
                    Text("\(likesCount(entry))")
                        .foregroundColor(.secondary)
                }
                .font(.caption)
            }
            .disabled(isLiked(entry))
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    // MARK: - Helper Methods

    private func loadLeaderboard() async {
        isLoading = true
        errorMessage = nil

        do {
            let response = try await APIClient.shared.getLeaderboard(type: selectedType.rawValue)
            leaderboardData = response.data
            // Initialize liked users from response
            likedUsers = Set(response.data.entries.filter { $0.isLiked }.map { $0.user.id })
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    private func likeUser(_ entry: LeaderboardEntry) async {
        guard !isLiked(entry) else { return }

        do {
            _ = try await APIClient.shared.likeLeaderboardUser(userId: entry.user.id)
            likedUsers.insert(entry.user.id)
        } catch {
            Log.e("Failed to like user", error: error)
        }
    }

    private func isLiked(_ entry: LeaderboardEntry) -> Bool {
        entry.isLiked || likedUsers.contains(entry.user.id)
    }

    private func likesCount(_ entry: LeaderboardEntry) -> Int {
        let base = entry.likesCount
        if !entry.isLiked && likedUsers.contains(entry.user.id) {
            return base + 1
        }
        return base
    }

    private func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: dateString) else { return dateString }

        let displayFormatter = DateFormatter()
        displayFormatter.dateFormat = "M/d"
        return displayFormatter.string(from: date)
    }

    private func formatSettlementTime(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: dateString) else { return dateString }

        let displayFormatter = DateFormatter()
        displayFormatter.dateFormat = "M/d HH:mm"
        return displayFormatter.string(from: date)
    }
}

#Preview {
    NavigationStack {
        LeaderboardView()
    }
}
