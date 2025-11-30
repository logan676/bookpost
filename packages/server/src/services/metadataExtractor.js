/**
 * Background Metadata Extraction Service
 * Extracts metadata from EPUB and PDF files for book detail pages
 */

import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import { extname } from 'path'
import db from '../config/database.js'

// Progress tracking
let extractionProgress = {
  running: false,
  total: 0,
  processed: 0,
  success: 0,
  failed: 0,
  current: null,
  errors: []
}

/**
 * Get current extraction progress
 */
export function getExtractionProgress() {
  return { ...extractionProgress }
}

/**
 * Extract metadata from an EPUB file
 */
async function extractEpubMetadata(filePath) {
  try {
    const EPub = (await import('epub')).default

    return new Promise((resolve, reject) => {
      const epub = new EPub(filePath)

      epub.on('error', (err) => {
        reject(err)
      })

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
    console.error(`[Metadata] EPUB parse error for ${filePath}:`, error.message)
    return null
  }
}

/**
 * Extract metadata from a PDF file
 */
async function extractPdfMetadata(filePath) {
  try {
    const pdfParse = (await import('pdf-parse')).default
    const dataBuffer = await readFile(filePath)
    const data = await pdfParse(dataBuffer, { max: 5 }) // Only parse first 5 pages for speed

    return {
      title: data.info?.Title || null,
      author: data.info?.Author || null,
      description: null, // PDFs rarely have descriptions
      publisher: data.info?.Producer || data.info?.Creator || null,
      language: null,
      isbn: null,
      publishDate: data.info?.CreationDate || data.info?.ModDate || null,
      pageCount: data.numpages || 0,
      chapterCount: 0,
      toc: []
    }
  } catch (error) {
    console.error(`[Metadata] PDF parse error for ${filePath}:`, error.message)
    return null
  }
}

/**
 * Extract metadata from a single ebook
 */
async function extractMetadataForEbook(ebook) {
  const filePath = ebook.file_path

  if (!existsSync(filePath)) {
    return { error: 'File not found' }
  }

  const ext = extname(filePath).toLowerCase()
  let metadata = null

  if (ext === '.epub') {
    metadata = await extractEpubMetadata(filePath)
  } else if (ext === '.pdf') {
    metadata = await extractPdfMetadata(filePath)
  } else {
    return { error: `Unsupported file type: ${ext}` }
  }

  if (!metadata) {
    return { error: 'Failed to extract metadata' }
  }

  return metadata
}

/**
 * Update ebook record with extracted metadata
 */
function updateEbookMetadata(ebookId, metadata) {
  const stmt = db.prepare(`
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
      metadata_extracted = 1,
      metadata_extracted_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `)

  stmt.run(
    metadata.author,
    metadata.description,
    metadata.publisher,
    metadata.language,
    metadata.isbn,
    metadata.publishDate,
    metadata.pageCount || null,
    metadata.chapterCount || null,
    metadata.toc?.length > 0 ? JSON.stringify(metadata.toc) : null,
    ebookId
  )
}

/**
 * Mark ebook as extraction failed
 */
function markExtractionFailed(ebookId) {
  db.prepare(`
    UPDATE ebooks SET
      metadata_extracted = -1,
      metadata_extracted_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(ebookId)
}

/**
 * Start background metadata extraction for all ebooks
 */
export async function startMetadataExtraction(options = {}) {
  if (extractionProgress.running) {
    console.log('[Metadata] Extraction already running')
    return extractionProgress
  }

  const { limit = 0, forceReextract = false } = options

  extractionProgress = {
    running: true,
    total: 0,
    processed: 0,
    success: 0,
    failed: 0,
    current: null,
    errors: []
  }

  console.log('[Metadata] Starting background metadata extraction...')

  try {
    // Get ebooks that need metadata extraction
    let query = `
      SELECT id, title, file_path, file_type
      FROM ebooks
      WHERE file_path IS NOT NULL
    `

    if (!forceReextract) {
      query += ` AND (metadata_extracted IS NULL OR metadata_extracted = 0)`
    }

    if (limit > 0) {
      query += ` LIMIT ${limit}`
    }

    const ebooks = db.prepare(query).all()
    extractionProgress.total = ebooks.length

    console.log(`[Metadata] Found ${ebooks.length} ebooks to process`)

    for (const ebook of ebooks) {
      extractionProgress.current = ebook.title
      extractionProgress.processed++

      try {
        const metadata = await extractMetadataForEbook(ebook)

        if (metadata.error) {
          extractionProgress.failed++
          extractionProgress.errors.push({
            id: ebook.id,
            title: ebook.title,
            error: metadata.error
          })
          markExtractionFailed(ebook.id)
        } else {
          updateEbookMetadata(ebook.id, metadata)
          extractionProgress.success++

          if (extractionProgress.success % 10 === 0) {
            console.log(`[Metadata] Processed ${extractionProgress.success} ebooks successfully`)
          }
        }
      } catch (error) {
        extractionProgress.failed++
        extractionProgress.errors.push({
          id: ebook.id,
          title: ebook.title,
          error: error.message
        })
        markExtractionFailed(ebook.id)
      }

      // Small delay to prevent system overload
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    console.log(`[Metadata] Extraction completed: ${extractionProgress.success} success, ${extractionProgress.failed} failed`)
  } catch (error) {
    console.error('[Metadata] Extraction error:', error)
  } finally {
    extractionProgress.running = false
    extractionProgress.current = null
  }

  return extractionProgress
}

/**
 * Extract metadata for a single ebook by ID
 */
export async function extractSingleEbookMetadata(ebookId) {
  const ebook = db.prepare('SELECT * FROM ebooks WHERE id = ?').get(ebookId)

  if (!ebook) {
    throw new Error('Ebook not found')
  }

  const metadata = await extractMetadataForEbook(ebook)

  if (metadata.error) {
    markExtractionFailed(ebookId)
    throw new Error(metadata.error)
  }

  updateEbookMetadata(ebookId, metadata)
  return metadata
}

export default {
  startMetadataExtraction,
  extractSingleEbookMetadata,
  getExtractionProgress
}
