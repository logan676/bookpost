/**
 * Goodreads Rating Service
 *
 * Fetches book ratings from Goodreads using web scraping approach.
 * Since Goodreads deprecated their API in 2020, this service uses:
 * 1. ISBN-based lookup to find Goodreads book pages
 * 2. HTML parsing to extract rating data
 *
 * Rate Limits: Be respectful, 1 request per 2 seconds recommended
 * Note: Web scraping is fragile - monitor for changes
 */

import { log } from '../utils/logger'

const logger = { debug: log.d, info: log.i, warn: log.w, error: log.e }

const GOODREADS_SEARCH_URL = 'https://www.goodreads.com/search'
const GOODREADS_BOOK_URL = 'https://www.goodreads.com/book/show'

export interface GoodreadsRating {
  goodreadsId: string
  rating: number      // 1-5 scale
  ratingsCount: number
  reviewsCount: number
  bookUrl: string
}

export interface GoodreadsSearchResult {
  goodreadsId: string
  title: string
  author: string | null
  rating: number | null
  ratingsCount: number | null
  imageUrl: string | null
  bookUrl: string
}

/**
 * Search Goodreads by ISBN and get rating data
 * @param isbn - ISBN-10 or ISBN-13
 * @returns Goodreads rating data or null if not found
 */
export async function searchByISBN(isbn: string): Promise<GoodreadsRating | null> {
  try {
    const cleanISBN = isbn.replace(/[-\s]/g, '')
    logger.debug(`Goodreads: Searching by ISBN ${cleanISBN}`)

    // Search Goodreads using ISBN
    const searchUrl = `${GOODREADS_SEARCH_URL}?q=${cleanISBN}&search_type=books`

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
    })

    if (!response.ok) {
      logger.error(`Goodreads search error: ${response.status}`)
      return null
    }

    const html = await response.text()

    // Check if we were redirected to a book page (exact ISBN match)
    const finalUrl = response.url
    if (finalUrl.includes('/book/show/')) {
      const goodreadsId = extractBookIdFromUrl(finalUrl)
      if (goodreadsId) {
        return extractRatingFromBookPage(html, goodreadsId, finalUrl)
      }
    }

    // Parse search results page
    const searchResult = parseSearchResults(html)
    if (!searchResult || searchResult.length === 0) {
      logger.debug(`Goodreads: No results for ISBN ${cleanISBN}`)
      return null
    }

    // Get the first (best) match
    const bestMatch = searchResult[0]
    if (bestMatch.rating && bestMatch.ratingsCount) {
      return {
        goodreadsId: bestMatch.goodreadsId,
        rating: bestMatch.rating,
        ratingsCount: bestMatch.ratingsCount,
        reviewsCount: 0, // Not available in search results
        bookUrl: bestMatch.bookUrl,
      }
    }

    // Need to fetch the book page for full rating data
    return await fetchBookRating(bestMatch.goodreadsId)
  } catch (error) {
    logger.error('Goodreads search error:', error)
    return null
  }
}

/**
 * Search Goodreads by title and author
 * @param title - Book title
 * @param author - Author name (optional)
 * @returns Goodreads rating data or null if not found
 */
