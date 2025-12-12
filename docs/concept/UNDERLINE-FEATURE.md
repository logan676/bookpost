# Underline Feature Documentation

This document describes the text underline/highlight feature implementation for Ebooks and Magazines in BookPost.

## Overview

The underline feature allows users to:
1. Select and highlight text passages in ebooks and magazines
2. Attach ideas/notes to highlighted passages
3. View all underlines across their library
4. Navigate directly to underlined passages

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Mobile/Web)                       │
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │   EbookReader    │    │  MagazineReader  │                   │
│  │                  │    │                  │                   │
│  │  - Text selection│    │  - Text selection│                   │
│  │  - Underline UI  │    │  - Underline UI  │                   │
│  └────────┬─────────┘    └────────┬─────────┘                   │
│           │                       │                              │
│           └───────────┬───────────┘                              │
│                       │                                          │
│            ┌──────────▼──────────┐                              │
│            │   Underline API     │                              │
│            │   Service           │                              │
│            └──────────┬──────────┘                              │
└───────────────────────┼──────────────────────────────────────────┘
                        │
                        │ HTTP API
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Server (Express.js)                         │
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │ /api/ebooks/:id/ │    │/api/magazines/:id│                   │
│  │   underlines     │    │   /underlines    │                   │
│  └────────┬─────────┘    └────────┬─────────┘                   │
│           │                       │                              │
│           └───────────┬───────────┘                              │
│                       │                                          │
│            ┌──────────▼──────────┐                              │
│            │     Database        │                              │
│            │  (PostgreSQL/SQLite)│                              │
│            └─────────────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### Ebook Underlines

