# Reader Feature Gap Analysis: Web App vs iOS Native App

## Overview

This document provides a comparative analysis of BookLibrio reader features between Web App and iOS Native App, focusing on highlighting (Underline), notes (Notes/Ideas), and AI meaning (AI Meaning) features.

---

## 1. Text Selection Bubble Menu

### 1.1 Feature Comparison Table

| Feature | Web App | iOS Native | Status |
|---------|---------|------------|--------|
| Highlight (Underline) | ✅ | ✅ | Aligned |
| Copy | ❌ | ✅ | iOS has extra |
| Notes/Ideas | ✅ | ✅ | Different implementation |
| Share | ❌ | ✅ | iOS has extra |
| **AI Meaning** | ✅ | ❌ | **Missing on iOS** |
| Color Selection | ❌ (single color) | ✅ (6 colors) | iOS richer |

### 1.2 Web App Bubble Menu Implementation

**File**: `packages/web/src/components/EpubReader.tsx`

Bubble menu has three states:
1. **Confirm Bubble** - Shown when new text is selected
   - "Underline" button - Create highlight
   - "Meaning" button - Get AI meaning

2. **Existing Highlight Bubble** - Shown when clicking existing highlight
   - "Ideas (N)" button - View idea count and content
   - "Add Idea" button - Add new idea
   - "Meaning" button - Get AI meaning
   - "Delete" button - Delete highlight

3. **Idea Input Bubble** - Shown after creating highlight or clicking add idea
   - Text input field
   - "Save" / "Skip" buttons

```tsx
// Web App Bubble UI Structure (EpubReader.tsx:1438-1491)
{bubble.type === 'confirm' ? (
  <div className="bubble-confirm">
    <button onClick={handleConfirmUnderline}>Underline</button>
    <button onClick={handleGetMeaning}>Meaning</button>  // ⬅️ AI Meaning button
  </div>
) : bubble.type === 'existing' ? (
  <div className="bubble-confirm">
    <button onClick={handleViewIdeas}>Ideas ({ideaCount})</button>
    <button onClick={handleShowIdeaInput}>Add Idea</button>
    <button onClick={handleGetMeaning}>Meaning</button>  // ⬅️ AI Meaning button
    <button onClick={handleDeleteUnderline}>Delete</button>
  </div>
) : (
  // idea input bubble
)}
```

### 1.3 iOS Native App Bubble Menu Implementation

**File**: `packages/ios/BookLibrio/Views/Reader/TextSelectionMenu.swift`

Current iOS bubble menu has only one state with four fixed buttons:

```swift
// iOS Bubble UI Structure (TextSelectionMenu.swift:19-44)
HStack(spacing: 0) {
    menuButton(icon: "highlighter", label: "Color") { showColorPicker.toggle() }
    Divider()
    menuButton(icon: "doc.on.doc", label: "Copy") { onCopy(); onDismiss() }
    Divider()
    menuButton(icon: "square.and.pencil", label: "Note") { onAddNote() }
    Divider()
    menuButton(icon: "square.and.arrow.up", label: "Share") { onShare() }
}
// ❌ Missing AI Meaning button
```

---

## 2. AI Meaning Feature

### 2.1 Feature Description

AI Meaning feature allows users to select text and call AI API to get explanation, translation, or contextual analysis of the text.

### 2.2 Web App Implementation Details

**API Endpoint**: `POST /api/ai/meaning`

**Request Parameters**:
```typescript
interface MeaningRequest {
  text: string        // Selected text
  paragraph: string   // Complete paragraph containing selected text (context)
  targetLanguage: 'en' | 'zh'  // Target language (bilingual switching)
}
```

**Response Format**:
```typescript
interface MeaningResponse {
  meaning: string  // Markdown formatted meaning content
}
```

