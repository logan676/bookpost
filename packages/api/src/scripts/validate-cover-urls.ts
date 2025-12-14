/**
 * Validate Cover URLs - Check if book cover URLs are accessible
 *
 * This script validates cover_url fields in the ebooks table:
 * - Checks if URLs return valid images (200 status, image content-type)
 * - Optionally replaces broken URLs with Open Library fallback
 * - Reports statistics on cover URL health
 *
 * Run with:
 *   npx tsx src/scripts/validate-cover-urls.ts [options]
 *
 * Options:
 *   --dry-run         Preview changes without updating database
 *   --limit=N         Process only N books (default: 100)
 *   --fix             Replace broken URLs with Open Library covers
 *   --report-only     Only generate report, don't check URLs
 */

import { db } from '../db/client'
import { ebooks } from '../db/schema'
import { eq, isNotNull, sql } from 'drizzle-orm'

// Parse command line arguments
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const fix = args.includes('--fix')
const reportOnly = args.includes('--report-only')
const limitArg = args.find(a => a.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 100

// Rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

interface ValidationResult {
  bookId: number
  title: string
  isbn: string | null
  coverUrl: string
  status: 'valid' | 'broken' | 'timeout' | 'error'
  httpStatus?: number
  contentType?: string
  newCoverUrl?: string
}

async function validateCoverUrl(url: string): Promise<{
  valid: boolean
  status?: number
  contentType?: string
  error?: string
}> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
      headers: {
        'User-Agent': 'BookPost/1.0 (Cover Validator)'
      }
    })

    const contentType = response.headers.get('content-type') || ''
    const isImage = contentType.startsWith('image/')

    // Some servers return 200 but with a placeholder/error image
    // Check content-length for suspiciously small responses
    const contentLength = parseInt(response.headers.get('content-length') || '0')
    const isTooSmall = contentLength > 0 && contentLength < 1000 // Less than 1KB is suspicious

    if (response.ok && isImage && !isTooSmall) {
      return {
        valid: true,
        status: response.status,
        contentType
      }
    }

    return {
      valid: false,
      status: response.status,
      contentType,
      error: !isImage ? 'Not an image' : isTooSmall ? 'Image too small' : 'HTTP error'
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
        return { valid: false, error: 'Timeout' }
      }
      return { valid: false, error: error.message }
    }
    return { valid: false, error: 'Unknown error' }
  }
}

function getOpenLibraryCoverUrl(isbn: string): string {
  return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
}

