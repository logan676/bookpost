import SwiftUI

// MARK: - Shared Components

/// Ranking badge view (No.1, No.2...) with ribbon style
struct RankingBadgeView: View {
    let rank: Int

    var badgeColor: Color {
        switch rank {
        case 1: return Color(red: 0.85, green: 0.65, blue: 0.13) // Gold
        case 2: return Color(red: 0.75, green: 0.75, blue: 0.75) // Silver
        case 3: return Color(red: 0.80, green: 0.50, blue: 0.20) // Bronze
        default: return Color(red: 0.25, green: 0.25, blue: 0.25) // Dark Grey
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            Text("No.")
                .font(.system(size: 10, weight: .medium))
            Text("\(rank)")
                .font(.system(size: 18, weight: .bold))
        }
        .foregroundColor(.white)
        .frame(width: 36, height: 48)
        .background(
            Rectangle()
                .fill(badgeColor)
                .cornerRadius(4, corners: [.topLeft, .topRight])
                .padding(.bottom, 5)
                .overlay(
                    Rectangle()
                        .fill(badgeColor)
                        .frame(height: 10)
                        .rotationEffect(.degrees(45))
                        .offset(x: -10, y: 20),
                    alignment: .bottom
                )
                .overlay(
                    Rectangle()
                        .fill(badgeColor)
                        .frame(height: 10)
                        .rotationEffect(.degrees(-45))
                        .offset(x: 10, y: 20),
                    alignment: .bottom
                )
                .mask(Rectangle().padding(.bottom, -10))
        )
        .shadow(color: Color.black.opacity(0.2), radius: 2, x: 1, y: 1)
    }
}

/// Book card for platform sections
struct PlatformBookCardView: View {
    let ranking: ExternalRanking
    let index: Int
    let cardWidth: CGFloat = 140
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 12) {
                ZStack(alignment: .topLeading) {
                    // Book cover
                    if let coverUrl = ranking.previewCovers?.first {
                        AsyncImage(url: URL(string: coverUrl)) { phase in
                            switch phase {
                            case .success(let image):
                                image
                                    .resizable()
                                    .aspectRatio(2/3, contentMode: .fill)
                            case .failure:
                                bookPlaceholder
                            case .empty:
                                ProgressView()
                                    .frame(width: cardWidth, height: cardWidth * 1.5)
                            @unknown default:
                                bookPlaceholder
                            }
                        }
                        .frame(width: cardWidth, height: cardWidth * 1.5)
                        .cornerRadius(8)
                        .shadow(color: Color.black.opacity(0.15), radius: 6, x: 2, y: 4)
                    } else {
                        bookPlaceholder
                    }

                    // Ranking badge
                    RankingBadgeView(rank: index + 1)
                        .offset(x: -4, y: -4)
                }

                // Title and subtitle
                VStack(alignment: .leading, spacing: 4) {
                    Text(ranking.title)
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(.primary)
                        .lineLimit(2)
                        .fixedSize(horizontal: false, vertical: true)

                    if let subtitle = ranking.subtitle {
                        Text(subtitle)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                }
                .frame(width: cardWidth, alignment: .leading)
            }
        }
        .buttonStyle(PlainButtonStyle())
    }

    private var bookPlaceholder: some View {
        Rectangle()
            .fill(Color.gray.opacity(0.2))
            .overlay(
                Image(systemName: "book.closed.fill")
                    .resizable()
                    .scaledToFit()
                    .padding(30)
                    .foregroundColor(.gray)
            )
            .frame(width: cardWidth, height: cardWidth * 1.5)
            .cornerRadius(8)
            .shadow(color: Color.black.opacity(0.15), radius: 6, x: 2, y: 4)
    }
}

// MARK: - NYT Best Sellers Section

/// NYT branded header with cream background and serif font
struct NYTHeaderView: View {
    let onViewAll: () -> Void

