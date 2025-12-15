/**
 * Populate External Rankings with Real Book Data
 *
 * This script:
 * 1. Clears existing curated lists data
 * 2. Uses DeepSeek AI to fetch REAL bestseller list data
 * 3. Uses Google Books API to get high-quality cover URLs
 * 4. Saves everything to the database
 *
 * Run with:
 *   npx tsx src/scripts/populate-external-rankings.ts [options]
 *
 * Options:
 *   --dry-run         Preview without saving to database
 *   --skip-clear      Don't clear existing data
 *   --source=TYPE     Only fetch specific source (e.g., --source=bill_gates)
 *   --year=YYYY       Only fetch specific year (e.g., --year=2024)
 */

import 'dotenv/config'
import OpenAI from 'openai'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { curatedLists, curatedListItems } from '../db/schema'
import { eq, and, sql } from 'drizzle-orm'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  idleTimeoutMillis: 0,
  connectionTimeoutMillis: 10000,
})
const db = drizzle(pool)

// Parse command line arguments
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const skipClear = args.includes('--skip-clear')
const sourceArg = args.find(a => a.startsWith('--source='))
const yearArg = args.find(a => a.startsWith('--year='))
const targetSource = sourceArg ? sourceArg.split('=')[1] : null
const targetYear = yearArg ? parseInt(yearArg.split('=')[1]) : null

// Initialize DeepSeek client
const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
})

// List source configurations - focused on major bestseller lists
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
    description: 'The New York Times Best Sellers - Fiction and Nonfiction',
    yearsAvailable: [2024, 2023],
    searchQuery: (year) =>
      `New York Times bestseller books ${year} annual list top 10 fiction nonfiction with authors and ISBN-13`,
  },
  {
    type: 'amazon_best',
    name: 'Amazon',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
    baseUrl: 'https://www.amazon.com/b?node=8192263011',
    description: "Amazon's Best Books of the Year",
    yearsAvailable: [2024, 2023],
    searchQuery: (year) =>
      `Amazon best books of ${year} editors picks top 10 fiction nonfiction with authors and ISBN-13`,
  },
  {
    type: 'bill_gates',
    name: 'Bill Gates',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Bill_Gates_2018.jpg',
    baseUrl: 'https://www.gatesnotes.com/Books',
    description: "Bill Gates' favorite books of the year",
    yearsAvailable: [2024, 2023],
    searchQuery: (year) =>
      `Bill Gates favorite books ${year} gatesnotes annual reading list all books with ISBN-13`,
  },
  {
    type: 'goodreads_choice',
    name: 'Goodreads',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Goodreads_logo.svg',
    baseUrl: 'https://www.goodreads.com/choiceawards',
    description: 'Goodreads Choice Awards winners',
    yearsAvailable: [2024, 2023],
    searchQuery: (year) =>
      `Goodreads Choice Awards ${year} winners best fiction mystery fantasy romance with ISBN-13`,
  },
  {
    type: 'booker',
    name: 'Booker Prize',
    logoUrl: 'https://thebookerprizes.com/sites/default/files/styles/large/public/booker-logo.png',
    baseUrl: 'https://thebookerprizes.com/',
    description: 'The Booker Prize for Fiction',
    yearsAvailable: [2024, 2023],
    searchQuery: (year) =>
      `Booker Prize ${year} winner shortlist longlist all books with authors and ISBN-13`,
  },
  {
    type: 'pulitzer',
    name: 'Pulitzer Prize',
    logoUrl: 'https://www.pulitzer.org/sites/default/files/main_images/pulitzerprizes_0.png',
    baseUrl: 'https://www.pulitzer.org/prize-winners-by-category',
    description: 'Pulitzer Prize winners in Literature',
    yearsAvailable: [2024, 2023],
    searchQuery: (year) =>
      `Pulitzer Prize ${year} fiction nonfiction biography history winners with ISBN-13`,
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
  const searchQuery = source.searchQuery(year)
  console.log(`  🔍 Searching: "${searchQuery.substring(0, 60)}..."`)

  try {
    const response = await openai.chat.completions.create({
      model: 'deepseek-chat',
      max_tokens: 4096,
      messages: [
        {
          role: 'system',
          content: `You are a book expert with accurate knowledge of book awards and bestseller lists. Provide REAL, ACCURATE book data. Always include ISBN-13 when available.`
        },
        {
          role: 'user',
          content: `Query: ${searchQuery}

Return the REAL books for this list as JSON array:
[
  {
    "title": "Book Title",
    "author": "Author Name",
    "isbn13": "9780123456789",
    "description": "Brief 1-sentence description",
    "position": 1
  }
]

Important:
- ONLY include books that were ACTUALLY on this list for ${year}
- ISBN-13 must be 13 digits starting with 978 or 979
- Return 5-12 books
- Return ONLY the JSON array, no explanations`
        }
      ],
      temperature: 0.1,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      console.log(`  ⚠️ Empty response`)
      return []
    }

    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.log(`  ⚠️ Could not parse JSON`)
      return []
    }

    const books: BookData[] = JSON.parse(jsonMatch[0])
    console.log(`  ✓ Found ${books.length} books`)
    return books
  } catch (error) {
    console.error(`  ❌ Error:`, error instanceof Error ? error.message : error)
    return []
  }
}

