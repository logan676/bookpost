/**
 * Badge Models
 * Data models for the badge/achievement system
 */

import Foundation
import SwiftUI

// MARK: - Badge Tier (Material Level)
enum BadgeTier: String, Codable, CaseIterable {
    case gold
    case silver
    case bronze
    case iron

    var displayName: String {
        switch self {
        case .gold: return "Gold"
        case .silver: return "Silver"
        case .bronze: return "Bronze"
        case .iron: return "Iron"
        }
    }

    /// Metal gradient colors
    var gradientColors: [Color] {
        switch self {
        case .gold:
            return [
                Color(red: 1.0, green: 0.84, blue: 0.0),    // #FFD700
                Color(red: 1.0, green: 0.65, blue: 0.0),    // #FFA500
                Color(red: 0.72, green: 0.53, blue: 0.04)   // #B8860B
            ]
        case .silver:
            return [
                Color(red: 0.85, green: 0.87, blue: 0.90),  // Light silver
                Color(red: 0.75, green: 0.75, blue: 0.75),  // #C0C0C0
                Color(red: 0.55, green: 0.55, blue: 0.58)   // Dark silver
            ]
        case .bronze:
            return [
                Color(red: 0.80, green: 0.60, blue: 0.40),  // Light bronze
                Color(red: 0.72, green: 0.45, blue: 0.20),  // #CD7F32
                Color(red: 0.55, green: 0.35, blue: 0.15)   // Dark bronze
            ]
        case .iron:
            return [
                Color(red: 0.55, green: 0.55, blue: 0.55),  // Light iron
                Color(red: 0.40, green: 0.40, blue: 0.42),  // Medium iron
                Color(red: 0.28, green: 0.28, blue: 0.30)   // Dark iron
            ]
        }
    }

    /// Border color
    var borderColor: Color {
        switch self {
        case .gold: return Color(red: 0.85, green: 0.65, blue: 0.13)
        case .silver: return Color(red: 0.65, green: 0.65, blue: 0.70)
        case .bronze: return Color(red: 0.60, green: 0.40, blue: 0.20)
        case .iron: return Color(red: 0.35, green: 0.35, blue: 0.38)
        }
    }
}

// MARK: - Badge Rarity
enum BadgeRarity: String, Codable, CaseIterable {
    case legendary
    case epic
    case rare
    case common

    var displayName: String {
        switch self {
        case .legendary: return "Legendary"
        case .epic: return "Epic"
        case .rare: return "Rare"
        case .common: return "Common"
        }
    }

    var icon: String {
        switch self {
        case .legendary: return "★"
        case .epic: return "★"
        case .rare: return "★"
        case .common: return "★"
        }
    }

    var color: Color {
        switch self {
        case .legendary: return Color(red: 1.0, green: 0.84, blue: 0.0)  // Gold
        case .epic: return Color(red: 0.75, green: 0.75, blue: 0.80)     // Silver
        case .rare: return Color(red: 0.72, green: 0.45, blue: 0.20)     // Bronze
        case .common: return Color(red: 0.50, green: 0.50, blue: 0.52)   // Iron
        }
    }

    /// Corresponding material tier
    var tier: BadgeTier {
        switch self {
        case .legendary: return .gold
        case .epic: return .silver
        case .rare: return .bronze
        case .common: return .iron
        }
    }
}

// MARK: - Badge Requirement
struct BadgeRequirement: Identifiable, Codable {
    let id: Int
    let description: String
    let current: Int
    let target: Int

    var isCompleted: Bool {
        current >= target
    }

    var percentage: Double {
        guard target > 0 else { return 0 }
        return min(Double(current) / Double(target) * 100, 100)
    }

    // Provides default ID during decoding
    enum CodingKeys: String, CodingKey {
        case id, description, current, target
    }

    init(id: Int, description: String, current: Int, target: Int) {
        self.id = id
        self.description = description
        self.current = current
        self.target = target
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = try container.decodeIfPresent(Int.self, forKey: .id) ?? UUID().hashValue
        self.description = try container.decode(String.self, forKey: .description)
        self.current = try container.decode(Int.self, forKey: .current)
        self.target = try container.decode(Int.self, forKey: .target)
    }
}

// MARK: - Badge Category
enum BadgeCategory: String, Codable, CaseIterable {
    case readingStreak = "reading_streak"
    case readingDuration = "reading_duration"
    case readingDays = "reading_days"
    case booksFinished = "books_finished"
    case weeklyChallenge = "weekly_challenge"
    case monthlyChallenge = "monthly_challenge"
    case social = "social"
    case special = "special"
    case earlyBird = "early_bird"
    case nightOwl = "night_owl"
    case speedReader = "speed_reader"
    case reviewer = "reviewer"
    case collector = "collector"
    case explorer = "explorer"
    case milestone = "milestone"
    case seasonal = "seasonal"
    // New categories for 100-badge system
    case timeHabit = "time_habit"
    case genre = "genre"
    case achievement = "achievement"
    case persistence = "persistence"
    case series = "series"

