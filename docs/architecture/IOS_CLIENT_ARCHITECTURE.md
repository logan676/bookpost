# BookPost iOS Native Client - Complete Architecture Design

Based on the WeRead (微信读书) PRD v1.0

## Document Info

| Item | Value |
|------|-------|
| Version | 1.0 |
| Created | 2025-12-10 |
| Target iOS | 16.0+ |
| Based On | WeRead PRD v1.0 (65 design pages) |

---

## 1. Product Overview

### 1.1 Product Positioning

BookPost iOS is a comprehensive reading platform combining:
- **Digital Books**: E-books in EPUB/PDF formats
- **Audiobooks**: AI-powered text-to-speech reading
- **Magazines**: PDF-based periodicals
- **Social Reading**: Share thoughts, highlights, and reading progress

### 1.2 Core Values

| Feature | Description |
|---------|-------------|
| Massive Content | Books, audiobooks, magazines, web novels |
| Smart Reading | AI narration, AI guides, AI Q&A |
| Social Reading | Friends' activities, thoughts sharing, leaderboards |
| Achievement System | Badges, reading challenges, annual reports |

### 1.3 Target Users

Reading enthusiasts aged 18-55 seeking high-quality reading content and convenient reading experience.

---

## 2. Information Architecture

### 2.1 Bottom Tab Navigation

```
┌─────────────────────────────────────────────────────────────────┐
│                        BookPost iOS                              │
├────────────┬────────────┬────────────┬────────────┬─────────────┤
│   阅读      │    书架     │    书城     │   书友      │     我      │
│  Reading   │  Bookshelf │   Store    │  Friends   │   Profile   │
│     📖     │     📚     │     🏪     │    👥      │     👤      │
└────────────┴────────────┴────────────┴────────────┴─────────────┘
```

| Tab | Name | Function |
|-----|------|----------|
| Tab 1 | Reading | Current book entry, quick resume reading |
| Tab 2 | Bookshelf | Personal bookshelf, manage added books |
| Tab 3 | Store | Browse books, categories, rankings, recommendations |
| Tab 4 | Friends | Social module, view friends' activities and thoughts |
| Tab 5 | Profile | Personal center, account management, reading data |

### 2.2 Core Feature Modules

| Module | Features |
|--------|----------|
| Store | Categories, rankings, book lists, new releases, search, personalized recommendations |
| Reader | Text reading, AI narration, highlights, thoughts, TOC, AI Q&A, search |
| Audiobook | AI voice player, voice selection, speed control, sleep timer |
| Social | Friends' activities, thought publishing, reading leaderboards, follow/followers |
| Membership | Paid membership, top-up, combined memberships, redemption codes |
| Achievements | Badge system, reading challenges, statistics, annual reports |

---

## 3. System Architecture

### 3.1 Overall Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            iOS CLIENT LAYER                                  │
│                         (Swift + SwiftUI + MVVM)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │    Views    │  │ ViewModels  │  │  Services   │  │   Local Storage     │ │
│  │  (SwiftUI)  │  │(@Observable)│  │ (Networking)│  │  (SwiftData/Core)   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Feature Modules                             │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │   │
│  │  │Reading │ │Bookshelf│ │ Store  │ │Friends │ │Profile │ │  AI    │  │   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Core Frameworks                             │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────┐    │   │
│  │  │   PDFKit   │ │   AVKit    │ │  AVSpeech  │ │  ReadiumKit    │    │   │
│  │  │  (PDF)     │ │  (Audio)   │ │  (TTS)     │ │  (EPUB)        │    │   │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │ HTTPS
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            API LAYER (Hono)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  /auth  /ebooks  /magazines  /audiobooks  /ai  /social  /user  /membership  │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          ▼                      ▼                      ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│    Supabase      │   │  Cloudflare R2   │   │   Claude API     │
│   PostgreSQL     │   │   (Storage)      │   │   (AI Features)  │
└──────────────────┘   └──────────────────┘   └──────────────────┘
```

### 3.2 Tech Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| Language | Swift 5.9+ | Modern Swift features |
| UI Framework | SwiftUI | Declarative UI |
| Architecture | MVVM + @Observable | Data flow management |
| PDF Reader | PDFKit | Native PDF rendering |
| EPUB Reader | ReadiumKit | EPUB parsing & rendering |
| Audio | AVFoundation | Audio playback |
| TTS | AVSpeechSynthesis + AI | Text-to-speech |
| Networking | URLSession + async/await | API communication |
| Local Storage | SwiftData | Offline caching |
| Analytics | Firebase Analytics | User behavior tracking |

---

## 4. Feature Modules Detailed Design

### 4.1 Bookshelf Module (书架)

#### 4.1.1 Page Structure

```
┌─────────────────────────────────────────────────┐
│  🔍 Search         [Import] [Select]   书城 >   │ <- Top Bar
├─────────────────────────────────────────────────┤
│ [默认] [更新] [进度] [推荐值] [书名] [分类] [字数]│ <- Sort Options (Horizontal Scroll)
├─────────────────────────────────────────────────┤
│  ┌─────┐  ┌─────┐  ┌─────┐                     │
│  │ 📕  │  │ 📗  │  │ 📘  │                     │ <- 3-Column Grid
│  │Book1│  │Book2│  │Book3│                     │
│  └─────┘  └─────┘  └─────┘                     │
│  ┌─────┐  ┌─────┐  ┌─────┐                     │
│  │ 📙  │  │ 📒  │  │ 📓  │                     │
│  │Book4│  │Book5│  │Book6│                     │
│  └─────┘  └─────┘  └─────┘                     │
├─────────────────────────────────────────────────┤
│  🎧 [Cover] Chapter Name ━━━━━━━○───── ▶️      │ <- Mini Player (Floating)
└─────────────────────────────────────────────────┘
```

#### 4.1.2 Data Model

```swift
struct BookshelfItem: Identifiable, Codable {
    let id: Int
    let bookId: Int
    let bookType: BookType // ebook, audiobook, magazine
    let title: String
    let author: String
    let coverUrl: String
    let progress: Double // 0.0 - 1.0
    let lastReadAt: Date
    let isDownloaded: Bool
    let addedAt: Date

    // Sorting fields
    let recommendScore: Double?
    let wordCount: Int?
    let categoryId: Int?
    let updateTime: Date?
}

