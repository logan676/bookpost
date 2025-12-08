/**
 * Books Routes - API endpoints for physical books (requires authentication)
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { db } from '../db/client'
import { books } from '../db/schema'
import { eq, desc, sql, and } from 'drizzle-orm'
import { requireAuth } from '../middleware/auth'

const app = new OpenAPIHono()

// Apply auth middleware to all routes
app.use('*', requireAuth)

// Schemas
const BookSchema = z.object({
  id: z.number(),
  userId: z.number().nullable(),
  title: z.string().nullable(),
  author: z.string().nullable(),
  coverUrl: z.string().nullable(),
  coverPhotoUrl: z.string().nullable(),
  isbn: z.string().nullable(),
  publisher: z.string().nullable(),
  publishYear: z.string().nullable(),
  description: z.string().nullable(),
  pageCount: z.number().nullable(),
  categories: z.string().nullable(),
  language: z.string().nullable(),
  createdAt: z.string().nullable(),
})

// GET /api/books - List books for current user
const listBooksRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Books'],
  summary: 'List books for current user',
  security: [{ Bearer: [] }],
  request: {
    query: z.object({
      search: z.string().optional(),
      author: z.string().optional(),
      limit: z.coerce.number().default(50),
      offset: z.coerce.number().default(0),
    }),
  },
  responses: {
    200: {
      description: 'List of books',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(BookSchema),
            total: z.number(),
          }),
        },
      },
    },
    401: {
      description: 'Unauthorized',
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

app.openapi(listBooksRoute, async (c) => {
  const { search, author, limit, offset } = c.req.valid('query')
  const userId = c.get('userId')

  // Build where conditions - always filter by userId
  const conditions = [eq(books.userId, userId)]

  if (search) {
    conditions.push(sql`${books.title} ILIKE ${`%${search}%`}`)
  }

  if (author) {
    conditions.push(sql`${books.author} ILIKE ${`%${author}%`}`)
  }

  const results = await db
    .select()
    .from(books)
    .where(and(...conditions))
    .orderBy(desc(books.createdAt))
    .limit(limit)
    .offset(offset)

  const [totalResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(books)
    .where(eq(books.userId, userId))

  return c.json({
    data: results.map(b => ({
      ...b,
      createdAt: b.createdAt?.toISOString() ?? null,
    })),
    total: Number(totalResult.count),
  })
})

// GET /api/books/:id - Get single book (only if owned by user)
const getBookRoute = createRoute({
  method: 'get',
  path: '/:id',
  tags: ['Books'],
  summary: 'Get book by ID',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.coerce.number(),
    }),
  },
  responses: {
    200: {
      description: 'Book details',
      content: {
        'application/json': {
          schema: z.object({ data: BookSchema }),
        },
      },
    },
    401: {
      description: 'Unauthorized',
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

app.openapi(getBookRoute, async (c) => {
  const { id } = c.req.valid('param')
  const userId = c.get('userId')

  const [book] = await db
    .select()
    .from(books)
    .where(and(
      eq(books.id, id),
      eq(books.userId, userId)
    ))
    .limit(1)

  if (!book) {
    return c.json({
      error: { code: 'NOT_FOUND', message: 'Book not found' },
    }, 404)
  }

  return c.json({
    data: {
      ...book,
      createdAt: book.createdAt?.toISOString() ?? null,
    },
  })
})

export { app as booksRoutes }
