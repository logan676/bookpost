/**
 * Category Sync Script - Add tags and sync book counts
 *
 * This script:
 * 1. Adds 'tags' column to ebook_categories if it doesn't exist
 * 2. Sets tags for existing categories based on their slug/name
 * 3. Syncs ebookCount and magazineCount with actual book counts
 * 4. Deactivates empty categories (optional)
 *
 * Run with: npx tsx src/scripts/sync-categories.ts
 *
 * Options:
 *   --dry-run       Preview changes without writing to database
 *   --deactivate    Deactivate categories with 0 books
 */

import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg

// Tag assignments based on category slug/name
const TAG_MAPPINGS: Record<string, string[]> = {
  // Fiction categories
  'fiction': ['fiction', 'narrative'],
  'mystery': ['fiction', 'narrative'],
  'sci-fi': ['fiction', 'narrative'],
  'fantasy': ['fiction', 'narrative'],
  'romance': ['fiction', 'narrative'],
  'thriller': ['fiction', 'narrative'],

  // Literature (also fiction)
  'literature': ['fiction', 'narrative', 'literary'],

  // Non-fiction categories
  'history': ['nonfiction', 'academic'],
  'philosophy': ['nonfiction', 'academic'],
  'psychology': ['nonfiction', 'academic'],
  'science': ['nonfiction', 'academic'],
  'technology': ['nonfiction', 'practical'],
  'economics': ['nonfiction', 'business'],
  'business': ['nonfiction', 'business'],
  'biography': ['nonfiction', 'narrative'],
  'self-help': ['nonfiction', 'practical'],
  'health': ['nonfiction', 'practical'],
  'education': ['nonfiction', 'academic'],
  'art': ['nonfiction', 'creative'],
  'children': ['children', 'educational'],

  // Special/curated categories
  'featured': ['curated', 'featured'],
  'recommended': ['curated', 'featured'],
  'bestseller': ['curated', 'featured'],
}