export async function searchByTitle(title: string, author?: string): Promise<GoodreadsRating | null> {
  try {
    let query = title
    if (author) {
      query = `${title} ${author}`
    }

    logger.debug(`Goodreads: Searching by title "${query}"`)

    const searchUrl = `${GOODREADS_SEARCH_URL}?q=${encodeURIComponent(query)}&search_type=books`

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
    })

    if (!response.ok) {
      logger.error(`Goodreads search error: ${response.status}`)
      return null
    }

    const html = await response.text()

    // Check if we were redirected to a book page
    const finalUrl = response.url
    if (finalUrl.includes('/book/show/')) {
      const goodreadsId = extractBookIdFromUrl(finalUrl)
      if (goodreadsId) {
        return extractRatingFromBookPage(html, goodreadsId, finalUrl)
      }
    }

    // Parse search results page
    const searchResults = parseSearchResults(html)
    if (!searchResults || searchResults.length === 0) {
      logger.debug(`Goodreads: No results for "${query}"`)
      return null
    }

    // Find best match by title similarity
    const normalizedTitle = normalizeString(title)
    const bestMatch = searchResults.find(r =>
      normalizeString(r.title).includes(normalizedTitle) ||
      normalizedTitle.includes(normalizeString(r.title))
    ) || searchResults[0]

    if (bestMatch.rating && bestMatch.ratingsCount) {
      return {
        goodreadsId: bestMatch.goodreadsId,
        rating: bestMatch.rating,
        ratingsCount: bestMatch.ratingsCount,
        reviewsCount: 0,
        bookUrl: bestMatch.bookUrl,
      }
    }

    return await fetchBookRating(bestMatch.goodreadsId)
  } catch (error) {
    logger.error('Goodreads search error:', error)
    return null
  }
}

/**
 * Fetch rating data for a specific Goodreads book
 * @param goodreadsId - Goodreads book ID
 * @returns Rating data or null
 */
export async function fetchBookRating(goodreadsId: string): Promise<GoodreadsRating | null> {
  try {
    const bookUrl = `${GOODREADS_BOOK_URL}/${goodreadsId}`
    logger.debug(`Goodreads: Fetching book ${goodreadsId}`)

    const response = await fetch(bookUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    })

    if (!response.ok) {
      logger.error(`Goodreads book fetch error: ${response.status}`)
      return null
    }

    const html = await response.text()
    return extractRatingFromBookPage(html, goodreadsId, bookUrl)
  } catch (error) {
    logger.error('Goodreads book fetch error:', error)
    return null
  }
}

/**
 * Extract book ID from Goodreads URL
 */
function extractBookIdFromUrl(url: string): string | null {
  // URL format: https://www.goodreads.com/book/show/12345-book-title or /book/show/12345.Book_Title
  const match = url.match(/\/book\/show\/(\d+)/)
  return match ? match[1] : null
}

/**
 * Extract rating data from a Goodreads book page HTML
 */
