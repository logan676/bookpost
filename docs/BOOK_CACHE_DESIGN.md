# iOS 书籍本地缓存技术方案

## 1. 概述

### 1.1 目标
实现书籍文件的本地缓存功能，支持离线阅读，减少重复下载，提升用户体验。

### 1.2 范围
- 电子书 (EPUB/PDF)
- 杂志 (PDF)
- 不包括：实体书（无需下载）

### 1.3 核心需求
| 需求 | 优先级 | 说明 |
|------|--------|------|
| 自动缓存 | P0 | 阅读时自动下载并缓存 |
| 离线阅读 | P0 | 无网络时可阅读已缓存书籍 |
| 手动下载 | P1 | 用户主动下载书籍 |
| 缓存管理 | P1 | 查看/删除已缓存书籍 |
| 存储空间管理 | P2 | 显示占用空间，支持批量清理 |
| 下载队列 | P2 | 支持多本书籍排队下载 |

---

## 2. 技术架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                      UI Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ BookDetail  │  │ MyBookshelf │  │ DownloadManager │  │
│  │    View     │  │    View     │  │      View       │  │
│  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘  │
└─────────┼────────────────┼──────────────────┼───────────┘
          │                │                  │
          ▼                ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│                   Service Layer                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              BookCacheManager                     │   │
│  │  - downloadBook()    - getCachedBook()           │   │
│  │  - deleteCache()     - getCacheStatus()          │   │
│  │  - getTotalCacheSize()                           │   │
│  └──────────────────────────────────────────────────┘   │
│                          │                               │
│           ┌──────────────┼──────────────┐               │
│           ▼              ▼              ▼               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │DownloadTask │  │ CacheStore  │  │ MetadataDB  │     │
│  │   Manager   │  │  (Files)    │  │ (UserDef/   │     │
│  │             │  │             │  │  SQLite)    │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Storage Layer                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │           App Documents/Library/Caches            │   │
│  │  /BookCache/ebooks/{id}.epub                     │   │
│  │  /BookCache/ebooks/{id}.pdf                      │   │
│  │  /BookCache/magazines/{id}.pdf                   │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 2.2 存储位置选择

| 位置 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| Documents | 用户可见，iCloud 备份 | 占用备份空间 | 不推荐 |
| Library/Caches | 系统可清理，不占备份 | 可能被系统清理 | **推荐** |
| Library/Application Support | 不会被清理，不备份 | 需手动管理 | 备选 |

**推荐方案**: 使用 `Library/Caches/BookCache/` 目录
- 系统存储紧张时可自动清理
- 不占用 iCloud 备份空间
- 用户可在设置中手动清理

---

## 3. 数据模型

### 3.1 缓存元数据模型

```swift
/// 缓存书籍的元数据
struct CachedBookMetadata: Codable, Identifiable {
    let id: String                    // "{type}-{bookId}" e.g. "ebook-123"
    let bookType: BookType            // .ebook / .magazine
    let bookId: Int
    let title: String
    let coverUrl: String?
    let fileUrl: String               // 原始下载 URL
    let localPath: String             // 本地相对路径
    let fileSize: Int64               // 文件大小 (bytes)
    let downloadedAt: Date            // 下载时间
    let lastAccessedAt: Date          // 最后访问时间
    let checksum: String?             // MD5/SHA256 校验 (可选)

    enum BookType: String, Codable {
        case ebook
        case magazine
    }
}

/// 下载任务状态
enum DownloadStatus: Equatable {
    case idle
    case pending
    case downloading(progress: Double)
    case paused
    case completed
    case failed(error: String)
}

/// 下载任务
struct DownloadTask: Identifiable {
    let id: String
    let metadata: CachedBookMetadata
    var status: DownloadStatus
    var progress: Double
    var downloadedBytes: Int64
    var totalBytes: Int64
}
```

### 3.2 缓存状态枚举

```swift
/// 书籍缓存状态
enum BookCacheStatus {
    case notCached                    // 未缓存
    case downloading(progress: Double) // 下载中
    case cached(size: Int64, date: Date) // 已缓存
    case outdated                     // 缓存已过期（服务器有更新）
}
```

---

## 4. 核心组件设计

### 4.1 BookCacheManager

