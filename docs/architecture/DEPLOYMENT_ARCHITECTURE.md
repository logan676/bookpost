# BookLibrio Deployment Architecture

## Overview

BookLibrio is a digital library application consisting of a React frontend and a Hono API backend, deployed as separate services for scalability and maintainability.

```
                                    +------------------+
                                    |   Cloudflare R2  |
                                    |   (File Storage) |
                                    +--------+---------+
                                             |
+-------------+     +-------------+     +----+----+     +-------------+
|   Browser   | --> |   Vercel    | --> | Fly.io  | --> |  Supabase   |
|   (Client)  |     |   (Web)     |     |  (API)  |     | (PostgreSQL)|
+-------------+     +-------------+     +---------+     +-------------+
       |                   |
       |                   |
+------+------+     +------+------+
| React SPA   |     | Edge CDN    |
| Vite Build  |     | Static Host |
+-------------+     +-------------+
```

## Architecture Components

### 1. Frontend (packages/web)

**Technology Stack:**
- React 18 with TypeScript
- Vite for build tooling
- TailwindCSS 4 for styling
- React Router v7 for navigation
- TanStack Query for data fetching

**Deployment Platform:** Vercel
- Global CDN distribution
- Automatic HTTPS
- SPA routing with fallback to index.html
- API proxy rewrites to backend

**Build Process:**
```bash
npm run build  # Runs vite build
```

**Output:** Static files in `packages/web/dist/`

### 2. Backend API (packages/api)

**Technology Stack:**
- Hono (lightweight web framework)
- Drizzle ORM for database operations
- PostgreSQL (via Supabase)
- Zod for validation
- OpenAPI spec generation

**Deployment Platform:** Fly.io
- Tokyo region (nrt) for low latency
- Always-on (min_machines_running = 1)
- 256MB RAM, shared CPU

**API Endpoints:**
| Route | Auth Required | Description |
|-------|--------------|-------------|
| `/api/health` | No | Health check |
| `/api/ebooks` | No | E-book CRUD operations |
| `/api/magazines` | No | Magazine operations |
| `/api/categories` | No | Category management |
| `/api/books` | **Yes** | Physical book operations (user-scoped) |
| `/api/notes` | **Yes** | User notes (user-scoped) |
| `/api/reading-history` | **Yes** | Reading progress tracking (user-scoped) |
| `/api/auth` | No | Authentication (login/register) |
| `/api/r2-covers/*` | No | Cover image proxy |

### 3. Database (Supabase)

**Technology:** PostgreSQL
- Managed database service
- Connection pooling via Supavisor
- Automatic backups

**Tables:**
- `ebooks` - E-book metadata
- `magazines` - Magazine metadata
- `magazine_categories` - Magazine categorization
- `ebook_categories` - E-book categorization
- `users` - User accounts
- `notes` - User notes
- `reading_history` - Reading progress

### 4. File Storage (Cloudflare R2)

**Purpose:** Store and serve ebook/magazine files and cover images
- S3-compatible API
- Global edge caching
- Cost-effective egress

## Request Flow

### Production Request Flow

```
1. User visits https://booklibrio.vercel.app
   └─> Vercel serves static React app

2. App makes API request to /api/ebooks
   └─> Vercel rewrites to https://booklibrio-api-hono.fly.dev/api/ebooks
       └─> Fly.io API processes request
           └─> Queries Supabase PostgreSQL
           └─> Returns JSON response

3. App requests book cover /api/r2-covers/ebooks/123.jpg
   └─> Vercel rewrites to Fly.io API
       └─> API proxies to Cloudflare R2
           └─> Returns image
```

### Development Request Flow

```
1. npm run dev:api    # Starts API on localhost:3001
2. npm run dev        # Starts Vite on localhost:5173

3. Browser requests localhost:5173
   └─> Vite serves React app with HMR

4. App makes API request to /api/ebooks
   └─> Vite proxy forwards to localhost:3001
       └─> Local API queries Supabase
```

## Deployment Configuration

### Vercel (vercel.json)

```json
{
  "buildCommand": "cd packages/web && npm run build",
  "outputDirectory": "packages/web/dist",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://booklibrio-api-hono.fly.dev/api/:path*"
    },
    {
      "source": "/((?!api/).*)",
      "destination": "/index.html"
    }
  ]
}
```

