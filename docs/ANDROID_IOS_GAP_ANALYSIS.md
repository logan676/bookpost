# BookLibrio Android vs iOS Gap Analysis

> Generated: 2024-12-14
> Last Updated: 2025-12-14
> Goal: Make Android client fully consistent with iOS

---

## 1. App Icon ❌ Needs Fix

### Current Differences

| Item | iOS | Android |
|------|-----|---------|
| Icon Type | PNG bitmap (professionally designed) | Vector graphic (simple book icon) |
| Size Coverage | Complete size set (20-1024px) | Only adaptive icon |
| Visual Effect | Branded design | Temporary placeholder |

### Required Actions
- [ ] Copy `AppIcon-1024.png` from iOS as source file
- [ ] Use Android Studio to generate all density mipmap resources
- [ ] Replace `mipmap-*/ic_launcher*.png` and `ic_launcher_round*.png`

---

## 2. Navigation Structure ✅ Completed

### iOS Navigation (3 Tabs)
```
TabView
├── Bookshelf - books.vertical icon
│   └── MyBookshelfView (includes Recent Reading)
├── Store - storefront icon
│   └── StoreTabView (internal switch: Ebooks | Magazines)
└── Profile - person icon
    └── ProfileView
```

### Android Navigation (3 Tabs) ✅ Synchronized
```
BottomNavigation
├── Bookshelf - ic_bookshelf icon
│   └── MyBookshelfScreen (includes Recent Reading)
├── Store - ic_store icon
│   └── StoreScreen (internal switch: Ebooks | Magazines)
└── Profile - Person icon
    └── ProfileScreen
```

### Completed
- [x] Changed from 5 Tab to 3 Tab structure
- [x] Tab 1: Bookshelf - merged Home and MyBookshelf
- [x] Tab 2: Store - internal top switch (Ebooks | Magazines), not in bottom navigation
- [x] Tab 3: Profile - kept as Profile
- [x] Removed independent Books Tab (physical books shown in bookshelf)
- [x] Updated icons: bookshelf / store / person

---

## 3. Bookshelf Page ✅ Completed

### iOS MyBookshelfView Features
- Top: Recent Reading (horizontal scroll)
- Segmented Control: All | Ebooks | Magazines | Physical Books
- Filter Status: Reading | Want to Read | Finished
- Search Bar
- Grid/List Toggle
- Book Cards (cover + reading progress bar)
- Empty State Guidance

### Android Status ✅ Synchronized
- MyBookshelfScreen created, fully functional
- Recent Reading horizontal scroll
- Segmented Control (All | Ebooks | Magazines | Physical Books)
- Filter Chips (Reading | Want to Read | Finished)
- Search Bar
- Grid/List View Toggle
- Book Cards with Progress Bar
- Empty State Guidance
- Pull-to-Refresh

### Completed
- [x] Created `MyBookshelfScreen.kt` to replace `HomeScreen.kt`
- [x] Implemented Segmented Control (SegmentedButton)
- [x] Implemented Filter Chips
- [x] Implemented Grid/List View Toggle
- [x] Added Progress Bar to Book Cards

---

## 4. Store Page ⚠️ Mostly Completed

### iOS StoreTabView Features
- Top Segment: Ebooks | Magazines (Picker/SegmentedControl)
- Ebooks Page:
  - Banner Carousel
  - Category Grid
  - Rankings Entry
  - Featured Recommendations
- Magazines Page:
  - Publisher Filter
  - Year Filter
  - Magazine Grid

### Android Status ✅ Refactored
- StoreScreen unified entry created
- Internal TabRow to switch Ebooks/Magazines
- Search Bar functionality
- Category Chip Filter (Ebooks)
- Publisher/Year Filter (Magazines)
- Grid Layout

### Completed
- [x] Created `StoreScreen.kt` unified entry
- [x] Internal top TabRow to switch Ebooks/Magazines
- [x] Added Category Grid

### To Be Improved
- [ ] Add Banner Carousel component
- [ ] Add Rankings Entry

---

## 5. Reader ⚠️ Mostly Completed

