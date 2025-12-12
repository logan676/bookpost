/**
 * Social Routes - Following & Activity Feed
 * Handles social interactions between users
 */

import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { db } from '../db/client'
import { users, userFollowing, activityFeed, activityLikes } from '../db/schema'
import { eq, and, desc, sql, inArray } from 'drizzle-orm'

const app = new OpenAPIHono()

// Apply auth middleware to all routes
app.use('*', requireAuth)

// ============================================
// Schemas
// ============================================

const UserProfileSchema = z.object({
  id: z.number(),
  username: z.string(),
  avatar: z.string().nullable(),
  totalReadingDuration: z.number(),
  booksFinishedCount: z.number(),
  currentStreakDays: z.number(),
})

const FollowStatsSchema = z.object({
  followersCount: z.number(),
  followingCount: z.number(),
  isFollowing: z.boolean(),
  isFollowedBy: z.boolean(),
})

const ActivitySchema = z.object({
  id: z.number(),
  userId: z.number(),
  user: z.object({
    id: z.number(),
    username: z.string(),
    avatar: z.string().nullable(),
  }),
  activityType: z.string(),
  bookType: z.string().nullable(),
  bookId: z.number().nullable(),
  bookTitle: z.string().nullable(),
  badgeId: z.number().nullable(),
  badgeName: z.string().nullable(),
  metadata: z.any().nullable(),
  likesCount: z.number(),
  commentsCount: z.number(),
  isLiked: z.boolean(),
  createdAt: z.string(),
})

const ErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})

// ============================================
// Following API Routes
// ============================================

// GET /api/social/users/:userId/profile
const getUserProfileRoute = createRoute({
  method: 'get',
  path: '/users/{userId}/profile',
  tags: ['Social'],
  summary: 'Get user profile with follow stats',
  security: [{ Bearer: [] }],
  parameters: [
    {
      name: 'userId',
      in: 'path',
      required: true,
      schema: { type: 'integer' },
    },
  ],
  responses: {
    200: {
      description: 'User profile',
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({
              profile: UserProfileSchema,
              followStats: FollowStatsSchema,
            }),
          }),
        },
      },
    },
    404: {
      description: 'User not found',
      content: {
        'application/json': { schema: ErrorSchema },
      },
    },
  },
})

app.openapi(getUserProfileRoute, async (c) => {
  const currentUserId = c.get('userId')
  const targetUserId = parseInt(c.req.param('userId'))

  // Get user profile
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      avatar: users.avatar,
      totalReadingDuration: users.totalReadingDuration,
      booksFinishedCount: users.booksFinishedCount,
      currentStreakDays: users.currentStreakDays,
    })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1)

  if (!user) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'User not found' } }, 404)
  }

  // Get follow counts
  const [followerCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(userFollowing)
    .where(eq(userFollowing.followingId, targetUserId))

  const [followingCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(userFollowing)
    .where(eq(userFollowing.followerId, targetUserId))

  // Check if current user follows target
  const [isFollowing] = await db
    .select()
    .from(userFollowing)
    .where(
      and(
        eq(userFollowing.followerId, currentUserId),
        eq(userFollowing.followingId, targetUserId)
      )
    )
    .limit(1)

  // Check if target follows current user
  const [isFollowedBy] = await db
    .select()
    .from(userFollowing)
    .where(
      and(
        eq(userFollowing.followerId, targetUserId),
        eq(userFollowing.followingId, currentUserId)
      )
    )
    .limit(1)

  return c.json({
    data: {
      profile: {
        ...user,
        totalReadingDuration: user.totalReadingDuration || 0,
        booksFinishedCount: user.booksFinishedCount || 0,
        currentStreakDays: user.currentStreakDays || 0,
      },
      followStats: {
        followersCount: Number(followerCount?.count || 0),
        followingCount: Number(followingCount?.count || 0),
        isFollowing: Boolean(isFollowing),
        isFollowedBy: Boolean(isFollowedBy),
      },
    },
  }, 200)
})

