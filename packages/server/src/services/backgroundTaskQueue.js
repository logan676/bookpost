/**
 * Background Task Queue Service
 * Manages background processing for metadata extraction of ebooks and magazines
 * Processes items one by one to avoid system overload
 *
 * Uses external APIs:
 * - Google Books API (requires API key)
 * - Open Library API (free, no key required)
 */

import db from '../config/database.js'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import { extname } from 'path'
import { searchByTitleAuthor as googleSearch, searchByIsbn as googleSearchIsbn, isGoogleBooksAvailable } from './googleBooks.js'
import { searchByTitleAuthor as openLibrarySearch, searchByIsbn as openLibrarySearchIsbn } from './openLibrary.js'

// Queue state
const taskQueue = {
  running: false,
  paused: false,
  type: null, // 'ebook' or 'magazine'
  stats: {
    total: 0,
    processed: 0,
    success: 0,
    failed: 0,
    current: null,
    startedAt: null,
    errors: []
  }
}

/**
 * Get current queue status
 */
export function getQueueStatus() {
  return { ...taskQueue, stats: { ...taskQueue.stats } }
}

/**
 * Pause queue processing
 */
export function pauseQueue() {
  taskQueue.paused = true
  console.log('[TaskQueue] Paused')
}

/**
 * Resume queue processing
 */
export function resumeQueue() {
  taskQueue.paused = false
  console.log('[TaskQueue] Resumed')
}

/**
 * Extract metadata from an EPUB file
 */
async function extractEpubMetadata(filePath) {
  try {
    const EPub = (await import('epub')).default

    return new Promise((resolve, reject) => {
      const epub = new EPub(filePath)

      epub.on('error', (err) => reject(err))

      epub.on('end', () => {
        const metadata = {
          title: epub.metadata?.title || null,
          author: epub.metadata?.creator || epub.metadata?.author || null,
          description: epub.metadata?.description || null,
          publisher: epub.metadata?.publisher || null,
          language: epub.metadata?.language || null,
          isbn: epub.metadata?.ISBN || epub.metadata?.identifier || null,
          publishDate: epub.metadata?.date || epub.metadata?.pubdate || null,
          chapterCount: epub.flow?.length || 0,
          toc: epub.toc?.map(item => ({
            title: item.title,
            href: item.href,
            level: item.level || 0
          })) || []
        }
        resolve(metadata)
      })

      epub.parse()
    })
  } catch (error) {
    console.error(`[TaskQueue] EPUB parse error for ${filePath}:`, error.message)
    return null
  }
}

/**
 * Extract metadata from a PDF file (for ebooks and magazines)
 */
async function extractPdfMetadata(filePath) {
  try {
    const pdfParse = (await import('pdf-parse')).default
    const dataBuffer = await readFile(filePath)
    const data = await pdfParse(dataBuffer, { max: 5 }) // Only parse first 5 pages for speed

    return {
      title: data.info?.Title || null,
      author: data.info?.Author || null,
      description: null,
      publisher: data.info?.Producer || data.info?.Creator || null,
      language: null,
      isbn: null,
      publishDate: data.info?.CreationDate || data.info?.ModDate || null,
      pageCount: data.numpages || 0,
      chapterCount: 0,
      toc: []
    }
  } catch (error) {
    console.error(`[TaskQueue] PDF parse error for ${filePath}:`, error.message)
    return null
  }
}

/**
 * Fetch external metadata from Google Books or Open Library
 * @param {string} title - Book title
 * @param {string} author - Author name (optional)
 * @param {string} isbn - ISBN (optional)
 * @returns {Promise<Object|null>}
 */
async function fetchExternalMetadata(title, author = '', isbn = '') {
  let externalData = null

  // Strategy: Try Google Books first (better ratings data), then Open Library
  try {
    // Try ISBN search first if available (most accurate)
    if (isbn) {
      if (isGoogleBooksAvailable()) {
        externalData = await googleSearchIsbn(isbn)
      }
      if (!externalData || !externalData.averageRating) {
        const olData = await openLibrarySearchIsbn(isbn)
        if (olData) {
          externalData = mergeExternalData(externalData, olData)
        }
      }
    }

    // If no ISBN result, try title/author search
    if (!externalData || !externalData.description) {
      if (isGoogleBooksAvailable()) {
        const googleData = await googleSearch(title, author)
        externalData = mergeExternalData(externalData, googleData)
      }

      if (!externalData || !externalData.description) {
        const olData = await openLibrarySearch(title, author)
        externalData = mergeExternalData(externalData, olData)
      }
    }
  } catch (error) {
    console.error('[TaskQueue] External API error:', error.message)
  }

  return externalData
}

/**
 * Merge external data sources, preferring non-null values
 * @param {Object} primary - Primary data source
 * @param {Object} secondary - Secondary data source to fill gaps
 * @returns {Object}
 */
