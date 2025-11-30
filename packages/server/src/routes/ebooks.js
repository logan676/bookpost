import { Router } from 'express'
import { existsSync } from 'fs'
import { readFile, writeFile, unlink, readdir, stat } from 'fs/promises'
import { join, dirname, basename, extname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import db from '../config/database.js'

const require = createRequire(import.meta.url)
const pdf = require('pdf-parse/lib/pdf-parse')
const EPub = require('epub')
import { authMiddleware, requireAuth, requireAdmin } from '../middleware/auth.js'
import {
  storageClient,
  streamFromStorage,
  downloadFromStorage
} from '../config/storage.js'
import { generateEbookCover } from '../services/media.js'
import {
  startMetadataExtraction,
  extractSingleEbookMetadata,
  getExtractionProgress
} from '../services/metadataExtractor.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = Router()

const EBOOKS_BASE_PATH = '/Volumes/杂志/【基础版】英文书单2024年全年更新'

// Progress tracking for batch operations
let ebookCoverProgress = {
  running: false,
  total: 0,
  processed: 0,
  success: 0,
  failed: 0,
  skipped: 0,
  current: ''
}

// Normalize title for deduplication
function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]/g, '')
    .trim()
}

// Helper function to parse EPUB file
function parseEpub(filePath) {
  return new Promise((resolve, reject) => {
    const epub = new EPub(filePath)
    epub.on('end', () => {
      resolve(epub)
    })
    epub.on('error', reject)
    epub.parse()
  })
}

// Helper function to get EPUB chapter content
function getEpubChapter(epub, chapterId) {
  return new Promise((resolve, reject) => {
    epub.getChapter(chapterId, (err, text) => {
      if (err) reject(err)
      else resolve(text)
    })
  })
}

// Clear all ebooks
router.delete('/clear', async (req, res) => {
  try {
    const result = db.prepare('DELETE FROM ebooks').run()
    db.prepare('DELETE FROM ebook_categories').run()
    console.log(`[Clear] Deleted ${result.changes} ebooks`)
    res.json({ message: `Deleted ${result.changes} ebooks`, deleted: result.changes })
  } catch (error) {
    console.error('Clear ebooks error:', error)
    res.status(500).json({ error: 'Failed to clear ebooks' })
  }
})

// Scan ebooks endpoint
router.post('/scan', async (req, res) => {
  try {
    const results = await scanEbooksDirectory()
    res.json(results)
  } catch (error) {
    console.error('Scan ebooks error:', error)
    res.status(500).json({ error: 'Failed to scan ebooks directory' })
  }
})

// Update ebook R2 keys
router.post('/update-r2-keys', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const ebooksBasePath = '/Volumes/杂志/【基础版】英文书单2024年全年更新'
    const ebooks = db.prepare('SELECT id, file_path FROM ebooks WHERE s3_key IS NULL OR s3_key = ""').all()

    let updated = 0
    let errors = 0

    for (const ebook of ebooks) {
      try {
        if (ebook.file_path.startsWith(ebooksBasePath)) {
          const relativePath = ebook.file_path.slice(ebooksBasePath.length + 1)
          const r2Key = `ebooks/${relativePath}`

          db.prepare('UPDATE ebooks SET s3_key = ? WHERE id = ?').run(r2Key, ebook.id)
          updated++
        }
      } catch (err) {
        errors++
      }
    }

    res.json({ updated, errors, total: ebooks.length })
  } catch (error) {
    console.error('Update ebook R2 keys error:', error)
    res.status(500).json({ error: 'Failed to update R2 keys' })
  }
})

// Rescan ebooks
router.post('/rescan', async (req, res) => {
  try {
    const deleteResult = db.prepare('DELETE FROM ebooks').run()
    db.prepare('DELETE FROM ebook_categories').run()
    console.log(`[Rescan] Deleted ${deleteResult.changes} old ebooks`)

    const results = await scanEbooksDirectory()
    results.deleted = deleteResult.changes
    res.json(results)
  } catch (error) {
    console.error('Rescan ebooks error:', error)
    res.status(500).json({ error: 'Failed to rescan ebooks directory' })
  }
})

