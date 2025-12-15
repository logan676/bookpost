# Reading Duration Feature - Complete Design

> **Related Documentation:**
> - [iOS Client Architecture](../architecture/IOS_CLIENT_ARCHITECTURE.md) - iOS implementation details
> - [API Reference](../architecture/API_REFERENCE.md) - Complete API specifications
> - [Database Schema](../../packages/api/src/db/schema.ts) - Table definitions

## Feature Overview

Reading duration is one of the core features (similar to WeChat Reading app), including:
- Real-time reading duration tracking
- Reading statistics (daily/weekly/monthly/yearly/total)
- Reading leaderboards
- Reading challenges
- Badge achievement system
- Reading milestones

---

## 1. Data Model Design

### 1.1 Existing Table Extensions

#### `reading_history` Table Extension

```sql
-- Existing fields
-- id, userId, itemType, itemId, title, coverUrl, lastPage, lastReadAt, createdAt

-- New fields
ALTER TABLE reading_history ADD COLUMN IF NOT EXISTS
  progress DECIMAL(5,4) DEFAULT 0,           -- Reading progress 0.0000 - 1.0000
  last_position TEXT,                         -- Precise position (CFI for EPUB, page for PDF)
  chapter_index INTEGER,                      -- Current chapter index
  total_duration_seconds INTEGER DEFAULT 0;   -- Cumulative reading duration for this book (seconds)
```

#### `users` Table Extension

```sql
-- New fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS
  avatar TEXT,                                -- Avatar URL
  gender VARCHAR(20),                         -- male/female/unset
  total_reading_duration INTEGER DEFAULT 0,   -- Cumulative total reading duration (seconds)
  total_reading_days INTEGER DEFAULT 0,       -- Cumulative reading days
  current_streak_days INTEGER DEFAULT 0,      -- Current consecutive reading days
  max_streak_days INTEGER DEFAULT 0,          -- Maximum consecutive reading days
  last_reading_date DATE,                     -- Last reading date
  books_read_count INTEGER DEFAULT 0,         -- Number of books read
  books_finished_count INTEGER DEFAULT 0;     -- Number of books finished
```

### 1.2 New Tables

#### `reading_sessions` - Reading Session Records

Records detailed sessions for each reading activity, used for precise statistics.

```sql
CREATE TABLE reading_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  book_id INTEGER NOT NULL,
  book_type VARCHAR(20) NOT NULL,             -- ebook/magazine/audiobook

  -- Session information
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration_seconds INTEGER DEFAULT 0,         -- This session's duration

  -- Reading position
  start_position TEXT,                        -- Start position
  end_position TEXT,                          -- End position
  start_chapter INTEGER,
  end_chapter INTEGER,
  pages_read INTEGER DEFAULT 0,               -- Pages read this session

  -- Device information
  device_type VARCHAR(50),                    -- ios/android/web
  device_id VARCHAR(100),                     -- Device unique identifier

  -- Status
  is_active BOOLEAN DEFAULT true,             -- Whether session is active
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reading_sessions_user_time ON reading_sessions(user_id, start_time);
CREATE INDEX idx_reading_sessions_book ON reading_sessions(book_id, book_type);
```

#### `daily_reading_stats` - Daily Reading Statistics

Pre-aggregated daily statistics for improved query performance.

```sql
CREATE TABLE daily_reading_stats (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  date DATE NOT NULL,

  -- Duration statistics
  total_duration_seconds INTEGER DEFAULT 0,   -- Total reading duration for the day

  -- Reading content statistics
  books_read INTEGER DEFAULT 0,               -- Books read today
  books_finished INTEGER DEFAULT 0,           -- Books finished today
  pages_read INTEGER DEFAULT 0,               -- Pages read today
  notes_created INTEGER DEFAULT 0,            -- Notes created today
  highlights_created INTEGER DEFAULT 0,       -- Highlights created today

  -- Category statistics (JSON)
  category_durations JSONB DEFAULT '{}',      -- {"Literature": 3600, "History": 1800}
  book_durations JSONB DEFAULT '{}',          -- {bookId: duration}

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, date)
);

CREATE INDEX idx_daily_stats_user_date ON daily_reading_stats(user_id, date);
```

