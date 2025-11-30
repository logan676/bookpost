# Ebook Reader Implementation

This document describes the implementation of the ebook (EPUB) reader with text selection and underline support.

## Overview

The ebook reader uses **epub.js** library to render EPUB files with full text selection and annotation support. It provides:
- Two-page spread rendering
- Text selection and underline creation
- Ideas/notes attached to underlines
- AI-powered meaning lookup
- Multiple themes (light, sepia, dark)
- Multiple font families
- Reading progress tracking via CFI (Canonical Fragment Identifier)

## Architecture

### Frontend Component

#### EpubReader (`packages/web/src/components/EpubReader.tsx`)

The main reader component that uses epub.js for EPUB rendering.

**Key Features:**
- epub.js-based rendering with iframe
- CFI-based location tracking (precise positioning in EPUB)
- Built-in annotation API from epub.js
- Two-page spread layout
- Theme and font customization
- Table of contents navigation
- Image click for AI explanation

### epub.js Setup

```typescript
import ePub, { Book, Rendition } from 'epubjs'

// Load EPUB as ArrayBuffer
const response = await fetch(`/api/ebooks/${ebook.id}/file`)
const arrayBuffer = await response.arrayBuffer()
const book = ePub(arrayBuffer)

// Create rendition with two-page spread
const rendition = book.renderTo(viewerRef.current, {
  width: '100%',
  height: '100%',
  spread: 'always',
  minSpreadWidth: 800
})
```

### Text Selection & Underlines

#### How epub.js Selection Works

epub.js provides a `selected` event that fires when text is selected in the EPUB:

```typescript
rendition.on('selected', (cfiRange: string, contents: any) => {
  // cfiRange is the EPUB CFI (Canonical Fragment Identifier)
  // contents provides access to the iframe's window and document

  const selection = contents.window.getSelection()
  const selectedText = selection?.toString().trim()

  // Get position for bubble
  const range = selection.getRangeAt(0)
  const rect = range.getBoundingClientRect()

  // Show bubble at selection position
  setBubble({
    visible: true,
    x: bubbleX,
    y: bubbleY,
    type: 'confirm',
    selectedText,
    cfiRange  // Store CFI for later annotation
  })
})
```

#### CFI (Canonical Fragment Identifier)

CFI is EPUB's standard for identifying locations within an ebook. It looks like:
```
epubcfi(/6/4[chapter1]!/4/2/1:0)
```

**Benefits of CFI:**
- Precise location identification
- Survives reflow (different screen sizes)
- Works across reading sessions
- Standard EPUB format

#### Applying Highlights with epub.js Annotations

epub.js has a built-in annotations API:

```typescript
// Apply a highlight to a CFI range
rendition.annotations.highlight(
  cfiRange,                    // The CFI range to highlight
  { underlineId: ul.id },      // Custom data attached to annotation
  (e: MouseEvent) => {         // Click handler
    handleUnderlineClick(ul, e)
  },
  'highlight-class',           // CSS class name
  { fill: 'rgba(251, 191, 36, 0.35)' }  // Style options
)

// Remove a highlight
rendition.annotations.remove(cfiRange, 'highlight')
```

### Underline Data Storage

#### Database Schema (ebook_underlines)

```sql
CREATE TABLE ebook_underlines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ebook_id INTEGER REFERENCES ebooks(id),
  user_id INTEGER REFERENCES users(id),
  text TEXT,
  paragraph INTEGER,
  chapter_index INTEGER,
  paragraph_index INTEGER,
  start_offset INTEGER,
  end_offset INTEGER,
  cfi_range TEXT,           -- Key field: stores the CFI
  idea_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
```

The `cfi_range` field is critical - it stores the exact EPUB location.

### Restoring Underlines

When the reader loads or navigates:

```typescript
// On book load, fetch underlines
const underlines = await fetch(`/api/ebooks/${ebookId}/underlines`)

// Apply each underline using epub.js annotations
underlines.forEach(ul => {
  if (ul.cfi_range && !appliedAnnotationsRef.current.has(ul.id)) {
    rendition.annotations.highlight(ul.cfi_range, ...)
    appliedAnnotationsRef.current.add(ul.id)
  }
})
```

The `appliedAnnotationsRef` Set prevents duplicate annotations.

### Reading Position Tracking

```typescript
// Save reading position
rendition.on('relocated', (location: any) => {
  const currentCfi = location.start.cfi
  setCurrentLocation(currentCfi)

  // Save to reading history
  await fetch('/api/reading-history', {
    method: 'POST',
    body: JSON.stringify({
      item_type: 'ebook',
      item_id: ebook.id,
      cfi: currentCfi
    })
  })
})

// Restore reading position
if (initialCfi) {
  rendition.display(initialCfi)
}
```

### Theme System

```typescript
const themes = {
  light: {
    body: { background: '#ffffff', color: '#1a1a1a' }
  },
  sepia: {
    body: { background: '#f4ecd8', color: '#5b4636' }
  },
  dark: {
    body: { background: '#1a1a2e', color: '#e0e0e0' }
  }
}

// Register theme with epub.js
rendition.themes.register('light', themes.light)
rendition.themes.register('sepia', themes.sepia)
rendition.themes.register('dark', themes.dark)

// Apply theme
rendition.themes.select(theme)
```

### Font System

```typescript
const fontFamilies = {
  'crimson-pro': '"Crimson Pro", Georgia, serif',
  'eb-garamond': '"EB Garamond", Garamond, serif',
  'libre-baskerville': '"Libre Baskerville", Baskerville, serif',
  // ... more fonts
}

// Apply font
rendition.themes.override('font-family', fontFamilies[fontFamily])
rendition.themes.fontSize(`${fontSizePx}px`)
```

## Backend API

#### Ebook Underlines Routes (`packages/server/src/routes/ebooks.js`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/ebooks/:id/underlines` | Fetch all underlines (user-specific) |
| POST | `/api/ebooks/:id/underlines` | Create underline with CFI |
| DELETE | `/api/ebook-underlines/:id` | Delete underline |
| GET | `/api/ebook-underlines/:id/ideas` | Fetch ideas |
| POST | `/api/ebook-underlines/:id/ideas` | Add idea |
| PATCH | `/api/ebook-ideas/:id` | Update idea |
| DELETE | `/api/ebook-ideas/:id` | Delete idea |

## Differences from Magazine Reader

| Feature | Ebook (EPUB) | Magazine (PDF) |
|---------|--------------|----------------|
| Library | epub.js | pdfjs-dist |
| Location | CFI | Page number + offset |
| Selection | epub.js 'selected' event | DOM mouseup event |
| Highlights | annotations.highlight() | Manual span styling |
| Rendering | iframe | canvas + text layer |
| Layout | Reflowable | Fixed |

## Key epub.js APIs Used

- `ePub(arrayBuffer)` - Create book instance
- `book.renderTo(element, options)` - Create rendition
- `rendition.display(cfi)` - Navigate to location
- `rendition.on('selected', callback)` - Text selection
- `rendition.on('relocated', callback)` - Location changes
- `rendition.annotations.highlight()` - Add highlight
- `rendition.annotations.remove()` - Remove highlight
- `rendition.themes.register/select/override()` - Theming
- `book.locations.generate()` - Create location index

## Dependencies

- `epubjs` - EPUB rendering library
- React hooks for state management

## CSS Considerations

epub.js renders content in an iframe, so styles must be injected:

```typescript
// Inject styles into EPUB iframe
rendition.themes.register('custom', {
  'body': { ... },
  '.my-highlight': { background: 'yellow' }
})
```

## Voice Input (Future/Existing)

The ebook reader supports voice input for ideas using Web Speech API, similar to the magazine reader implementation.
