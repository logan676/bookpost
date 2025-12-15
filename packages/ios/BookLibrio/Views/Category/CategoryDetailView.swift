import SwiftUI

/// Detail view showing books in a specific category
struct CategoryDetailView: View {
    let category: Category
    let bookType: String

    @StateObject private var viewModel = CategoryDetailViewModel()
    @State private var selectedSort: SortOption = .newest
    @State private var selectedBookId: Int?

    enum SortOption: String, CaseIterable {
        case newest = "newest"
        case popular = "popular"
        case rating = "rating"

        var displayName: String {
            switch self {
            case .newest: return "最新"
            case .popular: return "最热"
            case .rating: return "评分"
            }
        }
    }

    let columns = [
        GridItem(.flexible(), spacing: 16),
        GridItem(.flexible(), spacing: 16),
        GridItem(.flexible(), spacing: 16)
    ]

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Header with category info
                categoryHeader

                // Sub-categories (if any)
                if let children = category.children, !children.isEmpty {
                    subCategoriesSection(children: children)
                }

                // Sort options
                sortOptionsBar

                // Books grid
                booksGrid
            }
            .padding(.vertical)
        }
        .navigationTitle(category.localizedName)
        .navigationBarTitleDisplayMode(.large)
        .navigationDestination(item: $selectedBookId) { bookId in
            if bookType == "ebook" {
                BookDetailView(bookType: .ebook, bookId: bookId)
            } else {
                BookDetailView(bookType: .magazine, bookId: bookId)
            }
        }
        .task {
            await viewModel.loadBooks(
                categoryId: category.id,
                bookType: bookType,
                sort: selectedSort.rawValue
            )
        }
        .onChange(of: selectedSort) { newValue in
            Task {
                await viewModel.loadBooks(
                    categoryId: category.id,
                    bookType: bookType,
                    sort: newValue.rawValue
                )
            }
        }
    }

    // MARK: - Category Header

    private var categoryHeader: some View {
        HStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(category.color.opacity(0.15))
                    .frame(width: 60, height: 60)

                Image(systemName: category.sfSymbolName)
                    .font(.title)
                    .foregroundColor(category.color)
            }

            VStack(alignment: .leading, spacing: 4) {
                if let nameEn = category.nameEn {
                    Text(nameEn)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                if let description = category.description {
                    Text(description)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }

                Text("\(category.totalBookCount)本书")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
        .padding(.horizontal)
    }

    // MARK: - Sub-categories

    private func subCategoriesSection(children: [Category]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("子分类")
                .font(.headline)
                .padding(.horizontal)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(children) { child in
                        NavigationLink {
                            CategoryDetailView(category: child, bookType: bookType)
                        } label: {
                            SubCategoryChip(category: child)
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
                .padding(.horizontal)
            }
        }
    }

    // MARK: - Sort Options

    private var sortOptionsBar: some View {
        HStack(spacing: 16) {
            ForEach(SortOption.allCases, id: \.self) { option in
                Button {
                    selectedSort = option
                } label: {
                    Text(option.displayName)
                        .font(.subheadline)
                        .fontWeight(selectedSort == option ? .semibold : .regular)
                        .foregroundColor(selectedSort == option ? category.color : .secondary)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(
                            selectedSort == option
                                ? category.color.opacity(0.1)
                                : Color.clear
                        )
                        .cornerRadius(16)
                }
            }

            Spacer()
        }
        .padding(.horizontal)
    }

    // MARK: - Books Grid

    private var booksGrid: some View {
        Group {
            if viewModel.isLoading && viewModel.books.isEmpty {
                ProgressView()
                    .frame(maxWidth: .infinity, minHeight: 200)
            } else if viewModel.books.isEmpty {
                emptyState
            } else {
                LazyVGrid(columns: columns, spacing: 20) {
                    ForEach(viewModel.books) { book in
                        CategoryBookCard(book: book, accentColor: category.color) {
                            selectedBookId = book.id
                        }
                    }
                }
                .padding(.horizontal)

                // Load more button
                if viewModel.hasMore {
                    Button {
                        Task {
                            await viewModel.loadMore(
                                categoryId: category.id,
                                bookType: bookType,
                                sort: selectedSort.rawValue
                            )
                        }
                    } label: {
                        if viewModel.isLoadingMore {
                            ProgressView()
                        } else {
                            Text("加载更多")
                                .font(.subheadline)
                                .foregroundColor(.blue)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                }
            }
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "books.vertical")
                .font(.system(size: 50))
                .foregroundColor(.secondary)

            Text("暂无书籍")
                .font(.headline)
                .foregroundColor(.secondary)

            Text("该分类下还没有书籍")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, minHeight: 200)
        .padding()
    }
}

// MARK: - Sub Category Chip

struct SubCategoryChip: View {
    let category: Category

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: category.sfSymbolName)
                .font(.caption)
                .foregroundColor(category.color)

            Text(category.localizedName)
                .font(.subheadline)
                .foregroundColor(.primary)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color(.systemGray6))
        .cornerRadius(16)
    }
}

// MARK: - Category Book Card

struct CategoryBookCard: View {
    let book: CategoryBookItem
    let accentColor: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                // Cover
                BookCoverView(coverUrl: book.coverUrl, title: book.title)
                    .frame(height: 150)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)

                // Info
                VStack(alignment: .leading, spacing: 4) {
                    Text(book.title)
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)

                    if let author = book.author {
                        Text(author)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }

                    if let rating = book.externalRating, rating > 0 {
                        HStack(spacing: 2) {
                            Image(systemName: "star.fill")
                                .font(.caption2)
                                .foregroundColor(.orange)
                            Text(String(format: "%.1f", rating))
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - ViewModel

@MainActor
class CategoryDetailViewModel: ObservableObject {
    @Published var books: [CategoryBookItem] = []
    @Published var isLoading = false
    @Published var isLoadingMore = false
    @Published var errorMessage: String?
    @Published var hasMore = false

    private let apiClient = APIClient.shared
    private var currentPage = 1
    private let pageSize = 20

    func loadBooks(categoryId: Int, bookType: String, sort: String) async {
        guard !isLoading else { return }

        isLoading = true
        errorMessage = nil
        currentPage = 1

        do {
            let response = try await apiClient.getCategoryBooks(
                categoryId: categoryId,
                bookType: bookType,
                page: currentPage,
                limit: pageSize,
                sort: sort,
                includeChildren: true
            )
            books = response.data
            hasMore = response.pagination.page < response.pagination.totalPages
        } catch {
            errorMessage = error.localizedDescription
            print("Failed to load category books: \(error)")
        }

        isLoading = false
    }

    func loadMore(categoryId: Int, bookType: String, sort: String) async {
        guard !isLoadingMore && hasMore else { return }

        isLoadingMore = true
        currentPage += 1

        do {
            let response = try await apiClient.getCategoryBooks(
                categoryId: categoryId,
                bookType: bookType,
                page: currentPage,
                limit: pageSize,
                sort: sort,
                includeChildren: true
            )
            books.append(contentsOf: response.data)
            hasMore = response.pagination.page < response.pagination.totalPages
        } catch {
            currentPage -= 1
            print("Failed to load more books: \(error)")
        }

        isLoadingMore = false
    }
}
