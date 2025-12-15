import SwiftUI

/// Enhanced Book Detail View supporting both ebooks and magazines
/// Features: book metadata, community stats, reviews, and user bookshelf status
struct BookDetailView: View {
    let bookType: BookType
    let bookId: Int

    @State private var detail: BookDetailData?
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showReader = false
    @State private var showAllReviews = false
    @State private var showReviewForm = false
    @State private var myReview: BookReview?
    @State private var isLoadingMyReview = false
    @State private var bookshelfStatus: BookshelfStatus?
    @State private var isUpdatingBookshelf = false
    @State private var showBookshelfMenu = false
    @State private var showRemoveConfirm = false
    @EnvironmentObject private var authManager: AuthManager

    var body: some View {
        Group {
            if isLoading {
                LoadingView()
            } else if let error = errorMessage {
                ErrorView(message: error) {
                    Task { await loadDetail() }
                }
            } else if let detail = detail {
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        // Hero section with cover and basic info
                        heroSection(book: detail.book)

                        // Read button
                        readButton(book: detail.book)

                        // Stats section
                        if detail.stats.hasActivity {
                            statsSection(stats: detail.stats)
                        }

                        // User bookshelf actions (for logged-in users)
                        if authManager.isLoggedIn {
                            bookshelfSection(userStatus: detail.userStatus)
                        }

                        // Description section
                        if let description = detail.book.description, !description.isEmpty {
                            descriptionSection(description: description)
                        }

                        // Book metadata details
                        metadataSection(book: detail.book)

                        // Reviews section
                        reviewsSection(reviews: detail.recentReviews, totalReviews: detail.stats.totalReviews)
                    }
                    .padding(.vertical)
                }
            }
        }
        .navigationTitle(detail?.book.title ?? "详情")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadDetail()
        }
        .fullScreenCover(isPresented: $showReader) {
            if let book = detail?.book {
                ReaderContainerView(
                    bookType: bookType.rawValue,
                    bookId: book.id,
                    title: book.title,
                    fileType: book.fileType ?? "pdf",
                    coverUrl: book.coverUrl
                )
            }
        }
        .sheet(isPresented: $showAllReviews) {
            if let book = detail?.book {
                AllReviewsView(bookType: bookType, bookId: book.id)
            }
        }
        .sheet(isPresented: $showReviewForm) {
            if let book = detail?.book {
                ReviewFormView(
                    bookType: bookType,
                    bookId: book.id,
                    bookTitle: book.title,
                    existingReview: myReview,
                    onSaved: { savedReview in
                        myReview = savedReview
                        // Refresh detail to update stats and reviews
                        Task { await loadDetail() }
                    },
                    onDeleted: {
                        myReview = nil
                        // Refresh detail to update stats and reviews
                        Task { await loadDetail() }
                    }
                )
            }
        }
    }

    // MARK: - Hero Section

    @ViewBuilder
    private func heroSection(book: BookMetadata) -> some View {
        HStack(alignment: .top, spacing: 16) {
            BookCoverView(coverUrl: book.coverUrl, title: book.title)
                .frame(width: 140, height: 200)
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .shadow(radius: 4)

            VStack(alignment: .leading, spacing: 8) {
                Text(book.title)
                    .font(.title3)
                    .fontWeight(.bold)
                    .lineLimit(3)

                if let author = book.author, !author.isEmpty {
                    Label(author, systemImage: "person")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                if let translator = book.translator, !translator.isEmpty {
                    Label("译者: \(translator)", systemImage: "text.quote")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                HStack(spacing: 12) {
                    if let fileType = book.fileType {
                        Label(fileType.uppercased(), systemImage: "doc")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    if let fileSize = book.fileSize {
                        Label(book.formattedFileSize, systemImage: "arrow.down.circle")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                if let rating = detail?.stats.formattedRating {
                    HStack(spacing: 4) {
                        Image(systemName: "star.fill")
                            .foregroundColor(.yellow)
                        Text(rating)
                            .fontWeight(.semibold)
                        Text("(\(detail?.stats.ratingCount ?? 0))")
                            .foregroundColor(.secondary)
                    }
                    .font(.subheadline)
                }
            }
        }
        .padding(.horizontal)
    }

    // MARK: - Read Button

    @ViewBuilder
    private func readButton(book: BookMetadata) -> some View {
        Button(action: {
            Log.i("📖 Read button tapped: id=\(book.id), title=\(book.title), fileType=\(book.fileType ?? "nil")")
            showReader = true
        }) {
            HStack {
                Image(systemName: "book.fill")
                Text(L10n.Ebooks.startReading)
            }
            .fontWeight(.semibold)
            .frame(maxWidth: .infinity)
            .frame(height: 50)
        }
        .buttonStyle(.borderedProminent)
        .padding(.horizontal)
    }

    // MARK: - Stats Section

    @ViewBuilder
    private func statsSection(stats: BookStats) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("社区数据")
                .font(.headline)

            HStack(spacing: 0) {
                statItem(value: "\(stats.totalReaders)", label: "读者", icon: "person.2")
                Divider().frame(height: 40)
                statItem(value: "\(stats.totalHighlights)", label: "划线", icon: "highlighter")
                Divider().frame(height: 40)
                statItem(value: "\(stats.totalReviews)", label: "评论", icon: "text.bubble")
                if let percent = stats.formattedRecommendPercent {
                    Divider().frame(height: 40)
                    statItem(value: percent, label: "推荐", icon: "hand.thumbsup")
                }
            }
            .padding(.vertical, 12)
            .background(Color(.systemGray6))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .padding(.horizontal)
    }

    @ViewBuilder
    private func statItem(value: String, label: String, icon: String) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(.accentColor)
            Text(value)
                .font(.headline)
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Bookshelf Section

    @ViewBuilder
    private func bookshelfSection(userStatus: UserBookshelfStatus?) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("我的书架")
                .font(.headline)

            if let currentStatus = bookshelfStatus {
                // Book is on shelf - show status and actions
                VStack(spacing: 12) {
                    // Current status display
                    HStack(spacing: 16) {
                        Label(currentStatus.displayName, systemImage: currentStatus.iconName)
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(statusColor(currentStatus).opacity(0.15))
                            .foregroundColor(statusColor(currentStatus))
                            .clipShape(Capsule())

                        if let progress = userStatus?.formattedProgress {
                            Label("进度: \(progress)", systemImage: "chart.bar.fill")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }

                        Spacer()
                    }

                    // Action buttons
                    HStack(spacing: 12) {
                        // Change status menu
                        Menu {
                            ForEach([BookshelfStatus.wantToRead, .reading, .finished, .abandoned], id: \.self) { status in
                                if status != currentStatus {
                                    Button {
                                        Task { await updateBookshelfStatus(status) }
                                    } label: {
                                        Label(status.displayName, systemImage: status.iconName)
                                    }
                                }
                            }
                        } label: {
                            Label("更改状态", systemImage: "arrow.triangle.2.circlepath")
                                .font(.subheadline)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 10)
                                .background(Color(.systemGray6))
                                .cornerRadius(8)
                        }
                        .disabled(isUpdatingBookshelf)

                        // Remove button
                        Button(role: .destructive) {
                            showRemoveConfirm = true
                        } label: {
                            Label("移除", systemImage: "trash")
                                .font(.subheadline)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 10)
                                .background(Color.red.opacity(0.1))
                                .foregroundColor(.red)
                                .cornerRadius(8)
                        }
                        .disabled(isUpdatingBookshelf)
                    }
                }
            } else {
                // Book not on shelf - show add buttons
                HStack(spacing: 12) {
                    ForEach([BookshelfStatus.wantToRead, .reading], id: \.self) { status in
                        Button {
                            Task { await addToBookshelf(status: status) }
                        } label: {
                            Label(status.displayName, systemImage: status.iconName)
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(statusColor(status).opacity(0.15))
                                .foregroundColor(statusColor(status))
                                .cornerRadius(8)
                        }
                        .disabled(isUpdatingBookshelf)
                    }
                }
            }

            if isUpdatingBookshelf {
                HStack {
                    ProgressView()
                        .scaleEffect(0.8)
                    Text("更新中...")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(.horizontal)
        .confirmationDialog("移除书籍", isPresented: $showRemoveConfirm) {
            Button("从书架移除", role: .destructive) {
                Task { await removeFromBookshelf() }
            }
            Button("取消", role: .cancel) {}
        } message: {
            Text("确定要将这本书从书架移除吗？")
        }
    }

    private func statusColor(_ status: BookshelfStatus) -> Color {
        switch status {
        case .wantToRead: return .blue
        case .reading: return .orange
        case .finished: return .green
        case .abandoned: return .gray
        }
    }

    private func addToBookshelf(status: BookshelfStatus) async {
        isUpdatingBookshelf = true
        do {
            _ = try await APIClient.shared.addToBookshelf(type: bookType, id: bookId, status: status)
            bookshelfStatus = status
            // Refresh detail to update stats
            await loadDetail()
        } catch {
            Log.e("Failed to add to bookshelf", error: error)
        }
        isUpdatingBookshelf = false
    }

    private func updateBookshelfStatus(_ status: BookshelfStatus) async {
        isUpdatingBookshelf = true
        do {
            _ = try await APIClient.shared.updateBookshelf(type: bookType, id: bookId, status: status)
            bookshelfStatus = status
            // Refresh detail to update stats
            await loadDetail()
        } catch {
            Log.e("Failed to update bookshelf status", error: error)
        }
        isUpdatingBookshelf = false
    }

    private func removeFromBookshelf() async {
        isUpdatingBookshelf = true
        do {
            _ = try await APIClient.shared.removeFromBookshelf(type: bookType, id: bookId)
            bookshelfStatus = nil
            // Refresh detail to update stats
            await loadDetail()
        } catch {
            Log.e("Failed to remove from bookshelf", error: error)
        }
        isUpdatingBookshelf = false
    }

    // MARK: - Description Section

    @ViewBuilder
    private func descriptionSection(description: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("简介")
                .font(.headline)

            Text(description)
                .font(.body)
                .foregroundColor(.secondary)
                .lineLimit(6)
        }
        .padding(.horizontal)
    }

    // MARK: - Metadata Section

    @ViewBuilder
    private func metadataSection(book: BookMetadata) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("详细信息")
                .font(.headline)

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 12) {
                if let publisher = book.publisher {
                    metadataItem(label: "出版社", value: publisher)
                }
                if let publicationDate = book.publicationDate {
                    metadataItem(label: "出版日期", value: publicationDate)
                }
                if let isbn = book.isbn {
                    metadataItem(label: "ISBN", value: isbn)
                }
                if let language = book.language {
                    metadataItem(label: "语言", value: languageDisplayName(language))
                }
                if let pageCount = book.pageCount {
                    metadataItem(label: "页数", value: "\(pageCount) 页")
                }
                if let wordCount = book.wordCount {
                    metadataItem(label: "字数", value: formatWordCount(wordCount))
                }
                if let issueNumber = book.issueNumber {
                    metadataItem(label: "期号", value: issueNumber)
                }
                if let issn = book.issn {
                    metadataItem(label: "ISSN", value: issn)
                }
            }
        }
        .padding(.horizontal)
    }

    @ViewBuilder
    private func metadataItem(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
            Text(value)
                .font(.subheadline)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Reviews Section

    @ViewBuilder
    private func reviewsSection(reviews: [BookReview], totalReviews: Int) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("书评")
                    .font(.headline)

                Spacer()

                if totalReviews > reviews.count {
                    Button("查看全部 (\(totalReviews))") {
                        showAllReviews = true
                    }
                    .font(.subheadline)
                }
            }

            // Write review button
            if authManager.isLoggedIn {
                Button {
                    Task {
                        await loadMyReview()
                        showReviewForm = true
                    }
                } label: {
                    HStack {
                        Image(systemName: myReview != nil ? "pencil" : "square.and.pencil")
                        Text(myReview != nil ? "编辑我的评论" : "写评论")
                    }
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.accentColor.opacity(0.1))
                    .foregroundColor(.accentColor)
                    .cornerRadius(8)
                }
                .disabled(isLoadingMyReview)
            }

            // My review (if exists and not already in the list)
            if let myReview = myReview, !reviews.contains(where: { $0.id == myReview.id }) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("我的评论")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    ReviewCard(review: myReview, isOwn: true, onEdit: {
                        showReviewForm = true
                    })
                }
            }

            // Other reviews
            if reviews.isEmpty && myReview == nil {
                VStack(spacing: 8) {
                    Image(systemName: "text.bubble")
                        .font(.largeTitle)
                        .foregroundColor(.secondary.opacity(0.5))
                    Text("暂无评论")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Text("成为第一个评论的读者")
                        .font(.caption)
                        .foregroundColor(.secondary.opacity(0.8))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 20)
            } else {
                ForEach(reviews.prefix(3)) { review in
                    ReviewCard(review: review, isOwn: review.id == myReview?.id, onEdit: review.id == myReview?.id ? {
                        showReviewForm = true
                    } : nil)
                }
            }
        }
        .padding(.horizontal)
    }

    private func loadMyReview() async {
        guard authManager.isLoggedIn else { return }
        isLoadingMyReview = true
        do {
            let response = try await APIClient.shared.getMyReview(type: bookType, id: bookId)
            myReview = response.data
        } catch {
            // User hasn't reviewed yet, that's fine
            myReview = nil
        }
        isLoadingMyReview = false
    }

    // MARK: - Helper Methods

    private func loadDetail() async {
        isLoading = true
        errorMessage = nil

        do {
            let response = try await APIClient.shared.getBookDetail(type: bookType, id: bookId)
            detail = response.data
            // Sync bookshelf status from response
            bookshelfStatus = response.data.userStatus?.status
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    private func languageDisplayName(_ code: String) -> String {
        switch code.lowercased() {
        case "zh": return "中文"
        case "en": return "English"
        case "ja": return "日本語"
        case "ko": return "한국어"
        default: return code
        }
    }

    private func formatWordCount(_ count: Int) -> String {
        if count >= 10000 {
            return String(format: "%.1f 万字", Double(count) / 10000.0)
        }
        return "\(count) 字"
    }
}

// MARK: - Review Card Component

struct ReviewCard: View {
    let review: BookReview
    var isOwn: Bool = false
    var onEdit: (() -> Void)? = nil

    @State private var isLiked = false
    @State private var likesCount: Int
    @State private var isTogglingLike = false

    init(review: BookReview, isOwn: Bool = false, onEdit: (() -> Void)? = nil) {
        self.review = review
        self.isOwn = isOwn
        self.onEdit = onEdit
        _likesCount = State(initialValue: review.likesCount)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                // User avatar
                Circle()
                    .fill(Color.accentColor.opacity(0.2))
                    .frame(width: 32, height: 32)
                    .overlay(
                        Text(String(review.user.username.prefix(1)).uppercased())
                            .font(.caption)
                            .fontWeight(.semibold)
                    )

                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 4) {
                        Text(review.user.username)
                            .font(.subheadline)
                            .fontWeight(.medium)

                        if isOwn {
                            Text("(我)")
                                .font(.caption)
                                .foregroundColor(.accentColor)
                        }
                    }

                    if let progress = review.formattedReadingProgress {
                        Text("阅读进度 \(progress)")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()

                if review.isFeatured {
                    Label("精选", systemImage: "star.fill")
                        .font(.caption2)
                        .foregroundColor(.yellow)
                }

                // Edit button for own review
                if isOwn, let onEdit = onEdit {
                    Button {
                        onEdit()
                    } label: {
                        Image(systemName: "pencil.circle")
                            .font(.title3)
                            .foregroundColor(.accentColor)
                    }
                }
            }

            // Rating or recommendation
            HStack {
                if let rating = review.rating {
                    HStack(spacing: 2) {
                        ForEach(0..<5) { index in
                            Image(systemName: index < rating ? "star.fill" : "star")
                                .font(.caption2)
                                .foregroundColor(.yellow)
                        }
                    }
                }

                if review.isRecommended {
                    Label("推荐", systemImage: "hand.thumbsup.fill")
                        .font(.caption)
                        .foregroundColor(.green)
                } else if review.isNotRecommended {
                    Label("不推荐", systemImage: "hand.thumbsdown.fill")
                        .font(.caption)
                        .foregroundColor(.red)
                }
            }

            // Review title and content
            if let title = review.title, !title.isEmpty {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
            }

            Text(review.content)
                .font(.body)
                .foregroundColor(.secondary)
                .lineLimit(4)

            // Footer with likes and date
            HStack {
                // Like button (disabled for own review)
                Button {
                    Task { await toggleLike() }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: isLiked ? "heart.fill" : "heart")
                            .foregroundColor(isLiked ? .red : .secondary)
                        Text("\(likesCount)")
                            .foregroundColor(.secondary)
                    }
                    .font(.caption)
                }
                .disabled(isOwn || isTogglingLike)
                .buttonStyle(.plain)

                Spacer()

                if let createdAt = review.createdAt {
                    Text(formatRelativeDate(createdAt))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .task {
            await checkLikedStatus()
        }
    }

    private func toggleLike() async {
        guard !isOwn else { return }
        isTogglingLike = true

        do {
            let response = try await APIClient.shared.toggleReviewLike(reviewId: review.id)
            withAnimation(.easeInOut(duration: 0.2)) {
                isLiked = response.liked
                likesCount = response.likesCount
            }
        } catch {
            Log.e("Failed to toggle like", error: error)
        }

        isTogglingLike = false
    }

    private func checkLikedStatus() async {
        // Only check if not own review
        guard !isOwn else { return }

        do {
            let response = try await APIClient.shared.checkReviewLiked(reviewId: review.id)
            isLiked = response.liked
        } catch {
            // Silently fail - user might not be logged in
        }
    }

    private func formatRelativeDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: dateString) else { return dateString }

        let relativeFormatter = RelativeDateTimeFormatter()
        relativeFormatter.unitsStyle = .short
        return relativeFormatter.localizedString(for: date, relativeTo: Date())
    }
}

