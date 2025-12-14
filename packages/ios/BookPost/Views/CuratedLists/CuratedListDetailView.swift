/**
 * CuratedListDetailView
 * Display curated list details with books (shows unavailable indicator for books not in library)
 */

import SwiftUI

struct CuratedListDetailView: View {
    let listId: Int

    @StateObject private var viewModel = CuratedListsViewModel()
    @State private var selectedItem: CuratedListItem?
    @State private var showingUnavailableSheet = false

    var body: some View {
        Group {
            if viewModel.isLoadingDetail {
                ProgressView("Loading...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let list = viewModel.currentList {
                ScrollView {
                    VStack(spacing: 0) {
                        // Header
                        listHeader(list)

                        // Books
                        booksSection
                    }
                }
            } else if let error = viewModel.errorMessage {
                ContentUnavailableView(
                    "Failed to Load",
                    systemImage: "exclamationmark.triangle",
                    description: Text(error)
                )
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadListDetail(id: listId)
        }
        .sheet(item: $selectedItem) { item in
            UnavailableBookSheet(item: item)
        }
    }

    // MARK: - List Header

    private func listHeader(_ list: CuratedList) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            // Source badge
            HStack {
                if let logoUrl = list.sourceLogoUrl, let url = URL(string: logoUrl) {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                    } placeholder: {
                        Image(systemName: CuratedListType(rawValue: list.listType)?.icon ?? "book.closed")
                    }
                    .frame(width: 32, height: 32)
                    .clipShape(Circle())
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(list.sourceName ?? list.listTypeDisplayName)
                        .font(.subheadline)
                        .fontWeight(.medium)

                    if let year = list.year {
                        Text(String(year))
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()

                if list.isFeatured {
                    Label("Featured", systemImage: "star.fill")
                        .font(.caption)
                        .foregroundColor(.orange)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color.orange.opacity(0.1))
                        .cornerRadius(12)
                }
            }

            // Title
            Text(list.title)
                .font(.title2)
                .fontWeight(.bold)

            // Description
            if let description = list.description {
                Text(description)
                    .font(.body)
                    .foregroundColor(.secondary)
            }

            // Stats
            HStack(spacing: 24) {
                statItem(value: list.bookCount, label: "Books", icon: "book.closed")
                statItem(value: list.viewCount, label: "Views", icon: "eye")
                statItem(value: list.saveCount, label: "Saves", icon: "bookmark")
            }

            // Availability summary
            let unavailableCount = viewModel.currentListItems.filter { !$0.isAvailable }.count
            if unavailableCount > 0 {
                HStack {
                    Image(systemName: "info.circle.fill")
                        .foregroundColor(.orange)
                    Text("\(unavailableCount) of \(list.bookCount) books not yet available in our library")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(.vertical, 8)
                .padding(.horizontal, 12)
                .background(Color.orange.opacity(0.1))
                .cornerRadius(8)
            }
        }
        .padding()
        .background(Color(.systemBackground))
    }

    private func statItem(value: Int, label: String, icon: String) -> some View {
        VStack(spacing: 4) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.caption)
                Text(formatCount(value))
                    .font(.headline)
            }
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }

    private func formatCount(_ count: Int) -> String {
        if count >= 1000000 {
            return String(format: "%.1fM", Double(count) / 1000000.0)
        }
        if count >= 1000 {
            return String(format: "%.1fK", Double(count) / 1000.0)
        }
        return "\(count)"
    }

    // MARK: - Books Section

    private var booksSection: some View {
        LazyVStack(spacing: 0) {
            ForEach(Array(viewModel.currentListItems.enumerated()), id: \.element.id) { index, item in
                VStack(spacing: 0) {
                    bookRow(item: item, index: index + 1)

                    if index < viewModel.currentListItems.count - 1 {
                        Divider()
                            .padding(.leading, 80)
                    }
                }
            }
        }
        .background(Color(.secondarySystemGroupedBackground))
    }

    private func bookRow(item: CuratedListItem, index: Int) -> some View {
        Button {
            if item.isAvailable, let bookId = item.bookId {
                // Navigate to book detail (TODO: implement navigation)
            } else {
                selectedItem = item
            }
        } label: {
            HStack(spacing: 12) {
                // Position number
                Text("\(index)")
                    .font(.headline)
                    .foregroundColor(.secondary)
                    .frame(width: 30)

                // Cover
                AsyncImage(url: URL(string: item.displayCoverUrl ?? "")) { image in
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
                .overlay(
                    // Unavailable overlay
                    !item.isAvailable ?
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.black.opacity(0.3))
                        .overlay(
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(.white)
                                .font(.caption)
                        )
                    : nil
                )

                // Info
                VStack(alignment: .leading, spacing: 4) {
                    Text(item.displayTitle)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)

                    Text(item.displayAuthor)
                        .font(.caption)
                        .foregroundColor(.secondary)

                    if !item.isAvailable {
                        Text("Not Available")
                            .font(.caption2)
                            .fontWeight(.medium)
                            .foregroundColor(.orange)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.orange.opacity(0.15))
                            .cornerRadius(4)
                    } else if let rating = item.book?.rating {
                        HStack(spacing: 2) {
                            Image(systemName: "star.fill")
                                .foregroundColor(.yellow)
                            Text(String(format: "%.1f", rating))
                        }
                        .font(.caption)
                    }
                }

                Spacer()

                // Editor note badge
                if item.editorNote != nil {
                    Image(systemName: "text.quote")
                        .foregroundColor(.accentColor)
                        .font(.caption)
                }

                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding()
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Unavailable Book Sheet

struct UnavailableBookSheet: View {
    let item: CuratedListItem
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Cover
                    AsyncImage(url: URL(string: item.displayCoverUrl ?? "")) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                    } placeholder: {
                        Rectangle()
                            .fill(Color(.systemGray5))
                            .overlay(
                                Image(systemName: "book.closed")
                                    .font(.largeTitle)
                                    .foregroundColor(.gray)
                            )
                    }
                    .frame(height: 200)
                    .cornerRadius(8)
                    .shadow(color: .black.opacity(0.2), radius: 8, x: 0, y: 4)

                    // Title and Author
                    VStack(spacing: 8) {
                        Text(item.displayTitle)
                            .font(.title2)
                            .fontWeight(.bold)
                            .multilineTextAlignment(.center)

                        Text(item.displayAuthor)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }

                    // Not Available Banner
                    HStack {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(.orange)
                        Text("This book is not yet available in our library")
                            .font(.subheadline)
                    }
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color.orange.opacity(0.1))
                    .cornerRadius(12)

                    // Description
                    if let description = item.externalDescription {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("About")
                                .font(.headline)

                            Text(description)
                                .font(.body)
                                .foregroundColor(.secondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    // ISBN
                    if let isbn = item.isbn {
                        HStack {
                            Text("ISBN")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Spacer()
                            Text(isbn)
                                .font(.caption)
                                .fontWeight(.medium)
                        }
                        .padding()
                        .background(Color(.secondarySystemGroupedBackground))
                        .cornerRadius(8)
                    }

                    // External Links
                    VStack(spacing: 12) {
                        if let amazonUrl = item.amazonUrl, let url = URL(string: amazonUrl) {
                            Link(destination: url) {
                                HStack {
                                    Image(systemName: "cart")
                                    Text("View on Amazon")
                                    Spacer()
                                    Image(systemName: "arrow.up.right")
                                }
                                .padding()
                                .background(Color(.secondarySystemGroupedBackground))
                                .cornerRadius(8)
                            }
                        }

                        if let goodreadsUrl = item.goodreadsUrl, let url = URL(string: goodreadsUrl) {
                            Link(destination: url) {
                                HStack {
                                    Image(systemName: "star.circle")
                                    Text("View on Goodreads")
                                    Spacer()
                                    Image(systemName: "arrow.up.right")
                                }
                                .padding()
                                .background(Color(.secondarySystemGroupedBackground))
                                .cornerRadius(8)
                            }
                        }
                    }
                    .foregroundColor(.primary)

                    // Editor Note
                    if let note = item.editorNote {
                        VStack(alignment: .leading, spacing: 8) {
                            Label("Editor's Note", systemImage: "text.quote")
                                .font(.headline)

                            Text(note)
                                .font(.body)
                                .italic()
                                .foregroundColor(.secondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding()
                        .background(Color.accentColor.opacity(0.1))
                        .cornerRadius(12)
                    }

                    Spacer(minLength: 40)
                }
                .padding()
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
    NavigationStack {
        CuratedListDetailView(listId: 1)
    }
}
