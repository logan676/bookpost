# 阅读时长功能完整设计

> **相关文档：**
> - [iOS 客户端架构](./IOS_CLIENT_ARCHITECTURE.md) - iOS 端实现细节
> - [API 参考](./architecture/API_REFERENCE.md) - 完整 API 规格
> - [数据库 Schema](../packages/api/src/db/schema.ts) - 数据表定义

## 功能概述

阅读时长是微信读书APP的核心功能之一，涉及：
- 实时阅读时长记录
- 阅读统计（日/周/月/年/总）
- 读书排行榜
- 阅读挑战赛
- 勋章成就系统
- 阅读里程碑

---

## 1. 数据模型设计

### 1.1 现有表扩展

#### `reading_history` 表扩展

```sql
-- 现有字段
-- id, userId, itemType, itemId, title, coverUrl, lastPage, lastReadAt, createdAt

-- 新增字段
ALTER TABLE reading_history ADD COLUMN IF NOT EXISTS
  progress DECIMAL(5,4) DEFAULT 0,           -- 阅读进度 0.0000 - 1.0000
  last_position TEXT,                         -- 精确位置 (CFI for EPUB, page for PDF)
  chapter_index INTEGER,                      -- 当前章节索引
  total_duration_seconds INTEGER DEFAULT 0;   -- 该书累计阅读时长(秒)
```

#### `users` 表扩展

```sql
-- 新增字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS
  avatar TEXT,                                -- 头像URL
  gender VARCHAR(20),                         -- male/female/unset
  total_reading_duration INTEGER DEFAULT 0,   -- 累计总阅读时长(秒)
  total_reading_days INTEGER DEFAULT 0,       -- 累计阅读天数
  current_streak_days INTEGER DEFAULT 0,      -- 当前连续阅读天数
  max_streak_days INTEGER DEFAULT 0,          -- 最长连续阅读天数
  last_reading_date DATE,                     -- 最后阅读日期
  books_read_count INTEGER DEFAULT 0,         -- 读过的书数量
  books_finished_count INTEGER DEFAULT 0;     -- 读完的书数量
```

### 1.2 新建表

#### `reading_sessions` - 阅读会话记录

记录每次阅读的详细会话，用于精确统计。

```sql
CREATE TABLE reading_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  book_id INTEGER NOT NULL,
  book_type VARCHAR(20) NOT NULL,             -- ebook/magazine/audiobook

  -- 会话信息
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration_seconds INTEGER DEFAULT 0,         -- 本次会话时长

  -- 阅读位置
  start_position TEXT,                        -- 开始位置
  end_position TEXT,                          -- 结束位置
  start_chapter INTEGER,
  end_chapter INTEGER,
  pages_read INTEGER DEFAULT 0,               -- 本次阅读页数

  -- 设备信息
  device_type VARCHAR(50),                    -- ios/android/web
  device_id VARCHAR(100),                     -- 设备唯一标识

  -- 状态
  is_active BOOLEAN DEFAULT true,             -- 是否活跃会话
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reading_sessions_user_time ON reading_sessions(user_id, start_time);
CREATE INDEX idx_reading_sessions_book ON reading_sessions(book_id, book_type);
```

#### `daily_reading_stats` - 每日阅读统计

预聚合的每日统计数据，提高查询性能。

```sql
CREATE TABLE daily_reading_stats (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  date DATE NOT NULL,

  -- 时长统计
  total_duration_seconds INTEGER DEFAULT 0,   -- 当日总阅读时长

  -- 阅读内容统计
  books_read INTEGER DEFAULT 0,               -- 当日阅读书籍数
  books_finished INTEGER DEFAULT 0,           -- 当日读完书籍数
  pages_read INTEGER DEFAULT 0,               -- 当日阅读页数
  notes_created INTEGER DEFAULT 0,            -- 当日创建笔记数
  highlights_created INTEGER DEFAULT 0,       -- 当日划线数

  -- 阅读分类统计 (JSON)
  category_durations JSONB DEFAULT '{}',      -- {"文学": 3600, "历史": 1800}
  book_durations JSONB DEFAULT '{}',          -- {bookId: duration}

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, date)
);

CREATE INDEX idx_daily_stats_user_date ON daily_reading_stats(user_id, date);
```

#### `weekly_leaderboard` - 周排行榜

```sql
CREATE TABLE weekly_leaderboard (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  week_start DATE NOT NULL,                   -- 周一日期
  week_end DATE NOT NULL,                     -- 周日日期

  -- 排名数据
  total_duration_seconds INTEGER DEFAULT 0,
  rank INTEGER,
  rank_change INTEGER DEFAULT 0,              -- 相比上周排名变化

  -- 统计数据
  reading_days INTEGER DEFAULT 0,             -- 本周阅读天数
  books_read INTEGER DEFAULT 0,

  -- 互动
  likes_received INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, week_start)
);

CREATE INDEX idx_weekly_lb_week ON weekly_leaderboard(week_start, rank);
```

#### `reading_milestones` - 阅读里程碑

```sql
CREATE TABLE reading_milestones (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),

  milestone_type VARCHAR(50) NOT NULL,        -- 里程碑类型
  milestone_value INTEGER,                    -- 数值（如100天、1000小时）

  -- 关联内容
  book_id INTEGER,
  book_type VARCHAR(20),
  book_title TEXT,

  -- 描述
  title TEXT NOT NULL,                        -- 显示标题
  description TEXT,                           -- 描述文本

  achieved_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, milestone_type, milestone_value)
);

-- 里程碑类型枚举
-- started_book: 开始阅读某书
-- finished_book: 读完某书
-- streak_days: 连续阅读N天
-- total_days: 累计阅读N天
-- total_hours: 累计阅读N小时
-- books_finished: 读完N本书
-- first_highlight: 第一次划线
-- first_note: 第一次写想法
```

#### `reading_challenges` - 阅读挑战

