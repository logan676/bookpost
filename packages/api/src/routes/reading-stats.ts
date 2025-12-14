/**
 * Reading Statistics Routes (requires authentication)
 * Handles reading stats queries for week/month/year/total/calendar views
 */

import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { readingStatsService } from '../services/readingStats'
import { db } from '../db/client'
import { userBookshelves, ebooks, magazines, books } from '../db/schema'
import { eq, and, desc, asc, or, isNotNull, gt } from 'drizzle-orm'

const app = new OpenAPIHono()

// Apply auth middleware to all routes
app.use('*', requireAuth)

// Schemas
const DayDurationSchema = z.object({
  date: z.string(),
  duration: z.number(),
  dayOfWeek: z.string(),
})

const WeekStatsResponseSchema = z.object({
  data: z.object({
    dimension: z.literal('week'),
    dateRange: z.object({
      start: z.string(),
      end: z.string(),
    }),
    summary: z.object({
      totalDuration: z.number(),
      dailyAverage: z.number(),
      comparisonChange: z.number(),
      friendRanking: z.number().nullable(),
    }),
    readingRecords: z.object({
      booksRead: z.number(),
      readingDays: z.number(),
      notesCount: z.number(),
      highlightsCount: z.number(),
    }),
    durationByDay: z.array(DayDurationSchema),
  }),
})

const MonthDurationSchema = z.object({
  month: z.number(),
  duration: z.number(),
  readingDays: z.number(),
})

const TotalStatsResponseSchema = z.object({
  data: z.object({
    dimension: z.literal('total'),
    summary: z.object({
      totalDuration: z.number(),
      totalDays: z.number(),
      currentStreak: z.number(),
      longestStreak: z.number(),
      booksRead: z.number(),
      booksFinished: z.number(),
    }),
  }),
})

const CalendarDaySchema = z.object({
  date: z.string(),
  duration: z.number(),
  hasReading: z.boolean(),
})

const MilestoneSchema = z.object({
  id: z.number(),
  date: z.string().nullable(),
  type: z.string(),
  title: z.string(),
  value: z.number().nullable(),
  bookTitle: z.string().nullable(),
})

const ErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})

