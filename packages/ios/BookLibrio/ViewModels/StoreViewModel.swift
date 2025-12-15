import Foundation
import SwiftUI

/// ViewModel for the unified Store module
/// Manages ebooks, magazines, categories, and rankings
/// Uses DataCacheManager for caching to reduce API calls and improve responsiveness
@MainActor
class StoreViewModel: ObservableObject {
    // MARK: - Published Properties

    @Published var recommendedBooks: [StoreItem] = []
    @Published var newArrivals: [StoreItem] = []
    @Published var hotBooks: [StoreItem] = []
    @Published var topRanked: [StoreItem] = []
    @Published var categories: [EbookCategory] = []
    @Published var popularBookLists: [BookList] = []

    // New sections
    @Published var freeBooks: [StoreItem] = []
    @Published var memberExclusiveBooks: [StoreItem] = []
    @Published var dailyBookLists: [DailyBookList] = []

    @Published var isLoading = false
    @Published var isRefreshingRecommendations = false
    @Published var errorMessage: String?

    // MARK: - Private Properties

    private let apiClient = APIClient.shared

    // MARK: - Data Loading

    func loadHomeData() async {
        // First, try to load from cache for instant display
        let hasCache = await loadFromCacheIfAvailable()

        // Only show loading if no cached data
        if !hasCache {
            isLoading = true
        }
        errorMessage = nil

        // Load all sections in parallel (using cached APIs with SWR)
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.loadRecommendations() }
            group.addTask { await self.loadNewArrivals() }
            group.addTask { await self.loadHotBooks() }
            group.addTask { await self.loadTopRanked() }
            group.addTask { await self.loadCategories() }
            group.addTask { await self.loadBookLists() }
            group.addTask { await self.loadFreeBooks() }
            group.addTask { await self.loadMemberExclusiveBooks() }
            group.addTask { await self.loadDailyBookLists() }
        }

        isLoading = false
    }

    /// Load cached data immediately for instant UI response
    private func loadFromCacheIfAvailable() async -> Bool {
        let cache = DataCacheManager.shared
        var hasAnyCache = false

        // Load cached ebooks for recommendations/new arrivals
        if let cachedEbooks: EbooksResponse = await cache.get(EbooksResponse.self, forKey: CacheKeys.storeEbooks(limit: 10, offset: 0)) {
            newArrivals = cachedEbooks.data.map { StoreItem(from: $0) }
            hasAnyCache = true
        }

        // Load cached magazines for hot books
        if let cachedMagazines: MagazinesResponse = await cache.get(MagazinesResponse.self, forKey: CacheKeys.storeMagazines(limit: 10, offset: 0)) {
            hotBooks = cachedMagazines.data.map { StoreItem(from: $0) }
            hasAnyCache = true
        }

        // Load cached categories
        if let cachedCategories: EbookCategoriesResponse = await cache.get(EbookCategoriesResponse.self, forKey: CacheKeys.ebookCategories()) {
            categories = cachedCategories.data
            hasAnyCache = true
        }

        // Load cached book lists
        if let cachedLists: BookListsResponse = await cache.get(BookListsResponse.self, forKey: CacheKeys.bookLists(sort: "popular", limit: 6)) {
            popularBookLists = cachedLists.data
            hasAnyCache = true
        }

        return hasAnyCache
    }

    func refresh() async {
        await loadHomeData()
    }

    /// Force refresh - clears cache first
    func forceRefresh() async {
        await apiClient.invalidateStoreCache()
        isLoading = true
        await loadHomeData()
    }

    /// Refresh only the recommendations section
    func refreshRecommendations() async {
        isRefreshingRecommendations = true
        // Clear recommendations cache
        await DataCacheManager.shared.remove(forKey: CacheKeys.storeRecommended())
        await loadRecommendations()
        isRefreshingRecommendations = false
    }

    // MARK: - Section Loading (Using Cached APIs)

    private func loadRecommendations() async {
        do {
            // Load random selection of ebooks and magazines using cached APIs
            let ebooks = try await apiClient.getEbooksCached(limit: 6)
            let magazines = try await apiClient.getMagazinesCached(limit: 4)

            let items = ebooks.data.shuffled().prefix(4).map { StoreItem(from: $0) } +
                        magazines.data.shuffled().prefix(2).map { StoreItem(from: $0) }

            recommendedBooks = Array(items.shuffled())
        } catch {
            print("Failed to load recommendations: \(error)")
        }
    }

    private func loadNewArrivals() async {
        do {
            // Load latest ebooks using cached API
            let ebooks = try await apiClient.getEbooksCached(limit: 10)
            newArrivals = ebooks.data.map { StoreItem(from: $0) }
        } catch {
            print("Failed to load new arrivals: \(error)")
        }
    }

    private func loadHotBooks() async {
        do {
            // Load popular magazines using cached API
            let magazines = try await apiClient.getMagazinesCached(limit: 10)
            hotBooks = magazines.data.map { StoreItem(from: $0) }
        } catch {
            print("Failed to load hot books: \(error)")
        }
    }

    private func loadTopRanked() async {
        do {
            // Mix ebooks and magazines for rankings using cached APIs
            let ebooks = try await apiClient.getEbooksCached(limit: 5)
            let magazines = try await apiClient.getMagazinesCached(limit: 5)

            var items = ebooks.data.map { StoreItem(from: $0) } +
                        magazines.data.map { StoreItem(from: $0) }
            items.shuffle()
            topRanked = Array(items.prefix(10))
        } catch {
            print("Failed to load top ranked: \(error)")
        }
    }

    private func loadCategories() async {
        do {
            // Categories rarely change, use long-cached API
            let response = try await apiClient.getEbookCategoriesCached()
            categories = response.data
        } catch {
            print("Failed to load categories: \(error)")
        }
    }

    private func loadBookLists() async {
        do {
            let response = try await apiClient.getBookListsCached(sort: "popular", limit: 6)
            popularBookLists = response.data
        } catch {
            print("Failed to load book lists: \(error)")
        }
    }

    private func loadFreeBooks() async {
        do {
            // In production, filter by price=0 or free=true
            let ebooks = try await apiClient.getEbooksCached(limit: 8)
            // Simulate free books by taking a subset
            freeBooks = Array(ebooks.data.prefix(6)).map { StoreItem(from: $0, isFree: true) }
        } catch {
            print("Failed to load free books: \(error)")
        }
    }

    private func loadMemberExclusiveBooks() async {
        do {
            // In production, filter by memberOnly=true
            let ebooks = try await apiClient.getEbooksCached(limit: 10)
            // Simulate member exclusive by taking different subset
            memberExclusiveBooks = Array(ebooks.data.suffix(6)).map { StoreItem(from: $0, isMemberExclusive: true) }
        } catch {
            print("Failed to load member exclusive books: \(error)")
        }
    }

    private func loadDailyBookLists() async {
        // In production, fetch from API
        // For now, use sample data with real dates
        dailyBookLists = (0..<7).map { dayOffset in
            let date = Date().addingTimeInterval(-Double(dayOffset) * 86400)
            let titles = ["今日必读", "经典文学", "科技前沿", "人文社科", "商业智慧", "生活美学", "心理成长"]
            let descriptions = [
                "编辑精选的今日推荐书单",
                "永恒的文学经典作品",
                "探索科技的未来",
                "深度思考与人文关怀",
                "商业洞察与创业智慧",
                "品质生活的艺术",
                "自我成长与心理健康"
            ]
            let colors: [Color] = [.blue, .purple, .green, .orange, .red, .pink, .cyan]

            return DailyBookList(
                id: dayOffset + 1,
                date: date,
                title: titles[dayOffset % titles.count],
                description: descriptions[dayOffset % descriptions.count],
                bookCount: Int.random(in: 5...15),
                previewCovers: [],
                themeColor: colors[dayOffset % colors.count]
            )
        }
    }
}

