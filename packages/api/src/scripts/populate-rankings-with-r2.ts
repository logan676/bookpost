/**
 * Populate External Rankings with R2-hosted Covers
 *
 * This script:
 * 1. Clears existing curated lists data
 * 2. Uses DeepSeek AI to fetch REAL bestseller list data
 * 3. Downloads covers and uploads to R2 (with ISBN-based deduplication)
 * 4. Saves everything to the database
 *
 * Run with:
 *   npx tsx src/scripts/populate-rankings-with-r2.ts [options]
 *
 * Options:
 *   --dry-run         Preview without saving
 *   --skip-clear      Don't clear existing data
 *   --source=TYPE     Only fetch specific source
 *   --year=YYYY       Only fetch specific year
 */

import 'dotenv/config'
import OpenAI from 'openai'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { curatedLists, curatedListItems } from '../db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { NodeHttpHandler } from '@smithy/node-http-handler'
import { ProxyAgent, fetch as undiciFetch } from 'undici'

// Create proxy-aware fetch for Google Books API
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
const proxyAgent = proxyUrl ? new ProxyAgent(proxyUrl) : null

// Fetch with proxy support
async function fetchWithProxy(url: string, options?: RequestInit): Promise<Response> {
  if (proxyAgent) {
    return undiciFetch(url, { ...options, dispatcher: proxyAgent }) as unknown as Response
  }
  return fetch(url, options)
}

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  idleTimeoutMillis: 0,
  connectionTimeoutMillis: 10000,
})
const db = drizzle(pool)

// R2 Client with proper timeout configuration
const r2Client = process.env.R2_ACCOUNT_ID ? new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 30000,  // 30 seconds connection timeout
    socketTimeout: 120000,     // 2 minutes socket timeout
  }),
  maxAttempts: 3, // Retry failed requests up to 3 times
}) : null

const R2_BUCKET = process.env.R2_BUCKET_NAME || 'bookpost-media'
// API base URL for cover serving
const API_BASE_URL = process.env.API_BASE_URL || 'https://bookpost-api-hono.fly.dev'

// Parse command line arguments
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const skipClear = args.includes('--skip-clear')
const sourceArg = args.find(a => a.startsWith('--source='))
const yearArg = args.find(a => a.startsWith('--year='))
const targetSource = sourceArg ? sourceArg.split('=')[1] : null
const targetYear = yearArg ? parseInt(yearArg.split('=')[1]) : null

// DeepSeek client
const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
})

// ISBN to R2 URL cache (in-memory deduplication)
const isbnCoverCache = new Map<string, string>()

interface ListSource {
  type: string
  name: string
  logoUrl: string
  baseUrl: string
  description: string
  yearsAvailable: number[]
  searchQuery: (year: number) => string
}

const LIST_SOURCES: ListSource[] = [
  {
    type: 'nyt_bestseller',
    name: 'New York Times',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/40/New_York_Times_logo_variation.jpg',
    baseUrl: 'https://www.nytimes.com/books/best-sellers/',
    description: 'The New York Times Best Sellers',
    yearsAvailable: [2025, 2024, 2023],
    searchQuery: (year) =>
      `New York Times bestseller books ${year} annual top 10 fiction nonfiction with ISBN-13`,
  },
  {
    type: 'amazon_best',
    name: 'Amazon',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
    baseUrl: 'https://www.amazon.com/b?node=8192263011',
    description: "Amazon's Best Books of the Year",
    yearsAvailable: [2025, 2024, 2023],
    searchQuery: (year) =>
      `Amazon best books ${year} editors picks top 10 fiction nonfiction ISBN-13`,
  },
  {
    type: 'bill_gates',
    name: 'Bill Gates',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Bill_Gates_2018.jpg',
    baseUrl: 'https://www.gatesnotes.com/Books',
    description: "Bill Gates' favorite books",
    yearsAvailable: [2024, 2023],
    searchQuery: (year) =>
      `Bill Gates favorite books ${year} gatesnotes reading list all books ISBN-13`,
  },
  {
    type: 'goodreads_choice',
    name: 'Goodreads',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Goodreads_logo.svg',
    baseUrl: 'https://www.goodreads.com/choiceawards',
    description: 'Goodreads Choice Awards winners',
    yearsAvailable: [2024, 2023],
    searchQuery: (year) =>
      `Goodreads Choice Awards ${year} winners fiction mystery fantasy romance ISBN-13`,
  },
  {
    type: 'booker',
    name: 'Booker Prize',
    logoUrl: 'https://thebookerprizes.com/sites/default/files/styles/large/public/booker-logo.png',
    baseUrl: 'https://thebookerprizes.com/',
    description: 'The Booker Prize for Fiction',
    yearsAvailable: [2024, 2023],
    searchQuery: (year) =>
      `Booker Prize ${year} winner shortlist longlist books ISBN-13`,
  },
  {
    type: 'pulitzer',
    name: 'Pulitzer Prize',
    logoUrl: 'https://www.pulitzer.org/sites/default/files/main_images/pulitzerprizes_0.png',
    baseUrl: 'https://www.pulitzer.org/prize-winners-by-category',
    description: 'Pulitzer Prize winners in Literature',
    yearsAvailable: [2024, 2023],
    searchQuery: (year) =>
      `Pulitzer Prize ${year} fiction nonfiction biography winners ISBN-13`,
  },
]

