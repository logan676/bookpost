import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join, basename, extname } from 'path'
import { readdir, readFile, stat, unlink, createReadStream } from 'fs/promises'
import { createReadStream as fsCreateReadStream } from 'fs'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import vision from '@google-cloud/vision'
import dotenv from 'dotenv'
import { createRequire } from 'module'
import { exec } from 'child_process'
import { promisify } from 'util'
import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
const execAsync = promisify(exec)
const require = createRequire(import.meta.url)
const pdf = require('pdf-parse')

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '../../../.env') })

const app = express()
const PORT = process.env.PORT || 3001

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

// Configure AWS S3
const useS3Storage = process.env.USE_S3_STORAGE === 'true'
const s3Client = useS3Storage ? new S3Client({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
}) : null
const s3BucketName = process.env.S3_BUCKET_NAME || 'bookpost-files'

// S3 utility functions
async function getS3SignedUrl(s3Key, expiresIn = 3600) {
  if (!s3Client) return null
  const command = new GetObjectCommand({
    Bucket: s3BucketName,
    Key: s3Key
  })
  return getSignedUrl(s3Client, command, { expiresIn })
}

async function uploadToS3(localPath, s3Key, contentType = 'application/pdf') {
  if (!s3Client) return null
  const fileContent = await readFile(localPath)
  const command = new PutObjectCommand({
    Bucket: s3BucketName,
    Key: s3Key,
    Body: fileContent,
    ContentType: contentType
  })
  await s3Client.send(command)
  return `s3://${s3BucketName}/${s3Key}`
}

async function streamFromS3(s3Key) {
  if (!s3Client) return null
  const command = new GetObjectCommand({
    Bucket: s3BucketName,
    Key: s3Key
  })
  const response = await s3Client.send(command)
  return response.Body
}

async function checkS3ObjectExists(s3Key) {
  if (!s3Client) return false
  try {
    const command = new HeadObjectCommand({
      Bucket: s3BucketName,
      Key: s3Key
    })
    await s3Client.send(command)
    return true
  } catch {
    return false
  }
}

// Convert local file path to S3 key
function localPathToS3Key(localPath, type = 'magazines') {
  // Extract relative path from the configured base folder
  const basePaths = {
    magazines: process.env.MAGAZINES_FOLDER || '/Volumes/T9/杂志',
    ebooks: process.env.EBOOKS_FOLDER || '/Volumes/T9/电子书'
  }
  const basePath = basePaths[type]
  if (localPath.startsWith(basePath)) {
    const relativePath = localPath.slice(basePath.length + 1)
    return `${type}/${relativePath}`
  }
  // Fallback: use filename only
  return `${type}/${basename(localPath)}`
}

// Configure Google Cloud Vision
const visionClient = new vision.ImageAnnotatorClient()

// Configure Multer for file uploads
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
})

