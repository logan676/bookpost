# BookLibrio Development Plan

> **Duration**: 4 months (16 weeks)
> **Goal**: User experience first, complete core functionality
> **Team**: 2-3 person small team
> **Based on**: PRODUCT_CONCEPT.md requirements assessment

---

## Development Progress Overview

```
Month         Month 1         Month 2         Month 3         Month 4
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase     Reading Experience  AI Features     Social & Content  Monetization
          Enhancement         Completion      Discovery         & Polish
Completion 46% → 60%         60% → 75%       75% → 88%         88% → 95%
Target
```

---

## Phase 1: Reading Experience Enhancement (Weeks 1-4)

### Phase Goals
Elevate the reader from "functional" to "excellent", establishing core competitive advantage

### Task List

#### Week 1-2: Reader Enhancement

| Priority | Task | Owner | Effort | Dependencies |
|----------|------|-------|--------|--------------|
| P0 | EPUB complete rendering integration (Readium 3.x) | iOS | 5 days | - |
| P0 | Reading progress sync optimization | Full-stack | 2 days | - |
| P1 | Full-text search functionality | iOS + API | 3 days | - |
| P1 | Bookmark feature implementation | iOS + API | 2 days | - |
| P2 | Reader gesture optimization (smooth page turning) | iOS | 2 days | - |

**Key Files:**
- `packages/ios/BookLibrio/Views/Reader/EPUBReaderView.swift`
- `packages/api/src/routes/reading-sessions.ts`

#### Week 3-4: Bookshelf & Content Management

| Priority | Task | Owner | Effort | Dependencies |
|----------|------|-------|--------|--------------|
| P0 | Bookshelf sorting (8 sort options) | iOS | 2 days | - |
| P0 | Bookshelf filtering (category/status) | iOS | 2 days | - |
| P1 | Batch selection and operations | iOS | 2 days | - |
| P1 | Long-press quick action menu | iOS | 1 day | - |
| P2 | Reading progress display optimization | iOS | 1 day | - |

**Key Files:**
- `packages/ios/BookLibrio/Views/Profile/MyBookshelfView.swift`
- New: `BookshelfView.swift` (standalone bookshelf page)

### Phase 1 Acceptance Criteria

- [ ] EPUB renders correctly, supports page turning and zooming
- [ ] Bookshelf supports sorting by "Default/Update Time/Reading Progress/Rating"
- [ ] Reader supports full-text search with navigation to results
- [ ] Bookmarks can be added, viewed, deleted, and navigated
- [ ] Reading progress syncs correctly across multiple devices

---

## Phase 2: AI Feature Completion (Weeks 5-8)

### Phase Goals
Elevate AI features from "existing" to "truly usable", implement AI narration as a core differentiator

### Task List

#### Week 5-6: AI Narration Player (Core Feature)

| Priority | Task | Owner | Effort | Dependencies |
|----------|------|-------|--------|--------------|
| P0 | TTS engine integration (system AVSpeechSynthesizer) | iOS | 3 days | - |
| P0 | Narration player UI | iOS | 3 days | TTS engine |
| P0 | Playback controls (play/pause/prev-next chapter) | iOS | 2 days | Player UI |
| P1 | Voice selection feature | iOS | 1 day | TTS engine |
| P1 | Speed control (0.5x-2.0x) | iOS | 1 day | Player UI |
| P1 | Sleep timer | iOS | 1 day | Player UI |
| P2 | Mini player (floating at bottom of bookshelf) | iOS | 2 days | Player UI |

**New Files:**
- `packages/ios/BookLibrio/Views/Reader/AudioPlayerView.swift`
- `packages/ios/BookLibrio/Views/Reader/MiniPlayerView.swift`
- `packages/ios/BookLibrio/Services/TTSManager.swift`

#### Week 7-8: AI Smart Features

| Priority | Task | Owner | Effort | Dependencies |
|----------|------|-------|--------|--------------|
| P0 | AI Q&A real API integration | Full-stack | 3 days | Claude API |
| P1 | AI lookup feature enhancement (dictionary + AI interpretation) | iOS + API | 3 days | - |
| P1 | AI outline generation | API | 2 days | Claude API |
| P2 | AI reading guide cards | iOS | 2 days | AI outline |
| P2 | Q&A history saving | iOS + API | 1 day | - |

**Key Files:**
- `packages/ios/BookLibrio/Views/AI/AIQuestionView.swift`
- `packages/api/src/services/claudeAI.ts`
- `packages/api/src/routes/ai.ts`

### Phase 2 Acceptance Criteria

