import Foundation
import SwiftUI

/// ViewModel for managing user profile data
/// Handles loading profile, assets, stats, and privacy settings
@MainActor
class ProfileViewModel: ObservableObject {
    // MARK: - Published Properties

    @Published var user: User?
    @Published var assets: UserAssets?
    @Published var readingRecords: ProfileReadingRecords?
    @Published var timelineMilestones: [TimelineMilestone] = []
    @Published var categoryPreferences: [CategoryPreference] = []

    @Published var isLoading = false
    @Published var errorMessage: String?

    // Privacy settings
    @Published var privacySettings: ProfilePrivacySettings = .default

    // MARK: - Private Properties

    private let apiClient = APIClient.shared
    private let authManager = AuthManager.shared

    // MARK: - Initialization

    init() {
        // Load cached privacy settings
        loadPrivacySettings()
    }

    // MARK: - Data Loading

    func loadProfile() async {
        isLoading = true
        errorMessage = nil

        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.loadUserData() }
            group.addTask { await self.loadAssets() }
            group.addTask { await self.loadReadingRecords() }
            group.addTask { await self.loadTimelineMilestones() }
            group.addTask { await self.loadCategoryPreferences() }
        }

        isLoading = false
    }

    func refresh() async {
        await loadProfile()
    }

    // MARK: - Individual Loaders

    private func loadUserData() async {
        user = authManager.currentUser
    }

    private func loadAssets() async {
        do {
            // Simulated - replace with actual API
            // let response = try await apiClient.getUserAssets()
            // assets = response.data

            // Mock data for development
            assets = UserAssets(
                balance: 50.00,
                credits: 120,
                membershipDaysRemaining: 30,
                membershipType: "年度会员",
                coupons: 3,
                giftCards: 0
            )
        } catch {
            print("Failed to load assets: \(error)")
        }
    }

    private func loadReadingRecords() async {
        do {
            // Simulated - replace with actual API
            readingRecords = ProfileReadingRecords(
                currentlyReading: 3,
                booksCompleted: 156,
                notesCount: 1024,
                subscriptionsCount: 12,
                highlightsCount: 2048,
                listsCount: 8,
                totalReadingHours: 520,
                currentStreak: 15
            )
        } catch {
            print("Failed to load reading records: \(error)")
        }
    }

    private func loadTimelineMilestones() async {
        do {
            // Simulated - replace with actual API
            timelineMilestones = [
                TimelineMilestone(
                    id: 1,
                    type: .finishedBook,
                    title: "完成《百年孤独》",
                    subtitle: "第156本书",
                    date: Date().addingTimeInterval(-86400 * 2),
                    bookCoverUrl: nil,
                    bookTitle: "百年孤独"
                ),
                TimelineMilestone(
                    id: 2,
                    type: .streakDays,
                    title: "连续阅读15天",
                    subtitle: "保持阅读习惯",
                    date: Date().addingTimeInterval(-86400 * 5),
                    bookCoverUrl: nil,
                    bookTitle: nil
                ),
                TimelineMilestone(
                    id: 3,
                    type: .totalHours,
                    title: "累计阅读500小时",
                    subtitle: "里程碑成就",
                    date: Date().addingTimeInterval(-86400 * 10),
                    bookCoverUrl: nil,
                    bookTitle: nil
                ),
                TimelineMilestone(
                    id: 4,
                    type: .finishedBook,
                    title: "完成《人类简史》",
                    subtitle: "第155本书",
                    date: Date().addingTimeInterval(-86400 * 15),
                    bookCoverUrl: nil,
                    bookTitle: "人类简史"
                )
            ]
        } catch {
            print("Failed to load milestones: \(error)")
        }
    }

    private func loadCategoryPreferences() async {
        do {
            // Simulated - replace with actual API
            categoryPreferences = [
                CategoryPreference(category: "文学", percentage: 35, booksCount: 54),
                CategoryPreference(category: "历史", percentage: 25, booksCount: 39),
                CategoryPreference(category: "科技", percentage: 15, booksCount: 23),
                CategoryPreference(category: "哲学", percentage: 12, booksCount: 19),
                CategoryPreference(category: "经济", percentage: 8, booksCount: 12),
                CategoryPreference(category: "其他", percentage: 5, booksCount: 9)
            ]
        } catch {
            print("Failed to load preferences: \(error)")
        }
    }

    // MARK: - Privacy Settings

    private func loadPrivacySettings() {
        if let data = UserDefaults.standard.data(forKey: "profile.privacy"),
           let settings = try? JSONDecoder().decode(ProfilePrivacySettings.self, from: data) {
            privacySettings = settings
        }
    }

    func savePrivacySettings() {
        if let data = try? JSONEncoder().encode(privacySettings) {
            UserDefaults.standard.set(data, forKey: "profile.privacy")
        }
    }

    func updatePrivacyVisibility(_ visibility: ProfileVisibility) {
        privacySettings.profileVisibility = visibility
        savePrivacySettings()
    }

    // MARK: - Share Card Generation

    func generateShareCard() -> ShareCardData {
        ShareCardData(
            username: user?.username ?? "读者",
            totalBooks: readingRecords?.booksCompleted ?? 0,
            totalHours: readingRecords?.totalReadingHours ?? 0,
            currentStreak: readingRecords?.currentStreak ?? 0,
            notesCount: readingRecords?.notesCount ?? 0,
            topCategory: categoryPreferences.first?.category ?? "阅读",
            generatedDate: Date()
        )
    }
}

