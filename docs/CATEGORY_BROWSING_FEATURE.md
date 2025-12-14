# 书籍分类浏览功能设计文档

Book Category Browsing Feature Design Document

---

## 1. 功能概述 (Feature Overview)

### 1.1 目标 (Goals)

为用户提供按分类浏览书籍的功能，使用户能够：
- 快速发现感兴趣的书籍类型
- 按照标签/分类筛选电子书和杂志
- 探索不同领域的内容

### 1.2 范围 (Scope)

- **Backend (BE)**: 为所有书籍添加分类标签，创建分类管理API
- **Frontend (FE)**: Web端分类浏览UI
- **iOS Client**: 移动端分类浏览UI
- **Admin**: 后台分类管理界面

---

## 2. 分类体系设计 (Category System Design)

### 2.1 主要分类列表 (Primary Categories)

| ID | 中文名称 | English Name | 图标 (Icon) | 适用类型 |
|----|---------|--------------|-------------|----------|
| 1  | 小说 | Fiction | `book.closed` | 电子书 |
| 2  | 文学 | Literature | `text.book.closed` | 电子书 |
| 3  | 历史 | History | `clock.arrow.circlepath` | 电子书/杂志 |
| 4  | 哲学 | Philosophy | `brain.head.profile` | 电子书 |
| 5  | 心理学 | Psychology | `heart.text.square` | 电子书/杂志 |
| 6  | 技术 | Technology | `cpu` | 电子书/杂志 |
| 7  | 科学 | Science | `atom` | 电子书/杂志 |
| 8  | 经济 | Economics | `chart.line.uptrend.xyaxis` | 电子书/杂志 |
| 9  | 商业 | Business | `briefcase` | 电子书/杂志 |
| 10 | 艺术 | Art | `paintpalette` | 电子书/杂志 |
| 11 | 传记 | Biography | `person.text.rectangle` | 电子书 |
| 12 | 自我提升 | Self-Help | `arrow.up.heart` | 电子书 |
| 13 | 旅游 | Travel | `airplane` | 杂志 |
| 14 | 时尚 | Fashion | `sparkles` | 杂志 |
| 15 | 生活 | Lifestyle | `house` | 杂志 |
| 16 | 健康 | Health | `heart.circle` | 电子书/杂志 |
| 17 | 教育 | Education | `graduationcap` | 电子书 |
| 18 | 儿童 | Children | `figure.2.and.child.holdinghands` | 电子书 |
| 19 | 悬疑 | Mystery | `magnifyingglass` | 电子书 |
| 20 | 科幻 | Sci-Fi | `sparkle` | 电子书 |
| 21 | 奇幻 | Fantasy | `wand.and.stars` | 电子书 |
| 22 | 言情 | Romance | `heart` | 电子书 |

### 2.2 分类层级结构 (Category Hierarchy)

```
一级分类 (Level 1)
├── 二级分类 (Level 2)
│   └── 三级分类 (Level 3) [可选]

示例:
小说
├── 悬疑推理
├── 科幻
├── 奇幻
├── 言情
└── 历史小说

技术
├── 编程语言
├── 人工智能
├── 数据科学
├── 移动开发
└── 云计算
```

### 2.3 标签属性 (Category Attributes)

```typescript
interface Category {
  id: number;
  name: string;           // 中文名称
  nameEn: string;         // English name
  slug: string;           // URL友好的标识符
  icon: string;           // SF Symbol name
  color: string;          // 主题色 (hex)
  parentId: number | null; // 父分类ID
  level: number;          // 层级: 1, 2, 3
  sortOrder: number;      // 排序权重
  bookTypes: string[];    // ['ebook', 'magazine']
  isActive: boolean;      // 是否启用
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 3. 数据库设计 (Database Schema)

### 3.1 分类表 (categories)

```sql
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  slug VARCHAR(100) UNIQUE NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(7),
  parent_id INTEGER REFERENCES categories(id),
  level INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  book_types TEXT[] DEFAULT ARRAY['ebook', 'magazine'],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_level ON categories(level);
