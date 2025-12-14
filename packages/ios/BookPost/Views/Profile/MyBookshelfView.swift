import SwiftUI

/// User's personal bookshelf with filtering by book type and reading status
struct MyBookshelfView: View {
    @State private var items: [BookshelfItem] = []
    @State private var counts: BookshelfCounts?
    @State private var isLoading = false
    @State private var hasMore = false
    @State private var offset = 0
    @State private var selectedFilter: BookshelfFilter = .recentOpen
    @State private var selectedType: BookshelfType = .ebook
    @State private var sortOption: BookshelfSortOption = .added
    @State private var sortOrder: BookshelfSortOrder = .descending

    var body: some View {
        VStack(spacing: 0) {
            // Type tabs (电子书/杂志/纸质书)
            typeTabsView

            // Status filter (最近打开/想读/在读/已读)
            statusFilterView

            Divider()

            // Content
            if items.isEmpty && isLoading {
                LoadingView()
            } else if items.isEmpty {
                emptyStateView
            } else {
                bookshelfGridView
            }
        }
        .navigationTitle(L10n.Bookshelf.title)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadBookshelf()
        }
        .onChange(of: selectedFilter) { _, _ in
            resetAndReload()
        }
        .onChange(of: selectedType) { _, _ in
            resetAndReload()
        }
        .onChange(of: sortOption) { _, _ in
            resetAndReload()
        }
        .onChange(of: sortOrder) { _, _ in
            resetAndReload()
        }
    }

    // MARK: - Type Tabs (电子书/杂志/纸质书)

    @ViewBuilder
    private var typeTabsView: some View {
        Picker(L10n.Bookshelf.type, selection: $selectedType) {
            Text(L10n.Bookshelf.ebook).tag(BookshelfType.ebook)
            Text(L10n.Bookshelf.magazine).tag(BookshelfType.magazine)
            Text(L10n.Bookshelf.physicalBook).tag(BookshelfType.physicalBook)
        }
        .pickerStyle(.segmented)
        .padding(.horizontal)
        .padding(.vertical, 12)
        .background(Color(.systemBackground))
    }

    // MARK: - Status Filter (最近打开/想读/在读/已读)

    @ViewBuilder
    private var statusFilterView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                filterButton(filter: .recentOpen)
                filterButton(filter: .wantToRead)
                filterButton(filter: .reading)
                filterButton(filter: .finished)
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
        }
        .background(Color(.systemBackground))
    }

    @ViewBuilder
    private func filterButton(filter: BookshelfFilter) -> some View {
        let count: Int? = {
            switch filter {
            case .recentOpen: return nil  // No count for recent open
            case .wantToRead: return counts?.wantToRead
            case .reading: return counts?.reading
            case .finished: return counts?.finished
            }
        }()

        Button {
            selectedFilter = filter
        } label: {
            HStack(spacing: 4) {
                Image(systemName: filter.iconName)
                    .font(.caption)
                Text(filter.displayName)
                if let count = count {
                    Text("(\(count))")
                        .font(.caption2)
                }
            }
            .font(.subheadline)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(selectedFilter == filter ? Color.accentColor : Color(.systemGray6))
            .foregroundColor(selectedFilter == filter ? .white : .primary)
            .clipShape(Capsule())
        }
    }

    // MARK: - Empty State

    @ViewBuilder
    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Spacer()

            Image(systemName: "books.vertical")
                .font(.system(size: 50))
                .foregroundColor(.secondary)

            Text(L10n.Bookshelf.empty)
                .font(.headline)
                .foregroundColor(.secondary)

            Text(L10n.Bookshelf.browseBooks)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Bookshelf Grid View

    @ViewBuilder
    private var bookshelfGridView: some View {
        ScrollView {
            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: 16),
                GridItem(.flexible(), spacing: 16),
                GridItem(.flexible(), spacing: 16)
            ], spacing: 20) {
                ForEach(items) { item in
                    NavigationLink(destination: destinationView(for: item)) {
                        BookshelfGridItem(item: item)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding()

            if hasMore {
                Button(L10n.Notes.loadMore) {
                    Task { await loadMore() }
                }
                .padding()
                .disabled(isLoading)
            }
        }
        .refreshable {
            await loadBookshelf()
        }
    }

    @ViewBuilder
    private func destinationView(for item: BookshelfItem) -> some View {
        let bookType: BookType = item.bookType == "ebook" ? .ebook : .magazine
        BookDetailView(bookType: bookType, bookId: item.bookId)
    }

    // MARK: - Data Loading

    /// Limit for "Recent Open" filter (3x3 grid)
    private let recentOpenLimit = 9

    private func resetAndReload() {
        items = []
        offset = 0
        Task { await loadBookshelf() }
    }

    private func loadBookshelf() async {
        isLoading = true

        do {
            let typeValue = selectedType.apiValue

            // For "Recent Open", use lastRead sort, limit to 9, and only show opened books
            if selectedFilter == .recentOpen {
                let response = try await APIClient.shared.getMyBookshelf(
                    status: "all",
                    type: typeValue,
                    sort: "lastRead",
                    order: "desc",
                    limit: recentOpenLimit,
                    offset: 0,
                    openedOnly: true
                )
                items = response.data
                counts = response.counts
                hasMore = false  // No pagination for recent open
            } else {
                let response = try await APIClient.shared.getMyBookshelf(
                    status: selectedFilter.apiValue,
                    type: typeValue,
                    sort: sortOption.rawValue,
                    order: sortOrder.rawValue,
                    limit: 20,
                    offset: 0
                )
                items = response.data
                counts = response.counts
                hasMore = response.hasMore
                offset = items.count
            }
        } catch {
            Log.e("Failed to load bookshelf", error: error)
        }

        isLoading = false
    }

    private func loadMore() async {
        // No pagination for recent open filter
        guard selectedFilter != .recentOpen else { return }
        guard !isLoading else { return }
        isLoading = true

        do {
            let typeValue = selectedType.apiValue
            let response = try await APIClient.shared.getMyBookshelf(
                status: selectedFilter.apiValue,
                type: typeValue,
                sort: sortOption.rawValue,
                order: sortOrder.rawValue,
                limit: 20,
                offset: offset
            )
            items.append(contentsOf: response.data)
            hasMore = response.hasMore
            offset = items.count
        } catch {
            Log.e("Failed to load more bookshelf items", error: error)
        }

        isLoading = false
    }
}

