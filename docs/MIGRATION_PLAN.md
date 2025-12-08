# BookPost Architecture Migration Plan

## Overview

Migration from Express.js + Railway to a modern, multi-client architecture with better debugging and developer experience.

## Current vs Target Architecture

### Before (Current)
```
┌─────────────┐  ┌─────────────┐
│   Web App   │  │ Mobile (RN) │
│  (Vercel)   │  │   (Expo)    │
└──────┬──────┘  └──────┬──────┘
       │                │
       └───────┬────────┘
               ▼
┌──────────────────────────────┐
│   Express.js API (Railway)   │
│   • 26 route files (~6000 LOC)│
│   • SQLite/PostgreSQL dual   │
│   • Hardcoded file paths     │
└──────────────┬───────────────┘
               │
    ┌──────────┴──────────┐
    ▼                     ▼
┌─────────┐        ┌─────────────┐
│PostgreSQL│       │Cloudflare R2│
│(Railway) │       │  (Storage)  │
└─────────┘        └─────────────┘
```

### After (Target)
```
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│   Web   │ │   RN    │ │ Android │ │   iOS   │ │ Future  │
│ (React) │ │  App    │ │ (Kotlin)│ │ (Swift) │ │  ...    │
└────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘
     │           │           │           │           │
     │      Generated Type-Safe API Clients          │
     │   (from OpenAPI spec - auto-updated)          │
     └───────────────────┬───────────────────────────┘
                         ▼
┌────────────────────────────────────────────────────────────┐
│                    Hono API Server                         │
│                      (Fly.io)                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   OpenAPI    │  │  JWT Auth    │  │  Structured      │  │
│  │   Schema     │  │              │  │  Logging         │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└────────────────────────────┬───────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│   Supabase PostgreSQL   │     │     Cloudflare R2       │
│                         │     │                         │
│  • Dashboard debugging  │     │  • No egress fees       │
│  • Managed backups      │     │  • Large media files    │
│  • Connection pooling   │     │  • S3-compatible        │
└─────────────────────────┘     └─────────────────────────┘
```

---

## Phase 1: Foundation Setup (Week 1)

### 1.1 Create Supabase Project

**Tasks:**
- [ ] Create Supabase account and project
- [ ] Note connection string and API keys
- [ ] Enable Row Level Security (RLS) policies

**Steps:**
```bash
# 1. Go to https://supabase.com and create project
# 2. Get connection string from Settings > Database
# 3. Save credentials:
#    - SUPABASE_URL
#    - SUPABASE_ANON_KEY
#    - SUPABASE_SERVICE_ROLE_KEY
#    - DATABASE_URL (PostgreSQL connection string)
```

### 1.2 Migrate Database Schema

**Tasks:**
- [ ] Export current schema from Railway PostgreSQL
- [ ] Import schema to Supabase
- [ ] Verify all tables created correctly

**Steps:**
```bash
# Export from Railway
pg_dump --schema-only $RAILWAY_DATABASE_URL > schema.sql

# Import to Supabase
psql $SUPABASE_DATABASE_URL < schema.sql

# Or use Supabase CLI
supabase db push
```

### 1.3 Migrate Data

**Tasks:**
- [ ] Export data from Railway
- [ ] Import data to Supabase
- [ ] Verify row counts match

**Steps:**
```bash
# Export data
pg_dump --data-only $RAILWAY_DATABASE_URL > data.sql

# Import to Supabase
psql $SUPABASE_DATABASE_URL < data.sql
```

### 1.4 Setup New Server Package

**Tasks:**
- [ ] Create `packages/api` directory
- [ ] Initialize Hono project with TypeScript
- [ ] Setup OpenAPI integration

**Steps:**
```bash
# Create new API package
mkdir -p packages/api
cd packages/api

# Initialize
npm init -y
npm install hono @hono/node-server @hono/zod-openapi zod
npm install -D typescript @types/node tsx

# Create tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
EOF
```

---

## Phase 2: Core API Migration (Week 2-3)

### 2.1 Project Structure

```
packages/api/
├── src/
│   ├── index.ts              # Entry point
│   ├── app.ts                # Hono app setup
│   ├── openapi.ts            # OpenAPI spec export
│   ├── db/
│   │   ├── client.ts         # Drizzle + Supabase connection
│   │   └── schema.ts         # Drizzle schema
│   ├── routes/
│   │   ├── auth.ts           # Auth routes with OpenAPI
│   │   ├── ebooks.ts         # Ebooks CRUD
│   │   ├── magazines.ts      # Magazines CRUD
│   │   ├── notes.ts          # Notes CRUD
│   │   └── ...
│   ├── middleware/
│   │   ├── auth.ts           # JWT validation
│   │   ├── logging.ts        # Request logging
│   │   └── errors.ts         # Error handling
│   └── services/
│       ├── r2.ts             # R2 storage service
│       ├── ai.ts             # AI features (Claude)
│       └── metadata.ts       # Book metadata extraction
├── package.json
├── tsconfig.json
└── fly.toml                  # Fly.io config
```

