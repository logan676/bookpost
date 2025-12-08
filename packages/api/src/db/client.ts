import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from './schema'

const { Pool } = pg

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})

export const db = drizzle(pool, { schema })

// Test connection
export async function testConnection() {
  try {
    const client = await pool.connect()
    console.log('Database connected successfully')
    client.release()
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}
