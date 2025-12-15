import Foundation
import CryptoKit

/// Generic data cache entry with TTL support
struct CacheEntry<T: Codable>: Codable {
    let data: T
    let timestamp: Date
    let ttl: TimeInterval

    var isExpired: Bool {
        Date().timeIntervalSince(timestamp) > ttl
    }

    var remainingTime: TimeInterval {
        max(0, ttl - Date().timeIntervalSince(timestamp))
    }
}

/// Two-level data cache manager (memory + disk) for API responses
/// Uses actor for thread safety, following the same pattern as ImageCache
actor DataCacheManager {
    static let shared = DataCacheManager()

    // MARK: - Cache Duration Presets

    enum CacheDuration {
        /// 1 minute - for frequently changing data (e.g., reading history)
        static let short: TimeInterval = 60
        /// 5 minutes - for general data (e.g., bookshelf, store sections)
        static let medium: TimeInterval = 300
        /// 30 minutes - for stable data (e.g., book details)
        static let long: TimeInterval = 1800
        /// 24 hours - for rarely changing data (e.g., categories)
        static let veryLong: TimeInterval = 86400
    }

    // MARK: - Properties

    private let memoryCache = NSCache<NSString, AnyObject>()
    private let fileManager = FileManager.default
    private let cacheDirectory: URL
    private let maxDiskCacheSize: Int = 50 * 1024 * 1024  // 50MB

    // MARK: - Initialization

    private init() {
        let paths = fileManager.urls(for: .cachesDirectory, in: .userDomainMask)
        cacheDirectory = paths[0].appendingPathComponent("DataCache", isDirectory: true)

        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)

        // Configure memory cache
        memoryCache.countLimit = 100
        memoryCache.totalCostLimit = 20 * 1024 * 1024  // 20MB

        // Clean expired cache on startup
        Task {
            await cleanExpiredCache()
        }
    }

    // MARK: - Public API

    /// Get cached data (memory first, then disk)
    /// Returns nil if cache doesn't exist or is expired
    func get<T: Codable>(_ type: T.Type, forKey key: String) -> T? {
        let hashedKey = cacheKey(for: key)
        let typeName = String(describing: T.self)

        // 1. Check memory cache
        if let wrapper = memoryCache.object(forKey: hashedKey as NSString) as? CacheEntryWrapper<T> {
            if !wrapper.entry.isExpired {
                Log.d("[DataCache] ✅ Memory HIT for \(typeName) key=\(key.prefix(50))... remaining=\(Int(wrapper.entry.remainingTime))s")
                return wrapper.entry.data
            }
            // Remove expired entry
            Log.d("[DataCache] ⏰ Memory EXPIRED for \(typeName) key=\(key.prefix(50))...")
            memoryCache.removeObject(forKey: hashedKey as NSString)
        }

        // 2. Check disk cache
        let filePath = cacheFilePath(for: hashedKey)
        guard let data = try? Data(contentsOf: filePath),
              let entry = try? JSONDecoder().decode(CacheEntry<T>.self, from: data) else {
            Log.d("[DataCache] ❌ MISS for \(typeName) key=\(key.prefix(50))...")
            return nil
        }

        if entry.isExpired {
            Log.d("[DataCache] ⏰ Disk EXPIRED for \(typeName) key=\(key.prefix(50))...")
            try? fileManager.removeItem(at: filePath)
            return nil
        }

        // Load into memory cache for faster future access
        let wrapper = CacheEntryWrapper(entry: entry)
        let cost = data.count
        memoryCache.setObject(wrapper, forKey: hashedKey as NSString, cost: cost)

        Log.d("[DataCache] ✅ Disk HIT for \(typeName) key=\(key.prefix(50))... remaining=\(Int(entry.remainingTime))s")
        return entry.data
    }

    /// Get cached data even if expired (for offline fallback)
    func getStale<T: Codable>(_ type: T.Type, forKey key: String) -> T? {
        let hashedKey = cacheKey(for: key)

        // Check memory cache (ignore expiry)
        if let wrapper = memoryCache.object(forKey: hashedKey as NSString) as? CacheEntryWrapper<T> {
            return wrapper.entry.data
        }

        // Check disk cache (ignore expiry)
        let filePath = cacheFilePath(for: hashedKey)
        guard let data = try? Data(contentsOf: filePath),
              let entry = try? JSONDecoder().decode(CacheEntry<T>.self, from: data) else {
            return nil
        }

        return entry.data
    }

    /// Save data to cache (both memory and disk)
    func set<T: Codable>(_ value: T, forKey key: String, ttl: TimeInterval = CacheDuration.medium) {
        let hashedKey = cacheKey(for: key)
        let entry = CacheEntry(data: value, timestamp: Date(), ttl: ttl)
        let typeName = String(describing: T.self)

        // 1. Save to memory cache
        let wrapper = CacheEntryWrapper(entry: entry)
        if let data = try? JSONEncoder().encode(entry) {
            memoryCache.setObject(wrapper, forKey: hashedKey as NSString, cost: data.count)

            // 2. Save to disk cache
            let filePath = cacheFilePath(for: hashedKey)
            do {
                try data.write(to: filePath)
                Log.d("[DataCache] 💾 SAVED \(typeName) key=\(key.prefix(50))... ttl=\(Int(ttl))s size=\(data.count)bytes")
            } catch {
                Log.e("[DataCache] ❌ FAILED to save \(typeName): \(error.localizedDescription)")
            }
        } else {
            Log.e("[DataCache] ❌ FAILED to encode \(typeName)")
        }
    }

    /// Check if valid (non-expired) cache exists
    func has(forKey key: String) -> Bool {
        get(EmptyResponse.self, forKey: key) != nil
    }

    /// Remove specific cache entry
    func remove(forKey key: String) {
        let hashedKey = cacheKey(for: key)
        memoryCache.removeObject(forKey: hashedKey as NSString)

        let filePath = cacheFilePath(for: hashedKey)
        try? fileManager.removeItem(at: filePath)
    }

    /// Clear all data cache
    func clearAll() {
        memoryCache.removeAllObjects()
        try? fileManager.removeItem(at: cacheDirectory)
        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }

    /// Get current disk cache size in bytes
    func diskCacheSize() -> Int {
        guard let files = try? fileManager.contentsOfDirectory(
            at: cacheDirectory,
            includingPropertiesForKeys: [.fileSizeKey]
        ) else {
            return 0
        }

        return files.reduce(0) { total, file in
            let size = (try? file.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
            return total + size
        }
    }

    /// Clean expired cache entries
    func cleanExpiredCache() {
        guard let files = try? fileManager.contentsOfDirectory(
            at: cacheDirectory,
            includingPropertiesForKeys: [.contentModificationDateKey, .fileSizeKey]
        ) else { return }

        var totalSize = 0
        var validFiles: [(url: URL, date: Date, size: Int)] = []

        for file in files {
            // Try to read and check expiry
            if let data = try? Data(contentsOf: file),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let timestampString = json["timestamp"] as? String,
               let ttl = json["ttl"] as? TimeInterval {

                let formatter = ISO8601DateFormatter()
                formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                if let timestamp = formatter.date(from: timestampString) {
                    let age = Date().timeIntervalSince(timestamp)
                    if age > ttl {
                        // Expired, remove
                        try? fileManager.removeItem(at: file)
                        continue
                    }
                }
            }

            // Get file info for size management
            if let values = try? file.resourceValues(forKeys: [.contentModificationDateKey, .fileSizeKey]),
               let modDate = values.contentModificationDate,
               let size = values.fileSize {
                validFiles.append((file, modDate, size))
                totalSize += size
            }
        }

        // If over size limit, remove oldest files (LRU)
        if totalSize > maxDiskCacheSize {
            let sorted = validFiles.sorted { $0.date < $1.date }
            for info in sorted {
                if totalSize <= maxDiskCacheSize { break }
                try? fileManager.removeItem(at: info.url)
                totalSize -= info.size
            }
        }
    }

    // MARK: - Private Helpers

    /// Generate cache key using SHA256 hash
    private func cacheKey(for key: String) -> String {
        let data = Data(key.utf8)
        let hash = SHA256.hash(data: data)
        return hash.compactMap { String(format: "%02x", $0) }.joined()
    }

    /// Get file path for cache key
    private func cacheFilePath(for hashedKey: String) -> URL {
        cacheDirectory.appendingPathComponent(hashedKey + ".json")
    }
}

// MARK: - Helper Types

/// Wrapper class for storing value types in NSCache
private class CacheEntryWrapper<T: Codable>: NSObject {
    let entry: CacheEntry<T>

    init(entry: CacheEntry<T>) {
        self.entry = entry
    }
}

// Note: Uses EmptyResponse from ReadingHistory.swift for cache existence check