/**
 * Get cover URL from Google Books API
 */
async function getGoogleBooksCover(isbn: string): Promise<string | null> {
  try {
    const cleanIsbn = isbn.replace(/-/g, '')
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}&maxResults=1`
    )
    const data = await response.json()

    if (data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail) {
      // Convert HTTP to HTTPS and get larger image
      let coverUrl = data.items[0].volumeInfo.imageLinks.thumbnail
      coverUrl = coverUrl.replace('http://', 'https://')
      // Get medium size instead of thumbnail
      coverUrl = coverUrl.replace('zoom=1', 'zoom=2')
      return coverUrl
    }
    return null
  } catch {
    return null
  }
}

/**
 * Get cover from Open Library (fallback)
 */
function getOpenLibraryCover(isbn: string): string {
  const cleanIsbn = isbn.replace(/-/g, '')
  return `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`
}

/**
 * Save fetched data to database
 */
async function saveToDatabase(result: FetchResult): Promise<void> {
  if (result.books.length === 0) {
    console.log(`  ⏭️ No books to save`)
    return
  }

  const maxRetries = 3
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Check if list exists
      const existing = await db
        .select({ id: curatedLists.id })
        .from(curatedLists)
        .where(
          and(
            eq(curatedLists.listType, result.source.type),
            eq(curatedLists.year, result.year)
          )
        )
        .limit(1)

      if (existing.length > 0) {
        console.log(`  ⏭️ List already exists (id: ${existing[0].id})`)
        return
      }

      // Insert list
      const [insertedList] = await db.insert(curatedLists).values({
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

      console.log(`  ✓ Created list: ${result.listTitle} (id: ${insertedList.id})`)

      // Insert items with covers
      for (const book of result.books) {
        let coverUrl: string | null = null

        // Try Google Books first
        if (book.isbn13) {
          coverUrl = await getGoogleBooksCover(book.isbn13)
          if (!coverUrl) {
            // Fallback to Open Library
            coverUrl = getOpenLibraryCover(book.isbn13)
          }
        }

        await db.insert(curatedListItems).values({
          listId: insertedList.id,
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

        console.log(`     ${book.position}. ${book.title} ${coverUrl ? '✓' : '⚠️ no cover'}`)
      }

      console.log(`  ✓ Added ${result.books.length} books with covers`)
      return
    } catch (error) {
      console.log(`  ⚠️ DB error (attempt ${attempt}/${maxRetries}): ${String(error).substring(0, 50)}`)
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 2000))
      }
    }
  }
  console.log(`  ❌ Failed to save after ${maxRetries} attempts`)
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('        POPULATE EXTERNAL RANKINGS')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  if (targetSource) console.log(`Source filter: ${targetSource}`)
  if (targetYear) console.log(`Year filter: ${targetYear}`)
  console.log('═══════════════════════════════════════════════════════════════\n')

  if (!process.env.DEEPSEEK_API_KEY) {
    console.error('❌ DEEPSEEK_API_KEY environment variable is required')
    process.exit(1)
  }

  try {
    // Clear existing data
    if (!skipClear && !dryRun) {
      console.log('🗑️ Clearing existing curated lists...')
      await db.delete(curatedListItems)
      await db.delete(curatedLists)
      console.log('  ✓ Cleared\n')
    }

    const sources = targetSource
      ? LIST_SOURCES.filter(s => s.type === targetSource)
      : LIST_SOURCES

    let totalLists = 0
    let totalBooks = 0

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
            await saveToDatabase(result)
          } else {
            for (const book of books.slice(0, 5)) {
              console.log(`     ${book.position}. "${book.title}" by ${book.author}`)
            }
            if (books.length > 5) console.log(`     ... and ${books.length - 5} more`)
          }

          totalLists++
          totalBooks += books.length
        }

        // Rate limiting
        await new Promise(r => setTimeout(r, 2000))
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════════')
    console.log('                    COMPLETE')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log(`📋 Lists created:  ${totalLists}`)
    console.log(`📚 Books added:    ${totalBooks}`)
    console.log('═══════════════════════════════════════════════════════════════\n')

    if (dryRun) {
      console.log('💡 This was a dry run. Run without --dry-run to save to database.\n')
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
