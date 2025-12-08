import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { db } from '../db/client'
import { magazines, publishers } from '../db/schema'
import { eq, like, desc, count } from 'drizzle-orm'

const app = new OpenAPIHono()

// Schemas
const MagazineSchema = z.object({
  id: z.number(),
  publisherId: z.number().nullable(),
  title: z.string(),
  filePath: z.string().nullable(),
  fileSize: z.number().nullable(),
  year: z.number().nullable(),
  pageCount: z.number().nullable(),
  coverUrl: z.string().nullable(),
  preprocessed: z.boolean().nullable(),
  s3Key: z.string().nullable(),
  createdAt: z.string().nullable(),
})

const PublisherSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  magazineCount: z.number().optional(),
})

// GET /api/magazines - List magazines
const listMagazinesRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Magazines'],
  summary: 'List all magazines',
  request: {
    query: z.object({
      publisher: z.coerce.number().optional(),
      year: z.coerce.number().optional(),
      search: z.string().optional(),
      limit: z.coerce.number().default(50),
      offset: z.coerce.number().default(0),
    }),
  },
  responses: {
    200: {
      description: 'List of magazines',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(MagazineSchema),
            total: z.number(),
          }),
        },
      },
    },
  },
})

app.openapi(listMagazinesRoute, async (c) => {
  const { publisher, year, search, limit, offset } = c.req.valid('query')

  let query = db.select().from(magazines).$dynamic()

  if (publisher) {
    query = query.where(eq(magazines.publisherId, publisher))
  }

  if (year) {
    query = query.where(eq(magazines.year, year))
  }

  if (search) {
    query = query.where(like(magazines.title, `%${search}%`))
  }

  const results = await query
    .orderBy(desc(magazines.createdAt))
    .limit(limit)
    .offset(offset)

  const [totalResult] = await db.select({ count: count() }).from(magazines)

  return c.json({
    data: results.map(m => ({
      ...m,
      createdAt: m.createdAt?.toISOString() ?? null,
    })),
    total: totalResult.count,
  })
})

// GET /api/magazines/publishers - List publishers (MUST be before /:id route)
const listPublishersRoute = createRoute({
  method: 'get',
  path: '/publishers',
  tags: ['Magazines'],
  summary: 'List magazine publishers',
  responses: {
    200: {
      description: 'List of publishers',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(PublisherSchema),
          }),
        },
      },
    },
  },
})

app.openapi(listPublishersRoute, async (c) => {
  const pubs = await db.select().from(publishers)

  // Get count for each publisher
  const publishersWithCount = await Promise.all(
    pubs.map(async (pub) => {
      const [result] = await db
        .select({ count: count() })
        .from(magazines)
        .where(eq(magazines.publisherId, pub.id))
      return {
        ...pub,
        magazineCount: result.count,
      }
    })
  )

  return c.json({
    data: publishersWithCount,
  })
})

// GET /api/magazines/:id - Get single magazine
const getMagazineRoute = createRoute({
  method: 'get',
  path: '/:id',
  tags: ['Magazines'],
  summary: 'Get magazine by ID',
  request: {
    params: z.object({
      id: z.coerce.number(),
    }),
  },
  responses: {
    200: {
      description: 'Magazine details',
      content: {
        'application/json': {
          schema: z.object({ data: MagazineSchema }),
        },
      },
    },
    404: {
      description: 'Magazine not found',
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

app.openapi(getMagazineRoute, async (c) => {
  const { id } = c.req.valid('param')

  const [magazine] = await db.select().from(magazines).where(eq(magazines.id, id)).limit(1)

  if (!magazine) {
    return c.json({
      error: { code: 'NOT_FOUND', message: 'Magazine not found' },
    }, 404)
  }

  return c.json({
    data: {
      ...magazine,
      createdAt: magazine.createdAt?.toISOString() ?? null,
    },
  })
})

export { app as magazinesRoutes }