- [ ] Can narrate any chapter, supports background playback
- [ ] Player supports speed control, timed shutoff
- [ ] Mini player displays on bookshelf/store
- [ ] AI Q&A returns genuine context-relevant answers
- [ ] Lookup shows dictionary definition + AI deep interpretation

---

## Phase 3: Social & Content Discovery (Weeks 9-12)

### Phase Goals
Complete social interactions, improve content discovery efficiency, enhance user engagement

### Task List

#### Week 9-10: Social Feature Completion

| Priority | Task | Owner | Effort | Dependencies |
|----------|------|-------|--------|--------------|
| P0 | Thought visibility settings (public/private/mutual/hidden) | iOS + API | 2 days | - |
| P0 | Friends activity timeline completion | iOS | 3 days | - |
| P1 | Quote card generator | iOS | 3 days | - |
| P1 | Community thoughts browsing (waterfall layout) | iOS | 2 days | - |
| P2 | View friends' reading notes | iOS | 2 days | - |

**Key Files:**
- `packages/ios/BookLibrio/Views/Social/PublishThoughtView.swift`
- `packages/ios/BookLibrio/Views/Profile/ActivityFeedView.swift`
- New: `packages/ios/BookLibrio/Views/Social/QuoteCardView.swift`

#### Week 11-12: Content Discovery Optimization

| Priority | Task | Owner | Effort | Dependencies |
|----------|------|-------|--------|--------------|
| P0 | Category detail filters (word count/payment/sort) | iOS | 3 days | - |
| P1 | Personalized recommendation reasoning display | iOS + API | 2 days | - |
| P1 | Book list detail page | iOS | 2 days | - |
| P1 | Daily book list feature | iOS + API | 2 days | - |
| P2 | Search history and trending searches | iOS | 1 day | - |

**Key Files:**
- `packages/ios/BookLibrio/Views/Store/StoreCategoryView.swift`
- `packages/ios/BookLibrio/Views/Store/StoreHomeView.swift`
- New: `packages/ios/BookLibrio/Views/Store/BookListDetailView.swift`

### Phase 3 Acceptance Criteria

- [ ] Can select visibility scope when publishing thoughts
- [ ] Can generate beautiful quote cards for sharing
- [ ] Category page supports multi-dimensional filtering
- [ ] Recommended books display "Why this was recommended for you"
- [ ] Book list detail page browsable

---

## Phase 4: Monetization & Polish (Weeks 13-16)

### Phase Goals
Implement monetization foundation, refine details, prepare for launch

### Task List

#### Week 13-14: Membership System

| Priority | Task | Owner | Effort | Dependencies |
|----------|------|-------|--------|--------------|
| P0 | Membership benefits display page | iOS | 2 days | - |
| P0 | StoreKit 2 integration | iOS | 3 days | - |
| P0 | Subscription purchase flow | iOS + API | 3 days | StoreKit |
| P1 | Membership status check and permission control | Full-stack | 2 days | Subscription system |
| P2 | Redemption code feature | iOS + API | 2 days | - |

**New Files:**
- `packages/ios/BookLibrio/Views/Membership/MembershipView.swift`
- `packages/ios/BookLibrio/Views/Membership/SubscriptionPlanView.swift`
- `packages/ios/BookLibrio/Services/StoreKitManager.swift`

#### Week 15-16: Polish & Launch Preparation

| Priority | Task | Owner | Effort | Dependencies |
|----------|------|-------|--------|--------------|
| P0 | Reading data share card | iOS | 2 days | - |
| P0 | Settings page completion | iOS | 2 days | - |
| P1 | Profile privacy settings | iOS + API | 2 days | - |
| P1 | Notification system completion | iOS + API | 2 days | - |
| P1 | Performance optimization & bug fixes | All | 3 days | - |
| P2 | App Store submission preparation | iOS | 2 days | - |

**Key Files:**
- `packages/ios/BookLibrio/Views/Profile/ReadingStatsView.swift`
- New: `packages/ios/BookLibrio/Views/Settings/SettingsView.swift`

### Phase 4 Acceptance Criteria

- [ ] Can complete membership subscription purchase flow
- [ ] Non-member content shows correct paywall prompt
- [ ] Reading data can generate share cards
- [ ] Settings page fully functional (notifications/privacy/cache etc.)
- [ ] No P0 bugs, smooth performance

---

## Milestone Timeline