async function generateReport() {
  console.log('\n📊 Cover URL Statistics Report\n')

  // Total ebooks
  const [totalResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(ebooks)

  // With cover URL
  const [withCoverResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(ebooks)
    .where(isNotNull(ebooks.coverUrl))

  // Without cover URL
  const withoutCover = totalResult.count - withCoverResult.count

  // By URL domain
  const domains = await db
    .select({
      domain: sql<string>`
        CASE
          WHEN ${ebooks.coverUrl} LIKE '%openlibrary.org%' THEN 'openlibrary.org'
          WHEN ${ebooks.coverUrl} LIKE '%googleapis.com%' THEN 'googleapis.com'
          WHEN ${ebooks.coverUrl} LIKE '%amazon%' THEN 'amazon'
          WHEN ${ebooks.coverUrl} LIKE '%douban%' THEN 'douban'
          WHEN ${ebooks.coverUrl} LIKE '%goodreads%' THEN 'goodreads'
          WHEN ${ebooks.coverUrl} IS NULL THEN '(none)'
          ELSE 'other'
        END
      `,
      count: sql<number>`count(*)::int`
    })
    .from(ebooks)
    .groupBy(sql`
      CASE
        WHEN ${ebooks.coverUrl} LIKE '%openlibrary.org%' THEN 'openlibrary.org'
        WHEN ${ebooks.coverUrl} LIKE '%googleapis.com%' THEN 'googleapis.com'
        WHEN ${ebooks.coverUrl} LIKE '%amazon%' THEN 'amazon'
        WHEN ${ebooks.coverUrl} LIKE '%douban%' THEN 'douban'
        WHEN ${ebooks.coverUrl} LIKE '%goodreads%' THEN 'goodreads'
        WHEN ${ebooks.coverUrl} IS NULL THEN '(none)'
        ELSE 'other'
      END
    `)
    .orderBy(sql`count(*) DESC`)

  console.log('Summary:')
  console.log(`  Total ebooks:      ${totalResult.count}`)
  console.log(`  With cover URL:    ${withCoverResult.count} (${((withCoverResult.count / totalResult.count) * 100).toFixed(1)}%)`)
  console.log(`  Without cover URL: ${withoutCover} (${((withoutCover / totalResult.count) * 100).toFixed(1)}%)`)

  console.log('\nCover URL Sources:')
  for (const domain of domains) {
    console.log(`  ${domain.domain.padEnd(20)} ${domain.count}`)
  }

  return {
    total: totalResult.count,
    withCover: withCoverResult.count,
    withoutCover
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('              COVER URL VALIDATION')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : fix ? 'FIX BROKEN' : 'CHECK ONLY'}`)
  console.log(`Limit: ${limit} books`)
  console.log('═══════════════════════════════════════════════════════════════\n')

  try {
    // Always generate report first
    await generateReport()

    if (reportOnly) {
      console.log('\n✅ Report complete (--report-only mode)\n')
      process.exit(0)
    }

    console.log('\n\n🔍 Validating cover URLs...\n')

    // Get books with cover URLs to validate
    const booksToValidate = await db
      .select({
        id: ebooks.id,
        title: ebooks.title,
        isbn: ebooks.isbn,
        coverUrl: ebooks.coverUrl,
      })
      .from(ebooks)
      .where(isNotNull(ebooks.coverUrl))
      .limit(limit)

    console.log(`Found ${booksToValidate.length} books with cover URLs to validate\n`)

    if (booksToValidate.length === 0) {
      console.log('✅ No books to validate!')
      process.exit(0)
    }

    const results: ValidationResult[] = []
    let validCount = 0
    let brokenCount = 0
    let fixedCount = 0

    for (let i = 0; i < booksToValidate.length; i++) {
      const book = booksToValidate[i]

      if (!book.coverUrl) continue

      process.stdout.write(`[${i + 1}/${booksToValidate.length}] ${book.title.substring(0, 40).padEnd(40)} `)

      const validation = await validateCoverUrl(book.coverUrl)

      const result: ValidationResult = {
        bookId: book.id,
        title: book.title,
        isbn: book.isbn,
        coverUrl: book.coverUrl,
        status: validation.valid ? 'valid' : validation.error === 'Timeout' ? 'timeout' : 'broken',
        httpStatus: validation.status,
        contentType: validation.contentType
      }

      if (validation.valid) {
        console.log('✅ Valid')
        validCount++
      } else {
        console.log(`❌ ${validation.error || 'Broken'} (${validation.status || 'N/A'})`)
        brokenCount++

        // Try to fix with Open Library cover if we have ISBN
        if (fix && book.isbn) {
          const olCoverUrl = getOpenLibraryCoverUrl(book.isbn)
          const olValidation = await validateCoverUrl(olCoverUrl)

          if (olValidation.valid) {
            result.newCoverUrl = olCoverUrl

            if (!dryRun) {
              await db.update(ebooks)
                .set({ coverUrl: olCoverUrl })
                .where(eq(ebooks.id, book.id))
              console.log(`    → Fixed with Open Library cover`)
              fixedCount++
            } else {
              console.log(`    → Would fix with Open Library cover (dry run)`)
              fixedCount++
            }
          } else {
            console.log(`    → No valid replacement found`)
          }
        }
      }

      results.push(result)

      // Rate limiting
      await delay(50)
    }

    console.log('\n═══════════════════════════════════════════════════════════════')
    console.log('                    VALIDATION COMPLETE')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log(`✅ Valid:  ${validCount}`)
    console.log(`❌ Broken: ${brokenCount}`)
    if (fix) {
      console.log(`🔧 Fixed:  ${fixedCount}`)
    }
    console.log('═══════════════════════════════════════════════════════════════\n')

    // Output broken URLs for manual review
    const brokenUrls = results.filter(r => r.status !== 'valid' && !r.newCoverUrl)
    if (brokenUrls.length > 0) {
      console.log('📋 Broken URLs (need manual attention):')
      for (const result of brokenUrls.slice(0, 20)) {
        console.log(`  [${result.bookId}] ${result.title}`)
        console.log(`    URL: ${result.coverUrl}`)
        console.log(`    ISBN: ${result.isbn || 'N/A'}`)
      }
      if (brokenUrls.length > 20) {
        console.log(`  ... and ${brokenUrls.length - 20} more`)
      }
    }

    if (dryRun && fix) {
      console.log('\n💡 This was a dry run. Run without --dry-run to apply fixes.\n')
    }

  } catch (error) {
    console.error('❌ Error during validation:', error)
    process.exit(1)
  }

  process.exit(0)
}

main()
