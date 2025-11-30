# Magazine Reader Implementation

This document describes the implementation of the magazine PDF reader with text selection and underline support.

## Overview

The magazine reader uses PDF.js to render PDF files with a selectable text layer, enabling users to:
- Select text in the PDF
- Create underlines (highlights) on selected text
- Add ideas/notes to underlines
- Look up meanings of selected text via AI
- Restore underlines when reopening magazines

## Architecture

### Frontend Components

#### MagazineReader (`packages/web/src/components/MagazineReader.tsx`)

The main reader component that renders PDFs using PDF.js with a text layer overlay.

**Key features:**
- Canvas-based PDF rendering with PDF.js
- Transparent text layer positioned over the canvas for text selection
- Bubble UI for underline/meaning actions
- Ideas popup for managing notes
- Meaning popup for AI-powered definitions
- Keyboard navigation (arrow keys, F for fullscreen, Escape to close)
- Zoom controls

**PDF.js Setup:**
```typescript
import * as pdfjsLib from 'pdfjs-dist'

// Configure worker from CDN
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
```

**Text Layer Rendering:**
The text layer is a transparent div positioned absolutely over the canvas. Each text item from the PDF becomes a span with:
- Absolute positioning matching the PDF coordinates
- `data-offset` attribute for character offset tracking
- `data-length` attribute for text length
- Transparent color (text is invisible but selectable)

```typescript
textItems.forEach((item) => {
  const span = document.createElement('span')
  span.textContent = item.str
  span.style.position = 'absolute'
  span.style.left = `${tx[4]}px`
  span.style.top = `${tx[5] - item.height}px`
  span.style.color = 'transparent'
  span.dataset.offset = String(currentOffset)
  span.dataset.length = String(item.str.length)
  textLayer.appendChild(span)
})
```

#### AnnotationService (`packages/web/src/services/annotationService.ts`)

A general-purpose service for annotation data operations, shared between ebook and magazine readers.

**Responsibilities:**
- CRUD operations for underlines
- CRUD operations for ideas
- AI meaning lookups
- Markdown to HTML conversion for meaning display

**Content Types Supported:**
- `ebook` - For epub/pdf ebooks
- `magazine` - For magazine PDFs
- `note` - For notes
- `blogpost` - For blog posts

### Backend API

#### Magazine Underlines Routes (`packages/server/src/routes/magazines.js`)

All underline/idea routes require authentication via `authMiddleware`.

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/magazines/:id/underlines` | Fetch all underlines for a magazine (user-specific) |
| POST | `/api/magazines/:id/underlines` | Create a new underline |
| DELETE | `/api/magazines/magazine-underlines/:id` | Delete an underline |
| GET | `/api/magazines/magazine-underlines/:id/ideas` | Fetch ideas for an underline |
| POST | `/api/magazines/magazine-underlines/:id/ideas` | Add an idea to an underline |
| PATCH | `/api/magazines/magazine-ideas/:id` | Update an idea |
| DELETE | `/api/magazines/magazine-ideas/:id` | Delete an idea |

### Database Schema

#### magazine_underlines table
```sql
CREATE TABLE magazine_underlines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  magazine_id INTEGER REFERENCES magazines(id),
  user_id INTEGER REFERENCES users(id),
  text TEXT,
  page_number INTEGER,
  start_offset INTEGER,
  end_offset INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
```

#### magazine_ideas table
```sql
CREATE TABLE magazine_ideas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  underline_id INTEGER REFERENCES magazine_underlines(id),
  user_id INTEGER REFERENCES users(id),
  content TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
```

## User Flow

### Creating an Underline

1. User selects text in the PDF
2. `mouseup` event triggers `handleTextSelection()`
3. Selection is validated (must be in text layer, user must be logged in)
4. Bubble appears with "Underline" and "Meaning" buttons
5. User clicks "Underline"
6. API call to create underline
7. Bubble switches to idea input mode
8. User can add an idea or skip
9. Underline is saved and displayed

### Viewing Existing Underlines

1. On page load, underlines are fetched from API
2. `applyUnderlinesToTextLayer()` highlights matching spans
3. Click handlers are added to underlined spans
4. Clicking shows bubble with "Ideas", "Add Idea", "Meaning", "Delete" buttons

### Restoring Underlines on Reopen

1. `useEffect` on mount fetches underlines for the magazine
2. Each page render calls `applyUnderlinesToTextLayer()`
3. Spans matching underline offsets get yellow background

## CSS Styles

Key CSS classes for the magazine reader:

```css
.magazine-reader { /* Main container */ }
.magazine-reader .pdf-container { /* Centers the PDF page */ }
.magazine-reader .pdf-page { /* White background with shadow */ }
.magazine-reader .text-layer { /* Transparent overlay for selection */ }
.magazine-reader .text-layer .underlined-text { /* Yellow highlight */ }
.magazine-reader .nav-btn { /* Previous/Next page buttons */ }
.underline-bubble { /* Popup for actions */ }
.bubble-confirm { /* Button group in bubble */ }
.bubble-idea { /* Idea input form */ }
.ideas-popup { /* Ideas list popup */ }
.meaning-popup { /* AI meaning popup */ }
```

## Dependencies

- `pdfjs-dist` - PDF rendering library
- React hooks for state management
- `annotationService` for API calls

## Future Improvements

- Voice input for ideas (like ebook reader)
- Multiple highlight colors
- Export annotations
- Search within underlines
- Sync across devices