// POST /api/social/users/:userId/follow
const followUserRoute = createRoute({
  method: 'post',
  path: '/users/{userId}/follow',
  tags: ['Social'],
  summary: 'Follow a user',
  security: [{ Bearer: [] }],
  parameters: [
    {
      name: 'userId',
      in: 'path',
      required: true,
      schema: { type: 'integer' },
    },
  ],
  responses: {
    200: {
      description: 'Follow successful',
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({ success: z.boolean() }),
          }),
        },
      },
    },
    400: {
      description: 'Cannot follow',
      content: {
        'application/json': { schema: ErrorSchema },
      },
    },
  },
})

app.openapi(followUserRoute, async (c) => {
  const currentUserId = c.get('userId')
  const targetUserId = parseInt(c.req.param('userId'))

  if (currentUserId === targetUserId) {
    return c.json({ error: { code: 'SELF_FOLLOW', message: 'Cannot follow yourself' } }, 400)
  }

  // Check if user exists
  const [targetUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1)

  if (!targetUser) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'User not found' } }, 400)
  }

  // Check if already following
  const [existing] = await db
    .select()
    .from(userFollowing)
    .where(
      and(
        eq(userFollowing.followerId, currentUserId),
        eq(userFollowing.followingId, targetUserId)
      )
    )
    .limit(1)

  if (existing) {
    return c.json({ error: { code: 'ALREADY_FOLLOWING', message: 'Already following' } }, 400)
  }

  // Create follow relationship
  await db.insert(userFollowing).values({
    followerId: currentUserId,
    followingId: targetUserId,
  })

  return c.json({ data: { success: true as boolean } }, 200)
})

// DELETE /api/social/users/:userId/follow
const unfollowUserRoute = createRoute({
  method: 'delete',
  path: '/users/{userId}/follow',
  tags: ['Social'],
  summary: 'Unfollow a user',
  security: [{ Bearer: [] }],
  parameters: [
    {
      name: 'userId',
      in: 'path',
      required: true,
      schema: { type: 'integer' },
    },
  ],
  responses: {
    200: {
      description: 'Unfollow successful',
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({ success: z.boolean() }),
          }),
        },
      },
    },
  },
})

app.openapi(unfollowUserRoute, async (c) => {
  const currentUserId = c.get('userId')
  const targetUserId = parseInt(c.req.param('userId'))

  await db
    .delete(userFollowing)
    .where(
      and(
        eq(userFollowing.followerId, currentUserId),
        eq(userFollowing.followingId, targetUserId)
      )
    )

  return c.json({ data: { success: true as boolean } }, 200)
})

// GET /api/social/users/:userId/followers
const getFollowersRoute = createRoute({
  method: 'get',
  path: '/users/{userId}/followers',
  tags: ['Social'],
  summary: 'Get user followers list',
  security: [{ Bearer: [] }],
  parameters: [
    {
      name: 'userId',
      in: 'path',
      required: true,
      schema: { type: 'integer' },
    },
    {
      name: 'limit',
      in: 'query',
      schema: { type: 'integer', default: 20 },
    },
    {
      name: 'offset',
      in: 'query',
      schema: { type: 'integer', default: 0 },
    },
  ],
  responses: {
    200: {
      description: 'Followers list',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(
              z.object({
                id: z.number(),
                username: z.string(),
                avatar: z.string().nullable(),
                isFollowing: z.boolean(),
                followedAt: z.string(),
              })
            ),
            total: z.number(),
            hasMore: z.boolean(),
          }),
        },
      },
    },
  },
})

app.openapi(getFollowersRoute, async (c) => {
  const currentUserId = c.get('userId')
  const targetUserId = parseInt(c.req.param('userId'))
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = parseInt(c.req.query('offset') || '0')

  // Get followers
  const followers = await db
    .select({
      id: users.id,
      username: users.username,
      avatar: users.avatar,
      followedAt: userFollowing.createdAt,
    })
    .from(userFollowing)
    .innerJoin(users, eq(userFollowing.followerId, users.id))
    .where(eq(userFollowing.followingId, targetUserId))
    .orderBy(desc(userFollowing.createdAt))
    .limit(limit + 1)
    .offset(offset)

  const hasMore = followers.length > limit
  const result = followers.slice(0, limit)

  // Check which followers the current user is following
  const followerIds = result.map((f) => f.id)
  let followingSet = new Set<number>()

  if (followerIds.length > 0) {
    const following = await db
      .select({ followingId: userFollowing.followingId })
      .from(userFollowing)
      .where(
        and(
          eq(userFollowing.followerId, currentUserId),
          inArray(userFollowing.followingId, followerIds)
        )
      )
    followingSet = new Set(following.map((f) => f.followingId))
  }

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(userFollowing)
    .where(eq(userFollowing.followingId, targetUserId))

  return c.json({
    data: result.map((f) => ({
      ...f,
      followedAt: f.followedAt?.toISOString() || '',
      isFollowing: followingSet.has(f.id),
    })),
    total: Number(countResult?.count || 0),
    hasMore,
  }, 200)
})

