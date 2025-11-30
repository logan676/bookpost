/**
 * Database Configuration
 *
 * This module provides backward-compatible database access.
 * Auto-detects PostgreSQL from DATABASE_URL environment variable.
 *
 * For new code, prefer using:
 *   import { getDb } from './db/index.js'
 *
 * For existing code, this export still works:
 *   import db from './config/database.js'
 */

import { createSQLiteAdapter } from './db/sqlite.js'
import { createPostgreSQLAdapter } from './db/postgresql.js'

// Auto-detect database type
const isPostgreSQL = !!process.env.DATABASE_URL

let adapter
let db

if (isPostgreSQL) {
  // For PostgreSQL, we need to initialize asynchronously
  adapter = await createPostgreSQLAdapter()
  // Export the adapter which has prepare(), exec(), etc. methods
  db = adapter
  console.log('[Database] Using PostgreSQL adapter')
} else {
  // SQLite can be created synchronously
  adapter = createSQLiteAdapter()
  // Export the adapter which has prepare(), exec(), etc. methods
  // This provides a consistent interface with PostgreSQL
  db = adapter
  console.log('[Database] Using SQLite adapter')
}

export default db

// Also export the adapter for code that wants the unified interface
export { adapter }