function mergeExternalData(primary, secondary) {
  if (!primary && !secondary) return null
  if (!primary) return secondary
  if (!secondary) return primary

  return {
    // Prefer Google Books ID if available
    googleBooksId: primary.googleBooksId || secondary.googleBooksId || null,
    openLibraryKey: primary.openLibraryKey || secondary.openLibraryKey || null,

    // Basic info - prefer non-empty values
    title: primary.title || secondary.title || '',
    author: primary.author || secondary.author || '',
    description: primary.description || secondary.description || '',
    publisher: primary.publisher || secondary.publisher || '',
    publishYear: primary.publishYear || secondary.publishYear || null,
    publishDate: primary.publishDate || secondary.publishDate || '',
    pageCount: primary.pageCount || secondary.pageCount || null,
    language: primary.language || secondary.language || '',

    // Categories
    categories: primary.categories || secondary.categories || '',
    subjects: primary.subjects || secondary.subjects || [],

    // ISBN
    isbn: primary.isbn || secondary.isbn || '',

    // Ratings - prefer Google Books (more common)
    averageRating: primary.averageRating || secondary.averageRating || null,
    ratingsCount: primary.ratingsCount || secondary.ratingsCount || null,

    // Cover
    coverUrl: primary.coverUrl || secondary.coverUrl || '',

    // Links
    previewLink: primary.previewLink || '',
    infoLink: primary.infoLink || secondary.infoLink || '',

    // Source tracking
    source: primary.source || secondary.source || 'unknown'
  }
}

/**
 * Process a single ebook - now includes external API lookup
 */
async function processEbook(ebook) {
  // First, try to fetch external metadata (doesn't require file access)
  const externalData = await fetchExternalMetadata(
    ebook.title,
    ebook.author || '',
    ebook.isbn || ''
  )

  // Check if file exists for local metadata extraction
  const filePath = ebook.file_path
  let localMetadata = null

  if (filePath && existsSync(filePath)) {
    const ext = extname(filePath).toLowerCase()

    if (ext === '.epub') {
      localMetadata = await extractEpubMetadata(filePath)
    } else if (ext === '.pdf') {
      localMetadata = await extractPdfMetadata(filePath)
    }
  }

  // Combine external and local metadata
  const hasExternalData = externalData && (externalData.description || externalData.averageRating)
  const hasLocalData = localMetadata && !localMetadata.error

  if (!hasExternalData && !hasLocalData) {
    // If we still got something from external APIs, use it
    if (externalData) {
      updateEbookWithExternalData(ebook.id, externalData)
      return { source: 'external_partial', ...externalData }
    }
    return { error: 'No metadata found from any source' }
  }

  // Update ebook with combined data
  const combinedMetadata = {
    // Local metadata (from file)
    author: localMetadata?.author || externalData?.author || null,
    description: externalData?.description || localMetadata?.description || null,
    publisher: localMetadata?.publisher || externalData?.publisher || null,
    language: localMetadata?.language || externalData?.language || null,
    isbn: localMetadata?.isbn || externalData?.isbn || null,
    publishDate: localMetadata?.publishDate || externalData?.publishDate || null,
    pageCount: localMetadata?.pageCount || externalData?.pageCount || null,
    chapterCount: localMetadata?.chapterCount || null,
    toc: localMetadata?.toc || [],

    // External API metadata
    googleBooksId: externalData?.googleBooksId || null,
    openLibraryKey: externalData?.openLibraryKey || null,
    averageRating: externalData?.averageRating || null,
    ratingsCount: externalData?.ratingsCount || null,
    categories: externalData?.categories || null,
    subjects: externalData?.subjects || null,
    previewLink: externalData?.previewLink || null,
    infoLink: externalData?.infoLink || null,
    externalCoverUrl: externalData?.coverUrl || null,
    externalSource: externalData?.source || null
  }

  // Update database with all metadata
  db.prepare(`
    UPDATE ebooks SET
      author = COALESCE(?, author),
      description = COALESCE(?, description),
      publisher = COALESCE(?, publisher),
      language = COALESCE(?, language),
      isbn = COALESCE(?, isbn),
      publish_date = COALESCE(?, publish_date),
      page_count = COALESCE(?, page_count),
      chapter_count = COALESCE(?, chapter_count),
      toc_json = COALESCE(?, toc_json),
      google_books_id = COALESCE(?, google_books_id),
      open_library_key = COALESCE(?, open_library_key),
      average_rating = COALESCE(?, average_rating),
      ratings_count = COALESCE(?, ratings_count),
      categories = COALESCE(?, categories),
      subjects = COALESCE(?, subjects),
      preview_link = COALESCE(?, preview_link),
      info_link = COALESCE(?, info_link),
      external_cover_url = COALESCE(?, external_cover_url),
      external_metadata_source = COALESCE(?, external_metadata_source),
      external_metadata_fetched_at = CURRENT_TIMESTAMP,
      metadata_extracted = 1,
      metadata_extracted_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    combinedMetadata.author,
    combinedMetadata.description,
    combinedMetadata.publisher,
    combinedMetadata.language,
    combinedMetadata.isbn,
    combinedMetadata.publishDate,
    combinedMetadata.pageCount,
    combinedMetadata.chapterCount,
    combinedMetadata.toc?.length > 0 ? JSON.stringify(combinedMetadata.toc) : null,
    combinedMetadata.googleBooksId,
    combinedMetadata.openLibraryKey,
    combinedMetadata.averageRating,
    combinedMetadata.ratingsCount,
    combinedMetadata.categories,
    combinedMetadata.subjects ? JSON.stringify(combinedMetadata.subjects) : null,
    combinedMetadata.previewLink,
    combinedMetadata.infoLink,
    combinedMetadata.externalCoverUrl,
    combinedMetadata.externalSource,
    ebook.id
  )

  return combinedMetadata
}

/**
 * Update ebook with only external data (when file is not available)
 */
function updateEbookWithExternalData(ebookId, externalData) {
  db.prepare(`
    UPDATE ebooks SET
      author = COALESCE(?, author),
      description = COALESCE(?, description),
      publisher = COALESCE(?, publisher),
      language = COALESCE(?, language),
      isbn = COALESCE(?, isbn),
      page_count = COALESCE(?, page_count),
      google_books_id = COALESCE(?, google_books_id),
      open_library_key = COALESCE(?, open_library_key),
      average_rating = COALESCE(?, average_rating),
      ratings_count = COALESCE(?, ratings_count),
      categories = COALESCE(?, categories),
      subjects = COALESCE(?, subjects),
      preview_link = COALESCE(?, preview_link),
      info_link = COALESCE(?, info_link),
      external_cover_url = COALESCE(?, external_cover_url),
      external_metadata_source = COALESCE(?, external_metadata_source),
      external_metadata_fetched_at = CURRENT_TIMESTAMP,
      metadata_extracted = 1,
      metadata_extracted_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    externalData.author || null,
    externalData.description || null,
    externalData.publisher || null,
    externalData.language || null,
    externalData.isbn || null,
    externalData.pageCount || null,
    externalData.googleBooksId || null,
    externalData.openLibraryKey || null,
    externalData.averageRating || null,
    externalData.ratingsCount || null,
    externalData.categories || null,
    externalData.subjects ? JSON.stringify(externalData.subjects) : null,
    externalData.previewLink || null,
    externalData.infoLink || null,
    externalData.coverUrl || null,
    externalData.source || null,
    ebookId
  )
}

