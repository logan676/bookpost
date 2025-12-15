import SwiftUI

#if canImport(ReadiumShared) && canImport(ReadiumNavigator)
import ReadiumShared
import ReadiumNavigator
import ReadiumAdapterGCDWebServer
#endif

/// EPUB Reader view using Readium framework
/// Provides full EPUB reading experience with navigation, settings, and highlights
struct EPUBReaderView: View {
    let bookType: String
    let id: Int
    let title: String
    let coverUrl: String?

    @Environment(\.dismiss) var dismiss
    @StateObject private var viewModel: EPUBReaderViewModel
    @StateObject private var settingsStore = ReadingSettingsStore.shared
    @StateObject private var sessionManager = ReadingSessionManager.shared

    // UI state
    @State private var showToolbar = true
    @State private var showSettings = false
    @State private var showTOC = false
    @State private var showSearch = false
    @State private var showBookmarks = false
    @State private var showHighlights = false
    @State private var hideToolbarTask: Task<Void, Never>?
    @State private var bookmarkToast: String?

    // New reader enhancement states
    @State private var showMoreActions = false
    @State private var showDisplaySettings = false
    @State private var showAddToList = false
    @State private var showNavTabs = false
    @State private var showFriendThoughts = false

    // Bookmark manager
    @StateObject private var bookmarkManager = BookmarkManager.shared
    @StateObject private var displaySettings = ReaderDisplaySettingsStore.shared
    @StateObject private var friendThoughtsVM = FriendThoughtsViewModel()

    // Highlights with idea counts
    #if canImport(ReadiumShared) && canImport(ReadiumNavigator)
    @State private var highlightDecorations: [HighlightDecoration] = []
    #endif

    init(bookType: String, id: Int, title: String, coverUrl: String?) {
        self.bookType = bookType
        self.id = id
        self.title = title
        self.coverUrl = coverUrl
        self._viewModel = StateObject(wrappedValue: EPUBReaderViewModel(
            bookType: bookType,
            bookId: id,
            title: title
        ))
    }

