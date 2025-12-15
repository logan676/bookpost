/**
 * Book Lists ViewModel
 * Manages state for browsing, creating, and managing book lists
 */

import Foundation
import SwiftUI

@MainActor
class BookListsViewModel: ObservableObject {
    // MARK: - Published Properties

    // Browse state
    @Published var lists: [BookList] = []
    @Published var selectedCategory: BookListCategory = .all
    @Published var selectedSort: BookListSortOption = .popular
    @Published var searchQuery: String = ""

    // User's lists
    @Published var myCreatedLists: [BookList] = []
    @Published var myFollowingLists: [BookList] = []

    // Detail view state
    @Published var currentList: BookList?
    @Published var currentListItems: [BookListItem] = []

    // Loading states
    @Published var isLoading = false
    @Published var isLoadingMore = false
    @Published var isLoadingDetail = false
    @Published var isCreating = false

    // Error handling
    @Published var errorMessage: String?

    // Pagination
    @Published var hasMore = true
    private var currentOffset = 0
    private let pageSize = 20

    // MARK: - Private Properties

    private let apiClient = APIClient.shared

    // MARK: - Browse Lists

    /// Load initial list of book lists with current filters
    func loadLists() async {
        isLoading = true
        errorMessage = nil
        currentOffset = 0

        do {
            let response = try await apiClient.getBookLists(
                category: selectedCategory.rawValue,
                search: searchQuery.isEmpty ? nil : searchQuery,
                sort: selectedSort.rawValue,
                limit: pageSize,
                offset: 0
            )

            lists = response.data
            hasMore = response.hasMore ?? (response.data.count >= pageSize)
            currentOffset = response.data.count
        } catch {
            errorMessage = error.localizedDescription
            print("Failed to load book lists: \(error)")
        }

        isLoading = false
    }

    /// Load more lists for infinite scroll
    func loadMoreIfNeeded(currentItem: BookList) async {
        guard !isLoadingMore, hasMore else { return }

        // Check if we're near the end
        guard let index = lists.firstIndex(where: { $0.id == currentItem.id }),
              index >= lists.count - 3 else { return }

        isLoadingMore = true

        do {
            let response = try await apiClient.getBookLists(
                category: selectedCategory.rawValue,
                search: searchQuery.isEmpty ? nil : searchQuery,
                sort: selectedSort.rawValue,
                limit: pageSize,
                offset: currentOffset
            )

            lists.append(contentsOf: response.data)
            hasMore = response.hasMore ?? (response.data.count >= pageSize)
            currentOffset += response.data.count
        } catch {
            print("Failed to load more book lists: \(error)")
        }

        isLoadingMore = false
    }

    /// Refresh lists with current filters
    func refresh() async {
        await loadLists()
    }

    /// Update category filter and reload
    func setCategory(_ category: BookListCategory) async {
        guard category != selectedCategory else { return }
        selectedCategory = category
        await loadLists()
    }

    /// Update sort option and reload
    func setSort(_ sort: BookListSortOption) async {
        guard sort != selectedSort else { return }
        selectedSort = sort
        await loadLists()
    }

    /// Search lists
    func search(_ query: String) async {
        searchQuery = query
        await loadLists()
    }

    // MARK: - My Lists

    /// Load current user's created and followed lists
    func loadMyLists() async {
        do {
            let response = try await apiClient.getMyBookLists()
            myCreatedLists = response.data.created
            myFollowingLists = response.data.following
        } catch {
            print("Failed to load my lists: \(error)")
        }
    }

    // MARK: - List Detail

    /// Load full details for a specific list
    func loadListDetail(id: Int) async {
        isLoadingDetail = true
        errorMessage = nil

        do {
            let response = try await apiClient.getBookList(id: id)
            currentList = response.data
            currentListItems = response.data.items ?? []

            // If items not included, load separately
            if currentListItems.isEmpty {
                await loadListItems(listId: id)
            }
        } catch {
            errorMessage = error.localizedDescription
            print("Failed to load list detail: \(error)")
        }

        isLoadingDetail = false
    }

