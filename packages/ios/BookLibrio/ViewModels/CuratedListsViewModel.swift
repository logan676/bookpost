/**
 * CuratedListsViewModel
 * ViewModel for managing curated/external book lists
 */

import Foundation
import SwiftUI

@MainActor
class CuratedListsViewModel: ObservableObject {
    // MARK: - Published Properties

    @Published var lists: [CuratedList] = []
    @Published var listTypes: [CuratedListTypeInfo] = []
    @Published var selectedType: String?
    @Published var selectedYear: Int?
    @Published var availableYears: [Int] = []

    @Published var currentList: CuratedList?
    @Published var currentListItems: [CuratedListItem] = []

    // Admin
    @Published var unavailableBooks: [UnavailableBook] = []
    @Published var stats: CuratedListStats?

    // Loading states
    @Published var isLoading = false
    @Published var isLoadingMore = false
    @Published var isLoadingDetail = false
    @Published var isLoadingAdmin = false

    @Published var errorMessage: String?
    @Published var hasMore = true

    // MARK: - Private Properties

    private let apiClient = APIClient.shared
    private var offset = 0
    private let limit = 20

    // MARK: - Public Methods

    /// Load curated lists
    func loadLists(refresh: Bool = false) async {
        if refresh {
            offset = 0
            hasMore = true
        }

        guard !isLoading else { return }

        isLoading = offset == 0
        isLoadingMore = offset > 0
        errorMessage = nil

        do {
            let response = try await apiClient.getCuratedLists(
                type: selectedType,
                year: selectedYear,
                limit: limit,
                offset: offset
            )

            if refresh || offset == 0 {
                lists = response.data
            } else {
                lists.append(contentsOf: response.data)
            }

            hasMore = response.hasMore
            offset += response.data.count
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
        isLoadingMore = false
    }

    /// Load more lists if needed (pagination)
    func loadMoreIfNeeded(currentItem: CuratedList) async {
        guard hasMore, !isLoadingMore else { return }

        let thresholdIndex = lists.index(lists.endIndex, offsetBy: -5)
        if let itemIndex = lists.firstIndex(where: { $0.id == currentItem.id }),
           itemIndex >= thresholdIndex {
            await loadLists()
        }
    }

    /// Load list types
    func loadListTypes() async {
        do {
            let response = try await apiClient.getCuratedListTypes()
            listTypes = response.data

            // Collect all unique years
            var years = Set<Int>()
            for typeInfo in response.data {
                years.formUnion(typeInfo.years)
            }
            availableYears = years.sorted().reversed()
        } catch {
            print("Failed to load list types: \(error)")
        }
    }

    /// Set type filter
    func setType(_ type: String?) {
        selectedType = type
        offset = 0
        Task {
            await loadLists(refresh: true)
        }
    }

    /// Set year filter
    func setYear(_ year: Int?) {
        selectedYear = year
        offset = 0
        Task {
            await loadLists(refresh: true)
        }
    }

    /// Load list detail
    func loadListDetail(id: Int) async {
        isLoadingDetail = true
        errorMessage = nil

        do {
            let response = try await apiClient.getCuratedList(id: id)
            currentList = response.data.list
            currentListItems = response.data.items
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoadingDetail = false
    }

    /// Refresh lists
    func refresh() async {
        await loadLists(refresh: true)
    }

    // MARK: - Admin Methods

    /// Load unavailable books (admin)
    func loadUnavailableBooks(refresh: Bool = false) async {
        if refresh {
            unavailableBooks = []
        }

        isLoadingAdmin = true

        do {
            let response = try await apiClient.getUnavailableBooks(
                limit: 100,
                offset: unavailableBooks.count
            )
            if refresh {
                unavailableBooks = response.data
            } else {
                unavailableBooks.append(contentsOf: response.data)
            }
        } catch {
            print("Failed to load unavailable books: \(error)")
        }

        isLoadingAdmin = false
    }

    /// Load stats (admin)
    func loadStats() async {
        do {
            let response = try await apiClient.getCuratedListStats()
            stats = response.data
        } catch {
            print("Failed to load stats: \(error)")
        }
    }
}
