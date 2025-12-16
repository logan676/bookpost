/**
 * Store API Routes
 *
 * Provides endpoints for the E-book Store home page:
 * - Books by Year: Books grouped by publication year
 * - Top Rated: Highest rated books with rating info
 * - External Rankings: External ranking lists (NYT, Amazon, etc.)
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { db } from '../db/client'
import { ebooks, magazines, curatedLists, curatedListItems } from '../db/schema'
import { eq, desc, sql, and, gte, isNotNull, inArray } from 'drizzle-orm'

const app = new OpenAPIHono()

// ============================================
// Schemas
// ============================================

const BookByYearSchema = z.object({
  id: z.number(),
  title: z.string(),
  author: z.string().nullable(),
  coverUrl: z.string().nullable(),
  publicationDate: z.string().nullable(),
  rating: z.number().nullable(),
  ratingCount: z.number().nullable(),
})

const BooksByYearGroupSchema = z.object({
  year: z.number(),
  books: z.array(BookByYearSchema),
})

const TopRatedBookSchema = z.object({
  id: z.number(),
  title: z.string(),
  author: z.string().nullable(),
  coverUrl: z.string().nullable(),
  rating: z.number().nullable(),
  ratingCount: z.number().nullable(),
  externalRatingSource: z.string().nullable(),
})

const ExternalRankingSchema = z.object({
  id: z.number(),
  listType: z.string(),
  sourceName: z.string().nullable(),
  sourceLogoUrl: z.string().nullable(),
  title: z.string(),
  subtitle: z.string().nullable(),
  description: z.string().nullable(),
  bookCount: z.number().nullable(),
  lastUpdated: z.string().nullable(),
  externalUrl: z.string().nullable(),
})

// ============================================
// GET /api/store/books-by-year
// ============================================

const booksByYearRoute = createRoute({
  method: 'get',
  path: '/books-by-year',
  tags: ['Store'],
  summary: 'Get books grouped by publication year',
  request: {
    query: z.object({
      bookType: z.enum(['ebook', 'magazine']).default('ebook'),
      limit: z.coerce.number().default(10).describe('Number of books per year'),
      years: z.string().optional().describe('Comma-separated years, e.g., "2024,2023,2022"'),
    }),
  },
  responses: {
    200: {
      description: 'Books grouped by year',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(BooksByYearGroupSchema),
          }),
        },
      },
    },
  },
})

app.openapi(booksByYearRoute, async (c) => {
  const { bookType, limit, years: yearsParam } = c.req.valid('query')

  // Determine years to query
  let targetYears: number[]
  if (yearsParam) {
    targetYears = yearsParam.split(',').map(y => parseInt(y.trim())).filter(y => !isNaN(y))
  } else {
    // Default: last 3 years
    const currentYear = new Date().getFullYear()
    targetYears = [currentYear, currentYear - 1, currentYear - 2]
  }

  const results: Array<{ year: number; books: typeof BookByYearSchema._type[] }> = []

  if (bookType === 'ebook') {
    for (const year of targetYears) {
      const startDateStr = `${year}-01-01`
      const endDateStr = `${year + 1}-01-01`

      const booksInYear = await db
        .select({
          id: ebooks.id,
          title: ebooks.title,
          author: ebooks.author,
          coverUrl: ebooks.coverUrl,
          publicationDate: ebooks.publicationDate,
          rating: ebooks.externalRating,
          ratingCount: ebooks.externalRatingsCount,
        })
        .from(ebooks)
        .where(
          and(
            isNotNull(ebooks.publicationDate),
            sql`${ebooks.publicationDate} >= ${startDateStr}`,
            sql`${ebooks.publicationDate} < ${endDateStr}`
          )
        )
        .orderBy(desc(ebooks.externalRating))
        .limit(limit)

      if (booksInYear.length > 0) {
        results.push({
          year,
          books: booksInYear.map(b => ({
            id: b.id,
            title: b.title,
            author: b.author,
            coverUrl: b.coverUrl,
            publicationDate: b.publicationDate,
            rating: b.rating ? parseFloat(b.rating) : null,
            ratingCount: b.ratingCount,
          })),
        })
      }
    }
  } else {
    // Magazine
    for (const year of targetYears) {
      const startDateStr = `${year}-01-01`
      const endDateStr = `${year + 1}-01-01`

      const magsInYear = await db
        .select({
          id: magazines.id,
          title: magazines.title,
          author: sql<string | null>`null`.as('author'),
          coverUrl: magazines.coverUrl,
          publicationDate: magazines.publicationDate,
          rating: sql<number | null>`null`.as('rating'),
          ratingCount: sql<number | null>`null`.as('ratingCount'),
        })
        .from(magazines)
        .where(
          and(
            isNotNull(magazines.publicationDate),
            sql`${magazines.publicationDate} >= ${startDateStr}`,
            sql`${magazines.publicationDate} < ${endDateStr}`
          )
        )
        .orderBy(desc(magazines.publicationDate))
        .limit(limit)

      if (magsInYear.length > 0) {
        results.push({
          year,
          books: magsInYear.map(m => ({
            id: m.id,
            title: m.title,
            author: m.author,
            coverUrl: m.coverUrl,
            publicationDate: m.publicationDate,
            rating: m.rating,
            ratingCount: m.ratingCount,
          })),
        })
      }
    }
  }

  return c.json({ data: results })
})

// ============================================
// GET /api/store/top-rated
// ============================================

const topRatedRoute = createRoute({
  method: 'get',
  path: '/top-rated',
  tags: ['Store'],
  summary: 'Get highest rated books',
  request: {
    query: z.object({
      bookType: z.enum(['ebook', 'magazine']).default('ebook'),
      limit: z.coerce.number().default(10),
      minRatingCount: z.coerce.number().default(10).describe('Minimum number of ratings required'),
    }),
  },
  responses: {
    200: {
      description: 'Top rated books',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(TopRatedBookSchema),
            total: z.number(),
          }),
        },
      },
    },
  },
})

app.openapi(topRatedRoute, async (c) => {
  const { bookType, limit, minRatingCount } = c.req.valid('query')

  if (bookType === 'ebook') {
    const books = await db
      .select({
        id: ebooks.id,
        title: ebooks.title,
        author: ebooks.author,
        coverUrl: ebooks.coverUrl,
        rating: ebooks.externalRating,
        ratingCount: ebooks.externalRatingsCount,
        externalRatingSource: ebooks.externalRatingSource,
      })
      .from(ebooks)
      .where(
        and(
          isNotNull(ebooks.externalRating),
          gte(ebooks.externalRatingsCount, minRatingCount)
        )
      )
      .orderBy(desc(ebooks.externalRating), desc(ebooks.externalRatingsCount))
      .limit(limit)

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(ebooks)
      .where(
        and(
          isNotNull(ebooks.externalRating),
          gte(ebooks.externalRatingsCount, minRatingCount)
        )
      )

    return c.json({
      data: books.map(b => ({
        ...b,
        rating: b.rating ? parseFloat(b.rating) : null,
      })),
      total: Number(count),
    })
  } else {
    // Magazines don't have ratings yet, return empty
    return c.json({
      data: [],
      total: 0,
    })
  }
})

// ============================================
// GET /api/store/external-rankings
// ============================================

// External ranking list types (from external sources like NYT, Amazon, etc.)
// Maps to Dashboard categories: NYT Lists, Platform Lists
// Note: Awards (pulitzer, booker, etc.) are now in /awards endpoint
// Note: bill_gates is now in /celebrity-picks endpoint
const EXTERNAL_RANKING_TYPES = [
  // NYT Lists
  'nyt_bestseller',
  // Platform Lists
  'amazon_best',
  'goodreads_choice',
]

// Award types (literary prizes)
const AWARD_TYPES = [
  'pulitzer',
  'booker',
  'booker_international',
  'newbery',
]

const externalRankingsRoute = createRoute({
  method: 'get',
  path: '/external-rankings',
  tags: ['Store'],
  summary: 'Get external ranking lists',
  request: {
    query: z.object({
      bookType: z.enum(['ebook', 'magazine']).default('ebook'),
    }),
  },
  responses: {
    200: {
      description: 'External ranking lists',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(ExternalRankingSchema),
          }),
        },
      },
    },
  },
})

app.openapi(externalRankingsRoute, async (c) => {
  // Note: bookType filter not currently used in curatedLists, but kept for API consistency
  // const { bookType } = c.req.valid('query')

  const rankings = await db
    .select({
      id: curatedLists.id,
      listType: curatedLists.listType,
      sourceName: curatedLists.sourceName,
      sourceLogoUrl: curatedLists.sourceLogoUrl,
      title: curatedLists.title,
      subtitle: curatedLists.subtitle,
      description: curatedLists.description,
      bookCount: curatedLists.bookCount,
      lastUpdated: curatedLists.updatedAt,
      externalUrl: curatedLists.sourceUrl,
    })
    .from(curatedLists)
    .where(
      and(
        inArray(curatedLists.listType, EXTERNAL_RANKING_TYPES),
        eq(curatedLists.isActive, true)
      )
    )
    .orderBy(curatedLists.sortOrder)

  // Get preview covers for each ranking (first 3 books)
  const rankingsWithCovers = await Promise.all(
    rankings.map(async (ranking) => {
      const items = await db
        .select({
          externalCoverUrl: curatedListItems.externalCoverUrl,
          bookId: curatedListItems.bookId,
          bookType: curatedListItems.bookType,
        })
        .from(curatedListItems)
        .where(eq(curatedListItems.listId, ranking.id))
        .orderBy(curatedListItems.position)
        .limit(3)

      // Get cover URLs - prefer external cover, fallback to linked book cover
      // Add cache-busting version (v7 = fixed 50+ cover images)
      const addCacheBust = (url: string) => url.includes('?') ? url : `${url}?v=7`
      const previewCovers: string[] = []
      for (const item of items) {
        if (item.externalCoverUrl) {
          previewCovers.push(addCacheBust(item.externalCoverUrl))
        } else if (item.bookId && item.bookType === 'ebook') {
          const [ebook] = await db
            .select({ coverUrl: ebooks.coverUrl })
            .from(ebooks)
            .where(eq(ebooks.id, item.bookId))
            .limit(1)
          if (ebook?.coverUrl) {
            previewCovers.push(addCacheBust(ebook.coverUrl))
          }
        }
      }

      // Fallback: if no preview covers found, get random ebook covers
      if (previewCovers.length === 0) {
        const randomBooks = await db
          .select({ coverUrl: ebooks.coverUrl })
          .from(ebooks)
          .where(isNotNull(ebooks.coverUrl))
          .orderBy(sql`RANDOM()`)
          .limit(3)

        for (const book of randomBooks) {
          if (book.coverUrl) {
            previewCovers.push(addCacheBust(book.coverUrl))
          }
        }
      }

      return {
        ...ranking,
        lastUpdated: ranking.lastUpdated?.toISOString() ?? null,
        previewCovers,
      }
    })
  )

  return c.json({
    data: rankingsWithCovers,
  })
})

// ============================================
// GET /api/store/external-rankings/:id
// ============================================

const externalRankingDetailRoute = createRoute({
  method: 'get',
  path: '/external-rankings/:id',
  tags: ['Store'],
  summary: 'Get external ranking detail with books',
  request: {
    params: z.object({
      id: z.coerce.number(),
    }),
    query: z.object({
      limit: z.coerce.number().default(50),
      offset: z.coerce.number().default(0),
    }),
  },
  responses: {
    200: {
      description: 'External ranking detail',
      content: {
        'application/json': {
          schema: z.object({
            ranking: ExternalRankingSchema,
            books: z.array(z.object({
              rank: z.number(),
              book: z.object({
                id: z.number().nullable(),
                title: z.string(),
                author: z.string().nullable(),
                coverUrl: z.string().nullable(),
              }),
              editorNote: z.string().nullable(),
            })),
            total: z.number(),
          }),
        },
      },
    },
    404: {
      description: 'Ranking not found',
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

app.openapi(externalRankingDetailRoute, async (c) => {
  const { id } = c.req.valid('param')
  const { limit, offset } = c.req.valid('query')

  // Get ranking from curatedLists
  const [ranking] = await db
    .select({
      id: curatedLists.id,
      listType: curatedLists.listType,
      sourceName: curatedLists.sourceName,
      sourceLogoUrl: curatedLists.sourceLogoUrl,
      title: curatedLists.title,
      subtitle: curatedLists.subtitle,
      description: curatedLists.description,
      bookCount: curatedLists.bookCount,
      lastUpdated: curatedLists.updatedAt,
      externalUrl: curatedLists.sourceUrl,
    })
    .from(curatedLists)
    .where(eq(curatedLists.id, id))
    .limit(1)

  if (!ranking) {
    return c.json({
      error: { code: 'NOT_FOUND', message: 'Ranking not found' },
    }, 404)
  }

  // Get books in this ranking from curatedListItems
  const listItems = await db
    .select({
      position: curatedListItems.position,
      bookId: curatedListItems.bookId,
      bookType: curatedListItems.bookType,
      externalTitle: curatedListItems.externalTitle,
      externalAuthor: curatedListItems.externalAuthor,
      externalCoverUrl: curatedListItems.externalCoverUrl,
      editorNote: curatedListItems.editorNote,
    })
    .from(curatedListItems)
    .where(eq(curatedListItems.listId, id))
    .orderBy(curatedListItems.position)
    .limit(limit)
    .offset(offset)

  // Fetch book details
  const books: Array<{
    rank: number
    book: { id: number | null; title: string; author: string | null; coverUrl: string | null }
    editorNote: string | null
  }> = []

  for (const item of listItems) {
    // If we have a linked book in our library
    if (item.bookId && item.bookType === 'ebook') {
      const [book] = await db
        .select({
          id: ebooks.id,
          title: ebooks.title,
          author: ebooks.author,
          coverUrl: ebooks.coverUrl,
        })
        .from(ebooks)
        .where(eq(ebooks.id, item.bookId))
        .limit(1)

      if (book) {
        books.push({
          rank: item.position,
          book,
          editorNote: item.editorNote,
        })
        continue
      }
    } else if (item.bookId && item.bookType === 'magazine') {
      const [mag] = await db
        .select({
          id: magazines.id,
          title: magazines.title,
          author: sql<string | null>`null`.as('author'),
          coverUrl: magazines.coverUrl,
        })
        .from(magazines)
        .where(eq(magazines.id, item.bookId))
        .limit(1)

      if (mag) {
        books.push({
          rank: item.position,
          book: mag,
          editorNote: item.editorNote,
        })
        continue
      }
    }

    // Fallback to external book info if no linked book
    if (item.externalTitle) {
      // Add cache-busting version to cover URL (v7 = fixed 50+ cover images)
      let coverUrl = item.externalCoverUrl
      if (coverUrl && !coverUrl.includes('?')) {
        coverUrl = `${coverUrl}?v=7`
      }
      books.push({
        rank: item.position,
        book: {
          id: null,
          title: item.externalTitle,
          author: item.externalAuthor,
          coverUrl,
        },
        editorNote: item.editorNote,
      })
    }
  }

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(curatedListItems)
    .where(eq(curatedListItems.listId, id))

  return c.json({
    ranking: {
      ...ranking,
      lastUpdated: ranking.lastUpdated?.toISOString() ?? null,
    },
    books,
    total: Number(count),
  })
})

// ============================================
// GET /api/store/editor-picks
// ============================================

const editorPicksRoute = createRoute({
  method: 'get',
  path: '/editor-picks',
  tags: ['Store'],
  summary: 'Get editor pick lists',
  request: {
    query: z.object({
      limit: z.coerce.number().default(20),
      offset: z.coerce.number().default(0),
    }),
  },
  responses: {
    200: {
      description: 'Editor pick lists',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(ExternalRankingSchema),
            total: z.number(),
            hasMore: z.boolean(),
          }),
        },
      },
    },
  },
})

app.openapi(editorPicksRoute, async (c) => {
  const { limit, offset } = c.req.valid('query')

  // Get total count
  const [{ count: total }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(curatedLists)
    .where(and(
      eq(curatedLists.listType, 'editor_pick'),
      eq(curatedLists.isActive, true)
    ))

  const lists = await db
    .select({
      id: curatedLists.id,
      listType: curatedLists.listType,
      sourceName: curatedLists.sourceName,
      sourceLogoUrl: curatedLists.sourceLogoUrl,
      title: curatedLists.title,
      subtitle: curatedLists.subtitle,
      description: curatedLists.description,
      bookCount: curatedLists.bookCount,
      lastUpdated: curatedLists.updatedAt,
      externalUrl: curatedLists.sourceUrl,
    })
    .from(curatedLists)
    .where(and(
      eq(curatedLists.listType, 'editor_pick'),
      eq(curatedLists.isActive, true)
    ))
    .orderBy(desc(curatedLists.sortOrder), desc(curatedLists.createdAt))
    .limit(limit)
    .offset(offset)

  // Get preview covers for each list
  const listsWithCovers = await Promise.all(
    lists.map(async (list) => {
      const items = await db
        .select({
          externalCoverUrl: curatedListItems.externalCoverUrl,
          bookId: curatedListItems.bookId,
          bookType: curatedListItems.bookType,
        })
        .from(curatedListItems)
        .where(eq(curatedListItems.listId, list.id))
        .orderBy(curatedListItems.position)
        .limit(3)

      const previewCovers: string[] = []
      for (const item of items) {
        if (item.bookId && item.bookType === 'ebook') {
          const [book] = await db.select({ coverUrl: ebooks.coverUrl }).from(ebooks).where(eq(ebooks.id, item.bookId)).limit(1)
          if (book?.coverUrl) previewCovers.push(book.coverUrl)
        } else if (item.externalCoverUrl) {
          previewCovers.push(`${item.externalCoverUrl}?v=7`)
        }
      }

      return {
        ...list,
        lastUpdated: list.lastUpdated?.toISOString() ?? null,
        previewCovers,
      }
    })
  )

  return c.json({
    data: listsWithCovers,
    total: Number(total),
    hasMore: offset + lists.length < Number(total),
  })
})

// ============================================
// GET /api/store/book-series
// ============================================

const bookSeriesRoute = createRoute({
  method: 'get',
  path: '/book-series',
  tags: ['Store'],
  summary: 'Get book series lists',
  request: {
    query: z.object({
      limit: z.coerce.number().default(20),
      offset: z.coerce.number().default(0),
    }),
  },
  responses: {
    200: {
      description: 'Book series lists',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(ExternalRankingSchema),
            total: z.number(),
            hasMore: z.boolean(),
          }),
        },
      },
    },
  },
})

app.openapi(bookSeriesRoute, async (c) => {
  const { limit, offset } = c.req.valid('query')

  const [{ count: total }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(curatedLists)
    .where(and(
      eq(curatedLists.listType, 'book_series'),
      eq(curatedLists.isActive, true)
    ))

  const lists = await db
    .select({
      id: curatedLists.id,
      listType: curatedLists.listType,
      sourceName: curatedLists.sourceName,
      sourceLogoUrl: curatedLists.sourceLogoUrl,
      title: curatedLists.title,
      subtitle: curatedLists.subtitle,
      description: curatedLists.description,
      bookCount: curatedLists.bookCount,
      lastUpdated: curatedLists.updatedAt,
      externalUrl: curatedLists.sourceUrl,
    })
    .from(curatedLists)
    .where(and(
      eq(curatedLists.listType, 'book_series'),
      eq(curatedLists.isActive, true)
    ))
    .orderBy(desc(curatedLists.sortOrder), desc(curatedLists.createdAt))
    .limit(limit)
    .offset(offset)

  const listsWithCovers = await Promise.all(
    lists.map(async (list) => {
      const items = await db
        .select({
          externalCoverUrl: curatedListItems.externalCoverUrl,
          bookId: curatedListItems.bookId,
          bookType: curatedListItems.bookType,
        })
        .from(curatedListItems)
        .where(eq(curatedListItems.listId, list.id))
        .orderBy(curatedListItems.position)
        .limit(3)

      const previewCovers: string[] = []
      for (const item of items) {
        if (item.bookId && item.bookType === 'ebook') {
          const [book] = await db.select({ coverUrl: ebooks.coverUrl }).from(ebooks).where(eq(ebooks.id, item.bookId)).limit(1)
          if (book?.coverUrl) previewCovers.push(book.coverUrl)
        } else if (item.externalCoverUrl) {
          previewCovers.push(`${item.externalCoverUrl}?v=7`)
        }
      }

      return {
        ...list,
        lastUpdated: list.lastUpdated?.toISOString() ?? null,
        previewCovers,
      }
    })
  )

  return c.json({
    data: listsWithCovers,
    total: Number(total),
    hasMore: offset + lists.length < Number(total),
  })
})

// ============================================
// GET /api/store/weekly-picks
// ============================================

const weeklyPicksRoute = createRoute({
  method: 'get',
  path: '/weekly-picks',
  tags: ['Store'],
  summary: 'Get weekly pick lists',
  request: {
    query: z.object({
      limit: z.coerce.number().default(20),
      offset: z.coerce.number().default(0),
    }),
  },
  responses: {
    200: {
      description: 'Weekly pick lists',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(ExternalRankingSchema),
            total: z.number(),
            hasMore: z.boolean(),
          }),
        },
      },
    },
  },
})

app.openapi(weeklyPicksRoute, async (c) => {
  const { limit, offset } = c.req.valid('query')

  const [{ count: total }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(curatedLists)
    .where(and(
      eq(curatedLists.listType, 'weekly_pick'),
      eq(curatedLists.isActive, true)
    ))

  const lists = await db
    .select({
      id: curatedLists.id,
      listType: curatedLists.listType,
      sourceName: curatedLists.sourceName,
      sourceLogoUrl: curatedLists.sourceLogoUrl,
      title: curatedLists.title,
      subtitle: curatedLists.subtitle,
      description: curatedLists.description,
      bookCount: curatedLists.bookCount,
      lastUpdated: curatedLists.updatedAt,
      externalUrl: curatedLists.sourceUrl,
    })
    .from(curatedLists)
    .where(and(
      eq(curatedLists.listType, 'weekly_pick'),
      eq(curatedLists.isActive, true)
    ))
    .orderBy(desc(curatedLists.sortOrder), desc(curatedLists.createdAt))
    .limit(limit)
    .offset(offset)

  const listsWithCovers = await Promise.all(
    lists.map(async (list) => {
      const items = await db
        .select({
          externalCoverUrl: curatedListItems.externalCoverUrl,
          bookId: curatedListItems.bookId,
          bookType: curatedListItems.bookType,
        })
        .from(curatedListItems)
        .where(eq(curatedListItems.listId, list.id))
        .orderBy(curatedListItems.position)
        .limit(3)

      const previewCovers: string[] = []
      for (const item of items) {
        if (item.bookId && item.bookType === 'ebook') {
          const [book] = await db.select({ coverUrl: ebooks.coverUrl }).from(ebooks).where(eq(ebooks.id, item.bookId)).limit(1)
          if (book?.coverUrl) previewCovers.push(book.coverUrl)
        } else if (item.externalCoverUrl) {
          previewCovers.push(`${item.externalCoverUrl}?v=7`)
        }
      }

      return {
        ...list,
        lastUpdated: list.lastUpdated?.toISOString() ?? null,
        previewCovers,
      }
    })
  )

  return c.json({
    data: listsWithCovers,
    total: Number(total),
    hasMore: offset + lists.length < Number(total),
  })
})

// ============================================
// GET /api/store/celebrity-picks
// ============================================

const celebrityPicksRoute = createRoute({
  method: 'get',
  path: '/celebrity-picks',
  tags: ['Store'],
  summary: 'Get celebrity recommendation lists (e.g., Bill Gates)',
  request: {
    query: z.object({
      limit: z.coerce.number().default(20),
      offset: z.coerce.number().default(0),
    }),
  },
  responses: {
    200: {
      description: 'Celebrity recommendation lists',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(ExternalRankingSchema),
            total: z.number(),
            hasMore: z.boolean(),
          }),
        },
      },
    },
  },
})

app.openapi(celebrityPicksRoute, async (c) => {
  const { limit, offset } = c.req.valid('query')

  const [{ count: total }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(curatedLists)
    .where(and(
      eq(curatedLists.listType, 'bill_gates'),
      eq(curatedLists.isActive, true)
    ))

  const lists = await db
    .select({
      id: curatedLists.id,
      listType: curatedLists.listType,
      sourceName: curatedLists.sourceName,
      sourceLogoUrl: curatedLists.sourceLogoUrl,
      title: curatedLists.title,
      subtitle: curatedLists.subtitle,
      description: curatedLists.description,
      bookCount: curatedLists.bookCount,
      lastUpdated: curatedLists.updatedAt,
      externalUrl: curatedLists.sourceUrl,
    })
    .from(curatedLists)
    .where(and(
      eq(curatedLists.listType, 'bill_gates'),
      eq(curatedLists.isActive, true)
    ))
    .orderBy(desc(curatedLists.sortOrder), desc(curatedLists.createdAt))
    .limit(limit)
    .offset(offset)

  const listsWithCovers = await Promise.all(
    lists.map(async (list) => {
      const items = await db
        .select({
          externalCoverUrl: curatedListItems.externalCoverUrl,
          bookId: curatedListItems.bookId,
          bookType: curatedListItems.bookType,
        })
        .from(curatedListItems)
        .where(eq(curatedListItems.listId, list.id))
        .orderBy(curatedListItems.position)
        .limit(5)

      const previewCovers: string[] = []
      for (const item of items) {
        if (item.bookId && item.bookType === 'ebook') {
          const [book] = await db.select({ coverUrl: ebooks.coverUrl }).from(ebooks).where(eq(ebooks.id, item.bookId)).limit(1)
          if (book?.coverUrl) previewCovers.push(book.coverUrl)
        } else if (item.externalCoverUrl) {
          previewCovers.push(`${item.externalCoverUrl}?v=7`)
        }
      }

      return {
        ...list,
        lastUpdated: list.lastUpdated?.toISOString() ?? null,
        previewCovers,
      }
    })
  )

  return c.json({
    data: listsWithCovers,
    total: Number(total),
    hasMore: offset + lists.length < Number(total),
  })
})

// ============================================
// GET /api/store/biographies
// ============================================

const biographiesRoute = createRoute({
  method: 'get',
  path: '/biographies',
  tags: ['Store'],
  summary: 'Get biography book lists',
  request: {
    query: z.object({
      limit: z.coerce.number().default(20),
      offset: z.coerce.number().default(0),
    }),
  },
  responses: {
    200: {
      description: 'Biography book lists',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(ExternalRankingSchema),
            total: z.number(),
            hasMore: z.boolean(),
          }),
        },
      },
    },
  },
})

app.openapi(biographiesRoute, async (c) => {
  const { limit, offset } = c.req.valid('query')

  const [{ count: total }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(curatedLists)
    .where(and(
      eq(curatedLists.listType, 'biography'),
      eq(curatedLists.isActive, true)
    ))

  const lists = await db
    .select({
      id: curatedLists.id,
      listType: curatedLists.listType,
      sourceName: curatedLists.sourceName,
      sourceLogoUrl: curatedLists.sourceLogoUrl,
      title: curatedLists.title,
      subtitle: curatedLists.subtitle,
      description: curatedLists.description,
      bookCount: curatedLists.bookCount,
      lastUpdated: curatedLists.updatedAt,
      externalUrl: curatedLists.sourceUrl,
    })
    .from(curatedLists)
    .where(and(
      eq(curatedLists.listType, 'biography'),
      eq(curatedLists.isActive, true)
    ))
    .orderBy(desc(curatedLists.sortOrder), desc(curatedLists.createdAt))
    .limit(limit)
    .offset(offset)

  const listsWithCovers = await Promise.all(
    lists.map(async (list) => {
      const items = await db
        .select({
          externalCoverUrl: curatedListItems.externalCoverUrl,
          bookId: curatedListItems.bookId,
          bookType: curatedListItems.bookType,
        })
        .from(curatedListItems)
        .where(eq(curatedListItems.listId, list.id))
        .orderBy(curatedListItems.position)
        .limit(3)

      const previewCovers: string[] = []
      for (const item of items) {
        if (item.bookId && item.bookType === 'ebook') {
          const [book] = await db.select({ coverUrl: ebooks.coverUrl }).from(ebooks).where(eq(ebooks.id, item.bookId)).limit(1)
          if (book?.coverUrl) previewCovers.push(book.coverUrl)
        } else if (item.externalCoverUrl) {
          previewCovers.push(`${item.externalCoverUrl}?v=7`)
        }
      }

      return {
        ...list,
        lastUpdated: list.lastUpdated?.toISOString() ?? null,
        previewCovers,
      }
    })
  )

  return c.json({
    data: listsWithCovers,
    total: Number(total),
    hasMore: offset + lists.length < Number(total),
  })
})

// ============================================
// GET /api/store/nyt-lists
// ============================================

const nytListsRoute = createRoute({
  method: 'get',
  path: '/nyt-lists',
  tags: ['Store'],
  summary: 'Get New York Times bestseller lists',
  request: {
    query: z.object({
      limit: z.coerce.number().default(20),
      offset: z.coerce.number().default(0),
    }),
  },
  responses: {
    200: {
      description: 'NYT bestseller lists',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(ExternalRankingSchema),
            total: z.number(),
            hasMore: z.boolean(),
          }),
        },
      },
    },
  },
})

app.openapi(nytListsRoute, async (c) => {
  const { limit, offset } = c.req.valid('query')

  const [{ count: total }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(curatedLists)
    .where(and(
      eq(curatedLists.listType, 'nyt_bestseller'),
      eq(curatedLists.isActive, true)
    ))

  const lists = await db
    .select({
      id: curatedLists.id,
      listType: curatedLists.listType,
      sourceName: curatedLists.sourceName,
      sourceLogoUrl: curatedLists.sourceLogoUrl,
      title: curatedLists.title,
      subtitle: curatedLists.subtitle,
      description: curatedLists.description,
      bookCount: curatedLists.bookCount,
      lastUpdated: curatedLists.updatedAt,
      externalUrl: curatedLists.sourceUrl,
    })
    .from(curatedLists)
    .where(and(
      eq(curatedLists.listType, 'nyt_bestseller'),
      eq(curatedLists.isActive, true)
    ))
    .orderBy(desc(curatedLists.sortOrder), desc(curatedLists.createdAt))
    .limit(limit)
    .offset(offset)

  const listsWithCovers = await Promise.all(
    lists.map(async (list) => {
      const items = await db
        .select({
          externalCoverUrl: curatedListItems.externalCoverUrl,
          bookId: curatedListItems.bookId,
          bookType: curatedListItems.bookType,
        })
        .from(curatedListItems)
        .where(eq(curatedListItems.listId, list.id))
        .orderBy(curatedListItems.position)
        .limit(3)

      const previewCovers: string[] = []
      for (const item of items) {
        if (item.bookId && item.bookType === 'ebook') {
          const [book] = await db.select({ coverUrl: ebooks.coverUrl }).from(ebooks).where(eq(ebooks.id, item.bookId)).limit(1)
          if (book?.coverUrl) previewCovers.push(book.coverUrl)
        } else if (item.externalCoverUrl) {
          previewCovers.push(`${item.externalCoverUrl}?v=7`)
        }
      }

      return {
        ...list,
        lastUpdated: list.lastUpdated?.toISOString() ?? null,
        previewCovers,
      }
    })
  )

  return c.json({
    data: listsWithCovers,
    total: Number(total),
    hasMore: offset + lists.length < Number(total),
  })
})

// ============================================
// GET /api/store/amazon-lists
// ============================================

const amazonListsRoute = createRoute({
  method: 'get',
  path: '/amazon-lists',
  tags: ['Store'],
  summary: 'Get Amazon best book lists',
  request: {
    query: z.object({
      limit: z.coerce.number().default(20),
      offset: z.coerce.number().default(0),
    }),
  },
  responses: {
    200: {
      description: 'Amazon best book lists',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(ExternalRankingSchema),
            total: z.number(),
            hasMore: z.boolean(),
          }),
        },
      },
    },
  },
})

app.openapi(amazonListsRoute, async (c) => {
  const { limit, offset } = c.req.valid('query')

  const [{ count: total }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(curatedLists)
    .where(and(
      eq(curatedLists.listType, 'amazon_best'),
      eq(curatedLists.isActive, true)
    ))

  const lists = await db
    .select({
      id: curatedLists.id,
      listType: curatedLists.listType,
      sourceName: curatedLists.sourceName,
      sourceLogoUrl: curatedLists.sourceLogoUrl,
      title: curatedLists.title,
      subtitle: curatedLists.subtitle,
      description: curatedLists.description,
      bookCount: curatedLists.bookCount,
      lastUpdated: curatedLists.updatedAt,
      externalUrl: curatedLists.sourceUrl,
    })
    .from(curatedLists)
    .where(and(
      eq(curatedLists.listType, 'amazon_best'),
      eq(curatedLists.isActive, true)
    ))
    .orderBy(desc(curatedLists.sortOrder), desc(curatedLists.createdAt))
    .limit(limit)
    .offset(offset)

  const listsWithCovers = await Promise.all(
    lists.map(async (list) => {
      const items = await db
        .select({
          externalCoverUrl: curatedListItems.externalCoverUrl,
          bookId: curatedListItems.bookId,
          bookType: curatedListItems.bookType,
        })
        .from(curatedListItems)
        .where(eq(curatedListItems.listId, list.id))
        .orderBy(curatedListItems.position)
        .limit(3)

      const previewCovers: string[] = []
      for (const item of items) {
        if (item.bookId && item.bookType === 'ebook') {
          const [book] = await db.select({ coverUrl: ebooks.coverUrl }).from(ebooks).where(eq(ebooks.id, item.bookId)).limit(1)
          if (book?.coverUrl) previewCovers.push(book.coverUrl)
        } else if (item.externalCoverUrl) {
          previewCovers.push(`${item.externalCoverUrl}?v=7`)
        }
      }

      return {
        ...list,
        lastUpdated: list.lastUpdated?.toISOString() ?? null,
        previewCovers,
      }
    })
  )

  return c.json({
    data: listsWithCovers,
    total: Number(total),
    hasMore: offset + lists.length < Number(total),
  })
})

// ============================================
// GET /api/store/goodreads-lists
// ============================================

const goodreadsListsRoute = createRoute({
  method: 'get',
  path: '/goodreads-lists',
  tags: ['Store'],
  summary: 'Get Goodreads choice book lists',
  request: {
    query: z.object({
      limit: z.coerce.number().default(20),
      offset: z.coerce.number().default(0),
    }),
  },
  responses: {
    200: {
      description: 'Goodreads choice book lists',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(ExternalRankingSchema),
            total: z.number(),
            hasMore: z.boolean(),
          }),
        },
      },
    },
  },
})

app.openapi(goodreadsListsRoute, async (c) => {
  const { limit, offset } = c.req.valid('query')

  const [{ count: total }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(curatedLists)
    .where(and(
      eq(curatedLists.listType, 'goodreads_choice'),
      eq(curatedLists.isActive, true)
    ))

  const lists = await db
    .select({
      id: curatedLists.id,
      listType: curatedLists.listType,
      sourceName: curatedLists.sourceName,
      sourceLogoUrl: curatedLists.sourceLogoUrl,
      title: curatedLists.title,
      subtitle: curatedLists.subtitle,
      description: curatedLists.description,
      bookCount: curatedLists.bookCount,
      lastUpdated: curatedLists.updatedAt,
      externalUrl: curatedLists.sourceUrl,
    })
    .from(curatedLists)
    .where(and(
      eq(curatedLists.listType, 'goodreads_choice'),
      eq(curatedLists.isActive, true)
    ))
    .orderBy(desc(curatedLists.sortOrder), desc(curatedLists.createdAt))
    .limit(limit)
    .offset(offset)

  const listsWithCovers = await Promise.all(
    lists.map(async (list) => {
      const items = await db
        .select({
          externalCoverUrl: curatedListItems.externalCoverUrl,
          bookId: curatedListItems.bookId,
          bookType: curatedListItems.bookType,
        })
        .from(curatedListItems)
        .where(eq(curatedListItems.listId, list.id))
        .orderBy(curatedListItems.position)
        .limit(3)

      const previewCovers: string[] = []
      for (const item of items) {
        if (item.bookId && item.bookType === 'ebook') {
          const [book] = await db.select({ coverUrl: ebooks.coverUrl }).from(ebooks).where(eq(ebooks.id, item.bookId)).limit(1)
          if (book?.coverUrl) previewCovers.push(book.coverUrl)
        } else if (item.externalCoverUrl) {
          previewCovers.push(`${item.externalCoverUrl}?v=7`)
        }
      }

      return {
        ...list,
        lastUpdated: list.lastUpdated?.toISOString() ?? null,
        previewCovers,
      }
    })
  )

  return c.json({
    data: listsWithCovers,
    total: Number(total),
    hasMore: offset + lists.length < Number(total),
  })
})

// ============================================
// GET /api/store/pulitzer-awards
// ============================================

const pulitzerAwardsRoute = createRoute({
  method: 'get',
  path: '/pulitzer-awards',
  tags: ['Store'],
  summary: 'Get Pulitzer Prize book lists',
  request: {
    query: z.object({
      limit: z.coerce.number().default(20),
      offset: z.coerce.number().default(0),
    }),
  },
  responses: {
    200: {
      description: 'Pulitzer Prize book lists',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(ExternalRankingSchema),
            total: z.number(),
            hasMore: z.boolean(),
          }),
        },
      },
    },
  },
})

app.openapi(pulitzerAwardsRoute, async (c) => {
  const { limit, offset } = c.req.valid('query')

  const [{ count: total }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(curatedLists)
    .where(and(
      eq(curatedLists.listType, 'pulitzer'),
      eq(curatedLists.isActive, true)
    ))

  const lists = await db
    .select({
      id: curatedLists.id,
      listType: curatedLists.listType,
      sourceName: curatedLists.sourceName,
      sourceLogoUrl: curatedLists.sourceLogoUrl,
      title: curatedLists.title,
      subtitle: curatedLists.subtitle,
      description: curatedLists.description,
      bookCount: curatedLists.bookCount,
      lastUpdated: curatedLists.updatedAt,
      externalUrl: curatedLists.sourceUrl,
    })
    .from(curatedLists)
    .where(and(
      eq(curatedLists.listType, 'pulitzer'),
      eq(curatedLists.isActive, true)
    ))
    .orderBy(desc(curatedLists.sortOrder), desc(curatedLists.createdAt))
    .limit(limit)
    .offset(offset)

  const listsWithCovers = await Promise.all(
    lists.map(async (list) => {
      const items = await db
        .select({
          externalCoverUrl: curatedListItems.externalCoverUrl,
          bookId: curatedListItems.bookId,
          bookType: curatedListItems.bookType,
        })
        .from(curatedListItems)
        .where(eq(curatedListItems.listId, list.id))
        .orderBy(curatedListItems.position)
        .limit(5)

      const previewCovers: string[] = []
      for (const item of items) {
        if (item.bookId && item.bookType === 'ebook') {
          const [book] = await db.select({ coverUrl: ebooks.coverUrl }).from(ebooks).where(eq(ebooks.id, item.bookId)).limit(1)
          if (book?.coverUrl) previewCovers.push(book.coverUrl)
        } else if (item.externalCoverUrl) {
          previewCovers.push(`${item.externalCoverUrl}?v=7`)
        }
      }

      return {
        ...list,
        lastUpdated: list.lastUpdated?.toISOString() ?? null,
        previewCovers,
      }
    })
  )

  return c.json({
    data: listsWithCovers,
    total: Number(total),
    hasMore: offset + lists.length < Number(total),
  })
})

// ============================================
// GET /api/store/booker-awards
// ============================================

const bookerAwardsRoute = createRoute({
  method: 'get',
  path: '/booker-awards',
  tags: ['Store'],
  summary: 'Get Booker Prize book lists',
  request: {
    query: z.object({
      limit: z.coerce.number().default(20),
      offset: z.coerce.number().default(0),
    }),
  },
  responses: {
    200: {
      description: 'Booker Prize book lists',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(ExternalRankingSchema),
            total: z.number(),
            hasMore: z.boolean(),
          }),
        },
      },
    },
  },
})

app.openapi(bookerAwardsRoute, async (c) => {
  const { limit, offset } = c.req.valid('query')

  // Include both booker and booker_international
  const bookerTypes = ['booker', 'booker_international']

  const [{ count: total }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(curatedLists)
    .where(and(
      inArray(curatedLists.listType, bookerTypes),
      eq(curatedLists.isActive, true)
    ))

  const lists = await db
    .select({
      id: curatedLists.id,
      listType: curatedLists.listType,
      sourceName: curatedLists.sourceName,
      sourceLogoUrl: curatedLists.sourceLogoUrl,
      title: curatedLists.title,
      subtitle: curatedLists.subtitle,
      description: curatedLists.description,
      bookCount: curatedLists.bookCount,
      lastUpdated: curatedLists.updatedAt,
      externalUrl: curatedLists.sourceUrl,
    })
    .from(curatedLists)
    .where(and(
      inArray(curatedLists.listType, bookerTypes),
      eq(curatedLists.isActive, true)
    ))
    .orderBy(desc(curatedLists.sortOrder), desc(curatedLists.createdAt))
    .limit(limit)
    .offset(offset)

  const listsWithCovers = await Promise.all(
    lists.map(async (list) => {
      const items = await db
        .select({
          externalCoverUrl: curatedListItems.externalCoverUrl,
          bookId: curatedListItems.bookId,
          bookType: curatedListItems.bookType,
        })
        .from(curatedListItems)
        .where(eq(curatedListItems.listId, list.id))
        .orderBy(curatedListItems.position)
        .limit(5)

      const previewCovers: string[] = []
      for (const item of items) {
        if (item.bookId && item.bookType === 'ebook') {
          const [book] = await db.select({ coverUrl: ebooks.coverUrl }).from(ebooks).where(eq(ebooks.id, item.bookId)).limit(1)
          if (book?.coverUrl) previewCovers.push(book.coverUrl)
        } else if (item.externalCoverUrl) {
          previewCovers.push(`${item.externalCoverUrl}?v=7`)
        }
      }

      return {
        ...list,
        lastUpdated: list.lastUpdated?.toISOString() ?? null,
        previewCovers,
      }
    })
  )

  return c.json({
    data: listsWithCovers,
    total: Number(total),
    hasMore: offset + lists.length < Number(total),
  })
})

// ============================================
// GET /api/store/newbery-awards
// ============================================

const newberyAwardsRoute = createRoute({
  method: 'get',
  path: '/newbery-awards',
  tags: ['Store'],
  summary: 'Get Newbery Medal book lists',
  request: {
    query: z.object({
      limit: z.coerce.number().default(20),
      offset: z.coerce.number().default(0),
    }),
  },
  responses: {
    200: {
      description: 'Newbery Medal book lists',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(ExternalRankingSchema),
            total: z.number(),
            hasMore: z.boolean(),
          }),
        },
      },
    },
  },
})

app.openapi(newberyAwardsRoute, async (c) => {
  const { limit, offset } = c.req.valid('query')

  const [{ count: total }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(curatedLists)
    .where(and(
      eq(curatedLists.listType, 'newbery'),
      eq(curatedLists.isActive, true)
    ))

  const lists = await db
    .select({
      id: curatedLists.id,
      listType: curatedLists.listType,
      sourceName: curatedLists.sourceName,
      sourceLogoUrl: curatedLists.sourceLogoUrl,
      title: curatedLists.title,
      subtitle: curatedLists.subtitle,
      description: curatedLists.description,
      bookCount: curatedLists.bookCount,
      lastUpdated: curatedLists.updatedAt,
      externalUrl: curatedLists.sourceUrl,
    })
    .from(curatedLists)
    .where(and(
      eq(curatedLists.listType, 'newbery'),
      eq(curatedLists.isActive, true)
    ))
    .orderBy(desc(curatedLists.sortOrder), desc(curatedLists.createdAt))
    .limit(limit)
    .offset(offset)

  const listsWithCovers = await Promise.all(
    lists.map(async (list) => {
      const items = await db
        .select({
          externalCoverUrl: curatedListItems.externalCoverUrl,
          bookId: curatedListItems.bookId,
          bookType: curatedListItems.bookType,
        })
        .from(curatedListItems)
        .where(eq(curatedListItems.listId, list.id))
        .orderBy(curatedListItems.position)
        .limit(5)

      const previewCovers: string[] = []
      for (const item of items) {
        if (item.bookId && item.bookType === 'ebook') {
          const [book] = await db.select({ coverUrl: ebooks.coverUrl }).from(ebooks).where(eq(ebooks.id, item.bookId)).limit(1)
          if (book?.coverUrl) previewCovers.push(book.coverUrl)
        } else if (item.externalCoverUrl) {
          previewCovers.push(`${item.externalCoverUrl}?v=7`)
        }
      }

      return {
        ...list,
        lastUpdated: list.lastUpdated?.toISOString() ?? null,
        previewCovers,
      }
    })
  )

  return c.json({
    data: listsWithCovers,
    total: Number(total),
    hasMore: offset + lists.length < Number(total),
  })
})

// ============================================
// GET /api/store/awards
// ============================================

const awardsRoute = createRoute({
  method: 'get',
  path: '/awards',
  tags: ['Store'],
  summary: 'Get literary award lists (Pulitzer, Booker, Newbery, etc.)',
  request: {
    query: z.object({
      limit: z.coerce.number().default(20),
      offset: z.coerce.number().default(0),
    }),
  },
  responses: {
    200: {
      description: 'Literary award lists',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(ExternalRankingSchema),
            total: z.number(),
            hasMore: z.boolean(),
          }),
        },
      },
    },
  },
})

app.openapi(awardsRoute, async (c) => {
  const { limit, offset } = c.req.valid('query')

  const [{ count: total }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(curatedLists)
    .where(and(
      inArray(curatedLists.listType, AWARD_TYPES),
      eq(curatedLists.isActive, true)
    ))

  const lists = await db
    .select({
      id: curatedLists.id,
      listType: curatedLists.listType,
      sourceName: curatedLists.sourceName,
      sourceLogoUrl: curatedLists.sourceLogoUrl,
      title: curatedLists.title,
      subtitle: curatedLists.subtitle,
      description: curatedLists.description,
      bookCount: curatedLists.bookCount,
      lastUpdated: curatedLists.updatedAt,
      externalUrl: curatedLists.sourceUrl,
    })
    .from(curatedLists)
    .where(and(
      inArray(curatedLists.listType, AWARD_TYPES),
      eq(curatedLists.isActive, true)
    ))
    .orderBy(desc(curatedLists.sortOrder), desc(curatedLists.createdAt))
    .limit(limit)
    .offset(offset)

  const listsWithCovers = await Promise.all(
    lists.map(async (list) => {
      const items = await db
        .select({
          externalCoverUrl: curatedListItems.externalCoverUrl,
          bookId: curatedListItems.bookId,
          bookType: curatedListItems.bookType,
        })
        .from(curatedListItems)
        .where(eq(curatedListItems.listId, list.id))
        .orderBy(curatedListItems.position)
        .limit(5)

      const previewCovers: string[] = []
      for (const item of items) {
        if (item.bookId && item.bookType === 'ebook') {
          const [book] = await db.select({ coverUrl: ebooks.coverUrl }).from(ebooks).where(eq(ebooks.id, item.bookId)).limit(1)
          if (book?.coverUrl) previewCovers.push(book.coverUrl)
        } else if (item.externalCoverUrl) {
          previewCovers.push(`${item.externalCoverUrl}?v=7`)
        }
      }

      return {
        ...list,
        lastUpdated: list.lastUpdated?.toISOString() ?? null,
        previewCovers,
      }
    })
  )

  return c.json({
    data: listsWithCovers,
    total: Number(total),
    hasMore: offset + lists.length < Number(total),
  })
})

export default app
