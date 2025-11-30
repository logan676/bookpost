/**
 * Zod Validation Schemas
 * Type-safe validation for API requests
 */

import { z } from 'zod'

// ============================================
// Auth Schemas
// ============================================

export const registerSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string()
    .email('Invalid email address'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be at most 100 characters'),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

// ============================================
// Book Schemas
// ============================================

export const createBookSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  author: z.string().max(255).optional(),
  isbn: z.string().max(20).optional(),
  publisher: z.string().max(255).optional(),
  publishYear: z.string().max(10).optional(),
  description: z.string().max(5000).optional(),
  pageCount: z.number().int().positive().optional(),
  categories: z.string().max(500).optional(),
  language: z.string().max(10).optional(),
  coverUrl: z.string().url().optional(),
})

export const updateBookSchema = createBookSchema.partial()

// ============================================
// Blog Post Schemas
// ============================================

export const createBlogPostSchema = z.object({
  bookId: z.number().int().positive(),
  title: z.string().max(255).optional(),
  content: z.string().optional(),
  pageNumber: z.number().int().positive().optional(),
  extractedText: z.string().optional(),
})

export const updateBlogPostSchema = createBlogPostSchema.partial().omit({ bookId: true })

// ============================================
// Underline Schemas
// ============================================

export const createUnderlineSchema = z.object({
  text: z.string().min(1, 'Text is required').max(5000),
  startOffset: z.number().int().min(0),
  endOffset: z.number().int().min(0),
  // Optional fields for different contexts
  paragraphIndex: z.number().int().min(0).optional(),
  chapterIndex: z.number().int().min(0).optional(),
  cfiRange: z.string().optional(),
  pageNumber: z.number().int().positive().optional(),
})

export const createIdeaSchema = z.object({
  content: z.string().min(1, 'Content is required').max(10000),
})

// ============================================
// Ebook Schemas
// ============================================

export const createEbookSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  categoryId: z.number().int().positive().optional(),
  filePath: z.string().optional(),
  fileSize: z.number().int().positive().optional(),
  fileType: z.string().max(50).optional(),
  coverUrl: z.string().url().optional(),
})

export const createEbookCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
})

// ============================================
// Magazine Schemas
// ============================================

export const createMagazineSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  publisherId: z.number().int().positive().optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  pageCount: z.number().int().positive().optional(),
  coverUrl: z.string().url().optional(),
})

export const createPublisherSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
})

// ============================================
// Note Schemas
// ============================================

export const createNoteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  content: z.string().optional(),
  tags: z.string().max(500).optional(),
  categories: z.string().max(500).optional(),
})

export const updateNoteSchema = createNoteSchema.partial()

export const createNoteCommentSchema = z.object({
  content: z.string().min(1, 'Content is required').max(5000),
  nick: z.string().max(50).optional(),
})

// ============================================
// Reading History Schema
// ============================================

export const updateReadingHistorySchema = z.object({
  itemType: z.enum(['ebook', 'magazine', 'book']),
  itemId: z.number().int().positive(),
  lastPage: z.number().int().min(0).optional(),
  title: z.string().max(255).optional(),
  coverUrl: z.string().url().optional().nullable(),
})

// ============================================
// Query Params Schemas
// ============================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const searchSchema = z.object({
  q: z.string().min(1).max(100),
  type: z.enum(['all', 'books', 'ebooks', 'magazines', 'notes']).optional(),
})

// ============================================
// ID Param Schema
// ============================================

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

// ============================================
// Validation Middleware Factory
// ============================================

/**
 * Creates an Express middleware that validates request data
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {'body' | 'query' | 'params'} source - Where to get data from
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const data = req[source]
      const result = schema.safeParse(data)

      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }))

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors,
        })
      }

      // Replace with parsed/transformed data
      req[source] = result.data
      next()
    } catch (error) {
      next(error)
    }
  }
}

// Export all schemas for use in other files
export default {
  // Auth
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  // Books
  createBookSchema,
  updateBookSchema,
  // Blog Posts
  createBlogPostSchema,
  updateBlogPostSchema,
  // Underlines & Ideas
  createUnderlineSchema,
  createIdeaSchema,
  // Ebooks
  createEbookSchema,
  createEbookCategorySchema,
  // Magazines
  createMagazineSchema,
  createPublisherSchema,
  // Notes
  createNoteSchema,
  updateNoteSchema,
  createNoteCommentSchema,
  // Reading History
  updateReadingHistorySchema,
  // Params
  paginationSchema,
  searchSchema,
  idParamSchema,
  // Middleware
  validate,
}
