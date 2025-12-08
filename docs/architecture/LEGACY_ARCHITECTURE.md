# BookPost Architecture

## Overview

BookPost is a multi-platform application for managing and reading ebooks and magazines. The system consists of mobile apps, a web application, and a cloud-hosted backend server.

## System Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   Mobile App    │     │    Web App      │
│  (iOS/Android)  │     │   (React/Vite)  │
│                 │     │                 │
│  Expo/React     │     │  Hosted on      │
│  Native         │     │  Vercel         │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │    HTTPS Requests     │
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
    ┌────────────────────────────────────┐
    │         Railway Server             │
    │  bookpost-api-production.up.       │
    │         railway.app                │
    │                                    │
    │  ┌──────────────────────────────┐  │
    │  │     Express.js API Server    │  │
    │  │                              │  │
    │  │  - Authentication (JWT)      │  │
    │  │  - Ebooks API                │  │
    │  │  - Magazines API             │  │
    │  │  - Notes API                 │  │
    │  │  - R2 Storage Proxy          │  │
    │  └──────────────────────────────┘  │
    │                                    │
    │  ┌──────────────────────────────┐  │
    │  │   Background Task Queue      │  │
    │  │                              │  │
    │  │  - Metadata extraction       │  │
    │  │  - Google Books API          │  │
    │  │  - Open Library API          │  │
    │  └──────────────────────────────┘  │
    └────────────────┬───────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │ Cloudflare R2   │
│   (Railway)     │    │   (Storage)     │
│                 │    │                 │
│  - Users        │    │  - Ebook files  │
│  - Sessions     │    │  - Magazine PDFs│
│  - Ebooks       │    │  - Cover images │
│  - Magazines    │    │  - Page images  │
│  - Notes        │    │                 │
│  - Reading      │    │                 │
│    History      │    │                 │
└─────────────────┘    └─────────────────┘
```

## Cloud Services

### Railway (Backend Hosting)

- **Service**: Railway.app
- **URL**: `https://bookpost-api-production.up.railway.app`
- **Components**:
  - Node.js Express API Server
  - PostgreSQL Database (managed by Railway)
  - Background Task Queue for metadata extraction

### Cloudflare R2 (File Storage)

- **Service**: Cloudflare R2 Object Storage
- **Purpose**: Store binary files (ebooks, PDFs, images)
- **Access**: Proxied through the API server

### Vercel (Web App Hosting)

- **Service**: Vercel
- **Purpose**: Host the React web application
- **Configuration**: API requests are proxied to Railway server

## Data Flow

### 1. Client Request Flow

```
Mobile/Web App
      │
      │ 1. HTTP Request (e.g., GET /api/ebooks)
      ▼
Railway Server
      │
      │ 2. Query Database
      ▼
PostgreSQL
      │
      │ 3. Return Data
      ▼
Railway Server
      │
      │ 4. JSON Response
      ▼
Mobile/Web App
```

### 2. File Download Flow

```
Mobile/Web App
      │
      │ 1. Request file (e.g., GET /api/ebooks/1/file)
      ▼
Railway Server
      │
      │ 2. Generate signed URL or proxy request
      ▼
Cloudflare R2
      │
      │ 3. Return file binary
      ▼
Railway Server
      │
      │ 4. Stream to client
      ▼
Mobile/Web App
```

### 3. Background Metadata Extraction

