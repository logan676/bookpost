/**
 * Run SQL Migration - Execute the curated lists migration
 *
 * Run with: npx tsx src/scripts/run-migration.ts
 */

import 'dotenv/config'
import pg from 'pg'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const { Pool } = pg
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('              RUNNING DATABASE MIGRATION')
  console.log('═══════════════════════════════════════════════════════════════\n')

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required')
    process.exit(1)
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  })

  try {
    // Read the migration SQL file
    const migrationPath = join(__dirname, 'migrate-curated-lists.sql')
    const sql = readFileSync(migrationPath, 'utf-8')

    console.log('📂 Migration file loaded: migrate-curated-lists.sql\n')
    console.log('🔄 Executing migration...\n')

    // Execute the migration
    const client = await pool.connect()
    try {
      await client.query(sql)
      console.log('✅ Migration completed successfully!\n')

      // Verify the columns exist now
      const verifyResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'curated_lists'
        ORDER BY ordinal_position
      `)

      console.log('📊 curated_lists table columns:')
      for (const row of verifyResult.rows) {
        console.log(`   - ${row.column_name} (${row.data_type})`)
      }

    } finally {
      client.release()
    }

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('              MIGRATION COMPLETE')
  console.log('═══════════════════════════════════════════════════════════════\n')

  process.exit(0)
}

main()