// MARK: - Bookshelf Type Enum

enum BookshelfType: String, CaseIterable {
    case ebook = "ebook"
    case magazine = "magazine"
    case physicalBook = "book"

    var apiValue: String {
        return rawValue
    }
}

// MARK: - Bookshelf Filter Enum

enum BookshelfFilter: String, CaseIterable {
    case recentOpen = "recent_open"
    case wantToRead = "want_to_read"
    case reading = "reading"
    case finished = "finished"

    var displayName: String {
        switch self {
        case .recentOpen: return L10n.Bookshelf.recentOpen
        case .wantToRead: return L10n.Bookshelf.wantToRead
        case .reading: return L10n.Bookshelf.reading
        case .finished: return L10n.Bookshelf.finished
        }
    }

    var iconName: String {
        switch self {
        case .recentOpen: return "clock.arrow.circlepath"
        case .wantToRead: return "bookmark"
        case .reading: return "book"
        case .finished: return "checkmark.circle"
        }
    }

    var apiValue: String {
        return rawValue
    }
}

// MARK: - Sort Option Enum

enum BookshelfSortOption: String, CaseIterable {
    case added = "added"
    case updated = "updated"
    case lastRead = "lastRead"
    case title = "title"
    case author = "author"
    case progress = "progress"
    case rating = "rating"
    case publishDate = "publishDate"