    var displayName: String {
        switch self {
        case .readingStreak: return L10n.Badges.categoryReadingStreak
        case .readingDuration: return L10n.Badges.categoryReadingDuration
        case .readingDays: return L10n.Badges.categoryReadingDays
        case .booksFinished: return L10n.Badges.categoryBooksFinished
        case .weeklyChallenge: return L10n.Badges.categoryWeeklyChallenge
        case .monthlyChallenge: return L10n.Badges.categoryMonthlyChallenge
        case .social: return L10n.Badges.categorySocial
        case .special: return L10n.Badges.categorySpecial
        case .earlyBird: return L10n.Badges.categoryEarlyBird
        case .nightOwl: return L10n.Badges.categoryNightOwl
        case .speedReader: return L10n.Badges.categorySpeedReader
        case .reviewer: return L10n.Badges.categoryReviewer
        case .collector: return L10n.Badges.categoryCollector
        case .explorer: return L10n.Badges.categoryExplorer
        case .milestone: return L10n.Badges.categoryMilestone
        case .seasonal: return L10n.Badges.categorySeasonal
        case .timeHabit: return L10n.Badges.categoryTimeHabit
        case .genre: return L10n.Badges.categoryGenre
        case .achievement: return L10n.Badges.categoryAchievement
        case .persistence: return L10n.Badges.categoryPersistence
        case .series: return L10n.Badges.categorySeries
        }
    }

    var icon: String {
        switch self {
        case .readingStreak: return "flame.fill"
        case .readingDuration: return "clock.fill"
        case .readingDays: return "calendar"
        case .booksFinished: return "book.closed.fill"
        case .weeklyChallenge: return "star.fill"
        case .monthlyChallenge: return "crown.fill"
        case .social: return "person.2.fill"
        case .special: return "sparkles"
        case .earlyBird: return "sunrise.fill"
        case .nightOwl: return "moon.stars.fill"
        case .speedReader: return "hare.fill"
        case .reviewer: return "text.bubble.fill"
        case .collector: return "bookmark.fill"
        case .explorer: return "safari.fill"
        case .milestone: return "flag.checkered"
        case .seasonal: return "gift.fill"
        case .timeHabit: return "clock.arrow.2.circlepath"
        case .genre: return "books.vertical.fill"
        case .achievement: return "trophy.fill"
        case .persistence: return "arrow.uturn.up.circle.fill"
        case .series: return "rectangle.stack.fill"
        }
    }

    /// Badge category color for consistent styling across the app
    var color: Color {
        switch self {
        case .readingStreak: return .orange
        case .readingDuration: return .blue
        case .readingDays: return .green
        case .booksFinished: return .purple
        case .weeklyChallenge: return .cyan
        case .monthlyChallenge: return .yellow
        case .social: return .pink
        case .special: return .indigo
        case .earlyBird: return Color(red: 1.0, green: 0.6, blue: 0.2)  // Warm sunrise
        case .nightOwl: return Color(red: 0.3, green: 0.3, blue: 0.6)   // Deep night blue
        case .speedReader: return Color(red: 0.2, green: 0.8, blue: 0.4) // Fast green
        case .reviewer: return Color(red: 0.4, green: 0.7, blue: 0.9)   // Sky blue
        case .collector: return Color(red: 0.8, green: 0.5, blue: 0.2)  // Bronze
        case .explorer: return Color(red: 0.2, green: 0.6, blue: 0.5)   // Teal
        case .milestone: return Color(red: 0.9, green: 0.7, blue: 0.1)  // Gold
        case .seasonal: return Color(red: 0.6, green: 0.8, blue: 0.3)   // Fresh green
        case .timeHabit: return Color(red: 0.5, green: 0.4, blue: 0.7)  // Purple tint
        case .genre: return Color(red: 0.3, green: 0.6, blue: 0.8)      // Book blue
        case .achievement: return Color(red: 0.9, green: 0.5, blue: 0.1) // Trophy orange
        case .persistence: return Color(red: 0.4, green: 0.7, blue: 0.4) // Resilient green
        case .series: return Color(red: 0.6, green: 0.4, blue: 0.6)     // Series purple
        }
    }
}

// MARK: - Badge
struct Badge: Identifiable, Codable {
    let id: Int
    let category: String
    let level: Int
    let name: String
    let description: String?
    let requirement: String?
    let iconUrl: String?
    let backgroundColor: String?
    let earnedCount: Int

    // New fields (optional, backend may not support yet)
    let tier: String?
    let rarity: String?
    let lore: String?
    let requirements: [BadgeRequirement]?
    let xpValue: Int?
    let startDate: String?

