// Navigation types
export type TabParamList = {
  Shelf: undefined
  Ebook: undefined
  Magazine: undefined
  Thinking: undefined
  Me: undefined
}

export type RootStackParamList = {
  MainTabs: undefined
  Login: undefined
  Home: undefined
  BookDetail: { bookId: number }
  PostDetail: { postId: number; bookId: number }
  EbookDetail: { ebookId: number }
  EbookReader: { ebookId: number }
  MagazineDetail: { magazineId: number }
  MagazineReader: { magazineId: number }
  NoteDetail: { noteId: number }
}

// Auth types
export interface User {
  id: number
  email: string
  is_admin?: boolean
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}

// Notes/Thinking types
export interface Note {
  id: number
  title: string
  content_preview?: string
  year?: number
  created_at: string
  author?: string
  publish_date?: string
  tags?: string
  categories?: string
}

export interface NoteContent {
  id: number
  title: string
  content: string
  year?: number
  author?: string
  publish_date?: string
  tags?: string
  categories?: string
  underlines: NoteUnderline[]
  comments: NoteComment[]
}

export interface NoteUnderline {
  id: number
  note_id: number
  text: string
  paragraph_index: number
  start_offset: number
  end_offset: number
  created_at: string
}

export interface NoteIdea {
  id: number
  underline_id: number
  content: string
  created_at: string
}

export interface NoteComment {
  id: number
  note_id: number
  nick: string
  content: string
  original_date?: string
  created_at: string
}

export interface NoteYear {
  year: number
  count: number
}

// Data types
export interface Book {
  id: number
  title: string
  author?: string
  isbn?: string
  cover_url?: string
  created_at: string
}

export interface Post {
  id: number
  book_id: number
  content: string
  page_number?: number
  created_at: string
  updated_at: string
  images?: PostImage[]
}

export interface PostImage {
  id: number
  post_id: number
  image_url: string
  created_at: string
}

export interface EbookCategory {
  id: number
  name: string
  ebook_count?: number
}

export interface Ebook {
  id: number
  title: string
  file_path: string
  file_type?: string
  file_size?: number
  cover_url?: string
  category_id?: number
  created_at: string
}

export interface EbookDetail {
  id: number
  title: string
  author?: string
  description?: string
  publisher?: string
  language?: string
  isbn?: string
  publishDate?: string
  pageCount?: number
  chapterCount?: number
  toc?: { title: string; href?: string; level?: number }[]
  coverUrl?: string
  externalCoverUrl?: string
  fileType?: string
  fileSize?: number
  categoryId?: number
  categoryName?: string
  metadataExtracted: boolean
  metadataExtractedAt?: string
  createdAt?: string
  // External API metadata (Google Books / Open Library)
  averageRating?: number
  ratingsCount?: number
  categories?: string
  subjects?: string[]
  googleBooksId?: string
  openLibraryKey?: string
  previewLink?: string
  infoLink?: string
  externalMetadataSource?: string
  externalMetadataFetchedAt?: string
}

export interface EbookContent {
  chapters: EbookChapter[]
}

export interface EbookChapter {
  title: string
  content: string
}

export interface Publisher {
  id: number
  name: string
  magazine_count?: number
}

export interface Magazine {
  id: number
  title: string
  publisher_id: number
  year?: number
  file_path: string
  cover_url?: string
  page_count?: number
  created_at: string
}

export interface MagazineDetail {
  id: number
  title: string
  publisherId: number
  publisherName: string
  year?: number
  fileSize?: number
  pageCount?: number
  coverUrl?: string
  author?: string
  description?: string
  pdfPublisher?: string
  language?: string
  publishDate?: string
  metadataExtracted?: number
  metadataExtractedAt?: string
  createdAt?: string
}

// Reading History types
export interface ReadingHistoryEntry {
  id: number
  user_id: number
  item_type: 'ebook' | 'magazine' | 'book'
  item_id: number
  title?: string
  cover_url?: string
  last_page?: number
  last_read_at: string
  created_at: string
}

export interface UpdateReadingHistoryRequest {
  itemType: 'ebook' | 'magazine' | 'book'
  itemId: number
  title?: string
  coverUrl?: string
  lastPage?: number
}
