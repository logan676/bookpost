import SwiftUI

/// Menu that appears when text is selected in the reader
/// Provides options to highlight, copy, add notes, and share
struct TextSelectionMenu: View {
    let selectedText: String
    let currentPage: Int
    let onHighlight: (HighlightColor) -> Void
    let onCopy: () -> Void
    let onAddNote: () -> Void
    let onShare: () -> Void
    let onDismiss: () -> Void

    @State private var showColorPicker = false

    var body: some View {
        VStack(spacing: 0) {
            // Main action buttons
            HStack(spacing: 0) {
                menuButton(icon: "highlighter", label: L10n.Notes.underlines) {
                    showColorPicker.toggle()
                }

                Divider()
                    .frame(height: 40)

                menuButton(icon: "doc.on.doc", label: L10n.AI.copy) {
                    onCopy()
                    onDismiss()
                }

                Divider()
                    .frame(height: 40)

                menuButton(icon: "square.and.pencil", label: L10n.Stats.ideas) {
                    onAddNote()
                }

                Divider()
                    .frame(height: 40)

                menuButton(icon: "square.and.arrow.up", label: L10n.Common.share) {
                    onShare()
                }
            }
            .frame(height: 56)
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.15), radius: 8, x: 0, y: 4)

            // Color picker (shown when highlight is tapped)
            if showColorPicker {
                colorPickerRow
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .animation(.easeInOut(duration: 0.2), value: showColorPicker)
    }

    private func menuButton(icon: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 18))
                Text(label)
                    .font(.caption2)
            }
            .foregroundColor(.primary)
            .frame(maxWidth: .infinity)
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
            onDismiss()
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

/// Overlay view that manages text selection state and menu positioning
struct TextSelectionOverlay: View {
    @Binding var selectedText: String?
    @Binding var selectionRect: CGRect?
    let currentPage: Int
    let onHighlight: (String, HighlightColor) -> Void
    let onAddNote: (String) -> Void

    @State private var showNoteSheet = false
    @State private var noteText = ""

    var body: some View {
        GeometryReader { geometry in
            if let text = selectedText, let rect = selectionRect {
                // Dimmed background
                Color.black.opacity(0.001)
                    .onTapGesture {
                        dismissSelection()
                    }

                // Selection menu positioned above or below the selection
                TextSelectionMenu(
                    selectedText: text,
                    currentPage: currentPage,
                    onHighlight: { color in
                        onHighlight(text, color)
                    },
                    onCopy: {
                        UIPasteboard.general.string = text
                    },
                    onAddNote: {
                        showNoteSheet = true
                    },
                    onShare: {
                        shareText(text)
                    },
                    onDismiss: {
                        dismissSelection()
                    }
                )
                .position(menuPosition(for: rect, in: geometry.size))
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
    }

    private func menuPosition(for rect: CGRect, in size: CGSize) -> CGPoint {
        let menuWidth: CGFloat = 280
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
