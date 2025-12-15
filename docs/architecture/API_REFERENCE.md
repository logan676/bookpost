# API Reference

## Overview

BookLibrio API is a RESTful API built with Hono and documented using OpenAPI 3.1 specification. All endpoints return JSON responses.

**Base URL:** `https://booklibrio-api.fly.dev`

**OpenAPI Spec:** `https://booklibrio-api.fly.dev/api/openapi.json`

## Authentication

### Bearer Token

Most endpoints require authentication via Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Token Lifecycle

| Token Type | Expiry | Purpose |
|------------|--------|---------|
| Access Token | 7 days | API authentication |
| Refresh Token | 30 days | Get new access token |

---

## Endpoints

### Authentication

#### Register

```http
POST /api/auth/register
```

Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "username": "johndoe"
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "username": "johndoe"
    },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

#### Login

```http
POST /api/auth/login
```

Authenticate and receive tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:** `200 OK`
```json
{
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "username": "johndoe"
    },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

#### Refresh Token

```http
POST /api/auth/refresh
```

Get a new access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJ..."
}
```

**Response:** `200 OK`
```json
{
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

#### Logout

```http
POST /api/auth/logout
Authorization: Bearer <token>
```

Invalidate current session.

**Response:** `200 OK`
```json
{
  "data": {
    "message": "Logged out successfully"
  }
}
```

#### Get Current User

```http
GET /api/auth/me
Authorization: Bearer <token>
```

Get current authenticated user.

**Response:** `200 OK`
```json
{
  "data": {
    "id": 1,
    "email": "user@example.com",
    "username": "johndoe",
    "is_admin": false,
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

---

### Ebooks

#### List Ebooks

```http
GET /api/ebooks
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `category` | string | - | Filter by category ID |
| `search` | string | - | Search in title/author |
| `limit` | integer | 50 | Max results |
| `offset` | integer | 0 | Pagination offset |

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "title": "The Great Gatsby",
      "author": "F. Scott Fitzgerald",
      "format": "epub",
      "file_path": "ebooks/1/book.epub",
      "cover_url": "https://r2.booklibrio.app/covers/ebooks/1.jpg",
      "category_id": 3,
      "page_count": 180,
      "created_at": "2024-01-10T08:00:00Z"
    }
  ],
  "total": 150
}
```

#### Get Ebook

```http
GET /api/ebooks/{id}
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "data": {
    "id": 1,
    "title": "The Great Gatsby",
    "author": "F. Scott Fitzgerald",
    "description": "A story of the mysteriously wealthy Jay Gatsby...",
    "format": "epub",
    "file_path": "ebooks/1/book.epub",
    "cover_url": "https://r2.booklibrio.app/covers/ebooks/1.jpg",
    "category_id": 3,
    "category_name": "Fiction",
    "page_count": 180,
    "isbn": "9780743273565",
    "publisher": "Scribner",
    "published_date": "1925-04-10",
    "created_at": "2024-01-10T08:00:00Z"
  }
}
```

#### Download Ebook File

```http
GET /api/ebooks/{id}/file
Authorization: Bearer <token>
```

**Response:** `200 OK`
- Content-Type: `application/epub+zip` or `application/pdf`
- Binary file stream

#### Get Ebook Text

```http
GET /api/ebooks/{id}/text
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `chapter` | integer | Specific chapter (optional) |

**Response:** `200 OK`
```json
{
  "data": {
    "chapters": [
      {
        "index": 1,
        "title": "Chapter 1",
        "text": "In my younger and more vulnerable years..."
      }
    ]
  }
}
```

#### List Ebook Categories

```http
GET /api/ebook-categories
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "data": [
    { "id": 1, "name": "Fiction", "count": 45 },
    { "id": 2, "name": "Non-Fiction", "count": 32 },
    { "id": 3, "name": "Science", "count": 18 }
  ]
}
```

---

### Magazines

#### List Magazines

```http
GET /api/magazines
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `publisher` | integer | Filter by publisher ID |
| `year` | integer | Filter by year |
| `search` | string | Search in title |
| `limit` | integer | Max results (default: 50) |
| `offset` | integer | Pagination offset |

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "title": "The Economist - January 2024",
      "publisher_id": 1,
      "publisher_name": "The Economist",
      "issue_date": "2024-01-15",
      "cover_url": "https://r2.booklibrio.app/covers/magazines/1.jpg",
      "page_count": 84
    }
  ],
  "total": 250
}
```

#### Get Magazine

```http
GET /api/magazines/{id}
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "data": {
    "id": 1,
    "title": "The Economist - January 2024",
    "publisher_id": 1,
    "publisher_name": "The Economist",
    "issue_date": "2024-01-15",
    "cover_url": "https://r2.booklibrio.app/covers/magazines/1.jpg",
    "file_path": "magazines/1/magazine.pdf",
    "page_count": 84
  }
}
```

#### Get Magazine Page

```http
GET /api/magazines/{id}/page/{pageNum}
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `quality` | string | medium | low, medium, high |

**Response:** `200 OK`
- Content-Type: `image/jpeg`
- Headers: `Cache-Control: public, max-age=31536000`

#### Download Magazine PDF

```http
GET /api/magazines/{id}/pdf
Authorization: Bearer <token>
```

**Response:** `200 OK`
- Content-Type: `application/pdf`
- Binary file stream

#### List Publishers

```http
GET /api/publishers
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "data": [
    { "id": 1, "name": "The Economist", "magazine_count": 52 },
    { "id": 2, "name": "Time", "magazine_count": 48 }
  ]
}
```