enum BookshelfSortOption: String, CaseIterable {
    case `default` = "默认"
    case update = "更新"
    case progress = "进度"
    case recommend = "推荐值"
    case title = "书名"
    case category = "分类"
    case wordCount = "字数"
    case paid = "付费"
}
```

#### 4.1.3 Interactions

| Action | Response |
|--------|----------|
| Tap book cover | Navigate to reader |
| Long press book | Show quick action menu |
| Pull down | Refresh book status |
| Tap mini player | Expand full audio player |

### 4.2 Book Store Module (书城)

#### 4.2.1 Store Home Structure

```
┌─────────────────────────────────────────────────┐
│  🔍 搜索                                        │ <- Search Bar
├─────────────────────────────────────────────────┤
│ [分类] [榜单] [会员专享] [书单] [免费书] [当月新书]│ <- Quick Entries
├─────────────────────────────────────────────────┤
│  猜你喜欢                          换一批 >      │
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐           │ <- Personalized Recs
│  │     │  │     │  │     │  │     │           │
│  └─────┘  └─────┘  └─────┘  └─────┘           │
│  因为你看过《XXX》                              │ <- Recommendation Reason
├─────────────────────────────────────────────────┤
│  📅 12月10日 · 每日书单                         │
│  ┌───────────────────────────────────────────┐ │
│  │    今日主题书单 - 来自 XXX 机构            │ │ <- Daily Book List
│  └───────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│  热门书籍                              更多 >   │
│  ┌─────┐  ┌─────┐  ┌─────┐                     │
│  │     │  │     │  │     │                     │
│  └─────┘  └─────┘  └─────┘                     │
└─────────────────────────────────────────────────┘
```

#### 4.2.2 Category System

Two-level category structure:

**Level 1 Categories:**
```swift
enum BookCategory: String, CaseIterable {
    case wereadOriginal = "微信读书出品"
    case audiobook = "有声书"
    case memberExclusive = "会员专享"
    case magazine = "期刊杂志"
    case literature = "文学"
    case premiumNovel = "精品小说"
    case history = "历史"
    case socialNovel = "社会小说"
    case filmOriginal = "影视原著"
    case personalGrowth = "个人成长"
    case finance = "经济理财"
    case psychology = "心理"
    case philosophy = "哲学宗教"
    case mystery = "悬疑推理"
    case biography = "人物传记"
    case health = "医学健康"
    case fantasy = "玄幻小说"
    case politics = "政治军事"
    case computer = "计算机"
    case art = "艺术"
    case children = "童书"
    case education = "教育学习"
    case science = "科学技术"
    case lifestyle = "生活百科"
    case foreignBooks = "原版书"
    case manga = "漫画"
    case maleNovel = "男生小说"
    case femaleNovel = "女生小说"
}
```

#### 4.2.3 Category Filter Options

```swift
struct CategoryFilter {
    enum WordCount: String, CaseIterable {
        case all = "全部"
        case under3k = "0-3万字"
        case range3to10k = "3-10万字"
        case over10k = "10万字以上"
    }

    enum PaymentType: String, CaseIterable {
        case all = "全部"
        case memberReadable = "付费会员可读"
        case trialReadable = "体验卡可读"
    }

    enum SortBy: String, CaseIterable {
        case hotness = "按热度排序"
        case recommend = "按推荐值排序"
        case readers = "按阅读人数排序"
        case publishDate = "按出版时间排序"
    }
}
```

#### 4.2.4 Ranking System

```swift
struct Ranking: Identifiable {
    let id: Int
    let type: RankingType
    let themeColor: Color
    let items: [RankingItem]
}

enum RankingType: String {
    case trending = "飙升榜"
    case hotSearch = "热搜榜"
    case newRelease = "新书榜"
    case novel = "小说榜"
    case filmOriginal = "影视原著榜"
    case maleNovel = "男生小说榜"
    case femaleNovel = "女生小说榜"
    case audioHot = "有声热听榜"
    case top200 = "TOP200总榜"
    case masterpiece = "神作榜"
    case masterpiecePotential = "神作潜力榜"
}

struct RankingItem: Identifiable {
    let rank: Int
    let book: BookSummary
    let recommendScore: Double
    let evaluationTags: [String]
    let readerCount: Int
}
```

### 4.3 Book Detail Module (书籍详情)

#### 4.3.1 Page Structure

```
┌─────────────────────────────────────────────────┐
│  < [付费] 🎧听书  👥 1.2万人在读  ↗  ···        │ <- Top Bar
├─────────────────────────────────────────────────┤
│      ┌───────────┐                              │
│      │           │    书名                      │
│      │   Cover   │    作者 · 译者              │ <- Book Info
│      │           │    简介摘要...               │
│      └───────────┘                              │
├─────────────────────────────────────────────────┤
│  阅读人数        我的阅读          字数          │
│  1.2万/读完      在读中        30万字/2020.01   │ <- Stats
├─────────────────────────────────────────────────┤
│  推荐值 76.7%                                   │
│  ████████████░░░░  推荐 | 一般 | 不行           │ <- Recommend Score
│  [写点评] [全部(1234)] [推荐] [一般] [不行]      │
├─────────────────────────────────────────────────┤
│  🤖 AI导读                                      │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐              │ <- AI Guide (Horizontal)
│  │主题1│ │主题2│ │主题3│ │主题4│              │
│  └─────┘ └─────┘ └─────┘ └─────┘              │
├─────────────────────────────────────────────────┤
│  热门划线                                 更多 > │
│  "划线内容..."                   👥 1234人划过  │
├─────────────────────────────────────────────────┤
│  延展阅读                          换一批 >     │
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐          │
│  │     │  │     │  │     │  │     │          │
│  └─────┘  └─────┘  └─────┘  └─────┘          │
├─────────────────────────────────────────────────┤
│  出版社: XX出版社                    + 关注     │
│  其他作品...                                    │
├─────────────────────────────────────────────────┤
│  延展书单                                       │
│  [书单1] [书单2] [书单3]                        │
├─────────────────────────────────────────────────┤
│  🤖 AI问书        [加入书架]         [阅读]     │ <- Bottom Bar
└─────────────────────────────────────────────────┘
```

#### 4.3.2 Book Data Model

```swift
struct BookDetail: Identifiable, Codable {
    let id: Int
    let title: String
    let author: String
    let translator: String?
    let coverUrl: String
    let description: String

    // Statistics
    let wordCount: Int
    let publishDate: Date
    let publisher: String
    let readersCount: Int
    let finishedCount: Int
    let todayReadersCount: Int

    // Evaluation
    let recommendScore: Double // Percentage 0-100
    let ratingDistribution: RatingDistribution
    let evaluationTags: [EvaluationTag]

    // Payment
    let paymentType: PaymentType
    let price: Decimal?

    // Categories
    let categories: [BookCategory]

    // Related content
    let aiGuideTopics: [AIGuideTopic]
    let popularHighlights: [PopularHighlight]
    let relatedBooks: [BookSummary]
    let relatedBookLists: [BookList]
}

struct RatingDistribution: Codable {
    let recommend: Int
    let neutral: Int
    let notRecommend: Int
}

enum EvaluationTag: String, Codable {
    case masterpiece = "神作"        // recommendScore > 90%
    case acclaimed = "好评如潮"      // recommendScore > 85%
    case worthReading = "值得一读"   // recommendScore > 70%
}

struct AIGuideTopic: Identifiable, Codable {
    let id: Int
    let title: String
    let summary: String
}

struct PopularHighlight: Identifiable, Codable {
    let id: Int
    let text: String
    let highlighterCount: Int
}
```

### 4.4 Reader Module (阅读器)

#### 4.4.1 Reading Interface Structure

```
┌─────────────────────────────────────────────────┐
│  < [付费] [+书架] 👥1.2万人 ↗ ···               │ <- Top Bar (Hidden by default)
├─────────────────────────────────────────────────┤
│                                                 │
│  Chapter 1                                      │
│                                                 │
│  正文内容正文内容正文内容正文内容正文内容        │
│  正文内容正文内容[划线高亮]正文内容正文内容      │
│  正文内容正文内容正文内容正文内容正文内容        │ <- Reading Area
│                                          💭     │ <- Friend's thought bubble
│  正文内容[波浪线词汇]正文内容正文内容            │
│  正文内容正文内容正文内容正文内容正文内容        │
│                                                 │
│                                    🤖 AI        │ <- Floating AI Button
│                                    🎧 听书      │ <- Floating Audio Button
├─────────────────────────────────────────────────┤
│  [目录] [禁用标记] [进度] [亮度] [字体] [设置]   │ <- Bottom Toolbar (Hidden)
└─────────────────────────────────────────────────┘
```

#### 4.4.2 Text Selection Actions

```swift
struct TextSelectionAction: Identifiable {
    let id: String
    let icon: String
    let label: String
    let action: TextSelectionActionType
}

