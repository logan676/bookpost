# AI Features Architecture

## Overview

BookPost integrates AI capabilities for content recognition, text extraction, and translation. All AI features use Claude API (Anthropic) for processing.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT APPS                                    │
│         (Web, React Native, Android Native, iOS Native)                     │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            API SERVER (Hono)                                │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         /api/ai Routes                                 │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │  POST /api/ai/recognize-book    - Book cover recognition              │ │
│  │  POST /api/ai/extract-text      - OCR from book pages                 │ │
│  │  POST /api/ai/translate         - Text translation                    │ │
│  │  POST /api/ai/summarize         - Content summarization               │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                     │                                       │
│  ┌──────────────────────────────────┴───────────────────────────────────┐   │
│  │                         AI Service Layer                             │   │
│  │                                                                      │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐   │   │
│  │  │  Image Encoder  │  │ Prompt Builder  │  │  Response Parser    │   │   │
│  │  │  (Base64)       │  │                 │  │                     │   │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLAUDE API                                       │
│                         (Anthropic)                                         │
│                                                                             │
│  Models:                                                                    │
│  • claude-3-5-sonnet (default) - Best balance of speed and quality         │
│  • claude-3-opus - Highest quality for complex tasks                        │
│  • claude-3-haiku - Fastest for simple tasks                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Feature 1: Book Cover Recognition

Identify book information from a photo of the book cover.

### Flow

```
Mobile App                      API Server                      Claude API
    │                               │                               │
    │ 1. User takes photo           │                               │
    │    of book cover              │                               │
    │                               │                               │
    │ 2. POST /api/ai/recognize-book│                               │
    │    { image: base64 }          │                               │
    │──────────────────────────────>│                               │
    │                               │                               │
    │                               │ 3. Build vision prompt        │
    │                               │                               │
    │                               │ 4. Send to Claude API         │
    │                               │    with image                 │
    │                               │──────────────────────────────>│
    │                               │                               │
    │                               │                               │ 5. Analyze
    │                               │                               │    image
    │                               │                               │
    │                               │ 6. Structured response        │
    │                               │<──────────────────────────────│
    │                               │                               │
    │                               │ 7. Parse & lookup metadata    │
    │                               │    (Google Books API)         │
    │                               │                               │
    │ 8. Return book info           │                               │
    │    { title, author,           │                               │
    │      isbn, metadata }         │                               │
    │<──────────────────────────────│                               │
    │                               │                               │
    │ 9. Display result             │                               │
    │    & offer to add to library  │                               │
```

### API Specification

```yaml
POST /api/ai/recognize-book:
  requestBody:
    content:
      application/json:
        schema:
          type: object
          required: [image]
          properties:
            image:
              type: string
              format: base64
              description: Base64-encoded image of book cover
  responses:
    200:
      content:
        application/json:
          schema:
            type: object
            properties:
              title:
                type: string
              author:
                type: string
              isbn:
                type: string
              confidence:
                type: number
                minimum: 0
                maximum: 1
              metadata:
                type: object
                description: Additional metadata from Google Books
```

### Prompt Template

```
Analyze this book cover image and extract the following information:
- Book title
- Author name(s)
- ISBN (if visible)
- Publisher (if visible)
- Any subtitle

Respond in JSON format:
{
  "title": "...",
  "author": "...",
  "isbn": "...",
  "publisher": "...",
  "subtitle": "...",
  "confidence": 0.95
}

If any field is not visible or unclear, set it to null.
```

---

## Feature 2: Text Extraction (OCR)

Extract text from photographed book pages.

### Flow

```
Mobile App                      API Server                      Claude API
    │                               │                               │
    │ 1. User photographs           │                               │
    │    book page                  │                               │
    │                               │                               │
    │ 2. POST /api/ai/extract-text  │                               │
    │    { image: base64 }          │                               │
    │──────────────────────────────>│                               │
    │                               │                               │
    │                               │ 3. Send image with            │
    │                               │    OCR prompt                 │
    │                               │──────────────────────────────>│
    │                               │                               │
    │                               │ 4. { text: "..." }            │
    │                               │<──────────────────────────────│
    │                               │                               │
    │ 5. Return extracted text      │                               │
    │<──────────────────────────────│                               │
    │                               │                               │
    │ 6. User can:                  │                               │
    │    - Save as note             │                               │
    │    - Highlight portions       │                               │
    │    - Translate                │                               │
```

### API Specification

```yaml
POST /api/ai/extract-text:
  requestBody:
    content:
      application/json:
        schema:
          type: object
          required: [image]
          properties:
            image:
              type: string
              format: base64
            language:
              type: string
              default: auto
              description: Expected language (auto-detect if not specified)
  responses:
    200:
      content:
        application/json:
          schema:
            type: object
            properties:
              text:
                type: string
                description: Extracted text content
              language:
                type: string
                description: Detected language code
              paragraphs:
                type: array
                items:
                  type: string
                description: Text split into paragraphs
```

### Prompt Template

```
Extract all visible text from this image of a book page.

Instructions:
- Preserve paragraph structure
- Maintain original formatting where possible
- Ignore page numbers and headers/footers
- If text is in a non-English language, extract it as-is

Respond in JSON format:
{
  "text": "Full extracted text...",
  "language": "en",
  "paragraphs": ["paragraph 1", "paragraph 2", ...]
}
```

---

## Feature 3: Translation

Translate selected text to target language.

### Flow

