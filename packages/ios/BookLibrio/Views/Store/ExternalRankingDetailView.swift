import SwiftUI

/// Detail view for external rankings (NYT, Amazon, etc.)
struct ExternalRankingDetailView: View {
    let ranking: ExternalRanking

    @StateObject private var viewModel = ExternalRankingDetailViewModel()
    @State private var selectedBookId: Int?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    ProgressView(L10n.Store.loading)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if !viewModel.books.isEmpty {
                    ScrollView {
                        VStack(spacing: 0) {
                            // Header
                            rankingHeader

                            // Books list
                            booksSection
                        }
                    }
                } else if let error = viewModel.errorMessage {
                    ContentUnavailableView(
                        L10n.Store.failedToLoad,
                        systemImage: "exclamationmark.triangle",
                        description: Text(error)
                    )
                } else {
                    ContentUnavailableView(
                        L10n.Store.noBooks,
                        systemImage: "book.closed",
                        description: Text(L10n.Store.noBooksYet)
                    )
                }
            }
            .navigationTitle(ranking.displaySourceName)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(L10n.Store.done) {
                        dismiss()
                    }
                }
            }
            .task {
                await viewModel.loadRankingDetail(id: ranking.id)
            }
            .navigationDestination(item: $selectedBookId) { bookId in
                BookDetailView(bookType: .ebook, bookId: bookId)
            }
        }
    }

    // MARK: - Ranking Header

    private var rankingHeader: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Source badge
            HStack {
                if let logoUrl = ranking.sourceLogoUrl, let url = URL(string: logoUrl) {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                    } placeholder: {
                        Image(systemName: CuratedListType(rawValue: ranking.listType)?.icon ?? "list.bullet")
                    }
                    .frame(height: 30)
                } else {
                    Text(ranking.displaySourceName)
                        .font(.headline)
                        .fontWeight(.bold)
                }

                Spacer()

                if let lastUpdated = ranking.formattedLastUpdated {
                    Text(lastUpdated)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            // Title
            Text(ranking.title)
                .font(.title2)
                .fontWeight(.bold)

            // Description
            if let description = ranking.description {
                Text(description)
                    .font(.body)
                    .foregroundColor(.secondary)
            }

            // Stats
            HStack(spacing: 16) {
                if let bookCount = ranking.bookCount {
                    Label(L10n.Store.booksCountLabel(bookCount), systemImage: "book.closed")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                if let externalUrl = ranking.externalUrl, let url = URL(string: externalUrl) {
                    Link(destination: url) {
                        Label(L10n.Store.viewSource, systemImage: "arrow.up.right")
                            .font(.caption)
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
    }

    // MARK: - Books Section

    private var booksSection: some View {
        LazyVStack(spacing: 0) {
            ForEach(Array(viewModel.books.enumerated()), id: \.element.id) { index, item in
                VStack(spacing: 0) {
                    bookRow(item: item, rank: item.rank)

                    if index < viewModel.books.count - 1 {
                        Divider()
                            .padding(.leading, 80)
                    }
                }
            }
        }
        .background(Color(.secondarySystemGroupedBackground))
    }

    private func bookRow(item: ExternalRankingBook, rank: Int) -> some View {
        Button {
            if let bookId = item.book.id {
                selectedBookId = bookId
            }
        } label: {
            HStack(spacing: 12) {
                // Rank number
                Text("\(rank)")
                    .font(.headline)
                    .foregroundColor(.secondary)
                    .frame(width: 30)

                // Cover - frame applied inside for consistent sizing
                AsyncImage(url: URL(string: item.book.coverUrl ?? "")) { phase in
                    switch phase {
                    case .empty:
                        Rectangle()
                            .fill(Color(.systemGray5))
                            .overlay(
                                Image(systemName: "book.closed")
                                    .foregroundColor(.gray)
                            )
                            .frame(width: 50, height: 70)
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 50, height: 70)
                            .clipped()
                    case .failure:
                        Rectangle()
                            .fill(Color(.systemGray5))
                            .overlay(
                                Image(systemName: "book.closed")
                                    .foregroundColor(.gray)
                            )
                            .frame(width: 50, height: 70)
                    @unknown default:
                        Rectangle()
                            .fill(Color(.systemGray5))
                            .frame(width: 50, height: 70)
                    }
                }
                .cornerRadius(4)

                // Info
                VStack(alignment: .leading, spacing: 4) {
                    Text(item.book.title)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                        .foregroundColor(.primary)

                    if let author = item.book.author {
                        Text(author)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    if !item.book.isAvailable {
                        Text(L10n.Store.notAvailable)
                            .font(.caption2)
                            .fontWeight(.medium)
                            .foregroundColor(.orange)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.orange.opacity(0.15))
                            .cornerRadius(4)
                    }
                }

                Spacer()

                // Editor note badge
                if item.editorNote != nil {
                    Image(systemName: "text.quote")
                        .foregroundColor(.accentColor)
                        .font(.caption)
                }

                if item.book.isAvailable {
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding()
        }
        .buttonStyle(.plain)
    }
}

// MARK: - ViewModel

@MainActor
class ExternalRankingDetailViewModel: ObservableObject {
    @Published var books: [ExternalRankingBook] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let apiClient = APIClient.shared

    func loadRankingDetail(id: Int) async {
        isLoading = true
        errorMessage = nil

        do {
            let response = try await apiClient.getExternalRankingDetail(id: id)
            books = response.books
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}

#Preview {
    ExternalRankingDetailView(ranking: ExternalRanking(
        id: 1,
        listType: "amazon_best",
        sourceName: "Amazon",
        sourceLogoUrl: nil,
        title: "Amazon Annual Bestsellers",
        subtitle: "Top Selling Books of the Year",
        description: "The most popular books on Amazon this year",
        bookCount: 100,
        lastUpdated: nil,
        externalUrl: nil,
        previewCovers: nil
    ))
}
