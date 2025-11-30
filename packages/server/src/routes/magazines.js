import { Router } from 'express'
import { existsSync, createReadStream } from 'fs'
import { readFile, writeFile, unlink, mkdir, readdir, stat } from 'fs/promises'
import { join, dirname, basename, extname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import db from '../config/database.js'

const require = createRequire(import.meta.url)
const pdf = require('pdf-parse/lib/pdf-parse')
import { authMiddleware, requireAdmin } from '../middleware/auth.js'
import {
  storageClient,
  getSignedUrlForKey,
  streamFromStorage
} from '../config/storage.js'
import {
  generateCacheFilename,
  generateCoverFromPdf,
  PAGES_CACHE_DIR,
  execAsync
} from '../services/media.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = Router()

const MAGAZINE_BASE_PATH = '/Volumes/杂志/杂志/月报更新1'

// Progress tracking for batch operations
let coverGenerationProgress = {
  running: false,
  total: 0,
  processed: 0,
  success: 0,
  failed: 0,
  skipped: 0,
  current: '',
  errors: []
}

let preprocessProgress = { running: false, current: 0, total: 0, currentMagazine: '' }

// Get all magazines
router.get('/', (req, res) => {
  try {
    const { publisher_id, year, search } = req.query
    let query = `
      SELECT m.*, p.name as publisher_name
      FROM magazines m
      JOIN publishers p ON m.publisher_id = p.id
      WHERE 1=1
    `
    const params = []

    if (publisher_id) {
      query += ' AND m.publisher_id = ?'
      params.push(publisher_id)
    }
    if (year !== undefined && year !== null && year !== '') {
      if (year === '0' || year === 0) {
        query += ' AND (m.year IS NULL OR m.year = 0 OR m.year < 1900)'
      } else {
        query += ' AND m.year = ?'
        params.push(year)
      }
    }
    if (search) {
      query += ' AND (m.title LIKE ? OR p.name LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }

    query += ' ORDER BY m.year DESC, m.title'

    const magazines = db.prepare(query).all(...params)
    res.json(magazines)
  } catch (error) {
    console.error('Get magazines error:', error)
    res.status(500).json({ error: 'Failed to fetch magazines' })
  }
})

// Get single magazine
router.get('/:id', (req, res) => {
  try {
    const magazine = db.prepare(`
      SELECT m.*, p.name as publisher_name
      FROM magazines m
      JOIN publishers p ON m.publisher_id = p.id
      WHERE m.id = ?
    `).get(req.params.id)

    if (!magazine) {
      return res.status(404).json({ error: 'Magazine not found' })
    }
    res.json(magazine)
  } catch (error) {
    console.error('Get magazine error:', error)
    res.status(500).json({ error: 'Failed to fetch magazine' })
  }
})

// Get magazine detail with full metadata
router.get('/:id/detail', async (req, res) => {
  try {
    const magazine = db.prepare(`
      SELECT
        m.id,
        m.title,
        m.publisher_id,
        m.year,
        m.file_path,
        m.file_size,
        m.page_count,
        m.cover_url,
        m.author,
        m.description,
        m.publisher_name as pdf_publisher,
        m.language,
        m.publish_date,
        m.metadata_extracted,
        m.metadata_extracted_at,
        m.created_at,
        p.name as publisher_name
      FROM magazines m
      JOIN publishers p ON m.publisher_id = p.id
      WHERE m.id = ?
    `).get(req.params.id)

    if (!magazine) {
      return res.status(404).json({ error: 'Magazine not found' })
    }

    // If page_count is missing, try to get it from PDF
    if (!magazine.page_count && magazine.file_path && existsSync(magazine.file_path)) {
      try {
        const pdfBuffer = await readFile(magazine.file_path)
        const data = await pdf(pdfBuffer, { max: 1 })
        magazine.page_count = data.numpages
        db.prepare('UPDATE magazines SET page_count = ? WHERE id = ?').run(data.numpages, magazine.id)
      } catch (pdfErr) {
        console.error('Failed to get page count:', pdfErr.message)
      }
    }

    // Format response with camelCase for mobile app
    res.json({
      id: magazine.id,
      title: magazine.title,
      publisherId: magazine.publisher_id,
      publisherName: magazine.publisher_name,
      year: magazine.year,
      fileSize: magazine.file_size,
      pageCount: magazine.page_count,
      coverUrl: magazine.cover_url,
      author: magazine.author,
      description: magazine.description,
      pdfPublisher: magazine.pdf_publisher,
      language: magazine.language,
      publishDate: magazine.publish_date,
      metadataExtracted: magazine.metadata_extracted,
      metadataExtractedAt: magazine.metadata_extracted_at,
      createdAt: magazine.created_at
    })
  } catch (error) {
    console.error('Get magazine detail error:', error)
    res.status(500).json({ error: 'Failed to fetch magazine detail' })
  }
})

// Serve PDF file - stream through server to avoid CORS issues
router.get('/:id/pdf', async (req, res) => {
  try {
    const magazine = db.prepare('SELECT file_path, s3_key, title FROM magazines WHERE id = ?').get(req.params.id)
    if (!magazine) {
      return res.status(404).json({ error: 'Magazine not found' })
    }

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(magazine.title || 'magazine')}.pdf"`)
    res.setHeader('Accept-Ranges', 'bytes')

    // Try R2/S3 storage first
    if (storageClient && magazine.s3_key) {
      try {
        const stream = await streamFromStorage(magazine.s3_key)
        if (stream) {
          stream.pipe(res)
          return
        }
      } catch (storageError) {
        console.error('Storage stream error:', storageError.message)
        // Fall through to local file
      }
    }

    // Fallback to local file
    if (magazine.file_path && existsSync(magazine.file_path)) {
      createReadStream(magazine.file_path).pipe(res)
      return
    }

    res.status(404).json({ error: 'PDF file not found' })
  } catch (error) {
    console.error('Serve PDF error:', error)
    res.status(500).json({ error: 'Failed to serve PDF' })
  }
})

// Extract text from a specific page
router.get('/:id/page/:pageNum/text', async (req, res) => {
  try {
    const magazine = db.prepare('SELECT file_path FROM magazines WHERE id = ?').get(req.params.id)
    if (!magazine) {
      return res.status(404).json({ error: 'Magazine not found' })
    }

    const pageNum = parseInt(req.params.pageNum)
    const pdfBuffer = await readFile(magazine.file_path)

    const options = {
      max: pageNum,
      pagerender: (pageData) => {
        if (pageData.pageIndex + 1 === pageNum) {
          return pageData.getTextContent().then(textContent => {
            return textContent.items.map(item => item.str).join(' ')
          })
        }
        return ''
      }
    }

    const data = await pdf(pdfBuffer, options)
    res.json({ page: pageNum, text: data.text, numPages: data.numpages })
  } catch (error) {
    console.error('Extract text error:', error)
    res.status(500).json({ error: 'Failed to extract text' })
  }
})

// Get page count for a magazine
router.get('/:id/info', async (req, res) => {
  try {
    const magazine = db.prepare('SELECT * FROM magazines WHERE id = ?').get(req.params.id)
    if (!magazine) {
      return res.status(404).json({ error: 'Magazine not found' })
    }

    if (!magazine.page_count) {
      const pdfBuffer = await readFile(magazine.file_path)
      const data = await pdf(pdfBuffer, { max: 1 })
      db.prepare('UPDATE magazines SET page_count = ? WHERE id = ?').run(data.numpages, magazine.id)
      magazine.page_count = data.numpages
    }

    res.json(magazine)
  } catch (error) {
    console.error('Get magazine info error:', error)
    res.status(500).json({ error: 'Failed to get magazine info' })
  }
})

// Render PDF page as image
router.get('/:id/page/:pageNum/image', async (req, res) => {
  try {
    const magazine = db.prepare('SELECT file_path, s3_key, title FROM magazines WHERE id = ?').get(req.params.id)
    if (!magazine) {
      return res.status(404).json({ error: 'Magazine not found' })
    }

    const pageNum = parseInt(req.params.pageNum)
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ error: 'Invalid page number' })
    }

    const cacheDir = join(__dirname, '../../cache/pages')
    await mkdir(cacheDir, { recursive: true })

    const cacheBasename = generateCacheFilename(magazine.file_path, magazine.title)
    const cacheKey = `${cacheBasename}_page_${pageNum}.png`
    const cachePath = join(cacheDir, cacheKey)

    if (existsSync(cachePath)) {
      res.setHeader('Content-Type', 'image/png')
      res.setHeader('Cache-Control', 'public, max-age=86400')
      return res.send(await readFile(cachePath))
    }

    let pdfPath = magazine.file_path

    if (storageClient && magazine.s3_key) {
      const tempDir = join(__dirname, '../../cache/temp')
      await mkdir(tempDir, { recursive: true })
      pdfPath = join(tempDir, `${cacheBasename}.pdf`)

      if (!existsSync(pdfPath)) {
        const storageStream = await streamFromStorage(magazine.s3_key)
        const chunks = []
        for await (const chunk of storageStream) {
          chunks.push(chunk)
        }
        await writeFile(pdfPath, Buffer.concat(chunks))
      }
    }

    const outputPrefix = join(cacheDir, `temp_${cacheBasename}_${pageNum}`)

    try {
      await execAsync(`pdftoppm -png -f ${pageNum} -l ${pageNum} -r 150 "${pdfPath}" "${outputPrefix}"`)

      const renderedPath = `${outputPrefix}-${pageNum}.png`

      if (existsSync(renderedPath)) {
        const imageBuffer = await readFile(renderedPath)
        await writeFile(cachePath, imageBuffer)
        await unlink(renderedPath)

        res.setHeader('Content-Type', 'image/png')
        res.setHeader('Cache-Control', 'public, max-age=86400')
        return res.send(imageBuffer)
      }
    } catch (pdfError) {
      console.error('pdftoppm error:', pdfError)
      return res.status(500).json({
        error: 'Failed to render page. Make sure poppler-utils is installed.',
        hint: 'Install with: brew install poppler (macOS) or apt-get install poppler-utils (Linux)'
      })
    }

    res.status(500).json({ error: 'Failed to render page image' })
  } catch (error) {
    console.error('Render page image error:', error)
    res.status(500).json({ error: 'Failed to render page image' })
  }
})

