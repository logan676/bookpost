/**
 * Enrich Book Metadata - Fetch missing data from Open Library and Google Books
 *
 * This script enriches ebooks with missing metadata:
 * - publication_date
 * - external_rating / external_ratings_count
 * - cover_url
 * - author, publisher, description
 *
 * Run with:
 *   npx tsx src/scripts/enrich-book-metadata.ts [options]
 *
 * Options:
 *   --dry-run         Preview changes without updating database
 *   --limit=N         Process only N books (default: 100)
 *   --covers-only     Only update missing cover URLs
 *   --ratings-only    Only update missing ratings
 *   --dates-only      Only update missing publication dates
 *   --all             Update all missing fields (default)
 */

import { db } from '../db/client'
import { ebooks } from '../db/schema'
import { eq, isNull, or, and, sql } from 'drizzle-orm'

// Parse command line arguments
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const coversOnly = args.includes('--covers-only')
const ratingsOnly = args.includes('--ratings-only')
const datesOnly = args.includes('--dates-only')
const limitArg = args.find(a => a.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 100

interface OpenLibraryBook {
  title?: string
  authors?: Array<{ name: string }>
  publishers?: Array<{ name: string }>
  publish_date?: string
  number_of_pages?: number
  subjects?: Array<{ name: string }>
  cover?: {
    small?: string
    medium?: string
    large?: string
  }
}

interface GoogleBooksVolume {
  volumeInfo?: {
    title?: string
    authors?: string[]
    publisher?: string
    publishedDate?: string
    description?: string
    pageCount?: number
    averageRating?: number
    ratingsCount?: number
    imageLinks?: {
      thumbnail?: string
      smallThumbnail?: string
    }
  }
}

// Rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function fetchFromOpenLibrary(isbn: string): Promise<OpenLibraryBook | null> {
  try {
    const response = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
      { signal: AbortSignal.timeout(10000) }
    )

    if (!response.ok) return null

    const data = await response.json()
    const bookKey = `ISBN:${isbn}`

    if (data[bookKey]) {
      return data[bookKey] as OpenLibraryBook
    }

    return null
  } catch (error) {
    console.error(`  ⚠️ Open Library error for ISBN ${isbn}:`, error instanceof Error ? error.message : error)
    return null
  }
}

async function fetchFromGoogleBooks(isbn: string): Promise<GoogleBooksVolume | null> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`,
      { signal: AbortSignal.timeout(10000) }
    )

    if (!response.ok) return null

    const data = await response.json()

    if (data.items && data.items.length > 0) {
      return data.items[0] as GoogleBooksVolume
    }

    return null
  } catch (error) {
    console.error(`  ⚠️ Google Books error for ISBN ${isbn}:`, error instanceof Error ? error.message : error)
    return null
  }
}

function getOpenLibraryCoverUrl(isbn: string, size: 'S' | 'M' | 'L' = 'L'): string {
  return `https://covers.openlibrary.org/b/isbn/${isbn}-${size}.jpg`
}

function parsePublishDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null

  // Try various date formats
  // "2024-01-15" -> "2024-01-15"
  // "January 15, 2024" -> "2024-01-15"
  // "2024" -> "2024-01-01"
  // "Jan 2024" -> "2024-01-01"

  // Full date format
  const fullMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (fullMatch) return dateStr

  // Year only
  const yearOnlyMatch = dateStr.match(/^(\d{4})$/)
  if (yearOnlyMatch) return `${yearOnlyMatch[1]}-01-01`

  // Month Year (e.g., "January 2024" or "Jan 2024")
  const monthYearMatch = dateStr.match(/^([A-Za-z]+)\s+(\d{4})$/)
  if (monthYearMatch) {
    const months: Record<string, string> = {
      january: '01', jan: '01',
      february: '02', feb: '02',
      march: '03', mar: '03',
      april: '04', apr: '04',
      may: '05',
      june: '06', jun: '06',
      july: '07', jul: '07',
      august: '08', aug: '08',
      september: '09', sep: '09',
      october: '10', oct: '10',
      november: '11', nov: '11',
      december: '12', dec: '12',
    }
    const month = months[monthYearMatch[1].toLowerCase()]
    if (month) {
      return `${monthYearMatch[2]}-${month}-01`
    }
  }

  // Month Day, Year (e.g., "January 15, 2024")
  const fullDateMatch = dateStr.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/)
  if (fullDateMatch) {
    const months: Record<string, string> = {
      january: '01', jan: '01',
      february: '02', feb: '02',
      march: '03', mar: '03',
      april: '04', apr: '04',
      may: '05',
      june: '06', jun: '06',
      july: '07', jul: '07',
      august: '08', aug: '08',
      september: '09', sep: '09',
      october: '10', oct: '10',
      november: '11', nov: '11',
      december: '12', dec: '12',
    }
    const month = months[fullDateMatch[1].toLowerCase()]
    if (month) {
      const day = fullDateMatch[2].padStart(2, '0')
      return `${fullDateMatch[3]}-${month}-${day}`
    }
  }

  console.log(`  ⚠️ Could not parse date: "${dateStr}"`)
  return null
}

