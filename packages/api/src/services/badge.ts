/**
 * Badge Service
 * Handles badge definitions, user badge awards, and progress tracking
 */

import { db } from '../db/client'
import { badges, userBadges, users } from '../db/schema'
import { eq, sql, asc } from 'drizzle-orm'

// Badge condition types
export type BadgeConditionType =
  | 'streak_days'      // 连续阅读天数
  | 'max_streak_days'  // 最长连续阅读
  | 'total_hours'      // 累计阅读小时
  | 'total_days'       // 累计阅读天数
  | 'books_finished'   // 读完书籍数
  | 'books_read'       // 阅读书籍数
  | 'weekly_perfect'   // 完美阅读周
  | 'monthly_perfect'  // 完美阅读月
  | 'likes_received'   // 收到的赞
  | 'reviews_written'  // 点评书籍数

// Badge categories
export type BadgeCategory =
  | 'reading_streak'     // 连续阅读
  | 'reading_duration'   // 阅读时长
  | 'reading_days'       // 阅读天数
  | 'books_finished'     // 读完书籍
  | 'weekly_challenge'   // 每周挑战
  | 'monthly_challenge'  // 每月挑战
  | 'social'             // 社交互动
  | 'special'            // 特殊勋章

interface BadgeProgress {
  badge: {
    id: number
    category: string
    level: number
    name: string
    description: string | null
    requirement: string | null
    iconUrl: string | null
    backgroundColor: string | null
    earnedCount: number
  }
  progress: {
    current: number
    target: number
    percentage: number
    remaining: string
  }
}

interface EarnedBadge {
  id: number
  category: string
  level: number
  name: string
  description: string | null
  requirement: string | null
  iconUrl: string | null
  backgroundColor: string | null
  earnedAt: Date
  earnedCount: number
}

class BadgeService {
  /**
   * Get all badges for a user (earned + in progress)
   */
  async getUserBadges(userId: number) {
    // Get user's current stats
    const [user] = await db.select().from(users).where(eq(users.id, userId))
    if (!user) throw new Error('User not found')

    // Get all active badges
    const allBadges = await db
      .select()
      .from(badges)
      .where(eq(badges.isActive, true))
      .orderBy(asc(badges.category), asc(badges.level))

    // Get user's earned badges
    const earnedBadges = await db
      .select({
        badgeId: userBadges.badgeId,
        earnedAt: userBadges.earnedAt,
      })
      .from(userBadges)
      .where(eq(userBadges.userId, userId))

    const earnedBadgeIds = new Set(earnedBadges.map((b) => b.badgeId))
    const earnedBadgeMap = new Map(
      earnedBadges.map((b) => [b.badgeId, b.earnedAt])
    )

    // Categorize badges
    const earned: EarnedBadge[] = []
    const inProgress: BadgeProgress[] = []

    for (const badge of allBadges) {
      if (earnedBadgeIds.has(badge.id)) {
        // Already earned
        earned.push({
          id: badge.id,
          category: badge.category,
          level: badge.level || 1,
          name: badge.name,
          description: badge.description,
          requirement: badge.requirement,
          iconUrl: badge.iconUrl,
          backgroundColor: badge.backgroundColor,
          earnedAt: earnedBadgeMap.get(badge.id)!,
          earnedCount: badge.earnedCount || 0,
        })
      } else {
        // In progress - calculate current progress
        const progress = this.calculateProgress(user, badge)
        if (progress) {
          inProgress.push({
            badge: {
              id: badge.id,
              category: badge.category,
              level: badge.level || 1,
              name: badge.name,
              description: badge.description,
              requirement: badge.requirement,
              iconUrl: badge.iconUrl,
              backgroundColor: badge.backgroundColor,
              earnedCount: badge.earnedCount || 0,
            },
            progress,
          })
        }
      }
    }

    // Calculate category summary
    const categories: Record<string, { earned: number; total: number }> = {}
    for (const badge of allBadges) {
      if (!categories[badge.category]) {
        categories[badge.category] = { earned: 0, total: 0 }
      }
      categories[badge.category].total++
      if (earnedBadgeIds.has(badge.id)) {
        categories[badge.category].earned++
      }
    }

    return {
      earned,
      inProgress,
      categories,
    }
  }

