/**
 * Streak View
 * Displays reading streaks with calendar heatmap visualization
 */

import SwiftUI

// MARK: - CalendarDay Extension

extension CalendarDay {
    var dayNumber: Int? {
        let components = date.split(separator: "-")
        guard components.count == 3, let day = Int(components[2]) else { return nil }
        return day
    }

    var intensityLevel: Int {
        switch duration {
        case 0: return 0
        case 1..<900: return 1      // < 15 min
        case 900..<1800: return 2   // 15-30 min
        case 1800..<3600: return 3  // 30-60 min
        default: return 4           // > 60 min
        }
    }
}

// MARK: - Streak View

struct StreakView: View {
    @State private var totalStats: TotalStatsResponse?
    @State private var calendarStats: CalendarStatsResponse?
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var selectedYear: Int
    @State private var selectedMonth: Int

    init() {
        let now = Date()
        let calendar = Calendar.current
        _selectedYear = State(initialValue: calendar.component(.year, from: now))
        _selectedMonth = State(initialValue: calendar.component(.month, from: now))
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                if isLoading {
                    ProgressView()
                        .frame(height: 300)
                } else if let error = errorMessage {
                    VStack(spacing: 16) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.largeTitle)
                            .foregroundColor(.orange)
                        Text(error)
                            .foregroundColor(.secondary)
                    }
                    .frame(height: 200)
                } else {
                    // Streak Summary
                    streakSummaryCard

                    // Reading Stats
                    readingStatsCard

                    // Calendar Heatmap
                    calendarHeatmapCard
                }
            }
            .padding()
        }
        .navigationTitle(L10n.Profile.readingStreak)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadStats()
        }
        .refreshable {
            await loadStats()
        }
    }

    // MARK: - Streak Summary Card

    private var streakSummaryCard: some View {
        HStack(spacing: 20) {
            // Current streak
            VStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(LinearGradient(
                            colors: [.orange, .red],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ))
                        .frame(width: 80, height: 80)

                    VStack(spacing: 2) {
                        Image(systemName: "flame.fill")
                            .font(.title2)
                            .foregroundColor(.white)
                        Text("\(totalStats?.summary.currentStreak ?? 0)")
                            .font(.system(size: 24, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                    }
                }

                VStack(spacing: 2) {
                    Text(L10n.Stats.currentStreak)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(L10n.Stats.days)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            .frame(maxWidth: .infinity)

            // Divider
            Rectangle()
                .fill(Color.gray.opacity(0.2))
                .frame(width: 1, height: 100)

            // Longest streak
            VStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(LinearGradient(
                            colors: [.yellow, .orange],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ))
                        .frame(width: 80, height: 80)

                    VStack(spacing: 2) {
                        Image(systemName: "trophy.fill")
                            .font(.title2)
                            .foregroundColor(.white)
                        Text("\(totalStats?.summary.longestStreak ?? 0)")
                            .font(.system(size: 24, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                    }
                }

                VStack(spacing: 2) {
                    Text(L10n.Stats.longestStreak)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(L10n.Stats.days)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            .frame(maxWidth: .infinity)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, y: 4)
    }

    // MARK: - Reading Stats Card

    private var readingStatsCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(L10n.Stats.overview)
                .font(.headline)

            HStack {
                StatBox(
                    icon: "clock.fill",
                    iconColor: .blue,
                    value: formatDuration(totalStats?.summary.totalDuration ?? 0),
                    label: L10n.Stats.totalReadingTime
                )

                Divider()
                    .frame(height: 50)

                StatBox(
                    icon: "calendar",
                    iconColor: .green,
                    value: "\(totalStats?.summary.totalDays ?? 0)",
                    label: L10n.Stats.readingDays
                )

                Divider()
                    .frame(height: 50)

                StatBox(
                    icon: "book.fill",
                    iconColor: .purple,
                    value: "\(totalStats?.summary.booksFinished ?? 0)",
                    label: L10n.Stats.booksFinished
                )
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, y: 4)
    }

    // MARK: - Calendar Heatmap Card

    private var calendarHeatmapCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Month selector
            HStack {
                Button {
                    goToPreviousMonth()
                } label: {
                    Image(systemName: "chevron.left")
                        .foregroundColor(.primary)
                }

                Spacer()

                Text(monthYearString)
                    .font(.headline)

                Spacer()

                Button {
                    goToNextMonth()
                } label: {
                    Image(systemName: "chevron.right")
                        .foregroundColor(.primary)
                }
                .disabled(isCurrentMonth)
            }
            .padding(.horizontal, 8)

            // Weekday headers
            HStack(spacing: 4) {
                ForEach([L10n.Stats.sun, L10n.Stats.mon, L10n.Stats.tue, L10n.Stats.wed, L10n.Stats.thu, L10n.Stats.fri, L10n.Stats.sat], id: \.self) { day in
                    Text(day)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .frame(maxWidth: .infinity)
                }
            }

            // Calendar grid
            if let stats = calendarStats {
                CalendarGrid(days: stats.calendarDays, year: selectedYear, month: selectedMonth)
            } else {
                ProgressView()
                    .frame(height: 200)
            }

            // Legend
            HStack(spacing: 8) {
                Text(L10n.Stats.less)
                    .font(.caption2)
                    .foregroundColor(.secondary)

                ForEach(0..<5) { level in
                    RoundedRectangle(cornerRadius: 2)
                        .fill(colorForIntensity(level))
                        .frame(width: 12, height: 12)
                }

                Text(L10n.Stats.more)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .trailing)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, y: 4)
    }

    // MARK: - Helper Methods

    private var monthYearString: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "zh_CN")
        var calendar = Calendar.current
        calendar.locale = Locale(identifier: "zh_CN")
        guard let date = calendar.date(from: DateComponents(year: selectedYear, month: selectedMonth)) else {
            return "\(selectedYear)年\(selectedMonth)月"
        }
        formatter.dateFormat = "yyyy年M月"
        return formatter.string(from: date)
    }

    private var isCurrentMonth: Bool {
        let now = Date()
        let calendar = Calendar.current
        return selectedYear == calendar.component(.year, from: now) &&
               selectedMonth == calendar.component(.month, from: now)
    }

    private func goToPreviousMonth() {
        if selectedMonth == 1 {
            selectedMonth = 12
            selectedYear -= 1
        } else {
            selectedMonth -= 1
        }
        Task {
            await loadCalendarStats()
        }
    }

    private func goToNextMonth() {
        if selectedMonth == 12 {
            selectedMonth = 1
            selectedYear += 1
        } else {
            selectedMonth += 1
        }
        Task {
            await loadCalendarStats()
        }
    }

    private func formatDuration(_ seconds: Int) -> String {
        let hours = seconds / 3600
        let minutes = (seconds % 3600) / 60

        if hours > 0 {
            return "\(hours)h\(minutes > 0 ? " \(minutes)m" : "")"
        }
        return "\(minutes)m"
    }

    private func colorForIntensity(_ level: Int) -> Color {
        switch level {
        case 0: return Color.gray.opacity(0.2)
        case 1: return Color.orange.opacity(0.3)
        case 2: return Color.orange.opacity(0.5)
        case 3: return Color.orange.opacity(0.7)
        default: return Color.orange
        }
    }

    // MARK: - API Methods

    private func loadStats() async {
        isLoading = true
        errorMessage = nil

        await withTaskGroup(of: Void.self) { group in
            group.addTask { await loadTotalStats() }
            group.addTask { await loadCalendarStats() }
        }

        isLoading = false
    }

    private func loadTotalStats() async {
        do {
            let response: APIResponse<TotalStatsResponse> = try await APIClient.shared.get(
                "/user/reading-stats",
                queryParams: ["dimension": "total"]
            )

            if let data = response.data {
                await MainActor.run {
                    totalStats = data
                }
            }
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
            }
        }
    }

    private func loadCalendarStats() async {
        do {
            let response: APIResponse<CalendarStatsResponse> = try await APIClient.shared.get(
                "/user/reading-stats",
                queryParams: [
                    "dimension": "calendar",
                    "year": "\(selectedYear)",
                    "month": "\(selectedMonth)"
                ]
            )

            if let data = response.data {
                await MainActor.run {
                    calendarStats = data
                }
            }
        } catch {
            // Calendar errors are non-fatal
            print("Calendar stats error: \(error)")
        }
    }
}

