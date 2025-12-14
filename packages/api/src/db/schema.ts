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
  bio: text('bio'), // User biography
  // Reading statistics
  totalReadingDuration: integer('total_reading_duration').default(0), // 累计总阅读时长(秒)
  totalReadingDays: integer('total_reading_days').default(0), // 累计阅读天数
  currentStreakDays: integer('current_streak_days').default(0), // 当前连续阅读天数
  maxStreakDays: integer('max_streak_days').default(0), // 最长连续阅读天数
  lastReadingDate: date('last_reading_date'), // 最后阅读日期
  booksReadCount: integer('books_read_count').default(0), // 读过的书数量
  booksFinishedCount: integer('books_finished_count').default(0), // 读完的书数量
  notesCount: integer('notes_count').default(0), // 笔记数量
  // Social statistics
  followingCount: integer('following_count').default(0), // 关注数
  followerCount: integer('follower_count').default(0), // 粉丝数
  likesReceivedCount: integer('likes_received_count').default(0), // 获赞数
  thoughtsCount: integer('thoughts_count').default(0), // 想法数量
  bookListsCount: integer('book_lists_count').default(0), // 书单数量
  reviewsCount: integer('reviews_count').default(0), // 书评数量
  // Badge display (featured badge to show on profile)
  featuredBadgeId: integer('featured_badge_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
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
  displayName: text('display_name'), // Localized display name
  nameEn: text('name_en'), // English name
  description: text('description'),
  slug: text('slug'), // URL-friendly identifier
  // Two-tier category system
  parentId: integer('parent_id'), // Self-reference for sub-categories (null = top-level)
  level: integer('level').default(1), // Hierarchy level: 1, 2, 3
  // Display
  icon: text('icon'), // SF Symbol name (e.g., 'book.closed', 'cpu')
  iconUrl: text('icon_url'), // Legacy icon URL
  coverUrl: text('cover_url'),
  themeColor: text('theme_color'),
  sortOrder: integer('sort_order').default(0),
  // Content type applicability
  bookTypes: text('book_types').default('ebook,magazine'), // Comma-separated: 'ebook', 'magazine', or both
  // Stats
  ebookCount: integer('ebook_count').default(0),
  magazineCount: integer('magazine_count').default(0),
  // Status
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  parentIdx: index('idx_ebook_categories_parent').on(table.parentId),
  slugIdx: index('idx_ebook_categories_slug').on(table.slug),
  levelIdx: index('idx_ebook_categories_level').on(table.level),
}))

// Book-Category Junction Table (Many-to-Many)
export const bookCategories = pgTable('book_categories', {
  id: serial('id').primaryKey(),
  bookId: integer('book_id').notNull(),
  bookType: text('book_type').notNull(), // 'ebook' or 'magazine'
  categoryId: integer('category_id').notNull().references(() => ebookCategories.id),
  isPrimary: boolean('is_primary').default(false), // Primary category marker
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  bookCategoryUnique: unique().on(table.bookId, table.bookType, table.categoryId),
  bookIdx: index('idx_book_categories_book').on(table.bookId, table.bookType),
  categoryIdx: index('idx_book_categories_category').on(table.categoryId),
}))

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
  // External ratings (from Google Books or other sources)
  externalRating: decimal('external_rating', { precision: 3, scale: 2 }),
  externalRatingsCount: integer('external_ratings_count'),
  externalRatingSource: text('external_rating_source'), // 'google_books', 'goodreads', etc.
  // Payment/Access type (for store)
  paymentType: text('payment_type').default('free'), // 'free', 'premium', 'purchase'
  priceInCents: integer('price_in_cents'), // For 'purchase' type
  // Content flags
  isWebNovel: boolean('is_web_novel').default(false),
  isFilmAdaptation: boolean('is_film_adaptation').default(false),
  hasAudiobook: boolean('has_audiobook').default(false),
  // Popularity metrics (for rankings, computed periodically)
  viewCount: integer('view_count').default(0),
  searchCount: integer('search_count').default(0),
  trendingScore: decimal('trending_score', { precision: 10, scale: 4 }).default('0'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  isbnIdx: index('idx_ebooks_isbn').on(table.isbn),
  authorIdx: index('idx_ebooks_author').on(table.author),
  paymentTypeIdx: index('idx_ebooks_payment_type').on(table.paymentType),
  trendingIdx: index('idx_ebooks_trending').on(table.trendingScore),
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
  // Highlight styling (3 styles, 6 colors as per design)
  highlightStyle: text('highlight_style').default('solid'), // 'solid', 'underline', 'squiggly'
  highlightColor: text('highlight_color').default('yellow'), // 'yellow', 'green', 'blue', 'pink', 'purple', 'orange'
  // Engagement
  ideaCount: integer('idea_count').default(0),
  // For popular highlights aggregation
  textHash: text('text_hash'), // Hash for finding same highlights across users
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userEbookIdx: index('idx_ebook_underlines_user_ebook').on(table.userId, table.ebookId),
  textHashIdx: index('idx_ebook_underlines_text_hash').on(table.textHash),
}))