### iOS EPUB Reader Features
| Feature | iOS | Android | Status |
|---------|-----|---------|--------|
| Basic Reading | ✅ Readium | ✅ WebView + epub.js | ✅ |
| Table of Contents | ✅ | ✅ TableOfContentsSheet | ✅ |
| Bookmarks | ✅ | ✅ BookmarksSheet | ✅ |
| Search | ✅ EPUBSearchView | ✅ ReaderSearchBar | ✅ |
| Highlighting | ✅ Multi-color | ⚠️ Basic implementation | 70% |
| Notes | ✅ | ⚠️ Basic implementation | 70% |
| Font Settings | ✅ 4 fonts | ✅ 4 fonts | ✅ |
| Color Modes | ✅ 4 modes | ✅ 4 modes | ✅ |
| Line/Margin Spacing | ✅ | ✅ | ✅ |
| Page Turn Animation | ✅ Multiple | ⚠️ Horizontal only | 50% |
| Text Selection Menu | ✅ Complete | ⚠️ Basic | 50% |
| Friends' Thoughts Overlay | ✅ | ✅ SocialFeaturesSheet | ✅ |
| AI Feature Entry | ✅ | ✅ AIFeaturesSheet | ✅ |

### Completed
- [x] Implemented Bookmarks feature (BookmarksSheet)
- [x] Implemented In-book Search (ReaderSearchBar)
- [x] Added AI Feature Entry (AIFeaturesSheet)
- [x] Added Friends' Thoughts/Social Features (SocialFeaturesSheet)

### To Be Improved
- [ ] Enhance Highlighting (multi-color selection UI)
- [ ] Enhance Notes feature (more complete editing UI)
- [ ] Add more page turn animations
- [ ] Enhance Text Selection Menu (dictionary, AI, share)

---

## 6. Profile ⚠️ Mostly Completed

### iOS ProfileView Features
| Feature | iOS | Android | Status |
|---------|-----|---------|--------|
| Avatar | ✅ Uploadable | ⚠️ Display only | 50% |
| Username/Email | ✅ | ✅ | ✅ |
| Reading Stats Entry | ✅ | ✅ ReadingStatsScreen | ✅ |
| Badges Entry | ✅ | ✅ BadgesScreen | ✅ |
| Reading Streak | ✅ Dedicated page | ✅ StreakScreen | ✅ |
| Leaderboard Entry | ✅ | ✅ LeaderboardScreen | ✅ |
| Daily Goals Entry | ✅ | ✅ DailyGoalsScreen | ✅ |
| Book Lists Entry | ✅ | ✅ BookListsScreen | ✅ |
| Notes Entry | ✅ | ✅ NotesListScreen | ✅ |
| Activity Feed | ✅ | ❌ | 0% |
| Timeline Milestones | ✅ | ❌ | 0% |
| Following/Followers | ✅ | ❌ | 0% |
| Settings Entry | ✅ | ✅ SettingsScreen | ✅ |
| Membership Entry | ✅ | ❌ | 0% |
| Redemption Code Entry | ✅ | ❌ | 0% |

### Completed
- [x] Standalone StreakScreen
- [x] Standalone LeaderboardScreen
- [x] NotesListScreen

### To Be Improved
- [ ] Avatar Upload functionality
- [ ] ActivityFeedScreen
- [ ] TimelineStatsScreen
- [ ] FollowListScreen
- [ ] MembershipScreen
- [ ] RedeemCodeScreen

---

## 7. Badge System ✅ Implemented

Android has implemented the complete 16-category badge system, consistent with iOS.

---

## 8. Reading Statistics ⚠️ Partial Differences

### iOS Features
- Week/Month/Year/All-time/Calendar multi-dimension
- Time Comparison (vs last week/month)
- Friends Ranking
- Reading Records Grid
- Share Card

### Android Status
- ✅ Multi-dimension Views
- ✅ Time Comparison
- ✅ Friends Ranking
- ⚠️ Records Grid (basic)
- ❌ Share Card

### To Be Added
- [ ] Enhance Records Grid display
- [ ] Add Share Card feature (StatsShareCardView)

---

## 9. AI Features ⚠️ Mostly Completed

### iOS AI Features
- AIGuideView - AI Learning Guide
- AILookupView - AI Dictionary Lookup
- AIOutlineView - AI Generated Outline
- AIQuestionView - AI Q&A

### Android Status ✅ Implemented
- Data Models created (AIModels.kt)
  - AIGuide (Learning Guide)
  - DictionaryResult (Dictionary Lookup)
  - BookOutline (Outline Generation)
  - AIChatMessage (Q&A)