enum TextSelectionActionType {
    case copy              // 复制
    case highlight         // 划线
    case writeThought      // 写想法
    case shareQuote        // 分享书摘
    case lookup            // 查询
    case listenFromHere    // 听当前
}
```

#### 4.4.3 Highlight System

```swift
struct Highlight: Identifiable, Codable {
    let id: Int
    let bookId: Int
    let userId: Int
    let text: String
    let cfiRange: String  // For EPUB
    let pageNumber: Int?  // For PDF
    let startOffset: Int
    let endOffset: Int
    let chapterIndex: Int?
    let style: HighlightStyle
    let color: HighlightColor
    let createdAt: Date

    var thoughts: [Thought]
}

enum HighlightStyle: String, Codable {
    case underline = "underline"
    case background = "background"
    case wavy = "wavy"
}

enum HighlightColor: String, Codable {
    case yellow = "#FFEB3B"
    case green = "#4CAF50"
    case blue = "#2196F3"
    case pink = "#E91E63"
    case purple = "#9C27B0"
    case orange = "#FF9800"
}
```

#### 4.4.4 Thought Visibility

```swift
enum ThoughtVisibility: String, Codable {
    case publicVisible = "公开"       // Everyone can see
    case privateOnly = "私密"         // Only me
    case followersOnly = "关注"       // Mutual followers
    case excludeFriends = "屏蔽好友"  // Non-followers only
}

struct Thought: Identifiable, Codable {
    let id: Int
    let highlightId: Int
    let userId: Int
    let content: String
    let visibility: ThoughtVisibility
    let createdAt: Date
    let likes: Int
}
```

#### 4.4.5 Reading Settings

```swift
struct ReadingSettings: Codable {
    // Display
    var brightness: Double  // 0.0 - 1.0
    var colorMode: ColorMode
    var backgroundColor: BackgroundStyle

    // Typography
    var fontSize: CGFloat  // points
    var fontFamily: FontFamily
    var marginSize: MarginSize
    var lineSpacing: LineSpacing
    var firstLineIndent: Bool

    // Behavior
    var pageFlipDirection: PageFlipDirection
    var tapLeftForNext: Bool
    var keepScreenOn: Bool
    var allowLandscape: Bool
    var hideOthersThoughts: Bool
    var showTimeAndBattery: Bool
    var darkModePreference: DarkModePreference
}

enum ColorMode: String, Codable {
    case light = "白色"
    case sepia = "米黄"
    case lightGreen = "浅绿"
    case dark = "深色"
}

enum BackgroundStyle: String, Codable {
    case solid
    case texture1, texture2, texture3
    case landscape1, landscape2
}

enum PageFlipDirection: String, Codable {
    case horizontal = "左右滑动"
    case vertical = "上下滑动"
    case curl = "仿真翻页"
    case fade = "淡入淡出"
}
```

### 4.5 AI Features Module (AI功能)

#### 4.5.1 AI Audiobook Player

```
┌─────────────────────────────────────────────────┐
│                                                 │
│            ┌─────────────────────┐              │
│            │                     │              │
│            │    Book Cover       │              │
│            │                     │              │
│            └─────────────────────┘              │
│                                                 │
│              Chapter 5: The Meeting             │
│                                                 │
│        00:12:34 ━━━━━━━○────────── 00:45:00    │
│                                                 │
│           ⏪15    ◀️    ▶️    ▶️     ⏩15      │
│                                                 │
│          [原文] [章节]                          │
├─────────────────────────────────────────────────┤
│  [⏰定时关闭]  [🎙️ AI男声2025A]  [1.0x速度]     │
│              [+加入书架]                        │
└─────────────────────────────────────────────────┘
```

```swift
struct AudioPlayerState: Codable {
    var currentBookId: Int
    var currentChapterIndex: Int
    var currentPosition: TimeInterval
    var totalDuration: TimeInterval
    var playbackSpeed: Double  // 0.5x - 2.0x
    var selectedVoice: AIVoice
    var sleepTimer: SleepTimer?
    var isPlaying: Bool
}

struct AIVoice: Identifiable, Codable {
    let id: String
    let name: String  // e.g., "AI男声2025A"
    let gender: VoiceGender
    let language: String
    let previewUrl: String
}

enum SleepTimer {
    case minutes(Int)  // 15, 30, 45, 60
    case endOfChapter
    case custom(Date)
}
```

#### 4.5.2 AI Q&A (AI问书)

```swift
struct AIConversation: Identifiable {
    let id: UUID
    let bookId: Int
    var messages: [AIMessage]
}

struct AIMessage: Identifiable, Codable {
    let id: UUID
    let role: MessageRole
    let content: String
    let timestamp: Date
}

enum MessageRole: String, Codable {
    case user
    case assistant
}

struct AIQuickAction: Identifiable {
    let id: String
    let label: String
    let prompt: String
}

// Predefined quick actions
let aiQuickActions: [AIQuickAction] = [
    AIQuickAction(id: "highlights", label: "书籍亮点", prompt: "这本书的主要亮点是什么？"),
    AIQuickAction(id: "background", label: "背景解读", prompt: "请解读这本书的创作背景"),
    AIQuickAction(id: "concepts", label: "关键概念", prompt: "这本书的关键概念有哪些？"),
]
```

#### 4.5.3 AI Lookup (词汇查询)

```swift
struct AILookupResult: Codable {
    let word: String
    let dictionaryDefinition: DictionaryEntry?
    let aiInterpretation: AIInterpretation
    let relatedBooks: [BookSummary]
}

struct DictionaryEntry: Codable {
    let word: String
    let pinyin: String?
    let definitions: [String]
    let source: String  // e.g., "《辞海》"
}

struct AIInterpretation: Codable {
    let explanation: String
    let contextualMeaning: String
    let highlightedKeywords: [String]
}
```

#### 4.5.4 AI Guide (AI大纲)

```swift
struct AIOutline: Codable {
    let bookId: Int
    let summaryTopics: [SummaryTopic]
    let celebrityRecommendations: [CelebrityRecommendation]
}

struct SummaryTopic: Identifiable, Codable {
    let id: Int
    let title: String
    let summary: String
    let linkedChapters: [Int]
}

struct CelebrityRecommendation: Identifiable, Codable {
    let id: Int
    let celebrityName: String
    let celebrityTitle: String
    let quote: String
    let context: String
}
```

### 4.6 Membership System (会员系统)

#### 4.6.1 Member Benefits

```swift
struct MemberBenefits {
    static let benefits: [MemberBenefit] = [
        .unlimitedPublishedBooks,
        .unlimitedAudiobooks,
        .unlimitedDownloads,
        .unlimitedBookshelf,
        .unlimitedImports,
        .aiTranslation,
        .aiNarration,
        .pdfToEbook,
        .doodleMode,
        .pencilNotes
    ]
}

enum MemberBenefit: String {
    case unlimitedPublishedBooks = "全场出版书畅读"
    case unlimitedAudiobooks = "全场有声书畅听"
    case unlimitedDownloads = "离线下载无限制"
    case unlimitedBookshelf = "书架无限制"
    case unlimitedImports = "导入书籍无限制"
    case aiTranslation = "AI翻译"
    case aiNarration = "AI朗读"
    case pdfToEbook = "PDF切换电子书阅读"
    case doodleMode = "涂鸦模式"
    case pencilNotes = "Pencil笔记模式"
}
```

#### 4.6.2 Pricing Plans

```swift
struct MembershipPlan: Identifiable, Codable {
    let id: String
    let type: PlanType
    let price: Decimal
    let originalPrice: Decimal?
    let duration: PlanDuration
    let description: String
    let isRecommended: Bool
}