```swift
/// 书籍缓存管理器 - 单例模式
@MainActor
class BookCacheManager: ObservableObject {
    static let shared = BookCacheManager()

    // MARK: - Published Properties
    @Published private(set) var activeDownloads: [DownloadTask] = []
    @Published private(set) var totalCacheSize: Int64 = 0

    // MARK: - Cache Directory
    private let cacheDirectory: URL

    // MARK: - Public Methods

    /// 获取书籍缓存状态
    func getCacheStatus(bookType: BookType, bookId: Int) -> BookCacheStatus

    /// 获取缓存文件路径（如已缓存）
    func getCachedFilePath(bookType: BookType, bookId: Int) -> URL?

    /// 下载并缓存书籍
    func downloadBook(bookType: BookType, bookId: Int,
                      fileUrl: String, title: String, coverUrl: String?) async throws

    /// 取消下载
    func cancelDownload(bookType: BookType, bookId: Int)

    /// 删除单本书缓存
    func deleteCache(bookType: BookType, bookId: Int) throws

    /// 清空所有缓存
    func clearAllCache() throws

    /// 获取所有已缓存书籍
    func getAllCachedBooks() -> [CachedBookMetadata]

    /// 获取缓存总大小
    func calculateTotalCacheSize() -> Int64

    /// 更新最后访问时间
    func updateLastAccessed(bookType: BookType, bookId: Int)
}
```

### 4.2 存储结构

```
Library/Caches/BookCache/
├── metadata.json              # 缓存元数据索引
├── ebooks/
│   ├── 123.epub
│   ├── 124.pdf
│   └── 125.epub
└── magazines/
    ├── 456.pdf
    └── 457.pdf
```

### 4.3 元数据存储方案

**方案 A: JSON 文件 (推荐初期)**
- 简单易实现
- 适合缓存数量 < 1000

**方案 B: SQLite/Core Data (扩展方案)**
- 适合大量缓存
- 支持复杂查询

初期采用 **方案 A**，后期可迁移到方案 B。

---

## 5. 下载流程

### 5.1 下载流程图

```
用户点击下载/打开书籍
         │
         ▼
    检查缓存状态
         │
    ┌────┴────┐
    │         │
 已缓存    未缓存
    │         │
    ▼         ▼
 返回本地   开始下载
  路径        │
              ▼
         创建下载任务
              │
              ▼
         添加到队列
              │
              ▼
         URLSession
         下载文件
              │
         ┌────┴────┐
         │         │
       成功      失败
         │         │
         ▼         ▼
    保存到缓存   标记失败
    更新元数据   可重试
         │
         ▼
    通知 UI 更新
```

### 5.2 下载实现

```swift
/// 使用 URLSession 下载
func downloadBook(...) async throws {
    // 1. 检查是否已缓存
    if let cached = getCachedFilePath(...) {
        return cached
    }

    // 2. 创建下载任务
    let task = DownloadTask(...)
    activeDownloads.append(task)

    // 3. 使用 URLSession downloadTask
    let (tempURL, response) = try await URLSession.shared.download(from: url)

    // 4. 验证响应
    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode == 200 else {
        throw CacheError.downloadFailed
    }

    // 5. 移动到缓存目录
    let destinationURL = cacheDirectory
        .appendingPathComponent(bookType.rawValue)
        .appendingPathComponent("\(bookId).\(fileExtension)")

    try FileManager.default.moveItem(at: tempURL, to: destinationURL)

    // 6. 保存元数据
    saveMetadata(...)

    // 7. 更新状态
    updateDownloadStatus(...)
}
```

### 5.3 后台下载支持 (可选扩展)

```swift
// 使用 URLSessionConfiguration.background
let config = URLSessionConfiguration.background(
    withIdentifier: "com.booklibrio.download"
)
let session = URLSession(configuration: config, delegate: self, delegateQueue: nil)
```

---

## 6. UI 集成

### 6.1 书籍详情页

```swift
// BookDetailView.swift 修改

struct BookDetailView: View {
    @StateObject private var cacheManager = BookCacheManager.shared

    var cacheStatus: BookCacheStatus {
        cacheManager.getCacheStatus(bookType: bookType, bookId: bookId)
    }

    var body: some View {
        // ... 现有内容 ...

        // 下载按钮
        switch cacheStatus {
        case .notCached:
            Button("下载") {
                Task { await downloadBook() }
            }
        case .downloading(let progress):
            ProgressView(value: progress)
            Button("取消") { cancelDownload() }
        case .cached(let size, _):
            HStack {
                Image(systemName: "checkmark.circle.fill")
                Text("已下载 (\(formatSize(size)))")
            }
            Button("删除") { deleteCache() }
        }
    }
}
```