- AIFeaturesSheet integrated into reader
- Full ViewModel support

### Completed
- [x] Created AI Data Models
- [x] Added AI Entry in Reader (AIFeaturesSheet)
- [x] ViewModel Integration

### To Be Improved
- [ ] Standalone AI Feature Pages (optional, currently accessed via Sheet)

---

## 10. Audio Player ⚠️ Models Completed

### iOS Features
- AudioPlayerView - Full Player
- MiniPlayerView - Mini Player Bar
- SleepTimerView - Sleep Timer
- VoiceSelectionView - Voice Selection

### Android Status
- Data Models created (AudioModels.kt)
  - Playback State Model
  - Voice Selection Model
  - Sleep Timer Model
- UI Components pending

### Completed
- [x] Created Audio Data Models

### To Be Improved
- [ ] AudioPlayerScreen
- [ ] MiniPlayerBar (Composable)
- [ ] SleepTimerSheet
- [ ] VoiceSelectionSheet

---

## 11. Social Features ⚠️ Mostly Completed

### iOS Features
| Feature | iOS | Android | Status |
|---------|-----|---------|--------|
| Publish Thought | ✅ PublishThoughtView | ❌ | 0% |
| Popular Highlights | ✅ PopularHighlightsView | ✅ SocialFeaturesSheet | ✅ |
| Share Quote | ✅ ShareQuoteCardView | ⚠️ Model exists | 50% |
| Share Sheet | ✅ ShareSheet | ⚠️ Model exists | 50% |
| Topic Selection | ✅ TopicSelectionView | ❌ | 0% |
| Friends' Thoughts Overlay | ✅ | ✅ SocialFeaturesSheet | ✅ |

### Completed
- [x] Social Data Models (SocialModels.kt)
- [x] Popular Highlights feature (SocialFeaturesSheet)
- [x] Friends' Thoughts Overlay

### To Be Improved
- [ ] PublishThoughtScreen
- [ ] ShareQuoteCard (complete UI)
- [ ] TopicSelectionSheet

---

## 12. Onboarding and Settings ✅ Completed

### iOS Features
- OnboardingView - New User Onboarding
- SettingsView - Detailed Settings

### Android Status ✅ Synchronized
- ✅ OnboardingScreen - 4-page onboarding flow (HorizontalPager)
  - Library Introduction
  - Smart Bookshelf
  - Reading Statistics
  - AI Reader
  - Skip/Next/Previous Navigation
  - Get Started Button
- ✅ SettingsScreen - Complete Settings
  - Dark Mode Toggle
  - Language Selection (Follow System/Chinese/English)
  - Push Notifications
  - Cache Management
  - About and Help

### Completed
- [x] OnboardingScreen (first launch)
- [x] Enhanced SettingsScreen

---

## 13. Localization ✅ Completed

### iOS
- Uses L10n localization system
- Supports English and Simplified Chinese

### Android ✅ Synchronized
- Complete localization system
- strings.xml (Chinese default)
- values-en/strings.xml (English)
- 176+ string entries
- Coverage:
  - Navigation tabs (Bookshelf/Store/Profile)
  - Bookshelf segments (All/Ebooks/Magazines/Physical Books)
  - Reading Status (Reading/Want to Read/Finished)
  - Reader Controls (Search/Bookmarks/Table of Contents)
  - AI Features (Learning Guide/Lookup/Outline/Q&A)
  - Settings Language Selection

### Completed
- [x] Created `strings.xml` resources
- [x] Extracted all hardcoded strings
- [x] Support English/Chinese switching

---

## Priority Ranking (Updated)

### P0 - Immediate Fix (Affects Core Experience)
1. ❌ App Icon - Replace with iOS icon (only remaining P0 item)
2. ~~❌ Navigation Structure - 3 Tab restructure~~ ✅ Completed
3. ~~❌ Bookshelf Page - Create MyBookshelfScreen~~ ✅ Completed

### P1 - High Priority (Major Feature Differences)
4. ~~❌ Store Page - Structure reorganization~~ ✅ Mostly completed (carousel/rankings pending)
5. ~~⚠️ Reader Enhancement - Bookmarks, search, AI entry~~ ✅ Mostly completed
6. ⚠️ Profile Completion - Remaining: Activity Feed, Timeline, Following, Membership, Redemption Code

