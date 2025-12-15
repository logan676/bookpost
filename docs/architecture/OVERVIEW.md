# BookLibrio System Architecture

## Overview

BookLibrio is a comprehensive multi-platform reading platform combining digital books (EPUB/PDF), audiobooks (AI-powered TTS), magazines, and social reading features. The system supports web, mobile (React Native), and native iOS/Android applications with full feature parity.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                   │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────────────────┤
│   Web App   │   Mobile    │  Android    │    iOS      │    Apple Watch      │
│   (React)   │    (RN)     │  (Kotlin)   │   (Swift)   │    (Future)         │
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
│  │  /auth      - Authentication & User Management                       │   │
│  │  /ebooks    - Ebook CRUD, File Serving, Text Extraction              │   │
│  │  /magazines - Magazine CRUD, Page Rendering                          │   │
│  │  /books     - Book Details, Reviews, Highlights, AI Guide            │   │
│  │  /bookshelf - User Bookshelf Management                              │   │
│  │  /ai        - AI Q&A, Lookup, Translation, TTS Generation            │   │
│  │  /social    - Friends, Thoughts, Topics, Leaderboard                 │   │
│  │  /user      - Profile, Statistics, Badges, Milestones                │   │
│  │  /membership- Plans, Subscription, Redemption                        │   │
│  │  /categories- Book Categories & Rankings                             │   │
│  │  /reading-history - Progress Tracking & Sync                         │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          ▼                      ▼                      ▼
┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│     DATA LAYER       │ │   STORAGE LAYER      │ │  EXTERNAL SERVICES   │
│ Supabase PostgreSQL  │ │   Cloudflare R2      │ │                      │
├──────────────────────┤ ├──────────────────────┤ ├──────────────────────┤
│ • User accounts      │ │ • Ebook files        │ │ • Claude API         │
│ • Books metadata     │ │ • Magazine PDFs      │ │   - AI Q&A           │
│ • Highlights/Notes   │ │ • Cover images       │ │   - Translation      │
│ • Social data        │ │ • Avatar uploads     │ │   - Text extraction  │
│ • Reading history    │ │ • Thought images     │ │   - Book recognition │
│ • Badges/Achievements│ │ • Generated audio    │ │ • Google Books API   │
│ • Membership data    │ │ • No egress fees     │ │ • TTS Services       │
└──────────────────────┘ └──────────────────────┘ └──────────────────────┘
```

## Technology Stack

### Client Applications

| Platform | Technology | Hosting | Key Features |
|----------|------------|---------|--------------|
| Web | React + Vite + TypeScript | Vercel | epub.js for EPUB, PDF.js for PDF |
| Mobile (Cross-platform) | React Native + Expo | App Stores | WebView-based readers |
| Android Native | Kotlin + Compose | Play Store | Native PDF reader |
| iOS Native | Swift + SwiftUI | App Store | PDFKit, ReadiumKit for EPUB |

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
| Claude API | AI Q&A, translation, OCR, book recognition, text summarization |
| Google Books API | Book metadata lookup |
| Open Library API | Fallback metadata source |
| TTS Services | AI voice generation for audiobooks |

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
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     users       │     │     ebooks      │     │   magazines     │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id              │     │ id              │     │ id              │
│ email           │     │ title           │     │ title           │
│ password        │     │ author          │     │ publisher_id    │
│ username        │     │ file_path       │     │ file_path       │
│ avatar          │     │ cover_url       │     │ cover_url       │
│ gender          │     │ category_id     │     │ issue_date      │
│ total_duration  │     │ word_count      │     └─────────────────┘
│ reading_days    │     │ recommend_score │
│ is_admin        │     │ readers_count   │
│ created_at      │     │ payment_type    │
└─────────────────┘     └─────────────────┘
        │                       │
        ├───────────────────────┼────────────────────────────┐
        │                       │                            │
        ▼                       ▼                            ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  user_bookshelf │     │ebook_underlines │     │  book_reviews   │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ user_id         │     │ id              │     │ book_id         │
│ book_id         │     │ ebook_id        │     │ user_id         │
│ book_type       │     │ user_id         │     │ rating          │
│ progress        │     │ text            │     │ content         │
│ is_downloaded   │     │ cfi_range       │     │ likes_count     │
│ added_at        │     │ visibility      │     └─────────────────┘
└─────────────────┘     │ style, color    │
                        └─────────────────┘
        │                       │
        ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│ reading_history │     │  ebook_ideas    │
├─────────────────┤     │  (thoughts)     │
│ user_id         │     ├─────────────────┤
│ book_id         │     │ underline_id    │
│ book_type       │     │ user_id         │
│ progress        │     │ content         │
│ last_position   │     │ visibility      │
│ duration_secs   │     │ likes           │
│ last_read_at    │     └─────────────────┘
└─────────────────┘
```

### Social & Gamification Entities

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    thoughts     │     │  user_follows   │     │     badges      │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id              │     │ follower_id     │     │ id              │
│ user_id         │     │ following_id    │     │ category        │
│ content         │     │ created_at      │     │ level           │
│ book_id         │     └─────────────────┘     │ name            │
│ visibility      │                             │ requirement     │
│ likes_count     │     ┌─────────────────┐     │ target_value    │
│ created_at      │     │   user_badges   │     └─────────────────┘
└─────────────────┘     ├─────────────────┤
        │               │ user_id         │
        ▼               │ badge_id        │