```sql
CREATE TABLE ebook_underlines (
    id INTEGER PRIMARY KEY,
    ebook_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,

    -- Text content
    text TEXT NOT NULL,              -- The highlighted text

    -- Location information
    cfi_range TEXT,                  -- EPUB CFI (Canonical Fragment Identifier)
    chapter_index INTEGER,           -- Chapter number (0-indexed)
    paragraph_index INTEGER,         -- Paragraph within chapter
    start_offset INTEGER,            -- Character offset start
    end_offset INTEGER,              -- Character offset end

    -- Metadata
    color TEXT DEFAULT 'yellow',     -- Highlight color
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (ebook_id) REFERENCES ebooks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Magazine Underlines

```sql
CREATE TABLE magazine_underlines (
    id INTEGER PRIMARY KEY,
    magazine_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,

    -- Text content
    text TEXT NOT NULL,

    -- Location information
    page_number INTEGER NOT NULL,    -- Page where underline exists
    x_position REAL,                 -- X coordinate (percentage)
    y_position REAL,                 -- Y coordinate (percentage)
    width REAL,                      -- Selection width (percentage)
    height REAL,                     -- Selection height (percentage)

    -- Metadata
    color TEXT DEFAULT 'yellow',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (magazine_id) REFERENCES magazines(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Ideas (attached to underlines)

```sql
CREATE TABLE ebook_ideas (
    id INTEGER PRIMARY KEY,
    underline_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (underline_id) REFERENCES ebook_underlines(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE magazine_ideas (
    id INTEGER PRIMARY KEY,
    underline_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (underline_id) REFERENCES magazine_underlines(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## API Endpoints

### Ebook Underlines

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ebooks/:id/underlines` | Get all underlines for an ebook |
| POST | `/api/ebooks/:id/underlines` | Create a new underline |
| DELETE | `/api/ebook-underlines/:id` | Delete an underline |
| GET | `/api/ebook-underlines/:id/ideas` | Get ideas for an underline |
| POST | `/api/ebook-underlines/:id/ideas` | Add idea to underline |
| PATCH | `/api/ebook-ideas/:id` | Update an idea |
| DELETE | `/api/ebook-ideas/:id` | Delete an idea |

### Magazine Underlines

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/magazines/:id/underlines` | Get all underlines for a magazine |
| POST | `/api/magazines/:id/underlines` | Create a new underline |
| DELETE | `/api/magazine-underlines/:id` | Delete an underline |
| GET | `/api/magazine-underlines/:id/ideas` | Get ideas for an underline |
| POST | `/api/magazine-underlines/:id/ideas` | Add idea to underline |
| DELETE | `/api/magazine-ideas/:id` | Delete an idea |

## Request/Response Examples

### Create Ebook Underline

**Request:**
```json
POST /api/ebooks/1/underlines
{
    "text": "The quick brown fox jumps over the lazy dog",
    "cfi_range": "epubcfi(/6/4!/4/2/1:0,/6/4!/4/2/1:43)",
    "chapter_index": 2,
    "paragraph_index": 5,
    "start_offset": 0,
    "end_offset": 43,
    "color": "yellow"
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "id": 123,
        "ebook_id": 1,
        "text": "The quick brown fox jumps over the lazy dog",
        "cfi_range": "epubcfi(/6/4!/4/2/1:0,/6/4!/4/2/1:43)",
        "chapter_index": 2,
        "paragraph_index": 5,
        "start_offset": 0,
        "end_offset": 43,
        "color": "yellow",
        "created_at": "2024-01-15T10:30:00Z"
    }
}
```

### Create Magazine Underline

**Request:**
```json
POST /api/magazines/1/underlines
{
    "text": "Important quote from the article",
    "page_number": 5,
    "x_position": 10.5,
    "y_position": 25.3,
    "width": 80.0,
    "height": 2.5,
    "color": "blue"
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "id": 456,
        "magazine_id": 1,
        "text": "Important quote from the article",
        "page_number": 5,
        "x_position": 10.5,
        "y_position": 25.3,
        "width": 80.0,
        "height": 2.5,
        "color": "blue",
        "created_at": "2024-01-15T10:30:00Z"
    }
}
```

### Add Idea to Underline

**Request:**
```json
POST /api/ebook-underlines/123/ideas
{
    "content": "This passage reminds me of the concept of agility in software development"
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "id": 789,
        "underline_id": 123,
        "content": "This passage reminds me of the concept of agility in software development",
        "created_at": "2024-01-15T10:35:00Z"
    }
}
```

## Client Implementation

### Ebook Reader (EPUB)

The ebook reader uses epub.js for rendering EPUB files. Text selection is handled using the epub.js selection API.

```typescript
// packages/web/src/components/EbookReader.tsx

// Handle text selection
const handleTextSelection = (cfiRange: string, text: string) => {
  // Get selection details
  const selection = window.getSelection();
  if (!selection || selection.toString().trim() === '') return;

  // Create underline
  await api.createEbookUnderline(ebookId, {
    text: selection.toString(),
    cfi_range: cfiRange,
    chapter_index: currentChapter,
    paragraph_index: getParagraphIndex(selection),
    start_offset: selection.anchorOffset,
    end_offset: selection.focusOffset,
    color: selectedColor
  });

  // Render highlight in epub.js
  rendition.annotations.highlight(cfiRange, {}, (e) => {
    // Click handler for highlight
  });
};
```

### Magazine Reader (PDF)

Magazine pages are rendered as images. Text selection uses OCR-based text layer overlay.

```typescript
// packages/web/src/components/MagazineReader.tsx

// Handle text selection on magazine page
const handlePageSelection = async (selection: TextSelection) => {
  // Calculate position relative to page dimensions
  const rect = selection.getBoundingClientRect();
  const pageRect = pageRef.current.getBoundingClientRect();

  const underline = {
    text: selection.toString(),
    page_number: currentPage,
    x_position: ((rect.left - pageRect.left) / pageRect.width) * 100,
    y_position: ((rect.top - pageRect.top) / pageRect.height) * 100,
    width: (rect.width / pageRect.width) * 100,
    height: (rect.height / pageRect.height) * 100,
    color: selectedColor
  };

  await api.createMagazineUnderline(magazineId, underline);
};
```

### Mobile Implementation

On mobile (React Native), text selection uses native WebView for EPUB and custom touch handlers for PDF pages.

```typescript
// packages/mobile/src/components/EbookReader.tsx