```
Server Startup
      │
      │ 1. Check for items needing metadata
      ▼
Background Task Queue
      │
      │ 2. For each item, fetch from external APIs
      ▼
┌─────┴─────┐
│           │
▼           ▼
Google    Open Library
Books API    API
│           │
│ 3. Return │
│   metadata│
└─────┬─────┘
      │
      │ 4. Update database
      ▼
PostgreSQL
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login and get token
- `POST /api/auth/logout` - Invalidate session
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user

### Ebooks
- `GET /api/ebooks` - List all ebooks
- `GET /api/ebooks/:id` - Get ebook details
- `GET /api/ebooks/:id/file` - Download ebook file
- `GET /api/ebooks/:id/text` - Get ebook text content
- `GET /api/ebook-categories` - List categories

### Magazines
- `GET /api/magazines` - List all magazines
- `GET /api/magazines/:id` - Get magazine details
- `GET /api/magazines/:id/pdf` - Download PDF
- `GET /api/magazines/:id/page/:num` - Get page image
- `GET /api/publishers` - List publishers

### Notes
- `GET /api/notes` - List notes
- `POST /api/notes` - Create note
- `GET /api/notes/:id/content` - Get note content
- `POST /api/notes/:id/underlines` - Add underline
- `GET /api/notes/years` - Get years with notes

### Reading History
- `GET /api/reading-history` - Get reading history
- `POST /api/reading-history` - Save reading progress
- `GET /api/reading-history/:type/:id` - Get progress for item

## Database Schema

### Core Tables
- `users` - User accounts
- `sessions` - Authentication sessions
- `ebooks` - Ebook metadata
- `ebook_categories` - Ebook categorization
- `magazines` - Magazine metadata
- `publishers` - Magazine publishers
- `notes` - User notes
- `note_underlines` - Text underlines in notes
- `note_ideas` - Ideas attached to underlines
- `reading_history` - Track reading progress

## Environment Variables

### Server (Railway)
```
DATABASE_URL=postgresql://...        # Railway PostgreSQL connection
R2_ACCOUNT_ID=...                    # Cloudflare account ID
R2_ACCESS_KEY_ID=...                 # R2 access key
R2_SECRET_ACCESS_KEY=...             # R2 secret key
R2_BUCKET_NAME=...                   # R2 bucket name
GOOGLE_BOOKS_API_KEY=...             # (Optional) Google Books API
JWT_SECRET=...                       # JWT signing secret
```

### Web App (Vercel)
```
API_URL=https://bookpost-api-production.up.railway.app
```

### Mobile App
Configured in `packages/mobile/src/services/api.ts`:
```typescript
const PRODUCTION_API_URL = 'https://bookpost-api-production.up.railway.app/api'
```

## Local Development

### Running Locally

1. **Server** (uses SQLite locally):
   ```bash
   cd packages/server
   npm run dev
   ```

2. **Mobile App**:
   ```bash
   cd packages/mobile
   npx expo start
   ```

3. **Web App**:
   ```bash
   cd packages/web
   npm run dev
   ```

### Switching to Local Server (Mobile)

Edit `packages/mobile/src/services/api.ts` and uncomment:
```typescript
// return `http://${debuggerHost}:3001/api`
```

## Deployment

### Server (Railway)
- Automatic deployment on git push to `main` branch
- Railway builds using Nixpacks
- Start command: `node src/index.js`

### Web App (Vercel)
- Automatic deployment on git push
- Set `API_URL` environment variable in Vercel dashboard

## Background Tasks

The server runs background tasks for metadata enrichment:

1. **On Startup**: Scans database for items missing metadata
2. **Processing**: Fetches data from Google Books and Open Library APIs
3. **Rate Limiting**: 1 second delay between API calls to avoid throttling
4. **Fallback**: If Google Books fails, tries Open Library

### Extracted Metadata
- Book title, author, description
- ISBN, publisher, publication date
- Cover image URLs
- Page count, categories

### Task Queue Monitoring
- `GET /api/tasks/status` - Get current queue status
- `POST /api/tasks/pause` - Pause queue (admin only)
- `POST /api/tasks/resume` - Resume queue (admin only)

## AI Features

### Book Recognition (Photo Scan)

The mobile app supports taking photos of book covers or book excerpt pages to identify books and extract text.

```
Mobile App                    Server                      External APIs
    │                           │                              │
    │ 1. Take photo             │                              │
    │ ─────────────────────────>│                              │
    │                           │                              │
    │ 2. POST /api/ai/recognize │                              │
    │ ─────────────────────────>│                              │
    │                           │ 3. Send image to Claude API  │
    │                           │ ────────────────────────────>│
    │                           │                              │
    │                           │ 4. Return book info/text     │
    │                           │ <────────────────────────────│
    │                           │                              │
    │ 5. Return recognition     │                              │
    │    result                 │                              │
    │ <─────────────────────────│                              │
