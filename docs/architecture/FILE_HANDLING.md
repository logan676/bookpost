# File Download and Display Architecture

## Overview

BookLibrio handles various file types including ebooks (EPUB/PDF), magazines (PDF), cover images, and multimedia content (audio/video). All files are stored in Cloudflare R2 and streamed through the API server.

## Storage Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Cloudflare R2 Bucket                             │
│                              (booklibrio-files)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  /ebooks/                                                                   │
│  ├── {id}/                                                                  │
│  │   ├── book.epub                    # EPUB file                          │
│  │   ├── book.pdf                     # PDF file                           │
│  │   └── cover.jpg                    # Cover image                        │
│  │                                                                          │
│  /magazines/                                                                │
│  ├── {id}/                                                                  │
│  │   ├── magazine.pdf                 # Full PDF                           │
│  │   ├── cover.jpg                    # Cover image                        │
│  │   └── pages/                       # Pre-rendered pages (optional)      │
│  │       ├── page-001.jpg                                                  │
│  │       ├── page-002.jpg                                                  │
│  │       └── ...                                                           │
│  │                                                                          │
│  /covers/                             # Standalone cover images            │
│  ├── books/                                                                 │
│  ├── ebooks/                                                                │
│  └── magazines/                                                             │
│                                                                             │
│  /audio/                                                                    │
│  ├── {series_id}/                                                          │
│  │   └── {file}.mp3                                                        │
│  │                                                                          │
│  /video/                                                                    │
│  ├── movies/                                                                │
│  ├── tvshows/                                                               │
│  └── documentaries/                                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## File Types and Handling

| File Type | Extension | Storage | Delivery Method |
|-----------|-----------|---------|-----------------|
| Ebook | .epub | R2 | Stream via API |
| Ebook | .pdf | R2 | Stream via API |
| Magazine | .pdf | R2 | Page-by-page or full |
| Cover Image | .jpg, .png | R2 | Direct URL or CDN |
| Audio | .mp3 | R2 | Range streaming |
| Video | .mp4 | R2 | Range streaming |

---

## Ebook File Flow

### EPUB Download and Rendering

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │     │ API Server  │     │     R2      │     │   Reader    │
│    App      │     │   (Hono)    │     │   Storage   │     │  Component  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │                   │
       │ 1. GET /api/ebooks/:id               │                   │
       │──────────────────>│                   │                   │
       │                   │                   │                   │
       │ 2. Ebook metadata │                   │                   │
       │   { file_path,    │                   │                   │
       │     format, ... } │                   │                   │
       │<──────────────────│                   │                   │
       │                   │                   │                   │
       │ 3. GET /api/ebooks/:id/file          │                   │
       │──────────────────>│                   │                   │
       │                   │                   │                   │
       │                   │ 4. Fetch from R2  │                   │
       │                   │──────────────────>│                   │
       │                   │                   │                   │
       │                   │ 5. File stream    │                   │
       │                   │<──────────────────│                   │
       │                   │                   │                   │
       │ 6. Stream EPUB    │                   │                   │
       │   Content-Type:   │                   │                   │
       │   application/    │                   │                   │
       │   epub+zip        │                   │                   │
       │<──────────────────│                   │                   │
       │                   │                   │                   │
       │                   │                   │                   │
       │ 7. Initialize     │                   │                   │
       │    epub.js        │                   │                   │
       │────────────────────────────────────────────────────────>│
       │                   │                   │                   │
       │                   │                   │   8. Render book  │
       │                   │                   │<──────────────────│
```

### PDF Ebook Rendering

Similar flow but uses PDF.js for rendering on web and native PDF viewers on mobile.

---

## Magazine Page Display

Magazines are rendered page-by-page as images for optimal mobile performance.

### Option A: Pre-rendered Pages (Recommended)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │     │ API Server  │     │     R2      │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ 1. GET /api/magazines/:id            │
       │──────────────────>│                   │
       │                   │                   │
       │ 2. { page_count: 120,                │
       │      pages_ready: true }             │
       │<──────────────────│                   │
       │                   │                   │
       │ 3. GET /api/magazines/:id/page/1     │
       │──────────────────>│                   │
       │                   │                   │
       │                   │ 4. Fetch page-001.jpg
       │                   │──────────────────>│
       │                   │                   │
       │ 5. Return JPEG    │<──────────────────│
       │<──────────────────│                   │
       │                   │                   │
       │ [Prefetch pages 2-5 in background]   │
       │                   │                   │
       │ 6. GET /api/magazines/:id/page/2     │
       │──────────────────>│                   │
       │                   │                   │
       │  ... (from cache or R2)              │
```

