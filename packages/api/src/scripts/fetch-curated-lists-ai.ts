/**
 * Fetch Curated Lists with AI - Get real book data from external sources
 *
 * This script uses AI/web search to fetch REAL book data from:
 * - NYT Bestsellers
 * - Amazon Best Books
 * - Bill Gates Reading List
 * - Goodreads Choice Awards
 * - Pulitzer Prize Winners
 * - Booker Prize Winners
 * - And more...
 *
 * Run with:
 *   npx tsx src/scripts/fetch-curated-lists-ai.ts [options]
 *
 * Options:
 *   --dry-run         Preview without saving to database
 *   --source=TYPE     Only fetch specific source (e.g., --source=bill_gates)
 *   --year=YYYY       Only fetch specific year (e.g., --year=2024)
 *   --clear           Clear existing data before import
 */

import 'dotenv/config'
import OpenAI from 'openai'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { curatedLists, curatedListItems } from '../db/schema'
import { eq, and, sql } from 'drizzle-orm'

// Use DIRECT_URL to bypass connection pooler (pgbouncer) which times out on slow operations
const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  idleTimeoutMillis: 0, // Keep connections alive
  connectionTimeoutMillis: 10000,
})
const db = drizzle(pool)

// Parse command line arguments
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const clearExisting = args.includes('--clear')
const sourceArg = args.find(a => a.startsWith('--source='))
const yearArg = args.find(a => a.startsWith('--year='))
const targetSource = sourceArg ? sourceArg.split('=')[1] : null
const targetYear = yearArg ? parseInt(yearArg.split('=')[1]) : null

// Initialize DeepSeek client (OpenAI-compatible API)
const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
})

// List source configurations
interface ListSource {
  type: string
  name: string
  logoUrl: string
  baseUrl: string
  description: string
  categories?: string[]
  yearsAvailable: number[]
  searchQuery: (year: number, category?: string) => string
}

