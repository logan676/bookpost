import { Router } from 'express'
import db from '../config/database.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Get reading history
router.get('/', (req, res) => {
  try {
    if (!req.user) {
      return res.json({ ebooks: [], magazines: [], books: [] })
    }

    const history = db.prepare(`
      SELECT * FROM reading_history
      WHERE user_id = ?
      ORDER BY last_read_at DESC
    `).all(req.user.id)

    const ebooks = history.filter(h => h.item_type === 'ebook')
    const magazines = history.filter(h => h.item_type === 'magazine')
    const books = history.filter(h => h.item_type === 'book')

    res.json({ ebooks, magazines, books })
  } catch (error) {
    console.error('Get reading history error:', error)
    res.status(500).json({ error: 'Failed to fetch reading history' })
  }
})

// Save/update reading progress
router.post('/', requireAuth, (req, res) => {
  try {
    const { item_type, item_id, title, cover_url, last_page } = req.body

    if (!item_type || !item_id || !title) {
      return res.status(400).json({ error: 'item_type, item_id, and title are required' })
    }

    db.prepare(`
      INSERT INTO reading_history (user_id, item_type, item_id, title, cover_url, last_page, last_read_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, item_type, item_id) DO UPDATE SET
        title = excluded.title,
        cover_url = excluded.cover_url,
        last_page = excluded.last_page,
        last_read_at = CURRENT_TIMESTAMP
    `).run(req.user.id, item_type, item_id, title, cover_url || null, last_page || 1)

    res.json({ success: true })
  } catch (error) {
    console.error('Save reading history error:', error)
    res.status(500).json({ error: 'Failed to save reading history' })
  }
})

// Get reading progress for a specific item
router.get('/:type/:id', (req, res) => {
  try {
    if (!req.user) {
      return res.json({ last_page: 1 })
    }

    const history = db.prepare(`
      SELECT last_page FROM reading_history
      WHERE user_id = ? AND item_type = ? AND item_id = ?
    `).get(req.user.id, req.params.type, req.params.id)

    res.json({ last_page: history?.last_page || 1 })
  } catch (error) {
    console.error('Get reading progress error:', error)
    res.status(500).json({ error: 'Failed to get reading progress' })
  }
})

// Delete from reading history
router.delete('/:type/:id', requireAuth, (req, res) => {
  try {
    db.prepare(`
      DELETE FROM reading_history
      WHERE user_id = ? AND item_type = ? AND item_id = ?
    `).run(req.user.id, req.params.type, req.params.id)

    res.json({ success: true })
  } catch (error) {
    console.error('Delete reading history error:', error)
    res.status(500).json({ error: 'Failed to delete from reading history' })
  }
})

export default router
