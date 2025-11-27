import { useState, useEffect, useCallback } from 'react'
import BookCard from './components/BookCard'
import BookDetail from './components/BookDetail'
import PostDetail from './components/PostDetail'
import AddBookModal from './components/AddBookModal'
import LoginModal from './components/LoginModal'
import MagazinesDashboard from './components/MagazinesDashboard'
import EbooksDashboard from './components/EbooksDashboard'
import ThinkingDashboard from './components/ThinkingDashboard'
import { useI18n } from './i18n'
import { useAuth } from './auth'
import type { Book, BlogPost } from './types'

type View = 'home' | 'detail' | 'post' | 'magazines' | 'ebooks' | 'thinking'

// Parse URL hash to get current route
function parseHash(): { view: View; bookId?: number; postId?: number } {
  const hash = window.location.hash.slice(1) // Remove #
  if (!hash) return { view: 'home' }

  if (hash === 'magazines') {
    return { view: 'magazines' }
  }

  if (hash === 'ebooks') {
    return { view: 'ebooks' }
  }

  if (hash === 'thinking') {
    return { view: 'thinking' }
  }

  const parts = hash.split('/')
  if (parts[0] === 'book' && parts[1]) {
    const bookId = parseInt(parts[1], 10)
    if (parts[2] === 'post' && parts[3]) {
      const postId = parseInt(parts[3], 10)
      return { view: 'post', bookId, postId }
    }
    return { view: 'detail', bookId }
  }
  return { view: 'home' }
}

function App() {
  const { t } = useI18n()
  const { user, token, loading: authLoading, logout } = useAuth()
  const [view, setView] = useState<View>('home')
  const [books, setBooks] = useState<Book[]>([])
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null)

  // Handle URL hash changes
  const handleHashChange = useCallback(async () => {
    const { view: newView, bookId, postId } = parseHash()

    if (newView === 'home') {
      setView('home')
      setSelectedBook(null)
      setSelectedPost(null)
    } else if (newView === 'magazines') {
      setView('magazines')
      setSelectedBook(null)
      setSelectedPost(null)
    } else if (newView === 'ebooks') {
      setView('ebooks')
      setSelectedBook(null)
      setSelectedPost(null)
    } else if (newView === 'thinking') {
      setView('thinking')
      setSelectedBook(null)
      setSelectedPost(null)
    } else if (newView === 'detail' && bookId) {
      try {
        const response = await fetch(`/api/books/${bookId}`)
        if (response.ok) {
          const data = await response.json()
          setSelectedBook(data)
          setSelectedPost(null)
          setView('detail')
        } else {
          window.location.hash = ''
        }
      } catch (err) {
        console.error(err)
        window.location.hash = ''
      }
    } else if (newView === 'post' && bookId && postId) {
      try {
        const [bookRes, postRes] = await Promise.all([
          fetch(`/api/books/${bookId}`),
          fetch(`/api/posts/${postId}`)
        ])
        if (bookRes.ok && postRes.ok) {
          const bookData = await bookRes.json()
          const postData = await postRes.json()
          setSelectedBook(bookData)
          setSelectedPost(postData)
          setView('post')
        } else {
          window.location.hash = ''
        }
      } catch (err) {
        console.error(err)
        window.location.hash = ''
      }
    }
  }, [])

  useEffect(() => {
    if (!authLoading) {
      fetchBooks()
    }
    handleHashChange() // Handle initial URL
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [handleHashChange, authLoading, token])

  const fetchBooks = async () => {
    try {
      const headers: Record<string, string> = {}
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }
      const response = await fetch('/api/books', { headers })
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setBooks(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchBookDetail = async (id: number) => {
    try {
      const response = await fetch(`/api/books/${id}`)
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setSelectedBook(data)
      setView('detail')
    } catch (err) {
      console.error(err)
    }
  }

  const handleBookClick = (book: Book) => {
    window.location.hash = `book/${book.id}`
  }

  const handleBack = () => {
    window.location.hash = ''
    fetchBooks()
  }

  const handleBookAdded = () => {
    fetchBooks()
  }

  const handlePostCreated = () => {
    if (selectedBook) {
      fetchBookDetail(selectedBook.id)
    }
  }

  const handlePostClick = (post: BlogPost) => {
    if (selectedBook) {
      window.location.hash = `book/${selectedBook.id}/post/${post.id}`
    }
  }

  const handleBackToBook = () => {
    if (selectedBook) {
      window.location.hash = `book/${selectedBook.id}`
    }
  }

  if (view === 'post' && selectedPost) {
    return (
      <div className="app">
        <PostDetail
          post={selectedPost}
          onBack={handleBackToBook}
        />
      </div>
    )
  }

  if (view === 'detail' && selectedBook) {
    return (
      <div className="app">
        <BookDetail
          book={selectedBook}
          onBack={handleBack}
          onPostCreated={handlePostCreated}
          onPostClick={handlePostClick}
        />
      </div>
    )
  }

  const renderContent = () => {
    if (view === 'magazines') {
      return <MagazinesDashboard />
    }
    if (view === 'ebooks') {
      return <EbooksDashboard />
    }
    if (view === 'thinking') {
      return <ThinkingDashboard />
    }

    // Home / Bookshelf view
    return (
      <>
        {loading && <div className="loading">{t.loading}</div>}

        {!loading && books.length === 0 && (
          <div className="empty-state">
            <h2>{t.yourCollectionEmpty}</h2>
            <p>{t.takePhotoToStart}</p>
            <button className="add-btn" onClick={() => setShowAddModal(true)}>
              {t.addFirstBook}
            </button>
          </div>
        )}

        {!loading && books.length > 0 && (
          <div className="book-grid">
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onClick={() => handleBookClick(book)}
              />
            ))}
          </div>
        )}

        {showAddModal && (
          <AddBookModal
            onClose={() => setShowAddModal(false)}
            onBookAdded={handleBookAdded}
          />
        )}
      </>
    )
  }

  return (
    <div className="app">
      <header>
        <h1>{t.appTitle}</h1>
        <nav className="tab-nav">
          <button
            className={`tab-btn ${view === 'ebooks' ? 'active' : ''}`}
            onClick={() => window.location.hash = 'ebooks'}
          >
            {t.ebooks}
          </button>
          <button
            className={`tab-btn ${view === 'magazines' ? 'active' : ''}`}
            onClick={() => window.location.hash = 'magazines'}
          >
            {t.magazines}
          </button>
          <button
            className={`tab-btn ${view === 'home' ? 'active' : ''}`}
            onClick={() => window.location.hash = ''}
          >
            {t.bookshelf}
          </button>
          <button
            className={`tab-btn ${view === 'thinking' ? 'active' : ''}`}
            onClick={() => window.location.hash = 'thinking'}
          >
            {t.thinking}
          </button>
        </nav>
        <div className="header-actions">
          {view === 'home' && (
            <button className="add-btn" onClick={() => setShowAddModal(true)}>
              {t.addBook}
            </button>
          )}
          {user ? (
            <button className="auth-btn" onClick={logout}>
              {t.logout}
            </button>
          ) : (
            <button className="auth-btn" onClick={() => setShowLoginModal(true)}>
              {t.login}
            </button>
          )}
        </div>
      </header>

      {showLoginModal && (
        <LoginModal onClose={() => setShowLoginModal(false)} />
      )}

      {renderContent()}
    </div>
  )
}

export default App
