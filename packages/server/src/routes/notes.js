import { Router } from 'express'
import { existsSync } from 'fs'
import { readFile, writeFile, mkdir, readdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import db from '../config/database.js'
import { authMiddleware, requireAuth } from '../middleware/auth.js'
import {
  storageClient,
  downloadFromStorage,
  streamFromStorage
} from '../config/storage.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = Router()

const NOTES_FOLDER = process.env.NOTES_FOLDER || join(__dirname, '../../../../blog')

// Get all notes
router.get('/', authMiddleware, (req, res) => {
  try {
    if (!req.user) {
      return res.json([])
    }
    const { year, search } = req.query
    let query = 'SELECT * FROM notes WHERE user_id = ?'
    const params = [req.user.id]

    if (year) {
      query += ' AND year = ?'
      params.push(parseInt(year))
    }

    if (search) {
      query += ' AND (title LIKE ? OR content_preview LIKE ?)'
      const searchTerm = `%${search}%`
      params.push(searchTerm, searchTerm)
    }

    query += ' ORDER BY year DESC, title ASC'

    const notes = db.prepare(query).all(...params)
    res.json(notes)
  } catch (error) {
    console.error('Get notes error:', error)
    res.status(500).json({ error: 'Failed to fetch notes' })
  }
})

// Get years with note counts
router.get('/years', authMiddleware, (req, res) => {
  try {
    if (!req.user) {
      return res.json([])
    }
    const years = db.prepare(`
      SELECT year, COUNT(*) as count
      FROM notes
      WHERE year IS NOT NULL AND user_id = ?
      GROUP BY year
      ORDER BY year DESC
    `).all(req.user.id)
    res.json(years)
  } catch (error) {
    console.error('Get note years error:', error)
    res.status(500).json({ error: 'Failed to fetch note years' })
  }
})

// Get single note
router.get('/:id', (req, res) => {
  try {
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id)
    if (!note) {
      return res.status(404).json({ error: 'Note not found' })
    }
    res.json(note)
  } catch (error) {
    console.error('Get note error:', error)
    res.status(500).json({ error: 'Failed to fetch note' })
  }
})