// Inject JavaScript into WebView for text selection
const injectedJS = `
  document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    if (selection.toString().trim()) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'selection',
        text: selection.toString(),
        range: getSelectionRange()
      }));
    }
  });
`;

// Handle messages from WebView
const handleWebViewMessage = (event) => {
  const data = JSON.parse(event.nativeEvent.data);
  if (data.type === 'selection') {
    showUnderlineModal(data);
  }
};
```

## Rendering Highlights

### EPUB Highlights

EPUB highlights are rendered using epub.js annotations:

```typescript
// Load existing underlines when book opens
const loadUnderlines = async () => {
  const underlines = await api.getEbookUnderlines(ebookId);

  underlines.forEach(underline => {
    rendition.annotations.highlight(
      underline.cfi_range,
      { id: underline.id },
      (e) => handleHighlightClick(e, underline),
      'highlight-' + underline.color
    );
  });
};
```

### Magazine Page Highlights

Magazine highlights are rendered as positioned overlay elements:

```typescript
// Render highlights on magazine page
const renderPageHighlights = (pageNumber: number) => {
  const pageUnderlines = underlines.filter(u => u.page_number === pageNumber);

  return pageUnderlines.map(underline => (
    <div
      key={underline.id}
      className={`highlight highlight-${underline.color}`}
      style={{
        position: 'absolute',
        left: `${underline.x_position}%`,
        top: `${underline.y_position}%`,
        width: `${underline.width}%`,
        height: `${underline.height}%`,
        backgroundColor: getHighlightColor(underline.color),
        opacity: 0.3,
        cursor: 'pointer'
      }}
      onClick={() => showUnderlineDetails(underline)}
    />
  ));
};
```

## Color Options

Available highlight colors:

| Color | Hex Code | Use Case |
|-------|----------|----------|
| yellow | #FFEB3B | General highlights |
| green | #4CAF50 | Important concepts |
| blue | #2196F3 | Definitions |
| pink | #E91E63 | Questions/doubts |
| orange | #FF9800 | Action items |

## Navigation

Users can navigate to underlines from:

1. **Underline List View** - Shows all underlines across library
2. **Book/Magazine Detail** - Shows underlines for specific item
3. **Search Results** - Search within underlined text

### Navigate to EPUB Underline

```typescript
// Jump to underline location in EPUB
const navigateToUnderline = (underline: EbookUnderline) => {
  rendition.display(underline.cfi_range);
};
```

### Navigate to Magazine Underline

```typescript
// Jump to underline location in Magazine
const navigateToUnderline = (underline: MagazineUnderline) => {
  setCurrentPage(underline.page_number);
  // Scroll to highlight position
  scrollToPosition(underline.y_position);
};
```

## Performance Considerations

1. **Lazy Loading** - Underlines are loaded per-chapter/per-page, not all at once
2. **Caching** - Underline data is cached in local state to reduce API calls
3. **Batch Operations** - Multiple underlines can be created/deleted in batch
4. **Debouncing** - Selection events are debounced to prevent excessive API calls

## Error Handling

Common errors and handling:

| Error | Cause | Handling |
|-------|-------|----------|
| Invalid CFI | Malformed EPUB structure | Show user-friendly error, log for debugging |
| Position out of bounds | Page dimensions changed | Recalculate positions on resize |
| Duplicate underline | Same text selected twice | Merge or show existing underline |
| Offline | No network connection | Queue for sync when online |

## Future Enhancements

1. **Sync across devices** - Real-time sync of underlines
2. **Export underlines** - Export to Markdown, PDF, or note apps
3. **Share underlines** - Share highlighted passages socially
4. **AI-powered summaries** - Generate summaries from underlined passages
5. **Collaborative reading** - View others' underlines in book clubs
