/**
 * Reading Goals Routes
 * Handles daily/weekly reading goals and progress tracking
 */

import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { db } from '../db/client'
import { readingChallenges, userChallengeProgress, dailyReadingStats, users } from '../db/schema'
import { eq, and, gte, lte } from 'drizzle-orm'

const app = new OpenAPIHono()
app.use('*', requireAuth)

// Schemas
const DailyGoalSchema = z.object({
  id: z.number(),
  targetMinutes: z.number(),
  currentMinutes: z.number(),
  progress: z.number(),
  isCompleted: z.boolean(),
})

const SetGoalRequestSchema = z.object({
  targetMinutes: z.number().min(5).max(480),
})

const ErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})

// GET /api/user/goals/daily - Get today's goal and progress
const getDailyGoalRoute = createRoute({
  method: 'get',
  path: '/daily',
  tags: ['Goals'],
  summary: "Get today's reading goal and progress",
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: 'Daily goal and progress',
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({
              hasGoal: z.boolean(),
              goal: DailyGoalSchema.nullable(),
              streak: z.object({
                current: z.number(),
                max: z.number(),
              }),
            }),
          }),
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: ErrorSchema } },
    },
  },
})

app.openapi(getDailyGoalRoute, async (c) => {
  const userId = c.get('userId')
  const today = new Date().toISOString().split('T')[0]

  // Get user's daily goal setting (stored as a challenge)
  const [dailyChallenge] = await db
    .select()
    .from(readingChallenges)
    .where(
      and(
        eq(readingChallenges.challengeType, 'daily'),
        eq(readingChallenges.isActive, true)
      )
    )
    .limit(1)

  // Get user's progress for today
  const [userProgress] = await db
    .select()
    .from(userChallengeProgress)
    .where(
      and(
        eq(userChallengeProgress.userId, userId),
        dailyChallenge ? eq(userChallengeProgress.challengeId, dailyChallenge.id) : undefined
      )
    )
    .limit(1)

  // Get today's reading duration
  const [todayStats] = await db
    .select()
    .from(dailyReadingStats)
    .where(
      and(
        eq(dailyReadingStats.userId, userId),
        eq(dailyReadingStats.date, today)
      )
    )
    .limit(1)

  // Get user streak info
  const [user] = await db.select().from(users).where(eq(users.id, userId))

  const currentMinutes = Math.floor((todayStats?.totalDurationSeconds || 0) / 60)
  const targetMinutes = userProgress?.currentValue || 30 // Default 30 min

  if (!userProgress) {
    return c.json({
      data: {
        hasGoal: false,
        goal: null,
        streak: {
          current: user?.currentStreakDays || 0,
          max: user?.maxStreakDays || 0,
        },
      },
    }, 200)
  }

  return c.json({
    data: {
      hasGoal: true,
      goal: {
        id: userProgress.id,
        targetMinutes,
        currentMinutes,
        progress: Math.min(100, Math.round((currentMinutes / targetMinutes) * 100)),
        isCompleted: currentMinutes >= targetMinutes,
      },
      streak: {
        current: user?.currentStreakDays || 0,
        max: user?.maxStreakDays || 0,
      },
    },
  }, 200)
})

// POST /api/user/goals/daily - Set daily goal
const setDailyGoalRoute = createRoute({
  method: 'post',
  path: '/daily',
  tags: ['Goals'],
  summary: 'Set or update daily reading goal',
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: SetGoalRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Goal set successfully',
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({
              targetMinutes: z.number(),
              message: z.string(),
            }),
          }),
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: ErrorSchema } },
    },
  },
})

app.openapi(setDailyGoalRoute, async (c) => {
  const userId = c.get('userId')
  const { targetMinutes } = await c.req.json()

  // Find or create daily challenge
  let [dailyChallenge] = await db
    .select()
    .from(readingChallenges)
    .where(
      and(
        eq(readingChallenges.challengeType, 'daily'),
        eq(readingChallenges.targetType, 'duration'),
        eq(readingChallenges.isActive, true)
      )
    )
    .limit(1)

  if (!dailyChallenge) {
    const today = new Date().toISOString().split('T')[0]
    ;[dailyChallenge] = await db
      .insert(readingChallenges)
      .values({
        name: 'Daily Reading Goal',
        description: 'Read every day to build your habit',
        challengeType: 'daily',
        targetType: 'duration',
        targetValue: targetMinutes,
        startDate: today,
        endDate: '2099-12-31',
        isActive: true,
      })
      .returning()
  }

  // Upsert user progress with their target
  const [existing] = await db
    .select()
    .from(userChallengeProgress)
    .where(
      and(
        eq(userChallengeProgress.userId, userId),
        eq(userChallengeProgress.challengeId, dailyChallenge.id)
      )
    )
    .limit(1)

  if (existing) {
    await db
      .update(userChallengeProgress)
      .set({
        currentValue: targetMinutes,
        updatedAt: new Date(),
      })
      .where(eq(userChallengeProgress.id, existing.id))
  } else {
    await db.insert(userChallengeProgress).values({
      userId,
      challengeId: dailyChallenge.id,
      currentValue: targetMinutes,
    })
  }

  return c.json({
    data: {
      targetMinutes,
      message: `Daily goal set to ${targetMinutes} minutes`,
    },
  }, 200)
})

export default app
