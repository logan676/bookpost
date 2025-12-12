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
  date,
  decimal,
  jsonb,
  index,
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
  // Profile fields
  avatar: text('avatar'),
  gender: text('gender'), // male/female/unset
  // Reading statistics
  totalReadingDuration: integer('total_reading_duration').default(0), // 累计总阅读时长(秒)
  totalReadingDays: integer('total_reading_days').default(0), // 累计阅读天数
  currentStreakDays: integer('current_streak_days').default(0), // 当前连续阅读天数
  maxStreakDays: integer('max_streak_days').default(0), // 最长连续阅读天数
  lastReadingDate: date('last_reading_date'), // 最后阅读日期
  booksReadCount: integer('books_read_count').default(0), // 读过的书数量
  booksFinishedCount: integer('books_finished_count').default(0), // 读完的书数量
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
  // Extended metadata fields for book detail
  author: text('author'),
  translator: text('translator'),
  description: text('description'),
  wordCount: integer('word_count'),
  pageCount: integer('page_count'),
  publicationDate: date('publication_date'),
  publisher: text('publisher'),
  isbn: text('isbn'),
  language: text('language').default('zh'),
  doubanId: text('douban_id'),
  goodreadsId: text('goodreads_id'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  isbnIdx: index('idx_ebooks_isbn').on(table.isbn),
  authorIdx: index('idx_ebooks_author').on(table.author),
}))

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
  // Extended metadata fields for magazine detail
  description: text('description'),
  issueNumber: text('issue_number'),
  publicationDate: date('publication_date'),
  language: text('language').default('zh'),
  issn: text('issn'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ============================================
// Audio Tables
// ============================================

export const audioSeries = pgTable('audio_series', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  coverUrl: text('cover_url'),
  audioCount: integer('audio_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
})

export const audioFiles = pgTable('audio_files', {
  id: serial('id').primaryKey(),
  seriesId: integer('series_id').references(() => audioSeries.id),
  title: text('title').notNull(),
  s3Key: text('s3_key'),
  fileSize: bigint('file_size', { mode: 'number' }),
  duration: integer('duration'),
  fileType: text('file_type'),
  trackNumber: integer('track_number'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  seriesIdx: index('idx_audio_files_series').on(table.seriesId),
}))

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
  // Extended fields for reading duration
  progress: decimal('progress', { precision: 5, scale: 4 }).default('0'), // 阅读进度 0.0000 - 1.0000
  lastPosition: text('last_position'), // 精确位置 (CFI for EPUB, page for PDF)
  chapterIndex: integer('chapter_index'), // 当前章节索引
  totalDurationSeconds: integer('total_duration_seconds').default(0), // 该书累计阅读时长(秒)
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  uniqueUserItem: unique().on(table.userId, table.itemType, table.itemId),
}))

// ============================================
// Reading Sessions (阅读会话记录)
// ============================================

export const readingSessions = pgTable('reading_sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  bookId: integer('book_id').notNull(),
  bookType: text('book_type').notNull(), // ebook/magazine/audiobook
  // Session info
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  durationSeconds: integer('duration_seconds').default(0),
  // Reading position
  startPosition: text('start_position'),
  endPosition: text('end_position'),
  startChapter: integer('start_chapter'),
  endChapter: integer('end_chapter'),
  pagesRead: integer('pages_read').default(0),
  // Device info
  deviceType: text('device_type'), // ios/android/web
  deviceId: text('device_id'),
  // Status
  isActive: boolean('is_active').default(true),
  // Pause/resume support
  isPaused: boolean('is_paused').default(false),
  pausedAt: timestamp('paused_at'),
  totalPausedSeconds: integer('total_paused_seconds').default(0),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userTimeIdx: index('idx_reading_sessions_user_time').on(table.userId, table.startTime),
  bookIdx: index('idx_reading_sessions_book').on(table.bookId, table.bookType),
}))

// ============================================
// Daily Reading Stats (每日阅读统计)
// ============================================

