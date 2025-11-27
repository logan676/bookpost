import { useState, useEffect } from 'react'
import { useI18n } from '../i18n'
import { useAuth } from '../auth'
import type { Note, NoteYear } from '../types'

export default function ThinkingDashboard() {
  const { t, formatCount } = useI18n()
  const { token } = useAuth()
  const [years, setYears] = useState<NoteYear[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchYears()
  }, [])

  const getAuthHeaders = () => {
    const headers: Record<string, string> = {}
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    return headers
  }

  const fetchYears = async () => {
    try {
      const response = await fetch('/api/notes/years', { headers: getAuthHeaders() })
      if (response.ok) {
        const data = await response.json()
        setYears(data)
      }
    } catch (error) {
      console.error('Failed to fetch note years:', error)
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
      }
    } catch (error) {
      console.error('Failed to fetch note content:', error)
    }
  }

  const handleYearClick = (year: number) => {
    setSelectedYear(year)
    setSearchTerm('')
    fetchNotes(year)
  }

  const handleBackToYears = () => {
    setSelectedYear(null)
    setNotes([])
    setSearchTerm('')
    setSelectedNote(null)
  }

  const handleBackFromNote = () => {
    setSelectedNote(null)
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    fetchNotes(selectedYear, term)
  }

  const handleNoteClick = (note: Note) => {
    fetchNoteContent(note.id)
  }

  // Show note content
  if (selectedNote) {
    return (
      <div className="thinking-dashboard note-reader">
        <header className="dashboard-header">
          <button className="back-btn" onClick={handleBackFromNote}>
            {t.back}
          </button>
          <h1>{selectedNote.title}</h1>
          <div className="header-actions">
            {selectedNote.year && <span className="note-year">{selectedNote.year}</span>}
          </div>
        </header>

        <div className="note-content">
          <div className="markdown-body">
            {selectedNote.content?.split('\n').map((line, i) => {
              // Simple markdown rendering
              if (line.startsWith('# ')) {
                return <h1 key={i}>{line.slice(2)}</h1>
              } else if (line.startsWith('## ')) {
                return <h2 key={i}>{line.slice(3)}</h2>
              } else if (line.startsWith('### ')) {
                return <h3 key={i}>{line.slice(4)}</h3>
              } else if (line.startsWith('- ')) {
                return <li key={i}>{line.slice(2)}</li>
              } else if (line.startsWith('```')) {
                return <pre key={i}><code>{line}</code></pre>
              } else if (line.trim() === '') {
                return <br key={i} />
              } else {
                return <p key={i}>{line}</p>
              }
            })}
          </div>
        </div>
      </div>
    )
  }

  // Show notes for selected year
  if (selectedYear) {
    return (
      <div className="thinking-dashboard">
        <header className="dashboard-header">
          <button className="back-btn" onClick={handleBackToYears}>
            {t.back}
          </button>
          <h1>{t.thinkingTitle} - {selectedYear}</h1>
          <div className="header-actions">
            <span className="note-count">{formatCount(t.notesCount, notes.length)}</span>
          </div>
        </header>

        <div className="filters">
          <input
            type="text"
            placeholder={t.searchNotes}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
        </div>

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

        {notes.length === 0 && (
          <div className="empty-state">
            <p>{t.noNotesFound}</p>
          </div>
        )}
      </div>
    )
  }

  // Show years list
  return (
    <div className="thinking-dashboard no-header">
      {loading ? (
        <div className="loading">{t.loadingYears}</div>
      ) : years.length === 0 ? (
        <div className="empty-state">
          <h2>{t.noNotesFound}</h2>
        </div>
      ) : (
        <div className="year-grid">
          {years.map((yearInfo) => (
            <div
              key={yearInfo.year}
              className="year-card"
              onClick={() => handleYearClick(yearInfo.year)}
            >
              <div className="year-number">{yearInfo.year}</div>
              <div className="year-count">{formatCount(t.notesCount, yearInfo.count)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
