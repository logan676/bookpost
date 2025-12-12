import SwiftUI

/// Full search view with suggestions, history, and results
struct StoreSearchView: View {
    @StateObject private var viewModel = StoreSearchViewModel()
    @Environment(\.dismiss) var dismiss
    @FocusState private var isSearchFocused: Bool
    @State private var selectedItem: StoreItem?

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search header
                searchHeader

                // Content based on state
                if viewModel.searchQuery.isEmpty {
                    searchSuggestionsView
                } else if viewModel.isSearching {
                    LoadingView()
                } else if viewModel.results.isEmpty {
                    emptyResultsView
                } else {
                    searchResultsView
                }
            }
            .navigationBarHidden(true)
            .navigationDestination(item: $selectedItem) { item in
                BookDetailView(
                    bookType: item.type == .ebook ? .ebook : .magazine,
                    bookId: item.itemId
                )
            }
        }
        .onAppear {
            isSearchFocused = true
        }
    }

    // MARK: - Search Header

    private var searchHeader: some View {
        HStack(spacing: 12) {
            // Search field
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.secondary)

                TextField("搜索书籍、杂志、作者...", text: $viewModel.searchQuery)
                    .textFieldStyle(.plain)
                    .focused($isSearchFocused)
                    .submitLabel(.search)
                    .onSubmit {
                        viewModel.performSearch()
                    }

                if !viewModel.searchQuery.isEmpty {
                    Button {
                        viewModel.clearSearch()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.secondary)
                    }
                }
            }
            .padding(12)
            .background(Color(.systemGray6))
            .cornerRadius(10)

            // Cancel button
            Button("取消") {
                dismiss()
            }
            .foregroundColor(.blue)
        }
        .padding()
        .background(Color(.systemBackground))
    }

    // MARK: - Search Suggestions

    private var searchSuggestionsView: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Search history
                if !viewModel.searchHistory.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("搜索历史")
                                .font(.headline)
                            Spacer()
                            Button("清空") {
                                viewModel.clearHistory()
                            }
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        }

                        FlowLayout(spacing: 8) {
                            ForEach(viewModel.searchHistory, id: \.self) { term in
                                HistoryChip(text: term) {
                                    viewModel.searchQuery = term
                                    viewModel.performSearch()
                                }
                            }
                        }
                    }
                }

                // Hot searches
                VStack(alignment: .leading, spacing: 12) {
                    Text("热门搜索")
                        .font(.headline)

                    FlowLayout(spacing: 8) {
                        ForEach(viewModel.hotSearches, id: \.self) { term in
                            HotSearchChip(text: term) {
                                viewModel.searchQuery = term
                                viewModel.performSearch()
                            }
                        }
                    }
                }
            }
            .padding()
        }
    }

    // MARK: - Empty Results

    private var emptyResultsView: some View {
        VStack(spacing: 16) {
            Spacer()

            Image(systemName: "magnifyingglass")
                .font(.system(size: 48))
                .foregroundColor(.secondary)

            Text("未找到相关结果")
                .font(.headline)

            Text("试试其他关键词")
                .font(.subheadline)
                .foregroundColor(.secondary)

            Spacer()
        }
    }

    // MARK: - Search Results

    private var searchResultsView: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // Results count
                Text("共找到 \(viewModel.results.count) 个结果")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .padding(.horizontal)

                // Filter tabs
                filterTabs

                // Results list
                LazyVStack(spacing: 0) {
                    ForEach(viewModel.filteredResults) { item in
                        SearchResultRow(item: item) {
                            selectedItem = item
                        }
                        Divider()
                            .padding(.leading, 90)
                    }
                }
                .background(Color(.systemBackground))
                .cornerRadius(12)
                .padding(.horizontal)
            }
            .padding(.vertical)
        }
    }

    private var filterTabs: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                FilterChip(
                    title: "全部",
                    count: viewModel.results.count,
                    isSelected: viewModel.selectedFilter == .all
                ) {
                    viewModel.selectedFilter = .all
                }

                FilterChip(
                    title: "电子书",
                    count: viewModel.ebookCount,
                    isSelected: viewModel.selectedFilter == .ebook
                ) {
                    viewModel.selectedFilter = .ebook
                }

                FilterChip(
                    title: "杂志",
                    count: viewModel.magazineCount,
                    isSelected: viewModel.selectedFilter == .magazine
                ) {
                    viewModel.selectedFilter = .magazine
                }
            }
            .padding(.horizontal)
        }
    }
}

// MARK: - Search Result Row

struct SearchResultRow: View {
    let item: StoreItem
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                // Cover
                BookCoverView(coverUrl: item.coverUrl, title: item.title)
                    .frame(width: 60, height: 80)
                    .clipShape(RoundedRectangle(cornerRadius: 4))
                    .shadow(radius: 1)

