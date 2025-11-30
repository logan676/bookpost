import { Router } from 'express'
import { existsSync, createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { join, extname, dirname } from 'path'
import { fileURLToPath } from 'url'
import db from '../config/database.js'
import { authMiddleware, requireAdmin } from '../middleware/auth.js'
import {
  listStorageObjects,
  checkStorageObjectExists,
  streamFromStorageWithRange,
  streamFromStorage,
  uploadLargeFileToStorage,
  localPathToStorageKey,
  storageClient,
  useR2Storage,
  r2BucketName,
  r2PublicUrl,
  useS3Storage
} from '../config/storage.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = Router()

// Simple in-memory cache for cover images to avoid hammering R2
const coverCache = new Map()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour
const MAX_CACHE_SIZE = 500

// Pending requests to deduplicate concurrent requests for the same cover
const pendingRequests = new Map()

// Helper to fetch cover data with caching
async function fetchCoverData(r2Key, type, filename, localCoversDir) {
  const cacheKey = r2Key

  // Check memory cache first
  const cached = coverCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  // Check if there's already a pending request for this cover
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey)
  }

  // Create a new fetch promise
  const fetchPromise = (async () => {
    // Try R2 storage
    if (storageClient) {
      try {
        const exists = await checkStorageObjectExists(r2Key)
        if (exists) {
          return { source: 'r2', key: r2Key }
        }
      } catch (r2Error) {
        console.error(`[Cover] R2 error for ${r2Key}:`, r2Error.message)
      }
    }

    // Fallback to local covers directory
    const localPath = join(localCoversDir, type, filename)
    if (existsSync(localPath)) {
      return { source: 'local', path: localPath }
    }

    return null
  })()

  pendingRequests.set(cacheKey, fetchPromise)

  try {
    const result = await fetchPromise

    // Cache the result
    if (coverCache.size >= MAX_CACHE_SIZE) {
      // Remove oldest entry
      const oldestKey = coverCache.keys().next().value
      coverCache.delete(oldestKey)
    }
    coverCache.set(cacheKey, { data: result, timestamp: Date.now() })

    return result
  } finally {
    pendingRequests.delete(cacheKey)
  }
}

