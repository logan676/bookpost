# BookLibrio Backup and Migration Guide

This document explains how to backup all BookLibrio data and migrate to other service providers.

## Table of Contents

1. [Current Architecture Overview](#current-architecture-overview)
2. [Local Backup Guide](#local-backup-guide)
3. [Service Provider Migration Guide](#service-provider-migration-guide)
4. [Alternative Service Providers](#alternative-service-providers)

---

## Current Architecture Overview

BookLibrio uses the following cloud services:

| Component | Current Provider | Purpose | Data Location |
|-----------|-----------------|---------|---------------|
| **API Runtime** | Fly.dev | Run Node.js API | Stateless, code in Git |
| **Database** | Supabase | PostgreSQL database | Cloud + local backups |
| **File Storage** | Cloudflare R2 | Book files, cover images | Cloud |
| **Code Repository** | GitHub | Source code management | Cloud + local |

### Data Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                        iOS App                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Fly.dev (API Service)                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  packages/api/ - Hono.js + Drizzle ORM              │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
              │                              │
              ▼                              ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│   Supabase (PostgreSQL)   │    │   Cloudflare R2          │
│   - User data             │    │   - Ebook files (.epub)  │
│   - Book metadata         │    │   - Magazine files (.pdf)│
│   - Reading history       │    │   - Cover images         │
│   - Notes, book lists     │    │                          │
└──────────────────────────┘    └──────────────────────────┘
```

---

## Local Backup Guide

### Quick Backup

```bash
# 1. Navigate to API directory
cd packages/api

# 2. Run backup script
npx tsx src/scripts/backup-database.ts
```

Backups are saved to `packages/api/backups/YYYY-MM-DD_HH-MM-SS/` directory.

### Backup Contents

```
backups/2025-12-14_19-30-00/
├── _metadata.json          # Backup metadata
├── ebooks.json             # Ebooks (871+)
├── magazines.json          # Magazines (1,400+)
├── book_categories.json    # Categories (6,000+)
├── curated_lists.json      # Curated lists (100+)
├── curated_list_items.json # List items (900+)
├── users.json              # User data
├── notes.json              # Reading notes
├── reading_history.json    # Reading history
├── reading_sessions.json   # Reading sessions
├── badges.json             # Badge definitions
└── ...                     # Other tables
```

### Backup Storage Location

Backup files are stored locally and **will not** be uploaded to Git:
- Location: `packages/api/backups/`
- Excluded in `.gitignore`

### Recommended Backup Frequency

| Data Type | Recommended Frequency | Notes |
|-----------|----------------------|-------|
| User data | Weekly | Users, reading history, notes |
| Content data | Monthly | Book metadata, curated lists |
| Full backup | Before major updates | All data |

### Verify Backups

```bash
# View backup metadata
cat packages/api/backups/latest-backup-dir/_metadata.json

# Check row counts for key tables
wc -l packages/api/backups/latest-backup-dir/*.json
```

---

## Service Provider Migration Guide

### Migrating Fly.dev → Other Platforms

Fly.dev only runs stateless API code, making migration simplest:

**Migrate to Railway:**
```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Initialize project
cd packages/api
railway init

# 4. Set environment variables
railway variables set DATABASE_URL="your-db-url"
railway variables set R2_ACCOUNT_ID="your-r2-id"
# ... other variables

# 5. Deploy
railway up
```

**Migrate to Render:**
```bash
# 1. Create Web Service on render.com
# 2. Connect GitHub repository
# 3. Configure:
#    - Build Command: cd packages/api && npm install
#    - Start Command: cd packages/api && npm start
# 4. Add environment variables
```

**Migrate to Vercel:**
```bash
# Requires converting API to Serverless function format
# Reference: https://vercel.com/docs/functions
```

### Migrating Supabase → Other PostgreSQL

**Step 1: Restore from backup to new database**

```bash
# 1. Set new database URL
export NEW_DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# 2. Push schema to new database
cd packages/api
npx drizzle-kit push:pg

# 3. Restore data
npx tsx src/scripts/restore-database.ts backups/2025-12-14_19-30-00
```

**Step 2: Update application configuration**

```bash
# Update .env file
DATABASE_URL="postgresql://user:pass@new-host:5432/dbname"

# Redeploy API
fly deploy  # or other platform's deploy command
```

**Recommended PostgreSQL Alternatives:**

| Provider | Free Tier | Features |
|----------|-----------|----------|
| [Neon](https://neon.tech) | 0.5GB | Serverless, auto-scaling |
| [Railway](https://railway.app) | $5/month credit | Easy to use |
| [PlanetScale](https://planetscale.com) | 5GB | MySQL compatible (requires adjustments) |
| [CockroachDB](https://cockroachlabs.cloud) | 5GB | Distributed, high availability |
| Self-hosted | - | Full control |

### Migrating Cloudflare R2 → Other Storage

R2 uses S3-compatible API, making migration to other S3-compatible storage very simple:

**Step 1: Export file list**

```bash
# Use rclone to sync files
rclone sync r2:your-bucket ./local-backup/files

# Or use AWS CLI
aws s3 sync s3://your-bucket ./local-backup/files \
  --endpoint-url https://xxx.r2.cloudflarestorage.com
```

**Step 2: Upload to new storage**

```bash
# Upload to AWS S3
aws s3 sync ./local-backup/files s3://new-bucket

# Or upload to MinIO
mc cp --recursive ./local-backup/files minio/new-bucket
```

**Step 3: Update application configuration**

```typescript
// Modify packages/api/src/services/storage.ts
// Update S3 client configuration to point to new storage
```

**Recommended Storage Alternatives:**

| Provider | Free Tier | Features |
|----------|-----------|----------|
| [AWS S3](https://aws.amazon.com/s3) | 5GB/12 months | Most mature |
| [Backblaze B2](https://backblaze.com/b2) | 10GB | Affordable |
| [Wasabi](https://wasabi.com) | None | No egress fees |
| [MinIO](https://min.io) | Self-hosted | Open source, S3 compatible |

---

## Alternative Service Providers

### Complete Alternatives Comparison

| Current | Alternative 1 | Alternative 2 | Alternative 3 |
|---------|--------------|--------------|--------------|
| Fly.dev | Railway | Render | Self-hosted VPS |
| Supabase | Neon | Railway PostgreSQL | Self-hosted PostgreSQL |
| Cloudflare R2 | AWS S3 | Backblaze B2 | MinIO |

### Most Cost-Effective (Personal Projects)

```
API:      Railway (free tier)
Database: Neon (free 0.5GB)
Storage:  Backblaze B2 (free 10GB)
```

### Most Stable (Production)

```
API:      AWS ECS / Google Cloud Run
Database: AWS RDS / Google Cloud SQL
Storage:  AWS S3 / Google Cloud Storage
```

### Fully Self-Hosted

```
Server:       Hetzner / DigitalOcean VPS
Containers:   Docker + Docker Compose
Database:     PostgreSQL (Docker)
Storage:      MinIO (Docker) or local filesystem
Reverse Proxy: Nginx / Caddy
```

---

## Emergency Recovery Procedure

If current service provider becomes completely unavailable:

### 1. Prepare New Environment

```bash
# Choose new providers and create accounts
# Example: Railway + Neon + Backblaze B2
```

### 2. Deploy Database

```bash
# After creating database on Neon
export DATABASE_URL="postgresql://..."

# Push schema
cd packages/api
npx drizzle-kit push:pg

# Restore data
npx tsx src/scripts/restore-database.ts backups/latest-backup
```

### 3. Deploy API

```bash
# Update .env configuration
# Deploy to new platform
railway up  # or other platform command
```

### 4. Update iOS App

```swift
// Modify baseURL in APIClient.swift
let baseURL = "https://new-api-url.com"
```

### 5. Verify

```bash
# Test API
curl https://new-api-url.com/api/health

# Test data
curl https://new-api-url.com/api/ebooks?limit=1
```

---

## Automated Backup (Optional)

### Using cron for Scheduled Backups

```bash
# Edit crontab
crontab -e

# Backup every Sunday at 3 AM
0 3 * * 0 cd /path/to/booklibrio/packages/api && npx tsx src/scripts/backup-database.ts >> /var/log/booklibrio-backup.log 2>&1
```

### Using GitHub Actions for Backup to Private Repository

Create `.github/workflows/backup.yml`:

```yaml
name: Database Backup

on:
  schedule:
    - cron: '0 3 * * 0'  # Every Sunday
  workflow_dispatch:      # Manual trigger

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: cd packages/api && npm install

      - name: Run backup
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: cd packages/api && npx tsx src/scripts/backup-database.ts

      - name: Upload backup artifact
        uses: actions/upload-artifact@v4
        with:
          name: db-backup-${{ github.run_number }}
          path: packages/api/backups/
          retention-days: 90
```

---

## Support

If you have questions, please refer to:
- Project README
- GitHub Issues
- Related service provider documentation

---

*Last updated: 2025-12-14*
