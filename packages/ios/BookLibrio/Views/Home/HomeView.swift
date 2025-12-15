import SwiftUI

struct HomeView: View {
    @StateObject private var viewModel = HomeViewModel()
    @State private var selectedEbookId: Int?
    @State private var selectedMagazineId: Int?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    if !viewModel.readingHistory.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text(L10n.Home.continueReading)
                                .font(.title2)
                                .fontWeight(.bold)
                                .padding(.horizontal)

                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 12) {
                                    ForEach(viewModel.readingHistory) { entry in
                                        ReadingHistoryCard(entry: entry) {
                                            if entry.itemType == "ebook" {
                                                selectedEbookId = entry.itemId
                                            } else if entry.itemType == "magazine" {
                                                selectedMagazineId = entry.itemId
                                            }
                                        }
                                    }
                                }
                                .padding(.horizontal)
                            }
                        }
                    }

                    // Quick access section
                    VStack(alignment: .leading, spacing: 12) {
                        Text(L10n.Home.quickAccess)
                            .font(.title2)
                            .fontWeight(.bold)
                            .padding(.horizontal)

                        HStack(spacing: 12) {
                            QuickAccessCard(
                                title: L10n.Tab.ebooks,
                                icon: "book",
                                color: .blue
                            )

                            QuickAccessCard(
                                title: L10n.Tab.magazines,
                                icon: "newspaper",
                                color: .green
                            )

                            QuickAccessCard(
                                title: L10n.Tab.books,
                                icon: "books.vertical",
                                color: .orange
                            )
                        }
                        .padding(.horizontal)
                    }

                    // Curated Lists Section
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("Curated Lists")
                                .font(.title2)
                                .fontWeight(.bold)

                            Spacer()

                            NavigationLink(destination: CuratedListsView()) {
                                Text("See All")
                                    .font(.subheadline)
                                    .foregroundColor(.accentColor)
                            }
                        }
                        .padding(.horizontal)

                        NavigationLink(destination: CuratedListsView()) {
                            HStack(spacing: 16) {
                                Image(systemName: "star.circle.fill")
                                    .font(.system(size: 40))
                                    .foregroundStyle(
                                        LinearGradient(
                                            colors: [.orange, .yellow],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        )
                                    )

                                VStack(alignment: .leading, spacing: 4) {
                                    Text("NYT, Amazon, Bill Gates & More")
                                        .font(.headline)

                                    Text("Explore book recommendations from top sources")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }

                                Spacer()

                                Image(systemName: "chevron.right")
                                    .foregroundColor(.secondary)
                            }
                            .padding()
                            .background(Color(.secondarySystemGroupedBackground))
                            .cornerRadius(12)
                        }
                        .buttonStyle(.plain)
                        .padding(.horizontal)
                    }

                    if viewModel.readingHistory.isEmpty && !viewModel.isLoading {
                        VStack(spacing: 16) {
                            Spacer()
                            Image(systemName: "book.closed")
                                .font(.system(size: 50))
                                .foregroundColor(.secondary)

                            Text(L10n.Home.noReadingHistory)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                            Spacer()
                        }
                        .frame(height: 200)
                    }
                }
                .padding(.vertical)
            }
            .navigationTitle(L10n.Common.appName)
            .refreshable {
                await viewModel.refresh()
            }
            .task {
                await viewModel.loadReadingHistory()
            }
            .navigationDestination(item: $selectedEbookId) { id in
                BookDetailView(bookType: .ebook, bookId: id)
            }
            .navigationDestination(item: $selectedMagazineId) { id in
                BookDetailView(bookType: .magazine, bookId: id)
            }
        }
    }
}

struct ReadingHistoryCard: View {
    let entry: ReadingHistoryItem
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading) {
                BookCoverView(coverUrl: entry.coverUrl, title: entry.displayTitle)
                    .frame(width: 120, height: 160)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .shadow(radius: 2)

                VStack(alignment: .leading, spacing: 2) {
                    Text(entry.displayTitle)
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                        .lineLimit(2)

                    if let progress = entry.progress {
                        Text(String(format: "%.0f%%", progress * 100))
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .frame(width: 120)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct QuickAccessCard: View {
    let title: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)

            Text(title)
                .font(.caption)
                .foregroundColor(.primary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

#Preview {
    HomeView()
        .environmentObject(AuthManager.shared)
}
