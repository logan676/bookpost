# BookLibrio Product Concept Document

> **Product Name:** BookLibrio
> **Product Type:** Mobile App (iOS/Android)
> **Document Version:** 1.0
> **Reference:** 65 design screens

---

## 1. Product Overview

### 1.1 Product Positioning

BookLibrio is a comprehensive reading platform that integrates ebook reading, audiobook listening, and social reading features. It delivers a digital reading experience centered on content with social connectivity as a key differentiator.

### 1.2 Core Value Propositions

- **Vast Content Library:** Ebooks, audiobooks, web novels, magazines, and periodicals
- **Intelligent Reading:** AI narration, AI reading guides, AI book Q&A, and smart assistance
- **Social Reading:** Friend activities, thought sharing, reading leaderboards, and community features
- **Achievement System:** Badges, reading challenges, annual reports, and gamification incentives

### 1.3 Target Users

Reading enthusiasts aged 18-55 who seek high-quality reading content and a convenient, engaging reading experience.

---

## 2. Information Architecture

### 2.1 Bottom Navigation Structure

| Tab | Name | Description |
|-----|------|-------------|
| Tab 1 | Reading | Quick entry to current reading, resume reading state |
| Tab 2 | Bookshelf | Personal library management for added books |
| Tab 3 | Store | Browse and discover new content |
| Tab 4 | Friends | Social reading module, friend activities and thoughts |
| Tab 5 | Profile | Personal center, account management, reading data |

### 2.2 Core Feature Modules

| Module | Features |
|--------|----------|
| Store | Category browsing, rankings, book lists, new releases, search, personalized recommendations |
| Reader | Text reading, AI narration, highlights/notes, thoughts, table of contents, AI Q&A, search |
| Audiobooks | AI narration player, voice selection, speed control, sleep timer |
| Social | Friend activities, thought publishing, reading leaderboard, follow/followers |
| Membership | Premium subscription, top-up, redemption codes |
| Achievements | Badge system, reading challenges, reading statistics, annual report |

---

## 3. Feature Module Specifications

### 3.1 Bookshelf Module

#### 3.1.1 Page Structure

- **Top Area:** Search bar + Store entry
- **Action Buttons:** Import (local books), Select (batch operations)
- **Sort Options:** Default, Updated, Progress, Rating, Title, Category, Word Count, Payment Type (horizontal scroll)
- **Book Display:** 3-column grid layout showing cover + title
- **Mini Player:** Floating at bottom, shows current audiobook (cover, chapter, progress, playback controls)

#### 3.1.2 Interaction Rules

- Tap book cover to enter reading page
- Long press book for quick action menu
- Pull down to refresh book status
- Tap mini player to expand full-screen player

### 3.2 Store Module

#### 3.2.1 Store Home

- **Search Bar:** Shows search history
- **Quick Access:** Categories, Rankings, Member Exclusive, Book Lists, Free Books, New This Month
- **For You:** Personalized recommendations with reasoning, supports "refresh" function
- **Daily Book Lists:** Date-marked thematic lists (with source organization)

#### 3.2.2 Category System

Two-tier category structure with primary categories including:

Literature, Premium Fiction, History, Social Novels, Film/TV Adaptations, Personal Growth, Finance, Psychology, Philosophy, Mystery/Thriller, Biography, Health, Fantasy, Military/Politics, Technology, Art, Children's, Education, Science, Lifestyle, Comics, and more.

#### 3.2.3 Category Detail Filters

| Filter Dimension | Options |
|------------------|---------|
| Word Count | All, 0-30K, 30K-100K, 100K+ |
| Payment Type | All, Premium Members, Trial Card |
| Sort | By Popularity, By Rating, By Readers, By Publish Date |

#### 3.2.4 Ranking System

**Ranking Types:** Trending, Hot Search, New Books, Fiction, Film/TV Adaptations, Audiobook Hot Listens, TOP 200, Masterpiece, Potential Masterpiece