┌─────────────────┐     │ earned_at       │
│ thought_topics  │     └─────────────────┘
├─────────────────┤
│ thought_id      │     ┌─────────────────┐
│ topic_id        │     │reading_statistics│
└─────────────────┘     ├─────────────────┤
                        │ user_id         │
┌─────────────────┐     │ date            │
│     topics      │     │ duration_secs   │
├─────────────────┤     │ books_read      │
│ id              │     └─────────────────┘
│ name            │
│ category        │
│ post_count      │
│ is_hot, is_new  │
└─────────────────┘
```

### Membership & Categories

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│membership_plans │     │user_memberships │     │book_categories  │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id              │     │ user_id         │     │ id              │
│ type            │     │ plan_id         │     │ name            │
│ price           │     │ start_date      │     │ parent_id       │
│ duration_months │     │ end_date        │     │ sort_order      │
│ is_recommended  │     │ is_auto_renew   │     │ icon_url        │
└─────────────────┘     └─────────────────┘     └─────────────────┘

┌─────────────────┐     ┌─────────────────────┐
│  book_rankings  │     │ book_ranking_items  │
├─────────────────┤     ├─────────────────────┤
│ id              │     │ ranking_id          │
│ type            │     │ book_id             │
│ theme_color     │     │ rank                │
│ updated_at      │     │ updated_at          │
└─────────────────┘     └─────────────────────┘
```

### Additional Content Types

- **Notes**: User-created articles with underlines and ideas
- **Audio/Lectures/Speeches**: Audio content with series grouping
- **Movies/TV Shows/Documentaries/Animation**: Video content
- **AI Conversations**: Chat history for AI Q&A feature
- **Popular Highlights**: Aggregated highlight statistics

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
R2_BUCKET_NAME=booklibrio

# Auth
JWT_SECRET=your-secret-key

# External APIs
ANTHROPIC_API_KEY=xxx
GOOGLE_BOOKS_API_KEY=xxx
```

### Web App (Vercel)

```bash
VITE_API_URL=https://booklibrio-api.fly.dev
```

### Mobile App

Configured in app config or environment:
```typescript
const API_URL = 'https://booklibrio-api.fly.dev/api'
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

## Feature Modules

### Core Reading Features

| Feature | Description | API Endpoints |
|---------|-------------|---------------|
| Book Store | Categories, rankings, recommendations | `/categories`, `/rankings`, `/recommendations` |
| Book Details | Full info, AI guide, reviews, related | `/books/{id}/detail`, `/books/{id}/ai-guide` |
| Bookshelf | Personal library management | `/bookshelf` |
| Reader | EPUB/PDF reading with highlights | `/ebooks/{id}/file`, `/books/{id}/highlights` |
| Audiobooks | AI-powered text-to-speech | `/ai/voices`, `/ai/generate-audio` |
| Reading Progress | Cross-device sync | `/reading-history` |

### AI Features

| Feature | Description | API Endpoints |
|---------|-------------|---------------|
| AI Q&A | Ask questions about books | `/ai/ask-book` |
| AI Lookup | Word/phrase definitions | `/ai/lookup` |
| AI Guide | Book summaries and outlines | `/books/{id}/ai-guide` |
| AI Translation | Real-time text translation | `/ai/translate` |
| AI Narration | Text-to-speech generation | `/ai/generate-audio` |

### Social Features

| Feature | Description | API Endpoints |
|---------|-------------|---------------|
| Friends Activity | Reading updates from friends | `/social/friends-activity` |
| Thoughts | Share reading thoughts | `/social/thoughts` |
| Topics | Hashtag-based discussions | `/social/topics` |
| Leaderboard | Weekly reading rankings | `/social/leaderboard` |
| Following | User relationships | `/social/follow` |

### Gamification

| Feature | Description | API Endpoints |
|---------|-------------|---------------|
| Badges | Achievement system | `/user/badges` |
| Statistics | Reading analytics | `/user/statistics` |
| Milestones | Reading achievements | `/user/milestones` |

### Membership

| Feature | Description | API Endpoints |
|---------|-------------|---------------|
| Plans | Subscription options | `/membership/plans` |
| Benefits | Member privileges | `/membership/status` |
| Redemption | Code activation | `/membership/redeem` |

## Related Documentation

- [iOS Client Architecture](../IOS_CLIENT_ARCHITECTURE.md) - Complete iOS native app design
- [Migration Plan](../MIGRATION_PLAN.md) - Step-by-step migration guide
- [AI Features](./AI_FEATURES.md) - AI integration architecture
- [File Handling](./FILE_HANDLING.md) - File download and display
- [API Reference](./API_REFERENCE.md) - API endpoints and schemas
- [Ebook Reader](../ebook-reader.md) - EPUB reader implementation
- [Magazine Reader](../magazine-reader.md) - PDF reader implementation