#### `weekly_leaderboard` - Weekly Leaderboard

```sql
CREATE TABLE weekly_leaderboard (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  week_start DATE NOT NULL,                   -- Monday date
  week_end DATE NOT NULL,                     -- Sunday date

  -- Ranking data
  total_duration_seconds INTEGER DEFAULT 0,
  rank INTEGER,
  rank_change INTEGER DEFAULT 0,              -- Rank change compared to last week

  -- Statistics
  reading_days INTEGER DEFAULT 0,             -- Reading days this week
  books_read INTEGER DEFAULT 0,

  -- Interactions
  likes_received INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, week_start)
);

CREATE INDEX idx_weekly_lb_week ON weekly_leaderboard(week_start, rank);
```

#### `reading_milestones` - Reading Milestones

```sql
CREATE TABLE reading_milestones (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),

  milestone_type VARCHAR(50) NOT NULL,        -- Milestone type
  milestone_value INTEGER,                    -- Value (e.g., 100 days, 1000 hours)

  -- Related content
  book_id INTEGER,
  book_type VARCHAR(20),
  book_title TEXT,

  -- Description
  title TEXT NOT NULL,                        -- Display title
  description TEXT,                           -- Description text

  achieved_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, milestone_type, milestone_value)
);

-- Milestone type enum:
-- started_book: Started reading a book
-- finished_book: Finished reading a book
-- streak_days: Consecutive reading N days
-- total_days: Cumulative reading N days
-- total_hours: Cumulative reading N hours
-- books_finished: Finished N books
-- first_highlight: First highlight
-- first_note: First note
```

#### `reading_challenges` - Reading Challenges

```sql
CREATE TABLE reading_challenges (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Challenge type
  challenge_type VARCHAR(50) NOT NULL,        -- weekly/monthly/custom

  -- Target
  target_type VARCHAR(50) NOT NULL,           -- duration/books/days
  target_value INTEGER NOT NULL,              -- Target value

  -- Time range
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Rewards
  badge_id INTEGER REFERENCES badges(id),
  reward_description TEXT,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_challenge_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  challenge_id INTEGER NOT NULL REFERENCES reading_challenges(id),

  current_value INTEGER DEFAULT 0,            -- Current progress
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, challenge_id)
);
```

#### `badges` - Badge Definitions

```sql
CREATE TABLE badges (
  id SERIAL PRIMARY KEY,

  -- Basic information
  category VARCHAR(50) NOT NULL,              -- Badge category
  level INTEGER DEFAULT 1,                    -- Level
  name VARCHAR(100) NOT NULL,
  description TEXT,
  requirement TEXT,                           -- Requirement description

  -- Conditions
  condition_type VARCHAR(50) NOT NULL,        -- streak_days/total_hours/books_finished etc.
  condition_value INTEGER NOT NULL,           -- Required value

  -- Display
  icon_url TEXT,
  background_color VARCHAR(20),

  -- Statistics
  earned_count INTEGER DEFAULT 0,             -- Number of users who earned this

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

## 2. API Design

### 2.1 Reading Session API

#### Start Reading Session

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

#### Update Reading Session (Heartbeat)

Client sends heartbeat every 30 seconds to 1 minute to update reading duration.

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

#### End Reading Session

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
        "title": "100 Hours of Reading"
      }
    ]
  }
}
```

### 2.2 Reading Statistics API

#### Get Reading Statistics

```http
GET /api/user/reading-stats
Authorization: Bearer <token>
```

**Query Parameters:**
- `dimension`: week | month | year | total | calendar
- `date`: Specific date (YYYY-MM-DD)

