# BookLibrio Admin Dashboard Features

## Overview

The admin dashboard provides core functionality for content management, user management, and system monitoring. Access path is `/admin`, requiring administrator privileges (`is_admin = true`).

**Related Files:**
- Frontend Component: `packages/web/src/components/AdminDashboard.tsx`
- API Routes: `packages/api/src/routes/admin.ts`
- Auth Middleware: `packages/api/src/middleware/auth.ts`

---

## 1. Feature Module Overview

| Module | Description | Status |
|--------|-------------|--------|
| Statistics Dashboard | Content and user statistics | ✅ Implemented |
| Content Import | Batch import magazines and ebooks | ✅ Implemented |
| User Management | View user list and permissions | ✅ Implemented |
| Task Management | Background task triggering and monitoring | ✅ Implemented |
| System Monitoring | Server health status | ✅ Implemented |
| Ranking Management | External and internal ranking management | 📋 Planned |
| Category Management | Book category CRUD | 📋 Planned |

---

## 2. Detailed Feature Specifications

### 1. Statistics Dashboard

**Location:** Admin Dashboard homepage

**Displays:**
- **Magazine Statistics:** Total count + preprocessed count
- **Ebook Statistics:** Total count
- **User Statistics:** Registered user count (click to expand user list)

**API Endpoint:**
```
GET /api/admin/stats
```

**Response Example:**
```json
{
  "magazines": {
    "total": 250,
    "preprocessed": 180
  },
  "ebooks": 1500,
  "users": 850
}
```

---

### 2. Content Import Feature

**Description:** Batch import book content from server local filesystem

**Supported Types:**

| Type | Supported Formats |
|------|-------------------|
| Magazine | PDF |
| Ebook | PDF, EPUB |

**Workflow:**
1. Select import type (magazine/ebook)
2. Browse server folders, select target directory
3. Start import task
4. View real-time import progress and error messages

**API Endpoints:**

#### Browse Filesystem
```
GET /api/admin/browse?path=/path/to/folder
```

**Response Example:**
```json
{
  "currentPath": "/path",
  "parentPath": "/",
  "folders": [
    { "name": "folder1", "path": "/path/folder1" }
  ]
}
```

#### Start Import Task
```
POST /api/admin/import
Content-Type: application/json

{
  "type": "magazine|ebook",
  "folderPath": "/path/to/folder"
}
```

#### Get Import Progress
```
GET /api/admin/import/progress
```

**Response Example:**
```json
{
  "running": true,
  "type": "magazine",
  "current": 45,
  "total": 100,
  "currentItem": "filename.pdf",
  "errors": []
}
```

---

### 3. User Management

**Description:** View and manage system users

**Displayed Information:**
- User email
- Admin indicator
- Registration time

**API Endpoint:**
```
GET /api/admin/users
```

**Response Example:**
```json
[
  {
    "id": 1,
    "email": "user@example.com",
    "is_admin": 0,
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

---

### 4. Background Task Management

**Description:** Monitor and manually trigger background scheduled tasks

**Supported Tasks:**

| Task Name | Description |
|-----------|-------------|
| `refresh_popular_highlights` | Refresh popular highlights |
| `aggregate_book_stats` | Aggregate book statistics |
| `enrich_book_metadata` | Enrich book metadata |
| `compute_related_books` | Compute related book recommendations |
| `cleanup_expired_ai_cache` | Clean up expired AI cache |

**API Endpoints:**

#### Get All Task Status
```
GET /api/admin/jobs
Authorization: Bearer {ADMIN_API_KEY}
```

**Response Example:**
```json
{
  "refresh_popular_highlights": {
    "running": false,
    "lastRun": "2024-01-15T10:30:00Z"
  }
}
```

#### Manually Trigger Specific Task
```
POST /api/admin/jobs/{jobName}/trigger
Authorization: Bearer {ADMIN_API_KEY}
```

---

### 5. System Monitoring

**Description:** Get server runtime status information

**Monitored Metrics:**
- Node.js version
- Running platform
- Server uptime
- Memory usage (heap memory, external memory)
- Runtime environment

**API Endpoint:**
```
GET /api/admin/system
Authorization: Bearer {ADMIN_API_KEY}
```

**Response Example:**
```json
{
  "nodeVersion": "v18.0.0",
  "platform": "darwin",
  "uptime": 86400,
  "memory": {
    "heapUsed": 128,
    "heapTotal": 512,
    "external": 32
  },
  "environment": "production"
}
```

---

## 3. Authentication & Security

### Authentication Methods

The admin dashboard uses **dual authentication mechanism**:

| Auth Type | Use Case | Auth Method |
|-----------|----------|-------------|
| User Permission Auth | Content import, user management, statistics | JWT Token + `is_admin` check |
| API Key Auth | Task management, system monitoring | `ADMIN_API_KEY` Bearer Token |

### Permission Check Flow

```
Frontend: AdminPage component checks user.is_admin
       ↓