**Implementation Logic** (EpubReader.tsx:887-958):
```typescript
const handleGetMeaning = async () => {
  // 1. Get complete paragraph containing selected text as context
  let paragraph = bubble.selectedText
  // ... Find parent P or DIV element from DOM to get complete paragraph

  // 2. Show loading state popup
  setMeaningPopup({
    visible: true,
    x: bubble.x,
    y: bubble.y + 60,
    text: bubble.selectedText,
    meaning: '',
    loading: true
  })

  // 3. Call AI API
  const res = await fetch('/api/ai/meaning', {
    method: 'POST',
    body: JSON.stringify({
      text: bubble.selectedText,
      paragraph: paragraph,
      targetLanguage: locale === 'zh' ? 'en' : 'zh'  // Smart bilingual switching
    })
  })

  // 4. Display result (supports Markdown rendering)
  const data = await res.json()
  setMeaningPopup(prev => ({ ...prev, meaning: data.meaning, loading: false }))
}
```

**UI Display** (EpubReader.tsx:1510-1560):
- Popup displays below bubble
- Shows selected original text
- Markdown format renders meaning result
- Supports loading state display

### 2.3 iOS Implementation Required

1. **Add API Call Method** (APIClient.swift)
   ```swift
   func getMeaning(text: String, paragraph: String, targetLanguage: String) async throws -> MeaningResponse
   ```

2. **Add Bubble Menu Button** (TextSelectionMenu.swift)
   - Add "Meaning" button
   - Suggested icon: `"text.magnifyingglass"` or `"sparkles"`

3. **Add Meaning Popup View** (MeaningPopupView.swift)
   - Display selected text
   - Loading state
   - Markdown rendered result

4. **Data Models** (ReaderModels.swift)
   ```swift
   struct MeaningRequest: Codable {
       let text: String
       let paragraph: String
       let targetLanguage: String
   }

   struct MeaningResponse: Codable {
       let meaning: String
   }
   ```

---

## 3. Notes/Ideas Feature

### 3.1 Feature Comparison

| Feature | Web App | iOS Native | Description |
|---------|---------|------------|-------------|
| Add idea after creating highlight | ✅ | ❌ | Web auto-pops input box |
| View ideas list | ✅ (popup) | ❌ | iOS can only add in Sheet |
| Edit existing ideas | ✅ | ❌ | Web supports inline editing |
| Delete ideas | ✅ | ❌ | Web supports |
| Ideas count badge | ✅ | ✅ (partial) | Web displays at highlight end |
| Voice input | ✅ (EbookReader) | ❌ | Web Speech API |

### 3.2 Web App Ideas Flow

```
Select text → Click Underline → Auto-show Idea input box → Enter idea → Save/Skip
                                    ↓
                              Create highlight success
                                    ↓
                        Ideas count badge at highlight end
                                    ↓
                Click existing highlight → Show Ideas(N) button → View/Edit/Delete ideas
```

### 3.3 iOS Native App Current Flow

```
Select text → Click Note → Pop AddNoteSheet → Enter note → Save
                              ↓
                    (Sheet shows selected text preview)
                              ↓
                    (No logic associating with highlight)
```

### 3.4 iOS Improvements Needed

1. **Auto-pop idea input box after creating highlight**
2. **Support viewing all ideas associated with highlight**
3. **Idea edit and delete functionality**
4. **Ideas count badge at highlight end**

---

## 4. Image AI Analysis Feature

### 4.1 Web App Implementation

**API Endpoint**: `POST /api/ai/explain-image`

When user clicks an image in the book:
1. Image converts to base64
2. Call AI API to analyze image
3. Display centered Toast popup with analysis result

```typescript
// EpubReader.tsx:266-332
contents.document.addEventListener('click', (e: MouseEvent) => {
  if (target.tagName === 'IMG') {
    // Convert to base64 and call AI
    getBase64FromImage(img).then(base64 => {
      fetch('/api/ai/explain-image', {
        body: JSON.stringify({ imageUrl: base64, targetLanguage })
      })
    })
  }
})
```

### 4.2 iOS Implementation Status

❌ **iOS has not yet implemented Image AI Analysis feature**

---

## 5. Other Differences

### 5.1 Highlight Colors

| Platform | Supported Colors |
|----------|------------------|
| Web App | Single yellow (`rgba(251, 191, 36, 0.35)`) |
| iOS | 6 colors (yellow, green, blue, pink, purple, orange) |

### 5.2 Reading Settings

| Feature | Web App | iOS Native |
|---------|---------|------------|
| Font Size Adjustment | ✅ (15-30px) | ✅ |
| Font Selection | ✅ (7 English serif fonts) | ✅ (4 Chinese fonts) |
| Theme Modes | ✅ (Light/Sepia/Dark) | ✅ (Light/Sepia/Green/Dark) |
| Full Screen Mode | ✅ | ✅ |
| Line Spacing Adjustment | ❌ | ✅ |