    var badgeCategory: BadgeCategory {
        BadgeCategory(rawValue: category) ?? .special
    }

    /// Badge material tier (calculated based on rarity or level)
    var badgeTier: BadgeTier {
        if let tierStr = tier, let t = BadgeTier(rawValue: tierStr) {
            return t
        }
        // Infer material from level
        switch level {
        case 5...: return .gold
        case 3...4: return .silver
        case 2: return .bronze
        default: return .iron
        }
    }

    /// Badge rarity (calculated based on rarity or earnedCount)
    var badgeRarity: BadgeRarity {
        if let rarityStr = rarity, let r = BadgeRarity(rawValue: rarityStr) {
            return r
        }
        // Infer rarity from earnedCount
        if earnedCount < 100 { return .legendary }
        if earnedCount < 500 { return .epic }
        if earnedCount < 2000 { return .rare }
        return .common
    }

    /// Get requirements list (if backend doesn't provide, generate from single requirement)
    var badgeRequirements: [BadgeRequirement] {
        if let reqs = requirements, !reqs.isEmpty {
            return reqs
        }
        // Backward compatibility: convert single requirement to list
        if let req = requirement {
            return [BadgeRequirement(id: 0, description: req, current: 0, target: 1)]
        }
        return []
    }

    // Custom decoding to support optional new fields
    enum CodingKeys: String, CodingKey {
        case id, category, level, name, description, requirement
        case iconUrl, backgroundColor, earnedCount
        case tier, rarity, lore, requirements, xpValue, startDate
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(Int.self, forKey: .id)
        category = try container.decode(String.self, forKey: .category)
        level = try container.decode(Int.self, forKey: .level)
        name = try container.decode(String.self, forKey: .name)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        requirement = try container.decodeIfPresent(String.self, forKey: .requirement)
        iconUrl = try container.decodeIfPresent(String.self, forKey: .iconUrl)
        backgroundColor = try container.decodeIfPresent(String.self, forKey: .backgroundColor)
        earnedCount = try container.decodeIfPresent(Int.self, forKey: .earnedCount) ?? 0
        // New fields
        tier = try container.decodeIfPresent(String.self, forKey: .tier)
        rarity = try container.decodeIfPresent(String.self, forKey: .rarity)
        lore = try container.decodeIfPresent(String.self, forKey: .lore)
        requirements = try container.decodeIfPresent([BadgeRequirement].self, forKey: .requirements)
        xpValue = try container.decodeIfPresent(Int.self, forKey: .xpValue)
        startDate = try container.decodeIfPresent(String.self, forKey: .startDate)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(category, forKey: .category)
        try container.encode(level, forKey: .level)
        try container.encode(name, forKey: .name)
        try container.encodeIfPresent(description, forKey: .description)
        try container.encodeIfPresent(requirement, forKey: .requirement)
        try container.encodeIfPresent(iconUrl, forKey: .iconUrl)
        try container.encodeIfPresent(backgroundColor, forKey: .backgroundColor)
        try container.encode(earnedCount, forKey: .earnedCount)
        try container.encodeIfPresent(tier, forKey: .tier)
        try container.encodeIfPresent(rarity, forKey: .rarity)
        try container.encodeIfPresent(lore, forKey: .lore)
        try container.encodeIfPresent(requirements, forKey: .requirements)
        try container.encodeIfPresent(xpValue, forKey: .xpValue)
        try container.encodeIfPresent(startDate, forKey: .startDate)
    }
}

// MARK: - Earned Badge
struct EarnedBadge: Identifiable, Codable {
    let id: Int
    let category: String
    let level: Int
    let name: String
    let description: String?
    let requirement: String?
    let iconUrl: String?
    let backgroundColor: String?
    let earnedAt: String
    let earnedCount: Int

    // New fields (optional, backend may not support yet)
    let tier: String?
    let rarity: String?
    let lore: String?
    let requirements: [BadgeRequirement]?
    let xpValue: Int?
    let startDate: String?

    var earnedDate: Date? {
        ISO8601DateFormatter().date(from: earnedAt)
    }

    var badgeCategory: BadgeCategory {
        BadgeCategory(rawValue: category) ?? .special
    }

    /// Badge material tier
    var badgeTier: BadgeTier {
        if let tierStr = tier, let t = BadgeTier(rawValue: tierStr) {
            return t
        }
        switch level {
        case 5...: return .gold
        case 3...4: return .silver
        case 2: return .bronze
        default: return .iron
        }
    }

    /// Badge rarity
    var badgeRarity: BadgeRarity {
        if let rarityStr = rarity, let r = BadgeRarity(rawValue: rarityStr) {
            return r
        }
        if earnedCount < 100 { return .legendary }
        if earnedCount < 500 { return .epic }
        if earnedCount < 2000 { return .rare }
        return .common
    }

