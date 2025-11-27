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
type FontFamily = 'crimson-pro' | 'eb-garamond' | 'libre-baskerville' | 'spectral' | 'cormorant' | 'playfair' | 'bitter'

const fontFamilies: Record<FontFamily, string> = {
  'crimson-pro': '"Crimson Pro", Georgia, serif',
  'eb-garamond': '"EB Garamond", Garamond, serif',
  'libre-baskerville': '"Libre Baskerville", Baskerville, serif',
  'spectral': 'Spectral, Georgia, serif',
  'cormorant': '"Cormorant Garamond", Garamond, serif',
  'playfair': '"Playfair Display", Georgia, serif',
  'bitter': 'Bitter, Georgia, serif'
}

export default function EpubReader({ ebook, onBack, initialCfi }: Props) {
  const { token, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentLocation, setCurrentLocation] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [atStart, setAtStart] = useState(false)
  const [atEnd, setAtEnd] = useState(false)
  const [progress, setProgress] = useState(0)
  const [toc, setToc] = useState<TocItem[]>([])
  const [showToc, setShowToc] = useState(false)
  const [currentChapter, setCurrentChapter] = useState('')
  const [fontSizePx, setFontSizePx] = useState(20)
  const [fontFamily, setFontFamily] = useState<FontFamily>('crimson-pro')
  const [theme, setTheme] = useState<Theme>('light')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)

  const viewerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<Book | null>(null)
  const renditionRef = useRef<Rendition | null>(null)

  // Theme configurations
  const themes = {
    light: {
      body: { background: '#ffffff', color: '#1a1a1a', 'line-height': '1.8', padding: '20px 40px' },
      '*': { color: '#1a1a1a !important' },
      'p': { 'line-height': '1.8', 'margin-bottom': '1em' }
    },
    sepia: {
      body: { background: '#f4ecd8', color: '#5b4636', 'line-height': '1.8', padding: '20px 40px' },
      '*': { color: '#5b4636 !important' },
      'p': { 'line-height': '1.8', 'margin-bottom': '1em' }
    },
    dark: {
      body: { background: '#1a1a2e', color: '#e0e0e0', 'line-height': '1.8', padding: '20px 40px' },
      '*': { color: '#e0e0e0 !important' },
      'p': { 'line-height': '1.8', 'margin-bottom': '1em' }
    }
  }

  // Initialize epub.js
  useEffect(() => {
    if (!viewerRef.current) return

    let cancelled = false

    const initBook = async () => {
      try {
        setLoading(true)
        setError(null)
        console.log('EpubReader: Starting to load ebook', ebook.id)

        // Clean up previous instance
        if (renditionRef.current) {
          renditionRef.current.destroy()
          renditionRef.current = null
        }
        if (bookRef.current) {
          bookRef.current.destroy()
          bookRef.current = null
        }

        // Clear the viewer element
        if (viewerRef.current) {
          viewerRef.current.innerHTML = ''
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

        // Check if cancelled during fetch
        if (cancelled) return

        // Create new book instance from ArrayBuffer
        const book = ePub(arrayBuffer)
        bookRef.current = book

        // Wait for book to be ready
        console.log('EpubReader: Waiting for book.ready...')
        await book.ready
        console.log('EpubReader: Book is ready!')

        if (cancelled) return

        // Get table of contents
        const navigation = await book.loaded.navigation
        const tocItems = flattenToc(navigation.toc)
        setToc(tocItems)

        if (cancelled || !viewerRef.current) return

        // Create rendition with two-page spread
        // Wait a frame for the container to have proper dimensions
        await new Promise(resolve => requestAnimationFrame(resolve))

        if (cancelled || !viewerRef.current) return

        const viewerEl = viewerRef.current
        const viewerWidth = viewerEl.clientWidth || 800
        const viewerHeight = viewerEl.clientHeight || 600
        console.log('Viewer dimensions:', viewerWidth, viewerHeight)

        const rendition = book.renderTo(viewerEl, {
          width: viewerWidth,
          height: viewerHeight,
          spread: 'always',
          flow: 'paginated',
          allowScriptedContent: true
        })
        renditionRef.current = rendition

        // Register themes
        rendition.themes.register('light', themes.light)
        rendition.themes.register('sepia', themes.sepia)
        rendition.themes.register('dark', themes.dark)
        rendition.themes.select(theme)

        // Set initial font family
        rendition.themes.font(fontFamilies[fontFamily])

        // Inject initial font size CSS
        rendition.hooks.content.register((contents: any) => {
          const style = contents.document.createElement('style')
          style.id = 'custom-font-size'
          style.textContent = `
            body, p, div, span, li, td, th { font-size: ${fontSizePx}px !important; line-height: 1.8 !important; }
            h1 { font-size: ${fontSizePx + 12}px !important; }
            h2 { font-size: ${fontSizePx + 8}px !important; }
            h3 { font-size: ${fontSizePx + 4}px !important; }
            h4, h5, h6 { font-size: ${fontSizePx + 2}px !important; }
          `
          contents.document.head.appendChild(style)
        })

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

          // Update start/end status from epub.js location data
          setAtStart(location.atStart === true)
          setAtEnd(location.atEnd === true)

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
      cancelled = true
      if (renditionRef.current) {
        renditionRef.current.destroy()
        renditionRef.current = null
      }
      if (bookRef.current) {
        bookRef.current.destroy()
        bookRef.current = null
      }
      if (viewerRef.current) {
        viewerRef.current.innerHTML = ''
      }
    }
  }, [ebook.id])

  // Update theme
  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.select(theme)
    }
  }, [theme])

  // Update font size via CSS injection
  useEffect(() => {
    if (renditionRef.current) {
      // Apply font size using override styles
      renditionRef.current.themes.override('font-size', `${fontSizePx}px`)

      // Also inject CSS for all text elements
      renditionRef.current.getContents().forEach((contents: any) => {
        if (contents && contents.document) {
          const style = contents.document.createElement('style')
          style.id = 'custom-font-size'
          // Remove existing custom style if present
          const existing = contents.document.getElementById('custom-font-size')
          if (existing) existing.remove()

          style.textContent = `
            body, p, div, span, li, td, th { font-size: ${fontSizePx}px !important; line-height: 1.8 !important; }
            h1 { font-size: ${fontSizePx + 12}px !important; }
            h2 { font-size: ${fontSizePx + 8}px !important; }
            h3 { font-size: ${fontSizePx + 4}px !important; }
            h4, h5, h6 { font-size: ${fontSizePx + 2}px !important; }
          `
          contents.document.head.appendChild(style)
        }
      })
    }
  }, [fontSizePx])

  // Update font family
  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.font(fontFamilies[fontFamily])
    }
  }, [fontFamily])

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
  const nextPage = useCallback(async () => {
    const rendition = renditionRef.current
    console.log('nextPage called, rendition:', !!rendition, 'manager:', !!rendition?.manager)
    if (rendition) {
      console.log('currentLocation:', rendition.currentLocation())
      try {
        await rendition.next()
        console.log('after next, currentLocation:', rendition.currentLocation())
      } catch (err) {
        console.error('next() error:', err)
      }
    }
  }, [])

  const prevPage = useCallback(async () => {
    console.log('prevPage called, rendition:', !!renditionRef.current)
    if (renditionRef.current && renditionRef.current.manager) {
      try {
        await renditionRef.current.prev()
      } catch (err) {
        console.error('prev() error:', err)
      }
    }
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

  // Auto-hide controls after inactivity
  useEffect(() => {
    let hideTimeout: ReturnType<typeof setTimeout>

    const showControlsTemporarily = () => {
      setShowControls(true)
      clearTimeout(hideTimeout)
      hideTimeout = setTimeout(() => {
        setShowControls(false)
      }, 3000) // Hide after 3 seconds
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
  }, [])

  // Resize handler - auto fill container on resize/fullscreen
  useEffect(() => {
    const handleResize = () => {
      if (renditionRef.current && viewerRef.current) {
        const viewerEl = viewerRef.current
        const newWidth = viewerEl.clientWidth
        const newHeight = viewerEl.clientHeight
        console.log('Resizing to:', newWidth, newHeight)

        // Resize the rendition
        renditionRef.current.resize(newWidth, newHeight)

        // Force a re-display at current location to apply new size
        const currentLoc = renditionRef.current.currentLocation()
        if (currentLoc && currentLoc.start) {
          renditionRef.current.display(currentLoc.start.cfi)
        }
      }
    }

    // Debounce resize
    let resizeTimeout: ReturnType<typeof setTimeout>
    const debouncedResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(handleResize, 150)
    }

    // Fullscreen needs longer delay for layout to settle
    const handleFullscreenResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(handleResize, 400)
    }

    window.addEventListener('resize', debouncedResize)
    document.addEventListener('fullscreenchange', handleFullscreenResize)

    return () => {
      window.removeEventListener('resize', debouncedResize)
      document.removeEventListener('fullscreenchange', handleFullscreenResize)
      clearTimeout(resizeTimeout)
    }
  }, [])

  // Font size controls
  const increaseFontSize = () => setFontSizePx(prev => Math.min(prev + 1, 30))
  const decreaseFontSize = () => setFontSizePx(prev => Math.max(prev - 1, 15))

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + for increase font size
      if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        setFontSizePx(prev => Math.min(prev + 1, 30))
      }
      // Cmd/Ctrl - for decrease font size
      else if ((e.metaKey || e.ctrlKey) && e.key === '-') {
        e.preventDefault()
        setFontSizePx(prev => Math.max(prev - 1, 15))
      }
      else if (e.key === 'ArrowLeft') {
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
    <div className={`epub-reader ${getThemeClass()} ${isFullscreen ? 'fullscreen' : ''} ${showControls ? 'controls-visible' : ''}`} ref={containerRef}>
      <header className={`epub-header ${showControls ? 'visible' : ''}`}>
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

          <select
            className="font-family-select"
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value as FontFamily)}
            title="Font family"
          >
            <option value="crimson-pro">Crimson Pro</option>
            <option value="eb-garamond">EB Garamond</option>
            <option value="libre-baskerville">Libre Baskerville</option>
            <option value="spectral">Spectral</option>
            <option value="cormorant">Cormorant</option>
            <option value="playfair">Playfair</option>
            <option value="bitter">Bitter</option>
          </select>

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
            disabled={atStart}
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
            disabled={atEnd}
            title="Next page"
          >
            &#8250;
          </button>
        </div>
      </div>

      <footer className={`epub-footer ${showControls ? 'visible' : ''}`}>
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
