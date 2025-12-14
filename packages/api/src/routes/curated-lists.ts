/**
 * Curated Lists Routes - External/Editorial book lists
 *
 * Provides read operations for curated lists (Amazon Best, NYT Bestsellers, Bill Gates, etc.):
 * - Browse curated lists by type/year
 * - Get list details with books
 * - Admin: Get unavailable books list
 */

import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { z } from 'zod'
import { requireAuth, optionalAuth } from '../middleware/auth'
import { db } from '../db/client'
import { curatedLists, curatedListItems, ebooks, magazines } from '../db/schema'
import { eq, and, desc, asc, sql, isNull, isNotNull } from 'drizzle-orm'

const app = new OpenAPIHono()

// ============================================
// Schemas
// ============================================

const CuratedListSchema = z.object({
  id: z.number(),
  listType: z.string(),
  title: z.string(),
  subtitle: z.string().nullable(),
  description: z.string().nullable(),
  coverUrl: z.string().nullable(),
  themeColor: z.string().nullable(),
  sourceName: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  sourceLogoUrl: z.string().nullable(),
  year: z.number().nullable(),
  month: z.number().nullable(),
  category: z.string().nullable(),
  bookCount: z.number(),
  viewCount: z.number(),
  saveCount: z.number(),
  isFeatured: z.boolean(),
  createdAt: z.string(),
})

const CuratedListItemSchema = z.object({
  id: z.number(),
  position: z.number(),
  bookType: z.string(),
  bookId: z.number().nullable(),
  // Available book info (when bookId is not null)
  book: z.object({
    id: z.number(),
    title: z.string(),
    author: z.string().nullable(),
    coverUrl: z.string().nullable(),
    rating: z.number().nullable(),
    ratingCount: z.number().nullable(),
  }).nullable(),
  // External book info (when book not available)
  externalTitle: z.string().nullable(),
  externalAuthor: z.string().nullable(),
  externalCoverUrl: z.string().nullable(),
  externalDescription: z.string().nullable(),
  isbn: z.string().nullable(),
  amazonUrl: z.string().nullable(),
  goodreadsUrl: z.string().nullable(),
  editorNote: z.string().nullable(),
  isAvailable: z.boolean(), // true if book is in our library
})

const UnavailableBookSchema = z.object({
  id: z.number(),
  listId: z.number(),
  listTitle: z.string(),
  listType: z.string(),
  year: z.number().nullable(),
  externalTitle: z.string().nullable(),
  externalAuthor: z.string().nullable(),
  externalCoverUrl: z.string().nullable(),
  isbn: z.string().nullable(),
  isbn13: z.string().nullable(),
  amazonUrl: z.string().nullable(),
  goodreadsUrl: z.string().nullable(),
  addedAt: z.string(),
})

const ErrorSchema = z.object({
  error: z.string(),
})

// ============================================
// Routes
// ============================================

// GET /api/curated-lists - Browse curated lists
const getCuratedListsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Curated Lists'],
  summary: 'Browse curated lists',
  request: {
    query: z.object({
      type: z.string().optional(), // 'nyt_bestseller', 'amazon_best', 'bill_gates', etc.
      year: z.string().optional(), // Filter by year
      category: z.string().optional(), // 'fiction', 'nonfiction', etc.
      featured: z.string().optional(), // 'true' to get featured only
      limit: z.string().optional().default('20'),
      offset: z.string().optional().default('0'),
    }),
  },
  responses: {
    200: {
      description: 'List of curated lists',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(CuratedListSchema),
            total: z.number(),
            hasMore: z.boolean(),
          }),
        },
      },
    },
  },
})

app.openapi(getCuratedListsRoute, async (c) => {
  const { type, year, category, featured, limit, offset } = c.req.valid('query')
  const limitNum = parseInt(limit || '20')
  const offsetNum = parseInt(offset || '0')

  // Build conditions
  const conditions = [eq(curatedLists.isActive, true)]

  if (type) {
    conditions.push(eq(curatedLists.listType, type))
  }
  if (year) {
    conditions.push(eq(curatedLists.year, parseInt(year)))
  }
  if (category) {
    conditions.push(eq(curatedLists.category, category))
  }
  if (featured === 'true') {
    conditions.push(eq(curatedLists.isFeatured, true))
  }

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(curatedLists)
    .where(and(...conditions))

  const total = countResult[0]?.count || 0

  // Get lists
  const lists = await db
    .select()
    .from(curatedLists)
    .where(and(...conditions))
    .orderBy(desc(curatedLists.year), desc(curatedLists.sortOrder), desc(curatedLists.createdAt))
    .limit(limitNum)
    .offset(offsetNum)

  return c.json({
    data: lists.map(list => ({
      ...list,
      createdAt: list.createdAt?.toISOString() || '',
    })),
    total,
    hasMore: offsetNum + lists.length < total,
  })
})