// Initialize database
const db = new Database(join(__dirname, 'bookpost.db'))

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    cover_url TEXT,
    cover_photo_url TEXT,
    isbn TEXT,
    publisher TEXT,
    publish_year INTEGER,
    description TEXT,
    page_count INTEGER,
    categories TEXT,
    language TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS blog_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    page_photo_url TEXT,
    page_number INTEGER,
    extracted_text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS underlines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,
    paragraph_index INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ideas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    underline_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (underline_id) REFERENCES underlines(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS publishers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS magazines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    publisher_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_size INTEGER,
    page_count INTEGER,
    year INTEGER,
    issue TEXT,
    cover_url TEXT,
    s3_key TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS magazine_underlines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    magazine_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    page_number INTEGER NOT NULL,
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (magazine_id) REFERENCES magazines(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS magazine_ideas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    underline_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (underline_id) REFERENCES magazine_underlines(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ebook_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ebooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_size INTEGER,
    cover_url TEXT,
    s3_key TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES ebook_categories(id) ON DELETE CASCADE
  );
`)

// Migration: Add s3_key column to existing tables if not exists
try {
  db.exec(`ALTER TABLE magazines ADD COLUMN s3_key TEXT`)
} catch (err) {
  // Column likely already exists
}
try {
  db.exec(`ALTER TABLE ebooks ADD COLUMN s3_key TEXT`)
} catch (err) {
  // Column likely already exists
}

// Middleware
app.use(cors())
app.use(express.json())

// Helper: Upload image to Cloudinary
async function uploadToCloudinary(buffer, folder = 'bookpost', publicId = null) {
  return new Promise((resolve, reject) => {
    const options = { folder, resource_type: 'image' }
    if (publicId) {
      options.public_id = publicId
      options.overwrite = true // Overwrite if exists with same public_id
      options.invalidate = true // Invalidate CDN cache
    }
    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) reject(error)
        else resolve(result)
      }
    )
    uploadStream.end(buffer)
  })
}

// Helper: Generate cover image from PDF first page using pdftoppm
// magazineId is used as the unique public_id in Cloudinary to prevent duplicates
async function generateCoverFromPdf(pdfPath, magazineId) {
  const tempOutputBase = `/tmp/cover_${Date.now()}_${Math.random().toString(36).substring(7)}`
  const tempOutputFile = `${tempOutputBase}-1.jpg`

  try {
    // Use pdftoppm to convert first page to JPEG
    // -f 1 -l 1: only first page, -jpeg: JPEG format, -r 150: 150 DPI resolution
    await execAsync(`pdftoppm -f 1 -l 1 -jpeg -r 150 "${pdfPath}" "${tempOutputBase}"`)

    // Read the generated image
    const imageBuffer = await readFile(tempOutputFile)

    // Upload to Cloudinary with magazine ID as public_id
    // This ensures same magazine always gets same URL and overwrites on regeneration
    const publicId = `magazine_${magazineId}`
    const result = await uploadToCloudinary(imageBuffer, 'bookpost/magazine-covers', publicId)

    // Clean up temp file
    await unlink(tempOutputFile).catch(() => {})

    return result.secure_url
  } catch (error) {
    // Clean up temp file on error
    await unlink(tempOutputFile).catch(() => {})
    throw error
  }
}

// Helper: Extract text using Google Cloud Vision
async function extractTextFromImage(imageUrl) {
  try {
    const [result] = await visionClient.textDetection(imageUrl)
    const detections = result.textAnnotations
    if (detections && detections.length > 0) {
      return detections[0].description
    }
    return ''
  } catch (error) {
    console.error('Vision API error:', error)
    throw error
  }
}

// Helper: Search Google Books API
async function searchGoogleBooks(query) {
  try {
    console.log('[Google Books] Searching for:', query)
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY
    const url = apiKey
      ? `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${apiKey}`
      : `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`

    const response = await fetch(url)
    const data = await response.json()

    console.log('[Google Books] Response:', data.totalItems, 'items found')

    if (data.items && data.items.length > 0) {
      const book = data.items[0].volumeInfo
      console.log('[Google Books] Best match:', book.title, 'by', book.authors)
      return {
        title: book.title || '',
        author: book.authors ? book.authors.join(', ') : '',
        isbn: book.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier ||
              book.industryIdentifiers?.find(id => id.type === 'ISBN_10')?.identifier || '',
        publisher: book.publisher || '',
        publish_year: book.publishedDate ? parseInt(book.publishedDate.substring(0, 4)) : null,
        description: book.description || '',
        page_count: book.pageCount || null,
        categories: book.categories ? book.categories.join(', ') : '',
        language: book.language || '',
        cover_url: book.imageLinks?.thumbnail?.replace('http:', 'https:') || ''
      }
    }
    console.log('[Google Books] No results found')
    return null
  } catch (error) {
    console.error('Google Books API error:', error)
    return null
  }
}

// Helper: Parse book info from OCR text
function parseBookInfoFromText(text) {
  const lines = text.split('\n').filter(line => line.trim())
  let title = ''
  let author = ''
  let isbn = ''

  // Try to find ISBN
  const isbnMatch = text.match(/(?:ISBN[-:]?\s*)?(\d{10}|\d{13}|\d{3}[-\s]?\d{10})/i)
  if (isbnMatch) {
    isbn = isbnMatch[1].replace(/[-\s]/g, '')
  }

  // Look for "by" keyword first
  const byIndex = text.toLowerCase().indexOf(' by ')
  if (byIndex !== -1) {
    const afterBy = text.substring(byIndex + 4)
    const authorMatch = afterBy.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/)
    if (authorMatch) {
      author = authorMatch[1]
    }
  }

  // If no "by" found, look for author name patterns
  // Authors are often in ALL CAPS at the end, or have patterns like "FIRST LAST"
  if (!author && lines.length > 0) {
    // Check last few lines for author name (ALL CAPS name pattern)
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 3); i--) {
      const line = lines[i].trim()
      // Match ALL CAPS names like "FRANK TRENTMANN" or "J.K. ROWLING"
      if (/^[A-Z][A-Z.\s]+[A-Z]$/.test(line) && line.split(/\s+/).length >= 2 && line.split(/\s+/).length <= 4) {
        // Convert to title case
        author = line.split(/\s+/).map(word =>
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ')
        break
      }
    }
  }

  // Build title from initial lines (often ALL CAPS or prominent text)
  // Skip the author line if found at the end
  const titleLines = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    // Stop if we hit the author line or subtitle indicators
    if (author && line.toUpperCase() === author.toUpperCase()) break
    if (line.toLowerCase().startsWith('a novel') || line.toLowerCase().startsWith('isbn')) break

    titleLines.push(line)
    // Take first 1-3 lines as title, or stop at subtitle
    if (titleLines.length >= 3) break
    if (line.toLowerCase().includes('how') || line.toLowerCase().includes('the story')) break
  }

  if (titleLines.length > 0) {
    title = titleLines.join(' ').trim()
    // Clean up excessive spaces
    title = title.replace(/\s+/g, ' ')
  }

  return { title, author, isbn }
}

// Routes

// Get all books
app.get('/api/books', (req, res) => {
  try {
    const books = db.prepare('SELECT * FROM books ORDER BY created_at DESC').all()
    res.json(books)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch books' })
  }
})

// Get single book with blog posts
app.get('/api/books/:id', (req, res) => {
  try {
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id)
    if (!book) {
      return res.status(404).json({ error: 'Book not found' })
    }
    const posts = db.prepare('SELECT * FROM blog_posts WHERE book_id = ? ORDER BY created_at DESC').all(req.params.id)
    res.json({ ...book, posts })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch book' })
  }
})

// Upload book cover photo and auto-fill metadata
app.post('/api/books/scan', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' })
    }

    // Upload to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(req.file.buffer, 'bookpost/covers')
    const photoUrl = cloudinaryResult.secure_url

    // Extract text from image using Google Cloud Vision
    const extractedText = await extractTextFromImage(photoUrl)
    console.log('Extracted text:', extractedText)

    // Parse potential book info from OCR
    const parsedInfo = parseBookInfoFromText(extractedText)

    // Search Google Books for metadata
    let bookData = null

    // Try ISBN first if found
    if (parsedInfo.isbn) {
      bookData = await searchGoogleBooks(`isbn:${parsedInfo.isbn}`)
    }

    // Try title + author if no ISBN result
    if (!bookData && (parsedInfo.title || parsedInfo.author)) {
      const query = [parsedInfo.title, parsedInfo.author].filter(Boolean).join(' ')
      bookData = await searchGoogleBooks(query)
    }

    // Try first few lines as query
    if (!bookData && extractedText) {
      const firstWords = extractedText.split(/\s+/).slice(0, 5).join(' ')
      bookData = await searchGoogleBooks(firstWords)
    }

    // Prepare response with extracted data
    const result = {
      cover_photo_url: photoUrl,
      extracted_text: extractedText,
      ...parsedInfo,
      ...(bookData || {})
    }

    res.json(result)
  } catch (error) {
    console.error('Scan error:', error)
    res.status(500).json({ error: 'Failed to scan book cover' })
  }
})

// Create book (after user confirms auto-filled data)
app.post('/api/books', (req, res) => {
  try {
    const {
      title, author, cover_url, cover_photo_url, isbn,
      publisher, publish_year, description, page_count,
      categories, language
    } = req.body

    if (!title || !author) {
      return res.status(400).json({ error: 'Title and author are required' })
    }

    const result = db.prepare(`
      INSERT INTO books (title, author, cover_url, cover_photo_url, isbn, publisher, publish_year, description, page_count, categories, language)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, author, cover_url, cover_photo_url, isbn, publisher, publish_year, description, page_count, categories, language)

    const newBook = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(newBook)
  } catch (error) {
    console.error('Create book error:', error)
    res.status(500).json({ error: 'Failed to add book' })
  }
})

