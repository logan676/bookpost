/**
 * Upload EPUBs and Link to External Rankings
 *
 * This script:
 * 1. Reads EPUB files from a specified directory
 * 2. Extracts metadata (title, author, cover)
 * 3. Uploads EPUB and cover to R2
 * 4. Creates ebook records in the database
 * 5. Links matching books to external ranking entries
 *
 * Run with:
 *   npx tsx src/scripts/upload-ebooks.ts [directory] [options]
 *
 * Options:
 *   --dry-run         Preview without saving
 *   --skip-upload     Skip R2 upload (for testing)
 */

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { ebooks, curatedListItems } from '../db/schema'
import { ilike, and, isNull } from 'drizzle-orm'
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
// @ts-ignore - epub2 has type issues
import { EPub } from 'epub2'
// @ts-ignore - html-entities for decoding HTML entities
import { decode } from 'html-entities'

/**
 * Clean HTML description: strip tags and decode entities
 */
function cleanDescription(html: string | undefined): string | undefined {
  if (!html) return undefined

  // First decode HTML entities (&#8212; -> —, &amp; -> &, etc.)
  let text = decode(html)

  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, ' ')

  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim()

  // Truncate if too long (keep reasonable length for descriptions)
  if (text.length > 2000) {
    text = text.substring(0, 1997) + '...'
  }

  return text
}

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
const epubDir = args.find(a => !a.startsWith('--')) || '/Users/HONGBGU/Desktop/BookLibrio/epub'

interface EpubMetadata {
  title: string
  author: string
  description?: string
  publisher?: string
  language?: string
  isbn?: string
  coverBuffer?: Buffer
  coverMimeType?: string
}

/**
 * Extract metadata from EPUB file
 */
async function extractEpubMetadata(filePath: string): Promise<EpubMetadata | null> {
  return new Promise((resolve) => {
    const epub = new EPub(filePath)

    epub.on('end', async () => {
      const metadata: EpubMetadata = {
        title: epub.metadata.title || path.basename(filePath, '.epub'),
        author: epub.metadata.creator || 'Unknown',
        description: cleanDescription(epub.metadata.description),
        publisher: epub.metadata.publisher,
        language: epub.metadata.language,
      }

      // Extract ISBN from identifiers
      if (epub.metadata.ISBN) {
        metadata.isbn = epub.metadata.ISBN
      }

      // Try to extract cover image
      try {
        const coverId = epub.metadata.cover || 'cover'
        if (epub.manifest[coverId]) {
          const coverItem = epub.manifest[coverId]
          epub.getImage(coverId, (err: Error | null, data: Buffer, mimeType: string) => {
            if (!err && data) {
              metadata.coverBuffer = data
              metadata.coverMimeType = mimeType
            }
            resolve(metadata)
          })
        } else {
          // Try to find cover in manifest by id containing 'cover'
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
      console.error(`  ❌ EPUB parse error: ${err.message}`)
      resolve(null)
    })

    epub.parse()
  })
}

/**
 * Get the API URL for a given R2 key
 * - covers/* -> /api/r2-covers/...
 * - ebooks/* -> /api/ebooks/download/...
 */
function getApiUrl(key: string): string {
  if (key.startsWith('covers/')) {
    // covers/ebooks/xxx.jpg -> /api/r2-covers/ebooks/xxx.jpg
    const subPath = key.replace('covers/', '')
    return `${API_BASE_URL}/api/r2-covers/${subPath}`
  }
  // Default: direct R2 path
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
 * Check if file exists in R2
 */
async function existsInR2(key: string): Promise<boolean> {
  if (!r2Client) return false
  try {
    await r2Client.send(new HeadObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    }))
    return true
  } catch {
    return false
  }
}

/**
 * Normalize title for matching
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Find matching external ranking entries
 */
async function findMatchingRankings(title: string): Promise<number[]> {
  const matches = await db
    .select({ id: curatedListItems.id })
    .from(curatedListItems)
    .where(
      and(
        ilike(curatedListItems.externalTitle, `%${title}%`),
        isNull(curatedListItems.bookId)
      )
    )
  return matches.map(m => m.id)
}

/**
 * Process a single EPUB file
 */
async function processEpub(filePath: string): Promise<{ success: boolean; ebookId?: number; linkedRankings?: number }> {
  const fileName = path.basename(filePath)
  console.log(`\n📖 Processing: ${fileName}`)

  // 1. Extract metadata
  const metadata = await extractEpubMetadata(filePath)
  if (!metadata) {
    return { success: false }
  }

  console.log(`  📋 Title: ${metadata.title}`)
  console.log(`  ✍️ Author: ${metadata.author}`)

  // 2. Generate keys for R2
  const sanitizedTitle = metadata.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)
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

    // Check for matching rankings
    const matchingRankings = await findMatchingRankings(metadata.title)
    if (matchingRankings.length > 0) {
      console.log(`  🔗 Would link to ${matchingRankings.length} external ranking entries`)
    }

    return { success: true, linkedRankings: matchingRankings.length }
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
    language: metadata.language || 'en',
    isbn: metadata.isbn,
    s3Key: epubKey,
    filePath: epubUrl,
    fileSize: fileSize,
    fileType: 'epub',
    coverUrl: coverUrl,
    paymentType: 'free',
  }).returning()

  console.log(`  ✅ Created ebook record: ID ${insertedEbook.id}`)

  // 7. Link to matching external ranking entries
  const matchingRankings = await findMatchingRankings(metadata.title)
  if (matchingRankings.length > 0) {
    await db
      .update(curatedListItems)
      .set({ bookId: insertedEbook.id })
      .where(
        and(
          ilike(curatedListItems.externalTitle, `%${metadata.title}%`),
          isNull(curatedListItems.bookId)
        )
      )
    console.log(`  🔗 Linked to ${matchingRankings.length} external ranking entries`)
  }

  return { success: true, ebookId: insertedEbook.id, linkedRankings: matchingRankings.length }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('              UPLOAD EBOOKS TO BOOKPOST')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`R2 configured: ${!!r2Client}`)
  console.log(`Skip upload: ${skipUpload}`)
  console.log(`Source directory: ${epubDir}`)
  console.log('═══════════════════════════════════════════════════════════════')

  // Check directory exists
  if (!fs.existsSync(epubDir)) {
    console.error(`\n❌ Directory not found: ${epubDir}`)
    await pool.end()
    process.exit(1)
  }

  // Find all EPUB files
  const epubFiles = fs.readdirSync(epubDir)
    .filter(f => f.toLowerCase().endsWith('.epub'))
    .map(f => path.join(epubDir, f))

  if (epubFiles.length === 0) {
    console.log('\n⚠️ No EPUB files found in directory')
    await pool.end()
    process.exit(0)
  }

  console.log(`\n📚 Found ${epubFiles.length} EPUB files`)

  let successCount = 0
  let failCount = 0
  let totalLinked = 0

  for (const epubFile of epubFiles) {
    const result = await processEpub(epubFile)
    if (result.success) {
      successCount++
      totalLinked += result.linkedRankings || 0
    } else {
      failCount++
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('                         SUMMARY')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`✅ Successful: ${successCount}`)
  console.log(`❌ Failed: ${failCount}`)
  console.log(`🔗 Linked to rankings: ${totalLinked}`)
  console.log('═══════════════════════════════════════════════════════════════')

  if (dryRun) {
    console.log('\n💡 This was a dry run. Run without --dry-run to actually upload.\n')
  }

  await pool.end()
  process.exit(0)
}

main().catch(async (error) => {
  console.error('❌ Error:', error)
  await pool.end()
  process.exit(1)
})
