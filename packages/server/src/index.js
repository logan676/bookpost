import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import vision from '@google-cloud/vision'
import dotenv from 'dotenv'

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
`)

// Middleware
app.use(cors())
app.use(express.json())

// Helper: Upload image to Cloudinary
async function uploadToCloudinary(buffer, folder = 'bookpost') {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) reject(error)
        else resolve(result)
      }
    )
    uploadStream.end(buffer)
  })
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
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY
    const url = apiKey
      ? `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${apiKey}`
      : `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.items && data.items.length > 0) {
      const book = data.items[0].volumeInfo
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

app.listen(PORT, () => {
  console.log(`BookPost server running on http://localhost:${PORT}`)
})