```sql
CREATE TABLE reading_challenges (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- 挑战类型
  challenge_type VARCHAR(50) NOT NULL,        -- weekly/monthly/custom

  -- 目标
  target_type VARCHAR(50) NOT NULL,           -- duration/books/days
  target_value INTEGER NOT NULL,              -- 目标数值

  -- 时间范围
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- 奖励
  badge_id INTEGER REFERENCES badges(id),
  reward_description TEXT,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_challenge_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  challenge_id INTEGER NOT NULL REFERENCES reading_challenges(id),

  current_value INTEGER DEFAULT 0,            -- 当前进度
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, challenge_id)
);
```

#### `badges` - 勋章定义

```sql
CREATE TABLE badges (
  id SERIAL PRIMARY KEY,

  -- 基本信息
  category VARCHAR(50) NOT NULL,              -- 勋章分类
  level INTEGER DEFAULT 1,                    -- 等级
  name VARCHAR(100) NOT NULL,
  description TEXT,
  requirement TEXT,                           -- 获取条件描述

  -- 条件
  condition_type VARCHAR(50) NOT NULL,        -- streak_days/total_hours/books_finished等
  condition_value INTEGER NOT NULL,           -- 需要达到的数值

  -- 显示
  icon_url TEXT,
  background_color VARCHAR(20),

  -- 统计
  earned_count INTEGER DEFAULT 0,             -- 已获得人数

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_badges (
  user_id INTEGER NOT NULL REFERENCES users(id),
  badge_id INTEGER NOT NULL REFERENCES badges(id),
  earned_at TIMESTAMP DEFAULT NOW(),

  PRIMARY KEY(user_id, badge_id)
);
```

---

## 2. API 设计

### 2.1 阅读会话 API

#### 开始阅读会话

```http
POST /api/reading/sessions/start
Authorization: Bearer <token>
```

**Request:**
```json
{
  "bookId": 1,
  "bookType": "ebook",
  "position": "epubcfi(/6/4[chap01]!/4/2/1:0)",
  "chapterIndex": 3,
  "deviceType": "ios",
  "deviceId": "xxx-xxx-xxx"
}
```

**Response:**
```json
{
  "data": {
    "sessionId": 12345,
    "startTime": "2025-01-22T10:00:00Z"
  }
}
```

#### 更新阅读会话 (心跳)

客户端每30秒-1分钟发送一次心跳，更新阅读时长。

```http
POST /api/reading/sessions/{sessionId}/heartbeat
Authorization: Bearer <token>
```

**Request:**
```json
{
  "currentPosition": "epubcfi(/6/4[chap01]!/4/2/1:500)",
  "chapterIndex": 3,
  "pagesRead": 2
}
```

**Response:**
```json
{
  "data": {
    "sessionId": 12345,
    "durationSeconds": 180,
    "totalBookDuration": 7200
  }
}
```

#### 结束阅读会话

```http
POST /api/reading/sessions/{sessionId}/end
Authorization: Bearer <token>
```

**Request:**
```json
{
  "endPosition": "epubcfi(/6/4[chap01]!/4/2/1:1000)",
  "chapterIndex": 4,
  "pagesRead": 5
}
```

**Response:**
```json
{
  "data": {
    "sessionId": 12345,
    "durationSeconds": 1800,
    "totalBookDuration": 9000,
    "todayDuration": 3600,
    "milestonesAchieved": [
      {
        "type": "total_hours",
        "value": 100,
        "title": "累计阅读100小时"
      }
    ]
  }
}
```

### 2.2 阅读统计 API

#### 获取阅读统计

```http
GET /api/user/reading-stats
Authorization: Bearer <token>
```

**Query Parameters:**
- `dimension`: week | month | year | total | calendar
- `date`: 指定日期 (YYYY-MM-DD)

**Response (周视图):**
```json
{
  "data": {
    "dimension": "week",
    "dateRange": {
      "start": "2025-01-20",
      "end": "2025-01-26"
    },

    "summary": {
      "totalDuration": 17460,
      "dailyAverage": 2494,
      "comparisonChange": 15.5,
      "friendRanking": 42
    },

    "readingRecords": {
      "booksRead": 3,
      "booksFinished": 1,
      "readingDays": 7,
      "notesCount": 25,
      "highlightsCount": 48
    },

    "durationByDay": [
      { "date": "2025-01-20", "duration": 3600, "dayOfWeek": "周一" },
      { "date": "2025-01-21", "duration": 2400, "dayOfWeek": "周二" },
      { "date": "2025-01-22", "duration": 1800, "dayOfWeek": "周三" },
      { "date": "2025-01-23", "duration": 2700, "dayOfWeek": "周四" },
      { "date": "2025-01-24", "duration": 3000, "dayOfWeek": "周五" },
      { "date": "2025-01-25", "duration": 2160, "dayOfWeek": "周六" },
      { "date": "2025-01-26", "duration": 1800, "dayOfWeek": "周日" }
    ],

    "topBooks": [
      {
        "bookId": 1,
        "title": "活着",
        "coverUrl": "...",
        "duration": 7200
      }
    ],

    "categoryPreferences": [
      { "category": "文学", "duration": 8000, "percentage": 45.8 },
      { "category": "历史", "duration": 5000, "percentage": 28.6 }
    ]
  }
}
```

**Response (日历视图):**
```json
{
  "data": {
    "dimension": "calendar",
    "year": 2025,
    "month": 1,

    "calendarDays": [
      { "date": "2025-01-01", "duration": 3600, "hasReading": true },
      { "date": "2025-01-02", "duration": 0, "hasReading": false },
      ...
    ],

    "milestones": [
      {
        "id": 1,
        "date": "2025-01-15",
        "type": "finished_book",
        "title": "读完了《活着》",
        "book": { "id": 1, "title": "活着", "coverUrl": "..." }
      },
      {
        "id": 2,
        "date": "2025-01-10",
        "type": "streak_days",
        "title": "连续阅读100天",
        "value": 100
      }
    ],

    "yearSummary": {
      "totalDuration": 432000,
      "readingDays": 280,
      "booksFinished": 52,
      "currentStreak": 15,
      "longestStreak": 45
    }
  }
}
```