**Response (Week View):**
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
      { "date": "2025-01-20", "duration": 3600, "dayOfWeek": "Mon" },
      { "date": "2025-01-21", "duration": 2400, "dayOfWeek": "Tue" },
      { "date": "2025-01-22", "duration": 1800, "dayOfWeek": "Wed" },
      { "date": "2025-01-23", "duration": 2700, "dayOfWeek": "Thu" },
      { "date": "2025-01-24", "duration": 3000, "dayOfWeek": "Fri" },
      { "date": "2025-01-25", "duration": 2160, "dayOfWeek": "Sat" },
      { "date": "2025-01-26", "duration": 1800, "dayOfWeek": "Sun" }
    ],

    "topBooks": [
      {
        "bookId": 1,
        "title": "To Live",
        "coverUrl": "...",
        "duration": 7200
      }
    ],

    "categoryPreferences": [
      { "category": "Literature", "duration": 8000, "percentage": 45.8 },
      { "category": "History", "duration": 5000, "percentage": 28.6 }
    ]
  }
}
```

**Response (Calendar View):**
```json
{
  "data": {
    "dimension": "calendar",
    "year": 2025,
    "month": 1,

    "calendarDays": [
      { "date": "2025-01-01", "duration": 3600, "hasReading": true },
      { "date": "2025-01-02", "duration": 0, "hasReading": false }
    ],

    "milestones": [
      {
        "id": 1,
        "date": "2025-01-15",
        "type": "finished_book",
        "title": "Finished \"To Live\"",
        "book": { "id": 1, "title": "To Live", "coverUrl": "..." }
      },
      {
        "id": 2,
        "date": "2025-01-10",
        "type": "streak_days",
        "title": "100 Day Reading Streak",
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

### 2.3 Leaderboard API

#### Get Weekly Leaderboard

```http
GET /api/social/leaderboard
Authorization: Bearer <token>
```

**Query Parameters:**
- `type`: friends | all (default: friends)
- `week`: Week start date (YYYY-MM-DD), defaults to current week

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

#### Like Leaderboard User

```http
POST /api/social/leaderboard/{userId}/like
Authorization: Bearer <token>
```

### 2.4 Reading Challenges API

#### Get Available Challenges

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
        "name": "Perfect Reading Week",
        "description": "Read every day this week, accumulate 10 hours",
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
          "badgeName": "Perfect Reading Week",
          "badgeIcon": "..."
        }
      }
    ],
    "upcoming": [...],
    "completed": [...]
  }
}
```

#### Join Challenge

```http
POST /api/reading/challenges/{challengeId}/join
Authorization: Bearer <token>
```

### 2.5 Badges API

#### Get User Badges

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
        "name": "180 Day Reading Streak",
        "requirement": "Read for 180 consecutive days",
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
        "name": "365 Day Reading Streak",
        "requirement": "Read for 365 consecutive days",
        "iconUrl": "...",
        "progress": {
          "current": 180,
          "target": 365,
          "percentage": 49.3,
          "remaining": "185 more days to earn"
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

### 2.6 Milestones API

#### Get Reading Milestones

```http
GET /api/user/milestones
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit`: Number limit
- `year`: Specific year

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "type": "finished_book",
      "date": "2025-01-15",
      "title": "Finished \"To Live\"",
      "book": {
        "id": 1,
        "title": "To Live",
        "author": "Yu Hua",
        "coverUrl": "..."
      }
    },
    {
      "id": 2,
      "type": "streak_days",
      "date": "2025-01-10",
      "title": "100 Day Reading Streak",
      "value": 100,
      "description": "Consistent reading brings great rewards"
    },
    {
      "id": 3,
      "type": "total_hours",
      "date": "2025-01-05",
      "title": "1000 Hours of Reading",
      "value": 1000
    }
  ]
}
```

---

## 3. Client Implementation

### 3.1 iOS Reading Session Manager

```swift
// ReadingSessionManager.swift

import Foundation

@MainActor
class ReadingSessionManager: ObservableObject {
    static let shared = ReadingSessionManager()

    @Published var currentSession: ReadingSession?
    @Published var todayDuration: TimeInterval = 0

    private var heartbeatTimer: Timer?
    private let heartbeatInterval: TimeInterval = 30  // 30-second heartbeat

    // Start reading session
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

    // Heartbeat update
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

    // Update reading position
    func updatePosition(_ position: String, chapterIndex: Int?, pagesRead: Int = 0) {
        currentSession?.currentPosition = position
        currentSession?.chapterIndex = chapterIndex
        currentSession?.pagesRead += pagesRead
    }

    // End session
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

        // Handle milestone achievements
        if !response.milestonesAchieved.isEmpty {
            NotificationCenter.default.post(
                name: .milestonesAchieved,
                object: response.milestonesAchieved
            )
        }

        return response
    }

    // App enters background
    func handleAppBackgrounded() async {
        await sendHeartbeat()  // Send final heartbeat
    }

    // App returns to foreground
    func handleAppForegrounded() {
        if currentSession != nil {
            startHeartbeat()
        }
    }
}

// Data models
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

### 3.2 Reader Integration

```swift
// EPUBReaderView.swift (partial code)

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

