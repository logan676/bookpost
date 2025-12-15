/**
 * Fix books that still have placeholder covers
 *
 * Run with:
 *   npx tsx src/scripts/fix-placeholder-covers.ts
 */

import 'dotenv/config'
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
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

// Known placeholder sizes
const PLACEHOLDER_SIZE = 15567
const MIN_VALID_SIZE = 10000

// Books that still need fixing (downloaded placeholder instead of real cover)
const BOOKS_TO_FIX = [
  { isbn: '9781250178602', title: 'The Four Winds', author: 'Kristin Hannah' },
  { isbn: '9781524798659', title: 'Malibu Rising', author: 'Taylor Jenkins Reid' },
  { isbn: '9780593593806', title: 'Spare', author: 'Prince Harry Duke of Sussex' },
  { isbn: '9781649374172', title: 'Iron Flame', author: 'Rebecca Yarros' },
  { isbn: '9780571370262', title: 'The Bee Sting', author: 'Paul Murray' },
  { isbn: '9780571368703', title: 'Small Things Like These', author: 'Claire Keegan' },
  { isbn: '9781784743877', title: 'Trust', author: 'Hernan Diaz' },
  { isbn: '9781644450591', title: 'frank: sonnets', author: 'Diane Seuss' },
  { isbn: '9780008478630', title: 'Treacle Walker', author: 'Alan Garner' },
]

async function getCoverSize(isbn: string): Promise<number> {
  if (!r2Client) return 0

  try {
    const response = await r2Client.send(new HeadObjectCommand({
      Bucket: R2_BUCKET,
      Key: `covers/rankings/${isbn}.jpg`,
    }))
    return response.ContentLength || 0
  } catch {
    return 0
  }
}

async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const response = await fetchWithProxy(url)
    if (!response.ok) return null
    return Buffer.from(await response.arrayBuffer())
  } catch {
    return null
  }
}

async function uploadToR2(isbn: string, buffer: Buffer): Promise<boolean> {
  if (!r2Client) return false

  try {
    // Detect content type
    let contentType = 'image/jpeg'
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      contentType = 'image/png'
    }

    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: `covers/rankings/${isbn}.jpg`,
      Body: buffer,
      ContentType: contentType,
    }))
    return true
  } catch (e) {
    console.error(`Upload failed for ${isbn}:`, e)
    return false
  }
}

// Try multiple sources for cover images
async function findValidCover(book: { isbn: string; title: string; author: string }): Promise<Buffer | null> {
  console.log(`\n📖 ${book.title} by ${book.author} (${book.isbn})`)

  // 1. Try Open Library first (often has better covers)
  console.log('   Trying Open Library...')
  const olUrl = `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg`
  let buffer = await downloadImage(olUrl)
  if (buffer && buffer.length > MIN_VALID_SIZE && buffer.length !== PLACEHOLDER_SIZE) {
    console.log(`   ✅ Found on Open Library: ${buffer.length} bytes`)
    return buffer
  }

  // 2. Try Google Books API search with title+author
  console.log('   Trying Google Books title search...')
  const query = encodeURIComponent(`intitle:${book.title} inauthor:${book.author}`)
  const searchUrl = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=5`

  try {
    const response = await fetchWithProxy(searchUrl)
    const data = await response.json() as {
      items?: Array<{
        id: string
        volumeInfo?: {
          title?: string
          authors?: string[]
          imageLinks?: {
            thumbnail?: string
            small?: string
            medium?: string
            large?: string
            extraLarge?: string
          }
        }
      }>
    }

    // Try each result until we find a valid cover
    for (const item of data.items || []) {
      const imageLinks = item.volumeInfo?.imageLinks
      if (!imageLinks) continue

      // Try largest available image
      const imageUrl = imageLinks.extraLarge || imageLinks.large || imageLinks.medium || imageLinks.small || imageLinks.thumbnail
      if (!imageUrl) continue

      // Get zoom=2 version
      const betterUrl = imageUrl.replace('zoom=1', 'zoom=2').replace('&edge=curl', '')
      buffer = await downloadImage(betterUrl)

      if (buffer && buffer.length > MIN_VALID_SIZE && buffer.length !== PLACEHOLDER_SIZE) {
        console.log(`   ✅ Found via Google Books search (${item.id}): ${buffer.length} bytes`)
        return buffer
      }

      // Also try direct content URL
      const directUrl = `http://books.google.com/books/content?id=${item.id}&printsec=frontcover&img=1&zoom=2&source=gbs_api`
      buffer = await downloadImage(directUrl)

      if (buffer && buffer.length > MIN_VALID_SIZE && buffer.length !== PLACEHOLDER_SIZE) {
        console.log(`   ✅ Found via Google Books direct URL (${item.id}): ${buffer.length} bytes`)
        return buffer
      }
    }
  } catch (e) {
    console.log(`   ⚠️ Google Books search error: ${e}`)
  }

  // 3. Try ISBN search with different formats
  console.log('   Trying ISBN-10 format...')
  // Convert ISBN-13 to ISBN-10 if possible
  if (book.isbn.startsWith('978')) {
    const isbn10 = book.isbn.slice(3, 12)
    // Calculate check digit
    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += parseInt(isbn10[i]) * (10 - i)
    }
    const checkDigit = (11 - (sum % 11)) % 11
    const isbn10Full = isbn10 + (checkDigit === 10 ? 'X' : checkDigit.toString())

    const olUrl10 = `https://covers.openlibrary.org/b/isbn/${isbn10Full}-L.jpg`
    buffer = await downloadImage(olUrl10)
    if (buffer && buffer.length > MIN_VALID_SIZE && buffer.length !== PLACEHOLDER_SIZE) {
      console.log(`   ✅ Found via ISBN-10 on Open Library: ${buffer.length} bytes`)
      return buffer
    }
  }

  // 4. Try Bookcover API
  console.log('   Trying Bookcover API...')
  const bookcoverUrl = `https://bookcover.longitood.com/bookcover/${book.isbn}`
  try {
    const response = await fetchWithProxy(bookcoverUrl)
    const data = await response.json() as { url?: string }
    if (data.url) {
      buffer = await downloadImage(data.url)
      if (buffer && buffer.length > MIN_VALID_SIZE && buffer.length !== PLACEHOLDER_SIZE) {
        console.log(`   ✅ Found via Bookcover API: ${buffer.length} bytes`)
        return buffer
      }
    }
  } catch {
    // Ignore errors
  }

  console.log('   ❌ No valid cover found from any source')
  return null
}

async function main() {
  console.log('🔧 Fixing books with placeholder covers...\n')

  let fixed = 0
  let stillBroken = 0

  for (const book of BOOKS_TO_FIX) {
    const currentSize = await getCoverSize(book.isbn)
    console.log(`   Current size: ${currentSize} bytes ${currentSize === PLACEHOLDER_SIZE ? '(placeholder!)' : ''}`)

    const buffer = await findValidCover(book)

    if (buffer) {
      if (await uploadToR2(book.isbn, buffer)) {
        console.log(`   ✅ Uploaded to R2!`)
        fixed++
      } else {
        console.log(`   ❌ Failed to upload`)
        stillBroken++
      }
    } else {
      stillBroken++
    }

    // Delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log(`\n\n📊 Summary:`)
  console.log(`   ✅ Fixed: ${fixed}`)
  console.log(`   ❌ Still broken: ${stillBroken}`)

  process.exit(0)
}

main().catch(console.error)
