import { useState, useRef, useCallback } from 'react'

interface PhotoUploadProps {
  onFileSelect: (file: File) => void
  preview?: string
  onRemove?: () => void
}

function PhotoUpload({ onFileSelect, preview, onRemove }: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      onFileSelect(file)
    }
  }, [onFileSelect])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileSelect(file)
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  if (preview) {
    return (
      <div className="upload-preview">
        <img src={preview} alt="Preview" />
        {onRemove && (
          <button className="remove-btn" onClick={onRemove} type="button">
            ×
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      className={`upload-area ${isDragging ? 'dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <div className="upload-icon">+</div>
      <h3>Take or upload a photo</h3>
      <p>Click to capture or drag and drop</p>
    </div>
  )
}

export default PhotoUpload
