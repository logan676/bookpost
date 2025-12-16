/**
 * Batch Import EPUBs from Multiple Directories
 *
 * This script:
 * 1. Reads EPUB files from specified directories
 * 2. Assigns them to specific categories based on directory mapping
 * 3. Extracts metadata (title, author, cover)
 * 4. Uploads EPUB and cover to R2
 * 5. Creates ebook records in the database
 *
 * Run with:
 *   npx tsx src/scripts/import-ebooks-batch.ts [options]
 *
 * Options:
 *   --dry-run         Preview without saving
 *   --skip-upload     Skip R2 upload (for testing)
 *   --category=slug   Import only specific category
 */

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { ebooks, ebookCategories, bookCategories } from '../db/schema'
import { eq, ilike, and, isNull } from 'drizzle-orm'
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
// @ts-ignore - epub2 has type issues
import { EPub } from 'epub2'
// @ts-ignore - html-entities for decoding HTML entities
import { decode } from 'html-entities'

// Track current file being processed for error recovery
let currentProcessingFile: string | null = null
let skipCurrentFile = false

// Global error handlers to catch epub2 library async errors
process.on('uncaughtException', (err) => {
  if (currentProcessingFile) {
    console.error(`  ❌ Uncaught error processing ${path.basename(currentProcessingFile)}: ${err.message}`)
    skipCurrentFile = true
  } else {
    console.error('Uncaught exception:', err)
    process.exit(1)
  }
})

process.on('unhandledRejection', (reason, promise) => {
  if (currentProcessingFile) {
    console.error(`  ❌ Unhandled rejection processing ${path.basename(currentProcessingFile)}: ${reason}`)
    skipCurrentFile = true
  } else {
    console.error('Unhandled rejection:', reason)
  }
})

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  idleTimeoutMillis: 0,
  connectionTimeoutMillis: 10000,
})
const db = drizzle(pool)

// R2 Client
const r2Client = process.env.R2_ACCOUNT_ID ? new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
}) : null

const R2_BUCKET = process.env.R2_BUCKET_NAME || 'bookpost-media'
const API_BASE_URL = process.env.API_BASE_URL || 'https://bookpost-api-hono.fly.dev'

// Parse command line arguments
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const skipUpload = args.includes('--skip-upload')
const categoryFilter = args.find(a => a.startsWith('--category='))?.split('=')[1]
const startFrom = parseInt(args.find(a => a.startsWith('--start-from='))?.split('=')[1] || '0')
const skipFiles = (args.find(a => a.startsWith('--skip-files='))?.split('=')[1] || '').split(',').filter(Boolean)

// Directory to category mapping
const IMPORT_CONFIGS = [
  {
    name: '凯文凯利系列',
    directory: '/Volumes/杂志/电子书/凯文凯利系列（六本）',
    categorySlug: 'kevin-kelly',
    recursive: true,
    foreignOnly: false, // 凯文凯利是美国作者，全部导入
  },
  {
    name: '人物传记大合集',
    directory: '/Volumes/杂志/电子书/人物传记大合集',
    categorySlug: 'biography',
    recursive: false,
    foreignOnly: true, // 只导入国外人物传记
  },
  {
    name: 'AI/机器学习书籍',
    directory: '/Volumes/杂志/电子书/epub',
    categorySlug: 'artificial-intelligence',
    recursive: false,
    foreignOnly: true, // 只导入国外作者书籍
  },
]

/**
 * Check if author/title is Chinese (domestic)
 * Returns true if it appears to be Chinese content
 */
function isChineseContent(author: string, title: string): boolean {
  // Count Chinese characters in author name
  const authorChineseChars = (author.match(/[\u4e00-\u9fff]/g) || []).length
  const authorTotalChars = author.replace(/\s/g, '').length

  // If author name is mostly Chinese characters (>50%), consider it Chinese
  if (authorTotalChars > 0 && authorChineseChars / authorTotalChars > 0.5) {
    return true
  }

  // Common Chinese author name patterns
  const chineseAuthorPatterns = [
    /^[\u4e00-\u9fff]{2,4}$/,  // Pure Chinese name (2-4 chars)
    /[\u4e00-\u9fff]{2,4}[著编译]/, // Chinese name + 著/编/译
  ]

  for (const pattern of chineseAuthorPatterns) {
    if (pattern.test(author)) {
      return true
    }
  }

  return false
}

interface EpubMetadata {
  title: string
  author: string
  description?: string
  publisher?: string
  language?: string
  isbn?: string
  wordCount?: number
  coverBuffer?: Buffer
  coverMimeType?: string
}