```

**Features:**
- Book cover recognition - identifies book title, author, ISBN
- Book excerpt OCR - extracts text from photographed pages
- Automatic book metadata lookup after recognition

**API Endpoints:**
- `POST /api/ai/recognize-book` - Recognize book from cover photo
- `POST /api/ai/extract-text` - Extract text from book page photo

### AI Translation

The app provides AI-powered translation for ebooks and magazines content.

```
Client                        Server                      Claude API
    │                           │                              │
    │ 1. Select text            │                              │
    │ ─────────────────────────>│                              │
    │                           │                              │
    │ 2. POST /api/ai/translate │                              │
    │ ─────────────────────────>│                              │
    │                           │ 3. Request translation       │
    │                           │ ────────────────────────────>│
    │                           │                              │
    │                           │ 4. Return translated text    │
    │                           │ <────────────────────────────│
    │                           │                              │
    │ 5. Display translation    │                              │
    │ <─────────────────────────│                              │
```

**Features:**
- Translate selected text to target language
- Support multiple target languages
- Context-aware translation preserving meaning

**API Endpoints:**
- `POST /api/ai/translate` - Translate text with body `{ text, targetLanguage }`

**Environment Variables:**
```
ANTHROPIC_API_KEY=...         # Claude API key for AI features
```

## File Download and Display

### Ebook File Flow

```
Client                        Server                      R2 Storage
    │                           │                              │
    │ 1. GET /api/ebooks/:id    │                              │
    │ ─────────────────────────>│ Query metadata               │
    │                           │──────────────>               │
    │ 2. Return ebook metadata  │               │              │
    │ <─────────────────────────│<──────────────               │
    │                           │                              │
    │ 3. GET /api/ebooks/:id/   │                              │
    │    file                   │                              │
    │ ─────────────────────────>│                              │
    │                           │ 4. Fetch file from R2        │
    │                           │ ────────────────────────────>│
    │                           │                              │
    │                           │ 5. Return file stream        │
    │                           │ <────────────────────────────│
    │                           │                              │
    │ 6. Stream EPUB/PDF to     │                              │
    │    client                 │                              │
    │ <─────────────────────────│                              │
    │                           │                              │
    │ 7. Render in reader       │                              │
```

**Supported Formats:**
- EPUB (rendered with epub.js on web, react-native-webview on mobile)
- PDF (rendered with pdf.js on web, native PDF viewer on mobile)

**Ebook Display Components:**
- `EbookReader.tsx` - Main reader component
- Supports pagination, font size adjustment, themes
- Tracks reading progress automatically

### Magazine Page Display

Magazines are stored as PDFs and rendered page-by-page as images for optimal mobile performance.

```
Client                        Server                      R2 Storage
    │                           │                              │
    │ 1. GET /api/magazines/:id │                              │
    │ ─────────────────────────>│                              │
    │ 2. Return magazine info   │                              │
    │    (including page_count) │                              │
    │ <─────────────────────────│                              │
    │                           │                              │
    │ 3. GET /api/magazines/:id/│                              │
    │    page/1                 │                              │
    │ ─────────────────────────>│                              │
    │                           │ 4. Extract page or fetch     │
    │                           │    cached image              │
    │                           │ ────────────────────────────>│
    │                           │                              │
    │ 5. Return page image      │                              │
    │    (JPEG)                 │                              │
    │ <─────────────────────────│                              │
    │                           │                              │
    │ 6. Display in viewer      │                              │
    │    (swipe for next page)  │                              │
