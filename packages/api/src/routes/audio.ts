import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { db } from '../db/client'
import { audioSeries, audioFiles } from '../db/schema'
import { eq, like, desc, count, asc } from 'drizzle-orm'
import { streamFromR2WithRange, getR2ObjectMetadata, isR2Configured } from '../services/storage'

const app = new OpenAPIHono()

// Schemas
const AudioSeriesSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  coverUrl: z.string().nullable(),
  audioCount: z.number().nullable(),
  createdAt: z.string().nullable(),
})

const AudioFileSchema = z.object({
  id: z.number(),
  seriesId: z.number().nullable(),
  title: z.string(),
  s3Key: z.string().nullable(),
  fileSize: z.number().nullable(),
  duration: z.number().nullable(),
  fileType: z.string().nullable(),
  trackNumber: z.number().nullable(),
  createdAt: z.string().nullable(),
})

// GET /api/audio-series - List all audio series
const listSeriesRoute = createRoute({
  method: 'get',
  path: '/series',
  tags: ['Audio'],
  summary: 'List all audio series',
  responses: {
    200: {
      description: 'List of audio series',
      content: {
        'application/json': {
          schema: z.array(AudioSeriesSchema),
        },
      },
    },
  },
})

app.openapi(listSeriesRoute, async (c) => {
  const results = await db
    .select()
    .from(audioSeries)
    .orderBy(desc(audioSeries.createdAt))

  // Get count for each series
  const seriesWithCount = await Promise.all(
    results.map(async (series) => {
      const [result] = await db
        .select({ count: count() })
        .from(audioFiles)
        .where(eq(audioFiles.seriesId, series.id))
      return {
        ...series,
        audioCount: result.count,
        createdAt: series.createdAt?.toISOString() ?? null,
      }
    })
  )

  return c.json(seriesWithCount)
})

// GET /api/audio-series/:id - Get single series
const getSeriesRoute = createRoute({
  method: 'get',
  path: '/series/:id',
  tags: ['Audio'],
  summary: 'Get audio series by ID',
  request: {
    params: z.object({
      id: z.coerce.number(),
    }),
  },
  responses: {
    200: {
      description: 'Audio series details',
      content: {
        'application/json': {
          schema: z.object({ data: AudioSeriesSchema }),
        },
      },
    },
    404: {
      description: 'Series not found',
      content: {
        'application/json': {
          schema: z.object({
            error: z.object({
              code: z.string(),
              message: z.string(),
            }),
          }),
        },
      },
    },
  },
})

app.openapi(getSeriesRoute, async (c) => {
  const { id } = c.req.valid('param')

  const [series] = await db
    .select()
    .from(audioSeries)
    .where(eq(audioSeries.id, id))
    .limit(1)

  if (!series) {
    return c.json({
      error: { code: 'NOT_FOUND', message: 'Audio series not found' },
    }, 404)
  }

  const [countResult] = await db
    .select({ count: count() })
    .from(audioFiles)
    .where(eq(audioFiles.seriesId, id))

  return c.json({
    data: {
      ...series,
      audioCount: countResult.count,
      createdAt: series.createdAt?.toISOString() ?? null,
    },
  }, 200)
})

// GET /api/audio - List audio files
const listAudioRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Audio'],
  summary: 'List audio files',
  request: {
    query: z.object({
      series_id: z.coerce.number().optional(),
      search: z.string().optional(),
      limit: z.coerce.number().default(50),
      offset: z.coerce.number().default(0),
    }),
  },
  responses: {
    200: {
      description: 'List of audio files',
      content: {
        'application/json': {
          schema: z.array(AudioFileSchema),
        },
      },
    },
  },
})

app.openapi(listAudioRoute, async (c) => {
  const { series_id, search, limit, offset } = c.req.valid('query')

  let query = db.select().from(audioFiles).$dynamic()

  if (series_id) {
    query = query.where(eq(audioFiles.seriesId, series_id))
  }

  if (search) {
    query = query.where(like(audioFiles.title, `%${search}%`))
  }

  const results = await query
    .orderBy(asc(audioFiles.trackNumber), asc(audioFiles.title))
    .limit(limit)
    .offset(offset)

  return c.json(
    results.map((audio) => ({
      ...audio,
      createdAt: audio.createdAt?.toISOString() ?? null,
    }))
  )
})