// Scan and import magazines
router.post('/scan', async (req, res) => {
  try {
    const basePath = req.body.path || MAGAZINE_BASE_PATH
    const results = await scanMagazineDirectory(basePath)
    res.json(results)
  } catch (error) {
    console.error('Scan magazines error:', error)
    res.status(500).json({ error: 'Failed to scan magazines' })
  }
})

// Magazine underlines
router.get('/:id/underlines', authMiddleware, (req, res) => {
  try {
    const underlines = db.prepare(`
      SELECT u.*, COUNT(i.id) as idea_count
      FROM magazine_underlines u
      LEFT JOIN magazine_ideas i ON u.id = i.underline_id
      WHERE u.magazine_id = ? AND u.user_id = ?
      GROUP BY u.id
      ORDER BY u.page_number, u.start_offset
    `).all(req.params.id, req.user.id)
    res.json(underlines)
  } catch (error) {
    console.error('Get underlines error:', error)
    res.status(500).json({ error: 'Failed to fetch underlines' })
  }
})

router.post('/:id/underlines', authMiddleware, (req, res) => {
  try {
    const magazineId = req.params.id
    const { text, page_number, start_offset, end_offset } = req.body

    if (!text || page_number === undefined || start_offset === undefined || end_offset === undefined) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const result = db.prepare(`
      INSERT INTO magazine_underlines (magazine_id, user_id, text, page_number, start_offset, end_offset)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(magazineId, req.user.id, text, page_number, start_offset, end_offset)

    const newUnderline = db.prepare('SELECT * FROM magazine_underlines WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(newUnderline)
  } catch (error) {
    console.error('Create underline error:', error)
    res.status(500).json({ error: 'Failed to create underline' })
  }
})

// Generate cover for a single magazine
router.post('/:id/generate-cover', async (req, res) => {
  try {
    const magazine = db.prepare('SELECT * FROM magazines WHERE id = ?').get(req.params.id)
    if (!magazine) {
      return res.status(404).json({ error: 'Magazine not found' })
    }

    if (magazine.cover_url && !req.body.force) {
      return res.json({ message: 'Cover already exists', cover_url: magazine.cover_url })
    }

    console.log(`Generating cover for: ${magazine.title}`)
    const coverUrl = await generateCoverFromPdf(magazine.file_path, magazine.id, magazine.title)

    db.prepare('UPDATE magazines SET cover_url = ? WHERE id = ?').run(coverUrl, magazine.id)

    res.json({ message: 'Cover generated', cover_url: coverUrl })
  } catch (error) {
    console.error('Generate cover error:', error)
    res.status(500).json({ error: 'Failed to generate cover', details: error.message })
  }
})

// Generate covers for all magazines (batch)
router.post('/generate-covers', async (req, res) => {
  if (coverGenerationProgress.running) {
    return res.status(409).json({ error: 'Cover generation already in progress', progress: coverGenerationProgress })
  }

  const { publisher_id, force } = req.body

  let query = 'SELECT * FROM magazines'
  const params = []

  if (publisher_id) {
    query += ' WHERE publisher_id = ?'
    params.push(publisher_id)
  }

  if (!force) {
    query += params.length ? ' AND cover_url IS NULL' : ' WHERE cover_url IS NULL'
  }

  const magazines = db.prepare(query).all(...params)

  coverGenerationProgress = {
    running: true,
    total: magazines.length,
    processed: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    current: '',
    errors: []
  }

  res.json({ message: 'Cover generation started', total: magazines.length })

  ;(async () => {
    for (const magazine of magazines) {
      coverGenerationProgress.current = magazine.title

      try {
        if (magazine.cover_url && !force) {
          coverGenerationProgress.skipped++
          coverGenerationProgress.processed++
          continue
        }

        console.log(`[${coverGenerationProgress.processed + 1}/${magazines.length}] Generating cover for: ${magazine.title}`)
        const coverUrl = await generateCoverFromPdf(magazine.file_path, magazine.id, magazine.title)

        db.prepare('UPDATE magazines SET cover_url = ? WHERE id = ?').run(coverUrl, magazine.id)

        coverGenerationProgress.success++
      } catch (error) {
        console.error(`Failed to generate cover for ${magazine.title}:`, error.message)
        coverGenerationProgress.failed++
        coverGenerationProgress.errors.push({ id: magazine.id, title: magazine.title, error: error.message })
      }

      coverGenerationProgress.processed++
    }

    coverGenerationProgress.running = false
    coverGenerationProgress.current = ''
    console.log('Cover generation complete:', coverGenerationProgress)
  })()
})

router.get('/generate-covers/progress', (req, res) => {
  res.json(coverGenerationProgress)
})

// Preprocess a single magazine
router.post('/:id/preprocess', async (req, res) => {
  try {
    const result = await preprocessMagazine(req.params.id)
    res.json(result)
  } catch (error) {
    console.error('Preprocess error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Preprocess all magazines
router.post('/preprocess-all', async (req, res) => {
  if (preprocessProgress.running) {
    return res.status(409).json({ error: 'Preprocessing already in progress' })
  }

  const { force = false } = req.body || {}

  const magazines = force
    ? db.prepare('SELECT id, title FROM magazines ORDER BY id').all()
    : db.prepare('SELECT id, title FROM magazines WHERE preprocessed = 0 OR preprocessed IS NULL ORDER BY id').all()

  if (magazines.length === 0) {
    return res.json({ message: 'No magazines to preprocess', processed: 0 })
  }

  preprocessProgress = { running: true, current: 0, total: magazines.length, currentMagazine: '' }

  res.json({
    message: `Starting preprocessing of ${magazines.length} magazines`,
    total: magazines.length
  })

  ;(async () => {
    let successCount = 0
    let failCount = 0

    for (const magazine of magazines) {
      preprocessProgress.current++
      preprocessProgress.currentMagazine = magazine.title

      try {
        await preprocessMagazine(magazine.id)
        successCount++
        console.log(`Preprocessed ${preprocessProgress.current}/${magazines.length}: ${magazine.title}`)
      } catch (err) {
        failCount++
        console.error(`Failed to preprocess ${magazine.title}:`, err.message)
      }
    }

    preprocessProgress.running = false
    console.log(`Preprocessing complete: ${successCount} success, ${failCount} failed`)
  })()
})

router.get('/preprocess-all/progress', (req, res) => {
  res.json(preprocessProgress)
})

// Helper: Scan magazine directory
async function scanMagazineDirectory(basePath) {
  const results = { publishers: 0, magazines: 0, errors: [] }

  try {
    const publisherDirs = await readdir(basePath)

    for (const publisherDir of publisherDirs) {
      if (publisherDir.startsWith('.')) continue

      const publisherPath = join(basePath, publisherDir)
      const publisherStat = await stat(publisherPath)
      if (!publisherStat.isDirectory()) continue

      let publisher = db.prepare('SELECT * FROM publishers WHERE name = ?').get(publisherDir)
      if (!publisher) {
        const result = db.prepare('INSERT INTO publishers (name) VALUES (?)').run(publisherDir)
        publisher = { id: result.lastInsertRowid, name: publisherDir }
        results.publishers++
      }

      const files = await readdir(publisherPath)
      for (const file of files) {
        if (!file.toLowerCase().endsWith('.pdf') || file.startsWith('.')) continue

        const filePath = join(publisherPath, file)
        const existing = db.prepare('SELECT id FROM magazines WHERE file_path = ?').get(filePath)
        if (existing) continue

        const title = file.replace('.pdf', '').replace('.PDF', '')
        const yearMatch = title.match(/20\d{2}/)
        const year = yearMatch ? parseInt(yearMatch[0]) : null

        try {
          const fileStat = await stat(filePath)
          db.prepare(`
            INSERT INTO magazines (publisher_id, title, file_path, file_size, year)
            VALUES (?, ?, ?, ?, ?)
          `).run(publisher.id, title, filePath, fileStat.size, year)
          results.magazines++
        } catch (err) {
          results.errors.push({ file: filePath, error: err.message })
        }
      }
    }
  } catch (error) {
    results.errors.push({ path: basePath, error: error.message })
  }

  return results
}

// Helper: Preprocess magazine PDF pages
async function preprocessMagazine(magazineId) {
  const magazine = db.prepare('SELECT * FROM magazines WHERE id = ?').get(magazineId)
  if (!magazine) {
    throw new Error('Magazine not found')
  }

  const cacheBasename = generateCacheFilename(magazine.file_path, magazine.title)
  const cacheDir = join(__dirname, '../../cache/pages')

  let pageCount = magazine.page_count
  let pdfPath = magazine.file_path

  if (storageClient && magazine.s3_key) {
    const tempDir = join(__dirname, '../../cache/temp')
    await mkdir(tempDir, { recursive: true })
    pdfPath = join(tempDir, `${cacheBasename}.pdf`)

    if (!existsSync(pdfPath)) {
      const storageStream = await streamFromStorage(magazine.s3_key)
      const chunks = []
      for await (const chunk of storageStream) {
        chunks.push(chunk)
      }
      await writeFile(pdfPath, Buffer.concat(chunks))
    }
  }

  if (!pageCount) {
    try {
      const { stdout } = await execAsync(`pdfinfo "${pdfPath}" | grep Pages`)
      const match = stdout.match(/Pages:\s*(\d+)/)
      if (match) {
        pageCount = parseInt(match[1])
        db.prepare('UPDATE magazines SET page_count = ? WHERE id = ?').run(pageCount, magazineId)
      }
    } catch (err) {
      console.error('Failed to get page count:', err)
      throw new Error('Failed to get page count from PDF')
    }
  }

  if (!pageCount) {
    throw new Error('Unable to determine page count')
  }

  await mkdir(cacheDir, { recursive: true })
  let cachedPages = 0

  for (let i = 1; i <= pageCount; i++) {
    const cachePath = join(cacheDir, `${cacheBasename}_page_${i}.png`)
    if (existsSync(cachePath)) {
      cachedPages++
    }
  }

  if (cachedPages === pageCount) {
    db.prepare('UPDATE magazines SET preprocessed = 1 WHERE id = ?').run(magazineId)
    console.log(`Magazine ${magazineId} already cached (${pageCount} pages), marked as preprocessed`)
    return { success: true, pages: pageCount, total: pageCount, skipped: true }
  }

  if (!existsSync(pdfPath)) {
    throw new Error('PDF file not found: ' + pdfPath)
  }

  console.log(`Preprocessing magazine ${magazineId}: ${magazine.title} (${pageCount} pages, ${cachedPages} already cached)`)

  const outputPrefix = join(cacheDir, `temp_${cacheBasename}`)

  try {
    await execAsync(`pdftoppm -png -r 150 "${pdfPath}" "${outputPrefix}"`, {
      timeout: 600000,
      maxBuffer: 50 * 1024 * 1024
    })

    let successCount = 0
    for (let i = 1; i <= pageCount; i++) {
      const possibleNames = [
        `${outputPrefix}-${i}.png`,
        `${outputPrefix}-${String(i).padStart(2, '0')}.png`,
        `${outputPrefix}-${String(i).padStart(3, '0')}.png`,
        `${outputPrefix}-${String(i).padStart(4, '0')}.png`
      ]

      const finalPath = join(cacheDir, `${cacheBasename}_page_${i}.png`)

      for (const srcPath of possibleNames) {
        if (existsSync(srcPath)) {
          if (srcPath !== finalPath) {
            const data = await readFile(srcPath)
            await writeFile(finalPath, data)
            await unlink(srcPath)
          }
          successCount++
          break
        }
      }
    }

    console.log(`Preprocessed ${successCount}/${pageCount} pages for magazine ${magazineId}`)

    db.prepare('UPDATE magazines SET preprocessed = 1 WHERE id = ?').run(magazineId)

    return { success: true, pages: successCount, total: pageCount }
  } catch (err) {
    console.error('Preprocessing error:', err)
    throw new Error('Failed to preprocess magazine: ' + err.message)
  }
}

// Magazine underlines - delete
router.delete('/magazine-underlines/:id', authMiddleware, (req, res) => {
  try {
    // Verify ownership before delete
    const underline = db.prepare('SELECT * FROM magazine_underlines WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
    if (!underline) {
      return res.status(404).json({ error: 'Underline not found' })
    }

    // Delete associated ideas first
    db.prepare('DELETE FROM magazine_ideas WHERE underline_id = ?').run(req.params.id)

    // Delete underline
    db.prepare('DELETE FROM magazine_underlines WHERE id = ?').run(req.params.id)
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete underline' })
  }
})

// Magazine ideas
router.get('/magazine-underlines/:id/ideas', authMiddleware, (req, res) => {
  try {
    // Verify ownership of underline
    const underline = db.prepare('SELECT * FROM magazine_underlines WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
    if (!underline) {
      return res.status(404).json({ error: 'Underline not found' })
    }

    const ideas = db.prepare('SELECT * FROM magazine_ideas WHERE underline_id = ? ORDER BY created_at DESC').all(req.params.id)
    res.json(ideas)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ideas' })
  }
})

router.post('/magazine-underlines/:id/ideas', authMiddleware, (req, res) => {
  try {
    const underlineId = req.params.id
    const { content } = req.body

    if (!content) {
      return res.status(400).json({ error: 'Content is required' })
    }

    // Verify ownership of underline
    const underline = db.prepare('SELECT * FROM magazine_underlines WHERE id = ? AND user_id = ?').get(underlineId, req.user.id)
    if (!underline) {
      return res.status(404).json({ error: 'Underline not found' })
    }

    const result = db.prepare('INSERT INTO magazine_ideas (underline_id, user_id, content) VALUES (?, ?, ?)').run(underlineId, req.user.id, content)
    const newIdea = db.prepare('SELECT * FROM magazine_ideas WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(newIdea)
  } catch (error) {
    console.error('Create idea error:', error)
    res.status(500).json({ error: 'Failed to create idea' })
  }
})

router.patch('/magazine-ideas/:id', authMiddleware, (req, res) => {
  try {
    const { content } = req.body

    if (!content) {
      return res.status(400).json({ error: 'Content is required' })
    }

    // Verify ownership
    const idea = db.prepare('SELECT * FROM magazine_ideas WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' })
    }

    db.prepare('UPDATE magazine_ideas SET content = ? WHERE id = ?').run(content, req.params.id)
    const updatedIdea = db.prepare('SELECT * FROM magazine_ideas WHERE id = ?').get(req.params.id)
    res.json(updatedIdea)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update idea' })
  }
})

router.delete('/magazine-ideas/:id', authMiddleware, (req, res) => {
  try {
    // Verify ownership
    const idea = db.prepare('SELECT * FROM magazine_ideas WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' })
    }

    db.prepare('DELETE FROM magazine_ideas WHERE id = ?').run(req.params.id)
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete idea' })
  }
})

export default router
