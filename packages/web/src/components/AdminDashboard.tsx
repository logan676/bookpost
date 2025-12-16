import { useState, useEffect } from 'react'
import { useAuth } from '../auth'
import { useI18n } from '../i18n'

interface Stats {
  magazines: { total: number; preprocessed: number }
  ebooks: number
  users: number
  curatedLists: number
}

interface User {
  id: number
  email: string
  username: string
  is_admin: boolean
  created_at: string
}

interface CuratedList {
  id: number
  listType: string
  title: string
  subtitle: string | null
  sourceName: string | null
  sourceLogoUrl: string | null
  year: number | null
  bookCount: number
  isActive: boolean
  isFeatured: boolean
  createdAt: string
  updatedAt: string
}

interface CuratedListItem {
  id: number
  listId: number
  externalTitle: string
  externalAuthor: string
  externalCoverUrl: string | null
  isbn: string | null
  position: number
  editorNote: string | null
}

interface JobStatus {
  [key: string]: {
    running: boolean
    lastRun?: string
  }
}

interface SystemInfo {
  nodeVersion: string
  platform: string
  uptime: number
  memory: {
    heapUsed: number
    heapTotal: number
    external: number
    rss: number
  }
  environment: string
  timestamp: string
}

type TabType = 'overview' | 'rankings' | 'jobs' | 'system' | 'users'

