/**
 * Book List Models
 * Data models for user-curated book lists and related operations
 */

import Foundation

// MARK: - Book List

/// A user-curated book list
/// Can be public or private, followed by other users
struct BookList: Codable, Identifiable, Hashable {
    let id: Int
    let title: String
    let description: String?
    let coverUrl: String?
    let creatorId: Int
    let creator: BookListCreator?
    let isPublic: Bool
    let itemCount: Int
    let followerCount: Int
    let isFollowing: Bool?
    let category: String?
    let tags: [String]?
    let items: [BookListItem]?
    let createdAt: String?
    let updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case id, title, description, creator, category, tags, items
        case coverUrl = "cover_url"
        case creatorId = "creator_id"
        case isPublic = "is_public"
        case itemCount = "item_count"
        case followerCount = "follower_count"
        case isFollowing = "is_following"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    /// Preview books for display (first 3-4 items)
    var previewBooks: [BookListItem] {
        Array((items ?? []).prefix(4))
    }

    /// Formatted follower count for display
    var formattedFollowerCount: String {
        if followerCount >= 10000 {
            return String(format: "%.1fw", Double(followerCount) / 10000)
        } else if followerCount >= 1000 {
            return String(format: "%.1fk", Double(followerCount) / 1000)
        }
        return "\(followerCount)"
    }

    /// Created date parsed from ISO8601 string
    var createdDate: Date? {
        guard let dateStr = createdAt else { return nil }
        return ISO8601DateFormatter().date(from: dateStr)
    }

    // MARK: - Hashable

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: BookList, rhs: BookList) -> Bool {
        lhs.id == rhs.id
    }
}

// MARK: - Book List Creator

/// Simplified user info for list creator display
struct BookListCreator: Codable, Identifiable {
    let id: Int
    let username: String
    let avatar: String?

    enum CodingKeys: String, CodingKey {
        case id, username, avatar
    }
}

// MARK: - Book List Item

/// A book entry within a list, with optional notes
struct BookListItem: Codable, Identifiable, Hashable {
    let id: Int
    let listId: Int
    let bookId: Int
    let bookType: String
    let position: Int
    let note: String?
    let book: BookListBook?
    let addedAt: String?

    enum CodingKeys: String, CodingKey {
        case id, position, note, book
        case listId = "list_id"
        case bookId = "book_id"
        case bookType = "book_type"
        case addedAt = "added_at"
    }

    /// Added date parsed from ISO8601 string
    var addedDate: Date? {
        guard let dateStr = addedAt else { return nil }
        return ISO8601DateFormatter().date(from: dateStr)
    }

    // MARK: - Hashable

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: BookListItem, rhs: BookListItem) -> Bool {
        lhs.id == rhs.id
    }
}

// MARK: - Book Info in List

/// Book information embedded in list items
struct BookListBook: Codable, Identifiable, Hashable {
    let id: Int
    let title: String
    let author: String?
    let coverUrl: String?
    let rating: Double?
    let ratingCount: Int?
    let description: String?

    enum CodingKeys: String, CodingKey {
        case id, title, author, rating, description
        case coverUrl = "cover_url"
        case ratingCount = "rating_count"
    }

    /// Formatted rating for display (e.g., "8.5")
    var formattedRating: String? {
        guard let rating = rating else { return nil }
        return String(format: "%.1f", rating)
    }

    // MARK: - Hashable

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: BookListBook, rhs: BookListBook) -> Bool {
        lhs.id == rhs.id
    }
}

// MARK: - List Categories

