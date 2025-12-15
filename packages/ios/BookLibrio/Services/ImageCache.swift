import SwiftUI
import CryptoKit

/// Persistent image cache for offline support
/// Caches cover images to disk with automatic cleanup
actor ImageCache {
    static let shared = ImageCache()

    private let fileManager = FileManager.default
    private let cacheDirectory: URL
    private let maxCacheSize: Int = 100 * 1024 * 1024  // 100MB max cache
    private let maxCacheAge: TimeInterval = 7 * 24 * 60 * 60  // 7 days

    // In-memory cache for fast access
    private var memoryCache = NSCache<NSString, UIImage>()

    private init() {
        let paths = fileManager.urls(for: .cachesDirectory, in: .userDomainMask)
        cacheDirectory = paths[0].appendingPathComponent("ImageCache", isDirectory: true)

        // Create cache directory if needed
        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)

        // Configure memory cache
        memoryCache.countLimit = 100  // Max 100 images in memory
        memoryCache.totalCostLimit = 50 * 1024 * 1024  // 50MB memory limit

        // Clean old cache on startup
        Task {
            await cleanExpiredCache()
        }
    }

    // MARK: - Public API

    /// Get image from cache (memory first, then disk)
    func image(for url: URL) -> UIImage? {
        let key = cacheKey(for: url)

        // Check memory cache first
        if let cached = memoryCache.object(forKey: key as NSString) {
            return cached
        }

        // Check disk cache
        let filePath = cacheFilePath(for: key)
        guard fileManager.fileExists(atPath: filePath.path),
              let data = try? Data(contentsOf: filePath),
              let image = UIImage(data: data) else {
            return nil
        }

        // Store in memory cache for faster future access
        memoryCache.setObject(image, forKey: key as NSString, cost: data.count)

        return image
    }

    /// Save image to cache (both memory and disk)
    func cache(image: UIImage, for url: URL) {
        let key = cacheKey(for: url)

        // Save to memory cache
        if let data = image.jpegData(compressionQuality: 0.8) {
            memoryCache.setObject(image, forKey: key as NSString, cost: data.count)

            // Save to disk cache
            let filePath = cacheFilePath(for: key)
            try? data.write(to: filePath)
        }
    }

    /// Check if image exists in cache
    func hasImage(for url: URL) -> Bool {
        let key = cacheKey(for: url)

        if memoryCache.object(forKey: key as NSString) != nil {
            return true
        }

        let filePath = cacheFilePath(for: key)
        return fileManager.fileExists(atPath: filePath.path)
    }

    /// Clear all cached images
    func clearCache() {
        memoryCache.removeAllObjects()
        try? fileManager.removeItem(at: cacheDirectory)
        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }

    /// Get current cache size in bytes
    func cacheSize() -> Int {
        guard let files = try? fileManager.contentsOfDirectory(at: cacheDirectory, includingPropertiesForKeys: [.fileSizeKey]) else {
            return 0
        }

        return files.reduce(0) { total, file in
            let size = (try? file.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
            return total + size
        }
    }

    // MARK: - Private Helpers

    /// Generate cache key from URL (SHA256 hash)
    private func cacheKey(for url: URL) -> String {
        let data = Data(url.absoluteString.utf8)
        let hash = SHA256.hash(data: data)
        return hash.compactMap { String(format: "%02x", $0) }.joined()
    }

    /// Get file path for cache key
    private func cacheFilePath(for key: String) -> URL {
        cacheDirectory.appendingPathComponent(key + ".jpg")
    }

    /// Remove expired cache entries
    private func cleanExpiredCache() {
        guard let files = try? fileManager.contentsOfDirectory(
            at: cacheDirectory,
            includingPropertiesForKeys: [.contentModificationDateKey, .fileSizeKey]
        ) else { return }

        let now = Date()
        var totalSize = 0
        var fileInfos: [(url: URL, date: Date, size: Int)] = []

        for file in files {
            guard let values = try? file.resourceValues(forKeys: [.contentModificationDateKey, .fileSizeKey]),
                  let modDate = values.contentModificationDate,
                  let size = values.fileSize else { continue }

            // Remove files older than maxCacheAge
            if now.timeIntervalSince(modDate) > maxCacheAge {
                try? fileManager.removeItem(at: file)
            } else {
                fileInfos.append((file, modDate, size))
                totalSize += size
            }
        }

        // If still over size limit, remove oldest files
        if totalSize > maxCacheSize {
            let sorted = fileInfos.sorted { $0.date < $1.date }
            for info in sorted {
                if totalSize <= maxCacheSize { break }
                try? fileManager.removeItem(at: info.url)
                totalSize -= info.size
            }
        }
    }
}
