# iOS Book Local Cache Technical Specification

## 1. Overview

### 1.1 Objectives
Implement local caching functionality for book files to support offline reading, reduce repeated downloads, and improve user experience.

### 1.2 Scope
- Ebooks (EPUB/PDF)
- Magazines (PDF)
- Excluded: Physical books (no download required)

### 1.3 Core Requirements
| Requirement | Priority | Description |
|-------------|----------|-------------|
| Auto Cache | P0 | Automatically download and cache when reading |
| Offline Reading | P0 | Read cached books without network |
| Manual Download | P1 | User-initiated book download |
| Cache Management | P1 | View/delete cached books |
| Storage Management | P2 | Display storage usage, support batch cleanup |
| Download Queue | P2 | Support queued downloads for multiple books |

---

## 2. Technical Architecture

### 2.1 Overall Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      UI Layer                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐      │
│  │ BookDetail  │  │ MyBookshelf │  │ DownloadManager │      │
│  │    View     │  │    View     │  │      View       │      │
│  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘      │
└─────────┼────────────────┼──────────────────┼───────────────┘
          │                │                  │
          ▼                ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                              │
│  ┌──────────────────────────────────────────────────┐       │
│  │              BookCacheManager                     │       │
│  │  - downloadBook()    - getCachedBook()           │       │
│  │  - deleteCache()     - getCacheStatus()          │       │
│  │  - getTotalCacheSize()                           │       │
│  └──────────────────────────────────────────────────┘       │
│                          │                                   │
│           ┌──────────────┼──────────────┐                   │
│           ▼              ▼              ▼                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │DownloadTask │  │ CacheStore  │  │ MetadataDB  │         │
│  │   Manager   │  │  (Files)    │  │ (UserDef/   │         │
│  │             │  │             │  │  SQLite)    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Storage Layer                              │
│  ┌──────────────────────────────────────────────────┐       │
│  │           App Documents/Library/Caches            │       │
│  │  /BookCache/ebooks/{id}.epub                     │       │
│  │  /BookCache/ebooks/{id}.pdf                      │       │
│  │  /BookCache/magazines/{id}.pdf                   │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Storage Location Selection

| Location | Pros | Cons | Conclusion |
|----------|------|------|------------|
| Documents | User visible, iCloud backup | Uses backup space | Not recommended |
| Library/Caches | System can clean, no backup | May be cleared by system | **Recommended** |
| Library/Application Support | Won't be cleared, no backup | Requires manual management | Alternative |

**Recommended Approach**: Use `Library/Caches/BookCache/` directory
- System can automatically clean when storage is low
- Doesn't use iCloud backup space
- User can manually clear in settings

---

## 3. Data Models

### 3.1 Cache Metadata Model

```swift
/// Metadata for cached book
struct CachedBookMetadata: Codable, Identifiable {
    let id: String                    // "{type}-{bookId}" e.g. "ebook-123"
    let bookType: BookType            // .ebook / .magazine
    let bookId: Int
    let title: String
    let coverUrl: String?
    let fileUrl: String               // Original download URL
    let localPath: String             // Local relative path
    let fileSize: Int64               // File size (bytes)
    let downloadedAt: Date            // Download time
    let lastAccessedAt: Date          // Last access time
    let checksum: String?             // MD5/SHA256 checksum (optional)

    enum BookType: String, Codable {
        case ebook
        case magazine
    }
}

/// Download task status
enum DownloadStatus: Equatable {
    case idle
    case pending
    case downloading(progress: Double)
    case paused
    case completed
    case failed(error: String)
}

/// Download task
struct DownloadTask: Identifiable {
    let id: String
    let metadata: CachedBookMetadata
    var status: DownloadStatus
    var progress: Double
    var downloadedBytes: Int64
    var totalBytes: Int64
}
```

### 3.2 Cache Status Enum

```swift
/// Book cache status
enum BookCacheStatus {
    case notCached                    // Not cached
    case downloading(progress: Double) // Downloading
    case cached(size: Int64, date: Date) // Cached
    case outdated                     // Cache outdated (server has update)
}
```

---

## 4. Core Component Design

### 4.1 BookCacheManager