### 2.3 排行榜 API

#### 获取周排行榜

```http
GET /api/social/leaderboard
Authorization: Bearer <token>
```

**Query Parameters:**
- `type`: friends | all (默认 friends)
- `week`: 周开始日期 (YYYY-MM-DD)，默认本周

**Response:**
```json
{
  "data": {
    "weekRange": {
      "start": "2025-01-20",
      "end": "2025-01-26",
      "settlementTime": "2025-01-26T23:59:59Z"
    },

    "myRanking": {
      "rank": 42,
      "duration": 17460,
      "rankChange": 5,
      "readingDays": 7
    },

    "entries": [
      {
        "rank": 1,
        "user": {
          "id": 10,
          "username": "bookworm",
          "avatar": "..."
        },
        "duration": 126000,
        "readingDays": 7,
        "isLastWeek": false,
        "likesCount": 25,
        "isLiked": false
      },
      {
        "rank": 2,
        "user": { "id": 11, "username": "reader2", "avatar": "..." },
        "duration": 108000,
        "readingDays": 7,
        "isLastWeek": false,
        "likesCount": 18,
        "isLiked": true
      }
    ],

    "totalParticipants": 1250
  }
}
```

#### 点赞排行榜用户

```http
POST /api/social/leaderboard/{userId}/like
Authorization: Bearer <token>
```

### 2.4 阅读挑战 API

#### 获取可参与的挑战

```http
GET /api/reading/challenges
Authorization: Bearer <token>
```

**Response:**
```json
{
  "data": {
    "active": [
      {
        "id": 1,
        "name": "完美阅读周",
        "description": "本周每天阅读，累计阅读10小时",
        "type": "weekly",
        "target": {
          "type": "combined",
          "days": 7,
          "duration": 36000
        },
        "dateRange": {
          "start": "2025-01-20",
          "end": "2025-01-26"
        },
        "progress": {
          "readingDays": 5,
          "duration": 28000,
          "percentage": 77.8
        },
        "reward": {
          "badgeId": 101,
          "badgeName": "完美阅读周",
          "badgeIcon": "..."
        }
      }
    ],
    "upcoming": [...],
    "completed": [...]
  }
}
```

#### 加入挑战

```http
POST /api/reading/challenges/{challengeId}/join
Authorization: Bearer <token>
```

### 2.5 勋章 API

#### 获取用户勋章

```http
GET /api/user/badges
Authorization: Bearer <token>
```

**Response:**
```json
{
  "data": {
    "earned": [
      {
        "id": 1,
        "category": "reading_streak",
        "level": 3,
        "name": "连续阅读180天",
        "requirement": "连续阅读180天",
        "iconUrl": "...",
        "earnedAt": "2025-01-01T00:00:00Z",
        "earnedCount": 5000
      }
    ],
    "inProgress": [
      {
        "id": 2,
        "category": "reading_streak",
        "level": 4,
        "name": "连续阅读365天",
        "requirement": "连续阅读365天",
        "iconUrl": "...",
        "progress": {
          "current": 180,
          "target": 365,
          "percentage": 49.3,
          "remaining": "再阅读185天可得"
        },
        "earnedCount": 1000
      }
    ],
    "categories": {
      "reading_streak": { "earned": 3, "total": 6 },
      "reading_duration": { "earned": 2, "total": 6 },
      "books_finished": { "earned": 4, "total": 6 },
      "weekly_challenge": { "earned": 8, "total": 10 }
    }
  }
}
```

### 2.6 里程碑 API

#### 获取阅读里程碑

```http
GET /api/user/milestones
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit`: 数量限制
- `year`: 指定年份

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "type": "finished_book",
      "date": "2025-01-15",
      "title": "读完了《活着》",
      "book": {
        "id": 1,
        "title": "活着",
        "author": "余华",
        "coverUrl": "..."
      }
    },
    {
      "id": 2,
      "type": "streak_days",
      "date": "2025-01-10",
      "title": "连续阅读100天",
      "value": 100,
      "description": "坚持阅读，收获满满"
    },
    {
      "id": 3,
      "type": "total_hours",
      "date": "2025-01-05",
      "title": "累计阅读1000小时",
      "value": 1000
    }
  ]
}
```

---

## 3. 客户端实现

### 3.1 iOS 阅读会话管理器

```swift
// ReadingSessionManager.swift

import Foundation

@MainActor
class ReadingSessionManager: ObservableObject {
    static let shared = ReadingSessionManager()

    @Published var currentSession: ReadingSession?
    @Published var todayDuration: TimeInterval = 0

    private var heartbeatTimer: Timer?
    private let heartbeatInterval: TimeInterval = 30  // 30秒心跳

    // 开始阅读会话
    func startSession(bookId: Int, bookType: String, position: String?, chapterIndex: Int?) async throws {
        let response = try await APIClient.shared.post(
            "/reading/sessions/start",
            body: StartSessionRequest(
                bookId: bookId,
                bookType: bookType,
                position: position,
                chapterIndex: chapterIndex,
                deviceType: "ios",
                deviceId: UIDevice.current.identifierForVendor?.uuidString
            )
        )

        currentSession = ReadingSession(
            id: response.sessionId,
            bookId: bookId,
            bookType: bookType,
            startTime: Date(),
            currentPosition: position,
            chapterIndex: chapterIndex
        )

        startHeartbeat()
    }

    // 心跳更新
    private func startHeartbeat() {
        heartbeatTimer?.invalidate()
        heartbeatTimer = Timer.scheduledTimer(withTimeInterval: heartbeatInterval, repeats: true) { [weak self] _ in
            Task { @MainActor in
                await self?.sendHeartbeat()
            }
        }
    }