                // Info
                VStack(alignment: .leading, spacing: 6) {
                    Text(item.title)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                        .lineLimit(2)

                    if let subtitle = item.subtitle {
                        Text(subtitle)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    if let badge = item.badge {
                        Text(badge)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding()
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Supporting Views

struct HistoryChip: View {
    let text: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Image(systemName: "clock.arrow.circlepath")
                    .font(.caption2)
                Text(text)
                    .font(.subheadline)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color(.systemGray6))
            .foregroundColor(.primary)
            .cornerRadius(16)
        }
    }
}

struct HotSearchChip: View {
    let text: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(text)
                .font(.subheadline)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color.orange.opacity(0.1))
                .foregroundColor(.orange)
                .cornerRadius(16)
        }
    }
}

struct FilterChip: View {
    let title: String
    let count: Int
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Text(title)
                Text("(\(count))")
                    .font(.caption)
            }
            .font(.subheadline)
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(isSelected ? Color.blue : Color(.systemGray6))
            .foregroundColor(isSelected ? .white : .primary)
            .cornerRadius(20)
        }
    }
}

// MARK: - Flow Layout for Tags

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = FlowResult(
            in: proposal.replacingUnspecifiedDimensions().width,
            subviews: subviews,
            spacing: spacing
        )
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = FlowResult(
            in: bounds.width,
            subviews: subviews,
            spacing: spacing
        )
        for (index, subview) in subviews.enumerated() {
            subview.place(at: CGPoint(x: bounds.minX + result.positions[index].x,
                                      y: bounds.minY + result.positions[index].y),
                         proposal: .unspecified)
        }
    }

    struct FlowResult {
        var size: CGSize = .zero
        var positions: [CGPoint] = []

        init(in maxWidth: CGFloat, subviews: Subviews, spacing: CGFloat) {
            var x: CGFloat = 0
            var y: CGFloat = 0
            var rowHeight: CGFloat = 0

            for subview in subviews {
                let size = subview.sizeThatFits(.unspecified)

                if x + size.width > maxWidth && x > 0 {
                    x = 0
                    y += rowHeight + spacing
                    rowHeight = 0
                }

                positions.append(CGPoint(x: x, y: y))
                rowHeight = max(rowHeight, size.height)
                x += size.width + spacing
            }

            self.size = CGSize(width: maxWidth, height: y + rowHeight)
        }
    }
}

// MARK: - ViewModel

enum SearchFilter {
    case all, ebook, magazine
}

@MainActor
class StoreSearchViewModel: ObservableObject {
    @Published var searchQuery = ""
    @Published var results: [StoreItem] = []
    @Published var isSearching = false
    @Published var selectedFilter: SearchFilter = .all

    @Published var searchHistory: [String] = []
    @Published var hotSearches: [String] = [
        "人工智能", "心理学", "小说", "历史",
        "经济学", "科幻", "编程", "哲学"
    ]

    private let apiClient = APIClient.shared
    private let historyKey = "store_search_history"

    init() {
        loadHistory()
    }

    var ebookCount: Int {
        results.filter { $0.type == .ebook }.count
    }

    var magazineCount: Int {
        results.filter { $0.type == .magazine }.count
    }

    var filteredResults: [StoreItem] {
        switch selectedFilter {
        case .all: return results
        case .ebook: return results.filter { $0.type == .ebook }
        case .magazine: return results.filter { $0.type == .magazine }
        }
    }

    func performSearch() {
        guard !searchQuery.trimmingCharacters(in: .whitespaces).isEmpty else { return }

        addToHistory(searchQuery)
        isSearching = true

        Task {
            do {
                async let ebooksTask = apiClient.getEbooks(search: searchQuery, limit: 20)
                async let magazinesTask = apiClient.getMagazines(search: searchQuery, limit: 20)

                let (ebooks, magazines) = try await (ebooksTask, magazinesTask)

                results = ebooks.data.map { StoreItem(from: $0) } +
                         magazines.data.map { StoreItem(from: $0) }
            } catch {
                print("Search failed: \(error)")
                results = []
            }

            isSearching = false
        }
    }

    func clearSearch() {
        searchQuery = ""
        results = []
        selectedFilter = .all
    }

    func clearHistory() {
        searchHistory = []
        saveHistory()
    }

    private func addToHistory(_ term: String) {
        let trimmed = term.trimmingCharacters(in: .whitespaces)
        searchHistory.removeAll { $0 == trimmed }
        searchHistory.insert(trimmed, at: 0)
        if searchHistory.count > 10 {
            searchHistory = Array(searchHistory.prefix(10))
        }
        saveHistory()
    }

    private func loadHistory() {
        searchHistory = UserDefaults.standard.stringArray(forKey: historyKey) ?? []
    }

    private func saveHistory() {
        UserDefaults.standard.set(searchHistory, forKey: historyKey)
    }
}

#Preview {
    StoreSearchView()
}