export const ebookIdeas = pgTable('ebook_ideas', {
  id: serial('id').primaryKey(),
  underlineId: integer('underline_id').references(() => ebookUnderlines.id),
  userId: integer('user_id').references(() => users.id),
  content: text('content'),
  // Visibility settings (as per design)
  visibility: text('visibility').default('public'), // 'public', 'private', 'following', 'hide_from_friends'
  // Engagement
  likesCount: integer('likes_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdx: index('idx_ebook_ideas_user').on(table.userId),
  underlineIdx: index('idx_ebook_ideas_underline').on(table.underlineId),
}))

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
  // New fields for enhanced badge UI
  tier: text('tier'), // gold/silver/bronze/iron
  rarity: text('rarity'), // legendary/epic/rare/common
  lore: text('lore'), // Badge story/background text
  xpValue: integer('xp_value'), // XP points awarded
  requirements: jsonb('requirements'), // Multiple requirements: [{id, description, conditionType, conditionValue}]
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
// Book Lists (User-curated book collections)
// ============================================

export const bookLists = pgTable('book_lists', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // List info
  title: text('title').notNull(),
  description: text('description'),
  coverUrl: text('cover_url'),
  // Display customization (for Curated Collections)
  backgroundUrl: text('background_url'), // Background image for featured display
  themeColor: text('theme_color'), // Hex color for theme (e.g., '#6B4FA2')
  // Counts (denormalized for performance)
  bookCount: integer('book_count').default(0),
  followerCount: integer('follower_count').default(0),
  // Visibility
  isPublic: boolean('is_public').default(true),
  isFeatured: boolean('is_featured').default(false),
  // Categorization
  tags: text('tags'), // JSON array stored as text
  category: text('category'),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdx: index('idx_book_lists_user').on(table.userId),
  publicIdx: index('idx_book_lists_public').on(table.isPublic, table.followerCount),
}))

export const bookListItems = pgTable('book_list_items', {
  id: serial('id').primaryKey(),
  listId: integer('list_id').notNull().references(() => bookLists.id, { onDelete: 'cascade' }),
  bookType: text('book_type').notNull(), // 'ebook' | 'magazine'
  bookId: integer('book_id').notNull(),
  // Ordering
  position: integer('position').notNull(),
  // Optional annotation
  note: text('note'),
  // Timestamps
  addedAt: timestamp('added_at').defaultNow(),
}, (table) => ({
  listBookUnique: unique().on(table.listId, table.bookType, table.bookId),
  listPositionIdx: index('idx_book_list_items_position').on(table.listId, table.position),
  bookIdx: index('idx_book_list_items_book').on(table.bookType, table.bookId),
}))

export const bookListFollowers = pgTable('book_list_followers', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  listId: integer('list_id').notNull().references(() => bookLists.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userListUnique: unique().on(table.userId, table.listId),
  listIdx: index('idx_book_list_followers_list').on(table.listId),
}))

// ============================================
// Related Books (Pre-computed relationships)
// ============================================

export const relatedBooks = pgTable('related_books', {
  id: serial('id').primaryKey(),
  // Source book
  sourceBookType: text('source_book_type').notNull(),
  sourceBookId: integer('source_book_id').notNull(),
  // Related book
  relatedBookType: text('related_book_type').notNull(),
  relatedBookId: integer('related_book_id').notNull(),
  // Relation metadata
  relationType: text('relation_type').notNull(), // 'same_author' | 'same_publisher' | 'same_category' | 'similar_content' | 'readers_also_read'
  // Scoring
  similarityScore: decimal('similarity_score', { precision: 5, scale: 4 }).default('0'),
  confidence: decimal('confidence', { precision: 5, scale: 4 }).default('1'),
  // Metadata
  computedAt: timestamp('computed_at').defaultNow(),
  isActive: boolean('is_active').default(true),
}, (table) => ({
  sourceIdx: index('idx_related_books_source').on(table.sourceBookType, table.sourceBookId),
  relatedUnique: unique().on(table.sourceBookType, table.sourceBookId, table.relatedBookType, table.relatedBookId),
}))

// ============================================
// AI Book Summaries (Cached AI-generated content)
// ============================================