/**
 * Process a single magazine
 */
async function processMagazine(magazine) {
  const filePath = magazine.file_path

  if (!existsSync(filePath)) {
    return { error: 'File not found' }
  }

  const metadata = await extractPdfMetadata(filePath)

  if (!metadata) {
    return { error: 'Failed to extract metadata' }
  }

  // Update magazine record
  db.prepare(`
    UPDATE magazines SET
      author = COALESCE(?, author),
      description = COALESCE(?, description),
      publisher_name = COALESCE(?, publisher_name),
      language = COALESCE(?, language),
      publish_date = COALESCE(?, publish_date),
      page_count = COALESCE(?, page_count),
      metadata_extracted = 1,
      metadata_extracted_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    metadata.author,
    metadata.description,
    metadata.publisher,
    metadata.language,
    metadata.publishDate,
    metadata.pageCount || null,
    magazine.id
  )

  return metadata
}

/**
 * Mark item as extraction failed
 */
function markExtractionFailed(type, id) {
  const table = type === 'ebook' ? 'ebooks' : 'magazines'
  db.prepare(`
    UPDATE ${table} SET
      metadata_extracted = -1,
      metadata_extracted_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(id)
}

/**
 * Start background extraction for ebooks
 */
export async function startEbookExtraction(options = {}) {
  if (taskQueue.running) {
    console.log('[TaskQueue] Already running')
    return getQueueStatus()
  }

  const { limit = 0, forceReextract = false } = options

  let query = `
    SELECT id, title, file_path, file_type
    FROM ebooks
    WHERE file_path IS NOT NULL
  `

  if (!forceReextract) {
    // Include books without local extraction OR without external API metadata
    query += ` AND (
      (metadata_extracted IS NULL OR metadata_extracted = 0)
      OR external_metadata_fetched_at IS NULL
    )`
  }

  if (limit > 0) {
    query += ` LIMIT ${limit}`
  }

  const items = db.prepare(query).all()

  if (items.length === 0) {
    console.log('[TaskQueue] No ebooks to process')
    return getQueueStatus()
  }

  taskQueue.running = true
  taskQueue.type = 'ebook'
  taskQueue.stats = {
    total: items.length,
    processed: 0,
    success: 0,
    failed: 0,
    current: null,
    startedAt: new Date().toISOString(),
    errors: []
  }

  console.log(`[TaskQueue] Starting ebook extraction for ${items.length} items`)

  // Process in background
  processQueue(items, 'ebook')

  return getQueueStatus()
}

/**
 * Start background extraction for magazines
 */
export async function startMagazineExtraction(options = {}) {
  if (taskQueue.running) {
    console.log('[TaskQueue] Already running')
    return getQueueStatus()
  }

  const { limit = 0, forceReextract = false } = options

  let query = `
    SELECT id, title, file_path
    FROM magazines
    WHERE file_path IS NOT NULL
  `

  if (!forceReextract) {
    query += ` AND (metadata_extracted IS NULL OR metadata_extracted = 0)`
  }

  if (limit > 0) {
    query += ` LIMIT ${limit}`
  }

  const items = db.prepare(query).all()

  if (items.length === 0) {
    console.log('[TaskQueue] No magazines to process')
    return getQueueStatus()
  }

  taskQueue.running = true
  taskQueue.type = 'magazine'
  taskQueue.stats = {
    total: items.length,
    processed: 0,
    success: 0,
    failed: 0,
    current: null,
    startedAt: new Date().toISOString(),
    errors: []
  }

  console.log(`[TaskQueue] Starting magazine extraction for ${items.length} items`)

  // Process in background
  processQueue(items, 'magazine')

  return getQueueStatus()
}

/**
 * Process queue items one by one
 */
async function processQueue(items, type) {
  for (const item of items) {
    // Check if paused
    while (taskQueue.paused) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    taskQueue.stats.current = item.title
    taskQueue.stats.processed++

    try {
      let result
      if (type === 'ebook') {
        result = await processEbook(item)
      } else {
        result = await processMagazine(item)
      }

      if (result.error) {
        taskQueue.stats.failed++
        taskQueue.stats.errors.push({
          id: item.id,
          title: item.title,
          error: result.error
        })
        markExtractionFailed(type, item.id)
      } else {
        taskQueue.stats.success++

        if (taskQueue.stats.success % 10 === 0) {
          console.log(`[TaskQueue] Processed ${taskQueue.stats.success}/${taskQueue.stats.total} ${type}s`)
        }
      }
    } catch (error) {
      taskQueue.stats.failed++
      taskQueue.stats.errors.push({
        id: item.id,
        title: item.title,
        error: error.message
      })
      markExtractionFailed(type, item.id)
    }

    // Rate limiting delay - be respectful of external APIs
    // 500ms between items gives ~120 requests per minute
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  taskQueue.running = false
  taskQueue.stats.current = null
  console.log(`[TaskQueue] ${type} extraction complete: ${taskQueue.stats.success} success, ${taskQueue.stats.failed} failed`)
}

/**
 * Start extraction for all content types
 * Called on server startup
 */
export async function startAllExtractions() {
  console.log('[TaskQueue] Starting background metadata extraction...')
  console.log(`[TaskQueue] Google Books API: ${isGoogleBooksAvailable() ? 'Available' : 'Not configured (using Open Library only)'}`)

  // Count pending items (those without metadata OR without external metadata)
  let ebookCount = 0
  let magazineCount = 0

  try {
    const pendingEbooks = db.prepare(`
      SELECT COUNT(*) as count FROM ebooks
      WHERE file_path IS NOT NULL
      AND (
        (metadata_extracted IS NULL OR metadata_extracted = 0)
        OR external_metadata_fetched_at IS NULL
      )
    `).get()
    ebookCount = pendingEbooks?.count || 0
  } catch (err) {
    console.log('[TaskQueue] Error counting ebooks:', err.message)
  }

  try {
    const pendingMagazines = db.prepare(`
      SELECT COUNT(*) as count FROM magazines
      WHERE file_path IS NOT NULL
      AND (metadata_extracted IS NULL OR metadata_extracted = 0)
    `).get()
    magazineCount = pendingMagazines?.count || 0
  } catch (err) {
    console.log('[TaskQueue] Error counting magazines:', err.message)
  }

  console.log(`[TaskQueue] Found ${ebookCount} ebooks and ${magazineCount} magazines pending extraction`)

  // Start ebook extraction first, then magazines
  if (ebookCount > 0) {
    await startEbookExtraction()
    // Wait for ebook extraction to complete before starting magazines
    while (taskQueue.running) {
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
  }

  if (magazineCount > 0) {
    await startMagazineExtraction()
  }
}

export default {
  getQueueStatus,
  pauseQueue,
  resumeQueue,
  startEbookExtraction,
  startMagazineExtraction,
  startAllExtractions
}