```

### 3.2 书籍-分类关联表 (book_categories)

```sql
CREATE TABLE book_categories (
  id SERIAL PRIMARY KEY,
  book_id INTEGER NOT NULL,
  book_type VARCHAR(20) NOT NULL, -- 'ebook' or 'magazine'
  category_id INTEGER NOT NULL REFERENCES categories(id),
  is_primary BOOLEAN DEFAULT false, -- 主分类标记
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(book_id, book_type, category_id)
);

-- 索引
CREATE INDEX idx_book_categories_book ON book_categories(book_id, book_type);
CREATE INDEX idx_book_categories_category ON book_categories(category_id);
```

### 3.3 修改现有表 (Modify Existing Tables)

```sql
-- 为 ebooks 表添加主分类字段 (可选，便于快速查询)
ALTER TABLE ebooks ADD COLUMN primary_category_id INTEGER REFERENCES categories(id);

-- 为 magazines 表添加主分类字段
ALTER TABLE magazines ADD COLUMN primary_category_id INTEGER REFERENCES categories(id);
```

---

## 4. API 设计 (API Design)

### 4.1 分类管理 API

#### 获取所有分类
```
GET /api/categories
```

**Query Parameters:**
| 参数 | 类型 | 说明 |
|------|------|------|
| level | number | 分类层级 (1, 2, 3) |
| parentId | number | 父分类ID |
| bookType | string | 书籍类型 ('ebook', 'magazine') |
| includeCount | boolean | 是否包含书籍数量 |

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "小说",
      "nameEn": "Fiction",
      "slug": "fiction",
      "icon": "book.closed",
      "color": "#3B82F6",
      "parentId": null,
      "level": 1,
      "bookTypes": ["ebook"],
      "bookCount": 156,
      "children": [
        {
          "id": 19,
          "name": "悬疑",
          "nameEn": "Mystery",
          "slug": "mystery",
          "parentId": 1,
          "level": 2,
          "bookCount": 42
        }
      ]
    }
  ]
}
```

#### 获取单个分类详情
```
GET /api/categories/:id
```

#### 获取分类下的书籍
```
GET /api/categories/:id/books
```

**Query Parameters:**
| 参数 | 类型 | 说明 |
|------|------|------|
| bookType | string | 'ebook' 或 'magazine' |
| sort | string | 排序方式: 'latest', 'popular', 'rating' |
| limit | number | 返回数量 |
| offset | number | 偏移量 |

**Response:**
```json
{
  "data": {
    "category": {
      "id": 1,
      "name": "小说",
      "nameEn": "Fiction"
    },
    "books": [
      {
        "id": 123,
        "title": "三体",
        "author": "刘慈欣",
        "coverUrl": "...",
        "bookType": "ebook",
        "rating": 4.8
      }
    ],
    "total": 156,
    "hasMore": true
  }
}
```

### 4.2 书籍分类 API

#### 获取书籍的分类
```
GET /api/ebooks/:id/categories
GET /api/magazines/:id/categories
```

#### 设置书籍分类 (Admin)
```
PUT /api/admin/ebooks/:id/categories
PUT /api/admin/magazines/:id/categories
```

**Request Body:**
```json
{
  "categoryIds": [1, 19],
  "primaryCategoryId": 1
}
```

### 4.3 分类搜索 API

```
GET /api/search/categories
```

**Query Parameters:**
| 参数 | 类型 | 说明 |
|------|------|------|
| q | string | 搜索关键词 |
| bookType | string | 书籍类型 |

---

## 5. iOS 客户端设计 (iOS Client Design)

### 5.1 UI 结构

```
书城 (Store Tab)
├── 电子书 Tab
│   ├── 推荐/首页
│   ├── 分类浏览 (Category Browser)
│   │   ├── 分类网格视图
│   │   └── 分类详情页 (书籍列表)
│   └── 搜索
└── 杂志 Tab
    ├── 推荐/首页
    ├── 分类浏览
    └── 搜索
```

### 5.2 分类浏览入口

在 `EbookStoreView` 和 `MagazineStoreView` 中添加分类入口：

```swift
// 分类区域设计
VStack(alignment: .leading, spacing: 12) {
    HStack {
        Text("分类浏览")
            .font(.title2)
            .fontWeight(.bold)

        Spacer()

        Button("全部分类") {
            showAllCategories = true
        }
    }

    // 热门分类 - 横向滚动
    ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: 12) {
            ForEach(hotCategories) { category in
                CategoryPillView(category: category)
            }
        }
    }
}
```

