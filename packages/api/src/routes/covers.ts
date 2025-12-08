/**
 * Cover Images Routes - Serves covers from R2 storage
 */

import { Hono } from 'hono'
import { streamFromR2, isR2Configured } from '../services/storage'

const app = new Hono()

// GET /api/r2-covers/:type/:filename
app.get('/:type/:filename', async (c) => {
  const { type, filename } = c.req.param()

  if (!['magazines', 'ebooks'].includes(type)) {
    return c.json({ error: 'Invalid type' }, 400)
  }

  if (!isR2Configured()) {
    return c.json({ error: 'R2 storage not configured' }, 500)
  }

  const r2Key = `covers/${type}/${filename}`

  try {
    const stream = await streamFromR2(r2Key)

    if (!stream) {
      return c.json({ error: 'Cover not found' }, 404)
    }

    // Convert the stream to a ReadableStream for Hono
    const webStream = stream.transformToWebStream()

    return new Response(webStream, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    console.error('Failed to serve cover:', error)
    return c.json({ error: 'Failed to serve cover' }, 500)
  }
})

export default app