// GET /api/social/users/:userId/following
const getFollowingRoute = createRoute({
  method: 'get',
  path: '/users/{userId}/following',
  tags: ['Social'],
  summary: 'Get user following list',
  security: [{ Bearer: [] }],
  parameters: [
    {
      name: 'userId',
      in: 'path',
      required: true,
      schema: { type: 'integer' },
    },
    {
      name: 'limit',
      in: 'query',
      schema: { type: 'integer', default: 20 },
    },
    {
      name: 'offset',
      in: 'query',
      schema: { type: 'integer', default: 0 },
    },
  ],
  responses: {
    200: {
      description: 'Following list',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(
              z.object({
                id: z.number(),
                username: z.string(),
                avatar: z.string().nullable(),
                isFollowing: z.boolean(),
                followedAt: z.string(),
              })
            ),
            total: z.number(),
            hasMore: z.boolean(),
          }),
        },
      },
    },
  },
})

app.openapi(getFollowingRoute, async (c) => {
  const currentUserId = c.get('userId')
  const targetUserId = parseInt(c.req.param('userId'))
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = parseInt(c.req.query('offset') || '0')

  // Get following
  const following = await db
    .select({
      id: users.id,
      username: users.username,
      avatar: users.avatar,
      followedAt: userFollowing.createdAt,
    })
    .from(userFollowing)
    .innerJoin(users, eq(userFollowing.followingId, users.id))
    .where(eq(userFollowing.followerId, targetUserId))
    .orderBy(desc(userFollowing.createdAt))
    .limit(limit + 1)
    .offset(offset)

  const hasMore = following.length > limit
  const result = following.slice(0, limit)

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(userFollowing)
    .where(eq(userFollowing.followerId, targetUserId))

  return c.json({
    data: result.map((f) => ({
      ...f,
      followedAt: f.followedAt?.toISOString() || '',
      isFollowing: currentUserId === targetUserId ? true : f.id === currentUserId,
    })),
    total: Number(countResult?.count || 0),
    hasMore,
  }, 200)
})

// ============================================
// Activity Feed API Routes
// ============================================

// GET /api/social/feed
const getFeedRoute = createRoute({
  method: 'get',
  path: '/feed',
  tags: ['Social'],
  summary: 'Get activity feed from followed users',
  security: [{ Bearer: [] }],
  parameters: [
    {
      name: 'type',
      in: 'query',
      description: 'all (from following) or global',
      schema: { type: 'string', enum: ['all', 'global'], default: 'all' },
    },
    {
      name: 'limit',
      in: 'query',
      schema: { type: 'integer', default: 20 },
    },
    {
      name: 'offset',
      in: 'query',
      schema: { type: 'integer', default: 0 },
    },
  ],
  responses: {
    200: {
      description: 'Activity feed',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(ActivitySchema),
            hasMore: z.boolean(),
          }),
        },
      },
    },
  },
})

