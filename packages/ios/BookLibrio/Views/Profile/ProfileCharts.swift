import Charts
import SwiftUI

// MARK: - Category Preference Chart (Pie/Donut)

/// A donut chart showing reading category distribution
struct PreferenceCategoryChart: View {
    let preferences: [CategoryPreference]
    @State private var selectedCategory: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(L10n.ProfileCharts.categoryDistribution)
                .font(.headline)

            HStack(spacing: 20) {
                // Donut chart
                Chart(preferences) { item in
                    SectorMark(
                        angle: .value(L10n.ProfileCharts.percentage, item.percentage),
                        innerRadius: .ratio(0.5),
                        angularInset: 1.5
                    )
                    .foregroundStyle(item.color)
                    .cornerRadius(4)
                    .opacity(selectedCategory == nil || selectedCategory == item.category ? 1.0 : 0.4)
                }
                .chartAngleSelection(value: $selectedCategory)
                .frame(width: 140, height: 140)

                // Legend
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(preferences.prefix(5)) { pref in
                        legendItem(pref)
                    }
                }
            }

            // Selected category detail
            if let category = selectedCategory,
               let pref = preferences.first(where: { $0.category == category }) {
                selectedCategoryDetail(pref)
            }
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(16)
    }

    @ViewBuilder
    private func legendItem(_ pref: CategoryPreference) -> some View {
        HStack(spacing: 8) {
            Circle()
                .fill(pref.color)
                .frame(width: 10, height: 10)

            Text(pref.category)
                .font(.caption)
                .foregroundColor(.primary)

            Spacer()

            Text("\(pref.percentage)%")
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }

    @ViewBuilder
    private func selectedCategoryDetail(_ pref: CategoryPreference) -> some View {
        HStack {
            Circle()
                .fill(pref.color)
                .frame(width: 12, height: 12)

            Text(pref.category)
                .font(.subheadline)
                .fontWeight(.medium)

            Spacer()

            Text(L10n.ProfileCharts.booksCount(pref.booksCount))
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding(12)
        .background(Color(.tertiarySystemGroupedBackground))
        .cornerRadius(8)
    }
}

// MARK: - Monthly Reading Bar Chart

/// Bar chart showing monthly reading progress
struct MonthlyReadingBarChart: View {
    let data: [MonthlyReadingData]
    @State private var selectedMonth: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text(L10n.ProfileCharts.monthlyProgress)
                    .font(.headline)

                Spacer()

                if let selected = selectedMonth,
                   let monthData = data.first(where: { $0.month == selected }) {
                    Text(L10n.ProfileCharts.hoursRead(monthData.hours))
                        .font(.caption)
                        .foregroundColor(.blue)
                }
            }

            Chart(data) { item in
                BarMark(
                    x: .value(L10n.ProfileCharts.month, item.month),
                    y: .value(L10n.ProfileCharts.hours, item.hours)
                )
                .foregroundStyle(
                    item.month == selectedMonth
                        ? Color.blue
                        : Color.blue.opacity(0.6)
                )
                .cornerRadius(4)

                if item.month == currentMonth {
                    RuleMark(y: .value(L10n.ProfileCharts.goal, item.goal))
                        .foregroundStyle(.orange)
                        .lineStyle(StrokeStyle(lineWidth: 1, dash: [5, 5]))
                        .annotation(position: .top, alignment: .trailing) {
                            Text(L10n.ProfileCharts.goalLabel)
                                .font(.caption2)
                                .foregroundColor(.orange)
                        }
                }
            }
            .chartXSelection(value: $selectedMonth)
            .frame(height: 180)
            .chartYAxis {
                AxisMarks(position: .leading) { value in
                    AxisValueLabel {
                        if let hours = value.as(Int.self) {
                            Text("\(hours)h")
                                .font(.caption2)
                        }
                    }
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(16)
    }

    private var currentMonth: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "M月"
        return formatter.string(from: Date())
    }
}

// MARK: - Reading Progress Line Chart

/// Line chart showing reading trend over time
struct ReadingProgressLineChart: View {
    let data: [DailyReadingData]

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(L10n.ProfileCharts.readingTrend)
                .font(.headline)

