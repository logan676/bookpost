/**
 * Reading Statistics Service
 * Handles reading stats queries for week/month/year/total/calendar views
 */

import { db } from '../db/client'
import {
  dailyReadingStats,
  users,
  readingMilestones,
  weeklyLeaderboard,
  leaderboardLikes,
} from '../db/schema'
import { eq, and, gte, lte, sql, desc, asc } from 'drizzle-orm'

export type StatsDimension = 'week' | 'month' | 'year' | 'total' | 'calendar'

interface DayDuration {
  date: string
  duration: number
  dayOfWeek: string
}

class ReadingStatsService {
  private dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  /**
   * Get week statistics
   */
  async getWeekStats(userId: number, weekStart: Date) {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)

    const weekStartStr = weekStart.toISOString().split('T')[0]
    const weekEndStr = weekEnd.toISOString().split('T')[0]

    // Get daily data
    const dailyData = await db
      .select()
      .from(dailyReadingStats)
      .where(
        and(
          eq(dailyReadingStats.userId, userId),
          gte(dailyReadingStats.date, weekStartStr),
          lte(dailyReadingStats.date, weekEndStr)
        )
      )
      .orderBy(asc(dailyReadingStats.date))

    // Calculate summary
    const totalDuration = dailyData.reduce(
      (sum, d) => sum + (d.totalDurationSeconds || 0),
      0
    )
    const readingDays = dailyData.filter(
      (d) => (d.totalDurationSeconds || 0) > 0
    ).length

    // Get last week's data for comparison
    const lastWeekStart = new Date(weekStart)
    lastWeekStart.setDate(lastWeekStart.getDate() - 7)
    const lastWeekTotal = await this.getWeekTotalDuration(userId, lastWeekStart)

    const comparisonChange =
      lastWeekTotal > 0 ? ((totalDuration - lastWeekTotal) / lastWeekTotal) * 100 : 0

    // Get friend ranking
    const friendRanking = await this.getFriendRanking(userId, weekStart)

    // Fill complete 7 days
    const durationByDay = this.fillWeekDays(weekStart, dailyData)

    // Get reading records counts
    const [recordCounts] = await db
      .select({
        booksRead: sql<number>`COUNT(DISTINCT book_id)`,
        highlightsCreated: sql<number>`COALESCE(SUM(highlights_created), 0)`,
        notesCreated: sql<number>`COALESCE(SUM(notes_created), 0)`,
      })
      .from(dailyReadingStats)
      .where(
        and(
          eq(dailyReadingStats.userId, userId),
          gte(dailyReadingStats.date, weekStartStr),
          lte(dailyReadingStats.date, weekEndStr)
        )
      )