```
Week  1   2   3   4   5   6   7   8   9   10  11  12  13  14  15  16
      |━━━━━━━━━━━|   |━━━━━━━━━━━|   |━━━━━━━━━━━━|   |━━━━━━━━━━━|
      Reader Enhancement  AI Narration    Social Features   Membership
          |━━━━━━━━━━━|   |━━━━━━━━━━━|   |━━━━━━━━━━━|       |━━━━━|
          Bookshelf       AI Smart        Content Discovery  Polish
          Optimization    Features        Optimization       & Launch

🏁 M1: Week 4  - Reading experience complete
🏁 M2: Week 8  - AI features usable
🏁 M3: Week 12 - Social loop complete
🏁 M4: Week 16 - Monetization launch
```

---

## Team Allocation Suggestions (2-3 people)

### Option A: 2-Person Team

| Role | Responsibilities | Skills Required |
|------|------------------|-----------------|
| **iOS Developer** | Reader, UI, Player, StoreKit | Swift/SwiftUI, AVFoundation |
| **Full-Stack Developer** | API, Database, AI Integration, DevOps | Node.js, PostgreSQL, Claude API |

### Option B: 3-Person Team

| Role | Responsibilities | Skills Required |
|------|------------------|-----------------|
| **iOS Lead Developer** | Reader, Player | Swift, PDFKit, Readium |
| **iOS Secondary Developer** | UI, Social, Store | SwiftUI, StoreKit |
| **Backend Developer** | API, AI, Data | Hono, Drizzle, Claude API |

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Readium integration complexity | Reader delay | Reserve 1 week buffer, use WebView fallback if necessary |
| AI cost exceeds expectations | Feature limitations | Implement caching mechanism, limit free user API calls |
| StoreKit review issues | Launch delay | Submit for testing early, familiarize with Apple policies |
| Low social feature adoption | Low ROI | Implement core first, decide on depth based on data |

---

## Expected Feature Completion

| Phase | Bookshelf | Store | Reader | AI | Social | Membership | Overall |
|-------|-----------|-------|--------|-----|--------|------------|---------|
| Current | 40% | 60% | 70% | 55% | 35% | 10% | **46%** |
| Post-M1 | **75%** | 65% | **90%** | 55% | 35% | 10% | **60%** |
| Post-M2 | 75% | 70% | 90% | **85%** | 40% | 10% | **75%** |
| Post-M3 | 80% | **85%** | 92% | 85% | **75%** | 15% | **88%** |
| Post-M4 | 85% | 88% | 95% | 88% | 80% | **80%** | **95%** |

---

## Quick Start: Week 1 Tasks

### This Week's Goal
Complete EPUB rendering and reading progress sync

### Day 1-2: EPUB Rendering
```swift
// EPUBReaderView.swift - Replace placeholder with real rendering
// 1. Configure Readium Navigator
// 2. Implement EPUBNavigatorDelegate
// 3. Handle page turn and position callbacks
```

### Day 3-4: Reading Progress
```swift
// ReadingSessionManager.swift
// 1. Add position storage
// 2. Send current position on heartbeat
// 3. Jump to last position when resuming reading
```

### Day 5: Integration Testing
- Test EPUB opening fluidity
- Test position persistence after exit and re-entry
- Test multi-device sync

---

## Internationalization (i18n) Status

### Current Support

| Platform | Languages | String Count | Implementation |
|----------|-----------|--------------|----------------|
| iOS | English, Simplified Chinese | 1,150+ | L10n.swift + Localizable.strings |
| Web | English, Simplified Chinese | 140+ | React Context |

### Key Files

**iOS:**

- `packages/ios/BookLibrio/Utilities/L10n.swift` - Type-safe localization wrapper
- `packages/ios/BookLibrio/Resources/en.lproj/Localizable.strings` - English
- `packages/ios/BookLibrio/Resources/zh-Hans.lproj/Localizable.strings` - Simplified Chinese

**Web:**

- `packages/web/src/i18n/index.tsx` - React Context implementation

### Covered Features

- ✅ All UI text and labels
- ✅ Reader controls and settings
- ✅ Navigation and tabs
- ✅ Error messages and prompts
- ✅ AI features
- ✅ Social features
- ✅ Membership and store

### Future Plans

| Priority | Task | Status |
|----------|------|--------|
| P2 | Add Traditional Chinese (zh-Hant) | Planned |
| P3 | Add Japanese support | TBD |
| P3 | Add Korean support | TBD |
| P3 | Date/time localization formats | TBD |

> For detailed guide, see [I18N Guide](I18N_GUIDE.md)

---

*Document Version: 1.1*
*Created: 2024-12*
*Updated: 2024-12*