Backend: requireAdmin middleware validates
       ↓
Database: users.is_admin field
```

### Middleware Description

| Middleware | Function |
|------------|----------|
| `requireAuth` | Check for valid user JWT Token |
| `requireAdmin` | Check Token + admin permission (is_admin = true) |
| `optionalAuth` | Optional auth, non-logged-in users can also access |

### Environment Variable Configuration

```env
ADMIN_API_KEY=your_admin_api_key  # System-level API auth key
```

---

## 4. Technical Architecture

```
┌─────────────────────────────────────────────────┐
│                    Web Frontend                  │
│  packages/web/src/components/AdminDashboard.tsx │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│                    API Backend                   │
│      packages/api/src/routes/admin.ts           │
│      packages/api/src/middleware/auth.ts        │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│                    Database                      │
│         users.is_admin (permission field)       │
└─────────────────────────────────────────────────┘
```

---

## 5. Planned Features

### Ranking Management

Rankings displayed in the store are divided into two types: **External Rankings** and **Internal Rankings**.

#### 5.1 External Rankings (Curated Lists)

Curated book lists from authoritative external sources, stored in `curatedLists` and `curatedListItems` tables.

**Supported Ranking Sources:**

| Source ID | Name | Description |
|-----------|------|-------------|
| `nyt_bestseller` | NYT Bestseller | The New York Times Best Sellers |
| `amazon_best` | Amazon Best | Amazon Best Books |
| `bill_gates` | Bill Gates' Picks | Bill Gates' Reading List |
| `goodreads_choice` | Goodreads Choice | Goodreads Choice Awards |
| `pulitzer` | Pulitzer Prize | Pulitzer Prize Winners |
| `booker` | Booker Prize | Man Booker Prize |
| `obama_reading` | Obama's Picks | Barack Obama's Reading List |
| `national_book` | National Book Award | National Book Award |

**Data Structure:**

```typescript
// curatedLists table
{
  id: number;
  listType: string;           // Ranking type (e.g., nyt_bestseller)
  title: string;              // Ranking title
  subtitle?: string;          // Subtitle
  description?: string;       // Description
  sourceName: string;         // Source name
  sourceUrl?: string;         // Source link
  sourceLogoUrl?: string;     // Source logo
  year?: number;              // Year
  month?: number;             // Month
  isFeatured: boolean;        // Is featured
  bookCount: number;          // Book count
  viewCount: number;          // View count
  saveCount: number;          // Save count
  isActive: boolean;          // Is active
  createdAt: Date;
  updatedAt: Date;
}

// curatedListItems table
{
  id: number;
  listId: number;             // Associated ranking ID
  bookId?: number;            // Associated local book ID (optional)
  externalTitle: string;      // External book title
  externalAuthor: string;     // External author name
  externalCoverUrl?: string;  // External cover URL
  isbn?: string;              // ISBN
  amazonUrl?: string;         // Amazon link
  goodreadsUrl?: string;      // Goodreads link
  position: number;           // Rank position
  editorNote?: string;        // Editor note
  createdAt: Date;
}
```

**Management Features:**

| Feature | Description |
|---------|-------------|
| Ranking List | View all external rankings, filter by source/year |
| Create Ranking | Manually create new external ranking |
| Edit Ranking | Modify ranking basic info (title, description, logo, etc.) |
| Delete Ranking | Delete ranking and associated book items |
| Book Management | Add, edit, delete books in ranking |
| Book Linking | Link external books to local ebook library |
| Cover Management | Upload/update book cover images |
| Batch Import | Batch import ranking data from CSV |
| AI Fetch | Use AI to automatically fetch latest ranking data |

**API Endpoint Design:**

```
# Ranking CRUD
GET    /api/admin/curated-lists                    # Get all external rankings
POST   /api/admin/curated-lists                    # Create new ranking
GET    /api/admin/curated-lists/:id                # Get ranking details
PUT    /api/admin/curated-lists/:id                # Update ranking info
DELETE /api/admin/curated-lists/:id                # Delete ranking