export const dailyReadingStats = pgTable('daily_reading_stats', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  date: date('date').notNull(),
  // Duration stats
  totalDurationSeconds: integer('total_duration_seconds').default(0),
  // Reading content stats
  booksRead: integer('books_read').default(0),
  booksFinished: integer('books_finished').default(0),
  pagesRead: integer('pages_read').default(0),
  notesCreated: integer('notes_created').default(0),
  highlightsCreated: integer('highlights_created').default(0),
  // Category stats (JSON)
  categoryDurations: jsonb('category_durations').default('{}'),
  bookDurations: jsonb('book_durations').default('{}'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userDateIdx: index('idx_daily_stats_user_date').on(table.userId, table.date),
  userDateUnique: unique().on(table.userId, table.date),
}))

// ============================================
// Weekly Leaderboard (周排行榜)
// ============================================

export const weeklyLeaderboard = pgTable('weekly_leaderboard', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  weekStart: date('week_start').notNull(),
  weekEnd: date('week_end').notNull(),
  // Ranking data
  totalDurationSeconds: integer('total_duration_seconds').default(0),
  rank: integer('rank'),
  rankChange: integer('rank_change').default(0),
  // Stats
  readingDays: integer('reading_days').default(0),
  booksRead: integer('books_read').default(0),
  // Interaction
  likesReceived: integer('likes_received').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  weekIdx: index('idx_weekly_lb_week').on(table.weekStart, table.rank),
  userWeekUnique: unique().on(table.userId, table.weekStart),
}))

// ============================================
// Leaderboard Likes (排行榜点赞)
// ============================================

export const leaderboardLikes = pgTable('leaderboard_likes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(), // 点赞者
  targetUserId: integer('target_user_id').references(() => users.id).notNull(), // 被点赞者
  weekStart: date('week_start').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userTargetWeekUnique: unique().on(table.userId, table.targetUserId, table.weekStart),
}))

// ============================================
// Reading Milestones (阅读里程碑)
// ============================================

export const readingMilestones = pgTable('reading_milestones', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  milestoneType: text('milestone_type').notNull(), // started_book/finished_book/streak_days/total_days/total_hours/books_finished
  milestoneValue: integer('milestone_value'),
  // Related content
  bookId: integer('book_id'),
  bookType: text('book_type'),
  bookTitle: text('book_title'),
  // Description
  title: text('title').notNull(),
  description: text('description'),
  achievedAt: timestamp('achieved_at').defaultNow(),
}, (table) => ({
  userTypeValueUnique: unique().on(table.userId, table.milestoneType, table.milestoneValue),
}))

// ============================================
// Badges (勋章定义)
// ============================================

export const badges = pgTable('badges', {
  id: serial('id').primaryKey(),
  // Basic info
  category: text('category').notNull(), // reading_streak/reading_duration/reading_days/books_finished/weekly_challenge/monthly_challenge
  level: integer('level').default(1),
  name: text('name').notNull(),
  description: text('description'),
  requirement: text('requirement'),
  // Condition
  conditionType: text('condition_type').notNull(), // streak_days/total_hours/total_days/books_finished/weekly_perfect/monthly_perfect
  conditionValue: integer('condition_value').notNull(),
  // Display
  iconUrl: text('icon_url'),
  backgroundColor: text('background_color'),
  // Stats
  earnedCount: integer('earned_count').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
})

// ============================================
// User Badges (用户勋章)
// ============================================

export const userBadges = pgTable('user_badges', {
  userId: integer('user_id').references(() => users.id).notNull(),
  badgeId: integer('badge_id').references(() => badges.id).notNull(),
  earnedAt: timestamp('earned_at').defaultNow(),
}, (table) => ({
  pk: unique().on(table.userId, table.badgeId),
}))

// ============================================
// Reading Challenges (阅读挑战)
// ============================================

