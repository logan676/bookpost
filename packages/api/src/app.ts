import { OpenAPIHono } from '@hono/zod-openapi'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { log } from './utils/logger'
import { authRoutes } from './routes/auth'
import { ebooksRoutes } from './routes/ebooks'
import { magazinesRoutes } from './routes/magazines'
import { audioRoutes } from './routes/audio'
import { healthRoutes } from './routes/health'
import { notesRoutes } from './routes/notes'
import { booksRoutes } from './routes/books'
import { aiRoutes } from './routes/ai'
import { bookDetailRoutes } from './routes/book-detail'
import categoriesRoutes from './routes/categories'
import readingHistoryRoutes from './routes/reading-history'
import coversRoutes from './routes/covers'
import readingSessionsRoutes from './routes/reading-sessions'
import readingStatsRoutes from './routes/reading-stats'
import badgesRoutes from './routes/badges'
import socialRoutes from './routes/social'

// Create OpenAPI-enabled Hono app
const app = new OpenAPIHono()

// Custom logging middleware using our unified logger
app.use('*', async (c, next) => {
  const start = Date.now()
  const method = c.req.method
  const path = c.req.path

  // Log request
  log.request(method, path)

  await next()

  // Log response
  const duration = Date.now() - start
  log.response(method, path, c.res.status, duration)
})

// Global middleware
app.use('*', secureHeaders())
app.use('*', cors({
  origin: [
    'http://localhost:5173',      // Web dev
    'http://localhost:3000',      // Alternative web dev
    'https://bookpost.vercel.app', // Production web
  ],
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Health check (no auth required)
app.route('/api/health', healthRoutes)

// Public routes (no auth required) - must be before routes with auth middleware
app.route('/api/r2-covers', coversRoutes)
app.route('/api/covers', coversRoutes)  // Legacy covers route

// API routes
app.route('/api/auth', authRoutes)
app.route('/api/ebooks', ebooksRoutes)
app.route('/api/magazines', magazinesRoutes)
app.route('/api/book-detail', bookDetailRoutes)
app.route('/api/audio-series', audioRoutes)
app.route('/api/audio', audioRoutes)
app.route('/api/ai', aiRoutes)  // Must be before routes mounted at /api that use global auth middleware
app.route('/api/notes', notesRoutes)
app.route('/api/books', booksRoutes)
app.route('/api', categoriesRoutes)
app.route('/api', readingHistoryRoutes)
app.route('/api/reading', readingSessionsRoutes)
app.route('/api/user', readingStatsRoutes)
app.route('/api/user', badgesRoutes)
app.route('/api/badges', badgesRoutes)
app.route('/api/social', readingStatsRoutes)
app.route('/api/social', socialRoutes)

// OpenAPI documentation endpoint
app.doc('/api/openapi.json', {
  openapi: '3.1.0',
  info: {
    title: 'BookLibrio API',
    version: '2.0.0',
    description: 'API for BookLibrio - Your Personal Digital Library',
  },
  servers: [
    { url: 'http://localhost:3001', description: 'Development' },
    { url: 'https://booklibrio-api.fly.dev', description: 'Production' },
  ],
})

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'BookLibrio API',
    version: '2.0.0',
    docs: '/api/openapi.json',
  })
})

// 404 handler
app.notFound((c) => {
  return c.json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${c.req.path} not found`,
    },
  }, 404)
})

// Error handler
app.onError((err, c) => {
  log.e(`Server error on ${c.req.method} ${c.req.path}`, err)
  return c.json({
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    },
  }, 500)
})

export { app }
