import { useState, useEffect, useCallback } from 'react'
import { useI18n } from '../i18n'
import { useAuth } from '../auth'
import BookCard from './BookCard'
import AddBookModal from './AddBookModal'
import LoginModal from './LoginModal'
import type { Book } from '../types'

interface Props {
  onBookClick: (book: Book) => void
}

export default function PhysicalBooksDashboard({ onBookClick }: Props) {
  const { t, formatCount } = useI18n()
  const { token, user } = useAuth()
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)

  const fetchBooks = useCallback(async () => {
    if (!token) {
      setLoading(false)
      return
    }
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`
      }
      const response = await fetch('/api/books', { headers })
      if (response.ok) {
        const result = await response.json()
        setBooks(result.data || result || [])
      }
    } catch (error) {
      console.error('Failed to fetch books:', error)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchBooks()
  }, [fetchBooks])

  const handleAddBookClick = () => {
    if (!user) {
      setShowLoginModal(true)
      return
    }
    setShowAddModal(true)
  }

  const handleBookAdded = () => {
    fetchBooks()
    setShowAddModal(false)
  }

  const handleBookClick = async (book: Book) => {
    // Save to reading history if user is logged in
    if (token) {
      try {
        await fetch('/api/reading-history', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            item_type: 'book',
            item_id: book.id,
            title: book.title,
            cover_url: book.cover_url || book.cover_photo_url,
            last_page: 1,
          }),
        })
      } catch (error) {
        console.error('Failed to save reading history:', error)
      }
    }
    onBookClick(book)
  }

  // Show login prompt if not authenticated
  if (!user && !loading) {
    return (
      <div className="magazines-dashboard no-header">
        <div className="empty-state">
          <h2>{t.loginRequired || 'Login Required'}</h2>
          <p>{t.loginToViewBooks || 'Please login to view and manage your physical books'}</p>
          <button className="add-btn" onClick={() => setShowLoginModal(true)}>
            {t.login || 'Login'}
          </button>
        </div>
        {showLoginModal && (
          <LoginModal onClose={() => setShowLoginModal(false)} />
        )}
      </div>
    )
  }

  return (
    <div className="magazines-dashboard no-header">
      <div className="filters" style={{ justifyContent: 'flex-end' }}>
        <button className="add-btn" onClick={handleAddBookClick}>
          {t.addBook}
        </button>
      </div>

      {loading && <div className="loading">{t.loading}</div>}

      {!loading && books.length === 0 && (
        <div className="empty-state">
          <h2>{t.noBooksFound || 'No books found'}</h2>
          <p>{t.takePhotoToStart}</p>
          <button className="add-btn" onClick={handleAddBookClick}>
            {t.addFirstBook}
          </button>
        </div>
      )}

      {!loading && books.length > 0 && (
        <>
          <div className="item-count-header">
            <span className="item-count">{formatCount(t.booksCount || '{count} books', books.length)}</span>
          </div>
          <div className="book-grid physical-books-grid">
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onClick={() => handleBookClick(book)}
              />
            ))}
          </div>
        </>
      )}

      {showAddModal && (
        <AddBookModal
          onClose={() => setShowAddModal(false)}
          onBookAdded={handleBookAdded}
        />
      )}

      {showLoginModal && (
        <LoginModal onClose={() => setShowLoginModal(false)} />
      )}
    </div>
  )
}