// Categories that are "curated" lists, not real topic categories
const CURATED_CATEGORY_NAMES = [
  '推荐新书',
  '每日更新',
  '阅读经典',
  '高分书籍',
  '英文书单',
  '系列',
  '纽约',
  '榜单',
  '本周新书合辑',
]

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const deactivate = args.includes('--deactivate')

  console.log('═══════════════════════════════════════════════════════════════')
  console.log('              CATEGORY SYNC SCRIPT')
  console.log('═══════════════════════════════════════════════════════════════\n')

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n')
  }

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required')
    process.exit(1)
  }

  // Step 1: Add tags column if not exists (always run, needed for subsequent queries)
  console.log('📊 Step 1: Checking/adding tags column...\n')

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })

  let tagsColumnExists = false
  try {
    const client = await pool.connect()
    try {
      // Check if column exists
      const checkResult = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'ebook_categories' AND column_name = 'tags'
      `)

      tagsColumnExists = checkResult.rows.length > 0

      if (!tagsColumnExists) {
        // Always add the column (even in dry-run) so subsequent queries work
        await client.query(`
          ALTER TABLE ebook_categories ADD COLUMN IF NOT EXISTS tags TEXT
        `)
        console.log('   ✅ Added tags column to ebook_categories\n')
        tagsColumnExists = true
      } else {
        console.log('   ✅ tags column already exists\n')
      }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('❌ Failed to add tags column:', error)
    process.exit(1)
  }

  // Step 2: Get all categories (using raw SQL to avoid schema mismatch)
  console.log('📊 Step 2: Loading categories...\n')

  const client2 = await pool.connect()
  let allCategories: any[]
  try {
    const result = await client2.query(`
      SELECT id, name, slug, parent_id as "parentId", ebook_count as "ebookCount",
             magazine_count as "magazineCount", is_active as "isActive",
             COALESCE(tags, '') as tags
      FROM ebook_categories
      ORDER BY sort_order, id
    `)
    allCategories = result.rows
  } finally {
    client2.release()
  }
  console.log(`   Found ${allCategories.length} categories\n`)

  // Step 3: Set tags for each category
  console.log('📊 Step 3: Setting tags for categories...\n')

  let tagsUpdated = 0
  for (const cat of allCategories) {
    let tags: string[] = []

    // Check if it's a curated category
    if (CURATED_CATEGORY_NAMES.includes(cat.name)) {
      tags = ['curated', 'special']
    }
    // Check by slug
    else if (cat.slug && TAG_MAPPINGS[cat.slug]) {
      tags = TAG_MAPPINGS[cat.slug]
    }
    // Check by parent (inherit fiction/nonfiction from parent)
    else if (cat.parentId) {
      const parent = allCategories.find(c => c.id === cat.parentId)
      if (parent?.slug && TAG_MAPPINGS[parent.slug]) {
        // Child inherits parent's main tag
        const parentTags = TAG_MAPPINGS[parent.slug]
        if (parentTags.includes('fiction')) {
          tags = ['fiction', 'narrative']
        } else if (parentTags.includes('nonfiction')) {
          tags = ['nonfiction']
        }
      }
    }

    const tagsString = tags.length > 0 ? tags.join(',') : null

    if (tagsString !== (cat.tags || null)) {
      if (!dryRun) {
        const updateClient = await pool.connect()
        try {
          await updateClient.query(
            'UPDATE ebook_categories SET tags = $1 WHERE id = $2',
            [tagsString, cat.id]
          )
        } finally {
          updateClient.release()
        }
      }
      console.log(`   ${dryRun ? '📝' : '✅'} ${cat.name} (${cat.slug || 'no-slug'}): ${tagsString || '(no tags)'}`)
      tagsUpdated++
    }
  }

  console.log(`\n   ${dryRun ? 'Would update' : 'Updated'} ${tagsUpdated} categories with tags\n`)

  // Step 4: Sync book counts
  console.log('📊 Step 4: Syncing book counts...\n')

  let countsUpdated = 0
  const emptyCategoryIds: number[] = []

  for (const cat of allCategories) {
    // Get child category IDs
    const childIds = allCategories
      .filter(c => c.parentId === cat.id)
      .map(c => c.id)

    const categoryIds = [cat.id, ...childIds]

    let ebookCount = 0
    let magazineCount = 0

    const countClient = await pool.connect()
    try {
      // Count ebooks from junction table
      const ebookJunctionResult = await countClient.query(`
        SELECT COUNT(DISTINCT book_id) as count
        FROM book_categories
        WHERE book_type = 'ebook' AND category_id = ANY($1::int[])
      `, [categoryIds])

      // Count ebooks from legacy categoryId field
      const ebookDirectResult = await countClient.query(`
        SELECT COUNT(*) as count
        FROM ebooks
        WHERE category_id = ANY($1::int[])
      `, [categoryIds])

      ebookCount = Math.max(
        Number(ebookJunctionResult.rows[0]?.count || 0),
        Number(ebookDirectResult.rows[0]?.count || 0)
      )

      // Count magazines from junction table
      const magazineJunctionResult = await countClient.query(`
        SELECT COUNT(DISTINCT book_id) as count
        FROM book_categories
        WHERE book_type = 'magazine' AND category_id = ANY($1::int[])
      `, [categoryIds])

      magazineCount = Number(magazineJunctionResult.rows[0]?.count || 0)

      // Check if counts changed
      if (ebookCount !== cat.ebookCount || magazineCount !== cat.magazineCount) {
        if (!dryRun) {
          await countClient.query(
            'UPDATE ebook_categories SET ebook_count = $1, magazine_count = $2 WHERE id = $3',
            [ebookCount, magazineCount, cat.id]
          )
        }
        console.log(`   ${dryRun ? '📝' : '✅'} ${cat.name}: ebooks ${cat.ebookCount} → ${ebookCount}, magazines ${cat.magazineCount} → ${magazineCount}`)
        countsUpdated++
      }
    } finally {
      countClient.release()
    }

    // Track empty categories
    if (ebookCount === 0 && magazineCount === 0) {
      emptyCategoryIds.push(cat.id)
    }
  }

  console.log(`\n   ${dryRun ? 'Would update' : 'Updated'} ${countsUpdated} category counts\n`)

  // Step 5: Report/deactivate empty categories
  console.log('📊 Step 5: Empty categories report...\n')

  const emptyCategories = allCategories.filter(c => emptyCategoryIds.includes(c.id))
  console.log(`   Found ${emptyCategories.length} empty categories:\n`)

  for (const cat of emptyCategories) {
    const status = cat.isActive ? '🟡 ACTIVE' : '⚪ inactive'
    console.log(`   ${status} [${cat.id}] ${cat.name} (${cat.slug || 'no-slug'})`)

    if (deactivate && cat.isActive) {
      if (!dryRun) {
        const deactivateClient = await pool.connect()
        try {
          await deactivateClient.query(
            'UPDATE ebook_categories SET is_active = false WHERE id = $1',
            [cat.id]
          )
        } finally {
          deactivateClient.release()
        }
      }
      console.log(`      → ${dryRun ? 'Would deactivate' : 'Deactivated'}`)
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('              SYNC COMPLETE')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`
Summary:
  - Tags updated: ${tagsUpdated} categories
  - Counts synced: ${countsUpdated} categories
  - Empty categories: ${emptyCategories.length}
  - Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}
`)

  await pool.end()
  process.exit(0)
}

main().catch(error => {
  console.error('Script failed:', error)
  process.exit(1)
})
