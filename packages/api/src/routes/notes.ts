/**
 * Notes Routes - API endpoints for notes (requires authentication)
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { db } from '../db/client'
import { notes } from '../db/schema'
import { eq, desc, sql, and } from 'drizzle-orm'
import { requireAuth } from '../middleware/auth'

const app = new OpenAPIHono()

// Apply auth middleware to all routes
app.use('*', requireAuth)

// Schemas
const NoteSchema = z.object({
  id: z.number(),
  userId: z.number().nullable(),
  title: z.string().nullable(),
  filePath: z.string().nullable(),
  year: z.number().nullable(),
  contentPreview: z.string().nullable(),
  author: z.string().nullable(),
  publishDate: z.string().nullable(),
  tags: z.string().nullable(),
  categories: z.string().nullable(),
  slug: z.string().nullable(),
  createdAt: z.string().nullable(),
})

// GET /api/notes - List notes for current user
const listNotesRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Notes'],
  summary: 'List notes for current user',
  security: [{ Bearer: [] }],
  request: {
    query: z.object({
      year: z.coerce.number().optional(),
      search: z.string().optional(),
      limit: z.coerce.number().default(50),
      offset: z.coerce.number().default(0),
    }),
  },
  responses: {
    200: {
      description: 'List of notes',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(NoteSchema),
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

app.openapi(listNotesRoute, async (c) => {
  const { year, search, limit, offset } = c.req.valid('query')
  const userId = c.get('userId')

  // Build where conditions
  const conditions = [eq(notes.userId, userId)]

  if (year) {
    conditions.push(eq(notes.year, year))
  }

  if (search) {
    conditions.push(sql`${notes.title} ILIKE ${`%${search}%`}`)
  }

  const results = await db
    .select()
    .from(notes)
    .where(and(...conditions))
    .orderBy(desc(notes.createdAt))
    .limit(limit)
    .offset(offset)

  const [totalResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notes)
    .where(eq(notes.userId, userId))

  return c.json({
    data: results.map(n => ({
      ...n,
      createdAt: n.createdAt?.toISOString() ?? null,
    })),
    total: Number(totalResult.count),
  })
})

// GET /api/notes/years - Get available years for current user
const listYearsRoute = createRoute({
  method: 'get',
  path: '/years',
  tags: ['Notes'],
  summary: 'Get list of years with notes for current user',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: 'List of years',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(z.object({
              year: z.number(),
              count: z.number(),
            })),
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

app.openapi(listYearsRoute, async (c) => {
  const userId = c.get('userId')

  const years = await db
    .select({
      year: notes.year,
      count: sql<number>`count(*)`,
    })
    .from(notes)
    .where(and(
      eq(notes.userId, userId),
      sql`${notes.year} IS NOT NULL`
    ))
    .groupBy(notes.year)
    .orderBy(desc(notes.year))

  return c.json({
    data: years.map(y => ({
      year: y.year!,
      count: Number(y.count),
    })),
  })
})

// GET /api/notes/:id - Get single note (only if owned by user)
const getNoteRoute = createRoute({
  method: 'get',
  path: '/:id',
  tags: ['Notes'],
  summary: 'Get note by ID',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.coerce.number(),
    }),
  },
  responses: {
    200: {
      description: 'Note details',
      content: {
        'application/json': {
          schema: z.object({ data: NoteSchema }),
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
      description: 'Note not found',
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

app.openapi(getNoteRoute, async (c) => {
  const { id } = c.req.valid('param')
  const userId = c.get('userId')

  const [note] = await db
    .select()
    .from(notes)
    .where(and(
      eq(notes.id, id),
      eq(notes.userId, userId)
    ))
    .limit(1)

  if (!note) {
    return c.json({
      error: { code: 'NOT_FOUND', message: 'Note not found' },
    }, 404)
  }

  return c.json({
    data: {
      ...note,
      createdAt: note.createdAt?.toISOString() ?? null,
    },
  })
})

export { app as notesRoutes }