    private func sendHeartbeat() async {
        guard let session = currentSession else { return }

        do {
            let response = try await APIClient.shared.post(
                "/reading/sessions/\(session.id)/heartbeat",
                body: HeartbeatRequest(
                    currentPosition: session.currentPosition,
                    chapterIndex: session.chapterIndex,
                    pagesRead: session.pagesRead
                )
            )

            todayDuration = TimeInterval(response.todayDuration)
        } catch {
            print("Heartbeat failed: \(error)")
        }
    }

    // 更新阅读位置
    func updatePosition(_ position: String, chapterIndex: Int?, pagesRead: Int = 0) {
        currentSession?.currentPosition = position
        currentSession?.chapterIndex = chapterIndex
        currentSession?.pagesRead += pagesRead
    }

    // 结束会话
    func endSession() async throws -> EndSessionResponse? {
        guard let session = currentSession else { return nil }

        heartbeatTimer?.invalidate()
        heartbeatTimer = nil

        let response = try await APIClient.shared.post(
            "/reading/sessions/\(session.id)/end",
            body: EndSessionRequest(
                endPosition: session.currentPosition,
                chapterIndex: session.chapterIndex,
                pagesRead: session.pagesRead
            )
        )

        currentSession = nil

        // 处理里程碑成就
        if !response.milestonesAchieved.isEmpty {
            NotificationCenter.default.post(
                name: .milestonesAchieved,
                object: response.milestonesAchieved
            )
        }

        return response
    }

    // 应用进入后台
    func handleAppBackgrounded() async {
        await sendHeartbeat()  // 发送最后一次心跳
    }

    // 应用回到前台
    func handleAppForegrounded() {
        if currentSession != nil {
            startHeartbeat()
        }
    }
}

// 数据模型
struct ReadingSession {
    let id: Int
    let bookId: Int
    let bookType: String
    let startTime: Date
    var currentPosition: String?
    var chapterIndex: Int?
    var pagesRead: Int = 0
}
```

### 3.2 阅读器集成

```swift
// EPUBReaderView.swift (部分代码)

struct EPUBReaderView: View {
    @StateObject private var sessionManager = ReadingSessionManager.shared
    @State private var currentCFI: String = ""
    @State private var currentChapter: Int = 0

    let book: Book

    var body: some View {
        EPUBContentView(book: book, onLocationChange: handleLocationChange)
            .onAppear {
                Task {
                    try await sessionManager.startSession(
                        bookId: book.id,
                        bookType: "ebook",
                        position: book.lastPosition,
                        chapterIndex: book.lastChapter
                    )
                }
            }
            .onDisappear {
                Task {
                    _ = try await sessionManager.endSession()
                }
            }
            .onChange(of: scenePhase) { oldPhase, newPhase in
                switch newPhase {
                case .background:
                    Task { await sessionManager.handleAppBackgrounded() }
                case .active:
                    sessionManager.handleAppForegrounded()
                default:
                    break
                }
            }
    }

    private func handleLocationChange(cfi: String, chapter: Int, pageChange: Int) {
        currentCFI = cfi
        currentChapter = chapter
        sessionManager.updatePosition(cfi, chapterIndex: chapter, pagesRead: pageChange)
    }
}
```

### 3.3 阅读统计视图

```swift
// ReadingStatsView.swift

struct ReadingStatsView: View {
    @StateObject private var viewModel = ReadingStatsViewModel()
    @State private var selectedDimension: StatsDimension = .week

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // 维度选择器
                Picker("", selection: $selectedDimension) {
                    ForEach(StatsDimension.allCases, id: \.self) { dim in
                        Text(dim.title).tag(dim)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)

                // 时间范围选择
                if selectedDimension != .total {
                    DateRangeSelector(
                        dimension: selectedDimension,
                        selectedDate: $viewModel.selectedDate
                    )
                }

                // 核心统计
                SummaryCard(stats: viewModel.stats)

                // 阅读时长分布图
                DurationChartView(data: viewModel.stats?.durationByDay ?? [])

                // 阅读记录
                ReadingRecordsView(records: viewModel.stats?.readingRecords)

                // 阅读最久的书
                if let topBooks = viewModel.stats?.topBooks, !topBooks.isEmpty {
                    TopBooksSection(books: topBooks)
                }

                // 分类偏好
                if let preferences = viewModel.stats?.categoryPreferences {
                    CategoryPreferencesView(data: preferences)
                }
            }
            .padding()
        }
        .navigationTitle("我的阅读")
        .task {
            await viewModel.loadStats(dimension: selectedDimension)
        }
        .onChange(of: selectedDimension) { _, newValue in
            Task { await viewModel.loadStats(dimension: newValue) }
        }
    }
}

// 核心统计卡片
struct SummaryCard: View {
    let stats: ReadingStats?