/// Predefined categories for book lists
enum BookListCategory: String, CaseIterable, Identifiable {
    case all = "all"
    case literature = "literature"
    case history = "history"
    case science = "science"
    case philosophy = "philosophy"
    case art = "art"
    case business = "business"
    case technology = "technology"
    case lifestyle = "lifestyle"
    case other = "other"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .all: return L10n.BookList.categoryAll
        case .literature: return L10n.BookList.categoryLiterature
        case .history: return L10n.BookList.categoryHistory
        case .science: return L10n.BookList.categoryScience
        case .philosophy: return L10n.BookList.categoryPhilosophy
        case .art: return L10n.BookList.categoryArt
        case .business: return L10n.BookList.categoryBusiness
        case .technology: return L10n.BookList.categoryTechnology
        case .lifestyle: return L10n.BookList.categoryLifestyle
        case .other: return L10n.BookList.categoryOther
        }
    }

    var iconName: String {
        switch self {
        case .all: return "square.grid.2x2"
        case .literature: return "book.closed"
        case .history: return "clock.arrow.circlepath"
        case .science: return "atom"
        case .philosophy: return "lightbulb"
        case .art: return "paintpalette"
        case .business: return "chart.line.uptrend.xyaxis"
        case .technology: return "cpu"
        case .lifestyle: return "leaf"
        case .other: return "ellipsis.circle"
        }
    }
}

// MARK: - Sort Options

/// Sort options for book list browsing
enum BookListSortOption: String, CaseIterable, Identifiable {
    case popular = "popular"
    case recent = "recent"
    case mostBooks = "most_books"
    case mostFollowers = "most_followers"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .popular: return L10n.BookList.sortPopular
        case .recent: return L10n.BookList.sortRecent
        case .mostBooks: return L10n.BookList.sortMostBooks
        case .mostFollowers: return L10n.BookList.sortMostFollowers
        }
    }
}

// MARK: - API Responses

/// Response for list of book lists
struct BookListsResponse: Codable {
    let data: [BookList]
    let total: Int?
    let hasMore: Bool?

    enum CodingKeys: String, CodingKey {
        case data, total
        case hasMore = "has_more"
    }
}

/// Response for single book list
struct BookListResponse: Codable {
    let data: BookList
}

/// Response for list items with pagination
struct BookListItemsResponse: Codable {
    let data: [BookListItem]
    let total: Int?
    let hasMore: Bool?

    enum CodingKeys: String, CodingKey {
        case data, total
        case hasMore = "has_more"
    }
}

// MARK: - API Requests

/// Request body for creating a new book list
struct CreateBookListRequest: Encodable {
    let title: String
    let description: String?
    let isPublic: Bool
    let category: String?
    let tags: [String]?

    enum CodingKeys: String, CodingKey {
        case title, description, category, tags
        case isPublic = "is_public"
    }
}

/// Request body for updating a book list
struct UpdateBookListRequest: Encodable {
    let title: String?
    let description: String?
    let isPublic: Bool?
    let category: String?
    let tags: [String]?

    enum CodingKeys: String, CodingKey {
        case title, description, category, tags
        case isPublic = "is_public"
    }
}

/// Request body for adding a book to a list
struct AddBookToListRequest: Encodable {
    let bookId: Int
    let bookType: String
    let note: String?
    let position: Int?

    enum CodingKeys: String, CodingKey {
        case note, position
        case bookId = "book_id"
        case bookType = "book_type"
    }
}

/// Request body for updating a list item
struct UpdateListItemRequest: Encodable {
    let note: String?
    let position: Int?
}

// MARK: - Action Responses

/// Response for follow/unfollow action
struct BookListFollowResponse: Codable {
    let data: BookListFollowResult
}

struct BookListFollowResult: Codable {
    let success: Bool
    let isFollowing: Bool
    let followerCount: Int

    enum CodingKeys: String, CodingKey {
        case success
        case isFollowing = "is_following"
        case followerCount = "follower_count"
    }
}

/// Response for adding item to list
struct AddToListResponse: Codable {
    let data: BookListItem
}

/// Generic success response
struct BookListActionResponse: Codable {
    let success: Bool
}

// MARK: - User's Lists Summary

/// Summary of user's book lists for profile display
struct UserBookListsSummary: Codable {
    let created: [BookList]
    let following: [BookList]
    let createdCount: Int
    let followingCount: Int

    enum CodingKeys: String, CodingKey {
        case created, following
        case createdCount = "created_count"
        case followingCount = "following_count"
    }
}

/// Response wrapper for user's lists summary
struct UserBookListsResponse: Codable {
    let data: UserBookListsSummary
}