app.openapi(getFeedRoute, async (c) => {
  const currentUserId = c.get('userId')
  const type = c.req.query('type') || 'all'
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = parseInt(c.req.query('offset') || '0')

  let activities: any[] = []

  if (type === 'all') {
    // Get activities from followed users + own activities
    const followingIds = await db
      .select({ followingId: userFollowing.followingId })
      .from(userFollowing)
      .where(eq(userFollowing.followerId, currentUserId))

    const userIds = [currentUserId, ...followingIds.map((f) => f.followingId)]

    activities = await db
      .select({
        id: activityFeed.id,
        userId: activityFeed.userId,
        activityType: activityFeed.activityType,
        bookType: activityFeed.bookType,
        bookId: activityFeed.bookId,
        bookTitle: activityFeed.bookTitle,
        badgeId: activityFeed.badgeId,
        badgeName: activityFeed.badgeName,
        metadata: activityFeed.metadata,
        likesCount: activityFeed.likesCount,
        commentsCount: activityFeed.commentsCount,
        createdAt: activityFeed.createdAt,
        username: users.username,
        avatar: users.avatar,
      })
      .from(activityFeed)
      .innerJoin(users, eq(activityFeed.userId, users.id))
      .where(
        and(eq(activityFeed.isPublic, true), inArray(activityFeed.userId, userIds))
      )
      .orderBy(desc(activityFeed.createdAt))
      .limit(limit + 1)
      .offset(offset)
  } else {
    // Global feed - all public activities
    activities = await db
      .select({
        id: activityFeed.id,
        userId: activityFeed.userId,
        activityType: activityFeed.activityType,
        bookType: activityFeed.bookType,
        bookId: activityFeed.bookId,
        bookTitle: activityFeed.bookTitle,
        badgeId: activityFeed.badgeId,
        badgeName: activityFeed.badgeName,
        metadata: activityFeed.metadata,
        likesCount: activityFeed.likesCount,
        commentsCount: activityFeed.commentsCount,
        createdAt: activityFeed.createdAt,
        username: users.username,
        avatar: users.avatar,
      })
      .from(activityFeed)
      .innerJoin(users, eq(activityFeed.userId, users.id))
      .where(eq(activityFeed.isPublic, true))
      .orderBy(desc(activityFeed.createdAt))
      .limit(limit + 1)
      .offset(offset)
  }

  const hasMore = activities.length > limit
  const result = activities.slice(0, limit)

  // Check which activities the current user has liked
  const activityIds = result.map((a) => a.id)
  let likedSet = new Set<number>()

  if (activityIds.length > 0) {
    const liked = await db
      .select({ activityId: activityLikes.activityId })
      .from(activityLikes)
      .where(
        and(
          eq(activityLikes.userId, currentUserId),
          inArray(activityLikes.activityId, activityIds)
        )
      )
    likedSet = new Set(liked.map((l) => l.activityId))
  }

  return c.json({
    data: result.map((a) => ({
      id: a.id,
      userId: a.userId,
      user: {
        id: a.userId,
        username: a.username,
        avatar: a.avatar,
      },
      activityType: a.activityType,
      bookType: a.bookType,
      bookId: a.bookId,
      bookTitle: a.bookTitle,
      badgeId: a.badgeId,
      badgeName: a.badgeName,
      metadata: a.metadata,
      likesCount: a.likesCount || 0,
      commentsCount: a.commentsCount || 0,
      isLiked: likedSet.has(a.id),
      createdAt: a.createdAt?.toISOString() || '',
    })),
    hasMore,
  }, 200)
})

// GET /api/social/users/:userId/activities
const getUserActivitiesRoute = createRoute({
  method: 'get',
  path: '/users/{userId}/activities',
  tags: ['Social'],
  summary: 'Get user activities',
  security: [{ Bearer: [] }],
  parameters: [
    {
      name: 'userId',
      in: 'path',
      required: true,
      schema: { type: 'integer' },
    },
    {
      name: 'limit',
      in: 'query',
      schema: { type: 'integer', default: 20 },
    },
    {
      name: 'offset',
      in: 'query',
      schema: { type: 'integer', default: 0 },
    },
  ],
  responses: {
    200: {
      description: 'User activities',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(ActivitySchema),
            hasMore: z.boolean(),
          }),
        },
      },
    },
  },
})

