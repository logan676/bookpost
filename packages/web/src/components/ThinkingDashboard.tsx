import { useState, useEffect, useCallback } from 'react'
import { useI18n } from '../i18n'
import { useAuth } from '../auth'
import LoginModal from './LoginModal'
import type { Note, NoteYear } from '../types'

interface Underline {
  id: number
  note_id: number
  text: string
  paragraph_index: number
  start_offset: number
  end_offset: number
  idea_count: number
}

interface Idea {
  id: number
  underline_id: number
  content: string
  created_at: string
}

interface Comment {
  id: number
  note_id: number
  nick: string
  content: string
  original_date: string
  created_at: string
}

export default function ThinkingDashboard() {
  const { t, formatCount } = useI18n()
  const { token, user } = useAuth()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [years, setYears] = useState<NoteYear[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isWriting, setIsWriting] = useState(false)
  const [newNoteTitle, setNewNoteTitle] = useState('')
  const [newNoteContent, setNewNoteContent] = useState('')
  const [saving, setSaving] = useState(false)

  // Underline/Ideas state
  const [underlines, setUnderlines] = useState<Underline[]>([])
  const [selectedUnderline, setSelectedUnderline] = useState<Underline | null>(null)
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [newIdea, setNewIdea] = useState('')
  const [showIdeaPanel, setShowIdeaPanel] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])

  useEffect(() => {
    fetchYearsAndNotes()
  }, [token])

  const getAuthHeaders = () => {
    const headers: Record<string, string> = {}
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    return headers
  }

  const fetchYearsAndNotes = async () => {
    setLoading(true)
    try {
      const yearsResponse = await fetch('/api/notes/years', { headers: getAuthHeaders() })
      if (yearsResponse.ok) {
        const yearsData = await yearsResponse.json()
        setYears(yearsData)
      }
      const notesResponse = await fetch('/api/notes', { headers: getAuthHeaders() })
      if (notesResponse.ok) {
        const notesData = await notesResponse.json()
        setNotes(notesData)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchNotes = async (year?: number | null, search?: string) => {
    try {
      const params = new URLSearchParams()
      if (year) params.set('year', year.toString())
      if (search) params.set('search', search)

      const response = await fetch(`/api/notes?${params}`, { headers: getAuthHeaders() })
      if (response.ok) {
        const data = await response.json()
        setNotes(data)
      }
    } catch (error) {
      console.error('Failed to fetch notes:', error)
    }
  }

  const fetchNoteContent = async (noteId: number) => {
    try {
      const response = await fetch(`/api/notes/${noteId}/content`, { headers: getAuthHeaders() })
      if (response.ok) {
        const data = await response.json()
        setSelectedNote(data)
        setUnderlines(data.underlines || [])
        setComments(data.comments || [])
      }
    } catch (error) {
      console.error('Failed to fetch note content:', error)
    }
  }

  const fetchIdeas = async (underlineId: number) => {
    try {
      const response = await fetch(`/api/note-underlines/${underlineId}/ideas`, { headers: getAuthHeaders() })
      if (response.ok) {
        const data = await response.json()
        setIdeas(data)
      }
    } catch (error) {
      console.error('Failed to fetch ideas:', error)
    }
  }

  const handleYearFilter = (year: number | null) => {
    setSelectedYear(year)
    fetchNotes(year, searchTerm)
  }

  const handleBackFromNote = () => {
    setSelectedNote(null)
    setUnderlines([])
    setSelectedUnderline(null)
    setIdeas([])
    setShowIdeaPanel(false)
    setComments([])
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    fetchNotes(selectedYear, term)
  }

  const handleNoteClick = (note: Note) => {
    fetchNoteContent(note.id)
  }

  const handleWriteClick = () => {
    if (!user) {
      setShowLoginModal(true)
      return
    }
    setIsWriting(true)
    setNewNoteTitle('')
    setNewNoteContent('')
  }

  const handleCancelWrite = () => {
    setIsWriting(false)
    setNewNoteTitle('')
    setNewNoteContent('')
  }

  const handleSaveNote = async () => {
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return

    setSaving(true)
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          title: newNoteTitle,
          content: newNoteContent
        })
      })

      if (response.ok) {
        setIsWriting(false)
        setNewNoteTitle('')
        setNewNoteContent('')
        fetchYearsAndNotes()
      }
    } catch (error) {
      console.error('Failed to save note:', error)
    } finally {
      setSaving(false)
    }
  }

  // Handle text selection for underlining
  const handleTextSelection = useCallback(() => {
    if (!user || !selectedNote) return

    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return

    const selectedText = selection.toString().trim()
    if (!selectedText || selectedText.length < 2) return

    // Find paragraph index
    const range = selection.getRangeAt(0)
    const container = range.commonAncestorContainer
    const paragraph = container.nodeType === Node.TEXT_NODE
      ? container.parentElement?.closest('[data-paragraph-index]')
      : (container as Element).closest('[data-paragraph-index]')

    if (!paragraph) return

    const paragraphIndex = parseInt(paragraph.getAttribute('data-paragraph-index') || '0')

    // Create underline
    createUnderline(selectedText, paragraphIndex)
    selection.removeAllRanges()
  }, [user, selectedNote])

  const createUnderline = async (text: string, paragraphIndex: number) => {
    if (!selectedNote) return

    try {
      const response = await fetch(`/api/notes/${selectedNote.id}/underlines`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          text,
          paragraph_index: paragraphIndex,
          start_offset: 0,
          end_offset: text.length
        })
      })

      if (response.ok) {
        const newUnderline = await response.json()
        setUnderlines(prev => [...prev, { ...newUnderline, idea_count: 0 }])
        setSelectedUnderline({ ...newUnderline, idea_count: 0 })
        setShowIdeaPanel(true)
        setIdeas([])
      }
    } catch (error) {
      console.error('Failed to create underline:', error)
    }
  }

  const handleUnderlineClick = async (underline: Underline) => {
    setSelectedUnderline(underline)
    setShowIdeaPanel(true)
    await fetchIdeas(underline.id)
  }

  const handleAddIdea = async () => {
    if (!newIdea.trim() || !selectedUnderline) return

    try {
      const response = await fetch(`/api/note-underlines/${selectedUnderline.id}/ideas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ content: newIdea })
      })

      if (response.ok) {
        const idea = await response.json()
        setIdeas(prev => [idea, ...prev])
        setNewIdea('')
        // Update underline idea count
        setUnderlines(prev => prev.map(u =>
          u.id === selectedUnderline.id ? { ...u, idea_count: u.idea_count + 1 } : u
        ))
      }
    } catch (error) {
      console.error('Failed to add idea:', error)
    }
  }

  const handleDeleteUnderline = async (underlineId: number) => {
    try {
      const response = await fetch(`/api/note-underlines/${underlineId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      if (response.ok) {
        setUnderlines(prev => prev.filter(u => u.id !== underlineId))
        if (selectedUnderline?.id === underlineId) {
          setSelectedUnderline(null)
          setShowIdeaPanel(false)
        }
      }
    } catch (error) {
      console.error('Failed to delete underline:', error)
    }
  }

  // Render markdown content with images and underline support
  const renderMarkdown = (content: string) => {
    if (!content) return null

    // Pre-process: remove any remaining frontmatter-like lines
    const cleanedContent = content
      .replace(/^(title|author|date|tags|categories|layout|comments):\s*.*$/gm, '')
      .replace(/^\s*-\s+(日记|生活|技术|我的大学|阅读|随笔|工作|旅行).*$/gm, '')
      .replace(/^---\s*$/gm, '')
      .replace(/^\s*-\s*$/gm, '')
      .trim()

    const elements: JSX.Element[] = []
    const lines = cleanedContent.split('\n')
    let inCodeBlock = false
    let codeLines: string[] = []
    let inList = false
    let listItems: string[] = []
    let paragraphIndex = 0

    const getUnderlineForParagraph = (pIndex: number) => {
      return underlines.filter(u => u.paragraph_index === pIndex)
    }

    const highlightText = (text: string, pIndex: number) => {
      const pUnderlines = getUnderlineForParagraph(pIndex)
      if (pUnderlines.length === 0) return text

      let result = text
      // Sort by length descending to avoid partial replacements
      const sorted = [...pUnderlines].sort((a, b) => b.text.length - a.text.length)

      for (const underline of sorted) {
        const escapedText = underline.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(`(${escapedText})`, 'g')
        result = result.replace(regex, `<u class="note-underline" data-underline-id="${underline.id}">$1</u>`)
      }

      return result
    }

    const renderParagraph = (text: string, key: number, className: string) => {
      // Check for image markdown: ![alt](/images/xxx.jpg)
      const imageMatch = text.match(/!\[(.*?)\]\(([^)]+)\)/)
      if (imageMatch) {
        const alt = imageMatch[1]
        let src = imageMatch[2]
        // Convert /images/xxx to /api/blog-images/xxx
        if (src.startsWith('/images/')) {
          src = `/api/blog-images/${src.slice(8)}`
        }
        return (
          <figure key={key} className="note-figure">
            <img src={src} alt={alt} className="note-image" />
            {alt && <figcaption>{alt}</figcaption>}
          </figure>
        )
      }

      const highlighted = highlightText(text, paragraphIndex)
      const hasUnderlines = highlighted !== text

      return (
        <p
          key={key}
          className={className}
          data-paragraph-index={paragraphIndex++}
          dangerouslySetInnerHTML={hasUnderlines ? { __html: highlighted } : undefined}
          onClick={(e) => {
            const target = e.target as HTMLElement
            if (target.classList.contains('note-underline')) {
              const underlineId = parseInt(target.getAttribute('data-underline-id') || '0')
              const underline = underlines.find(u => u.id === underlineId)
              if (underline) handleUnderlineClick(underline)
            }
          }}
        >
          {hasUnderlines ? undefined : text}
        </p>
      )
    }

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="note-list">
            {listItems.map((item, j) => <li key={j}>{item}</li>)}
          </ul>
        )
        listItems = []
        inList = false
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre key={`code-${i}`} className="note-code">
              <code>{codeLines.join('\n')}</code>
            </pre>
          )
          codeLines = []
          inCodeBlock = false
        } else {
          flushList()
          inCodeBlock = true
        }
        continue
      }

      if (inCodeBlock) {
        codeLines.push(line)
        continue
      }

      // Headers
      if (line.startsWith('# ')) {
        flushList()
        elements.push(<h1 key={i} className="note-h1">{line.slice(2)}</h1>)
      } else if (line.startsWith('## ')) {
        flushList()
        elements.push(<h2 key={i} className="note-h2">{line.slice(3)}</h2>)
      } else if (line.startsWith('### ')) {
        flushList()
        elements.push(<h3 key={i} className="note-h3">{line.slice(4)}</h3>)
      } else if (line.startsWith('#### ')) {
        flushList()
        elements.push(<h4 key={i} className="note-h4">{line.slice(5)}</h4>)
      }
      // Lists
      else if (line.match(/^[-*]\s+/)) {
        inList = true
        listItems.push(line.replace(/^[-*]\s+/, ''))
      } else if (line.match(/^\d+\.\s+/)) {
        inList = true
        listItems.push(line.replace(/^\d+\.\s+/, ''))
      }
      // Blockquote
      else if (line.startsWith('>')) {
        flushList()
        elements.push(
          <blockquote key={i} className="note-quote">
            {line.slice(1).trim()}
          </blockquote>
        )
      }
      // Empty line
      else if (line.trim() === '') {
        flushList()
      }
      // Regular paragraph or image
      else {
        flushList()
        elements.push(renderParagraph(line, i, 'note-p'))
      }
    }

    flushList()
    return elements
  }

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  // Show write note page
  if (isWriting) {
    return (
      <div className="thinking-dashboard">
        <div className="sub-view-header">
          <h1 className="sub-view-title">{t.writeNote}</h1>
          <div className="sub-view-nav">
            <button className="back-btn" onClick={handleCancelWrite}>
              {t.cancel}
            </button>
          </div>
        </div>

        <div className="note-editor">
          <div className="form-group">
            <label>{t.noteTitle}</label>
            <input
              type="text"
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              placeholder={t.noteTitle}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>{t.noteContent}</label>
            <textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder={t.noteContent}
              rows={20}
            />
          </div>
          <div className="form-actions">
            <button className="btn btn-secondary" onClick={handleCancelWrite}>
              {t.cancel}
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSaveNote}
              disabled={saving || !newNoteTitle.trim() || !newNoteContent.trim()}
            >
              {saving ? t.loading : t.save}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show note content
  if (selectedNote) {
    const noteDate = (selectedNote as any).date || (selectedNote as any).frontmatter?.date
    const noteAuthor = (selectedNote as any).author || (selectedNote as any).frontmatter?.author
    const noteTags = (selectedNote as any).tags || (selectedNote as any).frontmatter?.tags || []
    const noteCategories = (selectedNote as any).categories || (selectedNote as any).frontmatter?.categories || []

    return (
      <div className="thinking-dashboard note-reader">
        <div className="sub-view-header">
          <div className="sub-view-nav">
            <button className="back-btn" onClick={handleBackFromNote}>
              {t.back}
            </button>
            {user && (
              <span className="underline-hint">Select text to underline</span>
            )}
          </div>
        </div>

        <div className="note-layout">
          <article className="note-article" onMouseUp={handleTextSelection}>
            <header className="note-header">
              <h1 className="note-title">{selectedNote.title}</h1>
              <div className="note-meta-row">
                {noteDate && <time className="note-date">{formatDate(noteDate)}</time>}
                {noteAuthor && <span className="note-author">{noteAuthor}</span>}
                {noteCategories.filter(Boolean).map((cat: string, i: number) => (
                  <span key={`cat-${i}`} className="note-category">{cat}</span>
                ))}
                {noteTags.filter(Boolean).map((tag: string, i: number) => (
                  <span key={`tag-${i}`} className="note-tag">{tag}</span>
                ))}
              </div>
            </header>

            <div className="note-body">
              {renderMarkdown(selectedNote.content || '')}
            </div>

            {/* Underlines summary */}
            {underlines.length > 0 && (
              <div className="underlines-summary">
                <h3>Underlines ({underlines.length})</h3>
                <div className="underlines-list">
                  {underlines.map(u => (
                    <div
                      key={u.id}
                      className={`underline-item ${selectedUnderline?.id === u.id ? 'active' : ''}`}
                      onClick={() => handleUnderlineClick(u)}
                    >
                      <span className="underline-text">"{u.text}"</span>
                      {u.idea_count > 0 && (
                        <span className="idea-badge">{u.idea_count} ideas</span>
                      )}
                      <button
                        className="delete-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteUnderline(u.id)
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments section */}
            {comments.length > 0 && (
              <div className="note-comments">
                <h3>Comments ({comments.length})</h3>
                <div className="comments-list">
                  {comments.map(comment => (
                    <div key={comment.id} className="comment-item">
                      <div className="comment-header">
                        <span className="comment-nick">{comment.nick || 'Anonymous'}</span>
                        <time className="comment-date">
                          {comment.original_date ? formatDate(comment.original_date) : formatDate(comment.created_at)}
                        </time>
                      </div>
                      <div className="comment-content">{comment.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* Ideas Panel */}
          {showIdeaPanel && selectedUnderline && (
            <aside className="ideas-panel">
              <div className="ideas-header">
                <h3>Ideas</h3>
                <button className="close-btn" onClick={() => setShowIdeaPanel(false)}>×</button>
              </div>
              <div className="selected-underline">
                <p>"{selectedUnderline.text}"</p>
              </div>
              <div className="idea-input">
                <textarea
                  value={newIdea}
                  onChange={(e) => setNewIdea(e.target.value)}
                  placeholder="Write your idea..."
                  rows={3}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleAddIdea}
                  disabled={!newIdea.trim()}
                >
                  Add Idea
                </button>
              </div>
              <div className="ideas-list">
                {ideas.map(idea => (
                  <div key={idea.id} className="idea-item">
                    <p>{idea.content}</p>
                    <time>{new Date(idea.created_at).toLocaleDateString()}</time>
                  </div>
                ))}
              </div>
            </aside>
          )}
        </div>
      </div>
    )
  }

  // Show flat list with year filters
  return (
    <div className="thinking-dashboard no-header">
      <div className="thinking-actions">
        <button className="add-btn" onClick={handleWriteClick}>
          {t.writeNote}
        </button>
      </div>

      {years.length > 0 && (
        <div className="year-filters">
          <button
            className={`year-chip ${selectedYear === null ? 'active' : ''}`}
            onClick={() => handleYearFilter(null)}
          >
            {t.all || 'All'} ({years.reduce((sum, y) => sum + y.count, 0)})
          </button>
          {years.map((yearInfo) => (
            <button
              key={yearInfo.year}
              className={`year-chip ${selectedYear === yearInfo.year ? 'active' : ''}`}
              onClick={() => handleYearFilter(yearInfo.year)}
            >
              {yearInfo.year} ({yearInfo.count})
            </button>
          ))}
        </div>
      )}

      <div className="filters">
        <input
          type="text"
          placeholder={t.searchNotes}
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {loading ? (
        <div className="loading">{t.loadingYears}</div>
      ) : notes.length === 0 ? (
        <div className="empty-state">
          <h2>{t.noNotesFound}</h2>
          <p>{t.startWritingHint}</p>
          <button className="add-btn" onClick={handleWriteClick}>
            {t.writeFirstNote}
          </button>
        </div>
      ) : (
        <div className="note-list">
          {notes.map((note) => (
            <div
              key={note.id}
              className="note-card"
              onClick={() => handleNoteClick(note)}
            >
              <h3 className="note-title">{note.title}</h3>
              {note.content_preview && (
                <p className="note-preview">{note.content_preview.substring(0, 150)}...</p>
              )}
              <div className="note-meta">
                {note.year && <span className="year">{note.year}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showLoginModal && (
        <LoginModal onClose={() => setShowLoginModal(false)} />
      )}
    </div>
  )
}