### Option B: On-demand PDF Rendering

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │     │ API Server  │     │     R2      │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ GET /api/magazines/:id/page/5        │
       │──────────────────>│                   │
       │                   │                   │
       │                   │ Check if cached   │
       │                   │                   │
       │                   │ If not cached:    │
       │                   │ 1. Fetch PDF      │
       │                   │──────────────────>│
       │                   │                   │
       │                   │ 2. Extract page 5 │
       │                   │    using pdftoppm │
       │                   │                   │
       │                   │ 3. Upload to R2   │
       │                   │    for caching    │
       │                   │──────────────────>│
       │                   │                   │
       │ Return JPEG       │                   │
       │<──────────────────│                   │
```

---

## API Endpoints

### Ebook Endpoints

```yaml
GET /api/ebooks/{id}:
  summary: Get ebook metadata
  responses:
    200:
      schema:
        type: object
        properties:
          id: integer
          title: string
          author: string
          format: enum [epub, pdf]
          file_path: string
          cover_url: string
          page_count: integer

GET /api/ebooks/{id}/file:
  summary: Download ebook file
  responses:
    200:
      content:
        application/epub+zip: {}
        application/pdf: {}
      headers:
        Content-Disposition:
          schema:
            type: string
            example: attachment; filename="book.epub"

GET /api/ebooks/{id}/text:
  summary: Get ebook text content (for search/indexing)
  parameters:
    - name: chapter
      in: query
      schema:
        type: integer
  responses:
    200:
      content:
        application/json:
          schema:
            type: object
            properties:
              chapters:
                type: array
                items:
                  type: object
                  properties:
                    index: integer
                    title: string
                    text: string
```

### Magazine Endpoints

```yaml
GET /api/magazines/{id}:
  summary: Get magazine metadata
  responses:
    200:
      schema:
        type: object
        properties:
          id: integer
          title: string
          publisher: string
          issue_date: string
          page_count: integer
          cover_url: string

GET /api/magazines/{id}/page/{pageNum}:
  summary: Get magazine page as image
  parameters:
    - name: pageNum
      in: path
      required: true
      schema:
        type: integer
        minimum: 1
    - name: quality
      in: query
      schema:
        type: string
        enum: [low, medium, high]
        default: medium
  responses:
    200:
      content:
        image/jpeg: {}
      headers:
        Cache-Control:
          schema:
            type: string
            example: public, max-age=31536000

GET /api/magazines/{id}/pdf:
  summary: Download full magazine PDF
  responses:
    200:
      content:
        application/pdf: {}
```

---

## Streaming Implementation

### Range Request Support (Audio/Video)

```typescript
// packages/api/src/routes/audio.ts

app.get('/:id/stream', async (c) => {
  const id = c.req.param('id')
  const audio = await db.query.audio.findFirst({ where: eq(audio.id, id) })

  if (!audio) {
    return c.notFound()
  }

  const range = c.req.header('Range')
  const fileSize = audio.file_size

  if (range) {
    // Parse range header
    const parts = range.replace(/bytes=/, '').split('-')
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
    const chunkSize = end - start + 1

    // Stream from R2 with range
    const stream = await r2.getObjectRange(audio.file_path, start, end)

    return new Response(stream, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize.toString(),
        'Content-Type': 'audio/mpeg',
      },
    })
  }

  // Full file stream
  const stream = await r2.getObject(audio.file_path)
  return new Response(stream, {
    headers: {
      'Content-Length': fileSize.toString(),
      'Content-Type': 'audio/mpeg',
    },
  })
})
```

---

## Caching Strategy

### Cover Images

```
Client Request
       │
       ▼
┌──────────────────────┐
│   Cloudflare CDN     │  Cache-Control: public, max-age=31536000
│   (Edge Cache)       │  (1 year - images rarely change)
└──────────┬───────────┘
           │ Cache Miss
           ▼
┌──────────────────────┐
│   API Server         │
│   (Check R2)         │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   Cloudflare R2      │
│   (Origin)           │
└──────────────────────┘
```

### Magazine Pages

```
┌────────────────────────────────────────────────────────────────┐
│                      Caching Layers                            │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  1. Client Cache (Memory)                                      │
│     • Keep last 10 pages in memory                             │
│     • Prefetch next 5 pages                                    │
│                                                                │
│  2. Client Cache (Disk)                                        │
│     • IndexedDB for web                                        │
│     • AsyncStorage for mobile                                  │
│     • Cache entire magazine for offline                        │
│                                                                │
│  3. CDN Cache                                                  │
│     • Cache-Control: public, max-age=86400 (1 day)            │
│                                                                │
│  4. R2 (Pre-rendered pages)                                    │
│     • Store rendered JPEGs permanently                         │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Client-Side Rendering

### Web: EPUB with epub.js