enum PlanType: String, Codable {
    case monthlyAuto = "连续包月"
    case monthly = "月卡"
    case quarterly = "季卡"
    case yearly = "年卡"
    case combinedMonthly = "联合月卡"
    case combinedYearly = "联合年卡"
}

enum PlanDuration {
    case months(Int)
    case year
}

// Example pricing
let pricingPlans: [MembershipPlan] = [
    MembershipPlan(id: "auto_monthly", type: .monthlyAuto, price: 9.00, originalPrice: 19.00, duration: .months(1), description: "首月特惠，次月起19元/月", isRecommended: true),
    MembershipPlan(id: "monthly", type: .monthly, price: 30.00, originalPrice: nil, duration: .months(1), description: "单月购买", isRecommended: false),
    MembershipPlan(id: "quarterly", type: .quarterly, price: 60.00, originalPrice: nil, duration: .months(3), description: "三个月", isRecommended: false),
    MembershipPlan(id: "yearly", type: .yearly, price: 228.00, originalPrice: nil, duration: .year, description: "折合19元/月", isRecommended: false),
    MembershipPlan(id: "combined_monthly", type: .combinedMonthly, price: 35.00, originalPrice: nil, duration: .months(1), description: "微信读书+腾讯视频", isRecommended: false),
    MembershipPlan(id: "combined_yearly", type: .combinedYearly, price: 298.00, originalPrice: nil, duration: .year, description: "微信读书+腾讯视频", isRecommended: false),
]
```

### 4.7 Social Module (社交模块)

#### 4.7.1 Friends Activity (书友动态)

```swift
struct FriendActivity: Identifiable, Codable {
    let id: Int
    let user: UserSummary
    let book: BookSummary
    let activityType: ActivityType
    let readingDuration: TimeInterval?
    let notesCount: Int?
    let thought: String?
    let createdAt: Date
    var likesCount: Int
    var isLiked: Bool
}

enum ActivityType: String, Codable {
    case reading = "在读"
    case finished = "读完"
    case highlighted = "划线"
    case reviewed = "点评"
    case shared = "分享"
}
```

#### 4.7.2 Publish Thought (发布想法)

```swift
struct ThoughtDraft {
    var content: String
    var attachedImages: [UIImage]
    var attachedBook: BookSummary?
    var mentionedUsers: [UserSummary]
    var topics: [Topic]
    var visibility: ThoughtVisibility
}

struct Topic: Identifiable, Codable {
    let id: Int
    let name: String
    let postCount: Int
    let isHot: Bool
    let isNew: Bool
    let category: TopicCategory
}

enum TopicCategory: String, Codable {
    case reading = "书友"
    case growth = "个人成长"
    case photography = "摄影"
    case calligraphy = "书法"
    case literature = "文学"
    case poetry = "诗歌"
    case quotes = "书摘"
    case society = "社会"
    case fitness = "健身"
    case history = "历史"
    case psychology = "心理学"
    case design = "设计"
    case love = "爱情"
    case finance = "理财"
    case philosophy = "哲学"
    case helpEachOther = "互助"
    case femaleNovel = "女生小说"
    case health = "健康"
    case career = "职场"
    case filmTV = "影视"
    case maleNovel = "男生小说"
    case parenting = "育儿"
    case mystery = "悬疑推理"
    case scifi = "科幻"
    case redChamber = "红楼梦"
    case exam = "备考"
    case buyBooks = "买书"
    case internet = "互联网"
    case trivia = "冷知识"
    case wuxia = "武侠"
}
```

#### 4.7.3 Reading Leaderboard

```swift
struct WeeklyLeaderboard: Codable {
    let weekStartDate: Date
    let weekEndDate: Date
    let settlementTime: Date  // Sunday 24:00
    let myRanking: RankingEntry?
    let entries: [RankingEntry]
}

struct RankingEntry: Identifiable, Codable {
    let id: Int
    let rank: Int
    let user: UserSummary
    let readingDuration: TimeInterval
    let isLastWeek: Bool  // Show "(上周)" if not ranked this week
    var isLiked: Bool
}
```

#### 4.7.4 Share Options

```swift
enum ShareDestination: String, CaseIterable {
    // Row 1
    case friend = "分享给朋友"
    case moments = "分享到朋友圈"
    case wechatStatus = "同步微信状态"
    case bookFriend = "分享给书友"

    // Row 2
    case saveImage = "图片分享"
    case directMessage = "私信给书友"
    case officialAccount = "分享到公众号"
    case other = "分享到其他"  // e.g., 小红书
}

struct QuoteCard: Codable {
    let text: String
    let bookTitle: String
    let author: String
    let date: Date
    let template: CardTemplate
}

enum CardTemplate: String, Codable {
    case calendar = "日历"
    case minimal = "简约"
    case elegant = "典雅"
    case dark = "暗黑"
}
```

### 4.8 Profile Module (个人中心)

#### 4.8.1 Profile Home Structure

```
┌─────────────────────────────────────────────────┐
│            [Avatar]                   ✉️  ⚙️    │
│           Username                              │
│           🏆 勋章 >                             │
├─────────────────────────────────────────────────┤
│  成为付费会员              充值币          福利 │
│  首月特惠9元/月              ¥0.00       30天   │
├─────────────────────────────────────────────────┤
│  读书排行榜                       阅读时长      │
│  第42名 · 4小时51分钟              120小时      │
├─────────────────────────────────────────────────┤
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐       │
│  │ 在读  │  │ 读完  │  │ 笔记  │  │ 订阅  │       │
│  │  28   │  │  156  │  │ 1024 │  │  12   │       │
│  └──────┘  └──────┘  └──────┘  └──────┘       │
├─────────────────────────────────────────────────┤
│  书单                         关注              │
│   15                     128 / 256            │
└─────────────────────────────────────────────────┘
```

#### 4.8.2 User Profile Data

```swift
struct UserProfile: Codable {
    let id: Int
    let username: String
    let avatar: String
    let gender: Gender?

    // Membership
    let membershipStatus: MembershipStatus?
    let coinBalance: Decimal
    let benefitDays: Int

    // Reading Stats
    let totalReadingDuration: TimeInterval
    let monthlyReadingDuration: TimeInterval
    let currentRanking: Int?
    let rankingDuration: TimeInterval?

    // Reading Records
    let readingCount: Int
    let finishedCount: Int
    let notesCount: Int
    let subscriptionCount: Int

    // Social
    let bookListCount: Int
    let followingCount: Int
    let followersCount: Int

    // Badges
    let badgeCount: Int
    let featuredBadges: [Badge]
}

enum Gender: String, Codable {
    case male = "男"
    case female = "女"
    case unset = "未设置"
}

struct MembershipStatus: Codable {
    let isActive: Bool
    let type: PlanType
    let expirationDate: Date
}
```

### 4.9 Reading Statistics (阅读统计)

#### 4.9.1 Time Dimensions

```swift
enum StatisticsDimension: String, CaseIterable {
    case week = "周"
    case month = "月"
    case year = "年"
    case total = "总"
    case calendar = "阅历"
}
```

#### 4.9.2 Statistics Data Model

```swift
struct ReadingStatistics: Codable {
    let dimension: StatisticsDimension
    let dateRange: DateRange

