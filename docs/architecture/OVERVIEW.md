# BookPost System Architecture

## Overview

BookPost is a multi-platform personal content library for managing and reading ebooks, magazines, notes, and multimedia content. The system supports web, mobile (React Native), and native iOS/Android applications.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                   │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────────────────┤
│   Web App   │   Mobile    │  Android    │    iOS      │      Future         │
│   (React)   │    (RN)     │  (Kotlin)   │   (Swift)   │    Clients          │
│   Vercel    │   Expo      │   Native    │   Native    │                     │
└──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴──────────┬──────────┘
       │             │             │             │                 │
       │         Auto-Generated Type-Safe API Clients              │
       │              (from OpenAPI Specification)                 │
       └─────────────────────────┬─────────────────────────────────┘
                                 │ HTTPS
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                      │
│                         Hono + OpenAPI (Fly.io)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   OpenAPI   │  │  JWT Auth   │  │  Middleware │  │   Request Logging   │ │
│  │    Spec     │  │             │  │   Stack     │  │   & Monitoring      │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         Route Handlers                               │   │
│  │  /auth  /ebooks  /magazines  /notes  /ai  /reading-history  ...     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                ┌────────────────┴────────────────┐
                ▼                                 ▼
┌───────────────────────────────┐   ┌───────────────────────────────┐
│        DATA LAYER             │   │       STORAGE LAYER           │
│   Supabase PostgreSQL         │   │     Cloudflare R2             │
├───────────────────────────────┤   ├───────────────────────────────┤
│  • Managed PostgreSQL         │   │  • Ebook files (EPUB/PDF)     │
│  • Dashboard for debugging    │   │  • Magazine PDFs              │
│  • Automatic backups          │   │  • Cover images               │
│  • Connection pooling         │   │  • Audio/Video files          │
│  • Row Level Security         │   │  • No egress fees             │
└───────────────────────────────┘   └───────────────────────────────┘
                │
                ▼
┌───────────────────────────────┐
│      EXTERNAL SERVICES        │
├───────────────────────────────┤
│  • Claude API (AI features)   │
│  • Google Books API           │
│  • Open Library API           │
└───────────────────────────────┘
```

## Technology Stack

### Client Applications

| Platform | Technology | Hosting |
|----------|------------|---------|
| Web | React + Vite + TypeScript | Vercel |
| Mobile (Cross-platform) | React Native + Expo | App Stores |
| Android Native | Kotlin | Play Store |
| iOS Native | Swift | App Store |

### Backend

| Component | Technology | Purpose |
|-----------|------------|---------|
| API Framework | Hono | Fast, lightweight, TypeScript-first |
| API Spec | OpenAPI 3.1 | Auto-generate client SDKs |
| Database ORM | Drizzle | Type-safe PostgreSQL queries |
| Hosting | Fly.io | Global deployment, SSH debug access |

### Data & Storage

| Service | Technology | Purpose |
|---------|------------|---------|
| Database | Supabase PostgreSQL | Relational data, easy debugging |
| Object Storage | Cloudflare R2 | Media files, no egress fees |

### External APIs

| Service | Purpose |
|---------|---------|
| Claude API | AI features (translation, OCR, recognition) |
| Google Books API | Book metadata lookup |
| Open Library API | Fallback metadata source |

## Key Design Principles

### 1. API-First Development
- OpenAPI specification is the source of truth
- All clients use auto-generated SDKs
- Type-safe from API to UI

### 2. Multi-Platform Ready
- Single API serves all client platforms
- Generated clients for TypeScript, Kotlin, Swift
- Consistent behavior across platforms

### 3. Debug-Friendly
- Supabase dashboard for data inspection
- Fly.io SSH access for server debugging
- Structured logging with request tracing

### 4. Cost-Effective Storage
- Cloudflare R2 has zero egress fees
- Critical for serving large media files
- S3-compatible for easy migration

## Data Flow

### Read Operation (e.g., List Ebooks)

```
Client App
    │
    │ 1. api.ebooks.list({ category: 'fiction' })
    ▼
Generated API Client
    │
    │ 2. GET /api/ebooks?category=fiction
    ▼
Hono API Server (Fly.io)
    │
    │ 3. Validate request, check auth
    │ 4. Query database via Drizzle
    ▼
Supabase PostgreSQL
    │
    │ 5. Return rows
    ▼
Hono API Server
    │
    │ 6. Format response per OpenAPI schema
    ▼
Client App
    │
    │ 7. Type-safe Ebook[] response
    ▼
