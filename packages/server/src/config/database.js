/**
 * Database Configuration
 *
 * This module provides backward-compatible database access.
 * Uses the new abstraction layer internally but exports a synchronous interface.
 *
 * For new code, prefer using:
 *   import { getDb } from './db/index.js'
 *
 * For existing code, this export still works:
 *   import db from './config/database.js'
 */

import { createSQLiteAdapter } from './db/sqlite.js'

// Create SQLite adapter synchronously for backward compatibility
// PostgreSQL should use the async initDatabase() from db/index.js
const adapter = createSQLiteAdapter()

// Export the adapter's raw database for backward compatibility
// This allows existing code using db.prepare() to continue working
const db = adapter._raw

export default db

// Also export the adapter for code that wants the unified interface
export { adapter }
