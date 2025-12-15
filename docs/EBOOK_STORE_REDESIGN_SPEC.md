# E-book Store Redesign Specification

## Overview

This document describes the redesign of the E-book Store page, including frontend layout, API design, and data model changes.

**Design Reference**: `/Users/HONGBGU/Desktop/BookLibrio/stitch_e_book_store_home_page/`

---

## 1. Overall Page Layout

### New Layout Structure (Top to Bottom)

```
┌─────────────────────────────────────────────┐
│  Search Bar                                  │
├─────────────────────────────────────────────┤
│  Tab Picker [E-books] [Magazines]            │
├─────────────────────────────────────────────┤
│  § Recommended for You (horizontal scroll)   │
├─────────────────────────────────────────────┤
│  § Categories (horizontal scroll, dynamic)   │
├─────────────────────────────────────────────┤
│  § Books by Year (grouped by publication)    │
├─────────────────────────────────────────────┤
│  § Top Rated (high-rated books list)         │
├─────────────────────────────────────────────┤
│  § Curated Collections                       │
├─────────────────────────────────────────────┤
│  § External Rankings                         │
└─────────────────────────────────────────────┘
```

### Comparison with Current Implementation

| Current | New Design | Change Description |
|---------|------------|-------------------|
| Tab above search bar | Tab below search bar | Position adjustment |
| Categories 4-column grid | Categories horizontal scroll | Layout change |
| None | Books by Year | New addition |
| Rankings preview | Top Rated | Style refactor |
| Popular book lists | Curated Collections | Style optimization |
| None | External Rankings | New addition |

---

## 2. Detailed Section Design

### 2.1 Search Bar

**Position Change**: From below Tab to above Tab

**UI Specs**:
- Placeholder: "Search for books or magazines" (dynamically switch based on Tab)
- Background: `Color(.systemGray6)`
- Corner radius: 10pt
- Padding: 12pt

**No backend changes required**

---

### 2.2 Recommended for You

**Change**: From TabView carousel to horizontal scrolling cards

**UI Specs**:
```
+------------------+  +------------------+  +------------------+
|   [Book Cover]   |  |   [Book Cover]   |  |   [Book Cover]   |
|     100x140      |  |     100x140      |  |     100x140      |
+------------------+  +------------------+  +------------------+
|   Book Title     |  |   Book Title     |  |   Book Title     |
|   Author Name    |  |   Author Name    |  |   Author Name    |
+------------------+  +------------------+  +------------------+
```

**Card Dimensions**:
- Cover: 100 x 140 pt
- Card width: 100 pt
- Card spacing: 12 pt

**API**: Reuse existing `GET /api/ebooks?limit=10` or `GET /api/rankings/trending`

**No backend changes required**

---

### 2.3 Categories - Requires Frontend Changes

**Change**: From 4-column grid to horizontal scroll

**UI Specs**:
```
Horizontal scroll:
[History] [Literature] [Fiction] [Technology] [Science] [Art] ...

Single category cell:
┌───────────────┐
│    [Icon]     │   Icon: 40pt circular background
│   History     │   Text: Caption, Medium
└───────────────┘
Cell width: 70pt
Cell spacing: 12pt
```

**Display Rules**:
- Show all categories (no longer limited to 8)
- Horizontal scroll, swipe to see more
- Tap to enter category detail page

**API**: Reuse existing `GET /api/categories?bookType=ebook&flat=false`

**No backend changes required**

---

### 2.4 Books by Year - Requires Backend Support

**Feature Description**: Display books grouped by publication year

**UI Specs**:
```
§ Books by Year                        [View More >]
┌─────────────────────────────────────────────────────┐
│ ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│ │  Cover   │  │  Cover   │  │  Cover   │           │
│ │  80x110  │  │  80x110  │  │  80x110  │  →        │
│ ├──────────┤  ├──────────┤  ├──────────┤           │
│ │The Wager │  │Tomorrow..|  │Lessons.. │           │
│ │   2023   │  │   2022   │  │   2022   │           │
│ └──────────┘  └──────────┘  └──────────┘           │
└─────────────────────────────────────────────────────┘
```

**Card Specs**:
- Cover: 80 x 110 pt
- Title: Caption, Medium, max 2 lines
- Year label: Caption2, Secondary color, gray background rounded label