```

**Magazine Display Features:**
- Page-by-page image rendering
- Pinch-to-zoom support
- Horizontal swipe navigation
- Page caching for offline reading
- Reading progress tracking

**Components:**
- `MagazineReader.tsx` - Magazine reader with page navigation
- `MagazinesDashboard.tsx` - Browse and filter magazines

## Web App Deployment

The web app is a React + Vite + TypeScript application that can be deployed to various cloud platforms.

### Current Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS v4
- **Routing**: React Router v7
- **State Management**: TanStack Query (React Query)

### Deployment Options

#### Option 1: Vercel (Recommended)

Vercel offers the simplest deployment with automatic CI/CD and optimized Vite support.

**Setup:**
1. Connect GitHub repository to Vercel
2. Set root directory to `packages/web`
3. Configure environment variable: `API_URL=https://bookpost-api-production.up.railway.app`
4. Deploy automatically on git push

**Configuration (vercel.json):**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "${API_URL}/api/:path*"
    }
  ]
}
```

**Pros:**
- Zero configuration for Vite projects
- Automatic HTTPS and CDN
- Preview deployments for PRs
- Generous free tier

**Deployment Commands:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from packages/web directory
cd packages/web
vercel --prod
```

#### Option 2: Cloudflare Pages

Cloudflare Pages provides fast global CDN and integrates well with existing Cloudflare R2 storage.

**Setup:**
1. Connect GitHub repository to Cloudflare Pages
2. Set build command: `npm run build`
3. Set output directory: `packages/web/dist`
4. Add environment variable: `API_URL`

**Configuration (_redirects file):**
```
/api/* https://bookpost-api-production.up.railway.app/api/:splat 200
```

**Pros:**
- Unlimited bandwidth on free tier
- Same provider as R2 storage
- Web Analytics included
- Edge Functions available

**Deployment Commands:**
```bash
# Install Wrangler CLI
npm i -g wrangler

# Deploy
cd packages/web
npm run build
wrangler pages deploy dist
```

#### Option 3: Netlify

Netlify offers similar features to Vercel with good Vite support.

**Setup:**
1. Connect GitHub repository to Netlify
2. Set base directory: `packages/web`
3. Set build command: `npm run build`
4. Set publish directory: `dist`

**Configuration (netlify.toml):**
```toml
[build]
  base = "packages/web"
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/api/*"
  to = "https://bookpost-api-production.up.railway.app/api/:splat"
  status = 200
```

**Pros:**
- Simple setup
- Form handling built-in
- Deploy previews
- Functions support

#### Option 4: Railway (Full Stack)

Deploy both frontend and backend on Railway for simplified infrastructure.

**Setup:**
1. Create new Railway service for web app
2. Set root directory to `packages/web`
3. Use Nixpacks or Dockerfile for build
4. Configure environment variables

**Pros:**
- Single platform for everything
- Simplified networking
- Easy environment management

**Cons:**
- Less optimized for static sites
- Higher cost for frontend hosting

### Recommended Approach: Vercel

For BookPost, Vercel is recommended because:

1. **Optimized for Vite** - Automatic configuration and optimization
2. **API Proxy** - Built-in rewrites for API requests to Railway backend
3. **Preview Deployments** - Each PR gets a unique URL for testing
4. **Analytics** - Basic analytics included free
5. **Cost** - Free tier is sufficient for personal projects

### Deployment Checklist

Before deploying the web app:

- [ ] Ensure `API_URL` environment variable is set
- [ ] Verify CORS settings on Railway server allow the web app domain
- [ ] Test build locally with `npm run build && npm run preview`
- [ ] Check that API proxy rewrites work correctly
- [ ] Enable HTTPS (automatic on all platforms)
- [ ] Set up custom domain if needed

### CORS Configuration

The Railway server must allow requests from the web app domain. Update `packages/server/src/index.js`:

```javascript
const corsOptions = {
  origin: [
    'http://localhost:5173',           // Local development
    'https://your-app.vercel.app',     // Production Vercel
    'https://your-domain.com'          // Custom domain
  ],
  credentials: true
}
```

### Environment Variables Summary

| Platform | Variable | Value |
|----------|----------|-------|
| Vercel | `API_URL` | `https://bookpost-api-production.up.railway.app` |
| Cloudflare | `API_URL` | `https://bookpost-api-production.up.railway.app` |
| Netlify | `API_URL` | `https://bookpost-api-production.up.railway.app` |