  /**
   * Calculate progress for a badge
   */
  private calculateProgress(
    user: typeof users.$inferSelect,
    badge: typeof badges.$inferSelect
  ): { current: number; target: number; percentage: number; remaining: string } | null {
    const target = badge.conditionValue
    let current = 0

    switch (badge.conditionType) {
      case 'streak_days':
        current = user.currentStreakDays || 0
        break
      case 'max_streak_days':
        current = user.maxStreakDays || 0
        break
      case 'total_hours':
        current = Math.floor((user.totalReadingDuration || 0) / 3600)
        break
      case 'total_days':
        current = user.totalReadingDays || 0
        break
      case 'books_finished':
        current = user.booksFinishedCount || 0
        break
      case 'books_read':
        current = user.booksReadCount || 0
        break
      default:
        return null
    }

    const percentage = Math.min(100, (current / target) * 100)
    const remaining = this.formatRemaining(badge.conditionType, target - current)

    return {
      current,
      target,
      percentage: Math.round(percentage * 10) / 10,
      remaining,
    }
  }

  /**
   * Format remaining text
   */
  private formatRemaining(conditionType: string, remaining: number): string {
    if (remaining <= 0) return 'Achieved'

    switch (conditionType) {
      case 'streak_days':
      case 'max_streak_days':
      case 'total_days':
        return `${remaining} more day${remaining === 1 ? '' : 's'} to earn`
      case 'total_hours':
        return `${remaining} more hour${remaining === 1 ? '' : 's'} to earn`
      case 'books_finished':
      case 'books_read':
        return `${remaining} more book${remaining === 1 ? '' : 's'} to earn`
      default:
        return `${remaining} more to earn`
    }
  }

  /**
   * Check and award badges for a user
   */
  async checkAndAwardBadges(userId: number): Promise<EarnedBadge[]> {
    const [user] = await db.select().from(users).where(eq(users.id, userId))
    if (!user) return []

    // Get all active badges not yet earned
    const allBadges = await db.select().from(badges).where(eq(badges.isActive, true))

    const earnedBadgeIds = await db
      .select({ badgeId: userBadges.badgeId })
      .from(userBadges)
      .where(eq(userBadges.userId, userId))

    const earnedSet = new Set(earnedBadgeIds.map((b) => b.badgeId))
    const newlyEarned: EarnedBadge[] = []

    for (const badge of allBadges) {
      if (earnedSet.has(badge.id)) continue

      const qualified = this.checkBadgeQualification(user, badge)
      if (qualified) {
        // Award the badge
        await db.insert(userBadges).values({
          userId,
          badgeId: badge.id,
        })

        // Update earned count
        await db
          .update(badges)
          .set({ earnedCount: sql`${badges.earnedCount} + 1` })
          .where(eq(badges.id, badge.id))

        newlyEarned.push({
          id: badge.id,
          category: badge.category,
          level: badge.level || 1,
          name: badge.name,
          description: badge.description,
          requirement: badge.requirement,
          iconUrl: badge.iconUrl,
          backgroundColor: badge.backgroundColor,
          earnedAt: new Date(),
          earnedCount: (badge.earnedCount || 0) + 1,
        })
      }
    }

    return newlyEarned
  }

  /**
   * Check if user qualifies for a badge
   */
  private checkBadgeQualification(
    user: typeof users.$inferSelect,
    badge: typeof badges.$inferSelect
  ): boolean {
    const target = badge.conditionValue

    switch (badge.conditionType) {
      case 'streak_days':
        return (user.currentStreakDays || 0) >= target
      case 'max_streak_days':
        return (user.maxStreakDays || 0) >= target
      case 'total_hours':
        return Math.floor((user.totalReadingDuration || 0) / 3600) >= target
      case 'total_days':
        return (user.totalReadingDays || 0) >= target
      case 'books_finished':
        return (user.booksFinishedCount || 0) >= target
      case 'books_read':
        return (user.booksReadCount || 0) >= target
      default:
        return false
    }
  }

  /**
   * Get badge by ID
   */
  async getBadge(badgeId: number) {
    const [badge] = await db.select().from(badges).where(eq(badges.id, badgeId))
    return badge || null
  }

  /**
   * Get all badges grouped by category
   */
  async getAllBadges() {
    const allBadges = await db
      .select()
      .from(badges)
      .where(eq(badges.isActive, true))
      .orderBy(asc(badges.category), asc(badges.level))

    // Group by category
    const grouped: Record<string, typeof allBadges> = {}
    for (const badge of allBadges) {
      if (!grouped[badge.category]) {
        grouped[badge.category] = []
      }
      grouped[badge.category].push(badge)
    }

    return grouped
  }

