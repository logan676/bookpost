import Foundation

// MARK: - Book Type Enum

enum BookType: String, Codable {
    case ebook
    case magazine
}

// MARK: - Book Detail Models

struct BookMetadata: Codable, Identifiable {
    let id: Int
    let type: BookType
    let title: String
    let coverUrl: String?
    let author: String?
    let translator: String?
    let description: String?
    let wordCount: Int?
    let pageCount: Int?
    let publicationDate: String?
    let publisher: String?
    let isbn: String?
    let language: String?
    let fileType: String?
    let fileSize: Int64?
    let issueNumber: String?
    let issn: String?
    let doubanId: String?
    let goodreadsId: String?
    let createdAt: String?

    var isPdf: Bool {
        fileType?.lowercased() == "pdf"
    }

    var isEpub: Bool {
        fileType?.lowercased() == "epub"
    }

    var formattedFileSize: String {
        guard let size = fileSize else { return "" }
        let formatter = ByteCountFormatter()
        formatter.countStyle = .file
        return formatter.string(fromByteCount: size)
    }
}

struct BookStats: Codable {
    let totalReaders: Int
    let currentReaders: Int
    let finishedReaders: Int
    let totalHighlights: Int
    let totalReviews: Int
    let totalNotes: Int
    let averageRating: Double?
    let ratingCount: Int
    let recommendPercent: Double?

    var hasActivity: Bool {
        totalReaders > 0 || totalHighlights > 0 || totalReviews > 0
    }

    var formattedRating: String? {
        guard let rating = averageRating else { return nil }
        return String(format: "%.1f", rating)
    }

    var formattedRecommendPercent: String? {
        guard let percent = recommendPercent else { return nil }
        return String(format: "%.0f%%", percent)
    }
}

struct ReviewUser: Codable, Identifiable {
    let id: Int
    let username: String
    let avatar: String?
}

struct BookReview: Codable, Identifiable {
    let id: Int
    let user: ReviewUser
    let rating: Int?
    let recommendType: String?
    let title: String?
    let content: String
    let likesCount: Int
    let isFeatured: Bool
    let readingProgress: Double?
    let createdAt: String?

    var formattedReadingProgress: String? {
        guard let progress = readingProgress else { return nil }
        return String(format: "%.0f%%", progress * 100)
    }

    var isRecommended: Bool {
        recommendType == "recommend"
    }

    var isNotRecommended: Bool {
        recommendType == "not_recommend"
    }
}

enum BookshelfStatus: String, Codable {
    case wantToRead = "want_to_read"
    case reading
    case finished
    case abandoned

    var displayName: String {
        switch self {
        case .wantToRead: return "想读"
        case .reading: return "在读"
        case .finished: return "已读"
        case .abandoned: return "放弃"
        }
    }

    var iconName: String {
        switch self {
        case .wantToRead: return "bookmark"
        case .reading: return "book"
        case .finished: return "checkmark.circle"
        case .abandoned: return "xmark.circle"
        }
    }
}

struct UserBookshelfStatus: Codable {
    let status: BookshelfStatus?
    let progress: Double?
    let currentPage: Int?
    let startedAt: String?
    let finishedAt: String?
    let addedAt: String?

    var formattedProgress: String? {
        guard let progress = progress else { return nil }
        return String(format: "%.0f%%", progress * 100)
    }

    var hasStarted: Bool {
        startedAt != nil
    }

    var hasFinished: Bool {
        finishedAt != nil
    }
}

struct BookDetailData: Codable {
    let book: BookMetadata
    let stats: BookStats
    let recentReviews: [BookReview]
    let userStatus: UserBookshelfStatus?
}

struct BookDetailResponse: Codable {
    let data: BookDetailData
}

// MARK: - Reviews Pagination Response

struct BookReviewsResponse: Codable {
    let data: [BookReview]
    let total: Int
    let hasMore: Bool
}

// MARK: - Review CRUD Types