- Different rankings have distinct theme colors
- Ranking items show: Rank number, cover, title, author, rating, evaluation tags, reader count

### 3.3 Book Detail Module

#### 3.3.1 Page Structure

**Top Action Bar**
- Back, payment status, audiobook entry, readers count, share, more menu

**Book Basic Info**
- Large cover, title, author (tappable), translator (tappable), synopsis

**Statistics Area**

| Data Item | Description |
|-----------|-------------|
| Reader Count | Total readers / Completed readers |
| My Reading | Reading status marker |
| Word Count | Total words / Publication date |
| Copyright | Publisher information |

**Rating Module**
- Recommendation percentage + score distribution bar chart (Recommend/Average/Poor)
- Write review entry + filter tabs (All/Recommend/Average/Poor)
- Evaluation tags: Masterpiece (>90%), Highly Praised (>85%), Worth Reading (>70%)

**AI Guide Module**
- Topic cards in horizontal scroll showing AI-generated summaries
- Popular highlights: highlight content + highlighter count

**Extended Reading Module**
- Related book recommendations + "refresh" option
- Publisher info: name, work count, follow button, other books from publisher
- Related book lists: user-created curated lists

#### 3.3.2 Bottom Action Bar

- **AI Button:** Enter AI Q&A
- **Add to Shelf:** Add book to personal bookshelf
- **Read:** Primary button, highlighted, start reading

#### 3.3.3 Quick Preview Card

Triggered by long-pressing book cover, displays: Large cover, title, author/translator, rating distribution, reader count, payment type, word count. Supports left-swipe to start reading.

### 3.4 Reader Module

#### 3.4.1 Reading Interface

**Top Action Bar (tap reading area to show)**
- Back, payment status, add to shelf, readers count, share, more menu

**Reading Area**
- Main text display, customizable font size, line spacing, margins
- User highlights (blue background)
- Friend thought bubbles (user avatar on left side)
- Queryable words with wavy underline

**Floating Buttons**
- AI Button: Enter AI Q&A
- Listen Button: Start AI narration

**Bottom Toolbar**

| Button | Function |
|--------|----------|
| Contents | Open TOC/AI Outline/Search panel |
| Toggle | Enable/disable display features |
| Progress | Reading progress info and control |
| Brightness | Brightness, color mode, background selection |
| Font | Font size, margins, spacing, font style, page turn animation |

#### 3.4.2 Text Selection Toolbar

Triggered by long-pressing selected text:

| Action | Description |
|--------|-------------|
| Copy | Copy selected text |
| Highlight | Add highlight, 3 styles, 6 colors |
| Write Thought | Write thought on selection, visibility settings |
| Share Quote | Generate calendar-style card for sharing |
| Lookup | Query word, shows dictionary + AI interpretation + related books |
| Listen | Start AI narration from current position |

#### 3.4.3 Thought Visibility Settings

| Option | Description |
|--------|-------------|
| Public | Visible to everyone |
| Private | Only visible to self |
| Following | Only mutual follows can see |
| Hide from Friends | Only non-followers can see |

#### 3.4.4 Reading Settings

**Brightness/Color/Background**
- Brightness slider
- Color modes: White, Cream, Light Green, Dark (night mode)
- Background: Solid colors, various textures/scenery

**Font & Layout**
- Font size slider with current value display
- Margin: Small / Medium / Large
- Line spacing: Tight / Normal / Loose
- More: Font style, first-line indent, page turn animation

#### 3.4.5 Table of Contents Panel

Three tabs:
- **Search Book:** Full-text search
- **Contents:** Hierarchical chapters, page numbers, current position marker, bookmark support
- **AI Outline:** AI-generated topic summaries and celebrity recommendations

### 3.5 AI Features Module

#### 3.5.1 AI Narration (Audiobook Player)

**Player Interface**
- Cover display, chapter title
- Progress bar (current time / total duration)
- ±15 second skip buttons
- Previous chapter / Play-Pause / Next chapter controls
- Original text view, chapter list entry