const LIST_SOURCES: ListSource[] = [
  {
    type: 'nyt_bestseller',
    name: 'New York Times',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/40/New_York_Times_logo_variation.jpg',
    baseUrl: 'https://www.nytimes.com/books/best-sellers/',
    description: 'The New York Times Best Sellers list',
    categories: ['fiction', 'nonfiction'],
    yearsAvailable: [2024, 2023, 2022, 2021, 2020],
    searchQuery: (year, category) =>
      `New York Times best selling ${category || ''} books ${year} top 10 list with authors and ISBN`,
  },
  {
    type: 'amazon_best',
    name: 'Amazon',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
    baseUrl: 'https://www.amazon.com/b?node=8192263011',
    description: "Amazon editors' picks for the best books of the year",
    categories: ['fiction', 'nonfiction', 'mystery', 'science_fiction', 'biography', 'history'],
    yearsAvailable: [2024, 2023, 2022, 2021, 2020],
    searchQuery: (year, category) =>
      `Amazon best ${category?.replace('_', ' ') || ''} books of ${year} editors picks top 10`,
  },
  {
    type: 'bill_gates',
    name: 'Bill Gates',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Bill_Gates_2018.jpg',
    baseUrl: 'https://www.gatesnotes.com/Books',
    description: 'Books recommended by Bill Gates',
    yearsAvailable: [2024, 2023, 2022, 2021, 2020],
    searchQuery: (year) =>
      `Bill Gates favorite books ${year} reading list recommendations gatesnotes`,
  },
  {
    type: 'goodreads_choice',
    name: 'Goodreads',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Goodreads_logo.svg',
    baseUrl: 'https://www.goodreads.com/choiceawards',
    description: 'Goodreads Choice Awards - voted by readers',
    categories: ['fiction', 'mystery', 'fantasy', 'romance', 'science_fiction', 'nonfiction'],
    yearsAvailable: [2024, 2023, 2022, 2021, 2020],
    searchQuery: (year, category) =>
      `Goodreads Choice Awards ${year} best ${category?.replace('_', ' ') || 'fiction'} winner and nominees`,
  },
  {
    type: 'pulitzer',
    name: 'Pulitzer Prize',
    logoUrl: 'https://www.pulitzer.org/sites/default/files/main_images/pulitzerprizes_0.png',
    baseUrl: 'https://www.pulitzer.org/prize-winners-by-category',
    description: 'Pulitzer Prize winners and finalists',
    categories: ['fiction', 'nonfiction', 'biography', 'history'],
    yearsAvailable: [2024, 2023, 2022, 2021, 2020],
    searchQuery: (year, category) =>
      `Pulitzer Prize ${year} ${category || 'fiction'} winner and finalists books`,
  },
  {
    type: 'booker',
    name: 'Booker Prize',
    logoUrl: 'https://thebookerprizes.com/sites/default/files/styles/large/public/booker-logo.png',
    baseUrl: 'https://thebookerprizes.com/',
    description: 'The Booker Prize for Fiction',
    yearsAvailable: [2024, 2023, 2022, 2021, 2020],
    searchQuery: (year) =>
      `Booker Prize ${year} winner and shortlist longlist books authors`,
  },
  {
    type: 'national_book',
    name: 'National Book Foundation',
    logoUrl: 'https://www.nationalbook.org/wp-content/themes/developer/images/nba-logo.svg',
    baseUrl: 'https://www.nationalbook.org/national-book-awards/',
    description: 'National Book Award winners and finalists',
    categories: ['fiction', 'nonfiction', 'poetry', 'young_adult'],
    yearsAvailable: [2024, 2023, 2022, 2021, 2020],
    searchQuery: (year, category) =>
      `National Book Award ${year} ${category?.replace('_', ' ') || 'fiction'} winner finalists`,
  },
  {
    type: 'oprah_book_club',
    name: "Oprah's Book Club",
    logoUrl: 'https://www.oprahdaily.com/images/oprah-book-club-logo.png',
    baseUrl: 'https://www.oprah.com/app/books.html',
    description: "Oprah Winfrey's book club selections",
    yearsAvailable: [2024, 2023, 2022, 2021, 2020],
    searchQuery: (year) =>
      `Oprah Book Club picks ${year} selections all books`,
  },
  {
    type: 'reese_book_club',
    name: "Reese's Book Club",
    logoUrl: 'https://reesesbookclub.com/images/logo.png',
    baseUrl: 'https://reesesbookclub.com/',
    description: "Reese Witherspoon's book club picks featuring women-centered stories",
    yearsAvailable: [2024, 2023, 2022, 2021, 2020],
    searchQuery: (year) =>
      `Reese Witherspoon Book Club ${year} all picks selections`,
  },
  {
    type: 'obama_reading',
    name: 'Barack Obama',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8d/President_Barack_Obama.jpg',
    baseUrl: 'https://barackobama.medium.com/',
    description: "Barack Obama's annual reading recommendations",
    yearsAvailable: [2024, 2023, 2022, 2021, 2020],
    searchQuery: (year) =>
      `Barack Obama favorite books ${year} reading list recommendations`,
  },
  {
    type: 'time_100',
    name: 'TIME Magazine',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/TIME_logo.svg',
    baseUrl: 'https://time.com/collection/must-read-books/',
    description: "TIME's list of must-read books",
    yearsAvailable: [2024, 2023, 2022, 2021, 2020],
    searchQuery: (year) =>
      `TIME Magazine best books ${year} must read list`,
  },
  {
    type: 'npr_books',
    name: 'NPR',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d7/National_Public_Radio_logo.svg',
    baseUrl: 'https://apps.npr.org/best-books/',
    description: "NPR's Best Books of the Year",
    categories: ['fiction', 'nonfiction', 'science_fiction', 'mystery'],
    yearsAvailable: [2024, 2023, 2022, 2021, 2020],
    searchQuery: (year, category) =>
      `NPR best books ${year} ${category?.replace('_', ' ') || ''} recommendations`,
  },
  {
    type: 'guardian_best',
    name: 'The Guardian',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0e/The_Guardian.svg',
    baseUrl: 'https://www.theguardian.com/books/best-books',
    description: "The Guardian's best books of the year",
    categories: ['fiction', 'nonfiction'],
    yearsAvailable: [2024, 2023, 2022, 2021, 2020],
    searchQuery: (year, category) =>
      `The Guardian best ${category || ''} books ${year} picks`,
  },
  {
    type: 'economist_books',
    name: 'The Economist',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/65/The_Economist_Logo.svg',
    baseUrl: 'https://www.economist.com/culture/books-of-the-year',
    description: "The Economist's Books of the Year",
    yearsAvailable: [2024, 2023, 2022, 2021, 2020],
    searchQuery: (year) =>
      `The Economist best books ${year} books of the year`,
  },
  {
    type: 'financial_times',
    name: 'Financial Times',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Financial_Times_corporate_logo.svg',
    baseUrl: 'https://www.ft.com/books',
    description: 'Financial Times Best Books of the Year',
    categories: ['business', 'economics', 'politics'],
    yearsAvailable: [2024, 2023, 2022, 2021, 2020],
    searchQuery: (year, category) =>
      `Financial Times best ${category || 'business'} books ${year}`,
  },
]

