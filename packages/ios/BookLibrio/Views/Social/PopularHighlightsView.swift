import SwiftUI

/// View showing popular/trending highlights across the platform
/// Displays community highlights with engagement stats and book context
struct PopularHighlightsView: View {
    @State private var highlights: [PopularHighlight] = PopularHighlight.sampleData
    @State private var selectedTimeRange: TimeRange = .week
    @State private var selectedCategory: HighlightCategory = .all
    @State private var isLoading = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Time range picker
                timeRangePicker

                // Category filter
                categoryFilter

                // Highlights list
                if isLoading {
                    loadingView
                } else if filteredHighlights.isEmpty {
                    emptyState
                } else {
                    highlightsList
                }
            }
            .navigationTitle("热门划线")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        refreshData()
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
        }
    }

    // MARK: - Time Range Picker

    private var timeRangePicker: some View {
        Picker("时间范围", selection: $selectedTimeRange) {
            ForEach(TimeRange.allCases, id: \.self) { range in
                Text(range.displayName).tag(range)
            }
        }
        .pickerStyle(.segmented)
        .padding()
    }

    // MARK: - Category Filter

    private var categoryFilter: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(HighlightCategory.allCases, id: \.self) { category in
                    categoryChip(category)
                }
            }
            .padding(.horizontal)
        }
        .padding(.bottom, 8)
    }

    private func categoryChip(_ category: HighlightCategory) -> some View {
        let isSelected = selectedCategory == category

        return Button {
            withAnimation {
                selectedCategory = category
            }
        } label: {
            HStack(spacing: 4) {
                if let icon = category.iconName {
                    Image(systemName: icon)
                        .font(.caption)
                }
                Text(category.displayName)
                    .font(.subheadline)
            }
            .foregroundColor(isSelected ? .white : .primary)
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(isSelected ? Color.blue : Color(.systemGray6))
            .cornerRadius(20)
        }
    }

    // MARK: - Highlights List

    private var filteredHighlights: [PopularHighlight] {
        if selectedCategory == .all {
            return highlights
        }
        return highlights.filter { $0.category == selectedCategory }
    }

    private var highlightsList: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                ForEach(Array(filteredHighlights.enumerated()), id: \.element.id) { index, highlight in
                    highlightCard(highlight, rank: index + 1)
                }
            }
            .padding()
        }
    }

    private func highlightCard(_ highlight: PopularHighlight, rank: Int) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header with rank and book info
            HStack(spacing: 12) {
                // Rank badge
                rankBadge(rank)

                // Book cover
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color(.systemGray5))
                    .frame(width: 40, height: 54)
                    .overlay(
                        Image(systemName: "book.fill")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    )

                // Book info
                VStack(alignment: .leading, spacing: 2) {
                    Text(highlight.bookTitle)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .lineLimit(1)

                    Text(highlight.author)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                // Category tag
                if highlight.category != .all {
                    Text(highlight.category.displayName)
                        .font(.caption2)
                        .foregroundColor(highlight.category.color)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(highlight.category.color.opacity(0.1))
                        .cornerRadius(4)
                }
            }

            // Highlight content
            Text(highlight.content)
                .font(.body)
                .lineSpacing(6)
                .foregroundColor(.primary)
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color.yellow.opacity(0.1))
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(Color.yellow.opacity(0.3), lineWidth: 1)
                        )
                )

            // Chapter info
            if let chapter = highlight.chapterTitle {
                HStack(spacing: 4) {
                    Image(systemName: "bookmark.fill")
                        .font(.caption2)
                    Text(chapter)
                        .font(.caption)
                }
                .foregroundColor(.secondary)
            }

            // Engagement stats
            HStack(spacing: 20) {
                engagementStat(icon: "person.2.fill", value: highlight.highlighterCount, label: "人划线")
                engagementStat(icon: "heart.fill", value: highlight.likeCount, label: "赞")
                engagementStat(icon: "bubble.right.fill", value: highlight.noteCount, label: "笔记")

                Spacer()

                // Actions
                HStack(spacing: 16) {
                    Button {
                        // Like
                    } label: {
                        Image(systemName: highlight.isLiked ? "heart.fill" : "heart")
                            .foregroundColor(highlight.isLiked ? .red : .secondary)
                    }

                    Button {
                        // Share
                    } label: {
                        Image(systemName: "square.and.arrow.up")
                            .foregroundColor(.secondary)
                    }

                    Button {
                        // Add to my highlights
                    } label: {
                        Image(systemName: "plus.circle")
                            .foregroundColor(.blue)
                    }
                }
                .font(.body)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
    }

    private func rankBadge(_ rank: Int) -> some View {
        ZStack {
            Circle()
                .fill(rankColor(rank))
                .frame(width: 28, height: 28)

            if rank <= 3 {
                Image(systemName: "crown.fill")
                    .font(.caption2)
                    .foregroundColor(.white)
            } else {
                Text("\(rank)")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
            }
        }
    }

    private func rankColor(_ rank: Int) -> Color {
        switch rank {
        case 1: return .yellow
        case 2: return .gray
        case 3: return .orange
        default: return .blue.opacity(0.7)
        }
    }

    private func engagementStat(icon: String, value: Int, label: String) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.caption)
            Text("\(value) \(label)")
                .font(.caption)
        }
        .foregroundColor(.secondary)
    }

    // MARK: - Loading & Empty States

    private var loadingView: some View {
        VStack(spacing: 16) {
            Spacer()
            ProgressView()
            Text("加载中...")
                .font(.subheadline)
                .foregroundColor(.secondary)
            Spacer()
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Spacer()

            Image(systemName: "highlighter")
                .font(.system(size: 50))
                .foregroundColor(.secondary)

            Text("暂无热门划线")
                .font(.headline)
                .foregroundColor(.secondary)

            Text("开始阅读并划线，你的精彩发现可能会出现在这里")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)

            Spacer()
        }
    }

    // MARK: - Actions

    private func refreshData() {
        isLoading = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            isLoading = false
        }
    }
}