// MARK: - Data Models

struct UserAssets: Codable {
    let balance: Double
    let credits: Int
    let membershipDaysRemaining: Int?
    let membershipType: String?
    let coupons: Int
    let giftCards: Int

    var formattedBalance: String {
        String(format: "%.2f", balance)
    }

    var membershipStatus: String {
        if let days = membershipDaysRemaining, days > 0 {
            return L10n.ProfileAssets.memberDays(days)
        }
        return L10n.ProfileAssets.notMember
    }
}

struct ProfileReadingRecords: Codable {
    let currentlyReading: Int
    let booksCompleted: Int
    let notesCount: Int
    let subscriptionsCount: Int
    let highlightsCount: Int
    let listsCount: Int
    let totalReadingHours: Int
    let currentStreak: Int
}

struct TimelineMilestone: Identifiable, Codable {
    let id: Int
    let type: MilestoneType
    let title: String
    let subtitle: String
    let date: Date
    let bookCoverUrl: String?
    let bookTitle: String?

    enum MilestoneType: String, Codable {
        case finishedBook = "finished_book"
        case streakDays = "streak_days"
        case totalHours = "total_hours"
        case badge = "badge"
        case firstBook = "first_book"
        case anniversary = "anniversary"

        var icon: String {
            switch self {
            case .finishedBook: return "book.closed.fill"
            case .streakDays: return "flame.fill"
            case .totalHours: return "clock.fill"
            case .badge: return "medal.fill"
            case .firstBook: return "star.fill"
            case .anniversary: return "gift.fill"
            }
        }

        var color: Color {
            switch self {
            case .finishedBook: return .blue
            case .streakDays: return .orange
            case .totalHours: return .purple
            case .badge: return .yellow
            case .firstBook: return .green
            case .anniversary: return .pink
            }
        }
    }
}

struct CategoryPreference: Identifiable, Codable {
    var id: String { category }
    let category: String
    let percentage: Int
    let booksCount: Int

    var color: Color {
        switch category {
        case "文学": return .blue
        case "历史": return .orange
        case "科技": return .green
        case "哲学": return .purple
        case "经济": return .red
        default: return .gray
        }
    }
}

// MARK: - Privacy Settings

struct ProfilePrivacySettings: Codable {
    var profileVisibility: ProfileVisibility
    var showBookshelf: Bool
    var showFavorites: Bool
    var showLists: Bool
    var showBadges: Bool
    var showThoughts: Bool
    var showReadingStats: Bool

    static var `default`: ProfilePrivacySettings {
        ProfilePrivacySettings(
            profileVisibility: .followers,
            showBookshelf: true,
            showFavorites: true,
            showLists: true,
            showBadges: true,
            showThoughts: true,
            showReadingStats: true
        )
    }
}

enum ProfileVisibility: String, Codable, CaseIterable, Identifiable {
    case onlyMe = "only_me"
    case mutualFollows = "mutual_follows"
    case followers = "followers"
    case everyone = "everyone"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .onlyMe: return L10n.ProfilePrivacy.onlyMe
        case .mutualFollows: return L10n.ProfilePrivacy.mutualFollows
        case .followers: return L10n.ProfilePrivacy.followers
        case .everyone: return L10n.ProfilePrivacy.everyone
        }
    }

    var icon: String {
        switch self {
        case .onlyMe: return "lock.fill"
        case .mutualFollows: return "person.2.fill"
        case .followers: return "person.3.fill"
        case .everyone: return "globe"
        }
    }
}

// MARK: - Share Card Data

struct ShareCardData {
    let username: String
    let totalBooks: Int
    let totalHours: Int
    let currentStreak: Int
    let notesCount: Int
    let topCategory: String
    let generatedDate: Date

    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy年M月"
        return formatter.string(from: generatedDate)
    }
}
