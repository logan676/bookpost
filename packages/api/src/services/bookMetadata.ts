/**
 * Book Metadata Enrichment Service
 *
 * Fetches book metadata from external APIs:
 * - Google Books API (primary)
 * - Open Library API (fallback)
 */

import { db } from '../db/client'
import { ebooks } from '../db/schema'
import { eq } from 'drizzle-orm'

// Types
export interface BookMetadata {
  title?: string
  author?: string
  description?: string
  publisher?: string
  publishedDate?: string
  pageCount?: number
  language?: string
  isbn10?: string
  isbn13?: string
  categories?: string[]
  imageLinks?: {
    thumbnail?: string
    small?: string
    medium?: string
    large?: string
  }
}

export interface EnrichmentResult {
  success: boolean
  source?: 'google_books' | 'open_library' | 'epub_metadata'
  metadata?: BookMetadata
  error?: string
}

// Google Books API
const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes'

interface GoogleBooksResponse {
  totalItems: number
  items?: Array<{
    volumeInfo: {
      title: string
      subtitle?: string
      authors?: string[]
      publisher?: string
      publishedDate?: string
      description?: string
      industryIdentifiers?: Array<{
        type: string
        identifier: string
      }>
      pageCount?: number
      categories?: string[]
      language?: string
      imageLinks?: {
        smallThumbnail?: string
        thumbnail?: string
        small?: string
        medium?: string
        large?: string
      }
    }
  }>
}

/**
 * Search Google Books API by title
 */
async function searchGoogleBooks(title: string, author?: string): Promise<BookMetadata | null> {
  try {
    // Build search query
    let query = `intitle:${encodeURIComponent(title)}`
    if (author) {
      query += `+inauthor:${encodeURIComponent(author)}`
    }

    const url = `${GOOGLE_BOOKS_API}?q=${query}&maxResults=5&printType=books`
    console.log(`[BookMetadata] Searching Google Books: ${url}`)

    const response = await fetch(url)
    if (!response.ok) {
      console.error(`[BookMetadata] Google Books API error: ${response.status}`)
      return null
    }

    const data: GoogleBooksResponse = await response.json()

    if (!data.items || data.items.length === 0) {
      console.log(`[BookMetadata] No results found for: ${title}`)
      return null
    }

    // Find best match (first result is usually most relevant)
    const bestMatch = data.items[0].volumeInfo

    // Extract ISBNs
    let isbn10: string | undefined
    let isbn13: string | undefined
    if (bestMatch.industryIdentifiers) {
      for (const id of bestMatch.industryIdentifiers) {
        if (id.type === 'ISBN_10') isbn10 = id.identifier
        if (id.type === 'ISBN_13') isbn13 = id.identifier
      }
    }

    return {
      title: bestMatch.title + (bestMatch.subtitle ? `: ${bestMatch.subtitle}` : ''),
      author: bestMatch.authors?.join(', '),
      description: bestMatch.description,
      publisher: bestMatch.publisher,
      publishedDate: bestMatch.publishedDate,
      pageCount: bestMatch.pageCount,
      language: bestMatch.language,
      isbn10,
      isbn13,
      categories: bestMatch.categories,
      imageLinks: bestMatch.imageLinks ? {
        thumbnail: bestMatch.imageLinks.thumbnail?.replace('http://', 'https://'),
        small: bestMatch.imageLinks.small?.replace('http://', 'https://'),
        medium: bestMatch.imageLinks.medium?.replace('http://', 'https://'),
        large: bestMatch.imageLinks.large?.replace('http://', 'https://'),
      } : undefined
    }
  } catch (error) {
    console.error('[BookMetadata] Google Books search failed:', error)
    return null
  }
}

// Open Library API (fallback)
const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

interface OpenLibraryResponse {
  numFound: number
  docs: Array<{
    title: string
    author_name?: string[]
    publisher?: string[]
    first_publish_year?: number
    number_of_pages_median?: number
    isbn?: string[]
    language?: string[]
    subject?: string[]
    cover_i?: number
  }>
}

/**
 * Search Open Library API by title
 */
async function searchOpenLibrary(title: string): Promise<BookMetadata | null> {
  try {
    const url = `${OPEN_LIBRARY_SEARCH}?title=${encodeURIComponent(title)}&limit=5`
    console.log(`[BookMetadata] Searching Open Library: ${url}`)

    const response = await fetch(url)
    if (!response.ok) {
      console.error(`[BookMetadata] Open Library API error: ${response.status}`)
      return null
    }

    const data: OpenLibraryResponse = await response.json()

    if (data.numFound === 0 || !data.docs.length) {
      console.log(`[BookMetadata] No Open Library results for: ${title}`)
      return null
    }

    const book = data.docs[0]

    // Get cover image if available
    const imageLinks = book.cover_i ? {
      thumbnail: `https://covers.openlibrary.org/b/id/${book.cover_i}-S.jpg`,
      small: `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`,
      medium: `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`,
    } : undefined

    return {
      title: book.title,
      author: book.author_name?.join(', '),
      publisher: book.publisher?.[0],
      publishedDate: book.first_publish_year?.toString(),
      pageCount: book.number_of_pages_median,
      language: book.language?.[0],
      isbn13: book.isbn?.find(i => i.length === 13),
      isbn10: book.isbn?.find(i => i.length === 10),
      categories: book.subject?.slice(0, 5),
      imageLinks
    }
  } catch (error) {
    console.error('[BookMetadata] Open Library search failed:', error)
    return null
  }
}

