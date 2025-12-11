# Book Detail Page - Technical Specification Document

> **Version:** 1.0
> **Date:** 2025-12-11
> **Status:** Draft - Pending Approval
> **Reference:** WeChat Reading (微信读书) Book Detail UI

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Design Reference Analysis](#2-design-reference-analysis)
3. [Current State Assessment](#3-current-state-assessment)
4. [Database Schema Design](#4-database-schema-design)
5. [API Specification](#5-api-specification)
6. [iOS Implementation](#6-ios-implementation)
7. [External Services Integration](#7-external-services-integration)
8. [Background Jobs & Data Pipeline](#8-background-jobs--data-pipeline)
9. [Implementation Phases](#9-implementation-phases)
10. [Testing Strategy](#10-testing-strategy)
11. [Cost Analysis](#11-cost-analysis)
12. [Risk Assessment](#12-risk-assessment)

---

## 1. Executive Summary

### 1.1 Objective

Transform the current minimal book detail page into a feature-rich, socially-engaging experience similar to WeChat Reading (微信读书), including:

- Rich book metadata (author, description, publisher, etc.)
- Social features (reviews, ratings, popular highlights)
- AI-powered reading guides and summaries
- Book discovery (related books, curated lists)
- Personal bookshelf management

### 1.2 Scope

| In Scope | Out of Scope |
|----------|--------------|
| Ebook detail page | Audiobook creation/TTS |
| Magazine detail page | Real-time collaborative reading |
| Backend API development | Payment/subscription system |
| iOS app implementation | Android app |
| Data enrichment pipeline | Web app changes |
| AI summary generation | Social follow system |

### 1.3 Success Metrics

- Book metadata coverage: >80% of books have author + description
- User engagement: 30% increase in time spent on detail page
- Bookshelf adoption: 50% of active users use bookshelf feature
- Review participation: 10% of readers leave reviews

---

## 2. Design Reference Analysis

### 2.1 Screenshot Breakdown

#### IMG_0186 - Main Book Information

```
┌─────────────────────────────────────────────┐
│  < 返回    [分享] [听书] [笔记] [导出] [...]  │  <- Header Actions
├─────────────────────────────────────────────┤
│  ┌──────┐                                   │
│  │      │  污名陷阱                          │  <- Title
│  │ COVER│  [美]奥弗·沙龙 / 王瀚 杨子钰 译     │  <- Author/Translator
│  │      │                                   │
│  │      │  名校博士送外卖，大厂高管失业开网约... │  <- Description
│  └──────┘                                   │
├─────────────────────────────────────────────┤
│  阅读      我的阅读    字数      版权信息      │
│  2010人    标记在读    14.2万字   中信出版集团  │  <- Stats Row
│  219人阅读完  2025年9月出版                   │
├─────────────────────────────────────────────┤
│  微信读书推荐值                    写点评     │
│  ┌────────────────────────────────────────┐ │
│  │  76.7%   推荐 ████████████             │ │  <- Rating Bar
│  │          一般 ███                       │ │
│  │          不行 █                         │ │
│  └────────────────────────────────────────┘ │
│  全部(55)  推荐(37)  一般(17)  不行(1)       │  <- Filter Tabs
├─────────────────────────────────────────────┤
│  [Avatar] 农民CPA · 推荐                    │
│  《污名陷阱》聚焦"高学历失业者"这一群体，通   │  <- Review
│  过139场深度访谈和12年的社会学实证研究...     │
│  👍 35                                     │
├─────────────────────────────────────────────┤
│  [AI]        [加入书架]        [阅读]       │  <- Bottom Bar
└─────────────────────────────────────────────┘
```

#### IMG_0187 - AI Guide & Highlights

```
┌─────────────────────────────────────────────┐
│  AI导读                                     │
├─────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐          │
│  │ 污名与失业挑战 │  │ 社交困境     │          │  <- Topic Cards
│  │ 4个总结       │  │ ...         │          │
│  └─────────────┘  └─────────────┘          │
│                [查看全部]                   │
├─────────────────────────────────────────────┤
│  热门划线                                   │
├─────────────────────────────────────────────┤
│  "这恰恰暴露了我们深信：只要做'对'的事情，    │
│   努力学习，考入好大学，找到好工作，就能一帆   │  <- Popular Highlight
│   风顺，而且你的职业生涯不会突然崩塌"        │
│  是好日映 等 72 人划线                       │
├─────────────────────────────────────────────┤
│                [查看全部 30 个热门划线]       │
├─────────────────────────────────────────────┤
│  延展阅读                                   │
│  相关书籍                                   │
│  根据本书内容推荐                            │
└─────────────────────────────────────────────┘
```

#### IMG_0188 - Related Books & Publisher

```
┌─────────────────────────────────────────────┐
│  延展阅读                                   │
│  相关书籍                                   │
│  根据本书内容推荐                            │
├─────────────────────────────────────────────┤
│  [Cover1] [Cover2] [Cover3] [Cover4]       │
│  为何生活   日本世相  人类动物园  精英陷阱    │  <- Related Books
│  越来越像...  列：饱食...  (译文科学)        │
│                                            │
│              [换一批]                       │
├─────────────────────────────────────────────┤
│  中信出版集团                    [+ 关注]   │
│  本书出品方 · 3529 个作品                   │  <- Publisher Section
├─────────────────────────────────────────────┤
│  [Cover1] [Cover2] [Cover3] [Cover4]       │
│  匹配：谁   超正经凶  污名陷阱   复利效应    │  <- Publisher's Books
│  能得到...  案调查...             ...       │
│                                            │
│              [查看全部]                     │
└─────────────────────────────────────────────┘
```

#### IMG_0189 - Book Lists

```
┌─────────────────────────────────────────────┐
│  延展书单                                   │
├─────────────────────────────────────────────┤
│  蜜獾吃书 书单                    344本 >   │
│  edenin的书单 · 4164人收藏                  │
│  [Cover1] [Cover2] [Cover3] [Cover4]       │
├─────────────────────────────────────────────┤
│  2024、2025年豆瓣重点新书          493本 >   │
│  Jack的书单 · 3227人收藏                    │
│  [Cover1] [Cover2] [Cover3] [Cover4]       │
├─────────────────────────────────────────────┤
│  书单|打工人悲歌:失语者的呼声与毫无...  87本 >│
│  琪宜的书单 · 1479人收藏                    │
│  [Cover1] [Cover2] [Cover3] [Cover4]       │
└─────────────────────────────────────────────┘
```

### 2.2 Feature Inventory

| Feature | Priority | Complexity | Dependencies |
|---------|----------|------------|--------------|
| Book metadata display | P0 | Low | Schema update |
| Reader statistics | P0 | Medium | Stats aggregation |
| Add to bookshelf | P0 | Low | New table |
| User reviews | P1 | Medium | New tables |
| Rating system | P1 | Medium | Reviews |
| Popular highlights | P1 | High | Underline aggregation |
| AI reading guide | P2 | High | Claude API |
| Related books | P2 | High | Similarity computation |
| Publisher section | P2 | Low | Publisher data |
| Book lists | P3 | High | List system |
| Share functionality | P3 | Low | Deep links |
| Listen (TTS) | P4 | Very High | TTS service |

---

## 3. Current State Assessment

### 3.1 Current Database Schema

#### ebooks table
```sql
CREATE TABLE ebooks (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES ebook_categories(id),
  title TEXT NOT NULL,
  file_path TEXT,
  file_size BIGINT,
  file_type TEXT,                    -- 'pdf', 'epub'
  normalized_title TEXT,
  cover_url TEXT,
  s3_key TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
-- Missing: author, description, publisher, isbn, word_count, page_count, publication_date
```

#### magazines table
```sql
CREATE TABLE magazines (
  id SERIAL PRIMARY KEY,
  publisher_id INTEGER REFERENCES publishers(id),
  title TEXT NOT NULL,
  file_path TEXT,
  file_size BIGINT,
  year INTEGER,
  page_count INTEGER,
  cover_url TEXT,
  preprocessed BOOLEAN DEFAULT FALSE,
  s3_key TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
-- Missing: description, issue_number, publication_date
```

### 3.2 Current iOS Implementation

#### EbookDetailView.swift (Current)
```swift
struct EbookDetailView: View {
    let ebookId: Int
    @State private var ebook: Ebook?

    var body: some View {
        ScrollView {
            VStack {
                // Only shows:
                // - Cover image
                // - Title
                // - File type badge
                // - File size
                // - "Start Reading" button
            }
        }
    }
}
```

### 3.3 Gap Analysis

| Aspect | Current | Target | Gap |
|--------|---------|--------|-----|
| Metadata fields | 4 | 15 | +11 fields |
| API endpoints | 2 | 15 | +13 endpoints |
| DB tables | 0 new | 9 new | +9 tables |
| iOS views | 1 | 12 | +11 components |
| External APIs | 0 | 3 | +3 integrations |

---

## 4. Database Schema Design

### 4.1 Schema Migration: Extend Existing Tables

#### Migration 001: Extend ebooks table
```sql
-- migrations/001_extend_ebooks.sql

ALTER TABLE ebooks ADD COLUMN IF NOT EXISTS author TEXT;
ALTER TABLE ebooks ADD COLUMN IF NOT EXISTS translator TEXT;
ALTER TABLE ebooks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE ebooks ADD COLUMN IF NOT EXISTS word_count INTEGER;
ALTER TABLE ebooks ADD COLUMN IF NOT EXISTS page_count INTEGER;
ALTER TABLE ebooks ADD COLUMN IF NOT EXISTS publication_date DATE;
ALTER TABLE ebooks ADD COLUMN IF NOT EXISTS publisher TEXT;
ALTER TABLE ebooks ADD COLUMN IF NOT EXISTS isbn TEXT;
ALTER TABLE ebooks ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'zh';
ALTER TABLE ebooks ADD COLUMN IF NOT EXISTS douban_id TEXT;
ALTER TABLE ebooks ADD COLUMN IF NOT EXISTS goodreads_id TEXT;

-- Index for ISBN lookup
CREATE INDEX IF NOT EXISTS idx_ebooks_isbn ON ebooks(isbn) WHERE isbn IS NOT NULL;

-- Index for author search
CREATE INDEX IF NOT EXISTS idx_ebooks_author ON ebooks(author) WHERE author IS NOT NULL;

COMMENT ON COLUMN ebooks.author IS 'Primary author name';
COMMENT ON COLUMN ebooks.translator IS 'Translator name(s) for translated works';
COMMENT ON COLUMN ebooks.description IS 'Book synopsis/description, max 2000 chars';
COMMENT ON COLUMN ebooks.word_count IS 'Total word count of the book';
COMMENT ON COLUMN ebooks.isbn IS 'ISBN-10 or ISBN-13';
COMMENT ON COLUMN ebooks.douban_id IS 'Douban book ID for Chinese books';
```

#### Migration 002: Extend magazines table
```sql
-- migrations/002_extend_magazines.sql

ALTER TABLE magazines ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE magazines ADD COLUMN IF NOT EXISTS issue_number TEXT;
ALTER TABLE magazines ADD COLUMN IF NOT EXISTS publication_date DATE;
ALTER TABLE magazines ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'zh';
ALTER TABLE magazines ADD COLUMN IF NOT EXISTS issn TEXT;

COMMENT ON COLUMN magazines.issue_number IS 'Issue identifier, e.g., "Vol.5 No.3" or "2024年第12期"';
COMMENT ON COLUMN magazines.issn IS 'International Standard Serial Number';
```

### 4.2 New Tables

#### Migration 003: book_stats table
```sql
-- migrations/003_create_book_stats.sql

CREATE TABLE book_stats (
  id SERIAL PRIMARY KEY,

  -- Book reference (polymorphic)
  book_type TEXT NOT NULL CHECK (book_type IN ('ebook', 'magazine')),
  book_id INTEGER NOT NULL,

  -- Reader counts
  total_readers INTEGER DEFAULT 0,           -- 累计阅读人数
  current_readers INTEGER DEFAULT 0,         -- 当前在读人数
  finished_readers INTEGER DEFAULT 0,        -- 读完人数

  -- Content engagement
  total_highlights INTEGER DEFAULT 0,        -- 划线总数
  total_reviews INTEGER DEFAULT 0,           -- 评论总数
  total_notes INTEGER DEFAULT 0,             -- 笔记总数

  -- Rating aggregates
  average_rating DECIMAL(3,2),               -- 平均评分 (1.00 - 5.00)
  rating_count INTEGER DEFAULT 0,            -- 评分人数
  recommend_count INTEGER DEFAULT 0,         -- 推荐数
  neutral_count INTEGER DEFAULT 0,           -- 一般数
  not_recommend_count INTEGER DEFAULT 0,     -- 不推荐数

  -- Computed metrics
  recommend_percent DECIMAL(5,2),            -- 推荐百分比
  popularity_score DECIMAL(10,4),            -- 综合热度分数

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(book_type, book_id)
);

-- Indexes
CREATE INDEX idx_book_stats_popularity ON book_stats(popularity_score DESC);
CREATE INDEX idx_book_stats_book ON book_stats(book_type, book_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_book_stats_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER book_stats_updated_at
  BEFORE UPDATE ON book_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_book_stats_timestamp();

COMMENT ON TABLE book_stats IS 'Aggregated statistics for books, updated hourly';
COMMENT ON COLUMN book_stats.popularity_score IS 'Computed as: (total_readers * 0.3) + (finished_readers * 0.2) + (total_highlights * 0.2) + (total_reviews * 0.2) + (average_rating * 20 * 0.1)';
```

#### Migration 004: book_reviews table
```sql
-- migrations/004_create_book_reviews.sql

CREATE TABLE book_reviews (
  id SERIAL PRIMARY KEY,

  -- Relationships
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_type TEXT NOT NULL CHECK (book_type IN ('ebook', 'magazine')),
  book_id INTEGER NOT NULL,

  -- Review content
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  recommend_type TEXT CHECK (recommend_type IN ('recommend', 'neutral', 'not_recommend')),
  title TEXT,                                -- Optional review title
  content TEXT NOT NULL,                     -- Review body, max 5000 chars

  -- Engagement
  likes_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,

  -- Moderation
  is_featured BOOLEAN DEFAULT FALSE,         -- Editor's pick
  is_hidden BOOLEAN DEFAULT FALSE,           -- Hidden by moderation

  -- Metadata
  reading_progress DECIMAL(5,4),             -- Progress when review was written
  device_type TEXT,                          -- ios/android/web

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- One review per user per book
  UNIQUE(user_id, book_type, book_id)
);

-- Indexes
CREATE INDEX idx_book_reviews_book ON book_reviews(book_type, book_id, created_at DESC);
CREATE INDEX idx_book_reviews_user ON book_reviews(user_id, created_at DESC);
CREATE INDEX idx_book_reviews_featured ON book_reviews(book_type, book_id, is_featured, likes_count DESC)
  WHERE is_hidden = FALSE;

COMMENT ON TABLE book_reviews IS 'User reviews and ratings for books';
```

#### Migration 005: review_likes table
```sql
-- migrations/005_create_review_likes.sql

CREATE TABLE review_likes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  review_id INTEGER NOT NULL REFERENCES book_reviews(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, review_id)
);

CREATE INDEX idx_review_likes_review ON review_likes(review_id);

-- Trigger to update likes_count in book_reviews
CREATE OR REPLACE FUNCTION update_review_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE book_reviews SET likes_count = likes_count + 1 WHERE id = NEW.review_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE book_reviews SET likes_count = likes_count - 1 WHERE id = OLD.review_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER review_likes_count_trigger
  AFTER INSERT OR DELETE ON review_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_review_likes_count();
```

#### Migration 006: user_bookshelves table
```sql
-- migrations/006_create_user_bookshelves.sql

CREATE TABLE user_bookshelves (
  id SERIAL PRIMARY KEY,

  -- Relationships
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_type TEXT NOT NULL CHECK (book_type IN ('ebook', 'magazine')),
  book_id INTEGER NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'want_to_read'
    CHECK (status IN ('want_to_read', 'reading', 'finished', 'abandoned')),

  -- Reading progress snapshot
  progress DECIMAL(5,4) DEFAULT 0,
  current_page INTEGER,
  current_position TEXT,                     -- CFI for EPUB, page for PDF

  -- User notes
  private_notes TEXT,                        -- Personal notes about the book

  -- Timestamps
  added_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,                      -- When status changed to 'reading'
  finished_at TIMESTAMP,                     -- When status changed to 'finished'
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, book_type, book_id)
);

-- Indexes
CREATE INDEX idx_user_bookshelves_user_status ON user_bookshelves(user_id, status, updated_at DESC);
CREATE INDEX idx_user_bookshelves_book ON user_bookshelves(book_type, book_id);

COMMENT ON TABLE user_bookshelves IS 'User personal bookshelf with reading status';
```

#### Migration 007: book_lists table
```sql
-- migrations/007_create_book_lists.sql

CREATE TABLE book_lists (
  id SERIAL PRIMARY KEY,

  -- Owner
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- List info
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,                            -- Custom cover or auto-generated

  -- Counts
  book_count INTEGER DEFAULT 0,
  follower_count INTEGER DEFAULT 0,

  -- Visibility
  is_public BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,         -- Staff picks

  -- Categorization
  tags TEXT[],                               -- Array of tags
  category TEXT,                             -- e.g., '小说', '职场', '科技'

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_book_lists_user ON book_lists(user_id, created_at DESC);
CREATE INDEX idx_book_lists_public ON book_lists(is_public, follower_count DESC) WHERE is_public = TRUE;
CREATE INDEX idx_book_lists_featured ON book_lists(is_featured, follower_count DESC) WHERE is_featured = TRUE;

COMMENT ON TABLE book_lists IS 'User-curated book lists/collections';
```

#### Migration 008: book_list_items table
```sql
-- migrations/008_create_book_list_items.sql

CREATE TABLE book_list_items (
  id SERIAL PRIMARY KEY,

  -- Relationships
  list_id INTEGER NOT NULL REFERENCES book_lists(id) ON DELETE CASCADE,
  book_type TEXT NOT NULL CHECK (book_type IN ('ebook', 'magazine')),
  book_id INTEGER NOT NULL,

  -- Ordering
  position INTEGER NOT NULL,

  -- Optional annotation
  note TEXT,                                 -- Why this book is in the list

  -- Timestamps
  added_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(list_id, book_type, book_id)
);

CREATE INDEX idx_book_list_items_list ON book_list_items(list_id, position);
CREATE INDEX idx_book_list_items_book ON book_list_items(book_type, book_id);

-- Trigger to update book_count in book_lists
CREATE OR REPLACE FUNCTION update_book_list_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE book_lists SET book_count = book_count + 1, updated_at = NOW() WHERE id = NEW.list_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE book_lists SET book_count = book_count - 1, updated_at = NOW() WHERE id = OLD.list_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER book_list_items_count_trigger
  AFTER INSERT OR DELETE ON book_list_items
  FOR EACH ROW
  EXECUTE FUNCTION update_book_list_count();
```

#### Migration 009: book_list_followers table
```sql
-- migrations/009_create_book_list_followers.sql

CREATE TABLE book_list_followers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  list_id INTEGER NOT NULL REFERENCES book_lists(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, list_id)
);

CREATE INDEX idx_book_list_followers_list ON book_list_followers(list_id);

-- Trigger to update follower_count
CREATE OR REPLACE FUNCTION update_book_list_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE book_lists SET follower_count = follower_count + 1 WHERE id = NEW.list_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE book_lists SET follower_count = follower_count - 1 WHERE id = OLD.list_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER book_list_followers_count_trigger
  AFTER INSERT OR DELETE ON book_list_followers
  FOR EACH ROW
  EXECUTE FUNCTION update_book_list_follower_count();
```

#### Migration 010: related_books table
```sql
-- migrations/010_create_related_books.sql

CREATE TABLE related_books (
  id SERIAL PRIMARY KEY,

  -- Source book
  source_book_type TEXT NOT NULL CHECK (source_book_type IN ('ebook', 'magazine')),
  source_book_id INTEGER NOT NULL,

  -- Related book
  related_book_type TEXT NOT NULL CHECK (related_book_type IN ('ebook', 'magazine')),
  related_book_id INTEGER NOT NULL,

  -- Relation metadata
  relation_type TEXT NOT NULL CHECK (relation_type IN (
    'same_author',
    'same_translator',
    'same_publisher',
    'same_category',
    'same_series',
    'similar_content',
    'readers_also_read',
    'manual'
  )),

  -- Scoring
  similarity_score DECIMAL(5,4) DEFAULT 0,   -- 0.0000 - 1.0000
  confidence DECIMAL(5,4) DEFAULT 1,         -- How confident we are in this relation

  -- Metadata
  computed_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,

  -- Prevent duplicates
  UNIQUE(source_book_type, source_book_id, related_book_type, related_book_id)
);

CREATE INDEX idx_related_books_source ON related_books(source_book_type, source_book_id, similarity_score DESC)
  WHERE is_active = TRUE;

COMMENT ON TABLE related_books IS 'Pre-computed book relationships for recommendations';
COMMENT ON COLUMN related_books.similarity_score IS 'Higher score = more related. For same_author/publisher: 1.0, for ML-based: varies';
```

#### Migration 011: ai_book_summaries table
```sql
-- migrations/011_create_ai_book_summaries.sql

CREATE TABLE ai_book_summaries (
  id SERIAL PRIMARY KEY,

  -- Book reference
  book_type TEXT NOT NULL CHECK (book_type IN ('ebook', 'magazine')),
  book_id INTEGER NOT NULL,

  -- Summary type
  summary_type TEXT NOT NULL CHECK (summary_type IN (
    'overview',          -- 2-3 sentence overview
    'key_points',        -- 5-10 key takeaways
    'topics',            -- Main topics/themes
    'chapter_summaries', -- Per-chapter summaries
    'reading_guide',     -- AI reading guide with questions
    'vocabulary'         -- Key terms and definitions
  )),

  -- Content (JSON for flexibility)
  content JSONB NOT NULL,

  -- Generation metadata
  model_used TEXT,                           -- e.g., 'claude-3-haiku-20240307'
  prompt_version TEXT,                       -- Version of prompt template used
  input_tokens INTEGER,
  output_tokens INTEGER,
  generation_cost_usd DECIMAL(10,6),

  -- Quality metrics
  quality_score DECIMAL(3,2),                -- Manual or automated quality score
  user_feedback_positive INTEGER DEFAULT 0,
  user_feedback_negative INTEGER DEFAULT 0,

  -- Timestamps
  generated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,                      -- For cache invalidation

  UNIQUE(book_type, book_id, summary_type)
);

CREATE INDEX idx_ai_summaries_book ON ai_book_summaries(book_type, book_id);

COMMENT ON TABLE ai_book_summaries IS 'Cached AI-generated book summaries and analysis';

-- Example content structure for each summary_type:
/*
overview:
{
  "text": "《污名陷阱》是一本关于高学历失业者的社会学研究...",
  "word_count": 150
}

key_points:
{
  "points": [
    "高学历不再是就业保障",
    "失业者面临社会污名化",
    ...
  ]
}

topics:
{
  "topics": [
    {"title": "污名与失业挑战", "summary_count": 4, "description": "..."},
    {"title": "社交困境", "summary_count": 3, "description": "..."}
  ]
}

reading_guide:
{
  "questions": [
    "作者如何定义'污名'?",
    "高学历失业者面临的主要挑战是什么?"
  ],
  "themes": ["社会流动", "职业认同", "心理健康"]
}
*/
```

#### Migration 012: popular_highlights view
```sql
-- migrations/012_create_popular_highlights_view.sql

-- Materialized view for popular highlights (refreshed periodically)
CREATE MATERIALIZED VIEW popular_highlights AS
SELECT
  'ebook' as book_type,
  eu.ebook_id as book_id,
  eu.text,
  eu.cfi_range,
  eu.chapter_index,
  COUNT(DISTINCT eu.user_id) as highlighter_count,
  ARRAY_AGG(DISTINCT u.username ORDER BY u.username) FILTER (WHERE u.username IS NOT NULL) as highlighter_names,
  MIN(eu.created_at) as first_highlighted_at
FROM ebook_underlines eu
JOIN users u ON eu.user_id = u.id
WHERE eu.text IS NOT NULL AND LENGTH(eu.text) > 20
GROUP BY eu.ebook_id, eu.text, eu.cfi_range, eu.chapter_index
HAVING COUNT(DISTINCT eu.user_id) >= 2

UNION ALL

SELECT
  'magazine' as book_type,
  mu.magazine_id as book_id,
  mu.text,
  NULL as cfi_range,
  mu.page_number as chapter_index,
  COUNT(DISTINCT mu.user_id) as highlighter_count,
  ARRAY_AGG(DISTINCT u.username ORDER BY u.username) FILTER (WHERE u.username IS NOT NULL) as highlighter_names,
  MIN(mu.created_at) as first_highlighted_at
FROM magazine_underlines mu
JOIN users u ON mu.user_id = u.id
WHERE mu.text IS NOT NULL AND LENGTH(mu.text) > 20
GROUP BY mu.magazine_id, mu.text, mu.page_number
HAVING COUNT(DISTINCT mu.user_id) >= 2;

CREATE UNIQUE INDEX idx_popular_highlights_pk ON popular_highlights(book_type, book_id, text);
CREATE INDEX idx_popular_highlights_count ON popular_highlights(book_type, book_id, highlighter_count DESC);

-- Refresh function (to be called by cron job)
CREATE OR REPLACE FUNCTION refresh_popular_highlights()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY popular_highlights;
END;
$$ LANGUAGE plpgsql;

COMMENT ON MATERIALIZED VIEW popular_highlights IS 'Aggregated popular highlights, refresh every hour';
```

### 4.3 Drizzle Schema Updates

```typescript
// src/db/schema.ts - additions

// ... existing imports ...

// ============================================
// Book Stats
// ============================================

export const bookStats = pgTable('book_stats', {
  id: serial('id').primaryKey(),
  bookType: text('book_type').notNull(),
  bookId: integer('book_id').notNull(),
  totalReaders: integer('total_readers').default(0),
  currentReaders: integer('current_readers').default(0),
  finishedReaders: integer('finished_readers').default(0),
  totalHighlights: integer('total_highlights').default(0),
  totalReviews: integer('total_reviews').default(0),
  totalNotes: integer('total_notes').default(0),
  averageRating: decimal('average_rating', { precision: 3, scale: 2 }),
  ratingCount: integer('rating_count').default(0),
  recommendCount: integer('recommend_count').default(0),
  neutralCount: integer('neutral_count').default(0),
  notRecommendCount: integer('not_recommend_count').default(0),
  recommendPercent: decimal('recommend_percent', { precision: 5, scale: 2 }),
  popularityScore: decimal('popularity_score', { precision: 10, scale: 4 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  bookUnique: unique().on(table.bookType, table.bookId),
  popularityIdx: index('idx_book_stats_popularity').on(table.popularityScore),
}))

// ============================================
// Book Reviews
// ============================================

export const bookReviews = pgTable('book_reviews', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  bookType: text('book_type').notNull(),
  bookId: integer('book_id').notNull(),
  rating: integer('rating'),
  recommendType: text('recommend_type'),
  title: text('title'),
  content: text('content').notNull(),
  likesCount: integer('likes_count').default(0),
  repliesCount: integer('replies_count').default(0),
  isFeatured: boolean('is_featured').default(false),
  isHidden: boolean('is_hidden').default(false),
  readingProgress: decimal('reading_progress', { precision: 5, scale: 4 }),
  deviceType: text('device_type'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userBookUnique: unique().on(table.userId, table.bookType, table.bookId),
  bookIdx: index('idx_book_reviews_book').on(table.bookType, table.bookId),
}))

// ============================================
// Review Likes
// ============================================

export const reviewLikes = pgTable('review_likes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  reviewId: integer('review_id').references(() => bookReviews.id).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userReviewUnique: unique().on(table.userId, table.reviewId),
}))

// ============================================
// User Bookshelves
// ============================================

export const userBookshelves = pgTable('user_bookshelves', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  bookType: text('book_type').notNull(),
  bookId: integer('book_id').notNull(),
  status: text('status').notNull().default('want_to_read'),
  progress: decimal('progress', { precision: 5, scale: 4 }).default('0'),
  currentPage: integer('current_page'),
  currentPosition: text('current_position'),
  privateNotes: text('private_notes'),
  addedAt: timestamp('added_at').defaultNow(),
  startedAt: timestamp('started_at'),
  finishedAt: timestamp('finished_at'),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userBookUnique: unique().on(table.userId, table.bookType, table.bookId),
  userStatusIdx: index('idx_user_bookshelves_user_status').on(table.userId, table.status),
}))

// ============================================
// Book Lists
// ============================================

export const bookLists = pgTable('book_lists', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  coverUrl: text('cover_url'),
  bookCount: integer('book_count').default(0),
  followerCount: integer('follower_count').default(0),
  isPublic: boolean('is_public').default(true),
  isFeatured: boolean('is_featured').default(false),
  tags: text('tags').array(),
  category: text('category'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const bookListItems = pgTable('book_list_items', {
  id: serial('id').primaryKey(),
  listId: integer('list_id').references(() => bookLists.id).notNull(),
  bookType: text('book_type').notNull(),
  bookId: integer('book_id').notNull(),
  position: integer('position').notNull(),
  note: text('note'),
  addedAt: timestamp('added_at').defaultNow(),
}, (table) => ({
  listBookUnique: unique().on(table.listId, table.bookType, table.bookId),
}))

export const bookListFollowers = pgTable('book_list_followers', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  listId: integer('list_id').references(() => bookLists.id).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userListUnique: unique().on(table.userId, table.listId),
}))

// ============================================
// Related Books
// ============================================

export const relatedBooks = pgTable('related_books', {
  id: serial('id').primaryKey(),
  sourceBookType: text('source_book_type').notNull(),
  sourceBookId: integer('source_book_id').notNull(),
  relatedBookType: text('related_book_type').notNull(),
  relatedBookId: integer('related_book_id').notNull(),
  relationType: text('relation_type').notNull(),
  similarityScore: decimal('similarity_score', { precision: 5, scale: 4 }).default('0'),
  confidence: decimal('confidence', { precision: 5, scale: 4 }).default('1'),
  computedAt: timestamp('computed_at').defaultNow(),
  isActive: boolean('is_active').default(true),
}, (table) => ({
  sourceIdx: index('idx_related_books_source').on(table.sourceBookType, table.sourceBookId),
  relatedUnique: unique().on(table.sourceBookType, table.sourceBookId, table.relatedBookType, table.relatedBookId),
}))

// ============================================
// AI Book Summaries
// ============================================

export const aiBookSummaries = pgTable('ai_book_summaries', {
  id: serial('id').primaryKey(),
  bookType: text('book_type').notNull(),
  bookId: integer('book_id').notNull(),
  summaryType: text('summary_type').notNull(),
  content: jsonb('content').notNull(),
  modelUsed: text('model_used'),
  promptVersion: text('prompt_version'),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  generationCostUsd: decimal('generation_cost_usd', { precision: 10, scale: 6 }),
  qualityScore: decimal('quality_score', { precision: 3, scale: 2 }),
  userFeedbackPositive: integer('user_feedback_positive').default(0),
  userFeedbackNegative: integer('user_feedback_negative').default(0),
  generatedAt: timestamp('generated_at').defaultNow(),
  expiresAt: timestamp('expires_at'),
}, (table) => ({
  bookSummaryUnique: unique().on(table.bookType, table.bookId, table.summaryType),
}))

// ============================================
// Type Exports (additions)
// ============================================

export type BookStats = typeof bookStats.$inferSelect
export type BookReview = typeof bookReviews.$inferSelect
export type NewBookReview = typeof bookReviews.$inferInsert
export type UserBookshelf = typeof userBookshelves.$inferSelect
export type BookList = typeof bookLists.$inferSelect
export type BookListItem = typeof bookListItems.$inferSelect
export type RelatedBook = typeof relatedBooks.$inferSelect
export type AIBookSummary = typeof aiBookSummaries.$inferSelect
```

---

## 5. API Specification

### 5.1 Enhanced Book Details Endpoint

#### GET /api/ebooks/:id/details

Returns comprehensive book information including metadata, stats, and user-specific data.

**Request:**
```http
GET /api/ebooks/4146/details
Authorization: Bearer <token>  (optional - for user-specific data)
```

**Response:**
```json
{
  "data": {
    "book": {
      "id": 4146,
      "title": "污名陷阱",
      "author": "奥弗·沙龙",
      "translator": "王瀚、杨子钰",
      "description": "名校博士送外卖，大厂高管失业开网约车，当"35岁现象"遭遇经济下行，星巴克和...",
      "coverUrl": "/api/r2-covers/ebooks/4146.jpg",
      "wordCount": 142000,
      "pageCount": 320,
      "publicationDate": "2025-09-01",
      "publisher": "中信出版集团",
      "isbn": "9787521761234",
      "language": "zh",
      "fileType": "epub",
      "fileSize": 1813085,
      "categoryId": 28,
      "categoryName": "社会学"
    },
    "stats": {
      "totalReaders": 2010,
      "currentReaders": 219,
      "finishedReaders": 156,
      "totalHighlights": 1847,
      "totalReviews": 55,
      "averageRating": 4.2,
      "ratingCount": 55,
      "recommendPercent": 76.7,
      "ratingBreakdown": {
        "recommend": 37,
        "neutral": 17,
        "notRecommend": 1
      }
    },
    "userStatus": {
      "isOnShelf": true,
      "shelfStatus": "reading",
      "progress": 0.35,
      "currentPage": 112,
      "addedAt": "2025-12-01T10:30:00Z",
      "hasReviewed": false
    },
    "publisher": {
      "id": 15,
      "name": "中信出版集团",
      "bookCount": 3529
    }
  }
}
```

**Implementation:**
```typescript
// src/routes/ebooks.ts

import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { z } from 'zod'
import { db } from '../db/client'
import { ebooks, ebookCategories, bookStats, userBookshelves, bookReviews, publishers } from '../db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { optionalAuth } from '../middleware/auth'

const BookDetailsSchema = z.object({
  data: z.object({
    book: z.object({
      id: z.number(),
      title: z.string(),
      author: z.string().nullable(),
      translator: z.string().nullable(),
      description: z.string().nullable(),
      coverUrl: z.string().nullable(),
      wordCount: z.number().nullable(),
      pageCount: z.number().nullable(),
      publicationDate: z.string().nullable(),
      publisher: z.string().nullable(),
      isbn: z.string().nullable(),
      language: z.string().nullable(),
      fileType: z.string().nullable(),
      fileSize: z.number().nullable(),
      categoryId: z.number().nullable(),
      categoryName: z.string().nullable(),
    }),
    stats: z.object({
      totalReaders: z.number(),
      currentReaders: z.number(),
      finishedReaders: z.number(),
      totalHighlights: z.number(),
      totalReviews: z.number(),
      averageRating: z.number().nullable(),
      ratingCount: z.number(),
      recommendPercent: z.number().nullable(),
      ratingBreakdown: z.object({
        recommend: z.number(),
        neutral: z.number(),
        notRecommend: z.number(),
      }),
    }),
    userStatus: z.object({
      isOnShelf: z.boolean(),
      shelfStatus: z.string().nullable(),
      progress: z.number().nullable(),
      currentPage: z.number().nullable(),
      addedAt: z.string().nullable(),
      hasReviewed: z.boolean(),
    }).nullable(),
    publisher: z.object({
      id: z.number(),
      name: z.string(),
      bookCount: z.number(),
    }).nullable(),
  }),
})

const getBookDetailsRoute = createRoute({
  method: 'get',
  path: '/:id/details',
  tags: ['Ebooks'],
  summary: 'Get comprehensive book details',
  request: {
    params: z.object({
      id: z.string().transform(Number),
    }),
  },
  responses: {
    200: {
      description: 'Book details',
      content: {
        'application/json': {
          schema: BookDetailsSchema,
        },
      },
    },
    404: {
      description: 'Book not found',
    },
  },
})

app.openapi(getBookDetailsRoute, optionalAuth, async (c) => {
  const { id } = c.req.param()
  const userId = c.get('userId')

  // Get book with category
  const [book] = await db
    .select({
      id: ebooks.id,
      title: ebooks.title,
      author: ebooks.author,
      translator: ebooks.translator,
      description: ebooks.description,
      coverUrl: ebooks.coverUrl,
      wordCount: ebooks.wordCount,
      pageCount: ebooks.pageCount,
      publicationDate: ebooks.publicationDate,
      publisher: ebooks.publisher,
      isbn: ebooks.isbn,
      language: ebooks.language,
      fileType: ebooks.fileType,
      fileSize: ebooks.fileSize,
      categoryId: ebooks.categoryId,
      categoryName: ebookCategories.name,
    })
    .from(ebooks)
    .leftJoin(ebookCategories, eq(ebooks.categoryId, ebookCategories.id))
    .where(eq(ebooks.id, Number(id)))
    .limit(1)

  if (!book) {
    return c.json({ error: 'Book not found' }, 404)
  }

  // Get stats
  const [stats] = await db
    .select()
    .from(bookStats)
    .where(and(
      eq(bookStats.bookType, 'ebook'),
      eq(bookStats.bookId, Number(id))
    ))
    .limit(1)

  // Get user status if authenticated
  let userStatus = null
  if (userId) {
    const [shelf] = await db
      .select()
      .from(userBookshelves)
      .where(and(
        eq(userBookshelves.userId, userId),
        eq(userBookshelves.bookType, 'ebook'),
        eq(userBookshelves.bookId, Number(id))
      ))
      .limit(1)

    const [review] = await db
      .select({ id: bookReviews.id })
      .from(bookReviews)
      .where(and(
        eq(bookReviews.userId, userId),
        eq(bookReviews.bookType, 'ebook'),
        eq(bookReviews.bookId, Number(id))
      ))
      .limit(1)

    userStatus = {
      isOnShelf: !!shelf,
      shelfStatus: shelf?.status ?? null,
      progress: shelf?.progress ? Number(shelf.progress) : null,
      currentPage: shelf?.currentPage ?? null,
      addedAt: shelf?.addedAt?.toISOString() ?? null,
      hasReviewed: !!review,
    }
  }

  // Get publisher info if available
  let publisherInfo = null
  if (book.publisher) {
    // Count books by this publisher
    const [publisherStats] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(ebooks)
      .where(eq(ebooks.publisher, book.publisher))

    publisherInfo = {
      id: 0, // Would need a proper publisher lookup
      name: book.publisher,
      bookCount: publisherStats?.count ?? 0,
    }
  }

  return c.json({
    data: {
      book: {
        ...book,
        fileSize: book.fileSize ? Number(book.fileSize) : null,
        publicationDate: book.publicationDate?.toISOString().split('T')[0] ?? null,
      },
      stats: stats ? {
        totalReaders: stats.totalReaders ?? 0,
        currentReaders: stats.currentReaders ?? 0,
        finishedReaders: stats.finishedReaders ?? 0,
        totalHighlights: stats.totalHighlights ?? 0,
        totalReviews: stats.totalReviews ?? 0,
        averageRating: stats.averageRating ? Number(stats.averageRating) : null,
        ratingCount: stats.ratingCount ?? 0,
        recommendPercent: stats.recommendPercent ? Number(stats.recommendPercent) : null,
        ratingBreakdown: {
          recommend: stats.recommendCount ?? 0,
          neutral: stats.neutralCount ?? 0,
          notRecommend: stats.notRecommendCount ?? 0,
        },
      } : {
        totalReaders: 0,
        currentReaders: 0,
        finishedReaders: 0,
        totalHighlights: 0,
        totalReviews: 0,
        averageRating: null,
        ratingCount: 0,
        recommendPercent: null,
        ratingBreakdown: { recommend: 0, neutral: 0, notRecommend: 0 },
      },
      userStatus,
      publisher: publisherInfo,
    },
  })
})
```

### 5.2 Reviews Endpoints

#### GET /api/ebooks/:id/reviews

```http
GET /api/ebooks/4146/reviews?filter=recommend&page=1&limit=20
Authorization: Bearer <token>  (optional)
```

**Response:**
```json
{
  "data": [
    {
      "id": 123,
      "user": {
        "id": 456,
        "username": "农民CPA",
        "avatar": "/avatars/456.jpg"
      },
      "rating": 5,
      "recommendType": "recommend",
      "content": "《污名陷阱》聚焦"高学历失业者"这一群体，通过139场深度访谈和12年的社会学实证研究...",
      "likesCount": 35,
      "isLiked": false,
      "createdAt": "2025-12-10T08:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 55,
    "totalPages": 3
  },
  "summary": {
    "total": 55,
    "recommend": 37,
    "neutral": 17,
    "notRecommend": 1
  }
}
```

#### POST /api/ebooks/:id/reviews

```http
POST /api/ebooks/4146/reviews
Authorization: Bearer <token>
Content-Type: application/json

{
  "rating": 5,
  "recommendType": "recommend",
  "content": "非常深刻的社会学研究，揭示了高学历失业者面临的困境..."
}
```

**Response:**
```json
{
  "data": {
    "id": 124,
    "message": "Review created successfully"
  }
}
```

#### POST /api/reviews/:id/like

```http
POST /api/reviews/123/like
Authorization: Bearer <token>
```

**Response:**
```json
{
  "data": {
    "liked": true,
    "likesCount": 36
  }
}
```

### 5.3 Bookshelf Endpoints

#### GET /api/bookshelf

```http
GET /api/bookshelf?status=reading&page=1&limit=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "data": [
    {
      "id": 789,
      "book": {
        "id": 4146,
        "type": "ebook",
        "title": "污名陷阱",
        "author": "奥弗·沙龙",
        "coverUrl": "/api/r2-covers/ebooks/4146.jpg"
      },
      "status": "reading",
      "progress": 0.35,
      "currentPage": 112,
      "addedAt": "2025-12-01T10:30:00Z",
      "updatedAt": "2025-12-10T15:45:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15
  },
  "counts": {
    "wantToRead": 8,
    "reading": 5,
    "finished": 12,
    "abandoned": 2
  }
}
```

#### POST /api/bookshelf

```http
POST /api/bookshelf
Authorization: Bearer <token>
Content-Type: application/json

{
  "bookType": "ebook",
  "bookId": 4146,
  "status": "want_to_read"
}
```

#### PATCH /api/bookshelf/:id

```http
PATCH /api/bookshelf/789
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "reading",
  "progress": 0.35,
  "currentPage": 112
}
```

#### DELETE /api/bookshelf/:id

```http
DELETE /api/bookshelf/789
Authorization: Bearer <token>
```

### 5.4 Popular Highlights Endpoint

#### GET /api/ebooks/:id/highlights/popular

```http
GET /api/ebooks/4146/highlights/popular?limit=10
```

**Response:**
```json
{
  "data": [
    {
      "text": "这恰恰暴露了我们深信：只要做"对"的事情，努力学习，考入好大学，找到好工作，就能一帆风顺，而且你的职业生涯不会突然崩塌",
      "highlighterCount": 72,
      "topHighlighters": [
        { "username": "是好日映", "avatar": null },
        { "username": "读书达人", "avatar": null }
      ],
      "chapterIndex": 3,
      "position": "epubcfi(/6/14!/4/2/1:0)"
    }
  ],
  "total": 30
}
```

### 5.5 Related Books Endpoint

#### GET /api/ebooks/:id/related

```http
GET /api/ebooks/4146/related?limit=8
```

**Response:**
```json
{
  "data": {
    "sameAuthor": [],
    "samePublisher": [
      {
        "id": 4123,
        "type": "ebook",
        "title": "复利效应",
        "author": "达伦·哈迪",
        "coverUrl": "/api/r2-covers/ebooks/4123.jpg",
        "relationType": "same_publisher"
      }
    ],
    "similarContent": [
      {
        "id": 3890,
        "type": "ebook",
        "title": "精英陷阱",
        "author": "丹尼尔·马科维茨",
        "coverUrl": "/api/r2-covers/ebooks/3890.jpg",
        "relationType": "similar_content",
        "similarityScore": 0.85
      }
    ],
    "readersAlsoRead": [
      {
        "id": 4001,
        "type": "ebook",
        "title": "人类动物园",
        "author": "德斯蒙德·莫里斯",
        "coverUrl": "/api/r2-covers/ebooks/4001.jpg",
        "relationType": "readers_also_read"
      }
    ]
  }
}
```

### 5.6 Book Lists Endpoints

#### GET /api/ebooks/:id/lists

```http
GET /api/ebooks/4146/lists?limit=5
```

**Response:**
```json
{
  "data": [
    {
      "id": 101,
      "title": "蜜獾吃书 书单",
      "curator": {
        "username": "edenin的书单",
        "avatar": null
      },
      "bookCount": 344,
      "followerCount": 4164,
      "previewBooks": [
        {
          "id": 4146,
          "coverUrl": "/api/r2-covers/ebooks/4146.jpg"
        },
        {
          "id": 4001,
          "coverUrl": "/api/r2-covers/ebooks/4001.jpg"
        }
      ]
    }
  ],
  "total": 12
}
```

### 5.7 AI Summary Endpoint

#### GET /api/ebooks/:id/ai-summary

```http
GET /api/ebooks/4146/ai-summary?type=topics
```

**Response:**
```json
{
  "data": {
    "summaryType": "topics",
    "content": {
      "topics": [
        {
          "title": "污名与失业挑战",
          "summaryCount": 4,
          "description": "探讨高学历失业者面临的社会污名和职业挑战"
        },
        {
          "title": "社交困境",
          "summaryCount": 3,
          "description": "失业后社交网络的变化与人际关系的困境"
        }
      ]
    },
    "generatedAt": "2025-12-10T12:00:00Z"
  }
}
```

### 5.8 Complete API Route Summary

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/ebooks/:id/details` | GET | Optional | Full book details |
| `/api/ebooks/:id/reviews` | GET | Optional | List reviews |
| `/api/ebooks/:id/reviews` | POST | Required | Create review |
| `/api/reviews/:id` | PUT | Required | Update review |
| `/api/reviews/:id` | DELETE | Required | Delete review |
| `/api/reviews/:id/like` | POST | Required | Toggle like |
| `/api/bookshelf` | GET | Required | List user's shelf |
| `/api/bookshelf` | POST | Required | Add to shelf |
| `/api/bookshelf/:id` | PATCH | Required | Update status |
| `/api/bookshelf/:id` | DELETE | Required | Remove from shelf |
| `/api/ebooks/:id/highlights/popular` | GET | None | Popular highlights |
| `/api/ebooks/:id/related` | GET | None | Related books |
| `/api/ebooks/:id/lists` | GET | None | Book lists |
| `/api/ebooks/:id/ai-summary` | GET | None | AI summary |
| `/api/book-lists` | GET | Optional | Browse lists |
| `/api/book-lists/:id` | GET | Optional | List details |
| `/api/book-lists` | POST | Required | Create list |
| `/api/book-lists/:id` | PUT | Required | Update list |
| `/api/book-lists/:id/books` | POST | Required | Add book to list |

---

## 6. iOS Implementation

### 6.1 New Models

```swift
// Models/BookDetails.swift

import Foundation

// MARK: - Book Details Response

struct BookDetailsResponse: Codable {
    let data: BookDetailsData
}

struct BookDetailsData: Codable {
    let book: BookMetadata
    let stats: BookStats
    let userStatus: UserBookStatus?
    let publisher: PublisherInfo?
}

// MARK: - Book Metadata

struct BookMetadata: Codable, Identifiable {
    let id: Int
    let title: String
    let author: String?
    let translator: String?
    let description: String?
    let coverUrl: String?
    let wordCount: Int?
    let pageCount: Int?
    let publicationDate: String?
    let publisher: String?
    let isbn: String?
    let language: String?
    let fileType: String?
    let fileSize: Int?
    let categoryId: Int?
    let categoryName: String?

    // Computed properties
    var formattedWordCount: String? {
        guard let count = wordCount else { return nil }
        if count >= 10000 {
            return String(format: "%.1f万字", Double(count) / 10000)
        }
        return "\(count)字"
    }

    var formattedPublicationDate: String? {
        guard let date = publicationDate else { return nil }
        // Format: "2025-09-01" -> "2025年9月出版"
        let components = date.split(separator: "-")
        guard components.count >= 2 else { return date }
        return "\(components[0])年\(Int(components[1]) ?? 0)月出版"
    }
}

// MARK: - Book Stats

struct BookStats: Codable {
    let totalReaders: Int
    let currentReaders: Int
    let finishedReaders: Int
    let totalHighlights: Int
    let totalReviews: Int
    let averageRating: Double?
    let ratingCount: Int
    let recommendPercent: Double?
    let ratingBreakdown: RatingBreakdown

    var formattedReaderCount: String {
        if totalReaders >= 10000 {
            return String(format: "%.1f万", Double(totalReaders) / 10000)
        }
        return "\(totalReaders)"
    }
}

struct RatingBreakdown: Codable {
    let recommend: Int
    let neutral: Int
    let notRecommend: Int

    var total: Int {
        recommend + neutral + notRecommend
    }

    var recommendRatio: Double {
        guard total > 0 else { return 0 }
        return Double(recommend) / Double(total)
    }

    var neutralRatio: Double {
        guard total > 0 else { return 0 }
        return Double(neutral) / Double(total)
    }

    var notRecommendRatio: Double {
        guard total > 0 else { return 0 }
        return Double(notRecommend) / Double(total)
    }
}

// MARK: - User Status

struct UserBookStatus: Codable {
    let isOnShelf: Bool
    let shelfStatus: String?
    let progress: Double?
    let currentPage: Int?
    let addedAt: String?
    let hasReviewed: Bool

    var statusText: String {
        switch shelfStatus {
        case "want_to_read": return "想读"
        case "reading": return "在读"
        case "finished": return "读过"
        case "abandoned": return "放弃"
        default: return ""
        }
    }
}

// MARK: - Publisher Info

struct PublisherInfo: Codable {
    let id: Int
    let name: String
    let bookCount: Int

    var formattedBookCount: String {
        "\(bookCount) 个作品"
    }
}
```

```swift
// Models/BookReview.swift

import Foundation

struct BookReviewsResponse: Codable {
    let data: [BookReview]
    let pagination: Pagination
    let summary: ReviewSummary
}

struct BookReview: Codable, Identifiable {
    let id: Int
    let user: ReviewUser
    let rating: Int?
    let recommendType: String?
    let content: String
    let likesCount: Int
    let isLiked: Bool
    let createdAt: String

    var recommendLabel: String? {
        switch recommendType {
        case "recommend": return "推荐"
        case "neutral": return "一般"
        case "not_recommend": return "不行"
        default: return nil
        }
    }

    var recommendColor: Color {
        switch recommendType {
        case "recommend": return .green
        case "neutral": return .orange
        case "not_recommend": return .red
        default: return .gray
        }
    }
}

struct ReviewUser: Codable {
    let id: Int
    let username: String
    let avatar: String?
}

struct ReviewSummary: Codable {
    let total: Int
    let recommend: Int
    let neutral: Int
    let notRecommend: Int
}

struct Pagination: Codable {
    let page: Int
    let limit: Int
    let total: Int
    let totalPages: Int
}
```

```swift
// Models/PopularHighlight.swift

import Foundation

struct PopularHighlightsResponse: Codable {
    let data: [PopularHighlight]
    let total: Int
}

struct PopularHighlight: Codable, Identifiable {
    var id: String { text }

    let text: String
    let highlighterCount: Int
    let topHighlighters: [HighlighterInfo]
    let chapterIndex: Int?
    let position: String?

    var highlighterText: String {
        let names = topHighlighters.prefix(2).map { $0.username }.joined(separator: "、")
        if highlighterCount > 2 {
            return "\(names) 等 \(highlighterCount) 人划线"
        } else if highlighterCount == 2 {
            return "\(names) 划线"
        } else {
            return "\(names) 划线"
        }
    }
}

struct HighlighterInfo: Codable {
    let username: String
    let avatar: String?
}
```

```swift
// Models/RelatedBooks.swift

import Foundation

struct RelatedBooksResponse: Codable {
    let data: RelatedBooksData
}

struct RelatedBooksData: Codable {
    let sameAuthor: [RelatedBook]
    let samePublisher: [RelatedBook]
    let similarContent: [RelatedBook]
    let readersAlsoRead: [RelatedBook]

    var isEmpty: Bool {
        sameAuthor.isEmpty && samePublisher.isEmpty &&
        similarContent.isEmpty && readersAlsoRead.isEmpty
    }

    var allRelated: [RelatedBook] {
        sameAuthor + samePublisher + similarContent + readersAlsoRead
    }
}

struct RelatedBook: Codable, Identifiable {
    let id: Int
    let type: String
    let title: String
    let author: String?
    let coverUrl: String?
    let relationType: String
    let similarityScore: Double?
}
```

```swift
// Models/BookList.swift

import Foundation

struct BookListsResponse: Codable {
    let data: [BookListPreview]
    let total: Int
}

struct BookListPreview: Codable, Identifiable {
    let id: Int
    let title: String
    let curator: ListCurator
    let bookCount: Int
    let followerCount: Int
    let previewBooks: [BookPreview]

    var formattedFollowerCount: String {
        if followerCount >= 10000 {
            return String(format: "%.1f万人收藏", Double(followerCount) / 10000)
        }
        return "\(followerCount)人收藏"
    }
}

struct ListCurator: Codable {
    let username: String
    let avatar: String?
}

struct BookPreview: Codable, Identifiable {
    let id: Int
    let coverUrl: String?
}
```

```swift
// Models/AIBookSummary.swift

import Foundation

struct AIBookSummaryResponse: Codable {
    let data: AIBookSummary
}

struct AIBookSummary: Codable {
    let summaryType: String
    let content: AIContent
    let generatedAt: String
}

struct AIContent: Codable {
    let topics: [AITopic]?
    let keyPoints: [String]?
    let overview: String?
}

struct AITopic: Codable, Identifiable {
    var id: String { title }

    let title: String
    let summaryCount: Int
    let description: String
}
```

### 6.2 API Client Extensions

```swift
// Services/APIClient+BookDetails.swift

extension APIClient {

    // MARK: - Book Details

    func getBookDetails(type: String, id: Int) async throws -> BookDetailsResponse {
        let endpoint = type == "magazine" ? "/api/magazines/\(id)/details" : "/api/ebooks/\(id)/details"
        return try await request(path: endpoint, method: "GET")
    }

    // MARK: - Reviews

    func getBookReviews(
        type: String,
        id: Int,
        filter: String? = nil,
        page: Int = 1,
        limit: Int = 20
    ) async throws -> BookReviewsResponse {
        let endpoint = type == "magazine" ? "/api/magazines/\(id)/reviews" : "/api/ebooks/\(id)/reviews"
        var params: [String: String] = [
            "page": "\(page)",
            "limit": "\(limit)"
        ]
        if let filter = filter {
            params["filter"] = filter
        }
        return try await request(path: endpoint, method: "GET", queryParams: params)
    }

    func createReview(
        type: String,
        bookId: Int,
        rating: Int?,
        recommendType: String,
        content: String
    ) async throws -> GenericResponse {
        let endpoint = type == "magazine" ? "/api/magazines/\(bookId)/reviews" : "/api/ebooks/\(bookId)/reviews"
        let body: [String: Any] = [
            "rating": rating as Any,
            "recommendType": recommendType,
            "content": content
        ]
        return try await request(path: endpoint, method: "POST", body: body)
    }

    func toggleReviewLike(reviewId: Int) async throws -> LikeResponse {
        return try await request(path: "/api/reviews/\(reviewId)/like", method: "POST")
    }

    // MARK: - Bookshelf

    func getBookshelf(status: String? = nil, page: Int = 1, limit: Int = 20) async throws -> BookshelfResponse {
        var params: [String: String] = [
            "page": "\(page)",
            "limit": "\(limit)"
        ]
        if let status = status {
            params["status"] = status
        }
        return try await request(path: "/api/bookshelf", method: "GET", queryParams: params)
    }

    func addToBookshelf(type: String, bookId: Int, status: String = "want_to_read") async throws -> GenericResponse {
        let body: [String: Any] = [
            "bookType": type,
            "bookId": bookId,
            "status": status
        ]
        return try await request(path: "/api/bookshelf", method: "POST", body: body)
    }

    func updateBookshelfItem(id: Int, status: String?, progress: Double?, currentPage: Int?) async throws -> GenericResponse {
        var body: [String: Any] = [:]
        if let status = status { body["status"] = status }
        if let progress = progress { body["progress"] = progress }
        if let currentPage = currentPage { body["currentPage"] = currentPage }
        return try await request(path: "/api/bookshelf/\(id)", method: "PATCH", body: body)
    }

    func removeFromBookshelf(id: Int) async throws -> GenericResponse {
        return try await request(path: "/api/bookshelf/\(id)", method: "DELETE")
    }

    // MARK: - Popular Highlights

    func getPopularHighlights(type: String, id: Int, limit: Int = 10) async throws -> PopularHighlightsResponse {
        let endpoint = type == "magazine" ? "/api/magazines/\(id)/highlights/popular" : "/api/ebooks/\(id)/highlights/popular"
        return try await request(path: endpoint, method: "GET", queryParams: ["limit": "\(limit)"])
    }

    // MARK: - Related Books

    func getRelatedBooks(type: String, id: Int, limit: Int = 8) async throws -> RelatedBooksResponse {
        let endpoint = type == "magazine" ? "/api/magazines/\(id)/related" : "/api/ebooks/\(id)/related"
        return try await request(path: endpoint, method: "GET", queryParams: ["limit": "\(limit)"])
    }

    // MARK: - Book Lists

    func getBookLists(type: String, id: Int, limit: Int = 5) async throws -> BookListsResponse {
        let endpoint = type == "magazine" ? "/api/magazines/\(id)/lists" : "/api/ebooks/\(id)/lists"
        return try await request(path: endpoint, method: "GET", queryParams: ["limit": "\(limit)"])
    }

    // MARK: - AI Summary

    func getAISummary(type: String, id: Int, summaryType: String = "topics") async throws -> AIBookSummaryResponse {
        let endpoint = type == "magazine" ? "/api/magazines/\(id)/ai-summary" : "/api/ebooks/\(id)/ai-summary"
        return try await request(path: endpoint, method: "GET", queryParams: ["type": summaryType])
    }
}
```

### 6.3 View Components

```swift
// Views/BookDetail/BookDetailView.swift

import SwiftUI

struct BookDetailView: View {
    let bookType: String  // "ebook" or "magazine"
    let bookId: Int

    @StateObject private var viewModel: BookDetailViewModel
    @State private var showReader = false
    @State private var showReviewSheet = false

    init(bookType: String, bookId: Int) {
        self.bookType = bookType
        self.bookId = bookId
        _viewModel = StateObject(wrappedValue: BookDetailViewModel(bookType: bookType, bookId: bookId))
    }

    var body: some View {
        Group {
            if viewModel.isLoading {
                LoadingView()
            } else if let error = viewModel.errorMessage {
                ErrorView(message: error) {
                    Task { await viewModel.loadAll() }
                }
            } else if let details = viewModel.details {
                ScrollView {
                    LazyVStack(spacing: 0) {
                        // Header with cover and basic info
                        BookHeaderSection(book: details.book, stats: details.stats)

                        Divider().padding(.horizontal)

                        // Stats row
                        BookStatsRow(book: details.book, stats: details.stats, publisher: details.publisher)

                        Divider().padding(.horizontal)

                        // Rating section
                        if details.stats.ratingCount > 0 {
                            BookRatingSection(stats: details.stats)
                            Divider().padding(.horizontal)
                        }

                        // Reviews section
                        if !viewModel.reviews.isEmpty {
                            BookReviewsSection(
                                reviews: viewModel.reviews,
                                summary: viewModel.reviewSummary,
                                onLikeTapped: { reviewId in
                                    Task { await viewModel.toggleLike(reviewId: reviewId) }
                                },
                                onSeeAllTapped: {
                                    // Navigate to full reviews list
                                }
                            )
                            Divider().padding(.horizontal)
                        }

                        // AI Guide section
                        if let summary = viewModel.aiSummary {
                            AIReadingGuideSection(summary: summary)
                            Divider().padding(.horizontal)
                        }

                        // Popular highlights
                        if !viewModel.popularHighlights.isEmpty {
                            PopularHighlightsSection(
                                highlights: viewModel.popularHighlights,
                                totalCount: viewModel.totalHighlights
                            )
                            Divider().padding(.horizontal)
                        }

                        // Related books
                        if let related = viewModel.relatedBooks, !related.isEmpty {
                            RelatedBooksSection(relatedBooks: related)
                            Divider().padding(.horizontal)
                        }

                        // Publisher section
                        if let publisherBooks = viewModel.publisherBooks, !publisherBooks.isEmpty {
                            PublisherBooksSection(
                                publisher: details.publisher,
                                books: publisherBooks
                            )
                            Divider().padding(.horizontal)
                        }

                        // Book lists
                        if !viewModel.bookLists.isEmpty {
                            BookListsSection(lists: viewModel.bookLists)
                        }

                        // Bottom spacing for toolbar
                        Spacer().frame(height: 100)
                    }
                }
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                HStack(spacing: 16) {
                    Button(action: { /* Share */ }) {
                        Image(systemName: "square.and.arrow.up")
                    }
                    Button(action: { /* More */ }) {
                        Image(systemName: "ellipsis")
                    }
                }
            }
        }
        .safeAreaInset(edge: .bottom) {
            BookDetailBottomBar(
                userStatus: viewModel.details?.userStatus,
                onAddToShelf: {
                    Task { await viewModel.addToBookshelf() }
                },
                onRead: {
                    showReader = true
                }
            )
        }
        .task {
            await viewModel.loadAll()
        }
        .fullScreenCover(isPresented: $showReader) {
            PDFReaderView(type: bookType, id: bookId, title: viewModel.details?.book.title ?? "")
        }
        .sheet(isPresented: $showReviewSheet) {
            WriteReviewSheet(
                bookType: bookType,
                bookId: bookId,
                onSubmit: { rating, recommendType, content in
                    Task {
                        await viewModel.submitReview(rating: rating, recommendType: recommendType, content: content)
                    }
                }
            )
        }
    }
}
```

```swift
// Views/BookDetail/Components/BookHeaderSection.swift

import SwiftUI

struct BookHeaderSection: View {
    let book: BookMetadata
    let stats: BookStats

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            // Cover
            BookCoverView(coverUrl: book.coverUrl, title: book.title)
                .frame(width: 120, height: 168)
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .shadow(color: .black.opacity(0.2), radius: 8, x: 0, y: 4)

            // Info
            VStack(alignment: .leading, spacing: 8) {
                Text(book.title)
                    .font(.title2)
                    .fontWeight(.bold)
                    .lineLimit(2)

                // Author/Translator
                if let author = book.author {
                    HStack(spacing: 4) {
                        if book.language == "zh" && book.translator == nil {
                            Text(author)
                        } else if let translator = book.translator {
                            Text("[\(book.language == "en" ? "美" : "外")]")
                                .foregroundColor(.secondary)
                            Text(author)
                            Text("/")
                                .foregroundColor(.secondary)
                            Text(translator)
                            Text("译")
                                .foregroundColor(.secondary)
                        } else {
                            Text(author)
                        }
                    }
                    .font(.subheadline)
                    .foregroundColor(.primary.opacity(0.8))
                }

                // Description preview
                if let description = book.description {
                    Text(description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(3)
                }
            }

            Spacer()
        }
        .padding()
    }
}
```

```swift
// Views/BookDetail/Components/BookStatsRow.swift

import SwiftUI

struct BookStatsRow: View {
    let book: BookMetadata
    let stats: BookStats
    let publisher: PublisherInfo?

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 24) {
                // Reader count
                StatItem(
                    title: "阅读",
                    value: stats.formattedReaderCount,
                    subtitle: "\(stats.currentReaders)人在读"
                )

                // Reading status
                StatItem(
                    icon: "arrow.right.circle",
                    title: "标记在读",
                    value: "\(stats.currentReaders)"
                )

                // Word count
                if let wordCount = book.formattedWordCount {
                    StatItem(
                        title: "字数",
                        value: wordCount
                    )
                }

                // Publication date
                if let pubDate = book.formattedPublicationDate {
                    StatItem(
                        title: "出版",
                        value: pubDate
                    )
                }

                // Publisher
                if let pub = publisher ?? (book.publisher.map { PublisherInfo(id: 0, name: $0, bookCount: 0) }) {
                    StatItem(
                        title: "版权信息",
                        value: pub.name,
                        icon: "c.circle"
                    )
                }
            }
            .padding(.horizontal)
        }
        .padding(.vertical, 12)
    }
}

struct StatItem: View {
    var icon: String? = nil
    let title: String
    let value: String
    var subtitle: String? = nil

    var body: some View {
        VStack(spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)

            HStack(spacing: 4) {
                if let icon = icon {
                    Image(systemName: icon)
                        .font(.caption2)
                }
                Text(value)
                    .font(.subheadline)
                    .fontWeight(.medium)
            }

            if let subtitle = subtitle {
                Text(subtitle)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
    }
}
```

```swift
// Views/BookDetail/Components/BookRatingSection.swift

import SwiftUI

struct BookRatingSection: View {
    let stats: BookStats
    @State private var selectedFilter: ReviewFilter = .all

    enum ReviewFilter: String, CaseIterable {
        case all = "全部"
        case recommend = "推荐"
        case neutral = "一般"
        case notRecommend = "不行"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            HStack {
                Text("微信读书推荐值")
                    .font(.headline)
                Spacer()
                Button("写点评") {
                    // Show write review sheet
                }
                .font(.subheadline)
                .foregroundColor(.blue)
            }

            // Rating display
            HStack(alignment: .top, spacing: 24) {
                // Percentage
                Text(String(format: "%.1f%%", stats.recommendPercent ?? 0))
                    .font(.system(size: 44, weight: .bold))
                    .foregroundColor(.blue)

                // Breakdown bars
                VStack(alignment: .leading, spacing: 8) {
                    RatingBar(label: "推荐", ratio: stats.ratingBreakdown.recommendRatio, color: .green)
                    RatingBar(label: "一般", ratio: stats.ratingBreakdown.neutralRatio, color: .orange)
                    RatingBar(label: "不行", ratio: stats.ratingBreakdown.notRecommendRatio, color: .red)
                }
            }

            // Filter tabs
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(ReviewFilter.allCases, id: \.self) { filter in
                        FilterChip(
                            title: filterTitle(for: filter),
                            isSelected: selectedFilter == filter
                        ) {
                            selectedFilter = filter
                        }
                    }
                }
            }
        }
        .padding()
    }

    private func filterTitle(for filter: ReviewFilter) -> String {
        switch filter {
        case .all: return "全部(\(stats.ratingCount))"
        case .recommend: return "推荐(\(stats.ratingBreakdown.recommend))"
        case .neutral: return "一般(\(stats.ratingBreakdown.neutral))"
        case .notRecommend: return "不行(\(stats.ratingBreakdown.notRecommend))"
        }
    }
}

struct RatingBar: View {
    let label: String
    let ratio: Double
    let color: Color

    var body: some View {
        HStack(spacing: 8) {
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
                .frame(width: 30, alignment: .leading)

            GeometryReader { geometry in
                RoundedRectangle(cornerRadius: 2)
                    .fill(color.opacity(0.3))
                    .frame(height: 8)
                    .overlay(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 2)
                            .fill(color)
                            .frame(width: geometry.size.width * ratio)
                    }
            }
            .frame(height: 8)
        }
    }
}

struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.caption)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isSelected ? Color.blue.opacity(0.1) : Color.gray.opacity(0.1))
                .foregroundColor(isSelected ? .blue : .primary)
                .clipShape(Capsule())
        }
    }
}
```

```swift
// Views/BookDetail/Components/PopularHighlightsSection.swift