    // Core metrics
    let totalDuration: TimeInterval
    let dailyAverage: TimeInterval
    let comparisonChange: Double  // Percentage change from previous period
    let friendRanking: Int?

    // Reading records
    let booksRead: Int
    let booksFinished: Int
    let readingDays: Int
    let notesCount: Int

    // Distribution data
    let durationByDay: [DayDuration]  // For charts
    let longestBook: BookSummary?
    let categoryPreferences: [CategoryPreference]
}

struct DayDuration: Codable {
    let date: Date
    let duration: TimeInterval
}

struct CategoryPreference: Codable {
    let category: BookCategory
    let percentage: Double
}

struct ReadingMilestone: Identifiable, Codable {
    let id: Int
    let date: Date
    let type: MilestoneType
    let description: String
    let relatedBook: BookSummary?
}

enum MilestoneType: String, Codable {
    case started = "开始阅读"
    case finished = "读完"
    case streakDays = "连续阅读"
    case durationMilestone = "阅读时长里程碑"
}
```

### 4.10 Badge System (勋章系统)

#### 4.10.1 Badge Categories

```swift
enum BadgeCategory: String, CaseIterable {
    case weeklyChallenge = "每周阅读挑战"
    case monthlyChallenge = "每月阅读挑战"
    case readingDays = "阅读天数"
    case readingStreak = "连续阅读"
    case readingDuration = "阅读时长"
    case booksFinished = "读完书籍"
    case likesReceived = "收到的赞"
    case masterpieces = "阅读神作"
    case reviews = "点评书籍"
    case bookSharing = "拯救书荒"
}
```

#### 4.10.2 Badge Data Model

```swift
struct Badge: Identifiable, Codable {
    let id: Int
    let category: BadgeCategory
    let level: Int
    let name: String
    let requirement: String
    let iconUrl: String
    let isEarned: Bool
    let earnedAt: Date?
    let earnedCount: Int  // How many users earned this
    let progress: BadgeProgress?
}

struct BadgeProgress: Codable {
    let current: Int
    let target: Int
    let description: String  // e.g., "再阅读91天可得"
}

// Badge definitions based on PRD
let badgeDefinitions: [BadgeDefinition] = [
    // Weekly challenges
    BadgeDefinition(category: .weeklyChallenge, name: "完美阅读周", requirement: "读7天·10小时"),
    BadgeDefinition(category: .weeklyChallenge, name: "狂暴阅读周", requirement: "读7天·25小时"),

    // Monthly challenges
    BadgeDefinition(category: .monthlyChallenge, name: "完美阅读月", requirement: "读30天·40小时"),
    BadgeDefinition(category: .monthlyChallenge, name: "狂暴阅读月", requirement: "读31天·100小时"),

    // Reading days
    BadgeDefinition(category: .readingDays, levels: [100, 200, 365]),

    // Reading streak
    BadgeDefinition(category: .readingStreak, levels: [30, 90, 180, 365, 500, 1000]),

    // Reading duration (hours)
    BadgeDefinition(category: .readingDuration, levels: [100, 500, 1000, 2000, 3000, 5000]),

    // Books finished
    BadgeDefinition(category: .booksFinished, levels: [10, 50, 100, 200, 500, 1000]),

    // Likes received
    BadgeDefinition(category: .likesReceived, levels: [50, 100, 500, 1000, 2000, 3000]),

    // Masterpieces read
    BadgeDefinition(category: .masterpieces, names: [
        (5, "神作研习生"), (10, "爱好者"), (50, "收藏家"),
        (100, "发烧友"), (200, "品鉴师"), (500, "博学士")
    ]),

    // Reviews
    BadgeDefinition(category: .reviews, levels: [5, 10, 50, 100, 200, 500]),

    // Book sharing
    BadgeDefinition(category: .bookSharing, names: [
        (10, "好书分享家"), (100, "导读人"), (500, "推荐官"),
        (1000, "领航员"), (3000, "风向标"), (5000, "指明灯")
    ]),
]
```

---

## 5. API Design

### 5.1 New API Endpoints Required

Based on the PRD requirements, the following new API endpoints need to be added:

#### 5.1.1 Book Store APIs

```yaml
# Categories
GET /api/categories:
  description: Get all book categories (two-level)
  response: Category[]

GET /api/categories/{id}/books:
  description: Get books in a category with filters
  query:
    - wordCount: string (enum)
    - paymentType: string (enum)
    - sortBy: string (enum)
    - limit: integer
    - offset: integer

# Rankings
GET /api/rankings:
  description: Get list of all ranking types
  response: RankingType[]

GET /api/rankings/{type}:
  description: Get books in a specific ranking
  query:
    - limit: integer
  response: RankingItem[]

# Recommendations
GET /api/recommendations:
  description: Get personalized book recommendations
  response:
    guessYouLike: BookSummary[]
    dailyBookList: BookList
    hotBooks: BookSummary[]

# Book Lists
GET /api/booklists:
  description: Get curated book lists
GET /api/booklists/{id}:
  description: Get book list details with books
```

#### 5.1.2 Book Detail APIs

```yaml
GET /api/books/{id}/detail:
  description: Get full book details
  response: BookDetail

GET /api/books/{id}/ai-guide:
  description: Get AI-generated book guide/outline
  response: AIOutline

GET /api/books/{id}/popular-highlights:
  description: Get popular highlights for a book
  query:
    - limit: integer
  response: PopularHighlight[]

GET /api/books/{id}/related:
  description: Get related books
  response: BookSummary[]

GET /api/books/{id}/reviews:
  description: Get book reviews
  query:
    - filter: string (all, recommend, neutral, not_recommend)
    - limit: integer
    - offset: integer
  response: Review[]

POST /api/books/{id}/reviews:
  description: Submit a book review
  body:
    rating: string (recommend, neutral, not_recommend)
    content: string
```

#### 5.1.3 AI Feature APIs

```yaml
# AI Q&A
POST /api/ai/ask-book:
  description: Ask AI about a book
  body:
    bookId: integer
    question: string
    conversationId: string (optional)
  response:
    answer: string
    conversationId: string

# AI Lookup
POST /api/ai/lookup:
  description: Look up word/phrase meaning
  body:
    text: string
    bookId: integer (optional, for context)
  response: AILookupResult

# AI Narration
POST /api/ai/generate-audio:
  description: Generate audio for text
  body:
    bookId: integer
    chapterIndex: integer
    voiceId: string
  response:
    audioUrl: string
    duration: number

GET /api/ai/voices:
  description: Get available AI voices
  response: AIVoice[]
```

#### 5.1.4 Social APIs

```yaml
# Friends Activity
GET /api/social/friends-activity:
  description: Get friends' reading activities
  query:
    - type: string (friends, bookFriends)
    - limit: integer
    - offset: integer
  response: FriendActivity[]

# Thoughts
POST /api/social/thoughts:
  description: Publish a thought
  body:
    content: string
    images: string[]
    bookId: integer (optional)
    mentionedUserIds: integer[]
    topicIds: integer[]
    visibility: string

GET /api/social/thoughts/{id}:
  description: Get thought details

# Topics
GET /api/social/topics:
  description: Get available topics
  query:
    - category: string (optional)
  response: Topic[]

GET /api/social/topics/trending:
  description: Get trending topics
  response: Topic[]

# Leaderboard
GET /api/social/leaderboard:
  description: Get weekly reading leaderboard
  response: WeeklyLeaderboard

# Follow
POST /api/social/follow/{userId}:
  description: Follow a user
DELETE /api/social/follow/{userId}:
  description: Unfollow a user
