/**
 * BookPost API Client
 * Auto-generated types and client based on OpenAPI spec
 */

// =============================================================================
// Types
// =============================================================================

export interface Ebook {
  id: number
  categoryId: number | null
  title: string
  filePath: string | null
  fileSize: number | null
  fileType: string | null
  normalizedTitle: string | null
  coverUrl: string | null
  s3Key: string | null
  createdAt: string | null
}

export interface EbookCategory {
  id: number
  name: string
  description: string | null
  count?: number
  createdAt?: string | null
}

export interface Magazine {
  id: number
  publisherId: number | null
  title: string
  filePath: string | null
  fileSize: number | null
  year: number | null
  pageCount: number | null
  coverUrl: string | null
  preprocessed: boolean | null
  s3Key: string | null
  createdAt: string | null
}

export interface Publisher {
  id: number
  name: string
  description: string | null
  count?: number
}

export interface User {
  id: number
  username: string
  email: string
  isAdmin: boolean | null
  createdAt: string | null
}

export interface ReadingHistoryEntry {
  id: number
  userId: number | null
  itemType: string
  itemId: number
  title: string | null
  coverUrl: string | null
  lastPage: number | null
  lastReadAt: string | null
  createdAt: string | null
}

export interface AuthResponse {
  data: {
    user: User
    accessToken: string
    refreshToken: string
  }
}

export interface ApiError {
  error: {
    code: string
    message: string
  }
}

// =============================================================================
// API Client
// =============================================================================

export interface ApiClientConfig {
  baseUrl: string
  accessToken?: string
}

export class BookPostApiClient {
  private baseUrl: string
  private accessToken?: string

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '')
    this.accessToken = config.accessToken
  }

  setAccessToken(token: string) {
    this.accessToken = token
  }

  private async request<T>(
    method: string,
    path: string,
    options?: {
      body?: unknown
      params?: Record<string, string | number | undefined>
    }
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`)

    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, String(value))
        }
      })
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    })

    if (!response.ok) {
      const error = await response.json() as ApiError
      throw new Error(error.error?.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // =====================
  // Auth
  // =====================

  async register(data: { username: string; email: string; password: string }) {
    return this.request<AuthResponse>('POST', '/api/auth/register', { body: data })
  }

  async login(data: { email: string; password: string }) {
    return this.request<AuthResponse>('POST', '/api/auth/login', { body: data })
  }

  async refreshToken(refreshToken: string) {
    return this.request<{ data: { accessToken: string; refreshToken: string } }>(
      'POST',
      '/api/auth/refresh',
      { body: { refreshToken } }
    )
  }

  async getMe() {
    return this.request<{ data: User }>('GET', '/api/auth/me')
  }

  // =====================
  // Ebooks
  // =====================

  async getEbooks(params?: {
    category?: number
    search?: string
    limit?: number
    offset?: number
  }) {
    return this.request<{ data: Ebook[]; total: number }>('GET', '/api/ebooks', { params })
  }

  async getEbook(id: number) {
    return this.request<{ data: Ebook }>('GET', `/api/ebooks/${id}`)
  }

  async getEbookCategories() {
    return this.request<{ data: EbookCategory[] }>('GET', '/api/ebook-categories')
  }

  // =====================
  // Magazines
  // =====================

  async getMagazines(params?: {
    publisher?: number
    search?: string
    year?: number
    limit?: number
    offset?: number
  }) {
    return this.request<{ data: Magazine[]; total: number }>('GET', '/api/magazines', { params })
  }

  async getMagazine(id: number) {
    return this.request<{ data: Magazine }>('GET', `/api/magazines/${id}`)
  }

  async getMagazinePublishers() {
    return this.request<{ data: Publisher[] }>('GET', '/api/magazines/publishers')
  }

  // =====================
  // Reading History
  // =====================

  async getReadingHistory(limit?: number) {
    return this.request<{ data: ReadingHistoryEntry[] }>('GET', '/api/reading-history', {
      params: { limit },
    })
  }

  async updateReadingHistory(data: {
    itemType: 'ebook' | 'magazine' | 'book'
    itemId: number
    title?: string
    coverUrl?: string
    lastPage?: number
  }) {
    return this.request<ReadingHistoryEntry>('POST', '/api/reading-history', { body: data })
  }

  // =====================
  // Health
  // =====================

  async health() {
    return this.request<{ status: string; timestamp: string }>('GET', '/api/health')
  }
}

// Default export for convenience
export function createApiClient(baseUrl: string, accessToken?: string) {
  return new BookPostApiClient({ baseUrl, accessToken })
}