### 2.2 Hono App Setup

**File: `packages/api/src/app.ts`**
```typescript
import { OpenAPIHono } from '@hono/zod-openapi'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'

// Route imports
import { authRoutes } from './routes/auth'
import { ebooksRoutes } from './routes/ebooks'
import { magazinesRoutes } from './routes/magazines'
import { notesRoutes } from './routes/notes'

const app = new OpenAPIHono()

// Middleware
app.use('*', logger())
app.use('*', secureHeaders())
app.use('*', cors({
  origin: [
    'http://localhost:5173',
    'https://bookpost.vercel.app',
    // Add mobile app origins
  ],
  credentials: true,
}))

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }))

// API routes
app.route('/api/auth', authRoutes)
app.route('/api/ebooks', ebooksRoutes)
app.route('/api/magazines', magazinesRoutes)
app.route('/api/notes', notesRoutes)

// OpenAPI documentation
app.doc('/api/openapi.json', {
  openapi: '3.1.0',
  info: {
    title: 'BookPost API',
    version: '2.0.0',
  },
})

export { app }
```

### 2.3 Route Migration Priority

| Priority | Route | Complexity | Notes |
|----------|-------|------------|-------|
| 1 | `/api/auth/*` | Medium | Required for all other routes |
| 2 | `/api/ebooks/*` | High | Core feature, includes file streaming |
| 3 | `/api/magazines/*` | High | Similar to ebooks |
| 4 | `/api/notes/*` | Medium | User content |
| 5 | `/api/reading-history/*` | Low | Progress tracking |
| 6 | `/api/ai/*` | Medium | AI features |
| 7 | Other routes | Low | Audio, video, etc. |

### 2.4 Example Route with OpenAPI

**File: `packages/api/src/routes/ebooks.ts`**
```typescript
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { db } from '../db/client'
import { ebooks } from '../db/schema'
import { authMiddleware } from '../middleware/auth'

const app = new OpenAPIHono()

// Schema definitions
const EbookSchema = z.object({
  id: z.number(),
  title: z.string(),
  author: z.string().nullable(),
  cover_url: z.string().nullable(),
  file_path: z.string(),
  category_id: z.number().nullable(),
  created_at: z.string(),
})

const ListEbooksRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Ebooks'],
  summary: 'List all ebooks',
  request: {
    query: z.object({
      category: z.string().optional(),
      search: z.string().optional(),
      limit: z.coerce.number().default(50),
      offset: z.coerce.number().default(0),
    }),
  },
  responses: {
    200: {
      description: 'List of ebooks',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(EbookSchema),
            total: z.number(),
          }),
        },
      },
    },
  },
})

app.openapi(ListEbooksRoute, async (c) => {
  const { category, search, limit, offset } = c.req.valid('query')

  // Query with Drizzle
  const results = await db.select().from(ebooks).limit(limit).offset(offset)
  const total = await db.select({ count: count() }).from(ebooks)

  return c.json({
    data: results,
    total: total[0].count,
  })
})

export { app as ebooksRoutes }
```

---

## Phase 3: Client SDK Generation (Week 3)

### 3.1 Setup OpenAPI Generator

**Tasks:**
- [ ] Install openapi-generator-cli
- [ ] Create generation scripts
- [ ] Setup CI/CD for auto-generation

**Steps:**
```bash
# Install generator
npm install -g @openapitools/openapi-generator-cli

# Create generation script
cat > scripts/generate-clients.sh << 'EOF'
#!/bin/bash

API_SPEC="packages/api/openapi.json"

# Generate TypeScript client (Web + React Native)
openapi-generator-cli generate \
  -i $API_SPEC \
  -g typescript-fetch \
  -o packages/shared/api-client \
  --additional-properties=supportsES6=true,npmName=@bookpost/api-client

# Generate Kotlin client (Android)
openapi-generator-cli generate \
  -i $API_SPEC \
  -g kotlin \
  -o clients/android/api-client \
  --additional-properties=library=jvm-retrofit2,serializationLibrary=kotlinx_serialization

# Generate Swift client (iOS)
openapi-generator-cli generate \
  -i $API_SPEC \
  -g swift5 \
  -o clients/ios/BookPostAPI \
  --additional-properties=library=alamofire
EOF
chmod +x scripts/generate-clients.sh
```

### 3.2 Client Package Structure

```
packages/shared/api-client/    # TypeScript (Web + RN)
├── src/
│   ├── apis/
│   │   ├── AuthApi.ts
│   │   ├── EbooksApi.ts
│   │   └── ...
│   ├── models/
│   │   ├── Ebook.ts
│   │   └── ...
│   └── index.ts
└── package.json

clients/android/api-client/    # Kotlin
├── src/main/kotlin/
│   └── com/bookpost/api/
│       ├── apis/
│       └── models/
└── build.gradle.kts

clients/ios/BookPostAPI/       # Swift
├── Sources/
│   └── BookPostAPI/
│       ├── APIs/
│       └── Models/
└── Package.swift
```

