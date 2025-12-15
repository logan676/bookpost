# E-book Store Data Preparation Implementation Plan

## Overview

The new E-book Store features depend on the following data sources that need to be prepared in advance:

| Feature | Data Requirement | Current Status |
|---------|------------------|----------------|
| Books by Year | `publication_date` field | Need to check existing data |
| Top Rated | `external_rating`, `external_ratings_count` | Need to check existing data |
| External Rankings | Ranking data in `curated_lists` table | Need to create |
| Book Covers | `cover_url` field | Need to check existing data |

---

## Phase 1: Data Status Analysis

### 1.1 Check ebooks Table Data Completeness

```sql
-- Check publication_date fill rate
SELECT
  COUNT(*) as total,
  COUNT(publication_date) as has_publication_date,
  ROUND(COUNT(publication_date)::numeric / COUNT(*) * 100, 2) as percentage
FROM ebooks;

-- Check external_rating fill rate
SELECT
  COUNT(*) as total,
  COUNT(external_rating) as has_rating,
  COUNT(external_ratings_count) as has_rating_count,
  ROUND(COUNT(external_rating)::numeric / COUNT(*) * 100, 2) as rating_percentage
FROM ebooks;

-- Check cover_url fill rate
SELECT
  COUNT(*) as total,
  COUNT(cover_url) as has_cover,
  ROUND(COUNT(cover_url)::numeric / COUNT(*) * 100, 2) as percentage
FROM ebooks;

-- Check external_rating_source distribution
SELECT
  external_rating_source,
  COUNT(*) as count
FROM ebooks
WHERE external_rating_source IS NOT NULL
GROUP BY external_rating_source;
```

### 1.2 Expected Results Assessment

| Field | Minimum Requirement | Ideal State |
|-------|---------------------|-------------|
| `publication_date` | >50% has data | >90% has data |
| `external_rating` | >30% has data | >70% has data |
| `cover_url` | >80% has data | 100% has data |

---

## Phase 2: Book Metadata Completion

### 2.1 Data Source Options

#### Option A: Open Library API (Recommended)
- **Pros**: Free, open, rich data
- **Cons**: Requires ISBN matching
- **API**: `https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data`

```typescript
interface OpenLibraryBook {
  title: string;
  authors: { name: string }[];
  publish_date: string;
  cover: { small: string; medium: string; large: string };
  subjects: { name: string }[];
}
```

#### Option B: Google Books API
- **Pros**: Comprehensive data, supports multiple query methods
- **Cons**: Request quota limit (1000/day free)
- **API**: `https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}`

```typescript
interface GoogleBooksVolume {
  volumeInfo: {
    title: string;
    authors: string[];
    publishedDate: string;
    imageLinks: { thumbnail: string; smallThumbnail: string };
    averageRating: number;
    ratingsCount: number;
  };
}
```

#### Option C: Douban API
- **Pros**: More accurate data for Chinese books
- **Cons**: Official API closed, requires scraping
- **Data**: Ratings, covers, publication dates

#### Option D: Manual CSV Import
- **Pros**: Fully controllable
- **Cons**: High workload
- **Suitable for**: Small number of key books

### 2.2 Recommended Approach

Adopt a **hybrid strategy**:

```
+-----------------------------------------------------+
|                  Data Completion Flow                |
+-----------------------------------------------------+
|  1. Prioritize Open Library (free, unlimited)        |
|     | if not found                                   |
|  2. Use Google Books API (has quota)                 |
|     | if not found                                   |
|  3. Mark as "needs_manual_review"                    |
+-----------------------------------------------------+
```

### 2.3 Implementation Script

Create `/packages/api/src/scripts/enrich-book-metadata.ts`:

```typescript
// Functions:
// 1. Iterate through ebooks table records with missing data
// 2. Query Open Library / Google Books using ISBN
// 3. Complete publication_date, external_rating, cover_url
// 4. Log processing results

// Run commands:
// npx tsx src/scripts/enrich-book-metadata.ts --dry-run  # Preview
// npx tsx src/scripts/enrich-book-metadata.ts            # Execute
```

---

## Phase 3: Book Cover Processing

### 3.1 Cover Source Priority

1. **Existing cover_url** - Keep existing ones unchanged
2. **Open Library Covers** - `https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg`
3. **Google Books thumbnails** - Get from API response
4. **Default placeholder** - Display when no cover available

### 3.2 Cover Storage Strategy

#### Option A: Use External URLs Directly (Recommended Initially)
```
Pros: No storage cost, immediately available
Cons: Depends on external service, may have hotlinking restrictions
```

#### Option B: Download to CDN/OSS
```
Pros: Fully controllable, faster loading
Cons: Requires storage cost, needs download script
```

### 3.3 Recommended Approach

**Initial**: Use Open Library cover URLs directly
**Later**: Gradually migrate to own CDN

```typescript
// Cover URL construction
function getCoverUrl(isbn: string): string {
  return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
}
```

---

## Phase 4: External Rankings Data Preparation

### 4.1 Ranking Types to Create

| list_type | Name | Data Source | Update Frequency |
|-----------|------|-------------|------------------|
| `nyt_bestseller` | New York Times Bestseller | NYT API / Manual | Weekly |
| `amazon_best` | Amazon Bestseller | Manual compilation | Monthly |
| `bill_gates` | Bill Gates Recommendations | Gates Notes | Yearly |
| `goodreads_choice` | Goodreads Choice Awards | Goodreads | Yearly |
| `pulitzer` | Pulitzer Prize | Official announcements | Yearly |
| `booker` | Booker Prize | Official announcements | Yearly |

### 4.2 Ranking Data Structure

