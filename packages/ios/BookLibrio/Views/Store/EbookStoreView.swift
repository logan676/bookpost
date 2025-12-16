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
    @State private var showEditorPicksList = false
    @State private var showExternalRankingsList = false
    @State private var showNYTListsView = false
    @State private var showAmazonListsView = false
    @State private var showGoodreadsListsView = false
    @State private var showPulitzerAwardsView = false
    @State private var showBookerAwardsView = false
    @State private var showNewberyAwardsView = false
    @State private var selectedBookList: BookList?
    @State private var selectedRanking: ExternalRanking?
    @State private var bookType = "ebook" // Used by CategoryGridView

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Top spacing to avoid being covered by the fixed Ebook/Magazine tab bar
                Color.clear.frame(height: 8)

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

                // 3. Editor's Picks (flattened section with actual books)
                if !viewModel.editorPicksWithBooks.isEmpty {
                    EditorPicksFlattenedSection(
                        lists: viewModel.editorPicksWithBooks,
                        onBookTap: { book in handleBookTap(book) },
                        onShowAll: { showEditorPicksList = true }
                    )
                }

                // 4. NYT Best Sellers (platform-specific branded section with actual books)
                if !viewModel.nytListsWithBooks.isEmpty {
                    NYTFlattenedSection(
                        lists: viewModel.nytListsWithBooks,
                        onBookTap: { book in handleBookTap(book) },
                        onShowAll: { showNYTListsView = true }
                    )
                }

                // 4.1 Amazon Best Books (platform-specific branded section with actual books)
                if !viewModel.amazonListsWithBooks.isEmpty {
                    AmazonFlattenedSection(
                        lists: viewModel.amazonListsWithBooks,
                        onBookTap: { book in handleBookTap(book) },
                        onShowAll: { showAmazonListsView = true }
                    )
                }

                // 4.2 Goodreads Choice Awards (platform-specific branded section with actual books)
                if !viewModel.goodreadsListsWithBooks.isEmpty {
                    GoodreadsFlattenedSection(
                        lists: viewModel.goodreadsListsWithBooks,
                        onBookTap: { book in handleBookTap(book) },
                        onShowAll: { showGoodreadsListsView = true }
                    )
                }

                // 5. Individual Award Sections with actual books (Pulitzer, Booker, Newbery)
                if !viewModel.pulitzerAwardsWithBooks.isEmpty {
                    PulitzerFlattenedSection(
                        lists: viewModel.pulitzerAwardsWithBooks,
                        onBookTap: { book in handleBookTap(book) },
                        onShowAll: { showPulitzerAwardsView = true }
                    )
                }

                if !viewModel.bookerAwardsWithBooks.isEmpty {
                    BookerFlattenedSection(
                        lists: viewModel.bookerAwardsWithBooks,
                        onBookTap: { book in handleBookTap(book) },
                        onShowAll: { showBookerAwardsView = true }
                    )
                }

                if !viewModel.newberyAwardsWithBooks.isEmpty {
                    NewberyFlattenedSection(
                        lists: viewModel.newberyAwardsWithBooks,
                        onBookTap: { book in handleBookTap(book) },
                        onShowAll: { showNewberyAwardsView = true }
                    )
                }

                // 6. Series Collections (peer-level section)
                if !viewModel.bookSeries.isEmpty {
                    SeriesCollectionsSection(
                        rankings: viewModel.bookSeries,
                        onRankingTap: { ranking in
                            selectedRanking = ranking
                        },
                        onShowAll: { showRankings = true }
                    )
                }

                // 7. Weekly Picks (peer-level section)
                if !viewModel.weeklyPicks.isEmpty {
                    WeeklyPicksSection(
                        rankings: viewModel.weeklyPicks,
                        onRankingTap: { ranking in
                            selectedRanking = ranking
                        },
                        onShowAll: { showRankings = true }
                    )
                }

                // 8. Celebrity Picks (peer-level section - e.g., Bill Gates)
                if !viewModel.celebrityPicks.isEmpty {
                    CelebrityPicksSection(
                        rankings: viewModel.celebrityPicks,
                        onRankingTap: { ranking in
                            selectedRanking = ranking
                        },
                        onShowAll: { showRankings = true }
                    )
                }

                // 9. AI/ML Collection (simple book style)
                if let aiCollection = viewModel.aiCollection {
                    CollectionBooksSection(
                        collection: aiCollection,
                        themeColor: Color(red: 99/255, green: 102/255, blue: 241/255), // Indigo #6366F1
                        icon: "cpu.fill",
                        onBookTap: { book in handleBookTap(book) },
                        onShowAll: { showRankings = true }
                    )
                }

                // 10. Biography Collection (simple book style)
                if let bioCollection = viewModel.biographyCollection {
                    CollectionBooksSection(
                        collection: bioCollection,
                        themeColor: Color(red: 220/255, green: 38/255, blue: 38/255), // Red #DC2626
                        icon: "person.fill",
                        onBookTap: { book in handleBookTap(book) },
                        onShowAll: { showRankings = true }
                    )
                }

                // 12. Biographies (peer-level section - legacy list cards)
                if !viewModel.biographies.isEmpty {
                    BiographySection(
                        rankings: viewModel.biographies,
                        onRankingTap: { ranking in
                            selectedRanking = ranking
                        },
                        onShowAll: { showRankings = true }
                    )
                }

                // 10. Books by Year (mixed years display)
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

                // 10. Top Rated (with weighted random)
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

                // 11. User Book Lists (用户创建的书单，类似豆瓣豆列)
                if !viewModel.popularBookLists.isEmpty {
                    curatedCollectionsSection
                }

                // 12. All Books Grid (无限滚动加载所有书籍)
                allBooksGridSection
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
        .sheet(isPresented: $showEditorPicksList) {
            EditorPicksListView()
        }
        .sheet(isPresented: $showExternalRankingsList) {
            ExternalRankingsListView()
        }
        .sheet(isPresented: $showNYTListsView) {
            PlatformListView(platform: .nyt)
        }
        .sheet(isPresented: $showAmazonListsView) {
            PlatformListView(platform: .amazon)
        }
        .sheet(isPresented: $showGoodreadsListsView) {
            PlatformListView(platform: .goodreads)
        }
        .sheet(isPresented: $showPulitzerAwardsView) {
            AwardListView(award: .pulitzer)
        }
        .sheet(isPresented: $showBookerAwardsView) {
            AwardListView(award: .booker)
        }
        .sheet(isPresented: $showNewberyAwardsView) {
            AwardListView(award: .newbery)
        }
        .navigationDestination(item: $selectedBookList) { list in
            BookListDetailView(listId: list.id)
        }
        .sheet(item: $selectedRanking) { ranking in
            ExternalRankingDetailView(ranking: ranking)
        }
    }

    // MARK: - Book Tap Handler (for flattened sections)

    private func handleBookTap(_ book: ExternalRankingBook) {
        // Navigate to book detail if we have an internal book ID
        if let bookId = book.book.id {
            selectedItem = StoreItem(
                id: bookId,
                itemType: .ebook,
                itemId: bookId,
                title: book.book.title,
                subtitle: book.book.author,
                coverUrl: book.book.coverUrl,
                badge: nil
            )
        }
    }

    // MARK: - User Book Lists Section (用户书单)

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

    // MARK: - All Books Grid Section (Inline Infinite Scroll)

    private let gridColumns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]

    private var allBooksGridSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Section header
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: "books.vertical.fill")
                        .foregroundColor(.blue)
                    Text(L10n.Store.allBooks)
                        .font(.title3)
                        .fontWeight(.bold)
                }

                Spacer()

                if viewModel.allBooksTotal > 0 {
                    Text("\(viewModel.allBooks.count)/\(viewModel.allBooksTotal)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.horizontal, 16)

            // Books grid
            LazyVGrid(columns: gridColumns, spacing: 16) {
                ForEach(viewModel.allBooks) { book in
                    AllBooksGridItem(book: book) {
                        selectedItem = StoreItem(
                            id: book.id,
                            itemType: .ebook,
                            itemId: book.id,
                            title: book.title,
                            subtitle: nil,
                            coverUrl: book.coverUrl,
                            badge: nil
                        )
                    }
                    .onAppear {
                        // Auto-load more when reaching near the end
                        if book.id == viewModel.allBooks.last?.id {
                            Task {
                                await viewModel.loadMoreAllBooks()
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, 12)

            // Loading indicator
            if viewModel.isLoadingMoreBooks {
                HStack {
                    Spacer()
                    ProgressView()
                        .padding(.vertical, 16)
                    Spacer()
                }
            }
        }
    }
}

// MARK: - All Books Grid Item

private struct AllBooksGridItem: View {
    let book: Ebook
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 8) {
                // Cover
                if let coverUrl = book.coverUrl {
                    AsyncImage(url: R2Config.convertToPublicURL(coverUrl)) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .aspectRatio(2/3, contentMode: .fill)
                        case .failure:
                            coverPlaceholder
                        case .empty:
                            ProgressView()
                                .frame(maxWidth: .infinity)
                                .aspectRatio(2/3, contentMode: .fit)
                        @unknown default:
                            coverPlaceholder
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .aspectRatio(2/3, contentMode: .fit)
                    .cornerRadius(8)
                    .shadow(color: Color.black.opacity(0.15), radius: 4, x: 0, y: 2)
                } else {
                    coverPlaceholder
                }

                // Title
                Text(book.title)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.primary)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
            }
        }
        .buttonStyle(PlainButtonStyle())
    }

    private var coverPlaceholder: some View {
        Rectangle()
            .fill(Color.gray.opacity(0.2))
            .aspectRatio(2/3, contentMode: .fit)
            .cornerRadius(8)
            .overlay(
                Image(systemName: "book.closed.fill")
                    .font(.title2)
                    .foregroundColor(.gray.opacity(0.5))
            )
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
    // Peer-level sections
    @Published var editorPicks: [ExternalRanking] = []
    @Published var bookSeries: [ExternalRanking] = []
    @Published var weeklyPicks: [ExternalRanking] = []
    @Published var celebrityPicks: [ExternalRanking] = []
    @Published var biographies: [ExternalRanking] = []
    // Award-specific lists (legacy - kept for detail view navigation)
    @Published var pulitzerAwards: [ExternalRanking] = []
    @Published var bookerAwards: [ExternalRanking] = []
    @Published var newberyAwards: [ExternalRanking] = []
    // Platform-specific lists (legacy - kept for detail view navigation)
    @Published var nytLists: [ExternalRanking] = []
    @Published var amazonLists: [ExternalRanking] = []
    @Published var goodreadsLists: [ExternalRanking] = []
    // Flattened lists with books (NEW - for store sections)
    @Published var nytListsWithBooks: [ListWithBooks] = []
    @Published var amazonListsWithBooks: [ListWithBooks] = []
    @Published var goodreadsListsWithBooks: [ListWithBooks] = []
    @Published var pulitzerAwardsWithBooks: [ListWithBooks] = []
    @Published var bookerAwardsWithBooks: [ListWithBooks] = []
    @Published var newberyAwardsWithBooks: [ListWithBooks] = []
    @Published var editorPicksWithBooks: [ListWithBooks] = []
    // Category collections (single list with books)
    @Published var aiCollection: ListWithBooks?
    @Published var biographyCollection: ListWithBooks?
    // All books with pagination (infinite scroll)
    @Published var allBooks: [Ebook] = []
    @Published var allBooksTotal: Int = 0
    @Published var isLoadingMoreBooks = false
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let apiClient = APIClient.shared
    private var hasLoaded = false
    private var allBooksOffset = 0
    private let allBooksPageSize = 30
    private var hasMoreBooks = true

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
            // Peer-level sections
            group.addTask { await self.loadEditorPicks() }
            group.addTask { await self.loadBookSeries() }
            group.addTask { await self.loadWeeklyPicks() }
            group.addTask { await self.loadCelebrityPicks() }
            group.addTask { await self.loadBiographies() }
            // Award-specific lists
            group.addTask { await self.loadPulitzerAwards() }
            group.addTask { await self.loadBookerAwards() }
            group.addTask { await self.loadNewberyAwards() }
            // Platform-specific lists (legacy)
            group.addTask { await self.loadNYTLists() }
            group.addTask { await self.loadAmazonLists() }
            group.addTask { await self.loadGoodreadsLists() }
            // Flattened lists with books (NEW)
            group.addTask { await self.loadNYTListsWithBooks() }
            group.addTask { await self.loadAmazonListsWithBooks() }
            group.addTask { await self.loadGoodreadsListsWithBooks() }
            group.addTask { await self.loadPulitzerAwardsWithBooks() }
            group.addTask { await self.loadBookerAwardsWithBooks() }
            group.addTask { await self.loadNewberyAwardsWithBooks() }
            group.addTask { await self.loadEditorPicksWithBooks() }
            // Category collections (single list)
            group.addTask { await self.loadAICollection() }
            group.addTask { await self.loadBiographyCollection() }
            // All books with pagination (initial load)
            group.addTask { await self.loadAllBooks() }
        }

        isLoading = false
        hasLoaded = true
    }

    func refresh() async {
        // Force reload on manual refresh (pull-to-refresh)
        hasLoaded = false
        // Reset all books pagination state
        allBooks = []
        allBooksTotal = 0
        allBooksOffset = 0
        hasMoreBooks = true
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
            Log.d("Loading external rankings...")
            let response = try await apiClient.getExternalRankings(bookType: "ebook")
            Log.d("Loaded \(response.data.count) external rankings")
            externalRankings = interleaveRankingsBySources(rankings: response.data)
            Log.d("After interleave: \(externalRankings.count) rankings")
        } catch {
            Log.e("Failed to load external rankings: \(error)")
        }
    }

    // MARK: - Peer-Level Sections

    private func loadEditorPicks() async {
        do {
            Log.d("Loading editor picks...")
            let response = try await apiClient.getEditorPicks(limit: 10)
            editorPicks = response.data
            Log.d("Loaded \(editorPicks.count) editor picks")
        } catch {
            Log.e("Failed to load editor picks: \(error)")
        }
    }

    private func loadBookSeries() async {
        do {
            Log.d("Loading book series...")
            let response = try await apiClient.getBookSeries(limit: 10)
            bookSeries = response.data
            Log.d("Loaded \(bookSeries.count) book series")
        } catch {
            Log.e("Failed to load book series: \(error)")
        }
    }

    private func loadWeeklyPicks() async {
        do {
            Log.d("Loading weekly picks...")
            let response = try await apiClient.getWeeklyPicks(limit: 10)
            weeklyPicks = response.data
            Log.d("Loaded \(weeklyPicks.count) weekly picks")
        } catch {
            Log.e("Failed to load weekly picks: \(error)")
        }
    }

    private func loadCelebrityPicks() async {
        do {
            Log.d("Loading celebrity picks...")
            let response = try await apiClient.getCelebrityPicks(limit: 10)
            celebrityPicks = response.data
            Log.d("Loaded \(celebrityPicks.count) celebrity picks")
        } catch {
            Log.e("Failed to load celebrity picks: \(error)")
        }
    }

    private func loadBiographies() async {
        do {
            Log.d("Loading biographies...")
            let response = try await apiClient.getBiographies(limit: 10)
            biographies = response.data
            Log.d("Loaded \(biographies.count) biographies")
        } catch {
            Log.e("Failed to load biographies: \(error)")
        }
    }

    // MARK: - Award-Specific Lists

    private func loadPulitzerAwards() async {
        do {
            Log.d("Loading Pulitzer awards...")
            let response = try await apiClient.getPulitzerAwards(limit: 10)
            pulitzerAwards = response.data
            Log.d("Loaded \(pulitzerAwards.count) Pulitzer awards")
        } catch {
            Log.e("Failed to load Pulitzer awards: \(error)")
        }
    }

    private func loadBookerAwards() async {
        do {
            Log.d("Loading Booker awards...")
            let response = try await apiClient.getBookerAwards(limit: 10)
            bookerAwards = response.data
            Log.d("Loaded \(bookerAwards.count) Booker awards")
        } catch {
            Log.e("Failed to load Booker awards: \(error)")
        }
    }

    private func loadNewberyAwards() async {
        do {
            Log.d("Loading Newbery awards...")
            let response = try await apiClient.getNewberyAwards(limit: 10)
            newberyAwards = response.data
            Log.d("Loaded \(newberyAwards.count) Newbery awards")
        } catch {
            Log.e("Failed to load Newbery awards: \(error)")
        }
    }

    // MARK: - Platform-Specific Lists

    private func loadNYTLists() async {
        do {
            Log.d("Loading NYT lists...")
            let response = try await apiClient.getNYTLists(limit: 10)
            nytLists = response.data
            Log.d("Loaded \(nytLists.count) NYT lists")
        } catch {
            Log.e("Failed to load NYT lists: \(error)")
        }
    }

    private func loadAmazonLists() async {
        do {
            Log.d("Loading Amazon lists...")
            let response = try await apiClient.getAmazonLists(limit: 10)
            amazonLists = response.data
            Log.d("Loaded \(amazonLists.count) Amazon lists")
        } catch {
            Log.e("Failed to load Amazon lists: \(error)")
        }
    }

    private func loadGoodreadsLists() async {
        do {
            Log.d("Loading Goodreads lists...")
            let response = try await apiClient.getGoodreadsLists(limit: 10)
            goodreadsLists = response.data
            Log.d("Loaded \(goodreadsLists.count) Goodreads lists")
        } catch {
            Log.e("Failed to load Goodreads lists: \(error)")
        }
    }

    // MARK: - Flattened Lists With Books (NEW)

    private func loadNYTListsWithBooks() async {
        do {
            Log.d("Loading NYT lists with books...")
            let response = try await apiClient.getNYTListsWithBooks(limit: 5, booksPerList: 10)
            nytListsWithBooks = response.data
            Log.d("Loaded \(nytListsWithBooks.count) NYT lists with books")
        } catch {
            Log.e("Failed to load NYT lists with books: \(error)")
        }
    }

    private func loadAmazonListsWithBooks() async {
        do {
            Log.d("Loading Amazon lists with books...")
            let response = try await apiClient.getAmazonListsWithBooks(limit: 5, booksPerList: 10)
            amazonListsWithBooks = response.data
            Log.d("Loaded \(amazonListsWithBooks.count) Amazon lists with books")
        } catch {
            Log.e("Failed to load Amazon lists with books: \(error)")
        }
    }

    private func loadGoodreadsListsWithBooks() async {
        do {
            Log.d("Loading Goodreads lists with books...")
            let response = try await apiClient.getGoodreadsListsWithBooks(limit: 5, booksPerList: 10)
            goodreadsListsWithBooks = response.data
            Log.d("Loaded \(goodreadsListsWithBooks.count) Goodreads lists with books")
        } catch {
            Log.e("Failed to load Goodreads lists with books: \(error)")
        }
    }

    private func loadPulitzerAwardsWithBooks() async {
        do {
            Log.d("Loading Pulitzer awards with books...")
            let response = try await apiClient.getPulitzerAwardsWithBooks(limit: 5, booksPerList: 10)
            pulitzerAwardsWithBooks = response.data
            Log.d("Loaded \(pulitzerAwardsWithBooks.count) Pulitzer awards with books")
        } catch {
            Log.e("Failed to load Pulitzer awards with books: \(error)")
        }
    }

    private func loadBookerAwardsWithBooks() async {
        do {
            Log.d("Loading Booker awards with books...")
            let response = try await apiClient.getBookerAwardsWithBooks(limit: 5, booksPerList: 10)
            bookerAwardsWithBooks = response.data
            Log.d("Loaded \(bookerAwardsWithBooks.count) Booker awards with books")
        } catch {
            Log.e("Failed to load Booker awards with books: \(error)")
        }
    }

    private func loadNewberyAwardsWithBooks() async {
        do {
            Log.d("Loading Newbery awards with books...")
            let response = try await apiClient.getNewberyAwardsWithBooks(limit: 5, booksPerList: 10)
            newberyAwardsWithBooks = response.data
            Log.d("Loaded \(newberyAwardsWithBooks.count) Newbery awards with books")
        } catch {
            Log.e("Failed to load Newbery awards with books: \(error)")
        }
    }

    private func loadEditorPicksWithBooks() async {
        do {
            Log.d("Loading editor picks with books...")
            let response = try await apiClient.getEditorPicksWithBooks(limit: 5, booksPerList: 10)
            editorPicksWithBooks = response.data
            Log.d("Loaded \(editorPicksWithBooks.count) editor picks with books")
        } catch {
            Log.e("Failed to load editor picks with books: \(error)")
        }
    }

    // MARK: - Category Collections (Single List)

    private func loadAICollection() async {
        do {
            Log.d("Loading AI collection with books...")
            let response = try await apiClient.getAICollectionWithBooks(booksLimit: 20)
            aiCollection = response.data
            Log.d("Loaded AI collection: \(aiCollection?.books.count ?? 0) books")
        } catch {
            Log.e("Failed to load AI collection: \(error)")
        }
    }

    private func loadBiographyCollection() async {
        do {
            Log.d("Loading Biography collection with books...")
            let response = try await apiClient.getBiographyCollectionWithBooks(booksLimit: 20)
            biographyCollection = response.data
            Log.d("Loaded Biography collection: \(biographyCollection?.books.count ?? 0) books")
        } catch {
            Log.e("Failed to load Biography collection: \(error)")
        }
    }

    // MARK: - All Books Pagination (Infinite Scroll)

    private func loadAllBooks() async {
        do {
            Log.d("Loading all books (initial)...")
            allBooksOffset = 0
            let response = try await apiClient.getEbooks(limit: allBooksPageSize, offset: 0)
            allBooks = response.data
            allBooksTotal = response.total
            hasMoreBooks = allBooks.count < allBooksTotal
            allBooksOffset = allBooks.count
            Log.d("Loaded \(allBooks.count)/\(allBooksTotal) books")
        } catch {
            Log.e("Failed to load all books: \(error)")
        }
    }

    func loadMoreAllBooks() async {
        guard !isLoadingMoreBooks && hasMoreBooks else { return }

        isLoadingMoreBooks = true
        do {
            Log.d("Loading more books from offset \(allBooksOffset)...")
            let response = try await apiClient.getEbooks(limit: allBooksPageSize, offset: allBooksOffset)
            allBooks.append(contentsOf: response.data)
            hasMoreBooks = allBooks.count < allBooksTotal
            allBooksOffset = allBooks.count
            Log.d("Now have \(allBooks.count)/\(allBooksTotal) books")
        } catch {
            Log.e("Failed to load more books: \(error)")
        }
        isLoadingMoreBooks = false
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