const CATEGORY_NAMES: Record<string, string> = {
  fiction: 'Fiction',
  nonfiction: 'Nonfiction',
  mystery: 'Mystery & Thriller',
  science_fiction: 'Science Fiction',
  fantasy: 'Fantasy',
  romance: 'Romance',
  horror: 'Horror',
  biography: 'Biography & Memoir',
  history: 'History',
  poetry: 'Poetry',
  young_adult: 'Young Adult',
  business: 'Business & Economics',
  economics: 'Economics',
  politics: 'Politics',
  science: 'Science & Technology',
  memoir: 'Memoir',
}

interface BookData {
  title: string
  author: string
  isbn?: string
  description?: string
  coverUrl?: string
  amazonUrl?: string
  goodreadsUrl?: string
  position: number
}

interface FetchResult {
  source: ListSource
  year: number
  category?: string
  books: BookData[]
  listTitle: string
  listSubtitle: string
}

/**
 * Use DeepSeek AI to generate accurate book data
 */
async function fetchBooksWithAI(
  source: ListSource,
  year: number,
  category?: string
): Promise<BookData[]> {
  const searchQuery = source.searchQuery(year, category)

  console.log(`  🔍 Searching: "${searchQuery}"`)

  try {
    // Use DeepSeek to get book data
    const response = await openai.chat.completions.create({
      model: 'deepseek-chat',
      max_tokens: 4096,
      messages: [
        {
          role: 'system',
          content: `You are a book expert with accurate knowledge of book awards, bestseller lists, and celebrity reading recommendations. You must provide accurate, real book data from your training knowledge. For each book, include the ISBN-13 if you know it.`
        },
        {
          role: 'user',
          content: `Query: ${searchQuery}

Please provide the REAL, ACCURATE list of books for this query. I need:
1. The actual books that were on this list/award for the year ${year}
2. Real ISBN-13 numbers (format: 978-XXXXXXXXXX)
3. Accurate author names
4. Brief descriptions

Return the data as a JSON array with this structure:
[
  {
    "title": "Book Title",
    "author": "Author Name",
    "isbn": "978-XXXXXXXXXX",
    "description": "Brief description of the book",
    "position": 1
  }
]

Important:
- Only include books that were ACTUALLY on this specific list for year ${year}
- Include ISBN-13 if you know it with certainty
- Position 1 = winner or top pick, higher numbers = lower ranking
- Return 5-15 books depending on the list
- If you don't have accurate data for this specific year/list, return an empty array []

Return ONLY the JSON array, no other text or explanation.`
        }
      ],
      temperature: 0.1, // Low temperature for more accurate/factual responses
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      console.log(`  ⚠️ Empty response`)
      return []
    }

    // Parse JSON response
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.log(`  ⚠️ Could not parse JSON response`)
      console.log(`  Response: ${content.substring(0, 200)}...`)
      return []
    }

    const books: BookData[] = JSON.parse(jsonMatch[0])
    console.log(`  ✓ Found ${books.length} books`)

    return books
  } catch (error) {
    console.error(`  ❌ Error fetching:`, error instanceof Error ? error.message : error)
    return []
  }
}

/**
 * Generate Open Library cover URL from ISBN
 */
function getOpenLibraryCoverUrl(isbn: string): string {
  const cleanIsbn = isbn.replace(/-/g, '')
  return `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`
}

/**
 * Save fetched data to database with retry logic
 */
