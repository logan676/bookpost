import { useState, useEffect } from 'react'
import { useI18n } from '../i18n'
import { useAuth } from '../auth'
import MagazineReader from './MagazineReader'
import EbookReader from './EbookReader'
import type { ReadingHistory, ReadingHistoryItem, Magazine, Ebook } from '../types'

export default function BookshelfDashboard() {
  const { t } = useI18n()
  const { token } = useAuth()
  const [readingHistory, setReadingHistory] = useState<ReadingHistory>({ ebooks: [], magazines: [], books: [] })
  const [loading, setLoading] = useState(true)

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
  const hasBooks = readingHistory.books.length > 0
  const hasContent = hasEbooks || hasMagazines || hasBooks

  // Limit to 6 items max for each section
  const MAX_ITEMS = 6
  const displayedEbooks = readingHistory.ebooks.slice(0, MAX_ITEMS)
  const displayedMagazines = readingHistory.magazines.slice(0, MAX_ITEMS)
  const displayedBooks = readingHistory.books.slice(0, MAX_ITEMS)

  return (
    <div className="bookshelf-dashboard">
      {loading && <div className="loading">{t.loading}</div>}

      {!loading && !hasContent && (
        <div className="empty-state">
          <h2>{t.noReadingHistory || 'No reading history'}</h2>
          <p>{t.startReadingHint || 'Start reading ebooks or magazines to see them here'}</p>
        </div>
      )}

      {!loading && hasContent && (
        <div className="bookshelf-sections">
          {/* Ebooks Section */}
          {hasEbooks && (
            <section className="bookshelf-section">
              <div className="section-header">
                <h2 className="section-title">{t.ebooks}</h2>
                {readingHistory.ebooks.length > MAX_ITEMS && (
                  <button className="view-all-link" onClick={() => window.location.hash = 'ebooks'}>
                    {t.viewAll || 'View All'} →
                  </button>
                )}
              </div>
              <div className="history-grid">
                {displayedEbooks.map((item) => (
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
              <div className="section-header">
                <h2 className="section-title">{t.magazines}</h2>
                {readingHistory.magazines.length > MAX_ITEMS && (
                  <button className="view-all-link" onClick={() => window.location.hash = 'magazines'}>
                    {t.viewAll || 'View All'} →
                  </button>
                )}
              </div>
              <div className="history-grid">
                {displayedMagazines.map((item) => (
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
          {hasBooks && (
            <section className="bookshelf-section">
              <div className="section-header">
                <h2 className="section-title">{t.physicalBooks}</h2>
                {readingHistory.books.length > MAX_ITEMS && (
                  <button className="view-all-link" onClick={() => window.location.hash = 'books'}>
                    {t.viewAll || 'View All'} →
                  </button>
                )}
              </div>
              <div className="history-grid">
                {displayedBooks.map((item) => (
                  <div
                    key={`book-${item.item_id}`}
                    className="history-card"
                    onClick={() => window.location.hash = 'books'}
                  >
                    <div className="history-cover">
                      {item.cover_url ? (
                        <img src={item.cover_url} alt={item.title} />
                      ) : (
                        <div className="history-placeholder">
                          <span>Book</span>
                        </div>
                      )}
                    </div>
                    <div className="history-info">
                      <h3 className="history-title">{item.title}</h3>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
