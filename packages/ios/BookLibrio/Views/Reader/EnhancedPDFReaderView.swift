import SwiftUI
import PDFKit

/// Enhanced PDF Reader with toolbar, settings, and table of contents
struct EnhancedPDFReaderView: View {
    let type: String
    let id: Int
    let title: String
    var coverUrl: String? = nil

    @Environment(\.dismiss) var dismiss
    @StateObject private var sessionManager = ReadingSessionManager.shared
    @StateObject private var settingsStore = ReadingSettingsStore.shared

    // PDF state
    @State private var pdfDocument: PDFDocument?
    @State private var pdfView: PDFView?
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var downloadProgress: Double = 0

    // Page tracking
    @State private var currentPage = 0
    @State private var totalPages = 0

    // UI state
    @State private var showToolbar = true
    @State private var showSettings = false
    @State private var showTOC = false
    @State private var showHighlights = false
    @State private var sessionStarted = false

    // New reader enhancement states
    @State private var showMoreActions = false
    @State private var showDisplaySettings = false
    @State private var showAddToList = false

    // Text selection state
    @State private var selectedText: String?
    @State private var selectionRect: CGRect?
    @State private var highlights: [Highlight] = []

    // Display settings
    @StateObject private var displaySettings = ReaderDisplaySettingsStore.shared

    // Auto-hide timer
    @State private var hideToolbarTask: Task<Void, Never>?

    var body: some View {
        ZStack {
            // Background based on color mode
            settingsStore.settings.colorMode.backgroundColor
                .ignoresSafeArea()

            // Main content
            Group {
                if isLoading {
                    loadingView
                } else if let error = errorMessage {
                    ErrorView(message: error) {
                        Task { await loadPDF() }
                    }
                } else if let document = pdfDocument {
                    pdfContentView(document: document)
                }
            }

            // Toolbar overlay
            if showToolbar && !isLoading && errorMessage == nil {
                toolbarOverlay
            }

            // Text selection overlay
            TextSelectionOverlay(
                selectedText: $selectedText,
                selectionRect: $selectionRect,
                currentPage: currentPage,
                onHighlight: { text, color in
                    Task { await createHighlight(text: text, color: color) }
                },
                onAddNote: { text in
                    Task { await createHighlight(text: text, color: .yellow) }
                }
            )
        }
        .statusBarHidden(!showToolbar)
        .task {
            await loadPDF()
            await loadHighlights()
        }
        .onDisappear {
            if sessionStarted {
                Task { await endReadingSession() }
            }
        }
        .sheet(isPresented: $showSettings) {
            ReaderSettingsSheet(settings: $settingsStore.settings)
        }
        .sheet(isPresented: $showTOC) {
            if let document = pdfDocument {
                PDFTableOfContentsView(
                    document: document,
                    currentPage: currentPage,
                    onSelectPage: { page in
                        navigateToPage(page)
                        showTOC = false
                    }
                )
            }
        }
        .sheet(isPresented: $showHighlights) {
            HighlightsListView(
                bookType: type,
                bookId: id,
                bookTitle: title,
                onSelectHighlight: { highlight in
                    if let page = highlight.pageNumber {
                        navigateToPage(page - 1) // Pages are 0-indexed internally
                    }
                }
            )
        }
        .sheet(isPresented: $showMoreActions) {
            ReaderMoreActionsSheet(
                bookType: type,
                bookId: id,
                bookTitle: title,
                onReviewBook: { /* Navigate to review */ },
                onDownloadOffline: { /* Download book */ },
                onAddBookmark: { /* Add bookmark */ },
                onAddToList: { showAddToList = true },
                onSearchBook: { /* Search in PDF */ },
                onViewNotes: { showHighlights = true },
                onPopularHighlights: { /* Show popular highlights */ },
                onGiftToFriend: { /* Gift book */ },
                onReportError: { /* Report error */ },
                onDisplaySettings: { showDisplaySettings = true }
            )
        }
        .sheet(isPresented: $showDisplaySettings) {
            ReaderDisplayToggleSheet()
        }
        .sheet(isPresented: $showAddToList) {
            AddToListSheet(
                bookId: id,
                bookType: type,
                bookTitle: title
            )
        }
        .onAppear {
            // Apply brightness setting
            applyBrightness()
            // Keep screen on if enabled
            UIApplication.shared.isIdleTimerDisabled = settingsStore.settings.keepScreenOn
        }
        .onDisappear {
            // Restore default brightness behavior
            UIApplication.shared.isIdleTimerDisabled = false
        }
        .onChange(of: settingsStore.settings.brightness) { _, newValue in
            UIScreen.main.brightness = CGFloat(newValue)
        }
        .onChange(of: settingsStore.settings.keepScreenOn) { _, newValue in
            UIApplication.shared.isIdleTimerDisabled = newValue
        }
    }

