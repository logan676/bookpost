# Book Category Browsing Feature Design Document

---

## 1. Feature Overview

### 1.1 Goals

Provide users with category-based book browsing functionality, enabling them to:
- Quickly discover book types of interest
- Filter ebooks and magazines by tags/categories
- Explore content across different domains

### 1.2 Scope

- **Backend (BE)**: Add category tags to all books, create category management API
- **Frontend (FE)**: Web category browsing UI
- **iOS Client**: Mobile category browsing UI
- **Admin**: Backend category management interface

---

## 2. Category System Design

### 2.1 Primary Categories

| ID | Chinese Name | English Name | Icon | Applicable Types |
|----|-------------|--------------|------|------------------|
| 1  | 小说 | Fiction | `book.closed` | Ebook |
| 2  | 文学 | Literature | `text.book.closed` | Ebook |
| 3  | 历史 | History | `clock.arrow.circlepath` | Ebook/Magazine |
| 4  | 哲学 | Philosophy | `brain.head.profile` | Ebook |
| 5  | 心理学 | Psychology | `heart.text.square` | Ebook/Magazine |
| 6  | 技术 | Technology | `cpu` | Ebook/Magazine |
| 7  | 科学 | Science | `atom` | Ebook/Magazine |
| 8  | 经济 | Economics | `chart.line.uptrend.xyaxis` | Ebook/Magazine |
| 9  | 商业 | Business | `briefcase` | Ebook/Magazine |
| 10 | 艺术 | Art | `paintpalette` | Ebook/Magazine |
| 11 | 传记 | Biography | `person.text.rectangle` | Ebook |
| 12 | 自我提升 | Self-Help | `arrow.up.heart` | Ebook |
| 13 | 旅游 | Travel | `airplane` | Magazine |
| 14 | 时尚 | Fashion | `sparkles` | Magazine |
| 15 | 生活 | Lifestyle | `house` | Magazine |
| 16 | 健康 | Health | `heart.circle` | Ebook/Magazine |
| 17 | 教育 | Education | `graduationcap` | Ebook |
| 18 | 儿童 | Children | `figure.2.and.child.holdinghands` | Ebook |
| 19 | 悬疑 | Mystery | `magnifyingglass` | Ebook |
| 20 | 科幻 | Sci-Fi | `sparkle` | Ebook |
| 21 | 奇幻 | Fantasy | `wand.and.stars` | Ebook |
| 22 | 言情 | Romance | `heart` | Ebook |

### 2.2 Category Hierarchy

```
Level 1 Category
├── Level 2 Category
│   └── Level 3 Category [optional]

Example:
Fiction
├── Mystery & Thriller
├── Sci-Fi
├── Fantasy
├── Romance
└── Historical Fiction

Technology
├── Programming Languages
├── Artificial Intelligence
├── Data Science
├── Mobile Development
└── Cloud Computing
```

### 2.3 Category Attributes

```typescript
interface Category {
  id: number;
  name: string;           // Chinese name
  nameEn: string;         // English name
  slug: string;           // URL-friendly identifier
  icon: string;           // SF Symbol name
  color: string;          // Theme color (hex)
  parentId: number | null; // Parent category ID
  level: number;          // Level: 1, 2, 3
  sortOrder: number;      // Sort weight
  bookTypes: string[];    // ['ebook', 'magazine']
  isActive: boolean;      // Whether enabled
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 3. Database Schema

### 3.1 Categories Table

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

-- Indexes
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_level ON categories(level);
```

### 3.2 Book-Category Association Table

```sql
CREATE TABLE book_categories (
  id SERIAL PRIMARY KEY,
  book_id INTEGER NOT NULL,
  book_type VARCHAR(20) NOT NULL, -- 'ebook' or 'magazine'
  category_id INTEGER NOT NULL REFERENCES categories(id),
  is_primary BOOLEAN DEFAULT false, -- Primary category flag
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(book_id, book_type, category_id)
);

-- Indexes
CREATE INDEX idx_book_categories_book ON book_categories(book_id, book_type);
CREATE INDEX idx_book_categories_category ON book_categories(category_id);
```

### 3.3 Modify Existing Tables

```sql
-- Add primary category field to ebooks table (optional, for quick queries)
ALTER TABLE ebooks ADD COLUMN primary_category_id INTEGER REFERENCES categories(id);

-- Add primary category field to magazines table
ALTER TABLE magazines ADD COLUMN primary_category_id INTEGER REFERENCES categories(id);
```

---

## 4. API Design

### 4.1 Category Management API

#### Get All Categories
```
GET /api/categories
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| level | number | Category level (1, 2, 3) |
| parentId | number | Parent category ID |
| bookType | string | Book type ('ebook', 'magazine') |
| includeCount | boolean | Whether to include book count |

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

#### Get Single Category Details
```
GET /api/categories/:id
```

#### Get Books in Category
```
GET /api/categories/:id/books
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| bookType | string | 'ebook' or 'magazine' |
| sort | string | Sort method: 'latest', 'popular', 'rating' |
| limit | number | Number of results |
| offset | number | Offset |

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
        "title": "The Three-Body Problem",
        "author": "Liu Cixin",
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

### 4.2 Book Category API

#### Get Book's Categories
```
GET /api/ebooks/:id/categories
GET /api/magazines/:id/categories
```

#### Set Book Categories (Admin)
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

### 4.3 Category Search API

