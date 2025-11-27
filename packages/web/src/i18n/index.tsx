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
  // Common
  back: string
  search: string
  loading: string
  addBook: string
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
  notesCount: string
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
  // Auth
  login: string
  register: string
  logout: string
  username: string
  password: string
  loginRequired: string
  loginToAccess: string
}

const en: Translations = {
  appTitle: 'BookPost',
  ebooks: 'Ebooks',
  magazines: 'Magazines',
  bookshelf: 'Bookshelf',
  thinking: 'Thinking',
  back: 'Back',
  search: 'Search',
  loading: 'Loading...',
  addBook: '+ Add Book',
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
  noNotesFound: 'No notes found',
  notesCount: '{count} notes',
  searchNotes: 'Search notes...',
  notes: 'notes',
  writeNote: '+ Write',
  noteTitle: 'Title',
  noteContent: 'Content',
  save: 'Save',
  cancel: 'Cancel',
  yourCollectionEmpty: 'Your collection is empty',
  takePhotoToStart: 'Take a photo of a book cover to get started',
  addFirstBook: '+ Add Your First Book',
  login: 'Login',
  register: 'Register',
  logout: 'Logout',
  username: 'Username',
  password: 'Password',
  loginRequired: 'Login Required',
  loginToAccess: 'Please login to access this feature',
}

const zh: Translations = {
  appTitle: 'BookPost',
  ebooks: '电子书',
  magazines: '杂志',
  bookshelf: '书架',
  thinking: '思考',
  back: '返回',
  search: '搜索',
  loading: '加载中...',
  addBook: '+ 添加书籍',
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
  noNotesFound: '没有找到笔记',
  notesCount: '{count} 篇笔记',
  searchNotes: '搜索笔记...',
  notes: '篇笔记',
  writeNote: '+ 写笔记',
  noteTitle: '标题',
  noteContent: '内容',
  save: '保存',
  cancel: '取消',
  yourCollectionEmpty: '书架是空的',
  takePhotoToStart: '拍摄书籍封面开始使用',
  addFirstBook: '+ 添加第一本书',
  login: '登录',
  register: '注册',
  logout: '退出',
  username: '用户名',
  password: '密码',
  loginRequired: '需要登录',
  loginToAccess: '请登录后访问此功能',
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
