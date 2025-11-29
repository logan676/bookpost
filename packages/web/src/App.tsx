import { useState, useEffect, useCallback, useRef } from 'react'
import BookDetail from './components/BookDetail'
import PostDetail from './components/PostDetail'
import LoginModal from './components/LoginModal'
import MagazinesDashboard from './components/MagazinesDashboard'
import EbooksDashboard from './components/EbooksDashboard'
import ThinkingDashboard from './components/ThinkingDashboard'
import BookshelfDashboard from './components/BookshelfDashboard'
import AdminDashboard from './components/AdminDashboard'
import NBADashboard from './components/NBADashboard'
import AudioDashboard from './components/AudioDashboard'
import LecturesDashboard from './components/LecturesDashboard'
import SpeechesDashboard from './components/SpeechesDashboard'
import MoviesDashboard from './components/MoviesDashboard'
import TVShowsDashboard from './components/TVShowsDashboard'
import DocumentariesDashboard from './components/DocumentariesDashboard'
import AnimationDashboard from './components/AnimationDashboard'
import UserProfile from './components/UserProfile'
import { useI18n } from './i18n'
import { useAuth } from './auth'
import type { Book, BlogPost } from './types'

type View = 'home' | 'detail' | 'post' | 'magazines' | 'ebooks' | 'thinking' | 'admin' | 'nba' | 'audio' | 'lectures' | 'speeches' | 'movies' | 'tvshows' | 'documentaries' | 'animation' | 'profile'

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

  if (hash === 'admin') {
    return { view: 'admin' }
  }

  if (hash === 'nba') {
    return { view: 'nba' }
  }

  if (hash === 'audio') {
    return { view: 'audio' }
  }

  if (hash === 'lectures') {
    return { view: 'lectures' }
  }

  if (hash === 'speeches') {
    return { view: 'speeches' }
  }

  if (hash === 'movies') {
    return { view: 'movies' }
  }

  if (hash === 'tvshows') {
    return { view: 'tvshows' }
  }

  if (hash === 'documentaries') {
    return { view: 'documentaries' }
  }

  if (hash === 'animation') {
    return { view: 'animation' }
  }

  if (hash === 'profile') {
    return { view: 'profile' }
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
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const moreMenuRef = useRef<HTMLDivElement>(null)

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
    } else if (newView === 'admin') {
      setView('admin')
      setSelectedBook(null)
      setSelectedPost(null)
    } else if (newView === 'nba') {
      setView('nba')
      setSelectedBook(null)
      setSelectedPost(null)
    } else if (newView === 'audio') {
      setView('audio')
      setSelectedBook(null)
      setSelectedPost(null)
    } else if (newView === 'lectures') {
      setView('lectures')
      setSelectedBook(null)
      setSelectedPost(null)
    } else if (newView === 'speeches') {
      setView('speeches')
      setSelectedBook(null)
      setSelectedPost(null)
    } else if (newView === 'movies') {
      setView('movies')
      setSelectedBook(null)
      setSelectedPost(null)
    } else if (newView === 'tvshows') {
      setView('tvshows')
      setSelectedBook(null)
      setSelectedPost(null)
    } else if (newView === 'documentaries') {
      setView('documentaries')
      setSelectedBook(null)
      setSelectedPost(null)
    } else if (newView === 'animation') {
      setView('animation')
      setSelectedBook(null)
      setSelectedPost(null)
    } else if (newView === 'profile') {
      setView('profile')
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
    if (view === 'nba') {
      return <NBADashboard />
    }
    if (view === 'audio') {
      return <AudioDashboard />
    }
    if (view === 'lectures') {
      return <LecturesDashboard />
    }
    if (view === 'speeches') {
      return <SpeechesDashboard />
    }
    if (view === 'movies') {
      return <MoviesDashboard />
    }
    if (view === 'tvshows') {
      return <TVShowsDashboard />
    }
    if (view === 'documentaries') {
      return <DocumentariesDashboard />
    }
    if (view === 'animation') {
      return <AnimationDashboard />
    }
    if (view === 'profile') {
      return <UserProfile />
    }
    if (view === 'admin' && user?.is_admin) {
      return <AdminDashboard />
    }

    // Home / Bookshelf view
    return (
      <BookshelfDashboard
        books={books}
        onBookClick={handleBookClick}
        onBookAdded={handleBookAdded}
      />
    )
  }

  // Helper to get email prefix
  const getEmailPrefix = (email: string) => {
    return email.split('@')[0]
  }

  // Check if current view is in the "more" menu
  const moreViews = ['nba', 'audio', 'lectures', 'speeches', 'movies', 'tvshows', 'documentaries', 'animation']
  const isMoreActive = moreViews.includes(view)

  return (
    <div className="app">
      <header>
        <h1 className="logo-link" onClick={() => window.location.hash = ''}>{t.appTitle}</h1>
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
          <div className="more-menu-container" ref={moreMenuRef}>
            <button
              className={`tab-btn ${isMoreActive ? 'active' : ''}`}
              onClick={() => setShowMoreMenu(!showMoreMenu)}
            >
              {t.more || 'More'} ▾
            </button>
            {showMoreMenu && (
              <div className="more-menu-dropdown">
                <button onClick={() => { window.location.hash = 'nba'; setShowMoreMenu(false); }}>
                  NBA
                </button>
                <button onClick={() => { window.location.hash = 'audio'; setShowMoreMenu(false); }}>
                  {t.audio}
                </button>
                <button onClick={() => { window.location.hash = 'lectures'; setShowMoreMenu(false); }}>
                  {t.lectures}
                </button>
                <button onClick={() => { window.location.hash = 'speeches'; setShowMoreMenu(false); }}>
                  {t.speeches}
                </button>
                <button onClick={() => { window.location.hash = 'movies'; setShowMoreMenu(false); }}>
                  {t.movies}
                </button>
                <button onClick={() => { window.location.hash = 'tvshows'; setShowMoreMenu(false); }}>
                  {t.tvshows}
                </button>
                <button onClick={() => { window.location.hash = 'documentaries'; setShowMoreMenu(false); }}>
                  {t.documentaries}
                </button>
                <button onClick={() => { window.location.hash = 'animation'; setShowMoreMenu(false); }}>
                  {t.animation}
                </button>
              </div>
            )}
          </div>
        </nav>
        <div className="header-actions">
          {user ? (
            <div className="user-menu-container" ref={userMenuRef}>
              <button
                className="user-menu-btn"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                {getEmailPrefix(user.email)}
              </button>
              {showUserMenu && (
                <div className="user-menu-dropdown">
                  <button onClick={() => { window.location.hash = 'profile'; setShowUserMenu(false); }}>
                    {t.profile}
                  </button>
                  {user.is_admin && (
                    <button onClick={() => { window.location.hash = 'admin'; setShowUserMenu(false); }}>
                      Admin
                    </button>
                  )}
                  <button onClick={() => { logout(); setShowUserMenu(false); }}>
                    {t.logout}
                  </button>
                </div>
              )}
            </div>
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