### 5.3 Social Features

| Feature | Web App | iOS Native |
|---------|---------|------------|
| Friends' Ideas Sidebar | ❌ | ✅ (FriendThoughtsSidebar) |
| Friends' Ideas Bubble | ❌ | ✅ (FriendThoughtBubble) |

---

## 6. Implementation Priority Suggestions

### P0 - Must Implement
1. **AI Meaning Button** - Add meaning button to bubble menu
2. **AI Meaning Popup** - Display AI analysis result

### P1 - High Priority
3. **Auto-pop idea input after highlight creation** - Optimize note flow
4. **View ideas list associated with highlight** - Support viewing in popup
5. **Idea edit and delete** - Complete CRUD functionality

### P2 - Medium Priority
6. **Image AI Analysis** - Click image to get AI analysis
7. **Ideas count badge** - Display count at highlight end

### P3 - Low Priority
8. **Voice Input** - Use iOS Speech framework

---

## 7. Related File List

### Web App
- `packages/web/src/components/EpubReader.tsx` - EPUB reader main component
- `packages/web/src/components/EbookReader.tsx` - Generic ebook reader
- `packages/web/src/services/annotationService.ts` - Highlight/idea service layer

### iOS Native App
- `packages/ios/BookLibrio/Views/Reader/TextSelectionMenu.swift` - Text selection menu
- `packages/ios/BookLibrio/Views/Reader/ReaderContainerView.swift` - Reader container
- `packages/ios/BookLibrio/Views/Reader/EPUBReaderView.swift` - EPUB reader
- `packages/ios/BookLibrio/Views/Reader/EnhancedPDFReaderView.swift` - PDF reader
- `packages/ios/BookLibrio/Models/ReaderModels.swift` - Reader data models
- `packages/ios/BookLibrio/Models/Note.swift` - Note data model
- `packages/ios/BookLibrio/Services/APIClient.swift` - API client

### API
- `packages/api/src/routes/` - API route definitions

---

## 8. Technical Implementation Key Points

### 8.1 iOS AI Meaning Implementation Suggestions

```swift
// 1. Add meaning button in TextSelectionMenu
struct TextSelectionMenu: View {
    let onMeaning: () -> Void  // New callback

    var body: some View {
        HStack(spacing: 0) {
            // ... existing buttons
            Divider()
            menuButton(icon: "sparkles", label: L10n.AI.meaning) {
                onMeaning()
            }
        }
    }
}

// 2. Add API method in APIClient
func getMeaning(text: String, paragraph: String, targetLanguage: String) async throws -> MeaningResponse {
    let endpoint = "/api/ai/meaning"
    let body = MeaningRequest(text: text, paragraph: paragraph, targetLanguage: targetLanguage)
    return try await post(endpoint, body: body)
}

// 3. Create meaning popup view
struct MeaningPopupView: View {
    let selectedText: String
    @State private var meaning: String = ""
    @State private var isLoading = true

    var body: some View {
        VStack {
            Text(selectedText)
                .padding()
                .background(Color.yellow.opacity(0.2))

            if isLoading {
                ProgressView()
            } else {
                // Markdown rendering
                Text(LocalizedStringKey(meaning))
            }
        }
    }
}
```

### 8.2 Bubble Menu State Machine Suggestion

```swift
enum BubbleMenuState {
    case confirm       // New text selected
    case existing      // Click existing highlight
    case ideaInput     // Input idea
}

struct TextSelectionOverlay: View {
    @State private var menuState: BubbleMenuState = .confirm

    var body: some View {
        switch menuState {
        case .confirm:
            ConfirmBubbleMenu(onUnderline: ..., onMeaning: ...)
        case .existing:
            ExistingBubbleMenu(onViewIdeas: ..., onAddIdea: ..., onMeaning: ..., onDelete: ...)
        case .ideaInput:
            IdeaInputBubble(onSave: ..., onSkip: ...)
        }
    }
}
```

---

*Document Created: 2024-12-14*
*Last Updated: 2024-12-14*