    // MARK: - Brightness Control

    private func applyBrightness() {
        UIScreen.main.brightness = CGFloat(settingsStore.settings.brightness)
    }

    // MARK: - Loading View

    private var loadingView: some View {
        ZStack {
            VStack(spacing: 24) {
                // Book cover or placeholder
                if let coverUrl = coverUrl {
                    BookCoverView(coverUrl: coverUrl, title: title)
                        .frame(width: 120, height: 168)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .shadow(radius: 4)
                } else {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color.gray.opacity(0.2))
                        .frame(width: 120, height: 168)
                        .overlay(
                            Image(systemName: "doc.richtext")
                                .font(.system(size: 32))
                                .foregroundColor(.gray)
                        )
                }

                // Book title
                Text(title)
                    .font(.headline)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .padding(.horizontal)

                VStack(spacing: 12) {
                    // Loading spinner
                    ProgressView()
                        .scaleEffect(1.2)

                    // Progress bar (if available)
                    if downloadProgress > 0 {
                        VStack(spacing: 6) {
                            ProgressView(value: downloadProgress)
                                .frame(width: 200)
                                .tint(.orange)

                            Text("\(Int(downloadProgress * 100))%")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    } else {
                        Text(L10n.Common.loading)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }

                // Cancel button
                Button {
                    dismiss()
                } label: {
                    Text(L10n.Common.cancel)
                        .font(.subheadline)
                        .foregroundColor(.orange)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 10)
                        .background(Color.orange.opacity(0.1))
                        .cornerRadius(20)
                }
                .padding(.top, 8)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            // Top-left close button for quick access
            VStack {
                HStack {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.primary)
                            .frame(width: 44, height: 44)
                            .background(.ultraThinMaterial)
                            .clipShape(Circle())
                    }
                    .padding(.leading, 16)
                    .padding(.top, 60)
                    Spacer()
                }
                Spacer()
            }
        }
    }

    // MARK: - PDF Content View

    private func pdfContentView(document: PDFDocument) -> some View {
        EnhancedPDFKitView(
            document: document,
            currentPage: $currentPage,
            selectedText: $selectedText,
            selectionRect: $selectionRect,
            settings: settingsStore.settings,
            onTap: {
                withAnimation(.easeInOut(duration: 0.2)) {
                    showToolbar.toggle()
                }
                scheduleToolbarHide()
            },
            onPDFViewCreated: { view in
                self.pdfView = view
            }
        )
        .ignoresSafeArea()
    }

    // MARK: - Toolbar Overlay

    private var toolbarOverlay: some View {
        VStack(spacing: 0) {
            // Top toolbar
            topToolbar
                .background(.ultraThinMaterial)

            Spacer()

            // Bottom toolbar
            bottomToolbar
                .background(.ultraThinMaterial)
        }
        .transition(.opacity)
    }

    private var topToolbar: some View {
        HStack {
            Button {
                closeReader()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.primary)
                    .frame(width: 44, height: 44)
            }

            Spacer()

            // Title
            Text(title)
                .font(.headline)
                .lineLimit(1)

            Spacer()

            // Reading timer
            if sessionManager.isActive {
                Button {
                    Task { try? await sessionManager.togglePause() }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: sessionManager.isPaused ? "play.fill" : "pause.fill")
                            .font(.caption)
                        Text(sessionManager.formattedElapsedTime)
                            .font(.system(.caption, design: .monospaced))
                    }
                    .foregroundColor(sessionManager.isPaused ? .gray : .orange)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(sessionManager.isPaused ? Color.gray.opacity(0.15) : Color.orange.opacity(0.15))
                    .cornerRadius(8)
                }
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .padding(.top, 44) // Safe area
    }

    private var bottomToolbar: some View {
        VStack(spacing: 12) {
            // Page slider
            if totalPages > 1 {
                HStack {
                    Text("\(currentPage + 1)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .frame(width: 40)

                    Slider(
                        value: Binding(
                            get: { Double(currentPage) },
                            set: { navigateToPage(Int($0)) }
                        ),
                        in: 0...Double(max(totalPages - 1, 1)),
                        step: 1
                    )

                    Text("\(totalPages)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .frame(width: 40)
                }
                .padding(.horizontal)
            }

            // Toolbar buttons
            HStack(spacing: 0) {
                toolbarButton(icon: "list.bullet", label: L10n.Reader.tableOfContents) {
                    showTOC = true
                }

                Spacer()

                toolbarButton(icon: "textformat.size", label: L10n.Reader.settings) {
                    showSettings = true
                }

                Spacer()

                // Page indicator
                VStack(spacing: 2) {
                    Text(L10n.Reader.page(currentPage + 1))
                        .font(.caption)
                        .fontWeight(.medium)
                    Text(L10n.Reader.totalPages(totalPages))
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)

                Spacer()

                toolbarButton(icon: "highlighter", label: L10n.Reader.highlights) {
                    showHighlights = true
                }

                Spacer()

                toolbarButton(icon: "ellipsis", label: L10n.ReaderActions.more) {
                    showMoreActions = true
                }
            }
            .padding(.horizontal)
            .padding(.bottom, 34) // Safe area
        }
        .padding(.top, 12)
    }

    private func toolbarButton(icon: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 20))
                Text(label)
                    .font(.caption2)
            }
            .foregroundColor(.primary)
            .frame(maxWidth: .infinity)
        }
    }

    // MARK: - Navigation

    private func navigateToPage(_ page: Int) {
        Log.d("📄 navigateToPage called: page=\(page), pdfDocument=\(pdfDocument != nil), pdfView=\(pdfView != nil)")

        guard let document = pdfDocument else {
            Log.e("📄 navigateToPage: pdfDocument is nil")
            return
        }

        guard let view = pdfView else {
            Log.e("📄 navigateToPage: pdfView is nil")
            return
        }

        guard page >= 0 && page < document.pageCount else {
            Log.e("📄 navigateToPage: page \(page) out of range (0..<\(document.pageCount))")
            return
        }

        guard let pdfPage = document.page(at: page) else {
            Log.e("📄 navigateToPage: could not get page at index \(page)")
            return
        }

        Log.i("📄 Navigating to page \(page + 1)")
        view.go(to: pdfPage)
        currentPage = page
    }

    // MARK: - Toolbar Auto-Hide

    private func scheduleToolbarHide() {
        hideToolbarTask?.cancel()
        hideToolbarTask = Task {
            try? await Task.sleep(nanoseconds: 5_000_000_000) // 5 seconds
            if !Task.isCancelled {
                await MainActor.run {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        showToolbar = false
                    }
                }
            }
        }
    }

    // MARK: - Session Management

    private func closeReader() {
        // Save position locally (instant)
        saveReadingProgress()

        // Dismiss immediately for responsive UX
        dismiss()

        // Background: end session (fire-and-forget)
        // Note: Session ending happens via onDisappear
    }

    private func startReadingSession() async {
        guard !sessionStarted else { return }
        do {
            try await sessionManager.startSession(
                bookId: id,
                bookType: type,
                position: "\(currentPage)",
                chapterIndex: nil
            )
            sessionStarted = true
        } catch {
            print("Failed to start reading session: \(error)")
        }
    }

    private func endReadingSession() async {
        guard sessionStarted else { return }
        do {
            _ = try await sessionManager.endSession(
                endPosition: "\(currentPage)",
                chapterIndex: nil,
                pagesRead: currentPage + 1
            )
            sessionStarted = false
        } catch {
            print("Failed to end reading session: \(error)")
        }
    }

    private func saveReadingProgress() {
        guard totalPages > 0 else { return }

        Task {
            let itemType: ItemType = type == "ebook" ? .ebook : .magazine
            try? await APIClient.shared.updateReadingHistory(
                itemType: itemType,
                itemId: id,
                title: title,
                coverUrl: nil,
                lastPage: currentPage + 1
            )
        }
    }

    // MARK: - PDF Loading

    private func loadPDF() async {
        isLoading = true
        errorMessage = nil

        Log.i("📖 Starting PDF load for \(type) id=\(id), title=\(title)")

        let cacheManager = BookCacheManager.shared
        let bookType: CachedBookMetadata.CachedBookType = type == "ebook" ? .ebook : .magazine

        // Check BookCacheManager first
        if let cachedFile = cacheManager.getCachedFilePath(bookType: bookType, bookId: id) {
            Log.i("✅ Found cached PDF via BookCacheManager")
            if let document = PDFDocument(url: cachedFile) {
                self.pdfDocument = document
                self.totalPages = document.pageCount
                Log.i("📄 Loaded cached PDF with \(document.pageCount) pages")
                cacheManager.updateLastAccessed(bookType: bookType, bookId: id)
                isLoading = false
                await startReadingSession()
                return
            } else {
                Log.w("⚠️ Cached PDF file exists but failed to parse, re-downloading...")
                try? cacheManager.deleteCache(bookType: bookType, bookId: id)
            }
        }

        // Fallback: Check legacy cache location
        let cacheDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
        let legacyCachedFile = cacheDir.appendingPathComponent("pdfs/\(type)s/\(id).pdf")

        if FileManager.default.fileExists(atPath: legacyCachedFile.path) {
            Log.i("✅ Found PDF in legacy cache")
            if let document = PDFDocument(url: legacyCachedFile) {
                self.pdfDocument = document
                self.totalPages = document.pageCount
                Log.i("📄 Loaded legacy cached PDF with \(document.pageCount) pages")
                isLoading = false
                await startReadingSession()
                return
            } else {
                Log.w("⚠️ Legacy cached PDF file exists but failed to parse, re-downloading...")
                try? FileManager.default.removeItem(at: legacyCachedFile)
            }
        } else {
            Log.d("📂 No cached file found, will download")
        }

        // Download from API and cache via BookCacheManager
        do {
            Log.i("⬇️ Downloading \(type) file from API...")

            // Construct the download URL directly
            let downloadUrl = "\(APIClient.shared.baseURL)/api/\(type)s/\(id)/file"

            // Download and cache via BookCacheManager
            let fileURL = try await cacheManager.downloadBook(
                bookType: bookType,
                bookId: id,
                fileUrl: downloadUrl,
                title: title,
                coverUrl: coverUrl
            )

            Log.i("✅ Download complete: \(fileURL.path)")

            if let document = PDFDocument(url: fileURL) {
                self.pdfDocument = document
                self.totalPages = document.pageCount
                Log.i("📄 PDF opened successfully with \(document.pageCount) pages")
                await startReadingSession()
            } else {
                Log.e("❌ Failed to parse PDF from downloaded file")
                errorMessage = L10n.Reader.openFailed
            }
        } catch {
            Log.e("❌ PDF download/load failed", error: error)
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Highlight Management

    private func loadHighlights() async {
        do {
            let response: UnderlineListResponse
            if type == "ebook" {
                response = try await APIClient.shared.getEbookUnderlines(ebookId: id)
            } else {
                response = try await APIClient.shared.getMagazineUnderlines(magazineId: id)
            }

            highlights = response.data.map { Highlight(from: $0, bookType: type) }

            // Apply highlight annotations to PDF
            applyHighlightAnnotations()
        } catch {
            print("Failed to load highlights: \(error)")
        }
    }

    private func applyHighlightAnnotations() {
        guard let document = pdfDocument, let pdfView = pdfView else { return }

        // First, remove existing highlight annotations
        for pageIndex in 0..<document.pageCount {
            guard let page = document.page(at: pageIndex) else { continue }
            let annotations = page.annotations.filter { $0.type == "Highlight" }
            for annotation in annotations {
                page.removeAnnotation(annotation)
            }
        }

        // Add annotations for each highlight
        for highlight in highlights {
            guard let pageNum = highlight.pageNumber,
                  pageNum > 0,
                  pageNum <= document.pageCount,
                  let page = document.page(at: pageNum - 1) else { continue }

            // Search for the text on the page to get its position
            if let selection = document.findString(highlight.text, withOptions: .caseInsensitive).first(where: { sel in
                sel.pages.contains(page)
            }) {
                // Create highlight annotation
                let bounds = selection.bounds(for: page)
                let annotation = PDFAnnotation(bounds: bounds, forType: .highlight, withProperties: nil)
                annotation.color = UIColor(highlight.color.color.opacity(0.35))
                page.addAnnotation(annotation)
            }
        }

        // Refresh the PDF view
        pdfView.setNeedsLayout()
    }

    private func createHighlight(text: String, color: HighlightColor) async {
        do {
            let pageNum = currentPage + 1 // Convert to 1-indexed

            if type == "ebook" {
                _ = try await APIClient.shared.createEbookUnderline(
                    ebookId: id,
                    text: text,
                    pageNumber: pageNum,
                    chapterIndex: nil,
                    paragraphIndex: nil,
                    startOffset: nil,
                    endOffset: nil,
                    cfiRange: nil,
                    color: color.rawValue
                )
            } else {
                _ = try await APIClient.shared.createMagazineUnderline(
                    magazineId: id,
                    text: text,
                    pageNumber: pageNum,
                    startOffset: nil,
                    endOffset: nil,
                    color: color.rawValue
                )
            }

            // Reload highlights to get the new one with ID and apply annotations
            await loadHighlights()

            // Show success feedback
            let generator = UINotificationFeedbackGenerator()
            generator.notificationOccurred(.success)

            // Clear the text selection
            selectedText = nil
            selectionRect = nil

        } catch {
            print("Failed to create highlight: \(error)")

            // Show error feedback
            let generator = UINotificationFeedbackGenerator()
            generator.notificationOccurred(.error)
        }
    }
}

// MARK: - Enhanced PDFKit View (Using WKWebView for reliable scaling)

import WebKit

struct EnhancedPDFKitView: UIViewRepresentable {
    let document: PDFDocument
    @Binding var currentPage: Int
    @Binding var selectedText: String?
    @Binding var selectionRect: CGRect?
    let settings: ReadingSettings
    let onTap: () -> Void
    let onPDFViewCreated: (PDFView) -> Void

    func makeUIView(context: Context) -> PDFView {
        let pdfView = PDFView()

        // CRITICAL: Set display mode BEFORE setting document
        pdfView.displayMode = .singlePageContinuous
        pdfView.displayDirection = .vertical

        // IMPORTANT: Disable autoScales to prevent conflicts with manual scaling
        pdfView.autoScales = false

        // Set document after configuring display mode
        pdfView.document = document

        // Calculate proper scale factor to fit width
        if let page = document.page(at: 0) {
            let pageRect = page.bounds(for: .mediaBox)
            let screenWidth = UIScreen.main.bounds.width
            let screenHeight = UIScreen.main.bounds.height

            // Use the smaller dimension to ensure the page fits
            let widthScale = screenWidth / pageRect.width
            let heightScale = screenHeight / pageRect.height
            let fitScale = min(widthScale, heightScale) * 0.95  // 95% to add margin

            Log.d("📐 PDF Scaling: pageSize=\(pageRect.width)x\(pageRect.height), screen=\(screenWidth)x\(screenHeight), scale=\(fitScale)")

            pdfView.minScaleFactor = fitScale * 0.5
            pdfView.maxScaleFactor = fitScale * 4.0
            pdfView.scaleFactor = fitScale
        }

        pdfView.backgroundColor = UIColor(settings.colorMode.backgroundColor)

        // Add tap gesture
        let tapGesture = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handleTap(_:)))
        tapGesture.numberOfTapsRequired = 1
        pdfView.addGestureRecognizer(tapGesture)

        // Page change observer
        NotificationCenter.default.addObserver(
            context.coordinator,
            selector: #selector(Coordinator.pageChanged(_:)),
            name: .PDFViewPageChanged,
            object: pdfView
        )

        // Selection change observer
        NotificationCenter.default.addObserver(
            context.coordinator,
            selector: #selector(Coordinator.selectionChanged(_:)),
            name: .PDFViewSelectionChanged,
            object: pdfView
        )

        onPDFViewCreated(pdfView)
        return pdfView
    }

    func updateUIView(_ uiView: PDFView, context: Context) {
        uiView.backgroundColor = UIColor(settings.colorMode.backgroundColor)
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject {
        var parent: EnhancedPDFKitView
        weak var pdfView: PDFView?

        init(_ parent: EnhancedPDFKitView) {
            self.parent = parent
        }

        @objc func handleTap(_ gesture: UITapGestureRecognizer) {
            if parent.selectedText != nil {
                DispatchQueue.main.async {
                    self.parent.selectedText = nil
                    self.parent.selectionRect = nil
                }
            } else {
                parent.onTap()
            }
        }

        @objc func selectionChanged(_ notification: Notification) {
            guard let pdfView = notification.object as? PDFView else { return }
            self.pdfView = pdfView

            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                self.checkSelection(in: pdfView)
            }
        }

        private func checkSelection(in pdfView: PDFView) {
            guard let selection = pdfView.currentSelection,
                  let selectedString = selection.string,
                  !selectedString.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                return
            }

            if let page = selection.pages.first {
                let pageBounds = selection.bounds(for: page)
                let viewBounds = pdfView.convert(pageBounds, from: page)

                DispatchQueue.main.async {
                    self.parent.selectedText = selectedString.trimmingCharacters(in: .whitespacesAndNewlines)
                    self.parent.selectionRect = viewBounds
                }
            }
        }

        @objc func pageChanged(_ notification: Notification) {
            guard let pdfView = notification.object as? PDFView,
                  let currentPage = pdfView.currentPage,
                  let pageIndex = pdfView.document?.index(for: currentPage) else {
                return
            }

            DispatchQueue.main.async {
                self.parent.currentPage = pageIndex
            }
        }
    }
}