/**
 * Clean HTML description: strip tags and decode entities
 */
function cleanDescription(html: string | undefined): string | undefined {
  if (!html) return undefined
  let text = decode(html)
  text = text.replace(/<[^>]*>/g, ' ')
  text = text.replace(/\s+/g, ' ').trim()
  if (text.length > 2000) {
    text = text.substring(0, 1997) + '...'
  }
  return text
}

/**
 * Count words in text (handles Chinese and English)
 */
function countWords(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length
  const englishWords = text
    .replace(/[\u4e00-\u9fff]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0 && /[a-zA-Z0-9]/.test(word))
    .length
  return chineseChars + englishWords
}

/**
 * Extract word count from EPUB chapters
 */
async function extractWordCount(epub: any): Promise<number> {
  return new Promise((resolve) => {
    let totalWords = 0
    const chapters = epub.flow || []
    let processedChapters = 0
    const totalChapters = chapters.length

    if (totalChapters === 0) {
      resolve(0)
      return
    }

    for (const chapter of chapters) {
      if (!chapter.id) {
        processedChapters++
        if (processedChapters === totalChapters) {
          resolve(totalWords)
        }
        continue
      }

      epub.getChapter(chapter.id, (err: Error | null, text: string) => {
        processedChapters++
        if (!err && text) {
          let cleanText = decode(text)
          cleanText = cleanText.replace(/<[^>]*>/g, ' ')
          cleanText = cleanText.replace(/\s+/g, ' ').trim()
          totalWords += countWords(cleanText)
        }
        if (processedChapters === totalChapters) {
          resolve(totalWords)
        }
      })
    }
  })
}

/**
 * Extract metadata from EPUB file
 */
async function extractEpubMetadata(filePath: string): Promise<EpubMetadata | null> {
  return new Promise((resolve) => {
    try {
      const epub = new EPub(filePath)

      // Set a timeout to prevent hanging on problematic files
      const timeout = setTimeout(() => {
        console.error(`  ❌ EPUB parse timeout`)
        resolve(null)
      }, 30000)

      epub.on('end', async () => {
        clearTimeout(timeout)
      const metadata: EpubMetadata = {
        title: epub.metadata.title || path.basename(filePath, '.epub'),
        author: epub.metadata.creator || 'Unknown',
        description: cleanDescription(epub.metadata.description),
        publisher: epub.metadata.publisher,
        language: epub.metadata.language,
      }

      if (epub.metadata.ISBN) {
        metadata.isbn = epub.metadata.ISBN
      }

      try {
        const wordCount = await extractWordCount(epub)
        if (wordCount > 0) {
          metadata.wordCount = wordCount
        }
      } catch (err) {
        // Ignore word count errors
      }

      // Try to extract cover image
      try {
        const coverId = epub.metadata.cover || 'cover'
        if (epub.manifest[coverId]) {
          epub.getImage(coverId, (err: Error | null, data: Buffer, mimeType: string) => {
            if (!err && data) {
              metadata.coverBuffer = data
              metadata.coverMimeType = mimeType
            }
            resolve(metadata)
          })
        } else {
          const coverKey = Object.keys(epub.manifest).find(k =>
            k.toLowerCase().includes('cover') &&
            epub.manifest[k]['media-type']?.startsWith('image/')
          )
          if (coverKey) {
            epub.getImage(coverKey, (err: Error | null, data: Buffer, mimeType: string) => {
              if (!err && data) {
                metadata.coverBuffer = data
                metadata.coverMimeType = mimeType
              }
              resolve(metadata)
            })
          } else {
            resolve(metadata)
          }
        }
      } catch {
        resolve(metadata)
      }
    })

      epub.on('error', (err: Error) => {
        clearTimeout(timeout)
        console.error(`  ❌ EPUB parse error: ${err.message}`)
        resolve(null)
      })

      epub.parse()
    } catch (err) {
      console.error(`  ❌ EPUB initialization error: ${err instanceof Error ? err.message : err}`)
      resolve(null)
    }
  })
}

/**
 * Get the API URL for a given R2 key
 */
function getApiUrl(key: string): string {
  if (key.startsWith('covers/')) {
    const subPath = key.replace('covers/', '')
    return `${API_BASE_URL}/api/r2-covers/${subPath}`
  }
  return `${API_BASE_URL}/api/r2/${key}`
}

/**
 * Upload file to R2
 */
