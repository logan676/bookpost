import SwiftUI

@MainActor
class MagazinesViewModel: ObservableObject {
    @Published var magazines: [Magazine] = []
    @Published var publishers: [MagazinePublisher] = []
    @Published var selectedPublisherId: Int?
    @Published var searchQuery = ""
    @Published var total = 0
    @Published var isLoading = false
    @Published var errorMessage: String?

    func loadPublishers() async {
        do {
            let response = try await APIClient.shared.getPublishers()
            publishers = response.data
        } catch {
            // Publishers are optional
        }
    }

    func loadMagazines() async {
        isLoading = true
        errorMessage = nil

        do {
            let response = try await APIClient.shared.getMagazines(
                publisher: selectedPublisherId,
                search: searchQuery.isEmpty ? nil : searchQuery
            )
            magazines = response.data
            total = response.total
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func selectPublisher(_ publisherId: Int?) {
        selectedPublisherId = publisherId
        Task {
            await loadMagazines()
        }
    }

    func search() {
        Task {
            await loadMagazines()
        }
    }

    func refresh() async {
        await loadPublishers()
        await loadMagazines()
    }
}

struct MagazinesView: View {
    @StateObject private var viewModel = MagazinesViewModel()
    @State private var selectedMagazineId: Int?

    private let columns = [
        GridItem(.adaptive(minimum: 140), spacing: 12)
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                SearchBarView(text: $viewModel.searchQuery) {
                    viewModel.search()
                }
                .padding(.horizontal)
                .padding(.top, 8)

                if !viewModel.publishers.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            CategoryChip(
                                title: L10n.Magazines.allPublishers,
                                isSelected: viewModel.selectedPublisherId == nil
                            ) {
                                viewModel.selectPublisher(nil)
                            }

                            ForEach(viewModel.publishers) { publisher in
                                CategoryChip(
                                    title: "\(publisher.name) (\(publisher.count ?? 0))",
                                    isSelected: viewModel.selectedPublisherId == publisher.id
                                ) {
                                    viewModel.selectPublisher(publisher.id)
                                }
                            }
                        }
                        .padding(.horizontal)
                    }
                    .padding(.vertical, 8)
                }

                Group {
                    if viewModel.isLoading && viewModel.magazines.isEmpty {
                        LoadingView()
                    } else if let error = viewModel.errorMessage, viewModel.magazines.isEmpty {
                        ErrorView(message: error) {
                            Task { await viewModel.loadMagazines() }
                        }
                    } else if viewModel.magazines.isEmpty {
                        EmptyView(message: L10n.Magazines.noMagazines)
                    } else {
                        ScrollView {
                            LazyVGrid(columns: columns, spacing: 16) {
                                ForEach(viewModel.magazines) { magazine in
                                    BookCoverCard(
                                        title: magazine.title,
                                        coverUrl: magazine.coverUrl,
                                        subtitle: magazine.year.map { String($0) }
                                    ) {
                                        selectedMagazineId = magazine.id
                                    }
                                }
                            }
                            .padding()
                        }
                    }
                }
            }
            .navigationTitle(L10n.Magazines.title)
            .refreshable {
                await viewModel.refresh()
            }
            .task {
                await viewModel.refresh()
            }
            .navigationDestination(item: $selectedMagazineId) { id in
                BookDetailView(bookType: .magazine, bookId: id)
            }
        }
    }
}

#Preview {
    MagazinesView()
}
