/**
 * Migration script: SQLite -> Supabase PostgreSQL
 * Run with: npx tsx scripts/migrate-from-sqlite.ts
 */

import 'dotenv/config'
import Database from 'better-sqlite3'
import pg from 'pg'

const SQLITE_PATH = '../server/bookpost.db'

const { Pool } = pg

async function migrate() {
  console.log('Starting migration from SQLite to Supabase...\n')

  // Connect to SQLite
  const sqlite = new Database(SQLITE_PATH, { readonly: true })
  console.log('✓ Connected to SQLite')

  // Connect to PostgreSQL
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
  const pg_client = await pool.connect()
  console.log('✓ Connected to Supabase PostgreSQL\n')

  try {
    // Clear all tables first (in reverse order of dependencies)
    console.log('Clearing existing data...')
    await pg_client.query('DELETE FROM sessions')
    await pg_client.query('DELETE FROM reading_history')
    await pg_client.query('DELETE FROM note_ideas')
    await pg_client.query('DELETE FROM note_underlines')
    await pg_client.query('DELETE FROM note_comments')
    await pg_client.query('DELETE FROM magazine_ideas')
    await pg_client.query('DELETE FROM magazine_underlines')
    await pg_client.query('DELETE FROM ebook_ideas')
    await pg_client.query('DELETE FROM ebook_underlines')
    await pg_client.query('DELETE FROM ideas')
    await pg_client.query('DELETE FROM underlines')
    await pg_client.query('DELETE FROM blog_posts')
    await pg_client.query('DELETE FROM books')
    await pg_client.query('DELETE FROM notes')
    await pg_client.query('DELETE FROM magazines')
    await pg_client.query('DELETE FROM ebooks')
    await pg_client.query('DELETE FROM publishers')
    await pg_client.query('DELETE FROM ebook_categories')
    await pg_client.query('DELETE FROM users')
    console.log('✓ Cleared existing data\n')

    // Migrate in order (respecting foreign keys)

    // 1. Users
    await migrateTable(sqlite, pg_client, 'users', [
      'id', 'username', 'email', 'password_hash', 'is_admin', 'created_at'
    ])

    // 2. Ebook Categories
    await migrateTable(sqlite, pg_client, 'ebook_categories', [
      'id', 'name', 'description', 'created_at'
    ])

    // 3. Publishers
    await migrateTable(sqlite, pg_client, 'publishers', [
      'id', 'name', 'description', 'created_at'
    ])

    // 4. Ebooks
    await migrateTable(sqlite, pg_client, 'ebooks', [
      'id', 'category_id', 'title', 'file_path', 'file_size', 'file_type',
      'normalized_title', 'cover_url', 's3_key', 'created_at'
    ])

    // 5. Magazines
    await migrateTable(sqlite, pg_client, 'magazines', [
      'id', 'publisher_id', 'title', 'file_path', 'file_size', 'year',
      'page_count', 'cover_url', 'preprocessed', 's3_key', 'created_at'
    ])

    // 6. Notes
    await migrateTable(sqlite, pg_client, 'notes', [
      'id', 'user_id', 'title', 'file_path', 'year', 'content_preview',
      'author', 'publish_date', 'tags', 'categories', 'slug', 'created_at'
    ])

    // 7. Books
    await migrateTable(sqlite, pg_client, 'books', [
      'id', 'user_id', 'title', 'author', 'cover_url', 'cover_photo_url',
      'isbn', 'publisher', 'publish_year', 'description', 'page_count',
      'categories', 'language', 'created_at'
    ])

    // 8. Blog Posts
    await migrateTable(sqlite, pg_client, 'blog_posts', [
      'id', 'book_id', 'title', 'content', 'page_photo_url', 'page_number',
      'extracted_text', 'created_at', 'updated_at'
    ])

    // 9. Reading History
    await migrateTable(sqlite, pg_client, 'reading_history', [
      'id', 'user_id', 'item_type', 'item_id', 'title', 'cover_url',
      'last_page', 'last_read_at', 'created_at'
    ])

    // Reset sequences for auto-increment
    await resetSequences(pg_client)

    console.log('\n✓ Migration completed successfully!')

  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  } finally {
    pg_client.release()
    await pool.end()
    sqlite.close()
  }
}

async function migrateTable(
  sqlite: Database.Database,
  pg_client: pg.PoolClient,
  tableName: string,
  columns: string[]
) {
  const rows = sqlite.prepare(`SELECT * FROM ${tableName}`).all()

  if (rows.length === 0) {
    console.log(`⏭ ${tableName}: 0 records (skipped)`)
    return
  }

  // Clear existing data
  await pg_client.query(`DELETE FROM ${tableName}`)

  // Build insert query
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')
  const columnList = columns.join(', ')
  const insertQuery = `INSERT INTO ${tableName} (${columnList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`

  let inserted = 0
  for (const row of rows) {
    const values = columns.map(col => {
      const value = (row as Record<string, unknown>)[col]
      // Convert SQLite boolean (0/1) to PostgreSQL boolean
      if (col === 'is_admin' || col === 'preprocessed') {
        return value === 1 || value === true
      }
      // Handle timestamps
      if (col.includes('_at') && value === 'CURRENT_TIMESTAMP') {
        return new Date()
      }
      return value ?? null
    })

    try {
      await pg_client.query(insertQuery, values)
      inserted++
    } catch (err) {
      console.error(`Error inserting into ${tableName}:`, err)
    }
  }

  console.log(`✓ ${tableName}: ${inserted}/${rows.length} records migrated`)
}

async function resetSequences(pg_client: pg.PoolClient) {
  const tables = [
    'users', 'ebook_categories', 'publishers', 'ebooks', 'magazines',
    'notes', 'books', 'blog_posts', 'reading_history', 'sessions',
    'underlines', 'ideas', 'ebook_underlines', 'ebook_ideas',
    'magazine_underlines', 'magazine_ideas', 'note_underlines', 'note_ideas',
    'note_comments'
  ]

  for (const table of tables) {
    try {
      await pg_client.query(`
        SELECT setval(pg_get_serial_sequence('${table}', 'id'),
          COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1, false)
      `)
    } catch {
      // Sequence might not exist for this table
    }
  }
  console.log('✓ Sequences reset')
}

migrate().catch(console.error)
