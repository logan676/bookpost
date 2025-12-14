import SwiftUI

/// Store view for EBOOKS ONLY
/// This view must NEVER display magazines - they are completely separate
struct EbookStoreView: View {
    @StateObject private var viewModel = EbookStoreViewModel()
    @State private var showSearch = false
    @State private var selectedItem: StoreItem?
    @State private var showCategoryBrowser = false
    @State private var showRankings = false
    @State private var showBookLists = false
    @State private var selectedBookList: BookList?
    @State private var selectedRanking: ExternalRanking?
    @State private var bookType = "ebook" // Used by CategoryGridView

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Search bar is now in StoreTabView (above tab picker)

                // Recommendations (horizontal scroll)
                if !viewModel.recommendedBooks.isEmpty {
                    RecommendationsSection(
                        books: viewModel.recommendedBooks,
                        isRefreshing: viewModel.isRefreshingRecommendations,
                        onBookTap: { selectedItem = $0 },
                        onRefresh: {
                            Task { await viewModel.refreshRecommendations() }
                        },
                        onShowAll: { showCategoryBrowser = true }
                    )
                }

                // Categories (using enhanced CategoryGridView with horizontal scroll)
                CategoryGridView(selectedBookType: $bookType)

                // Books by Year (NEW)
                if !viewModel.booksByYear.isEmpty {
                    BooksByYearSection(
                        booksByYear: viewModel.booksByYear,
                        onBookTap: { book in
                            // Convert BookByYear to StoreItem for navigation
                            let item = StoreItem(
                                id: book.id,
                                itemType: .ebook,
                                itemId: book.id,
                                title: book.title,
                                subtitle: book.author,
                                coverUrl: book.coverUrl,
                                badge: nil
                            )
                            selectedItem = item
                        },
                        onShowAll: { year in
                            // TODO: Navigate to year-specific browse
                            showCategoryBrowser = true
                        }
                    )
                }

                // Top Rated Books (NEW)
                if !viewModel.topRatedBooks.isEmpty {
                    TopRatedSection(
                        books: viewModel.topRatedBooks,
                        onBookTap: { book in
                            let item = StoreItem(
                                id: book.id,
                                itemType: .ebook,
                                itemId: book.id,
                                title: book.title,
                                subtitle: book.author,
                                coverUrl: book.coverUrl,
                                badge: nil
                            )
                            selectedItem = item
                        },
                        onShowAll: { showRankings = true }
                    )
                }

                // New arrivals
                if !viewModel.newArrivals.isEmpty {
                    horizontalSection(
                        title: L10n.Store.newArrivals,
                        subtitle: "最新上架电子书",
                        items: viewModel.newArrivals,
                        showMore: { showCategoryBrowser = true }
                    )
                }

                // Hot ebooks
                if !viewModel.hotBooks.isEmpty {
                    horizontalSection(
                        title: "热门电子书",
                        subtitle: "大家都在读",
                        items: viewModel.hotBooks,
                        showMore: { showCategoryBrowser = true }
                    )
                }

                // External Rankings (NEW)
                if !viewModel.externalRankings.isEmpty {
                    ExternalRankingsSection(
                        rankings: viewModel.externalRankings,
                        onRankingTap: { ranking in
                            selectedRanking = ranking
                        },
                        onShowAll: { showRankings = true }
                    )
                }

                // Book Lists
                if !viewModel.popularBookLists.isEmpty {
                    bookListsSection
                }

                // Rankings (existing)
                if !viewModel.topRanked.isEmpty {
                    rankingPreviewSection
                }
            }
            .padding(.bottom, 32)
        }
        .refreshable {
            await viewModel.refresh()
        }
        .task {
            await viewModel.loadHomeData()
        }
        .navigationDestination(item: $selectedItem) { item in
            BookDetailView(bookType: .ebook, bookId: item.itemId)
        }
        .sheet(isPresented: $showSearch) {
            StoreSearchView()
        }
        .sheet(isPresented: $showCategoryBrowser) {
            StoreCategoryView()
        }
        .sheet(isPresented: $showRankings) {
            StoreRankingView()
        }
        .sheet(isPresented: $showBookLists) {
            BookListsView()
        }
        .navigationDestination(item: $selectedBookList) { list in
            BookListDetailView(listId: list.id)
        }
        .sheet(item: $selectedRanking) { ranking in
            // External ranking detail view - could be a new view or reuse CuratedListDetailView
            CuratedListDetailView(listId: ranking.id)
        }
    }

    // MARK: - Horizontal Section

    private func horizontalSection(
        title: String,
        subtitle: String,
        items: [StoreItem],
        showMore: @escaping () -> Void
    ) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.title2)
                        .fontWeight(.bold)
                    Text(subtitle)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Button(L10n.Store.more) {
                    showMore()
                }
                .font(.subheadline)
            }
            .padding(.horizontal)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(items) { item in
                        StoreBookCard(item: item) {
                            selectedItem = item
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
    }

    // MARK: - Book Lists Section

    private var bookListsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(L10n.BookList.popularLists)
                        .font(.title2)
                        .fontWeight(.bold)
                    Text(L10n.BookList.curatedCollections)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Button(L10n.Store.more) {
                    showBookLists = true
                }
                .font(.subheadline)
            }
            .padding(.horizontal)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(viewModel.popularBookLists) { list in
                        BookListCard(list: list, style: .compact) {
                            selectedBookList = list
                        }
                        .frame(width: 280)
                        .padding(.vertical, 8)
                        .background(Color(.systemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
                    }
                }
                .padding(.horizontal)
            }
        }
    }

    // MARK: - Ranking Preview Section

    private var rankingPreviewSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("电子书排行榜")
                    .font(.title2)
                    .fontWeight(.bold)

                Spacer()

                Button(L10n.Store.viewAll) {
                    showRankings = true
                }
                .font(.subheadline)
            }
            .padding(.horizontal)

            VStack(spacing: 0) {
                ForEach(Array(viewModel.topRanked.prefix(5).enumerated()), id: \.element.id) { index, item in
                    RankingRowPreview(rank: index + 1, item: item) {
                        selectedItem = item
                    }

                    if index < 4 {
                        Divider()
                            .padding(.leading, 60)
                    }
                }
            }
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
            .padding(.horizontal)
        }
    }
}