import SwiftUI

struct PopularHighlightsSection: View {
    let highlights: [PopularHighlight]
    let totalCount: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("热门划线")
                .font(.headline)

            // Horizontal scroll of highlights
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(highlights) { highlight in
                        HighlightCard(highlight: highlight)
                    }
                }
            }

            // See all button
            if totalCount > highlights.count {
                Button(action: { /* Navigate to all highlights */ }) {
                    HStack {
                        Spacer()
                        Text("查看全部 \(totalCount) 个热门划线")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Spacer()
                    }
                    .padding(.vertical, 12)
                    .background(Color.gray.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
        }
        .padding()
    }
}

struct HighlightCard: View {
    let highlight: PopularHighlight

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(""\(highlight.text)"")
                .font(.subheadline)
                .lineLimit(5)
                .frame(width: 260, alignment: .leading)

            Text(highlight.highlighterText)
                .font(.caption)
                .foregroundColor(.blue)
        }
        .padding()
        .background(Color.gray.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
```

```swift
// Views/BookDetail/Components/BookDetailBottomBar.swift

import SwiftUI

struct BookDetailBottomBar: View {
    let userStatus: UserBookStatus?
    let onAddToShelf: () -> Void
    let onRead: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            // AI Button
            Button(action: { /* Show AI features */ }) {
                Image(systemName: "sparkles")
                    .font(.title3)
                    .frame(width: 44, height: 44)
            }
            .foregroundColor(.primary)

            // Add to shelf button
            Button(action: onAddToShelf) {
                Text(userStatus?.isOnShelf == true ? userStatus?.statusText ?? "已加入" : "加入书架")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
            }
            .buttonStyle(.bordered)

            // Read button
            Button(action: onRead) {
                Text("阅读")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .frame(width: 100)
                    .frame(height: 44)
            }
            .buttonStyle(.borderedProminent)
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(.ultraThinMaterial)
    }
}
```

### 6.4 ViewModel

```swift
// ViewModels/BookDetailViewModel.swift