### 3.3 Reading Statistics View

```swift
// ReadingStatsView.swift

struct ReadingStatsView: View {
    @StateObject private var viewModel = ReadingStatsViewModel()
    @State private var selectedDimension: StatsDimension = .week

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Dimension selector
                Picker("", selection: $selectedDimension) {
                    ForEach(StatsDimension.allCases, id: \.self) { dim in
                        Text(dim.title).tag(dim)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)

                // Date range selection
                if selectedDimension != .total {
                    DateRangeSelector(
                        dimension: selectedDimension,
                        selectedDate: $viewModel.selectedDate
                    )
                }

                // Core statistics
                SummaryCard(stats: viewModel.stats)

                // Duration distribution chart
                DurationChartView(data: viewModel.stats?.durationByDay ?? [])

                // Reading records
                ReadingRecordsView(records: viewModel.stats?.readingRecords)

                // Most read books
                if let topBooks = viewModel.stats?.topBooks, !topBooks.isEmpty {
                    TopBooksSection(books: topBooks)
                }

                // Category preferences
                if let preferences = viewModel.stats?.categoryPreferences {
                    CategoryPreferencesView(data: preferences)
                }
            }
            .padding()
        }
        .navigationTitle("My Reading")
        .task {
            await viewModel.loadStats(dimension: selectedDimension)
        }
        .onChange(of: selectedDimension) { _, newValue in
            Task { await viewModel.loadStats(dimension: newValue) }
        }
    }
}

// Core statistics card
struct SummaryCard: View {
    let stats: ReadingStats?

    var body: some View {
        VStack(spacing: 16) {
            // Total duration
            HStack {
                VStack(alignment: .leading) {
                    Text(formatDuration(stats?.summary.totalDuration ?? 0))
                        .font(.system(size: 36, weight: .bold))
                    Text("Reading Duration")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                // Period comparison change
                if let change = stats?.summary.comparisonChange {
                    ChangeIndicator(change: change)
                }
            }

            Divider()

            // Secondary statistics
            HStack {
                StatItem(value: "\(stats?.summary.dailyAverage.formatted() ?? "0")", label: "Daily Avg")
                Spacer()
                StatItem(value: "#\(stats?.summary.friendRanking ?? 0)", label: "Friend Rank")
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }
}

// Duration distribution bar chart
struct DurationChartView: View {
    let data: [DayDuration]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Reading Duration Distribution")
                .font(.headline)

            HStack(alignment: .bottom, spacing: 8) {
                ForEach(data, id: \.date) { day in
                    VStack(spacing: 4) {
                        // Bar
                        RoundedRectangle(cornerRadius: 4)
                            .fill(day.duration > 0 ? Color.blue : Color.gray.opacity(0.3))
                            .frame(width: 32, height: barHeight(for: day.duration))

                        // Day of week
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

## 4. Backend Implementation

### 4.1 Reading Session Service

```typescript
// packages/api/src/services/readingSession.ts

import { db } from '../db/client'
import { readingSessions, dailyReadingStats, users, readingHistory } from '../db/schema'
import { eq, and, sql, gte, lte } from 'drizzle-orm'

export class ReadingSessionService {

  // Start session
  async startSession(params: {
    userId: number
    bookId: number
    bookType: string
    position?: string
    chapterIndex?: number
    deviceType?: string
    deviceId?: string
  }) {
    // Close any previous unclosed sessions for this user
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

    // Create new session
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

  // Heartbeat update
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

    // Update session
    await db
      .update(readingSessions)
      .set({
        endPosition: params.currentPosition,
        endChapter: params.chapterIndex,
        pagesRead: (session.pagesRead || 0) + (params.pagesRead || 0),
        durationSeconds
      })
      .where(eq(readingSessions.id, sessionId))

    // Get today's total duration
    const todayDuration = await this.getTodayDuration(session.userId)

    // Get cumulative duration for this book
    const bookDuration = await this.getBookDuration(session.userId, session.bookId, session.bookType)

    return {
      sessionId,
      durationSeconds,
      todayDuration,
      totalBookDuration: bookDuration
    }
  }

