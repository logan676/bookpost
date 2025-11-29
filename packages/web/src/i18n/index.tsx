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
}

const en: Translations = {
  appTitle: 'BookPost',
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
}

const zh: Translations = {
  appTitle: 'BookPost',
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
