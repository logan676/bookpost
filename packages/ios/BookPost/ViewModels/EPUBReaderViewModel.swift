import SwiftUI
import Combine

#if canImport(ReadiumShared) && canImport(ReadiumStreamer) && canImport(ReadiumNavigator)
import ReadiumShared
import ReadiumStreamer
import ReadiumNavigator
import ReadiumAdapterGCDWebServer
#endif

/// ViewModel for EPUB reader state management
/// Handles publication loading, navigation, and reading progress
@MainActor
class EPUBReaderViewModel: ObservableObject {
    // Book info
    let bookType: String
    let bookId: Int
    let bookTitle: String

    // Loading state
    @Published var isLoading = true
    @Published var errorMessage: String?
    @Published var downloadProgress: Double = 0

    // Reading state
    @Published var currentLocation: String?  // CFI string for EPUB position
    @Published var currentChapterTitle: String?
    @Published var currentChapterIndex: Int = 0
    @Published var totalChapters: Int = 0
    @Published var progress: Double = 0  // 0.0 - 1.0

    // Table of contents
    @Published var tableOfContents: [EPUBTOCItem] = []

    // Initial position for resuming reading
    #if canImport(ReadiumShared) && canImport(ReadiumNavigator)
    @Published var initialLocator: Locator?
    #endif

    // Session management
    private var sessionStarted = false
    private let sessionManager = ReadingSessionManager.shared

    #if canImport(ReadiumShared) && canImport(ReadiumStreamer) && canImport(ReadiumNavigator)
    // Readium objects
    @Published var publication: Publication?
    private var publicationOpener: PublicationOpener?

    // HTTP server for serving publication resources
    private(set) var httpServer: GCDHTTPServer?
    #endif

    init(bookType: String, bookId: Int, title: String) {
        self.bookType = bookType
        self.bookId = bookId
        self.bookTitle = title
    }

    // MARK: - Publication Loading

