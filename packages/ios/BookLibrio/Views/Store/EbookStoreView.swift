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
                // 1. Recommended for You (horizontal scroll - covers only)
                if !viewModel.recommendedBooks.isEmpty {
                    RecommendedCoversSection(
                        books: viewModel.recommendedBooks,
                        onBookTap: { selectedItem = $0 },
                        onShowAll: { showCategoryBrowser = true }
                    )
                }

                // 2. Categories (fiction categories only)
                CategoryGridView(selectedBookType: $bookType, showFictionOnly: true)

                // 3. External Rankings & Recommended Lists
                if !viewModel.externalRankings.isEmpty {
                    ExternalRankingsSection(
                        rankings: viewModel.externalRankings,
                        onRankingTap: { ranking in
                            selectedRanking = ranking
                        },
                        onShowAll: { showRankings = true }
                    )
                }

                // 4. Books by Year (mixed years display)
                if !viewModel.mixedYearBooks.isEmpty {
                    MixedYearBooksSection(
                        books: viewModel.mixedYearBooks,
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
                        onShowAll: { showCategoryBrowser = true }
                    )
                }

                // 5. Top Rated (with weighted random)
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

                // 6. Curated Collections
                if !viewModel.popularBookLists.isEmpty {
                    curatedCollectionsSection
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
            ExternalRankingDetailView(ranking: ranking)
        }
    }

    // MARK: - Curated Collections Section

    private var curatedCollectionsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(L10n.Store.curatedCollections)
                    .font(.title3)
                    .fontWeight(.bold)

                Spacer()

                Button(L10n.Store.viewMore) {
                    showBookLists = true
                }
                .font(.subheadline)
                .foregroundColor(.primary)
            }
            .padding(.horizontal)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(viewModel.popularBookLists) { list in
                        CuratedCollectionCard(list: list) {
                            selectedBookList = list
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

// MARK: - Ebook Store ViewModel

@MainActor
class EbookStoreViewModel: ObservableObject {
    @Published var recommendedBooks: [StoreItem] = []
    @Published var popularBookLists: [BookList] = []
    @Published var mixedYearBooks: [BookByYear] = []
    @Published var topRatedBooks: [TopRatedBook] = []
    @Published var externalRankings: [ExternalRanking] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let apiClient = APIClient.shared
    private var hasLoaded = false

    func loadHomeData() async {
        // Skip if already loaded (prevents reload on navigation back)
        guard !hasLoaded else { return }

        isLoading = true
        errorMessage = nil

        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.loadRecommendations() }
            group.addTask { await self.loadBookLists() }
            group.addTask { await self.loadMixedYearBooks() }
            group.addTask { await self.loadTopRatedBooks() }
            group.addTask { await self.loadExternalRankings() }
        }

        isLoading = false
        hasLoaded = true
    }

    func refresh() async {
        // Force reload on manual refresh (pull-to-refresh)
        hasLoaded = false
        await loadHomeData()
        hasLoaded = true
    }

    // EBOOK ONLY - No magazines here
    private func loadRecommendations() async {
        do {
            let ebooks = try await apiClient.getEbooks(limit: 12)
            recommendedBooks = ebooks.data.shuffled().prefix(8).map { StoreItem(from: $0) }
        } catch {
            print("Failed to load ebook recommendations: \(error)")
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

    // MARK: - Mixed Year Books (combines multiple years into one shuffled list)

    private func loadMixedYearBooks() async {
        do {
            let response = try await apiClient.getBooksByYear(bookType: "ebook", limit: 15)
            // Flatten all books from different years and shuffle them
            var allBooks: [BookByYear] = []
            for group in response.data {
                allBooks.append(contentsOf: group.books)
            }
            // Shuffle to mix different years together
            mixedYearBooks = allBooks.shuffled()
        } catch {
            print("Failed to load books by year: \(error)")
        }
    }

    // MARK: - Top Rated with Weighted Random Algorithm

    private func loadTopRatedBooks() async {
        do {
            // Get more books to apply weighted random selection
            let response = try await apiClient.getTopRatedBooks(bookType: "ebook", limit: 30, minRatingCount: 3)
            topRatedBooks = applyWeightedRandomSelection(books: response.data, count: 10)
        } catch {
            print("Failed to load top rated books: \(error)")
        }
    }

    /// Weighted random selection: higher rated books have higher probability but lower rated (3+) can still appear
    private func applyWeightedRandomSelection(books: [TopRatedBook], count: Int) -> [TopRatedBook] {
        guard !books.isEmpty else { return [] }

        // Calculate weights based on rating (rating^2 to favor higher ratings more)
        var weightedBooks: [(book: TopRatedBook, weight: Double)] = books.map { book in
            let rating = book.rating ?? 3.0
            // Weight formula: (rating - 2)^2 so 3-star gets weight 1, 5-star gets weight 9
            let weight = pow(max(rating - 2, 0.5), 2)
            return (book, weight)
        }

        var selected: [TopRatedBook] = []
        var totalWeight = weightedBooks.reduce(0) { $0 + $1.weight }

        while selected.count < min(count, weightedBooks.count) && !weightedBooks.isEmpty {
            // Random selection based on weight
            var randomValue = Double.random(in: 0..<totalWeight)

            for (index, item) in weightedBooks.enumerated() {
                randomValue -= item.weight
                if randomValue <= 0 {
                    selected.append(item.book)
                    totalWeight -= item.weight
                    weightedBooks.remove(at: index)
                    break
                }
            }
        }

        return selected
    }

    private func loadExternalRankings() async {
        do {
            let response = try await apiClient.getExternalRankings(bookType: "ebook")
            externalRankings = interleaveRankingsBySources(rankings: response.data)
        } catch {
            print("Failed to load external rankings: \(error)")
        }
    }

    /// Interleave rankings from different sources for browsing diversity
    /// Instead of showing all Amazon rankings together, mix them: Amazon → NYT → Bill Gates → NPR → Amazon → ...
    private func interleaveRankingsBySources(rankings: [ExternalRanking]) -> [ExternalRanking] {
        guard !rankings.isEmpty else { return [] }

        // Group rankings by source name
        var sourceGroups: [String: [ExternalRanking]] = [:]
        for ranking in rankings {
            let source = ranking.displaySourceName
            if sourceGroups[source] == nil {
                sourceGroups[source] = []
            }
            sourceGroups[source]?.append(ranking)
        }

        // Get unique sources in their original appearance order
        var sourceOrder: [String] = []
        for ranking in rankings {
            let source = ranking.displaySourceName
            if !sourceOrder.contains(source) {
                sourceOrder.append(source)
            }
        }

        // Interleave: take one from each source in round-robin fashion
        var result: [ExternalRanking] = []
        var indices: [String: Int] = [:]
        for source in sourceOrder {
            indices[source] = 0
        }

        var hasMore = true
        while hasMore {
            hasMore = false
            for source in sourceOrder {
                guard let group = sourceGroups[source],
                      let currentIndex = indices[source],
                      currentIndex < group.count else {
                    continue
                }
                result.append(group[currentIndex])
                indices[source] = currentIndex + 1
                if currentIndex + 1 < group.count {
                    hasMore = true
                }
            }
        }

        return result
    }
}

#Preview {
    NavigationStack {
        EbookStoreView()
    }
}