### P2 - Medium Priority (Feature Completion)
7. ~~❌ AI Feature Module~~ ✅ Implemented (Models + Sheet)
8. ⚠️ Social Features - Remaining: Publish Thought, Topic Selection
9. ⚠️ Reading Stats Enhancement - Remaining: Share Card

### P3 - Low Priority (Nice to Have)
10. ⚠️ Audio Player - Models completed, UI pending
11. ~~❌ Onboarding Pages~~ ✅ Completed
12. ~~⚠️ Localization~~ ✅ Completed

---

## File Count Comparison (Updated)

| Category | iOS | Android | Gap | Notes |
|----------|-----|---------|-----|-------|
| Views/Pages | 88 | ~70 | -18 | Significantly reduced |
| Data Models | 18 | 15+ | -3 | Nearly consistent |
| API Services | 4 | 10 | +6 | Android more granular |
| ViewModels | 8 | 15+ | +7 | Android more granular |

---

## Completion Overview

| Module | Original Status | Current Status | Completion |
|--------|-----------------|----------------|------------|
| App Icon | ❌ | ❌ | 0% |
| Navigation Structure | ❌ | ✅ | 100% |
| Bookshelf Page | ❌ | ✅ | 100% |
| Store Page | ❌ | ⚠️ | 80% |
| Reader | ⚠️ | ⚠️ | 80% |
| Profile | ⚠️ | ⚠️ | 70% |
| Badge System | ✅ | ✅ | 100% |
| Reading Statistics | ⚠️ | ⚠️ | 80% |
| AI Features | ❌ | ⚠️ | 80% |
| Audio Player | ❌ | ⚠️ | 30% |
| Social Features | ❌ | ⚠️ | 60% |
| Onboarding/Settings | ❌ | ✅ | 100% |
| Localization | ❌ | ✅ | 100% |

**Overall Completion: ~80%**

---

## Remaining Work Estimate

| Task | Estimated Time |
|------|----------------|
| P0 Tasks (App Icon) | 0.5 day |
| P1 Remaining (Carousel/Profile) | 2-3 days |
| P2 Remaining (Social/Share) | 2-3 days |
| P3 Remaining (Audio UI) | 2-3 days |
| **Total** | **6-10 days** |

*Compared to original estimate of 18-27 days, approximately 70% of work has been completed*

---

## Appendix: iOS Project File List

<details>
<summary>Expand to view complete file list</summary>

### Views (88 files)
- Auth: LoginView, RegisterView
- Home: HomeView
- Reader: EPUBReaderView, PDFReaderView, EnhancedPDFReaderView, ReaderContainerView, ReaderSettingsSheet, ReaderDisplayToggleSheet, ReaderMoreActionsSheet, ReaderTOCTabView, EPUBBookmarksView, EPUBSearchView, EPUBNavigatorViewController, FriendThoughtBubble, FriendThoughtsOverlay, TextSelectionMenu
- Profile: ProfileView, BadgesView, BadgeDetailView, Badge3DView, BadgeTransitionView, ReadingStatsView, StreakView, DailyGoalsView, LeaderboardView, MyBookshelfView, ActivityFeedView, TimelineStatsView, TimelineMilestoneRow, ReadingRecordsGridView, StatsShareCardView, FollowListView, UserProfileView, ProfileAssetsView, ProfileCharts
- Store: StoreTabView, StoreHomeView, EbookStoreView, MagazineStoreView, StoreCategoryView, StoreSearchView, StoreRankingView, StoreSections
- BookLists: BookListsView, BookListDetailView, CreateBookListView, AddToListSheet, BookListCard
- Social: PublishThoughtView, PopularHighlightsView, ShareQuoteCardView, ShareSheet, TopicSelectionView
- Notes: NotesListView, NoteDetailView, NoteCard
- AI: AIGuideView, AILookupView, AIOutlineView, AIQuestionView
- Audio: AudioPlayerView, MiniPlayerView, SleepTimerView, VoiceSelectionView
- Category: CategoryGridView, CategoryDetailView
- Components: BookCoverView, CachedAsyncImage, LoadingView, SearchBarView, UserAvatarView
- Shared: BookDetailView, BookDetailSections, ReviewFormView
- Other: SettingsView, OnboardingView, MembershipView, RedeemCodeView

</details>
