/**
 * Note Detail View
 * Displays full note content with underlines and comments
 */

import SwiftUI

struct NoteDetailView: View {
    let noteId: Int

    @State private var note: NoteContent?
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        Group {
            if isLoading {
                LoadingView()
            } else if let error = errorMessage {
                errorView(error)
            } else if let note = note {
                noteContentView(note)
            }
        }
        .navigationTitle(L10n.Notes.detail)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadNote()
        }
    }

    // MARK: - Error View

    @ViewBuilder
    private func errorView(_ error: String) -> some View {
        ContentUnavailableView {
            Label(L10n.Notes.loadFailed, systemImage: "exclamationmark.triangle")
        } description: {
            Text(error)
        } actions: {
            Button(L10n.Common.retry) {
                Task { await loadNote() }
            }
        }
    }

    // MARK: - Note Content View

    @ViewBuilder
    private func noteContentView(_ note: NoteContent) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header
                headerSection(note)

                Divider()

                // Content preview / main text
                if let preview = note.contentPreview, !preview.isEmpty {
                    contentSection(preview)
                }

                // Underlines section
                if let underlines = note.underlines, !underlines.isEmpty {
                    Divider()
                    underlinesSection(underlines)
                }

                // Comments section
                if let comments = note.comments, !comments.isEmpty {
                    Divider()
                    commentsSection(comments)
                }
            }
            .padding()
        }
    }

    // MARK: - Header Section

    @ViewBuilder
    private func headerSection(_ note: NoteContent) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            // Title
            Text(note.displayTitle)
                .font(.title2)
                .fontWeight(.bold)

            // Author and date
            HStack(spacing: 16) {
                if let author = note.author, !author.isEmpty {
                    Label(author, systemImage: "person.fill")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                if let year = note.year {
                    Label("\(year)年", systemImage: "calendar")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }

            // Tags
            if !note.tagsArray.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(note.tagsArray, id: \.self) { tag in
                            Text(tag)
                                .font(.caption)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .background(Color.accentColor.opacity(0.1))
                                .foregroundColor(.accentColor)
                                .clipShape(Capsule())
                        }
                    }
                }
            }
        }
    }

    // MARK: - Content Section

    @ViewBuilder
    private func contentSection(_ content: String) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Label(L10n.Notes.content, systemImage: "doc.text")
                .font(.headline)

            Text(content)
                .font(.body)
                .lineSpacing(6)
        }
    }

    // MARK: - Underlines Section

    @ViewBuilder
    private func underlinesSection(_ underlines: [NoteUnderline]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Label(L10n.Notes.underlineCount(underlines.count), systemImage: "highlighter")
                .font(.headline)

            ForEach(underlines) { underline in
                UnderlineRow(underline: underline)
            }
        }
    }

    // MARK: - Comments Section

    @ViewBuilder
    private func commentsSection(_ comments: [NoteComment]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Label(L10n.Notes.commentCount(comments.count), systemImage: "bubble.left.and.bubble.right")
                .font(.headline)

            ForEach(comments) { comment in
                CommentRow(comment: comment)
            }
        }
    }

    // MARK: - Data Loading

    private func loadNote() async {
        isLoading = true
        errorMessage = nil

        do {
            let response = try await APIClient.shared.getNote(id: noteId)
            note = response.data
        } catch {
            Log.e("Failed to load note", error: error)
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}

// MARK: - Underline Row

struct UnderlineRow: View {
    let underline: NoteUnderline

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Highlighted text
            HStack(alignment: .top, spacing: 8) {
                Rectangle()
                    .fill(Color.yellow)
                    .frame(width: 3)

                Text(underline.displayText)
                    .font(.subheadline)
                    .italic()
            }

            // Ideas (if any)
            if let ideas = underline.ideas, !ideas.isEmpty {
                ForEach(ideas) { idea in
                    HStack(alignment: .top, spacing: 8) {
                        Image(systemName: "lightbulb.fill")
                            .foregroundColor(.orange)
                            .font(.caption)

                        Text(idea.displayContent)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding(.leading, 11)
                }
            }
        }
        .padding()
        .background(Color.yellow.opacity(0.1))
        .cornerRadius(8)
    }
}

// MARK: - Comment Row

struct CommentRow: View {
    let comment: NoteComment

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header with nick and date
            HStack {
                Text(comment.displayNick)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Spacer()

                if let date = comment.originalDate {
                    Text(date)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            // Comment content
            Text(comment.displayContent)
                .font(.body)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }
}

#Preview {
    NavigationStack {
        NoteDetailView(noteId: 1)
    }
}