**Control Options**

| Function | Description |
|----------|-------------|
| Sleep Timer | Set auto-stop time |
| AI Voice | Select different AI voices |
| Speed | 0.5x - 2.0x playback speed |
| Add to Shelf | Quick add to bookshelf |

#### 3.5.2 AI Book Q&A

- Full-screen chat interface for book-specific AI Q&A
- Preset recommended questions
- Quick tags: Book Highlights, Background Analysis, Key Concepts
- Free-form question input

#### 3.5.3 AI Lookup

- Dictionary definition: pronunciation, meaning, source
- Related book recommendations
- AI interpretation: intelligent analysis with keyword highlighting
- Action buttons: AI Deep Dive, Share
- External search entry

#### 3.5.4 AI Outline

- Book topic summaries (highlighted links)
- Detailed explanations
- Celebrity recommendations: recommender + perspective + identity

### 3.6 Membership System

#### 3.6.1 Premium Member Benefits

- Unlimited access to all published ebooks
- Unlimited audiobook listening
- Unlimited offline downloads, bookshelf, imported books
- AI translation and AI narration support
- PDF to ebook conversion
- Annotation mode and Pencil notes support

#### 3.6.2 Pricing Structure

| Plan Type | Price | Description |
|-----------|-------|-------------|
| Auto-Renewal Monthly | ¥19/month | First month discount available, cancel anytime |
| Monthly Card | ¥30 | Single month purchase |
| Quarterly Card | ¥68 | Three months |
| Annual Card | ¥228 | Best value, ~¥19/month |

#### 3.6.3 Other Payment Methods

- Redemption codes: Enter code to activate membership
- Gift to Friend: Purchase membership as gift
- Single Purchase: Buy individual ebooks permanently

### 3.7 Social Module

#### 3.7.1 Friends Activity Page

- Page title shows book name + today's readers count
- Tab switch: Friends Reading / Community
- Friend cards: Avatar, nickname, reading status, reading duration, notes count, thought content
- Interaction: Like button (heart icon)

#### 3.7.2 Publish Thought

**Publishing Interface**
- Input area: placeholder "Write your thoughts..."
- Media: Add images/books button
- Toolbar: @friend, #add topic, visibility setting
- Actions: Cancel, Publish

**Topic Selection**
- Search box for topics
- Hot topics list: topic name + post count + hot/new tags
- Topic categories: Reading Today, Personal Growth, etc.

**Category Selection**
3-column tag cloud layout including: Community, Growth, Photography, Literature, Poetry, Quotes, Society, Fitness, History, Psychology, Design, Romance, Finance, Philosophy, Fiction, Health, Career, Entertainment, Parenting, Mystery, Sci-Fi, Exam Prep, and more.

#### 3.7.3 Reading Leaderboard

- Weekly reset (Sunday midnight)
- Shows personal ranking and reading duration
- Leaderboard: rank number (1-5 highlighted), avatar, nickname, reading time, like button
- Non-ranked users show (last week) indicator

#### 3.7.4 Share Function

**Share Channels (bottom sheet):**
- Row 1: Share to Friends, Social Media, Status Update, Community
- Row 2: Image Share, Direct Message, External Apps
- Quote Card: Save to gallery, change template

### 3.8 Profile Module

#### 3.8.1 Profile Home

**User Info Area**
- Avatar, nickname, badge entry
- Messages entry, settings entry

**Assets Area**
- Membership: Become Premium - Special Offer
- Balance: Credits balance
- Benefits: Days and bonus credits

**Reading Data Area**
- Reading Leaderboard: Current rank and reading time
- Reading Duration: Total and monthly

**Reading Records (2×2 Grid)**
- Reading: Total books in progress
- Completed: Total books finished
- Notes: Total notes count
- Subscriptions: Subscribed content

**Social Data Area**
- Book Lists: My lists count
- Following: Followers / Following counts

#### 3.8.2 Reading Statistics