export default function AdminDashboard() {
  const { token } = useAuth()
  const { t, locale, formatCount } = useI18n()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  // Rankings state
  type RankingSubTab = 'nyt' | 'amazon' | 'goodreads' | 'pulitzer' | 'booker' | 'newbery' | 'celebrity' | 'editor_pick' | 'book_series' | 'weekly_pick' | 'ai_collection' | 'kevin_kelly' | 'biography'
  const [rankingSubTab, setRankingSubTab] = useState<RankingSubTab>('nyt')
  const [curatedLists, setCuratedLists] = useState<CuratedList[]>([])
  const [selectedList, setSelectedList] = useState<CuratedList | null>(null)
  const [listItems, setListItems] = useState<CuratedListItem[]>([])
  const [rankingsLoading, setRankingsLoading] = useState(false)

  // Jobs state
  const [jobs, setJobs] = useState<JobStatus>({})
  const [jobsLoading, setJobsLoading] = useState(false)
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null)

  // System state
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [systemLoading, setSystemLoading] = useState(false)

  // Users state
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(false)

  // Message state
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const API_BASE = '/api/admin-dashboard'

  useEffect(() => {
    fetchStats()
  }, [token])

  useEffect(() => {
    if (activeTab === 'rankings') {
      fetchCuratedLists()
    }
    if (activeTab === 'jobs') fetchJobs()
    if (activeTab === 'system') fetchSystemInfo()
    if (activeTab === 'users') fetchUsers()
  }, [activeTab])

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) setStats(await res.json())
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCuratedLists = async () => {
    setRankingsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/curated-lists`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) setCuratedLists(await res.json())
    } catch (err) {
      console.error('Failed to fetch curated lists:', err)
    } finally {
      setRankingsLoading(false)
    }
  }

  const fetchListDetail = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/curated-lists/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setSelectedList(data)
        setListItems(data.items || [])
      }
    } catch (err) {
      console.error('Failed to fetch list detail:', err)
    }
  }

  const toggleListActive = async (list: CuratedList) => {
    try {
      const res = await fetch(`${API_BASE}/curated-lists/${list.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ...list, isActive: !list.isActive })
      })
      if (res.ok) {
        showMessage('success', list.isActive ? t.adminListDeactivated : t.adminListActivated)
        fetchCuratedLists()
      }
    } catch (err) {
      showMessage('error', t.adminFailedUpdateList)
    }
  }

  const deleteList = async (id: number) => {
    if (!confirm(t.adminConfirmDeleteList)) return
    try {
      const res = await fetch(`${API_BASE}/curated-lists/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        showMessage('success', t.adminListDeleted)
        fetchCuratedLists()
        setSelectedList(null)
      }
    } catch (err) {
      showMessage('error', t.adminFailedDeleteList)
    }
  }

  const batchActivateAllLists = async () => {
    if (!confirm(locale === 'zh' ? '确定要上架所有榜单吗？' : 'Are you sure you want to activate all lists?')) return
    try {
      const res = await fetch(`${API_BASE}/curated-lists/batch-activate`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        showMessage('success', locale === 'zh' ? `已上架 ${data.updatedCount} 个榜单` : `Activated ${data.updatedCount} lists`)
        fetchCuratedLists()
      }
    } catch (err) {
      showMessage('error', locale === 'zh' ? '批量上架失败' : 'Failed to batch activate')
    }
  }

  const fetchJobs = async () => {
    setJobsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/jobs`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setJobs(data.data || {})
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err)
    } finally {
      setJobsLoading(false)
    }
  }

  const triggerJob = async (jobName: string) => {
    setTriggeringJob(jobName)
    try {
      const res = await fetch(`${API_BASE}/jobs/${jobName}/trigger`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        showMessage('success', t.adminJobTriggered)
        setTimeout(fetchJobs, 1000)
      } else {
        showMessage('error', t.adminFailedTriggerJob)
      }
    } catch (err) {
      showMessage('error', t.adminFailedTriggerJob)
    } finally {
      setTriggeringJob(null)
    }
  }

  const fetchSystemInfo = async () => {
    setSystemLoading(true)
    try {
      const res = await fetch(`${API_BASE}/system`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) setSystemInfo(await res.json())
    } catch (err) {
      console.error('Failed to fetch system info:', err)
    } finally {
      setSystemLoading(false)
    }
  }

  const fetchUsers = async () => {
    setUsersLoading(true)
    try {
      const res = await fetch(`${API_BASE}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) setUsers(await res.json())
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setUsersLoading(false)
    }
  }

  const toggleUserAdmin = async (user: User) => {
    try {
      const res = await fetch(`${API_BASE}/users/${user.id}/admin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isAdmin: !user.is_admin })
      })
      if (res.ok) {
        showMessage('success', user.is_admin ? t.adminUserDemoted : t.adminUserPromoted)
        fetchUsers()
      }
    } catch (err) {
      showMessage('error', t.adminFailedUpdateUser)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return `${days}d ${hours}h ${mins}m`
  }

  const getListTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      nyt_bestseller: 'NYT Bestseller',
      amazon_best: 'Amazon Best',
      bill_gates: 'Bill Gates',
      goodreads_choice: 'Goodreads Choice',
      pulitzer: 'Pulitzer Prize',
      booker: 'Booker Prize',
      booker_international: 'Booker International',
      newbery: 'Newbery Medal',
      obama_reading: 'Obama Reading',
      national_book: 'National Book Award',
      oprah_book_club: "Oprah's Book Club",
      reese_book_club: "Reese's Book Club",
      editor_pick: 'Editor Pick',
      book_series: 'Book Series',
      weekly_pick: 'Weekly Pick',
      // Custom collections
      ai_ml_collection: 'AI & ML Collection',
      kevin_kelly_collection: 'Kevin Kelly',
      biography_collection: 'Biography Collection',
    }
    return labels[type] || type
  }

  // Define list type categories - individual tabs for each platform and award
  const listTypeCategories: Record<string, string[]> = {
    // Platform lists (individual)
    nyt: ['nyt_bestseller'],
    amazon: ['amazon_best'],
    goodreads: ['goodreads_choice'],
    // Awards (individual)
    pulitzer: ['pulitzer'],
    booker: ['booker', 'booker_international'],
    newbery: ['newbery'],
    // Other categories
    celebrity: ['bill_gates', 'obama_reading', 'oprah_book_club', 'reese_book_club'],
    editor_pick: ['editor_pick'],
    book_series: ['book_series'],
    weekly_pick: ['weekly_pick'],
    // Custom collections
    ai_collection: ['ai_ml_collection'],
    kevin_kelly: ['kevin_kelly_collection'],
    biography: ['biography_collection'],
  }

  // Filter curated lists by category
  const getFilteredLists = (category: RankingSubTab) => {
    const types = listTypeCategories[category] || []
    return curatedLists.filter(list => types.includes(list.listType))
  }

  // Get count for each category
  const getCategoryCount = (category: RankingSubTab) => {
    return getFilteredLists(category).length
  }

  const getJobDescriptions = (): Record<string, string> => ({
    refresh_popular_highlights: t.adminJobRefreshHighlights,
    aggregate_book_stats: t.adminJobAggregateStats,
    enrich_book_metadata: t.adminJobEnrichMetadata,
    compute_related_books: t.adminJobComputeRelated,
    cleanup_expired_ai_cache: t.adminJobCleanupCache,
  })

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="admin-header">
        <h1>{t.adminDashboard}</h1>
        {message && (
          <div className={`message ${message.type}`}>{message.text}</div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="tab-nav">
        {[
          { id: 'overview', label: t.adminOverview },
          { id: 'rankings', label: t.adminRankings },
          { id: 'jobs', label: t.adminJobs },
          { id: 'system', label: t.adminSystem },
          { id: 'users', label: t.adminUsers },
        ].map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id as TabType)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-tab">
            {loading ? (
              <div className="loading">{t.loading}</div>
            ) : stats && (
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">📚</div>
                  <div className="stat-info">
                    <h3>{t.adminEbooks}</h3>
                    <p className="stat-number">{stats.ebooks.toLocaleString()}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📰</div>
                  <div className="stat-info">
                    <h3>{t.adminMagazines}</h3>
                    <p className="stat-number">{stats.magazines.total.toLocaleString()}</p>
                    <p className="stat-sub">{formatCount(t.adminPreprocessed, stats.magazines.preprocessed)}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">👥</div>
                  <div className="stat-info">
                    <h3>{t.adminUsers2}</h3>
                    <p className="stat-number">{stats.users.toLocaleString()}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📋</div>
                  <div className="stat-info">
                    <h3>{t.adminCuratedLists}</h3>
                    <p className="stat-number">{stats.curatedLists.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rankings Tab */}
        {activeTab === 'rankings' && (
          <div className="rankings-tab">
            {/* Sub-tab Navigation */}
            <div className="sub-tab-nav">
              {[
                // Platform lists (individual)
                { id: 'nyt' as RankingSubTab, label: t.adminNytLists },
                { id: 'amazon' as RankingSubTab, label: t.adminAmazonLists },
                { id: 'goodreads' as RankingSubTab, label: t.adminGoodreadsLists },
                // Awards (individual)
                { id: 'pulitzer' as RankingSubTab, label: t.adminPulitzerAwards },
                { id: 'booker' as RankingSubTab, label: t.adminBookerAwards },
                { id: 'newbery' as RankingSubTab, label: t.adminNewberyAwards },
                // Other categories
                { id: 'celebrity' as RankingSubTab, label: t.adminCelebrityLists },
                { id: 'editor_pick' as RankingSubTab, label: t.adminEditorPick },
                { id: 'book_series' as RankingSubTab, label: t.adminBookSeries },
                { id: 'weekly_pick' as RankingSubTab, label: t.adminWeeklyPick },
                // Custom collections
                { id: 'ai_collection' as RankingSubTab, label: locale === 'zh' ? 'AI精选' : 'AI Collection' },
                { id: 'kevin_kelly' as RankingSubTab, label: locale === 'zh' ? '凯文·凯利' : 'Kevin Kelly' },
                { id: 'biography' as RankingSubTab, label: locale === 'zh' ? '传记精选' : 'Biography' },
              ].map(tab => (
                <button
                  key={tab.id}
                  className={`sub-tab-btn ${rankingSubTab === tab.id ? 'active' : ''}`}
                  onClick={() => setRankingSubTab(tab.id)}
                >
                  {tab.label} ({getCategoryCount(tab.id)})
                </button>
              ))}
            </div>

            {/* Rankings Sub-tabs (NYT, Platforms, Awards, Celebrity, etc.) */}
            <div className="rankings-layout">
                {/* List Panel */}
                <div className="rankings-list-panel">
                  <div className="panel-header">
                    <h3>
                      {rankingSubTab === 'nyt' && t.adminNytLists}
                      {rankingSubTab === 'amazon' && t.adminAmazonLists}
                      {rankingSubTab === 'goodreads' && t.adminGoodreadsLists}
                      {rankingSubTab === 'pulitzer' && t.adminPulitzerAwards}
                      {rankingSubTab === 'booker' && t.adminBookerAwards}
                      {rankingSubTab === 'newbery' && t.adminNewberyAwards}
                      {rankingSubTab === 'celebrity' && t.adminCelebrityLists}
                      {rankingSubTab === 'editor_pick' && t.adminEditorPick}
                      {rankingSubTab === 'book_series' && t.adminBookSeries}
                      {rankingSubTab === 'weekly_pick' && t.adminWeeklyPick}
                      {rankingSubTab === 'ai_collection' && (locale === 'zh' ? 'AI与机器学习精选' : 'AI & ML Collection')}
                      {rankingSubTab === 'kevin_kelly' && (locale === 'zh' ? '凯文·凯利作品集' : 'Kevin Kelly Collection')}
                      {rankingSubTab === 'biography' && (locale === 'zh' ? '人物传记精选' : 'Biography Collection')}
                    </h3>
                    <div className="panel-header-actions">
                      <span className="count">{formatCount(t.adminListsCount, getFilteredLists(rankingSubTab).length)}</span>
                      <button
                        className="batch-activate-btn"
                        onClick={batchActivateAllLists}
                        title={locale === 'zh' ? '上架所有榜单' : 'Activate all lists'}
                      >
                        {locale === 'zh' ? '全部上架' : 'Activate All'}
                      </button>
                    </div>
                  </div>
                  {rankingsLoading ? (
                    <div className="loading">{t.loading}</div>
                  ) : (
                    <div className="rankings-list">
                      {getFilteredLists(rankingSubTab).length === 0 ? (
                        <div className="empty-list">
                          <p>{t.adminNoListsInCategory}</p>
                        </div>
                      ) : getFilteredLists(rankingSubTab).map(list => (
                        <div
                          key={list.id}
                          className={`ranking-item ${selectedList?.id === list.id ? 'selected' : ''} ${!list.isActive ? 'inactive' : ''}`}
                          onClick={() => fetchListDetail(list.id)}
                        >
                          <div className="ranking-item-main">
                            <span className="ranking-type">{getListTypeLabel(list.listType)}</span>
                            <h4>{list.title}</h4>
                            <p className="ranking-meta">
                              {formatCount(t.adminBooksCount, list.bookCount)} • {list.year || 'N/A'}
                            </p>
                          </div>
                          <div className="ranking-item-actions">
                            <button
                              className={`publish-status-btn ${list.isActive ? 'published' : 'unpublished'}`}
                              onClick={(e) => { e.stopPropagation(); toggleListActive(list) }}
                              title={list.isActive ? t.adminClickToUnpublish : t.adminClickToPublish}
                            >
                              {list.isActive ? t.adminPublished : t.adminUnpublished}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Detail Panel */}
                <div className="rankings-detail-panel">
                  {selectedList ? (
                    <>
                      <div className="panel-header">
                        <div>
                          <h3>{selectedList.title}</h3>
                          <p className="subtitle">{selectedList.subtitle}</p>
                        </div>
                        <button
                          className="delete-btn"
                          onClick={() => deleteList(selectedList.id)}
                        >
                          {t.adminDeleteList}
                        </button>
                      </div>
                      <div className="list-meta">
                        <span>{t.adminSource}: {selectedList.sourceName || 'Unknown'}</span>
                        <span>{t.adminYear}: {selectedList.year || 'N/A'}</span>
                        <span>{t.adminBooks}: {selectedList.bookCount}</span>
                        <span>{t.adminStatus}: {selectedList.isActive ? t.adminActive : t.adminInactive}</span>
                      </div>
                      <div className="list-items">
                        <h4>{t.adminBooks} ({listItems.length})</h4>
                        {listItems.map((item, index) => (
                          <div key={item.id} className="list-item">
                            <span className="item-rank">#{index + 1}</span>
                            {item.externalCoverUrl && (
                              <img src={item.externalCoverUrl} alt="" className="item-cover" />
                            )}
                            <div className="item-info">
                              <h5>{item.externalTitle}</h5>
                              <p>{item.externalAuthor}</p>
                              {item.editorNote && <p className="editor-note">{item.editorNote}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="empty-state">
                      <p>{t.adminSelectListToView}</p>
                    </div>
                  )}
                </div>
              </div>
          </div>
        )}

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="jobs-tab">
            <div className="panel-header">
              <h3>{t.adminBackgroundJobs}</h3>
              <button className="refresh-btn" onClick={fetchJobs} disabled={jobsLoading}>
                {jobsLoading ? t.adminRefreshing : t.adminRefresh}
              </button>
            </div>
            {jobsLoading && Object.keys(jobs).length === 0 ? (
              <div className="loading">{t.loading}</div>
            ) : (
              <div className="jobs-grid">
                {Object.entries(getJobDescriptions()).map(([jobName, description]) => {
                  const status = jobs[jobName]
                  return (
                    <div key={jobName} className="job-card">
                      <div className="job-header">
                        <h4>{jobName.replace(/_/g, ' ')}</h4>
                        <span className={`job-status ${status?.running ? 'running' : 'idle'}`}>
                          {status?.running ? t.adminRunning : t.adminIdle}
                        </span>
                      </div>
                      <p className="job-description">{description}</p>
                      {status?.lastRun && (
                        <p className="job-last-run">{t.adminLastRun}: {formatDate(status.lastRun)}</p>
                      )}
                      <button
                        className="trigger-btn"
                        onClick={() => triggerJob(jobName)}
                        disabled={triggeringJob === jobName || status?.running}
                      >
                        {triggeringJob === jobName ? t.adminTriggering : t.adminTriggerNow}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* System Tab */}
        {activeTab === 'system' && (
          <div className="system-tab">
            <div className="panel-header">
              <h3>{t.adminSystemInfo}</h3>
              <button className="refresh-btn" onClick={fetchSystemInfo} disabled={systemLoading}>
                {systemLoading ? t.adminRefreshing : t.adminRefresh}
              </button>
            </div>
            {systemLoading && !systemInfo ? (
              <div className="loading">{t.loading}</div>
            ) : systemInfo && (
              <div className="system-grid">
                <div className="system-card">
                  <h4>{t.adminEnvironment}</h4>
                  <div className="system-item">
                    <span>{t.adminNodeVersion}</span>
                    <strong>{systemInfo.nodeVersion}</strong>
                  </div>
                  <div className="system-item">
                    <span>{t.adminPlatform}</span>
                    <strong>{systemInfo.platform}</strong>
                  </div>
                  <div className="system-item">
                    <span>{t.adminEnvironment}</span>
                    <strong className={systemInfo.environment === 'production' ? 'prod' : 'dev'}>
                      {systemInfo.environment}
                    </strong>
                  </div>
                </div>
                <div className="system-card">
                  <h4>{t.adminRuntime}</h4>
                  <div className="system-item">
                    <span>{t.adminUptime}</span>
                    <strong>{formatUptime(systemInfo.uptime)}</strong>
                  </div>
                  <div className="system-item">
                    <span>{t.adminLastUpdated}</span>
                    <strong>{formatDate(systemInfo.timestamp)}</strong>
                  </div>
                </div>
                <div className="system-card">
                  <h4>{t.adminMemoryUsage}</h4>
                  <div className="memory-bar">
                    <div
                      className="memory-used"
                      style={{ width: `${(systemInfo.memory.heapUsed / systemInfo.memory.heapTotal) * 100}%` }}
                    />
                  </div>
                  <div className="system-item">
                    <span>{t.adminHeapUsed}</span>
                    <strong>{systemInfo.memory.heapUsed} MB</strong>
                  </div>
                  <div className="system-item">
                    <span>{t.adminHeapTotal}</span>
                    <strong>{systemInfo.memory.heapTotal} MB</strong>
                  </div>
                  <div className="system-item">
                    <span>{t.adminRss}</span>
                    <strong>{systemInfo.memory.rss} MB</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="users-tab">
            <div className="panel-header">
              <h3>{t.adminUserManagement}</h3>
              <span className="count">{formatCount(t.adminUsersCount, users.length)}</span>
            </div>
            {usersLoading ? (
              <div className="loading">{t.loading}</div>
            ) : (
              <div className="users-table">
                <div className="table-header">
                  <span>{t.adminEmail}</span>
                  <span>{t.adminUsername}</span>
                  <span>{t.adminRole}</span>
                  <span>{t.adminJoined}</span>
                  <span>{t.adminActions}</span>
                </div>
                {users.map(user => (
                  <div key={user.id} className="table-row">
                    <span className="user-email">{user.email}</span>
                    <span>{user.username}</span>
                    <span>
                      <span className={`role-badge ${user.is_admin ? 'admin' : 'user'}`}>
                        {user.is_admin ? t.adminAdmin : t.adminUser}
                      </span>
                    </span>
                    <span>{formatDate(user.created_at)}</span>
                    <span>
                      <button
                        className={`action-btn ${user.is_admin ? 'demote' : 'promote'}`}
                        onClick={() => toggleUserAdmin(user)}
                      >
                        {user.is_admin ? t.adminDemote : t.adminPromote}
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .admin-dashboard {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
          min-height: 100vh;
          background: #f5f7fa;
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .admin-header h1 {
          font-size: 28px;
          color: #1a1a2e;
          margin: 0;
        }

        .message {
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 14px;
          animation: slideIn 0.3s ease;
        }

        .message.success {
          background: #d4edda;
          color: #155724;
        }

        .message.error {
          background: #f8d7da;
          color: #721c24;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Tab Navigation */
        .tab-nav {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          background: white;
          padding: 8px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        .tab-nav .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border: none;
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #666;
          transition: all 0.2s;
        }

        .tab-nav .tab-btn:hover {
          background: #f0f0f0;
        }

        .tab-nav .tab-btn.active {
          background: #007bff;
          color: white;
        }

        /* Tab Content */
        .tab-content {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          min-height: 500px;
        }

        .loading {
          text-align: center;
          padding: 40px;
          color: #888;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .panel-header h3 {
          margin: 0;
          font-size: 18px;
          color: #333;
        }

        .panel-header .count {
          font-size: 14px;
          color: #888;
        }

        .panel-header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .batch-activate-btn {
          padding: 6px 12px;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: background 0.2s;
        }

        .batch-activate-btn:hover {
          background: #218838;
        }

        .refresh-btn {
          padding: 8px 16px;
          background: #f0f0f0;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
        }

        .refresh-btn:hover:not(:disabled) {
          background: #e0e0e0;
        }

        .refresh-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Overview Tab */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          color: white;
        }

        .stat-card:nth-child(2) {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }

        .stat-card:nth-child(3) {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }

        .stat-card:nth-child(4) {
          background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
        }

        .stat-card:nth-child(5) {
          background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
        }

        .stat-icon {
          font-size: 40px;
        }

        .stat-info h3 {
          margin: 0;
          font-size: 14px;
          opacity: 0.9;
        }

        .stat-number {
          font-size: 32px;
          font-weight: 700;
          margin: 4px 0;
        }

        .stat-sub {
          font-size: 12px;
          opacity: 0.8;
          margin: 0;
        }

        /* Rankings Tab */
        .sub-tab-nav {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #eee;
        }

        .sub-tab-btn {
          padding: 10px 20px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 20px;
          cursor: pointer;
          font-size: 14px;
          color: #666;
          transition: all 0.2s;
        }

        .sub-tab-btn:hover {
          border-color: #007bff;
          color: #007bff;
        }

        .sub-tab-btn.active {
          background: #007bff;
          border-color: #007bff;
          color: white;
        }

        .add-btn {
          padding: 8px 16px;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
        }

        .add-btn:hover {
          background: #218838;
        }

        .ranking-badges {
          display: flex;
          gap: 6px;
          margin-bottom: 4px;
        }

        .period-badge {
          font-size: 10px;
          padding: 2px 6px;
          background: #e7f3ff;
          color: #007bff;
          border-radius: 4px;
        }

        .empty-list {
          text-align: center;
          padding: 40px 20px;
          color: #888;
        }

        .empty-list p {
          margin: 0 0 16px;
        }

        .create-btn {
          padding: 10px 20px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }

        .empty-items {
          text-align: center;
          padding: 30px;
          color: #888;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .description {
          margin: 12px 0;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 8px;
          font-size: 14px;
          color: #666;
        }

        .item-stats {
          display: flex;
          gap: 12px;
          margin-top: 4px;
          font-size: 12px;
          color: #888;
        }

        .eval-tag {
          padding: 2px 6px;
          background: #fff3cd;
          color: #856404;
          border-radius: 4px;
        }

        .rank-change {
          font-weight: 600;
        }

        .rank-change.up {
          color: #28a745;
        }

        .rank-change.down {
          color: #dc3545;
        }

        .remove-item-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: none;
          background: #f0f0f0;
          color: #666;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
          margin-left: auto;
        }

        .remove-item-btn:hover {
          background: #dc3545;
          color: white;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #eee;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 18px;
        }

        .close-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: #f0f0f0;
          border-radius: 50%;
          font-size: 20px;
          cursor: pointer;
          color: #666;
        }

        .close-btn:hover {
          background: #e0e0e0;
        }

        .modal-body {
          padding: 24px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-size: 14px;
          font-weight: 500;
          color: #333;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #007bff;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .color-input {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .color-input input[type="color"] {
          width: 40px;
          height: 40px;
          padding: 0;
          border: none;
          cursor: pointer;
        }

        .color-input span {
          font-family: monospace;
          font-size: 14px;
          color: #666;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #eee;
        }

        .cancel-btn {
          padding: 10px 20px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        }

        .cancel-btn:hover {
          background: #f0f0f0;
        }

        .submit-btn {
          padding: 10px 20px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        }

        .submit-btn:hover:not(:disabled) {
          background: #0056b3;
        }

        .submit-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .rankings-layout {
          display: grid;
          grid-template-columns: 400px 1fr;
          gap: 24px;
          height: calc(100vh - 300px);
          min-height: 500px;
        }

        .rankings-list-panel {
          border-right: 1px solid #eee;
          padding-right: 24px;
          overflow-y: auto;
        }

        .rankings-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .ranking-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #f8f9fa;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          border: 2px solid transparent;
        }

        .ranking-item:hover {
          background: #f0f0f0;
        }

        .ranking-item.selected {
          border-color: #007bff;
          background: #e7f3ff;
        }

        .ranking-item.inactive {
          opacity: 0.6;
        }

        .ranking-type {
          font-size: 11px;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .ranking-item h4 {
          margin: 4px 0;
          font-size: 14px;
          color: #333;
        }

        .ranking-meta {
          font-size: 12px;
          color: #666;
          margin: 0;
        }

        .publish-status-btn {
          padding: 6px 12px;
          border-radius: 16px;
          border: none;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .publish-status-btn.published {
          background: #d4edda;
          color: #155724;
        }

        .publish-status-btn.published:hover {
          background: #c3e6cb;
        }

        .publish-status-btn.unpublished {
          background: #f8d7da;
          color: #721c24;
        }

        .publish-status-btn.unpublished:hover {
          background: #f5c6cb;
        }

        .rankings-detail-panel {
          overflow-y: auto;
        }

        .subtitle {
          color: #666;
          font-size: 14px;
          margin: 4px 0 0;
        }

        .delete-btn {
          padding: 8px 16px;
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
        }

        .delete-btn:hover {
          background: #c82333;
        }

        .list-meta {
          display: flex;
          gap: 16px;
          padding: 12px 0;
          border-bottom: 1px solid #eee;
          font-size: 13px;
          color: #666;
        }

        .list-items {
          margin-top: 20px;
        }

        .list-items h4 {
          margin: 0 0 16px;
          color: #333;
        }

        .list-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 8px;
          margin-bottom: 8px;
        }

        .item-rank {
          font-weight: 600;
          color: #007bff;
          min-width: 30px;
        }

        .item-cover {
          width: 40px;
          height: 60px;
          object-fit: cover;
          border-radius: 4px;
        }

        .item-info h5 {
          margin: 0;
          font-size: 14px;
          color: #333;
        }

        .item-info p {
          margin: 4px 0 0;
          font-size: 12px;
          color: #666;
        }

        .editor-note {
          font-style: italic;
          color: #888 !important;
        }

        .empty-state {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 300px;
          color: #888;
        }

        /* Jobs Tab */
        .jobs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 16px;
        }

        .job-card {
          padding: 20px;
          background: #f8f9fa;
          border-radius: 10px;
          border: 1px solid #eee;
        }

        .job-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .job-header h4 {
          margin: 0;
          font-size: 14px;
          color: #333;
          text-transform: capitalize;
        }

        .job-status {
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 12px;
          font-weight: 500;
        }

        .job-status.running {
          background: #cce5ff;
          color: #004085;
        }

        .job-status.idle {
          background: #e2e3e5;
          color: #383d41;
        }

        .job-description {
          font-size: 13px;
          color: #666;
          margin: 0 0 12px;
        }

        .job-last-run {
          font-size: 12px;
          color: #888;
          margin: 0 0 12px;
        }

        .trigger-btn {
          width: 100%;
          padding: 10px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          transition: background 0.2s;
        }

        .trigger-btn:hover:not(:disabled) {
          background: #0056b3;
        }

        .trigger-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        /* System Tab */
        .system-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }

        .system-card {
          padding: 20px;
          background: #f8f9fa;
          border-radius: 10px;
        }

        .system-card h4 {
          margin: 0 0 16px;
          font-size: 14px;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .system-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }

        .system-item:last-child {
          border-bottom: none;
        }

        .system-item span {
          color: #666;
          font-size: 13px;
        }

        .system-item strong {
          color: #333;
          font-size: 13px;
        }

        .system-item strong.prod {
          color: #28a745;
        }

        .system-item strong.dev {
          color: #ffc107;
        }

        .memory-bar {
          height: 8px;
          background: #e0e0e0;
          border-radius: 4px;
          margin-bottom: 16px;
          overflow: hidden;
        }

        .memory-used {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          border-radius: 4px;
          transition: width 0.3s;
        }

        /* Users Tab */
        .users-table {
          border: 1px solid #eee;
          border-radius: 8px;
          overflow: hidden;
        }

        .table-header, .table-row {
          display: grid;
          grid-template-columns: 2fr 1fr 100px 150px 100px;
          padding: 12px 16px;
          align-items: center;
        }

        .table-header {
          background: #f8f9fa;
          font-weight: 600;
          font-size: 13px;
          color: #666;
        }

        .table-row {
          border-top: 1px solid #eee;
          font-size: 13px;
        }

        .table-row:hover {
          background: #f8f9fa;
        }

        .user-email {
          font-weight: 500;
          color: #333;
        }

        .role-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
        }

        .role-badge.admin {
          background: #cce5ff;
          color: #004085;
        }

        .role-badge.user {
          background: #e2e3e5;
          color: #383d41;
        }

        .action-btn {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        .action-btn.promote {
          background: #28a745;
          color: white;
        }

        .action-btn.demote {
          background: #dc3545;
          color: white;
        }

        .action-btn:hover {
          opacity: 0.9;
        }

        /* Responsive */
        @media (max-width: 900px) {
          .rankings-layout {
            grid-template-columns: 1fr;
          }

          .rankings-list-panel {
            border-right: none;
            padding-right: 0;
            border-bottom: 1px solid #eee;
            padding-bottom: 20px;
            max-height: 300px;
          }

          .table-header, .table-row {
            grid-template-columns: 1fr 80px 80px;
          }

          .table-header span:nth-child(2),
          .table-header span:nth-child(4),
          .table-row span:nth-child(2),
          .table-row span:nth-child(4) {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}
