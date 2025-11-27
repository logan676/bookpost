import { useState, useEffect } from 'react'
import { useI18n } from '../i18n'
import EbookReader from './EbookReader'
import EpubReader from './EpubReader'
import type { EbookCategory, Ebook } from '../types'

// Helper to detect if file is EPUB
const isEpubFile = (filePath: string): boolean => {
  return filePath.toLowerCase().endsWith('.epub')
}

export default function EbooksDashboard() {
  const { t, formatCount } = useI18n()
  const [categories, setCategories] = useState<EbookCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<EbookCategory | null>(null)
  const [ebooks, setEbooks] = useState<Ebook[]>([])
  const [selectedEbook, setSelectedEbook] = useState<Ebook | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/ebook-categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Failed to fetch ebook categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEbooks = async (categoryId: number, search?: string) => {
    try {
      const params = new URLSearchParams()
      params.set('category_id', categoryId.toString())
      if (search) params.set('search', search)

      const response = await fetch(`/api/ebooks?${params}`)
      if (response.ok) {
        const data = await response.json()
        setEbooks(data)
      }
    } catch (error) {
      console.error('Failed to fetch ebooks:', error)
    }
  }

  const handleCategoryClick = (category: EbookCategory) => {
    setSelectedCategory(category)
    setSearchTerm('')
    fetchEbooks(category.id)
  }

  const handleBackToCategories = () => {
    setSelectedCategory(null)
    setEbooks([])
    setSearchTerm('')
  }

  const handleEbookClick = (ebook: Ebook) => {
    setSelectedEbook(ebook)
  }

  const handleBackFromReader = () => {
    setSelectedEbook(null)
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    if (selectedCategory) {
      fetchEbooks(selectedCategory.id, term)
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  // Show ebook reader - use EpubReader for EPUB files, EbookReader for PDFs
  if (selectedEbook) {
    if (isEpubFile(selectedEbook.file_path)) {
      return <EpubReader ebook={selectedEbook} onBack={handleBackFromReader} />
    }
    return <EbookReader ebook={selectedEbook} onBack={handleBackFromReader} />
  }

  // Show ebooks for selected category
  if (selectedCategory) {
    return (
      <div className="magazines-dashboard">
        <div className="sub-view-header">
          <h1 className="sub-view-title">{selectedCategory.name}</h1>
          <div className="sub-view-nav">
            <button className="back-btn" onClick={handleBackToCategories}>
              {t.back}
            </button>
            <span className="item-count">{formatCount(t.ebooksCount, ebooks.length)}</span>
          </div>
        </div>

        <div className="filters">
          <input
            type="text"
            placeholder={t.searchEbooks}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="magazine-grid">
          {ebooks.map((ebook) => (
            <div
              key={ebook.id}
              className="magazine-card"
              onClick={() => handleEbookClick(ebook)}
            >
              <div className="magazine-cover">
                {ebook.cover_url ? (
                  <img src={ebook.cover_url} alt={ebook.title} />
                ) : (
                  <div className="magazine-placeholder">
                    <span>{isEpubFile(ebook.file_path) ? 'EPUB' : 'PDF'}</span>
                  </div>
                )}
              </div>
              <div className="magazine-info">
                <h3 className="magazine-title">{ebook.title}</h3>
                <div className="magazine-meta">
                  <span className="size">{formatFileSize(ebook.file_size)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {ebooks.length === 0 && (
          <div className="empty-state">
            <p>{t.noEbooksFound}</p>
          </div>
        )}
      </div>
    )
  }

  // Show categories list
  return (
    <div className="magazines-dashboard no-header">
      {loading ? (
        <div className="loading">{t.loadingCategories}</div>
      ) : categories.length === 0 ? (
        <div className="empty-state">
          <h2>{t.noEbooksFound}</h2>
        </div>
      ) : (
        <div className="publisher-grid">
          {categories.map((category) => (
            <div
              key={category.id}
              className="publisher-card"
              onClick={() => handleCategoryClick(category)}
            >
              <div className="publisher-icon">
                <span>{category.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="publisher-info">
                <h3 className="publisher-name">{category.name}</h3>
                <span className="publisher-count">{formatCount(t.ebooksCount, category.ebook_count)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