**Time Tabs:** Week / Month / Year / Total / Timeline

**Week View**
- Time range selector (previous/next week)
- Weekly reading time, daily average, week-over-week change
- Friend ranking
- Reading challenge entry
- Reading time distribution chart (Mon-Sun bar chart)

**Month/Year/Total View**
- Reading duration statistics
- Core data: Books read, completed, reading days, notes
- Time distribution chart
- Most-read book showcase

**Timeline View**
- Calendar card style showing reading milestones
- Milestone text and associated books

**Share Function**
- Generate reading data card (preference categories, duration, usage days)
- Historical reading bar chart
- Reading preference radar chart

### 3.9 Badge System

#### 3.9.1 Badge Types

| Badge Category | Levels |
|----------------|--------|
| Weekly Challenge | Perfect Week (7 days · 10 hours), Intense Week (7 days · 25 hours) |
| Monthly Challenge | Perfect Month (30 days · 40 hours), Intense Month (31 days · 100 hours) |
| Reading Days | 100, 200, 365 days |
| Consecutive Reading | 30, 90, 180, 365, 500, 1000 days |
| Reading Hours | 100, 500, 1000, 2000, 3000, 5000 hours |
| Books Completed | 10, 50, 100, 200, 500, 1000 books |
| Likes Received | 50, 100, 500, 1000, 2000, 3000 likes |
| Masterpiece Reader | Apprentice (5), Enthusiast (10), Collector (50), Connoisseur (100), Expert (200), Scholar (500) |
| Book Reviews | 5, 10, 50, 100, 200, 500 reviews |
| Book Recommender | Sharer (10), Guide (100), Curator (500), Navigator (1000), Trendsetter (3000), Lighthouse (5000) |

#### 3.9.2 Badge Display

- Premium dark background design
- 3D badge icon display
- Progress hint (e.g., "91 more days to earn")
- Community entry (share badge collection)

#### 3.9.3 Badge Detail Modal

- Full-screen dark background + centered card
- 3D badge showcase
- Badge name, unlock conditions, timestamp
- Total earners count

### 3.10 Personal Page Module

#### 3.10.1 Page Display

- Large avatar, nickname, gender tag
- Core stats: Reading time, likes received, followers
- Bookshelf: Recent reading activity, book covers, view shelf
- Thoughts: Thought list, delete support
- Privacy note: Reading records visible only to followers

#### 3.10.2 Page Settings

**Display Module Toggles**
- Bookshelf, Favorite Books, Book Lists, Badges, Thoughts (each independently toggleable)

**Visibility Settings**

| Option | Description |
|--------|-------------|
| Only Me | Profile not publicly visible |
| Mutual Follows | Only mutual follows can see |
| Followers | Followers can see |
| Everyone | Fully public |

### 3.11 Settings Module

#### 3.11.1 Reading Settings

| Setting | Type | Description |
|---------|------|-------------|
| Keep Screen On | Toggle | Screen stays on while reading |
| Allow Landscape | Toggle | Support landscape reading |
| Hide Others' Thoughts | Toggle | Don't show other users' thoughts |
| Show Time & Battery | Toggle | Display status bar |
| First Line Indent | Toggle | Paragraph indentation |
| Left Tap Next Page | Toggle | Customize tap zones |
| Filter Web Novels | Toggle | Exclude web novels from search/recommendations |
| Auto Download on Add | Entry | Auto offline download settings |
| Page Turn Style | Select | Left-right swipe, etc. |
| Dark Mode | Select | Follow system / Manual |

#### 3.11.2 Other Settings

- Privacy settings
- Student verification (exclusive badge and membership benefits)
- Youth mode (content filtering)
- Notifications
- Logged-in devices
- Clear cache
- Content submission
- Business inquiries
- About
- Help & Feedback
- Log out

---

## 4. Reader More Actions

Bottom sheet triggered by tapping more button in reader:

