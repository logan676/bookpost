import SwiftUI

#if canImport(ReadiumShared) && canImport(ReadiumNavigator)
import ReadiumShared
import ReadiumNavigator
#endif

/// Tab options for the reader navigation panel
enum ReaderNavTab: String, CaseIterable, Identifiable {
    case contents
    case search
    case bookmarks
    case aiOutline

    var id: String { rawValue }

    var title: String {
        switch self {
        case .contents: return L10n.ReaderNav.contents
        case .search: return L10n.ReaderNav.search
        case .bookmarks: return L10n.ReaderNav.bookmarks
        case .aiOutline: return L10n.ReaderNav.aiOutline
        }
    }

    var icon: String {
        switch self {
        case .contents: return "list.bullet"
        case .search: return "magnifyingglass"
        case .bookmarks: return "bookmark"
        case .aiOutline: return "sparkles"
        }
    }
}

/// Unified navigation panel with tabs for Contents, Search, Bookmarks, and AI Outline
struct ReaderTOCTabView: View {
    let bookType: String
    let bookId: Int
    let bookTitle: String

    // TOC items
    let tableOfContents: [TOCItem]
    let currentHref: String?

    // Callbacks
    var onSelectTOCItem: ((TOCItem) -> Void)?
    var onSelectBookmark: ((Any) -> Void)?  // Locator type
    var onSelectSearchResult: ((Any) -> Void)?  // Locator type

    #if canImport(ReadiumShared) && canImport(ReadiumNavigator)
    var publication: Publication?
    #endif

    @Environment(\.dismiss) var dismiss
    @State private var selectedTab: ReaderNavTab = .contents
    @State private var searchQuery = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Custom tab bar
                tabBar

                Divider()

