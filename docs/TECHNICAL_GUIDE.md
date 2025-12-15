# BookLibrio Technical Guide

This document contains technical details for developers working on BookLibrio.

## Architecture

```
+-------------+     +-------------+     +---------+     +-------------+
|   Browser   | --> |   Vercel    | --> | Fly.io  | --> |  Supabase   |
|   (Web)     |     |   (CDN)     |     |  (API)  |     | (PostgreSQL)|
+-------------+     +-------------+     +---------+     +-------------+
                                             |
+-------------+                              |
|   Mobile    | -----------------------------+
| (React Native)                             |
+-------------+                              |
                                             |
+-------------+                              |
|   Android   | -----------------------------+
|   (Native)  |                              |
+-------------+                              |
                                             |
+-------------+                              |
|    iOS      | -----------------------------+
|   (Native)  |                              |
+-------------+                         +----+----+
                                        |   R2    |
                                        | (Files) |
                                        +---------+
```

| Component | Technology | Deployment |
|-----------|------------|------------|
| Web | React 18 + Vite + TailwindCSS | Vercel |
| API | Hono + Drizzle ORM | Fly.io |
| Mobile | React Native + Expo | App Store / Play Store |
| Android | Kotlin + Jetpack Compose | Play Store |
| iOS | Swift + SwiftUI | App Store |
| Database | PostgreSQL | Supabase |
| Storage | S3-compatible | Cloudflare R2 |

## Project Structure

```
booklibrio/
├── packages/
│   ├── web/           # React frontend (Vite)
│   ├── api/           # Hono backend
│   ├── mobile/        # React Native + Expo (cross-platform)
│   ├── android/       # Android Native (Kotlin + Compose)
│   ├── ios/           # iOS Native (Swift + SwiftUI)
│   └── shared/        # Shared types & utilities
├── docs/              # Documentation
├── scripts/           # Utility scripts
└── .github/workflows/ # CI/CD pipelines
```

## Tech Stack Details

### Web (`packages/web`)
- React 18 with TypeScript
- Vite for fast builds
- TailwindCSS v4 for styling
- React Router v7 for navigation
- TanStack Query for data fetching
- React Hook Form + Zod for forms

### API (`packages/api`)
- Hono (lightweight web framework)
- Drizzle ORM (type-safe queries)
- Zod for validation
- OpenAPI spec generation
- DeepSeek AI integration

### Android (`packages/android`)
- Kotlin + Jetpack Compose
- Material3 Design
- Hilt for dependency injection
- Retrofit + Kotlin Serialization
- Room for local caching
- Coil for image loading

### iOS (`packages/ios`)
- Swift + SwiftUI
- MVVM Architecture
- async/await concurrency
- PDFKit for PDF rendering
- URLSession for networking
- BookLibrio brand colors extension

### Mobile (`packages/mobile`)
- React Native 0.81 + Expo SDK 54
- TypeScript
- React Navigation 7
- WebView-based ebook reader
- Reading history sync
- Cross-platform (iOS & Android)

## Development Setup

### Prerequisites
- Node.js 18+
- npm (with workspaces support)

### 1. Clone and Install

```bash
git clone https://github.com/logan676/booklibrio.git
cd booklibrio
npm install
```

### 2. Configure Environment

```bash
# Copy environment template
cp packages/api/.env.example packages/api/.env

# Edit with your credentials
```

Required environment variables:

```bash
# Database (Supabase)
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres

# Cloudflare R2 Storage
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=booklibrio

# AI Features (DeepSeek)
DEEPSEEK_API_KEY=your_deepseek_api_key
```

### 3. Run Development Servers

```bash
# Start both API and web
npm run dev:all

# Or run separately
npm run dev:api   # API at http://localhost:3001
npm run dev       # Web at http://localhost:5173
```

### 4. Run Mobile Apps

**React Native (Expo) - Recommended for cross-platform:**
```bash
cd packages/mobile
npm install
npm start
```

**Native Apps:**
- [Android Setup Guide](../packages/android/README.md)
- [iOS Setup Guide](../packages/ios/README.md)
- [Mobile (React Native) Guide](../packages/mobile/README.md)

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start web dev server |
| `npm run dev:api` | Start API dev server |
| `npm run dev:all` | Start both concurrently |
| `npm run build` | Build web for production |
| `npm run lint` | Run ESLint across packages |
| `npm run test` | Run tests across packages |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/auth/login` | POST | User login |
| `/api/auth/register` | POST | User registration |
| `/api/auth/me` | GET | Get current user |
| `/api/ebooks` | GET | List ebooks |
| `/api/ebooks/:id` | GET | Get ebook details |
| `/api/ebooks/:id/file` | GET | Stream ebook file |
| `/api/ebooks/:id/underlines` | GET/POST | Ebook highlights |
| `/api/magazines` | GET | List magazines |
| `/api/magazines/:id/file` | GET | Stream magazine file |
| `/api/reading-history` | GET/POST | Reading progress |
| `/api/reading/sessions` | GET/POST | Reading sessions |
| `/api/user/stats` | GET | Reading statistics |
| `/api/user/badges` | GET | User badges |
| `/api/ai/meaning` | POST | Word/phrase lookup |
| `/api/ai/translate` | POST | Translation |
| `/api/ai/summarize` | POST | Text summarization |
| `/api/books` | GET | Physical books |

## Deployment

### API (Fly.io)

```bash
cd packages/api
fly deploy
```

Auto-deploys on push to `main` via GitHub Actions.

### Web (Vercel)

Auto-deploys on push to `main` via Vercel GitHub integration.

### Android

```bash
cd packages/android
./gradlew assembleRelease
```

### iOS

```bash
cd packages/ios
xcodebuild -scheme BookLibrio -configuration Release
```

### Mobile (React Native)

```bash
cd packages/mobile
# iOS
npx eas build --platform ios

# Android
npx eas build --platform android
```

## CI/CD

Path-filtered workflows run only when relevant packages change:

| Workflow | Trigger | Actions |
|----------|---------|---------|
| `ci.yml` | Push/PR to main | Lint, build, test per package |
| `deploy-api.yml` | Push to main (packages/api) | Deploy to Fly.io |