---

### Notes

#### List Notes

```http
GET /api/notes
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search in title/content |
| `year` | integer | Filter by year |
| `limit` | integer | Max results |
| `offset` | integer | Pagination offset |

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "title": "Reading Notes: The Great Gatsby",
      "content_preview": "Key themes from the book...",
      "created_at": "2024-01-20T14:30:00Z",
      "updated_at": "2024-01-21T09:00:00Z"
    }
  ],
  "total": 25
}
```

#### Create Note

```http
POST /api/notes
Authorization: Bearer <token>
```

**Request:**
```json
{
  "title": "My Reading Notes",
  "content": "# Chapter 1\n\nKey observations..."
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": 26,
    "title": "My Reading Notes",
    "content": "# Chapter 1\n\nKey observations...",
    "created_at": "2024-01-22T10:00:00Z"
  }
}
```

#### Get Note

```http
GET /api/notes/{id}
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "data": {
    "id": 1,
    "title": "Reading Notes: The Great Gatsby",
    "content": "# Key Themes\n\n## The American Dream...",
    "underlines": [
      {
        "id": 1,
        "text": "In my younger and more vulnerable years",
        "color": "#FFEB3B",
        "ideas": [
          {
            "id": 1,
            "content": "This sets the reflective tone of the novel"
          }
        ]
      }
    ],
    "created_at": "2024-01-20T14:30:00Z"
  }
}
```

#### Update Note

```http
PUT /api/notes/{id}
Authorization: Bearer <token>
```

**Request:**
```json
{
  "title": "Updated Title",
  "content": "Updated content..."
}
```

**Response:** `200 OK`

#### Delete Note

```http
DELETE /api/notes/{id}
Authorization: Bearer <token>
```

**Response:** `204 No Content`

#### Add Underline to Note

```http
POST /api/notes/{id}/underlines
Authorization: Bearer <token>
```

**Request:**
```json
{
  "text": "The highlighted text",
  "start_offset": 150,
  "end_offset": 175,
  "color": "#FFEB3B"
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": 5,
    "text": "The highlighted text",
    "color": "#FFEB3B"
  }
}
```

#### Add Idea to Underline

```http
POST /api/note-underlines/{underlineId}/ideas
Authorization: Bearer <token>
```

**Request:**
```json
{
  "content": "My thought about this passage"
}
```

**Response:** `201 Created`

---

### Reading History

#### Get Reading History

```http
GET /api/reading-history
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "type": "ebook",
      "item_id": 5,
      "item_title": "The Great Gatsby",
      "progress": 0.65,
      "last_position": "chapter-3",
      "last_read_at": "2024-01-22T20:30:00Z"
    },
    {
      "id": 2,
      "type": "magazine",
      "item_id": 12,
      "item_title": "The Economist - January 2024",
      "progress": 0.25,
      "last_position": "21",
      "last_read_at": "2024-01-21T18:00:00Z"
    }
  ]
}
```

#### Save Reading Progress

```http
POST /api/reading-history
Authorization: Bearer <token>
```

**Request:**
```json
{
  "type": "ebook",
  "item_id": 5,
  "progress": 0.72,
  "last_position": "chapter-4"
}
```

**Response:** `200 OK`
```json
{
  "data": {
    "id": 1,
    "progress": 0.72,
    "last_position": "chapter-4",
    "last_read_at": "2024-01-22T21:00:00Z"
  }
}
```

#### Get Progress for Item

```http
GET /api/reading-history/{type}/{id}
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "data": {
    "progress": 0.72,
    "last_position": "chapter-4",
    "last_read_at": "2024-01-22T21:00:00Z"
  }
}
```

---

### AI Features

See [AI Features Architecture](./AI_FEATURES.md) for detailed documentation.

#### Recognize Book from Cover

```http
POST /api/ai/recognize-book
Authorization: Bearer <token>
```

**Request:**
```json
{
  "image": "base64-encoded-image..."
}
```

**Response:** `200 OK`
```json
{
  "data": {
    "title": "The Great Gatsby",
    "author": "F. Scott Fitzgerald",
    "isbn": "9780743273565",
    "confidence": 0.95
  }
}
```

#### Extract Text from Image

```http
POST /api/ai/extract-text
Authorization: Bearer <token>
```

**Request:**
```json
{
  "image": "base64-encoded-image..."
}
```

**Response:** `200 OK`
```json
{
  "data": {
    "text": "Extracted text content...",
    "language": "en",
    "paragraphs": ["Paragraph 1", "Paragraph 2"]
  }
}
```

#### Translate Text

```http
POST /api/ai/translate
Authorization: Bearer <token>
```

**Request:**
```json
{
  "text": "Text to translate",
  "targetLanguage": "zh"
}
```

**Response:** `200 OK`
```json
{
  "data": {
    "translation": "翻译后的文本",
    "sourceLanguage": "en"
  }
}
```

---

### Search

#### Global Search