async function saveToDatabase(result: FetchResult): Promise<void> {
  if (result.books.length === 0) {
    console.log(`  ⏭️ No books to save`)
    return
  }

  const maxRetries = 3
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Check if list already exists
      const existing = await db
        .select({ id: curatedLists.id })
        .from(curatedLists)
        .where(
          and(
            eq(curatedLists.listType, result.source.type),
            eq(curatedLists.year, result.year),
            result.category ? eq(curatedLists.category, result.category) : sql`${curatedLists.category} IS NULL`
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
        category: result.category || null,
        bookCount: result.books.length,
        viewCount: 0,
        saveCount: 0,
        isFeatured: false,
        isActive: true,
      }).returning()

      console.log(`  ✓ Created list: ${result.listTitle} (id: ${insertedList.id})`)

      // Insert items in batch
      const itemValues = result.books.map(book => ({
        listId: insertedList.id,
        bookType: 'ebook' as const,
        bookId: null,
        externalTitle: book.title,
        externalAuthor: book.author,
        externalDescription: book.description || null,
        externalCoverUrl: book.isbn ? getOpenLibraryCoverUrl(book.isbn) : null,
        isbn: book.isbn?.replace(/-/g, '') || null,
        amazonUrl: book.amazonUrl || `https://www.amazon.com/s?k=${encodeURIComponent(book.title + ' ' + book.author)}`,
        goodreadsUrl: book.goodreadsUrl || `https://www.goodreads.com/search?q=${encodeURIComponent(book.title)}`,
        position: book.position,
      }))

      await db.insert(curatedListItems).values(itemValues)

      console.log(`  ✓ Added ${result.books.length} books to list`)
      return // Success!
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.log(`  ⚠️ Database error (attempt ${attempt}/${maxRetries}): ${lastError.message.substring(0, 50)}...`)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2s before retry
      }
    }
  }

  console.log(`  ❌ Failed to save after ${maxRetries} attempts`)
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('        FETCH CURATED LISTS WITH AI')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  if (targetSource) console.log(`Source filter: ${targetSource}`)
  if (targetYear) console.log(`Year filter: ${targetYear}`)
  console.log('═══════════════════════════════════════════════════════════════\n')

  // Check for API key
  if (!process.env.DEEPSEEK_API_KEY) {
    console.error('❌ DEEPSEEK_API_KEY environment variable is required')
    process.exit(1)
  }

  try {
    // Clear existing if requested
    if (clearExisting && !dryRun) {
      console.log('🗑️ Clearing existing curated lists...')
      await db.delete(curatedListItems)
      await db.delete(curatedLists)
      console.log('  Done\n')
    }

    const sources = targetSource
      ? LIST_SOURCES.filter(s => s.type === targetSource)
      : LIST_SOURCES

    if (sources.length === 0) {
      console.error(`❌ Unknown source: ${targetSource}`)
      console.log('Available sources:', LIST_SOURCES.map(s => s.type).join(', '))
      process.exit(1)
    }

    let totalLists = 0
    let totalBooks = 0

    for (const source of sources) {
      console.log(`\n📚 ${source.name}`)
      console.log('─'.repeat(50))

      const years = targetYear
        ? source.yearsAvailable.filter(y => y === targetYear)
        : source.yearsAvailable

      for (const year of years) {
        const categories = source.categories || [undefined]

        for (const category of categories) {
          const categoryName = category ? CATEGORY_NAMES[category] || category : null
          const listTitle = categoryName
            ? `${source.name} Best ${categoryName} ${year}`
            : `${source.name} Best Books ${year}`
          const listSubtitle = categoryName
            ? `Top ${categoryName} picks of ${year}`
            : `Top book recommendations of ${year}`

          console.log(`\n  📋 ${listTitle}`)

          const books = await fetchBooksWithAI(source, year, category)

          if (books.length > 0) {
            const result: FetchResult = {
              source,
              year,
              category,
              books,
              listTitle,
              listSubtitle,
            }

            if (!dryRun) {
              await saveToDatabase(result)
            } else {
              console.log(`  📖 Books found:`)
              for (const book of books.slice(0, 5)) {
                console.log(`     ${book.position}. "${book.title}" by ${book.author}`)
              }
              if (books.length > 5) {
                console.log(`     ... and ${books.length - 5} more`)
              }
            }

            totalLists++
            totalBooks += books.length
          }

          // Rate limiting - be nice to the API and database connection pool
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════════')
    console.log('                    FETCH COMPLETE')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log(`📋 Lists fetched:  ${totalLists}`)
    console.log(`📚 Books fetched:  ${totalBooks}`)
    console.log('═══════════════════════════════════════════════════════════════\n')

    if (dryRun) {
      console.log('💡 This was a dry run. Run without --dry-run to save to database.\n')
    }

  } catch (error) {
    console.error('❌ Error during fetch:', error)
    await pool.end()
    process.exit(1)
  }

  await pool.end()
  process.exit(0)
}

main()