```

#### 5.1.5 User Profile APIs

```yaml
GET /api/user/profile:
  description: Get current user profile
  response: UserProfile

PATCH /api/user/profile:
  description: Update profile settings
  body:
    username: string
    avatar: string
    gender: string
    profileVisibility: object

GET /api/user/statistics:
  description: Get reading statistics
  query:
    - dimension: string (week, month, year, total, calendar)
    - date: string (for specific period)
  response: ReadingStatistics

GET /api/user/milestones:
  description: Get reading milestones
  response: ReadingMilestone[]

GET /api/user/badges:
  description: Get user's badges
  response: Badge[]

GET /api/user/badges/{id}:
  description: Get badge details
  response: Badge
```

#### 5.1.6 Membership APIs

```yaml
GET /api/membership/plans:
  description: Get available membership plans
  response: MembershipPlan[]

POST /api/membership/subscribe:
  description: Subscribe to a plan
  body:
    planId: string
    paymentMethod: string
  response:
    transactionId: string
    paymentUrl: string

POST /api/membership/redeem:
  description: Redeem a code
  body:
    code: string
  response:
    success: boolean
    daysAdded: integer

GET /api/membership/status:
  description: Get current membership status
  response: MembershipStatus
```

#### 5.1.7 Bookshelf APIs

```yaml
GET /api/bookshelf:
  description: Get user's bookshelf
  query:
    - sortBy: string (default, update, progress, recommend, title, category, wordCount, paid)
  response: BookshelfItem[]

POST /api/bookshelf/add:
  description: Add book to bookshelf
  body:
    bookId: integer
    bookType: string (ebook, audiobook, magazine)

DELETE /api/bookshelf/{bookId}:
  description: Remove book from bookshelf

POST /api/bookshelf/import:
  description: Import local book file
  body:
    file: binary
    format: string (epub, pdf)
```

### 5.2 Enhanced Existing APIs

```yaml
# Enhanced reading history
POST /api/reading-history:
  body:
    bookId: integer
    bookType: string
    progress: number
    lastPosition: string (CFI for EPUB, page for PDF)
    chapterIndex: integer
    duration: integer (seconds read this session)  # NEW: for statistics

# Enhanced highlights
GET /api/books/{id}/highlights:
  query:
    - visibility: string (my, public, friends)  # NEW: filter by visibility
  response:
    highlights: Highlight[]
    popularHighlights: PopularHighlight[]  # NEW: include popular

POST /api/books/{id}/highlights:
  body:
    # ... existing fields
    visibility: string  # NEW: thought visibility
```

---

## 6. Database Schema Updates

### 6.1 New Tables Required

```sql
-- Book categories (two-level)
CREATE TABLE book_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_id INTEGER REFERENCES book_categories(id),
    sort_order INTEGER DEFAULT 0,
    icon_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Book rankings
CREATE TABLE book_rankings (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,  -- trending, hot_search, new_release, etc.
    theme_color VARCHAR(20),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE book_ranking_items (
    id SERIAL PRIMARY KEY,
    ranking_id INTEGER REFERENCES book_rankings(id),
    book_id INTEGER REFERENCES ebooks(id),
    rank INTEGER NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Book reviews
CREATE TABLE book_reviews (
    id SERIAL PRIMARY KEY,
    book_id INTEGER REFERENCES ebooks(id),
    user_id INTEGER REFERENCES users(id),
    rating VARCHAR(20) NOT NULL,  -- recommend, neutral, not_recommend
    content TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    likes_count INTEGER DEFAULT 0
);

-- AI conversations
CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id),
    book_id INTEGER REFERENCES ebooks(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES ai_conversations(id),
    role VARCHAR(20) NOT NULL,  -- user, assistant
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- AI voices
CREATE TABLE ai_voices (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    gender VARCHAR(20),
    language VARCHAR(10) DEFAULT 'zh',
    preview_url TEXT,
    is_active BOOLEAN DEFAULT true
);

-- Social: Thoughts
CREATE TABLE thoughts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    content TEXT NOT NULL,
    book_id INTEGER REFERENCES ebooks(id),
    visibility VARCHAR(20) DEFAULT 'public',
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE thought_images (
    id SERIAL PRIMARY KEY,
    thought_id INTEGER REFERENCES thoughts(id),
    image_url TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
);

CREATE TABLE thought_mentions (
    thought_id INTEGER REFERENCES thoughts(id),
    user_id INTEGER REFERENCES users(id),
    PRIMARY KEY (thought_id, user_id)
);

-- Topics
CREATE TABLE topics (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50),
    post_count INTEGER DEFAULT 0,
    is_hot BOOLEAN DEFAULT false,
    is_new BOOLEAN DEFAULT false
);

CREATE TABLE thought_topics (
    thought_id INTEGER REFERENCES thoughts(id),
    topic_id INTEGER REFERENCES topics(id),
    PRIMARY KEY (thought_id, topic_id)
);

-- Social: Following
CREATE TABLE user_follows (
    follower_id INTEGER REFERENCES users(id),
    following_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

-- Social: Likes
CREATE TABLE thought_likes (
    thought_id INTEGER REFERENCES thoughts(id),
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (thought_id, user_id)
);

-- Badges
CREATE TABLE badges (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    level INTEGER DEFAULT 1,
    name VARCHAR(100) NOT NULL,
    requirement TEXT,
    icon_url TEXT,
    target_value INTEGER  -- The number needed to earn
);

CREATE TABLE user_badges (
    user_id INTEGER REFERENCES users(id),
    badge_id INTEGER REFERENCES badges(id),
    earned_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, badge_id)
);

-- Reading statistics (aggregated)
CREATE TABLE reading_statistics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    date DATE NOT NULL,
    duration_seconds INTEGER DEFAULT 0,
    books_read INTEGER DEFAULT 0,
    pages_read INTEGER DEFAULT 0,
    UNIQUE (user_id, date)
);