// Get all ebook categories
router.get('/categories', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT ec.*, COUNT(e.id) as ebook_count
      FROM ebook_categories ec
      LEFT JOIN ebooks e ON ec.id = e.category_id
      GROUP BY ec.id
      ORDER BY ec.name
    `).all()
    res.json(categories)
  } catch (error) {
    console.error('Get ebook categories error:', error)
    res.status(500).json({ error: 'Failed to fetch ebook categories' })
  }
})

// Get ebooks by category
router.get('/', (req, res) => {
  try {
    const { category_id, search } = req.query
    let query = 'SELECT * FROM ebooks WHERE 1=1'
    const params = []

    if (category_id) {
      query += ' AND category_id = ?'
      params.push(category_id)
    }

    if (search) {
      query += ' AND title LIKE ?'
      params.push(`%${search}%`)
    }

    query += ' ORDER BY title'

    const ebooks = db.prepare(query).all(...params)
    res.json(ebooks)
  } catch (error) {
    console.error('Get ebooks error:', error)
    res.status(500).json({ error: 'Failed to fetch ebooks' })
  }
})

// Get single ebook
router.get('/:id', (req, res) => {
  try {
    const ebook = db.prepare('SELECT * FROM ebooks WHERE id = ?').get(req.params.id)
    if (!ebook) {
      return res.status(404).json({ error: 'Ebook not found' })
    }
    res.json(ebook)
  } catch (error) {
    console.error('Get ebook error:', error)
    res.status(500).json({ error: 'Failed to fetch ebook' })
  }
})

// Generate cover for single ebook
router.post('/:id/generate-cover', async (req, res) => {
  try {
    const ebook = db.prepare('SELECT * FROM ebooks WHERE id = ?').get(req.params.id)
    if (!ebook) {
      return res.status(404).json({ error: 'Ebook not found' })
    }

    const coverUrl = await generateEbookCover(ebook.file_path, ebook.id, ebook.title)
    db.prepare('UPDATE ebooks SET cover_url = ? WHERE id = ?').run(coverUrl, ebook.id)

    res.json({ success: true, cover_url: coverUrl })
  } catch (error) {
    console.error('Generate ebook cover error:', error)
    res.status(500).json({ error: 'Failed to generate cover' })
  }
})

// Batch generate ebook covers
router.post('/generate-covers', async (req, res) => {
  if (ebookCoverProgress.running) {
    return res.status(409).json({
      error: 'Cover generation already in progress',
      progress: ebookCoverProgress
    })
  }

  const { category_id } = req.body

  let query = 'SELECT * FROM ebooks WHERE cover_url IS NULL'
  const params = []
  if (category_id) {
    query += ' AND category_id = ?'
    params.push(category_id)
  }

  const ebooks = db.prepare(query).all(...params)

  if (ebooks.length === 0) {
    return res.json({ message: 'All ebooks already have covers', total: 0 })
  }

  ebookCoverProgress = {
    running: true,
    total: ebooks.length,
    processed: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    current: ''
  }

  res.json({ message: 'Cover generation started', total: ebooks.length })

  ;(async () => {
    for (const ebook of ebooks) {
      ebookCoverProgress.current = ebook.title

      try {
        await stat(ebook.file_path)

        const coverUrl = await generateEbookCover(ebook.file_path, ebook.id, ebook.title)
        db.prepare('UPDATE ebooks SET cover_url = ? WHERE id = ?').run(coverUrl, ebook.id)
        ebookCoverProgress.success++
      } catch (error) {
        console.error(`Failed to generate cover for ${ebook.title}:`, error.message)
        ebookCoverProgress.failed++
      }

      ebookCoverProgress.processed++
    }

    ebookCoverProgress.running = false
    ebookCoverProgress.current = ''
    console.log('Ebook cover generation complete:', ebookCoverProgress)
  })()
})

router.get('/generate-covers/progress', (req, res) => {
  res.json(ebookCoverProgress)
})

// ============================================
// Metadata Extraction Endpoints
// ============================================

// Start batch metadata extraction
router.post('/extract-metadata', authMiddleware, requireAdmin, async (req, res) => {
  const { limit, forceReextract } = req.body

  try {
    const progress = await startMetadataExtraction({ limit, forceReextract })
    res.json({
      message: progress.running ? 'Metadata extraction started' : 'Metadata extraction already running',
      progress
    })
  } catch (error) {
    console.error('Start metadata extraction error:', error)
    res.status(500).json({ error: 'Failed to start metadata extraction' })
  }
})

// Get metadata extraction progress
router.get('/extract-metadata/progress', (req, res) => {
  res.json(getExtractionProgress())
})

// Extract metadata for single ebook
router.post('/:id/extract-metadata', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const ebook = db.prepare('SELECT * FROM ebooks WHERE id = ?').get(req.params.id)
    if (!ebook) {
      return res.status(404).json({ error: 'Ebook not found' })
    }

    const metadata = await extractSingleEbookMetadata(req.params.id)
    res.json({ success: true, metadata })
  } catch (error) {
    console.error('Extract single ebook metadata error:', error)
    res.status(500).json({ error: error.message || 'Failed to extract metadata' })
  }
})

// Get ebook detail with full metadata
router.get('/:id/detail', (req, res) => {
  try {
    const ebook = db.prepare(`
      SELECT
        e.*,
        ec.name as category_name
      FROM ebooks e
      LEFT JOIN ebook_categories ec ON e.category_id = ec.id
      WHERE e.id = ?
    `).get(req.params.id)

    if (!ebook) {
      return res.status(404).json({ error: 'Ebook not found' })
    }

    // Parse TOC JSON if available
    let toc = []
    if (ebook.toc_json) {
      try {
        toc = JSON.parse(ebook.toc_json)
      } catch (e) {
        console.error('Failed to parse toc_json:', e)
      }
    }

    res.json({
      id: ebook.id,
      title: ebook.title,
      author: ebook.author,
      description: ebook.description,
      publisher: ebook.publisher,
      language: ebook.language,
      isbn: ebook.isbn,
      publishDate: ebook.publish_date,
      pageCount: ebook.page_count,
      chapterCount: ebook.chapter_count,
      toc,
      coverUrl: ebook.cover_url,
      fileType: ebook.file_type,
      fileSize: ebook.file_size,
      categoryId: ebook.category_id,
      categoryName: ebook.category_name,
      metadataExtracted: ebook.metadata_extracted === 1,
      metadataExtractedAt: ebook.metadata_extracted_at,
      createdAt: ebook.created_at
    })
  } catch (error) {
    console.error('Get ebook detail error:', error)
    res.status(500).json({ error: 'Failed to fetch ebook detail' })
  }
})

// Serve ebook file
router.get('/:id/file', async (req, res) => {
  try {
    const ebook = db.prepare('SELECT *, s3_key FROM ebooks WHERE id = ?').get(req.params.id)
    if (!ebook) {
      return res.status(404).json({ error: 'Ebook not found' })
    }

    if (storageClient && ebook.s3_key) {
      try {
        const stream = await streamFromStorage(ebook.s3_key)
        if (!stream) {
          return res.status(500).json({ error: 'Failed to stream ebook from storage' })
        }

        const ext = extname(ebook.file_path).toLowerCase()
        const contentType = ext === '.epub' ? 'application/epub+zip' : 'application/pdf'

        res.setHeader('Content-Type', contentType)
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(ebook.title)}${ext}"`)

        stream.pipe(res)
        return
      } catch (r2Error) {
        console.error(`[Ebook] R2 error for ${ebook.s3_key}:`, r2Error.message)
        return res.status(500).json({ error: 'Failed to access ebook from storage' })
      }
    }

    res.status(404).json({ error: 'Ebook not available in cloud storage' })
  } catch (error) {
    console.error('Serve ebook file error:', error)
    res.status(500).json({ error: 'Failed to serve ebook file' })
  }
})

