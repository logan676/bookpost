import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth'
import type { Book, BlogPost } from '../types'

const API_BASE = '/api'

// API Error class for structured error handling
export class ApiError extends Error {
  code: string
  status: number
  details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
    this.name = 'ApiError'
  }
}

// Generic fetch helper with auth
function useFetchWithAuth() {
  const { token } = useAuth()

  return async (url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    const response = await fetch(`${API_BASE}${url}`, { ...options, headers })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const error = errorData.error || {}
      throw new ApiError(
        response.status,
        error.code || 'UNKNOWN_ERROR',
        error.message || `API Error: ${response.status}`,
        error.details
      )
    }

    const data = await response.json()
    // Handle wrapped response format
    return data.data !== undefined ? data.data : data
  }
}

// Books hooks
export function useBooks() {
  const fetchWithAuth = useFetchWithAuth()
  return useQuery({
    queryKey: ['books'],
    queryFn: () => fetchWithAuth('/books'),
  })
}

export function useBook(id: number | string | undefined) {
  const fetchWithAuth = useFetchWithAuth()
  return useQuery({
    queryKey: ['book', id],
    queryFn: () => fetchWithAuth(`/books/${id}`),
    enabled: !!id,
  })
}

export function useCreateBook() {
  const queryClient = useQueryClient()
  const fetchWithAuth = useFetchWithAuth()

  return useMutation({
    mutationFn: (data: Partial<Book>) => fetchWithAuth('/books', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
    },
  })
}

export function useUpdateBook() {
  const queryClient = useQueryClient()
  const fetchWithAuth = useFetchWithAuth()

  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Book> & { id: number }) =>
      fetchWithAuth(`/books/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['book', variables.id] })
    },
  })
}

export function useDeleteBook() {
  const queryClient = useQueryClient()
  const fetchWithAuth = useFetchWithAuth()

  return useMutation({
    mutationFn: (id: number) => fetchWithAuth(`/books/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
    },
  })
}

// Posts hooks
export function usePosts(bookId: number | undefined) {
  const fetchWithAuth = useFetchWithAuth()
  return useQuery({
    queryKey: ['posts', bookId],
    queryFn: () => fetchWithAuth(`/posts?book_id=${bookId}`),
    enabled: !!bookId,
  })
}

export function usePost(id: number | string | undefined) {
  const fetchWithAuth = useFetchWithAuth()
  return useQuery({
    queryKey: ['post', id],
    queryFn: () => fetchWithAuth(`/posts/${id}`),
    enabled: !!id,
  })
}

export function useCreatePost() {
  const queryClient = useQueryClient()
  const fetchWithAuth = useFetchWithAuth()

  return useMutation({
    mutationFn: (data: Partial<BlogPost>) => fetchWithAuth('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['posts', variables.book_id] })
      queryClient.invalidateQueries({ queryKey: ['book', variables.book_id] })
    },
  })
}

