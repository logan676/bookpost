# Physical Book Features - Web App Implementation

This document outlines all physical book (纸质书) features currently implemented in the BookPost web app, for alignment with iOS implementation.

## 1. Core Features Overview

| Feature | Web App Status | Description |
|---------|----------------|-------------|
| Book List | ✅ Implemented | Grid display of user's physical books |
| Add Book via Photo | ✅ Implemented | Scan book cover to auto-fill metadata |
| Book Detail View | ✅ Implemented | Full book information display |
| Page Scanning (OCR) | ✅ Implemented | Extract text from book pages |
| Reading Notes | ✅ Implemented | Store extracted text as reading notes |
| Reading History | ✅ Implemented | Track recently read physical books |
| Search/Filter | ✅ Implemented | Search books by title/author |

---

## 2. Physical Books Dashboard (`/books`)

### Features:
- **Grid Layout**: Display all physical books in a responsive grid
- **Book Count**: Shows total number of books in collection
- **Search**: Filter books by title or author
- **Add Book Button**: Opens multi-step add book modal
- **Empty State**: Message encouraging users to add first book
- **Authentication Required**: Login enforcement

### UI Elements:
```
┌─────────────────────────────────────────┐
│  Physical Books                [+ Add]  │
│  12 books                               │
├─────────────────────────────────────────┤
│  [Search books...]                      │
├─────────────────────────────────────────┤
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐   │
│  │Cover│  │Cover│  │Cover│  │Cover│   │
│  │     │  │     │  │     │  │     │   │
│  └─────┘  └─────┘  └─────┘  └─────┘   │
│   Title    Title    Title    Title     │
│   Author   Author   Author   Author    │
└─────────────────────────────────────────┘
```

---

## 3. Add Book Modal (Multi-Step)

### Step 1: Upload Photo
- Drag-and-drop or click to upload book cover photo
- Supports common image formats (JPG, PNG, etc.)
- Preview uploaded image

### Step 2: Scanning
- Sends image to `/api/books/scan` endpoint
- AI/OCR extracts metadata from cover:
  - Title
  - Author
  - ISBN
  - Publisher
  - Publication Year
  - Description
  - Page Count
  - Categories
  - Language
- Shows loading indicator during processing

### Step 3: Confirm Details
- Pre-filled form with extracted data
- User can edit/correct any field
- Required fields: Title, Author
- Optional fields: ISBN, Publisher, Publication Year, Description
- Submit creates book record

### Form Fields:
| Field | Required | Auto-filled |
|-------|----------|-------------|
| Title | ✅ | ✅ |
| Author | ✅ | ✅ |
| ISBN | ❌ | ✅ |
| Publisher | ❌ | ✅ |
| Publication Year | ❌ | ✅ |
| Description | ❌ | ✅ |
| Page Count | ❌ | ✅ |
| Categories | ❌ | ✅ |
| Language | ❌ | ✅ |

---

## 4. Book Detail View (`/book/:id`)

### Information Displayed:
- **Cover Image**: User-photographed or standard cover
- **Title & Author**
- **Publisher & Publication Year**
- **Page Count**
- **Language**
- **ISBN**
- **Categories**
- **Description**

### Actions:
- **Back Navigation**: Return to books list
- **Scan Page Button**: Open page scanner for OCR

### Reading Pages Section:
- List of all scanned pages/notes for this book
- Each entry shows:
  - Page number (if available)
  - Extracted text preview
  - Original page photo (if stored)
  - Creation date

---

## 5. Page Scanning Feature

### Purpose:
Extract text from physical book pages for note-taking and reference.

### Workflow:
1. Click "Scan Page" in book detail view
2. Upload/take photo of book page
3. API processes image via OCR (`/api/books/:id/scan-page`)
4. Extracted text saved as a reading note (BlogPost)

### Data Stored:
- `page_photo_url`: Original page image
- `page_number`: User-specified page number
- `extracted_text`: OCR-extracted text
- `content`: Processed/formatted text
- `title`: Auto-generated or user-specified

