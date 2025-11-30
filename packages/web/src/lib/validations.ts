/**
 * Zod Validation Schemas for Frontend
 * Shared validation logic with React Hook Form
 */

import { z } from 'zod'

// Note: Using zod v3 syntax for stability

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
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
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
  pageCount: z.coerce.number().int().positive().optional(),
  categories: z.string().max(500).optional(),
  language: z.string().max(10).optional(),
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

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment is required').max(5000),
  nick: z.string().max(50).optional(),
})

// ============================================
// Idea Schema
// ============================================

export const createIdeaSchema = z.object({
  content: z.string().min(1, 'Content is required').max(10000),
})

// ============================================
// Search Schema
// ============================================

export const searchSchema = z.object({
  q: z.string().min(1, 'Search query is required').max(100),
  type: z.enum(['all', 'books', 'ebooks', 'magazines', 'notes']).optional(),
})

// ============================================
// Type Exports
// ============================================

export type RegisterFormData = z.infer<typeof registerSchema>
export type LoginFormData = z.infer<typeof loginSchema>
export type CreateBookFormData = z.infer<typeof createBookSchema>
export type CreateNoteFormData = z.infer<typeof createNoteSchema>
export type CreateCommentFormData = z.infer<typeof createCommentSchema>
export type CreateIdeaFormData = z.infer<typeof createIdeaSchema>
export type SearchFormData = z.infer<typeof searchSchema>
