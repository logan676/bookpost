# E-book Store 数据准备实施计划

## 概述

新的 E-book Store 功能依赖以下数据源，需要提前准备：

| 功能 | 数据需求 | 当前状态 |
|------|---------|---------|
| Books by Year | `publication_date` 字段 | ❓ 需检查现有数据 |
| Top Rated | `external_rating`, `external_ratings_count` | ❓ 需检查现有数据 |
| External Rankings | `curated_lists` 表中的榜单数据 | ❌ 需要创建 |
| 书籍封面 | `cover_url` 字段 | ❓ 需检查现有数据 |

---

## Phase 1: 数据现状分析

### 1.1 检查 ebooks 表数据完整性

```sql
-- 检查 publication_date 填充率
SELECT
  COUNT(*) as total,
  COUNT(publication_date) as has_publication_date,
  ROUND(COUNT(publication_date)::numeric / COUNT(*) * 100, 2) as percentage
FROM ebooks;

-- 检查 external_rating 填充率
SELECT
  COUNT(*) as total,
  COUNT(external_rating) as has_rating,
  COUNT(external_ratings_count) as has_rating_count,
  ROUND(COUNT(external_rating)::numeric / COUNT(*) * 100, 2) as rating_percentage
FROM ebooks;

-- 检查 cover_url 填充率
SELECT
  COUNT(*) as total,
  COUNT(cover_url) as has_cover,
  ROUND(COUNT(cover_url)::numeric / COUNT(*) * 100, 2) as percentage
FROM ebooks;

-- 检查 external_rating_source 分布
SELECT
  external_rating_source,
  COUNT(*) as count
FROM ebooks
WHERE external_rating_source IS NOT NULL
GROUP BY external_rating_source;
```

### 1.2 预期结果评估

| 字段 | 最低要求 | 理想状态 |
|------|---------|---------|
| `publication_date` | >50% 有数据 | >90% 有数据 |
| `external_rating` | >30% 有数据 | >70% 有数据 |
| `cover_url` | >80% 有数据 | 100% 有数据 |

---

## Phase 2: 书籍元数据补全

### 2.1 数据来源选项

#### Option A: Open Library API (推荐)
- **优点**: 免费、开放、数据丰富
- **缺点**: 需要 ISBN 匹配
- **API**: `https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data`

```typescript
interface OpenLibraryBook {
  title: string;
  authors: { name: string }[];
  publish_date: string;
  cover: { small: string; medium: string; large: string };
  subjects: { name: string }[];
}
```

#### Option B: Google Books API
- **优点**: 数据全面、支持多种查询方式
- **缺点**: 有请求配额限制 (1000/day free)
- **API**: `https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}`

```typescript
interface GoogleBooksVolume {
  volumeInfo: {
    title: string;
    authors: string[];
    publishedDate: string;
    imageLinks: { thumbnail: string; smallThumbnail: string };
    averageRating: number;
    ratingsCount: number;
  };
}
```

#### Option C: Douban API (豆瓣)
- **优点**: 中文书籍数据更准确
- **缺点**: 官方 API 已关闭，需要爬虫
- **数据**: 评分、封面、出版日期

#### Option D: 手动导入 CSV
- **优点**: 完全可控
- **缺点**: 工作量大
- **适用**: 少量关键书籍

### 2.2 推荐方案

采用**混合策略**：

```
┌─────────────────────────────────────────────────────┐
│                  数据补全流程                         │
├─────────────────────────────────────────────────────┤
│  1. 优先使用 Open Library (免费、无限制)              │
│     ↓ 如果找不到                                     │
│  2. 使用 Google Books API (有配额)                   │
│     ↓ 如果找不到                                     │
│  3. 标记为 "needs_manual_review"                    │
└─────────────────────────────────────────────────────┘
```

### 2.3 实现脚本

创建 `/packages/api/src/scripts/enrich-book-metadata.ts`：

