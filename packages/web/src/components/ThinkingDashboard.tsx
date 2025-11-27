import { useState, useEffect } from 'react'
import type { Note, NoteYear } from '../types'

interface Props {
  onBack: () => void
}

export default function ThinkingDashboard({ onBack }: Props) {
  const [years, setYears] = useState<NoteYear[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchYears()
  }, [])

  const fetchYears = async () => {
    try {
      const response = await fetch('/api/notes/years')
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

      const response = await fetch(`/api/notes?${params}`)
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
      const response = await fetch(`/api/notes/${noteId}/content`)
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
            Back
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
            Back
          </button>
          <h1>Thinking - {selectedYear}</h1>
          <div className="header-actions">
            <span className="note-count">{notes.length} notes</span>
          </div>
        </header>

        <div className="filters">
          <input
            type="text"
            placeholder="Search notes..."
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
            <p>No notes found</p>
          </div>
        )}
      </div>
    )
  }

  // Show years list
  return (
    <div className="thinking-dashboard">
      <header className="dashboard-header">
        <button className="back-btn" onClick={onBack}>
          Back
        </button>
        <h1>Thinking</h1>
      </header>

      {loading ? (
        <div className="loading">Loading years...</div>
      ) : years.length === 0 ? (
        <div className="empty-state">
          <h2>No notes found</h2>
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
              <div className="year-count">{yearInfo.count} notes</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
