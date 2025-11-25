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
