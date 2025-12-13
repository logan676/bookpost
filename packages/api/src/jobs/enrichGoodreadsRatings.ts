/**
 * Enrich Goodreads Ratings Job
 *
 * Fetches ratings from Goodreads for books that don't have external ratings.
 * Uses ISBN or title+author lookup to find matching Goodreads books.
 *
 * Runs daily to process books without ratings.
 * Rate limited to be respectful to Goodreads (2 seconds between requests).
 */

import { db } from '../db/client'
import { ebooks } from '../db/schema'
import { isNull, or, eq, and, ne } from 'drizzle-orm'
import { log } from '../utils/logger'
import * as goodreads from '../services/goodreads'

const logger = { debug: log.d, info: log.i, warn: log.w, error: log.e }

// Process books in small batches to respect rate limits
const BATCH_SIZE = 15
const DELAY_BETWEEN_REQUESTS = 2500 // 2.5 seconds - be respectful

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Enrich Goodreads ratings for books without external ratings
 */
export async function enrichGoodreadsRatings(): Promise<void> {
  logger.debug('Starting Goodreads rating enrichment...')

  try {
    // Find books without external ratings (or marked as 'none' from previous attempts)
    // Prioritize books that have ISBN (more accurate matches)
    const booksNeedingRatings = await db
      .select({
        id: ebooks.id,
        title: ebooks.title,
        author: ebooks.author,
        isbn: ebooks.isbn,
        goodreadsId: ebooks.goodreadsId,
        externalRatingSource: ebooks.externalRatingSource,
      })
      .from(ebooks)
      .where(
        or(
          isNull(ebooks.externalRating),
          and(
            eq(ebooks.externalRatingSource, 'none'),
            isNull(ebooks.goodreadsId)
          )
        )
      )
      .orderBy(ebooks.isbn) // Books with ISBN first (they sort before null)
      .limit(BATCH_SIZE * 3)

    if (booksNeedingRatings.length === 0) {
      logger.info('No books need Goodreads rating enrichment')
      return
    }

    logger.info(`Found ${booksNeedingRatings.length} books needing Goodreads ratings`)

    let enrichedCount = 0
    let failedCount = 0
    let skippedCount = 0

    // Process in batches
    const booksToProcess = booksNeedingRatings.slice(0, BATCH_SIZE)

    for (const book of booksToProcess) {
      try {
        // Skip books that already have Goodreads ID and rating
        if (book.goodreadsId && book.externalRatingSource === 'goodreads') {
          skippedCount++
          continue
        }

        logger.debug(`Enriching Goodreads rating for: ${book.title}`)

        let rating: goodreads.GoodreadsRating | null = null

        // Strategy 1: Try ISBN lookup (most accurate)
        if (book.isbn) {
          rating = await goodreads.searchByISBN(book.isbn)
          await sleep(DELAY_BETWEEN_REQUESTS)
        }

        // Strategy 2: Fall back to title + author search
        if (!rating && book.title) {
          rating = await goodreads.searchByTitle(book.title, book.author || undefined)
          await sleep(DELAY_BETWEEN_REQUESTS)
        }

        if (rating && rating.rating > 0) {
          // Update the book with Goodreads data
          await db
            .update(ebooks)
            .set({
              goodreadsId: rating.goodreadsId,
              externalRating: rating.rating.toFixed(2),
              externalRatingsCount: rating.ratingsCount,
              externalRatingSource: 'goodreads',
            })
            .where(eq(ebooks.id, book.id))

          enrichedCount++
          logger.debug(
            `Updated Goodreads rating for: ${book.title} - ${rating.rating}/5 (${rating.ratingsCount} ratings)`
          )
        } else {
          // Mark as attempted so we don't retry too often
          await db
            .update(ebooks)
            .set({
              externalRatingSource: 'none',
            })
            .where(eq(ebooks.id, book.id))

          failedCount++
          logger.debug(`No Goodreads rating found for: ${book.title}`)
        }
      } catch (bookError) {
        logger.error(`Failed to enrich Goodreads rating for book ${book.id}:`, bookError)
        failedCount++
      }
    }

    logger.info(
      `Goodreads rating enrichment complete: ${enrichedCount} enriched, ${failedCount} failed, ${skippedCount} skipped`
    )
  } catch (error) {
    logger.error('Failed to enrich Goodreads ratings:', error)
    throw error
  }
}

/**
 * Re-fetch Goodreads rating for a specific book
 * Useful for admin/manual refresh
 */
export async function refreshGoodreadsRating(ebookId: number): Promise<boolean> {
  try {
    const [book] = await db
      .select({
        id: ebooks.id,
        title: ebooks.title,
        author: ebooks.author,
        isbn: ebooks.isbn,
        goodreadsId: ebooks.goodreadsId,
      })
      .from(ebooks)
      .where(eq(ebooks.id, ebookId))
      .limit(1)

    if (!book) {
      logger.error(`Book not found: ${ebookId}`)
      return false
    }

    let rating: goodreads.GoodreadsRating | null = null

    // If we already have a Goodreads ID, use it directly
    if (book.goodreadsId) {
      rating = await goodreads.fetchBookRating(book.goodreadsId)
    }

    // Otherwise try ISBN then title
    if (!rating && book.isbn) {
      rating = await goodreads.searchByISBN(book.isbn)
    }

    if (!rating && book.title) {
      rating = await goodreads.searchByTitle(book.title, book.author || undefined)
    }

    if (rating && rating.rating > 0) {
      await db
        .update(ebooks)
        .set({
          goodreadsId: rating.goodreadsId,
          externalRating: rating.rating.toFixed(2),
          externalRatingsCount: rating.ratingsCount,
          externalRatingSource: 'goodreads',
        })
        .where(eq(ebooks.id, ebookId))

      logger.info(`Refreshed Goodreads rating for: ${book.title} - ${rating.rating}/5`)
      return true
    }

    logger.info(`No Goodreads rating found for: ${book.title}`)
    return false
  } catch (error) {
    logger.error(`Failed to refresh Goodreads rating for book ${ebookId}:`, error)
    return false
  }
}
