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
    let totalBookDuration: Double  // API may return String or Number
    let isPaused: Bool?

    // Convenience property to get Int value
    var totalBookDurationSeconds: Int {
        Int(totalBookDuration)
    }

    // Custom decoding to handle String or Number for totalBookDuration
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        sessionId = try container.decode(Int.self, forKey: .sessionId)
        durationSeconds = try container.decode(Int.self, forKey: .durationSeconds)
        todayDuration = try container.decode(Int.self, forKey: .todayDuration)
        isPaused = try container.decodeIfPresent(Bool.self, forKey: .isPaused)

        // Try decoding as Double first, then as String
        if let doubleValue = try? container.decode(Double.self, forKey: .totalBookDuration) {
            totalBookDuration = doubleValue
        } else if let stringValue = try? container.decode(String.self, forKey: .totalBookDuration),
                  let doubleValue = Double(stringValue) {
            totalBookDuration = doubleValue
        } else {
            totalBookDuration = 0
        }
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
    let totalBookDuration: Double  // API may return String or Number
    let todayDuration: Int
    let milestonesAchieved: [Milestone]

    // Convenience property to get Int value
    var totalBookDurationSeconds: Int {
        Int(totalBookDuration)
    }

    // Custom decoding to handle String or Number for totalBookDuration
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        sessionId = try container.decode(Int.self, forKey: .sessionId)
        durationSeconds = try container.decode(Int.self, forKey: .durationSeconds)
        todayDuration = try container.decode(Int.self, forKey: .todayDuration)
        milestonesAchieved = try container.decodeIfPresent([Milestone].self, forKey: .milestonesAchieved) ?? []

        // Try decoding as Double first, then as String
        if let doubleValue = try? container.decode(Double.self, forKey: .totalBookDuration) {
            totalBookDuration = doubleValue
        } else if let stringValue = try? container.decode(String.self, forKey: .totalBookDuration),
                  let doubleValue = Double(stringValue) {
            totalBookDuration = doubleValue
        } else {
            totalBookDuration = 0
        }
    }
}

// MARK: - Today Duration Response
struct TodayDurationResponse: Codable {
    let todayDuration: Int
    let formattedDuration: String
}
