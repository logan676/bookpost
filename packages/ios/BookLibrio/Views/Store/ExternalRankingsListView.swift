import SwiftUI

/// External Rankings list view - shows all platform lists (NYT, Amazon, Goodreads, etc.)
/// with immersive header design
struct ExternalRankingsListView: View {
    @StateObject private var viewModel = ExternalRankingsListViewModel()
    @State private var selectedRanking: ExternalRanking?
    @Environment(\.dismiss) private var dismiss

    // Color palette for ranking cards
    private let cardColors: [Color] = [
        Color(red: 0.2, green: 0.3, blue: 0.5),   // Deep blue
        Color(red: 0.4, green: 0.25, blue: 0.35), // Plum
        Color(red: 0.25, green: 0.35, blue: 0.3), // Teal
        Color(red: 0.35, green: 0.3, blue: 0.2),  // Olive
        Color(red: 0.3, green: 0.2, blue: 0.4),   // Purple
    ]

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.rankings.isEmpty {
                    ProgressView(L10n.Store.loading)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if !viewModel.rankings.isEmpty {
                    mainContent
                } else if let error = viewModel.errorMessage {
                    ContentUnavailableView(
                        L10n.Store.failedToLoad,
                        systemImage: "exclamationmark.triangle",
                        description: Text(error)
                    )
                } else {
                    ContentUnavailableView(
                        L10n.Store.noBooks,
                        systemImage: "chart.bar.xaxis",
                        description: Text(L10n.Store.noBooksYet)
                    )
                }
            }
            .task {
                await viewModel.loadRankings()
            }
            .sheet(item: $selectedRanking) { ranking in
                ExternalRankingDetailView(ranking: ranking)
            }
        }
    }

    // MARK: - Main Content

    private var mainContent: some View {
        ScrollView {
            VStack(spacing: 0) {
                // 1. Immersive Header
                immersiveHeader

                // Content Body
                VStack(alignment: .leading, spacing: 24) {
                    // 2. Description Card (Overlapping Header)
                    descriptionCard
                        .offset(y: -30)

                    // 3. Rankings Grid
                    rankingsGrid
                        .padding(.horizontal, 16)

                    Spacer(minLength: 50)
                }
                .background(Color(UIColor.systemBackground))
            }
        }
        .edgesIgnoringSafeArea(.top)
        .navigationBarBackButtonHidden(true)
        .overlay(
            Button(action: { dismiss() }) {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 32))
                    .foregroundStyle(.white.opacity(0.9), .black.opacity(0.3))
                    .padding(.trailing, 20)
                    .padding(.top, 50)
            },
            alignment: .topTrailing
        )
        .refreshable {
            await viewModel.refresh()
        }
    }

    // MARK: - Immersive Header

    private var immersiveHeader: some View {
        ZStack(alignment: .bottom) {
            // Background gradient
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.1, green: 0.15, blue: 0.25),
                    Color(red: 0.2, green: 0.25, blue: 0.35),
                    Color(red: 0.15, green: 0.2, blue: 0.3)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .frame(height: 280)

            // Decorative elements
            GeometryReader { geo in
                // Floating book icons
                ForEach(0..<5, id: \.self) { index in
                    Image(systemName: "book.closed.fill")
                        .font(.system(size: CGFloat.random(in: 20...40)))
                        .foregroundColor(.white.opacity(0.1))
                        .offset(
                            x: CGFloat.random(in: 0...geo.size.width),
                            y: CGFloat.random(in: 50...200)
                        )
                }
            }
            .frame(height: 280)

            // Title area
            HStack {
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 12) {
                        Image(systemName: "chart.bar.xaxis")
                            .font(.title2)
                            .foregroundColor(.white.opacity(0.8))

                        Text(L10n.Store.externalRankings)
                            .font(.system(size: 34, weight: .heavy))
                            .foregroundColor(.white)
                    }

                    Text(L10n.Store.platformListsSubtitle)
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.8))
                }
                Spacer()
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 45)
        }
        .zIndex(1)
    }

    // MARK: - Description Card

    private var descriptionCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                // Platform logos placeholder
                HStack(spacing: -8) {
                    platformBadge(name: "NYT", color: .black)
                    platformBadge(name: "AMZ", color: .orange)
                    platformBadge(name: "GR", color: Color(red: 0.4, green: 0.3, blue: 0.2))
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(L10n.Store.platformListsTitle)
                        .font(.headline)
                        .fontWeight(.bold)

                    Text(L10n.Store.platformListsCount(viewModel.rankings.count))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            Text(L10n.Store.platformListsDescription)
                .font(.subheadline)
                .foregroundColor(.primary.opacity(0.85))
                .lineSpacing(4)
        }
        .padding(20)
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.1), radius: 10, y: 5)
        .padding(.horizontal, 20)
    }

    private func platformBadge(name: String, color: Color) -> some View {
        Text(name)
            .font(.system(size: 10, weight: .bold))
            .foregroundColor(.white)
            .frame(width: 32, height: 32)
            .background(color)
            .clipShape(Circle())
            .overlay(
                Circle()
                    .stroke(Color.white, lineWidth: 2)
            )
    }

    // MARK: - Rankings Grid

    private var rankingsGrid: some View {
        LazyVStack(spacing: 16) {
            ForEach(Array(viewModel.rankings.enumerated()), id: \.element.id) { index, ranking in
                rankingListItem(ranking: ranking, index: index)
            }
        }
    }

    private func rankingListItem(ranking: ExternalRanking, index: Int) -> some View {
        Button {
            selectedRanking = ranking
        } label: {
            HStack(spacing: 16) {
                // Left: Stacked book covers
                ZStack {
                    if let covers = ranking.previewCovers, !covers.isEmpty {
                        ForEach(Array(covers.prefix(3).reversed().enumerated()), id: \.offset) { idx, coverUrl in
                            AsyncImage(url: R2Config.convertToPublicURL(coverUrl)) { phase in
                                switch phase {
                                case .success(let image):
                                    image
                                        .resizable()
                                        .aspectRatio(2/3, contentMode: .fill)
                                case .failure, .empty:
                                    Rectangle()
                                        .fill(Color.gray.opacity(0.3))
                                @unknown default:
                                    Rectangle()
                                        .fill(Color.gray.opacity(0.3))
                                }
                            }
                            .frame(width: 50, height: 70)
                            .cornerRadius(4)
                            .offset(x: CGFloat(idx) * 6, y: CGFloat(idx) * -3)
                            .shadow(color: Color.black.opacity(0.1), radius: 2, x: 0, y: 1)
                        }
                    } else {
                        Rectangle()
                            .fill(cardColors[index % cardColors.count].opacity(0.3))
                            .frame(width: 50, height: 70)
                            .cornerRadius(4)
                            .overlay(
                                Image(systemName: "book.closed")
                                    .foregroundColor(.gray)
                            )
                    }
                }
                .frame(width: 70, height: 80)

                // Middle: Info
                VStack(alignment: .leading, spacing: 6) {
                    // Source badge
                    HStack(spacing: 6) {
                        if let logoUrl = ranking.sourceLogoUrl, let url = URL(string: logoUrl) {
                            AsyncImage(url: url) { phase in
                                switch phase {
                                case .success(let image):
                                    image
                                        .resizable()
                                        .scaledToFit()
                                        .frame(height: 16)
                                default:
                                    Text(ranking.displaySourceName)
                                        .font(.caption2)
                                        .fontWeight(.bold)
                                        .foregroundColor(.white)
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(cardColors[index % cardColors.count])
                                        .cornerRadius(4)
                                }
                            }
                        } else {
                            Text(ranking.displaySourceName)
                                .font(.caption2)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(cardColors[index % cardColors.count])
                                .cornerRadius(4)
                        }
                    }

                    Text(ranking.title)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.primary)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)

                    HStack(spacing: 12) {
                        if let bookCount = ranking.bookCount {
                            Label(L10n.Store.booksCountLabel(bookCount), systemImage: "book.closed")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }

                        if let lastUpdated = ranking.formattedLastUpdated {
                            Text(lastUpdated)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }

                Spacer()

                // Right: Chevron
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding(16)
            .background(Color(UIColor.secondarySystemBackground))
            .cornerRadius(12)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - ViewModel

@MainActor
class ExternalRankingsListViewModel: ObservableObject {
    @Published var rankings: [ExternalRanking] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let apiClient = APIClient.shared

    func loadRankings() async {
        guard !isLoading else { return }

        isLoading = true
        errorMessage = nil

        do {
            let response = try await apiClient.getExternalRankings(bookType: "ebook")
            rankings = response.data
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func refresh() async {
        await loadRankings()
    }
}

// MARK: - Preview

#Preview {
    ExternalRankingsListView()
}