// Upload reading page photo and create blog post
app.post('/api/books/:id/scan-page', upload.single('photo'), async (req, res) => {
  try {
    const bookId = req.params.id

    // Verify book exists
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId)
    if (!book) {
      return res.status(404).json({ error: 'Book not found' })
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' })
    }

    // Upload to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(req.file.buffer, 'bookpost/pages')
    const photoUrl = cloudinaryResult.secure_url

    // Extract text from page image
    const extractedText = await extractTextFromImage(photoUrl)

    // Format as blog post content
    const blogContent = formatAsBlogPost(extractedText, book.title)

    // Create blog post
    const pageNumber = req.body.page_number ? parseInt(req.body.page_number) : null
    const title = `Notes from "${book.title}"${pageNumber ? ` - Page ${pageNumber}` : ''}`

    const result = db.prepare(`
      INSERT INTO blog_posts (book_id, title, content, page_photo_url, page_number, extracted_text)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(bookId, title, blogContent, photoUrl, pageNumber, extractedText)

    const newPost = db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(newPost)
  } catch (error) {
    console.error('Scan page error:', error)
    res.status(500).json({ error: 'Failed to scan page' })
  }
})

// Helper: Format extracted text as blog post
function formatAsBlogPost(text, bookTitle) {
  // Google Vision OCR returns text with single newlines for line breaks
  // We need to detect actual paragraph breaks vs line wrapping

  const lines = text.split('\n')
  const paragraphs = []
  let currentParagraph = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const prevLine = currentParagraph.length > 0 ? currentParagraph[currentParagraph.length - 1] : ''

    // Empty line indicates paragraph break
    if (!line) {
      if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph.join(' '))
        currentParagraph = []
      }
      continue
    }

    // Check if previous line ends with sentence-ending punctuation
    // and current line starts with capital letter - likely new paragraph
    const prevEndsWithPunctuation = /[.!?:]["']?\s*$/.test(prevLine)
    const currentStartsWithCapital = /^[A-Z"']/.test(line)
    const prevIsShort = prevLine.length < 50

    // Heuristic: if previous line ends a sentence and is relatively short,
    // and current line starts with capital, it's probably a new paragraph
    if (prevLine && prevEndsWithPunctuation && currentStartsWithCapital && prevIsShort) {
      if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph.join(' '))
        currentParagraph = []
      }
    }

    currentParagraph.push(line)
  }

  // Don't forget the last paragraph
  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph.join(' '))
  }

  // Clean up and join
  return paragraphs
    .map(p => p.trim())
    .filter(Boolean)
    .join('\n\n')
}

// Get all blog posts for a book
app.get('/api/books/:id/posts', (req, res) => {
  try {
    const posts = db.prepare('SELECT * FROM blog_posts WHERE book_id = ? ORDER BY created_at DESC').all(req.params.id)
    res.json(posts)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch posts' })
  }
})

// Get single blog post
app.get('/api/posts/:id', (req, res) => {
  try {
    const post = db.prepare(`
      SELECT bp.*, b.title as book_title, b.author as book_author
      FROM blog_posts bp
      JOIN books b ON bp.book_id = b.id
      WHERE bp.id = ?
    `).get(req.params.id)

    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }
    res.json(post)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch post' })
  }
})

// Update blog post
app.put('/api/posts/:id', (req, res) => {
  try {
    const { title, content } = req.body
    db.prepare('UPDATE blog_posts SET title = ?, content = ? WHERE id = ?')
      .run(title, content, req.params.id)

    const updated = db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(req.params.id)
    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update post' })
  }
})

// Delete book
app.delete('/api/books/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id)
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Book not found' })
    }
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete book' })
  }
})

// Delete blog post
app.delete('/api/posts/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM blog_posts WHERE id = ?').run(req.params.id)
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Post not found' })
    }
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete post' })
  }
})

// Get underlines for a post (with idea count)
app.get('/api/posts/:id/underlines', (req, res) => {
  try {
    const underlines = db.prepare(`
      SELECT u.*, COUNT(i.id) as idea_count
      FROM underlines u
      LEFT JOIN ideas i ON u.id = i.underline_id
      WHERE u.post_id = ?
      GROUP BY u.id
      ORDER BY u.paragraph_index, u.start_offset
    `).all(req.params.id)
    res.json(underlines)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch underlines' })
  }
})

// Create underline
app.post('/api/posts/:id/underlines', (req, res) => {
  try {
    const postId = req.params.id
    const { text, start_offset, end_offset, paragraph_index } = req.body

    if (!text || start_offset === undefined || end_offset === undefined || paragraph_index === undefined) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const result = db.prepare(`
      INSERT INTO underlines (post_id, text, start_offset, end_offset, paragraph_index)
      VALUES (?, ?, ?, ?, ?)
    `).run(postId, text, start_offset, end_offset, paragraph_index)

    const newUnderline = db.prepare('SELECT * FROM underlines WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(newUnderline)
  } catch (error) {
    console.error('Create underline error:', error)
    res.status(500).json({ error: 'Failed to create underline' })
  }
})

// Get ideas for an underline
app.get('/api/underlines/:id/ideas', (req, res) => {
  try {
    const ideas = db.prepare('SELECT * FROM ideas WHERE underline_id = ? ORDER BY created_at DESC').all(req.params.id)
    res.json(ideas)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ideas' })
  }
})

// Add idea to underline
app.post('/api/underlines/:id/ideas', (req, res) => {
  try {
    const underlineId = req.params.id
    const { content } = req.body

    if (!content) {
      return res.status(400).json({ error: 'Content is required' })
    }

    const result = db.prepare('INSERT INTO ideas (underline_id, content) VALUES (?, ?)').run(underlineId, content)
    const newIdea = db.prepare('SELECT * FROM ideas WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(newIdea)
  } catch (error) {
    console.error('Create idea error:', error)
    res.status(500).json({ error: 'Failed to create idea' })
  }
})

// Update idea
app.patch('/api/ideas/:id', (req, res) => {
  try {
    const { content } = req.body
    if (!content) {
      return res.status(400).json({ error: 'Content is required' })
    }

    db.prepare('UPDATE ideas SET content = ? WHERE id = ?').run(content, req.params.id)
    const updated = db.prepare('SELECT * FROM ideas WHERE id = ?').get(req.params.id)

    if (!updated) {
      return res.status(404).json({ error: 'Idea not found' })
    }
    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update idea' })
  }
})

// Delete idea
app.delete('/api/ideas/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM ideas WHERE id = ?').run(req.params.id)
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Idea not found' })
    }
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete idea' })
  }
})

// Delete underline
app.delete('/api/underlines/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM underlines WHERE id = ?').run(req.params.id)
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Underline not found' })
    }
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete underline' })
  }
})

// ==================== MAGAZINE ENDPOINTS ====================

// Magazine base path
const MAGAZINE_BASE_PATH = '/Volumes/杂志/杂志/月报更新1'

// Helper: Scan magazine directory and import PDFs
async function scanMagazineDirectory(basePath) {
  const results = { publishers: 0, magazines: 0, errors: [] }

  try {
    const publisherDirs = await readdir(basePath)

    for (const publisherDir of publisherDirs) {
      if (publisherDir.startsWith('.')) continue

      const publisherPath = join(basePath, publisherDir)
      const publisherStat = await stat(publisherPath)
      if (!publisherStat.isDirectory()) continue

      // Extract publisher name (before the Chinese description if any)
      const publisherName = publisherDir.split('丨')[0].trim()

      // Insert or get publisher
      let publisher = db.prepare('SELECT * FROM publishers WHERE name = ?').get(publisherName)
      if (!publisher) {
        const result = db.prepare('INSERT INTO publishers (name, description) VALUES (?, ?)').run(publisherName, publisherDir)
        publisher = { id: result.lastInsertRowid, name: publisherName }
        results.publishers++
      }

      // Scan year folders
      const yearDirs = await readdir(publisherPath)
      for (const yearDir of yearDirs) {
        if (yearDir.startsWith('.')) continue

        const yearPath = join(publisherPath, yearDir)
        const yearStat = await stat(yearPath)
        if (!yearStat.isDirectory()) continue

        // Extract year from folder name
        const yearMatch = yearDir.match(/\d{4}/)
        const year = yearMatch ? parseInt(yearMatch[0]) : null

        // Scan PDF files
        const files = await readdir(yearPath)
        for (const file of files) {
          if (file.startsWith('.') || !file.toLowerCase().endsWith('.pdf')) continue
          // Skip duplicate files like filename(1).pdf, filename(2).pdf, etc.
          if (/\(\d+\)\.pdf$/i.test(file)) continue

          const filePath = join(yearPath, file)

          // Check if already imported
          const existing = db.prepare('SELECT id FROM magazines WHERE file_path = ?').get(filePath)
          if (existing) continue

          try {
            const fileStat = await stat(filePath)
            const fileSize = fileStat.size

            // Skip invalid PDFs (less than 10KB)
            if (fileSize < 10240) continue

            // Parse title from filename
            const title = basename(file, '.pdf')

            // Extract issue (e.g., "06.07" from "Bloomberg Markets Asia 06.07 2023.pdf")
            const issueMatch = title.match(/(\d{1,2}[.\-]\d{1,2}|\w+\s\d{4}|Issue\s*\d+)/i)
            const issue = issueMatch ? issueMatch[0] : null

            db.prepare(`
              INSERT INTO magazines (publisher_id, title, file_path, file_size, year, issue)
              VALUES (?, ?, ?, ?, ?, ?)
            `).run(publisher.id, title, filePath, fileSize, year, issue)

            results.magazines++
          } catch (err) {
            results.errors.push({ file: filePath, error: err.message })
          }
        }
      }
    }
  } catch (error) {
    results.errors.push({ path: basePath, error: error.message })
  }

  return results
}

// Get all publishers with magazine counts
app.get('/api/publishers', (req, res) => {
  try {
    const publishers = db.prepare(`
      SELECT p.*, COUNT(m.id) as magazine_count
      FROM publishers p
      LEFT JOIN magazines m ON p.id = m.publisher_id
      GROUP BY p.id
      ORDER BY p.name
    `).all()
    res.json(publishers)
  } catch (error) {
    console.error('Get publishers error:', error)
    res.status(500).json({ error: 'Failed to fetch publishers' })
  }
})

// Get single publisher with magazines
app.get('/api/publishers/:id', (req, res) => {
  try {
    const publisher = db.prepare('SELECT * FROM publishers WHERE id = ?').get(req.params.id)
    if (!publisher) {
      return res.status(404).json({ error: 'Publisher not found' })
    }
    const magazines = db.prepare(`
      SELECT * FROM magazines WHERE publisher_id = ? ORDER BY year DESC, title
    `).all(req.params.id)
    res.json({ ...publisher, magazines })
  } catch (error) {
    console.error('Get publisher error:', error)
    res.status(500).json({ error: 'Failed to fetch publisher' })
  }
})

// Get all magazines (with optional filters)
app.get('/api/magazines', (req, res) => {
  try {
    const { publisher_id, year, search } = req.query
    let query = `
      SELECT m.*, p.name as publisher_name
      FROM magazines m
      JOIN publishers p ON m.publisher_id = p.id
      WHERE 1=1
    `
    const params = []

    if (publisher_id) {
      query += ' AND m.publisher_id = ?'
      params.push(publisher_id)
    }
    if (year) {
      query += ' AND m.year = ?'
      params.push(year)
    }
    if (search) {
      query += ' AND (m.title LIKE ? OR p.name LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }

    query += ' ORDER BY m.year DESC, m.title'

    const magazines = db.prepare(query).all(...params)
    res.json(magazines)
  } catch (error) {
    console.error('Get magazines error:', error)
    res.status(500).json({ error: 'Failed to fetch magazines' })
  }
})

// Get single magazine
app.get('/api/magazines/:id', (req, res) => {
  try {
    const magazine = db.prepare(`
      SELECT m.*, p.name as publisher_name
      FROM magazines m
      JOIN publishers p ON m.publisher_id = p.id
      WHERE m.id = ?
    `).get(req.params.id)

    if (!magazine) {
      return res.status(404).json({ error: 'Magazine not found' })
    }
    res.json(magazine)
  } catch (error) {
    console.error('Get magazine error:', error)
    res.status(500).json({ error: 'Failed to fetch magazine' })
  }
})

// Serve PDF file
app.get('/api/magazines/:id/pdf', async (req, res) => {
  try {
    const magazine = db.prepare('SELECT file_path, s3_key FROM magazines WHERE id = ?').get(req.params.id)
    if (!magazine) {
      return res.status(404).json({ error: 'Magazine not found' })
    }

    // If S3 storage is enabled and file has s3_key, redirect to signed URL
    if (useS3Storage && magazine.s3_key) {
      const signedUrl = await getS3SignedUrl(magazine.s3_key, 3600) // 1 hour expiry
      return res.redirect(signedUrl)
    }

    // Fallback to local file
    const pdfBuffer = await readFile(magazine.file_path)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${basename(magazine.file_path)}"`)
    res.send(pdfBuffer)
  } catch (error) {
    console.error('Serve PDF error:', error)
    res.status(500).json({ error: 'Failed to serve PDF' })
  }
})