  /**
   * Initialize default badges
   */
  async initializeDefaultBadges() {
    const existingCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(badges)

    if (existingCount[0].count > 0) {
      console.log('Badges already initialized')
      return
    }

    const defaultBadges = [
      // Reading Streak
      { category: 'reading_streak', level: 1, name: '7-Day Streak', requirement: 'Read for 7 consecutive days', conditionType: 'streak_days', conditionValue: 7, description: 'Building a habit starts here' },
      { category: 'reading_streak', level: 2, name: '30-Day Streak', requirement: 'Read for 30 consecutive days', conditionType: 'streak_days', conditionValue: 30, description: 'A month of dedication' },
      { category: 'reading_streak', level: 3, name: '90-Day Streak', requirement: 'Read for 90 consecutive days', conditionType: 'streak_days', conditionValue: 90, description: 'A quarter of consistency' },
      { category: 'reading_streak', level: 4, name: '180-Day Streak', requirement: 'Read for 180 consecutive days', conditionType: 'streak_days', conditionValue: 180, description: 'Half a year strong' },
      { category: 'reading_streak', level: 5, name: '365-Day Streak', requirement: 'Read for 365 consecutive days', conditionType: 'streak_days', conditionValue: 365, description: 'A full year of reading!' },
      { category: 'reading_streak', level: 6, name: '1000-Day Streak', requirement: 'Read for 1000 consecutive days', conditionType: 'streak_days', conditionValue: 1000, description: 'Legendary dedication' },

      // Reading Duration
      { category: 'reading_duration', level: 1, name: '100 Hours Read', requirement: 'Accumulate 100 hours of reading', conditionType: 'total_hours', conditionValue: 100, description: 'Your reading journey begins' },
      { category: 'reading_duration', level: 2, name: '500 Hours Read', requirement: 'Accumulate 500 hours of reading', conditionType: 'total_hours', conditionValue: 500, description: 'A serious reader' },
      { category: 'reading_duration', level: 3, name: '1000 Hours Read', requirement: 'Accumulate 1000 hours of reading', conditionType: 'total_hours', conditionValue: 1000, description: 'Master reader status' },
      { category: 'reading_duration', level: 4, name: '2000 Hours Read', requirement: 'Accumulate 2000 hours of reading', conditionType: 'total_hours', conditionValue: 2000, description: 'Expert level achieved' },
      { category: 'reading_duration', level: 5, name: '3000 Hours Read', requirement: 'Accumulate 3000 hours of reading', conditionType: 'total_hours', conditionValue: 3000, description: 'Scholar status' },
      { category: 'reading_duration', level: 6, name: '5000 Hours Read', requirement: 'Accumulate 5000 hours of reading', conditionType: 'total_hours', conditionValue: 5000, description: 'Legendary reader' },

      // Reading Days
      { category: 'reading_days', level: 1, name: '100 Days Read', requirement: 'Read on 100 different days', conditionType: 'total_days', conditionValue: 100, description: 'Century of reading days' },
      { category: 'reading_days', level: 2, name: '200 Days Read', requirement: 'Read on 200 different days', conditionType: 'total_days', conditionValue: 200, description: 'Double century' },
      { category: 'reading_days', level: 3, name: '365 Days Read', requirement: 'Read on 365 different days', conditionType: 'total_days', conditionValue: 365, description: 'A year worth of reading' },
      { category: 'reading_days', level: 4, name: '500 Days Read', requirement: 'Read on 500 different days', conditionType: 'total_days', conditionValue: 500, description: 'Half a thousand' },
      { category: 'reading_days', level: 5, name: '1000 Days Read', requirement: 'Read on 1000 different days', conditionType: 'total_days', conditionValue: 1000, description: 'Millennial reader' },

      // Books Finished
      { category: 'books_finished', level: 1, name: '10 Books Finished', requirement: 'Finish reading 10 books', conditionType: 'books_finished', conditionValue: 10, description: 'First milestone' },
      { category: 'books_finished', level: 2, name: '50 Books Finished', requirement: 'Finish reading 50 books', conditionType: 'books_finished', conditionValue: 50, description: 'Avid reader' },
      { category: 'books_finished', level: 3, name: '100 Books Finished', requirement: 'Finish reading 100 books', conditionType: 'books_finished', conditionValue: 100, description: 'Century of books' },
      { category: 'books_finished', level: 4, name: '200 Books Finished', requirement: 'Finish reading 200 books', conditionType: 'books_finished', conditionValue: 200, description: 'Bookworm elite' },
      { category: 'books_finished', level: 5, name: '500 Books Finished', requirement: 'Finish reading 500 books', conditionType: 'books_finished', conditionValue: 500, description: 'Library conqueror' },
      { category: 'books_finished', level: 6, name: '1000 Books Finished', requirement: 'Finish reading 1000 books', conditionType: 'books_finished', conditionValue: 1000, description: 'The ultimate bibliophile' },
    ]

    for (const badge of defaultBadges) {
      await db.insert(badges).values(badge)
    }

    console.log(`Initialized ${defaultBadges.length} default badges`)
  }
}

export const badgeService = new BadgeService()