interface BookData {
  title: string
  author: string
  isbn13?: string
  description?: string
  position: number
}

interface FetchResult {
  source: ListSource
  year: number
  books: BookData[]
  listTitle: string
  listSubtitle: string
}

/**
 * Fetch books using DeepSeek AI
 */
async function fetchBooksWithAI(source: ListSource, year: number): Promise<BookData[]> {
  const query = source.searchQuery(year)
  console.log(`  🔍 Searching: "${query.substring(0, 50)}..."`)

  try {
    const response = await openai.chat.completions.create({
      model: 'deepseek-chat',
      max_tokens: 4096,
      messages: [
        {
          role: 'system',
          content: `You are a book expert. Provide REAL book data with accurate ISBN-13 numbers.`
        },
        {
          role: 'user',
          content: `Query: ${query}

Return as JSON array:
[{"title":"Title","author":"Author","isbn13":"9780123456789","description":"Brief description","position":1}]

Important:
- ONLY books ACTUALLY on this list for ${year}
- ISBN-13 must be 13 digits starting with 978/979
- Return 6-12 books
- Return ONLY JSON, no explanation`
        }
      ],
      temperature: 0.1,
    })

    const content = response.choices[0]?.message?.content
    if (!content) return []

    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    const books: BookData[] = JSON.parse(jsonMatch[0])
    console.log(`  ✓ Found ${books.length} books`)
    return books
  } catch (error) {
    console.error(`  ❌ Error:`, error instanceof Error ? error.message : error)
    return []
  }
}

/**
 * Check if cover exists in R2
 */
async function coverExistsInR2(isbn: string): Promise<boolean> {
  if (!r2Client) return false

  try {
    await r2Client.send(new HeadObjectCommand({
      Bucket: R2_BUCKET,
      Key: `covers/rankings/${isbn}.jpg`,
    }))
    return true
  } catch {
    return false
  }
}

/**
 * Download cover image from URL with timeout
 */
async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    const response = await fetchWithProxy(url, {
      headers: { 'User-Agent': 'BookPost/1.0' },
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) return null
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch {
    return null
  }
}

/**
 * Get cover URL from Google Books API (try ISBN first, then title+author)
 */
async function getGoogleBooksCoverUrl(isbn: string, title?: string, author?: string): Promise<string | null> {
  // Try ISBN first
  const isbnResult = await searchGoogleBooks(`isbn:${isbn}`)
  if (isbnResult) return isbnResult

  // Fallback to title+author search
  if (title && author) {
    const titleAuthorResult = await searchGoogleBooks(`intitle:${title} inauthor:${author}`)
    if (titleAuthorResult) return titleAuthorResult

    // Try just title
    const titleResult = await searchGoogleBooks(`intitle:${title}`)
    if (titleResult) return titleResult
  }

  return null
}

