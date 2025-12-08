# API Reference

## Overview

BookPost API is a RESTful API built with Hono and documented using OpenAPI 3.1 specification. All endpoints return JSON responses.

**Base URL:** `https://bookpost-api.fly.dev`

**OpenAPI Spec:** `https://bookpost-api.fly.dev/api/openapi.json`

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
      "cover_url": "https://r2.bookpost.app/covers/ebooks/1.jpg",
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
    "cover_url": "https://r2.bookpost.app/covers/ebooks/1.jpg",
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
      "cover_url": "https://r2.bookpost.app/covers/magazines/1.jpg",
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
    "cover_url": "https://r2.bookpost.app/covers/magazines/1.jpg",
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

## SDK Generation

The OpenAPI spec can be used to generate type-safe clients:

```bash
# TypeScript
openapi-generator-cli generate \
  -i https://bookpost-api.fly.dev/api/openapi.json \
  -g typescript-fetch \
  -o ./api-client

# Kotlin
openapi-generator-cli generate \
  -i https://bookpost-api.fly.dev/api/openapi.json \
  -g kotlin \
  -o ./api-client-kotlin

# Swift
openapi-generator-cli generate \
  -i https://bookpost-api.fly.dev/api/openapi.json \
  -g swift5 \
  -o ./api-client-swift
```