---

## 6. Reading History Integration

### Bookshelf Dashboard:
- Shows recently read physical books (max 6)
- "View All" button navigates to full list
- Each item displays cover and title
- Clicking opens book detail

### Tracking:
- Records `last_read_at` timestamp
- Tracks `last_page` for reading progress
- Unified with ebook/magazine history

---

## 7. API Endpoints

### Books CRUD:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/books` | List user's physical books |
| GET | `/api/books/:id` | Get single book details |
| POST | `/api/books` | Create new physical book |
| PUT | `/api/books/:id` | Update book details |
| DELETE | `/api/books/:id` | Delete book |

### Scanning:
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/books/scan` | Scan book cover for metadata |
| POST | `/api/books/:id/scan-page` | Scan page for text extraction |

### Query Parameters (GET /api/books):
- `search`: Search by title/author
- `author`: Filter by author
- `limit`: Pagination limit
- `offset`: Pagination offset

---

## 8. Data Models

### Book:
```typescript
interface Book {
  id: number;
  user_id: number;
  title: string;
  author: string;
  cover_url?: string;           // Standard cover URL
  cover_photo_url?: string;     // User-photographed cover
  isbn?: string;
  publisher?: string;
  publish_year?: number;
  description?: string;
  page_count?: number;
  categories?: string;
  language?: string;
  created_at: string;
}
```

### Reading Page (BlogPost):
```typescript
interface BlogPost {
  id: number;
  book_id: number;
  title: string;
  content: string;
  page_photo_url?: string;
  page_number?: number;
  extracted_text?: string;
  created_at: string;
}
```

---

## 9. Unique Features (vs Ebook/Magazine)

| Feature | Physical Books | Ebook/Magazine |
|---------|----------------|----------------|
| Cover Photo Scan | ✅ | ❌ |
| Metadata OCR | ✅ | ❌ |
| Page Text OCR | ✅ | ❌ |
| ISBN Tracking | ✅ | ❌ |
| Manual Metadata Entry | ✅ | ❌ |
| Reading Notes (BlogPost) | ✅ | Highlights/Annotations |
| Progress Tracking | Page-based | Position-based |

---

## 10. Localization Keys

### English:
```
physicalBooks = "Physical Books"
addBook = "+ Add Book"
takePhotoToStart = "Take a photo of a book cover to get started"
addFirstBook = "+ Add Your First Book"
noBooksFound = "No books found"
booksCount = "{count} books"
searchBooks = "Search books..."
scanPage = "Scan Page"
```

### Chinese:
```
physicalBooks = "实体书"
addBook = "+ 添加书籍"
takePhotoToStart = "拍摄书籍封面开始"
addFirstBook = "+ 添加第一本书"
noBooksFound = "没有找到实体书"
booksCount = "{count} 本书"
searchBooks = "搜索书籍..."
scanPage = "扫描页面"
```

---

## 11. iOS Implementation Status

### Currently Implemented:
- [ ] Physical books tab in bookshelf
- [ ] Basic book list display
- [ ] Reading status filters

### To Be Implemented (align with web):
- [ ] Add book via photo scan
- [ ] Book cover OCR metadata extraction
- [ ] Page scanning with OCR
- [ ] Reading notes for physical books
- [ ] ISBN tracking
- [ ] Manual book metadata entry
- [ ] Search/filter physical books

---

## 12. Recommended iOS Implementation Priority

1. **Phase 1: Basic Features**
   - Add book via photo (camera/gallery)
   - Book cover scanning with metadata extraction
   - Manual book entry form
   - Book list with search

2. **Phase 2: Enhanced Features**
   - Page scanning with OCR
   - Reading notes management
   - Reading progress tracking

3. **Phase 3: Advanced Features**
   - ISBN barcode scanning
   - Book recommendation based on collection
   - Export/share collection