UI Render
```

### File Download (e.g., Ebook PDF)

```
Client App
    │
    │ 1. api.ebooks.downloadFile(ebookId)
    ▼
Hono API Server
    │
    │ 2. Lookup file path in database
    │ 3. Generate signed R2 URL or stream
    ▼
Cloudflare R2
    │
    │ 4. Return file stream
    ▼
Client App
    │
    │ 5. Render in reader component
    ▼
User reads content
```

## Database Schema Overview

### Core Entities

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   users     │     │   ebooks    │     │  magazines  │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ id          │     │ id          │     │ id          │
│ email       │     │ title       │     │ title       │
│ password    │     │ author      │     │ publisher_id│
│ is_admin    │     │ file_path   │     │ file_path   │
│ created_at  │     │ cover_url   │     │ cover_url   │
└─────────────┘     │ category_id │     │ issue_date  │
                    └─────────────┘     └─────────────┘
        │                   │                   │
        │                   ▼                   ▼
        │           ┌─────────────┐     ┌─────────────┐
        │           │ebook_under- │     │magazine_    │
        │           │   lines     │     │ underlines  │
        │           └─────────────┘     └─────────────┘
        │                   │                   │
        │                   ▼                   ▼
        │           ┌─────────────┐     ┌─────────────┐
        │           │ebook_ideas  │     │magazine_    │
        │           │             │     │   ideas     │
        │           └─────────────┘     └─────────────┘
        │
        └──────────────────┐
                           ▼
                   ┌─────────────┐
                   │  reading_   │
                   │  history    │
                   ├─────────────┤
                   │ user_id     │
                   │ ebook_id    │
                   │ magazine_id │
                   │ progress    │
                   │ last_read   │
                   └─────────────┘
```

### Additional Content Types

- **Notes**: User-created articles with underlines and ideas
- **Audio/Lectures/Speeches**: Audio content with series grouping
- **Movies/TV Shows/Documentaries/Animation**: Video content
- **NBA**: Sports content

## Authentication Flow

```
┌─────────────┐                    ┌─────────────┐
│   Client    │                    │  API Server │
└──────┬──────┘                    └──────┬──────┘
       │                                  │
       │ 1. POST /api/auth/login          │
       │    { email, password }           │
       │─────────────────────────────────>│
       │                                  │
       │                    2. Validate credentials
       │                    3. Generate JWT tokens
       │                                  │
       │ 4. { accessToken, refreshToken } │
       │<─────────────────────────────────│
       │                                  │
       │ 5. Store tokens                  │
       │                                  │
       │ 6. GET /api/ebooks               │
       │    Authorization: Bearer {token} │
       │─────────────────────────────────>│
       │                                  │
       │                    7. Verify JWT
       │                    8. Process request
       │                                  │
       │ 9. { data: [...] }               │
       │<─────────────────────────────────│
```

## Environment Configuration

### API Server (Fly.io)

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Storage
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=bookpost

# Auth
JWT_SECRET=your-secret-key

# External APIs
ANTHROPIC_API_KEY=xxx
GOOGLE_BOOKS_API_KEY=xxx
```

### Web App (Vercel)

```bash
VITE_API_URL=https://bookpost-api.fly.dev
```

### Mobile App

Configured in app config or environment:
```typescript
const API_URL = 'https://bookpost-api.fly.dev/api'
```

## Deployment Architecture

```
                    ┌─────────────────────────┐
                    │      DNS/CDN            │
                    │   (Cloudflare)          │
                    └───────────┬─────────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   Web App       │   │   API Server    │   │   R2 Storage    │
│   (Vercel)      │   │   (Fly.io)      │   │   (Cloudflare)  │
│                 │   │                 │   │                 │
│ • Auto-scaling  │   │ • Tokyo region  │   │ • Global CDN    │
│ • Edge CDN      │   │ • Auto-restart  │   │ • No egress $   │
│ • Preview URLs  │   │ • SSH access    │   │                 │
└─────────────────┘   └────────┬────────┘   └─────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Supabase           │
                    │  PostgreSQL         │
                    │                     │
                    │  • Dashboard UI     │
                    │  • Auto backups     │
                    │  • Connection pool  │
                    └─────────────────────┘
```

## Related Documentation

- [Migration Plan](../MIGRATION_PLAN.md) - Step-by-step migration guide
- [AI Features](./AI_FEATURES.md) - AI integration architecture
- [File Handling](./FILE_HANDLING.md) - File download and display
- [API Reference](./API_REFERENCE.md) - API endpoints and schemas