    var body: some View {
        ZStack {
            // Background
            settingsStore.settings.colorMode.backgroundColor
                .ignoresSafeArea()

            // Main content
            Group {
                if viewModel.isLoading {
                    loadingView
                } else if let error = viewModel.errorMessage {
                    errorView(error)
                } else {
                    readerContent
                }
            }

            // Toolbar overlay
            if showToolbar && !viewModel.isLoading && viewModel.errorMessage == nil {
                toolbarOverlay
            }
        }
        .statusBarHidden(!showToolbar)
        .task {
            await viewModel.loadPublication()
            // Load friend thoughts for social features
            if displaySettings.showFriendThoughts {
                await friendThoughtsVM.loadThoughts(bookType: bookType, bookId: id)
            }
            // Load user's highlights/underlines
            await viewModel.loadHighlights()
            #if canImport(ReadiumShared) && canImport(ReadiumNavigator)
            // Create decorations for display
            highlightDecorations = await viewModel.createHighlightDecorations()
            #endif
        }
        .onDisappear {
            Task { await viewModel.endReadingSession() }
        }
        .sheet(isPresented: $showSettings) {
            ReaderSettingsSheet(settings: $settingsStore.settings)
        }
        .sheet(isPresented: $showTOC) {
            EPUBTableOfContentsView(
                items: viewModel.tableOfContents,
                currentHref: viewModel.currentLocation,
                onSelectItem: { item in
                    viewModel.navigateToTOCItem(item)
                    showTOC = false
                }
            )
        }
        .sheet(isPresented: $showSearch) {
            #if canImport(ReadiumShared) && canImport(ReadiumNavigator)
            if let publication = viewModel.publication {
                EPUBSearchView(publication: publication) { locator in
                    viewModel.navigateToLocator(locator)
                }
            }
            #endif
        }
        .sheet(isPresented: $showBookmarks) {
            #if canImport(ReadiumShared) && canImport(ReadiumNavigator)
            EPUBBookmarksView(
                bookType: bookType,
                bookId: id,
                currentHref: viewModel.currentLocation,
                publication: viewModel.publication,
                onSelectBookmark: { locator in
                    viewModel.navigateToLocator(locator)
                }
            )
            #endif
        }
        .sheet(isPresented: $showHighlights) {
            HighlightsListView(
                bookType: bookType,
                bookId: id,
                bookTitle: title,
                onSelectHighlight: { highlight in
                    // Navigate to highlight location
                    #if canImport(ReadiumShared) && canImport(ReadiumNavigator)
                    if let cfi = highlight.cfiRange,
                       let publication = viewModel.publication {
                        Task {
                            // Try to navigate using progression if available
                            if let chapter = highlight.chapterIndex,
                               chapter < publication.readingOrder.count {
                                let progression = Double(chapter) / Double(publication.readingOrder.count)
                                if let locator = await publication.locate(progression: progression) {
                                    viewModel.navigateToLocator(locator)
                                }
                            }
                        }
                    }
                    #endif
                }
            )
        }
        .sheet(isPresented: $showMoreActions) {
            ReaderMoreActionsSheet(
                bookType: bookType,
                bookId: id,
                bookTitle: title,
                onReviewBook: { /* Navigate to review */ },
                onDownloadOffline: { /* Download book */ },
                onAddBookmark: { toggleCurrentBookmark() },
                onAddToList: { showAddToList = true },
                onSearchBook: { showSearch = true },
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
                bookType: bookType,
                bookTitle: title
            )
        }
        .sheet(isPresented: $showNavTabs) {
            ReaderTOCTabView(
                bookType: bookType,
                bookId: id,
                bookTitle: title,
                tableOfContents: viewModel.tableOfContents.map { epubItem in
                    epubItem.toTOCItem()
                },
                currentHref: viewModel.currentLocation,
                onSelectTOCItem: { item in
                    if let href = item.href {
                        // Find the matching EPUBTOCItem and navigate properly
                        if let epubItem = findEPUBTOCItem(in: viewModel.tableOfContents, href: href) {
                            viewModel.navigateToTOCItem(epubItem)
                        }
                    }
                    showNavTabs = false
                }
            )
        }
        .sheet(isPresented: $showFriendThoughts) {
            FriendThoughtsSidebar(
                thoughts: friendThoughtsVM.thoughts,
                currentChapterIndex: viewModel.currentChapterIndex,
                isPresented: $showFriendThoughts,
                onThoughtTap: { thought in
                    // Navigate to thought location
                }
            )
        }
        .overlay(alignment: .top) {
            // Bookmark toast
            if let toast = bookmarkToast {
                Text(toast)
                    .font(.subheadline)
                    .foregroundColor(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(Color.black.opacity(0.75))
                    .cornerRadius(20)
                    .padding(.top, 100)
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .onAppear {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                            withAnimation {
                                bookmarkToast = nil
                            }
                        }
                    }
            }
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        ZStack {
            VStack(spacing: 24) {
                // Book cover placeholder
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
                            Image(systemName: "book.closed")
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
                    if viewModel.downloadProgress > 0 {
                        VStack(spacing: 6) {
                            ProgressView(value: viewModel.downloadProgress)
                                .frame(width: 200)
                                .tint(.orange)

                            Text("\(Int(viewModel.downloadProgress * 100))%")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    } else {
                        Text(L10n.Reader.loading)
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

    // MARK: - Error View

    private func errorView(_ message: String) -> some View {
        ZStack {
            VStack(spacing: 16) {
                Image(systemName: "exclamationmark.triangle")
                    .font(.system(size: 48))
                    .foregroundColor(.orange)

                Text(message)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)

                Button(L10n.Common.retry) {
                    Task { await viewModel.loadPublication() }
                }
                .buttonStyle(.borderedProminent)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            // Top-left close button for exiting error state
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

    // MARK: - Reader Content

    @ViewBuilder
    private var readerContent: some View {
        #if canImport(ReadiumShared) && canImport(ReadiumNavigator)
        if let publication = viewModel.publication, let httpServer = viewModel.httpServer {
            EPUBNavigatorView(
                publication: publication,
                initialLocator: viewModel.initialLocator,
                settings: settingsStore.settings,
                targetLocator: viewModel.targetLocator,
                httpServer: httpServer,
                highlightDecorations: highlightDecorations,
                onTap: {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        showToolbar.toggle()
                    }
                    scheduleToolbarHide()
                },
                onLocationChanged: { locator in
                    viewModel.updateProgress(locator: locator)
                    // Clear targetLocator after navigation
                    if viewModel.targetLocator != nil {
                        viewModel.targetLocator = nil
                    }
                },
                onHighlightCreated: { selection, color in
                    Task {
                        await saveHighlight(selection: selection, color: color)
                    }
                }
            )
            .ignoresSafeArea()
            // Overlay for idea count bubbles
            .overlay(alignment: .trailing) {
                ideaCountBubblesOverlay
            }
        } else {
            Text("No publication loaded")
                .foregroundColor(.secondary)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        #else
        // Fallback when Readium is not available
        VStack(spacing: 24) {
            Image(systemName: "book.closed")
                .font(.system(size: 64))
                .foregroundColor(.orange)

            Text("EPUB Reader")
                .font(.title2)
                .fontWeight(.bold)

            Text("EPUB support requires the Readium Swift Toolkit.\nPlease add the Readium SPM dependency in Xcode.")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            Button("Close") {
                dismiss()
            }
            .buttonStyle(.borderedProminent)
        }
        #endif
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
            VStack(spacing: 2) {
                Text(title)
                    .font(.headline)
                    .lineLimit(1)

                if let chapter = viewModel.currentChapterTitle {
                    Text(chapter)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
            }

            Spacer()

            // Placeholder for layout balance (same width as close button)
            Color.clear
                .frame(width: 44, height: 44)
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .padding(.top, 44) // Safe area
    }

    private var bottomToolbar: some View {
        VStack(spacing: 12) {
            // Page progress bar
            if viewModel.totalPages > 1 {
                HStack {
                    Text("\(viewModel.currentPage)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .frame(width: 40)

                    Slider(
                        value: Binding(
                            get: { Double(viewModel.currentPage) },
                            set: { viewModel.navigateToPage(Int($0)) }
                        ),
                        in: 1...Double(viewModel.totalPages),
                        step: 1
                    )

                    Text("\(viewModel.totalPages)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .frame(width: 40)
                }
                .padding(.horizontal)
            }

            // Toolbar buttons
            HStack(spacing: 0) {
                toolbarButton(icon: "list.bullet", label: L10n.Reader.tableOfContents) {
                    showNavTabs = true
                }

                Spacer()

                toolbarButton(icon: "textformat.size", label: L10n.Reader.settings) {
                    showSettings = true
                }

                Spacer()

                // Friend thoughts indicator (removed progress percentage)
                if displaySettings.showFriendThoughts && !friendThoughtsVM.thoughts.isEmpty {
                    FriendThoughtsIndicator(count: friendThoughtsVM.thoughts.count) {
                        showFriendThoughts = true
                    }
                    .frame(maxWidth: .infinity)

                    Spacer()
                }

                bookmarkButton

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

    // MARK: - Bookmark Button

    private var isCurrentPositionBookmarked: Bool {
        guard let href = viewModel.currentLocation else { return false }
        return bookmarkManager.isBookmarked(bookType: bookType, bookId: id, href: href)
    }

    private var bookmarkButton: some View {
        Button {
            toggleCurrentBookmark()
        } label: {
            VStack(spacing: 4) {
                Image(systemName: isCurrentPositionBookmarked ? "bookmark.fill" : "bookmark")
                    .font(.system(size: 20))
                    .foregroundColor(isCurrentPositionBookmarked ? .orange : .primary)
                Text(L10n.Reader.bookmarks)
                    .font(.caption2)
            }
            .foregroundColor(.primary)
            .frame(maxWidth: .infinity)
        }
        .simultaneousGesture(
            LongPressGesture(minimumDuration: 0.5)
                .onEnded { _ in
                    showBookmarks = true
                }
        )
    }

    private func toggleCurrentBookmark() {
        #if canImport(ReadiumShared) && canImport(ReadiumNavigator)
        guard let href = viewModel.currentLocation else { return }

        if isCurrentPositionBookmarked {
            bookmarkManager.removeBookmark(bookType: bookType, bookId: id, href: href)
            withAnimation {
                bookmarkToast = L10n.Reader.bookmarksRemoved
            }
        } else {
            // Create bookmark from current position
            let bookmark = Bookmark(
                bookType: bookType,
                bookId: id,
                href: href,
                progression: nil,
                totalProgression: viewModel.progress,
                chapterTitle: viewModel.currentChapterTitle,
                textSnippet: nil
            )
            bookmarkManager.addBookmark(bookmark)
            withAnimation {
                bookmarkToast = L10n.Reader.bookmarksAdded
            }
        }
        #endif
    }

    // MARK: - Helpers

    private func closeReader() {
        // Save position locally (instant)
        viewModel.saveCurrentPosition()

        // Dismiss immediately for responsive UX
        dismiss()

        // Background: end session and sync to server (fire-and-forget)
        Task {
            await viewModel.endReadingSession()
            viewModel.saveReadingProgress()
        }
    }

    private func scheduleToolbarHide() {
        hideToolbarTask?.cancel()
        hideToolbarTask = Task {
            try? await Task.sleep(nanoseconds: 5_000_000_000)
            if !Task.isCancelled {
                await MainActor.run {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        showToolbar = false
                    }
                }
            }
        }
    }

    // MARK: - TOC Helper

    /// Find an EPUBTOCItem by href (recursive search)
    private func findEPUBTOCItem(in items: [EPUBTOCItem], href: String) -> EPUBTOCItem? {
        for item in items {
            if item.href == href || item.href.contains(href) || href.contains(item.href) {
                return item
            }
            if let found = findEPUBTOCItem(in: item.children, href: href) {
                return found
            }
        }
        return nil
    }

    // MARK: - Highlight Saving

    #if canImport(ReadiumShared) && canImport(ReadiumNavigator)
    private func saveHighlight(selection: EPUBSelection, color: HighlightColor) async {
        do {
            // Get CFI range from locator if available
            let cfiRange = selection.locator.locations.otherLocations["cssSelector"] as? String

            let response: UnderlineResponse
            if bookType == "magazine" {
                response = try await APIClient.shared.createMagazineUnderline(
                    magazineId: id,
                    text: selection.text,
                    pageNumber: nil,
                    startOffset: nil,
                    endOffset: nil,
                    color: color.rawValue,
                    note: nil
                )
            } else {
                response = try await APIClient.shared.createEbookUnderline(
                    ebookId: id,
                    text: selection.text,
                    pageNumber: nil,
                    chapterIndex: viewModel.currentChapterIndex,
                    paragraphIndex: nil,
                    startOffset: nil,
                    endOffset: nil,
                    cfiRange: cfiRange,
                    color: color.rawValue,
                    note: nil
                )
            }

            Log.i("✅ Highlight saved: id=\(response.data.id), text=\(selection.text.prefix(30))...")

            // Note: Don't reload highlights here as it will replace the current decorations
            // which includes the just-created highlight with proper locator.
            // The highlight is already displayed by EPUBNavigatorViewController.
            // Highlights will be fully loaded on next book open.
        } catch {
            Log.e("❌ Failed to save highlight: \(error)")
        }
    }
    #endif

    // MARK: - Idea Count Bubbles Overlay

    #if canImport(ReadiumShared) && canImport(ReadiumNavigator)
    /// Overlay showing idea count bubbles next to highlights
    @ViewBuilder
    private var ideaCountBubblesOverlay: some View {
        let highlightsWithIdeas = highlightDecorations.filter { $0.ideaCount > 0 }

        if !highlightsWithIdeas.isEmpty {
            GeometryReader { geometry in
                VStack(spacing: 0) {
                    ForEach(highlightsWithIdeas, id: \.id) { highlight in
                        IdeaCountBubble(
                            count: highlight.ideaCount,
                            color: highlight.color
                        )
                        .offset(y: calculateBubbleOffset(for: highlight, in: geometry.size.height))
                    }
                }
                .frame(width: 32)
                .padding(.trailing, 4)
            }
        }
    }

    /// Calculate Y offset for bubble based on highlight position
    private func calculateBubbleOffset(for highlight: HighlightDecoration, in height: CGFloat) -> CGFloat {
        // Use chapter index or totalProgression if available
        if let progression = highlight.locator.locations.totalProgression {
            return height * progression
        }
        return 0
    }
    #endif
}

// MARK: - Idea Count Bubble View

/// Small bubble showing number of ideas for a highlight
struct IdeaCountBubble: View {
    let count: Int
    let color: HighlightColor

    var body: some View {
        ZStack {
            Circle()
                .fill(color.color)
                .frame(width: 24, height: 24)

            Text("\(count)")
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(.white)
        }
        .shadow(color: .black.opacity(0.2), radius: 2, x: 0, y: 1)
    }
}

// MARK: - Readium Navigator integration is in EPUBNavigatorViewController.swift

// MARK: - EPUB Table of Contents View

struct EPUBTableOfContentsView: View {
    let items: [EPUBTOCItem]
    let currentHref: String?
    let onSelectItem: (EPUBTOCItem) -> Void

    @Environment(\.dismiss) var dismiss

    /// Flattened TOC item with level for indentation
    private struct FlatTOCItem: Identifiable {
        let id: UUID
        let item: EPUBTOCItem
        let level: Int
    }

    /// Flatten hierarchical TOC into linear list with levels
    private var flattenedItems: [FlatTOCItem] {
        var result: [FlatTOCItem] = []
        func flatten(_ items: [EPUBTOCItem], level: Int) {
            for item in items {
                result.append(FlatTOCItem(id: item.id, item: item, level: level))
                flatten(item.children, level: level + 1)
            }
        }
        flatten(items, level: 0)
        return result
    }

    var body: some View {
        NavigationStack {
            Group {
                if items.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "list.bullet.rectangle")
                            .font(.system(size: 48))
                            .foregroundColor(.secondary)
                        Text(L10n.Reader.noTableOfContents)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List(flattenedItems) { flatItem in
                        Button {
                            onSelectItem(flatItem.item)
                        } label: {
                            HStack {
                                Text(flatItem.item.title)
                                    .foregroundColor(.primary)
                                    .padding(.leading, CGFloat(flatItem.level * 16))

                                Spacer()

                                if flatItem.item.href == currentHref {
                                    Image(systemName: "checkmark")
                                        .foregroundColor(.blue)
                                        .font(.caption)
                                }
                            }
                        }
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
}

#Preview {
    EPUBReaderView(
        bookType: "ebook",
        id: 1,
        title: "Sample EPUB Book",
        coverUrl: nil
    )
}
