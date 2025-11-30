import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Config
import db from './config/database.js'
import { streamFromStorage } from './config/storage.js'
import { runMigrations } from './config/migrations.js'
import { env, logEnvironmentStatus } from './config/env.js'

// Middleware
import { authMiddleware } from './middleware/index.js'
import { errorHandler } from './utils/response.js'
import { securityMiddleware } from './middleware/security.js'
import { apiLimiter, authLimiter } from './middleware/rateLimiter.js'

// Logging
import { logger, httpLogger } from './utils/logger.js'

// Routes
import { mountRoutes } from './routes/index.js'
import healthRouter from './routes/health.js'

// Startup services
import { startBackgroundCoverGeneration } from './services/startup.js'
import { startAllExtractions } from './services/backgroundTaskQueue.js'

// Scan functions from routes
import { scanNBAFolder } from './routes/nba.js'
import { scanAudioFolders } from './routes/audio.js'
import { scanLecturesFolder } from './routes/lectures.js'
import { scanSpeechesFolder } from './routes/speeches.js'
import { scanMoviesFolder } from './routes/movies.js'
import { scanTVShowsFolder } from './routes/tvshows.js'
import { scanDocumentariesFolder } from './routes/documentaries.js'
import { scanAnimationFolder } from './routes/animation.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '../../../.env') })

// Log environment configuration
logEnvironmentStatus()

// Run database migrations
runMigrations()

const app = express()
const PORT = env.PORT

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1)

// Security middleware (helmet, hpp, compression, request ID)
securityMiddleware.forEach(middleware => app.use(middleware))

// CORS configuration
app.use(cors({
  origin: true,
  credentials: true
}))

// Body parsing
app.use(express.json({ limit: '50mb' }))

// HTTP logging
app.use(httpLogger)

// Rate limiting for API routes
app.use('/api/', apiLimiter)
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)

// Auth middleware for all routes
app.use(authMiddleware)

// Serve static cover images
app.use('/api/covers', express.static(join(__dirname, '../covers')))
app.use('/api/magazine-covers', express.static(join(__dirname, '../covers/magazines')))
app.use('/api/ebook-covers', express.static(join(__dirname, '../covers/ebooks')))

// Serve R2 cloud cover images (for legacy URLs stored in database)
app.get('/api/r2-covers/:type/:filename', async (req, res) => {
  try {
    const { type, filename } = req.params

    if (!['magazines', 'ebooks'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type' })
    }

    const r2Key = `covers/${type}/${filename}`

    // Try R2 storage first
    try {
      const stream = await streamFromStorage(r2Key)
      if (stream) {
        res.set('Content-Type', 'image/jpeg')
        res.set('Cache-Control', 'public, max-age=86400')
        stream.pipe(res)
        return
      }
    } catch (r2Error) {
      // R2 not available or file not found, try local
    }

    // Fallback to local covers directory
    const localPath = join(__dirname, '../covers', type, filename)
    const { existsSync, createReadStream } = await import('fs')
    if (existsSync(localPath)) {
      res.set('Content-Type', 'image/jpeg')
      res.set('Cache-Control', 'public, max-age=86400')
      createReadStream(localPath).pipe(res)
      return
    }

    res.status(404).json({ error: 'Cover not found' })
  } catch (error) {
    console.error('Serve R2 cover error:', error)
    res.status(500).json({ error: 'Failed to serve cover' })
  }
})

// R2 storage stream proxy endpoint
app.get('/api/r2-stream/:key(*)', async (req, res) => {
  try {
    const stream = await streamFromStorage(req.params.key)
    if (!stream) {
      return res.status(404).json({ error: 'File not found' })
    }
    stream.pipe(res)
  } catch (error) {
    console.error('R2 stream error:', error)
    res.status(500).json({ error: 'Failed to stream file' })
  }
})

// Mount all routes
mountRoutes(app)

// Health check endpoints
app.use('/api/health', healthRouter)

// Global error handling middleware
app.use(errorHandler)

// Start server
app.listen(PORT, () => {
  logger.info({ port: PORT }, `BookPost server running on http://localhost:${PORT}`)

  // Start background cover generation after 5 seconds
  setTimeout(() => {
    startBackgroundCoverGeneration()
  }, 5000)

  // Start NBA folder scan after 3 seconds
  setTimeout(() => {
    scanNBAFolder().catch(err => console.error('[NBA Scan] Error:', err))
  }, 3000)

  // Start Audio folder scan after 4 seconds
  setTimeout(() => {
    scanAudioFolders().catch(err => console.error('[Audio Scan] Error:', err))
  }, 4000)

  // Start Lectures folder scan after 5 seconds
  setTimeout(() => {
    scanLecturesFolder().catch(err => console.error('[Lectures Scan] Error:', err))
  }, 5000)

  // Start Speeches folder scan after 6 seconds
  setTimeout(() => {
    scanSpeechesFolder().catch(err => console.error('[Speeches Scan] Error:', err))
  }, 6000)

  // Start Movies folder scan after 7 seconds
  setTimeout(() => {
    scanMoviesFolder().catch(err => console.error('[Movies Scan] Error:', err))
  }, 7000)

  // Start TV Shows folder scan after 8 seconds
  setTimeout(() => {
    scanTVShowsFolder().catch(err => console.error('[TV Shows Scan] Error:', err))
  }, 8000)

  // Start Documentaries folder scan after 9 seconds
  setTimeout(() => {
    scanDocumentariesFolder().catch(err => console.error('[Documentaries Scan] Error:', err))
  }, 9000)

  // Start Animation folder scan after 10 seconds
  setTimeout(() => {
    scanAnimationFolder().catch(err => console.error('[Animation Scan] Error:', err))
  }, 10000)

  // Start background metadata extraction for ebooks and magazines after 15 seconds
  setTimeout(() => {
    startAllExtractions().catch(err => console.error('[Metadata Extraction] Error:', err))
  }, 15000)
})
