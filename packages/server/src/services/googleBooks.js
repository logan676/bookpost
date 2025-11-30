/**
 * Google Books API Service
 * Fetches comprehensive book metadata including ratings, descriptions, and more
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '../../../../.env') })

const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY

/**
 * Search for a book by query string
 * @param {string} query - Search query (title, author, isbn)
 * @returns {Promise<Object|null>} Book metadata or null
 */
export async function searchGoogleBooks(query) {
  if (!GOOGLE_BOOKS_API_KEY) {
    console.warn('[GoogleBooks] API key not configured')
    return null
  }

  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${GOOGLE_BOOKS_API_KEY}&maxResults=5`
    const response = await fetch(url)
    const data = await response.json()

    if (!data.items || data.items.length === 0) {
      return null
    }

    // Find the best match (prefer items with more complete data)
    const book = findBestMatch(data.items, query)
    if (!book) return null

    const volumeInfo = book.volumeInfo || {}

    return {
      // Basic info
      googleBooksId: book.id,
      title: volumeInfo.title || '',
      subtitle: volumeInfo.subtitle || '',
      author: volumeInfo.authors ? volumeInfo.authors.join(', ') : '',
      publisher: volumeInfo.publisher || '',
      publishDate: volumeInfo.publishedDate || '',
      publishYear: volumeInfo.publishedDate ? parseInt(volumeInfo.publishedDate.substring(0, 4)) : null,
      description: volumeInfo.description || '',
      pageCount: volumeInfo.pageCount || null,

      // Categories and language
      categories: volumeInfo.categories ? volumeInfo.categories.join(', ') : '',
      language: volumeInfo.language || '',

      // Ratings
      averageRating: volumeInfo.averageRating || null,
      ratingsCount: volumeInfo.ratingsCount || null,

      // Identifiers
      isbn13: volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier || '',
      isbn10: volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_10')?.identifier || '',
      isbn: volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier ||
            volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_10')?.identifier || '',

      // Images (prefer larger images)
      coverUrl: volumeInfo.imageLinks?.large?.replace('http:', 'https:') ||
                volumeInfo.imageLinks?.medium?.replace('http:', 'https:') ||
                volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') ||
                volumeInfo.imageLinks?.smallThumbnail?.replace('http:', 'https:') || '',

      // Links
      previewLink: volumeInfo.previewLink?.replace('http:', 'https:') || '',
      infoLink: volumeInfo.infoLink?.replace('http:', 'https:') || '',

      // Additional metadata
      maturityRating: volumeInfo.maturityRating || '',
      printType: volumeInfo.printType || '',

      // Source
      source: 'google_books'
    }
  } catch (error) {
    console.error('[GoogleBooks] API error:', error.message)
    return null
  }
}

/**
 * Search by ISBN specifically (more accurate)
 * @param {string} isbn - ISBN-10 or ISBN-13
 * @returns {Promise<Object|null>}
 */
export async function searchByIsbn(isbn) {
  if (!isbn) return null
  // Clean ISBN
  const cleanIsbn = isbn.replace(/[-\s]/g, '')
  return searchGoogleBooks(`isbn:${cleanIsbn}`)
}

/**
 * Search by title and author (more accurate than title alone)
 * @param {string} title - Book title
 * @param {string} author - Author name (optional)
 * @returns {Promise<Object|null>}
 */
export async function searchByTitleAuthor(title, author = '') {
  if (!title) return null

  // Clean title - remove common file extensions and noise
  let cleanTitle = title
    .replace(/\.(epub|pdf|mobi|azw3?)$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Build search query
  let query = `intitle:${cleanTitle}`
  if (author) {
    query += ` inauthor:${author}`
  }

  return searchGoogleBooks(query)
}

/**
 * Find the best matching book from search results
 * @param {Array} items - Array of book items from API
 * @param {string} query - Original search query
 * @returns {Object|null}
 */
function findBestMatch(items, query) {
  if (!items || items.length === 0) return null

  const queryLower = query.toLowerCase()

  // Score each item based on completeness and relevance
  const scored = items.map(item => {
    const volumeInfo = item.volumeInfo || {}
    let score = 0

    // Title match
    if (volumeInfo.title) {
      const titleLower = volumeInfo.title.toLowerCase()
      if (titleLower === queryLower) score += 100
      else if (titleLower.includes(queryLower) || queryLower.includes(titleLower)) score += 50
    }

    // Has rating (valuable data)
    if (volumeInfo.averageRating) score += 30
    if (volumeInfo.ratingsCount) score += Math.min(volumeInfo.ratingsCount / 100, 20)

    // Has description
    if (volumeInfo.description && volumeInfo.description.length > 100) score += 20

    // Has cover image
    if (volumeInfo.imageLinks) score += 15

    // Has page count
    if (volumeInfo.pageCount) score += 10

    // Has ISBN
    if (volumeInfo.industryIdentifiers?.length > 0) score += 10

    // Has categories
    if (volumeInfo.categories?.length > 0) score += 5

    // Has authors
    if (volumeInfo.authors?.length > 0) score += 5

    return { item, score }
  })

  // Sort by score and return best match
  scored.sort((a, b) => b.score - a.score)
  return scored[0]?.item || null
}

/**
 * Check if Google Books API is available
 * @returns {boolean}
 */
export function isGoogleBooksAvailable() {
  return !!GOOGLE_BOOKS_API_KEY
}

export default {
  searchGoogleBooks,
  searchByIsbn,
  searchByTitleAuthor,
  isGoogleBooksAvailable
}