import Foundation
import SwiftUI

@MainActor
class BookDetailViewModel: ObservableObject {
    let bookType: String
    let bookId: Int

    @Published var details: BookDetailsData?
    @Published var reviews: [BookReview] = []
    @Published var reviewSummary: ReviewSummary?
    @Published var popularHighlights: [PopularHighlight] = []
    @Published var totalHighlights: Int = 0
    @Published var relatedBooks: RelatedBooksData?
    @Published var publisherBooks: [RelatedBook]?
    @Published var bookLists: [BookListPreview] = []
    @Published var aiSummary: AIBookSummary?

    @Published var isLoading = false
    @Published var errorMessage: String?

    init(bookType: String, bookId: Int) {
        self.bookType = bookType
        self.bookId = bookId
    }

    func loadAll() async {
        isLoading = true
        errorMessage = nil

        // Load main details first
        do {
            let response = try await APIClient.shared.getBookDetails(type: bookType, id: bookId)
            details = response.data
        } catch {
            errorMessage = error.localizedDescription
            isLoading = false
            return
        }

        // Load secondary data in parallel
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.loadReviews() }
            group.addTask { await self.loadPopularHighlights() }
            group.addTask { await self.loadRelatedBooks() }
            group.addTask { await self.loadBookLists() }
            group.addTask { await self.loadAISummary() }
        }

        isLoading = false
    }

    private func loadReviews() async {
        do {
            let response = try await APIClient.shared.getBookReviews(type: bookType, id: bookId, limit: 3)
            reviews = response.data
            reviewSummary = response.summary
        } catch {
            Log.e("Failed to load reviews", error: error)
        }
    }

    private func loadPopularHighlights() async {
        do {
            let response = try await APIClient.shared.getPopularHighlights(type: bookType, id: bookId)
            popularHighlights = response.data
            totalHighlights = response.total
        } catch {
            Log.e("Failed to load highlights", error: error)
        }
    }

    private func loadRelatedBooks() async {
        do {
            let response = try await APIClient.shared.getRelatedBooks(type: bookType, id: bookId)
            relatedBooks = response.data
            publisherBooks = response.data.samePublisher
        } catch {
            Log.e("Failed to load related books", error: error)
        }
    }

    private func loadBookLists() async {
        do {
            let response = try await APIClient.shared.getBookLists(type: bookType, id: bookId)
            bookLists = response.data
        } catch {
            Log.e("Failed to load book lists", error: error)
        }
    }

    private func loadAISummary() async {
        do {
            let response = try await APIClient.shared.getAISummary(type: bookType, id: bookId)
            aiSummary = response.data
        } catch {
            Log.e("Failed to load AI summary", error: error)
        }
    }

    func addToBookshelf() async {
        do {
            _ = try await APIClient.shared.addToBookshelf(type: bookType, bookId: bookId)
            // Refresh details to update user status
            let response = try await APIClient.shared.getBookDetails(type: bookType, id: bookId)
            details = response.data
        } catch {
            Log.e("Failed to add to bookshelf", error: error)
        }
    }

    func toggleLike(reviewId: Int) async {
        do {
            let response = try await APIClient.shared.toggleReviewLike(reviewId: reviewId)
            // Update local state
            if let index = reviews.firstIndex(where: { $0.id == reviewId }) {
                // Note: Would need mutable review model or reload
            }
        } catch {
            Log.e("Failed to toggle like", error: error)
        }
    }

    func submitReview(rating: Int?, recommendType: String, content: String) async {
        do {
            _ = try await APIClient.shared.createReview(
                type: bookType,
                bookId: bookId,
                rating: rating,
                recommendType: recommendType,
                content: content
            )
            // Refresh reviews
            await loadReviews()
        } catch {
            Log.e("Failed to submit review", error: error)
        }
    }
}
```

---

## 7. External Services Integration

### 7.1 Google Books API

**Purpose:** Fetch book metadata (author, description, cover, ISBN, publisher, etc.)

**Integration:**

```typescript
// src/services/google-books.ts

