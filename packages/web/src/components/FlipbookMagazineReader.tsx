import { useState, useRef, useEffect, useCallback } from 'react'
import { PageFlip } from 'page-flip'
import { useAuth } from '../auth'
import type { Magazine } from '../types'

interface Props {
  magazine: Magazine
  onBack: () => void
  initialPage?: number
}

// Number of pages to preload before showing the flipbook
const PRELOAD_COUNT = 6

export default function FlipbookMagazineReader({ magazine, onBack, initialPage = 1 }: Props) {
  const { token, user } = useAuth()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(magazine.page_count || 0)
  const [loading, setLoading] = useState(true)
  const [pageImages, setPageImages] = useState<string[]>([])
  const [preloadedImages, setPreloadedImages] = useState<Map<string, HTMLImageElement>>(new Map())
  const [imagesReady, setImagesReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showControls, setShowControls] = useState(true)
  const [isHoveringControls, setIsHoveringControls] = useState(false)

  const readerRef = useRef<HTMLDivElement>(null)
  const flipbookRef = useRef<HTMLDivElement>(null)
  const pageFlipRef = useRef<PageFlip | null>(null)
  const currentPageRef = useRef(initialPage)

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

  // Generate page image URLs and preload first pages
  useEffect(() => {
    if (totalPages > 0) {
      const urls = Array.from({ length: totalPages }, (_, i) =>
        `/api/magazines/${magazine.id}/page/${i + 1}/image`
      )
      setPageImages(urls)

      // Preload the first several pages before showing the flipbook
      const preloadPages = async () => {
        const pagesToPreload = Math.min(PRELOAD_COUNT, totalPages)
        const loadPromises: Promise<void>[] = []
        const newPreloaded = new Map<string, HTMLImageElement>()

        for (let i = 0; i < pagesToPreload; i++) {
          const url = urls[i]
          const promise = new Promise<void>((resolve) => {
            const img = new Image()
            img.onload = () => {
              newPreloaded.set(url, img)
              resolve()
            }
            img.onerror = () => {
              resolve() // Continue even if image fails to load
            }
            img.src = url
          })
          loadPromises.push(promise)
        }

        await Promise.all(loadPromises)
        setPreloadedImages(newPreloaded)
        setImagesReady(true)
        setLoading(false)
      }

      preloadPages()
    }
  }, [totalPages, magazine.id])

  // Initialize PageFlip
  useEffect(() => {
    if (!flipbookRef.current || pageImages.length === 0 || loading || !imagesReady) return

    // Destroy existing instance
    if (pageFlipRef.current) {
      pageFlipRef.current.destroy()
    }

    // Calculate initial size based on viewport (80% width, 90% height)
    // PageFlip will auto-stretch to container size
    const viewportWidth = window.innerWidth * 0.8
    const viewportHeight = window.innerHeight * 0.9
    // Magazine aspect ratio is roughly 3:4 (width:height)
    const aspectRatio = 3 / 4
    // Calculate page width (each page is half of the book spread)
    let pageWidth = viewportWidth / 2
    let pageHeight = pageWidth / aspectRatio
    // If height exceeds viewport, recalculate based on height
    if (pageHeight > viewportHeight) {
      pageHeight = viewportHeight
      pageWidth = pageHeight * aspectRatio
    }

    const pageFlip = new PageFlip(flipbookRef.current, {
      width: Math.floor(pageWidth),
      height: Math.floor(pageHeight),
      size: 'stretch',
      minWidth: 300,
      maxWidth: 4000,
      minHeight: 400,
      maxHeight: 4000,
      maxShadowOpacity: 0.5,
      showCover: true,
      mobileScrollSupport: false,
      usePortrait: true,
      startPage: currentPageRef.current - 1,
      drawShadow: true,
      flippingTime: 600,
      useMouseEvents: true,
      swipeDistance: 30,
      showPageCorners: true,
      disableFlipByClick: false
    })

    // Create pages from images, using preloaded images for initial pages
    const pages = pageImages.map((url, index) => {
      const pageDiv = document.createElement('div')
      pageDiv.className = 'flipbook-page'
      pageDiv.dataset.pageNumber = String(index + 1)

      const img = document.createElement('img')

      // Use preloaded image if available (for first pages)
      const preloadedImg = preloadedImages.get(url)
      if (preloadedImg) {
        img.src = preloadedImg.src
      } else {
        img.src = url
        img.loading = 'lazy'
      }

      img.alt = `Page ${index + 1}`
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
      const newPage = e.data + 1
      setCurrentPage(newPage)
      currentPageRef.current = newPage

      // Preload upcoming pages when flipping
      const nextPages = [e.data + 2, e.data + 3, e.data + 4]
      nextPages.forEach(pageNum => {
        if (pageNum < pageImages.length && !preloadedImages.has(pageImages[pageNum])) {
          const img = new Image()
          img.src = pageImages[pageNum]
        }
      })
    })

    pageFlipRef.current = pageFlip

    return () => {
      if (pageFlipRef.current) {
        pageFlipRef.current.destroy()
        pageFlipRef.current = null
      }
    }
  }, [pageImages, loading, imagesReady, preloadedImages])

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
      // Update flipbook size after fullscreen change
      setTimeout(() => {
        if (pageFlipRef.current) {
          pageFlipRef.current.update()
        }
      }, 200)
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

  // Auto-hide controls
  useEffect(() => {
    let hideTimeout: ReturnType<typeof setTimeout>

    const showControlsTemporarily = () => {
      setShowControls(true)
      clearTimeout(hideTimeout)
      if (!isHoveringControls) {
        hideTimeout = setTimeout(() => {
          setShowControls(false)
        }, 3000)
      }
    }

    const handleMouseMove = () => {
      showControlsTemporarily()
    }

    // Show controls initially
    showControlsTemporarily()

    document.addEventListener('mousemove', handleMouseMove)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      clearTimeout(hideTimeout)
    }
  }, [isHoveringControls])

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
    <div className={`flipbook-reader ${isFullscreen ? 'fullscreen' : ''} ${showControls ? 'controls-visible' : ''}`} ref={readerRef}>
      <header
        className={`reader-header ${showControls ? 'visible' : ''}`}
        onMouseEnter={() => setIsHoveringControls(true)}
        onMouseLeave={() => setIsHoveringControls(false)}
      >
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
              className={`nav-btn nav-prev ${showControls ? 'visible' : ''}`}
              onClick={prevPage}
              onMouseEnter={() => setIsHoveringControls(true)}
              onMouseLeave={() => setIsHoveringControls(false)}
              disabled={currentPage <= 1}
              title="Previous page (←)"
            >
              ‹
            </button>

            <div className="flipbook-wrapper">
              <div ref={flipbookRef} className="flipbook"></div>
            </div>

            <button
              className={`nav-btn nav-next ${showControls ? 'visible' : ''}`}
              onClick={nextPage}
              onMouseEnter={() => setIsHoveringControls(true)}
              onMouseLeave={() => setIsHoveringControls(false)}
              disabled={currentPage >= totalPages}
              title="Next page (→)"
            >
              ›
            </button>
          </>
        )}
      </div>

      <footer
        className={`flipbook-footer ${showControls ? 'visible' : ''}`}
        onMouseEnter={() => setIsHoveringControls(true)}
        onMouseLeave={() => setIsHoveringControls(false)}
      >
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
      </footer>
    </div>
  )
}
