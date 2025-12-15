/**
 * CuratedList Models
 * Data models for external/editorial book lists (NYT, Amazon, Bill Gates, etc.)
 */

import Foundation

// MARK: - CuratedList

struct CuratedList: Identifiable, Codable {
    let id: Int
    let listType: String
    let title: String
    let subtitle: String?
    let description: String?
    let coverUrl: String?
    let themeColor: String?
    let sourceName: String?
    let sourceUrl: String?
    let sourceLogoUrl: String?
    let year: Int?
    let month: Int?
    let category: String?
    let bookCount: Int
    let viewCount: Int
    let saveCount: Int
    let isFeatured: Bool
    let createdAt: String

    // Computed properties
    var displayYear: String {
        if let year = year {
            if let month = month {
                let monthName = Calendar.current.monthSymbols[month - 1]
                return "\(monthName) \(year)"
            }
            return String(year)
        }
        return ""
    }

    var listTypeDisplayName: String {
        CuratedListType(rawValue: listType)?.displayName ?? listType
    }

    var categoryDisplayName: String? {
        guard let category = category else { return nil }
        return CuratedListCategory(rawValue: category)?.displayName ?? category.capitalized
    }
}

// MARK: - CuratedListItem

struct CuratedListItem: Identifiable, Codable {
    let id: Int
    let position: Int
    let bookType: String
    let bookId: Int?
    let book: CuratedListBook?
    let externalTitle: String?
    let externalAuthor: String?
    let externalCoverUrl: String?
    let externalDescription: String?
    let isbn: String?
    let amazonUrl: String?
    let goodreadsUrl: String?
    let editorNote: String?
    let isAvailable: Bool

    // Computed: get display title (from available book or external info)
    var displayTitle: String {
        if let book = book {
            return book.title
        }
        return externalTitle ?? "Unknown Title"
    }

    var displayAuthor: String {
        if let book = book {
            return book.author ?? "Unknown Author"
        }
        return externalAuthor ?? "Unknown Author"
    }

    var displayCoverUrl: String? {
        if let book = book {
            return book.coverUrl
        }
        return externalCoverUrl
    }

    var displayDescription: String? {
        externalDescription
    }
}

// MARK: - CuratedListBook (embedded book info for available books)

struct CuratedListBook: Codable {
    let id: Int
    let title: String
    let author: String?
    let coverUrl: String?
    let rating: Double?
    let ratingCount: Int?
}

// MARK: - List Type Enum

enum CuratedListType: String, CaseIterable {
    case nytBestseller = "nyt_bestseller"
    case amazonBest = "amazon_best"
    case billGates = "bill_gates"
    case goodreadsChoice = "goodreads_choice"
    case pulitzer = "pulitzer"
    case booker = "booker"
    case bookerInternational = "booker_international"
    case newbery = "newbery"
    case nationalBook = "national_book"
    case oprahBookClub = "oprah_book_club"
    case reeseBookClub = "reese_book_club"
    case obamaReading = "obama_reading"
    // New types
    case editorPick = "editor_pick"
    case bookSeries = "book_series"
    case weeklyPick = "weekly_pick"

    var displayName: String {
        switch self {
        case .nytBestseller: return "New York Times"
        case .amazonBest: return "Amazon Best Books"
        case .billGates: return "Bill Gates"
        case .goodreadsChoice: return "Goodreads Choice"
        case .pulitzer: return "Pulitzer Prize"
        case .booker: return "Booker Prize"
        case .bookerInternational: return "Booker International"
        case .newbery: return "Newbery Medal"
        case .nationalBook: return "National Book Award"
        case .oprahBookClub: return "Oprah's Book Club"
        case .reeseBookClub: return "Reese's Book Club"
        case .obamaReading: return "Obama Reading List"
        case .editorPick: return "Editor's Pick"
        case .bookSeries: return "Book Series"
        case .weeklyPick: return "Weekly Pick"
        }
    }

    var icon: String {
        switch self {
        case .nytBestseller: return "newspaper"
        case .amazonBest: return "cart"
        case .billGates: return "person.circle"
        case .goodreadsChoice: return "star.circle"
        case .pulitzer: return "medal"
        case .booker: return "trophy"
        case .bookerInternational: return "trophy.fill"
        case .newbery: return "medal.fill"
        case .nationalBook: return "book.closed"
        case .oprahBookClub: return "person.crop.circle"
        case .reeseBookClub: return "person.crop.circle.fill"
        case .obamaReading: return "person.fill"
        case .editorPick: return "star.square.on.square"
        case .bookSeries: return "books.vertical"
        case .weeklyPick: return "calendar.badge.clock"
        }
    }
}

// MARK: - List Category Enum

enum CuratedListCategory: String, CaseIterable {
    case fiction
    case nonfiction
    case mystery
    case scienceFiction = "science_fiction"
    case fantasy
    case romance
    case horror
    case biography
    case history
    case science
    case business
    case economics
    case politics
    case poetry
    case youngAdult = "young_adult"
    case memoir

    var displayName: String {
        switch self {
        case .fiction: return "Fiction"
        case .nonfiction: return "Nonfiction"
        case .mystery: return "Mystery & Thriller"
        case .scienceFiction: return "Science Fiction"
        case .fantasy: return "Fantasy"
        case .romance: return "Romance"
        case .horror: return "Horror"
        case .biography: return "Biography"
        case .history: return "History"
        case .science: return "Science"
        case .business: return "Business"
        case .economics: return "Economics"
        case .politics: return "Politics"
        case .poetry: return "Poetry"
        case .youngAdult: return "Young Adult"
        case .memoir: return "Memoir"
        }
    }
}

// MARK: - API Response Types

struct CuratedListsResponse: Codable {
    let data: [CuratedList]
    let total: Int
    let hasMore: Bool
}

struct CuratedListDetailResponse: Codable {
    let data: CuratedListDetail
}

struct CuratedListDetail: Codable {
    let list: CuratedList
    let items: [CuratedListItem]
}

struct CuratedListTypesResponse: Codable {
    let data: [CuratedListTypeInfo]
}

struct CuratedListTypeInfo: Codable {
    let type: String
    let name: String
    let count: Int
    let years: [Int]
}

// MARK: - Admin Types

struct UnavailableBook: Identifiable, Codable {
    let id: Int
    let listId: Int
    let listTitle: String
    let listType: String
    let year: Int?
    let externalTitle: String?
    let externalAuthor: String?
    let externalCoverUrl: String?
    let isbn: String?
    let isbn13: String?
    let amazonUrl: String?
    let goodreadsUrl: String?
    let addedAt: String

    var displayTitle: String {
        externalTitle ?? "Unknown Title"
    }

    var displayAuthor: String {
        externalAuthor ?? "Unknown Author"
    }
}

struct UnavailableBooksResponse: Codable {
    let data: [UnavailableBook]
    let total: Int
    let hasMore: Bool
}

struct CuratedListStatsResponse: Codable {
    let data: CuratedListStats
}

struct CuratedListStats: Codable {
    let totalLists: Int
    let totalBooks: Int
    let availableBooks: Int
    let unavailableBooks: Int
    let listsByType: [ListTypeCount]
    let listsByYear: [ListYearCount]
}

struct ListTypeCount: Codable {
    let type: String
    let count: Int
}

struct ListYearCount: Codable {
    let year: Int
    let count: Int
}
