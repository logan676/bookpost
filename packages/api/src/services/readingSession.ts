/**
 * Reading Session Service
 * Handles reading session tracking, daily stats, user stats, and milestone detection
 */

import { db } from '../db/client'
import {
  readingSessions,
  dailyReadingStats,
  users,
  readingHistory,
  readingMilestones,
} from '../db/schema'
import { eq, and, sql } from 'drizzle-orm'

export interface StartSessionParams {
  userId: number
  bookId: number
  bookType: string
  position?: string
  chapterIndex?: number
  deviceType?: string
  deviceId?: string
}

export interface HeartbeatParams {
  currentPosition?: string
  chapterIndex?: number
  pagesRead?: number
}

export interface EndSessionParams {
  endPosition?: string
  chapterIndex?: number
  pagesRead?: number
}

export interface Milestone {
  type: string
  value: number
  title: string
}

class ReadingSessionService {
  /**
   * Start a new reading session
   */
  async startSession(params: StartSessionParams) {
    // Close any previously active sessions for this user
    await db
      .update(readingSessions)
      .set({
        isActive: false,
        endTime: new Date(),
      })
      .where(
        and(
          eq(readingSessions.userId, params.userId),
          eq(readingSessions.isActive, true)
        )
      )

    // Create new session
    const [session] = await db
      .insert(readingSessions)
      .values({
        userId: params.userId,
        bookId: params.bookId,
        bookType: params.bookType,
        startTime: new Date(),
        startPosition: params.position,
        startChapter: params.chapterIndex,
        deviceType: params.deviceType,
        deviceId: params.deviceId,
        isActive: true,
      })
      .returning()

    return session
  }

  /**
   * Send heartbeat to update session duration
   */
  async heartbeat(sessionId: number, params: HeartbeatParams) {
    const [session] = await db
      .select()
      .from(readingSessions)
      .where(eq(readingSessions.id, sessionId))

    if (!session || !session.isActive) {
      throw new Error('Session not found or inactive')
    }

    // Calculate effective duration (excluding paused time)
    const durationSeconds = this.calculateEffectiveDuration(session)

    // Update session (only if not paused)
    if (!session.isPaused) {
      await db
        .update(readingSessions)
        .set({
          endPosition: params.currentPosition,
          endChapter: params.chapterIndex,
          pagesRead: (session.pagesRead || 0) + (params.pagesRead || 0),
          durationSeconds,
        })
        .where(eq(readingSessions.id, sessionId))
    }

    // Get today's total duration
    const todayDuration = await this.getTodayDuration(session.userId)

    // Get book's total duration
    const bookDuration = await this.getBookDuration(
      session.userId,
      session.bookId,
      session.bookType
    )

    return {
      sessionId,
      durationSeconds,
      todayDuration,
      totalBookDuration: bookDuration,
      isPaused: session.isPaused || false,
    }
  }

  /**
   * End a reading session
   */
  async endSession(sessionId: number, params: EndSessionParams) {
    const [session] = await db
      .select()
      .from(readingSessions)
      .where(eq(readingSessions.id, sessionId))

    if (!session) {
      throw new Error('Session not found')
    }

    // Calculate effective duration (excluding paused time)
    const durationSeconds = this.calculateEffectiveDuration(session)

    // Update session as ended
    await db
      .update(readingSessions)
      .set({
        endTime: new Date(),
        endPosition: params.endPosition,
        endChapter: params.chapterIndex,
        pagesRead: (session.pagesRead || 0) + (params.pagesRead || 0),
        durationSeconds,
        isActive: false,
        isPaused: false,
      })
      .where(eq(readingSessions.id, sessionId))

    // Update daily stats
    await this.updateDailyStats(session.userId, durationSeconds)

    // Update user total stats
    await this.updateUserStats(session.userId, durationSeconds)

    // Update reading history
    await this.updateReadingHistory(
      session.userId,
      session.bookId,
      session.bookType,
      params.endPosition,
      params.chapterIndex,
      durationSeconds
    )

    // Check milestones
    const milestones = await this.checkMilestones(session.userId)

    return {
      sessionId,
      durationSeconds,
      totalBookDuration: await this.getBookDuration(
        session.userId,
        session.bookId,
        session.bookType
      ),
      todayDuration: await this.getTodayDuration(session.userId),
      milestonesAchieved: milestones,
    }
  }

