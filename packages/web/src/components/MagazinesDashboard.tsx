import { useState, useEffect } from 'react'
import { useI18n } from '../i18n'
import type { Publisher, Magazine } from '../types'
import MagazineReader from './MagazineReader'

export default function MagazinesDashboard() {
  const { t, formatCount } = useI18n()
  const [publishers, setPublishers] = useState<Publisher[]>([])
  const [selectedPublisherId, setSelectedPublisherId] = useState<number | null>(null)
  const [magazines, setMagazines] = useState<Magazine[]>([])
  const [selectedMagazine, setSelectedMagazine] = useState<Magazine | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [years, setYears] = useState<number[]>([])

  useEffect(() => {
    fetchPublishers()
    fetchMagazines()
  }, [])

  useEffect(() => {
    fetchMagazines(selectedPublisherId, selectedYear, searchTerm)
  }, [selectedPublisherId, selectedYear])

  const fetchPublishers = async () => {
    try {
      const response = await fetch('/api/magazines/publishers')
      if (response.ok) {
        const result = await response.json()
        const items = result.data || result || []
        // Map camelCase to snake_case for compatibility
        setPublishers(items.map((p: Record<string, unknown>) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          magazine_count: p.count || p.magazine_count || 0,
        })))
      }
    } catch (error) {
      console.error('Failed to fetch publishers:', error)
    }
  }

  const fetchMagazines = async (publisherId?: number | null, year?: number | null, search?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (publisherId) params.set('publisher', publisherId.toString())
      if (year !== null && year !== undefined) params.set('year', year.toString())
      if (search) params.set('search', search)

      const response = await fetch(`/api/magazines?${params}`)
      if (response.ok) {
        const result = await response.json()
        const items = result.data || result || []
        // Map camelCase to snake_case for compatibility
        const mappedMagazines = items.map((m: Record<string, unknown>) => ({
          id: m.id,
          title: m.title,
          publisher_id: m.publisherId || m.publisher_id,
          file_path: m.filePath || m.file_path,
          file_size: m.fileSize || m.file_size,
          year: m.year,
          page_count: m.pageCount || m.page_count,
          cover_url: m.coverUrl || m.cover_url,
          preprocessed: m.preprocessed,
          s3_key: m.s3Key || m.s3_key,
        }))
        setMagazines(mappedMagazines)

        // Extract unique years for filter
        const uniqueYears = [...new Set(mappedMagazines.map((m: Magazine) => m.year).filter((y: number | null | undefined) => y && y > 1900))] as number[]
        setYears(uniqueYears.sort((a, b) => b - a))
      }
    } catch (error) {
      console.error('Failed to fetch magazines:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePublisherChange = (publisherId: number | null) => {
    setSelectedPublisherId(publisherId)
  }

  const handleYearChange = (year: number | null) => {
    setSelectedYear(year)
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    fetchMagazines(selectedPublisherId, selectedYear, term)
  }

  const handleMagazineClick = (magazine: Magazine) => {
    setSelectedMagazine(magazine)
  }

  const handleBackFromReader = () => {
    setSelectedMagazine(null)
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  // Show magazine reader
  if (selectedMagazine) {
    return (
      <MagazineReader
        magazine={selectedMagazine}
        onBack={handleBackFromReader}
      />
    )
  }

  return (
    <div className="magazines-dashboard no-header">
      <div className="filters">
        <input
          type="text"
          placeholder={t.searchMagazines}
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="search-input"
        />
        <select
          value={selectedPublisherId || ''}
          onChange={(e) => handlePublisherChange(e.target.value ? parseInt(e.target.value) : null)}
          className="year-select"
        >
          <option value="">All Publishers</option>
          {publishers.map((publisher) => (
            <option key={publisher.id} value={publisher.id}>
              {publisher.name} ({publisher.magazine_count})
            </option>
          ))}
        </select>
        <select
          value={selectedYear || ''}
          onChange={(e) => handleYearChange(e.target.value ? parseInt(e.target.value) : null)}
          className="year-select"
        >
          <option value="">{t.allYears}</option>
          {years.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      <div className="item-count-bar">
        <span className="item-count">{formatCount(t.magazinesCount, magazines.length)}</span>
      </div>

      {loading ? (
        <div className="loading">{t.loadingPublishers}</div>
      ) : magazines.length === 0 ? (
        <div className="empty-state">
          <p>{t.noMagazinesFound}</p>
        </div>
      ) : (
        <div className="magazine-grid">
          {magazines.map((magazine) => {
            const publisher = publishers.find(p => p.id === magazine.publisher_id)
            return (
              <div
                key={magazine.id}
                className="magazine-card"
                onClick={() => handleMagazineClick(magazine)}
              >
                <div className="magazine-cover">
                  {magazine.cover_url ? (
                    <img src={magazine.cover_url} alt={magazine.title} />
                  ) : (
                    <div className="magazine-placeholder">
                      <span>PDF</span>
                    </div>
                  )}
                </div>
                <div className="magazine-info">
                  <h3 className="magazine-title">{magazine.title}</h3>
                  <div className="magazine-meta">
                    {publisher && <span className="publisher">{publisher.name}</span>}
                    {magazine.year && <span className="year">{magazine.year}</span>}
                    {magazine.page_count && <span className="pages">{formatCount(t.pages, magazine.page_count)}</span>}
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
