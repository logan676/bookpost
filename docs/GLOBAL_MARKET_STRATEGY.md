# BookLibrio Global Market Strategy

## Target Market: Australia (Primary)

BookLibrio is a reading platform designed for the global market, with initial focus on Australian users.

---

## 1. Localization Requirements

### 1.1 Language
- **Default Language**: English (Australian English)
- **Date Format**: DD/MM/YYYY (Australian standard)
- **Time Format**: 12-hour with AM/PM or 24-hour (user preference)
- **Currency**: AUD ($) for any purchases
- **Timezone**: Default to user's device timezone, support all Australian timezones (AEST, ACST, AWST, etc.)

### 1.2 Content Considerations
- Book recommendations aligned with Australian reading preferences
- Integration with Australian book retailers (if applicable)
- Support for Australian public library systems (future feature)
- Australian book awards and bestseller lists

---

## 2. Feature Adaptations

### 2.1 Reading Statistics
| Feature | Implementation |
|---------|----------------|
| Week Start | Monday (ISO standard, matches AU) |
| Date Display | "15 March 2025" or "15/03/2025" |
| Duration | "2h 30m" or "2 hours 30 minutes" |

### 2.2 Badge System (English)

**Categories:**
| Category | Display Name |
|----------|--------------|
| reading_streak | Reading Streak |
| reading_duration | Reading Time |
| reading_days | Reading Days |
| books_finished | Books Finished |
| weekly_challenge | Weekly Challenge |
| monthly_challenge | Monthly Challenge |

**Badge Names:**
- "7-Day Streak" (not "连续阅读7天")
- "100 Hours Read" (not "阅读100小时")
- "10 Books Finished" (not "读完10本书")

### 2.3 Social Features
- Share to platforms popular in Australia:
  - Facebook
  - Instagram
  - Twitter/X
  - LinkedIn
  - WhatsApp
  - Copy Link
- No WeChat/Weibo integration (Chinese social platforms)

### 2.4 Leaderboards
- Weekly leaderboard resets Sunday night (Australian time)
- Rankings visible to friends only by default (privacy-conscious)
- Option to make profile public

---

## 3. UI/UX Considerations

### 3.1 Navigation Labels
| Tab | English |
|-----|---------|
| Tab 1 | Reading |
| Tab 2 | Library |
| Tab 3 | Discover |
| Tab 4 | Social |
| Tab 5 | Profile |

### 3.2 Common UI Strings
```
// Statistics
"This Week" / "This Month" / "This Year" / "All Time"
"Daily average"
"Current streak"
"Longest streak"
"Books read"
"Books finished"
"Reading time"
"Hours"
"Days"

// Badges
"Badges Earned"
"In Progress"
"X more days to earn"
"X more hours to earn"
"X more books to earn"

// Actions
"Start Reading"
"Continue Reading"
"Add to Library"
"Remove from Library"
"Share"
"Settings"

// Empty States
"No books in your library yet"
"No reading activity this week"
"Start reading to earn badges"
```

### 3.3 Accessibility
- VoiceOver support (iOS)
- TalkBack support (Android)
- Dynamic type support
- High contrast mode
- Reduce motion option

---

## 4. Content Strategy for Australia

### 4.1 Book Categories
Standard international categories:
- Fiction
- Non-Fiction
- Science & Technology
- Business & Economics
- Self-Help & Personal Development
- Biography & Memoir
- History
- Science Fiction & Fantasy
- Mystery & Thriller
- Romance
- Children's Books
- Young Adult
- Comics & Graphic Novels
- Poetry
- Religion & Spirituality
- Health & Wellness
- Travel
- Cooking & Food
- Art & Photography

### 4.2 Recommended Integrations
- **Google Books API**: Book metadata and covers
- **Open Library API**: Additional book data
- **Australian ISBN Agency**: For AU-specific publications
- **Goodreads** (if API available): Reviews and recommendations

### 4.3 Local Content Partnerships (Future)
- Australian publishers
- Australian literary prizes (Miles Franklin, Stella Prize, etc.)
- State library systems

---

## 5. Legal & Compliance

### 5.1 Privacy
- Comply with Australian Privacy Act 1988
- GDPR compliance for potential EU users
- Clear privacy policy in plain English
- Data stored in secure regions (preferably AU or nearby)

### 5.2 Terms of Service
- Written in Australian English
- Jurisdiction: Australia
- Consumer rights as per Australian Consumer Law

### 5.3 Age Restrictions
- Minimum age: 13 years (standard for most apps)
- Parental controls for users under 18

---

## 6. Monetization (Future)

### 6.1 Subscription Model
If implementing premium features:
- Price in AUD
- Monthly/Annual options
- Apple App Store / Google Play billing
- GST (10%) included in displayed prices

### 6.2 Potential Premium Features
- Unlimited cloud sync
- Advanced statistics
- Custom reading goals
- Premium themes
- AI-powered recommendations
- Audiobook features

---

## 7. Technical Implementation

### 7.1 API Responses
All API responses use English:
```json
{
  "data": {
    "totalDuration": 7200,
    "formattedDuration": "2h 0m",
    "streak": {
      "current": 15,
      "longest": 45,
      "unit": "days"
    }
  }
}
```

### 7.2 Error Messages
```json
{
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "Reading session not found or has expired"
  }
}
```

### 7.3 Database
- All user-facing text in English
- Timestamps in UTC, converted to local time on client
- Support for UTF-8 (for book titles in various languages)

---

## 8. App Store Presence

### 8.1 App Store Optimization (ASO)
**Title**: BookLibrio - Reading Tracker

**Subtitle**: Track your reading journey

**Keywords**: reading tracker, book log, reading stats, reading streak, book library, ebook reader

**Description**:
```
Track your reading habits and build a lifelong reading practice with BookLibrio.

Features:
• Track reading time across all your books
• Build and maintain reading streaks
• Earn badges for your reading achievements
• View detailed reading statistics
• Organize your personal library
• Read EPUB and PDF ebooks
• Sync across all your devices

Start your reading journey today!
```

### 8.2 Screenshots
- Show English UI
- Feature key screens: Library, Reading Stats, Badges, Reader

---

## 9. Support

### 9.1 Help & FAQ
- Written in English
- Cover common issues
- Contact email for support

### 9.2 Feedback
- In-app feedback mechanism
- App Store review prompts (at appropriate times)

---

## 10. Future Internationalization

While starting with Australia, the app is built for easy expansion:

### 10.1 Prepared for Future Markets
- New Zealand (same language, similar culture)
- UK (English, different date preferences)
- USA (English, different date/measurement systems)
- Canada (English/French bilingual)
- Other English-speaking markets

### 10.2 i18n Architecture
- All strings externalized
- Support for locale-specific formatting
- Right-to-left (RTL) layout support ready
- Plural forms handled properly

---

## Summary

BookLibrio is designed as a global reading platform with Australian market as the primary focus. All user-facing content is in English, with Australian conventions for dates, times, and currency. The app avoids China-specific features (WeChat integration, Chinese UI, etc.) and instead focuses on features and integrations relevant to Australian and broader English-speaking users.
