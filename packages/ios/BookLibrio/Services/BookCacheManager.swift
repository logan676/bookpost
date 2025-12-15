import Foundation
import SwiftUI

/// Manages book file caching for offline reading
@MainActor
class BookCacheManager: ObservableObject {
    static let shared = BookCacheManager()

    // MARK: - Published Properties

    @Published private(set) var activeDownloads: [DownloadTask] = []
    @Published private(set) var totalCacheSize: Int64 = 0
    @Published private(set) var cachedBooksCount: Int = 0

    // MARK: - Private Properties

    private let fileManager = FileManager.default
    private let cacheDirectoryName = "BookCache"
    private let metadataFileName = "metadata.json"
    private var metadataStore: CacheMetadataStore
    private var downloadTasks: [String: URLSessionDownloadTask] = [:]
    private var downloadContinuations: [String: CheckedContinuation<URL, Error>] = [:]

    // Lazy session for background downloads
    private lazy var downloadSession: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 60
        config.timeoutIntervalForResource = 300
        return URLSession(configuration: config, delegate: nil, delegateQueue: .main)
    }()

    // MARK: - Cache Directory

    private var cacheDirectory: URL {
        let cachesDir = fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first!
        return cachesDir.appendingPathComponent(cacheDirectoryName)
    }

    private var metadataFileURL: URL {
        cacheDirectory.appendingPathComponent(metadataFileName)
    }

    // MARK: - Initialization

    private init() {
        self.metadataStore = CacheMetadataStore()
        setupCacheDirectory()
        loadMetadata()
        updateCacheStats()
    }

    // MARK: - Setup

    private func setupCacheDirectory() {
        let ebooksDir = cacheDirectory.appendingPathComponent("ebooks")
        let magazinesDir = cacheDirectory.appendingPathComponent("magazines")

        do {
            try fileManager.createDirectory(at: ebooksDir, withIntermediateDirectories: true)
            try fileManager.createDirectory(at: magazinesDir, withIntermediateDirectories: true)
            Log.i("Cache directories created/verified")
        } catch {
            Log.e("Failed to create cache directories", error: error)
        }
    }

    // MARK: - Metadata Management

    private func loadMetadata() {
        guard fileManager.fileExists(atPath: metadataFileURL.path) else {
            Log.i("No existing cache metadata found")
            return
        }

        do {
            let data = try Data(contentsOf: metadataFileURL)
            metadataStore = try JSONDecoder().decode(CacheMetadataStore.self, from: data)
            Log.i("Loaded cache metadata with \(metadataStore.books.count) entries")

            // Validate cached files still exist
            validateCachedFiles()
        } catch {
            Log.e("Failed to load cache metadata", error: error)
            metadataStore = CacheMetadataStore()
        }
    }

    private func saveMetadata() {
        metadataStore.lastUpdated = Date()

        do {
            let data = try JSONEncoder().encode(metadataStore)
            try data.write(to: metadataFileURL)
            Log.i("Saved cache metadata")
        } catch {
            Log.e("Failed to save cache metadata", error: error)
        }
    }

    private func validateCachedFiles() {
        var invalidIds: [String] = []

        for (id, metadata) in metadataStore.books {
            let filePath = cacheDirectory.appendingPathComponent(metadata.localPath)
            if !fileManager.fileExists(atPath: filePath.path) {
                invalidIds.append(id)
                Log.w("Cached file missing: \(metadata.localPath)")
            }
        }

        // Remove invalid entries
        for id in invalidIds {
            metadataStore.books.removeValue(forKey: id)
        }

        if !invalidIds.isEmpty {
            saveMetadata()
        }
    }

    // MARK: - Public Methods

    /// Get cache status for a book
    func getCacheStatus(bookType: CachedBookMetadata.CachedBookType, bookId: Int) -> BookCacheStatus {
        let id = "\(bookType.rawValue)-\(bookId)"

        // Check if currently downloading
        if let task = activeDownloads.first(where: { $0.id == id }) {
            return .downloading(progress: task.progress)
        }

        // Check if cached
        if let metadata = metadataStore.books[id] {
            return .cached(size: metadata.fileSize, date: metadata.downloadedAt)
        }

        return .notCached
    }

    /// Get cached file path if exists
    func getCachedFilePath(bookType: CachedBookMetadata.CachedBookType, bookId: Int) -> URL? {
        let id = "\(bookType.rawValue)-\(bookId)"

        guard let metadata = metadataStore.books[id] else {
            return nil
        }

        let filePath = cacheDirectory.appendingPathComponent(metadata.localPath)

        guard fileManager.fileExists(atPath: filePath.path) else {
            // File missing, remove from metadata
            metadataStore.books.removeValue(forKey: id)
            saveMetadata()
            updateCacheStats()
            return nil
        }

        return filePath
    }

    /// Update last accessed time for a cached book
    func updateLastAccessed(bookType: CachedBookMetadata.CachedBookType, bookId: Int) {
        let id = "\(bookType.rawValue)-\(bookId)"

        guard var metadata = metadataStore.books[id] else { return }

        metadata.lastAccessedAt = Date()
        metadataStore.books[id] = metadata
        saveMetadata()
    }

    /// Download and cache a book
    func downloadBook(
        bookType: CachedBookMetadata.CachedBookType,
        bookId: Int,
        fileUrl: String,
        title: String,
        coverUrl: String?
    ) async throws -> URL {
        let id = "\(bookType.rawValue)-\(bookId)"

        // Check if already cached
        if let cachedPath = getCachedFilePath(bookType: bookType, bookId: bookId) {
            updateLastAccessed(bookType: bookType, bookId: bookId)
            return cachedPath
        }

        // Check if already downloading
        if activeDownloads.contains(where: { $0.id == id }) {
            throw BookCacheError.downloadFailed(underlying: NSError(
                domain: "BookCache",
                code: -1,
                userInfo: [NSLocalizedDescriptionKey: "Download already in progress"]
            ))
        }

        // Validate URL
        guard let url = URL(string: fileUrl) else {
            throw BookCacheError.invalidFileUrl
        }

        // Determine file extension from URL or default based on book type
        // Note: API URLs like /api/ebooks/123/file don't have extensions
        var fileExtension = url.pathExtension.lowercased()
        if fileExtension.isEmpty || !["epub", "pdf"].contains(fileExtension) {
            // Default extension based on book type
            fileExtension = bookType == .magazine ? "pdf" : "epub"
            Log.i("URL has no extension, defaulting to: \(fileExtension)")
        }

        // Create download task
        var task = DownloadTask(
            bookType: bookType,
            bookId: bookId,
            title: title,
            coverUrl: coverUrl,
            fileUrl: fileUrl
        )
        task.status = .downloading(progress: 0)
        activeDownloads.append(task)

        do {
            // Download file
            let localURL = try await downloadFile(url: url, taskId: id)

            // Get file size
            let attributes = try fileManager.attributesOfItem(atPath: localURL.path)
            let fileSize = attributes[.size] as? Int64 ?? 0

            // Determine destination path
            let subdir = bookType.rawValue + "s" // "ebooks" or "magazines"
            let localPath = "\(subdir)/\(bookId).\(fileExtension)"
            let destinationURL = cacheDirectory.appendingPathComponent(localPath)

            // Move file to cache directory
            if fileManager.fileExists(atPath: destinationURL.path) {
                try fileManager.removeItem(at: destinationURL)
            }
            try fileManager.moveItem(at: localURL, to: destinationURL)

            // Save metadata
            let metadata = CachedBookMetadata(
                bookType: bookType,
                bookId: bookId,
                title: title,
                coverUrl: coverUrl,
                fileUrl: fileUrl,
                localPath: localPath,
                fileSize: fileSize,
                fileExtension: fileExtension
            )
            metadataStore.books[id] = metadata
            saveMetadata()

            // Update task status
            updateTaskStatus(id: id, status: .completed)
            removeTask(id: id)
            updateCacheStats()

            Log.i("Book cached successfully: \(title) (\(formatFileSize(fileSize)))")

            return destinationURL

        } catch {
            // Update task status
            updateTaskStatus(id: id, status: .failed(error: error.localizedDescription))
            removeTask(id: id)

            throw BookCacheError.downloadFailed(underlying: error)
        }
    }

    /// Cancel a download
    func cancelDownload(bookType: CachedBookMetadata.CachedBookType, bookId: Int) {
        let id = "\(bookType.rawValue)-\(bookId)"

        downloadTasks[id]?.cancel()
        downloadTasks.removeValue(forKey: id)

        if let continuation = downloadContinuations.removeValue(forKey: id) {
            continuation.resume(throwing: BookCacheError.cancelled)
        }

        removeTask(id: id)
    }

    /// Delete cache for a single book
    func deleteCache(bookType: CachedBookMetadata.CachedBookType, bookId: Int) throws {
        let id = "\(bookType.rawValue)-\(bookId)"

        guard let metadata = metadataStore.books[id] else {
            return
        }

        let filePath = cacheDirectory.appendingPathComponent(metadata.localPath)

        if fileManager.fileExists(atPath: filePath.path) {
            try fileManager.removeItem(at: filePath)
        }

        metadataStore.books.removeValue(forKey: id)
        saveMetadata()
        updateCacheStats()

        Log.i("Deleted cache for: \(metadata.title)")
    }

    /// Clear all cached books
    func clearAllCache() throws {
        // Remove all cached files
        let ebooksDir = cacheDirectory.appendingPathComponent("ebooks")
        let magazinesDir = cacheDirectory.appendingPathComponent("magazines")

        if fileManager.fileExists(atPath: ebooksDir.path) {
            try fileManager.removeItem(at: ebooksDir)
        }
        if fileManager.fileExists(atPath: magazinesDir.path) {
            try fileManager.removeItem(at: magazinesDir)
        }

        // Recreate directories
        setupCacheDirectory()

        // Clear metadata
        metadataStore.books.removeAll()
        saveMetadata()
        updateCacheStats()

        Log.i("Cleared all cache")
    }

    /// Get all cached books
    func getAllCachedBooks() -> [CachedBookMetadata] {
        return Array(metadataStore.books.values).sorted { $0.lastAccessedAt > $1.lastAccessedAt }
    }

    /// Get cached books by type
    func getCachedBooks(type: CachedBookMetadata.CachedBookType) -> [CachedBookMetadata] {
        return metadataStore.books.values
            .filter { $0.bookType == type }
            .sorted { $0.lastAccessedAt > $1.lastAccessedAt }
    }

    /// Calculate total cache size
    func calculateTotalCacheSize() -> Int64 {
        return metadataStore.books.values.reduce(0) { $0 + $1.fileSize }
    }

    /// Check available storage space
    func getAvailableStorage() -> Int64 {
        do {
            let attributes = try fileManager.attributesOfFileSystem(forPath: NSHomeDirectory())
            return attributes[.systemFreeSize] as? Int64 ?? 0
        } catch {
            return 0
        }
    }

    /// Check if there's enough space to download
    func canDownload(estimatedSize: Int64) -> Bool {
        let available = getAvailableStorage()
        let buffer: Int64 = 100 * 1024 * 1024 // Keep 100MB buffer
        return available - estimatedSize > buffer
    }

    /// Clean up least recently accessed caches to free space (LRU)
    func cleanupLRU(requiredSpace: Int64) throws {
        let available = getAvailableStorage()

        guard available < requiredSpace else { return }

        var cachedBooks = getAllCachedBooks().sorted { $0.lastAccessedAt < $1.lastAccessedAt }
        var freedSpace: Int64 = 0

        while freedSpace < (requiredSpace - available) && !cachedBooks.isEmpty {
            let oldest = cachedBooks.removeFirst()
            try deleteCache(bookType: oldest.bookType, bookId: oldest.bookId)
            freedSpace += oldest.fileSize
            Log.i("LRU cleanup: removed \(oldest.title)")
        }
    }

    // MARK: - Private Methods

    private func downloadFile(url: URL, taskId: String) async throws -> URL {
        return try await withCheckedThrowingContinuation { continuation in
            let task = downloadSession.downloadTask(with: url) { [weak self] tempURL, response, error in
                Task { @MainActor in
                    self?.downloadContinuations.removeValue(forKey: taskId)
                    self?.downloadTasks.removeValue(forKey: taskId)

                    if let error = error {
                        continuation.resume(throwing: error)
                        return
                    }

                    guard let httpResponse = response as? HTTPURLResponse,
                          (200...299).contains(httpResponse.statusCode) else {
                        continuation.resume(throwing: BookCacheError.downloadFailed(
                            underlying: NSError(
                                domain: "HTTP",
                                code: (response as? HTTPURLResponse)?.statusCode ?? -1,
                                userInfo: nil
                            )
                        ))
                        return
                    }

                    guard let tempURL = tempURL else {
                        continuation.resume(throwing: BookCacheError.downloadFailed(
                            underlying: NSError(domain: "Download", code: -1, userInfo: nil)
                        ))
                        return
                    }

                    // Move to a persistent temp location
                    let persistentTemp = FileManager.default.temporaryDirectory
                        .appendingPathComponent(UUID().uuidString)
                        .appendingPathExtension(url.pathExtension)

                    do {
                        try FileManager.default.moveItem(at: tempURL, to: persistentTemp)
                        continuation.resume(returning: persistentTemp)
                    } catch {
                        continuation.resume(throwing: error)
                    }
                }
            }

            downloadContinuations[taskId] = continuation
            downloadTasks[taskId] = task

            // Observe progress
            let observation = task.progress.observe(\.fractionCompleted) { [weak self] progress, _ in
                Task { @MainActor in
                    self?.updateTaskProgress(id: taskId, progress: progress.fractionCompleted)
                }
            }

            // Store observation to prevent deallocation (simplified - in production use proper storage)
            _ = observation

            task.resume()
        }
    }

    private func updateTaskProgress(id: String, progress: Double) {
        guard let index = activeDownloads.firstIndex(where: { $0.id == id }) else { return }
        activeDownloads[index].progress = progress
        activeDownloads[index].status = .downloading(progress: progress)
    }

    private func updateTaskStatus(id: String, status: DownloadStatus) {
        guard let index = activeDownloads.firstIndex(where: { $0.id == id }) else { return }
        activeDownloads[index].status = status
    }

    private func removeTask(id: String) {
        // Delay removal to allow UI to show completion
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
            self?.activeDownloads.removeAll { $0.id == id }
        }
    }

    private func updateCacheStats() {
        totalCacheSize = calculateTotalCacheSize()
        cachedBooksCount = metadataStore.books.count
    }

    // MARK: - Helpers

    private func formatFileSize(_ bytes: Int64) -> String {
        let formatter = ByteCountFormatter()
        formatter.countStyle = .file
        return formatter.string(fromByteCount: bytes)
    }
}

// MARK: - Convenience Extensions

extension BookCacheManager {
    /// Format file size for display
    static func formatSize(_ bytes: Int64) -> String {
        let formatter = ByteCountFormatter()
        formatter.countStyle = .file
        return formatter.string(fromByteCount: bytes)
    }
}
