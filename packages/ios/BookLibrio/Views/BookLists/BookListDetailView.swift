/**
 * Book List Detail View
 * Shows a single book list with all its books and metadata
 */

import SwiftUI

struct BookListDetailView: View {
    let listId: Int

    @StateObject private var viewModel = BookListsViewModel()
    @State private var showingEditSheet = false
    @State private var showingShareSheet = false
    @State private var showingDeleteConfirm = false
    @State private var selectedBook: BookListItem?

    @Environment(\.dismiss) private var dismiss

    private var isOwnList: Bool {
        guard let list = viewModel.currentList,
              let currentUserId = AuthManager.shared.currentUser?.id else {
            return false
        }
        return list.creatorId == currentUserId
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                if viewModel.isLoadingDetail && viewModel.currentList == nil {
                    loadingView
                } else if let list = viewModel.currentList {
                    // Header
                    listHeader(list)

                    // Books list
                    booksSection
                } else {
                    errorView
                }
            }
        }
        .navigationTitle(viewModel.currentList?.title ?? L10n.BookList.detail)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Menu {
                    if isOwnList {
                        Button {
                            showingEditSheet = true
                        } label: {
                            Label(L10n.BookList.edit, systemImage: "pencil")
                        }
                    }

                    Button {
                        showingShareSheet = true
                    } label: {
                        Label(L10n.Common.share, systemImage: "square.and.arrow.up")
                    }

                    if isOwnList {
                        Divider()
                        Button(role: .destructive) {
                            showingDeleteConfirm = true
                        } label: {
                            Label(L10n.BookList.delete, systemImage: "trash")
                        }
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .task {
            await viewModel.loadListDetail(id: listId)
        }
        .refreshable {
            await viewModel.loadListDetail(id: listId)
        }
        .sheet(isPresented: $showingEditSheet) {
            if let list = viewModel.currentList {
                EditBookListView(list: list) { updatedList in
                    // Update will happen through viewModel
                    Task {
                        await viewModel.loadListDetail(id: listId)
                    }
                }
            }
        }
        .confirmationDialog(
            L10n.BookList.deleteConfirmTitle,
            isPresented: $showingDeleteConfirm,
            titleVisibility: .visible
        ) {
            Button(L10n.BookList.deleteConfirm, role: .destructive) {
                Task {
                    if await viewModel.deleteList(id: listId) {
                        dismiss()
                    }
                }
            }
            Button(L10n.Common.cancel, role: .cancel) {}
        } message: {
            Text(L10n.BookList.deleteConfirmMessage)
        }
        .navigationDestination(item: $selectedBook) { item in
            if let book = item.book {
                // Navigate to book detail
                BookDetailView(
                    bookType: item.bookType == "magazine" ? .magazine : .ebook,
                    bookId: item.bookId
                )
            }
        }
    }

    // MARK: - List Header

    private func listHeader(_ list: BookList) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            // Cover collage
            coverCollage
                .frame(height: 160)
                .padding(.horizontal, 16)

            // Title and description
            VStack(alignment: .leading, spacing: 8) {
                Text(list.title)
                    .font(.title2)
                    .fontWeight(.bold)

                if let description = list.description, !description.isEmpty {
                    Text(description)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                // Tags
                if let tags = list.tags, !tags.isEmpty {
                    tagsRow(tags)
                }
            }
            .padding(.horizontal, 16)

            // Creator info
            creatorSection(list)
                .padding(.horizontal, 16)

            // Stats and action
            statsAndActionRow(list)
                .padding(.horizontal, 16)

            Divider()
                .padding(.top, 8)
        }
        .padding(.top, 16)
    }

    // MARK: - Cover Collage

    private var coverCollage: some View {
        GeometryReader { geometry in
            let spacing: CGFloat = 8
            let previewBooks = viewModel.currentListItems.prefix(5)
            let mainWidth = geometry.size.width * 0.55
            let sideWidth = geometry.size.width * 0.45 - spacing

            HStack(spacing: spacing) {
                // Main cover
                if let firstBook = previewBooks.first?.book {
                    BookCoverView(coverUrl: firstBook.coverUrl, title: firstBook.title)
                        .frame(width: mainWidth, height: geometry.size.height)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .shadow(radius: 4)
                } else {
                    placeholderCover
                        .frame(width: mainWidth, height: geometry.size.height)
                }

                // Side covers (2 stacked)
                VStack(spacing: spacing) {
                    if previewBooks.count > 1, let book = previewBooks[1].book {
                        BookCoverView(coverUrl: book.coverUrl, title: book.title, useThumbnail: true)
                            .frame(width: sideWidth, height: (geometry.size.height - spacing) / 2)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    } else {
                        smallPlaceholderCover
                            .frame(width: sideWidth, height: (geometry.size.height - spacing) / 2)
                    }

                    if previewBooks.count > 2, let book = previewBooks[2].book {
                        BookCoverView(coverUrl: book.coverUrl, title: book.title, useThumbnail: true)
                            .frame(width: sideWidth, height: (geometry.size.height - spacing) / 2)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    } else {
                        smallPlaceholderCover
                            .frame(width: sideWidth, height: (geometry.size.height - spacing) / 2)
                    }
                }
            }
        }
    }

    private var placeholderCover: some View {
        RoundedRectangle(cornerRadius: 12)
            .fill(Color(.systemGray5))
            .overlay(
                Image(systemName: "book.closed")
                    .font(.largeTitle)
                    .foregroundColor(.secondary)
            )
    }

    private var smallPlaceholderCover: some View {
        RoundedRectangle(cornerRadius: 8)
            .fill(Color(.systemGray6))
            .overlay(
                Image(systemName: "book.closed")
                    .font(.title2)
                    .foregroundColor(Color(.systemGray4))
            )
    }

    // MARK: - Tags Row

    private func tagsRow(_ tags: [String]) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(tags, id: \.self) { tag in
                    Text("#\(tag)")
                        .font(.caption)
                        .foregroundColor(.accentColor)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(Color.accentColor.opacity(0.1))
                        .clipShape(Capsule())
                }
            }
        }
    }

    // MARK: - Creator Section

    private func creatorSection(_ list: BookList) -> some View {
        HStack(spacing: 12) {
            if let creator = list.creator {
                // Avatar
                AsyncImage(url: URL(string: creator.avatar ?? "")) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Circle()
                        .fill(Color(.systemGray4))
                        .overlay(
                            Text(String(creator.username.prefix(1)).uppercased())
                                .font(.headline)
                                .foregroundColor(.white)
                        )
                }
                .frame(width: 44, height: 44)
                .clipShape(Circle())

                VStack(alignment: .leading, spacing: 2) {
                    Text(creator.username)
                        .font(.subheadline)
                        .fontWeight(.medium)

                    if let date = list.createdDate {
                        Text(L10n.BookList.createdAt(date.formatted(.dateTime.month().day().year())))
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }

            Spacer()
        }
    }

    // MARK: - Stats and Action Row

    private func statsAndActionRow(_ list: BookList) -> some View {
        HStack {
            // Stats
            HStack(spacing: 20) {
                VStack(spacing: 2) {
                    Text("\(list.itemCount)")
                        .font(.headline)
                    Text(L10n.BookList.books)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                VStack(spacing: 2) {
                    Text(list.formattedFollowerCount)
                        .font(.headline)
                    Text(L10n.BookList.followers)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            Spacer()

            // Follow button
            if !isOwnList {
                Button {
                    Task {
                        await viewModel.toggleFollow(listId: listId)
                    }
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: list.isFollowing == true ? "checkmark" : "plus")
                        Text(list.isFollowing == true ? L10n.BookList.following : L10n.BookList.follow)
                    }
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(list.isFollowing == true ? .secondary : .white)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 10)
                    .background(list.isFollowing == true ? Color(.systemGray5) : Color.accentColor)
                    .clipShape(Capsule())
                }
            }
        }
    }

    // MARK: - Books Section

    private var booksSection: some View {
        LazyVStack(spacing: 0) {
            ForEach(Array(viewModel.currentListItems.enumerated()), id: \.element.id) { index, item in
                BookListItemRow(
                    item: item,
                    index: index + 1,
                    isOwner: isOwnList,
                    onTap: {
                        selectedBook = item
                    },
                    onRemove: isOwnList ? {
                        Task {
                            await viewModel.removeBookFromList(listId: listId, itemId: item.id)
                        }
                    } : nil
                )

                if index < viewModel.currentListItems.count - 1 {
                    Divider()
                        .padding(.leading, 72)
                }
            }
        }
        .padding(.vertical, 8)
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: 24) {
            Spacer()
            ProgressView()
                .scaleEffect(1.2)
            Text(L10n.Common.loading)
                .font(.subheadline)
                .foregroundColor(.secondary)
            Spacer()
        }
        .frame(minHeight: 300)
    }

    // MARK: - Error View

    private var errorView: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: "exclamationmark.triangle")
                .font(.largeTitle)
                .foregroundColor(.secondary)

            Text(viewModel.errorMessage ?? L10n.BookList.loadError)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)

            Button {
                Task {
                    await viewModel.loadListDetail(id: listId)
                }
            } label: {
                Text(L10n.Common.retry)
            }
            .buttonStyle(.bordered)
            Spacer()
        }
        .padding(32)
    }
}

