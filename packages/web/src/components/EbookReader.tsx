import { useState, useEffect } from 'react'
import { useAuth } from '../auth'
import type { Ebook } from '../types'

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

export default function EbookReader({ ebook, onBack, initialPage = 1 }: Props) {
  const { token, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ebookText, setEbookText] = useState<EbookText | null>(null)
  const [fontSize, setFontSize] = useState(18)

  useEffect(() => {
    fetchEbookText()
  }, [ebook.id])

  const fetchEbookText = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/ebooks/${ebook.id}/text`)
      if (!response.ok) {
        throw new Error('Failed to load ebook')
      }
      const data = await response.json()
      setEbookText(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ebook')
    } finally {
      setLoading(false)
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

  if (loading) {
    return (
      <div className="ebook-blog-reader">
        <h1 className="reader-title">{ebook.title}</h1>
        <header className="reader-header">
          <button className="back-btn" onClick={onBack}>Back</button>
        </header>
        <div className="ebook-loading">
          <p>Loading ebook...</p>
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
      <div className="ebook-blog-reader">
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

        <div className="ebook-content">
          <article className="ebook-article" style={{ fontSize: `${fontSize}px` }}>
            {ebookText.chapters.map((chapter, chapterIndex) => (
              <section key={chapter.id} className="ebook-chapter">
                <h2 className="chapter-title">{chapter.title}</h2>
                {chapter.content.split('\n\n').map((paragraph, index) => (
                  paragraph.trim() && (
                    <p key={`${chapterIndex}-${index}`} className="ebook-paragraph">
                      {paragraph}
                    </p>
                  )
                ))}
              </section>
            ))}
          </article>
        </div>
      </div>
    )
  }

  // PDF format
  return (
    <div className="ebook-blog-reader">
      <h1 className="reader-title">{ebook.title}</h1>
      <header className="reader-header">
        <button className="back-btn" onClick={handleBack}>Back</button>
        <div className="font-controls">
          <button onClick={decreaseFontSize} title="Decrease font size">A-</button>
          <span className="font-size-display">{fontSize}px</span>
          <button onClick={increaseFontSize} title="Increase font size">A+</button>
        </div>
      </header>

      <div className="ebook-content">
        <article className="ebook-article" style={{ fontSize: `${fontSize}px` }}>
          {ebookText?.pages?.map((page, index) => (
            <p key={index} className="ebook-paragraph">
              {page.content}
            </p>
          ))}
        </article>
      </div>
    </div>
  )
}