```http
GET /api/search
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Search query (required) |
| `type` | string | Filter by type (ebook, magazine, note) |
| `limit` | integer | Max results (default: 20) |

**Response:** `200 OK`
```json
{
  "data": {
    "ebooks": [
      { "id": 1, "title": "The Great Gatsby", "author": "F. Scott Fitzgerald" }
    ],
    "magazines": [
      { "id": 5, "title": "The Economist", "issue_date": "2024-01-15" }
    ],
    "notes": [
      { "id": 3, "title": "Reading Notes", "preview": "Key themes..." }
    ]
  },
  "total": 15
}
```

---

### Health

#### Health Check

```http
GET /api/health
```

**Response:** `200 OK`
```json
{
  "status": "ok",
  "timestamp": "2024-01-22T10:00:00Z",
  "version": "2.0.0"
}
```

#### Detailed Health

```http
GET /api/health/detailed
Authorization: Bearer <admin_token>
```

**Response:** `200 OK`
```json
{
  "status": "ok",
  "database": "connected",
  "storage": "connected",
  "uptime": 86400,
  "memory": {
    "used": 128000000,
    "total": 512000000
  }
}
```

---

## Error Responses

All errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

### Example Error Responses

**401 Unauthorized:**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

**400 Validation Error:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {
      "email": "Invalid email format",
      "password": "Password must be at least 8 characters"
    }
  }
}
```

**429 Rate Limited:**
```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests",
    "retryAfter": 60
  }
}
```

---

## Rate Limits

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| General API | 100 requests | 15 minutes |
| AI Features | 10-30 requests | 1 minute |
| File Downloads | 50 requests | 1 hour |
| Search | 30 requests | 1 minute |

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705933200
```

---

## Pagination

List endpoints support pagination via `limit` and `offset` query parameters:

```http
GET /api/ebooks?limit=20&offset=40
```

**Response includes total count:**
```json
{
  "data": [...],
  "total": 150
}
```

---

## Book Store (New)

### Categories

#### List Categories

```http
GET /api/categories
Authorization: Bearer <token>
```

Get all book categories with two-level hierarchy.

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "name": "文学",
      "parent_id": null,
      "icon_url": "https://r2.booklibrio.app/icons/literature.png",
      "children": [
        { "id": 11, "name": "现代文学", "parent_id": 1 },
        { "id": 12, "name": "古典文学", "parent_id": 1 }
      ]
    },
    {
      "id": 2,
      "name": "有声书",
      "parent_id": null,
      "icon_url": "https://r2.booklibrio.app/icons/audiobook.png",
      "children": []
    }
  ]
}
```

#### Get Category Books

```http
GET /api/categories/{id}/books
Authorization: Bearer <token>
```

Get books in a category with advanced filters.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `wordCount` | string | all | Filter: all, 0-3万字, 3-10万字, 10万字以上 |
| `paymentType` | string | all | Filter: all, 付费会员可读, 体验卡可读 |
| `sortBy` | string | hotness | Sort: 热度, 推荐值, 阅读人数, 出版时间 |
| `limit` | integer | 20 | Max results |
| `offset` | integer | 0 | Pagination offset |

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "title": "活着",
      "author": "余华",
      "cover_url": "https://r2.booklibrio.app/covers/1.jpg",
      "word_count": 120000,
      "recommend_score": 92.5,
      "readers_count": 125000,
      "payment_type": "member"
    }
  ],
  "total": 150
}
```

### Rankings

#### List Ranking Types

```http
GET /api/rankings
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "data": [
    { "type": "trending", "name": "飙升榜", "theme_color": "#FF69B4" },
    { "type": "hot_search", "name": "热搜榜", "theme_color": "#FF4500" },
    { "type": "new_release", "name": "新书榜", "theme_color": "#FF8C00" },
    { "type": "novel", "name": "小说榜", "theme_color": "#4169E1" },
    { "type": "top200", "name": "TOP200总榜", "theme_color": "#FFD700" }
  ]
}
```

#### Get Ranking Items

```http
GET /api/rankings/{type}
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 50 | Max results |

**Response:** `200 OK`
```json
{
  "data": {
    "type": "trending",
    "name": "飙升榜",
    "theme_color": "#FF69B4",
    "items": [
      {
        "rank": 1,
        "book": {
          "id": 1,
          "title": "活着",
          "author": "余华",
          "cover_url": "https://r2.booklibrio.app/covers/1.jpg"
        },
        "recommend_score": 92.5,
        "evaluation_tags": ["神作"],
        "readers_count": 125000
      }
    ]
  }
}
```

### Recommendations

#### Get Personalized Recommendations

```http
GET /api/recommendations
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "data": {
    "guessYouLike": [
      {
        "book": { "id": 1, "title": "活着", "author": "余华", "cover_url": "..." },
        "reason": "因为你看过《许三观卖血记》"
      }
    ],
    "dailyBookList": {
      "id": 100,
      "title": "职场进阶必读",
      "source": "得到APP",
      "books": [...]
    },
    "hotBooks": [...]
  }
}
```

### Book Lists

#### List Book Lists

```http
GET /api/booklists
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Filter: featured, daily, user |
| `limit` | integer | Max results |
| `offset` | integer | Pagination offset |

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "title": "2025必读书单",
      "description": "年度精选好书",
      "cover_url": "...",
      "book_count": 20,
      "creator": { "id": 1, "username": "booklibrio" }
    }
  ],
  "total": 50
}
```

#### Get Book List Details

