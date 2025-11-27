import { useState, useRef, useEffect, useCallback } from 'react'
import ePub, { Book, Rendition, NavItem } from 'epubjs'
import { useAuth } from '../auth'
import type { Ebook } from '../types'

interface Props {
  ebook: Ebook
  onBack: () => void
  initialCfi?: string
}

interface TocItem {
  id: string
  href: string
  label: string
  subitems?: TocItem[]
}

type Theme = 'light' | 'sepia' | 'dark'

export default function EpubReader({ ebook, onBack, initialCfi }: Props) {
  const { token, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentLocation, setCurrentLocation] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [progress, setProgress] = useState(0)
  const [toc, setToc] = useState<TocItem[]>([])
  const [showToc, setShowToc] = useState(false)
  const [currentChapter, setCurrentChapter] = useState('')
  const [fontSize, setFontSize] = useState(150)
  const [theme, setTheme] = useState<Theme>('light')
  const [isFullscreen, setIsFullscreen] = useState(false)

  const viewerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<Book | null>(null)
  const renditionRef = useRef<Rendition | null>(null)

  // Theme configurations
  const themes = {
    light: {
      body: { background: '#ffffff', color: '#1a1a1a' },
      '*': { color: '#1a1a1a !important' }
    },
    sepia: {
      body: { background: '#f4ecd8', color: '#5b4636' },
      '*': { color: '#5b4636 !important' }
    },
    dark: {
      body: { background: '#1a1a2e', color: '#e0e0e0' },
      '*': { color: '#e0e0e0 !important' }
    }
  }

  // Initialize epub.js
  useEffect(() => {
    if (!viewerRef.current) return

    const initBook = async () => {
      try {
        setLoading(true)
        setError(null)
        console.log('EpubReader: Starting to load ebook', ebook.id)

        // Clean up previous instance
        if (renditionRef.current) {
          renditionRef.current.destroy()
        }
        if (bookRef.current) {
          bookRef.current.destroy()
        }

        // Fetch EPUB as ArrayBuffer first (epub.js needs binary data)
        const url = `/api/ebooks/${ebook.id}/file`
        console.log('EpubReader: Loading from URL', url)

        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Failed to fetch EPUB: ${response.status}`)
        }
        const arrayBuffer = await response.arrayBuffer()
        console.log('EpubReader: EPUB downloaded, size:', arrayBuffer.byteLength)

        // Create new book instance from ArrayBuffer
        const book = ePub(arrayBuffer)
        bookRef.current = book

        // Wait for book to be ready
        console.log('EpubReader: Waiting for book.ready...')
        await book.ready
        console.log('EpubReader: Book is ready!')

        // Get table of contents
        const navigation = await book.loaded.navigation
        const tocItems = flattenToc(navigation.toc)
        setToc(tocItems)

        // Create rendition with two-page spread
        const rendition = book.renderTo(viewerRef.current!, {
          width: '100%',
          height: '100%',
          spread: 'always',
          flow: 'paginated',
          minSpreadWidth: 900
        })
        renditionRef.current = rendition

        // Register themes
        rendition.themes.register('light', themes.light)
        rendition.themes.register('sepia', themes.sepia)
        rendition.themes.register('dark', themes.dark)
        rendition.themes.select(theme)

        // Set initial font size
        rendition.themes.fontSize(`${fontSize}%`)

        // Display book
        if (initialCfi) {
          await rendition.display(initialCfi)
        } else {
          await rendition.display()
        }

        // Book is now displayed, hide loading
        setLoading(false)

        // Generate locations for pagination (do this in background)
        book.locations.generate(1024).then(() => {
          setTotalPages(book.locations.length())
        })

        // Event listeners
        rendition.on('relocated', (location: any) => {
          const currentLoc = location.start.cfi
          setCurrentLocation(currentLoc)

          // Update progress
          if (book.locations.length()) {
            const currentPageNum = book.locations.locationFromCfi(currentLoc)
            setCurrentPage(currentPageNum || 0)
            const progressPercent = ((currentPageNum || 0) / book.locations.length()) * 100
            setProgress(Math.round(progressPercent))
          }

          // Update current chapter
          const chapter = getCurrentChapter(location.start.href)
          if (chapter) {
            setCurrentChapter(chapter)
          }
        })


        // Keyboard navigation
        rendition.on('keyup', (e: KeyboardEvent) => {
          if (e.key === 'ArrowLeft') {
            rendition.prev()
          } else if (e.key === 'ArrowRight' || e.key === ' ') {
            rendition.next()
          }
        })

      } catch (err) {
        console.error('Failed to load EPUB:', err)
        setError(err instanceof Error ? err.message : 'Failed to load ebook')
        setLoading(false)
      }
    }

    initBook()

    return () => {
      if (renditionRef.current) {
        renditionRef.current.destroy()
      }
      if (bookRef.current) {
        bookRef.current.destroy()
      }
    }
  }, [ebook.id])

  // Update theme
  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.select(theme)
    }
  }, [theme])

  // Update font size
  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.fontSize(`${fontSize}%`)
    }
  }, [fontSize])

  // Flatten TOC structure
  const flattenToc = (items: NavItem[], level = 0): TocItem[] => {
    const result: TocItem[] = []
    items.forEach(item => {
      result.push({
        id: item.id,
        href: item.href,
        label: item.label.trim()
      })
      if (item.subitems && item.subitems.length > 0) {
        result.push(...flattenToc(item.subitems, level + 1))
      }
    })
    return result
  }

  // Get current chapter from href
  const getCurrentChapter = (href: string): string => {
    if (!href) return ''
    const match = toc.find(item => href.includes(item.href.split('#')[0]))
    return match?.label || ''
  }

  // Navigation functions
  const nextPage = useCallback(() => {
    renditionRef.current?.next()
  }, [])

  const prevPage = useCallback(() => {
    renditionRef.current?.prev()
  }, [])

  const goToLocation = useCallback((href: string) => {
    renditionRef.current?.display(href)
    setShowToc(false)
  }, [])

  const goToProgress = useCallback((percent: number) => {
    if (bookRef.current && renditionRef.current) {
      const locations = bookRef.current.locations
      if (locations && locations.length()) {
        const cfi = locations.cfiFromPercentage(percent / 100)
        if (cfi) {
          renditionRef.current.display(cfi)
        }
      } else {
        // Locations not generated yet, use spine percentage
        const spine = bookRef.current.spine
        if (spine) {
          const index = Math.floor((percent / 100) * spine.length)
          const item = spine.get(index)
          if (item) {
            renditionRef.current.display(item.href)
          }
        }
      }
    }
  }, [])

  // Fullscreen toggle
  const toggleFullscreen = async () => {
    if (!containerRef.current) return

    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen()
    } else {
      await document.exitFullscreen()
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        prevPage()
      } else if (e.key === 'ArrowRight') {
        nextPage()
      } else if (e.key === 'Escape') {
        if (showToc) setShowToc(false)
        else if (isFullscreen) document.exitFullscreen()
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen()
      } else if (e.key === 't' || e.key === 'T') {
        setShowToc(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nextPage, prevPage, showToc, isFullscreen])

  // Save reading history when closing
  const handleBack = async () => {
    if (user && token && currentLocation) {
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
            last_page: currentPage,
            cfi: currentLocation
          })
        })
      } catch (error) {
        console.error('Failed to save reading history:', error)
      }
    }
    onBack()
  }

  // Font size controls
  const increaseFontSize = () => setFontSize(prev => Math.min(prev + 10, 200))
  const decreaseFontSize = () => setFontSize(prev => Math.max(prev - 10, 50))

  // Get theme class for container
  const getThemeClass = () => {
    switch (theme) {
      case 'sepia': return 'theme-sepia'
      case 'dark': return 'theme-dark'
      default: return 'theme-light'
    }
  }

  if (error) {
    return (
      <div className="epub-reader theme-light" ref={containerRef}>
        <header className="epub-header">
          <button className="back-btn" onClick={handleBack}>Back</button>
          <h1 className="epub-title">{ebook.title}</h1>
        </header>
        <div className="epub-error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className={`epub-reader ${getThemeClass()} ${isFullscreen ? 'fullscreen' : ''}`} ref={containerRef}>
      <header className="epub-header">
        <div className="header-left">
          <button className="back-btn" onClick={handleBack}>Back</button>
          <button className="toc-btn" onClick={() => setShowToc(!showToc)} title="Table of Contents (T)">
            &#9776;
          </button>
        </div>

        <div className="header-center">
          <h1 className="epub-title">{ebook.title}</h1>
          {currentChapter && <span className="current-chapter">{currentChapter}</span>}
        </div>

        <div className="header-right">
          <div className="font-controls">
            <button onClick={decreaseFontSize} title="Decrease font size">A-</button>
            <button onClick={increaseFontSize} title="Increase font size">A+</button>
          </div>

          <div className="theme-controls">
            <button
              className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
              onClick={() => setTheme('light')}
              title="Light theme"
            >
              <span className="theme-icon light"></span>
            </button>
            <button
              className={`theme-btn ${theme === 'sepia' ? 'active' : ''}`}
              onClick={() => setTheme('sepia')}
              title="Sepia theme"
            >
              <span className="theme-icon sepia"></span>
            </button>
            <button
              className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => setTheme('dark')}
              title="Dark theme"
            >
              <span className="theme-icon dark"></span>
            </button>
          </div>

          <button className="fullscreen-btn" onClick={toggleFullscreen} title="Toggle fullscreen (F)">
            {isFullscreen ? '⛶' : '⛶'}
          </button>
        </div>
      </header>

      <div className="epub-container">
        {/* Table of Contents Sidebar */}
        {showToc && (
          <div className="toc-sidebar">
            <div className="toc-header">
              <h2>Table of Contents</h2>
              <button className="close-toc" onClick={() => setShowToc(false)}>&times;</button>
            </div>
            <nav className="toc-nav">
              {toc.map((item, index) => (
                <button
                  key={`${item.id}-${index}`}
                  className={`toc-item ${currentChapter === item.label ? 'active' : ''}`}
                  onClick={() => goToLocation(item.href)}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        )}

        {/* Main Reading Area */}
        <div className="epub-main">
          <button
            className="nav-btn nav-prev"
            onClick={prevPage}
            disabled={currentPage <= 0}
            title="Previous page"
          >
            &#8249;
          </button>

          <div className="epub-viewer-wrapper">
            {loading && (
              <div className="epub-loading">
                <div className="spinner"></div>
                <p>Loading ebook...</p>
              </div>
            )}
            <div ref={viewerRef} className="epub-viewer"></div>
          </div>

          <button
            className="nav-btn nav-next"
            onClick={nextPage}
            disabled={currentPage >= totalPages - 1}
            title="Next page"
          >
            &#8250;
          </button>
        </div>
      </div>

      <footer className="epub-footer">
        <div className="progress-info">
          <span>{progress}%</span>
          <span className="page-info">{currentPage + 1} / {totalPages}</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={(e) => goToProgress(Number(e.target.value))}
          className="progress-slider"
        />
      </footer>
    </div>
  )
}
