import SwiftUI

@MainActor
class BooksViewModel: ObservableObject {
    @Published var books: [Book] = []
    @Published var searchQuery = ""
    @Published var isLoading = false
    @Published var errorMessage: String?

    func loadBooks() async {
        isLoading = true
        errorMessage = nil

        do {
            let response = try await APIClient.shared.getBooks(
                search: searchQuery.isEmpty ? nil : searchQuery
            )
            books = response.allBooks
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func search() {
        Task {
            await loadBooks()
        }
    }

    func refresh() async {
        await loadBooks()
    }
}

struct BooksView: View {
    @StateObject private var viewModel = BooksViewModel()

    private let columns = [
        GridItem(.adaptive(minimum: 140), spacing: 12)
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                SearchBarView(text: $viewModel.searchQuery) {
                    viewModel.search()
                }
                .padding(.horizontal)
                .padding(.top, 8)
                .padding(.bottom, 16)

                Group {
                    if viewModel.isLoading && viewModel.books.isEmpty {
                        LoadingView()
                    } else if let error = viewModel.errorMessage, viewModel.books.isEmpty {
                        ErrorView(message: error) {
                            Task { await viewModel.loadBooks() }
                        }
                    } else if viewModel.books.isEmpty {
                        EmptyView(message: L10n.Books.noBooks)
                    } else {
                        ScrollView {
                            LazyVGrid(columns: columns, spacing: 16) {
                                ForEach(viewModel.books) { book in
                                    BookCoverCard(
                                        title: book.title,
                                        coverUrl: book.coverUrl ?? book.coverPhotoUrl,
                                        subtitle: book.author
                                    ) {
                                        // TODO: Navigate to book detail
                                    }
                                }
                            }
                            .padding()
                        }
                    }
                }
            }
            .navigationTitle(L10n.Books.title)
            .refreshable {
                await viewModel.refresh()
            }
            .task {
                await viewModel.loadBooks()
            }
        }
    }
}

#Preview {
    BooksView()
}