    var body: some View {
        ZStack {
            Color(red: 0.96, green: 0.95, blue: 0.93)
                .edgesIgnoringSafeArea(.all)

            VStack(spacing: 8) {
                Text("The New York Times")
                    .font(.system(size: 26, weight: .black, design: .serif))
                    .foregroundColor(.black)
                    .multilineTextAlignment(.center)

                Text("Best Sellers")
                    .font(.system(size: 20, weight: .bold, design: .serif))
                    .foregroundColor(.black)

                Text(L10n.Store.nytSubtitle)
                    .font(.subheadline)
                    .foregroundColor(.gray)

                Button(action: onViewAll) {
                    HStack(spacing: 4) {
                        Text(L10n.Store.viewMore)
                        Image(systemName: "chevron.right")
                    }
                    .font(.footnote)
                    .fontWeight(.semibold)
                    .foregroundColor(.black)
                    .padding(.top, 4)
                }
            }
            .padding(.vertical, 24)
        }
        .frame(height: 180)
        .overlay(Divider(), alignment: .bottom)
    }
}

/// NYT Best Sellers section for store home
struct NYTBestSellersSection: View {
    let rankings: [ExternalRanking]
    let onRankingTap: (ExternalRanking) -> Void
    let onShowAll: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            NYTHeaderView(onViewAll: onShowAll)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 20) {
                    ForEach(Array(rankings.enumerated()), id: \.element.id) { index, ranking in
                        PlatformBookCardView(
                            ranking: ranking,
                            index: index,
                            onTap: { onRankingTap(ranking) }
                        )
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 24)
            }
            .background(Color(UIColor.systemBackground))
        }
        .background(Color(UIColor.systemBackground))
    }
}

// MARK: - Amazon Best Books Section

/// Amazon branded header with orange accent
struct AmazonHeaderView: View {
    let onViewAll: () -> Void

    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.13, green: 0.11, blue: 0.10),
                    Color(red: 0.20, green: 0.18, blue: 0.16)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .edgesIgnoringSafeArea(.all)

            VStack(spacing: 8) {
                HStack(spacing: 8) {
                    Text("amazon")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(.white)

                    Image(systemName: "arrow.right")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(Color.orange)
                        .offset(y: 4)
                }

                Text("Best Books of the Year")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(.white)

                Text(L10n.Store.amazonSubtitle)
                    .font(.subheadline)
                    .foregroundColor(.gray)

                Button(action: onViewAll) {
                    HStack(spacing: 4) {
                        Text(L10n.Store.viewMore)
                        Image(systemName: "chevron.right")
                    }
                    .font(.footnote)
                    .fontWeight(.semibold)
                    .foregroundColor(.orange)
                    .padding(.top, 4)
                }
            }
            .padding(.vertical, 24)
        }
        .frame(height: 180)
    }
}

/// Amazon Best Books section for store home
struct AmazonBestBooksSection: View {
    let rankings: [ExternalRanking]
    let onRankingTap: (ExternalRanking) -> Void
    let onShowAll: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            AmazonHeaderView(onViewAll: onShowAll)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 20) {
                    ForEach(Array(rankings.enumerated()), id: \.element.id) { index, ranking in
                        PlatformBookCardView(
                            ranking: ranking,
                            index: index,
                            onTap: { onRankingTap(ranking) }
                        )
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 24)
            }
            .background(Color(UIColor.systemBackground))
        }
        .background(Color(UIColor.systemBackground))
    }
}

// MARK: - Goodreads Choice Section

/// Goodreads branded header with brown accent
struct GoodreadsHeaderView: View {
    let onViewAll: () -> Void

    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.24, green: 0.16, blue: 0.10),
                    Color(red: 0.35, green: 0.25, blue: 0.18)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .edgesIgnoringSafeArea(.all)

            VStack(spacing: 8) {
                HStack(spacing: 8) {
                    Image(systemName: "book.fill")
                        .font(.system(size: 24))
                        .foregroundColor(Color(red: 0.55, green: 0.40, blue: 0.25))

                    Text("goodreads")
                        .font(.system(size: 28, weight: .bold, design: .serif))
                        .foregroundColor(.white)
                }

                Text("Choice Awards")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(.white)

                Text(L10n.Store.goodreadsSubtitle)
                    .font(.subheadline)
                    .foregroundColor(.gray)

                Button(action: onViewAll) {
                    HStack(spacing: 4) {
                        Text(L10n.Store.viewMore)
                        Image(systemName: "chevron.right")
                    }
                    .font(.footnote)
                    .fontWeight(.semibold)
                    .foregroundColor(Color(red: 0.55, green: 0.40, blue: 0.25))
                    .padding(.top, 4)
                }
            }
            .padding(.vertical, 24)
        }
        .frame(height: 180)
    }
}