```swift
/// Book cache manager - Singleton pattern
@MainActor
class BookCacheManager: ObservableObject {
    static let shared = BookCacheManager()

    // MARK: - Published Properties
    @Published private(set) var activeDownloads: [DownloadTask] = []
    @Published private(set) var totalCacheSize: Int64 = 0

    // MARK: - Cache Directory
    private let cacheDirectory: URL

    // MARK: - Public Methods

    /// Get book cache status
    func getCacheStatus(bookType: BookType, bookId: Int) -> BookCacheStatus

    /// Get cached file path (if cached)
    func getCachedFilePath(bookType: BookType, bookId: Int) -> URL?

    /// Download and cache book
    func downloadBook(bookType: BookType, bookId: Int,
                      fileUrl: String, title: String, coverUrl: String?) async throws

    /// Cancel download
    func cancelDownload(bookType: BookType, bookId: Int)

    /// Delete single book cache
    func deleteCache(bookType: BookType, bookId: Int) throws

    /// Clear all cache
    func clearAllCache() throws

    /// Get all cached books
    func getAllCachedBooks() -> [CachedBookMetadata]

    /// Get total cache size
    func calculateTotalCacheSize() -> Int64

    /// Update last accessed time
    func updateLastAccessed(bookType: BookType, bookId: Int)
}
```

### 4.2 Storage Structure

```
Library/Caches/BookCache/
├── metadata.json              # Cache metadata index
├── ebooks/
│   ├── 123.epub
│   ├── 124.pdf
│   └── 125.epub
└── magazines/
    ├── 456.pdf
    └── 457.pdf
```

### 4.3 Metadata Storage Options

**Option A: JSON File (Recommended initially)**
- Simple to implement
- Suitable for cache count < 1000

**Option B: SQLite/Core Data (Scalable approach)**
- Suitable for large caches
- Supports complex queries

Initially adopt **Option A**, can migrate to Option B later.

---

## 5. Download Flow

### 5.1 Download Flow Diagram

```
User clicks download/open book
         │
         ▼
    Check cache status
         │
    ┌────┴────┐
    │         │
 Cached    Not cached
    │         │
    ▼         ▼
 Return     Start
  local    download
  path        │
              ▼
         Create download task
              │
              ▼
         Add to queue
              │
              ▼
         URLSession
         download file
              │
         ┌────┴────┐
         │         │
      Success    Failed
         │         │
         ▼         ▼
    Save to     Mark as
    cache       failed
    Update      Can retry
    metadata
         │
         ▼
    Notify UI update
```

### 5.2 Download Implementation

```swift
/// Using URLSession for download
func downloadBook(...) async throws {
    // 1. Check if already cached
    if let cached = getCachedFilePath(...) {
        return cached
    }

    // 2. Create download task
    let task = DownloadTask(...)
    activeDownloads.append(task)

    // 3. Use URLSession downloadTask
    let (tempURL, response) = try await URLSession.shared.download(from: url)

    // 4. Validate response
    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode == 200 else {
        throw CacheError.downloadFailed
    }

    // 5. Move to cache directory
    let destinationURL = cacheDirectory
        .appendingPathComponent(bookType.rawValue)
        .appendingPathComponent("\(bookId).\(fileExtension)")

    try FileManager.default.moveItem(at: tempURL, to: destinationURL)

    // 6. Save metadata
    saveMetadata(...)

    // 7. Update status
    updateDownloadStatus(...)
}
```

### 5.3 Background Download Support (Optional Extension)

```swift
// Using URLSessionConfiguration.background
let config = URLSessionConfiguration.background(
    withIdentifier: "com.booklibrio.download"
)
let session = URLSession(configuration: config, delegate: self, delegateQueue: nil)
```

---

## 6. UI Integration

### 6.1 Book Detail Page

```swift
// BookDetailView.swift modification

struct BookDetailView: View {
    @StateObject private var cacheManager = BookCacheManager.shared

    var cacheStatus: BookCacheStatus {
        cacheManager.getCacheStatus(bookType: bookType, bookId: bookId)
    }

    var body: some View {
        // ... existing content ...

        // Download button
        switch cacheStatus {
        case .notCached:
            Button("Download") {
                Task { await downloadBook() }
            }
        case .downloading(let progress):
            ProgressView(value: progress)
            Button("Cancel") { cancelDownload() }
        case .cached(let size, _):
            HStack {
                Image(systemName: "checkmark.circle.fill")
                Text("Downloaded (\(formatSize(size)))")
            }
            Button("Delete") { deleteCache() }
        }
    }
}
```

