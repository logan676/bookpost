import SwiftUI

/// User's personal bookshelf with filtering by status and book type
struct MyBookshelfView: View {
    @State private var items: [BookshelfItem] = []
    @State private var counts: BookshelfCounts?
    @State private var isLoading = false
    @State private var hasMore = false
    @State private var offset = 0
    @State private var selectedStatus: BookshelfStatus?
    @State private var selectedType: String = "all"
    @State private var sortOption: BookshelfSortOption = .added
    @State private var sortOrder: SortOrder = .descending

    private var statusFilters: [(BookshelfStatus?, String)] {
        [
            (nil, L10n.Common.all),
            (.wantToRead, L10n.Bookshelf.wantToRead),
            (.reading, L10n.Bookshelf.reading),
            (.finished, L10n.Bookshelf.finished),
            (.abandoned, L10n.Bookshelf.abandoned)
        ]
    }

    var body: some View {
        VStack(spacing: 0) {
            // Filter tabs
            filterTabsView

            // Content
            if items.isEmpty && isLoading {
                LoadingView()
            } else if items.isEmpty {
                emptyStateView
            } else {
                bookshelfListView
            }
        }
        .navigationTitle(L10n.Bookshelf.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                sortMenu
            }
        }
        .task {
            await loadBookshelf()
        }
        .onChange(of: selectedStatus) { _, _ in
            resetAndReload()
        }
        .onChange(of: selectedType) { _, _ in
            resetAndReload()
        }
        .onChange(of: sortOption) { _, _ in
            resetAndReload()
        }
        .onChange(of: sortOrder) { _, _ in
            resetAndReload()
        }
    }

    // MARK: - Filter Tabs

    @ViewBuilder
    private var filterTabsView: some View {
        VStack(spacing: 0) {
            // Status filter
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(statusFilters, id: \.1) { status, label in
                        Button {
                            selectedStatus = status
                        } label: {
                            HStack(spacing: 4) {
                                if let status = status {
                                    Image(systemName: status.iconName)
                                        .font(.caption)
                                }
                                Text(label)
                                if let count = countForStatus(status) {
                                    Text("(\(count))")
                                        .font(.caption2)
                                }
                            }
                            .font(.subheadline)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(selectedStatus == status ? Color.accentColor : Color(.systemGray6))
                            .foregroundColor(selectedStatus == status ? .white : .primary)
                            .clipShape(Capsule())
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
            }

            // Type filter
            Picker(L10n.Bookshelf.type, selection: $selectedType) {
                Text(L10n.Common.all).tag("all")
                Text(L10n.Bookshelf.ebook).tag("ebook")
                Text(L10n.Bookshelf.magazine).tag("magazine")
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)
            .padding(.bottom, 8)

            Divider()
        }
        .background(Color(.systemBackground))
    }

    private func countForStatus(_ status: BookshelfStatus?) -> Int? {
        guard let counts = counts else { return nil }
        switch status {
        case nil: return counts.total
        case .wantToRead: return counts.wantToRead
        case .reading: return counts.reading
        case .finished: return counts.finished
        case .abandoned: return counts.abandoned
        }
    }

    // MARK: - Sort Menu

    @ViewBuilder
    private var sortMenu: some View {
        Menu {
            // Sort options
            Section(L10n.Bookshelf.sort) {
                ForEach(BookshelfSortOption.allCases, id: \.self) { option in
                    Button {
                        sortOption = option
                    } label: {
                        HStack {
                            Label(option.displayName, systemImage: option.iconName)
                            if sortOption == option {
                                Spacer()
                                Image(systemName: "checkmark")
                            }
                        }
                    }
                }
            }

            Divider()

            // Sort order
            Section {
                Button {
                    sortOrder = .ascending
                } label: {
                    HStack {
                        Label(L10n.Bookshelf.sortAsc, systemImage: "arrow.up")
                        if sortOrder == .ascending {
                            Spacer()
                            Image(systemName: "checkmark")
                        }
                    }
                }

                Button {
                    sortOrder = .descending
                } label: {
                    HStack {
                        Label(L10n.Bookshelf.sortDesc, systemImage: "arrow.down")
                        if sortOrder == .descending {
                            Spacer()
                            Image(systemName: "checkmark")
                        }
                    }
                }
            }
        } label: {
            HStack(spacing: 4) {
                Image(systemName: sortOrder == .ascending ? "arrow.up" : "arrow.down")
                Image(systemName: sortOption.iconName)
            }
        }
    }

    // MARK: - Empty State

    @ViewBuilder
    private var emptyStateView: some View {
        ContentUnavailableView {
            Label(L10n.Bookshelf.empty, systemImage: "books.vertical")
        } description: {
            Text(selectedStatus == nil ? L10n.Bookshelf.browseBooks : L10n.Bookshelf.noBooks)
        }
    }

    // MARK: - Bookshelf List

    @ViewBuilder
    private var bookshelfListView: some View {
        List {
            ForEach(items) { item in
                NavigationLink(destination: destinationView(for: item)) {
                    BookshelfItemRow(item: item)
                }
            }

            if hasMore {
                Button(L10n.Notes.loadMore) {
                    Task { await loadMore() }
                }
                .frame(maxWidth: .infinity)
                .disabled(isLoading)
            }
        }
        .listStyle(.plain)
        .refreshable {
            await loadBookshelf()
        }
    }

    @ViewBuilder
    private func destinationView(for item: BookshelfItem) -> some View {
        let bookType: BookType = item.bookType == "ebook" ? .ebook : .magazine
        BookDetailView(bookType: bookType, bookId: item.bookId)
    }

    // MARK: - Data Loading

    private func resetAndReload() {
        items = []
        offset = 0
        Task { await loadBookshelf() }
    }

    private func loadBookshelf() async {
        isLoading = true

        do {
            let statusValue = selectedStatus?.rawValue ?? "all"
            let response = try await APIClient.shared.getMyBookshelf(
                status: statusValue,
                type: selectedType,
                sort: sortOption.rawValue,
                order: sortOrder.rawValue,
                limit: 20,
                offset: 0
            )
            items = response.data
            counts = response.counts
            hasMore = response.hasMore
            offset = items.count
        } catch {
            Log.e("Failed to load bookshelf", error: error)
        }

        isLoading = false
    }

    private func loadMore() async {
        guard !isLoading else { return }
        isLoading = true

        do {
            let statusValue = selectedStatus?.rawValue ?? "all"
            let response = try await APIClient.shared.getMyBookshelf(
                status: statusValue,
                type: selectedType,
                sort: sortOption.rawValue,
                order: sortOrder.rawValue,
                limit: 20,
                offset: offset
            )
            items.append(contentsOf: response.data)
            hasMore = response.hasMore
            offset = items.count
        } catch {
            Log.e("Failed to load more bookshelf items", error: error)
        }

        isLoading = false
    }
}