// MARK: - Book List Item Row

struct BookListItemRow: View {
    let item: BookListItem
    let index: Int
    var isOwner: Bool = false
    var onTap: (() -> Void)?
    var onRemove: (() -> Void)?

    var body: some View {
        Button {
            onTap?()
        } label: {
            HStack(spacing: 12) {
                // Index
                Text("\(index)")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.secondary)
                    .frame(width: 24)

                // Cover
                if let book = item.book {
                    BookCoverView(coverUrl: book.coverUrl, title: book.title, useThumbnail: true)
                        .frame(width: 50, height: 70)
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                        .shadow(radius: 1)
                } else {
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Color(.systemGray5))
                        .frame(width: 50, height: 70)
                }

                // Info
                VStack(alignment: .leading, spacing: 4) {
                    if let book = item.book {
                        Text(book.title)
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(.primary)
                            .lineLimit(2)

                        if let author = book.author {
                            Text(author)
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                        }

                        if let rating = book.formattedRating {
                            HStack(spacing: 4) {
                                Image(systemName: "star.fill")
                                    .font(.caption2)
                                    .foregroundColor(.orange)
                                Text(rating)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }

                    // Note
                    if let note = item.note, !note.isEmpty {
                        Text(note)
                            .font(.caption)
                            .foregroundColor(.accentColor)
                            .lineLimit(1)
                            .padding(.top, 2)
                    }
                }

                Spacer()

                // Remove button (for owner)
                if isOwner {
                    Button {
                        onRemove?()
                    } label: {
                        Image(systemName: "minus.circle")
                            .foregroundColor(.red.opacity(0.7))
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .contentShape(Rectangle())
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Edit Book List View

struct EditBookListView: View {
    let list: BookList
    var onSave: ((BookList) -> Void)?

    @Environment(\.dismiss) private var dismiss
    @State private var title: String
    @State private var description: String
    @State private var isPublic: Bool
    @State private var selectedCategory: String
    @State private var isSaving = false

    init(list: BookList, onSave: ((BookList) -> Void)? = nil) {
        self.list = list
        self.onSave = onSave
        _title = State(initialValue: list.title)
        _description = State(initialValue: list.description ?? "")
        _isPublic = State(initialValue: list.isPublic)
        _selectedCategory = State(initialValue: list.category ?? "other")
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField(L10n.BookList.titlePlaceholder, text: $title)
                    TextField(L10n.BookList.descriptionPlaceholder, text: $description, axis: .vertical)
                        .lineLimit(3...6)
                }

                Section {
                    Picker(L10n.BookList.category, selection: $selectedCategory) {
                        ForEach(BookListCategory.allCases.filter { $0 != .all }) { category in
                            Text(category.displayName).tag(category.rawValue)
                        }
                    }

                    Toggle(L10n.BookList.public, isOn: $isPublic)
                }
            }
            .navigationTitle(L10n.BookList.editTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(L10n.Common.cancel) {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        saveChanges()
                    } label: {
                        if isSaving {
                            ProgressView()
                        } else {
                            Text(L10n.Common.save)
                        }
                    }
                    .disabled(title.isEmpty || isSaving)
                }
            }
        }
    }

    private func saveChanges() {
        isSaving = true
        Task {
            let request = UpdateBookListRequest(
                title: title,
                description: description.isEmpty ? nil : description,
                isPublic: isPublic,
                category: selectedCategory,
                tags: nil
            )

            do {
                let response = try await APIClient.shared.updateBookList(id: list.id, request: request)
                await MainActor.run {
                    onSave?(response.data)
                    dismiss()
                }
            } catch {
                print("Failed to update list: \(error)")
            }

            isSaving = false
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        BookListDetailView(listId: 1)
    }
}
