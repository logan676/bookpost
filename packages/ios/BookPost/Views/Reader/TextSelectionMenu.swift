import SwiftUI

// MARK: - Menu State Types

/// The type of bubble menu to display
enum TextSelectionMenuType {
    case confirm       // New text selected - show Underline, Meaning, Copy, Share
    case existing      // Clicked existing underline - show Ideas, Add Idea, Meaning, Delete
    case ideaInput     // Adding idea - show text input
}

/// Menu that appears when text is selected in the reader
/// Provides options to highlight, copy, add notes, AI meaning, and share
struct TextSelectionMenu: View {
    let selectedText: String
    let currentPage: Int
    let menuType: TextSelectionMenuType
    let ideaCount: Int
    let onHighlight: (HighlightColor) -> Void
    let onCopy: () -> Void
    let onAddNote: () -> Void
    let onShare: () -> Void
    let onMeaning: () -> Void
    let onViewIdeas: () -> Void
    let onDelete: () -> Void
    let onDismiss: () -> Void

    @State private var showColorPicker = false

    init(
        selectedText: String,
        currentPage: Int,
        menuType: TextSelectionMenuType = .confirm,
        ideaCount: Int = 0,
        onHighlight: @escaping (HighlightColor) -> Void,
        onCopy: @escaping () -> Void,
        onAddNote: @escaping () -> Void,
        onShare: @escaping () -> Void,
        onMeaning: @escaping () -> Void = {},
        onViewIdeas: @escaping () -> Void = {},
        onDelete: @escaping () -> Void = {},
        onDismiss: @escaping () -> Void
    ) {
        self.selectedText = selectedText
        self.currentPage = currentPage
        self.menuType = menuType
        self.ideaCount = ideaCount
        self.onHighlight = onHighlight
        self.onCopy = onCopy
        self.onAddNote = onAddNote
        self.onShare = onShare
        self.onMeaning = onMeaning
        self.onViewIdeas = onViewIdeas
        self.onDelete = onDelete
        self.onDismiss = onDismiss
    }

    var body: some View {
        VStack(spacing: 0) {
            // Main action buttons based on menu type
            switch menuType {
            case .confirm:
                confirmMenuContent
            case .existing:
                existingMenuContent
            case .ideaInput:
                EmptyView() // Handled separately by IdeaInputBubble
            }

            // Color picker (shown when highlight is tapped in confirm mode)
            if showColorPicker && menuType == .confirm {
                colorPickerRow
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .animation(.easeInOut(duration: 0.2), value: showColorPicker)
    }

    // MARK: - Confirm Menu (New Selection)

    private var confirmMenuContent: some View {
        HStack(spacing: 0) {
            // Highlight button with color picker
            menuButton(icon: "highlighter", label: L10n.Notes.underlines) {
                showColorPicker.toggle()
            }

            Divider().frame(height: 40)

            // AI Meaning button
            menuButton(icon: "sparkles", label: L10n.AI.meaning) {
                onMeaning()
            }

            Divider().frame(height: 40)

            // Copy button
            menuButton(icon: "doc.on.doc", label: L10n.AI.copy) {
                onCopy()
                onDismiss()
            }

            Divider().frame(height: 40)

            // Share button
            menuButton(icon: "square.and.arrow.up", label: L10n.Common.share) {
                onShare()
            }
        }
        .frame(height: 56)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.15), radius: 8, x: 0, y: 4)
    }

    // MARK: - Existing Underline Menu