```http
GET /api/booklists/{id}
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "data": {
    "id": 1,
    "title": "2025必读书单",
    "description": "年度精选好书",
    "books": [
      { "id": 1, "title": "活着", "author": "余华", "cover_url": "..." }
    ],
    "creator": { "id": 1, "username": "booklibrio", "avatar": "..." },
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

---

## Book Details (New)

### Get Full Book Detail

```http
GET /api/books/{id}/detail
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "data": {
    "id": 1,
    "title": "活着",
    "author": "余华",
    "translator": null,
    "cover_url": "https://r2.booklibrio.app/covers/1.jpg",
    "description": "讲述了农村人福贵悲惨的人生遭遇...",
    "word_count": 120000,
    "publish_date": "1993-01-01",
    "publisher": "作家出版社",
    "readers_count": 125000,
    "finished_count": 85000,
    "today_readers_count": 1200,
    "recommend_score": 92.5,
    "rating_distribution": {
      "recommend": 8500,
      "neutral": 1200,
      "not_recommend": 300
    },
    "evaluation_tags": ["神作"],
    "payment_type": "member",
    "price": null,
    "categories": ["文学", "现代文学"]
  }
}
```

### Get AI Guide/Outline

```http
GET /api/books/{id}/ai-guide
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "data": {
    "summary_topics": [
      {
        "id": 1,
        "title": "苦难与生存的意义",
        "summary": "本书通过福贵的一生，探讨了在极端苦难中人如何找到生存的意义...",
        "linked_chapters": [1, 3, 5]
      }
    ],
    "celebrity_recommendations": [
      {
        "id": 1,
        "celebrity_name": "莫言",
        "celebrity_title": "诺贝尔文学奖得主",
        "quote": "余华是当代中国最具影响力的作家之一",
        "context": "在一次文学研讨会上的发言"
      }
    ]
  }
}
```

### Get Popular Highlights

```http
GET /api/books/{id}/popular-highlights
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 10 | Max results |

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "text": "人是为了活着本身而活着，而不是为了活着之外的任何事物而活着。",
      "highlight_count": 12500
    }
  ]
}
```

### Get Related Books

```http
GET /api/books/{id}/related
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 2,
      "title": "许三观卖血记",
      "author": "余华",
      "cover_url": "...",
      "recommend_score": 91.2
    }
  ]
}
```

### Book Reviews

#### Get Reviews

```http
GET /api/books/{id}/reviews
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `filter` | string | all | Filter: all, recommend, neutral, not_recommend |
| `limit` | integer | 20 | Max results |
| `offset` | integer | 0 | Pagination offset |

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "user": { "id": 1, "username": "reader1", "avatar": "..." },
      "rating": "recommend",
      "content": "非常感人的一本书，余华的文字总是那么有力量。",
      "likes_count": 150,
      "created_at": "2025-01-15T10:00:00Z"
    }
  ],
  "total": 500
}
```

#### Submit Review

```http
POST /api/books/{id}/reviews
Authorization: Bearer <token>
```

**Request:**
```json
{
  "rating": "recommend",
  "content": "非常感人的一本书！"
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": 501,
    "rating": "recommend",
    "content": "非常感人的一本书！",
    "created_at": "2025-01-22T10:00:00Z"
  }
}
```

---

## AI Features (Extended)

### AI Q&A (Ask Book)

```http
POST /api/ai/ask-book
Authorization: Bearer <token>
```

Ask AI questions about a specific book.

**Request:**
```json
{
  "bookId": 1,
  "question": "这本书的主题是什么？",
  "conversationId": "uuid-optional"
}
```

**Response:** `200 OK`
```json
{
  "data": {
    "answer": "《活着》的主题是关于生命的意义和人在苦难中的坚韧...",
    "conversationId": "uuid-for-follow-up"
  }
}
```

### AI Lookup (Word/Phrase)

```http
POST /api/ai/lookup
Authorization: Bearer <token>
```

Look up word or phrase meaning with AI interpretation.

**Request:**
```json
{
  "text": "宿命",
  "bookId": 1
}
```

**Response:** `200 OK`
```json
{
  "data": {
    "word": "宿命",
    "dictionary_definition": {
      "pinyin": "sù mìng",
      "definitions": ["前世注定的命运", "命中注定"],
      "source": "《辞海》"
    },
    "ai_interpretation": {
      "explanation": "在《活着》的语境中，宿命代表了福贵无法逃脱的命运轨迹...",
      "contextual_meaning": "作者用宿命感来强调人物面对苦难时的无奈与坚韧",
      "highlighted_keywords": ["命运", "苦难", "坚韧"]
    },
    "related_books": [
      { "id": 5, "title": "百年孤独", "author": "加西亚·马尔克斯" }
    ]
  }
}
```

### AI Voice Narration

#### Get Available Voices

```http
GET /api/ai/voices
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "male_2025a",
      "name": "AI男声2025A",
      "gender": "male",
      "language": "zh",
      "preview_url": "https://r2.booklibrio.app/voices/male_2025a.mp3"
    },
    {
      "id": "female_2025a",
      "name": "AI女声2025A",
      "gender": "female",
      "language": "zh",
      "preview_url": "https://r2.booklibrio.app/voices/female_2025a.mp3"
    }
  ]
}
```

#### Generate Audio for Chapter

```http
POST /api/ai/generate-audio
Authorization: Bearer <token>
```

**Request:**
```json
{
  "bookId": 1,
  "chapterIndex": 3,
  "voiceId": "male_2025a"
}
```

**Response:** `200 OK`
```json
{
  "data": {
    "audioUrl": "https://r2.booklibrio.app/audio/book_1_ch_3.mp3",
    "duration": 1845.5
  }
}
```

---

## Social Features (New)

### Friends Activity

#### Get Friends Activity Feed

```http
GET /api/social/friends-activity
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | string | friends | Filter: friends, book_friends |
| `limit` | integer | 20 | Max results |
| `offset` | integer | 0 | Pagination offset |

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "user": { "id": 1, "username": "reader1", "avatar": "..." },
      "book": { "id": 1, "title": "活着", "cover_url": "..." },
      "activity_type": "reading",
      "reading_duration": 3600,
      "notes_count": 5,
      "thought": "今天读了两个小时，太感人了",
      "likes_count": 15,
      "is_liked": false,
      "created_at": "2025-01-22T20:00:00Z"
    }
  ],
  "total": 100
}
```

### Thoughts

#### Publish Thought

```http
POST /api/social/thoughts
Authorization: Bearer <token>
```

**Request:**
```json
{
  "content": "今天读完了《活着》，太震撼了！",
  "images": ["base64-image-1", "base64-image-2"],
  "bookId": 1,
  "mentionedUserIds": [2, 3],
  "topicIds": [1, 5],
  "visibility": "public"
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": 100,
    "content": "今天读完了《活着》，太震撼了！",
    "images": ["https://r2.booklibrio.app/thoughts/100_1.jpg"],
    "created_at": "2025-01-22T21:00:00Z"
  }
}
```

#### Get Thought Detail

```http
GET /api/social/thoughts/{id}
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "data": {
    "id": 100,
    "user": { "id": 1, "username": "reader1", "avatar": "..." },
    "content": "今天读完了《活着》，太震撼了！",
    "images": ["..."],
    "book": { "id": 1, "title": "活着", "cover_url": "..." },
    "mentioned_users": [...],
    "topics": [{ "id": 1, "name": "文学" }],
    "visibility": "public",
    "likes_count": 25,
    "comments_count": 10,
    "is_liked": true,
    "created_at": "2025-01-22T21:00:00Z"
  }
}
```

### Topics

#### List Topics

```http
GET /api/social/topics
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Filter by category |
| `search` | string | Search topics |

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "name": "书友",
      "category": "reading",
      "post_count": 15000,
      "is_hot": true,
      "is_new": false
    }
  ]
}
```

#### Get Trending Topics

```http
GET /api/social/topics/trending
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "data": [
    { "id": 1, "name": "今天你读书了吗", "post_count": 5000 },
    { "id": 2, "name": "年度书单", "post_count": 3000 }
  ]
}
```

### Reading Leaderboard

```http
GET /api/social/leaderboard
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "data": {
    "week_start_date": "2025-01-20",
    "week_end_date": "2025-01-26",
    "settlement_time": "2025-01-26T24:00:00Z",
    "my_ranking": {
      "rank": 42,
      "reading_duration": 17460
    },
    "entries": [
      {
        "rank": 1,
        "user": { "id": 10, "username": "bookworm", "avatar": "..." },
        "reading_duration": 126000,
        "is_last_week": false,
        "is_liked": false
      }
    ]
  }
}
```

### Following

#### Follow User

```http
POST /api/social/follow/{userId}
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "data": {
    "message": "Followed successfully"
  }
}
```

#### Unfollow User

```http
DELETE /api/social/follow/{userId}
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "data": {
    "message": "Unfollowed successfully"
  }
}
```

---

## User Profile (Extended)

### Get User Profile

```http
GET /api/user/profile
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "data": {
    "id": 1,
    "username": "reader1",
    "avatar": "https://r2.booklibrio.app/avatars/1.jpg",
    "gender": "male",
    "membership_status": {
      "is_active": true,
      "type": "yearly",
      "expiration_date": "2026-01-15T00:00:00Z"
    },
    "coin_balance": 50.00,
    "benefit_days": 30,
    "total_reading_duration": 432000,
    "monthly_reading_duration": 72000,
    "current_ranking": 42,
    "ranking_duration": 17460,
    "reading_count": 28,
    "finished_count": 156,
    "notes_count": 1024,
    "subscription_count": 12,
    "book_list_count": 15,
    "following_count": 128,
    "followers_count": 256,
    "badge_count": 25,
    "featured_badges": [...]
  }
}
```

### Update Profile

```http
PATCH /api/user/profile
Authorization: Bearer <token>
```

**Request:**
```json
{
  "username": "new_username",
  "avatar": "base64-image",
  "gender": "male",
  "profile_visibility": {
    "bookshelf": true,
    "favorites": true,
    "booklists": true,
    "badges": true,
    "thoughts": true
  }
}
```

**Response:** `200 OK`

### Get Reading Statistics

```http
GET /api/user/statistics
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `dimension` | string | week, month, year, total, calendar |
| `date` | string | Specific date for the period (YYYY-MM-DD) |

