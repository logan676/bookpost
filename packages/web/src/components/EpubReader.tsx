import { useState, useRef, useEffect, useCallback } from 'react'
import ePub, { Book, Rendition, NavItem } from 'epubjs'
import { useAuth } from '../auth'
import { useI18n } from '../i18n'
import type { Ebook, EbookUnderline, EbookIdea } from '../types'

interface Props {
  ebook: Ebook
  onBack: () => void
  initialCfi?: string
}

interface BubbleState {
  visible: boolean
  x: number
  y: number
  type: 'confirm' | 'idea' | 'existing'
  selectedText?: string
  cfiRange?: string
  underlineId?: number
}

interface ImagePopupState {
  visible: boolean
  imageUrl: string
  explanation: string
  loading: boolean
}

interface IdeaPopupState {
  visible: boolean
  underlineId: number | null
  ideas: EbookIdea[]
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
  const { locale } = useI18n()
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

  // Underline state
  const [underlines, setUnderlines] = useState<EbookUnderline[]>([])
  const [bubble, setBubble] = useState<BubbleState>({ visible: false, x: 0, y: 0, type: 'confirm' })
  const [ideaText, setIdeaText] = useState('')
  const [ideaPopup, setIdeaPopup] = useState<IdeaPopupState>({ visible: false, underlineId: null, ideas: [], x: 0, y: 0 })
  const [ideaBadges, setIdeaBadges] = useState<{id: number, x: number, y: number, count: number}[]>([])
  const [newIdeaText, setNewIdeaText] = useState('')
  const [meaningPopup, setMeaningPopup] = useState<MeaningPopupState>({
    visible: false, x: 0, y: 0, text: '', meaning: '', loading: false
  })
  const [imagePopup, setImagePopup] = useState<ImagePopupState>({
    visible: false, imageUrl: '', explanation: '', loading: false
  })

  const viewerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<Book | null>(null)
  const renditionRef = useRef<Rendition | null>(null)
  const selectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ideaPopupRef = useRef<HTMLDivElement>(null)

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