// Full import of notes with metadata and comments
router.post('/scan', requireAuth, async (req, res) => {
  try {
    console.log('Full import from:', NOTES_FOLDER, 'for user:', req.user.id)

    // Clear existing notes and comments for this user
    db.prepare('DELETE FROM note_comments WHERE user_id = ?').run(req.user.id)
    db.prepare('DELETE FROM note_underlines WHERE note_id IN (SELECT id FROM notes WHERE user_id = ?)').run(req.user.id)
    db.prepare('DELETE FROM notes WHERE user_id = ?').run(req.user.id)

    const insertNote = db.prepare(`
      INSERT INTO notes (title, file_path, year, content_preview, user_id, author, publish_date, tags, categories, slug)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const insertComment = db.prepare(`
      INSERT INTO note_comments (note_id, nick, content, original_date, user_id)
      VALUES (?, ?, ?, ?, ?)
    `)

    let scanned = 0
    let commentsImported = 0
    let errors = 0

    // Load comments from JSON file
    let allComments = []
    const commentsFile = join(NOTES_FOLDER, 'db', 'Comment.0.json')
    try {
      const commentsContent = await readFile(commentsFile, 'utf-8')
      allComments = commentsContent.split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            return JSON.parse(line)
          } catch {
            return null
          }
        })
        .filter(Boolean)
      console.log(`Loaded ${allComments.length} comments from Comment.0.json`)
    } catch (err) {
      console.log('No comments file found or error reading:', err.message)
    }

    // Scan posts directory
    const postsDir = join(NOTES_FOLDER, 'source', '_posts')
    try {
      const entries = await readdir(postsDir, { withFileTypes: true })

      for (const entry of entries) {
        if (!entry.name.endsWith('.md') || entry.name.toLowerCase().includes('readme')) continue

        const fullPath = join(postsDir, entry.name)
        try {
          const content = await readFile(fullPath, 'utf-8')
          const { frontmatter, body } = parseFrontmatter(content)

          let title = frontmatter.title || entry.name.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '')

          const author = frontmatter.author || '书虫'
          const publishDate = frontmatter.date || null
          const year = extractYear(publishDate)
          const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags.join(',') : (frontmatter.tags || '')
          const categories = Array.isArray(frontmatter.categories) ? frontmatter.categories.join(',') : (frontmatter.categories || '')
          const slug = generateSlug(entry.name, publishDate)

          const preview = cleanPreview(body)

          const result = insertNote.run(
            title, fullPath, year, preview, req.user.id,
            author, publishDate, tags, categories, slug
          )
          const noteId = result.lastInsertRowid
          scanned++

          // Find and import related comments
          const relatedComments = allComments.filter(c => {
            if (!c.url) return false
            const urlTitle = decodeURIComponent(c.url.split('/').filter(Boolean).pop() || '')
            const noteTitle = title.replace(/\s+/g, '-')
            return c.url.includes(slug) ||
                   urlTitle === noteTitle ||
                   c.url.includes(encodeURIComponent(title))
          })

          for (const comment of relatedComments) {
            const commentContent = stripHtml(comment.comment || '')
            if (commentContent) {
              const commentDate = comment.createdAt || comment.insertedAt?.iso || null
              insertComment.run(noteId, comment.nick || 'Anonymous', commentContent, commentDate, req.user.id)
              commentsImported++
            }
          }

        } catch (err) {
          console.error(`Error processing ${entry.name}:`, err.message)
          errors++
        }
      }
    } catch (err) {
      console.error('Error reading posts directory:', err.message)
    }

    // Also scan drafts if exists
    const draftsDir = join(NOTES_FOLDER, 'source', '_drafts')
    try {
      const drafts = await readdir(draftsDir, { withFileTypes: true })
      for (const entry of drafts) {
        if (!entry.name.endsWith('.md')) continue
        const fullPath = join(draftsDir, entry.name)
        try {
          const content = await readFile(fullPath, 'utf-8')
          const { frontmatter, body } = parseFrontmatter(content)
          const title = frontmatter.title || entry.name.replace(/\.md$/, '')
          const preview = cleanPreview(body)
          insertNote.run(title, fullPath, null, preview, req.user.id, frontmatter.author || '书虫', null, '', '', '')
          scanned++
        } catch (err) {
          errors++
        }
      }
    } catch {
      // Drafts folder may not exist
    }

    console.log(`Import complete: ${scanned} notes, ${commentsImported} comments, ${errors} errors`)
    res.json({ scanned, commentsImported, errors })
  } catch (error) {
    console.error('Import error:', error)
    res.status(500).json({ error: 'Failed to import notes' })
  }
})

// Get note content
router.get('/:id/content', authMiddleware, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id)
    if (!note) {
      return res.status(404).json({ error: 'Note not found' })
    }

    let rawContent
    // Try R2 first if s3_key exists
    if (note.s3_key && storageClient) {
      try {
        const buffer = await downloadFromStorage(note.s3_key)
        if (buffer) {
          rawContent = buffer.toString('utf-8')
        }
      } catch (r2Error) {
        console.log('R2 fetch failed, falling back to local:', r2Error.message)
      }
    }
    // Fallback to local file
    if (!rawContent) {
      rawContent = await readFile(note.file_path, 'utf-8')
    }
    const { frontmatter, content } = parseMarkdownNote(rawContent)

    // Fetch underlines for this note
    const underlines = db.prepare(`
      SELECT u.*, COUNT(i.id) as idea_count
      FROM note_underlines u
      LEFT JOIN note_ideas i ON u.id = i.underline_id
      WHERE u.note_id = ?
      GROUP BY u.id
      ORDER BY u.paragraph_index, u.start_offset
    `).all(req.params.id)

    // Fetch comments for this note
    const comments = db.prepare(`
      SELECT * FROM note_comments
      WHERE note_id = ?
      ORDER BY original_date ASC, created_at ASC
    `).all(req.params.id)

    res.json({
      ...note,
      content,
      frontmatter,
      date: frontmatter.date || null,
      author: frontmatter.author || null,
      tags: frontmatter.tags || [],
      categories: frontmatter.categories || [],
      underlines,
      comments
    })
  } catch (error) {
    console.error('Get note content error:', error)
    res.status(500).json({ error: 'Failed to fetch note content' })
  }
})

// Note underlines
router.get('/:id/underlines', (req, res) => {
  try {
    const underlines = db.prepare(`
      SELECT u.*, COUNT(i.id) as idea_count
      FROM note_underlines u
      LEFT JOIN note_ideas i ON u.id = i.underline_id
      WHERE u.note_id = ?
      GROUP BY u.id
      ORDER BY u.paragraph_index, u.start_offset
    `).all(req.params.id)
    res.json(underlines)
  } catch (error) {
    console.error('Get note underlines error:', error)
    res.status(500).json({ error: 'Failed to fetch underlines' })
  }
})

router.post('/:id/underlines', requireAuth, (req, res) => {
  try {
    const { text, paragraph_index, start_offset, end_offset } = req.body
    if (!text || paragraph_index === undefined) {
      return res.status(400).json({ error: 'Text and paragraph_index are required' })
    }

    const result = db.prepare(`
      INSERT INTO note_underlines (note_id, text, paragraph_index, start_offset, end_offset, user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.params.id, text, paragraph_index, start_offset || 0, end_offset || 0, req.user.id)

    const newUnderline = db.prepare('SELECT * FROM note_underlines WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(newUnderline)
  } catch (error) {
    console.error('Create note underline error:', error)
    res.status(500).json({ error: 'Failed to create underline' })
  }
})

// Create a new note
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, content } = req.body
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' })
    }

    const notesFolder = process.env.NOTES_FOLDER || '/Volumes/T9/笔记'
    const year = new Date().getFullYear()
    const yearFolder = join(notesFolder, year.toString())

    if (!existsSync(yearFolder)) {
      await mkdir(yearFolder, { recursive: true })
    }

    const safeTitle = title.replace(/[/\\?%*:|"<>]/g, '-').substring(0, 100)
    const timestamp = Date.now()
    const filename = `${safeTitle}-${timestamp}.md`
    const filePath = join(yearFolder, filename)

    await writeFile(filePath, content, 'utf-8')

    const result = db.prepare(`
      INSERT INTO notes (title, content_preview, file_path, year, user_id, created_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      title,
      content.substring(0, 200),
      filePath,
      year,
      req.user.id
    )

    res.json({
      id: result.lastInsertRowid,
      title,
      year,
      file_path: filePath
    })
  } catch (error) {
    console.error('Create note error:', error)
    res.status(500).json({ error: 'Failed to create note' })
  }
})

// Note underline operations (mounted at parent level)
router.delete('/note-underlines/:id', requireAuth, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM note_underlines WHERE id = ?').run(req.params.id)
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Underline not found' })
    }
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete underline' })
  }
})

// Note ideas
router.get('/note-underlines/:id/ideas', (req, res) => {
  try {
    const ideas = db.prepare('SELECT * FROM note_ideas WHERE underline_id = ? ORDER BY created_at DESC').all(req.params.id)
    res.json(ideas)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ideas' })
  }
})

router.post('/note-underlines/:id/ideas', requireAuth, (req, res) => {
  try {
    const { content } = req.body
    if (!content) {
      return res.status(400).json({ error: 'Content is required' })
    }

    const result = db.prepare('INSERT INTO note_ideas (underline_id, content, user_id) VALUES (?, ?, ?)').run(req.params.id, content, req.user.id)
    const newIdea = db.prepare('SELECT * FROM note_ideas WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(newIdea)
  } catch (error) {
    console.error('Create note idea error:', error)
    res.status(500).json({ error: 'Failed to create idea' })
  }
})

router.delete('/note-ideas/:id', requireAuth, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM note_ideas WHERE id = ?').run(req.params.id)
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Idea not found' })
    }
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete idea' })
  }
})

// Serve blog images
router.get('/blog-images/:filename', authMiddleware, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const { filename } = req.params
    const r2Key = `blog-images/${filename}`

    if (storageClient) {
      try {
        const stream = await streamFromStorage(r2Key)
        if (stream) {
          const ext = filename.split('.').pop().toLowerCase()
          const contentTypes = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'svg': 'image/svg+xml'
          }
          res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream')
          res.setHeader('Cache-Control', 'public, max-age=31536000')
          stream.pipe(res)
          return
        }
      } catch (r2Error) {
        console.log('R2 blog image fetch failed, falling back to local:', r2Error.message)
      }
    }

    const localPath = join(NOTES_FOLDER, 'source/images', filename)
    res.sendFile(localPath)
  } catch (error) {
    console.error('Blog image error:', error)
    res.status(404).json({ error: 'Image not found' })
  }
})

// Helper: Parse frontmatter
function parseFrontmatter(content) {
  const frontmatter = {}

  let match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)

  if (!match) {
    match = content.match(/^((?:[a-z]+:\s*[^\n]*\n|\s+-\s+[^\n]*\n)+)---\r?\n?([\s\S]*)$/i)
  }

  if (!match) return { frontmatter, body: content }

  const yamlStr = match[1]
  const body = match[2]

  const lines = yamlStr.split('\n')
  let currentKey = null
  let currentArray = null

  for (const line of lines) {
    const keyMatch = line.match(/^(\w+):\s*(.*)$/)
    if (keyMatch) {
      currentKey = keyMatch[1]
      const value = keyMatch[2].trim()
      if (value === '' || value === '[]') {
        frontmatter[currentKey] = []
        currentArray = currentKey
      } else if (value.startsWith('[') && value.endsWith(']')) {
        frontmatter[currentKey] = value.slice(1, -1).split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean)
        currentArray = null
      } else {
        frontmatter[currentKey] = value.replace(/['"]/g, '')
        currentArray = null
      }
    } else if (line.match(/^\s+-\s+(.*)$/) && currentArray) {
      const item = line.match(/^\s+-\s+(.*)$/)[1].trim().replace(/['"]/g, '')
      if (item) frontmatter[currentArray].push(item)
    }
  }

  return { frontmatter, body }
}

// Helper: Parse markdown note
function parseMarkdownNote(rawContent) {
  let frontmatter = {}
  let content = rawContent

  let frontmatterMatch = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)

  if (!frontmatterMatch) {
    frontmatterMatch = rawContent.match(/^((?:[a-z]+:\s*[^\n]*\n|\s+-\s+[^\n]*\n)+)---\r?\n?([\s\S]*)$/i)
  }

  if (frontmatterMatch) {
    const yamlStr = frontmatterMatch[1]
    content = frontmatterMatch[2]

    const lines = yamlStr.split('\n')
    let currentKey = null
    let currentArray = null

    for (const line of lines) {
      const keyMatch = line.match(/^(\w+):\s*(.*)$/)
      if (keyMatch) {
        currentKey = keyMatch[1]
        const value = keyMatch[2].trim()
        if (value === '' || value === '[]') {
          frontmatter[currentKey] = []
          currentArray = currentKey
        } else if (value.startsWith('[') && value.endsWith(']')) {
          frontmatter[currentKey] = value.slice(1, -1).split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean)
          currentArray = null
        } else {
          frontmatter[currentKey] = value.replace(/['"]/g, '')
          currentArray = null
        }
      } else if (line.match(/^\s+-\s+(.*)$/) && currentArray) {
        const item = line.match(/^\s+-\s+(.*)$/)[1].trim().replace(/['"]/g, '')
        if (item) {
          frontmatter[currentArray].push(item)
        }
      }
    }
  }

  content = content.replace(/<!--[\s\S]*?-->/g, '')
  content = content.replace(/\n{3,}/g, '\n\n').trim()

  return { frontmatter, content }
}

// Helper: Clean preview text
function cleanPreview(text) {
  return text
    .replace(/^(title|author|date|tags|categories|layout|comments):\s*.*$/gm, '')
    .replace(/^\s*-\s+(日记|生活|技术|我的大学).*$/gm, '')
    .replace(/^---\s*$/gm, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/^\s*-\s+/gm, '')
    .replace(/\[\]/g, '')
    .replace(/\n{2,}/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .substring(0, 300)
}

// Helper: Extract year from date string
function extractYear(dateStr) {
  if (!dateStr) return null
  const match = dateStr.match(/(\d{4})/)
  return match ? parseInt(match[1]) : null
}

// Helper: Generate slug from filename
function generateSlug(filename, date) {
  const name = filename.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '')
  if (date) {
    const dateMatch = date.match(/(\d{4})-(\d{2})-(\d{2})/)
    if (dateMatch) {
      return `/${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}/${encodeURIComponent(name)}/`
    }
  }
  return `/${encodeURIComponent(name)}/`
}

// Helper: Strip HTML from comment content
function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .trim()
}

export default router