**Response:** `200 OK`
```json
{
  "data": {
    "dimension": "week",
    "date_range": {
      "start": "2025-01-20",
      "end": "2025-01-26"
    },
    "total_duration": 17460,
    "daily_average": 2494,
    "comparison_change": 15.5,
    "friend_ranking": 42,
    "books_read": 3,
    "books_finished": 1,
    "reading_days": 7,
    "notes_count": 25,
    "duration_by_day": [
      { "date": "2025-01-20", "duration": 3600 },
      { "date": "2025-01-21", "duration": 2400 }
    ],
    "longest_book": { "id": 1, "title": "活着", "duration": 7200 },
    "category_preferences": [
      { "category": "文学", "percentage": 45.5 },
      { "category": "历史", "percentage": 25.0 }
    ]
  }
}
```

### Get Reading Milestones

```http
GET /api/user/milestones
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "date": "2025-01-15",
      "type": "finished",
      "description": "读完了《活着》",
      "related_book": { "id": 1, "title": "活着", "cover_url": "..." }
    },
    {
      "id": 2,
      "date": "2025-01-10",
      "type": "streak_days",
      "description": "连续阅读100天",
      "related_book": null
    }
  ]
}
```

### Get User Badges

```http
GET /api/user/badges
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "category": "reading_streak",
      "level": 3,
      "name": "连续阅读180天",
      "requirement": "连续阅读180天",
      "icon_url": "https://r2.booklibrio.app/badges/streak_180.png",
      "is_earned": true,
      "earned_at": "2025-01-01T00:00:00Z",
      "earned_count": 5000
    },
    {
      "id": 2,
      "category": "reading_streak",
      "level": 4,
      "name": "连续阅读365天",
      "requirement": "连续阅读365天",
      "icon_url": "https://r2.booklibrio.app/badges/streak_365.png",
      "is_earned": false,
      "earned_at": null,
      "earned_count": 1000,
      "progress": {
        "current": 180,
        "target": 365,
        "description": "再阅读185天可得"
      }
    }
  ]
}
```

