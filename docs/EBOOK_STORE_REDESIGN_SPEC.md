# E-book Store 重构设计文档

## 概述

本文档描述 E-book Store 页面的重构设计，包含前端布局、API 设计和数据模型变更。

**设计稿参考**: `/Users/HONGBGU/Desktop/BookLibrio/stitch_e_book_store_home_page/`

---

## 1. 页面整体布局

### 新布局结构（从上到下）

```
┌─────────────────────────────────────────────┐
│  Search Bar (搜索栏)                          │
├─────────────────────────────────────────────┤
│  Tab Picker [E-books] [Magazines]            │
├─────────────────────────────────────────────┤
│  § Recommended for You (横向滚动书籍卡片)      │
├─────────────────────────────────────────────┤
│  § Categories (横向滚动，动态分类)              │
├─────────────────────────────────────────────┤
│  § Books by Year (按出版年份分组)              │
├─────────────────────────────────────────────┤
│  § Top Rated (高评分书籍列表)                  │
├─────────────────────────────────────────────┤
│  § Curated Collections (精选合集)             │
├─────────────────────────────────────────────┤
│  § External Rankings (外部排行榜)             │
└─────────────────────────────────────────────┘
```

### 与当前实现对比

| 当前实现 | 新设计 | 变更说明 |
|---------|--------|---------|
| Tab 在搜索栏上方 | Tab 在搜索栏下方 | 位置调整 |
| Categories 4列网格 | Categories 横向滚动 | 布局变更 |
| 无 | Books by Year | 新增 |
| 排行榜预览 | Top Rated | 样式重构 |
| 热门书单 | Curated Collections | 样式优化 |
| 无 | External Rankings | 新增 |

---

## 2. 各区块详细设计

### 2.1 Search Bar (搜索栏)

**位置变更**: 从 Tab 下方移至 Tab 上方

**UI 规格**:
- 占位符: "Search for books or magazines" (根据 Tab 动态切换)
- 背景: `Color(.systemGray6)`
- 圆角: 10pt
- 内边距: 12pt

**无需后端变更**

---

### 2.2 Recommended for You (为你推荐)

**变更**: 从 TabView 轮播改为横向滚动卡片

**UI 规格**:
```
+------------------+  +------------------+  +------------------+
|   [Book Cover]   |  |   [Book Cover]   |  |   [Book Cover]   |
|     100x140      |  |     100x140      |  |     100x140      |
+------------------+  +------------------+  +------------------+
|   Book Title     |  |   Book Title     |  |   Book Title     |
|   Author Name    |  |   Author Name    |  |   Author Name    |
+------------------+  +------------------+  +------------------+
```

**卡片尺寸**:
- 封面: 100 x 140 pt
- 卡片宽度: 100 pt
- 卡片间距: 12 pt

**API**: 复用现有 `GET /api/ebooks?limit=10` 或 `GET /api/rankings/trending`

**无需后端变更**

---

### 2.3 Categories (分类) ⚠️ 需要前端改动

**变更**: 从 4 列网格改为横向滚动

**UI 规格**:
```
横向滚动：
[History] [Literature] [Fiction] [Technology] [Science] [Art] ...

单个分类 Cell:
┌───────────────┐
│    [Icon]     │   图标: 40pt 圆形背景
│   History     │   文字: Caption, Medium
└───────────────┘
Cell 宽度: 70pt
Cell 间距: 12pt
```

**显示规则**:
- 显示所有分类（不再限制 8 个）
- 横向滚动，可滑动查看更多
- 点击进入分类详情页

**API**: 复用现有 `GET /api/categories?bookType=ebook&flat=false`

**无需后端变更**

---

### 2.4 Books by Year (按年份分类) 🔴 需要后端支持

**功能说明**: 展示按出版年份分组的书籍

**UI 规格**:
```
§ Books by Year                        [View More >]
┌─────────────────────────────────────────────────────┐
│ ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│ │  Cover   │  │  Cover   │  │  Cover   │           │
│ │  80x110  │  │  80x110  │  │  80x110  │  →        │
│ ├──────────┤  ├──────────┤  ├──────────┤           │
│ │The Wager │  │Tomorrow..|  │Lessons.. │           │
│ │   2023   │  │   2022   │  │   2022   │           │
│ └──────────┘  └──────────┘  └──────────┘           │
└─────────────────────────────────────────────────────┘
```