-- Membership
CREATE TABLE membership_plans (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    original_price DECIMAL(10, 2),
    duration_months INTEGER NOT NULL,
    description TEXT,
    is_recommended BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE user_memberships (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    plan_id VARCHAR(50) REFERENCES membership_plans(id),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    is_auto_renew BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Bookshelf
CREATE TABLE user_bookshelf (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    book_id INTEGER NOT NULL,
    book_type VARCHAR(20) NOT NULL,  -- ebook, audiobook, magazine
    progress FLOAT DEFAULT 0,
    last_read_at TIMESTAMP,
    is_downloaded BOOLEAN DEFAULT false,
    added_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, book_id, book_type)
);

-- Popular highlights (aggregated)
CREATE TABLE popular_highlights (
    id SERIAL PRIMARY KEY,
    book_id INTEGER REFERENCES ebooks(id),
    text TEXT NOT NULL,
    cfi_range TEXT,
    highlight_count INTEGER DEFAULT 1,
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 6.2 Updated Existing Tables

```sql
-- Add to ebooks table
ALTER TABLE ebooks ADD COLUMN IF NOT EXISTS
    word_count INTEGER,
    recommend_score FLOAT,
    readers_count INTEGER DEFAULT 0,
    finished_count INTEGER DEFAULT 0,
    today_readers INTEGER DEFAULT 0,
    payment_type VARCHAR(20) DEFAULT 'free',
    price DECIMAL(10, 2);

-- Add to ebook_underlines table
ALTER TABLE ebook_underlines ADD COLUMN IF NOT EXISTS
    visibility VARCHAR(20) DEFAULT 'public',
    style VARCHAR(20) DEFAULT 'background',
    color VARCHAR(20) DEFAULT '#FFEB3B';

-- Add to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS
    gender VARCHAR(20),
    total_reading_duration INTEGER DEFAULT 0,
    reading_days INTEGER DEFAULT 0,
    profile_visibility JSONB DEFAULT '{"bookshelf": true, "favorites": true, "booklists": true, "badges": true, "thoughts": true}';

-- Add to reading_history table
ALTER TABLE reading_history ADD COLUMN IF NOT EXISTS
    duration_seconds INTEGER DEFAULT 0,
    chapter_index INTEGER;
```

---

## 7. iOS Project Structure

### 7.1 Updated Project Structure

```
BookPost/
├── App/
│   ├── BookPostApp.swift
│   ├── AppState.swift              # Global app state
│   └── AppConstants.swift          # Constants and configs
│
├── Core/
│   ├── Networking/
│   │   ├── APIClient.swift
│   │   ├── APIEndpoints.swift
│   │   ├── APIError.swift
│   │   └── NetworkMonitor.swift
│   ├── Storage/
│   │   ├── SwiftDataManager.swift
│   │   ├── CacheManager.swift
│   │   └── DownloadManager.swift
│   └── Auth/
│       ├── AuthManager.swift
│       └── KeychainHelper.swift
│
├── Models/
│   ├── User/
│   │   ├── User.swift
│   │   ├── UserProfile.swift
│   │   └── Badge.swift
│   ├── Book/
│   │   ├── Book.swift
│   │   ├── BookDetail.swift
│   │   ├── BookCategory.swift
│   │   └── BookRanking.swift
│   ├── Reading/
│   │   ├── Highlight.swift
│   │   ├── Thought.swift
│   │   ├── ReadingProgress.swift
│   │   └── ReadingStatistics.swift
│   ├── Social/
│   │   ├── FriendActivity.swift
│   │   ├── Topic.swift
│   │   └── Leaderboard.swift
│   └── Membership/
│       ├── MembershipPlan.swift
│       └── MembershipStatus.swift
│
├── Features/
│   ├── Reading/
│   │   ├── Views/
│   │   │   ├── ReadingTabView.swift
│   │   │   └── CurrentBookCard.swift
│   │   └── ViewModels/
│   │       └── ReadingViewModel.swift
│   │
│   ├── Bookshelf/
│   │   ├── Views/
│   │   │   ├── BookshelfView.swift
│   │   │   ├── BookshelfGridView.swift
│   │   │   └── MiniPlayerView.swift
│   │   └── ViewModels/
│   │       └── BookshelfViewModel.swift
│   │
│   ├── Store/
│   │   ├── Views/
│   │   │   ├── StoreHomeView.swift
│   │   │   ├── CategoryView.swift
│   │   │   ├── CategoryDetailView.swift
│   │   │   ├── RankingView.swift
│   │   │   ├── BookListView.swift
│   │   │   └── SearchView.swift
│   │   └── ViewModels/
│   │       ├── StoreViewModel.swift
│   │       ├── CategoryViewModel.swift
│   │       └── SearchViewModel.swift
│   │
│   ├── BookDetail/
│   │   ├── Views/
│   │   │   ├── BookDetailView.swift
│   │   │   ├── AIGuideView.swift
│   │   │   ├── PopularHighlightsView.swift
│   │   │   ├── RelatedBooksView.swift
│   │   │   └── ReviewsView.swift
│   │   └── ViewModels/
│   │       └── BookDetailViewModel.swift
│   │
│   ├── Reader/
│   │   ├── Views/
│   │   │   ├── ReaderContainerView.swift
│   │   │   ├── EPUBReaderView.swift
│   │   │   ├── PDFReaderView.swift
│   │   │   ├── ReaderToolbar.swift
│   │   │   ├── ReaderSettingsSheet.swift
│   │   │   ├── TableOfContentsView.swift
│   │   │   ├── TextSelectionMenu.swift
│   │   │   ├── HighlightView.swift
│   │   │   └── ThoughtBubbleView.swift
│   │   ├── ViewModels/
│   │   │   ├── ReaderViewModel.swift
│   │   │   └── HighlightViewModel.swift
│   │   └── Services/
│   │       ├── EPUBParser.swift
│   │       └── ReadingSessionTracker.swift
│   │
│   ├── AudioPlayer/
│   │   ├── Views/
│   │   │   ├── AudioPlayerView.swift
│   │   │   ├── MiniPlayerView.swift
│   │   │   ├── VoiceSelectionView.swift
│   │   │   └── SleepTimerView.swift
│   │   ├── ViewModels/
│   │   │   └── AudioPlayerViewModel.swift
│   │   └── Services/
│   │       ├── AudioPlayerService.swift
│   │       └── TTSService.swift
│   │
│   ├── AI/
│   │   ├── Views/
│   │   │   ├── AIQuestionView.swift
│   │   │   ├── AILookupView.swift
│   │   │   └── AIOutlineView.swift
│   │   ├── ViewModels/
│   │   │   ├── AIQuestionViewModel.swift
│   │   │   └── AILookupViewModel.swift
│   │   └── Services/
│   │       └── AIService.swift
│   │
│   ├── Social/
│   │   ├── Views/
│   │   │   ├── FriendsTabView.swift
│   │   │   ├── FriendsActivityView.swift
│   │   │   ├── PublishThoughtView.swift
│   │   │   ├── TopicSelectionView.swift
│   │   │   ├── LeaderboardView.swift
│   │   │   └── ShareSheet.swift
│   │   └── ViewModels/
│   │       ├── FriendsViewModel.swift
│   │       └── LeaderboardViewModel.swift
│   │
│   ├── Profile/
│   │   ├── Views/
│   │   │   ├── ProfileTabView.swift
│   │   │   ├── ProfileHomeView.swift
│   │   │   ├── StatisticsView.swift
│   │   │   ├── BadgesView.swift
│   │   │   ├── BadgeDetailView.swift
│   │   │   ├── PersonalPageView.swift
│   │   │   └── SettingsView.swift
│   │   └── ViewModels/
│   │       ├── ProfileViewModel.swift
│   │       ├── StatisticsViewModel.swift
│   │       └── BadgesViewModel.swift
│   │
│   └── Membership/
│       ├── Views/
│       │   ├── MembershipView.swift
│       │   ├── PlanSelectionView.swift
│       │   └── RedeemCodeView.swift
│       └── ViewModels/
│           └── MembershipViewModel.swift
│
├── Shared/
│   ├── Views/
│   │   ├── Components/
│   │   │   ├── BookCoverView.swift
│   │   │   ├── BookGridItem.swift
│   │   │   ├── LoadingView.swift
│   │   │   ├── EmptyStateView.swift
│   │   │   ├── ErrorView.swift
│   │   │   └── PullToRefresh.swift
│   │   └── Modifiers/
│   │       ├── ShimmerModifier.swift
│   │       └── CornerRadius.swift
│   └── Extensions/
│       ├── Color+Theme.swift
│       ├── Date+Formatting.swift
│       ├── TimeInterval+Formatting.swift
│       └── View+Extensions.swift
│
├── Resources/
│   ├── Assets.xcassets
│   ├── Fonts/
│   └── Localization/
│       ├── en.lproj/
│       └── zh-Hans.lproj/
│
└── Preview Content/
    └── MockData.swift
```

---

## 8. Implementation Phases

### Phase 1: Core Foundation (Week 1-2)

**Priority: Critical**

- [ ] Core Networking layer setup
- [ ] Authentication flow
- [ ] Local data storage with SwiftData
- [ ] Basic tab navigation structure
- [ ] Book model and API integration
- [ ] Basic bookshelf view

### Phase 2: Book Store & Discovery (Week 3-4)

**Priority: High**

- [ ] Store home view
- [ ] Category browsing with filters
- [ ] Search functionality
- [ ] Ranking views
- [ ] Book detail page
- [ ] Add to bookshelf

### Phase 3: Reading Experience (Week 5-7)

**Priority: Critical**

- [ ] EPUB reader with ReadiumKit
- [ ] PDF reader with PDFKit
- [ ] Text selection and highlighting
- [ ] Thoughts system (visibility options)
- [ ] Table of contents
- [ ] Reading settings (themes, fonts, margins)
- [ ] Reading progress sync

### Phase 4: AI Features (Week 8-9)

**Priority: High**

- [ ] AI voice narration (TTS)
- [ ] AI Q&A (ask about book)
- [ ] AI word lookup
- [ ] AI book guide/outline
- [ ] Audio player UI

### Phase 5: Social Features (Week 10-11)

**Priority: Medium**

- [ ] Friends activity feed
- [ ] Publish thoughts with topics
- [ ] Share functionality
- [ ] Reading leaderboard
- [ ] Follow/unfollow users
- [ ] User profiles

### Phase 6: Profile & Statistics (Week 12-13)

**Priority: Medium**

- [ ] Profile home view
- [ ] Reading statistics with charts
- [ ] Badge system
- [ ] Settings page
- [ ] Personal page customization

### Phase 7: Membership & Polish (Week 14-15)

**Priority: Medium**

- [ ] Membership plans display
- [ ] In-app purchase integration
- [ ] Redemption codes
- [ ] Offline download manager
- [ ] Performance optimization
- [ ] UI polish and animations

---

## 9. Interaction Specifications

### 9.1 Gestures

| Gesture | Context | Action |
|---------|---------|--------|
| Tap | Reading area | Show/hide toolbars |
| Left/right swipe | Reading area | Turn page |
| Long press | Text | Select text, show action menu |
| Long press | Book cover | Show quick preview card |
| Pull down | List views | Refresh content |
| Left swipe | Preview card | Start reading |
| Right swipe/pull down | Query popup | Dismiss |

### 9.2 Loading States

| State | UI Element |
|-------|------------|
| Page loading | Skeleton screen |
| List loading | Bottom loading indicator |
| Pull to refresh | Top refresh animation |
| AI processing | Thinking animation with progress |

### 9.3 Empty States

| Context | Message | Action |
|---------|---------|--------|
| Empty bookshelf | "去书城发现好书" | Navigate to store |
| No search results | "未找到相关结果" | - |
| Badge not earned | "再阅读X天可得" | Show progress |

### 9.4 Popup Types

| Type | Trigger | Example |
|------|---------|---------|
| Bottom sheet | Share, more options, filters | Share panel |
| Center modal | Payment, badge details | Membership prompt |
| Full screen overlay | Query results, AI Q&A | Word lookup |
| Toast | Operation feedback | Success/failure |

---

## 10. Design System

### 10.1 Colors

```swift
extension Color {
    // Primary
    static let primary = Color(hex: "#1890FF")      // Blue
    static let secondary = Color(hex: "#52C41A")    // Green

    // Text
    static let textPrimary = Color(hex: "#1A1A1A")
    static let textSecondary = Color(hex: "#666666")
    static let textTertiary = Color(hex: "#999999")

    // Background
    static let backgroundPrimary = Color(hex: "#FFFFFF")
    static let backgroundSecondary = Color(hex: "#F5F5F5")

    // Highlight colors
    static let highlightYellow = Color(hex: "#FFEB3B")
    static let highlightGreen = Color(hex: "#4CAF50")
    static let highlightBlue = Color(hex: "#2196F3")
    static let highlightPink = Color(hex: "#E91E63")
    static let highlightPurple = Color(hex: "#9C27B0")
    static let highlightOrange = Color(hex: "#FF9800")

    // Ranking theme colors
    static let rankingTrending = Color(hex: "#FF69B4")  // Pink
    static let rankingNew = Color(hex: "#FF8C00")       // Orange

    // Badge background
    static let badgeBackground = Color(hex: "#1A1A2E")  // Dark
}
```

### 10.2 Typography

```swift
extension Font {
    // Title
    static let titleLarge = Font.system(size: 24, weight: .bold)
    static let titleMedium = Font.system(size: 20, weight: .semibold)
    static let titleSmall = Font.system(size: 17, weight: .semibold)

    // Body
    static let bodyLarge = Font.system(size: 17, weight: .regular)
    static let bodyMedium = Font.system(size: 15, weight: .regular)
    static let bodySmall = Font.system(size: 13, weight: .regular)

    // Caption
    static let caption = Font.system(size: 12, weight: .regular)

    // Reading fonts
    static func readingFont(_ family: FontFamily, size: CGFloat) -> Font {
        // Custom reading fonts
    }
}

enum FontFamily: String, CaseIterable {
    case system = "系统字体"
    case songti = "宋体"
    case kaiti = "楷体"
    case heiti = "黑体"
}
```

---

## 11. Performance Considerations

### 11.1 Image Loading

- Use `AsyncImage` with placeholder and caching
- Implement progressive image loading for covers
- Cache cover images locally

### 11.2 Reading Performance

- Lazy load chapters for EPUB
- Pre-render adjacent pages
- Efficient highlight storage and rendering

### 11.3 Offline Support

- SwiftData for local data persistence
- Background download manager for books
- Sync queue for offline actions

### 11.4 Memory Management

- Proper cleanup of reader resources
- Image cache size limits
- Lazy loading of heavy content

---

## 12. Security Considerations

### 12.1 Authentication

- Secure token storage in Keychain
- Automatic token refresh
- Biometric authentication option

### 12.2 Data Protection

- HTTPS for all API calls
- Downloaded files stored in protected container
- No sensitive data in logs

### 12.3 Privacy

- Privacy settings for profile visibility
- Thought visibility controls
- Reading history privacy option

---

## 13. Related Documentation

- [System Architecture Overview](./architecture/OVERVIEW.md)
- [API Reference](./architecture/API_REFERENCE.md)
- [AI Features Architecture](./architecture/AI_FEATURES.md)
- [Ebook Reader Implementation](./ebook-reader.md)
- [Magazine Reader Implementation](./magazine-reader.md)

---

## Appendix: Design Reference Index

This document is based on 65 design pages from the WeRead PRD, covering:

1. AI Reading / Audiobook Player Page
2. Bookshelf Page
3. Category Page (Level 1)
4. Category Detail Page (with filters)
5. Store Home Page
6. Ranking Pages (Trending, New, Novel, etc.)
7. Book Detail Pages (Info, Ratings, AI Guide, Related)
8. Book Quick Preview Card
9. Reading Page (Content, Toolbar, Settings)
10. Text Selection Toolbar (Highlight, Thought, Share)
11. TOC / AI Outline / Search Panel
12. Friends Activity Page
13. Share Panel
14. Reader More Options Panel
15. Membership Prompt Popup
16. Membership Purchase Page
17. AI Q&A Page
18. Query Results Page (Dictionary + AI)
19. Reading Progress / Settings Panel
20. Profile Page
21. Settings Page
22. Reading Statistics (Week/Month/Year/Total/Calendar)
23. Reading Data Share Card
24. Badges Page (All badge types)
25. Badge Detail Popup
26. Reading Leaderboard
27. Personal Page
28. Personal Page Settings
29. Publish Thought Page
30. Topic / Category Selection Popup