// Extract text from a specific page
app.get('/api/magazines/:id/page/:pageNum/text', async (req, res) => {
  try {
    const magazine = db.prepare('SELECT file_path FROM magazines WHERE id = ?').get(req.params.id)
    if (!magazine) {
      return res.status(404).json({ error: 'Magazine not found' })
    }

    const pageNum = parseInt(req.params.pageNum)
    const pdfBuffer = await readFile(magazine.file_path)

    // Extract text with page range
    const options = {
      max: pageNum,
      pagerender: (pageData) => {
        if (pageData.pageIndex + 1 === pageNum) {
          return pageData.getTextContent().then(textContent => {
            return textContent.items.map(item => item.str).join(' ')
          })
        }
        return ''
      }
    }

    const data = await pdf(pdfBuffer, options)
    res.json({ page: pageNum, text: data.text, numPages: data.numpages })
  } catch (error) {
    console.error('Extract text error:', error)
    res.status(500).json({ error: 'Failed to extract text' })
  }
})

// Get page count for a magazine
app.get('/api/magazines/:id/info', async (req, res) => {
  try {
    const magazine = db.prepare('SELECT * FROM magazines WHERE id = ?').get(req.params.id)
    if (!magazine) {
      return res.status(404).json({ error: 'Magazine not found' })
    }

    // If page count not cached, extract it
    if (!magazine.page_count) {
      const pdfBuffer = await readFile(magazine.file_path)
      const data = await pdf(pdfBuffer, { max: 1 }) // Just get metadata

      // Update page count in database
      db.prepare('UPDATE magazines SET page_count = ? WHERE id = ?').run(data.numpages, magazine.id)
      magazine.page_count = data.numpages
    }

    res.json(magazine)
  } catch (error) {
    console.error('Get magazine info error:', error)
    res.status(500).json({ error: 'Failed to get magazine info' })
  }
})

