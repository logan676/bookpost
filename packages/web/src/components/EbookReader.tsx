import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../auth'
import { useI18n } from '../i18n'
import type { Ebook, EbookUnderline, EbookIdea } from '../types'

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

interface Props {
  ebook: Ebook
  onBack: () => void
  initialPage?: number
}

interface PageContent {
  page: number
  content: string
}

interface Chapter {
  id: string
  title: string
  content: string
  html: string
}

interface EbookText {
  title: string
  author?: string
  format: 'pdf' | 'epub'
  totalPages?: number
  totalChapters?: number
  pages?: PageContent[]
  chapters?: Chapter[]
}

interface BubbleState {
  visible: boolean
  x: number
  y: number
  type: 'confirm' | 'idea'
  selectedText?: string
  paragraph?: string
  chapterIndex?: number
  paragraphIndex?: number
  startOffset?: number
  endOffset?: number
  underlineId?: number
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
  paragraph: string
  meaning: string
  loading: boolean
}

export default function EbookReader({ ebook, onBack, initialPage = 1 }: Props) {
  const { token, user } = useAuth()
  const { locale } = useI18n()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ebookText, setEbookText] = useState<EbookText | null>(null)
  const [fontSize, setFontSize] = useState(18)
  const [downloadProgress, setDownloadProgress] = useState<{
    loaded: number
    total: number | null
    status: string
  }>({ loaded: 0, total: null, status: 'Preparing...' })

  // Underline state
  const [underlines, setUnderlines] = useState<EbookUnderline[]>([])
  const [bubble, setBubble] = useState<BubbleState>({ visible: false, x: 0, y: 0, type: 'confirm' })
  const [ideaText, setIdeaText] = useState('')
  const [ideaPopup, setIdeaPopup] = useState<IdeaPopupState>({ visible: false, underlineId: null, ideas: [], x: 0, y: 0 })
  const [newIdeaText, setNewIdeaText] = useState('')
  const [editingIdeaId, setEditingIdeaId] = useState<number | null>(null)
  const [editingIdeaText, setEditingIdeaText] = useState('')
  const [meaningPopup, setMeaningPopup] = useState<MeaningPopupState>({
    visible: false, x: 0, y: 0, text: '', paragraph: '', meaning: '', loading: false
  })

  // Voice input state
  const [isListening, setIsListening] = useState(false)
  const [isPopupListening, setIsPopupListening] = useState(false)

  // Refs
  const contentRef = useRef<HTMLDivElement>(null)
  const ideaInputRef = useRef<HTMLInputElement>(null)
  const popupIdeaInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const popupRecognitionRef = useRef<SpeechRecognition | null>(null)

  // Check if speech recognition is available
  const isSpeechSupported = typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition)

  // Detect browser/system language for speech recognition
  const getSpeechLanguage = useCallback(() => {
    const browserLang = navigator.language || 'en-US'
    if (browserLang.startsWith('zh')) {
      return 'zh-CN'
    }
    return browserLang
  }, [])

  // Initialize speech recognition for bubble input
  const startListening = useCallback(() => {
    if (!isSpeechSupported) return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = getSpeechLanguage()

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interimTranscript += result[0].transcript
        }
      }

      setIdeaText(prev => {
        if (finalTranscript) {
          return (prev + ' ' + finalTranscript).trim()
        }
        const parts = prev.split('|INTERIM|')
        return parts[0] + (interimTranscript ? '|INTERIM|' + interimTranscript : '')
      })
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
      setIdeaText(prev => prev.replace(/\|INTERIM\|.*/g, '').trim())
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [isSpeechSupported, getSpeechLanguage])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }, [])

  // Initialize speech recognition for popup input
  const startPopupListening = useCallback(() => {
    if (!isSpeechSupported) return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = getSpeechLanguage()

    recognition.onstart = () => {
      setIsPopupListening(true)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interimTranscript += result[0].transcript
        }
      }

      setNewIdeaText(prev => {
        if (finalTranscript) {
          return (prev + ' ' + finalTranscript).trim()
        }
        const parts = prev.split('|INTERIM|')
        return parts[0] + (interimTranscript ? '|INTERIM|' + interimTranscript : '')
      })
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event)
      setIsPopupListening(false)
    }

    recognition.onend = () => {
      setIsPopupListening(false)
      setNewIdeaText(prev => prev.replace(/\|INTERIM\|.*/g, '').trim())
    }

    popupRecognitionRef.current = recognition
    recognition.start()
  }, [isSpeechSupported, getSpeechLanguage])

  const stopPopupListening = useCallback(() => {
    if (popupRecognitionRef.current) {
      popupRecognitionRef.current.stop()
      setIsPopupListening(false)
    }
  }, [])

  useEffect(() => {
    fetchEbookText()
    if (user && token) {
      fetchUnderlines()
    }
  }, [ebook.id, user, token])

  // Auto-start voice input when bubble shows idea input
  useEffect(() => {
    if (bubble.visible && bubble.type === 'idea') {
      if (isSpeechSupported) {
        startListening()
      } else if (ideaInputRef.current) {
        ideaInputRef.current.focus()
      }
    } else {
      stopListening()
    }
  }, [bubble.visible, bubble.type, isSpeechSupported, startListening, stopListening])

  useEffect(() => {
    if (ideaPopup.visible && popupIdeaInputRef.current) {
      popupIdeaInputRef.current.focus()
    }
  }, [ideaPopup.visible])

  const fetchEbookText = async () => {
    try {
      setLoading(true)
      setError(null)
      setDownloadProgress({ loaded: 0, total: null, status: 'Getting ebook info...' })

      // First, get ebook info for file size
      const infoResponse = await fetch(`/api/ebooks/${ebook.id}/info`)
      if (infoResponse.ok) {
        const info = await infoResponse.json()
        if (info.fileSize) {
          setDownloadProgress({ loaded: 0, total: info.fileSize, status: 'Downloading ebook...' })
        }
      }

      setDownloadProgress(prev => ({ ...prev, status: 'Downloading and parsing ebook...' }))

      // Fetch the ebook text with progress tracking
      const response = await fetch(`/api/ebooks/${ebook.id}/text`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error?.message || 'Failed to load ebook')
      }

      // Read response with progress
      const reader = response.body?.getReader()
      const contentLength = response.headers.get('Content-Length')
      const total = contentLength ? parseInt(contentLength, 10) : null

      if (total) {
        setDownloadProgress(prev => ({ ...prev, total }))
      }

      if (reader) {
        const chunks: Uint8Array[] = []
        let receivedLength = 0

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          chunks.push(value)
          receivedLength += value.length

          setDownloadProgress(prev => ({
            ...prev,
            loaded: receivedLength,
            status: prev.total
              ? `Downloading... ${Math.round((receivedLength / prev.total) * 100)}%`
              : `Downloading... ${(receivedLength / 1024).toFixed(0)} KB`
          }))
        }

        // Combine chunks and parse JSON
        const allChunks = new Uint8Array(receivedLength)
        let position = 0
        for (const chunk of chunks) {
          allChunks.set(chunk, position)
          position += chunk.length
        }

        setDownloadProgress(prev => ({ ...prev, status: 'Parsing content...' }))
        const text = new TextDecoder().decode(allChunks)
        const data = JSON.parse(text)
        setEbookText(data)
      } else {
        // Fallback if reader not available
        const data = await response.json()
        setEbookText(data)
      }
    } catch (err) {
      console.error('Failed to load ebook:', err)
      setError(err instanceof Error ? err.message : 'Failed to load ebook')
    } finally {
      setLoading(false)
    }
  }

  const fetchUnderlines = async () => {
    if (!token) return
    try {
      const res = await fetch(`/api/ebooks/${ebook.id}/underlines`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setUnderlines(data)
      }
    } catch (err) {
      console.error('Failed to fetch underlines:', err)
    }
  }

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
            last_page: 1
          })
        })
      } catch (error) {
        console.error('Failed to save reading history:', error)
      }
    }
    onBack()
  }

  const increaseFontSize = () => {
    setFontSize(prev => Math.min(prev + 2, 32))
  }

  const decreaseFontSize = () => {
    setFontSize(prev => Math.max(prev - 2, 12))
  }

  // Handle text selection for underlining (works for both mouse and touch)
  const handleSelectionEnd = (e: React.MouseEvent | React.TouchEvent) => {
    console.log('handleSelectionEnd called')

    // Ignore if clicking on bubble, popup, or meaning popup
    if ((e.target as HTMLElement).closest('.underline-bubble') ||
        (e.target as HTMLElement).closest('.idea-popup') ||
        (e.target as HTMLElement).closest('.meaning-popup')) {
      console.log('Clicked on popup, ignoring')
      return
    }

    const selection = window.getSelection()
    console.log('Selection:', selection?.toString())

    if (!selection || selection.isCollapsed || !contentRef.current) {
      console.log('No selection or collapsed')
      setBubble({ visible: false, x: 0, y: 0, type: 'confirm' })
      return
    }

    const selectedText = selection.toString().trim()
    if (!selectedText) {
      console.log('Empty selected text')
      return
    }

    // Check if user is logged in
    if (!user || !token) {
      console.log('User not logged in, skipping underline')
      return
    }

    console.log('User logged in, selected text:', selectedText)

    const range = selection.getRangeAt(0)
    const startContainer = range.startContainer
    console.log('Start container:', startContainer, 'nodeType:', startContainer.nodeType)

    // Find the paragraph element - handle both text nodes and element nodes
    let paragraphEl: HTMLElement | null = null
    if (startContainer.nodeType === Node.TEXT_NODE) {
      paragraphEl = startContainer.parentElement
    } else if (startContainer.nodeType === Node.ELEMENT_NODE) {
      paragraphEl = startContainer as HTMLElement
    }

    console.log('Initial paragraphEl:', paragraphEl?.tagName)

    // Walk up the tree to find <p> element or ebook-paragraph class
    while (paragraphEl && paragraphEl.tagName !== 'P' && !paragraphEl.classList.contains('ebook-paragraph')) {
      paragraphEl = paragraphEl.parentElement
    }

    console.log('Found paragraphEl:', paragraphEl?.tagName, paragraphEl?.className)

    if (!paragraphEl || !contentRef.current.contains(paragraphEl)) {
      console.log('Paragraph not found for selection')
      return
    }

    // Get chapter and paragraph indices
    const chapterEl = paragraphEl.closest('.ebook-chapter')
    const chapters = contentRef.current.querySelectorAll('.ebook-chapter')
    let chapterIndex = 0
    chapters.forEach((ch, i) => {
      if (ch === chapterEl) {
        chapterIndex = i
      }
    })

    console.log('Chapter index:', chapterIndex, 'chapterEl:', chapterEl)

    // Get paragraph index within the chapter (or globally for PDF)
    const paragraphs = chapterEl
      ? chapterEl.querySelectorAll('p.ebook-paragraph')
      : contentRef.current.querySelectorAll('p.ebook-paragraph')
    let paragraphIndex = -1
    paragraphs.forEach((p, i) => {
      if (p === paragraphEl) {
        paragraphIndex = i
      }
    })

    console.log('Paragraph index:', paragraphIndex, 'total paragraphs:', paragraphs.length)

    if (paragraphIndex === -1) {
      console.log('Paragraph index not found')
      return
    }

    // Get the full paragraph text and normalize
    const paragraphText = paragraphEl.textContent || ''
    const normalizedParagraph = paragraphText.replace(/\s+/g, ' ')
    const normalizedSelected = selectedText.replace(/\s+/g, ' ')

    const normalizedOffset = normalizedParagraph.indexOf(normalizedSelected)
    console.log('Normalized offset:', normalizedOffset)

    if (normalizedOffset === -1) {
      console.log('Selected text not found in paragraph')
      return
    }

    const startOffset = normalizedOffset
    const endOffset = normalizedOffset + normalizedSelected.length

    // Get position for bubble
    const rect = range.getBoundingClientRect()
    const contentRect = contentRef.current.getBoundingClientRect()

    const bubbleX = rect.left + rect.width / 2 - contentRect.left
    const bubbleY = rect.top - contentRect.top - 10

    console.log('Setting bubble at:', bubbleX, bubbleY)

    setBubble({
      visible: true,
      x: bubbleX,
      y: bubbleY,
      type: 'confirm',
      selectedText,
      paragraph: normalizedParagraph,
      chapterIndex,
      paragraphIndex,
      startOffset,
      endOffset
    })
  }

  // Alias for backward compatibility
  const handleMouseUp = handleSelectionEnd

  const handleConfirmUnderline = async () => {
    if (!bubble.selectedText || bubble.paragraphIndex === undefined || !token) return

    try {
      const res = await fetch(`/api/ebooks/${ebook.id}/underlines`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          text: bubble.selectedText,
          paragraph: bubble.paragraph,
          chapter_index: bubble.chapterIndex || 0,
          paragraph_index: bubble.paragraphIndex,
          start_offset: bubble.startOffset,
          end_offset: bubble.endOffset
        })
      })

      if (res.ok) {
        const newUnderline = await res.json()
        setUnderlines(prev => [...prev, { ...newUnderline, idea_count: 0 }])

        // Clear selection
        window.getSelection()?.removeAllRanges()

        // Show idea input bubble
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
    const cleanText = ideaText.replace(/\|INTERIM\|.*/g, '').trim()
    if (!bubble.underlineId || !cleanText || !token) {
      closeBubble()
      return
    }

    try {
      await fetch(`/api/ebook-underlines/${bubble.underlineId}/ideas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: cleanText })
      })

      setUnderlines(prev =>
        prev.map(u => u.id === bubble.underlineId ? { ...u, idea_count: u.idea_count + 1 } : u)
      )
    } catch (err) {
      console.error('Failed to save idea:', err)
    }

    closeBubble()
  }

  const handleSkipIdea = () => {
    closeBubble()
  }

  const closeBubble = () => {
    setBubble({ visible: false, x: 0, y: 0, type: 'confirm' })
    setIdeaText('')
    window.getSelection()?.removeAllRanges()
  }

  // Get meaning using AI
  const handleGetMeaning = async () => {
    if (!bubble.selectedText || !bubble.paragraph || !token) return

    // Show meaning popup with loading state
    setMeaningPopup({
      visible: true,
      x: bubble.x,
      y: bubble.y + 60,
      text: bubble.selectedText,
      paragraph: bubble.paragraph,
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
          paragraph: bubble.paragraph,
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
    setMeaningPopup({ visible: false, x: 0, y: 0, text: '', paragraph: '', meaning: '', loading: false })
  }

  const handleBadgeClick = async (e: React.MouseEvent, underline: EbookUnderline) => {
    e.stopPropagation()

    if (!token) return

    if (ideaPopup.visible) {
      setIdeaPopup({ visible: false, underlineId: null, ideas: [], x: 0, y: 0 })
      return
    }

    try {
      const res = await fetch(`/api/ebook-underlines/${underline.id}/ideas`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const ideas = await res.json()
        const rect = (e.target as HTMLElement).getBoundingClientRect()
        const contentRect = contentRef.current?.getBoundingClientRect()

        if (contentRect) {
          setIdeaPopup({
            visible: true,
            underlineId: underline.id,
            ideas,
            x: rect.left - contentRect.left + rect.width / 2,
            y: rect.bottom - contentRect.top + 5
          })
          setNewIdeaText('')
        }
      }
    } catch (err) {
      console.error('Failed to fetch ideas:', err)
    }
  }

  const handleAddIdeaInPopup = async () => {
    const cleanText = newIdeaText.replace(/\|INTERIM\|.*/g, '').trim()
    if (!ideaPopup.underlineId || !cleanText || !token) return

    try {
      const res = await fetch(`/api/ebook-underlines/${ideaPopup.underlineId}/ideas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: cleanText })
      })

      if (res.ok) {
        const newIdea = await res.json()
        setIdeaPopup(prev => ({
          ...prev,
          ideas: [newIdea, ...prev.ideas]
        }))
        setUnderlines(prev =>
          prev.map(u => u.id === ideaPopup.underlineId ? { ...u, idea_count: u.idea_count + 1 } : u)
        )
        setNewIdeaText('')
      }
    } catch (err) {
      console.error('Failed to add idea:', err)
    }
  }

  const handleDeleteIdea = async (ideaId: number) => {
    if (!token) return
    try {
      const res = await fetch(`/api/ebook-ideas/${ideaId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setIdeaPopup(prev => ({
          ...prev,
          ideas: prev.ideas.filter(i => i.id !== ideaId)
        }))
        setUnderlines(prev =>
          prev.map(u => u.id === ideaPopup.underlineId ? { ...u, idea_count: Math.max(0, u.idea_count - 1) } : u)
        )
      }
    } catch (err) {
      console.error('Failed to delete idea:', err)
    }
  }

  const handleStartEditIdea = (idea: EbookIdea) => {
    setEditingIdeaId(idea.id)
    setEditingIdeaText(idea.content)
  }

  const handleSaveEditIdea = async () => {
    if (!editingIdeaId || !editingIdeaText.trim() || !token) {
      setEditingIdeaId(null)
      return
    }

    try {
      const res = await fetch(`/api/ebook-ideas/${editingIdeaId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: editingIdeaText })
      })

      if (res.ok) {
        const updatedIdea = await res.json()
        setIdeaPopup(prev => ({
          ...prev,
          ideas: prev.ideas.map(i => i.id === editingIdeaId ? updatedIdea : i)
        }))
      }
    } catch (err) {
      console.error('Failed to update idea:', err)
    }

    setEditingIdeaId(null)
    setEditingIdeaText('')
  }

  const handleCancelEditIdea = () => {
    setEditingIdeaId(null)
    setEditingIdeaText('')
  }

  const handleDeleteUnderline = async () => {
    if (!ideaPopup.underlineId || !token) return

    try {
      const res = await fetch(`/api/ebook-underlines/${ideaPopup.underlineId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setUnderlines(prev => prev.filter(u => u.id !== ideaPopup.underlineId))
        setIdeaPopup({ visible: false, underlineId: null, ideas: [], x: 0, y: 0 })
      }
    } catch (err) {
      console.error('Failed to delete underline:', err)
    }
  }

  const closeIdeaPopup = () => {
    setIdeaPopup({ visible: false, underlineId: null, ideas: [], x: 0, y: 0 })
  }

  // Render paragraph with underlines
  const renderParagraphWithUnderlines = (text: string, chapterIndex: number, paragraphIndex: number) => {
    const normalizedText = text.replace(/\s+/g, ' ')
    const paragraphUnderlines = underlines
      .filter(u => u.chapter_index === chapterIndex && u.paragraph_index === paragraphIndex)
      .sort((a, b) => a.start_offset - b.start_offset)

    if (paragraphUnderlines.length === 0) {
      return normalizedText
    }

    const parts: React.ReactNode[] = []
    let lastIndex = 0

    paragraphUnderlines.forEach((underline) => {
      if (underline.start_offset > lastIndex) {
        parts.push(normalizedText.slice(lastIndex, underline.start_offset))
      }

      parts.push(
        <span key={underline.id} className="underline-wrapper">
          <span className={`underlined-text ${underline.idea_count > 0 ? 'has-ideas' : ''}`}>
            {normalizedText.slice(underline.start_offset, underline.end_offset)}
          </span>
          <span
            className={`idea-badge ${underline.idea_count > 0 ? 'has-ideas' : ''}`}
            onClick={(e) => handleBadgeClick(e, underline)}
          >
            {underline.idea_count > 0 ? underline.idea_count : '+'}
          </span>
        </span>
      )

      lastIndex = underline.end_offset
    })

    if (lastIndex < normalizedText.length) {
      parts.push(normalizedText.slice(lastIndex))
    }

    return parts
  }

  if (loading) {
    const progressPercent = downloadProgress.total
      ? Math.round((downloadProgress.loaded / downloadProgress.total) * 100)
      : null

    return (
      <div className="ebook-blog-reader">
        <h1 className="reader-title">{ebook.title}</h1>
        <header className="reader-header">
          <button className="back-btn" onClick={onBack}>Back</button>
        </header>
        <div className="ebook-loading">
          <div className="loading-spinner"></div>
          <p className="loading-status">{downloadProgress.status}</p>
          {downloadProgress.total && (
            <div className="download-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="progress-text">
                {(downloadProgress.loaded / 1024 / 1024).toFixed(1)} MB
                {' / '}
                {(downloadProgress.total / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="ebook-blog-reader">
        <h1 className="reader-title">{ebook.title}</h1>
        <header className="reader-header">
          <button className="back-btn" onClick={onBack}>Back</button>
        </header>
        <div className="ebook-error">
          <p>{error}</p>
          <button onClick={fetchEbookText}>Retry</button>
        </div>
      </div>
    )
  }

  // EPUB format - show all chapters together
  if (ebookText?.format === 'epub' && ebookText.chapters) {
    return (
      <div className="ebook-blog-reader" onClick={() => {
        if (ideaPopup.visible) closeIdeaPopup()
        if (meaningPopup.visible) closeMeaningPopup()
      }}>
        <h1 className="reader-title">{ebookText.title}</h1>
        {ebookText.author && <p className="reader-author">by {ebookText.author}</p>}

        <header className="reader-header">
          <button className="back-btn" onClick={handleBack}>Back</button>
          <div className="font-controls">
            <button onClick={decreaseFontSize} title="Decrease font size">A-</button>
            <span className="font-size-display">{fontSize}px</span>
            <button onClick={increaseFontSize} title="Increase font size">A+</button>
          </div>
        </header>

        <div className="ebook-content" ref={contentRef} onMouseUp={handleMouseUp} onTouchEnd={handleSelectionEnd}>
          <article className="ebook-article" style={{ fontSize: `${fontSize}px` }}>
            {ebookText.chapters.map((chapter, chapterIndex) => (
              <section key={chapter.id} className="ebook-chapter">
                <h2 className="chapter-title">{chapter.title}</h2>
                {chapter.content.split('\n\n').map((paragraph, paragraphIndex) => (
                  paragraph.trim() && (
                    <p key={`${chapterIndex}-${paragraphIndex}`} className="ebook-paragraph">
                      {renderParagraphWithUnderlines(paragraph, chapterIndex, paragraphIndex)}
                    </p>
                  )
                ))}
              </section>
            ))}
          </article>

          {/* Underline confirmation/idea bubble */}
          {bubble.visible && (
            <div
              className="underline-bubble"
              style={{
                left: `${bubble.x}px`,
                top: `${bubble.y}px`
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
                    ×
                  </button>
                </div>
              ) : (
                <div className="bubble-idea">
                  {isListening && (
                    <div className="voice-status">
                      <span className="voice-indicator listening"></span>
                      <span>Listening...</span>
                    </div>
                  )}
                  <div className="voice-input-row">
                    <input
                      ref={ideaInputRef}
                      type="text"
                      placeholder={isListening ? "Speak your idea..." : "Type or tap mic..."}
                      value={ideaText.replace(/\|INTERIM\|/g, '')}
                      onChange={e => setIdeaText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveIdea()
                        if (e.key === 'Escape') handleSkipIdea()
                      }}
                    />
                    {isSpeechSupported && (
                      <button
                        className={`voice-btn ${isListening ? 'active' : ''}`}
                        onClick={isListening ? stopListening : startListening}
                        type="button"
                      >
                        {isListening ? '⏹' : '🎤'}
                      </button>
                    )}
                  </div>
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

          {/* Ideas popup */}
          {ideaPopup.visible && (
            <div
              className="idea-popup"
              style={{
                left: `${ideaPopup.x}px`,
                top: `${ideaPopup.y}px`
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="idea-popup-header">
                <span>Ideas ({ideaPopup.ideas.length})</span>
                <button className="popup-close" onClick={closeIdeaPopup}>×</button>
              </div>

              <div className="idea-popup-input">
                {isPopupListening && (
                  <div className="voice-status popup">
                    <span className="voice-indicator listening"></span>
                    <span>Listening...</span>
                  </div>
                )}
                <div className="voice-input-row">
                  <input
                    ref={popupIdeaInputRef}
                    type="text"
                    placeholder={isPopupListening ? "Speak..." : "Add new idea..."}
                    value={newIdeaText.replace(/\|INTERIM\|/g, '')}
                    onChange={e => setNewIdeaText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddIdeaInPopup()
                    }}
                  />
                  {isSpeechSupported && (
                    <button
                      className={`voice-btn small ${isPopupListening ? 'active' : ''}`}
                      onClick={isPopupListening ? stopPopupListening : startPopupListening}
                      type="button"
                    >
                      {isPopupListening ? '⏹' : '🎤'}
                    </button>
                  )}
                </div>
                <button onClick={handleAddIdeaInPopup}>Add</button>
              </div>

              <div className="idea-popup-list">
                {ideaPopup.ideas.length === 0 ? (
                  <div className="no-ideas">No ideas yet</div>
                ) : (
                  ideaPopup.ideas.map(idea => (
                    <div key={idea.id} className="idea-item">
                      {editingIdeaId === idea.id ? (
                        <div className="idea-edit">
                          <input
                            type="text"
                            value={editingIdeaText}
                            onChange={e => setEditingIdeaText(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveEditIdea()
                              if (e.key === 'Escape') handleCancelEditIdea()
                            }}
                            autoFocus
                          />
                          <button className="idea-save" onClick={handleSaveEditIdea}>✓</button>
                          <button className="idea-cancel" onClick={handleCancelEditIdea}>×</button>
                        </div>
                      ) : (
                        <>
                          <div className="idea-main">
                            <span
                              className="idea-content"
                              onClick={() => handleStartEditIdea(idea)}
                            >
                              {idea.content}
                            </span>
                            <span className="idea-date">
                              {new Date(idea.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                          <button
                            className="idea-delete"
                            onClick={() => handleDeleteIdea(idea.id)}
                          >
                            ×
                          </button>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="idea-popup-footer">
                <button className="delete-underline" onClick={handleDeleteUnderline}>
                  Remove Underline
                </button>
              </div>
            </div>
          )}

          {/* Meaning popup */}
          {meaningPopup.visible && (
            <div
              className="meaning-popup"
              style={{
                left: `${meaningPopup.x}px`,
                top: `${meaningPopup.y}px`
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="meaning-popup-header">
                <span>Meaning</span>
                <button className="popup-close" onClick={closeMeaningPopup}>×</button>
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
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n/g, '<br/>')
                  }} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // PDF format
  return (
    <div className="ebook-blog-reader" onClick={() => {
      if (ideaPopup.visible) closeIdeaPopup()
      if (meaningPopup.visible) closeMeaningPopup()
    }}>
      <h1 className="reader-title">{ebook.title}</h1>
      <header className="reader-header">
        <button className="back-btn" onClick={handleBack}>Back</button>
        <div className="font-controls">
          <button onClick={decreaseFontSize} title="Decrease font size">A-</button>
          <span className="font-size-display">{fontSize}px</span>
          <button onClick={increaseFontSize} title="Increase font size">A+</button>
        </div>
      </header>

      <div className="ebook-content" ref={contentRef} onMouseUp={handleMouseUp} onTouchEnd={handleSelectionEnd}>
        <article className="ebook-article" style={{ fontSize: `${fontSize}px` }}>
          {ebookText?.pages?.map((page, index) => (
            <p key={index} className="ebook-paragraph">
              {renderParagraphWithUnderlines(page.content, 0, index)}
            </p>
          ))}
        </article>

        {/* Same bubble/popup components as EPUB */}
        {bubble.visible && (
          <div
            className="underline-bubble"
            style={{
              left: `${bubble.x}px`,
              top: `${bubble.y}px`
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
                  ×
                </button>
              </div>
            ) : (
              <div className="bubble-idea">
                {isListening && (
                  <div className="voice-status">
                    <span className="voice-indicator listening"></span>
                    <span>Listening...</span>
                  </div>
                )}
                <div className="voice-input-row">
                  <input
                    ref={ideaInputRef}
                    type="text"
                    placeholder={isListening ? "Speak your idea..." : "Type or tap mic..."}
                    value={ideaText.replace(/\|INTERIM\|/g, '')}
                    onChange={e => setIdeaText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveIdea()
                      if (e.key === 'Escape') handleSkipIdea()
                    }}
                  />
                  {isSpeechSupported && (
                    <button
                      className={`voice-btn ${isListening ? 'active' : ''}`}
                      onClick={isListening ? stopListening : startListening}
                      type="button"
                    >
                      {isListening ? '⏹' : '🎤'}
                    </button>
                  )}
                </div>
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

        {ideaPopup.visible && (
          <div
            className="idea-popup"
            style={{
              left: `${ideaPopup.x}px`,
              top: `${ideaPopup.y}px`
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="idea-popup-header">
              <span>Ideas ({ideaPopup.ideas.length})</span>
              <button className="popup-close" onClick={closeIdeaPopup}>×</button>
            </div>

            <div className="idea-popup-input">
              {isPopupListening && (
                <div className="voice-status popup">
                  <span className="voice-indicator listening"></span>
                  <span>Listening...</span>
                </div>
              )}
              <div className="voice-input-row">
                <input
                  ref={popupIdeaInputRef}
                  type="text"
                  placeholder={isPopupListening ? "Speak..." : "Add new idea..."}
                  value={newIdeaText.replace(/\|INTERIM\|/g, '')}
                  onChange={e => setNewIdeaText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddIdeaInPopup()
                  }}
                />
                {isSpeechSupported && (
                  <button
                    className={`voice-btn small ${isPopupListening ? 'active' : ''}`}
                    onClick={isPopupListening ? stopPopupListening : startPopupListening}
                    type="button"
                  >
                    {isPopupListening ? '⏹' : '🎤'}
                  </button>
                )}
              </div>
              <button onClick={handleAddIdeaInPopup}>Add</button>
            </div>

            <div className="idea-popup-list">
              {ideaPopup.ideas.length === 0 ? (
                <div className="no-ideas">No ideas yet</div>
              ) : (
                ideaPopup.ideas.map(idea => (
                  <div key={idea.id} className="idea-item">
                    {editingIdeaId === idea.id ? (
                      <div className="idea-edit">
                        <input
                          type="text"
                          value={editingIdeaText}
                          onChange={e => setEditingIdeaText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveEditIdea()
                            if (e.key === 'Escape') handleCancelEditIdea()
                          }}
                          autoFocus
                        />
                        <button className="idea-save" onClick={handleSaveEditIdea}>✓</button>
                        <button className="idea-cancel" onClick={handleCancelEditIdea}>×</button>
                      </div>
                    ) : (
                      <>
                        <div className="idea-main">
                          <span
                            className="idea-content"
                            onClick={() => handleStartEditIdea(idea)}
                          >
                            {idea.content}
                          </span>
                          <span className="idea-date">
                            {new Date(idea.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        <button
                          className="idea-delete"
                          onClick={() => handleDeleteIdea(idea.id)}
                        >
                          ×
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="idea-popup-footer">
              <button className="delete-underline" onClick={handleDeleteUnderline}>
                Remove Underline
              </button>
            </div>
          </div>
        )}

        {meaningPopup.visible && (
          <div
            className="meaning-popup"
            style={{
              left: `${meaningPopup.x}px`,
              top: `${meaningPopup.y}px`
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="meaning-popup-header">
              <span>Meaning</span>
              <button className="popup-close" onClick={closeMeaningPopup}>×</button>
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
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n/g, '<br/>')
                }} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