export const aiBookSummaries = pgTable('ai_book_summaries', {
  id: serial('id').primaryKey(),
  // Book reference
  bookType: text('book_type').notNull(),
  bookId: integer('book_id').notNull(),
  // Summary type: 'overview' | 'key_points' | 'topics' | 'chapter_summaries' | 'reading_guide' | 'vocabulary'
  summaryType: text('summary_type').notNull(),
  // Content (JSONB for flexibility)
  content: jsonb('content').notNull(),
  // Generation metadata
  modelUsed: text('model_used'),
  promptVersion: text('prompt_version'),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  generationCostUsd: decimal('generation_cost_usd', { precision: 10, scale: 6 }),
  // Quality metrics
  qualityScore: decimal('quality_score', { precision: 3, scale: 2 }),
  userFeedbackPositive: integer('user_feedback_positive').default(0),
  userFeedbackNegative: integer('user_feedback_negative').default(0),
  // Timestamps
  generatedAt: timestamp('generated_at').defaultNow(),
  expiresAt: timestamp('expires_at'),
}, (table) => ({
  bookSummaryUnique: unique().on(table.bookType, table.bookId, table.summaryType),
  bookIdx: index('idx_ai_summaries_book').on(table.bookType, table.bookId),
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
// Membership & Payment System
// ============================================

export const subscriptionPlans = pgTable('subscription_plans', {
  id: serial('id').primaryKey(),
  // Plan identification
  name: text('name').notNull(), // 'monthly_auto', 'monthly', 'quarterly', 'annual'
  displayName: text('display_name').notNull(), // '连续包月', '月卡', '季卡', '年卡'
  description: text('description'),
  // Pricing (in cents to avoid floating point issues)
  priceInCents: integer('price_in_cents').notNull(),
  currency: text('currency').default('CNY'),
  originalPriceInCents: integer('original_price_in_cents'), // For showing discounts
  // Duration
  durationDays: integer('duration_days').notNull(),
  // Features (JSON array of benefit keys)
  features: jsonb('features').default('[]'),
  // Auto-renewal
  isAutoRenewal: boolean('is_auto_renewal').default(false),
  // Platform-specific IDs
  appleProductId: text('apple_product_id'),
  googleProductId: text('google_product_id'),
  stripeProductId: text('stripe_product_id'),
  stripePriceId: text('stripe_price_id'),
  // Display
  badge: text('badge'), // 'best_value', 'popular', 'first_month_discount'
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const userMemberships = pgTable('user_memberships', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  planId: integer('plan_id').references(() => subscriptionPlans.id),
  // Status
  status: text('status').notNull().default('inactive'), // 'active', 'expired', 'cancelled', 'paused'
  // Dates
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  cancelledAt: timestamp('cancelled_at'),
  // Auto-renewal
  isAutoRenewal: boolean('is_auto_renewal').default(false),
  nextBillingDate: timestamp('next_billing_date'),
  // Platform subscription info
  platform: text('platform'), // 'apple', 'google', 'stripe', 'wechat', 'alipay'
  externalSubscriptionId: text('external_subscription_id'),
  // Trial
  isTrialUsed: boolean('is_trial_used').default(false),
  trialEndDate: timestamp('trial_end_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdx: index('idx_user_memberships_user').on(table.userId),
  statusIdx: index('idx_user_memberships_status').on(table.status),
}))

export const userCredits = pgTable('user_credits', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  // Balance (in cents)
  balanceInCents: integer('balance_in_cents').default(0),
  // Bonus credits (separate from purchased)
  bonusCreditsInCents: integer('bonus_credits_in_cents').default(0),
  // Lifetime stats
  totalPurchasedInCents: integer('total_purchased_in_cents').default(0),
  totalSpentInCents: integer('total_spent_in_cents').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // Transaction type
  type: text('type').notNull(), // 'purchase', 'subscription', 'credit_topup', 'credit_spend', 'refund', 'gift_sent', 'gift_received'
  // Amount (in cents)
  amountInCents: integer('amount_in_cents').notNull(),
  currency: text('currency').default('CNY'),
  // Status
  status: text('status').notNull().default('pending'), // 'pending', 'completed', 'failed', 'refunded'
  // Related entities (polymorphic)
  relatedType: text('related_type'), // 'subscription', 'ebook', 'credit', 'gift'
  relatedId: integer('related_id'),
  // Payment details
  paymentMethod: text('payment_method'), // 'apple_iap', 'google_play', 'stripe', 'wechat', 'alipay'
  externalTransactionId: text('external_transaction_id'),
  externalReceiptData: text('external_receipt_data'),
  // Metadata
  description: text('description'),
  metadata: jsonb('metadata').default('{}'),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  userIdx: index('idx_transactions_user').on(table.userId),
  typeIdx: index('idx_transactions_type').on(table.type),
  statusIdx: index('idx_transactions_status').on(table.status),
  createdIdx: index('idx_transactions_created').on(table.createdAt),
}))

export const redemptionCodes = pgTable('redemption_codes', {
  id: serial('id').primaryKey(),
  // Code
  code: text('code').notNull().unique(),
  // Type and value
  codeType: text('code_type').notNull(), // 'membership', 'credits', 'ebook'
  // For membership codes
  planId: integer('plan_id').references(() => subscriptionPlans.id),
  membershipDays: integer('membership_days'),
  // For credit codes
  creditAmountInCents: integer('credit_amount_in_cents'),
  // For ebook codes
  ebookId: integer('ebook_id').references(() => ebooks.id),
  // Usage limits
  maxUses: integer('max_uses').default(1),
  currentUses: integer('current_uses').default(0),
  // Validity
  validFrom: timestamp('valid_from').defaultNow(),
  validUntil: timestamp('valid_until'),
  isActive: boolean('is_active').default(true),
  // Source tracking
  source: text('source'), // 'promotion', 'partner', 'gift', 'compensation'
  campaignId: text('campaign_id'),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
}, (table) => ({
  codeIdx: index('idx_redemption_codes_code').on(table.code),
}))

export const redemptionCodeUsages = pgTable('redemption_code_usages', {
  id: serial('id').primaryKey(),
  codeId: integer('code_id').notNull().references(() => redemptionCodes.id),
  userId: integer('user_id').notNull().references(() => users.id),
  usedAt: timestamp('used_at').defaultNow(),
  // Result
  resultType: text('result_type'), // 'membership_extended', 'credits_added', 'ebook_unlocked'
  resultValue: text('result_value'), // JSON or description of what was granted
}, (table) => ({
  codeUserUnique: unique().on(table.codeId, table.userId),
}))

export const giftPurchases = pgTable('gift_purchases', {
  id: serial('id').primaryKey(),
  // Sender
  senderId: integer('sender_id').notNull().references(() => users.id),
  // Recipient (can be null if sent via code/link)
  recipientId: integer('recipient_id').references(() => users.id),
  recipientEmail: text('recipient_email'),
  // Gift type
  giftType: text('gift_type').notNull(), // 'membership', 'ebook', 'credits'
  // For membership gifts
  planId: integer('plan_id').references(() => subscriptionPlans.id),
  // For ebook gifts
  ebookId: integer('ebook_id').references(() => ebooks.id),
  // For credit gifts
  creditAmountInCents: integer('credit_amount_in_cents'),
  // Gift code (for unclaimed gifts)
  giftCode: text('gift_code').unique(),
  // Personal message
  message: text('message'),
  // Status
  status: text('status').notNull().default('pending'), // 'pending', 'claimed', 'expired', 'refunded'
  // Payment
  transactionId: integer('transaction_id').references(() => transactions.id),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  claimedAt: timestamp('claimed_at'),
  expiresAt: timestamp('expires_at'),
}, (table) => ({
  senderIdx: index('idx_gift_purchases_sender').on(table.senderId),
  recipientIdx: index('idx_gift_purchases_recipient').on(table.recipientId),
  giftCodeIdx: index('idx_gift_purchases_code').on(table.giftCode),
}))

// ============================================
// Ebook Purchase/Unlock (Single Purchase)
// ============================================

export const ebookPurchases = pgTable('ebook_purchases', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  ebookId: integer('ebook_id').notNull().references(() => ebooks.id),
  // Purchase details
  priceInCents: integer('price_in_cents').notNull(),
  currency: text('currency').default('CNY'),
  transactionId: integer('transaction_id').references(() => transactions.id),
  // Access type
  accessType: text('access_type').default('permanent'), // 'permanent', 'rental'
  expiresAt: timestamp('expires_at'), // For rental
  // Timestamps
  purchasedAt: timestamp('purchased_at').defaultNow(),
}, (table) => ({
  userEbookUnique: unique().on(table.userId, table.ebookId),
  userIdx: index('idx_ebook_purchases_user').on(table.userId),
}))

// ============================================
// TTS / AI Narration System
// ============================================

export const ttsVoices = pgTable('tts_voices', {
  id: serial('id').primaryKey(),
  // Voice identification
  name: text('name').notNull(),
  displayName: text('display_name').notNull(),
  // Provider
  provider: text('provider').notNull(), // 'azure', 'google', 'elevenlabs', 'aws_polly'
  providerVoiceId: text('provider_voice_id').notNull(),
  // Voice characteristics
  language: text('language').notNull().default('zh-CN'),
  gender: text('gender'), // 'male', 'female', 'neutral'
  age: text('age'), // 'child', 'young', 'adult', 'senior'
  style: text('style'), // 'narrative', 'conversational', 'news', 'calm'
  // Sample audio
  sampleAudioUrl: text('sample_audio_url'),
  // Availability
  isPremium: boolean('is_premium').default(false),
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),
  // Usage stats
  usageCount: integer('usage_count').default(0),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
})

