import { useState, useEffect } from 'react'
import { useAuth } from '../auth'
import { useI18n } from '../i18n'

interface UserProfile {
  user: {
    id: number
    email: string
    isAdmin: boolean
    memberSince: string
  }
  stats: {
    totalBooks: number
    uniqueAuthors: number
    totalNotes: number
    booksWithNotes: number
    totalUnderlines: number
    totalIdeas: number
    magazinesEngaged: number
    notesEngaged: number
    engagementScore: number
    currentStreak: number
  }
  readingByType: Record<string, {
    count: number
    lastActivity: string
    avgProgress: number
  }>
  interests: {
    categories: Array<{ categories: string; count: number }>
    authors: Array<{ author: string; count: number }>
    publishers: Array<{ name: string; engagement_count: number }>
    ebookCategories: Array<{ name: string; read_count: number }>
  }
  activity: {
    recentlyRead: Array<{
      item_type: string
      item_id: number
      title: string
      cover_url: string
      last_page: number
      last_read_at: string
    }>
    dailyActivity: Array<{
      date: string
      sessions: number
      item_type: string
    }>
    topMagazines: Array<{
      id: number
      title: string
      publisher: string
      underline_count: number
    }>
  }
  predictions: {
    readingStyle: string
    strengths: Array<{ area: string; reason: string }>
    areasToExplore: Array<{ area: string; suggestion: string }>
    personalityTraits: Array<{ trait: string; description: string; score: number }>
    recommendedActions: Array<{ action: string; reason: string }>
    tendencies: {
      analytical: number
      curious: number
      focused: number
      engaged: number
    }
  }
}

