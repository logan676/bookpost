/**
 * Social Models
 * Data models for following, profiles, and activity feed
 */

import Foundation

// MARK: - User Profile

struct UserProfileResponse: Codable {
    let data: UserProfileData
}

struct UserProfileData: Codable {
    let profile: UserProfile
    let followStats: FollowStats
}

struct UserProfile: Codable, Identifiable {
    let id: Int
    let username: String
    let avatar: String?
    let totalReadingDuration: Int
    let booksFinishedCount: Int
    let currentStreakDays: Int

    var formattedReadingDuration: String {
        let hours = totalReadingDuration / 3600
        if hours > 0 {
            return "\(hours)h"
        }
        let minutes = totalReadingDuration / 60
        return "\(minutes)m"
    }
}

struct FollowStats: Codable {
    let followersCount: Int
    let followingCount: Int
    let isFollowing: Bool
    let isFollowedBy: Bool
}

// MARK: - Following/Followers List

struct FollowListResponse: Codable {
    let data: [FollowUser]
    let total: Int
    let hasMore: Bool
}

struct FollowUser: Codable, Identifiable {
    let id: Int
    let username: String
    let avatar: String?
    let isFollowing: Bool
    let followedAt: String

    var followedDate: Date? {
        ISO8601DateFormatter().date(from: followedAt)
    }
}

// MARK: - Follow/Unfollow Response

struct FollowActionResponse: Codable {
    let data: FollowActionResult
}

struct FollowActionResult: Codable {
    let success: Bool
}

// MARK: - Activity Feed

struct ActivityFeedResponse: Codable {
    let data: [ActivityItem]
    let hasMore: Bool
}

struct ActivityItem: Codable, Identifiable {
    let id: Int
    let userId: Int
    let user: ActivityUser
    let activityType: String
    let bookType: String?
    let bookId: Int?
    let bookTitle: String?
    let badgeId: Int?
    let badgeName: String?
    let metadata: [String: AnyCodable]?
    let likesCount: Int
    let commentsCount: Int
    let isLiked: Bool
    let createdAt: String

    var createdDate: Date? {
        ISO8601DateFormatter().date(from: createdAt)
    }

    var activityDescription: String {
        switch activityType {
        case "started_reading":
            return "开始阅读 \(bookTitle ?? "一本书")"
        case "finished_book":
            return "读完了 \(bookTitle ?? "一本书")"
        case "earned_badge":
            return "获得了徽章 \(badgeName ?? "")"
        case "wrote_review":
            return "评论了 \(bookTitle ?? "一本书")"
        case "reached_milestone":
            return "达成了新的阅读里程碑"
        default:
            return activityType
        }
    }

    var activityIcon: String {
        switch activityType {
        case "started_reading": return "book"
        case "finished_book": return "checkmark.circle.fill"
        case "earned_badge": return "medal.fill"
        case "wrote_review": return "text.bubble.fill"
        case "reached_milestone": return "star.fill"
        default: return "circle"
        }
    }

    var activityColor: String {
        switch activityType {
        case "started_reading": return "blue"
        case "finished_book": return "green"
        case "earned_badge": return "orange"
        case "wrote_review": return "purple"
        case "reached_milestone": return "yellow"
        default: return "gray"
        }
    }
}

struct ActivityUser: Codable, Identifiable {
    let id: Int
    let username: String
    let avatar: String?
}

// MARK: - Activity Like Response

struct ActivityLikeResponse: Codable {
    let data: ActivityLikeResult
}

struct ActivityLikeResult: Codable {
    let liked: Bool
    let likesCount: Int
}

// MARK: - AnyCodable helper for metadata

struct AnyCodable: Codable {
    let value: Any

    init(_ value: Any) {
        self.value = value
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if container.decodeNil() {
            value = NSNull()
        } else if let bool = try? container.decode(Bool.self) {
            value = bool
        } else if let int = try? container.decode(Int.self) {
            value = int
        } else if let double = try? container.decode(Double.self) {
            value = double
        } else if let string = try? container.decode(String.self) {
            value = string
        } else if let array = try? container.decode([AnyCodable].self) {
            value = array.map { $0.value }
        } else if let dict = try? container.decode([String: AnyCodable].self) {
            value = dict.mapValues { $0.value }
        } else {
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Cannot decode value")
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        switch value {
        case is NSNull:
            try container.encodeNil()
        case let bool as Bool:
            try container.encode(bool)
        case let int as Int:
            try container.encode(int)
        case let double as Double:
            try container.encode(double)
        case let string as String:
            try container.encode(string)
        case let array as [Any]:
            try container.encode(array.map { AnyCodable($0) })
        case let dict as [String: Any]:
            try container.encode(dict.mapValues { AnyCodable($0) })
        default:
            throw EncodingError.invalidValue(value, EncodingError.Context(codingPath: container.codingPath, debugDescription: "Cannot encode value"))
        }
    }
}