```typescript
// packages/web/src/components/EbookReader.tsx

import ePub from 'epubjs'

export function EbookReader({ ebookId }: { ebookId: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<ePub.Book | null>(null)

  useEffect(() => {
    const loadBook = async () => {
      const response = await api.ebooks.downloadFile(ebookId)
      const arrayBuffer = await response.arrayBuffer()

      const book = ePub(arrayBuffer)
      bookRef.current = book

      const rendition = book.renderTo(containerRef.current!, {
        width: '100%',
        height: '100%',
        spread: 'none',
      })

      rendition.display()
    }

    loadBook()

    return () => {
      bookRef.current?.destroy()
    }
  }, [ebookId])

  return <div ref={containerRef} className="ebook-container" />
}
```

### Web: PDF with PDF.js

```typescript
// packages/web/src/components/PDFReader.tsx

import * as pdfjs from 'pdfjs-dist'

export function PDFReader({ ebookId }: { ebookId: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const loadPDF = async () => {
      const response = await api.ebooks.downloadFile(ebookId)
      const arrayBuffer = await response.arrayBuffer()

      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
      const page = await pdf.getPage(currentPage)

      const scale = 1.5
      const viewport = page.getViewport({ scale })

      const canvas = canvasRef.current!
      const context = canvas.getContext('2d')!
      canvas.height = viewport.height
      canvas.width = viewport.width

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise
    }

    loadPDF()
  }, [ebookId, currentPage])

  return <canvas ref={canvasRef} />
}
```

### Mobile: Magazine Viewer

```typescript
// packages/mobile/src/components/MagazineViewer.tsx

import { FlatList, Image, Dimensions } from 'react-native'

export function MagazineViewer({ magazineId, pageCount }) {
  const { width } = Dimensions.get('window')

  const renderPage = ({ index }) => {
    const pageNum = index + 1
    const uri = `${API_URL}/magazines/${magazineId}/page/${pageNum}?quality=high`

    return (
      <Image
        source={{ uri }}
        style={{ width, height: width * 1.4 }}
        resizeMode="contain"
      />
    )
  }

  return (
    <FlatList
      data={Array.from({ length: pageCount })}
      renderItem={renderPage}
      horizontal
      pagingEnabled
      initialNumToRender={3}
      maxToRenderPerBatch={5}
      windowSize={5}
    />
  )
}
```

---

## R2 Service Implementation

```typescript
// packages/api/src/services/r2.ts

import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.R2_BUCKET_NAME!

export async function getObject(key: string): Promise<ReadableStream> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key })
  const response = await s3.send(command)
  return response.Body as ReadableStream
}

export async function getObjectRange(
  key: string,
  start: number,
  end: number
): Promise<ReadableStream> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Range: `bytes=${start}-${end}`,
  })
  const response = await s3.send(command)
  return response.Body as ReadableStream
}

export async function getSignedDownloadUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key })
  return getSignedUrl(s3, command, { expiresIn })
}

export async function uploadObject(
  key: string,
  body: Buffer | ReadableStream,
  contentType: string
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  })
  await s3.send(command)
}
```

---

## Error Handling

```typescript
// Common file handling errors

enum FileErrorCode {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  STORAGE_ERROR = 'STORAGE_ERROR',
  INVALID_PAGE = 'INVALID_PAGE',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
}

// Example responses

// 404 - File not found
{
  "error": {
    "code": "FILE_NOT_FOUND",
    "message": "The requested file does not exist"
  }
}

// 400 - Invalid page number
{
  "error": {
    "code": "INVALID_PAGE",
    "message": "Page number must be between 1 and 120"
  }
}
```

---

## Performance Considerations

### Prefetching Strategy

```typescript
// Client-side prefetch for magazines
const prefetchPages = async (magazineId: number, currentPage: number, total: number) => {
  const pagesToPrefetch = [
    currentPage + 1,
    currentPage + 2,
    currentPage + 3,
  ].filter(p => p <= total)

  await Promise.all(
    pagesToPrefetch.map(page =>
      fetch(`${API_URL}/magazines/${magazineId}/page/${page}`)
    )
  )
}
```

### Image Optimization

| Quality | Resolution | File Size | Use Case |
|---------|------------|-----------|----------|
| low | 800x1120 | ~100KB | Thumbnail/preview |
| medium | 1200x1680 | ~250KB | Default reading |
| high | 2400x3360 | ~500KB | Zoom/detail |

---

## Offline Support

### Progressive Download

```typescript
// Cache magazine for offline reading
async function cacheMagazineForOffline(magazineId: number) {
  const magazine = await api.magazines.get(magazineId)

  // Download all pages
  for (let i = 1; i <= magazine.page_count; i++) {
    const response = await fetch(
      `${API_URL}/magazines/${magazineId}/page/${i}?quality=medium`
    )
    const blob = await response.blob()
    await cacheStorage.put(`magazine-${magazineId}-page-${i}`, blob)
  }

  // Mark as available offline
  await db.offlineMagazines.add({ id: magazineId, cachedAt: new Date() })
}
```