| Function | Description |
|----------|-------------|
| Review Book | Quick rating: Recommend/Average/Poor |
| Download | Offline download |
| Auto Page Turn | Automatic reading mode |
| Add Bookmark | Mark current position |
| Add to List | Add to custom book list |
| Search Book | Full-text search |
| View Notes | View my notes and highlights |
| Popular Highlights | View community highlights |
| Gift to Friend | Share book with friends |
| Report Error | Report content errors |
| Private Reading | Hide reading record |
| Community Thoughts | View community thoughts |
| Friend Notes | View friends' notes |

---

## 5. Data Field Specifications

### 5.1 Book Information Fields

| Field | Type | Description |
|-------|------|-------------|
| Title | String | Book title |
| Author | String | Author name, tappable to author page |
| Translator | String | Translator name (if applicable) |
| Cover | Image | Book cover image |
| Synopsis | String | Book description |
| Word Count | Number | Total words (in 10K units) |
| Publish Date | Date | Publication year/month |
| Publisher | String | Publisher name |
| Rating | Float | Percentage (e.g., 76.7%) |
| Reader Count | Number | Total readers |
| Completed Count | Number | Readers who finished |
| Today Reading | Number | Today's readers |
| Payment Type | Enum | Free / Premium / Purchase |
| Categories | Array | Category tags |

### 5.2 User Data Fields

| Field | Type | Description |
|-------|------|-------------|
| Nickname | String | User nickname |
| Avatar | Image | User avatar |
| Gender | Enum | Male / Female / Not set |
| Total Reading Time | Number | Cumulative minutes |
| Reading Days | Number | Cumulative days |
| Books Read | Number | Books started |
| Books Completed | Number | Books finished |
| Notes Count | Number | Total notes |
| Following | Number | Following count |
| Followers | Number | Followers count |
| Likes Received | Number | Total likes |
| Membership | Object | Type, expiry date |
| Credit Balance | Float | Top-up balance |
| Registration Date | Date | First use date |

---

## 6. Interaction Specifications

### 6.1 Gesture Operations

| Gesture | Trigger | Response |
|---------|---------|----------|
| Tap | Reading area | Show/hide toolbars |
| Swipe L/R | Reading area | Turn page |
| Long Press | Text area | Select text, show action toolbar |
| Long Press | Book cover | Show quick preview card |
| Pull Down | List pages | Refresh content |
| Swipe Left | Preview card | Start reading |
| Swipe Right/Down | Query overlay | Close overlay |

### 6.2 Loading States

- Page loading: Show skeleton screen
- List loading: Bottom loading indicator
- Pull refresh: Top pull animation
- AI processing: Thinking animation with progress

### 6.3 Empty States

- Empty bookshelf: Guide user to store
- No search results: Show no-result message
- Badge not earned: Show unlock conditions and progress

### 6.4 Modal Specifications

- Bottom Sheet: Share panel, more actions, filters
- Center Modal: Payment prompt, badge details
- Full-screen Overlay: Query results, AI Q&A
- Toast: Success/failure feedback

---

## Appendix: Design Screen Index

This document is based on 65 design screens covering:

- AI Reading / Audiobook Player
- Bookshelf
- Category (Primary)
- Category Detail (with filters)
- Store Home
- Rankings (Trending, New, Fiction, etc.)
- Book Detail (info, ratings, AI guide, extended reading)
- Quick Preview Card
- Reader (text, toolbars, settings)
- Text Selection Toolbar (highlight, thought, share)
- TOC/AI Outline/Search Panel
- Friends Activity
- Share Panel
- Reader More Actions
- Payment/Membership Prompts
- Membership Purchase
- AI Q&A
- Query Results (Dictionary + AI)
- Reading Progress/Settings
- Profile Home
- Settings
- Reading Statistics (Week/Month/Year/Total/Timeline)
- Reading Data Share Card
- Badges (all categories)
- Badge Detail Modal
- Reading Leaderboard
- Personal Page
- Personal Page Settings
- Publish Thought
- Topic/Category Selection

---

*Document End*
