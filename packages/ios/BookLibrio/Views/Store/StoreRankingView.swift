import SwiftUI

/// Full-screen ranking view showing top books
/// with different ranking categories (hot, new, trending)
struct StoreRankingView: View {
    @StateObject private var viewModel = StoreRankingViewModel()
    @Environment(\.dismiss) var dismiss
    @State private var selectedItem: StoreItem?

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Ranking type tabs
                rankingTabs

                // Content
                Group {
                    if viewModel.isLoading {
                        LoadingView()
                    } else if viewModel.items.isEmpty {
                        emptyState
                    } else {
                        rankingList
                    }
                }
            }
            .navigationTitle("排行榜")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("完成") { dismiss() }
                }
            }
            .task {
                await viewModel.loadRankings()
            }
            .navigationDestination(item: $selectedItem) { item in
                BookDetailView(
                    bookType: item.type == .ebook ? .ebook : .magazine,
                    bookId: item.itemId
                )
            }
        }
    }

    // MARK: - Ranking Type Tabs

    private var rankingTabs: some View {
        HStack(spacing: 0) {
            ForEach(RankingType.allCases) { type in
                RankingTabButton(
                    type: type,
                    isSelected: viewModel.selectedType == type
                ) {
                    viewModel.selectType(type)
                }
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(Color(.systemBackground))
        .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 2)
    }

    // MARK: - Ranking List

    private var rankingList: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(Array(viewModel.items.enumerated()), id: \.element.id) { index, item in
                    RankingRow(rank: index + 1, item: item) {
                        selectedItem = item
                    }

                    if index < viewModel.items.count - 1 {
                        Divider()
                            .padding(.leading, 72)
                    }
                }
            }
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .padding()
        }
        .refreshable {
            await viewModel.refresh()
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "chart.bar")
                .font(.system(size: 48))
                .foregroundColor(.secondary)

            Text("暂无排行数据")
                .font(.headline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Ranking Type

enum RankingType: String, CaseIterable, Identifiable {
    case hot = "hot"
    case newArrivals = "new"
    case trending = "trending"

    var id: String { rawValue }

    var title: String {
        switch self {
        case .hot: return "热门榜"
        case .newArrivals: return "新书榜"
        case .trending: return "飙升榜"
        }
    }

    var icon: String {
        switch self {
        case .hot: return "flame.fill"
        case .newArrivals: return "star.fill"
        case .trending: return "arrow.up.right"
        }
    }

    var color: Color {
        switch self {
        case .hot: return .orange
        case .newArrivals: return .blue
        case .trending: return .green
        }
    }
}

// MARK: - Ranking Tab Button

struct RankingTabButton: View {
    let type: RankingType
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 6) {
                HStack(spacing: 4) {
                    Image(systemName: type.icon)
                        .font(.subheadline)
                    Text(type.title)
                        .font(.subheadline)
                        .fontWeight(isSelected ? .semibold : .regular)
                }
                .foregroundColor(isSelected ? type.color : .secondary)

                Rectangle()
                    .fill(isSelected ? type.color : Color.clear)
                    .frame(height: 2)
            }
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Ranking Row

struct RankingRow: View {
    let rank: Int
    let item: StoreItem
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                // Rank badge
                rankBadge

                // Cover
                BookCoverView(coverUrl: item.coverUrl, title: item.title)
                    .frame(width: 50, height: 66)
                    .clipShape(RoundedRectangle(cornerRadius: 4))
                    .shadow(radius: 2)

                // Info
                VStack(alignment: .leading, spacing: 6) {
                    Text(item.title)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                        .lineLimit(2)

                    HStack(spacing: 8) {
                        if let subtitle = item.subtitle {
                            Text(subtitle)
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                        }
                    }

                    if let badge = item.badge {
                        Text(badge)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()

                // Arrow
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal)
            .padding(.vertical, 12)
        }
        .buttonStyle(.plain)
    }

    private var rankBadge: some View {
        ZStack {
            if rank <= 3 {
                Image(systemName: "seal.fill")
                    .font(.title)
                    .foregroundColor(rankColor)

                Text("\(rank)")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
            } else {
                Text("\(rank)")
                    .font(.title3)
                    .fontWeight(.semibold)
                    .foregroundColor(.secondary)
            }
        }
        .frame(width: 40)
    }

    private var rankColor: Color {
        switch rank {
        case 1: return Color(red: 1.0, green: 0.84, blue: 0.0) // Gold
        case 2: return Color(red: 0.75, green: 0.75, blue: 0.75) // Silver
        case 3: return Color(red: 0.8, green: 0.5, blue: 0.2) // Bronze
        default: return .secondary
        }
    }
}

// MARK: - ViewModel

@MainActor
class StoreRankingViewModel: ObservableObject {
    @Published var items: [StoreItem] = []
    @Published var selectedType: RankingType = .hot
    @Published var isLoading = false

    private let apiClient = APIClient.shared

    func loadRankings() async {
        await loadItems()
    }

    func selectType(_ type: RankingType) {
        selectedType = type
        Task {
            await loadItems()
        }
    }

    func refresh() async {
        await loadItems()
    }

    private func loadItems() async {
        isLoading = true

        do {
            // Load ebooks and magazines, then combine
            async let ebooksTask = apiClient.getEbooks(limit: 15)
            async let magazinesTask = apiClient.getMagazines(limit: 10)

            let (ebooks, magazines) = try await (ebooksTask, magazinesTask)

            var allItems = ebooks.data.map { StoreItem(from: $0) } +
                          magazines.data.map { StoreItem(from: $0) }

            // Shuffle differently based on ranking type to simulate different rankings
            switch selectedType {
            case .hot:
                allItems.shuffle()
            case .newArrivals:
                // Reverse for "new" feel
                allItems.reverse()
            case .trending:
                // Different shuffle seed
                allItems = allItems.shuffled()
            }

            items = Array(allItems.prefix(20))
        } catch {
            print("Failed to load rankings: \(error)")
        }

        isLoading = false
    }
}

#Preview {
    StoreRankingView()
}