```typescript
// 功能：
// 1. 遍历 ebooks 表中缺失数据的记录
// 2. 使用 ISBN 查询 Open Library / Google Books
// 3. 补全 publication_date, external_rating, cover_url
// 4. 记录处理结果日志

// 运行方式：
// npx tsx src/scripts/enrich-book-metadata.ts --dry-run  # 预览
// npx tsx src/scripts/enrich-book-metadata.ts            # 执行
```

---

## Phase 3: 书籍封面处理

### 3.1 封面来源优先级

1. **现有 cover_url** - 已有的保持不变
2. **Open Library Covers** - `https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg`
3. **Google Books thumbnails** - 从 API 响应获取
4. **默认占位图** - 无封面时显示

### 3.2 封面存储策略

#### Option A: 直接使用外部 URL (推荐初期)
```
优点: 无需存储成本，立即可用
缺点: 依赖外部服务，可能有热链接限制
```

#### Option B: 下载到 CDN/OSS
```
优点: 完全可控，加载更快
缺点: 需要存储成本，需要下载脚本
```

### 3.3 推荐方案

**初期**: 直接使用 Open Library 封面 URL
**后期**: 逐步迁移到自有 CDN

```typescript
// 封面 URL 构建
function getCoverUrl(isbn: string): string {
  return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
}
```

---

## Phase 4: 外部榜单数据准备

### 4.1 需要创建的榜单类型

| list_type | 名称 | 数据来源 | 更新频率 |
|-----------|------|---------|---------|
| `nyt_bestseller` | 纽约时报畅销榜 | NYT API / 手动 | 每周 |
| `amazon_best` | Amazon 畅销榜 | 手动整理 | 每月 |
| `bill_gates` | 比尔盖茨推荐 | Gates Notes | 每年 |
| `goodreads_choice` | Goodreads 年度最佳 | Goodreads | 每年 |
| `pulitzer` | 普利策奖 | 官方公布 | 每年 |
| `booker` | 布克奖 | 官方公布 | 每年 |

### 4.2 榜单数据结构

```sql
-- curated_lists 表 (已存在)
INSERT INTO curated_lists (
  list_type,           -- 'nyt_bestseller', 'amazon_best', etc.
  source_name,         -- '纽约时报', 'Amazon', etc.
  source_logo_url,     -- 来源 logo
  title,               -- '2024年度畅销榜'
  subtitle,            -- 'Fiction'
  description,         -- 榜单描述
  external_url,        -- 原始榜单链接
  is_active,           -- true
  display_order        -- 排序
) VALUES (...);

-- curated_list_items 表 (已存在)
INSERT INTO curated_list_items (
  list_id,             -- 关联 curated_lists
  book_type,           -- 'ebook'
  book_id,             -- 关联 ebooks.id (如果在库中)
  external_book_info,  -- JSON (如果不在库中)
  position,            -- 排名位置
  added_at             -- 添加时间
) VALUES (...);
```

### 4.3 榜单数据准备方案

#### 方案 A: 手动 Seed 脚本 (推荐初期)

创建 `/packages/api/src/scripts/seed-external-rankings.ts`：

```typescript
const rankings = [
  {
    listType: 'nyt_bestseller',
    sourceName: '纽约时报',
    sourceLogoUrl: '/images/logos/nyt.png',
    title: '2024年度畅销书',
    subtitle: 'Fiction',
    books: [
      { title: 'Book 1', author: 'Author 1', isbn: '978-xxx' },
      { title: 'Book 2', author: 'Author 2', isbn: '978-xxx' },
      // ...
    ]
  },
  // ... 更多榜单
];
```

#### 方案 B: NYT Books API (付费)

- **API**: `https://api.nytimes.com/svc/books/v3/lists.json`
- **成本**: $0.50 per 1000 requests
- **优点**: 自动更新，数据准确

#### 方案 C: 定期手动更新

- 每周/月手动更新 CSV
- 导入脚本处理

### 4.4 推荐实施步骤