    /// Get requirements list
    var badgeRequirements: [BadgeRequirement] {
        if let reqs = requirements, !reqs.isEmpty {
            return reqs
        }
        if let req = requirement {
            // Completed badge, show requirement progress as completed
            return [BadgeRequirement(id: 0, description: req, current: 1, target: 1)]
        }
        return []
    }

    /// Start date
    var badgeStartDate: Date? {
        guard let dateStr = startDate else { return nil }
        return ISO8601DateFormatter().date(from: dateStr)
    }

    // Member initializer (for Preview and manual creation)
    init(
        id: Int,
        category: String,
        level: Int,
        name: String,
        description: String? = nil,
        requirement: String? = nil,
        iconUrl: String? = nil,
        backgroundColor: String? = nil,
        earnedAt: String,
        earnedCount: Int = 0,
        tier: String? = nil,
        rarity: String? = nil,
        lore: String? = nil,
        requirements: [BadgeRequirement]? = nil,
        xpValue: Int? = nil,
        startDate: String? = nil
    ) {
        self.id = id
        self.category = category
        self.level = level
        self.name = name
        self.description = description
        self.requirement = requirement
        self.iconUrl = iconUrl
        self.backgroundColor = backgroundColor
        self.earnedAt = earnedAt
        self.earnedCount = earnedCount
        self.tier = tier
        self.rarity = rarity
        self.lore = lore
        self.requirements = requirements
        self.xpValue = xpValue
        self.startDate = startDate
    }

    // Custom decoding
    enum CodingKeys: String, CodingKey {
        case id, category, level, name, description, requirement
        case iconUrl, backgroundColor, earnedAt, earnedCount
        case tier, rarity, lore, requirements, xpValue, startDate
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(Int.self, forKey: .id)
        category = try container.decode(String.self, forKey: .category)
        level = try container.decode(Int.self, forKey: .level)
        name = try container.decode(String.self, forKey: .name)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        requirement = try container.decodeIfPresent(String.self, forKey: .requirement)
        iconUrl = try container.decodeIfPresent(String.self, forKey: .iconUrl)
        backgroundColor = try container.decodeIfPresent(String.self, forKey: .backgroundColor)
        earnedAt = try container.decode(String.self, forKey: .earnedAt)
        earnedCount = try container.decodeIfPresent(Int.self, forKey: .earnedCount) ?? 0
        // New fields
        tier = try container.decodeIfPresent(String.self, forKey: .tier)
        rarity = try container.decodeIfPresent(String.self, forKey: .rarity)
        lore = try container.decodeIfPresent(String.self, forKey: .lore)
        requirements = try container.decodeIfPresent([BadgeRequirement].self, forKey: .requirements)
        xpValue = try container.decodeIfPresent(Int.self, forKey: .xpValue)
        startDate = try container.decodeIfPresent(String.self, forKey: .startDate)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(category, forKey: .category)
        try container.encode(level, forKey: .level)
        try container.encode(name, forKey: .name)
        try container.encodeIfPresent(description, forKey: .description)
        try container.encodeIfPresent(requirement, forKey: .requirement)
        try container.encodeIfPresent(iconUrl, forKey: .iconUrl)
        try container.encodeIfPresent(backgroundColor, forKey: .backgroundColor)
        try container.encode(earnedAt, forKey: .earnedAt)
        try container.encode(earnedCount, forKey: .earnedCount)
        try container.encodeIfPresent(tier, forKey: .tier)
        try container.encodeIfPresent(rarity, forKey: .rarity)
        try container.encodeIfPresent(lore, forKey: .lore)
        try container.encodeIfPresent(requirements, forKey: .requirements)
        try container.encodeIfPresent(xpValue, forKey: .xpValue)
        try container.encodeIfPresent(startDate, forKey: .startDate)
    }
}

// MARK: - Badge Progress
struct BadgeProgress: Codable {
    let current: Int
    let target: Int
    let percentage: Double
    let remaining: String
}

// MARK: - Badge With Progress
struct BadgeWithProgress: Identifiable, Codable {
    let badge: Badge
    let progress: BadgeProgress

    var id: Int { badge.id }
}

// MARK: - Category Summary
struct CategorySummary: Codable {
    let earned: Int
    let total: Int

    var percentage: Double {
        guard total > 0 else { return 0 }
        return Double(earned) / Double(total) * 100
    }
}

// MARK: - User Badges Response
struct UserBadgesResponse: Codable {
    let earned: [EarnedBadge]
    let inProgress: [BadgeWithProgress]
    let categories: [String: CategorySummary]
}

// MARK: - All Badges Response
typealias AllBadgesResponse = [String: [Badge]]

// MARK: - New Badges Response
struct NewBadgesResponse: Codable {
    let newBadges: [EarnedBadge]
}