    func loadPublication() async {
        isLoading = true
        errorMessage = nil

        Log.i("📖 Starting EPUB load for \(bookType) id=\(bookId), title=\(bookTitle)")

        let cacheManager = BookCacheManager.shared
        let cachedBookType: CachedBookMetadata.CachedBookType = bookType == "ebook" ? .ebook : .magazine

        do {
            var fileURL: URL

            // Check BookCacheManager first
            if let cachedFile = cacheManager.getCachedFilePath(bookType: cachedBookType, bookId: bookId) {
                Log.i("✅ Found cached EPUB via BookCacheManager")
                cacheManager.updateLastAccessed(bookType: cachedBookType, bookId: bookId)
                fileURL = cachedFile
            } else {
                // Fallback: Check legacy cache location
                let cacheDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
                let legacyCachedFile = cacheDir.appendingPathComponent("epubs/\(bookType)s/\(bookId).epub")

                if FileManager.default.fileExists(atPath: legacyCachedFile.path) {
                    Log.i("✅ Found EPUB in legacy cache")
                    fileURL = legacyCachedFile
                } else {
                    Log.i("⬇️ Downloading EPUB file via BookCacheManager...")

                    // Build the download URL - use the file endpoint directly
                    let downloadUrl = "\(APIClient.shared.baseURL)/api/\(bookType)s/\(bookId)/file"

                    // Get cover URL if available
                    var coverUrl: String?
                    if bookType == "ebook" {
                        let ebook = try await APIClient.shared.getEbook(id: bookId)
                        coverUrl = ebook.data.coverUrl
                    }

                    // Download and cache via BookCacheManager
                    fileURL = try await cacheManager.downloadBook(
                        bookType: cachedBookType,
                        bookId: bookId,
                        fileUrl: downloadUrl,
                        title: bookTitle,
                        coverUrl: coverUrl
                    )

                    Log.i("✅ Download complete: \(fileURL.path)")
                }
            }

            #if canImport(ReadiumShared) && canImport(ReadiumStreamer) && canImport(ReadiumNavigator)
            Log.i("📚 Readium framework available, parsing EPUB...")
            // Create HTTP server for serving publication resources
            self.httpServer = GCDHTTPServer(assetRetriever: AssetRetriever(httpClient: DefaultHTTPClient()))

            // Parse EPUB with Readium
            await parseEPUB(at: fileURL)

            // Load saved reading position
            await loadSavedPosition()
            #else
            Log.e("❌ Readium framework not available!")
            errorMessage = "EPUB support requires Readium framework"
            #endif

            await startReadingSession()

        } catch {
            Log.e("❌ EPUB download/load failed", error: error)
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    #if canImport(ReadiumShared) && canImport(ReadiumStreamer) && canImport(ReadiumNavigator)
    private func parseEPUB(at url: URL) async {
        Log.d("📚 parseEPUB starting for: \(url.path)")
        do {
            // Readium 3.x: Create HTTP server and open publication
            let httpClient = DefaultHTTPClient()
            let assetRetriever = AssetRetriever(httpClient: httpClient)

            // Create absolute URL from file URL
            guard let absoluteURL = url.absoluteURL as URL?,
                  let readiumURL = ReadiumShared.FileURL(url: absoluteURL) else {
                Log.e("❌ Invalid file URL: \(url)")
                errorMessage = "Invalid file URL"
                return
            }

            Log.d("📂 Retrieving asset from: \(readiumURL)")
            let asset = try await assetRetriever.retrieve(url: readiumURL).get()
            Log.d("✅ Asset retrieved successfully")

            let parser = DefaultPublicationParser(
                httpClient: httpClient,
                assetRetriever: assetRetriever,
                pdfFactory: DefaultPDFDocumentFactory()
            )
            let opener = PublicationOpener(parser: parser)
            self.publicationOpener = opener

            Log.d("📖 Opening publication...")
            let publication = try await opener.open(asset: asset, allowUserInteraction: false).get()
            self.publication = publication
            Log.i("✅ EPUB opened: \(publication.metadata.title ?? "Unknown")")

            // Extract table of contents
            await extractTOC(from: publication)

            totalChapters = publication.readingOrder.count
            Log.i("📑 Total chapters: \(totalChapters)")

        } catch {
            Log.e("❌ Failed to parse EPUB", error: error)
            errorMessage = "Failed to open EPUB: \(error.localizedDescription)"
        }
    }

    private func extractTOC(from publication: Publication) async {
        // Readium 3.x: tableOfContents() is async and returns Result<[Link], ReadError>
        let result = await publication.tableOfContents()
        switch result {
        case .success(let links):
            var items: [EPUBTOCItem] = []
            for link in links {
                let children = link.children.map { child in
                    EPUBTOCItem(
                        title: child.title ?? "Untitled",
                        href: String(describing: child.href),
                        children: []
                    )
                }
                items.append(EPUBTOCItem(
                    title: link.title ?? "Untitled",
                    href: String(describing: link.href),
                    children: children
                ))
            }
            tableOfContents = items
        case .failure(let error):
            print("Failed to load table of contents: \(error)")
        }
    }

    /// Load saved reading position from local storage or API
    private func loadSavedPosition() async {
        guard let publication = publication else { return }

        // Try to load from UserDefaults first (faster)
        let positionKey = "reading_position_\(bookType)_\(bookId)"
        if let savedData = UserDefaults.standard.data(forKey: positionKey),
           let savedPosition = try? JSONDecoder().decode(SavedReadingPosition.self, from: savedData) {

            // Create locator from saved position using progression
            if let totalProgression = savedPosition.totalProgression {
                // Use locate(progression:) which is the safest way to create a locator
                if let locator = await publication.locate(progression: totalProgression) {
                    initialLocator = locator
                    currentLocation = savedPosition.href
                    currentChapterTitle = savedPosition.chapterTitle
                    progress = totalProgression
                }
            } else {
                // Fallback to first chapter using locate
                if let locator = await publication.locate(progression: 0) {
                    initialLocator = locator
                    currentLocation = savedPosition.href
                    currentChapterTitle = savedPosition.chapterTitle
                    progress = 0
                }
            }
        }

        // Also try to fetch from API for cross-device sync
        do {
            let history = try await APIClient.shared.getReadingHistory(itemType: .ebook, itemId: bookId)
            if let serverProgress = history?.progress,
               initialLocator == nil {
                // If no local position, use server position
                if let locator = await publication.locate(progression: serverProgress) {
                    initialLocator = locator
                    progress = serverProgress
                }
            }
        } catch {
            print("Failed to load reading position from server: \(error)")
        }
    }

    /// Save current reading position locally and to server
    func saveCurrentPosition() {
        guard let publication = publication else { return }

        let positionKey = "reading_position_\(bookType)_\(bookId)"
        let savedPosition = SavedReadingPosition(
            href: currentLocation,
            chapterTitle: currentChapterTitle,
            progression: nil,
            totalProgression: progress,
            fragments: nil
        )

        if let data = try? JSONEncoder().encode(savedPosition) {
            UserDefaults.standard.set(data, forKey: positionKey)
        }

        // Sync to server
        Task {
            try? await APIClient.shared.updateReadingProgress(
                bookType: bookType,
                bookId: bookId,
                progress: progress,
                position: currentLocation
            )
        }
    }
    #endif

    // MARK: - Navigation

    func navigateToChapter(at index: Int) {
        #if canImport(ReadiumShared) && canImport(ReadiumStreamer) && canImport(ReadiumNavigator)
        guard let publication = publication,
              index >= 0 && index < publication.readingOrder.count else { return }

        currentChapterIndex = index
        // Navigation will be handled by the navigator view
        #endif
    }

    #if canImport(ReadiumShared) && canImport(ReadiumNavigator)
    /// Navigate to a specific locator (used for search results and TOC)
    @Published var targetLocator: Locator?

    func navigateToTOCItem(_ item: EPUBTOCItem) {
        guard let publication = publication else {
            currentLocation = item.href
            return
        }

        // Find the matching link in the publication's table of contents or reading order
        Task {
            // Try to find the link that matches this TOC item's href
            let tocResult = await publication.tableOfContents()

            if case .success(let links) = tocResult {
                // Search for the link in TOC (including children)
                if let link = findLink(in: links, href: item.href) {
                    // Use publication.locate(link:) to create a proper Locator
                    // locate() returns Locator? directly in Readium 3.x
                    if let locator = await publication.locate(link) {
                        await MainActor.run {
                            self.targetLocator = locator
                            self.currentLocation = item.href
                            self.currentChapterTitle = item.title
                        }
                        return
                    }
                }
            }

            // Fallback: try to find in reading order
            for link in publication.readingOrder {
                let linkHref = String(describing: link.href)
                if linkHref == item.href || linkHref.contains(item.href) || item.href.contains(linkHref) {
                    if let locator = await publication.locate(link) {
                        await MainActor.run {
                            self.targetLocator = locator
                            self.currentLocation = item.href
                            self.currentChapterTitle = item.title
                        }
                        return
                    }
                }
            }

            // If no matching link found, just update the current location
            await MainActor.run {
                self.currentLocation = item.href
            }
        }
    }

    /// Recursively find a Link in the TOC that matches the given href
    private func findLink(in links: [ReadiumShared.Link], href: String) -> ReadiumShared.Link? {
        for link in links {
            let linkHref = String(describing: link.href)
            if linkHref == href || linkHref.contains(href) || href.contains(linkHref) {
                return link
            }
            // Check children
            if let found = findLink(in: link.children, href: href) {
                return found
            }
        }
        return nil
    }

    func navigateToLocator(_ locator: Locator) {
        targetLocator = locator
        currentLocation = String(describing: locator.href)
        currentChapterTitle = locator.title
    }
    #else
    func navigateToTOCItem(_ item: EPUBTOCItem) {
        currentLocation = item.href
    }
    #endif

    // MARK: - Progress Tracking

    func updateProgress(locator: Any) {
        #if canImport(ReadiumShared) && canImport(ReadiumStreamer) && canImport(ReadiumNavigator)
        guard let locator = locator as? Locator else { return }

        let hrefString = String(describing: locator.href)
        currentLocation = hrefString
        currentChapterTitle = locator.title

        // Calculate progress
        if let publication = publication {
            if let index = publication.readingOrder.firstIndex(where: { String(describing: $0.href) == hrefString }) {
                currentChapterIndex = index
                progress = Double(index + 1) / Double(publication.readingOrder.count)
            }
        }
        #endif
    }

    // MARK: - Session Management

    func startReadingSession() async {
        guard !sessionStarted else { return }

        do {
            try await sessionManager.startSession(
                bookId: bookId,
                bookType: bookType,
                position: currentLocation,
                chapterIndex: currentChapterIndex
            )
            sessionStarted = true
        } catch {
            print("Failed to start reading session: \(error)")
        }
    }

    func endReadingSession() async {
        guard sessionStarted else { return }

        do {
            _ = try await sessionManager.endSession(
                endPosition: currentLocation,
                chapterIndex: currentChapterIndex,
                pagesRead: nil
            )
            sessionStarted = false
        } catch {
            print("Failed to end reading session: \(error)")
        }
    }

    func saveReadingProgress() {
        #if canImport(ReadiumShared) && canImport(ReadiumStreamer) && canImport(ReadiumNavigator)
        saveCurrentPosition()
        #endif

        Task {
            try? await APIClient.shared.updateReadingHistory(
                itemType: .ebook,
                itemId: bookId,
                title: bookTitle,
                coverUrl: nil,
                lastPage: nil
            )
        }
    }
}

// MARK: - EPUB TOC Item

struct EPUBTOCItem: Identifiable {
    let id = UUID()
    let title: String
    let href: String
    let children: [EPUBTOCItem]

    /// Convert to generic TOCItem for use with ReaderTOCTabView
    func toTOCItem(level: Int = 0) -> TOCItem {
        TOCItem(
            id: id.uuidString,
            title: title,
            level: level,
            pageNumber: nil,
            href: href,
            children: children.map { $0.toTOCItem(level: level + 1) }
        )
    }
}

// MARK: - Saved Reading Position

/// Model for persisting reading position locally
struct SavedReadingPosition: Codable {
    let href: String?
    let chapterTitle: String?
    let progression: Double?
    let totalProgression: Double?
    let fragments: [String]?
}