// GET /api/curated-lists/types - Get available list types
const getListTypesRoute = createRoute({
  method: 'get',
  path: '/types',
  tags: ['Curated Lists'],
  summary: 'Get available list types with counts',
  responses: {
    200: {
      description: 'List of available types',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(z.object({
              type: z.string(),
              name: z.string(),
              count: z.number(),
              years: z.array(z.number()),
            })),
          }),
        },
      },
    },
  },
})

// Type display names
const LIST_TYPE_NAMES: Record<string, string> = {
  'nyt_bestseller': 'New York Times Bestsellers',
  'amazon_best': 'Amazon Best Books',
  'bill_gates': 'Bill Gates Recommendations',
  'goodreads_choice': 'Goodreads Choice Awards',
  'pulitzer': 'Pulitzer Prize',
  'booker': 'Booker Prize',
  'national_book': 'National Book Award',
  'oprah_book_club': "Oprah's Book Club",
  'reese_book_club': "Reese's Book Club",
  'obama_reading': 'Obama Reading List',
  'time_100': 'TIME 100 Must-Read',
  'npr_books': 'NPR Best Books',
  'guardian_best': 'The Guardian Best Books',
  'economist_books': 'The Economist Books of the Year',
  'financial_times': 'Financial Times Best Books',
}

app.openapi(getListTypesRoute, async (c) => {
  const results = await db
    .select({
      type: curatedLists.listType,
      count: sql<number>`count(*)::int`,
      years: sql<number[]>`array_agg(distinct ${curatedLists.year} order by ${curatedLists.year} desc)`,
    })
    .from(curatedLists)
    .where(eq(curatedLists.isActive, true))
    .groupBy(curatedLists.listType)

  return c.json({
    data: results.map(r => ({
      type: r.type,
      name: LIST_TYPE_NAMES[r.type] || r.type,
      count: r.count,
      years: (r.years || []).filter(y => y !== null),
    })),
  })
})

// GET /api/curated-lists/:id - Get list details with books
const getCuratedListRoute = createRoute({
  method: 'get',
  path: '/:id',
  tags: ['Curated Lists'],
  summary: 'Get curated list details with books',
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'List details with books',
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({
              list: CuratedListSchema,
              items: z.array(CuratedListItemSchema),
            }),
          }),
        },
      },
    },
    404: {
      description: 'List not found',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
})

app.openapi(getCuratedListRoute, async (c) => {
  const { id } = c.req.valid('params')
  const listId = parseInt(id)

  // Get list
  const [list] = await db
    .select()
    .from(curatedLists)
    .where(and(eq(curatedLists.id, listId), eq(curatedLists.isActive, true)))
    .limit(1)

  if (!list) {
    return c.json({ error: 'List not found' }, 404)
  }

  // Increment view count
  await db
    .update(curatedLists)
    .set({ viewCount: sql`${curatedLists.viewCount} + 1` })
    .where(eq(curatedLists.id, listId))

  // Get items
  const items = await db
    .select()
    .from(curatedListItems)
    .where(eq(curatedListItems.listId, listId))
    .orderBy(asc(curatedListItems.position))

  // Fetch book details for available books
  const ebookIds = items.filter(i => i.bookType === 'ebook' && i.bookId).map(i => i.bookId!)
  const magazineIds = items.filter(i => i.bookType === 'magazine' && i.bookId).map(i => i.bookId!)

  const ebooksData = ebookIds.length > 0
    ? await db.select({
        id: ebooks.id,
        title: ebooks.title,
        author: ebooks.author,
        coverUrl: ebooks.coverImageUrl,
        rating: ebooks.rating,
        ratingCount: ebooks.ratingCount,
      }).from(ebooks).where(sql`${ebooks.id} IN ${ebookIds}`)
    : []

  const magazinesData = magazineIds.length > 0
    ? await db.select({
        id: magazines.id,
        title: magazines.title,
        author: sql<string>`null`,
        coverUrl: magazines.coverImageUrl,
        rating: magazines.rating,
        ratingCount: magazines.ratingCount,
      }).from(magazines).where(sql`${magazines.id} IN ${magazineIds}`)
    : []

  const bookMap = new Map<string, any>()
  ebooksData.forEach(b => bookMap.set(`ebook_${b.id}`, b))
  magazinesData.forEach(b => bookMap.set(`magazine_${b.id}`, b))

  const itemsWithBooks = items.map(item => {
    const book = item.bookId ? bookMap.get(`${item.bookType}_${item.bookId}`) : null
    return {
      id: item.id,
      position: item.position,
      bookType: item.bookType,
      bookId: item.bookId,
      book: book ? {
        id: book.id,
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl,
        rating: book.rating ? parseFloat(book.rating) : null,
        ratingCount: book.ratingCount,
      } : null,
      externalTitle: item.externalTitle,
      externalAuthor: item.externalAuthor,
      externalCoverUrl: item.externalCoverUrl,
      externalDescription: item.externalDescription,
      isbn: item.isbn,
      amazonUrl: item.amazonUrl,
      goodreadsUrl: item.goodreadsUrl,
      editorNote: item.editorNote,
      isAvailable: item.bookId !== null,
    }
  })

  return c.json({
    data: {
      list: {
        ...list,
        createdAt: list.createdAt?.toISOString() || '',
      },
      items: itemsWithBooks,
    },
  })
})

