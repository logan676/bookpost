import Foundation

enum APIError: LocalizedError {
    case invalidURL
    case networkError(Error)
    case decodingError(Error)
    case serverError(Int, String?)
    case unauthorized
    case unknown
    case invalidResponse

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "无效的 URL"
        case .networkError(let error):
            return "网络错误: \(error.localizedDescription)"
        case .decodingError(let error):
            // Show more detailed decoding error for debugging
            if let decodingError = error as? DecodingError {
                switch decodingError {
                case .keyNotFound(let key, _):
                    return "数据解析错误: 缺少字段 '\(key.stringValue)'"
                case .typeMismatch(let type, let context):
                    return "数据解析错误: 类型不匹配 \(type) at \(context.codingPath.map { $0.stringValue }.joined(separator: "."))"
                case .valueNotFound(let type, let context):
                    return "数据解析错误: 缺少值 \(type) at \(context.codingPath.map { $0.stringValue }.joined(separator: "."))"
                case .dataCorrupted(let context):
                    return "数据解析错误: \(context.debugDescription)"
                @unknown default:
                    return "数据解析错误: \(error.localizedDescription)"
                }
            }
            return "数据解析错误: \(error.localizedDescription)"
        case .serverError(let code, let message):
            return message ?? "服务器错误 (\(code))"
        case .unauthorized:
            return "未授权，请重新登录"
        case .unknown:
            return "未知错误"
        case .invalidResponse:
            return "无效的响应"
        }
    }
}

// MARK: - API Response Wrapper
struct APIResponse<T: Decodable>: Decodable {
    let success: Bool?
    let data: T?
    let error: String?
}

// MARK: - Error Response
struct ErrorResponse: Decodable {
    let error: ErrorDetail?
    let message: String?

    struct ErrorDetail: Decodable {
        let code: String?
        let message: String?
    }
}

class APIClient {
    static let shared = APIClient()

    // Production API (Fly.io)
    private let baseURL = "https://bookpost-api-hono.fly.dev"

    private let session: URLSession
    private let decoder: JSONDecoder

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 300
        session = URLSession(configuration: config)