export default function UserProfilePage() {
  const { token } = useAuth()
  const { t, locale } = useI18n()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'insights'>('overview')

  useEffect(() => {
    fetchProfile()
  }, [token])

  const fetchProfile = async () => {
    if (!token) {
      setError('Please login to view your profile')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to fetch profile')
      const data = await response.json()
      setProfile(data)
    } catch (err) {
      setError('Failed to load profile')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return locale === 'zh' ? '今天' : 'Today'
    if (diffDays === 1) return locale === 'zh' ? '昨天' : 'Yesterday'
    if (diffDays < 7) return locale === 'zh' ? `${diffDays}天前` : `${diffDays} days ago`
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7)
      return locale === 'zh' ? `${weeks}周前` : `${weeks} week${weeks > 1 ? 's' : ''} ago`
    }
    return formatDate(dateString)
  }

  const getItemTypeLabel = (type: string) => {
    const labels: Record<string, { en: string; zh: string }> = {
      ebook: { en: 'Ebook', zh: '电子书' },
      magazine: { en: 'Magazine', zh: '杂志' },
      book: { en: 'Book', zh: '书籍' }
    }
    return labels[type]?.[locale] || type
  }

  const getReadingStyleLabel = (style: string) => {
    const labels: Record<string, { en: string; zh: string }> = {
      analytical: { en: 'Analytical Reader', zh: '分析型读者' },
      collector: { en: 'Knowledge Collector', zh: '知识收集者' },
      balanced: { en: 'Balanced Reader', zh: '均衡型读者' }
    }
    return labels[style]?.[locale] || style
  }

  if (loading) {
    return (
      <div className="user-profile loading">
        <div className="loading-spinner" />
        <p>{locale === 'zh' ? '加载个人资料...' : 'Loading profile...'}</p>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="user-profile error">
        <p>{error || (locale === 'zh' ? '无法加载个人资料' : 'Unable to load profile')}</p>
      </div>
    )
  }

  return (
    <div className="user-profile">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-avatar">
          {profile.user.email[0].toUpperCase()}
        </div>
        <div className="profile-info">
          <h1>{profile.user.email.split('@')[0]}</h1>
          <p className="member-since">
            {locale === 'zh' ? '加入于 ' : 'Member since '}
            {formatDate(profile.user.memberSince)}
          </p>
          {profile.user.isAdmin && (
            <span className="admin-badge">Admin</span>
          )}
        </div>
        <div className="profile-streak">
          <div className="streak-number">{profile.stats.currentStreak}</div>
          <div className="streak-label">{locale === 'zh' ? '天连续阅读' : 'day streak'}</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="profile-tabs">
        <button
          className={`profile-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          {locale === 'zh' ? '概览' : 'Overview'}
        </button>
        <button
          className={`profile-tab ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          {locale === 'zh' ? '活动' : 'Activity'}
        </button>
        <button
          className={`profile-tab ${activeTab === 'insights' ? 'active' : ''}`}
          onClick={() => setActiveTab('insights')}
        >
          {locale === 'zh' ? '洞察' : 'Insights'}
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="profile-content">
          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{profile.stats.totalBooks}</div>
              <div className="stat-label">{locale === 'zh' ? '书籍' : 'Books'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{profile.stats.uniqueAuthors}</div>
              <div className="stat-label">{locale === 'zh' ? '作者' : 'Authors'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{profile.stats.totalNotes}</div>
              <div className="stat-label">{locale === 'zh' ? '笔记' : 'Notes'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{profile.stats.totalUnderlines}</div>
              <div className="stat-label">{locale === 'zh' ? '划线' : 'Underlines'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{profile.stats.totalIdeas}</div>
              <div className="stat-label">{locale === 'zh' ? '想法' : 'Ideas'}</div>
            </div>
            <div className="stat-card highlight">
              <div className="stat-value">{profile.stats.engagementScore}</div>
              <div className="stat-label">{locale === 'zh' ? '参与度' : 'Engagement'}</div>
            </div>
          </div>

          {/* Reading by Type */}
          <div className="section">
            <h2>{locale === 'zh' ? '阅读分布' : 'Reading Distribution'}</h2>
            <div className="reading-types">
              {Object.entries(profile.readingByType).map(([type, data]) => (
                <div key={type} className="reading-type-card">
                  <div className="type-header">
                    <span className="type-name">{getItemTypeLabel(type)}</span>
                    <span className="type-count">{data.count}</span>
                  </div>
                  <div className="type-details">
                    <span>{locale === 'zh' ? '平均进度' : 'Avg progress'}: {data.avgProgress}%</span>
                    <span>{locale === 'zh' ? '最近' : 'Last'}: {getRelativeTime(data.lastActivity)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interests */}
          <div className="section">
            <h2>{locale === 'zh' ? '兴趣领域' : 'Interests'}</h2>

            {profile.interests.categories.length > 0 && (
              <div className="interest-group">
                <h3>{locale === 'zh' ? '书籍分类' : 'Book Categories'}</h3>
                <div className="tags">
                  {profile.interests.categories.map((cat, i) => (
                    <span key={i} className="tag">
                      {cat.categories} <small>({cat.count})</small>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.interests.authors.length > 0 && (
              <div className="interest-group">
                <h3>{locale === 'zh' ? '喜爱的作者' : 'Favorite Authors'}</h3>
                <div className="tags">
                  {profile.interests.authors.map((author, i) => (
                    <span key={i} className="tag">
                      {author.author} <small>({author.count})</small>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.interests.publishers.length > 0 && (
              <div className="interest-group">
                <h3>{locale === 'zh' ? '关注的出版商' : 'Followed Publishers'}</h3>
                <div className="tags">
                  {profile.interests.publishers.map((pub, i) => (
                    <span key={i} className="tag">
                      {pub.name} <small>({pub.engagement_count})</small>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.interests.ebookCategories.length > 0 && (
              <div className="interest-group">
                <h3>{locale === 'zh' ? '电子书分类' : 'Ebook Categories'}</h3>
                <div className="tags">
                  {profile.interests.ebookCategories.map((cat, i) => (
                    <span key={i} className="tag">
                      {cat.name} <small>({cat.read_count})</small>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="profile-content">
          {/* Recently Read */}
          <div className="section">
            <h2>{locale === 'zh' ? '最近阅读' : 'Recently Read'}</h2>
            <div className="recently-read-list">
              {profile.activity.recentlyRead.map((item, i) => (
                <div key={i} className="recently-read-item">
                  {item.cover_url ? (
                    <img src={item.cover_url} alt={item.title} className="item-cover" />
                  ) : (
                    <div className="item-cover placeholder">
                      {item.title[0]}
                    </div>
                  )}
                  <div className="item-info">
                    <div className="item-title">{item.title}</div>
                    <div className="item-meta">
                      <span className="item-type">{getItemTypeLabel(item.item_type)}</span>
                      <span className="item-page">
                        {locale === 'zh' ? `第 ${item.last_page} 页` : `Page ${item.last_page}`}
                      </span>
                    </div>
                    <div className="item-time">{getRelativeTime(item.last_read_at)}</div>
                  </div>
                </div>
              ))}
              {profile.activity.recentlyRead.length === 0 && (
                <p className="empty-message">
                  {locale === 'zh' ? '还没有阅读记录' : 'No reading history yet'}
                </p>
              )}
            </div>
          </div>

          {/* Top Magazines */}
          {profile.activity.topMagazines.length > 0 && (
            <div className="section">
              <h2>{locale === 'zh' ? '热门杂志' : 'Top Magazines'}</h2>
              <div className="top-magazines-list">
                {profile.activity.topMagazines.map((mag, i) => (
                  <div key={i} className="magazine-item">
                    <div className="magazine-rank">#{i + 1}</div>
                    <div className="magazine-info">
                      <div className="magazine-title">{mag.title}</div>
                      <div className="magazine-publisher">{mag.publisher}</div>
                    </div>
                    <div className="magazine-underlines">
                      {mag.underline_count} {locale === 'zh' ? '处划线' : 'underlines'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity Heatmap */}
          <div className="section">
            <h2>{locale === 'zh' ? '活动记录' : 'Activity Log'}</h2>
            <div className="activity-calendar">
              {profile.activity.dailyActivity.length > 0 ? (
                <div className="activity-list">
                  {profile.activity.dailyActivity.slice(0, 14).map((day, i) => (
                    <div key={i} className="activity-day">
                      <span className="day-date">{formatDate(day.date)}</span>
                      <span className="day-type">{getItemTypeLabel(day.item_type)}</span>
                      <span className="day-sessions">{day.sessions} {locale === 'zh' ? '次' : 'sessions'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-message">
                  {locale === 'zh' ? '最近30天没有活动' : 'No activity in the last 30 days'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Insights Tab */}
      {activeTab === 'insights' && (
        <div className="profile-content">
          {/* Reading Style */}
          <div className="section insight-card">
            <h2>{locale === 'zh' ? '阅读风格' : 'Reading Style'}</h2>
            <div className="reading-style">
              <div className="style-badge">{getReadingStyleLabel(profile.predictions.readingStyle)}</div>
            </div>
          </div>

          {/* Tendencies Radar */}
          <div className="section">
            <h2>{locale === 'zh' ? '阅读特质' : 'Reading Tendencies'}</h2>
            <div className="tendencies-grid">
              <div className="tendency-item">
                <div className="tendency-label">{locale === 'zh' ? '分析性' : 'Analytical'}</div>
                <div className="tendency-bar">
                  <div
                    className="tendency-fill"
                    style={{ width: `${profile.predictions.tendencies.analytical}%` }}
                  />
                </div>
                <div className="tendency-value">{Math.round(profile.predictions.tendencies.analytical)}%</div>
              </div>
              <div className="tendency-item">
                <div className="tendency-label">{locale === 'zh' ? '好奇心' : 'Curiosity'}</div>
                <div className="tendency-bar">
                  <div
                    className="tendency-fill"
                    style={{ width: `${profile.predictions.tendencies.curious}%` }}
                  />
                </div>
                <div className="tendency-value">{Math.round(profile.predictions.tendencies.curious)}%</div>
              </div>
              <div className="tendency-item">
                <div className="tendency-label">{locale === 'zh' ? '专注度' : 'Focus'}</div>
                <div className="tendency-bar">
                  <div
                    className="tendency-fill"
                    style={{ width: `${profile.predictions.tendencies.focused}%` }}
                  />
                </div>
                <div className="tendency-value">{Math.round(profile.predictions.tendencies.focused)}%</div>
              </div>
              <div className="tendency-item">
                <div className="tendency-label">{locale === 'zh' ? '参与度' : 'Engagement'}</div>
                <div className="tendency-bar">
                  <div
                    className="tendency-fill highlight"
                    style={{ width: `${profile.predictions.tendencies.engaged}%` }}
                  />
                </div>
                <div className="tendency-value">{Math.round(profile.predictions.tendencies.engaged)}%</div>
              </div>
            </div>
          </div>

          {/* Personality Traits */}
          {profile.predictions.personalityTraits.length > 0 && (
            <div className="section">
              <h2>{locale === 'zh' ? '个性特点' : 'Personality Traits'}</h2>
              <div className="traits-list">
                {profile.predictions.personalityTraits.map((trait, i) => (
                  <div key={i} className="trait-card">
                    <div className="trait-header">
                      <span className="trait-name">{trait.trait}</span>
                      <span className="trait-score">{trait.score}%</span>
                    </div>
                    <p className="trait-description">{trait.description}</p>
                    <div className="trait-bar">
                      <div className="trait-fill" style={{ width: `${trait.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strengths */}
          {profile.predictions.strengths.length > 0 && (
            <div className="section">
              <h2>{locale === 'zh' ? '优势领域' : 'Strengths'}</h2>
              <div className="strengths-list">
                {profile.predictions.strengths.map((strength, i) => (
                  <div key={i} className="strength-item">
                    <div className="strength-area">{strength.area}</div>
                    <div className="strength-reason">{strength.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {profile.predictions.recommendedActions.length > 0 && (
            <div className="section">
              <h2>{locale === 'zh' ? '建议' : 'Recommendations'}</h2>
              <div className="recommendations-list">
                {profile.predictions.recommendedActions.map((rec, i) => (
                  <div key={i} className="recommendation-item">
                    <div className="rec-action">{rec.action}</div>
                    <div className="rec-reason">{rec.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Areas to Explore */}
          {profile.predictions.areasToExplore.length > 0 && (
            <div className="section">
              <h2>{locale === 'zh' ? '待探索领域' : 'Areas to Explore'}</h2>
              <div className="explore-list">
                {profile.predictions.areasToExplore.map((area, i) => (
                  <div key={i} className="explore-item">
                    <div className="explore-area">{area.area}</div>
                    <div className="explore-suggestion">{area.suggestion}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