  /**
   * Update daily reading statistics
   */
  private async updateDailyStats(userId: number, durationSeconds: number) {
    const today = new Date().toISOString().split('T')[0]

    // Try to update existing record, or insert new one
    const [existing] = await db
      .select()
      .from(dailyReadingStats)
      .where(
        and(
          eq(dailyReadingStats.userId, userId),
          eq(dailyReadingStats.date, today)
        )
      )

    if (existing) {
      await db
        .update(dailyReadingStats)
        .set({
          totalDurationSeconds:
            (existing.totalDurationSeconds || 0) + durationSeconds,
          updatedAt: new Date(),
        })
        .where(eq(dailyReadingStats.id, existing.id))
    } else {
      await db.insert(dailyReadingStats).values({
        userId,
        date: today,
        totalDurationSeconds: durationSeconds,
      })
    }
  }

  /**
   * Update user's total reading statistics
   */
  private async updateUserStats(userId: number, durationSeconds: number) {
    const today = new Date().toISOString().split('T')[0]

    const [user] = await db.select().from(users).where(eq(users.id, userId))

    if (!user) return

    const lastReadDate = user.lastReadingDate
    const isNewDay = lastReadDate !== today
    const isConsecutive =
      lastReadDate && this.isConsecutiveDay(lastReadDate, today)

    let newStreakDays = user.currentStreakDays || 0
    if (isConsecutive) {
      newStreakDays = newStreakDays + 1
    } else if (isNewDay) {
      newStreakDays = 1
    }

    const newMaxStreak = Math.max(user.maxStreakDays || 0, newStreakDays)

    await db
      .update(users)
      .set({
        totalReadingDuration:
          (user.totalReadingDuration || 0) + durationSeconds,
        totalReadingDays: isNewDay
          ? (user.totalReadingDays || 0) + 1
          : user.totalReadingDays,
        currentStreakDays: newStreakDays,
        maxStreakDays: newMaxStreak,
        lastReadingDate: today,
      })
      .where(eq(users.id, userId))
  }

  /**
   * Check if two dates are consecutive
   */
  private isConsecutiveDay(lastDate: string, today: string): boolean {
    const last = new Date(lastDate)
    const current = new Date(today)
    const diffDays = Math.floor(
      (current.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
    )
    return diffDays === 1
  }

  /**
   * Update reading history with latest position
   */
  private async updateReadingHistory(
    userId: number,
    bookId: number,
    bookType: string,
    position?: string,
    chapterIndex?: number,
    durationSeconds?: number
  ) {
    const [existing] = await db
      .select()
      .from(readingHistory)
      .where(
        and(
          eq(readingHistory.userId, userId),
          eq(readingHistory.itemId, bookId),
          eq(readingHistory.itemType, bookType)
        )
      )

    if (existing) {
      await db
        .update(readingHistory)
        .set({
          lastPosition: position ?? existing.lastPosition,
          chapterIndex: chapterIndex ?? existing.chapterIndex,
          totalDurationSeconds:
            (existing.totalDurationSeconds || 0) + (durationSeconds || 0),
          lastReadAt: new Date(),
        })
        .where(eq(readingHistory.id, existing.id))
    }
  }

  /**
   * Check and create milestones
   */
  private async checkMilestones(userId: number): Promise<Milestone[]> {
    const [user] = await db.select().from(users).where(eq(users.id, userId))
    if (!user) return []

    const achieved: Milestone[] = []

    // Check reading duration milestones (in hours)
    const hourMilestones = [10, 50, 100, 500, 1000, 2000, 3000, 5000]
    const totalHours = Math.floor((user.totalReadingDuration || 0) / 3600)

    for (const hours of hourMilestones) {
      if (totalHours >= hours) {
        const created = await this.createMilestoneIfNotExists(
          userId,
          'total_hours',
          hours,
          `${hours} hours of reading`
        )
        if (created) {
          achieved.push({
            type: 'total_hours',
            value: hours,
            title: `${hours} hours of reading`,
          })
        }
      }
    }

    // Check streak milestones
    const streakMilestones = [7, 30, 90, 180, 365, 500, 1000]
    for (const days of streakMilestones) {
      if ((user.currentStreakDays || 0) >= days) {
        const created = await this.createMilestoneIfNotExists(
          userId,
          'streak_days',
          days,
          `${days}-day reading streak`
        )
        if (created) {
          achieved.push({
            type: 'streak_days',
            value: days,
            title: `${days}-day reading streak`,
          })
        }
      }
    }

    // Check total reading days milestones
    const dayMilestones = [100, 200, 365, 500, 1000]
    for (const days of dayMilestones) {
      if ((user.totalReadingDays || 0) >= days) {
        const created = await this.createMilestoneIfNotExists(
          userId,
          'total_days',
          days,
          `Read on ${days} days`
        )
        if (created) {
          achieved.push({
            type: 'total_days',
            value: days,
            title: `Read on ${days} days`,
          })
        }
      }
    }

    return achieved
  }

  /**
   * Create milestone if it doesn't exist
   */
  private async createMilestoneIfNotExists(
    userId: number,
    type: string,
    value: number,
    title: string
  ): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(readingMilestones)
      .where(
        and(
          eq(readingMilestones.userId, userId),
          eq(readingMilestones.milestoneType, type),
          eq(readingMilestones.milestoneValue, value)
        )
      )

    if (existing) return false

    await db.insert(readingMilestones).values({
      userId,
      milestoneType: type,
      milestoneValue: value,
      title,
    })

    return true
  }