// Get ebook text content
router.get('/:id/text', async (req, res) => {
  try {
    const ebook = db.prepare('SELECT *, s3_key FROM ebooks WHERE id = ?').get(req.params.id)
    if (!ebook) {
      return res.status(404).json({ error: 'Ebook not found' })
    }

    const fileExt = extname(ebook.file_path).toLowerCase()

    // Handle EPUB files
    if (fileExt === '.epub') {
      let tempFile = null

      if (!storageClient || !ebook.s3_key) {
        return res.status(404).json({ error: 'Ebook not available in cloud storage' })
      }

      const epubBuffer = await downloadFromStorage(ebook.s3_key)
      if (!epubBuffer) {
        return res.status(500).json({ error: 'Failed to download ebook from storage' })
      }

      tempFile = join(__dirname, `temp_${ebook.id}.epub`)
      await writeFile(tempFile, epubBuffer)
      const epubPath = tempFile

      try {
        const epub = await parseEpub(epubPath)
        const chapters = []

        const flow = epub.flow || []

        for (let i = 0; i < flow.length; i++) {
          const chapter = flow[i]
          try {
            const htmlContent = await getEpubChapter(epub, chapter.id)
            const textContent = htmlContent
              .replace(/<br\s*\/?>/gi, '\n')
              .replace(/<\/p>/gi, '\n\n')
              .replace(/<\/div>/gi, '\n')
              .replace(/<\/h[1-6]>/gi, '\n\n')
              .replace(/<[^>]+>/g, '')
              .replace(/&nbsp;/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(num))
              .trim()

            if (textContent) {
              const tocItem = epub.toc?.find(t => t.href?.includes(chapter.id))
              chapters.push({
                id: chapter.id,
                title: tocItem?.title || `Chapter ${i + 1}`,
                content: textContent,
                html: htmlContent
              })
            }
          } catch (err) {
            console.error(`Error reading chapter ${chapter.id}:`, err)
          }
        }

        if (tempFile && existsSync(tempFile)) {
          await unlink(tempFile)
        }

        return res.json({
          title: epub.metadata?.title || ebook.title,
          author: epub.metadata?.creator,
          format: 'epub',
          totalChapters: chapters.length,
          toc: epub.toc?.map(t => ({ title: t.title, id: t.id })) || [],
          chapters: chapters
        })
      } finally {
        if (tempFile && existsSync(tempFile)) {
          await unlink(tempFile).catch(() => {})
        }
      }
    }

    // Handle PDF files
    if (!storageClient || !ebook.s3_key) {
      return res.status(404).json({ error: 'Ebook not available in cloud storage' })
    }

    const pdfBuffer = await downloadFromStorage(ebook.s3_key)
    if (!pdfBuffer) {
      return res.status(500).json({ error: 'Failed to download ebook from storage' })
    }

    const data = await pdf(pdfBuffer)

    const pages = []
    const rawText = data.text || ''

    const chunks = rawText.split(/\f|\n\n+/).filter(chunk => chunk.trim())

    chunks.forEach((chunk, index) => {
      const trimmed = chunk.trim()
      if (trimmed) {
        pages.push({
          page: index + 1,
          content: trimmed
        })
      }
    })

    res.json({
      title: ebook.title,
      format: 'pdf',
      totalPages: data.numpages,
      pages: pages
    })
  } catch (error) {
    console.error('Extract ebook text error:', error)
    res.status(500).json({ error: 'Failed to extract ebook text' })
  }
})

