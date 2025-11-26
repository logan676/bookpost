import { useState, useEffect, useRef } from 'react'
import type { BlogPost, Underline, Idea } from '../types'

interface PostDetailProps {
  post: BlogPost
  onBack: () => void
}

interface BubbleState {
  visible: boolean
  x: number
  y: number
  type: 'confirm' | 'idea'
  selectedText?: string
  paragraphIndex?: number
  startOffset?: number
  endOffset?: number
  underlineId?: number
}

interface IdeaPopupState {
  visible: boolean
  underlineId: number | null
  ideas: Idea[]
  x: number
  y: number
}

function PostDetail({ post, onBack }: PostDetailProps) {
  const [underlines, setUnderlines] = useState<Underline[]>([])
  const [bubble, setBubble] = useState<BubbleState>({ visible: false, x: 0, y: 0, type: 'confirm' })
  const [ideaText, setIdeaText] = useState('')
  const [ideaPopup, setIdeaPopup] = useState<IdeaPopupState>({ visible: false, underlineId: null, ideas: [], x: 0, y: 0 })
  const [newIdeaText, setNewIdeaText] = useState('')
  const [editingIdeaId, setEditingIdeaId] = useState<number | null>(null)
  const [editingIdeaText, setEditingIdeaText] = useState('')
  const contentRef = useRef<HTMLDivElement>(null)
  const ideaInputRef = useRef<HTMLInputElement>(null)
  const popupIdeaInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchUnderlines()
  }, [post.id])

  useEffect(() => {
    if (bubble.visible && bubble.type === 'idea' && ideaInputRef.current) {
      ideaInputRef.current.focus()
    }
  }, [bubble.visible, bubble.type])

  useEffect(() => {
    if (ideaPopup.visible && popupIdeaInputRef.current) {
      popupIdeaInputRef.current.focus()
    }
  }, [ideaPopup.visible])

  const fetchUnderlines = async () => {
    try {
      const res = await fetch(`/api/posts/${post.id}/underlines`)
      if (res.ok) {
        const data = await res.json()
        console.log('[DEBUG] Fetched underlines:', data)
        setUnderlines(data)
      }
    } catch (err) {
      console.error('Failed to fetch underlines:', err)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    // Ignore if clicking on the bubble or popup
    if ((e.target as HTMLElement).closest('.underline-bubble') ||
        (e.target as HTMLElement).closest('.idea-popup')) {
      return
    }

    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || !contentRef.current) {
      // No selection - close bubble if open (but not idea popup)
      if (bubble.visible && bubble.type === 'confirm') {
        setBubble({ visible: false, x: 0, y: 0, type: 'confirm' })
      }
      return
    }

    const selectedText = selection.toString().trim()
    if (!selectedText) return

    const range = selection.getRangeAt(0)
    const startContainer = range.startContainer

    console.log('[DEBUG] Selection:', {
      selectedText,
      startContainer: startContainer.nodeName,
      startContainerText: startContainer.textContent?.substring(0, 50)
    })

    // Find the paragraph element
    let paragraphEl: HTMLElement | null = startContainer.parentElement
    console.log('[DEBUG] Traversing to find P:', {
      startParent: paragraphEl?.tagName,
      startParentClass: paragraphEl?.className
    })
    while (paragraphEl && paragraphEl.tagName !== 'P') {
      paragraphEl = paragraphEl.parentElement
      console.log('[DEBUG] Traversing:', paragraphEl?.tagName)
    }

    if (!paragraphEl) {
      console.log('[DEBUG] No paragraph element found')
      return
    }

    if (!contentRef.current.contains(paragraphEl)) {
      console.log('[DEBUG] Paragraph not in content ref')
      return
    }

    // Get paragraph index
    const paragraphs = contentRef.current.querySelectorAll('p')
    let paragraphIndex = -1
    paragraphs.forEach((p, i) => {
      if (p === paragraphEl) {
        paragraphIndex = i
      }
    })

    console.log('[DEBUG] Paragraph:', {
      paragraphIndex,
      totalParagraphs: paragraphs.length,
      paragraphText: paragraphEl.textContent?.substring(0, 100)
    })

    if (paragraphIndex === -1) return

    // Use the same normalized paragraph text that we render with
    const sourceParagraphs = post.content.split('\n\n')
    const normalizedSourceParagraph = sourceParagraphs[paragraphIndex]?.replace(/\s+/g, ' ') || ''

    // Normalize selected text (browser selection may have different whitespace)
    const normalizedSelected = selectedText.replace(/\s+/g, ' ')

    const normalizedOffset = normalizedSourceParagraph.indexOf(normalizedSelected)

    console.log('[DEBUG] Searching for text:', {
      selectedText,
      normalizedSelected,
      sourceParagraphLength: sourceParagraphs[paragraphIndex]?.length,
      normalizedSourceLength: normalizedSourceParagraph.length,
      normalizedOffset
    })

    if (normalizedOffset === -1) {
      console.log('[DEBUG] Could not find selectedText in paragraph', {
        selectedText,
        normalizedSelected,
        normalizedSourceParagraph: normalizedSourceParagraph.substring(0, 200)
      })
      return
    }

    // Use normalized offsets - both creation and rendering use normalized text
    const startOffset = normalizedOffset
    const endOffset = normalizedOffset + normalizedSelected.length

    console.log('[DEBUG] Offsets:', {
      startOffset,
      endOffset,
      selectedText,
      extractedText: normalizedSourceParagraph.substring(startOffset, endOffset)
    })

    // Get position for bubble
    const rect = range.getBoundingClientRect()
    const contentRect = contentRef.current.getBoundingClientRect()

    setBubble({
      visible: true,
      x: rect.left + rect.width / 2 - contentRect.left,
      y: rect.top - contentRect.top - 10,
      type: 'confirm',
      selectedText,
      paragraphIndex,
      startOffset,
      endOffset
    })
  }

  const handleConfirmUnderline = async () => {
    if (!bubble.selectedText || bubble.paragraphIndex === undefined) return

    try {
      const res = await fetch(`/api/posts/${post.id}/underlines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: bubble.selectedText,
          start_offset: bubble.startOffset,
          end_offset: bubble.endOffset,
          paragraph_index: bubble.paragraphIndex
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
    if (!bubble.underlineId || !ideaText.trim()) {
      closeBubble()
      return
    }

    try {
      await fetch(`/api/underlines/${bubble.underlineId}/ideas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: ideaText })
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

  const handleBadgeClick = async (e: React.MouseEvent, underline: Underline) => {
    e.stopPropagation()

    // Close any existing popup first
    if (ideaPopup.visible) {
      setIdeaPopup({ visible: false, underlineId: null, ideas: [], x: 0, y: 0 })
      return
    }

    // Fetch ideas for this underline
    try {
      const res = await fetch(`/api/underlines/${underline.id}/ideas`)
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
    if (!ideaPopup.underlineId || !newIdeaText.trim()) return

    try {
      const res = await fetch(`/api/underlines/${ideaPopup.underlineId}/ideas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newIdeaText })
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
    try {
      const res = await fetch(`/api/ideas/${ideaId}`, { method: 'DELETE' })
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

  const handleStartEditIdea = (idea: Idea) => {
    setEditingIdeaId(idea.id)
    setEditingIdeaText(idea.content)
  }

  const handleSaveEditIdea = async () => {
    if (!editingIdeaId || !editingIdeaText.trim()) {
      setEditingIdeaId(null)
      return
    }

    try {
      const res = await fetch(`/api/ideas/${editingIdeaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
    if (!ideaPopup.underlineId) return

    try {
      const res = await fetch(`/api/underlines/${ideaPopup.underlineId}`, { method: 'DELETE' })
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

  // text is already normalized (whitespace collapsed)
  const renderParagraphWithUnderlines = (text: string, paragraphIndex: number) => {
    const paragraphUnderlines = underlines
      .filter(u => u.paragraph_index === paragraphIndex)
      .sort((a, b) => a.start_offset - b.start_offset)

    console.log('[DEBUG] renderParagraph:', {
      paragraphIndex,
      textLength: text.length,
      textPreview: text.substring(0, 100),
      underlineCount: paragraphUnderlines.length,
      underlines: paragraphUnderlines.map(u => ({
        id: u.id,
        start: u.start_offset,
        end: u.end_offset,
        text: u.text,
        extractedFromParagraph: text.substring(u.start_offset, u.end_offset)
      }))
    })

    if (paragraphUnderlines.length === 0) {
      return text
    }

    const parts: React.ReactNode[] = []
    let lastIndex = 0

    paragraphUnderlines.forEach((underline) => {
      // Add text before this underline
      if (underline.start_offset > lastIndex) {
        parts.push(text.slice(lastIndex, underline.start_offset))
      }

      // Add underlined text with badge
      parts.push(
        <span key={underline.id} className="underline-wrapper">
          <span className={`underlined-text ${underline.idea_count > 0 ? 'has-ideas' : ''}`}>
            {text.slice(underline.start_offset, underline.end_offset)}
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

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }

    return parts
  }

  // Normalize paragraphs once - used for both selection and rendering
  const paragraphs = post.content.split('\n\n')
  const normalizedParagraphs = paragraphs.map(p => p.replace(/\s+/g, ' '))

  console.log('[DEBUG] Post content paragraphs:', paragraphs.map((p, i) => ({
    index: i,
    length: p.length,
    normalizedLength: normalizedParagraphs[i].length,
    preview: p.substring(0, 100)
  })))

  return (
    <div className="post-detail" onClick={() => ideaPopup.visible && closeIdeaPopup()}>
      <button className="back-btn" onClick={onBack}>
        ← Back to book
      </button>

      <article>
        <header className="post-detail-header">
          <h1>{post.title}</h1>
          <div className="post-meta">
            <span className="post-date">{formatDate(post.created_at)}</span>
            {post.page_number && <span className="page-number">Page {post.page_number}</span>}
          </div>
        </header>

        {post.page_photo_url && (
          <div className="post-image">
            <img src={post.page_photo_url} alt="Scanned page" />
          </div>
        )}

        <div className="post-content" ref={contentRef} onMouseUp={handleMouseUp}>
          {normalizedParagraphs.map((paragraph, index) => (
            <p key={index}>
              {renderParagraphWithUnderlines(paragraph, index)}
            </p>
          ))}

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
                  <button className="bubble-btn cancel" onClick={closeBubble}>
                    ×
                  </button>
                </div>
              ) : (
                <div className="bubble-idea">
                  <input
                    ref={ideaInputRef}
                    type="text"
                    placeholder="Add your idea..."
                    value={ideaText}
                    onChange={e => setIdeaText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveIdea()
                      if (e.key === 'Escape') handleSkipIdea()
                    }}
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
                <input
                  ref={popupIdeaInputRef}
                  type="text"
                  placeholder="Add new idea..."
                  value={newIdeaText}
                  onChange={e => setNewIdeaText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddIdeaInPopup()
                  }}
                />
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
        </div>
      </article>
    </div>
  )
}

export default PostDetail