**卡片规格**:
- 封面: 80 x 110 pt
- 书名: Caption, Medium, 最多 2 行
- 年份标签: Caption2, Secondary color, 灰色背景圆角标签

**新增 API**:

```
GET /api/store/books-by-year
```

**Request Parameters**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| bookType | string | 是 | "ebook" 或 "magazine" |
| limit | number | 否 | 每年返回书籍数量，默认 10 |
| years | string | 否 | 指定年份，逗号分隔，如 "2024,2023,2022"，默认最近 3 年 |

**Response**:
```json
{
  "data": [
    {
      "year": 2024,
      "books": [
        {
          "id": 123,
          "title": "Book Title",
          "author": "Author Name",
          "coverUrl": "https://...",
          "publicationDate": "2024-03-15",
          "rating": 4.5,
          "ratingCount": 128
        }
      ]
    },
    {
      "year": 2023,
      "books": [...]
    }
  ]
}
```

**数据库变更**:
- 确保 `ebooks` 表的 `publicationDate` 字段已填充
- 可能需要批量更新现有书籍的出版日期

---

### 2.5 Top Rated (高评分书籍) 🔴 需要后端支持

**功能说明**: 展示评分最高的书籍列表

**UI 规格**:
```
§ Top Rated                            [View More >]
┌─────────────────────────────────────────────────────┐
│ ┌────────┬──────────────────────────────────────┐  │
│ │ Cover  │  Project Hail Mary                   │  │
│ │ 60x80  │  Andy Weir                           │  │
│ │        │  ★★★★★  4.8 (2,341)                │  │
│ ├────────┼──────────────────────────────────────┤  │
│ │ Cover  │  Pachinko                            │  │
│ │ 60x80  │  Min Jin Lee                         │  │
│ │        │  ★★★★☆  4.5 (1,892)                │  │
│ └────────┴──────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**列表项规格**:
- 封面: 60 x 80 pt
- 书名: Subheadline, Bold
- 作者: Caption, Secondary color
- 评分: 星级图标 (橙色) + 数字评分 + 评分人数

**API 方案**:

**方案 A**: 复用现有 Rankings API
```
GET /api/rankings/top_rated?limit=10
```
需要确保返回数据包含 `rating` 和 `ratingCount` 字段。

**方案 B**: 新增专用 API (推荐)
```
GET /api/store/top-rated
```

**Request Parameters**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| bookType | string | 是 | "ebook" 或 "magazine" |
| limit | number | 否 | 返回数量，默认 10 |
| minRatingCount | number | 否 | 最小评分人数筛选，默认 10 |

**Response**:
```json
{
  "data": [
    {
      "id": 456,
      "title": "Project Hail Mary",
      "author": "Andy Weir",
      "coverUrl": "https://...",
      "rating": 4.8,
      "ratingCount": 2341,
      "externalRatingSource": "goodreads"
    }
  ],
  "total": 100
}
```

**数据库考虑**:
- 使用 `ebooks.externalRating` 和 `ebooks.externalRatingCount` 字段
- 排序: `ORDER BY externalRating DESC, externalRatingCount DESC`
- 筛选: `WHERE externalRatingCount >= minRatingCount`

---

### 2.6 Curated Collections (精选合集) 🟡 需要后端优化

**功能说明**: 展示编辑精选的主题书单

**UI 规格**:
```
§ Curated Collections                   [View More >]
┌─────────────────────────────────────────────────────┐
│ ┌─────────────────┐  ┌─────────────────┐           │
│ │ [Background Img]│  │ [Background Img]│           │
│ │                 │  │                 │           │
│ │ Classic         │  │ Bill Gates'     │  →        │
│ │ Literature      │  │ Choice          │           │
│ │ 📚 12 books     │  │ 📚 8 books      │           │
│ └─────────────────┘  └─────────────────┘           │
└─────────────────────────────────────────────────────┘
```

**卡片规格**:
- 卡片尺寸: 160 x 120 pt
- 背景: 渐变色或主题图片
- 标题: Subheadline, Bold, 白色
- 书籍数量: Caption, 白色半透明

**API 优化**:

复用现有 `GET /api/book-lists` 并增加字段:

```
GET /api/book-lists?featured=true&limit=6
```

**需要增强的 Response 字段**:
```json
{
  "data": [
    {
      "id": 1,
      "title": "Classic Literature",
      "description": "Timeless literary masterpieces",
      "coverUrl": "https://...",
      "backgroundUrl": "https://...",       // 新增: 背景图
      "themeColor": "#6B4FA2",              // 新增: 主题色
      "bookCount": 12,
      "previewCovers": [                    // 新增: 前3本书封面预览
        "https://cover1.jpg",
        "https://cover2.jpg",
        "https://cover3.jpg"
      ],
      "creator": {
        "id": 1,
        "username": "editor",
        "avatar": "..."
      }
    }
  ]
}
```

**数据库变更**:
```sql
ALTER TABLE book_lists ADD COLUMN background_url TEXT;
ALTER TABLE book_lists ADD COLUMN theme_color VARCHAR(20);
```

---

### 2.7 External Rankings (外部排行榜) 🔴 需要后端支持

**功能说明**: 展示来自外部来源的权威书籍排行榜

**UI 规格**:
```
§ External Rankings & Recommended Lists   [View More >]
┌─────────────────────────────────────────────────────┐
│ ┌─────────────────┐  ┌─────────────────┐           │
│ │ [amazon logo]   │  │ [NYT logo]      │           │
│ │                 │  │                 │           │
│ │ Amazon Annual   │  │ New York Times  │  →        │
│ │ Bestsellers     │  │ Bestseller List │           │
│ │                 │  │                 │           │
│ │ Top Selling...  │  │ Top Fiction &.. │           │
│ └─────────────────┘  └─────────────────┘           │
└─────────────────────────────────────────────────────┘
```

**卡片规格**:
- 卡片尺寸: 160 x 140 pt
- Logo: 40 x 40 pt
- 标题: Subheadline, Bold
- 描述: Caption, Secondary color

**新增 API**:

```
GET /api/store/external-rankings
```

**Request Parameters**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| bookType | string | 否 | "ebook" 或 "magazine"，默认 "ebook" |

**Response**:
```json
{
  "data": [
    {
      "id": "amazon-bestsellers-2024",
      "source": "amazon",
      "sourceName": "Amazon",
      "sourceLogoUrl": "https://...",
      "title": "Amazon Annual Bestsellers",
      "subtitle": "Top Selling Books of 2024",
      "description": "The most purchased books on Amazon this year",
      "bookCount": 100,
      "lastUpdated": "2024-12-01T00:00:00Z",
      "url": "https://amazon.com/bestsellers"
    },
    {
      "id": "nyt-fiction-2024",
      "source": "nyt",
      "sourceName": "New York Times",
      "sourceLogoUrl": "https://...",
      "title": "NYT Bestseller List",
      "subtitle": "Top Fiction & Non-Fiction",
      "description": "Weekly updated bestseller rankings",
      "bookCount": 30,
      "lastUpdated": "2024-12-10T00:00:00Z",
      "url": "https://nytimes.com/books/best-sellers"
    }
  ]
}
```

**新增数据表**:
```sql
CREATE TABLE external_rankings (
  id VARCHAR(100) PRIMARY KEY,
  source VARCHAR(50) NOT NULL,           -- amazon, nyt, goodreads, etc.
  source_name VARCHAR(100) NOT NULL,
  source_logo_url TEXT,
  title VARCHAR(200) NOT NULL,
  subtitle VARCHAR(200),
  description TEXT,
  book_type VARCHAR(20) DEFAULT 'ebook', -- ebook or magazine
  book_count INT DEFAULT 0,
  external_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  last_updated TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 外部排行榜中的书籍关联
CREATE TABLE external_ranking_books (
  id SERIAL PRIMARY KEY,
  ranking_id VARCHAR(100) REFERENCES external_rankings(id),
  book_type VARCHAR(20) NOT NULL,       -- ebook or magazine
  book_id INT,                          -- 关联到 ebooks 或 magazines 表
  external_book_id VARCHAR(100),        -- 外部系统的书籍ID
  rank_position INT,                    -- 在该榜单中的排名
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(ranking_id, book_type, book_id)
);
```

**管理后台需求**:
- 需要提供管理界面配置外部排行榜
- 或使用定时任务自动抓取更新

---

## 3. API 设计总结

### 3.1 新增 API 列表

| 端点 | 方法 | 说明 | 优先级 |
|------|------|------|--------|
| `/api/store/books-by-year` | GET | 按年份获取书籍 | 🔴 高 |
| `/api/store/top-rated` | GET | 获取高评分书籍 | 🔴 高 |
| `/api/store/external-rankings` | GET | 获取外部排行榜 | 🟡 中 |
| `/api/store/external-rankings/:id` | GET | 获取排行榜详情及书籍 | 🟡 中 |

### 3.2 需要优化的现有 API

| 端点 | 优化内容 |
|------|---------|
| `GET /api/book-lists` | 增加 `backgroundUrl`, `themeColor`, `previewCovers` 字段 |
| `GET /api/rankings/top_rated` | 确保返回 `rating`, `ratingCount` 字段 |

### 3.3 新增路由文件

建议创建 `/api/store.ts` 统一管理书城首页相关 API：

```typescript
// packages/api/src/routes/store.ts

import { OpenAPIHono } from '@hono/zod-openapi'

const app = new OpenAPIHono()

// GET /api/store/books-by-year
// GET /api/store/top-rated
// GET /api/store/external-rankings
// GET /api/store/home (聚合首页所有数据的便捷接口)

export default app
```

---

## 4. 数据库变更汇总

### 4.1 修改现有表

```sql
-- book_lists 表增加字段
ALTER TABLE book_lists ADD COLUMN background_url TEXT;
ALTER TABLE book_lists ADD COLUMN theme_color VARCHAR(20);
```

### 4.2 新增表

```sql
-- 外部排行榜配置表
CREATE TABLE external_rankings (
  id VARCHAR(100) PRIMARY KEY,
  source VARCHAR(50) NOT NULL,
  source_name VARCHAR(100) NOT NULL,
  source_logo_url TEXT,
  title VARCHAR(200) NOT NULL,
  subtitle VARCHAR(200),
  description TEXT,
  book_type VARCHAR(20) DEFAULT 'ebook',
  book_count INT DEFAULT 0,
  external_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  last_updated TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 外部排行榜书籍关联表
CREATE TABLE external_ranking_books (
  id SERIAL PRIMARY KEY,
  ranking_id VARCHAR(100) REFERENCES external_rankings(id) ON DELETE CASCADE,
  book_type VARCHAR(20) NOT NULL,
  book_id INT,
  external_book_id VARCHAR(100),
  rank_position INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(ranking_id, book_type, book_id)
);

-- 索引
CREATE INDEX idx_external_rankings_book_type ON external_rankings(book_type);
CREATE INDEX idx_external_rankings_active ON external_rankings(is_active);
CREATE INDEX idx_external_ranking_books_ranking ON external_ranking_books(ranking_id);
```

---

## 5. 实现优先级

### Phase 1 - 前端布局调整 (无需后端)
- [ ] 搜索栏位置调整 (Tab 下方 → Tab 上方)
- [ ] Recommended for You 改为横向滚动
- [ ] Categories 改为横向滚动

### Phase 2 - 高优先级功能 (需要后端)
- [ ] Books by Year 区块
  - [ ] BE: 新增 `/api/store/books-by-year` API
  - [ ] FE: 实现 `BooksByYearSection` 组件
- [ ] Top Rated 区块
  - [ ] BE: 新增 `/api/store/top-rated` API 或优化 rankings API
  - [ ] FE: 实现 `TopRatedSection` 组件

### Phase 3 - 中优先级功能
- [ ] Curated Collections 样式优化
  - [ ] BE: book_lists 表增加字段
  - [ ] BE: 更新 API 返回新字段
  - [ ] FE: 重构 `CuratedCollectionsSection` 组件
- [ ] External Rankings 区块
  - [ ] BE: 新建数据表
  - [ ] BE: 新增 API
  - [ ] BE: 管理后台配置界面 (可选)
  - [ ] FE: 实现 `ExternalRankingsSection` 组件

---

## 6. 开放问题

### Q1: External Rankings 数据来源
- **选项 A**: 手动配置 (管理后台录入)
- **选项 B**: 自动抓取 (定时任务)
- **选项 C**: 第三方 API 对接

**建议**: Phase 1 先使用手动配置，后续根据需求扩展

### Q2: Books by Year 年份范围
- 显示最近几年？(建议 3 年)
- 是否支持用户选择特定年份？

### Q3: Top Rated 最小评分人数
- 建议设置 `minRatingCount = 10` 避免小样本偏差
- 是否需要前端可配置？

---

## 附录: 设计稿截图

### screen.png
展示: Recommended → Categories → Books by Year → External Rankings

### screen copy.png
展示: Recommended → Categories → Books by Year → Top Rated → Curated Collections

两种布局可同时实现，根据数据可用性动态显示。

---

*文档版本: v1.0*
*创建日期: 2024-12-14*
*待评审*