// Get ebook info
router.get('/:id/info', async (req, res) => {
  try {
    const ebook = db.prepare('SELECT *, s3_key FROM ebooks WHERE id = ?').get(req.params.id)
    if (!ebook) {
      return res.status(404).json({ error: 'Ebook not found' })
    }

    if (!storageClient || !ebook.s3_key) {
      return res.status(404).json({ error: 'Ebook not available in cloud storage' })
    }

    const pdfBuffer = await downloadFromStorage(ebook.s3_key)
    if (!pdfBuffer) {
      return res.status(500).json({ error: 'Failed to download ebook from storage' })
    }

    const data = await pdf(pdfBuffer, { max: 1 })

    res.json({
      id: ebook.id,
      title: ebook.title,
      totalPages: data.numpages
    })
  } catch (error) {
    console.error('Get ebook info error:', error)
    res.status(500).json({ error: 'Failed to get ebook info' })
  }
})

// Ebook underlines
router.get('/:id/underlines', requireAuth, (req, res) => {
  try {
    const underlines = db.prepare(`
      SELECT eu.*, COUNT(ei.id) as idea_count
      FROM ebook_underlines eu
      LEFT JOIN ebook_ideas ei ON ei.underline_id = eu.id
      WHERE eu.ebook_id = ? AND eu.user_id = ?
      GROUP BY eu.id
      ORDER BY eu.chapter_index, eu.paragraph_index, eu.start_offset
    `).all(req.params.id, req.user.id)
    res.json(underlines)
  } catch (error) {
    console.error('Get ebook underlines error:', error)
    res.status(500).json({ error: 'Failed to fetch underlines' })
  }
})

