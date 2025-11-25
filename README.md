# BookPost

A personal book collection manager that lets you scan book covers with your camera, automatically extracts book information using OCR and Google Books API, and creates a digital library.

## Features

- Scan book covers with your camera or upload photos
- Automatic text extraction using Google Cloud Vision OCR
- Book metadata lookup via Google Books API (title, author, publisher, description, etc.)
- Personal digital library with cover photos
- Create reading notes from scanned book pages

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3)
- **Image Storage**: Cloudinary
- **OCR**: Google Cloud Vision API
- **Book Data**: Google Books API

## Project Structure

```
bookpost/
├── packages/
│   ├── web/          # React frontend
│   ├── server/       # Express backend
│   └── shared/       # Shared types
├── .env.example      # Environment template
└── package.json      # Monorepo config
```

## Setup

### Prerequisites

- Node.js 18+
- npm or pnpm

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required credentials:

#### Cloudinary (Image Storage)
1. Create account at https://cloudinary.com
2. Get credentials from Dashboard
3. Add to `.env`:
   ```
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

#### Google Cloud Vision (OCR)
1. Create project at https://console.cloud.google.com
2. Enable Vision API
3. Create service account and download JSON key
4. Place key file in `packages/server/google-credentials.json`
5. Enable billing (free tier: 1000 requests/month)

#### Google Books API
1. Enable Books API at https://console.cloud.google.com/apis/library/books.googleapis.com
2. Create API key at https://console.cloud.google.com/apis/credentials
3. Add to `.env`:
   ```
   GOOGLE_BOOKS_API_KEY=your_api_key
   ```

### 3. Run Development Server

```bash
npm run dev:all
```

This starts:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Usage

1. Click "Add Book" button
2. Take a photo of a book cover or upload an image
3. Click "Scan Book Cover"
4. The app automatically extracts book info and adds it to your collection

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/books` | GET | Get all books |
| `/api/books/:id` | GET | Get book with blog posts |
| `/api/books/scan` | POST | Scan book cover photo |
| `/api/books` | POST | Create new book |
| `/api/books/:id` | DELETE | Delete book |
| `/api/books/:id/scan-page` | POST | Scan reading page |
| `/api/posts/:id` | GET | Get blog post |
| `/api/posts/:id` | PUT | Update blog post |
| `/api/posts/:id` | DELETE | Delete blog post |

## License

MIT
