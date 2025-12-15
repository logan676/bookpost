/**
 * Reading Stats ViewModel
 * Manages reading statistics data
 */

import Foundation

@MainActor
class ReadingStatsViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var selectedDimension: StatsDimension = .week
    @Published var selectedDate = Date()
    @Published var isLoading = false
    @Published var error: String?

    // Week stats
    @Published var weekStats: WeekStatsResponse?

    // Month stats
    @Published var monthStats: WeekStatsResponse?  // Same structure

    // Year stats
    @Published var yearStats: YearStatsResponse?

    // Total stats
    @Published var totalStats: TotalStatsResponse?

    // Calendar stats
    @Published var calendarStats: CalendarStatsResponse?

    // MARK: - Computed Properties

    var currentWeekStart: Date {
        let calendar = Calendar.current
        let weekday = calendar.component(.weekday, from: selectedDate)
        // Adjust to Monday (weekday 2 in US locale, 1 in Monday-first locales)
        let diff = (weekday + 5) % 7  // Days since Monday
        return calendar.date(byAdding: .day, value: -diff, to: selectedDate) ?? selectedDate
    }

    var currentYear: Int {
        Calendar.current.component(.year, from: selectedDate)
    }

    var currentMonth: Int {
        Calendar.current.component(.month, from: selectedDate)
    }

    // MARK: - Methods

    func loadStats() async {
        isLoading = true
        error = nil

        do {
            switch selectedDimension {
            case .week:
                await loadWeekStats()
            case .month:
                await loadMonthStats()
            case .year:
                await loadYearStats()
            case .total:
                await loadTotalStats()
            case .calendar:
                await loadCalendarStats()
            }
        }

        isLoading = false
    }

    private func loadWeekStats() async {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate]
        let dateStr = formatter.string(from: currentWeekStart)

        do {
            let response: APIResponse<WeekStatsResponse> = try await APIClient.shared.get(
                "/user/reading-stats",
                queryParams: ["dimension": "week", "date": dateStr]
            )
            weekStats = response.data
        } catch {
            self.error = "加载周统计失败: \(error.localizedDescription)"
        }
    }

    private func loadMonthStats() async {
        do {
            let response: APIResponse<WeekStatsResponse> = try await APIClient.shared.get(
                "/user/reading-stats",
                queryParams: [
                    "dimension": "month",
                    "year": String(currentYear),
                    "month": String(currentMonth)
                ]
            )
            monthStats = response.data
        } catch {
            self.error = "加载月统计失败: \(error.localizedDescription)"
        }
    }

    private func loadYearStats() async {
        do {
            let response: APIResponse<YearStatsResponse> = try await APIClient.shared.get(
                "/user/reading-stats",
                queryParams: ["dimension": "year", "year": String(currentYear)]
            )
            yearStats = response.data
        } catch {
            self.error = "加载年统计失败: \(error.localizedDescription)"
        }
    }

    private func loadTotalStats() async {
        do {
            let response: APIResponse<TotalStatsResponse> = try await APIClient.shared.get(
                "/user/reading-stats",
                queryParams: ["dimension": "total"]
            )
            totalStats = response.data
        } catch {
            self.error = "加载总统计失败: \(error.localizedDescription)"
        }
    }

    private func loadCalendarStats() async {
        do {
            let response: APIResponse<CalendarStatsResponse> = try await APIClient.shared.get(
                "/user/reading-stats",
                queryParams: [
                    "dimension": "calendar",
                    "year": String(currentYear),
                    "month": String(currentMonth)
                ]
            )
            calendarStats = response.data
        } catch {
            self.error = "加载日历视图失败: \(error.localizedDescription)"
        }
    }

    // MARK: - Navigation

    func goToPreviousPeriod() {
        let calendar = Calendar.current

        switch selectedDimension {
        case .week:
            selectedDate = calendar.date(byAdding: .weekOfYear, value: -1, to: selectedDate) ?? selectedDate
        case .month, .calendar:
            selectedDate = calendar.date(byAdding: .month, value: -1, to: selectedDate) ?? selectedDate
        case .year:
            selectedDate = calendar.date(byAdding: .year, value: -1, to: selectedDate) ?? selectedDate
        case .total:
            break
        }

        Task { await loadStats() }
    }

    func goToNextPeriod() {
        let calendar = Calendar.current

        switch selectedDimension {
        case .week:
            selectedDate = calendar.date(byAdding: .weekOfYear, value: 1, to: selectedDate) ?? selectedDate
        case .month, .calendar:
            selectedDate = calendar.date(byAdding: .month, value: 1, to: selectedDate) ?? selectedDate
        case .year:
            selectedDate = calendar.date(byAdding: .year, value: 1, to: selectedDate) ?? selectedDate
        case .total:
            break
        }

        Task { await loadStats() }
    }
}