import { log } from '../utils/logger'

interface GoogleBooksVolume {
  id: string
  volumeInfo: {
    title: string
    authors?: string[]
    publisher?: string
    publishedDate?: string
    description?: string
    pageCount?: number
    categories?: string[]
    imageLinks?: {
      thumbnail?: string
      smallThumbnail?: string
    }
    language?: string
    industryIdentifiers?: Array<{
      type: string
      identifier: string
    }>
  }
}

interface GoogleBooksResponse {
  totalItems: number
  items?: GoogleBooksVolume[]
}

export interface BookMetadataResult {
  title: string
  author: string | null
  publisher: string | null
  publishedDate: string | null
  description: string | null
  pageCount: number | null
  categories: string[] | null
  coverUrl: string | null
  language: string | null
  isbn10: string | null
  isbn13: string | null
}

const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes'
const API_KEY = process.env.GOOGLE_BOOKS_API_KEY // Optional, increases quota

export async function searchByISBN(isbn: string): Promise<BookMetadataResult | null> {
  try {
    const url = new URL(GOOGLE_BOOKS_API)
    url.searchParams.set('q', `isbn:${isbn}`)
    if (API_KEY) url.searchParams.set('key', API_KEY)

    const response = await fetch(url.toString())
    const data: GoogleBooksResponse = await response.json()

    if (!data.items || data.items.length === 0) {
      return null
    }

    return parseVolumeInfo(data.items[0])
  } catch (error) {
    log.e('Google Books API error', error)
    return null
  }
}

