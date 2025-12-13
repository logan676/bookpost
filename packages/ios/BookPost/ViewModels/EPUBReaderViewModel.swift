import SwiftUI
import Combine

#if canImport(ReadiumShared) && canImport(ReadiumStreamer) && canImport(ReadiumNavigator)
import ReadiumShared
import ReadiumStreamer
import ReadiumNavigator
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

        do {
            // Check cache first
            let cacheDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
            let cachedFile = cacheDir.appendingPathComponent("epubs/\(bookType)s/\(bookId).epub")

            var fileURL: URL

            if FileManager.default.fileExists(atPath: cachedFile.path) {
                fileURL = cachedFile
            } else {
                // Download from API
                fileURL = try await APIClient.shared.downloadEbookFile(id: bookId)

                // Cache the file
                try? FileManager.default.createDirectory(
                    at: cachedFile.deletingLastPathComponent(),
                    withIntermediateDirectories: true
                )
                try? FileManager.default.copyItem(at: fileURL, to: cachedFile)
            }

            #if canImport(ReadiumShared) && canImport(ReadiumStreamer) && canImport(ReadiumNavigator)
            // Parse EPUB with Readium
            await parseEPUB(at: fileURL)

            // Load saved reading position
            await loadSavedPosition()
            #else
            errorMessage = "EPUB support requires Readium framework"
            #endif

            await startReadingSession()

        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    #if canImport(ReadiumShared) && canImport(ReadiumStreamer) && canImport(ReadiumNavigator)
    private func parseEPUB(at url: URL) async {
        do {
            // Readium 3.x: Create HTTP server and open publication
            let httpClient = DefaultHTTPClient()
            let assetRetriever = AssetRetriever(httpClient: httpClient)

            // Create absolute URL from file URL
            guard let absoluteURL = url.absoluteURL as URL?,
                  let readiumURL = ReadiumShared.FileURL(url: absoluteURL) else {
                errorMessage = "Invalid file URL"
                return
            }

            let asset = try await assetRetriever.retrieve(url: readiumURL).get()

            let parser = DefaultPublicationParser(
                httpClient: httpClient,
                assetRetriever: assetRetriever,
                pdfFactory: DefaultPDFDocumentFactory()
            )
            let opener = PublicationOpener(parser: parser)
            self.publicationOpener = opener

            let publication = try await opener.open(asset: asset, allowUserInteraction: false).get()
            self.publication = publication

            // Extract table of contents
            await extractTOC(from: publication)

            totalChapters = publication.readingOrder.count

        } catch {
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

    func navigateToTOCItem(_ item: EPUBTOCItem) {
        currentLocation = item.href
        // Navigation will be handled by the navigator view
    }

    #if canImport(ReadiumShared) && canImport(ReadiumNavigator)
    /// Navigate to a specific locator (used for search results)
    @Published var targetLocator: Locator?

    func navigateToLocator(_ locator: Locator) {
        targetLocator = locator
        currentLocation = String(describing: locator.href)
        currentChapterTitle = locator.title
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
