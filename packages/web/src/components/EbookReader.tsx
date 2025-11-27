import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../auth'
import type { Ebook } from '../types'

interface Props {
  ebook: Ebook
  onBack: () => void
  initialPage?: number
}

export default function EbookReader({ ebook, onBack, initialPage = 1 }: Props) {
  const { token, user } = useAuth()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const readerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Build PDF URL with page parameter
  const pdfUrl = `/api/ebooks/${ebook.id}/file#page=${currentPage}`

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Save reading history when closing
  const handleBack = async () => {
    if (user && token) {
      try {
        await fetch('/api/reading-history', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            item_type: 'ebook',
            item_id: ebook.id,
            title: ebook.title,
            cover_url: ebook.cover_url,
            last_page: currentPage
          })
        })
      } catch (error) {
        console.error('Failed to save reading history:', error)
      }
    }
    onBack()
  }

  const toggleFullscreen = async () => {
    if (!readerRef.current) return

    if (!document.fullscreenElement) {
      await readerRef.current.requestFullscreen()
    } else {
      await document.exitFullscreen()
    }
  }

  return (
    <div className={`magazine-reader ${isFullscreen ? 'fullscreen' : ''}`} ref={readerRef}>
      <header className="reader-header">
        <button className="back-btn" onClick={handleBack}>Back</button>
        <h1 className="reader-title">{ebook.title}</h1>
        <button className="fullscreen-btn" onClick={toggleFullscreen}>
          {isFullscreen ? '⛶' : '⛶'}
        </button>
      </header>

      <div className="reader-content">
        <div className="pdf-panel full-width">
          <iframe
            ref={iframeRef}
            src={pdfUrl}
            title="PDF Viewer"
            className="pdf-iframe"
          />
        </div>
      </div>
    </div>
  )
}
