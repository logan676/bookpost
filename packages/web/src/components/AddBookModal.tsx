import { useState } from 'react'
import PhotoUpload from './PhotoUpload'
import type { ScanResult } from '../types'

interface AddBookModalProps {
  onClose: () => void
  onBookAdded: () => void
}

type Step = 'upload' | 'scanning' | 'confirm'

function AddBookModal({ onClose, onBookAdded }: AddBookModalProps) {
  const [step, setStep] = useState<Step>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    publisher: '',
    publish_year: '',
    description: ''
  })
  const [error, setError] = useState<string>('')

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    setPreview(URL.createObjectURL(file))
    setError('')
  }

  const handleRemovePhoto = () => {
    setSelectedFile(null)
    setPreview('')
  }

  const handleScan = async () => {
    if (!selectedFile) return

    setStep('scanning')
    setError('')

    const formDataToSend = new FormData()
    formDataToSend.append('photo', selectedFile)

    try {
      const response = await fetch('/api/books/scan', {
        method: 'POST',
        body: formDataToSend
      })

      if (!response.ok) {
        throw new Error('Failed to scan book')
      }

      const result: ScanResult = await response.json()

      // Auto-submit the book without showing form
      const bookData = {
        title: result.title || 'Unknown Title',
        author: result.author || 'Unknown Author',
        isbn: result.isbn || '',
        publisher: result.publisher || '',
        publish_year: result.publish_year || null,
        description: result.description || '',
        page_count: result.page_count || null,
        categories: result.categories || '',
        language: result.language || '',
        cover_photo_url: result.cover_photo_url,
        cover_url: result.cover_url
      }

      const token = localStorage.getItem('token')
      const addResponse = await fetch('/api/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(bookData)
      })

      if (!addResponse.ok) {
        throw new Error('Failed to add book')
      }

      onBookAdded()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed')
      setStep('upload')
    }
  }

  const handleSubmit = async () => {
    if (!formData.title || !formData.author) {
      setError('Title and author are required')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({
          ...formData,
          publish_year: formData.publish_year ? parseInt(formData.publish_year) : null,
          cover_photo_url: scanResult?.cover_photo_url,
          cover_url: scanResult?.cover_url
        })
      })

      if (!response.ok) {
        throw new Error('Failed to add book')
      }

      onBookAdded()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add book')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {step === 'upload' && 'Add Book'}
            {step === 'scanning' && 'Scanning...'}
            {step === 'confirm' && 'Confirm Details'}
          </h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {step === 'upload' && (
            <>
              <PhotoUpload
                onFileSelect={handleFileSelect}
                preview={preview}
                onRemove={handleRemovePhoto}
              />
              {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}
              <div className="form-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleScan}
                  disabled={!selectedFile}
                >
                  Scan Book Cover
                </button>
              </div>
            </>
          )}

          {step === 'scanning' && (
            <div className="scanning">
              <div className="scanning-spinner" />
              <p>Analyzing book cover...</p>
            </div>
          )}

          {step === 'confirm' && (
            <>
              {scanResult?.cover_photo_url && (
                <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                  <img
                    src={scanResult.cover_photo_url}
                    alt="Book cover"
                    style={{ maxHeight: '150px', borderRadius: '4px' }}
                  />
                </div>
              )}

              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Author *</label>
                <input
                  type="text"
                  name="author"
                  value={formData.author}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>ISBN</label>
                <input
                  type="text"
                  name="isbn"
                  value={formData.isbn}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>Publisher</label>
                <input
                  type="text"
                  name="publisher"
                  value={formData.publisher}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>Year</label>
                <input
                  type="text"
                  name="publish_year"
                  value={formData.publish_year}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>

              {error && <p style={{ color: 'red' }}>{error}</p>}

              <div className="form-actions">
                <button className="btn btn-secondary" onClick={() => setStep('upload')}>
                  Back
                </button>
                <button className="btn btn-primary" onClick={handleSubmit}>
                  Add to Collection
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default AddBookModal
