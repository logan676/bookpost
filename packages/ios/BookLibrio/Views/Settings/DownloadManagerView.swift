import SwiftUI

/// View for managing downloaded/cached books
/// Allows viewing all cached content and managing storage
struct DownloadManagerView: View {
    @StateObject private var cacheManager = BookCacheManager.shared
    @State private var selectedFilter: CachedBookFilter = .all
    @State private var showClearAllAlert = false
    @State private var bookToDelete: CachedBookMetadata?
    @State private var showDeleteConfirm = false

    enum CachedBookFilter: String, CaseIterable {
        case all = "全部"
        case ebook = "电子书"
        case magazine = "杂志"

        var localizedName: String {
            switch self {
            case .all: return L10n.Cache.filterAll
            case .ebook: return L10n.Cache.filterEbooks
            case .magazine: return L10n.Cache.filterMagazines
            }
        }
    }

    private var filteredBooks: [CachedBookMetadata] {
        switch selectedFilter {
        case .all:
            return cacheManager.getAllCachedBooks()
        case .ebook:
            return cacheManager.getCachedBooks(type: .ebook)
        case .magazine:
            return cacheManager.getCachedBooks(type: .magazine)
        }
    }

    var body: some View {
        List {
            // Storage summary section
            storageSummarySection

            // Active downloads section
            if !cacheManager.activeDownloads.isEmpty {
                activeDownloadsSection
            }

            // Filter picker
            filterSection

            // Cached books list
            if filteredBooks.isEmpty {
                emptyStateSection
            } else {
                cachedBooksSection
            }
        }
        .navigationTitle(L10n.Cache.downloadManager)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                if !filteredBooks.isEmpty {
                    Button {
                        showClearAllAlert = true
                    } label: {
                        Image(systemName: "trash")
                            .foregroundColor(.red)
                    }
                }
            }
        }
        .alert(L10n.Cache.clearAllCache, isPresented: $showClearAllAlert) {
            Button(L10n.Common.cancel, role: .cancel) {}
            Button(L10n.Cache.clearAll, role: .destructive) {
                try? cacheManager.clearAllCache()
            }
        } message: {
            Text(L10n.Cache.clearAllMessage)
        }
        .alert(L10n.Cache.deleteCache, isPresented: $showDeleteConfirm) {
            Button(L10n.Common.cancel, role: .cancel) {
                bookToDelete = nil
            }
            Button(L10n.Settings.delete, role: .destructive) {
                if let book = bookToDelete {
                    try? cacheManager.deleteCache(bookType: book.bookType, bookId: book.bookId)
                }
                bookToDelete = nil
            }
        } message: {
            if let book = bookToDelete {
                Text(String(format: L10n.Cache.deleteBookMessage, book.title))
            }
        }
    }

    // MARK: - Storage Summary Section

    private var storageSummarySection: some View {
        Section {
            VStack(spacing: 16) {
                // Storage ring
                ZStack {
                    Circle()
                        .stroke(Color(.systemGray5), lineWidth: 12)
                        .frame(width: 100, height: 100)

                    Circle()
                        .trim(from: 0, to: storagePercentage)
                        .stroke(
                            storageColor,
                            style: StrokeStyle(lineWidth: 12, lineCap: .round)
                        )
                        .frame(width: 100, height: 100)
                        .rotationEffect(.degrees(-90))

                    VStack(spacing: 2) {
                        Text(BookCacheManager.formatSize(cacheManager.totalCacheSize))
                            .font(.headline)
                            .fontWeight(.bold)
                        Text(L10n.Cache.used)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }

                // Stats
                HStack(spacing: 24) {
                    VStack(spacing: 4) {
                        Text("\(cacheManager.cachedBooksCount)")
                            .font(.title2)
                            .fontWeight(.bold)
                        Text(L10n.Cache.booksCount)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    Divider()
                        .frame(height: 40)

                    VStack(spacing: 4) {
                        Text(BookCacheManager.formatSize(cacheManager.getAvailableStorage()))
                            .font(.title2)
                            .fontWeight(.bold)
                        Text(L10n.Cache.available)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
        }
    }

    private var storagePercentage: CGFloat {
        let available = cacheManager.getAvailableStorage()
        let used = cacheManager.totalCacheSize
        let total = available + used
        guard total > 0 else { return 0 }
        return CGFloat(used) / CGFloat(total)
    }

    private var storageColor: Color {
        if storagePercentage > 0.9 {
            return .red
        } else if storagePercentage > 0.7 {
            return .orange
        } else {
            return .blue
        }
    }

    // MARK: - Active Downloads Section

    private var activeDownloadsSection: some View {
        Section {
            ForEach(cacheManager.activeDownloads) { task in
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(task.title)
                            .font(.subheadline)
                            .lineLimit(1)

                        ProgressView(value: task.progress, total: 1.0)
                            .progressViewStyle(.linear)
                            .tint(.blue)
                    }

                    Spacer()

                    Text("\(Int(task.progress * 100))%")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    Button {
                        cacheManager.cancelDownload(bookType: task.bookType, bookId: task.bookId)
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.secondary)
                    }
                    .buttonStyle(.plain)
                }
            }
        } header: {
            HStack {
                Text(L10n.Cache.downloading)
                Spacer()
                Text("\(cacheManager.activeDownloads.count)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }

    // MARK: - Filter Section

    private var filterSection: some View {
        Section {
            Picker(L10n.Cache.filter, selection: $selectedFilter) {
                ForEach(CachedBookFilter.allCases, id: \.self) { filter in
                    Text(filter.localizedName).tag(filter)
                }
            }
            .pickerStyle(.segmented)
        }
    }

    // MARK: - Empty State Section

    private var emptyStateSection: some View {
        Section {
            VStack(spacing: 16) {
                Image(systemName: "arrow.down.circle")
                    .font(.system(size: 48))
                    .foregroundColor(.secondary.opacity(0.5))

                Text(L10n.Cache.noCachedBooks)
                    .font(.headline)
                    .foregroundColor(.secondary)

                Text(L10n.Cache.noCachedBooksDesc)
                    .font(.caption)
                    .foregroundColor(.secondary.opacity(0.8))
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 40)
        }
    }

    // MARK: - Cached Books Section

    private var cachedBooksSection: some View {
        Section {
            ForEach(filteredBooks) { book in
                cachedBookRow(book)
            }
            .onDelete { indexSet in
                for index in indexSet {
                    let book = filteredBooks[index]
                    try? cacheManager.deleteCache(bookType: book.bookType, bookId: book.bookId)
                }
            }
        } header: {
            HStack {
                Text(L10n.Cache.cachedBooks)
                Spacer()
                Text("\(filteredBooks.count)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }

    @ViewBuilder
    private func cachedBookRow(_ book: CachedBookMetadata) -> some View {
        HStack(spacing: 12) {
            // Cover image
            if let coverUrl = book.coverUrl, let url = URL(string: coverUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .empty:
                        Rectangle()
                            .fill(Color(.systemGray5))
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    case .failure:
                        Rectangle()
                            .fill(Color(.systemGray5))
                            .overlay(
                                Image(systemName: "book.closed")
                                    .foregroundColor(.secondary)
                            )
                    @unknown default:
                        Rectangle()
                            .fill(Color(.systemGray5))
                    }
                }
                .frame(width: 50, height: 70)
                .clipShape(RoundedRectangle(cornerRadius: 4))
            } else {
                Rectangle()
                    .fill(Color(.systemGray5))
                    .frame(width: 50, height: 70)
                    .clipShape(RoundedRectangle(cornerRadius: 4))
                    .overlay(
                        Image(systemName: "book.closed")
                            .foregroundColor(.secondary)
                    )
            }

            // Book info
            VStack(alignment: .leading, spacing: 4) {
                Text(book.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(2)

                HStack(spacing: 8) {
                    // Type badge
                    Text(book.bookType == .ebook ? L10n.Cache.ebook : L10n.Cache.magazine)
                        .font(.caption2)
                        .foregroundColor(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(book.bookType == .ebook ? Color.blue : Color.purple)
                        .cornerRadius(4)

                    // File type
                    Text(book.fileExtension.uppercased())
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }

                HStack(spacing: 8) {
                    Text(BookCacheManager.formatSize(book.fileSize))
                    Text("•")
                    Text(formatDate(book.downloadedAt))
                }
                .font(.caption)
                .foregroundColor(.secondary)
            }

            Spacer()

            // Delete button
            Button {
                bookToDelete = book
                showDeleteConfirm = true
            } label: {
                Image(systemName: "trash")
                    .foregroundColor(.red.opacity(0.7))
            }
            .buttonStyle(.plain)
        }
        .padding(.vertical, 4)
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

#Preview {
    NavigationStack {
        DownloadManagerView()
    }
}
