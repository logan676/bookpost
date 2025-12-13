/**
 * Compute Book Rankings Job
 *
 * Calculates and stores various book rankings:
 * - Trending: Based on recent reading activity (7-day window)
 * - Top Rated: Based on user ratings and external ratings
 * - Most Read: Based on total reading sessions
 * - New Releases: Based on publication date
 * - Popular This Week: Combination of reads and ratings
 *
 * Rankings are stored in a dedicated table for fast retrieval.
 * Runs hourly for trending, daily for other rankings.
 */

import { db } from '../db/client'
import {
  ebooks,
  magazines,
  bookStats,
  readingSessions,
  bookReviews,
  userBookshelves,
} from '../db/schema'
import { sql, eq, and, gte, desc, asc, isNotNull, or } from 'drizzle-orm'
import { log } from '../utils/logger'

const logger = { debug: log.d, info: log.i, warn: log.w, error: log.e }

// Ranking types
export type RankingType =
  | 'trending'
  | 'top_rated'
  | 'most_read'
  | 'new_releases'
  | 'popular_this_week'
  | 'hidden_gems'
  | 'staff_picks'

export interface RankedBook {
  rank: number
  bookType: string
  bookId: number
  title: string
  author: string | null
  coverUrl: string | null
  score: number
  // Additional metadata
  rating: number | null
  ratingCount: number | null
  readerCount: number | null
  recentReaders: number | null
}

export interface RankingResult {
  type: RankingType
  books: RankedBook[]
  computedAt: Date
  nextUpdate: Date
}

// Cache for rankings (in-memory for single instance deployment)
const rankingsCache = new Map<RankingType, RankingResult>()

/**
 * Compute all rankings
 */
export async function computeBookRankings(): Promise<void> {
  logger.debug('Starting book rankings computation...')

  try {
    // Compute each ranking type
    await computeTrendingRanking()
    await computeTopRatedRanking()
    await computeMostReadRanking()
    await computeNewReleasesRanking()
    await computePopularThisWeekRanking()
    await computeHiddenGemsRanking()

    logger.info('Book rankings computation complete')
  } catch (error) {
    logger.error('Failed to compute book rankings:', error)
    throw error
  }
}

/**
 * Compute trending books (based on recent reading activity)
 */
async function computeTrendingRanking(): Promise<void> {
  logger.debug('Computing trending ranking...')

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // Get books with most reading sessions in last 7 days
  const trendingBooks = await db
    .select({
      bookType: readingSessions.bookType,
      bookId: readingSessions.bookId,
      sessionCount: sql<number>`count(*)`,
      uniqueReaders: sql<number>`count(distinct user_id)`,
      totalMinutes: sql<number>`sum(duration_seconds) / 60`,
    })
    .from(readingSessions)
    .where(gte(readingSessions.startTime, sevenDaysAgo))
    .groupBy(readingSessions.bookType, readingSessions.bookId)
    .orderBy(desc(sql`count(distinct user_id)`), desc(sql`count(*)`))
    .limit(100)

  // Enrich with book details
  const rankedBooks = await enrichBooksWithDetails(
    trendingBooks.map((b, i) => ({
      rank: i + 1,
      bookType: b.bookType,
      bookId: b.bookId,
      // Score based on unique readers * 2 + session count
      score: Number(b.uniqueReaders) * 2 + Number(b.sessionCount),
      recentReaders: Number(b.uniqueReaders),
    }))
  )

  const result: RankingResult = {
    type: 'trending',
    books: rankedBooks,
    computedAt: new Date(),
    nextUpdate: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  }

  rankingsCache.set('trending', result)
  logger.debug(`Computed trending ranking: ${rankedBooks.length} books`)
}

/**
 * Compute top rated books
 */
