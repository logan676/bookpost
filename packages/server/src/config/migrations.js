import db from './database.js'

/**
 * Database migrations
 * Each migration should be idempotent (safe to run multiple times)
 */

// Check if we're using PostgreSQL
const isPostgreSQL = !!process.env.DATABASE_URL

/**
 * Get column info for a table (works with both SQLite and PostgreSQL)
 */
function getTableColumns(tableName) {
  if (isPostgreSQL) {
    try {
      const result = db.prepare(`
        SELECT column_name as name
        FROM information_schema.columns
        WHERE table_name = ?
      `).all(tableName)
      return result.map(col => col.name)
    } catch {
      return []
    }
  } else {
    try {
      const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all()
      return tableInfo.map(col => col.name)
    } catch {
      return []
    }
  }
}

/**
 * Add column if it doesn't exist (PostgreSQL compatible)
 */
function addColumnIfNotExists(tableName, columnName, columnDef) {
  const columns = getTableColumns(tableName)
  if (!columns.includes(columnName)) {
    if (isPostgreSQL) {
      // PostgreSQL uses ADD COLUMN IF NOT EXISTS
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${columnName} ${columnDef}`)
    } else {
      // SQLite doesn't support IF NOT EXISTS for ADD COLUMN
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`)
    }
    return true
  }
  return false
}

const migrations = [
  {
    name: 'add_ebook_metadata_fields',
    up: () => {
      // Skip for PostgreSQL - schema.sql already has all columns
      if (isPostgreSQL) {
        console.log('[Migrations] PostgreSQL: Skipping ebook metadata (included in schema)')
        return
      }

      addColumnIfNotExists('ebooks', 'author', 'TEXT')
      addColumnIfNotExists('ebooks', 'description', 'TEXT')
      addColumnIfNotExists('ebooks', 'publisher', 'TEXT')
      addColumnIfNotExists('ebooks', 'language', 'TEXT')
      addColumnIfNotExists('ebooks', 'page_count', 'INTEGER')
      addColumnIfNotExists('ebooks', 'chapter_count', 'INTEGER')
      addColumnIfNotExists('ebooks', 'toc_json', 'TEXT')
      addColumnIfNotExists('ebooks', 'publish_date', 'TEXT')
      addColumnIfNotExists('ebooks', 'isbn', 'TEXT')
      addColumnIfNotExists('ebooks', 'metadata_extracted', 'INTEGER DEFAULT 0')
      addColumnIfNotExists('ebooks', 'metadata_extracted_at', 'TEXT')

      console.log('[Migrations] Added ebook metadata fields')
    }
  },
  {
    name: 'add_refresh_token_to_sessions',
    up: () => {
      if (isPostgreSQL) {
        console.log('[Migrations] PostgreSQL: Skipping sessions columns (included in schema)')
        return
      }

      addColumnIfNotExists('sessions', 'refresh_token', 'TEXT')
      addColumnIfNotExists('sessions', 'refresh_expires_at', 'TEXT')
      addColumnIfNotExists('sessions', 'created_at', 'TEXT DEFAULT CURRENT_TIMESTAMP')
      console.log('[Migrations] Added refresh_token columns to sessions table')
    }
  },
  {
    name: 'add_is_admin_to_users',
    up: () => {
      if (isPostgreSQL) {
        console.log('[Migrations] PostgreSQL: Skipping is_admin column (included in schema)')
        return
      }

      addColumnIfNotExists('users', 'is_admin', 'INTEGER DEFAULT 0')
      console.log('[Migrations] Added is_admin column to users table')
    }
  },
  {
    name: 'add_user_id_to_magazine_underlines_and_ideas',
    up: () => {
      if (isPostgreSQL) {
        console.log('[Migrations] PostgreSQL: Skipping user_id columns (included in schema)')
        return
      }

      addColumnIfNotExists('magazine_underlines', 'user_id', 'INTEGER REFERENCES users(id)')
      addColumnIfNotExists('magazine_ideas', 'user_id', 'INTEGER REFERENCES users(id)')
      console.log('[Migrations] Added user_id columns to magazine tables')
    }
  },
  {
    name: 'add_magazine_metadata_fields',
    up: () => {
      if (isPostgreSQL) {
        console.log('[Migrations] PostgreSQL: Skipping magazine metadata (included in schema)')
        return
      }

      addColumnIfNotExists('magazines', 'author', 'TEXT')
      addColumnIfNotExists('magazines', 'description', 'TEXT')
      addColumnIfNotExists('magazines', 'publisher_name', 'TEXT')
      addColumnIfNotExists('magazines', 'language', 'TEXT')
      addColumnIfNotExists('magazines', 'publish_date', 'TEXT')
      addColumnIfNotExists('magazines', 'metadata_extracted', 'INTEGER DEFAULT 0')
      addColumnIfNotExists('magazines', 'metadata_extracted_at', 'TEXT')

      console.log('[Migrations] Added magazine metadata fields')
    }
  },
  {
    name: 'add_external_book_metadata_fields',
    up: () => {
      if (isPostgreSQL) {
        console.log('[Migrations] PostgreSQL: Skipping external metadata (included in schema)')
        return
      }

      addColumnIfNotExists('ebooks', 'google_books_id', 'TEXT')
      addColumnIfNotExists('ebooks', 'open_library_key', 'TEXT')
      addColumnIfNotExists('ebooks', 'average_rating', 'REAL')
      addColumnIfNotExists('ebooks', 'ratings_count', 'INTEGER')
      addColumnIfNotExists('ebooks', 'categories', 'TEXT')
      addColumnIfNotExists('ebooks', 'subjects', 'TEXT')
      addColumnIfNotExists('ebooks', 'preview_link', 'TEXT')
      addColumnIfNotExists('ebooks', 'info_link', 'TEXT')
      addColumnIfNotExists('ebooks', 'external_cover_url', 'TEXT')
      addColumnIfNotExists('ebooks', 'external_metadata_source', 'TEXT')
      addColumnIfNotExists('ebooks', 'external_metadata_fetched_at', 'TEXT')

      console.log('[Migrations] Added external book metadata fields (Google Books, Open Library)')
    }
  }
]

/**
 * Run all pending migrations
 */
export function runMigrations() {
  console.log(`[Migrations] Checking for pending migrations (${isPostgreSQL ? 'PostgreSQL' : 'SQLite'})...`)

  // Create migrations table if it doesn't exist
  if (isPostgreSQL) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
  } else {
    db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        executed_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)
  }

  const executed = db.prepare('SELECT name FROM migrations').all().map(m => m.name)

  for (const migration of migrations) {
    if (!executed.includes(migration.name)) {
      try {
        migration.up()
        db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migration.name)
        console.log(`[Migrations] Executed: ${migration.name}`)
      } catch (error) {
        console.error(`[Migrations] Failed to execute ${migration.name}:`, error.message)
      }
    }
  }

  console.log('[Migrations] All migrations complete')
}