// MARK: - Sort Option Enum

enum BookshelfSortOption: String, CaseIterable {
    case added = "added"
    case updated = "updated"
    case lastRead = "lastRead"
    case title = "title"
    case author = "author"
    case progress = "progress"
    case rating = "rating"
    case publishDate = "publishDate"

    var displayName: String {
        switch self {
        case .added: return L10n.Bookshelf.sortByAdded
        case .updated: return L10n.Bookshelf.sortByUpdated
        case .lastRead: return L10n.Bookshelf.sortByLastRead
        case .title: return L10n.Bookshelf.sortByTitle
        case .author: return L10n.Bookshelf.sortByAuthor
        case .progress: return L10n.Bookshelf.sortByProgress
        case .rating: return L10n.Bookshelf.sortByRating
        case .publishDate: return L10n.Bookshelf.sortByPublishDate
        }
    }

    var iconName: String {
        switch self {
        case .added: return "calendar.badge.plus"
        case .updated: return "clock"
        case .lastRead: return "book"
        case .title: return "textformat"
        case .author: return "person"
        case .progress: return "chart.bar"
        case .rating: return "star"
        case .publishDate: return "calendar"
        }
    }
}

enum SortOrder: String {
    case ascending = "asc"
    case descending = "desc"
}

// MARK: - Bookshelf Item Row

struct BookshelfItemRow: View {
    let item: BookshelfItem

    var body: some View {
        HStack(spacing: 12) {
            // Book cover
            BookCoverView(coverUrl: item.book.coverUrl, title: item.book.title)
                .frame(width: 60, height: 85)
                .clipShape(RoundedRectangle(cornerRadius: 6))

            // Book info
            VStack(alignment: .leading, spacing: 4) {
                Text(item.book.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(2)

                if let author = item.book.author {
                    Text(author)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                HStack(spacing: 8) {
                    // Status badge
                    Label(item.status.displayName, systemImage: item.status.iconName)
                        .font(.caption2)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(statusColor(item.status).opacity(0.15))
                        .foregroundColor(statusColor(item.status))
                        .clipShape(Capsule())

                    // Progress indicator
                    if let progress = item.progress, progress > 0 {
                        Text(String(format: "%.0f%%", progress * 100))
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }

                    Spacer()

                    // Book type icon
                    Image(systemName: item.bookType == "ebook" ? "book.fill" : "newspaper.fill")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(.vertical, 4)
    }

    private func statusColor(_ status: BookshelfStatus) -> Color {
        switch status {
        case .wantToRead: return .blue
        case .reading: return .orange
        case .finished: return .green
        case .abandoned: return .gray
        }
    }
}

#Preview {
    NavigationStack {
        MyBookshelfView()
    }
}
