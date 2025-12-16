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
    let baseURL = "https://bookpost-api-hono.fly.dev"

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
        Log.d("🔐 APIClient.login - Preparing request for email: \(email)")
        let body = try JSONEncoder().encode(["email": email, "password": password])
        if let bodyString = String(data: body, encoding: .utf8) {
            Log.d("🔐 APIClient.login - Request body: \(bodyString)")
        }
        let request = try buildRequest(path: "/api/auth/login", method: "POST", body: body)
        Log.d("🔐 APIClient.login - Request URL: \(request.url?.absoluteString ?? "nil")")
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

    /// Get ebook metadata including s3Key for R2 public access
    func getEbookInfo(id: Int) async throws -> EbookInfoResponse {
        let request = try buildRequest(path: "/api/ebooks/\(id)/info")
        return try await perform(request)
    }

    // MARK: - Categories API (Enhanced)

    /// Get all categories with hierarchy
    /// - Parameters:
    ///   - bookType: Filter by book type ('ebook', 'magazine', or 'all')
    ///   - flat: If true, returns flat list without hierarchy
    func getCategories(bookType: String = "all", flat: Bool = false) async throws -> CategoriesResponse {
        var queryItems: [URLQueryItem] = []
        queryItems.append(URLQueryItem(name: "bookType", value: bookType))
        if flat {
            queryItems.append(URLQueryItem(name: "flat", value: "true"))
        }

        let request = try buildRequest(path: "/api/categories", queryItems: queryItems)
        return try await perform(request)
    }

    /// Get category details by ID
    func getCategory(id: Int) async throws -> CategoryDetailResponse {
        let request = try buildRequest(path: "/api/categories/\(id)")
        return try await perform(request)
    }

    /// Get books in a category
    /// - Parameters:
    ///   - categoryId: The category ID
    ///   - bookType: 'ebook' or 'magazine'
    ///   - page: Page number (1-indexed)
    ///   - limit: Items per page (max 50)
    ///   - sort: Sort order ('newest', 'popular', 'rating')
    ///   - includeChildren: Include books from child categories
    func getCategoryBooks(
        categoryId: Int,
        bookType: String = "ebook",
        page: Int = 1,
        limit: Int = 20,
        sort: String = "newest",
        includeChildren: Bool = true
    ) async throws -> CategoryBooksResponse {
        var queryItems: [URLQueryItem] = []
        queryItems.append(URLQueryItem(name: "bookType", value: bookType))
        queryItems.append(URLQueryItem(name: "page", value: "\(page)"))
        queryItems.append(URLQueryItem(name: "limit", value: "\(limit)"))
        queryItems.append(URLQueryItem(name: "sort", value: sort))
        if includeChildren {
            queryItems.append(URLQueryItem(name: "includeChildren", value: "true"))
        }

        let request = try buildRequest(path: "/api/categories/\(categoryId)/books", queryItems: queryItems)
        return try await perform(request)
    }

    func downloadEbookFile(id: Int, fileType: String? = nil) async throws -> URL {
        Log.i("⬇️ downloadEbookFile: id=\(id), requestedType=\(fileType ?? "auto")")

        // Try R2 public access first if enabled
        if R2Config.isPublicAccessEnabled {
            do {
                let info = try await getEbookInfo(id: id)
                if let s3Key = info.s3Key, let publicURL = R2Config.ebookURL(s3Key: s3Key) {
                    Log.d("📡 Using R2 public URL: \(publicURL.absoluteString)")
                    return try await downloadFile(
                        from: publicURL,
                        id: id,
                        fileType: fileType ?? info.fileType,
                        category: "ebooks"
                    )
                }
            } catch {
                Log.w("⚠️ R2 public access failed, falling back to API proxy: \(error.localizedDescription)")
            }
        }

        // Fallback to API proxy
        Log.d("📡 Using API proxy for download")
        let request = try buildRequest(path: "/api/ebooks/\(id)/file", requiresAuth: true)
        Log.d("📡 Request URL: \(request.url?.absoluteString ?? "nil")")

        let (tempURL, response) = try await session.download(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            Log.e("❌ Invalid response type")
            throw APIError.invalidResponse
        }

        Log.d("📥 Response status: \(httpResponse.statusCode)")
        Log.d("📄 Content-Type: \(httpResponse.value(forHTTPHeaderField: "Content-Type") ?? "nil")")
        Log.d("📦 Content-Length: \(httpResponse.value(forHTTPHeaderField: "Content-Length") ?? "nil")")

        guard (200...299).contains(httpResponse.statusCode) else {
            Log.e("❌ Server error: \(httpResponse.statusCode)")
            throw APIError.serverError(httpResponse.statusCode, nil)
        }

        // Determine file type from parameter, Content-Type header, or default to pdf
        let actualFileType: String
        if let type = fileType?.lowercased(), !type.isEmpty {
            actualFileType = type
            Log.d("📁 Using requested file type: \(actualFileType)")
        } else if let contentType = httpResponse.value(forHTTPHeaderField: "Content-Type") {
            if contentType.contains("epub") {
                actualFileType = "epub"
            } else {
                actualFileType = "pdf"
            }
            Log.d("📁 File type from Content-Type: \(actualFileType)")
        } else {
            actualFileType = "pdf"
            Log.d("📁 Defaulting to pdf")
        }

        // Move to cache directory with correct extension
        let cacheDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
        let fileDir = cacheDir.appendingPathComponent("\(actualFileType)s/ebooks", isDirectory: true)
        try FileManager.default.createDirectory(at: fileDir, withIntermediateDirectories: true)

        let destURL = fileDir.appendingPathComponent("\(id).\(actualFileType)")
        if FileManager.default.fileExists(atPath: destURL.path) {
            try FileManager.default.removeItem(at: destURL)
        }
        try FileManager.default.moveItem(at: tempURL, to: destURL)

        // Verify file was saved
        if let attrs = try? FileManager.default.attributesOfItem(atPath: destURL.path),
           let fileSize = attrs[.size] as? Int64 {
            Log.i("✅ File saved: \(destURL.lastPathComponent), size: \(fileSize) bytes")
        }

        return destURL
    }

    /// Generic file download helper for R2 public URLs
    private func downloadFile(from url: URL, id: Int, fileType: String?, category: String) async throws -> URL {
        let request = URLRequest(url: url)
        let (tempURL, response) = try await session.download(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError(httpResponse.statusCode, nil)
        }

        // Determine file type
        let actualFileType: String
        if let type = fileType?.lowercased(), !type.isEmpty {
            actualFileType = type
        } else if let contentType = httpResponse.value(forHTTPHeaderField: "Content-Type") {
            if contentType.contains("epub") {
                actualFileType = "epub"
            } else if contentType.contains("pdf") {
                actualFileType = "pdf"
            } else {
                actualFileType = url.pathExtension.isEmpty ? "pdf" : url.pathExtension
            }
        } else {
            actualFileType = url.pathExtension.isEmpty ? "pdf" : url.pathExtension
        }

        // Move to cache directory
        let cacheDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
        let fileDir = cacheDir.appendingPathComponent("\(actualFileType)s/\(category)", isDirectory: true)
        try FileManager.default.createDirectory(at: fileDir, withIntermediateDirectories: true)

        let destURL = fileDir.appendingPathComponent("\(id).\(actualFileType)")
        if FileManager.default.fileExists(atPath: destURL.path) {
            try FileManager.default.removeItem(at: destURL)
        }
        try FileManager.default.moveItem(at: tempURL, to: destURL)

        if let attrs = try? FileManager.default.attributesOfItem(atPath: destURL.path),
           let fileSize = attrs[.size] as? Int64 {
            Log.i("✅ File saved: \(destURL.lastPathComponent), size: \(fileSize) bytes")
        }

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

    /// Get magazine metadata including s3Key for R2 public access
    func getMagazineInfo(id: Int) async throws -> MagazineInfoResponse {
        let request = try buildRequest(path: "/api/magazines/\(id)/info")
        return try await perform(request)
    }

    func downloadMagazineFile(id: Int) async throws -> URL {
        Log.i("⬇️ downloadMagazineFile: id=\(id)")

        // Try R2 public access first if enabled
        if R2Config.isPublicAccessEnabled {
            do {
                let info = try await getMagazineInfo(id: id)
                if let s3Key = info.s3Key, let publicURL = R2Config.magazineURL(s3Key: s3Key) {
                    Log.d("📡 Using R2 public URL: \(publicURL.absoluteString)")
                    return try await downloadFile(
                        from: publicURL,
                        id: id,
                        fileType: "pdf",
                        category: "magazines"
                    )
                }
            } catch {
                Log.w("⚠️ R2 public access failed, falling back to API proxy: \(error.localizedDescription)")
            }
        }

        // Fallback to API proxy
        Log.d("📡 Using API proxy for download")
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

    func getReadingHistory(limit: Int? = nil) async throws -> ReadingHistoryItemResponse {
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

    /// Get reading history for a specific book
    func getReadingHistory(itemType: ItemType, itemId: Int) async throws -> SingleReadingHistoryResponse? {
        let queryItems = [
            URLQueryItem(name: "itemType", value: itemType.rawValue),
            URLQueryItem(name: "itemId", value: "\(itemId)")
        ]
        let request = try buildRequest(
            path: "/api/reading-history/item",
            queryItems: queryItems,
            requiresAuth: true
        )
        return try await perform(request)
    }

    /// Update reading progress for a specific book
    func updateReadingProgress(bookType: String, bookId: Int, progress: Double, position: String?) async throws {
        let payload: [String: Any] = [
            "bookType": bookType,
            "bookId": bookId,
            "progress": progress,
            "position": position ?? NSNull()
        ]
        let body = try JSONSerialization.data(withJSONObject: payload)
        let request = try buildRequest(
            path: "/api/reading-history/progress",
            method: "PUT",
            body: body,
            requiresAuth: true
        )
        let _: EmptyResponse = try await perform(request)
    }

    // MARK: - Reading Goals API

    func getReadingGoal() async throws -> APIResponse<ReadingGoalData> {
        let request = try buildRequest(path: "/api/reading-sessions/goals", requiresAuth: true)
        return try await perform(request)
    }

    func getTodayDuration() async throws -> TodayDurationResponse {
        let request = try buildRequest(path: "/api/reading-sessions/today", requiresAuth: true)
        return try await perform(request)
    }

    func setReadingGoal(dailyMinutes: Int) async throws -> SetGoalResponse {
        let body = try JSONEncoder().encode(["dailyMinutes": dailyMinutes])
        let request = try buildRequest(path: "/api/reading-sessions/goals", method: "PUT", body: body, requiresAuth: true)
        return try await perform(request)
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

    func getMyBookshelf(status: String = "all", type: String = "all", sort: String = "added", order: String = "desc", limit: Int = 50, offset: Int = 0, openedOnly: Bool = false) async throws -> BookshelfListResponse {
        var queryItems = [
            URLQueryItem(name: "status", value: status),
            URLQueryItem(name: "type", value: type),
            URLQueryItem(name: "sort", value: sort),
            URLQueryItem(name: "order", value: order),
            URLQueryItem(name: "limit", value: "\(limit)"),
            URLQueryItem(name: "offset", value: "\(offset)")
        ]
        if openedOnly {
            queryItems.append(URLQueryItem(name: "openedOnly", value: "true"))
        }
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

    // MARK: - Notes API

    func getNotes(year: Int? = nil, search: String? = nil, limit: Int = 50, offset: Int = 0) async throws -> NotesListResponse {
        var queryItems = [
            URLQueryItem(name: "limit", value: "\(limit)"),
            URLQueryItem(name: "offset", value: "\(offset)")
        ]
        if let year = year { queryItems.append(URLQueryItem(name: "year", value: "\(year)")) }
        if let search = search, !search.isEmpty { queryItems.append(URLQueryItem(name: "search", value: search)) }

        let request = try buildRequest(
            path: "/api/notes",
            queryItems: queryItems,
            requiresAuth: true
        )
        return try await perform(request)
    }

    func getNoteYears() async throws -> NoteYearsResponse {
        let request = try buildRequest(
            path: "/api/notes/years",
            requiresAuth: true
        )
        return try await perform(request)
    }

    func getNote(id: Int) async throws -> NoteDetailResponse {
        let request = try buildRequest(
            path: "/api/notes/\(id)",
            requiresAuth: true
        )
        return try await perform(request)
    }

    // MARK: - Book Lists API

    /// Browse public book lists with filtering and sorting
    func getBookLists(
        category: String? = nil,
        search: String? = nil,
        sort: String = "popular",
        limit: Int = 20,
        offset: Int = 0
    ) async throws -> BookListsResponse {
        var queryItems = [
            URLQueryItem(name: "sort", value: sort),
            URLQueryItem(name: "limit", value: "\(limit)"),
            URLQueryItem(name: "offset", value: "\(offset)")
        ]
        if let category = category, category != "all" {
            queryItems.append(URLQueryItem(name: "category", value: category))
        }
        if let search = search, !search.isEmpty {
            queryItems.append(URLQueryItem(name: "search", value: search))
        }

        let request = try buildRequest(
            path: "/api/book-lists",
            queryItems: queryItems,
            requiresAuth: AuthManager.shared.isLoggedIn
        )
        return try await perform(request)
    }

    /// Get a single book list with full details
    func getBookList(id: Int) async throws -> BookListResponse {
        let request = try buildRequest(
            path: "/api/book-lists/\(id)",
            requiresAuth: AuthManager.shared.isLoggedIn
        )
        return try await perform(request)
    }

    /// Get items in a book list with pagination
    func getBookListItems(
        listId: Int,
        limit: Int = 50,
        offset: Int = 0
    ) async throws -> BookListItemsResponse {
        let queryItems = [
            URLQueryItem(name: "limit", value: "\(limit)"),
            URLQueryItem(name: "offset", value: "\(offset)")
        ]
        let request = try buildRequest(
            path: "/api/book-lists/\(listId)/items",
            queryItems: queryItems,
            requiresAuth: AuthManager.shared.isLoggedIn
        )
        return try await perform(request)
    }

    /// Get the current user's created and followed lists
    func getMyBookLists() async throws -> UserBookListsResponse {
        let request = try buildRequest(
            path: "/api/user/book-lists",
            requiresAuth: true
        )
        return try await perform(request)
    }

    /// Create a new book list
    func createBookList(request body: CreateBookListRequest) async throws -> BookListResponse {
        let bodyData = try JSONEncoder().encode(body)
        let request = try buildRequest(
            path: "/api/book-lists",
            method: "POST",
            body: bodyData,
            requiresAuth: true
        )
        return try await perform(request)
    }

    /// Update an existing book list
    func updateBookList(id: Int, request body: UpdateBookListRequest) async throws -> BookListResponse {
        let bodyData = try JSONEncoder().encode(body)
        let request = try buildRequest(
            path: "/api/book-lists/\(id)",
            method: "PUT",
            body: bodyData,
            requiresAuth: true
        )
        return try await perform(request)
    }

    /// Delete a book list
    func deleteBookList(id: Int) async throws -> BookListActionResponse {
        let request = try buildRequest(
            path: "/api/book-lists/\(id)",
            method: "DELETE",
            requiresAuth: true
        )
        return try await perform(request)
    }

    /// Add a book to a list
    func addBookToList(listId: Int, request body: AddBookToListRequest) async throws -> AddToListResponse {
        let bodyData = try JSONEncoder().encode(body)
        let request = try buildRequest(
            path: "/api/book-lists/\(listId)/items",
            method: "POST",
            body: bodyData,
            requiresAuth: true
        )
        return try await perform(request)
    }

    /// Update a list item (note or position)
    func updateListItem(listId: Int, itemId: Int, request body: UpdateListItemRequest) async throws -> AddToListResponse {
        let bodyData = try JSONEncoder().encode(body)
        let request = try buildRequest(
            path: "/api/book-lists/\(listId)/items/\(itemId)",
            method: "PUT",
            body: bodyData,
            requiresAuth: true
        )
        return try await perform(request)
    }

    /// Remove a book from a list
    func removeBookFromList(listId: Int, itemId: Int) async throws -> BookListActionResponse {
        let request = try buildRequest(
            path: "/api/book-lists/\(listId)/items/\(itemId)",
            method: "DELETE",
            requiresAuth: true
        )
        return try await perform(request)
    }

    /// Follow or unfollow a book list
    func toggleListFollow(id: Int) async throws -> BookListFollowResponse {
        let request = try buildRequest(
            path: "/api/book-lists/\(id)/follow",
            method: "POST",
            requiresAuth: true
        )
        return try await perform(request)
    }

    /// Get book lists that contain a specific book
    func getBookListsForBook(bookType: String, bookId: Int) async throws -> BookListsResponse {
        let queryItems = [
            URLQueryItem(name: "bookType", value: bookType),
            URLQueryItem(name: "bookId", value: "\(bookId)")
        ]
        let request = try buildRequest(
            path: "/api/book-lists/for-book",
            queryItems: queryItems,
            requiresAuth: AuthManager.shared.isLoggedIn
        )
        return try await perform(request)
    }

    // MARK: - Underlines (Highlights) API

    func getEbookUnderlines(ebookId: Int) async throws -> UnderlineListResponse {
        let request = try buildRequest(path: "/api/ebooks/\(ebookId)/underlines")
        return try await perform(request)
    }

    func createEbookUnderline(ebookId: Int, text: String, pageNumber: Int?, chapterIndex: Int?, paragraphIndex: Int?, startOffset: Int?, endOffset: Int?, cfiRange: String?, color: String? = nil, note: String? = nil) async throws -> UnderlineResponse {
        var params: [String: Any] = ["text": text]
        if let pageNumber = pageNumber { params["paragraph"] = pageNumber } // Using paragraph field for page number in PDFs
        if let chapterIndex = chapterIndex { params["chapterIndex"] = chapterIndex }
        if let paragraphIndex = paragraphIndex { params["paragraphIndex"] = paragraphIndex }
        if let startOffset = startOffset { params["startOffset"] = startOffset }
        if let endOffset = endOffset { params["endOffset"] = endOffset }
        if let cfiRange = cfiRange { params["cfiRange"] = cfiRange }
        if let color = color { params["color"] = color }
        if let note = note { params["note"] = note }

        let body = try JSONSerialization.data(withJSONObject: params)
        let request = try buildRequest(path: "/api/ebooks/\(ebookId)/underlines", method: "POST", body: body, requiresAuth: true)
        return try await perform(request)
    }

    func deleteEbookUnderline(ebookId: Int, underlineId: Int) async throws -> DeleteResponse {
        let request = try buildRequest(path: "/api/ebooks/\(ebookId)/underlines/\(underlineId)", method: "DELETE", requiresAuth: true)
        return try await perform(request)
    }

    func getMagazineUnderlines(magazineId: Int) async throws -> UnderlineListResponse {
        let request = try buildRequest(path: "/api/magazines/\(magazineId)/underlines")
        return try await perform(request)
    }

    func createMagazineUnderline(magazineId: Int, text: String, pageNumber: Int?, startOffset: Int?, endOffset: Int?, color: String? = nil, note: String? = nil) async throws -> UnderlineResponse {
        var params: [String: Any] = ["text": text]
        if let pageNumber = pageNumber { params["pageNumber"] = pageNumber }
        if let startOffset = startOffset { params["startOffset"] = startOffset }
        if let endOffset = endOffset { params["endOffset"] = endOffset }
        if let color = color { params["color"] = color }
        if let note = note { params["note"] = note }

        let body = try JSONSerialization.data(withJSONObject: params)
        let request = try buildRequest(path: "/api/magazines/\(magazineId)/underlines", method: "POST", body: body, requiresAuth: true)
        return try await perform(request)
    }

    func deleteMagazineUnderline(magazineId: Int, underlineId: Int) async throws -> DeleteResponse {
        let request = try buildRequest(path: "/api/magazines/\(magazineId)/underlines/\(underlineId)", method: "DELETE", requiresAuth: true)
        return try await perform(request)
    }

    // MARK: - Ideas API

    /// Get ideas for an ebook underline
    func getEbookUnderlineIdeas(underlineId: Int) async throws -> [Idea] {
        let request = try buildRequest(path: "/api/ebook-underlines/\(underlineId)/ideas", requiresAuth: true)
        let response: IdeasListResponse = try await perform(request)
        return response.data ?? []
    }

    /// Create idea for an ebook underline
    func createEbookUnderlineIdea(underlineId: Int, content: String) async throws -> IdeaResponse {
        let body = try JSONEncoder().encode(IdeaRequest(content: content))
        let request = try buildRequest(path: "/api/ebook-underlines/\(underlineId)/ideas", method: "POST", body: body, requiresAuth: true)
        return try await perform(request)
    }

    /// Update an ebook idea
    func updateEbookIdea(ideaId: Int, content: String) async throws -> IdeaResponse {
        let body = try JSONEncoder().encode(IdeaRequest(content: content))
        let request = try buildRequest(path: "/api/ebook-ideas/\(ideaId)", method: "PATCH", body: body, requiresAuth: true)
        return try await perform(request)
    }

    /// Delete an ebook idea
    func deleteEbookIdea(ideaId: Int) async throws -> DeleteResponse {
        let request = try buildRequest(path: "/api/ebook-ideas/\(ideaId)", method: "DELETE", requiresAuth: true)
        return try await perform(request)
    }

    /// Get ideas for a magazine underline
    func getMagazineUnderlineIdeas(underlineId: Int) async throws -> [Idea] {
        let request = try buildRequest(path: "/api/magazines/magazine-underlines/\(underlineId)/ideas", requiresAuth: true)
        let response: IdeasListResponse = try await perform(request)
        return response.data ?? []
    }

    /// Create idea for a magazine underline
    func createMagazineUnderlineIdea(underlineId: Int, content: String) async throws -> IdeaResponse {
        let body = try JSONEncoder().encode(IdeaRequest(content: content))
        let request = try buildRequest(path: "/api/magazines/magazine-underlines/\(underlineId)/ideas", method: "POST", body: body, requiresAuth: true)
        return try await perform(request)
    }

    /// Update a magazine idea
    func updateMagazineIdea(ideaId: Int, content: String) async throws -> IdeaResponse {
        let body = try JSONEncoder().encode(IdeaRequest(content: content))
        let request = try buildRequest(path: "/api/magazines/magazine-ideas/\(ideaId)", method: "PATCH", body: body, requiresAuth: true)
        return try await perform(request)
    }

    /// Delete a magazine idea
    func deleteMagazineIdea(ideaId: Int) async throws -> DeleteResponse {
        let request = try buildRequest(path: "/api/magazines/magazine-ideas/\(ideaId)", method: "DELETE", requiresAuth: true)
        return try await perform(request)
    }

    // MARK: - AI API

    /// Get AI meaning/explanation for selected text
    /// - Parameters:
    ///   - text: The selected text to explain
    ///   - paragraph: The full paragraph containing the text (for context)
    ///   - targetLanguage: Target language for explanation ("en" or "zh")
    /// - Returns: AI-generated explanation in markdown format
    func getMeaning(text: String, paragraph: String, targetLanguage: String) async throws -> String {
        let payload = MeaningRequest(text: text, paragraph: paragraph, targetLanguage: targetLanguage)
        let body = try JSONEncoder().encode(payload)
        let request = try buildRequest(path: "/api/ai/meaning", method: "POST", body: body, requiresAuth: true)
        let response: AIMeaningAPIResponse = try await perform(request)
        return response.meaning
    }

    /// Get AI explanation for an image
    /// - Parameters:
    ///   - imageData: The image data to analyze
    ///   - targetLanguage: Target language for explanation ("en" or "zh")
    /// - Returns: AI-generated image analysis
    func explainImage(imageData: Data, targetLanguage: String) async throws -> String {
        let base64Image = "data:image/jpeg;base64," + imageData.base64EncodedString()
        let payload = ImageExplainRequest(imageUrl: base64Image, targetLanguage: targetLanguage)
        let body = try JSONEncoder().encode(payload)
        let request = try buildRequest(path: "/api/ai/explain-image", method: "POST", body: body, requiresAuth: true)
        let response: ImageExplainResponse = try await perform(request)
        return response.explanation
    }

    /// Get AI-generated author introduction
    /// - Parameters:
    ///   - authorName: Name of the author
    ///   - bookTitle: Optional book title for context
    ///   - targetLanguage: Target language ("en" or "zh")
    /// - Returns: AI-generated author introduction
    func getAuthorInfo(authorName: String, bookTitle: String?, targetLanguage: String) async throws -> String {
        let payload = AuthorInfoRequest(authorName: authorName, bookTitle: bookTitle, targetLanguage: targetLanguage)
        let body = try JSONEncoder().encode(payload)
        let request = try buildRequest(path: "/api/ai/author-info", method: "POST", body: body, requiresAuth: true)
        let response: AuthorInfoResponse = try await perform(request)
        return response.introduction
    }

    /// Get AI-generated book introduction
    /// - Parameters:
    ///   - bookTitle: Title of the book
    ///   - authorName: Optional author name for context
    ///   - targetLanguage: Target language ("en" or "zh")
    /// - Returns: AI-generated book introduction
    func getBookInfo(bookTitle: String, authorName: String?, targetLanguage: String) async throws -> String {
        let payload = BookInfoRequest(bookTitle: bookTitle, authorName: authorName, targetLanguage: targetLanguage)
        let body = try JSONEncoder().encode(payload)
        let request = try buildRequest(path: "/api/ai/book-info", method: "POST", body: body, requiresAuth: true)
        let response: BookInfoResponse = try await perform(request)
        return response.introduction
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

    // MARK: - User Profile API

    /// Upload user avatar image
    func uploadAvatar(imageData: Data) async throws -> String {
        guard let url = URL(string: baseURL + "/api/user/profile/avatar") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        // Add auth header
        if let token = AuthManager.shared.accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        // Create multipart form data
        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()

        // Add image data
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"image\"; filename=\"avatar.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n".data(using: .utf8)!)
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)

        request.httpBody = body

        do {
            let (data, response) = try await session.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }

            if httpResponse.statusCode == 401 {
                throw APIError.unauthorized
            }

            if httpResponse.statusCode >= 400 {
                throw APIError.serverError(httpResponse.statusCode, nil)
            }

            // Parse response
            struct AvatarResponse: Codable {
                struct Data: Codable {
                    let avatarUrl: String
                }
                let data: Data
            }

            let avatarResponse = try decoder.decode(AvatarResponse.self, from: data)
            return avatarResponse.data.avatarUrl
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.networkError(error)
        }
    }

    // MARK: - Curated Lists API

    /// Get curated lists (external book lists like NYT, Amazon, Bill Gates, etc.)
    func getCuratedLists(
        type: String? = nil,
        year: Int? = nil,
        category: String? = nil,
        featured: Bool? = nil,
        limit: Int = 20,
        offset: Int = 0
    ) async throws -> CuratedListsResponse {
        var queryItems = [
            URLQueryItem(name: "limit", value: "\(limit)"),
            URLQueryItem(name: "offset", value: "\(offset)")
        ]
        if let type = type {
            queryItems.append(URLQueryItem(name: "type", value: type))
        }
        if let year = year {
            queryItems.append(URLQueryItem(name: "year", value: "\(year)"))
        }
        if let category = category {
            queryItems.append(URLQueryItem(name: "category", value: category))
        }
        if let featured = featured, featured {
            queryItems.append(URLQueryItem(name: "featured", value: "true"))
        }

        let request = try buildRequest(
            path: "/api/curated-lists",
            queryItems: queryItems
        )
        return try await perform(request)
    }

    /// Get curated list detail with books
    func getCuratedList(id: Int) async throws -> CuratedListDetailResponse {
        let request = try buildRequest(path: "/api/curated-lists/\(id)")
        return try await perform(request)
    }

    /// Get available list types
    func getCuratedListTypes() async throws -> CuratedListTypesResponse {
        let request = try buildRequest(path: "/api/curated-lists/types")
        return try await perform(request)
    }

    /// Get unavailable books (admin)
    func getUnavailableBooks(limit: Int = 50, offset: Int = 0) async throws -> UnavailableBooksResponse {
        let queryItems = [
            URLQueryItem(name: "limit", value: "\(limit)"),
            URLQueryItem(name: "offset", value: "\(offset)")
        ]
        let request = try buildRequest(
            path: "/api/curated-lists/admin/unavailable-books",
            queryItems: queryItems,
            requiresAuth: true
        )
        return try await perform(request)
    }

    /// Get curated lists statistics (admin)
    func getCuratedListStats() async throws -> CuratedListStatsResponse {
        let request = try buildRequest(
            path: "/api/curated-lists/admin/stats",
            requiresAuth: true
        )
        return try await perform(request)
    }

    // MARK: - Store API

    /// Get books grouped by publication year
    /// - Parameters:
    ///   - bookType: 'ebook' or 'magazine'
    ///   - limit: Number of books per year
    ///   - years: Optional comma-separated years (defaults to last 3 years)
    func getBooksByYear(bookType: String = "ebook", limit: Int = 10, years: String? = nil) async throws -> BooksByYearResponse {
        var queryItems = [
            URLQueryItem(name: "bookType", value: bookType),
            URLQueryItem(name: "limit", value: "\(limit)")
        ]
        if let years = years {
            queryItems.append(URLQueryItem(name: "years", value: years))
        }
        let request = try buildRequest(
            path: "/api/store/books-by-year",
            queryItems: queryItems
        )
        return try await perform(request)
    }

    /// Get highest rated books
    /// - Parameters:
    ///   - bookType: 'ebook' or 'magazine'
    ///   - limit: Number of books to return
    ///   - minRatingCount: Minimum number of ratings required
    func getTopRatedBooks(bookType: String = "ebook", limit: Int = 10, minRatingCount: Int = 10) async throws -> TopRatedResponse {
        let queryItems = [
            URLQueryItem(name: "bookType", value: bookType),
            URLQueryItem(name: "limit", value: "\(limit)"),
            URLQueryItem(name: "minRatingCount", value: "\(minRatingCount)")
        ]
        let request = try buildRequest(
            path: "/api/store/top-rated",
            queryItems: queryItems
        )
        return try await perform(request)
    }

    /// Get external ranking lists (NYT, Amazon, etc.)
    /// - Parameter bookType: 'ebook' or 'magazine'
    func getExternalRankings(bookType: String = "ebook") async throws -> ExternalRankingsResponse {
        let queryItems = [
            URLQueryItem(name: "bookType", value: bookType)
        ]
        let request = try buildRequest(
            path: "/api/store/external-rankings",
            queryItems: queryItems
        )
        return try await perform(request)
    }

    /// Get external ranking detail with books
    /// - Parameters:
    ///   - id: Ranking ID
    ///   - limit: Number of books to return
    ///   - offset: Offset for pagination
    func getExternalRankingDetail(id: Int, limit: Int = 50, offset: Int = 0) async throws -> ExternalRankingDetailResponse {
        let queryItems = [
            URLQueryItem(name: "limit", value: "\(limit)"),
            URLQueryItem(name: "offset", value: "\(offset)")
        ]
        let request = try buildRequest(
            path: "/api/store/external-rankings/\(id)",
            queryItems: queryItems
        )
        return try await perform(request)
    }

    // MARK: - Editor Picks

    /// Get editor pick lists
    /// - Parameters:
    ///   - limit: Number of lists to return
    ///   - offset: Offset for pagination
    func getEditorPicks(limit: Int = 20, offset: Int = 0) async throws -> EditorPicksResponse {
        let queryItems = [
            URLQueryItem(name: "limit", value: "\(limit)"),
            URLQueryItem(name: "offset", value: "\(offset)")
        ]
        let request = try buildRequest(
            path: "/api/store/editor-picks",
            queryItems: queryItems
        )
        return try await perform(request)
    }

    // MARK: - Book Series

    /// Get book series lists
    /// - Parameters:
    ///   - limit: Number of lists to return
    ///   - offset: Offset for pagination
    func getBookSeries(limit: Int = 20, offset: Int = 0) async throws -> BookSeriesResponse {
        let queryItems = [
            URLQueryItem(name: "limit", value: "\(limit)"),
            URLQueryItem(name: "offset", value: "\(offset)")
        ]
        let request = try buildRequest(
            path: "/api/store/book-series",
            queryItems: queryItems
        )
        return try await perform(request)
    }

    // MARK: - Weekly Picks

    /// Get weekly pick lists
    /// - Parameters:
    ///   - limit: Number of lists to return
    ///   - offset: Offset for pagination
    func getWeeklyPicks(limit: Int = 20, offset: Int = 0) async throws -> WeeklyPicksResponse {
        let queryItems = [
            URLQueryItem(name: "limit", value: "\(limit)"),
            URLQueryItem(name: "offset", value: "\(offset)")
        ]
        let request = try buildRequest(
            path: "/api/store/weekly-picks",
            queryItems: queryItems
        )
        return try await perform(request)
    }

    // MARK: - Celebrity Picks

    /// Get celebrity recommendation lists (e.g., Bill Gates)
    /// - Parameters:
    ///   - limit: Number of lists to return
    ///   - offset: Offset for pagination
    func getCelebrityPicks(limit: Int = 20, offset: Int = 0) async throws -> CelebrityPicksResponse {
        let queryItems = [
            URLQueryItem(name: "limit", value: "\(limit)"),
            URLQueryItem(name: "offset", value: "\(offset)")
        ]
        let request = try buildRequest(
            path: "/api/store/celebrity-picks",
            queryItems: queryItems
        )
        return try await perform(request)
    }

    // MARK: - Biographies

    /// Get biography book lists
    /// - Parameters:
    ///   - limit: Number of lists to return
    ///   - offset: Offset for pagination
    func getBiographies(limit: Int = 20, offset: Int = 0) async throws -> BiographiesResponse {
        let queryItems = [
            URLQueryItem(name: "limit", value: "\(limit)"),
            URLQueryItem(name: "offset", value: "\(offset)")
        ]
        let request = try buildRequest(
            path: "/api/store/biographies",
            queryItems: queryItems
        )
        return try await perform(request)
    }

    // MARK: - Awards

    /// Get literary award lists (Pulitzer, Booker, Newbery, etc.)
    /// - Parameters:
    ///   - limit: Number of lists to return
    ///   - offset: Offset for pagination
    func getAwards(limit: Int = 20, offset: Int = 0) async throws -> AwardsResponse {
        let queryItems = [
            URLQueryItem(name: "limit", value: "\(limit)"),
            URLQueryItem(name: "offset", value: "\(offset)")
        ]
        let request = try buildRequest(
            path: "/api/store/awards",
            queryItems: queryItems
        )
        return try await perform(request)
    }

    // MARK: - Platform-Specific Lists

    /// Get New York Times bestseller lists
    /// - Parameters:
    ///   - limit: Number of lists to return
    ///   - offset: Offset for pagination
    func getNYTLists(limit: Int = 20, offset: Int = 0) async throws -> NYTListsResponse {
        let queryItems = [
            URLQueryItem(name: "limit", value: "\(limit)"),
            URLQueryItem(name: "offset", value: "\(offset)")
        ]
        let request = try buildRequest(
            path: "/api/store/nyt-lists",
            queryItems: queryItems
        )
        return try await perform(request)
    }

    /// Get Amazon best book lists
    /// - Parameters:
    ///   - limit: Number of lists to return
    ///   - offset: Offset for pagination
    func getAmazonLists(limit: Int = 20, offset: Int = 0) async throws -> AmazonListsResponse {
        let queryItems = [
            URLQueryItem(name: "limit", value: "\(limit)"),
            URLQueryItem(name: "offset", value: "\(offset)")
        ]
        let request = try buildRequest(
            path: "/api/store/amazon-lists",
            queryItems: queryItems
        )
        return try await perform(request)
    }

    /// Get Goodreads choice book lists
    /// - Parameters:
    ///   - limit: Number of lists to return
    ///   - offset: Offset for pagination
    func getGoodreadsLists(limit: Int = 20, offset: Int = 0) async throws -> GoodreadsListsResponse {
        let queryItems = [
            URLQueryItem(name: "limit", value: "\(limit)"),
            URLQueryItem(name: "offset", value: "\(offset)")
        ]
        let request = try buildRequest(
            path: "/api/store/goodreads-lists",
            queryItems: queryItems
        )
        return try await perform(request)
    }

    // MARK: - Award-Specific Lists

    /// Get Pulitzer Prize winning book lists
    /// - Parameters:
    ///   - limit: Number of lists to return
    ///   - offset: Offset for pagination
    func getPulitzerAwards(limit: Int = 20, offset: Int = 0) async throws -> PulitzerAwardsResponse {
        let queryItems = [
            URLQueryItem(name: "limit", value: "\(limit)"),
            URLQueryItem(name: "offset", value: "\(offset)")
        ]
        let request = try buildRequest(
            path: "/api/store/pulitzer-awards",
            queryItems: queryItems
        )
        return try await perform(request)
    }

    /// Get Booker Prize winning book lists (includes International Booker)
    /// - Parameters:
    ///   - limit: Number of lists to return
    ///   - offset: Offset for pagination
    func getBookerAwards(limit: Int = 20, offset: Int = 0) async throws -> BookerAwardsResponse {
        let queryItems = [
            URLQueryItem(name: "limit", value: "\(limit)"),
            URLQueryItem(name: "offset", value: "\(offset)")
        ]
        let request = try buildRequest(
            path: "/api/store/booker-awards",
            queryItems: queryItems
        )
        return try await perform(request)
    }

    /// Get Newbery Medal winning book lists
    /// - Parameters:
    ///   - limit: Number of lists to return
    ///   - offset: Offset for pagination
    func getNewberyAwards(limit: Int = 20, offset: Int = 0) async throws -> NewberyAwardsResponse {
        let queryItems = [
            URLQueryItem(name: "limit", value: "\(limit)"),
            URLQueryItem(name: "offset", value: "\(offset)")
        ]
        let request = try buildRequest(
            path: "/api/store/newbery-awards",
            queryItems: queryItems
        )
        return try await perform(request)
    }
}
