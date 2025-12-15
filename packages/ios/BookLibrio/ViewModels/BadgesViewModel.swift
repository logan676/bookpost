/**
 * Badges ViewModel
 * Manages badge data and interactions
 */

import Foundation
import Combine

@MainActor
class BadgesViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var earnedBadges: [EarnedBadge] = []
    @Published var inProgressBadges: [BadgeWithProgress] = []
    @Published var categorySummaries: [String: CategorySummary] = [:]
    @Published var isLoading = false
    @Published var error: String?
    @Published var newBadges: [EarnedBadge] = []
    @Published var showNewBadgeAlert = false

    // User stats for summary card
    @Published var totalReadCount: Int = 0
    @Published var userLevel: Int = 1
    @Published var nextMilestoneName: String = "Level 2"
    @Published var milestoneProgress: Double = 0.0

    // MARK: - Computed Properties
    var totalEarned: Int {
        earnedBadges.count
    }

    var totalBadges: Int {
        let fromCategories = categorySummaries.values.reduce(0) { $0 + $1.total }
        // Fallback: if no category summaries, estimate from earned + in progress
        return fromCategories > 0 ? fromCategories : max(earnedBadges.count + inProgressBadges.count, 50)
    }

    var earnedPercentage: Double {
        guard totalBadges > 0 else { return 0 }
        return Double(totalEarned) / Double(totalBadges) * 100
    }

    var sortedCategories: [BadgeCategory] {
        BadgeCategory.allCases.filter { categorySummaries[$0.rawValue] != nil }
    }

    // MARK: - Methods

    func loadBadges() async {
        isLoading = true
        error = nil

        do {
            let response: APIResponse<UserBadgesResponse> = try await APIClient.shared.get(
                "/user/badges"
            )

            if let data = response.data {
                earnedBadges = data.earned
                inProgressBadges = data.inProgress
                categorySummaries = data.categories

                // Calculate user stats based on badges
                calculateUserStats()
            }
        } catch {
            self.error = "加载勋章失败: \(error.localizedDescription)"
        }

        isLoading = false
    }

    /// Calculate user stats based on earned badges
    private func calculateUserStats() {
        // Calculate total XP from badges (sum of xpValue or estimate from level)
        let totalXP = earnedBadges.reduce(0) { total, badge in
            total + (badge.xpValue ?? badge.level * 100)
        }

        // Calculate user level based on XP (simple formula: level = sqrt(XP/100) + 1)
        userLevel = max(1, Int(sqrt(Double(totalXP) / 100.0)) + 1)

        // Calculate next milestone
        let nextLevel = userLevel + 1
        let currentLevelXP = (userLevel - 1) * (userLevel - 1) * 100
        let nextLevelXP = (nextLevel - 1) * (nextLevel - 1) * 100
        let xpForCurrentLevel = totalXP - currentLevelXP
        let xpNeededForNext = nextLevelXP - currentLevelXP

        nextMilestoneName = "Level \(nextLevel)"
        milestoneProgress = xpNeededForNext > 0 ? min(Double(xpForCurrentLevel) / Double(xpNeededForNext), 1.0) : 0.0

        // Estimate read count from reading-related badges
        totalReadCount = earnedBadges.filter {
            $0.category == "books_finished" || $0.category == "reading_days" || $0.category == "reading_duration"
        }.reduce(0) { total, badge in
            total + badge.level * 50  // Rough estimate
        }

        // Minimum read count based on earned badges
        if totalReadCount == 0 {
            totalReadCount = earnedBadges.count * 20
        }
    }

    func checkForNewBadges() async {
        do {
            let response: APIResponse<NewBadgesResponse> = try await APIClient.shared.post(
                "/badges/check",
                body: EmptyBody()
            )

            if let data = response.data, !data.newBadges.isEmpty {
                newBadges = data.newBadges
                showNewBadgeAlert = true

                // Reload all badges
                await loadBadges()
            }
        } catch {
            print("Check badges failed: \(error)")
        }
    }

    func earnedBadges(for category: BadgeCategory) -> [EarnedBadge] {
        earnedBadges.filter { $0.category == category.rawValue }
    }

    func inProgressBadges(for category: BadgeCategory) -> [BadgeWithProgress] {
        inProgressBadges.filter { $0.badge.category == category.rawValue }
    }
}

// Empty body for POST requests with no body
struct EmptyBody: Codable {}