```
GET /api/search/categories
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| q | string | Search keyword |
| bookType | string | Book type |

---

## 5. iOS Client Design

### 5.1 UI Structure

```
Store Tab
├── Ebooks Tab
│   ├── Recommendations/Home
│   ├── Category Browser
│   │   ├── Category Grid View
│   │   └── Category Detail Page (Book List)
│   └── Search
└── Magazines Tab
    ├── Recommendations/Home
    ├── Category Browser
    └── Search
```

### 5.2 Category Browsing Entry

Add category entry in `EbookStoreView` and `MagazineStoreView`:

```swift
// Category section design
VStack(alignment: .leading, spacing: 12) {
    HStack {
        Text("Browse Categories")
            .font(.title2)
            .fontWeight(.bold)

        Spacer()

        Button("All Categories") {
            showAllCategories = true
        }
    }

    // Hot categories - horizontal scroll
    ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: 12) {
            ForEach(hotCategories) { category in
                CategoryPillView(category: category)
            }
        }
    }
}
```

### 5.3 Category Grid View

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
                Text("\(count) books")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
    }
}
```

### 5.4 Category Detail View

```swift
struct CategoryDetailView: View {
    let category: Category
    @StateObject private var viewModel: CategoryDetailViewModel

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Subcategory filter (if any)
                if !viewModel.subcategories.isEmpty {
                    SubcategoryFilterView(
                        subcategories: viewModel.subcategories,
                        selected: $viewModel.selectedSubcategory
                    )
                }

                // Sort options
                SortOptionsView(selectedSort: $viewModel.sortOption)

                // Book list
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

### 5.5 Data Models (iOS)

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

## 6. Web Frontend Design

### 6.1 Route Design

```
/store/ebooks/categories          - Ebook category list
/store/ebooks/categories/:slug    - Ebook category detail
/store/magazines/categories       - Magazine category list
/store/magazines/categories/:slug - Magazine category detail
```

### 6.2 Component Structure

```
CategoryPage/
├── CategoryGrid.tsx        - Category grid
├── CategoryCard.tsx        - Category card
├── CategoryDetail.tsx      - Category detail page
├── SubcategoryFilter.tsx   - Subcategory filter
└── BookList.tsx           - Book list
```

---

## 7. Admin Panel Design

### 7.1 Category Management

- Category list (tree structure display)
- Add/edit categories
- Category sorting (drag and drop)
- Category enable/disable

### 7.2 Book Category Management

- Batch add categories to books
- Book category statistics
- Uncategorized books list

### 7.3 Batch Tagging Script

```typescript
// Example script for batch categorizing books
async function batchCategorizeBooks() {
  // Auto-categorization rules based on title keywords
  const rules = [
    { keywords: ['Three-Body', 'sci-fi', 'AI', 'robot'], categoryId: 20 }, // Sci-Fi
    { keywords: ['mystery', 'thriller', 'murder', 'detective'], categoryId: 19 }, // Mystery
    { keywords: ['history', 'dynasty', 'war'], categoryId: 3 }, // History
    { keywords: ['psychology', 'emotion', 'cognitive'], categoryId: 5 }, // Psychology
    { keywords: ['programming', 'code', 'Python', 'JavaScript'], categoryId: 6 }, // Technology
  ];

  // Execute batch categorization...
}
```

---

## 8. Implementation Plan

### Phase 1: Backend Foundation (1-2 days)
- [ ] Create database tables (categories, book_categories)
- [ ] Implement category CRUD API
- [ ] Implement book-category association API
- [ ] Add initial category data

### Phase 2: Book Tagging (2-3 days)
- [ ] Develop batch categorization script
- [ ] Add categories to existing ebooks
- [ ] Add categories to existing magazines
- [ ] Data validation and correction

### Phase 3: iOS Client (2-3 days)
- [ ] Implement Category data model
- [ ] Implement category browsing API calls
- [ ] Implement CategoryGridView
- [ ] Implement CategoryDetailView
- [ ] Integrate into EbookStoreView and MagazineStoreView

### Phase 4: Web Frontend (2-3 days)
- [ ] Implement category page routes
- [ ] Implement category components
- [ ] Style adjustments

### Phase 5: Admin Panel (1-2 days)
- [ ] Category management interface
- [ ] Book category management

---

## 9. Considerations

### 9.1 Performance Optimization
- Category data caching (can use Redis)
- Async calculation of category book counts
- Paginated loading of book lists

### 9.2 Internationalization
- Category names support multiple languages
- Use `nameEn` field for English names
- Display based on user language preference

### 9.3 SEO (Web)
- Use slug as URL
- Add meta information to category pages

### 9.4 Data Consistency
- Handle associated books when deleting categories
- Update subcategories when category level changes

---

## 10. API Summary

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/categories | Get category list |
| GET | /api/categories/:id | Get category details |
| GET | /api/categories/:id/books | Get books in category |
| POST | /api/admin/categories | Create category |
| PUT | /api/admin/categories/:id | Update category |
| DELETE | /api/admin/categories/:id | Delete category |
| PUT | /api/admin/ebooks/:id/categories | Set ebook categories |
| PUT | /api/admin/magazines/:id/categories | Set magazine categories |

---

## 11. Open Questions

1. **Category Levels**: Do we need to support three-level categories? Or is two levels sufficient?
2. **Multiple Categories**: Can a book belong to multiple categories?
3. **Primary Category**: Do we need to mark primary category for recommendation algorithms?
4. **Category Icons**: Use SF Symbols or custom icons?
5. **Auto-categorization**: Do we need AI-based auto-categorization functionality?

---

*Document Version: 1.0*
*Created: 2025-12-13*
*Author: Claude Code*