### 6.2 下载管理页面

```swift
/// 新增：下载管理视图
struct DownloadManagerView: View {
    @StateObject private var cacheManager = BookCacheManager.shared

    var body: some View {
        List {
            // 正在下载
            Section("正在下载") {
                ForEach(cacheManager.activeDownloads) { task in
                    DownloadTaskRow(task: task)
                }
            }

            // 已下载
            Section("已下载 (\(formatSize(cacheManager.totalCacheSize)))") {
                ForEach(cacheManager.getAllCachedBooks()) { book in
                    CachedBookRow(book: book)
                }
            }
        }
        .navigationTitle("下载管理")
        .toolbar {
            Button("清空全部") {
                try? cacheManager.clearAllCache()
            }
        }
    }
}
```

### 6.3 书架视图集成

在 `MyBookshelfView` 中显示缓存状态图标：

```swift
// 书籍封面右下角显示缓存状态
ZStack(alignment: .bottomTrailing) {
    BookCoverView(...)

    // 缓存状态指示器
    if case .cached = cacheStatus {
        Image(systemName: "arrow.down.circle.fill")
            .foregroundColor(.green)
            .background(Circle().fill(.white))
    }
}
```

---

## 7. 阅读器集成

### 7.1 修改 ReaderContainerView

```swift
// ReaderContainerView.swift

func loadBook() async {
    // 1. 检查本地缓存
    if let cachedPath = BookCacheManager.shared.getCachedFilePath(
        bookType: bookType,
        bookId: bookId
    ) {
        // 使用本地文件
        self.localFileURL = cachedPath
        BookCacheManager.shared.updateLastAccessed(bookType: bookType, bookId: bookId)
        return
    }

    // 2. 无缓存 - 下载文件
    do {
        try await BookCacheManager.shared.downloadBook(
            bookType: bookType,
            bookId: bookId,
            fileUrl: book.fileUrl,
            title: book.title,
            coverUrl: book.coverUrl
        )
        self.localFileURL = BookCacheManager.shared.getCachedFilePath(
            bookType: bookType,
            bookId: bookId
        )
    } catch {
        // 处理错误
        self.error = error
    }
}
```

---

## 8. 错误处理

### 8.1 错误类型

```swift
enum BookCacheError: LocalizedError {
    case downloadFailed(underlying: Error)
    case insufficientStorage
    case fileCorrupted
    case networkUnavailable
    case cacheDirectoryNotFound

    var errorDescription: String? {
        switch self {
        case .downloadFailed(let error):
            return "下载失败: \(error.localizedDescription)"
        case .insufficientStorage:
            return "存储空间不足"
        case .fileCorrupted:
            return "文件损坏，请重新下载"
        case .networkUnavailable:
            return "网络不可用"
        case .cacheDirectoryNotFound:
            return "缓存目录不存在"
        }
    }
}
```

### 8.2 重试机制

```swift
/// 自动重试下载
func downloadWithRetry(maxAttempts: Int = 3) async throws {
    var lastError: Error?

    for attempt in 1...maxAttempts {
        do {
            try await downloadBook(...)
            return
        } catch {
            lastError = error
            if attempt < maxAttempts {
                try await Task.sleep(nanoseconds: UInt64(attempt) * 1_000_000_000)
            }
        }
    }

    throw BookCacheError.downloadFailed(underlying: lastError!)
}
```

---

## 9. 存储空间管理

### 9.1 空间检查

```swift
/// 检查可用存储空间
func checkAvailableStorage() -> Int64 {
    let fileManager = FileManager.default
    do {
        let attributes = try fileManager.attributesOfFileSystem(
            forPath: NSHomeDirectory()
        )
        return attributes[.systemFreeSize] as? Int64 ?? 0
    } catch {
        return 0
    }
}

/// 下载前检查空间
func canDownload(fileSize: Int64) -> Bool {
    let available = checkAvailableStorage()
    let buffer: Int64 = 100 * 1024 * 1024 // 保留 100MB
    return available - fileSize > buffer
}
```

### 9.2 自动清理策略 (LRU)

