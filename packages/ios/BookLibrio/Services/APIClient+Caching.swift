import Foundation

// MARK: - APIClient Caching Extension
// Provides cached versions of API methods using SWR (Stale-While-Revalidate) strategy

extension APIClient {

    // MARK: - Store Home Data (Cached)

    /// Get ebooks with caching - SWR strategy
    func getEbooksCached(limit: Int = 10, offset: Int = 0) async throws -> EbooksResponse {
        let cacheKey = CacheKeys.storeEbooks(limit: limit, offset: offset)
        let cache = DataCacheManager.shared

        // Try cache first
        if let cached: EbooksResponse = await cache.get(EbooksResponse.self, forKey: cacheKey) {
            // Background refresh
            Task.detached { [weak self] in
                if let fresh = try? await self?.getEbooks(limit: limit, offset: offset) {
                    await cache.set(fresh, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.medium)
                }
            }
            return cached
        }

        // No cache, fetch from network
        let result = try await getEbooks(limit: limit, offset: offset)
        await cache.set(result, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.medium)
        return result
    }

    /// Get magazines with caching - SWR strategy
    func getMagazinesCached(limit: Int = 10, offset: Int = 0) async throws -> MagazinesResponse {
        let cacheKey = CacheKeys.storeMagazines(limit: limit, offset: offset)
        let cache = DataCacheManager.shared

        if let cached: MagazinesResponse = await cache.get(MagazinesResponse.self, forKey: cacheKey) {
            Task.detached { [weak self] in
                if let fresh = try? await self?.getMagazines(limit: limit, offset: offset) {
                    await cache.set(fresh, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.medium)
                }
            }
            return cached
        }

        let result = try await getMagazines(limit: limit, offset: offset)
        await cache.set(result, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.medium)
        return result
    }

    /// Get ebook categories with caching - Long TTL (rarely changes)
    func getEbookCategoriesCached() async throws -> EbookCategoriesResponse {
        let cacheKey = CacheKeys.ebookCategories()
        let cache = DataCacheManager.shared

        // Categories rarely change, use cache-first without background refresh
        if let cached: EbookCategoriesResponse = await cache.get(EbookCategoriesResponse.self, forKey: cacheKey) {
            return cached
        }

        let result = try await getEbookCategories()
        await cache.set(result, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.veryLong)
        return result
    }

    /// Get book lists with caching - SWR strategy
    func getBookListsCached(sort: String = "popular", limit: Int = 20) async throws -> BookListsResponse {
        let cacheKey = CacheKeys.bookLists(sort: sort, limit: limit)
        let cache = DataCacheManager.shared

        if let cached: BookListsResponse = await cache.get(BookListsResponse.self, forKey: cacheKey) {
            Task.detached { [weak self] in
                if let fresh = try? await self?.getBookLists(sort: sort, limit: limit) {
                    await cache.set(fresh, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.medium)
                }
            }
            return cached
        }

        let result = try await getBookLists(sort: sort, limit: limit)
        await cache.set(result, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.medium)
        return result
    }

    /// Get external rankings with caching - SWR strategy
    func getExternalRankingsCached(bookType: String = "ebook") async throws -> ExternalRankingsResponse {
        let cacheKey = CacheKeys.externalRankings()
        let cache = DataCacheManager.shared

        if let cached: ExternalRankingsResponse = await cache.get(ExternalRankingsResponse.self, forKey: cacheKey) {
            Task.detached { [weak self] in
                if let fresh = try? await self?.getExternalRankings(bookType: bookType) {
                    await cache.set(fresh, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.medium)
                }
            }
            return cached
        }

        let result = try await getExternalRankings(bookType: bookType)
        await cache.set(result, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.medium)
        return result
    }

    /// Get top rated books with caching - SWR strategy
    func getTopRatedBooksCached(bookType: String = "ebook", limit: Int = 10) async throws -> TopRatedResponse {
        let cacheKey = CacheKeys.topRatedBooks(limit: limit, offset: 0)
        let cache = DataCacheManager.shared

        if let cached: TopRatedResponse = await cache.get(TopRatedResponse.self, forKey: cacheKey) {
            Task.detached { [weak self] in
                if let fresh = try? await self?.getTopRatedBooks(bookType: bookType, limit: limit) {
                    await cache.set(fresh, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.medium)
                }
            }
            return cached
        }

        let result = try await getTopRatedBooks(bookType: bookType, limit: limit)
        await cache.set(result, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.medium)
        return result
    }

    /// Get books by year with caching - SWR strategy
    func getBooksByYearCached(bookType: String = "ebook", limit: Int = 10) async throws -> BooksByYearResponse {
        let cacheKey = CacheKeys.booksByYear()
        let cache = DataCacheManager.shared

        if let cached: BooksByYearResponse = await cache.get(BooksByYearResponse.self, forKey: cacheKey) {
            Task.detached { [weak self] in
                if let fresh = try? await self?.getBooksByYear(bookType: bookType, limit: limit) {
                    await cache.set(fresh, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.medium)
                }
            }
            return cached
        }

        let result = try await getBooksByYear(bookType: bookType, limit: limit)
        await cache.set(result, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.medium)
        return result
    }