### 6.2 Download Manager Page

```swift
/// New: Download management view
struct DownloadManagerView: View {
    @StateObject private var cacheManager = BookCacheManager.shared

    var body: some View {
        List {
            // Downloading
            Section("Downloading") {
                ForEach(cacheManager.activeDownloads) { task in
                    DownloadTaskRow(task: task)
                }
            }

            // Downloaded
            Section("Downloaded (\(formatSize(cacheManager.totalCacheSize)))") {
                ForEach(cacheManager.getAllCachedBooks()) { book in
                    CachedBookRow(book: book)
                }
            }
        }
        .navigationTitle("Download Manager")
        .toolbar {
            Button("Clear All") {
                try? cacheManager.clearAllCache()
            }
        }
    }
}
```

### 6.3 Bookshelf View Integration

Display cache status icon in `MyBookshelfView`:

```swift
// Show cache status at bottom-right of book cover
ZStack(alignment: .bottomTrailing) {
    BookCoverView(...)

    // Cache status indicator
    if case .cached = cacheStatus {
        Image(systemName: "arrow.down.circle.fill")
            .foregroundColor(.green)
            .background(Circle().fill(.white))
    }
}
```

---

## 7. Reader Integration

### 7.1 Modify ReaderContainerView

```swift
// ReaderContainerView.swift

func loadBook() async {
    // 1. Check local cache
    if let cachedPath = BookCacheManager.shared.getCachedFilePath(
        bookType: bookType,
        bookId: bookId
    ) {
        // Use local file
        self.localFileURL = cachedPath
        BookCacheManager.shared.updateLastAccessed(bookType: bookType, bookId: bookId)
        return
    }

    // 2. No cache - download file
    do {
        try await BookCacheManager.shared.downloadBook(
            bookType: bookType,
            bookId: bookId,
            fileUrl: book.fileUrl,
            title: book.title,
            coverUrl: book.coverUrl
        )
        self.localFileURL = BookCacheManager.shared.getCachedFilePath(
            bookType: bookType,
            bookId: bookId
        )
    } catch {
        // Handle error
        self.error = error
    }
}
```

---

## 8. Error Handling

### 8.1 Error Types

```swift
enum BookCacheError: LocalizedError {
    case downloadFailed(underlying: Error)
    case insufficientStorage
    case fileCorrupted
    case networkUnavailable
    case cacheDirectoryNotFound

    var errorDescription: String? {
        switch self {
        case .downloadFailed(let error):
            return "Download failed: \(error.localizedDescription)"
        case .insufficientStorage:
            return "Insufficient storage"
        case .fileCorrupted:
            return "File corrupted, please re-download"
        case .networkUnavailable:
            return "Network unavailable"
        case .cacheDirectoryNotFound:
            return "Cache directory not found"
        }
    }
}
```

### 8.2 Retry Mechanism

```swift
/// Auto-retry download
func downloadWithRetry(maxAttempts: Int = 3) async throws {
    var lastError: Error?

    for attempt in 1...maxAttempts {
        do {
            try await downloadBook(...)
            return
        } catch {
            lastError = error
            if attempt < maxAttempts {
                try await Task.sleep(nanoseconds: UInt64(attempt) * 1_000_000_000)
            }
        }
    }

    throw BookCacheError.downloadFailed(underlying: lastError!)
}
```

---

## 9. Storage Space Management

### 9.1 Space Check

```swift
/// Check available storage space
func checkAvailableStorage() -> Int64 {
    let fileManager = FileManager.default
    do {
        let attributes = try fileManager.attributesOfFileSystem(
            forPath: NSHomeDirectory()
        )
        return attributes[.systemFreeSize] as? Int64 ?? 0
    } catch {
        return 0
    }
}

/// Check space before download
func canDownload(fileSize: Int64) -> Bool {
    let available = checkAvailableStorage()
    let buffer: Int64 = 100 * 1024 * 1024 // Reserve 100MB
    return available - fileSize > buffer
}
```

### 9.2 Auto Cleanup Strategy (LRU)

