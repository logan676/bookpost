# iOS 缓存优化方案

## 目录

1. [现状分析](#现状分析)
2. [优化目标](#优化目标)
3. [架构设计](#架构设计)
4. [实现方案](#实现方案)
5. [缓存策略](#缓存策略)
6. [实施计划](#实施计划)

---

## 现状分析

### 已有缓存机制

| 缓存类型 | 实现类 | 存储方式 | 过期策略 | 容量限制 |
|---------|--------|---------|---------|---------|
| 书籍文件 | `BookCacheManager` | 磁盘 (`~/Library/Caches/BookCache/`) | 无自动过期，LRU 清理 | 无硬性限制 |
| 封面图片 | `ImageCache` | 内存 + 磁盘 | 7 天过期 | 内存 50MB / 磁盘 100MB |
| 用户会话 | `AuthManager` | UserDefaults | 永久 | N/A |

### 缺失缓存的场景

| 场景 | 当前行为 | 用户体验问题 |
|-----|---------|-------------|
| 阅读历史 | 每次切换 Tab 重新请求 | 频繁 Loading，响应慢 |
| 书架数据 | 每次切换状态重新请求 | "最近打开"、"想读"、"在读" 切换慢 |
| 书籍详情 | 每次进入详情页重新请求 | 重复加载已看过的书籍信息 |
| 书籍列表 | 每次进入分类重新请求 | 分类页加载慢 |
| 笔记/高亮 | 每次打开阅读器重新请求 | 阅读器初始化慢 |
| **书城首页** | 每次进入书城并行请求 9 个接口 | 首页加载慢，流量消耗大 |

### 书城数据流分析

`StoreViewModel` 管理书城首页的 9 个数据流，每次进入书城 Tab 都会并行请求所有数据：

```
┌─────────────────────────────────────────────────────────────┐
│                    StoreViewModel                            │
├─────────────────────────────────────────────────────────────┤
│  recommendedBooks      ← getEbooks() + getMagazines()       │
│  newArrivals           ← getEbooks(limit: 10)               │
│  hotBooks              ← getMagazines(limit: 10)            │
│  topRanked             ← getEbooks() + getMagazines()       │
│  categories            ← getEbookCategories()               │
│  popularBookLists      ← getBookLists(sort: "popular")      │
│  freeBooks             ← getEbooks(limit: 8)                │
│  memberExclusiveBooks  ← getEbooks(limit: 10)               │
│  dailyBookLists        ← (本地生成)                          │
└─────────────────────────────────────────────────────────────┘
```

**问题**：
- 每次进入书城 Tab 触发 8+ 个网络请求
- 数据变化频率低，但请求频率高
- 无离线浏览能力

---

## 优化目标

1. **减少 API 请求频率** - 相同数据短时间内不重复请求
2. **提升页面响应速度** - 优先显示缓存数据，后台静默更新
3. **离线可用性** - 核心数据在无网络时仍可访问
4. **内存效率** - 合理的缓存淘汰策略，避免内存溢出

---

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      ViewModel Layer                         │
│  (HomeViewModel, BookshelfViewModel, BookDetailViewModel)   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    DataCacheManager                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ MemoryCache │  │  DiskCache  │  │ CacheInvalidation   │  │
│  │ (NSCache)   │  │  (FileManager)│ │ (TTL + Notification)│  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       APIClient                              │
│                   (Network Requests)                         │
└─────────────────────────────────────────────────────────────┘
```

### 缓存层级

```
请求数据
    │
    ▼
┌──────────────┐    命中
│  内存缓存    │ ─────────▶ 返回数据
│  (NSCache)   │
└──────────────┘
    │ 未命中
    ▼
┌──────────────┐    命中
│  磁盘缓存    │ ─────────▶ 加载到内存 ──▶ 返回数据
│  (FileManager)│
└──────────────┘
    │ 未命中
    ▼
┌──────────────┐
│  网络请求    │ ─────────▶ 写入缓存 ──▶ 返回数据
│  (APIClient) │
└──────────────┘
```

---

## 实现方案

### 1. 通用数据缓存管理器

```swift
// Services/DataCacheManager.swift

import Foundation

/// 缓存条目包装器
struct CacheEntry<T: Codable>: Codable {
    let data: T
    let timestamp: Date
    let ttl: TimeInterval // Time To Live (seconds)

    var isExpired: Bool {
        Date().timeIntervalSince(timestamp) > ttl
    }
}

/// 数据缓存管理器 - 两级缓存（内存 + 磁盘）
actor DataCacheManager {
    static let shared = DataCacheManager()

    // MARK: - Configuration

    /// 默认缓存时间
    enum CacheDuration {
        static let short: TimeInterval = 60          // 1 分钟 - 频繁变化的数据
        static let medium: TimeInterval = 300        // 5 分钟 - 一般数据
        static let long: TimeInterval = 1800         // 30 分钟 - 较稳定的数据
        static let veryLong: TimeInterval = 86400    // 24 小时 - 几乎不变的数据
    }

    // MARK: - Properties

    private let memoryCache = NSCache<NSString, AnyObject>()
    private let fileManager = FileManager.default
    private let cacheDirectory: URL
    private let maxDiskCacheSize: Int = 50 * 1024 * 1024 // 50MB

    // MARK: - Initialization

    private init() {
        let caches = fileManager.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        cacheDirectory = caches.appendingPathComponent("DataCache")

        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)

        // 配置内存缓存
        memoryCache.countLimit = 100
        memoryCache.totalCostLimit = 20 * 1024 * 1024 // 20MB
    }

    // MARK: - Public API

    /// 获取缓存数据（优先内存，其次磁盘）
    func get<T: Codable>(_ type: T.Type, forKey key: String) -> T? {
        // 1. 检查内存缓存
        if let entry = memoryCache.object(forKey: key as NSString) as? CacheEntryWrapper<T> {
            if !entry.value.isExpired {
                return entry.value.data
            }
            memoryCache.removeObject(forKey: key as NSString)
        }

        // 2. 检查磁盘缓存
        let fileURL = cacheDirectory.appendingPathComponent(key.md5Hash)
        guard let data = try? Data(contentsOf: fileURL),
              let entry = try? JSONDecoder().decode(CacheEntry<T>.self, from: data) else {
            return nil
        }

        if entry.isExpired {
            try? fileManager.removeItem(at: fileURL)
            return nil
        }

        // 加载到内存缓存
        let wrapper = CacheEntryWrapper(value: entry)
        memoryCache.setObject(wrapper, forKey: key as NSString)

        return entry.data
    }

    /// 保存数据到缓存（同时写入内存和磁盘）
    func set<T: Codable>(_ value: T, forKey key: String, ttl: TimeInterval = CacheDuration.medium) {
        let entry = CacheEntry(data: value, timestamp: Date(), ttl: ttl)

        // 1. 写入内存缓存
        let wrapper = CacheEntryWrapper(value: entry)
        memoryCache.setObject(wrapper, forKey: key as NSString)

        // 2. 写入磁盘缓存
        let fileURL = cacheDirectory.appendingPathComponent(key.md5Hash)
        if let data = try? JSONEncoder().encode(entry) {
            try? data.write(to: fileURL)
        }
    }

    /// 删除指定缓存
    func remove(forKey key: String) {
        memoryCache.removeObject(forKey: key as NSString)
        let fileURL = cacheDirectory.appendingPathComponent(key.md5Hash)
        try? fileManager.removeItem(at: fileURL)
    }

    /// 删除匹配前缀的所有缓存
    func removeAll(withPrefix prefix: String) {
        // 清理内存缓存需要遍历，NSCache 不支持前缀删除
        // 这里只清理磁盘缓存
        if let files = try? fileManager.contentsOfDirectory(at: cacheDirectory, includingPropertiesForKeys: nil) {
            for file in files {
                // 由于使用了 MD5 hash，需要维护一个映射表或重新设计 key 策略
                // 简化处理：删除所有相关缓存时调用 clearAll()
            }
        }
    }

    /// 清空所有缓存
    func clearAll() {
        memoryCache.removeAllObjects()
        try? fileManager.removeItem(at: cacheDirectory)
        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }

    /// 清理过期缓存
    func cleanExpiredCache() {
        guard let files = try? fileManager.contentsOfDirectory(at: cacheDirectory, includingPropertiesForKeys: [.contentModificationDateKey]) else {
            return
        }

        for file in files {
            if let data = try? Data(contentsOf: file),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let timestamp = json["timestamp"] as? TimeInterval,
               let ttl = json["ttl"] as? TimeInterval {
                let age = Date().timeIntervalSince1970 - timestamp
                if age > ttl {
                    try? fileManager.removeItem(at: file)
                }
            }
        }
    }
}

// MARK: - Helper Types

/// NSCache 需要类类型，用包装器包装值类型
private class CacheEntryWrapper<T: Codable>: NSObject {
    let value: CacheEntry<T>
    init(value: CacheEntry<T>) {
        self.value = value
    }
}

// MARK: - String Extension

extension String {
    var md5Hash: String {
        let data = Data(self.utf8)
        var hash = [UInt8](repeating: 0, count: Int(CC_MD5_DIGEST_LENGTH))
        data.withUnsafeBytes {
            _ = CC_MD5($0.baseAddress, CC_LONG(data.count), &hash)
        }
        return hash.map { String(format: "%02x", $0) }.joined()
    }
}

// 注意：需要在项目中导入 CommonCrypto
// 在 Bridging Header 中添加：#import <CommonCrypto/CommonCrypto.h>
// 或使用 CryptoKit 替代（iOS 13+）
```

### 2. 缓存 Key 管理

```swift
// Services/CacheKeys.swift

import Foundation

/// 统一管理缓存 Key，避免硬编码
enum CacheKeys {
    // MARK: - 阅读历史
    static func readingHistory(userId: String) -> String {
        "reading_history_\(userId)"
    }

    // MARK: - 书架
    static func bookshelf(userId: String, status: String) -> String {
        "bookshelf_\(userId)_\(status)"
    }

    static func bookshelfAll(userId: String) -> String {
        "bookshelf_\(userId)_all"
    }

    // MARK: - 书籍
    static func bookDetail(bookId: String) -> String {
        "book_detail_\(bookId)"
    }

    static func bookList(category: String, page: Int) -> String {
        "book_list_\(category)_page\(page)"
    }

    // MARK: - 笔记和高亮
    static func highlights(bookId: String, userId: String) -> String {
        "highlights_\(bookId)_\(userId)"
    }

    static func notes(bookId: String, userId: String) -> String {
        "notes_\(bookId)_\(userId)"
    }

    // MARK: - 书城首页
    static func storeRecommended() -> String {
        "store_recommended"
    }

    static func storeNewArrivals() -> String {
        "store_new_arrivals"
    }

    static func storeHotBooks() -> String {
        "store_hot_books"
    }

    static func storeTopRanked() -> String {
        "store_top_ranked"
    }

    static func storeFreeBooks() -> String {
        "store_free_books"
    }

    static func storeMemberExclusive() -> String {
        "store_member_exclusive"
    }

    static func storePopularLists() -> String {
        "store_popular_lists"
    }

    // MARK: - 其他
    static func categories() -> String {
        "book_categories"
    }

    static func userProfile(userId: String) -> String {
        "user_profile_\(userId)"
    }
}
```

### 3. APIClient 缓存扩展

```swift
// Services/APIClient+Caching.swift

import Foundation

extension APIClient {

    // MARK: - 阅读历史（带缓存）

    /// 获取阅读历史 - 优先返回缓存，后台静默更新
    func getReadingHistoryCached() async throws -> [ReadingHistoryItem] {
        guard let userId = AuthManager.shared.currentUser?.id else {
            throw APIError.unauthorized
        }

        let cacheKey = CacheKeys.readingHistory(userId: userId)
        let cache = DataCacheManager.shared

        // 尝试获取缓存
        if let cached: [ReadingHistoryItem] = await cache.get([ReadingHistoryItem].self, forKey: cacheKey) {
            // 后台静默更新
            Task {
                if let fresh = try? await self.getReadingHistory() {
                    await cache.set(fresh, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.short)
                }
            }
            return cached
        }

        // 无缓存，请求网络
        let result = try await getReadingHistory()
        await cache.set(result, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.short)
        return result
    }

    // MARK: - 书架数据（带缓存）

    /// 获取书架数据 - 支持按状态筛选
    func getBookshelfCached(status: String? = nil) async throws -> [BookshelfItem] {
        guard let userId = AuthManager.shared.currentUser?.id else {
            throw APIError.unauthorized
        }

        let cacheKey = CacheKeys.bookshelf(userId: userId, status: status ?? "all")
        let cache = DataCacheManager.shared

        // 尝试获取缓存
        if let cached: [BookshelfItem] = await cache.get([BookshelfItem].self, forKey: cacheKey) {
            // 后台静默更新
            Task {
                if let fresh = try? await self.getBookshelf(status: status) {
                    await cache.set(fresh, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.medium)
                }
            }
            return cached
        }

        // 无缓存，请求网络
        let result = try await getBookshelf(status: status)
        await cache.set(result, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.medium)
        return result
    }

    // MARK: - 书籍详情（带缓存）

    /// 获取书籍详情 - 较长缓存时间
    func getBookDetailCached(bookId: String) async throws -> Book {
        let cacheKey = CacheKeys.bookDetail(bookId: bookId)
        let cache = DataCacheManager.shared

        // 尝试获取缓存
        if let cached: Book = await cache.get(Book.self, forKey: cacheKey) {
            return cached
        }

        // 无缓存，请求网络
        let result = try await getBookDetail(bookId: bookId)
        await cache.set(result, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.long)
        return result
    }

    // MARK: - 缓存失效

    /// 书架数据变更时调用（添加/删除/更新状态）
    func invalidateBookshelfCache() async {
        guard let userId = AuthManager.shared.currentUser?.id else { return }

        let cache = DataCacheManager.shared
        // 清除所有书架相关缓存
        await cache.remove(forKey: CacheKeys.bookshelf(userId: userId, status: "all"))
        await cache.remove(forKey: CacheKeys.bookshelf(userId: userId, status: "reading"))
        await cache.remove(forKey: CacheKeys.bookshelf(userId: userId, status: "want_to_read"))
        await cache.remove(forKey: CacheKeys.bookshelf(userId: userId, status: "finished"))

        // 同时清除阅读历史缓存
        await cache.remove(forKey: CacheKeys.readingHistory(userId: userId))
    }

    /// 书籍详情变更时调用
    func invalidateBookDetailCache(bookId: String) async {
        let cache = DataCacheManager.shared
        await cache.remove(forKey: CacheKeys.bookDetail(bookId: bookId))
    }

    // MARK: - 书城首页数据（带缓存）

    /// 获取书城推荐 - SWR 策略
    func getStoreRecommendedCached() async throws -> [StoreItem] {
        let cacheKey = CacheKeys.storeRecommended()
        let cache = DataCacheManager.shared

        if let cached: [StoreItem] = await cache.get([StoreItem].self, forKey: cacheKey) {
            Task {
                if let fresh = try? await self.fetchStoreRecommended() {
                    await cache.set(fresh, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.medium)
                }
            }
            return cached
        }

        let result = try await fetchStoreRecommended()
        await cache.set(result, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.medium)
        return result
    }

    private func fetchStoreRecommended() async throws -> [StoreItem] {
        let ebooks = try await getEbooks(limit: 6)
        let magazines = try await getMagazines(limit: 4)
        let items = ebooks.data.shuffled().prefix(4).map { StoreItem(from: $0) } +
                    magazines.data.shuffled().prefix(2).map { StoreItem(from: $0) }
        return Array(items.shuffled())
    }

    /// 获取新书上架 - SWR 策略
    func getStoreNewArrivalsCached() async throws -> [StoreItem] {
        let cacheKey = CacheKeys.storeNewArrivals()
        let cache = DataCacheManager.shared

        if let cached: [StoreItem] = await cache.get([StoreItem].self, forKey: cacheKey) {
            Task {
                if let fresh = try? await self.getEbooks(limit: 10) {
                    await cache.set(fresh.data.map { StoreItem(from: $0) }, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.medium)
                }
            }
            return cached
        }

        let result = try await getEbooks(limit: 10)
        let items = result.data.map { StoreItem(from: $0) }
        await cache.set(items, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.medium)
        return items
    }

    /// 获取热门书籍 - SWR 策略
    func getStoreHotBooksCached() async throws -> [StoreItem] {
        let cacheKey = CacheKeys.storeHotBooks()
        let cache = DataCacheManager.shared

        if let cached: [StoreItem] = await cache.get([StoreItem].self, forKey: cacheKey) {
            Task {
                if let fresh = try? await self.getMagazines(limit: 10) {
                    await cache.set(fresh.data.map { StoreItem(from: $0) }, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.medium)
                }
            }
            return cached
        }

        let result = try await getMagazines(limit: 10)
        let items = result.data.map { StoreItem(from: $0) }
        await cache.set(items, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.medium)
        return items
    }

    /// 获取分类列表 - 长缓存
    func getCategoriesCached() async throws -> [EbookCategory] {
        let cacheKey = CacheKeys.categories()
        let cache = DataCacheManager.shared

        if let cached: [EbookCategory] = await cache.get([EbookCategory].self, forKey: cacheKey) {
            return cached
        }

        let result = try await getEbookCategories()
        await cache.set(result.data, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.veryLong)
        return result.data
    }

    /// 获取热门书单 - SWR 策略
    func getPopularBookListsCached() async throws -> [BookList] {
        let cacheKey = CacheKeys.storePopularLists()
        let cache = DataCacheManager.shared

        if let cached: [BookList] = await cache.get([BookList].self, forKey: cacheKey) {
            Task {
                if let fresh = try? await self.getBookLists(sort: "popular", limit: 6) {
                    await cache.set(fresh.data, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.medium)
                }
            }
            return cached
        }

        let result = try await getBookLists(sort: "popular", limit: 6)
        await cache.set(result.data, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.medium)
        return result.data
    }

    /// 清除书城首页缓存
    func invalidateStoreCache() async {
        let cache = DataCacheManager.shared
        await cache.remove(forKey: CacheKeys.storeRecommended())
        await cache.remove(forKey: CacheKeys.storeNewArrivals())
        await cache.remove(forKey: CacheKeys.storeHotBooks())
        await cache.remove(forKey: CacheKeys.storeTopRanked())
        await cache.remove(forKey: CacheKeys.storeFreeBooks())
        await cache.remove(forKey: CacheKeys.storeMemberExclusive())
        await cache.remove(forKey: CacheKeys.storePopularLists())
        await cache.remove(forKey: CacheKeys.categories())
    }
}
```

### 4. ViewModel 集成示例

```swift
// ViewModels/HomeViewModel.swift (修改示例)

@MainActor
class HomeViewModel: ObservableObject {
    @Published var readingHistory: [ReadingHistoryItem] = []
    @Published var isLoading = false
    @Published var error: Error?

    private let apiClient: APIClient

    init(apiClient: APIClient = .shared) {
        self.apiClient = apiClient
    }

    /// 加载阅读历史 - 使用缓存
    func loadReadingHistory() async {
        isLoading = true
        error = nil

        do {
            // 使用带缓存的 API
            readingHistory = try await apiClient.getReadingHistoryCached()
        } catch {
            self.error = error
        }

        isLoading = false
    }
}
```

```swift
// ViewModels/BookshelfViewModel.swift (修改示例)

@MainActor
class BookshelfViewModel: ObservableObject {
    @Published var items: [BookshelfItem] = []
    @Published var selectedStatus: BookshelfStatus = .all
    @Published var isLoading = false
    @Published var error: Error?

    private let apiClient: APIClient

    enum BookshelfStatus: String, CaseIterable {
        case all = "all"
        case reading = "reading"
        case wantToRead = "want_to_read"
        case finished = "finished"
    }

    init(apiClient: APIClient = .shared) {
        self.apiClient = apiClient
    }

    /// 加载书架数据 - 使用缓存
    func loadBookshelf() async {
        isLoading = true
        error = nil

        do {
            let status = selectedStatus == .all ? nil : selectedStatus.rawValue
            // 使用带缓存的 API
            items = try await apiClient.getBookshelfCached(status: status)
        } catch {
            self.error = error
        }

        isLoading = false
    }

    /// 切换状态 - 利用缓存快速响应
    func selectStatus(_ status: BookshelfStatus) async {
        selectedStatus = status
        await loadBookshelf()
    }

    /// 更新书籍状态后刷新
    func updateBookStatus(bookId: String, newStatus: String) async {
        do {
            try await apiClient.updateBookshelfStatus(bookId: bookId, status: newStatus)
            // 清除缓存
            await apiClient.invalidateBookshelfCache()
            // 重新加载
            await loadBookshelf()
        } catch {
            self.error = error
        }
    }
}
```

```swift
// ViewModels/StoreViewModel.swift (修改示例)

@MainActor
class StoreViewModel: ObservableObject {
    // MARK: - Published Properties

    @Published var recommendedBooks: [StoreItem] = []
    @Published var newArrivals: [StoreItem] = []
    @Published var hotBooks: [StoreItem] = []
    @Published var topRanked: [StoreItem] = []
    @Published var categories: [EbookCategory] = []
    @Published var popularBookLists: [BookList] = []
    @Published var freeBooks: [StoreItem] = []
    @Published var memberExclusiveBooks: [StoreItem] = []

    @Published var isLoading = false
    @Published var isRefreshingRecommendations = false
    @Published var errorMessage: String?

    private let apiClient = APIClient.shared

    // MARK: - 使用缓存的数据加载

    /// 加载首页数据 - 优先使用缓存，实现即时响应
    func loadHomeData() async {
        // 如果有缓存，先显示缓存数据（不显示 loading）
        let hasCache = await loadFromCacheIfAvailable()

        // 如果没有缓存才显示 loading
        if !hasCache {
            isLoading = true
        }

        // 并行加载所有数据（带缓存的 API 会在后台静默更新）
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.loadRecommendationsCached() }
            group.addTask { await self.loadNewArrivalsCached() }
            group.addTask { await self.loadHotBooksCached() }
            group.addTask { await self.loadCategoriesCached() }
            group.addTask { await self.loadBookListsCached() }
            // 其他数据流类似...
        }

        isLoading = false
    }

    /// 检查并加载缓存数据
    private func loadFromCacheIfAvailable() async -> Bool {
        let cache = DataCacheManager.shared
        var hasAnyCache = false

        if let cached: [StoreItem] = await cache.get([StoreItem].self, forKey: CacheKeys.storeRecommended()) {
            recommendedBooks = cached
            hasAnyCache = true
        }
        if let cached: [StoreItem] = await cache.get([StoreItem].self, forKey: CacheKeys.storeNewArrivals()) {
            newArrivals = cached
            hasAnyCache = true
        }
        if let cached: [StoreItem] = await cache.get([StoreItem].self, forKey: CacheKeys.storeHotBooks()) {
            hotBooks = cached
            hasAnyCache = true
        }
        if let cached: [EbookCategory] = await cache.get([EbookCategory].self, forKey: CacheKeys.categories()) {
            categories = cached
            hasAnyCache = true
        }
        if let cached: [BookList] = await cache.get([BookList].self, forKey: CacheKeys.storePopularLists()) {
            popularBookLists = cached
            hasAnyCache = true
        }

        return hasAnyCache
    }

    // MARK: - 各数据流加载（使用缓存 API）

    private func loadRecommendationsCached() async {
        do {
            recommendedBooks = try await apiClient.getStoreRecommendedCached()
        } catch {
            print("Failed to load recommendations: \(error)")
        }
    }

    private func loadNewArrivalsCached() async {
        do {
            newArrivals = try await apiClient.getStoreNewArrivalsCached()
        } catch {
            print("Failed to load new arrivals: \(error)")
        }
    }

    private func loadHotBooksCached() async {
        do {
            hotBooks = try await apiClient.getStoreHotBooksCached()
        } catch {
            print("Failed to load hot books: \(error)")
        }
    }

    private func loadCategoriesCached() async {
        do {
            categories = try await apiClient.getCategoriesCached()
        } catch {
            print("Failed to load categories: \(error)")
        }
    }

    private func loadBookListsCached() async {
        do {
            popularBookLists = try await apiClient.getPopularBookListsCached()
        } catch {
            print("Failed to load book lists: \(error)")
        }
    }

    /// 强制刷新（下拉刷新时调用）
    func forceRefresh() async {
        // 先清除缓存
        await apiClient.invalidateStoreCache()
        // 重新加载
        isLoading = true
        await loadHomeData()
    }

    /// 仅刷新推荐（换一批按钮）
    func refreshRecommendations() async {
        isRefreshingRecommendations = true
        // 清除推荐缓存
        await DataCacheManager.shared.remove(forKey: CacheKeys.storeRecommended())
        await loadRecommendationsCached()
        isRefreshingRecommendations = false
    }
}
```

---

## 缓存策略

### 各场景缓存配置

| 数据类型 | 缓存时间 (TTL) | 缓存层级 | 失效触发 | 更新策略 |
|---------|---------------|---------|---------|---------|
| 阅读历史 | 1 分钟 | 内存 + 磁盘 | 打开书籍、退出阅读器 | SWR |
| 书架数据 | 5 分钟 | 内存 + 磁盘 | 添加/删除书籍、更新状态 | SWR |
| 书籍详情 | 30 分钟 | 内存 + 磁盘 | 手动刷新 | Cache-First |
| 书籍列表 | 5 分钟 | 内存 + 磁盘 | 下拉刷新 | SWR |
| 分类列表 | 24 小时 | 内存 + 磁盘 | 应用启动时检查 | Cache-First |
| 笔记/高亮 | 5 分钟 | 内存 + 磁盘 | 添加/删除笔记 | SWR |
| **书城推荐** | 5 分钟 | 内存 + 磁盘 | 换一批、下拉刷新 | SWR |
| **书城新书** | 5 分钟 | 内存 + 磁盘 | 下拉刷新 | SWR |
| **书城热门** | 5 分钟 | 内存 + 磁盘 | 下拉刷新 | SWR |
| **书城排行** | 5 分钟 | 内存 + 磁盘 | 下拉刷新 | SWR |
| **热门书单** | 5 分钟 | 内存 + 磁盘 | 下拉刷新 | SWR |

### 缓存更新策略

#### 1. Stale-While-Revalidate (SWR)

```swift
/// SWR 策略：立即返回缓存，后台静默更新
func fetchWithSWR<T: Codable>(
    cacheKey: String,
    ttl: TimeInterval,
    fetch: () async throws -> T
) async throws -> T {
    let cache = DataCacheManager.shared

    // 有缓存则立即返回
    if let cached: T = await cache.get(T.self, forKey: cacheKey) {
        // 后台更新
        Task.detached {
            if let fresh = try? await fetch() {
                await cache.set(fresh, forKey: cacheKey, ttl: ttl)
            }
        }
        return cached
    }

    // 无缓存，同步请求
    let result = try await fetch()
    await cache.set(result, forKey: cacheKey, ttl: ttl)
    return result
}
```

#### 2. Cache-First

```swift
/// Cache-First 策略：优先使用缓存，过期后才请求网络
func fetchWithCacheFirst<T: Codable>(
    cacheKey: String,
    ttl: TimeInterval,
    fetch: () async throws -> T
) async throws -> T {
    let cache = DataCacheManager.shared

    // 检查缓存（内部已处理过期逻辑）
    if let cached: T = await cache.get(T.self, forKey: cacheKey) {
        return cached
    }

    // 缓存不存在或已过期
    let result = try await fetch()
    await cache.set(result, forKey: cacheKey, ttl: ttl)
    return result
}
```

#### 3. Network-First

```swift
/// Network-First 策略：优先请求网络，失败时使用缓存
func fetchWithNetworkFirst<T: Codable>(
    cacheKey: String,
    ttl: TimeInterval,
    fetch: () async throws -> T
) async throws -> T {
    let cache = DataCacheManager.shared

    do {
        let result = try await fetch()
        await cache.set(result, forKey: cacheKey, ttl: ttl)
        return result
    } catch {
        // 网络失败，尝试使用缓存（即使过期）
        if let cached: T = await cache.get(T.self, forKey: cacheKey) {
            return cached
        }
        throw error
    }
}
```

### 缓存失效机制

```swift
// Services/CacheInvalidation.swift

import Foundation

/// 缓存失效管理
class CacheInvalidation {
    static let shared = CacheInvalidation()

    private init() {
        setupNotifications()
    }

    private func setupNotifications() {
        // 用户登出时清除所有用户相关缓存
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleUserLogout),
            name: .userDidLogout,
            object: nil
        )

        // 应用进入后台时清理过期缓存
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAppBackground),
            name: UIApplication.didEnterBackgroundNotification,
            object: nil
        )
    }

    @objc private func handleUserLogout() {
        Task {
            await DataCacheManager.shared.clearAll()
        }
    }

    @objc private func handleAppBackground() {
        Task {
            await DataCacheManager.shared.cleanExpiredCache()
        }
    }
}

