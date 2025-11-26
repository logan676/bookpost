import { useState, useEffect, useCallback } from 'react'
import BookCard from './components/BookCard'
import BookDetail from './components/BookDetail'
import PostDetail from './components/PostDetail'
import AddBookModal from './components/AddBookModal'
import type { Book, BlogPost } from './types'

type View = 'home' | 'detail' | 'post'

// Parse URL hash to get current route
function parseHash(): { view: View; bookId?: number; postId?: number } {
  const hash = window.location.hash.slice(1) // Remove #
  if (!hash) return { view: 'home' }

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
  const [view, setView] = useState<View>('home')
  const [books, setBooks] = useState<Book[]>([])
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null)

  // Handle URL hash changes
  const handleHashChange = useCallback(async () => {
    const { view: newView, bookId, postId } = parseHash()

    if (newView === 'home') {
      setView('home')
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
    fetchBooks()
    handleHashChange() // Handle initial URL
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [handleHashChange])

  const fetchBooks = async () => {
    try {
      const response = await fetch('/api/books')
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

  return (
    <div className="app">
      <header>
        <h1>BookPost</h1>
        <button className="add-btn" onClick={() => setShowAddModal(true)}>
          + Add Book
        </button>
      </header>

      {loading && <div className="loading">Loading...</div>}

      {!loading && books.length === 0 && (
        <div className="empty-state">
          <h2>Your collection is empty</h2>
          <p>Take a photo of a book cover to get started</p>
          <button className="add-btn" onClick={() => setShowAddModal(true)}>
            + Add Your First Book
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
    </div>
  )
}

export default App
