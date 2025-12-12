import SwiftUI

/// Unified store home view combining ebooks and magazines
/// with recommendations, categories, rankings, and discovery sections
struct StoreHomeView: View {
    @StateObject private var viewModel = StoreViewModel()
    @State private var showSearch = false
    @State private var selectedItem: StoreItem?
    @State private var showCategoryBrowser = false
    @State private var showRankings = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Search bar
                    searchBar

                    // Banner / Featured section
                    if !viewModel.recommendedBooks.isEmpty {
                        featuredSection
                    }

                    // Category quick access
                    if !viewModel.categories.isEmpty {
                        categorySection
                    }

                    // New arrivals
                    if !viewModel.newArrivals.isEmpty {
                        horizontalSection(
                            title: "新书上架",
                            subtitle: "最新电子书",
                            items: viewModel.newArrivals,
                            showMore: { showCategoryBrowser = true }
                        )
                    }

                    // Hot books
                    if !viewModel.hotBooks.isEmpty {
                        horizontalSection(
                            title: "热门杂志",
                            subtitle: "大家都在看",
                            items: viewModel.hotBooks,
                            showMore: { showCategoryBrowser = true }
                        )
                    }

                    // Rankings preview
                    if !viewModel.topRanked.isEmpty {
                        rankingPreviewSection
                    }
                }
                .padding(.bottom, 32)
            }
            .navigationTitle("书城")
            .refreshable {
                await viewModel.refresh()
            }
            .task {
                await viewModel.loadHomeData()
            }
            .navigationDestination(item: $selectedItem) { item in
                BookDetailView(
                    bookType: item.type == .ebook ? .ebook : .magazine,
                    bookId: item.itemId
                )
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
        }
    }

    // MARK: - Search Bar

    private var searchBar: some View {
        Button {
            showSearch = true
        } label: {
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.secondary)

                Text("搜索书籍、杂志...")
                    .foregroundColor(.secondary)

                Spacer()
            }
            .padding(12)
            .background(Color(.systemGray6))
            .cornerRadius(10)
        }
        .padding(.horizontal)
    }

    // MARK: - Featured Section

    private var featuredSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("为你推荐")
                .font(.title2)
                .fontWeight(.bold)
                .padding(.horizontal)

            TabView {
                ForEach(viewModel.recommendedBooks) { item in
                    FeaturedBookCard(item: item) {
                        selectedItem = item
                    }
                    .padding(.horizontal)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .automatic))
            .frame(height: 200)
        }
    }

    // MARK: - Category Section

    private var categorySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("分类浏览")
                    .font(.title2)
                    .fontWeight(.bold)

                Spacer()

                Button("全部分类") {
                    showCategoryBrowser = true
                }
                .font(.subheadline)
            }
            .padding(.horizontal)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(viewModel.categories.prefix(8)) { category in
                        CategoryCard(category: category) {
                            // Navigate to category
                        }
                    }
                }
                .padding(.horizontal)
            }
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

                Button("更多") {
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

    // MARK: - Ranking Preview Section

    private var rankingPreviewSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("排行榜")
                    .font(.title2)
                    .fontWeight(.bold)

                Spacer()

                Button("查看全部") {
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

// MARK: - Featured Book Card

struct FeaturedBookCard: View {
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
                    if let badge = item.badge {
                        Text(badge)
                            .font(.caption2)
                            .fontWeight(.semibold)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.blue.opacity(0.1))
                            .foregroundColor(.blue)
                            .cornerRadius(4)
                    }

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

// MARK: - Category Card

struct CategoryCard: View {
    let category: EbookCategory
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                ZStack {
                    Circle()
                        .fill(categoryColor.opacity(0.15))
                        .frame(width: 60, height: 60)

                    Image(systemName: categoryIcon)
                        .font(.title2)
                        .foregroundColor(categoryColor)
                }

                Text(category.name)
                    .font(.caption)
                    .foregroundColor(.primary)
                    .lineLimit(1)

                if let count = category.count, count > 0 {
                    Text("\(count)本")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            .frame(width: 80)
        }
        .buttonStyle(.plain)
    }

    private var categoryIcon: String {
        switch category.name {
        case _ where category.name.contains("小说"): return "book.closed"
        case _ where category.name.contains("科技"): return "cpu"
        case _ where category.name.contains("历史"): return "clock.arrow.circlepath"
        case _ where category.name.contains("文学"): return "text.book.closed"
        case _ where category.name.contains("经济"): return "chart.line.uptrend.xyaxis"
        case _ where category.name.contains("艺术"): return "paintpalette"
        default: return "folder"
        }
    }

    private var categoryColor: Color {
        switch category.id % 6 {
        case 0: return .blue
        case 1: return .green
        case 2: return .orange
        case 3: return .purple
        case 4: return .pink
        default: return .cyan
        }
    }
}

// MARK: - Store Book Card

struct StoreBookCard: View {
    let item: StoreItem
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                ZStack(alignment: .topTrailing) {
                    BookCoverView(coverUrl: item.coverUrl, title: item.title)
                        .frame(width: 120, height: 160)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .shadow(radius: 2)

                    if let badge = item.badge {
                        Text(badge)
                            .font(.caption2)
                            .fontWeight(.semibold)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(Color.orange)
                            .foregroundColor(.white)
                            .cornerRadius(4)
                            .padding(6)
                    }
                }

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

// MARK: - Ranking Row Preview

struct RankingRowPreview: View {
    let rank: Int
    let item: StoreItem
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                // Rank number
                Text("\(rank)")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(rankColor)
                    .frame(width: 32)

                // Cover
                BookCoverView(coverUrl: item.coverUrl, title: item.title)
                    .frame(width: 40, height: 54)
                    .clipShape(RoundedRectangle(cornerRadius: 4))

                // Info
                VStack(alignment: .leading, spacing: 4) {
                    Text(item.title)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                        .lineLimit(1)

                    if let subtitle = item.subtitle {
                        Text(subtitle)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal)
            .padding(.vertical, 12)
        }
        .buttonStyle(.plain)
    }

    private var rankColor: Color {
        switch rank {
        case 1: return .orange
        case 2: return .gray
        case 3: return Color(red: 0.8, green: 0.5, blue: 0.2)
        default: return .secondary
        }
    }
}

#Preview {
    StoreHomeView()
}
