/**
 * Generate AI Book Summaries Job
 *
 * Generates AI-powered summaries for books that don't have them yet.
 * Uses Claude AI to create:
 * - Overview summaries
 * - Key points/takeaways
 * - Topic analysis
 * - Reading guides
 *
 * Runs daily, processing a limited batch to control costs.
 * Estimated cost: ~$0.001 per summary (using Claude Haiku)
 */

import { db } from '../db/client'
import { ebooks, aiBookSummaries } from '../db/schema'
import { eq, and, isNull, notInArray, sql } from 'drizzle-orm'
import { log } from '../utils/logger'
import { generateSummary, SummaryType, AISummaryResult } from '../services/claudeAI'

const logger = { debug: log.d, info: log.i, warn: log.w, error: log.e }

// Limit batch size to control API costs (~$0.01 per book for all summary types)
const BATCH_SIZE = 10
const DELAY_BETWEEN_REQUESTS = 1000 // 1 second

// Summary types to generate for each book
const SUMMARY_TYPES: SummaryType[] = ['overview', 'key_points', 'topics', 'reading_guide']

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Generate AI summaries for books that need them
 */
export async function generateAISummaries(): Promise<void> {
  logger.debug('Starting AI summary generation...')

  // Check if API key is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    logger.warn('ANTHROPIC_API_KEY not configured, skipping AI summary generation')
    return
  }

  try {
    // Find books that don't have overview summaries yet (overview is the basic one)
    const booksWithSummaries = await db
      .select({ bookId: aiBookSummaries.bookId })
      .from(aiBookSummaries)
      .where(
        and(
          eq(aiBookSummaries.bookType, 'ebook'),
          eq(aiBookSummaries.summaryType, 'overview')
        )
      )

    const bookIdsWithSummaries = booksWithSummaries.map(b => b.bookId)

    // Get books that need summaries (have description for better results)
    const booksNeedingSummaries = await db
      .select({
        id: ebooks.id,
        title: ebooks.title,
        author: ebooks.author,
        description: ebooks.description,
      })
      .from(ebooks)
      .where(
        bookIdsWithSummaries.length > 0
          ? notInArray(ebooks.id, bookIdsWithSummaries)
          : sql`1=1` // No filter if no books have summaries yet
      )
      .limit(BATCH_SIZE)

    if (booksNeedingSummaries.length === 0) {
      logger.info('No books need AI summaries')
      return
    }

    logger.info(`Found ${booksNeedingSummaries.length} books needing AI summaries`)

    let successCount = 0
    let failedCount = 0
    let totalCost = 0

    for (const book of booksNeedingSummaries) {
      try {
        logger.debug(`Generating AI summaries for: ${book.title}`)

        // Skip books without enough context (need at least title)
        if (!book.title) {
          logger.debug(`Skipping book ${book.id}: no title`)
          continue
        }

        // Generate all summary types for this book
        for (const summaryType of SUMMARY_TYPES) {
          try {
            const result = await generateSummary(
              book.title,
              book.description,
              null, // No content extraction for now
              summaryType
            )

            if (result) {
              // Store the summary
              await db.insert(aiBookSummaries).values({
                bookType: 'ebook',
                bookId: book.id,
                summaryType,
                content: result.content,
                modelUsed: result.modelUsed,
                inputTokens: result.inputTokens,
                outputTokens: result.outputTokens,
                generationCostUsd: result.costUsd.toFixed(6),
                generatedAt: new Date(),
                // Set expiry to 90 days
                expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
              })

              totalCost += result.costUsd
              logger.debug(`Generated ${summaryType} for: ${book.title}`)
            }

            await sleep(DELAY_BETWEEN_REQUESTS)
          } catch (summaryError) {
            logger.error(`Failed to generate ${summaryType} for book ${book.id}:`, summaryError)
          }
        }

        successCount++
      } catch (bookError) {
        logger.error(`Failed to generate summaries for book ${book.id}:`, bookError)
        failedCount++
      }
    }

    logger.info(
      `AI summary generation complete: ${successCount} books processed, ${failedCount} failed, total cost: $${totalCost.toFixed(4)}`
    )
  } catch (error) {
    logger.error('Failed to generate AI summaries:', error)
    throw error
  }
}