export async function searchByTitle(title: string, author?: string): Promise<BookMetadataResult | null> {
  try {
    const url = new URL(GOOGLE_BOOKS_API)
    let query = `intitle:${title}`
    if (author) query += `+inauthor:${author}`
    url.searchParams.set('q', query)
    url.searchParams.set('maxResults', '5')
    url.searchParams.set('langRestrict', 'zh') // Prefer Chinese results
    if (API_KEY) url.searchParams.set('key', API_KEY)

    const response = await fetch(url.toString())
    const data: GoogleBooksResponse = await response.json()

    if (!data.items || data.items.length === 0) {
      return null
    }

    // Find best match
    const bestMatch = data.items.find(item =>
      item.volumeInfo.title.toLowerCase().includes(title.toLowerCase())
    ) || data.items[0]

    return parseVolumeInfo(bestMatch)
  } catch (error) {
    log.e('Google Books API error', error)
    return null
  }
}

function parseVolumeInfo(volume: GoogleBooksVolume): BookMetadataResult {
  const info = volume.volumeInfo
  const identifiers = info.industryIdentifiers || []

  return {
    title: info.title,
    author: info.authors?.join(', ') || null,
    publisher: info.publisher || null,
    publishedDate: info.publishedDate || null,
    description: info.description || null,
    pageCount: info.pageCount || null,
    categories: info.categories || null,
    coverUrl: info.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
    language: info.language || null,
    isbn10: identifiers.find(i => i.type === 'ISBN_10')?.identifier || null,
    isbn13: identifiers.find(i => i.type === 'ISBN_13')?.identifier || null,
  }
}
```

**Rate Limits:**
- Without API key: 1,000 requests/day
- With API key: 1,000 requests/day (but tracked per project)

### 7.2 Claude API (AI Summaries)

**Purpose:** Generate AI reading guides, topic summaries, and key points

**Integration:**

```typescript
// src/services/ai-summary.ts