    // MARK: - Reading History (Cached)

    /// Get reading history with caching - Short TTL, SWR strategy
    func getReadingHistoryCached(limit: Int? = nil) async throws -> ReadingHistoryItemResponse {
        guard let userId = AuthManager.shared.currentUser?.id else {
            throw APIError.unauthorized
        }

        let cacheKey = CacheKeys.readingHistory(userId: "\(userId)")
        let cache = DataCacheManager.shared

        if let cached: ReadingHistoryItemResponse = await cache.get(ReadingHistoryItemResponse.self, forKey: cacheKey) {
            Task.detached { [weak self] in
                if let fresh = try? await self?.getReadingHistory(limit: limit) {
                    await cache.set(fresh, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.short)
                }
            }
            return cached
        }

        let result = try await getReadingHistory(limit: limit)
        await cache.set(result, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.short)
        return result
    }

    // MARK: - Bookshelf (Cached)

    /// Get bookshelf with caching - SWR strategy
    func getMyBookshelfCached(
        status: String = "all",
        type: String = "all",
        sort: String = "added",
        order: String = "desc",
        limit: Int = 50,
        offset: Int = 0,
        openedOnly: Bool = false
    ) async throws -> BookshelfListResponse {
        guard let userId = AuthManager.shared.currentUser?.id else {
            throw APIError.unauthorized
        }

        // Cache key includes all filter parameters to avoid cache conflicts
        let cacheKey = CacheKeys.bookshelf(
            userId: "\(userId)",
            status: status,
            type: type,
            sort: sort,
            openedOnly: openedOnly
        )
        let cache = DataCacheManager.shared

        Log.d("[Cache] Bookshelf lookup key: \(cacheKey)")

        if let cached: BookshelfListResponse = await cache.get(BookshelfListResponse.self, forKey: cacheKey) {
            Log.d("[Cache] ✅ HIT - Bookshelf \(status)/\(type): \(cached.data.count) items")
            // Background refresh (SWR)
            Task.detached { [weak self] in
                if let fresh = try? await self?.getMyBookshelf(
                    status: status, type: type, sort: sort, order: order,
                    limit: limit, offset: offset, openedOnly: openedOnly
                ) {
                    await cache.set(fresh, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.medium)
                    Log.d("[Cache] 🔄 Background refresh complete - Bookshelf \(status)/\(type)")
                }
            }
            return cached
        }

        Log.d("[Cache] ❌ MISS - Bookshelf \(status)/\(type), fetching from API...")
        let result = try await getMyBookshelf(
            status: status, type: type, sort: sort, order: order,
            limit: limit, offset: offset, openedOnly: openedOnly
        )
        await cache.set(result, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.medium)
        Log.d("[Cache] 💾 Saved - Bookshelf \(status)/\(type): \(result.data.count) items")
        return result
    }

    // MARK: - Book Detail (Cached)

    /// Get book detail with caching - Long TTL
    func getBookDetailCached(type: BookType, id: Int) async throws -> BookDetailResponse {
        let cacheKey: String
        switch type {
        case .ebook:
            cacheKey = CacheKeys.ebookDetail(ebookId: id)
        case .magazine:
            cacheKey = CacheKeys.magazineDetail(magazineId: id)
        }

        let cache = DataCacheManager.shared

        // Book details rarely change, use cache-first
        if let cached: BookDetailResponse = await cache.get(BookDetailResponse.self, forKey: cacheKey) {
            return cached
        }

        let result = try await getBookDetail(type: type, id: id)
        await cache.set(result, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.long)
        return result
    }

    /// Get ebook detail with caching
    func getEbookCached(id: Int) async throws -> EbookResponse {
        let cacheKey = CacheKeys.ebookDetail(ebookId: id)
        let cache = DataCacheManager.shared

        if let cached: EbookResponse = await cache.get(EbookResponse.self, forKey: cacheKey) {
            return cached
        }

        let result = try await getEbook(id: id)
        await cache.set(result, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.long)
        return result
    }

    /// Get magazine detail with caching
    func getMagazineCached(id: Int) async throws -> MagazineResponse {
        let cacheKey = CacheKeys.magazineDetail(magazineId: id)
        let cache = DataCacheManager.shared

        if let cached: MagazineResponse = await cache.get(MagazineResponse.self, forKey: cacheKey) {
            return cached
        }

        let result = try await getMagazine(id: id)
        await cache.set(result, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.long)
        return result
    }

    // MARK: - Category Books (Cached)

