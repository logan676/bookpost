/**
 * Reading History Routes (requires authentication)
 */

import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { z } from 'zod'
import { db } from '../db/client'
import { readingHistory } from '../db/schema'
import { desc, eq, and } from 'drizzle-orm'
import { requireAuth } from '../middleware/auth'

const app = new OpenAPIHono()

// Apply auth middleware to all routes
app.use('*', requireAuth)

// Schemas
const ReadingHistorySchema = z.object({
  id: z.number(),
  userId: z.number().nullable(),
  itemType: z.string(),
  itemId: z.number(),
  title: z.string().nullable(),
  coverUrl: z.string().nullable(),
  lastPage: z.number().nullable(),
  lastReadAt: z.string().nullable(),
  createdAt: z.string().nullable(),
})

const HistoryResponseSchema = z.object({
  data: z.array(ReadingHistorySchema),
})

const ErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})

// GET /api/reading-history
const listHistoryRoute = createRoute({
  method: 'get',
  path: '/reading-history',
  tags: ['Reading History'],
  summary: 'Get reading history for current user',
  security: [{ Bearer: [] }],
  parameters: [
    {
      name: 'limit',
      in: 'query',
      schema: { type: 'integer', default: 20 },
    },
  ],
  responses: {
    200: {
      description: 'Reading history entries',
      content: {
        'application/json': {
          schema: HistoryResponseSchema,
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

app.openapi(listHistoryRoute, async (c) => {
  const limit = parseInt(c.req.query('limit') || '20')
  const userId = c.get('userId')

  const history = await db
    .select()
    .from(readingHistory)
    .where(eq(readingHistory.userId, userId))
    .orderBy(desc(readingHistory.lastReadAt))
    .limit(limit)

  return c.json({
    data: history.map(entry => ({
      ...entry,
      lastReadAt: entry.lastReadAt?.toISOString() ?? null,
      createdAt: entry.createdAt?.toISOString() ?? null,
    })),
  })
})

// POST /api/reading-history
const updateHistoryRoute = createRoute({
  method: 'post',
  path: '/reading-history',
  tags: ['Reading History'],
  summary: 'Update reading history',
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            itemType: z.enum(['ebook', 'magazine', 'book']),
            itemId: z.number(),
            title: z.string().optional(),
            coverUrl: z.string().optional(),
            lastPage: z.number().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'History entry updated',
      content: {
        'application/json': {
          schema: ReadingHistorySchema,
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

app.openapi(updateHistoryRoute, async (c) => {
  const body = await c.req.json()
  const { itemType, itemId, title, coverUrl, lastPage } = body
  const userId = c.get('userId')

  // Upsert reading history entry for this user
  const existing = await db
    .select()
    .from(readingHistory)
    .where(and(
      eq(readingHistory.userId, userId),
      eq(readingHistory.itemId, itemId),
      eq(readingHistory.itemType, itemType)
    ))
    .limit(1)

  let result
  if (existing.length > 0) {
    // Update existing
    const updated = await db
      .update(readingHistory)
      .set({
        lastPage: lastPage ?? existing[0].lastPage,
        lastReadAt: new Date(),
        title: title ?? existing[0].title,
        coverUrl: coverUrl ?? existing[0].coverUrl,
      })
      .where(eq(readingHistory.id, existing[0].id))
      .returning()
    result = updated[0]
  } else {
    // Insert new
    const inserted = await db
      .insert(readingHistory)
      .values({
        userId,
        itemType,
        itemId,
        title,
        coverUrl,
        lastPage,
        lastReadAt: new Date(),
      })
      .returning()
    result = inserted[0]
  }

  return c.json({
    ...result,
    lastReadAt: result.lastReadAt?.toISOString() ?? null,
    createdAt: result.createdAt?.toISOString() ?? null,
  })
})

export default app