export function useUpdatePost() {
  const queryClient = useQueryClient()
  const fetchWithAuth = useFetchWithAuth()

  return useMutation({
    mutationFn: ({ id, ...data }: Partial<BlogPost> & { id: number }) =>
      fetchWithAuth(`/posts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['post', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}

export function useDeletePost() {
  const queryClient = useQueryClient()
  const fetchWithAuth = useFetchWithAuth()

  return useMutation({
    mutationFn: (params: { id: number; bookId: number }) =>
      fetchWithAuth(`/posts/${params.id}`, { method: 'DELETE' }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['posts', variables.bookId] })
      queryClient.invalidateQueries({ queryKey: ['book', variables.bookId] })
    },
  })
}

// Magazines hooks
export function useMagazines(params?: { year?: string; category?: string; search?: string }) {
  const fetchWithAuth = useFetchWithAuth()
  const searchParams = new URLSearchParams()
  if (params?.year) searchParams.set('year', params.year)
  if (params?.category) searchParams.set('category', params.category)
  if (params?.search) searchParams.set('search', params.search)
  const query = searchParams.toString()

  return useQuery({
    queryKey: ['magazines', params],
    queryFn: () => fetchWithAuth(`/magazines${query ? `?${query}` : ''}`),
  })
}

export function useMagazineCategories() {
  const fetchWithAuth = useFetchWithAuth()
  return useQuery({
    queryKey: ['magazine-categories'],
    queryFn: () => fetchWithAuth('/magazines/categories'),
  })
}

// Ebooks hooks
export function useEbooks(params?: { category?: string; search?: string }) {
  const fetchWithAuth = useFetchWithAuth()
  const searchParams = new URLSearchParams()
  if (params?.category) searchParams.set('category', params.category)
  if (params?.search) searchParams.set('search', params.search)
  const query = searchParams.toString()

  return useQuery({
    queryKey: ['ebooks', params],
    queryFn: () => fetchWithAuth(`/ebooks${query ? `?${query}` : ''}`),
  })
}

export function useEbookCategories() {
  const fetchWithAuth = useFetchWithAuth()
  return useQuery({
    queryKey: ['ebook-categories'],
    queryFn: () => fetchWithAuth('/ebooks/categories'),
  })
}

// Audio hooks
export function useAudioSeries() {
  const fetchWithAuth = useFetchWithAuth()
  return useQuery({
    queryKey: ['audio-series'],
    queryFn: () => fetchWithAuth('/audio-series/series'),
  })
}

export function useAudioFiles(seriesId?: number, search?: string) {
  const fetchWithAuth = useFetchWithAuth()
  const params = new URLSearchParams()
  if (seriesId) params.set('series_id', seriesId.toString())
  if (search) params.set('search', search)
  const query = params.toString()

  return useQuery({
    queryKey: ['audio-files', seriesId, search],
    queryFn: () => fetchWithAuth(`/audio${query ? `?${query}` : ''}`),
    enabled: seriesId !== undefined,
  })
}

// Lectures hooks
export function useLectureSeries() {
  const fetchWithAuth = useFetchWithAuth()
  return useQuery({
    queryKey: ['lecture-series'],
    queryFn: () => fetchWithAuth('/lectures/series'),
  })
}

export function useLectureFiles(seriesId?: number) {
  const fetchWithAuth = useFetchWithAuth()
  return useQuery({
    queryKey: ['lecture-files', seriesId],
    queryFn: () => fetchWithAuth(`/lectures${seriesId ? `?series_id=${seriesId}` : ''}`),
    enabled: seriesId !== undefined,
  })
}

// Speeches hooks
export function useSpeechSeries() {
  const fetchWithAuth = useFetchWithAuth()
  return useQuery({
    queryKey: ['speech-series'],
    queryFn: () => fetchWithAuth('/speeches/series'),
  })
}

export function useSpeechFiles(seriesId?: number) {
  const fetchWithAuth = useFetchWithAuth()
  return useQuery({
    queryKey: ['speech-files', seriesId],
    queryFn: () => fetchWithAuth(`/speeches${seriesId ? `?series_id=${seriesId}` : ''}`),
    enabled: seriesId !== undefined,
  })
}

// Movies hooks
export function useMovies(params?: { genre?: string; search?: string }) {
  const fetchWithAuth = useFetchWithAuth()
  const searchParams = new URLSearchParams()
  if (params?.genre) searchParams.set('genre', params.genre)
  if (params?.search) searchParams.set('search', params.search)
  const query = searchParams.toString()

  return useQuery({
    queryKey: ['movies', params],
    queryFn: () => fetchWithAuth(`/movies${query ? `?${query}` : ''}`),
  })
}

// TV Shows hooks
export function useTVShows(params?: { genre?: string; search?: string }) {
  const fetchWithAuth = useFetchWithAuth()
  const searchParams = new URLSearchParams()
  if (params?.genre) searchParams.set('genre', params.genre)
  if (params?.search) searchParams.set('search', params.search)
  const query = searchParams.toString()

  return useQuery({
    queryKey: ['tvshows', params],
    queryFn: () => fetchWithAuth(`/tvshows${query ? `?${query}` : ''}`),
  })
}

// Documentaries hooks
export function useDocumentaries(params?: { genre?: string; search?: string }) {
  const fetchWithAuth = useFetchWithAuth()
  const searchParams = new URLSearchParams()
  if (params?.genre) searchParams.set('genre', params.genre)
  if (params?.search) searchParams.set('search', params.search)
  const query = searchParams.toString()

  return useQuery({
    queryKey: ['documentaries', params],
    queryFn: () => fetchWithAuth(`/documentaries${query ? `?${query}` : ''}`),
  })
}

// Animation hooks
export function useAnimation(params?: { genre?: string; search?: string }) {
  const fetchWithAuth = useFetchWithAuth()
  const searchParams = new URLSearchParams()
  if (params?.genre) searchParams.set('genre', params.genre)
  if (params?.search) searchParams.set('search', params.search)
  const query = searchParams.toString()

  return useQuery({
    queryKey: ['animation', params],
    queryFn: () => fetchWithAuth(`/animation${query ? `?${query}` : ''}`),
  })
}

// NBA hooks
export function useNBAGames(params?: { team?: string; season?: string }) {
  const fetchWithAuth = useFetchWithAuth()
  const searchParams = new URLSearchParams()
  if (params?.team) searchParams.set('team', params.team)
  if (params?.season) searchParams.set('season', params.season)
  const query = searchParams.toString()

  return useQuery({
    queryKey: ['nba-games', params],
    queryFn: () => fetchWithAuth(`/nba${query ? `?${query}` : ''}`),
  })
}

export function useNBATeams() {
  const fetchWithAuth = useFetchWithAuth()
  return useQuery({
    queryKey: ['nba-teams'],
    queryFn: () => fetchWithAuth('/nba/teams'),
  })
}

// Thinking/Notes hooks
export function useNotes(params?: { search?: string }) {
  const fetchWithAuth = useFetchWithAuth()
  const searchParams = new URLSearchParams()
  if (params?.search) searchParams.set('search', params.search)
  const query = searchParams.toString()

  return useQuery({
    queryKey: ['notes', params],
    queryFn: () => fetchWithAuth(`/thinking${query ? `?${query}` : ''}`),
  })
}

export function useCreateNote() {
  const queryClient = useQueryClient()
  const fetchWithAuth = useFetchWithAuth()

  return useMutation({
    mutationFn: (data: { title: string; content: string; type?: string }) =>
      fetchWithAuth('/thinking', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })
}

export function useUpdateNote() {
  const queryClient = useQueryClient()
  const fetchWithAuth = useFetchWithAuth()

  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; title?: string; content?: string }) =>
      fetchWithAuth(`/thinking/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })
}

export function useDeleteNote() {
  const queryClient = useQueryClient()
  const fetchWithAuth = useFetchWithAuth()

  return useMutation({
    mutationFn: (id: number) => fetchWithAuth(`/thinking/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })
}

// Global search hook
export function useGlobalSearch(query: string) {
  const fetchWithAuth = useFetchWithAuth()
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => fetchWithAuth(`/search?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
  })
}

// User profile hooks
export function useUserProfile() {
  const fetchWithAuth = useFetchWithAuth()
  return useQuery({
    queryKey: ['user-profile'],
    queryFn: () => fetchWithAuth('/users/me'),
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const fetchWithAuth = useFetchWithAuth()

  return useMutation({
    mutationFn: (data: { username?: string; avatar_url?: string }) =>
      fetchWithAuth('/users/me', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
    },
  })
}

// Reading history hooks
export function useReadingHistory() {
  const fetchWithAuth = useFetchWithAuth()
  return useQuery({
    queryKey: ['reading-history'],
    queryFn: () => fetchWithAuth('/reading-history'),
  })
}

export function useAddToReadingHistory() {
  const queryClient = useQueryClient()
  const fetchWithAuth = useFetchWithAuth()

  return useMutation({
    mutationFn: (data: { book_id?: number; ebook_id?: number; magazine_id?: number; progress?: number }) =>
      fetchWithAuth('/reading-history', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-history'] })
    },
  })
}