// MARK: - Store Item Model

/// Unified item model for both ebooks and magazines
struct StoreItem: Identifiable, Hashable {
    let id: String
    let itemId: Int
    let type: StoreItemType
    let title: String
    let subtitle: String?
    let coverUrl: String?
    let badge: String?
    let isFree: Bool
    let isMemberExclusive: Bool

    enum StoreItemType: String, Hashable {
        case ebook
        case magazine
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: StoreItem, rhs: StoreItem) -> Bool {
        lhs.id == rhs.id
    }

    /// Memberwise initializer for creating StoreItem from individual values
    init(id: Int, itemType: StoreItemType, itemId: Int, title: String, subtitle: String?, coverUrl: String?, badge: String?, isFree: Bool = false, isMemberExclusive: Bool = false) {
        self.id = "\(itemType.rawValue)-\(id)"
        self.itemId = itemId
        self.type = itemType
        self.title = title
        self.subtitle = subtitle
        self.coverUrl = coverUrl
        self.badge = badge
        self.isFree = isFree
        self.isMemberExclusive = isMemberExclusive
    }

    init(from ebook: Ebook, isFree: Bool = false, isMemberExclusive: Bool = false) {
        self.id = "ebook-\(ebook.id)"
        self.itemId = ebook.id
        self.type = .ebook
        self.title = ebook.title
        self.subtitle = nil
        self.coverUrl = ebook.coverUrl
        self.badge = nil  // Don't show file type badge for ebooks
        self.isFree = isFree
        self.isMemberExclusive = isMemberExclusive
    }

    init(from magazine: Magazine, isFree: Bool = false, isMemberExclusive: Bool = false) {
        self.id = "magazine-\(magazine.id)"
        self.itemId = magazine.id
        self.type = .magazine
        self.title = magazine.title
        self.subtitle = magazine.year.map { "\($0)年" }
        self.coverUrl = magazine.coverUrl
        self.badge = magazine.pageCount.map { "\($0)页" }
        self.isFree = isFree
        self.isMemberExclusive = isMemberExclusive
    }
}
