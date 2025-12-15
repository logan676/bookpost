import SwiftUI

/// Related books carousel showing AI-recommended similar books
/// Displays books with matching themes, authors, or reader preferences
struct RelatedBooksView: View {
    let currentBookId: String
    let currentBookTitle: String
    @State private var relatedBooks: [SuggestedBook] = []
    @State private var isLoading = true
    @State private var selectedCategory: RelationCategory = .similar

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Section header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Image(systemName: "sparkles")
                            .foregroundColor(.purple)
                        Text("相关推荐")
                            .font(.headline)
                    }

                    Text("基于《\(currentBookTitle)》为您推荐")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                NavigationLink {
                    AllRelatedBooksView(
                        currentBookId: currentBookId,
                        currentBookTitle: currentBookTitle
                    )
                } label: {
                    Text("查看全部")
                        .font(.subheadline)
                        .foregroundColor(.blue)
                }
            }
            .padding(.horizontal)

            // Category filter
            categoryFilter

            // Books carousel
            if isLoading {
                loadingPlaceholder
            } else if filteredBooks.isEmpty {
                emptyState
            } else {
                booksCarousel
            }
        }
        .onAppear {
            loadRelatedBooks()
        }
    }

    // MARK: - Category Filter

    private var categoryFilter: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(RelationCategory.allCases, id: \.self) { category in
                    categoryChip(category)
                }
            }
            .padding(.horizontal)
        }
    }

    private func categoryChip(_ category: RelationCategory) -> some View {
        let isSelected = selectedCategory == category

        return Button {
            withAnimation {
                selectedCategory = category
            }
        } label: {
            HStack(spacing: 4) {
                Image(systemName: category.iconName)
                    .font(.caption)
                Text(category.displayName)
                    .font(.caption)
            }
            .foregroundColor(isSelected ? .white : .primary)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(isSelected ? Color.blue : Color(.systemGray6))
            .cornerRadius(16)
        }
    }

    // MARK: - Books Carousel

    private var filteredBooks: [SuggestedBook] {
        if selectedCategory == .all {
            return relatedBooks
        }
        return relatedBooks.filter { $0.category == selectedCategory }
    }

    private var booksCarousel: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 16) {
                ForEach(filteredBooks) { book in
                    NavigationLink {
                        // Navigate to book detail
                        Text("Book Detail: \(book.title)")
                    } label: {
                        relatedBookCard(book)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal)
        }
    }

    private func relatedBookCard(_ book: SuggestedBook) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            // Book cover
            ZStack(alignment: .topTrailing) {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color(.systemGray5))
                    .frame(width: 110, height: 160)
                    .overlay(
                        Image(systemName: "book.fill")
                            .font(.largeTitle)
                            .foregroundColor(.secondary)
                    )

                // Match percentage badge
                if let matchPercent = book.matchPercentage {
                    Text("\(matchPercent)%")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.green)
                        .cornerRadius(4)
                        .offset(x: -4, y: 4)
                }
            }

            // Book info
            VStack(alignment: .leading, spacing: 2) {
                Text(book.title)
                    .font(.caption)
                    .fontWeight(.medium)
                    .lineLimit(2)
                    .foregroundColor(.primary)

                Text(book.author)
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }
            .frame(width: 110, alignment: .leading)

            // Rating
            HStack(spacing: 2) {
                Image(systemName: "star.fill")
                    .font(.caption2)
                    .foregroundColor(.orange)
                Text(String(format: "%.1f", book.rating))
                    .font(.caption2)
                    .foregroundColor(.secondary)

                if book.reviewCount > 0 {
                    Text("(\(formatCount(book.reviewCount)))")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }

            // Relation reason tag
            Text(book.relationReason)
                .font(.caption2)
                .foregroundColor(.blue)
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(Color.blue.opacity(0.1))
                .cornerRadius(4)
                .lineLimit(1)
        }
    }

    // MARK: - Helper Views

    private var loadingPlaceholder: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 16) {
                ForEach(0..<4, id: \.self) { _ in
                    VStack(alignment: .leading, spacing: 8) {
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color(.systemGray5))
                            .frame(width: 110, height: 160)

                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color(.systemGray5))
                            .frame(width: 100, height: 12)

                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color(.systemGray6))
                            .frame(width: 70, height: 10)
                    }
                    .shimmer()
                }
            }
            .padding(.horizontal)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 8) {
            Image(systemName: "books.vertical")
                .font(.title)
                .foregroundColor(.secondary)
            Text("暂无相关推荐")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }

    private func formatCount(_ count: Int) -> String {
        if count >= 10000 {
            return String(format: "%.1f万", Double(count) / 10000)
        } else if count >= 1000 {
            return String(format: "%.1fk", Double(count) / 1000)
        }
        return "\(count)"
    }

    // MARK: - Data Loading

    private func loadRelatedBooks() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            relatedBooks = SuggestedBook.sampleData
            isLoading = false
        }
    }
}