export const userVoicePreferences = pgTable('user_voice_preferences', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // Default voice
  defaultVoiceId: integer('default_voice_id').references(() => ttsVoices.id),
  // Playback preferences
  defaultSpeed: decimal('default_speed', { precision: 3, scale: 2 }).default('1.00'), // 0.5 - 2.0
  defaultPitch: decimal('default_pitch', { precision: 3, scale: 2 }).default('1.00'),
  // Sleep timer default (minutes)
  defaultSleepTimer: integer('default_sleep_timer'),
  // Per-book voice preferences (JSON: {bookType_bookId: voiceId})
  bookVoicePreferences: jsonb('book_voice_preferences').default('{}'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userUnique: unique().on(table.userId),
}))

export const ttsAudioCache = pgTable('tts_audio_cache', {
  id: serial('id').primaryKey(),
  // Book reference
  bookType: text('book_type').notNull(),
  bookId: integer('book_id').notNull(),
  chapterIndex: integer('chapter_index').notNull(),
  // Voice used
  voiceId: integer('voice_id').notNull().references(() => ttsVoices.id),
  // Audio file
  s3Key: text('s3_key').notNull(),
  durationSeconds: integer('duration_seconds'),
  fileSizeBytes: integer('file_size_bytes'),
  // Generation metadata
  textLength: integer('text_length'),
  generationCostUsd: decimal('generation_cost_usd', { precision: 10, scale: 6 }),
  // Timestamps
  generatedAt: timestamp('generated_at').defaultNow(),
  lastAccessedAt: timestamp('last_accessed_at'),
  expiresAt: timestamp('expires_at'),
}, (table) => ({
  bookChapterVoiceUnique: unique().on(table.bookType, table.bookId, table.chapterIndex, table.voiceId),
  bookIdx: index('idx_tts_cache_book').on(table.bookType, table.bookId),
}))

// ============================================
// AI Chat & Q&A System
// ============================================

export const aiChatSessions = pgTable('ai_chat_sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // Book context (optional - for book-specific Q&A)
  bookType: text('book_type'),
  bookId: integer('book_id'),
  bookTitle: text('book_title'),
  // Session info
  title: text('title'), // Auto-generated or user-set
  // Stats
  messageCount: integer('message_count').default(0),
  totalInputTokens: integer('total_input_tokens').default(0),
  totalOutputTokens: integer('total_output_tokens').default(0),
  totalCostUsd: decimal('total_cost_usd', { precision: 10, scale: 6 }).default('0'),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  lastMessageAt: timestamp('last_message_at'),
}, (table) => ({
  userIdx: index('idx_ai_chat_sessions_user').on(table.userId),
  bookIdx: index('idx_ai_chat_sessions_book').on(table.bookType, table.bookId),
}))

export const aiChatMessages = pgTable('ai_chat_messages', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').notNull().references(() => aiChatSessions.id, { onDelete: 'cascade' }),
  // Message
  role: text('role').notNull(), // 'user', 'assistant'
  content: text('content').notNull(),
  // For assistant messages - generation metadata
  modelUsed: text('model_used'),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  // Quick tags used (for preset questions)
  quickTag: text('quick_tag'), // 'book_highlights', 'background_analysis', 'key_concepts'
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  sessionIdx: index('idx_ai_chat_messages_session').on(table.sessionId),
}))

