/**
 * Check all ranking covers and identify placeholder images
 *
 * Run with:
 *   npx tsx src/scripts/check-ranking-covers.ts
 */

import 'dotenv/config'
import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { NodeHttpHandler } from '@smithy/node-http-handler'
import { ProxyAgent, fetch as undiciFetch } from 'undici'

// Create proxy-aware fetch
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
const proxyAgent = proxyUrl ? new ProxyAgent(proxyUrl) : null

async function fetchWithProxy(url: string): Promise<Response> {
  if (proxyAgent) {
    return undiciFetch(url, { dispatcher: proxyAgent }) as unknown as Response
  }
  return fetch(url)
}

// R2 Client
const r2Client = process.env.R2_ACCOUNT_ID ? new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 30000,
    socketTimeout: 120000,
  }),
  maxAttempts: 3,
}) : null

const R2_BUCKET = process.env.R2_BUCKET_NAME || 'bookpost-media'

interface BookInfo {
  isbn: string
  title: string
  author: string
  coverSize: number
  needsFix: boolean
}

// Known placeholder image sizes (Google Books "image not available" placeholders)
const PLACEHOLDER_SIZES = [15567, 15568, 15569, 15570, 807, 808, 809]
const MIN_VALID_COVER_SIZE = 10000  // Real covers should be at least 10KB

async function getCoverSize(isbn: string): Promise<number> {
  if (!r2Client) {
    console.log('R2 not configured')
    return 0
  }

  const key = `covers/rankings/${isbn}.jpg`

  try {
    const response = await r2Client.send(new HeadObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    }))
    return response.ContentLength || 0
  } catch (e) {
    return 0
  }
}

async function getAllRankingBooks(): Promise<BookInfo[]> {
  const books: BookInfo[] = []
  const seenIsbns = new Set<string>()

  // Get all ranking IDs
  const rankingIds = [391, 392, 393, 394, 395, 396, 397, 398, 399, 400, 401, 402, 403, 404]

  for (const id of rankingIds) {
    try {
      const response = await fetchWithProxy(`https://bookpost-api-hono.fly.dev/api/store/external-rankings/${id}`)
      const data = await response.json() as {
        books: Array<{
          book: {
            title: string
            author: string
            coverUrl: string
          }
        }>
      }

      for (const item of data.books || []) {
        // Extract ISBN from cover URL
        const match = item.book.coverUrl?.match(/\/rankings\/(\d+)\.jpg/)
        if (match && !seenIsbns.has(match[1])) {
          seenIsbns.add(match[1])
          books.push({
            isbn: match[1],
            title: item.book.title,
            author: item.book.author,
            coverSize: 0,
            needsFix: false,
          })
        }
      }
    } catch (e) {
      console.error(`Failed to fetch ranking ${id}:`, e)
    }
  }

  return books
}

async function searchGoogleBooks(title: string, author: string): Promise<{ coverUrl: string | null, googleId: string | null }> {
  const query = encodeURIComponent(`${title} ${author}`)
  const url = `https://www.googleapis.com/books/v1/volumes?q=${query}`

  try {
    const response = await fetchWithProxy(url)
    const data = await response.json() as {
      items?: Array<{
        id: string
        volumeInfo?: {
          imageLinks?: {
            thumbnail?: string
            small?: string
            medium?: string
            large?: string
          }
        }
      }>
    }

    if (data.items?.[0]) {
      const item = data.items[0]
      const imageLinks = item.volumeInfo?.imageLinks
      // Get the best available image
      let coverUrl = imageLinks?.large || imageLinks?.medium || imageLinks?.small || imageLinks?.thumbnail
      if (coverUrl) {
        // Get larger version
        coverUrl = coverUrl.replace('zoom=1', 'zoom=2').replace('&edge=curl', '')
        return { coverUrl, googleId: item.id }
      }
    }
  } catch (e) {
    console.error(`Google Books search failed for "${title}":`, e)
  }

  return { coverUrl: null, googleId: null }
}

async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const response = await fetchWithProxy(url)
    if (!response.ok) return null
    return Buffer.from(await response.arrayBuffer())
  } catch (e) {
    return null
  }
}

async function uploadToR2(isbn: string, buffer: Buffer): Promise<boolean> {
  if (!r2Client) return false

  const key = `covers/rankings/${isbn}.jpg`

  try {
    // Detect content type
    let contentType = 'image/jpeg'
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      contentType = 'image/png'
    }

    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }))
    return true
  } catch (e) {
    console.error(`Upload failed for ${isbn}:`, e)
    return false
  }
}

