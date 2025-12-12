/**
 * Reading Sessions Routes (requires authentication)
 * Handles reading session start/heartbeat/end for tracking reading duration
 */

import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { readingSessionService } from '../services/readingSession'

const app = new OpenAPIHono()

// Apply auth middleware to all routes
app.use('*', requireAuth)

// Schemas
const StartSessionRequestSchema = z.object({
  bookId: z.number(),
  bookType: z.enum(['ebook', 'magazine', 'audiobook']),
  position: z.string().optional(),
  chapterIndex: z.number().optional(),
  deviceType: z.string().optional(),
  deviceId: z.string().optional(),
})

const StartSessionResponseSchema = z.object({
  data: z.object({
    sessionId: z.number(),
    startTime: z.string(),
  }),
})

const HeartbeatRequestSchema = z.object({
  currentPosition: z.string().optional(),
  chapterIndex: z.number().optional(),
  pagesRead: z.number().optional(),
})

const HeartbeatResponseSchema = z.object({
  data: z.object({
    sessionId: z.number(),
    durationSeconds: z.number(),
    todayDuration: z.number(),
    totalBookDuration: z.number(),
    isPaused: z.boolean(),
  }),
})

const PauseResumeResponseSchema = z.object({
  data: z.object({
    sessionId: z.number(),
    isPaused: z.boolean(),
  }),
})

const EndSessionRequestSchema = z.object({
  endPosition: z.string().optional(),
  chapterIndex: z.number().optional(),
  pagesRead: z.number().optional(),
})

const MilestoneSchema = z.object({
  type: z.string(),
  value: z.number(),
  title: z.string(),
})

const EndSessionResponseSchema = z.object({
  data: z.object({
    sessionId: z.number(),
    durationSeconds: z.number(),
    totalBookDuration: z.number(),
    todayDuration: z.number(),
    milestonesAchieved: z.array(MilestoneSchema),
  }),
})

const ErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})