// MARK: - All Reviews View

struct AllReviewsView: View {
    let bookType: BookType
    let bookId: Int

    @Environment(\.dismiss) private var dismiss
    @State private var reviews: [BookReview] = []
    @State private var isLoading = false
    @State private var hasMore = false
    @State private var offset = 0
    @State private var sortOption = "newest"

    var body: some View {
        NavigationStack {
            Group {
                if reviews.isEmpty && isLoading {
                    LoadingView()
                } else if reviews.isEmpty {
                    ContentUnavailableView("暂无评论", systemImage: "text.bubble")
                } else {
                    List {
                        ForEach(reviews) { review in
                            ReviewCard(review: review)
                                .listRowInsets(EdgeInsets())
                                .listRowBackground(Color.clear)
                                .padding(.vertical, 4)
                        }

                        if hasMore {
                            Button("加载更多") {
                                Task { await loadMore() }
                            }
                            .frame(maxWidth: .infinity)
                            .disabled(isLoading)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("全部评论")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("关闭") { dismiss() }
                }

                ToolbarItem(placement: .primaryAction) {
                    Menu {
                        Picker("排序", selection: $sortOption) {
                            Text("最新").tag("newest")
                            Text("最早").tag("oldest")
                            Text("最高分").tag("highest")
                            Text("最有用").tag("helpful")
                        }
                    } label: {
                        Image(systemName: "arrow.up.arrow.down")
                    }
                }
            }
            .onChange(of: sortOption) { _, _ in
                offset = 0
                reviews = []
                Task { await loadReviews() }
            }
            .task {
                await loadReviews()
            }
        }
    }

    private func loadReviews() async {
        isLoading = true

        do {
            let response = try await APIClient.shared.getBookReviews(
                type: bookType,
                id: bookId,
                limit: 20,
                offset: 0,
                sort: sortOption
            )
            reviews = response.data
            hasMore = response.hasMore
            offset = reviews.count
        } catch {
            Log.e("Failed to load reviews", error: error)
        }

        isLoading = false
    }

    private func loadMore() async {
        guard !isLoading else { return }
        isLoading = true

        do {
            let response = try await APIClient.shared.getBookReviews(
                type: bookType,
                id: bookId,
                limit: 20,
                offset: offset,
                sort: sortOption
            )
            reviews.append(contentsOf: response.data)
            hasMore = response.hasMore
            offset = reviews.count
        } catch {
            Log.e("Failed to load more reviews", error: error)
        }

        isLoading = false
    }
}

#Preview {
    NavigationStack {
        BookDetailView(bookType: .ebook, bookId: 4120)
    }
}
