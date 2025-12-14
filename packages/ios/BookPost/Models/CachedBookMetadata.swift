import Foundation

// MARK: - Cached Book Metadata

/// Metadata for a cached book file
struct CachedBookMetadata: Codable, Identifiable {
    let id: String                    // "{type}-{bookId}" e.g. "ebook-123"
    let bookType: CachedBookType
    let bookId: Int
    let title: String
    let coverUrl: String?
    let fileUrl: String               // Original download URL
    let localPath: String             // Local relative path from cache directory
    let fileSize: Int64               // File size in bytes
    let fileExtension: String         // "epub" or "pdf"
    let downloadedAt: Date
    var lastAccessedAt: Date

    enum CachedBookType: String, Codable {
        case ebook
        case magazine
    }

    init(bookType: CachedBookType, bookId: Int, title: String, coverUrl: String?,
         fileUrl: String, localPath: String, fileSize: Int64, fileExtension: String) {
        self.id = "\(bookType.rawValue)-\(bookId)"
        self.bookType = bookType
        self.bookId = bookId
        self.title = title
        self.coverUrl = coverUrl
        self.fileUrl = fileUrl
        self.localPath = localPath
        self.fileSize = fileSize
        self.fileExtension = fileExtension
        self.downloadedAt = Date()
        self.lastAccessedAt = Date()
    }
}

// MARK: - Download Status

/// Status of a download task
enum DownloadStatus: Equatable {
    case idle
    case pending
    case downloading(progress: Double)
    case completed
    case failed(error: String)

    static func == (lhs: DownloadStatus, rhs: DownloadStatus) -> Bool {
        switch (lhs, rhs) {
        case (.idle, .idle), (.pending, .pending), (.completed, .completed):
            return true
        case (.downloading(let p1), .downloading(let p2)):
            return p1 == p2
        case (.failed(let e1), .failed(let e2)):
            return e1 == e2
        default:
            return false
        }
    }
}

// MARK: - Download Task

/// Represents an active download task
struct DownloadTask: Identifiable {
    let id: String
    let bookType: CachedBookMetadata.CachedBookType
    let bookId: Int
    let title: String
    let coverUrl: String?
    let fileUrl: String
    var status: DownloadStatus
    var progress: Double
    var downloadedBytes: Int64
    var totalBytes: Int64

    init(bookType: CachedBookMetadata.CachedBookType, bookId: Int, title: String,
         coverUrl: String?, fileUrl: String) {
        self.id = "\(bookType.rawValue)-\(bookId)"
        self.bookType = bookType
        self.bookId = bookId
        self.title = title
        self.coverUrl = coverUrl
        self.fileUrl = fileUrl
        self.status = .pending
        self.progress = 0
        self.downloadedBytes = 0
        self.totalBytes = 0
    }
}

// MARK: - Book Cache Status

/// Cache status for a book
enum BookCacheStatus: Equatable {
    case notCached
    case downloading(progress: Double)
    case cached(size: Int64, date: Date)

    static func == (lhs: BookCacheStatus, rhs: BookCacheStatus) -> Bool {
        switch (lhs, rhs) {
        case (.notCached, .notCached):
            return true
        case (.downloading(let p1), .downloading(let p2)):
            return p1 == p2
        case (.cached(let s1, let d1), .cached(let s2, let d2)):
            return s1 == s2 && d1 == d2
        default:
            return false
        }
    }
}

// MARK: - Book Cache Error

/// Errors that can occur during caching operations
enum BookCacheError: LocalizedError {
    case downloadFailed(underlying: Error)
    case insufficientStorage
    case fileCorrupted
    case networkUnavailable
    case cacheDirectoryNotFound
    case invalidFileUrl
    case cancelled

    var errorDescription: String? {
        switch self {
        case .downloadFailed(let error):
            return "Download failed: \(error.localizedDescription)"
        case .insufficientStorage:
            return "Insufficient storage space"
        case .fileCorrupted:
            return "File corrupted, please re-download"
        case .networkUnavailable:
            return "Network unavailable"
        case .cacheDirectoryNotFound:
            return "Cache directory not found"
        case .invalidFileUrl:
            return "Invalid file URL"
        case .cancelled:
            return "Download cancelled"
        }
    }
}

// MARK: - Cache Metadata Store

/// Stores and manages cache metadata
struct CacheMetadataStore: Codable {
    var books: [String: CachedBookMetadata]
    var lastUpdated: Date

    init() {
        self.books = [:]
        self.lastUpdated = Date()
    }
}