// Serve R2 cloud cover images
router.get('/covers/:type/:filename', async (req, res) => {
  try {
    const { type, filename } = req.params

    if (!['magazines', 'ebooks'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type' })
    }

    const r2Key = `covers/${type}/${filename}`
    const localCoversDir = join(__dirname, '../../covers')

    const coverData = await fetchCoverData(r2Key, type, filename, localCoversDir)

    if (!coverData) {
      return res.status(404).json({ error: 'Cover not found' })
    }

    res.set('Content-Type', 'image/jpeg')
    res.set('Cache-Control', 'public, max-age=86400') // Cache for 1 day

    if (coverData.source === 'r2') {
      const stream = await streamFromStorage(coverData.key)
      stream.pipe(res)
    } else {
      createReadStream(coverData.path).pipe(res)
    }
  } catch (error) {
    console.error('Serve cover error:', error)
    res.status(500).json({ error: 'Failed to serve cover' })
  }
})

// Get R2 status
router.get('/status', authMiddleware, requireAdmin, async (req, res) => {
  try {
    res.json({
      enabled: useR2Storage,
      bucket: r2BucketName,
      publicUrl: r2PublicUrl || null,
      s3Fallback: useS3Storage
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get R2 status' })
  }
})

// List objects in R2 bucket
router.get('/objects', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { prefix = '', limit = 100 } = req.query
    const objects = await listStorageObjects(prefix, parseInt(limit))
    res.json({
      objects: objects.map(obj => ({
        key: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified
      })),
      count: objects.length
    })
  } catch (error) {
    console.error('R2 list error:', error)
    res.status(500).json({ error: 'Failed to list R2 objects' })
  }
})

// Generic R2 streaming endpoint (with local fallback)
router.get('/stream/:category/*', async (req, res) => {
  try {
    const { category } = req.params
    const filePath = req.params[0]
    const r2Key = `${category}/${filePath}`

    // Try R2 first
    if (storageClient) {
      try {
        const exists = await checkStorageObjectExists(r2Key)
        if (exists) {
          const result = await streamFromStorageWithRange(r2Key, req.headers.range)
          res.writeHead(result.statusCode, result.headers)
          result.stream.pipe(res)
          return
        }
      } catch (r2Error) {
        console.log(`[R2 Stream] R2 not available for ${r2Key}, trying local`)
      }
    }

    // Fallback to local file
    const basePaths = {
      magazines: process.env.MAGAZINES_FOLDER || '/Volumes/T9/杂志',
      ebooks: process.env.EBOOKS_FOLDER || '/Volumes/T9/电子书',
      audio: process.env.AUDIO_FOLDER || '/Volumes/T9/音频',
      lectures: '/Volumes/三星移动硬盘/公开课',
      speeches: '/Volumes/三星移动硬盘/演讲',
      movies: '/Volumes/CN/大陆电影',
      nba: process.env.NBA_FOLDER || '/Volumes/T9/NBA',
      tvshows: process.env.TVSHOWS_FOLDER || '/Volumes/美剧',
      animation: process.env.ANIMATION_FOLDER || '/Volumes/动画',
      documentaries: process.env.DOCUMENTARIES_FOLDER || '/Volumes/纪录片'
    }

    const basePath = basePaths[category]
    if (!basePath) {
      return res.status(400).json({ error: 'Invalid category' })
    }

    const localPath = join(basePath, filePath)
    if (!existsSync(localPath)) {
      return res.status(404).json({ error: 'File not found' })
    }

    const fileStat = await stat(localPath)
    const fileSize = fileStat.size
    const ext = extname(localPath).toLowerCase()

    const contentTypes = {
      '.mp4': 'video/mp4', '.mkv': 'video/x-matroska', '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime', '.webm': 'video/webm', '.ts': 'video/mp2t',
      '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav',
      '.flac': 'audio/flac', '.aac': 'audio/aac', '.ogg': 'audio/ogg',
      '.pdf': 'application/pdf', '.epub': 'application/epub+zip'
    }
    const contentType = contentTypes[ext] || 'application/octet-stream'

    if (req.headers.range) {
      const parts = req.headers.range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunkSize = end - start + 1

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType
      })
      createReadStream(localPath, { start, end }).pipe(res)
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType
      })
      createReadStream(localPath).pipe(res)
    }
  } catch (error) {
    console.error('R2 stream error:', error)
    res.status(500).json({ error: 'Failed to stream file' })
  }
})

// Upload a file to R2 (admin only)
router.post('/upload', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { localPath, category, customKey } = req.body

    if (!localPath || !category) {
      return res.status(400).json({ error: 'localPath and category are required' })
    }

    if (!existsSync(localPath)) {
      return res.status(404).json({ error: 'Local file not found' })
    }

    const key = customKey || localPathToStorageKey(localPath, category)
    const ext = extname(localPath).toLowerCase()
    const contentTypes = {
      '.mp4': 'video/mp4', '.mkv': 'video/x-matroska', '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime', '.webm': 'video/webm', '.ts': 'video/mp2t',
      '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav',
      '.flac': 'audio/flac', '.pdf': 'application/pdf', '.epub': 'application/epub+zip'
    }
    const contentType = contentTypes[ext] || 'application/octet-stream'

    const result = await uploadLargeFileToStorage(localPath, key, contentType)
    res.json({ success: true, key, result })
  } catch (error) {
    console.error('R2 upload error:', error)
    res.status(500).json({ error: 'Failed to upload to R2' })
  }
})