# Ranking Book Management
GET    /api/admin/curated-lists/:id/items          # Get ranking books list
POST   /api/admin/curated-lists/:id/items          # Add book to ranking
PUT    /api/admin/curated-lists/:id/items/:itemId  # Update book info
DELETE /api/admin/curated-lists/:id/items/:itemId  # Remove book from ranking
PUT    /api/admin/curated-lists/:id/items/:itemId/link  # Link local book

# Batch Operations
POST   /api/admin/curated-lists/import             # CSV batch import
POST   /api/admin/curated-lists/fetch-ai           # AI fetch ranking data
```

**Existing Import Scripts:**

| Script | Location | Function |
|--------|----------|----------|
| `import-rankings-csv.ts` | `packages/api/src/scripts/` | Import ranking data from CSV |
| `populate-external-rankings.ts` | `packages/api/src/scripts/` | Use AI to fetch latest rankings |
| `fix-ranking-covers.ts` | `packages/api/src/scripts/` | Fix cover images |
| `populate-rankings-with-r2.ts` | `packages/api/src/scripts/` | Upload covers to R2 storage |

---

#### 5.2 Internal Rankings

Rankings automatically calculated based on user reading behavior, stored in `rankings` and `rankingItems` tables.

**Supported Ranking Types:**

| Type ID | Name | Calculation Logic |
|---------|------|-------------------|
| `trending` | Trending | Based on reading session and user growth rate |
| `hot_search` | Hot Search | Based on search count statistics |
| `new_books` | New Books | Newly released books, sorted by views + readers |
| `fiction` | Fiction | Fiction books, sorted by popularity + rating |
| `non_fiction` | Non-Fiction | Non-fiction books, sorted by popularity + rating |
| `film_tv` | Film/TV Adaptations | Books with film/TV adaptations |
| `audiobook` | Audiobook | Books with audiobook versions |
| `top_200` | Top 200 | Comprehensive ranking, popularity × rating weight |
| `masterpiece` | Masterpiece | High-rated books with rating ≥ 9.5 |
| `potential_masterpiece` | Potential Masterpiece | Rating ≥ 9.0 but readers < 1000 |

**Time Periods:**

| Period | Description |
|--------|-------------|
| `daily` | Daily ranking |
| `weekly` | Weekly ranking |
| `monthly` | Monthly ranking |
| `all_time` | All-time ranking |

**Data Structure:**

```typescript
// rankings table
{
  id: number;
  rankingType: string;        // Ranking type
  periodType: string;         // Time period
  periodStart?: Date;         // Period start time
  periodEnd?: Date;           // Period end time
  displayName: string;        // Display name
  themeColor?: string;        // Theme color
  isActive: boolean;          // Is active
  computedAt: Date;           // Computation time
}

// rankingItems table
{
  id: number;
  rankingId: number;          // Associated ranking ID
  ebookId?: number;           // Associated ebook ID
  rank: number;               // Current rank
  previousRank?: number;      // Previous rank
  rankChange?: number;        // Rank change
  score: number;              // Ranking score
  bookTitle: string;          // Title snapshot
  bookAuthor: string;         // Author snapshot
  bookCoverUrl?: string;      // Cover snapshot
  readerCount?: number;       // Reader count
  rating?: number;            // Rating
  evaluationTag?: string;     // Evaluation tag
}
```

**Management Features:**

| Feature | Description |
|---------|-------------|
| Ranking List | View all internal ranking status |
| Manual Refresh | Manually trigger ranking recalculation |
| Parameter Configuration | Adjust ranking calculation parameters (weights, thresholds, etc.) |
| Activate/Deactivate | Control whether ranking displays in store |
| Edit Books | Manually adjust books in ranking (special cases) |

**API Endpoint Design:**

```
# Ranking Management
GET    /api/admin/rankings                         # Get all internal rankings
GET    /api/admin/rankings/:type                   # Get specific type ranking
PUT    /api/admin/rankings/:type                   # Update ranking configuration
POST   /api/admin/rankings/:type/refresh           # Manually refresh ranking
PUT    /api/admin/rankings/:type/status            # Activate/deactivate ranking