/// Goodreads Choice section for store home
struct GoodreadsChoiceSection: View {
    let rankings: [ExternalRanking]
    let onRankingTap: (ExternalRanking) -> Void
    let onShowAll: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            GoodreadsHeaderView(onViewAll: onShowAll)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 20) {
                    ForEach(Array(rankings.enumerated()), id: \.element.id) { index, ranking in
                        PlatformBookCardView(
                            ranking: ranking,
                            index: index,
                            onTap: { onRankingTap(ranking) }
                        )
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 24)
            }
            .background(Color(UIColor.systemBackground))
        }
        .background(Color(UIColor.systemBackground))
    }
}

// MARK: - Platform List View (Full List)

enum Platform: String, CaseIterable {
    case nyt
    case amazon
    case goodreads

    var title: String {
        switch self {
        case .nyt: return L10n.Store.nytTitle
        case .amazon: return L10n.Store.amazonTitle
        case .goodreads: return L10n.Store.goodreadsTitle
        }
    }

    var description: String {
        switch self {
        case .nyt: return L10n.Store.nytDescription
        case .amazon: return L10n.Store.amazonDescription
        case .goodreads: return L10n.Store.goodreadsDescription
        }
    }

    var headerColor: Color {
        switch self {
        case .nyt: return Color(red: 0.96, green: 0.95, blue: 0.93)
        case .amazon: return Color(red: 0.13, green: 0.11, blue: 0.10)
        case .goodreads: return Color(red: 0.24, green: 0.16, blue: 0.10)
        }
    }

    var accentColor: Color {
        switch self {
        case .nyt: return .black
        case .amazon: return .orange
        case .goodreads: return Color(red: 0.55, green: 0.40, blue: 0.25)
        }
    }
}

/// Full list view for a specific platform
struct PlatformListView: View {
    let platform: Platform
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel: PlatformListViewModel
    @State private var selectedRanking: ExternalRanking?

