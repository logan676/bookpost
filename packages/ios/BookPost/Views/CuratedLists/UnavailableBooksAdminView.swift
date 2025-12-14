/**
 * UnavailableBooksAdminView
 * Admin view to display all books from curated lists that are not available in our library
 */

import SwiftUI

struct UnavailableBooksAdminView: View {
    @StateObject private var viewModel = CuratedListsViewModel()
    @State private var searchText = ""
    @State private var selectedBook: UnavailableBook?

    var filteredBooks: [UnavailableBook] {
        if searchText.isEmpty {
            return viewModel.unavailableBooks
        }
        return viewModel.unavailableBooks.filter { book in
            book.displayTitle.localizedCaseInsensitiveContains(searchText) ||
            book.displayAuthor.localizedCaseInsensitiveContains(searchText) ||
            (book.isbn ?? "").contains(searchText)
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Stats header
                if let stats = viewModel.stats {
                    statsHeader(stats)
                }

                // Search bar
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.secondary)
                    TextField("Search by title, author, or ISBN", text: $searchText)
                }
                .padding(10)
                .background(Color(.systemGray6))
                .cornerRadius(10)
                .padding()

                // Books list
                if viewModel.isLoadingAdmin && viewModel.unavailableBooks.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if filteredBooks.isEmpty {
                    ContentUnavailableView(
                        searchText.isEmpty ? "No Unavailable Books" : "No Results",
                        systemImage: searchText.isEmpty ? "checkmark.circle" : "magnifyingglass",
                        description: Text(searchText.isEmpty ? "All books from curated lists are available" : "Try a different search term")
                    )
                } else {
                    booksList
                }
            }
            .navigationTitle("Unavailable Books")
            .refreshable {
                await loadData()
            }
            .task {
                await loadData()
            }
            .sheet(item: $selectedBook) { book in
                UnavailableBookDetailSheet(book: book)
            }
        }
    }

    private func loadData() async {
        await viewModel.loadStats()
        await viewModel.loadUnavailableBooks(refresh: true)
    }

    // MARK: - Stats Header

    private func statsHeader(_ stats: CuratedListStats) -> some View {
        HStack(spacing: 16) {
            statCard(
                value: stats.totalLists,
                label: "Lists",
                icon: "list.bullet.rectangle",
                color: .blue
            )
            statCard(
                value: stats.totalBooks,
                label: "Total Books",
                icon: "book.closed",
                color: .green
            )
            statCard(
                value: stats.unavailableBooks,
                label: "Unavailable",
                icon: "xmark.circle",
                color: .orange
            )
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
    }

    private func statCard(value: Int, label: String, icon: String, color: Color) -> some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)

            Text("\(value)")
                .font(.title2)
                .fontWeight(.bold)

            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }

    // MARK: - Books List

    private var booksList: some View {
        List {
            ForEach(filteredBooks) { book in
                Button {
                    selectedBook = book
                } label: {
                    bookRow(book)
                }
                .buttonStyle(.plain)
            }
        }
        .listStyle(.plain)
    }

    private func bookRow(_ book: UnavailableBook) -> some View {
        HStack(spacing: 12) {
            // Cover
            AsyncImage(url: URL(string: book.externalCoverUrl ?? "")) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                Rectangle()
                    .fill(Color(.systemGray5))
                    .overlay(
                        Image(systemName: "book.closed")
                            .foregroundColor(.gray)
                    )
            }
            .frame(width: 50, height: 70)
            .cornerRadius(4)

            // Info
            VStack(alignment: .leading, spacing: 4) {
                Text(book.displayTitle)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(2)

                Text(book.displayAuthor)
                    .font(.caption)
                    .foregroundColor(.secondary)

                HStack {
                    Text(book.listTitle)
                        .font(.caption2)
                        .foregroundColor(.accentColor)

                    if let year = book.year {
                        Text("(\(year))")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }

                if let isbn = book.isbn {
                    Text("ISBN: \(isbn)")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Detail Sheet

struct UnavailableBookDetailSheet: View {
    let book: UnavailableBook
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                // Book Info Section
                Section("Book Information") {
                    LabeledContent("Title", value: book.displayTitle)
                    LabeledContent("Author", value: book.displayAuthor)

                    if let isbn = book.isbn {
                        LabeledContent("ISBN", value: isbn)
                    }

                    if let isbn13 = book.isbn13 {
                        LabeledContent("ISBN-13", value: isbn13)
                    }
                }

                // Source Section
                Section("Source") {
                    LabeledContent("List", value: book.listTitle)
                    LabeledContent("Type", value: CuratedListType(rawValue: book.listType)?.displayName ?? book.listType)

                    if let year = book.year {
                        LabeledContent("Year", value: String(year))
                    }
                }

                // External Links Section
                Section("External Links") {
                    if let amazonUrl = book.amazonUrl, let url = URL(string: amazonUrl) {
                        Link(destination: url) {
                            HStack {
                                Image(systemName: "cart")
                                Text("View on Amazon")
                                Spacer()
                                Image(systemName: "arrow.up.right")
                            }
                        }
                    }

                    if let goodreadsUrl = book.goodreadsUrl, let url = URL(string: goodreadsUrl) {
                        Link(destination: url) {
                            HStack {
                                Image(systemName: "star.circle")
                                Text("View on Goodreads")
                                Spacer()
                                Image(systemName: "arrow.up.right")
                            }
                        }
                    }
                }

                // Actions Section
                Section("Actions") {
                    Button {
                        // Copy ISBN to clipboard
                        if let isbn = book.isbn {
                            UIPasteboard.general.string = isbn
                        }
                    } label: {
                        Label("Copy ISBN", systemImage: "doc.on.doc")
                    }

                    Button {
                        // TODO: Mark as added (link to existing book)
                    } label: {
                        Label("Link to Existing Book", systemImage: "link")
                    }
                }
            }
            .navigationTitle("Book Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

#Preview {
    UnavailableBooksAdminView()
}