function extractRatingFromBookPage(html: string, goodreadsId: string, bookUrl: string): GoodreadsRating | null {
  try {
    // Try to extract rating from JSON-LD structured data
    const jsonLdMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i)
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1])
        if (jsonLd.aggregateRating) {
          return {
            goodreadsId,
            rating: parseFloat(jsonLd.aggregateRating.ratingValue) || 0,
            ratingsCount: parseInt(jsonLd.aggregateRating.ratingCount) || 0,
            reviewsCount: parseInt(jsonLd.aggregateRating.reviewCount) || 0,
            bookUrl,
          }
        }
      } catch {
        // JSON parsing failed, try regex
      }
    }

    // Fallback: Extract from HTML using regex patterns
    // Pattern for rating value (e.g., "4.12")
    const ratingMatch = html.match(/class="RatingStatistics__rating"[^>]*>([0-9.]+)</)
      || html.match(/itemprop="ratingValue"[^>]*>([0-9.]+)</)
      || html.match(/"average_rating":([0-9.]+)/)

    // Pattern for ratings count
    const ratingsCountMatch = html.match(/([0-9,]+)\s*ratings/)
      || html.match(/ratingCount['":\s]+([0-9,]+)/)

    // Pattern for reviews count
    const reviewsCountMatch = html.match(/([0-9,]+)\s*reviews/)
      || html.match(/reviewCount['":\s]+([0-9,]+)/)

    if (ratingMatch) {
      const rating = parseFloat(ratingMatch[1])
      const ratingsCount = ratingsCountMatch
        ? parseInt(ratingsCountMatch[1].replace(/,/g, ''))
        : 0
      const reviewsCount = reviewsCountMatch
        ? parseInt(reviewsCountMatch[1].replace(/,/g, ''))
        : 0

      if (rating > 0 && rating <= 5) {
        return {
          goodreadsId,
          rating,
          ratingsCount,
          reviewsCount,
          bookUrl,
        }
      }
    }

    logger.debug(`Goodreads: Could not extract rating from book page ${goodreadsId}`)
    return null
  } catch (error) {
    logger.error('Goodreads rating extraction error:', error)
    return null
  }
}

/**
 * Parse Goodreads search results page
 */
function parseSearchResults(html: string): GoodreadsSearchResult[] {
  const results: GoodreadsSearchResult[] = []

  try {
    // Match book entries in search results
    // Looking for patterns like <a class="bookTitle" href="/book/show/12345-title">
    const bookMatches = html.matchAll(
      /<tr[^>]*itemtype="http:\/\/schema\.org\/Book"[^>]*>[\s\S]*?<\/tr>/gi
    )

    for (const match of bookMatches) {
      const bookHtml = match[0]

      // Extract book ID and URL
      const urlMatch = bookHtml.match(/href="\/book\/show\/(\d+)[^"]*"/)
      if (!urlMatch) continue

      const goodreadsId = urlMatch[1]
      const bookUrl = `https://www.goodreads.com/book/show/${goodreadsId}`

      // Extract title
      const titleMatch = bookHtml.match(/class="bookTitle"[^>]*>([^<]+)</)
      const title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : ''

      // Extract author
      const authorMatch = bookHtml.match(/class="authorName"[^>]*>([^<]+)</)
      const author = authorMatch ? decodeHtmlEntities(authorMatch[1].trim()) : null

      // Extract rating
      const ratingMatch = bookHtml.match(/class="minirating"[^>]*>[^0-9]*([0-9.]+)\s*avg\s*rating/)
        || bookHtml.match(/([0-9.]+)\s*avg\s*rating/)
      const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null

      // Extract ratings count
      const ratingsCountMatch = bookHtml.match(/([0-9,]+)\s*ratings?/)
      const ratingsCount = ratingsCountMatch
        ? parseInt(ratingsCountMatch[1].replace(/,/g, ''))
        : null

      // Extract image URL
      const imageMatch = bookHtml.match(/src="([^"]+)"[^>]*class="bookCover"/)
        || bookHtml.match(/class="bookCover"[^>]*src="([^"]+)"/)
      const imageUrl = imageMatch ? imageMatch[1] : null

      results.push({
        goodreadsId,
        title,
        author,
        rating,
        ratingsCount,
        imageUrl,
        bookUrl,
      })
    }

    // Alternative parsing for newer Goodreads layout
    if (results.length === 0) {
      // Try parsing React-based search results
      const dataMatch = html.match(/window\.__SEARCH_RESULTS__\s*=\s*({[\s\S]*?});/)
      if (dataMatch) {
        try {
          const data = JSON.parse(dataMatch[1])
          if (data.results) {
            for (const result of data.results) {
              if (result.bookId) {
                results.push({
                  goodreadsId: result.bookId.toString(),
                  title: result.title || '',
                  author: result.author?.name || null,
                  rating: result.avgRating || null,
                  ratingsCount: result.ratingsCount || null,
                  imageUrl: result.imageUrl || null,
                  bookUrl: `https://www.goodreads.com/book/show/${result.bookId}`,
                })
              }
            }
          }
        } catch {
          // JSON parsing failed
        }
      }
    }
  } catch (error) {
    logger.error('Goodreads search results parsing error:', error)
  }

  return results
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
}

/**
 * Normalize string for comparison
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Convert Goodreads 5-star rating to percentage (for compatibility)
 * @param rating - Rating on 1-5 scale
 * @returns Percentage (0-100)
 */
export function ratingToPercent(rating: number): number {
  return Math.round((rating / 5) * 100)
}
