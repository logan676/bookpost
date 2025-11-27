export interface Book {
  id: number
  title: string
  author: string
  cover_url?: string
  cover_photo_url?: string
  isbn?: string
  publisher?: string
  publish_year?: number
  description?: string
  page_count?: number
  categories?: string
  language?: string
  created_at: string
  posts?: BlogPost[]
}

export interface BlogPost {
  id: number
  book_id: number
  title: string
  content: string
  page_photo_url?: string
  page_number?: number
  extracted_text?: string
  created_at: string
  book_title?: string
  book_author?: string
}

export interface ScanResult {
  cover_photo_url: string
  extracted_text: string
  title?: string
  author?: string
  isbn?: string
  publisher?: string
  publish_year?: number
  description?: string
  page_count?: number
  categories?: string
  language?: string
  cover_url?: string
}

export interface Underline {
  id: number
  post_id: number
  text: string
  start_offset: number
  end_offset: number
  paragraph_index: number
  idea_count: number
  created_at: string
}

export interface Idea {
  id: number
  underline_id: number
  content: string
  created_at: string
}

// Magazine types
export interface Publisher {
  id: number
  name: string
  description?: string
  magazine_count: number
  created_at: string
}

export interface Magazine {
  id: number
  publisher_id: number
  publisher_name?: string
  title: string
  file_path: string
  file_size?: number
  page_count?: number
  year?: number
  issue?: string
  cover_url?: string
  created_at: string
}

export interface MagazineUnderline {
  id: number
  magazine_id: number
  text: string
  page_number: number
  start_offset: number
  end_offset: number
  idea_count: number
  created_at: string
}

export interface MagazineIdea {
  id: number
  underline_id: number
  content: string
  created_at: string
}

// Ebook types
export interface EbookCategory {
  id: number
  name: string
  description?: string
  ebook_count: number
  created_at: string
}

export interface Ebook {
  id: number
  category_id: number
  title: string
  file_path: string
  file_size?: number
  cover_url?: string
  created_at: string
}

// Note types (Thinking feature)
export interface Note {
  id: number
  title: string
  file_path: string
  year?: number
  content_preview?: string
  s3_key?: string
  created_at: string
  content?: string
}

export interface NoteYear {
  year: number
  count: number
}

// Reading History types
export interface ReadingHistoryItem {
  id: number
  user_id: number
  item_type: 'ebook' | 'magazine' | 'book'
  item_id: number
  title: string
  cover_url?: string
  last_page: number
  last_read_at: string
  created_at: string
}

export interface ReadingHistory {
  ebooks: ReadingHistoryItem[]
  magazines: ReadingHistoryItem[]
  books: ReadingHistoryItem[]
}