// MARK: - Notification Names

extension Notification.Name {
    static let userDidLogout = Notification.Name("userDidLogout")
    static let bookshelfDidUpdate = Notification.Name("bookshelfDidUpdate")
    static let readingProgressDidUpdate = Notification.Name("readingProgressDidUpdate")
}
```

---

## 实施计划

### 阶段一：基础设施（1-2 天）

- [ ] 实现 `DataCacheManager`
- [ ] 实现 `CacheKeys` 管理
- [ ] 添加 MD5 扩展或使用 CryptoKit
- [ ] 单元测试

### 阶段二：核心场景（2-3 天）

- [ ] 阅读历史缓存
- [ ] 书架数据缓存
- [ ] 书籍详情缓存
- [ ] 集成到 ViewModel

### 阶段三：书城数据流缓存（1-2 天）

- [ ] 实现书城首页各数据流缓存
  - [ ] `getStoreRecommendedCached()` - 推荐书籍
  - [ ] `getStoreNewArrivalsCached()` - 新书上架
  - [ ] `getStoreHotBooksCached()` - 热门书籍
  - [ ] `getCategoriesCached()` - 分类列表
  - [ ] `getPopularBookListsCached()` - 热门书单
- [ ] 改造 `StoreViewModel` 使用缓存 API
- [ ] 实现"换一批"功能的缓存刷新
- [ ] 测试离线访问书城首页

### 阶段四：高级功能（1-2 天）

- [ ] 缓存失效通知机制
- [ ] 离线模式支持
- [ ] 缓存大小监控和清理

### 阶段五：优化（持续）

- [ ] 性能监控和指标收集
- [ ] 根据实际使用调整 TTL
- [ ] 预加载策略优化

---

## 附录

### A. 不使用 CommonCrypto 的 MD5 替代方案

如果不想引入 CommonCrypto，可以使用 CryptoKit（iOS 13+）：

```swift
import CryptoKit

