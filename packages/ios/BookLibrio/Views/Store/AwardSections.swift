import SwiftUI

// MARK: - Award Enum

enum Award: String, CaseIterable {
    case pulitzer
    case booker
    case newbery

    var title: String {
        switch self {
        case .pulitzer: return L10n.Store.pulitzerTitle
        case .booker: return L10n.Store.bookerTitle
        case .newbery: return L10n.Store.newberyTitle
        }
    }

    var description: String {
        switch self {
        case .pulitzer: return L10n.Store.pulitzerDescription
        case .booker: return L10n.Store.bookerDescription
        case .newbery: return L10n.Store.newberyDescription
        }
    }

    var headerGradient: [Color] {
        switch self {
        case .pulitzer:
            return [
                Color(red: 0.75, green: 0.60, blue: 0.20),
                Color(red: 0.85, green: 0.70, blue: 0.30)
            ]
        case .booker:
            return [
                Color(red: 0.10, green: 0.20, blue: 0.40),
                Color(red: 0.15, green: 0.30, blue: 0.55)
            ]
        case .newbery:
            return [
                Color(red: 0.15, green: 0.45, blue: 0.35),
                Color(red: 0.20, green: 0.55, blue: 0.45)
            ]
        }
    }

    var accentColor: Color {
        switch self {
        case .pulitzer: return Color(red: 0.85, green: 0.70, blue: 0.30)
        case .booker: return Color(red: 0.70, green: 0.55, blue: 0.25)
        case .newbery: return Color(red: 0.85, green: 0.65, blue: 0.20)
        }
    }

    var icon: String {
        switch self {
        case .pulitzer: return "medal.fill"
        case .booker: return "book.closed.fill"
        case .newbery: return "star.circle.fill"
        }
    }
}

// MARK: - Award Book Card View

struct AwardBookCardView: View {
    let ranking: ExternalRanking
    let index: Int
    let award: Award
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

                    // Award badge
                    AwardBadgeView(award: award, index: index)
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

// MARK: - Award Badge View

struct AwardBadgeView: View {
    let award: Award
    let index: Int

    var badgeColor: Color {
        switch index {
        case 0: return Color(red: 0.85, green: 0.65, blue: 0.13) // Gold
        case 1: return Color(red: 0.75, green: 0.75, blue: 0.75) // Silver
        case 2: return Color(red: 0.80, green: 0.50, blue: 0.20) // Bronze
        default: return Color(red: 0.35, green: 0.35, blue: 0.35)
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            Image(systemName: award.icon)
                .font(.system(size: 12, weight: .bold))
            Text("\(index + 1)")
                .font(.system(size: 14, weight: .bold))
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

// MARK: - Pulitzer Prize Section

struct PulitzerHeaderView: View {
    let onViewAll: () -> Void

    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.75, green: 0.60, blue: 0.20),
                    Color(red: 0.85, green: 0.70, blue: 0.30)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .edgesIgnoringSafeArea(.all)

            VStack(spacing: 8) {
                Image(systemName: "medal.fill")
                    .font(.system(size: 32))
                    .foregroundColor(.white)

                Text("Pulitzer Prize")
                    .font(.system(size: 26, weight: .bold, design: .serif))
                    .foregroundColor(.white)

                Text(L10n.Store.pulitzerSubtitle)
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.8))

                Button(action: onViewAll) {
                    HStack(spacing: 4) {
                        Text(L10n.Store.viewMore)
                        Image(systemName: "chevron.right")
                    }
                    .font(.footnote)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .padding(.top, 4)
                }
            }
            .padding(.vertical, 24)
        }
        .frame(height: 200)
    }
}

struct PulitzerPrizeSection: View {
    let rankings: [ExternalRanking]
    let onRankingTap: (ExternalRanking) -> Void
    let onShowAll: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            PulitzerHeaderView(onViewAll: onShowAll)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 20) {
                    ForEach(Array(rankings.enumerated()), id: \.element.id) { index, ranking in
                        AwardBookCardView(
                            ranking: ranking,
                            index: index,
                            award: .pulitzer,
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

// MARK: - Booker Prize Section

struct BookerHeaderView: View {
    let onViewAll: () -> Void

    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.10, green: 0.20, blue: 0.40),
                    Color(red: 0.15, green: 0.30, blue: 0.55)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .edgesIgnoringSafeArea(.all)

            VStack(spacing: 8) {
                Image(systemName: "book.closed.fill")
                    .font(.system(size: 32))
                    .foregroundColor(Color(red: 0.85, green: 0.70, blue: 0.30))

                Text("Booker Prize")
                    .font(.system(size: 26, weight: .bold, design: .serif))
                    .foregroundColor(.white)

                Text(L10n.Store.bookerSubtitle)
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.8))

                Button(action: onViewAll) {
                    HStack(spacing: 4) {
                        Text(L10n.Store.viewMore)
                        Image(systemName: "chevron.right")
                    }
                    .font(.footnote)
                    .fontWeight(.semibold)
                    .foregroundColor(Color(red: 0.85, green: 0.70, blue: 0.30))
                    .padding(.top, 4)
                }
            }
            .padding(.vertical, 24)
        }
        .frame(height: 200)
    }
}