            Chart(data) { item in
                LineMark(
                    x: .value(L10n.ProfileCharts.date, item.date),
                    y: .value(L10n.ProfileCharts.minutes, item.minutes)
                )
                .foregroundStyle(Color.blue)
                .interpolationMethod(.catmullRom)

                AreaMark(
                    x: .value(L10n.ProfileCharts.date, item.date),
                    y: .value(L10n.ProfileCharts.minutes, item.minutes)
                )
                .foregroundStyle(
                    LinearGradient(
                        colors: [.blue.opacity(0.3), .blue.opacity(0.05)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .interpolationMethod(.catmullRom)
            }
            .frame(height: 150)
            .chartYAxis {
                AxisMarks(position: .leading) { value in
                    AxisValueLabel {
                        if let mins = value.as(Int.self) {
                            Text("\(mins)m")
                                .font(.caption2)
                        }
                    }
                }
            }
            .chartXAxis {
                AxisMarks(values: .stride(by: .day, count: 7)) { value in
                    AxisValueLabel {
                        if let date = value.as(Date.self) {
                            Text(date, format: .dateTime.day())
                                .font(.caption2)
                        }
                    }
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(16)
    }
}

// MARK: - Books Completed Chart

/// Combined chart showing books completed with goal comparison
struct BooksCompletedChart: View {
    let monthlyBooks: [MonthlyBooksData]
    let yearlyGoal: Int

    private var totalCompleted: Int {
        monthlyBooks.reduce(0) { $0 + $1.count }
    }

    private var progressPercentage: Double {
        guard yearlyGoal > 0 else { return 0 }
        return min(Double(totalCompleted) / Double(yearlyGoal), 1.0)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text(L10n.ProfileCharts.booksCompleted)
                    .font(.headline)

                Spacer()

                Text("\(totalCompleted)/\(yearlyGoal)")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            // Progress ring
            HStack(spacing: 24) {
                ZStack {
                    Circle()
                        .stroke(Color.gray.opacity(0.2), lineWidth: 12)

                    Circle()
                        .trim(from: 0, to: progressPercentage)
                        .stroke(
                            Color.green,
                            style: StrokeStyle(lineWidth: 12, lineCap: .round)
                        )
                        .rotationEffect(.degrees(-90))

                    VStack(spacing: 2) {
                        Text("\(Int(progressPercentage * 100))%")
                            .font(.title2)
                            .fontWeight(.bold)
                        Text(L10n.ProfileCharts.complete)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
                .frame(width: 100, height: 100)

                // Monthly breakdown
                Chart(monthlyBooks) { item in
                    BarMark(
                        x: .value(L10n.ProfileCharts.month, item.month),
                        y: .value(L10n.ProfileCharts.books, item.count)
                    )
                    .foregroundStyle(Color.green.gradient)
                    .cornerRadius(2)
                }
                .frame(height: 80)
                .chartYAxis(.hidden)
            }
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(16)
    }
}

// MARK: - Data Models

struct MonthlyReadingData: Identifiable {
    let id = UUID()
    let month: String
    let hours: Int
    let goal: Int
}

struct DailyReadingData: Identifiable {
    let id = UUID()
    let date: Date
    let minutes: Int
}

struct MonthlyBooksData: Identifiable {
    let id = UUID()
    let month: String
    let count: Int
}

// MARK: - Previews

#Preview("Category Chart") {
    PreferenceCategoryChart(preferences: [
        CategoryPreference(category: "文学", percentage: 35, booksCount: 54),
        CategoryPreference(category: "历史", percentage: 25, booksCount: 39),
        CategoryPreference(category: "科技", percentage: 15, booksCount: 23),
        CategoryPreference(category: "哲学", percentage: 12, booksCount: 19),
        CategoryPreference(category: "经济", percentage: 8, booksCount: 12),
        CategoryPreference(category: "其他", percentage: 5, booksCount: 9)
    ])
    .padding()
}

#Preview("Monthly Bar Chart") {
    MonthlyReadingBarChart(data: [
        MonthlyReadingData(month: "1月", hours: 25, goal: 30),
        MonthlyReadingData(month: "2月", hours: 30, goal: 30),
        MonthlyReadingData(month: "3月", hours: 28, goal: 30),
        MonthlyReadingData(month: "4月", hours: 35, goal: 30),
        MonthlyReadingData(month: "5月", hours: 22, goal: 30),
        MonthlyReadingData(month: "6月", hours: 40, goal: 30),
        MonthlyReadingData(month: "7月", hours: 32, goal: 30),
        MonthlyReadingData(month: "8月", hours: 38, goal: 30),
        MonthlyReadingData(month: "9月", hours: 29, goal: 30),
        MonthlyReadingData(month: "10月", hours: 33, goal: 30),
        MonthlyReadingData(month: "11月", hours: 36, goal: 30),
        MonthlyReadingData(month: "12月", hours: 15, goal: 30)
    ])
    .padding()
}

#Preview("Books Completed") {
    BooksCompletedChart(
        monthlyBooks: [
            MonthlyBooksData(month: "1月", count: 4),
            MonthlyBooksData(month: "2月", count: 3),
            MonthlyBooksData(month: "3月", count: 5),
            MonthlyBooksData(month: "4月", count: 4),
            MonthlyBooksData(month: "5月", count: 2),
            MonthlyBooksData(month: "6月", count: 6),
            MonthlyBooksData(month: "7月", count: 4),
            MonthlyBooksData(month: "8月", count: 5),
            MonthlyBooksData(month: "9月", count: 3),
            MonthlyBooksData(month: "10月", count: 4),
            MonthlyBooksData(month: "11月", count: 5),
            MonthlyBooksData(month: "12月", count: 2)
        ],
        yearlyGoal: 52
    )
    .padding()
}

#Preview("Reading Trend") {
    ReadingProgressLineChart(data: (0..<30).map { day in
        DailyReadingData(
            date: Date().addingTimeInterval(-Double(29 - day) * 86400),
            minutes: Int.random(in: 15...90)
        )
    })
    .padding()
}
