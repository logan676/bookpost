/**
 * Import Rankings from CSV - Load external ranking data from CSV files
 *
 * This script imports curated list data from CSV files into the database.
 * It creates curated_lists entries and their associated curated_list_items.
 *
 * Run with:
 *   npx tsx src/scripts/import-rankings-csv.ts [options]
 *
 * Options:
 *   --dry-run         Preview changes without updating database
 *   --file=PATH       Path to CSV file (default: src/scripts/data/sample-rankings.csv)
 *   --clear           Clear existing data before import
 */

import { db } from '../db/client'
import { curatedLists, curatedListItems, ebooks } from '../db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { readFileSync } from 'fs'
import { parse } from 'csv-parse/sync'

// Parse command line arguments
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const clearExisting = args.includes('--clear')
const fileArg = args.find(a => a.startsWith('--file='))
const csvFile = fileArg
  ? fileArg.split('=')[1]
  : 'src/scripts/data/sample-rankings.csv'

interface CSVRecord {
  list_type: string
  year: string
  category?: string
  title: string
  author: string
  isbn?: string
  description?: string
  cover_url?: string
  amazon_url?: string
  goodreads_url?: string
}

// List type configurations
const LIST_TYPE_CONFIG: Record<string, {
  sourceName: string
  sourceLogoUrl: string
  baseUrl: string
  description: string
}> = {
  nyt_bestseller: {
    sourceName: 'New York Times',
    sourceLogoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/40/New_York_Times_logo_variation.jpg',
    baseUrl: 'https://www.nytimes.com/books/best-sellers/',
    description: 'The New York Times Best Sellers list'
  },
  amazon_best: {
    sourceName: 'Amazon',
    sourceLogoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
    baseUrl: 'https://www.amazon.com/b?node=8192263011',
    description: 'Amazon editors\' picks for the best books of the year'
  },
  bill_gates: {
    sourceName: 'Bill Gates',
    sourceLogoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Bill_Gates_2018.jpg',
    baseUrl: 'https://www.gatesnotes.com/Books',
    description: 'Books recommended by Bill Gates'
  },
  goodreads_choice: {
    sourceName: 'Goodreads',
    sourceLogoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Goodreads_logo.svg',
    baseUrl: 'https://www.goodreads.com/choiceawards',
    description: 'Goodreads Choice Awards - voted by readers'
  },
  pulitzer: {
    sourceName: 'Pulitzer Prize',
    sourceLogoUrl: 'https://www.pulitzer.org/sites/default/files/main_images/pulitzerprizes_0.png',
    baseUrl: 'https://www.pulitzer.org/prize-winners-by-category',
    description: 'Pulitzer Prize winners and finalists'
  },
  booker: {
    sourceName: 'Booker Prize',
    sourceLogoUrl: 'https://thebookerprizes.com/sites/default/files/styles/large/public/booker-logo.png',
    baseUrl: 'https://thebookerprizes.com/',
    description: 'The Booker Prize for Fiction'
  },
  obama_reading: {
    sourceName: 'Barack Obama',
    sourceLogoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8d/President_Barack_Obama.jpg',
    baseUrl: 'https://barackobama.medium.com/',
    description: 'Barack Obama\'s annual reading recommendations'
  },
  national_book: {
    sourceName: 'National Book Foundation',
    sourceLogoUrl: 'https://www.nationalbook.org/wp-content/themes/developer/images/nba-logo.svg',
    baseUrl: 'https://www.nationalbook.org/national-book-awards/',
    description: 'National Book Award winners and finalists'
  }
}

const CATEGORY_NAMES: Record<string, string> = {
  fiction: 'Fiction',
  nonfiction: 'Nonfiction',
  mystery: 'Mystery & Thriller',
  fantasy: 'Fantasy',
  romance: 'Romance',
  science_fiction: 'Science Fiction',
}