// MARK: - Stat Box Component

struct StatBox: View {
    let icon: String
    let iconColor: Color
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(iconColor)

            Text(value)
                .font(.system(.title3, design: .rounded))
                .fontWeight(.bold)

            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Calendar Grid

struct CalendarGrid: View {
    let days: [CalendarDay]
    let year: Int
    let month: Int

    private var firstDayOffset: Int {
        var calendar = Calendar.current
        calendar.locale = Locale(identifier: "zh_CN")
        guard let date = calendar.date(from: DateComponents(year: year, month: month, day: 1)) else {
            return 0
        }
        return calendar.component(.weekday, from: date) - 1
    }

    private var daysInMonth: Int {
        var calendar = Calendar.current
        calendar.locale = Locale(identifier: "zh_CN")
        guard let date = calendar.date(from: DateComponents(year: year, month: month)),
              let range = calendar.range(of: .day, in: .month, for: date) else {
            return 30
        }
        return range.count
    }

    var body: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: 7), spacing: 4) {
            // Empty cells for offset
            ForEach(0..<firstDayOffset, id: \.self) { _ in
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.clear)
                    .aspectRatio(1, contentMode: .fit)
            }

            // Day cells
            ForEach(1...daysInMonth, id: \.self) { day in
                let dayData = days.first { $0.dayNumber == day }
                CalendarDayCell(
                    day: day,
                    hasReading: dayData?.hasReading ?? false,
                    intensity: dayData?.intensityLevel ?? 0
                )
            }
        }
    }
}

// MARK: - Calendar Day Cell

struct CalendarDayCell: View {
    let day: Int
    let hasReading: Bool
    let intensity: Int

    private var backgroundColor: Color {
        switch intensity {
        case 0: return Color.gray.opacity(0.1)
        case 1: return Color.orange.opacity(0.3)
        case 2: return Color.orange.opacity(0.5)
        case 3: return Color.orange.opacity(0.7)
        default: return Color.orange
        }
    }

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 4)
                .fill(backgroundColor)

            Text("\(day)")
                .font(.caption2)
                .foregroundColor(intensity > 0 ? .white : .secondary)
        }
        .aspectRatio(1, contentMode: .fit)
    }
}

#Preview {
    NavigationStack {
        StreakView()
    }
}