app.openapi(getUserActivitiesRoute, async (c) => {
  const currentUserId = c.get('userId')
  const targetUserId = parseInt(c.req.param('userId'))
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = parseInt(c.req.query('offset') || '0')

  // Get user's activities
  const activities = await db
    .select({
      id: activityFeed.id,
      userId: activityFeed.userId,
      activityType: activityFeed.activityType,
      bookType: activityFeed.bookType,
      bookId: activityFeed.bookId,
      bookTitle: activityFeed.bookTitle,
      badgeId: activityFeed.badgeId,
      badgeName: activityFeed.badgeName,
      metadata: activityFeed.metadata,
      likesCount: activityFeed.likesCount,
      commentsCount: activityFeed.commentsCount,
      createdAt: activityFeed.createdAt,
      username: users.username,
      avatar: users.avatar,
    })
    .from(activityFeed)
    .innerJoin(users, eq(activityFeed.userId, users.id))
    .where(
      and(
        eq(activityFeed.userId, targetUserId),
        currentUserId === targetUserId
          ? sql`1=1`
          : eq(activityFeed.isPublic, true)
      )
    )
    .orderBy(desc(activityFeed.createdAt))
    .limit(limit + 1)
    .offset(offset)

  const hasMore = activities.length > limit
  const result = activities.slice(0, limit)

  // Check liked status
  const activityIds = result.map((a) => a.id)
  let likedSet = new Set<number>()

  if (activityIds.length > 0) {
    const liked = await db
      .select({ activityId: activityLikes.activityId })
      .from(activityLikes)
      .where(
        and(
          eq(activityLikes.userId, currentUserId),
          inArray(activityLikes.activityId, activityIds)
        )
      )
    likedSet = new Set(liked.map((l) => l.activityId))
  }

  return c.json({
    data: result.map((a) => ({
      id: a.id,
      userId: a.userId,
      user: {
        id: a.userId,
        username: a.username,
        avatar: a.avatar,
      },
      activityType: a.activityType,
      bookType: a.bookType,
      bookId: a.bookId,
      bookTitle: a.bookTitle,
      badgeId: a.badgeId,
      badgeName: a.badgeName,
      metadata: a.metadata,
      likesCount: a.likesCount || 0,
      commentsCount: a.commentsCount || 0,
      isLiked: likedSet.has(a.id),
      createdAt: a.createdAt?.toISOString() || '',
    })),
    hasMore,
  }, 200)
})

// POST /api/social/activities/:activityId/like
const likeActivityRoute = createRoute({
  method: 'post',
  path: '/activities/{activityId}/like',
  tags: ['Social'],
  summary: 'Like an activity',
  security: [{ Bearer: [] }],
  parameters: [
    {
      name: 'activityId',
      in: 'path',
      required: true,
      schema: { type: 'integer' },
    },
  ],
  responses: {
    200: {
      description: 'Like toggled',
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({
              liked: z.boolean(),
              likesCount: z.number(),
            }),
          }),
        },
      },
    },
  },
})

app.openapi(likeActivityRoute, async (c) => {
  const currentUserId = c.get('userId')
  const activityId = parseInt(c.req.param('activityId'))

  // Check if already liked
  const [existing] = await db
    .select()
    .from(activityLikes)
    .where(
      and(
        eq(activityLikes.userId, currentUserId),
        eq(activityLikes.activityId, activityId)
      )
    )
    .limit(1)

  if (existing) {
    // Unlike
    await db
      .delete(activityLikes)
      .where(
        and(
          eq(activityLikes.userId, currentUserId),
          eq(activityLikes.activityId, activityId)
        )
      )

    await db
      .update(activityFeed)
      .set({ likesCount: sql`${activityFeed.likesCount} - 1` })
      .where(eq(activityFeed.id, activityId))

    const [activity] = await db
      .select({ likesCount: activityFeed.likesCount })
      .from(activityFeed)
      .where(eq(activityFeed.id, activityId))

    return c.json({
      data: { liked: false as boolean, likesCount: activity?.likesCount || 0 },
    }, 200)
  } else {
    // Like
    await db.insert(activityLikes).values({
      userId: currentUserId,
      activityId,
    })

    await db
      .update(activityFeed)
      .set({ likesCount: sql`${activityFeed.likesCount} + 1` })
      .where(eq(activityFeed.id, activityId))

    const [activity] = await db
      .select({ likesCount: activityFeed.likesCount })
      .from(activityFeed)
      .where(eq(activityFeed.id, activityId))

    return c.json({
      data: { liked: true as boolean, likesCount: activity?.likesCount || 0 },
    }, 200)
  }
})

export default app