// MARK: - All Related Books View

struct AllRelatedBooksView: View {
    let currentBookId: String
    let currentBookTitle: String
    @State private var books: [SuggestedBook] = SuggestedBook.sampleData
    @State private var selectedCategory: RelationCategory = .all
    @State private var sortOrder: SortOrder = .relevance

    var body: some View {
        VStack(spacing: 0) {
            // Filter bar
            filterBar

            // Books grid
            ScrollView {
                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: 16) {
                    ForEach(filteredAndSortedBooks) { book in
                        bookGridItem(book)
                    }
                }
                .padding()
            }
        }
        .navigationTitle("相关推荐")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Menu {
                    ForEach(SortOrder.allCases, id: \.self) { order in
                        Button {
                            sortOrder = order
                        } label: {
                            HStack {
                                Text(order.displayName)
                                if sortOrder == order {
                                    Image(systemName: "checkmark")
                                }
                            }
                        }
                    }
                } label: {
                    Image(systemName: "arrow.up.arrow.down")
                }
            }
        }
    }

    private var filterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(RelationCategory.allCases, id: \.self) { category in
                    let isSelected = selectedCategory == category
                    Button {
                        withAnimation {
                            selectedCategory = category
                        }
                    } label: {
                        Text(category.displayName)
                            .font(.subheadline)
                            .foregroundColor(isSelected ? .white : .primary)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(isSelected ? Color.blue : Color(.systemGray6))
                            .cornerRadius(20)
                    }
                }
            }
            .padding()
        }
    }

    private var filteredAndSortedBooks: [SuggestedBook] {
        var result = books

        if selectedCategory != .all {
            result = result.filter { $0.category == selectedCategory }
        }

        switch sortOrder {
        case .relevance:
            result.sort { ($0.matchPercentage ?? 0) > ($1.matchPercentage ?? 0) }
        case .rating:
            result.sort { $0.rating > $1.rating }
        case .popularity:
            result.sort { $0.reviewCount > $1.reviewCount }
        case .newest:
            result.sort { ($0.publishYear ?? 0) > ($1.publishYear ?? 0) }
        }

        return result
    }

    private func bookGridItem(_ book: SuggestedBook) -> some View {
        NavigationLink {
            Text("Book Detail: \(book.title)")
        } label: {
            VStack(alignment: .leading, spacing: 6) {
                // Cover
                ZStack(alignment: .topTrailing) {
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Color(.systemGray5))
                        .aspectRatio(0.7, contentMode: .fit)
                        .overlay(
                            Image(systemName: "book.fill")
                                .font(.title2)
                                .foregroundColor(.secondary)
                        )

                    if let match = book.matchPercentage {
                        Text("\(match)%")
                            .font(.caption2)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .padding(.horizontal, 4)
                            .padding(.vertical, 2)
                            .background(Color.green)
                            .cornerRadius(4)
                            .offset(x: -4, y: 4)
                    }
                }

                // Title
                Text(book.title)
                    .font(.caption)
                    .fontWeight(.medium)
                    .lineLimit(2)
                    .foregroundColor(.primary)

                // Author
                Text(book.author)
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .lineLimit(1)

                // Rating
                HStack(spacing: 2) {
                    Image(systemName: "star.fill")
                        .font(.caption2)
                        .foregroundColor(.orange)
                    Text(String(format: "%.1f", book.rating))
                        .font(.caption2)
                }
                .foregroundColor(.secondary)
            }
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Shimmer Effect

extension View {
    func shimmer() -> some View {
        self.redacted(reason: .placeholder)
    }
}

// MARK: - Relation Category

enum RelationCategory: String, CaseIterable {
    case all
    case similar
    case sameAuthor
    case sameTheme
    case readersAlsoRead
    case classic

    var displayName: String {
        switch self {
        case .all: return "全部"
        case .similar: return "相似风格"
        case .sameAuthor: return "同一作者"
        case .sameTheme: return "相同主题"
        case .readersAlsoRead: return "读者也在读"
        case .classic: return "经典推荐"
        }
    }

    var iconName: String {
        switch self {
        case .all: return "square.grid.2x2"
        case .similar: return "sparkles"
        case .sameAuthor: return "person"
        case .sameTheme: return "tag"
        case .readersAlsoRead: return "person.2"
        case .classic: return "crown"
        }
    }
}

// MARK: - Sort Order

enum SortOrder: String, CaseIterable {
    case relevance
    case rating
    case popularity
    case newest

    var displayName: String {
        switch self {
        case .relevance: return "相关度"
        case .rating: return "评分最高"
        case .popularity: return "最受欢迎"
        case .newest: return "最新出版"
        }
    }
}

// MARK: - Suggested Book Model

struct SuggestedBook: Identifiable {
    let id: String
    let title: String
    let author: String
    let coverUrl: String?
    let rating: Double
    let reviewCount: Int
    let category: RelationCategory
    let relationReason: String
    let matchPercentage: Int?
    let publishYear: Int?
}

// MARK: - Sample Data

extension SuggestedBook {
    static let sampleData: [SuggestedBook] = [
        SuggestedBook(
            id: "1",
            title: "活着",
            author: "余华",
            coverUrl: nil,
            rating: 9.4,
            reviewCount: 89234,
            category: .similar,
            relationReason: "相似的叙事风格",
            matchPercentage: 95,
            publishYear: 1993
        ),
        SuggestedBook(
            id: "2",
            title: "许三观卖血记",
            author: "余华",
            coverUrl: nil,
            rating: 9.1,
            reviewCount: 45678,
            category: .sameAuthor,
            relationReason: "同一作者作品",
            matchPercentage: 88,
            publishYear: 1995
        ),
        SuggestedBook(
            id: "3",
            title: "白鹿原",
            author: "陈忠实",
            coverUrl: nil,
            rating: 9.0,
            reviewCount: 67890,
            category: .sameTheme,
            relationReason: "乡土文学经典",
            matchPercentage: 82,
            publishYear: 1993
        ),
        SuggestedBook(
            id: "4",
            title: "人生",
            author: "路遥",
            coverUrl: nil,
            rating: 8.8,
            reviewCount: 34567,
            category: .sameTheme,
            relationReason: "时代背景相似",
            matchPercentage: 78,
            publishYear: 1982
        ),
        SuggestedBook(
            id: "5",
            title: "穆斯林的葬礼",
            author: "霍达",
            coverUrl: nil,
            rating: 8.6,
            reviewCount: 23456,
            category: .readersAlsoRead,
            relationReason: "读者同时在读",
            matchPercentage: 75,
            publishYear: 1988
        ),
        SuggestedBook(
            id: "6",
            title: "红楼梦",
            author: "曹雪芹",
            coverUrl: nil,
            rating: 9.6,
            reviewCount: 156789,
            category: .classic,
            relationReason: "中国文学经典",
            matchPercentage: nil,
            publishYear: 1791
        ),
        SuggestedBook(
            id: "7",
            title: "围城",
            author: "钱钟书",
            coverUrl: nil,
            rating: 9.0,
            reviewCount: 78901,
            category: .classic,
            relationReason: "讽刺小说经典",
            matchPercentage: nil,
            publishYear: 1947
        ),
        SuggestedBook(
            id: "8",
            title: "边城",
            author: "沈从文",
            coverUrl: nil,
            rating: 8.9,
            reviewCount: 56789,
            category: .similar,
            relationReason: "田园牧歌风格",
            matchPercentage: 70,
            publishYear: 1934
        )
    ]
}

// MARK: - Compact Related Books Row

/// Compact version for displaying in book detail page
struct RelatedBooksRow: View {
    let currentBookId: String
    let currentBookTitle: String

    var body: some View {
        RelatedBooksView(
            currentBookId: currentBookId,
            currentBookTitle: currentBookTitle
        )
    }
}

#Preview {
    NavigationStack {
        RelatedBooksView(currentBookId: "1", currentBookTitle: "平凡的世界")
    }
}
