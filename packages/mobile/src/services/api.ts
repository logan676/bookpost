import type { Book, Post, EbookCategory, Ebook, EbookDetail, EbookContent, Publisher, Magazine, MagazineDetail, User, AuthResponse, Note, NoteContent, NoteYear, NoteUnderline, NoteIdea } from '../types'
import Constants from 'expo-constants'

// Production API URL (Railway)
const PRODUCTION_API_URL = 'https://bookpost-api-production.up.railway.app/api'

// Use cloud server by default, local server for development
const getApiUrl = () => {
  // Check if we're in development mode with Expo
  const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0]

  // Use local server only if explicitly in __DEV__ mode AND debuggerHost is available
  if (__DEV__ && debuggerHost) {
    // Uncomment the line below to use local server during development
    // return `http://${debuggerHost}:3001/api`
  }

  // Default to production (Railway cloud server)
  return PRODUCTION_API_URL
}

const API_BASE_URL = getApiUrl()

class ApiService {
  private baseUrl: string
  private authToken: string | null = null

  constructor() {
    this.baseUrl = API_BASE_URL
  }

  setBaseUrl(url: string) {
    this.baseUrl = url
  }

  setAuthToken(token: string | null) {
    this.authToken = token
  }

  // Get the base server URL (without /api)
  getServerUrl(): string {
    return this.baseUrl.replace(/\/api$/, '')
  }

  // Resolve a relative URL (like /api/r2-covers/...) to an absolute URL
  resolveUrl(url: string | null | undefined): string | null {
    if (!url) return null
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    // Relative URL - prepend server URL
    return `${this.getServerUrl()}${url}`
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options?.headers as Record<string, string>,
    }

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      // Server returns { success: false, error: { code, message, details } }
      const errorMessage = errorData.error?.message || errorData.message || `API Error: ${response.status}`
      const error = new Error(errorMessage)
      ;(error as any).status = response.status
      ;(error as any).code = errorData.error?.code || errorData.code
      throw error
    }
    const json = await response.json()
    // Server wraps successful responses in { success: true, data: ... }
    return json.data !== undefined ? json.data : json
  }

  // Auth
  async login(email: string, password: string): Promise<AuthResponse> {
    return this.fetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async register(email: string, password: string): Promise<AuthResponse> {
    return this.fetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async logout(): Promise<void> {
    await this.fetch<{ message: string }>('/auth/logout', {
      method: 'POST',
    })
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    return this.fetch<AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    })
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      // API returns user data directly in data (not nested in data.user)
      const response = await this.fetch<User>('/auth/me')
      return response
    } catch {
      return null
    }
  }

  // Notes
  async getNotes(year?: number, search?: string): Promise<Note[]> {
    const params = new URLSearchParams()
    if (year) params.set('year', year.toString())
    if (search) params.set('search', search)
    const query = params.toString()
    return this.fetch<Note[]>(`/notes${query ? `?${query}` : ''}`)
  }

  async getNoteYears(): Promise<NoteYear[]> {
    return this.fetch<NoteYear[]>('/notes/years')
  }

  async getNoteContent(id: number): Promise<NoteContent> {
    return this.fetch<NoteContent>(`/notes/${id}/content`)
  }

  async createNote(title: string, content: string): Promise<Note> {
    return this.fetch<Note>('/notes', {
      method: 'POST',
      body: JSON.stringify({ title, content }),
    })
  }

  async createUnderline(noteId: number, data: { text: string; paragraph_index: number; start_offset: number; end_offset: number }): Promise<NoteUnderline> {
    return this.fetch<NoteUnderline>(`/notes/${noteId}/underlines`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getUnderlineIdeas(underlineId: number): Promise<NoteIdea[]> {
    return this.fetch<NoteIdea[]>(`/note-underlines/${underlineId}/ideas`)
  }

  async createIdea(underlineId: number, content: string): Promise<NoteIdea> {
    return this.fetch<NoteIdea>(`/note-underlines/${underlineId}/ideas`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    })
  }

  async deleteUnderline(underlineId: number): Promise<void> {
    await this.fetch(`/note-underlines/${underlineId}`, {
      method: 'DELETE',
    })
  }

  async deleteIdea(ideaId: number): Promise<void> {
    await this.fetch(`/note-ideas/${ideaId}`, {
      method: 'DELETE',
    })
  }

  // Books
  async getBooks(): Promise<Book[]> {
    return this.fetch<Book[]>('/books')
  }

  async getBook(id: number): Promise<Book> {
    return this.fetch<Book>(`/books/${id}`)
  }

  async createBook(book: Partial<Book>): Promise<Book> {
    return this.fetch<Book>('/books', {
      method: 'POST',
      body: JSON.stringify(book),
    })
  }

  // Posts
  async getPosts(bookId: number): Promise<Post[]> {
    return this.fetch<Post[]>(`/books/${bookId}/posts`)
  }

  async createPost(bookId: number, post: Partial<Post>): Promise<Post> {
    return this.fetch<Post>(`/books/${bookId}/posts`, {
      method: 'POST',
      body: JSON.stringify(post),
    })
  }

  // Ebooks
  async getEbookCategories(): Promise<EbookCategory[]> {
    return this.fetch<EbookCategory[]>('/ebook-categories')
  }

  async getEbooks(categoryId?: number, search?: string): Promise<Ebook[]> {
    const params = new URLSearchParams()
    if (categoryId) params.set('category', categoryId.toString())
    if (search) params.set('search', search)
    const query = params.toString()
    return this.fetch<Ebook[]>(`/ebooks${query ? `?${query}` : ''}`)
  }

  async getEbook(id: number): Promise<Ebook> {
    return this.fetch<Ebook>(`/ebooks/${id}`)
  }

  async getEbookText(id: number): Promise<EbookContent> {
    return this.fetch<EbookContent>(`/ebooks/${id}/text`)
  }

  async getEbookDetail(id: number): Promise<EbookDetail> {
    return this.fetch<EbookDetail>(`/ebooks/${id}/detail`)
  }

  getEbookFileUrl(id: number): string {
    return `${this.baseUrl}/ebooks/${id}/file`
  }

  // Magazines
  async getPublishers(): Promise<Publisher[]> {
    return this.fetch<Publisher[]>('/magazines/publishers')
  }

  async getMagazines(publisherId?: number, year?: number, search?: string): Promise<Magazine[]> {
    const params = new URLSearchParams()
    if (publisherId) params.set('publisher', publisherId.toString())
    if (year) params.set('year', year.toString())
    if (search) params.set('search', search)
    const query = params.toString()
    return this.fetch<Magazine[]>(`/magazines${query ? `?${query}` : ''}`)
  }

  async getMagazine(id: number): Promise<Magazine> {
    return this.fetch<Magazine>(`/magazines/${id}`)
  }

  async getMagazineInfo(id: number): Promise<Magazine> {
    return this.fetch<Magazine>(`/magazines/${id}/info`)
  }

  async getMagazineDetail(id: number): Promise<MagazineDetail> {
    return this.fetch<MagazineDetail>(`/magazines/${id}/detail`)
  }

  getMagazinePdfUrl(id: number): string {
    return `${this.baseUrl}/magazines/${id}/pdf`
  }

  getMagazinePageImageUrl(id: number, pageNum: number): string {
    return `${this.baseUrl}/magazines/${id}/page/${pageNum}`
  }
}

export default new ApiService()
