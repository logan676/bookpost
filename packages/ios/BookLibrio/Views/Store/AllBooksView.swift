import SwiftUI

/// All Books View - shows all ebooks with pagination
/// Includes books that don't belong to any curated list
struct AllBooksView: View {
    @StateObject private var viewModel = AllBooksViewModel()
    @State private var selectedBook: Ebook?
    @Environment(\.dismiss) private var dismiss

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.books.isEmpty {
                    ProgressView(L10n.Store.loading)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if !viewModel.books.isEmpty {
                    mainContent
                } else if let error = viewModel.errorMessage {
                    ContentUnavailableView(
                        L10n.Store.failedToLoad,
                        systemImage: "exclamationmark.triangle",
                        description: Text(error)
                    )
                } else {
                    ContentUnavailableView(
                        L10n.Store.noBooks,
                        systemImage: "books.vertical",
                        description: Text(L10n.Store.noBooksYet)
                    )
                }
            }
            .task {
                await viewModel.loadBooks()
            }
            .navigationDestination(item: $selectedBook) { book in
                BookDetailView(bookType: .ebook, bookId: book.id)
            }
        }
    }

    // MARK: - Main Content

    private var mainContent: some View {
        ScrollView {
            VStack(spacing: 0) {
                // 1. Header
                headerSection

                // 2. Stats Card
                statsCard
                    .padding(.horizontal, 16)
                    .padding(.top, -20)

                // 3. Books Grid
                booksGrid
                    .padding(.horizontal, 12)
                    .padding(.top, 16)

                // 4. Load More / Loading indicator
                if viewModel.hasMore {
                    loadMoreSection
                }

                Spacer(minLength: 50)
            }
        }
        .edgesIgnoringSafeArea(.top)
        .navigationBarBackButtonHidden(true)
        .overlay(
            Button(action: { dismiss() }) {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 32))
                    .foregroundStyle(.white.opacity(0.9), .black.opacity(0.3))
                    .padding(.trailing, 20)
                    .padding(.top, 50)
            },
            alignment: .topTrailing
        )
        .refreshable {
            await viewModel.refresh()
        }
    }

    // MARK: - Header Section

    private var headerSection: some View {
        ZStack(alignment: .bottom) {
            // Background gradient
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.15, green: 0.2, blue: 0.35),
                    Color(red: 0.25, green: 0.3, blue: 0.45),
                    Color(red: 0.2, green: 0.25, blue: 0.4)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .frame(height: 220)

            // Decorative book icons
            GeometryReader { geo in
                ForEach(0..<6, id: \.self) { index in
                    Image(systemName: "book.fill")
                        .font(.system(size: CGFloat.random(in: 16...32)))
                        .foregroundColor(.white.opacity(0.08))
                        .offset(
                            x: CGFloat(index) * (geo.size.width / 6) + CGFloat.random(in: -20...20),
                            y: CGFloat.random(in: 40...160)
                        )
                }
            }
            .frame(height: 220)

            // Title
            HStack {
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 12) {
                        Image(systemName: "books.vertical.fill")
                            .font(.title2)
                            .foregroundColor(.white.opacity(0.9))

                        Text(L10n.Store.allBooks)
                            .font(.system(size: 32, weight: .heavy))
                            .foregroundColor(.white)
                    }

                    Text(L10n.Store.browseAllBooksSubtitle)
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.8))
                }
                Spacer()
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 35)
        }
    }

    // MARK: - Stats Card

    private var statsCard: some View {
        HStack(spacing: 20) {
            // Total books
            VStack(spacing: 4) {
                Text("\(viewModel.total)")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundColor(.primary)

                Text(L10n.Store.totalBooks)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Divider()
                .frame(height: 40)

            // Loaded books
            VStack(spacing: 4) {
                Text("\(viewModel.books.count)")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundColor(.blue)

                Text(L10n.Store.loaded)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            // Progress
            if viewModel.total > 0 {
                CircularProgressView(
                    progress: Double(viewModel.books.count) / Double(viewModel.total),
                    lineWidth: 4
                )
                .frame(width: 44, height: 44)
            }
        }
        .padding(20)
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.1), radius: 10, y: 5)
    }

    // MARK: - Books Grid

    private var booksGrid: some View {
        LazyVGrid(columns: columns, spacing: 16) {
            ForEach(viewModel.books) { book in
                BookGridItem(book: book) {
                    selectedBook = book
                }
                .onAppear {
                    // Load more when approaching end
                    if book.id == viewModel.books.last?.id {
                        Task {
                            await viewModel.loadMore()
                        }
                    }
                }
            }
        }
    }

    // MARK: - Load More Section

    private var loadMoreSection: some View {
        Group {
            if viewModel.isLoadingMore {
                HStack(spacing: 12) {
                    ProgressView()
                    Text(L10n.Store.loadingMore)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.vertical, 20)
            } else {
                Button {
                    Task {
                        await viewModel.loadMore()
                    }
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "arrow.down.circle")
                        Text(L10n.Store.loadMore)
                    }
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.blue)
                    .padding(.vertical, 12)
                    .padding(.horizontal, 24)
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(20)
                }
                .padding(.vertical, 20)
            }
        }
    }
}