// GET /api/curated-lists/admin/unavailable-books - Get all unavailable books (admin)
const getUnavailableBooksRoute = createRoute({
  method: 'get',
  path: '/admin/unavailable-books',
  tags: ['Curated Lists', 'Admin'],
  summary: 'Get all books that are not available in library (admin)',
  middleware: [requireAuth],
  request: {
    query: z.object({
      limit: z.string().optional().default('50'),
      offset: z.string().optional().default('0'),
    }),
  },
  responses: {
    200: {
      description: 'List of unavailable books',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(UnavailableBookSchema),
            total: z.number(),
            hasMore: z.boolean(),
          }),
        },
      },
    },
  },
})

app.openapi(getUnavailableBooksRoute, async (c) => {
  const { limit, offset } = c.req.valid('query')
  const limitNum = parseInt(limit || '50')
  const offsetNum = parseInt(offset || '0')

  // Count total unavailable books
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(curatedListItems)
    .where(isNull(curatedListItems.bookId))

  const total = countResult[0]?.count || 0

  // Get unavailable books with list info
  const items = await db
    .select({
      id: curatedListItems.id,
      listId: curatedListItems.listId,
      listTitle: curatedLists.title,
      listType: curatedLists.listType,
      year: curatedLists.year,
      externalTitle: curatedListItems.externalTitle,
      externalAuthor: curatedListItems.externalAuthor,
      externalCoverUrl: curatedListItems.externalCoverUrl,
      isbn: curatedListItems.isbn,
      isbn13: curatedListItems.isbn13,
      amazonUrl: curatedListItems.amazonUrl,
      goodreadsUrl: curatedListItems.goodreadsUrl,
      addedAt: curatedListItems.addedAt,
    })
    .from(curatedListItems)
    .innerJoin(curatedLists, eq(curatedListItems.listId, curatedLists.id))
    .where(isNull(curatedListItems.bookId))
    .orderBy(desc(curatedListItems.addedAt))
    .limit(limitNum)
    .offset(offsetNum)

  return c.json({
    data: items.map(item => ({
      ...item,
      addedAt: item.addedAt?.toISOString() || '',
    })),
    total,
    hasMore: offsetNum + items.length < total,
  })
})

// GET /api/curated-lists/admin/stats - Get curated lists statistics (admin)
const getStatsRoute = createRoute({
  method: 'get',
  path: '/admin/stats',
  tags: ['Curated Lists', 'Admin'],
  summary: 'Get curated lists statistics',
  middleware: [requireAuth],
  responses: {
    200: {
      description: 'Statistics',
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({
              totalLists: z.number(),
              totalBooks: z.number(),
              availableBooks: z.number(),
              unavailableBooks: z.number(),
              listsByType: z.array(z.object({
                type: z.string(),
                count: z.number(),
              })),
              listsByYear: z.array(z.object({
                year: z.number(),
                count: z.number(),
              })),
            }),
          }),
        },
      },
    },
  },
})

app.openapi(getStatsRoute, async (c) => {
  // Total lists
  const [listsCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(curatedLists)
    .where(eq(curatedLists.isActive, true))

  // Total books
  const [totalBooks] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(curatedListItems)

  // Available books
  const [availableBooks] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(curatedListItems)
    .where(isNotNull(curatedListItems.bookId))

  // Unavailable books
  const [unavailableBooks] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(curatedListItems)
    .where(isNull(curatedListItems.bookId))

  // Lists by type
  const listsByType = await db
    .select({
      type: curatedLists.listType,
      count: sql<number>`count(*)::int`,
    })
    .from(curatedLists)
    .where(eq(curatedLists.isActive, true))
    .groupBy(curatedLists.listType)

  // Lists by year
  const listsByYear = await db
    .select({
      year: curatedLists.year,
      count: sql<number>`count(*)::int`,
    })
    .from(curatedLists)
    .where(and(eq(curatedLists.isActive, true), isNotNull(curatedLists.year)))
    .groupBy(curatedLists.year)
    .orderBy(desc(curatedLists.year))

  return c.json({
    data: {
      totalLists: listsCount?.count || 0,
      totalBooks: totalBooks?.count || 0,
      availableBooks: availableBooks?.count || 0,
      unavailableBooks: unavailableBooks?.count || 0,
      listsByType: listsByType.map(r => ({ type: r.type, count: r.count })),
      listsByYear: listsByYear.filter(r => r.year !== null).map(r => ({ year: r.year!, count: r.count })),
    },
  })
})

export default app