    var body: some View {
        VStack(spacing: 16) {
            // 总时长
            HStack {
                VStack(alignment: .leading) {
                    Text(formatDuration(stats?.summary.totalDuration ?? 0))
                        .font(.system(size: 36, weight: .bold))
                    Text("阅读时长")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                // 环比变化
                if let change = stats?.summary.comparisonChange {
                    ChangeIndicator(change: change)
                }
            }

            Divider()

            // 次要统计
            HStack {
                StatItem(value: "\(stats?.summary.dailyAverage.formatted() ?? "0")", label: "日均")
                Spacer()
                StatItem(value: "#\(stats?.summary.friendRanking ?? 0)", label: "朋友排名")
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }
}

// 时长分布柱状图
struct DurationChartView: View {
    let data: [DayDuration]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("阅读时长分布")
                .font(.headline)

            HStack(alignment: .bottom, spacing: 8) {
                ForEach(data, id: \.date) { day in
                    VStack(spacing: 4) {
                        // 柱状图
                        RoundedRectangle(cornerRadius: 4)
                            .fill(day.duration > 0 ? Color.blue : Color.gray.opacity(0.3))
                            .frame(width: 32, height: barHeight(for: day.duration))

                        // 星期
                        Text(day.dayOfWeek.prefix(1))
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .frame(height: 120)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }

    private func barHeight(for duration: Int) -> CGFloat {
        let maxDuration = data.map(\.duration).max() ?? 1
        let ratio = CGFloat(duration) / CGFloat(max(maxDuration, 1))
        return max(4, ratio * 100)
    }
}
```

---

## 4. 后端实现

### 4.1 阅读会话服务

```typescript
// packages/api/src/services/readingSession.ts

import { db } from '../db/client'
import { readingSessions, dailyReadingStats, users, readingHistory } from '../db/schema'
import { eq, and, sql, gte, lte } from 'drizzle-orm'

export class ReadingSessionService {

  // 开始会话
  async startSession(params: {
    userId: number
    bookId: number
    bookType: string
    position?: string
    chapterIndex?: number
    deviceType?: string
    deviceId?: string
  }) {
    // 关闭该用户之前未结束的会话
    await db
      .update(readingSessions)
      .set({
        isActive: false,
        endTime: new Date()
      })
      .where(and(
        eq(readingSessions.userId, params.userId),
        eq(readingSessions.isActive, true)
      ))

    // 创建新会话
    const [session] = await db.insert(readingSessions).values({
      userId: params.userId,
      bookId: params.bookId,
      bookType: params.bookType,
      startTime: new Date(),
      startPosition: params.position,
      startChapter: params.chapterIndex,
      deviceType: params.deviceType,
      deviceId: params.deviceId,
      isActive: true
    }).returning()

    return session
  }

  // 心跳更新
  async heartbeat(sessionId: number, params: {
    currentPosition?: string
    chapterIndex?: number
    pagesRead?: number
  }) {
    const [session] = await db
      .select()
      .from(readingSessions)
      .where(eq(readingSessions.id, sessionId))

    if (!session || !session.isActive) {
      throw new Error('Session not found or inactive')
    }

    const now = new Date()
    const durationSeconds = Math.floor((now.getTime() - session.startTime.getTime()) / 1000)

    // 更新会话
    await db
      .update(readingSessions)
      .set({
        endPosition: params.currentPosition,
        endChapter: params.chapterIndex,
        pagesRead: (session.pagesRead || 0) + (params.pagesRead || 0),
        durationSeconds
      })
      .where(eq(readingSessions.id, sessionId))

    // 获取今日总时长
    const todayDuration = await this.getTodayDuration(session.userId)

    // 获取该书累计时长
    const bookDuration = await this.getBookDuration(session.userId, session.bookId, session.bookType)

    return {
      sessionId,
      durationSeconds,
      todayDuration,
      totalBookDuration: bookDuration
    }
  }

  // 结束会话
  async endSession(sessionId: number, params: {
    endPosition?: string
    chapterIndex?: number
    pagesRead?: number
  }) {
    const [session] = await db
      .select()
      .from(readingSessions)
      .where(eq(readingSessions.id, sessionId))

    if (!session) {
      throw new Error('Session not found')
    }

    const now = new Date()
    const durationSeconds = Math.floor((now.getTime() - session.startTime.getTime()) / 1000)

    // 更新会话为已结束
    await db
      .update(readingSessions)
      .set({
        endTime: now,
        endPosition: params.endPosition,
        endChapter: params.chapterIndex,
        pagesRead: (session.pagesRead || 0) + (params.pagesRead || 0),
        durationSeconds,
        isActive: false
      })
      .where(eq(readingSessions.id, sessionId))

    // 更新每日统计
    await this.updateDailyStats(session.userId, durationSeconds)

    // 更新用户总统计
    await this.updateUserStats(session.userId, durationSeconds)

    // 更新阅读历史
    await this.updateReadingHistory(session.userId, session.bookId, session.bookType, params.endPosition, params.chapterIndex)

    // 检查里程碑
    const milestones = await this.checkMilestones(session.userId)

    return {
      sessionId,
      durationSeconds,
      totalBookDuration: await this.getBookDuration(session.userId, session.bookId, session.bookType),
      todayDuration: await this.getTodayDuration(session.userId),
      milestonesAchieved: milestones
    }
  }

  // 更新每日统计
  private async updateDailyStats(userId: number, durationSeconds: number) {
    const today = new Date().toISOString().split('T')[0]

    await db
      .insert(dailyReadingStats)
      .values({
        userId,
        date: today,
        totalDurationSeconds: durationSeconds
      })
      .onConflictDoUpdate({
        target: [dailyReadingStats.userId, dailyReadingStats.date],
        set: {
          totalDurationSeconds: sql`${dailyReadingStats.totalDurationSeconds} + ${durationSeconds}`,
          updatedAt: new Date()
        }
      })
  }

  // 更新用户总统计
  private async updateUserStats(userId: number, durationSeconds: number) {
    const today = new Date().toISOString().split('T')[0]

    const [user] = await db.select().from(users).where(eq(users.id, userId))

    const lastReadDate = user.lastReadingDate?.toISOString().split('T')[0]
    const isNewDay = lastReadDate !== today
    const isConsecutive = lastReadDate && this.isConsecutiveDay(lastReadDate, today)

    await db
      .update(users)
      .set({
        totalReadingDuration: sql`${users.totalReadingDuration} + ${durationSeconds}`,
        totalReadingDays: isNewDay
          ? sql`${users.totalReadingDays} + 1`
          : users.totalReadingDays,
        currentStreakDays: isConsecutive
          ? sql`${users.currentStreakDays} + 1`
          : isNewDay ? 1 : users.currentStreakDays,
        maxStreakDays: sql`GREATEST(${users.maxStreakDays}, ${users.currentStreakDays})`,
        lastReadingDate: today
      })
      .where(eq(users.id, userId))
  }

  private isConsecutiveDay(lastDate: string, today: string): boolean {
    const last = new Date(lastDate)
    const current = new Date(today)
    const diffDays = Math.floor((current.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays === 1
  }

  // 检查里程碑
  private async checkMilestones(userId: number): Promise<Milestone[]> {
    const [user] = await db.select().from(users).where(eq(users.id, userId))
    const achieved: Milestone[] = []

    // 检查阅读时长里程碑
    const hourMilestones = [10, 50, 100, 500, 1000, 2000, 3000, 5000]
    const totalHours = Math.floor(user.totalReadingDuration / 3600)

    for (const hours of hourMilestones) {
      if (totalHours >= hours) {
        const existing = await this.checkMilestoneExists(userId, 'total_hours', hours)
        if (!existing) {
          await this.createMilestone(userId, 'total_hours', hours, `累计阅读${hours}小时`)
          achieved.push({ type: 'total_hours', value: hours, title: `累计阅读${hours}小时` })
        }
      }
    }

    // 检查连续阅读里程碑
    const streakMilestones = [7, 30, 90, 180, 365, 500, 1000]
    for (const days of streakMilestones) {
      if (user.currentStreakDays >= days) {
        const existing = await this.checkMilestoneExists(userId, 'streak_days', days)
        if (!existing) {
          await this.createMilestone(userId, 'streak_days', days, `连续阅读${days}天`)
          achieved.push({ type: 'streak_days', value: days, title: `连续阅读${days}天` })
        }
      }
    }

    return achieved
  }

  // 获取今日阅读时长
  async getTodayDuration(userId: number): Promise<number> {
    const today = new Date().toISOString().split('T')[0]

    const [stats] = await db
      .select()
      .from(dailyReadingStats)
      .where(and(
        eq(dailyReadingStats.userId, userId),
        eq(dailyReadingStats.date, today)
      ))

    return stats?.totalDurationSeconds || 0
  }

  // 获取某书累计阅读时长
  async getBookDuration(userId: number, bookId: number, bookType: string): Promise<number> {
    const result = await db
      .select({ total: sql<number>`SUM(duration_seconds)` })
      .from(readingSessions)
      .where(and(
        eq(readingSessions.userId, userId),
        eq(readingSessions.bookId, bookId),
        eq(readingSessions.bookType, bookType)
      ))

    return result[0]?.total || 0
  }
}

export const readingSessionService = new ReadingSessionService()
```

### 4.2 阅读统计服务

```typescript
// packages/api/src/services/readingStats.ts

import { db } from '../db/client'
import { dailyReadingStats, readingSessions, users, readingMilestones } from '../db/schema'
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm'

export class ReadingStatsService {

  // 获取周统计
  async getWeekStats(userId: number, weekStart: Date) {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)

    // 获取每日数据
    const dailyData = await db
      .select()
      .from(dailyReadingStats)
      .where(and(
        eq(dailyReadingStats.userId, userId),
        gte(dailyReadingStats.date, weekStart.toISOString().split('T')[0]),
        lte(dailyReadingStats.date, weekEnd.toISOString().split('T')[0])
      ))
      .orderBy(dailyReadingStats.date)

    // 计算汇总
    const totalDuration = dailyData.reduce((sum, d) => sum + d.totalDurationSeconds, 0)
    const readingDays = dailyData.filter(d => d.totalDurationSeconds > 0).length

    // 获取上周数据用于比较
    const lastWeekStart = new Date(weekStart)
    lastWeekStart.setDate(lastWeekStart.getDate() - 7)
    const lastWeekStats = await this.getWeekTotalDuration(userId, lastWeekStart)

    const comparisonChange = lastWeekStats > 0
      ? ((totalDuration - lastWeekStats) / lastWeekStats) * 100
      : 0

    // 获取朋友排名
    const friendRanking = await this.getFriendRanking(userId, weekStart)

    // 填充完整7天数据
    const durationByDay = this.fillWeekDays(weekStart, dailyData)

    return {
      dimension: 'week',
      dateRange: {
        start: weekStart.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0]
      },
      summary: {
        totalDuration,
        dailyAverage: Math.floor(totalDuration / 7),
        comparisonChange,
        friendRanking
      },
      readingRecords: {
        booksRead: await this.getBooksReadCount(userId, weekStart, weekEnd),
        booksFinished: await this.getBooksFinishedCount(userId, weekStart, weekEnd),
        readingDays,
        notesCount: await this.getNotesCount(userId, weekStart, weekEnd),
        highlightsCount: await this.getHighlightsCount(userId, weekStart, weekEnd)
      },
      durationByDay,
      topBooks: await this.getTopBooks(userId, weekStart, weekEnd, 3),
      categoryPreferences: await this.getCategoryPreferences(userId, weekStart, weekEnd)
    }
  }

  // 获取月统计
  async getMonthStats(userId: number, year: number, month: number) {
    const monthStart = new Date(year, month - 1, 1)
    const monthEnd = new Date(year, month, 0)

    // 类似周统计逻辑...
  }

  // 获取年统计
  async getYearStats(userId: number, year: number) {
    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year, 11, 31)

    // 按月聚合
    const monthlyData = await db
      .select({
        month: sql<number>`EXTRACT(MONTH FROM date)`,
        totalDuration: sql<number>`SUM(total_duration_seconds)`,
        readingDays: sql<number>`COUNT(CASE WHEN total_duration_seconds > 0 THEN 1 END)`
      })
      .from(dailyReadingStats)
      .where(and(
        eq(dailyReadingStats.userId, userId),
        gte(dailyReadingStats.date, yearStart.toISOString().split('T')[0]),
        lte(dailyReadingStats.date, yearEnd.toISOString().split('T')[0])
      ))
      .groupBy(sql`EXTRACT(MONTH FROM date)`)
      .orderBy(sql`EXTRACT(MONTH FROM date)`)

    // ...
  }

  // 获取日历视图
  async getCalendarStats(userId: number, year: number, month: number) {
    const monthStart = new Date(year, month - 1, 1)
    const monthEnd = new Date(year, month, 0)

    const dailyData = await db
      .select()
      .from(dailyReadingStats)
      .where(and(
        eq(dailyReadingStats.userId, userId),
        gte(dailyReadingStats.date, monthStart.toISOString().split('T')[0]),
        lte(dailyReadingStats.date, monthEnd.toISOString().split('T')[0])
      ))

    // 获取里程碑
    const milestones = await db
      .select()
      .from(readingMilestones)
      .where(and(
        eq(readingMilestones.userId, userId),
        gte(readingMilestones.achievedAt, monthStart),
        lte(readingMilestones.achievedAt, monthEnd)
      ))
      .orderBy(desc(readingMilestones.achievedAt))

    return {
      dimension: 'calendar',
      year,
      month,
      calendarDays: this.buildCalendarDays(year, month, dailyData),
      milestones
    }
  }

  // 获取总统计
  async getTotalStats(userId: number) {
    const [user] = await db.select().from(users).where(eq(users.id, userId))

    return {
      dimension: 'total',
      summary: {
        totalDuration: user.totalReadingDuration,
        totalDays: user.totalReadingDays,
        currentStreak: user.currentStreakDays,
        longestStreak: user.maxStreakDays,
        booksRead: user.booksReadCount,
        booksFinished: user.booksFinishedCount
      }
    }
  }

  // 辅助方法
  private fillWeekDays(weekStart: Date, dailyData: any[]) {
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    const result = []

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]

      const dayData = dailyData.find(d => d.date === dateStr)

      result.push({
        date: dateStr,
        duration: dayData?.totalDurationSeconds || 0,
        dayOfWeek: days[i]
      })
    }

    return result
  }
}

export const readingStatsService = new ReadingStatsService()
```

---

## 5. 定时任务

### 5.1 周排行榜结算

```typescript
// packages/api/src/jobs/weeklyLeaderboard.ts

import { CronJob } from 'cron'
import { db } from '../db/client'
import { weeklyLeaderboard, dailyReadingStats, users } from '../db/schema'
import { sql, gte, lte, eq, desc } from 'drizzle-orm'

// 每周日 24:00 (周一 00:00) 执行
export const weeklyLeaderboardJob = new CronJob('0 0 * * 1', async () => {
  console.log('Starting weekly leaderboard settlement...')

  // 获取上周的日期范围
  const now = new Date()
  const weekEnd = new Date(now)
  weekEnd.setDate(now.getDate() - 1)  // 昨天 (周日)
  const weekStart = new Date(weekEnd)
  weekStart.setDate(weekEnd.getDate() - 6)  // 上周一

  // 聚合上周数据
  const weeklyData = await db
    .select({
      userId: dailyReadingStats.userId,
      totalDuration: sql<number>`SUM(total_duration_seconds)`,
      readingDays: sql<number>`COUNT(CASE WHEN total_duration_seconds > 0 THEN 1 END)`
    })
    .from(dailyReadingStats)
    .where(and(
      gte(dailyReadingStats.date, weekStart.toISOString().split('T')[0]),
      lte(dailyReadingStats.date, weekEnd.toISOString().split('T')[0])
    ))
    .groupBy(dailyReadingStats.userId)
    .orderBy(desc(sql`SUM(total_duration_seconds)`))

  // 获取上上周排名用于计算排名变化
  const previousWeekStart = new Date(weekStart)
  previousWeekStart.setDate(previousWeekStart.getDate() - 7)
  const previousRankings = await db
    .select()
    .from(weeklyLeaderboard)
    .where(eq(weeklyLeaderboard.weekStart, previousWeekStart.toISOString().split('T')[0]))

  const previousRankMap = new Map(
    previousRankings.map(r => [r.userId, r.rank])
  )

  // 写入本周排行榜
  for (let i = 0; i < weeklyData.length; i++) {
    const data = weeklyData[i]
    const rank = i + 1
    const previousRank = previousRankMap.get(data.userId)
    const rankChange = previousRank ? previousRank - rank : 0

    await db.insert(weeklyLeaderboard).values({
      userId: data.userId,
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0],
      totalDurationSeconds: data.totalDuration,
      rank,
      rankChange,
      readingDays: data.readingDays
    })
  }

  console.log(`Weekly leaderboard settled. Total users: ${weeklyData.length}`)
})

// 启动定时任务
weeklyLeaderboardJob.start()
```

### 5.2 勋章检查任务

```typescript
// packages/api/src/jobs/badgeCheck.ts

import { CronJob } from 'cron'
import { db } from '../db/client'
import { users, badges, userBadges } from '../db/schema'
import { eq, and, notExists, sql } from 'drizzle-orm'

// 每天凌晨 1:00 检查勋章
export const badgeCheckJob = new CronJob('0 1 * * *', async () => {
  console.log('Starting badge check...')

  // 获取所有勋章定义
  const allBadges = await db.select().from(badges).where(eq(badges.isActive, true))

  // 获取所有用户
  const allUsers = await db.select().from(users)

  for (const user of allUsers) {
    for (const badge of allBadges) {
      // 检查用户是否已获得该勋章
      const [existing] = await db
        .select()
        .from(userBadges)
        .where(and(
          eq(userBadges.userId, user.id),
          eq(userBadges.badgeId, badge.id)
        ))

      if (existing) continue

      // 检查是否满足条件
      let qualified = false

      switch (badge.conditionType) {
        case 'streak_days':
          qualified = user.currentStreakDays >= badge.conditionValue
          break
        case 'max_streak_days':
          qualified = user.maxStreakDays >= badge.conditionValue
          break
        case 'total_hours':
          qualified = Math.floor(user.totalReadingDuration / 3600) >= badge.conditionValue
          break
        case 'total_days':
          qualified = user.totalReadingDays >= badge.conditionValue
          break
        case 'books_finished':
          qualified = user.booksFinishedCount >= badge.conditionValue
          break
      }

      if (qualified) {
        // 授予勋章
        await db.insert(userBadges).values({
          userId: user.id,
          badgeId: badge.id
        })

        // 更新勋章获得人数
        await db
          .update(badges)
          .set({ earnedCount: sql`${badges.earnedCount} + 1` })
          .where(eq(badges.id, badge.id))

        console.log(`Badge ${badge.name} awarded to user ${user.id}`)
      }
    }
  }

  console.log('Badge check completed.')
})

badgeCheckJob.start()
```

---

## 6. 勋章数据初始化

```sql
-- 初始化勋章数据
INSERT INTO badges (category, level, name, requirement, condition_type, condition_value, icon_url) VALUES
-- 连续阅读
('reading_streak', 1, '连续阅读7天', '连续阅读7天', 'streak_days', 7, '/badges/streak_7.png'),
('reading_streak', 2, '连续阅读30天', '连续阅读30天', 'streak_days', 30, '/badges/streak_30.png'),
('reading_streak', 3, '连续阅读90天', '连续阅读90天', 'streak_days', 90, '/badges/streak_90.png'),
('reading_streak', 4, '连续阅读180天', '连续阅读180天', 'streak_days', 180, '/badges/streak_180.png'),
('reading_streak', 5, '连续阅读365天', '连续阅读365天', 'streak_days', 365, '/badges/streak_365.png'),
('reading_streak', 6, '连续阅读1000天', '连续阅读1000天', 'streak_days', 1000, '/badges/streak_1000.png'),

-- 阅读时长
('reading_duration', 1, '阅读100小时', '累计阅读100小时', 'total_hours', 100, '/badges/hours_100.png'),
('reading_duration', 2, '阅读500小时', '累计阅读500小时', 'total_hours', 500, '/badges/hours_500.png'),
('reading_duration', 3, '阅读1000小时', '累计阅读1000小时', 'total_hours', 1000, '/badges/hours_1000.png'),
('reading_duration', 4, '阅读2000小时', '累计阅读2000小时', 'total_hours', 2000, '/badges/hours_2000.png'),
('reading_duration', 5, '阅读3000小时', '累计阅读3000小时', 'total_hours', 3000, '/badges/hours_3000.png'),
('reading_duration', 6, '阅读5000小时', '累计阅读5000小时', 'total_hours', 5000, '/badges/hours_5000.png'),

-- 阅读天数
('reading_days', 1, '阅读100天', '累计阅读100天', 'total_days', 100, '/badges/days_100.png'),
('reading_days', 2, '阅读200天', '累计阅读200天', 'total_days', 200, '/badges/days_200.png'),
('reading_days', 3, '阅读365天', '累计阅读365天', 'total_days', 365, '/badges/days_365.png'),

-- 读完书籍
('books_finished', 1, '读完10本书', '读完10本书', 'books_finished', 10, '/badges/books_10.png'),
('books_finished', 2, '读完50本书', '读完50本书', 'books_finished', 50, '/badges/books_50.png'),
('books_finished', 3, '读完100本书', '读完100本书', 'books_finished', 100, '/badges/books_100.png'),
('books_finished', 4, '读完200本书', '读完200本书', 'books_finished', 200, '/badges/books_200.png'),
('books_finished', 5, '读完500本书', '读完500本书', 'books_finished', 500, '/badges/books_500.png'),
('books_finished', 6, '读完1000本书', '读完1000本书', 'books_finished', 1000, '/badges/books_1000.png'),

-- 每周挑战
('weekly_challenge', 1, '完美阅读周', '本周每天阅读，累计10小时', 'weekly_perfect', 1, '/badges/weekly_perfect.png'),
('weekly_challenge', 2, '狂暴阅读周', '本周每天阅读，累计25小时', 'weekly_intense', 1, '/badges/weekly_intense.png'),

-- 每月挑战
('monthly_challenge', 1, '完美阅读月', '本月每天阅读，累计40小时', 'monthly_perfect', 1, '/badges/monthly_perfect.png'),
('monthly_challenge', 2, '狂暴阅读月', '本月每天阅读，累计100小时', 'monthly_intense', 1, '/badges/monthly_intense.png');
```

---

## 7. API 路由汇总

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/reading/sessions/start` | POST | 开始阅读会话 |
| `/api/reading/sessions/{id}/heartbeat` | POST | 会话心跳 |
| `/api/reading/sessions/{id}/end` | POST | 结束阅读会话 |
| `/api/user/reading-stats` | GET | 获取阅读统计 |
| `/api/social/leaderboard` | GET | 获取周排行榜 |
| `/api/social/leaderboard/{userId}/like` | POST | 点赞排行榜用户 |
| `/api/reading/challenges` | GET | 获取阅读挑战 |
| `/api/reading/challenges/{id}/join` | POST | 加入挑战 |
| `/api/user/badges` | GET | 获取用户勋章 |
| `/api/user/milestones` | GET | 获取阅读里程碑 |

---

## 8. 实现优先级

| 阶段 | 功能 | 优先级 |
|------|------|--------|
| P0 | 阅读会话记录 (开始/心跳/结束) | 最高 |
| P0 | 每日统计聚合 | 最高 |
| P0 | 用户总统计更新 | 最高 |
| P1 | 周/月/年统计查询 | 高 |
| P1 | 周排行榜 | 高 |
| P1 | 里程碑检测 | 高 |
| P2 | 勋章系统 | 中 |
| P2 | 阅读挑战 | 中 |
| P2 | 日历视图 | 中 |
| P3 | 阅读分享卡片 | 低 |
