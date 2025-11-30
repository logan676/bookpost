/**
 * Database Abstraction Layer
 * Supports both SQLite and PostgreSQL with a unified interface
 */

import { createSQLiteAdapter } from './sqlite.js'
import { createPostgreSQLAdapter } from './postgresql.js'

const DB_TYPE = process.env.DB_TYPE || 'sqlite'

let dbAdapter = null

/**
 * Initialize the database connection
 */
export async function initDatabase() {
  if (dbAdapter) return dbAdapter

  console.log(`[Database] Initializing ${DB_TYPE} adapter...`)

  if (DB_TYPE === 'postgresql' || DB_TYPE === 'postgres') {
    dbAdapter = await createPostgreSQLAdapter()
  } else {
    dbAdapter = createSQLiteAdapter()
  }

  console.log(`[Database] ${DB_TYPE} adapter initialized`)
  return dbAdapter
}

/**
 * Get the database adapter
 * @returns {DatabaseAdapter}
 */
export function getDb() {
  if (!dbAdapter) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return dbAdapter
}

/**
 * Close the database connection
 */
export async function closeDatabase() {
  if (dbAdapter) {
    await dbAdapter.close()
    dbAdapter = null
  }
}

/**
 * Database adapter interface
 * @typedef {Object} DatabaseAdapter
 * @property {function(string): PreparedStatement} prepare - Prepare a SQL statement
 * @property {function(string): void} exec - Execute raw SQL
 * @property {function(): Promise<void>} close - Close the connection
 * @property {string} type - Database type ('sqlite' | 'postgresql')
 */

/**
 * Prepared statement interface
 * @typedef {Object} PreparedStatement
 * @property {function(...any): Object|undefined} get - Get single row
 * @property {function(...any): Object[]} all - Get all rows
 * @property {function(...any): RunResult} run - Execute statement
 */

/**
 * Run result interface
 * @typedef {Object} RunResult
 * @property {number} changes - Number of affected rows
 * @property {number} lastInsertRowid - Last inserted row ID
 */

export { DB_TYPE }