router.post('/:id/underlines', requireAuth, (req, res) => {
  try {
    const { text, paragraph, chapter_index, paragraph_index, start_offset, end_offset, cfi_range } = req.body
    const result = db.prepare(`
      INSERT INTO ebook_underlines (ebook_id, text, paragraph, chapter_index, paragraph_index, start_offset, end_offset, cfi_range, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.params.id, text, paragraph || null, chapter_index || 0, paragraph_index, start_offset, end_offset, cfi_range || null, req.user.id)

    const newUnderline = db.prepare('SELECT * FROM ebook_underlines WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json({ ...newUnderline, idea_count: 0 })
  } catch (error) {
    console.error('Create ebook underline error:', error)
    res.status(500).json({ error: 'Failed to create underline' })
  }
})

// Ebook underline operations (mounted at parent level)
router.delete('/ebook-underlines/:id', requireAuth, (req, res) => {
  try {
    const underline = db.prepare('SELECT * FROM ebook_underlines WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
    if (!underline) {
      return res.status(404).json({ error: 'Underline not found' })
    }
    db.prepare('DELETE FROM ebook_underlines WHERE id = ?').run(req.params.id)
    res.json({ success: true })
  } catch (error) {
    console.error('Delete ebook underline error:', error)
    res.status(500).json({ error: 'Failed to delete underline' })
  }
})

router.get('/ebook-underlines/:id/ideas', requireAuth, (req, res) => {
  try {
    const ideas = db.prepare(`
      SELECT * FROM ebook_ideas WHERE underline_id = ? ORDER BY created_at DESC
    `).all(req.params.id)
    res.json(ideas)
  } catch (error) {
    console.error('Get ebook ideas error:', error)
    res.status(500).json({ error: 'Failed to fetch ideas' })
  }
})

router.post('/ebook-underlines/:id/ideas', requireAuth, (req, res) => {
  try {
    const { content } = req.body

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' })
    }

    const underline = db.prepare(`
      SELECT * FROM ebook_underlines WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.id)

    if (!underline) {
      return res.status(404).json({ error: 'Underline not found' })
    }

    const result = db.prepare(`
      INSERT INTO ebook_ideas (underline_id, content, user_id)
      VALUES (?, ?, ?)
    `).run(req.params.id, content.trim(), req.user.id)

    db.prepare(`
      UPDATE ebook_underlines SET idea_count = idea_count + 1 WHERE id = ?
    `).run(req.params.id)

    const newIdea = db.prepare('SELECT * FROM ebook_ideas WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(newIdea)
  } catch (error) {
    console.error('Create ebook idea error:', error)
    res.status(500).json({ error: 'Failed to create idea' })
  }
})

router.patch('/ebook-ideas/:id', requireAuth, (req, res) => {
  try {
    const { content } = req.body
    const idea = db.prepare(`
      SELECT ei.* FROM ebook_ideas ei
      JOIN ebook_underlines eu ON ei.underline_id = eu.id
      WHERE ei.id = ? AND eu.user_id = ?
    `).get(req.params.id, req.user.id)

    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' })
    }

    db.prepare('UPDATE ebook_ideas SET content = ? WHERE id = ?').run(content, req.params.id)
    const updatedIdea = db.prepare('SELECT * FROM ebook_ideas WHERE id = ?').get(req.params.id)
    res.json(updatedIdea)
  } catch (error) {
    console.error('Update ebook idea error:', error)
    res.status(500).json({ error: 'Failed to update idea' })
  }
})