// ============================================
// Dictionary & AI Lookup
// ============================================

export const dictionaryLookups = pgTable('dictionary_lookups', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  // Query
  word: text('word').notNull(),
  language: text('language').default('zh'),
  // Context (optional)
  bookType: text('book_type'),
  bookId: integer('book_id'),
  contextSentence: text('context_sentence'),
  // Dictionary result (cached)
  dictionaryResult: jsonb('dictionary_result'), // {pronunciation, definitions, examples}
  dictionarySource: text('dictionary_source'), // 'youdao', 'oxford', 'internal'
  // AI interpretation (cached)
  aiInterpretation: text('ai_interpretation'),
  aiKeywords: jsonb('ai_keywords').default('[]'), // Highlighted keywords
  // Related books (cached)
  relatedBookIds: jsonb('related_book_ids').default('[]'),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  wordIdx: index('idx_dictionary_lookups_word').on(table.word),
  userIdx: index('idx_dictionary_lookups_user').on(table.userId),
}))

// ============================================
// Social Features - Thoughts/Posts System
// ============================================

export const topics = pgTable('topics', {
  id: serial('id').primaryKey(),
  // Topic info
  name: text('name').notNull().unique(),
  displayName: text('display_name').notNull(),
  description: text('description'),
  // Category
  category: text('category'), // 'reading', 'growth', 'lifestyle', etc.
  // Stats
  postCount: integer('post_count').default(0),
  followerCount: integer('follower_count').default(0),
  // Display
  coverUrl: text('cover_url'),
  isHot: boolean('is_hot').default(false),
  isNew: boolean('is_new').default(false),
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
})

export const thoughts = pgTable('thoughts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // Content
  content: text('content').notNull(),
  // Media attachments (JSON array of URLs)
  images: jsonb('images').default('[]'),
  // Book reference (optional)
  bookType: text('book_type'),
  bookId: integer('book_id'),
  bookTitle: text('book_title'),
  // Linked to underline/highlight (optional)
  underlineId: integer('underline_id'),
  underlineText: text('underline_text'),
  // Visibility
  visibility: text('visibility').notNull().default('public'), // 'public', 'private', 'following', 'hide_from_friends'
  // Engagement
  likesCount: integer('likes_count').default(0),
  commentsCount: integer('comments_count').default(0),
  sharesCount: integer('shares_count').default(0),
  // Moderation
  isHidden: boolean('is_hidden').default(false),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdx: index('idx_thoughts_user').on(table.userId),
  createdIdx: index('idx_thoughts_created').on(table.createdAt),
  bookIdx: index('idx_thoughts_book').on(table.bookType, table.bookId),
  visibilityIdx: index('idx_thoughts_visibility').on(table.visibility),
}))

export const thoughtTopics = pgTable('thought_topics', {
  id: serial('id').primaryKey(),
  thoughtId: integer('thought_id').notNull().references(() => thoughts.id, { onDelete: 'cascade' }),
  topicId: integer('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  thoughtTopicUnique: unique().on(table.thoughtId, table.topicId),
  topicIdx: index('idx_thought_topics_topic').on(table.topicId),
}))

export const thoughtLikes = pgTable('thought_likes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  thoughtId: integer('thought_id').notNull().references(() => thoughts.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userThoughtUnique: unique().on(table.userId, table.thoughtId),
  thoughtIdx: index('idx_thought_likes_thought').on(table.thoughtId),
}))

export const thoughtComments = pgTable('thought_comments', {
  id: serial('id').primaryKey(),
  thoughtId: integer('thought_id').notNull().references(() => thoughts.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // Comment content
  content: text('content').notNull(),
  // Reply to another comment (optional)
  parentCommentId: integer('parent_comment_id'),
  replyToUserId: integer('reply_to_user_id').references(() => users.id),
  // Engagement
  likesCount: integer('likes_count').default(0),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  thoughtIdx: index('idx_thought_comments_thought').on(table.thoughtId),
  userIdx: index('idx_thought_comments_user').on(table.userId),
}))

export const userMentions = pgTable('user_mentions', {
  id: serial('id').primaryKey(),
  // The content containing the mention
  contentType: text('content_type').notNull(), // 'thought', 'comment'
  contentId: integer('content_id').notNull(),
  // Who was mentioned
  mentionedUserId: integer('mentioned_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // Who made the mention
  mentionerId: integer('mentioner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // Read status
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  mentionedUserIdx: index('idx_user_mentions_mentioned').on(table.mentionedUserId),
  contentIdx: index('idx_user_mentions_content').on(table.contentType, table.contentId),
}))

export const topicFollowers = pgTable('topic_followers', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  topicId: integer('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userTopicUnique: unique().on(table.userId, table.topicId),
  topicIdx: index('idx_topic_followers_topic').on(table.topicId),
}))

// ============================================
// Store & Discovery - Rankings
// ============================================

