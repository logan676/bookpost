/**
 * Check Data Completeness - Analyze ebooks table for missing data
 *
 * This script checks the fill rate of critical fields needed for:
 * - Books by Year (publication_date)
 * - Top Rated (external_rating, external_ratings_count)
 * - Cover display (cover_url)
 *
 * Run with: npx tsx src/scripts/check-data-completeness.ts
 */

import { db } from '../db/client'
import { ebooks, magazines, curatedLists, curatedListItems } from '../db/schema'
import { sql, count, isNotNull, isNull } from 'drizzle-orm'

interface FieldStats {
  fieldName: string
  total: number
  filled: number
  empty: number
  fillRate: string
  status: 'good' | 'warning' | 'critical'
}

async function checkEbookCompleteness(): Promise<FieldStats[]> {
  console.log('\n📊 Checking ebooks table data completeness...\n')

  const stats: FieldStats[] = []

  // Get total count
  const [totalResult] = await db.select({ count: count() }).from(ebooks)
  const total = totalResult.count

  console.log(`Total ebooks: ${total}\n`)

  if (total === 0) {
    console.log('⚠️ No ebooks found in database')
    return stats
  }

  // Check each critical field
  const fieldsToCheck = [
    { name: 'cover_url', column: ebooks.coverUrl, minRate: 80 },
    { name: 'publication_date', column: ebooks.publicationDate, minRate: 50 },
    { name: 'external_rating', column: ebooks.externalRating, minRate: 30 },
    { name: 'external_ratings_count', column: ebooks.externalRatingsCount, minRate: 30 },
    { name: 'author', column: ebooks.author, minRate: 70 },
    { name: 'description', column: ebooks.description, minRate: 50 },
    { name: 'isbn', column: ebooks.isbn, minRate: 40 },
    { name: 'publisher', column: ebooks.publisher, minRate: 40 },
    { name: 'page_count', column: ebooks.pageCount, minRate: 30 },
  ]

  for (const field of fieldsToCheck) {
    const [filledResult] = await db
      .select({ count: count() })
      .from(ebooks)
      .where(isNotNull(field.column))

    const filled = filledResult.count
    const empty = total - filled
    const fillRate = ((filled / total) * 100).toFixed(1)
    const fillRateNum = parseFloat(fillRate)

    let status: 'good' | 'warning' | 'critical'
    if (fillRateNum >= field.minRate) {
      status = 'good'
    } else if (fillRateNum >= field.minRate * 0.5) {
      status = 'warning'
    } else {
      status = 'critical'
    }

    const statusIcon = status === 'good' ? '✅' : status === 'warning' ? '⚠️' : '❌'
    console.log(`${statusIcon} ${field.name.padEnd(25)} ${fillRate.padStart(6)}% (${filled}/${total})`)

    stats.push({
      fieldName: field.name,
      total,
      filled,
      empty,
      fillRate: `${fillRate}%`,
      status
    })
  }

  return stats
}

async function checkExternalRatingSources() {
  console.log('\n\n📈 External Rating Sources Distribution:\n')

  const sources = await db
    .select({
      source: ebooks.externalRatingSource,
      count: count()
    })
    .from(ebooks)
    .where(isNotNull(ebooks.externalRatingSource))
    .groupBy(ebooks.externalRatingSource)

  if (sources.length === 0) {
    console.log('  No external rating sources found')
  } else {
    for (const source of sources) {
      console.log(`  ${source.source || 'unknown'}: ${source.count} books`)
    }
  }
}

async function checkPublicationYearDistribution() {
  console.log('\n\n📅 Publication Year Distribution:\n')

  const years = await db
    .select({
      year: sql<string>`EXTRACT(YEAR FROM ${ebooks.publicationDate})::text`,
      count: count()
    })
    .from(ebooks)
    .where(isNotNull(ebooks.publicationDate))
    .groupBy(sql`EXTRACT(YEAR FROM ${ebooks.publicationDate})`)
    .orderBy(sql`EXTRACT(YEAR FROM ${ebooks.publicationDate}) DESC`)
    .limit(10)

  if (years.length === 0) {
    console.log('  No publication dates found')
  } else {
    console.log('  Top 10 years:')
    for (const year of years) {
      console.log(`  ${year.year || 'unknown'}: ${year.count} books`)
    }
  }
}

