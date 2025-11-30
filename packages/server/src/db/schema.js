/**
 * Drizzle ORM Schema
 * Type-safe database schema definitions for BookPost
 */

import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core'

// ============================================
// User & Authentication Tables
// ============================================

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  isAdmin: integer('is_admin').default(0),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id),
  token: text('token').notNull(),
  refreshToken: text('refresh_token'),
  refreshExpiresAt: text('refresh_expires_at'),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

export const migrations = sqliteTable('migrations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').unique().notNull(),
  executedAt: text('executed_at').default('CURRENT_TIMESTAMP'),
})

// ============================================
// Books & Reading Tables
// ============================================

export const books = sqliteTable('books', {
  id: integer('id').primaryKey({ autoIncrement: true }),
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
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

export const blogPosts = sqliteTable('blog_posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  bookId: integer('book_id').references(() => books.id),
  title: text('title'),
  content: text('content'),
  pagePhotoUrl: text('page_photo_url'),
  pageNumber: integer('page_number'),
  extractedText: text('extracted_text'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at'),
})

// ============================================
// Ebooks Tables
// ============================================

export const ebookCategories = sqliteTable('ebook_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

export const ebooks = sqliteTable('ebooks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  categoryId: integer('category_id').references(() => ebookCategories.id),
  title: text('title').notNull(),
  filePath: text('file_path'),
  fileSize: integer('file_size'),
  fileType: text('file_type'),
  normalizedTitle: text('normalized_title'),
  coverUrl: text('cover_url'),
  s3Key: text('s3_key'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

// ============================================
// Magazines Tables
// ============================================

export const publishers = sqliteTable('publishers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

export const magazines = sqliteTable('magazines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  publisherId: integer('publisher_id').references(() => publishers.id),
  title: text('title').notNull(),
  filePath: text('file_path'),
  fileSize: integer('file_size'),
  year: integer('year'),
  pageCount: integer('page_count'),
  coverUrl: text('cover_url'),
  preprocessed: integer('preprocessed').default(0),
  s3Key: text('s3_key'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

// ============================================
// Notes Tables
// ============================================

export const notes = sqliteTable('notes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
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
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

export const noteComments = sqliteTable('note_comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  noteId: integer('note_id').references(() => notes.id),
  userId: integer('user_id').references(() => users.id),
  nick: text('nick'),
  content: text('content'),
  originalDate: text('original_date'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

export const noteUnderlines = sqliteTable('note_underlines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  noteId: integer('note_id').references(() => notes.id),
  userId: integer('user_id').references(() => users.id),
  text: text('text'),
  paragraphIndex: integer('paragraph_index'),
  startOffset: integer('start_offset'),
  endOffset: integer('end_offset'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

export const noteIdeas = sqliteTable('note_ideas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  underlineId: integer('underline_id').references(() => noteUnderlines.id),
  userId: integer('user_id').references(() => users.id),
  content: text('content'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

// ============================================
// Underlines & Ideas (for blog posts)
// ============================================

export const underlines = sqliteTable('underlines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  postId: integer('post_id').references(() => blogPosts.id),
  text: text('text'),
  startOffset: integer('start_offset'),
  endOffset: integer('end_offset'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

export const ideas = sqliteTable('ideas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  underlineId: integer('underline_id').references(() => underlines.id),
  content: text('content'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

// ============================================
// Ebook Underlines & Ideas
// ============================================

export const ebookUnderlines = sqliteTable('ebook_underlines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
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
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

export const ebookIdeas = sqliteTable('ebook_ideas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  underlineId: integer('underline_id').references(() => ebookUnderlines.id),
  userId: integer('user_id').references(() => users.id),
  content: text('content'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

// ============================================
// Magazine Underlines & Ideas
// ============================================

export const magazineUnderlines = sqliteTable('magazine_underlines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  magazineId: integer('magazine_id').references(() => magazines.id),
  userId: integer('user_id').references(() => users.id),
  text: text('text'),
  pageNumber: integer('page_number'),
  startOffset: integer('start_offset'),
  endOffset: integer('end_offset'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

export const magazineIdeas = sqliteTable('magazine_ideas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  underlineId: integer('underline_id').references(() => magazineUnderlines.id),
  userId: integer('user_id').references(() => users.id),
  content: text('content'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

// ============================================
// Media Series Tables
// ============================================

export const audioSeries = sqliteTable('audio_series', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  folderPath: text('folder_path'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

export const audioFiles = sqliteTable('audio_files', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seriesId: integer('series_id').references(() => audioSeries.id),
  title: text('title').notNull(),
  filePath: text('file_path'),
  fileSize: integer('file_size'),
  fileType: text('file_type'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

export const lectureSeries = sqliteTable('lecture_series', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  folderPath: text('folder_path'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

export const lectureVideos = sqliteTable('lecture_videos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seriesId: integer('series_id').references(() => lectureSeries.id),
  title: text('title').notNull(),
  filePath: text('file_path'),
  fileSize: integer('file_size'),
  fileType: text('file_type'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

export const speechSeries = sqliteTable('speech_series', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  folderPath: text('folder_path'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

export const speechVideos = sqliteTable('speech_videos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seriesId: integer('series_id').references(() => speechSeries.id),
  title: text('title').notNull(),
  filePath: text('file_path'),
  fileSize: integer('file_size'),
  fileType: text('file_type'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

export const movies = sqliteTable('movies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  filePath: text('file_path'),
  fileSize: integer('file_size'),
  fileType: text('file_type'),
  year: integer('year'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

export const tvshowSeries = sqliteTable('tvshow_series', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  folderPath: text('folder_path'),
  episodeCount: integer('episode_count').default(0),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

export const tvshowEpisodes = sqliteTable('tvshow_episodes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seriesId: integer('series_id').references(() => tvshowSeries.id),
  title: text('title').notNull(),
  filePath: text('file_path'),
  fileSize: integer('file_size'),
  fileType: text('file_type'),
  season: integer('season'),
  episode: integer('episode'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

export const documentarySeries = sqliteTable('documentary_series', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  folderPath: text('folder_path'),
  episodeCount: integer('episode_count').default(0),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

export const documentaryEpisodes = sqliteTable('documentary_episodes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seriesId: integer('series_id').references(() => documentarySeries.id),
  title: text('title').notNull(),
  filePath: text('file_path'),
  fileSize: integer('file_size'),
  fileType: text('file_type'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

export const animationSeries = sqliteTable('animation_series', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  folderPath: text('folder_path'),
  episodeCount: integer('episode_count').default(0),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

export const animationEpisodes = sqliteTable('animation_episodes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seriesId: integer('series_id').references(() => animationSeries.id),
  title: text('title').notNull(),
  filePath: text('file_path'),
  fileSize: integer('file_size'),
  fileType: text('file_type'),
  episode: integer('episode'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

export const nbaSeries = sqliteTable('nba_series', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  folderPath: text('folder_path'),
  category: text('category'),
  gameCount: integer('game_count').default(0),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

export const nbaGames = sqliteTable('nba_games', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seriesId: integer('series_id').references(() => nbaSeries.id),
  title: text('title').notNull(),
  filePath: text('file_path'),
  fileSize: integer('file_size'),
  fileType: text('file_type'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

// ============================================
// Reading History
// ============================================

export const readingHistory = sqliteTable('reading_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id),
  itemType: text('item_type').notNull(), // 'ebook', 'magazine', 'book'
  itemId: integer('item_id').notNull(),
  title: text('title'),
  coverUrl: text('cover_url'),
  lastPage: integer('last_page'),
  lastReadAt: text('last_read_at'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
}, (table) => ({
  uniqueUserItem: unique().on(table.userId, table.itemType, table.itemId),
}))
