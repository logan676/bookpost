import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Locale = 'en' | 'zh'

interface Translations {
  // App
  appTitle: string
  // Tabs
  ebooks: string
  magazines: string
  bookshelf: string
  thinking: string
  more: string
  // Common
  back: string
  search: string
  loading: string
  addBook: string
  all: string
  // Ebooks
  ebooksTitle: string
  loadingCategories: string
  noEbooksFound: string
  ebooksCount: string
  searchEbooks: string
  // Magazines
  magazinesTitle: string
  loadingPublishers: string
  noMagazinesFound: string
  magazinesCount: string
  searchMagazines: string
  allYears: string
  issues: string
  pages: string
  // Thinking
  thinkingTitle: string
  loadingYears: string
  noNotesFound: string
  startWritingHint: string
  notesCount: string
  writeFirstNote: string
  searchNotes: string
  notes: string
  writeNote: string
  noteTitle: string
  noteContent: string
  save: string
  cancel: string
  // Bookshelf
  yourCollectionEmpty: string
  takePhotoToStart: string
  addFirstBook: string
  physicalBooks: string
  // Auth
  login: string
  register: string
  logout: string
  email: string
  password: string
  loginRequired: string
  loginToAccess: string
  // NBA
  loadingSeries: string
  noSeriesFound: string
  noGamesFound: string
  gamesCount: string
  searchGames: string
  allLanguages: string
  seriesLabel: string
  gamesLabel: string
  // Audio
  audio: string
  audioTitle: string
  loadingAudioSeries: string
  noAudioFound: string
  audioCount: string
  searchAudio: string
  nowPlaying: string
  // Lectures
  lectures: string
  lecturesTitle: string
  loadingLectureSeries: string
  noLecturesFound: string
  lectureCount: string
  searchLectures: string
  // Speeches
  speeches: string
  speechesTitle: string
  loadingSpeechSeries: string
  noSpeechesFound: string
  speechCount: string
  searchSpeeches: string
  // Movies
  movies: string
  moviesTitle: string
  loadingMovies: string
  noMoviesFound: string
  movieCount: string
  searchMovies: string
  // TV Shows
  tvshows: string
  tvshowsTitle: string
  loadingTVShows: string
  noTVShowsFound: string
  tvshowCount: string
  searchTVShows: string
  episodeCount: string
  // Documentaries
  documentaries: string
  documentariesTitle: string
  loadingDocumentaries: string
  noDocumentariesFound: string
  documentaryCount: string
  searchDocumentaries: string
  // Animation
  animation: string
  animationTitle: string
  loadingAnimation: string
  noAnimationFound: string
  animationCount: string
  searchAnimation: string
  // Profile
  profile: string
  // Global Search
  searchPlaceholder: string
  searching: string
  noResults: string
  searchHint: string
  searchTips: string
  toNavigate: string
  toSelect: string
  toClose: string
  // Bookshelf
  viewAll: string
  searchBooks: string
  noBooksFound: string
  booksCount: string
  searchContent: string
  myBooks: string
  noReadingHistory: string
  startReadingHint: string
  // Admin Dashboard
  adminDashboard: string
  adminOverview: string
  adminRankings: string
  adminJobs: string
  adminSystem: string
  adminUsers: string
  adminEbooks: string
  adminMagazines: string
  adminUsers2: string
  adminCuratedLists: string
  adminPreprocessed: string
  adminNytLists: string
  adminAmazonLists: string
  adminGoodreadsLists: string
  adminPulitzerAwards: string
  adminBookerAwards: string
  adminNewberyAwards: string
  adminCelebrityLists: string
  adminEditorPick: string
  adminBookSeries: string
  adminWeeklyPick: string
  // Legacy keys kept for backwards compatibility
  adminPlatformLists: string
  adminAwards: string
  adminListsCount: string
  adminNoListsInCategory: string
  adminBooksCount: string
  adminPublished: string
  adminUnpublished: string
  adminClickToUnpublish: string
  adminClickToPublish: string
  adminDeleteList: string
  adminSource: string
  adminYear: string
  adminBooks: string
  adminStatus: string
  adminActive: string
  adminInactive: string
  adminSelectListToView: string
  adminBackgroundJobs: string
  adminRefreshing: string
  adminRefresh: string
  adminRunning: string
  adminIdle: string
  adminLastRun: string
  adminTriggering: string
  adminTriggerNow: string
  adminSystemInfo: string
  adminEnvironment: string
  adminNodeVersion: string
  adminPlatform: string
  adminRuntime: string
  adminUptime: string
  adminLastUpdated: string
  adminMemoryUsage: string
  adminHeapUsed: string
  adminHeapTotal: string
  adminRss: string
  adminUserManagement: string
  adminUsersCount: string
  adminEmail: string
  adminUsername: string
  adminRole: string
  adminJoined: string
  adminActions: string
  adminAdmin: string
  adminUser: string
  adminDemote: string
  adminPromote: string
  adminConfirmDeleteList: string
  adminListActivated: string
  adminListDeactivated: string
  adminFailedUpdateList: string
  adminListDeleted: string
  adminFailedDeleteList: string
  adminJobTriggered: string
  adminFailedTriggerJob: string
  adminUserPromoted: string
  adminUserDemoted: string
  adminFailedUpdateUser: string
  adminJobRefreshHighlights: string
  adminJobAggregateStats: string
  adminJobEnrichMetadata: string
  adminJobComputeRelated: string
  adminJobCleanupCache: string
}

