import SwiftUI

/// Grid view displaying all book categories with horizontal scroll
struct CategoryGridView: View {
    @StateObject private var viewModel = CategoryGridViewModel()
    @Binding var selectedBookType: String // "ebook" or "magazine"
    var showFictionOnly: Bool = false // When true, only show fiction-related categories

    // Fiction-related category slugs/names to show when showFictionOnly is true
    private let fictionCategorySlugs = ["fiction", "literature", "history", "technology", "science", "philosophy", "biography", "mystery", "romance", "fantasy", "thriller"]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(L10n.Store.categories)
                    .font(.title3)
                    .fontWeight(.bold)

                Spacer()

                NavigationLink {
                    AllCategoriesView(bookType: selectedBookType)
                } label: {
                    Text(L10n.Store.viewMore)
                        .font(.subheadline)
                        .foregroundColor(.primary)
                }
            }
            .padding(.horizontal)

            if viewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, minHeight: 80)
            } else if filteredCategories.isEmpty {
                Text(L10n.Store.noCategories)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, minHeight: 80)
            } else {
                // Horizontal scroll with dynamic categories
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 16) {
                        ForEach(filteredCategories) { category in
                            NavigationLink {
                                CategoryDetailView(category: category, bookType: selectedBookType)
                            } label: {
                                HorizontalCategoryCell(category: category)
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                    }
                    .padding(.horizontal)
                }
            }
        }
        .task {
            await viewModel.loadCategories(bookType: selectedBookType)
        }
        .onChange(of: selectedBookType) { newValue in
            Task {
                await viewModel.loadCategories(bookType: newValue)
            }
        }
    }

    private var filteredCategories: [Category] {
        if showFictionOnly {
            // Filter to only show fiction-related categories
            return viewModel.displayedCategories.filter { category in
                let slug = category.slug?.lowercased() ?? ""
                let name = category.name.lowercased()
                return fictionCategorySlugs.contains(where: { slug.contains($0) || name.contains($0) })
            }
        }
        return viewModel.displayedCategories
    }
}

// MARK: - Horizontal Category Cell (for horizontal scroll)

struct HorizontalCategoryCell: View {
    let category: Category

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(category.color.opacity(0.15))
                    .frame(width: 56, height: 56)

                Image(systemName: category.sfSymbolName)
                    .font(.title2)
                    .foregroundColor(category.color)
            }

            Text(category.localizedName)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(.primary)
                .lineLimit(1)
        }
        .frame(width: 72)
    }
}

// MARK: - Category Cell

struct CategoryCell: View {
    let category: Category

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(category.color.opacity(0.15))
                    .frame(width: 50, height: 50)

                Image(systemName: category.sfSymbolName)
                    .font(.title2)
                    .foregroundColor(category.color)
            }

            Text(category.localizedName)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(.primary)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

// MARK: - All Categories View

struct AllCategoriesView: View {
    let bookType: String
    @StateObject private var viewModel = CategoryGridViewModel()

    let columns = [
        GridItem(.flexible(), spacing: 16),
        GridItem(.flexible(), spacing: 16)
    ]

    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 16) {
                ForEach(viewModel.categories) { category in
                    NavigationLink {
                        CategoryDetailView(category: category, bookType: bookType)
                    } label: {
                        LargeCategoryCell(category: category)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
            .padding()
        }
        .navigationTitle(L10n.Store.allCategories)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadCategories(bookType: bookType)
        }
    }
}

// MARK: - Large Category Cell

struct LargeCategoryCell: View {
    let category: Category

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                ZStack {
                    Circle()
                        .fill(category.color.opacity(0.15))
                        .frame(width: 44, height: 44)

                    Image(systemName: category.sfSymbolName)
                        .font(.title3)
                        .foregroundColor(category.color)
                }

                Spacer()

                if category.totalBookCount > 0 {
                    Text(L10n.Store.bookCount(category.totalBookCount))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(category.localizedName)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.primary)

                if let nameEn = category.nameEn {
                    Text(nameEn)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }

            if let children = category.children, !children.isEmpty {
                Text(children.prefix(3).map { $0.localizedName }.joined(separator: " · "))
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}

// MARK: - ViewModel

@MainActor
class CategoryGridViewModel: ObservableObject {
    @Published var categories: [Category] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let apiClient = APIClient.shared
    private var maxDisplayCount = 20 // Show more categories in horizontal scroll
    private var loadedBookType: String? // Track which bookType has been loaded

    var displayedCategories: [Category] {
        Array(categories.prefix(maxDisplayCount))
    }

    func loadCategories(bookType: String) async {
        // Skip if already loaded for this bookType (prevents reload on tab resume)
        guard loadedBookType != bookType else { return }
        guard !isLoading else { return }

        isLoading = true
        errorMessage = nil

        do {
            let response = try await apiClient.getCategories(bookType: bookType, flat: false)
            // Filter to top-level categories only for the grid display
            categories = response.data.filter { $0.isTopLevel }
            loadedBookType = bookType
        } catch {
            errorMessage = error.localizedDescription
            print("Failed to load categories: \(error)")
        }

        isLoading = false
    }
}
