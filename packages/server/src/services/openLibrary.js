/**
 * Open Library API Service
 * Free API with no authentication required
 * https://openlibrary.org/developers/api
 */

const OPEN_LIBRARY_API = 'https://openlibrary.org'
const OPEN_LIBRARY_COVERS = 'https://covers.openlibrary.org'

/**
 * Search for books by query
 * @param {string} query - Search query
 * @param {number} limit - Max results
 * @returns {Promise<Object|null>}
 */
export async function searchOpenLibrary(query, limit = 5) {
  try {
    const url = `${OPEN_LIBRARY_API}/search.json?q=${encodeURIComponent(query)}&limit=${limit}`
    const response = await fetch(url, {
      headers: { 'User-Agent': 'BookPost/1.0 (book management app)' }
    })
    const data = await response.json()

    if (!data.docs || data.docs.length === 0) {
      return null
    }

    // Find the best match
    const book = findBestMatch(data.docs, query)
    if (!book) return null

    return formatBookData(book)
  } catch (error) {
    console.error('[OpenLibrary] Search error:', error.message)
    return null
  }
}

/**
 * Search by ISBN
 * @param {string} isbn - ISBN-10 or ISBN-13
 * @returns {Promise<Object|null>}
 */
export async function searchByIsbn(isbn) {
  if (!isbn) return null

  const cleanIsbn = isbn.replace(/[-\s]/g, '')

  try {
    // Try the ISBN API first (more accurate)
    const url = `${OPEN_LIBRARY_API}/isbn/${cleanIsbn}.json`
    const response = await fetch(url, {
      headers: { 'User-Agent': 'BookPost/1.0' }
    })

    if (!response.ok) {
      // Fall back to search
      return searchOpenLibrary(`isbn:${cleanIsbn}`)
    }

    const book = await response.json()

    // Get additional work data if available
    let workData = null
    if (book.works && book.works[0]?.key) {
      try {
        const workResponse = await fetch(`${OPEN_LIBRARY_API}${book.works[0].key}.json`)
        if (workResponse.ok) {
          workData = await workResponse.json()
        }
      } catch (e) {
        // Ignore work fetch errors
      }
    }

    return formatEditionData(book, workData)
  } catch (error) {
    console.error('[OpenLibrary] ISBN search error:', error.message)
    return null
  }
}

/**
 * Search by title and author
 * @param {string} title - Book title
 * @param {string} author - Author name (optional)
 * @returns {Promise<Object|null>}
 */