    private var existingMenuContent: some View {
        HStack(spacing: 0) {
            // View Ideas button (if has ideas)
            if ideaCount > 0 {
                menuButton(icon: "lightbulb.fill", label: "\(L10n.Stats.ideas)(\(ideaCount))") {
                    onViewIdeas()
                }
                Divider().frame(height: 40)
            }

            // Add Idea button
            menuButton(icon: "plus.bubble", label: L10n.Notes.addIdea) {
                onAddNote()
            }

            Divider().frame(height: 40)

            // AI Meaning button
            menuButton(icon: "sparkles", label: L10n.AI.meaning) {
                onMeaning()
            }

            Divider().frame(height: 40)

            // Delete button
            menuButton(icon: "trash", label: L10n.Common.delete) {
                onDelete()
            }
            .foregroundColor(.red)
        }
        .frame(height: 56)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.15), radius: 8, x: 0, y: 4)
    }

    // MARK: - Components

    private func menuButton(icon: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 18))
                Text(label)
                    .font(.caption2)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .foregroundColor(.primary)
            .frame(maxWidth: .infinity)
            .frame(minWidth: 60)
        }
    }

    private var colorPickerRow: some View {
        HStack(spacing: 12) {
            ForEach(HighlightColor.allCases) { color in
                colorButton(color: color)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
        .padding(.top, 8)
    }

    private func colorButton(color: HighlightColor) -> some View {
        Button {
            onHighlight(color)
            // Don't dismiss - will transition to idea input
        } label: {
            Circle()
                .fill(color.color)
                .frame(width: 32, height: 32)
                .overlay(
                    Circle()
                        .stroke(Color.white, lineWidth: 2)
                )
                .shadow(color: color.color.opacity(0.4), radius: 2, x: 0, y: 1)
        }
    }
}

/// Enhanced overlay view that manages text selection state, menu positioning, and all interactions
struct TextSelectionOverlay: View {
    @Binding var selectedText: String?
    @Binding var selectionRect: CGRect?
    let currentPage: Int
    let bookType: String  // "ebook" or "magazine"
    let bookId: Int
    let existingUnderline: Highlight?  // If clicking an existing underline
    let onHighlight: (String, HighlightColor) -> Void
    let onAddNote: (String) -> Void
    let onDeleteUnderline: (Int) -> Void
    let onUnderlineCreated: (Int) -> Void  // Called with new underline ID

    @State private var menuType: TextSelectionMenuType = .confirm
    @State private var showNoteSheet = false
    @State private var noteText = ""
    @State private var showMeaningPopup = false
    @State private var showIdeasPopup = false
    @State private var showIdeaInput = false
    @State private var currentUnderlineId: Int?

    init(
        selectedText: Binding<String?>,
        selectionRect: Binding<CGRect?>,
        currentPage: Int,
        bookType: String = "ebook",
        bookId: Int = 0,
        existingUnderline: Highlight? = nil,
        onHighlight: @escaping (String, HighlightColor) -> Void,
        onAddNote: @escaping (String) -> Void,
        onDeleteUnderline: @escaping (Int) -> Void = { _ in },
        onUnderlineCreated: @escaping (Int) -> Void = { _ in }
    ) {
        self._selectedText = selectedText
        self._selectionRect = selectionRect
        self.currentPage = currentPage
        self.bookType = bookType
        self.bookId = bookId
        self.existingUnderline = existingUnderline
        self.onHighlight = onHighlight
        self.onAddNote = onAddNote
        self.onDeleteUnderline = onDeleteUnderline
        self.onUnderlineCreated = onUnderlineCreated
    }

    var body: some View {
        GeometryReader { geometry in
            if let text = selectedText, let rect = selectionRect {
                // Dimmed background
                Color.black.opacity(0.001)
                    .onTapGesture {
                        dismissSelection()
                    }

                // Menu content based on current state
                Group {
                    if showIdeaInput, let underlineId = currentUnderlineId {
                        // Idea input bubble
                        IdeaInputBubble(
                            onSave: { ideaContent in
                                Task {
                                    await saveIdea(underlineId: underlineId, content: ideaContent)
                                }
                                dismissSelection()
                            },
                            onSkip: {
                                dismissSelection()
                            }
                        )
                        .position(menuPosition(for: rect, in: geometry.size))
                    } else {
                        // Selection menu
                        TextSelectionMenu(
                            selectedText: text,
                            currentPage: currentPage,
                            menuType: existingUnderline != nil ? .existing : .confirm,
                            ideaCount: existingUnderline?.ideaCount ?? 0,
                            onHighlight: { color in
                                onHighlight(text, color)
                                // After highlight, transition to idea input
                                // Note: The actual underline ID will be set by parent after API call
                            },
                            onCopy: {
                                UIPasteboard.general.string = text
                            },
                            onAddNote: {
                                if let underline = existingUnderline {
                                    // For existing underline, show idea input directly
                                    currentUnderlineId = underline.id
                                    showIdeaInput = true
                                } else {
                                    showNoteSheet = true
                                }
                            },
                            onShare: {
                                shareText(text)
                            },
                            onMeaning: {
                                showMeaningPopup = true
                            },
                            onViewIdeas: {
                                showIdeasPopup = true
                            },
                            onDelete: {
                                if let underline = existingUnderline {
                                    onDeleteUnderline(underline.id)
                                    dismissSelection()
                                }
                            },
                            onDismiss: {
                                dismissSelection()
                            }
                        )
                        .position(menuPosition(for: rect, in: geometry.size))
                    }
                }
            }
        }
        .sheet(isPresented: $showNoteSheet) {
            AddNoteSheet(
                selectedText: selectedText ?? "",
                noteText: $noteText,
                onSave: { note in
                    if let text = selectedText {
                        onAddNote(text)
                    }
                    dismissSelection()
                },
                onCancel: {
                    dismissSelection()
                }
            )
        }
        .sheet(isPresented: $showMeaningPopup) {
            MeaningPopupSheet(
                selectedText: selectedText ?? "",
                onDismiss: {
                    showMeaningPopup = false
                }
            )
            .presentationDetents([.medium, .large])
        }
        .sheet(isPresented: $showIdeasPopup) {
            if let underline = existingUnderline {
                IdeasPopupSheet(
                    underlineId: underline.id,
                    bookType: bookType,
                    selectedText: selectedText ?? "",
                    onDismiss: {
                        showIdeasPopup = false
                    }
                )
                .presentationDetents([.medium])
            }
        }
        .onChange(of: existingUnderline?.id) { _, _ in
            // Reset state when underline changes
            showIdeaInput = false
            currentUnderlineId = existingUnderline?.id
        }
    }

    private func menuPosition(for rect: CGRect, in size: CGSize) -> CGPoint {
        let menuWidth: CGFloat = 300
        let menuHeight: CGFloat = 56

        // Center horizontally on selection, but keep within bounds
        var x = rect.midX
        x = max(menuWidth / 2 + 16, x)
        x = min(size.width - menuWidth / 2 - 16, x)

        // Position above selection if possible, otherwise below
        var y: CGFloat
        if rect.minY > menuHeight + 20 {
            y = rect.minY - menuHeight / 2 - 10
        } else {
            y = rect.maxY + menuHeight / 2 + 10
        }

        return CGPoint(x: x, y: y)
    }

    private func dismissSelection() {
        selectedText = nil
        selectionRect = nil
        noteText = ""
        showIdeaInput = false
        currentUnderlineId = nil
    }

    private func shareText(_ text: String) {
        let activityVC = UIActivityViewController(
            activityItems: [text],
            applicationActivities: nil
        )

        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let rootVC = windowScene.windows.first?.rootViewController {
            rootVC.present(activityVC, animated: true)
        }

        dismissSelection()
    }

    private func saveIdea(underlineId: Int, content: String) async {
        do {
            if bookType == "ebook" {
                _ = try await APIClient.shared.createEbookUnderlineIdea(underlineId: underlineId, content: content)
            } else {
                _ = try await APIClient.shared.createMagazineUnderlineIdea(underlineId: underlineId, content: content)
            }
        } catch {
            Log.e("Failed to save idea: \(error)")
        }
    }

    /// Call this method after creating an underline to show idea input
    func showIdeaInputForUnderline(underlineId: Int) {
        currentUnderlineId = underlineId
        showIdeaInput = true
    }
}

// MARK: - Sheet Wrappers

/// Sheet wrapper for MeaningPopupView
struct MeaningPopupSheet: View {
    let selectedText: String
    let paragraph: String
    let onDismiss: () -> Void

    init(selectedText: String, paragraph: String = "", onDismiss: @escaping () -> Void) {
        self.selectedText = selectedText
        self.paragraph = paragraph
        self.onDismiss = onDismiss
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                MeaningPopupView(
                    selectedText: selectedText,
                    paragraph: paragraph,
                    onDismiss: onDismiss
                )
                .padding()
            }
            .navigationTitle(L10n.AI.meaning)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(L10n.Reader.done) { onDismiss() }
                }
            }
        }
    }
}