const en: Translations = {
  appTitle: 'BookLibrio',
  ebooks: 'Ebooks',
  magazines: 'Magazines',
  bookshelf: 'Bookshelf',
  thinking: 'Thinking',
  more: 'More',
  back: 'Back',
  search: 'Search',
  loading: 'Loading...',
  addBook: '+ Add Book',
  all: 'All',
  ebooksTitle: 'Ebooks',
  loadingCategories: 'Loading categories...',
  noEbooksFound: 'No ebooks found',
  ebooksCount: '{count} ebooks',
  searchEbooks: 'Search ebooks...',
  magazinesTitle: 'Magazines',
  loadingPublishers: 'Loading publishers...',
  noMagazinesFound: 'No magazines found',
  magazinesCount: '{count} magazines',
  searchMagazines: 'Search magazines...',
  allYears: 'All Years',
  issues: '{count} issues',
  pages: '{count} pages',
  thinkingTitle: 'Thinking',
  loadingYears: 'Loading years...',
  noNotesFound: 'No notes yet',
  startWritingHint: 'Start writing your thoughts and ideas',
  notesCount: '{count} notes',
  searchNotes: 'Search notes...',
  notes: 'notes',
  writeNote: '+ Write',
  writeFirstNote: '+ Write Your First Thought',
  noteTitle: 'Title',
  noteContent: 'Content',
  save: 'Save',
  cancel: 'Cancel',
  yourCollectionEmpty: 'Your collection is empty',
  takePhotoToStart: 'Take a photo of a book cover to get started',
  addFirstBook: '+ Add Your First Book',
  physicalBooks: 'Physical Books',
  login: 'Login',
  register: 'Register',
  logout: 'Logout',
  email: 'Email',
  password: 'Password',
  loginRequired: 'Login Required',
  loginToAccess: 'Please login to access this feature',
  loadingSeries: 'Loading series...',
  noSeriesFound: 'No series found',
  noGamesFound: 'No games found',
  gamesCount: '{count} games',
  searchGames: 'Search games...',
  allLanguages: 'All Languages',
  seriesLabel: 'Series',
  gamesLabel: 'Games',
  audio: 'Audio',
  audioTitle: 'Audio',
  loadingAudioSeries: 'Loading audio series...',
  noAudioFound: 'No audio found',
  audioCount: '{count} audio files',
  searchAudio: 'Search audio...',
  nowPlaying: 'Now Playing',
  lectures: 'Lectures',
  lecturesTitle: 'Lectures',
  loadingLectureSeries: 'Loading lecture series...',
  noLecturesFound: 'No lectures found',
  lectureCount: '{count} videos',
  searchLectures: 'Search lectures...',
  speeches: 'Speeches',
  speechesTitle: 'Speeches',
  loadingSpeechSeries: 'Loading speech series...',
  noSpeechesFound: 'No speeches found',
  speechCount: '{count} videos',
  searchSpeeches: 'Search speeches...',
  movies: 'Movies',
  moviesTitle: 'Movies',
  loadingMovies: 'Loading movies...',
  noMoviesFound: 'No movies found',
  movieCount: '{count} movies',
  searchMovies: 'Search movies...',
  tvshows: 'TV Shows',
  tvshowsTitle: 'TV Shows',
  loadingTVShows: 'Loading TV shows...',
  noTVShowsFound: 'No TV shows found',
  tvshowCount: '{count} shows',
  searchTVShows: 'Search TV shows...',
  episodeCount: '{count} episodes',
  documentaries: 'Docs',
  documentariesTitle: 'Documentaries',
  loadingDocumentaries: 'Loading documentaries...',
  noDocumentariesFound: 'No documentaries found',
  documentaryCount: '{count} series',
  searchDocumentaries: 'Search documentaries...',
  animation: 'Animation',
  animationTitle: 'Animation',
  loadingAnimation: 'Loading animation...',
  noAnimationFound: 'No animation found',
  animationCount: '{count} series',
  searchAnimation: 'Search animation...',
  profile: 'Profile',
  // Global Search
  searchPlaceholder: 'Search everything...',
  searching: 'Searching...',
  noResults: 'No results found',
  searchHint: 'Type at least 2 characters to search',
  searchTips: 'Quick Tips',
  toNavigate: 'to navigate',
  toSelect: 'to select',
  toClose: 'to close',
  // Bookshelf
  viewAll: 'View All',
  searchBooks: 'Search books...',
  noBooksFound: 'No books found',
  booksCount: '{count} books',
  searchContent: 'Content',
  myBooks: 'My Books',
  noReadingHistory: 'No reading history',
  startReadingHint: 'Start reading ebooks or magazines to see them here',
  // Admin Dashboard
  adminDashboard: 'Admin Dashboard',
  adminOverview: 'Overview',
  adminRankings: 'Rankings',
  adminJobs: 'Jobs',
  adminSystem: 'System',
  adminUsers: 'Users',
  adminEbooks: 'Ebooks',
  adminMagazines: 'Magazines',
  adminUsers2: 'Users',
  adminCuratedLists: 'Curated Lists',
  adminPreprocessed: 'Preprocessed: {count}',
  adminNytLists: 'NYT Lists',
  adminAmazonLists: 'Amazon',
  adminGoodreadsLists: 'Goodreads',
  adminPulitzerAwards: 'Pulitzer',
  adminBookerAwards: 'Booker',
  adminNewberyAwards: 'Newbery',
  adminCelebrityLists: 'Celebrity Lists',
  adminEditorPick: 'Editor Pick',
  adminBookSeries: 'Book Series',
  adminWeeklyPick: 'Weekly Pick',
  adminListsCount: '{count} lists',
  adminNoListsInCategory: 'No lists in this category',
  adminBooksCount: '{count} books',
  adminPublished: 'Published',
  adminUnpublished: 'Unpublished',
  adminClickToUnpublish: 'Click to unpublish',
  adminClickToPublish: 'Click to publish',
  adminDeleteList: 'Delete List',
  adminSource: 'Source',
  adminYear: 'Year',
  adminBooks: 'Books',
  adminStatus: 'Status',
  adminActive: 'Active',
  adminInactive: 'Inactive',
  adminSelectListToView: 'Select a ranking list to view details',
  adminBackgroundJobs: 'Background Jobs',
  adminRefreshing: 'Refreshing...',
  adminRefresh: 'Refresh',
  adminRunning: 'Running',
  adminIdle: 'Idle',
  adminLastRun: 'Last run',
  adminTriggering: 'Triggering...',
  adminTriggerNow: 'Trigger Now',
  adminSystemInfo: 'System Information',
  adminEnvironment: 'Environment',
  adminNodeVersion: 'Node Version',
  adminPlatform: 'Platform',
  adminRuntime: 'Runtime',
  adminUptime: 'Uptime',
  adminLastUpdated: 'Last Updated',
  adminMemoryUsage: 'Memory Usage',
  adminHeapUsed: 'Heap Used',
  adminHeapTotal: 'Heap Total',
  adminRss: 'RSS',
  adminUserManagement: 'User Management',
  adminUsersCount: '{count} users',
  adminEmail: 'Email',
  adminUsername: 'Username',
  adminRole: 'Role',
  adminJoined: 'Joined',
  adminActions: 'Actions',
  adminAdmin: 'Admin',
  adminUser: 'User',
  adminDemote: 'Demote',
  adminPromote: 'Promote',
  adminConfirmDeleteList: 'Are you sure you want to delete this list?',
  adminListActivated: 'List activated',
  adminListDeactivated: 'List deactivated',
  adminFailedUpdateList: 'Failed to update list',
  adminListDeleted: 'List deleted',
  adminFailedDeleteList: 'Failed to delete list',
  adminJobTriggered: 'Job triggered successfully',
  adminFailedTriggerJob: 'Failed to trigger job',
  adminUserPromoted: 'User promoted to admin',
  adminUserDemoted: 'User demoted to regular user',
  adminFailedUpdateUser: 'Failed to update user',
  adminJobRefreshHighlights: 'Refresh popular book highlights',
  adminJobAggregateStats: 'Aggregate book statistics',
  adminJobEnrichMetadata: 'Enrich book metadata from external sources',
  adminJobComputeRelated: 'Compute related book recommendations',
  adminJobCleanupCache: 'Clean up expired AI cache entries',
}