---

## Membership (New)

### Get Membership Plans

```http
GET /api/membership/plans
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "auto_monthly",
      "type": "连续包月",
      "price": 9.00,
      "original_price": 19.00,
      "duration_months": 1,
      "description": "首月特惠，次月起19元/月",
      "is_recommended": true
    },
    {
      "id": "yearly",
      "type": "年卡",
      "price": 228.00,
      "original_price": null,
      "duration_months": 12,
      "description": "折合19元/月",
      "is_recommended": false
    }
  ]
}
```

### Subscribe to Plan

```http
POST /api/membership/subscribe
Authorization: Bearer <token>
```

**Request:**
```json
{
  "planId": "yearly",
  "paymentMethod": "apple_iap"
}
```

**Response:** `200 OK`
```json
{
  "data": {
    "transactionId": "txn_123456",
    "productId": "com.booklibrio.membership.yearly"
  }
}
```

### Redeem Code

```http
POST /api/membership/redeem
Authorization: Bearer <token>
```

**Request:**
```json
{
  "code": "WELCOME2025"
}
```

**Response:** `200 OK`
```json
{
  "data": {
    "success": true,
    "days_added": 30,
    "new_expiration_date": "2025-02-22T00:00:00Z"
  }
}
```

### Get Membership Status

```http
GET /api/membership/status
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "data": {
    "is_active": true,
    "type": "yearly",
    "start_date": "2025-01-15T00:00:00Z",
    "expiration_date": "2026-01-15T00:00:00Z",
    "is_auto_renew": false,
    "benefits": [
      "全场出版书畅读",
      "全场有声书畅听",
      "AI翻译",
      "AI朗读"
    ]
  }
}
```

---

## Bookshelf (Extended)

### Get User Bookshelf

```http
GET /api/bookshelf
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sortBy` | string | default | Sort: default, update, progress, recommend, title, category, wordCount, paid |

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "book_id": 1,
      "book_type": "ebook",
      "title": "活着",
      "author": "余华",
      "cover_url": "https://r2.booklibrio.app/covers/1.jpg",
      "progress": 0.65,
      "last_read_at": "2025-01-22T20:00:00Z",
      "is_downloaded": true,
      "added_at": "2025-01-10T10:00:00Z",
      "recommend_score": 92.5,
      "word_count": 120000,
      "category_id": 1
    }
  ],
  "total": 28
}
```

### Add to Bookshelf

```http
POST /api/bookshelf/add
Authorization: Bearer <token>
```

**Request:**
```json
{
  "bookId": 1,
  "bookType": "ebook"
}
```

**Response:** `201 Created`

### Remove from Bookshelf

```http
DELETE /api/bookshelf/{bookId}
Authorization: Bearer <token>
```

**Response:** `204 No Content`

### Import Local Book

```http
POST /api/bookshelf/import
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request:**
- `file`: Book file (epub, pdf)
- `format`: string (epub, pdf)

**Response:** `201 Created`
```json
{
  "data": {
    "id": 100,
    "title": "Imported Book",
    "format": "epub",
    "file_path": "imports/user_1/100.epub"
  }
}
```

---

## Enhanced Highlights (Updated)

### Get Book Highlights