```swift
/// 当空间不足时，清理最久未访问的缓存
func cleanupIfNeeded(requiredSpace: Int64) throws {
    let available = checkAvailableStorage()

    guard available < requiredSpace else { return }

    // 按最后访问时间排序
    var cachedBooks = getAllCachedBooks()
        .sorted { $0.lastAccessedAt < $1.lastAccessedAt }

    var freedSpace: Int64 = 0

    while freedSpace < (requiredSpace - available) && !cachedBooks.isEmpty {
        let oldest = cachedBooks.removeFirst()
        try deleteCache(bookType: oldest.bookType, bookId: oldest.bookId)
        freedSpace += oldest.fileSize
    }
}
```

---

## 10. 设置页面集成

```swift
// SettingsView.swift 添加

Section("存储") {
    NavigationLink {
        DownloadManagerView()
    } label: {
        HStack {
            Label("下载管理", systemImage: "arrow.down.circle")
            Spacer()
            Text(formatSize(BookCacheManager.shared.totalCacheSize))
                .foregroundColor(.secondary)
        }
    }

    Button(role: .destructive) {
        showClearCacheAlert = true
    } label: {
        Label("清空所有缓存", systemImage: "trash")
    }
}
```

---

## 11. 本地化

```swift
// Localizable.strings (English)
"cache.download" = "Download";
"cache.downloading" = "Downloading...";
"cache.downloaded" = "Downloaded";
"cache.delete" = "Delete Download";
"cache.clear_all" = "Clear All Downloads";
"cache.storage_used" = "Storage Used";
"cache.download_failed" = "Download Failed";
"cache.insufficient_storage" = "Insufficient Storage";

// Localizable.strings (Chinese)
"cache.download" = "下载";
"cache.downloading" = "下载中...";
"cache.downloaded" = "已下载";
"cache.delete" = "删除下载";
"cache.clear_all" = "清空所有下载";
"cache.storage_used" = "已使用空间";
"cache.download_failed" = "下载失败";
"cache.insufficient_storage" = "存储空间不足";
```

---

## 12. 测试计划

### 12.1 单元测试

| 测试项 | 描述 |
|--------|------|
| 下载成功 | 验证文件正确保存到缓存目录 |
| 元数据保存 | 验证元数据正确记录 |
| 缓存读取 | 验证能正确获取已缓存文件路径 |
| 缓存删除 | 验证单本删除和全部清空 |
| 空间计算 | 验证缓存大小计算准确 |

### 12.2 集成测试

| 测试项 | 描述 |
|--------|------|
| 离线阅读 | 断网后能打开已缓存书籍 |
| 下载进度 | UI 正确显示下载进度 |
| 断点续传 | 网络中断后能继续下载 (可选) |
| 并发下载 | 多本书同时下载正常工作 |

---

## 13. 实现计划

### Phase 1: 基础功能 (MVP)
- [ ] BookCacheManager 核心实现
- [ ] 自动缓存（打开时下载）
- [ ] 离线阅读支持
- [ ] 基础 UI（缓存状态显示）

### Phase 2: 管理功能
- [ ] 下载管理页面
- [ ] 手动下载/删除
- [ ] 存储空间显示
- [ ] 设置页面集成

### Phase 3: 增强功能 (可选)
- [ ] 后台下载
- [ ] 下载队列管理
- [ ] 自动清理策略
- [ ] 下载进度通知

---

## 14. 风险与注意事项

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 存储空间占用过大 | 用户设备空间不足 | 提供清理功能，显示占用空间 |
| 系统清理缓存 | 用户需重新下载 | 使用 Application Support 或提示用户 |
| 大文件下载失败 | 用户体验差 | 断点续传，重试机制 |
| 缓存文件损坏 | 无法阅读 | 校验文件完整性，支持重新下载 |

---

## 15. 相关文件

实现时需要修改/创建的文件：

**新建文件:**
- `BookPost/Services/BookCacheManager.swift`
- `BookPost/Views/Settings/DownloadManagerView.swift`
- `BookPost/Models/CachedBookMetadata.swift`

**修改文件:**
- `BookPost/Views/BookDetail/BookDetailView.swift` - 添加下载按钮
- `BookPost/Views/Reader/ReaderContainerView.swift` - 集成缓存读取
- `BookPost/Views/Profile/MyBookshelfView.swift` - 显示缓存状态
- `BookPost/Views/Profile/SettingsView.swift` - 添加存储管理入口
- `BookPost/Utilities/L10n.swift` - 添加本地化 key
- `BookPost/Resources/*/Localizable.strings` - 添加翻译

---

*文档版本: 1.0*
*创建日期: 2024-12-14*
*作者: Claude Code*
