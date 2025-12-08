import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { db } from '../db/client'
import { magazines, publishers } from '../db/schema'
import { eq, like, desc, count } from 'drizzle-orm'
import { streamFromR2, isR2Configured } from '../services/storage'

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

// GET /api/magazines/:id/file - Serve magazine file from R2
app.get('/:id/file', async (c) => {
  const id = parseInt(c.req.param('id'))

  if (isNaN(id)) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid magazine ID' } }, 400)
  }

  // Get magazine from database
  const [magazine] = await db.select().from(magazines).where(eq(magazines.id, id)).limit(1)

  if (!magazine) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Magazine not found' } }, 404)
  }

  if (!magazine.s3Key) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Magazine file not available' } }, 404)
  }

  if (!isR2Configured()) {
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Storage not configured' } }, 500)
  }

  try {
    const stream = await streamFromR2(magazine.s3Key)

    if (!stream) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'File not found in storage' } }, 404)
    }

    const webStream = stream.transformToWebStream()

    return new Response(webStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Cache-Control': 'private, max-age=3600',
        'Content-Disposition': `inline; filename="${encodeURIComponent(magazine.title || 'magazine')}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Failed to serve magazine file:', error)
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Failed to serve file' } }, 500)
  }
})

// GET /api/magazines/:id/page/:page - Serve magazine page image from R2
app.get('/:id/page/:page', async (c) => {
  const id = parseInt(c.req.param('id'))
  const page = parseInt(c.req.param('page'))

  if (isNaN(id) || isNaN(page)) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid parameters' } }, 400)
  }

  // Get magazine from database
  const [magazine] = await db.select().from(magazines).where(eq(magazines.id, id)).limit(1)

  if (!magazine) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Magazine not found' } }, 404)
  }

  if (!isR2Configured()) {
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Storage not configured' } }, 500)
  }

  // Page images are stored as magazine_pages/{id}/{page}.jpg
  const pageKey = `magazine_pages/${id}/${page}.jpg`

  try {
    const stream = await streamFromR2(pageKey)

    if (!stream) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Page not found' } }, 404)
    }

    const webStream = stream.transformToWebStream()

    return new Response(webStream, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    console.error('Failed to serve magazine page:', error)
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Failed to serve page' } }, 500)
  }
})

export { app as magazinesRoutes }