import Anthropic from '@anthropic-ai/sdk'
import { db } from '../db/client'
import { aiBookSummaries } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { log } from '../utils/logger'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface TopicSummary {
  topics: Array<{
    title: string
    summaryCount: number
    description: string
  }>
}

interface KeyPointsSummary {
  keyPoints: string[]
}

interface OverviewSummary {
  overview: string
}

export type SummaryType = 'topics' | 'key_points' | 'overview'

export async function getOrGenerateSummary(
  bookType: string,
  bookId: number,
  summaryType: SummaryType,
  bookContent: string, // First 50k chars of book
  bookTitle: string
): Promise<TopicSummary | KeyPointsSummary | OverviewSummary> {
  // Check cache first
  const [cached] = await db
    .select()
    .from(aiBookSummaries)
    .where(and(
      eq(aiBookSummaries.bookType, bookType),
      eq(aiBookSummaries.bookId, bookId),
      eq(aiBookSummaries.summaryType, summaryType)
    ))
    .limit(1)

  if (cached && cached.content) {
    return cached.content as any
  }

  // Generate new summary
  const prompt = getPromptForType(summaryType, bookTitle, bookContent)

  const startTime = Date.now()
  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: prompt,
    }],
  })

  const duration = Date.now() - startTime
  log.i(`AI summary generated in ${duration}ms`, { bookType, bookId, summaryType })

  // Parse response
  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const content = parseResponse(summaryType, text)

  // Calculate cost (Claude 3 Haiku: $0.25/1M input, $1.25/1M output)
  const inputCost = (response.usage.input_tokens / 1_000_000) * 0.25
  const outputCost = (response.usage.output_tokens / 1_000_000) * 1.25
  const totalCost = inputCost + outputCost

  // Cache result
  await db.insert(aiBookSummaries).values({
    bookType,
    bookId,
    summaryType,
    content,
    modelUsed: 'claude-3-haiku-20240307',
    promptVersion: '1.0',
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    generationCostUsd: totalCost.toFixed(6),
  }).onConflictDoUpdate({
    target: [aiBookSummaries.bookType, aiBookSummaries.bookId, aiBookSummaries.summaryType],
    set: {
      content,
      modelUsed: 'claude-3-haiku-20240307',
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      generationCostUsd: totalCost.toFixed(6),
      generatedAt: new Date(),
    },
  })

  return content
}

function getPromptForType(type: SummaryType, title: string, content: string): string {
  const baseContext = `你是一个专业的图书分析助手。请分析以下书籍内容并提供精准的摘要。

书名：${title}

书籍内容（前50000字）：
${content.substring(0, 50000)}

`

  switch (type) {
    case 'topics':
      return baseContext + `请识别这本书的3-5个核心主题，并用JSON格式返回：
{
  "topics": [
    {
      "title": "主题标题（8字以内）",
      "summaryCount": 相关要点数量,
      "description": "主题简要描述（50字以内）"
    }
  ]
}

只返回JSON，不要其他文字。`

    case 'key_points':
      return baseContext + `请提取这本书的5-10个核心观点或关键洞见，并用JSON格式返回：
{
  "keyPoints": [
    "核心观点1（30字以内）",
    "核心观点2（30字以内）"
  ]
}

只返回JSON，不要其他文字。`

    case 'overview':
      return baseContext + `请用2-3句话概括这本书的核心内容，并用JSON格式返回：
{
  "overview": "书籍概述（100字以内）"
}

只返回JSON，不要其他文字。`
  }
}

function parseResponse(type: SummaryType, text: string): any {
  try {
    // Extract JSON from response (handle potential markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }
    return JSON.parse(jsonMatch[0])
  } catch (error) {
    log.e('Failed to parse AI response', error)
    // Return default structure
    switch (type) {
      case 'topics':
        return { topics: [] }
      case 'key_points':
        return { keyPoints: [] }
      case 'overview':
        return { overview: '' }
    }
  }
}
```

**Rate Limits & Costs:**
- Rate: 1000 RPM (requests per minute)
- Cost: ~$0.00025 per summary (using Haiku)
- Monthly budget: $50 = ~200,000 summaries

### 7.3 Open Library API (Fallback)

**Purpose:** Free fallback for ISBN lookups when Google Books fails

```typescript
// src/services/open-library.ts

export interface OpenLibraryBook {
  title: string
  authors?: Array<{ name: string }>
  publishers?: string[]
  publish_date?: string
  description?: string | { value: string }
  number_of_pages?: number
  covers?: number[]
  subjects?: string[]
}