        decoder = JSONDecoder()
    }

    // MARK: - Request Building

    private func buildRequest(
        path: String,
        method: String = "GET",
        body: Data? = nil,
        queryItems: [URLQueryItem]? = nil,
        requiresAuth: Bool = false
    ) throws -> URLRequest {
        var components = URLComponents(string: baseURL + path)
        components?.queryItems = queryItems?.filter { $0.value != nil }

        guard let url = components?.url else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let body = body {
            request.httpBody = body
        }

        if requiresAuth, let token = AuthManager.shared.accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        return request
    }

    private func perform<T: Decodable>(_ request: URLRequest) async throws -> T {
        let startTime = CFAbsoluteTimeGetCurrent()
        let url = request.url?.absoluteString ?? ""

        do {
            Log.request(request.httpMethod ?? "GET", url: url, body: request.httpBody)

            let (data, response) = try await session.data(for: request)
            let duration = CFAbsoluteTimeGetCurrent() - startTime

            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.unknown
            }

            Log.response(httpResponse.statusCode, url: url, data: data, duration: duration)

            guard (200...299).contains(httpResponse.statusCode) else {
                // Try to parse error message from JSON response
                var errorMessage: String?
                if let errorResponse = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                    errorMessage = errorResponse.error?.message ?? errorResponse.message
                    Log.e("Server error \(httpResponse.statusCode): \(errorMessage ?? "unknown")")
                } else {
                    errorMessage = String(data: data, encoding: .utf8)
                    Log.e("Server error \(httpResponse.statusCode): \(errorMessage ?? "unknown")")
                }
                throw APIError.serverError(httpResponse.statusCode, errorMessage)
            }

            // Log raw response for debugging
            if let rawResponse = String(data: data, encoding: .utf8) {
                Log.d("Raw response for \(url): \(rawResponse)")
            }

            return try decoder.decode(T.self, from: data)
        } catch let error as APIError {
            throw error
        } catch let error as DecodingError {
            // Log detailed decoding error information
            switch error {
            case .typeMismatch(let type, let context):
                Log.e("Decoding typeMismatch for \(url): expected \(type), path: \(context.codingPath.map { $0.stringValue }.joined(separator: "."))", error: error)
            case .valueNotFound(let type, let context):
                Log.e("Decoding valueNotFound for \(url): expected \(type), path: \(context.codingPath.map { $0.stringValue }.joined(separator: "."))", error: error)
            case .keyNotFound(let key, let context):
                Log.e("Decoding keyNotFound for \(url): key '\(key.stringValue)' not found, path: \(context.codingPath.map { $0.stringValue }.joined(separator: "."))", error: error)
            case .dataCorrupted(let context):
                Log.e("Decoding dataCorrupted for \(url): \(context.debugDescription), path: \(context.codingPath.map { $0.stringValue }.joined(separator: "."))", error: error)
            @unknown default:
                Log.e("Decoding failed for \(url)", error: error)
            }
            throw APIError.decodingError(error)
        } catch {
            Log.e("Network request failed for \(url)", error: error)
            throw APIError.networkError(error)
        }
    }

    // MARK: - Auth API

    func login(email: String, password: String) async throws -> AuthResponse {
        let body = try JSONEncoder().encode(["email": email, "password": password])
        let request = try buildRequest(path: "/api/auth/login", method: "POST", body: body)
        return try await perform(request)
    }

    func register(username: String, email: String, password: String) async throws -> AuthResponse {
        let body = try JSONEncoder().encode([
            "username": username,
            "email": email,
            "password": password
        ])
        let request = try buildRequest(path: "/api/auth/register", method: "POST", body: body)
        return try await perform(request)
    }

    func refreshToken(_ refreshToken: String) async throws -> RefreshTokenResponse {
        let body = try JSONEncoder().encode(["refreshToken": refreshToken])
        let request = try buildRequest(path: "/api/auth/refresh", method: "POST", body: body)
        return try await perform(request)
    }

    func getMe() async throws -> UserResponse {
        let request = try buildRequest(path: "/api/auth/me", requiresAuth: true)
        return try await perform(request)
    }

    // MARK: - Ebooks API

    func getEbooks(category: Int? = nil, search: String? = nil, limit: Int? = nil, offset: Int? = nil) async throws -> EbooksResponse {
        var queryItems: [URLQueryItem] = []
        if let category = category { queryItems.append(URLQueryItem(name: "category", value: "\(category)")) }
        if let search = search, !search.isEmpty { queryItems.append(URLQueryItem(name: "search", value: search)) }
        if let limit = limit { queryItems.append(URLQueryItem(name: "limit", value: "\(limit)")) }
        if let offset = offset { queryItems.append(URLQueryItem(name: "offset", value: "\(offset)")) }

        let request = try buildRequest(path: "/api/ebooks", queryItems: queryItems.isEmpty ? nil : queryItems)
        return try await perform(request)
    }

    func getEbook(id: Int) async throws -> EbookResponse {
        let request = try buildRequest(path: "/api/ebooks/\(id)")
        return try await perform(request)
    }

    func getEbookCategories() async throws -> EbookCategoriesResponse {
        let request = try buildRequest(path: "/api/ebook-categories")
        return try await perform(request)
    }

    func downloadEbookFile(id: Int) async throws -> URL {
        let request = try buildRequest(path: "/api/ebooks/\(id)/file", requiresAuth: true)
        let (tempURL, response) = try await session.download(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError((response as? HTTPURLResponse)?.statusCode ?? 0, nil)
        }

        // Move to cache directory
        let cacheDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
        let pdfDir = cacheDir.appendingPathComponent("pdfs/ebooks", isDirectory: true)
        try FileManager.default.createDirectory(at: pdfDir, withIntermediateDirectories: true)

        let destURL = pdfDir.appendingPathComponent("\(id).pdf")
        if FileManager.default.fileExists(atPath: destURL.path) {
            try FileManager.default.removeItem(at: destURL)
        }
        try FileManager.default.moveItem(at: tempURL, to: destURL)

        return destURL
    }

    // MARK: - Magazines API

    func getMagazines(publisher: Int? = nil, year: Int? = nil, search: String? = nil, limit: Int? = nil, offset: Int? = nil) async throws -> MagazinesResponse {
        var queryItems: [URLQueryItem] = []
        if let publisher = publisher { queryItems.append(URLQueryItem(name: "publisher", value: "\(publisher)")) }
        if let year = year { queryItems.append(URLQueryItem(name: "year", value: "\(year)")) }
        if let search = search, !search.isEmpty { queryItems.append(URLQueryItem(name: "search", value: search)) }
        if let limit = limit { queryItems.append(URLQueryItem(name: "limit", value: "\(limit)")) }
        if let offset = offset { queryItems.append(URLQueryItem(name: "offset", value: "\(offset)")) }

        let request = try buildRequest(path: "/api/magazines", queryItems: queryItems.isEmpty ? nil : queryItems)
        return try await perform(request)
    }

    func getMagazine(id: Int) async throws -> MagazineResponse {
        let request = try buildRequest(path: "/api/magazines/\(id)")
        return try await perform(request)
    }

    func getPublishers() async throws -> PublishersResponse {
        let request = try buildRequest(path: "/api/magazines/publishers")
        return try await perform(request)
    }

    func downloadMagazineFile(id: Int) async throws -> URL {
        let request = try buildRequest(path: "/api/magazines/\(id)/file", requiresAuth: true)
        let (tempURL, response) = try await session.download(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError((response as? HTTPURLResponse)?.statusCode ?? 0, nil)
        }

        let cacheDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
        let pdfDir = cacheDir.appendingPathComponent("pdfs/magazines", isDirectory: true)
        try FileManager.default.createDirectory(at: pdfDir, withIntermediateDirectories: true)

        let destURL = pdfDir.appendingPathComponent("\(id).pdf")
        if FileManager.default.fileExists(atPath: destURL.path) {
            try FileManager.default.removeItem(at: destURL)
        }
        try FileManager.default.moveItem(at: tempURL, to: destURL)

        return destURL
    }

    // MARK: - Books API

    func getBooks(search: String? = nil, author: String? = nil) async throws -> BooksResponse {
        var queryItems: [URLQueryItem] = []
        if let search = search, !search.isEmpty { queryItems.append(URLQueryItem(name: "search", value: search)) }
        if let author = author, !author.isEmpty { queryItems.append(URLQueryItem(name: "author", value: author)) }

        let request = try buildRequest(path: "/api/books", queryItems: queryItems.isEmpty ? nil : queryItems, requiresAuth: true)
        return try await perform(request)
    }

    func getBook(id: Int) async throws -> BookResponse {
        let request = try buildRequest(path: "/api/books/\(id)", requiresAuth: true)
        return try await perform(request)
    }

    // MARK: - Reading History API

    func getReadingHistory(limit: Int? = nil) async throws -> ReadingHistoryResponse {
        var queryItems: [URLQueryItem] = []
        if let limit = limit { queryItems.append(URLQueryItem(name: "limit", value: "\(limit)")) }

        let request = try buildRequest(path: "/api/reading-history", queryItems: queryItems.isEmpty ? nil : queryItems, requiresAuth: true)
        return try await perform(request)
    }

    func updateReadingHistory(itemType: ItemType, itemId: Int, title: String?, coverUrl: String?, lastPage: Int?) async throws {
        let payload = UpdateReadingHistoryRequest(
            itemType: itemType.rawValue,
            itemId: itemId,
            title: title,
            coverUrl: coverUrl,
            lastPage: lastPage
        )
        let body = try JSONEncoder().encode(payload)
        let request = try buildRequest(path: "/api/reading-history", method: "POST", body: body, requiresAuth: true)
        let _: ReadingHistoryResponse = try await perform(request)
    }

    // MARK: - Book Detail API

    func getBookDetail(type: BookType, id: Int) async throws -> BookDetailResponse {
        let request = try buildRequest(
            path: "/api/book-detail/\(type.rawValue)/\(id)",
            requiresAuth: AuthManager.shared.isLoggedIn
        )
        return try await perform(request)
    }

    func getBookReviews(type: BookType, id: Int, limit: Int = 20, offset: Int = 0, sort: String = "newest") async throws -> BookReviewsResponse {
        let queryItems = [
            URLQueryItem(name: "limit", value: "\(limit)"),
            URLQueryItem(name: "offset", value: "\(offset)"),
            URLQueryItem(name: "sort", value: sort)
        ]
        let request = try buildRequest(
            path: "/api/book-detail/\(type.rawValue)/\(id)/reviews",
            queryItems: queryItems,
            requiresAuth: AuthManager.shared.isLoggedIn
        )
        return try await perform(request)
    }

    // MARK: - Review CRUD API

    func getMyReview(type: BookType, id: Int) async throws -> MyReviewResponse {
        let request = try buildRequest(
            path: "/api/book-detail/\(type.rawValue)/\(id)/reviews/mine",
            requiresAuth: true
        )
        return try await perform(request)
    }

    func createReview(type: BookType, id: Int, review: CreateReviewRequest) async throws -> ReviewResponse {
        let body = try JSONEncoder().encode(review)
        let request = try buildRequest(
            path: "/api/book-detail/\(type.rawValue)/\(id)/reviews",
            method: "POST",
            body: body,
            requiresAuth: true
        )
        return try await perform(request)
    }

    func updateReview(type: BookType, id: Int, review: CreateReviewRequest) async throws -> ReviewResponse {
        let body = try JSONEncoder().encode(review)
        let request = try buildRequest(
            path: "/api/book-detail/\(type.rawValue)/\(id)/reviews/mine",
            method: "PUT",
            body: body,
            requiresAuth: true
        )
        return try await perform(request)
    }

    func deleteReview(type: BookType, id: Int) async throws -> DeleteReviewResponse {
        let request = try buildRequest(
            path: "/api/book-detail/\(type.rawValue)/\(id)/reviews/mine",
            method: "DELETE",
            requiresAuth: true
        )
        return try await perform(request)
    }

    func toggleReviewLike(reviewId: Int) async throws -> ToggleLikeResponse {
        let request = try buildRequest(
            path: "/api/book-detail/reviews/\(reviewId)/like",
            method: "POST",
            requiresAuth: true
        )
        return try await perform(request)
    }

    func checkReviewLiked(reviewId: Int) async throws -> CheckLikedResponse {
        let request = try buildRequest(
            path: "/api/book-detail/reviews/\(reviewId)/liked",
            requiresAuth: true
        )
        return try await perform(request)
    }

    // MARK: - Bookshelf API

    func addToBookshelf(type: BookType, id: Int, status: BookshelfStatus = .wantToRead) async throws -> BookshelfEntryResponse {
        let requestBody = AddToBookshelfRequest(status: status)
        let body = try JSONEncoder().encode(requestBody)
        let request = try buildRequest(
            path: "/api/book-detail/\(type.rawValue)/\(id)/bookshelf",
            method: "POST",
            body: body,
            requiresAuth: true
        )
        return try await perform(request)
    }

    func updateBookshelf(type: BookType, id: Int, status: BookshelfStatus? = nil, progress: Double? = nil, currentPage: Int? = nil, privateNotes: String? = nil) async throws -> BookshelfEntryResponse {
        let requestBody = UpdateBookshelfRequest(status: status, progress: progress, currentPage: currentPage, privateNotes: privateNotes)
        let body = try JSONEncoder().encode(requestBody)
        let request = try buildRequest(
            path: "/api/book-detail/\(type.rawValue)/\(id)/bookshelf",
            method: "PUT",
            body: body,
            requiresAuth: true
        )
        return try await perform(request)
    }

    func removeFromBookshelf(type: BookType, id: Int) async throws -> RemoveFromBookshelfResponse {
        let request = try buildRequest(
            path: "/api/book-detail/\(type.rawValue)/\(id)/bookshelf",
            method: "DELETE",
            requiresAuth: true
        )
        return try await perform(request)
    }

    func getMyBookshelf(status: String = "all", type: String = "all", sort: String = "added", order: String = "desc", limit: Int = 50, offset: Int = 0) async throws -> BookshelfListResponse {
        let queryItems = [
            URLQueryItem(name: "status", value: status),
            URLQueryItem(name: "type", value: type),
            URLQueryItem(name: "sort", value: sort),
            URLQueryItem(name: "order", value: order),
            URLQueryItem(name: "limit", value: "\(limit)"),
            URLQueryItem(name: "offset", value: "\(offset)")
        ]
        let request = try buildRequest(
            path: "/api/user/bookshelf",
            queryItems: queryItems,
            requiresAuth: true
        )
        return try await perform(request)
    }

    // MARK: - Leaderboard API

    func getLeaderboard(type: String = "friends", week: String? = nil) async throws -> LeaderboardResponse {
        var queryItems = [URLQueryItem(name: "type", value: type)]
        if let week = week {
            queryItems.append(URLQueryItem(name: "week", value: week))
        }
        let request = try buildRequest(
            path: "/api/social/leaderboard",
            queryItems: queryItems,
            requiresAuth: true
        )
        return try await perform(request)
    }

    func likeLeaderboardUser(userId: Int) async throws -> LeaderboardLikeResponse {
        let request = try buildRequest(
            path: "/api/social/leaderboard/\(userId)/like",
            method: "POST",
            requiresAuth: true
        )
        return try await perform(request)
    }

    // MARK: - Badges API

    func getUserBadges() async throws -> APIResponse<UserBadgesResponse> {
        let request = try buildRequest(
            path: "/api/user/badges",
            requiresAuth: true
        )
        return try await perform(request)
    }

    func checkNewBadges() async throws -> APIResponse<NewBadgesResponse> {
        let request = try buildRequest(
            path: "/api/user/badges/check",
            method: "POST",
            requiresAuth: true
        )
        return try await perform(request)
    }

    // MARK: - Social API

    func getUserProfile(userId: Int) async throws -> UserProfileResponse {
        let request = try buildRequest(
            path: "/api/social/users/\(userId)/profile",
            requiresAuth: true
        )
        return try await perform(request)
    }

    func followUser(userId: Int) async throws -> FollowActionResponse {
        let request = try buildRequest(
            path: "/api/social/users/\(userId)/follow",
            method: "POST",
            requiresAuth: true
        )
        return try await perform(request)
    }

    func unfollowUser(userId: Int) async throws -> FollowActionResponse {
        let request = try buildRequest(
            path: "/api/social/users/\(userId)/follow",
            method: "DELETE",
            requiresAuth: true
        )
        return try await perform(request)
    }

    func getFollowers(userId: Int, limit: Int = 20, offset: Int = 0) async throws -> FollowListResponse {
        let queryItems = [
            URLQueryItem(name: "limit", value: "\(limit)"),
            URLQueryItem(name: "offset", value: "\(offset)")
        ]
        let request = try buildRequest(
            path: "/api/social/users/\(userId)/followers",
            queryItems: queryItems,
            requiresAuth: true
        )
        return try await perform(request)
    }

    func getFollowing(userId: Int, limit: Int = 20, offset: Int = 0) async throws -> FollowListResponse {
        let queryItems = [
            URLQueryItem(name: "limit", value: "\(limit)"),
            URLQueryItem(name: "offset", value: "\(offset)")
        ]
        let request = try buildRequest(
            path: "/api/social/users/\(userId)/following",
            queryItems: queryItems,
            requiresAuth: true
        )
        return try await perform(request)
    }

    func getActivityFeed(type: String = "all", limit: Int = 20, offset: Int = 0) async throws -> ActivityFeedResponse {
        let queryItems = [
            URLQueryItem(name: "type", value: type),
            URLQueryItem(name: "limit", value: "\(limit)"),
            URLQueryItem(name: "offset", value: "\(offset)")
        ]
        let request = try buildRequest(
            path: "/api/social/feed",
            queryItems: queryItems,
            requiresAuth: true
        )
        return try await perform(request)
    }

    func getUserActivities(userId: Int, limit: Int = 20, offset: Int = 0) async throws -> ActivityFeedResponse {
        let queryItems = [
            URLQueryItem(name: "limit", value: "\(limit)"),
            URLQueryItem(name: "offset", value: "\(offset)")
        ]
        let request = try buildRequest(
            path: "/api/social/users/\(userId)/activities",
            queryItems: queryItems,
            requiresAuth: true
        )
        return try await perform(request)
    }

    func likeActivity(activityId: Int) async throws -> ActivityLikeResponse {
        let request = try buildRequest(
            path: "/api/social/activities/\(activityId)/like",
            method: "POST",
            requiresAuth: true
        )
        return try await perform(request)
    }

    // MARK: - Generic API Methods

    func get<T: Decodable>(_ path: String, queryItems: [URLQueryItem]? = nil, requiresAuth: Bool = true) async throws -> APIResponse<T> {
        let request = try buildRequest(path: "/api" + path, queryItems: queryItems, requiresAuth: requiresAuth)
        return try await perform(request)
    }

    func get<T: Decodable>(_ path: String, queryParams: [String: String], requiresAuth: Bool = true) async throws -> APIResponse<T> {
        let queryItems = queryParams.map { URLQueryItem(name: $0.key, value: $0.value) }
        let request = try buildRequest(path: "/api" + path, queryItems: queryItems, requiresAuth: requiresAuth)
        return try await perform(request)
    }

    func post<T: Decodable, B: Encodable>(_ path: String, body: B, requiresAuth: Bool = true) async throws -> APIResponse<T> {
        let bodyData = try JSONEncoder().encode(body)
        let request = try buildRequest(path: "/api" + path, method: "POST", body: bodyData, requiresAuth: requiresAuth)
        return try await perform(request)
    }
}
