import Foundation
import SwiftUI

@MainActor
class HomeViewModel: ObservableObject {
    @Published var readingHistory: [ReadingHistoryItem] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    func loadReadingHistory() async {
        isLoading = true
        errorMessage = nil

        do {
            let response = try await APIClient.shared.getReadingHistory(limit: 10)
            readingHistory = response.data
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func refresh() async {
        await loadReadingHistory()
    }
}
