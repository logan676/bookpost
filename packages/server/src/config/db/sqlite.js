/**
 * SQLite Database Adapter
 * Wraps better-sqlite3 to match the unified interface
 */

import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Create SQLite adapter with unified interface
 */
export function createSQLiteAdapter() {
  const dbPath = process.env.SQLITE_PATH || join(__dirname, '../../../bookpost.db')
  const db = new Database(dbPath)

  // Enable WAL mode for better concurrent access
  db.pragma('journal_mode = WAL')

  return {
    type: 'sqlite',
    _raw: db, // Access to raw better-sqlite3 instance if needed

    /**
     * Prepare a SQL statement
     * Returns an object with get, all, run methods
     */
    prepare(sql) {
      const stmt = db.prepare(sql)

      return {
        /**
         * Get single row
         */
        get(...params) {
          return stmt.get(...params)
        },

        /**
         * Get all rows
         */
        all(...params) {
          return stmt.all(...params)
        },

        /**
         * Run statement (INSERT, UPDATE, DELETE)
         */
        run(...params) {
          const result = stmt.run(...params)
          return {
            changes: result.changes,
            lastInsertRowid: Number(result.lastInsertRowid),
          }
        },
      }
    },

    /**
     * Execute raw SQL (multiple statements)
     */
    exec(sql) {
      db.exec(sql)
    },

    /**
     * Close connection
     */
    close() {
      db.close()
      return Promise.resolve()
    },

    /**
     * Get PRAGMA table info
     */
    pragma(sql) {
      return db.pragma(sql)
    },
  }
}