    return {
      dimension: 'week',
      dateRange: {
        start: weekStartStr,
        end: weekEndStr,
      },
      summary: {
        totalDuration,
        dailyAverage: Math.floor(totalDuration / 7),
        comparisonChange: Math.round(comparisonChange * 10) / 10,
        friendRanking,
      },
      readingRecords: {
        booksRead: recordCounts?.booksRead || 0,
        readingDays,
        notesCount: recordCounts?.notesCreated || 0,
        highlightsCount: recordCounts?.highlightsCreated || 0,
      },
      durationByDay,
    }
  }

  /**
   * Get month statistics
   */
  async getMonthStats(userId: number, year: number, month: number) {
    const monthStart = new Date(year, month - 1, 1)
    const monthEnd = new Date(year, month, 0)

    const monthStartStr = monthStart.toISOString().split('T')[0]
    const monthEndStr = monthEnd.toISOString().split('T')[0]

    const dailyData = await db
      .select()
      .from(dailyReadingStats)
      .where(
        and(
          eq(dailyReadingStats.userId, userId),
          gte(dailyReadingStats.date, monthStartStr),
          lte(dailyReadingStats.date, monthEndStr)
        )
      )
      .orderBy(asc(dailyReadingStats.date))

    const totalDuration = dailyData.reduce(
      (sum, d) => sum + (d.totalDurationSeconds || 0),
      0
    )
    const readingDays = dailyData.filter(
      (d) => (d.totalDurationSeconds || 0) > 0
    ).length
    const daysInMonth = monthEnd.getDate()

    // Get last month for comparison
    const lastMonth = month === 1 ? 12 : month - 1
    const lastYear = month === 1 ? year - 1 : year
    const lastMonthTotal = await this.getMonthTotalDuration(
      userId,
      lastYear,
      lastMonth
    )

    const comparisonChange =
      lastMonthTotal > 0
        ? ((totalDuration - lastMonthTotal) / lastMonthTotal) * 100
        : 0

    return {
      dimension: 'month',
      dateRange: {
        start: monthStartStr,
        end: monthEndStr,
      },
      summary: {
        totalDuration,
        dailyAverage: Math.floor(totalDuration / daysInMonth),
        comparisonChange: Math.round(comparisonChange * 10) / 10,
        readingDays,
      },
      durationByDay: dailyData.map((d) => ({
        date: d.date,
        duration: d.totalDurationSeconds || 0,
        dayOfWeek: this.dayNames[new Date(d.date).getDay()],
      })),
    }
  }

  /**
   * Get year statistics
   */
  async getYearStats(userId: number, year: number) {
    const yearStart = `${year}-01-01`
    const yearEnd = `${year}-12-31`

    // Aggregate by month
    const monthlyData = await db
      .select({
        month: sql<number>`EXTRACT(MONTH FROM date)::int`,
        totalDuration: sql<number>`COALESCE(SUM(total_duration_seconds), 0)`,
        readingDays: sql<number>`COUNT(CASE WHEN total_duration_seconds > 0 THEN 1 END)`,
      })
      .from(dailyReadingStats)
      .where(
        and(
          eq(dailyReadingStats.userId, userId),
          gte(dailyReadingStats.date, yearStart),
          lte(dailyReadingStats.date, yearEnd)
        )
      )
      .groupBy(sql`EXTRACT(MONTH FROM date)`)
      .orderBy(sql`EXTRACT(MONTH FROM date)`)

    // Fill all 12 months
    const months = []
    for (let m = 1; m <= 12; m++) {
      const found = monthlyData.find((d) => d.month === m)
      months.push({
        month: m,
        duration: found?.totalDuration || 0,
        readingDays: found?.readingDays || 0,
      })
    }

    const totalDuration = months.reduce((sum, m) => sum + m.duration, 0)
    const totalReadingDays = months.reduce((sum, m) => sum + m.readingDays, 0)

    return {
      dimension: 'year',
      year,
      summary: {
        totalDuration,
        monthlyAverage: Math.floor(totalDuration / 12),
        totalReadingDays,
      },
      durationByMonth: months,
    }
  }

  /**
   * Get total/lifetime statistics
   */
  async getTotalStats(userId: number) {
    const [user] = await db.select().from(users).where(eq(users.id, userId))

    if (!user) {
      throw new Error('User not found')
    }

    return {
      dimension: 'total',
      summary: {
        totalDuration: user.totalReadingDuration || 0,
        totalDays: user.totalReadingDays || 0,
        currentStreak: user.currentStreakDays || 0,
        longestStreak: user.maxStreakDays || 0,
        booksRead: user.booksReadCount || 0,
        booksFinished: user.booksFinishedCount || 0,
      },
    }
  }

  /**
   * Get calendar view statistics
   */
  async getCalendarStats(userId: number, year: number, month: number) {
    const monthStart = new Date(year, month - 1, 1)
    const monthEnd = new Date(year, month, 0)

    const monthStartStr = monthStart.toISOString().split('T')[0]
    const monthEndStr = monthEnd.toISOString().split('T')[0]

    const dailyData = await db
      .select()
      .from(dailyReadingStats)
      .where(
        and(
          eq(dailyReadingStats.userId, userId),
          gte(dailyReadingStats.date, monthStartStr),
          lte(dailyReadingStats.date, monthEndStr)
        )
      )

    // Build calendar days
    const calendarDays = this.buildCalendarDays(year, month, dailyData)

    // Get milestones for this month
    const milestones = await db
      .select()
      .from(readingMilestones)
      .where(
        and(
          eq(readingMilestones.userId, userId),
          gte(readingMilestones.achievedAt, monthStart),
          lte(readingMilestones.achievedAt, monthEnd)
        )
      )
      .orderBy(desc(readingMilestones.achievedAt))

    return {
      dimension: 'calendar',
      year,
      month,
      calendarDays,
      milestones: milestones.map((m) => ({
        id: m.id,
        date: m.achievedAt?.toISOString().split('T')[0],
        type: m.milestoneType,
        title: m.title,
        value: m.milestoneValue,
        bookTitle: m.bookTitle,
      })),
    }
  }

  /**
   * Get weekly leaderboard
   */
  async getLeaderboard(
    userId: number,
    weekStart: Date,
    _type: 'friends' | 'all' = 'friends'
  ) {
    const weekStartStr = weekStart.toISOString().split('T')[0]
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const weekEndStr = weekEnd.toISOString().split('T')[0]

    // Get leaderboard entries
    const entries = await db
      .select({
        id: weeklyLeaderboard.id,
        userId: weeklyLeaderboard.userId,
        rank: weeklyLeaderboard.rank,
        duration: weeklyLeaderboard.totalDurationSeconds,
        readingDays: weeklyLeaderboard.readingDays,
        rankChange: weeklyLeaderboard.rankChange,
        likesReceived: weeklyLeaderboard.likesReceived,
        username: users.username,
        avatar: users.avatar,
      })
      .from(weeklyLeaderboard)
      .innerJoin(users, eq(weeklyLeaderboard.userId, users.id))
      .where(eq(weeklyLeaderboard.weekStart, weekStartStr))
      .orderBy(asc(weeklyLeaderboard.rank))
      .limit(100)

    // Get user's likes
    const userLikes = await db
      .select({ targetUserId: leaderboardLikes.targetUserId })
      .from(leaderboardLikes)
      .where(
        and(
          eq(leaderboardLikes.userId, userId),
          eq(leaderboardLikes.weekStart, weekStartStr)
        )
      )

    const likedUserIds = new Set(userLikes.map((l) => l.targetUserId))

    // Get user's own ranking
    const myEntry = entries.find((e) => e.userId === userId)

    return {
      weekRange: {
        start: weekStartStr,
        end: weekEndStr,
        settlementTime: `${weekEndStr}T23:59:59Z`,
      },
      myRanking: myEntry
        ? {
            rank: myEntry.rank,
            duration: myEntry.duration,
            rankChange: myEntry.rankChange,
            readingDays: myEntry.readingDays,
          }
        : null,
      entries: entries.map((e) => ({
        rank: e.rank,
        user: {
          id: e.userId,
          username: e.username,
          avatar: e.avatar,
        },
        duration: e.duration,
        readingDays: e.readingDays,
        rankChange: e.rankChange,
        likesCount: e.likesReceived,
        isLiked: likedUserIds.has(e.userId),
      })),
      totalParticipants: entries.length,
    }
  }

  /**
   * Like a user on the leaderboard
   */
  async likeLeaderboardUser(
    userId: number,
    targetUserId: number,
    weekStart: Date
  ) {
    const weekStartStr = weekStart.toISOString().split('T')[0]

    // Check if already liked
    const [existing] = await db
      .select()
      .from(leaderboardLikes)
      .where(
        and(
          eq(leaderboardLikes.userId, userId),
          eq(leaderboardLikes.targetUserId, targetUserId),
          eq(leaderboardLikes.weekStart, weekStartStr)
        )
      )

    if (existing) {
      throw new Error('Already liked this user this week')
    }

    // Create like
    await db.insert(leaderboardLikes).values({
      userId,
      targetUserId,
      weekStart: weekStartStr,
    })

    // Update likes count
    await db
      .update(weeklyLeaderboard)
      .set({
        likesReceived: sql`${weeklyLeaderboard.likesReceived} + 1`,
      })
      .where(
        and(
          eq(weeklyLeaderboard.userId, targetUserId),
          eq(weeklyLeaderboard.weekStart, weekStartStr)
        )
      )

    return { success: true }
  }

  /**
   * Get milestones for a user
   */
  async getMilestones(userId: number, limit = 20, year?: number) {
    let whereCondition = eq(readingMilestones.userId, userId)

    if (year) {
      const yearStart = new Date(year, 0, 1)
      const yearEnd = new Date(year, 11, 31, 23, 59, 59)
      whereCondition = and(
        eq(readingMilestones.userId, userId),
        gte(readingMilestones.achievedAt, yearStart),
        lte(readingMilestones.achievedAt, yearEnd)
      )!
    }

    const milestones = await db
      .select()
      .from(readingMilestones)
      .where(whereCondition)
      .orderBy(desc(readingMilestones.achievedAt))
      .limit(limit)

    return milestones.map((m) => ({
      id: m.id,
      type: m.milestoneType,
      date: m.achievedAt?.toISOString().split('T')[0],
      title: m.title,
      description: m.description,
      value: m.milestoneValue,
      book: m.bookId
        ? {
            id: m.bookId,
            title: m.bookTitle,
            type: m.bookType,
          }
        : null,
    }))
  }

  // Helper methods

  private async getWeekTotalDuration(
    userId: number,
    weekStart: Date
  ): Promise<number> {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)

    const [result] = await db
      .select({
        total: sql<number>`COALESCE(SUM(total_duration_seconds), 0)`,
      })
      .from(dailyReadingStats)
      .where(
        and(
          eq(dailyReadingStats.userId, userId),
          gte(dailyReadingStats.date, weekStart.toISOString().split('T')[0]),
          lte(dailyReadingStats.date, weekEnd.toISOString().split('T')[0])
        )
      )

    return result?.total || 0
  }

  private async getMonthTotalDuration(
    userId: number,
    year: number,
    month: number
  ): Promise<number> {
    const monthStart = new Date(year, month - 1, 1)
    const monthEnd = new Date(year, month, 0)

    const [result] = await db
      .select({
        total: sql<number>`COALESCE(SUM(total_duration_seconds), 0)`,
      })
      .from(dailyReadingStats)
      .where(
        and(
          eq(dailyReadingStats.userId, userId),
          gte(dailyReadingStats.date, monthStart.toISOString().split('T')[0]),
          lte(dailyReadingStats.date, monthEnd.toISOString().split('T')[0])
        )
      )

    return result?.total || 0
  }

  private async getFriendRanking(
    userId: number,
    weekStart: Date
  ): Promise<number | null> {
    const weekStartStr = weekStart.toISOString().split('T')[0]

    const [entry] = await db
      .select({ rank: weeklyLeaderboard.rank })
      .from(weeklyLeaderboard)
      .where(
        and(
          eq(weeklyLeaderboard.userId, userId),
          eq(weeklyLeaderboard.weekStart, weekStartStr)
        )
      )

    return entry?.rank || null
  }

  private fillWeekDays(
    weekStart: Date,
    dailyData: Array<{ date: string; totalDurationSeconds: number | null }>
  ): DayDuration[] {
    const result: DayDuration[] = []

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]

      const dayData = dailyData.find((d) => d.date === dateStr)

      result.push({
        date: dateStr,
        duration: dayData?.totalDurationSeconds || 0,
        dayOfWeek: this.dayNames[(date.getDay() + 1) % 7], // Monday = 周一
      })
    }

    return result
  }

  private buildCalendarDays(
    year: number,
    month: number,
    dailyData: Array<{ date: string; totalDurationSeconds: number | null }>
  ) {
    const daysInMonth = new Date(year, month, 0).getDate()
    const result = []

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dayData = dailyData.find((d) => d.date === dateStr)

      result.push({
        date: dateStr,
        duration: dayData?.totalDurationSeconds || 0,
        hasReading: (dayData?.totalDurationSeconds || 0) > 0,
      })
    }

    return result
  }
}

export const readingStatsService = new ReadingStatsService()
