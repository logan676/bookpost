import Foundation

enum ItemType: String, Codable {
    case ebook
    case magazine
    case book
}

/// Item for recent reading display
/// Note: This model matches the backend /api/reading-history response
struct ReadingHistoryItem: Codable, Identifiable {
    let id: Int
    let itemType: String
    let itemId: Int
    let title: String?
    let coverUrl: String?
    let lastPage: Int?
    let lastReadAt: String?

    /// Computed progress (placeholder, actual progress needs total pages from book info)
    var progress: Double? {
        // Return nil since we don't have total pages info here
        // The UI will handle nil progress gracefully
        nil
    }

    /// Safe title with fallback
    var displayTitle: String {
        title ?? "未知书名"
    }
}

/// Response for reading history list
struct ReadingHistoryItemResponse: Codable {
    let data: [ReadingHistoryItem]
}

struct ReadingHistoryEntry: Codable, Identifiable {
    let id: Int
    let userId: Int?
    let itemType: String
    let itemId: Int
    let title: String?
    let coverUrl: String?
    let lastPage: Int?
    let lastReadAt: String?
    let createdAt: String?

    var type: ItemType {
        ItemType(rawValue: itemType) ?? .ebook
    }
}

struct ReadingHistoryResponse: Codable {
    let data: [ReadingHistoryEntry]
}

/// Response for single book reading history query
struct SingleReadingHistoryResponse: Codable {
    let progress: Double?
    let position: String?
    let lastReadAt: String?
}

/// Empty response for void API calls
struct EmptyResponse: Codable {}

struct UpdateReadingHistoryRequest: Codable {
    let itemType: String
    let itemId: Int
    let title: String?
    let coverUrl: String?
    let lastPage: Int?
}

// MARK: - Reading Goal Response

struct ReadingGoalData: Codable {
    let dailyMinutes: Int
    let currentStreak: Int
    let maxStreak: Int
    let todayMinutes: Int
    let monthlyBooksRead: Int
    let hasGoal: Bool

    enum CodingKeys: String, CodingKey {
        case dailyMinutes = "daily_minutes"
        case currentStreak = "current_streak"
        case maxStreak = "max_streak"
        case todayMinutes = "today_minutes"
        case monthlyBooksRead = "monthly_books_read"
        case hasGoal = "has_goal"
    }

    // Provide default values for missing fields
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        dailyMinutes = try container.decodeIfPresent(Int.self, forKey: .dailyMinutes) ?? 30
        currentStreak = try container.decodeIfPresent(Int.self, forKey: .currentStreak) ?? 0
        maxStreak = try container.decodeIfPresent(Int.self, forKey: .maxStreak) ?? 0
        todayMinutes = try container.decodeIfPresent(Int.self, forKey: .todayMinutes) ?? 0
        monthlyBooksRead = try container.decodeIfPresent(Int.self, forKey: .monthlyBooksRead) ?? 0
        hasGoal = try container.decodeIfPresent(Bool.self, forKey: .hasGoal) ?? false
    }
}