export const rankings = pgTable('rankings', {
  id: serial('id').primaryKey(),
  // Ranking identification
  rankingType: text('ranking_type').notNull(), // 'trending', 'hot_search', 'new_books', 'fiction', 'film_tv', 'audiobook', 'top_200', 'masterpiece', 'potential_masterpiece'
  // Time period
  periodType: text('period_type').notNull(), // 'daily', 'weekly', 'monthly', 'all_time'
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  // Display
  displayName: text('display_name').notNull(),
  themeColor: text('theme_color'), // Hex color for ranking theme
  description: text('description'),
  // Status
  isActive: boolean('is_active').default(true),
  // Timestamps
  computedAt: timestamp('computed_at').defaultNow(),
  expiresAt: timestamp('expires_at'),
}, (table) => ({
  typeIdx: index('idx_rankings_type').on(table.rankingType),
  periodIdx: index('idx_rankings_period').on(table.periodStart, table.periodEnd),
}))

export const rankingItems = pgTable('ranking_items', {
  id: serial('id').primaryKey(),
  rankingId: integer('ranking_id').notNull().references(() => rankings.id, { onDelete: 'cascade' }),
  // Book reference
  bookType: text('book_type').notNull(),
  bookId: integer('book_id').notNull(),
  // Rank position
  rank: integer('rank').notNull(),
  previousRank: integer('previous_rank'), // For showing rank change
  rankChange: integer('rank_change').default(0), // Positive = moved up, negative = moved down
  // Score used for ranking
  score: decimal('score', { precision: 15, scale: 4 }),
  // Snapshot of book data at ranking time
  bookTitle: text('book_title'),
  bookAuthor: text('book_author'),
  bookCoverUrl: text('book_cover_url'),
  readerCount: integer('reader_count'),
  rating: decimal('rating', { precision: 3, scale: 2 }),
  // Evaluation tags computed from rating
  evaluationTag: text('evaluation_tag'), // 'masterpiece', 'highly_praised', 'worth_reading'
}, (table) => ({
  rankingIdx: index('idx_ranking_items_ranking').on(table.rankingId),
  rankIdx: index('idx_ranking_items_rank').on(table.rankingId, table.rank),
  bookIdx: index('idx_ranking_items_book').on(table.bookType, table.bookId),
}))

// ============================================
// Store & Discovery - Recommendations
// ============================================

export const userRecommendations = pgTable('user_recommendations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // Recommended book
  bookType: text('book_type').notNull(),
  bookId: integer('book_id').notNull(),
  // Recommendation metadata
  recommendationType: text('recommendation_type').notNull(), // 'for_you', 'similar_to_reading', 'popular_in_category', 'friends_reading', 'new_release'
  // Reason (displayed to user)
  reason: text('reason'), // e.g., "因为你喜欢《三体》" / "Based on your reading history"
  reasonType: text('reason_type'), // 'similar_book', 'same_author', 'same_category', 'friend_activity', 'trending'
  // Source book (if recommendation is based on another book)
  sourceBookType: text('source_book_type'),
  sourceBookId: integer('source_book_id'),
  // Scoring
  relevanceScore: decimal('relevance_score', { precision: 5, scale: 4 }),
  // Display order
  position: integer('position').default(0),
  // User interaction
  isViewed: boolean('is_viewed').default(false),
  isClicked: boolean('is_clicked').default(false),
  isDismissed: boolean('is_dismissed').default(false),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  expiresAt: timestamp('expires_at'),
}, (table) => ({
  userIdx: index('idx_user_recommendations_user').on(table.userId),
  userTypeIdx: index('idx_user_recommendations_user_type').on(table.userId, table.recommendationType),
  bookIdx: index('idx_user_recommendations_book').on(table.bookType, table.bookId),
}))

// ============================================
// Store & Discovery - Curated/Daily Lists
// ============================================

export const curatedLists = pgTable('curated_lists', {
  id: serial('id').primaryKey(),
  // List identification
  listType: text('list_type').notNull(), // 'nyt_bestseller', 'amazon_best', 'bill_gates', 'goodreads_choice', 'pulitzer', 'booker', etc.
  // Display
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  description: text('description'),
  coverUrl: text('cover_url'),
  themeColor: text('theme_color'),
  // Source/Attribution
  sourceName: text('source_name'), // e.g., "New York Times", "Bill Gates", "Amazon"
  sourceUrl: text('source_url'),
  sourceLogoUrl: text('source_logo_url'), // Logo of the source
  curatorId: integer('curator_id').references(() => users.id), // If curated by a user
  // Year/Period (for annual lists)
  year: integer('year'), // e.g., 2024
  month: integer('month'), // Optional: 1-12 for monthly lists
  category: text('category'), // e.g., 'fiction', 'nonfiction', 'business', 'science'
  // Schedule (for daily/weekly lists)
  publishDate: date('publish_date'),
  // Stats
  bookCount: integer('book_count').default(0),
  viewCount: integer('view_count').default(0),
  saveCount: integer('save_count').default(0),
  // Display order
  sortOrder: integer('sort_order').default(0),
  isFeatured: boolean('is_featured').default(false),
  isActive: boolean('is_active').default(true),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  listTypeIdx: index('idx_curated_lists_type').on(table.listType),
  publishDateIdx: index('idx_curated_lists_publish_date').on(table.publishDate),
  featuredIdx: index('idx_curated_lists_featured').on(table.isFeatured, table.sortOrder),
  yearIdx: index('idx_curated_lists_year').on(table.year),
}))