// Scan and import magazines from directory
app.post('/api/magazines/scan', async (req, res) => {
  try {
    const basePath = req.body.path || MAGAZINE_BASE_PATH
    const results = await scanMagazineDirectory(basePath)
    res.json(results)
  } catch (error) {
    console.error('Scan magazines error:', error)
    res.status(500).json({ error: 'Failed to scan magazines' })
  }
})

// Magazine underlines
app.get('/api/magazines/:id/underlines', (req, res) => {
  try {
    const underlines = db.prepare(`
      SELECT u.*, COUNT(i.id) as idea_count
      FROM magazine_underlines u
      LEFT JOIN magazine_ideas i ON u.id = i.underline_id
      WHERE u.magazine_id = ?
      GROUP BY u.id
      ORDER BY u.page_number, u.start_offset
    `).all(req.params.id)
    res.json(underlines)
  } catch (error) {
    console.error('Get underlines error:', error)
    res.status(500).json({ error: 'Failed to fetch underlines' })
  }
})

app.post('/api/magazines/:id/underlines', (req, res) => {
  try {
    const magazineId = req.params.id
    const { text, page_number, start_offset, end_offset } = req.body

    if (!text || page_number === undefined || start_offset === undefined || end_offset === undefined) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const result = db.prepare(`
      INSERT INTO magazine_underlines (magazine_id, text, page_number, start_offset, end_offset)
      VALUES (?, ?, ?, ?, ?)
    `).run(magazineId, text, page_number, start_offset, end_offset)

    const newUnderline = db.prepare('SELECT * FROM magazine_underlines WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(newUnderline)
  } catch (error) {
    console.error('Create underline error:', error)
    res.status(500).json({ error: 'Failed to create underline' })
  }
})

app.delete('/api/magazine-underlines/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM magazine_underlines WHERE id = ?').run(req.params.id)
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Underline not found' })
    }
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete underline' })
  }
})

