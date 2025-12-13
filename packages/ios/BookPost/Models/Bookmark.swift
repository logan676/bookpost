import Foundation

#if canImport(ReadiumShared)
import ReadiumShared
#endif

/// Bookmark model for saving reading positions
struct Bookmark: Codable, Identifiable {
    let id: UUID
    let bookType: String
    let bookId: Int
    let createdAt: Date

    // Position information
    let href: String
    let progression: Double?
    let totalProgression: Double?

    // Display information
    let chapterTitle: String?
    let textSnippet: String?

    init(
        id: UUID = UUID(),
        bookType: String,
        bookId: Int,
        href: String,
        progression: Double? = nil,
        totalProgression: Double? = nil,
        chapterTitle: String? = nil,
        textSnippet: String? = nil,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.bookType = bookType
        self.bookId = bookId
        self.href = href
        self.progression = progression
        self.totalProgression = totalProgression
        self.chapterTitle = chapterTitle
        self.textSnippet = textSnippet
        self.createdAt = createdAt
    }

    #if canImport(ReadiumShared)
    /// Create bookmark from Readium Locator
    init(bookType: String, bookId: Int, locator: Locator) {
        self.id = UUID()
        self.bookType = bookType
        self.bookId = bookId
        self.href = String(describing: locator.href)
        self.progression = locator.locations.progression
        self.totalProgression = locator.locations.totalProgression
        self.chapterTitle = locator.title
        self.textSnippet = locator.text.highlight ?? locator.text.before
        self.createdAt = Date()
    }
    #endif

    /// Formatted creation date
    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: createdAt)
    }

    /// Display title (chapter title or position percentage)
    var displayTitle: String {
        if let title = chapterTitle, !title.isEmpty {
            return title
        }
        if let progress = totalProgression {
            return "\(Int(progress * 100))%"
        }
        return href
    }
}

/// Manager for bookmark storage and retrieval
@MainActor
class BookmarkManager: ObservableObject {
    static let shared = BookmarkManager()

    @Published var bookmarks: [Bookmark] = []

    private let storageKey = "bookmarks_v1"

    private init() {
        loadBookmarks()
    }

    // MARK: - Public Methods

    /// Get bookmarks for a specific book
    func bookmarks(for bookType: String, bookId: Int) -> [Bookmark] {
        bookmarks.filter { $0.bookType == bookType && $0.bookId == bookId }
            .sorted { $0.createdAt > $1.createdAt }
    }

    /// Check if a position is bookmarked
    func isBookmarked(bookType: String, bookId: Int, href: String) -> Bool {
        bookmarks.contains { $0.bookType == bookType && $0.bookId == bookId && $0.href == href }
    }

    /// Add a new bookmark
    func addBookmark(_ bookmark: Bookmark) {
        // Don't add duplicate for same position
        if !isBookmarked(bookType: bookmark.bookType, bookId: bookmark.bookId, href: bookmark.href) {
            bookmarks.append(bookmark)
            saveBookmarks()
        }
    }

    #if canImport(ReadiumShared)
    /// Add bookmark from current locator
    func addBookmark(bookType: String, bookId: Int, locator: Locator) {
        let bookmark = Bookmark(bookType: bookType, bookId: bookId, locator: locator)
        addBookmark(bookmark)
    }
    #endif

    /// Remove a bookmark
    func removeBookmark(_ bookmark: Bookmark) {
        bookmarks.removeAll { $0.id == bookmark.id }
        saveBookmarks()
    }

    /// Remove bookmark by position
    func removeBookmark(bookType: String, bookId: Int, href: String) {
        bookmarks.removeAll { $0.bookType == bookType && $0.bookId == bookId && $0.href == href }
        saveBookmarks()
    }

    /// Toggle bookmark for a position
    func toggleBookmark(bookType: String, bookId: Int, href: String, bookmark: Bookmark?) -> Bool {
        if isBookmarked(bookType: bookType, bookId: bookId, href: href) {
            removeBookmark(bookType: bookType, bookId: bookId, href: href)
            return false
        } else if let bookmark = bookmark {
            addBookmark(bookmark)
            return true
        }
        return false
    }

    // MARK: - Private Methods

    private func loadBookmarks() {
        guard let data = UserDefaults.standard.data(forKey: storageKey),
              let decoded = try? JSONDecoder().decode([Bookmark].self, from: data) else {
            return
        }
        bookmarks = decoded
    }

    private func saveBookmarks() {
        guard let encoded = try? JSONEncoder().encode(bookmarks) else {
            return
        }
        UserDefaults.standard.set(encoded, forKey: storageKey)
    }
}
