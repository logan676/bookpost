import { useState, useEffect } from 'react'
import { useI18n } from '../i18n'
import EbookReader from './EbookReader'
import EpubReader from './EpubReader'
import type { EbookCategory, Ebook } from '../types'

// Helper to get file type from ebook
const getFileType = (ebook: Ebook): 'epub' | 'pdf' => {
  if (ebook.file_type) {
    return ebook.file_type as 'epub' | 'pdf'
  }
  return ebook.file_path.toLowerCase().endsWith('.epub') ? 'epub' : 'pdf'
}

// Helper to detect if file is EPUB
const isEpubFile = (ebook: Ebook): boolean => {
  return getFileType(ebook) === 'epub'
}

export default function EbooksDashboard() {
  const { t, formatCount } = useI18n()
  const [categories, setCategories] = useState<EbookCategory[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [ebooks, setEbooks] = useState<Ebook[]>([])
  const [selectedEbook, setSelectedEbook] = useState<Ebook | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchCategories()
    fetchEbooks()
  }, [])

  useEffect(() => {
    fetchEbooks(selectedCategoryId, searchTerm)
  }, [selectedCategoryId])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/ebook-categories')
      if (response.ok) {
        const result = await response.json()
        const items = result.data || result || []
        // Map camelCase to snake_case for compatibility
        setCategories(items.map((c: Record<string, unknown>) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          ebook_count: c.count || c.ebook_count || 0,
        })))
      }
    } catch (error) {
      console.error('Failed to fetch ebook categories:', error)
    }
  }

  const fetchEbooks = async (categoryId?: number | null, search?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (categoryId) params.set('category', categoryId.toString())
      if (search) params.set('search', search)

      const response = await fetch(`/api/ebooks?${params}`)
      if (response.ok) {
        const result = await response.json()
        const items = result.data || result || []
        // Map camelCase to snake_case for compatibility
        setEbooks(items.map((e: Record<string, unknown>) => ({
          id: e.id,
          title: e.title,
          category_id: e.categoryId || e.category_id,
          file_path: e.filePath || e.file_path,
          file_size: e.fileSize || e.file_size,
          file_type: e.fileType || e.file_type,
          cover_url: e.coverUrl || e.cover_url,
          s3_key: e.s3Key || e.s3_key,
        })))
      }
    } catch (error) {
      console.error('Failed to fetch ebooks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryChange = (categoryId: number | null) => {
    setSelectedCategoryId(categoryId)
  }

  const handleEbookClick = (ebook: Ebook) => {
    setSelectedEbook(ebook)
  }

  const handleBackFromReader = () => {
    setSelectedEbook(null)
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    fetchEbooks(selectedCategoryId, term)
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  // Show ebook reader
  if (selectedEbook) {
    if (isEpubFile(selectedEbook)) {
      return <EpubReader ebook={selectedEbook} onBack={handleBackFromReader} />
    }
    return <EbookReader ebook={selectedEbook} onBack={handleBackFromReader} />
  }

  return (
    <div className="magazines-dashboard no-header">
      <div className="filters">
        <input
          type="text"
          placeholder={t.searchEbooks}
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="search-input"
        />
        <select
          value={selectedCategoryId || ''}
          onChange={(e) => handleCategoryChange(e.target.value ? parseInt(e.target.value) : null)}
          className="year-select"
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name} ({category.ebook_count})
            </option>
          ))}
        </select>
      </div>

      <div className="item-count-bar">
        <span className="item-count">{formatCount(t.ebooksCount, ebooks.length)}</span>
      </div>

      {loading ? (
        <div className="loading">{t.loadingCategories}</div>
      ) : ebooks.length === 0 ? (
        <div className="empty-state">
          <p>{t.noEbooksFound}</p>
        </div>
      ) : (
        <div className="magazine-grid">
          {ebooks.map((ebook) => {
            const fileType = getFileType(ebook)
            const category = categories.find(c => c.id === ebook.category_id)
            return (
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
                      <span>{fileType.toUpperCase()}</span>
                    </div>
                  )}
                </div>
                <div className="magazine-info">
                  <h3 className="magazine-title">{ebook.title}</h3>
                  <div className="magazine-meta">
                    <span className="format">{fileType.toUpperCase()}</span>
                    {category && <span className="category">{category.name}</span>}
                    <span className="size">{formatFileSize(ebook.file_size)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