```http
GET /api/books/{id}/highlights
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `visibility` | string | my | Filter: my, public, friends |

**Response:** `200 OK`
```json
{
  "data": {
    "highlights": [
      {
        "id": 1,
        "text": "人是为了活着本身而活着",
        "cfi_range": "epubcfi(/6/4[chap01]!/4/2/1:0)",
        "page_number": 45,
        "chapter_index": 3,
        "style": "background",
        "color": "#FFEB3B",
        "visibility": "public",
        "thoughts": [
          {
            "id": 1,
            "content": "这句话深深触动了我",
            "visibility": "public",
            "likes": 15
          }
        ],
        "created_at": "2025-01-20T10:00:00Z"
      }
    ],
    "popular_highlights": [
      {
        "id": 100,
        "text": "人是为了活着本身而活着",
        "highlight_count": 12500
      }
    ]
  }
}
```

### Create Highlight

```http
POST /api/books/{id}/highlights
Authorization: Bearer <token>
```

**Request:**
```json
{
  "text": "人是为了活着本身而活着",
  "cfi_range": "epubcfi(/6/4[chap01]!/4/2/1:0)",
  "page_number": 45,
  "start_offset": 100,
  "end_offset": 115,
  "chapter_index": 3,
  "style": "background",
  "color": "#FFEB3B",
  "visibility": "public"
}
```

**Response:** `201 Created`

---

### Reading Sessions (阅读会话)

阅读会话 API 用于追踪用户的实时阅读时长，支持心跳机制精确统计。

#### Start Reading Session (开始阅读会话)

```http
POST /api/reading/sessions/start
Authorization: Bearer <token>
```

**Request:**
```json
{
  "bookId": 1,
  "bookType": "ebook",
  "position": "epubcfi(/6/4[chap01]!/4/2/1:0)",
  "chapterIndex": 3,
  "deviceType": "ios",
  "deviceId": "xxx-xxx-xxx"
}
```

**Response:** `200 OK`
```json
{
  "data": {
    "sessionId": 12345,
    "startTime": "2025-01-22T10:00:00Z"
  }
}
```

#### Send Heartbeat (会话心跳)

客户端每30秒-1分钟发送一次心跳，更新阅读时长。

```http
POST /api/reading/sessions/{sessionId}/heartbeat
Authorization: Bearer <token>
```

**Request:**
```json
{
  "currentPosition": "epubcfi(/6/4[chap01]!/4/2/1:500)",
  "chapterIndex": 3,
  "pagesRead": 2
}
```

**Response:** `200 OK`
```json
{
  "data": {
    "sessionId": 12345,
    "durationSeconds": 180,
    "todayDuration": 3600,
    "totalBookDuration": 7200
  }
}
```

#### End Reading Session (结束阅读会话)

```http
POST /api/reading/sessions/{sessionId}/end
Authorization: Bearer <token>
```

**Request:**
```json
{
  "endPosition": "epubcfi(/6/4[chap01]!/4/2/1:1000)",
  "chapterIndex": 4,
  "pagesRead": 5
}
```

**Response:** `200 OK`
```json
{
  "data": {
    "sessionId": 12345,
    "durationSeconds": 1800,
    "totalBookDuration": 9000,
    "todayDuration": 3600,
    "milestonesAchieved": [
      {
        "type": "total_hours",
        "value": 100,
        "title": "累计阅读100小时"
      }
    ]
  }
}
```

#### Get Active Session (获取活跃会话)

```http
GET /api/reading/sessions/active
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "data": {
    "sessionId": 12345,
    "bookId": 1,
    "bookType": "ebook",
    "startTime": "2025-01-22T10:00:00Z",
    "durationSeconds": 1800
  }
}
```

#### Get Today's Duration (获取今日阅读时长)

```http
GET /api/reading/today
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "data": {
    "todayDuration": 7200,
    "formattedDuration": "2h 0m"
  }
}
```

---

### Reading Statistics (阅读统计)

阅读统计 API 支持多维度查询：周/月/年/总/日历视图。

#### Get Reading Stats (获取阅读统计)

```http
GET /api/user/reading-stats
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `dimension` | string | Yes | week / month / year / total / calendar |
| `date` | string | No | 日期 (YYYY-MM-DD)，用于 week |
| `year` | integer | No | 年份，用于 month/year/calendar |
| `month` | integer | No | 月份 (1-12)，用于 month/calendar |

**Response (周视图):** `200 OK`
```json
{
  "data": {
    "dimension": "week",
    "dateRange": {
      "start": "2025-01-20",
      "end": "2025-01-26"
    },
    "summary": {
      "totalDuration": 17460,
      "dailyAverage": 2494,
      "comparisonChange": 15.5,
      "friendRanking": 42
    },
    "readingRecords": {
      "booksRead": 3,
      "readingDays": 7,
      "notesCount": 25,
      "highlightsCount": 48
    },
    "durationByDay": [
      { "date": "2025-01-20", "duration": 3600, "dayOfWeek": "周一" },
      { "date": "2025-01-21", "duration": 2400, "dayOfWeek": "周二" },
      { "date": "2025-01-22", "duration": 1800, "dayOfWeek": "周三" },
      { "date": "2025-01-23", "duration": 2700, "dayOfWeek": "周四" },
      { "date": "2025-01-24", "duration": 3000, "dayOfWeek": "周五" },
      { "date": "2025-01-25", "duration": 2160, "dayOfWeek": "周六" },
      { "date": "2025-01-26", "duration": 1800, "dayOfWeek": "周日" }
    ]
  }
}
```

**Response (总统计):** `200 OK`
```json
{
  "data": {
    "dimension": "total",
    "summary": {
      "totalDuration": 432000,
      "totalDays": 280,
      "currentStreak": 15,
      "longestStreak": 45,
      "booksRead": 120,
      "booksFinished": 52
    }
  }
}
```

**Response (日历视图):** `200 OK`
```json
{
  "data": {
    "dimension": "calendar",
    "year": 2025,
    "month": 1,
    "calendarDays": [
      { "date": "2025-01-01", "duration": 3600, "hasReading": true },
      { "date": "2025-01-02", "duration": 0, "hasReading": false }
    ],
    "milestones": [
      {
        "id": 1,
        "date": "2025-01-15",
        "type": "finished_book",
        "title": "读完了《活着》",
        "value": null,
        "bookTitle": "活着"
      },
      {
        "id": 2,
        "date": "2025-01-10",
        "type": "streak_days",
        "title": "连续阅读100天",
        "value": 100,
        "bookTitle": null
      }
    ]
  }
}
```

#### Get Milestones (获取阅读里程碑)

```http
GET /api/user/milestones
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 20 | 返回数量 |
| `year` | integer | - | 筛选年份 |

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "type": "finished_book",
      "date": "2025-01-15",
      "title": "读完了《活着》",
      "description": null,
      "value": null,
      "book": {
        "id": 1,
        "title": "活着",
        "type": "ebook"
      }
    },
    {
      "id": 2,
      "type": "streak_days",
      "date": "2025-01-10",
      "title": "连续阅读100天",
      "description": "坚持阅读，收获满满",
      "value": 100,
      "book": null
    },
    {
      "id": 3,
      "type": "total_hours",
      "date": "2025-01-05",
      "title": "累计阅读1000小时",
      "description": null,
      "value": 1000,
      "book": null
    }
  ]
}
```

