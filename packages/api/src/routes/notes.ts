/**
 * Notes Routes - API endpoints for notes
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { db } from '../db/client'
import { notes } from '../db/schema'
import { eq, desc, sql } from 'drizzle-orm'

const app = new OpenAPIHono()

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

// GET /api/notes - List notes
const listNotesRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Notes'],
  summary: 'List all notes',
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
  },
})

app.openapi(listNotesRoute, async (c) => {
  const { year, search, limit, offset } = c.req.valid('query')

  let query = db.select().from(notes).$dynamic()

  if (year) {
    query = query.where(eq(notes.year, year))
  }

  if (search) {
    query = query.where(sql`${notes.title} ILIKE ${`%${search}%`}`)
  }

  const results = await query
    .orderBy(desc(notes.createdAt))
    .limit(limit)
    .offset(offset)

  const [totalResult] = await db.select({ count: sql<number>`count(*)` }).from(notes)

  return c.json({
    data: results.map(n => ({
      ...n,
      createdAt: n.createdAt?.toISOString() ?? null,
    })),
    total: Number(totalResult.count),
  })
})

// GET /api/notes/years - Get available years
const listYearsRoute = createRoute({
  method: 'get',
  path: '/years',
  tags: ['Notes'],
  summary: 'Get list of years with notes',
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
  },
})

app.openapi(listYearsRoute, async (c) => {
  const years = await db
    .select({
      year: notes.year,
      count: sql<number>`count(*)`,
    })
    .from(notes)
    .where(sql`${notes.year} IS NOT NULL`)
    .groupBy(notes.year)
    .orderBy(desc(notes.year))

  return c.json({
    data: years.map(y => ({
      year: y.year!,
      count: Number(y.count),
    })),
  })
})

// GET /api/notes/:id - Get single note
const getNoteRoute = createRoute({
  method: 'get',
  path: '/:id',
  tags: ['Notes'],
  summary: 'Get note by ID',
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

  const [note] = await db.select().from(notes).where(eq(notes.id, id)).limit(1)

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
