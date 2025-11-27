import { useState, useEffect } from 'react'
import { useI18n } from '../i18n'
import { useAuth } from '../auth'
import MagazineReader from './MagazineReader'
import EbookReader from './EbookReader'
import BookCard from './BookCard'
import AddBookModal from './AddBookModal'
import LoginModal from './LoginModal'
import type { ReadingHistory, ReadingHistoryItem, Book, Magazine, Ebook } from '../types'

interface Props {
  books: Book[]
  onBookClick: (book: Book) => void
  onBookAdded: () => void
}

export default function BookshelfDashboard({ books, onBookClick, onBookAdded }: Props) {
  const { t, formatCount } = useI18n()
  const { token, user } = useAuth()
  const [readingHistory, setReadingHistory] = useState<ReadingHistory>({ ebooks: [], magazines: [], books: [] })
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)

  // Reader states
  const [selectedMagazine, setSelectedMagazine] = useState<{ magazine: Magazine; initialPage: number } | null>(null)
  const [selectedEbook, setSelectedEbook] = useState<{ ebook: Ebook; initialPage: number } | null>(null)

  useEffect(() => {
    fetchReadingHistory()
  }, [token])

  const fetchReadingHistory = async () => {
    try {
      const headers: Record<string, string> = {}
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }
      const response = await fetch('/api/reading-history', { headers })
      if (response.ok) {
        const data = await response.json()
        setReadingHistory(data)
      }
    } catch (error) {
      console.error('Failed to fetch reading history:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddBookClick = () => {
    if (!user) {
      setShowLoginModal(true)
      return
    }
    setShowAddModal(true)
  }

  const handleMagazineClick = async (item: ReadingHistoryItem) => {
    // Fetch magazine details and open reader
    try {
      const response = await fetch(`/api/magazines/${item.item_id}`)
      if (response.ok) {
        const magazine = await response.json()
        setSelectedMagazine({ magazine, initialPage: item.last_page })
      }
    } catch (error) {
      console.error('Failed to fetch magazine:', error)
    }
  }

  const handleEbookClick = async (item: ReadingHistoryItem) => {
    // Fetch ebook details and open reader
    try {
      const response = await fetch(`/api/ebooks/${item.item_id}`)
      if (response.ok) {
        const ebook = await response.json()
        setSelectedEbook({ ebook, initialPage: item.last_page })
      }
    } catch (error) {
      console.error('Failed to fetch ebook:', error)
    }
  }

  const handleBackFromReader = () => {
    setSelectedMagazine(null)
    setSelectedEbook(null)
    fetchReadingHistory() // Refresh history after reading
  }

  // Show magazine reader
  if (selectedMagazine) {
    return (
      <MagazineReader
        magazine={selectedMagazine.magazine}
        onBack={handleBackFromReader}
        initialPage={selectedMagazine.initialPage}
      />
    )
  }

  // Show ebook reader
  if (selectedEbook) {
    return (
      <EbookReader
        ebook={selectedEbook.ebook}
        onBack={handleBackFromReader}
        initialPage={selectedEbook.initialPage}
      />
    )
  }

  const hasEbooks = readingHistory.ebooks.length > 0
  const hasMagazines = readingHistory.magazines.length > 0
  const hasPhysicalBooks = books.length > 0
  const hasContent = hasEbooks || hasMagazines || hasPhysicalBooks

  return (
    <div className="bookshelf-dashboard">
      <div className="bookshelf-actions">
        <button className="add-btn" onClick={handleAddBookClick}>
          {t.addBook}
        </button>
      </div>

      {loading && <div className="loading">{t.loading}</div>}

      {!loading && !hasContent && (
        <div className="empty-state">
          <h2>{t.yourCollectionEmpty}</h2>
          <p>{t.takePhotoToStart}</p>
          <button className="add-btn" onClick={handleAddBookClick}>
            {t.addFirstBook}
          </button>
        </div>
      )}

      {!loading && hasContent && (
        <div className="bookshelf-sections">
          {/* Ebooks Section */}
          {hasEbooks && (
            <section className="bookshelf-section">
              <h2 className="section-title">{t.ebooks}</h2>
              <div className="history-grid">
                {readingHistory.ebooks.map((item) => (
                  <div
                    key={`ebook-${item.item_id}`}
                    className="history-card"
                    onClick={() => handleEbookClick(item)}
                  >
                    <div className="history-cover">
                      {item.cover_url ? (
                        <img src={item.cover_url} alt={item.title} />
                      ) : (
                        <div className="history-placeholder">
                          <span>PDF</span>
                        </div>
                      )}
                    </div>
                    <div className="history-info">
                      <h3 className="history-title">{item.title}</h3>
                      <span className="history-page">Page {item.last_page}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Magazines Section */}
          {hasMagazines && (
            <section className="bookshelf-section">
              <h2 className="section-title">{t.magazines}</h2>
              <div className="history-grid">
                {readingHistory.magazines.map((item) => (
                  <div
                    key={`magazine-${item.item_id}`}
                    className="history-card"
                    onClick={() => handleMagazineClick(item)}
                  >
                    <div className="history-cover">
                      {item.cover_url ? (
                        <img src={item.cover_url} alt={item.title} />
                      ) : (
                        <div className="history-placeholder">
                          <span>PDF</span>
                        </div>
                      )}
                    </div>
                    <div className="history-info">
                      <h3 className="history-title">{item.title}</h3>
                      <span className="history-page">Page {item.last_page}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Physical Books Section */}
          {hasPhysicalBooks && (
            <section className="bookshelf-section">
              <h2 className="section-title">{t.physicalBooks}</h2>
              <div className="book-grid">
                {books.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    onClick={() => onBookClick(book)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {showAddModal && (
        <AddBookModal
          onClose={() => setShowAddModal(false)}
          onBookAdded={onBookAdded}
        />
      )}

      {showLoginModal && (
        <LoginModal onClose={() => setShowLoginModal(false)} />
      )}
    </div>
  )
}
