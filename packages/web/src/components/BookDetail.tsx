import { useState } from 'react'
import PhotoUpload from './PhotoUpload'
import type { Book, BlogPost } from '../types'

interface BookDetailProps {
  book: Book
  onBack: () => void
  onPostCreated: () => void
  onPostClick: (post: BlogPost) => void
}

function BookDetail({ book, onBack, onPostCreated, onPostClick }: BookDetailProps) {
  const [showScanPage, setShowScanPage] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')

  const coverImage = book.cover_photo_url || book.cover_url

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleScanPage = async () => {
    if (!selectedFile) return

    setScanning(true)
    setError('')

    const formData = new FormData()
    formData.append('photo', selectedFile)

    try {
      const response = await fetch(`/api/books/${book.id}/scan-page`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to scan page')
      }

      setShowScanPage(false)
      setSelectedFile(null)
      setPreview('')
      onPostCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      setScanning(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="book-detail">
      <button className="back-btn" onClick={onBack}>
        ← Back to collection
      </button>

      <div className="book-detail-header">
        <div className="book-detail-cover">
          {coverImage ? (
            <img src={coverImage} alt={book.title} />
          ) : (
            <div className="book-cover placeholder" style={{ height: '300px' }}>+</div>
          )}
        </div>

        <div className="book-detail-info">
          <h1>{book.title}</h1>
          <p className="author">by {book.author}</p>

          <div className="book-meta-details">
            {book.publisher && (
              <div className="meta-item">
                <span className="meta-label">Publisher</span>
                <span className="meta-value">{book.publisher}</span>
              </div>
            )}
            {book.publish_year && (
              <div className="meta-item">
                <span className="meta-label">Published</span>
                <span className="meta-value">{book.publish_year}</span>
              </div>
            )}
            {book.page_count && (
              <div className="meta-item">
                <span className="meta-label">Pages</span>
                <span className="meta-value">{book.page_count}</span>
              </div>
            )}
            {book.language && (
              <div className="meta-item">
                <span className="meta-label">Language</span>
                <span className="meta-value">{book.language.toUpperCase()}</span>
              </div>
            )}
            {book.isbn && (
              <div className="meta-item">
                <span className="meta-label">ISBN</span>
                <span className="meta-value">{book.isbn}</span>
              </div>
            )}
            {book.categories && (
              <div className="meta-item">
                <span className="meta-label">Categories</span>
                <span className="meta-value">{book.categories}</span>
              </div>
            )}
          </div>

          {book.description && (
            <div className="book-description">
              <h3>Description</h3>
              <p>{book.description}</p>
            </div>
          )}
        </div>
      </div>

      <div className="posts-section">
        <div className="posts-header">
          <h2>Reading Pages</h2>
          <button className="add-btn" onClick={() => setShowScanPage(true)}>
            + Scan Page
          </button>
        </div>

        {book.posts && book.posts.length > 0 ? (
          book.posts.map((post: BlogPost) => (
            <div key={post.id} className="post-card" onClick={() => onPostClick(post)}>
              <h3>{post.title}</h3>
              <p>{post.content.substring(0, 150)}...</p>
              <div className="post-date">{formatDate(post.created_at)}</div>
            </div>
          ))
        ) : (
          <div className="empty-state" style={{ padding: '3rem' }}>
            <p>No reading pages yet. Scan a page to create your first one.</p>
          </div>
        )}
      </div>

      {showScanPage && (
        <div className="modal-overlay" onClick={() => setShowScanPage(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{scanning ? 'Scanning...' : 'Scan Reading Page'}</h2>
              <button className="close-btn" onClick={() => setShowScanPage(false)}>×</button>
            </div>

            <div className="modal-body">
              {scanning ? (
                <div className="scanning">
                  <div className="scanning-spinner" />
                  <p>Extracting text from page...</p>
                </div>
              ) : (
                <>
                  <PhotoUpload
                    onFileSelect={handleFileSelect}
                    preview={preview}
                    onRemove={() => { setSelectedFile(null); setPreview(''); }}
                  />
                  {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}
                  <div className="form-actions">
                    <button
                      className="btn btn-primary"
                      onClick={handleScanPage}
                      disabled={!selectedFile}
                    >
                      Extract & Create Note
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BookDetail