    /// Load items for a list with pagination
    func loadListItems(listId: Int, loadMore: Bool = false) async {
        if loadMore {
            isLoadingMore = true
        }

        do {
            let offset = loadMore ? currentListItems.count : 0
            let response = try await apiClient.getBookListItems(
                listId: listId,
                limit: 50,
                offset: offset
            )

            if loadMore {
                currentListItems.append(contentsOf: response.data)
            } else {
                currentListItems = response.data
            }
        } catch {
            print("Failed to load list items: \(error)")
        }

        isLoadingMore = false
    }

    // MARK: - Create & Edit Lists

    /// Create a new book list
    func createList(
        title: String,
        description: String?,
        isPublic: Bool,
        category: String?,
        tags: [String]?
    ) async -> BookList? {
        isCreating = true
        errorMessage = nil

        defer { isCreating = false }

        do {
            let request = CreateBookListRequest(
                title: title,
                description: description,
                isPublic: isPublic,
                category: category,
                tags: tags
            )
            let response = try await apiClient.createBookList(request: request)

            // Add to my created lists
            myCreatedLists.insert(response.data, at: 0)

            return response.data
        } catch {
            errorMessage = error.localizedDescription
            print("Failed to create list: \(error)")
            return nil
        }
    }

    /// Update an existing list
    func updateList(
        id: Int,
        title: String?,
        description: String?,
        isPublic: Bool?,
        category: String?,
        tags: [String]?
    ) async -> Bool {
        do {
            let request = UpdateBookListRequest(
                title: title,
                description: description,
                isPublic: isPublic,
                category: category,
                tags: tags
            )
            let response = try await apiClient.updateBookList(id: id, request: request)

            // Update current list if it's the same
            if currentList?.id == id {
                currentList = response.data
            }

            // Update in my lists
            if let index = myCreatedLists.firstIndex(where: { $0.id == id }) {
                myCreatedLists[index] = response.data
            }

            return true
        } catch {
            errorMessage = error.localizedDescription
            print("Failed to update list: \(error)")
            return false
        }
    }

    /// Delete a book list
    func deleteList(id: Int) async -> Bool {
        do {
            _ = try await apiClient.deleteBookList(id: id)

            // Remove from my created lists
            myCreatedLists.removeAll { $0.id == id }

            // Remove from browse lists if present
            lists.removeAll { $0.id == id }

            return true
        } catch {
            errorMessage = error.localizedDescription
            print("Failed to delete list: \(error)")
            return false
        }
    }

    // MARK: - List Items Management

    /// Add a book to a list
    func addBookToList(
        listId: Int,
        bookId: Int,
        bookType: String,
        note: String? = nil
    ) async -> Bool {
        do {
            let request = AddBookToListRequest(
                bookId: bookId,
                bookType: bookType,
                note: note,
                position: nil
            )
            let response = try await apiClient.addBookToList(listId: listId, request: request)

            // Add to current items if viewing this list
            if currentList?.id == listId {
                currentListItems.append(response.data)
            }

            // Update item count in lists
            updateListItemCount(listId: listId, delta: 1)

            return true
        } catch {
            errorMessage = error.localizedDescription
            print("Failed to add book to list: \(error)")
            return false
        }
    }

    /// Remove a book from a list
    func removeBookFromList(listId: Int, itemId: Int) async -> Bool {
        do {
            _ = try await apiClient.removeBookFromList(listId: listId, itemId: itemId)

            // Remove from current items if viewing this list
            currentListItems.removeAll { $0.id == itemId }

            // Update item count in lists
            updateListItemCount(listId: listId, delta: -1)

            return true
        } catch {
            errorMessage = error.localizedDescription
            print("Failed to remove book from list: \(error)")
            return false
        }
    }

