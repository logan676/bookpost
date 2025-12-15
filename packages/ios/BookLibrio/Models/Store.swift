/**
 * Store Models
 * Data models for the E-book Store home page sections:
 * - Books by Year
 * - Top Rated
 * - External Rankings
 */

import Foundation

// MARK: - Books by Year

struct BookByYear: Identifiable, Codable {
    let id: Int
    let title: String
    let author: String?
    let coverUrl: String?
    let publicationDate: String?
    let rating: Double?
    let ratingCount: Int?
}

struct BooksByYearGroup: Identifiable, Codable {
    let year: Int
    let books: [BookByYear]

    var id: Int { year }
}

struct BooksByYearResponse: Codable {
    let data: [BooksByYearGroup]
}

// MARK: - Top Rated

struct TopRatedBook: Identifiable, Codable {
    let id: Int
    let title: String
    let author: String?
    let coverUrl: String?
    let rating: Double?
    let ratingCount: Int?
    let externalRatingSource: String?

    var ratingFormatted: String {
        guard let rating = rating else { return "N/A" }
        return String(format: "%.1f", rating)
    }

    var ratingCountFormatted: String {
        guard let count = ratingCount else { return "" }
        if count >= 1000 {
            return String(format: "%.1fK ratings", Double(count) / 1000)
        }
        return "\(count) ratings"
    }
}

struct TopRatedResponse: Codable {
    let data: [TopRatedBook]
    let total: Int
}

// MARK: - External Rankings

struct ExternalRanking: Identifiable, Codable {
    let id: Int
    let listType: String
    let sourceName: String?
    let sourceLogoUrl: String?
    let title: String
    let subtitle: String?
    let description: String?
    let bookCount: Int?
    let lastUpdated: String?
    let externalUrl: String?
    let previewCovers: [String]?

    var displaySourceName: String {
        sourceName ?? CuratedListType(rawValue: listType)?.displayName ?? listType
    }

    var formattedLastUpdated: String? {
        guard let lastUpdated = lastUpdated else { return nil }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: lastUpdated) else {
            // Try without fractional seconds
            formatter.formatOptions = [.withInternetDateTime]
            guard let date = formatter.date(from: lastUpdated) else { return nil }
            return formatDate(date)
        }
        return formatDate(date)
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return "Updated \(formatter.string(from: date))"
    }
}

struct ExternalRankingsResponse: Codable {
    let data: [ExternalRanking]
}

// MARK: - External Ranking Detail

struct ExternalRankingBook: Identifiable, Codable {
    let rank: Int
    let book: ExternalRankingBookInfo
    let editorNote: String?

    var id: Int { rank }
}

struct ExternalRankingBookInfo: Codable {
    let id: Int?
    let title: String
    let author: String?
    let coverUrl: String?

    var isAvailable: Bool { id != nil }
}

struct ExternalRankingDetailResponse: Codable {
    let ranking: ExternalRanking
    let books: [ExternalRankingBook]
    let total: Int
}
