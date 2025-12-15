/**
 * Add to List Sheet
 * Sheet for adding a book to user's book lists
 */

import SwiftUI

struct AddToListSheet: View {
    let bookId: Int
    let bookType: String
    let bookTitle: String
    var onSuccess: (() -> Void)?

    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = AddToListViewModel()
    @State private var showingCreateList = false
    @State private var newListTitle = ""
    @State private var selectedListId: Int?
    @State private var note = ""
    @State private var showingNoteInput = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Book info header
                bookHeader

                Divider()

                // Content
                if viewModel.isLoading {
                    loadingView
                } else if viewModel.userLists.isEmpty {
                    emptyView
                } else {
                    listSelectionView
                }
            }
            .navigationTitle(L10n.BookList.addToList)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(L10n.Common.cancel) {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showingCreateList = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .task {
                await viewModel.loadUserLists()
            }
            .sheet(isPresented: $showingCreateList) {
                quickCreateListSheet
            }
            .alert(L10n.BookList.addNote, isPresented: $showingNoteInput) {
                TextField(L10n.BookList.notePlaceholder, text: $note)
                Button(L10n.Common.cancel, role: .cancel) {
                    selectedListId = nil
                    note = ""
                }
                Button(L10n.BookList.add) {
                    if let listId = selectedListId {
                        addToList(listId: listId)
                    }
                }
            } message: {
                Text(L10n.BookList.notePrompt)
            }
        }
    }

    // MARK: - Book Header

    private var bookHeader: some View {
        HStack(spacing: 12) {
            // Book icon placeholder
            RoundedRectangle(cornerRadius: 6)
                .fill(Color(.systemGray5))
                .frame(width: 40, height: 56)
                .overlay(
                    Image(systemName: "book.closed")
                        .foregroundColor(.secondary)
                )

            VStack(alignment: .leading, spacing: 4) {
                Text(L10n.BookList.addingBook)
                    .font(.caption)
                    .foregroundColor(.secondary)

                Text(bookTitle)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(2)
            }

            Spacer()
        }
        .padding()
        .background(Color(.systemGroupedBackground))
    }

    // MARK: - List Selection View

    private var listSelectionView: some View {
        List {
            ForEach(viewModel.userLists) { list in
                ListSelectionRow(list: list) {
                    selectedListId = list.id
                    showingNoteInput = true
                }
            }
        }
        .listStyle(.plain)
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack {
            Spacer()
            ProgressView()
            Text(L10n.Common.loading)
                .font(.caption)
                .foregroundColor(.secondary)
                .padding(.top, 8)
            Spacer()
        }
    }

    // MARK: - Empty View

    private var emptyView: some View {
        VStack(spacing: 16) {
            Spacer()

            Image(systemName: "text.book.closed")
                .font(.system(size: 48))
                .foregroundColor(.secondary)

            Text(L10n.BookList.noLists)
                .font(.headline)

            Text(L10n.BookList.noListsHint)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            Button {
                showingCreateList = true
            } label: {
                Label(L10n.BookList.createAndAdd, systemImage: "plus.circle.fill")
            }
            .buttonStyle(.borderedProminent)
            .padding(.top, 8)

            Spacer()
        }
    }

    // MARK: - Quick Create List Sheet

    private var quickCreateListSheet: some View {
        NavigationStack {
            Form {
                Section {
                    TextField(L10n.BookList.newListTitle, text: $newListTitle)
                } footer: {
                    Text(L10n.BookList.quickCreateHint)
                }
            }
            .navigationTitle(L10n.BookList.createAndAdd)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(L10n.Common.cancel) {
                        showingCreateList = false
                        newListTitle = ""
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        createListAndAdd()
                    } label: {
                        if viewModel.isAdding {
                            ProgressView()
                        } else {
                            Text(L10n.BookList.create)
                                .fontWeight(.semibold)
                        }
                    }
                    .disabled(newListTitle.isEmpty || viewModel.isAdding)
                }
            }
        }
        .presentationDetents([.height(200)])
    }

    // MARK: - Actions

    private func addToList(listId: Int) {
        Task {
            let success = await viewModel.addBook(
                to: listId,
                bookId: bookId,
                bookType: bookType,
                note: note.isEmpty ? nil : note
            )

            if success {
                await MainActor.run {
                    onSuccess?()
                    dismiss()
                }
            }

            selectedListId = nil
            note = ""
        }
    }

    private func createListAndAdd() {
        Task {
            let success = await viewModel.createListAndAddBook(
                title: newListTitle,
                bookId: bookId,
                bookType: bookType
            )

            if success {
                await MainActor.run {
                    showingCreateList = false
                    newListTitle = ""
                    onSuccess?()
                    dismiss()
                }
            }
        }
    }
}

// MARK: - List Selection Row

struct ListSelectionRow: View {
    let list: BookList
    var onSelect: () -> Void

    var body: some View {
        Button {
            onSelect()
        } label: {
            HStack(spacing: 12) {
                // Mini cover grid
                miniCoverGrid
                    .frame(width: 50, height: 50)
                    .clipShape(RoundedRectangle(cornerRadius: 6))

                // Info
                VStack(alignment: .leading, spacing: 4) {
                    Text(list.title)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                        .lineLimit(1)

                    HStack(spacing: 8) {
                        Label("\(list.itemCount)", systemImage: "book.closed")

                        if !list.isPublic {
                            Label(L10n.BookList.private, systemImage: "lock.fill")
                        }
                    }
                    .font(.caption)
                    .foregroundColor(.secondary)
                }

                Spacer()

                Image(systemName: "plus.circle")
                    .foregroundColor(.accentColor)
                    .font(.title3)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(PlainButtonStyle())
    }

    private var miniCoverGrid: some View {
        let previewBooks = list.previewBooks
        let colors: [Color] = [.blue.opacity(0.15), .green.opacity(0.15), .orange.opacity(0.15), .purple.opacity(0.15)]

        return GeometryReader { geometry in
            let spacing: CGFloat = 2
            let itemSize = (geometry.size.width - spacing) / 2

            LazyVGrid(columns: [
                GridItem(.fixed(itemSize), spacing: spacing),
                GridItem(.fixed(itemSize), spacing: spacing)
            ], spacing: spacing) {
                ForEach(0..<4, id: \.self) { index in
                    if index < previewBooks.count, let book = previewBooks[index].book {
                        BookCoverView(coverUrl: book.coverUrl, title: book.title, useThumbnail: true)
                            .frame(width: itemSize, height: itemSize)
                            .clipShape(RoundedRectangle(cornerRadius: 2))
                    } else {
                        RoundedRectangle(cornerRadius: 2)
                            .fill(colors[index % colors.count])
                    }
                }
            }
        }
    }
}

// MARK: - Preview

#Preview {
    AddToListSheet(
        bookId: 1,
        bookType: "ebook",
        bookTitle: "The Great Gatsby"
    )
}