async function searchGoogleBooks(query: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const response = await fetchWithProxy(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=3`,
      { signal: controller.signal }
    )

    clearTimeout(timeout)

    const data = await response.json()

    // Check all results for best cover
    for (const item of (data as { items?: Array<{ volumeInfo?: { imageLinks?: { thumbnail?: string } } }> }).items || []) {
      const imageLinks = item.volumeInfo?.imageLinks
      if (imageLinks?.thumbnail) {
        let url = imageLinks.thumbnail
        url = url.replace('zoom=1', 'zoom=2').replace('http://', 'https://')
        return url
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Upload cover to R2 and return the public URL
 */
async function uploadCoverToR2(isbn: string, imageBuffer: Buffer): Promise<string | null> {
  if (!r2Client) {
    console.log(`       ⚠️ R2 not configured`)
    return null
  }

  const key = `covers/rankings/${isbn}.jpg`

  try {
    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: imageBuffer,
      ContentType: 'image/jpeg',
    }))

    // Return API URL for serving
    return `${API_BASE_URL}/api/r2-covers/rankings/${isbn}.jpg`
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.log(`       ⚠️ R2 upload failed for ${isbn}: ${errMsg.substring(0, 60)}`)
    return null
  }
}

/**
 * Get or upload cover for a book with retries
 */
async function getCoverUrl(isbn: string, title?: string, author?: string): Promise<string | null> {
  const cleanIsbn = isbn.replace(/-/g, '')

  // 1. Check in-memory cache
  if (isbnCoverCache.has(cleanIsbn)) {
    return isbnCoverCache.get(cleanIsbn)!
  }

  // Small delay to prevent rate limiting
  await new Promise(r => setTimeout(r, 300))

  // 2. Check if already in R2
  try {
    if (await coverExistsInR2(cleanIsbn)) {
      const url = `${API_BASE_URL}/api/r2-covers/rankings/${cleanIsbn}.jpg`
      isbnCoverCache.set(cleanIsbn, url)
      return url
    }
  } catch (e) {
    // Ignore R2 check errors, proceed to download
  }

  // 3. Download from Google Books (try ISBN first, then title+author)
  const googleUrl = await getGoogleBooksCoverUrl(cleanIsbn, title, author)
  if (googleUrl) {
    const imageBuffer = await downloadImage(googleUrl)
    if (imageBuffer && imageBuffer.length > 1000) { // At least 1KB (not a placeholder)
      // Retry R2 upload up to 3 times
      for (let attempt = 1; attempt <= 3; attempt++) {
        const r2Url = await uploadCoverToR2(cleanIsbn, imageBuffer)
        if (r2Url) {
          isbnCoverCache.set(cleanIsbn, r2Url)
          return r2Url
        }
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 2000 * attempt)) // Exponential backoff
        }
      }
      console.log(`       ⚠️ All R2 upload attempts failed for ${cleanIsbn}`)
    } else {
      console.log(`       ⚠️ Image too small/failed for ${cleanIsbn}`)
    }
  } else {
    console.log(`       ⚠️ No cover found for ${cleanIsbn} (${title})`)
  }

  // 4. Fallback: Open Library (direct URL, not uploaded)
  const openLibraryUrl = `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`
  isbnCoverCache.set(cleanIsbn, openLibraryUrl)
  return openLibraryUrl
}

/**
 * Save to database
 */
async function saveToDatabase(result: FetchResult): Promise<void> {
  if (result.books.length === 0) {
    console.log(`  ⏭️ No books to save`)
    return
  }

  const maxRetries = 3
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Check if exists
      const existing = await db
        .select({ id: curatedLists.id })
        .from(curatedLists)
        .where(and(
          eq(curatedLists.listType, result.source.type),
          eq(curatedLists.year, result.year)
        ))
        .limit(1)

      if (existing.length > 0) {
        console.log(`  ⏭️ List exists (id: ${existing[0].id})`)
        return
      }

      // Insert list
      const [list] = await db.insert(curatedLists).values({
        listType: result.source.type,
        title: result.listTitle,
        subtitle: result.listSubtitle,
        description: result.source.description,
        sourceName: result.source.name,
        sourceUrl: result.source.baseUrl,
        sourceLogoUrl: result.source.logoUrl,
        year: result.year,
        bookCount: result.books.length,
        viewCount: 0,
        saveCount: 0,
        isFeatured: true,
        isActive: true,
      }).returning()

      console.log(`  ✓ Created list: ${result.listTitle} (id: ${list.id})`)

      // Insert items with covers
      for (const book of result.books) {
        let coverUrl: string | null = null

        if (book.isbn13) {
          coverUrl = await getCoverUrl(book.isbn13, book.title, book.author)
        }

        await db.insert(curatedListItems).values({
          listId: list.id,
          bookType: 'ebook',
          bookId: null,
          externalTitle: book.title,
          externalAuthor: book.author,
          externalDescription: book.description || null,
          externalCoverUrl: coverUrl,
          isbn: book.isbn13?.replace(/-/g, '') || null,
          amazonUrl: `https://www.amazon.com/s?k=${encodeURIComponent(book.title + ' ' + book.author)}`,
          goodreadsUrl: `https://www.goodreads.com/search?q=${encodeURIComponent(book.title)}`,
          position: book.position,
        })

        console.log(`     ${book.position}. ${book.title} ${coverUrl?.includes('r2-covers') ? '✓R2' : coverUrl ? '✓OL' : '⚠️'}`)
      }

      console.log(`  ✓ Added ${result.books.length} books`)
      return
    } catch (error) {
      console.log(`  ⚠️ Error (${attempt}/${maxRetries}): ${String(error).substring(0, 50)}`)
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, 2000))
    }
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('     POPULATE RANKINGS WITH R2 COVERS')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`R2 configured: ${!!r2Client}`)
  if (targetSource) console.log(`Source: ${targetSource}`)
  if (targetYear) console.log(`Year: ${targetYear}`)
  console.log('═══════════════════════════════════════════════════════════════\n')

  if (!process.env.DEEPSEEK_API_KEY) {
    console.error('❌ DEEPSEEK_API_KEY required')
    process.exit(1)
  }

  try {
    // Clear existing
    if (!skipClear && !dryRun) {
      console.log('🗑️ Clearing existing data...')
      await db.delete(curatedListItems)
      await db.delete(curatedLists)
      console.log('  ✓ Cleared\n')
    }

    const sources = targetSource
      ? LIST_SOURCES.filter(s => s.type === targetSource)
      : LIST_SOURCES

    let totalLists = 0
    let totalBooks = 0
    let r2Uploads = 0

    for (const source of sources) {
      console.log(`\n📚 ${source.name}`)
      console.log('─'.repeat(50))

      const years = targetYear
        ? source.yearsAvailable.filter(y => y === targetYear)
        : source.yearsAvailable

      for (const year of years) {
        const listTitle = `${source.name} Best Books ${year}`
        const listSubtitle = `Top picks of ${year}`

        console.log(`\n  📋 ${listTitle}`)

        const books = await fetchBooksWithAI(source, year)

        if (books.length > 0) {
          const result: FetchResult = {
            source,
            year,
            books,
            listTitle,
            listSubtitle,
          }

          if (!dryRun) {
            const beforeCache = isbnCoverCache.size
            await saveToDatabase(result)
            r2Uploads += isbnCoverCache.size - beforeCache
          } else {
            for (const book of books.slice(0, 5)) {
              console.log(`     ${book.position}. "${book.title}" by ${book.author}`)
            }
            if (books.length > 5) console.log(`     ... and ${books.length - 5} more`)
          }

          totalLists++
          totalBooks += books.length
        }

        await new Promise(r => setTimeout(r, 2000)) // Rate limit
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════════')
    console.log('                    COMPLETE')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log(`📋 Lists:       ${totalLists}`)
    console.log(`📚 Books:       ${totalBooks}`)
    console.log(`☁️  R2 Uploads:  ${r2Uploads}`)
    console.log(`💾 Deduplicated: ${totalBooks - r2Uploads}`)
    console.log('═══════════════════════════════════════════════════════════════\n')

    if (dryRun) {
      console.log('💡 Run without --dry-run to save.\n')
    }
  } catch (error) {
    console.error('❌ Error:', error)
    await pool.end()
    process.exit(1)
  }

  await pool.end()
  process.exit(0)
}

main()