    /// Get category books with caching - SWR strategy
    func getCategoryBooksCached(
        categoryId: Int,
        bookType: String = "ebook",
        page: Int = 1,
        limit: Int = 20
    ) async throws -> CategoryBooksResponse {
        let cacheKey = CacheKeys.categoryBooks(categoryId: categoryId, page: page)
        let cache = DataCacheManager.shared

        if let cached: CategoryBooksResponse = await cache.get(CategoryBooksResponse.self, forKey: cacheKey) {
            Task.detached { [weak self] in
                if let fresh = try? await self?.getCategoryBooks(
                    categoryId: categoryId, bookType: bookType, page: page, limit: limit
                ) {
                    await cache.set(fresh, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.medium)
                }
            }
            return cached
        }

        let result = try await getCategoryBooks(
            categoryId: categoryId, bookType: bookType, page: page, limit: limit
        )
        await cache.set(result, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.medium)
        return result
    }

    // MARK: - External Ranking Detail (Cached)

    /// Get external ranking detail with caching
    func getExternalRankingDetailCached(id: Int, limit: Int = 50, offset: Int = 0) async throws -> ExternalRankingDetailResponse {
        let cacheKey = CacheKeys.externalRankingDetail(rankingId: id)
        let cache = DataCacheManager.shared

        if let cached: ExternalRankingDetailResponse = await cache.get(ExternalRankingDetailResponse.self, forKey: cacheKey) {
            return cached
        }

        let result = try await getExternalRankingDetail(id: id, limit: limit, offset: offset)
        await cache.set(result, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.long)
        return result
    }

    // MARK: - Book List Detail (Cached)

    /// Get book list detail with caching
    func getBookListCached(id: Int) async throws -> BookListResponse {
        let cacheKey = CacheKeys.bookListDetail(listId: id)
        let cache = DataCacheManager.shared

        if let cached: BookListResponse = await cache.get(BookListResponse.self, forKey: cacheKey) {
            Task.detached { [weak self] in
                if let fresh = try? await self?.getBookList(id: id) {
                    await cache.set(fresh, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.medium)
                }
            }
            return cached
        }

        let result = try await getBookList(id: id)
        await cache.set(result, forKey: cacheKey, ttl: DataCacheManager.CacheDuration.medium)
        return result
    }

    // MARK: - Cache Invalidation

    /// Invalidate all store-related caches
    func invalidateStoreCache() async {
        let cache = DataCacheManager.shared
        await cache.remove(forKey: CacheKeys.storeRecommended())
        await cache.remove(forKey: CacheKeys.storeNewArrivals())
        await cache.remove(forKey: CacheKeys.storeHotBooks())
        await cache.remove(forKey: CacheKeys.storeTopRanked())
        await cache.remove(forKey: CacheKeys.storeFreeBooks())
        await cache.remove(forKey: CacheKeys.storeMemberExclusive())
        await cache.remove(forKey: CacheKeys.storePopularLists())
        await cache.remove(forKey: CacheKeys.ebookCategories())
        await cache.remove(forKey: CacheKeys.externalRankings())
        await cache.remove(forKey: CacheKeys.booksByYear())
    }

    /// Invalidate bookshelf caches for current user
    func invalidateBookshelfCache() async {
        guard let userId = AuthManager.shared.currentUser?.id else { return }

        let cache = DataCacheManager.shared
        let userIdStr = "\(userId)"

        await cache.remove(forKey: CacheKeys.bookshelf(userId: userIdStr, status: "all"))
        await cache.remove(forKey: CacheKeys.bookshelf(userId: userIdStr, status: "reading"))
        await cache.remove(forKey: CacheKeys.bookshelf(userId: userIdStr, status: "want_to_read"))
        await cache.remove(forKey: CacheKeys.bookshelf(userId: userIdStr, status: "finished"))

        // Also invalidate reading history as it's related
        await cache.remove(forKey: CacheKeys.readingHistory(userId: userIdStr))
    }

    /// Invalidate reading history cache for current user
    func invalidateReadingHistoryCache() async {
        guard let userId = AuthManager.shared.currentUser?.id else { return }
        let cache = DataCacheManager.shared
        await cache.remove(forKey: CacheKeys.readingHistory(userId: "\(userId)"))
    }

    /// Invalidate book detail cache
    func invalidateBookDetailCache(type: BookType, id: Int) async {
        let cache = DataCacheManager.shared
        switch type {
        case .ebook:
            await cache.remove(forKey: CacheKeys.ebookDetail(ebookId: id))
        case .magazine:
            await cache.remove(forKey: CacheKeys.magazineDetail(magazineId: id))
        }
    }

    /// Clear all data caches
    func clearAllDataCache() async {
        await DataCacheManager.shared.clearAll()
    }
}

// MARK: - Offline Support Helpers

extension APIClient {

    /// Get data with offline fallback (returns stale cache if network fails)
    func getWithOfflineFallback<T: Codable>(
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
            // Network failed, try stale cache
            if let stale: T = await cache.getStale(T.self, forKey: cacheKey) {
                return stale
            }
            throw error
        }
    }
}
