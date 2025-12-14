import SwiftUI

/// Grid view displaying all book categories with horizontal scroll
struct CategoryGridView: View {
    @StateObject private var viewModel = CategoryGridViewModel()
    @Binding var selectedBookType: String // "ebook" or "magazine"

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("分类")
                    .font(.title2)
                    .fontWeight(.bold)

                Spacer()

                NavigationLink {
                    AllCategoriesView(bookType: selectedBookType)
                } label: {
                    Text("全部")
                        .font(.subheadline)
                        .foregroundColor(.blue)
                }
            }
            .padding(.horizontal)

            if viewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, minHeight: 100)
            } else if viewModel.categories.isEmpty {
                Text("暂无分类")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, minHeight: 100)
            } else {
                // Horizontal scroll with dynamic categories
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(viewModel.displayedCategories) { category in
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
        .navigationTitle("全部分类")
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
                    Text("\(category.totalBookCount)本")
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

    var displayedCategories: [Category] {
        Array(categories.prefix(maxDisplayCount))
    }

    func loadCategories(bookType: String) async {
        guard !isLoading else { return }

        isLoading = true
        errorMessage = nil

        do {
            let response = try await apiClient.getCategories(bookType: bookType, flat: false)
            // Filter to top-level categories only for the grid display
            categories = response.data.filter { $0.isTopLevel }
        } catch {
            errorMessage = error.localizedDescription
            print("Failed to load categories: \(error)")
        }

        isLoading = false
    }
}