### 5.3 分类网格视图 (CategoryGridView)

```swift
struct CategoryGridView: View {
    let categories: [Category]
    let bookType: BookType

    let columns = [
        GridItem(.flexible()),
        GridItem(.flexible()),
        GridItem(.flexible()),
        GridItem(.flexible())
    ]

    var body: some View {
        LazyVGrid(columns: columns, spacing: 16) {
            ForEach(categories) { category in
                NavigationLink(destination: CategoryDetailView(category: category)) {
                    CategoryCell(category: category)
                }
            }
        }
    }
}

struct CategoryCell: View {
    let category: Category

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(Color(hex: category.color).opacity(0.15))
                    .frame(width: 60, height: 60)

                Image(systemName: category.icon)
                    .font(.title2)
                    .foregroundColor(Color(hex: category.color))
            }

            Text(category.name)
                .font(.caption)
                .lineLimit(1)

            if let count = category.bookCount {
                Text("\(count)本")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
    }
}
```

### 5.4 分类详情页 (CategoryDetailView)

```swift
struct CategoryDetailView: View {
    let category: Category
    @StateObject private var viewModel: CategoryDetailViewModel

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // 子分类筛选 (如果有)
                if !viewModel.subcategories.isEmpty {
                    SubcategoryFilterView(
                        subcategories: viewModel.subcategories,
                        selected: $viewModel.selectedSubcategory
                    )
                }

                // 排序选项
                SortOptionsView(selectedSort: $viewModel.sortOption)

                // 书籍列表
                LazyVStack(spacing: 12) {
                    ForEach(viewModel.books) { book in
                        BookListRow(book: book)
                    }

                    if viewModel.hasMore {
                        ProgressView()
                            .onAppear {
                                Task { await viewModel.loadMore() }
                            }
                    }
                }
            }
        }
        .navigationTitle(category.name)
    }
}
```

### 5.5 数据模型 (iOS Models)

```swift
struct Category: Identifiable, Codable {
    let id: Int
    let name: String
    let nameEn: String?
    let slug: String
    let icon: String?
    let color: String?
    let parentId: Int?
    let level: Int
    let bookTypes: [String]
    let bookCount: Int?
    let children: [Category]?
}

struct CategoriesResponse: Codable {
    let data: [Category]
}

struct CategoryBooksResponse: Codable {
    let data: CategoryBooksData
}

struct CategoryBooksData: Codable {
    let category: Category
    let books: [BookItem]
    let total: Int
    let hasMore: Bool
}
```

### 5.6 ViewModel

```swift
@MainActor
class CategoryDetailViewModel: ObservableObject {
    let category: Category
    let bookType: BookType

    @Published var books: [BookItem] = []
    @Published var subcategories: [Category] = []
    @Published var selectedSubcategory: Category?
    @Published var sortOption: SortOption = .latest
    @Published var isLoading = false
    @Published var hasMore = false

    private var offset = 0
    private let limit = 20

    func loadBooks() async {
        isLoading = true
        offset = 0

        do {
            let response = try await APIClient.shared.getCategoryBooks(
                categoryId: selectedSubcategory?.id ?? category.id,
                bookType: bookType.rawValue,
                sort: sortOption.rawValue,
                limit: limit,
                offset: 0
            )
            books = response.data.books
            hasMore = response.data.hasMore
            offset = books.count
        } catch {
            print("Failed to load books: \(error)")
        }

        isLoading = false
    }

    func loadMore() async {
        guard !isLoading, hasMore else { return }

        do {
            let response = try await APIClient.shared.getCategoryBooks(
                categoryId: selectedSubcategory?.id ?? category.id,
                bookType: bookType.rawValue,
                sort: sortOption.rawValue,
                limit: limit,
                offset: offset
            )
            books.append(contentsOf: response.data.books)
            hasMore = response.data.hasMore
            offset = books.count
        } catch {
            print("Failed to load more: \(error)")
        }
    }
}
```

---

## 6. Web 前端设计 (Web Frontend Design)

### 6.1 路由设计

```
/store/ebooks/categories          - 电子书分类列表
/store/ebooks/categories/:slug    - 电子书分类详情
/store/magazines/categories       - 杂志分类列表
/store/magazines/categories/:slug - 杂志分类详情
```