// Magazine ideas
app.get('/api/magazine-underlines/:id/ideas', (req, res) => {
  try {
    const ideas = db.prepare('SELECT * FROM magazine_ideas WHERE underline_id = ? ORDER BY created_at DESC').all(req.params.id)
    res.json(ideas)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ideas' })
  }
})

app.post('/api/magazine-underlines/:id/ideas', (req, res) => {
  try {
    const underlineId = req.params.id
    const { content } = req.body

    if (!content) {
      return res.status(400).json({ error: 'Content is required' })
    }

    const result = db.prepare('INSERT INTO magazine_ideas (underline_id, content) VALUES (?, ?)').run(underlineId, content)
    const newIdea = db.prepare('SELECT * FROM magazine_ideas WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(newIdea)
  } catch (error) {
    console.error('Create idea error:', error)
    res.status(500).json({ error: 'Failed to create idea' })
  }
})

app.delete('/api/magazine-ideas/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM magazine_ideas WHERE id = ?').run(req.params.id)
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Idea not found' })
    }
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete idea' })
  }
})

// Generate cover for a single magazine
app.post('/api/magazines/:id/generate-cover', async (req, res) => {
  try {
    const magazine = db.prepare('SELECT * FROM magazines WHERE id = ?').get(req.params.id)
    if (!magazine) {
      return res.status(404).json({ error: 'Magazine not found' })
    }

    // Skip if already has cover
    if (magazine.cover_url && !req.body.force) {
      return res.json({ message: 'Cover already exists', cover_url: magazine.cover_url })
    }

    console.log(`Generating cover for: ${magazine.title}`)
    const coverUrl = await generateCoverFromPdf(magazine.file_path, magazine.id)

    // Update database
    db.prepare('UPDATE magazines SET cover_url = ? WHERE id = ?').run(coverUrl, magazine.id)

    res.json({ message: 'Cover generated', cover_url: coverUrl })
  } catch (error) {
    console.error('Generate cover error:', error)
    res.status(500).json({ error: 'Failed to generate cover', details: error.message })
  }
})

// Generate covers for all magazines (batch operation)
// Progress tracking for batch cover generation
let coverGenerationProgress = {
  running: false,
  total: 0,
  processed: 0,
  success: 0,
  failed: 0,
  skipped: 0,
  current: '',
  errors: []
}

app.post('/api/magazines/generate-covers', async (req, res) => {
  if (coverGenerationProgress.running) {
    return res.status(409).json({ error: 'Cover generation already in progress', progress: coverGenerationProgress })
  }

  const { publisher_id, force } = req.body

  // Build query for magazines
  let query = 'SELECT * FROM magazines'
  const params = []

  if (publisher_id) {
    query += ' WHERE publisher_id = ?'
    params.push(publisher_id)
  }

  if (!force) {
    query += params.length ? ' AND cover_url IS NULL' : ' WHERE cover_url IS NULL'
  }

  const magazines = db.prepare(query).all(...params)

  // Reset progress
  coverGenerationProgress = {
    running: true,
    total: magazines.length,
    processed: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    current: '',
    errors: []
  }

  // Return immediately with progress info
  res.json({ message: 'Cover generation started', total: magazines.length })

  // Process in background
  ;(async () => {
    for (const magazine of magazines) {
      coverGenerationProgress.current = magazine.title

      try {
        // Skip if already has cover and not forced
        if (magazine.cover_url && !force) {
          coverGenerationProgress.skipped++
          coverGenerationProgress.processed++
          continue
        }

        console.log(`[${coverGenerationProgress.processed + 1}/${magazines.length}] Generating cover for: ${magazine.title}`)
        const coverUrl = await generateCoverFromPdf(magazine.file_path, magazine.id)

        // Update database
        db.prepare('UPDATE magazines SET cover_url = ? WHERE id = ?').run(coverUrl, magazine.id)

        coverGenerationProgress.success++
      } catch (error) {
        console.error(`Failed to generate cover for ${magazine.title}:`, error.message)
        coverGenerationProgress.failed++
        coverGenerationProgress.errors.push({ id: magazine.id, title: magazine.title, error: error.message })
      }

      coverGenerationProgress.processed++
    }

    coverGenerationProgress.running = false
    coverGenerationProgress.current = ''
    console.log('Cover generation complete:', coverGenerationProgress)
  })()
})

// Get cover generation progress
app.get('/api/magazines/generate-covers/progress', (req, res) => {
  res.json(coverGenerationProgress)
})

// ==================== EBOOKS API ====================

