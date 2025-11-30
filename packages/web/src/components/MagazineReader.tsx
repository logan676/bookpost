import { useState, useRef, useEffect, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { useAuth } from '../auth'
import { useI18n } from '../i18n'
import { annotationService } from '../services/annotationService'
import type { Magazine, MagazineUnderline, MagazineIdea } from '../types'

// Configure PDF.js worker using local import
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

interface Props {
  magazine: Magazine
  onBack: () => void
  initialPage?: number
}

interface BubbleState {
  visible: boolean
  x: number
  y: number
  type: 'confirm' | 'idea' | 'existing'
  selectedText?: string
  pageNumber?: number
  startOffset?: number
  endOffset?: number
  underlineId?: number
}

interface IdeaPopupState {
  visible: boolean
  underlineId: number | null
  ideas: MagazineIdea[]
  x: number
  y: number
}

interface MeaningPopupState {
  visible: boolean
  x: number
  y: number
  text: string
  meaning: string
  loading: boolean
}


export default function MagazineReader({ magazine, onBack, initialPage = 1 }: Props) {
  const { token, user } = useAuth()
  const { locale } = useI18n()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState(1.5)
  const [loading, setLoading] = useState(true)

  // Underline state
  const [underlines, setUnderlines] = useState<MagazineUnderline[]>([])
  const [bubble, setBubble] = useState<BubbleState>({ visible: false, x: 0, y: 0, type: 'confirm' })
  const [ideaText, setIdeaText] = useState('')
  const [ideaPopup, setIdeaPopup] = useState<IdeaPopupState>({ visible: false, underlineId: null, ideas: [], x: 0, y: 0 })
  const [newIdeaText, setNewIdeaText] = useState('')
  const [meaningPopup, setMeaningPopup] = useState<MeaningPopupState>({
    visible: false, x: 0, y: 0, text: '', meaning: '', loading: false
  })

  const readerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textLayerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const ideaPopupRef = useRef<HTMLDivElement>(null)
  const selectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Set token for annotation service
  useEffect(() => {
    annotationService.setToken(token)
  }, [token])

  // Load PDF document
  useEffect(() => {
    let cancelled = false

    const loadPdf = async () => {
      try {
        setLoading(true)
        console.log('[MagazineReader] Loading PDF for magazine:', magazine.id)
        const pdfUrl = `/api/magazines/${magazine.id}/pdf`
        const loadingTask = pdfjsLib.getDocument(pdfUrl)
        const pdf = await loadingTask.promise

        if (cancelled) return

        console.log('[MagazineReader] PDF loaded, pages:', pdf.numPages)
        pdfDocRef.current = pdf
        setTotalPages(pdf.numPages)

        // Load underlines
        if (token) {
          try {
            const existingUnderlines = await annotationService.fetchUnderlines<MagazineUnderline>(
              'magazine',
              magazine.id
            )
            setUnderlines(existingUnderlines)
          } catch (err) {
            console.error('Failed to load underlines:', err)
          }
        }

        console.log('[MagazineReader] Setting loading to false')
        setLoading(false)
      } catch (error) {
        console.error('[MagazineReader] Failed to load PDF:', error)
        setLoading(false)
      }
    }

    loadPdf()

    return () => {
      cancelled = true
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy()
        pdfDocRef.current = null
      }
    }
  }, [magazine.id, token])

  // Render current page
  useEffect(() => {
    // Skip if still loading - refs won't be available yet
    if (loading) return
    if (!pdfDocRef.current || !canvasRef.current || !textLayerRef.current) {
      console.log('[MagazineReader] Waiting for refs...')
      return
    }

    let cancelled = false

    const renderPage = async () => {
      const pdf = pdfDocRef.current!
      const canvas = canvasRef.current!
      const textLayer = textLayerRef.current!

      try {
        console.log('[MagazineReader] Getting page:', currentPage)
        const page = await pdf.getPage(currentPage)

        if (cancelled) return

        const viewport = page.getViewport({ scale })
        console.log('[MagazineReader] Rendering page, viewport:', viewport.width, viewport.height)
        const context = canvas.getContext('2d')!

        canvas.height = viewport.height
        canvas.width = viewport.width

        // Match text layer size
        textLayer.style.width = `${viewport.width}px`
        textLayer.style.height = `${viewport.height}px`

        // Render page
        const renderContext = {
          canvasContext: context,
          viewport
        }
        await page.render(renderContext).promise

        if (cancelled) return

        // Clear and render text layer
        textLayer.innerHTML = ''

        const textContent = await page.getTextContent()

        // Build text layer with proper positioning
        const textItems = textContent.items as any[]
        let pageText = ''
        let currentOffset = 0

        textItems.forEach((item) => {
          if (item.str) {
            const tx = pdfjsLib.Util.transform(viewport.transform, item.transform)
            const span = document.createElement('span')

            span.textContent = item.str
            span.style.position = 'absolute'
            span.style.left = `${tx[4]}px`
            span.style.top = `${tx[5] - item.height}px`
            span.style.fontSize = `${Math.abs(item.transform[0]) * scale}px`
            span.style.fontFamily = item.fontName || 'sans-serif'
            span.style.transformOrigin = '0% 0%'
            span.style.whiteSpace = 'pre'
            span.style.color = 'transparent'
            span.style.cursor = 'text'
            span.dataset.offset = String(currentOffset)
            span.dataset.length = String(item.str.length)

            textLayer.appendChild(span)
            pageText += item.str
            currentOffset += item.str.length
          }
        })

        // Apply underlines for current page
        applyUnderlinesToTextLayer()

      } catch (error) {
        console.error('Failed to render page:', error)
      }
    }

    renderPage()

    return () => {
      cancelled = true
    }
  }, [currentPage, scale, underlines, loading])

  // Apply underlines to text layer
  const applyUnderlinesToTextLayer = useCallback(() => {
    const textLayer = textLayerRef.current
    if (!textLayer) return

    // Get underlines for current page
    const pageUnderlines = underlines.filter(u => u.page_number === currentPage)

    // Find and highlight underlined spans
    const spans = textLayer.querySelectorAll('span')

    spans.forEach(span => {
      const offset = parseInt(span.dataset.offset || '0')
      const length = parseInt(span.dataset.length || '0')

      // Check if this span overlaps with any underline
      for (const ul of pageUnderlines) {
        if (offset + length > ul.start_offset && offset < ul.end_offset) {
          span.classList.add('underlined-text')
          span.dataset.underlineId = String(ul.id)
          span.style.backgroundColor = 'rgba(251, 191, 36, 0.35)'
          span.style.color = 'transparent'
          span.style.cursor = 'pointer'

          // Add click handler for existing underline
          span.addEventListener('click', (e) => {
            e.stopPropagation()
            handleUnderlineClick(ul, e as MouseEvent)
          })
          break
        }
      }
    })
  }, [underlines, currentPage])

  // Handle click on existing underline
  const handleUnderlineClick = (underline: MagazineUnderline, e: MouseEvent) => {
    if (!user || !token) return

    const containerRect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 }
    const bubbleX = e.clientX - containerRect.left
    const bubbleY = e.clientY - containerRect.top - 10

    setBubble({
      visible: true,
      x: bubbleX,
      y: bubbleY,
      type: 'existing',
      selectedText: underline.text,
      pageNumber: underline.page_number,
      startOffset: underline.start_offset,
      endOffset: underline.end_offset,
      underlineId: underline.id
    })
  }

  // Handle text selection - using document-level listener to avoid timing issues
  const handleTextSelection = useCallback(() => {
    if (!user || !token) {
      console.log('[MagazineReader] No user/token, skipping selection')
      return
    }

    const selection = window.getSelection()
    const selectedText = selection?.toString().trim()

    console.log('[MagazineReader] Selection:', selectedText)

    if (!selectedText || selectedText.length === 0) return

    // Get selection range
    const range = selection?.getRangeAt(0)
    if (!range) return

    // Check if selection is within our text layer
    const textLayer = textLayerRef.current
    if (!textLayer) return

    const startContainer = range.startContainer
    if (!textLayer.contains(startContainer)) {
      console.log('[MagazineReader] Selection not in text layer')
      return
    }

    // Calculate offsets from span data attributes
    const startSpan = range.startContainer.parentElement
    const endSpan = range.endContainer.parentElement

    if (!startSpan?.dataset.offset || !endSpan?.dataset.offset) {
      console.log('[MagazineReader] No offset data on spans')
      return
    }

    const startOffset = parseInt(startSpan.dataset.offset) + range.startOffset
    const endSpanOffset = parseInt(endSpan.dataset.offset)
    const endOffset = endSpanOffset + range.endOffset

    // Get position for bubble
    const rect = range.getBoundingClientRect()
    const containerRect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 }

    const bubbleX = rect.left + rect.width / 2 - containerRect.left
    const bubbleY = rect.top - containerRect.top - 10

    console.log('[MagazineReader] Showing bubble at', bubbleX, bubbleY)

    setBubble({
      visible: true,
      x: bubbleX,
      y: bubbleY,
      type: 'confirm',
      selectedText,
      pageNumber: currentPage,
      startOffset,
      endOffset
    })
  }, [user, token, currentPage])

  useEffect(() => {
    const handleMouseUp = () => {
      // Clear any pending timeout
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current)
      }

      // Debounce to ensure selection is complete
      selectionTimeoutRef.current = setTimeout(() => {
        handleTextSelection()
      }, 300)
    }

    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('touchend', handleMouseUp)

    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchend', handleMouseUp)
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current)
      }
    }
  }, [handleTextSelection])

  // Close bubble when clicking outside
  useEffect(() => {
    if (!bubble.visible) return

    const handleClickOutside = (event: MouseEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(event.target as Node)) {
        closeBubble()
      }
    }

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [bubble.visible])

  // Close idea popup when clicking outside
  useEffect(() => {
    if (!ideaPopup.visible) return

    const handleClickOutside = (event: MouseEvent) => {
      if (ideaPopupRef.current && !ideaPopupRef.current.contains(event.target as Node)) {
        closeIdeaPopup()
      }
    }

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [ideaPopup.visible])

  // Bubble functions
  const closeBubble = () => {
    setBubble({ visible: false, x: 0, y: 0, type: 'confirm' })
    setIdeaText('')
    // Clear selection
    window.getSelection()?.removeAllRanges()
  }

  const closeIdeaPopup = () => {
    setIdeaPopup({ visible: false, underlineId: null, ideas: [], x: 0, y: 0 })
    setNewIdeaText('')
  }

  const closeMeaningPopup = () => {
    setMeaningPopup({ visible: false, x: 0, y: 0, text: '', meaning: '', loading: false })
  }

  // Create underline
  const handleConfirmUnderline = async () => {
    if (!bubble.selectedText || bubble.pageNumber === undefined ||
        bubble.startOffset === undefined || bubble.endOffset === undefined || !token) return

    try {
      const newUnderline = await annotationService.createMagazineUnderline(magazine.id, {
        text: bubble.selectedText,
        page_number: bubble.pageNumber,
        start_offset: bubble.startOffset,
        end_offset: bubble.endOffset
      })

      const underlineWithCount = { ...newUnderline, idea_count: 0 }
      setUnderlines(prev => [...prev, underlineWithCount])

      // Show idea input
      setBubble(prev => ({
        ...prev,
        type: 'idea',
        underlineId: newUnderline.id
      }))
      setIdeaText('')
    } catch (err) {
      console.error('Failed to create underline:', err)
      closeBubble()
    }
  }

  // Save idea
  const handleSaveIdea = async () => {
    if (!bubble.underlineId || !ideaText.trim() || !token) {
      closeBubble()
      return
    }

    try {
      await annotationService.createIdea('magazine', bubble.underlineId, ideaText.trim())
      setUnderlines(prev =>
        prev.map(u => u.id === bubble.underlineId ? { ...u, idea_count: u.idea_count + 1 } : u)
      )
      setIdeaText('')
    } catch (err) {
      console.error('Failed to save idea:', err)
    }

    closeBubble()
  }

  const handleSkipIdea = () => {
    closeBubble()
  }

  // Get meaning
  const handleGetMeaning = async () => {
    if (!bubble.selectedText || !token) return

    setMeaningPopup({
      visible: true,
      x: bubble.x,
      y: bubble.y + 60,
      text: bubble.selectedText,
      meaning: '',
      loading: true
    })
    closeBubble()

    try {
      const data = await annotationService.getMeaning({
        text: bubble.selectedText,
        paragraph: bubble.selectedText,
        targetLanguage: locale === 'zh' ? 'en' : 'zh'
      })
      setMeaningPopup(prev => ({
        ...prev,
        meaning: data.meaning,
        loading: false
      }))
    } catch (err) {
      console.error('Failed to get meaning:', err)
      setMeaningPopup(prev => ({
        ...prev,
        meaning: 'Error getting meaning',
        loading: false
      }))
    }
  }

  // View ideas
  const handleViewIdeas = async () => {
    if (!bubble.underlineId || !token) return

    try {
      const ideas = await annotationService.fetchIdeas('magazine', bubble.underlineId)
      setIdeaPopup({
        visible: true,
        underlineId: bubble.underlineId,
        ideas,
        x: bubble.x,
        y: bubble.y + 60
      })
      closeBubble()
    } catch (err) {
      console.error('Failed to fetch ideas:', err)
    }
  }

  // Add idea from popup
  const handleAddIdeaFromPopup = async () => {
    if (!ideaPopup.underlineId || !newIdeaText.trim() || !token) return

    try {
      const newIdea = await annotationService.createIdea('magazine', ideaPopup.underlineId, newIdeaText.trim())
      setIdeaPopup(prev => ({
        ...prev,
        ideas: [newIdea, ...prev.ideas]
      }))
      setUnderlines(prev =>
        prev.map(u => u.id === ideaPopup.underlineId ? { ...u, idea_count: u.idea_count + 1 } : u)
      )
      setNewIdeaText('')
    } catch (err) {
      console.error('Failed to add idea:', err)
    }
  }

  // Delete idea
  const handleDeleteIdea = async (ideaId: number) => {
    if (!token) return

    try {
      await annotationService.deleteIdea('magazine', ideaId)
      setIdeaPopup(prev => ({
        ...prev,
        ideas: prev.ideas.filter(i => i.id !== ideaId)
      }))
      if (ideaPopup.underlineId) {
        setUnderlines(prev =>
          prev.map(u => u.id === ideaPopup.underlineId ? { ...u, idea_count: Math.max(0, u.idea_count - 1) } : u)
        )
      }
    } catch (err) {
      console.error('Failed to delete idea:', err)
    }
  }

  // Show idea input
  const handleShowIdeaInput = () => {
    setBubble(prev => ({ ...prev, type: 'idea' }))
    setIdeaText('')
  }

  // Delete underline
  const handleDeleteUnderline = async () => {
    if (!bubble.underlineId || !token) return

    try {
      await annotationService.deleteUnderline('magazine', bubble.underlineId)
      setUnderlines(prev => prev.filter(u => u.id !== bubble.underlineId))
    } catch (err) {
      console.error('Failed to delete underline:', err)
    }

    closeBubble()
  }

  // Delete underline from idea popup
  const handleDeleteUnderlineFromPopup = async () => {
    if (!ideaPopup.underlineId || !token) return

    try {
      await annotationService.deleteUnderline('magazine', ideaPopup.underlineId)
      setUnderlines(prev => prev.filter(u => u.id !== ideaPopup.underlineId))
      closeIdeaPopup()
    } catch (err) {
      console.error('Failed to delete underline:', err)
    }
  }

  // Navigation
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const nextPage = () => goToPage(currentPage + 1)
  const prevPage = () => goToPage(currentPage - 1)

  // Fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const toggleFullscreen = async () => {
    if (!readerRef.current) return

    if (!document.fullscreenElement) {
      await readerRef.current.requestFullscreen()
    } else {
      await document.exitFullscreen()
    }
  }

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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        prevPage()
      } else if (e.key === 'ArrowRight') {
        nextPage()
      } else if (e.key === 'Escape') {
        if (bubble.visible) closeBubble()
        else if (ideaPopup.visible) closeIdeaPopup()
        else if (meaningPopup.visible) closeMeaningPopup()
        else if (isFullscreen) document.exitFullscreen()
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen()
      } else if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        setScale(prev => Math.min(prev + 0.25, 3))
      } else if ((e.metaKey || e.ctrlKey) && e.key === '-') {
        e.preventDefault()
        setScale(prev => Math.max(prev - 0.25, 0.5))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentPage, totalPages, isFullscreen, bubble.visible, ideaPopup.visible, meaningPopup.visible])

  return (
    <div className={`magazine-reader ${isFullscreen ? 'fullscreen' : ''}`} ref={readerRef}>
      <header className="reader-header">
        <button className="back-btn" onClick={handleBack}>Back</button>
        <h1 className="reader-title">{magazine.title}</h1>
        <div className="reader-controls">
          <button onClick={() => setScale(prev => Math.max(prev - 0.25, 0.5))}>-</button>
          <span>{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(prev => Math.min(prev + 0.25, 3))}>+</button>
          <button className="fullscreen-btn" onClick={toggleFullscreen}>
            {isFullscreen ? 'Exit' : 'Full'}
          </button>
        </div>
      </header>

      <div className="reader-main">
        <div className="reader-content" ref={containerRef}>
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Loading magazine...</p>
            </div>
          ) : (
            <div className="pdf-container">
              <div className="pdf-page" style={{ position: 'relative' }}>
                <canvas ref={canvasRef} />
                <div
                  ref={textLayerRef}
                  className="text-layer"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    overflow: 'hidden',
                    opacity: 1,
                    lineHeight: 1
                  }}
                />
              </div>
            </div>
          )}

        {/* Underline bubble */}
        {bubble.visible && (
          <div
            ref={bubbleRef}
            className="underline-bubble"
            style={{
              position: 'absolute',
              left: `${bubble.x}px`,
              top: `${bubble.y}px`,
              transform: 'translateX(-50%) translateY(-100%)',
              zIndex: 1000
            }}
          >
            {bubble.type === 'confirm' ? (
              <div className="bubble-confirm">
                <button className="bubble-btn confirm" onClick={handleConfirmUnderline}>
                  Underline
                </button>
                <button className="bubble-btn meaning" onClick={handleGetMeaning}>
                  Meaning
                </button>
              </div>
            ) : bubble.type === 'existing' ? (
              <div className="bubble-confirm">
                {(() => {
                  const currentUnderline = underlines.find(u => u.id === bubble.underlineId)
                  const ideaCount = currentUnderline?.idea_count || 0
                  return ideaCount > 0 ? (
                    <button className="bubble-btn view-ideas" onClick={handleViewIdeas}>
                      Ideas ({ideaCount})
                    </button>
                  ) : null
                })()}
                <button className="bubble-btn confirm" onClick={handleShowIdeaInput}>
                  Add Idea
                </button>
                <button className="bubble-btn meaning" onClick={handleGetMeaning}>
                  Meaning
                </button>
                <button className="bubble-btn delete" onClick={handleDeleteUnderline}>
                  Delete
                </button>
              </div>
            ) : (
              <div className="bubble-idea">
                <input
                  type="text"
                  placeholder="Add your idea..."
                  value={ideaText}
                  onChange={e => setIdeaText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveIdea()
                    if (e.key === 'Escape') handleSkipIdea()
                  }}
                  autoFocus
                />
                <div className="bubble-actions">
                  <button className="bubble-btn save" onClick={handleSaveIdea}>
                    Save
                  </button>
                  <button className="bubble-btn skip" onClick={handleSkipIdea}>
                    Skip
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Meaning popup */}
        {meaningPopup.visible && (
          <div
            className="meaning-popup"
            style={{
              position: 'absolute',
              left: `${meaningPopup.x}px`,
              top: `${meaningPopup.y}px`,
              transform: 'translateX(-50%)',
              zIndex: 1000
            }}
          >
            <div className="meaning-popup-header">
              <span>Meaning</span>
              <button className="popup-close-btn" onClick={closeMeaningPopup}>Close</button>
            </div>
            <div className="meaning-popup-text">
              "{meaningPopup.text}"
            </div>
            <div className="meaning-popup-content">
              {meaningPopup.loading ? (
                <div className="meaning-loading">
                  <span className="loading-spinner"></span>
                  <span>Analyzing...</span>
                </div>
              ) : (
                <div
                  className="meaning-result"
                  dangerouslySetInnerHTML={{
                    __html: annotationService.formatMeaningToHtml(meaningPopup.meaning)
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Ideas popup */}
        {ideaPopup.visible && (
          <div
            ref={ideaPopupRef}
            className="ideas-popup"
            style={{
              position: 'absolute',
              left: `${ideaPopup.x}px`,
              top: `${ideaPopup.y}px`,
              transform: 'translateX(-50%)',
              zIndex: 1000
            }}
          >
            <div className="ideas-popup-header">
              <span>Ideas ({ideaPopup.ideas.length})</span>
              <button className="popup-close-btn" onClick={closeIdeaPopup}>Close</button>
            </div>

            <div className="ideas-popup-content">
              <div className="idea-popup-input">
                <input
                  type="text"
                  placeholder="Add new idea..."
                  value={newIdeaText}
                  onChange={e => setNewIdeaText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddIdeaFromPopup()
                  }}
                />
                <button onClick={handleAddIdeaFromPopup} disabled={!newIdeaText.trim()}>
                  Add
                </button>
              </div>

              <div className="idea-popup-list">
                {ideaPopup.ideas.length === 0 ? (
                  <div className="no-ideas">No ideas yet</div>
                ) : (
                  ideaPopup.ideas.map(idea => (
                    <div key={idea.id} className="idea-item">
                      <div className="idea-content">{idea.content}</div>
                      <div className="idea-actions">
                        <span className="idea-date">
                          {new Date(idea.created_at).toLocaleDateString()}
                        </span>
                        <button
                          className="delete-idea-btn"
                          onClick={() => handleDeleteIdea(idea.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="idea-popup-footer">
                <button
                  className="remove-underline-btn"
                  onClick={handleDeleteUnderlineFromPopup}
                >
                  Remove Underline
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      <footer className="reader-footer">
        <span className="page-info">{currentPage} / {totalPages}</span>
        <input
          type="range"
          min="1"
          max={totalPages || 1}
          value={currentPage}
          onChange={(e) => goToPage(Number(e.target.value))}
          className="page-slider"
        />
      </footer>
    </div>
  )
}
