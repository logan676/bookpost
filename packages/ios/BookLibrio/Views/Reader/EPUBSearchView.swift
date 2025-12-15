import SwiftUI

#if canImport(ReadiumShared) && canImport(ReadiumNavigator)
import ReadiumShared
import ReadiumNavigator
#endif

/// Search result item model
struct EPUBSearchResult: Identifiable {
    let id = UUID()
    let text: String
    let chapterTitle: String?
    let textBefore: String?
    let textAfter: String?

    #if canImport(ReadiumShared)
    let locator: Locator

    init(locator: Locator, textBefore: String? = nil, textAfter: String? = nil) {
        self.locator = locator
        self.text = locator.text.highlight ?? ""
        self.chapterTitle = locator.title
        self.textBefore = textBefore ?? locator.text.before
        self.textAfter = textAfter ?? locator.text.after
    }
    #else
    init(text: String, chapterTitle: String?, textBefore: String? = nil, textAfter: String? = nil) {
        self.text = text
        self.chapterTitle = chapterTitle
        self.textBefore = textBefore
        self.textAfter = textAfter
    }
    #endif
}

/// Search view model for EPUB full-text search
@MainActor
class EPUBSearchViewModel: ObservableObject {
    @Published var searchQuery = ""
    @Published var results: [EPUBSearchResult] = []
    @Published var isSearching = false
    @Published var hasSearched = false

    #if canImport(ReadiumShared) && canImport(ReadiumNavigator)
    private var publication: Publication?
    private var searchTask: Task<Void, Never>?

    func setPublication(_ publication: Publication) {
        self.publication = publication
    }

    func search() {
        guard !searchQuery.trimmingCharacters(in: .whitespaces).isEmpty,
              let publication = publication else { return }

        // Cancel any existing search
        searchTask?.cancel()

        isSearching = true
        hasSearched = true
        results = []

        searchTask = Task {
            do {
                // Readium 3.x search using SearchService
                let searchService = publication.findService(SearchService.self)
                guard let searchService = searchService else {
                    await MainActor.run {
                        self.isSearching = false
                    }
                    return
                }

                let query = searchQuery.trimmingCharacters(in: .whitespaces)
                let searchResult = await searchService.search(query: query, options: nil)

                var searchResults: [EPUBSearchResult] = []

                switch searchResult {
                case .success(let iterator):
                    // Iterate through search results
                    while !Task.isCancelled {
                        let nextResult = try await iterator.next()
                        switch nextResult {
                        case .success(let locatorCollection):
                            guard let collection = locatorCollection else {
                                // No more results
                                break
                            }

                            for locator in collection.locators {
                                let searchResultItem = EPUBSearchResult(locator: locator)
                                searchResults.append(searchResultItem)

                                // Update UI periodically for better UX
                                if searchResults.count % 10 == 0 {
                                    await MainActor.run {
                                        self.results = searchResults
                                    }
                                }
                            }

                        case .failure(let error):
                            print("Search iteration error: \(error)")
                            break
                        }

                        // Check if we got nil (end of results)
                        if case .success(let collection) = nextResult, collection == nil {
                            break
                        }
                    }

                case .failure(let error):
                    print("Search start error: \(error)")
                }

                await MainActor.run {
                    self.results = searchResults
                    self.isSearching = false
                }

            } catch {
                if !Task.isCancelled {
                    print("Search failed: \(error)")
                    await MainActor.run {
                        self.isSearching = false
                    }
                }
            }
        }
    }

    func cancelSearch() {
        searchTask?.cancel()
        searchTask = nil
        isSearching = false
    }
    #else
    func search() {
        // No-op when Readium is not available
        hasSearched = true
    }

    func cancelSearch() {}
    #endif

    func clearResults() {
        results = []
        hasSearched = false
        searchQuery = ""
    }
}

/// EPUB Search Sheet View
struct EPUBSearchView: View {
    @StateObject private var viewModel = EPUBSearchViewModel()
    @Environment(\.dismiss) var dismiss
    @FocusState private var isSearchFocused: Bool

    #if canImport(ReadiumShared) && canImport(ReadiumNavigator)
    let publication: Publication
    let onSelectResult: (Locator) -> Void