struct BookerPrizeSection: View {
    let rankings: [ExternalRanking]
    let onRankingTap: (ExternalRanking) -> Void
    let onShowAll: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            BookerHeaderView(onViewAll: onShowAll)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 20) {
                    ForEach(Array(rankings.enumerated()), id: \.element.id) { index, ranking in
                        AwardBookCardView(
                            ranking: ranking,
                            index: index,
                            award: .booker,
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

// MARK: - Newbery Medal Section

struct NewberyHeaderView: View {
    let onViewAll: () -> Void

    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.15, green: 0.45, blue: 0.35),
                    Color(red: 0.20, green: 0.55, blue: 0.45)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .edgesIgnoringSafeArea(.all)

            VStack(spacing: 8) {
                Image(systemName: "star.circle.fill")
                    .font(.system(size: 32))
                    .foregroundColor(Color(red: 0.90, green: 0.75, blue: 0.30))

                Text("Newbery Medal")
                    .font(.system(size: 26, weight: .bold, design: .serif))
                    .foregroundColor(.white)

                Text(L10n.Store.newberySubtitle)
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.8))

                Button(action: onViewAll) {
                    HStack(spacing: 4) {
                        Text(L10n.Store.viewMore)
                        Image(systemName: "chevron.right")
                    }
                    .font(.footnote)
                    .fontWeight(.semibold)
                    .foregroundColor(Color(red: 0.90, green: 0.75, blue: 0.30))
                    .padding(.top, 4)
                }
            }
            .padding(.vertical, 24)
        }
        .frame(height: 200)
    }
}

struct NewberyMedalSection: View {
    let rankings: [ExternalRanking]
    let onRankingTap: (ExternalRanking) -> Void
    let onShowAll: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            NewberyHeaderView(onViewAll: onShowAll)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 20) {
                    ForEach(Array(rankings.enumerated()), id: \.element.id) { index, ranking in
                        AwardBookCardView(
                            ranking: ranking,
                            index: index,
                            award: .newbery,
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

// MARK: - Award List View (Full List)

struct AwardListView: View {
    let award: Award
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel: AwardListViewModel
    @State private var selectedRanking: ExternalRanking?

    init(award: Award) {
        self.award = award
        self._viewModel = StateObject(wrappedValue: AwardListViewModel(award: award))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    // Header
                    awardHeader

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

    private var awardHeader: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: award.headerGradient),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            VStack(spacing: 8) {
                Image(systemName: award.icon)
                    .font(.system(size: 36))
                    .foregroundColor(award == .pulitzer ? .white : award.accentColor)

                Text(award.title)
                    .font(.system(size: 28, weight: .bold, design: .serif))
                    .foregroundColor(.white)
            }
            .padding(.vertical, 32)
        }
        .frame(height: 160)
    }

    private var descriptionCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(award.description)
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
                AwardRankingRow(ranking: ranking, index: index, award: award) {
                    selectedRanking = ranking
                }
            }
        }
        .padding(.horizontal)
        .padding(.top, 8)
    }
}

struct AwardRankingRow: View {
    let ranking: ExternalRanking
    let index: Int
    let award: Award
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 16) {
                // Rank number
                Text("\(index + 1)")
                    .font(.system(size: 20, weight: .bold, design: .rounded))
                    .foregroundColor(index < 3 ? award.accentColor : .secondary)
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
class AwardListViewModel: ObservableObject {
    @Published var rankings: [ExternalRanking] = []
    @Published var total: Int = 0
    @Published var isLoading = false

    private let award: Award
    private let apiClient = APIClient.shared

    init(award: Award) {
        self.award = award
    }

    func loadData() async {
        isLoading = true
        do {
            switch award {
            case .pulitzer:
                let response = try await apiClient.getPulitzerAwards(limit: 50)
                rankings = response.data
                total = response.total
            case .booker:
                let response = try await apiClient.getBookerAwards(limit: 50)
                rankings = response.data
                total = response.total
            case .newbery:
                let response = try await apiClient.getNewberyAwards(limit: 50)
                rankings = response.data
                total = response.total
            }
        } catch {
            Log.e("Failed to load \(award.rawValue) awards: \(error)")
        }
        isLoading = false
    }
}

// MARK: - Preview

#Preview {
    ScrollView {
        VStack(spacing: 24) {
            PulitzerPrizeSection(
                rankings: [],
                onRankingTap: { _ in },
                onShowAll: { }
            )

            BookerPrizeSection(
                rankings: [],
                onRankingTap: { _ in },
                onShowAll: { }
            )

            NewberyMedalSection(
                rankings: [],
                onRankingTap: { _ in },
                onShowAll: { }
            )
        }
    }
}