async function findMatchingEbook(isbn: string | undefined, title: string, author: string): Promise<number | null> {
  if (isbn) {
    // Try ISBN match first
    const [byIsbn] = await db
      .select({ id: ebooks.id })
      .from(ebooks)
      .where(eq(ebooks.isbn, isbn.replace(/-/g, '')))
      .limit(1)

    if (byIsbn) return byIsbn.id
  }

  // Try title + author match
  const [byTitleAuthor] = await db
    .select({ id: ebooks.id })
    .from(ebooks)
    .where(
      and(
        sql`LOWER(${ebooks.title}) = LOWER(${title})`,
        sql`LOWER(${ebooks.author}) = LOWER(${author})`
      )
    )
    .limit(1)

  if (byTitleAuthor) return byTitleAuthor.id

  // Try title only (fuzzy)
  const [byTitle] = await db
    .select({ id: ebooks.id })
    .from(ebooks)
    .where(sql`LOWER(${ebooks.title}) LIKE LOWER(${'%' + title + '%'})`)
    .limit(1)

  return byTitle?.id || null
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('              IMPORT RANKINGS FROM CSV')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`File: ${csvFile}`)
  console.log(`Clear existing: ${clearExisting}`)
  console.log('═══════════════════════════════════════════════════════════════\n')

  try {
    // Read and parse CSV
    console.log('📂 Reading CSV file...')
    const csvContent = readFileSync(csvFile, 'utf-8')
    const records: CSVRecord[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    })

    console.log(`Found ${records.length} records\n`)

    // Group by list (list_type + year + category)
    const listGroups = new Map<string, CSVRecord[]>()

    for (const record of records) {
      const key = `${record.list_type}|${record.year}|${record.category || ''}`
      if (!listGroups.has(key)) {
        listGroups.set(key, [])
      }
      listGroups.get(key)!.push(record)
    }

    console.log(`Grouped into ${listGroups.size} lists\n`)

    // Clear existing if requested
    if (clearExisting && !dryRun) {
      console.log('🗑️ Clearing existing curated lists...')
      await db.delete(curatedListItems)
      await db.delete(curatedLists)
      console.log('  Done\n')
    }

    let listsCreated = 0
    let itemsCreated = 0
    let itemsLinked = 0

    for (const [key, books] of listGroups) {
      const [listType, year, category] = key.split('|')
      const config = LIST_TYPE_CONFIG[listType]

      if (!config) {
        console.log(`⚠️ Unknown list type: ${listType}, skipping...`)
        continue
      }

      const categoryName = category ? CATEGORY_NAMES[category] || category : null
      const title = category
        ? `${config.sourceName} Best ${categoryName} ${year}`
        : `${config.sourceName} Best Books ${year}`

      const subtitle = category
        ? `Top ${categoryName} picks of ${year}`
        : `Top book recommendations of ${year}`

      console.log(`📋 ${title}`)
      console.log(`   ${books.length} books`)

      if (!dryRun) {
        // Create list
        const [insertedList] = await db.insert(curatedLists).values({
          listType,
          title,
          subtitle,
          description: config.description,
          sourceName: config.sourceName,
          sourceUrl: config.baseUrl,
          sourceLogoUrl: config.sourceLogoUrl,
          year: parseInt(year),
          category: category || null,
          bookCount: books.length,
          viewCount: Math.floor(Math.random() * 5000) + 500,
          saveCount: Math.floor(Math.random() * 200) + 20,
          isFeatured: listsCreated < 5,
          isActive: true,
        }).returning()

        listsCreated++

        // Create items
        for (let i = 0; i < books.length; i++) {
          const book = books[i]

          // Try to find matching ebook
          const ebookId = await findMatchingEbook(book.isbn, book.title, book.author)

          await db.insert(curatedListItems).values({
            listId: insertedList.id,
            bookType: 'ebook',
            bookId: ebookId,
            externalTitle: book.title,
            externalAuthor: book.author,
            externalDescription: book.description || null,
            externalCoverUrl: book.cover_url || null,
            isbn: book.isbn?.replace(/-/g, '') || null,
            amazonUrl: book.amazon_url || null,
            goodreadsUrl: book.goodreads_url || null,
            position: i + 1,
          })

          itemsCreated++
          if (ebookId) {
            itemsLinked++
            console.log(`   ✓ ${book.title} (linked to ebook #${ebookId})`)
          } else {
            console.log(`   ○ ${book.title} (external only)`)
          }
        }
      } else {
        listsCreated++
        for (const book of books) {
          itemsCreated++
          console.log(`   ○ ${book.title}`)
        }
      }

      console.log('')
    }

    console.log('═══════════════════════════════════════════════════════════════')
    console.log('                    IMPORT COMPLETE')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log(`📋 Lists created:  ${listsCreated}`)
    console.log(`📚 Items created:  ${itemsCreated}`)
    console.log(`🔗 Items linked:   ${itemsLinked}`)
    console.log('═══════════════════════════════════════════════════════════════\n')

    if (dryRun) {
      console.log('💡 This was a dry run. Run without --dry-run to apply changes.\n')
    }

  } catch (error) {
    console.error('❌ Error during import:', error)
    process.exit(1)
  }

  process.exit(0)
}

main()