/**
 * Generate summaries for a specific book
 * @param ebookId - The ebook ID to generate summaries for
 * @param types - Optional array of summary types to generate (defaults to all)
 */
export async function generateSummariesForBook(
  ebookId: number,
  types: SummaryType[] = SUMMARY_TYPES
): Promise<{ success: boolean; generated: string[]; cost: number }> {
  const generated: string[] = []
  let totalCost = 0

  try {
    const [book] = await db
      .select({
        id: ebooks.id,
        title: ebooks.title,
        author: ebooks.author,
        description: ebooks.description,
      })
      .from(ebooks)
      .where(eq(ebooks.id, ebookId))
      .limit(1)

    if (!book || !book.title) {
      return { success: false, generated: [], cost: 0 }
    }

    for (const summaryType of types) {
      // Check if this summary type already exists
      const [existing] = await db
        .select({ id: aiBookSummaries.id })
        .from(aiBookSummaries)
        .where(
          and(
            eq(aiBookSummaries.bookType, 'ebook'),
            eq(aiBookSummaries.bookId, ebookId),
            eq(aiBookSummaries.summaryType, summaryType)
          )
        )
        .limit(1)

      if (existing) {
        logger.debug(`Summary ${summaryType} already exists for book ${ebookId}`)
        continue
      }

      const result = await generateSummary(
        book.title,
        book.description,
        null,
        summaryType
      )

      if (result) {
        await db.insert(aiBookSummaries).values({
          bookType: 'ebook',
          bookId: ebookId,
          summaryType,
          content: result.content,
          modelUsed: result.modelUsed,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          generationCostUsd: result.costUsd.toFixed(6),
          generatedAt: new Date(),
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        })

        generated.push(summaryType)
        totalCost += result.costUsd
      }

      await sleep(500)
    }

    return { success: true, generated, cost: totalCost }
  } catch (error) {
    logger.error(`Failed to generate summaries for book ${ebookId}:`, error)
    return { success: false, generated, cost: totalCost }
  }
}

/**
 * Regenerate a specific summary type for a book
 */
export async function regenerateSummary(
  ebookId: number,
  summaryType: SummaryType
): Promise<AISummaryResult | null> {
  try {
    const [book] = await db
      .select({
        id: ebooks.id,
        title: ebooks.title,
        description: ebooks.description,
      })
      .from(ebooks)
      .where(eq(ebooks.id, ebookId))
      .limit(1)

    if (!book || !book.title) {
      return null
    }

    const result = await generateSummary(
      book.title,
      book.description,
      null,
      summaryType
    )

    if (result) {
      // Delete existing summary
      await db
        .delete(aiBookSummaries)
        .where(
          and(
            eq(aiBookSummaries.bookType, 'ebook'),
            eq(aiBookSummaries.bookId, ebookId),
            eq(aiBookSummaries.summaryType, summaryType)
          )
        )

      // Insert new summary
      await db.insert(aiBookSummaries).values({
        bookType: 'ebook',
        bookId: ebookId,
        summaryType,
        content: result.content,
        modelUsed: result.modelUsed,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        generationCostUsd: result.costUsd.toFixed(6),
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      })

      return result
    }

    return null
  } catch (error) {
    logger.error(`Failed to regenerate summary for book ${ebookId}:`, error)
    return null
  }
}

/**
 * Get summary generation stats
 */
export async function getSummaryStats(): Promise<{
  totalBooks: number
  booksWithSummaries: number
  totalSummaries: number
  totalCost: number
}> {
  const [totalBooksResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(ebooks)

  const [booksWithSummariesResult] = await db
    .select({ count: sql<number>`count(distinct book_id)` })
    .from(aiBookSummaries)
    .where(eq(aiBookSummaries.bookType, 'ebook'))

  const [summariesResult] = await db
    .select({
      count: sql<number>`count(*)`,
      cost: sql<number>`coalesce(sum(generation_cost_usd::numeric), 0)`,
    })
    .from(aiBookSummaries)

  return {
    totalBooks: Number(totalBooksResult?.count || 0),
    booksWithSummaries: Number(booksWithSummariesResult?.count || 0),
    totalSummaries: Number(summariesResult?.count || 0),
    totalCost: Number(summariesResult?.cost || 0),
  }
}