```swift
/// Clean least recently accessed cache when space is low
func cleanupIfNeeded(requiredSpace: Int64) throws {
    let available = checkAvailableStorage()

    guard available < requiredSpace else { return }

    // Sort by last accessed time
    var cachedBooks = getAllCachedBooks()
        .sorted { $0.lastAccessedAt < $1.lastAccessedAt }

    var freedSpace: Int64 = 0

    while freedSpace < (requiredSpace - available) && !cachedBooks.isEmpty {
        let oldest = cachedBooks.removeFirst()
        try deleteCache(bookType: oldest.bookType, bookId: oldest.bookId)
        freedSpace += oldest.fileSize
    }
}
```

---

## 10. Settings Page Integration

```swift
// SettingsView.swift addition

Section("Storage") {
    NavigationLink {
        DownloadManagerView()
    } label: {
        HStack {
            Label("Download Manager", systemImage: "arrow.down.circle")
            Spacer()
            Text(formatSize(BookCacheManager.shared.totalCacheSize))
                .foregroundColor(.secondary)
        }
    }

    Button(role: .destructive) {
        showClearCacheAlert = true
    } label: {
        Label("Clear All Cache", systemImage: "trash")
    }
}
```

---

## 11. Localization

```swift
// Localizable.strings (English)
"cache.download" = "Download";
"cache.downloading" = "Downloading...";
"cache.downloaded" = "Downloaded";
"cache.delete" = "Delete Download";
"cache.clear_all" = "Clear All Downloads";
"cache.storage_used" = "Storage Used";
"cache.download_failed" = "Download Failed";
"cache.insufficient_storage" = "Insufficient Storage";

// Localizable.strings (Chinese)
"cache.download" = "下载";
"cache.downloading" = "下载中...";
"cache.downloaded" = "已下载";
"cache.delete" = "删除下载";
"cache.clear_all" = "清空所有下载";
"cache.storage_used" = "已使用空间";
"cache.download_failed" = "下载失败";
"cache.insufficient_storage" = "存储空间不足";
```

---

## 12. Test Plan

### 12.1 Unit Tests

| Test Item | Description |
|-----------|-------------|
| Download Success | Verify file correctly saved to cache directory |
| Metadata Save | Verify metadata correctly recorded |
| Cache Read | Verify can correctly get cached file path |
| Cache Delete | Verify single delete and clear all |
| Size Calculation | Verify cache size calculation accuracy |

### 12.2 Integration Tests

| Test Item | Description |
|-----------|-------------|
| Offline Reading | Can open cached books when offline |
| Download Progress | UI correctly displays download progress |
| Resume Download | Can continue download after network interruption (optional) |
| Concurrent Download | Multiple books download simultaneously works correctly |

---

## 13. Implementation Plan

### Phase 1: Basic Functionality (MVP)
- [ ] BookCacheManager core implementation
- [ ] Auto cache (download when opening)
- [ ] Offline reading support
- [ ] Basic UI (cache status display)

### Phase 2: Management Features
- [ ] Download manager page
- [ ] Manual download/delete
- [ ] Storage space display
- [ ] Settings page integration

### Phase 3: Enhanced Features (Optional)
- [ ] Background download
- [ ] Download queue management
- [ ] Auto cleanup strategy
- [ ] Download progress notifications

---

## 14. Risks and Considerations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Excessive storage usage | User device runs out of space | Provide cleanup feature, display storage usage |
| System clears cache | User needs to re-download | Use Application Support or notify user |
| Large file download failure | Poor user experience | Resume download, retry mechanism |
| Corrupted cache file | Cannot read | Verify file integrity, support re-download |

---

## 15. Related Files

Files to modify/create during implementation:

**New Files:**
- `BookLibrio/Services/BookCacheManager.swift`
- `BookLibrio/Views/Settings/DownloadManagerView.swift`
- `BookLibrio/Models/CachedBookMetadata.swift`

**Modified Files:**
- `BookLibrio/Views/BookDetail/BookDetailView.swift` - Add download button
- `BookLibrio/Views/Reader/ReaderContainerView.swift` - Integrate cache reading
- `BookLibrio/Views/Profile/MyBookshelfView.swift` - Display cache status
- `BookLibrio/Views/Profile/SettingsView.swift` - Add storage management entry
- `BookLibrio/Utilities/L10n.swift` - Add localization keys
- `BookLibrio/Resources/*/Localizable.strings` - Add translations

---

*Document Version: 1.0*
*Created: 2024-12-14*
*Author: Claude Code*