    init(publication: Publication, onSelectResult: @escaping (Locator) -> Void) {
        self.publication = publication
        self.onSelectResult = onSelectResult
    }
    #else
    let onSelectResult: (Any) -> Void

    init(onSelectResult: @escaping (Any) -> Void) {
        self.onSelectResult = onSelectResult
    }
    #endif

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search bar
                searchBar

                Divider()

                // Results
                resultsList
            }
            .navigationTitle(L10n.Reader.search)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(L10n.Reader.done) {
                        dismiss()
                    }
                }
            }
            .onAppear {
                #if canImport(ReadiumShared) && canImport(ReadiumNavigator)
                viewModel.setPublication(publication)
                #endif
                isSearchFocused = true
            }
            .onDisappear {
                viewModel.cancelSearch()
            }
        }
    }

    // MARK: - Search Bar

    private var searchBar: some View {
        HStack(spacing: 12) {
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.secondary)

                TextField(L10n.Reader.searchPlaceholder, text: $viewModel.searchQuery)
                    .textFieldStyle(.plain)
                    .focused($isSearchFocused)
                    .submitLabel(.search)
                    .onSubmit {
                        viewModel.search()
                    }

                if !viewModel.searchQuery.isEmpty {
                    Button {
                        viewModel.clearResults()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.secondary)
                    }
                }
            }
            .padding(10)
            .background(Color(.systemGray6))
            .cornerRadius(10)

            if viewModel.isSearching {
                Button(L10n.Common.cancel) {
                    viewModel.cancelSearch()
                }
                .foregroundColor(.blue)
            }
        }
        .padding()
    }

    // MARK: - Results List

    @ViewBuilder
    private var resultsList: some View {
        if viewModel.isSearching {
            VStack(spacing: 16) {
                ProgressView()
                Text(L10n.Reader.searchSearching)
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                if !viewModel.results.isEmpty {
                    Text(L10n.Reader.searchResultCount(viewModel.results.count))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if viewModel.hasSearched && viewModel.results.isEmpty {
            VStack(spacing: 16) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 48))
                    .foregroundColor(.secondary)

                Text(L10n.Reader.searchNoResults)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if !viewModel.results.isEmpty {
            VStack(alignment: .leading, spacing: 0) {
                // Result count
                Text(L10n.Reader.searchResultCount(viewModel.results.count))
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.horizontal)
                    .padding(.vertical, 8)

                Divider()

                // Results list
                List(viewModel.results) { result in
                    SearchResultRow(result: result)
                        .contentShape(Rectangle())
                        .onTapGesture {
                            #if canImport(ReadiumShared) && canImport(ReadiumNavigator)
                            onSelectResult(result.locator)
                            #endif
                            dismiss()
                        }
                }
                .listStyle(.plain)
            }
        } else {
            // Initial state - no search yet
            VStack(spacing: 16) {
                Image(systemName: "text.magnifyingglass")
                    .font(.system(size: 48))
                    .foregroundColor(.secondary.opacity(0.5))

                Text(L10n.ReaderNav.searchHintDesc)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
}

/// Search result row view
struct SearchResultRow: View {
    let result: EPUBSearchResult

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            // Chapter title
            if let chapter = result.chapterTitle, !chapter.isEmpty {
                Text(L10n.Reader.searchInChapter(chapter))
                    .font(.caption)
                    .foregroundColor(.blue)
                    .lineLimit(1)
            }

            // Result text with context
            HStack(spacing: 0) {
                if let before = result.textBefore, !before.isEmpty {
                    Text("...")
                        .foregroundColor(.secondary)
                    Text(before)
                        .foregroundColor(.secondary)
                }

                Text(result.text)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
                    .background(Color.yellow.opacity(0.3))

                if let after = result.textAfter, !after.isEmpty {
                    Text(after)
                        .foregroundColor(.secondary)
                    Text("...")
                        .foregroundColor(.secondary)
                }
            }
            .font(.subheadline)
            .lineLimit(2)
        }
        .padding(.vertical, 8)
    }
}

#Preview {
    #if canImport(ReadiumShared) && canImport(ReadiumNavigator)
    // Preview requires a real publication
    Text("Preview requires Readium")
    #else
    EPUBSearchView(onSelectResult: { _ in })
    #endif
}
