import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { db } from '../db/client'
import { sql } from 'drizzle-orm'

const app = new OpenAPIHono()

// Health check route
const healthRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Health'],
  summary: 'Health check',
  responses: {
    200: {
      description: 'Service is healthy',
      content: {
        'application/json': {
          schema: z.object({
            status: z.string(),
            timestamp: z.string(),
            version: z.string(),
          }),
        },
      },
    },
  },
})

app.openapi(healthRoute, async (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  })
})

// Detailed health check (for monitoring)
const detailedHealthRoute = createRoute({
  method: 'get',
  path: '/detailed',
  tags: ['Health'],
  summary: 'Detailed health check',
  responses: {
    200: {
      description: 'Detailed health information',
      content: {
        'application/json': {
          schema: z.object({
            status: z.string(),
            database: z.string(),
            uptime: z.number(),
            memory: z.object({
              used: z.number(),
              total: z.number(),
            }),
          }),
        },
      },
    },
  },
})

app.openapi(detailedHealthRoute, async (c) => {
  let dbStatus = 'disconnected'

  try {
    await db.execute(sql`SELECT 1`)
    dbStatus = 'connected'
  } catch {
    dbStatus = 'error'
  }

  const memUsage = process.memoryUsage()

  return c.json({
    status: 'ok',
    database: dbStatus,
    uptime: process.uptime(),
    memory: {
      used: memUsage.heapUsed,
      total: memUsage.heapTotal,
    },
  })
})

export { app as healthRoutes }
