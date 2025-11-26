import type { Book, BlogPost, ScanResult, Underline, Idea } from '../types'

// Change this to your server IP when running on a device
const API_BASE = __DEV__ ? 'http://localhost:3001/api' : 'https://your-production-server.com/api'

class ApiService {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl
  }

  setBaseUrl(url: string) {
    this.baseUrl = url
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Books
  async getBooks(): Promise<Book[]> {
    return this.request<Book[]>('/books')
  }

  async getBook(id: number): Promise<Book> {
    return this.request<Book>(`/books/${id}`)
  }

  async createBook(data: Partial<Book>): Promise<Book> {
    return this.request<Book>('/books', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async scanBookCover(photo: { uri: string; type: string; name: string }): Promise<ScanResult> {
    const formData = new FormData()
    formData.append('photo', photo as any)

    const response = await fetch(`${this.baseUrl}/books/scan`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    if (!response.ok) {
      throw new Error('Failed to scan book cover')
    }

    return response.json()
  }

  // Posts
  async getPosts(): Promise<BlogPost[]> {
    return this.request<BlogPost[]>('/posts')
  }

  async getPost(id: number): Promise<BlogPost> {
    return this.request<BlogPost>(`/posts/${id}`)
  }

  async scanPage(bookId: number, photo: { uri: string; type: string; name: string }): Promise<BlogPost> {
    const formData = new FormData()
    formData.append('photo', photo as any)

    const response = await fetch(`${this.baseUrl}/books/${bookId}/scan-page`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    if (!response.ok) {
      throw new Error('Failed to scan page')
    }

    return response.json()
  }

  // Underlines
  async getUnderlines(postId: number): Promise<Underline[]> {
    return this.request<Underline[]>(`/posts/${postId}/underlines`)
  }

  async createUnderline(postId: number, data: {
    text: string
    start_offset: number
    end_offset: number
    paragraph_index: number
  }): Promise<Underline> {
    return this.request<Underline>(`/posts/${postId}/underlines`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Ideas
  async getIdeas(underlineId: number): Promise<Idea[]> {
    return this.request<Idea[]>(`/underlines/${underlineId}/ideas`)
  }

  async createIdea(underlineId: number, content: string): Promise<Idea> {
    return this.request<Idea>(`/underlines/${underlineId}/ideas`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    })
  }
}

export const api = new ApiService()
export default api