enum RecommendType: String, Codable, CaseIterable {
    case recommend
    case neutral
    case notRecommend = "not_recommend"

    var displayName: String {
        switch self {
        case .recommend: return "推荐"
        case .neutral: return "一般"
        case .notRecommend: return "不推荐"
        }
    }

    var iconName: String {
        switch self {
        case .recommend: return "hand.thumbsup.fill"
        case .neutral: return "minus.circle"
        case .notRecommend: return "hand.thumbsdown.fill"
        }
    }

    var color: String {
        switch self {
        case .recommend: return "green"
        case .neutral: return "gray"
        case .notRecommend: return "red"
        }
    }
}

struct CreateReviewRequest: Encodable {
    let rating: Int?
    let recommendType: String?
    let title: String?
    let content: String
}

struct ReviewResponse: Codable {
    let data: BookReview
}

struct MyReviewResponse: Codable {
    let data: BookReview?
}

struct DeleteReviewResponse: Codable {
    let success: Bool
}

struct ToggleLikeResponse: Codable {
    let liked: Bool
    let likesCount: Int
}

struct CheckLikedResponse: Codable {
    let liked: Bool
}

// MARK: - Bookshelf CRUD Types

struct AddToBookshelfRequest: Encodable {
    let status: String

    init(status: BookshelfStatus = .wantToRead) {
        self.status = status.rawValue
    }
}

struct UpdateBookshelfRequest: Encodable {
    let status: String?
    let progress: Double?
    let currentPage: Int?
    let privateNotes: String?

    init(status: BookshelfStatus? = nil, progress: Double? = nil, currentPage: Int? = nil, privateNotes: String? = nil) {
        self.status = status?.rawValue
        self.progress = progress
        self.currentPage = currentPage
        self.privateNotes = privateNotes
    }
}

struct BookshelfEntryResponse: Codable {
    let data: BookshelfEntry
}

struct BookshelfEntry: Codable, Identifiable {
    let id: Int
    let userId: Int
    let bookType: String
    let bookId: Int
    let status: BookshelfStatus
    let progress: Double?
    let currentPage: Int?
    let privateNotes: String?
    let startedAt: String?
    let finishedAt: String?
    let addedAt: String
    let updatedAt: String
}

struct RemoveFromBookshelfResponse: Codable {
    let success: Bool
}

// MARK: - User Bookshelf List Types

struct BookshelfListResponse: Codable {
    let data: [BookshelfItem]
    let total: Int
    let hasMore: Bool
    let counts: BookshelfCounts
}

struct BookshelfItem: Codable, Identifiable {
    var id: String { "\(bookType)-\(bookId)" }

    let bookType: String
    let bookId: Int
    let status: BookshelfStatus
    let progress: Double?
    let currentPage: Int?
    let startedAt: String?
    let finishedAt: String?
    let addedAt: String
    let book: BookshelfBookInfo
}

struct BookshelfBookInfo: Codable {
    let id: Int
    let title: String
    let coverUrl: String?
    let author: String?
    let publisher: String?
    let pageCount: Int?
}

struct BookshelfCounts: Codable {
    let wantToRead: Int
    let reading: Int
    let finished: Int
    let abandoned: Int
    let total: Int

    enum CodingKeys: String, CodingKey {
        case wantToRead = "want_to_read"
        case reading
        case finished
        case abandoned
        case total
    }

    // Custom decoder to handle missing 'total' key from API
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        wantToRead = try container.decodeIfPresent(Int.self, forKey: .wantToRead) ?? 0
        reading = try container.decodeIfPresent(Int.self, forKey: .reading) ?? 0
        finished = try container.decodeIfPresent(Int.self, forKey: .finished) ?? 0
        abandoned = try container.decodeIfPresent(Int.self, forKey: .abandoned) ?? 0
        // Calculate total if not provided by API
        if let apiTotal = try container.decodeIfPresent(Int.self, forKey: .total) {
            total = apiTotal
        } else {
            total = wantToRead + reading + finished + abandoned
        }
    }
}
