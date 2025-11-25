import type { Book } from '../types'

interface BookCardProps {
  book: Book
  onClick: () => void
}

function BookCard({ book, onClick }: BookCardProps) {
  const coverImage = book.cover_photo_url || book.cover_url

  return (
    <div className="book-card" onClick={onClick}>
      {coverImage ? (
        <img
          className="book-cover"
          src={coverImage}
          alt={`Cover of ${book.title}`}
          loading="lazy"
        />
      ) : (
        <div className="book-cover placeholder">
          +
        </div>
      )}
      <div className="book-info">
        <h3 className="book-title">{book.title}</h3>
        <p className="book-author">{book.author}</p>
      </div>
    </div>
  )
}

export default BookCard
