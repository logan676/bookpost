/**
 * Fix garbled descriptions in ebooks table
 *
 * Decodes HTML entities and strips HTML tags from descriptions
 *
 * Run with:
 *   npx tsx src/scripts/fix-descriptions.ts
 */

import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { ebooks } from '../db/schema'
import { isNotNull, sql } from 'drizzle-orm'
import { decode } from 'html-entities'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
const db = drizzle(pool)

/**
 * Clean HTML description: strip tags and decode entities
 */
function cleanDescription(html: string): string {
  // First decode HTML entities (&#8212; -> —, &amp; -> &, etc.)
  let text = decode(html)

  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, ' ')

  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim()

  // Truncate if too long
  if (text.length > 2000) {
    text = text.substring(0, 1997) + '...'
  }

  return text
}

/**
 * Check if description needs fixing
 */
function needsFixing(description: string): boolean {
  // Check for HTML entities
  if (/&#\d+;/.test(description)) return true
  if (/&\w+;/.test(description)) return true

  // Check for HTML tags
  if (/<[^>]+>/.test(description)) return true

  return false
}

async function main() {
  console.log('🔧 Fixing garbled descriptions...\n')

  // Get all ebooks with descriptions
  const books = await db
    .select({
      id: ebooks.id,
      title: ebooks.title,
      description: ebooks.description,
    })
    .from(ebooks)
    .where(isNotNull(ebooks.description))

  console.log(`Found ${books.length} books with descriptions\n`)

  let fixedCount = 0
  let skippedCount = 0

  for (const book of books) {
    if (!book.description) continue

    if (!needsFixing(book.description)) {
      skippedCount++
      continue
    }

    const cleanedDescription = cleanDescription(book.description)

    // Only update if actually changed
    if (cleanedDescription !== book.description) {
      console.log(`📖 Fixing: ${book.title} (ID: ${book.id})`)
      console.log(`   Before: ${book.description.substring(0, 100)}...`)
      console.log(`   After:  ${cleanedDescription.substring(0, 100)}...`)

      await db
        .update(ebooks)
        .set({ description: cleanedDescription })
        .where(sql`${ebooks.id} = ${book.id}`)

      fixedCount++
    } else {
      skippedCount++
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`   ✅ Fixed: ${fixedCount}`)
  console.log(`   ⏭️ Skipped (already clean): ${skippedCount}`)

  await pool.end()
  process.exit(0)
}

main().catch(async (error) => {
  console.error('❌ Error:', error)
  await pool.end()
  process.exit(1)
})
