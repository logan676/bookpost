import SwiftUI

/// Reading tab - primary entry point for continuing reading
/// Shows current reading books, recent history, and quick stats
struct ReadingTabView: View {
    @StateObject private var viewModel = ReadingTabViewModel()
    @State private var selectedBookId: Int?
    @State private var selectedBookType: BookType?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Today's reading summary
                    todaysSummary

                    // Continue reading section
                    if !viewModel.currentlyReading.isEmpty {
                        continueReadingSection
                    }

                    // Reading history
                    if !viewModel.readingHistory.isEmpty {
                        recentHistorySection
                    }

                    // Empty state
                    if viewModel.currentlyReading.isEmpty && viewModel.readingHistory.isEmpty && !viewModel.isLoading {
                        emptyState
                    }
                }
                .padding(.vertical)
            }
            .navigationTitle("阅读")
            .refreshable {
                await viewModel.refresh()
            }
            .task {
                await viewModel.loadData()
            }
            .navigationDestination(item: $selectedBookId) { bookId in
                if let type = selectedBookType {
                    BookDetailView(bookType: type, bookId: bookId)
                }
            }
        }
    }

    // MARK: - Today's Summary

    private var todaysSummary: some View {
        VStack(spacing: 16) {
            HStack(spacing: 20) {
                // Today's reading time
                StatCard(
                    icon: "clock.fill",
                    value: viewModel.todayReadingTime,
                    label: "今日阅读",
                    color: .blue
                )

                // Current streak
                StatCard(
                    icon: "flame.fill",
                    value: "\(viewModel.currentStreak)天",
                    label: "连续阅读",
                    color: .orange
                )

                // Books read this month
                StatCard(
                    icon: "book.closed.fill",
                    value: "\(viewModel.monthlyBooksRead)本",
                    label: "本月读完",
                    color: .green
                )
            }

            // Daily goal progress
            if viewModel.dailyGoalMinutes > 0 {
                dailyGoalProgress
            }
        }
        .padding(.horizontal)
    }

    private var dailyGoalProgress: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("今日目标")
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                Spacer()

                Text("\(viewModel.todayMinutesRead)/\(viewModel.dailyGoalMinutes)分钟")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color(.systemGray5))
                        .frame(height: 8)

                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.blue)
                        .frame(width: geometry.size.width * viewModel.goalProgress, height: 8)
                }
            }
            .frame(height: 8)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    // MARK: - Continue Reading Section

    private var continueReadingSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("继续阅读")
                    .font(.title2)
                    .fontWeight(.bold)

                Spacer()

                NavigationLink {
                    MyBookshelfView()
                } label: {
                    Text("全部")
                        .font(.subheadline)
                        .foregroundColor(.blue)
                }
            }
            .padding(.horizontal)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(viewModel.currentlyReading) { item in
                        ContinueReadingCard(item: item) {
                            selectedBookType = item.bookType == "ebook" ? .ebook : .magazine
                            selectedBookId = item.bookId
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
    }

    // MARK: - Recent History Section

    private var recentHistorySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("最近阅读")
                    .font(.title2)
                    .fontWeight(.bold)

                Spacer()
            }
            .padding(.horizontal)

            VStack(spacing: 0) {
                ForEach(viewModel.readingHistory.prefix(5)) { entry in
                    RecentReadingRow(entry: entry) {
                        selectedBookType = entry.itemType == "ebook" ? .ebook : .magazine
                        selectedBookId = entry.itemId
                    }

                    if entry.id != viewModel.readingHistory.prefix(5).last?.id {
                        Divider()
                            .padding(.leading, 80)
                    }
                }
            }
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
            .padding(.horizontal)
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 20) {
            Image(systemName: "book.closed")
                .font(.system(size: 64))
                .foregroundColor(.secondary)

            Text("开始你的阅读之旅")
                .font(.title2)
                .fontWeight(.semibold)

            Text("去书城发现好书，\n开启今天的阅读吧")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)

            NavigationLink {
                StoreHomeView()
            } label: {
                Text("去书城看看")
                    .font(.headline)
                    .foregroundColor(.white)
                    .padding(.horizontal, 32)
                    .padding(.vertical, 12)
                    .background(Color.blue)
                    .cornerRadius(24)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 60)
    }
}

// MARK: - Stat Card

struct StatCard: View {
    let icon: String
    let value: String
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)

            Text(value)
                .font(.headline)
                .fontWeight(.bold)

            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

// MARK: - Continue Reading Card

