import { serve } from '@hono/node-server'
import { app } from './app'
import { testConnection } from './db/client'
import 'dotenv/config'

const PORT = Number(process.env.PORT) || 3001

async function main() {
  // Test database connection
  const dbConnected = await testConnection()
  if (!dbConnected) {
    console.error('Failed to connect to database. Exiting...')
    process.exit(1)
  }

  // Start server
  console.log(`Starting BookPost API server...`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)

  serve({
    fetch: app.fetch,
    port: PORT,
  }, (info) => {
    console.log(`Server running at http://localhost:${info.port}`)
    console.log(`OpenAPI docs at http://localhost:${info.port}/api/openapi.json`)
  })
}

main().catch(console.error)