export async function searchByISBN(isbn: string): Promise<BookMetadataResult | null> {
  try {
    const response = await fetch(
      `https://openlibrary.org/isbn/${isbn}.json`
    )

    if (!response.ok) return null

    const data: OpenLibraryBook = await response.json()

    // Get author details if available
    let authorName: string | null = null
    if (data.authors && data.authors.length > 0) {
      const authorKey = (data.authors[0] as any).key
      if (authorKey) {
        const authorResponse = await fetch(`https://openlibrary.org${authorKey}.json`)
        if (authorResponse.ok) {
          const authorData = await authorResponse.json()
          authorName = authorData.name
        }
      }
    }

    return {
      title: data.title,
      author: authorName,
      publisher: data.publishers?.[0] || null,
      publishedDate: data.publish_date || null,
      description: typeof data.description === 'string'
        ? data.description
        : data.description?.value || null,
      pageCount: data.number_of_pages || null,
      categories: data.subjects?.slice(0, 5) || null,
      coverUrl: data.covers?.[0]
        ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg`
        : null,
      language: null,
      isbn10: null,
      isbn13: isbn.length === 13 ? isbn : null,
    }
  } catch (error) {
    log.e('Open Library API error', error)
    return null
  }
}
```

---

## 8. Background Jobs & Data Pipeline

### 8.1 Job Overview

| Job | Schedule | Purpose | Duration |
|-----|----------|---------|----------|
| `enrich-book-metadata` | Daily 3 AM | Fetch missing metadata from external APIs | ~2 hours |
| `aggregate-book-stats` | Hourly | Update reader counts, highlights, reviews | ~5 minutes |
| `compute-related-books` | Weekly (Sunday 4 AM) | Compute book relationships | ~1 hour |
| `refresh-popular-highlights` | Hourly | Refresh materialized view | ~2 minutes |
| `cleanup-expired-ai-cache` | Daily 5 AM | Remove expired AI summaries | ~1 minute |

### 8.2 Book Metadata Enrichment Job

```typescript
// scripts/jobs/enrich-book-metadata.ts

import { db } from '../../src/db/client'
import { ebooks } from '../../src/db/schema'
import { isNull, or } from 'drizzle-orm'
import * as googleBooks from '../../src/services/google-books'
import * as openLibrary from '../../src/services/open-library'
import { log } from '../../src/utils/logger'

interface EnrichmentStats {
  total: number
  enriched: number
  failed: number
  skipped: number
}

export async function enrichBookMetadata(): Promise<EnrichmentStats> {
  const stats: EnrichmentStats = {
    total: 0,
    enriched: 0,
    failed: 0,
    skipped: 0,
  }

  // Get books without metadata
  const booksToEnrich = await db
    .select()
    .from(ebooks)
    .where(or(
      isNull(ebooks.author),
      isNull(ebooks.description)
    ))
    .limit(100) // Process in batches

  stats.total = booksToEnrich.length
  log.i(`Starting metadata enrichment for ${stats.total} books`)

  for (const book of booksToEnrich) {
    try {
      // Try to extract ISBN from title or filename
      const isbn = extractISBN(book.title, book.filePath)

      let metadata = null

      // Try Google Books first
      if (isbn) {
        metadata = await googleBooks.searchByISBN(isbn)
      }

      if (!metadata) {
        // Search by title
        metadata = await googleBooks.searchByTitle(book.title)
      }

      if (!metadata && isbn) {
        // Try Open Library as fallback
        metadata = await openLibrary.searchByISBN(isbn)
      }

      if (metadata) {
        await db.update(ebooks)
          .set({
            author: metadata.author || book.author,
            description: metadata.description || book.description,
            publisher: metadata.publisher || book.publisher,
            pageCount: metadata.pageCount || book.pageCount,
            isbn: metadata.isbn13 || metadata.isbn10 || book.isbn,
            language: metadata.language || book.language,
          })
          .where(eq(ebooks.id, book.id))

        stats.enriched++
        log.i(`Enriched: ${book.title}`)
      } else {
        stats.skipped++
        log.w(`No metadata found: ${book.title}`)
      }

      // Rate limiting: wait 200ms between requests
      await sleep(200)

    } catch (error) {
      stats.failed++
      log.e(`Failed to enrich: ${book.title}`, error)
    }
  }

  log.i(`Enrichment complete`, stats)
  return stats
}

function extractISBN(title: string, filePath: string | null): string | null {
  // Common ISBN patterns
  const patterns = [
    /ISBN[:\s-]*(\d{10,13})/i,
    /(\d{13})/,
    /(\d{3}-\d-\d{5}-\d{3}-\d)/,
  ]

  const textToSearch = `${title} ${filePath || ''}`

  for (const pattern of patterns) {
    const match = textToSearch.match(pattern)
    if (match) {
      return match[1].replace(/-/g, '')
    }
  }

  return null
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Run if executed directly
if (require.main === module) {
  enrichBookMetadata()
    .then(stats => {
      console.log('Enrichment complete:', stats)
      process.exit(0)
    })
    .catch(error => {
      console.error('Enrichment failed:', error)
      process.exit(1)
    })
}
```

### 8.3 Book Stats Aggregation Job

```typescript
// scripts/jobs/aggregate-book-stats.ts

import { db } from '../../src/db/client'
import {
  bookStats,
  readingHistory,
  ebookUnderlines,
  magazineUnderlines,
  bookReviews,
  userBookshelves
} from '../../src/db/schema'
import { sql, eq, and } from 'drizzle-orm'
import { log } from '../../src/utils/logger'

export async function aggregateBookStats(): Promise<void> {
  log.i('Starting book stats aggregation')
  const startTime = Date.now()

  // Aggregate ebook stats
  await aggregateForType('ebook')

  // Aggregate magazine stats
  await aggregateForType('magazine')

  const duration = Date.now() - startTime
  log.i(`Stats aggregation complete in ${duration}ms`)
}

async function aggregateForType(bookType: 'ebook' | 'magazine'): Promise<void> {
  const underlineTable = bookType === 'ebook' ? ebookUnderlines : magazineUnderlines
  const bookIdColumn = bookType === 'ebook' ? 'ebook_id' : 'magazine_id'

  // Get all books with any activity
  const booksWithActivity = await db.execute(sql`
    SELECT DISTINCT item_id as book_id FROM reading_history WHERE item_type = ${bookType}
    UNION
    SELECT DISTINCT ${sql.raw(bookIdColumn)} as book_id FROM ${sql.raw(underlineTable._.name)}
    UNION
    SELECT DISTINCT book_id FROM book_reviews WHERE book_type = ${bookType}
    UNION
    SELECT DISTINCT book_id FROM user_bookshelves WHERE book_type = ${bookType}
  `)

  for (const row of booksWithActivity.rows as Array<{ book_id: number }>) {
    const bookId = row.book_id

    // Get reader counts
    const [readerStats] = await db.execute(sql`
      SELECT
        COUNT(DISTINCT user_id) as total_readers,
        COUNT(DISTINCT CASE WHEN progress < 1 THEN user_id END) as current_readers,
        COUNT(DISTINCT CASE WHEN progress >= 0.95 THEN user_id END) as finished_readers
      FROM reading_history
      WHERE item_type = ${bookType} AND item_id = ${bookId}
    `)

    // Get highlight count
    const [highlightStats] = await db.execute(sql`
      SELECT COUNT(*) as total_highlights
      FROM ${sql.raw(underlineTable._.name)}
      WHERE ${sql.raw(bookIdColumn)} = ${bookId}
    `)

    // Get review stats
    const [reviewStats] = await db.execute(sql`
      SELECT
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        COUNT(*) FILTER (WHERE rating IS NOT NULL) as rating_count,
        COUNT(*) FILTER (WHERE recommend_type = 'recommend') as recommend_count,
        COUNT(*) FILTER (WHERE recommend_type = 'neutral') as neutral_count,
        COUNT(*) FILTER (WHERE recommend_type = 'not_recommend') as not_recommend_count
      FROM book_reviews
      WHERE book_type = ${bookType} AND book_id = ${bookId} AND is_hidden = FALSE
    `)

    const rs = readerStats as any
    const hs = highlightStats as any
    const vs = reviewStats as any

    const totalReviews = Number(vs.total_reviews) || 0
    const recommendCount = Number(vs.recommend_count) || 0
    const recommendPercent = totalReviews > 0
      ? (recommendCount / totalReviews) * 100
      : null

    // Calculate popularity score
    const totalReaders = Number(rs.total_readers) || 0
    const finishedReaders = Number(rs.finished_readers) || 0
    const totalHighlights = Number(hs.total_highlights) || 0
    const averageRating = vs.average_rating ? Number(vs.average_rating) : 0

    const popularityScore =
      (totalReaders * 0.3) +
      (finishedReaders * 0.2) +
      (totalHighlights * 0.2) +
      (totalReviews * 0.2) +
      (averageRating * 20 * 0.1)

    // Upsert stats
    await db.insert(bookStats)
      .values({
        bookType,
        bookId,
        totalReaders,
        currentReaders: Number(rs.current_readers) || 0,
        finishedReaders,
        totalHighlights,
        totalReviews,
        averageRating: vs.average_rating,
        ratingCount: Number(vs.rating_count) || 0,
        recommendCount,
        neutralCount: Number(vs.neutral_count) || 0,
        notRecommendCount: Number(vs.not_recommend_count) || 0,
        recommendPercent: recommendPercent?.toFixed(2),
        popularityScore: popularityScore.toFixed(4),
      })
      .onConflictDoUpdate({
        target: [bookStats.bookType, bookStats.bookId],
        set: {
          totalReaders,
          currentReaders: Number(rs.current_readers) || 0,
          finishedReaders,
          totalHighlights,
          totalReviews,
          averageRating: vs.average_rating,
          ratingCount: Number(vs.rating_count) || 0,
          recommendCount,
          neutralCount: Number(vs.neutral_count) || 0,
          notRecommendCount: Number(vs.not_recommend_count) || 0,
          recommendPercent: recommendPercent?.toFixed(2),
          popularityScore: popularityScore.toFixed(4),
          updatedAt: new Date(),
        },
      })
  }
}

// Run if executed directly
if (require.main === module) {
  aggregateBookStats()
    .then(() => {
      console.log('Aggregation complete')
      process.exit(0)
    })
    .catch(error => {
      console.error('Aggregation failed:', error)
      process.exit(1)
    })
}
```

### 8.4 Related Books Computation Job

```typescript
// scripts/jobs/compute-related-books.ts

import { db } from '../../src/db/client'
import { ebooks, relatedBooks } from '../../src/db/schema'
import { eq, sql, and, ne } from 'drizzle-orm'
import { log } from '../../src/utils/logger'

export async function computeRelatedBooks(): Promise<void> {
  log.i('Starting related books computation')

  // Clear existing computed relations (keep manual ones)
  await db.delete(relatedBooks)
    .where(ne(relatedBooks.relationType, 'manual'))

  // Compute same_author relations
  await computeSameAuthorRelations()

  // Compute same_publisher relations
  await computeSamePublisherRelations()

  // Compute same_category relations
  await computeSameCategoryRelations()

  // Compute readers_also_read relations
  await computeReadersAlsoReadRelations()

  log.i('Related books computation complete')
}

async function computeSameAuthorRelations(): Promise<void> {
  log.i('Computing same_author relations')

  // Get books grouped by author
  const booksByAuthor = await db
    .select({
      author: ebooks.author,
      bookId: ebooks.id,
    })
    .from(ebooks)
    .where(sql`${ebooks.author} IS NOT NULL AND ${ebooks.author} != ''`)

  // Group by author
  const authorGroups = new Map<string, number[]>()
  for (const book of booksByAuthor) {
    if (!book.author) continue
    const existing = authorGroups.get(book.author) || []
    existing.push(book.bookId)
    authorGroups.set(book.author, existing)
  }

  // Create relations for groups with multiple books
  for (const [author, bookIds] of authorGroups) {
    if (bookIds.length < 2) continue

    for (let i = 0; i < bookIds.length; i++) {
      for (let j = 0; j < bookIds.length; j++) {
        if (i === j) continue

        await db.insert(relatedBooks)
          .values({
            sourceBookType: 'ebook',
            sourceBookId: bookIds[i],
            relatedBookType: 'ebook',
            relatedBookId: bookIds[j],
            relationType: 'same_author',
            similarityScore: '1.0000',
            confidence: '1.0000',
          })
          .onConflictDoNothing()
      }
    }
  }
}

async function computeSamePublisherRelations(): Promise<void> {
  log.i('Computing same_publisher relations')

  // Similar logic to same_author but for publisher
  // Only create relations for top 10 books per publisher (most popular)

  const publisherBooks = await db.execute(sql`
    SELECT
      e.publisher,
      e.id as book_id,
      COALESCE(bs.popularity_score, 0) as popularity
    FROM ebooks e
    LEFT JOIN book_stats bs ON bs.book_type = 'ebook' AND bs.book_id = e.id
    WHERE e.publisher IS NOT NULL AND e.publisher != ''
    ORDER BY e.publisher, popularity DESC
  `)

  // Group by publisher, keeping only top 10
  const publisherGroups = new Map<string, number[]>()
  const publisherCounts = new Map<string, number>()

  for (const row of publisherBooks.rows as Array<{ publisher: string; book_id: number }>) {
    const count = publisherCounts.get(row.publisher) || 0
    if (count >= 10) continue

    const existing = publisherGroups.get(row.publisher) || []
    existing.push(row.book_id)
    publisherGroups.set(row.publisher, existing)
    publisherCounts.set(row.publisher, count + 1)
  }

  // Create relations
  for (const [publisher, bookIds] of publisherGroups) {
    if (bookIds.length < 2) continue

    for (let i = 0; i < bookIds.length; i++) {
      for (let j = 0; j < bookIds.length; j++) {
        if (i === j) continue

        await db.insert(relatedBooks)
          .values({
            sourceBookType: 'ebook',
            sourceBookId: bookIds[i],
            relatedBookType: 'ebook',
            relatedBookId: bookIds[j],
            relationType: 'same_publisher',
            similarityScore: '0.8000',
            confidence: '1.0000',
          })
          .onConflictDoNothing()
      }
    }
  }
}

async function computeSameCategoryRelations(): Promise<void> {
  log.i('Computing same_category relations')

  // Get top 20 books per category
  const categoryBooks = await db.execute(sql`
    SELECT
      e.category_id,
      e.id as book_id,
      COALESCE(bs.popularity_score, 0) as popularity
    FROM ebooks e
    LEFT JOIN book_stats bs ON bs.book_type = 'ebook' AND bs.book_id = e.id
    WHERE e.category_id IS NOT NULL
    ORDER BY e.category_id, popularity DESC
  `)

  const categoryGroups = new Map<number, number[]>()
  const categoryCounts = new Map<number, number>()

  for (const row of categoryBooks.rows as Array<{ category_id: number; book_id: number }>) {
    const count = categoryCounts.get(row.category_id) || 0
    if (count >= 20) continue

    const existing = categoryGroups.get(row.category_id) || []
    existing.push(row.book_id)
    categoryGroups.set(row.category_id, existing)
    categoryCounts.set(row.category_id, count + 1)
  }

  for (const [categoryId, bookIds] of categoryGroups) {
    if (bookIds.length < 2) continue

    // Only create relations for top 5 most similar (to avoid explosion)
    for (let i = 0; i < Math.min(bookIds.length, 10); i++) {
      for (let j = i + 1; j < Math.min(bookIds.length, 10); j++) {
        await db.insert(relatedBooks)
          .values({
            sourceBookType: 'ebook',
            sourceBookId: bookIds[i],
            relatedBookType: 'ebook',
            relatedBookId: bookIds[j],
            relationType: 'same_category',
            similarityScore: '0.6000',
            confidence: '0.8000',
          })
          .onConflictDoNothing()

        // Reverse relation
        await db.insert(relatedBooks)
          .values({
            sourceBookType: 'ebook',
            sourceBookId: bookIds[j],
            relatedBookType: 'ebook',
            relatedBookId: bookIds[i],
            relationType: 'same_category',
            similarityScore: '0.6000',
            confidence: '0.8000',
          })
          .onConflictDoNothing()
      }
    }
  }
}

async function computeReadersAlsoReadRelations(): Promise<void> {
  log.i('Computing readers_also_read relations')

  // Find books that are commonly read by the same users
  const coReadBooks = await db.execute(sql`
    WITH user_books AS (
      SELECT user_id, item_id as book_id
      FROM reading_history
      WHERE item_type = 'ebook' AND progress > 0.1
    )
    SELECT
      a.book_id as source_book,
      b.book_id as related_book,
      COUNT(*) as co_read_count
    FROM user_books a
    JOIN user_books b ON a.user_id = b.user_id AND a.book_id < b.book_id
    GROUP BY a.book_id, b.book_id
    HAVING COUNT(*) >= 3
    ORDER BY co_read_count DESC
    LIMIT 10000
  `)

  for (const row of coReadBooks.rows as Array<{
    source_book: number;
    related_book: number;
    co_read_count: number
  }>) {
    // Normalize score: assume max co_read_count of 100
    const score = Math.min(row.co_read_count / 100, 1)

    await db.insert(relatedBooks)
      .values({
        sourceBookType: 'ebook',
        sourceBookId: row.source_book,
        relatedBookType: 'ebook',
        relatedBookId: row.related_book,
        relationType: 'readers_also_read',
        similarityScore: score.toFixed(4),
        confidence: '0.7000',
      })
      .onConflictDoNothing()

    // Reverse relation
    await db.insert(relatedBooks)
      .values({
        sourceBookType: 'ebook',
        sourceBookId: row.related_book,
        relatedBookType: 'ebook',
        relatedBookId: row.source_book,
        relationType: 'readers_also_read',
        similarityScore: score.toFixed(4),
        confidence: '0.7000',
      })
      .onConflictDoNothing()
  }
}

// Run if executed directly
if (require.main === module) {
  computeRelatedBooks()
    .then(() => {
      console.log('Computation complete')
      process.exit(0)
    })
    .catch(error => {
      console.error('Computation failed:', error)
      process.exit(1)
    })
}
```

### 8.5 Job Scheduler Setup

```typescript
// scripts/scheduler.ts

import cron from 'node-cron'
import { enrichBookMetadata } from './jobs/enrich-book-metadata'
import { aggregateBookStats } from './jobs/aggregate-book-stats'
import { computeRelatedBooks } from './jobs/compute-related-books'
import { db } from '../src/db/client'
import { sql } from 'drizzle-orm'
import { log } from '../src/utils/logger'

// Refresh popular highlights (hourly)
cron.schedule('0 * * * *', async () => {
  log.i('Running: refresh_popular_highlights')
  try {
    await db.execute(sql`SELECT refresh_popular_highlights()`)
    log.i('Completed: refresh_popular_highlights')
  } catch (error) {
    log.e('Failed: refresh_popular_highlights', error)
  }
})

// Aggregate book stats (hourly, offset by 30 minutes)
cron.schedule('30 * * * *', async () => {
  log.i('Running: aggregate_book_stats')
  try {
    await aggregateBookStats()
    log.i('Completed: aggregate_book_stats')
  } catch (error) {
    log.e('Failed: aggregate_book_stats', error)
  }
})

// Enrich book metadata (daily at 3 AM)
cron.schedule('0 3 * * *', async () => {
  log.i('Running: enrich_book_metadata')
  try {
    await enrichBookMetadata()
    log.i('Completed: enrich_book_metadata')
  } catch (error) {
    log.e('Failed: enrich_book_metadata', error)
  }
})

// Compute related books (weekly, Sunday at 4 AM)
cron.schedule('0 4 * * 0', async () => {
  log.i('Running: compute_related_books')
  try {
    await computeRelatedBooks()
    log.i('Completed: compute_related_books')
  } catch (error) {
    log.e('Failed: compute_related_books', error)
  }
})

// Cleanup expired AI cache (daily at 5 AM)
cron.schedule('0 5 * * *', async () => {
  log.i('Running: cleanup_expired_ai_cache')
  try {
    await db.execute(sql`
      DELETE FROM ai_book_summaries
      WHERE expires_at IS NOT NULL AND expires_at < NOW()
    `)
    log.i('Completed: cleanup_expired_ai_cache')
  } catch (error) {
    log.e('Failed: cleanup_expired_ai_cache', error)
  }
})

log.i('Job scheduler started')
```

---

## 9. Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal:** Basic infrastructure and core data

**Tasks:**

| Task | Estimate | Owner |
|------|----------|-------|
| Run database migrations (001-006) | 2h | Backend |
| Extend Drizzle schema | 2h | Backend |
| Implement `GET /api/ebooks/:id/details` | 4h | Backend |
| Implement bookshelf endpoints | 4h | Backend |
| Create iOS BookMetadata models | 2h | iOS |
| Create iOS BookDetailViewModel | 4h | iOS |
| Create BookHeaderSection component | 3h | iOS |
| Create BookStatsRow component | 2h | iOS |
| Create BookDetailBottomBar | 2h | iOS |
| Integration testing | 4h | QA |

**Deliverables:**
- Enhanced book detail page with metadata
- Working "Add to Bookshelf" functionality
- Basic stats display (placeholder data)

### Phase 2: Reviews & Ratings (Week 3-4)

**Goal:** Social engagement features

**Tasks:**

| Task | Estimate | Owner |
|------|----------|-------|
| Run migrations (004-005) | 1h | Backend |
| Implement review endpoints | 6h | Backend |
| Setup stats aggregation job | 4h | Backend |
| Create iOS BookReview models | 2h | iOS |
| Create BookRatingSection component | 4h | iOS |
| Create BookReviewsSection component | 4h | iOS |
| Create WriteReviewSheet | 4h | iOS |
| Review like functionality | 2h | Full Stack |
| Integration testing | 4h | QA |

**Deliverables:**
- Users can write and view reviews
- Rating breakdown display
- Review like functionality
- Real reader stats

### Phase 3: Highlights & Discovery (Week 5-6)

**Goal:** Content discovery features

**Tasks:**

| Task | Estimate | Owner |
|------|----------|-------|
| Run migrations (010, 012) | 1h | Backend |
| Implement popular highlights endpoint | 4h | Backend |
| Setup highlights materialized view | 2h | Backend |
| Implement related books endpoint | 4h | Backend |
| Setup related books computation job | 6h | Backend |
| Create iOS PopularHighlight models | 2h | iOS |
| Create PopularHighlightsSection | 4h | iOS |
| Create RelatedBooksSection | 4h | iOS |
| Create PublisherBooksSection | 3h | iOS |
| Integration testing | 4h | QA |

**Deliverables:**
- Popular highlights display
- Related books recommendations
- Publisher's other books section

### Phase 4: AI & Book Lists (Week 7-8)

**Goal:** AI features and curated lists

**Tasks:**

| Task | Estimate | Owner |
|------|----------|-------|
| Run migrations (007-009, 011) | 1h | Backend |
| Integrate Claude API | 4h | Backend |
| Implement AI summary endpoint | 6h | Backend |
| Implement book lists endpoints | 6h | Backend |
| Create iOS AIBookSummary models | 2h | iOS |
| Create AIReadingGuideSection | 4h | iOS |
| Create BookListsSection | 4h | iOS |
| Setup metadata enrichment job | 6h | Backend |
| End-to-end testing | 6h | QA |
| Performance optimization | 4h | Full Stack |

**Deliverables:**
- AI reading guides
- Book list discovery
- Automated metadata enrichment
- Production-ready feature

---

## 10. Testing Strategy

### 10.1 Unit Tests

```typescript
// __tests__/services/google-books.test.ts

import { searchByISBN, searchByTitle } from '../../src/services/google-books'

describe('Google Books Service', () => {
  describe('searchByISBN', () => {
    it('should return metadata for valid ISBN', async () => {
      const result = await searchByISBN('9787521761234')
      expect(result).not.toBeNull()
      expect(result?.title).toBeDefined()
    })

    it('should return null for invalid ISBN', async () => {
      const result = await searchByISBN('0000000000000')
      expect(result).toBeNull()
    })
  })

  describe('searchByTitle', () => {
    it('should return metadata for known title', async () => {
      const result = await searchByTitle('污名陷阱')
      expect(result).not.toBeNull()
    })
  })
})
```

```swift
// BookDetailViewModelTests.swift

import XCTest
@testable import BookLibrio

class BookDetailViewModelTests: XCTestCase {
    var viewModel: BookDetailViewModel!

    override func setUp() {
        super.setUp()
        viewModel = BookDetailViewModel(bookType: "ebook", bookId: 4146)
    }

    func testInitialState() {
        XCTAssertTrue(viewModel.isLoading)
        XCTAssertNil(viewModel.details)
        XCTAssertNil(viewModel.errorMessage)
    }

    func testLoadAllSuccess() async {
        await viewModel.loadAll()

        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNotNil(viewModel.details)
        XCTAssertNil(viewModel.errorMessage)
    }
}
```

### 10.2 Integration Tests

```typescript
// __tests__/integration/book-details.test.ts

import { app } from '../../src/app'
import { db } from '../../src/db/client'
import { ebooks, bookStats } from '../../src/db/schema'

describe('Book Details API', () => {
  beforeAll(async () => {
    // Seed test data
    await db.insert(ebooks).values({
      id: 9999,
      title: 'Test Book',
      author: 'Test Author',
      description: 'Test description',
    })

    await db.insert(bookStats).values({
      bookType: 'ebook',
      bookId: 9999,
      totalReaders: 100,
      currentReaders: 10,
    })
  })

  afterAll(async () => {
    await db.delete(ebooks).where(eq(ebooks.id, 9999))
    await db.delete(bookStats).where(
      and(eq(bookStats.bookType, 'ebook'), eq(bookStats.bookId, 9999))
    )
  })

  it('GET /api/ebooks/:id/details returns book with stats', async () => {
    const res = await app.request('/api/ebooks/9999/details')

    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.data.book.title).toBe('Test Book')
    expect(body.data.stats.totalReaders).toBe(100)
  })

  it('GET /api/ebooks/:id/details returns 404 for non-existent book', async () => {
    const res = await app.request('/api/ebooks/99999/details')
    expect(res.status).toBe(404)
  })
})
```

### 10.3 UI Tests (iOS)

```swift
// BookDetailUITests.swift

import XCTest

class BookDetailUITests: XCTestCase {
    let app = XCUIApplication()

    override func setUp() {
        continueAfterFailure = false
        app.launch()
    }

    func testBookDetailDisplaysCorrectly() {
        // Navigate to ebooks
        app.tabBars.buttons["电子书"].tap()

        // Tap first book
        app.collectionViews.cells.firstMatch.tap()

        // Verify elements
        XCTAssertTrue(app.staticTexts["阅读"].exists)
        XCTAssertTrue(app.buttons["加入书架"].exists)
        XCTAssertTrue(app.buttons["阅读"].exists)
    }

    func testAddToBookshelf() {
        // Navigate to book detail
        app.tabBars.buttons["电子书"].tap()
        app.collectionViews.cells.firstMatch.tap()

        // Add to bookshelf
        let addButton = app.buttons["加入书架"]
        addButton.tap()

        // Verify button changed
        XCTAssertTrue(app.buttons["想读"].waitForExistence(timeout: 2))
    }
}
```

---

## 11. Cost Analysis

### 11.1 External Services (Monthly)

| Service | Usage Estimate | Unit Cost | Monthly Cost |
|---------|----------------|-----------|--------------|
| Claude API (Haiku) | 10,000 summaries | $0.00025/summary | $2.50 |
| Claude API (buffer) | - | - | $10.00 |
| Google Books API | 30,000 requests | Free | $0.00 |
| Open Library API | 10,000 requests | Free | $0.00 |
| **Total External** | | | **$12.50** |

### 11.2 Infrastructure (Monthly)

| Resource | Specification | Monthly Cost |
|----------|---------------|--------------|
| Fly.io API (current) | 256MB, 1 shared CPU | $0 (free tier) |
| Fly.io API (upgraded) | 512MB, 1 shared CPU | $5.70 |
| Supabase Postgres | Current plan | $0 (existing) |
| R2 Storage | Current usage | $0 (existing) |
| **Total Infra** | | **$5.70** |

### 11.3 Development Cost (One-time)

| Phase | Effort (hours) | Rate | Cost |
|-------|----------------|------|------|
| Phase 1 | 40h | Internal | - |
| Phase 2 | 40h | Internal | - |
| Phase 3 | 40h | Internal | - |
| Phase 4 | 50h | Internal | - |
| **Total Dev** | 170h | | - |

### 11.4 Total Monthly Operating Cost

| Category | Cost |
|----------|------|
| External Services | $12.50 |
| Infrastructure | $5.70 |
| **Total** | **$18.20/month** |

---

## 12. Risk Assessment

### 12.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Google Books API rate limiting | Medium | Medium | Implement caching, use Open Library fallback |
| Claude API cost overrun | Low | Medium | Set hard budget limits, cache aggressively |
| Slow book detail page load | Medium | High | Lazy load sections, background data fetch |
| Database performance with new tables | Low | High | Add proper indexes, monitor query times |

### 12.2 Product Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Low user engagement with reviews | Medium | Medium | Incentivize reviews, show prominent prompts |
| Poor AI summary quality | Medium | High | Quality monitoring, user feedback loop |
| Incomplete metadata coverage | High | Medium | Manual curation for popular books |

### 12.3 Mitigation Strategies

1. **API Failures:** Implement circuit breakers and graceful degradation
2. **Data Quality:** Manual review queue for top 100 books
3. **Performance:** CDN for static assets, aggressive caching
4. **Cost Control:** Daily monitoring, auto-disable AI if budget exceeded

---

## Appendix A: API Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `BOOK_NOT_FOUND` | 404 | Book does not exist |
| `ALREADY_REVIEWED` | 409 | User already reviewed this book |
| `ALREADY_ON_SHELF` | 409 | Book already on user's shelf |
| `REVIEW_NOT_FOUND` | 404 | Review does not exist |
| `NOT_REVIEW_OWNER` | 403 | User doesn't own this review |
| `AI_GENERATION_FAILED` | 500 | AI summary generation failed |
| `RATE_LIMITED` | 429 | Too many requests |

---

## Appendix B: Localization Keys

```swift
// L10n additions for Book Detail

extension L10n {
    enum BookDetail {
        static let addToShelf = NSLocalizedString("book_detail.add_to_shelf", value: "加入书架", comment: "")
        static let read = NSLocalizedString("book_detail.read", value: "阅读", comment: "")
        static let wantToRead = NSLocalizedString("book_detail.want_to_read", value: "想读", comment: "")
        static let reading = NSLocalizedString("book_detail.reading", value: "在读", comment: "")
        static let finished = NSLocalizedString("book_detail.finished", value: "读过", comment: "")
        static let writeReview = NSLocalizedString("book_detail.write_review", value: "写点评", comment: "")
        static let recommendValue = NSLocalizedString("book_detail.recommend_value", value: "微信读书推荐值", comment: "")
        static let recommend = NSLocalizedString("book_detail.recommend", value: "推荐", comment: "")
        static let neutral = NSLocalizedString("book_detail.neutral", value: "一般", comment: "")
        static let notRecommend = NSLocalizedString("book_detail.not_recommend", value: "不行", comment: "")
        static let popularHighlights = NSLocalizedString("book_detail.popular_highlights", value: "热门划线", comment: "")
        static let aiGuide = NSLocalizedString("book_detail.ai_guide", value: "AI导读", comment: "")
        static let relatedBooks = NSLocalizedString("book_detail.related_books", value: "相关书籍", comment: "")
        static let publisherBooks = NSLocalizedString("book_detail.publisher_books", value: "出版社书籍", comment: "")
        static let bookLists = NSLocalizedString("book_detail.book_lists", value: "延展书单", comment: "")
        static func readerCount(_ count: Int) -> String {
            String(format: NSLocalizedString("book_detail.reader_count", value: "%d人阅读", comment: ""), count)
        }
        static func highlighterCount(_ count: Int) -> String {
            String(format: NSLocalizedString("book_detail.highlighter_count", value: "%d人划线", comment: ""), count)
        }
    }
}
```

---

**Document End**

*Last Updated: 2025-12-11*
*Author: BookLibrio Development Team*