async function computeTopRatedRanking(): Promise<void> {
  logger.debug('Computing top rated ranking...')

  // Combine internal ratings with external ratings
  // Internal ratings from bookStats, external from ebooks table

  // Get ebooks with ratings
  const ratedEbooks = await db
    .select({
      id: ebooks.id,
      title: ebooks.title,
      author: ebooks.author,
      coverUrl: ebooks.coverUrl,
      externalRating: ebooks.externalRating,
      externalRatingsCount: ebooks.externalRatingsCount,
    })
    .from(ebooks)
    .where(isNotNull(ebooks.externalRating))
    .orderBy(desc(ebooks.externalRating))
    .limit(200)

  // Also get books with internal ratings from bookStats
  const internalRatings = await db
    .select({
      bookType: bookStats.bookType,
      bookId: bookStats.bookId,
      averageRating: bookStats.averageRating,
      ratingCount: bookStats.ratingCount,
      totalReaders: bookStats.totalReaders,
    })
    .from(bookStats)
    .where(
      and(
        isNotNull(bookStats.averageRating),
        gte(bookStats.ratingCount, 1)
      )
    )

  // Create a map of internal ratings
  const internalRatingMap = new Map<string, { rating: number; count: number; readers: number }>()
  for (const r of internalRatings) {
    internalRatingMap.set(`${r.bookType}:${r.bookId}`, {
      rating: Number(r.averageRating),
      count: Number(r.ratingCount),
      readers: Number(r.totalReaders),
    })
  }

  // Combine and score books
  const scoredBooks: Array<{
    rank: number
    bookType: string
    bookId: number
    title: string
    author: string | null
    coverUrl: string | null
    score: number
    rating: number
    ratingCount: number
    readerCount: number
  }> = []

  for (const book of ratedEbooks) {
    const internal = internalRatingMap.get(`ebook:${book.id}`)
    const externalRating = Number(book.externalRating) || 0
    const externalCount = Number(book.externalRatingsCount) || 0

    // Calculate weighted rating (Bayesian average approach)
    // This prevents books with few ratings from dominating
    const minRatingsForConfidence = 10
    const globalAverageRating = 3.5

    let weightedRating: number
    let totalCount: number

    if (internal && internal.count > 0) {
      // Combine internal and external ratings
      totalCount = internal.count + externalCount
      const combinedRating =
        (internal.rating * internal.count + externalRating * externalCount) / totalCount
      weightedRating =
        (totalCount / (totalCount + minRatingsForConfidence)) * combinedRating +
        (minRatingsForConfidence / (totalCount + minRatingsForConfidence)) * globalAverageRating
    } else {
      // Use external rating only
      totalCount = externalCount
      weightedRating =
        (totalCount / (totalCount + minRatingsForConfidence)) * externalRating +
        (minRatingsForConfidence / (totalCount + minRatingsForConfidence)) * globalAverageRating
    }

    scoredBooks.push({
      rank: 0, // Will be set after sorting
      bookType: 'ebook',
      bookId: book.id,
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl,
      score: weightedRating,
      rating: externalRating,
      ratingCount: totalCount,
      readerCount: internal?.readers || 0,
    })
  }

  // Sort by weighted rating and assign ranks
  scoredBooks.sort((a, b) => b.score - a.score)
  scoredBooks.forEach((book, index) => {
    book.rank = index + 1
  })

  const result: RankingResult = {
    type: 'top_rated',
    books: scoredBooks.slice(0, 100).map(b => ({
      ...b,
      recentReaders: null,
    })),
    computedAt: new Date(),
    nextUpdate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  }

  rankingsCache.set('top_rated', result)
  logger.debug(`Computed top rated ranking: ${result.books.length} books`)
}

/**
 * Compute most read books (all time)
 */
async function computeMostReadRanking(): Promise<void> {
  logger.debug('Computing most read ranking...')

  const mostReadBooks = await db
    .select({
      bookType: bookStats.bookType,
      bookId: bookStats.bookId,
      totalReaders: bookStats.totalReaders,
      finishedReaders: bookStats.finishedReaders,
      averageRating: bookStats.averageRating,
    })
    .from(bookStats)
    .where(gte(bookStats.totalReaders, 1))
    .orderBy(desc(bookStats.totalReaders))
    .limit(100)

  const rankedBooks = await enrichBooksWithDetails(
    mostReadBooks.map((b, i) => ({
      rank: i + 1,
      bookType: b.bookType,
      bookId: b.bookId,
      score: Number(b.totalReaders),
      readerCount: Number(b.totalReaders),
      rating: Number(b.averageRating) || null,
      ratingCount: null,
      recentReaders: null,
    }))
  )

  const result: RankingResult = {
    type: 'most_read',
    books: rankedBooks,
    computedAt: new Date(),
    nextUpdate: new Date(Date.now() + 24 * 60 * 60 * 1000),
  }

  rankingsCache.set('most_read', result)
  logger.debug(`Computed most read ranking: ${rankedBooks.length} books`)
}

/**
 * Compute new releases ranking
 */
