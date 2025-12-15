import SwiftUI

/// Enhanced Book Detail View supporting both ebooks and magazines
/// Features: WeChat Reading-style layout with fixed bottom action bar
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
    @State private var showRemoveConfirm = false
    @State private var showStatusMenu = false
    @State private var isDescriptionCollapsed = false
    @State private var showAuthorInfo = false
    @State private var showBookInfo = false
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
                    VStack(alignment: .leading, spacing: 20) {
                        // Compact hero section
                        heroSection(book: detail.book)

                        // 4-column stats bar
                        statsBar(book: detail.book, stats: detail.stats, userStatus: detail.userStatus)

                        // Recommendation section
                        if detail.stats.recommendPercent != nil {
                            recommendationSection(stats: detail.stats)
                        }

                        // Description section
                        if let description = detail.book.description, !description.isEmpty {
                            descriptionSection(description: description)
                        }

                        // Reviews section
                        reviewsSection(reviews: detail.recentReviews, totalReviews: detail.stats.totalReviews)
                    }
                    .padding(.vertical)
                    .padding(.bottom, 80) // Space for bottom bar
                }
                .safeAreaInset(edge: .bottom) {
                    bottomActionBar(book: detail.book)
                }
            }
        }
        .navigationTitle(detail?.book.title ?? L10n.Common.details)
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
        .sheet(isPresented: $showAuthorInfo) {
            if let book = detail?.book, let author = book.author {
                AIInfoSheetView(
                    type: .author,
                    title: author,
                    subtitle: book.title
                )
            }
        }
        .sheet(isPresented: $showBookInfo) {
            if let book = detail?.book {
                AIInfoSheetView(
                    type: .book,
                    title: book.title,
                    subtitle: book.author
                )
            }
        }
    }

    // MARK: - Hero Section (Compact WeChat Reading Style)

    @ViewBuilder
    private func heroSection(book: BookMetadata) -> some View {
        HStack(alignment: .top, spacing: 16) {
            // Tappable cover image with AI info
            Button {
                showBookInfo = true
            } label: {
                ZStack(alignment: .bottomTrailing) {
                    BookCoverView(coverUrl: book.coverUrl, title: book.title)
                        .frame(width: 100, height: 140)
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                        .shadow(color: .black.opacity(0.15), radius: 4, x: 0, y: 2)

                    // AI hint badge
                    ZStack {
                        Circle()
                            .fill(Color.purple.opacity(0.9))
                            .frame(width: 24, height: 24)
                        Image(systemName: "sparkles")
                            .font(.system(size: 12))
                            .foregroundColor(.white)
                    }
                    .offset(x: 4, y: 4)
                }
            }
            .buttonStyle(.plain)

            VStack(alignment: .leading, spacing: 6) {
                // Title
                Text(book.title)
                    .font(.headline)
                    .fontWeight(.bold)
                    .lineLimit(2)

                // Author (tappable with AI info)
                if let author = book.author, !author.isEmpty {
                    Button {
                        showAuthorInfo = true
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "person.fill")
                                .font(.caption)
                            Text(author)
                                .font(.subheadline)
                            Image(systemName: "sparkles")
                                .font(.caption2)
                                .foregroundColor(.purple)
                            Image(systemName: "chevron.right")
                                .font(.caption2)
                        }
                        .foregroundColor(.accentColor)
                    }
                    .buttonStyle(.plain)
                }

                // Translator (if exists)
                if let translator = book.translator, !translator.isEmpty {
                    Text("\(L10n.Ebooks.translator): \(translator)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                // Rating display
                if let rating = detail?.stats.formattedRating {
                    HStack(spacing: 4) {
                        Text(rating)
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.orange)
                        Text("(\(detail?.stats.ratingCount ?? 0)\(L10n.Ebooks.peopleRated))")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
        .padding(.horizontal)
    }

    // MARK: - Stats Bar (3-Column WeChat Reading Style)

    @ViewBuilder
    private func statsBar(book: BookMetadata, stats: BookStats, userStatus: UserBookshelfStatus?) -> some View {
        VStack(spacing: 12) {
            // 3-column stats row
            HStack(spacing: 0) {
                // Column 1: Total readers
                statsBarItem(
                    title: "\(stats.totalReaders)",
                    subtitle: L10n.Ebooks.readers
                )

                Divider().frame(height: 36)

                // Column 2: My reading progress
                statsBarItem(
                    title: userStatus?.formattedProgress ?? "--",
                    subtitle: L10n.Ebooks.myReading
                )

                Divider().frame(height: 36)

                // Column 3: Word count
                if let wordCount = book.wordCount {
                    statsBarItem(
                        title: formatWordCount(wordCount),
                        subtitle: L10n.Ebooks.wordCount
                    )
                } else if let pageCount = book.pageCount {
                    statsBarItem(
                        title: "\(pageCount)",
                        subtitle: L10n.Ebooks.pages
                    )
                } else {
                    statsBarItem(
                        title: "--",
                        subtitle: L10n.Ebooks.wordCount
                    )
                }
            }
            .padding(.vertical, 12)
            .background(Color(.systemGray6).opacity(0.5))

            // Publisher info row (beautifully styled)
            if let publisher = book.publisher, !publisher.isEmpty {
                HStack(spacing: 10) {
                    // Publisher icon
                    ZStack {
                        Circle()
                            .fill(Color.blue.opacity(0.1))
                            .frame(width: 32, height: 32)
                        Image(systemName: "building.2.fill")
                            .font(.system(size: 14))
                            .foregroundColor(.blue)
                    }

                    // Publisher info
                    VStack(alignment: .leading, spacing: 2) {
                        Text(L10n.Ebooks.publisher)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        Text(publisher)
                            .font(.subheadline)
                            .foregroundColor(.primary)
                            .lineLimit(2)
                    }

                    Spacer()
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(Color(.systemGray6).opacity(0.5))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
        .padding(.horizontal)
    }

    @ViewBuilder
    private func statsBarItem(title: String, subtitle: String, isText: Bool = false) -> some View {
        VStack(spacing: 4) {
            Text(title)
                .font(isText ? .caption : .subheadline)
                .fontWeight(.semibold)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            Text(subtitle)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Recommendation Section

    @ViewBuilder
    private func recommendationSection(stats: BookStats) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(L10n.Ebooks.recommendation)
                    .font(.headline)
                Spacer()
            }

            HStack(spacing: 20) {
                // Recommendation percentage
                VStack(spacing: 4) {
                    Text(stats.formattedRecommendPercent ?? "0%")
                        .font(.system(size: 42, weight: .bold))
                        .foregroundColor(.orange)
                    Text(L10n.Ebooks.recommendRate)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                // Visual indicator
                VStack(alignment: .leading, spacing: 8) {
                    // Progress bar
                    GeometryReader { geometry in
                        ZStack(alignment: .leading) {
                            Rectangle()
                                .fill(Color(.systemGray5))
                                .frame(height: 8)
                                .clipShape(Capsule())

                            Rectangle()
                                .fill(Color.orange)
                                .frame(width: geometry.size.width * CGFloat((stats.recommendPercent ?? 0) / 100), height: 8)
                                .clipShape(Capsule())
                        }
                    }
                    .frame(height: 8)

                    // Stats summary
                    HStack(spacing: 16) {
                        Label("\(stats.totalReaders)", systemImage: "person.2")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Label("\(stats.totalReviews)", systemImage: "text.bubble")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .frame(maxWidth: .infinity)
            }
            .padding()
            .background(Color(.systemGray6).opacity(0.5))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .padding(.horizontal)
    }

    // MARK: - Bottom Action Bar

    @ViewBuilder
    private func bottomActionBar(book: BookMetadata) -> some View {
        HStack(spacing: 12) {
            // Bookshelf button
            if let status = bookshelfStatus {
                // Already on bookshelf - show status with menu
                Menu {
                    ForEach([BookshelfStatus.wantToRead, .reading, .finished], id: \.self) { newStatus in
                        if newStatus != status {
                            Button {
                                Task { await updateBookshelfStatus(newStatus) }
                            } label: {
                                Label(newStatus.displayName, systemImage: newStatus.iconName)
                            }
                        }
                    }
                    Divider()
                    Button(role: .destructive) {
                        showRemoveConfirm = true
                    } label: {
                        Label(L10n.Bookshelf.removeFromShelf, systemImage: "trash")
                    }
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: status.iconName)
                        Text(status.displayName)
                    }
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(statusColor(status).opacity(0.15))
                    .foregroundColor(statusColor(status))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .disabled(isUpdatingBookshelf)
            } else {
                // Not on bookshelf - show add button
                Menu {
                    ForEach([BookshelfStatus.wantToRead, .reading, .finished], id: \.self) { status in
                        Button {
                            Task { await addToBookshelf(status: status) }
                        } label: {
                            Label(status.displayName, systemImage: status.iconName)
                        }
                    }
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "plus")
                        Text(L10n.Bookshelf.addToShelf)
                    }
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(Color(.systemGray6))
                    .foregroundColor(.primary)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .disabled(isUpdatingBookshelf)
            }

            // Read button
            Button {
                Log.i("📖 Read button tapped: id=\(book.id), title=\(book.title), fileType=\(book.fileType ?? "nil")")
                showReader = true
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "book.fill")
                    Text(L10n.Ebooks.startReading)
                }
                .font(.subheadline)
                .fontWeight(.semibold)
                .frame(maxWidth: .infinity)
                .frame(height: 44)
            }
            .buttonStyle(.borderedProminent)
        }
        .padding(.horizontal)
        .padding(.vertical, 12)
        .background(.ultraThinMaterial)
        .confirmationDialog(L10n.Bookshelf.removeBook, isPresented: $showRemoveConfirm) {
            Button(L10n.Bookshelf.removeFromShelf, role: .destructive) {
                Task { await removeFromBookshelf() }
            }
            Button(L10n.Common.cancel, role: .cancel) {}
        } message: {
            Text(L10n.Bookshelf.removeConfirmMessage)
        }
    }

    // MARK: - Bookshelf Helper Functions

    private func statusColor(_ status: BookshelfStatus) -> Color {
        switch status {
        case .wantToRead: return .blue
        case .reading: return .orange
        case .finished: return .green
        }
    }

    private func addToBookshelf(status: BookshelfStatus) async {
        isUpdatingBookshelf = true
        do {
            _ = try await APIClient.shared.addToBookshelf(type: bookType, id: bookId, status: status)
            bookshelfStatus = status
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
        } catch {
            Log.e("Failed to remove from bookshelf", error: error)
        }
        isUpdatingBookshelf = false
    }

    // MARK: - Description Section

    @ViewBuilder
    private func descriptionSection(description: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(L10n.Ebooks.description)
                    .font(.headline)
                Spacer()
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        isDescriptionCollapsed.toggle()
                    }
                } label: {
                    HStack(spacing: 4) {
                        Text(isDescriptionCollapsed ? L10n.Common.expand : L10n.Common.collapse)
                            .font(.caption)
                        Image(systemName: isDescriptionCollapsed ? "chevron.down" : "chevron.up")
                            .font(.caption)
                    }
                    .foregroundColor(.accentColor)
                }
            }

            Text(description)
                .font(.body)
                .foregroundColor(.secondary)
                .lineLimit(isDescriptionCollapsed ? 6 : nil)
        }
        .padding(.horizontal)
    }

    // MARK: - Reviews Section

    @ViewBuilder
    private func reviewsSection(reviews: [BookReview], totalReviews: Int) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(L10n.Ebooks.reviews)
                    .font(.headline)

                Spacer()

                if totalReviews > reviews.count {
                    Button("\(L10n.Common.viewAll) (\(totalReviews))") {
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
                        Text(myReview != nil ? L10n.Ebooks.editReview : L10n.Ebooks.writeReview)
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
                    Text(L10n.Ebooks.myReview)
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
                    Text(L10n.Ebooks.noReviews)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Text(L10n.Ebooks.beFirstReviewer)
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
            let response = try await APIClient.shared.getBookDetailCached(type: bookType, id: bookId)
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
                            Text("(\(L10n.Ebooks.me))")
                                .font(.caption)
                                .foregroundColor(.accentColor)
                        }
                    }

                    if let progress = review.formattedReadingProgress {
                        Text("\(L10n.Ebooks.readingProgress) \(progress)")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()

                if review.isFeatured {
                    Label(L10n.Ebooks.featured, systemImage: "star.fill")
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
                    Label(L10n.Ebooks.recommend, systemImage: "hand.thumbsup.fill")
                        .font(.caption)
                        .foregroundColor(.green)
                } else if review.isNotRecommended {
                    Label(L10n.Ebooks.notRecommend, systemImage: "hand.thumbsdown.fill")
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
                    ContentUnavailableView(L10n.Ebooks.noReviews, systemImage: "text.bubble")
                } else {
                    List {
                        ForEach(reviews) { review in
                            ReviewCard(review: review)
                                .listRowInsets(EdgeInsets())
                                .listRowBackground(Color.clear)
                                .padding(.vertical, 4)
                        }

                        if hasMore {
                            Button(L10n.Notes.loadMore) {
                                Task { await loadMore() }
                            }
                            .frame(maxWidth: .infinity)
                            .disabled(isLoading)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle(L10n.Ebooks.allReviews)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(L10n.Common.close) { dismiss() }
                }

                ToolbarItem(placement: .primaryAction) {
                    Menu {
                        Picker(L10n.Ebooks.sort, selection: $sortOption) {
                            Text(L10n.Ebooks.sortNewest).tag("newest")
                            Text(L10n.Ebooks.sortOldest).tag("oldest")
                            Text(L10n.Ebooks.sortHighest).tag("highest")
                            Text(L10n.Ebooks.sortHelpful).tag("helpful")
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

// MARK: - AI Info Sheet View

/// Sheet view for displaying AI-generated information about author or book
struct AIInfoSheetView: View {
    enum InfoType {
        case author
        case book

        var icon: String {
            switch self {
            case .author: return "person.fill"
            case .book: return "book.fill"
            }
        }

        var headerTitle: String {
            switch self {
            case .author: return L10n.BookDetail.aboutAuthor
            case .book: return L10n.BookDetail.aboutBook
            }
        }
    }

    let type: InfoType
    let title: String      // Author name or Book title
    let subtitle: String?  // Book title (for author) or Author name (for book)

    @Environment(\.dismiss) private var dismiss
    @State private var content: String = ""
    @State private var isLoading = true
    @State private var errorMessage: String?

    /// Get current system language code
    private var targetLanguage: String {
        let langCode = Locale.current.language.languageCode?.identifier ?? "en"
        return langCode == "zh" ? "zh" : "en"
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    // Header with icon and title
                    HStack(spacing: 12) {
                        ZStack {
                            Circle()
                                .fill(
                                    LinearGradient(
                                        colors: [.purple, .blue],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .frame(width: 48, height: 48)
                            Image(systemName: type.icon)
                                .font(.title3)
                                .foregroundColor(.white)
                        }

                        VStack(alignment: .leading, spacing: 2) {
                            Text(title)
                                .font(.title3)
                                .fontWeight(.bold)
                            if let subtitle = subtitle {
                                Text(subtitle)
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                        }

                        Spacer()
                    }
                    .padding(.bottom, 8)

                    Divider()

                    // AI Content
                    if isLoading {
                        VStack(spacing: 16) {
                            ProgressView()
                            HStack(spacing: 8) {
                                Image(systemName: "sparkles")
                                    .foregroundColor(.purple)
                                Text(L10n.BookDetail.aiGenerating)
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 40)
                    } else if let error = errorMessage {
                        VStack(spacing: 12) {
                            Image(systemName: "exclamationmark.triangle")
                                .font(.largeTitle)
                                .foregroundColor(.orange)
                            Text(error)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                            Button(L10n.Common.retry) {
                                Task { await loadContent() }
                            }
                            .buttonStyle(.bordered)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 40)
                    } else {
                        // AI badge
                        HStack(spacing: 6) {
                            Image(systemName: "sparkles")
                                .font(.caption)
                            Text(L10n.BookDetail.aiGenerated)
                                .font(.caption)
                        }
                        .foregroundColor(.purple)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(Color.purple.opacity(0.1))
                        .clipShape(Capsule())

                        // Content
                        Text(content)
                            .font(.body)
                            .lineSpacing(6)
                    }
                }
                .padding()
            }
            .navigationTitle(type.headerTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(L10n.Common.close) {
                        dismiss()
                    }
                }
            }
            .task {
                await loadContent()
            }
        }
    }

    private func loadContent() async {
        isLoading = true
        errorMessage = nil

        do {
            switch type {
            case .author:
                content = try await APIClient.shared.getAuthorInfo(
                    authorName: title,
                    bookTitle: subtitle,
                    targetLanguage: targetLanguage
                )
            case .book:
                content = try await APIClient.shared.getBookInfo(
                    bookTitle: title,
                    authorName: subtitle,
                    targetLanguage: targetLanguage
                )
            }
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}

#Preview {
    NavigationStack {
        BookDetailView(bookType: .ebook, bookId: 4120)
    }
}

#Preview("AI Author Info") {
    AIInfoSheetView(
        type: .author,
        title: "马尔克斯",
        subtitle: "百年孤独"
    )
}

#Preview("AI Book Info") {
    AIInfoSheetView(
        type: .book,
        title: "百年孤独",
        subtitle: "马尔克斯"
    )
}