// GET /api/audio/:id - Get single audio file
const getAudioRoute = createRoute({
  method: 'get',
  path: '/:id',
  tags: ['Audio'],
  summary: 'Get audio file by ID',
  request: {
    params: z.object({
      id: z.coerce.number(),
    }),
  },
  responses: {
    200: {
      description: 'Audio file details',
      content: {
        'application/json': {
          schema: z.object({ data: AudioFileSchema }),
        },
      },
    },
    404: {
      description: 'Audio file not found',
      content: {
        'application/json': {
          schema: z.object({
            error: z.object({
              code: z.string(),
              message: z.string(),
            }),
          }),
        },
      },
    },
  },
})

app.openapi(getAudioRoute, async (c) => {
  const { id } = c.req.valid('param')

  const [audio] = await db
    .select()
    .from(audioFiles)
    .where(eq(audioFiles.id, id))
    .limit(1)

  if (!audio) {
    return c.json({
      error: { code: 'NOT_FOUND', message: 'Audio file not found' },
    }, 404)
  }

  return c.json({
    data: {
      ...audio,
      createdAt: audio.createdAt?.toISOString() ?? null,
    },
  }, 200)
})

// GET /api/audio/:id/stream - Stream audio file with range support
app.get('/:id/stream', async (c) => {
  const id = parseInt(c.req.param('id'))

  if (isNaN(id)) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid audio ID' } }, 400)
  }

  // Get audio from database
  const [audio] = await db
    .select()
    .from(audioFiles)
    .where(eq(audioFiles.id, id))
    .limit(1)

  if (!audio) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Audio file not found' } }, 404)
  }

  if (!audio.s3Key) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Audio file not available' } }, 404)
  }

  if (!isR2Configured()) {
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Storage not configured' } }, 500)
  }

  try {
    const rangeHeader = c.req.header('Range')

    // Get file metadata first for Content-Length
    const metadata = await getR2ObjectMetadata(audio.s3Key)
    if (!metadata) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'File not found in storage' } }, 404)
    }

    const fileSize = metadata.contentLength || 0
    const contentType = getAudioContentType(audio.fileType || audio.s3Key)

    // Handle range request for seeking
    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
      if (match) {
        const start = parseInt(match[1])
        const end = match[2] ? parseInt(match[2]) : fileSize - 1
        const chunkSize = end - start + 1

        const result = await streamFromR2WithRange(audio.s3Key, `bytes=${start}-${end}`)
        if (!result || !result.body) {
          return c.json({ error: { code: 'NOT_FOUND', message: 'File not found in storage' } }, 404)
        }

        const webStream = result.body.transformToWebStream()

        return new Response(webStream, {
          status: 206,
          headers: {
            'Content-Type': contentType,
            'Content-Length': String(chunkSize),
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'private, max-age=3600',
          },
        })
      }
    }

    // No range header - stream entire file
    const result = await streamFromR2WithRange(audio.s3Key)
    if (!result || !result.body) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'File not found in storage' } }, 404)
    }

    const webStream = result.body.transformToWebStream()

    return new Response(webStream, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(fileSize),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600',
        'Content-Disposition': `inline; filename="${encodeURIComponent(audio.title || 'audio')}.${getFileExtension(audio.fileType || audio.s3Key)}"`,
      },
    })
  } catch (error) {
    console.error('Failed to stream audio file:', error)
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Failed to stream audio' } }, 500)
  }
})

// Helper function to get content type from file extension
function getAudioContentType(fileTypeOrKey: string): string {
  const ext = fileTypeOrKey.toLowerCase().split('.').pop() || fileTypeOrKey.toLowerCase()
  const contentTypes: Record<string, string> = {
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
    webm: 'audio/webm',
  }
  return contentTypes[ext] || 'audio/mpeg'
}

// Helper function to get file extension
function getFileExtension(fileTypeOrKey: string): string {
  const ext = fileTypeOrKey.toLowerCase().split('.').pop()
  return ext || 'mp3'
}

export { app as audioRoutes }