                // Tab content
                tabContent
            }
            .navigationTitle(selectedTab.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(L10n.Common.done) {
                        dismiss()
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    // MARK: - Tab Bar

    private var tabBar: some View {
        HStack(spacing: 0) {
            ForEach(ReaderNavTab.allCases) { tab in
                tabButton(for: tab)
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
    }

    private func tabButton(for tab: ReaderNavTab) -> some View {
        Button {
            withAnimation(.easeInOut(duration: 0.2)) {
                selectedTab = tab
            }
        } label: {
            VStack(spacing: 4) {
                Image(systemName: selectedTab == tab ? "\(tab.icon).fill" : tab.icon)
                    .font(.system(size: 18))
                    .foregroundColor(selectedTab == tab ? .blue : .secondary)

                Text(tab.title)
                    .font(.caption2)
                    .foregroundColor(selectedTab == tab ? .blue : .secondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            .background(selectedTab == tab ? Color.blue.opacity(0.1) : Color.clear)
            .cornerRadius(8)
        }
    }

    // MARK: - Tab Content

    @ViewBuilder
    private var tabContent: some View {
        switch selectedTab {
        case .contents:
            contentsTab
        case .search:
            searchTab
        case .bookmarks:
            bookmarksTab
        case .aiOutline:
            aiOutlineTab
        }
    }

    // MARK: - Contents Tab

    private var contentsTab: some View {
        Group {
            if tableOfContents.isEmpty {
                emptyState(
                    icon: "list.bullet",
                    title: L10n.ReaderNav.noContents,
                    message: L10n.ReaderNav.noContentsDesc
                )
            } else {
                List {
                    ForEach(tableOfContents) { item in
                        TOCItemRow(
                            item: item,
                            isCurrentChapter: item.href == currentHref,
                            onTap: {
                                onSelectTOCItem?(item)
                                dismiss()
                            }
                        )
                    }
                }
                .listStyle(.plain)
            }
        }
    }

    // MARK: - Search Tab

    private var searchTab: some View {
        VStack(spacing: 0) {
            // Search bar
            HStack(spacing: 12) {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.secondary)

                TextField(L10n.ReaderNav.searchPlaceholder, text: $searchQuery)
                    .textFieldStyle(.plain)
                    .submitLabel(.search)

                if !searchQuery.isEmpty {
                    Button {
                        searchQuery = ""
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.secondary)
                    }
                }
            }
            .padding(12)
            .background(Color(.systemGray6))
            .cornerRadius(10)
            .padding()

            Divider()

            // Search results would be shown here
            // This integrates with EPUBSearchView functionality
            if searchQuery.isEmpty {
                emptyState(
                    icon: "magnifyingglass",
                    title: L10n.ReaderNav.searchHint,
                    message: L10n.ReaderNav.searchHintDesc
                )
            } else {
                // Search results list
                searchResultsList
            }
        }
    }

    private var searchResultsList: some View {
        // This would integrate with the existing EPUBSearchView
        // For now, show a placeholder
        List {
            Text(L10n.ReaderNav.searching)
                .foregroundColor(.secondary)
        }
        .listStyle(.plain)
    }

    // MARK: - Bookmarks Tab

    private var bookmarksTab: some View {
        BookmarksTabContent(
            bookType: bookType,
            bookId: bookId,
            currentHref: currentHref,
            onSelectBookmark: { bookmark in
                onSelectBookmark?(bookmark)
                dismiss()
            }
        )
    }

    // MARK: - AI Outline Tab

    private var aiOutlineTab: some View {
        AIOutlineTabContent(
            bookType: bookType,
            bookId: bookId,
            bookTitle: bookTitle,
            tableOfContents: tableOfContents,
            onSelectTopic: { topic in
                // Navigate to topic location
                dismiss()
            }
        )
    }

    // MARK: - Empty State

    private func emptyState(icon: String, title: String, message: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 40))
                .foregroundColor(.secondary)

            Text(title)
                .font(.headline)
                .foregroundColor(.secondary)

            Text(message)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - TOC Item Row

struct TOCItemRow: View {
    let item: TOCItem
    let isCurrentChapter: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                // Indent based on level
                if item.level > 0 {
                    Spacer()
                        .frame(width: CGFloat(item.level) * 16)
                }

                // Chapter indicator
                if isCurrentChapter {
                    Circle()
                        .fill(Color.blue)
                        .frame(width: 8, height: 8)
                }

                Text(item.title)
                    .font(item.level == 0 ? .headline : .subheadline)
                    .fontWeight(item.level == 0 ? .medium : .regular)
                    .foregroundColor(isCurrentChapter ? .blue : .primary)
                    .lineLimit(2)

                Spacer()

                if !item.children.isEmpty {
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.vertical, 8)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Bookmarks Tab Content

struct BookmarksTabContent: View {
    let bookType: String
    let bookId: Int
    let currentHref: String?
    var onSelectBookmark: ((Bookmark) -> Void)?

    @StateObject private var bookmarkManager = BookmarkManager.shared

    private var bookmarks: [Bookmark] {
        bookmarkManager.bookmarks(for: bookType, bookId: bookId)
    }

    var body: some View {
        Group {
            if bookmarks.isEmpty {
                emptyBookmarksState
            } else {
                bookmarksList
            }
        }
    }

    private var emptyBookmarksState: some View {
        VStack(spacing: 12) {
            Image(systemName: "bookmark")
                .font(.system(size: 40))
                .foregroundColor(.secondary)

            Text(L10n.ReaderNav.noBookmarks)
                .font(.headline)
                .foregroundColor(.secondary)

            Text(L10n.ReaderNav.noBookmarksDesc)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var bookmarksList: some View {
        List {
            ForEach(bookmarks) { bookmark in
                BookmarkRow(bookmark: bookmark, isCurrentLocation: bookmark.href == currentHref) {
                    onSelectBookmark?(bookmark)
                }
            }
            .onDelete(perform: deleteBookmarks)
        }
        .listStyle(.plain)
    }

    private func deleteBookmarks(at offsets: IndexSet) {
        for index in offsets {
            let bookmark = bookmarks[index]
            bookmarkManager.removeBookmark(bookType: bookType, bookId: bookId, href: bookmark.href)
        }
    }
}

// MARK: - Bookmark Row

struct BookmarkRow: View {
    let bookmark: Bookmark
    let isCurrentLocation: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                Image(systemName: isCurrentLocation ? "bookmark.fill" : "bookmark")
                    .font(.title3)
                    .foregroundColor(isCurrentLocation ? .orange : .secondary)
                    .frame(width: 24)

                VStack(alignment: .leading, spacing: 4) {
                    if let chapterTitle = bookmark.chapterTitle {
                        Text(chapterTitle)
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(isCurrentLocation ? .blue : .primary)
                    }

                    if let snippet = bookmark.textSnippet {
                        Text(snippet)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .lineLimit(2)
                    }

                    Text(bookmark.createdAt, style: .relative)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }

                Spacer()

                if let progression = bookmark.totalProgression {
                    Text("\(Int(progression * 100))%")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.vertical, 4)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

// MARK: - AI Outline Tab Content

struct AIOutlineTabContent: View {
    let bookType: String
    let bookId: Int
    let bookTitle: String
    let tableOfContents: [TOCItem]
    var onSelectTopic: ((AIOutlineTopic) -> Void)?

    @State private var isLoading = false
    @State private var aiTopics: [AIOutlineTopic] = []
    @State private var errorMessage: String?

    var body: some View {
        Group {
            if isLoading {
                loadingState
            } else if let error = errorMessage {
                errorState(error)
            } else if aiTopics.isEmpty {
                generateOutlinePrompt
            } else {
                outlineList
            }
        }
        .task {
            await loadAIOutline()
        }
    }

    private var loadingState: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)

            Text(L10n.ReaderNav.generatingOutline)
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func errorState(_ message: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 40))
                .foregroundColor(.orange)

            Text(message)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            Button(L10n.Common.retry) {
                Task { await loadAIOutline() }
            }
            .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var generateOutlinePrompt: some View {
        VStack(spacing: 16) {
            Image(systemName: "sparkles")
                .font(.system(size: 40))
                .foregroundColor(.purple)

            Text(L10n.ReaderNav.aiOutlineTitle)
                .font(.headline)

            Text(L10n.ReaderNav.aiOutlineDesc)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)

            Button {
                Task { await generateOutline() }
            } label: {
                Label(L10n.ReaderNav.generateOutline, systemImage: "sparkles")
            }
            .buttonStyle(.borderedProminent)
            .tint(.purple)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var outlineList: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(aiTopics) { topic in
                    AIOutlineTopicRow(topic: topic) {
                        onSelectTopic?(topic)
                    }

                    if topic.id != aiTopics.last?.id {
                        Divider()
                            .padding(.leading, 56)
                    }
                }
            }
            .padding(.vertical)
        }
    }

    // MARK: - Data Loading

    private func loadAIOutline() async {
        // Check if outline already exists
        // This would load from cache/API
    }

    private func generateOutline() async {
        isLoading = true
        errorMessage = nil

        // Simulated AI generation
        do {
            try await Task.sleep(nanoseconds: 2_000_000_000)

            // Generate sample topics based on TOC
            aiTopics = tableOfContents.prefix(5).enumerated().map { index, item in
                AIOutlineTopic(
                    id: index + 1,
                    title: "Key Theme: \(item.title)",
                    summary: "This section explores the main ideas and themes presented in this chapter.",
                    keyPoints: ["Point 1", "Point 2", "Point 3"],
                    relatedChapters: [item.href ?? ""],
                    progression: Double(index) * 0.2
                )
            }

            isLoading = false
        } catch {
            errorMessage = error.localizedDescription
            isLoading = false
        }
    }
}

// MARK: - AI Outline Topic Model

struct AIOutlineTopic: Identifiable {
    let id: Int
    let title: String
    let summary: String
    let keyPoints: [String]
    let relatedChapters: [String]
    let progression: Double
}

// MARK: - AI Outline Topic Row

struct AIOutlineTopicRow: View {
    let topic: AIOutlineTopic
    let onTap: () -> Void

    @State private var isExpanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Button {
                withAnimation(.easeInOut(duration: 0.2)) {
                    isExpanded.toggle()
                }
            } label: {
                HStack(spacing: 12) {
                    Image(systemName: "sparkles")
                        .font(.title3)
                        .foregroundColor(.purple)
                        .frame(width: 32)

                    VStack(alignment: .leading, spacing: 4) {
                        Text(topic.title)
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(.primary)

                        if !isExpanded {
                            Text(topic.summary)
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .lineLimit(2)
                        }
                    }

                    Spacer()

                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            if isExpanded {
                VStack(alignment: .leading, spacing: 12) {
                    Text(topic.summary)
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                    VStack(alignment: .leading, spacing: 6) {
                        Text(L10n.ReaderNav.keyPoints)
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(.secondary)

                        ForEach(topic.keyPoints, id: \.self) { point in
                            HStack(alignment: .top, spacing: 8) {
                                Circle()
                                    .fill(Color.purple)
                                    .frame(width: 6, height: 6)
                                    .padding(.top, 6)

                                Text(point)
                                    .font(.caption)
                                    .foregroundColor(.primary)
                            }
                        }
                    }

                    Button {
                        onTap()
                    } label: {
                        Label(L10n.ReaderNav.goToSection, systemImage: "arrow.right.circle")
                            .font(.caption)
                    }
                    .buttonStyle(.bordered)
                    .tint(.purple)
                }
                .padding(.leading, 44)
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 12)
    }
}

#Preview {
    let tocItems = [
        TOCItem(title: "Introduction", level: 0, href: "intro.xhtml"),
        TOCItem(title: "Chapter 1: The Beginning", level: 0, href: "ch1.xhtml", children: [
            TOCItem(title: "Section 1.1", level: 1, href: "ch1-1.xhtml")
        ]),
        TOCItem(title: "Chapter 2: The Journey", level: 0, href: "ch2.xhtml"),
        TOCItem(title: "Chapter 3: The End", level: 0, href: "ch3.xhtml")
    ]

    ReaderTOCTabView(
        bookType: "ebook",
        bookId: 1,
        bookTitle: "Sample Book",
        tableOfContents: tocItems,
        currentHref: "ch1.xhtml"
    )
}