// MARK: - PDF Table of Contents View

struct PDFTableOfContentsView: View {
    let document: PDFDocument
    let currentPage: Int
    let onSelectPage: (Int) -> Void

    @Environment(\.dismiss) var dismiss

    var tocItems: [TOCItem] {
        guard let outline = document.outlineRoot else {
            Log.d("📑 PDF has no outline root (no TOC)")
            return []
        }
        Log.d("📑 PDF has outline with \(outline.numberOfChildren) top-level items")
        let items = extractTOCItems(from: outline)
        Log.i("📑 Extracted \(items.count) total TOC items")
        return items
    }

    var body: some View {
        NavigationStack {
            Group {
                if tocItems.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "list.bullet.rectangle")
                            .font(.system(size: 48))
                            .foregroundColor(.secondary)
                        Text(L10n.Reader.noTableOfContents)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List(tocItems) { item in
                        tocRow(item: item)
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle(L10n.Reader.tableOfContents)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(L10n.Reader.done) { dismiss() }
                }
            }
        }
    }

    private func tocRow(item: TOCItem) -> some View {
        Button {
            if let page = item.pageNumber {
                Log.i("📑 TOC: Navigating to page \(page + 1) for '\(item.title)'")
                onSelectPage(page)
            } else {
                Log.w("📑 TOC: Item '\(item.title)' has no page number, cannot navigate")
            }
        } label: {
            HStack {
                Text(item.title)
                    .foregroundColor(item.pageNumber != nil ? .primary : .secondary)
                    .padding(.leading, CGFloat(item.level * 16))

                Spacer()

                if let page = item.pageNumber {
                    Text("\(page + 1)")
                        .foregroundColor(.secondary)
                        .font(.caption)
                } else {
                    // Show indicator that this item can't be navigated
                    Image(systemName: "minus")
                        .foregroundColor(.secondary.opacity(0.5))
                        .font(.caption)
                }

                if item.pageNumber == currentPage {
                    Image(systemName: "checkmark")
                        .foregroundColor(.blue)
                        .font(.caption)
                }
            }
        }
        .disabled(item.pageNumber == nil)
    }

    private func extractTOCItems(from outline: PDFOutline, level: Int = 0) -> [TOCItem] {
        var items: [TOCItem] = []

        for i in 0..<outline.numberOfChildren {
            guard let child = outline.child(at: i) else { continue }

            // Try to get page number from destination
            var pageNumber: Int?

            if let destination = child.destination, let page = destination.page {
                pageNumber = document.index(for: page)
                Log.d("📑 TOC item '\(child.label ?? "?")' has destination to page \(pageNumber ?? -1)")
            } else if let action = child.action as? PDFActionGoTo,
                      let page = action.destination.page {
                // Some PDFs use action instead of destination
                pageNumber = document.index(for: page)
                Log.d("📑 TOC item '\(child.label ?? "?")' has action to page \(pageNumber ?? -1)")
            } else {
                Log.d("📑 TOC item '\(child.label ?? "?")' has no page destination")
            }

            let item = TOCItem(
                title: child.label ?? "Untitled",
                level: level,
                pageNumber: pageNumber,
                children: extractTOCItems(from: child, level: level + 1)
            )
            items.append(item)

            // Flatten children for simple list display
            items.append(contentsOf: item.children)
        }

        return items
    }
}

#Preview {
    EnhancedPDFReaderView(type: "ebook", id: 1, title: "Sample Book")
}
