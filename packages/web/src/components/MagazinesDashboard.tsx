import { useState, useEffect } from 'react'
import type { Publisher, Magazine } from '../types'
import MagazineReader from './MagazineReader'

interface YearInfo {
  year: number
  count: number
}

interface Props {
  onBack: () => void
}

// Publishers that should show year subcategories first
const YEAR_CATEGORIZED_PUBLISHERS = ['The Economist', 'MIT Technology Review']

export default function MagazinesDashboard({ onBack }: Props) {
  const [publishers, setPublishers] = useState<Publisher[]>([])
  const [selectedPublisher, setSelectedPublisher] = useState<Publisher | null>(null)
  const [magazines, setMagazines] = useState<Magazine[]>([])
  const [selectedMagazine, setSelectedMagazine] = useState<Magazine | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [years, setYears] = useState<number[]>([])
  const [yearInfos, setYearInfos] = useState<YearInfo[]>([])
  const [showYearSelection, setShowYearSelection] = useState(false)

  useEffect(() => {
    fetchPublishers()
  }, [])

  const fetchPublishers = async () => {
    try {
      const response = await fetch('/api/publishers')
      if (response.ok) {
        const data = await response.json()
        setPublishers(data)
      }
    } catch (error) {
      console.error('Failed to fetch publishers:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMagazines = async (publisherId: number, year?: number | null, search?: string) => {
    try {
      const params = new URLSearchParams()
      params.set('publisher_id', publisherId.toString())
      if (year) params.set('year', year.toString())
      if (search) params.set('search', search)

      const response = await fetch(`/api/magazines?${params}`)
      if (response.ok) {
        const data = await response.json()
        setMagazines(data)

        // Extract unique years
        const uniqueYears = [...new Set(data.map((m: Magazine) => m.year).filter(Boolean))] as number[]
        setYears(uniqueYears.sort((a, b) => b - a))
      }
    } catch (error) {
      console.error('Failed to fetch magazines:', error)
    }
  }

  const fetchYearInfos = async (publisherId: number) => {
    try {
      const response = await fetch(`/api/magazines?publisher_id=${publisherId}`)
      if (response.ok) {
        const data = await response.json()
        // Count magazines per year
        const yearCounts: { [key: number]: number } = {}
        data.forEach((m: Magazine) => {
          if (m.year) {
            yearCounts[m.year] = (yearCounts[m.year] || 0) + 1
          }
        })
        // Convert to array and sort by year descending
        const infos: YearInfo[] = Object.entries(yearCounts)
          .map(([year, count]) => ({ year: parseInt(year), count }))
          .sort((a, b) => b.year - a.year)
        setYearInfos(infos)
      }
    } catch (error) {
      console.error('Failed to fetch year infos:', error)
    }
  }

  const handlePublisherClick = (publisher: Publisher) => {
    setSelectedPublisher(publisher)
    setSelectedYear(null)
    setSearchTerm('')

    // Check if this publisher should show year selection first
    if (YEAR_CATEGORIZED_PUBLISHERS.includes(publisher.name)) {
      setShowYearSelection(true)
      fetchYearInfos(publisher.id)
    } else {
      setShowYearSelection(false)
      fetchMagazines(publisher.id)
    }
  }

  const handleYearClick = (year: number) => {
    setSelectedYear(year)
    setShowYearSelection(false)
    if (selectedPublisher) {
      fetchMagazines(selectedPublisher.id, year)
    }
  }

  const handleBackToPublishers = () => {
    setSelectedPublisher(null)
    setMagazines([])
    setSelectedYear(null)
    setSearchTerm('')
    setShowYearSelection(false)
    setYearInfos([])
  }

  const handleBackToYears = () => {
    setShowYearSelection(true)
    setSelectedYear(null)
    setMagazines([])
    setSearchTerm('')
    if (selectedPublisher) {
      fetchYearInfos(selectedPublisher.id)
    }
  }

  const handleYearChange = (year: number | null) => {
    setSelectedYear(year)
    if (selectedPublisher) {
      fetchMagazines(selectedPublisher.id, year, searchTerm)
    }
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    if (selectedPublisher) {
      fetchMagazines(selectedPublisher.id, selectedYear, term)
    }
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

  // Show year selection for categorized publishers
  if (selectedPublisher && showYearSelection) {
    return (
      <div className="magazines-dashboard">
        <header className="dashboard-header">
          <button className="back-btn" onClick={handleBackToPublishers}>
            Back
          </button>
          <h1>{selectedPublisher.name}</h1>
          <div className="header-actions">
            <span className="magazine-count">{selectedPublisher.magazine_count} magazines</span>
          </div>
        </header>

        <div className="year-grid">
          {yearInfos.map((info) => (
            <div
              key={info.year}
              className="year-card"
              onClick={() => handleYearClick(info.year)}
            >
              <div className="year-number">{info.year}</div>
              <div className="year-count">{info.count} issues</div>
            </div>
          ))}
        </div>

        {yearInfos.length === 0 && (
          <div className="empty-state">
            <p>No magazines found</p>
          </div>
        )}
      </div>
    )
  }

  // Show magazines for selected publisher
  if (selectedPublisher) {
    const isYearCategorized = YEAR_CATEGORIZED_PUBLISHERS.includes(selectedPublisher.name)
    return (
      <div className="magazines-dashboard">
        <header className="dashboard-header">
          <button className="back-btn" onClick={isYearCategorized ? handleBackToYears : handleBackToPublishers}>
            Back
          </button>
          <h1>{selectedPublisher.name}{selectedYear ? ` - ${selectedYear}` : ''}</h1>
          <div className="header-actions">
            <span className="magazine-count">{magazines.length} magazines</span>
          </div>
        </header>

        <div className="filters">
          <input
            type="text"
            placeholder="Search magazines..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
          <select
            value={selectedYear || ''}
            onChange={(e) => handleYearChange(e.target.value ? parseInt(e.target.value) : null)}
            className="year-select"
          >
            <option value="">All Years</option>
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="magazine-grid">
          {magazines.map((magazine) => (
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
                  {magazine.year && <span className="year">{magazine.year}</span>}
                  {magazine.page_count && <span className="pages">{magazine.page_count} pages</span>}
                  <span className="size">{formatFileSize(magazine.file_size)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {magazines.length === 0 && (
          <div className="empty-state">
            <p>No magazines found</p>
          </div>
        )}
      </div>
    )
  }

  // Show publishers list
  return (
    <div className="magazines-dashboard">
      <header className="dashboard-header">
        <button className="back-btn" onClick={onBack}>
          Back
        </button>
        <h1>Magazines</h1>
      </header>

      {loading ? (
        <div className="loading">Loading publishers...</div>
      ) : publishers.length === 0 ? (
        <div className="empty-state">
          <h2>No magazines found</h2>
        </div>
      ) : (
        <div className="publisher-grid">
          {publishers.map((publisher) => (
            <div
              key={publisher.id}
              className="publisher-card"
              onClick={() => handlePublisherClick(publisher)}
            >
              <div className="publisher-icon">
                <span>{publisher.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="publisher-info">
                <h3 className="publisher-name">{publisher.name}</h3>
                {publisher.description && (
                  <p className="publisher-description">{publisher.description}</p>
                )}
                <span className="publisher-count">{publisher.magazine_count} magazines</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