### 6.2 组件结构

```
CategoryPage/
├── CategoryGrid.tsx        - 分类网格
├── CategoryCard.tsx        - 分类卡片
├── CategoryDetail.tsx      - 分类详情页
├── SubcategoryFilter.tsx   - 子分类筛选
└── BookList.tsx           - 书籍列表
```

---

## 7. 管理后台设计 (Admin Panel Design)

### 7.1 分类管理

- 分类列表 (树形结构展示)
- 新增/编辑分类
- 分类排序 (拖拽)
- 分类启用/禁用

### 7.2 书籍分类管理

- 批量为书籍添加分类
- 书籍分类统计
- 未分类书籍列表

### 7.3 批量标签脚本

```typescript
// 批量为书籍添加分类的脚本示例
async function batchCategorizeBooks() {
  // 基于书名关键词的自动分类规则
  const rules = [
    { keywords: ['三体', '科幻', 'AI', '机器人'], categoryId: 20 }, // 科幻
    { keywords: ['推理', '悬疑', '凶杀', '侦探'], categoryId: 19 }, // 悬疑
    { keywords: ['历史', '朝代', '战争'], categoryId: 3 }, // 历史
    { keywords: ['心理', '情绪', '认知'], categoryId: 5 }, // 心理学
    { keywords: ['编程', '代码', 'Python', 'JavaScript'], categoryId: 6 }, // 技术
  ];

  // 执行批量分类...
}
```

---

## 8. 实施计划 (Implementation Plan)

### Phase 1: 后端基础 (1-2 天)
- [ ] 创建数据库表 (categories, book_categories)
- [ ] 实现分类 CRUD API
- [ ] 实现书籍-分类关联 API
- [ ] 添加初始分类数据

### Phase 2: 书籍标签 (2-3 天)
- [ ] 开发批量分类脚本
- [ ] 为现有电子书添加分类
- [ ] 为现有杂志添加分类
- [ ] 数据验证和修正

### Phase 3: iOS 客户端 (2-3 天)
- [ ] 实现 Category 数据模型
- [ ] 实现分类浏览 API 调用
- [ ] 实现 CategoryGridView
- [ ] 实现 CategoryDetailView
- [ ] 集成到 EbookStoreView 和 MagazineStoreView

### Phase 4: Web 前端 (2-3 天)
- [ ] 实现分类页面路由
- [ ] 实现分类组件
- [ ] 样式调整

### Phase 5: 管理后台 (1-2 天)
- [ ] 分类管理界面
- [ ] 书籍分类管理

---

## 9. 注意事项 (Considerations)

### 9.1 性能优化
- 分类数据缓存 (可使用 Redis)
- 分类书籍数量异步计算
- 分页加载书籍列表

### 9.2 国际化
- 分类名称支持多语言
- 使用 `nameEn` 字段存储英文名称
- 根据用户语言偏好显示

### 9.3 SEO (Web)
- 使用 slug 作为 URL
- 分类页面添加 meta 信息

### 9.4 数据一致性
- 删除分类时处理关联书籍
- 分类层级变更时更新子分类

---

## 10. API 接口汇总 (API Summary)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/categories | 获取分类列表 |
| GET | /api/categories/:id | 获取分类详情 |
| GET | /api/categories/:id/books | 获取分类下的书籍 |
| POST | /api/admin/categories | 创建分类 |
| PUT | /api/admin/categories/:id | 更新分类 |
| DELETE | /api/admin/categories/:id | 删除分类 |
| PUT | /api/admin/ebooks/:id/categories | 设置电子书分类 |
| PUT | /api/admin/magazines/:id/categories | 设置杂志分类 |

---

## 11. 待讨论事项 (Open Questions)

1. **分类层级**: 是否需要支持三级分类？还是两级足够？
2. **多分类**: 一本书是否可以属于多个分类？
3. **主分类**: 是否需要标记主分类用于推荐算法？
4. **分类图标**: 使用 SF Symbols 还是自定义图标？
5. **自动分类**: 是否需要基于 AI 的自动分类功能？

---

*文档版本: 1.0*
*创建日期: 2025-12-13*
*作者: Claude Code*