    /// Update a list item's note
    func updateListItemNote(listId: Int, itemId: Int, note: String?) async -> Bool {
        do {
            let request = UpdateListItemRequest(note: note, position: nil)
            let response = try await apiClient.updateListItem(listId: listId, itemId: itemId, request: request)

            // Update in current items
            if let index = currentListItems.firstIndex(where: { $0.id == itemId }) {
                currentListItems[index] = response.data
            }

            return true
        } catch {
            print("Failed to update list item: \(error)")
            return false
        }
    }

    // MARK: - Follow/Unfollow

    /// Toggle follow status for a list
    func toggleFollow(listId: Int) async -> Bool {
        do {
            let response = try await apiClient.toggleListFollow(id: listId)

            // Update in browse lists
            if let index = lists.firstIndex(where: { $0.id == listId }) {
                var updatedList = lists[index]
                // Note: We can't directly mutate the struct, so we need to create a new array
                lists = lists.map { list in
                    if list.id == listId {
                        // The response has the new following state
                        return list
                    }
                    return list
                }
            }

            // Update current list if viewing
            if currentList?.id == listId {
                // Reload to get updated state
                await loadListDetail(id: listId)
            }

            // Update my following lists
            if response.data.isFollowing {
                // Reload my lists to get the new list
                await loadMyLists()
            } else {
                myFollowingLists.removeAll { $0.id == listId }
            }

            return true
        } catch {
            errorMessage = error.localizedDescription
            print("Failed to toggle follow: \(error)")
            return false
        }
    }

    // MARK: - Helper Methods

    private func updateListItemCount(listId: Int, delta: Int) {
        // This is a visual update only since the actual count comes from the server
        // In a real implementation, you might want to reload the specific list
    }

    /// Clear current list detail
    func clearDetail() {
        currentList = nil
        currentListItems = []
    }

    /// Clear error message
    func clearError() {
        errorMessage = nil
    }
}

// MARK: - Add to List Sheet ViewModel

/// Lightweight ViewModel for the "Add to List" sheet
@MainActor
class AddToListViewModel: ObservableObject {
    @Published var userLists: [BookList] = []
    @Published var isLoading = false
    @Published var isAdding = false
    @Published var errorMessage: String?

    private let apiClient = APIClient.shared

    /// Load user's created lists
    func loadUserLists() async {
        isLoading = true

        do {
            let response = try await apiClient.getMyBookLists()
            userLists = response.data.created
        } catch {
            errorMessage = error.localizedDescription
            print("Failed to load user lists: \(error)")
        }

        isLoading = false
    }

    /// Add book to selected list
    func addBook(
        to listId: Int,
        bookId: Int,
        bookType: String,
        note: String? = nil
    ) async -> Bool {
        isAdding = true

        defer { isAdding = false }

        do {
            let request = AddBookToListRequest(
                bookId: bookId,
                bookType: bookType,
                note: note,
                position: nil
            )
            _ = try await apiClient.addBookToList(listId: listId, request: request)
            return true
        } catch {
            errorMessage = error.localizedDescription
            print("Failed to add book to list: \(error)")
            return false
        }
    }

    /// Create a new list and add the book to it
    func createListAndAddBook(
        title: String,
        bookId: Int,
        bookType: String
    ) async -> Bool {
        isAdding = true

        defer { isAdding = false }

        do {
            // Create the list
            let createRequest = CreateBookListRequest(
                title: title,
                description: nil,
                isPublic: true,
                category: nil,
                tags: nil
            )
            let listResponse = try await apiClient.createBookList(request: createRequest)

            // Add the book
            let addRequest = AddBookToListRequest(
                bookId: bookId,
                bookType: bookType,
                note: nil,
                position: nil
            )
            _ = try await apiClient.addBookToList(listId: listResponse.data.id, request: addRequest)

            // Add to local list
            userLists.insert(listResponse.data, at: 0)

            return true
        } catch {
            errorMessage = error.localizedDescription
            print("Failed to create list and add book: \(error)")
            return false
        }
    }
}