// MARK: - Book Grid Item

struct BookGridItem: View {
    let book: Ebook
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 8) {
                // Cover
                if let coverUrl = book.coverUrl {
                    AsyncImage(url: R2Config.convertToPublicURL(coverUrl)) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .aspectRatio(2/3, contentMode: .fill)
                        case .failure:
                            coverPlaceholder
                        case .empty:
                            ProgressView()
                                .frame(maxWidth: .infinity)
                                .aspectRatio(2/3, contentMode: .fit)
                        @unknown default:
                            coverPlaceholder
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .aspectRatio(2/3, contentMode: .fit)
                    .cornerRadius(8)
                    .shadow(color: Color.black.opacity(0.15), radius: 4, x: 0, y: 2)
                } else {
                    coverPlaceholder
                }

                // Title
                Text(book.title)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.primary)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
            }
        }
        .buttonStyle(PlainButtonStyle())
    }

    private var coverPlaceholder: some View {
        Rectangle()
            .fill(Color.gray.opacity(0.2))
            .aspectRatio(2/3, contentMode: .fit)
            .cornerRadius(8)
            .overlay(
                Image(systemName: "book.closed.fill")
                    .font(.title2)
                    .foregroundColor(.gray.opacity(0.5))
            )
    }
}

// MARK: - Circular Progress View

struct CircularProgressView: View {
    let progress: Double
    let lineWidth: CGFloat

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.gray.opacity(0.2), lineWidth: lineWidth)

            Circle()
                .trim(from: 0, to: progress)
                .stroke(Color.blue, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))

            Text("\(Int(progress * 100))%")
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(.primary)
        }
    }
}

// MARK: - ViewModel

@MainActor
class AllBooksViewModel: ObservableObject {
    @Published var books: [Ebook] = []
    @Published var total: Int = 0
    @Published var isLoading = false
    @Published var isLoadingMore = false
    @Published var errorMessage: String?
    @Published var hasMore = true

    private let apiClient = APIClient.shared
    private let pageSize = 30
    private var currentOffset = 0

    func loadBooks() async {
        guard !isLoading else { return }

        isLoading = true
        errorMessage = nil
        currentOffset = 0

        do {
            let response = try await apiClient.getEbooks(limit: pageSize, offset: 0)
            books = response.data
            total = response.total
            hasMore = books.count < total
            currentOffset = books.count
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func loadMore() async {
        guard !isLoadingMore && hasMore else { return }

        isLoadingMore = true

        do {
            let response = try await apiClient.getEbooks(limit: pageSize, offset: currentOffset)
            books.append(contentsOf: response.data)
            hasMore = books.count < total
            currentOffset = books.count
        } catch {
            Log.e("Failed to load more books: \(error)")
        }

        isLoadingMore = false
    }

    func refresh() async {
        await loadBooks()
    }
}

// MARK: - Preview

#Preview {
    AllBooksView()
}