// POST /api/reading/sessions/start
const startSessionRoute = createRoute({
  method: 'post',
  path: '/sessions/start',
  tags: ['Reading Sessions'],
  summary: 'Start a new reading session',
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: StartSessionRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Session started successfully',
      content: {
        'application/json': {
          schema: StartSessionResponseSchema,
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

app.openapi(startSessionRoute, async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()

  const session = await readingSessionService.startSession({
    userId,
    bookId: body.bookId,
    bookType: body.bookType,
    position: body.position,
    chapterIndex: body.chapterIndex,
    deviceType: body.deviceType,
    deviceId: body.deviceId,
  })

  return c.json({
    data: {
      sessionId: session.id,
      startTime: session.startTime.toISOString(),
    },
  })
})

// POST /api/reading/sessions/:sessionId/heartbeat
const heartbeatRoute = createRoute({
  method: 'post',
  path: '/sessions/{sessionId}/heartbeat',
  tags: ['Reading Sessions'],
  summary: 'Send heartbeat to update reading session',
  security: [{ Bearer: [] }],
  parameters: [
    {
      name: 'sessionId',
      in: 'path',
      required: true,
      schema: { type: 'integer' },
    },
  ],
  request: {
    body: {
      content: {
        'application/json': {
          schema: HeartbeatRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Heartbeat received',
      content: {
        'application/json': {
          schema: HeartbeatResponseSchema,
        },
      },
    },
    400: {
      description: 'Session not found or inactive',
      content: {
        'application/json': {
          schema: ErrorSchema,
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

app.openapi(heartbeatRoute, async (c) => {
  const sessionId = parseInt(c.req.param('sessionId'))
  const body = await c.req.json()

  try {
    const result = await readingSessionService.heartbeat(sessionId, {
      currentPosition: body.currentPosition,
      chapterIndex: body.chapterIndex,
      pagesRead: body.pagesRead,
    })

    return c.json({ data: result })
  } catch (error) {
    return c.json(
      {
        error: {
          code: 'SESSION_ERROR',
          message: error instanceof Error ? error.message : 'Session error',
        },
      },
      400
    )
  }
})

// POST /api/reading/sessions/:sessionId/end
const endSessionRoute = createRoute({
  method: 'post',
  path: '/sessions/{sessionId}/end',
  tags: ['Reading Sessions'],
  summary: 'End a reading session',
  security: [{ Bearer: [] }],
  parameters: [
    {
      name: 'sessionId',
      in: 'path',
      required: true,
      schema: { type: 'integer' },
    },
  ],
  request: {
    body: {
      content: {
        'application/json': {
          schema: EndSessionRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Session ended successfully',
      content: {
        'application/json': {
          schema: EndSessionResponseSchema,
        },
      },
    },
    400: {
      description: 'Session not found',
      content: {
        'application/json': {
          schema: ErrorSchema,
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

app.openapi(endSessionRoute, async (c) => {
  const sessionId = parseInt(c.req.param('sessionId'))
  const body = await c.req.json()

  try {
    const result = await readingSessionService.endSession(sessionId, {
      endPosition: body.endPosition,
      chapterIndex: body.chapterIndex,
      pagesRead: body.pagesRead,
    })

    return c.json({ data: result })
  } catch (error) {
    return c.json(
      {
        error: {
          code: 'SESSION_ERROR',
          message: error instanceof Error ? error.message : 'Session error',
        },
      },
      400
    )
  }
})

// GET /api/reading/sessions/active
const getActiveSessionRoute = createRoute({
  method: 'get',
  path: '/sessions/active',
  tags: ['Reading Sessions'],
  summary: 'Get active reading session for current user',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: 'Active session or null',
      content: {
        'application/json': {
          schema: z.object({
            data: z
              .object({
                sessionId: z.number(),
                bookId: z.number(),
                bookType: z.string(),
                startTime: z.string(),
                durationSeconds: z.number(),
              })
              .nullable(),
          }),
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

app.openapi(getActiveSessionRoute, async (c) => {
  const userId = c.get('userId')
  const session = await readingSessionService.getActiveSession(userId)

  if (!session) {
    return c.json({ data: null })
  }

  const durationSeconds = Math.floor(
    (Date.now() - session.startTime.getTime()) / 1000
  )

  return c.json({
    data: {
      sessionId: session.id,
      bookId: session.bookId,
      bookType: session.bookType,
      startTime: session.startTime.toISOString(),
      durationSeconds,
    },
  })
})

// GET /api/reading/today
const getTodayDurationRoute = createRoute({
  method: 'get',
  path: '/today',
  tags: ['Reading Sessions'],
  summary: "Get today's reading duration",
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: "Today's reading duration in seconds",
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({
              todayDuration: z.number(),
              formattedDuration: z.string(),
            }),
          }),
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

app.openapi(getTodayDurationRoute, async (c) => {
  const userId = c.get('userId')
  const todayDuration = await readingSessionService.getTodayDuration(userId)

  // Format as "Xh Ym"
  const hours = Math.floor(todayDuration / 3600)
  const minutes = Math.floor((todayDuration % 3600) / 60)
  const formattedDuration =
    hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`

  return c.json({
    data: {
      todayDuration,
      formattedDuration,
    },
  })
})

// POST /api/reading/sessions/:sessionId/pause
const pauseSessionRoute = createRoute({
  method: 'post',
  path: '/sessions/{sessionId}/pause',
  tags: ['Reading Sessions'],
  summary: 'Pause a reading session',
  security: [{ Bearer: [] }],
  parameters: [
    {
      name: 'sessionId',
      in: 'path',
      required: true,
      schema: { type: 'integer' },
    },
  ],
  responses: {
    200: {
      description: 'Session paused successfully',
      content: {
        'application/json': {
          schema: PauseResumeResponseSchema,
        },
      },
    },
    400: {
      description: 'Session not found or already paused',
      content: {
        'application/json': {
          schema: ErrorSchema,
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

app.openapi(pauseSessionRoute, async (c) => {
  const sessionId = parseInt(c.req.param('sessionId'))

  try {
    const result = await readingSessionService.pauseSession(sessionId)
    return c.json({ data: result }, 200)
  } catch (error) {
    return c.json(
      {
        error: {
          code: 'SESSION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to pause session',
        },
      },
      400
    )
  }
})

// POST /api/reading/sessions/:sessionId/resume
const resumeSessionRoute = createRoute({
  method: 'post',
  path: '/sessions/{sessionId}/resume',
  tags: ['Reading Sessions'],
  summary: 'Resume a paused reading session',
  security: [{ Bearer: [] }],
  parameters: [
    {
      name: 'sessionId',
      in: 'path',
      required: true,
      schema: { type: 'integer' },
    },
  ],
  responses: {
    200: {
      description: 'Session resumed successfully',
      content: {
        'application/json': {
          schema: PauseResumeResponseSchema,
        },
      },
    },
    400: {
      description: 'Session not found or not paused',
      content: {
        'application/json': {
          schema: ErrorSchema,
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

app.openapi(resumeSessionRoute, async (c) => {
  const sessionId = parseInt(c.req.param('sessionId'))

  try {
    const result = await readingSessionService.resumeSession(sessionId)
    return c.json({ data: result }, 200)
  } catch (error) {
    return c.json(
      {
        error: {
          code: 'SESSION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to resume session',
        },
      },
      400
    )
  }
})

export default app
