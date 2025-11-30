/**
 * PostgreSQL Database Adapter
 * Wraps pg (node-postgres) to match the unified interface
 * Uses synchronous-like pattern with execSync for compatibility
 */

import pg from 'pg'
import { execSync } from 'child_process'

const { Pool } = pg

/**
 * Create PostgreSQL adapter with unified interface
 */
export async function createPostgreSQLAdapter() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Alternative individual config
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432'),
    database: process.env.PGDATABASE || 'bookpost',
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  })

  // Test connection
  try {
    const client = await pool.connect()
    console.log('[PostgreSQL] Connected successfully')
    client.release()
  } catch (err) {
    console.error('[PostgreSQL] Connection failed:', err.message)
    throw err
  }

  /**
   * Convert SQLite-style ? placeholders to PostgreSQL $1, $2, etc.
   */
  function convertPlaceholders(sql) {
    let counter = 0
    return sql.replace(/\?/g, () => `$${++counter}`)
  }

  /**
   * Synchronous query wrapper using event loop tricks
   */
  function syncQuery(sql, params = []) {
    const pgSql = convertPlaceholders(sql)
    let result = null
    let error = null
    let resolved = false

    const promise = pool.query(pgSql, params)

    promise.then(
      (res) => {
        result = res
        resolved = true
      },
      (err) => {
        error = err
        resolved = true
      }
    )

    // Use setImmediate loop to wait synchronously
    const waitSync = () => {
      const start = Date.now()
      while (!resolved && Date.now() - start < 30000) {
        try {
          execSync('sleep 0.001', { stdio: 'ignore' })
        } catch {
          // Ignore
        }
      }
    }

    waitSync()

    if (error) throw error
    return result
  }

  return {
    type: 'postgresql',
    _raw: pool,

    prepare(sql) {
      return {
        get(...params) {
          const result = syncQuery(sql, params)
          return result?.rows?.[0]
        },

        all(...params) {
          const result = syncQuery(sql, params)
          return result?.rows || []
        },

        run(...params) {
          // For INSERT, add RETURNING id
          let finalSql = sql
          if (/^\s*INSERT/i.test(sql) && !/RETURNING/i.test(sql)) {
            finalSql = sql.replace(/;?\s*$/, ' RETURNING id')
          }

          const result = syncQuery(finalSql, params)
          return {
            changes: result?.rowCount || 0,
            lastInsertRowid: result?.rows?.[0]?.id || 0,
          }
        },
      }
    },

    exec(sql) {
      const pgSql = convertPlaceholders(sql)
      syncQuery(pgSql)
    },

    async close() {
      await pool.end()
    },

    pragma(sql) {
      if (sql.startsWith('table_info(')) {
        const tableName = sql.match(/table_info\(([^)]+)\)/)?.[1]
        if (tableName) {
          const result = syncQuery(`
            SELECT column_name as name, data_type as type,
                   is_nullable = 'NO' as notnull,
                   column_default as dflt_value
            FROM information_schema.columns
            WHERE table_name = $1
          `, [tableName])
          return result?.rows || []
        }
      }
      return []
    },
  }
}
