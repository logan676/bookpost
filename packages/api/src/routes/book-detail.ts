/**
 * Book Detail Routes - Unified detail endpoint for ebooks and magazines
 * Provides enhanced metadata, stats, reviews, and user bookshelf status
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { db } from '../db/client'
import {
  ebooks,
  magazines,
  bookStats,
  bookReviews,
  reviewLikes,
  userBookshelves,
  readingHistory,
  users
} from '../db/schema'
import { eq, and, desc, sql } from 'drizzle-orm'
import { optionalAuth, requireAuth } from '../middleware/auth'

const app = new OpenAPIHono()

// Schemas
const BookMetadataSchema = z.object({
  id: z.number(),
  type: z.enum(['ebook', 'magazine']),
  title: z.string(),
  coverUrl: z.string().nullable(),
  author: z.string().nullable(),
  translator: z.string().nullable(),
  description: z.string().nullable(),
  wordCount: z.number().nullable(),
  pageCount: z.number().nullable(),
  publicationDate: z.string().nullable(),
  publisher: z.string().nullable(),
  isbn: z.string().nullable(),
  language: z.string().nullable(),
  fileType: z.string().nullable(),
  fileSize: z.number().nullable(),
  // Magazine specific
  issueNumber: z.string().nullable().optional(),
  issn: z.string().nullable().optional(),
  // External IDs
  doubanId: z.string().nullable().optional(),
  goodreadsId: z.string().nullable().optional(),
  createdAt: z.string().nullable(),
})

const BookStatsSchema = z.object({
  totalReaders: z.number(),
  currentReaders: z.number(),
  finishedReaders: z.number(),
  totalHighlights: z.number(),
  totalReviews: z.number(),
  totalNotes: z.number(),
  averageRating: z.number().nullable(),
  ratingCount: z.number(),
  recommendPercent: z.number().nullable(),
})

const ReviewUserSchema = z.object({
  id: z.number(),
  username: z.string(),
  avatar: z.string().nullable(),
})

const ReviewSchema = z.object({
  id: z.number(),
  user: ReviewUserSchema,
  rating: z.number().nullable(),
  recommendType: z.string().nullable(),
  title: z.string().nullable(),
  content: z.string(),
  likesCount: z.number(),
  isFeatured: z.boolean(),
  readingProgress: z.number().nullable(),
  createdAt: z.string().nullable(),
})

const UserBookshelfStatusSchema = z.object({
  status: z.enum(['want_to_read', 'reading', 'finished', 'abandoned']).nullable(),
  progress: z.number().nullable(),
  currentPage: z.number().nullable(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  addedAt: z.string().nullable(),
})

const BookDetailResponseSchema = z.object({
  book: BookMetadataSchema,
  stats: BookStatsSchema,
  recentReviews: z.array(ReviewSchema),
  userStatus: UserBookshelfStatusSchema.nullable(),
})

// GET /api/book-detail/:type/:id - Get book detail with stats and reviews
const getBookDetailRoute = createRoute({
  method: 'get',
  path: '/:type/:id',
  tags: ['Book Detail'],
  summary: 'Get detailed book information with stats and reviews',
  description: 'Returns enhanced book metadata, community stats, recent reviews, and user bookshelf status (if authenticated)',
  request: {
    params: z.object({
      type: z.enum(['ebook', 'magazine']),
      id: z.coerce.number(),
    }),
  },
  responses: {
    200: {
      description: 'Book detail with stats and reviews',
      content: {
        'application/json': {
          schema: z.object({ data: BookDetailResponseSchema }),
        },
      },
    },
    404: {
      description: 'Book not found',
      content: {
        'application/json': {
          schema: z.object({
            error: z.object({
              code: z.string(),
              message: z.string(),
            }),
          }),
        },
      },
    },
  },
})

// Apply optional auth - allows both authenticated and anonymous access
app.use('*', optionalAuth)

app.openapi(getBookDetailRoute, async (c) => {
  const { type, id } = c.req.valid('param')
  const userId = c.get('userId') // Will be undefined if not authenticated

  // Fetch book based on type
  let book: any = null

  if (type === 'ebook') {
    const [result] = await db.select().from(ebooks).where(eq(ebooks.id, id)).limit(1)
    if (result) {
      book = {
        id: result.id,
        type: 'ebook' as const,
        title: result.title,
        coverUrl: result.coverUrl,
        author: result.author,
        translator: result.translator,
        description: result.description,
        wordCount: result.wordCount,
        pageCount: result.pageCount,
        publicationDate: result.publicationDate,
        publisher: result.publisher,
        isbn: result.isbn,
        language: result.language,
        fileType: result.fileType,
        fileSize: result.fileSize,
        doubanId: result.doubanId,
        goodreadsId: result.goodreadsId,
        createdAt: result.createdAt?.toISOString() ?? null,
      }
    }
  } else {
    const [result] = await db.select().from(magazines).where(eq(magazines.id, id)).limit(1)
    if (result) {
      book = {
        id: result.id,
        type: 'magazine' as const,
        title: result.title,
        coverUrl: result.coverUrl,
        author: null, // Magazines don't have authors
        translator: null,
        description: result.description,
        wordCount: null,
        pageCount: result.pageCount,
        publicationDate: result.publicationDate,
        publisher: null,
        isbn: null,
        language: result.language,
        fileType: 'pdf', // Magazines are typically PDF
        fileSize: result.fileSize,
        issueNumber: result.issueNumber,
        issn: result.issn,
        createdAt: result.createdAt?.toISOString() ?? null,
      }
    }
  }

  if (!book) {
    return c.json({
      error: { code: 'NOT_FOUND', message: `${type === 'ebook' ? 'Ebook' : 'Magazine'} not found` },
    }, 404)
  }

  // Fetch book stats (create default if not exists)
  let stats = await db
    .select()
    .from(bookStats)
    .where(and(eq(bookStats.bookType, type), eq(bookStats.bookId, id)))
    .limit(1)
    .then(rows => rows[0])

  // Default stats if none exist
  const statsResponse = {
    totalReaders: stats?.totalReaders ?? 0,
    currentReaders: stats?.currentReaders ?? 0,
    finishedReaders: stats?.finishedReaders ?? 0,
    totalHighlights: stats?.totalHighlights ?? 0,
    totalReviews: stats?.totalReviews ?? 0,
    totalNotes: stats?.totalNotes ?? 0,
    averageRating: stats?.averageRating ? parseFloat(stats.averageRating) : null,
    ratingCount: stats?.ratingCount ?? 0,
    recommendPercent: stats?.recommendPercent ? parseFloat(stats.recommendPercent) : null,
  }

  // Fetch recent reviews with user info
  const reviewsWithUsers = await db
    .select({
      review: bookReviews,
      user: {
        id: users.id,
        username: users.username,
        avatar: users.avatar,
      },
    })
    .from(bookReviews)
    .innerJoin(users, eq(bookReviews.userId, users.id))
    .where(
      and(
        eq(bookReviews.bookType, type),
        eq(bookReviews.bookId, id),
        eq(bookReviews.isHidden, false)
      )
    )
    .orderBy(desc(bookReviews.isFeatured), desc(bookReviews.createdAt))
    .limit(5)

  const recentReviews = reviewsWithUsers.map(({ review, user }) => ({
    id: review.id,
    user: {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
    },
    rating: review.rating,
    recommendType: review.recommendType,
    title: review.title,
    content: review.content,
    likesCount: review.likesCount ?? 0,
    isFeatured: review.isFeatured ?? false,
    readingProgress: review.readingProgress ? parseFloat(review.readingProgress) : null,
    createdAt: review.createdAt?.toISOString() ?? null,
  }))

  // Fetch user's bookshelf status if authenticated
  let userStatus: any = null
  if (userId) {
    const [bookshelfEntry] = await db
      .select()
      .from(userBookshelves)
      .where(
        and(
          eq(userBookshelves.userId, userId),
          eq(userBookshelves.bookType, type),
          eq(userBookshelves.bookId, id)
        )
      )
      .limit(1)

    if (bookshelfEntry) {
      userStatus = {
        status: bookshelfEntry.status as any,
        progress: bookshelfEntry.progress ? parseFloat(bookshelfEntry.progress) : null,
        currentPage: bookshelfEntry.currentPage,
        startedAt: bookshelfEntry.startedAt?.toISOString() ?? null,
        finishedAt: bookshelfEntry.finishedAt?.toISOString() ?? null,
        addedAt: bookshelfEntry.addedAt?.toISOString() ?? null,
      }
    }
  }

  return c.json({
    data: {
      book,
      stats: statsResponse,
      recentReviews,
      userStatus,
    },
  })
})

// GET /api/book-detail/:type/:id/reviews - Get all reviews with pagination
const getBookReviewsRoute = createRoute({
  method: 'get',
  path: '/:type/:id/reviews',
  tags: ['Book Detail'],
  summary: 'Get paginated reviews for a book',
  request: {
    params: z.object({
      type: z.enum(['ebook', 'magazine']),
      id: z.coerce.number(),
    }),
    query: z.object({
      limit: z.coerce.number().default(20),
      offset: z.coerce.number().default(0),
      sort: z.enum(['newest', 'oldest', 'highest', 'lowest', 'helpful']).default('newest'),
    }),
  },
  responses: {
    200: {
      description: 'Paginated list of reviews',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(ReviewSchema),
            total: z.number(),
            hasMore: z.boolean(),
          }),
        },
      },
    },
  },
})

app.openapi(getBookReviewsRoute, async (c) => {
  const { type, id } = c.req.valid('param')
  const { limit, offset, sort } = c.req.valid('query')

  // Determine sort order
  let orderBy
  switch (sort) {
    case 'oldest':
      orderBy = bookReviews.createdAt
      break
    case 'highest':
      orderBy = desc(bookReviews.rating)
      break
    case 'lowest':
      orderBy = bookReviews.rating
      break
    case 'helpful':
      orderBy = desc(bookReviews.likesCount)
      break
    default: // newest
      orderBy = desc(bookReviews.createdAt)
  }

  const reviewsWithUsers = await db
    .select({
      review: bookReviews,
      user: {
        id: users.id,
        username: users.username,
        avatar: users.avatar,
      },
    })
    .from(bookReviews)
    .innerJoin(users, eq(bookReviews.userId, users.id))
    .where(
      and(
        eq(bookReviews.bookType, type),
        eq(bookReviews.bookId, id),
        eq(bookReviews.isHidden, false)
      )
    )
    .orderBy(orderBy)
    .limit(limit + 1) // Fetch one extra to determine hasMore
    .offset(offset)

  const hasMore = reviewsWithUsers.length > limit
  const reviews = reviewsWithUsers.slice(0, limit).map(({ review, user }) => ({
    id: review.id,
    user: {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
    },
    rating: review.rating,
    recommendType: review.recommendType,
    title: review.title,
    content: review.content,
    likesCount: review.likesCount ?? 0,
    isFeatured: review.isFeatured ?? false,
    readingProgress: review.readingProgress ? parseFloat(review.readingProgress) : null,
    createdAt: review.createdAt?.toISOString() ?? null,
  }))

  // Get total count
  const [countResult] = await db
    .select({ count: db.$count(bookReviews) })
    .from(bookReviews)
    .where(
      and(
        eq(bookReviews.bookType, type),
        eq(bookReviews.bookId, id),
        eq(bookReviews.isHidden, false)
      )
    )

  return c.json({
    data: reviews,
    total: countResult?.count ?? 0,
    hasMore,
  })
})

// ============================================
// Review CRUD Endpoints (Authenticated)
// ============================================

// Schema for creating/updating reviews
const CreateReviewSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  recommendType: z.enum(['recommend', 'neutral', 'not_recommend']).optional(),
  title: z.string().max(100).optional(),
  content: z.string().min(1).max(5000),
})

// POST /api/book-detail/:type/:id/reviews - Create a review
const createReviewRoute = createRoute({
  method: 'post',
  path: '/:type/:id/reviews',
  tags: ['Book Detail'],
  summary: 'Create a review for a book',
  description: 'Submit a new review with rating and/or recommendation. User can only have one review per book.',
  request: {
    params: z.object({
      type: z.enum(['ebook', 'magazine']),
      id: z.coerce.number(),
    }),
    body: {
      content: {
        'application/json': {
          schema: CreateReviewSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Review created successfully',
      content: {
        'application/json': {
          schema: z.object({ data: ReviewSchema }),
        },
      },
    },
    400: {
      description: 'Invalid input or review already exists',
      content: {
        'application/json': {
          schema: z.object({
            error: z.object({ code: z.string(), message: z.string() }),
          }),
        },
      },
    },
    401: {
      description: 'Authentication required',
      content: {
        'application/json': {
          schema: z.object({
            error: z.object({ code: z.string(), message: z.string() }),
          }),
        },
      },
    },
  },
})

// Authenticated routes group
const authApp = new OpenAPIHono()
authApp.use('*', requireAuth)

authApp.openapi(createReviewRoute, async (c) => {
  const { type, id } = c.req.valid('param')
  const body = c.req.valid('json')
  const userId = c.get('userId')

  // Check if user already has a review for this book
  const [existingReview] = await db
    .select()
    .from(bookReviews)
    .where(
      and(
        eq(bookReviews.userId, userId),
        eq(bookReviews.bookType, type),
        eq(bookReviews.bookId, id)
      )
    )
    .limit(1)

  if (existingReview) {
    return c.json({
      error: { code: 'REVIEW_EXISTS', message: 'You have already reviewed this book. Please edit your existing review.' },
    }, 400)
  }

  // Get user's current reading progress
  const [historyEntry] = await db
    .select()
    .from(readingHistory)
    .where(
      and(
        eq(readingHistory.userId, userId),
        eq(readingHistory.itemType, type),
        eq(readingHistory.itemId, id)
      )
    )
    .limit(1)

  // Create the review
  const [newReview] = await db
    .insert(bookReviews)
    .values({
      userId,
      bookType: type,
      bookId: id,
      rating: body.rating,
      recommendType: body.recommendType,
      title: body.title,
      content: body.content,
      readingProgress: historyEntry?.progress ?? null,
    })
    .returning()

  // Update book stats
  await updateBookStats(type, id)

  // Fetch user info for response
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)

  return c.json({
    data: {
      id: newReview.id,
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
      },
      rating: newReview.rating,
      recommendType: newReview.recommendType,
      title: newReview.title,
      content: newReview.content,
      likesCount: 0,
      isFeatured: false,
      readingProgress: newReview.readingProgress ? parseFloat(newReview.readingProgress) : null,
      createdAt: newReview.createdAt?.toISOString() ?? null,
    },
  }, 201)
})

// PUT /api/book-detail/:type/:id/reviews/mine - Update own review
const updateReviewRoute = createRoute({
  method: 'put',
  path: '/:type/:id/reviews/mine',
  tags: ['Book Detail'],
  summary: 'Update your own review',
  request: {
    params: z.object({
      type: z.enum(['ebook', 'magazine']),
      id: z.coerce.number(),
    }),
    body: {
      content: {
        'application/json': {
          schema: CreateReviewSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Review updated successfully',
      content: {
        'application/json': {
          schema: z.object({ data: ReviewSchema }),
        },
      },
    },
    404: {
      description: 'Review not found',
      content: {
        'application/json': {
          schema: z.object({
            error: z.object({ code: z.string(), message: z.string() }),
          }),
        },
      },
    },
  },
})

authApp.openapi(updateReviewRoute, async (c) => {
  const { type, id } = c.req.valid('param')
  const body = c.req.valid('json')
  const userId = c.get('userId')

  // Find user's review
  const [existingReview] = await db
    .select()
    .from(bookReviews)
    .where(
      and(
        eq(bookReviews.userId, userId),
        eq(bookReviews.bookType, type),
        eq(bookReviews.bookId, id)
      )
    )
    .limit(1)

  if (!existingReview) {
    return c.json({
      error: { code: 'NOT_FOUND', message: 'You have not reviewed this book yet.' },
    }, 404)
  }

  // Update the review
  const [updatedReview] = await db
    .update(bookReviews)
    .set({
      rating: body.rating,
      recommendType: body.recommendType,
      title: body.title,
      content: body.content,
      updatedAt: new Date(),
    })
    .where(eq(bookReviews.id, existingReview.id))
    .returning()

  // Update book stats if rating/recommendation changed
  await updateBookStats(type, id)

  // Fetch user info for response
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)

  return c.json({
    data: {
      id: updatedReview.id,
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
      },
      rating: updatedReview.rating,
      recommendType: updatedReview.recommendType,
      title: updatedReview.title,
      content: updatedReview.content,
      likesCount: updatedReview.likesCount ?? 0,
      isFeatured: updatedReview.isFeatured ?? false,
      readingProgress: updatedReview.readingProgress ? parseFloat(updatedReview.readingProgress) : null,
      createdAt: updatedReview.createdAt?.toISOString() ?? null,
    },
  })
})

// DELETE /api/book-detail/:type/:id/reviews/mine - Delete own review
const deleteReviewRoute = createRoute({
  method: 'delete',
  path: '/:type/:id/reviews/mine',
  tags: ['Book Detail'],
  summary: 'Delete your own review',
  request: {
    params: z.object({
      type: z.enum(['ebook', 'magazine']),
      id: z.coerce.number(),
    }),
  },
  responses: {
    200: {
      description: 'Review deleted successfully',
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
    404: {
      description: 'Review not found',
      content: {
        'application/json': {
          schema: z.object({
            error: z.object({ code: z.string(), message: z.string() }),
          }),
        },
      },
    },
  },
})

authApp.openapi(deleteReviewRoute, async (c) => {
  const { type, id } = c.req.valid('param')
  const userId = c.get('userId')

  // Find user's review
  const [existingReview] = await db
    .select()
    .from(bookReviews)
    .where(
      and(
        eq(bookReviews.userId, userId),
        eq(bookReviews.bookType, type),
        eq(bookReviews.bookId, id)
      )
    )
    .limit(1)

  if (!existingReview) {
    return c.json({
      error: { code: 'NOT_FOUND', message: 'You have not reviewed this book.' },
    }, 404)
  }

  // Delete all likes for this review first
  await db.delete(reviewLikes).where(eq(reviewLikes.reviewId, existingReview.id))

  // Delete the review
  await db.delete(bookReviews).where(eq(bookReviews.id, existingReview.id))

  // Update book stats
  await updateBookStats(type, id)

  return c.json({ success: true })
})

// GET /api/book-detail/:type/:id/reviews/mine - Get own review
const getOwnReviewRoute = createRoute({
  method: 'get',
  path: '/:type/:id/reviews/mine',
  tags: ['Book Detail'],
  summary: 'Get your own review for a book',
  request: {
    params: z.object({
      type: z.enum(['ebook', 'magazine']),
      id: z.coerce.number(),
    }),
  },
  responses: {
    200: {
      description: 'User\'s review or null if not reviewed',
      content: {
        'application/json': {
          schema: z.object({ data: ReviewSchema.nullable() }),
        },
      },
    },
  },
})

authApp.openapi(getOwnReviewRoute, async (c) => {
  const { type, id } = c.req.valid('param')
  const userId = c.get('userId')

  const [review] = await db
    .select()
    .from(bookReviews)
    .where(
      and(
        eq(bookReviews.userId, userId),
        eq(bookReviews.bookType, type),
        eq(bookReviews.bookId, id)
      )
    )
    .limit(1)

  if (!review) {
    return c.json({ data: null })
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)

  return c.json({
    data: {
      id: review.id,
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
      },
      rating: review.rating,
      recommendType: review.recommendType,
      title: review.title,
      content: review.content,
      likesCount: review.likesCount ?? 0,
      isFeatured: review.isFeatured ?? false,
      readingProgress: review.readingProgress ? parseFloat(review.readingProgress) : null,
      createdAt: review.createdAt?.toISOString() ?? null,
    },
  })
})

// POST /api/book-detail/reviews/:reviewId/like - Toggle like on a review
const toggleLikeRoute = createRoute({
  method: 'post',
  path: '/reviews/:reviewId/like',
  tags: ['Book Detail'],
  summary: 'Toggle like on a review',
  description: 'Like or unlike a review. Returns the new like status.',
  request: {
    params: z.object({
      reviewId: z.coerce.number(),
    }),
  },
  responses: {
    200: {
      description: 'Like status toggled',
      content: {
        'application/json': {
          schema: z.object({
            liked: z.boolean(),
            likesCount: z.number(),
          }),
        },
      },
    },
    404: {
      description: 'Review not found',
      content: {
        'application/json': {
          schema: z.object({
            error: z.object({ code: z.string(), message: z.string() }),
          }),
        },
      },
    },
  },
})

authApp.openapi(toggleLikeRoute, async (c) => {
  const { reviewId } = c.req.valid('param')
  const userId = c.get('userId')

  // Check if review exists
  const [review] = await db
    .select()
    .from(bookReviews)
    .where(eq(bookReviews.id, reviewId))
    .limit(1)

  if (!review) {
    return c.json({
      error: { code: 'NOT_FOUND', message: 'Review not found' },
    }, 404)
  }

  // Check if already liked
  const [existingLike] = await db
    .select()
    .from(reviewLikes)
    .where(
      and(
        eq(reviewLikes.userId, userId),
        eq(reviewLikes.reviewId, reviewId)
      )
    )
    .limit(1)

  let liked: boolean
  let newLikesCount: number

  if (existingLike) {
    // Unlike: remove the like
    await db.delete(reviewLikes).where(eq(reviewLikes.id, existingLike.id))
    newLikesCount = Math.max(0, (review.likesCount ?? 0) - 1)
    liked = false
  } else {
    // Like: add the like
    await db.insert(reviewLikes).values({
      userId,
      reviewId,
    })
    newLikesCount = (review.likesCount ?? 0) + 1
    liked = true
  }

  // Update the review's likes count
  await db
    .update(bookReviews)
    .set({ likesCount: newLikesCount })
    .where(eq(bookReviews.id, reviewId))

  return c.json({
    liked,
    likesCount: newLikesCount,
  })
})

// GET /api/book-detail/reviews/:reviewId/liked - Check if user liked a review
const checkLikedRoute = createRoute({
  method: 'get',
  path: '/reviews/:reviewId/liked',
  tags: ['Book Detail'],
  summary: 'Check if current user liked a review',
  request: {
    params: z.object({
      reviewId: z.coerce.number(),
    }),
  },
  responses: {
    200: {
      description: 'Like status',
      content: {
        'application/json': {
          schema: z.object({ liked: z.boolean() }),
        },
      },
    },
  },
})

authApp.openapi(checkLikedRoute, async (c) => {
  const { reviewId } = c.req.valid('param')
  const userId = c.get('userId')

  const [existingLike] = await db
    .select()
    .from(reviewLikes)
    .where(
      and(
        eq(reviewLikes.userId, userId),
        eq(reviewLikes.reviewId, reviewId)
      )
    )
    .limit(1)

  return c.json({ liked: !!existingLike })
})

// ============================================
// Bookshelf Management Endpoints (Authenticated)
// ============================================

// Schema for bookshelf operations
const BookshelfStatusEnum = z.enum(['want_to_read', 'reading', 'finished', 'abandoned'])

const AddToBookshelfSchema = z.object({
  status: BookshelfStatusEnum.default('want_to_read'),
})

const UpdateBookshelfSchema = z.object({
  status: BookshelfStatusEnum.optional(),
  progress: z.number().min(0).max(1).optional(),
  currentPage: z.number().optional(),
  privateNotes: z.string().max(1000).optional(),
})

const BookshelfEntrySchema = z.object({
  id: z.number(),
  bookType: z.enum(['ebook', 'magazine']),
  bookId: z.number(),
  status: BookshelfStatusEnum,
  progress: z.number().nullable(),
  currentPage: z.number().nullable(),
  privateNotes: z.string().nullable(),
  addedAt: z.string().nullable(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
})

// POST /api/book-detail/:type/:id/bookshelf - Add to bookshelf
const addToBookshelfRoute = createRoute({
  method: 'post',
  path: '/:type/:id/bookshelf',
  tags: ['Book Detail'],
  summary: 'Add a book to your bookshelf',
  description: 'Add a book with initial status. If already on bookshelf, returns existing entry.',
  request: {
    params: z.object({
      type: z.enum(['ebook', 'magazine']),
      id: z.coerce.number(),
    }),
    body: {
      content: {
        'application/json': {
          schema: AddToBookshelfSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Book added to bookshelf or already exists',
      content: {
        'application/json': {
          schema: z.object({
            data: BookshelfEntrySchema,
            isNew: z.boolean(),
          }),
        },
      },
    },
    404: {
      description: 'Book not found',
      content: {
        'application/json': {
          schema: z.object({
            error: z.object({ code: z.string(), message: z.string() }),
          }),
        },
      },
    },
  },
})

authApp.openapi(addToBookshelfRoute, async (c) => {
  const { type, id } = c.req.valid('param')
  const body = c.req.valid('json')
  const userId = c.get('userId')

  // Verify book exists
  let bookExists = false
  if (type === 'ebook') {
    const [ebook] = await db.select({ id: ebooks.id }).from(ebooks).where(eq(ebooks.id, id)).limit(1)
    bookExists = !!ebook
  } else {
    const [magazine] = await db.select({ id: magazines.id }).from(magazines).where(eq(magazines.id, id)).limit(1)
    bookExists = !!magazine
  }

  if (!bookExists) {
    return c.json({
      error: { code: 'NOT_FOUND', message: `${type === 'ebook' ? 'Ebook' : 'Magazine'} not found` },
    }, 404)
  }

  // Check if already on bookshelf
  const [existing] = await db
    .select()
    .from(userBookshelves)
    .where(
      and(
        eq(userBookshelves.userId, userId),
        eq(userBookshelves.bookType, type),
        eq(userBookshelves.bookId, id)
      )
    )
    .limit(1)

  if (existing) {
    return c.json({
      data: {
        id: existing.id,
        bookType: existing.bookType as 'ebook' | 'magazine',
        bookId: existing.bookId,
        status: existing.status as any,
        progress: existing.progress ? parseFloat(existing.progress) : null,
        currentPage: existing.currentPage,
        privateNotes: existing.privateNotes,
        addedAt: existing.addedAt?.toISOString() ?? null,
        startedAt: existing.startedAt?.toISOString() ?? null,
        finishedAt: existing.finishedAt?.toISOString() ?? null,
      },
      isNew: false,
    })
  }

  // Determine timestamps based on status
  const now = new Date()
  const startedAt = body.status === 'reading' ? now : null
  const finishedAt = body.status === 'finished' ? now : null

  // Add to bookshelf
  const [entry] = await db
    .insert(userBookshelves)
    .values({
      userId,
      bookType: type,
      bookId: id,
      status: body.status,
      addedAt: now,
      startedAt,
      finishedAt,
    })
    .returning()

  // Update book stats (increment total readers)
  await updateBookshelfStats(type, id)

  return c.json({
    data: {
      id: entry.id,
      bookType: entry.bookType as 'ebook' | 'magazine',
      bookId: entry.bookId,
      status: entry.status as any,
      progress: entry.progress ? parseFloat(entry.progress) : null,
      currentPage: entry.currentPage,
      privateNotes: entry.privateNotes,
      addedAt: entry.addedAt?.toISOString() ?? null,
      startedAt: entry.startedAt?.toISOString() ?? null,
      finishedAt: entry.finishedAt?.toISOString() ?? null,
    },
    isNew: true,
  })
})

// PUT /api/book-detail/:type/:id/bookshelf - Update bookshelf entry
const updateBookshelfRoute = createRoute({
  method: 'put',
  path: '/:type/:id/bookshelf',
  tags: ['Book Detail'],
  summary: 'Update your bookshelf entry for a book',
  description: 'Update status, progress, or notes. Automatically manages startedAt/finishedAt timestamps.',
  request: {
    params: z.object({
      type: z.enum(['ebook', 'magazine']),
      id: z.coerce.number(),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateBookshelfSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Bookshelf entry updated',
      content: {
        'application/json': {
          schema: z.object({ data: BookshelfEntrySchema }),
        },
      },
    },
    404: {
      description: 'Book not on bookshelf',
      content: {
        'application/json': {
          schema: z.object({
            error: z.object({ code: z.string(), message: z.string() }),
          }),
        },
      },
    },
  },
})

authApp.openapi(updateBookshelfRoute, async (c) => {
  const { type, id } = c.req.valid('param')
  const body = c.req.valid('json')
  const userId = c.get('userId')

  // Find existing entry
  const [existing] = await db
    .select()
    .from(userBookshelves)
    .where(
      and(
        eq(userBookshelves.userId, userId),
        eq(userBookshelves.bookType, type),
        eq(userBookshelves.bookId, id)
      )
    )
    .limit(1)

  if (!existing) {
    return c.json({
      error: { code: 'NOT_FOUND', message: 'Book is not on your bookshelf. Add it first.' },
    }, 404)
  }

  // Build update object
  const updates: any = {
    updatedAt: new Date(),
  }

  if (body.status !== undefined) {
    updates.status = body.status

    // Handle status-specific timestamp updates
    const now = new Date()
    if (body.status === 'reading' && !existing.startedAt) {
      updates.startedAt = now
    }
    if (body.status === 'finished' && !existing.finishedAt) {
      updates.finishedAt = now
      if (!existing.startedAt) {
        updates.startedAt = now // Also set startedAt if not set
      }
    }
    // Clear finishedAt if going back to reading
    if (body.status === 'reading' && existing.status === 'finished') {
      updates.finishedAt = null
    }
  }

  if (body.progress !== undefined) {
    updates.progress = body.progress.toFixed(4)
  }

  if (body.currentPage !== undefined) {
    updates.currentPage = body.currentPage
  }

  if (body.privateNotes !== undefined) {
    updates.privateNotes = body.privateNotes
  }

  // Update the entry
  const [updated] = await db
    .update(userBookshelves)
    .set(updates)
    .where(eq(userBookshelves.id, existing.id))
    .returning()

  // Update book stats if status changed
  if (body.status !== undefined && body.status !== existing.status) {
    await updateBookshelfStats(type, id)
  }

  return c.json({
    data: {
      id: updated.id,
      bookType: updated.bookType as 'ebook' | 'magazine',
      bookId: updated.bookId,
      status: updated.status as any,
      progress: updated.progress ? parseFloat(updated.progress) : null,
      currentPage: updated.currentPage,
      privateNotes: updated.privateNotes,
      addedAt: updated.addedAt?.toISOString() ?? null,
      startedAt: updated.startedAt?.toISOString() ?? null,
      finishedAt: updated.finishedAt?.toISOString() ?? null,
    },
  })
})

// DELETE /api/book-detail/:type/:id/bookshelf - Remove from bookshelf
const removeFromBookshelfRoute = createRoute({
  method: 'delete',
  path: '/:type/:id/bookshelf',
  tags: ['Book Detail'],
  summary: 'Remove a book from your bookshelf',
  request: {
    params: z.object({
      type: z.enum(['ebook', 'magazine']),
      id: z.coerce.number(),
    }),
  },
  responses: {
    200: {
      description: 'Book removed from bookshelf',
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
    404: {
      description: 'Book not on bookshelf',
      content: {
        'application/json': {
          schema: z.object({
            error: z.object({ code: z.string(), message: z.string() }),
          }),
        },
      },
    },
  },
})

authApp.openapi(removeFromBookshelfRoute, async (c) => {
  const { type, id } = c.req.valid('param')
  const userId = c.get('userId')

  // Find existing entry
  const [existing] = await db
    .select()
    .from(userBookshelves)
    .where(
      and(
        eq(userBookshelves.userId, userId),
        eq(userBookshelves.bookType, type),
        eq(userBookshelves.bookId, id)
      )
    )
    .limit(1)

  if (!existing) {
    return c.json({
      error: { code: 'NOT_FOUND', message: 'Book is not on your bookshelf.' },
    }, 404)
  }

  // Delete the entry
  await db.delete(userBookshelves).where(eq(userBookshelves.id, existing.id))

  // Update book stats
  await updateBookshelfStats(type, id)

  return c.json({ success: true })
})

// Mount authenticated routes
app.route('/', authApp)

// ============================================
// Helper Functions
// ============================================

/**
 * Update bookshelf-related stats in bookStats table
 */