// MARK: - Time Range

enum TimeRange: String, CaseIterable {
    case day
    case week
    case month
    case all

    var displayName: String {
        switch self {
        case .day: return "今天"
        case .week: return "本周"
        case .month: return "本月"
        case .all: return "全部"
        }
    }
}

// MARK: - Highlight Category

enum HighlightCategory: String, CaseIterable {
    case all
    case philosophy
    case literature
    case business
    case science
    case history
    case psychology

    var displayName: String {
        switch self {
        case .all: return "全部"
        case .philosophy: return "哲学"
        case .literature: return "文学"
        case .business: return "商业"
        case .science: return "科学"
        case .history: return "历史"
        case .psychology: return "心理"
        }
    }

    var iconName: String? {
        switch self {
        case .all: return nil
        case .philosophy: return "brain.head.profile"
        case .literature: return "text.book.closed"
        case .business: return "briefcase"
        case .science: return "atom"
        case .history: return "clock.arrow.circlepath"
        case .psychology: return "heart.text.square"
        }
    }

    var color: Color {
        switch self {
        case .all: return .blue
        case .philosophy: return .purple
        case .literature: return .orange
        case .business: return .green
        case .science: return .blue
        case .history: return .brown
        case .psychology: return .pink
        }
    }
}

// MARK: - Popular Highlight Model

struct PopularHighlight: Identifiable {
    let id: String
    let content: String
    let bookTitle: String
    let author: String
    let chapterTitle: String?
    let category: HighlightCategory
    let highlighterCount: Int
    let likeCount: Int
    let noteCount: Int
    var isLiked: Bool
    let createdAt: Date
}

// MARK: - Sample Data

extension PopularHighlight {
    static let sampleData: [PopularHighlight] = [
        PopularHighlight(
            id: "1",
            content: "人类之所以能够超越其他动物，是因为我们能够创造并相信共同的虚构故事——从神话到金钱，从国家到公司。",
            bookTitle: "人类简史",
            author: "尤瓦尔·赫拉利",
            chapterTitle: "第一章：认知革命",
            category: .history,
            highlighterCount: 12847,
            likeCount: 3421,
            noteCount: 892,
            isLiked: true,
            createdAt: Date()
        ),
        PopularHighlight(
            id: "2",
            content: "弱小和无知不是生存的障碍，傲慢才是。",
            bookTitle: "三体",
            author: "刘慈欣",
            chapterTitle: "黑暗森林",
            category: .literature,
            highlighterCount: 9823,
            likeCount: 2891,
            noteCount: 567,
            isLiked: false,
            createdAt: Date().addingTimeInterval(-86400)
        ),
        PopularHighlight(
            id: "3",
            content: "所谓自由，就是被别人讨厌的勇气。",
            bookTitle: "被讨厌的勇气",
            author: "岸见一郎 / 古贺史健",
            chapterTitle: "第五夜",
            category: .psychology,
            highlighterCount: 8234,
            likeCount: 2156,
            noteCount: 445,
            isLiked: false,
            createdAt: Date().addingTimeInterval(-172800)
        ),
        PopularHighlight(
            id: "4",
            content: "好公司和伟大公司之间的差距不在于执行力，而在于愿景。执行力可以复制，愿景不可以。",
            bookTitle: "从0到1",
            author: "彼得·蒂尔",
            chapterTitle: "创业思维",
            category: .business,
            highlighterCount: 6721,
            likeCount: 1893,
            noteCount: 321,
            isLiked: true,
            createdAt: Date().addingTimeInterval(-259200)
        ),
        PopularHighlight(
            id: "5",
            content: "未经审视的人生是不值得过的。",
            bookTitle: "苏格拉底的申辩",
            author: "柏拉图",
            chapterTitle: nil,
            category: .philosophy,
            highlighterCount: 5432,
            likeCount: 1567,
            noteCount: 234,
            isLiked: false,
            createdAt: Date().addingTimeInterval(-345600)
        ),
        PopularHighlight(
            id: "6",
            content: "宇宙不仅比我们想象的更加奇特，它比我们能够想象的还要奇特。",
            bookTitle: "时间简史",
            author: "史蒂芬·霍金",
            chapterTitle: "宇宙的起源",
            category: .science,
            highlighterCount: 4891,
            likeCount: 1234,
            noteCount: 198,
            isLiked: false,
            createdAt: Date().addingTimeInterval(-432000)
        )
    ]
}

// MARK: - Highlight Card for Home Screen

struct TrendingHighlightCard: View {
    let highlight: PopularHighlight

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Quote
            Text("「\(highlight.content)」")
                .font(.subheadline)
                .lineLimit(3)
                .foregroundColor(.primary)

            // Book info
            HStack(spacing: 4) {
                Text("——《\(highlight.bookTitle)》")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            // Stats
            HStack {
                Image(systemName: "person.2.fill")
                    .font(.caption2)
                Text("\(highlight.highlighterCount) 人划线")
                    .font(.caption)
            }
            .foregroundColor(.blue)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}

#Preview {
    PopularHighlightsView()
}
