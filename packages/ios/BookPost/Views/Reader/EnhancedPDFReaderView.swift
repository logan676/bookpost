import SwiftUI
import PDFKit

/// Enhanced PDF Reader with toolbar, settings, and table of contents
struct EnhancedPDFReaderView: View {
    let type: String
    let id: Int
    let title: String

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
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.5)

            if downloadProgress > 0 {
                ProgressView(value: downloadProgress)
                    .frame(width: 200)

                Text("\(Int(downloadProgress * 100))%")
                    .font(.caption)
                    .foregroundColor(.secondary)
            } else {
                Text(L10n.Common.loading)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
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
        guard let document = pdfDocument,
              let pdfView = pdfView,
              page >= 0 && page < document.pageCount,
              let pdfPage = document.page(at: page) else { return }

        pdfView.go(to: pdfPage)
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
        Task {
            await endReadingSession()
            saveReadingProgress()
            dismiss()
        }
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

        // Check cache first
        let cacheDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
        let cachedFile = cacheDir.appendingPathComponent("pdfs/\(type)s/\(id).pdf")

        if FileManager.default.fileExists(atPath: cachedFile.path),
           let document = PDFDocument(url: cachedFile) {
            self.pdfDocument = document
            self.totalPages = document.pageCount
            isLoading = false
            await startReadingSession()
            return
        }

        // Download from API
        do {
            let fileURL: URL
            if type == "ebook" {
                fileURL = try await APIClient.shared.downloadEbookFile(id: id, fileType: "pdf")
            } else {
                fileURL = try await APIClient.shared.downloadMagazineFile(id: id)
            }

            if let document = PDFDocument(url: fileURL) {
                self.pdfDocument = document
                self.totalPages = document.pageCount
                await startReadingSession()
            } else {
                errorMessage = L10n.Reader.openFailed
            }
        } catch {
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

// MARK: - Enhanced PDFKit View

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
        pdfView.document = document
        pdfView.autoScales = true
        applyPageFlipStyle(to: pdfView, style: settings.pageFlipStyle)
        pdfView.backgroundColor = UIColor(settings.colorMode.backgroundColor)

        // Add tap gesture
        let tapGesture = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handleTap(_:)))
        tapGesture.numberOfTapsRequired = 1
        pdfView.addGestureRecognizer(tapGesture)

        // Long press gesture for text selection
        let longPressGesture = UILongPressGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handleLongPress(_:)))
        longPressGesture.minimumPressDuration = 0.5
        pdfView.addGestureRecognizer(longPressGesture)

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
        applyPageFlipStyle(to: uiView, style: settings.pageFlipStyle)
    }

    /// Apply page flip style settings to the PDFView
    private func applyPageFlipStyle(to pdfView: PDFView, style: PageFlipStyle) {
        switch style {
        case .horizontal:
            pdfView.displayMode = .singlePage
            pdfView.displayDirection = .horizontal
            pdfView.usePageViewController(true, withViewOptions: nil)
        case .vertical:
            pdfView.displayMode = .singlePageContinuous
            pdfView.displayDirection = .vertical
            pdfView.usePageViewController(false, withViewOptions: nil)
        case .curl:
            // Page curl effect using UIPageViewController
            pdfView.displayMode = .singlePage
            pdfView.displayDirection = .horizontal
            pdfView.usePageViewController(true, withViewOptions: [
                UIPageViewController.OptionsKey.spineLocation: NSNumber(value: UIPageViewController.SpineLocation.min.rawValue)
            ])
        case .fade:
            // Fade effect - use single page mode with custom transition
            pdfView.displayMode = .singlePage
            pdfView.displayDirection = .horizontal
            pdfView.usePageViewController(true, withViewOptions: nil)
        }
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
            // Clear selection if tapping elsewhere
            if parent.selectedText != nil {
                DispatchQueue.main.async {
                    self.parent.selectedText = nil
                    self.parent.selectionRect = nil
                }
            } else {
                parent.onTap()
            }
        }

        @objc func handleLongPress(_ gesture: UILongPressGestureRecognizer) {
            guard gesture.state == .ended,
                  let pdfView = gesture.view as? PDFView else { return }

            self.pdfView = pdfView

            // Get the selected text after a slight delay to allow iOS to complete selection
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                self.checkSelection(in: pdfView)
            }
        }

        @objc func selectionChanged(_ notification: Notification) {
            guard let pdfView = notification.object as? PDFView else { return }
            self.pdfView = pdfView

            // Delay to allow selection to stabilize
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

            // Get selection bounds in view coordinates
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
        guard let outline = document.outlineRoot else { return [] }
        return extractTOCItems(from: outline)
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
                onSelectPage(page)
            }
        } label: {
            HStack {
                Text(item.title)
                    .foregroundColor(.primary)
                    .padding(.leading, CGFloat(item.level * 16))

                Spacer()

                if let page = item.pageNumber {
                    Text("\(page + 1)")
                        .foregroundColor(.secondary)
                        .font(.caption)
                }

                if item.pageNumber == currentPage {
                    Image(systemName: "checkmark")
                        .foregroundColor(.blue)
                        .font(.caption)
                }
            }
        }
    }

    private func extractTOCItems(from outline: PDFOutline, level: Int = 0) -> [TOCItem] {
        var items: [TOCItem] = []

        for i in 0..<outline.numberOfChildren {
            guard let child = outline.child(at: i) else { continue }

            let pageNumber = child.destination?.page.flatMap { document.index(for: $0) }

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
