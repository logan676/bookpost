import Foundation

/// Centralized cache key management to avoid hardcoded strings
/// All cache keys should be defined here for consistency and easy maintenance
enum CacheKeys {

    // MARK: - Reading History

    /// Cache key for user's reading history
    static func readingHistory(userId: String) -> String {
        "reading_history_\(userId)"
    }

    // MARK: - Bookshelf

    /// Cache key for bookshelf with all filter parameters
    static func bookshelf(
        userId: String,
        status: String,
        type: String = "all",
        sort: String = "added",
        openedOnly: Bool = false
    ) -> String {
        "bookshelf_\(userId)_\(status)_\(type)_\(sort)_\(openedOnly)"
    }

    /// Cache key for all bookshelf items
    static func bookshelfAll(userId: String) -> String {
        "bookshelf_\(userId)_all"
    }

    // MARK: - Books

    /// Cache key for book detail
    static func bookDetail(bookId: Int) -> String {
        "book_detail_\(bookId)"
    }

    /// Cache key for ebook detail
    static func ebookDetail(ebookId: Int) -> String {
        "ebook_detail_\(ebookId)"
    }

    /// Cache key for magazine detail
    static func magazineDetail(magazineId: Int) -> String {
        "magazine_detail_\(magazineId)"
    }

    /// Cache key for book list by category
    static func bookList(category: String, page: Int) -> String {
        "book_list_\(category)_page\(page)"
    }

    // MARK: - Store Home

    /// Cache key for store recommended books
    static func storeRecommended() -> String {
        "store_recommended"
    }

    /// Cache key for store new arrivals
    static func storeNewArrivals() -> String {
        "store_new_arrivals"
    }

    /// Cache key for store hot books
    static func storeHotBooks() -> String {
        "store_hot_books"
    }

    /// Cache key for store top ranked
    static func storeTopRanked() -> String {
        "store_top_ranked"
    }

    /// Cache key for store free books
    static func storeFreeBooks() -> String {
        "store_free_books"
    }

    /// Cache key for store member exclusive books
    static func storeMemberExclusive() -> String {
        "store_member_exclusive"
    }

    /// Cache key for popular book lists
    static func storePopularLists() -> String {
        "store_popular_lists"
    }

    /// Cache key for ebooks list
    static func storeEbooks(limit: Int, offset: Int) -> String {
        "store_ebooks_\(limit)_\(offset)"
    }

    /// Cache key for magazines list
    static func storeMagazines(limit: Int, offset: Int) -> String {
        "store_magazines_\(limit)_\(offset)"
    }

    // MARK: - Categories

    /// Cache key for ebook categories
    static func ebookCategories() -> String {
        "ebook_categories"
    }

    /// Cache key for books in a category
    static func categoryBooks(categoryId: Int, page: Int) -> String {
        "category_\(categoryId)_books_page\(page)"
    }

    // MARK: - Book Lists

    /// Cache key for book lists
    static func bookLists(sort: String, limit: Int) -> String {
        "book_lists_\(sort)_\(limit)"
    }

    /// Cache key for book list detail
    static func bookListDetail(listId: Int) -> String {
        "book_list_detail_\(listId)"
    }

    // MARK: - Notes & Highlights

    /// Cache key for book highlights
    static func highlights(bookId: Int, userId: String) -> String {
        "highlights_\(bookId)_\(userId)"
    }

    /// Cache key for book notes
    static func notes(bookId: Int, userId: String) -> String {
        "notes_\(bookId)_\(userId)"
    }

    // MARK: - User

    /// Cache key for user profile
    static func userProfile(userId: String) -> String {
        "user_profile_\(userId)"
    }

    // MARK: - External Rankings

    /// Cache key for external rankings list
    static func externalRankings() -> String {
        "external_rankings"
    }

    /// Cache key for external ranking detail
    static func externalRankingDetail(rankingId: Int) -> String {
        "external_ranking_detail_\(rankingId)"
    }

    // MARK: - Top Rated

    /// Cache key for top rated books
    static func topRatedBooks(limit: Int, offset: Int) -> String {
        "top_rated_books_\(limit)_\(offset)"
    }

    // MARK: - Books by Year

    /// Cache key for books by year
    static func booksByYear() -> String {
        "books_by_year"
    }
}