**New API**:

```
GET /api/store/books-by-year
```

**Request Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| bookType | string | Yes | "ebook" or "magazine" |
| limit | number | No | Books per year, default 10 |
| years | string | No | Specified years, comma-separated, e.g. "2024,2023,2022", default last 3 years |

**Response**:
```json
{
  "data": [
    {
      "year": 2024,
      "books": [
        {
          "id": 123,
          "title": "Book Title",
          "author": "Author Name",
          "coverUrl": "https://...",
          "publicationDate": "2024-03-15",
          "rating": 4.5,
          "ratingCount": 128
        }
      ]
    },
    {
      "year": 2023,
      "books": [...]
    }
  ]
}
```

**Database Changes**:
- Ensure `ebooks` table `publicationDate` field is populated
- May need batch update of publication dates for existing books

---

### 2.5 Top Rated - Requires Backend Support

**Feature Description**: Display highest-rated books list

**UI Specs**:
```
§ Top Rated                            [View More >]
┌─────────────────────────────────────────────────────┐
│ ┌────────┬──────────────────────────────────────┐  │
│ │ Cover  │  Project Hail Mary                   │  │
│ │ 60x80  │  Andy Weir                           │  │
│ │        │  ★★★★★  4.8 (2,341)                │  │
│ ├────────┼──────────────────────────────────────┤  │
│ │ Cover  │  Pachinko                            │  │
│ │ 60x80  │  Min Jin Lee                         │  │
│ │        │  ★★★★☆  4.5 (1,892)                │  │
│ └────────┴──────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**List Item Specs**:
- Cover: 60 x 80 pt
- Title: Subheadline, Bold
- Author: Caption, Secondary color
- Rating: Star icons (orange) + numeric rating + rating count

**API Options**:

**Option A**: Reuse existing Rankings API
```
GET /api/rankings/top_rated?limit=10
```
Requires ensuring response includes `rating` and `ratingCount` fields.

**Option B**: New dedicated API (Recommended)
```
GET /api/store/top-rated
```

**Request Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| bookType | string | Yes | "ebook" or "magazine" |
| limit | number | No | Return count, default 10 |
| minRatingCount | number | No | Minimum rating count filter, default 10 |

**Response**:
```json
{
  "data": [
    {
      "id": 456,
      "title": "Project Hail Mary",
      "author": "Andy Weir",
      "coverUrl": "https://...",
      "rating": 4.8,
      "ratingCount": 2341,
      "externalRatingSource": "goodreads"
    }
  ],
  "total": 100
}
```

**Database Considerations**:
- Use `ebooks.externalRating` and `ebooks.externalRatingCount` fields
- Sort: `ORDER BY externalRating DESC, externalRatingCount DESC`
- Filter: `WHERE externalRatingCount >= minRatingCount`

---

### 2.6 Curated Collections - Requires Backend Optimization

**Feature Description**: Display editor-curated themed book lists

**UI Specs**:
```
§ Curated Collections                   [View More >]
┌─────────────────────────────────────────────────────┐
│ ┌─────────────────┐  ┌─────────────────┐           │
│ │ [Background Img]│  │ [Background Img]│           │
│ │                 │  │                 │           │
│ │ Classic         │  │ Bill Gates'     │  →        │
│ │ Literature      │  │ Choice          │           │
│ │ 📚 12 books     │  │ 📚 8 books      │           │
│ └─────────────────┘  └─────────────────┘           │
└─────────────────────────────────────────────────────┘
```

**Card Specs**:
- Card size: 160 x 120 pt
- Background: Gradient or themed image
- Title: Subheadline, Bold, white
- Book count: Caption, white semi-transparent

**API Optimization**:

Reuse existing `GET /api/book-lists` with added fields:

```
GET /api/book-lists?featured=true&limit=6
```

**Enhanced Response Fields Needed**:
```json
{
  "data": [
    {
      "id": 1,
      "title": "Classic Literature",
      "description": "Timeless literary masterpieces",
      "coverUrl": "https://...",
      "backgroundUrl": "https://...",       // New: background image
      "themeColor": "#6B4FA2",              // New: theme color
      "bookCount": 12,
      "previewCovers": [                    // New: first 3 book cover previews
        "https://cover1.jpg",
        "https://cover2.jpg",
        "https://cover3.jpg"
      ],
      "creator": {
        "id": 1,
        "username": "editor",
        "avatar": "..."
      }
    }
  ]
}
```

**Database Changes**:
```sql
ALTER TABLE book_lists ADD COLUMN background_url TEXT;
ALTER TABLE book_lists ADD COLUMN theme_color VARCHAR(20);
```

---

### 2.7 External Rankings - Requires Backend Support

**Feature Description**: Display authoritative book rankings from external sources

**UI Specs**:
```
§ External Rankings & Recommended Lists   [View More >]
┌─────────────────────────────────────────────────────┐
│ ┌─────────────────┐  ┌─────────────────┐           │
│ │ [amazon logo]   │  │ [NYT logo]      │           │
│ │                 │  │                 │           │
│ │ Amazon Annual   │  │ New York Times  │  →        │
│ │ Bestsellers     │  │ Bestseller List │           │
│ │                 │  │                 │           │
│ │ Top Selling...  │  │ Top Fiction &.. │           │
│ └─────────────────┘  └─────────────────┘           │
└─────────────────────────────────────────────────────┘
```

**Card Specs**:
- Card size: 160 x 140 pt
- Logo: 40 x 40 pt
- Title: Subheadline, Bold
- Description: Caption, Secondary color

**New API**:

```
GET /api/store/external-rankings
```

**Request Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| bookType | string | No | "ebook" or "magazine", default "ebook" |

**Response**:
```json
{
  "data": [
    {
      "id": "amazon-bestsellers-2024",
      "source": "amazon",
      "sourceName": "Amazon",
      "sourceLogoUrl": "https://...",
      "title": "Amazon Annual Bestsellers",
      "subtitle": "Top Selling Books of 2024",
      "description": "The most purchased books on Amazon this year",
      "bookCount": 100,
      "lastUpdated": "2024-12-01T00:00:00Z",
      "url": "https://amazon.com/bestsellers"
    },
    {
      "id": "nyt-fiction-2024",
      "source": "nyt",
      "sourceName": "New York Times",
      "sourceLogoUrl": "https://...",
      "title": "NYT Bestseller List",
      "subtitle": "Top Fiction & Non-Fiction",
      "description": "Weekly updated bestseller rankings",
      "bookCount": 30,
      "lastUpdated": "2024-12-10T00:00:00Z",
      "url": "https://nytimes.com/books/best-sellers"
    }
  ]
}
```

**New Database Tables**:
```sql
CREATE TABLE external_rankings (
  id VARCHAR(100) PRIMARY KEY,
  source VARCHAR(50) NOT NULL,           -- amazon, nyt, goodreads, etc.
  source_name VARCHAR(100) NOT NULL,
  source_logo_url TEXT,
  title VARCHAR(200) NOT NULL,
  subtitle VARCHAR(200),
  description TEXT,
  book_type VARCHAR(20) DEFAULT 'ebook', -- ebook or magazine
  book_count INT DEFAULT 0,
  external_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  last_updated TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Books associated with external rankings
CREATE TABLE external_ranking_books (
  id SERIAL PRIMARY KEY,
  ranking_id VARCHAR(100) REFERENCES external_rankings(id),
  book_type VARCHAR(20) NOT NULL,       -- ebook or magazine
  book_id INT,                          -- Reference to ebooks or magazines table
  external_book_id VARCHAR(100),        -- Book ID from external system
  rank_position INT,                    -- Rank in that list
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(ranking_id, book_type, book_id)
);
```

**Admin Panel Requirements**:
- Need to provide admin interface to configure external rankings
- Or use scheduled tasks to automatically fetch updates

---

## 3. API Design Summary

### 3.1 New API List

| Endpoint | Method | Description | Priority |
|----------|--------|-------------|----------|
| `/api/store/books-by-year` | GET | Get books by year | High |
| `/api/store/top-rated` | GET | Get top-rated books | High |
| `/api/store/external-rankings` | GET | Get external rankings | Medium |
| `/api/store/external-rankings/:id` | GET | Get ranking details and books | Medium |

### 3.2 Existing APIs to Optimize

| Endpoint | Optimization |
|----------|--------------|
| `GET /api/book-lists` | Add `backgroundUrl`, `themeColor`, `previewCovers` fields |
| `GET /api/rankings/top_rated` | Ensure response includes `rating`, `ratingCount` fields |

### 3.3 New Route File

Recommend creating `/api/store.ts` to centrally manage store homepage APIs:

```typescript
// packages/api/src/routes/store.ts

import { OpenAPIHono } from '@hono/zod-openapi'

const app = new OpenAPIHono()

// GET /api/store/books-by-year
// GET /api/store/top-rated
// GET /api/store/external-rankings
// GET /api/store/home (convenience endpoint aggregating all homepage data)

export default app
```

---

## 4. Database Changes Summary

### 4.1 Modify Existing Tables

```sql
-- Add fields to book_lists table
ALTER TABLE book_lists ADD COLUMN background_url TEXT;
ALTER TABLE book_lists ADD COLUMN theme_color VARCHAR(20);
```

### 4.2 New Tables

```sql
-- External rankings configuration table
CREATE TABLE external_rankings (
  id VARCHAR(100) PRIMARY KEY,
  source VARCHAR(50) NOT NULL,
  source_name VARCHAR(100) NOT NULL,
  source_logo_url TEXT,
  title VARCHAR(200) NOT NULL,
  subtitle VARCHAR(200),
  description TEXT,
  book_type VARCHAR(20) DEFAULT 'ebook',
  book_count INT DEFAULT 0,
  external_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  last_updated TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- External ranking books association table
CREATE TABLE external_ranking_books (
  id SERIAL PRIMARY KEY,
  ranking_id VARCHAR(100) REFERENCES external_rankings(id) ON DELETE CASCADE,
  book_type VARCHAR(20) NOT NULL,
  book_id INT,
  external_book_id VARCHAR(100),
  rank_position INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(ranking_id, book_type, book_id)
);

-- Indexes
CREATE INDEX idx_external_rankings_book_type ON external_rankings(book_type);
CREATE INDEX idx_external_rankings_active ON external_rankings(is_active);
CREATE INDEX idx_external_ranking_books_ranking ON external_ranking_books(ranking_id);
```

---

## 5. Implementation Priority

### Phase 1 - Frontend Layout Adjustments (No Backend Required)
- [ ] Search bar position adjustment (below Tab → above Tab)
- [ ] Recommended for You change to horizontal scroll
- [ ] Categories change to horizontal scroll

### Phase 2 - High Priority Features (Backend Required)
- [ ] Books by Year section
  - [ ] BE: Add `/api/store/books-by-year` API
  - [ ] FE: Implement `BooksByYearSection` component
- [ ] Top Rated section
  - [ ] BE: Add `/api/store/top-rated` API or optimize rankings API
  - [ ] FE: Implement `TopRatedSection` component

### Phase 3 - Medium Priority Features
- [ ] Curated Collections style optimization
  - [ ] BE: Add fields to book_lists table
  - [ ] BE: Update API to return new fields
  - [ ] FE: Refactor `CuratedCollectionsSection` component
- [ ] External Rankings section
  - [ ] BE: Create new database tables
  - [ ] BE: Add new API
  - [ ] BE: Admin panel configuration interface (optional)
  - [ ] FE: Implement `ExternalRankingsSection` component

---

## 6. Open Questions

### Q1: External Rankings Data Source
- **Option A**: Manual configuration (admin panel entry)
- **Option B**: Automatic scraping (scheduled tasks)
- **Option C**: Third-party API integration

**Recommendation**: Phase 1 use manual configuration, expand based on needs later

### Q2: Books by Year Year Range
- Show how many recent years? (Suggest 3 years)
- Support user selection of specific years?

### Q3: Top Rated Minimum Rating Count
- Recommend setting `minRatingCount = 10` to avoid small sample bias
- Need frontend configurability?

---

## Appendix: Design Screenshots

### screen.png
Shows: Recommended → Categories → Books by Year → External Rankings

### screen copy.png
Shows: Recommended → Categories → Books by Year → Top Rated → Curated Collections

Both layouts can be implemented simultaneously, dynamically displayed based on data availability.

---

*Document Version: v1.0*
*Created: 2024-12-14*
*Pending Review*
