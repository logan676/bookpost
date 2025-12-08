import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { db } from '../db/client'
import { ebooks, ebookCategories } from '../db/schema'
import { eq, like, desc, count } from 'drizzle-orm'

const app = new OpenAPIHono()

// Schemas
const EbookSchema = z.object({
  id: z.number(),
  categoryId: z.number().nullable(),
  title: z.string(),
  filePath: z.string().nullable(),
  fileSize: z.number().nullable(),
  fileType: z.string().nullable(),
  normalizedTitle: z.string().nullable(),
  coverUrl: z.string().nullable(),
  s3Key: z.string().nullable(),
  createdAt: z.string().nullable(),
})

const CategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  count: z.number().optional(),
})

// GET /api/ebooks - List ebooks
const listEbooksRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Ebooks'],
  summary: 'List all ebooks',
  request: {
    query: z.object({
      category: z.coerce.number().optional(),
      search: z.string().optional(),
      limit: z.coerce.number().default(50),
      offset: z.coerce.number().default(0),
    }),
  },
  responses: {
    200: {
      description: 'List of ebooks',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(EbookSchema),
            total: z.number(),
          }),
        },
      },
    },
  },
})

app.openapi(listEbooksRoute, async (c) => {
  const { category, search, limit, offset } = c.req.valid('query')

  let query = db.select().from(ebooks).$dynamic()

  if (category) {
    query = query.where(eq(ebooks.categoryId, category))
  }

  if (search) {
    query = query.where(like(ebooks.title, `%${search}%`))
  }

  const results = await query
    .orderBy(desc(ebooks.createdAt))
    .limit(limit)
    .offset(offset)

  const [totalResult] = await db.select({ count: count() }).from(ebooks)

  return c.json({
    data: results.map(e => ({
      ...e,
      createdAt: e.createdAt?.toISOString() ?? null,
    })),
    total: totalResult.count,
  })
})

// GET /api/ebooks/:id - Get single ebook
const getEbookRoute = createRoute({
  method: 'get',
  path: '/:id',
  tags: ['Ebooks'],
  summary: 'Get ebook by ID',
  request: {
    params: z.object({
      id: z.coerce.number(),
    }),
  },
  responses: {
    200: {
      description: 'Ebook details',
      content: {
        'application/json': {
          schema: z.object({ data: EbookSchema }),
        },
      },
    },
    404: {
      description: 'Ebook not found',
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

app.openapi(getEbookRoute, async (c) => {
  const { id } = c.req.valid('param')

  const [ebook] = await db.select().from(ebooks).where(eq(ebooks.id, id)).limit(1)

  if (!ebook) {
    return c.json({
      error: { code: 'NOT_FOUND', message: 'Ebook not found' },
    }, 404)
  }

  return c.json({
    data: {
      ...ebook,
      createdAt: ebook.createdAt?.toISOString() ?? null,
    },
  })
})

// GET /api/ebooks/categories - List categories
const listCategoriesRoute = createRoute({
  method: 'get',
  path: '/categories',
  tags: ['Ebooks'],
  summary: 'List ebook categories',
  responses: {
    200: {
      description: 'List of categories',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(CategorySchema),
          }),
        },
      },
    },
  },
})

app.openapi(listCategoriesRoute, async (c) => {
  const categories = await db.select().from(ebookCategories)

  // Get count for each category
  const categoriesWithCount = await Promise.all(
    categories.map(async (cat) => {
      const [result] = await db
        .select({ count: count() })
        .from(ebooks)
        .where(eq(ebooks.categoryId, cat.id))
      return {
        ...cat,
        count: result.count,
      }
    })
  )

  return c.json({
    data: categoriesWithCount,
  })
})

export { app as ebooksRoutes }