const zh: Translations = {
  appTitle: 'BookLibrio',
  ebooks: '电子书',
  magazines: '杂志',
  bookshelf: '书架',
  thinking: '思考',
  more: '更多',
  back: '返回',
  search: '搜索',
  loading: '加载中...',
  addBook: '+ 添加书籍',
  all: '全部',
  ebooksTitle: '电子书',
  loadingCategories: '加载分类中...',
  noEbooksFound: '没有找到电子书',
  ebooksCount: '{count} 本电子书',
  searchEbooks: '搜索电子书...',
  magazinesTitle: '杂志',
  loadingPublishers: '加载出版商中...',
  noMagazinesFound: '没有找到杂志',
  magazinesCount: '{count} 本杂志',
  searchMagazines: '搜索杂志...',
  allYears: '全部年份',
  issues: '{count} 期',
  pages: '{count} 页',
  thinkingTitle: '思考',
  loadingYears: '加载年份中...',
  noNotesFound: '还没有笔记',
  startWritingHint: '开始记录你的想法',
  notesCount: '{count} 篇笔记',
  searchNotes: '搜索笔记...',
  notes: '篇笔记',
  writeNote: '+ 写笔记',
  writeFirstNote: '+ 写下你的第一个想法',
  noteTitle: '标题',
  noteContent: '内容',
  save: '保存',
  cancel: '取消',
  yourCollectionEmpty: '书架是空的',
  takePhotoToStart: '拍摄书籍封面开始使用',
  addFirstBook: '+ 添加第一本书',
  physicalBooks: '实体书',
  login: '登录',
  register: '注册',
  logout: '退出',
  email: '邮箱',
  password: '密码',
  loginRequired: '需要登录',
  loginToAccess: '请登录后访问此功能',
  loadingSeries: '加载系列中...',
  noSeriesFound: '没有找到系列',
  noGamesFound: '没有找到比赛',
  gamesCount: '{count} 场比赛',
  searchGames: '搜索比赛...',
  allLanguages: '全部语言',
  seriesLabel: '系列',
  gamesLabel: '场比赛',
  audio: '音频',
  audioTitle: '音频',
  loadingAudioSeries: '加载音频系列中...',
  noAudioFound: '没有找到音频',
  audioCount: '{count} 个音频',
  searchAudio: '搜索音频...',
  nowPlaying: '正在播放',
  lectures: '公开课',
  lecturesTitle: '公开课',
  loadingLectureSeries: '加载公开课系列中...',
  noLecturesFound: '没有找到公开课',
  lectureCount: '{count} 个视频',
  searchLectures: '搜索公开课...',
  speeches: '演讲',
  speechesTitle: '演讲',
  loadingSpeechSeries: '加载演讲系列中...',
  noSpeechesFound: '没有找到演讲',
  speechCount: '{count} 个视频',
  searchSpeeches: '搜索演讲...',
  movies: '电影',
  moviesTitle: '电影',
  loadingMovies: '加载电影中...',
  noMoviesFound: '没有找到电影',
  movieCount: '{count} 部电影',
  searchMovies: '搜索电影...',
  tvshows: '剧集',
  tvshowsTitle: '剧集',
  loadingTVShows: '加载剧集中...',
  noTVShowsFound: '没有找到剧集',
  tvshowCount: '{count} 部剧',
  searchTVShows: '搜索剧集...',
  episodeCount: '{count} 集',
  documentaries: '纪录片',
  documentariesTitle: '纪录片',
  loadingDocumentaries: '加载纪录片中...',
  noDocumentariesFound: '没有找到纪录片',
  documentaryCount: '{count} 部',
  searchDocumentaries: '搜索纪录片...',
  animation: '动画',
  animationTitle: '动画',
  loadingAnimation: '加载动画中...',
  noAnimationFound: '没有找到动画',
  animationCount: '{count} 部',
  searchAnimation: '搜索动画...',
  profile: '个人资料',
  // Global Search
  searchPlaceholder: '搜索全部内容...',
  searching: '搜索中...',
  noResults: '未找到结果',
  searchHint: '请输入至少2个字符',
  searchTips: '快捷提示',
  toNavigate: '导航',
  toSelect: '选择',
  toClose: '关闭',
  // Bookshelf
  viewAll: '查看全部',
  searchBooks: '搜索实体书...',
  noBooksFound: '没有找到实体书',
  booksCount: '{count} 本书',
  searchContent: '内容',
  myBooks: '我的书',
  noReadingHistory: '没有阅读记录',
  startReadingHint: '开始阅读电子书或杂志后会在这里显示',
  // Admin Dashboard
  adminDashboard: '管理后台',
  adminOverview: '概览',
  adminRankings: '榜单管理',
  adminJobs: '后台任务',
  adminSystem: '系统信息',
  adminUsers: '用户管理',
  adminEbooks: '电子书',
  adminMagazines: '杂志',
  adminUsers2: '用户',
  adminCuratedLists: '精选榜单',
  adminPreprocessed: '已预处理: {count}',
  adminNytLists: 'NYT 榜单',
  adminAmazonLists: 'Amazon',
  adminGoodreadsLists: 'Goodreads',
  adminPulitzerAwards: '普利策奖',
  adminBookerAwards: '布克奖',
  adminNewberyAwards: '纽伯瑞奖',
  adminCelebrityLists: '名人书单',
  adminEditorPick: '编辑精选',
  adminBookSeries: '系列丛书',
  adminWeeklyPick: '每周推荐',
  adminListsCount: '{count} 个榜单',
  adminNoListsInCategory: '此分类暂无榜单',
  adminBooksCount: '{count} 本书',
  adminPublished: '已发布',
  adminUnpublished: '未发布',
  adminClickToUnpublish: '点击取消发布',
  adminClickToPublish: '点击发布',
  adminDeleteList: '删除榜单',
  adminSource: '来源',
  adminYear: '年份',
  adminBooks: '书籍',
  adminStatus: '状态',
  adminActive: '已启用',
  adminInactive: '已禁用',
  adminSelectListToView: '选择一个榜单查看详情',
  adminBackgroundJobs: '后台任务',
  adminRefreshing: '刷新中...',
  adminRefresh: '刷新',
  adminRunning: '运行中',
  adminIdle: '空闲',
  adminLastRun: '上次运行',
  adminTriggering: '触发中...',
  adminTriggerNow: '立即执行',
  adminSystemInfo: '系统信息',
  adminEnvironment: '环境',
  adminNodeVersion: 'Node 版本',
  adminPlatform: '平台',
  adminRuntime: '运行时',
  adminUptime: '运行时长',
  adminLastUpdated: '最后更新',
  adminMemoryUsage: '内存使用',
  adminHeapUsed: '堆内存已用',
  adminHeapTotal: '堆内存总量',
  adminRss: 'RSS',
  adminUserManagement: '用户管理',
  adminUsersCount: '{count} 个用户',
  adminEmail: '邮箱',
  adminUsername: '用户名',
  adminRole: '角色',
  adminJoined: '注册时间',
  adminActions: '操作',
  adminAdmin: '管理员',
  adminUser: '普通用户',
  adminDemote: '降级',
  adminPromote: '升级',
  adminConfirmDeleteList: '确定要删除此榜单吗？',
  adminListActivated: '榜单已启用',
  adminListDeactivated: '榜单已禁用',
  adminFailedUpdateList: '更新榜单失败',
  adminListDeleted: '榜单已删除',
  adminFailedDeleteList: '删除榜单失败',
  adminJobTriggered: '任务已触发',
  adminFailedTriggerJob: '触发任务失败',
  adminUserPromoted: '用户已升级为管理员',
  adminUserDemoted: '用户已降级为普通用户',
  adminFailedUpdateUser: '更新用户失败',
  adminJobRefreshHighlights: '刷新热门书籍高亮',
  adminJobAggregateStats: '聚合书籍统计数据',
  adminJobEnrichMetadata: '从外部源丰富书籍元数据',
  adminJobComputeRelated: '计算相关书籍推荐',
  adminJobCleanupCache: '清理过期的 AI 缓存',
}

const translations: Record<Locale, Translations> = { en, zh }

interface I18nContextType {
  locale: Locale
  t: Translations
  setLocale: (locale: Locale) => void
  formatCount: (template: string, count: number) => string
}

const I18nContext = createContext<I18nContextType | null>(null)

function detectLocale(): Locale {
  const browserLang = navigator.language.toLowerCase()
  if (browserLang.startsWith('zh')) {
    return 'zh'
  }
  return 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    const saved = localStorage.getItem('locale') as Locale
    return saved || detectLocale()
  })

  useEffect(() => {
    localStorage.setItem('locale', locale)
  }, [locale])

  const formatCount = (template: string, count: number) => {
    return template.replace('{count}', count.toString())
  }

  return (
    <I18nContext.Provider value={{ locale, t: translations[locale], setLocale, formatCount }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return context
}
