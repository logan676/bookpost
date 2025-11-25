import { useState, useEffect } from 'react'
import BookCard from './components/BookCard'
import BookDetail from './components/BookDetail'
import AddBookModal from './components/AddBookModal'
import type { Book } from './types'

type View = 'home' | 'detail'

function App() {
  const [view, setView] = useState<View>('home')
  const [books, setBooks] = useState<Book[]>([])
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    fetchBooks()
  }, [])

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
    fetchBookDetail(book.id)
  }

  const handleBack = () => {
    setView('home')
    setSelectedBook(null)
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

  if (view === 'detail' && selectedBook) {
    return (
      <div className="app">
        <BookDetail
          book={selectedBook}
          onBack={handleBack}
          onPostCreated={handlePostCreated}
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