export const readingChallenges = pgTable('reading_challenges', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  // Challenge type
  challengeType: text('challenge_type').notNull(), // weekly/monthly/custom
  // Target
  targetType: text('target_type').notNull(), // duration/books/days
  targetValue: integer('target_value').notNull(),
  // Time range
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  // Reward
  badgeId: integer('badge_id').references(() => badges.id),
  rewardDescription: text('reward_description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
})

// ============================================
// User Challenge Progress (用户挑战进度)
// ============================================

export const userChallengeProgress = pgTable('user_challenge_progress', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  challengeId: integer('challenge_id').references(() => readingChallenges.id).notNull(),
  currentValue: integer('current_value').default(0),
  isCompleted: boolean('is_completed').default(false),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userChallengeUnique: unique().on(table.userId, table.challengeId),
}))

// ============================================
// Book Detail Feature Tables
// ============================================

export const bookStats = pgTable('book_stats', {
  id: serial('id').primaryKey(),
  // Book reference (polymorphic - ebook or magazine)
  bookType: text('book_type').notNull(), // 'ebook' | 'magazine'
  bookId: integer('book_id').notNull(),
  // Reader counts
  totalReaders: integer('total_readers').default(0),
  currentReaders: integer('current_readers').default(0),
  finishedReaders: integer('finished_readers').default(0),
  // Content engagement
  totalHighlights: integer('total_highlights').default(0),
  totalReviews: integer('total_reviews').default(0),
  totalNotes: integer('total_notes').default(0),
  // Rating aggregates
  averageRating: decimal('average_rating', { precision: 3, scale: 2 }),
  ratingCount: integer('rating_count').default(0),
  recommendCount: integer('recommend_count').default(0),
  neutralCount: integer('neutral_count').default(0),
  notRecommendCount: integer('not_recommend_count').default(0),
  // Computed metrics
  recommendPercent: decimal('recommend_percent', { precision: 5, scale: 2 }),
  popularityScore: decimal('popularity_score', { precision: 10, scale: 4 }),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  bookUnique: unique().on(table.bookType, table.bookId),
  popularityIdx: index('idx_book_stats_popularity').on(table.popularityScore),
  bookIdx: index('idx_book_stats_book').on(table.bookType, table.bookId),
}))

export const bookReviews = pgTable('book_reviews', {
  id: serial('id').primaryKey(),
  // Relationships
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  bookType: text('book_type').notNull(), // 'ebook' | 'magazine'
  bookId: integer('book_id').notNull(),
  // Review content
  rating: integer('rating'), // 1-5
  recommendType: text('recommend_type'), // 'recommend' | 'neutral' | 'not_recommend'
  title: text('title'),
  content: text('content').notNull(),
  // Engagement
  likesCount: integer('likes_count').default(0),
  repliesCount: integer('replies_count').default(0),
  // Moderation
  isFeatured: boolean('is_featured').default(false),
  isHidden: boolean('is_hidden').default(false),
  // Metadata
  readingProgress: decimal('reading_progress', { precision: 5, scale: 4 }),
  deviceType: text('device_type'),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userBookUnique: unique().on(table.userId, table.bookType, table.bookId),
  bookIdx: index('idx_book_reviews_book').on(table.bookType, table.bookId),
  userIdx: index('idx_book_reviews_user').on(table.userId),
}))

export const reviewLikes = pgTable('review_likes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  reviewId: integer('review_id').notNull().references(() => bookReviews.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userReviewUnique: unique().on(table.userId, table.reviewId),
  reviewIdx: index('idx_review_likes_review').on(table.reviewId),
}))

export const userBookshelves = pgTable('user_bookshelves', {
  id: serial('id').primaryKey(),
  // Relationships
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  bookType: text('book_type').notNull(), // 'ebook' | 'magazine'
  bookId: integer('book_id').notNull(),
  // Status
  status: text('status').notNull().default('want_to_read'), // 'want_to_read' | 'reading' | 'finished' | 'abandoned'
  // Reading progress snapshot
  progress: decimal('progress', { precision: 5, scale: 4 }).default('0'),
  currentPage: integer('current_page'),
  currentPosition: text('current_position'),
  // User notes
  privateNotes: text('private_notes'),
  // Timestamps
  addedAt: timestamp('added_at').defaultNow(),
  startedAt: timestamp('started_at'),
  finishedAt: timestamp('finished_at'),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userBookUnique: unique().on(table.userId, table.bookType, table.bookId),
  userStatusIdx: index('idx_user_bookshelves_user_status').on(table.userId, table.status),
  bookIdx: index('idx_user_bookshelves_book').on(table.bookType, table.bookId),
}))