/// Sheet wrapper for IdeasPopupView
struct IdeasPopupSheet: View {
    let underlineId: Int
    let bookType: String
    let selectedText: String
    let onDismiss: () -> Void

    var body: some View {
        NavigationStack {
            IdeasPopupView(
                underlineId: underlineId,
                bookType: bookType,
                selectedText: selectedText,
                onDismiss: onDismiss,
                onIdeaCountChanged: { _ in }
            )
            .padding()
            .navigationTitle(L10n.Stats.ideas)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(L10n.Reader.done) { onDismiss() }
                }
            }
        }
    }
}

/// Sheet for adding a note/thought to a highlight
struct AddNoteSheet: View {
    let selectedText: String
    @Binding var noteText: String
    let onSave: (String) -> Void
    let onCancel: () -> Void

    @FocusState private var isFocused: Bool

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                // Selected text preview
                VStack(alignment: .leading, spacing: 8) {
                    Text(L10n.AI.selectedText)
                        .font(.caption)
                        .foregroundColor(.secondary)

                    Text(selectedText)
                        .font(.subheadline)
                        .padding()
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.yellow.opacity(0.2))
                        .cornerRadius(8)
                }

                // Note input
                VStack(alignment: .leading, spacing: 8) {
                    Text(L10n.Social.addThought)
                        .font(.caption)
                        .foregroundColor(.secondary)

                    TextEditor(text: $noteText)
                        .frame(minHeight: 120)
                        .padding(8)
                        .background(Color(.systemGray6))
                        .cornerRadius(8)
                        .focused($isFocused)
                }

                Spacer()
            }
            .padding()
            .navigationTitle(L10n.Social.addThought)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(L10n.Common.cancel) { onCancel() }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(L10n.Common.save) {
                        onSave(noteText)
                    }
                    .fontWeight(.semibold)
                }
            }
        }
        .presentationDetents([.medium])
        .onAppear {
            isFocused = true
        }
    }
}