```sql
-- curated_lists table (existing)
INSERT INTO curated_lists (
  list_type,           -- 'nyt_bestseller', 'amazon_best', etc.
  source_name,         -- 'New York Times', 'Amazon', etc.
  source_logo_url,     -- Source logo
  title,               -- '2024 Annual Bestseller'
  subtitle,            -- 'Fiction'
  description,         -- List description
  external_url,        -- Original list link
  is_active,           -- true
  display_order        -- Sort order
) VALUES (...);

-- curated_list_items table (existing)
INSERT INTO curated_list_items (
  list_id,             -- Reference to curated_lists
  book_type,           -- 'ebook'
  book_id,             -- Reference to ebooks.id (if in library)
  external_book_info,  -- JSON (if not in library)
  position,            -- Ranking position
  added_at             -- Addition time
) VALUES (...);
```

### 4.3 Ranking Data Preparation Options

#### Option A: Manual Seed Script (Recommended Initially)

Create `/packages/api/src/scripts/seed-external-rankings.ts`:

```typescript
const rankings = [
  {
    listType: 'nyt_bestseller',
    sourceName: 'New York Times',
    sourceLogoUrl: '/images/logos/nyt.png',
    title: '2024 Annual Bestsellers',
    subtitle: 'Fiction',
    books: [
      { title: 'Book 1', author: 'Author 1', isbn: '978-xxx' },
      { title: 'Book 2', author: 'Author 2', isbn: '978-xxx' },
      // ...
    ]
  },
  // ... more rankings
];
```

#### Option B: NYT Books API (Paid)

- **API**: `https://api.nytimes.com/svc/books/v3/lists.json`
- **Cost**: $0.50 per 1000 requests
- **Pros**: Auto-updates, accurate data

#### Option C: Periodic Manual Updates

- Weekly/monthly manual CSV updates
- Import script processing

### 4.4 Recommended Implementation Steps

```
Week 1: Prepare 5-10 classic rankings (manual)
  +-- New York Times 2024 Annual List
  +-- Bill Gates 2024 Recommendations
  +-- Pulitzer Prize 2020-2024
  +-- Booker Prize 2020-2024
  +-- Goodreads 2024 Choice Awards

Week 2: Complete ranking book data
  +-- Match with existing ebooks table
  +-- Complete missing covers
  +-- Fill external_book_info

Week 3+: Consider automation
  +-- NYT API or periodic scraping
```

---

## Phase 5: Implementation Timeline

### Week 1: Data Analysis & Script Development

| Task | Hours | Owner |
|------|-------|-------|
| Run data completeness check SQL | 1h | BE |
| Develop `enrich-book-metadata.ts` script | 4h | BE |
| Test Open Library API integration | 2h | BE |
| Test Google Books API integration | 2h | BE |

### Week 2: Data Completion

| Task | Hours | Owner |
|------|-------|-------|
| Run metadata completion script | 2h | BE |
| Handle failed completion records | 4h | BE/Ops |
| Validate cover URL availability | 2h | BE |

### Week 3: Ranking Data Preparation

| Task | Hours | Owner |
|------|-------|-------|
| Compile 5-10 classic ranking CSVs | 8h | Ops |
| Develop `seed-external-rankings.ts` | 4h | BE |
| Import ranking data | 2h | BE |
| Match ranking books with ebooks table | 4h | BE |

### Week 4: Testing & Launch

| Task | Hours | Owner |
|------|-------|-------|
| API integration testing | 4h | BE |
| iOS frontend integration | 4h | iOS |
| Bug fixes | 4h | ALL |
| Launch | 2h | BE |

---

## Phase 6: Script File List

Scripts to create:

```
/packages/api/src/scripts/
+-- check-data-completeness.ts     # Data completeness check
+-- enrich-book-metadata.ts        # Metadata completion (Open Library + Google Books)
+-- seed-external-rankings.ts      # Import external rankings
+-- validate-cover-urls.ts         # Validate cover URL availability
+-- data/
    +-- nyt-bestsellers-2024.csv   # Ranking data files
    +-- bill-gates-2024.csv
    +-- pulitzer-winners.csv
    +-- booker-winners.csv
    +-- goodreads-choice-2024.csv
```

---

## Decision Points (Need Confirmation)

### 1. Metadata Source Priority

- [ ] Open Library priority (free)
- [ ] Google Books priority (quota limited)
- [ ] Douban scraping (more accurate for Chinese books)

### 2. Cover Storage Strategy

- [ ] Use external URLs directly (recommended initially)
- [ ] Download to own CDN

### 3. Ranking Data Source

- [ ] Manual CSV compilation (recommended initially)
- [ ] NYT API (paid automation)
- [ ] Periodic scraping

### 4. Data Update Frequency

- [ ] Manual on-demand updates
- [ ] Weekly auto-updates
- [ ] Monthly auto-updates

---

## Appendix: API Reference

### Open Library API

```bash
# Query by ISBN
curl "https://openlibrary.org/api/books?bibkeys=ISBN:9780140328721&format=json&jscmd=data"

# Cover image
https://covers.openlibrary.org/b/isbn/9780140328721-L.jpg
```

### Google Books API

```bash
# Query by ISBN
curl "https://www.googleapis.com/books/v1/volumes?q=isbn:9780140328721"

# Need API Key for higher quota
curl "https://www.googleapis.com/books/v1/volumes?q=isbn:9780140328721&key=YOUR_API_KEY"
```

### NYT Books API

```bash
# Get bestseller list
curl "https://api.nytimes.com/svc/books/v3/lists/current/hardcover-fiction.json?api-key=YOUR_KEY"
```
