/**
 * Reading Statistics Models
 * Data models for reading statistics and analytics
 */

import Foundation

// MARK: - Statistics Dimension
enum StatsDimension: String, CaseIterable {
    case week = "week"
    case month = "month"
    case year = "year"
    case total = "total"
    case calendar = "calendar"

    var displayName: String {
        switch self {
        case .week: return L10n.Stats.week
        case .month: return L10n.Stats.month
        case .year: return L10n.Stats.year
        case .total: return L10n.Stats.total
        case .calendar: return L10n.Stats.calendar
        }
    }
}

// MARK: - Date Range
struct DateRange: Codable {
    let start: String
    let end: String
}

// MARK: - Day Duration
struct DayDuration: Identifiable, Codable {
    var id: String { date }
    let date: String
    let duration: Int
    let dayOfWeek: String

    var formattedDuration: String {
        let hours = duration / 3600
        let minutes = (duration % 3600) / 60

        if hours > 0 {
            return "\(hours)h \(minutes)m"
        } else if minutes > 0 {
            return "\(minutes)m"
        } else {
            return "0m"
        }
    }
}

// MARK: - Week Stats Summary
struct WeekStatsSummary: Codable {
    let totalDuration: Int
    let dailyAverage: Int
    let comparisonChange: Double
    let friendRanking: Int?

    var formattedTotalDuration: String {
        let hours = totalDuration / 3600
        let minutes = (totalDuration % 3600) / 60
        return "\(hours)h \(minutes)m"
    }

    var formattedDailyAverage: String {
        let hours = dailyAverage / 3600
        let minutes = (dailyAverage % 3600) / 60

        if hours > 0 {
            return "\(hours)h \(minutes)m"
        } else {
            return "\(minutes)m"
        }
    }

    var comparisonChangeText: String {
        let absChange = abs(comparisonChange)
        let direction = comparisonChange >= 0 ? "↑" : "↓"
        return "\(direction) \(String(format: "%.1f", absChange))%"
    }
}

// MARK: - Reading Records
struct ReadingRecords: Codable {
    let booksRead: Int
    let readingDays: Int
    let notesCount: Int
    let highlightsCount: Int
}

// MARK: - Week Stats Response
struct WeekStatsResponse: Codable {
    let dimension: String
    let dateRange: DateRange
    let summary: WeekStatsSummary
    let readingRecords: ReadingRecords
    let durationByDay: [DayDuration]
}

// MARK: - Total Stats Summary
struct TotalStatsSummary: Codable {
    let totalDuration: Int
    let totalDays: Int
    let currentStreak: Int
    let longestStreak: Int
    let booksRead: Int
    let booksFinished: Int

    var formattedTotalDuration: String {
        let hours = totalDuration / 3600
        return "\(hours)小时"
    }
}

// MARK: - Total Stats Response
struct TotalStatsResponse: Codable {
    let dimension: String
    let summary: TotalStatsSummary
}

// MARK: - Calendar Day
struct CalendarDay: Identifiable, Codable {
    var id: String { date }
    let date: String
    let duration: Int
    let hasReading: Bool
}

// MARK: - Reading Milestone
struct ReadingMilestone: Identifiable, Codable {
    let id: Int
    let date: String?
    let type: String
    let title: String
    let value: Int?
    let bookTitle: String?
}

// MARK: - Calendar Stats Response
struct CalendarStatsResponse: Codable {
    let dimension: String
    let year: Int
    let month: Int
    let calendarDays: [CalendarDay]
    let milestones: [ReadingMilestone]
}

// MARK: - Month Duration
struct MonthDuration: Identifiable, Codable {
    var id: Int { month }
    let month: Int
    let duration: Int
    let readingDays: Int
}

// MARK: - Year Stats Response
struct YearStatsResponse: Codable {
    let dimension: String
    let year: Int
    let summary: YearStatsSummary
    let durationByMonth: [MonthDuration]
}

struct YearStatsSummary: Codable {
    let totalDuration: Int
    let monthlyAverage: Int
    let totalReadingDays: Int
}

// MARK: - Leaderboard Models

struct LeaderboardResponse: Codable {
    let data: LeaderboardData
}

struct LeaderboardData: Codable {
    let weekRange: WeekRange
    let myRanking: MyRanking?
    let entries: [LeaderboardEntry]
    let totalParticipants: Int
}

struct WeekRange: Codable {
    let start: String
    let end: String
    let settlementTime: String
}

struct MyRanking: Codable {
    let rank: Int
    let duration: Int
    let rankChange: Int
    let readingDays: Int

    var formattedDuration: String {
        let hours = duration / 3600
        let minutes = (duration % 3600) / 60

        if hours > 0 {
            return "\(hours)h \(minutes)m"
        } else {
            return "\(minutes)m"
        }
    }

    var rankChangeText: String {
        if rankChange > 0 {
            return "↑\(rankChange)"
        } else if rankChange < 0 {
            return "↓\(abs(rankChange))"
        }
        return "-"
    }
}

struct LeaderboardEntry: Codable, Identifiable {
    let rank: Int?
    let user: LeaderboardUser
    let duration: Int
    let readingDays: Int
    let rankChange: Int
    let likesCount: Int
    let isLiked: Bool

    var id: Int { user.id }

    var formattedDuration: String {
        let hours = duration / 3600
        let minutes = (duration % 3600) / 60

        if hours > 0 {
            return "\(hours)h \(minutes)m"
        } else {
            return "\(minutes)m"
        }
    }

    var rankChangeText: String {
        if rankChange > 0 {
            return "↑\(rankChange)"
        } else if rankChange < 0 {
            return "↓\(abs(rankChange))"
        }
        return "-"
    }

    var rankChangeColor: String {
        if rankChange > 0 { return "green" }
        if rankChange < 0 { return "red" }
        return "gray"
    }
}

struct LeaderboardUser: Codable, Identifiable {
    let id: Int
    let username: String
    let avatar: String?
}

struct LeaderboardLikeResponse: Codable {
    let data: LeaderboardLikeResult
}

struct LeaderboardLikeResult: Codable {
    let success: Bool
}