// GET /api/user/reading-stats
const getReadingStatsRoute = createRoute({
  method: 'get',
  path: '/reading-stats',
  tags: ['Reading Statistics'],
  summary: 'Get reading statistics',
  security: [{ Bearer: [] }],
  parameters: [
    {
      name: 'dimension',
      in: 'query',
      required: true,
      schema: { type: 'string', enum: ['week', 'month', 'year', 'total', 'calendar'] },
    },
    {
      name: 'date',
      in: 'query',
      description: 'Date for week/month/year (YYYY-MM-DD)',
      schema: { type: 'string' },
    },
    {
      name: 'year',
      in: 'query',
      description: 'Year for year/calendar view',
      schema: { type: 'integer' },
    },
    {
      name: 'month',
      in: 'query',
      description: 'Month for calendar view (1-12)',
      schema: { type: 'integer' },
    },
  ],
  responses: {
    200: {
      description: 'Reading statistics',
      content: {
        'application/json': {
          schema: z.object({
            data: z.any(), // Actual schema depends on dimension
          }),
        },
      },
    },
    400: {
      description: 'Invalid parameters',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
})

app.openapi(getReadingStatsRoute, async (c) => {
  const userId = c.get('userId')
  const dimension = c.req.query('dimension') as 'week' | 'month' | 'year' | 'total' | 'calendar'
  const dateStr = c.req.query('date')
  const yearStr = c.req.query('year')
  const monthStr = c.req.query('month')

  try {
    let result: any

    switch (dimension) {
      case 'week': {
        // Default to current week (Monday)
        let weekStart: Date
        if (dateStr) {
          weekStart = new Date(dateStr)
        } else {
          const now = new Date()
          const day = now.getDay()
          const diff = day === 0 ? -6 : 1 - day // Adjust to Monday
          weekStart = new Date(now)
          weekStart.setDate(now.getDate() + diff)
        }
        weekStart.setHours(0, 0, 0, 0)
        result = await readingStatsService.getWeekStats(userId, weekStart)
        break
      }

      case 'month': {
        const now = new Date()
        const year = yearStr ? parseInt(yearStr) : now.getFullYear()
        const month = monthStr ? parseInt(monthStr) : now.getMonth() + 1
        result = await readingStatsService.getMonthStats(userId, year, month)
        break
      }

      case 'year': {
        const now = new Date()
        const year = yearStr ? parseInt(yearStr) : now.getFullYear()
        result = await readingStatsService.getYearStats(userId, year)
        break
      }

      case 'total': {
        result = await readingStatsService.getTotalStats(userId)
        break
      }

      case 'calendar': {
        const now = new Date()
        const year = yearStr ? parseInt(yearStr) : now.getFullYear()
        const month = monthStr ? parseInt(monthStr) : now.getMonth() + 1
        result = await readingStatsService.getCalendarStats(userId, year, month)
        break
      }

      default:
        return c.json(
          {
            error: {
              code: 'INVALID_DIMENSION',
              message: 'Invalid dimension parameter',
            },
          },
          400
        )
    }

    return c.json({ data: result })
  } catch (error) {
    return c.json(
      {
        error: {
          code: 'STATS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get stats',
        },
      },
      400
    )
  }
})

// GET /api/user/milestones
const getMilestonesRoute = createRoute({
  method: 'get',
  path: '/milestones',
  tags: ['Reading Statistics'],
  summary: 'Get reading milestones',
  security: [{ Bearer: [] }],
  parameters: [
    {
      name: 'limit',
      in: 'query',
      schema: { type: 'integer', default: 20 },
    },
    {
      name: 'year',
      in: 'query',
      schema: { type: 'integer' },
    },
  ],
  responses: {
    200: {
      description: 'Reading milestones',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(
              z.object({
                id: z.number(),
                type: z.string(),
                date: z.string().nullable(),
                title: z.string(),
                description: z.string().nullable(),
                value: z.number().nullable(),
                book: z
                  .object({
                    id: z.number(),
                    title: z.string().nullable(),
                    type: z.string().nullable(),
                  })
                  .nullable(),
              })
            ),
          }),
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
})

app.openapi(getMilestonesRoute, async (c) => {
  const userId = c.get('userId')
  const limit = parseInt(c.req.query('limit') || '20')
  const yearStr = c.req.query('year')
  const year = yearStr ? parseInt(yearStr) : undefined

  const milestones = await readingStatsService.getMilestones(userId, limit, year)

  return c.json({ data: milestones })
})

// GET /api/social/leaderboard
const getLeaderboardRoute = createRoute({
  method: 'get',
  path: '/leaderboard',
  tags: ['Reading Statistics'],
  summary: 'Get weekly leaderboard',
  security: [{ Bearer: [] }],
  parameters: [
    {
      name: 'type',
      in: 'query',
      schema: { type: 'string', enum: ['friends', 'all'], default: 'friends' },
    },
    {
      name: 'week',
      in: 'query',
      description: 'Week start date (YYYY-MM-DD, Monday)',
      schema: { type: 'string' },
    },
  ],
  responses: {
    200: {
      description: 'Weekly leaderboard',
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({
              weekRange: z.object({
                start: z.string(),
                end: z.string(),
                settlementTime: z.string(),
              }),
              myRanking: z
                .object({
                  rank: z.number(),
                  duration: z.number(),
                  rankChange: z.number(),
                  readingDays: z.number(),
                })
                .nullable(),
              entries: z.array(
                z.object({
                  rank: z.number().nullable(),
                  user: z.object({
                    id: z.number(),
                    username: z.string(),
                    avatar: z.string().nullable(),
                  }),
                  duration: z.number(),
                  readingDays: z.number(),
                  rankChange: z.number(),
                  likesCount: z.number(),
                  isLiked: z.boolean(),
                })
              ),
              totalParticipants: z.number(),
            }),
          }),
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
})

app.openapi(getLeaderboardRoute, async (c) => {
  const userId = c.get('userId')
  const type = (c.req.query('type') || 'friends') as 'friends' | 'all'
  const weekStr = c.req.query('week')

  // Default to current week (Monday)
  let weekStart: Date
  if (weekStr) {
    weekStart = new Date(weekStr)
  } else {
    const now = new Date()
    const day = now.getDay()
    const diff = day === 0 ? -6 : 1 - day // Adjust to Monday
    weekStart = new Date(now)
    weekStart.setDate(now.getDate() + diff)
  }
  weekStart.setHours(0, 0, 0, 0)

  const result = await readingStatsService.getLeaderboard(userId, weekStart, type)

  return c.json({ data: result })
})

// POST /api/social/leaderboard/:userId/like
const likeLeaderboardUserRoute = createRoute({
  method: 'post',
  path: '/leaderboard/{targetUserId}/like',
  tags: ['Reading Statistics'],
  summary: 'Like a user on the leaderboard',
  security: [{ Bearer: [] }],
  parameters: [
    {
      name: 'targetUserId',
      in: 'path',
      required: true,
      schema: { type: 'integer' },
    },
  ],
  responses: {
    200: {
      description: 'Like successful',
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({
              success: z.boolean(),
            }),
          }),
        },
      },
    },
    400: {
      description: 'Already liked',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
})

