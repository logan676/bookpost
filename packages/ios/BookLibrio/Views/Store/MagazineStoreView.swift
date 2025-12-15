import SwiftUI

/// Store view for MAGAZINES ONLY
/// This view must NEVER display ebooks - they are completely separate
struct MagazineStoreView: View {
    @StateObject private var viewModel = MagazineStoreViewModel()
    @State private var selectedItem: StoreItem?
    @State private var showCategoryBrowser = false
    @State private var showRankings = false
    @State private var bookType = "magazine" // Used by CategoryGridView

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Featured magazines
                if !viewModel.featuredMagazines.isEmpty {
                    featuredSection
                }

                // Categories (using enhanced CategoryGridView)
                CategoryGridView(selectedBookType: $bookType)

                // New issues
                if !viewModel.newIssues.isEmpty {
                    horizontalSection(
                        title: "最新期刊",
                        subtitle: "最新上架杂志",
                        items: viewModel.newIssues,
                        showMore: { showCategoryBrowser = true }
                    )
                }

                // Popular magazines
                if !viewModel.popularMagazines.isEmpty {
                    horizontalSection(
                        title: "热门杂志",
                        subtitle: "大家都在读",
                        items: viewModel.popularMagazines,
                        showMore: { showCategoryBrowser = true }
                    )
                }

                // Rankings
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
            BookDetailView(bookType: .magazine, bookId: item.itemId)
        }
        .sheet(isPresented: $showCategoryBrowser) {
            StoreCategoryView()
        }
        .sheet(isPresented: $showRankings) {
            StoreRankingView()
        }
    }

    // MARK: - Featured Section

    private var featuredSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("精选杂志")
                        .font(.title2)
                        .fontWeight(.bold)
                    Text("编辑推荐")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Button(action: {
                    Task { await viewModel.refreshFeatured() }
                }) {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.clockwise")
                            .rotationEffect(.degrees(viewModel.isRefreshingFeatured ? 360 : 0))
                            .animation(
                                viewModel.isRefreshingFeatured
                                    ? Animation.linear(duration: 1).repeatForever(autoreverses: false)
                                    : .default,
                                value: viewModel.isRefreshingFeatured
                            )
                        Text("换一批")
                    }
                    .font(.subheadline)
                    .foregroundColor(.blue)
                }
                .disabled(viewModel.isRefreshingFeatured)
            }
            .padding(.horizontal)

            // Featured carousel
            TabView {
                ForEach(viewModel.featuredMagazines) { item in
                    MagazineFeaturedCard(item: item) {
                        selectedItem = item
                    }
                    .padding(.horizontal)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .automatic))
            .frame(height: 200)
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
                        MagazineCard(item: item) {
                            selectedItem = item
                        }
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
                Text("杂志排行榜")
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

// MARK: - Magazine Featured Card

struct MagazineFeaturedCard: View {
    let item: StoreItem
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                BookCoverView(coverUrl: item.coverUrl, title: item.title)
                    .frame(width: 120, height: 160)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .shadow(radius: 4)

                VStack(alignment: .leading, spacing: 8) {
                    Text(item.title)
                        .font(.headline)
                        .foregroundColor(.primary)
                        .lineLimit(2)

                    if let subtitle = item.subtitle {
                        Text(subtitle)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }

                    if let badge = item.badge {
                        Text(badge)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    Spacer()
                }

                Spacer()
            }
            .padding()
            .frame(maxWidth: .infinity)
            .background(Color(.systemBackground))
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.1), radius: 8, x: 0, y: 4)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Magazine Card

struct MagazineCard: View {
    let item: StoreItem
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                BookCoverView(coverUrl: item.coverUrl, title: item.title)
                    .frame(width: 120, height: 160)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .shadow(radius: 2)

                VStack(alignment: .leading, spacing: 2) {
                    Text(item.title)
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                        .lineLimit(2)

                    if let subtitle = item.subtitle {
                        Text(subtitle)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                }
            }
            .frame(width: 120)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Magazine Store ViewModel

@MainActor
class MagazineStoreViewModel: ObservableObject {
    @Published var featuredMagazines: [StoreItem] = []
    @Published var newIssues: [StoreItem] = []
    @Published var popularMagazines: [StoreItem] = []
    @Published var topRanked: [StoreItem] = []

    @Published var isLoading = false
    @Published var isRefreshingFeatured = false
    @Published var errorMessage: String?

    private let apiClient = APIClient.shared
    private var hasLoaded = false

    func loadHomeData() async {
        // Skip if already loaded (prevents reload on navigation back)
        guard !hasLoaded else { return }

        isLoading = true
        errorMessage = nil

        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.loadFeatured() }
            group.addTask { await self.loadNewIssues() }
            group.addTask { await self.loadPopular() }
            group.addTask { await self.loadTopRanked() }
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

    func refreshFeatured() async {
        isRefreshingFeatured = true
        await loadFeatured()
        isRefreshingFeatured = false
    }

    // MAGAZINE ONLY - No ebooks here
    private func loadFeatured() async {
        do {
            let magazines = try await apiClient.getMagazines(limit: 10)
            featuredMagazines = magazines.data.shuffled().prefix(6).map { StoreItem(from: $0) }
        } catch {
            print("Failed to load featured magazines: \(error)")
        }
    }

    private func loadNewIssues() async {
        do {
            let magazines = try await apiClient.getMagazines(limit: 10)
            newIssues = magazines.data.map { StoreItem(from: $0) }
        } catch {
            print("Failed to load new magazine issues: \(error)")
        }
    }

    private func loadPopular() async {
        do {
            let magazines = try await apiClient.getMagazines(limit: 10)
            popularMagazines = magazines.data.shuffled().map { StoreItem(from: $0) }
        } catch {
            print("Failed to load popular magazines: \(error)")
        }
    }

    private func loadTopRanked() async {
        do {
            let magazines = try await apiClient.getMagazines(limit: 10)
            topRanked = magazines.data.map { StoreItem(from: $0) }
        } catch {
            print("Failed to load top ranked magazines: \(error)")
        }
    }
}

#Preview {
    NavigationStack {
        MagazineStoreView()
    }
}
