import { useState, useEffect, useRef } from 'react'
import { Routes, Route, useNavigate, useLocation, useParams, Outlet } from 'react-router-dom'
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
import PhysicalBooksDashboard from './components/PhysicalBooksDashboard'
import UserProfile from './components/UserProfile'
import GlobalSearch from './components/GlobalSearch'
import { useI18n } from './i18n'
import { useAuth } from './auth'
import type { Book, BlogPost } from './types'

// Book Detail Page Component
function BookDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetch(`/api/books/${id}`)
        .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch'))
        .then(data => setBook(data))
        .catch(() => navigate('/'))
        .finally(() => setLoading(false))
    }
  }, [id, navigate])

  if (loading) return <div className="app"><div className="loading">Loading...</div></div>
  if (!book) return null

  return (
    <div className="app">
      <BookDetail
        book={book}
        onBack={() => navigate('/')}
        onPostCreated={() => {
          fetch(`/api/books/${id}`)
            .then(res => res.json())
            .then(data => setBook(data))
        }}
        onPostClick={(post: BlogPost) => navigate(`/book/${book.id}/post/${post.id}`)}
      />
    </div>
  )
}

// Post Detail Page Component
function PostDetailPage() {
  const { id, postId } = useParams<{ id: string; postId: string }>()
  const navigate = useNavigate()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (postId) {
      fetch(`/api/posts/${postId}`)
        .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch'))
        .then(data => setPost(data))
        .catch(() => navigate('/'))
        .finally(() => setLoading(false))
    }
  }, [postId, navigate])

  if (loading) return <div className="app"><div className="loading">Loading...</div></div>
  if (!post) return null

  return (
    <div className="app">
      <PostDetail
        post={post}
        onBack={() => navigate(`/book/${id}`)}
      />
    </div>
  )
}

// Main Layout Component with Navigation
function MainLayout() {
  const { t } = useI18n()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const moreMenuRef = useRef<HTMLDivElement>(null)

  const currentPath = location.pathname

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

  // Global keyboard shortcut for search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Handle search navigation
  const handleSearchNavigate = (type: string, id: number) => {
    switch (type) {
      case 'book':
        navigate(`/book/${id}`)
        break
      case 'ebook':
        navigate('/ebooks')
        break
      case 'magazine':
        navigate('/magazines')
        break
      case 'note':
        navigate('/thinking')
        break
      case 'audio':
        navigate('/audio')
        break
      case 'lecture':
        navigate('/lectures')
        break
      case 'speech':
        navigate('/speeches')
        break
      case 'movie':
        navigate('/movies')
        break
      case 'tvshow':
        navigate('/tvshows')
        break
      case 'documentary':
        navigate('/documentaries')
        break
      case 'animation':
        navigate('/animation')
        break
      case 'nba':
        navigate('/nba')
        break
      default:
        navigate('/')
    }
  }

  // Helper to get email prefix
  const getEmailPrefix = (email: string) => email.split('@')[0]

  // Check if current view is in the "more" menu
  const morePaths = ['/nba', '/audio', '/lectures', '/speeches', '/movies', '/tvshows', '/documentaries', '/animation']
  const isMoreActive = morePaths.includes(currentPath)

  return (
    <div className="app">
      <header>
        <div className="logo-link" onClick={() => navigate('/')}>
          <img src="/logo.jpeg" alt="BookLibrio" className="header-logo" />
        </div>
        <nav className="tab-nav">
          <button
            className={`tab-btn ${currentPath === '/ebooks' ? 'active' : ''}`}
            onClick={() => navigate('/ebooks')}
          >
            {t.ebooks}
          </button>
          <button
            className={`tab-btn ${currentPath === '/magazines' ? 'active' : ''}`}
            onClick={() => navigate('/magazines')}
          >
            {t.magazines}
          </button>
          <button
            className={`tab-btn ${currentPath === '/books' ? 'active' : ''}`}
            onClick={() => navigate('/books')}
          >
            {t.physicalBooks}
          </button>
          <button
            className={`tab-btn ${currentPath === '/' ? 'active' : ''}`}
            onClick={() => navigate('/')}
          >
            {t.bookshelf}
          </button>
          <button
            className={`tab-btn ${currentPath === '/thinking' ? 'active' : ''}`}
            onClick={() => navigate('/thinking')}
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
                <button onClick={() => { navigate('/nba'); setShowMoreMenu(false); }}>
                  NBA
                </button>
                <button onClick={() => { navigate('/audio'); setShowMoreMenu(false); }}>
                  {t.audio}
                </button>
                <button onClick={() => { navigate('/lectures'); setShowMoreMenu(false); }}>
                  {t.lectures}
                </button>
                <button onClick={() => { navigate('/speeches'); setShowMoreMenu(false); }}>
                  {t.speeches}
                </button>
                <button onClick={() => { navigate('/movies'); setShowMoreMenu(false); }}>
                  {t.movies}
                </button>
                <button onClick={() => { navigate('/tvshows'); setShowMoreMenu(false); }}>
                  {t.tvshows}
                </button>
                <button onClick={() => { navigate('/documentaries'); setShowMoreMenu(false); }}>
                  {t.documentaries}
                </button>
                <button onClick={() => { navigate('/animation'); setShowMoreMenu(false); }}>
                  {t.animation}
                </button>
              </div>
            )}
          </div>
        </nav>
        <div className="header-actions">
          <button
            className="search-btn"
            onClick={() => setShowSearch(true)}
            title={t.search || 'Search (Cmd+K)'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </button>
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
                  <button onClick={() => { navigate('/profile'); setShowUserMenu(false); }}>
                    {t.profile}
                  </button>
                  {user.is_admin && (
                    <button onClick={() => { navigate('/admin'); setShowUserMenu(false); }}>
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

      <GlobalSearch
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onNavigate={handleSearchNavigate}
      />

      <Outlet />
    </div>
  )
}

// Physical Books Page with navigation
function PhysicalBooksPage() {
  const navigate = useNavigate()
  return <PhysicalBooksDashboard onBookClick={(book: Book) => navigate(`/book/${book.id}`)} />
}

// Admin page with auth check
function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user && !user.is_admin) {
      navigate('/')
    }
  }, [user, navigate])

  if (!user?.is_admin) return null
  return <AdminDashboard />
}

function App() {
  return (
    <Routes>
      <Route path="/book/:id/post/:postId" element={<PostDetailPage />} />
      <Route path="/book/:id" element={<BookDetailPage />} />
      <Route element={<MainLayout />}>
        <Route path="/" element={<BookshelfDashboard />} />
        <Route path="/magazines" element={<MagazinesDashboard />} />
        <Route path="/ebooks" element={<EbooksDashboard />} />
        <Route path="/books" element={<PhysicalBooksPage />} />
        <Route path="/thinking" element={<ThinkingDashboard />} />
        <Route path="/nba" element={<NBADashboard />} />
        <Route path="/audio" element={<AudioDashboard />} />
        <Route path="/lectures" element={<LecturesDashboard />} />
        <Route path="/speeches" element={<SpeechesDashboard />} />
        <Route path="/movies" element={<MoviesDashboard />} />
        <Route path="/tvshows" element={<TVShowsDashboard />} />
        <Route path="/documentaries" element={<DocumentariesDashboard />} />
        <Route path="/animation" element={<AnimationDashboard />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>
    </Routes>
  )
}

export default App
