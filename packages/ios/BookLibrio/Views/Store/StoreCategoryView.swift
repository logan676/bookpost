import SwiftUI

/// Full-screen category browser for the Store
/// Shows all categories with their books and allows filtering
struct StoreCategoryView: View {
    @StateObject private var viewModel = StoreCategoryViewModel()
    @Environment(\.dismiss) var dismiss
    @State private var selectedItem: StoreItem?

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Category tabs
                categoryTabs

                // Content
                Group {
                    if viewModel.isLoading && viewModel.items.isEmpty {
                        LoadingView()
                    } else if viewModel.items.isEmpty {
                        emptyState
                    } else {
                        itemsGrid
                    }
                }
            }
            .navigationTitle("分类浏览")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("完成") { dismiss() }
                }
            }
            .task {
                await viewModel.loadCategories()
            }
            .navigationDestination(item: $selectedItem) { item in
                BookDetailView(
                    bookType: item.type == .ebook ? .ebook : .magazine,
                    bookId: item.itemId
                )
            }
        }
    }

    // MARK: - Category Tabs

    private var categoryTabs: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                // All tab
                CategoryTabButton(
                    title: "全部",
                    isSelected: viewModel.selectedCategoryId == nil
                ) {
                    viewModel.selectCategory(nil)
                }

                ForEach(viewModel.categories) { category in
                    CategoryTabButton(
                        title: category.name,
                        count: category.count,
                        isSelected: viewModel.selectedCategoryId == category.id
                    ) {
                        viewModel.selectCategory(category.id)
                    }
                }
            }
            .padding(.horizontal)
        }
        .padding(.vertical, 12)
        .background(Color(.systemBackground))
        .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 2)
    }

    // MARK: - Items Grid

    private var itemsGrid: some View {
        ScrollView {
            LazyVGrid(columns: [
                GridItem(.adaptive(minimum: 140), spacing: 12)
            ], spacing: 16) {
                ForEach(viewModel.items) { item in
                    StoreBookCard(item: item) {
                        selectedItem = item
                    }
                }
            }
            .padding()
        }
        .refreshable {
            await viewModel.refresh()
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "books.vertical")
                .font(.system(size: 48))
                .foregroundColor(.secondary)

            Text("暂无内容")
                .font(.headline)
                .foregroundColor(.secondary)

            if viewModel.selectedCategoryId != nil {
                Button("查看全部") {
                    viewModel.selectCategory(nil)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Category Tab Button

struct CategoryTabButton: View {
    let title: String
    var count: Int? = nil
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(isSelected ? .semibold : .regular)

                if let count = count, count > 0 {
                    Text("\(count)")
                        .font(.caption2)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(isSelected ? Color.white.opacity(0.3) : Color(.systemGray4))
                        .cornerRadius(8)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(isSelected ? Color.blue : Color(.systemGray5))
            .foregroundColor(isSelected ? .white : .primary)
            .cornerRadius(20)
        }
    }
}

// MARK: - ViewModel

@MainActor
class StoreCategoryViewModel: ObservableObject {
    @Published var categories: [EbookCategory] = []
    @Published var items: [StoreItem] = []
    @Published var selectedCategoryId: Int?
    @Published var isLoading = false

    private let apiClient = APIClient.shared

    func loadCategories() async {
        do {
            let response = try await apiClient.getEbookCategories()
            categories = response.data
            await loadItems()
        } catch {
            print("Failed to load categories: \(error)")
        }
    }

    func selectCategory(_ categoryId: Int?) {
        selectedCategoryId = categoryId
        Task {
            await loadItems()
        }
    }

    func refresh() async {
        await loadItems()
    }

    private func loadItems() async {
        isLoading = true

        do {
            let ebooks = try await apiClient.getEbooks(
                category: selectedCategoryId,
                limit: 50
            )

            items = ebooks.data.map { StoreItem(from: $0) }
        } catch {
            print("Failed to load items: \(error)")
        }

        isLoading = false
    }
}

#Preview {
    StoreCategoryView()
}