  /**
   * Get today's total reading duration for a user
   */
  async getTodayDuration(userId: number): Promise<number> {
    const today = new Date().toISOString().split('T')[0]

    const [stats] = await db
      .select()
      .from(dailyReadingStats)
      .where(
        and(
          eq(dailyReadingStats.userId, userId),
          eq(dailyReadingStats.date, today)
        )
      )

    return stats?.totalDurationSeconds || 0
  }

  /**
   * Get total reading duration for a specific book
   */
  async getBookDuration(
    userId: number,
    bookId: number,
    bookType: string
  ): Promise<number> {
    const result = await db
      .select({ total: sql<number>`COALESCE(SUM(duration_seconds), 0)` })
      .from(readingSessions)
      .where(
        and(
          eq(readingSessions.userId, userId),
          eq(readingSessions.bookId, bookId),
          eq(readingSessions.bookType, bookType)
        )
      )

    return result[0]?.total || 0
  }

  /**
   * Get active session for a user
   */
  async getActiveSession(userId: number) {
    const [session] = await db
      .select()
      .from(readingSessions)
      .where(
        and(
          eq(readingSessions.userId, userId),
          eq(readingSessions.isActive, true)
        )
      )

    return session || null
  }

  /**
   * Pause a reading session
   */
  async pauseSession(sessionId: number) {
    const [session] = await db
      .select()
      .from(readingSessions)
      .where(eq(readingSessions.id, sessionId))

    if (!session || !session.isActive) {
      throw new Error('Session not found or inactive')
    }

    if (session.isPaused) {
      throw new Error('Session is already paused')
    }

    await db
      .update(readingSessions)
      .set({
        isPaused: true,
        pausedAt: new Date(),
      })
      .where(eq(readingSessions.id, sessionId))

    return { sessionId, isPaused: true }
  }

  /**
   * Resume a paused reading session
   */
  async resumeSession(sessionId: number) {
    const [session] = await db
      .select()
      .from(readingSessions)
      .where(eq(readingSessions.id, sessionId))

    if (!session || !session.isActive) {
      throw new Error('Session not found or inactive')
    }

    if (!session.isPaused) {
      throw new Error('Session is not paused')
    }

    // Calculate how long the session was paused
    const pausedDuration = session.pausedAt
      ? Math.floor((new Date().getTime() - session.pausedAt.getTime()) / 1000)
      : 0

    const newTotalPausedSeconds = (session.totalPausedSeconds || 0) + pausedDuration

    await db
      .update(readingSessions)
      .set({
        isPaused: false,
        pausedAt: null,
        totalPausedSeconds: newTotalPausedSeconds,
      })
      .where(eq(readingSessions.id, sessionId))

    return { sessionId, isPaused: false, totalPausedSeconds: newTotalPausedSeconds }
  }

  /**
   * Calculate effective duration (excluding paused time)
   */
  private calculateEffectiveDuration(session: typeof readingSessions.$inferSelect): number {
    const now = new Date()
    const totalElapsed = Math.floor(
      (now.getTime() - session.startTime.getTime()) / 1000
    )

    // If currently paused, add current pause duration to total paused
    let currentPauseDuration = 0
    if (session.isPaused && session.pausedAt) {
      currentPauseDuration = Math.floor(
        (now.getTime() - session.pausedAt.getTime()) / 1000
      )
    }

    const totalPausedSeconds = (session.totalPausedSeconds || 0) + currentPauseDuration
    return Math.max(0, totalElapsed - totalPausedSeconds)
  }
}

export const readingSessionService = new ReadingSessionService()