app.openapi(likeLeaderboardUserRoute, async (c) => {
  const userId = c.get('userId')
  const targetUserId = parseInt(c.req.param('targetUserId'))

  // Get current week start (Monday)
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() + diff)
  weekStart.setHours(0, 0, 0, 0)

  try {
    const result = await readingStatsService.likeLeaderboardUser(
      userId,
      targetUserId,
      weekStart
    )
    return c.json({ data: result }, 200)
  } catch (error) {
    return c.json(
      {
        error: {
          code: 'LIKE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to like',
        },
      },
      400
    )
  }
})

// ============================================
// User Bookshelf Endpoint
// ============================================

const BookshelfItemSchema = z.object({
  id: z.number(),
  bookType: z.enum(['ebook', 'magazine', 'book']),
  bookId: z.number(),
  status: z.enum(['want_to_read', 'reading', 'finished', 'abandoned']),
  progress: z.number().nullable(),
  currentPage: z.number().nullable(),
  addedAt: z.string().nullable(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  book: z.object({
    title: z.string(),
    coverUrl: z.string().nullable(),
    author: z.string().nullable(),
    fileType: z.string().nullable(),
  }),
})

// GET /api/user/bookshelf - Get user's bookshelf with filters
const getBookshelfRoute = createRoute({
  method: 'get',
  path: '/bookshelf',
  tags: ['User'],
  summary: "Get current user's bookshelf",
  description: 'Returns books on bookshelf with optional status filter and sorting',
  security: [{ Bearer: [] }],
  request: {
    query: z.object({
      status: z.enum(['want_to_read', 'reading', 'finished', 'abandoned', 'all']).default('all'),
      type: z.enum(['ebook', 'magazine', 'book', 'all']).default('all'),
      sort: z.enum(['added', 'updated', 'title', 'progress', 'lastRead']).default('added'),
      openedOnly: z.coerce.boolean().optional().default(false),
      order: z.enum(['asc', 'desc']).default('desc'),
      limit: z.coerce.number().default(50),
      offset: z.coerce.number().default(0),
    }),
  },
  responses: {
    200: {
      description: 'User bookshelf',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(BookshelfItemSchema),
            total: z.number(),
            hasMore: z.boolean(),
            counts: z.object({
              all: z.number(),
              want_to_read: z.number(),
              reading: z.number(),
              finished: z.number(),
              abandoned: z.number(),
            }),
          }),
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
})

app.openapi(getBookshelfRoute, async (c) => {
  const userId = c.get('userId')
  const { status, type, sort, order, limit, offset, openedOnly } = c.req.valid('query')

  // Build query conditions
  const conditions = [eq(userBookshelves.userId, userId)]

  if (status !== 'all') {
    conditions.push(eq(userBookshelves.status, status))
  }

  if (type !== 'all') {
    conditions.push(eq(userBookshelves.bookType, type))
  }

  // Filter for opened books only (books that have been read at least once)
  if (openedOnly) {
    conditions.push(
      or(
        isNotNull(userBookshelves.startedAt),
        gt(userBookshelves.progress, '0')
      )!
    )
  }

  // Determine sort order
  let orderBy: any
  const orderFn = order === 'asc' ? asc : desc
  switch (sort) {
    case 'updated':
    case 'lastRead':
      // Use updatedAt for lastRead since it's updated when progress is saved
      orderBy = orderFn(userBookshelves.updatedAt)
      break
    case 'title':
      // Will sort by title after fetching (need to join with books)
      orderBy = orderFn(userBookshelves.addedAt)
      break
    case 'progress':
      orderBy = orderFn(userBookshelves.progress)
      break
    default: // added
      orderBy = orderFn(userBookshelves.addedAt)
  }

  // Fetch bookshelf entries
  const entries = await db
    .select()
    .from(userBookshelves)
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(limit + 1)
    .offset(offset)

  const hasMore = entries.length > limit
  const paginatedEntries = entries.slice(0, limit)

  // Fetch book details for each entry
  const bookshelfItems = await Promise.all(
    paginatedEntries.map(async (entry) => {
      let book: { title: string; coverUrl: string | null; author: string | null; fileType: string | null } | null = null

      if (entry.bookType === 'ebook') {
        const [ebook] = await db
          .select({
            title: ebooks.title,
            coverUrl: ebooks.coverUrl,
            author: ebooks.author,
            fileType: ebooks.fileType,
          })
          .from(ebooks)
          .where(eq(ebooks.id, entry.bookId))
          .limit(1)
        book = ebook || null
      } else if (entry.bookType === 'magazine') {
        const [magazine] = await db
          .select({
            title: magazines.title,
            coverUrl: magazines.coverUrl,
            author: magazines.issueNumber, // Use issue number as "author" for display
            fileType: magazines.fileSize, // Magazines are PDFs
          })
          .from(magazines)
          .where(eq(magazines.id, entry.bookId))
          .limit(1)
        book = magazine
          ? {
              title: magazine.title,
              coverUrl: magazine.coverUrl,
              author: magazine.author ? `#${magazine.author}` : null,
              fileType: 'pdf',
            }
          : null
      } else if (entry.bookType === 'book') {
        // Physical books
        const [physicalBook] = await db
          .select({
            title: books.title,
            coverUrl: books.coverUrl,
            author: books.author,
          })
          .from(books)
          .where(eq(books.id, entry.bookId))
          .limit(1)
        book = physicalBook
          ? {
              title: physicalBook.title || 'Unknown',
              coverUrl: physicalBook.coverUrl,
              author: physicalBook.author,
              fileType: null, // Physical books have no file type
            }
          : null
      }

      return {
        id: entry.id,
        bookType: entry.bookType as 'ebook' | 'magazine' | 'book',
        bookId: entry.bookId,
        status: entry.status as any,
        progress: entry.progress ? parseFloat(entry.progress) : null,
        currentPage: entry.currentPage,
        addedAt: entry.addedAt?.toISOString() ?? null,
        startedAt: entry.startedAt?.toISOString() ?? null,
        finishedAt: entry.finishedAt?.toISOString() ?? null,
        book: book || { title: 'Unknown', coverUrl: null, author: null, fileType: null },
      }
    })
  )

  // Sort by title if requested
  if (sort === 'title') {
    bookshelfItems.sort((a, b) => {
      const comparison = a.book.title.localeCompare(b.book.title, 'zh-Hans')
      return order === 'asc' ? comparison : -comparison
    })
  }

  // Get status counts
  const allEntries = await db
    .select({ status: userBookshelves.status })
    .from(userBookshelves)
    .where(eq(userBookshelves.userId, userId))

  const counts = {
    all: allEntries.length,
    want_to_read: allEntries.filter((e) => e.status === 'want_to_read').length,
    reading: allEntries.filter((e) => e.status === 'reading').length,
    finished: allEntries.filter((e) => e.status === 'finished').length,
    abandoned: allEntries.filter((e) => e.status === 'abandoned').length,
  }

  return c.json({
    data: bookshelfItems,
    total: counts[status === 'all' ? 'all' : status],
    hasMore,
    counts,
  }, 200)
})

export default app