# Ranking Book Management
GET    /api/admin/rankings/:type/items             # Get ranking books
PUT    /api/admin/rankings/:type/items/:itemId     # Edit ranking item
DELETE /api/admin/rankings/:type/items/:itemId     # Remove ranking item
```

**Ranking Calculation Service:**

- Location: `packages/api/src/services/ranking.ts`
- Scheduled Task: Can be triggered via background task management
- Calculation Metrics: Popularity, rating, reading duration, user count, etc.

---

### Category Management

Per [CATEGORY_BROWSING_FEATURE.md](./CATEGORY_BROWSING_FEATURE.md) specification:

```
POST   /api/admin/categories              # Create category
PUT    /api/admin/categories/:id          # Update category
DELETE /api/admin/categories/:id          # Delete category
PUT    /api/admin/ebooks/:id/categories   # Set ebook categories
PUT    /api/admin/magazines/:id/categories # Set magazine categories
```

### Book Metadata Management

- Batch edit book information
- Cover image management
- Metadata enrichment (auto-fetch)

---

## 6. API Endpoint Summary

### Implemented Endpoints

| Method | Endpoint | Description | Auth Method |
|--------|----------|-------------|-------------|
| GET | `/api/admin/stats` | Get statistics data | requireAdmin |
| GET | `/api/admin/users` | Get user list | requireAdmin |
| GET | `/api/admin/browse` | Browse filesystem | requireAdmin |
| POST | `/api/admin/import` | Start import task | requireAdmin |
| GET | `/api/admin/import/progress` | Get import progress | requireAdmin |
| GET | `/api/admin/jobs` | Get task status | API Key |
| POST | `/api/admin/jobs/:name/trigger` | Trigger task | API Key |
| GET | `/api/admin/system` | Get system info | API Key |

### Planned Endpoints (Ranking Management)

#### External Rankings (Curated Lists)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/curated-lists` | Get all external rankings |
| POST | `/api/admin/curated-lists` | Create new ranking |
| GET | `/api/admin/curated-lists/:id` | Get ranking details |
| PUT | `/api/admin/curated-lists/:id` | Update ranking info |
| DELETE | `/api/admin/curated-lists/:id` | Delete ranking |
| GET | `/api/admin/curated-lists/:id/items` | Get ranking books |
| POST | `/api/admin/curated-lists/:id/items` | Add book |
| PUT | `/api/admin/curated-lists/:id/items/:itemId` | Update book |
| DELETE | `/api/admin/curated-lists/:id/items/:itemId` | Delete book |
| PUT | `/api/admin/curated-lists/:id/items/:itemId/link` | Link local book |
| POST | `/api/admin/curated-lists/import` | CSV batch import |
| POST | `/api/admin/curated-lists/fetch-ai` | AI fetch data |

#### Internal Rankings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/rankings` | Get all internal rankings |
| GET | `/api/admin/rankings/:type` | Get specific ranking |
| PUT | `/api/admin/rankings/:type` | Update ranking configuration |
| POST | `/api/admin/rankings/:type/refresh` | Manually refresh ranking |
| PUT | `/api/admin/rankings/:type/status` | Activate/deactivate ranking |
| GET | `/api/admin/rankings/:type/items` | Get ranking books |
| PUT | `/api/admin/rankings/:type/items/:itemId` | Edit ranking item |
| DELETE | `/api/admin/rankings/:type/items/:itemId` | Remove ranking item |

---

## Changelog

- **2024-12-15**: Added ranking management feature specification (external + internal rankings)
- **2024-12-15**: Initial version, documented existing admin dashboard features
