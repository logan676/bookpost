/**
 * Reading Session Models
 * Data models for reading session tracking
 */

import Foundation

// MARK: - Reading Session
struct ReadingSession: Identifiable, Codable {
    let id: Int
    let bookId: Int
    let bookType: String
    let startTime: String
    var durationSeconds: Int

    var startDate: Date? {
        ISO8601DateFormatter().date(from: startTime)
    }

    var formattedDuration: String {
        let hours = durationSeconds / 3600
        let minutes = (durationSeconds % 3600) / 60

        if hours > 0 {
            return "\(hours)h \(minutes)m"
        } else {
            return "\(minutes)m"
        }
    }
}

// MARK: - Start Session Request
struct StartSessionRequest: Codable {
    let bookId: Int
    let bookType: String
    let position: String?
    let chapterIndex: Int?
    let deviceType: String?
    let deviceId: String?
}

// MARK: - Start Session Response
struct StartSessionResponse: Codable {
    let sessionId: Int
    let startTime: String
}

// MARK: - Heartbeat Request
struct HeartbeatRequest: Codable {
    let currentPosition: String?
    let chapterIndex: Int?
    let pagesRead: Int?
}

// MARK: - Heartbeat Response
struct HeartbeatResponse: Codable {
    let sessionId: Int
    let durationSeconds: Int
    let todayDuration: Int
    let totalBookDuration: Double  // API returns Double
    let isPaused: Bool?

    // Convenience property to get Int value
    var totalBookDurationSeconds: Int {
        Int(totalBookDuration)
    }
}

// MARK: - Pause/Resume Response
struct PauseResumeResponse: Codable {
    let sessionId: Int
    let isPaused: Bool
}

// MARK: - End Session Request
struct EndSessionRequest: Codable {
    let endPosition: String?
    let chapterIndex: Int?
    let pagesRead: Int?
}

// MARK: - Milestone
struct Milestone: Identifiable, Codable {
    var id: String { "\(type)_\(value)" }
    let type: String
    let value: Int
    let title: String
}

// MARK: - End Session Response
struct EndSessionResponse: Codable {
    let sessionId: Int
    let durationSeconds: Int
    let totalBookDuration: Double  // API returns Double
    let todayDuration: Int
    let milestonesAchieved: [Milestone]

    // Convenience property to get Int value
    var totalBookDurationSeconds: Int {
        Int(totalBookDuration)
    }
}

// MARK: - Today Duration Response
struct TodayDurationResponse: Codable {
    let todayDuration: Int
    let formattedDuration: String
}
