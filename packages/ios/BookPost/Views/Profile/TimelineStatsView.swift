import SwiftUI

/// Main view for displaying reading timeline and milestones
struct TimelineStatsView: View {
    @StateObject private var viewModel = ProfileViewModel()
    @State private var selectedFilter: TimelineFilter = .all
    @State private var showShareCard = false

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Summary header
                summaryHeader

                // Filter tabs
                filterTabs

                // Milestones list
                milestonesSection

                // Monthly summary
                monthlySummarySection
            }
            .padding()
        }
        .navigationTitle(L10n.ProfileTimeline.title)
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button(action: { showShareCard = true }) {
                    Image(systemName: "square.and.arrow.up")
                }
            }
        }
        .sheet(isPresented: $showShareCard) {
            StatsShareCardView(cardData: viewModel.generateShareCard())
        }
        .task {
            await viewModel.loadProfile()
        }
        .refreshable {
            await viewModel.refresh()
        }
    }

    // MARK: - Summary Header

    private var summaryHeader: some View {
        VStack(spacing: 16) {
            // Reading stats row
            ReadingSummaryRow(records: viewModel.readingRecords)

            // Streak card
            if let streak = viewModel.readingRecords?.currentStreak, streak > 0 {
                StreakHighlightCard(
                    currentStreak: streak,
                    longestStreak: max(streak, 42) // TODO: Track actual longest
                )
            }
        }
    }

    // MARK: - Filter Tabs

    private var filterTabs: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(TimelineFilter.allCases) { filter in
                    filterChip(filter)
                }
            }
            .padding(.horizontal, 4)
        }
    }

    @ViewBuilder
    private func filterChip(_ filter: TimelineFilter) -> some View {
        let isSelected = selectedFilter == filter

        Button(action: { selectedFilter = filter }) {
            HStack(spacing: 6) {
                if let icon = filter.icon {
                    Image(systemName: icon)
                        .font(.caption)
                }

                Text(filter.displayName)
                    .font(.subheadline)
            }
            .foregroundColor(isSelected ? .white : .primary)
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(
                Capsule()
                    .fill(isSelected ? Color.blue : Color(.tertiarySystemGroupedBackground))
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Milestones Section

    private var milestonesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(L10n.ProfileTimeline.milestones)
                    .font(.headline)

                Spacer()

                Text(L10n.ProfileTimeline.milestonesCount(filteredMilestones.count))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            if filteredMilestones.isEmpty {
                emptyMilestonesView
            } else {
                LazyVStack(spacing: 12) {
                    ForEach(filteredMilestones) { milestone in
                        TimelineMilestoneCard(milestone: milestone)
                    }
                }
            }
        }
    }

    private var filteredMilestones: [TimelineMilestone] {
        guard selectedFilter != .all else {
            return viewModel.timelineMilestones
        }

        return viewModel.timelineMilestones.filter { milestone in
            switch selectedFilter {
            case .all:
                return true
            case .books:
                return milestone.type == .finishedBook || milestone.type == .firstBook
            case .streaks:
                return milestone.type == .streakDays
            case .hours:
                return milestone.type == .totalHours
            case .badges:
                return milestone.type == .badge || milestone.type == .anniversary
            }
        }
    }

    private var emptyMilestonesView: some View {
        VStack(spacing: 12) {
            Image(systemName: "calendar.badge.clock")
                .font(.system(size: 40))
                .foregroundColor(.secondary)

            Text(L10n.ProfileTimeline.noMilestones)
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(12)
    }

    // MARK: - Monthly Summary Section

    private var monthlySummarySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(L10n.ProfileTimeline.monthlySummary)
                .font(.headline)

            MonthlySummaryCard(
                booksThisMonth: 4,
                hoursThisMonth: 32,
                notesThisMonth: 28,
                comparedToLastMonth: 15 // +15%
            )
        }
    }
}

// MARK: - Timeline Filter

enum TimelineFilter: String, CaseIterable, Identifiable {
    case all
    case books
    case streaks
    case hours
    case badges

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .all: return L10n.ProfileTimeline.filterAll
        case .books: return L10n.ProfileTimeline.filterBooks
        case .streaks: return L10n.ProfileTimeline.filterStreaks
        case .hours: return L10n.ProfileTimeline.filterHours
        case .badges: return L10n.ProfileTimeline.filterBadges
        }
    }

    var icon: String? {
        switch self {
        case .all: return nil
        case .books: return "book.fill"
        case .streaks: return "flame.fill"
        case .hours: return "clock.fill"
        case .badges: return "medal.fill"
        }
    }
}

// MARK: - Monthly Summary Card

struct MonthlySummaryCard: View {
    let booksThisMonth: Int
    let hoursThisMonth: Int
    let notesThisMonth: Int
    let comparedToLastMonth: Int // Percentage change

    private var isPositiveChange: Bool {
        comparedToLastMonth >= 0
    }

    var body: some View {
        VStack(spacing: 16) {
            // Stats row
            HStack(spacing: 0) {
                summaryItem(
                    value: "\(booksThisMonth)",
                    label: L10n.ProfileTimeline.booksThisMonth
                )

                Divider()
                    .frame(height: 40)

                summaryItem(
                    value: "\(hoursThisMonth)",
                    label: L10n.ProfileTimeline.hoursThisMonth
                )

                Divider()
                    .frame(height: 40)

                summaryItem(
                    value: "\(notesThisMonth)",
                    label: L10n.ProfileTimeline.notesThisMonth
                )
            }

            Divider()

            // Comparison row
            HStack {
                Image(systemName: isPositiveChange ? "arrow.up.right" : "arrow.down.right")
                    .font(.caption)
                    .foregroundColor(isPositiveChange ? .green : .red)

                Text(L10n.ProfileTimeline.comparedToLastMonth(abs(comparedToLastMonth)))
                    .font(.caption)
                    .foregroundColor(isPositiveChange ? .green : .red)

                Spacer()

                Text(L10n.ProfileTimeline.keepItUp)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(16)
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(12)
    }

    @ViewBuilder
    private func summaryItem(value: String, label: String) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.title2)
                .fontWeight(.bold)

            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Horizontal Timeline

/// Compact horizontal scrolling timeline for quick milestone overview
struct HorizontalTimelineView: View {
    let milestones: [TimelineMilestone]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(L10n.ProfileTimeline.recentAchievements)
                .font(.headline)
                .padding(.horizontal)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(milestones.prefix(10)) { milestone in
                        CompactMilestoneItem(milestone: milestone)
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

#Preview("Timeline Stats") {
    NavigationStack {
        TimelineStatsView()
    }
}

#Preview("Monthly Summary") {
    MonthlySummaryCard(
        booksThisMonth: 4,
        hoursThisMonth: 32,
        notesThisMonth: 28,
        comparedToLastMonth: 15
    )
    .padding()
}
