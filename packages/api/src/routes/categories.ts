/**
 * Ebook Categories Routes
 */

import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { z } from 'zod'
import { db } from '../db/client'
import { ebookCategories } from '../db/schema'
import { desc } from 'drizzle-orm'

const app = new OpenAPIHono()

// Schemas
const EbookCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.string().nullable(),
})

const CategoriesResponseSchema = z.object({
  data: z.array(EbookCategorySchema),
})

// GET /api/ebook-categories
const listCategoriesRoute = createRoute({
  method: 'get',
  path: '/ebook-categories',
  tags: ['Categories'],
  summary: 'List all ebook categories',
  responses: {
    200: {
      description: 'List of ebook categories',
      content: {
        'application/json': {
          schema: CategoriesResponseSchema,
        },
      },
    },
  },
})

app.openapi(listCategoriesRoute, async (c) => {
  const categories = await db.select().from(ebookCategories).orderBy(desc(ebookCategories.id))

  return c.json({
    data: categories.map(cat => ({
      ...cat,
      createdAt: cat.createdAt?.toISOString() ?? null,
    })),
  })
})

export default app