const EBOOKS_BASE_PATH = '/Volumes/杂志/【基础版】英文书单2024年全年更新'

// Extract ZIP file to same directory
async function extractZipFile(zipPath) {
  const zipDir = dirname(zipPath)
  const zipName = basename(zipPath, '.zip')
  const extractDir = join(zipDir, zipName)

  // Check if already extracted
  try {
    const extractStat = await stat(extractDir)
    if (extractStat.isDirectory()) {
      return extractDir // Already extracted
    }
  } catch {
    // Not extracted yet
  }

  try {
    // Extract ZIP file using unzip command
    await execAsync(`unzip -o -q "${zipPath}" -d "${extractDir}"`)
    return extractDir
  } catch (err) {
    console.error(`Failed to extract ${zipPath}:`, err.message)
    return null
  }
}

// Recursive helper to scan for ebooks in a folder (handles nested directories)
async function scanFolderForEbooks(folderPath, category, results, depth = 0) {
  if (depth > 8) return // Prevent infinite recursion (increased for ZIP extraction)

  try {
    const items = await readdir(folderPath)

    // First, extract any ZIP files found
    for (const item of items) {
      if (item.startsWith('.') || item.startsWith('._')) continue
      if (item.toLowerCase().endsWith('.zip')) {
        const zipPath = join(folderPath, item)
        const extractedDir = await extractZipFile(zipPath)
        if (extractedDir) {
          // Scan the extracted directory
          await scanFolderForEbooks(extractedDir, category, results, depth + 1)
        }
      }
    }

    // Check if this folder or its Ebook subfolder contains PDFs
    let searchPath = folderPath
    const ebookPath = join(folderPath, 'Ebook')
    try {
      const ebookStat = await stat(ebookPath)
      if (ebookStat.isDirectory()) {
        searchPath = ebookPath
      }
    } catch {
      // Ebook folder doesn't exist
    }

    // Look for PDFs in the search path
    const searchItems = await readdir(searchPath)
    let foundPdf = false
    for (const file of searchItems) {
      if (file.startsWith('.') || file.startsWith('._')) continue
      if (!file.toLowerCase().endsWith('.pdf')) continue
      if (/\(\d+\)\.pdf$/i.test(file)) continue // Skip duplicates

      foundPdf = true
      const filePath = join(searchPath, file)

      // Check if already imported
      const existing = db.prepare('SELECT id FROM ebooks WHERE file_path = ?').get(filePath)
      if (existing) continue

      try {
        const fileStat = await stat(filePath)
        const fileSize = fileStat.size

        // Skip invalid PDFs (less than 10KB)
        if (fileSize < 10240) continue

        // Use parent folder name as title, or PDF filename
        const folderName = basename(folderPath)
        const pdfName = basename(file, '.pdf')
        const title = (folderName && !folderName.match(/^\d+$/))
          ? folderName.replace(/^\d+\./, '').trim()
          : pdfName.replace(/^\d+\./, '').trim()

        db.prepare(`
          INSERT INTO ebooks (category_id, title, file_path, file_size)
          VALUES (?, ?, ?, ?)
        `).run(category.id, title || pdfName, filePath, fileSize)

        results.ebooks++
      } catch (err) {
        results.errors.push({ file: filePath, error: err.message })
      }
    }

    // If no PDFs found, recurse into subdirectories
    if (!foundPdf) {
      for (const item of items) {
        if (item.startsWith('.')) continue
        if (item === 'Ebook') continue // Already checked
        if (item.toLowerCase().endsWith('.zip')) continue // Already processed

        const itemPath = join(folderPath, item)
        try {
          const itemStat = await stat(itemPath)
          if (itemStat.isDirectory()) {
            await scanFolderForEbooks(itemPath, category, results, depth + 1)
          }
        } catch (err) {
          // Skip inaccessible folders
        }
      }
    }
  } catch (err) {
    results.errors.push({ path: folderPath, error: err.message })
  }
}

// Scan ebooks directory
async function scanEbooksDirectory() {
  const results = { categories: 0, ebooks: 0, errors: [] }

  try {
    const categoryDirs = await readdir(EBOOKS_BASE_PATH)

    for (const categoryDir of categoryDirs) {
      if (categoryDir.startsWith('.')) continue

      const categoryPath = join(EBOOKS_BASE_PATH, categoryDir)
      const categoryStat = await stat(categoryPath)
      if (!categoryStat.isDirectory()) continue

      // Extract category name (remove number prefix like "1.")
      const categoryName = categoryDir.replace(/^\d+\./, '').trim()

      // Insert or get category
      let category = db.prepare('SELECT * FROM ebook_categories WHERE name = ?').get(categoryName)
      if (!category) {
        const result = db.prepare('INSERT INTO ebook_categories (name, description) VALUES (?, ?)').run(categoryName, categoryDir)
        category = { id: result.lastInsertRowid, name: categoryName }
        results.categories++
      }

      // Recursively scan for ebooks in this category
      await scanFolderForEbooks(categoryPath, category, results)
    }
  } catch (error) {
    results.errors.push({ path: EBOOKS_BASE_PATH, error: error.message })
  }

  return results
}

// Scan ebooks endpoint
app.post('/api/ebooks/scan', async (req, res) => {
  try {
    const results = await scanEbooksDirectory()
    res.json(results)
  } catch (error) {
    console.error('Scan ebooks error:', error)
    res.status(500).json({ error: 'Failed to scan ebooks directory' })
  }
})