async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<string | null> {
  if (!r2Client || skipUpload) {
    console.log(`  ⏭️ Skipping R2 upload: ${key}`)
    return getApiUrl(key)
  }

  try {
    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }))
    console.log(`  ✅ Uploaded to R2: ${key}`)
    return getApiUrl(key)
  } catch (error) {
    console.error(`  ❌ R2 upload failed: ${error instanceof Error ? error.message : error}`)
    return null
  }
}

/**
 * Get category ID by slug
 */
async function getCategoryId(slug: string): Promise<number | null> {
  const [category] = await db
    .select()
    .from(ebookCategories)
    .where(eq(ebookCategories.slug, slug))
    .limit(1)
  return category?.id || null
}

/**
 * Find EPUB files in directory (recursive or not)
 */
function findEpubFiles(directory: string, recursive: boolean): string[] {
  if (!fs.existsSync(directory)) {
    console.error(`Directory not found: ${directory}`)
    return []
  }

  const epubFiles: string[] = []

  function scanDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      // Skip hidden files (starting with .)
      if (entry.name.startsWith('.')) continue

      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory() && recursive) {
        scanDir(fullPath)
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.epub')) {
        epubFiles.push(fullPath)
      }
    }
  }

  scanDir(directory)
  return epubFiles
}

/**
 * Process a single EPUB file
 */
