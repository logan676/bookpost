/**
 * Drizzle ORM Schema for PostgreSQL
 * BookPost API Database Schema
 */

import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  unique,
  bigint,
} from 'drizzle-orm/pg-core'

// ============================================
// User & Authentication Tables
// ============================================

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  isAdmin: boolean('is_admin').default(false),
  createdAt: timestamp('created_at').defaultNow(),
})

export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  token: text('token').notNull(),
  refreshToken: text('refresh_token'),
  refreshExpiresAt: timestamp('refresh_expires_at'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

// ============================================
// Books & Reading Tables
// ============================================

export const books = pgTable('books', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  title: text('title'),
  author: text('author'),
  coverUrl: text('cover_url'),
  coverPhotoUrl: text('cover_photo_url'),
  isbn: text('isbn'),
  publisher: text('publisher'),
  publishYear: text('publish_year'),
  description: text('description'),
  pageCount: integer('page_count'),
  categories: text('categories'),
  language: text('language'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const blogPosts = pgTable('blog_posts', {
  id: serial('id').primaryKey(),
  bookId: integer('book_id').references(() => books.id),
  title: text('title'),
  content: text('content'),
  pagePhotoUrl: text('page_photo_url'),
  pageNumber: integer('page_number'),
  extractedText: text('extracted_text'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
})

// ============================================
// Ebooks Tables
// ============================================

export const ebookCategories = pgTable('ebook_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const ebooks = pgTable('ebooks', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').references(() => ebookCategories.id),
  title: text('title').notNull(),
  filePath: text('file_path'),
  fileSize: bigint('file_size', { mode: 'number' }),
  fileType: text('file_type'),
  normalizedTitle: text('normalized_title'),
  coverUrl: text('cover_url'),
  s3Key: text('s3_key'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ============================================
// Magazines Tables
// ============================================

export const publishers = pgTable('publishers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const magazines = pgTable('magazines', {
  id: serial('id').primaryKey(),
  publisherId: integer('publisher_id').references(() => publishers.id),
  title: text('title').notNull(),
  filePath: text('file_path'),
  fileSize: bigint('file_size', { mode: 'number' }),
  year: integer('year'),
  pageCount: integer('page_count'),
  coverUrl: text('cover_url'),
  preprocessed: boolean('preprocessed').default(false),
  s3Key: text('s3_key'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ============================================
// Notes Tables
// ============================================

export const notes = pgTable('notes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  title: text('title'),
  filePath: text('file_path'),
  year: integer('year'),
  contentPreview: text('content_preview'),
  author: text('author'),
  publishDate: text('publish_date'),
  tags: text('tags'),
  categories: text('categories'),
  slug: text('slug'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const noteComments = pgTable('note_comments', {
  id: serial('id').primaryKey(),
  noteId: integer('note_id').references(() => notes.id),
  userId: integer('user_id').references(() => users.id),
  nick: text('nick'),
  content: text('content'),
  originalDate: text('original_date'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const noteUnderlines = pgTable('note_underlines', {
  id: serial('id').primaryKey(),
  noteId: integer('note_id').references(() => notes.id),
  userId: integer('user_id').references(() => users.id),
  text: text('text'),
  paragraphIndex: integer('paragraph_index'),
  startOffset: integer('start_offset'),
  endOffset: integer('end_offset'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const noteIdeas = pgTable('note_ideas', {
  id: serial('id').primaryKey(),
  underlineId: integer('underline_id').references(() => noteUnderlines.id),
  userId: integer('user_id').references(() => users.id),
  content: text('content'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ============================================
// Underlines & Ideas (for blog posts)
// ============================================

export const underlines = pgTable('underlines', {
  id: serial('id').primaryKey(),
  postId: integer('post_id').references(() => blogPosts.id),
  text: text('text'),
  startOffset: integer('start_offset'),
  endOffset: integer('end_offset'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const ideas = pgTable('ideas', {
  id: serial('id').primaryKey(),
  underlineId: integer('underline_id').references(() => underlines.id),
  content: text('content'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ============================================
// Ebook Underlines & Ideas
// ============================================

export const ebookUnderlines = pgTable('ebook_underlines', {
  id: serial('id').primaryKey(),
  ebookId: integer('ebook_id').references(() => ebooks.id),
  userId: integer('user_id').references(() => users.id),
  text: text('text'),
  paragraph: integer('paragraph'),
  chapterIndex: integer('chapter_index'),
  paragraphIndex: integer('paragraph_index'),
  startOffset: integer('start_offset'),
  endOffset: integer('end_offset'),
  cfiRange: text('cfi_range'),
  ideaCount: integer('idea_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
})

export const ebookIdeas = pgTable('ebook_ideas', {
  id: serial('id').primaryKey(),
  underlineId: integer('underline_id').references(() => ebookUnderlines.id),
  userId: integer('user_id').references(() => users.id),
  content: text('content'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ============================================
// Magazine Underlines & Ideas
// ============================================

export const magazineUnderlines = pgTable('magazine_underlines', {
  id: serial('id').primaryKey(),
  magazineId: integer('magazine_id').references(() => magazines.id),
  userId: integer('user_id').references(() => users.id),
  text: text('text'),
  pageNumber: integer('page_number'),
  startOffset: integer('start_offset'),
  endOffset: integer('end_offset'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const magazineIdeas = pgTable('magazine_ideas', {
  id: serial('id').primaryKey(),
  underlineId: integer('underline_id').references(() => magazineUnderlines.id),
  userId: integer('user_id').references(() => users.id),
  content: text('content'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ============================================
// Reading History
// ============================================

export const readingHistory = pgTable('reading_history', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  itemType: text('item_type').notNull(), // 'ebook', 'magazine', 'book'
  itemId: integer('item_id').notNull(),
  title: text('title'),
  coverUrl: text('cover_url'),
  lastPage: integer('last_page'),
  lastReadAt: timestamp('last_read_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  uniqueUserItem: unique().on(table.userId, table.itemType, table.itemId),
}))

// ============================================
// Type Exports
// ============================================

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Session = typeof sessions.$inferSelect
export type Book = typeof books.$inferSelect
export type Ebook = typeof ebooks.$inferSelect
export type Magazine = typeof magazines.$inferSelect
export type Note = typeof notes.$inferSelect
export type ReadingHistoryEntry = typeof readingHistory.$inferSelect