    init(platform: Platform) {
        self.platform = platform
        self._viewModel = StateObject(wrappedValue: PlatformListViewModel(platform: platform))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    // Header
                    platformHeader

                    // Description card
                    descriptionCard

                    // Rankings grid
                    rankingsGrid
                }
            }
            .background(Color(UIColor.systemGroupedBackground))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(L10n.Store.done) {
                        dismiss()
                    }
                }
            }
            .sheet(item: $selectedRanking) { ranking in
                ExternalRankingDetailView(ranking: ranking)
            }
            .task {
                await viewModel.loadData()
            }
        }
    }

    private var platformHeader: some View {
        Group {
            switch platform {
            case .nyt:
                ZStack {
                    platform.headerColor
                    VStack(spacing: 8) {
                        Text("The New York Times")
                            .font(.system(size: 28, weight: .black, design: .serif))
                            .foregroundColor(.black)
                        Text("Best Sellers")
                            .font(.system(size: 22, weight: .bold, design: .serif))
                            .foregroundColor(.black)
                    }
                    .padding(.vertical, 32)
                }
                .frame(height: 140)
            case .amazon:
                ZStack {
                    LinearGradient(
                        gradient: Gradient(colors: [
                            Color(red: 0.13, green: 0.11, blue: 0.10),
                            Color(red: 0.20, green: 0.18, blue: 0.16)
                        ]),
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                    VStack(spacing: 8) {
                        HStack(spacing: 8) {
                            Text("amazon")
                                .font(.system(size: 30, weight: .bold))
                                .foregroundColor(.white)
                            Image(systemName: "arrow.right")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(.orange)
                                .offset(y: 4)
                        }
                        Text("Best Books")
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundColor(.white)
                    }
                    .padding(.vertical, 32)
                }
                .frame(height: 140)
            case .goodreads:
                ZStack {
                    LinearGradient(
                        gradient: Gradient(colors: [
                            Color(red: 0.24, green: 0.16, blue: 0.10),
                            Color(red: 0.35, green: 0.25, blue: 0.18)
                        ]),
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                    VStack(spacing: 8) {
                        HStack(spacing: 8) {
                            Image(systemName: "book.fill")
                                .font(.system(size: 26))
                                .foregroundColor(Color(red: 0.55, green: 0.40, blue: 0.25))
                            Text("goodreads")
                                .font(.system(size: 30, weight: .bold, design: .serif))
                                .foregroundColor(.white)
                        }
                        Text("Choice Awards")
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundColor(.white)
                    }
                    .padding(.vertical, 32)
                }
                .frame(height: 140)
            }
        }
    }

    private var descriptionCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(platform.description)
                .font(.body)
                .foregroundColor(.secondary)
                .fixedSize(horizontal: false, vertical: true)

            if viewModel.total > 0 {
                Text(L10n.Store.platformListsCount(viewModel.total))
                    .font(.footnote)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(12)
        .padding(.horizontal)
        .padding(.top, -20)
        .offset(y: -20)
    }

    private var rankingsGrid: some View {
        LazyVStack(spacing: 12) {
            ForEach(Array(viewModel.rankings.enumerated()), id: \.element.id) { index, ranking in
                PlatformRankingRow(ranking: ranking, index: index, accentColor: platform.accentColor) {
                    selectedRanking = ranking
                }
            }
        }
        .padding(.horizontal)
        .padding(.top, 8)
    }
}

struct PlatformRankingRow: View {
    let ranking: ExternalRanking
    let index: Int
    let accentColor: Color
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 16) {
                // Rank number
                Text("\(index + 1)")
                    .font(.system(size: 20, weight: .bold, design: .rounded))
                    .foregroundColor(index < 3 ? accentColor : .secondary)
                    .frame(width: 30)

                // Preview covers
                HStack(spacing: -12) {
                    ForEach(Array((ranking.previewCovers ?? []).prefix(3).enumerated()), id: \.offset) { _, url in
                        AsyncImage(url: URL(string: url)) { phase in
                            switch phase {
                            case .success(let image):
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            default:
                                Rectangle()
                                    .fill(Color.gray.opacity(0.2))
                            }
                        }
                        .frame(width: 44, height: 66)
                        .cornerRadius(4)
                        .overlay(
                            RoundedRectangle(cornerRadius: 4)
                                .stroke(Color.white, lineWidth: 2)
                        )
                    }
                }
                .frame(width: 76)

                // Title and info
                VStack(alignment: .leading, spacing: 4) {
                    Text(ranking.title)
                        .font(.headline)
                        .foregroundColor(.primary)
                        .lineLimit(2)

                    if let subtitle = ranking.subtitle {
                        Text(subtitle)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }

                    if let count = ranking.bookCount, count > 0 {
                        Text(L10n.Store.bookCount(count))
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .foregroundColor(.secondary)
            }
            .padding()
            .background(Color(UIColor.secondarySystemGroupedBackground))
            .cornerRadius(12)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

@MainActor
class PlatformListViewModel: ObservableObject {
    @Published var rankings: [ExternalRanking] = []
    @Published var total: Int = 0
    @Published var isLoading = false

    private let platform: Platform
    private let apiClient = APIClient.shared

    init(platform: Platform) {
        self.platform = platform
    }

    func loadData() async {
        isLoading = true
        do {
            switch platform {
            case .nyt:
                let response = try await apiClient.getNYTLists(limit: 50)
                rankings = response.data
                total = response.total
            case .amazon:
                let response = try await apiClient.getAmazonLists(limit: 50)
                rankings = response.data
                total = response.total
            case .goodreads:
                let response = try await apiClient.getGoodreadsLists(limit: 50)
                rankings = response.data
                total = response.total
            }
        } catch {
            Log.e("Failed to load \(platform.rawValue) lists: \(error)")
        }
        isLoading = false
    }
}

// MARK: - Preview

#Preview {
    ScrollView {
        VStack(spacing: 24) {
            NYTBestSellersSection(
                rankings: [],
                onRankingTap: { _ in },
                onShowAll: { }
            )

            AmazonBestBooksSection(
                rankings: [],
                onRankingTap: { _ in },
                onShowAll: { }
            )

            GoodreadsChoiceSection(
                rankings: [],
                onRankingTap: { _ in },
                onShowAll: { }
            )
        }
    }
}