async function main() {
  console.log('🔍 Checking all ranking covers...\n')

  // Step 1: Get all books from rankings
  console.log('📚 Fetching all books from external rankings...')
  const books = await getAllRankingBooks()
  console.log(`Found ${books.length} unique books\n`)

  // Step 2: Check cover sizes
  console.log('📏 Checking cover sizes in R2...')
  const booksNeedingFix: BookInfo[] = []

  for (const book of books) {
    book.coverSize = await getCoverSize(book.isbn)
    book.needsFix = book.coverSize === 0 ||
                    PLACEHOLDER_SIZES.includes(book.coverSize) ||
                    book.coverSize < MIN_VALID_COVER_SIZE

    const status = book.needsFix ? '❌' : '✅'
    console.log(`${status} ${book.isbn} (${book.coverSize} bytes) - ${book.title}`)

    if (book.needsFix) {
      booksNeedingFix.push(book)
    }
  }

  console.log(`\n📊 Summary: ${booksNeedingFix.length} books need fixing out of ${books.length} total\n`)

  if (booksNeedingFix.length === 0) {
    console.log('✅ All covers are valid!')
    process.exit(0)
  }

  // Step 3: Fix the covers
  console.log('🔧 Fixing covers...\n')

  let fixed = 0
  let failed = 0

  for (const book of booksNeedingFix) {
    console.log(`\n📖 ${book.title} by ${book.author} (${book.isbn})`)
    console.log(`   Current size: ${book.coverSize} bytes`)

    // Search Google Books for a better cover
    const { coverUrl, googleId } = await searchGoogleBooks(book.title, book.author)

    if (!coverUrl) {
      console.log(`   ⚠️ No cover found on Google Books`)

      // Try Open Library as fallback
      const olUrl = `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg`
      const olBuffer = await downloadImage(olUrl)

      if (olBuffer && olBuffer.length > MIN_VALID_COVER_SIZE) {
        console.log(`   📥 Downloaded from Open Library: ${olBuffer.length} bytes`)
        if (await uploadToR2(book.isbn, olBuffer)) {
          console.log(`   ✅ Fixed!`)
          fixed++
        } else {
          console.log(`   ❌ Upload failed`)
          failed++
        }
      } else {
        console.log(`   ❌ Could not find valid cover`)
        failed++
      }
      continue
    }

    console.log(`   📥 Found on Google Books (${googleId}): ${coverUrl}`)
    const buffer = await downloadImage(coverUrl)

    if (!buffer || buffer.length < MIN_VALID_COVER_SIZE) {
      console.log(`   ⚠️ Downloaded image too small (${buffer?.length || 0} bytes), trying alternate URL...`)

      // Try direct Google Books content URL
      if (googleId) {
        const directUrl = `http://books.google.com/books/content?id=${googleId}&printsec=frontcover&img=1&zoom=2&source=gbs_api`
        const directBuffer = await downloadImage(directUrl)

        if (directBuffer && directBuffer.length > MIN_VALID_COVER_SIZE) {
          console.log(`   📥 Downloaded via direct URL: ${directBuffer.length} bytes`)
          if (await uploadToR2(book.isbn, directBuffer)) {
            console.log(`   ✅ Fixed!`)
            fixed++
          } else {
            console.log(`   ❌ Upload failed`)
            failed++
          }
          continue
        }
      }

      // Try Open Library as fallback
      const olUrl = `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg`
      const olBuffer = await downloadImage(olUrl)

      if (olBuffer && olBuffer.length > MIN_VALID_COVER_SIZE) {
        console.log(`   📥 Downloaded from Open Library: ${olBuffer.length} bytes`)
        if (await uploadToR2(book.isbn, olBuffer)) {
          console.log(`   ✅ Fixed!`)
          fixed++
        } else {
          console.log(`   ❌ Upload failed`)
          failed++
        }
      } else {
        console.log(`   ❌ Could not find valid cover`)
        failed++
      }
      continue
    }

    console.log(`   📥 Downloaded: ${buffer.length} bytes`)
    if (await uploadToR2(book.isbn, buffer)) {
      console.log(`   ✅ Fixed!`)
      fixed++
    } else {
      console.log(`   ❌ Upload failed`)
      failed++
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  console.log(`\n\n📊 Final Summary:`)
  console.log(`   ✅ Fixed: ${fixed}`)
  console.log(`   ❌ Failed: ${failed}`)
  console.log(`   📚 Total checked: ${books.length}`)

  process.exit(0)
}

main().catch(console.error)