async function checkCuratedListsStatus() {
  console.log('\n\n📋 Curated Lists Status:\n')

  // Total lists
  const [listCountResult] = await db.select({ count: count() }).from(curatedLists)
  console.log(`  Total curated lists: ${listCountResult.count}`)

  // Lists by type
  const listTypes = await db
    .select({
      listType: curatedLists.listType,
      count: count()
    })
    .from(curatedLists)
    .groupBy(curatedLists.listType)
    .orderBy(sql`count(*) DESC`)

  console.log('\n  Lists by type:')
  for (const type of listTypes) {
    console.log(`    ${type.listType}: ${type.count}`)
  }

  // Total items
  const [itemCountResult] = await db.select({ count: count() }).from(curatedListItems)
  console.log(`\n  Total curated list items: ${itemCountResult.count}`)

  // Items with book_id (in our library)
  const [linkedItemsResult] = await db
    .select({ count: count() })
    .from(curatedListItems)
    .where(isNotNull(curatedListItems.bookId))
  console.log(`  Items linked to ebooks: ${linkedItemsResult.count}`)

  // Items without book_id (external only)
  const [externalItemsResult] = await db
    .select({ count: count() })
    .from(curatedListItems)
    .where(isNull(curatedListItems.bookId))
  console.log(`  Items external only: ${externalItemsResult.count}`)
}

async function checkMagazineCompleteness() {
  console.log('\n\n📰 Checking magazines table data completeness...\n')

  const [totalResult] = await db.select({ count: count() }).from(magazines)
  const total = totalResult.count

  console.log(`Total magazines: ${total}\n`)

  if (total === 0) {
    console.log('⚠️ No magazines found in database')
    return
  }

  const fieldsToCheck = [
    { name: 'cover_url', column: magazines.coverUrl },
    { name: 'publication_date', column: magazines.publicationDate },
    { name: 'description', column: magazines.description },
    { name: 'year', column: magazines.year },
  ]

  for (const field of fieldsToCheck) {
    const [filledResult] = await db
      .select({ count: count() })
      .from(magazines)
      .where(isNotNull(field.column))

    const filled = filledResult.count
    const fillRate = ((filled / total) * 100).toFixed(1)
    console.log(`  ${field.name.padEnd(20)} ${fillRate.padStart(6)}% (${filled}/${total})`)
  }
}

async function generateRecommendations(ebookStats: FieldStats[]) {
  console.log('\n\n💡 Recommendations:\n')

  const critical = ebookStats.filter(s => s.status === 'critical')
  const warning = ebookStats.filter(s => s.status === 'warning')

  if (critical.length > 0) {
    console.log('🔴 Critical - Needs immediate attention:')
    for (const field of critical) {
      console.log(`   - ${field.fieldName}: Only ${field.fillRate} filled`)

      if (field.fieldName === 'cover_url') {
        console.log('     → Run: npx tsx src/scripts/enrich-book-metadata.ts --covers-only')
      } else if (field.fieldName === 'publication_date') {
        console.log('     → Run: npx tsx src/scripts/enrich-book-metadata.ts --dates-only')
      } else if (field.fieldName.includes('rating')) {
        console.log('     → Run: npx tsx src/scripts/enrich-book-metadata.ts --ratings-only')
      }
    }
  }

  if (warning.length > 0) {
    console.log('\n🟡 Warning - Should be improved:')
    for (const field of warning) {
      console.log(`   - ${field.fieldName}: ${field.fillRate} filled`)
    }
  }

  const good = ebookStats.filter(s => s.status === 'good')
  if (good.length > 0) {
    console.log('\n🟢 Good - Meets requirements:')
    for (const field of good) {
      console.log(`   - ${field.fieldName}: ${field.fillRate} filled`)
    }
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('              DATA COMPLETENESS CHECK REPORT')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`Generated at: ${new Date().toISOString()}`)

  try {
    const ebookStats = await checkEbookCompleteness()
    await checkExternalRatingSources()
    await checkPublicationYearDistribution()
    await checkCuratedListsStatus()
    await checkMagazineCompleteness()
    await generateRecommendations(ebookStats)

    console.log('\n═══════════════════════════════════════════════════════════════')
    console.log('                    CHECK COMPLETE')
    console.log('═══════════════════════════════════════════════════════════════\n')

  } catch (error) {
    console.error('❌ Error during check:', error)
    process.exit(1)
  }

  process.exit(0)
}

main()
