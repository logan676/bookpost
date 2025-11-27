import { useState, useRef, useEffect, useCallback } from 'react'
import { PageFlip } from 'page-flip'
import { useAuth } from '../auth'
import type { Magazine } from '../types'

interface Props {
  magazine: Magazine
  onBack: () => void
  initialPage?: number
}

export default function FlipbookMagazineReader({ magazine, onBack, initialPage = 1 }: Props) {
  const { token, user } = useAuth()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(magazine.page_count || 0)
  const [loading, setLoading] = useState(true)
  const [pageImages, setPageImages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const readerRef = useRef<HTMLDivElement>(null)
  const flipbookRef = useRef<HTMLDivElement>(null)
  const pageFlipRef = useRef<PageFlip | null>(null)

  // Fetch page count and initialize
  useEffect(() => {
    const fetchPageCount = async () => {
      try {
        const response = await fetch(`/api/magazines/${magazine.id}/info`)
        if (response.ok) {
          const data = await response.json()
          setTotalPages(data.page_count || magazine.page_count || 0)
        }
      } catch (err) {
        console.error('Failed to fetch page count:', err)
      }
    }

    if (!magazine.page_count) {
      fetchPageCount()
    }
  }, [magazine.id, magazine.page_count])

  // Generate page image URLs
  useEffect(() => {
    if (totalPages > 0) {
      const urls = Array.from({ length: totalPages }, (_, i) =>
        `/api/magazines/${magazine.id}/page/${i + 1}/image`
      )
      setPageImages(urls)
      setLoading(false)
    }
  }, [totalPages, magazine.id])

  // Initialize PageFlip
  useEffect(() => {
    if (!flipbookRef.current || pageImages.length === 0 || loading) return

    // Destroy existing instance
    if (pageFlipRef.current) {
      pageFlipRef.current.destroy()
    }

    const pageFlip = new PageFlip(flipbookRef.current, {
      width: 550,
      height: 733,
      size: 'stretch',
      minWidth: 315,
      maxWidth: 1000,
      minHeight: 420,
      maxHeight: 1350,
      maxShadowOpacity: 0.5,
      showCover: true,
      mobileScrollSupport: false,
      usePortrait: true,
      startPage: initialPage - 1,
      drawShadow: true,
      flippingTime: 800,
      useMouseEvents: true,
      swipeDistance: 30,
      showPageCorners: true,
      disableFlipByClick: false
    })

    // Create pages from images
    const pages = pageImages.map((url, index) => {
      const pageDiv = document.createElement('div')
      pageDiv.className = 'flipbook-page'
      pageDiv.dataset.pageNumber = String(index + 1)

      const img = document.createElement('img')
      img.src = url
      img.alt = `Page ${index + 1}`
      img.loading = index < 4 ? 'eager' : 'lazy'
      img.onerror = () => {
        img.src = '/placeholder-page.png'
        img.alt = 'Page not available'
      }

      const pageNumber = document.createElement('div')
      pageNumber.className = 'page-number'
      pageNumber.textContent = String(index + 1)

      pageDiv.appendChild(img)
      pageDiv.appendChild(pageNumber)
      return pageDiv
    })

    pageFlip.loadFromHTML(pages)

    pageFlip.on('flip', (e) => {
      setCurrentPage(e.data + 1)
    })

    pageFlipRef.current = pageFlip

    return () => {
      if (pageFlipRef.current) {
        pageFlipRef.current.destroy()
        pageFlipRef.current = null
      }
    }
  }, [pageImages, loading, initialPage])

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
      // Resize flipbook after fullscreen change
      setTimeout(() => {
        if (pageFlipRef.current) {
          pageFlipRef.current.updateFromHtml(pageFlipRef.current.getSetting('startPage') || 0)
        }
      }, 100)
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
            item_type: 'magazine',
            item_id: magazine.id,
            title: magazine.title,
            cover_url: magazine.cover_url,
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

  const goToPage = useCallback((page: number) => {
    if (pageFlipRef.current && page >= 1 && page <= totalPages) {
      pageFlipRef.current.flip(page - 1)
    }
  }, [totalPages])

  const nextPage = useCallback(() => {
    if (pageFlipRef.current) {
      pageFlipRef.current.flipNext()
    }
  }, [])

  const prevPage = useCallback(() => {
    if (pageFlipRef.current) {
      pageFlipRef.current.flipPrev()
    }
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        nextPage()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        prevPage()
      } else if (e.key === 'Escape' && isFullscreen) {
        document.exitFullscreen()
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nextPage, prevPage, isFullscreen])

  if (error) {
    return (
      <div className="flipbook-reader" ref={readerRef}>
        <header className="reader-header">
          <button className="back-btn" onClick={handleBack}>Back</button>
          <h1 className="reader-title">{magazine.title}</h1>
        </header>
        <div className="flipbook-error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className={`flipbook-reader ${isFullscreen ? 'fullscreen' : ''}`} ref={readerRef}>
      <header className="reader-header">
        <button className="back-btn" onClick={handleBack}>Back</button>
        <h1 className="reader-title">{magazine.title}</h1>
        <div className="reader-controls">
          <span className="page-indicator">
            {currentPage} / {totalPages}
          </span>
          <button className="fullscreen-btn" onClick={toggleFullscreen} title="Toggle fullscreen (F)">
            {isFullscreen ? '⛶' : '⛶'}
          </button>
        </div>
      </header>

      <div className="flipbook-container">
        {loading ? (
          <div className="flipbook-loading">
            <div className="spinner"></div>
            <p>Loading magazine...</p>
          </div>
        ) : (
          <>
            <button
              className="nav-btn nav-prev"
              onClick={prevPage}
              disabled={currentPage <= 1}
              title="Previous page (←)"
            >
              ‹
            </button>

            <div className="flipbook-wrapper">
              <div ref={flipbookRef} className="flipbook"></div>
            </div>

            <button
              className="nav-btn nav-next"
              onClick={nextPage}
              disabled={currentPage >= totalPages}
              title="Next page (→)"
            >
              ›
            </button>
          </>
        )}
      </div>

      <div className="flipbook-footer">
        <input
          type="range"
          min="1"
          max={totalPages}
          value={currentPage}
          onChange={(e) => goToPage(Number(e.target.value))}
          className="page-slider"
        />
        <div className="page-input-wrapper">
          <span>Go to page:</span>
          <input
            type="number"
            min="1"
            max={totalPages}
            value={currentPage}
            onChange={(e) => goToPage(Number(e.target.value))}
            className="page-input"
          />
        </div>
      </div>
    </div>
  )
}