```
Week 1: 准备 5-10 个经典榜单 (手动)
  ├── 纽约时报 2024 年度榜
  ├── 比尔盖茨 2024 推荐
  ├── 普利策奖 2020-2024
  ├── 布克奖 2020-2024
  └── Goodreads 2024 年度选择

Week 2: 完善榜单书籍数据
  ├── 匹配现有 ebooks 表
  ├── 补充缺失封面
  └── 填充 external_book_info

Week 3+: 考虑自动化更新
  └── NYT API 或定期爬虫
```

---

## Phase 5: 实施时间表

### Week 1: 数据分析 & 脚本开发

| 任务 | 工时 | 负责人 |
|------|------|-------|
| 运行数据完整性检查 SQL | 1h | BE |
| 开发 `enrich-book-metadata.ts` 脚本 | 4h | BE |
| 测试 Open Library API 集成 | 2h | BE |
| 测试 Google Books API 集成 | 2h | BE |

### Week 2: 数据补全

| 任务 | 工时 | 负责人 |
|------|------|-------|
| 运行元数据补全脚本 | 2h | BE |
| 处理补全失败的记录 | 4h | BE/运营 |
| 验证封面 URL 可用性 | 2h | BE |

### Week 3: 榜单数据准备

| 任务 | 工时 | 负责人 |
|------|------|-------|
| 整理 5-10 个经典榜单 CSV | 8h | 运营 |
| 开发 `seed-external-rankings.ts` | 4h | BE |
| 导入榜单数据 | 2h | BE |
| 匹配榜单书籍与 ebooks 表 | 4h | BE |

### Week 4: 测试 & 上线

| 任务 | 工时 | 负责人 |
|------|------|-------|
| API 集成测试 | 4h | BE |
| iOS 前端联调 | 4h | iOS |
| 修复问题 | 4h | ALL |
| 上线 | 2h | BE |

---

## Phase 6: 脚本文件清单

需要创建的脚本：

```
/packages/api/src/scripts/
├── check-data-completeness.ts     # 数据完整性检查
├── enrich-book-metadata.ts        # 元数据补全 (Open Library + Google Books)
├── seed-external-rankings.ts      # 导入外部榜单
├── validate-cover-urls.ts         # 验证封面 URL 可用性
└── data/
    ├── nyt-bestsellers-2024.csv   # 榜单数据文件
    ├── bill-gates-2024.csv
    ├── pulitzer-winners.csv
    ├── booker-winners.csv
    └── goodreads-choice-2024.csv
```

---

## 决策点 (需确认)

### 1. 元数据来源优先级

- [ ] Open Library 优先 (免费)
- [ ] Google Books 优先 (配额限制)
- [ ] 豆瓣爬虫 (中文书更准)

### 2. 封面存储策略

- [ ] 直接使用外部 URL (初期推荐)
- [ ] 下载到自有 CDN

### 3. 榜单数据来源

- [ ] 手动整理 CSV (初期推荐)
- [ ] NYT API (付费自动化)
- [ ] 定期爬虫

### 4. 数据更新频率

- [ ] 手动按需更新
- [ ] 每周自动更新
- [ ] 每月自动更新

---

## 附录: API 参考

### Open Library API

```bash
# 通过 ISBN 查询
curl "https://openlibrary.org/api/books?bibkeys=ISBN:9780140328721&format=json&jscmd=data"

# 封面图片
https://covers.openlibrary.org/b/isbn/9780140328721-L.jpg
```

### Google Books API

```bash
# 通过 ISBN 查询
curl "https://www.googleapis.com/books/v1/volumes?q=isbn:9780140328721"

# 需要 API Key 获取更高配额
curl "https://www.googleapis.com/books/v1/volumes?q=isbn:9780140328721&key=YOUR_API_KEY"
```

### NYT Books API

```bash
# 获取畅销书榜单
curl "https://api.nytimes.com/svc/books/v3/lists/current/hardcover-fiction.json?api-key=YOUR_KEY"
```