router.delete('/ebook-ideas/:id', requireAuth, (req, res) => {
  try {
    const idea = db.prepare(`
      SELECT ei.* FROM ebook_ideas ei
      JOIN ebook_underlines eu ON ei.underline_id = eu.id
      WHERE ei.id = ? AND eu.user_id = ?
    `).get(req.params.id, req.user.id)

    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' })
    }

    db.prepare('DELETE FROM ebook_ideas WHERE id = ?').run(req.params.id)
    res.json({ success: true })
  } catch (error) {
    console.error('Delete ebook idea error:', error)
    res.status(500).json({ error: 'Failed to delete idea' })
  }
})

// Helper: Scan ebooks directory
async function scanEbooksDirectory() {
  const results = { categories: 0, ebooks: 0, skipped: 0, upgraded: 0, errors: [] }

  try {
    const categoryDirs = await readdir(EBOOKS_BASE_PATH)

    for (const categoryDir of categoryDirs) {
      if (categoryDir.startsWith('.')) continue

      const categoryPath = join(EBOOKS_BASE_PATH, categoryDir)
      const categoryStat = await stat(categoryPath)
      if (!categoryStat.isDirectory()) continue

      const categoryName = categoryDir.replace(/^\d+\./, '').trim()

      let category = db.prepare('SELECT * FROM ebook_categories WHERE name = ?').get(categoryName)
      if (!category) {
        const result = db.prepare('INSERT INTO ebook_categories (name, description) VALUES (?, ?)').run(categoryName, categoryDir)
        category = { id: result.lastInsertRowid, name: categoryName }
        results.categories++
      }

      await scanFolderForEbooks(categoryPath, category, results)
    }
  } catch (error) {
    results.errors.push({ path: EBOOKS_BASE_PATH, error: error.message })
  }

  console.log(`[Scan] Complete: ${results.ebooks} new, ${results.skipped} skipped, ${results.upgraded} upgraded`)
  return results
}

// Helper: Recursively scan for ebook files
async function scanFolderForEbooks(folderPath, category, results, depth = 0) {
  if (depth > 10) return

  try {
    const items = await readdir(folderPath)

    for (const file of items) {
      if (file.startsWith('.') || file.startsWith('._')) continue

      const filePath = join(folderPath, file)

      try {
        const fileStat = await stat(filePath)

        if (fileStat.isDirectory()) {
          await scanFolderForEbooks(filePath, category, results, depth + 1)
        } else {
          const lowerFile = file.toLowerCase()
          const isEpub = lowerFile.endsWith('.epub')
          const isPdf = lowerFile.endsWith('.pdf')

          if (!isEpub && !isPdf) continue
          if (/\(\d+\)\.(epub|pdf)$/i.test(file)) continue

          const fileSize = fileStat.size
          if (fileSize < 10240) continue

          const ext = isEpub ? '.epub' : '.pdf'
          const fileName = basename(file, ext)
          const title = fileName.replace(/^\d+\./, '').trim()
          const normalizedTitle = normalizeTitle(title || fileName)
          const fileType = isEpub ? 'epub' : 'pdf'

          const existingByPath = db.prepare('SELECT id FROM ebooks WHERE file_path = ?').get(filePath)
          if (existingByPath) continue

          const existingByTitle = db.prepare(
            'SELECT id, file_type, file_path FROM ebooks WHERE normalized_title = ? AND category_id = ?'
          ).get(normalizedTitle, category.id)

          if (existingByTitle) {
            if (existingByTitle.file_type === 'pdf' && fileType === 'epub') {
              db.prepare(`
                UPDATE ebooks SET file_path = ?, file_size = ?, file_type = ?, cover_url = NULL
                WHERE id = ?
              `).run(filePath, fileSize, fileType, existingByTitle.id)
              results.upgraded++
              console.log(`[Scan] Upgraded to EPUB: ${title}`)
            } else {
              results.skipped++
            }
            continue
          }

          db.prepare(`
            INSERT INTO ebooks (category_id, title, file_path, file_size, file_type, normalized_title)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(category.id, title || fileName, filePath, fileSize, fileType, normalizedTitle)

          results.ebooks++

          if (results.ebooks % 100 === 0) {
            console.log(`[Scan] Processed ${results.ebooks} ebooks...`)
          }
        }
      } catch (err) {
        results.errors.push({ file: filePath, error: err.message })
      }
    }
  } catch (err) {
    results.errors.push({ path: folderPath, error: err.message })
  }
}

export default router
