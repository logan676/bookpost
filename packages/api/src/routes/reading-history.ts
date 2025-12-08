/**
 * Reading History Routes
 */

import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { z } from 'zod'
import { db } from '../db/client'
import { readingHistory } from '../db/schema'
import { desc, eq } from 'drizzle-orm'

const app = new OpenAPIHono()

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

// GET /api/reading-history
const listHistoryRoute = createRoute({
  method: 'get',
  path: '/reading-history',
  tags: ['Reading History'],
  summary: 'Get reading history for current user',
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
  },
})

app.openapi(listHistoryRoute, async (c) => {
  const limit = parseInt(c.req.query('limit') || '20')

  const history = await db
    .select()
    .from(readingHistory)
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
  },
})

app.openapi(updateHistoryRoute, async (c) => {
  const body = await c.req.json()
  const { itemType, itemId, title, coverUrl, lastPage } = body

  // Upsert reading history entry
  const existing = await db
    .select()
    .from(readingHistory)
    .where(eq(readingHistory.itemId, itemId))
    .limit(1)

  let result
  if (existing.length > 0 && existing[0].itemType === itemType) {
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