async function computeNewReleasesRanking(): Promise<void> {
  logger.debug('Computing new releases ranking...')

  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

  const newBooks = await db
    .select({
      id: ebooks.id,
      title: ebooks.title,
      author: ebooks.author,
      coverUrl: ebooks.coverUrl,
      publicationDate: ebooks.publicationDate,
      externalRating: ebooks.externalRating,
      externalRatingsCount: ebooks.externalRatingsCount,
      createdAt: ebooks.createdAt,
    })
    .from(ebooks)
    .where(
      or(
        gte(ebooks.publicationDate, oneYearAgo.toISOString().split('T')[0]),
        gte(ebooks.createdAt, oneYearAgo)
      )
    )
    .orderBy(desc(ebooks.publicationDate), desc(ebooks.createdAt))
    .limit(100)

  const rankedBooks: RankedBook[] = newBooks.map((book, index) => ({
    rank: index + 1,
    bookType: 'ebook',
    bookId: book.id,
    title: book.title,
    author: book.author,
    coverUrl: book.coverUrl,
    score: 0, // Sorted by date, not score
    rating: Number(book.externalRating) || null,
    ratingCount: Number(book.externalRatingsCount) || null,
    readerCount: null,
    recentReaders: null,
  }))

  const result: RankingResult = {
    type: 'new_releases',
    books: rankedBooks,
    computedAt: new Date(),
    nextUpdate: new Date(Date.now() + 24 * 60 * 60 * 1000),
  }

  rankingsCache.set('new_releases', result)
  logger.debug(`Computed new releases ranking: ${rankedBooks.length} books`)
}

/**
 * Compute popular this week (combination of reads, ratings, and adds)
 */
async function computePopularThisWeekRanking(): Promise<void> {
  logger.debug('Computing popular this week ranking...')

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // Get books added to shelves this week
  const recentAdds = await db
    .select({
      bookType: userBookshelves.bookType,
      bookId: userBookshelves.bookId,
      addCount: sql<number>`count(*)`,
    })
    .from(userBookshelves)
    .where(gte(userBookshelves.addedAt, oneWeekAgo))
    .groupBy(userBookshelves.bookType, userBookshelves.bookId)

  // Get reading sessions this week
  const recentReads = await db
    .select({
      bookType: readingSessions.bookType,
      bookId: readingSessions.bookId,
      sessionCount: sql<number>`count(*)`,
      uniqueReaders: sql<number>`count(distinct user_id)`,
    })
    .from(readingSessions)
    .where(gte(readingSessions.startTime, oneWeekAgo))
    .groupBy(readingSessions.bookType, readingSessions.bookId)

  // Combine scores
  const scoreMap = new Map<string, { bookType: string; bookId: number; score: number; readers: number }>()

  for (const add of recentAdds) {
    const key = `${add.bookType}:${add.bookId}`
    const existing = scoreMap.get(key) || { bookType: add.bookType, bookId: add.bookId, score: 0, readers: 0 }
    existing.score += Number(add.addCount) * 3 // Weight: 3x for shelf adds
    scoreMap.set(key, existing)
  }

  for (const read of recentReads) {
    const key = `${read.bookType}:${read.bookId}`
    const existing = scoreMap.get(key) || { bookType: read.bookType, bookId: read.bookId, score: 0, readers: 0 }
    existing.score += Number(read.uniqueReaders) * 5 + Number(read.sessionCount) // Weight: 5x for readers
    existing.readers = Number(read.uniqueReaders)
    scoreMap.set(key, existing)
  }

  // Sort by score
  const sorted = Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 100)

  const rankedBooks = await enrichBooksWithDetails(
    sorted.map((b, i) => ({
      rank: i + 1,
      bookType: b.bookType,
      bookId: b.bookId,
      score: b.score,
      recentReaders: b.readers,
    }))
  )

  const result: RankingResult = {
    type: 'popular_this_week',
    books: rankedBooks,
    computedAt: new Date(),
    nextUpdate: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours
  }

  rankingsCache.set('popular_this_week', result)
  logger.debug(`Computed popular this week ranking: ${rankedBooks.length} books`)
}

/**
 * Compute hidden gems (highly rated but few readers)
 */