        // Inject initial font size CSS and image click handlers
        rendition.hooks.content.register((contents: any) => {
          const style = contents.document.createElement('style')
          style.id = 'custom-font-size'
          style.textContent = `
            body, p, div, span, li, td, th { font-size: ${fontSizePx}px !important; line-height: 1.8 !important; }
            h1 { font-size: ${fontSizePx + 12}px !important; }
            h2 { font-size: ${fontSizePx + 8}px !important; }
            h3 { font-size: ${fontSizePx + 4}px !important; }
            h4, h5, h6 { font-size: ${fontSizePx + 2}px !important; }
            img { cursor: pointer; transition: all 0.2s; }
            img:hover { opacity: 0.9; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5); }
            .img-tooltip { position: absolute; background: #ffffff; color: #333333; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; white-space: nowrap; pointer-events: none; z-index: 9999; box-shadow: 0 4px 16px rgba(0,0,0,0.15); border: 1px solid #e5e5e5; transform: translate(-50%, -50%); }
          `
          contents.document.head.appendChild(style)

          // Create tooltip element for images
          let tooltip: HTMLElement | null = null

          // Add hover handlers for images to show tooltip
          contents.document.addEventListener('mouseover', (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (target.tagName === 'IMG') {
              if (!tooltip) {
                tooltip = contents.document.createElement('div')
                tooltip.className = 'img-tooltip'
                tooltip.textContent = 'Click to see meaning'
                contents.document.body.appendChild(tooltip)
              }
              const rect = target.getBoundingClientRect()
              // Position tooltip centered on the image
              tooltip.style.left = `${rect.left + rect.width / 2}px`
              tooltip.style.top = `${rect.top + rect.height / 2}px`
              tooltip.style.display = 'block'
            }
          })

          contents.document.addEventListener('mouseout', (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (target.tagName === 'IMG' && tooltip) {
              tooltip.style.display = 'none'
            }
          })

          // Add click handler for images
          contents.document.addEventListener('click', (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (target.tagName === 'IMG') {
              e.preventDefault()
              e.stopPropagation()

              // Hide tooltip when clicked
              if (tooltip) tooltip.style.display = 'none'

              const img = target as HTMLImageElement
              const imageUrl = img.src

              setImagePopup({
                visible: true,
                imageUrl,
                explanation: '',
                loading: true
              })

              // Convert image to base64 for API
              const getBase64FromImage = async (imgElement: HTMLImageElement): Promise<string> => {
                const canvas = document.createElement('canvas')
                canvas.width = imgElement.naturalWidth || imgElement.width
                canvas.height = imgElement.naturalHeight || imgElement.height
                const ctx = canvas.getContext('2d')
                if (ctx) {
                  ctx.drawImage(imgElement, 0, 0)
                  return canvas.toDataURL('image/png')
                }
                return ''
              }

              // Call AI to analyze image
              if (token) {
                getBase64FromImage(img).then(base64Image => {
                  fetch('/api/ai/explain-image', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                      imageUrl: base64Image,
                      targetLanguage: locale === 'zh' ? 'zh' : 'en'
                    })
                  })
                    .then(res => res.ok ? res.json() : Promise.reject('Failed'))
                    .then(data => {
                      setImagePopup(prev => ({
                        ...prev,
                        explanation: data.explanation,
                        loading: false
                      }))
                    })
                    .catch(err => {
                      console.error('Failed to analyze image:', err)
                      setImagePopup(prev => ({
                        ...prev,
                        explanation: 'Failed to analyze image',
                        loading: false
                      }))
                    })
                })
              }
            }
          })
        })

        // Display book
        if (initialCfi) {
          await rendition.display(initialCfi)
        } else {
          await rendition.display()
        }

        // Book is now displayed, hide loading
        setLoading(false)

        // Fetch and display existing underlines
        if (token) {
          try {
            const underlinesRes = await fetch(`/api/ebooks/${ebook.id}/underlines`, {
              headers: { Authorization: `Bearer ${token}` }
            })
            if (underlinesRes.ok) {
              const existingUnderlines = await underlinesRes.json()
              setUnderlines(existingUnderlines)

              // Apply visual underlines for each saved underline with cfi_range
              existingUnderlines.forEach((ul: any) => {
                if (ul.cfi_range) {
                  rendition.annotations.highlight(
                    ul.cfi_range,
                    { underlineId: ul.id, text: ul.text },
                    (e: MouseEvent) => {
                      // Handle click on existing underline
                      const target = e.target as HTMLElement
                      const rect = target.getBoundingClientRect()
                      const iframe = viewerRef.current?.querySelector('iframe')
                      const iframeRect = iframe?.getBoundingClientRect() || { left: 0, top: 0 }
                      const containerRect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 }

                      const bubbleX = rect.left + rect.width / 2 + iframeRect.left - containerRect.left
                      const bubbleY = rect.top + iframeRect.top - containerRect.top - 10

                      setBubble({
                        visible: true,
                        x: bubbleX,
                        y: bubbleY,
                        type: 'existing',
                        selectedText: ul.text,
                        cfiRange: ul.cfi_range,
                        underlineId: ul.id
                      })
                    },
                    'epub-underline',
                    {
                      'background-color': 'transparent',
                      'border-bottom': '2px solid #f59e0b',
                      'padding-bottom': '2px',
                      'cursor': 'pointer'
                    }
                  )
                }
              })
            }
          } catch (err) {
            console.error('Failed to load underlines:', err)
          }
        }

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

          // Update idea badges after page render (delayed to ensure DOM is ready)
          setTimeout(() => {
            updateIdeaBadges()
          }, 100)
        })


        // Keyboard navigation
        rendition.on('keyup', (e: KeyboardEvent) => {
          if (e.key === 'ArrowLeft') {
            rendition.prev()
          } else if (e.key === 'ArrowRight' || e.key === ' ') {
            rendition.next()
          }
        })

        // Text selection handler for underline feature with debounce
        // The 'selected' event fires continuously during selection, so we debounce
        // to only show the bubble after user finishes selecting (300ms delay)
        rendition.on('selected', (cfiRange: string, contents: any) => {
          // Clear any pending timeout
          if (selectionTimeoutRef.current) {
            clearTimeout(selectionTimeoutRef.current)
          }

          // Debounce: wait 300ms after last selection change before showing bubble
          selectionTimeoutRef.current = setTimeout(() => {
            if (!user || !token) return

            const selection = contents.window.getSelection()
            const selectedText = selection?.toString().trim()

            if (!selectedText) return

            // Get the position for the bubble
            const range = selection.getRangeAt(0)
            const rect = range.getBoundingClientRect()

            // Get the iframe position
            const iframe = viewerRef.current?.querySelector('iframe')
            const iframeRect = iframe?.getBoundingClientRect() || { left: 0, top: 0 }
            const containerRect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 }

            const bubbleX = rect.left + rect.width / 2 + iframeRect.left - containerRect.left
            // Position bubble above the selection with 10px gap (translateY(-100%) moves it up by its height)
            const bubbleY = rect.top + iframeRect.top - containerRect.top - 10

            setBubble({
              visible: true,
              x: bubbleX,
              y: bubbleY,
              type: 'confirm',
              selectedText,
              cfiRange
            })
          }, 300) // 300ms debounce delay
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
      // Clear selection timeout
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current)
        selectionTimeoutRef.current = null
      }
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
  const [isHoveringControls, setIsHoveringControls] = useState(false)

  useEffect(() => {
    let hideTimeout: ReturnType<typeof setTimeout>

    const showControlsTemporarily = () => {
      setShowControls(true)
      clearTimeout(hideTimeout)
      if (!isHoveringControls) {
        hideTimeout = setTimeout(() => {
          setShowControls(false)
        }, 1500) // Hide after 1.5 seconds
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

  // Underline functions
  const closeBubble = () => {
    setBubble({ visible: false, x: 0, y: 0, type: 'confirm' })
    setIdeaText('')
  }

  const handleConfirmUnderline = async () => {
    if (!bubble.selectedText || !bubble.cfiRange || !token) return

    try {
      const res = await fetch(`/api/ebooks/${ebook.id}/underlines`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          text: bubble.selectedText,
          cfi_range: bubble.cfiRange,
          chapter_index: 0,
          paragraph_index: 0,
          start_offset: 0,
          end_offset: bubble.selectedText.length
        })
      })

      if (res.ok) {
        const newUnderline = await res.json()
        setUnderlines(prev => [...prev, { ...newUnderline, idea_count: 0, cfi_range: bubble.cfiRange }])

        // Add visual underline using epub.js annotations highlight
        if (renditionRef.current && bubble.cfiRange) {
          const cfiRange = bubble.cfiRange
          const text = bubble.selectedText
          const underlineId = newUnderline.id

          renditionRef.current.annotations.highlight(
            cfiRange,
            { underlineId, text },
            (e: MouseEvent) => {
              // Handle click on underline
              const target = e.target as HTMLElement
              const rect = target.getBoundingClientRect()
              const iframe = viewerRef.current?.querySelector('iframe')
              const iframeRect = iframe?.getBoundingClientRect() || { left: 0, top: 0 }
              const containerRect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 }

              const bubbleX = rect.left + rect.width / 2 + iframeRect.left - containerRect.left
              const bubbleY = rect.top + iframeRect.top - containerRect.top - 10

              setBubble({
                visible: true,
                x: bubbleX,
                y: bubbleY,
                type: 'existing',
                selectedText: text,
                cfiRange: cfiRange,
                underlineId: underlineId
              })
            },
            'epub-underline',
            {
              'background-color': 'transparent',
              'border-bottom': '2px solid #f59e0b',
              'padding-bottom': '2px',
              'cursor': 'pointer'
            }
          )
        }

        // Show idea input
        setBubble(prev => ({
          ...prev,
          type: 'idea',
          underlineId: newUnderline.id
        }))
        setIdeaText('')
      }
    } catch (err) {
      console.error('Failed to create underline:', err)
      closeBubble()
    }
  }

  const handleSaveIdea = async () => {
    if (!bubble.underlineId || !ideaText.trim() || !token) {
      closeBubble()
      return
    }

    try {
      const res = await fetch(`/api/ebook-underlines/${bubble.underlineId}/ideas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: ideaText.trim() })
      })

      if (res.ok) {
        setUnderlines(prev =>
          prev.map(u => u.id === bubble.underlineId ? { ...u, idea_count: u.idea_count + 1 } : u)
        )
        setIdeaText('')
      } else {
        console.error('Failed to save idea:', res.status)
      }
    } catch (err) {
      console.error('Failed to save idea:', err)
    }

    closeBubble()
  }

  const handleSkipIdea = () => {
    closeBubble()
  }

  const handleGetMeaning = async () => {
    if (!bubble.selectedText || !token) return

    // Try to get the full paragraph containing the selected text
    let paragraph = bubble.selectedText
    try {
      const iframe = viewerRef.current?.querySelector('iframe')
      if (iframe && iframe.contentDocument) {
        const selection = iframe.contentDocument.getSelection()
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          // Find the parent paragraph element
          let node: Node | null = range.startContainer
          while (node && node.nodeName !== 'P' && node.nodeName !== 'DIV' && node.parentNode) {
            node = node.parentNode
          }
          if (node && (node as HTMLElement).textContent) {
            paragraph = (node as HTMLElement).textContent?.trim() || bubble.selectedText
          }
        }
      }
    } catch (e) {
      console.error('Failed to get paragraph:', e)
    }

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
      const res = await fetch('/api/ai/meaning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          text: bubble.selectedText,
          paragraph: paragraph,
          targetLanguage: locale === 'zh' ? 'en' : 'zh'
        })
      })

      if (res.ok) {
        const data = await res.json()
        setMeaningPopup(prev => ({
          ...prev,
          meaning: data.meaning,
          loading: false
        }))
      } else {
        setMeaningPopup(prev => ({
          ...prev,
          meaning: 'Failed to get meaning',
          loading: false
        }))
      }
    } catch (err) {
      console.error('Failed to get meaning:', err)
      setMeaningPopup(prev => ({
        ...prev,
        meaning: 'Error getting meaning',
        loading: false
      }))
    }
  }

  const closeMeaningPopup = () => {
    setMeaningPopup({ visible: false, x: 0, y: 0, text: '', meaning: '', loading: false })
  }

  // Update idea badges positions for underlines with ideas
  const updateIdeaBadges = useCallback(() => {
    if (!renditionRef.current || !containerRef.current) return

    const iframe = viewerRef.current?.querySelector('iframe')
    if (!iframe) return

    const iframeDoc = iframe.contentDocument
    if (!iframeDoc) return

    const iframeRect = iframe.getBoundingClientRect()
    const containerRect = containerRef.current.getBoundingClientRect()

    const badges: {id: number, x: number, y: number, count: number}[] = []

    // epub.js creates highlight elements with class 'epubjs-hl'
    // We need to match them with our underlines by looking at their CFI
    underlines.forEach(ul => {
      if (ul.idea_count > 0 && ul.cfi_range) {
        // Try to get the range from epub.js using the CFI
        try {
          const contents = renditionRef.current?.getContents()
          if (contents && contents.length > 0) {
            contents.forEach((content: any) => {
              try {
                const range = content.range(ul.cfi_range)
                if (range) {
                  const rects = range.getClientRects()
                  if (rects.length > 0) {
                    // Get the last rect (end of the highlight)
                    const lastRect = rects[rects.length - 1]
                    const x = lastRect.right + iframeRect.left - containerRect.left
                    // Position at bottom of the underline
                    const y = lastRect.bottom + iframeRect.top - containerRect.top
                    badges.push({ id: ul.id, x, y, count: ul.idea_count })
                  }
                }
              } catch (e) {
                // CFI might not be in current view, ignore
              }
            })
          }
        } catch (e) {
          // Ignore errors for CFIs not in current view
        }
      }
    })

    setIdeaBadges(badges)
  }, [underlines])

  // Update badges when underlines change
  useEffect(() => {
    // Delay to ensure DOM is ready after underlines are loaded and highlights rendered
    const timeoutId = setTimeout(() => {
      updateIdeaBadges()
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [underlines, updateIdeaBadges])

  // Also update badges when loading state changes (book finished loading)
  useEffect(() => {
    if (!loading && underlines.length > 0) {
      const timeoutId = setTimeout(() => {
        updateIdeaBadges()
      }, 300)
      return () => clearTimeout(timeoutId)
    }
  }, [loading, underlines.length, updateIdeaBadges])

  // Switch to idea input mode from existing underline popup
  const handleShowIdeaInput = () => {
    setBubble(prev => ({ ...prev, type: 'idea' }))
    setIdeaText('')
  }

  // View existing ideas for an underline
  const handleViewIdeas = async () => {
    if (!bubble.underlineId || !token) return

    try {
      const res = await fetch(`/api/ebook-underlines/${bubble.underlineId}/ideas`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const ideas = await res.json()
        setIdeaPopup({
          visible: true,
          underlineId: bubble.underlineId,
          ideas,
          x: bubble.x,
          y: bubble.y + 60
        })
        closeBubble()
      }
    } catch (err) {
      console.error('Failed to fetch ideas:', err)
    }
  }

  // Close idea popup
  const closeIdeaPopup = () => {
    setIdeaPopup({ visible: false, underlineId: null, ideas: [], x: 0, y: 0 })
  }

  // Close idea popup when clicking outside
  useEffect(() => {
    if (!ideaPopup.visible) return

    const handleClickOutside = (event: MouseEvent) => {
      if (ideaPopupRef.current && !ideaPopupRef.current.contains(event.target as Node)) {
        closeIdeaPopup()
      }
    }

    // Add listener with a small delay to prevent immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [ideaPopup.visible])

  // Delete an existing underline
  const handleDeleteUnderline = async () => {
    if (!bubble.underlineId || !token) return

    try {
      const res = await fetch(`/api/ebook-underlines/${bubble.underlineId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        // Remove from state
        setUnderlines(prev => prev.filter(u => u.id !== bubble.underlineId))

        // Remove visual annotation
        if (renditionRef.current && bubble.cfiRange) {
          renditionRef.current.annotations.remove(bubble.cfiRange, 'highlight')
        }
      }
    } catch (err) {
      console.error('Failed to delete underline:', err)
    }

    closeBubble()
  }

  // Close image popup
  const closeImagePopup = () => {
    setImagePopup({ visible: false, imageUrl: '', explanation: '', loading: false })
  }

  // Handle image click for AI explanation
  const handleImageClick = async (imageUrl: string, x: number, y: number) => {
    if (!token) return

    setImagePopup({
      visible: true,
      x,
      y,
      imageUrl,
      explanation: '',
      loading: true
    })

    try {
      const res = await fetch('/api/ai/explain-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          imageUrl,
          targetLanguage: locale === 'zh' ? 'zh' : 'en'
        })
      })

      if (res.ok) {
        const data = await res.json()
        setImagePopup(prev => ({
          ...prev,
          explanation: data.explanation,
          loading: false
        }))
      } else {
        setImagePopup(prev => ({
          ...prev,
          explanation: 'Failed to analyze image',
          loading: false
        }))
      }
    } catch (err) {
      console.error('Failed to analyze image:', err)
      setImagePopup(prev => ({
        ...prev,
        explanation: 'Error analyzing image',
        loading: false
      }))
    }
  }

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
      <header
        className={`epub-header ${showControls ? 'visible' : ''}`}
        onMouseEnter={() => setIsHoveringControls(true)}
        onMouseLeave={() => setIsHoveringControls(false)}
      >
        <div className="header-left">
          <button className="toc-btn" onClick={() => setShowToc(!showToc)} title="Table of Contents (T)">
            &#9776;
          </button>
          <button className="back-btn" onClick={handleBack} title="Back">
            Back
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
            className={`nav-btn nav-prev ${showControls ? 'visible' : ''}`}
            onClick={prevPage}
            onMouseEnter={() => setIsHoveringControls(true)}
            onMouseLeave={() => setIsHoveringControls(false)}
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
            className={`nav-btn nav-next ${showControls ? 'visible' : ''}`}
            onClick={nextPage}
            onMouseEnter={() => setIsHoveringControls(true)}
            onMouseLeave={() => setIsHoveringControls(false)}
            disabled={atEnd}
            title="Next page"
          >
            &#8250;
          </button>
        </div>
      </div>

      <footer
        className={`epub-footer ${showControls ? 'visible' : ''}`}
        onMouseEnter={() => setIsHoveringControls(true)}
        onMouseLeave={() => setIsHoveringControls(false)}
      >
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

      {/* Underline bubble */}
      {bubble.visible && (
        <div
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
              <button className="bubble-btn cancel" onClick={closeBubble}>
                &times;
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
              <button className="bubble-btn cancel" onClick={closeBubble}>
                &times;
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

      {/* Idea count badges on underlines */}
      {ideaBadges.map(badge => (
        <div
          key={badge.id}
          className="idea-badge"
          style={{
            position: 'absolute',
            left: `${badge.x}px`,
            top: `${badge.y}px`,
          }}
          title={`${badge.count} idea${badge.count > 1 ? 's' : ''}`}
        >
          {badge.count}
        </div>
      ))}

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
              <div className="meaning-result" dangerouslySetInnerHTML={{
                __html: meaningPopup.meaning
                  // Headers
                  .replace(/^### (.+)$/gm, '<h4>$1</h4>')
                  .replace(/^## (.+)$/gm, '<h3>$1</h3>')
                  .replace(/^# (.+)$/gm, '<h2>$1</h2>')
                  // Bold
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  // Italic
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
                  // Inline code
                  .replace(/`([^`]+)`/g, '<code>$1</code>')
                  // List items
                  .replace(/^- (.+)$/gm, '<li>$1</li>')
                  // Paragraphs (double newlines)
                  .replace(/\n\n/g, '</p><p>')
                  // Single newlines to br
                  .replace(/\n/g, '<br/>')
                  // Wrap in paragraph
                  .replace(/^(.+)$/, '<p>$1</p>')
              }} />
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
            <span>Ideas</span>
            <button className="popup-close-btn" onClick={closeIdeaPopup}>Close</button>
          </div>
          <div className="ideas-popup-content">
            {ideaPopup.ideas.length === 0 ? (
              <div className="no-ideas">No ideas yet</div>
            ) : (
              <ul className="ideas-list">
                {ideaPopup.ideas.map(idea => (
                  <li key={idea.id} className="idea-item">
                    {idea.content}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Image explanation popup - centered toast */}
      {imagePopup.visible && (
        <div className="image-toast-overlay" onClick={closeImagePopup}>
          <div className="image-toast" onClick={(e) => e.stopPropagation()}>
            <div className="image-toast-header">
              <span>Image Analysis</span>
              <button className="popup-close-btn" onClick={closeImagePopup}>Close</button>
            </div>
            <div className="image-toast-preview">
              <img src={imagePopup.imageUrl} alt="Selected" />
            </div>
            <div className="image-toast-content">
              {imagePopup.loading ? (
                <div className="meaning-loading">
                  <span className="loading-spinner"></span>
                  <span>Analyzing image...</span>
                </div>
              ) : (
                <div className="image-analysis-result" dangerouslySetInnerHTML={{
                  __html: imagePopup.explanation
                    // Headers
                    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
                    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
                    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
                    // Bold
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    // Italic
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    // List items (- at start of line)
                    .replace(/^- (.+)$/gm, '<li>$1</li>')
                    // Wrap consecutive <li> in <ul>
                    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
                    // Paragraphs (double newlines)
                    .replace(/\n\n/g, '</p><p>')
                    // Single newlines to space (within paragraphs)
                    .replace(/\n/g, ' ')
                    // Wrap in paragraph
                    .replace(/^(.+)$/s, '<p>$1</p>')
                    // Clean up empty paragraphs
                    .replace(/<p><\/p>/g, '')
                    .replace(/<p>\s*<\/p>/g, '')
                }} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