  // End session
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

    // Update session as ended
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

    // Update daily statistics
    await this.updateDailyStats(session.userId, durationSeconds)

    // Update user total statistics
    await this.updateUserStats(session.userId, durationSeconds)

    // Update reading history
    await this.updateReadingHistory(session.userId, session.bookId, session.bookType, params.endPosition, params.chapterIndex)

    // Check milestones
    const milestones = await this.checkMilestones(session.userId)

    return {
      sessionId,
      durationSeconds,
      totalBookDuration: await this.getBookDuration(session.userId, session.bookId, session.bookType),
      todayDuration: await this.getTodayDuration(session.userId),
      milestonesAchieved: milestones
    }
  }

  // Update daily statistics
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

  // Update user total statistics
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

  // Check milestones
  private async checkMilestones(userId: number): Promise<Milestone[]> {
    const [user] = await db.select().from(users).where(eq(users.id, userId))
    const achieved: Milestone[] = []

    // Check reading duration milestones
    const hourMilestones = [10, 50, 100, 500, 1000, 2000, 3000, 5000]
    const totalHours = Math.floor(user.totalReadingDuration / 3600)

    for (const hours of hourMilestones) {
      if (totalHours >= hours) {
        const existing = await this.checkMilestoneExists(userId, 'total_hours', hours)
        if (!existing) {
          await this.createMilestone(userId, 'total_hours', hours, `${hours} Hours of Reading`)
          achieved.push({ type: 'total_hours', value: hours, title: `${hours} Hours of Reading` })
        }
      }
    }

    // Check consecutive reading milestones
    const streakMilestones = [7, 30, 90, 180, 365, 500, 1000]
    for (const days of streakMilestones) {
      if (user.currentStreakDays >= days) {
        const existing = await this.checkMilestoneExists(userId, 'streak_days', days)
        if (!existing) {
          await this.createMilestone(userId, 'streak_days', days, `${days} Day Reading Streak`)
          achieved.push({ type: 'streak_days', value: days, title: `${days} Day Reading Streak` })
        }
      }
    }

    return achieved
  }

  // Get today's reading duration
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

  // Get cumulative reading duration for a book
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

### 4.2 Reading Statistics Service

```typescript
// packages/api/src/services/readingStats.ts

import { db } from '../db/client'
import { dailyReadingStats, readingSessions, users, readingMilestones } from '../db/schema'
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm'

export class ReadingStatsService {

  // Get week statistics
  async getWeekStats(userId: number, weekStart: Date) {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)

    // Get daily data
    const dailyData = await db
      .select()
      .from(dailyReadingStats)
      .where(and(
        eq(dailyReadingStats.userId, userId),
        gte(dailyReadingStats.date, weekStart.toISOString().split('T')[0]),
        lte(dailyReadingStats.date, weekEnd.toISOString().split('T')[0])
      ))
      .orderBy(dailyReadingStats.date)

    // Calculate summary
    const totalDuration = dailyData.reduce((sum, d) => sum + d.totalDurationSeconds, 0)
    const readingDays = dailyData.filter(d => d.totalDurationSeconds > 0).length

    // Get last week data for comparison
    const lastWeekStart = new Date(weekStart)
    lastWeekStart.setDate(lastWeekStart.getDate() - 7)
    const lastWeekStats = await this.getWeekTotalDuration(userId, lastWeekStart)

    const comparisonChange = lastWeekStats > 0
      ? ((totalDuration - lastWeekStats) / lastWeekStats) * 100
      : 0

    // Get friend ranking
    const friendRanking = await this.getFriendRanking(userId, weekStart)

    // Fill complete 7-day data
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

  // Get month statistics
  async getMonthStats(userId: number, year: number, month: number) {
    const monthStart = new Date(year, month - 1, 1)
    const monthEnd = new Date(year, month, 0)

    // Similar to week statistics logic...
  }

  // Get year statistics
  async getYearStats(userId: number, year: number) {
    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year, 11, 31)

    // Aggregate by month
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

  // Get calendar view
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

    // Get milestones
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

  // Get total statistics
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

  // Helper methods
  private fillWeekDays(weekStart: Date, dailyData: any[]) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
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

## 5. Scheduled Tasks

### 5.1 Weekly Leaderboard Settlement

```typescript
// packages/api/src/jobs/weeklyLeaderboard.ts

