import Foundation
import SwiftUI

@MainActor
class EbooksViewModel: ObservableObject {
    @Published var ebooks: [Ebook] = []
    @Published var categories: [EbookCategory] = []
    @Published var selectedCategoryId: Int?
    @Published var searchQuery = ""
    @Published var total = 0
    @Published var isLoading = false
    @Published var errorMessage: String?

    func loadCategories() async {
        do {
            let response = try await APIClient.shared.getEbookCategories()
            categories = response.data
        } catch {
            // Categories are optional
        }
    }

    func loadEbooks() async {
        isLoading = true
        errorMessage = nil

        do {
            let response = try await APIClient.shared.getEbooks(
                category: selectedCategoryId,
                search: searchQuery.isEmpty ? nil : searchQuery
            )
            ebooks = response.data
            total = response.total
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func selectCategory(_ categoryId: Int?) {
        selectedCategoryId = categoryId
        Task {
            await loadEbooks()
        }
    }

    func search() {
        Task {
            await loadEbooks()
        }
    }

    func refresh() async {
        await loadCategories()
        await loadEbooks()
    }
}
