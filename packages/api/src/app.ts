import { OpenAPIHono } from '@hono/zod-openapi'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { authRoutes } from './routes/auth'
import { ebooksRoutes } from './routes/ebooks'
import { magazinesRoutes } from './routes/magazines'
import { healthRoutes } from './routes/health'
import categoriesRoutes from './routes/categories'
import readingHistoryRoutes from './routes/reading-history'
import coversRoutes from './routes/covers'

// Create OpenAPI-enabled Hono app
const app = new OpenAPIHono()

// Global middleware
app.use('*', logger())
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

// API routes
app.route('/api/auth', authRoutes)
app.route('/api/ebooks', ebooksRoutes)
app.route('/api/magazines', magazinesRoutes)
app.route('/api', categoriesRoutes)
app.route('/api', readingHistoryRoutes)
app.route('/api/r2-covers', coversRoutes)

// OpenAPI documentation endpoint
app.doc('/api/openapi.json', {
  openapi: '3.1.0',
  info: {
    title: 'BookPost API',
    version: '2.0.0',
    description: 'API for BookPost - Personal Content Library',
  },
  servers: [
    { url: 'http://localhost:3001', description: 'Development' },
    { url: 'https://bookpost-api.fly.dev', description: 'Production' },
  ],
})

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'BookPost API',
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
  console.error('Server error:', err)
  return c.json({
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    },
  }, 500)
})

export { app }