async function computeHiddenGemsRanking(): Promise<void> {
  logger.debug('Computing hidden gems ranking...')

  // Find books with high ratings but relatively few readers
  const hiddenGems = await db
    .select({
      id: ebooks.id,
      title: ebooks.title,
      author: ebooks.author,
      coverUrl: ebooks.coverUrl,
      externalRating: ebooks.externalRating,
      externalRatingsCount: ebooks.externalRatingsCount,
    })
    .from(ebooks)
    .where(
      and(
        isNotNull(ebooks.externalRating),
        gte(ebooks.externalRating, '4.0'), // Rating >= 4.0
        gte(ebooks.externalRatingsCount, 10), // At least 10 ratings
      )
    )
    .orderBy(desc(ebooks.externalRating), asc(ebooks.externalRatingsCount))
    .limit(100)

  // Filter to books with fewer readers from our stats
  const bookStatsMap = new Map<number, number>()
  const statsForGems = await db
    .select({
      bookId: bookStats.bookId,
      totalReaders: bookStats.totalReaders,
    })
    .from(bookStats)
    .where(eq(bookStats.bookType, 'ebook'))

  for (const stat of statsForGems) {
    bookStatsMap.set(stat.bookId, Number(stat.totalReaders))
  }

  // Score: high rating + low reader count = hidden gem
  const scoredGems = hiddenGems
    .map(book => {
      const readers = bookStatsMap.get(book.id) || 0
      const rating = Number(book.externalRating) || 0
      // Score formula: rating bonus minus reader penalty
      const score = rating * 20 - Math.log10(readers + 1) * 5
      return {
        rank: 0,
        bookType: 'ebook' as string,
        bookId: book.id,
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl,
        score,
        rating,
        ratingCount: Number(book.externalRatingsCount) || 0,
        readerCount: readers,
        recentReaders: null,
      }
    })
    .filter(b => b.readerCount < 50) // Only books with < 50 readers
    .sort((a, b) => b.score - a.score)
    .slice(0, 50)

  scoredGems.forEach((book, index) => {
    book.rank = index + 1
  })

  const result: RankingResult = {
    type: 'hidden_gems',
    books: scoredGems,
    computedAt: new Date(),
    nextUpdate: new Date(Date.now() + 24 * 60 * 60 * 1000),
  }

  rankingsCache.set('hidden_gems', result)
  logger.debug(`Computed hidden gems ranking: ${scoredGems.length} books`)
}

/**
 * Enrich ranking entries with book details
 */
async function enrichBooksWithDetails(
  entries: Array<{
    rank: number
    bookType: string
    bookId: number
    score: number
    recentReaders?: number | null
    readerCount?: number | null
    rating?: number | null
    ratingCount?: number | null
  }>
): Promise<RankedBook[]> {
  const ebookIds = entries.filter(e => e.bookType === 'ebook').map(e => e.bookId)
  const magazineIds = entries.filter(e => e.bookType === 'magazine').map(e => e.bookId)

  const ebookMap = new Map<number, typeof ebooks.$inferSelect>()
  const magazineMap = new Map<number, typeof magazines.$inferSelect>()

  if (ebookIds.length > 0) {
    const ebookResults = await db
      .select()
      .from(ebooks)
      .where(sql`${ebooks.id} = ANY(${ebookIds})`)

    for (const book of ebookResults) {
      ebookMap.set(book.id, book)
    }
  }

  if (magazineIds.length > 0) {
    const magazineResults = await db
      .select()
      .from(magazines)
      .where(sql`${magazines.id} = ANY(${magazineIds})`)

    for (const mag of magazineResults) {
      magazineMap.set(mag.id, mag)
    }
  }

  return entries.map(entry => {
    if (entry.bookType === 'ebook') {
      const book = ebookMap.get(entry.bookId)
      return {
        rank: entry.rank,
        bookType: entry.bookType,
        bookId: entry.bookId,
        title: book?.title || 'Unknown',
        author: book?.author || null,
        coverUrl: book?.coverUrl || null,
        score: entry.score,
        rating: entry.rating ?? (book?.externalRating ? Number(book.externalRating) : null),
        ratingCount: entry.ratingCount ?? book?.externalRatingsCount ?? null,
        readerCount: entry.readerCount ?? null,
        recentReaders: entry.recentReaders ?? null,
      }
    } else {
      const mag = magazineMap.get(entry.bookId)
      return {
        rank: entry.rank,
        bookType: entry.bookType,
        bookId: entry.bookId,
        title: mag?.title || 'Unknown',
        author: null,
        coverUrl: mag?.coverUrl || null,
        score: entry.score,
        rating: entry.rating ?? null,
        ratingCount: entry.ratingCount ?? null,
        readerCount: entry.readerCount ?? null,
        recentReaders: entry.recentReaders ?? null,
      }
    }
  })
}

/**
 * Get cached ranking by type
 */
export function getRanking(type: RankingType): RankingResult | null {
  return rankingsCache.get(type) || null
}

/**
 * Get all cached rankings
 */
export function getAllRankings(): Map<RankingType, RankingResult> {
  return new Map(rankingsCache)
}

/**
 * Check if rankings need refresh
 */
export function needsRefresh(type: RankingType): boolean {
  const cached = rankingsCache.get(type)
  if (!cached) return true
  return new Date() > cached.nextUpdate
}

/**
 * Clear all cached rankings
 */
export function clearRankingsCache(): void {
  rankingsCache.clear()
}
