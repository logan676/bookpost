import SwiftUI

#if canImport(ReadiumShared)
import ReadiumShared
#endif

/// Bookmarks list view for EPUB reader
struct EPUBBookmarksView: View {
    let bookType: String
    let bookId: Int
    let currentHref: String?

    #if canImport(ReadiumShared)
    let publication: Publication?
    let onSelectBookmark: (Locator) -> Void
    #else
    let onSelectBookmark: (Bookmark) -> Void
    #endif

    @Environment(\.dismiss) var dismiss
    @StateObject private var bookmarkManager = BookmarkManager.shared
    @State private var bookmarkToDelete: Bookmark?
    @State private var showDeleteConfirm = false

    var bookmarks: [Bookmark] {
        bookmarkManager.bookmarks(for: bookType, bookId: bookId)
    }

    var body: some View {
        NavigationStack {
            Group {
                if bookmarks.isEmpty {
                    emptyState
                } else {
                    bookmarksList
                }
            }
            .navigationTitle(L10n.Reader.bookmarksTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(L10n.Reader.done) {
                        dismiss()
                    }
                }
            }
            .alert(L10n.Reader.bookmarksDelete, isPresented: $showDeleteConfirm) {
                Button(L10n.Common.cancel, role: .cancel) {}
                Button(L10n.Reader.bookmarksDelete, role: .destructive) {
                    if let bookmark = bookmarkToDelete {
                        bookmarkManager.removeBookmark(bookmark)
                    }
                }
            } message: {
                Text(L10n.Reader.bookmarksDeleteConfirm)
            }
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "bookmark")
                .font(.system(size: 48))
                .foregroundColor(.secondary)

            Text(L10n.Reader.bookmarksEmpty)
                .font(.subheadline)
                .foregroundColor(.secondary)

            Text(L10n.ReaderNav.noBookmarksDesc)
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Bookmarks List

    private var bookmarksList: some View {
        List {
            ForEach(bookmarks) { bookmark in
                EPUBBookmarkRow(
                    bookmark: bookmark,
                    isCurrent: bookmark.href == currentHref
                )
                .contentShape(Rectangle())
                .onTapGesture {
                    navigateToBookmark(bookmark)
                }
                .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                    Button(role: .destructive) {
                        bookmarkToDelete = bookmark
                        showDeleteConfirm = true
                    } label: {
                        Label(L10n.Reader.bookmarksDelete, systemImage: "trash")
                    }
                }
            }
        }
        .listStyle(.plain)
    }

    // MARK: - Navigation

    private func navigateToBookmark(_ bookmark: Bookmark) {
        #if canImport(ReadiumShared)
        guard let publication = publication else {
            dismiss()
            return
        }

        // Create locator from bookmark
        Task {
            if let progression = bookmark.totalProgression,
               let locator = await publication.locate(progression: progression) {
                onSelectBookmark(locator)
            } else if let progression = bookmark.progression,
                      let locator = await publication.locate(progression: progression) {
                onSelectBookmark(locator)
            }
            await MainActor.run {
                dismiss()
            }
        }
        #else
        onSelectBookmark(bookmark)
        dismiss()
        #endif
    }
}

/// Single bookmark row view
struct EPUBBookmarkRow: View {
    let bookmark: Bookmark
    let isCurrent: Bool

    var body: some View {
        HStack(spacing: 12) {
            // Bookmark icon
            Image(systemName: isCurrent ? "bookmark.fill" : "bookmark")
                .font(.title3)
                .foregroundColor(isCurrent ? .orange : .secondary)

            VStack(alignment: .leading, spacing: 4) {
                // Title/Chapter
                Text(bookmark.displayTitle)
                    .font(.headline)
                    .lineLimit(1)

                // Text snippet
                if let snippet = bookmark.textSnippet, !snippet.isEmpty {
                    Text(snippet)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }

                // Date
                Text(bookmark.formattedDate)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            // Progress indicator
            if let progress = bookmark.totalProgression {
                Text("\(Int(progress * 100))%")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color(.systemGray6))
                    .cornerRadius(4)
            }
        }
        .padding(.vertical, 8)
        .background(isCurrent ? Color.orange.opacity(0.1) : Color.clear)
        .cornerRadius(8)
    }
}

#Preview {
    #if canImport(ReadiumShared)
    EPUBBookmarksView(
        bookType: "ebook",
        bookId: 1,
        currentHref: nil,
        publication: nil,
        onSelectBookmark: { _ in }
    )
    #else
    EPUBBookmarksView(
        bookType: "ebook",
        bookId: 1,
        currentHref: nil,
        onSelectBookmark: { _ in }
    )
    #endif
}