struct ContinueReadingCard: View {
    let item: BookshelfItem
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 0) {
                // Cover with progress overlay
                ZStack(alignment: .bottom) {
                    BookCoverView(coverUrl: item.book.coverUrl, title: item.book.title)
                        .frame(width: 140, height: 190)
                        .clipShape(RoundedRectangle(cornerRadius: 8))

                    // Progress bar
                    if let progress = item.progress, progress > 0 {
                        VStack(spacing: 0) {
                            Spacer()
                            GeometryReader { geometry in
                                ZStack(alignment: .leading) {
                                    Rectangle()
                                        .fill(Color.black.opacity(0.5))
                                        .frame(height: 4)

                                    Rectangle()
                                        .fill(Color.white)
                                        .frame(width: geometry.size.width * CGFloat(progress), height: 4)
                                }
                            }
                            .frame(height: 4)
                        }
                    }
                }
                .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)

                // Info
                VStack(alignment: .leading, spacing: 4) {
                    Text(item.book.title)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                        .lineLimit(2)

                    if let progress = item.progress {
                        Text(String(format: "%.0f%%", progress * 100))
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.top, 8)
            }
            .frame(width: 140)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Recent Reading Row

struct RecentReadingRow: View {
    let entry: ReadingHistoryItem
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                // Cover
                BookCoverView(coverUrl: entry.coverUrl, title: entry.displayTitle)
                    .frame(width: 50, height: 68)
                    .clipShape(RoundedRectangle(cornerRadius: 4))

                // Info
                VStack(alignment: .leading, spacing: 4) {
                    Text(entry.displayTitle)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                        .lineLimit(1)

                    HStack(spacing: 8) {
                        if let progress = entry.progress {
                            Text(String(format: "%.0f%%", progress * 100))
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }

                        if let lastReadAt = entry.lastReadAt {
                            Text(lastReadAt)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }

                Spacer()

                // Continue button
                Image(systemName: "play.circle.fill")
                    .font(.title2)
                    .foregroundColor(.blue)
            }
            .padding()
        }
        .buttonStyle(.plain)
    }
}

// MARK: - ViewModel

@MainActor
class ReadingTabViewModel: ObservableObject {
    @Published var currentlyReading: [BookshelfItem] = []
    @Published var readingHistory: [ReadingHistoryItem] = []
    @Published var todayReadingTime: String = "0分钟"
    @Published var todayMinutesRead: Int = 0
    @Published var dailyGoalMinutes: Int = 30
    @Published var currentStreak: Int = 0
    @Published var monthlyBooksRead: Int = 0
    @Published var isLoading = false

    private let apiClient = APIClient.shared

    var goalProgress: CGFloat {
        guard dailyGoalMinutes > 0 else { return 0 }
        return min(1.0, CGFloat(todayMinutesRead) / CGFloat(dailyGoalMinutes))
    }

    func loadData() async {
        isLoading = true

        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.loadCurrentlyReading() }
            group.addTask { await self.loadReadingHistory() }
            group.addTask { await self.loadTodayStats() }
            group.addTask { await self.loadGoalAndStreak() }
        }

        isLoading = false
    }

    func refresh() async {
        await loadData()
    }

    private func loadCurrentlyReading() async {
        do {
            let response = try await apiClient.getMyBookshelf(
                status: "reading",
                limit: 10
            )
            currentlyReading = response.data
        } catch {
            print("Failed to load currently reading: \(error)")
        }
    }

    private func loadReadingHistory() async {
        do {
            let response = try await apiClient.getReadingHistory(limit: 10)
            readingHistory = response.data
        } catch {
            print("Failed to load reading history: \(error)")
        }
    }

    private func loadTodayStats() async {
        do {
            let response = try await apiClient.getTodayDuration()
            todayMinutesRead = response.todayDuration / 60
            todayReadingTime = formatDuration(response.todayDuration)
        } catch {
            print("Failed to load today stats: \(error)")
        }
    }

    private func loadGoalAndStreak() async {
        do {
            let goals = try await apiClient.getReadingGoal()
            if let data = goals.data {
                dailyGoalMinutes = data.dailyMinutes
                currentStreak = data.currentStreak
            }
        } catch {
            print("Failed to load goals: \(error)")
        }
    }

    private func formatDuration(_ seconds: Int) -> String {
        let hours = seconds / 3600
        let minutes = (seconds % 3600) / 60

        if hours > 0 {
            return "\(hours)小时\(minutes)分钟"
        } else {
            return "\(minutes)分钟"
        }
    }
}

// MARK: - Extensions

extension ReadingHistoryEntry {
    var lastReadDate: Date? {
        guard let lastReadAt = lastReadAt else { return nil }
        return ISO8601DateFormatter().date(from: lastReadAt)
    }
}

#Preview {
    ReadingTabView()
}
