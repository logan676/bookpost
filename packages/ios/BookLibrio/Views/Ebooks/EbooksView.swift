import SwiftUI

struct EbooksView: View {
    @StateObject private var viewModel = EbooksViewModel()
    @State private var selectedEbookId: Int?

    private let columns = [
        GridItem(.adaptive(minimum: 140), spacing: 12)
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search bar
                SearchBarView(text: $viewModel.searchQuery) {
                    viewModel.search()
                }
                .padding(.horizontal)
                .padding(.top, 8)

                // Category chips
                if !viewModel.categories.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            CategoryChip(
                                title: L10n.Common.all,
                                isSelected: viewModel.selectedCategoryId == nil
                            ) {
                                viewModel.selectCategory(nil)
                            }

                            ForEach(viewModel.categories) { category in
                                CategoryChip(
                                    title: "\(category.name) (\(category.count ?? 0))",
                                    isSelected: viewModel.selectedCategoryId == category.id
                                ) {
                                    viewModel.selectCategory(category.id)
                                }
                            }
                        }
                        .padding(.horizontal)
                    }
                    .padding(.vertical, 8)
                }

                // Content
                Group {
                    if viewModel.isLoading && viewModel.ebooks.isEmpty {
                        LoadingView()
                    } else if let error = viewModel.errorMessage, viewModel.ebooks.isEmpty {
                        ErrorView(message: error) {
                            Task { await viewModel.loadEbooks() }
                        }
                    } else if viewModel.ebooks.isEmpty {
                        EmptyView(message: L10n.Ebooks.noEbooks)
                    } else {
                        ScrollView {
                            LazyVGrid(columns: columns, spacing: 16) {
                                ForEach(viewModel.ebooks) { ebook in
                                    BookCoverCard(
                                        title: ebook.title,
                                        coverUrl: ebook.coverUrl,
                                        subtitle: ebook.fileType?.uppercased()
                                    ) {
                                        selectedEbookId = ebook.id
                                    }
                                }
                            }
                            .padding()
                        }
                    }
                }
            }
            .navigationTitle(L10n.Ebooks.title)
            .refreshable {
                await viewModel.refresh()
            }
            .task {
                await viewModel.refresh()
            }
            .navigationDestination(item: $selectedEbookId) { id in
                BookDetailView(bookType: .ebook, bookId: id)
            }
        }
    }
}

struct CategoryChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isSelected ? Color.blue : Color(.systemGray5))
                .foregroundColor(isSelected ? .white : .primary)
                .cornerRadius(16)
        }
    }
}

#Preview {
    EbooksView()
}