async function processEpub(
  filePath: string,
  categoryId: number | null,
  foreignOnly: boolean = false
): Promise<{ success: boolean; ebookId?: number; skipped?: boolean }> {
  const fileName = path.basename(filePath)
  console.log(`\n📖 Processing: ${fileName}`)

  // 1. Extract metadata
  const metadata = await extractEpubMetadata(filePath)
  if (!metadata) {
    return { success: false }
  }

  console.log(`  📋 Title: ${metadata.title}`)
  console.log(`  ✍️ Author: ${metadata.author}`)

  // 2. Check if we should skip Chinese content
  if (foreignOnly && isChineseContent(metadata.author, metadata.title)) {
    console.log(`  ⏭️ Skipped: Chinese author/content (foreignOnly filter)`)
    return { success: true, skipped: true }
  }

  // 2. Generate keys for R2
  const sanitizedTitle = metadata.title.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_').substring(0, 50)
  const timestamp = Date.now()
  const epubKey = `ebooks/${sanitizedTitle}_${timestamp}.epub`
  const coverKey = `covers/ebooks/${sanitizedTitle}_${timestamp}.jpg`

  // 3. Read EPUB file
  const epubBuffer = fs.readFileSync(filePath)
  const fileSize = epubBuffer.length

  if (dryRun) {
    console.log(`  🔍 [DRY RUN] Would upload:`)
    console.log(`     - EPUB: ${epubKey} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`)
    if (metadata.coverBuffer) {
      console.log(`     - Cover: ${coverKey}`)
    }
    console.log(`     - Category ID: ${categoryId}`)
    return { success: true }
  }

  // 4. Upload EPUB to R2
  const epubUrl = await uploadToR2(epubKey, epubBuffer, 'application/epub+zip')
  if (!epubUrl && !skipUpload) {
    return { success: false }
  }

  // 5. Upload cover to R2 (if available)
  let coverUrl: string | null = null
  if (metadata.coverBuffer) {
    coverUrl = await uploadToR2(coverKey, metadata.coverBuffer, metadata.coverMimeType || 'image/jpeg')
  }

  // 6. Create ebook record in database
  const [insertedEbook] = await db.insert(ebooks).values({
    title: metadata.title,
    author: metadata.author,
    description: metadata.description,
    publisher: metadata.publisher,
    language: metadata.language || 'zh',
    isbn: metadata.isbn,
    wordCount: metadata.wordCount,
    categoryId: categoryId,
    s3Key: epubKey,
    filePath: epubUrl,
    fileSize: fileSize,
    fileType: 'epub',
    coverUrl: coverUrl,
    paymentType: 'free',
  }).returning()

  console.log(`  ✅ Created ebook record: ID ${insertedEbook.id}`)

  // 7. Create book-category relationship
  if (categoryId) {
    await db.insert(bookCategories).values({
      bookId: insertedEbook.id,
      bookType: 'ebook',
      categoryId: categoryId,
      isPrimary: true,
    }).onConflictDoNothing()
  }

  return { success: true, ebookId: insertedEbook.id }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('              BATCH IMPORT EBOOKS TO BOOKPOST')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`R2 configured: ${!!r2Client}`)
  console.log(`Skip upload: ${skipUpload}`)
  if (categoryFilter) {
    console.log(`Category filter: ${categoryFilter}`)
  }
  console.log('═══════════════════════════════════════════════════════════════')

  let totalSuccess = 0
  let totalFailed = 0
  let totalSkipped = 0

  // Filter configs if category filter is specified
  const configs = categoryFilter
    ? IMPORT_CONFIGS.filter(c => c.categorySlug === categoryFilter)
    : IMPORT_CONFIGS

  if (configs.length === 0) {
    console.error(`\n❌ No matching import configs found for category: ${categoryFilter}`)
    await pool.end()
    process.exit(1)
  }

  for (const config of configs) {
    console.log(`\n\n╔═══════════════════════════════════════════════════════════════╗`)
    console.log(`║ ${config.name.padEnd(61)}║`)
    console.log(`║ Directory: ${config.directory.substring(0, 48).padEnd(49)}║`)
    console.log(`║ Category: ${config.categorySlug.padEnd(50)}║`)
    console.log(`╚═══════════════════════════════════════════════════════════════╝`)

    // Get category ID
    const categoryId = await getCategoryId(config.categorySlug)
    if (!categoryId && !dryRun) {
      console.error(`  ❌ Category not found: ${config.categorySlug}`)
      console.log(`  💡 Run 'npx tsx src/scripts/seed-categories.ts' first to create categories`)
      continue
    }

    // Find EPUB files
    const epubFiles = findEpubFiles(config.directory, config.recursive)
    if (epubFiles.length === 0) {
      console.log(`  ⚠️ No EPUB files found`)
      continue
    }

    console.log(`\n📚 Found ${epubFiles.length} EPUB files`)
    if (config.foreignOnly) {
      console.log(`🌍 Foreign authors only mode enabled`)
    }
    if (startFrom > 0) {
      console.log(`⏭️ Starting from file index ${startFrom}`)
    }
    if (skipFiles.length > 0) {
      console.log(`⏭️ Skipping files: ${skipFiles.join(', ')}`)
    }

    let successCount = 0
    let failCount = 0
    let skippedCount = 0

    for (let i = 0; i < epubFiles.length; i++) {
      const epubFile = epubFiles[i]

      // Skip files before start index
      if (i < startFrom) {
        console.log(`\n⏭️ Skipping ${path.basename(epubFile)} (index ${i} < ${startFrom})`)
        continue
      }

      // Skip files in skip list
      const fileName = path.basename(epubFile)
      if (skipFiles.some(skip => fileName.toLowerCase().includes(skip.toLowerCase()))) {
        console.log(`\n⏭️ Skipping ${fileName} (in skip list)`)
        failCount++
        continue
      }
      // Set current file for error tracking
      currentProcessingFile = epubFile
      skipCurrentFile = false

      try {
        const result = await processEpub(epubFile, categoryId, config.foreignOnly)

        // Check if an async error was caught
        if (skipCurrentFile) {
          failCount++
          continue
        }

        if (result.skipped) {
          skippedCount++
        } else if (result.success) {
          successCount++
        } else {
          failCount++
        }
      } catch (err) {
        console.error(`  ❌ Unexpected error processing ${path.basename(epubFile)}: ${err instanceof Error ? err.message : err}`)
        failCount++
      }

      // Small delay to allow async errors to surface
      await new Promise(resolve => setTimeout(resolve, 100))

      // Reset tracking
      currentProcessingFile = null
    }

    console.log(`\n─────────────────────────────────────────────────────────────────`)
    console.log(`  ✅ Imported: ${successCount}`)
    console.log(`  ⏭️ Skipped (Chinese): ${skippedCount}`)
    console.log(`  ❌ Failed: ${failCount}`)
    console.log(`─────────────────────────────────────────────────────────────────`)

    totalSkipped += skippedCount

    totalSuccess += successCount
    totalFailed += failCount
  }

  console.log('\n\n═══════════════════════════════════════════════════════════════')
  console.log('                      FINAL SUMMARY')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`✅ Total Imported: ${totalSuccess}`)
  console.log(`⏭️ Total Skipped (Chinese authors): ${totalSkipped}`)
  console.log(`❌ Total Failed: ${totalFailed}`)
  console.log('═══════════════════════════════════════════════════════════════')

  if (dryRun) {
    console.log('\n💡 This was a dry run. Run without --dry-run to actually import.\n')
  }

  await pool.end()
  process.exit(0)
}

main().catch(async (error) => {
  console.error('❌ Error:', error)
  await pool.end()
  process.exit(1)
})