// MARK: - Ebook Store ViewModel

@MainActor
class EbookStoreViewModel: ObservableObject {
    @Published var recommendedBooks: [StoreItem] = []
    @Published var newArrivals: [StoreItem] = []
    @Published var hotBooks: [StoreItem] = []
    @Published var topRanked: [StoreItem] = []
    @Published var popularBookLists: [BookList] = []
    // New Store sections
    @Published var booksByYear: [BooksByYearGroup] = []
    @Published var topRatedBooks: [TopRatedBook] = []
    @Published var externalRankings: [ExternalRanking] = []
    @Published var isLoading = false
    @Published var isRefreshingRecommendations = false
    @Published var errorMessage: String?

    private let apiClient = APIClient.shared

    func loadHomeData() async {
        isLoading = true
        errorMessage = nil

        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.loadRecommendations() }
            group.addTask { await self.loadNewArrivals() }
            group.addTask { await self.loadHotBooks() }
            group.addTask { await self.loadTopRanked() }
            group.addTask { await self.loadBookLists() }
            // New Store sections
            group.addTask { await self.loadBooksByYear() }
            group.addTask { await self.loadTopRatedBooks() }
            group.addTask { await self.loadExternalRankings() }
        }

        isLoading = false
    }

    func refresh() async {
        await loadHomeData()
    }

    func refreshRecommendations() async {
        isRefreshingRecommendations = true
        await loadRecommendations()
        isRefreshingRecommendations = false
    }

    // EBOOK ONLY - No magazines here
    private func loadRecommendations() async {
        do {
            let ebooks = try await apiClient.getEbooks(limit: 10)
            recommendedBooks = ebooks.data.shuffled().prefix(6).map { StoreItem(from: $0) }
        } catch {
            print("Failed to load ebook recommendations: \(error)")
        }
    }

    private func loadNewArrivals() async {
        do {
            let ebooks = try await apiClient.getEbooks(limit: 10)
            newArrivals = ebooks.data.map { StoreItem(from: $0) }
        } catch {
            print("Failed to load new ebook arrivals: \(error)")
        }
    }

    private func loadHotBooks() async {
        do {
            let ebooks = try await apiClient.getEbooks(limit: 10)
            hotBooks = ebooks.data.shuffled().map { StoreItem(from: $0) }
        } catch {
            print("Failed to load hot ebooks: \(error)")
        }
    }

    private func loadTopRanked() async {
        do {
            let ebooks = try await apiClient.getEbooks(limit: 10)
            topRanked = ebooks.data.map { StoreItem(from: $0) }
        } catch {
            print("Failed to load top ranked ebooks: \(error)")
        }
    }

    private func loadBookLists() async {
        do {
            let response = try await apiClient.getBookLists(sort: "popular", limit: 6)
            popularBookLists = response.data
        } catch {
            print("Failed to load book lists: \(error)")
        }
    }

    // MARK: - New Store API calls

    private func loadBooksByYear() async {
        do {
            let response = try await apiClient.getBooksByYear(bookType: "ebook", limit: 10)
            booksByYear = response.data
        } catch {
            print("Failed to load books by year: \(error)")
        }
    }

    private func loadTopRatedBooks() async {
        do {
            let response = try await apiClient.getTopRatedBooks(bookType: "ebook", limit: 10, minRatingCount: 5)
            topRatedBooks = response.data
        } catch {
            print("Failed to load top rated books: \(error)")
        }
    }

    private func loadExternalRankings() async {
        do {
            let response = try await apiClient.getExternalRankings(bookType: "ebook")
            externalRankings = response.data
        } catch {
            print("Failed to load external rankings: \(error)")
        }
    }

}

#Preview {
    NavigationStack {
        EbookStoreView()
    }
}