    var displayName: String {
        switch self {
        case .added: return L10n.Bookshelf.sortByAdded
        case .updated: return L10n.Bookshelf.sortByUpdated
        case .lastRead: return L10n.Bookshelf.sortByLastRead
        case .title: return L10n.Bookshelf.sortByTitle
        case .author: return L10n.Bookshelf.sortByAuthor
        case .progress: return L10n.Bookshelf.sortByProgress
        case .rating: return L10n.Bookshelf.sortByRating
        case .publishDate: return L10n.Bookshelf.sortByPublishDate
        }
    }

    var iconName: String {
        switch self {
        case .added: return "calendar.badge.plus"
        case .updated: return "clock"
        case .lastRead: return "book"
        case .title: return "textformat"
        case .author: return "person"
        case .progress: return "chart.bar"
        case .rating: return "star"
        case .publishDate: return "calendar"
        }
    }
}

enum BookshelfSortOrder: String {
    case ascending = "asc"
    case descending = "desc"
}

// MARK: - Bookshelf Grid Item

struct BookshelfGridItem: View {
    let item: BookshelfItem
    @StateObject private var cacheManager = BookCacheManager.shared

    private var cachedBookType: CachedBookMetadata.CachedBookType {
        item.bookType == "ebook" ? .ebook : .magazine
    }

    private var isCached: Bool {
        if case .cached = cacheManager.getCacheStatus(bookType: cachedBookType, bookId: item.bookId) {
            return true
        }
        return false
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Book cover with status overlay
            ZStack(alignment: .bottomLeading) {
                BookCoverView(coverUrl: item.book.coverUrl, title: item.book.title)
                    .frame(height: 150)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .shadow(color: .black.opacity(0.1), radius: 2, x: 0, y: 1)
                    .overlay(alignment: .topTrailing) {
                        // Offline availability indicator
                        if isCached {
                            Image(systemName: "arrow.down.circle.fill")
                                .font(.caption)
                                .foregroundStyle(.white, .green)
                                .padding(4)
                        }
                    }

                // Progress indicator at bottom
                if let progress = item.progress, progress > 0 {
                    GeometryReader { geometry in
                        VStack {
                            Spacer()
                            Rectangle()
                                .fill(Color.orange)
                                .frame(width: geometry.size.width * progress, height: 3)
                        }
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }

            // Book title
            Text(item.book.title)
                .font(.caption)
                .fontWeight(.medium)
                .lineLimit(2)
                .multilineTextAlignment(.leading)
                .foregroundColor(.primary)

            // Progress percentage or status
            if let progress = item.progress, progress > 0 {
                Text(String(format: "%.0f%%", progress * 100))
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
    }
}

// MARK: - Bookshelf Item Row (for list view)

struct BookshelfItemRow: View {
    let item: BookshelfItem

    var body: some View {
        HStack(spacing: 12) {
            // Book cover
            BookCoverView(coverUrl: item.book.coverUrl, title: item.book.title)
                .frame(width: 60, height: 85)
                .clipShape(RoundedRectangle(cornerRadius: 6))

            // Book info
            VStack(alignment: .leading, spacing: 4) {
                Text(item.book.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(2)

                if let author = item.book.author {
                    Text(author)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                HStack(spacing: 8) {
                    // Status badge
                    Label(item.status.displayName, systemImage: item.status.iconName)
                        .font(.caption2)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(statusColor(item.status).opacity(0.15))
                        .foregroundColor(statusColor(item.status))
                        .clipShape(Capsule())

                    // Progress indicator
                    if let progress = item.progress, progress > 0 {
                        Text(String(format: "%.0f%%", progress * 100))
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }

                    Spacer()

                    // Book type icon
                    Image(systemName: item.bookType == "ebook" ? "book.fill" : "newspaper.fill")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(.vertical, 4)
    }

    private func statusColor(_ status: BookshelfStatus) -> Color {
        switch status {
        case .wantToRead: return .blue
        case .reading: return .orange
        case .finished: return .green
        case .abandoned: return .gray
        }
    }
}

#Preview {
    NavigationStack {
        MyBookshelfView()
    }
}
