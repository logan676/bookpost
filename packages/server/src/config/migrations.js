import db from './database.js'

/**
 * Database migrations
 * Each migration should be idempotent (safe to run multiple times)
 */

const migrations = [
  {
    name: 'add_refresh_token_to_sessions',
    up: () => {
      // Check if column exists first
      const tableInfo = db.prepare("PRAGMA table_info(sessions)").all()
      const hasRefreshToken = tableInfo.some(col => col.name === 'refresh_token')

      if (!hasRefreshToken) {
        db.exec(`
          ALTER TABLE sessions ADD COLUMN refresh_token TEXT;
          ALTER TABLE sessions ADD COLUMN refresh_expires_at TEXT;
          ALTER TABLE sessions ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP;
        `)
        console.log('[Migrations] Added refresh_token columns to sessions table')
      }
    }
  },
  {
    name: 'add_is_admin_to_users',
    up: () => {
      const tableInfo = db.prepare("PRAGMA table_info(users)").all()
      const hasIsAdmin = tableInfo.some(col => col.name === 'is_admin')

      if (!hasIsAdmin) {
        db.exec(`ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0`)
        console.log('[Migrations] Added is_admin column to users table')
      }
    }
  },
  {
    name: 'add_user_id_to_magazine_underlines_and_ideas',
    up: () => {
      // Add user_id to magazine_underlines
      const underlineTableInfo = db.prepare("PRAGMA table_info(magazine_underlines)").all()
      const hasUnderlineUserId = underlineTableInfo.some(col => col.name === 'user_id')

      if (!hasUnderlineUserId) {
        db.exec(`ALTER TABLE magazine_underlines ADD COLUMN user_id INTEGER REFERENCES users(id)`)
        console.log('[Migrations] Added user_id column to magazine_underlines table')
      }

      // Add user_id to magazine_ideas
      const ideasTableInfo = db.prepare("PRAGMA table_info(magazine_ideas)").all()
      const hasIdeasUserId = ideasTableInfo.some(col => col.name === 'user_id')

      if (!hasIdeasUserId) {
        db.exec(`ALTER TABLE magazine_ideas ADD COLUMN user_id INTEGER REFERENCES users(id)`)
        console.log('[Migrations] Added user_id column to magazine_ideas table')
      }
    }
  }
]

/**
 * Run all pending migrations
 */
export function runMigrations() {
  console.log('[Migrations] Checking for pending migrations...')

  // Create migrations table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      executed_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

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