```
Client App                      API Server                      Claude API
    │                               │                               │
    │ 1. User selects text          │                               │
    │    in reader                  │                               │
    │                               │                               │
    │ 2. POST /api/ai/translate     │                               │
    │    { text, targetLanguage }   │                               │
    │──────────────────────────────>│                               │
    │                               │                               │
    │                               │ 3. Build translation          │
    │                               │    prompt with context        │
    │                               │──────────────────────────────>│
    │                               │                               │
    │                               │ 4. Translated text            │
    │                               │<──────────────────────────────│
    │                               │                               │
    │ 5. Return translation         │                               │
    │<──────────────────────────────│                               │
    │                               │                               │
    │ 6. Display in popup           │                               │
    │    or side panel              │                               │
```

### API Specification

```yaml
POST /api/ai/translate:
  requestBody:
    content:
      application/json:
        schema:
          type: object
          required: [text, targetLanguage]
          properties:
            text:
              type: string
              maxLength: 5000
            targetLanguage:
              type: string
              enum: [zh, en, ja, ko, es, fr, de]
            context:
              type: string
              description: Surrounding text for better context
  responses:
    200:
      content:
        application/json:
          schema:
            type: object
            properties:
              translation:
                type: string
              sourceLanguage:
                type: string
              notes:
                type: string
                description: Translation notes or cultural context
```

### Prompt Template

```
Translate the following text to {targetLanguage}.

Context (if provided): {context}

Text to translate:
{text}

Instructions:
- Preserve the original meaning and tone
- Maintain any technical terms appropriately
- If there are cultural references, briefly explain them

Respond in JSON format:
{
  "translation": "...",
  "sourceLanguage": "en",
  "notes": "Optional cultural/contextual notes"
}
```

---

## Feature 4: Content Summarization

Summarize articles, chapters, or notes.

### API Specification

```yaml
POST /api/ai/summarize:
  requestBody:
    content:
      application/json:
        schema:
          type: object
          required: [content]
          properties:
            content:
              type: string
              maxLength: 50000
            style:
              type: string
              enum: [brief, detailed, bullet-points]
              default: brief
            maxLength:
              type: integer
              default: 200
              description: Target length in words
  responses:
    200:
      content:
        application/json:
          schema:
            type: object
            properties:
              summary:
                type: string
              keyPoints:
                type: array
                items:
                  type: string
```

---

## Implementation Details

### Service Layer

```typescript
// packages/api/src/services/ai.ts

import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function recognizeBook(imageBase64: string) {
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: BOOK_RECOGNITION_PROMPT,
          },
        ],
      },
    ],
  })

  return parseBookRecognitionResponse(response)
}

export async function extractText(imageBase64: string) {
  // Similar implementation with OCR prompt
}

export async function translate(text: string, targetLanguage: string) {
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: buildTranslationPrompt(text, targetLanguage),
      },
    ],
  })

  return parseTranslationResponse(response)
}
```

### Route Handler

```typescript
// packages/api/src/routes/ai.ts

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { recognizeBook, extractText, translate } from '../services/ai'
import { authMiddleware } from '../middleware/auth'

const app = new OpenAPIHono()

// Require authentication for all AI routes
app.use('*', authMiddleware)

const RecognizeBookRoute = createRoute({
  method: 'post',
  path: '/recognize-book',
  tags: ['AI'],
  summary: 'Recognize book from cover photo',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            image: z.string().describe('Base64-encoded image'),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Book recognition result',
      content: {
        'application/json': {
          schema: z.object({
            title: z.string().nullable(),
            author: z.string().nullable(),
            isbn: z.string().nullable(),
            confidence: z.number(),
          }),
        },
      },
    },
  },
})

app.openapi(RecognizeBookRoute, async (c) => {
  const { image } = c.req.valid('json')
  const result = await recognizeBook(image)
  return c.json(result)
})

export { app as aiRoutes }
```

---

## Rate Limiting

AI endpoints have stricter rate limits due to cost:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/ai/recognize-book` | 10 requests | 1 minute |
| `/api/ai/extract-text` | 20 requests | 1 minute |
| `/api/ai/translate` | 30 requests | 1 minute |
| `/api/ai/summarize` | 10 requests | 1 minute |

---

## Error Handling

```typescript
// Common AI errors
enum AIErrorCode {
  IMAGE_TOO_LARGE = 'AI_IMAGE_TOO_LARGE',
  INVALID_IMAGE = 'AI_INVALID_IMAGE',
  RATE_LIMITED = 'AI_RATE_LIMITED',
  API_ERROR = 'AI_API_ERROR',
  PARSE_ERROR = 'AI_PARSE_ERROR',
}

// Example error response
{
  "error": {
    "code": "AI_RATE_LIMITED",
    "message": "Too many AI requests. Please wait before trying again.",
    "retryAfter": 60
  }
}
```

---

## Cost Considerations

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Use Case |
|-------|----------------------|------------------------|----------|
| claude-3-5-sonnet | $3.00 | $15.00 | Default for all features |
| claude-3-haiku | $0.25 | $1.25 | Simple translations |

### Image Processing Costs
- Images count as ~1,000 tokens per image
- Average book cover: ~$0.003 per recognition
- Average page OCR: ~$0.003 per extraction

---

## Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Optional
AI_MODEL=claude-3-5-sonnet-20241022
AI_MAX_TOKENS=4096
AI_RATE_LIMIT_WINDOW=60
```