async function updateBookshelfStats(bookType: string, bookId: number) {
  // Count readers by status
  const statusCounts = await db
    .select({
      status: userBookshelves.status,
      count: sql<number>`count(*)::int`,
    })
    .from(userBookshelves)
    .where(
      and(
        eq(userBookshelves.bookType, bookType),
        eq(userBookshelves.bookId, bookId)
      )
    )
    .groupBy(userBookshelves.status)

  let totalReaders = 0
  let currentReaders = 0
  let finishedReaders = 0

  for (const { status, count } of statusCounts) {
    totalReaders += count
    if (status === 'reading') {
      currentReaders = count
    } else if (status === 'finished') {
      finishedReaders = count
    }
  }

  // Upsert book stats
  await db
    .insert(bookStats)
    .values({
      bookType,
      bookId,
      totalReaders,
      currentReaders,
      finishedReaders,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [bookStats.bookType, bookStats.bookId],
      set: {
        totalReaders,
        currentReaders,
        finishedReaders,
        updatedAt: new Date(),
      },
    })
}

/**
 * Update aggregated book stats after review changes
 */
async function updateBookStats(bookType: string, bookId: number) {
  // Calculate new stats from reviews
  const reviews = await db
    .select()
    .from(bookReviews)
    .where(
      and(
        eq(bookReviews.bookType, bookType),
        eq(bookReviews.bookId, bookId),
        eq(bookReviews.isHidden, false)
      )
    )

  const totalReviews = reviews.length
  const ratingsOnly = reviews.filter(r => r.rating !== null)
  const ratingCount = ratingsOnly.length
  const averageRating = ratingCount > 0
    ? ratingsOnly.reduce((sum, r) => sum + (r.rating ?? 0), 0) / ratingCount
    : null

  const recommendCount = reviews.filter(r => r.recommendType === 'recommend').length
  const neutralCount = reviews.filter(r => r.recommendType === 'neutral').length
  const notRecommendCount = reviews.filter(r => r.recommendType === 'not_recommend').length
  const totalVotes = recommendCount + neutralCount + notRecommendCount
  const recommendPercent = totalVotes > 0 ? (recommendCount / totalVotes) * 100 : null

  // Upsert book stats
  await db
    .insert(bookStats)
    .values({
      bookType,
      bookId,
      totalReviews,
      ratingCount,
      averageRating: averageRating?.toFixed(2) ?? null,
      recommendCount,
      neutralCount,
      notRecommendCount,
      recommendPercent: recommendPercent?.toFixed(2) ?? null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [bookStats.bookType, bookStats.bookId],
      set: {
        totalReviews,
        ratingCount,
        averageRating: averageRating?.toFixed(2) ?? null,
        recommendCount,
        neutralCount,
        notRecommendCount,
        recommendPercent: recommendPercent?.toFixed(2) ?? null,
        updatedAt: new Date(),
      },
    })
}

export { app as bookDetailRoutes }