interface EnrichmentResult {
  bookId: number
  title: string
  isbn: string | null
  updates: Record<string, unknown>
  source: 'openlibrary' | 'googlebooks' | 'openlibrary_cover' | 'none'
}

async function enrichBook(book: {
  id: number
  title: string
  isbn: string | null
  coverUrl: string | null
  publicationDate: string | null
  externalRating: string | null
  externalRatingsCount: number | null
  author: string | null
  publisher: string | null
  description: string | null
}): Promise<EnrichmentResult> {
  const result: EnrichmentResult = {
    bookId: book.id,
    title: book.title,
    isbn: book.isbn,
    updates: {},
    source: 'none'
  }

  if (!book.isbn) {
    return result
  }

  // Determine what fields need updating based on flags
  const needsCover = !coversOnly && !ratingsOnly && !datesOnly
    ? !book.coverUrl
    : coversOnly && !book.coverUrl

  const needsRating = !coversOnly && !ratingsOnly && !datesOnly
    ? !book.externalRating
    : ratingsOnly && !book.externalRating

  const needsDate = !coversOnly && !ratingsOnly && !datesOnly
    ? !book.publicationDate
    : datesOnly && !book.publicationDate

  const needsOther = !coversOnly && !ratingsOnly && !datesOnly

  // Try Open Library first
  const olBook = await fetchFromOpenLibrary(book.isbn)
  await delay(100) // Rate limiting

  if (olBook) {
    result.source = 'openlibrary'

    // Cover
    if (needsCover && olBook.cover?.large) {
      result.updates.coverUrl = olBook.cover.large
    }

    // Publication date
    if (needsDate && olBook.publish_date) {
      const parsedDate = parsePublishDate(olBook.publish_date)
      if (parsedDate) {
        result.updates.publicationDate = parsedDate
      }
    }

    // Author
    if (needsOther && !book.author && olBook.authors?.length) {
      result.updates.author = olBook.authors.map(a => a.name).join(', ')
    }

    // Publisher
    if (needsOther && !book.publisher && olBook.publishers?.length) {
      result.updates.publisher = olBook.publishers[0].name
    }
  }

  // Try Google Books for ratings and additional data
  if (needsRating || (needsDate && !result.updates.publicationDate) || (needsCover && !result.updates.coverUrl)) {
    const gbBook = await fetchFromGoogleBooks(book.isbn)
    await delay(100) // Rate limiting

    if (gbBook?.volumeInfo) {
      if (result.source === 'none') {
        result.source = 'googlebooks'
      }

      // Rating
      if (needsRating && gbBook.volumeInfo.averageRating) {
        result.updates.externalRating = gbBook.volumeInfo.averageRating.toFixed(2)
        result.updates.externalRatingsCount = gbBook.volumeInfo.ratingsCount || 0
        result.updates.externalRatingSource = 'google_books'
      }

      // Publication date (fallback)
      if (needsDate && !result.updates.publicationDate && gbBook.volumeInfo.publishedDate) {
        const parsedDate = parsePublishDate(gbBook.volumeInfo.publishedDate)
        if (parsedDate) {
          result.updates.publicationDate = parsedDate
        }
      }

      // Cover (fallback)
      if (needsCover && !result.updates.coverUrl && gbBook.volumeInfo.imageLinks?.thumbnail) {
        // Convert to higher resolution
        result.updates.coverUrl = gbBook.volumeInfo.imageLinks.thumbnail.replace('zoom=1', 'zoom=2')
      }

      // Description
      if (needsOther && !book.description && gbBook.volumeInfo.description) {
        result.updates.description = gbBook.volumeInfo.description
      }
    }
  }

  // Fallback: Use Open Library cover URL directly if we have ISBN but no cover yet
  if (needsCover && !result.updates.coverUrl && book.isbn) {
    result.updates.coverUrl = getOpenLibraryCoverUrl(book.isbn)
    if (result.source === 'none') {
      result.source = 'openlibrary_cover'
    }
  }

  return result
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('              BOOK METADATA ENRICHMENT')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`)
  console.log(`Limit: ${limit} books`)
  console.log(`Focus: ${coversOnly ? 'Covers only' : ratingsOnly ? 'Ratings only' : datesOnly ? 'Dates only' : 'All fields'}`)
  console.log('═══════════════════════════════════════════════════════════════\n')

  try {
    // Build query based on focus
    let whereClause

    if (coversOnly) {
      whereClause = and(
        isNull(ebooks.coverUrl),
        sql`${ebooks.isbn} IS NOT NULL AND ${ebooks.isbn} != ''`
      )
    } else if (ratingsOnly) {
      whereClause = and(
        isNull(ebooks.externalRating),
        sql`${ebooks.isbn} IS NOT NULL AND ${ebooks.isbn} != ''`
      )
    } else if (datesOnly) {
      whereClause = and(
        isNull(ebooks.publicationDate),
        sql`${ebooks.isbn} IS NOT NULL AND ${ebooks.isbn} != ''`
      )
    } else {
      // All - find books missing any of the key fields
      whereClause = and(
        sql`${ebooks.isbn} IS NOT NULL AND ${ebooks.isbn} != ''`,
        or(
          isNull(ebooks.coverUrl),
          isNull(ebooks.publicationDate),
          isNull(ebooks.externalRating)
        )
      )
    }

    const booksToEnrich = await db
      .select({
        id: ebooks.id,
        title: ebooks.title,
        isbn: ebooks.isbn,
        coverUrl: ebooks.coverUrl,
        publicationDate: ebooks.publicationDate,
        externalRating: ebooks.externalRating,
        externalRatingsCount: ebooks.externalRatingsCount,
        author: ebooks.author,
        publisher: ebooks.publisher,
        description: ebooks.description,
      })
      .from(ebooks)
      .where(whereClause)
      .limit(limit)

    console.log(`Found ${booksToEnrich.length} books to process\n`)

    if (booksToEnrich.length === 0) {
      console.log('✅ No books need enrichment!')
      process.exit(0)
    }

    let successCount = 0
    let failCount = 0
    let skipCount = 0

    for (let i = 0; i < booksToEnrich.length; i++) {
      const book = booksToEnrich[i]
      console.log(`[${i + 1}/${booksToEnrich.length}] Processing: ${book.title}`)
      console.log(`  ISBN: ${book.isbn}`)

      const result = await enrichBook(book)

      if (Object.keys(result.updates).length === 0) {
        console.log(`  ⏭️ No updates found (source: ${result.source})`)
        skipCount++
      } else {
        console.log(`  📚 Found updates from ${result.source}:`)
        for (const [key, value] of Object.entries(result.updates)) {
          const displayValue = typeof value === 'string' && value.length > 50
            ? value.substring(0, 50) + '...'
            : value
          console.log(`    - ${key}: ${displayValue}`)
        }

        if (!dryRun) {
          try {
            await db.update(ebooks)
              .set(result.updates)
              .where(eq(ebooks.id, book.id))
            console.log(`  ✅ Updated successfully`)
            successCount++
          } catch (error) {
            console.log(`  ❌ Update failed:`, error)
            failCount++
          }
        } else {
          console.log(`  🔸 Would update (dry run)`)
          successCount++
        }
      }

      console.log('')
    }

    console.log('═══════════════════════════════════════════════════════════════')
    console.log('                    ENRICHMENT COMPLETE')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log(`✅ Success: ${successCount}`)
    console.log(`❌ Failed:  ${failCount}`)
    console.log(`⏭️ Skipped: ${skipCount}`)
    console.log('═══════════════════════════════════════════════════════════════\n')

    if (dryRun) {
      console.log('💡 This was a dry run. Run without --dry-run to apply changes.\n')
    }

  } catch (error) {
    console.error('❌ Error during enrichment:', error)
    process.exit(1)
  }

  process.exit(0)
}

main()