import { CronJob } from 'cron'
import { db } from '../db/client'
import { weeklyLeaderboard, dailyReadingStats, users } from '../db/schema'
import { sql, gte, lte, eq, desc } from 'drizzle-orm'

// Execute every Sunday at 24:00 (Monday 00:00)
export const weeklyLeaderboardJob = new CronJob('0 0 * * 1', async () => {
  console.log('Starting weekly leaderboard settlement...')

  // Get last week's date range
  const now = new Date()
  const weekEnd = new Date(now)
  weekEnd.setDate(now.getDate() - 1)  // Yesterday (Sunday)
  const weekStart = new Date(weekEnd)
  weekStart.setDate(weekEnd.getDate() - 6)  // Last Monday

  // Aggregate last week's data
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

  // Get previous week rankings for calculating rank change
  const previousWeekStart = new Date(weekStart)
  previousWeekStart.setDate(previousWeekStart.getDate() - 7)
  const previousRankings = await db
    .select()
    .from(weeklyLeaderboard)
    .where(eq(weeklyLeaderboard.weekStart, previousWeekStart.toISOString().split('T')[0]))

  const previousRankMap = new Map(
    previousRankings.map(r => [r.userId, r.rank])
  )

  // Write this week's leaderboard
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

// Start scheduled task
weeklyLeaderboardJob.start()
```

### 5.2 Badge Check Task

```typescript
// packages/api/src/jobs/badgeCheck.ts

import { CronJob } from 'cron'
import { db } from '../db/client'
import { users, badges, userBadges } from '../db/schema'
import { eq, and, notExists, sql } from 'drizzle-orm'

// Check badges every day at 1:00 AM
export const badgeCheckJob = new CronJob('0 1 * * *', async () => {
  console.log('Starting badge check...')

  // Get all badge definitions
  const allBadges = await db.select().from(badges).where(eq(badges.isActive, true))

  // Get all users
  const allUsers = await db.select().from(users)

  for (const user of allUsers) {
    for (const badge of allBadges) {
      // Check if user already earned this badge
      const [existing] = await db
        .select()
        .from(userBadges)
        .where(and(
          eq(userBadges.userId, user.id),
          eq(userBadges.badgeId, badge.id)
        ))

      if (existing) continue

      // Check if conditions are met
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
        // Award badge
        await db.insert(userBadges).values({
          userId: user.id,
          badgeId: badge.id
        })

        // Update badge earned count
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

## 6. Badge Data Initialization

```sql
-- Initialize badge data
INSERT INTO badges (category, level, name, requirement, condition_type, condition_value, icon_url) VALUES
-- Reading Streak
('reading_streak', 1, '7 Day Reading Streak', 'Read for 7 consecutive days', 'streak_days', 7, '/badges/streak_7.png'),
('reading_streak', 2, '30 Day Reading Streak', 'Read for 30 consecutive days', 'streak_days', 30, '/badges/streak_30.png'),
('reading_streak', 3, '90 Day Reading Streak', 'Read for 90 consecutive days', 'streak_days', 90, '/badges/streak_90.png'),
('reading_streak', 4, '180 Day Reading Streak', 'Read for 180 consecutive days', 'streak_days', 180, '/badges/streak_180.png'),
('reading_streak', 5, '365 Day Reading Streak', 'Read for 365 consecutive days', 'streak_days', 365, '/badges/streak_365.png'),
('reading_streak', 6, '1000 Day Reading Streak', 'Read for 1000 consecutive days', 'streak_days', 1000, '/badges/streak_1000.png'),

-- Reading Duration
('reading_duration', 1, '100 Hours Reader', 'Accumulate 100 hours of reading', 'total_hours', 100, '/badges/hours_100.png'),
('reading_duration', 2, '500 Hours Reader', 'Accumulate 500 hours of reading', 'total_hours', 500, '/badges/hours_500.png'),
('reading_duration', 3, '1000 Hours Reader', 'Accumulate 1000 hours of reading', 'total_hours', 1000, '/badges/hours_1000.png'),
('reading_duration', 4, '2000 Hours Reader', 'Accumulate 2000 hours of reading', 'total_hours', 2000, '/badges/hours_2000.png'),
('reading_duration', 5, '3000 Hours Reader', 'Accumulate 3000 hours of reading', 'total_hours', 3000, '/badges/hours_3000.png'),
('reading_duration', 6, '5000 Hours Reader', 'Accumulate 5000 hours of reading', 'total_hours', 5000, '/badges/hours_5000.png'),

-- Reading Days
('reading_days', 1, '100 Days of Reading', 'Accumulate 100 days of reading', 'total_days', 100, '/badges/days_100.png'),
('reading_days', 2, '200 Days of Reading', 'Accumulate 200 days of reading', 'total_days', 200, '/badges/days_200.png'),
('reading_days', 3, '365 Days of Reading', 'Accumulate 365 days of reading', 'total_days', 365, '/badges/days_365.png'),

-- Books Finished
('books_finished', 1, 'Finished 10 Books', 'Finish reading 10 books', 'books_finished', 10, '/badges/books_10.png'),
('books_finished', 2, 'Finished 50 Books', 'Finish reading 50 books', 'books_finished', 50, '/badges/books_50.png'),
('books_finished', 3, 'Finished 100 Books', 'Finish reading 100 books', 'books_finished', 100, '/badges/books_100.png'),
('books_finished', 4, 'Finished 200 Books', 'Finish reading 200 books', 'books_finished', 200, '/badges/books_200.png'),
('books_finished', 5, 'Finished 500 Books', 'Finish reading 500 books', 'books_finished', 500, '/badges/books_500.png'),
('books_finished', 6, 'Finished 1000 Books', 'Finish reading 1000 books', 'books_finished', 1000, '/badges/books_1000.png'),

-- Weekly Challenge
('weekly_challenge', 1, 'Perfect Reading Week', 'Read every day this week, accumulate 10 hours', 'weekly_perfect', 1, '/badges/weekly_perfect.png'),
('weekly_challenge', 2, 'Intense Reading Week', 'Read every day this week, accumulate 25 hours', 'weekly_intense', 1, '/badges/weekly_intense.png'),

-- Monthly Challenge
('monthly_challenge', 1, 'Perfect Reading Month', 'Read every day this month, accumulate 40 hours', 'monthly_perfect', 1, '/badges/monthly_perfect.png'),
('monthly_challenge', 2, 'Intense Reading Month', 'Read every day this month, accumulate 100 hours', 'monthly_intense', 1, '/badges/monthly_intense.png');
```

---

## 7. API Routes Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/reading/sessions/start` | POST | Start reading session |
| `/api/reading/sessions/{id}/heartbeat` | POST | Session heartbeat |
| `/api/reading/sessions/{id}/end` | POST | End reading session |
| `/api/user/reading-stats` | GET | Get reading statistics |
| `/api/social/leaderboard` | GET | Get weekly leaderboard |
| `/api/social/leaderboard/{userId}/like` | POST | Like leaderboard user |
| `/api/reading/challenges` | GET | Get reading challenges |
| `/api/reading/challenges/{id}/join` | POST | Join challenge |
| `/api/user/badges` | GET | Get user badges |
| `/api/user/milestones` | GET | Get reading milestones |

---

## 8. Implementation Priority

| Phase | Feature | Priority |
|-------|---------|----------|
| P0 | Reading session tracking (start/heartbeat/end) | Highest |
| P0 | Daily statistics aggregation | Highest |
| P0 | User total statistics update | Highest |
| P1 | Week/month/year statistics query | High |
| P1 | Weekly leaderboard | High |
| P1 | Milestone detection | High |
| P2 | Badge system | Medium |
| P2 | Reading challenges | Medium |
| P2 | Calendar view | Medium |
| P3 | Reading share cards | Low |