export const curatedListItems = pgTable('curated_list_items', {
  id: serial('id').primaryKey(),
  listId: integer('list_id').notNull().references(() => curatedLists.id, { onDelete: 'cascade' }),
  // Book reference (null if book not available in our library)
  bookType: text('book_type').notNull().default('ebook'),
  bookId: integer('book_id'), // NULL if book not available
  // External book info (for books not in our library)
  externalTitle: text('external_title'), // Book title
  externalAuthor: text('external_author'), // Author name
  externalCoverUrl: text('external_cover_url'), // Cover image URL
  externalDescription: text('external_description'), // Book description
  isbn: text('isbn'), // ISBN for matching
  isbn13: text('isbn_13'), // ISBN-13
  amazonUrl: text('amazon_url'), // Amazon link
  goodreadsUrl: text('goodreads_url'), // Goodreads link
  // Position
  position: integer('position').notNull(),
  // Editorial note (optional)
  editorNote: text('editor_note'),
  // Timestamps
  addedAt: timestamp('added_at').defaultNow(),
}, (table) => ({
  listPositionIdx: index('idx_curated_list_items_position').on(table.listId, table.position),
  isbnIdx: index('idx_curated_list_items_isbn').on(table.isbn),
}))

// ============================================
// Celebrity/Expert Recommendations
// ============================================

export const celebrities = pgTable('celebrities', {
  id: serial('id').primaryKey(),
  // Basic info
  name: text('name').notNull(),
  title: text('title'), // e.g., "作家", "企业家", "学者"
  description: text('description'),
  avatarUrl: text('avatar_url'),
  // External links
  weiboUrl: text('weibo_url'),
  wechatId: text('wechat_id'),
  websiteUrl: text('website_url'),
  // Stats
  recommendationCount: integer('recommendation_count').default(0),
  // Display
  isVerified: boolean('is_verified').default(false),
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
})

export const celebrityRecommendations = pgTable('celebrity_recommendations', {
  id: serial('id').primaryKey(),
  celebrityId: integer('celebrity_id').notNull().references(() => celebrities.id, { onDelete: 'cascade' }),
  // Book reference
  bookType: text('book_type').notNull(),
  bookId: integer('book_id').notNull(),
  // Recommendation details
  quote: text('quote'), // What they said about the book
  perspective: text('perspective'), // Their unique angle/viewpoint
  source: text('source'), // Where this recommendation came from
  sourceUrl: text('source_url'),
  sourceDate: date('source_date'),
  // Display
  isFeatured: boolean('is_featured').default(false),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  celebrityIdx: index('idx_celebrity_recs_celebrity').on(table.celebrityId),
  bookIdx: index('idx_celebrity_recs_book').on(table.bookType, table.bookId),
  celebrityBookUnique: unique().on(table.celebrityId, table.bookType, table.bookId),
}))

// ============================================
// Popular Highlights (Community)
// ============================================

export const popularHighlights = pgTable('popular_highlights', {
  id: serial('id').primaryKey(),
  // Book reference
  bookType: text('book_type').notNull(),
  bookId: integer('book_id').notNull(),
  // Highlight text
  text: text('text').notNull(),
  textHash: text('text_hash').notNull(), // For deduplication
  // Position info
  chapterIndex: integer('chapter_index'),
  position: text('position'), // CFI or page number
  // Aggregated stats
  highlighterCount: integer('highlighter_count').default(1),
  // Most recent highlighter (for display)
  lastHighlighterId: integer('last_highlighter_id').references(() => users.id),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  bookIdx: index('idx_popular_highlights_book').on(table.bookType, table.bookId),
  textHashUnique: unique().on(table.bookType, table.bookId, table.textHash),
  popularityIdx: index('idx_popular_highlights_count').on(table.highlighterCount),
}))

// ============================================
// User Settings & Preferences
// ============================================