/**
 * Clean and normalize title for better search results
 */
function normalizeTitle(title: string): string {
  return title
    // Remove common file extensions
    .replace(/\.(epub|pdf|mobi|azw3?)$/i, '')
    // Remove leading numbers (like "1." or "01 -")
    .replace(/^\d+[\.\-\s]+/, '')
    // Remove underscores and multiple spaces
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    // Remove content in parentheses at the end (often edition info)
    .replace(/\s*\([^)]*\)\s*$/, '')
    // Remove content in brackets at the end
    .replace(/\s*\[[^\]]*\]\s*$/, '')
    .trim()
}

/**
 * Main enrichment function - enriches a single ebook
 */
export async function enrichEbookMetadata(ebookId: number): Promise<EnrichmentResult> {
  try {
    // Get ebook from database
    const [ebook] = await db.select().from(ebooks).where(eq(ebooks.id, ebookId)).limit(1)

    if (!ebook) {
      return { success: false, error: 'Ebook not found' }
    }

    // Normalize the title for search
    const searchTitle = normalizeTitle(ebook.title)
    console.log(`[BookMetadata] Enriching ebook ${ebookId}: "${ebook.title}" -> "${searchTitle}"`)

    // Try Google Books first
    let metadata = await searchGoogleBooks(searchTitle)
    let source: 'google_books' | 'open_library' = 'google_books'

    // Fallback to Open Library if Google Books fails
    if (!metadata) {
      metadata = await searchOpenLibrary(searchTitle)
      source = 'open_library'
    }

    if (!metadata) {
      return { success: false, error: 'No metadata found from any source' }
    }

    // Update database with enriched metadata
    const updateData: Record<string, unknown> = {}

    if (metadata.author && !ebook.author) {
      updateData.author = metadata.author
    }
    if (metadata.description && !ebook.description) {
      updateData.description = metadata.description
    }
    if (metadata.publisher && !ebook.publisher) {
      updateData.publisher = metadata.publisher
    }
    if (metadata.pageCount && !ebook.pageCount) {
      updateData.pageCount = metadata.pageCount
    }
    if (metadata.isbn13 || metadata.isbn10) {
      if (!ebook.isbn) {
        updateData.isbn = metadata.isbn13 || metadata.isbn10
      }
    }
    if (metadata.language) {
      // Map language codes
      const langMap: Record<string, string> = {
        'en': 'en',
        'zh': 'zh',
        'zh-CN': 'zh',
        'zh-TW': 'zh',
        'ja': 'ja',
        'ko': 'ko',
        'fr': 'fr',
        'de': 'de',
        'es': 'es',
      }
      const lang = langMap[metadata.language] || metadata.language
      if (lang !== ebook.language) {
        updateData.language = lang
      }
    }
    if (metadata.publishedDate) {
      // Try to parse the date
      try {
        const date = new Date(metadata.publishedDate)
        if (!isNaN(date.getTime()) && !ebook.publicationDate) {
          updateData.publicationDate = date.toISOString().split('T')[0]
        }
      } catch {
        // If date parsing fails, skip
      }
    }

    // Only update if we have new data
    if (Object.keys(updateData).length > 0) {
      await db.update(ebooks).set(updateData).where(eq(ebooks.id, ebookId))
      console.log(`[BookMetadata] Updated ebook ${ebookId} with:`, Object.keys(updateData))
    } else {
      console.log(`[BookMetadata] No new data to update for ebook ${ebookId}`)
    }

    return {
      success: true,
      source,
      metadata
    }

  } catch (error) {
    console.error(`[BookMetadata] Failed to enrich ebook ${ebookId}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Batch enrichment function - enriches multiple ebooks
 */
export async function enrichEbooksBatch(
  ebookIds: number[],
  options: { delayMs?: number; onProgress?: (processed: number, total: number) => void } = {}
): Promise<{ processed: number; succeeded: number; failed: number; results: Record<number, EnrichmentResult> }> {
  const { delayMs = 500, onProgress } = options
  const results: Record<number, EnrichmentResult> = {}
  let succeeded = 0
  let failed = 0

  for (let i = 0; i < ebookIds.length; i++) {
    const ebookId = ebookIds[i]

    // Add delay between requests to avoid rate limiting
    if (i > 0 && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }

    const result = await enrichEbookMetadata(ebookId)
    results[ebookId] = result

    if (result.success) {
      succeeded++
    } else {
      failed++
    }

    if (onProgress) {
      onProgress(i + 1, ebookIds.length)
    }
  }

  return {
    processed: ebookIds.length,
    succeeded,
    failed,
    results
  }
}

/**
 * Get ebooks that need enrichment (missing metadata)
 */
export async function getEbooksNeedingEnrichment(limit = 100): Promise<number[]> {
  const results = await db
    .select({ id: ebooks.id })
    .from(ebooks)
    .where(eq(ebooks.author, null as unknown as string))
    .limit(limit)

  return results.map(r => r.id)
}