extension String {
    var md5Hash: String {
        let digest = Insecure.MD5.hash(data: Data(self.utf8))
        return digest.map { String(format: "%02x", $0) }.joined()
    }
}
```

### B. 简化版本（仅内存缓存）

如果磁盘缓存不是必需的，可以使用简化版本：

```swift
actor SimpleCache {
    static let shared = SimpleCache()

    private var cache: [String: (data: Any, expiry: Date)] = [:]

    func get<T>(_ type: T.Type, forKey key: String) -> T? {
        guard let entry = cache[key],
              entry.expiry > Date() else {
            cache[key] = nil
            return nil
        }
        return entry.data as? T
    }

    func set<T>(_ value: T, forKey key: String, ttl: TimeInterval) {
        cache[key] = (data: value, expiry: Date().addingTimeInterval(ttl))
    }

    func remove(forKey key: String) {
        cache[key] = nil
    }

    func clearAll() {
        cache.removeAll()
    }
}
```

---

## 总结

本方案通过引入 `DataCacheManager` 统一管理 API 数据缓存，采用两级缓存（内存 + 磁盘）架构，配合 SWR 更新策略，可以显著提升用户体验：

1. **书架 Tab 切换** - 从每次 Loading 优化为即时响应
2. **书籍详情页** - 重复访问无需重新加载
3. **书城首页** - 从 8+ 个并行请求优化为即时展示缓存 + 后台静默更新
4. **离线可用** - 无网络时仍可浏览已缓存内容

### 书城数据流优化效果

| 指标 | 优化前 | 优化后 |
|-----|-------|-------|
| 首次加载 | 8+ 个并行请求 | 8+ 个并行请求（首次） |
| 二次加载 | 8+ 个并行请求 | 0 请求（即时显示缓存） |
| Tab 切换响应 | 等待网络 | 即时响应 |
| 换一批操作 | 新请求 | 新请求（仅该数据流） |
| 离线访问 | 无法访问 | 显示缓存数据 |

### 预期效果

- **API 请求减少**：60-80%
- **页面加载时间**：减少 70%+
- **用户体验**：从"等待"变为"即时"
- **流量节省**：显著减少重复数据传输