// Batch migration endpoint
router.post('/migrate', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { category, limit = 10, dryRun = true } = req.body

    if (!category) {
      return res.status(400).json({ error: 'category is required' })
    }

    const tables = {
      audio: { table: 'audio_files', pathCol: 'file_path', keyCol: 'r2_key' },
      lectures: { table: 'lecture_videos', pathCol: 'file_path', keyCol: 'r2_key' },
      speeches: { table: 'speech_videos', pathCol: 'file_path', keyCol: 'r2_key' },
      movies: { table: 'movies', pathCol: 'file_path', keyCol: 'r2_key' },
      nba: { table: 'nba_games', pathCol: 'file_path', keyCol: 'r2_key' },
      magazines: { table: 'magazines', pathCol: 'file_path', keyCol: 's3_key' },
      tvshows: { table: 'tvshow_episodes', pathCol: 'file_path', keyCol: 'r2_key' },
      animation: { table: 'animation_episodes', pathCol: 'file_path', keyCol: 'r2_key' },
      documentaries: { table: 'documentary_episodes', pathCol: 'file_path', keyCol: 'r2_key' }
    }

    const config = tables[category]
    if (!config) {
      return res.status(400).json({ error: 'Invalid category' })
    }

    try {
      db.exec(`ALTER TABLE ${config.table} ADD COLUMN r2_key TEXT`)
    } catch {
      // Column already exists
    }

    const files = db.prepare(`
      SELECT id, ${config.pathCol} as file_path
      FROM ${config.table}
      WHERE (${config.keyCol} IS NULL OR ${config.keyCol} = '')
      AND ${config.pathCol} IS NOT NULL
      LIMIT ?
    `).all(limit)

    if (dryRun) {
      return res.json({
        dryRun: true,
        category,
        filesToMigrate: files.length,
        files: files.map(f => ({
          id: f.id,
          localPath: f.file_path,
          r2Key: localPathToStorageKey(f.file_path, category)
        }))
      })
    }

    const results = []
    for (const file of files) {
      try {
        if (!existsSync(file.file_path)) {
          results.push({ id: file.id, status: 'skipped', reason: 'File not found' })
          continue
        }

        const key = localPathToStorageKey(file.file_path, category)
        const ext = extname(file.file_path).toLowerCase()
        const contentTypes = {
          '.mp4': 'video/mp4', '.mkv': 'video/x-matroska',
          '.mp3': 'audio/mpeg', '.pdf': 'application/pdf'
        }
        const contentType = contentTypes[ext] || 'application/octet-stream'

        await uploadLargeFileToStorage(file.file_path, key, contentType)
        db.prepare(`UPDATE ${config.table} SET ${config.keyCol} = ? WHERE id = ?`).run(key, file.id)
        results.push({ id: file.id, status: 'success', key })
      } catch (err) {
        results.push({ id: file.id, status: 'error', error: err.message })
      }
    }

    res.json({
      category,
      migrated: results.filter(r => r.status === 'success').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      errors: results.filter(r => r.status === 'error').length,
      results
    })
  } catch (error) {
    console.error('R2 migration error:', error)
    res.status(500).json({ error: 'Failed to migrate to R2' })
  }
})

// Get migration progress for all categories
router.get('/migration-status', authMiddleware, requireAdmin, (req, res) => {
  try {
    const categories = [
      { name: 'audio', table: 'audio_files', keyCol: 'r2_key' },
      { name: 'lectures', table: 'lecture_videos', keyCol: 'r2_key' },
      { name: 'speeches', table: 'speech_videos', keyCol: 'r2_key' },
      { name: 'movies', table: 'movies', keyCol: 'r2_key' },
      { name: 'nba', table: 'nba_games', keyCol: 'r2_key' },
      { name: 'magazines', table: 'magazines', keyCol: 's3_key' }
    ]

    const status = categories.map(cat => {
      try {
        const total = db.prepare(`SELECT COUNT(*) as count FROM ${cat.table}`).get().count
        let migrated = 0
        try {
          migrated = db.prepare(`SELECT COUNT(*) as count FROM ${cat.table} WHERE ${cat.keyCol} IS NOT NULL AND ${cat.keyCol} != ''`).get().count
        } catch {
          // Column might not exist yet
        }
        return {
          category: cat.name,
          total,
          migrated,
          remaining: total - migrated,
          progress: total > 0 ? Math.round((migrated / total) * 100) : 0
        }
      } catch {
        return { category: cat.name, error: 'Table not found' }
      }
    })

    res.json({ status, r2Enabled: useR2Storage })
  } catch (error) {
    console.error('Migration status error:', error)
    res.status(500).json({ error: 'Failed to get migration status' })
  }
})

export default router