export async function searchByTitleAuthor(title, author = '') {
  if (!title) return null

  // Clean title
  let cleanTitle = title
    .replace(/\.(epub|pdf|mobi|azw3?)$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  let query = `title:${cleanTitle}`
  if (author) {
    query += ` author:${author}`
  }

  return searchOpenLibrary(query)
}

/**
 * Get cover URL for a book
 * @param {string} isbn - ISBN
 * @param {string} coverId - Open Library cover ID
 * @param {string} size - Size: S, M, L
 * @returns {string}
 */
export function getCoverUrl(isbn, coverId, size = 'L') {
  if (coverId) {
    return `${OPEN_LIBRARY_COVERS}/b/id/${coverId}-${size}.jpg`
  }
  if (isbn) {
    return `${OPEN_LIBRARY_COVERS}/b/isbn/${isbn}-${size}.jpg`
  }
  return ''
}

/**
 * Format search result data
 * @param {Object} book - Book data from search API
 * @returns {Object}
 */
function formatBookData(book) {
  const isbn13 = book.isbn?.find(i => i.length === 13) || ''
  const isbn10 = book.isbn?.find(i => i.length === 10) || ''

  return {
    // Identifiers
    openLibraryKey: book.key || '',
    isbn13,
    isbn10,
    isbn: isbn13 || isbn10,

    // Basic info
    title: book.title || '',
    subtitle: book.subtitle || '',
    author: book.author_name ? book.author_name.join(', ') : '',
    authorKey: book.author_key || [],

    // Publishing info
    publisher: book.publisher ? book.publisher[0] : '',
    publishYear: book.first_publish_year || null,
    publishDate: book.first_publish_year ? `${book.first_publish_year}` : '',

    // Content info
    pageCount: book.number_of_pages_median || null,
    language: book.language ? book.language[0] : '',

    // Subjects/Categories
    subjects: book.subject ? book.subject.slice(0, 10) : [],
    categories: book.subject ? book.subject.slice(0, 5).join(', ') : '',

    // Ratings (Open Library has a rating system)
    averageRating: book.ratings_average || null,
    ratingsCount: book.ratings_count || null,

    // Cover
    coverId: book.cover_i || null,
    coverUrl: book.cover_i
      ? `${OPEN_LIBRARY_COVERS}/b/id/${book.cover_i}-L.jpg`
      : (isbn13 || isbn10)
        ? `${OPEN_LIBRARY_COVERS}/b/isbn/${isbn13 || isbn10}-L.jpg`
        : '',

    // Links
    infoLink: book.key ? `https://openlibrary.org${book.key}` : '',

    // Editions count
    editionCount: book.edition_count || 0,

    // Source
    source: 'open_library'
  }
}

/**
 * Format edition data (from ISBN lookup)
 * @param {Object} edition - Edition data
 * @param {Object} work - Work data (optional)
 * @returns {Object}
 */
function formatEditionData(edition, work = null) {
  const isbn13 = edition.isbn_13 ? edition.isbn_13[0] : ''
  const isbn10 = edition.isbn_10 ? edition.isbn_10[0] : ''

  // Get description from work or edition
  let description = ''
  if (work?.description) {
    description = typeof work.description === 'string'
      ? work.description
      : work.description.value || ''
  }

  // Get subjects from work
  const subjects = work?.subjects || []

  return {
    // Identifiers
    openLibraryKey: edition.key || '',
    isbn13,
    isbn10,
    isbn: isbn13 || isbn10,

    // Basic info
    title: edition.title || '',
    subtitle: edition.subtitle || '',
    author: edition.authors
      ? edition.authors.map(a => a.name || a.key?.replace('/authors/', '')).join(', ')
      : '',

    // Publishing info
    publisher: edition.publishers ? edition.publishers[0] : '',
    publishYear: edition.publish_date
      ? parseInt(edition.publish_date.match(/\d{4}/)?.[0] || '0')
      : null,
    publishDate: edition.publish_date || '',

    // Content info
    pageCount: edition.number_of_pages || null,
    language: edition.languages
      ? edition.languages[0]?.key?.replace('/languages/', '') || ''
      : '',

    // Description
    description,

    // Subjects/Categories
    subjects: subjects.slice(0, 10),
    categories: subjects.slice(0, 5).join(', '),

    // Cover
    coverId: edition.covers ? edition.covers[0] : null,
    coverUrl: edition.covers
      ? `${OPEN_LIBRARY_COVERS}/b/id/${edition.covers[0]}-L.jpg`
      : (isbn13 || isbn10)
        ? `${OPEN_LIBRARY_COVERS}/b/isbn/${isbn13 || isbn10}-L.jpg`
        : '',

    // Links
    infoLink: edition.key ? `https://openlibrary.org${edition.key}` : '',

    // Source
    source: 'open_library'
  }
}

/**
 * Find the best matching book from search results
 * @param {Array} docs - Array of book documents
 * @param {string} query - Original search query
 * @returns {Object|null}
 */
function findBestMatch(docs, query) {
  if (!docs || docs.length === 0) return null

  const queryLower = query.toLowerCase()

  // Score each item
  const scored = docs.map(doc => {
    let score = 0

    // Title match
    if (doc.title) {
      const titleLower = doc.title.toLowerCase()
      if (titleLower === queryLower) score += 100
      else if (titleLower.includes(queryLower) || queryLower.includes(titleLower)) score += 50
    }

    // Has ratings
    if (doc.ratings_average) score += 30
    if (doc.ratings_count) score += Math.min(doc.ratings_count / 100, 20)

    // Has cover
    if (doc.cover_i) score += 20

    // Has ISBN
    if (doc.isbn?.length > 0) score += 15

    // Has page count
    if (doc.number_of_pages_median) score += 10

    // Has subjects
    if (doc.subject?.length > 0) score += 5

    // More editions = more popular
    if (doc.edition_count) score += Math.min(doc.edition_count / 10, 10)

    return { doc, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored[0]?.doc || null
}

/**
 * Open Library is always available (no API key required)
 * @returns {boolean}
 */
export function isOpenLibraryAvailable() {
  return true
}

export default {
  searchOpenLibrary,
  searchByIsbn,
  searchByTitleAuthor,
  getCoverUrl,
  isOpenLibraryAvailable
}