**Key Points:**
- Monorepo support via buildCommand path
- API proxy rewrites to Fly.io backend
- SPA fallback for client-side routing

### Fly.io (fly.toml)

```toml
app = 'booklibrio-api-hono'
primary_region = 'nrt'

[env]
  NODE_ENV = 'production'
  PORT = '8080'

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = 'off'
  auto_start_machines = true
  min_machines_running = 1

[[vm]]
  memory = '256mb'
  cpu_kind = 'shared'
  cpus = 1
```

**Key Points:**
- Tokyo region for proximity to user
- Machine always running (no cold starts)
- HTTPS enforced

## CI/CD Pipeline

### API Auto-Deploy (GitHub Actions)

```yaml
# .github/workflows/deploy-api.yml
on:
  push:
    branches: [main]
    paths:
      - 'packages/api/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-action/setup-flyctl@master
      - run: flyctl deploy --remote-only
        working-directory: packages/api
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

### Web Auto-Deploy (Vercel)

- Automatic deployment on push to main branch
- Preview deployments for pull requests
- Connected via Vercel GitHub integration

## Environment Variables

### API (Fly.io Secrets)

```bash
fly secrets set DATABASE_URL="postgresql://..."
fly secrets set R2_ACCESS_KEY_ID="..."
fly secrets set R2_SECRET_ACCESS_KEY="..."
fly secrets set R2_BUCKET_NAME="..."
fly secrets set R2_ENDPOINT="..."
```

### Web (Vercel Environment Variables)

No client-side environment variables required. All API calls are proxied through Vercel rewrites.

## Local Development

### Prerequisites

1. Node.js >= 18
2. npm (with workspaces support)
3. Access to Supabase database

### Setup

```bash
# Install dependencies
npm install

# Create .env in packages/api
cp packages/api/.env.example packages/api/.env
# Edit .env with your database credentials

# Start both services
npm run dev:all

# Or separately:
npm run dev:api   # API on localhost:3001
npm run dev       # Web on localhost:5173
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start web dev server |
| `npm run dev:api` | Start API dev server |
| `npm run dev:all` | Start both concurrently |
| `npm run build` | Build web for production |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests |

## Monitoring & Debugging

### Fly.io Logs

```bash
fly logs --app booklibrio-api-hono
```

### Vercel Logs

Available in Vercel dashboard under Functions tab.

### Health Check

```bash
curl https://booklibrio-api-hono.fly.dev/api/health
```

## Security Considerations

1. **HTTPS Only:** Both Vercel and Fly.io enforce HTTPS
2. **CORS:** API configured to accept requests from Vercel domain
3. **Database:** Connection via SSL, credentials stored as secrets
4. **API Proxy:** All API calls routed through Vercel, hiding backend URL from client
5. **Authentication:** Protected endpoints require Bearer token authentication

### Authentication

Protected endpoints (`/api/notes`, `/api/books`, `/api/reading-history`) require a valid Bearer token in the `Authorization` header:

```
Authorization: Bearer <session_token>
```

**Authentication Flow:**
1. User logs in via `/api/auth/login` endpoint
2. API validates credentials and returns a session token
3. Frontend stores token and includes it in subsequent requests
4. API middleware validates token against `sessions` table
5. User-scoped data is filtered by the authenticated user's ID

**Protected Tabs:**
- **Thinking** - Requires login to view/manage personal notes
- **Bookshelf** - Requires login to view reading history
- **Physical Books** - Requires login to view/manage book collection

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 401 | `UNAUTHORIZED` | Authentication required |
| 401 | `UNAUTHORIZED` | Invalid or expired token |
| 401 | `UNAUTHORIZED` | User not found |

## Scaling

### Horizontal Scaling

- **Fly.io:** Add more machines via `fly scale count N`
- **Vercel:** Automatic edge scaling

### Vertical Scaling

- **Fly.io:** Increase VM memory/CPU in fly.toml
- **Supabase:** Upgrade database plan for more connections

## Troubleshooting

### API 500 Errors

1. Check Fly.io logs: `fly logs`
2. Verify database connection
3. Check machine status: `fly status`

### Web App Not Loading

1. Check Vercel deployment logs
2. Verify rewrites in vercel.json
3. Check browser console for errors

### Database Connection Issues

1. Verify DATABASE_URL secret is set
2. Check Supabase dashboard for connection limits
3. Test connection: `fly ssh console` then `curl localhost:8080/api/health`