// ============================================
// Social Features - Following System
// ============================================

export const userFollowing = pgTable('user_following', {
  id: serial('id').primaryKey(),
  followerId: integer('follower_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  followingId: integer('following_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  followerFollowingUnique: unique().on(table.followerId, table.followingId),
  followerIdx: index('idx_user_following_follower').on(table.followerId),
  followingIdx: index('idx_user_following_following').on(table.followingId),
}))

// ============================================
// Social Features - Activity Feed
// ============================================

export const activityFeed = pgTable('activity_feed', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // Activity type: started_reading, finished_book, earned_badge, wrote_review, reached_milestone
  activityType: text('activity_type').notNull(),
  // Related content (polymorphic references)
  bookType: text('book_type'), // 'ebook' | 'magazine'
  bookId: integer('book_id'),
  bookTitle: text('book_title'),
  badgeId: integer('badge_id'),
  badgeName: text('badge_name'),
  reviewId: integer('review_id'),
  milestoneId: integer('milestone_id'),
  // Additional data (JSON for flexibility)
  metadata: jsonb('metadata').default('{}'),
  // Engagement
  likesCount: integer('likes_count').default(0),
  commentsCount: integer('comments_count').default(0),
  // Visibility
  isPublic: boolean('is_public').default(true),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdx: index('idx_activity_feed_user').on(table.userId),
  typeIdx: index('idx_activity_feed_type').on(table.activityType),
  createdIdx: index('idx_activity_feed_created').on(table.createdAt),
}))

export const activityLikes = pgTable('activity_likes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  activityId: integer('activity_id').notNull().references(() => activityFeed.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userActivityUnique: unique().on(table.userId, table.activityId),
  activityIdx: index('idx_activity_likes_activity').on(table.activityId),
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
export type ReadingSession = typeof readingSessions.$inferSelect
export type NewReadingSession = typeof readingSessions.$inferInsert
export type DailyReadingStat = typeof dailyReadingStats.$inferSelect
export type WeeklyLeaderboardEntry = typeof weeklyLeaderboard.$inferSelect
export type ReadingMilestone = typeof readingMilestones.$inferSelect
export type Badge = typeof badges.$inferSelect
export type UserBadge = typeof userBadges.$inferSelect
export type ReadingChallenge = typeof readingChallenges.$inferSelect
export type UserChallengeProgress = typeof userChallengeProgress.$inferSelect
export type AudioSeries = typeof audioSeries.$inferSelect
export type NewAudioSeries = typeof audioSeries.$inferInsert
export type AudioFile = typeof audioFiles.$inferSelect
export type NewAudioFile = typeof audioFiles.$inferInsert
// Book Detail Feature Types
export type BookStats = typeof bookStats.$inferSelect
export type NewBookStats = typeof bookStats.$inferInsert
export type BookReview = typeof bookReviews.$inferSelect
export type NewBookReview = typeof bookReviews.$inferInsert
export type ReviewLike = typeof reviewLikes.$inferSelect
export type UserBookshelf = typeof userBookshelves.$inferSelect
export type NewUserBookshelf = typeof userBookshelves.$inferInsert
// Social Feature Types
export type UserFollowing = typeof userFollowing.$inferSelect
export type NewUserFollowing = typeof userFollowing.$inferInsert
export type ActivityFeedEntry = typeof activityFeed.$inferSelect
export type NewActivityFeedEntry = typeof activityFeed.$inferInsert
export type ActivityLike = typeof activityLikes.$inferSelect