---

### Weekly Leaderboard (周排行榜)

#### Get Leaderboard (获取排行榜)

```http
GET /api/social/leaderboard
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | string | friends | friends / all |
| `week` | string | 本周 | 周开始日期 (YYYY-MM-DD) |

**Response:** `200 OK`
```json
{
  "data": {
    "weekRange": {
      "start": "2025-01-20",
      "end": "2025-01-26",
      "settlementTime": "2025-01-26T23:59:59Z"
    },
    "myRanking": {
      "rank": 42,
      "duration": 17460,
      "rankChange": 5,
      "readingDays": 7
    },
    "entries": [
      {
        "rank": 1,
        "user": {
          "id": 10,
          "username": "bookworm",
          "avatar": "https://..."
        },
        "duration": 126000,
        "readingDays": 7,
        "rankChange": 0,
        "likesCount": 25,
        "isLiked": false
      },
      {
        "rank": 2,
        "user": {
          "id": 11,
          "username": "reader2",
          "avatar": "https://..."
        },
        "duration": 108000,
        "readingDays": 7,
        "rankChange": 2,
        "likesCount": 18,
        "isLiked": true
      }
    ],
    "totalParticipants": 1250
  }
}
```

#### Like Leaderboard User (点赞排行榜用户)

```http
POST /api/social/leaderboard/{targetUserId}/like
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "data": {
    "success": true
  }
}
```

**Error Response:** `400 Bad Request`
```json
{
  "error": {
    "code": "LIKE_ERROR",
    "message": "Already liked this user this week"
  }
}
```

---

### Badges (勋章系统)

勋章系统根据用户阅读数据自动检测并授予勋章，包括连续阅读、阅读时长、读完书籍等类别。

#### Get User Badges (获取用户勋章)

```http
GET /api/user/badges
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "data": {
    "earned": [
      {
        "id": 1,
        "category": "reading_streak",
        "level": 3,
        "name": "连续阅读180天",
        "description": null,
        "requirement": "连续阅读180天",
        "iconUrl": "/badges/streak_180.png",
        "backgroundColor": "#FFD700",
        "earnedAt": "2025-01-01T00:00:00Z",
        "earnedCount": 5000
      }
    ],
    "inProgress": [
      {
        "badge": {
          "id": 2,
          "category": "reading_streak",
          "level": 4,
          "name": "连续阅读365天",
          "description": null,
          "requirement": "连续阅读365天",
          "iconUrl": "/badges/streak_365.png",
          "backgroundColor": "#FFD700",
          "earnedCount": 1000
        },
        "progress": {
          "current": 180,
          "target": 365,
          "percentage": 49.3,
          "remaining": "再阅读185天可得"
        }
      }
    ],
    "categories": {
      "reading_streak": { "earned": 3, "total": 6 },
      "reading_duration": { "earned": 2, "total": 6 },
      "books_finished": { "earned": 4, "total": 6 }
    }
  }
}
```

#### Get All Badges (获取所有勋章)

```http
GET /api/badges
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "data": {
    "reading_streak": [
      {
        "id": 1,
        "category": "reading_streak",
        "level": 1,
        "name": "连续阅读7天",
        "requirement": "连续阅读7天",
        "conditionType": "streak_days",
        "conditionValue": 7,
        "earnedCount": 50000
      },
      {
        "id": 2,
        "category": "reading_streak",
        "level": 2,
        "name": "连续阅读30天",
        "requirement": "连续阅读30天",
        "conditionType": "streak_days",
        "conditionValue": 30,
        "earnedCount": 20000
      }
    ],
    "reading_duration": [...],
    "books_finished": [...]
  }
}
```

#### Get Badge Details (获取勋章详情)

```http
GET /api/badges/{badgeId}
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "data": {
    "id": 1,
    "category": "reading_streak",
    "level": 1,
    "name": "连续阅读7天",
    "description": "坚持阅读的第一步",
    "requirement": "连续阅读7天",
    "iconUrl": "/badges/streak_7.png",
    "backgroundColor": "#4CAF50",
    "earnedCount": 50000
  }
}
```

#### Check and Award Badges (检查并授予勋章)

```http
POST /api/badges/check
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "data": {
    "newBadges": [
      {
        "id": 3,
        "category": "reading_streak",
        "level": 3,
        "name": "连续阅读90天",
        "requirement": "连续阅读90天",
        "iconUrl": "/badges/streak_90.png",
        "backgroundColor": "#FFD700",
        "earnedAt": "2025-01-22T10:00:00Z",
        "earnedCount": 8001
      }
    ]
  }
}
```

#### Initialize Default Badges (初始化勋章 - 管理员)

```http
POST /api/badges/init
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "data": {
    "message": "Badges initialized successfully"
  }
}
```

---

## SDK Generation

The OpenAPI spec can be used to generate type-safe clients:

```bash
# TypeScript
openapi-generator-cli generate \
  -i https://booklibrio-api.fly.dev/api/openapi.json \
  -g typescript-fetch \
  -o ./api-client

# Kotlin
openapi-generator-cli generate \
  -i https://booklibrio-api.fly.dev/api/openapi.json \
  -g kotlin \
  -o ./api-client-kotlin

# Swift
openapi-generator-cli generate \
  -i https://booklibrio-api.fly.dev/api/openapi.json \
  -g swift5 \
  -o ./api-client-swift
```
