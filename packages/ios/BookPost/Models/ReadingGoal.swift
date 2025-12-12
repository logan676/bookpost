/**
 * Reading Goal Models
 * Data models for daily reading goals and progress
 */

import Foundation

// MARK: - Daily Goal
struct DailyGoal: Codable, Identifiable {
    let id: Int
    let targetMinutes: Int
    let currentMinutes: Int
    let progress: Int
    let isCompleted: Bool

    var progressPercentage: Double {
        Double(progress) / 100.0
    }

    var remainingMinutes: Int {
        max(0, targetMinutes - currentMinutes)
    }

    var formattedTarget: String {
        if targetMinutes >= 60 {
            let hours = targetMinutes / 60
            let mins = targetMinutes % 60
            return mins > 0 ? "\(hours)h \(mins)m" : "\(hours)h"
        }
        return "\(targetMinutes)m"
    }

    var formattedCurrent: String {
        if currentMinutes >= 60 {
            let hours = currentMinutes / 60
            let mins = currentMinutes % 60
            return mins > 0 ? "\(hours)h \(mins)m" : "\(hours)h"
        }
        return "\(currentMinutes)m"
    }
}

// MARK: - Streak Info
struct StreakInfo: Codable {
    let current: Int
    let max: Int
}

// MARK: - Daily Goal Response
struct DailyGoalResponse: Codable {
    let hasGoal: Bool
    let goal: DailyGoal?
    let streak: StreakInfo
}

// MARK: - Set Goal Request
struct SetGoalRequest: Codable {
    let targetMinutes: Int
}

// MARK: - Set Goal Response
struct SetGoalResponse: Codable {
    let targetMinutes: Int
    let message: String
}

// MARK: - Goal Presets
enum GoalPreset: Int, CaseIterable, Identifiable {
    case light = 15
    case moderate = 30
    case dedicated = 60
    case intensive = 90

    var id: Int { rawValue }

    var label: String {
        switch self {
        case .light: return "15 min"
        case .moderate: return "30 min"
        case .dedicated: return "1 hour"
        case .intensive: return "1.5 hours"
        }
    }

    var description: String {
        switch self {
        case .light: return "A quick read"
        case .moderate: return "Building a habit"
        case .dedicated: return "Serious reader"
        case .intensive: return "Book lover"
        }
    }
}