// MARK: - Highlights List View

/// View showing all highlights for a book
struct HighlightsListView: View {
    let bookType: String
    let bookId: Int
    let bookTitle: String
    let onSelectHighlight: (Highlight) -> Void

    @State private var highlights: [Highlight] = []
    @State private var isLoading = true
    @State private var errorMessage: String?

    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView(L10n.Common.loading)
                } else if let error = errorMessage {
                    VStack(spacing: 16) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 48))
                            .foregroundColor(.orange)
                        Text(error)
                            .foregroundColor(.secondary)
                        Button(L10n.Common.retry) {
                            Task { await loadHighlights() }
                        }
                    }
                } else if highlights.isEmpty {
                    emptyState
                } else {
                    highlightsList
                }
            }
            .navigationTitle(L10n.Reader.highlights)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(L10n.Reader.done) { dismiss() }
                }
            }
        }
        .task {
            await loadHighlights()
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "highlighter")
                .font(.system(size: 48))
                .foregroundColor(.secondary)
            Text(L10n.Reader.bookmarksEmpty)
                .font(.headline)
            Text(L10n.ReaderNav.noBookmarksDesc)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var highlightsList: some View {
        List {
            ForEach(groupedHighlights, id: \.key) { page, pageHighlights in
                Section {
                    ForEach(pageHighlights) { highlight in
                        highlightRow(highlight)
                            .onTapGesture {
                                onSelectHighlight(highlight)
                                dismiss()
                            }
                    }
                } header: {
                    Text(L10n.Reader.page(page))
                }
            }
            .onDelete(perform: deleteHighlights)
        }
        .listStyle(.insetGrouped)
    }

    private var groupedHighlights: [(key: Int, value: [Highlight])] {
        Dictionary(grouping: highlights) { $0.pageNumber ?? 0 }
            .sorted { $0.key < $1.key }
            .map { (key: $0.key, value: $0.value) }
    }

    private func highlightRow(_ highlight: Highlight) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            // Highlight color indicator + text
            HStack(alignment: .top, spacing: 8) {
                Rectangle()
                    .fill(highlight.color.color)
                    .frame(width: 4)
                    .cornerRadius(2)

                Text(highlight.text)
                    .font(.subheadline)
                    .lineLimit(3)
            }

            // Note if exists
            if let note = highlight.note, !note.isEmpty {
                Text(note)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.leading, 12)
            }

            // Metadata
            HStack {
                if let date = highlight.createdAt {
                    Text(date, style: .date)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }

                Spacer()

                if highlight.ideaCount > 0 {
                    Label("\(highlight.ideaCount)", systemImage: "bubble.right")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(.vertical, 4)
    }

    private func deleteHighlights(at offsets: IndexSet) {
        // TODO: Implement delete via API
    }

    private func loadHighlights() async {
        isLoading = true
        errorMessage = nil

        do {
            let response: UnderlineListResponse
            if bookType == "ebook" {
                response = try await APIClient.shared.getEbookUnderlines(ebookId: bookId)
            } else {
                response = try await APIClient.shared.getMagazineUnderlines(magazineId: bookId)
            }

            highlights = response.data.map { Highlight(from: $0, bookType: bookType) }
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}

#Preview("Selection Menu") {
    VStack {
        Spacer()
        TextSelectionMenu(
            selectedText: "这是一段被选中的文字示例",
            currentPage: 1,
            onHighlight: { _ in },
            onCopy: {},
            onAddNote: {},
            onShare: {},
            onDismiss: {}
        )
        Spacer()
    }
    .background(Color.gray.opacity(0.3))
}

#Preview("Add Note") {
    AddNoteSheet(
        selectedText: "这是一段精彩的文字，值得记录下来。",
        noteText: .constant(""),
        onSave: { _ in },
        onCancel: {}
    )
}