export const userSettings = pgTable('user_settings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  // Reading settings
  keepScreenOn: boolean('keep_screen_on').default(true),
  allowLandscape: boolean('allow_landscape').default(false),
  hideOthersThoughts: boolean('hide_others_thoughts').default(false),
  showTimeBattery: boolean('show_time_battery').default(true),
  firstLineIndent: boolean('first_line_indent').default(true),
  leftTapNextPage: boolean('left_tap_next_page').default(false),
  filterWebNovels: boolean('filter_web_novels').default(false),
  autoDownloadOnAdd: boolean('auto_download_on_add').default(false),
  pageTurnStyle: text('page_turn_style').default('slide'), // 'slide', 'curl', 'fade', 'none'
  darkMode: text('dark_mode').default('system'), // 'system', 'light', 'dark'
  // Privacy settings
  profileVisibility: text('profile_visibility').default('everyone'), // 'everyone', 'followers', 'mutual_follows', 'only_me'
  showBookshelf: boolean('show_bookshelf').default(true),
  showFavoriteBooks: boolean('show_favorite_books').default(true),
  showBookLists: boolean('show_book_lists').default(true),
  showBadges: boolean('show_badges').default(true),
  showThoughts: boolean('show_thoughts').default(true),
  // Notification settings
  notifyFriendActivity: boolean('notify_friend_activity').default(true),
  notifyLikes: boolean('notify_likes').default(true),
  notifyComments: boolean('notify_comments').default(true),
  notifyMentions: boolean('notify_mentions').default(true),
  notifyNewFollowers: boolean('notify_new_followers').default(true),
  // Student verification
  isStudentVerified: boolean('is_student_verified').default(false),
  studentVerifiedAt: timestamp('student_verified_at'),
  studentVerificationExpiry: timestamp('student_verification_expiry'),
  // Youth mode
  youthModeEnabled: boolean('youth_mode_enabled').default(false),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// ============================================
// Notifications
// ============================================

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // Notification type
  type: text('type').notNull(), // 'like', 'comment', 'mention', 'follow', 'badge_earned', 'milestone', 'system'
  // Content
  title: text('title').notNull(),
  body: text('body'),
  // Actor (who triggered this notification)
  actorId: integer('actor_id').references(() => users.id),
  // Target content (what was interacted with)
  targetType: text('target_type'), // 'thought', 'comment', 'review', 'book'
  targetId: integer('target_id'),
  // Additional data
  metadata: jsonb('metadata').default('{}'),
  // Deep link
  actionUrl: text('action_url'),
  // Status
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at'),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdx: index('idx_notifications_user').on(table.userId),
  userUnreadIdx: index('idx_notifications_user_unread').on(table.userId, table.isRead),
  createdIdx: index('idx_notifications_created').on(table.createdAt),
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
// Book Lists Types
export type BookList = typeof bookLists.$inferSelect
export type NewBookList = typeof bookLists.$inferInsert
export type BookListItem = typeof bookListItems.$inferSelect
export type NewBookListItem = typeof bookListItems.$inferInsert
export type BookListFollower = typeof bookListFollowers.$inferSelect
// Related Books Types
export type RelatedBook = typeof relatedBooks.$inferSelect
export type NewRelatedBook = typeof relatedBooks.$inferInsert
// AI Summaries Types
export type AIBookSummary = typeof aiBookSummaries.$inferSelect
export type NewAIBookSummary = typeof aiBookSummaries.$inferInsert
// Membership & Payment Types
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect
export type NewSubscriptionPlan = typeof subscriptionPlans.$inferInsert
export type UserMembership = typeof userMemberships.$inferSelect
export type NewUserMembership = typeof userMemberships.$inferInsert
export type UserCredit = typeof userCredits.$inferSelect
export type Transaction = typeof transactions.$inferSelect
export type NewTransaction = typeof transactions.$inferInsert
export type RedemptionCode = typeof redemptionCodes.$inferSelect
export type NewRedemptionCode = typeof redemptionCodes.$inferInsert
export type RedemptionCodeUsage = typeof redemptionCodeUsages.$inferSelect
export type GiftPurchase = typeof giftPurchases.$inferSelect
export type NewGiftPurchase = typeof giftPurchases.$inferInsert
export type EbookPurchase = typeof ebookPurchases.$inferSelect
export type NewEbookPurchase = typeof ebookPurchases.$inferInsert
// TTS / AI Narration Types
export type TTSVoice = typeof ttsVoices.$inferSelect
export type NewTTSVoice = typeof ttsVoices.$inferInsert
export type UserVoicePreference = typeof userVoicePreferences.$inferSelect
export type TTSAudioCache = typeof ttsAudioCache.$inferSelect
// AI Chat Types
export type AIChatSession = typeof aiChatSessions.$inferSelect
export type NewAIChatSession = typeof aiChatSessions.$inferInsert
export type AIChatMessage = typeof aiChatMessages.$inferSelect
export type NewAIChatMessage = typeof aiChatMessages.$inferInsert
export type DictionaryLookup = typeof dictionaryLookups.$inferSelect
// Social Thoughts Types
export type Topic = typeof topics.$inferSelect
export type NewTopic = typeof topics.$inferInsert
export type Thought = typeof thoughts.$inferSelect
export type NewThought = typeof thoughts.$inferInsert
export type ThoughtTopic = typeof thoughtTopics.$inferSelect
export type ThoughtLike = typeof thoughtLikes.$inferSelect
export type ThoughtComment = typeof thoughtComments.$inferSelect
export type NewThoughtComment = typeof thoughtComments.$inferInsert
export type UserMention = typeof userMentions.$inferSelect
export type TopicFollower = typeof topicFollowers.$inferSelect
// Rankings Types
export type Ranking = typeof rankings.$inferSelect
export type NewRanking = typeof rankings.$inferInsert
export type RankingItem = typeof rankingItems.$inferSelect
export type NewRankingItem = typeof rankingItems.$inferInsert
// Recommendations Types
export type UserRecommendation = typeof userRecommendations.$inferSelect
export type NewUserRecommendation = typeof userRecommendations.$inferInsert
// Curated Lists Types
export type CuratedList = typeof curatedLists.$inferSelect
export type NewCuratedList = typeof curatedLists.$inferInsert
export type CuratedListItem = typeof curatedListItems.$inferSelect
export type NewCuratedListItem = typeof curatedListItems.$inferInsert
// Celebrity Types
export type Celebrity = typeof celebrities.$inferSelect
export type NewCelebrity = typeof celebrities.$inferInsert
export type CelebrityRecommendation = typeof celebrityRecommendations.$inferSelect
export type NewCelebrityRecommendation = typeof celebrityRecommendations.$inferInsert
// Popular Highlights Types
export type PopularHighlight = typeof popularHighlights.$inferSelect
export type NewPopularHighlight = typeof popularHighlights.$inferInsert
// User Settings Types
export type UserSetting = typeof userSettings.$inferSelect
export type NewUserSetting = typeof userSettings.$inferInsert
// Notification Types
export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert
// Ebook Category Types
export type EbookCategory = typeof ebookCategories.$inferSelect
export type NewEbookCategory = typeof ebookCategories.$inferInsert
export type BookCategory = typeof bookCategories.$inferSelect
export type NewBookCategory = typeof bookCategories.$inferInsert
// Ebook Underline/Idea Types
export type EbookUnderline = typeof ebookUnderlines.$inferSelect
export type NewEbookUnderline = typeof ebookUnderlines.$inferInsert
export type EbookIdea = typeof ebookIdeas.$inferSelect
export type NewEbookIdea = typeof ebookIdeas.$inferInsert