// Get all ebook categories with counts
app.get('/api/ebook-categories', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT ec.*, COUNT(e.id) as ebook_count
      FROM ebook_categories ec
      LEFT JOIN ebooks e ON ec.id = e.category_id
      GROUP BY ec.id
      ORDER BY ec.name
    `).all()
    res.json(categories)
  } catch (error) {
    console.error('Get ebook categories error:', error)
    res.status(500).json({ error: 'Failed to fetch ebook categories' })
  }
})

// Get ebooks by category
app.get('/api/ebooks', (req, res) => {
  try {
    const { category_id, search } = req.query
    let query = 'SELECT * FROM ebooks WHERE 1=1'
    const params = []

    if (category_id) {
      query += ' AND category_id = ?'
      params.push(category_id)
    }

    if (search) {
      query += ' AND title LIKE ?'
      params.push(`%${search}%`)
    }

    query += ' ORDER BY title'

    const ebooks = db.prepare(query).all(...params)
    res.json(ebooks)
  } catch (error) {
    console.error('Get ebooks error:', error)
    res.status(500).json({ error: 'Failed to fetch ebooks' })
  }
})

// Get single ebook
app.get('/api/ebooks/:id', (req, res) => {
  try {
    const ebook = db.prepare('SELECT * FROM ebooks WHERE id = ?').get(req.params.id)
    if (!ebook) {
      return res.status(404).json({ error: 'Ebook not found' })
    }
    res.json(ebook)
  } catch (error) {
    console.error('Get ebook error:', error)
    res.status(500).json({ error: 'Failed to fetch ebook' })
  }
})

// Generate cover for a single ebook
async function generateEbookCover(pdfPath, ebookId) {
  const tempOutputBase = `/tmp/ebook_cover_${Date.now()}_${Math.random().toString(36).substring(7)}`
  const tempOutputFile = `${tempOutputBase}-01.jpg`

  try {
    await execAsync(`pdftoppm -f 1 -l 1 -jpeg -r 150 "${pdfPath}" "${tempOutputBase}"`)
    const imageBuffer = await readFile(tempOutputFile)
    const publicId = `ebook_${ebookId}`
    const result = await uploadToCloudinary(imageBuffer, 'bookpost/ebook-covers', publicId)
    await unlink(tempOutputFile).catch(() => {})
    return result.secure_url
  } catch (error) {
    await unlink(tempOutputFile).catch(() => {})
    throw error
  }
}

// Generate cover for single ebook
app.post('/api/ebooks/:id/generate-cover', async (req, res) => {
  try {
    const ebook = db.prepare('SELECT * FROM ebooks WHERE id = ?').get(req.params.id)
    if (!ebook) {
      return res.status(404).json({ error: 'Ebook not found' })
    }

    const coverUrl = await generateEbookCover(ebook.file_path, ebook.id)
    db.prepare('UPDATE ebooks SET cover_url = ? WHERE id = ?').run(coverUrl, ebook.id)

    res.json({ success: true, cover_url: coverUrl })
  } catch (error) {
    console.error('Generate ebook cover error:', error)
    res.status(500).json({ error: 'Failed to generate cover' })
  }
})

// Ebook cover generation progress tracking
let ebookCoverProgress = {
  running: false,
  total: 0,
  processed: 0,
  success: 0,
  failed: 0,
  skipped: 0,
  current: ''
}

// Batch generate ebook covers
app.post('/api/ebooks/generate-covers', async (req, res) => {
  if (ebookCoverProgress.running) {
    return res.status(409).json({
      error: 'Cover generation already in progress',
      progress: ebookCoverProgress
    })
  }

  const { category_id } = req.body

  // Get ebooks that need covers
  let query = 'SELECT * FROM ebooks WHERE cover_url IS NULL'
  const params = []
  if (category_id) {
    query += ' AND category_id = ?'
    params.push(category_id)
  }

  const ebooks = db.prepare(query).all(...params)

  if (ebooks.length === 0) {
    return res.json({ message: 'All ebooks already have covers', total: 0 })
  }

  // Initialize progress
  ebookCoverProgress = {
    running: true,
    total: ebooks.length,
    processed: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    current: ''
  }

  res.json({ message: 'Cover generation started', total: ebooks.length })

  // Process in background
  ;(async () => {
    for (const ebook of ebooks) {
      ebookCoverProgress.current = ebook.title

      try {
        // Check if file exists
        await stat(ebook.file_path)

        const coverUrl = await generateEbookCover(ebook.file_path, ebook.id)
        db.prepare('UPDATE ebooks SET cover_url = ? WHERE id = ?').run(coverUrl, ebook.id)
        ebookCoverProgress.success++
      } catch (error) {
        console.error(`Failed to generate cover for ${ebook.title}:`, error.message)
        ebookCoverProgress.failed++
      }

      ebookCoverProgress.processed++
    }

    ebookCoverProgress.running = false
    ebookCoverProgress.current = ''
    console.log('Ebook cover generation complete:', ebookCoverProgress)
  })()
})

// Get ebook cover generation progress
app.get('/api/ebooks/generate-covers/progress', (req, res) => {
  res.json(ebookCoverProgress)
})

// Serve ebook PDF file
app.get('/api/ebooks/:id/file', async (req, res) => {
  try {
    const ebook = db.prepare('SELECT *, s3_key FROM ebooks WHERE id = ?').get(req.params.id)
    if (!ebook) {
      return res.status(404).json({ error: 'Ebook not found' })
    }

    // If S3 storage is enabled and file has s3_key, redirect to signed URL
    if (useS3Storage && ebook.s3_key) {
      const signedUrl = await getS3SignedUrl(ebook.s3_key, 3600) // 1 hour expiry
      return res.redirect(signedUrl)
    }

    // Fallback to local file
    res.sendFile(ebook.file_path)
  } catch (error) {
    console.error('Serve ebook file error:', error)
    res.status(500).json({ error: 'Failed to serve ebook file' })
  }
})

app.listen(PORT, () => {
  console.log(`BookPost server running on http://localhost:${PORT}`)
})