### 3.3 Usage in Web App

```typescript
// packages/web/src/lib/api.ts
import { Configuration, EbooksApi, AuthApi } from '@bookpost/api-client'

const config = new Configuration({
  basePath: import.meta.env.VITE_API_URL,
  accessToken: () => localStorage.getItem('token') || '',
})

export const api = {
  ebooks: new EbooksApi(config),
  auth: new AuthApi(config),
  // ... other APIs
}

// Usage in component
const ebooks = await api.ebooks.listEbooks({ category: 'fiction', limit: 20 })
```

---

## Phase 4: Deployment Setup (Week 4)

### 4.1 Fly.io Setup

**Tasks:**
- [ ] Create Fly.io account
- [ ] Install flyctl CLI
- [ ] Create and deploy app

**Steps:**
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Create app
cd packages/api
fly launch --name bookpost-api

# Set secrets
fly secrets set DATABASE_URL="postgresql://..."
fly secrets set R2_ACCESS_KEY_ID="..."
fly secrets set R2_SECRET_ACCESS_KEY="..."
fly secrets set JWT_SECRET="..."

# Deploy
fly deploy
```

### 4.2 Fly.io Configuration

**File: `packages/api/fly.toml`**
```toml
app = "bookpost-api"
primary_region = "nrt"  # Tokyo (closest to user)

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "8080"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1

[[services.ports]]
  handlers = ["http"]
  port = 80

[[services.ports]]
  handlers = ["tls", "http"]
  port = 443

[checks]
  [checks.health]
    type = "http"
    path = "/health"
    interval = "10s"
    timeout = "2s"
```

### 4.3 Dockerfile

**File: `packages/api/Dockerfile`**
```dockerfile
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "dist/index.js"]
```

---

## Phase 5: Frontend Updates (Week 4-5)

### 5.1 Update Web App

**Tasks:**
- [ ] Replace custom API hooks with generated client
- [ ] Update environment variables
- [ ] Test all features

**Changes:**
```typescript
// Before: packages/web/src/hooks/useApi.ts
const API_BASE = '/api'
const response = await fetch(`${API_BASE}/ebooks`)

// After: Use generated client
import { api } from '../lib/api'
const ebooks = await api.ebooks.listEbooks()
```

### 5.2 Update Mobile App

**Tasks:**
- [ ] Install generated TypeScript client
- [ ] Update API service
- [ ] Test on iOS and Android

### 5.3 Native App Integration

For future Kotlin/Swift native apps:
- Import generated client packages
- Follow generated documentation
- Type-safe from day one

---

## Phase 6: Cleanup & Documentation (Week 5)

### 6.1 Remove Old Code

**Tasks:**
- [ ] Archive `packages/server` (keep for reference)
- [ ] Remove Railway configuration
- [ ] Update CI/CD pipelines

### 6.2 Update Documentation

**Tasks:**
- [ ] Update README with new setup instructions
- [ ] Document API with OpenAPI UI (Swagger)
- [ ] Create developer onboarding guide

### 6.3 Monitoring Setup

**Tasks:**
- [ ] Setup Fly.io metrics dashboard
- [ ] Configure error alerting
- [ ] Setup uptime monitoring

---

## Rollback Plan

If issues arise during migration:

1. **Database**: Supabase and Railway can run in parallel
2. **API**: Keep Railway running until Fly.io is stable
3. **Clients**: Feature flag to switch between old/new API URLs

```typescript
const API_URL = import.meta.env.VITE_USE_NEW_API
  ? 'https://bookpost-api.fly.dev'
  : 'https://bookpost-api-production.up.railway.app'
```

---

## Success Metrics

| Metric | Before | Target |
|--------|--------|--------|
| API Response Time (p50) | ~200ms | <100ms |
| Cold Start | ~3s | <500ms |
| Debug Time (find issue) | 30min+ | <5min |
| Add New Endpoint | 2-3 hours | 30min |
| Add New Client Platform | Days | Hours (auto-generated) |

---

## Timeline Summary

| Week | Phase | Deliverable |
|------|-------|-------------|
| 1 | Foundation | Supabase setup, data migrated |
| 2-3 | Core API | Hono API with OpenAPI spec |
| 3 | Client SDKs | Generated clients for all platforms |
| 4 | Deployment | Live on Fly.io |
| 4-5 | Frontend | All apps using new API |
| 5 | Cleanup | Old infra removed, docs updated |

---

## Next Steps

1. Create Supabase project
2. Setup `packages/api` with Hono
3. Migrate auth routes first
4. Generate initial client SDK
5. Test with web app locally
